# SkyeGateFS27 Changelog

## 2026-05-20 - Relay13 AI response lanes and backup buckets

- Updated the SkyePay catalog so Relay13 AI is no longer a single 100-draft add-on.
- Starter is now `$35/mo` with 125 included AI response messages plus a 31-message backup bucket.
- Added Response Plus at `$79/mo` with 425 included messages plus a 76-message backup bucket.
- Added Managed AI Inbox at `from $149/mo` with 1,000 included messages plus a 222-message backup bucket.
- Managed AI Inbox policy now allows the AI to actually run routine inbox work under guardrails: auto-triage, intent labels, priority scoring, allowlisted routine replies, follow-up timers, ConnectLog summaries, and human escalation.
- Admin SkyePay activation now reads the selected Relay13 AI offer policy, included limit, backup bucket, total protected responses, auto-reply flag, and auto-reply policy instead of assuming the old Starter-only 100-draft cap.

## 2026-05-20 - 0S one-gate ownership and production push

- Moved the live gate source of truth under `metraiyux_0s_site/skyegate/source/SkyeGateFS27/` and kept the repo-root `SkyeGateFS27` path absent.
- Updated root scripts so SkyePay, provisioning, and SkySecure commands target the 0S-owned gate source instead of a second root gate.
- Updated the 0S bridge so it emits gate-card, role, email, customer, workspace, and client headers for app calls.
- Removed legacy browser authority aliases from the 0S bridge, including `kx.api.accessToken`, `kaixu_api_key`, and `KAIXU_VIRTUAL_KEY`.
- Rewired FS27 push/GitHub lanes to resolve shared 0S/SkyGate sessions through gate auth instead of requiring browser-held Kaixu keys.
- Updated SkyeMail to continue from the inherited 0S/SkyGate session without exposing a manual gate-token field.
- Updated the public 0S changelog with the one-gate ownership release receipt.

Production verification:

- 0S Worker `metraiyux-0s-full-system` deployed version `bf22ef72-397b-462f-b3ee-8bb4c6d1d112`.
- FS27 Worker `skyegatefs27-citadeldb` deployed version `f7d69577-a0a4-40e5-b8a2-30c6db2269d3`.
- SkyeMail Worker `skyemail-platform` deployed version `6b28eec4-1012-4e46-bb42-fcc61abfbc20`.
- Live 0S root returned HTTP `200`.
- Live 0S SkyGate page returned `Single Gate Source` and `canonical 0S gate source`.
- Live 0S bridge returned `x-0s-gate-cards` and `x-0s-customer-id`, with old Kaixu aliases absent.
- Live FS27 user UI now says admin actions require an admin `0S/SkyGate session`.
- Live SkyeMail `/login` returned HTTP `200` and shows `Continue with 0S/SkyGate`.

## 2026-05-20 - VantaCore provider control plane

- Added a VantaCore Provider Control view to the live CRM dashboard so the operator can see the FS27-owned provider stack, readiness state, recent external-action receipts, and proof buttons without leaving the workspace.
- Chose the production provider map from the root env and existing 0S lanes: Twilio owns phone/SMS, Resend/SkyeMail owns email, Google Calendar owns booking sync, SkyePay/Stripe owns payment handoff, FS27 Postgres/audit owns records and receipts, NorthStar owns workspace provisioning, and FS27 audit owns rollback receipts.
- Added `/api/vantacore/crm/providers`, `/api/vantacore/crm/provider-receipts`, and `/api/vantacore/crm/actions/:action` for provider readiness, receipt history, and explicit dry-run/live provider actions.
- Added `fs27_vantacore_provider_receipts` so SMS, email, calendar, payment, review, provisioning, and rollback attempts leave tenant-scoped receipts.
- Deployed FS27 Worker version `ad14aab5-e12e-4e17-a8eb-8b2424b823e6`.

Live verification:

- `node --check netlify/functions/vantacore-crm.js` passed.
- Live FS27 admin login accepted the root env admin password and opened provider status through inherited FS27 authority.
- Provider readiness now reports Twilio, Resend, Google Calendar, SkyePay/Stripe, storage, and rollback receipts as configured.
- Dry-run provider proof passed for SMS, email, Google Calendar event creation, SkyePay handoff, review request, NorthStar provisioning handoff, and rollback receipt.
- Public review routing is intentionally still private-feedback-first until a real review destination URL is configured, such as `VANTACORE_GOOGLE_REVIEW_URL`, `GOOGLE_REVIEW_URL`, or `SKYES_REVIEWS_PUBLIC_URL`.

Evidence:

