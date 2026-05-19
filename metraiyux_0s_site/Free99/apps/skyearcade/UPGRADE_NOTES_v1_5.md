# SkyeArcade Sovereign Vault v1.5.0 Upgrade Notes

This pass implements the full requested upgrade stack without adding auth, backend calls, paid services, or external APIs. The build remains static and Netlify-drop-ready.

## Added systems

- **Crown Trials**: a ten-game sequential campaign mode across every vault door.
- **Blessing/Curse choices** between Crown Trial wins.
- **Difficulty tiers**: Normal, Pressure, Nightmare, and Sovereign.
- **Named boss challenges** for all ten games.
- **Tutorial panels** for all ten games, controlled by a setting toggle.
- **Vault Journal / Run History** storing the last 20 local runs.
- **Victory share cards** generated as PNGs with browser canvas.
- **Expanded WebAudio FX** for open, win, loss, relic, boss, and share-card actions.
- **Save resilience** with a local backup slot, recovery button, and backup export.
- **Mobile-first layout hardening** for overlays, panels, tap controls, cards, and canvas surfaces.

## New achievements

- Crown Trial Ascendant
- Sovereign Crown Trial
- Vault Scholar
- Boss Slayer
- Boss Clean Sweep
- Run Historian
- Share Card Forged
- Reliquary Recovery
- Nightmare Crown
- Sovereign Crown

## Boss roster

1. SkyeAce: The Blind Dealer
2. SoveReign13: The Blackout Swarm
3. Veyra3.1: The Latency Serpent
4. SceptR: The 404 Hydra
5. Reliquary: The Deletion Warden
6. Kōatsu Seija: The Mirror
7. Skyes Over London: The Ghost Client
8. NorthStar: The Deadline Court
9. SkyeOS: The Kernel Phantom
10. VantaCore: The Churn Engine

## Hardening notes

- No auth was added.
- No backend was added.
- No fake multiplayer was added.
- Save import migration now preserves Crown Trials, boss state, tutorials seen, run history, and prior v1.4 fields.
- Persist now writes a backup copy before overwriting the active save key.
- Losses now record to the Vault Journal and affect Crown Trial lives.
- Wins now record difficulty, boss state, Crown Trial context, relic names, and rewards.
