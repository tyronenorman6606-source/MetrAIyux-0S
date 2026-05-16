# Proof Recipes

Drop one JSON file per site in this folder.

Run a recipe:

```bash
npm run proof:record -- --config proof-recipes/name-of-site.json
```

Use `siteRoot` for a local static folder or `baseUrl` for a deployed site. Each `chapter` should open a real page and perform real browser-visible actions before saving proof frames.

The default example is:

```bash
npm run proof:record:metraiyux
```

That recipe records the MetrAIyux public proof path and outputs a captioned MP4 plus a JSON report under `test-artifacts/proof-recordings/metraiyux-public-proof/`.
