# Relay13 v1.6 ConnectLog Activation Proof

Relay13 remains an independent messaging backend. ConnectLog remains an independent card/contact app. v1.6 adds the activation-proof layer that lets ConnectLog prove a deployed Relay13 Worker can answer health, bridge, readiness, card registry, conversation creation, message post, message reload, and proof-ledger recording before the operator trusts remote delivery.

## Added endpoints

- `GET /api/v1/connectlog/activation` requires a Relay13 API key with `connectlog:read`. It checks workspace status, API-key scope, bridge tables, conversation counters, message table access, and activation-run ledger access.
- `POST /api/v1/connectlog/activation-runs` requires `connectlog:write`. It records the ConnectLog-side activation report in D1.

## Added migration

- `migrations/0004_connectlog_activation_proof.sql` creates `connectlog_activation_runs`.

## Honest boundary

This does not prove Cloudflare live behavior until the Worker is actually deployed, D1 migrations are applied remotely, a workspace/API key exists, ConnectLog runs activation proof against the Worker origin, and browser WebSocket behavior is tested against a real conversation.
