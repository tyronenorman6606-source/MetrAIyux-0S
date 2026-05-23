# The Gate Map

Last updated: 2026-05-16

This file is the living architecture map for `skyegatefs27-citadeldb`.

Any time the gate is changed, this file must be checked and updated in the same change if the edit affects auth, sessions, OAuth, admin keys, platform events, push tracking, billing, database schema, environment variables, deployment paths, consumer app integration, or live endpoint behavior.

## Public Proof Surface

The gate now has a public proof page that translates this architecture into a buyer-safe webpage:

- Local page: `gate-proofx.html`
- Alias page: `gate-map.html`
- Current public proof URL: `https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/gate-proofx.html`
- Actual Netlify gate URL: `https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/`
- SupaBoy FS27 SkyeNet artist universe: `https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/SUPABOY/`
- SupaBoy alternate lowercase mount: `https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/supaboy/`
- SupaBoy SkyeNet deployment ID: `dep_20260523071848`
- SupaBoy proof Worker version ID: `e6f3a23d-f985-41cb-a8cf-9d0fae1e74b6`
- ConnectLog + Relay13 gate lane: `https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/connectlog-relay13`
- ConnectLog + Relay13 0S proof hub: `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/live/connectlog-relay13-operator-proof.html`
- ConnectLog + Relay13 proof receipt: `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/proof/connectlog-relay13-expansion-receipt.html`
- Marketing Made Easy 0S growth-suite hub: `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/live/marketing-made-easy-growth-suite.html`
- Marketing Made Easy deep-scan receipt: `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/proof/marketing-made-easy-deep-scan-receipt.html`
- Relay13 live Worker: `https://relay13-core.graylondonskyes.workers.dev/`
- VantaCore service CRM gate lane: `https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/vantacore-service-crm`
- VantaCore actual CRM workspace: `https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/vantacore-crm`
- VantaCore persisted CRM API: `https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/api/vantacore/crm`
- VantaCore 0S proof hub: `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/live/vantacore-service-crm-operator-proof.html`
- VantaCore proof receipt: `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/proof/vantacore-service-crm-expansion-receipt.html`
- VantaCore protected Worker: `https://vantacore.graylondonskyes.workers.dev/`
- SkyePay client closeout app: `skyepay.html`
- SkyePay public aliases: `/pay`, `/gateway/skyepay`
- SkyePay API docs: `skyepay-api.html`
- SkyePay API manifest: `skyepay-api.json`
- SkyePay OpenAPI contract: `openapi/skyepay.openapi.json`
- SkyePay browser SDK: `assets/skyepay-client.js`
- SkyePay owner approval ledger: `skyepay-admin.html`
- Public SkyePay knowledge surfaces:
  - MetrAIyux 0S: `/workspaces/MetrAIyux-0S/metraiyux_0s_site/saas/skyepay.html`
- Connected MetrAIyux brain wall: `https://metraiyux-0s-public-spectacle.pages.dev/brain-system.html#operating-brain-rooms`
- Connected ecosystem portal: `https://metraiyux-ecosystem-portal.pages.dev/`
- Sitemap: `sitemap.xml`
- Robots file: `robots.txt`

This proof page is allowed to explain the gate, the public endpoint shapes, and the MetrAIyux 0S integration. It must not expose admin tokens, mirror secrets, database URLs, provider keys, or private deployment instructions.

MetrAIyux 0S also tracks this page in:

- `/workspaces/MetrAIyux-0S/metraiyux_0s_site/brain/live-surface-registry.json`
- `/workspaces/MetrAIyux-0S/metraiyux_0s_site/docs/CLIENT_DEPLOYMENT_SALES_AWARENESS.md`
- `/workspaces/MetrAIyux-0S/metraiyux_0s_site/sales/live-proof-router.html`

## What This Gate Is

Skyegate FS27 is the CitadelDB-branded deployment lane for the SkyeGateFS27 authority layer.

It is not a clean-room rewrite. It keeps the SkyeGateFS27 contract and extends it as a parent gate for apps that need shared identity, session validation, token issuance, platform event mirroring, monitor events, push/project tracking, admin control, and gateway usage accounting.

The shortest version:

- FS27 owns upstream identity and clearance.
- Consumer apps validate bearer tokens through the gate.
- Consumer apps mirror important platform events into the gate.
- The gate stores audit, usage, auth, device, OAuth, push, billing, and monitor records.
- Private apps fail closed when the gate is missing or the token cannot be validated.
- Browser apps never receive the platform event mirror secret.

## Current Project Roots

Project root:

- `/workspaces/MetrAIyux-0S/SkyeGateFS27`

Important files and directories:

- `netlify.toml`
  - Netlify build, function directory, redirect table, and scheduled function declarations.

- `netlify/functions/`
  - Primary Netlify Functions implementation.

