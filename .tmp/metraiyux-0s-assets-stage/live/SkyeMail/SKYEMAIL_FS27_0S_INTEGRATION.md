# SkyeMail FS27 + MetrAIyux 0S Integration

Date: 2026-05-16

## Control Plane

SkyeMail now treats SkyeGateFS27 as the primary gate for platform login.

Flow:

1. Operator/client signs into the 0S/SkyGate session.
2. SkyeMail calls `auth-fs27-session`.
3. `auth-fs27-session` introspects the inherited session against the gate.
4. If active, SkyeMail finds or creates the local app user by FS27 email.
5. SkyeMail mints a short app session for existing Netlify Function compatibility.
6. SkyeMail mirrors `skymail.auth.fs27_session` into FS27 `/platform/events`.

## Mailbox Provisioning

The onboarding screen now has real backend endpoints:

- `mailbox-domains`
- `mail-status`
- `mailbox-provision`

Provisioning writes to `hosted_mailboxes` and mirrors `skymail.mailbox.provisioned` into FS27.

Provider modes:

- `MAILBOX_PROVIDER=stalwart`: calls Stalwart Management API `POST /api/principal`.
- `MAILBOX_PROVIDER=zoho`: calls Zoho Mail Admin APIs to create organization mailboxes for domains already hosted/verified in Zoho.
- `MAILBOX_PROVIDER=external-webhook`: delegates mailbox creation to `MAILBOX_PROVISION_WEBHOOK_URL`.

## 0S Event Plug

Configure:

```env
SKYGATEFS27_ORIGIN=https://skyegatefs27-citadeldb.graylondonskyes.workers.dev
SKYGATE_EVENT_MIRROR_SECRET=...
SKYGATE_SOURCE_APP=skymail
```

SkyeMail emits:

- `skymail.auth.fs27_session`
- `skymail.mailbox.provisioned`
- `skymail.mail.sent`

FS27 classifies these into the platform/mail lane, which is the same event mirror model already used by MetrAIyux 0S.

## Production Steps

1. Deploy SkyeMail on Netlify or port its Functions to Cloudflare Workers.
2. Apply `sql/schema.sql` to the production Postgres database.
3. Set all env vars from `.env.template`.
4. Configure FS27 event mirror secret to match SkyeMail.
5. Configure a real mailbox provider:
   - Stalwart with domain principals, MX, SPF, DKIM, DMARC, TLS, and Management API access, or
   - Zoho Mail with verified domain DNS, OAuth refresh token, organization ID, and account provisioning scopes, or
   - an external provisioner webhook that creates mailboxes and returns provider IDs.
6. Point domain MX records at the actual mail server or inbound provider.
7. Send a live message from Gmail to a provisioned address and verify inbox/provider receipt.

## Current Boundary

This pass gives SkyeMail the real platform control plane. It does not install or operate the mail server itself. Real receipt from Gmail still depends on DNS and the chosen provider accepting mail for the domain.
