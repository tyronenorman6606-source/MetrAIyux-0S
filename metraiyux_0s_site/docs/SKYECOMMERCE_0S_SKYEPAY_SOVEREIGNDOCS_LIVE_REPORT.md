# SkyeCommerce 0S + SkyPay + SovereignDocs Live Report

Updated: 2026-05-24

## Direct surfaces

- 0S owner gate: `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/admin/login.html`
- SkyeCommerce overview: `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/SkyeCommerce/`
- Merchant Command: `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/SkyeCommerce/merchant/`
- Design Studio: `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/SkyeCommerce/design/`
- Storefront: `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/SkyeCommerce/store/?slug=metraiyux-0s-commerce`
- Document Desk: `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/SkyeCommerce/docs/`
- SovereignDocs kit API: `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/SkyeCommerce/api/docs/sovereigndocs-kit`
- Retired SkyeCommerce AE handoff: `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/SkyeCommerce/ae/`
- Canonical AE-FlowPro: `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/Marketing-Made-Easy/AE-FlowPro/`
- SkyPay Store: `https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skyepay-store.html?client=metraiyux-0s`
- SkyPay offers API: `https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skyepay/offers?client=metraiyux-0s`

## What is proven

- SkyeCommerce is mounted behind the shared FS27/Free99 0S gate. Unauthenticated `/SkyeCommerce/` redirects to `/admin/login.html?return=%2FSkyeCommerce%2F`.
- SkyeCommerce owner/admin access does not create a separate app-local password lane. App-local merchant registration remains blocked until the shared gate owns the session.
- SkyeCommerce AE is no longer isolated. `/SkyeCommerce/ae/` hands off to canonical `/Marketing-Made-Easy/AE-FlowPro/`.
- SkyPay dynamic checkout payloads are built from SkyeCommerce orders, HMAC signed, dispatched through FS27 service binding, mapped back to payment status, and ledgered as merchant receivables.
- SovereignDocs commerce document drafting is linked through `/SkyeCommerce/docs/` and `/SkyeCommerce/api/docs/sovereigndocs-kit`.
- D1 migration `0028_skyepay_merchant_payouts.sql` was applied to remote `skyecommerce-foundation`.
- FS27/SkyPay Worker deployed as version `39fd8b05-8798-4245-8e03-618afaabfdb2`.
- 0S Worker deployed as version `e1019af0-114a-49e5-bad5-0f44c6766b09`.

## Stress receipts

- Full SkyeCommerce local suite: 149/149 passing.
- FS27 SkyPay dynamic commerce tests: 3/3 passing.
- Focused SkyPay + SovereignDocs tests: 9/9 passing.
- Production HTTP stress: 270/270 scenario checks, p95 495 ms, receipt `test-artifacts/skyecommerce-live-production-stress/2026-05-24T23-02-25-441Z-stress.json`.
- SkyeCommerce to SkyPay loop stress: 240/240 dynamic checkout calls, concurrency 32, p95 618 ms, receipt `test-artifacts/skyecommerce-skyepay-loop-stress/2026-05-24T23-02-18-121Z-stress.json`.
- Direct unauth/gate smoke receipt: `test-artifacts/skyecommerce-production-direct-surfaces/2026-05-24T23-00-38-602Z.json`.

## Remaining gaps

- Automatic outbound PayPal/CashApp/bank provider payout execution is not finished. The platform records what each merchant/artist is owed under the Skyes Over London merchant-of-record model; actual external payout issuance is still an owner/operator action or future provider API lane.
- SkyPay-originated refund automation is not finished. Digital SkyPay refunds are intentionally blocked until a provider-safe refund route is added.
- Browser verification is not claimed in this report. Owner/operator live verification is the browser proof lane for this release.
