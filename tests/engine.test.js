import test from "node:test";
import assert from "node:assert/strict";
import { assessSchedule, optimiseLine, verifyCleaning, applyProposal, buildReport, carryOver } from "../src/engine/risk.js";
import { extractAllergens } from "../src/engine/allergens.js";
import { sampleState, SAMPLE_SPEC } from "../src/data/sample.js";
import { business } from "../src/data/business.js";

const sev = (f) => f.map((x) => `${x.from}>${x.to}:${x.severity}`);

test("carry-over is previous allergens not declared by next", () => {
  assert.deepEqual(carryOver({ allergens: ["gluten", "nuts"] }, { allergens: ["gluten"] }), ["nuts"]);
  assert.deepEqual(carryOver({ allergens: ["gluten"] }, { allergens: ["gluten", "nuts"] }), []);
});

test("sample schedule findings", () => {
  const { findings, summary } = assessSchedule(sampleState());
  assert.deepEqual(sev(findings), [
    "Hazelnut praline brownie>Plain white loaf:low",
    "Plain white loaf>Butter croissant:none",
    "Butter croissant>Seeded sourdough:high",
    "Seeded sourdough>Almond frangipane tart:medium",
    "Milk chocolate flapjack>Dark chocolate bar:high",
    "Dark chocolate bar>Vegan oat-free cookie:none",
  ]);
  assert.equal(summary.high, 2);
  assert.match(findings[4].detail, /precautionary label for milk/);
});

test("no clean at all is high risk", () => {
  const s = sampleState();
  s.cleans = [];
  const f = assessSchedule(s).findings.find((x) => x.from === "Hazelnut praline brownie");
  assert.equal(f.severity, "high");
  assert.equal(f.title, "No clean between runs");
});

test("failed swab is high risk", () => {
  const s = sampleState();
  s.cleans[0].swab = "fail";
  assert.equal(assessSchedule(s).findings[0].severity, "high");
});

test("optimiser reduces cleans on line 1 and keeps time slots", () => {
  const s = sampleState();
  const r = optimiseLine(s, "L1");
  assert.equal(r.before.cleans, 3);
  assert.equal(r.after.cleans, 1);
  assert.ok(r.changed);
  const slots = s.runs.filter((x) => x.line === "L1").map((x) => x.start).sort();
  assert.deepEqual(r.proposal.map((x) => x.start).sort(), slots);
  const applied = applyProposal(s, "L1", r.proposal);
  assert.equal(applied.runs.length, s.runs.length);
});

test("cleaning verification flags gaps", () => {
  const gaps = verifyCleaning(sampleState());
  const c5 = gaps.find((g) => g.clean.id === "c5");
  assert.ok(c5.issues.includes("No sign-off recorded"));
  assert.ok(c5.issues.includes("Not linked to a changeover in this schedule"));
  assert.ok(gaps.find((g) => g.clean.id === "c1").ok);
  assert.ok(gaps.find((g) => g.clean.id === "c3").issues.includes("No allergen swab / ATP result"));
});

test("document extraction separates contains and may-contain", () => {
  const r = extractAllergens(SAMPLE_SPEC);
  assert.deepEqual(r.contains.map((x) => x.id).sort(), ["milk", "nuts", "soya"]);
  assert.deepEqual(r.mayContain.map((x) => x.id).sort(), ["gluten", "peanuts", "sesame"]);
});

test("extraction avoids common false positives", () => {
  const r = extractAllergens("Buckwheat flour, coconut milk, cocoa butter, nutmeg, butternut squash. Gluten-free.");
  assert.deepEqual(r.contains, []);
});

test("report excludes no-risk changeovers", () => {
  const r = buildReport(sampleState(), new Date("2026-11-20T00:00:00Z"));
  assert.equal(r.findings.length, 4);
  assert.match(r.dataNotice, /fictional sample data/);
});

test("business record stays honest", () => {
  assert.equal(business.stage.awsLabel, "Ideating/building initial product");
  assert.ok(business.aws.every((a) => a.status !== "deployed"), "no AWS service may be marked deployed without evidence");
});
