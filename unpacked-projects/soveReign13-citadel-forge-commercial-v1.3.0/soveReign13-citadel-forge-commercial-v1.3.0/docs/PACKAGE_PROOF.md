# Package Proof

Package version: v1.2.0

This file states what has been tested in the generated package and what still requires a live server/provider environment.

## Passed package-level checks

✅ Archive extraction.  
✅ `docker-compose.yml` YAML parsing.  
✅ `runner/config.yml` YAML parsing.  
✅ `.forgejo/workflows/smoke.yml` YAML parsing.  
✅ All `scripts/*.sh` pass `bash -n`.  
✅ `control-plane/src/server.js` passes `node --check`.  
✅ `control-plane/src/auth.js` passes `node --check`.  
✅ `control-plane/src/db.js` passes `node --check`.  
✅ `control-plane/src/forgejo.js` passes `node --check`.  
✅ `control-plane/src/limits.js` passes `node --check`.  
✅ `control-plane/src/stripe.js` passes `node --check`.  
✅ `control-plane/src/migrate.js` passes `node --check`.  
✅ `.env.example` can be copied, initialized, and sourced without shell failure.

## What the package now implements

✅ Forgejo-backed forge deployment.  
✅ Branded landing portal.  
✅ Commercial control-plane service.  
✅ Control-plane database migrations.  
✅ Plan table and public plans API.  
✅ Account/tenant creation.  
✅ Forgejo organization provisioning hook.  
✅ Usage snapshots.  
✅ Entitlement checks.  
✅ Meter events.  
✅ Account and admin API key creation.  
✅ API-key authentication.  
✅ Billing checkout-session records.  
✅ Stripe Checkout creation when Stripe env is configured.  
✅ Stripe webhook HMAC verification.  
✅ Billing event logs.  
✅ Lead capture.  
✅ Admin metrics.  
✅ Account suspend/unsuspend metadata.  
✅ Commercial smoke script.

## Not proven in this sandbox

☐ Live Docker Compose boot.  
☐ Live DNS/HTTPS.  
☐ First Forgejo admin creation.  
☐ Live Forgejo admin token.  
☐ Real Forgejo organization provisioning.  
☐ Runner job execution.  
☐ Stripe checkout with real/test Stripe keys.  
☐ Stripe webhook delivery.  
☐ SMTP invitation email.  
☐ Off-server backup and restore.

## Operator proof command

```bash
./scripts/package-test.sh
./scripts/deploy.sh
./scripts/smoke.sh
```

For sellable-alpha proof on a locked-down test server:

```bash
AUTH_MODE=dev docker compose up -d --build control-plane
./scripts/commercial-smoke.sh
```

Do not claim paid activation works until Stripe checkout and webhook are proven with real provider credentials.
