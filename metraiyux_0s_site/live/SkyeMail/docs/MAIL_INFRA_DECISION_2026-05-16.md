# SkyeMail Mail Infrastructure Decision

Date: 2026-05-16

## Decision

SkyeMail should stay Citadel/SkyeNet-backed for the current app-inbox launch.

That means:

- SkyeGate FS27 issues the user session and mailbox claim.
- SkyeMail stores mailbox records, user-created aliases, messages, sent records, received records, and recipient alias proof in the SkyeMail database.
- Resend handles outbound delivery and inbound webhook delivery.
- Custom aliases are created only by the signed-in user from the Settings alias form.

Stalwart should be treated as an optional later mailbox-server layer, not a blocker for the current product.

## Why Resend Is Enough Now

Resend already covers the current product shape:

- sending
- receiving
- webhooks
- verified domains
- app-level inbox records
- proof loops
- simple launch pricing

SkyeMail is currently behaving like an app inbox, not a traditional IMAP mailbox host. For that, Resend plus the SkyeMail database is a valid MVP architecture.

## What Stalwart Adds

Stalwart becomes useful when SkyeMail needs to sell or operate traditional mailbox-server features:

- IMAP
- SMTP submission
- JMAP
- POP3
- CalDAV/CardDAV/WebDAV
- mailbox-server credentials
- server-hosted mailbox storage
- multi-tenant hosted email administration

That is closer to Google Workspace / business email infrastructure. It is more real infra, but it also means we operate mail-server infrastructure, DNS, storage, abuse controls, backups, deliverability, uptime, and support.

## Current Pricing Notes

Stalwart Enterprise pricing is per mailbox per year. The public pricing page lists USD 2.40 per mailbox per year for 25-499 mailboxes, with lower per-mailbox rates at higher tiers. Stalwart says aliases, domains, tenants, and mailing lists are included and not billed separately. Premium support starts at 150 mailboxes.

Resend pricing is usage-based email API pricing. The public pricing page lists Free at 3,000 emails/month with 100/day, Pro at $20/month for 50,000 emails, Scale at $90/month for 100,000 emails, and $0.90 per extra 1,000 emails on paid plans.

Amazon SES is cheaper raw transport: $0.10 per 1,000 outbound emails and $0.10 per 1,000 inbound emails, with extra charges for data, chunks, deliverability tools, dedicated IPs, and Mail Manager.

Mailgun is a close Resend-style alternative with API, SMTP, webhooks, and inbound routing. Public pricing lists a free plan at 100 emails/day, Basic at $15/month for 10,000 emails, Foundation at $35/month for 50,000, and Scale at $90/month for 100,000.

## Recommended Path

1. Keep current SkyeMail live on the Citadel/SkyeNet app inbox.
2. Make user-created aliases the only path for custom aliases.
3. Add a provider abstraction so outbound/inbound transport can be Resend, SES, or Mailgun without rewriting SkyeMail.
4. Add Stalwart only when the product truly needs mailbox-server accounts.
5. Before Stalwart, price the real operational cost: VPS/cluster, storage, backups, monitoring, DNS/reputation, abuse handling, support, and Stalwart license if Enterprise features are needed.

## Sources

- Stalwart pricing: https://stalw.art/pricing/
- Stalwart managed email: https://stalw.art/managed-email/
- Stalwart Enterprise docs: https://stalw.art/docs/server/enterprise/
- Resend pricing: https://resend.com/pricing
- AWS SES pricing: https://aws.amazon.com/ses/pricing/
- Mailgun pricing: https://www.mailgun.com/pricing/
