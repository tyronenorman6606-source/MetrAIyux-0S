# New Client Deployment Checklist

Use this for every paying client.

## 1. Client intake

☐ Client legal/business name collected
☐ Primary admin contact collected
☐ Billing contact collected
☐ Support inbox selected, for example support@clientdomain.com
☐ Sales inbox selected, for example sales@clientdomain.com
☐ Domain/subdomain selected
☐ Logo and brand colors collected
☐ Staff list collected
☐ Services/products collected
☐ Current CRM/invoice/helpdesk tools documented
☐ Migration needs documented

## 2. Infrastructure

☐ VPS created
☐ SSH key installed
☐ Firewall enabled for SSH, HTTP, HTTPS
☐ Docker installed
☐ Docker Compose installed
☐ Repository/package uploaded
☐ `.env.example` copied to `.env`
☐ `scripts/generate-secrets.sh` executed
☐ Domain values added to `.env`
☐ SMTP values added to `.env`

## 3. Launch

☐ `scripts/preflight.sh` passed
☐ `docker compose up -d --build` completed
☐ Hub reachable
☐ FreeScout reachable
☐ EspoCRM reachable
☐ InvoiceShelf reachable
☐ Formbricks reachable
☐ `scripts/smoke.sh` passed
☐ Caddy/Cloudflare HTTPS active

## 4. App setup

☐ FreeScout admin created
☐ FreeScout mailbox connected
☐ FreeScout test inbound email received
☐ FreeScout test outbound email sent
☐ EspoCRM admin created
☐ EspoCRM default pipeline created
☐ EspoCRM users created
☐ InvoiceShelf admin created
☐ Invoice/estimate settings configured
☐ Payment-status workflow configured
☐ Formbricks admin created
☐ Client intake form created
☐ Quote request form created
☐ Feedback form created

## 5. Handoff

☐ Client admin URL list delivered
☐ Admin credentials delivered through secure channel
☐ Client trained on support inbox
☐ Client trained on CRM
☐ Client trained on estimates/invoices
☐ Client trained on intake forms
☐ Backup policy explained
☐ Monthly support scope explained
☐ Client signoff captured
