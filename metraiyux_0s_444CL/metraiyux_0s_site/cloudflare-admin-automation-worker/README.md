# Admin Automation Brain Cloudflare Worker Kit

This Worker is the persistent backend for the admin-only Main Automation Brain.

It supports:
- Admin brain chat persistence and routing
- Task creation for the 13 cabinet/person brains
- Approval receipts
- Social draft queueing
- Optional social dispatch through a configured webhook/connector
- Optional Cloudflare Workers AI response generation
- D1/KV/Queue-backed audit trail

## Endpoints

- `GET /api/admin/status`
- `POST /api/admin/brain/chat`
- `POST /api/admin/task`
- `POST /api/admin/social/draft`
- `POST /api/admin/social/publish`
- `POST /api/admin/approval`
- `GET /api/admin/ledger`

## Required secret

```bash
npx wrangler secret put ADMIN_TOKEN
```

## Optional social connector secrets

```bash
npx wrangler secret put SOCIAL_DISPATCH_TOKEN
```

Set `SOCIAL_DISPATCH_WEBHOOK` as a Worker variable or secret if your connector needs secrecy. The Worker will not publish externally unless `approved: true` is sent and a connector is configured.

## Deploy

```bash
cd cloudflare-admin-automation-worker
npm create cloudflare@latest -- --help
npx wrangler d1 create admin-automation-brain
# paste the database_id into wrangler.toml
npx wrangler d1 migrations apply admin-automation-brain
npx wrangler kv namespace create ADMIN_KV
# paste the KV id into wrangler.toml
npx wrangler queues create admin-automation-brain-events
npx wrangler secret put ADMIN_TOKEN
npx wrangler deploy
```

## Admin site connection

Open `/admin/automation-brain.html`, paste the Worker origin, then paste your admin token into the session field. The token is stored only in sessionStorage by the browser script.

## Safety boundary

The Worker is built to route, draft, queue, and record. It does not magically publish, send, hire, fire, execute contracts, or file incorporation paperwork unless you configure a connector and approval policy.


## Resend approval email notifications

Approval-sensitive commands can notify the admin by email through Resend. The Worker sends notifications when a command requires approval, when a social draft is created, or when an explicit approval-required task is created.

Required:

```bash
npx wrangler secret put RESEND_API_KEY
```

Set these in `wrangler.toml` under `[vars]`:

```toml
RESEND_FROM_EMAIL = "13-Department Approval Desk <approvals@your-domain.com>"
ADMIN_APPROVAL_EMAIL = "you@your-domain.com"
PUBLIC_ADMIN_URL = "https://your-domain.com"
```

Test:

```bash
curl -X POST "$WORKER/api/admin/approval-email/test"   -H "Authorization: Bearer $ADMIN_TOKEN"   -H "Content-Type: application/json"   -d '{"message":"Send a test approval email for the Site Operator Brain."}'
```

Operating rule: the email is a notification and command receipt. The admin still approves or rejects inside the Admin Approval Inbox. External actions remain blocked until approval policy and provider connectors allow them.
