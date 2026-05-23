# Skye Content Forge Expansion Manifest

Date: 2026-05-17

Skye Content Forge Publisher V4 is imported into MetrAIyux 0S as a Free99 gated platform. Free99 means no charge. It does not mean anonymous access.

## Added Surfaces

- `live/skye-content-forge-publisher.html`
- `proof/skye-content-forge-expansion-receipt.html`
- `skye-content-repurposer-local/public/gate-session.js`
- `skye-content-repurposer-local/public/mcp-effects.js`
- Pricing, SaaS, admin, proof, homepage, and Stripe catalog references.

## Gate Rule

The app requires a 0S, FS27, SkyGate, or local admin gate session before dashboard boot. The local server rejects ungated API requests when gate enforcement is enabled.

## Runtime Boundary

The platform proves local server startup, protected API routes, source registry, OpenAI generation from the repo-root env, local export, SkyeVault/R2 upload, queue, scheduled R2 publishing, scheduler tick, static rebuild, app shell, and JSON persistence. Google Drive remains an optional legacy path for Shared Drive or delegated OAuth setups, but the primary cloud storage lane is now the live SkyeVault Cloudflare R2 bucket. Remaining provider actions require real credentials and provider approvals.

## Verification Evidence

- `npm run smoke` inside `skye-content-repurposer-local`
- `test-artifacts/skye-content-forge-e2e/browser-qa.json`
- `test-artifacts/skye-content-forge-e2e/content-forge-gate-unlock-workflow.webm`
- Live `/api/repurpose` 200 response with saved draft `30b197b6-7bf5-401c-9617-b77c0a1813ca`
- Live `/api/export/skyevault-r2` 200 response to bucket `client-drop-vault` under `content-forge-exports`
- Scheduled publisher item `439246bc-6c0a-4cb1-b4eb-e71d02c0085d` published to target `skyevault-r2`
- `metraiyux_0s_site/skye-content-repurposer-local/MCP_TOOLING_RECEIPT.json`
- `metraiyux_0s_site/MCP_TOOLING_RECEIPT.json`