- `netlify/functions/_lib/`
  - Shared runtime libraries: database, auth, OAuth, sessions, audit, monitor, pricing, push, GitHub, Netlify tokens, wallets, voice, vendor registry, and HTTP helpers.

- `cloudflare/worker.mjs`
  - Cloudflare Worker adapter that imports selected Netlify-style handlers and routes clean Worker paths to them.

- `wrangler.toml`
  - Cloudflare deployment config when using the Worker lane.

- `env.ultimate.template`
  - Canonical environment contract.

- `ENV_ULTIMATE_READABLE.md`
  - Human-readable version of the env contract.

- `docs/`
  - Runbooks, status audit, ownership boundary, skin system, live blockers, and integration dossiers.

- `docs/integration-dossiers/`
  - Per-consumer app dossiers generated by `scripts/scaffold-app-into-skygate.mjs`.

- `sql/`
  - SQL schema and migration references.

- `assets/`, `index.html`, `dashboard.html`, `gate-proofx.html`, `key-generator.html`
  - Static UI surfaces and client-side admin/user tools.

- `skyepay.html`, `skyepay-admin.html`, `assets/skyepay.css`, `assets/skyepay.js`, `assets/skyepay-admin.js`
  - Stripe-backed client closeout app, owner approval ledger, and MCP-guided public motion surface.

## Architecture In One Pass

The gate has five big jobs.

1. Identity authority

   The gate creates and validates users, passwords, sessions, OAuth clients, OAuth access tokens, refresh tokens, JWKS signing keys, and virtual API keys. Consumer apps are supposed to ask the gate if a bearer token is active instead of inventing local clearance rules.

2. Gateway and usage authority

   The gate controls `kx_live_*` virtual keys, provider access, device binding, usage events, monthly usage totals, rate windows, pricing, invoices, and async job records. Apps can use the gate to call model providers without exposing provider keys directly.

3. Admin control plane

   Admin functions manage customers, keys, OAuth clients, JWKS rotation, consents, pricing, vendors, sovereign variables, platform controls, push projects, GitHub/Netlify tokens, voice usage, invoices, and monitor surfaces.

   SkyePay extends this lane with `admin-skyepay-ledger`, letting the owner approve, void, or mark a paid workspace unlocked without bypassing FS27.

4. Platform event parent ledger

   Consumer apps mirror important events into `POST /platform/events` using a server-side mirror secret. The gate classifies the event lane, marks whether it is billable or privileged, writes monitor events, and writes audit records.

5. Deployment and push tracking

   The gate tracks file push jobs, chunked uploads, Netlify deploy projects, GitHub repo/push jobs, file status, billing for push activity, cleanup schedules, and retry schedules.

   SkyeNet static app deployment is also live through the Cloudflare Worker lane. The SupaBoy artist-universe build is served from R2-backed deployment `dep_20260523071848` at `/SUPABOY/` and `/supaboy/`; deploy authority, asset upload, completion, and route registration remain under FS27/SkyGate deployer control.

6. SkyePay closeout and activation

   SkyePay turns a private app preview into a Stripe Checkout Session, writes the payment result into `skyepay_orders`, and holds the workspace at `paid_pending_owner_approval` until the owner approves activation.

   Public surfaces now treat SkyePay as the house payment gateway. Pricing, billing, and get-started routes should send customers to SkyePay instead of unrelated payment links, while internal admin approval stays in the FS27 ledger.

   App surfaces can also call SkyePay as infrastructure:
   - `GET /skyepay/offers?client=metraiyux-0s`
   - `POST /skyepay/checkout`
   - `GET /skyepay/status?session_id=...`

   Cross-origin browser callers must be added to `SKYPAY_ALLOWED_ORIGINS`; same-origin app calls work without opening global CORS.

7. ConnectLog + Relay13 relationship and messaging lane

   ConnectLog and Relay13 are now a gate-owned expansion lane.

   - ConnectLog owns production relationship capture, QR exchange, follow-up memory, and the private relationship command workspace.
   - Relay13 owns the deployed Cloudflare Worker messaging core, workspace bootstrap, scoped API keys, widgets, operator console, request ledgers, activation proof, and WebSocket live proof.
   - MetrAIyux 0S owns the public proof hub, proof receipt, pricing updates, and buyer-facing routing.
   - FS27 owns the gate boundary: public links, mirror-event receipts, admin visibility, and the rule that Relay13 API keys plus FS27 mirror secrets stay server-side or operator-only.

   Current production proof was mirrored with:

   ```json
   {
     "source_app": "connectlog-relay13",
     "type": "connectlog.relay13.production_proof",
     "ws_id": "ws_2533ccd0-08e2-48ec-b74c-f1389c7062a7"
   }
   ```

