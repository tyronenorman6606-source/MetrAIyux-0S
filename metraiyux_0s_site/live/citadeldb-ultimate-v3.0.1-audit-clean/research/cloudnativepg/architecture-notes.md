# CloudNativePG Architecture Notes

## What to study

CloudNativePG is the best serious HA Postgres backbone for Kubernetes-based CitadelDB.

Key patterns:

- declarative PostgreSQL cluster
- primary/standby architecture
- instance count controls replicas
- automated failover
- rolling updates/switchover
- pooler integration
- scheduled backup support
- object-store backup support

## Extractable patterns

### 1. Declarative cluster state

CitadelDB should define desired database state declaratively:

```yaml
instances: 3
storage: 100Gi
backup: enabled
pooler: enabled
```

v0.2 implementation:

✅ CloudNativePG cluster manifest exists  

### 2. HA by instance count

A cluster with more than one instance can have standby replicas and failover behavior.

v0.2 implementation:

✅ 3-instance cluster manifest exists  
☐ live failover not proven  

### 3. Pooler boundary

Application traffic should connect through a pooler/service boundary, not directly to one brittle pod.

v0.2 implementation:

✅ pooler manifest exists  
✅ PgBouncer included in VPS lane  

## Do not copy blindly

- Do not require Kubernetes for every customer.
- Do not call HA proven until failover is actually tested.
- Do not hide the operational complexity of Kubernetes.
- Do not use CloudNativePG for cheap single-user apps unless needed.

## CitadelDB decision

CloudNativePG becomes the highest-level production lane:

```text
engines/cloudnativepg/
deploy/cloudnativepg/
```
