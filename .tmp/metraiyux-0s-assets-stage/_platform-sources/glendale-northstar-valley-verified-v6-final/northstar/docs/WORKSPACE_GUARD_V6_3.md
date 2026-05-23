# SignInPro NorthStar Workspace Guard v6.4.0 closure lineage

This version keeps the two-lane model but pushes it closer to production-grade tenant security.

## Lane 1 — Neon shared authority pool

Neon stores all provisioned workspaces in a shared database, but every operational table is keyed by `workspace_id`:

- `workspaces`
- `workspace_users`
- `workspace_settings`
- `workspace_states`
- `attendees`
- `workspace_audit_events`
- `workspace_login_attempts`
- `workspace_invites`
- `workspace_backups`

The app never trusts a client-supplied workspace ID for user data. The Netlify Function resolves the session from an HttpOnly cookie, validates the user, and uses `session.workspace.id` for every query.

## Lane 2 — Local per-company workspace state

Browser storage remains local-first, but the key is scoped by workspace slug:

```txt
signinpro_workspace_state_v3:<workspace-slug>
```

That prevents one client workspace from overwriting another client workspace in the same browser.

## Added in v6.4.0 closure lineage

- CSRF token in signed session payload and `x-csrf-token` header for state-changing requests.
- Role permissions: owner, admin, operator, viewer.
- Login attempt tracking and throttling by workspace/email/IP hash.
- Workspace settings table for per-company branding/app/security settings.
- Workspace backups table for manual/important sync snapshots.
- Workspace audit endpoint scoped to the signed-in workspace.
- Workspace users endpoint for owner/admin user management.
- Schema-level database-side RLS guard policy notes for future per-tenant DB roles.

## Honest security boundary

This is strong enough for free infrastructure pilots and controlled client workspaces. It is not yet a regulated SaaS platform for HIPAA, PCI, or sensitive identity records. Do not store protected health, card, Social Security, or legally sensitive data without a compliance review.