8. Marketing Made Easy growth-suite lane

   Marketing Made Easy is now a gate-accounted 0S platform group, not a loose import folder.

   - 0S suite hub: `metraiyux_0s_site/Marketing-Made-Easy/index.html`
   - 0S live hub: `metraiyux_0s_site/live/marketing-made-easy-growth-suite.html`
   - Deep-scan receipt: `metraiyux_0s_site/proof/marketing-made-easy-deep-scan-receipt.html`
   - Gate dossier: `docs/integration-dossiers/marketing-made-easy.md`

   The lane covers AE-FlowPro, BrandID Offline PWA, BusinessLaunchGo, SkyeDocxMax, SkyeWebCreatorMax, WebGrowthOperator, Arizona Growth Index, and kAIxU BrandKit. FS27 may receive mirrored scan, brand, launch, document, web-creation, growth-ops, market-intelligence, and handoff events when the owner configures mirror credentials.

   The gate must not claim local PWA proof equals production tenancy. Provider publishing, ad spend, Stripe checkout, Drive/GitHub/Netlify/Cloudflare writes, and customer-impacting actions require separate owner approval and proof.

## Runtime Lanes

FS27 can run through two related lanes.

### Netlify Lane

The Netlify lane is the primary source implementation in this package.

Netlify reads:

- `netlify.toml`
- `netlify/functions/*`
- static assets from project root

The build command is:

```bash
npm run build
```

That runs:

```bash
npm run validate:env
npm run sync:env-website
```

The main production function directory is:

```text
netlify/functions
```

The clean public paths are mapped through `netlify.toml` redirects. The raw Netlify function paths also remain valid compatibility paths.

Example:

- Clean intended path: `POST /auth-introspect`
- Compatibility path: `POST /.netlify/functions/auth-introspect`

Important live note from 2026-05-15:

- The live SkyeGate Netlify host responded successfully at `/.netlify/functions/auth-introspect`.
- On the tested live host, `/auth-introspect` and `/auth/introspect` returned `404`.
- Consumer apps should either:
  - call the known working raw function fallback, or
  - try `/auth-introspect`, `/auth/introspect`, then `/.netlify/functions/auth-introspect`.

MetrAIyux 0S now uses that fallback sequence.

### Cloudflare Worker Lane

The Cloudflare lane is an adapter around selected Netlify-style handlers.

File:

```text
cloudflare/worker.mjs
```

It imports handlers such as:

- `health`
- `auth-introspect`
- `auth-signup`
- `auth-login`
- `admin-login`
- `admin-platform-events`
- `platform-event-ingest`
- `session-token`
- `auth-token-issue`
- `oauth-jwks`
- `openid-configuration`
- `oauth-well-known`

The Worker route table includes:

- `GET /health`
- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth-introspect`
- `POST /auth/introspect`
- `POST /.netlify/functions/auth-introspect`
- `POST /admin/login`
- `GET /admin/platform-events`
- `POST /platform/events`
- `POST /session/token`
- `POST /auth/tokens/issue`
- `GET /.well-known/jwks.json`
- `GET /.well-known/openid-configuration`

The Worker hydrates `process.env` from Cloudflare env bindings so the Netlify-style modules can still use their existing env reads.

Use this lane when you want Cloudflare to act as a stable edge facade for a subset of the gate.

## Endpoint Map

### Health

Use health to confirm the gate is reachable and DB/provider flags are visible.

- `GET /health`
- `GET /.netlify/functions/health`

### First-Party Auth

These are user/session identity routes.

- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/change-password`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `POST /auth/resend-verification`
- `POST /auth/verify-email`
- `POST /auth/app-login`

The raw Netlify equivalents are:

- `/.netlify/functions/auth-signup`
- `/.netlify/functions/auth-login`
- `/.netlify/functions/auth-logout`
- `/.netlify/functions/auth-me`
- `/.netlify/functions/auth-change-password`
- `/.netlify/functions/auth-forgot-password`
- `/.netlify/functions/auth-reset-password`
- `/.netlify/functions/auth-resend-verification`
- `/.netlify/functions/auth-verify-email`
- `/.netlify/functions/auth-app-login`

### Token Introspection

This is the most important downstream integration endpoint.

Primary intended contract:

```http
POST /auth-introspect
content-type: application/json

{"token":"<bearer_or_session_or_api_key>"}
```

Compatibility paths:

- `POST /auth/introspect`
- `POST /.netlify/functions/auth-introspect`

Response for valid tokens:

```json
{
  "active": true,
  "scope": "openid profile email gateway.read",
  "client_id": "system",
  "username": "user@example.com",
  "token_type": "Bearer",
  "exp": 1234567890,
  "iat": 1234567800,
  "sub": "user_123",
  "role": "admin",
  "sub_type": "user",
  "aud": "skyegatefs27",
  "customer_id": "cust_123",
  "session_id": "session_123",
  "api_key_id": "key_123",
  "email": "user@example.com",
  "email_verified": true,
  "org": "cust_123"
}
```

