# Relay13 v1.7 ConnectLog Operator Proof

## Scope
Relay13 remains a standalone Cloudflare-native messaging backend. ConnectLog remains a standalone contact/card PWA. v1.7 adds operator proof tooling and a live-proof endpoint so ConnectLog can verify backend state after deployment.

## Added
- `GET /api/v1/connectlog/live-proof` for workspace-level production-readiness gates.
- `POST /api/v1/connectlog/live-proof-runs` to record proof-script reports.
- `migrations/0005_connectlog_live_proof.sql`.
- `npm run doctor:deploy` for local deploy readiness checks.
- `npm run proof:live` for deployed Worker proof using environment variables.

## Required live proof variables
- `RELAY13_ORIGIN`
- `RELAY13_API_KEY`
- `RELAY13_WORKSPACE_ID`

## Honest boundary
The live-proof endpoint proves backend state and data flow counters. WebSocket realtime still needs browser proof showing open, ready, and message events.
