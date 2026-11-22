import { business, STATUS_LABEL } from "../data/business.js";
import { sampleState, SAMPLE_SPEC } from "../data/sample.js";
import { assessSchedule, optimiseLine, runsForLine } from "../engine/risk.js";
import { extractAllergens, ALLERGEN_BY_ID } from "../engine/allergens.js";
import { renderHeader, renderFooter, initReveal, esc, chip, fmtTime } from "./site.js";

renderHeader("home");
renderFooter();

const $ = (s) => document.querySelector(s);
const state = sampleState();
const { findings } = assessSchedule(state);
const productById = Object.fromEntries(state.products.map((p) => [p.id, p]));
const SEV = { high: "High risk", medium: "Check", low: "Controlled", none: "No carry-over" };

// ---- Hero board: live output of the engine on Line 1 of the sample site ----
(function heroBoard() {
  const runs = runsForLine(state, "L1");
  const f = findings.filter((x) => x.lineId === "L1");
  let html = `<div class="board-head"><div><span class="mono muted">Mon 23 Nov · sample site</span><strong>${esc(state.lines[0].name)}</strong></div><span class="board-tag mono">${f.filter((x) => x.severity === "high").length} high · ${f.filter((x) => x.severity === "medium").length} check</span></div><ol class="board-runs">`;
  runs.forEach((r, i) => {
    const p = productById[r.productId];
    html += `<li class="b-run" style="--i:${i}"><span class="mono b-time">${fmtTime(r.start)}</span><div><strong>${esc(p.name)}</strong><div class="chips">${p.allergens.map((a) => chip(a)).join("")}</div></div></li>`;
    const x = f[i];
    if (x) {
      html += `<li class="b-change ${x.severity}" style="--i:${i}"><span class="status ${x.severity}">${SEV[x.severity]}</span><span class="b-detail">${x.carry.length ? `Leaves <b>${x.carry.map((c) => ALLERGEN_BY_ID[c].label.toLowerCase()).join(", ")}</b> · ${esc(x.title.toLowerCase())}` : "Next product declares the same allergens"}</span></li>`;
    }
  });
  const opt = optimiseLine(state, "L1");
  html += `</ol><div class="board-foot"><span>Suggested order needs <b>${opt.after.cleans}</b> allergen clean${opt.after.cleans === 1 ? "" : "s"} instead of <b>${opt.before.cleans}</b></span><a href="app.html#sequence">Review in demo →</a></div>`;
  $("[data-hero-board]").innerHTML = html;
})();

// ---- Highlights (capabilities, not metrics: no verified metrics exist yet) ----
$("[data-highlights]").innerHTML = [
  ["14", "regulated allergens tracked per product, including hidden sources"],
  ["Every", "changeover on every line checked against the cleaning log"],
  ["Fewest", "allergen cleans: run orders searched exhaustively up to 8 runs per line"],
  ["1-click", "dated risk report with findings and a QA sign-off block"],
].map(([k, v]) => `<div class="hl reveal"><span class="hl-k">${k}</span><span class="hl-v">${v}</span></div>`).join("");

// ---- Problem ----
$("[data-problems]").innerHTML = business.problem.map((p) => `<li>${esc(p)}</li>`).join("");
const brownie = productById.p4, loaf = productById.p1;
$("[data-anat-a]").innerHTML = brownie.allergens.map((a) => chip(a)).join("");
$("[data-anat-b]").innerHTML = loaf.allergens.map((a) => chip(a)).join("");
$("[data-anat-carry]").innerHTML = brownie.allergens.filter((a) => !loaf.allergens.includes(a)).map((a) => chip(a)).join("");

// ---- Feature visuals (all generated from the engine + sample data) ----
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
    for (const t of [...new Set(terms)].sort((a, b) => b.length - a.length)) {
      line = line.replace(new RegExp(`\\b(${t})\\b`, "gi"), "<mark>$1</mark>");
    }
    return `<div class="v-doc"><p class="mono">${line}</p><div class="chips">${r.contains.map((c) => chip(c.id)).join("")}${r.mayContain.map((c) => chip(c.id, true)).join("")}</div></div>`;
  },
  report() {
    const s = assessSchedule(state).summary;
    return `<div class="v-report"><div class="v-rh"><strong>Allergen risk report</strong><span class="mono muted">Mon 23 Nov</span></div><div class="v-rs"><span><b>${s.high}</b> high</span><span><b>${s.medium}</b> check</span><span><b>${s.low}</b> controlled</span></div><div class="v-lines"><i></i><i></i><i style="width:60%"></i></div><div class="v-sign mono">QA sign-off ____________</div></div>`;
  },
};

