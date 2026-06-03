# SkyeMail Public Changelog

## 2026-06-01 - Capacity-Safe SkyeMail Sales And Real-User Readiness Follow-Up

Status: Deployed and live-proven. This pass made SkyeMail safer to sell by removing instant self-serve promises from primary mailbox offers while provider capacity is constrained.

What changed:

- Redeployed FS27/SkyePay as Worker version `018ba537-c1a4-418c-a803-3029fb77bcd7`.
- Changed the Starter, Business, and Operator SkyeMail mailbox offers into paid capacity-approval requests instead of public auto-provision/self-serve fulfillment.
- Kept the product sellable without telling customers that SkyeMail uses a third-party provider behind the scenes; customer copy stays SkyeMail/Citadel Database/SkyeNet.
- Cleaned up generated GRAYSCAPE467 proof aliases from Zoho capacity and repaired stale SkyeMail DB rows that had recorded provider success incorrectly.
- Re-ran the real-user readiness flow through signup, FS27 gate, workspace, SkyeNet publish, SkyeMail session import, hosted alias mailbox provisioning, outbound send, proof-loop inbox record, and inbox list.

Proof:

- FS27 deploy receipt: `test-artifacts/skyepay-readiness/fs27-worker-deploy-2026-06-01T13-24-46-240Z.json`.
- Buyer-fulfillment truth still passes `153` public offers with `0` failures; receipt: `test-artifacts/skyepay-readiness/skyepay-buyer-fulfillment-truth-latest.json`.
- Live catalog checkout passes `153/153` offers with `0` failures; receipt: `test-artifacts/skyepay-live-nonbrowser/skyepay-live-catalog-checkout-latest.json`.
- Self-serve access now checks `9/9` offers with `0` failures because the three primary SkyeMail mailbox offers are intentionally capacity-gated; receipt: `test-artifacts/skyepay-live-nonbrowser/skyepay-self-serve-live-access-latest.json`.
- Alias cleanup deleted `4` generated proof aliases and repaired `4` DB rows; receipts: `test-artifacts/skyemail-zoho-alias-capacity/2026-06-01T13-28-13-450Z/receipt.json` and `test-artifacts/skyemail-zoho-alias-capacity/2026-06-01T13-28-24-741Z/receipt.json`.
- Real-user readiness passed `22` live non-browser checks with zero warnings/failures; receipt: `test-artifacts/0s-real-user-readiness/2026-06-01T13-28-35-319Z/receipt.json`.

## 2026-06-01 - Relay13 AI Sales Registry Closure And Stripe Money-Lane Hardening

Status: Deployed and live-proven. FS27 public SkyePay now serves the `153`-offer catalog, routes checkout order records through the Citadel D1 ledger, and has fresh live receipts across buyer truth, self-serve access, full catalog checkout, sales registry, and Stripe parity.

What changed:

- Closed the approved-offer gap where Relay13 AI paid plans existed in the sales registry but were not present in the SkyePay catalog/Stripe parity lane.
- Added real SkyePay offers for `relay13-ai-response-starter`, `relay13-ai-response-plus`, and `relay13-managed-ai-inbox`.
- Synced the new Relay13 AI lookup keys into Stripe and reran full Stripe parity.
- Added `proof:skyepay:sales-registry` so approved fixed-price sales registry entries fail proof if they are missing from SkyePay or missing Stripe parity.
- Updated the Relay13 platform pricing registry copy so the AI response lane reads as capped, paid, owner-approved FS27 Brain usage instead of vague provider-backed automation.

Proof:

- Sales-registry money-lane proof passed with `153` source SkyePay offers, `41` approved fixed-price sales offers checked, `12` direct-money platform surface mappings checked, and `0` failures; receipt: `test-artifacts/skyepay-readiness/skyepay-sales-registry-money-lane-latest.json`.
- Stripe full catalog parity passed with `173` inspected prices and `0` failed prices; receipt: `test-artifacts/stripe-sync/skyepay-full-catalog-parity-latest.json`.
- Public live SkyePay buyer-fulfillment proof passed `153` live offers with `0` failures; receipt: `test-artifacts/skyepay-readiness/skyepay-buyer-fulfillment-truth-latest.json`.
- Public live SkyePay checkout proof checked `153/153` offers with `0` failures after the FS27 redeploy; receipt: `test-artifacts/skyepay-live-nonbrowser/skyepay-live-catalog-checkout-latest.json`.
- Self-serve live access proof checked `9/9` self-serve offers with `0` failures after the primary SkyeMail mailbox plans were capacity-gated; receipt: `test-artifacts/skyepay-live-nonbrowser/skyepay-self-serve-live-access-latest.json`.

