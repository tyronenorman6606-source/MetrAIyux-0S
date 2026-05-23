# Sovereign Client App Factory Proof

Generated: 2026-05-17

## 2026-05-20 As You Wish SignIn Pro + Color Repair Proof

The As You Wish Pottery Westgate app was rebuilt from the factory generator, republished into the 0S shell, and redeployed after the public page needed a warmer pottery-specific headline color system and the workspace language needed to say `SignIn Pro by NorthStar`, not a standalone NorthStar app.

Production URLs:

- `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/client-app-factory/client-apps/as-you-wish-pottery-westgate/`
- `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/client-app-factory/client-apps/as-you-wish-pottery-westgate/workspace-preview.html`
- `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/signinpro/?workspace=as-you-wish-pottery-westgate`
- `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/northstar/`

Deployment:

- Worker version: `0791e6c7-2d21-4d6f-9c2f-d49475b3869f`
- Generator source: `client-app-factory/scripts/rebuild-as-you-wish-pottery-app.mjs`
- Mounted 0S source: `metraiyux_0s_site/client-app-factory/client-apps/as-you-wish-pottery-westgate/`
- SignIn Pro aliases: `/signinpro/`, `/signin-pro/`, `/signing-pro/`

Live Playwright result:

- 26 production As You Wish routes checked.
- 8 additional public candidate/template routes checked after the cross-app cleanup.
- 0 HTTP failures.
- 0 request failures.
- 0 console errors.
- 0 visible hits for the old NorthStar-arrival wording or fake/template copy patterns.
- 0 desktop or mobile horizontal overflow.
- Headline verified with pottery palette gradient: clay, rose, aqua, leaf.
- SignIn Pro aliases verified into the mounted `/northstar/?workspace=as-you-wish-pottery-westgate` route.
- Logged-out `/api/northstar/auth-session` now returns clean HTTP `200` with `authenticated:false` instead of browser-noisy `401`.
- Cross-app source sweep cleaned the exact `Open NorthStar SignIn Pro` and `Swap the placeholders` strings from mounted client app outputs.
- Desktop screenshot: `test-artifacts/as-you-wish-signinpro-live/as-you-wish-desktop.png`
- Mobile screenshot: `test-artifacts/as-you-wish-signinpro-live/as-you-wish-mobile.png`
- SignIn Pro screenshot: `test-artifacts/as-you-wish-signinpro-live/signinpro-desktop.png`
- JSON report: `test-artifacts/as-you-wish-signinpro-live/live-proof.json`

## 2026-05-20 As You Wish Production Repair Proof

The As You Wish Pottery Westgate generated app was rebuilt, republished into the 0S shell, and redeployed to the full-system Worker after live Playwright caught a service-worker navigation failure on `.html` routes.

Production URL:

- `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/client-app-factory/client-apps/as-you-wish-pottery-westgate/`

Deployment:

- Worker version: `90c3d7e7-afe6-4f86-a078-e587e8a13634`
- Service worker cache version: `as-you-wish-westgate-v2`
- Generator source: `client-app-factory/scripts/rebuild-as-you-wish-pottery-app.mjs`

Live Playwright result:

- 26 production routes checked.
- 0 HTTP failures.
- 0 request failures.
- 0 console warnings/errors.
- 0 visible hits for old package/template/product-category copy.
- 0 mobile horizontal overflow.
- Desktop screenshot: `test-artifacts/as-you-wish-prod-desktop-after.png`
- Mobile screenshot: `test-artifacts/as-you-wish-prod-mobile-after.png`
- JSON report: `test-artifacts/as-you-wish-prod-after.json`

## 2026-05-20 UI Rebuild Proof

The factory shell was rebuilt around a route-first wizard instead of the old crowded admin surface. The visible workflow now exposes 13 primary pages: Choose Client, Confirm Info, Check Sources, Brand Pack, Media Pack, Experience, Build App, Preview App, QA Check, Workspace, Payment, Launch, and Ask Auren.

Key UI changes:

- Added first-class `workspace/` and `payment/` routes.
- Replaced the horizontal dashboard shell with a left workflow rail.
- Converted the Valley picker from a long card wall into a bounded operator list.
- Limited the default Valley client view to 12 starter clients with search for the full catalog.
- Removed `System Drawer`, command-center, Docker, cockpit, and dashboard language from the visible factory shell.
- Added static Valley client fallback data at `client-app-factory/data/client-app-factory-index.json`.
- Added static API health fallback so the published shell can show `Factory API offline` without console 404 noise.

Latest proof run:

```bash
npm run mcp:mine -- /workspaces/MetrAIyux-0S/client-app-factory
npm run publish:0s-shell
node client-app-factory/tests/browser-proof.mjs http://127.0.0.1:4199 'As You Wish Pottery'
```

Latest verified result:

