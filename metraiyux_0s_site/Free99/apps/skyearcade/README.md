# SkyeArcade: Sovereign Vault v1.8.1

Ten playable browser game cores in one local-first anthology by Skyes Over London. This package is static, Netlify-drop-ready, PWA-capable, and intentionally has no auth layer. It is designed to inherit upstream SkyGate/Omega identity later through bridge events and save import/export without blocking the current local-first game experience.

## What changed through v1.8.1

- Added **Vault Command Center** with one-tap recommended actions.
- Added **daily streak tracking** and a local **Daily Reliquary reward chest**.
- Added **Weekly Conquest**: five rotating local target games each week.
- Added **Crown Prestige** with permanent local Crown Rank and reward scaling.
- Added **Milestone Matrix** for mastery, bosses, weekly conquest, and Crown Rank visibility.
- Added a browser **PWA install prompt button** when the environment supports install.
- Added **upstream bridge events** through `window.SkyeArcadeVault` and `skyearcade:vault-event`.
- Added new achievements for streaks, weekly conquest, prestige, command center usage, reward claims, bridge events, and the engagement engine.
- Updated the Playwright proof harness to verify the new v1.7 platform panels.
- Integrated approved main logo artwork, PWA PNG icons, and ten child-game SVG emblems.
- Added the public SEO landing layer from v1.8.0: `/` is now the public landing page and `/app.html` is the playable vault app.
- Added ten game SEO pages under `/games/`, plus `proof.html`, `robots.txt`, `sitemap.xml`, `llms.txt`, `llms-full.txt`, and `ai.md`.
- v1.8.1 README patch: added the production-domain replacement note so deploy links do not get forgotten.

## Existing systems retained

- Ten playable game cores.
- Vault Map campaign.
- Five staged level packs per game.
- Earned cosmetic shop.
- Three local save slots.
- First-launch local onboarding.
- Local-only Vault Analytics.
- Daily Vault Contracts.
- Vault Gauntlet.
- Crown Trials.
- Named boss challenges.
- Vault Armory relics.
- Lore Codex.
- Tutorial overlays.
- Vault Journal / run history.
- Victory share-card PNG generation.
- Shared local save system.
- Shared XP, coins, wins, records, achievements, and recent-game state.
- Motion and sound toggles.
- PWA manifest and service worker.
- Netlify hardening files.
- No auth and no backend.

## Games included

1. SkyeAce: Battle Spades Arena
2. SoveReign13: Uptime War
3. Veyra3.1: DNS Dominion
4. SceptR: Release Commander
5. Reliquary: Artifact Runner
6. Kōatsu Seija: Pressure Awakened
7. Skyes Over London: Lead Hunter
8. NorthStar: Case Desk
9. SkyeOS: Desktop Quest
10. VantaCore: Operator Wars

## Deploy

Drop the contents of this folder onto Netlify, or push the folder to a Git repo connected to Netlify. The project is pure static HTML/CSS/JS and needs no build command.

## Production URL replacement note

The SEO and AI-discovery files currently use this placeholder production origin:

```text
https://skyearcade.skyesoverlondon.com
```

Before deploying to a different live domain, replace that origin everywhere it appears in:

- `sitemap.xml`
- `robots.txt`
- `ai.md`
- `llms.txt`
- `llms-full.txt`
- `index.html`
- `proof.html`
- `games/*.html`

Example replacement:

```bash
python3 - <<'PY'
from pathlib import Path
old = "https://skyearcade.skyesoverlondon.com"
new = "https://YOUR-LIVE-DOMAIN.com"
files = list(Path('.').glob('*.html')) + list(Path('games').glob('*.html')) + [
    Path('sitemap.xml'),
    Path('robots.txt'),
    Path('ai.md'),
    Path('llms.txt'),
    Path('llms-full.txt'),
]
for path in files:
    if path.exists():
        path.write_text(path.read_text().replace(old, new))
PY
```

After replacement, deploy the site and submit the deployed `/sitemap.xml` in Google Search Console and Bing Webmaster Tools. Keep `/llms.txt`, `/llms-full.txt`, and `/ai.md` live at the domain root so AI crawlers and answer engines can read the clean markdown index.


Netlify settings:

- Build command: leave blank
- Publish directory: `/`
- Node version: not required for runtime

## Local run

```bash
python3 -m http.server 8888
```

Then open `http://localhost:8888`.

## Direct game links

Use hash links to open a game directly after load:

- `/#skyeace`
- `/#uptime`
- `/#dns`
- `/#scepter`
- `/#reliquary`
- `/#koatsu`
- `/#leads`
- `/#caseDesk`
- `/#desktopQuest`
- `/#vanta`

## Upstream platform bridge

No auth UI is included. For future upstream sync, the app exposes a local bridge:

```js
window.SkyeArcadeVault.getState()
window.SkyeArcadeVault.exportSave()
window.SkyeArcadeVault.importSave(json)
window.SkyeArcadeVault.openGame('uptime')
window.SkyeArcadeVault.claimDailyReward()
window.SkyeArcadeVault.startCrownTrial()
```

The app also emits browser events:

```js
window.addEventListener('skyearcade:vault-event', event => {
  console.log(event.detail)
})
```

Event types include `game-opened`, `game-won`, `game-lost`, `save-exported`, `save-imported`, `external-save-imported`, and `pwa-installed`.

## Save behavior

The app stores progress in localStorage under `skyearcade.sovereignVault.v1`. It also keeps a backup slot under `skyearcade.sovereignVault.backup.v1` before overwriting the active save. Use **Recover Backup** in the profile panel if the active save gets damaged.

## Live proof harness

A Playwright smoke harness is included in `tests/vault-smoke.spec.js`. After installing dev dependencies, run:

```bash
npm install
npm run test:smoke
```

For deployed proof, set:

```bash
BASE_URL=https://your-netlify-site.netlify.app npm run test:smoke
```
