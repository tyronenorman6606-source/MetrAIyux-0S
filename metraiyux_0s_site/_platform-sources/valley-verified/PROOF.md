# Valley Verified Platform Proof

Latest package: v23.2 cleaned active seed.

Proof commands used:

```bash
npm run build
npm run smoke
npm run action-smoke
npm run state-smoke
npm run mutation-smoke
npm run v18-smoke
npm run dry-run
```

The proof outputs are stored in `proofs/`.

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

## v21 Proof Addendum

v21 codecheck passed after adding full-static profile rendering, deploy-output compaction, runtime adapter expansion, protected upstream-auth admin wiring, enrichment queue, persistent lead record service, payment activation service, notification worker service, owner claim submission persistence, and build modularization. The active v23.2 seed was later pruned to remove blank-contact backlog and demo seed rows.

Current active counts after the May 19, 2026 cleanup:

- 19 published businesses
- 19 full-static business profile HTML pages
- 0 blank phone/email/website records
- 0 active demo seed rows
- `npm run smoke` passed 1013 checks
- `npm run v22-smoke` passed 33 checks
- `npm run v23-smoke` passed 101 checks

## v22 closure proof

- `npm run v22-smoke` passed with 33 checks.
- Published deduped businesses: 19.
- Full static business profile count: 19.
- API business/search mirrors are manifest-only.
- Runtime functions use shared runtime context for JSON/D1/Neon adapter wiring.
- Claim endpoint upstream-auth bug fixed.
- Protected admin replay operation fixed.

See `proofs/v22-closure-summary.txt` and `proofs/v22-smoke-output.txt`.

## 0S gate/auth proof addendum

Added after the v23 source audit:

- `src/server/gate-auth.mjs` maps FS27 bearer tokens to trusted upstream actor headers.
- Runtime functions now call the gate adapter before privileged POST/admin/payment/customer landing actions.
- `src/server/customer-posting-entitlement.mjs` enforces the first-paid-month free landing/posting rule.
- `scripts/gate-auth-smoke.mjs` proves token introspection, spoofed header stripping, customer/workspace propagation, public contract read, and the queued `customer_business_posting` action.

Run:

```bash
npm run gate-auth-smoke
```
