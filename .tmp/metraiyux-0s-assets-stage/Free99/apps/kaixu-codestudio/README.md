# kAIxu CodeStudio Pro 5.9.1

Website closure update: the root `/index.html` is now a premium product landing surface with Launch Platform flow, SEO metadata, Open Graph/Twitter metadata, structured data, robots.txt, sitemap.xml, llms.txt, and AI-readable `index.md`. The executable app remains at `/app/`; the backend proof commands remain `npm run check` and `npm run smoke:fixture`.

# kAIxu CodeStudio Pro 5.9.0

Executable platform bundle by SOLEnterprises / Skyes Over London.

This package is now coded past the prior backend bridge layer. It contains an actual local operating plane, not just platform claims:

- `/app` — offline-first browser workspace with vault, sandbox runner, assistant, Platform Console, policy builder, workflow templates, webhook lane, project control plane, approval queue view, operations ledger, release gates, and backend bridge.
- `/server` — Node platform engine with provider adapters, policy enforcement, project registry, per-project provider installs, executable workflow runner, workflow run history, persisted webhook ingest/replay, approval queue, and receipt storage.
- `/platform` — provider, policy, workflow, project, approval, backend route, and proof manifests consumed by the app and backend.
- `/reports` — existing due-diligence report assets.

## Run proof

```bash
npm run check
npm run smoke:fixture
```

`smoke:fixture` starts the HTTP server on a random local port and calls real backend routes. Fixture outputs are explicitly labeled as fixture proof and do not claim live provider completion.

The fixture smoke now verifies:

- provider probes
- project control-plane create/list
- per-project provider pack installs
- upstream-claim blocking
- checkout + email workflow execution
- database + AI summary workflow execution
- persisted webhook ingest/replay
- persisted workflow run history
- approval queue creation for blocked expensive calls
- receipt retrieval

## Run the platform backend

```bash
npm run platform:server
```

Open the app, go to `Platform`, set backend base to `http://localhost:7137`, then use the backend bridge and project/operations controls.

## Live providers

Copy `.env.example` to `.env` or add env vars in your host, then run:

```bash
CODESTUDIO_PROVIDER_MODE=live npm run platform:server
```

Providers with missing env secrets block and write receipts instead of returning fake success.

## Upstream identity posture

kAIxu CodeStudio inherits identity from the parent platform instead of shipping an app-local login wall. It accepts upstream claims through `x-kaixu-claims` or request JSON and enforces project access, roles, run permission, and approval behavior from those claims.

## v5.5.0 durable platform layer

This build added the code-only operating layer that was still missing after v5.4.0:

- File-based provider packs in `platform/provider-packs/*.json`, loaded by `server/lib/plugin-loader.mjs`.
- Persistent job queue with enqueue/run/drain routes.
- Persistent schedules that tick due workflow schedules into queued jobs.
- Usage metering per provider/workflow/run.
- Project export/import migration bundles.
- Platform Console controls for jobs, schedules, meters, and project export.
- Expanded fixture smoke proving provider-pack loading, jobs, schedules, meters, webhooks, approvals, and migration bundles.

Proof commands:

```bash
npm run check
npm run smoke:fixture
```

## v5.9.0 code-only closure layer

This build adds the next platform surfaces and executable backend lanes:

- Visual workflow graph builder with validation, persistence, and compiled workflow output.
- Provider routing optimizer that scores provider packs/installs/probes and records route decisions.
- Meter-backed invoice generator that turns usage meter events into draft invoice JSON.
- Platform Console sections for provider routing, usage invoices, and visual workflow graph building.
- Backend API routes for route decisions, invoices, and workflow graphs.
- `scripts/browser-click-smoke.mjs`, a Chromium/CDP click harness for UI proof.

Proof commands:

```bash
npm run check
npm run smoke:fixture
npm run smoke:browser
```

Note: `smoke:browser` is included and syntax-checked. In this sandbox Chromium is enterprise-policy blocked from loading localhost/file URLs, so the included report records the block. On a normal local/devcontainer browser it performs real clicks against the Platform Console. Live-provider proof still requires real env secrets.

## v5.9.0 operating-plane closure layer

This build removes another theater layer: the visual graph is no longer only saved/compiled; it can execute provider steps through `POST /api/platform/workflow-builder/graphs/:graphId/run`.

Added code paths:

- Visual workflow graph runner with provider-step execution and run receipts.
- Persistent audit trail through `/api/platform/audit`.
- Incident center through `/api/platform/incidents` and `/api/platform/incidents/:id/resolve`.
- Entitlement gates through `/api/platform/entitlements` and `/api/platform/entitlements/check`.
- Form builder/submission lane through `/api/platform/forms` and `/api/platform/forms/:id/submit`.
- Generic records API through `/api/platform/records/:collection`.
- Project scorecard through `/api/platform/scorecard`.
- Platform Console controls for forms, entitlements, incidents, graph runs, scorecard, and audit sync.

Proof commands:

```bash
npm run check
npm run smoke:fixture
```

The fixture smoke now proves graph execution, form submission into a workflow, entitlement hard-block incident creation, incident resolution, audit persistence, and scorecard calculation.

## v5.9.0 closure layer

This pass deepens the core engine instead of adding random surface features.

Implemented code changes:

- Real storage adapter implementations now exist for JSON, SQLite through `better-sqlite3`, Postgres/Neon through `pg`, and Cloudflare D1 through the D1 REST query API.
- `/api/platform/storage` exposes the active adapter and `/api/platform/storage/verify` writes audit state through the selected adapter.
- Provider-pack routes are registered into the action registry as first-class executable actions instead of only being metadata.
- Obsolete legacy workflow step methods were removed from `PlatformEngine`; workflow execution now routes through `server/lib/action-registry.mjs`.
- Webhook replay now checks `platform/webhooks/webhook-dispatch-rules.json` and can run or enqueue mapped workflows.
- Job queue closure now includes lock extension and dead-letter retry routes.
- OpenAPI/request validation was expanded for storage, dispatch rules, lock extension, and dead-letter retry.
- Platform Console now syncs storage adapter state, dispatch rules, and dead letters, with retry controls.

Proof:

- `npm run check` passes.
- `npm run smoke:fixture` passes with 35 behavioral checks and 61 receipts.
- Browser click smoke is present, but this sandbox's Chromium blocks localhost/127.0.0.1 by policy; the failed report is included at `platform/proof/browser-click-smoke-report.json` instead of being marked as passed.
