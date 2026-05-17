# Skye Content Forge Expansion Manifest

Date: 2026-05-17

Skye Content Forge Publisher V4 is imported into MetrAIyux 0S as a Free99 gated platform. Free99 means no charge. It does not mean anonymous access.

## Added Surfaces

- `live/skye-content-forge-publisher.html`
- `proof/skye-content-forge-expansion-receipt.html`
- `skye-content-repurposer-local/public/gate-session.js`
- Pricing, SaaS, admin, proof, homepage, and Stripe catalog references.

## Gate Rule

The app requires a 0S, FS27, SkyGate, or local admin gate session before dashboard boot. The local server rejects ungated API requests when gate enforcement is enabled.

## Runtime Boundary

The platform proves local server startup, protected API routes, source registry, export, queue, scheduler tick, static rebuild, app shell, and JSON persistence. Provider actions require real credentials and provider approvals.
