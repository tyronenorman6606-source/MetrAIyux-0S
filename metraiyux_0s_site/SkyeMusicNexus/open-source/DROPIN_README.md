# SkyeMusicNexus Native Creation Stack

The old third-party DAW sidecar path has been removed from this Nexus folder.

Current creation rooms:

```txt
public/create.html
public/daw.html
public/nexus-daw.css
public/nexus-daw.js
public/stems.html
public/exports.html
public/discover.html
public/feed.html
netlify/functions/music-studio.js
```

## Native DAW V1

`public/daw.html` is a first-party fullscreen Nexus DAW surface. It includes transport, tempo/key controls, arrangement timeline, track controls, clip import/decode/preview, mixer levels, drum pads, synth keys, physical keyboard notes, region editing, undo/redo, loop/metronome toggles, local loop packs, mic/Web MIDI hooks, browser WAV mixdown, local project save, and Release Forge manifest export.

## Boundary

No vendored third-party DAW source or iframe bridge belongs in the Nexus DAW route.
