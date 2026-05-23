# SkyeMusicNexus Production Wiring

Generated: 2026-05-17

This is the dormant production wiring map. Every lane below still requires a SkyGate session at the MusicNexus API boundary.

## Durable Audio Storage

Turn on Cloudflare R2/SkyeVault storage for `music-assets.js`:

```bash
MUSIC_NEXUS_STORAGE_BACKEND=r2
MUSIC_NEXUS_R2_ACCOUNT_ID=...
MUSIC_NEXUS_R2_ACCESS_KEY_ID=...
MUSIC_NEXUS_R2_SECRET_ACCESS_KEY=...
MUSIC_NEXUS_R2_BUCKET=...
MUSIC_NEXUS_R2_PREFIX=skye-music-nexus
```

The existing base64 upload action writes to R2 when the backend is enabled. The stream URL remains `/.netlify/functions/music-assets?action=stream&id=...`, so playback still goes through SkyGate instead of exposing public object URLs.

## Direct Browser Uploads

After R2 bucket CORS is configured for authenticated app origins, enable direct upload sessions:

```bash
MUSIC_NEXUS_ENABLE_DIRECT_UPLOAD=1
MUSIC_NEXUS_MAX_DIRECT_UPLOAD_BYTES=5368709120
MUSIC_NEXUS_DIRECT_UPLOAD_URL_SECONDS=900
```

The Upload Studio will then:

1. call gated `music-assets` with `action=create-upload-session`
2. PUT the file to the short-lived R2 URL
3. call gated `music-assets` with `action=complete-upload`
4. keep playback behind the gated stream route

If direct upload is not enabled, the UI stays on the local/base64 proof lane and blocks oversized files with a clear message.

## Provider Hooks

`music-provider-hooks.js` queues future provider jobs behind SkyGate. Webhooks stay parked until the global flag and each feature flag are set.

```bash
MUSIC_NEXUS_ENABLE_PROVIDER_WEBHOOKS=1
MUSIC_NEXUS_PROVIDER_WEBHOOK_SECRET=...

MUSIC_NEXUS_ENABLE_TRANSCODING=1
MUSIC_NEXUS_TRANSCODER_WEBHOOK_URL=https://...

MUSIC_NEXUS_ENABLE_WAVEFORMS=1
MUSIC_NEXUS_WAVEFORM_WEBHOOK_URL=https://...

MUSIC_NEXUS_ENABLE_CDN=1
MUSIC_NEXUS_CDN_WEBHOOK_URL=https://...

MUSIC_NEXUS_ENABLE_DSP=1
MUSIC_NEXUS_DSP_WEBHOOK_URL=https://...

MUSIC_NEXUS_ENABLE_LEGAL_REVIEW=1
MUSIC_NEXUS_LEGAL_REVIEW_WEBHOOK_URL=https://...

MUSIC_NEXUS_ENABLE_ROYALTY_SETTLEMENT=1
MUSIC_NEXUS_ROYALTY_WEBHOOK_URL=https://...
```

Supported provider job IDs:

- `transcoding`
- `waveform`
- `cdn`
- `dsp`
- `legal`
- `royalty`

Webhook payloads are signed with `x-skye-music-signature` when `MUSIC_NEXUS_PROVIDER_WEBHOOK_SECRET` is set.

## Still Not Claimed

This wiring does not claim live DSP delivery, public streaming licensing, legal representation, registered DMCA-agent operations, royalty accounting, or successful provider fulfillment until those providers are connected and proven.