## 2026-06-01 - SkyeMail Money-Lane, 0S Integrations, And Buyer Fulfillment Proof

Status: Deployed and proven with non-browser production checks. Browser verification remains owner-handled by repo policy.

Production surfaces:

- SkyeMail Worker: `https://skyemail-platform.graylondonskyes.workers.dev/`
- SkyeMail functional proof release: `04689d1d-b143-4202-af6a-36f90842ee06` (later changelog-only asset deploys may carry newer Worker IDs)
- Main 0S Worker receipt version for the SaaS/thank-you pass: `6f85d74a-13c9-4e97-a854-a02a28e8e792`

What changed:

- Standardized the customer-facing architecture line to `SkyeMail backed by Citadel Database and SkyeNet` and removed the confusing product-name posture where public pages made it sound like the product was named `SkyeMail Citadel`.
- Replaced stale `SkyeMail Vault`, Cloudflare-backed, and Neon-backed buyer copy on touched SaaS/pricing/workspace surfaces.
- Added legacy `/suite/standalone/*.html` and `/standalone/*.html` redirects into the real SkyeMail root pages so old suite links do not dead-end.
- Updated SkyeMail 0S bridge actions so CRM handoffs open AE FlowPro live surfaces while still recording Command Bridge events.
- Added receipt-backed customer thank-you rows and a `Thank-yous` KPI through the SaaS visual data kit, with thank-you events created from signup, SkyePay handoff, SkyeMerit, and usage flows.
- Kept the 0S integration pass focused on real routes: calendar, SkyeDocxMax, SovereignDocs, Command Bridge/CRM, AE Flow contact/journal, SkyeCommerce, PWA Factory, telemetry, game ledger, and paid Brain/AI automation.
- Added SkyePay buyer-fulfillment truth proof so every live public offer has fulfillment type, activation path, delivery surface, support copy, line items, self-serve/operator-review consistency, and SkyeMail mailbox auto-provision rules.

Proof:

- Human-production smoke passed `61/61` live non-browser checks against selected mailbox `darthom-intelligence@solenterprises.org`; receipt: `test-artifacts/skyemail-human-production-smoke/2026-06-01T09-45-43-489Z/receipt.json`.
- SkyeMail live production stress passed `120/120` OK; receipt: `test-artifacts/skyemail-live-production-stress-latest.json`.
- Cloudflare route compatibility passed; receipt: `test-artifacts/skyemail-cloudflare-route-compat-latest.json`.
- Branding/thanks/integration live proof passed; receipt: `test-artifacts/skyemail-saas-live-nonbrowser/branding-thanks-integrations-latest.json`.
- SaaS customer thank-you proof created workspace `ws_skyemail-live-thanks-2026-06-01t09-34-42-498z_1r02cxb`, wrote live events, and read back `3` thank-you rows; receipt: `test-artifacts/saas-live-customer-thanks/saas-live-customer-thanks-latest.json`.
- SkyePay buyer-fulfillment truth proof now passes `153` live public offers with `0` failures; receipt: `test-artifacts/skyepay-readiness/skyepay-buyer-fulfillment-truth-latest.json`.
- SkyePay live catalog checkout proof checked `153/153` offers with `0` failures; receipt: `test-artifacts/skyepay-live-nonbrowser/skyepay-live-catalog-checkout-latest.json`.
- SkyePay self-serve live access proof checked `9/9` self-serve offers with `0` failures after the primary SkyeMail mailbox plans were capacity-gated; receipt: `test-artifacts/skyepay-live-nonbrowser/skyepay-self-serve-live-access-latest.json`.
- SkyePay settlement catalog parity returned `173` inspected prices and `0` failed prices; receipt: `test-artifacts/stripe-sync/skyepay-full-catalog-parity-latest.json`.

