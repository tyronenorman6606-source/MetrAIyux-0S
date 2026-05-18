# SkyeMusicNexus NeoFront

SkyeMusicNexus was rebuilt into a roomed music platform while preserving the existing runtime, adding a real gated upload lane, and wiring in the open-source creation studio drop-in.

## Primary Surfaces

- `public/index.html` — Platform Dashboard: room map, price posture, Live Constellation, and Proof Chain.
- `public/create.html` — Create Studio: openDAW bridge, local stem staging, sample pack rail, gated studio project ledger, export manifest queue, and Release Forge handoff.
- `public/upload.html` — Upload Studio: large song drag/drop target, gated audio upload, uploaded audio vault, generated track lines, and Release Forge handoff.
- `public/player.html` — Music Player: Stream Deck playback with uploaded audio vault context.
- `public/releases.html` — Releases: Artist Nebula, Skye ID/photo bridge, Release Forge, Royalty River, Ops Sequencer, Live Constellation.
- `public/rights.html` — Rights: Rights Vault, Takedown Hold, legal-safe playback and distribution boundaries.
- `public/exchange.html` — Creator Exchange: content requests, inbox threads, community posts, achievements, and release campaign packs.
- `public/admin.html` — Operator Stage: Review Chamber, Exchange Console, Payout Gate, Analytics Prism, Capsule Wall.
- `public/neo-nexus.css` — custom NeoFront display system.
- `public/neo-nexus.js` — browser runtime wired into the existing handlers.
- `../assets/js/skye-id-bridge.js` — shared 0S identity bridge for Skye-ID generator drafts, artist photos, and cross-app artist IDs.

## Preserved Runtime

- `netlify/functions/music-artists.js`
- `netlify/functions/music-releases.js`
- `netlify/functions/music-assets.js`
- `netlify/functions/music-payments.js`
- `netlify/functions/music-analytics.js`
- `netlify/functions/music-exchange.js`
- `netlify/functions/music-studio.js`
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
node smoke/open-source-studio-smoke.mjs
node smoke/smoke-proof.mjs
```

## Local Platform Server

Run the split platform with the in-repo Netlify functions wired locally:

```bash
npm run dev:local
```

That serves the dashboard, Create Studio, Upload Studio, Music Player, and `/.netlify/functions/music-assets` / `/.netlify/functions/music-studio` from one local origin. The script enables local SkyGate proof bootstrap, writes upload and studio proof data under `MUSIC_NEXUS_DATA_DIR` or `/tmp/skye-musicnexus-local-dev`, and does not embed production secrets.

Production switches for R2 direct uploads, transcoding, waveform/CDN jobs, DSP handoff, legal review, and royalty settlement hooks live in `docs/PRODUCTION_WIRING.md`.

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

Local handlers and browser wiring are proven, including Skye-ID/photo artist identity handoff, the open-source Create Studio lane, gated studio project saves, export manifest queueing, the large song drag/drop upload target, gated audio upload/list/stream, uploaded audio player fetches through SkyGate, track preview playback, gated playback telemetry, rights attestation, takedown playback holds, content requests, Relay13-ready inbox threads, community posts, release campaign packs, and achievement progression. The asset handler defaults to local proof storage and can be promoted to SkyeVault/Cloudflare R2 with `MUSIC_NEXUS_STORAGE_BACKEND=r2` or `MUSIC_NEXUS_USE_R2=1`, keeping upload, list, stream, and delete behind SkyGate. Direct R2 upload sessions and provider job hooks are wired behind SkyGate for later production activation. Linked audio playback requires ownership plus preview-use attestation; release publish, stream reporting, and operations queueing require the distribution rights gate. This is not legal advice and not yet a full Spotify-scale playback business: live production R2 credentials, bucket CORS, transcoding/CDN delivery, licensed catalog operations, live Relay13 worker bridging, production identity provider tokens beyond the local Skye-ID bridge, live DSP/distribution ingestion, DMCA-agent operations, live royalty settlement, and hosted openDAW engine deployment remain external provider boundaries until connected and tested.
