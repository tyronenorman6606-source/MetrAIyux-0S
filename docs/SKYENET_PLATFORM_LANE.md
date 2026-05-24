# SkyeNet Platform Lane

Last updated: 2026-05-24

SkyeNet is real in this repo as the FS27-backed deployment lane for static edge surfaces and managed SkyeNet platform functions. It is not a separate app with its own password. It uses the shared 0S FS27/SkyGate/Free99 auth lane.

## Naming Rule

Customer-facing language says SkyeNet. Do not present the architecture as "Cloudflare versus SkyeNet." The public lane names are SkyeNet Edge, SkyeNet Deploy, SkyeNet Functions, and SkyeNet Sovereign Runtime. Cloudflare primitives, VPS details, containers, and Postgres engine notes stay in internal proof, cost, and operator docs.

## What Exists Now

- FS27 deploy API: `metraiyux_0s_site/skyegate/source/SkyeGateFS27/cloudflare/skynet-deploy-api.mjs`
- FS27 Worker routes: `/deploy/init`, `/deploy/upload`, `/deploy/complete`, `/deploy/route`, `/deploy/status`, `/deploy/routes`, `/deploy/observability`, `/deploy/cost-model`
- R2 asset storage: `DEPLOYMENT_ASSET_BUCKET`, currently named `zero-os-deploy-artifacts` in the FS27 Worker config
- KV route registry: `ROUTING_KV`
- Runtime observer sinks: Analytics Engine, queue events, R2 JSONL logs, optional D1 hourly rollups, optional Citadel ingest
- 0S gated API proxy: `/api/skyenet/*`
- 0S mounted console: `metraiyux_0s_site/skyenet/index.html`
- 0S desktop app: `SkyeNet Deploy`

## Capability Boundary

Live today as SkyeNet Edge:

- Static build/drop hosting from uploaded assets.
- Host/path route registration.
- Gate-aware route metadata.
- Fallback-origin route records for platform-owned backends.
- Managed SkyeNet function lanes mounted through the 0S/FS27 estate.
- Internal status, route, observability, and cost model APIs.

Signed runtime v1 now:

- Netlify-style function folder intake from `netlify/functions/*`, `functions/*`, or `skyenet/functions/*`.
- Compatible `/.netlify/functions/<name>` and `/.skyenet/functions/<name>` route maps.
- Signed SkyeNet function bundle manifests with tenant IDs, function IDs, route records, limits, and runtime contract metadata.
- SkyeNet-owned runtime proof with request body caps, timeout caps, memory caps, deny-by-default env grants, and default-deny outbound fetch.

Controlled preview / not unlimited yet:

- Arbitrary uploaded serverless functions that execute untrusted customer code.

The repo now has a SkyeNet Functions converter and signed Netlify-compatible proof runtime. Uploaded function bundles can be accepted, converted, inspected, signed, staged, and executed in the controlled v1 runtime for trusted or owner-approved bundles. Unlimited execution of untrusted customer code still needs the SkyeNet isolated runtime, sandbox policy, build admission checks, per-tenant CPU limits, secret isolation, abuse controls, and billing guards before it should be marketed as full hostile-code Netlify Functions parity.

## Function Runtime Upgrade Path

SkyeNet Functions should be owned IP, not a resale wrapper around another programmable platform. The always-on edge provider can remain in the architecture, but uploaded functions should run in a SkyeNet-controlled runtime before they are sold as unlimited customer code execution.

- `skynetd` runtime nodes run on low-cost VPS, dedicated servers, or future 0S-owned Kubernetes.
- The runtime accepts converted Netlify-style functions from `netlify/functions/*`, `functions/*`, or `skyenet/functions/*`.
- Each function is wrapped into a SkyeNet function bundle with a manifest, signed receipt, route map, and plan limits.
- Runtime execution must use signed bundle verification, process/container isolation, timeouts, memory caps, body caps, egress policy, per-tenant secrets, and logs.
- SkyeNet Edge can proxy/cache to the runtime, but the deploy protocol, compatibility adapter, route registry, observability, billing guardrails, and function execution policy belong to SkyeNet.

