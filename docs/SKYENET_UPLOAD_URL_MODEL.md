# SkyeNet Upload And URL Model

Last updated: 2026-05-28

SkyeNet is a real deploy lane backed by the shared 0S/FS27/SkyGate/Free99 auth estate. The shared SkyeNet Worker origin and console live at:

```text
https://skyenet.graylondonskyes.workers.dev
```

The customer-facing name is always SkyeNet. Provider/runtime details stay internal.

## Current Route Truth

Canonical public company SkyeNet routes use platform-native company hostnames:

```text
https://skyenet.<company-slug>/
```

Examples:

```text
https://skyenet.skyeroutex-logistics/
https://skyenet.skyesol/
https://skyenet.solenterprises/
```

The shared Worker path route is an infrastructure/origin, fallback, proof, or temporary staging shape unless the owner explicitly approves it as public copy:

```text
https://skyenet.graylondonskyes.workers.dev/<project>/
```

The old 0S route shape is legacy/staging only after the standalone cutover:

```text
https://metraiyux-0s-full-system.graylondonskyes.workers.dev/skyenet/<project>/
```

Do not publish new customer-facing apps with the 0S `/skyenet/<project>/` URL as the primary link unless the owner explicitly asks for a temporary staging route. After a platform-native SkyeNet deployment is proven and archived, the old 0S route should redirect to the platform-native SkyeNet hostname.

The 0S API proxy remains valid for control-plane work:

```text
https://metraiyux-0s-full-system.graylondonskyes.workers.dev/api/skyenet/*
```

The standalone SkyeNet Worker also exposes the same gate-backed API shape:

```text
https://skyenet.graylondonskyes.workers.dev/api/skyenet/*
```

Forms owner workflows use the same shared-gate API shape:

```text
GET/POST/PATCH /api/skyenet/forms-policy
GET /api/skyenet/forms-inbox
GET/PATCH /api/skyenet/forms-submission
GET /api/skyenet/forms-file
POST /api/skyenet/forms-notify
```

## Upload Flow

The standalone console at `/console` supports a real build drop. The 0S-mounted console can still proxy the same control lane for internal operator work, but standalone SkyeNet is the public deploy target.

1. The user signs in through the shared 0S FS27/SkyGate/Free99 gate.
2. The console provisions or resumes the customer's SkyeNet workspace through `POST /api/skyenet/workspace`.
3. The console loads the customer dashboard through `GET /api/skyenet/dashboard`.
4. The console calls `POST /api/skyenet/deploy/init`.
5. The user drops a folder into the visible SkyeNet Drop zone or selects a build folder.
6. The console strips the wrapper folder automatically, promotes common build roots (`dist`, `build`, `out`, `public`) to the deployment root, skips private/source-only paths, and previews root/index readiness.
7. If the Skrucible forge pass is enabled, the console injects `assets/skyenet-skrucible.css`, `assets/skyenet-skrucible.js`, and `skyenet-skrucible-manifest.json` so plain static surfaces get living SkyeNet motion chrome without a rebuild.
8. The console uploads each file through `PUT /api/skyenet/deploy/upload?workspaceId=...&projectId=...&deploymentId=...&path=...`.
9. The console seals the manifest through `POST /api/skyenet/deploy/complete`; SkyeNet requires a root `index.html` for static public routes so a bad bundle cannot quietly publish a dead link.
10. The console registers the route through `POST /api/skyenet/deploy/route`.
11. The console renders the returned `live_url` as a direct link immediately after publish.
12. The platform-native SkyeNet hostname hands `/` public surface requests to the SkyeNet runtime resolver, so the returned `live_url` serves the uploaded R2 bundle. Shared-origin staging path routes may still use `/<project>/` and a trailing slash so relative assets like `assets/app.css` resolve inside the deployed bundle.
13. SkyeNet writes customer receipts, updates the scoped dashboard, and serves the mapped route from the asset vault or fallback origin. If a historical route record exists but the root asset is missing, the runtime returns a SkyeNet asset-missing diagnostic instead of the misleading route-not-found bridge message.

Chromebook users can use the same flow from the browser, or use bash/curl if they have a shared gate session token.

## CLI Shape

The first-party CLI wrapper is:

```bash
npm run skyenet:deploy -- \
  --dir dist \
  --project my-site \
  --workspace default-workspace \
  --plan free99 \
  --token "$SKYENET_AUTH" \
  --host skyenet.my-site \
  --mount / \
  --url-mode subdomain \
  --public \
  --concurrency 4
```

It also accepts `--zip bundle.zip` when the local machine has `unzip` available.

Omit `--public` for a gate-protected workspace/app. The CLI will register `default_auth: "gate"` for non-public routes.

## Bash Shape

