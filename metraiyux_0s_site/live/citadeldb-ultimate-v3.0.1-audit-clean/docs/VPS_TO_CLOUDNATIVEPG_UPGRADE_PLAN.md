# VPS to CloudNativePG Upgrade Plan

## Goal

Move from lean serious VPS Postgres to HA Kubernetes Postgres without rewriting apps.

Apps should keep using the CitadelDB adapter and app-level env contract.

## Pre-upgrade requirements

☐ current VPS backup passes  
☐ restore-test passes  
☐ app count verification available  
☐ maintenance window selected  
☐ CloudNativePG cluster deployed  
☐ object storage backup target configured  
☐ rollback plan ready  

## Upgrade flow

1. Provision CloudNativePG cluster.
2. Create target app database/users.
3. Dump from VPS.
4. Restore into CloudNativePG.
5. Verify table counts.
6. Point app DATABASE_URL to CloudNativePG pooler.
7. Run read/write smoke.
8. Run backup on CloudNativePG.
9. Run restore proof if object backups configured.
10. Keep VPS copy for rollback until accepted.

## Claim gate

Do not claim HA until failover proof is run.
Do not claim migration complete until app writes succeed on the new cluster.
