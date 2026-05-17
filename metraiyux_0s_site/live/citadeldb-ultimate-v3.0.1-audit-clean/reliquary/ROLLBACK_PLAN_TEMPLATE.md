# Rollback Plan Template

## App

```text
App slug:
Database:
Current engine:
Previous database provider:
```

## Rollback trigger

Rollback if any of these occur:

- app cannot connect
- write smoke fails
- critical table counts mismatch
- data corruption suspected
- unacceptable latency
- production user-impacting errors

## Rollback steps

1. Stop writes or place app in maintenance.
2. Restore prior DATABASE_URL.
3. Restart app.
4. Run read smoke.
5. Run write smoke.
6. Save rollback receipt.
7. Do not destroy CitadelDB migrated copy until analysis is complete.

## Receipt

Save to:

```text
proof/rollback-APP-YYYYMMDDTHHMMSSZ.txt
```
