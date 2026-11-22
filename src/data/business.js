// SavorCline — canonical business record.
// Every page (website, demo workspace, application center, LinkedIn kit) reads from this file.
// Rule: `null` means "not supplied / unverified". Pages hide null public fields and the
// application center lists them as facts to confirm. Never replace a null with a guess.

export const business = {
  name: "SavorCline",
  tagline: "Preventing food safety risks before production begins.",
  shortTagline: "Allergen risk caught before the line starts.",

  // ---- Facts still to be supplied (shown in the application center checklist) ----
  domain: null,            // e.g. "savorcline.com" — not yet registered/confirmed
  email: null,             // official business email on the company domain
  headquarters: null,      // city, country
  linkedinUrl: null,       // only set once the company page actually exists
  proposedLinkedinSlug: "savorcline", // unverified; confirm while creating the page

  founders: [
    { name: "Fawaz Bello", title: "Founder & CEO", linkedin: null },
  ],

  // ---- Defaults (assumptions, NOT verified facts) ----
  assumptions: {
    foundingYear: 2026,
    companyType: "Privately Held",
    companySize: "2–10 employees",
    linkedinIndustry: "Software Development",
  },

  stage: {
    id: "ideating",
    awsLabel: "Ideating/building initial product",
    publicLabel: "Interactive preview",
    summary:
      "SavorCline is building its initial product. The rule-based risk engine and demo workspace on this site run in the browser on sample data; the AI document pipeline and AWS infrastructure are designed but not yet deployed.",
  },

  industry: "Food Manufacturing / Food Safety Compliance / AI-Powered SaaS",
  category: "Allergen risk management and production sequencing software",

  positioning:
    "SavorCline helps quality and production teams at food manufacturers find allergen cross-contamination risks in their production schedules before a shift starts. It checks each run against the allergen profile of the run before it and the cleaning that happened in between, flags unsafe changeovers and missing cleaning records, and suggests safer run orders for the QA team to approve.",

  problem: [
    "Undeclared allergens are one of the most common reasons for food product recalls.",
    "On shared lines, the risk sits in the changeover: a hazelnut product followed by a nut-free one needs a validated allergen clean in between.",
    "Allergen data is scattered across supplier specs, recipe sheets, schedules and paper cleaning logs, so checks are manual and happen under time pressure.",
    "When a schedule changes mid-week, nobody re-checks every downstream changeover.",
  ],

  beachhead: "Bakery and confectionery manufacturers",
  customers: [
    { name: "Bakery & confectionery", detail: "Wheat, milk, egg, nuts and sesame on shared ovens and depositors, with frequent changeovers.", primary: true },
    { name: "Dairy processing", detail: "Milk-based runs alongside plant-based or inclusion products that add nuts, soya or gluten." },
    { name: "Packaged & ready meals", detail: "Many SKUs, many sub-ingredients, many supplier specifications to keep current." },
    { name: "Meat processing", detail: "Marinades, coatings and fillers that bring mustard, celery, gluten and sulphites onto the line." },
    { name: "Food safety & QA consultants", detail: "Review allergen controls across several client sites from one workspace." },
  ],
  decisionMakers: ["Technical / Quality Manager", "Food Safety (HACCP) Team Lead", "Production Planner", "Operations Director"],

  // Feature classification: implemented | prototype | planned
  // "implemented" = working code in this repository. "prototype" = works in the demo on sample data,
  // using simplified methods. "planned" = roadmap only.
  features: [
    {
      id: "risk",
      name: "Allergen risk detection",
      status: "implemented",
      what: "Checks every changeover on every line: which allergens the previous run leaves behind that the next product does not declare.",
      benefit: "Unsafe sequences are visible before the shift, not after a swab fails.",
      note: "Rule-based engine in this repository. AI-assisted risk explanation via Amazon Bedrock is planned.",
    },
    {
      id: "sequence",
      name: "Safer production sequencing",
      status: "implemented",
      what: "Suggests a run order per line that needs the fewest allergen cleans, for the planner and QA team to review and approve.",
      benefit: "Fewer full wet cleans, fewer risky changeovers, same products.",
      note: "Exhaustive search for up to 8 runs per line, greedy ordering above that.",
    },
    {
      id: "cleaning",
      name: "Cleaning verification",
      status: "implemented",
      what: "Matches cleaning records to the changeovers that need them and flags missing sign-offs, wrong clean types and absent swab results.",
      benefit: "Documentation gaps surface on the day, not at audit.",
      note: "",
    },
    {
      id: "docs",
      name: "Document intelligence",
      status: "prototype",
      what: "Reads ingredient lists and supplier specifications and maps ingredients such as whey, casein or spelt to the allergen they contain.",
      benefit: "Allergen profiles built from source documents instead of retyped by hand.",
      note: "Demo uses keyword and synonym matching on pasted text. Amazon Textract + Amazon Bedrock extraction is planned.",
    },
    {
      id: "report",
      name: "Compliance reporting",
      status: "implemented",
      what: "Produces a dated allergen-risk report for a schedule: findings, required cleans, cleaning gaps and a sign-off block.",
      benefit: "Traceable evidence for internal review and audits.",
      note: "Print / save-as-PDF and JSON export from the browser.",
    },
  ],

  allergenFramework:
    "The demo uses the 14 allergens recognised under UK and EU food information law. The list is configurable for other markets.",

  // AWS infrastructure classification: deployed | in-progress | proposed
  aws: [
    { service: "Amazon Textract", role: "Extract text and tables from supplier specifications and labels.", status: "proposed" },
    { service: "Amazon Bedrock", role: "Interpret extracted text into allergen profiles; explain risk findings in plain language.", status: "proposed" },
    { service: "Amazon S3", role: "Encrypted storage for uploaded specifications, schedules and cleaning records.", status: "proposed" },
    { service: "AWS Lambda", role: "Document processing, risk evaluation and report generation.", status: "proposed" },
    { service: "AWS Step Functions", role: "Orchestrate the upload → extract → interpret → assess pipeline.", status: "proposed" },
    { service: "Amazon DynamoDB", role: "Ingredient profiles, allergen records, schedules and findings per tenant.", status: "proposed" },
    { service: "Amazon API Gateway", role: "Authenticated API for the web app and future integrations.", status: "proposed" },
    { service: "Amazon Cognito", role: "User sign-in and per-site roles (planner, QA, auditor).", status: "proposed" },
    { service: "AWS KMS", role: "Per-tenant encryption keys for commercially sensitive supplier data.", status: "proposed" },
  ],
  deployedInfrastructure: "None yet. This site and its demo are static files; no AWS services are deployed.",

  roadmap: [
    { phase: "Now", items: ["Rule-based risk engine, sequencing and cleaning checks (in this repository)", "Interactive demo workspace on sample data"] },
    { phase: "Next", items: ["Document upload with Amazon Textract", "Bedrock-assisted allergen extraction with human review", "Multi-user workspaces with Amazon Cognito"] },
    { phase: "Later", items: ["Pilot with bakery and confectionery manufacturers", "ERP / MES schedule import", "Audit pack templates for BRCGS and SQF sites"] },
  ],

  differentiation: [
    "Focused on the changeover, where cross-contact actually happens, rather than generic document storage.",
    "Starts from documents the site already has — no factory hardware or MES integration required.",
    "Decision support, not autopilot: every suggested sequence and every AI-extracted allergen is reviewed by a person.",
  ],
};

