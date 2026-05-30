# SkyeCommerce Status

Version: 1.24.0 runtime bullshit-removal build.

Current posture: mounted 0S commerce platform foundation behind the shared FS27/Free99 gate with runtime-wired public checkout, signed public order recovery, honest connection-health provider validation, runtime OAuth install completion, deeper warehouse/Routex operational routes, POS terminal closeout that lands in real order/cart/payment state, SkyPay dynamic checkout dispatch, merchant receivable ledgering, and SovereignDocs/SkyeDocxMax commerce document drafting. The remaining boundary is external credentials, live merchant/provider account validation, and automated payout disbursement, not fake local rails.

0S live addendum, 2026-05-24:

- Mounted at `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/SkyeCommerce/` through the main 0S Worker and `SKYECOMMERCE_DB`.
- Retired SkyeCommerce's isolated AE lane. `/SkyeCommerce/ae/` now hands off to canonical `/Marketing-Made-Easy/AE-FlowPro/`.
- Added SkyPay dynamic cart checkout through the `SKYGATEFS27_WORKER` service binding with HMAC-signed payloads and merchant payout ledger records.
- Added `/SkyeCommerce/docs/` Document Desk plus `/SkyeCommerce/api/docs/sovereigndocs-kit` for SovereignDocs commerce policies and SkyeDocxMax drafting handoff.
- Applied D1 migration `0028_skyepay_merchant_payouts.sql`.
- Deployed FS27/SkyPay Worker version `39fd8b05-8798-4245-8e03-618afaabfdb2`.
- Deployed 0S Worker version `e1019af0-114a-49e5-bad5-0f44c6766b09`.
- Production HTTP stress passed: 270/270 authenticated scenario checks, unauthenticated SkyeCommerce gate redirects to `/admin/login.html`, p95 495 ms. Receipt: `test-artifacts/skyecommerce-live-production-stress/2026-05-24T23-02-25-441Z-stress.json`.
- SkyeCommerce to SkyPay loop stress passed: 240/240 dynamic checkout calls at concurrency 32, p95 618 ms. Receipt: `test-artifacts/skyecommerce-skyepay-loop-stress/2026-05-24T23-02-18-121Z-stress.json`.
- Browser verification was intentionally left to the owner/operator live proof lane.

New in v1.24:

- Provider preview route removed from the production surface as a usable runtime feature; it now hard-404s.
- Provider validation wording and audit mode renamed to `connection_health` so the evidence matches what is actually being proven.
- OAuth install-session flow now persists state and completes through a real callback route.
- POS terminal payments now create a pending order shell plus transaction and finalize into paid/failed/voided/canceled runtime state.
- Merchant Command wording cleaned so it does not overclaim full live validation.
- Added runtime tests for OAuth completion and POS terminal closeout.

Proof run in this package:

- `node --check src/index.js`
- `node --check public/assets/js/merchant.js`
- `npm test` → 149/149 passing
- `npm run smoke` → passing
- `npm run smoke:providers` → 7/7 passing
- `npm run smoke:platform` → passing
- `npm run smoke:warehouse` → passing
- `npm run smoke:closure` → passing

Live-provider boundary: merchant traffic still requires real Stripe, PayPal, UPS, Cloudflare, Resend, Routex, warehouse, tax, fraud, receipt printer, and channel credentials, then `npm run verify:live` plus deployed webhook validation.
