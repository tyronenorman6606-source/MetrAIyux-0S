# Relay13 v1.5 — ConnectLog Message-Proof Bridge

Relay13 remains its own messaging product. ConnectLog remains its own contact/card product. v1.5 adds the bridge proof layer that makes the integration easier to verify without pretending a live deployment happened.

## Added

- `0003_connectlog_message_proof.sql` with `connectlog_request_events`.
- `GET /api/v1/connectlog/proof` route inventory and proof-boundary response.
- `POST /api/v1/connectlog/scan` as a first-class ConnectLog card-scan entry route that opens a Relay13 conversation.
- `GET /api/v1/connectlog/requests/:id/events` for request lifecycle history.
- `connectlog:read` and `connectlog:write` scopes for bridge-specific API keys.
- Request status updates now append event-ledger rows instead of only changing the latest status.

## Still not claimed

This package is not live-proven until Cloudflare deployment is done, all D1 migrations are applied, a workspace and API key exist, a ConnectLog card creates a real conversation, messages are posted and reloaded, and the Durable Object WebSocket opens in a browser.
