# Website Update 2.6

This pass separates the public product website from the operator console.

## Added

- `index.html` is now a client-facing landing page.
- `app.html` now contains the full evaluator/operator app that previously lived at the root.
- `/app` and `/launch` Netlify redirects open the operator app.
- `assets/skaixu-mark.svg` provides a reusable product mark.
- `site.webmanifest` starts the installed experience inside `app.html`.
- `robots.txt`, `sitemap.xml`, and `ai.md` support discovery.
- Smoke checks now verify the website files and app split.
- Playwright proof runner now checks the landing page first, then the app console.

## Validation

Commands run during packaging:

```bash
npm test
npm run platform:etl
npm run closure:proof
npm run build:proof
npm run test:browser
```

Results:

- `npm test` passed.
- `platform:etl` generated platform data.
- `closure:proof` passed.
- `build:proof` passed.
- `test:browser` wrote an honest skipped receipt because Playwright is not installed in this execution environment.
