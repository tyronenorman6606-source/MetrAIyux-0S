# Zoho Command Center

A real Next.js dashboard/inbox wired to Zoho Mail APIs plus a Neon/Postgres data layer for offering hosted email onboarding as a service.

This app intentionally includes **no built-in auth**. Put your existing gate in front of the app and API routes. The only user identity hook included is the optional `x-gate-user-id` header saved onto onboarding rows.

## What is included

### Live email dashboard

- Live folder list from Zoho Mail
- Live inbox/message list
- Message search
- Message reader
- Compose/send email through Zoho Mail API
- Server-side OAuth refresh-token flow
- JSON send endpoint: `POST /api/mail/send`

### Client email-service data layer

- Client table
- Service plan table
- Three commercial lanes:
  - Shared/platform domain addresses
  - Client-owned domain setup
  - Bulk hosted inbox packs starting in groups of five
- Mailbox request table
- Domain verification tracking
- Billing item tracking
- 131-license inventory pool tracking
- Provisioning task queue
- Optional Zoho admin provisioning runner


## Plain-English docs

Before you touch the code, read these:

```text
docs/ENVIRONMENT.md              Every env var, what it does, and where to get it
docs/ZOHO_OAUTH_REFRESH_TOKEN.md How to generate the Zoho refresh token
docs/PRODUCT_LANES.md            The three email-service routes and data model
docs/NEON_SETUP.md               Neon/Postgres setup
docs/NO_AUTH_GATE.md             How to keep your external auth gate in front
```

## Required setup

```bash
npm install
cp .env.example .env.local
```

Fill in the MVP values first:

```bash
DATABASE_URL="postgres://..."  # Neon pooled connection string
ZOHO_CLIENT_ID=""              # From Zoho API Console
ZOHO_CLIENT_SECRET=""          # From Zoho API Console
ZOHO_REFRESH_TOKEN=""          # Generated once through Zoho OAuth
ZOHO_DEFAULT_FROM=""           # Real Zoho mailbox or allowed alias/send-as address
PLATFORM_EMAIL_DOMAIN="your-platform-domain.com"
PROVISIONING_RUN_SECRET=""     # You make this up; use a long random string
```

Only fill this when you are ready to test admin/domain/user provisioning:

```bash
ZOHO_ORG_ID=""                 # From Zoho Organization API/admin org details
```

Full env explanation is in `docs/ENVIRONMENT.md`. The refresh-token walkthrough is in `docs/ZOHO_OAUTH_REFRESH_TOKEN.md`.

Push the Neon schema:

```bash
npm run db:push
```

Run locally:

```bash
npm run dev
```

## Main pages

```text
/           Command center dashboard
/inbox      Live Zoho inbox
/compose    Send through Zoho
/onboard    Client onboarding intake
/clients    Clients + provisioning queue
```

## Service lanes

### 1. Shared/platform domain

For clients okay with addresses under your platform domain or subdomain.

The onboarding form collects a `sharedDomainPrefix`, then stores a domain like:

```text
clientname.your-platform-domain.com
```

This creates mailbox requests and queues mailbox provisioning.

### 2. Client-owned domain

For clients who want email on their own domain.

The onboarding form collects the client domain and queues:

```text
zoho.add_domain
zoho.verify_domain
zoho.enable_mail_hosting
dns.verify_mx_spf_dkim
zoho.create_mailboxes
```

Zoho domain APIs support adding domains, verifying domains, enabling email hosting, and checking DNS records. You still need the client to place the DNS records before verification can succeed.

### 3. Bulk hosted inbox packs

For companies needing a bigger inbox surface.

The seed plan starts at:

```text
5 mailboxes minimum
5-mailbox increments
$25 one-time setup fee
```

The database also seeds a 131-license pool at `$200/month` so you can track reserved/active licenses.

## API routes

### Create onboarding/order

```bash
curl -X POST http://localhost:3000/api/onboarding \
  -H "Content-Type: application/json" \
  -H "x-gate-user-id: user-from-your-auth-gate" \
  -d '{
    "companyName": "Example Client",
    "contactName": "Client Admin",
    "contactEmail": "admin@example.com",
    "lane": "bulk_hosted",
    "desiredDomain": "example.com",
    "mailboxCount": 5,
    "mailboxNames": ["admin", "support", "sales", "billing", "info"],
    "notes": "Client has DNS access."
  }'
```

### List clients

```bash
curl http://localhost:3000/api/clients
```

### Run queued provisioning tasks

```bash
curl -X POST http://localhost:3000/api/provisioning/run \
  -H "x-provisioning-secret: $PROVISIONING_RUN_SECRET"
```

The runner uses Zoho admin APIs when `ZOHO_ORG_ID` and OAuth scopes are configured. DNS verification can only succeed after the client has placed the required DNS records.

## Zoho OAuth scopes

For the inbox/send side:

```text
ZohoMail.accounts.READ,ZohoMail.folders.READ,ZohoMail.messages.ALL
```

For provisioning/admin operations, add organization scopes such as:

```text
ZohoMail.organization.accounts.ALL,ZohoMail.organization.domains.ALL
```

Depending on which admin actions you enable, Zoho may require partner/admin permissions and the availability of APIs may depend on your plan and mail policies.

## Notes

- Keep Zoho secrets server-side only.
- Keep Neon `DATABASE_URL` server-side only.
- Use your existing gate to restrict pages and API routes.
- The app does not charge cards by itself. It creates `billing_items` so your billing system can invoice setup fees.
- The app does not fake inbox data. If Zoho env vars are missing, the live inbox will show a config error.
