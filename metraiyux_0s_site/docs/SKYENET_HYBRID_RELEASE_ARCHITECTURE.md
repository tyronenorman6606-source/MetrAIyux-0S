# SkyeNet Hybrid Release Architecture

Last updated: 2026-05-24

## Public Naming Rule

Customer-facing copy must say SkyeNet. Do not describe the product as "Cloudflare versus SkyeNet" or as two different platforms.

Use these names publicly:

- SkyeNet Edge
- SkyeNet Deploy
- SkyeNet Functions
- SkyeNet Sovereign Runtime
- CitadelDB Edge
- CitadelDB Sovereign Postgres

Provider primitives such as Cloudflare Workers, R2, KV, D1, Durable Objects, Hyperdrive, Queues, Workflows, VPS, containers, cgroups, and Postgres are internal architecture, proof, cost, and admin-dashboard details. They can appear in operator documentation and receipts, but the buyer lane is SkyeNet.

## Release Posture

SkyeNet can ship today without waiting for a private server.

SkyeNet Edge is the always-on release lane. It handles static drops, shared-gate deploy control, host/path routing, managed SkyeNet functions, observability receipts, and Free99 cost guardrails. If the private server is offline, SkyeNet Edge still serves the static surfaces and the approved managed function routes.

SkyeNet Functions is the Netlify-compatible function lane. The repo now has deploy CLI intake for `netlify/functions/*`, `functions/*`, and `skyenet/functions/*`, bundles local helper imports, uploads bundle files, server-signs customer manifests after storage verification, and invokes active functions at `/.netlify/functions/<name>` / `/.skyenet/functions/<name>` through the Dynamic Worker runtime. This is production-ready for managed/owner-approved JS/ESM function bundles with timeout, body, env, scheduled/background metadata, receipt, and default-deny egress guardrails. The console exposes per-function env grant inspection and rollback route controls. Unlimited hostile-code execution and native dependency build/install still wait for the isolated runtime, jailed builder, and admission-control lanes.

SkyeNet Sovereign Runtime is the owned execution capacity. It can run on a low-cost VPS, a dedicated server, or future 0S-owned Kubernetes. This is where arbitrary customer-uploaded functions belong after admission checks, CPU and memory caps, secret isolation, egress policy, abuse controls, and billing cutoffs are live.

The product promise is not "one Cloudflare version and one private-server version." The product promise is SkyeNet, with SkyeNet Edge always on and SkyeNet Sovereign Runtime available when owned execution is needed.

## CitadelDB Cloudflare-Native Thesis

The user instinct is correct: CitadelDB does not need a VPS by default. CitadelDB Edge is now wired as a real Cloudflare database lane in this repo: the 0S Worker binds the dedicated Cloudflare D1 database `metraiyux-citadeldb` as `CITADELDB`, stores mirror rows/write receipts/catch-up jobs there, and keeps `SITE_EVENTS_KV` only as a secondary receipt mirror.

CitadelDB Edge runs on the edge stack:

- D1 for relational ledgers and app-control tables that fit SQLite semantics.
- SQLite-backed Durable Objects for per-tenant state, coordination, locks, realtime cursors, and point-in-time recovery windows.
- R2 for backup artifacts, receipts, exports, snapshots, and large data files.
- Queues and Workflows for catch-up jobs, migrations, dual-write reconciliation, and long-running approval flows.
- Hyperdrive when CitadelDB Edge needs to talk to an existing Postgres database behind it.

Neon can remain an upstream sync source while rows are mirrored into CitadelDB. Payload-backed writes are mirrored into D1 immediately; receipt-only writes remain in the catch-up queue until their row payload is transferred.

CitadelDB Sovereign Postgres still needs a Postgres-compatible engine only when the promise is Postgres wire protocol, WAL archiving, PITR, replicas, K8s HA, or raw SQL compatibility with existing Postgres clients. That engine can be a managed provider, a VPS, a dedicated box, or a Kubernetes cluster. The control plane, proof, dashboards, mirror queue, and customer-facing database product remain CitadelDB.

## Repo Lane Inventory

Cloudflare-native under SkyeNet/0S today or directly feasible:

- 0S shell, admin, route manifest, and shared FS27/SkyGate/Free99 gate.
- SkyeNet Deploy static drops, route registry, observability, and internal cost model.
- SkyeNet managed functions owned by the platform.
- SkyeNet Functions signed bundle intake, deploy CLI bundling, server-signed customer upload activation, and Dynamic Worker invocation for approved Netlify-compatible functions.
- CitadelDB Edge D1 mirror rows, write receipts, status, catch-up queue, and dual-write receipts.
- Relay13 realtime rooms, D1 persistence, and Durable Object coordination.
- SkyePay checkout/webhook lanes and payment proof ledgers.
- SkyeVault metadata, policy, snapshot receipts, and proof dashboards.
- SkySecure secret-pack metadata, grants, events, and ciphertext custody.
- Valley Verified, Client App Factory, PHX Verified, and static client surfaces.
- SkyeMusicNexus managed app APIs, receipts, drops, and observability dashboards.

