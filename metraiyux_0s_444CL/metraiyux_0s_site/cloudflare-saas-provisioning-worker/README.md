# Cloudflare SaaS Provisioning Worker

Generated: 2026-05-15T11:06:44Z

This Worker turns the static Customer Self-Serve Company Setup Portal into a live SaaS provisioning layer.

## Endpoints

- `GET /api/saas/status`
- `GET /api/saas/plans`
- `POST /api/saas/signup`
- `POST /api/saas/workspaces`
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
wrangler secret put STRIPE_SECRET_KEY
wrangler deploy
```

## Honest gate

Until this Worker is deployed and D1 is bound, the SaaS pages work in browser-local demo/export mode only.
