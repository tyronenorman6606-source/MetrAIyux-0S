# CitadelDB 0S Operations

CitadelDB is now mounted as a Gate-owned 0S lane:

- Dashboard: `/citadeldb/`
- Health: `/api/citadel/health`
- Gated status: `/api/citadel/status`
- Dual-write receipt: `/api/citadel/dual-write-receipt`
- Catch-up queue: `/api/citadel/catchup-queue`
- Catch-up request: `/api/citadel/catchup/request`
- Catch-up completion: `/api/citadel/catchup/mark`
- Developer connection: `/api/citadel/dev/connection`
- Developer row write: `/api/citadel/dev/rows`
- Developer row query: `/api/citadel/dev/query`
- Helper K4i proof ops: `/api/helper-k4i/status`

## Operating Model

CitadelDB is the owned Cloudflare database lane. The 0S Worker binds the dedicated Cloudflare D1 database as `CITADELDB` and uses it for Citadel mirror rows, write receipts, and catch-up jobs. `SITE_EVENTS_KV` remains a secondary receipt mirror/fallback, not the primary CitadelDB database.

Neon can remain an upstream source during cutover. Payload-backed writes are mirrored into CitadelDB D1 immediately; any write that only has a Neon receipt and no row payload stays in the catch-up queue until the row is transferred into CitadelDB.

Local Docker Citadel is for development and proof only. Do not point production at `localhost`, `127.0.0.1`, or a local Docker bridge.

## Developer Database URL

0S users can access CitadelDB through the shared gate using the HTTPS database URL:

```bash
export CITADELDB_DATABASE_URL="https://metraiyux-0s-full-system.graylondonskyes.workers.dev/api/citadel/dev"
export CITADELDB_AUTH="Bearer <0S_GATE_SESSION>"
```

The developer lane accepts structured row writes, structured row queries, and safe SELECT compatibility. It does not expose arbitrary SQL mutation. Normal 0S accounts are workspace-scoped; owner/operator sessions can inspect other workspaces for support and proof.

Proof commands:

```bash
node metraiyux_0s_site/tests/citadeldb-adapter.test.mjs
npm run 0s:helper-k4i:proof
npm run citadeldb:live-d1-sync-proof
```

Helper K4i records SkyErrors, health scans, and vault patch plans into CitadelDB and `SITE_EVENTS_KV`, then sends Resend owner alerts when the mail lane is configured.

## App Write Pattern

When an app writes to Neon but not Citadel yet, record a mirror receipt:

```js
await window.MetrAIyuxCitadelMirror.recordNeonWrite({
  appId: 'client-app-factory',
  table: 'tenant_leads',
  recordId: lead.id,
  operation: 'insert',
  checksum: lead.rowChecksum,
  payloadRef: `/api/0s/tenant-inbox?clientId=${lead.clientId}`
});
```

When the app writes both Neon and Citadel:

```js
await window.MetrAIyuxCitadelMirror.recordDualWrite({
  appId: 'skyemail',
  table: 'messages',
  recordId: message.id,
  operation: 'insert',
  neon: { ok: true, receiptId: neonReceipt.id },
  citadel: { ok: true, receiptId: citadelReceipt.id }
});
```

When a catch-up runner transfers a row to Citadel:

```js
await window.MetrAIyuxCitadelMirror.markMirrored({
  id: eventId,
  citadelReceiptId: receipt.id
});
```

## Neon Cutover Gate

Do not remove Neon from an app until all of these are true:

1. CitadelDB D1 has the app/table rows or approved app-owned database mapping.
2. App write receipts show `mirrored_to_citadel`.
3. Neon dump or row-select catch-up completed for old rows.
4. CitadelDB restore/upsert completed.
5. Row counts and checksums match.
6. App write-smoke passes against CitadelDB.
7. Export and restore test passes.
8. Rollback path back to Neon is documented and tested.

## Docker Storage

The local Docker stack can be stopped without deleting data:

```bash
docker compose -p vps-postgres down
```

Do not add `-v` unless the intent is to delete database volumes.

Unused images can be reclaimed without stopping running containers:

```bash
docker image prune -af
```
