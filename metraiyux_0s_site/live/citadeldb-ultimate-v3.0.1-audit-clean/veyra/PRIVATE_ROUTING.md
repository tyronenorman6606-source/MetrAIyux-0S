# Veyra3.1 Private Routing Layer

CitadelDB should not expose Postgres publicly.

Preferred access models:

1. WireGuard
2. Tailscale
3. Cloudflare Tunnel for gateway/dashboard only
4. private VPS network
5. SSH tunnel for admin break-glass

## DNS names

```text
citadeldb.internal
pgbouncer.citadeldb.internal
gateway.citadeldb.internal
grafana.citadeldb.internal
```

## Failover route idea

```text
db-primary.internal → primary server
db-standby.internal → standby server
db-write.internal → current writer
db-read.internal → read pool
```

Veyra3.1 later owns route switching.