## 2026-05-31 - Paid AI Automation + Direct 0S Execution

Status: Built for non-browser production proof. Browser verification remains owner-handled by repo policy.

What changed:

- Wired Send + Monitor to use the existing SkyeGate FS27 `auto_send` entitlement so Managed AI Inbox can perform paid, explicitly opted-in, allowlisted routine auto-sends.
- Added risk gates that stop automation for legal, billing, contracts, HR, safety, credential, and regulated language, forcing owner/manual approval instead.
- Changed generated Send + Monitor replies to stop as drafts unless the reviewed body is supplied or the paid automation entitlement is active.
- Upgraded SkyeMail 0S handoffs so Founder Calendar, Command Bridge/CRM, and PWA Factory call their real 0S APIs directly and store the execution receipt in the workflow packet.
- Updated the Brain UI to separate reviewed manual send, paid automation consent, and prompt-as-body behavior.
- Removed stale SkyeMail-specific AI model labels from the SkyeGate FS27/SkyePay SkyeMail offer policy and aligned it to the SkyeGate FS27 runtime aliases.

Proof:

- Non-browser checks cover Worker syntax, Brain JS syntax, stale-model string removal, direct 0S execution smoke, paid automation Send + Monitor smoke, live route smoke, and production stress.

## 2026-05-27 - SkyeMail Brain, FS27 Metering, And Send + Monitor

Status: Built with non-browser verification. Browser verification remains owner-handled.

What changed:

- Added a real authenticated `/mail-brain` runtime with local brain, FS27 metered mode, AI entitlement checks, usage events, and reply monitors.
- Added `/mail-brain-plans`, `/mail-brain-checkout`, and `/mail-brain-claim` so paid mailbox AI plans can create and claim SkyePay entitlements through the shared SkyeGate FS27 lane.
- Added SkyeMail Brain UI controls for FS27 Brain runtime mode, paid plan checkout, explicit Send + Monitor, and reply monitor history.
- Added database tables for `skymail.ai_entitlements`, `skymail.ai_usage_events`, and `skymail.brain_monitors`.
- Updated the shared Brain compatibility client to forward the active 0S bearer and selected mailbox header.

Proof:

- Non-browser syntax, HTML, schema, asset build, route, and smoke checks are recorded in the local work receipt for this pass.

## 2026-05-25 - Founder Command Pocket SkyeMail + Workspace Handoffs

Status: Deployed to SkyeMail and the main 0S Worker; live API/stress proof passed. Headed browser proof was not run for this pass.

Production surfaces:

- SkyeMail Worker: `https://skyemail-platform.graylondonskyes.workers.dev/`
- SkyeMail Worker release: `d35c324d-7b27-4a9c-8fc2-7363d4b2b870`
- SkyeMail public changelog asset deploy: `36a52b48-0351-44e4-9360-c287248906f0`
- Founder Command Pocket 0S: `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/founder-command/?view=core#pocket-skyemail`
- Main 0S Worker release with `SKYEMAIL_PLATFORM_WORKER` binding: `576fb7cd-24eb-4c59-a986-65a9a947860a`

What changed:

- Added `/workspace-mailbox-summary` to the SkyeMail Worker for service-token owner sync of mailbox status, unread counts, aliases, active key state, and recent messages.
- Added Founder Command Pocket SkyeMail through `/api/founder-command/skyemail/pocket`, so the owner phone cockpit can show a live mini inbox while full inbox/compose actions stay in the real SkyeMail app.
- Added SkyeMail workspace handoff packets from Founder Command: QR payload, welcome URL, welcome video, safe claim/reset credential model, optional welcome email, SkyeMerit Launch Spark prompt, and the `MetrAIyux-0s` main contact workspace.
- Added the Founder Command Core Apps mobile dock for SkyeMail, SkyeGate FS27, SkyePay, SkyeNet, business card generators, Client App Factory, Valley CRM, and editable owner shortcuts.
- Bound SkyeMail into the main 0S Worker as `SKYEMAIL_PLATFORM_WORKER`, fixing the live Pocket SkyeMail bridge that was returning a public-edge 404 even while the SkyeMail route worked directly.
- Fixed the main 0S compatibility mount for `/live/SkyeMail/*`. Authenticated owner traffic now redirects to the real SkyeMail Worker dashboard/compose pages, unauthenticated traffic stays behind the shared 0S login, and the private implementation-source message no longer appears for SkyeMail app links.

