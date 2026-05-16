# Neon Architecture Notes

## What to study

Neon is valuable because it explores serverless Postgres architecture:

- stateless compute nodes
- separated storage engine
- WAL durability service
- pageserver/safekeeper architecture
- branching workflows
- storage/compute separation
- cloud-native autoscaling posture

## Extractable patterns

### 1. Branching concept

CitadelDB should eventually support database branches as controlled environments:

```text
production
├─ staging branch
├─ preview branch
└─ migration-test branch
```

v0.2 implementation status:

☐ not implemented  
✅ documented as Neon Lab research lane  

### 2. Compute/storage boundary

CitadelDB should keep a clean abstraction between:

```text
connection/session layer
query execution layer
storage/backup layer
control plane
```

v0.2 implementation status:

✅ adapter boundary exists  
✅ engine lane boundary exists  
☐ distributed storage not implemented  

### 3. WAL-first recovery thinking

Every serious database action should assume WAL/archive/recovery matters.

v0.2 implementation status:

✅ pgBackRest-ready config included  
☐ live WAL archive not proven  

## Do not copy blindly

- Do not attempt to rebuild Neon storage engine first.
- Do not present Neon Lab as production.
- Do not couple CitadelDB core to Neon-specific infrastructure.
- Do not require Rust/distributed-storage complexity for early production.

## CitadelDB decision

Neon-inspired features belong in:

```text
engines/neon-lab/
research/neon/
future branch/preview module
```

The production default remains Postgres + PgBouncer + backups, then CloudNativePG for HA.
