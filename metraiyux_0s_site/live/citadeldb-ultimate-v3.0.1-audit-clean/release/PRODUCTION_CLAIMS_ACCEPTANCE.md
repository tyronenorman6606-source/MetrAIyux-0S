# Production Claims Acceptance

## Rule

A production claim requires a matching receipt.

## Claim matrix

| Claim | Required receipt |
|---|---|
| VPS deployed | vps-preflight, health, first-production-pass |
| backups work | backup receipt + manifest |
| restore works | restore-test receipt |
| app migrated | cutover + write smoke + backup |
| object backup works | object-backup-sync receipt |
| dashboard works | Playwright browser proof |
| PITR works | PITR timestamp restore receipt |
| HA works | failover proof receipt |

## No receipt

The claim remains open.
