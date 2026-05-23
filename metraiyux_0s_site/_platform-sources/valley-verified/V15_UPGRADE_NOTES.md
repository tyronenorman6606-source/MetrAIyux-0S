# PHX Verified Platform v15 Upgrade Notes

## What changed

v15 adds the first real runtime-code layer without pretending the static build can mutate production records by itself.

Added code:
- `src/server/contracts.mjs` for mutation contracts and payload validation.
- `src/server/router.mjs` for upstream-auth-aware action request handling.
- `src/server/storage.mjs` for pluggable action storage with file and memory adapters.
- `netlify/functions/phx-action.mjs` as a thin runtime entrypoint.
- `scripts/action-smoke.mjs` proving auth rejection, validation, idempotency, and action queue persistence.

Added generated platform surfaces:
- `/backend/`
- `/action-queue/`
- `/lead-inbox/`
- `/owner-crm/`
- `/ae-work-orders/`

Added generated data/API files:
- `data/backend-action-contracts.json`
- `data/mutation-queue-template.json`
- `data/owner-crm-index.json`
- `data/ae-work-orders.json`
- `data/lead-inbox-queue.json`
- `data/listing-ops-index.json`
- matching static API mirrors for backend contracts, owner CRM, AE work orders, and lead inbox.

## What is still intentionally not faked

The platform still does not claim live database mutation, live billing, live owner verification, or live lead delivery. Those require upstream auth plus a persistent backend/database. This build supplies the contracts and server adapter code so that layer can be wired without redesigning the app.

## Proof

- `npm run build` completed with 26,413 published deduped businesses.
- `npm run smoke` passed 928 checks.
- `npm run action-smoke` passed 9 action checks.
- `npm run dry-run` reported safe to publish.
