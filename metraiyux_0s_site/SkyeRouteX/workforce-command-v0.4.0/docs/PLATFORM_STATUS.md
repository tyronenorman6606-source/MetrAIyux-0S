# SkyeRoutex Workforce Command Platform Status

Updated: 2026-05-24

This folder is the canonical SkyeRouteX Workforce Command app surface. The provider, contractor, House Command, proof, payment-state, audit, compliance, and export console now lives directly at `index.html`; the old docked shell pages, nested `app.html`, and nested `public/index.html` entry were removed. Supporting CSS, module JS, and gate-readiness files remain in `public/`.

## Included Surfaces

- Canonical app: `index.html`
- Support assets: `public/styles.css`, `public/app.js`, `public/gate-readiness.html`
- Real logo: `assets/platform-mark.svg`

## Runtime Proof

- Runtime contract: `src/runtime-contract.json`
- Smoke check: `smoke/skyeroutex-workforce-command-p1-smoke.mjs`
- Truth marker: `PLATFORM_TRUTH.json`
