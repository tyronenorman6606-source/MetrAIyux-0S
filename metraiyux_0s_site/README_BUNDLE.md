# ConnectLog + Relay13 Operator Proof Bundle

This bundle keeps the products separate:

- `connectlog-v7.7-relay13-operator-proof` is the standalone contact/card/local fallback PWA.
- `relay13-core-v1.7-connectlog-operator-proof` is the standalone Cloudflare messaging backend.

v7.7/v1.7 adds operator runbooks, preflight checks, live-proof scripts, and a Relay13 live-proof endpoint. It does not claim live Cloudflare proof until Relay13 is deployed, D1 migrations are applied remotely, workspace/API key setup is complete, activation/live proof passes, and WebSocket browser proof passes.
