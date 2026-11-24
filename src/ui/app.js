// SavorCline demo workspace. All logic runs client-side on the rule-based engine.
import { sampleState, SAMPLE_SPEC } from "../data/sample.js";
import { business } from "../data/business.js";
import { ALLERGENS, ALLERGEN_BY_ID, extractAllergens } from "../engine/allergens.js";
import { assessSchedule, verifyCleaning, optimiseLine, applyProposal, buildReport, runsForLine, CLEAN_TYPES } from "../engine/risk.js";
import { renderHeader, esc, chip, fmtTime, fmtDate } from "./site.js";

renderHeader("demo");

const KEY = "savorcline.workspace.v1";
const $ = (s, r = document) => r.querySelector(s);
const view = $("#view");
const SEV = { high: "High risk", medium: "Check", low: "Controlled", none: "No carry-over" };
const SEV_ORDER = { high: 0, medium: 1, low: 2, none: 3 };

let state = load();
let undo = null;
let editingProduct = null;
let picker = {}; // allergenId -> "contains" | "may"
let docResult = null;

function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.products) return s; } catch {}
  return sampleState();
}
function save() { localStorage.setItem(KEY, JSON.stringify(state)); }
function commit(next, msg) { state = { ...next, sample: false }; save(); render(); if (msg) toast(msg); }
const uid = (p) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const productById = () => Object.fromEntries(state.products.map((p) => [p.id, p]));

function toast(msg) {
  const t = $("[data-toast]");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove("show"), 2600);
}

const VIEWS = [
  ["overview", "Overview"],
  ["products", "Products & allergens"],
  ["schedule", "Production schedule"],
  ["sequence", "Sequencing"],
  ["cleaning", "Cleaning records"],
  ["documents", "Document extraction"],
  ["report", "Compliance report"],
];
const current = () => (VIEWS.find(([id]) => id === location.hash.slice(1)) || VIEWS[0])[0];

function renderSide() {
  const { summary } = assessSchedule(state);
  const gaps = verifyCleaning(state).filter((g) => !g.ok).length;
  const badge = { overview: summary.high ? `<b class="nb high">${summary.high}</b>` : "", cleaning: gaps ? `<b class="nb medium">${gaps}</b>` : "" };
  $("[data-ws-nav]").innerHTML = VIEWS.map(([id, l]) => `<a href="#${id}" ${current() === id ? 'aria-current="page"' : ""}>${l}${badge[id] || ""}</a>`).join("");
  $("[data-site-name]").textContent = state.site || "My site";
  $("[data-data-badge]").innerHTML = state.sample ? `<span class="status prototype">Sample data</span>` : `<span class="status implemented">Your data</span>`;
}

function render() {
  renderSide();
  const v = current();
  view.innerHTML = R[v]();
  bind[v]?.();
}

const head = (title, sub, extra = "") => `<div class="v-head"><div><h1>${title}</h1><p class="muted">${sub}</p></div>${extra}</div>`;
const empty = (msg, href, cta) => `<div class="empty card"><p>${msg}</p>${href ? `<a class="btn primary small" href="${href}">${cta}</a>` : ""}</div>`;
const allergenChips = (p) => p.allergens.map((a) => chip(a)).join("") + p.mayContain.map((a) => chip(a, true)).join("");

