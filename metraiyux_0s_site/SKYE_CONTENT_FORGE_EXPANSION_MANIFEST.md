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

The platform proves local server startup, protected API routes, source registry, export, queue, scheduler tick, static rebuild, app shell, and JSON persistence. Provider actions require real credentials and provider approvals.

## Verification Evidence

- `npm run smoke` inside `skye-content-repurposer-local`
- `test-artifacts/skye-content-forge-e2e/browser-qa.json`
- `test-artifacts/skye-content-forge-e2e/content-forge-gate-unlock-workflow.webm`
- `metraiyux_0s_site/skye-content-repurposer-local/MCP_TOOLING_RECEIPT.json`
- `metraiyux_0s_site/MCP_TOOLING_RECEIPT.json`
