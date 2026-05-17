# SkyeMusicNexus NeoFront

SkyeMusicNexus was rebuilt into a roomed music platform while preserving the existing runtime and adding a real gated upload lane.

## Primary Surfaces

- `public/index.html` — Platform Dashboard: room map, price posture, Live Constellation, and Proof Chain.
- `public/upload.html` — Upload Studio: gated audio upload, uploaded audio vault, generated track lines, and Release Forge handoff.
- `public/player.html` — Music Player: Stream Deck playback with uploaded audio vault context.
- `public/releases.html` — Releases: Artist Nebula, Release Forge, Royalty River, Ops Sequencer, Live Constellation.
- `public/rights.html` — Rights: Rights Vault, Takedown Hold, legal-safe playback and distribution boundaries.
- `public/exchange.html` — Creator Exchange: content requests, inbox threads, community posts, achievements, and release campaign packs.
- `public/admin.html` — Operator Stage: Review Chamber, Exchange Console, Payout Gate, Analytics Prism, Capsule Wall.
- `public/neo-nexus.css` — custom NeoFront display system.
- `public/neo-nexus.js` — browser runtime wired into the existing handlers.

## Preserved Runtime

- `netlify/functions/music-artists.js`
- `netlify/functions/music-releases.js`
- `netlify/functions/music-assets.js`
- `netlify/functions/music-payments.js`
- `netlify/functions/music-analytics.js`
- `netlify/functions/music-exchange.js`
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

## Local Platform Server

Run the split platform with the in-repo Netlify functions wired locally:

```bash
npm run dev:local
```

That serves the dashboard, Upload Studio, Music Player, and `/.netlify/functions/music-assets` from one local origin. The script enables local SkyGate proof bootstrap, writes upload proof data under `MUSIC_NEXUS_DATA_DIR` or `/tmp/skye-musicnexus-local-dev`, and does not embed production secrets.

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

Local handlers and browser wiring are proven, including gated audio upload/list/stream, uploaded audio player fetches through SkyGate, track preview playback, gated playback telemetry, rights attestation, takedown playback holds, content requests, Relay13-ready inbox threads, community posts, release campaign packs, and achievement progression. The asset handler defaults to local proof storage and can be promoted to SkyeVault/Cloudflare R2 with `MUSIC_NEXUS_STORAGE_BACKEND=r2` or `MUSIC_NEXUS_USE_R2=1`, keeping upload, list, stream, and delete behind SkyGate. Linked audio playback requires ownership plus preview-use attestation; release publish, stream reporting, and operations queueing require the distribution rights gate. This is not legal advice and not yet a full Spotify-scale playback business: live production R2 credentials, direct browser multipart uploads, transcoding/CDN delivery, licensed catalog operations, live Relay13 worker bridging, live DSP/distribution ingestion, DMCA-agent operations, and live royalty settlement remain external provider boundaries until connected and tested.
