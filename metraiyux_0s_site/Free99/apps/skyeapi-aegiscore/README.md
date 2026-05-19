# SkyeAPI + AegisCore

Current package: v0.17.0. This archive is written to avoid fake status claims: configured capabilities are not described as live-proven until an explicit live provider call creates a proof receipt.

SkyeAPI is a capability control plane. A developer imports provider credentials once, then calls one SkyeAPI layer from apps, agents, CLIs, and MCP clients.

AegisCore is the encrypted credential and capability authority behind the platform. Provider secrets stay inside AegisCore. Apps and agents receive scoped capability results, not raw credentials.

## What this repo contains

- `packages/core` — capability model, provider detection, safe manifests, proof helpers, scopes.
- `packages/aegis-core` — encrypted local vault for SkyeAPI Lite.
- `packages/providers` — provider adapters for Resend, Twilio, Neon, OpenAI-compatible APIs, Stripe, and Cloudflare R2.
- `packages/sdk` — app SDK plus hosted admin SDK.
- `packages/cli` — local and hosted CLI.
- `packages/mcp-server` — local MCP server exposing agent-safe SkyeAPI tools.
- `apps/gateway-worker` — hosted Cloudflare Worker gateway.
- `apps/console` — functional admin console for project import, scoped keys, plan enforcement, capabilities, usage, and gateway events.
- `apps/website` — public landing website with SEO assets, AI-readable markdown, and `/console/` operator handoff.
- `prompts` — integration prompts for Codex, Claude Code, Cursor, Windsurf, and generic agents.
- `mcp-configs` — example MCP client configs.

## Local mode

```bash
corepack enable pnpm
pnpm install --offline --frozen-lockfile || pnpm install --frozen-lockfile
export SKYEAPI_PROJECT_ID=proj_local_dev
export SKYEAPI_VAULT_PASSPHRASE='replace-with-at-least-12-characters'
pnpm build
pnpm --filter skyeapi exec skyeapi init
pnpm --filter skyeapi exec skyeapi import-env .env
pnpm --filter skyeapi exec skyeapi capabilities
pnpm --filter skyeapi exec skyeapi mcp start
```

## Hosted mode

Deploy `apps/gateway-worker` to Cloudflare Workers with a KV namespace binding named `AEGIS_KV` and secrets:

```bash
AEGIS_MASTER_KEY=replace-with-32-plus-random-characters
SKYE_ADMIN_KEY=replace-with-admin-key
SKYE_ALLOWED_ORIGINS=http://localhost:4173,https://your-console.example
SKYE_RATE_LIMIT_PER_MINUTE=120
SKYE_DEFAULT_PLAN=builder
```

Then use the hosted CLI:

```bash
export SKYEAPI_BASE_URL=https://your-worker.example.workers.dev
export SKYE_ADMIN_KEY=replace-with-admin-key
export SKYEAPI_PROJECT_ID=proj_live_001
pnpm --filter skyeapi exec skyeapi hosted import-env .env --project proj_live_001 --scopes '*'
pnpm --filter skyeapi exec skyeapi hosted capabilities
pnpm --filter skyeapi exec skyeapi hosted plans
pnpm --filter skyeapi exec skyeapi hosted set-plan --project proj_live_001 --plan builder
pnpm --filter skyeapi exec skyeapi hosted call providers.health --json '{}' --dry-run
```


## Public website

The public website is now a first-class workspace package. It builds a premium landing page and bundles the operator console behind `/console/` when the console has been built first.

```bash
pnpm --filter @skyeapi/console build
pnpm --filter @skyeapi/website build
pnpm --filter @skyeapi/website dev
```

The website includes `robots.txt`, `sitemap.xml`, `llms.txt`, `ai.md`, OpenGraph metadata, schema markup, and a client-facing claim boundary that routes operators into the console without exposing internal QA notes.

## Console

The console is a real operator surface that talks to the Worker API.

```bash
pnpm --filter @skyeapi/console dev
```

Open `http://localhost:4173`, enter your gateway URL, admin key, and project ID, then import provider env, mint scoped keys, set project plans, inspect capabilities, run dry/live calls, and read usage/events.

