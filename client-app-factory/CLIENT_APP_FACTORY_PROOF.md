# Sovereign Client App Factory Proof

Generated: 2026-05-17

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
- Browser proof: `test-artifacts/client-app-factory/browser-proof.json`, green on desktop `1440x1000` and mobile `390x844`.
- Screenshots: `test-artifacts/client-app-factory/desktop.png`, `test-artifacts/client-app-factory/mobile.png`, `test-artifacts/client-app-factory/video-playback.png`, plus public Proof Room copies at `client-app-factory/assets/proof/client-app-factory-desktop.png` and `client-app-factory/assets/proof/client-app-factory-mobile.png`.
- Workflow video: `client-app-factory/assets/proof/client-app-factory-workflow.webm` rendered inside the Proof Room, mirrored to `test-artifacts/client-app-factory/client-app-factory-workflow.webm`.
- Video poster: `client-app-factory/assets/proof/client-app-factory-workflow-poster.png`.
- Packaged client preview: `client-app-factory/client-apps/empire-pallets/index.html`, opened during browser proof with HTTP `200`.
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