Response for invalid tokens:

```json
{"active": false}
```

Token types accepted by introspection:

- Gate session tokens from `user_sessions`
- OAuth access tokens
- `kx_live_*` virtual API keys

Important behavior:

- An inactive, expired, revoked, or unknown token returns `active:false`.
- Session-backed OAuth tokens also check session revocation and expiry.
- User-backed tokens check the user is active.
- `kx_live_*` keys return a gate identity scoped to the API key/customer.
- Owner/admin API keys get expanded scopes including `admin.read`, `admin.write`, `keys.read`, and `keys.write`.

### Session Bridge

The session bridge mints a short-lived gate session from a real virtual API key.

```http
POST /session/token
authorization: Bearer <kx_live_key>
content-type: application/json

{"ttl_seconds":3600}
```

Raw Netlify path:

- `POST /.netlify/functions/session-token`

Rules:

- The caller must provide a real sub-key or virtual key.
- Do not provide a JWT to mint another JWT.
- TTL is clamped.
- The response contains a revocable gate session token and `session_id`.

### API Key Management

Key routes:

- `POST /auth/tokens/issue`
- `GET /auth/tokens/list`
- `POST /auth/tokens/revoke`

Raw Netlify paths:

- `/.netlify/functions/auth-token-issue`
- `/.netlify/functions/auth-token-list`
- `/.netlify/functions/auth-token-revoke`

### OAuth And OIDC

OAuth routes:

- `GET /oauth/authorize`
- `POST /oauth/token`
- `GET /oauth/userinfo`
- `POST /oauth/logout`

Well-known and key discovery:

- `GET /.well-known/openid-configuration`
- `GET /.well-known/oauth-authorization-server`
- `GET /.well-known/jwks.json`

Admin OAuth control:

- `GET/POST /admin/oauth/clients`
- `GET /admin/jwks`
- `POST /admin/jwks/rotate`
- `GET /admin/consents`

Raw Netlify paths mirror the function names.

### Gateway AI Calls

The gateway accepts virtual keys and can proxy model calls through configured providers.

Non-streaming:

- `POST /.netlify/functions/gateway-chat`

Streaming:

- `POST /.netlify/functions/gateway-stream`

Async jobs:

- `POST /.netlify/functions/gateway-job-submit`
- `GET /.netlify/functions/gateway-job-status?id=<job_id>`
- `GET /.netlify/functions/gateway-job-result?id=<job_id>`
- `POST /.netlify/functions/gateway-job-run-background`

Client calls use:

```http
authorization: Bearer <kx_live_key_or_gate_session>
x-kaixu-app: <app-name>
x-kaixu-build: <build-id>
x-kaixu-request-id: <uuid>
x-kaixu-install-id: <stable-device-id-if-device-binding-is-enabled>
```

The browser helper is:

```text
assets/kaixu-client.js
```

It exposes:

```text
window.KaixuClient
```

### Platform Event Mirror

Consumer apps send operator/platform events here:

```http
POST /platform/events
x-skygate-mirror-secret: <server-side-secret>
content-type: application/json

{
  "source_app": "metraiyux-0s",
  "actor": "operator@example.com",
  "org_id": "org_or_customer_id",
  "ws_id": "workspace_or_receipt_id",
  "type": "admin.approval.record",
  "event_ts": "2026-05-15T19:50:00.000Z",
  "meta": {}
}
```

Raw Netlify path:

- `POST /.netlify/functions/platform-event-ingest`

Accepted secret header names:

- `x-skygate-mirror-secret`
- `x-skygate-event-mirror-secret`

Configured env secret names:

- `SKYGATE_EVENT_MIRROR_SECRET`
- `SKYGATEFS27_EVENT_MIRROR_SECRET`

What the ingest function does:

- validates the mirror secret
- normalizes `source_app`, `actor`, `org_id`, `ws_id`, `type`, `event_ts`, and `meta`
- infers a lane from event type and metadata
- infers whether the event is billable
- infers whether the event is privileged
- resolves actor context when actor looks like an email
- emits a monitor event through `_lib/monitor.js`
- writes an audit event through `_lib/audit.js`
- returns a request id

Lane inference examples:

- auth events -> `auth`
- push/deploy/github events -> `push`
- invoice/billing/payment events -> `billing`
- voice/twilio/call events -> `voice`
- mail/smtp/gmail/resend events -> `mail`
- workspace/document/save events -> `workspace`
- AI/prompt/provider events -> `ai`
- org/team/member events -> `org`
- fallback -> `platform`

Billable lanes:

- `ai`
- `push`
- `voice`
- `mail`
- `billing`

Privileged lanes:

- `auth`
- `billing`
- `push`
- `org`

