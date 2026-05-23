# Skye Business Command Center

Operator-grade business ops deployment package by Skyes Over London.

This bundle packages a branded business command center around production-safe open-source components:

- FreeScout: shared inbox and support tickets.
- EspoCRM: CRM, contacts, leads, opportunities, pipeline.
- InvoiceShelf: estimates, invoices, customers, billing records.
- Formbricks: intake forms, quote forms, feedback, onboarding forms.
- Skye Hub: branded landing, dashboard, setup walkthrough, command center, launch room, proof ledger, maintenance console, and production readiness room.

## Safe sales position

Sell this as deployment, configuration, hosting support, workflow setup, training, maintenance, and branded operations packaging. Do not claim proprietary ownership of upstream open-source software. Do not sell it as banking, legal, tax, accounting, payment-processing, HIPAA, SOC 2, PCI, or regulated compliance certification.

## Fast local launch

```bash
cp .env.example .env
bash scripts/generate-secrets.sh
bash scripts/preflight.sh
docker compose up -d --build
bash scripts/smoke.sh
```

## Production launch

```bash
cp deploy/profiles/.env.production.example .env
nano .env
bash scripts/generate-secrets.sh
bash scripts/preflight.sh
docker compose -f docker-compose.yml -f docker-compose.prod.override.yml up -d --build
bash scripts/acceptance.sh
bash scripts/backup.sh
bash scripts/verify-backup.sh ./backups
bash scripts/client-readiness-report.sh
```

## Main pages

- Product landing: `/index.html`
- Setup walkthrough: `/setup.html`
- Business dashboard: `/dashboard.html`
- Deployment Command Center: `/command-center.html`
- Client onboarding: `/client-onboarding.html`
- Client handoff: `/client-handoff.html`
- First-client launch room: `/launch.html`
- Demo walkthrough: `/demo.html`
- Proof ledger: `/proof.html`
- Maintenance console: `/maintenance.html`
- Production readiness room: `/readiness.html`

## Operator-grade additions

This version includes production env profiles, a compose production override, systemd health timer examples, nginx and Caddy reverse-proxy examples, client-ready roadmap, production acceptance ledger, master service disclosure, multi-client isolation guide, provisioning worksheet, statement of work, objection handling, launch invoice template, client launch email, backup verification, and a client-readiness report script.

## Dedicated-client rule

For serious paid production, use a dedicated VPS or isolated compose project per client. Do not place unrelated paying businesses in one shared app database until multi-tenant isolation is engineered and tested.

## Remaining real-world gates

A real launch still needs a VPS, DNS, HTTPS, SMTP, strong secrets, upstream app installer completion, admin accounts, mailbox routing, backup verification, and live workflow acceptance.


## Local Brain

The hub now ships with `brain.html`, an embedded operations brain for deployment, pricing, sales guardrails, production gates, proof, maintenance, and first-client launch guidance.

Default mode is browser-local knowledge retrieval using `apps/hub/public/assets/brain.js`. Optional mode uses `apps/brain-service` to call OpenAI when `LOCAL_LLM_PROVIDER=openai`, or Ollama/local GPU model endpoints when `LOCAL_LLM_PROVIDER=ollama`.

Run path remains:

```bash
cp .env.example .env
bash scripts/generate-secrets.sh
bash scripts/preflight.sh
docker compose up -d --build
bash scripts/smoke.sh
```

Brain URL: `http://localhost:8080/brain.html`
Brain service health: `http://localhost:8099/health`
