# SkyeMusicNexus DAW Upgrade Biopsy

Generated: 2026-05-27  
Scope: SkyeMusicNexus DAW only. Source audit, no browser or Playwright proof.

## Verdict

The current DAW is a real first-party browser-native sketch room, not a toy screenshot. It has Web Audio playback, imported clip decode/preview, microphone recording, Web MIDI input, region edits, loop packs, mixer sliders, local/SkyGate save, and browser WAV mixdown. That is enough to call it a useful beta creation room.

It is not yet a paid serious DAW. It is closer to a 16-beat browser production sketchpad with release-handoff metadata than to Ableton, FL Studio, Logic, Pro Tools, BandLab Studio, Soundtrap, or a serious AI DAW.

Rating today: 2.8/10 against a paid serious DAW target.

Paid serious target rating needed before charging for DAW access itself: 8.0/10 minimum.

Recommended commercial posture now: keep DAW free/beta; charge for drop packaging, release handling, storage, hands-on production, and tightly metered AI assists. Do not expose expensive model generation as free DAW behavior.

## Source Map

- DAW shell/UI: `metraiyux_0s_site/SkyeMusicNexus/public/daw.html:23`, `metraiyux_0s_site/SkyeMusicNexus/public/daw.html:50`, `metraiyux_0s_site/SkyeMusicNexus/public/daw.html:98`, `metraiyux_0s_site/SkyeMusicNexus/public/daw.html:112`
- DAW engine/state: `metraiyux_0s_site/SkyeMusicNexus/public/nexus-daw.js:4`, `metraiyux_0s_site/SkyeMusicNexus/public/nexus-daw.js:31`, `metraiyux_0s_site/SkyeMusicNexus/public/nexus-daw.js:126`
- Import, mixdown, mic, MIDI: `metraiyux_0s_site/SkyeMusicNexus/public/nexus-daw.js:982`, `metraiyux_0s_site/SkyeMusicNexus/public/nexus-daw.js:1086`, `metraiyux_0s_site/SkyeMusicNexus/public/nexus-daw.js:1109`, `metraiyux_0s_site/SkyeMusicNexus/public/nexus-daw.js:1181`
- Save/export bridge: `metraiyux_0s_site/SkyeMusicNexus/public/nexus-daw.js:1216`, `metraiyux_0s_site/SkyeMusicNexus/public/nexus-daw.js:1252`, `metraiyux_0s_site/SkyeMusicNexus/public/nexus-daw.js:1265`, `metraiyux_0s_site/SkyeMusicNexus/public/nexus-daw.js:1288`
- Gated studio API: `metraiyux_0s_site/SkyeMusicNexus/netlify/functions/music-studio.js:86`, `metraiyux_0s_site/SkyeMusicNexus/netlify/functions/music-studio.js:91`, `metraiyux_0s_site/SkyeMusicNexus/netlify/functions/music-studio.js:108`, `metraiyux_0s_site/cloudflare/worker.js:15833`
- 0S gate and auth: `metraiyux_0s_site/SkyeMusicNexus/public/skygate-auth.js:19`, `metraiyux_0s_site/SkyeMusicNexus/netlify/functions/_lib/skygate-auth.js:72`, `metraiyux_0s_site/SkyeMusicNexus/netlify/functions/_lib/local-identity.js:3`, `metraiyux_0s_site/cloudflare/worker.js:19846`, `metraiyux_0s_site/cloudflare/worker.js:20465`
- AI/provider lane: `metraiyux_0s_site/SkyeMusicNexus/netlify/functions/music-provider-hooks.js:44`, `metraiyux_0s_site/SkyeMusicNexus/netlify/functions/music-provider-hooks.js:204`, `metraiyux_0s_site/cloudflare/worker.js:13833`, `metraiyux_0s_site/cloudflare/worker.js:13900`, `metraiyux_0s_site/cloudflare/worker.js:13949`
- Pricing/boundaries: `metraiyux_0s_site/SkyeMusicNexus/public/pricing-daw.html:20`, `metraiyux_0s_site/SkyeMusicNexus/public/pricing-daw.html:24`, `metraiyux_0s_site/SkyeMusicNexus/data/skyemusicnexus-pricing.json:221`, `metraiyux_0s_site/SkyeMusicNexus/data/skyemusicnexus-simple-pricing.json:236`
- Prior parity note: `metraiyux_0s_site/SkyeMusicNexus/docs/BANDLAB_PARITY_AUDIT.md:11`, `metraiyux_0s_site/SkyeMusicNexus/docs/BANDLAB_PARITY_AUDIT.md:28`

