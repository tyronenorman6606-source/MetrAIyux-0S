# SkyeCommerce Shopify Replacement Foundation v1.24.0

Cloudflare-native merchant commerce platform foundation with production-only runtime behavior. This pass removes more of the remaining bullshit by wiring OAuth completion, making POS terminal flow close into real order state, deleting preview-route behavior from the production surface, renaming provider checks honestly as connection-health validation, mounting the app behind the shared 0S gate, adding SkyPay dynamic checkout, and adding a SovereignDocs/SkyeDocxMax Document Desk for commerce policy drafting.

## 0S mount, SkyPay, and SovereignDocs addendum

Production surfaces:

- `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/SkyeCommerce/`
- `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/SkyeCommerce/merchant/`
- `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/SkyeCommerce/design/`
- `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/SkyeCommerce/store/?slug=metraiyux-0s-commerce`
- `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/SkyeCommerce/docs/`
- `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/SkyeCommerce/api/docs/sovereigndocs-kit`

SkyeCommerce now uses the shared FS27/Free99 gate. App-local owner/admin registration remains blocked for mounted owner access. Dynamic checkout builds signed SkyPay cart payloads, dispatches through the `SKYGATEFS27_WORKER` service binding, syncs paid status back into SkyeCommerce payment state, and records merchant receivables in `merchant_payout_ledger`.

The Document Desk points merchants to SovereignDocs self-help commerce templates and SkyeDocxMax drafting context for terms, privacy, refund, shipping, seller, subscription, cookie, accessibility, acceptable-use, license, creator-platform, and community-guideline drafts. It is document automation, not legal advice.

Proof receipts:

- `test-artifacts/skyecommerce-live-production-stress/2026-05-24T23-02-25-441Z-stress.json` — production HTTP stress, 270/270 scenario checks, p95 495 ms.
- `test-artifacts/skyecommerce-skyepay-loop-stress/2026-05-24T23-02-18-121Z-stress.json` — SkyPay loop stress, 240/240 dynamic checkout calls, p95 618 ms.
- `test-artifacts/skyecommerce-production-direct-surfaces/2026-05-24T23-00-38-602Z.json` — direct surface/gate smoke.

Remaining hard boundary: Stripe Connect/KYC/1099 automatic merchant payout disbursement is not complete yet. Current production code records the receivable ledger so the platform knows what a business should be paid. SkyPay-originated refund automation also remains blocked pending a provider-safe refund lane.

## v1.24.0 runtime fixes

- Provider preview route no longer behaves like a lingering production feature. `POST /api/provider-connections/preview` now returns `404` with a removal message instead of shipping a fake-but-blocked preview surface.
- Provider validation wording and recorded mode now state `connection_health`, which is what the code actually proves.
- OAuth install flow is now runtime-complete: `POST /api/apps/:id/oauth/install-session` persists state, and `GET /api/app-installations/oauth/callback` finalizes the installation state and redirects back to Merchant Command.
- POS terminal flow is now end-to-end in runtime routes. `POST /api/pos/terminal-payments` creates a pending order shell and linked transaction, and `POST /api/pos/terminal-payments/:id/finalize` closes the loop into paid/failed/voided/canceled state, updates the cart, updates the order, writes audit events, and allocates inventory only on successful completion.
- Merchant UI wording now says connection-health checks instead of overstating them as full live validation.

## Required production bindings and secrets

At minimum, production use requires Cloudflare D1 binding `DB`, `SESSION_SECRET`, `PROVIDER_CONFIG_ENCRYPTION_KEY`, CSRF/rate-limit settings, and real provider credentials for the lanes enabled by a merchant: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`, UPS credentials, Resend credentials, Routex/warehouse/fulfillment endpoints, receipt-printer endpoint/secret, tax provider endpoint/secret, fraud provider endpoint/secret, and any active channel provider secrets.

## Commands

```bash
npm test
npm run smoke
npm run smoke:providers
npm run smoke:platform
npm run smoke:warehouse
npm run smoke:closure
npm run verify:live
```

`npm run verify:live` intentionally requires real Stripe, PayPal, and UPS credentials. The other smoke scripts prove route wiring, request construction, fail-closed policies, signing, and subsystem logic without pretending to be live provider traffic.

## Honest boundary

This package is no longer pretending that connection-health checks are full provider-action proof, and it no longer leaves OAuth callback or POS terminal closeout half-wired. The remaining external boundary is still real deployed Cloudflare bindings, real provider credentials, real merchant/provider accounts, legal/compliance review, and live account validation before merchant traffic.