Privileged action keywords also include revoke, issue, admin, delete, rotate, deploy, invite, grant, and reset.

### Admin Event Review

Use this to review mirrored platform events and monitor/audit surfaces.

- `GET /admin/platform-events`
- `GET /.netlify/functions/admin-platform-events`

Related monitor surfaces:

- `admin-monitor-events`
- `admin-monitor-stream`
- `admin-monitor-prune`
- `monitor-archive-access`
- `monitor-archive-prune`

### Push And Project Tracking

Netlify push/project lanes:

- `push-init`
- `push-upload`
- `push-upload-chunk`
- `push-upload-complete`
- `push-complete`
- `push-complete-background`
- `push-status`
- `push-file-status`
- `push-projects`
- `push-billing`
- `push-whoami`
- `push-job-retry`
- `push-chunk-cleanup`

GitHub lanes:

- `github-oauth-start`
- `github-oauth-callback`
- `github-whoami`
- `github-repos`
- `github-token`
- `github-create-repo`
- `gh-push-init`
- `gh-push-upload-chunk`
- `gh-push-upload-complete`
- `gh-push-background`
- `gh-push-status`
- `gh-my-jobs`
- `gh-job-retry`
- `gh-chunk-cleanup`

Admin push/project surfaces:

- `admin-push-projects`
- `admin-push-jobs`
- `admin-push-deploys`
- `admin-push-invoices`
- `admin-gh-jobs`
- `admin-github-repos`
- `admin-github-token`
- `admin-netlify-token`

Scheduled cleanup/retry functions are declared in `netlify.toml`.

## Data Map

The schema bootstrap lives in:

```text
netlify/functions/_lib/db.js
```

The gate creates many tables on demand. The important domains are below.

### Customer, Key, Usage, And Audit Tables

- `customers`
  - Customer/account rows, billing caps, active state, and ownership context.

- `api_keys`
  - Hashed virtual keys, key status, role, model/provider policy, customer binding, last4 display, and key metadata.

- `monthly_usage`
  - Customer-level monthly usage totals.

- `monthly_key_usage`
  - Key-level monthly usage totals.

- `usage_events`
  - Individual provider/gateway usage records.

- `audit_events`
  - Audit records for admin, app, platform, auth, push, and privileged actions.

- `platform_operator_state`
  - Small state records for operator/platform behavior.

### User And Session Tables

- `users`
  - User identity, email, role, active state, primary customer binding, verification state.

- `user_passwords`
  - Password hash records.

- `user_sessions`
  - Revocable session records, expiry, source key, and user binding.

- `verification_tokens`
  - Email verification tokens.

- `reset_tokens`
  - Password reset tokens.

### OAuth And JWKS Tables

- `oauth_clients`
  - Registered OAuth clients.

- `oauth_consents`
  - User consent records.

- `oauth_authorization_codes`
  - Short-lived authorization-code flow records.

- `oauth_refresh_tokens`
  - Refresh token records.

- `oauth_signing_keys`
  - JWKS signing keys and rotation state.

### Rate, Alert, Device, Invoice, And Wallet Tables

- `rate_limit_windows`
  - Gateway rate limiting.

- `alerts_sent`
  - Alert dedupe and sent records.

- `key_devices`
  - Device binding, install IDs, seat limits, revocation.

- `monthly_invoices`
  - Monthly invoice rows.

- `topup_events`
  - Top-up and wallet activity.

### Async Gateway Tables

- `async_jobs`
  - Background model request jobs.

- `gateway_events`
  - Gateway events and telemetry.

### Netlify Push Tables

- `customer_netlify_tokens`
  - Encrypted/customer-scoped Netlify token storage.

- `push_projects`
  - Push project definitions.

- `push_pushes`
  - Push/deploy activity.

- `push_jobs`
  - Background push jobs.

- `push_rate_windows`
  - Push-specific rate limits.

- `push_files`
  - File status for push operations.

- `push_usage_events`
  - Push billing/usage events.

- `push_pricing_versions`
  - Push pricing catalog history.

- `customer_push_billing`
  - Customer push billing config.

- `push_invoices`
  - Push invoice rows.

### Vendor, Sovereign Variable, GitHub, And Voice Tables

- `vendor_registry`
  - Registered vendors/connectors.

- `sovereign_variables`
  - Managed env/variable records.

- `customer_github_tokens`
  - Encrypted/customer-scoped GitHub token storage.

- `gh_push_jobs`
  - GitHub push jobs.

- `gh_push_events`
  - GitHub push audit/events.

- `voice_numbers`
  - Twilio/voice number records.

- `voice_calls`
  - Call metadata.

- `voice_call_messages`
  - Call message/transcript chunks.

- `voice_usage_monthly`
  - Voice billing/usage totals.

## Environment Contract

The canonical env source is:

