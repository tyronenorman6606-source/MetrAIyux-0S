# VPS Replica Runbook

This is a runbook for a future two-node/three-node VPS lane. It is not automatically executed by v0.2.

## Goal

```text
primary VPS
  ↓ streaming replication
standby VPS
  ↓ backup validation
backup/restore-test VPS
```

## Requirements

- private network or WireGuard/Tailscale
- replication role
- replication slot
- WAL retention
- tested promote command
- DNS/tunnel failover route through Veyra3.1

## Minimum commands

Create replication role:

```sql
CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD 'strong-password';
```

Add `pg_hba.conf` private network rule:

```text
host replication replicator 10.0.0.0/24 scram-sha-256
```

Create base backup on standby:

```bash
pg_basebackup -h PRIMARY_PRIVATE_IP -D /var/lib/postgresql/data -U replicator -P -R
```

Promote standby:

```bash
pg_ctl promote -D /var/lib/postgresql/data
```

## Claim rule

Do not mark failover complete until:

✅ primary killed  
✅ standby promoted  
✅ app reconnects through new route  
✅ write succeeds after failover  
✅ audit receipt saved  
