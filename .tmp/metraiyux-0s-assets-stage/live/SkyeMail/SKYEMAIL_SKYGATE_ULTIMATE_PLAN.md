# SkyeMail x Skyegate FS27 Ultimate Plan

Date: 2026-05-16

## Target

Make SkyeMail provision workspaces from Skyegate FS27 instead of acting like a separate signup island.

The final flow:

1. User signs up or authenticates at Skyegate FS27.
2. FS27 creates a basic gate identity and card, even if the user has no paid usage yet.
3. FS27 hands SkyeMail an active token/card claim.
4. SkyeMail creates or finds the workspace user, generates a SkyeMail ID, generates the primary SkyeMail address, provisions the mailbox, and records the FS27 card/customer/session linkage.
5. User lands in SkyeMail already tied to the same FS27 identity, billing/customer context, AI tracking context, mailbox, aliases, and admin audit trail.
6. One mailbox can own many routed addresses. Example: `joe@skyemail-domain` and `contactjoe@joescustomdomain` both deliver to one inbox, and each inbound message records the exact recipient alias used.
7. Public product pages show the release record and pricing truth so users can see what changed, what is free, and what is charge-ready before billing turns on.

## What Exists Now

SkyeMail already has:

- 0S/SkyGate session intake: `netlify/functions/auth-fs27-session.js`
- FS27 introspection and event mirroring: `netlify/functions/_skygate.js`
- Hosted mailbox provisioning: `netlify/functions/mailbox-provision.js`
- Provider bridge for Stalwart or external webhooks: `netlify/functions/_mailbox-provider.js`
- Neon/Postgres schema: `sql/schema.sql`
- SkyeMail generator upgrade assets: `Upgrades/SKYEMAIL-GEN.zip`
- Skye ID generator upgrade assets: `Upgrades/Skye-ID.zip`

The gap:

- Normal signup still creates a standalone SkyeMail user.
- 0S/SkyGate session intake creates a user, but it does not fully persist the gate card, SkyeMail ID, workspace ID, or mailbox birth record.
- Mailbox routing guesses by local handle for inbound messages.
- There is no first-class alias table, so one mailbox cannot safely own multiple recipient addresses with uniqueness and proof of which alias received the message.

## Password And Admin Env Line Inventory

Values are intentionally redacted. Change the values in these places, not in this document.

- `.env:336` `AUTONOMOUS_AE_PLATFORM_PASSWORD`
- `.env:358` `PHC_OPERATOR_PASSWORD`
- `.env:359` `PHC_OPERATOR_PASSWORD_HASH`
- `.env:360` `PHC_OPERATOR_PASSWORD_SALT`
- `.env:376` `SMTP_PASS`
- `.env:383` `QA_ADMIN_PASSWORD`
- `.env:389` `PLATFORM_SCREENSHOT_EMAIL`
- `.env:390` `PLATFORM_SCREENSHOT_PASSWORD`
- `.env:412` `ADMIN_EMAILS`
- `.env:413` `ADMIN_PASSWORD`
- `.env:551` `SKYGATEFS13_ADMIN_PASSWORD`
- `.env:634` `SKYGATEFS13_ADMIN_PASSWORD`
- `.env:721` `METRAIYUX_0S_SKYGATE_ADMIN_EMAILS`
- `.env:796` `SKYGATE_EVENT_MIRROR_SECRET`
- `.env:817` `SKYGATEFS27_ORIGIN`
- `.env:819` `SKYGATEFS27_EVENT_MIRROR_SECRET`
- `.env:820` `SKYEGATE_INTROSPECT_URL`
- `.env:821` `SKYEGATE_AUD`
- `SkyeGateFS27/env.template:967` `ADMIN_PASSWORD`
- `SkyeGateFS27/env.template:1002` `SKYGATE_EVENT_MIRROR_SECRET`
- `SkyeGateFS27/env.template:1041` `ADMIN_EMAIL`
- `SkyeGateFS27/env.ultimate.template:1154` `ADMIN_PASSWORD`
- `SkyeGateFS27/env.ultimate.template:1165` `SKYGATE_EVENT_MIRROR_SECRET`
- `SkyeGateFS27/env.ultimate.template:1169` `ADMIN_EMAIL`
- `SkyeGateFS27/env.ultimate.template:1331` `SMTP_PASS`
- `SkyeGateFS27/env.ultimate.template:1386` `SKYGATEFS27_ORIGIN`
- `SkyeGateFS27/env.ultimate.template:1394` `SKYGATEFS27_EVENT_MIRROR_SECRET`
- `SkyeGateFS27/env.ultimate.template:1428` `SKYEMAIL_FROM`
- `SkyeGateFS27/env.ultimate.template:1429` `SKYEMAIL_WEBHOOK_SECRET`
- `metraiyux_0s_site/live/SkyeMail/.env.template:1444` `SKYGATEFS27_ORIGIN`
- `metraiyux_0s_site/live/SkyeMail/.env.template:1445` `SKYGATE_EVENT_MIRROR_SECRET`
- `metraiyux_0s_site/live/SkyeMail/.env.template:1448` `SKYMAIL_SERVICE_TOKEN`
- `metraiyux_0s_site/live/SkyeMail/.env.template:1486` `SKYMAIL_PRIMARY_DOMAIN`
- `metraiyux_0s_site/live/SkyeMail/.env.template:1499` `MAILBOX_PROVISION_WEBHOOK_URL`
- `metraiyux_0s_site/live/SkyeMail/.env.template:1500` `MAILBOX_PROVISION_WEBHOOK_SECRET`

