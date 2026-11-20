# SavorCline — website, demo workspace and application center

Static site with no build step and no dependencies. Requires Node 18+ only for the local server and tests.

```
npm start      # http://localhost:5173
npm test       # risk engine + business-record tests
```

## Pages

| Page | Purpose |
|---|---|
| `index.html` | Public website: hero, problem, features, how it works, solutions, technology, pricing (pilot), FAQ |
| `app.html` | Demo workspace: products & allergens, schedule, sequencing, cleaning records, document extraction, report |
| `center.html` | **Internal** application center: AWS Activate answers, LinkedIn kit, facts to confirm. `noindex`, not linked publicly, disallowed in `robots.txt` |

## Single source of truth

`src/data/business.js` holds every business fact. `null` means not supplied. Public pages hide anything null; the application center lists it as a fact to confirm. To fill in the details that are still missing, edit only that file:

- `domain`, `email`, `headquarters`, `linkedinUrl`
- `founders: [{ name, title, linkedin }]`. The Team section and nav link appear automatically.
- Setting `email` adds a Contact nav item and mailto CTAs.

Once the domain is confirmed, also add `<link rel="canonical">` and `og:url` to the HTML heads, a `sitemap.xml`, and the `Sitemap:` line in `robots.txt`.

## What is real (feature classification)

| Capability | Status | Where |
|---|---|---|
| Allergen risk detection (changeover carry-over vs cleaning records) | Implemented | `src/engine/risk.js` |
| Safer sequencing (exhaustive ≤ 8 runs/line, greedy above) | Implemented | `src/engine/risk.js` |
| Cleaning verification | Implemented | `src/engine/risk.js` |
| Compliance report (print/PDF, JSON) | Implemented | `src/ui/app.js` |
| Document intelligence | Prototype: keyword/synonym matching | `src/engine/allergens.js` |
| Textract / Bedrock pipeline, AWS backend, auth | Proposed | `business.aws` |

Everything runs in the browser. Workspace data lives in `localStorage` only. No AWS service is deployed, so the site never says "Built on AWS".

## Deploying

Upload the folder as-is to any static host (S3 + CloudFront, Amplify Hosting, Netlify, etc.). Exclude `tests/`, `server.js` and `.claude/`. The site uses root-relative paths (`/src/...`), so serve it from the domain root.
