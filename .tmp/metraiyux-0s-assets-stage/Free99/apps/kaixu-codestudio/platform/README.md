# kAIxu CodeStudio Platform Manifests

This folder is now more than a client-side manifest seed. It defines the executable platform contract consumed by the included Node backend in `/server`.

Implemented package-level lanes:

- Provider registry for Stripe, Resend, Twilio, Cloudflare, Neon/Postgres, Netlify, Kaixu AI Gateway/OpenAI fallback, and Google Ops.
- Policy rules that block role-mismatched upstream claims, high-value payment actions without approval, destructive database writes, and live webhook replay without approval.
- Workflow templates with executable runners in `server/platform-engine.mjs`.
- HTTP API routes in `server/http-server.mjs` for health, provider probe, workflow preflight, workflow execution, webhook ingest, webhook replay, smoke, and receipts.
- Fixture-mode smoke tests that exercise the backend adapter chain without claiming live provider proof.
- Live-mode adapters that call provider APIs only when required environment variables are present. Missing live secrets produce blocked receipts, not fake success.

Run local proof:

```bash
npm run smoke:fixture
```

Run the backend bridge for the browser Platform Console:

```bash
npm run platform:server
```

Then open `/app`, go to Platform, set backend base to `http://localhost:7137`, and press `Probe health` or `Run backend smoke`.

## v5.6.0 durable platform additions

`platform/provider-packs/` is now the editable provider-pack folder. Add or replace JSON packs there without changing core backend code.

Durable routes now exist for:

- `GET /api/platform/provider-packs`
- `POST /api/platform/projects/:projectId/provider-packs/:packId/install`
- `POST /api/platform/jobs`
- `POST /api/platform/jobs/:jobId/run`
- `POST /api/platform/jobs/drain`
- `POST /api/platform/schedules`
- `POST /api/platform/schedules/tick`
- `GET /api/platform/meters`
- `POST /api/platform/projects/:projectId/export`
- `POST /api/platform/import`

The backend remains upstream-auth-only. Claims are consumed, not implemented.


## v5.6.0 workflow/routing/billing additions

New durable routes now exist for:

- `GET /api/platform/provider-router`
- `POST /api/platform/provider-router/optimize`
- `GET /api/platform/invoices`
- `POST /api/platform/projects/:projectId/invoices/generate`
- `GET /api/platform/workflow-builder/graphs`
- `POST /api/platform/workflow-builder/graphs`

These are code paths, not claim copy. Fixture smoke proves route optimization, invoice generation from meter events, and graph validation/compilation. Browser click smoke harness is in `scripts/browser-click-smoke.mjs`; this sandbox records the Chromium policy block in `platform/proof/browser-click-smoke-report.json`.

## v5.9.0 operating-plane additions

New durable routes now exist for:

- `POST /api/platform/workflow-builder/graphs/:graphId/run`
- `GET /api/platform/audit`
- `POST /api/platform/audit`
- `GET /api/platform/incidents`
- `POST /api/platform/incidents`
- `POST /api/platform/incidents/:incidentId/resolve`
- `GET /api/platform/entitlements`
- `POST /api/platform/entitlements`
- `POST /api/platform/entitlements/check`
- `GET /api/platform/forms`
- `POST /api/platform/forms`
- `POST /api/platform/forms/:formId/submit`
- `GET /api/platform/records/:collection`
- `POST /api/platform/records/:collection`
- `GET /api/platform/scorecard`

The graph builder now has a runner. Forms can validate submissions, persist records, and optionally kick a workflow. Entitlement checks can hard-block and open incidents. Audit and incident receipts are persisted through the same backend proof system.

## v5.9.0 core-engine hardening additions

This pass deepens the engine rather than adding more random surfaces.

- Workflow execution now runs through `server/lib/action-registry.mjs`.
- Provider packs expose executable actions and can be invoked without adding one-off workflow switch cases.
- Upstream claims support HMAC signing when `CODESTUDIO_UPSTREAM_CLAIMS_SECRET` is configured.
- Webhook ingest supports signature verification helpers plus idempotency keys and duplicate receipts.
- Storage adapter contracts are present for JSON, SQLite, Postgres/Neon, and Cloudflare D1.
- The queue now has lock IDs, lock expiry, retry backoff, cancellation, stale-lock recovery, and dead-letter storage.
- `/api/platform/openapi.json` exposes the route/schema contract; JSON body validation is applied before route execution.
- The browser Platform Console was reorganized into an operator command center.

Run proof:

```bash
npm run check
npm run smoke:fixture
```

Browser proof is provided by `npm run smoke:browser`, but this sandbox blocks Chromium from opening localhost. Run it in a local/devcontainer browser environment that allows localhost navigation.

## v5.9.0 closure additions

The closure pass removed the remaining contract-only weakness from storage and tightened the execution plane.

- Storage adapters: JSON active by default, plus implemented SQLite, Postgres/Neon, and Cloudflare D1 adapter classes.
- Provider packs: file-pack routes register as executable action-registry actions.
- Webhooks: replay can dispatch mapped events into workflow runs or queued jobs through `platform/webhooks/webhook-dispatch-rules.json`.
- Queue: active locks can be extended and dead-lettered jobs can be retried as new queued jobs.
- OpenAPI: route specs include the closure routes and perform stronger body type checks.
- Console: storage, dispatch, and dead-letter controls are visible from the operator surface.
