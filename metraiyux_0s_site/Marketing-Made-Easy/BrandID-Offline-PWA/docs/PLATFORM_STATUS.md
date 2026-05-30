# BrandID Offline PWA Platform Status

Updated: 2026-05-24

This folder is the canonical BrandID Offline PWA app surface. The offline brand identity generator, SVG export controls, intake outbox, handoff briefs, and service worker now live directly at `index.html`; the old docked shell pages and nested `app.html` entry were removed.

## Included Surfaces

- Canonical app: `index.html`
- Local runtime contract: `runtime/local-runtime.mjs`
- Service worker: `sw.js`
- Manifest: `manifest.webmanifest`

## Runtime Proof

- Runtime contract: `src/runtime-contract.json`
- Smoke check: `smoke/brandid-offline-pwa-p1-smoke.mjs`
- Truth marker: `PLATFORM_TRUTH.json`
