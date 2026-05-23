# PROOF.md — SkyeArcade Sovereign Vault v1.7.1

## Scope

This package continues v1.6 into an irreplaceable-app pass. It remains static, drop-ready, no-auth, and backend-free.

## Implemented v1.7 Systems

✅ Vault Command Center with recommended next game, daily chest, weekly target, and Crown Trial controls.  
✅ Daily play streak tracking with current streak, best streak, and claimable local reward.  
✅ Weekly Conquest board with five rotating local targets and progress tracking.  
✅ Crown Prestige with permanent local Crown Rank, requirements, history, and reward scaling.  
✅ Milestone Matrix showing mastery, boss defeats, weekly progress, and Crown Rank.  
✅ PWA install button wired to `beforeinstallprompt` when supported by the browser.  
✅ Upstream-ready `window.SkyeArcadeVault` bridge with get/export/import/open/claim/start methods.  
✅ Local browser event bridge through `skyearcade:vault-event`.  
✅ New v1.7 achievements for streaks, weekly conquest, prestige, command center, daily reward, bridge events, and engagement engine.  
✅ Playwright smoke harness updated to verify command center, weekly, prestige, and milestone panels.  
✅ PWA/service worker and package metadata bumped to v1.7.1.
✅ Approved main logo artwork exists at `assets/sovereign-vault-main-logo.png`.
✅ Ten child-game SVG emblems exist under `assets/game-logos/`.

## Existing Proof-Carrying Systems Retained

✅ Ten playable game cores.  
✅ Vault Map campaign.  
✅ Five staged level packs per game.  
✅ Earned cosmetic shop.  
✅ Three local save slots.  
✅ First-launch local onboarding.  
✅ Local-only Vault Analytics panel.  
✅ Daily Vault Contracts.  
✅ Vault Gauntlet.  
✅ Crown Trials.  
✅ Named boss challenges.  
✅ Run history.  
✅ Victory share-card PNG generation.  
✅ Backup recovery and export.

## Checks Run in Sandbox

✅ `node --check app.js` passed.  
✅ Static feature-string verification passed for v1.7.1, Vault Command Center, Weekly Conquest, Crown Prestige, Milestone Matrix, bridge object, and service worker cache.  
✅ Required deploy files present: `index.html`, `app.js`, `styles.css`, `manifest.webmanifest`, `sw.js`, `_headers`, `_redirects`, `netlify.toml`.  
✅ Local HTTP asset smoke passed for `index.html`, `app.js`, `styles.css`, `manifest.webmanifest`, and `sw.js`.  
✅ Zip integrity test passed after packaging.

## Honest Limitation

☐ Full browser click-smoke is still not claimed from this sandbox. Prior Chromium attempts were blocked/timed out by the environment. Use the included Playwright harness locally or against the live Netlify/Cloudflare URL for real browser proof.


## v1.8.0 Landing + SEO + AI Discovery Proof

✅ Root `/` is now a public product landing page.
✅ Playable vault app preserved at `/app.html`.
✅ Ten ranking-focused game pages added under `/games/`.
✅ `robots.txt`, `sitemap.xml`, `llms.txt`, `llms-full.txt`, `ai.md`, and `proof.html` added.
✅ Landing page includes SoftwareApplication and FAQPage JSON-LD.
✅ Game pages include VideoGame JSON-LD.
✅ `npm run test:seo` passes in this package.
☐ Live Search Console sitemap submission is not performed inside this sandbox.
☐ Live deployed browser click-smoke is not claimed from this sandbox.