- `test-artifacts/vantacore-provider-control-2026-05-20/live-provider-control-report.json`
- `test-artifacts/vantacore-provider-control-2026-05-20/live-provider-readiness-current.json`

## 2026-05-20 - VantaCore owned lane inherited-auth live proof

- Kept the active FS27 source inside `metraiyux_0s_site/skyegate/source/SkyeGateFS27` and deployed from that moved folder, not the deleted root copy.
- Removed the VantaCore CRM login form, password reset flow, saved-session button, `/auth/login`, `/admin/login`, and Vanta-specific credential storage from `vantacore-crm-dashboard.html`.
- Changed the CRM dashboard to boot only from inherited 0S/Free99/FS27 bearer, bridge, runtime, or same-origin session-cookie authority.
- Changed `/api/vantacore/crm` to ignore Vanta/password-header auth and accept inherited FS27 session, OAuth access token, central admin JWT, or FS27 session cookie authority.
- Added the FS27 admin-session bridge in `assets/app.js` so the existing FS27 admin login publishes the central token into session-scoped inherited gate keys without storing the admin password.
- Stopped a secondary admin customer-table load failure from clearing a successful admin login, so the admin password can still mint the inherited FS27 session VantaCore needs.
- Fixed the mobile dashboard header spacing and proved no headline/tenant-label overlap in Playwright.

Live verification:

- Functional proof FS27 Worker version: `57d80970-d429-4036-a60d-50c8ec66d479`.
- `npm run build` passed from the moved FS27 source.
- `node --check netlify/functions/vantacore-crm.js` and `node --check assets/app.js` passed.
- No-auth VantaCore CRM summary returned `401`.
- Direct Vanta password-header request returned `401`.
- Central FS27 admin login accepted the root env admin password and returned a redacted token.
- Inherited FS27 token opened `/api/vantacore/crm/summary`.
- 8 live CRM write cycles passed: intake, lead patch, booking, follow-up, and review.
- 96 concurrent live CRM reads returned `200`.
- Playwright proved locked/no-session behavior, inherited unlock, lead capture, pipeline update, booking, follow-up, review, desktop/mobile screenshots, zero page errors, zero console errors, and no mobile/desktop horizontal overflow.
- Playwright proved the live FS27 admin password UI publishes the inherited session bridge and opens VantaCore from that actual login.

Evidence:

- `test-artifacts/vantacore-owned-lane-live-2026-05-20/live-api-stress-report.json`
- `test-artifacts/vantacore-owned-lane-live-2026-05-20/live-browser-e2e-report.json`
- `test-artifacts/vantacore-owned-lane-live-2026-05-20/workspace-after-intake-desktop.png`
- `test-artifacts/vantacore-owned-lane-live-2026-05-20/workspace-calendar-desktop.png`
- `test-artifacts/vantacore-owned-lane-live-2026-05-20/workspace-mobile.png`

## 2026-05-19 - VantaCore FS27 login and usable CRM redesign

- Reworked `vantacore-crm-dashboard.html` from a proof-style board into an interactive CRM workspace with FS27 login, saved Free99/FS27 session pickup, FS27 owner-password login, lead selection, pipeline stages, intake, booking, follow-up, review, and activity controls.
- Extended VantaCore CRM API CORS/session handling so Free99 gate headers such as `x-skye-gate-session`, `x-skygate-session`, and `x-fs27-session` are accepted alongside normal bearer sessions.
- Confirmed the live admin password lane maps through the root `SKYGATEFS13_ADMIN_PASSWORD`/FS27 production authority, while unrelated portal keys do not open the CRM.
- Applied the MCP workflow for `SkyeGateFS27`, using the kinetic process and neon motion chrome direction while excluding the app-first command deck pattern per operator instruction.

Verification target:

- `npm run mcp:mine -- SkyeGateFS27`
- `node --check SkyeGateFS27/netlify/functions/vantacore-crm.js`
- `node --check SkyeGateFS27/netlify/functions/_lib/http.js`
- Local FS27 Worker browser proof in `test-artifacts/vantacore-crm-fs27-redesign/local-browser-report.json`: admin unlock, lead capture, pipeline update, booking, follow-up, review, desktop/mobile screenshots, zero console errors, and no horizontal overflow.

## 2026-05-19 - SkyeVaultOS Vault Console and live system proof lane

