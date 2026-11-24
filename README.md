# SavorCline — website, demo workspace and application center

Static site with no build step and no dependencies. Requires Node 18+ only for the local server and tests.

```
npm run dev    # http://localhost:5173
npm test       # risk engine + business-record tests
```

## Pages

| Page | Purpose |
|---|---|
| `index.html` | Public website: hero, problem, features, how it works, solutions, technology, pricing (pilot), FAQ |
| `app.html` | Demo workspace: products & allergens, schedule, sequencing, cleaning records, document extraction, report |

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

Live on GitHub Pages: https://web-workss.github.io/savorcline/ (served from `main`, root folder).

**Vercel:** import the repo with framework preset "Other", no build command, root directory `./`. `vercel.json` already sets this, and `.vercelignore` keeps `package.json` out of the upload. The local preview server lives in `scripts/` so Vercel serves the folder as static files instead of trying to run a Node server. If a deploy shows unstyled black-on-white text, the CSS and JS files are not being served: check that the project's Root Directory is the repo root.

All links are relative, so the folder also works as-is on any static host (S3 + CloudFront, Amplify Hosting, Netlify) at a domain root or a sub-path.