Proof:

- Local proof command: `npm run 0s:skyemail:offboarding-proof`.
- Static coverage checks the pocket API, workspace summary route, Core Apps tab, SkyeMail Launch Spark, workspace handoff tutorial, and Founder Command Pocket 0S tutorial.
- Follow-up proof passed 9/9 checks, including the `/live/SkyeMail/dashboard.html` compatibility redirect regression. Production smoke passed on 0S Worker version `57ab7540-ebf3-4dd7-b3c8-1585832faa4d`.
- Live owner-auth smoke passed `/api/founder-command/status`, `/api/founder-command/skyemail/pocket`, and `/api/founder-command/skyemail/handoffs`.
- SkyeMail live production stress passed 32/32 requests with p95 `85ms`; receipt: `test-artifacts/skyemail-live-production-stress/2026-05-25T12-40-41-892Z/receipt.json`.
- SkyeNet live production stress passed 12 baseline checks and 72 stress requests with p95 `1041ms`; receipt: `test-artifacts/skyenet-live-production-stress/2026-05-25T12-48-27-581Z/receipt.json`.

## 2026-05-25 - Mailbox Offboarding + Provider Seat Release Lane

Status: Built locally; deployment/browser proof pending for this change.

What changed:

- Added `/mailbox-offboarding` to the SkyeMail Cloudflare Worker with status, prepare, release, and cancel actions.
- Added two-stage release guardrails: a mailbox can be marked `offboarding_pending` first, but final `released_provider_seat_available` requires archive/export and provider-release confirmations.
- Added `skymail.mailbox_offboarding_events` schema support plus runtime auto-create fallback, FS27 mirror events, and Citadel backup packets.
- Released mailboxes are no longer returned as the active hosted mailbox for send/status flows, and aliases are marked `released` on final release.
- Founder Command now proxies this lane through `/api/founder-command/skyemail/offboarding` using the shared owner gate and SkyeMail service token when configured.

Proof:

- Local proof command: `npm run 0s:skyemail:offboarding-proof`.
- Static SkyeMail suite proof now checks for the mailbox offboarding route and schema markers.

## 2026-05-25 - Fresh-User Claim Flow + Readiness Proof

Status: Deployed to the SkyeMail Cloudflare Worker.

Production surface:

- SkyeMail Worker: `https://skyemail-platform.graylondonskyes.workers.dev/`
- Worker code release: `d6cae58d-66c4-4ea4-b2bc-5ae01d7bf469` (later changelog-only asset deploys may have newer Worker IDs)
- Shared gate import route: `https://skyemail-platform.graylondonskyes.workers.dev/auth-fs27-session`

What changed:

- Fixed the pre-provisioned account claim path. SaaS workspace provisioning can create a SkyeMail identity first, and the same user can now claim it through the shared SkyeGate FS27 bearer during SkyeMail signup.
- Claiming a pre-provisioned identity now upgrades the placeholder service login into a real password login, links the FS27 identity, and writes the active vault key without opening an email-only hijack path.
- Added a hosted-mailbox capacity fallback so a provider-capacity block activates the SkyeMail local inbox route instead of dead-ending account setup.
- Added the root production readiness audit command: `npm run 0s:real-user-readiness`.

Proof:

- First full fresh-user production readiness passed 17 checks with zero failures before the final redeploy: SaaS signup, owner-authenticated private QA zero-balance checkout, workspace provisioning, FS27 signup/introspection, SkyeMail claim, password login, mailbox status, compose send, proof-loop inbox records, and headed SkyeNet folder-drop publish. Receipt: `test-artifacts/0s-real-user-readiness/2026-05-25T07-48-34-179Z/receipt.json`.
- Final redeploy readiness reruns prove the SkyeMail/SaaS/FS27 path green: latest fresh-user receipts show signup, claim, password login, hosted mailbox status, compose send, proof-loop inbox records, and inbox list all passing.
- Follow-up production smoke/stress passed: SkyeMail route compatibility smoke, SkyeMail live production stress p95 `457ms`, SkyeNet live production stress p95 `673ms`, SkyeNet self-service stress, SkyeMerit proof, and shared 0S auth workflows.
- Remaining proof boundary: latest headed SkyeNet folder-drop reruns are blocked by local Playwright/Chromium hangs, while the non-browser shared-auth SkyeNet publish workflow still passes and returns a live route.

