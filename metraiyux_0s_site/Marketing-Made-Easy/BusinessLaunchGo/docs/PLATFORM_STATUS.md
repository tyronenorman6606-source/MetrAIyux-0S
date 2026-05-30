# BusinessLaunchGo Platform Status

Updated: 2026-05-24

This folder is the canonical BusinessLaunchGo app surface. The working launch-pack generator now lives directly at `index.html`; the old docked shell pages and nested `app.html` entry were removed so the 0S mount opens the real workflow first.

## Included Surfaces

- Canonical app: `index.html`
- Local runtime contract: `runtime/local-runtime.mjs`
- Service worker: `sw.js`
- Manifest: `manifest.webmanifest`

## Runtime Proof

- Runtime contract: `src/runtime-contract.json`
- Smoke check: `smoke/businesslaunchgo-p1-smoke.mjs`
- Truth marker: `PLATFORM_TRUTH.json`
