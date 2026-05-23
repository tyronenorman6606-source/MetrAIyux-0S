# Product Lanes and Data Model

This app is built for three email-service routes.

## Lane 1: Shared/platform email setup

For clients who are okay using your managed email domain or a platform-style domain structure.

Example patterns:

```text
client-name.platform-domain.com
support@client-name.platform-domain.com
assistant@client-name.platform-domain.com
```

What the app stores:

- client record
- selected service plan
- desired shared domain prefix
- mailbox requests
- aliases
- provisioning tasks
- billing items if needed

Best for:

- fast setup
- clients who do not need their own domain
- managed assistant inboxes
- internal business process inboxes
- lower-friction onboarding

## Lane 2: Client-owned domain setup

For clients who want email on their own domain.

Example patterns:

```text
support@clientcompany.com
sales@clientcompany.com
admin@clientcompany.com
```

What onboarding should collect:

- company name
- admin/contact name
- contact email
- client domain
- desired mailbox names
- DNS access status
- notes about who controls DNS

Provisioning queue can include:

```text
zoho.add_domain
zoho.verify_domain
zoho.enable_mail_hosting
dns.verify_mx_spf_dkim
zoho.create_mailboxes
```

Important: a client-owned domain requires DNS work. The client or whoever controls the DNS must add records for domain verification, MX, SPF, DKIM, and possibly DMARC.

Commercial model currently seeded:

```text
One-time setup fee: $13
```

## Lane 3: Bulk hosted inbox packages

For companies that need a larger inbox surface.

Commercial model currently seeded:

```text
Minimum block: 5 inboxes
Increment: 5 inboxes
One-time setup fee: $25
Scale upward in groups of five
```

The database also includes a `mailbox_inventory` table so you can track your larger purchased mailbox pool, including the seeded 131-license pool.

Best for:

- larger clients
- departments
- lead-gen/outreach teams
- support teams
- clients who need multiple role-based inboxes

## Tables included

### `clients`

Stores the company/customer.

### `service_plans`

Stores the three product lanes and their pricing/setup rules.

### `email_service_orders`

Stores each order/intake request.

### `client_domains`

Tracks platform domains or client-owned domains, verification status, and DNS state.

### `mailbox_requests`

Stores requested mailboxes such as support, admin, billing, sales, etc.

### `aliases`

Stores alias records related to mailboxes.

### `provisioning_tasks`

Task queue for Zoho/domain/mailbox actions.

### `billing_items`

Tracks setup fees and invoiceable items. This app does not process cards by itself.

### `mailbox_inventory`

Tracks reserved/active mailbox capacity from your purchased pool.

### `audit_events`

Tracks important app events and provisioning actions.

## No built-in auth

This app intentionally does not include login, sessions, JWT, Clerk, Supabase Auth, NextAuth, or any other built-in auth system.

Your external gate should protect the app before requests reach these pages/API routes.

Optional supported header:

```text
x-gate-user-id
```

The onboarding endpoint saves that value if your gate sends it.
