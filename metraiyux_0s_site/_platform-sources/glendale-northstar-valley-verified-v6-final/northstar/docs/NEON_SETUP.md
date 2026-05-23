# Neon Setup — SignInPro NorthStar Workspace Closure v6.4.0

## 1. Create Neon project

Create a Neon project and copy the pooled PostgreSQL connection string.

## 2. Run schema

Open the Neon SQL editor and run:

```sql
-- paste database/schema.sql
```

This creates:

- `workspaces`
- `workspace_users`
- `workspace_settings`
- `workspace_states`
- `attendees`
- `workspace_audit_events`
- `workspace_login_attempts`
- `workspace_invites`
- `workspace_backups`
- `workspace_operational_summary`

## 3. Inject Netlify secrets

```txt
DATABASE_URL=postgresql://...
SESSION_SECRET=at-least-32-random-characters
OPERATOR_PROVISION_TOKEN=private-operator-token
SESSION_HOURS=12
COOKIE_SECURE=true
LOGIN_FAIL_LIMIT=8
LOGIN_WINDOW_MINUTES=15
AUDIT_HASH_PEPPER=another-random-secret
```

## 4. Deploy

Use a Git-connected Netlify deploy so `netlify/functions` are built and `/api/*` routes are active.

## 5. Provision workspaces

From the app: sign in as an owner/local operator, open Operator Panel → Provision, enter `OPERATOR_PROVISION_TOKEN`, then provision a single workspace or paste a JSON batch.

From terminal:

```bash
SIGNINPRO_BASE_URL=https://your-site.netlify.app OPERATOR_PROVISION_TOKEN=private-operator-token npm run admin:provision:seed
```

## 6. Prove live production

After deploy, verify:

1. Login to one workspace.
2. Check in a test guest.
3. Manual sync.
4. Confirm `workspace_states`, `attendees`, `workspace_backups`, and `workspace_audit_events` rows exist for that workspace only.
5. Login to a second workspace and confirm the first workspace guest is not visible.
