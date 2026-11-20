// Fictional sample data for the demo workspace. Not a real customer.
export function sampleState() {
  const d = "2026-11-23";
  const at = (h) => `${d}T${h}:00`;
  return {
    sample: true,
    site: "Northfield Bakehouse — fictional sample site",
    lines: [
      { id: "L1", name: "Line 1 · Oven & depositor" },
      { id: "L2", name: "Line 2 · Enrober" },
    ],
    products: [
      { id: "p1", name: "Plain white loaf", allergens: ["gluten"], mayContain: [] },
      { id: "p2", name: "Seeded sourdough", allergens: ["gluten", "sesame"], mayContain: [] },
      { id: "p3", name: "Butter croissant", allergens: ["gluten", "milk", "eggs"], mayContain: [] },
      { id: "p4", name: "Hazelnut praline brownie", allergens: ["gluten", "milk", "eggs", "nuts", "soya"], mayContain: [] },
      { id: "p5", name: "Vegan oat-free cookie", allergens: ["soya"], mayContain: [] },
      { id: "p6", name: "Milk chocolate flapjack", allergens: ["gluten", "milk", "soya"], mayContain: [] },
      { id: "p7", name: "Almond frangipane tart", allergens: ["gluten", "milk", "eggs", "nuts"], mayContain: [] },
      { id: "p8", name: "Dark chocolate bar", allergens: ["soya"], mayContain: ["milk"] },
    ],
    runs: [
      { id: "r1", line: "L1", productId: "p4", start: at("06:00"), end: at("07:30") },
      { id: "r2", line: "L1", productId: "p1", start: at("08:00"), end: at("09:30") },
      { id: "r3", line: "L1", productId: "p3", start: at("10:00"), end: at("11:30") },
      { id: "r4", line: "L1", productId: "p2", start: at("12:00"), end: at("13:30") },
      { id: "r5", line: "L1", productId: "p7", start: at("14:00"), end: at("15:30") },
      { id: "r6", line: "L2", productId: "p6", start: at("06:00"), end: at("07:30") },
      { id: "r7", line: "L2", productId: "p8", start: at("08:00"), end: at("09:30") },
      { id: "r8", line: "L2", productId: "p5", start: at("10:00"), end: at("11:30") },
    ],
    cleans: [
      { id: "c1", line: "L1", time: at("07:35"), type: "allergen-wet", verifiedBy: "QA lead (sample)", swab: "pass" },
      { id: "c2", line: "L1", time: at("11:35"), type: "dry", verifiedBy: "Line operator (sample)", swab: null },
      { id: "c3", line: "L1", time: at("13:35"), type: "allergen-wet", verifiedBy: "Line operator (sample)", swab: null },
      { id: "c4", line: "L2", time: at("07:40"), type: "sanitise", verifiedBy: "QA lead (sample)", swab: null },
      { id: "c5", line: "L2", time: at("15:00"), type: "allergen-wet", verifiedBy: null, swab: "pass" },
    ],
  };
}

export const SAMPLE_SPEC = `PRODUCT SPECIFICATION — Hazelnut Praline Filling (sample supplier document)

Ingredients: Sugar, roasted HAZELNUTS (28%), vegetable oils (palm, sunflower), skimmed MILK powder, WHEY powder (MILK), cocoa butter, emulsifier: SOYA lecithin, natural vanilla flavouring.

Allergen statement: Contains hazelnuts, milk, soya.
May contain traces of almonds, peanuts and sesame. Made in a factory that also handles wheat.`;
