# SkyEmail Zoho Provider Lane

Zoho is now an additive hosted-mailbox provider for SkyEmail. It does not replace the existing Stalwart, external webhook, Resend, Gmail compatibility, or local proof lanes.

## Current Live Status

As of 2026-05-24, the deployed SkyeMail Worker uses Zoho as the active provider for the hosted-mail proof lane.

- Public Worker: `https://skyemail-platform.graylondonskyes.workers.dev/`
- Public proof: `https://skyemail-platform.graylondonskyes.workers.dev/live-proof`
- Sanitized proof JSON: `https://skyemail-platform.graylondonskyes.workers.dev/proof/live-email-proof.json`
- Latest run id: `codex-20260524-zoho-live-final`
- Proof mode: `zoho-provider-send-and-inbox-read`

The live proof sends two messages through Zoho and confirms the provider-backed inbox can read them back. Secrets, OAuth tokens, private keys, and raw mailbox credentials are not published.

## What Zoho Replaces

When `MAILBOX_PROVIDER=zoho`, SkyEmail provisions hosted mailbox accounts through Zoho Mail Admin APIs instead of requiring a self-hosted Stalwart/Mailu/Postal server on a VPS.

That means the Hetzner-style mailbox-server layer is optional for this lane. You still need:

- a Zoho Mail organization/plan that supports the domain and mailbox count you want;
- a verified/hosted domain in Zoho Mail;
- MX, SPF, DKIM, and DMARC DNS records pointed at Zoho;
- a server-side Zoho OAuth refresh token with mail and organization provisioning scopes.

## Provider Switch

Keep the other providers available and switch with env:

```bash
MAILBOX_PROVIDER=zoho
```

To return to the VPS/server path later:

```bash
MAILBOX_PROVIDER=stalwart
```

To delegate to a custom provisioner:

```bash
MAILBOX_PROVIDER=external-webhook
```

## Required Zoho Env

```bash
ZOHO_CLIENT_ID=
ZOHO_CLIENT_SECRET=
ZOHO_REFRESH_TOKEN=
ZOHO_ACCOUNTS_BASE=https://accounts.zoho.com
ZOHO_MAIL_BASE=https://mail.zoho.com
ZOHO_ORG_ID=
ZOHO_DEFAULT_FROM=support@yourdomain.com
```

Optional:

```bash
ZOHO_ACCOUNT_ID=
ZOHO_DEFAULT_FROM_NAME=SkyeEmail
```

Use the matching data center base URLs for the Zoho account, for example `.com`, `.eu`, or `.in`.

## Runtime Behavior

- `/.netlify/functions/mailbox-domains` reports `provider: "zoho"` and `provider_configured.zohoReady`.
- `/.netlify/functions/mailbox-provision` creates a Zoho organization account for the requested mailbox when Zoho env and domain setup are complete.
- `/.netlify/functions/mail-send` sends through Zoho for mailboxes whose stored provider is `zoho`.
- The existing inbox endpoints (`gmail-list`, `gmail-labels`, `gmail-get`, and `gmail-thread-get`) read from Zoho for Zoho-backed hosted mailboxes, while Gmail remains available for Gmail-backed accounts.
- If Zoho is not configured, the existing local proof and Resend fallback behavior remains available where the current app already uses it.

## OAuth Scope Notes

Use Zoho mail scopes for send/read behavior and organization scopes for provisioning. The unpacked command-center reference listed:

```text
ZohoMail.accounts.READ,ZohoMail.folders.READ,ZohoMail.messages.ALL
ZohoMail.organization.accounts.ALL,ZohoMail.organization.domains.ALL
```

Exact scope names and availability can depend on Zoho region, plan, and admin permissions.

## Scale Path

Do not delete Stalwart or the external provisioner lane. Zoho is the managed provider lane for avoiding mailbox-server hosting now. Stalwart remains the later direct-control mailbox-server lane if SkyEmail needs IMAP/JMAP/SMTP ownership, storage control, tenant isolation, or provider independence at larger scale.

## Official Setup References

- Zoho Mail hosting setup: https://www.zoho.com/mail/help/adminconsole/email-hosting-setup.html
- Zoho Mail API getting started: https://www.zoho.com/mail/help/api/getting-started-with-api.html
- Zoho Mail Domain API: https://www.zoho.com/mail/help/api/domain-api.html
