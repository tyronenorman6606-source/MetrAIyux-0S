# SkyeMusicNexus Open Source Creation Studio Drop-In

This patch is built for the live SkyeMusicNexus shape:

```txt
SkyeMusicNexus/public/index.html
SkyeMusicNexus/public/upload.html
SkyeMusicNexus/public/player.html
SkyeMusicNexus/public/releases.html
SkyeMusicNexus/public/rights.html
SkyeMusicNexus/public/exchange.html
SkyeMusicNexus/public/admin.html
SkyeMusicNexus/public/neo-nexus.css
SkyeMusicNexus/public/neo-nexus.js
netlify/functions/music-assets.js
netlify/functions/music-releases.js
netlify/functions/music-exchange.js
```

It does not replace those rooms. It adds:

```txt
SkyeMusicNexus/public/create.html
SkyeMusicNexus/public/open-source-studio.css
SkyeMusicNexus/public/open-source-studio.js
netlify/functions/music-studio.js
SkyeMusicNexus/src/open-source-studio-contract.json
SkyeMusicNexus/open-source/open-source-manifest.json
SkyeMusicNexus/open-source/scripts/install-open-source-engines.sh
```

## What this solves

Your existing platform already handles gated upload, player, release forge, rights gates, exchange, operator stage, and proof boundaries.

This drop-in adds the missing creation lane:

- openDAW bridge
- project/session ledger
- local stem staging
- sample pack rail
- export manifest queue
- Release Forge handoff line
- open-source engine ledger
- Netlify function boundary for studio project writes

## Install

Copy the files into your existing repo at the same paths.

Then add a nav link to `create.html` anywhere your room nav appears:

```html
<a href="./create.html">Create</a>
```

## Pull the open-source engines

```bash
bash SkyeMusicNexus/open-source/scripts/install-open-source-engines.sh
```

## Runtime posture

The new `music-studio.js` function requires a bearer token or `x-skygate-session` header.

By default it stores proof ledger data in `/tmp`, which is suitable for local/function proof only. Move this to Citadel/Postgres/SkyeVault/R2 for production durability.

## What it does not claim

This patch does not claim:

- live DSP distribution
- real royalty settlement
- real payout movement
- formal legal review
- production DMCA-agent operations
- durable large-catalog storage
- ownership over open-source DAW code

## Correct architecture

```txt
Create Studio
  -> openDAW bridge / external engine
  -> stem staging
  -> studio session ledger
  -> export manifest
  -> Release Forge
  -> Rights Vault
  -> Music Player
  -> Operator Stage
```
