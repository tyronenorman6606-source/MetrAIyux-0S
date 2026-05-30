# SkyeNet + SkyEmail Upgrade Phase Handoff

Date: 2026-05-24
Repo: `/home/lordkaixu/Projects/MetrAIyux-0S`
Owner lane: Gray Skyes / MetrAIyux 0S

## Direct Answer

SkyeNet is real as a gated 0S deploy lane for static build drops, file/folder upload, asset storage, route registration, returned live URLs, route dashboarding, observability receipts, cost guardrails, SkyePay products, and controlled SkyeNet Functions compatibility proof.

SkyeNet is not yet fully finished as a public Netlify-style self-serve customer signup product where any new customer can create an account, get a scoped workspace, drop a bundle, see a polished per-account dashboard, manage usage/billing, and deploy unrestricted uploaded serverless functions without owner/operator approval.

The honest release position is:

- Sell SkyeNet Edge now for owner-approved static hosting, routed drops, gated/public pages, managed functions, observability, and cost-capped usage.
- Sell SkyeNet Functions as managed or controlled preview for approved Netlify-compatible function bundles.
- Do not sell unrestricted arbitrary customer-uploaded functions until the isolated SkyeNet Sovereign Runtime lane has production proof.
- Public copy says SkyeNet. Do not split buyer-facing language into provider-specific lanes.

## SkyeNet Live Lane

Primary gated console:

```text
https://metraiyux-0s-full-system.graylondonskyes.workers.dev/skyenet/index.html
```

Primary 0S API base:

```text
https://metraiyux-0s-full-system.graylondonskyes.workers.dev/api/skyenet
```

FS27 deploy API target behind the 0S proxy:

```text
https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/deploy/*
```

Current browser console source:

```text
metraiyux_0s_site/skyenet/index.html
metraiyux_0s_site/skyenet/skyenet.js
metraiyux_0s_site/skyenet/skyenet.css
```

Current deploy API source:

```text
metraiyux_0s_site/skyegate/source/SkyeGateFS27/cloudflare/skynet-deploy-api.mjs
metraiyux_0s_site/cloudflare/worker.js
```

The console already has:

- Shared FS27/SkyGate/Free99 session handoff.
- Project ID and deployment ID fields.
- Route hostname and mount path fields.
- Gate/public access selector.
- Browser file/folder upload via `input[type=file][multiple][webkitdirectory]`.
- `Publish Drop` flow.
- Route list panel.
- Cost model panel.
- Observability panel.
- Platform truth panel.

The upload flow already exists:

1. `POST /api/skyenet/deploy/init`
2. `PUT /api/skyenet/deploy/upload?projectId=...&deploymentId=...&path=...`
3. `POST /api/skyenet/deploy/complete`
4. `POST /api/skyenet/deploy/route`
5. Response returns `live_url`
6. Route records show in `/api/skyenet/routes`

## URL Model

Path routes are the live lane now:

```text
https://<skyenet-host>/skyenet/<project>
```

Branded SkyeNet subdomains are route-registry ready but still need the DNS/wildcard setup:

```text
https://<project>.skyenet.<company-domain>
```

Custom domains use the same route registry after owner/domain verification.

Free99 should remain path-route only unless the owner approves custom domains.

## Netlify Parity Truth

Static Netlify Drop-style hosting:

```text
Status: real for gated/operator SkyeNet.
```

Netlify-style function compatibility:

```text
Status: proven as controlled SkyeNet-owned runtime v1.
```

Current function proof includes:

- `netlify/functions/*` intake.
- `/.netlify/functions/<name>` compatibility route.
- `/.skyenet/functions/<name>` native route.
- `handler(event, context)` return shape.
- Query params, repeated query params, cookies, request body, and binary body handling.
- Timeout caps.
- Memory caps.
- Request body caps.
- Deny-by-default environment grants.
- Default-deny outbound fetch.
- Signed manifest verification and tamper rejection.

Production boundary:

```text
Unlimited hostile customer-uploaded serverless functions still require isolated runtime proof.
```

