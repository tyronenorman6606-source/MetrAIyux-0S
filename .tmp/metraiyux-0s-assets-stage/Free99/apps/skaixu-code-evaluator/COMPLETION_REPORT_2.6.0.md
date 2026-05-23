# skAIxu Code Evaluator Platform 2.6.0 Website Update

## Status

Website update completed and packaged.

## Implemented

- Replaced root `index.html` with a polished public landing website.
- Preserved the full operator console as `app.html`.
- Added app launch routes through Netlify redirects: `/app` and `/launch`.
- Added product mark SVG under `assets/skaixu-mark.svg`.
- Added web app manifest with `start_url` pointed at `/app.html`.
- Added `robots.txt`, `sitemap.xml`, and refreshed `ai.md`.
- Updated smoke checks so the app is validated from `app.html` while the landing page is validated separately.
- Updated browser-proof script to check the landing page and then the operator app.
- Updated closure orchestrator scans to include both the public website and app console.
- Updated README and package metadata for the website/app split.

## Proof commands run

```bash
npm test
npm run platform:etl
npm run closure:proof
npm run build:proof
npm run test:browser
```

## Results

- `npm test`: passed.
- `platform:etl`: completed; generated data in `generated/platform-data`.
- `closure:proof`: passed; receipt written in `generated/closure-receipts`.
- `build:proof`: passed; receipt written in `generated/build-receipts`.
- `test:browser`: skipped honestly because Playwright is not installed in this container; receipt written in `proof/browser/playwright-proof.json`.

## Remaining honest limitation

The website is upgraded, but browser E2E remains environment-gated until Playwright is installed and run in a browser-capable runtime.
