# Relay13 v1.6 — ConnectLog Activation Proof Ledger

## Scope

Relay13 remains the independent Cloudflare-native messaging engine. v1.6 adds a proof layer that ConnectLog can call after Relay13 is deployed, migrated, bootstrapped, and keyed.

## Added

- `migrations/0004_connectlog_activation_proof.sql`.
- `connectlog_activation_runs` table.
- `GET /api/v1/connectlog/activation` readiness endpoint.
- `POST /api/v1/connectlog/activation-runs` endpoint.
- Activation proof status is auditable through Relay13 D1 instead of living only in the browser.
- `npm run proof:activation` script for deployed Worker proof from terminal.
- Bridge health/proof metadata now references v1.6 and migration `0004`.
- Smoke checks require the activation migration, docs, endpoints, and package proof script.

## Deployment proof command

```bash
RELAY13_ORIGIN="https://YOUR-WORKER.workers.dev" \
RELAY13_API_KEY="r13_..." \
RELAY13_WORKSPACE_ID="ws_..." \
RELAY13_WORKSPACE_SLUG="connectlog-main" \
npm run proof:activation
```

Optional mutation proof:

```bash
RELAY13_MUTATE_PROOF=true npm run proof:activation
```

Mutation proof creates a sample ConnectLog card/conversation only when explicitly enabled.

## Proof run

```bash
npm run smoke
node --check src/index.js
node --check scripts/activation-proof.mjs
```

Expected success:

```text
Smoke passed: Relay13 V1.6 ConnectLog activation-proof package includes public landing, console launch, domain allowlisting, stored counters, scoped indexes, API key hardening, hibernation-ready Durable Objects, and no preloaded message content.
```

## Honest boundary

This source package is not live Cloudflare proof. Live proof still requires remote Worker deployment, remote D1 migrations, workspace bootstrap, scoped API key creation, ConnectLog activation proof, message post/reload proof, and WebSocket proof against a real conversation.