## 2026-05-25 - Hosted Send Route Compatibility + Customer Copy Repair

Status: Deployed to the SkyeMail Cloudflare Worker.

Production surface:

- SkyeMail Worker: `https://skyemail-platform.graylondonskyes.workers.dev/`
- Worker version: `f4b28612-2fa4-41c5-b7ae-19eabb8d3866`

What changed:

- Wired the legacy `gmail-send` compatibility route into the same Citadel Database and SkyeNet SkyeMail `/mail-send` handler.
- Covered `/gmail-send`, `/api/gmail-send.js`, and `/.netlify/functions/skymail-standalone-gmail-send.js` so old UI/function callers no longer hit `Cloudflare SkyeMail API route not implemented: gmail-send`.
- Updated Compose to call `/mail-send` directly.
- Replaced stale customer-facing Google/Gmail onboarding copy with SkyeMail/hosted mailbox wording across dashboard, compose, sent, drafts, spam, trash, contacts, settings, and shared mailbox scripts.

Proof:

- Unauthenticated live route probes now return `401 Unauthorized` instead of route-not-implemented for all `gmail-send` compatibility shapes.
- Authenticated live route probes now return `400 Valid recipient email required.` for `/gmail-send`, `/api/gmail-send.js`, `/.netlify/functions/skymail-standalone-gmail-send.js`, and `/mail-send`, proving the routes reach the send handler.
- `npm run smoke:cloudflare-route-compat` passed against production with the new `gmail-send` checks.
- `npm run stress:live-production` passed 8 baseline checks and 32 stress reads, p95 `146ms`, max `267ms`.
- Root `npm run 0s:auth-workflows` passed 13 live authenticated checks after this deploy. Latest SkyeNet audit URL: `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/skyenet/audit/auth-audit-2026-05-25t07-03-50-959z/`.

## 2026-05-25 - Shared 0S Gate Session Import Fixed

Status: Deployed to the SkyeMail Cloudflare Worker.

Production surface:

- SkyeMail Worker: `https://skyemail-platform.graylondonskyes.workers.dev/`
- Worker version: `f8d039bf-fc73-4e8a-9b00-674c1c8d6c05`
- Shared gate import route: `https://skyemail-platform.graylondonskyes.workers.dev/auth-fs27-session`

What changed:

- Added the `SKYGATEFS27_WORKER` Cloudflare service binding so SkyeMail validates SkyeGate FS27 tokens through Worker-to-Worker binding instead of a blocked `workers.dev` subrequest.
- Fixed the owner/admin FS27 token import path where `username: fs27-admin` and admin scopes arrived without an email claim.
- Set the production owner fallback email to `grayskyes@solenterprises.org` for admin scoped gate imports.
- Hardened `/gate-diagnostics` so it requires a bearer token before reporting binding/path health.

Proof:

- Exact live flow passed: 0S owner login issued the FS27 gate bearer, SkyeMail `/auth-fs27-session` returned `200` with `auth_provider: "skygatefs27"`, and `/mail-status` accepted the issued SkyeMail token.
- `npm run smoke:cloudflare-route-compat` passed against production.
- `npm run stress:live-production` passed 8 baseline checks and 32 stress reads, p95 `90ms`, max `605ms`.
- Root `npm run 0s:auth-workflows` passed 13 live authenticated checks, including SkyeNet live publish and SkyeMail gate-session import. Receipt: `test-artifacts/0s-auth-workflows/auth-workflows-latest.json`.

## 2026-05-25 - Cloudflare Route Compatibility + Admin Recovery Repair

Status: Deployed to the SkyeMail Cloudflare Worker.

Production surface:

- SkyeMail Worker: `https://skyemail-platform.graylondonskyes.workers.dev/`
- Worker version: `f24e8f2e-9380-4e0e-be6b-f92729a0cad6`
- Admin recovery public key: `https://skyemail-platform.graylondonskyes.workers.dev/admin-public-key`

What changed:

- Fixed the Cloudflare Worker function dispatcher so Netlify-style `.js` function paths are normalized before dispatch.
- Restored route compatibility for `/.netlify/functions/skymail-standalone-auth-signup.js`, `/.netlify/functions/auth-signup.js`, `/api/auth-signup.js`, and `/api/skymail-standalone-auth-signup.js`.
- Enabled the admin recovery public-key lane by pushing `ADMIN_RECOVERY_PUBLIC_KEY_PEM` and `ADMIN_RECOVERY_PRIVATE_KEY_PEM` as Cloudflare Worker secrets without committing or printing private key material.
- Added a dedicated regression smoke: `npm run smoke:cloudflare-route-compat`.

Proof:

- Route compatibility smoke passed against production with admin recovery enabled and all `.js` signup routes returning the expected `400` validation response instead of `route not implemented`.
- Existing local SkyeMail smokes passed: `npm run smoke:standalone-proof` and `npm run smoke:proof`.
- Enterprise stress passed 500 local runtime contract assertions.
- Live production stress passed 8 baseline HTTP checks and 32 stress reads with provider status reporting `zohoApiReady`, `zohoOrgReady`, and `zohoProvisioningReady`.
- Receipts: `test-artifacts/skyemail-cloudflare-route-compat-latest.json` and `test-artifacts/skyemail-live-production-stress-latest.json`.

## 2026-05-24 - Enterprise Inbox Upgrade + Live Stress Receipt

Status: Deployed to the SkyeMail Cloudflare Worker.

Production surface:

- SkyeMail Worker: `https://skyemail-platform.graylondonskyes.workers.dev/`
- Worker version: `4e761bf8-fcec-4fc0-bef9-b48337a8aac7`
- Live proof page: `https://skyemail-platform.graylondonskyes.workers.dev/live-proof`
- Public provider status: `https://skyemail-platform.graylondonskyes.workers.dev/.netlify/functions/mailbox-domains`

What changed:

- Added hosted-mail reply support through the same `/mail-send` lane used by compose, so thread replies no longer call the stale Gmail-only route.
- Added `/mail-sync` to import new Citadel inbox deltas into the SkyeMail message store before mailbox reads.
- Added scheduled Cloudflare cron sync every 15 minutes for hosted-mail inbox freshness.
- Added Gmail-compatible mutation routes for label updates, trash, batch delete, and attachment lookups so imported inbox UI controls stop falling through broken script paths.
- Preserved CC, BCC, HTML body, sender alias, reply/thread IDs, and attachment metadata across the hosted send lane, the provider send lane, and FS27/Citadel backup receipts.
- Added enterprise stress tooling for the SkyeMail Worker and a live production HTTP stress receipt.

Production truth:

- SkyeMail is live as a Citadel Database and SkyeNet mail product lane with sovereign send/read proof, reply routing, inbox sync import, and notification-ready unread status.
- SkyDocxMax is not yet mounted as the full rich-text email editor. The current upgrade preserves HTML payloads and attachment metadata so the editor bridge has a clean target next.
- SkyeMail is the customer-facing product name. SkyeMail production mail remains an internal hosted-mail provider behind SkyeMail.

Proof:

- Local enterprise stress passed 500 runtime contract assertions and verified asset packaging.
- Live production stress passed 8 baseline HTTP checks and 32 stress reads with provider status reporting `zohoApiReady`, `zohoOrgReady`, and `zohoProvisioningReady`.
- Live production stress receipt: `test-artifacts/skyemail-live-production-stress-latest.json`
- Local smokes passed: `npm run smoke:standalone-proof`, `npm run smoke:proof`, and `npm run smoke:zoho-provider`.

## 2026-05-24 - Founder Contact Surface Corrected

Status: Deployed to the SkyeMail Cloudflare Worker.

Production surface:

- Founder page: `https://skyemail-platform.graylondonskyes.workers.dev/founder`
- Worker version: latest SkyeMail production deployment receipt from this release.