export const STATUS_LABEL = {
  implemented: "Available in demo",
  prototype: "Preview",
  planned: "Planned",
  deployed: "Deployed",
  "in-progress": "In progress",
  proposed: "Proposed",
};

// Facts the application center must ask the founder to confirm.
export function missingFacts(b = business) {
  const out = [];
  if (!b.domain) out.push({ field: "Domain / website URL", why: "Required by AWS Activate and LinkedIn. Also needed for canonical URLs, sitemap and email." });
  if (!b.email) out.push({ field: "Official business email", why: "Should be on the company domain. Enables the contact form on the website." });
  if (!b.founders.length) out.push({ field: "Founder name, title and LinkedIn", why: "AWS reviewers assess the team. The Team section stays hidden until this is filled in." });
  for (const f of b.founders.filter((f) => !f.linkedin)) out.push({ field: `LinkedIn profile for ${f.name}`, why: "AWS reviewers look at founder profiles. Add the URL and the Team card links to it automatically." });
  if (b.founders.some((f) => f.title === "Founder")) out.push({ field: "Founder job title", why: "Shown as “Founder” for now. Confirm, or change it (e.g. Founder & CEO) in business.js." });
  if (!b.headquarters) out.push({ field: "Headquarters (city, country)", why: "Needed for LinkedIn and AWS Activate, and to confirm which allergen regulations to lead with." });
  if (!b.linkedinUrl) out.push({ field: "LinkedIn company page", why: `Not created yet. Proposed slug /company/${b.proposedLinkedinSlug} is unverified.` });
  out.push({ field: `Founding year (assumed ${b.assumptions.foundingYear})`, why: "Default assumption. Confirm against company registration." });
  out.push({ field: `Team size (assumed ${b.assumptions.companySize})`, why: "Default LinkedIn bracket. Confirm actual headcount." });
  out.push({ field: "Company registration / legal entity", why: "AWS Activate requires a registered business; confirm entity name and number." });
  out.push({ field: "AWS Activate pathway", why: "Activate Portfolio needs an Organizational ID from an Activate Provider (accelerator, VC, incubator). Without one, apply via Activate Founders. Check current eligibility on the AWS site." });
  out.push({ field: "Trademark check for “SavorCline”", why: "“Cline” is an existing AI software brand. Run a UKIPO / USPTO / EUIPO search before investing in branding." });
  return out;
}
