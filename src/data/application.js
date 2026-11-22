// AWS Activate answers and LinkedIn kit, derived from business.js only.
import { business as b, STATUS_LABEL } from "./business.js";

const list = (xs) => xs.slice(0, -1).join(", ") + (xs.length > 1 ? " and " : "") + xs[xs.length - 1];
const proposed = b.aws.filter((a) => a.status === "proposed").map((a) => a.service);
const deployed = b.aws.filter((a) => a.status === "deployed").map((a) => a.service);
const byStatus = (s) => b.features.filter((f) => f.status === s).map((f) => f.name.toLowerCase());

export function activateAnswers() {
  return [
    { q: "Company name", a: b.name },
    { q: "Company website", a: b.domain ? `https://www.${b.domain}` : null },
    { q: "Business email", a: b.email },
    { q: "Company LinkedIn page", a: b.linkedinUrl },
    { q: "Founder(s)", a: b.founders.length ? b.founders.map((f) => `${f.name}, ${f.title}${f.linkedin ? ` (${f.linkedin})` : ""}`).join("; ") : null },
    { q: "Product stage", a: b.stage.awsLabel },
    { q: "Industry", a: "Food & beverage manufacturing / B2B software (choose the closest option offered in the form)" },
    {
      q: "Company / product description",
      a: `${b.name} is a pre-launch B2B SaaS platform that helps food manufacturers prevent allergen cross-contamination before production begins. It checks every changeover in a production schedule against the allergens the previous run leaves on the line and the cleaning recorded in between, flags unsafe sequences and missing cleaning records, and suggests safer run orders for the quality team to approve. Our first focus is ${b.beachhead.toLowerCase()}, where shared lines and frequent changeovers create the highest allergen risk.`,
    },
    {
      q: "What problem are you solving?",
      a: "Undeclared allergens are one of the most common causes of food recalls. On shared production lines, the risk sits in the changeover between products, but the information needed to judge it â€” supplier specifications, recipe allergen profiles, schedules and cleaning logs â€” is scattered across documents and checked by hand under time pressure. When a schedule changes, downstream changeovers are rarely re-checked.",
    },
    {
      q: "Current product status (be specific)",
      a: `We have built a working rule-based risk engine with an automated test suite and an interactive demo workspace on our website. It covers ${list(byStatus("implemented"))}, running in the browser on sample data or data a user enters. Document intelligence is at preview stage using rule-based ingredient matching. We have no paying customers yet. ${deployed.length ? `Deployed on AWS: ${list(deployed)}.` : "No AWS infrastructure is deployed yet."}`,
    },
    {
      q: "How will you use AWS credits?",
      a: `To move from the browser prototype to a multi-tenant platform: Amazon Textract to read uploaded supplier specifications; Amazon Bedrock to interpret extracted text into allergen profiles and explain risk findings, with human confirmation before use; AWS Lambda and AWS Step Functions for the document and assessment pipeline; Amazon DynamoDB for ingredient profiles, schedules and findings; Amazon S3 with AWS KMS for encrypted document storage; Amazon API Gateway and Amazon Cognito for authenticated access. Credits would fund development, testing and a pilot with ${b.beachhead.toLowerCase()}.`,
    },
    { q: "Target customers", a: `${b.customers.map((c) => c.name).join("; ")}. Buyers: ${b.decisionMakers.join(", ")}.` },
    { q: "What makes you different?", a: b.differentiation.join(" ") },
  ];
}

export function linkedinKit() {
  const about = `${b.name} helps food manufacturers catch allergen cross-contamination risks in their production schedules before production begins.

We check every changeover on a shared line against the allergens the previous run leaves behind and the cleaning recorded in between. Quality teams see unsafe sequences, missing cleaning records and a safer run order before the shift starts, then approve the changes and keep a dated report for audit.

What we're building:
â€¢ Allergen risk detection across production sequences
â€¢ Safer production sequencing with fewer allergen cleans
â€¢ Cleaning record verification
â€¢ Allergen extraction from ingredient specifications and supplier documents
â€¢ Traceable allergen-risk reports

We're starting with bakery and confectionery manufacturers, where shared ovens and frequent changeovers make allergen control hardest. SavorCline is decision support for HACCP teams, not a replacement for them.

We are currently building our initial product. Try the interactive demo on our website.`;
  return {
    name: b.name,
    url: b.linkedinUrl || `linkedin.com/company/${b.proposedLinkedinSlug} (proposed â€” confirm availability when creating the page)`,
    website: b.domain ? `https://www.${b.domain}` : null,
    tagline: "Allergen risk checks for food production schedules â€” caught before the line starts.",
    taglineLimit: 120,
    about,
    aboutLimit: 2000,
    industry: `${b.assumptions.linkedinIndustry} (alternative: Food and Beverage Manufacturing)`,
    size: `${b.assumptions.companySize} (assumption â€” confirm)`,
    type: b.assumptions.companyType,
    founded: `${b.assumptions.foundingYear} (assumption â€” confirm)`,
    headquarters: b.headquarters,
    specialties: ["Allergen management", "Food safety", "Allergen cross-contamination", "Production scheduling", "HACCP", "Cleaning verification", "Food manufacturing software", "Compliance reporting"],
    firstPost: `We're building ${b.name} to answer one question for food manufacturers: is this week's production schedule safe for allergens?

Most allergen controls are set product by product. The risk shows up in the changeover â€” a hazelnut product at 06:00, a nut-free one at 08:00, and a cleaning record that may or may not say what happened in between.

${b.name} checks every changeover against allergen profiles and cleaning records, flags the risky ones, and suggests a safer order for the QA team to approve.

The interactive demo is live on our website with a fictional bakery's sample schedule. If you work in food safety, quality or production planning, we'd value your feedback.

#FoodSafety #AllergenManagement #FoodManufacturing #HACCP`,
  };
}

// Cross-checks that the public story and the application tell the same thing.
export function consistencyChecks() {
  const checks = [];
  const publicCopy = [b.stage.summary, b.positioning, ...b.features.flatMap((f) => [f.what, f.benefit, f.note])].join(" ");
  checks.push({ ok: deployed.length > 0 || !/built on aws|powered by amazon|running on aws/i.test(publicCopy), label: "No â€œBuilt on AWS / Powered by Bedrockâ€ claims while nothing is deployed" });
  checks.push({ ok: b.stage.id === "ideating" && b.stage.awsLabel === "Ideating/building initial product", label: "Website stage and AWS stage selection match (Ideating/building initial product)" });
  checks.push({ ok: b.features.every((f) => STATUS_LABEL[f.status]), label: "Every feature has an implemented / prototype / planned classification" });
  checks.push({ ok: !b.founders.length || b.founders.every((f) => f.name), label: "Team section only shows supplied people" });
  checks.push({ ok: !!b.domain, label: "Website domain recorded (needed for AWS Activate and LinkedIn)" });
  checks.push({ ok: !!b.linkedinUrl, label: "LinkedIn company page exists and is recorded" });
  checks.push({ ok: b.founders.length > 0, label: "Founder details recorded" });
  return checks;
}

export { proposed as proposedServices };
