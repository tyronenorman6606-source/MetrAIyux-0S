# Smoke Ledger

Use this file after deployment.

## Automated smoke

- ☐ Hub reachable
- ☐ FreeScout reachable
- ☐ EspoCRM reachable
- ☐ InvoiceShelf reachable
- ☐ Formbricks reachable
- ☐ Docker Compose services healthy/running

## Manual behavior smoke

- ☐ Created first admin account in each app
- ☐ Connected SMTP
- ☐ FreeScout can receive or create a ticket
- ☐ EspoCRM can create a lead/contact
- ☐ InvoiceShelf can create an estimate/invoice
- ☐ Formbricks can publish a form and receive a response
- ☐ Dashboard links point to production domains
- ☐ Backup script runs and artifacts exist

Do not mark production complete until the relevant behavior smoke items are actually proven.