## Current Capability Inventory

1. Fullscreen DAW room exists with transport, BPM/key controls, project actions, session browser, timeline, mixer, pads, keys, output, and status bar. Evidence: `public/daw.html:23`, `public/daw.html:33`, `public/daw.html:50`, `public/daw.html:98`, `public/daw.html:103`, `public/daw.html:112`, `public/daw.html:136`.
2. Web Audio engine creates an `AudioContext`, master gain, compressor, oscillator/noise voices, clip playback, transport clock, metronome, meters, and debug proof object. Evidence: `public/nexus-daw.js:83`, `public/nexus-daw.js:126`, `public/nexus-daw.js:270`, `public/nexus-daw.js:291`, `public/nexus-daw.js:402`, `public/nexus-daw.js:545`.
3. Arrangement model has five fixed tracks and a 16-beat grid. This is useful for a loop sketch but is not scalable session architecture. Evidence: `public/nexus-daw.js:21`, `public/nexus-daw.js:64`, `public/nexus-daw.js:581`, `public/nexus-daw.css:530`.
4. Region editing exists: select, split, duplicate, delete, quantize, undo, redo, mute, solo, arm. Evidence: `public/nexus-daw.js:745`, `public/nexus-daw.js:775`, `public/nexus-daw.js:796`, `public/nexus-daw.js:812`, `public/nexus-daw.js:826`, `public/nexus-daw.js:229`, `public/nexus-daw.js:245`, `public/nexus-daw.js:1357`.
5. Audio import accepts browser-selected audio, creates object URLs, decodes with `decodeAudioData`, places clips on the armed lane, and previews decoded clips. Evidence: `public/daw.html:67`, `public/nexus-daw.js:471`, `public/nexus-daw.js:485`, `public/nexus-daw.js:982`.
6. Microphone recording exists through `getUserMedia` and `MediaRecorder`, then turns the recording into a clip. Evidence: `public/nexus-daw.js:1109`, `public/nexus-daw.js:1142`, `public/nexus-daw.js:1153`.
7. MIDI is a thin Web MIDI note trigger, not a MIDI editor. Evidence: `public/nexus-daw.js:1175`, `public/nexus-daw.js:1181`, `public/nexus-daw.js:1193`.
8. Browser WAV mixdown exists, but it is mono, 16-bit, 44.1 kHz, fixed arrangement length, no plugin/effects graph, no offline render queue, and no server-side mastering. Evidence: `public/nexus-daw.js:1014`, `public/nexus-daw.js:1050`, `public/nexus-daw.js:1086`.
9. Project save stores a JSON project locally first, then tries gated `music-studio`. Clip audio buffers themselves are not persisted into the project. Evidence: `public/nexus-daw.js:1216`, `public/nexus-daw.js:1238`, `public/nexus-daw.js:1252`, `public/nexus-daw.js:1288`.
10. Export from the DAW is a local JSON manifest download. It does not queue the backend export worker from the DAW room. Evidence: `public/nexus-daw.js:1265`. Export Forge has backend `queueExport`; DAW does not call it. Evidence: `public/open-source-studio.js:287`.
11. The current paid posture is honest: DAW is free through 2026 and must keep the beta label visible. Evidence: `public/pricing-daw.html:20`, `public/pricing-daw.html:24`, `data/skyemusicnexus-pricing.json:221`.
12. Existing static smoke checks validate source markers and gated studio function behavior, but they do not prove audio timing, browser permissions, real clip playback, mobile layout, latency, or visual usability. Evidence: `smoke/open-source-studio-smoke.mjs:88`, `smoke/open-source-studio-smoke.mjs:187`.

## Missing Features Before Paid Serious DAW

