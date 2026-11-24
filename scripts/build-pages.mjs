// Generates every public HTML page from src/data/business.js and the risk engine.
// Run `npm run build` after changing copy or business facts, then commit the generated .html files.
// Pages are plain static HTML (crawlable without JavaScript); src/ui/page.js only adds the
// mobile menu, reveal animations and the contact form behaviour.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { business as b, STATUS_LABEL } from "../src/data/business.js";
import { sampleState, SAMPLE_SPEC } from "../src/data/sample.js";
import { assessSchedule, optimiseLine, runsForLine } from "../src/engine/risk.js";
import { extractAllergens, ALLERGEN_BY_ID } from "../src/engine/allergens.js";
import { headerHTML, footerHTML, esc, chip } from "../src/ui/site.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const SITE = `https://www.${b.domain}`;
const year = b.assumptions.foundingYear;
const fmtTime = (iso) => iso.slice(11, 16);

// ---------------------------------------------------------------- shell
function page({ path, title, description, body, scripts = ["src/ui/page.js"], styles = ["home", "pages"], noindex = false, current = "" }) {
  const url = `${SITE}/${path}`;
  const org = {
    "@context": "https://schema.org", "@type": "Organization", name: b.name, url: SITE,
    logo: `${SITE}/favicon.svg`, description: b.positioning, slogan: b.tagline, foundingDate: String(year),
    founder: b.founders.map((f) => ({ "@type": "Person", name: f.name, jobTitle: f.title })),
    ...(b.email ? { email: b.email } : {}), ...(b.linkedinUrl ? { sameAs: [b.linkedinUrl] } : {}),
  };
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  ${noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${url}">`}
  <meta name="theme-color" content="#1f5c45">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${b.name}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${url}">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description)}">
  <link rel="icon" href="favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Instrument+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap">
  <link rel="stylesheet" href="src/styles/base.css">
${styles.map((s) => `  <link rel="stylesheet" href="src/styles/${s}.css">`).join("\n")}
  <script type="application/ld+json">${JSON.stringify(org)}</script>
</head>
<body>
  <a class="skip" href="#main">Skip to content</a>
  <header class="site-header">${headerHTML(current)}</header>
  <main id="main">
${body}
  </main>
  <footer class="site-footer">${footerHTML()}</footer>
${scripts.map((s) => `  <script type="module" src="${s}"></script>`).join("\n")}
</body>
</html>
`;
}

const intro = (eyebrow, title, lede, extra = "") => `
    <section class="page-intro">
      <div class="wrap">
        <p class="eyebrow">${eyebrow}</p>
        <h1>${title}</h1>
        ${lede ? `<p class="lede">${lede}</p>` : ""}
        ${extra}
      </div>
    </section>`;

const head = (eyebrow, title, lede = "") => `
        <div class="section-head reveal">
          <p class="eyebrow">${eyebrow}</p>
          <h2>${title}</h2>
          ${lede ? `<p class="lede">${lede}</p>` : ""}
        </div>`;

const ctas = `<div class="hero-cta"><a class="btn primary" href="contact">Request early access <span class="arrow">→</span></a><a class="btn ghost" href="demo">Explore the live demo</a></div>`;

// ---------------------------------------------------------------- engine-generated visuals (sample data)
const state = sampleState();
const { findings, summary } = assessSchedule(state);
const productById = Object.fromEntries(state.products.map((p) => [p.id, p]));
const SEV = { high: "High risk", medium: "Check", low: "Controlled", none: "No carry-over" };

function heroBoard() {
  const runs = runsForLine(state, "L1");
  const f = findings.filter((x) => x.lineId === "L1");
  let html = `<div class="board-head"><div><span class="mono muted">Mon 23 Nov · live demo · sample data</span><strong>${esc(state.lines[0].name)}</strong></div><span class="board-tag mono">${f.filter((x) => x.severity === "high").length} high · ${f.filter((x) => x.severity === "medium").length} check</span></div><ol class="board-runs">`;
  runs.forEach((r, i) => {
    const p = productById[r.productId];
    html += `<li class="b-run" style="--i:${i}"><span class="mono b-time">${fmtTime(r.start)}</span><div><strong>${esc(p.name)}</strong><div class="chips">${p.allergens.map((a) => chip(a)).join("")}</div></div></li>`;
    const x = f[i];
    if (x) html += `<li class="b-change ${x.severity}" style="--i:${i}"><span class="status ${x.severity}">${SEV[x.severity]}</span><span class="b-detail">${x.carry.length ? `Leaves <b>${x.carry.map((c) => ALLERGEN_BY_ID[c].label.toLowerCase()).join(", ")}</b> · ${esc(x.title.toLowerCase())}` : "Next product declares the same allergens"}</span></li>`;
  });
  const opt = optimiseLine(state, "L1");
  return html + `</ol><div class="board-foot"><span>Suggested order needs <b>${opt.after.cleans}</b> allergen clean${opt.after.cleans === 1 ? "" : "s"} instead of <b>${opt.before.cleans}</b></span><a href="demo#sequence">Review in demo →</a></div>`;
}

const visuals = {
  risk() {
    const x = findings.find((f) => f.severity === "high");
    return `<div class="v-risk"><div class="v-pair"><span>${esc(x.from)}</span><span class="v-arr">→</span><span>${esc(x.to)}</span></div><div class="chips">${x.carry.map((c) => chip(c)).join("")}</div><div class="v-flag"><span class="status high">High risk</span>${esc(x.title)}</div></div>`;
  },
  sequence() {
    const runs = runsForLine(state, "L1");
    const opt = optimiseLine(state, "L1");
    const row = (list, label, n) => `<div class="v-seq-row"><span class="mono muted">${label}</span><div class="v-seq">${list.map((r) => `<span title="${esc(productById[r.productId].name)}">${esc(productById[r.productId].name.split(" ").slice(-1)[0])}</span>`).join("")}</div><span class="mono v-n">${n} clean${n === 1 ? "" : "s"}</span></div>`;
    return `<div class="v-seqs">${row(runs, "Planned", opt.before.cleans)}${row(opt.proposal, "Suggested", opt.after.cleans)}</div>`;
  },
  cleaning() {
    return `<table class="v-log"><thead><tr><th>Time</th><th>Clean</th><th>Sign-off</th><th>Swab</th></tr></thead><tbody>
      <tr><td class="mono">07:35</td><td>Allergen wet</td><td>✓</td><td><span class="status low">Pass</span></td></tr>
      <tr class="gap"><td class="mono">11:35</td><td>Dry only</td><td>✓</td><td>—</td></tr>
      <tr class="gap"><td class="mono">13:35</td><td>Allergen wet</td><td>✓</td><td><span class="status medium">Missing</span></td></tr></tbody></table>`;
  },
  docs() {
    const r = extractAllergens(SAMPLE_SPEC);
    const terms = r.contains.flatMap((c) => c.matches);
    let line = "Sugar, roasted HAZELNUTS (28%), skimmed MILK powder, WHEY powder, emulsifier: SOYA lecithin…";
    for (const t of [...new Set(terms)].sort((a, c) => c.length - a.length)) line = line.replace(new RegExp(`\\b(${t})\\b`, "gi"), "<mark>$1</mark>");
    return `<div class="v-doc"><p class="mono">${line}</p><div class="chips">${r.contains.map((c) => chip(c.id)).join("")}${r.mayContain.map((c) => chip(c.id, true)).join("")}</div></div>`;
  },
  report() {
    return `<div class="v-report"><div class="v-rh"><strong>Allergen risk report</strong><span class="mono muted">Mon 23 Nov</span></div><div class="v-rs"><span><b>${summary.high}</b> high</span><span><b>${summary.medium}</b> check</span><span><b>${summary.low}</b> controlled</span></div><div class="v-lines"><i></i><i></i><i style="width:60%"></i></div><div class="v-sign mono">QA sign-off ____________</div></div>`;
  },
};

// ---------------------------------------------------------------- sections
const hero = () => `
    <section class="hero">
      <div class="wrap hero-grid">
        <div class="hero-copy">
          <p class="status-pill"><span class="pulse" aria-hidden="true"></span>Early access open · pilots on one production site</p>
          <h1>Catch allergen cross-contact in the <em>schedule</em>, not on the swab.</h1>
          <p class="lede">SavorCline checks every changeover in your production plan against what the previous run leaves on the line and the cleaning recorded in between. Your QA team sees unsafe sequences, missing cleaning records and a safer run order before the shift starts.</p>
          ${ctas}
          <p class="hero-status">Allergen risk management software for bakery, confectionery and food manufacturers</p>
        </div>
        <figure class="hero-visual" aria-label="Changeover checks on a bakery line, from the live demo with sample data">
          <div class="board card">${heroBoard()}</div>
        </figure>
      </div>
    </section>
    <section class="highlights" aria-label="Product highlights">
      <div class="wrap hl-grid">${[
        ["14", "regulated allergens tracked per product, including hidden sources"],
        ["Every", "changeover on every line checked against the cleaning log"],
        ["Fewest", "allergen cleans: run orders searched exhaustively up to 8 runs per line"],
        ["1-click", "dated risk report with findings and a QA sign-off block"],
      ].map(([k, v]) => `<div class="hl reveal"><span class="hl-k">${k}</span><span class="hl-v">${v}</span></div>`).join("")}</div>
    </section>`;

const STATS = [
  { v: "27%", t: "of US FDA food recalls from 2004 to 2013 were caused by undeclared allergens.", s: "USDA Economic Research Service", href: "https://ers.usda.gov/data-products/charts-of-note/89526" },
  { v: "~2×", t: "growth in the number of undeclared-allergen recalls over the same period, while pathogen recalls stayed flat.", s: "USDA Economic Research Service", href: "https://ers.usda.gov/data-products/charts-of-note/89526" },
  { v: "~90%", t: "of reports in the FDA Reportable Food Registry's first three years involved Salmonella, Listeria or undeclared allergens.", s: "Food Safety Magazine, on FDA RFR data", href: "https://www.food-safety.com/magazine-archive1/aprilmay-2014/learning-from-fda-food-allergen-recalls-and-reportable-foods/" },
];

const problem = () => {
  const brownie = productById.p4, loaf = productById.p1;
  return `
    <section class="section problem" id="problem">
      <div class="wrap">
        <div class="ps-grid">
          <div class="reveal">
            <p class="eyebrow">The problem</p>
            <h2>Allergen risk lives in the changeover.</h2>
            <p class="lede">Most allergen controls are designed product by product. The risk appears when products share a line: a hazelnut brownie at 06:00, a plain loaf at 08:00, and a cleaning record that may or may not say what was done in between.</p>
            <ul class="problem-list">${b.problem.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>
          </div>
          <div class="anatomy card reveal" aria-label="How a changeover is assessed">
            <p class="mono anatomy-k">Changeover anatomy</p>
            <div class="anat-row">
              <div class="anat-run"><span class="mono muted">Run A · 06:00</span><strong>${esc(brownie.name)}</strong><div class="chips">${brownie.allergens.map((a) => chip(a)).join("")}</div></div>
              <div class="anat-arrow" aria-hidden="true">→</div>
              <div class="anat-run"><span class="mono muted">Run B · 08:00</span><strong>${esc(loaf.name)}</strong><div class="chips">${loaf.allergens.map((a) => chip(a)).join("")}</div></div>
            </div>
            <div class="anat-formula"><span class="mono">left on line</span> = allergens(A) − declared(B)
              <div class="chips">${brownie.allergens.filter((a) => !loaf.allergens.includes(a)).map((a) => chip(a)).join("")}</div></div>
            <ol class="anat-checks">
              <li><b>Was there a clean?</b> Any record between 07:30 and 08:00 on this line.</li>
              <li><b>Was it the right clean?</b> Dry brushing or sanitising does not remove allergen protein.</li>
              <li><b>Was it verified?</b> Sign-off and a passing allergen swab.</li>
            </ol>
          </div>
        </div>
        <div class="stats">${STATS.map((x) => `
          <figure class="stat card reveal"><p class="stat-v">${x.v}</p><figcaption>${x.t}</figcaption><a href="${x.href}" target="_blank" rel="noopener noreferrer">Source: ${x.s} ↗</a></figure>`).join("")}
        </div>
        <p class="stat-note muted">Published third-party figures describing the wider food industry. They are not SavorCline results.</p>
        <h3 class="today-title reveal">From last-minute checks to run orders you can defend.</h3>
        <div class="today reveal">
          <div class="today-col"><p class="mono today-k bad">Today</p><ul>${[
            "Allergen data sits in supplier specs, recipe sheets and paper cleaning logs.",
            "Changeovers are checked by hand, under time pressure, before each shift.",
            "A schedule change mid-week isn't re-checked against every downstream run.",
            "Dry cleans get logged where an allergen wet clean was needed, and nobody notices.",
            "At audit, nobody can show why a run order was considered safe.",
          ].map((x) => `<li>${x}</li>`).join("")}</ul></div>
          <div class="today-col good"><p class="mono today-k">With ${b.name}</p><ul>${[
            "Every product has a confirmed allergen profile, extracted from its source documents.",
            "Every changeover on every line is checked automatically against the cleaning log.",
            "Change the schedule and every affected changeover is re-checked at once.",
            "Wrong clean types, missing sign-offs and absent swabs are flagged on the day.",
            "A dated report records findings, required cleans and the QA sign-off.",
          ].map((x) => `<li>${x}</li>`).join("")}</ul></div>
        </div>
      </div>
    </section>`;
};

const features = () => `
    <section class="section features" id="product">
      <div class="wrap">
        ${head("Product", "Five checks between the supplier spec and the first run.", "Each capability works on the same allergen profiles and schedule, so a change in one place is re-checked everywhere it matters. All five can be tried in the live demo today.")}
        <div class="feature-list">${b.features.map((f, i) => `
          <article class="feature reveal">
            <div class="f-copy">
              <div class="f-top"><span class="mono muted">0${i + 1}</span><span class="status ${f.status}">${STATUS_LABEL[f.status]}</span></div>
              <h3>${esc(f.name)}</h3>
              <p>${esc(f.what)}</p>
              <p class="f-benefit">${esc(f.benefit)}</p>
              ${f.note ? `<p class="f-note">${esc(f.note)}</p>` : ""}
            </div>
            <div class="f-visual" aria-hidden="true">${visuals[f.id]()}</div>
          </article>`).join("")}
        </div>
      </div>
    </section>`;

const how = () => `
    <section class="section how" id="how">
      <div class="wrap">
        ${head("How it works", "Start with documents you already have.", "No sensors, no factory hardware, no MES integration to begin with. SavorCline works from specifications, schedules and cleaning logs, and people make the final call.")}
        <ol class="steps">
          <li class="step reveal"><span class="step-n mono">01</span><h3>Add products and specs</h3><p>Upload or paste supplier specifications and recipe sheets. Allergens are extracted, including hidden sources such as whey, spelt or tahini, and shown for review.</p></li>
          <li class="step reveal"><span class="step-n mono">02</span><h3>Confirm allergen profiles</h3><p>A QA team member confirms each product's "contains" and "may contain" allergens. Confirmed profiles become the reference for every check.</p></li>
          <li class="step reveal"><span class="step-n mono">03</span><h3>Check the week's schedule</h3><p>Every changeover on every line is assessed against the cleaning records. Risky transitions are ranked high, medium or controlled.</p></li>
          <li class="step reveal"><span class="step-n mono">04</span><h3>Approve and report</h3><p>Accept or reject the suggested run order, then generate a dated report with findings, required cleans and a sign-off block.</p></li>
        </ol>
      </div>
    </section>`;

const solutions = (full = false) => `
    <section class="section solutions" id="solutions">
      <div class="wrap sol-grid">
        <div class="reveal">
          <p class="eyebrow">Solutions</p>
          <h2>Built first for bakery and confectionery.</h2>
          <p class="lede">Shared ovens, depositors and enrobers, five or more allergens in rotation, and several changeovers per shift make bakery and confectionery the hardest case. Patterns proven there carry over to other categories.</p>
          <p class="muted">Used by: ${b.decisionMakers.join(" · ")}</p>
          ${full ? "" : `<a class="btn ghost" href="solutions">All solutions <span class="arrow">→</span></a>`}
        </div>
        <ul class="segments">${b.customers.map((c) => `<li class="seg reveal${c.primary ? " primary" : ""}" id="${c.id}"><div><h3>${esc(c.name)}</h3><p>${esc(c.detail)}</p>${full ? `<p class="seg-use"><b>How they use ${b.name}:</b> ${esc(SEG_USE[c.id])}</p>` : ""}</div>${c.primary ? `<span class="status implemented">First focus</span>` : ""}</li>`).join("")}</ul>
      </div>
    </section>`;

const SEG_USE = {
  bakery: "Check each day's oven and depositor schedule, move nut and sesame runs to the end of the day, and confirm an allergen wet clean and swab before every gluten-only run.",
  dairy: "Keep plant-based and inclusion products from following milk-based runs without a verified clean, and catch 'may contain' labels that the schedule makes necessary.",
  "ready-meals": "Build allergen profiles from many supplier specifications at once and re-check the week's schedule whenever a recipe or supplier changes.",
  meat: "Track mustard, celery, gluten and sulphites brought in by marinades and coatings, and order runs so those lines need fewer full cleans.",
  consultants: "Review several client sites' schedules and cleaning records from one workspace and hand each client a dated report.",
};

const COLS = ["Spreadsheets", "Paper cleaning logs", "ERP / MES", b.name];
const ROWS = [
  ["Allergen profile per product", "Retyped by hand", "Not tracked", "Product master only", "Extracted from specs, confirmed by QA"],
  ["Checks every changeover", "Only if the formulas are right", "No", "No", "Every line, every run"],
  ["Knows which clean removes allergen protein", "No", "Depends on the operator", "No", "Wet vs dry, sign-off and swab checked"],
  ["Re-checks when the schedule changes", "Manual", "No", "No", "Instantly"],
  ["Suggests a safer run order", "No", "No", "No", "Fewest allergen cleans"],
  ["Evidence for audit", "Scattered files", "Paper", "Partial", "Dated report with sign-off block"],
];
const compare = () => `
    <section class="section compare" id="compare">
      <div class="wrap">
        ${head(`Why ${b.name}`, "How it compares with the way allergen changeovers are checked today.", `${b.name} works alongside your HACCP plan, your cleaning procedures and your planners. It gives them one consistent check of every changeover.`)}
        <div class="cmp reveal"><table>
          <caption class="sr-only">Comparison of allergen changeover methods</caption>
          <thead><tr><th scope="col">Capability</th>${COLS.map((c, i) => `<th scope="col"${i === 3 ? ' class="us"' : ""}>${c}</th>`).join("")}</tr></thead>
          <tbody>${ROWS.map(([k, ...v]) => `<tr><th scope="row">${k}</th>${v.map((x, i) => `<td${i === 3 ? ' class="us"' : ""}>${x}</td>`).join("")}</tr>`).join("")}</tbody>
        </table></div>
      </div>
    </section>`;

const ai = () => `
    <section class="section ai" id="ai">
      <div class="wrap ai-grid">
        <div class="reveal">
          <p class="eyebrow">AI, used carefully</p>
          <h2>The rules decide. The AI reads documents and explains.</h2>
          <p class="lede">Risk findings come from deterministic rules you can trace. AI is used to read supplier documents and to explain findings in plain language, and a person confirms everything before it is used.</p>
          <div class="ai-lists">
            <div><p class="ai-k good">What the AI does</p><ul>${["Reads ingredient lists and specifications, including scanned PDFs (planned, with Amazon Textract)", "Maps ingredients such as whey, casein or spelt to the allergen they contain", "Explains a finding in plain language and lists the records it used", "Suggests allergen profiles for a QA person to confirm"].map((x) => `<li>${x}</li>`).join("")}</ul></div>
            <div><p class="ai-k bad">What it never does</p><ul>${["Approve a run order or sign off a clean", "Decide the risk level: the rules do, and show their working", "Fill in a missing cleaning record or swab result", "Use one customer's documents to answer another's questions"].map((x) => `<li>${x}</li>`).join("")}</ul></div>
          </div>
        </div>
        <div class="ai-chat card reveal">
          <div class="ai-head"><strong>Ask about this schedule</strong><span class="status prototype">Sample data</span></div>
          <p class="ai-q">Which changeovers on Line 1 need attention today?</p>
          <div class="ai-a"><p>One is high risk: <b>Butter croissant → Seeded sourdough</b>. The croissant leaves milk and egg, which the sourdough doesn't declare, and only a dry clean is recorded in between. An allergen wet clean and a swab are needed before the sourdough run.</p><p class="ai-src mono">From: schedule Mon 23 Nov · cleaning log Line 1</p></div>
          <p class="ai-q">Can we skip the clean if we relabel the sourdough?</p>
          <div class="ai-a"><p>That's a decision for your HACCP team, not something I can approve. I can show how adding a "may contain milk, egg" label changes the finding.</p></div>
          <a class="btn ghost" href="demo">Try the checks in the live demo</a>
        </div>
      </div>
    </section>`;

const SAFE = [
  ["Every finding is traceable", "Each risk shows the two runs, the allergens left on the line and the cleaning record it was checked against."],
  ["People make the call", "Suggested run orders and AI-extracted allergens are reviewed and approved by a person before they are used."],
  ["Missing is never 'fine'", "A missing cleaning record, sign-off or swab is flagged as a gap, never treated as a pass."],
  ["Supplier data kept separate", "The architecture isolates each customer's documents and encrypts them with per-tenant keys."],
  ["Roles, enforced", "Planners, QA and auditors each get only the actions they need. Production enforces roles on the server."],
  ["Everything recorded", "Profile confirmations, schedule changes, approvals and reports are written to an activity log."],
];
const safeguards = (link = true) => `
    <section class="section safe" id="safeguards">
      <div class="wrap">
        ${head("Safeguards", "Built for QA teams that have to sign the report.")}
        <div class="safe-grid">${SAFE.map(([t, d]) => `<div class="safe-item reveal"><h3>${t}</h3><p>${d}</p></div>`).join("")}</div>
        ${link ? `<p class="more"><a href="security">Security and safeguards in detail →</a></p>` : ""}
      </div>
    </section>`;

const STAGES = [
  ["01", "Data collection", ["Amazon API Gateway", "Amazon S3"], "QA teams upload supplier specifications, schedules and cleaning logs through an authenticated API."],
  ["02", "Secure storage", ["Amazon S3", "AWS KMS", "Amazon DynamoDB"], "Documents encrypted with per-tenant keys; allergen profiles, schedules and findings stored per site."],
  ["03", "Processing", ["AWS Step Functions", "AWS Lambda"], "Orchestrates upload → extract → interpret → assess, and runs the changeover rules."],
  ["04", "AI intelligence", ["Amazon Textract", "Amazon Bedrock"], "Reads documents and suggests allergen profiles for review; explains findings in plain language."],
  ["05", "Application experience", ["Amazon Cognito", "Amazon API Gateway"], "Sign-in with planner, QA and auditor roles; schedules, approvals and reports in the web app."],
];
const awsSection = (link = true) => `
    <section class="section tech" id="technology">
      <div class="wrap">
        ${head("Technology", "How We Use Amazon Web Services", "SavorCline's production platform is designed as a serverless pipeline on AWS: documents go into encrypted storage, Amazon Textract and Amazon Bedrock turn them into allergen profiles for a person to confirm, and AWS Lambda runs the changeover rules against each schedule. Today the risk engine runs in the browser in the live demo.")}
        <ol class="pipeline">${STAGES.map(([n, t, s, d]) => `<li class="pipe reveal"><span class="mono muted">${n}</span><h3>${t}</h3><p>${d}</p><div class="pipe-svcs">${s.map((x) => `<span>${x}</span>`).join("")}</div></li>`).join("")}</ol>
        <p class="pipe-note">These services are proposed, not yet deployed. The live demo runs in your browser on sample data.${link ? ` <a href="technology">The full architecture →</a>` : ""}</p>
        <ul class="svc-list">${b.aws.map((a) => `<li><b>${esc(a.service)}:</b> ${esc(a.role)}</li>`).join("")}</ul>
      </div>
    </section>`;

const ROADMAP = [
  ["Now", "Live demo & early access", ["Rule-based risk engine, sequencing and cleaning checks", "Interactive live demo on a sample bakery", "Proposed AWS architecture defined", "Early-access requests open"], true],
  ["Next", "Pilot on one site", ["Your own products, lines and cleaning records", "Document upload with Amazon Textract", "Bedrock-assisted allergen extraction with human review"]],
  ["Then", "General availability", ["Multi-user workspaces with Amazon Cognito roles", "Server-side activity log and report archive", "Pricing confirmed with pilot sites"]],
  ["Later", "Exploring with pilot sites", ["ERP / MES schedule import", "Audit pack templates for BRCGS and SQF sites", "Multi-site views for groups and consultants"]],
];
const roadmap = () => `
    <section class="section roadmap-s" id="roadmap">
      <div class="wrap">
        ${head("Roadmap", `Where ${b.name} is going`, "Built with early-access QA teams. The order is our plan and may change based on what pilots teach us.")}
        <ol class="road">${ROADMAP.map(([k, t, items, on]) => `<li class="road-col reveal${on ? " on" : ""}"><span class="mono road-k">${k}</span><h3>${t}</h3><ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul></li>`).join("")}</ol>
      </div>
    </section>`;

const PLANS = [
  { name: "Site", for: "One production site with a few shared lines.", price: "$249", items: ["Up to 3 production lines", "Allergen profiles for your product range", "Changeover and cleaning checks", "Dated risk reports", "Up to 5 users", "Email support"], cta: "Request access" },
  { name: "Plant", for: "Busy sites with many lines and frequent changeovers.", price: "$599", hl: true, items: ["Everything in Site", "Up to 10 production lines", "Safer sequence suggestions", "Document extraction with review", "Up to 20 users", "Priority support"], cta: "Request access" },
  { name: "Group", for: "Multi-site manufacturers and QA consultants.", price: "Custom", items: ["Everything in Plant", "Multiple sites", "Approval workflows", "ERP / MES schedule import", "Single sign-on", "Dedicated onboarding"], cta: "Contact us" },
];
const pricing = () => `
    <section class="section pricing" id="pricing">
      <div class="wrap">
        ${head("Pricing", "Simple plans, priced per production site.", "Proposed launch pricing. Final pricing is set with pilot sites, and no payment is taken today.")}
        <div class="plans">${PLANS.map((p) => `
          <div class="plan card reveal${p.hl ? " hl" : ""}">
            ${p.hl ? `<span class="plan-badge mono">Most popular</span>` : ""}
            <h3>${p.name}</h3><p class="muted">${p.for}</p>
            <p class="plan-price">${p.price}${p.price.startsWith("$") ? `<span>/month per site</span>` : ""}</p>
            <ul>${p.items.map((x) => `<li>${x}</li>`).join("")}</ul>
            <a class="btn ${p.hl ? "primary" : "ghost"}" href="contact?plan=${p.name}">${p.cta}</a>
          </div>`).join("")}
        </div>
        <p class="plan-note muted">Proposed prices in USD, excluding taxes. Early-access sites are onboarded directly by the founder. The live demo is free to use with your own product list.</p>
      </div>
    </section>`;

const initials = (n) => n.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
const team = () => `
    <section class="section team" id="team">
      <div class="wrap">
        ${head("Team", `The Team Behind ${b.name}`, `${b.name} is a food-safety software company founded in ${year}. It is building allergen risk management software that helps food manufacturers catch cross-contact risk in the production schedule.`)}
        ${b.founders.map((f) => `
        <article class="founder card reveal">
          <div class="founder-avatar" aria-hidden="true">${initials(f.name)}</div>
          <div>
            <p class="mono muted">${esc(f.title)}</p>
            <h3>${esc(f.name)}</h3>
            ${f.bio ? `<p>${esc(f.bio)}</p>` : ""}
            ${f.owns ? `<div class="chips">${f.owns.map((o) => `<span class="chip">${esc(o)}</span>`).join("")}</div>` : ""}
            <p class="founder-links">${b.email ? `<a class="btn ghost small" href="mailto:${esc(b.email)}">${esc(b.email)}</a>` : ""}${f.linkedin ? `<a class="btn ghost small" href="${esc(f.linkedin)}" rel="noopener">LinkedIn</a>` : ""}${b.linkedinUrl ? `<a class="btn ghost small" href="${esc(b.linkedinUrl)}" target="_blank" rel="noopener">${esc(b.name)} company page</a>` : ""}</p>
          </div>
        </article>`).join("")}
        <dl class="facts reveal">${[["Founded", year], ["Category", "Food safety software"], ["Stage", "Building initial product"], ["Company type", b.assumptions.companyType]].map(([k, v]) => `<div><dt class="mono">${k}</dt><dd>${v}</dd></div>`).join("")}</dl>
        <div class="hear card reveal"><p class="eyebrow">We'd like to hear from</p><ul>${["Bakery and confectionery sites willing to pilot", "Technical and QA managers", "Advisors who know allergen management"].map((x) => `<li>${x}</li>`).join("")}</ul></div>
      </div>
    </section>`;

const FAQ = [
  ["Is SavorCline available now?", "SavorCline is building its initial product. The live demo on this site is fully interactive and runs on sample data or data you enter, stored only in your browser. Document upload and the AWS-hosted platform are in development, and early-access requests are open."],
  ["Does SavorCline replace our HACCP plan or allergen risk assessment?", "No. It applies your allergen data and cleaning rules to the schedule consistently and shows where they are not met. Your HACCP team still owns the controls, the validation of cleaning methods and the final decision on every run."],
  ["What does the AI do?", "In the planned platform, Amazon Textract reads supplier documents and Amazon Bedrock suggests allergen profiles and explains findings in plain language. A person confirms every extracted allergen. Risk levels come from deterministic rules, not from the AI."],
  ["Does the AI decide the production order?", "No. SavorCline suggests a run order that needs fewer allergen cleans. A planner or QA lead accepts or rejects it."],
  ["Who can change what?", "Planners edit schedules, QA confirms allergen profiles and signs off reports, and auditors get read-only access. In the demo roles are not enforced; in production they are enforced on the server."],
  ["Which allergens are covered?", "The demo uses the 14 allergens regulated under UK and EU food information law, including hidden sources such as whey (milk), spelt (gluten) and tahini (sesame). The list is configurable for other markets."],
  ["How much does it cost?", "Proposed launch pricing starts at $249 a month per site. Final pricing is agreed with pilot sites, and no payment is taken today. See the Pricing page."],
  ["What data do we need to start?", "A product list with allergen information (or the supplier specifications to extract it from), a production schedule per line, and your cleaning records for the same period."],
];
const faq = () => `
    <section class="section faq" id="faq">
      <div class="wrap faq-grid">
        <div class="reveal"><p class="eyebrow">FAQ</p><h2>Questions QA teams ask first.</h2>${b.email ? `<a class="btn ghost" href="mailto:${esc(b.email)}">Email the founder</a>` : ""}</div>
        <div class="faq-list">${FAQ.map(([q, a]) => `<details class="reveal"><summary>${q}</summary><p>${a}</p></details>`).join("")}</div>
      </div>
    </section>`;

const closing = () => `
    <section class="final">
      <div class="wrap final-inner">
        <div>
          <h2>See your own schedule through ${b.name}.</h2>
          <p class="lede">Explore the live demo on a sample bakery, or talk to us about a pilot on your own lines.</p>
        </div>
        <div class="final-cta">
          <a class="btn primary" href="contact">Request early access <span class="arrow">→</span></a>
          <a class="btn ghost" href="demo">Explore the live demo</a>
        </div>
      </div>
    </section>`;

const contactForm = () => `
    <section class="section contact" id="contact">
      <div class="wrap contact-grid">
        <div>
          <p class="eyebrow">Early access</p>
          <h1>Request early access</h1>
          <p class="lede">Early-access sites get a pilot on one production site, a direct line to the founder and a say in what we build next. Ask about pricing or tell us where allergen changeovers cause you the most work.</p>
          ${b.email ? `<a class="contact-email card" href="mailto:${esc(b.email)}"><span class="mono muted">Email</span><strong>${esc(b.email)}</strong></a>` : ""}
          <div class="next card"><p><b>What happens next</b></p><ol><li>The founder replies to arrange a short call.</li><li>We look at your lines, products and cleaning records.</li><li>If it's a fit, we scope a pilot on one site.</li></ol></div>
          <p class="muted small">No commitment: a request is not a subscription. Please don't include confidential supplier specifications in this form.</p>
        </div>
        <form class="lead card" novalidate data-lead-form>
          <div class="hp" aria-hidden="true"><label>Leave this field empty<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
          <div class="f"><label for="f-name">Full name *</label><input id="f-name" name="name" autocomplete="name" required><p class="err" data-err="name"></p></div>
          <div class="f"><label for="f-email">Work email *</label><input id="f-email" name="email" type="email" autocomplete="email" required><p class="err" data-err="email"></p></div>
          <div class="f"><label for="f-company">Company *</label><input id="f-company" name="company" autocomplete="organization" required><p class="err" data-err="company"></p></div>
          <div class="f"><label for="f-role">Role</label><input id="f-role" name="role" autocomplete="organization-title" placeholder="e.g. Technical manager"></div>
          <div class="f"><label for="f-size">Company size *</label><select id="f-size" name="size" required><option value="">Select…</option><option>1–50 employees</option><option>51–200 employees</option><option>201–1,000 employees</option><option>1,000+ employees</option></select><p class="err" data-err="size"></p></div>
          <div class="f"><label for="f-plan">Plan of interest</label><select id="f-plan" name="plan"><option value="">Not sure yet</option>${PLANS.map((p) => `<option>${p.name}</option>`).join("")}</select></div>
          <div class="f wide"><label for="f-use">Primary use case *</label><select id="f-use" name="use" required><option value="">Select…</option><option>Checking changeovers in the production schedule</option><option>Cleaning record verification</option><option>Building allergen profiles from supplier specs</option><option>Safer run ordering</option><option>Audit reporting</option><option>Not sure yet</option></select><p class="err" data-err="use"></p></div>
          <div class="f wide"><label for="f-msg">What would you like to check? *</label><textarea id="f-msg" name="message" maxlength="2000" required></textarea><p class="hint"><span data-count>0</span>/2000</p><p class="err" data-err="message"></p></div>
          <div class="f wide"><label class="check"><input type="checkbox" name="consent" required> I agree that ${b.name} may contact me about this request. *</label><p class="err" data-err="consent"></p></div>
          <div class="f wide"><button class="btn primary" type="submit" data-submit>Request early access</button><p class="form-status" role="status" aria-live="polite" data-status></p></div>
        </form>
      </div>
    </section>`;

// ---------------------------------------------------------------- inner page extras
const howDetail = () => `
    <section class="section">
      <div class="wrap trio">${[
        ["What goes in", ["Supplier specifications and recipe sheets", "Your product list and each product's allergens", "The production schedule for each line", "Cleaning records: type, time, sign-off and swab result"]],
        ["What comes out", ["A confirmed allergen profile for every product", "A risk rating for every changeover, with the reason", "Cleaning gaps: missing, wrong type, unsigned or unswabbed", "A suggested run order and a dated report"]],
        ["What your team does", ["Confirms extracted allergens before they are used", "Accepts or rejects each suggested run order", "Fixes gaps before the shift and signs off the report"]],
      ].map(([t, items]) => `<div class="card trio-c reveal"><h2>${t}</h2><ul>${items.map((x) => `<li>${x}</li>`).join("")}</ul></div>`).join("")}</div>
    </section>`;

const techDetail = () => `
    <section class="section">
      <div class="wrap tech-detail">
        <div>
          ${head("Data flow", "How a supplier spec becomes a checked schedule.")}
          <ol class="flow">${[
            ["1. Upload", "A QA user uploads a specification, schedule or cleaning log through Amazon API Gateway. The file goes to Amazon S3, encrypted with the customer's AWS KMS key."],
            ["2. Extract", "AWS Step Functions starts the pipeline. Amazon Textract reads text and tables, including scanned PDFs."],
            ["3. Interpret", "Amazon Bedrock maps ingredients to allergens and suggests a profile. Nothing is used until a person confirms it."],
            ["4. Assess", "AWS Lambda runs the changeover rules against the schedule and cleaning records, and stores findings in Amazon DynamoDB."],
            ["5. Review and report", "Users sign in with Amazon Cognito, approve run orders and generate dated reports in the web app."],
          ].map(([t, d]) => `<li class="card"><h3>${t}</h3><p>${d}</p></li>`).join("")}</ol>
        </div>
        <div class="tech-side">
          <div class="card trio-c"><h3>Access and encryption (as designed)</h3><ul>${["Encryption in transit (TLS) and at rest, with per-tenant AWS KMS keys", "Each customer's documents and records partitioned by organisation", "Least-privilege IAM roles for every Lambda function", "API requests authorised with Cognito tokens and checked on the server", "Bedrock is called only with the customer's own documents; they are not used to train models"].map((x) => `<li>${x}</li>`).join("")}</ul></div>
          <div class="card trio-c"><h3>Built and available now</h3><ul>${["Rule-based risk engine, sequencing and cleaning checks, with automated tests", "Interactive live demo (runs in the browser on sample data)", "Report generator with print/PDF and JSON export"].map((x) => `<li>${x}</li>`).join("")}</ul></div>
          <div class="card trio-c"><h3>Proposed, not yet deployed</h3><ul>${b.aws.map((a) => `<li>${esc(a.service)}</li>`).join("")}</ul></div>
          <p class="muted small">Using AWS services does not by itself make ${b.name} compliant with any regulation or standard.</p>
        </div>
      </div>
    </section>`;

const securityDetail = () => `
    <section class="section">
      <div class="wrap sec-grid">${[
        ["What the demo does with data", ["The live demo runs entirely in your browser.", "Products, schedules and cleaning records you enter are stored in your browser's local storage only and never sent to a server.", "You can reload the sample or start empty at any time."]],
        ["How production will handle your documents", ["Supplier specifications, schedules and cleaning records are stored on AWS, partitioned by customer.", "Documents are encrypted in transit and at rest with per-tenant keys.", "Hosting regions are agreed with each pilot site."]],
        ["Access and roles", ["Users sign in with Amazon Cognito; there are no shared logins.", "Planners, QA and auditors each get only the actions their role needs.", "Roles are enforced on the server, not only in the interface."]],
        ["How the AI is constrained", ["Risk ratings come from deterministic rules that show their working.", "AI only reads documents, suggests allergen profiles and explains findings.", "Every AI-extracted allergen is confirmed by a person before it is used."]],
        ["Audit trail", ["Profile confirmations, schedule changes, approvals and reports are written to an activity log.", "Each entry records who acted and when."]],
        ["What isn't built yet", ["The AWS document pipeline, sign-in and server-side roles are proposed, not deployed.", "No certifications are claimed. We will not describe any as held until they are."]],
      ].map(([t, items]) => `<div class="card trio-c reveal"><h2>${t}</h2><ul>${items.map((x) => `<li>${x}</li>`).join("")}</ul></div>`).join("")}</div>
    </section>`;

// ---------------------------------------------------------------- legal
const UPDATED = "24 November 2026";
const legal = (title, introText, sections) => `
    <section class="section legal">
      <div class="wrap legal-wrap">
        <p class="eyebrow">Legal</p>
        <h1>${title}</h1>
        <p class="muted">Last updated ${UPDATED}</p>
        <p class="lede">${introText}</p>
        ${sections.map(([h, items]) => `<h2>${h}</h2>${items.map((x) => Array.isArray(x) ? `<ul>${x.map((i) => `<li>${i}</li>`).join("")}</ul>` : `<p>${x}</p>`).join("")}`).join("")}
      </div>
    </section>`;
const contactLine = b.email ? `email <a href="mailto:${esc(b.email)}">${esc(b.email)}</a>` : `use the contact form at <a href="contact">${b.domain}/contact</a>`;

const privacy = () => legal("Privacy Policy", `This policy explains what personal information ${b.name} collects through ${b.domain} and the ${b.name} live demo, why, and the choices you have. ${b.name} is building its initial product, so this policy describes how the website and demo work today and will be updated before customer accounts open.`, [
  ["Information we collect", [[
    "<b>Information you send us:</b> when you use the early-access form or email us, we receive your name, work email, company, role (if given), company size, plan of interest, primary use case, your message and your consent to be contacted.",
    "<b>Live demo data:</b> the demo has no accounts. Products, schedules and cleaning records you enter are stored only in your own browser (local storage) and are not sent to us.",
    "<b>Technical information:</b> our hosting provider may log standard request data such as IP address, browser type and pages requested, for security and reliability.",
  ]]],
  ["How we use information", [["To reply to inquiries and early-access requests", "To operate, maintain and improve the website and product", "To meet legal obligations"], "We do not sell personal information, and we do not use form details for advertising."]],
  ["Third-party services", [["Our website host, to serve this site", "Google Fonts, for web fonts loaded from Google's servers", "Your email provider, when you choose to contact us by email", "Amazon Web Services, for the planned product infrastructure (not used to process personal information today)"]]],
  ["Retention", ["We keep inquiry emails for as long as needed to respond and follow up, and delete them on request. Retention periods for account data will be added before customer accounts open."]],
  ["Your rights", [`You can ask us to access, correct, export or delete your personal information, or object to how we use it: ${contactLine}. You can clear live-demo data at any time with "Start empty" in the demo or by clearing your browser's site data. Depending on where you live, you may also have the right to complain to a data protection authority.`]],
  ["Security", ["We use reputable providers and limit access to personal information to people who need it. No method of transmission or storage is completely secure."]],
  ["Changes", ["We will update this page when our practices change, and change the date above."]],
]);

const terms = () => legal("Terms of Service", `These terms apply when you use ${b.domain} and the ${b.name} live demo. By using them you agree to these terms. ${b.name} is building its initial product; separate commercial terms will be agreed with pilot customers.`, [
  ["Using the site and demo", ["You may use the website and live demo to evaluate SavorCline. The demo has no accounts and stores data only in your browser."]],
  ["The live demo", ["The demo's sample bakery is fictional. Findings, run orders and reports produced in the demo, including from data you enter, are for evaluation only and must not be relied on to make food safety decisions.", "SavorCline supports, and does not replace, your HACCP plan, allergen risk assessment and validated cleaning procedures."]],
  ["Your responsibilities", [["Provide accurate contact information", "Don't enter confidential supplier or customer data into the demo", "Don't misuse the site: no attempts to disrupt it, gain unauthorised access or scrape it at scale"]]],
  ["Intellectual property", [`The site, the demo, the ${b.name} name and logo belong to ${b.name}. You keep ownership of anything you enter.`]],
  ["Disclaimers", ["The website and live demo are provided \"as is\" without warranties of any kind. Features described as planned or proposed may change or may not be released."]],
  ["Limitation of liability", [`To the extent permitted by law, ${b.name} is not liable for indirect, incidental or consequential losses arising from use of the website or live demo.`]],
  ["Contact", [`Questions about these terms: ${contactLine}.`]],
]);

// ---------------------------------------------------------------- pages
const PAGES = {
  "index.html": { path: "", title: `${b.name} — Allergen risk checks for food production schedules`, description: "SavorCline checks food production schedules, ingredient specifications and cleaning records for allergen cross-contamination risks, and suggests safer run orders before production begins.",
    body: [hero(), problem(), features(), how(), solutions(), compare(), ai(), safeguards(), awsSection(), roadmap(), pricing(), team(), faq(), closing()].join("") },
  "product.html": { path: "product", current: "product", title: `Platform overview | ${b.name}`, description: "Allergen risk detection, safer production sequencing, cleaning verification, document intelligence and compliance reporting for food manufacturers.",
    body: intro("Platform overview", "Five checks between the supplier spec and the first run.", "Allergen risk detection, safer sequencing, cleaning verification, document intelligence and compliance reporting, all working on the same allergen profiles and schedule. Every capability can be tried in the live demo today.", ctas) + features() + compare() + closing() },
  "how-it-works.html": { path: "how-it-works", current: "how-it-works", title: `How it works | ${b.name}`, description: "How SavorCline turns supplier specifications, production schedules and cleaning records into checked changeovers and safer run orders.",
    body: intro("How it works", "From supplier spec to a checked schedule in four steps.", "SavorCline works from the documents your site already keeps. People confirm every allergen profile and approve every run order.") + how() + howDetail() + ai() + closing() },
  "solutions.html": { path: "solutions", current: "solutions", title: `Solutions for bakery, dairy, ready meals and meat | ${b.name}`, description: "How bakery, confectionery, dairy, ready-meal and meat manufacturers and QA consultants use SavorCline to control allergen changeovers.",
    body: intro("Solutions", "Built for food manufacturers with shared lines.", "Wherever several allergens share ovens, depositors, mixers or packing lines, the changeover is where cross-contact happens. SavorCline checks every one.") + solutions(true) + closing() },
  "technology.html": { path: "technology", current: "technology", title: `How we use Amazon Web Services | ${b.name}`, description: "SavorCline's proposed AWS architecture: Amazon Textract, Amazon Bedrock, Amazon S3, AWS Lambda, AWS Step Functions, Amazon DynamoDB, API Gateway, Cognito and AWS KMS.",
    body: intro("Technology", "How We Use Amazon Web Services", "What runs today, and how SavorCline's production platform is designed on AWS.") + awsSection(false) + techDetail() + closing() },
  "security.html": { path: "security", current: "security", title: `Security and safeguards | ${b.name}`, description: "How SavorCline is designed to protect supplier documents, keep QA teams in control and keep every finding traceable.",
    body: intro("Security", "Security and safeguards", `How ${b.name} is designed to protect supplier documents, keep people in control and keep every finding traceable, and what is and isn't built yet.`) + securityDetail() + safeguards(false) + closing() },
  "pricing.html": { path: "pricing", current: "pricing", title: `Pricing | ${b.name}`, description: "Proposed SavorCline launch pricing per production site. Plans start with an early-access conversation.",
    body: intro("Pricing", "Simple plans, priced per production site.", "Proposed launch pricing in USD, excluding taxes. No payment is taken today. Every plan starts with an early-access conversation.") + pricing() + closing() },
  "about.html": { path: "about", current: "about", title: `About and team | ${b.name}`, description: `${b.name} was founded in ${year} to help food manufacturers catch allergen cross-contact risk in the production schedule. Meet the founder and see the roadmap.`,
    body: intro("About", `About ${b.name}`, `${b.name} was founded in ${year} to help food manufacturers see allergen cross-contact risk in the production schedule, before a shift starts, instead of finding it on a failed swab or a recall notice.`, `<div class="mission"><div class="card"><p class="eyebrow">Mission</p><p>Make every allergen changeover visible, checked and signed off before production begins.</p></div><div class="card"><p class="eyebrow">How we build</p><p>With early-access QA teams, on their own schedules, with every finding traceable to a record.</p></div></div>`) + team() + roadmap() + closing() },
  "contact.html": { path: "contact", current: "contact", title: `Request early access | ${b.name}`, description: "Request early access to SavorCline, ask about pricing or tell us where allergen changeovers cause you the most work.",
    body: contactForm() + faq(), scripts: ["src/ui/page.js", "src/ui/contact.js"] },
  "privacy.html": { path: "privacy", title: `Privacy Policy | ${b.name}`, description: `How ${b.name} collects, uses and protects personal information on ${b.domain}.`, body: privacy() },
  "terms.html": { path: "terms", title: `Terms of Service | ${b.name}`, description: `The terms that apply when you use ${b.domain} and the ${b.name} live demo.`, body: terms() },
};

for (const [file, p] of Object.entries(PAGES)) {
  writeFileSync(root + file, page(p));
  console.log("wrote", file);
}

// sitemap
const routes = ["", ...Object.values(PAGES).map((p) => p.path).filter(Boolean), "demo"];
writeFileSync(root + "sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map((r) => `  <url><loc>${SITE}/${r}</loc><lastmod>2026-11-24</lastmod></url>`).join("\n")}
</urlset>
`);
writeFileSync(root + "robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
console.log("wrote sitemap.xml, robots.txt");
