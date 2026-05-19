# No-Theater Ledger

✅ Removed the old intro-first dashboard positioning.
✅ Added executable backend files under `/server`.
✅ Added provider adapter code paths for Stripe, Resend, Twilio, Cloudflare, Neon/Postgres, Netlify, Kaixu AI Gateway/OpenAI fallback, and Google Ops.
✅ Added HTTP routes for provider probes, workflow preflight, workflow runs, webhook ingest, webhook replay, smoke, and receipt retrieval.
✅ Added persistent JSON data store under `server/lib/data-store.mjs`.
✅ Added project/tenancy control plane with upstream-claim access checks.
✅ Added per-project provider-pack install and secret-reference rotation routes.
✅ Added workflow execution history persistence.
✅ Added persisted webhook queue and replay state.
✅ Added approval queue generation for blocked policy actions.
✅ Added approval resolution route.
✅ Added browser Platform Console surfaces for project control, provider installs, operations ledger, approvals, and backend sync.
✅ Added fixture-mode smoke proof that labels fixture outputs as fixture proof only.
✅ Added live-mode blocking behavior when provider secrets are absent.
✅ Added backend manifests and proof artifacts under `/platform`.
☐ Live provider proof is still open until real env secrets are supplied and smoke is run in live mode.
☐ Browser click automation proof is still open; current proof is Node/backend behavioral smoke.


## v5.5.0 durable platform layer

✅ Provider packs are now file-based under `platform/provider-packs/*.json` and loaded by `server/lib/plugin-loader.mjs`.
✅ Job queue is persisted in the JSON data store and executable through `/api/platform/jobs`, `/api/platform/jobs/:jobId/run`, and `/api/platform/jobs/drain`.
✅ Scheduled workflows persist and tick into queued jobs through `/api/platform/schedules` and `/api/platform/schedules/tick`.
✅ Usage meters record provider-level workflow consumption through `/api/platform/meters`.
✅ Project export/import migration bundles execute through `/api/platform/projects/:projectId/export` and `/api/platform/import`.
✅ Fixture smoke proves provider-pack loading, job execution, schedule tick/drain, metering, webhook replay, approvals, and export/import.

☐ Chromium/browser click proof is still not claimed. The current smoke is HTTP/API plus static surface proof.
☐ Live-provider proof still requires real env secrets and real upstream gateway claims.

## v5.6.0 code-only closure pass

✅ Added workflow graph builder backend routes and persistent graph storage.
✅ Added graph validation and compiler output for visual workflows.
✅ Added provider routing optimizer that scores installed/configured providers, records decisions, and writes receipts.
✅ Added meter-backed usage invoice generator with persisted invoice records.
✅ Added Platform Console surfaces for visual graph building, route optimization, and invoice generation.
✅ Added `scripts/browser-click-smoke.mjs` Chromium/CDP click harness for real UI click proof.
✅ Extended fixture smoke to prove provider routing, invoice generation, and graph compilation endpoints.

Browser note: the script is present and syntax-checked. This sandbox's Chromium policy blocks localhost/file URLs with an enterprise-policy error, so the generated `platform/proof/browser-click-smoke-report.json` records that environment block when run here. On an unrestricted local/devcontainer Chromium, run `npm run smoke:browser` for the full click proof.

## v5.9.0 operating-plane closure pass

✅ Added visual workflow graph runner route and backend execution method.
✅ Added generic graph-step executor for AI, DB, email, Stripe checkout, SMS, Google Ops, Cloudflare D1, and Netlify status/deploy actions.
✅ Added persistent audit events to the JSON data store.
✅ Added incident center with open/resolve state and audit receipts.
✅ Added entitlement gates with usage consumption, hard-block responses, and incident creation on limit violations.
✅ Added form definitions, form validation, form submissions, and generic records collections.
✅ Added form-submit-to-workflow bridge using existing workflow runners.
✅ Added project scorecard calculated from runs, incidents, approvals, and meter events.
✅ Added Platform Console surfaces for graph execution, forms, entitlement checks, incidents, and scorecard sync.
✅ Extended fixture smoke to prove graph execution, forms/records, entitlement hard block, incident resolution, audit trail, and scorecard.

☐ Live-provider proof remains open until real env secrets are supplied and live smoke is run.
☐ Browser click proof remains environment-dependent; backend/API proof is current and passing.

## v5.9.0 core-engine hardening pass

✅ Replaced `runWorkflow()` switch-based execution with `server/lib/action-registry.mjs`.
✅ Workflow templates now execute registered actions in order instead of template-specific branching.
✅ Provider-pack routes are executable through `POST /api/platform/provider-packs/:providerId/actions/:route/run`.
✅ Provider-pack JSON files now declare `executableActions` with the action-registry runner path.
✅ Added signed upstream-claim verification using `x-kaixu-claims`, `x-kaixu-claims-ts`, and `x-kaixu-claims-signature` when `CODESTUDIO_UPSTREAM_CLAIMS_SECRET` is configured.
✅ Added webhook signature verification helper for Stripe, Resend/Svix-style, generic CodeStudio HMAC, and Twilio-generic HMAC pathways.
✅ Added webhook idempotency keys and duplicate ingest receipts.
✅ Added storage-adapter contracts/catalog for JSON, SQLite, Postgres/Neon, and Cloudflare D1. JSON is active in this portable package; the other adapters block honestly until their runtime bindings/drivers are attached.
✅ Added job lock IDs, lock expiry, retry backoff, cancellation, stale-lock recovery, and dead-letter storage.
✅ Added OpenAPI 3.1 route/schema document at `/api/platform/openapi.json` plus request validation for JSON route bodies.
✅ Cleaned stale build labels from 5.4/5.7 surfaces to v5.9.0 / platform590.
✅ Sharpened the Platform Console into an operator command center with score, issue focus tiles, quick sync, OpenAPI loading, ledger refresh, and reduced top-level clutter.

Proof run in this package:

✅ `npm run check`
✅ `npm run smoke:fixture`

Browser proof note:

☐ `npm run smoke:browser` remains blocked by this sandbox Chromium policy: Chromium refuses `localhost` and `127.0.0.1` with an enterprise-style "organization doesn't allow" page. The CDP script is updated to load the served `/app/` URL and set the correct backend base, but this environment cannot complete browser navigation. Do not claim browser-click proof passed from this sandbox.

## v5.9.0 closure pass

✅ Implemented selectable storage backend code paths for JSON, SQLite (`better-sqlite3`), Postgres/Neon (`pg`), and Cloudflare D1 REST.
✅ Added `/api/platform/storage` and `/api/platform/storage/verify` so storage is not just a manifest claim.
✅ Registered provider-pack routes as first-class action-registry actions; smoke proves 38 provider-pack actions are registered.
✅ Removed legacy step methods from `server/platform-engine.mjs`; workflow execution is routed through `server/lib/action-registry.mjs`.
✅ Added `platform/webhooks/webhook-dispatch-rules.json` and replay-to-workflow dispatch behavior.
✅ Added queue lock extension and dead-letter retry routes.
✅ Expanded OpenAPI/schema validation coverage for storage, dispatch, lock extension, and dead-letter retry routes.
✅ Fixed visual workflow graph duplicate step recording; graph smoke now records actual provider steps once.
✅ Upgraded Platform Console state sync to show storage adapter, webhook dispatch rules, dead letters, and retry controls.
✅ `npm run check` passed.
✅ `npm run smoke:fixture` passed with 35 behavioral checks and 61 receipts.
☐ Browser click proof is still blocked by this sandbox Chromium policy page: “Your organization doesn’t allow you to view this site.” The report is preserved instead of faked.