```text
env.ultimate.template
```

Readable guide:

```text
ENV_ULTIMATE_READABLE.md
```

Validation:

```bash
npm run validate:env
```

Website/catalog sync proof:

```bash
npm run sync:env-website
```

Critical env families:

- Database:
  - `NETLIFY_DATABASE_URL`
  - `DATABASE_URL`
  - `DB_ENCRYPTION_KEY`

- Auth/security:
  - `JWT_SECRET`
  - `KEY_PEPPER`
  - `ADMIN_PASSWORD`
  - `ENABLE_LEGACY_ADMIN_PASSWORD_HEADER`

- Gate origin:
  - `PUBLIC_APP_ORIGIN`
  - `URL`
  - `SKYGATE_ISSUER`
  - `ALLOWED_ORIGINS`

- Provider keys:
  - `OPENAI_API_KEY`
  - `ANTHROPIC_API_KEY`
  - `GEMINI_API_KEY`

- Event mirror:
  - `SKYGATE_EVENT_MIRROR_SECRET`
  - `SKYGATEFS27_EVENT_MIRROR_SECRET`

- Async/background:
  - `JOB_WORKER_SECRET`

- Billing/payment:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_SUCCESS_URL`
  - `STRIPE_CANCEL_URL`
  - `STRIPE_CURRENCY`

- Push/deploy:
  - Netlify token/site vars
  - GitHub token/app vars

- Voice:
  - Twilio account/token/number vars

Never put secret values in this map.

## Consumer App Integration Model

Every consumer app should follow this shape.

### 1. Keep public pages public

Landing pages, public docs, public fit checks, public pricing, and public marketing can stay public.

### 2. Fail private routes closed

Dashboards, exports, schedulers, operator pages, billing actions, key actions, write routes, deployment routes, and admin APIs must require:

```http
Authorization: Bearer <Skyegate token>
```

or a narrow service/operator secret explicitly designed for that route.

If the gate cannot be reached, private routes fail closed.

### 3. Validate bearer tokens through introspection

Consumer apps call:

```http
POST <gate-origin>/auth-introspect
```

or fallback:

```http
POST <gate-origin>/.netlify/functions/auth-introspect
```

Apps should accept tokens based on `active:true` plus the app's own policy. For admin apps, do not accept merely active tokens unless the app is intentionally public-to-user.

Admin-policy examples:

- role is `founder`, `owner`, or `admin`
- scope contains `admin.read`
- scope contains `admin.write`
- scope contains `keys.write`
- email is in an explicit app-side admin allowlist

### 4. Mirror important events

For server-side app actions, mirror events into the gate:

```http
POST <gate-origin>/platform/events
x-skygate-mirror-secret: <server-side-secret>
```

Mirror events for:

- login and logout
- token issuance/revocation
- admin commands
- approval decisions
- deployment/push activity
- provider/gateway usage
- billing/checkout/invoice actions
- privileged workspace or org changes
- connector changes
- production changes
- security review decisions

Do not mirror secrets.

### 5. Generate an integration dossier

From this folder:

```bash
node ./scripts/scaffold-app-into-skygate.mjs \
  --app-path /absolute/path/to/app \
  --app-id app-slug \
  --gate-env-var SKYGATEFS27_ORIGIN
