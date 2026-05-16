# Neon Rift Blocks: Gravity Protocol v13

A phone-first installable falling-block arcade game built as a premium mobile web/PWA product. v13 is the final release-candidate pass: it adds the Final Pass Console, player-first release oath, Founder Kit cosmetics, wellness reset, release checklist, and annual-value readiness layer on top of the existing Mood Mastery, Crown Trials, Weekly Curator, Run Receipts, Skill Matrix, Challenge Forge, Protocol, analytics, league, codex, ritual, relic, campaign, sanctuary, and mood-audio systems.

## What makes this worth $13/year

- Offline installable phone-first gameplay with touch gestures, hold, ghost, rift surge, power cores, and multiple modes.
- Mood Audio Deck with original embedded ambience loops and independent Mood Mastery progression.
- Zen Flow and comfort controls for long relaxed sessions, not just high-stress arcade play.
- Daily/weekly retention: Signal Chest, Rift Weather, Focus Cards, contracts, Season Vault, Weekly League, and Challenge Forge.
- Long-term progression: Rank, shards, cosmetics, relics, companions, chronicles, protocol lessons, campaign map, sanctuary, prestige, founder score, and profile backup.
- v13 commercial polish: Final Pass Console, release checklist, player-first annual promise, Founder Kit, wellness break loop, and value scoring.

## Files

- `index.html` — mobile-first game shell
- `styles.css` — responsive neon UI and comfort/mobile styles
- `game.js` — complete local runtime
- `manifest.webmanifest` — installable PWA metadata
- `sw.js` — offline service worker cache
- `assets/audio/*.wav` — original offline mood loops
- `operator/deployment-command-center.html` — internal setup/testing walkthrough
- `proof/runtime-smoke.js` — mocked browser runtime smoke test
- `proof/VALIDATION.md` — validation record
- `website-download-snippet.html` — install CTA for your website

## Local test

```bash
npm install
npm run check
npm run smoke
npm run serve
```

Open `http://localhost:4173` on a phone on the same network or deploy to HTTPS for real PWA install testing.

## Deployment

Upload the folder to any static host with HTTPS. PWA install prompts require a secure origin. iPhone users install through Safari → Share → Add to Home Screen. Android users should see the install prompt after the browser accepts the manifest/service worker.

## Final proof boundary

This package validates static JS syntax, runtime boot in a mocked browser, file inventory, service-worker asset references, and zip integrity. Real product proof still requires live HTTPS deployment and physical iOS/Android testing for audio unlock, install behavior, touch feel, and long-session balance.
