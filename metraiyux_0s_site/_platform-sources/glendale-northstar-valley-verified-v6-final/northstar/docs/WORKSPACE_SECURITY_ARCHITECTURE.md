# SignInPro NorthStar Workspace Security Architecture v6.4.0 closure lineage

## Goal

SignInPro is now structured as a free-infrastructure, workspace-provisioned app rather than a public shared kiosk. It is not a full SaaS billing platform, but it uses tenant security patterns so every client company gets a separated workspace.

## Two storage lanes

### Lane 1 — NorthStar main Neon pool

The shared Neon database stores:

- workspaces
- workspace users
- current workspace state snapshots
- attendee rows by workspace ID
- workspace audit events

All reads/writes are scoped by the signed session cookie. The browser never sends a trusted workspace ID for sync writes. The server derives workspace ID from the HttpOnly session.

### Lane 2 — per-company local workspace

The browser stores a local copy under a workspace-specific key:

```txt
signinpro_workspace_state_v2:<workspace-slug>
```

This lets each company keep a fast local kiosk/operator workflow. The local lane backs up to Neon when sync is enabled.

## Login model

Client users sign in with:

- workspace slug
- email
- password

The server verifies the user against Neon, then sets an HttpOnly `sip_session` cookie. The frontend cannot read or forge that cookie.

## Provisioning

Operator provisioning is protected by `OPERATOR_PROVISION_TOKEN`.

Provision one workspace:

```bash
curl -X POST "$SIGNINPRO_BASE_URL/api/operator-provision" \
  -H "Authorization: Bearer $OPERATOR_PROVISION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Chicken N Pickle Westgate","slug":"chicken-n-pickle-westgate","ownerEmail":"operator+chicken-n-pickle-westgate@northstar.local"}'
```

Provision all seeded companies:

```bash
npm install
SIGNINPRO_BASE_URL=https://your-site.netlify.app \
OPERATOR_PROVISION_TOKEN=your-secret-token \
npm run seed:workspaces
```

The seed script writes `provisioned-workspaces.secret.json`. Keep that file private.

## Required env vars

```txt
DATABASE_URL=postgresql://...neon...
SESSION_SECRET=<32+ character random secret>
OPERATOR_PROVISION_TOKEN=<random operator provisioning token>
SESSION_HOURS=12
COOKIE_SECURE=true
```

Use Netlify environment variables or your platform's secret injection. Do not commit these values.

## Security boundaries

- Customers only see the workspace attached to their signed session.
- LocalStorage is namespaced by workspace slug.
- Sync writes use server-side session workspace ID, not client-provided workspace ID.
- Passwords are PBKDF2-hashed with per-user salts.
- Sessions are HMAC-signed and HttpOnly.
- The app remains no-payment, no-billing, and no SaaS subscription engine unless you add that later.

## Current non-goals

- No multi-factor authentication yet.
- No team invitation email sender yet.
- No per-field compliance engine yet.
- No HIPAA/medical protected data mode. Avoid collecting protected health data until compliance is designed.