1. Session persistence is not serious yet. Imported audio is local object URLs and decoded buffers; save records clip metadata only. Reopening a saved project cannot reconstruct the actual audio. Evidence: `public/nexus-daw.js:988`, `public/nexus-daw.js:993`, `public/nexus-daw.js:1238`.
2. Timeline is capped at `maxBeats = 16`. No arbitrary song length, zoom, scroll-scale editing, tempo map, time signatures, markers, sections, or arranger lanes. Evidence: `public/nexus-daw.js:21`, `public/nexus-daw.js:581`.
3. Audio engine is sketch-grade. It uses simple oscillators/noise, randomized meters, whole-clip playback, mono WAV render, and no sample-accurate scheduling, latency calibration, effects sends, buses, plugin chain, automation, freeze/bounce, or offline render farm. Evidence: `public/nexus-daw.js:567`, `public/nexus-daw.js:1019`, `public/nexus-daw.js:1050`.
4. Editing is shallow. No drag-resize/move, trim handles, fades, crossfades, slip edit, gain envelopes, warp/stretch, pitch shift, reverse, normalize, punch-in/out, comping, takes, or transient snapping.
5. MIDI is input-only. No piano roll, clips, quantize strength, velocity lane, sustain, note length, humanize, scale lock, MIDI export/import, instrument presets, or automation. Evidence: `public/nexus-daw.js:1181`.
6. Mixer is volume plus fake/rough meters. No pan, sends, inserts, EQ, compressor per track, limiter, LUFS, clipping analysis, reference track, sidechain, mono/stereo switching, groups, buses, or stems. Evidence: `public/nexus-daw.js:612`.
7. Collaboration is absent. No cloud session model, conflict resolution, comments, revision history, branch/restore, shared playhead, or role-scoped edits.
8. Backend render/transcode is not wired. Studio export job says it queues a manifest and explicitly needs ffmpeg/audio worker for real transcoding. Evidence: `netlify/functions/music-studio.js:68`, `netlify/functions/music-studio.js:78`, `cloudflare/worker.js:15842`.
9. Upload/R2 is related but separate. `music-assets` can store audio and later use R2 direct upload, but the DAW import path does not automatically promote clips into that gated asset store. Evidence: `netlify/functions/music-assets.js:533`, `netlify/functions/music-assets.js:639`, `public/nexus-daw.js:982`.
10. AI is not integrated into the DAW UI. Provider hooks exist elsewhere, but no assistant panel, no credit meter, no model-safe generation lane, no AI edit/apply diff, and no per-project model audit trail in `daw.html` or `nexus-daw.js`.

## AI Assistant Requirements

The DAW assistant should ship as a gated assistant panel and action queue, not as a raw chat box glued to the timeline.

Required assistant modes:

1. Project assistant: reads session metadata, track names, tempo/key, markers, selected regions, uploaded asset IDs, rights state, and budget. It suggests next edits without touching audio until the user confirms.
2. Arrangement assistant: generates section maps, chord/melody ideas, drum patterns, bass movement, transitions, and song structure. First output should be MIDI/region instructions, not expensive audio.
3. Audio assistant: stem cleanup, noise reduction, vocal tuning, tempo/key detection, beat grid, silence trim, fades, normalize, and rough mix notes. Expensive models must require credits and confirmation.
4. Generation assistant: prompt-to-loop, prompt-to-stem, prompt-to-song, vocal guide, ad-lib, harmony, drum fill, and sample variation. Must use queued jobs and model budgets.
5. Mix/master assistant: gain staging, EQ suggestions, loudness target, clipping detection, reference comparison, stem export, and final limiter preview. Must disclose that this is not formal mastering unless a mastering provider is connected.
6. Release assistant: converts DAW outputs into Release Forge metadata, rights checklist, split sheet, product/store draft, preview/full asset policy, and drop package.
7. Safety assistant: blocks public release when rights, consent, sample ownership, collaborator splits, takedown risk, or payment paperwork are incomplete.

Required assistant infrastructure:

1. Per-user and per-artist AI ledger with credits, cost class, provider path, model alias, action type, output artifact IDs, and owner/operator override.
2. Server-side budget checks before any provider call.
3. Concurrency locks by user, artist, project, and provider.
4. Idempotency keys for generation and transform requests.
5. Prompt/output receipt storage without returning raw secrets or raw provider keys.
6. "Apply" actions must write deterministic DAW project diffs, not mutate the timeline invisibly.
7. Owner/admin observability must show model cost, failure rate, abuse attempts, and per-tier usage.

## kAIxU-Only Model Exposure Rule

Rule: DAW users must never see or choose raw foundation-model IDs, provider keys, direct OpenAI/Stability/ElevenLabs routes, or unmetered model endpoints. The only user-facing choices should be product actions and quality/budget modes such as "idea", "loop", "stem cleanup", "artist cut", "mix notes", or "release pack".

Implementation requirements:

1. All model calls must route through the FS27/kAIxU gateway or a 0S server adapter that enforces the same ledger. Existing paid AI code already has the right shape: gateway bearer, `x-kaixu-app`, `x-skye-usage-lane`, and shared gate session headers. Evidence: `cloudflare/worker.js:3272`, `cloudflare/worker.js:3289`, `cloudflare/worker.js:3292`, `cloudflare/worker.js:3300`.
2. Browser code must call `/api/skymusicnexus/daw-assistant` or `/api/skymusicnexus/music-provider-hooks` through a DAW assistant action, not expose provider/model selection.
3. Existing provider hooks currently expose provider IDs and accept `model`/`modelId` from request bodies. Evidence: `netlify/functions/music-provider-hooks.js:204`, `netlify/functions/music-provider-hooks.js:245`, `cloudflare/worker.js:13916`, `cloudflare/worker.js:13925`. For self-serve DAW, that must be replaced with server-owned model aliases.
4. `generate-ai-song` and `create-ai-song` are already operator actions in the mounted 0S Worker, which is good. Evidence: `cloudflare/worker.js:12917`, `cloudflare/worker.js:13805`. Keep that for high-cost generation.
5. Standalone Netlify `music-provider-hooks.js` only requires a SkyGate token before generation. Evidence: `netlify/functions/music-provider-hooks.js:269`, `netlify/functions/music-provider-hooks.js:294`. If this function is ever exposed outside the mounted 0S Worker, add operator/entitlement/rate checks before live execution.
6. kAIxU model aliases should be server-configured: `kaixu.idea.small`, `kaixu.arrange.standard`, `kaixu.audio.cleanup`, `kaixu.audio.generate`, `kaixu.master.preview`. The gateway maps aliases to real providers/models internally.
7. The response should return `model_alias`, `usage_units`, `credit_cost`, `receipt_id`, and artifact IDs. It should never return provider secret names beyond redacted presence.

## FS27/Gate Implications

1. The 0S Worker gates `/SkyeMusicNexus` as a protected prefix and then gates by default for all non-entry paths. Evidence: `cloudflare/worker.js:19846`, `cloudflare/worker.js:19857`, `cloudflare/worker.js:20372`, `cloudflare/worker.js:20465`.
2. Browser DAW save uses shared gate bearer discovery through `createSkyGateAuth`. Evidence: `public/skygate-auth.js:19`, `public/skygate-auth.js:62`, `public/nexus-daw.js:1294`.
3. App-local identity is disabled and correctly points back to FS27/SkyGate/Free99. Evidence: `netlify/functions/_lib/local-identity.js:3`, `netlify/functions/_lib/local-identity.js:11`.
4. Netlify studio function requires SkyGate on GET/POST. Evidence: `netlify/functions/music-studio.js:91`, `netlify/functions/music-studio.js:108`.
5. Mounted 0S API uses `requireMusicAccess`, with operator-only treatment for expensive/mutating actions. Evidence: `cloudflare/worker.js:13787`, `cloudflare/worker.js:13799`.
6. For paid DAW, local fallback save should remain only as draft safety. Premium features must fail closed without a shared gate session, active entitlement, and credit budget.
7. Do not add DAW founder/admin passwords, artist passwords, or local admin tokens. Owner/admin surfaces must use shared 0S operator/session helpers.

## Monetization And Rate Limits

Current pricing says DAW beta is $0 through 2026. Keep that.

Recommended tiers:

| Tier | Price posture | DAW feature access | AI/model access | Hard limits |
| --- | --- | --- | --- | --- |
| Free99 / DAW Beta | $0 through 2026 | Local DAW, import, mic/MIDI where browser supports it, local manifest, limited project save | No live kAIxU generation; deterministic helper text only | 3 cloud projects, 250 MB gated asset storage, 0 audio generations, 10 local assistant suggestions/day |
| Artist Host | Existing $9/mo lane | Cloud project save, Upload Studio handoff, Release Forge queue, basic asset vault | kAIxU text/arrangement assistant only | 20 assistant calls/mo, 5/day, 1 concurrent, no full audio generation |
| Artist Collective | Existing $29/mo + setup lane | 5 artists, shared projects, split sheets, queue/export, private delivery | Text/arrangement plus limited cleanup/mix notes | 100 assistant calls/mo, 20/day, 2 concurrent, 2 short audio transforms/mo |
| Managed Music Ops | Existing $99/mo + setup lane | Operator-assisted production, release packaging, priority queue | Owner/operator-approved generation | 300 assistant calls/mo, 50/day, 3 concurrent, provider budget cap per client |
| Song Draft / Artist Cut / Release Pack | One-time $23/$49/$99 | Not DAW access; paid creation job attached to project | Generation allowed only after checkout | Per purchase: 1/2/1 generation package respectively; retry rules explicit |
| Brain / Label Pack | $497+ scoped | Label/project workspace | Owner-approved model budget | Contracted cap, manual approval, per-job ceiling |

