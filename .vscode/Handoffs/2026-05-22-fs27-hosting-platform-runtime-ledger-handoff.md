# FS27 SkyeNet Runtime Ledger Handoff

Date written: 2026-05-22 UTC  
Repo: `/workspaces/MetrAIyux-0S`  
Live Worker: `https://skyegatefs27-citadeldb.graylondonskyes.workers.dev`  
Latest deployed Worker version: `b2ec1220-7be9-4918-b4cc-3d3e23081f18`

## Status

This pass built and deployed the Cloudflare-backed FS27 hosting gateway foundation for SkyeNet. It is now doing the important stage-two job: every request flows through FS27, gets request-tracked without synchronous D1/Citadel writes, and can dispatch to local FS27 functions, curated FS27 public assets, host-mounted deployments, or path-mounted deployments such as `/sovereign-docs/`.

Per owner override in-thread, final verification for this pass used smoke checks instead of the repo's full live headed-browser proof. A headed proof was attempted earlier and produced a receipt, but it was intentionally not treated as required completion for this pass after the override.

## What Is Live

The deployed FS27 Worker now has:

- Nonblocking runtime request observation in `cloudflare/runtime-observer.mjs`.
- `withRuntimeLedger(...)` wrapping the Worker fetch path.
- Analytics Engine writes through `REQUEST_ANALYTICS`.
- Async queue handoff through `REQUEST_EVENT_QUEUE`.
- Queue consumer archiving exact redacted JSONL events to R2 through `REQUEST_LOG_BUCKET`.
- Optional async D1 rollups through `RUNTIME_ROLLUP_DB` once D1 permission is fixed and the binding is enabled.
- Optional async Citadel mirror through `CITADEL_RUNTIME_INGEST_URL` once Citadel ingest is stood up.
- R2 static deployment dispatch through `DEPLOYMENT_ASSET_BUCKET`.
- Host route lookup through `route:v1:host:<hostname>` in `ROUTING_KV`.
- Path-mounted route lookup through `route:v1:host:<hostname>:path:/mount-prefix` in `ROUTING_KV`.
- Mount-prefix stripping for path apps, so `/sovereign-docs/assets/app.js` reads `assets/app.js` inside that deployment prefix.
- Fallback origin proxying with `Authorization` and `Cookie` stripped unless `forward_auth === true`.
- Shared FS27 gate enforcement for mapped routes when `public_access === false` or `default_auth` is not public/none.
- Source-path blocking before `env.ASSETS`, so old uploaded source files return 404.
- Curated Worker asset root at `public/` instead of deploying the whole FS27 source folder.
- A generated `/favicon.ico` response to avoid browser favicon 404 noise.

## Files Changed Or Added

Core runtime/gateway:

```text
metraiyux_0s_site/skyegate/source/SkyeGateFS27/cloudflare/runtime-observer.mjs
metraiyux_0s_site/skyegate/source/SkyeGateFS27/cloudflare/worker.mjs
metraiyux_0s_site/skyegate/source/SkyeGateFS27/wrangler.toml
```

Tests and scripts:

```text
metraiyux_0s_site/skyegate/source/SkyeGateFS27/tests/runtime-observer.test.mjs
metraiyux_0s_site/skyegate/source/SkyeGateFS27/scripts/sync-cloudflare-assets.mjs
metraiyux_0s_site/skyegate/source/SkyeGateFS27/package.json
```

Public asset hardening/proofability:

```text
metraiyux_0s_site/skyegate/source/SkyeGateFS27/.assetsignore
metraiyux_0s_site/skyegate/source/SkyeGateFS27/public/
metraiyux_0s_site/skyegate/source/SkyeGateFS27/index.html
metraiyux_0s_site/skyegate/source/SkyeGateFS27/assets/three-bg-gate.js
```

## Cloudflare Resources Created Or Bound

