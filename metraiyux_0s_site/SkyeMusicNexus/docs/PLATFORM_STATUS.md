# SkyeMusicNexus NeoFront Platform Status

Generated: 2026-05-17

SkyeMusicNexus has been rebuilt from a generic routed platform shell into a roomed NeoFront music platform. The `public/` deployment surface is now split across dashboard, create studio, upload, player, releases, rights, exchange, and operator rooms, while the root HTML routes remain as a standalone truth shell and launch matrix.

## Primary App Surfaces

- Platform Dashboard: `./public/index.html`
- Create Studio: `./public/create.html` with openDAW bridge, stem staging, sample pack rail, gated studio project ledger, export manifest queue, and Release Forge handoff
- Upload Studio: `./public/upload.html` with large song drag/drop target and gated upload handoff
- Music Player: `./public/player.html`
- Releases: `./public/releases.html`
- Rights: `./public/rights.html`
- Creator Exchange: `./public/exchange.html`
- Operator Stage: `./public/admin.html`
- NeoFront CSS: `./public/neo-nexus.css`
- NeoFront browser runtime: `./public/neo-nexus.js`
- Shared Skye ID bridge: `../assets/js/skye-id-bridge.js` reads/writes `skye0s.identity.current.v1` so artist IDs and profile photos can move from the Skye-ID generator into MusicNexus and later 0S app rooms
- Gated Audio Upload: `./netlify/functions/music-assets.js`
- Durable Upload Backend: `MUSIC_NEXUS_STORAGE_BACKEND=r2` or `MUSIC_NEXUS_USE_R2=1` promotes upload/list/stream/delete to SkyeVault/Cloudflare R2 while preserving SkyGate on every action
- Direct Upload Sessions: `action=create-upload-session` and `action=complete-upload` are wired behind SkyGate and activate with `MUSIC_NEXUS_ENABLE_DIRECT_UPLOAD=1`
- Provider Hooks: `./netlify/functions/music-provider-hooks.js` queues transcoding, waveform, CDN, DSP, legal, and royalty jobs until webhook env is configured
- Studio Handler: `./netlify/functions/music-studio.js` saves creation projects, queues export manifests, and registers external engine records behind SkyGate
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
- Studio handler: `./netlify/functions/music-studio.js`
- Local session handler: `./netlify/functions/skygate-session.js`

## Standalone Proof

- Truth marker: `PLATFORM_TRUTH.json`
- Runtime contract: `src/runtime-contract.json`
- Smoke proof: `smoke/smoke-proof.mjs`
- NeoFront smoke: `smoke/neo-front-smoke.mjs`
- P2 route smoke: `smoke/skye-music-nexus-p2-smoke.mjs`
- Open-source studio smoke: `smoke/open-source-studio-smoke.mjs`

## Conservative Claim

The local handler layer and NeoFront app wiring are proven by smoke, including Skye-ID/photo artist identity handoff, gated Create Studio project saves, export manifest queueing, open-source engine ledger records, gated audio upload/list/stream, uploaded audio player fetches, gated track preview playback, playback stream telemetry, rights attestation, publish/stream/ops distribution gates, and takedown playback holds. The same asset handler now has an opt-in SkyeVault/Cloudflare R2 storage mode and direct upload session lane for durable audio objects and metadata, plus gated provider hooks for transcoding, waveform/CDN, DSP, legal review, and royalty settlement. Live production R2 credentials, R2 bucket CORS, multipart scaling beyond presigned PUT, hosted openDAW deployment, transcoding, waveform/CDN delivery, Spotify-style catalog licensing, live DSP distribution, production identity provider handoff beyond the local Skye-ID browser bridge, formal legal review, and registered DMCA-agent operations remain external provider boundaries until connected and tested.