- Added metadata-only FS27 routes for `GET /skysecure/vaultos`, `/skysecure/vaultos/health`, `/skysecure/vaultos/proof`, `/skysecure/vaultos/commands`, `/skysecure/vaultos/inventory`, `/skysecure/vaultos/search`, `/skysecure/vaultos/restore-points`, and `/skysecure/vaultos/audit`.
- Extended the SkySecure proof route to name the VaultOS command lane while preserving the plaintext boundary: FS27 publishes command/live-system-proof metadata only, and encrypted objects remain under SkyeVault/SkySecure custody.
- Wired the Cloudflare Worker and Netlify redirects for the VaultOS routes.
- Added sitemap entries for the VaultOS live-system metadata and command routes.
- Live system proof against the real `/workspaces/MetrAIyux-0S/about to delete` folder passed through the VaultOS CLI/app execution lane: 1,833 files scanned, four encrypted shards created, source diff clean, reload diff clean, bundle reload diff clean, restore point created, manifest written, portable drive bundle created, bundle attached into a fresh vault, grant/revoke audited, safe metadata synced to FS27, and desktop/mobile console proof recorded. Execution scope is explicit: filesystem operations ran from CLI/app proof storage, while FS27 and 0S routes are deployed live.

Verification target:

- `npm run vaultos:proof`
- `node --check SkyeGateFS27/netlify/functions/skysecure-api.js`
- `node --check SkyeGateFS27/cloudflare/worker.mjs`
- Production route GET `https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skysecure/vaultos/proof`

## 2026-05-19 - VantaCore service CRM ownership lane

- Added `vantacore-service-crm-gate.html` and the `/vantacore-service-crm` Worker alias so VantaCore has an FS27-owned service CRM surface instead of a loose protected app link.
- Added `vantacore-crm-dashboard.html`, the `/vantacore-crm` Worker alias, and the persisted `/api/vantacore/crm` route so the lane has an actual usable CRM workspace, not only proof copy.
- The CRM workspace now supports FS27-required lead capture, pipeline status updates, booking creation, follow-up scheduling, review logging, summary metrics, and activity history.
- Added the VantaCore integration dossier and public gate-proof card for lead firewall, booking, follow-up, review routing, revenue intelligence, tenant isolation, and provider-approved activation.
- Updated platform event lane inference so VantaCore, service CRM, lead firewall, booking, and missed-call proof events classify as `crm`.
- Linked FS27 to the actual CRM workspace, the 0S VantaCore hub, and the 0S proof receipt without exposing provider secrets.

Verification target:

- `node --check SkyeGateFS27/cloudflare/worker.mjs`
- `node --check SkyeGateFS27/netlify/functions/vantacore-crm.js`
- `node --check SkyeGateFS27/netlify/functions/platform-event-ingest.js`
- Local Worker-harness API proof for lead capture, lead update, booking, follow-up, review, summary, and activity.
- Browser workflow proof for `/vantacore-crm`: unlock, capture lead, update pipeline, create booking, schedule follow-up, log review, and desktop/mobile screenshots.

## 2026-05-19 - Admin client provisioning and forced password reset

- Added `admin-client-provisioning` so the FS27 admin desk can create/update a customer, bind a default customer key, create/update the client user, return a one-time temporary password, and optionally call the signed SkyeVault workspace provisioning lane.
- Added direct Resend delivery fallback for auth/provisioning mail, so verification, reset, recovery, and admin-provisioned client emails can send through `AUTH_EMAIL_WEBHOOK_URL` or `RESEND_API_KEY` + `RESEND_FROM`/`RESEND_FROM_EMAIL`.
- Added `password_reset_required`, `default_api_key_id`, provisioning metadata, `communication_email`, and `skyemail` to the schema bootstrap, with reference SQL migrations in `sql/migrate_v9_to_v10_admin_provisioning.sql` and `sql/migrate_v10_to_v11_skyemail_contact.sql`.
- Hardened login so admin-provisioned temporary passwords only receive a short-lived password-reset session until `/auth/change-password` clears the forced reset flag.
- Updated introspection so password-reset-only sessions are not treated as active app sessions.
- Updated the FS27 admin and customer dashboard surfaces so clients can log in with the provisioned credentials, set a new password, and then open their dashboard.
- Added the Valley Verified provisioning queue and `scripts/provision-client-workspaces.mjs` so contact-ready Valley companies can be provisioned through the FS27 admin endpoint without storing temporary passwords in tracked files.

Verification target:

- `node --check SkyeGateFS27/netlify/functions/admin-client-provisioning.js`
- `node --check SkyeGateFS27/netlify/functions/_lib/emailAuth.js`
- `node --check SkyeGateFS27/netlify/functions/auth-login.js`
- `node --check SkyeGateFS27/assets/user-dashboard.js`
- `npm run gateway:provision:valley -- --dry-run`

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
