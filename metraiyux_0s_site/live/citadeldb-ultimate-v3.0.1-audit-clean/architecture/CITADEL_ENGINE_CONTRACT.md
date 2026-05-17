# Citadel Engine Contract

Every database runtime integrated into CitadelDB must satisfy this contract.

The contract is intentionally company-owned. It does not inherit naming from upstream infrastructure projects.

## Engine identity

```json
{
  "engine_id": "citadel-postgres",
  "engine_label": "Citadel Postgres Runtime",
  "runtime_class": "single-node | replicated | ha-cluster | lab",
  "status": "active | experimental | deprecated"
}
```

## Required capabilities

### health

Returns database availability, engine status, connection capacity, and control-plane reachability.

### provisionApp

Creates the database/runtime resources required by an app environment.

### createRole

Creates least-privilege app credentials.

### rotateCredential

Rotates an app role password and emits a credential rotation receipt.

### migrate

Runs migration files or records externally executed migration receipts.

### backup

Creates a backup and records it into Reliquary.

### restore

Restores a backup to a target database.

### restoreTest

Restores a backup into an isolated temporary database and records the test.

### readiness

Returns proof-gated readiness checks.

### capacity

Returns database size, connection state, and growth indicators.

### audit

Returns SkyLedger audit events and command receipts.

## Adapter rules

Adapters must not expose upstream implementation names as product language.

Allowed:

```text
citadel-postgres
citadel-ha
citadel-lab
citadel-edge
```

Not public-facing:

```text
neon
supabase
cloudnativepg
```

Those names may appear only in internal research notes, vendor manifests, or deployment adapter docs.
