# ConnectLog + Relay13 Operator Proof Bundle

This bundle keeps the products separate:

- `connectlog-v7.7-relay13-operator-proof` is the standalone relationship command PWA mounted on the production 0S Worker.
- `relay13-core-v1.7-connectlog-operator-proof` is the standalone Cloudflare messaging backend with D1, scoped keys, activation proof, message history, and WebSocket proof.

v7.7/v1.7 adds operator runbooks, preflight checks, live-proof scripts, and a Relay13 live-proof endpoint. Production proof is recorded through the 0S deployment ledger, Relay13 Worker health, D1 workspace/API key setup, activation/live proof, message history, and WebSocket browser proof.
