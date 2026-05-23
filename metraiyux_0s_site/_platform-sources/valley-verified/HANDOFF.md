# Valley Verified v18 Handoff

Valley Verified is a seeded Arizona business marketplace platform with upstream-auth-ready operator, AE, moderation, mutation, runtime-state, and exposure-order code paths.

## Current package status

Production-candidate code package; not live-production-certified until a deployed URL is browser-smoked.

## Important v18 additions

- Runtime adapter bridge: `src/server/adapter-runtime.mjs`
- Admin operation handler: `src/server/admin-api.mjs`
- Admin function wrapper: `netlify/functions/phx-admin.mjs`
- Signed webhook delivery processor: `src/server/notification-service.mjs`
- Exposure product/order-intent service: `src/server/exposure-service.mjs`
- v18 proof: `scripts/v18-smoke.mjs`

## Auth stance

The package is now wired for MetrAIyux 0S / SkyeGateFS27 auth. It still does not ship a separate local login, but function requests can be authenticated with `Authorization: Bearer <FS27 session JWT or kx_live API key>`. `src/server/gate-auth.mjs` introspects the token against FS27, strips public spoofed upstream headers, and injects:

- `x-upstream-user-id`
- `x-upstream-user-email`
- `x-upstream-roles`
- `x-upstream-customer-id`
- `x-upstream-workspace-id`
- `x-upstream-plan`

Production env:

- `SKYGATEFS27_ORIGIN=https://skyegatefs27-citadeldb.graylondonskyes.workers.dev`
- `PHX_GATE_AUTH_REQUIRED=true`

Only set `PHX_TRUST_UPSTREAM_HEADERS=true` behind a trusted reverse proxy that strips and injects those headers itself.

## Seeding stance

Drop CSV/JSON scrape batches into `seed/businesses/inbox/`. Duplicate prevention, canonical IDs, dry-run reports, and suppression templates remain intact.

## Proof

See `proofs/`.

## v19 payment/runtime upgrade


v19 adds the paid-exposure code layer: checkout/session creation, payment webhook signature verification, payment-event action recording, admin exposure activation state projection, and an upstream-auth admin console surface.

Key files:

- `src/server/payment-service.mjs`
- `netlify/functions/phx-payment.mjs`
- `src/admin-console.js`
- `scripts/v19-enhance.mjs`
- `scripts/v19-smoke.mjs`

Key generated surfaces:

- `/payment-service/`
- `/checkout-service/`
- `/payment-webhooks/`
- `/paid-exposure-ledger/`
- `/admin-console/`

Proof:

- `npm run smoke` passed 1002 checks.
- `npm run action-smoke` passed 11 checks.
- `npm run state-smoke` passed 13 checks.
- `npm run mutation-smoke` passed 21 checks.
- `npm run v18-smoke` passed 17 checks.
- `npm run v19-smoke` passed 21 checks.

Boundary: v19 does not fake completed billing. Payment checkout produces unpaid session records; verified payment webhooks produce `payment_event` records; paid placement activates only after admin `exposure_activation` approval.


## v20 Operational Code Upgrade

v20 adds quote routing, lead route decisions, AE assignment actions, owner message drafts, notification delivery receipt events, and revenue attribution events. It remains upstream-auth-ready and does not fake delivery, payment, or payout proof. Run `npm run production-check` for the full proof suite.

## v22 handoff

The v22 closure package keeps upstream auth as the authority and does not add local auth. Runtime endpoints now share `src/server/runtime-context.mjs`, so action/admin/payment/lead/claim functions can run against JSON, D1, or Neon adapters through the same store/state interface.

Use `npm run codecheck` for full local proof and `npm run v22-smoke` for the v22-specific closure proof.

Important files:

- `src/server/runtime-context.mjs`
- `src/server/persistence-health.mjs`
- `scripts/v22-enhance.mjs`
- `scripts/v22-smoke.mjs`
- `data/runtime-wiring.json`
- `data/persistence-health-model.json`
- `data/artifact-manifest.json`
- `data/v22-code-readiness.json`

## v23 handoff note

The latest package includes a public website pass. Treat `/` as the public sales/marketplace entry point, not the operator dashboard. Use `/protected-admin/`, `/operator/`, and runtime routes behind upstream auth. Do not move dense AE/admin links back into the public topbar.

## 0S first-month business landing

MetrAIyux 0S customers now have a queued benefit path after their first paid month:

- Contract: `customer_business_posting`
- Queue: `customer-business-postings`
- Endpoint: `/.netlify/functions/phx-customer-posting`
- Eligibility: `subscription_started_at` plus `first_paid_invoice_at`, at least 30 days elapsed.
- Rule: free landing/posting is review-required and never auto-publishes.
