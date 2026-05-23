# CitadelDB Sovereign Architecture

CitadelDB is not a clone of any external database platform.

CitadelDB is Skyes Over London / SOLEnterprises sovereign database command infrastructure.

External open-source systems may be studied, referenced, or used as replaceable engine components, but they do not define the product architecture, brand architecture, operator model, control-plane language, dashboard language, public claims, or proof doctrine.

## Product identity

```text
CitadelDB Ultimate
Sovereign Database Command Infrastructure
by Skyes Over London
Part of the SoveReign13 Infrastructure Family
```

## Company-owned architecture

```text
SoveReign13
└─ CitadelDB
   ├─ Citadel Core
   │  ├─ database registry
   │  ├─ tenant registry
   │  ├─ app environment registry
   │  ├─ role and credential lifecycle
   │  └─ service catalog
   │
   ├─ Reliquary
   │  ├─ backup receipts
   │  ├─ restore receipts
   │  ├─ rollback receipts
   │  ├─ export manifests
   │  └─ disaster recovery drills
   │
   ├─ SceptR
   │  ├─ provisioning commands
   │  ├─ migration commands
   │  ├─ safe operator jobs
   │  ├─ smoke tests
   │  └─ proof runners
   │
   ├─ Veyra3.1
   │  ├─ private routing
   │  ├─ tunnel policy
   │  ├─ pooler routes
   │  ├─ read/write route separation
   │  └─ failover route promotion
   │
   ├─ Aegis
   │  ├─ policy checks
   │  ├─ credential rotation
   │  ├─ least-privilege roles
   │  ├─ public exposure guards
   │  └─ incident response
   │
   └─ SkyLedger
      ├─ audit events
      ├─ command receipts
      ├─ claims ledger
      ├─ proof files
      └─ readiness gates
```

## Engine model

CitadelDB owns the control plane. Engine components are replaceable.

```text
CitadelDB Control Plane
   ↓
Citadel Engine Contract
   ↓
Engine Adapter
   ↓
Database runtime
```

The default engine is `citadel-postgres`, meaning a Skyes-managed PostgreSQL runtime with CitadelDB conventions, Reliquary receipts, SceptR jobs, Veyra routing, and Aegis policy gates.

Other engines are not the public architecture. They are implementation options behind the contract.

## Citadel Engine Contract

Every engine must support:

```text
health()
provisionApp(app, tenant, environment)
createRole(app, environment)
rotateCredential(app, environment)
migrate(app, migrationSet)
backup(database)
restore(backup, target)
restoreTest(backup)
exportServiceCatalog()
readiness()
capacity()
audit()
```

## Proof doctrine

CitadelDB is proof-led. A feature is not complete because code exists.

A feature requires:

```text
✅ code/config exists
✅ command exists
✅ smoke/proof command runs
✅ receipt is generated
✅ failure condition is documented
```

Anything else is marked:

```text
☐ open
```

## Public wording rule

Public/company-facing surfaces must say:

```text
Built by Skyes Over London.
Part of SoveReign13.
Powered by CitadelDB, Reliquary, SceptR, Veyra3.1, Aegis, and SkyLedger.
```

They must not say:

```text
A clone of an external database platform
A clone of an external service platform
A clone of an external HA operator
Frankenstein database platform
Fully proven HA/PITR unless live receipts exist
```

## Architecture ownership

CitadelDB may use PostgreSQL, containers, Kubernetes, object storage, tunnels, or external open-source operators.

But CitadelDB's value is the Skyes-owned control plane:

- operational receipts
- proof-led claims
- branded command surface
- safe job loop
- migration/cutover discipline
- tenant and app registry
- backup/restore/rollback ledger
- policy and incident discipline
- private routing doctrine
