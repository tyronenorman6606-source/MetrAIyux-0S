# SkyeAPI + AegisCore Proof Ledger

## Current version

v0.7.0

## Proven locally in this archive

✅ `pnpm build` compiles all TypeScript packages and the Cloudflare Worker source.

✅ `pnpm typecheck` passes across core, AegisCore, providers, SDK, CLI, MCP server, gateway Worker, and console package checks.

✅ `pnpm smoke:local` proves local AegisCore encryption, decrypt, and safe manifest generation without exposing a fake provider secret literal.

✅ `pnpm smoke:built` proves compiled `dist` packages can import and run, not just raw source files.

✅ `pnpm smoke:console` proves the console is a functional operator surface wired to real gateway endpoints: import env, create key, list keys, usage, events, capabilities, and call execution.

✅ `pnpm smoke:worker` proves the Worker source includes platform behaviors: rate limiting, usage logging, event logging, admin project/key/event/usage endpoints, idempotency handling, providers.health, and suppressed provider error bodies.

✅ `pnpm smoke:platform-controls` proves source coverage for project plans, daily limits, rate limits, capability allowlists, key expiry, CLI plan commands, SDK plan methods, and console plan controls.

✅ `pnpm truth-gate` scans public docs and console copy for banned overclaim phrases and verifies explicit truth-language is present.

✅ Local AegisCore imports required and optional provider env keys into an encrypted vault.

✅ Provider adapters reject missing secrets before live provider calls.

✅ MCP server exposes agent-safe tools without returning raw secrets.

## Not yet claimed

☐ Live Cloudflare Worker deployment proof.

☐ Live Cloudflare KV namespace binding proof.

☐ Browser automation proof against a deployed Worker and console.

☐ Real provider proofs for Resend, Twilio, Neon, OpenAI-compatible APIs, Stripe, and Cloudflare R2.

✅ Tenant plan enforcement exists in source and local/source smoke gates.

☐ Stripe subscription collection and billing portal workflow.

☐ Production analytics store beyond KV counters.

☐ Formal incident/audit export workflow.

☐ Runtime load testing for plan limits under concurrent traffic.

## How to run proof

```bash
corepack enable pnpm
pnpm install --offline --frozen-lockfile || pnpm install --frozen-lockfile
pnpm proof
```

Generated proof files live in `.proof/`.


## v0.6.0 workflow engine proof

✅ `pnpm smoke:workflow` proves the built workflow runner can execute a two-step `workflow.run` dry run, interpolate workflow inputs and previous step references, return a structured proof receipt, and avoid exposing raw secrets.

☐ Live workflow provider proof still requires real provider credentials and explicit live calls.


## v0.6.0 Product-depth proof

✅ `pnpm smoke:v06-product` checks provider pack catalog, manifest filtering, policy decisions, gateway source routes, workflow templates, policy examples, role examples, and fixture server packaging.

✅ Implemented code systems: provider marketplace, project provider enable/disable state, policy rule enforcement, secret rotation receipts, webhook ingestion/replay records, upstream role hooks, workflow template library, deterministic fixture server, and console workflow receipts.

☐ Not claimed: live provider success, deployed Cloudflare proof, real provider webhook signature verification, production billing collection, or browser E2E against a deployed console.


## v0.7.0 Code-depth proof

✅ Approval queue source routes and console controls are present.
✅ Approval input fingerprints are deterministic and do not include raw secrets.
✅ Policy evaluation can create approval-required decisions without provider calls.
✅ Webhook signature mode code paths exist for off/report/strict behavior.
✅ Stripe-style and Twilio-style signature code paths are implemented; Resend/Svix is explicitly unsupported rather than faked.
✅ Redacted project configuration snapshots and restore routes exist.
✅ Hosted workflow run ledger routes and summaries exist.
✅ SDK, CLI, MCP, and console surfaces expose the v0.7.0 control-plane flows.

Proof artifact:

`.proof/v07-product-smoke-result.json`

Still not claimed:

☐ Live provider delivery.
☐ Deployed Cloudflare Worker behavior.
☐ Real webhook signature verification against provider-originated events.
☐ Stripe subscription collection.
☐ Browser E2E against deployed console.


## v0.8.0 product code depth

