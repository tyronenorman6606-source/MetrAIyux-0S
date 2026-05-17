# PgBouncer Extraction

## What matters

Serverless/edge-style apps can open too many database connections.

PgBouncer protects Postgres by pooling app connections.

## CitadelDB default

Apps should connect through PgBouncer when possible:

```text
App → PgBouncer :6432 → Postgres :5432
```

## v0.2 status

✅ PgBouncer Docker service included  
✅ PgBouncer config template included  
☐ production tuning not proven  
