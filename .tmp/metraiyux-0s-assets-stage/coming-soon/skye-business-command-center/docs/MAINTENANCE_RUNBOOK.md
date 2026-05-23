# Maintenance Runbook

Monthly support is a product feature. Run it consistently.

## Weekly checks
- `docker compose ps`
- `bash scripts/health-report.sh`
- Confirm disk usage is below 75%.
- Confirm support mailbox still receives mail.
- Confirm backups exist.

## Monthly checks
- Run a test intake form.
- Create a test support ticket.
- Review inactive staff users.
- Review CRM stages and stale leads with the client.
- Review invoice/estimate templates.
- Confirm SSL renewal is healthy.
- Send a monthly client report.

## Update rule
Backup before every update. Never update all client instances at once. Update one low-risk instance first, test it, then proceed.

## Red flags
- Disk above 85%.
- SMTP failures.
- Failed backups.
- Unknown admin users.
- Public app without HTTPS.
- Client data mixed across separate customers without intentional tenant design.
