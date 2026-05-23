# SignInPro NorthStar Workspace Closure v6.4.0

NorthStar-managed, workspace-secure SignInPro build for client check-in deployments.

This is not a generic SaaS shell. It is a real two-lane infrastructure build:

1. **Neon authority lane** — all workspaces, users, settings, state snapshots, attendee mirrors, backups, login attempts, and audit events are stored in one shared Neon pool through `DATABASE_URL`.
2. **Local workspace lane** — every browser/device stores only the signed-in company workspace under `signinpro_workspace_state_v4:<workspace-slug>`, then backs that workspace state up to Neon when connected.

## Closed in v6.4

- Client/workspace login gate with signed HttpOnly session cookie.
- Server-side workspace lookup on every protected API request.
- CSRF token required for state-changing workspace endpoints.
- Role permissions: owner, admin, operator, viewer.
- Workspace-scoped local storage key upgraded to v4.
- Neon sync now mirrors attendee additions, updates, and deletions by `workspace_id`.
- Manual sync creates workspace-scoped backup snapshots.
- Admin menu now includes a real **Provision** tab for future companies.
- CLI provisioner supports seed files, custom JSON arrays, and one-off future companies.
- Local closure proof script validates tenant isolation, local storage separation, backup separation, attendee mirror deletion, and provisioner wiring.

## Required environment secrets

```txt
DATABASE_URL=postgresql://your-neon-connection-string
SESSION_SECRET=at-least-32-random-characters
OPERATOR_PROVISION_TOKEN=your-private-operator-token
SESSION_HOURS=12
COOKIE_SECURE=true
LOGIN_FAIL_LIMIT=8
LOGIN_WINDOW_MINUTES=15
AUDIT_HASH_PEPPER=random-audit-hash-secret
```

## Local closure proof

```bash
npm run closure:all
```

The proof output is written to:

```txt
proof/CLOSURE_LOCAL_PROOF_v6.4.0.json
```

## Neon deploy path

1. Run `database/schema.sql` in Neon.
2. Add the required secrets to Netlify.
3. Deploy from Git so Netlify Functions are live.
4. Provision client workspaces from the app admin Provision tab or from the CLI.

## Provision seeded client workspaces

```bash
SIGNINPRO_BASE_URL=https://your-site.netlify.app OPERATOR_PROVISION_TOKEN=your-private-token npm run admin:provision:seed
```

## Provision one future company from terminal

```bash
SIGNINPRO_BASE_URL=https://your-site.netlify.app OPERATOR_PROVISION_TOKEN=your-private-token npm run admin:provision -- --workspace "Future Company|future-company|owner@futurecompany.com"
```

The provisioner writes private credentials to `provisioned-workspaces.secret.json`. Do not commit or publish that file.

## Remaining gate

The only remaining unproven gate is live production proof against your actual Neon `DATABASE_URL` and deployed Netlify Functions. Everything else included in this package is locally inspected and proven by the bundled scripts.


## Final stress test

Run the full local closure and stress proof:

```bash
npm install --no-audit --no-fund
npm run stress:all
```

The stress proof writes:

- `proof/STRESS_LOCAL_PROOF_v6.4.1.json`
- `proof/stress-all-v6.4.1-output.txt`
- `docs/STRESS_TEST_RECEIPT_V6_4_1.md`

Default stress load: 72 workspaces, 10,800 generated attendees, 8,424 post-trim mirrored attendee rows, 144 backups, and 216 audit events.
