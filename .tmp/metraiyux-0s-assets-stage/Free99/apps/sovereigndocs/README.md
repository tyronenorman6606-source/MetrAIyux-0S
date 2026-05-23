# SovereignDocs v20 Platform

SovereignDocs v20 is the current governed document automation platform. It includes the public website refresh, source-truth template library, guided builders, case workflows, template governance, partner review routing, SkyeDocxMax-powered document editing, branded exports, workspace/vault surfaces, audit events, and upstream-gateway session enforcement.

It keeps the v2.1 source-truth template library, governed publish lanes, official-source workflow routing, legal-partner review submissions, business formation/compliance workflows, order tracking, DOCX export in API mode, append-only audit events, signed upstream session support, bundled SkyeDocxMax runtime integration, end-to-end case workflows, and case operations.

The current package layers v20 website and public-copy cleanup on top of the v18/v19 workflow engine: modular route ownership, tenant-scoped case/state/update/notes/artifacts/closure endpoints, role-aware closure dashboards, SkyeDocxMax case launch and return-to-case reconciliation, workflow anchors/return contracts, premium workflow surfaces, and E2E proof that verifies cross-tenant case access is blocked.

SovereignDocs is not a law firm, does not provide legal advice, does not guarantee partner review acceptance or outcome, does not guarantee official filing acceptance, and does not guarantee enforceability or compliance.

## Run

```bash
npm start
```

Open:

```txt
http://localhost:8787
```

## Main workflow surfaces

- `/intake-wizard/`
- `/case-command-center/`
- `/closure-dashboard/`
- `/case-timeline/`
- `/client-status/`
- `/reviewer-notes/`
- `/case-export/`
- `/work-queues/`
- `/skye-docx-max/`
- `/partner-workbench/`
- `/customer-dashboard/`

## API workflow surface

- `GET /api/v18/workspace/dashboard`
- `GET /api/v18/cases`
- `GET /api/v18/cases/:id/state`
- `PATCH /api/v18/cases/:id`
- `POST /api/v18/cases/:id/notes`
- `POST /api/v18/cases/:id/artifacts`
- `GET /api/v18/cases/:id/closure-summary`
- `POST /api/v18/cases/:id/open-in-skye-docx-max`
- `GET /api/v18/editor/skye-docx-max/handoff/:id/map`
- `POST /api/v18/editor/skye-docx-max/return-to-case`

## Proof

```bash
npm run smoke:all
```

Focused closure proof:

```bash
npm run smoke:v18
```

Full browser-style closure path:

```bash
node scripts/e2e-v18-closure-flow.mjs
```

## Upstream identity posture

SovereignDocs inherits identity from the shared 0S/SkyGate lane by design. In production, signed upstream session tokens are required for protected control-plane routes and workflow records are scoped by user/org. The app-local development adapter remains available for local proof, while production identity belongs to the mounted gateway.
