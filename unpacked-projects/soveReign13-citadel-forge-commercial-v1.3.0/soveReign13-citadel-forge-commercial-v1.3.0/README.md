# SoveReign13 Citadel Forge Commercial v1.3.0

SoveReign13 Citadel Forge is a deployable, self-hosted GitHub-replacement foundation built around Forgejo plus a SoveReign13 commercial control plane.

Forgejo remains the forge engine: Git repositories, organizations, issues, pull requests, wiki, releases, package registries, API, and Actions-style CI runners. The SoveReign13 control plane adds the commercial operator layer required to sell access: plans, tenants, upstream-auth handoff, account API keys, usage snapshots, entitlement checks, billing checkout sessions, Stripe-compatible webhook verification, generic billing event intake, lead capture, admin metrics, audit events, and deployment command docs.

## Fast start

```bash
unzip soveReign13-citadel-forge-commercial-v1.3.0.zip
cd soveReign13-citadel-forge-commercial-v1.3.0

cp .env.example .env
chmod +x scripts/*.sh
./scripts/init-env.sh
nano .env

./scripts/package-test.sh
./scripts/deploy.sh
./scripts/smoke.sh
```

## Required domains

Set these DNS records to the server running Docker:

```env
PORTAL_DOMAIN=code.yourdomain.com
FORGE_DOMAIN=forge.yourdomain.com
CONTROL_DOMAIN=app.yourdomain.com
```

## Required production activation

Do not expose this as a paid product until these are done:

✅ Docker boot passes on the target server.  
✅ `scripts/smoke.sh` passes for portal, control plane, Forgejo, and SSH Git port.  
✅ First Forgejo admin exists.  
✅ `FORGEJO_ADMIN_TOKEN` is created and placed in `.env`.  
✅ Account provisioning can create a real Forgejo organization.  
✅ Your upstream gate is connected through trusted headers or JWT/OIDC.  
✅ Forgejo auth is configured to match the upstream identity lane.  
✅ Stripe/Paddle/other provider is configured before payment claims go public.  
✅ Backups are sent off-server.  
✅ Runner registration is completed and a workflow has executed.

## What changed in v1.3.0

- Added account-scoped and admin-scoped SoveReign13 API key authentication.
- Added entitlement/plan-limit evaluation.
- Added user, CI minute, and package-meter limit checks.
- Added checkout-session records.
- Added Stripe Checkout session creation through direct REST calls when Stripe env vars are supplied.
- Added Stripe webhook signature verification without adding a Stripe SDK dependency.
- Added billing subscription records.
- Added public lead capture.
- Added admin platform metrics.
- Added account suspend/unsuspend hooks.
- Added stronger control-plane UI.
- Added `scripts/commercial-smoke.sh` for sellable-alpha control-plane proof.
- Added commercial docs for billing, auth gate wiring, abuse controls, and the sellable-alpha runbook.

## Honest status

This package is package-tested. It is not live-proven until it runs on your server. This kit does not claim global GitHub scale, marketplace parity, or every GitHub extension feature. It is a serious sovereign forge foundation that can be deployed, branded, sold in controlled tiers, and expanded.

## Closure work added in v1.3.0

v1.3.0 closes the biggest production footgun from v1.2.0: trusted-header auth is no longer safe-by-default exposed without a gate secret. If you use your own upstream gate, the gate must inject `x-s13-gate-secret` matching `TRUSTED_HEADER_AUTH_SECRET` and must strip inbound browser-supplied identity headers.

New closure files and surfaces:

- `control-plane/public/command-center.html` — internal Deployment Command Center.
- `docs/GATE_INTEGRATION_CONTRACT.md` — exact auth-gate contract.
- `docs/LIVE_ACCEPTANCE_GATES.md` — sale-readiness gates.
- `docs/CLOSURE_LEDGER_V1_3.md` — proof ledger for this closure pass.
- `scripts/closure-test.sh` — package closure test wrapper.

New control-plane capability:

- `GET /api/deployment/readiness` for admin readiness checks.
- `POST /api/accounts/:id/repos` for entitlement-checked repository creation through Forgejo.
- Scoped API-key enforcement for account, repo, usage, meter, and billing mutation lanes.
- Suspended-account protection for mutating account operations.

Run the closure test before deploy:

```bash
./scripts/closure-test.sh
```
