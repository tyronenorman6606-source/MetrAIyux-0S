# PHX Verified Platform v19 Upgrade Notes

v19 is a code-layer pass focused on paid exposure operations and runtime control. It does not add local auth. It expects upstream identity headers from the SaaS shell/gateway.

## Added code

- `src/server/payment-service.mjs`
  - Dry-run checkout adapter for proof without faking payment.
  - Stripe checkout-session adapter using runtime `fetch` and `STRIPE_SECRET_KEY`.
  - Stripe webhook signature verification.
  - PHX HMAC payment webhook signature verification.
  - Payment webhook normalization into platform action contracts.
  - Payment event action creation.

- `netlify/functions/phx-payment.mjs`
  - `GET` service metadata endpoint.
  - `POST` create checkout session endpoint requiring upstream identity.
  - `POST ?operation=webhook&provider=...` payment webhook endpoint.

- `src/admin-console.js`
  - Browser-side admin console wiring for runtime endpoints.
  - Queue summary, catalog, payment service, dry-run checkout, action approval, and outbox dry-run actions.

## Added action contracts

- `payment_event`
  - Queue: `payment-events`
  - Role: `system` or `admin`
  - Purpose: record verified payment provider events.

- `exposure_activation`
  - Queue: `exposure-activations`
  - Role: `admin`
  - Purpose: activate, pause, reject, expire, or hold paid placement after payment review.

## Added state projection

- `payment_events`
- `exposure_activations`
- sponsor intent status transition to `paid_pending_admin_activation` after a paid payment event.
- sponsor intent status transition to `exposure_active`, `exposure_paused`, etc. after admin exposure activation.

## Added internal pages

- `/payment-service/`
- `/checkout-service/`
- `/payment-webhooks/`
- `/paid-exposure-ledger/`
- `/admin-console/`

## Added data/API models

- `data/payment-service-model.json`
- `data/checkout-service-model.json`
- `data/payment-webhook-model.json`
- `data/paid-exposure-ledger.json`
- `data/admin-console-model.json`
- matching `/api/*.json` mirrors.

## Proof

- `npm run v19-smoke` passes 21 checks.
- `npm run smoke` passes 1002 checks after v19 assets and route manifest updates.
- Existing action, state, mutation, and v18 runtime smoke checks still pass.

## Boundaries

- Checkout creation does not mark anything paid.
- Payment webhook acceptance does not activate placement automatically.
- Paid exposure activation still requires admin approval.
- Stripe runtime calls require real provider secrets.
- Browser admin console is not auth. Upstream auth/gateway must protect it in production.
