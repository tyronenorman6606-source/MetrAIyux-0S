# skAIxu Code Evaluator Platform 2.4 Hardening Notes

This pass closes the code-only gaps called out in the 2.3 review. It does not add auth. Auth remains inherited upstream through the upstream identity bridge.

## What changed

✅ Shared workspace API contract repaired.

The browser now sends the same inherited identity contract that the function expects: `X-SKAI-Upstream-Identity` as base64url JSON plus `X-SKAI-Tenant-Id`, `X-SKAI-User-Id`, and `X-SKAI-Roles` fallbacks. Pulls use `?id=` and unwrap `{ ok, workspace }` responses correctly.

✅ Workspace version history added.

Every local and shared workspace save creates a version receipt with snapshot hash, previous timestamp, and added/changed/removed file counts. The API function exposes `?action=versions&id=` and `?action=version&id=&versionId=`.

✅ Seed ETL locked down.

The seed ETL function no longer accepts arbitrary `rootDir` or arbitrary output paths from request bodies. It only resolves project-local `platform-seed/manifest.json` into allowed generated data folders. Path traversal and absolute paths are rejected.

✅ Frontend platform logic split into modules.

Critical browser-side platform mechanics now live under `src/client/`:

- `workspace-api-client.js`
- `seed-provenance-client.js`
- `task-receipts-client.js`
- `build-execution-client.js`
- `platform-client.js`

The inline app still exists because this package remains a drop-ready static app, but the high-risk platform contracts are no longer trapped only inside `index.html`.

✅ Playwright browser proof added.

`npm run test:browser` runs `tools/playwright-browser-proof.mjs`. If Playwright is not installed, it writes a skipped receipt instead of faking proof. When Playwright is installed, it starts a local static server, opens the app in Chromium, clicks core tabs, and verifies required operator surfaces.

✅ Build execution adapter added.

`src/platform/build-executor.mjs` plans safe framework commands and can run non-deploy commands with logs and receipts. Destructive, deploy, and shell-injection patterns are blocked.

✅ Task runner receipts and proof loops added.

`src/platform/task-runner.mjs` now applies deterministic patch bundles to file maps, emits task receipts, and can run issue-to-patch loops into `generated/task-receipts/`.

✅ Large seed handling improved.

The ETL worker supports manifest-listed directories, caps file count and file size, dedupes business records, writes provenance, and chunks generated business directories under `generated/platform-data/chunks/`.

## Commands

```bash
npm test
npm run platform:etl
npm run build:proof
npm run test:browser
```

## Proof status from this environment

`npm test` passed.

`npm run platform:etl` passed and generated deduped platform data.

`npm run build:proof` passed and wrote a build receipt under `generated/build-receipts/`.

`npm run test:browser` produced a skipped receipt because Playwright is not installed in this container. That is intentional: skipped proof is labeled as skipped, not passed.