```text
Analytics Engine dataset: fs27_runtime_requests
Queue producer/consumer: fs27-runtime-events
Dead letter queue: fs27-runtime-events-dlq
R2 raw request log bucket: fs27-runtime-request-logs
R2 deployment asset bucket: zero-os-deploy-artifacts
KV route namespace: ROUTING_KV = 62d5bbc0c9e946b489dc44507fb8c40b
```

D1 was not enabled because the current Cloudflare token failed D1 creation with authentication/permission errors. The Worker config keeps the D1 binding commented until a token with D1 permissions creates `fs27-runtime-rollups`.

## Verification Run

Local checks passed:

```text
npm run check:worker
npm run test:runtime-observer
```

Runtime observer tests now cover:

- Ledger wrapper writes Analytics and queues a redacted event.
- Route resolver prefers path-mounted records over host records.
- Queue consumer archives exact events to R2 and performs async D1/Citadel sink calls with mocks.

Wrangler dry run passed with the expected bindings and curated asset root:

```text
npm run deploy:worker:dry-run
```

Latest deploy passed:

```text
npx wrangler deploy
Current Version ID: b2ec1220-7be9-4918-b4cc-3d3e23081f18
```

Smoke checks passed after deploy:

```text
200 / -> /
200 /health -> /health
200 /favicon.ico -> /favicon.ico
200 /platforms.html -> /gate-map
200 /Platforms-Apps-Infrastructure/ -> /gate-map
200 /kAIxu/RequestKaixuAPIKey.html -> /key-generator
200 /gateway/dashboard.html -> /dashboard
200 /assets/style.css -> /assets/style.css
404 /tests/runtime-observer.test.mjs
404 /runtime/store.json
404 /netlify.toml
404 /package.json
```

R2 async log archive proof:

```text
Bucket: fs27-runtime-request-logs
Prefix observed: runtime-logs/yyyy=2026/mm=05/dd=22/customer=unknown/project=unknown/hour=08/
Sample object downloaded remotely:
runtime-logs/yyyy=2026/mm=05/dd=22/customer=unknown/project=unknown/hour=08/batch_031b65f2-0466-40cc-aaa6-ebd2ece66166.jsonl
Sample contained 3 runtime request events.
```

## Hot Path Rule

Do not add synchronous durable writes inside request handling. This is the contract now:

```text
Visitor response path:
  Analytics Engine writeDataPoint, best effort
  ctx.waitUntil(queue.send(redactedEvent)), best effort
  return response

Queue consumer path:
  write raw exact JSONL to R2
  write rollups to D1 when bound
  mirror to Citadel when configured
```

No raw `Authorization`, cookies, body payloads, or query values are logged. Query keys are logged as `query_shape`.

## SkyeNet Deployment Model

Yes: this is now the base for deploying your own websites and apps under the 0S/FS27 SkyeNet instead of using Netlify or iframe wrappers.

Use either of these shapes:

```text
Custom host:
  docs.yourdomain.com -> FS27 Worker -> ROUTING_KV route:v1:host:docs.yourdomain.com

Path mount:
  skynet.yourdomain.com/sovereign-docs/ -> FS27 Worker -> ROUTING_KV route:v1:host:skynet.yourdomain.com:path:/sovereign-docs
```

A path-mounted route record should look like this:

```json
{
  "schema": "fs27.route.v1",
  "hostname": "skynet.yourdomain.com",
  "mount_path": "/sovereign-docs",
  "strip_mount_path": true,
  "customer_id": "cust_internal_0s",
  "project_id": "sovereign-docs",
  "active_deployment_id": "dep_20260522_001",
  "public_access": false,
  "default_auth": "gate",
  "asset_mode": "r2",
  "asset_prefix": "deployments/sovereign-docs/dep_20260522_001"
}
```

Then upload static files to R2 under:

```text
zero-os-deploy-artifacts/deployments/sovereign-docs/dep_20260522_001/index.html
zero-os-deploy-artifacts/deployments/sovereign-docs/dep_20260522_001/assets/app.js
zero-os-deploy-artifacts/deployments/sovereign-docs/dep_20260522_001/assets/style.css
```

