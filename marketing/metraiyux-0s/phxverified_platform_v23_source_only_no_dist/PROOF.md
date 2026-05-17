# PHX Verified Platform Proof

Latest package: v18.

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

v21 codecheck passed after adding full-static profile rendering, deploy-output compaction, runtime adapter expansion, protected upstream-auth admin wiring, enrichment queue, persistent lead record service, payment activation service, notification worker service, owner claim submission persistence, and build modularization.

Important counts from the v21 package:

- 26,413 published deduped businesses
- 26,413 full-static business profile HTML pages
- 1,069 duplicate/import collisions merged
- Full `npm run codecheck` passed
- v21 smoke passed: 42 checks passed
- Dist output reduced from the audited ~580MB range to roughly ~400MB while adding full static profiles

## v22 closure proof

✅ `npm run codecheck` passed after v22 closure work.
✅ `npm run v22-smoke` passed with 31 checks.
✅ Published deduped businesses remain 26,413.
✅ Full static business profile count remains 26,413.
✅ API business/search mirrors are now manifest-only, removing duplicated heavy payloads.
✅ Dist output is recorded at approximately 338.4 MB after v22 compaction.
✅ Runtime functions now use shared runtime context for JSON/D1/Neon adapter wiring.
✅ Claim endpoint upstream-auth bug fixed.
✅ Protected admin replay operation fixed.

See `proofs/v22-closure-summary.txt` and `proofs/v22-smoke-output.txt`.
