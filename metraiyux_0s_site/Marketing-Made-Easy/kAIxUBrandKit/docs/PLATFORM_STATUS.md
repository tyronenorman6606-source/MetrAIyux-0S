# kAIxU BrandKit Platform Status

Updated: 2026-05-24

This folder is the canonical kAIxU BrandKit app surface. The working brand exporter, kAIxU studio, project library, and handoff runtime now live directly at `index.html`; the old docked shell pages and nested `app.html` entry were removed.

## Included Surfaces

- Canonical app: `index.html`
- Runtime adapter: `runtime/local-runtime.mjs`
- Gateway functions: `netlify/functions/`

## Runtime Proof

- Runtime contract: `src/runtime-contract.json`
- Smoke check: `smoke/kaixu-brandkit-p1-smoke.mjs`
- Truth marker: `PLATFORM_TRUTH.json`
