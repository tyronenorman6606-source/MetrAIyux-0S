# Last Smoke Run — SovereignDocs v12

Command run:

```bash
npm run smoke:all
```

Result: passed.

Key v12 behavioral proof:

- API health exposes v12 code-core state.
- Entitlement engine returns plan/feature snapshot.
- Document lifecycle creates records.
- Document lifecycle allows valid transitions.
- Document lifecycle blocks invalid transitions.
- Packet engine assembles multi-document packets.
- Packet engine downgrades high-risk templates to prep worksheets.
- Reminder engine creates reminders.
- Reminder engine transitions reminders.
- Template operations queue accepts patch requests.
- Template operations queue transitions patch requests.
- DOCX quota blocks free-plan exports.
- Document list API returns lifecycle records.
- Append-only audit ledger verifies v12 workflows.
