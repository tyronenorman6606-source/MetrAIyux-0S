# Closure Receipt — v6.4.0

## Closed locally

The build now contains executable closure work, not UI-only additions.

- `assets/app.js` has a real Provision tab in the admin menu.
- `assets/workspace-client.js` has real operator calls to `/api/operator-provision` and `/api/operator-workspaces`.
- `netlify/functions/operator-provision.mjs` creates or refreshes workspaces, users, settings, state, and audit records.
- `netlify/functions/workspace-sync.mjs` writes state snapshots, mirrors attendee upserts, deletes removed attendees, creates backups, and audits the sync.
- `scripts/provision-workspaces.mjs` provisions seed workspaces, custom JSON workspaces, or one future company from terminal.
- `scripts/closure-local-proof.mjs` executes tenant isolation proof without needing production secrets.

## Proof command

```bash
npm run closure:all
```

## Proof artifact

```txt
proof/CLOSURE_LOCAL_PROOF_v6.4.0.json
```

## Remaining gate

Live production proof still requires your Neon `DATABASE_URL`, Netlify env secrets, and a deployed Functions environment. That is the only remaining unproven layer.
