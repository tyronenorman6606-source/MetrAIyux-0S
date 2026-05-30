# Gray Skyes Pickup Note

Date: 2026-05-23

Local surface:

- `http://127.0.0.1:5177/`
- Current folder: `.1/gray-skyes-agent-universe`

## Current State

- Gray has the routed universe pages: hub, catalog, video rooms, gallery, release, 0S core, live, dashboard.
- The catalog has 15 kept audio drops wired through `data/tracks.json`.
- The exact duplicate `HANDS UP MIX 1 SCOOTER .mp3` remains excluded.
- The video room has 9 local videos wired through `data/videos.json`.
- The homepage now has the playable floating song orbit.
- The homepage now carries a PWA approval sidebar that points to the Nexus artist app lane, video loops, and artist controls. When the universe is approved, turn Gray into an installable app drop through the SkyeMusicNexus Artist Apps/Drops lane.
- The homepage is mid-upgrade toward the SupaBoy first-viewport standard with:
  - `.stage-canvas`
  - `#floatingVideoWorld`
  - `.video-float-card`
  - `#heroStageVideo`
  - video stage controls
  - neon scroll rail setup

## Live Compare Snapshot

The direct SupaBoy vs Gray compare before the latest hero-stage patch showed the real gap:

- SupaBoy: `stageCanvas: true`, `videoCards: 6`, `musicSurfaces: 5`, `neonRail: true`
- Gray: `stageCanvas: false`, `videoCards: 0`, `musicSurfaces: 15`, `neonRail: false`

That is why the Gray build still did not feel like SupaBoy even after routes and song orbs were added.

## Restart Here

Continue from the hero-stage/video-orbit patch, not from the older one-page design.

## 2026-05-24 Repair Direction

- Root landing must use the SupaBoy-style first-viewport artist hero instead of the prior long-scroll hub.
- The heavy orbiting video universe stays on `hero-video-universe.html`, not the initial load.
- The playable song orbit moves to `orbit.html` so Gray remains a multi-page artist build.
- Older Gray universe content is preserved through `field-notes.html` instead of being dropped.
- Reusable source now lives under `src/gray-orbit-hero.jsx` with the generated browser bundle in `assets/gray-orbit-hero.js`.

Immediate next tasks:

1. Finish lazy-loading the floating video cards so all 9 videos do not load at once.
2. Confirm the first viewport reports:
   - `stageCanvas: true`
   - `videoCards: 9`
   - `songOrbs: 15`
   - `neonRail: true`
3. Run the SupaBoy compare again and save a receipt under `test-artifacts/gray-supaboy-live-compare/`.
4. Run the multi-pass MCP discipline:
   - mine/reference pass
   - Merser/Mercer world pass
   - Merser/Mercer interaction pass
   - Merser/Mercer media-surface pass
   - SKrucible text/nav/chrome pass
   - final mine/proof pass
7. If approved for app delivery, package Gray through the new MusicNexus app-drop lane with manifest, service worker, share controls, social links, video loops, and Nexus return paths.
5. Finish the SKrucible chrome:
   - side/header/dock polish
   - draggable neon scrollbar
   - cursor trail
   - text treatment
   - responsive control layout
6. Re-run route, media, and browser checks.

## Important Visual Rule

Do not place `gray-cutout.png` beside a nearly identical source photo. The cutout belongs in the song orbit or abstract stage layers, not next to its matching image.

## 0S Connection Rule

This artist universe is not supposed to be an isolated website. Every surface should route into a purpose:

- catalog and release packaging
- video rooms and branded promo loops
- gallery/press assets
- live/booking
- 0S founder lane
- dashboard/title control
- future Nexus/artist-ID upload and fan access paths

Nothing should be decorative only.
