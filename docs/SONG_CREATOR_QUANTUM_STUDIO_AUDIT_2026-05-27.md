# SkyeMusicNexus Song Creator Canvas Audit

Date: 2026-05-27
Surface: `metraiyux_0s_site/SkyeMusicNexus/song-creator/`

## Product Thesis

The Song Creator is one creation canvas. The user should not feel like they are moving through dashboard blocks. They should see the song forming, write directly into kAIxU, adjust the packet, and launch through FS27/SkyePay from one connected working surface.

## Required Shape

1. `make-surface`: the main creative surface.
2. `song-canvas`: the live song object and cover-like formation.
3. `composer-shell`: the attached kAIxU composer with title, prompt, parameters, lyrics, and splits.
4. `properties-panel`: compact launch properties with quote, kAIxU route, estimate, FS27/SkyePay, queue, assist, and output.
5. `asset-tray`: bottom tray for Lane, Model, Assets, and Receipts.
6. Existing IDs stay intact so the real estimate, assist, draft, order, queue, record, deliverable, and packet flows continue.

## Fail Conditions

- Fails if old named shells return.
- Fails if the prompt feels like a disconnected form.
- Fails if the song object is not visually dominant.
- Fails if controls are only decorative.
- Fails if public text exposes raw AI providers instead of kAIxU.
- Fails if mobile controls clip, overlap, or force horizontal scrolling.

## Verification Gates

- `node --check metraiyux_0s_site/cloudflare/worker.js`
- `node --check metraiyux_0s_site/SkyeMusicNexus/song-creator/song-creator.js`
- `node --check metraiyux_0s_site/SkyeMusicNexus/song-creator/service-worker.js`
- `node metraiyux_0s_site/tests/skyemusicnexus-song-creator-proof.mjs`
- `node metraiyux_0s_site/tests/skyemusicnexus-pricing-hub-proof.mjs`
- Active-file scan for rejected skeleton text, provider-name leaks in public song creator files, and MCP browser chrome.
- Direct HTTP smoke after deploy for canvas markers, FS27, SkyePay, clean service worker, and public `song-creation-bin` 404 guard.
