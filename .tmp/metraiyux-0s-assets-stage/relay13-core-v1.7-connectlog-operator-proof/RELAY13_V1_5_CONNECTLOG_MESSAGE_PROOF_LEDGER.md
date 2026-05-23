# Relay13 v1.5 ConnectLog Message-Proof Ledger

✅ Added bridge-specific `connectlog:read` and `connectlog:write` scopes.
✅ Added `connectlog_request_events` migration for request lifecycle history.
✅ Added `/api/v1/connectlog/proof` route inventory/proof-boundary endpoint.
✅ Added `/api/v1/connectlog/scan` as a dedicated card-scan conversation entry point.
✅ Added `/api/v1/connectlog/requests/:id/events` to retrieve request event history.
✅ Request status updates now write request-event rows.
✅ Smoke checks require the v1.5 route, scope, migration, and event-ledger source markers.

☐ Live Cloudflare Worker deployment proof.
☐ Remote D1 migration application proof.
☐ Real card-scan conversation creation proof.
☐ Real POST/GET message history proof.
☐ Browser WebSocket open/message/presence proof.
