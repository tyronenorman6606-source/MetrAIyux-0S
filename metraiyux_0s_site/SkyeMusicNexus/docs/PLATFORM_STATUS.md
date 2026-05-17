# SkyeMusicNexus NeoFront Platform Status

Generated: 2026-05-17

SkyeMusicNexus has been rebuilt from a generic routed platform shell into a roomed NeoFront music platform. The `public/` deployment surface is now split across dashboard, upload, player, releases, rights, exchange, and operator rooms, while the root HTML routes remain as a standalone truth shell and launch matrix.

## Primary App Surfaces

- Platform Dashboard: `./public/index.html`
- Upload Studio: `./public/upload.html`
- Music Player: `./public/player.html`
- Releases: `./public/releases.html`
- Rights: `./public/rights.html`
- Creator Exchange: `./public/exchange.html`
- Operator Stage: `./public/admin.html`
- NeoFront CSS: `./public/neo-nexus.css`
- NeoFront browser runtime: `./public/neo-nexus.js`
- Gated Audio Upload: `./netlify/functions/music-assets.js`
- Durable Upload Backend: `MUSIC_NEXUS_STORAGE_BACKEND=r2` or `MUSIC_NEXUS_USE_R2=1` promotes upload/list/stream/delete to SkyeVault/Cloudflare R2 while preserving SkyGate on every action
- Stream Deck: gated browser playback with linked preview URL support, generated proof audio fallback, and playback telemetry into the release handler
- Rights Vault: ownership, preview-use, distribution, sample, cover, publisher, rights-contact, and notes attestation for each release
- Takedown Hold: gated playback block and audit trail for rights/takedown review

## Preserved Runtime Entrypoints

- SkyGate browser helper: `./public/skygate-auth.js`
- Artist handler: `./netlify/functions/music-artists.js`
- Release handler: `./netlify/functions/music-releases.js`
- Audio asset handler: `./netlify/functions/music-assets.js`
- Payment handler: `./netlify/functions/music-payments.js`
- Analytics handler: `./netlify/functions/music-analytics.js`
- Exchange handler: `./netlify/functions/music-exchange.js`
- Local session handler: `./netlify/functions/skygate-session.js`

## Standalone Proof

- Truth marker: `PLATFORM_TRUTH.json`
- Runtime contract: `src/runtime-contract.json`
- Smoke proof: `smoke/smoke-proof.mjs`
- NeoFront smoke: `smoke/neo-front-smoke.mjs`
- P2 route smoke: `smoke/skye-music-nexus-p2-smoke.mjs`

## Conservative Claim

The local handler layer and NeoFront app wiring are proven by smoke, including gated audio upload/list/stream, uploaded audio player fetches, gated track preview playback, playback stream telemetry, rights attestation, publish/stream/ops distribution gates, and takedown playback holds. The same asset handler now has an opt-in SkyeVault/Cloudflare R2 storage mode for durable audio objects and metadata, but live production R2 credentials, direct browser multipart uploads, transcoding, waveform/CDN delivery, Spotify-style catalog licensing, live DSP distribution, production identity handoff, formal legal review, and registered DMCA-agent operations remain external provider boundaries until connected and tested.
