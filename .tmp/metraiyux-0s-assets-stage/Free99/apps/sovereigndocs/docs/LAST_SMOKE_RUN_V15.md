# SovereignDocs v15 Last Smoke Run

Command executed before runtime cleanup:

```bash
npm run smoke:all
```

Result: passed.

Key v15 proof:

- `server/case-workflows.mjs` exists.
- `case-command-center/index.html` exists.
- `GET /api/case-statuses` works.
- `POST /api/cases/start` creates a case, document records, packet record, SkyeDocxMax launch handoff, and optional legal-review submission.
- Mixed low/high-risk case workflow downgrades high-risk template members to prep worksheets.
- Opening the SkyeDocxMax handoff advances the case to `opened_in_skye_docx_max`.
- Returning edited content from SkyeDocxMax advances the case to `returned_from_skye_docx_max` and creates a document lifecycle record.
- `POST /api/cases/:id/advance` advances case workflow state.
- `GET /api/workspace/summary` includes cases.
- Audit ledger verifies v15 workflow events.
- Internal link check passed.
- Public overclaim scan passed.
- Public copy scan passed.

Runtime data was cleaned after proof so the zip does not ship smoke-generated case, handoff, return, order, reminder, review, vault, audit, or signature records.
