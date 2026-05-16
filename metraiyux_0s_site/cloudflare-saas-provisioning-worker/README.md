# Cloudflare SaaS Provisioning Worker

Generated: 2026-05-15T11:06:44Z

This Worker turns the static Customer Self-Serve Company Setup Portal into a live SaaS provisioning layer.

## Endpoints

- `GET /api/saas/status`
- `GET /api/saas/plans`
- `POST /api/saas/signup`
- `POST /api/saas/workspaces`
- `GET /api/saas/skymail/status?workspace_id=...`
- `POST /api/saas/billing/checkout-session`
- `POST /api/saas/customer-command`
- `GET /api/saas/ledger` requires `Authorization: Bearer ADMIN_TOKEN` when configured.

## Deploy

```bash
cd cloudflare-saas-provisioning-worker
wrangler d1 create sovereign_saas_db
# paste database id into wrangler.toml
wrangler d1 migrations apply sovereign_saas_db --local
wrangler d1 migrations apply sovereign_saas_db --remote
wrangler secret put ADMIN_TOKEN
wrangler secret put RESEND_API_KEY
wrangler secret put SKYMAIL_SERVICE_TOKEN
wrangler secret put STRIPE_SECRET_KEY
wrangler deploy
```

## SkyeMail Integration

`POST /api/saas/workspaces` now calls SkyeMail through `src/skymail-sdk.js`.

Required 0S Worker env:

- `SKYMAIL_API_URL=https://skymail-platform.graylondonskyes.workers.dev`
- `SKYMAIL_PUBLIC_URL=https://skymail-platform.graylondonskyes.workers.dev`
- `SKYMAIL_SERVICE_TOKEN` must match the secret on the SkyeMail Worker.
- `SKYMAIL_WORKER` is bound in `wrangler.toml` as a Cloudflare service binding to `skymail-platform`, so production 0S-to-SkyeMail calls stay private and do not depend on public `workers.dev` routing.

The 0S worker stores the result in `workspace_mailboxes` and records a `skymail.workspace_mailbox` provisioning event. A workspace can be created even when mailbox provider credentials are not ready; the response marks `provider_ready`, `inbox_ready`, and vault `key_state` explicitly so onboarding can finish the remaining setup instead of pretending email is live.

## Honest gate

Until this Worker is deployed and D1 is bound, the SaaS pages work in browser-local demo/export mode only.
