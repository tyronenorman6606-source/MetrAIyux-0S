# SkyeRouteX Provider Env Audit

Checked: 2026-05-21

## Finding

The root workspace `.env` contains several provider credentials, but the deployed `metraiyux-0s-full-system` Worker does not currently bind the RouteX provider secrets or driver variables required for live external providers.

That means the live 0S-mounted RouteX app is running through the shared gate and the Worker/KV adapter, but external providers are not active inside the mounted Worker runtime.

## Local Root Env Presence

Values were not printed or copied. This audit only checked whether names exist.

- Database: `DATABASE_URL` exists locally.
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_SECRET_KEY_LIVE`, `STRIPE_WEBHOOK_SECRET`, and SkyGateFS13 Stripe aliases exist locally.
- Twilio: account SID/auth token/phone number and SkyGateFS13 aliases exist locally.
- Mapbox: `mapbox_api_key` exists locally.
- R2/S3-compatible storage: account/access/secret/bucket-style keys exist locally.
- Checkr: `CHECKR_API_KEY`, `CHECKR_PACKAGE`, and `CHECKR_WEBHOOK_SECRET` were not present locally.
- RouteX provider driver variables were not present locally as explicit keys: `DATABASE_DRIVER`, `STORAGE_DRIVER`, `PAYMENT_PROVIDER`, `NOTIFICATION_PROVIDER`, `ROUTE_INTELLIGENCE_PROVIDER`, `IDENTITY_COMPLIANCE_PROVIDER`.

## Deployed Worker Binding Check

`metraiyux_0s_site/wrangler.toml` does not bind the RouteX external provider variables:

- `DATABASE_URL`
- `DATABASE_DRIVER`
- `STORAGE_DRIVER`
- `STORAGE_ENDPOINT`
- `STORAGE_BUCKET`
- `STORAGE_REGION`
- `STORAGE_ACCESS_KEY_ID`
- `STORAGE_SECRET_ACCESS_KEY`
- `PAYMENT_PROVIDER`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NOTIFICATION_PROVIDER`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`
- `TWILIO_DEFAULT_TO`
- `ROUTE_INTELLIGENCE_PROVIDER`
- `MAPBOX_ACCESS_TOKEN`
- `IDENTITY_COMPLIANCE_PROVIDER`
- `CHECKR_API_KEY`
- `CHECKR_PACKAGE`

`wrangler secret list` for `metraiyux-0s-full-system` showed only owner/gate/OpenAI/Relay13/event-mirror style secrets. It did not show RouteX provider secrets such as Stripe, Twilio, Mapbox, Checkr, database, or object-storage keys.

## Live RouteX Integration Status

The deployed `/api/routex/integrations/status` endpoint returned:

- `database`: connected via `worker-kv-document`
- `proof_storage`: connected via `worker-kv-proof-ledger`
- `payment_provider`: `ledger-only`
- `notification_provider`: `in-app-ledger`
- `route_intelligence`: `local-proof`
- `identity_compliance`: `manual-compliance`
- `skyehands_runtime`: queued via Worker runtime events

## What Is Missing For External Provider Mode

To make the mounted 0S Worker use live external providers, the Worker needs provider bindings/secrets plus Worker code paths that actually call those provider adapters from the mounted `/api/routex` routes.

Minimum production binding set:

- Postgres or a chosen production database binding:
  - `DATABASE_DRIVER=postgres`
  - `DATABASE_URL` or `POSTGRES_URL`
- R2/S3-compatible proof object storage:
  - `STORAGE_DRIVER=r2` or `s3-compatible`
  - `STORAGE_ENDPOINT`
  - `STORAGE_BUCKET`
  - `STORAGE_REGION`
  - `STORAGE_ACCESS_KEY_ID`
  - `STORAGE_SECRET_ACCESS_KEY`
- Stripe money movement:
  - `PAYMENT_PROVIDER=stripe`
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
- Twilio notifications:
  - `NOTIFICATION_PROVIDER=twilio`
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`
  - `TWILIO_FROM_NUMBER`
  - `TWILIO_DEFAULT_TO`
- Mapbox route intelligence:
  - `ROUTE_INTELLIGENCE_PROVIDER=mapbox`
  - `MAPBOX_ACCESS_TOKEN`
- Compliance/background-check provider:
  - Either `IDENTITY_COMPLIANCE_PROVIDER=manual-government-check` with manual proof workflow only
  - Or `IDENTITY_COMPLIANCE_PROVIDER=checkr`
  - For Checkr: `CHECKR_API_KEY`, `CHECKR_PACKAGE`, and `CHECKR_WEBHOOK_SECRET`

## Current Honest Status

The 0S mount works and is gate-owned. It has durable Worker KV state, payment/compliance/runtime ledgers, workflow proof, and export packets. It does not currently perform live external Stripe PaymentIntent creation, Twilio message delivery, Mapbox ETA/directions, Checkr invitations, or R2 object writes from the mounted Worker API.

