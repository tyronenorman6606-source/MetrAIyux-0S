# SkyEmail Zoho Provider Closure Handoff - 2026-05-22

## Current State

The dedicated SkyeMail Worker is deployed with the Zoho provider lane selected:

- Production URL: `https://skyemail-platform.graylondonskyes.workers.dev/`
- Worker version: `a8fdb047-e9dc-4e05-a144-c2c86b58d5a6`
- Provider status URL: `https://skyemail-platform.graylondonskyes.workers.dev/.netlify/functions/mailbox-domains`
- Current live status: `provider: "zoho"`, `zohoApiReady: true`, `zohoReady: false`, `zohoOrgReady: false`

This means the Worker has the Zoho OAuth triple and can refresh an access token, but it is not yet ready to create/read/send Zoho Mail accounts because Zoho Mail resource calls are returning `404 Invalid Input`.

## What Was Finished

- Added Zoho as an additive hosted mailbox provider lane.
- Kept Stalwart, external-webhook, Resend, Gmail-compatible, and local lanes in place for scale-up.
- Set `MAILBOX_PROVIDER = "zoho"` in the SkyeMail Worker config.
- Normalized root `.env` Zoho aliases:
  - `Client_ID` -> `ZOHO_CLIENT_ID`
  - `Client_Secret` -> `ZOHO_CLIENT_SECRET`
  - `Refresh_Token_ID` -> `ZOHO_REFRESH_TOKEN`
- Hardened env parsing so a one-sided quote on the refresh token line is stripped before use.
- Pushed normalized Zoho secrets to the SkyeMail Cloudflare Worker without printing secret values.
- Added the missing shared gate bridge asset at `assets/js/0s-gate-card-bridge.js`.
- Rebuilt and redeployed SkyeMail Cloudflare assets.
- Confirmed the live bridge asset returns `200`.
- Confirmed the main 0S mount for `/live/SkyeMail/` redirects unauthenticated users to the shared `/admin/login.html?return=...` gate.

## Zoho Blocker

The root env Zoho OAuth values are present and parse correctly. The token refresh call succeeds against the US Zoho accounts host and returns an access token.

The blocker is after token issuance:

- `GET https://mail.zoho.com/api/accounts` returns `404 Invalid Input`.
- `GET https://mail.zoho.com/api/organization` returns `404 Invalid Input`.
- Trailing slash variants and alternate `www.zohoapis.com` shapes were also tested and did not solve it.

The scopes you pasted look right for mailbox work:

- Folders: create/read/update/delete
- Attachments: create/read/update/delete
- Messages: create/read/update/delete
- Accounts: create/read/update/delete
- Tags: create/read/update/delete

The remaining issue is likely one of these Zoho-side details:

- The refresh token is not bound to Zoho Mail API resource access despite the app showing scopes.
- The account is not an active Zoho Mail organization/admin context for the `mail.zoho.com/api/*` endpoints.
- The token needs to be regenerated through the same Zoho Mail datacenter/account where the Mail org exists.
- `ZOHO_ORG_ID`, `ZOHO_ACCOUNT_ID`, and `ZOHO_DEFAULT_FROM` need to be added explicitly after confirming them in Zoho Mail Admin/API.

## Receipts

- Zoho smoke: `test-artifacts/skyemail-zoho-provider-smoke/zoho-provider-smoke.json`
- Headed browser attempt: `test-artifacts/live-browser-verifier/2026-05-22T09-11-16-556Z-skyemail-zoho-closure-headed/live-headed-browser-report.json`
- Changelog updated: `metraiyux_0s_site/live/SkyeMail/CHANGELOG.md`
- Ledger updated: `LIVE_DEPLOYMENT_LEDGER.md`

Important proof truth: the headed browser receipt did not fully pass. It captured desktop SkyeMail, desktop 0S gate redirect, mobile status, and screenshots, with zero material failed requests, but failed the final result because mobile home navigation timed out and one generic 404 console line was recorded.

## Commands Already Run

From `metraiyux_0s_site/live/SkyeMail`:

```bash
npm run cloudflare:secrets:check
npm run cloudflare:secrets:push
npm run cloudflare:deploy
npm run smoke:zoho-provider
npm run smoke:standalone-proof
npm run smoke:proof
```

Expected current outcome:

- `cloudflare:deploy` passes.
- `smoke:standalone-proof` passes.
- `smoke:proof` passes.
- `smoke:zoho-provider` fails until Zoho Mail account/org endpoints return usable data.

## Next Fix

In Zoho, confirm or regenerate a refresh token for the exact Mail org/admin account with Mail API scopes. Then add these root env values or Worker secrets:

```bash
ZOHO_ORG_ID=
ZOHO_ACCOUNT_ID=
ZOHO_DEFAULT_FROM=
```

Then rerun:

```bash
cd /workspaces/MetrAIyux-0S/metraiyux_0s_site/live/SkyeMail
npm run smoke:zoho-provider
npm run cloudflare:secrets:check
npm run cloudflare:secrets:push
npm run cloudflare:deploy
```

After deploy, verify:

```bash
curl -sS https://skyemail-platform.graylondonskyes.workers.dev/.netlify/functions/mailbox-domains
```

Target status:

- `provider` is `zoho`
- `zohoApiReady` is `true`
- `zohoOrgReady` is `true`
- `zohoReady` is `true`
- `provider_configured.configured` is `true`

## Full 0S Folder Note

The canonical full 0S deploy target is:

```bash
cd /workspaces/MetrAIyux-0S/metraiyux_0s_site
npx wrangler deploy
```

A fresh full-folder deploy was attempted during closure, but it did not produce a completed version ID before the interrupted run. The live 0S domain already gates `/live/SkyeMail/` correctly, but do not treat this handoff as proof that the entire 0S folder was redeployed in this closure pass.

## Official Zoho Docs To Use

- `https://www.zoho.com/mail/help/adminconsole/email-hosting-setup.html`
- `https://www.zoho.com/mail/help/api/getting-started-with-api.html`
- `https://www.zoho.com/mail/help/api/using-oauth-2.html`
- `https://www.zoho.com/mail/help/api/domain-api.html`
