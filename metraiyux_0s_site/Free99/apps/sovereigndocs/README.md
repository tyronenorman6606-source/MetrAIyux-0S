# SovereignDocs v18 Closure Work

SovereignDocs v18 is a repo-ready working base for a self-help document automation, case workflow, template governance, partner review, and SkyeDocxMax-powered document editing platform.

It keeps the v2.1 source-truth template library, governed publish lanes, official-source workflow routing, legal-partner review submissions, business formation/compliance workflows, order tracking, DOCX export in API mode, append-only audit events, upstream-auth-ready hardening, bundled SkyeDocxMax runtime integration, end-to-end case workflows, and case operations.

v18 adds closure work on top of v17: stricter modular route ownership, v18 tenant-scoped case/state/update/notes/artifacts/closure endpoints, a role-aware closure dashboard, SkyeDocxMax case launch and return-to-case reconciliation, v18 workflow anchors/return contracts, and a full E2E proof that verifies cross-tenant case access is blocked.

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

## v18 API additions

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

Focused v18 proof:

```bash
npm run smoke:v18
```

Full browser-style closure path:

```bash
node scripts/e2e-v18-closure-flow.mjs
```

## Upstream auth posture

No built-in login is included. SovereignDocs expects upstream auth. In production, signed upstream session tokens should be required and every workflow record should be scoped by user/org. v18 adds stricter tenant isolation for its closure routes and proves cross-tenant case access is blocked.