Do not run arbitrary customer code inside the main 0S Worker or inside the FS27 gate Worker. Keep uploaded code isolated in SkyeNet runtime workers controlled by cgroups/containers/microVMs or another SkyeNet-owned sandbox.

## Auth Rule

SkyeNet must never create a separate founder, owner, client-admin, or deployer password. Operator access must flow through:

- `Authorization`
- `x-admin-token`
- `x-free99-admin-code`
- `x-free99-gate-session`
- `x-skye-gate-session`
- `x-skygate-session`
- Shared owner-admin session cookies

0S API routes use `requireOperatorAuth`. FS27 deploy routes use the shared gate/operator checks and customer/role headers forwarded by the main Worker.

## Internal Free99 Guardrails

Free99 should be treated as a capped trial lane, not an unlimited hosting giveaway.

Recommended internal caps before public pricing:

- No custom domains on Free99.
- Small static bundles only.
- Low monthly bandwidth allowance.
- Gate-owned routes by default.
- No arbitrary uploaded functions.
- No persistent paid third-party services enabled by default.
- Per-project route count and deployment-retention caps.
- Long-cache immutable JS/CSS/image/font assets; keep HTML short-cache for freshness.

Paid tiers can unlock higher storage, bandwidth, custom domains, scheduled rebuilds, observability retention, and first-party managed functions after cost controls are proven.

## Cost Basis

SkyeNet runs on Cloudflare Workers, R2, KV, Queues, Analytics Engine, and optional D1/Citadel rollups.

As of the 2026-05-23 official Cloudflare docs check:

- Workers Paid has a $5/month account minimum, includes 10M Worker requests/month and 30M CPU ms/month, then bills additional Worker requests and CPU.
- Worker static assets are described as free and unlimited in the Workers pricing examples.
- R2 Standard includes 10 GB-month storage, 1M Class A operations, 10M Class B operations monthly, with no R2 egress fee.
- Workers KV Paid includes monthly read/write/list/storage allotments and overage pricing.
- Queues Paid includes a monthly operations allotment and overage pricing.
- Analytics Engine pricing is published for estimation, but Cloudflare states billing is not currently active for it.
- D1 Paid includes large monthly row-read and row-write allotments plus storage allowance.

Official sources:

- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.cloudflare.com/r2/pricing/
- https://developers.cloudflare.com/analytics/analytics-engine/pricing/

## Operator Flow

1. Open `/skyenet/index.html` from the 0S desktop or admin window.
2. Use the shared owner/operator gate session.
3. Drop static build files.
4. SkyeNet calls `/api/skyenet/deploy/init`.
5. Each file uploads through `/api/skyenet/deploy/upload`.
6. Completion writes a deployment manifest through `/api/skyenet/deploy/complete`.
7. Route registration writes the host/path record through `/api/skyenet/deploy/route`.
8. Observability and cost panels read from `/api/skyenet/status`, `/api/skyenet/routes`, `/api/skyenet/observability`, and `/api/skyenet/cost-model`.

## Proof Commands

```bash
npm run 0s:skyenet:proof
```

This runs the FS27 deploy API test and the main 0S SkyeNet adapter test.

After any production deployment, this repo still requires headed live-browser verification:

```bash
npm run proof:live-browser -- --url https://metraiyux-0s-full-system.graylondonskyes.workers.dev/skyenet/index.html --expect "SkyeNet Deploy"
```

The proof receipt must show desktop and mobile scrolling, interactions, console/network status, and visual nonblank screenshots before the live surface is called ready.

Related internal architecture:

- `docs/SKYENET_FUNCTIONS_NETLIFY_PARITY.md`
- `docs/SKYENET_HYBRID_RELEASE_ARCHITECTURE.md`
