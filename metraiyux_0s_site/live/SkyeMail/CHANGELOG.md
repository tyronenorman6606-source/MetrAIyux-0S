# SkyeMail Public Changelog

## 2026-05-27 - SkyeMail Brain, FS27 Metering, And Send + Monitor

Status: Built with non-browser verification. Browser verification remains owner-handled.

What changed:

- Added a real authenticated `/mail-brain` runtime with local brain, FS27 metered mode, AI entitlement checks, usage events, and reply monitors.
- Added `/mail-brain-plans`, `/mail-brain-checkout`, and `/mail-brain-claim` so paid mailbox AI plans can create and claim SkyPay entitlements through the shared FS27/SkyGate lane.
- Added SkyeMail Brain UI controls for model mode, FS27 Brain model selection, paid plan checkout, explicit Send + Monitor, and reply monitor history.
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
- Added the Founder Command Core Apps mobile dock for SkyeMail, FS27/SkyGate, SkyePay, SkyeNet, business card generators, Client App Factory, Valley CRM, and editable owner shortcuts.
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

- Fixed the pre-provisioned account claim path. SaaS workspace provisioning can create a SkyeMail identity first, and the same user can now claim it through the shared FS27/SkyGate bearer during SkyeMail signup.
- Claiming a pre-provisioned identity now upgrades the placeholder service login into a real password login, links the FS27 identity, and writes the active vault key without opening an email-only hijack path.
- Added a hosted-mailbox capacity fallback so a provider-capacity block activates the SkyeMail local inbox route instead of dead-ending account setup.
- Added the root production readiness audit command: `npm run 0s:real-user-readiness`.

Proof:

- First full fresh-user production readiness passed 17 checks with zero failures before the final redeploy: SaaS signup, `GRAYSCAPE467` zero-balance checkout, workspace provisioning, FS27 signup/introspection, SkyeMail claim, password login, mailbox status, compose send, proof-loop inbox records, and headed SkyeNet folder-drop publish. Receipt: `test-artifacts/0s-real-user-readiness/2026-05-25T07-48-34-179Z/receipt.json`.
- Final redeploy readiness reruns prove the SkyeMail/SaaS/FS27 path green: latest fresh-user receipts show signup, claim, password login, hosted mailbox status, compose send, proof-loop inbox records, and inbox list all passing.
- Follow-up production smoke/stress passed: SkyeMail route compatibility smoke, SkyeMail live production stress p95 `457ms`, SkyeNet live production stress p95 `673ms`, SkyeNet self-service stress, SkyeMerit proof, and shared 0S auth workflows.
- Remaining proof boundary: latest headed SkyeNet folder-drop reruns are blocked by local Playwright/Chromium hangs, while the non-browser shared-auth SkyeNet publish workflow still passes and returns a live route.

## 2026-05-25 - Hosted Send Route Compatibility + Customer Copy Repair

Status: Deployed to the SkyeMail Cloudflare Worker.

Production surface:

- SkyeMail Worker: `https://skyemail-platform.graylondonskyes.workers.dev/`
- Worker version: `f4b28612-2fa4-41c5-b7ae-19eabb8d3866`

What changed:

- Wired the legacy `gmail-send` compatibility route into the same Citadel/SkyeNet SkyeMail `/mail-send` handler.
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

- Added the `SKYGATEFS27_WORKER` Cloudflare service binding so SkyeMail validates FS27/SkyGate tokens through Worker-to-Worker binding instead of a blocked `workers.dev` subrequest.
- Fixed the owner/admin FS27 token import path where `username: fs27-admin` and admin scopes arrived without an email claim.
- Set the production owner fallback email to `grayskyes@solenterprises.org` for admin scoped gate imports.
- Hardened `/gate-diagnostics` so it requires a bearer token before reporting binding/path health.

Proof:

- Exact live flow passed: 0S owner login issued the FS27 gate bearer, SkyeMail `/auth-fs27-session` returned `200` with `auth_provider: "skygatefs27"`, and `/mail-status` accepted the issued SkyeMail token.
- `npm run smoke:cloudflare-route-compat` passed against production.
- `npm run stress:live-production` passed 8 baseline checks and 32 stress reads, p95 `90ms`, max `605ms`.
- Root `npm run 0s:auth-workflows` passed 13 live authenticated checks, including SkyeNet live publish and SkyEmail gate-session import. Receipt: `test-artifacts/0s-auth-workflows/auth-workflows-latest.json`.

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

- SkyeMail is live as a Citadel/SkyeNet mail product lane with sovereign send/read proof, reply routing, inbox sync import, and notification-ready unread status.
- SkyDocxMax is not yet mounted as the full rich-text email editor. The current upgrade preserves HTML payloads and attachment metadata so the editor bridge has a clean target next.
- SkyeMail is the customer-facing product name. Zoho remains an internal hosted-mail provider behind SkyeMail.

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
- Added a compact current-lanes block covering SkyEmail/SkyeMail, SkyeNet, CitadelDB Edge, SkyePay + FS27, Media Over London, Valley Verified, and SkyeMusicNexus.
- Updated the shared SkyeMail in-app contact footer so operator contact panels no longer show the stale contact set.

Proof:

- Live HTTP smoke on `/founder` returned `200`, `server: cloudflare`, and `content-type: text/html`.
- Live response contains `Gray Skyes`, the updated emails, `SkyeNet`, and `CitadelDB Edge`.
- Live response no longer contains the stale identity string, stale SkyesOverLondon/B2B email set, or the old direct phone number.

## 2026-05-24 - Zoho Inbox Send/Read Proof Deployed

Status: Deployed to the SkyeMail Cloudflare Worker.

Production surface:

- SkyeMail Worker: `https://skyemail-platform.graylondonskyes.workers.dev/`
- Worker version: `abad47ce-89e9-4153-98fd-15eefcc833af`
- Live proof page: `https://skyemail-platform.graylondonskyes.workers.dev/live-proof`
- Sanitized proof receipt: `https://skyemail-platform.graylondonskyes.workers.dev/proof/live-email-proof.json`

What changed:

- Rebuilt the live email proof runner so it follows the active provider instead of assuming the old Resend-only proof lane.
- Added Zoho send/read proof mode: token refresh, provider account/default-from discovery, live provider sends, provider sent visibility, inbox search, and inbox readback.
- Made proof generation fail closed when inbox import/readback does not pass.
- Updated the public live-proof page and browser-side proof renderer to show Citadel/SkyeNet inbox visibility without exposing OAuth tokens, private keys, or mailbox secrets.
- Updated the Cloudflare asset build so the public proof JSON, proof video, and proof screenshot are actually included in deployed Worker assets.

Production truth:

- The live proof run `codex-20260524-zoho-live-final` passed with `provider: "zoho"`, `proof_mode: "zoho-provider-send-and-inbox-read"`, and both proof messages marked `imported_to_inbox: true`, `provider_inbox_visible: true`, and `provider_sent_visible: true`.
- `/.netlify/functions/mailbox-domains` reports `provider: "zoho"`, `zohoReady: true`, `zohoApiReady: true`, `zohoOrgReady: true`, and `zohoProvisioningReady: true`.
- SkyeMail remains the public product name. Zoho is an internal provider implementation behind SkyeMail.

Proof:

- Live proof receipt: `metraiyux_0s_site/live/SkyeMail/proof/live-email-proof.json`
- Run archive: `metraiyux_0s_site/live/SkyeMail/proof/live-email-runs/codex-20260524-zoho-live-final.json`
- Local smokes passed: `npm run smoke:standalone-proof`, `npm run smoke:proof`, and `npm run smoke:zoho-provider`.

## 2026-05-22 - Citadel/SkyeNet Mail Lane + Shared 0S Gate Bridge