Hybrid lanes where SkyeNet Edge fronts owned or external runtime:

- SkyeNet Functions for arbitrary uploaded hostile customer code.
- CitadelDB Sovereign Postgres for Postgres wire compatibility, WAL/PITR, and replicas.
- SkyeMail full SMTP/IMAP mailbox service if the product includes actual mailserver control.
- Forgejo or full Git server hosting if SkyeVault needs a traditional Git forge UI/server.
- Heavy media, DAW, render, audio-analysis, video-processing, or long-running job workers.
- Local/owned AI model serving where GPU/CPU cost must be flat and capped.

VPS or private server is still sensible for:

- Untrusted customer code with process/container/microVM isolation.
- Raw Postgres engine ownership.
- Mailserver ownership.
- Long-running CPU jobs.
- Flat-cost burst workloads where per-event billing can surprise us.

## Sub-50 Dollar Starter Shape

Under $50/month is realistic for early SkyeNet if Free99 is capped and customer plans are quota-bound.

Edge-only starter:

- Cloudflare Workers Paid account floor: $5/month.
- SkyeNet static drops stay cheap when assets are cached and Free99 bundles are small.
- R2 storage is cheap for early static assets, and R2 does not charge egress.
- D1 and Durable Objects can cover many platform ledgers without a traditional database server.

Hybrid sovereign starter:

- Cloudflare Workers Paid: $5/month.
- OVHcloud VPS-2: $9.99/month for 6 vCores, 12 GB RAM, 100 GB NVMe, daily backup, and 1 Gbps public bandwidth.
- Add a small allowance for R2/D1/KV/Queue overages and the total can stay well below $50 while early traffic is controlled.

More conservative but still under the line:

- Cloudflare Workers Paid: $5/month.
- DigitalOcean 4 GiB Droplet: $24/month with 2 CPUs, 80 GiB storage, and included bandwidth.
- Keep overages below about $20/month through cache, route caps, and Free99 limits.

Avoid as the strict starter:

- DigitalOcean 8 GiB Droplet at $48/month plus Cloudflare overages, because it crosses the $50 target before usage grows.

## Free99 Guardrail

Free99 must be a capped launch lane:

- One public route or gated demo per workspace.
- Small static bundle, default target 25 MB.
- Low monthly request budget, default target 10,000 requests.
- No custom domains by default.
- No unlimited arbitrary uploaded function execution.
- Uploaded function bundles can be staged for review, but live execution needs approved managed functions or the isolated runtime.

## SkyePay Product Map

Free99 is a capped access lane, not an uncapped checkout product. Paid SkyeNet usage is sold through SkyePay with real Stripe lookup-key prices:

| Offer ID | Setup | Monthly | Stripe lookup keys | Activation |
| --- | ---: | ---: | --- | --- |
| `skyenet-edge-starter` | $297 | $97 | `skyenet_edge_starter_setup`, `skyenet_edge_starter_monthly` | Paid, pending owner approval |
| `skyenet-edge-growth` | $997 | $297 | `skyenet_edge_growth_setup`, `skyenet_edge_growth_monthly` | Owner-approved route scope |
| `skyenet-functions-managed` | $1,500 | $497 | `skyenet_functions_managed_setup`, `skyenet_functions_managed_monthly` | Owner-approved function scope |
| `skyenet-sovereign-runtime-reserve` | $5,000 | $997 | `skyenet_sovereign_runtime_setup`, `skyenet_sovereign_runtime_monthly` | Owner-approved sovereign runtime scope |

These offers live in the FS27 SkyePay catalog and the Stripe product sync script. The public buyer sees SkyeNet. Internal receipts can still record the provider/runtime details needed for cost control and incident review.

## Current Proof Hooks

- `npm run 0s:skyenet:proof`
- `npm run 0s:skyenet:functions-proof`
- `npm run 0s:skyenet:skyepay`
- `npm run 0s:skyenet:hybrid-proof`
- `npm run audit:citadeldb-runtime`
- `metraiyux_0s_site/skyenet/HYBRID_RUNTIME_MATRIX.json`
- `metraiyux_0s_site/skyenet/PLATFORM_TRUTH.json`
- `GET /api/citadel/runtime-matrix` behind the shared 0S gate

## Official Cost And Capability Sources

- Cloudflare Workers pricing: https://developers.cloudflare.com/workers/platform/pricing/
- Cloudflare R2 pricing: https://developers.cloudflare.com/r2/pricing/
- Cloudflare D1 pricing: https://developers.cloudflare.com/d1/platform/pricing/
- Cloudflare Durable Objects SQLite storage: https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/
- Cloudflare Hyperdrive Postgres connection docs: https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/
- OVHcloud US VPS pricing: https://us.ovhcloud.com/vps/
- DigitalOcean Droplets pricing: https://www.digitalocean.com/products/droplets
