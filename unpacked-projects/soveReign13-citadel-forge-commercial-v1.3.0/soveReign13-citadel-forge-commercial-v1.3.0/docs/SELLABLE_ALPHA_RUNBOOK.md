# SoveReign13 Sellable Alpha Runbook

This is the operator sequence for turning Citadel Forge into a product people can sign up for and pay to use.

## 1. Deploy infrastructure

```bash
cp .env.example .env
./scripts/init-env.sh
nano .env
./scripts/deploy.sh
./scripts/smoke.sh
```

Minimum production shape:

✅ One dedicated Docker host or your existing GPU/CDE host with spare CPU/RAM.  
✅ Three DNS records: portal, control, forge.  
✅ Caddy owns HTTPS.  
✅ PostgreSQL volumes persist Forgejo and control-plane data.  
✅ Forgejo SSH port is reachable.

## 2. Create Forgejo admin and token

Open the forge domain, create the first admin user, then create an admin API token. Put it in `.env`:

```env
FORGEJO_ADMIN_TOKEN=your_live_forgejo_admin_token
```

Redeploy only the control plane:

```bash
docker compose up -d --build control-plane
```

Then create a customer account through the control plane and confirm it creates a Forgejo organization.

## 3. Connect upstream gate

Two supported lanes exist.

Trusted-header mode:

```env
TRUSTED_HEADER_AUTH=true
AUTH_EMAIL_HEADER=x-s13-user-email
AUTH_SUBJECT_HEADER=x-s13-user-id
AUTH_USERNAME_HEADER=x-s13-user-name
AUTH_DISPLAY_NAME_HEADER=x-s13-user-display-name
AUTH_ROLES_HEADER=x-s13-user-roles
```

JWT/OIDC mode:

```env
AUTH_JWKS_URL=https://gate.example.com/.well-known/jwks.json
AUTH_ISSUER=https://gate.example.com
AUTH_AUDIENCE=soveReign13-citadel-forge
```

Production rule: do not run `AUTH_MODE=dev` on a public server.

## 4. Wire payment

Stripe lane:

```env
STRIPE_SECRET_KEY=sk_live_or_test_key
STRIPE_WEBHOOK_SECRET=whsec_live_or_test_secret
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_STUDIO=price_...
STRIPE_PRICE_AGENCY=price_...
```

The control plane calls Stripe Checkout only when those values exist. Without them it records a configuration-required checkout session and refuses to fake payment activation.

## 5. Register runner

Create a Forgejo runner token, then run:

```bash
FORGEJO_RUNNER_REGISTRATION_TOKEN="paste-token" ./scripts/register-runner.sh
docker compose --profile runner up -d forgejo-runner
```

Push the included workflow from `examples/.forgejo/workflows/smoke.yml` into a repo and confirm a real job completes.

## 6. Run commercial smoke

Only on a locked-down test server with `AUTH_MODE=dev` or behind a gate that maps your dev headers:

```bash
AUTH_MODE=dev docker compose up -d --build control-plane
./scripts/commercial-smoke.sh
```

This proves account creation, plan load, auth diagnostics, lead capture, admin metrics, entitlement read, and a meter-event path.

## 7. Sales-safe public claims

Allowed claims after package test only:

✅ Self-hosted forge foundation.  
✅ Branded commercial control plane included.  
✅ Plans, accounts, API keys, metering records, billing hooks, and admin metrics are implemented.  

Allowed claims after live smoke:

✅ Deployed forge with real HTTPS and SSH Git.  
✅ Control plane can create and inspect accounts.  
✅ Account provisioning can create Forgejo organizations.

Allowed claims after runner proof:

✅ Self-hosted CI jobs execute.

Allowed claims after Stripe webhook proof:

✅ Paid plan checkout and webhook activation work.
