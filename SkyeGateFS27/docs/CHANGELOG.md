# SkyeGateFS27 Changelog

## 2026-05-18 - Marketing Made Easy gate dossier and 0S route wiring

- Added Marketing Made Easy as a gate-accounted 0S growth-suite lane covering AE-FlowPro, BrandID Offline PWA, BusinessLaunchGo, SkyeDocxMax, SkyeWebCreatorMax, WebGrowthOperator, Arizona Growth Index, and kAIxU BrandKit.
- Added FS27 integration dossier files for the suite and documented the expected platform mirror event types.
- Added the suite to FS27 platform control and the local runtime surface map so operators can see it as a client-admin platform group.
- Kept the claim boundary explicit: local PWA/runtime proof does not prove production tenancy, checkout, external publishing, ad spend, or customer-impacting provider writes.
- Completed local closeout for the suite with 0S accounting, deep scan, smoke proof, browser proof, and a Cloudflare dry run.
- Marked production deploy as pending Cloudflare authentication; the new live Worker routes must not be represented as deployed until `wrangler deploy` succeeds.

Verification target:

- `npm run 0s:marketing-made-easy:proof`
- `npm run mcp:mine -- metraiyux_0s_site/Marketing-Made-Easy`
- `npm run 0s:platform-accounting`
- Local browser proof for `/live/marketing-made-easy-growth-suite.html`, `/Marketing-Made-Easy/index.html`, and `/proof/marketing-made-easy-deep-scan-receipt.html`
- `npx wrangler deploy --dry-run`

## 2026-05-17 - SkyeMerit production checkout origin closeout

- Made the Cloudflare FS27 Worker the customer checkout origin for MetrAIyux 0S SkyePay links.
- Removed the customer-facing dependency on legacy `skyesol.netlify.app/skyepay` checkout URLs from 0S plan data, the SkyePay gateway JSON, SaaS Worker plan config, and customer buttons.
- Added SkyeMerit support to the live SkyePay checkout path, including protected eligible-spend discount math, first-time pack metadata, kAIxu credit metadata, and Stripe promo stacking disablement when SkyeMerit applies.
- Confirmed owner-gated paid app activation still returns `paid_pending_owner_approval` and RouteX remains `owner_approved_after_route_scope`.
- Verified live FS27 offers include SkyeMerit and the RouteX owner-approval policy through the deployed `skyegatefs27-citadeldb` Worker.

Verification target:

- `npm run audit:commercial-limits`
- `npm run 0s:skyemerit:proof`
- `npm run mcp:mine -- SkyeGateFS27`
- Live GET `https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skyepay/offers?client=metraiyux-0s`
- Live GET `https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skyepay.html?client=metraiyux-0s&offer=metraiyux-growth-cabinet&skyemerit_code=SKYEMERIT-FIRST-BEST`

## 2026-05-17 - RouteX owner-approval checkout and production env closeout

- Added the SkyeRouteX Workforce Command offer to SkyePay with `$6,500` setup and `$1,497/mo` pricing.
- Added Stripe lookup keys for the RouteX setup and monthly prices: `metraiyux_routex_workforce_command_setup` and `metraiyux_routex_workforce_command_monthly`.
- Hardened app-lane activation so RouteX and owner-approved MetrAIyux app offers do not auto-unlock after payment.
- Added the `paid_pending_owner_approval`, `pending_owner_approval`, and `waiting_for_owner_approval` path for paid orders that still need owner release.
- Updated checkout, status, admin ledger, store, API docs, and browser copy so customer-facing state says pending owner approval instead of implying automatic unlock.
- Added the SkyePay owner-approval regression and updated the SkyePay crawler to validate the RouteX approval lane.
- Wired RouteX production env resolution to accept existing root `.env` aliases, including `mapbox_api_key` as `MAPBOX_ACCESS_TOKEN`.
- Verified live env readiness with `PASS`, full live route ops enabled, and zero warnings.

Verification target:

- `npm run gateway:skyepay:owner-approval`
- `npm run proof:skyepay`
- `npm run gateway:skyepay:scan`
- `npm run check:prod:root-env`
- `npm run smoke:live-env`

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
