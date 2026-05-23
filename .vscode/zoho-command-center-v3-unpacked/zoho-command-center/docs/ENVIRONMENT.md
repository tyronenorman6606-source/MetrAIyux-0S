# Environment Variables Guide

This file explains every environment variable in plain English: what it does, whether it is required, and where to get it.

## Quick answer: what do I need first?

For a basic live inbox + send dashboard, you need these first:

```bash
DATABASE_URL=""
ZOHO_CLIENT_ID=""
ZOHO_CLIENT_SECRET=""
ZOHO_REFRESH_TOKEN=""
ZOHO_DEFAULT_FROM=""
```

For automated admin/provisioning work such as creating domains, users, aliases, or running the provisioning queue, you also need:

```bash
ZOHO_ORG_ID=""
PLATFORM_EMAIL_DOMAIN=""
PROVISIONING_RUN_SECRET=""
```

## Full variable table

| Variable | Required? | What it does | Where to get it |
|---|---:|---|---|
| `DATABASE_URL` | Yes, if using onboarding/storage | Connects the app to Neon/Postgres for clients, plans, onboarding orders, mailbox requests, billing items, license inventory, and provisioning tasks. | Neon dashboard → your project → Connection string. Use the pooled Postgres connection string with SSL. |
| `ZOHO_CLIENT_ID` | Yes for Zoho API | Identifies your Zoho OAuth app. | Zoho API Console / Developer Console after creating a server-based OAuth client. |
| `ZOHO_CLIENT_SECRET` | Yes for Zoho API | Secret for your Zoho OAuth app. Keep server-side only. | Same Zoho OAuth client screen as `ZOHO_CLIENT_ID`. |
| `ZOHO_REFRESH_TOKEN` | Yes for Zoho API | Lets the server keep generating short-lived access tokens without you logging in every hour. | Generated once through Zoho OAuth consent + token exchange. See `docs/ZOHO_OAUTH_REFRESH_TOKEN.md`. |
| `ZOHO_ACCOUNTS_BASE` | Usually yes, default included | Zoho OAuth/token server base URL. | Use the default for your Zoho data center. US is `https://accounts.zoho.com`. EU is `https://accounts.zoho.eu`. IN is `https://accounts.zoho.in`. |
| `ZOHO_MAIL_BASE` | Usually yes, default included | Zoho Mail API base URL. | Use the default for your Zoho data center. US is `https://mail.zoho.com`. EU is `https://mail.zoho.eu`. IN is `https://mail.zoho.in`. |
| `ZOHO_ACCOUNT_ID` | Optional | Forces the inbox to use a specific Zoho Mail account ID. If blank, the app uses the first account returned by Zoho. | Can be fetched from Zoho Mail Accounts API after OAuth is working. Leave blank at first. |
| `ZOHO_DEFAULT_FROM` | Recommended | Default sender address used by the compose/send page. Must be a real mailbox or allowed alias/send-as address in Zoho. | Pick one from Zoho Mail Admin Console / mailbox aliases / send mail details. |
| `ZOHO_DEFAULT_FROM_NAME` | Optional | Display name used with `ZOHO_DEFAULT_FROM`. | You choose it. Example: `Executive Assistant`, `Support Team`, or your brand name. |
| `DASHBOARD_BRAND_NAME` | Optional | Branding text in the dashboard UI. | You choose it. |
| `DASHBOARD_ACCENT` | Optional | Small branding/accent text in the dashboard UI. | You choose it. |
| `PLATFORM_EMAIL_DOMAIN` | Needed for shared/platform lane | The domain used for clients who are okay with being under your managed email setup. | You choose a domain already verified/hosted in Zoho. Example pattern: client prefix + your domain. |
| `ZOHO_ORG_ID` | Needed for admin provisioning | Zoho organization ID used for org/domain/user/admin APIs. Not needed for simple inbox/send. | Get it from the Zoho Organization API after OAuth works, or from Zoho admin/org API details. |
| `PROVISIONING_RUN_SECRET` | Recommended for provisioning route | A private key required to call `POST /api/provisioning/run`. Prevents random people from triggering provisioning tasks. | You make it up. Use a long random string. Example command: `openssl rand -hex 32`. |

## Minimum `.env.local` for MVP

Start here:

```bash
DATABASE_URL="postgresql://..."

ZOHO_CLIENT_ID="from-zoho-api-console"
ZOHO_CLIENT_SECRET="from-zoho-api-console"
ZOHO_REFRESH_TOKEN="from-zoho-oauth-token-exchange"

ZOHO_ACCOUNTS_BASE="https://accounts.zoho.com"
ZOHO_MAIL_BASE="https://mail.zoho.com"

ZOHO_DEFAULT_FROM="support@your-platform-domain.com"
ZOHO_DEFAULT_FROM_NAME="Support"

PLATFORM_EMAIL_DOMAIN="your-platform-domain.com"
PROVISIONING_RUN_SECRET="make-a-long-random-string"
```

Leave this blank until you are ready to test admin provisioning:

```bash
ZOHO_ORG_ID=""
```

## Which variables are not needed right away?

You can leave these blank during the first local test:

```bash
ZOHO_ACCOUNT_ID=""
ZOHO_ORG_ID=""
```

`ZOHO_ACCOUNT_ID` is optional because the app can pull the first mail account from Zoho.

`ZOHO_ORG_ID` is only for admin/provisioning features, not basic inbox/send.

## Security rules

- Never expose Zoho secrets in the browser.
- Never expose `DATABASE_URL` in the browser.
- Do not put these values in client-side code.
- Keep this app behind your external auth gate.
- This repo intentionally does not include built-in auth.
