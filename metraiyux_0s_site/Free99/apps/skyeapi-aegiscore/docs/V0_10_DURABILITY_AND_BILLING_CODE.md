# SkyeAPI + AegisCore v0.10.0 — Durability, Registry, and Billing-Code Layer

This pass is code-only product depth. It does not claim deployed Cloudflare proof, live provider certification, or Stripe subscription collection.

## Added

- Durable async job queue with retry policy, lock window fields, backoff scheduling, and job dead-letter records.
- Retry path for dead-lettered jobs.
- Durable outbound webhook delivery lifecycle with subscription update/delete, retry scheduling, max attempts, and outbound dead-letter records.
- Header sanitizer for outbound subscriptions to prevent storing obvious credential headers such as `Authorization`, `Cookie`, and `x-api-key`.
- Provider-pack registry with certification, checksum, version tag, publish, list, install receipt, and project installation records.
- Billing usage ledger generator and usage summary based on existing usage counters.
- Hosted admin routes for dead-letter jobs, outbound subscription lifecycle, outbound dead letters, provider-pack registry/installations, and billing usage records.
- SDK, CLI, and console hooks for the new lifecycle features.
- `tools/smoke-v10-product.mjs` proving the local durability/registry/billing engines and route/control presence.

## Still not claimed

- Distributed queue locking proof under concurrent workers.
- Live outbound delivery to customer endpoints outside local/fetch smoke.
- Real provider certification with live accounts.
- Stripe subscription collection or invoicing.
- Browser-driven console E2E with Playwright/Chromium.

## Proof command

```bash
pnpm proof
```

Expected new proof artifact:

```txt
.proof/v10-product-smoke-result.json
```
