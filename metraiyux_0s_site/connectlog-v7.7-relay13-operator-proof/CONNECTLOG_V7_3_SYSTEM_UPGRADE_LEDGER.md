# ConnectLog v7.3 System Upgrade Ledger

## Boundary

ConnectLog remains a standalone static/offline-first contact and card app. Relay13 remains optional. This upgrade adds operator deployment control, diagnostics, and safer bridge operations without making Relay13 mandatory.

## Implemented

✅ Deployment command-center page at `#deployment`.

✅ Central menu route for `Deploy`.

✅ Copyable ConnectLog static deploy command block.

✅ Copyable Relay13 Cloudflare deploy command block.

✅ Copyable Relay13 env/settings block.

✅ Browser diagnostics button that checks IndexedDB/app state and optionally calls Relay13 `/api/health` when an origin is configured.

✅ Deployment status deck showing app version, local vault counts, Relay13 mode, outbox queue state, and remote readiness.

✅ Proof checklist that keeps local proof separate from live Cloudflare proof.

✅ Smoke check updated for v7.3 IDs/functions/service-worker cache.

## Honest limits

☐ This does not deploy Relay13.

☐ This does not prove live D1/Durable Object/WebSocket behavior.

☐ Remote message delivery is still only trustworthy after Relay13 is deployed, migrated, bootstrapped, API-keyed, health-checked, and exercised through send/reload proof.
