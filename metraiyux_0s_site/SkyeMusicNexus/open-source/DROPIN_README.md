# SkyeMusicNexus Open Source Creation Studio Drop-In

This is a drop-in patch for the existing live SkyeMusicNexus NeoFront structure.

It adds a real open-source creation lane instead of rebuilding the artist platform shell.

## Added files

```txt
SkyeMusicNexus/public/create.html
SkyeMusicNexus/public/open-source-studio.css
SkyeMusicNexus/public/open-source-studio.js
SkyeMusicNexus/public/open-source-nav-snippet.html
SkyeMusicNexus/src/open-source-studio-contract.json
SkyeMusicNexus/open-source/open-source-manifest.json
SkyeMusicNexus/open-source/scripts/install-open-source-engines.sh
SkyeMusicNexus/docs/SKYE_MUSIC_NEXUS_OPEN_SOURCE_DROPIN.md
SkyeMusicNexus/OPEN_SOURCE_PROOF_STATUS.md
netlify/functions/music-studio.js
```

## Install

Copy these files into the existing repo, preserving paths.

Add this nav item to the existing platform navs:

```html
<a href="./create.html">Create</a>
```

Install open-source engines:

```bash
bash SkyeMusicNexus/open-source/scripts/install-open-source-engines.sh
```

Then open:

```txt
/SkyeMusicNexus/public/create.html
```

## Engine plan

- openDAW: browser DAW bridge.
- Ardour: desktop professional DAW companion.
- LMMS: beat/MIDI/synth companion.
- Audacity: waveform cleanup companion.

## Function plan

`netlify/functions/music-studio.js` handles gated studio project saves, export manifests, and engine records.

Move its `/tmp` proof ledger to Citadel/Postgres for production.
