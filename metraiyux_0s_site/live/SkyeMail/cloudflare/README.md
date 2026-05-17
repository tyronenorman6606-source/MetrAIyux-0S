# SkyeMail Cloudflare Port

This folder contains the Cloudflare Worker port for SkyeMail.

## What It Runs

The Worker serves static SkyeMail assets through the `ASSETS` binding and implements the first production API routes:

- `/.netlify/functions/auth-fs27-session`
- `/.netlify/functions/mailbox-domains`
- `/.netlify/functions/mail-status`
- `/.netlify/functions/mailbox-provision`
- `/.netlify/functions/mail-send`
- `/.netlify/functions/inbound-resend`
- `/.netlify/functions/citadel-backup-test`
- `/api/health`

It also accepts the `skymail-standalone-` prefix used by the existing frontend fallback logic.

## Database Shape

Primary database:

- `NEON_DATABASE_URL` or `DATABASE_URL`
- Use Neon for the live app database.
- Apply `sql/schema.sql` before real traffic.

Backup lane:

- `CITADEL_BACKUP_URL` + `CITADEL_BACKUP_TOKEN` for an HTTP event sink, or
- `CITADEL_DATABASE_URL` / `CITADEL_BACKUP_DATABASE_URL` for a direct backup table write when reachable.

## Deploy

```bash
npm install
npm run cloudflare:secrets:check
npm run cloudflare:secrets:push
```

The helper reads SkyeMail `.env`, then the repo root `.env`, then process env, and only prints key names plus `SET`/missing status. To push manually instead:

```bash
npx wrangler secret put NEON_DATABASE_URL
npx wrangler secret put JWT_SECRET
npx wrangler secret put SKYGATEFS27_ORIGIN
npx wrangler secret put SKYGATE_EVENT_MIRROR_SECRET
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put RESEND_WEBHOOK_SECRET
npx wrangler secret put STALWART_BASE_URL
npx wrangler secret put STALWART_MANAGEMENT_API_KEY
npx wrangler secret put SKYMAIL_PRIMARY_DOMAIN
npx wrangler secret put SKYMAIL_ALLOWED_DOMAINS
npx wrangler secret put CITADEL_BACKUP_URL
npx wrangler secret put CITADEL_BACKUP_TOKEN
npx wrangler deploy
```

Use this Resend webhook URL after deploy:

```text
https://YOUR-WORKER-DOMAIN/.netlify/functions/inbound-resend
```

## Provider Links

- Stalwart Management API endpoints: https://stalw.art/docs/api/management/endpoints/
- Stalwart principals/accounts: https://stalw.art/docs/auth/principals/
- Stalwart WebUI management: https://stalw.art/docs/management/webui/
- Neon connection pooling: https://neon.com/docs/connect/connection-pooling
- Neon + Cloudflare Workers: https://developers.cloudflare.com/workers/databases/third-party-integrations/neon/
- Cloudflare Worker env vars/secrets: https://developers.cloudflare.com/workers/configuration/environment-variables/
- Cloudflare Workers environments/secrets: https://developers.cloudflare.com/workers/wrangler/environments/
- Cloudflare Email Routing/Email Workers: https://developers.cloudflare.com/email-routing/email-workers/
- Cloudflare Email Service routing: https://developers.cloudflare.com/email-service/get-started/route-emails/