- MCP mining green with `failedCalls: []`.
- Local backend proof green at `http://127.0.0.1:4199/clients/`.
- Static published shell check green at `http://127.0.0.1:4200/client-app-factory/clients/`.
- Published local copy updated at `metraiyux_0s_site/client-app-factory/`.
- Valley clients loaded: `12`.
- Route nav count: `13`.
- Search match found: `As You Wish Pottery`.
- Import succeeded: `as-you-wish-pottery-westgate`.
- Full factory run succeeded with verification green.
- Generated route opened with HTTP `200`.
- Auren responded during proof.
- Desktop and mobile checks reported no console errors, no request failures, and no horizontal overflow.
- Static shell loaded `clients/`, `workspace/`, and `payment/` with no console errors and no request failures.

## Directive Read

The changed directive defines a generic Client App Factory, not a one-off Empire Pallets upgrade. The factory app was created at `client-app-factory/`, with the current Empire Pallets app at `empire-pallets-v3-app/` seeded as the first client record and packaged again under `client-app-factory/client-apps/empire-pallets/`.

## Implemented Surface

- Node backend service at `client-app-factory/server.mjs`
- Factory engine at `client-app-factory/scripts/factory-engine.mjs`
- JSON-backed records, uploads, scans, generated apps, and ledger storage under `client-app-factory/storage/`
- Client Intake room
- Source Scanner room
- Asset Vault room
- MCP Design Lab room
- App Builder room
- AI Workspace room
- SkyePay continuation room
- Proof Room
- Deployment Console
- Repo Platform Wiring room

## MCP Workflow

- Before pass: `npm run mcp:mine -- client-app-factory`
- Receipt: `client-app-factory/MCP_TOOLING_RECEIPT.json`
- Design recipes selected through MCP: app-first command center, kinetic process funnel, actual surface proof discipline, living background, motion chrome, text effects, and quality gate rules.
- After pass should be re-run after each code change: `npm run mcp:mine -- client-app-factory`

## Verification Commands

```bash
node client-app-factory/server.mjs
node client-app-factory/tests/api-smoke.mjs http://127.0.0.1:4199
node client-app-factory/scripts/factory-scan.mjs
node client-app-factory/tests/smoke.mjs
node client-app-factory/tests/browser-proof.mjs http://127.0.0.1:4199
npm run mcp:mine -- client-app-factory
```

## Latest Verified Result

- MCP receipt: `client-app-factory/MCP_TOOLING_RECEIPT.json`, green with `failedCalls: []`.
- Scanner report: `client-app-factory/data/empire-scan-report.json`, green with every completion gate item true.
- API smoke: `client-app-factory/tests/api-smoke.mjs`, green against `http://127.0.0.1:4199`.
- Local smoke: `client-app-factory/tests/smoke.mjs`, green with Valley picker and factory pipeline checks.
- Public Pages shell: `https://client-app-factory.pages.dev/` with immutable deploy `https://21a6a85b.client-app-factory.pages.dev/`.
- Browser proof: `test-artifacts/client-app-factory/browser-proof.json`, green on desktop `1440x1000` and mobile `390x844`.
- Screenshots: `test-artifacts/client-app-factory/desktop.png`, `test-artifacts/client-app-factory/mobile.png`, `test-artifacts/client-app-factory/video-playback.png`, plus public Proof Room copies at `client-app-factory/assets/proof/client-app-factory-desktop.png` and `client-app-factory/assets/proof/client-app-factory-mobile.png`.
- Workflow video: `client-app-factory/assets/proof/client-app-factory-workflow.webm` rendered inside the Proof Room, mirrored to `test-artifacts/client-app-factory/client-app-factory-workflow.webm`.
- Video poster: `client-app-factory/assets/proof/client-app-factory-workflow-poster.png`.
- Packaged client preview: `client-app-factory/client-apps/empire-pallets/index.html`, opened during browser proof with HTTP `200`.
- Valley import and full-factory run: `next-level-gaming-goodyear`, imported from Valley Verified, built green, verified green, workspace and SkyePay lanes linked.
- Valley import and full-factory fallback run: `fade-masters-phx`, imported from Valley Verified, live surface unavailable, branded fallback logo/poster/motion generated, verified green.
- E2E proof audit: passed with real browser recording, action path, rendered WebM, poster, and playback verification.
- Local server used for proof: `http://127.0.0.1:4199/`.

Latest browser assertions:

```json
{
  "noConsoleErrors": true,
  "no404s": true,
  "noHorizontalOverflow": true,
  "roomsPresent": true,
  "pwaDetected": true,
  "backendApiLive": true,
  "routeMapWorks": true,
  "packagedRouteOpens": true,
  "formSaves": true,
  "assetUploadSaves": true,
  "ledgerRendersEvents": true,
  "scannerLoaded": true,
  "factoryPassOpensProof": true,
  "videoPlaybackVerified": true
}
```

## Notes

The app is now a backend-backed local factory service. The UI writes through API routes for intake, asset cataloging, scanning, generation, workspace setup, SkyePay lane tracking, and proof ledgers. Production payment checkout and external deployment provider calls are still provider-credential dependent, but the record lanes and state machine are in place.

The Cloudflare Pages deployment makes the factory visible on a public URL, but the current Pages surface is a static shell. The Node-backed `/api/*` runtime still lives in the local/operator server until the backend is migrated to a cloud-persistent runtime.
