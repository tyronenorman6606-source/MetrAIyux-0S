# Platform Backplane 2.3

This version adds reusable platform-side code so the app is not just a static UI with panels.

## Added code modules

- `src/platform/shared-workspace-store.mjs` — tenant-scoped workspace snapshot store with inherited upstream identity role checks. Includes memory and file-backed stores.
- `src/platform/seed-etl-worker.mjs` — seed manifest loader, CSV/NDJSON/JSON parser, schema inference, business-directory projection, validation, search-index generation, and materialization writer.
- `src/platform/provider-lifecycle.mjs` — provider-pack normalization, gateway-only validation, install/enable/disable registry, and audit logic.
- `src/platform/framework-adapters.mjs` — framework detection and adapter manifest generation for Vite, Next, React, Vue, SvelteKit, Netlify Functions, Cloudflare Workers, and static HTML.
- `src/platform/task-runner.mjs` — deterministic issue-to-`SKAI_PATCH_BUNDLE` generator for common platform gaps.

## Added API-function code

- `netlify/functions/platform-workspaces.mjs` — shared workspace endpoint contract implementation using inherited identity headers.
- `netlify/functions/platform-seed-etl.mjs` — seed ETL materialization endpoint.

These functions are code artifacts. They do not add local auth. They expect upstream identity to be forwarded in headers.

## Added app surface

The new **Backplane** tab generates:

- framework adapter manifest
- provider lifecycle audit
- inherited-auth workspace contract
- deterministic task patch bundles

It can write those files into the loaded project under `generated/platform-backplane/`.

## Validation

Run:

```bash
npm test
```

This runs both the browser app smoke and the module/API smoke:

```bash
node tools/smoke-check.mjs
node tools/platform-api-smoke.mjs
```