// ---------------------------------------------------------------- Views
const R = {
  overview() {
    const { findings, summary } = assessSchedule(state);
    const gaps = verifyCleaning(state).filter((g) => !g.ok).length;
    const risky = findings.filter((f) => f.severity !== "none").sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]);
    const tiles = [["Changeovers checked", summary.changeovers, ""], ["High risk", summary.high, "high"], ["Need checking", summary.medium, "medium"], ["Controlled", summary.low, "low"], ["Cleaning record gaps", gaps, gaps ? "medium" : ""]];
    return head("Overview", `${esc(state.site || "My site")} · ${state.lines.length} line${state.lines.length === 1 ? "" : "s"} · ${state.runs.length} runs · ${state.products.length} products`) + `
      <div class="tiles">${tiles.map(([l, n, c]) => `<div class="tile ${c}"><span class="tile-n">${n}</span><span class="tile-l">${l}</span></div>`).join("")}</div>
      <section class="card panel">
        <div class="panel-head"><h2>Changeovers needing attention</h2><a href="#sequence" class="btn ghost small">Find a safer order</a></div>
        ${risky.length ? `<ul class="findings">${risky.map(findingRow).join("")}</ul>` : `<p class="muted pad">No allergen carry-over in the current schedule. ${state.runs.length < 2 ? "Add at least two runs on a line to check a changeover." : ""}</p>`}
      </section>`;
  },

  products() {
    const used = new Set(state.runs.map((r) => r.productId));
    const p = editingProduct ? state.products.find((x) => x.id === editingProduct) : null;
    return head("Products & allergens", "Each product's confirmed allergen profile is the reference for every changeover check.") + `
      <div class="split">
        <section class="card panel">
          <div class="panel-head"><h2>${state.products.length} products</h2></div>
          ${state.products.length ? `<table class="tbl"><thead><tr><th>Product</th><th>Allergens <span class="muted">(dashed = may contain)</span></th><th></th></tr></thead><tbody>
            ${state.products.map((x) => `<tr><td><strong>${esc(x.name)}</strong>${used.has(x.id) ? `<span class="muted small"> · scheduled</span>` : ""}</td><td><div class="chips">${allergenChips(x) || `<span class="muted">None declared</span>`}</div></td>
            <td class="act"><button class="link" data-edit="${x.id}">Edit</button><button class="link danger" data-del="${x.id}">Delete</button></td></tr>`).join("")}
          </tbody></table>` : `<p class="muted pad">No products yet. Add one with the form, or extract one from a specification.</p>`}
        </section>
        <section class="card panel form-panel">
          <h2>${p ? "Edit product" : "Add product"}</h2>
          <form data-product-form>
            <label for="pname">Product name</label>
            <input id="pname" name="name" required maxlength="80" value="${esc(p?.name || "")}" placeholder="e.g. Cherry bakewell slice">
            <fieldset class="picker"><legend>Allergens <span class="muted">— click once for <b>contains</b>, twice for <b>may contain</b></span></legend>${pickerHtml()}</fieldset>
            <div class="row"><button class="btn primary small" type="submit">${p ? "Save changes" : "Add product"}</button>${p ? `<button class="btn ghost small" type="button" data-cancel>Cancel</button>` : ""}</div>
          </form>
        </section>
      </div>`;
  },

  schedule() {
    const { findings } = assessSchedule(state);
    const pb = productById();
    const date = defaultDate();
    return head("Production schedule", "Runs per line in time order, with the assessment of every changeover.") + `
      <div class="split">
        <div class="lines">
          ${state.lines.map((l) => {
            const runs = runsForLine(state, l.id);
            const f = findings.filter((x) => x.lineId === l.id);
            return `<section class="card panel line"><div class="panel-head"><h2>${esc(l.name)}</h2>${runs.length ? "" : `<button class="link danger" data-del-line="${l.id}">Remove line</button>`}</div>
              ${runs.length ? `<ol class="tl">${runs.map((r, i) => {
                const p = pb[r.productId];
                const x = f[i];
                return `<li class="tl-run"><span class="mono tl-t">${fmtTime(r.start)}–${fmtTime(r.end)}<small>${fmtDate(r.start)}</small></span><div><strong>${esc(p?.name || "Unknown product")}</strong><div class="chips">${p ? allergenChips(p) : ""}</div></div><button class="link danger" data-del-run="${r.id}" aria-label="Remove run">Remove</button></li>
                ${x ? `<li class="tl-change ${x.severity}"><span class="status ${x.severity}">${SEV[x.severity]}</span><span>${esc(x.title)}${x.carry.length ? ` · leaves ${x.carry.map((c) => ALLERGEN_BY_ID[c].label.toLowerCase()).join(", ")}` : ""}</span></li>` : ""}`;
              }).join("")}</ol>` : `<p class="muted pad">No runs on this line yet.</p>`}
            </section>`;
          }).join("") || empty("No production lines yet. Add one to start building a schedule.")}
        </div>
        <div class="stack">
          <section class="card panel form-panel">
            <h2>Add a run</h2>
            ${state.lines.length && state.products.length ? `<form data-run-form>
              <label for="rline">Line</label><select id="rline" name="line">${state.lines.map((l) => `<option value="${l.id}">${esc(l.name)}</option>`).join("")}</select>
              <label for="rprod">Product</label><select id="rprod" name="product">${state.products.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join("")}</select>
              <label for="rdate">Date</label><input id="rdate" name="date" type="date" value="${date}" required>
              <div class="row2"><div><label for="rs">Start</label><input id="rs" name="start" type="time" value="${nextSlot()}" required></div><div><label for="re">End</label><input id="re" name="end" type="time" required></div></div>
              <button class="btn primary small" type="submit">Add run</button>
            </form>` : `<p class="muted">${state.lines.length ? `Add a product first on <a href="#products">Products & allergens</a>.` : "Add a line first."}</p>`}
          </section>
          <section class="card panel form-panel">
            <h2>Add a line</h2>
            <form data-line-form><label for="lname">Line name</label><input id="lname" name="name" required maxlength="60" placeholder="e.g. Line 3 · Tray bake"><button class="btn ghost small" type="submit">Add line</button></form>
          </section>
          <section class="card panel form-panel">
            <h2>Site name</h2>
            <form data-site-form><label for="sname" class="sr-only">Site name</label><input id="sname" name="name" maxlength="80" value="${esc(state.site || "")}"><button class="btn ghost small" type="submit">Save</button></form>
          </section>
        </div>
      </div>`;
  },

  sequence() {
    const pb = productById();
    const blocks = state.lines.map((l) => {
      const runs = runsForLine(state, l.id);
      if (runs.length < 2) return `<section class="card panel"><div class="panel-head"><h2>${esc(l.name)}</h2></div><p class="muted pad">Needs at least two runs to sequence.</p></section>`;
      const o = optimiseLine(state, l.id);
      const list = (rs) => `<ol class="seq">${rs.map((r, i) => {
        const p = pb[r.productId];
        const prev = i ? pb[rs[i - 1].productId] : null;
        const carry = prev ? prev.allergens.filter((a) => !p.allergens.includes(a)) : [];
        return `${i ? `<li class="seq-gap ${carry.length ? "need" : ""}">${carry.length ? `Allergen clean needed · ${carry.map((c) => ALLERGEN_BY_ID[c].label.toLowerCase()).join(", ")}` : "No allergen clean needed"}</li>` : ""}<li class="seq-run"><span class="mono">${fmtTime(r.start)}</span><strong>${esc(p.name)}</strong><div class="chips">${p.allergens.map((a) => chip(a)).join("")}</div></li>`;
      }).join("")}</ol>`;
      return `<section class="card panel"><div class="panel-head"><h2>${esc(l.name)}</h2>
        ${o.changed ? `<button class="btn primary small" data-apply="${l.id}">Apply suggested order</button>` : `<span class="status implemented">Already optimal</span>`}</div>
        <div class="seq-cols"><div><h3>Planned <span class="mono pill">${o.before.cleans} allergen clean${o.before.cleans === 1 ? "" : "s"}</span></h3>${list(runs)}</div>
        <div><h3>Suggested <span class="mono pill good">${o.after.cleans} allergen clean${o.after.cleans === 1 ? "" : "s"}</span></h3>${o.changed ? list(o.proposal) : `<p class="muted">The planned order already needs the fewest allergen cleans.</p>`}</div></div></section>`;
    }).join("");
    return head("Sequencing", "Suggested run orders keep your time slots and need the fewest allergen cleans. A person approves every change.",
      undo ? `<button class="btn ghost small" data-undo>Undo last change</button>` : "") +
      `<p class="note">Suggestions only consider allergen carry-over. Check them against shelf life, oven temperatures, staffing and customer deadlines before you apply them.</p>` + (blocks || empty("No lines yet.", "#schedule", "Build a schedule"));
  },

  cleaning() {
    const gaps = verifyCleaning(state);
    const ln = Object.fromEntries(state.lines.map((l) => [l.id, l.name]));
    return head("Cleaning records", "Each record is checked for sign-off, swab results and whether it covers a changeover in the schedule.") + `
      <div class="split">
        <section class="card panel">
          <div class="panel-head"><h2>${gaps.length} records · ${gaps.filter((g) => !g.ok).length} with gaps</h2></div>
          ${gaps.length ? `<table class="tbl"><thead><tr><th>When</th><th>Line</th><th>Clean</th><th>Sign-off</th><th>Swab</th><th>Gaps</th><th></th></tr></thead><tbody>
          ${gaps.sort((a, b) => a.clean.time.localeCompare(b.clean.time)).map((g) => `<tr class="${g.ok ? "" : "gap"}"><td class="mono">${fmtTime(g.clean.time)}<small class="muted"> ${fmtDate(g.clean.time)}</small></td><td>${esc(ln[g.clean.line] || "")}</td><td>${CLEAN_TYPES[g.clean.type]}</td><td>${g.clean.verifiedBy ? esc(g.clean.verifiedBy) : `<span class="muted">—</span>`}</td>
          <td>${g.clean.swab ? `<span class="status ${g.clean.swab === "pass" ? "low" : "high"}">${g.clean.swab}</span>` : `<span class="muted">—</span>`}</td>
          <td>${g.ok ? `<span class="status implemented">Complete</span>` : `<ul class="issues">${g.issues.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`}</td><td class="act"><button class="link danger" data-del-clean="${g.clean.id}">Remove</button></td></tr>`).join("")}
          </tbody></table>` : `<p class="muted pad">No cleaning records yet.</p>`}
        </section>
        <section class="card panel form-panel">
          <h2>Record a clean</h2>
          ${state.lines.length ? `<form data-clean-form>
            <label for="cl">Line</label><select id="cl" name="line">${state.lines.map((l) => `<option value="${l.id}">${esc(l.name)}</option>`).join("")}</select>
            <div class="row2"><div><label for="cd">Date</label><input id="cd" name="date" type="date" value="${defaultDate()}" required></div><div><label for="ct">Time</label><input id="ct" name="time" type="time" required></div></div>
            <label for="ctype">Type</label><select id="ctype" name="type">${Object.entries(CLEAN_TYPES).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select>
            <label for="cv">Signed off by <span class="muted">(role or initials)</span></label><input id="cv" name="verifiedBy" maxlength="60">
            <label for="cs">Allergen swab</label><select id="cs" name="swab"><option value="">Not taken</option><option value="pass">Pass</option><option value="fail">Fail</option></select>
            <button class="btn primary small" type="submit">Add record</button>
          </form>` : `<p class="muted">Add a line on the schedule page first.</p>`}
        </section>
      </div>`;
  },

  documents() {
    return head("Document extraction", "Paste an ingredient list or supplier specification. Allergens are found by ingredient name, including hidden sources.") + `
      <p class="note"><b>Preview.</b> This demo uses keyword and synonym matching. The planned version reads uploaded PDFs with Amazon Textract and interprets them with Amazon Bedrock. In both, a person confirms the result before it is used.</p>
      <div class="split">
        <section class="card panel form-panel">
          <label for="doc">Specification text</label>
          <textarea id="doc" rows="12" placeholder="Ingredients: …">${esc(docResult?.text || "")}</textarea>
          <div class="row"><button class="btn primary small" data-extract>Extract allergens</button><button class="btn ghost small" data-sample-spec>Use sample spec</button></div>
        </section>
        <section class="card panel form-panel">
          ${docResult ? `
            <h2>Found</h2>
            <h3 class="sub">Contains</h3>${docResult.contains.length ? `<ul class="found">${docResult.contains.map((c) => `<li>${chip(c.id)}<span class="mono muted">${c.matches.map(esc).join(", ")}</span></li>`).join("")}</ul>` : `<p class="muted">None found.</p>`}
            <h3 class="sub">May contain (precautionary)</h3>${docResult.mayContain.length ? `<ul class="found">${docResult.mayContain.map((c) => `<li>${chip(c.id, true)}<span class="mono muted">${c.matches.map(esc).join(", ")}</span></li>`).join("")}</ul>` : `<p class="muted">None found.</p>`}
            <form data-doc-product>
              <h2 style="margin-top:20px">Review and add as product</h2>
              <label for="dname">Product name</label><input id="dname" name="name" required maxlength="80" placeholder="e.g. Hazelnut praline filling">
              <fieldset class="picker"><legend>Confirm allergens</legend>${pickerHtml()}</fieldset>
              <button class="btn primary small" type="submit">Add to products</button>
            </form>` : `<p class="muted">Results will appear here.</p>`}
        </section>
      </div>`;
  },

  report() {
    const r = buildReport(state);
    return head("Compliance report", "A dated record of the current schedule's allergen assessment.", `<div class="row no-print"><button class="btn ghost small" data-json>Download JSON</button><button class="btn primary small" data-print>Print / save as PDF</button></div>`) + `
      <article class="card report" id="report">
        <header class="rep-head"><div><p class="mono muted">SavorCline · allergen risk report</p><h2>${esc(r.site || "My site")}</h2></div><div class="mono muted rep-meta">Generated ${new Date(r.generatedAt).toLocaleString()}<br>${esc(r.dataNotice)}</div></header>
        <div class="rep-sum"><div><b>${r.summary.changeovers}</b>changeovers</div><div class="high"><b>${r.summary.high}</b>high risk</div><div class="medium"><b>${r.summary.medium}</b>to check</div><div class="low"><b>${r.summary.low}</b>controlled</div><div><b>${r.cleaningGaps.length}</b>cleaning gaps</div></div>
        <h3>Findings</h3>
        ${r.findings.length ? `<table class="tbl"><thead><tr><th>Line</th><th>Changeover</th><th>Carry-over</th><th>Assessment</th></tr></thead><tbody>${r.findings.sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]).map((f) => `<tr><td>${esc(f.lineName)}<br><span class="mono muted">${fmtTime(f.at)}</span></td><td>${esc(f.from)} → ${esc(f.to)}</td><td><div class="chips">${f.carry.map((c) => chip(c)).join("")}</div></td><td><span class="status ${f.severity}">${SEV[f.severity]}</span><p class="small">${esc(f.detail)}</p></td></tr>`).join("")}</tbody></table>` : `<p class="muted">No allergen carry-over found.</p>`}
        <h3>Cleaning record gaps</h3>
        ${r.cleaningGaps.length ? `<ul class="rep-gaps">${r.cleaningGaps.map((g) => `<li><span class="mono">${fmtTime(g.time)}</span> ${esc(g.line)} · ${CLEAN_TYPES[g.type]} — ${g.issues.map(esc).join("; ")}</li>`).join("")}</ul>` : `<p class="muted">None.</p>`}
        <h3>Schedule assessed</h3>
        <div class="rep-lines">${r.lines.map((l) => `<div><strong>${esc(l.name)}</strong><ol>${l.runs.map((x) => `<li><span class="mono">${fmtTime(x.start)}</span> ${esc(x.product)}</li>`).join("")}</ol></div>`).join("")}</div>
        <div class="rep-sign"><div>Reviewed by<span></span></div><div>Role<span></span></div><div>Date<span></span></div></div>
        <p class="muted small">This report applies the allergen profiles and cleaning records entered in the workspace. It supports, and does not replace, the site's HACCP plan and validated cleaning procedures.</p>
      </article>`;
  },
};