## Database Upgrades

Add:

- `users.skymail_id`
- `users.workspace_id`
- `users.fs27_sub`
- `users.fs27_customer_id`
- `users.fs27_gate_card_id`
- `users.fs27_card_json`
- `hosted_mailboxes.workspace_id`
- `hosted_mailboxes.skymail_id`
- `hosted_mailboxes.fs27_gate_card_id`
- `messages.recipient_alias`
- `messages.delivered_to`
- `mailbox_aliases`

Required uniqueness:

- `lower(users.handle)`
- `lower(users.email)`
- `lower(users.skymail_id)`
- `lower(users.fs27_sub)` when present
- `lower(hosted_mailboxes.mailbox_email)`
- `lower(mailbox_aliases.alias_email)`

## Backend Upgrades

1. Add a SkyeMail identity helper.
2. Make FS27 session intake persist SkyeMail ID, workspace ID, customer ID, and gate card information.
3. Make mailbox provisioning create the primary alias record.
4. Add a mailbox alias endpoint for creating and listing aliases on the same inbox.
5. Route inbound email by alias first, hosted mailbox second, handle fallback last.
6. Store `recipient_alias` and `delivered_to` on every inbound message.
7. Mirror all important provisioning events back to FS27.

## Public Changelog And Pricing Discipline

SkyeMail should not ship major platform behavior without a public record.

Public pages:

- `/changelog`: shipped changes, proof status, known production limitations, and billing impact.
- `/pricing`: current free launch policy plus future charge-ready tiers.
- `/live-proof`: browser-visible proof that the platform path works.

Current pricing truth:

- Launch access is free.
- Paid checkout is not active yet.
- Future paid plan state should come from SkyGate FS27, not a separate SkyeMail billing island.
- FS27 should remain the source of truth for customer ID, gate card, billing state, reloads, usage, and AI metering.

Billing-ready tier structure:

- Free Launch: one FS27-backed SkyeMail workspace, one primary mailbox claim, local proof route, proof loop.
- Starter: one production mailbox, basic aliases, provider send/receive routing, delivery proof.
- Business: custom domains, more aliases, admin dashboard, FS27 billing and AI usage tracking.
- Operator: multiple workspaces, priority provisioning, advanced proof, monitoring, and recovery lanes.

Billing rule:

- Billing state should pause upgrades, sending, aliases, or AI usage before it ever risks existing mailbox records.

## Signup And Mailbox Creation

Direct SkyeMail signup should remain possible for local recovery/admin cases, but the serious production path is FS27-first:

1. FS27 `/auth-signup` creates the user/customer/session.
2. FS27 `/auth-card` exposes the gate identity/card.
3. SkyeMail `/auth-fs27-session` introspects the inherited 0S/SkyGate session.
4. SkyeMail creates the workspace identity and session.
5. SkyeMail `/mailbox-provision` creates the mailbox and primary alias.
6. SkyeMail `/mailbox-aliases` creates additional same-inbox aliases.

## Mailbox Creation

Minimum production call:

```http
POST /.netlify/functions/mailbox-provision
Authorization: Bearer <skymail-session-token>
Content-Type: application/json

{
  "local_part": "joe",
  "domain": "skyemail-domain.com"
}
```

Alias call:

```http
POST /.netlify/functions/mailbox-aliases
Authorization: Bearer <skymail-session-token>
Content-Type: application/json

{
  "alias_email": "contactjoe@joescustomdomain.com",
  "display_name": "Joe Custom Domain"
}
```

## Acceptance Tests

- Duplicate FS27 email returns existing SkyeMail user instead of creating a duplicate.
- Duplicate username/handle is rejected or made unique deterministically.
- Duplicate mailbox email is rejected unless it belongs to the same user.
- Duplicate alias email is rejected globally.
- 0S/SkyGate session creates SkyeMail session.
- 0S/SkyGate session response includes SkyeMail ID, workspace ID, and FS27 customer/card metadata.
- Mailbox provisioning creates a hosted mailbox and a primary alias.
- Alias provisioning creates a second route to the same inbox.
- Inbound email to the alias lands in the same inbox and records `recipient_alias`.
- Inbound payload also stores `delivered_to`.
- SkyeMail mirrors auth/provisioning events back into FS27.
- The static SkyeMail surface remains live while backend work continues.
