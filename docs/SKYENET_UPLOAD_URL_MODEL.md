# SkyeNet Upload And URL Model

SkyeNet is already mounted into the 0S as a gated deploy lane. The customer-facing name is always SkyeNet. Provider/runtime details stay internal.

## Upload Flow

The browser console at `/skyenet/index.html` supports a real build drop:

1. The user signs in through the shared 0S FS27/SkyGate/Free99 gate.
2. The console provisions or resumes the customer's SkyeNet workspace through `POST /api/skyenet/workspace`.
3. The console loads the customer dashboard through `GET /api/skyenet/dashboard`.
4. The console calls `POST /api/skyenet/deploy/init`.
5. The user drops a folder into the visible SkyeNet Drop zone or selects a build folder.
6. The console strips the wrapper folder automatically, skips private/source-only paths, and previews root/index readiness.
7. If the Skrucible forge pass is enabled, the console injects `assets/skyenet-skrucible.css`, `assets/skyenet-skrucible.js`, and `skyenet-skrucible-manifest.json` so plain static surfaces get living SkyeNet motion chrome without a rebuild.
8. The console uploads each file through `PUT /api/skyenet/deploy/upload?workspaceId=...&projectId=...&deploymentId=...&path=...`.
9. The console seals the manifest through `POST /api/skyenet/deploy/complete`.
10. The console registers the route through `POST /api/skyenet/deploy/route`.
11. The 0S host hands `/skyenet/<project>/` public surface requests to the SkyeNet runtime resolver, so the returned `live_url` serves the uploaded R2 bundle instead of falling back to the 0S static shell. SkyeNet returns the trailing slash for mounted folders so relative assets like `assets/app.css` resolve inside the deployed bundle.
12. SkyeNet writes customer receipts, updates the scoped dashboard, and serves the mapped route from the asset vault or fallback origin.

Chromebook users can use the same flow from the browser, or use bash/curl if they have a 0S session token.

The first-party CLI wrapper is:

```bash
npm run skyenet:deploy -- \
  --dir dist \
  --project my-site \
  --workspace default-workspace \
  --plan free99 \
  --token "$SKYENET_AUTH" \
  --host metraiyux-0s-full-system.graylondonskyes.workers.dev \
  --mount /skyenet/my-site \
  --public
```

It also accepts `--zip bundle.zip` when the local machine has `unzip` available.

## Bash Shape

```bash
export SKYENET_API="https://metraiyux-0s-full-system.graylondonskyes.workers.dev/api/skyenet"
export SKYENET_AUTH="Bearer <0S_GATE_SESSION>"
export PROJECT_ID="my-site"
export DEPLOYMENT_ID="dep_$(date +%Y%m%d%H%M%S)"

curl -s -X POST "$SKYENET_API/deploy/init" \
  -H "Authorization: $SKYENET_AUTH" \
  -H "content-type: application/json" \
  --data "{\"workspace_id\":\"default-workspace\",\"project_id\":\"$PROJECT_ID\",\"deployment_id\":\"$DEPLOYMENT_ID\",\"title\":\"$PROJECT_ID\"}"

curl -s -X PUT "$SKYENET_API/deploy/upload?projectId=$PROJECT_ID&deploymentId=$DEPLOYMENT_ID&path=index.html" \
  -H "Authorization: $SKYENET_AUTH" \
  -H "content-type: text/html; charset=utf-8" \
  --data-binary @dist/index.html

curl -s -X POST "$SKYENET_API/deploy/complete" \
  -H "Authorization: $SKYENET_AUTH" \
  -H "content-type: application/json" \
  --data "{\"workspace_id\":\"default-workspace\",\"project_id\":\"$PROJECT_ID\",\"deployment_id\":\"$DEPLOYMENT_ID\",\"files\":[\"index.html\"]}"

curl -s -X POST "$SKYENET_API/deploy/route" \
  -H "Authorization: $SKYENET_AUTH" \
  -H "content-type: application/json" \
  --data "{\"workspace_id\":\"default-workspace\",\"project_id\":\"$PROJECT_ID\",\"deployment_id\":\"$DEPLOYMENT_ID\",\"hostname\":\"metraiyux-0s-full-system.graylondonskyes.workers.dev\",\"mount_path\":\"/skyenet/$PROJECT_ID\",\"default_auth\":\"public\",\"public_access\":true}"
```

## URL Model

