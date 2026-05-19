# Doctor Ops Platform API / Data Contract

This build intentionally avoids login/auth. The platform expects identity, tenant, and role context to arrive from an upstream system.

Accepted upstream context inputs:

1. `window.UPSTREAM_AUTH_CLAIM = { workspace, tenant, org, operator, role }`
2. Query parameters: `?workspace=...&tenant=...&org=...&operator=...&role=...`
3. LocalStorage key: `doctor_ops_platform:upstream_claim`

Workspace import/export envelope:

```json
{
  "exportedAt": "2026-05-10T00:00:00.000Z",
  "platformVersion": "2.0.0-platform-dashboard",
  "workspace": {
    "id": "clinic-alpha",
    "name": "Clinic Alpha Operations",
    "operator": "Ops Lead",
    "upstreamMode": "pass-through"
  },
  "apps": {
    "intake-triage-ops": {
      "records": [],
      "audit": [],
      "versions": [],
      "receipts": [],
      "meta": {}
    }
  }
}
```

Record import rules:

- Single app imports accept either an array of records, `{ "records": [] }`, or a full workspace export containing the current app slug.
- Existing records merge by `id` first, then by generated fingerprint where available.
- Every import creates an audit entry, receipt, and version snapshot.

Platform route map:

- `/index.html` — command dashboard and workspace import/export
- `/apps/*.html` — individual workflow surfaces
- `/contracts/workspace-seed.schema.json` — import/export data shape
- `/seed-packs/example-workspace-seed.json` — seed example
- `/proof/smoke-static.mjs` — no-dependency static proof