Because `strip_mount_path` defaults to true, a browser request for:

```text
/sovereign-docs/assets/app.js
```

will read:

```text
deployments/sovereign-docs/dep_20260522_001/assets/app.js
```

## Answer About `soveReign13-citadel-forge-commercial-v1.3.0`

The folder checked was:

```text
/workspaces/MetrAIyux-0S/unpacked-projects/soveReign13-citadel-forge-commercial-v1.3.0
```

Current contents are only:

```text
soveReign13-citadel-forge-commercial-v1.3.0/
soveReign13-citadel-forge-commercial-v1.3.0/forgejo/
soveReign13-citadel-forge-commercial-v1.3.0/forgejo/custom/
soveReign13-citadel-forge-commercial-v1.3.0/portal/
```

There is no deployable app in that folder yet: no `index.html`, no `package.json`, no `dist/`, no `wrangler.toml`, no Dockerfile, and no visible static portal files.

So the exact folder cannot be deployed as-is because it is basically an empty scaffold.

But the architecture answer is yes:

- If Sovereign13 is a static/browser app, build it and upload the built output into `zero-os-deploy-artifacts`, then register a `ROUTING_KV` route.
- If Sovereign13 includes full Forgejo/Citadel server behavior, do not try to make that a pure Worker static deploy. Run the heavy server as a backend/origin/container/tunnel service, then route it through FS27 with `fallback_origin` or service binding. FS27 still owns auth, public/private route policy, request tracking, and logs.
- The old iframe pattern is not needed for the browser app. A real path or subdomain can load the full app directly.

## Immediate Next Build Step

Create a provider-neutral deploy API in FS27:

```text
POST /deploy/init
POST /deploy/upload
POST /deploy/complete
POST /deploy/route
```

That API should:

1. Require shared FS27 gate auth for owner/operator/client deploy operations.
2. Accept a static build bundle or generated build output.
3. Upload files into `DEPLOYMENT_ASSET_BUCKET` under `deployments/<project>/<deployment>/...`.
4. Write a `ROUTING_KV` route record for host or path mount.
5. Emit `fs27.deploy_created.v1` and `fs27.domain_activated.v1` events through the async event path.

## Netlify Function Conversion Step

For Netlify function replacement, add a converter lane that accepts a user function package and outputs one of:

```text
Cloudflare Worker module handler
FS27 internal route-table handler
Backend service/origin route
```

Start with simple Netlify functions shaped like:

```js
export async function handler(event, context) {}
```

Convert to a standard FS27 runtime handler shaped like:

```js
export default async function handle(request, context) {}
```

Keep this separate from static deploys. Static deploys can go live first; function conversion can be layered by project.

## Important Remaining Items

- Create `fs27-runtime-rollups` D1 with a token that has D1 permissions, then uncomment the `RUNTIME_ROLLUP_DB` binding in `wrangler.toml`.
- Stand up Citadel runtime ingest and set `CITADEL_RUNTIME_INGEST_URL`/token as Worker secrets or vars.
- Build the actual deploy API endpoints listed above.
- Add a small route admin UI to write `ROUTING_KV` records safely.
- Add a bundle uploader for `zero-os-deploy-artifacts`.
- Re-run full live headed-browser proof when the owner wants the production proof gate enforced again.


## Addendum: SkyeNet Deploy API Completed

Date updated: 2026-05-22 UTC  
Latest deployed Worker version after deploy API: `a6adb8d2-39f5-4fca-8a39-07697decbb3b`

This continuation added the actual Cloudflare-native SkyeNet deploy lane, not just the route/ledger foundation.

New API module:

```text
metraiyux_0s_site/skyegate/source/SkyeGateFS27/cloudflare/skynet-deploy-api.mjs
```

Worker routes added:

```text
OPTIONS /deploy/init
POST    /deploy/init
OPTIONS /deploy/upload
PUT     /deploy/upload
POST    /deploy/upload
OPTIONS /deploy/complete
POST    /deploy/complete
OPTIONS /deploy/route
POST    /deploy/route
```

