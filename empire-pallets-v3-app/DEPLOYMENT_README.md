# Empire Pallets App Deployment Notes

Deployable folder:

```text
/workspaces/MetrAIyux-0S/empire-pallets-v3-app
```

## Required Pre-Deploy Checks

Run from the app folder while the app is served locally:

```bash
node tests/smoke.mjs
BASE_URL=http://127.0.0.1:4220 ARTIFACT_DIR=/workspaces/MetrAIyux-0S/test-artifacts/empire-pallets-v3-app/gated-intro-proof-final-2 node tests/final-proof.mjs
```

Run from repo root:

```bash
npm run mcp:mine -- /workspaces/MetrAIyux-0S/empire-pallets-v3-app
```

## Deployment Targets

This app is Netlify-ready because it includes:

- `netlify.toml`
- `_redirects`
- `manifest.webmanifest`
- `service-worker.js`
- Netlify form markup on `quote.html`

It is deployed on Cloudflare Pages at:

```text
https://empire-pallets-v3-app.pages.dev/
```

Production project:

```text
empire-pallets-v3-app
```

Current QR target:

```text
https://empire-pallets-v3-app.pages.dev/scan
```

Production proof:

```bash
BASE_URL=https://empire-pallets-v3-app.pages.dev ARTIFACT_DIR=/workspaces/MetrAIyux-0S/test-artifacts/empire-pallets-v3-app/live-proof node tests/final-proof.mjs
```

Latest production proof returned `ok: true`, `failures: []`, and 12 artifacts.

If a custom domain replaces this Pages URL, regenerate:

```text
assets/empire-pallets-scan-qr.svg
APP_PATH_MANIFEST.json -> finalQrTarget
sitemap.xml canonical URLs
```

## Private Preview

`/preview.html` is intentionally marked `noindex,nofollow` and disallowed in `robots.txt`.

The route remains accessible for direct client handoff and QR/private preview links.
