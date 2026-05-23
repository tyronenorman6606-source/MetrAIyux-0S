# v0.3.0 Real Platform Upgrade

This release upgrades SkyeAPI + AegisCore from repo foundation into a functional platform slice.

## Added

- Functional `apps/console` admin console.
- Console can health check the Worker gateway.
- Console can import `.env` bundles into hosted AegisCore.
- Console can mint scoped SkyeAPI keys.
- Console can list project keys.
- Console can load capability manifests through a SkyeAPI key.
- Console can run dry-run and live capability calls.
- Console can load usage counters.
- Console can load recent gateway events.
- Hosted Worker now exposes project, key, usage, and event admin endpoints.
- Hosted Worker now records gateway events into KV.
- Hosted Worker now records daily usage counters into KV.
- Hosted Worker now enforces per-key minute rate limits.
- Hosted Worker now supports idempotency keys for `/v1/call`.
- Hosted Worker now supports `providers.health` calls.
- SDK now includes `SkyeAPIAdminClient`.
- CLI now includes hosted commands.
- CLI can launch the functional console with `skyeapi console`.
- MCP server now exposes broader provider tools: email, SMS, DB schema, safe DB query, AI text, storage upload, and checkout creation.
- Local AegisCore now imports optional provider keys such as `RESEND_FROM`, `OPENAI_BASE_URL`, and `OPENAI_MODEL`.
- MCP config examples added.

## Still not claimed

The package does not claim live production readiness until the following are proven with real deployed resources:

- Live Cloudflare Worker deployment.
- Real KV namespace binding.
- Real provider calls for Resend, Twilio, Neon, OpenAI-compatible APIs, Stripe, and R2.
- Billing plans and tenant subscription enforcement.
- External hosted database for analytics beyond KV counters.
- Browser automation proof of the console against a live Worker.
