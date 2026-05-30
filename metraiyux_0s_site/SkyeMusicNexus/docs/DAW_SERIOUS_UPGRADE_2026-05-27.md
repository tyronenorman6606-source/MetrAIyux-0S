# SkyeMusicNexus DAW Serious Upgrade Note - 2026-05-27

Scope: SkyeMusicNexus native DAW only. Browser/Playwright proof was not run because repo policy keeps browser verification owner-handled.

## Rating

- Before this pass: 2.8/10 versus a paid serious DAW target.
- After this pass: 4.7/10 versus a paid serious DAW target.
- Paid serious target: 9.0+/10 with durable audio storage, waveform editing, offline render workers, stems, automation, MIDI editor, routing/busses, collaboration/versioning, rights metadata, and metered AI generation.

## Current Capability Inventory

- Native DAW route and UI are in `public/daw.html`; no third-party DAW iframe is used.
- Timeline now supports variable session length through `#dawBarsInput`, not only a fixed 16-beat sketch grid.
- `public/nexus-daw.js` supports Web Audio transport, pads, keys, imported clip decode/preview, mic recording, Web MIDI input, undo/redo, split/duplicate/delete/quantize, loop/metronome, mixer volume, mixer pan, and stereo browser WAV render.
- Imported clips can be promoted into the shared `music-assets` lane from the DAW when small enough for inline upload.
- Projects now keep a stable DAW project id, timeline metadata, track pan, clip asset ids, release handoff data, export queue receipts, and kAIxU assistant receipts.
- DAW project save/load and export queue use shared SkyGate-aware requests against `music-studio`.
- `music-studio` now supports `queueDawExport`, `dawAssistant`, and `assistantSuggest` locally and in the 0S Worker mirror.

## What Changed

- `public/daw.html`: added bars control, Cloud/Queue actions, kAIxU DAW copilot panel, vault/local-load controls, export target checkboxes, and saved-project panel.
- `public/nexus-daw.js`: added dynamic timeline math, pan-aware mixer, stereo WAV encoding, clip vault promotion, cloud/local project restore, DAW export queueing, DAW-specific kAIxU plan generation/apply flow, and richer project manifests.
- `public/nexus-daw.css`: added styling for kAIxU, export targets, cloud projects, vault controls, dynamic timeline lanes, and pan rows.
- `netlify/functions/music-studio.js`: added normalized assistant/usage ledgers, kAIxU-only DAW assistant policy, daily rate limits, `queueDawExport`, and no-provider-call assistant receipts.
- `metraiyux_0s_site/cloudflare/worker.js`: mirrored the same DAW assistant/export support in the mounted 0S API layer.

## Missing Before Paid Serious DAW

- Real waveform renderer and clip handles for trim/fade/gain/crossfade.
- AudioBuffer-backed non-destructive clip offsets, not just region metadata.
- Offline render/transcode worker for MP3/WAV/stems; browser WAV remains proof/review grade.
- Durable storage for all imported clips; inline DAW vaulting is limited and large files still need Upload Studio/direct upload.
- MIDI piano roll, quantized MIDI recording, velocity editing, and instrument presets.
- Automation lanes for volume/pan/effects and master chain state.
- Track routing, sends, busses, sidechain, limiter/export loudness targets, and LUFS proof.
- Collaboration/versioning locks, session comments, and owner/operator review states.
- Per-clip rights/provenance fields before Release Forge handoff.
- Mobile DAW layout still hides browser/mixer; serious tablet/mobile DAW needs a purpose-built compact layout.

## AI Assistant Requirements

- Public DAW UI may expose only kAIxU aliases: `kaixu-6.7-nano`, `kaixu-6.7-mini`, `kaixu-6.7`, `kaixu-6.7-pro`, `kaixu-6.7-max`.
- Raw provider names/model ids must not be accepted as public DAW controls. The backend clamps unknown aliases back to kAIxU Nano.
- DAW assistant responses are planning receipts only: `providerCalled:false`, `rawModelExposed:false`, `hiddenProviderRouting:true`.
- Live/expensive generation must stay in paid or owner-approved song-creation/provider lanes, not DAW buttons.
- DAW assistant should return actionable project patches only when they are cheap metadata moves, such as region suggestions, export plans, mix notes, and rights reminders.

## kAIxU-Only Exposure Rule

The DAW must never show ElevenLabs, Stability, OpenAI, Gemini, or raw provider models as a user-selectable model. Public surface language is "kAIxU model orchestration." Provider hooks stay private and operator-gated. File references:

- `public/daw.html`: kAIxU tier select.
- `public/nexus-daw.js`: `KAIXU_MODEL_ALIASES`, local assist fallback, `dawAssistant` call.
- `netlify/functions/music-studio.js`: `dawAssistantPolicy`, `KAIXU_DAW_MODEL_ALIASES`.
- `metraiyux_0s_site/cloudflare/worker.js`: `musicDawAssistantPolicy`, `musicDawModelAlias`.

## FS27/Gate Implications

- No DAW-specific passwords were added.
- DAW API writes still flow through SkyGate-aware `auth.fetch`.
- Mounted 0S production routes rely on the shared Worker gate and `musicHandleStudio` mirror.
- `music-assets` promotion is also gate-protected; DAW clip streaming/downloading remains under artist-or-paid entitlement policy.
- Browser proof remains owner-handled by policy; non-browser syntax and smoke receipts were run instead.

## Monetization And Limits

DAW assistant daily limits now exist in both local and Worker `music-studio`:

- Free beta: 24 DAW assistant runs/day.
- Artist Pro: 72 DAW assistant runs/day.
- Label: 160 DAW assistant runs/day.
- Owner review: 240 DAW assistant runs/day.

Recommended paid export/generation model:

- Free beta: local save, browser WAV review, limited assistant, no live model generation.
- Artist Pro: higher assistant ceiling, queued MP3/WAV export, limited stem archive.
- Label: batch exports, stem archives, release pack handoff, higher assistant ceiling.
- Owner review: cinematic/long-form and high-compute requests only after owner approval.

## Priority Roadmap

1. Build a real waveform/clip engine: trim, split, fade, clip gain, snap, offset, and crossfade.
2. Add offline render workers with stem export, MP3 preview, WAV master, loudness metadata, and receipts.
3. Move all DAW clip persistence to direct upload/R2-compatible `music-assets`, not inline base64.
4. Add arrangement sections/markers and MIDI piano roll.
5. Add automation lanes and track routing/busses.
6. Add per-clip rights/provenance collection before Release Forge queue.
7. Add collaboration/versioning with shared Gate identity.
8. Add DAW export pricing gates and paid queue accounting before any live kAIxU/provider dispatch.
9. Add tablet/mobile DAW layout.
10. Run owner browser verification after the owner re-enables it or manually checks production.

## Verification

- `node --check public/nexus-daw.js` passed.
- `node --check netlify/functions/music-studio.js` passed.
- `node --check metraiyux_0s_site/cloudflare/worker.js` passed.
- `node smoke/open-source-studio-smoke.mjs` passed.
- `MCP_APPLY=0 npm run mcp:mine -- metraiyux_0s_site/SkyeMusicNexus` ran after the DAW edits; it produced a partial MCP receipt with `design_luxury_audit` failed and no browser proof.