Mandatory rate-limit mechanics:

1. Per gate identity: requests/minute, requests/day, monthly credits.
2. Per artist/project: generation concurrency and total monthly provider spend.
3. Per action class: text suggestion cheap, arrangement medium, audio transform high, full song generation highest.
4. Per provider/model alias: queue depth, failure circuit breaker, cooldown on 429/402/quota errors.
5. Per IP/session: abuse throttle even with a valid gate token.
6. Owner kill switch: disable all live generation, allow deterministic/local assistant only.
7. Budget preflight: calculate cost before provider call; require confirmation for anything over the included tier.
8. Receipt-after-call: write usage and artifact IDs even on failure so repeated retries cannot hide cost.

Suggested default caps:

- Text assistant: 5/minute burst, 30/day Free99 local-only, 100/day paid max.
- Arrangement/MIDI draft: 2/minute, 20/day paid.
- Audio cleanup/transform: 1 active job per project, 5/day Artist Collective, 15/day Managed Ops.
- Full audio generation: no Free99 or Artist Host self-serve; one active job per artist; retry only when provider failure is non-billable or owner-approved.
- Model spend cap: $0 Free99, $5/month Artist Host, $25/month Artist Collective, scoped cap for Managed/Label. Stop at 80% warning and 100% block.

## Priority Roadmap

P0 - Protect money and claims before adding AI:

1. Add a DAW assistant API contract that accepts action aliases, not raw model/provider names.
2. Add AI entitlement, credit ledger, rate limiter, idempotency keys, and provider circuit breakers.
3. Lock live audio generation behind operator approval or paid checkout.
4. Add a DAW project schema version with persisted asset IDs, not only clip names/sizes.
5. Make DAW save fail visibly when cloud save is not authenticated, while keeping local draft safety.

P1 - Make it a credible paid beta:

1. Promote imported clips to gated `music-assets` storage on save or explicit "upload project audio".
2. Restore projects with audio asset references.
3. Add timeline drag/move/resize/trim, zoom, scroll, markers, sections, arbitrary length.
4. Add pan, mute/solo/arm persistence, per-track meters, clip gain, fades, and master limiter.
5. Add backend export queue from DAW: MP3 preview, WAV master, stem archive, release-forge line.

P2 - Serious DAW core:

1. Add sample-accurate scheduling and `OfflineAudioContext` render.
2. Add piano roll, MIDI clips, velocity, quantize strength, humanize, MIDI import/export.
3. Add audio warp/stretch, pitch shift, key/tempo detection, and transient detection.
4. Add effects rack: EQ, compressor, reverb, delay, saturation, limiter.
5. Add revisions, autosave, cloud project locks, comments, and collaborator roles.

P3 - AI DAW:

1. Assistant side panel with selected-track awareness and "apply as diff".
2. Prompt-to-loop and prompt-to-stem with kAIxU alias controls.
3. Stem separation, vocal cleanup, auto-mix, mastering preview, and release readiness score.
4. Split/right/consent assistant before public export.
5. Model observability dashboard for owner: cost, failures, usage, abuse, artifacts.

## Top Findings

1. The DAW is real beta software, but not serious paid DAW software.
2. The current strongest parts are the first-party UI, Web Audio sketching, clip import/decode/preview, mic recording, Web MIDI trigger, region edits, local loop packs, and gated project save.
3. The biggest technical gap is durable audio/project persistence. The saved project has clip metadata but not reconstructable clip audio.
4. The timeline is capped to 16 beats and cannot support serious full-song production.
5. Mixdown is a browser mono WAV render from a simple internal model, not a production export/mastering path.
6. Export Forge can queue backend export manifests, but the DAW's own Export button downloads local JSON only.
7. Provider hooks exist, but they must not become user-facing raw model/provider controls.
8. The mounted 0S Worker correctly keeps high-cost AI generation as operator-gated, but the standalone provider function needs the same entitlement/rate discipline if exposed.
9. FS27/Gate posture is mostly correct: shared gate, no app-local identity, protected 0S prefix, local identity disabled.
10. Monetization should stay: free DAW beta, paid release/storage/ops, and tightly metered kAIxU assistant credits.
