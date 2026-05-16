# Database Maintenance Runbook

## Weekly

```bash
./cli/citadel backup-now
./cli/citadel restore-test
./reliquary/verify-backup-integrity.sh
./cli/citadel readiness
```

## Monthly

- Review slow queries.
- Review database size.
- Review connection counts.
- Rotate app credentials where needed.
- Run clean-server restore drill if paid-client infrastructure.

## Before app migration

```bash
./tools/create-app-onboarding-packet.sh APP
./tools/neon-migration/dump-neon.sh
./tools/neon-migration/restore-to-citadel.sh
./tools/neon-migration/verify-counts.sh
```

## Before claiming HA

Run CloudNativePG failover proof.
