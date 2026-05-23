# CitadelDB Proof Runbook

Run these before making production claims.

## VPS lane

```bash
cp .env.example .env
nano .env
docker compose -f deploy/vps-postgres/docker-compose.yml up -d
./cli/citadel health
./cli/citadel provision proofapp
./cli/citadel migrate proofapp migrations/smoke-app
./cli/citadel backup-now
./cli/citadel restore-test
./cli/citadel smoke-all
```

Proof files should appear in:

```text
proof/
```

## Required receipts

✅ health receipt  
✅ provision receipt  
✅ migration receipt  
✅ backup receipt  
✅ restore-test receipt  
✅ smoke-all receipt  

## CloudNativePG lane

```bash
kubectl apply -f deploy/cloudnativepg/namespace.yaml
kubectl apply -f deploy/cloudnativepg/secrets.yaml
kubectl apply -f deploy/cloudnativepg/cluster.yaml
kubectl apply -f deploy/cloudnativepg/pooler.yaml
kubectl apply -f deploy/cloudnativepg/backup-schedule.yaml
```

Then run:

```bash
cat deploy/cloudnativepg/FAILOVER_PROOF_RUNBOOK.md
```

## Claim gate

Do not say:

- "HA proven" without CloudNativePG failover receipt.
- "PITR proven" without timestamped restore receipt.
- "R2/S3 backups proven" without object-store backup receipt.
- "hosted database replacement complete" without migrating a real app and writing through the new DB.
