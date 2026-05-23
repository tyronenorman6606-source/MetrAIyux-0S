# SovereignDocs v14 Last Smoke Run

Command run:

```bash
npm run smoke:all
```

Result: PASS.

Key proof points:

- 10,200 v2.1 source-truth template records still wired.
- 15 categories and 51 jurisdictions still wired.
- 37 official-source workflows still wired.
- 6,069 high-risk records remain governed/admin-review-only.
- 20,716 crawlable index pages checked.
- Internal link check passed.
- Public overclaim scan passed.
- Public copy scan passed.
- v9 legal partner review workflow still passes.
- v10 competitive-core workflow still passes.
- v13 workflow surfaces still pass.
- SkyeDocxMax bundled app serves at `/skye-docx-max/app/`.
- SkyeDocxMax bridge imports `sd_handoff` payloads.
- Full handoff payloads are persisted/retrievable.
- Handoff-open audit events are recorded.
- SkyeDocxMax return packages create SovereignDocs document lifecycle records.
- Append-only audit ledger verifies v14 editor events.

Runtime data was cleaned after proof so the shipped zip does not include smoke-created handoff, return, order, review, reminder, or document rows.