function findingRow(f) {
  return `<li class="finding ${f.severity}"><span class="status ${f.severity}">${SEV[f.severity]}</span><div><strong>${esc(f.from)} → ${esc(f.to)}</strong><span class="mono muted"> · ${esc(f.lineName)} · ${fmtTime(f.at)}</span><p>${esc(f.detail)}</p><div class="chips">${f.carry.map((c) => chip(c)).join("")}</div></div></li>`;
}

function pickerHtml() {
  return `<div class="pick-grid">${ALLERGENS.map((a) => {
    const s = picker[a.id] || "";
    return `<button type="button" class="pick ${s}" data-pick="${a.id}" style="--c:${a.color}" aria-label="${esc(a.label)}: ${s === "contains" ? "contains" : s === "may" ? "may contain" : "not present"}"><i></i>${esc(a.label)}<small>${s === "contains" ? "contains" : s === "may" ? "may contain" : ""}</small></button>`;
  }).join("")}</div>`;
}
function bindPicker() {
  view.querySelectorAll("[data-pick]").forEach((b) => b.addEventListener("click", () => {
    const id = b.dataset.pick;
    picker[id] = picker[id] === "contains" ? "may" : picker[id] === "may" ? "" : "contains";
    if (!picker[id]) delete picker[id];
    const s = picker[id] || "";
    b.className = `pick ${s}`;
    b.querySelector("small").textContent = s === "contains" ? "contains" : s === "may" ? "may contain" : "";
    b.setAttribute("aria-label", `${ALLERGEN_BY_ID[id].label}: ${s === "contains" ? "contains" : s === "may" ? "may contain" : "not present"}`);
  }));
}
const pickerToProfile = () => ({
  allergens: Object.keys(picker).filter((k) => picker[k] === "contains"),
  mayContain: Object.keys(picker).filter((k) => picker[k] === "may"),
});