All deploy endpoints use the shared FS27/SkyGate/Free99 gate lane through `requireGateAuth(req, "deployer")`. No app-specific admin password was added.

### Deploy Flow Now Proven Live

Live proof ran against:

```text
https://skyegatefs27-citadeldb.graylondonskyes.workers.dev
```

The smoke deployed a real tiny app through the new API:

```text
project_id: skynet-smoke
deployment_id: dep_20260522112827
mount_path: /skynet-smoke
route key: route:v1:host:skyegatefs27-citadeldb.graylondonskyes.workers.dev:path:/skynet-smoke
```

Calls completed successfully:

```text
200 /deploy/init
200 /deploy/upload
200 /deploy/complete
200 /deploy/route
200 /skynet-smoke/
```

Rendered mounted page proof:

```text
https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skynet-smoke/
```

The mounted page body included:

```text
SkyeNet Smoke Deploy
```

This proves the full SkyeNet loop is alive:

```text
authenticated deploy request
  -> R2 deployment asset write
  -> deployment completion manifest
  -> ROUTING_KV path route write
  -> FS27 route resolver
  -> mount-prefix stripping
  -> R2 asset dispatch
  -> browser-visible mounted app
```

### New Tests Added

```text
npm run test:skynet-deploy-api
```

Coverage:

- Initializes a deployment with mocked R2.
- Uploads an asset into the expected deployment prefix.
- Completes a deployment manifest.
- Writes a path-mounted route into mocked KV.
- Rejects source/runtime paths such as `runtime/store.json`.

Latest local checks passed:

```text
npm run check:worker
npm run test:runtime-observer
npm run test:skynet-deploy-api
```

### What This Means For SkyeNet

You can now deploy a static browser app under FS27 without Netlify and without an iframe. The basic static app path is operational. For a real app like Sovereign Docs, the next step is to produce a build folder containing at minimum `index.html` and assets, then upload those files through `/deploy/upload`, complete the deployment, and route it under a path or hostname.

For server-heavy apps such as full Forgejo/Citadel behavior, keep the backend as a service/origin/container and route it through FS27. The frontend/browser portal can still be deployed directly into SkyeNet via this new static deploy lane.

## Addendum: Handoff-Only Stop Point

Date updated: 2026-05-22 UTC

The user asked to stop expanding the active scope and just update this handoff file.

Current final state to resume from:

- FS27 SkyeNet deploy API is live on Worker version `a6adb8d2-39f5-4fca-8a39-07697decbb3b`.
- End-to-end live smoke proved `/deploy/init`, `/deploy/upload`, `/deploy/complete`, `/deploy/route`, and the mounted page `/skynet-smoke/`.
- The handoff above contains the live smoke details and route/deployment identifiers.
- The main 0S changelog source file was edited locally at `metraiyux_0s_site/changelog/index.html` with a top entry for `FS27 SkyeNet Deploy`, including the `/skynet-smoke/` proof link and changed hero summary copy.
- The main 0S changelog edit has not been confirmed as deployed in this stop point. A main 0S Wrangler dry-run was started after the changelog edit, but the user then redirected to handoff-only. Treat the changelog source update as local until a later deploy/proof pass explicitly confirms it live.

Local verification already completed for the FS27 lane before this stop:

```text
npm run check:worker
npm run test:runtime-observer
npm run test:skynet-deploy-api
```

Live FS27 SkyeNet smoke already completed:

```text
200 /deploy/init
200 /deploy/upload
200 /deploy/complete
200 /deploy/route
200 /skynet-smoke/
```

Recommended next resume step:

1. Deploy the main 0S Worker/assets only if you want the changelog source edit live.
2. Smoke `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/changelog/` for the text `FS27 can now deploy and serve first-party SkyeNet apps`.
3. Do not rerun heavy headed browser proof unless the owner explicitly asks for production proof enforcement again.
