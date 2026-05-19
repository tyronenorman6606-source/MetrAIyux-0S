# Public Claims Register

This register exists so SkyeAPI + AegisCore can sell strongly without selling fiction.

## Allowed public claim

SkyeAPI lets a developer import provider credentials once, store them behind AegisCore, and expose scoped capability calls to apps, agents, CLI workflows, and MCP clients without returning raw provider secrets.

Evidence in this archive: local encrypted vault, safe manifest generation, SDK, CLI, MCP server, Worker gateway source, admin console, source smoke checks, and compiled package smoke checks.

## Allowed public claim

AegisCore stores provider credential bundles in encrypted form in local mode and in the hosted Worker flow.

Evidence in this archive: `packages/aegis-core/src/index.ts`, `apps/gateway-worker/src/index.ts`, `.proof/local-smoke-result.json`, and `.proof/built-smoke-result.json`.

## Allowed public claim

The hosted gateway source includes scoped API keys, key revocation, key expiry, rate limiting, project plans, daily call limits, usage counters, idempotency, provider-body suppression, and gateway events.

Evidence in this archive: `apps/gateway-worker/src/index.ts` and `.proof/platform-controls-smoke-result.json` after `pnpm proof`.

## Allowed public claim

The console is an operator surface for a real Worker API. It is not a static brochure screen.

Evidence in this archive: `apps/console/index.html`, `apps/console/src/app.js`, and `.proof/console-smoke-result.json`.

## Claims not allowed yet

Do not claim deployed Cloudflare behavior until a Worker has been deployed and tested against a live KV namespace.

Do not claim successful delivery through Resend, Twilio, Neon, Stripe, OpenAI-compatible APIs, or Cloudflare R2 until the exact provider has a proof receipt from an explicit live call.

Do not claim billing collection until Stripe checkout and webhook handling are deployed and verified with real Stripe test or live events.

Do not claim browser E2E coverage until a browser automation run touches the deployed console and deployed gateway.

## Copy rule

Configured means the credentials and capability are present. Proven means a proof receipt exists. Live-proven means the proof receipt came from an explicit live provider call.


## v0.7.0 allowed public wording

Allowed:

- SkyeAPI includes approval queues for policy-gated capability calls.
- SkyeAPI can create redacted project configuration snapshots for plans, provider pack state, policies, roles, and safe manifest summaries.
- SkyeAPI records redacted hosted workflow run receipts.
- Webhook ingestion includes signature verification modes, with explicit adapter coverage and unsupported-provider status where verification is not implemented.

Not allowed without live proof:

- Claiming live provider delivery.
- Claiming all webhook provider signatures are verified.
- Claiming production Cloudflare deployment.
- Claiming payment subscriptions are collecting real money.

## v0.17.0 public website allowed wording

Allowed public claim:

- SkyeAPI includes a public landing website with SEO metadata, OpenGraph art, schema markup, AI-readable files, and a `/console/` handoff to the operator console.
- The website presents SkyeAPI + AegisCore as a capability control plane for scoped provider access, workflows, jobs, billing ledgers, audit bundles, CLI, SDK, MCP, and operator controls.

Evidence in this archive: `apps/website/index.html`, `apps/website/src/site.css`, `apps/website/public/llms.txt`, `apps/website/public/ai.md`, `tools/smoke-website.mjs`, and `.proof/website-smoke-result.json` after proof.

Not allowed without environment proof:

- Claiming hosted domain availability.
- Claiming search ranking.
- Claiming live provider delivery.
- Claiming payment capture.
- Claiming browser click execution for the public site.

## v0.17.0 brand integration allowed wording

Allowed public claim:

- SkyeAPI + AegisCore includes a generated brand lockup and square mark wired into the website, favicon, Apple icon, OpenGraph image, and operator console.
- The package build includes smoke checks that verify the brand assets are present in source and dist outputs.

Evidence in this archive: `apps/website/public/assets/`, `apps/console/assets/`, `apps/website/index.html`, `apps/console/index.html`, `tools/smoke-v17-product.mjs`, and `.proof/v17-product-smoke-result.json` after proof.

Not allowed without separate review:

- Claiming trademark clearance.
- Claiming hosted CDN cache behavior.
- Claiming browser visual pixel perfection.
