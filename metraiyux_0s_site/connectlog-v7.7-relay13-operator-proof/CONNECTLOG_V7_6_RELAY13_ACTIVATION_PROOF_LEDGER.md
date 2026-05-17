# ConnectLog v7.6 — Relay13 Activation Proof Ledger

## Scope

ConnectLog is a production relationship/contact/card app. Relay13 is the standalone production messaging backend. v7.6 strengthens the bridge by adding an operator-run activation proof path instead of relying on setup notes or visual UI claims.

## Added

- `Run activation proof` control in `/app.html#relay13`.
- `Copy activation curl` control for terminal proof against a deployed Relay13 Worker.
- Browser-side activation proof runner that checks:
  - Relay13 `/api/health`.
  - Relay13 `/api/v1/connectlog/health`.
  - Relay13 `/api/v1/connectlog/proof`.
  - Relay13 `/api/v1/connectlog/activation`.
  - Active ConnectLog card registry sync.
  - Conversation creation from the active card.
  - Operator message POST.
  - Message history reload.
  - Activation-run ledger recording when Relay13 v1.6 is present.
- Deployment command blocks now point at v7.6/v1.6 names.
- The Deployment Command Center checklist now demands activation proof before trusting remote delivery.
- Smoke checks now fail if the activation proof buttons/functions are missing or unwired.

## Still intentionally preserved

- Protected delivery queue mode remains active for browsers without Relay13 credentials.
- Local inbox/outbox remains usable when Relay13 is absent or unhealthy.
- API keys remain private operator settings and are never embedded in public QR payloads.
- ConnectLog does not claim live remote delivery until a deployed Relay13 Worker passes activation proof.

## Proof run

```bash
npm run check
```

Expected success:

```text
ConnectLog v7.6 Relay13 activation-proof smoke checks passed.
```

## Honest boundary

This package proves source wiring, UI wiring, delivery-queue behavior, and proof-runner presence. Current production receipts also prove Cloudflare live delivery with Relay13 deployed, D1 migrations applied remotely, workspace/API key present, and activation proof run against the live Worker origin.
