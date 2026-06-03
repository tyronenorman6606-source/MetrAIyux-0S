# SkyeMail Deep Scan Report

Date: 2026-05-16
Location: `/workspaces/MetrAIyux-0S/metraiyux_0s_site/live/SkyeMail`

## Verdict

SkyeMail started as not ready to deploy as a full Google email replacement where you own the mail hosting, create a real mailbox, receive mail directly for your domain, and operate independently of Gmail.

This pass adds the first real platform-control layer: FS27-gated session exchange, hosted mailbox provisioning endpoints, hosted mailbox database records, and FS27/0S event mirroring. It is now a platform foundation, but it still needs a real mail provider and DNS to become live production mail.

## What Passed

- Archive unpacked cleanly into its own folder.
- `npm run smoke:standalone-proof` passed.
- `npm run smoke:proof` passed.
- All JS/MJS files under `netlify`, `assets`, `runtime`, `smoke`, `tools`, and `suite` passed `node --check`.
- `npm audit --omit=dev --json` reported 0 known vulnerabilities in the lockfile.
- Schema exists for users, keys, messages, attachments, Gmail mailbox tokens, preferences, contacts, Resend webhook events, and delivery events.
- Added `auth-fs27-session` so SkyeGate FS27 can be the primary auth gate.
- Added `mailbox-domains`, `mail-status`, and `mailbox-provision`.
- Added `hosted_mailboxes` schema.
- Added Stalwart/external-webhook mailbox provider adapter.
- Added FS27 `/platform/events` mirroring for auth/session and mailbox provisioning events.

## Hard Blockers

1. It is Netlify Functions based, not Cloudflare Pages Functions based.
   - The frontend calls `/.netlify/functions/...`.
   - `netlify.toml` sets `functions = "netlify/functions"`.
   - If this is deployed as static Cloudflare Pages only, auth/inbox/send/receive functions will 404.

2. It is primarily Gmail-backed, not self-hosted email.
   - Inbox, labels, drafts, message reads, thread reads, send, modify, trash, and delete call the Gmail API.
   - A message from Gmail will populate only after the user connects Gmail OAuth and the backend can call Gmail.
   - This does not replace Gmail as the mail provider. It wraps Gmail.

3. The hosted mailbox provisioning path now has backend endpoints, but it still requires a real provider.
   - Stalwart provisioning uses the REST Management API `POST /api/principal`.
   - External provisioning can be delegated through `MAILBOX_PROVISION_WEBHOOK_URL`.
   - Live success still depends on provider credentials, domain setup, DNS, and deliverability.

4. Real inbound email for your own domain is not complete as a standalone mailbox service.
   - Resend inbound webhook code exists and can store received messages for handles.
   - DNS/MX, Resend inbound domain setup, webhook signing, and production env are still required.
   - This is not the same as provisioning real IMAP/SMTP mailboxes for clients.

5. Local dependency install did not complete in this workspace.
   - `npm install` hung silently and was stopped.
   - The lockfile and audit are present, but Functions were not runtime-loaded with installed dependencies locally.

## Required Production Environment

The `.env.template` requires at least:

- `DATABASE_URL`
- `JWT_SECRET`
- `PUBLIC_BASE_URL`
- `SKYGATEFS27_ORIGIN`
- `SKYGATE_EVENT_MIRROR_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_TOKEN_ENCRYPTION_KEY`
- `GMAIL_PUBSUB_TOPIC_NAME`
- `GMAIL_PUBSUB_SERVICE_ACCOUNT_EMAIL`
- `RESEND_API_KEY`
- `RESEND_WEBHOOK_SECRET`
- `INBOUND_DOMAIN`
- `INBOUND_PROVIDER`
- `NOTIFY_FROM_EMAIL`

For the missing hosted mailbox provisioning path, this bundle also appears to need:

- `STALWART_BASE_URL`
- `STALWART_MANAGEMENT_API_KEY`
- `SKYMAIL_PRIMARY_DOMAIN`

Those env vars are now represented in `.env.template`, and the Functions now exist.

## What A Client Could Do After Correct Netlify Deployment

With Netlify Functions, Postgres schema applied, Google OAuth configured, and Gmail connected:

- Sign up and log in.
- Connect a Gmail mailbox.
- See Gmail messages in the SkyeMail inbox.
- Send mail through Gmail.
- Save/list Gmail drafts.
- Read Gmail threads/messages.
- Modify labels, archive, trash, delete.
- Sync contacts through Google People/Gmail APIs.
- Monitor Resend delivery/webhook events.
- Enter through FS27 and receive a SkyeMail app session after token introspection.
- Provision a hosted mailbox record through Stalwart or an external provisioner once provider env is set.
- Mirror auth and mailbox provisioning events into the FS27/0S platform event ledger.

## What A Client Cannot Reliably Do Yet

- Replace Google Workspace or Gmail as the actual mail provider.
- Provision a new hosted mailbox from the onboarding screen until Stalwart/external provider env and DNS are real.
- Receive domain email into a self-owned mailbox without provider setup.
- Deploy this on Cloudflare Pages as-is and expect backend mail features to work.
- Prove live Gmail OAuth, webhook delivery, or production mail receipt from the included smoke tests alone.

## Recommendation

Treat this bundle as a platform foundation, not a production-ready Google email replacement yet.

To make it a real replacement, choose one path:

1. Gmail-backed client path:
   Deploy to Netlify, wire Postgres, Google OAuth, Pub/Sub, and Resend. This gets the fastest working inbox experience, but Gmail remains the underlying provider.

2. Real mail-provider path:
   Add the missing hosted mailbox provisioning backend, wire a provider such as Stalwart/Mailu/Postal or a managed inbound/outbound provider, implement MX/domain onboarding, and replace Gmail-only inbox/send flows with provider-native mailbox APIs.
