# Data Separation Policy

For early commercial deployments, use dedicated instances per paying client unless a formal multi-tenant architecture has been built and tested.

## Dedicated instance standard
Each client should have separate environment variables, volumes, database credentials, app admin accounts, backups, and domains/subdomains.

## Shared infrastructure warning
Running multiple clients inside one shared app can create data exposure risk if permissions, tenants, or admin boundaries are misconfigured.

## Recommendation
Starter and Business packages can share the same physical VPS only if each client runs a separate Compose project and separate volumes/databases. Higher-tier clients should receive a dedicated VPS.
