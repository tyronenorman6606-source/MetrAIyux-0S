# Local Runtime API Contract

The local runtime is optional. It exists so a doctor/operator can keep records in a local JSON file and create local backups without wiring a cloud database.

## Data posture

- Store: `data/platform-store.json`
- Backups: `data/backups/`
- External sync: none configured
- Auth: inherited upstream pass-through headers only

## Endpoints

- `GET /api/health` — runtime status and upstream claim headers.
- `GET /api/privacy/status` — local-only posture, store path, backup path, app/record counts.
- `GET /api/catalog` — 13 workflow app catalog.
- `GET /api/workspace` — workspace metadata.
- `PUT /api/workspace` — update workspace metadata.
- `GET /api/export` — full local store export.
- `POST /api/import-workspace` — import workspace envelope.
- `GET /api/apps/:slug` — app lane state.
- `POST /api/apps/:slug/records` — create/update one record.
- `PATCH /api/apps/:slug/records/:recordId` — update one record.
- `POST /api/apps/:slug/import` — import many records.
- `GET /api/queue` — queued tasks.
- `POST /api/queue` — enqueue task.
- `POST /api/actions/execute` — write action receipt.
- `GET /api/audit` — audit, receipts, and actions.
- `GET /api/backups` — list runtime backups.
- `POST /api/backups` — create runtime backup.
- `GET /api/backups/:id` — download backup JSON.
- `POST /api/backups/:id/restore` — create pre-restore backup and restore selected backup.

## Upstream auth headers

The runtime reads these headers when present but does not authenticate them:

- `x-upstream-user`
- `x-upstream-org`
- `x-upstream-workspace`
- `x-upstream-tenant`
- `x-upstream-role`

Use a real upstream gateway if stronger identity enforcement is needed.
