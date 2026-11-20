// SavorCline rule-based allergen risk engine.
// Pure functions, no DOM — used by the demo workspace and the Node test suite.
//
// Data model
//   product: { id, name, allergens: string[], mayContain: string[] }
//   line:    { id, name }
//   run:     { id, line, productId, start: ISO, end: ISO }
//   clean:   { id, line, time: ISO, type: "allergen-wet" | "dry" | "sanitise", verifiedBy: string|null, swab: "pass"|"fail"|null }

export const CLEAN_TYPES = {
  "allergen-wet": "Validated allergen wet clean",
  dry: "Dry clean (brush / vacuum)",
  sanitise: "Sanitise only",
};

const t = (iso) => new Date(iso).getTime();

export function carryOver(prev, next) {
  if (!prev || !next) return [];
  const declared = new Set(next.allergens);
  return prev.allergens.filter((a) => !declared.has(a));
}

function byStart(a, b) {
  return t(a.start) - t(b.start);
}

export function runsForLine(state, lineId) {
  return state.runs.filter((r) => r.line === lineId).sort(byStart);
}

// Assess every changeover on every line.
export function assessSchedule(state) {
  const productById = Object.fromEntries(state.products.map((p) => [p.id, p]));
  const findings = [];
  const usedCleans = new Set();

  for (const line of state.lines) {
    const runs = runsForLine(state, line.id);
    for (let i = 1; i < runs.length; i++) {
      const a = runs[i - 1];
      const b = runs[i];
      const pa = productById[a.productId];
      const pb = productById[b.productId];
      if (!pa || !pb) continue;
      const carry = carryOver(pa, pb);
      const cleans = state.cleans
        .filter((c) => c.line === line.id && t(c.time) >= t(a.end) && t(c.time) <= t(b.start))
        .sort((x, y) => t(x.time) - t(y.time));
      cleans.forEach((c) => usedCleans.add(c.id));

      const base = { lineId: line.id, lineName: line.name, fromRun: a.id, toRun: b.id, from: pa.name, to: pb.name, at: b.start, carry, cleanIds: cleans.map((c) => c.id) };

      if (!carry.length) {
        findings.push({ ...base, severity: "none", title: "No allergen carry-over", detail: `${pb.name} declares every allergen present in ${pa.name}.` });
        continue;
      }

      const wet = cleans.filter((c) => c.type === "allergen-wet");
      const failed = wet.find((c) => c.swab === "fail");
      const verified = wet.find((c) => c.verifiedBy && c.swab === "pass");
      const unverified = wet.find((c) => !(c.verifiedBy && c.swab === "pass") && c.swab !== "fail");
      const pal = carry.filter((x) => pb.mayContain.includes(x));
      const palNote = pal.length ? ` ${pb.name} carries a precautionary label for ${pal.join(", ")}; a "may contain" label does not replace a validated clean.` : "";

      let severity, title, detail;
      if (failed && !verified) {
        severity = "high";
        title = "Allergen swab failed";
        detail = `The allergen clean before ${pb.name} has a failed swab result. Re-clean and re-swab before release.`;
      } else if (verified) {
        severity = "low";
        title = "Controlled by validated clean";
        detail = `Validated allergen clean signed off by ${verified.verifiedBy} with a passing swab.`;
      } else if (unverified) {
        severity = "medium";
        const missing = [!unverified.verifiedBy && "sign-off", unverified.swab !== "pass" && "swab result"].filter(Boolean).join(" and ");
        title = "Clean recorded, verification incomplete";
        detail = `An allergen wet clean is logged but is missing ${missing}.`;
      } else if (cleans.length) {
        severity = "high";
        title = "Clean type not adequate";
        detail = `Only ${cleans.map((c) => CLEAN_TYPES[c.type].toLowerCase()).join(", ")} recorded. Removing ${carry.join(", ")} needs a validated allergen wet clean.`;
      } else {
        severity = "high";
        title = "No clean between runs";
        detail = `${pa.name} leaves ${carry.join(", ")} on the line and no cleaning record exists before ${pb.name}.`;
      }
      findings.push({ ...base, severity, title, detail: detail + palNote });
    }
  }

  return { findings, usedCleans, summary: summarise(findings) };
}

