# SkyeMail Public Changelog

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
- Updated the public live-proof page and browser-side proof renderer to show provider-backed inbox visibility without exposing OAuth tokens, private keys, or mailbox secrets.
- Updated the Cloudflare asset build so the public proof JSON, proof video, and proof screenshot are actually included in deployed Worker assets.

Production truth:

- The live proof run `codex-20260524-zoho-live-final` passed with `provider: "zoho"`, `proof_mode: "zoho-provider-send-and-inbox-read"`, and both proof messages marked `imported_to_inbox: true`, `provider_inbox_visible: true`, and `provider_sent_visible: true`.
- `/.netlify/functions/mailbox-domains` reports `provider: "zoho"`, `zohoReady: true`, `zohoApiReady: true`, `zohoOrgReady: true`, and `zohoProvisioningReady: true`.
- SkyeMail remains the public product name. Zoho is an internal provider implementation behind SkyeMail.

Proof:

- Live proof receipt: `metraiyux_0s_site/live/SkyeMail/proof/live-email-proof.json`
- Run archive: `metraiyux_0s_site/live/SkyeMail/proof/live-email-runs/codex-20260524-zoho-live-final.json`
- Local smokes passed: `npm run smoke:standalone-proof`, `npm run smoke:proof`, and `npm run smoke:zoho-provider`.

## 2026-05-22 - Zoho Provider Lane + Shared 0S Gate Bridge

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
- Added the Resend-backed SkyeMail app inbox route so the platform can send, receive, and prove mail without requiring a separate mailbox server first.
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
- Resend-backed SkyeMail inbox routing is active. Stalwart is optional later if you want traditional hosted mailbox-server features such as IMAP/SMTP/JMAP accounts and mailbox-server credentials.
- Pricing is public and charge-ready, but billing is not active yet. Launch access is free.

## 2026-05-16 - Planning Baseline

Status: Documented.

What changed:

- Added the SkyeMail x SkyGate FS27 ultimate plan.
- Documented the database, auth, mailbox, alias, and inbound routing upgrades required for Google Business-style email workspace parity.
- Documented admin/password env locations without exposing values.