SkyeNet supports two URL shapes.

Path routes are live now:

```text
https://<skyenet-host>/skyenet/<project>/
```

Branded subdomains are the Netlify-like lane:

```text
https://<project>.skyenet.<company-domain>
```

The route registry already stores arbitrary hostnames, so a wildcard SkyeNet domain is the DNS step. Once `*.skyenet.<company-domain>` routes to the SkyeNet Worker, the same `deploy/route` endpoint can register:

```json
{
  "project_id": "my-site",
  "deployment_id": "dep_20260523120000",
  "hostname": "my-site.skyenet.example.com",
  "mount_path": "",
  "url_mode": "subdomain",
  "public_access": true,
  "default_auth": "public"
}
```

Custom domains use the same route table after owner verification. Free99 should stay path-route only unless an owner approves a custom domain.

## Admin Unlock And Free99

Free99 remains capped for normal users so the platform cannot quietly run up storage, request, route, or deployment cost.

Owner/admin sessions are different: the 0S proxy now forwards an explicit owner/admin override into FS27. That override keeps the workspace visible in the normal quota dashboard, but deploy and route enforcement do not burn or block on Free99 credits while the owner is unlocked. Customer workspaces without that owner/admin signal still receive the normal Free99 or paid-plan caps.

## Function Boundary In Plain English

Managed SkyeNet functions are the safe lane today. They require an approved paid/owner plan, a manifest, a signature, redacted runtime bindings instead of raw customer secrets, timeout/body/memory/subrequest/egress caps, invocation receipts, an abuse kill switch, and billing guards before scale.

Sovereign isolated functions means a harder future lane for arbitrary code from customers we do not fully trust. The customer uploads code, but it runs inside a per-tenant sandbox such as an isolate pool, rootless container, or microVM on SkyeNet-owned runtime capacity. That sandbox gets its own filesystem/process boundary, CPU and memory limits, network rules, secret broker, logs, billing meter, and kill switch. The point is not the word "sovereign"; the point is that hostile or messy customer code cannot share the same trusted Worker/global runtime as the platform itself.

Current truth:

- `functions_enabled` is false by default.
- `managed_functions_enabled` is true only on paid or owner-approved plans.
- Function bundles require manifest and signature.
- Raw customer secrets are not exposed directly to runtime code.
- Timeout, memory, body, request/subrequest, and egress caps are part of the runtime contract.
- Invocation logs/receipts, workspace kill switch, and billing guard are required before scale.
- Unrestricted arbitrary customer-uploaded functions stay reserved for the isolated runtime phase.

## What Is Sellable Today

Sell today:

- Static build drops.
- Browser folder drops with automatic root-folder stripping.
- Source/private path filtering for dropped bundles.
- Skrucible-enhanced static surfaces through generated CSS, JS, and manifest assets.
- Customer workspace provisioning through the shared 0S gate.
- Customer-scoped dashboard with deployments, routes, receipts, and quota posture.
- First-party CLI directory and zip bundle push.
- SkyeNet route registration.
- Public or gate-protected hosted pages.
- Live `/skyenet/<project>/` public route serving from the uploaded SkyeNet asset vault.
- Fallback origin proxying.
- Managed first-party SkyeNet functions.
- Netlify-compatible function bundle intake and conversion in controlled preview.
- Observability and cost receipts behind the owner/admin dashboards.

Do not sell as unlimited yet:

- Arbitrary untrusted customer-uploaded serverless execution without the isolated SkyeNet Functions runtime.
- Uncapped Free99 bandwidth/storage/functions.
- Raw private-server claims without the SkyeNet Sovereign Runtime proof lane.

## Existing Repo Tooling

SkyeNet is connected to the actual repo builder ecosystem:

- `/skyenet/index.html` is the gated deploy console.
- `/api/skyenet/*` is the 0S proxy into the SkyeNet deploy API.
- `metraiyux_0s_site/skyegate/source/SkyeGateFS27/cloudflare/skynet-deploy-api.mjs` owns init/upload/complete/route/status/routes/observability/cost.
- `tools/skyenet-functions-convert.mjs` and `tools/skyenet-functions-runtime.mjs` prove Netlify-style function bundle conversion locally.
- `npm run 0s:skyenet:proof`, `npm run 0s:skyenet:functions-proof`, and `npm run 0s:skyenet:live-production-stress` are the current proof commands.