The next runtime layer should be SkyeNet Sovereign Runtime on a low-cost VPS, dedicated node, or future 0S-owned Kubernetes, with rootless containers or microVM isolation, tenant CPU/memory caps, secret isolation, egress policy, abuse controls, and billing cutoffs.

## Customer Self-Service Gap

This is the major unfinished product gap.

The repo proves deployer/operator flow, not a complete public customer account journey.

Need to add:

- Public signup to SkyeNet workspace creation.
- Workspace-scoped deploy permissions.
- Customer project registry keyed by `customer_id` and `project_id`.
- Customer dashboard scoped to their own deployments and usage.
- Deploy history with active deployment, previous deployment, and rollback target.
- Clear live URL receipt after publish.
- Usage meters for bandwidth, requests, storage, function invocations, and build size.
- Plan entitlement checks from SkyePay.
- Free99 caps enforced in the deploy API before accepting upload/route.
- Owner/admin dashboard that can see all customers, costs, incidents, and deploy receipts.
- Customer dashboard that never exposes bearer tokens, cookies, private request bodies, owner cost internals, or provider details.

## SkyePay Status

SkyePay products exist for SkyeNet and the proof passed in this handoff pass.

Proof command:

```bash
npm run 0s:skyenet:skyepay
```

Result:

```text
skyenet-skyepay-offer-proof: ok
```

Known SkyeNet offers:

- `skyenet-edge-starter`: $297 setup + $97/month
- `skyenet-edge-growth`: $997 setup + $297/month
- `skyenet-functions-managed`: $1,500 setup + $497/month
- `skyenet-sovereign-runtime-reserve`: $5,000 setup + $997/month

Buyer links:

```text
https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skyepay.html?client=metraiyux-0s&offer=skyenet-edge-starter
https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skyepay-store.html?client=metraiyux-0s&offer=skyenet-edge-starter
```

## CitadelDB Note

CitadelDB is not currently running as a local database in this audit.

Proof command:

```bash
npm run audit:citadeldb-runtime
```

Result:

```json
{
  "ok": true,
  "local_citadel_database_running": false,
  "site_events_kv_binding_configured": true,
  "d1_binding_configured": true,
  "receipt": "test-artifacts/citadeldb-runtime-audit/receipt.json"
}
```

This supports the current thesis: CitadelDB Edge can run through Cloudflare-native D1/KV-style bindings for control-plane and mirror lanes. Full Postgres-wire replacement remains a separate CitadelDB Sovereign Postgres runtime lane.

## SkyEmail Upgrade Gap

SkyEmail has live hosted-provider proof, but it is not yet the full polished customer email platform.

Known current truth:

- SkyEmail is deployed at `https://skyemail-platform.graylondonskyes.workers.dev/`.
- Hosted provider status has shown Zoho ready with API/org/provisioning lanes active.
- Live proof JSON has shown outbound send and inbox-read proof with imported inbox events.
- Signup pages and dashboard surfaces exist.

Still needed before advertising it as a full customer-grade inbox product:

- Wire SkyDocxMax as the rich email compose editor.
- Fix hosted provider reply flow so thread quick reply uses the hosted send/reply endpoint, not stale Gmail-only wiring.
- Finish provider-native drafts or hide draft controls until real.
- Finish inbound notification/sync loop so replies populate without manual proof polling.
- Prove external mailbox reply roundtrip from send to received reply to open/respond inside SkyEmail.
- Add per-domain/customer mailbox admin dashboard.
- Confirm Citadel backup/mirror config for mail receipts.
- Add browser proof after the above changes.

## Proof Run In This Handoff Pass

SkyeNet deploy lane:

```bash
npm run 0s:skyenet:proof
```

Result:

```text
pass: 5 tests
```

Coverage:

- Shared operator gate required.
- Status and route manifest expose SkyeNet.
- Init/upload/complete/route works through 0S proxy into FS27.
- Source/runtime asset paths are rejected.

SkyeNet Functions:

```bash
npm run 0s:skyenet:functions-proof
```

Result:

```text
pass: 6 tests
```

Coverage:

- Netlify-compatible handler routes.
- Invocation timeout.
- Env deny-by-default with declared function grants.
- Outbound fetch denied by default.
- Request body caps and binary body shape.
- Signed bundle verification and tamper rejection.

SkyePay:

```bash
npm run 0s:skyenet:skyepay
```

Result:

```text
ok
```

CitadelDB runtime audit:

```bash
npm run audit:citadeldb-runtime
```

Result:

```text
ok; local database not running; D1 binding configured.
```

Existing live production stress receipt:

```text
test-artifacts/skyenet-live-production-stress-latest.json
```

Receipt summary:

- `ok: true`
- `generated_at: 2026-05-24T12:30:43.010Z`
- `total_requests: 48`
- `ok_requests: 48`
- `p95_ms: 706`
- `max_ms: 1651`
- SkyeNet API, Citadel runtime matrix, and SkyePay offer links returned `200`.
- Stripe receipt included products for all four SkyeNet offers.

## Upgrade Phase Checklist

Phase 1: Turn operator deploy into customer self-service.

- Add SkyeNet customer signup and workspace provisioning.
- Bind SkyeNet workspaces to FS27/SkyGate user identity.
- Add `customer_id`, `workspace_id`, `project_id`, plan, and quota enforcement to deploy init/upload/route.
- Give every successful deploy a shareable receipt with live URL, project, deployment, route, auth mode, bundle size, and timestamp.
- Add customer dashboard views for projects, deployments, URLs, usage, and billing status.
- Keep owner/admin global observability separate from customer dashboard.

Phase 2: Harden Free99 and paid lanes.

- Enforce Free99 build size cap before upload completion.
- Enforce Free99 request/storage/public-route caps before route creation.
- Connect SkyePay plan status to SkyeNet entitlements.
- Block custom domains on Free99 unless owner override is present.
- Add owner approval workflow for paid route/function activation.

Phase 3: Finish Netlify-like ergonomics.

- Add zip upload support in addition to folder/file selection.
- Add CLI wrapper around the documented bash flow.
- Add deploy logs and clearer publish progress.
- Add rollback to previous deployment.
- Add `netlify.toml` parsing for redirects/rewrites/build metadata.
- Add build-command capture in a jailed builder before claiming deeper Netlify parity.

Phase 4: Finish SkyeNet Functions production boundary.

- Keep managed/approved function execution live as the current sellable lane.
- Add isolated SkyeNet Sovereign Runtime before unrestricted uploaded function execution.
- Add per-function CPU, memory, duration, body, egress, secret, and invocation caps.
- Redact logs before customer-visible dashboards.
- Prove hostile-code sandboxing before public unlimited claims.

Phase 5: Finish SkyEmail customer-grade inbox.

- SkyDocxMax email editor.
- Hosted-provider reply endpoint.
- Real inbound notification/sync loop.
- External send/reply/open/respond proof.
- Per-domain mailbox dashboard.
- Citadel receipt mirror for mail events.

## Source Of Truth Docs

```text
docs/SKYENET_UPLOAD_URL_MODEL.md
docs/SKYENET_FUNCTIONS_NETLIFY_PARITY.md
docs/SKYENET_HYBRID_RELEASE_ARCHITECTURE.md
docs/SKYENET_PLATFORM_LANE.md
metraiyux_0s_site/skyenet/PLATFORM_TRUTH.json
metraiyux_0s_site/skyenet/HYBRID_RUNTIME_MATRIX.json
```

## Final Truth For The Next Agent

Do not regress the public naming rule: everything is SkyeNet to the buyer.

Do not claim full public Netlify parity yet. Claim:

- SkyeNet Edge deploy lane is real.
- Browser folder/file drop is real behind the shared 0S gate.
- API push is real.
- Route records and returned URLs are real.
- SkyePay products are real.
- Observability and internal cost model endpoints exist.
- Controlled SkyeNet Functions Netlify compatibility proof is real.

Build next:

- Public customer signup to workspace.
- Customer-scoped deploy dashboard.
- Quota and entitlement enforcement.
- Zip/CLI polish.
- Rollback.
- Isolated runtime for unrestricted uploaded functions.
- SkyEmail rich inbox completion.