What changed:

- Corrected the public founder identity from the old legal-name display to `Gray Skyes`.
- Updated the founder/contact routing to use the current public lanes: `grayskyes@solenterprises.org`, `skyemail@solenterprises.org`, `metraiyux-0s@solenterprises.org`, and `MediaOverLondon@solenterprises.org`.
- Replaced the old direct contact strip with the current direct and company-main numbers from the public business-card/media surfaces.
- Added a compact current-lanes block covering SkyeMail, SkyeNet, Citadel Database Edge, SkyePay + SkyeGate FS27, Media Over London, Valley Verified, and SkyeMusicNexus.
- Updated the shared SkyeMail in-app contact footer so operator contact panels no longer show the stale contact set.

Proof:

- Live HTTP smoke on `/founder` returned `200`, `server: cloudflare`, and `content-type: text/html`.
- Live response contains `Gray Skyes`, the updated emails, `SkyeNet`, and `Citadel Database Edge`.
- Live response no longer contains the stale identity string, stale SkyesOverLondon/B2B email set, or the old direct phone number.

## 2026-05-24 - SkyeMail production mail Inbox Send/Read Proof Deployed

Status: Deployed to the SkyeMail Cloudflare Worker.

Production surface:

- SkyeMail Worker: `https://skyemail-platform.graylondonskyes.workers.dev/`
- Worker version: `abad47ce-89e9-4153-98fd-15eefcc833af`
- Live proof page: `https://skyemail-platform.graylondonskyes.workers.dev/live-proof`
- Sanitized proof receipt: `https://skyemail-platform.graylondonskyes.workers.dev/proof/live-email-proof.json`

What changed:

- Rebuilt the live email proof runner so it follows the active provider instead of assuming the old Resend-only proof lane.
- Added SkyeMail production mail send/read proof mode: token refresh, provider account/default-from discovery, live provider sends, provider sent visibility, inbox search, and inbox readback.
- Made proof generation fail closed when inbox import/readback does not pass.
- Updated the public live-proof page and browser-side proof renderer to show Citadel Database and SkyeNet inbox visibility without exposing OAuth tokens, private keys, or mailbox secrets.
- Updated the Cloudflare asset build so the public proof JSON, proof video, and proof screenshot are actually included in deployed Worker assets.

Production truth:

- The live proof run `codex-20260524-zoho-live-final` passed with `provider: "zoho"`, `proof_mode: "zoho-provider-send-and-inbox-read"`, and both proof messages marked `imported_to_inbox: true`, `provider_inbox_visible: true`, and `provider_sent_visible: true`.
- `/.netlify/functions/mailbox-domains` reports `provider: "zoho"`, `zohoReady: true`, `zohoApiReady: true`, `zohoOrgReady: true`, and `zohoProvisioningReady: true`.
- SkyeMail remains the public product name. SkyeMail production mail is an internal provider implementation behind SkyeMail.

Proof:

- Live proof receipt: `metraiyux_0s_site/live/SkyeMail/proof/live-email-proof.json`
- Run archive: `metraiyux_0s_site/live/SkyeMail/proof/live-email-runs/codex-20260524-zoho-live-final.json`
- Local smokes passed: `npm run smoke:standalone-proof`, `npm run smoke:proof`, and `npm run smoke:zoho-provider`.

## 2026-05-22 - Citadel Database and SkyeNet Mail Lane + Shared 0S Gate Bridge

Status: Deployed to the SkyeMail Cloudflare Worker.

Production surface:

- SkyeMail Worker: `https://skyemail-platform.graylondonskyes.workers.dev/`
- Worker version: `a8fdb047-e9dc-4e05-a144-c2c86b58d5a6`
- Provider status endpoint: `/.netlify/functions/mailbox-domains`

What changed:

- Added `MAILBOX_PROVIDER=zoho` as an additive hosted-mailbox lane.
- Kept the existing Stalwart, external-webhook, Resend, Gmail-compatible, and local lanes in source for later scale-up.
- Added SkyeMail production mail OAuth token exchange, mailbox provisioning, send-mail, folder listing, message listing, message get, and thread bridge helpers.
- Added root `.env` alias support for SkyeMail production mail's pasted labels: `Client_ID`, `Client_Secret`, and `Refresh_Token_ID`.
- Pushed the normalized SkyeMail production mail secret names into Cloudflare Worker secrets without printing secret values.
- Added the missing shared `/assets/js/0s-gate-card-bridge.js` asset so SkyeMail login pages use the same 0S/FS27/Free99 gate session bridge instead of a separate app password lane.