```bash
export SKYENET_API="https://skyenet.graylondonskyes.workers.dev/api/skyenet"
export SKYENET_AUTH="Bearer <0S_GATE_SESSION>"
export PROJECT_ID="my-site"
export WORKSPACE_ID="default-workspace"
export DEPLOYMENT_ID="dep_$(date +%Y%m%d%H%M%S)"

curl -s -X POST "$SKYENET_API/deploy/init" \
  -H "Authorization: $SKYENET_AUTH" \
  -H "content-type: application/json" \
  --data "{\"workspace_id\":\"$WORKSPACE_ID\",\"project_id\":\"$PROJECT_ID\",\"deployment_id\":\"$DEPLOYMENT_ID\",\"title\":\"$PROJECT_ID\"}"

curl -s -X PUT "$SKYENET_API/deploy/upload?workspaceId=$WORKSPACE_ID&projectId=$PROJECT_ID&deploymentId=$DEPLOYMENT_ID&path=index.html" \
  -H "Authorization: $SKYENET_AUTH" \
  -H "content-type: text/html; charset=utf-8" \
  --data-binary @dist/index.html

curl -s -X POST "$SKYENET_API/deploy/complete" \
  -H "Authorization: $SKYENET_AUTH" \
  -H "content-type: application/json" \
  --data "{\"workspace_id\":\"$WORKSPACE_ID\",\"project_id\":\"$PROJECT_ID\",\"deployment_id\":\"$DEPLOYMENT_ID\",\"files\":[\"index.html\"]}"

curl -s -X POST "$SKYENET_API/deploy/route" \
  -H "Authorization: $SKYENET_AUTH" \
  -H "content-type: application/json" \
  --data "{\"workspace_id\":\"$WORKSPACE_ID\",\"project_id\":\"$PROJECT_ID\",\"deployment_id\":\"$DEPLOYMENT_ID\",\"hostname\":\"skyenet.$PROJECT_ID\",\"mount_path\":\"\",\"url_mode\":\"subdomain\",\"default_auth\":\"public\",\"public_access\":true}"
```

## URL Model

Platform-native company hostname routes are canonical for public company surfaces:

```text
https://skyenet.<company-slug>/
```

Register them as host-native route records:

```json
{
  "project_id": "skyeroutex-logistics-public",
  "deployment_id": "dep_20260528120000",
  "hostname": "skyenet.skyeroutex-logistics",
  "mount_path": "",
  "url_mode": "subdomain",
  "public_access": true,
  "default_auth": "public"
}
```

The shared-origin path route remains available for generic demos, fallback, proof, and explicitly approved staging:

```text
https://skyenet.graylondonskyes.workers.dev/<project>/
```

The route registry already stores arbitrary hostnames, so DNS/wildcard routing is the infrastructure step. The same `deploy/route` endpoint can register other host-native records:

```json
{
  "project_id": "my-site",
  "deployment_id": "dep_20260523120000",
  "hostname": "skyenet.my-site",
  "mount_path": "",
  "url_mode": "subdomain",
  "public_access": true,
  "default_auth": "public"
}
```

Custom domains use the same route table after owner verification. Owner-operated public company surfaces are owner-approved host-native SkyeNet routes. Normal customer Free99 demo workspaces should stay path-route or shared-origin unless an owner approves a custom hostname.

Route safety rule: SkyeNet canonicalizes host input and URL-encodes human mount names before saving the route. A user can type a friendly mount like `/Gray Skyes Demo`; SkyeNet stores and returns `/Gray%20Skyes%20Demo/`, and the public resolver also recognizes older records that were saved with raw spaces or the internal service-binding host.

## Source Custody, Bundle Download, And Transfer

SkyeNet has a Netlify-style deployed-file recovery lane for the uploaded bundle:

```text
GET https://skyenet.graylondonskyes.workers.dev/api/skyenet/source-download?workspace_id=<workspace>&project_id=<project>&deployment_id=<deployment>
```

This endpoint requires the same shared gate bearer/session as the deploy API. It returns an `application/x-tar` bundle containing the deployed files plus `.skyenet/source-manifest.json`.

The 0S proxy also forwards the same endpoint:

```text
GET https://metraiyux-0s-full-system.graylondonskyes.workers.dev/api/skyenet/source-download?workspace_id=<workspace>&project_id=<project>&deployment_id=<deployment>
```

Important boundary: this downloads the deployed SkyeNet bundle, not the entire repository, unless the full repository was intentionally uploaded as the deployed bundle. Full repo custody belongs to the SkyeVault/repo-vault lane.

SkyeNet also has an explicit source-transfer storage lane:

```text
POST https://skyenet.graylondonskyes.workers.dev/api/skyenet/source-transfer
```

Supported methods are `download`, `instant-download-link`, `skyedrive`, `skyevault`, and `secure-skye-pack`. `skyedrive` and `skyevault` write private source archive artifacts. `secure-skye-pack` writes an encrypted `.skye` pack plus an owner-admin key custody record. The secure customer-facing pack extension is `.skye`, backed by the SkyeDocxMax `.skye` naming lane and the stronger SkyeSecure v2 `SKYESEC2` source-pack format.

Client access to source is not automatic. The deployment record is scoped to the deploying account/customer ID, and cross-account handoff requires an owner/admin transfer receipt.

## Admin Unlock And Free99

Free99 remains capped for normal users so the platform cannot quietly run up storage, request, route, or deployment cost.

