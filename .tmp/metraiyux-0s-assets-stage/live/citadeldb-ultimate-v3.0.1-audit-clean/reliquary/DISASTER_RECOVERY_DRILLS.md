# Disaster Recovery Drills

## Drill A: Restore latest backup to temporary DB

```bash
./cli/citadel backup-now
./cli/citadel restore-test
```

Pass condition: restore receipt generated, temp DB accepts `SELECT 1`, backup receipt updates to `passed`.

## Drill B: Clean-server restore

1. Provision clean VPS.
2. Install Docker and Postgres client tools.
3. Clone CitadelDB.
4. Restore `.env`.
5. Copy latest dump into `backups/manual`.
6. Run:

```bash
docker compose -f deploy/vps-postgres/docker-compose.yml up -d postgres
./scripts/restore-dump.sh backups/manual/YOUR.dump citadel
./cli/citadel health
```

## Drill C: CloudNativePG failover

Use `deploy/cloudnativepg/FAILOVER_PROOF_RUNBOOK.md`.
