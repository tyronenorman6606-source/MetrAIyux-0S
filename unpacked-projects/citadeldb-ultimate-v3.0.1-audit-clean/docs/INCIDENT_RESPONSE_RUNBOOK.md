# Incident Response Runbook

## Database unavailable

1. Check gateway health.
2. Check Postgres container/pod health.
3. Check disk space.
4. Check connection count.
5. Check recent jobs and audit events.
6. If unrecoverable, restore latest backup to clean host.
7. Save incident receipt.

## Credential leak

1. Rotate app credential.
2. Update app env.
3. Restart app.
4. Run app write smoke.
5. Review audit events.
6. Revoke old credentials.
7. Save credential rotation receipt.

## Bad migration

1. Stop writes.
2. Restore from last known good backup or rollback app code.
3. Run count verification.
4. Run app write smoke.
5. Mark migration receipt failed.
6. Record rollback receipt.

## Backup failure

1. Run backup manually.
2. Run integrity manifest.
3. Run restore-test.
4. Check disk/object storage.
5. Escalate if no valid restore point exists.
