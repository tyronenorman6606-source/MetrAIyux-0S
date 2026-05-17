# Deployment Guide

## 1. Provision server

Recommended starting size:

- 4 vCPU
- 8 GB RAM
- 100 GB SSD
- Ubuntu 22.04 or 24.04

Install Docker and Compose using your server provider's recommended method.

## 2. Upload package

```bash
unzip skye-business-command-center.zip
cd skye-business-command-center
cp .env.example .env
bash scripts/generate-secrets.sh
nano .env
```

## 3. Required .env changes

Replace all placeholders:

- Database passwords
- Formbricks secrets
- InvoiceShelf app key
- SMTP host/user/password/from address
- Production domains

## 4. Preflight

```bash
bash scripts/preflight.sh
```

Do not proceed until every production-blocking item is fixed.

## 5. Start

```bash
docker compose pull
docker compose -f docker-compose.yml -f docker-compose.prod.override.yml -f docker-compose.caddy.yml up -d --build
docker compose ps
bash scripts/smoke.sh
```

The Caddy overlay publishes HTTPS for:

- `HUB_HOST`
- `FREESCOUT_HOST`
- `ESPOCRM_HOST`
- `INVOICESHELF_HOST`
- `FORMBRICKS_HOST`

Point those DNS records at the server before starting Caddy. Keep the raw app
ports bound to `127.0.0.1` so only Caddy is public.

## 6. Complete app installers

Open each module and finish setup:

- FreeScout: create/admin mailbox and connect inbound/outbound email
- EspoCRM: create admin and CRM settings
- InvoiceShelf: create admin, company profile, invoice templates, tax/payment settings as applicable
- Formbricks: create admin, configure SMTP, build first forms

## 7. Production hardening

- Put all modules behind HTTPS
- Restrict raw module ports with firewall rules
- Add server-level backups
- Add uptime monitoring
- Add app update procedure
- Create separate admin accounts per staff member
- Turn on MFA where each app supports it
- Document restore process

## 8. Proof gate

Run:

```bash
bash scripts/smoke.sh
```

Then manually verify:

- Submit a test intake form
- Create a test CRM contact/lead
- Send/receive a test support message
- Create a test estimate/invoice
- Export/backup proof artifacts
