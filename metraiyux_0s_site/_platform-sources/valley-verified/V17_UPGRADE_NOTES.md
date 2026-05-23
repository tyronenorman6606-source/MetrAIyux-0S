# PHX Verified Platform v17 Upgrade Notes

v17 is a code-depth pass, not a deployment pass.

## Added

- `src/server/mutation-service.mjs` — service layer for submit, approve, reject, replay, and queue summary.
- `src/server/policy.mjs` — role/payload/patch policy enforcement before records enter queues.
- `src/server/event-store.mjs` — append-only event ledger plus queue replay into runtime state.
- `src/server/webhooks.mjs` — signed webhook outbox jobs without fake provider delivery.
- `src/server/exporters.mjs` — runtime-state to admin change-set, CSV, and suppression patch exports.
- `scripts/mutation-smoke.mjs` — mutation service proof checks.
- `scripts/v17-enhance.mjs` — generated code-infrastructure pages and static API models.
- `/mutation-service/`, `/event-ledger/`, `/webhook-outbox/`, `/change-sets/`, and `/policy-engine/`.
- `data/mutation-service-model.json`, `data/event-ledger-model.json`, `data/webhook-outbox-template.json`, `data/admin-change-set-template.json`, and `data/policy-engine.json`.

## No fake claims

- No local auth was added.
- No provider notification is claimed as sent.
- No static seed listing is pretended to mutate live.
- Admin changes export into reviewable change-sets and suppression patches.

## Code proof command

```bash
npm run verify
```

This now runs build, static smoke, action smoke, state smoke, and mutation-service smoke.
