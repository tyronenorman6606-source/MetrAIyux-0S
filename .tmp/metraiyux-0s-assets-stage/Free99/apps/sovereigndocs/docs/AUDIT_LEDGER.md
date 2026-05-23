# Append-Only Audit Ledger

API actions now write to `data/audit-ledger.ndjson`.

Each event contains:

- id
- type
- detail
- timestamp
- session context
- previous hash
- current event hash

The API exposes verification at:

```txt
GET /api/audit/ledger
```

This is still a local-file development ledger until Neon/D1 is activated, but the event shape is ready for production persistence.