```

Output goes to:

```text
docs/integration-dossiers/<app-id>.md
docs/integration-dossiers/<app-id>.json
```

The dossier is a migration ledger. Keep it current when the app moves more auth or tracking behind the gate.

## MetrAIyux 0S Integration

Consumer app id:

```text
metraiyux-0s
```

Consumer package:

```text
/workspaces/MetrAIyux-0S/metraiyux_0s_site
```

Generated dossier:

```text
docs/integration-dossiers/metraiyux-0s.md
docs/integration-dossiers/metraiyux-0s.json
```

MetrAIyux admin auth bridge:

```text
POST https://metraiyux-0s-full-system.graylondonskyes.workers.dev/api/admin/auth/introspect
```

MetrAIyux browser-safe gate introspection bridge:

```text
POST https://metraiyux-0s-full-system.graylondonskyes.workers.dev/api/skygate/auth-introspect
```

MetrAIyux browser-safe event mirror:

```text
POST https://metraiyux-0s-full-system.graylondonskyes.workers.dev/api/skygate/platform-event
```

Gate-side auth authority:

```text
POST https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/.netlify/functions/auth-introspect
```

Gate-side event ingest:

```text
POST https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/platform/events
POST https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/.netlify/functions/platform-event-ingest
```

MetrAIyux uses the server-side mirror secret. Browser JavaScript never sees the mirror secret.

MetrAIyux admin acceptance policy:

- legacy `ADMIN_TOKEN` still works
- Skyegate token must be active
- token must carry founder/owner/admin role or admin/key scope
- allowed-email fallback is available through `SKYGATE_ADMIN_EMAILS`

MetrAIyux mirrored event types include:

- `admin.brain.chat`
- `admin.task.create`
- `admin.social.draft`
- `admin.social.publish_attempt`
- `admin.approval.record`
- `admin.approval_email.test`
- `site_operator.route`
- `site_operator.event`
- `site_operator.task`

Public backlink update from 2026-05-16:

- `gate-proofx.html` now links to the MetrAIyux public brain wall so a buyer can see portraits, resumes, operating-room screenshots, and proof-safe brain routing.
- `gate-proofx.html` now links to the Skye Ecosystem Portal so qualified visitors can move from FS27 into the broader deployed surface map.
- `metraiyux_0s_site/brain/live-surface-registry.json` now tracks the public brain wall and ecosystem portal as routeable sales/proof surfaces for the cabinet brain runtime.

MetrAIyux live smoke result from 2026-05-15:

- Admin status returned `skygate_auth:true`.
- Admin status returned `skygate_event_mirror:true`.
- Invalid bearer against `/api/admin/auth/introspect` returned `401`.
- Invalid bearer against `/api/skygate/auth-introspect` returned `401`.
- Unauthenticated admin ledger returned `401`.
- Public and admin browser checks passed on desktop and mobile.

## Security Contract

The gate is a security boundary, not just a helper API.

Rules:

- Never expose `SKYGATE_EVENT_MIRROR_SECRET` in browser code.
- Never expose provider keys in browser code.
- Never accept random length-only tokens.
- Never treat `active:true` as admin permission unless the app is only checking user presence.
- Admin apps must also check role, scope, or allowlist policy.
- If introspection is unreachable, private routes fail closed.
- Event mirroring should be server-to-server.
- Local emergency tokens must be explicitly configured, narrow, logged, and temporary.
- Cloudflare Access or WAF may wrap the gate, but it does not replace app-level token validation.
- Raw Netlify function paths are compatibility paths, not an excuse to bypass auth.

## How To Use The Gate As A Consumer App

### Basic private route check

1. Read the bearer token from `Authorization`.
2. POST it to the gate introspection endpoint.
3. If the response is not active, reject with `401`.
4. If the route is admin/operator privileged, enforce role/scope/email policy.
5. Continue the request.
6. Mirror a platform event for privileged actions.

Pseudo-flow:

```text
request -> app route -> bearer -> gate introspection -> app policy -> action -> platform event mirror -> response
```

### Browser app login flow

1. Browser posts to the app or gate login path.
2. Gate returns a session token.
3. Browser stores the token in memory or session storage according to the app's risk profile.
4. Browser sends `Authorization: Bearer <token>` to private app APIs.
5. App APIs introspect through the gate.
6. App APIs mirror events server-side when actions matter.

### OAuth client flow

1. Register client through admin OAuth surfaces.
2. Use discovery from `/.well-known/openid-configuration`.
3. Redirect to `/oauth/authorize`.
4. Exchange code at `/oauth/token`.
5. Validate through JWKS or introspection depending on consumer design.
6. Use `/oauth/userinfo` for profile.

### Gateway virtual-key flow

1. Admin issues a `kx_live_*` key.
2. Client calls gateway endpoints with `Authorization: Bearer <kx_live_key>`.
3. Gate enforces provider/model policy, pricing, caps, device binding, and rate limits.
4. Gate records usage and audit events.

### Session bridge flow

1. Client has a valid virtual key.
2. Client calls `/session/token`.
3. Gate issues a short-lived revocable session.
4. Downstream apps introspect that session instead of storing provider keys.

## Admin Use

Admin operators use the gate to:

- manage customers
- manage keys
- register OAuth clients
- rotate JWKS keys
- review consents
- review platform events
- review monitor events
- manage pricing
- manage vendor registry
- manage sovereign variables
- manage Netlify/GitHub push credentials
- review usage, billing, invoices, voice activity, and push jobs

Important admin files/functions:

- `admin-login.js`
- `admin-keys.js`
- `admin-customers.js`
- `admin-oauth-clients.js`
- `admin-jwks.js`
- `admin-jwks-rotate.js`
- `admin-platform-events.js`
- `admin-platform-control.js`
- `admin-platform-ops.js`
- `admin-sovereign-variables.js`
- `admin-vendors.js`
- `admin-repo-env-catalog.js`
- `admin-push-*`
- `admin-gh-*`
- `admin-voice-*`
- `admin-usage.js`
- `admin-invoices.js`

## Live Deployment Notes

Known production origins in this workspace:

- Public app origin: `https://skyegatefs27-citadeldb.graylondonskyes.workers.dev`
- Alternate/target Netlify host observed during deploy: `https://quantacore-skyegatefs13.netlify.app`
- Cloudflare FS13 worker origin in env: `https://skyegatefs13-super-gate.graylondonskyes.workers.dev`