Owner/admin sessions are different: the 0S proxy forwards an explicit owner/admin override into FS27. That override keeps the workspace visible in the normal quota dashboard, but deploy and route enforcement do not burn or block on Free99 credits while the owner is unlocked. Customer workspaces without that owner/admin signal still receive the normal Free99 or paid-plan caps.

## Function Boundary In Plain English

Managed SkyeNet functions are the safe lane today. They require an approved paid/owner plan, a manifest, a signature, redacted runtime bindings instead of raw customer secrets, timeout/body/memory/subrequest/egress caps, invocation receipts, an abuse kill switch, and billing guards before scale. Customer-uploaded JS/ESM Netlify-compatible functions now enter through this lane: the deploy CLI bundles helper imports, uploads bundle files, and FS27 server-signs the manifest only after storage hash verification.

Sovereign isolated functions means a harder future lane for arbitrary code from customers we do not fully trust. The customer uploads code, but it runs inside a per-tenant sandbox such as an isolate pool, rootless container, or microVM on SkyeNet-owned runtime capacity. That sandbox gets its own filesystem/process boundary, CPU and memory limits, network rules, secret broker, logs, billing meter, and kill switch. The point is not the word "sovereign"; the point is that hostile or messy customer code cannot share the same trusted Worker/global runtime as the platform itself.

Current truth:

- `functions_enabled` is false by default.
- `managed_functions_enabled` is true only on paid or owner-approved plans.
- Function bundles require manifest and signature.
- Customer uploads can use `server_sign_manifest` / `customer_upload`; unsigned completion without that flag remains rejected.
- Raw customer secrets are not exposed directly to runtime code.
- Timeout, memory, body, request/subrequest, and egress caps are part of the runtime contract.
- Invocation logs/receipts, workspace kill switch, and billing guard are required before scale.
- Unrestricted hostile-code execution, scheduled/background functions, native dependency build/install, and first-class rollback UI stay reserved for the isolated runtime, jailed builder, and deployment-history phases.

## What Is Sellable Today

Sell today:

- Static build drops.
- Browser folder drops with automatic root-folder stripping.
- Automatic promotion of common build output folders such as `dist`, `build`, `out`, and `public`.
- Root `index.html` enforcement before publish and asset-missing diagnostics for old bad routes.
- Source/private path filtering for dropped bundles.
- Skrucible-enhanced static surfaces through generated CSS, JS, and manifest assets.
- Customer workspace provisioning through the shared 0S gate.
- Customer-scoped dashboard with deployments, routes, receipts, quota posture, and source bundle download links.
- First-party CLI directory and zip bundle push.
- Private full project source-package upload with `--source-root`, stored separately from public assets.
- Project environment-variable registry through `/api/skyenet/env`, with redacted console previews.
- SkyeNet route registration on platform-native company hostnames.
- Direct live link returned in-console after publish.
- Public or gate-protected hosted pages.
- Live `https://skyenet.<company-slug>/` public company route serving from the uploaded SkyeNet asset vault.
- Netlify-style source download for gated account recovery. When a private source package exists, downloads return the full project package; otherwise they fall back to deployed public files.
- Fallback origin proxying.
- Managed first-party SkyeNet functions.
- Netlify-compatible JS/ESM function bundle intake, CLI bundling, server-signed activation, and Dynamic Worker invocation for managed/owner-approved workspaces.
- Observability and cost receipts behind the owner/admin dashboards.

Do not sell as unlimited yet:

- Unrestricted hostile-code serverless execution without the isolated SkyeNet Functions runtime.
- Scheduled/background functions, jailed native dependency build/install, and first-class function rollback UI.
- Uncapped Free99 bandwidth/storage/functions.
- Raw private-server claims without the SkyeNet Sovereign Runtime proof lane.

## Existing Repo Tooling

SkyeNet is connected to the actual repo builder ecosystem:

- `https://skyenet.graylondonskyes.workers.dev/console` is the standalone deploy/account console.
- `/api/skyenet/*` is the shared-gate SkyeNet deploy API shape on standalone SkyeNet and the 0S proxy.
- `platform/skyenet/worker.js` owns the standalone SkyeNet Worker surface.
- `metraiyux_0s_site/skyegate/source/SkyeGateFS27/cloudflare/skynet-deploy-api.mjs` owns init/upload/complete/route/status/routes/env/source-upload/source-complete/observability/cost/source-download and Forms owner workflow APIs.
- `tools/skyenet-deploy.mjs` deploys folders or zip bundles to standalone SkyeNet by default.
- `tools/proof-skynet-source-download-live-http.mjs` proves dashboard/source-download parity without browser proof.
- `tools/skyenet-functions-convert.mjs` bundles Netlify-style functions for upload; `tools/skyenet-functions-runtime.mjs` proves the local compatibility runtime.
- `npm run 0s:skyenet:proof`, `npm run 0s:skyenet:functions-proof`, `npm run skyenet:netlify-parity:proof`, and `npm run skyenet:netlify-parity:stress` are the current proof commands.

Public posting and pricing handoff:

- `docs/SKYENET_PUBLIC_POSTING_GUIDE.md`
- `https://skyenet.graylondonskyes.workers.dev/publish/`
