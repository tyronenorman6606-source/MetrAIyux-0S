# Neon to CitadelDB Migration Tooling

## Required env

```env
NEON_DATABASE_URL=postgres://...
CITADEL_TARGET_DATABASE_URL=postgres://...
```

## Commands

```bash
./tools/neon-migration/dump-neon.sh
./tools/neon-migration/restore-to-citadel.sh exports/neon/neon-export-latest.dump
./tools/neon-migration/verify-counts.sh
```

## Claim gate

Do not say a Neon app is migrated until dump, restore, app env swap, write smoke, count verification, and rollback path are complete.
