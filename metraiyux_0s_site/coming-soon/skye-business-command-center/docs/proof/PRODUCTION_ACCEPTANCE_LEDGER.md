# Production Acceptance Ledger

Use this document after every client launch. Mark only verified items as complete.

## Infrastructure
☐ VPS provisioned with correct region and disk size.
☐ Firewall allows only SSH, HTTP, HTTPS, and required admin ports.
☐ Docker and Compose installed.
☐ Project deployed under `/opt/skye-business-command-center` or client-specific path.
☐ `.env` contains no CHANGE_ME or placeholder secrets.

## DNS/HTTPS
☐ DNS records point to server.
☐ Caddy or reverse proxy configured.
☐ HTTPS works for hub, support, CRM, billing, and forms.
☐ HTTP redirects to HTTPS.

## Apps
☐ Hub loads.
☐ Setup walkthrough loads.
☐ Command Center loads.
☐ FreeScout first-run/admin setup complete.
☐ EspoCRM first-run/admin setup complete.
☐ InvoiceShelf first-run/admin setup complete.
☐ Formbricks first-run/admin setup complete.

## Business workflow
☐ At least one test lead exists in CRM.
☐ Support mailbox receives an inbound test email.
☐ Support reply sends outbound email.
☐ Quote request form submits successfully.
☐ Invoice/estimate template is configured.
☐ Client handoff document delivered.

## Backup/proof
☐ `scripts/backup.sh` ran successfully.
☐ Backup archive exists and has non-zero size.
☐ `scripts/health-report.sh` generated a report.
☐ `scripts/acceptance.sh` passed expected public routes.
