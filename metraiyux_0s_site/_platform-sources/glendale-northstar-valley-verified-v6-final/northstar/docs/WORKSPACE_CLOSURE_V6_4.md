# Workspace Closure v6.4.0

## Architecture

SignInPro now runs as a NorthStar-managed workspace system.

### Lane 1 — Neon authority pool

All companies live in one shared Neon database. Every row that belongs to a company carries `workspace_id`. Server functions never accept a client-provided workspace ID for protected reads/writes; they derive the workspace from the signed session cookie and database lookup.

### Lane 2 — Local company workspace

Each device stores only the active workspace under:

```txt
signinpro_workspace_state_v4:<workspace-slug>
```

The local state is useful for lobby tablets and event desks. When sync is enabled, the local state backs up to Neon and mirrors attendee rows into the central pool by workspace.

## Security boundaries

- HttpOnly signed session cookie.
- CSRF token for protected writes.
- Workspace ID resolved server-side.
- Role permission checks on every protected API.
- Attendee mirror upsert/delete scoped by `workspace_id`.
- Backups scoped by `workspace_id`.
- Audit events scoped by `workspace_id`.
- Login throttling by workspace slug, email, and hashed IP.
- Operator provisioning requires `OPERATOR_PROVISION_TOKEN`.

## Admin provisioning

The admin menu includes a Provision tab for owner/local operator sessions. It calls the same live endpoint as the terminal script:

```txt
POST /api/operator-provision
Authorization: Bearer <OPERATOR_PROVISION_TOKEN>
```

That endpoint creates or refreshes:

- workspace
- owner/admin/operator/viewer user
- workspace settings
- initial workspace state
- audit event

## Proof included

Run:

```bash
npm run closure:all
```

The closure proof validates:

- version and storage prefix
- local provisioning of current and future workspaces
- tenant-separated state reads
- attendee mirror deletion when local state changes
- workspace-scoped backups
- admin menu provisioning wiring
- real operator API wiring
- seed workspace coverage

## Remaining production gate

Live Neon behavior requires your actual `DATABASE_URL` and Netlify deployment. The package does not claim live database proof until those secrets are injected and tested against production.
