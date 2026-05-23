# SovereignDocs v15 End-to-End Case Workflows

v15 adds a case workflow engine on top of the v14 SkyeDocxMax integration. The goal is to make SovereignDocs behave like an operating system for a document matter, not isolated screens.

## New runtime concepts

- Case records track the entire workflow from intake through generated documents, packet assembly, SkyeDocxMax handoff, SkyeDocxMax return, partner-review submission, signature packet, completion, archive, or void.
- Case workflows remain bounded by the self-help / not-legal-advice policy.
- High-risk records are still downgraded to prep worksheets unless a review decision allows more.
- Partner review remains a routing/submission lane only. SovereignDocs does not guarantee partner acceptance, review outcome, compliance, enforceability, filing acceptance, or attorney-client relationship.

## New files

- `server/case-workflows.mjs`
- `case-command-center/index.html`
- `data/case-records.json`
- `scripts/smoke-v15-end-to-end-case.mjs`

## New APIs

- `GET /api/case-statuses`
- `GET /api/cases`
- `GET /api/cases/:id`
- `POST /api/cases/start`
- `POST /api/cases/:id/advance`

## End-to-end flow

`POST /api/cases/start` accepts one or more template IDs, builds document lifecycle records, creates a packet when needed, creates a SkyeDocxMax handoff, and optionally creates a legal partner-review submission.

The returned `launchUrl` opens the bundled SkyeDocxMax runtime with the stored handoff token.

When SkyeDocxMax opens the handoff, SovereignDocs advances the case to `opened_in_skye_docx_max`.

When SkyeDocxMax returns the edited package, SovereignDocs creates a returned document lifecycle record and advances the case to `returned_from_skye_docx_max`.

## Smoke proof

Run:

```bash
npm run smoke:v15
npm run smoke:all
```

The v15 smoke starts a mixed-risk Arizona case, verifies the high-risk member becomes a prep worksheet, opens it in SkyeDocxMax, returns an edited package, advances the case, checks the dashboard summary, and verifies the audit ledger.
