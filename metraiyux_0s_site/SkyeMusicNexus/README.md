# SkyeMusicNexus NeoFront

SkyeMusicNexus was rebuilt into a real experiential music operating app while preserving the existing runtime.

## Primary Surfaces

- `public/index.html` — Artist Stage: Artist Nebula, Release Forge, Royalty River, Ops Sequencer, Live Constellation, Proof Chain.
- `public/admin.html` — Operator Stage: Review Chamber, Payout Gate, Analytics Prism, Capsule Wall.
- `public/neo-nexus.css` — custom NeoFront display system.
- `public/neo-nexus.js` — browser runtime wired into the existing handlers.

## Preserved Runtime

- `netlify/functions/music-artists.js`
- `netlify/functions/music-releases.js`
- `netlify/functions/music-payments.js`
- `netlify/functions/music-analytics.js`
- `netlify/functions/skygate-session.js`
- `public/skygate-auth.js`

## Smoke Proof

Run:

```bash
npm run smoke
```

This executes:

```bash
node smoke/neo-front-smoke.mjs
node smoke/skye-music-nexus-p2-smoke.mjs
node smoke/smoke-proof.mjs
```

## Local Operator Proof Session

The local proof login path uses environment variables. No operator credentials are hardcoded in the browser files.

Set these before running Netlify locally when you want protected browser actions:

```bash
SKYGATE_ENABLE_LOCAL_SESSION_BOOTSTRAP=1
SKYGATE_LOCAL_OPERATOR_EMAIL=operator@internal.invalid
SKYGATE_LOCAL_OPERATOR_PASSWORD=your-local-proof-password
SKYGATE_LOCAL_OPERATOR_ROLE=admin
```

## Honest Boundary

Local handlers and browser wiring are proven. Production identity-provider handoff, live DSP/distribution ingestion, and live royalty settlement remain external provider boundaries until connected and tested.
