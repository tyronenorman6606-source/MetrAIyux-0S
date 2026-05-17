# SkyeMusicNexus NeoFront Platform Status

Generated: 2026-05-17

SkyeMusicNexus has been rebuilt from a generic routed platform shell into a NeoFront experiential music operating app. The `public/` deployment surface is now the product experience, while the root HTML routes remain as a standalone truth shell and launch matrix.

## Primary App Surfaces

- Artist Stage: `./public/index.html`
- Operator Stage: `./public/admin.html`
- NeoFront CSS: `./public/neo-nexus.css`
- NeoFront browser runtime: `./public/neo-nexus.js`

## Preserved Runtime Entrypoints

- SkyGate browser helper: `./public/skygate-auth.js`
- Artist handler: `./netlify/functions/music-artists.js`
- Release handler: `./netlify/functions/music-releases.js`
- Payment handler: `./netlify/functions/music-payments.js`
- Analytics handler: `./netlify/functions/music-analytics.js`
- Local session handler: `./netlify/functions/skygate-session.js`

## Standalone Proof

- Truth marker: `PLATFORM_TRUTH.json`
- Runtime contract: `src/runtime-contract.json`
- Smoke proof: `smoke/smoke-proof.mjs`
- NeoFront smoke: `smoke/neo-front-smoke.mjs`
- P2 route smoke: `smoke/skye-music-nexus-p2-smoke.mjs`

## Conservative Claim

The local handler layer and NeoFront app wiring are proven by smoke. Live DSP distribution and production identity handoff remain external provider boundaries until connected and tested.
