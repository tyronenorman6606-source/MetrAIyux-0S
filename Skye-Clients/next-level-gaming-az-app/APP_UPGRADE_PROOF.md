# Next Level Gaming AZ App Proof

Status: local preview build proofed and factory-packaged.

Source URL studied:

- https://www.nextlevelgamingaz.com/
- https://www.nextlevelgamingaz.com/card-shop
- https://www.nextlevelgamingaz.com/new-releases-and-events
- https://www.nextlevelgamingaz.com/faq

Public app routes:

- `/index.html`
- `/events.html`
- `/shop.html`
- `/quote.html`
- `/scan.html`

Private app route:

- `/preview.html`

What this app includes:

- App-first weekly tournament board with day filters.
- QR-ready scan route.
- Event request form with local preview ledger and email handoff.
- PWA manifest, service worker, offline route, and install prompt.
- Private preview room with local workspace notes.
- Local copies of selected Next Level Gaming public-site media assets.
- GSAP, ScrollTrigger, Lenis, neon scrollbar, cursor glow, text effects, and living canvas background.

Verification completed on 2026-05-18:

- Ran `npm run mcp:mine -- Skye-Clients/next-level-gaming-az-app` before and after implementation.
- Ran `npm run smoke` from this folder.
- Served this folder at `http://127.0.0.1:4188/`.
- Ran desktop/mobile Playwright proof with screenshots and canvas/runtime checks.
- Ran the client app factory flow for `next-level-gaming-az`.
- Synced the deployable factory package to `client-app-factory/client-apps/next-level-gaming-az`.

Proof artifacts:

- `MCP_TOOLING_RECEIPT.json`
- `test-artifacts/next-level-gaming-az-app/browser-proof.json`
- `test-artifacts/next-level-gaming-az-app/desktop-home.png`
- `test-artifacts/next-level-gaming-az-app/desktop-request.png`
- `test-artifacts/next-level-gaming-az-app/mobile-home.png`

Factory caveat:

- The factory scanner is still Empire-specific, so it was skipped for this client. The Next Level record uses MCP, smoke, and browser workflow proof instead.
