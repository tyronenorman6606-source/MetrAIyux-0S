# ConnectLog v7.4 Relay13 Live-Readiness Ledger

## Closed in this pass

✅ Runtime bindings added for Relay13 settings, inbox, fallback, and Deployment Command Center controls.
✅ Smoke checks now fail if required Relay13/deploy IDs exist in HTML but are not queried by `app.js`.
✅ Added `/api/v1/connectlog/health` bridge-health check from ConnectLog.
✅ Added active-card registry sync to Relay13 `/api/v1/connectlog/cards`.
✅ Added ConnectLog request refresh from Relay13 `/api/v1/connectlog/requests`.
✅ Added copyable Relay13 active-card payload for manual inspection and API testing.
✅ Added remote request cache/list UI inside ConnectLog.
✅ Delivery queue remains available and remote failure is queued/not claimed as delivered.

## Still not claimed

☐ Live Cloudflare Worker deploy proof.
☐ Remote D1 migration proof.
☐ Real browser-to-browser WebSocket proof.
☐ Managed customer identity is handled by the gate/Relay13 policy layer; public source must never expose operator API keys.