## SDK example

```ts
import { SkyeAPIClient } from "@skyeapi/sdk";

const skye = new SkyeAPIClient({
  baseUrl: process.env.SKYEAPI_BASE_URL!,
  apiKey: process.env.SKYEAPI_KEY!
});

await skye.email.send({
  to: "client@example.com",
  subject: "Welcome",
  body: "SkyeAPI routed this through the configured provider."
});
```

## Proof

```bash
pnpm proof
```

Current proof covers local vault encryption, built package imports, console source wiring, Worker platform behaviors, plan enforcement source checks, public truth-gating, and no raw secret exposure in safe manifests.

Live provider calls are only claimed after you run them with real provider credentials.


## v0.6.0 workflow engine

SkyeAPI now supports `workflow.run`, which lets apps, agents, MCP clients, and the console chain multiple capabilities behind one SkyeAPI call.

Example local dry run:

```bash
skyeapi workflow sample > examples/workflows/welcome-email.workflow.json
skyeapi workflow run --file examples/workflows/welcome-email.workflow.json --dry-run
```

Example hosted dry run:

```bash
skyeapi hosted workflow run --file examples/workflows/welcome-email.workflow.json --dry-run
```

Workflow templates can reference root input and earlier step outputs:

```json
{
  "to": "{{input.email}}",
  "body": "{{steps.draft.data.text}}"
}
```

Live workflow runs are explicit. Dry run does not hit providers.



## v0.7.0 Code-Depth Systems

v0.7.0 adds paid-platform control-plane depth: approval queue, approval-token retry flow, webhook signature verification modes, redacted config snapshots/rollback, workflow run ledger, console panels, Admin SDK methods, CLI commands, and MCP approval fingerprinting.

This still does not claim live provider delivery, deployed Cloudflare behavior, real Stripe subscription billing, or live provider webhook proof. Those require real credentials and deployed runtime evidence.

## v0.6.0 Product-Depth Systems

This package now includes provider marketplace controls, policy enforcement, secret rotation receipts, webhook ingestion/replay, upstream role hooks, workflow templates, a deterministic fixture server, and console UX for workflow step receipts. See `docs/V0_6_PRODUCT_DEPTH.md`.

Truth boundary: the fixture server is for deterministic CI only. It is not evidence of live provider success. Live Resend/Twilio/Neon/OpenAI/Stripe/R2 claims require real provider keys and explicit live calls.


## v0.8.0 Product Code Depth

This build adds the `@skyeapi/ops` package: adapter conformance, provider-pack scaffolding, async jobs, outbound webhook delivery queues, anomaly detection, and developer doctor reporting. These are code-backed local capabilities. They do not claim live deployment or live-provider success proof.

Useful commands:

```bash
pnpm proof
skyeapi adapters conformance
skyeapi provider-pack scaffold --provider mailgun-custom --label "Mailgun Custom" --capabilities email.send --required MAILGUN_API_KEY,MAILGUN_DOMAIN
skyeapi doctor
```


## v0.9.0 code-depth note

This package now includes hosted ops surfaces for async jobs, outbound webhook subscriptions/deliveries, provider-pack certification, usage anomalies, and developer doctor reports. These are code-level platform features. They do not claim live deployment or live provider delivery proof without running the relevant live proof gates.

## v0.10.0 durability + billing-code note

This build adds durable lifecycle code: retry/backoff for async jobs, job dead-letter records, dead-letter retry, outbound webhook subscription update/delete, outbound delivery dead letters, provider-pack registry publish/install receipts, and estimated billing usage records.

Truth boundary: these are local/source-proven platform systems. This does not claim distributed production locking under concurrent workers, live outbound delivery to customer endpoints, Stripe subscription collection, or browser-driven Playwright proof.

Useful commands:

```bash
pnpm proof
skyeapi hosted dead-letter-jobs --project <projectId>
skyeapi hosted retry-dead-letter-job --project <projectId> --job <jobId>
skyeapi hosted outbound-update --project <projectId> --subscription <id> --enabled false
skyeapi hosted pack-registry
skyeapi hosted publish-pack --file provider-packs/custom/pack.json --version-tag 0.1.0
skyeapi hosted install-pack --project <projectId> --registry <registryId>
skyeapi hosted billing-usage --project <projectId>
```


