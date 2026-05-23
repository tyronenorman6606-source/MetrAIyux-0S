# skAIxu Code Evaluator Platform

A static, Netlify-drop-ready platform package with a public landing website, operator app console, codebase evaluation, live preview, deterministic proof ledgers, seed-driven configuration, workspace persistence, AI audit streaming, patch-bundle application, and valuation reporting.

The public website lives at `index.html`. The actual operator console lives at `app.html`.

---


## Public website surface

This package now separates the public website from the operator console:

- `/` / `index.html` — polished public landing page for the product.
- `/app.html` — the real evaluator/operator app.
- `/app` and `/launch` — Netlify redirects into the app console.
- `/assets/skaixu-mark.svg` — reusable product mark.
- `/site.webmanifest` — PWA install metadata that starts inside the operator app.
- `/robots.txt`, `/sitemap.xml`, and `/ai.md` — discovery support files.

The website copy is intentionally client-facing. Internal proof limitations stay in documentation and receipts, while public claims remain evidence-bounded.

## What it does

Load a project as:

- Folder / directory upload
- ZIP upload
- Individual file upload
- Pasted file contents
- Seed folder / seed ZIP / static `platform-seed/manifest.json`

Then use it to:

1. Run deterministic local checks without AI.
2. Build a platform readiness ledger.
3. Detect routes, links, actions, env variables, risky APIs, possible secrets, docs gaps, dependency smells, and public claim words.
4. Save and reload workspaces locally through IndexedDB.
5. Autoload seed packs from a redeploy-safe manifest.
6. Run AI analysis through kAIxuGateway13 only.
7. Generate patch notes and machine-readable `SKAI_PATCH_BUNDLE` JSON.
8. Enter skAI mode and apply patch bundles directly to the in-memory project.
9. Preview static projects through the Service Worker virtual file server.
10. Export a patched project ZIP.
11. Export a proof pack ZIP for operator handoff.
12. Generate an ops backlog from deterministic code scans.
13. Validate, schema-infer, and materialize seed data into generated platform data files.
14. Generate framework adapter manifests, provider lifecycle audits, workspace API contracts, and deterministic task patch bundles through the Backplane tab.
15. Use reusable `src/platform/` modules for workspace storage, seed ETL, provider lifecycle, framework adapters, and task-runner logic.
16. Run closure proof orchestration with workspace concurrency, provider-pack audit, seed materialization, build receipts, task-loop artifact receipts, gateway-policy checks, and public-claims checks.

## Closure proof commands

```bash
npm test
npm run smoke:closure
npm run closure:proof
npm run build:proof
npm run platform:etl
npm run test:browser
```

`npm run test:browser` requires Playwright to be installed in the execution environment. If Playwright is unavailable, the runner writes an honest skipped receipt instead of pretending browser proof passed.

---

## No built-in auth by design

Auth is intentionally inherited upstream. Do not add a login wall here unless you are changing the product architecture.

The parent SaaS shell should own:

- User sessions
- Tenant/account scope
- Roles/permissions
- Billing entitlements
- Cross-device team storage

This app can read an injected identity object:

```html
<script>
  window.SKAI_UPSTREAM_IDENTITY = {
    tenantId: "tenant_123",
    userId: "user_123",
    roles: ["owner", "operator"],
    plan: "internal"
  };
</script>
```

The Platform tab also includes a local JSON bridge for operator testing. That bridge is not a security boundary.

See `docs/upstream-auth-contract.md`.

---

## Gateway-only AI routing

All model calls are routed through kAIxuGateway13:

- Non-stream: `/.netlify/functions/gateway-chat`
- Stream SSE: `/.netlify/functions/gateway-stream`
- Authorization: `Bearer <KAIXU_VIRTUAL_KEY>`

Production uses Netlify proxy redirects so browser requests hit `/api/*` and Netlify proxies them to:

- `https://kaixugateway13.netlify.app/.netlify/functions/gateway-chat`
- `https://kaixugateway13.netlify.app/.netlify/functions/gateway-stream`

There are no direct browser calls to OpenAI, Anthropic, or Gemini provider endpoints.

---

## Platform additions in this version

### Platform command center

New Platform tab shows:

- Loaded project state
- Workspace registry
- Upstream identity bridge
- Platform readiness stats
- Saved workspace summaries

### IndexedDB workspace registry

The app can persist workspaces locally, including:

- File contents
- Entrypoint
- Analysis output
- Patch output
- Seed registry
- Latest proof ledger

Controls are in the sidebar under **Platform workspace**.

### Seed center

Seed records can be loaded from:

- `platform-seed/manifest.json` after redeploy
- Uploaded seed folders
- Uploaded seed ZIPs

Supported seed formats:

- `.json`
- `.ndjson`
- `.csv`
- `.md`
- `.txt`
- `.yaml` / `.yml` as text assets

Static hosts cannot enumerate folders at runtime, so the manifest is the redeploy-time discovery contract. Add seed files, list them in `platform-seed/manifest.json`, redeploy, then click **Autoload static manifest**.

See `docs/platform-seed-guide.md`.

### Ops ledger

New Ops ledger tab converts code scans into a real backlog with severity, category, path, evidence, and required code action. Operators can export the backlog or write `platform-ledgers/` files directly into the loaded project.

### Data registry

New Data registry tab validates seed records, infers schemas, detects duplicate-like records, projects business-directory candidates, and materializes seed outputs into `generated/platform-data/`. This is the code path for scrape-folder-to-platform population.

### Implementation backplane

New Backplane tab generates code-facing artifacts for the loaded project:

- Framework adapter manifest
- Provider lifecycle audit
- Shared workspace API contract
- Deterministic issue-to-patch bundles

It can write these into `generated/platform-backplane/` inside the loaded project.

Reusable module code lives under `src/platform/`, with smoke coverage in `tools/platform-api-smoke.mjs`.

See `docs/platform-backplane-2.3.md`.

### Proof/readiness ledger

New Proof tab computes deterministic evidence:

- Platform readiness score
- Deterministic code score
- Route/link inventory
- UI/runtime action inventory
- Env var inventory
- Public claim word scan
- Seed readiness
- Closure checklist

### Proof pack export

The proof pack zip includes:

- `proof/README.md`
- `proof/project-summary.txt`
- `proof/proof-ledger.json`
- `proof/seed-registry.json`
- `proof/issue-ledger.json`
- `proof/platform-backlog.md`
- `proof/seed-validation.json`
- `proof/platform-events.json`
- `proof/upstream-auth-contract.json`
- `proof/framework-adapter.json`
- `proof/provider-lifecycle-audit.json`
- `proof/deterministic-task-patch-bundles.json`

This is deterministic local proof. It does not claim live deployment, live provider credentials, payment correctness, compliance, or browser automation proof.

See `docs/proof-pack-contract.md`.

---

## Files

Core runtime:

- `index.html` — public landing website
- `app.html` — full app UI and runtime logic
- `sw.js` — Service Worker virtual file server for preview at `/__skaipreview__/`
- `netlify.toml` — publish root and `/api/*` gateway proxy redirect

Platform backplane code:

- `src/platform/shared-workspace-store.mjs`
- `src/platform/seed-etl-worker.mjs`
- `src/platform/provider-lifecycle.mjs`
- `src/platform/framework-adapters.mjs`
- `src/platform/task-runner.mjs`
- `netlify/functions/platform-workspaces.mjs`
- `netlify/functions/platform-seed-etl.mjs`

Platform seed data:

- `platform-seed/manifest.json`
- `platform-seed/rubrics/platform-readiness.json`
- `platform-seed/rubrics/security-risk.json`
- `platform-seed/workflows/closure-smoke.json`
- `platform-seed/workflows/patch-bundle-review.json`
- `platform-seed/provider-packs/kaixu-gateway.json`
- `platform-seed/schemas.business-directory.json`
- `platform-seed/sample-businesses/arizona-businesses.sample.csv`

Operator docs:

- `docs/upstream-auth-contract.md`
- `docs/platform-seed-guide.md`
- `docs/proof-pack-contract.md`
- `docs/operator-ledgers-and-data-registry.md`
- `docs/platform-backplane-2.3.md`
- `ai.md`
- `CHANGELOG.md`
- `PLATFORM_REMAINING_CODE_NEEDS.md`

Local validation:

- `package.json`
- `tools/smoke-check.mjs`
- `tools/platform-api-smoke.mjs`

---

## Deploy

No build step is required for the browser app. The added `src/platform/` and `netlify/functions/` files are code-side backplane artifacts that can be used by a server/runtime when you wire shared persistence or server ETL.

### Netlify Drop

Zip and upload this folder to Netlify Drop.

### Git deploy

Use the existing `netlify.toml`. The publish directory is `.`.

---

## Local validation

Run:

```bash
npm test
```

The smoke check validates:

- Inline app JavaScript parses.
- Required platform UI IDs exist.
- Seed manifest references existing files.
- Direct provider endpoint scan stays gateway-only.

Known limitation from this environment: browser-based Playwright smoke could not be completed here because Chromium navigation was blocked by administrator policy. The package-level smoke test does pass.

---

## Operator flow

1. Open the app.
2. Load a project folder, zip, files, or pasted file.
3. Review local checks.
4. Open Proof tab and inspect readiness.
5. Open Seed center and autoload/import seed records.
6. Save the workspace.
7. Add Kaixu key if AI analysis is needed.
8. Run deep analysis.
9. Generate patch notes.
10. Enter skAI mode before applying bundle.
11. Export patched project ZIP and/or proof pack.

---

## Privacy/local-only mode

When Local-only mode is enabled:

- No file contents leave the browser.
- No file paths leave the browser.
- The AI receives only computed summary metrics and local heuristic findings.
- Patch bundles are disabled because full patch generation requires file contents.

---

## Preview limitations

Live Preview is for static browser-runnable projects. Framework projects that require a build step still get audit, patch, seed, proof, and workspace functionality, but preview may not run until built elsewhere.

The Service Worker preview server is local to the browser and serves only files loaded by the operator.

---

## ZIP limitations

The built-in ZipLite importer/exporter supports common ZIP files with stored or deflated entries.

Not supported:

- Encrypted ZIPs
- ZIP64
- Multi-disk ZIPs

---

## Hard honesty boundary

This package is a much stronger platform foundation now. It still does not prove these without separate live tests:

- Live kAIxuGateway13 credentials
- Live deployment correctness
- Live provider usage/cost caps
- Live browser E2E against a production URL
- Shared team persistence
- Server-side enforcement of upstream identity claims

Those belong to the parent shell and deployment/proof pipeline.

## Platform machinery added in 2.2.0

This package now includes code-level platform machinery beyond the original evaluator surface:

- Provider Marketplace tab for discovering, safety-checking, installing, and exporting gateway-routed provider packs.
- Policy gates for direct-provider URLs, hardcoded secrets, seed readiness, tests/smoke, patch preflight, and upstream role checks.
- Issue-to-patch task queue with acceptance criteria for each deterministic issue.
- Optional shared workspace API adapter contract that pushes/pulls workspace snapshots while forwarding inherited upstream identity claims.
- Automation tab for closure workflow runs, seed ETL job planning, ETL job file generation, and browser-preview proof.
- Expanded proof packs containing provider registry, policy results, task queue, ETL jobs, and browser proof output.

The remaining backend/API pieces are intentionally documented as contracts. Auth remains inherited upstream.

## Platform hardening added in 2.4.0

This package now includes the code-only hardening pass requested after the 2.3 review:

- Shared workspace API contract repaired with matching upstream identity headers and `?id=` pull behavior.
- Workspace version history for local IndexedDB and shared file/memory stores.
- Seed ETL path handling locked to project-local `platform-seed/` inputs and `generated/platform-data/` outputs.
- Browser platform helper modules under `src/client/`.
- Playwright browser proof runner at `tools/playwright-browser-proof.mjs`.
- Safe build execution adapter at `src/platform/build-executor.mjs`.
- Task receipt/proof loops in `src/platform/task-runner.mjs`.
- Seed dedupe, provenance, and chunk generation.

Additional validation commands:

```bash
npm run platform:etl
npm run build:proof
npm run test:browser
```

`npm run test:browser` writes an honest skipped receipt if Playwright is not installed. It does not fake browser proof.

See `docs/platform-hardening-2.4.md` and `COMPLETION_REPORT_2.4.0.md`.
