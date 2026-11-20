// The 14 allergens recognised under UK/EU food information law, with ingredient synonyms
// used by the rule-based document extractor.
export const ALLERGENS = [
  { id: "gluten", label: "Cereals (gluten)", short: "Gl", color: "#C8892B", terms: ["wheat", "barley", "rye", "oats", "oat", "spelt", "kamut", "khorasan", "semolina", "durum", "gluten", "malt", "bulgur", "couscous", "farro", "triticale"] },
  { id: "crustaceans", label: "Crustaceans", short: "Cr", color: "#D65A3F", terms: ["crustacean", "prawn", "shrimp", "crab", "lobster", "langoustine", "crayfish"] },
  { id: "eggs", label: "Eggs", short: "Eg", color: "#E3B505", terms: ["egg", "eggs", "albumen", "albumin", "ovalbumin", "lysozyme", "meringue", "mayonnaise"] },
  { id: "fish", label: "Fish", short: "Fi", color: "#3C7FA8", terms: ["fish", "anchovy", "anchovies", "cod", "salmon", "tuna", "haddock", "fish sauce"] },
  { id: "peanuts", label: "Peanuts", short: "Pn", color: "#9A5B2E", terms: ["peanut", "peanuts", "groundnut", "groundnuts", "arachis"] },
  { id: "soya", label: "Soya", short: "So", color: "#7A9A3A", terms: ["soya", "soy", "soybean", "soybeans", "edamame", "tofu", "miso", "tempeh", "soy lecithin", "soya lecithin"] },
  { id: "milk", label: "Milk", short: "Mk", color: "#6C8EBF", terms: ["milk", "whey", "casein", "caseinate", "butter", "cream", "cheese", "lactose", "yoghurt", "yogurt", "ghee", "buttermilk", "skimmed milk powder"] },
  { id: "nuts", label: "Tree nuts", short: "Nu", color: "#8B4A3C", terms: ["almond", "almonds", "hazelnut", "hazelnuts", "walnut", "walnuts", "cashew", "cashews", "pecan", "pecans", "pistachio", "pistachios", "macadamia", "brazil nut", "brazil nuts", "praline", "marzipan", "frangipane"] },
  { id: "celery", label: "Celery", short: "Ce", color: "#5FA36A", terms: ["celery", "celeriac"] },
  { id: "mustard", label: "Mustard", short: "Mu", color: "#C9A227", terms: ["mustard"] },
  { id: "sesame", label: "Sesame", short: "Se", color: "#B08D57", terms: ["sesame", "tahini", "gomasio"] },
  { id: "sulphites", label: "Sulphites", short: "Su", color: "#8E6BAF", terms: ["sulphite", "sulphites", "sulfite", "sulfites", "sulphur dioxide", "sulfur dioxide", "metabisulphite", "e220", "e221", "e222", "e223", "e224", "e226", "e227", "e228"] },
  { id: "lupin", label: "Lupin", short: "Lu", color: "#B5739D", terms: ["lupin", "lupine"] },
  { id: "molluscs", label: "Molluscs", short: "Mo", color: "#4E8F8B", terms: ["mollusc", "molluscs", "mussel", "mussels", "oyster", "oysters", "squid", "octopus", "scallop", "scallops", "clam", "clams", "snail"] },
];

export const ALLERGEN_BY_ID = Object.fromEntries(ALLERGENS.map((a) => [a.id, a]));

// Terms that look like allergens but are not (avoid false positives).
const EXCLUSIONS = [/buckwheat/g, /coconut milk/g, /cocoa butter/g, /shea butter/g, /nutmeg/g, /peanut[- ]free/g, /milk[- ]free/g, /gluten[- ]free/g, /egg[- ]free/g, /nut[- ]free/g, /butternut/g, /coconut/g];

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Rule-based extraction from pasted ingredient / specification text.
// Returns { contains: [{id, matches:[]}], mayContain: [{id, matches:[]}] }.
export function extractAllergens(text) {
  const lower = ` ${String(text || "").toLowerCase()} `;
  // Split out precautionary statements ("may contain ...", "made in a factory that handles ...").
  const pal = /(may contain[^.\n]*|made (?:in|on) [^.\n]*(?:handles|uses|also)[^.\n]*|produced (?:in|on) [^.\n]*(?:handles|uses|also)[^.\n]*|not suitable for[^.\n]*allerg[^.\n]*)/g;
  const palText = (lower.match(pal) || []).join(" ");
  const mainText = lower.replace(pal, " ");

  const scan = (t) => {
    let s = t;
    for (const ex of EXCLUSIONS) s = s.replace(ex, " ");
    const found = [];
    for (const a of ALLERGENS) {
      const matches = [];
      for (const term of a.terms) {
        const re = new RegExp(`(^|[^a-z])${escapeRe(term)}(?=[^a-z]|$)`, "g");
        if (re.test(s)) matches.push(term);
      }
      // Generic "nuts" (word boundary means "peanuts" / "groundnuts" don't match).
      if (a.id === "nuts" && /\bnuts?\b/.test(s)) matches.push("nuts");
      if (matches.length) found.push({ id: a.id, matches: [...new Set(matches)] });
    }
    return found;
  };

  const contains = scan(mainText);
  const containsIds = new Set(contains.map((c) => c.id));
  const mayContain = scan(palText).filter((m) => !containsIds.has(m.id));
  return { contains, mayContain };
}
