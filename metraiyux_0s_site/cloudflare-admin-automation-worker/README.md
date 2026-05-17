# Admin Automation Brain Cloudflare Worker Kit

This Worker is the persistent backend for the admin-only Main Automation Brain.

It supports:
- Admin brain chat persistence and routing
- Task creation for the 13 cabinet/person brains
- Approval receipts
- Social draft queueing
- Approval-aware connector dispatch for CRM, social, project management, payroll, content publishing, local-brain updates, and repository updates
- Blog content engine runs that turn longform articles into social posts, email packages, website copy, local-brain chunks, and repo update files
- Automated Cloudflare Worker secret rotation receipts
- TOTP MFA setup, permanent authenticator QR reissue, and one-time backup override codes
- Optional Cloudflare Workers AI response generation
- D1/KV/Queue-backed audit trail

## Endpoints

- `GET /api/admin/status`
- `POST /api/admin/brain/chat`
- `POST /api/admin/task`
- `POST /api/admin/social/draft`
- `POST /api/admin/social/publish`
- `GET /api/admin/connectors/status`
- `POST /api/admin/connectors/event`
- `POST /api/admin/connectors/dispatch`
- `GET /api/admin/connectors/events`
- `POST /api/admin/content-engine/activate`
- `POST /api/admin/content-engine/dispatch`
- `GET /api/admin/content-engine/runs`
- `GET /api/admin/content-engine/run?id=<run_id>`
- `GET /api/admin/content-engine/local-brain-feed`
- `GET /api/admin/security/status`
- `POST /api/admin/security/mfa/setup`
- `POST /api/admin/security/mfa/verify`
- `POST /api/admin/security/backup-codes/issue`
- `POST /api/admin/security/override-session`
- `POST /api/admin/secrets/rotate`
- `GET /api/admin/secrets/rotations`
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

## Content engine lane

The content engine lane accepts an article record from `blog/content-engine.json`, builds a campaign package, stores it as a run, and creates approval-required connector events for each external action.

One activation can create:

- LinkedIn personal post and X thread for `social_dispatch`
- Follow-up email package and website section HTML for `content_publish`
- Approved local-brain knowledge chunk for `local_brain_update`
- Markdown campaign file and brain JSON file for `repository_update`

Activate a package:

```bash
curl -X POST "$WORKER/api/admin/content-engine/activate" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d @article-package.json
```

Approve and dispatch:

```bash
curl -X POST "$WORKER/api/admin/content-engine/dispatch" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"run_id":"<run_id>","approved":true}'
```

No connector silently succeeds. If a destination webhook or GitHub Contents API configuration is missing, the event is recorded as `blocked_missing_connector`.

## Connector wiring

Connector events are persisted, approval-checked, queued, dispatched, retried, and logged. Set bridge URLs as vars and tokens as secrets:

```bash
npx wrangler secret put CRM_CONNECTOR_TOKEN
npx wrangler secret put SOCIAL_DISPATCH_TOKEN
npx wrangler secret put PROJECT_MANAGEMENT_CONNECTOR_TOKEN
npx wrangler secret put PAYROLL_CONNECTOR_TOKEN
npx wrangler secret put CONTENT_PUBLISH_TOKEN
npx wrangler secret put LOCAL_BRAIN_UPDATE_TOKEN
npx wrangler secret put CONTENT_REPOSITORY_TOKEN
# Optional direct GitHub repository adapter:
npx wrangler secret put GITHUB_CONTENT_TOKEN
```

Supported bridge URL vars:

- `CRM_CONNECTOR_URL`
- `SOCIAL_DISPATCH_WEBHOOK`
- `PROJECT_MANAGEMENT_CONNECTOR_URL`
- `PAYROLL_CONNECTOR_URL`
- `CONTENT_PUBLISH_WEBHOOK`, `PERSONAL_SITE_WEBHOOK`, or `MARKETING_SITE_WEBHOOK`
- `LOCAL_BRAIN_UPDATE_WEBHOOK` or `LOCAL_BRAIN_WEBHOOK`
- `CONTENT_REPOSITORY_WEBHOOK`
- `GITHUB_CONTENT_REPO` plus optional `GITHUB_CONTENT_BRANCH` when using the GitHub Contents API adapter

Each webhook bridge receives a JSON envelope with `schema`, `id`, `connector_type`, `action`, `actor`, and `payload`. Social, payroll, content publishing, local-brain updates, and repository updates are approval-required by default. The repository lane can either call `CONTENT_REPOSITORY_WEBHOOK` or commit files through the GitHub Contents API when `GITHUB_CONTENT_REPO` and `GITHUB_CONTENT_TOKEN` are configured.

## MFA, backup override, and secret rotation

MFA setup requires encrypted storage:

```bash
npx wrangler secret put ADMIN_MFA_ENCRYPTION_KEY
npx wrangler secret put ADMIN_BACKUP_CODE_PEPPER
```

Backup codes are generated once, HMAC-hashed, emailed once, and consumed once. The admin UI lives at `/admin/security-automation.html`; the encrypted authenticator PWA lives at `/admin/skyebox-authenticator/index.html`.

Cloudflare secret rotation requires:

```bash
npx wrangler secret put CLOUDFLARE_API_TOKEN
```

Set `CLOUDFLARE_ACCOUNT_ID` as a var. `ADMIN_TOKEN` can be generated by the Worker. Provider keys such as `RESEND_API_KEY`, `STRIPE_SECRET`, and `STRIPE_SECRET_KEY` must be created in the provider account first, then submitted as `new_value` so the Worker can install them into Cloudflare and record the rotation.

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
RESEND_FROM_EMAIL = "13-Cabinet Approval Desk <approvals@your-domain.com>"
ADMIN_APPROVAL_EMAIL = "you@your-domain.com"
PUBLIC_ADMIN_URL = "https://your-domain.com"
```

Test:

```bash
curl -X POST "$WORKER/api/admin/approval-email/test"   -H "Authorization: Bearer $ADMIN_TOKEN"   -H "Content-Type: application/json"   -d '{"message":"Send a test approval email for the Site Operator Brain."}'
```

Operating rule: the email is a notification and command receipt. The admin still approves or rejects inside the Admin Approval Inbox. External actions remain blocked until approval policy and provider connectors allow them.
