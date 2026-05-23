# Stress Test Receipt — SignInPro NorthStar Workspace Closure v6.4.1

This receipt documents the final local stress pass added after the v6.4.0 closure package.

## Commands run

```bash
npm install --no-audit --no-fund
npm run closure:all
npm run stress:all
```

## Stress scope

The stress harness is executable at:

```bash
npm run stress:local
```

Default load:

- 72 workspaces provisioned in the in-memory NorthStar store.
- 150 attendees generated per workspace.
- 10,800 initial attendees generated.
- Every workspace is trimmed to 117 attendees to prove stale attendee mirror deletion.
- 8,424 final attendee mirror rows retained after deletion.
- 144 workspace backup snapshots created.
- 216 audit events created.
- 1,287,648 bytes of CSV export output generated.
- 72 identical `shared-attendee-id` rows are intentionally inserted across separate workspaces to prove composite workspace partitioning.

## Assertions proved

- Workspace storage prefix remains `signinpro_workspace_state_v4`.
- All workspaces/users/states provision locally.
- Duplicate emails are blocked per workspace.
- No event ID collisions occur inside a workspace.
- Attendee mirror deletion removes stale rows per workspace.
- Manual backups remain workspace-scoped.
- Audit events are created for provision/sync actions.
- State hashes change across workspace/state changes.
- CSV export does not collapse under stress state size.
- Sanitizer strips control characters and limits malicious/long input.
- Same attendee ID can exist in separate workspaces without collision or leakage.
- Read filters return only the active workspace rows.
- Viewer cannot write state or access backups.
- Viewer can read workspace audit only.
- Owner has provision permission.
- Operator does not have provision permission.
- PBKDF2 password hash verifies valid password and rejects invalid password.
- Signed session cookie verifies.
- Tampered session cookie is rejected.
- POST without CSRF is blocked.
- POST with matching CSRF passes.
- Runtime/security paths have no TODO/FIXME/stub/not-implemented markers.

## Proof artifacts

- `proof/STRESS_LOCAL_PROOF_v6.4.1.json`
- `proof/stress-local-v6.4.1-output.txt`
- `proof/stress-all-v6.4.1-output.txt`
- `proof/SHA256SUMS-workspace-v6.4.1.txt`
- `proof/file-manifest-workspace-v6.4.1.txt`

## Honest remaining gate

This proves local tenant security, provisioning, local-state isolation, backup scoping, role behavior, CSRF/session primitives, and runtime static closure. Live production proof still requires a real Netlify deployment with real `DATABASE_URL`, `SESSION_SECRET`, and `OPERATOR_PROVISION_TOKEN` injected, then testing against Neon.
