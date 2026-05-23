# PHX Verified Platform v16 Upgrade Notes

v16 is a code-depth upgrade. It does not add local auth and it does not fake live database behavior. It adds the missing runtime state architecture behind the queued workflows.

## Added

- `src/server/state-store.mjs` for runtime state projection.
- `src/server/db-adapters.mjs` for database adapter contracts and D1/SQLite/Neon schema exports.
- `src/server/business-index.mjs` for canonical business id validation before accepting runtime actions.
- Expanded `src/server/contracts.mjs` from the v15 action set into claim, lead, AE, suppression, sponsor, owner-contact, admin-review, and listing-patch contracts.
- Upgraded `src/server/router.mjs` so the action endpoint can:
  - reject missing upstream identity,
  - validate role requirements,
  - validate business ids when a dist index is present,
  - queue idempotent actions,
  - list queues by query,
  - return state summaries,
  - optionally project approved admin actions into runtime state.
- Added `scripts/state-smoke.mjs`.
- Added `data/runtime-state-model.json`.
- Added `data/db-contracts.json`.
- Added `data/approval-workflow.json`.
- Added `data/d1-schema.sql`.
- Added `data/neon-schema.sql`.
- Added static API mirrors for the new runtime model exports.
- Added `/runtime-state/`.
- Added `/db-contracts/`.
- Added `/approval-flow/`.

## What changed architecturally

v15 created reviewable action envelopes. v16 now proves that approved action envelopes can become operational state without mutating the static seed truth directly.

The runtime state buckets are:

- claims
- leads
- listing_patches
- suppression_drafts
- ae_accounts
- sponsor_intents
- contact_logs
- review_decisions

The static seed remains the marketplace source of truth. Runtime state is for claims, leads, AE workflow, admin decisions, suppression drafts, and owner contact history. Suppressions still become public data changes only after an explicit seed commit/rebuild.

## Proof

- Build completed with 26,413 published deduped businesses.
- Smoke suite passed with 951 checks.
- Action smoke passed with 11 checks.
- State smoke passed with 13 checks.

