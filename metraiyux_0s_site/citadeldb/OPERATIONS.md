# CitadelDB 0S Operations

CitadelDB is now mounted as a Gate-owned 0S lane:

- Dashboard: `/citadeldb/`
- Health: `/api/citadel/health`
- Gated status: `/api/citadel/status`
- Dual-write receipt: `/api/citadel/dual-write-receipt`
- Catch-up queue: `/api/citadel/catchup-queue`
- Catch-up request: `/api/citadel/catchup/request`
- Catch-up completion: `/api/citadel/catchup/mark`

## Operating Model

Neon can remain the primary database until CitadelDB has a remote production server, app-owned credentials, restore proof, smoke proof, and rollback proof.

Local Docker Citadel is for development and proof only. Do not point production at `localhost`, `127.0.0.1`, or a local Docker bridge.

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

## Server Cutover Gate

Do not cut an app from Neon to Citadel until all of these are true:

1. Remote CitadelDB server is online.
2. App database and app user are provisioned.
3. App has a scoped Citadel `DATABASE_URL`.
4. Neon dump or row-select catch-up completed.
5. Citadel restore/upsert completed.
6. Row counts and checksums match.
7. App write-smoke passes against Citadel.
8. Backup and restore test passes.
9. Rollback path back to Neon is documented and tested.

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