export function summarise(findings) {
  const s = { high: 0, medium: 0, low: 0, none: 0, changeovers: findings.length, cleansRequired: 0 };
  for (const f of findings) {
    s[f.severity]++;
    if (f.carry.length) s.cleansRequired++;
  }
  return s;
}

// Cleaning-record verification, independent of the schedule logic.
export function verifyCleaning(state) {
  const { usedCleans } = assessSchedule(state);
  const lineName = Object.fromEntries(state.lines.map((l) => [l.id, l.name]));
  const gaps = [];
  for (const c of state.cleans) {
    const issues = [];
    if (!c.verifiedBy) issues.push("No sign-off recorded");
    if (c.type === "allergen-wet" && !c.swab) issues.push("No allergen swab / ATP result");
    if (c.swab === "fail") issues.push("Swab failed — corrective action required");
    if (!usedCleans.has(c.id)) issues.push("Not linked to a changeover in this schedule");
    gaps.push({ clean: c, line: lineName[c.line] || c.line, issues, ok: issues.length === 0 });
  }
  return gaps;
}

// ---- Sequencing ----------------------------------------------------------

function orderCost(order) {
  let cleans = 0;
  let carried = 0;
  for (let i = 1; i < order.length; i++) {
    const c = carryOver(order[i - 1], order[i]);
    if (c.length) cleans++;
    carried += c.length;
  }
  return { cleans, carried };
}

function better(a, b) {
  return a.cleans !== b.cleans ? a.cleans < b.cleans : a.carried < b.carried;
}

function permutations(arr) {
  if (arr.length <= 1) return [arr.slice()];
  const out = [];
  arr.forEach((x, i) => {
    const rest = arr.slice(0, i).concat(arr.slice(i + 1));
    for (const p of permutations(rest)) out.push([x, ...p]);
  });
  return out;
}

function greedy(products) {
  const left = products.slice().sort((a, b) => a.allergens.length - b.allergens.length);
  const order = [left.shift()];
  while (left.length) {
    const prev = order[order.length - 1];
    left.sort((x, y) => {
      const cx = carryOver(prev, x).length, cy = carryOver(prev, y).length;
      return cx !== cy ? cx - cy : x.allergens.length - y.allergens.length;
    });
    order.push(left.shift());
  }
  return order;
}

// Re-order products on one line into the existing time slots so the fewest allergen cleans are needed.
export function optimiseLine(state, lineId) {
  const productById = Object.fromEntries(state.products.map((p) => [p.id, p]));
  const runs = runsForLine(state, lineId);
  const items = runs.map((r) => ({ ...productById[r.productId], runId: r.id }));
  const before = orderCost(items);
  let best = items;
  let bestCost = before;
  if (items.length <= 8) {
    for (const p of permutations(items)) {
      const c = orderCost(p);
      if (better(c, bestCost)) { best = p; bestCost = c; }
    }
  } else {
    const g = greedy(items);
    const c = orderCost(g);
    if (better(c, bestCost)) { best = g; bestCost = c; }
  }
  const slots = runs.map((r) => ({ start: r.start, end: r.end }));
  const proposal = best.map((p, i) => ({ id: p.runId, line: lineId, productId: p.id, ...slots[i] }));
  return { before, after: bestCost, proposal, changed: best.some((p, i) => p.runId !== runs[i].id) };
}

export function applyProposal(state, lineId, proposal) {
  return { ...state, runs: state.runs.filter((r) => r.line !== lineId).concat(proposal) };
}

// ---- Reporting -----------------------------------------------------------

export function buildReport(state, now = new Date()) {
  const { findings, summary } = assessSchedule(state);
  const cleaning = verifyCleaning(state);
  return {
    generatedAt: now.toISOString(),
    site: state.site,
    dataNotice: state.sample ? "Generated from fictional sample data in the SavorCline demo workspace." : "Generated from user-entered data in the SavorCline demo workspace.",
    summary,
    findings: findings.filter((f) => f.severity !== "none"),
    cleaningGaps: cleaning.filter((g) => !g.ok).map((g) => ({ id: g.clean.id, line: g.line, time: g.clean.time, type: g.clean.type, issues: g.issues })),
    lines: state.lines.map((l) => ({ name: l.name, runs: runsForLine(state, l.id).map((r) => ({ product: state.products.find((p) => p.id === r.productId)?.name, start: r.start, end: r.end })) })),
  };
}
