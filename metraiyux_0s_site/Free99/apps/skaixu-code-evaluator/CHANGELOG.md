
## 2.6.0 - Website Surface Update

- Split the public website from the operator console.
- Moved the evaluator app runtime to `app.html`.
- Rebuilt `index.html` as a client-facing landing page with product positioning, workflow, proof boundaries, FAQ, structured data, and launch CTAs.
- Added `assets/skaixu-mark.svg`, `site.webmanifest`, `robots.txt`, `sitemap.xml`, and refreshed `ai.md`.
- Added Netlify redirects for `/app` and `/launch`.
- Updated smoke, closure, and browser-proof scripts to validate the website/app split.


## 2.5.0 - Platform closure pass

- Added `src/platform/platform-closure-orchestrator.mjs` and `npm run closure:proof`.
- Added `tools/platform-closure-smoke.mjs` and included it in `npm test`.
- Added optimistic workspace concurrency via `expectedLatestVersionId`.
- Hardened workspace snapshot validation and atomic file-store writes.
- Added workspace API 409 conflict handling.
- Strengthened build execution receipts and blocked empty-stage false positives.
- Upgraded task-runner proof loops to materialize patched artifacts.
- Added closure docs and completion report.

# Changelog

## 2.3.0-platform-backplane — 2026-05-10

- Added reusable `src/platform/` modules for shared workspace storage, seed ETL, provider lifecycle, framework adapters, and deterministic task patch generation.
- Added Netlify function code for inherited-auth workspace storage and server-side seed ETL execution.
- Added Backplane tab to generate framework adapter manifests, provider lifecycle audits, workspace API contracts, and deterministic task patch bundles.
- Added `generated/platform-backplane/` writer path from the UI.
- Expanded proof pack export with framework adapter, provider lifecycle audit, and deterministic task patch bundles.
- Added `tools/platform-api-smoke.mjs` to validate the new code modules.
- Updated `npm test` to run both app smoke and platform API/module smoke.

## 2.2.0-platform-machinery — 2026-05-10

- Added Provider Marketplace tab with provider-pack discovery, gateway-safety checks, install/enable state, and provider registry export into `platform-ledgers/`.
- Added policy gate engine for direct-provider routing, hardcoded secrets, seed readiness, tests/smoke, patch preflight, and upstream role checks.
- Added issue-to-patch task queue that converts deterministic issues into implementation tasks with acceptance criteria.
- Added optional shared workspace API adapter contract for push/pull while forwarding inherited upstream identity claims.
- Added Automation tab with closure workflow runs, seed ETL job planning, ETL job file generation, and browser-preview proof checks.
- Expanded proof packs with policy results, provider registry, task queue, ETL jobs, and browser proof output.
- Added additional seed files for default policy gates, browser preview proof provider pack, and seed ETL materialization workflow.

## 2.1.0-platform-ops — 2026-05-10

- Added Ops ledger tab with deterministic issue backlog generation.
- Added backlog JSON export.
- Added code path to write `platform-ledgers/` files into the loaded project.
- Added Data registry tab with seed validation, schema inference, duplicate-like record detection, and business-directory projection.
- Added seed materialization into `generated/platform-data/`.
- Added `SKAI_PATCH_BUNDLE` preflight validation before applying AI-generated patches.
- Added operator event timeline for imports, saves, patches, seed imports, and ledger generation.
- Added business directory seed schema and Arizona sample business CSV.
- Fixed regex scanner state bugs in TODO/risky API checks.
- Expanded proof pack contents with issue ledger, backlog, seed validation, and event timeline.


## 2.0.0-platform — 2026-05-10

- Fixed the inline JavaScript parse blocker caused by duplicate `localOnly` declaration.
- Added Platform command center.
- Added IndexedDB workspace registry with save/load/delete support.
- Added upstream-auth adapter contract without implementing auth.
- Added file-driven seed center with static manifest autoload, seed folder import, and seed zip import.
- Added proof/readiness ledger with route inventory, action inventory, env inventory, public claim scan, closure checklist, and platform readiness score.
- Added proof pack export zip.
- Added platform seed skeleton generator.
- Added seed files under `platform-seed/`.
- Added docs for upstream auth, seed operations, and proof packs.
- Added package smoke test for inline JS parse, platform IDs, seed manifest references, and gateway-only endpoint scan.
## 2.4.0-platform-hardening

- Fixed frontend/shared workspace API contract and identity headers.
- Added workspace version history locally and in the shared workspace store/API.
- Locked seed ETL function to project-local allowed paths.
- Added seed directory scanning, file caps, dedupe, provenance, and chunk outputs.
- Split browser platform helper logic into `src/client/` modules.
- Added Playwright browser proof runner.
- Added safe build execution planner/runner with receipts.
- Added deterministic task-runner receipt loops.
- Added `tools/platform-hardening-smoke.mjs`.