✅ `@skyeapi/ops` package added.
✅ Adapter conformance runner added and locally proven.
✅ Provider-pack authoring scaffold added and locally proven.
✅ Async job engine added and locally proven with callback execution.
✅ Outbound webhook hub added and locally proven with queued signed delivery through a fixture fetch.
✅ Usage anomaly detector added and locally proven.
✅ Developer doctor upgraded and locally proven.
☐ Live outbound customer webhook delivery is not claimed.
☐ Durable production queues and concurrency locking are not claimed.
☐ Live provider certification is not claimed.

Proof file: `.proof/v08-product-smoke-result.json`


## v0.9.0 hosted ops surface

✅ `pnpm build`
✅ `pnpm typecheck`
✅ `smoke:v09-product`

Proven locally:

✅ Async job queue can enqueue and execute a dry-run job through the ops engine.
✅ Outbound webhook hub can create subscriptions and queue matching deliveries.
✅ Provider-pack certification validates a custom provider pack without exposing secrets.
✅ Usage anomaly detector flags high failure rate samples.
✅ Worker source exposes admin ops routes for jobs, outbound events, doctor, anomalies, and provider-pack certification.
✅ Console source contains panels/functions for the new ops surfaces.

Not claimed:

☐ Durable distributed queue locking.
☐ Live outbound webhook delivery to external customer endpoints.
☐ Deployed Cloudflare Worker execution.
☐ Live provider certification.

## v0.10.0 durability, registry, and billing-code layer

✅ `pnpm build`
✅ `pnpm typecheck`
✅ `smoke:v10-product`
✅ `truth-gate`

Proven locally:

✅ Durable async jobs reschedule after failure using retry policy.
✅ Durable async jobs dead-letter after max attempts.
✅ Dead-lettered jobs can be reset for retry.
✅ Outbound subscriptions can be updated and deleted.
✅ Outbound deliveries can retry and dead-letter after repeated failure.
✅ Provider packs can be certified, published into a registry, and installed with a receipt.
✅ Estimated billing usage records can be generated from usage samples.
✅ Worker source exposes v0.10 admin routes.
✅ Console source exposes v0.10 lifecycle controls.

Not claimed:

☐ Distributed queue locking under concurrent deployed workers.
☐ Live outbound webhook delivery to real customer endpoints.
☐ Stripe subscription collection or invoice reconciliation.
☐ Live provider certification.
☐ Browser-driven Playwright/Chromium console E2E.

Proof file: `.proof/v10-product-smoke-result.json`


## v0.11.0 local proof

✅ `pnpm build`
✅ `pnpm typecheck`
✅ `pnpm smoke:v11-product`
✅ `pnpm no-theater-gate`
✅ `pnpm proof`

Proven locally:

✅ Job lease claim prevents immediate double-claim of the same queued job.
✅ Lease completion requires the matching token.
✅ Provider-pack dependency validation rejects missing required dependencies and accepts certified dependencies.
✅ Signed provider-pack manifests verify with checksum/signature and reject tampered pack bodies.
✅ Billing usage exports produce CSV and JSONL artifacts.
✅ Worker source exposes the v0.11 hosted admin routes.
✅ Console source exposes v0.11 controls and endpoint wiring.
✅ No-theater gate reports no banned unfinished/public overclaim copy in scanned proof-facing files.

Not yet claimed:

☐ Deployed distributed KV compare-and-swap under simultaneous Worker execution.
☐ Live outbound webhook delivery to real customer endpoints.
☐ Live Stripe subscription collection.
☐ Browser/Chromium click E2E against the console.
☐ Live provider certification against real provider accounts.


## v0.12.0 product-code proof

✅ Provider-pack source install receipts are implemented and locally smoke-tested.
✅ Provider-pack certification receipts with optional signed manifests are implemented and locally smoke-tested.
✅ Billing invoice draft objects and JSON/CSV exports are implemented and locally smoke-tested.
✅ CLI/SDK/console surfaces were expanded for v0.12 controls.
✅ Playwright-ready console E2E spec exists and is covered by a contract smoke.
☐ Actual Chromium/Playwright browser execution is not claimed by this local smoke.
☐ Live Stripe subscription collection is not claimed.
☐ Live provider certification is not claimed.


## v0.17.0 Source/Billing/Workspace/Audit Proof

