# CloudNativePG Failover Proof Runbook

Do not claim HA is proven until this is run.

## 1. Baseline

```bash
kubectl cnpg status citadeldb-ha -n citadeldb
```

Record primary pod.

## 2. Write baseline

```bash
kubectl exec -n citadeldb -it CLUSTER_PRIMARY_POD -- psql -U citadel_admin -d citadel -c \
"CREATE TABLE IF NOT EXISTS failover_proof(id bigserial primary key, note text, created_at timestamptz default now()); INSERT INTO failover_proof(note) VALUES('before failover');"
```

## 3. Kill primary pod

```bash
kubectl delete pod -n citadeldb CLUSTER_PRIMARY_POD
```

## 4. Watch failover

```bash
kubectl cnpg status citadeldb-ha -n citadeldb
```

## 5. Write after failover

```bash
kubectl exec -n citadeldb -it NEW_PRIMARY_POD -- psql -U citadel_admin -d citadel -c \
"INSERT INTO failover_proof(note) VALUES('after failover'); SELECT * FROM failover_proof ORDER BY id DESC LIMIT 5;"
```

## 6. Receipt

Save output to:

```text
proof/cloudnativepg-failover-YYYYMMDD.txt
```

Claim only after successful before/after writes.