Status: Deployed to the SkyeMail Cloudflare Worker.

Production surface:

- SkyeMail Worker: `https://skyemail-platform.graylondonskyes.workers.dev/`
- Worker version: `a8fdb047-e9dc-4e05-a144-c2c86b58d5a6`
- Provider status endpoint: `/.netlify/functions/mailbox-domains`

What changed:

- Added `MAILBOX_PROVIDER=zoho` as an additive hosted-mailbox lane.
- Kept the existing Stalwart, external-webhook, Resend, Gmail-compatible, and local lanes in source for later scale-up.
- Added Zoho OAuth token exchange, mailbox provisioning, send-mail, folder listing, message listing, message get, and thread bridge helpers.
- Added root `.env` alias support for Zoho's pasted labels: `Client_ID`, `Client_Secret`, and `Refresh_Token_ID`.
- Pushed the normalized Zoho secret names into Cloudflare Worker secrets without printing secret values.
- Added the missing shared `/assets/js/0s-gate-card-bridge.js` asset so SkyeMail login pages use the same 0S/FS27/Free99 gate session bridge instead of a separate app password lane.

Production truth:

- Live status now reports `provider: "zoho"` and `zohoApiReady: true`.
- Zoho OAuth token refresh succeeds from the root env values after parser hardening.
- Zoho Mail resource calls are not yet passing: `/api/accounts` and `/api/organization` return Zoho `404 Invalid Input`, so `zohoReady` and `provider_configured.configured` remain false until the Zoho Mail organization/account API context is fixed.
- `ZOHO_ORG_ID`, `ZOHO_ACCOUNT_ID`, and `ZOHO_DEFAULT_FROM` are still not present in the root env or Worker secrets.

Proof:

- Zoho smoke receipt: `test-artifacts/skyemail-zoho-provider-smoke/zoho-provider-smoke.json`
- Live headed browser receipt: `test-artifacts/live-browser-verifier/2026-05-22T09-11-16-556Z-skyemail-zoho-closure-headed/live-headed-browser-report.json`
- The headed receipt did not fully pass because the proof runner recorded a mobile navigation failure and one generic 404 console error. Desktop SkyeMail, desktop shared 0S gate redirect, mobile Zoho status, and screenshots were captured.
- Local smokes passed: `npm run smoke:standalone-proof` and `npm run smoke:proof`.

## 2026-05-16 - FS27 Gate Card Onboarding + Proof Loop

Status: Live on Cloudflare Workers.

Public surfaces:

- SkyeMail: `https://skyemail-platform.graylondonskyes.workers.dev/`
- Changelog: `https://skyemail-platform.graylondonskyes.workers.dev/changelog`
- Pricing: `https://skyemail-platform.graylondonskyes.workers.dev/pricing`

What changed:

- Added SkyGate FS27-first onboarding from the SkyeMail homepage.
- Added a Gate card page in SkyGate FS27 that generates a Skye ID number and SkyeMail mailbox claim.
- Added SkyeMail return bridge for 0S/SkyGate session/card/mailbox claims.
- Added SkyeMail ID, workspace ID, FS27 customer, and FS27 gate card linkage.
- Added mailbox provisioning records, primary alias records, and same-inbox alias foundation.
- Added the Citadel/SkyeNet SkyeMail app inbox route so the platform can send, receive, and prove mail without requiring a separate mailbox server first.
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
- Citadel/SkyeNet SkyeMail inbox routing is active. Stalwart is optional later if you want traditional mailbox-server features such as IMAP/SMTP/JMAP accounts and mailbox-server credentials.
- Pricing is public and charge-ready, but billing is not active yet. Launch access is free.

## 2026-05-16 - Planning Baseline

Status: Documented.

What changed:

- Added the SkyeMail x SkyGate FS27 ultimate plan.
- Documented the database, auth, mailbox, alias, and inbound routing upgrades required for Google Business-style email workspace parity.
- Documented admin/password env locations without exposing values.
