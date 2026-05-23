# 0S SkyGate Platform

This folder makes SkyGate a platform surface inside `metraiyux_0s_site`. The former repo-root `SkyeGateFS27` folder was moved here so 0S has one gate source of truth.

What lives here:

- `index.html` is the 0S gate control surface.
- `gate-platform.js` renders the active 0S/SkyGate session, gate cards, and browser-local event ledger.
- `../assets/js/0s-gate-card-bridge.js` is the shared browser bridge apps use for gate-card auth headers.
- `source/SkyeGateFS27/` is the authoritative moved gate source, including the installed dependency folder that existed in the former root gate.
- `SKYGATE_0S_MIRROR_MANIFEST.json` records the move, verified counts, and what surfaces were rewired.

There should not be a second runnable gate folder at repo root. 0S owns SkyGate from this folder.
