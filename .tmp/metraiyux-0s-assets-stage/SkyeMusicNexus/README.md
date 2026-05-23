# SkyeMusicNexus NeoFront

SkyeMusicNexus was rebuilt into a roomed music platform while preserving the existing runtime, adding a real gated upload lane, and wiring in a first-party native creation studio.

## Primary Surfaces

- `public/index.html` — Platform Dashboard: room map, price posture, Live Constellation, and Proof Chain.
- `public/create.html` — Create Hub: BandLab plus Spotify plus Instagram command layer with launch cards for creation, stems, export, discovery, feed, and release ops.
- `public/daw.html` — Native DAW Room: first-party fullscreen Nexus DAW with transport, arrangement, tracks, mixer, pads, keys, edit tools, loop packs, mic/MIDI hooks, browser WAV mixdown, save, and export controls.
- `public/nexus-daw.css` — DAW-specific fullscreen workspace styling.
- `public/nexus-daw.js` — DAW transport, WebAudio sketching, clip import/decode/preview, physical keyboard mapping, region editing, loop/metronome state, sound-pack insertion, browser WAV mixdown, mixer state, local/SkyGate save, and manifest export logic.
- `public/stems.html` — Stem Vault: local stem staging, sample pack rail, arrangement notes, and gated project save handoff.
- `public/exports.html` — Export Forge: project packet editor, JSON export, gated export manifest queue, and Release Forge handoff.
- `public/discover.html` — Discover Surface: Spotify-style playlist rail, track queue, featured drops, and artist discovery cards.
- `public/feed.html` — Social Feed: Instagram-style story rail, post composer, community wall, release/social cards, and Pixelfed/Mastodon-compatible connector proof.
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
- `netlify/functions/music-social.js`
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

That serves the dashboard, Create Hub, native DAW Room, Stem Vault, Export Forge, Discover, Feed, Upload Studio, Music Player, and `/.netlify/functions/music-assets` / `/.netlify/functions/music-studio` from one local origin. The script enables local SkyGate proof bootstrap, writes upload and studio proof data under `MUSIC_NEXUS_DATA_DIR` or `/tmp/skye-musicnexus-local-dev`, sets local COOP/COEP headers, and does not embed production secrets.

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

Local handlers and browser wiring are proven, including Skye-ID/photo artist identity handoff, the split Create Hub, native DAW Room, DAW audio import/decode/preview, physical keyboard notes, region edits, loop-pack insertion, browser WAV mixdown, Stem Vault, Export Forge, Discover, Feed, gated studio project saves, export manifest queueing, the large song drag/drop upload target, gated audio upload/list/stream, uploaded audio player fetches through SkyGate, track preview playback, gated playback telemetry, rights attestation, takedown playback holds, content requests, Relay13-ready inbox threads, community posts, release campaign packs, achievement progression, Pixelfed/Mastodon-compatible social connectors, provider-token-safe release post queues, and federated feed sync contracts. The asset handler defaults to local proof storage and can be promoted to SkyeVault/Cloudflare R2 with `MUSIC_NEXUS_STORAGE_BACKEND=r2` or `MUSIC_NEXUS_USE_R2=1`, keeping upload, list, stream, and delete behind SkyGate. Direct R2 upload sessions, provider job hooks, and social provider tokens are wired behind SkyGate for production activation. Linked audio playback requires ownership plus preview-use attestation; release publish, stream reporting, operations queueing, and provider social publishing require the relevant rights/token gates. This is not legal advice and not yet a full Spotify-scale playback business or owned Fediverse server: live production R2 credentials, bucket CORS, server-side transcoding/CDN delivery, licensed catalog operations, live Relay13 worker bridging, production identity provider tokens beyond the local Skye-ID bridge, live DSP/distribution ingestion, DMCA-agent operations, live royalty settlement, native ActivityPub actor signing/WebFinger/moderation, and production audio-render worker deployment remain external provider boundaries until connected and tested.
