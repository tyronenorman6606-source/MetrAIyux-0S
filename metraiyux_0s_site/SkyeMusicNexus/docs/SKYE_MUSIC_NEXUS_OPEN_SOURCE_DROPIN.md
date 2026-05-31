# SkyeMusicNexus Native Creation Stack

This document now tracks the first-party creation lane.

## Current Rooms

- `public/daw.html` — DAW command room.
- `public/daw.html` — native fullscreen SkyeMusicNexus DAW.
- `public/stems.html` — stem, bounce, master, and reference staging.
- `public/exports.html` — project packet, export queue, and Release Forge handoff.
- `public/discover.html` — playlist/release discovery.
- `public/feed.html` — social feed and provider connector proof.
- `netlify/functions/music-studio.js` — gated studio project and export ledger.

## Native DAW V1

The DAW is first-party Nexus code in `public/nexus-daw.js` and `public/nexus-daw.css`. It includes:

- transport controls
- BPM/key controls
- arrangement timeline
- track mute/solo/arm controls
- audio clip import/decode/preview
- mixer level controls
- drum pads
- synth keys
- physical computer keyboard notes
- region select/split/duplicate/delete/quantize
- undo/redo edit history
- loop and metronome toggles
- local loop-pack insertion
- microphone recording path
- Web MIDI connection path
- browser WAV mixdown export
- local/SkyGate project save
- JSON release manifest export

## Hard Boundary

The Nexus DAW route must not contain a third-party iframe, external DAW bridge, or vendored DAW source.