Important caveat:

- The Netlify function fallback `/.netlify/functions/auth-introspect` is the proven live introspection path on the tested public app origin.
- The clean redirect paths should be treated as intended contract paths, but consumers should keep fallback support until redirects are proven live on the target deployment.

Recent deploy attempt:

- Deploy id: `6a07770072c0ce2c6d8a4407`
- Title: `MetrAIyux FS27 auth bridge`
- Observed state after CLI termination: `uploading`
- The local build, env validation, sync proof, and function bundling completed before the Netlify CLI terminated.

## Verification Commands

From the FS27 project root:

```bash
npm run validate:env
npm run sync:env-website
npm run build
```

Syntax-check important modules:

```bash
node --check netlify/functions/auth-introspect.js
node --check netlify/functions/platform-event-ingest.js
node --check netlify/functions/session-token.js
node --check scripts/scaffold-app-into-skygate.mjs
node --check cloudflare/worker.mjs
```

Smoke invalid introspection:

```bash
curl -sS -X POST "$SKYGATE_ORIGIN/.netlify/functions/auth-introspect" \
  -H "content-type: application/json" \
  --data '{"token":"invalid"}'
```

Expected:

```json
{"active":false}
```

Smoke event mirror without secret:

```bash
curl -sS -X POST "$SKYGATE_ORIGIN/platform/events" \
  -H "content-type: application/json" \
  --data '{"type":"smoke.no_secret"}'
```

Expected:

- `401 Unauthorized` if mirror secret is configured.
- `501` if the target deployment has no mirror secret configured.

Smoke event mirror with secret only from server/runtime, never from browser:

```bash
curl -sS -X POST "$SKYGATE_ORIGIN/platform/events" \
  -H "content-type: application/json" \
  -H "x-skygate-mirror-secret: $SKYGATE_EVENT_MIRROR_SECRET" \
  --data '{"source_app":"smoke","actor":"operator@example.com","type":"smoke.platform_event","meta":{"billable":false}}'
```

Expected:

```json
{"ok":true}
```

## What To Update In This File

Update this file when any of these change:

- new endpoint added
- endpoint renamed
- endpoint removed
- redirect added or removed in `netlify.toml`
- Cloudflare Worker route added or removed
- token response shape changes
- introspection rules change
- admin acceptance policy changes
- session TTL/session bridge behavior changes
- OAuth flow or JWKS behavior changes
- event mirror schema changes
- event lane inference changes
- audit or monitor write behavior changes
- DB table added/renamed/removed
- env var added/renamed/removed
- deployment origin changes
- live caveat resolved
- consumer app dossier added
- consumer app integration policy changes
- push/GitHub/Netlify tracking behavior changes
- billing/usage/pricing behavior changes
- provider gateway behavior changes

## Managed Stripe Subscription Path

The repo-wide Stripe source of truth is `../STRIPE_PRODUCT_PRICE_CATALOG.md`.

SkyeGateFS27 has two billing paths:

- Usage top-ups: existing one-time variable checkout through `netlify/functions/stripe-create-checkout.js`.
- Managed gate subscription: onboarding plus monthly control-plane operations for customers who want the gate operated for them.

Current managed gate Stripe products:

| Product | Amount | Billing | Lookup key |
| --- | ---: | --- | --- |
| SkyeGateFS27 Managed Gate Onboarding | $12,500.00 | One-time | `skygatefs27_managed_gate_onboarding` |
| SkyeGateFS27 Managed Control Plane | $1,250.00 | Monthly | `skygatefs27_managed_control_plane_monthly` |
| SkyeGateFS27 Lane Maintenance | $249.00 | Monthly per lane | `skygatefs27_lane_maintenance_monthly` |
| SkyeGateFS27 Usage Top-Up | Variable | One-time | `skygatefs27_usage_topup_variable` |

Do not sell the default `$20/month` cap as a plan. That cap is an internal spend limit. Do not sell `pricing/pricing.json` provider/model costs as public product prices unless a metered usage product and markup policy are explicitly approved.

Minimum update pattern:

1. Change code.
2. Update this map.
3. Update any narrow runbook that owns the same surface.
4. Run the relevant checks.
5. Record live caveats honestly.

## Quick Mental Model

If someone asks what FS27 does, say this:

FS27 is the gate. Apps bring it bearer tokens and platform events. The gate answers whether the token is real, what role/scope it carries, which customer/org it belongs to, and then records the important actions back into a parent audit/monitor ledger. It also owns the heavier control plane around virtual keys, provider usage, OAuth, sessions, deployment pushes, billing, vendors, and admin operations. Consumer apps keep their own product UI and app-specific state, but they should not invent their own root auth or hide important privileged actions from the gate.
