# Commercial Architecture

## Principle

Forgejo is the platform engine, not a login page. It owns Git hosting, repositories, organizations, issues, pull requests, releases, packages, wiki, API, and Actions-style runners.

SoveReign13 is the commercial control plane. It owns what Forgejo does not give you as a sellable business by itself: plan catalog, tenant/account records, owner/member records, upstream auth context, usage snapshots, billing event intake, invitations, admin audit, and provisioning hooks.

## Runtime services

- `portal`: public brand and product entry page.
- `control-plane`: commercial app/API for tenants, plans, usage, billing events, and provisioning.
- `control-db`: PostgreSQL for commercial records.
- `forgejo`: the forge engine.
- `forgejo-db`: PostgreSQL for forge data.
- `forgejo-runner`: SceptR Actions runner, disabled until registered.
- `caddy`: HTTPS reverse proxy for portal/control/forge domains.

## User journey

1. Visitor lands on the branded portal.
2. Visitor signs up through the upstream gate.
3. Gate sends the authenticated user to the control plane with trusted headers or OIDC/JWT.
4. Control plane creates an account/tenant and stores plan/member/audit records.
5. Control plane provisions a Forgejo organization using `FORGEJO_ADMIN_TOKEN`.
6. User enters Forgejo to use repos, PRs, packages, issues, wiki, releases, and CI.
7. Control plane periodically snapshots usage and records billing/meter events.

## Why not rebuild Git?

Git hosting, diff UI, pull request review, package registries, issue trackers, webhooks, API compatibility, and runners are deep systems. Forking/extending Forgejo gives you the capability layer immediately, while SoveReign13 adds your commercial moat and brand surface around it.
