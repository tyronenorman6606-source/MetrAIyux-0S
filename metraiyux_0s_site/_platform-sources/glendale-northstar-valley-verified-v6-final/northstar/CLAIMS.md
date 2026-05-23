# Claims — SignInPro NorthStar Workspace Closure v6.4.0

✅ Provides a workspace login gate for provisioned companies.
✅ Stores each company's local workspace data under `signinpro_workspace_state_v4:<workspace-slug>`.
✅ Backs workspace data into Neon through `DATABASE_URL` when configured.
✅ Separates Neon rows by `workspace_id` across workspaces, users, settings, states, attendees, backups, and audit events.
✅ Mirrors attendee additions, updates, and deletions into the Neon `attendees` table by workspace.
✅ Provides role-based permissions for owner/admin/operator/viewer.
✅ Uses signed HttpOnly session cookies.
✅ Adds CSRF token validation for state-changing workspace endpoints.
✅ Tracks audit events and login attempts.
✅ Includes an admin-menu Provision tab for future workspaces.
✅ Includes a CLI provisioner for seeded clients, custom JSON files, and one-off future companies.
✅ Includes schema, seed data, setup docs, and local closure proof scripts.

Not claimed:

☐ Live Neon production behavior is not claimed until your actual `DATABASE_URL` and Netlify env secrets are injected and tested.
☐ This is not a billing SaaS; it is NorthStar-provided infrastructure with workspace isolation.
☐ This is not approved for HIPAA/PCI/sensitive regulated records without further compliance review.

## v6.4.1 Stress-Tested Claim

✅ Local workspace stress test passed with 72 workspaces and 10,800 generated attendees.
✅ Tenant read filters were stress-tested and did not expose cross-workspace attendee rows.
✅ Composite workspace/attendee partition behavior was stress-tested by inserting the same attendee ID into every workspace.
✅ Role, CSRF, session, password hash, backup, audit, CSV, sanitization, and deletion-mirror behavior were stress-tested locally.

Live Neon production behavior remains gated until real environment secrets are injected and the deployed functions are exercised against Neon.