Production truth:

- Live status now reports `provider: "zoho"` and `zohoApiReady: true`.
- SkyeMail production mail OAuth token refresh succeeds from the root env values after parser hardening.
- SkyeMail production mail Mail resource calls are not yet passing: `/api/accounts` and `/api/organization` return SkyeMail production mail `404 Invalid Input`, so `zohoReady` and `provider_configured.configured` remain false until the SkyeMail production mail Mail organization/account API context is fixed.
- `ZOHO_ORG_ID`, `ZOHO_ACCOUNT_ID`, and `ZOHO_DEFAULT_FROM` are still not present in the root env or Worker secrets.

Proof:

- SkyeMail production mail smoke receipt: `test-artifacts/skyemail-zoho-provider-smoke/zoho-provider-smoke.json`
- Live headed browser receipt: `test-artifacts/live-browser-verifier/2026-05-22T09-11-16-556Z-skyemail-zoho-closure-headed/live-headed-browser-report.json`
- The headed receipt did not fully pass because the proof runner recorded a mobile navigation failure and one generic 404 console error. Desktop SkyeMail, desktop shared 0S gate redirect, mobile SkyeMail production mail status, and screenshots were captured.
- Local smokes passed: `npm run smoke:standalone-proof` and `npm run smoke:proof`.

## 2026-05-16 - FS27 Gate Card Onboarding + Proof Loop

Status: Live on Cloudflare Workers.

Public surfaces:

- SkyeMail: `https://skyemail-platform.graylondonskyes.workers.dev/`
- Changelog: `https://skyemail-platform.graylondonskyes.workers.dev/changelog`
- Pricing: `https://skyemail-platform.graylondonskyes.workers.dev/pricing`

What changed:

- Added SkyeGate FS27-first onboarding from the SkyeMail homepage.
- Added a Gate card page in SkyeGate FS27 that generates a Skye ID number and SkyeMail mailbox claim.
- Added SkyeMail return bridge for 0S/SkyeGate session/card/mailbox claims.
- Added SkyeMail ID, workspace ID, FS27 customer, and FS27 gate card linkage.
- Added mailbox provisioning records, primary alias records, and same-inbox alias foundation.
- Added the Citadel Database and SkyeNet SkyeMail app inbox route so the platform can send, receive, and prove mail without requiring a separate mailbox server first.
- Added browser proof loop that creates a sent record and a received inbox record under the FS27-backed workspace.
- Added Cloudflare Worker compatibility routes for mailbox labels and runtime board reads so the live inbox boots without noisy 404s.
- Updated public packaging so private proof folders are not copied into production assets.

Latest verified proof:

- Result: passed
- Failed live responses during proof: 0
- Proof JSON: `proof/e2e-current/skyemail-fs27-current-e2e-proof.json`
- Proof video: `proof/e2e-current/skyemail-fs27-current-e2e-proof.webm`
- Verified mailbox: `skyemail-e2e-mp8y271m@solenterprises.org`
- Verified alias-to-same-inbox route: `contact-skyemail-e2e-mp8y271m@solenterprises.org`

Known production truth:

- The FS27 auth, gate card handoff, SkyeMail session, mailbox record, alias route, inbox, sent record, and received record are live.
- Citadel Database and SkyeNet SkyeMail inbox routing is active. Stalwart is optional later if you want traditional mailbox-server features such as IMAP/SMTP/JMAP accounts and mailbox-server credentials.
- Pricing is public and charge-ready, but billing is not active yet. Launch access is free.

## 2026-05-16 - Planning Baseline

Status: Documented.

What changed:

- Added the SkyeMail x SkyeGate FS27 ultimate plan.
- Documented the database, auth, mailbox, alias, and inbound routing upgrades required for Google Business-style email workspace parity.
- Documented admin/password env locations without exposing values.
