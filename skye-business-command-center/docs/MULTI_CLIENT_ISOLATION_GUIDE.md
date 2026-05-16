# Multi-Client Isolation Guide

## Recommended tonight
Use one dedicated VPS or one dedicated compose project per paying client. This gives cleaner data separation and easier backups.

## Naming pattern
- Project folder: `/opt/sbcc-clients/client-slug`
- Compose project: `sbcc-client-slug`
- Domains: `ops.client.com`, `support.client.com`, `crm.client.com`, `billing.client.com`, `forms.client.com`
- Backup path: `/opt/sbcc-backups/client-slug`

## Do not do yet
Do not put multiple unrelated paying businesses inside one shared CRM/helpdesk/billing database unless the upstream app explicitly supports secure tenant isolation and you have tested it.

## Upgrade path
Once you have 5-10 clients, create a deployment controller that provisions separate folders, env files, ports, domains, and backup schedules per client.
