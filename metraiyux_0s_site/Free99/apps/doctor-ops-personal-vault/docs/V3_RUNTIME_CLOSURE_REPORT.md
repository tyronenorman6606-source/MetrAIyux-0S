# Doctor Ops Platform v3 Runtime Closure Report

## What changed

This pass moves the suite beyond browser-only static storage by adding an optional local runtime API. The browser platform still works without the runtime, but `npm run server` now starts a same-origin Node HTTP server with JSON-file persistence and API endpoints for workspace, apps, records, imports, queue tasks, action receipts, audit, and full export.

## Added files

- `server/doctor-ops-server.mjs` — local API/runtime server and static file server.
- `server/storage-adapters.mjs` — JSON file persistence, upsert, import, queue, action, audit, and receipt helpers.
- `assets/js/api-client.js` — optional browser API bridge.
- `contracts/api/local-runtime-api.md` — endpoint and upstream header contract.
- `proof/api-smoke.mjs` — behavioral HTTP proof for the local runtime.

## Frontend upgrades

- Dashboard now shows a Local API bridge panel.
- Dashboard can push the full browser workspace into the API store.
- Dashboard can pull the API store back into browser local storage.
- Each workflow app now has a Runtime sync bridge panel.
- Each workflow app can push/pull its app records to/from the local API.
- Each workflow app can queue a selected record for operator review through the runtime.
- Each workflow app can write a selected action receipt through the runtime.

## Auth stance

No local auth was added. The runtime accepts upstream identity context through headers only:

- `x-upstream-user` / `x-doctor-ops-operator`
- `x-upstream-org` / `x-doctor-ops-org`
- `x-upstream-workspace` / `x-doctor-ops-workspace`
- `x-upstream-tenant` / `x-doctor-ops-tenant`
- `x-upstream-role` / `x-doctor-ops-role`

## Proof run

`npm run smoke` passes and includes:

- static package integrity checks
- 13 workflow surface checks
- shared core config execution checks
- local API behavioral smoke checks

The API proof starts the server on a temporary port, creates a workspace, creates a record, patches it, imports referral data, queues a task, executes an action, reads audit/receipts, and verifies runtime export contents.

## Still open

Browser-click proof is still open. A Chromium attempt in this environment hit a local-site block page, so no browser proof is claimed in this package. The next closure pass should add Playwright/Chromium proof in an environment where localhost is allowed.

Live provider integrations, multi-user hosted persistence, EHR/FHIR adapters, and production compliance controls are also not claimed.
