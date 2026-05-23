# UPGRADE_NOTES_v1_7.md

## Goal

Convert SkyeArcade from a strong local anthology into a stickier, return-worthy platform layer without adding auth, backend dependencies, payment systems, or fake online claims.

## Added

✅ Vault Command Center for recommended next action, daily reward, weekly conquest target, and Crown Trial routing.  
✅ Daily streak tracking with best streak and local reward claim.  
✅ Weekly Conquest with five rotating local targets.  
✅ Crown Prestige with permanent Crown Rank and reward scaling.  
✅ Milestone Matrix for mastery, boss, weekly, and prestige progress.  
✅ PWA install button support through `beforeinstallprompt`.  
✅ Upstream-ready bridge object at `window.SkyeArcadeVault`.  
✅ Browser event bridge using `skyearcade:vault-event`.  
✅ v1.7 achievements for streaks, weekly conquest, prestige, command center use, daily claim, bridge events, and engagement engine.  
✅ Updated Playwright smoke harness to include v1.7 panels.

## No-auth position

No login, registration, user table, provider SDK, or session handling was added. The app remains local-first and static. Future upstream auth can read/export/import state through the bridge without rewriting the game layer.