## v0.11.0 code-depth additions

v0.11.0 adds job lease claims/completion, provider-pack dependency validation, signed provider-pack manifests, billing usage CSV/JSONL exports, console contract smoke, SDK admin methods for the new hosted routes, and a no-theater gate. These are code-level product systems. They do not claim deployed distributed locking, live provider delivery, live Stripe subscription collection, or browser click E2E.

## v0.12.0 code-depth additions

v0.12.0 adds provider-pack source install receipts, provider-pack certification receipts, billing invoice draft objects, invoice JSON/CSV exports, expanded CLI/SDK/console controls, and a Playwright-ready console E2E spec. The local proof validates the console E2E contract and spec wiring; it does not claim a real Chromium run unless Playwright browsers are installed and executed separately.


## v0.17.0 code-depth additions

This version adds real provider-pack source loading for inline, directory, zip, and git sources; provider-pack sandbox reporting; persisted invoice records; subscription draft objects; upstream workspace/project binding hooks; redacted audit export bundles; and expanded console contract proof. The Chromium smoke script is included but not asserted in `pnpm proof` in this sandbox because Chromium hangs before returning a DOM. These are code/proof upgrades only and do not claim payment collection or live provider delivery.

Proof command:

```bash
pnpm proof
```

## v0.17.0 behavioral proof and billing lifecycle

v0.17.0 adds a behavioral Worker HTTP smoke harness, a reliable default proof chain, fixed version truth, billing lifecycle records, invoice usage reconciliation, provider fixture certification, and the first gateway module split.

Default proof is now:

```bash
pnpm proof
```

That command runs a fast behavioral/source/truth proof chain against built artifacts. Heavier rebuild verification is available as:

```bash
pnpm proof:full
```

Live provider calls are only claimed after you run them with real provider credentials and preserve the resulting proof receipt.

Browser smoke CI wiring exists at `.github/workflows/console-e2e.yml`. It runs Chromium console smoke in GitHub Actions; this archive does not claim browser proof unless that workflow or `pnpm smoke:console-browser` completes and writes `.proof/console-browser-smoke-result.json`.

## v0.17.0 closure hardening

v0.17.0 is a closure pass over the v0.14.0 behavioral Worker proof layer.

Implemented in this pass:

- Gateway HTTP/CORS helpers split into `apps/gateway-worker/src/modules/http.ts`.
- Gateway ops-store helpers split into `apps/gateway-worker/src/modules/ops-store.ts`.
- Worker HTTP behavioral smoke expanded to cover lease completion, queued job processing, outbound subscription lifecycle, outbound event queueing, provider-pack signing/verification/loading/sandboxing/registry/install, invoice lifecycle, subscription lifecycle, workspace access checks, and audit export.
- Default `pnpm proof` now builds once before running serial proof gates.
- `pnpm proof:full` runs explicit workspace build + workspace typecheck + proof.

Truth boundary: this does not prove deployed Cloudflare behavior, live provider delivery, globally atomic distributed locking, real payment capture, or browser E2E inside this sandbox.

## v0.17.0 public website

v0.17.0 adds `apps/website`, a public landing surface for SkyeAPI + AegisCore. The site has SEO metadata, OpenGraph art, schema markup, `robots.txt`, `sitemap.xml`, `llms.txt`, `ai.md`, animated public copy, and a bundled `/console/` handoff to the operator console.

Live provider calls are only claimed after you run them with real provider credentials and receive an explicit live receipt.

## v0.17.0 brand integration

v0.17.0 loops the generated SkyeAPI + AegisCore logo through the actual package surfaces: website header, hero lockup, command-card accent, favicon, Apple icon, OpenGraph image, and operator console brand panels. The website and console build scripts now carry the assets into dist output, and `tools/smoke-v17-product.mjs` fails if the brand assets or references are missing.

Truth boundary: this proves package-level brand wiring. It does not prove hosted CDN cache behavior, trademark clearance, or browser visual pixel perfection.
