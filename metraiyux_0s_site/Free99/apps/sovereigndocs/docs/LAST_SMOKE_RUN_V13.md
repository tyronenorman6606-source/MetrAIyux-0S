# Last Smoke Run — SovereignDocs v13

Date: 2026-05-10

Command:

```bash
npm run smoke:all
```

Result: PASS.

Key proof:

- 10,200 source-truth template records wired.
- 15 categories and 51 jurisdictions wired.
- 37 official-source workflows wired.
- 6,069 high-risk records governed.
- 20,715 crawlable index pages checked.
- Internal link check passed.
- Public overclaim scan passed.
- Public copy scan passed.
- Workspace summary API passed.
- SkyeDocx Max editor-slot config and handoff passed.
- Packet builder assembled a multi-template packet and downgraded high-risk members to prep worksheets.
- Reminder center created and transitioned reminders.
- Partner workbench routed and returned a review submission.
- Template ops submitted, approved, and applied a patch override.
- Applied template override surfaced through search adapter.
- Append-only audit ledger verified v13 workflow events.

After proof, `npm run clean:runtime` was run so the repo handoff does not ship smoke-created runtime rows.
