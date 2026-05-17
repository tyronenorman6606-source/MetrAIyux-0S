# SkyeGateFS27 Changelog

## 2026-05-17 - SkyePay store, trials, and vault policy

- Added public SkyePay ecosystem store: `skyepay-store.html`, `/store`, and `/skyepay/store`.
- Wired SkyePay into the repo Stripe registry: 50 checkout-safe offers now import from `metraiyux_0s_site/brain/sales-offer-registry.json`, while quote-only, metered, variable, and do-not-create rows stay out of instant checkout.
- Updated Checkout creation to prefer live Stripe Price lookup keys when they exist, with a metadata-preserving `price_data` fallback.
- Added zero-up-front subscription trial checkout: recurring plans can start at `$0 today` with Stripe `trial_period_days`, while setup/onboarding stays deferred for owner approval.
- Added SkyeVault access subscription offers with cap, RPM/RPD, device, provider/model, storage, file, and workspace policy.
- Added SkyeCard usage offers pulled from the repo Skyes card policy: AI Boost, Push Pack, Launch Credit, and Audit Pack.
- Extended customer policy fields for inherited rate limits and vault access controls.
- Updated gateway auth lanes to inherit customer-level default RPM limits when an API key has no override.
- Added browser proof coverage for the public store and vault offer visibility.

## 2026-05-16 - SkyePay closeout lane

- Added `SkyePay` as the FS27 payment and owner-approval lane for private app previews.
- Added public client surface: `skyepay.html`.
- Added admin ledger surface: `skyepay-admin.html`.
- Added Stripe-backed checkout function: `netlify/functions/skyepay-checkout.js`.
- Added public offer/client catalog endpoint: `netlify/functions/skyepay-offers.js`.
- Added public status endpoint: `netlify/functions/skyepay-status.js`.
- Added admin approval endpoint: `netlify/functions/admin-skyepay-ledger.js`.
- Extended the existing Stripe webhook without removing usage top-up behavior.
- Added `skyepay_orders` to the FS27 schema bootstrap so Checkout Sessions can become owner-approved workspace unlock records.
- Added Netlify clean paths for `/skyepay/offers`, `/skyepay/checkout`, `/skyepay/status`, and `/admin/skyepay-ledger`.
- Added SkyePay to Platform Control so it appears as a gate-owned platform lane.
- Added MCP-guided public surface motion using GSAP, ScrollTrigger, Lenis, neon motion chrome, and reduced-motion fallbacks.
- Hardened SkyePay CORS so global allow-all settings do not open payment endpoints.
- Added client and Stripe idempotency keys for Checkout Session creation.
- Reduced public status responses to a safe order view.
- Added delayed-payment failure handling in the Stripe webhook.
- Blocked owner approval until payment is ready, and blocked workspace unlock until owner approval.
- Added `SKYPAY_ALLOWED_ORIGINS`, `SKYPAY_TRUST_PUBLIC_APP_ORIGIN`, and `SKYPAY_ALLOW_PUBLIC_ORDER_LOOKUP` route controls.
- Added `skye:crawl:skyepay` for the 0S SkyeCrawler FS27 payment-lane profile.
- Upgraded browser proof to generate and verify a playable proof reel.

Verification target:

- `npm run build`
- `npm run mcp:mine -- SkyeGateFS27`
- `npm run proof:skyepay`
- `npm run skye:crawl:skyepay`
- `npm audit --json`
