# App Migration Runbook

## Before migration

- Create CitadelDB app database.
- Generate app onboarding packet.
- Generate migration plan.
- Confirm rollback path.
- Schedule maintenance if needed.

## During migration

- Export source database.
- Import into CitadelDB target database.
- Run migrations.
- Run connection test.
- Run write-smoke.
- Switch app env.

## After migration

- Run app health checks.
- Run backup-now.
- Run restore-test.
- Generate proof packet.
- Archive rollback packet.

## Cutover rule

Do not remove the old provider until CitadelDB proof packet is accepted.
