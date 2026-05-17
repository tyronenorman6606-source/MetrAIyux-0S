# Update and Rollback Runbook

## Before update
1. Announce maintenance window if client-facing.
2. Run `bash scripts/health-report.sh`.
3. Run `bash scripts/backup.sh`.
4. Confirm backup artifact exists.

## Update
Run `bash scripts/update-stack.sh`.

## After update
Run `bash scripts/smoke.sh` and `bash scripts/acceptance.sh`.

## Rollback
Run `bash scripts/rollback.sh` to return to previous container/image state when possible.

## Restore
Use `bash scripts/restore.sh <backup-file>` only when data restore is required. This is higher risk than rollback and should be documented.
