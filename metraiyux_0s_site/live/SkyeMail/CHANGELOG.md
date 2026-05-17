# SkyeMail Public Changelog

## 2026-05-16 - FS27 Gate Card Onboarding + Proof Loop

Status: Live on Cloudflare Workers.

Public surfaces:

- SkyeMail: `https://skyemail-platform.graylondonskyes.workers.dev/`
- Changelog: `https://skyemail-platform.graylondonskyes.workers.dev/changelog`
- Pricing: `https://skyemail-platform.graylondonskyes.workers.dev/pricing`

What changed:

- Added SkyGate FS27-first onboarding from the SkyeMail homepage.
- Added a Gate card page in SkyGate FS27 that generates a Skye ID number and SkyeMail mailbox claim.
- Added SkyeMail return bridge for FS27 token/card/mailbox claims.
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
