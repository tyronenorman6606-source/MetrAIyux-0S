# Operator Handoff Guide

## Product

CitadelDB Ultimate by Skyes Over London.

## What the operator owns

- `.env` secrets
- private network exposure
- backup schedule
- restore testing
- dashboard access boundary
- app database provisioning
- app migration receipts
- policy findings
- incident response

## First commands

```bash
cp .env.production.example .env
./cli/citadel vps-preflight
./cli/citadel validate-env
make prod-up
./scripts/first-production-pass.sh
```

## Daily/weekly operating loop

Daily:

```bash
./cli/citadel health
./cli/citadel policy-check
```

Weekly:

```bash
./cli/citadel backup-now
./cli/citadel restore-test
./cli/citadel backup-manifest
```

Before claims:

```bash
./cli/citadel final-release-gate
```

## Rule

Do not delete old database providers until CitadelDB write smoke, backup, and restore-test receipts exist.
