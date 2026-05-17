# Directive Checklist

✅ No local auth added.
✅ Upstream auth headers remain the identity boundary.
✅ Large Arizona seed remains included.
✅ Duplicate prevention remains active.
✅ Runtime mutation code added instead of more cosmetic pages.
✅ Admin API orchestration added.
✅ JSON and D1 runtime adapter code added.
✅ Signed webhook outbox processing added.
✅ Exposure order intent code added without fake billing completion.
✅ Proof outputs are included in `proofs/`.
☐ Live deployed browser smoke is not included in this sandbox package.
☐ Payment provider checkout/webhook wiring is still open.
☐ Email/SMS provider delivery is still open.

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
