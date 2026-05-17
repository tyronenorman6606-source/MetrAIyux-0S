# Capacity and Cost Planner

## Lean serious

1 VPS, 4-8 GB RAM, Postgres + PgBouncer + Gateway, daily backups, weekly restore test. Approx: $25-$60/mo.

## Founder/operator serious

1 stronger DB VPS, 8-16 GB RAM, 1 small restore-test VPS, object backups, monitoring. Approx: $50-$115/mo.

## Paid-client serious

Primary DB server, standby/replica server, backup/restore-test node, object storage, monitoring. Approx: $100-$300/mo.

## HA Kubernetes lane

3-node Kubernetes cluster, CloudNativePG 3 instances, object storage backups, pooler, monitoring. Approx: $150-$600+/mo depending provider.

## Upgrade rule

Upgrade when one server outage loses meaningful revenue, connection counts hurt Postgres, backup windows are too slow, read traffic needs replicas, or compliance/sales requires HA proof.
