# Live Deployment Acceptance Packet

Use this as the acceptance packet after installing CitadelDB on a VPS.

## Required receipts

```text
proof/vps-preflight-*.txt
proof/health-*.txt
proof/policy-check-*.txt
proof/backup-*.txt
proof/restore-test-*.txt
proof/backup-manifest-*.txt
proof/public-architecture-guard-*.txt
proof/final-release-gate-*.txt
```

## Required commands

```bash
./cli/citadel vps-preflight
./cli/citadel validate-env
make prod-up
./cli/citadel health
./cli/citadel policy-check
./cli/citadel backup-now
./cli/citadel restore-test
./cli/citadel backup-manifest
./cli/citadel final-release-gate
```

## Acceptance statement

```text
CitadelDB Ultimate v1.0 is accepted on this server only after required receipts exist and are archived.
```