✅ Provider-pack source loader supports inline, directory, zip extraction, and git clone source paths in code.
✅ Provider-pack sandbox produces dry-run receipts without executing untrusted adapter code.
✅ Billing invoice drafts can be persisted, listed, and status-updated with history.
✅ Subscription draft objects exist without claiming payment capture.
✅ Workspace/project binding hooks evaluate upstream role/capability access.
✅ Redacted audit export bundles include checksums and section counts.
☐ Headless Chromium browser smoke in this sandbox. The script exists, but this environment’s Chromium hangs before DOM return; do not mark as proven.
☐ Live payment collection proof.
☐ Live remote zip/git retrieval proof under hosted runtime.
☐ Live third-party adapter sandbox execution inside isolated container.

## v0.17.0 behavioral proof and billing lifecycle

✅ Worker HTTP behavioral proof now calls the compiled Worker `fetch()` handler through real Request/Response objects with an in-memory KV runtime.
✅ HTTP proof covers import env, create key, capabilities, dry-run capability call, enqueue job, claim lease, create invoice, reconcile invoice, provider fixture certification, subscription create/lifecycle update, and audit export.
✅ Default `pnpm proof` now uses `tools/proof-fast.mjs` to avoid recursive rebuild/typecheck timeout behavior while still running behavioral/source/truth gates.
✅ Worker `/health` version truth moved to `apps/gateway-worker/src/modules/version.ts` and reports v0.17.0.
✅ Billing lifecycle records now support provider mapping IDs, pause, resume, cancel, renew, payment-failed, and update actions.
✅ Invoice reconciliation returns usage-vs-invoice line deltas.
✅ Provider fixture certification hits a fixture endpoint before any live optional certification claim.

Not yet claimed:

☐ Deployed Cloudflare Worker behavior.
☐ Live provider delivery.
☐ Globally atomic queue locks across concurrent deployed Workers.
☐ Stripe subscription collection or payment capture.
☐ Browser E2E completion in this sandbox.

## v0.17.0 closure hardening proof

✅ `apps/gateway-worker/src/modules/http.ts` contains extracted HTTP response and CORS helpers.
✅ `apps/gateway-worker/src/modules/ops-store.ts` contains extracted Worker ops-store helpers.
✅ `tools/smoke-worker-http.mjs` now behaviorally exercises broader Worker endpoint coverage through actual `fetch()` calls against the compiled Worker with in-memory KV.
✅ `tools/proof-fast.mjs` builds once before running serial proof gates.
✅ `tools/smoke-v15-product.mjs` verifies version truth, modular gateway imports, expanded Worker HTTP smoke coverage, and proof command wiring.
✅ `.proof/v15-product-smoke-result.json` records the v0.17.0 closure smoke result after proof is run.

☐ This does not prove deployed Cloudflare behavior.
☐ This does not prove live provider delivery.
☐ This does not prove real payment capture.
☐ This does not prove browser E2E inside this sandbox.
☐ This does not prove globally atomic locking under concurrent deployed Workers.

## v0.17.0 public website proof

✅ `apps/website` exists as a workspace package.
✅ `apps/website/tools/build.mjs` builds the landing page and bundles `apps/console/dist` under `/console/`.
✅ `tools/smoke-website.mjs` verifies public landing copy, SEO assets, AI-readable files, and console handoff.
✅ `tools/smoke-v16-product.mjs` verifies package wiring, build wiring, proof wiring, README updates, and public claims register updates.
✅ `.proof/website-smoke-result.json` and `.proof/v16-product-smoke-result.json` are generated by proof.

Not yet claimed:

☐ Hosted domain availability.
☐ Search ranking.
☐ Live provider delivery.
☐ Payment capture.
☐ Browser click execution for the public site inside this sandbox.

## v0.17.0 brand integration

v0.17.0 loops the generated SkyeAPI + AegisCore logo through the actual package surfaces: website header, hero lockup, command-card accent, favicon, Apple icon, OpenGraph image, and operator console brand panels. The website and console build scripts now carry the assets into dist output, and `tools/smoke-v17-product.mjs` fails if the brand assets or references are missing.

Truth boundary: this proves package-level brand wiring. It does not prove hosted CDN cache behavior, trademark clearance, or browser visual pixel perfection.