$("[data-features]").innerHTML = business.features.map((f, i) => `
  <article class="feature reveal">
    <div class="f-copy">
      <div class="f-top"><span class="mono muted">0${i + 1}</span><span class="status ${f.status}">${STATUS_LABEL[f.status]}</span></div>
      <h3>${esc(f.name)}</h3>
      <p>${esc(f.what)}</p>
      <p class="f-benefit">${esc(f.benefit)}</p>
      ${f.note ? `<p class="f-note">${esc(f.note)}</p>` : ""}
    </div>
    <div class="f-visual" aria-hidden="true">${visuals[f.id]()}</div>
  </article>`).join("");

// ---- Solutions ----
$("[data-segments]").innerHTML = business.customers.map((c) => `<li class="seg reveal${c.primary ? " primary" : ""}"><div><h3>${esc(c.name)}</h3><p>${esc(c.detail)}</p></div>${c.primary ? `<span class="status implemented">First focus</span>` : ""}</li>`).join("");
$("[data-decision-makers]").textContent = `Used by: ${business.decisionMakers.join(" · ")}`;

// ---- Technology ----
$("[data-stage-summary]").textContent = business.stage.summary;
$("[data-aws]").innerHTML = business.aws.map((a) => `<tr><th scope="row">${esc(a.service)}</th><td>${esc(a.role)}</td><td><span class="status ${a.status}">${STATUS_LABEL[a.status]}</span></td></tr>`).join("");
$("[data-arch]").innerHTML = `
  <div class="ad-col"><div class="ad-node user">Web app<small>Planner · QA · Auditor</small></div></div>
  <div class="ad-link" aria-hidden="true"></div>
  <div class="ad-col"><div class="ad-node">API Gateway<small>+ Cognito sign-in</small></div></div>
  <div class="ad-link" aria-hidden="true"></div>
  <div class="ad-col ad-stack">
    <div class="ad-node">Step Functions + Lambda<small>upload → extract → interpret → assess</small></div>
    <div class="ad-pair"><div class="ad-node ai">Textract<small>read documents</small></div><div class="ad-node ai">Bedrock<small>interpret allergens</small></div></div>
    <div class="ad-human mono">human review before use</div>
  </div>
  <div class="ad-link" aria-hidden="true"></div>
  <div class="ad-col ad-stack"><div class="ad-node store">DynamoDB<small>profiles · schedules · findings</small></div><div class="ad-node store">S3 + KMS<small>encrypted documents</small></div></div>`;
$("[data-roadmap]").innerHTML = business.roadmap.map((r) => `<div class="rm"><span class="mono rm-k">${esc(r.phase)}</span><ul>${r.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul></div>`).join("");

// ---- Pricing CTA ----
$("[data-pilot-cta]").innerHTML = business.email
  ? `<a class="btn primary" href="mailto:${esc(business.email)}?subject=${encodeURIComponent("SavorCline pilot programme")}">Ask about the pilot <span class="arrow">→</span></a>`
  : `<a class="btn primary" href="app.html">Try it with your products <span class="arrow">→</span></a>`;

// ---- Contact / final CTA, with a casual founder sign-off (only real, supplied people) ----
const initials = (n) => n.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
const founderNote = business.founders.length
  ? `<p class="founder-note">${business.founders.map((f) => `<span class="fn-avatar" aria-hidden="true">${esc(initials(f.name))}</span>`).join("")}<span>Built by ${business.founders.map((f) => f.linkedin ? `<a href="${esc(f.linkedin)}" rel="noopener">${esc(f.name)}</a>` : `<b>${esc(f.name)}</b>`).join(" &amp; ")}<span class="fn-title">${business.founders.length > 1 ? "Founders" : esc(business.founders[0].title)}</span></span></p>`
  : "";
$("[data-contact]").innerHTML = `
  <div class="wrap final-inner">
    <div>
      <h2>See your own schedule through SavorCline.</h2>
      <p class="lede">Load the sample bakery or enter your own products, lines and cleaning records. Everything stays in your browser.</p>
      ${founderNote}
    </div>
    <div class="final-cta">
      <a class="btn primary" href="app.html">Open the demo workspace <span class="arrow">→</span></a>
      ${business.email ? `<a class="btn ghost" href="mailto:${esc(business.email)}">${esc(business.email)}</a>` : ""}
    </div>
  </div>`;

// ---- Structured data ----
const ld = { "@context": "https://schema.org", "@type": "Organization", name: business.name, description: business.positioning, slogan: business.tagline };
if (business.domain) ld.url = `https://www.${business.domain}`;
if (business.email) ld.email = business.email;
if (business.linkedinUrl) ld.sameAs = [business.linkedinUrl];
const s = document.createElement("script");
s.type = "application/ld+json";
s.textContent = JSON.stringify(ld);
document.head.appendChild(s);

initReveal();
