# 0S Provider Runtime Env

The provider runtime belongs to the whole MetrAIyux 0S. Founder Command is the owner cockpit and approval surface; it is not the dependency that makes provider execution exist.

Set these as Worker secrets or deployment environment variables. Do not commit or print live values.

## Core Runtime

- `OWNER_ADMIN_CODE`
- `OWNER_ADMIN_SESSION_SECRET`
- `SKYGATEFS27_WORKER` or `SKYGATEFS27_ORIGIN`
- `SKYGATE_EVENT_MIRROR_SECRET`
- `SITE_EVENTS_KV` or `ZERO_OS_AUTOMATION_KV`

## Provider Secrets

- Twilio: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`
- Resend: `RESEND_API_KEY`, `RESEND_FROM_EMAIL` or `RESEND_FROM`
- Stripe: `STRIPE_SECRET_KEY`, optional `STRIPE_WEBHOOK_SECRET`
- PayPal: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, optional `PAYPAL_WEBHOOK_ID`
- UPS: `UPS_CLIENT_ID`, `UPS_CLIENT_SECRET`, `UPS_ACCOUNT_NUMBER`
- Google Merchant: `GOOGLE_MERCHANT_ACCESS_TOKEN`, `GOOGLE_MERCHANT_ID`
- Meta Catalog: `META_CATALOG_ACCESS_TOKEN`, `META_CATALOG_ID`
- TikTok Catalog: `TIKTOK_CATALOG_ACCESS_TOKEN`, `TIKTOK_CATALOG_ID`
- Cloudflare: `CLOUDFLARE_API_TOKEN` or `CF_API_TOKEN`, optional `CLOUDFLARE_ZONE_ID`
- Netlify: `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID`
- OpenAI: `OPENAI_API_KEY`
- Anthropic: `ANTHROPIC_API_KEY`
- Gemini: `GEMINI_API_KEY` or `GOOGLE_AI_API_KEY`
- Mapbox: `MAPBOX_ACCESS_TOKEN`
- Checkr: `CHECKR_API_KEY`, `CHECKR_PACKAGE_ID`
- Certn: `CERTN_API_KEY`, `CERTN_OWNER_ID`
- SEMrush: `SEMRUSH_API_KEY`
- Google Search Console: `GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN` or `GSC_ACCESS_TOKEN`
- Google Calendar: `GOOGLE_CALENDAR_ID`, `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`
- R2/S3 fallback: `CLOUDFLARE_R2_ACCOUNT_ID`, `CLOUDFLARE_R2_BUCKET`, `CLOUDFLARE_R2_ACCESS_KEY`, `CLOUDFLARE_R2_SECRET_KEY`

## Commerce HTTP Runtime

These are used by SkyeCommerce handoff lanes and may also be supplied per action:

- `COMMERCE_HTTP_SIGNING_SECRET`
- `ROUTEX_INGEST_URL`
- `ROUTEX_INGEST_TOKEN`
- `WAREHOUSE_INGEST_URL`
- `WAREHOUSE_SIGNING_SECRET`
- `FULFILLMENT_SYNC_SECRET`
- `TAX_FILING_SECRET`
- `FRAUD_SCREENING_SECRET`

## Non-Browser Proof

Run:

```bash
npm run 0s:provider-runtime:smoke
npm run 0s:provider-runtime:stress
node --test metraiyux_0s_site/tests/zero-os-provider-runtime.test.mjs
npm --prefix metraiyux_0s_site/SkyeCommerce test -- tests/provider-runtime.test.js tests/provider-adapters.test.js tests/platform-closure.test.js tests/full-platform.test.js tests/warehouse-ops.test.js tests/domain-certificates.test.js
```

Browser proof is owner-handled by repo policy.
