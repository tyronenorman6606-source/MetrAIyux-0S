# First Client Launch Playbook

This is the paid-client launch order for Skye Business Command Center.

## Positioning
Sell this as a configured business operations portal: CRM, shared inbox, tickets, forms, estimates/invoices, dashboard, training, hosting, backups, and monthly support. Do not sell it as a proprietary clone, payment gateway, bank, legal tool, accounting certification product, or compliance guarantee.

## Deployment order
1. Complete `docs/CLIENT_ONBOARDING_QUESTIONNAIRE.md`.
2. Decide dedicated instance vs shared infrastructure. First paid clients should use dedicated instances.
3. Register or connect domain and subdomains.
4. Provision VPS.
5. Install Docker using `scripts/bootstrap-ubuntu.sh` if needed.
6. Copy this package to the server.
7. Copy `.env.example` to `.env` and run `scripts/generate-secrets.sh`.
8. Fill in domains, SMTP, database secrets, and public URLs.
9. Run `scripts/preflight.sh`.
10. Run `docker compose up -d --build`.
11. Complete first-run installers/admin setup inside each app.
12. Run `scripts/smoke.sh` and `scripts/acceptance.sh`.
13. Run `scripts/health-report.sh`.
14. Configure backups with cron.
15. Send `docs/CLIENT_HANDOFF.md` to client.

## Done means
The owner can log in, receive a real support request, create or advance a lead, submit an intake form, create an estimate or invoice, and knows how to request support.