function defaultDate() {
  const d = state.runs.map((r) => r.start.slice(0, 10)).sort().pop();
  return d || new Date().toISOString().slice(0, 10);
}
function nextSlot() {
  const e = state.runs.map((r) => r.end).sort().pop();
  return e ? e.slice(11, 16) : "06:00";
}

// ---------------------------------------------------------------- Bindings
const on = (sel, ev, fn) => view.querySelectorAll(sel).forEach((el) => el.addEventListener(ev, fn));
const bind = {
  products() {
    bindPicker();
    on("[data-edit]", "click", (e) => {
      const p = state.products.find((x) => x.id === e.target.dataset.edit);
      editingProduct = p.id;
      picker = {};
      p.allergens.forEach((a) => (picker[a] = "contains"));
      p.mayContain.forEach((a) => (picker[a] = "may"));
      render();
      $("#pname").focus();
    });
    on("[data-cancel]", "click", () => { editingProduct = null; picker = {}; render(); });
    on("[data-del]", "click", (e) => {
      const id = e.target.dataset.del;
      const p = state.products.find((x) => x.id === id);
      if (state.runs.some((r) => r.productId === id)) { toast(`${p.name} is on the schedule. Remove its runs first.`); return; }
      if (!confirm(`Delete ${p.name}?`)) return;
      commit({ ...state, products: state.products.filter((x) => x.id !== id) }, "Product deleted");
    });
    on("[data-product-form]", "submit", (e) => {
      e.preventDefault();
      const name = new FormData(e.target).get("name").trim();
      if (!name) return;
      const prof = pickerToProfile();
      const products = editingProduct
        ? state.products.map((p) => (p.id === editingProduct ? { ...p, name, ...prof } : p))
        : [...state.products, { id: uid("p"), name, ...prof }];
      const msg = editingProduct ? "Product updated — schedule re-checked" : "Product added";
      editingProduct = null; picker = {};
      commit({ ...state, products }, msg);
    });
  },
  schedule() {
    const rs = $("#rs"), re = $("#re");
    const bump = () => { if (rs && re && rs.value) { const [h, m] = rs.value.split(":").map(Number); const t = h * 60 + m + 90; re.value = `${String(Math.floor(t / 60) % 24).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`; } };
    bump();
    rs?.addEventListener("change", bump);
    on("[data-run-form]", "submit", (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const start = `${f.get("date")}T${f.get("start")}:00`, end = `${f.get("date")}T${f.get("end")}:00`;
      if (end <= start) { toast("End time must be after start time."); return; }
      const clash = state.runs.find((r) => r.line === f.get("line") && start < r.end && end > r.start);
      if (clash) { toast("That overlaps another run on this line."); return; }
      commit({ ...state, runs: [...state.runs, { id: uid("r"), line: f.get("line"), productId: f.get("product"), start, end }] }, "Run added — changeovers re-checked");
    });
    on("[data-line-form]", "submit", (e) => {
      e.preventDefault();
      const name = new FormData(e.target).get("name").trim();
      if (name) commit({ ...state, lines: [...state.lines, { id: uid("L"), name }] }, "Line added");
    });
    on("[data-site-form]", "submit", (e) => { e.preventDefault(); commit({ ...state, site: new FormData(e.target).get("name").trim() }, "Site name saved"); });
    on("[data-del-run]", "click", (e) => commit({ ...state, runs: state.runs.filter((r) => r.id !== e.currentTarget.dataset.delRun) }, "Run removed"));
    on("[data-del-line]", "click", (e) => commit({ ...state, lines: state.lines.filter((l) => l.id !== e.currentTarget.dataset.delLine) }, "Line removed"));
  },
  sequence() {
    on("[data-apply]", "click", (e) => {
      const id = e.target.dataset.apply;
      const o = optimiseLine(state, id);
      undo = state;
      commit(applyProposal(state, id, o.proposal), `Order applied: ${o.before.cleans} → ${o.after.cleans} allergen cleans`);
    });
    on("[data-undo]", "click", () => { const u = undo; undo = null; state = u; save(); render(); toast("Change undone"); });
  },
  cleaning() {
    on("[data-clean-form]", "submit", (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      commit({ ...state, cleans: [...state.cleans, { id: uid("c"), line: f.get("line"), time: `${f.get("date")}T${f.get("time")}:00`, type: f.get("type"), verifiedBy: f.get("verifiedBy").trim() || null, swab: f.get("swab") || null }] }, "Cleaning record added");
    });
    on("[data-del-clean]", "click", (e) => commit({ ...state, cleans: state.cleans.filter((c) => c.id !== e.currentTarget.dataset.delClean) }, "Record removed"));
  },
  documents() {
    bindPicker();
    on("[data-sample-spec]", "click", () => { $("#doc").value = SAMPLE_SPEC; });
    on("[data-extract]", "click", () => {
      const text = $("#doc").value;
      if (!text.trim()) { toast("Paste some specification text first."); return; }
      const r = extractAllergens(text);
      docResult = { text, ...r };
      picker = {};
      r.contains.forEach((c) => (picker[c.id] = "contains"));
      r.mayContain.forEach((c) => (picker[c.id] = "may"));
      render();
    });
    on("[data-doc-product]", "submit", (e) => {
      e.preventDefault();
      const name = new FormData(e.target).get("name").trim();
      if (!name) return;
      const prof = pickerToProfile();
      docResult = null; picker = {};
      commit({ ...state, products: [...state.products, { id: uid("p"), name, ...prof }] }, `${name} added to products`);
    });
  },
  report() {
    on("[data-print]", "click", () => window.print());
    on("[data-json]", "click", () => {
      const blob = new Blob([JSON.stringify(buildReport(state), null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `savorcline-report-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
  },
};

$("[data-reset]").addEventListener("click", () => {
  if (!state.sample && !confirm("Replace your workspace with the sample bakery data?")) return;
  state = sampleState(); undo = null; editingProduct = null; picker = {}; docResult = null; save(); render(); toast("Sample data loaded");
});
$("[data-clear]").addEventListener("click", () => {
  if (!confirm("Clear all products, lines, runs and cleaning records from this browser?")) return;
  state = { sample: false, site: "My site", lines: [{ id: "L1", name: "Line 1" }], products: [], runs: [], cleans: [] };
  undo = null; editingProduct = null; picker = {}; docResult = null; save(); render(); toast("Workspace cleared");
});

window.addEventListener("hashchange", () => {
  if (current() !== "products") { editingProduct = null; }
  if (current() !== "products" && current() !== "documents") picker = {};
  render();
  view.focus({ preventScroll: true });
  window.scrollTo({ top: 0 });
});
render();
document.title = `Live demo | ${business.name}`;
