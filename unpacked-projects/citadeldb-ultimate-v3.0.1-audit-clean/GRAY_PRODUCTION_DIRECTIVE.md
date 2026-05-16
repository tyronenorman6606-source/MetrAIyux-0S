# Gray Production Directive

Owner: Gray
Project: CitadelDB Ultimate v3.0.1
Status: Local/private proof stack exists. Public static site exists. Real always-on backend production still requires a VPS.

## Non-Negotiable Production Gate

Before claiming CitadelDB backend production for paying users, Gray must buy and provision a VPS.

Minimum serious starter VPS:

- 4 vCPU
- 8 GB RAM
- 80-160 GB SSD
- Ubuntu 24.04 LTS
- Docker and Docker Compose
- Firewall with only SSH/HTTPS exposed
- Daily off-server backups

Expected cost range:

- Lean starter: 2 vCPU / 4 GB RAM, about $20-$30/mo
- Serious starter: 4 vCPU / 8 GB RAM, about $35-$60/mo
- Backup/object storage: about $5-$20/mo extra

This local workspace is not the final production host. It is a proof and build environment.

## Build Before Production Sale

Fully code and prove these end-to-end before selling direct platform access:

- Private Postgres command center
- Managed database ops stack
- Backup and restore proof system
- Database dashboard for app owners
- Self-hosted database control plane
- White-glove database setup for businesses
- Proof-backed Postgres deployment and monitoring

## Required Product Closure

1. App database provisioning must work from dashboard and API.
2. Every created app must receive an isolated database, role, password handoff, and connection packet.
3. App owner dashboard must expose only that app's database status, connection instructions, backup/restore proofs, and smoke-test status.
4. Backup creation, restore testing, manifest generation, and service-catalog export must be runnable and visible.
5. Monitoring/readiness must show Postgres health, pooler status, backup age, restore-test age, disk/capacity, and job status.
6. Tenant/customer registry must map customers to apps, environments, and proof packets.
7. White-glove setup flow must produce a customer handoff packet with connection string, setup instructions, proof receipts, and next actions.
8. No public claim may be broader than generated receipts.

## Sellable First Offer

Sell first as a managed/private deployment, not as an open public database SaaS:

- Setup/migration fee
- Monthly managed database operations
- Backup and restore proof reports
- Private dashboard access only after auth/hardening

Suggested first packaging:

- Starter: private Postgres, PgBouncer, dashboard, backup receipts, health proof
- Business: app database provisioning, restore tests, service catalog, basic monitoring
- Managed: migration support, backup policy, monthly proof reports, incident support

## Website Revamp Gate

Do not revamp the public website until the backend product closure above is complete.

After product closure, use:

- MCP server resources where applicable
- `/workspaces/MetrAIyux-0S/skyesol_spectacle_reference`

The website revamp must reflect only proven capabilities and must not outrun the product receipts.

## Implementation Ledger

Started in this workspace:

- Added product-closure schema init for self-service, platform, commercial, and live-gate tables.
- Fixed app database provisioning so it registers app environments and returns a usable owner handoff URL.
- Added app owner dashboard packet endpoint and dashboard page.
- Added app-specific backup and restore-test scripts.
- Proved `gray_customer_02` end to end: isolated app DB, app role, connection test, write-smoke, app backup, app restore-test, and accepted owner handoff.

Still open before VPS production:

- Buy/provision the VPS.
- Point the production domain/DNS and TLS to that VPS during cutover.
- Configure app connection hostname to the VPS/private domain after the VPS IP exists.
- Keep app-owner database connections on direct private Postgres until PgBouncer dynamic app role auth is separately proven.

Code-closed in this workspace after the FS27 bridge pass:

- Dashboard/API now has a SkyegateFS13/FS27 auth bridge path through `SKYGATEFS13_URL` and `/auth-introspect`.
- Operator mutation tracking now mirrors to Skyegate `/platform/events`.
- FS27 Cloudflare edge deployment is live at `https://skyegatefs27-citadeldb.graylondonskyes.workers.dev`.
- `./cli/citadel skygate-bridge-proof` records Cloudflare FS27 event mirror receipts.
- `./cli/citadel vps-only-closure-proof gray_customer_02` records the final code-ready proof and intentionally leaves the VPS purchase/provision gate open.
- Public CitadelDB website now explains the sellable database-ops offer, packages usage as managed access, and routes signup through live SkyegateFS27 auth.
- Production website deployed to Cloudflare Pages at `https://citadeldb-ultimate.pages.dev`.
- Production-origin signup proof passed through `https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/auth/signup`, creating a Skyegate user/customer/session.
