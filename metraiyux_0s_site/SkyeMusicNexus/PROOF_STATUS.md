# SkyeMusicNexus NeoFront Proof Status

## Conservative Status

`local-runtime-proven / external-provider-boundaries-open`

## What Changed

This package is no longer just routed command pages, a generic admin surface, or a single crowded artist page. The deployed app in `public/` has been split into a roomed NeoFront music platform:

- `public/index.html` — Platform Dashboard with the room map, rates posture, upload/player/release/rights/exchange launch paths, Live Constellation, and Proof Chain.
- `public/create.html` — Create Studio with openDAW bridge, local stem staging, sample pack rail, gated project ledger, export manifest queue, and Release Forge handoff line.
- `public/upload.html` — Upload Studio with a large song drag/drop target, gated audio upload, uploaded audio vault, generated release track lines, and Release Forge handoff.
- `public/player.html` — Music Player with Stream Deck playback and the uploaded audio vault.
- `public/releases.html` — Release room with Artist Nebula, Skye ID/photo bridge, Release Forge, Royalty River, Ops Sequencer, and Live Constellation.
- `public/rights.html` — Rights room with Rights Vault, Takedown Hold, and legal-safe playback boundaries.
- `public/exchange.html` — Creator Exchange with Content Request Exchange, Inbox Relay, Community Relay, Achievement Orbit, and Release Campaign Forge.
- `public/admin.html` — operator stage with Review Chamber, Exchange Console, Payout Gate, Analytics Prism, Capsule Wall, and live proof boundaries.
- `public/neo-nexus.css` — custom display system: animated vinyl core, signal-map nodes, waveform reader, aurora field, record constellation, and operator modal.
- `public/neo-nexus.js` — browser runtime for SkyGate sessions, Skye-ID/photo artist identity handoff, gated audio uploads, uploaded audio playback, artist creation, release submission, track preview playback, rights attestation, takedown holds, ledger credits, release operations queueing, review/publish/stream/playback reporting, payout completion, analytics reads, and record rendering.
- `../assets/js/skye-id-bridge.js` — shared browser bridge that publishes/reads `skye0s.identity.current.v1` and keeps Skye-ID drafts usable by app rooms.

## Preserved Runtime

The original functional runtime remains intact:

- `netlify/functions/music-artists.js`
- `netlify/functions/music-releases.js`
- `netlify/functions/music-assets.js`
- `netlify/functions/music-payments.js`
- `netlify/functions/music-analytics.js`
- `netlify/functions/music-exchange.js`
- `netlify/functions/music-studio.js`
- `netlify/functions/skygate-session.js`
- `public/skygate-auth.js`

## Proof Commands

Run from this folder:

```bash
npm run smoke
```

Or individually:

```bash
node smoke/neo-front-smoke.mjs
node smoke/skye-music-nexus-p2-smoke.mjs
node smoke/open-source-studio-smoke.mjs
node smoke/smoke-proof.mjs
```

## What The Proof Verifies

- the NeoFront platform dashboard exists and exposes the split platform room map
- the Create Studio exists and exposes the openDAW bridge, stem staging lane, sample pack rail, engine ledger, gated project save, export queue, and Release Forge handoff line
- the Upload Studio exists and exposes a large song drop zone, gated audio upload, generated track lines, uploaded audio vault, and Release Forge handoff
- the Music Player room exists and exposes Stream Deck playback plus uploaded audio vault access
- the Release, Rights, and Exchange rooms exist and expose Artist Nebula, Release Forge, Royalty River, Ops Sequencer, Rights Vault, Takedown Hold, Content Request Exchange, Inbox Relay, Community Relay, Achievement Orbit, Release Campaign Forge, Live Constellation, and Proof Chain
- the NeoFront operator stage exists and exposes Review Chamber, Exchange Console, Payout Gate, Analytics Prism, and Capsule Wall
- the browser runtime is wired to the existing Netlify functions for artists, releases, payments, analytics, operations queueing, stream/playback reporting, the music exchange, and SkyGate local proof sessions
- the music-studio function rejects unauthenticated writes, accepts the local SkyGate token, saves studio project metadata, queues export manifests, and records external engine metadata
- Skye-ID generator drafts publish the shared identity key, artist photos, and the legacy onboarding draft key
- MusicNexus artist registration can consume that shared identity, use the Skye ID as the artist ID, and persist the profile photo on the gated artist record
- the routed shell pages still pass the P2 promotion marker requirements
- the local session endpoint reports bootstrap availability when environment variables are set
- invalid local operator credentials are rejected
- valid local operator credentials mint a revocable local admin session token
- artist registration works in the handler layer
- audio asset upload, list, stream, and delete actions are protected by the same SkyGate session boundary
- uploaded audio returns a gated stream URL that can be attached to a release track and fetched by the browser player through authenticated fetch
- the asset handler defaults to local gated proof storage and can be promoted to durable SkyeVault/Cloudflare R2 storage with `MUSIC_NEXUS_STORAGE_BACKEND=r2` or `MUSIC_NEXUS_USE_R2=1`
- direct R2 upload sessions and completion are already wired behind SkyGate and stay disabled until `MUSIC_NEXUS_ENABLE_DIRECT_UPLOAD=1`
- provider job hooks for transcoding, waveform/CDN, DSP handoff, legal review, and royalty settlement are gated and queue safely until provider webhook env is configured
- release submit, review, rights update, publish, stream reporting, gated playback stream proof, operations queueing, and operations updating work
- linked preview playback is blocked until ownership and preview-use rights are attested
- release publishing, stream reporting, and operations queueing are blocked until the distribution rights gate is ready
- takedown hold requests block later playback while retaining the rights audit trail
- content request work packets, Relay13-ready inbox threads, community posts, release campaign packs, and achievement progression work
- payment credit, ledger, payout request, and payout queue flows work
- admin analytics accepts the locally bootstrapped token
- public artist and release read endpoints return created records

## What Is Still Not Proven Here

- real identity-provider handoff into production SkyGate tokens beyond the local shared Skye-ID browser bridge
- full Spotify-style catalog licensing, playlist graph, recommendation, and subscription playback stack
- live production R2 credentials, R2 bucket CORS, multipart upload scaling beyond presigned PUT, transcoding, waveform generation, and CDN delivery
- formal legal review, registered DMCA-agent operations, and production takedown response process
- live DSP/distribution ingestion
- hosted openDAW deployment and upstream open-source license/package distribution work
- live royalty settlement from Spotify, Apple Music, Tidal, YouTube Music, or other platforms
- deployed Netlify/Cloudflare behavior with production environment variables

This is a truthful local proof lane for the handler surface that exists in-repo and a real experiential front-end system on top of it. It does not claim live music distribution until those provider integrations and rights operations are connected, reviewed, and tested.
