# Handler Proof Closure

v2.6 tightens proof quality.

## Added

- Handler-level guard proof.
- Worker allowlist proof.
- Direct database lifecycle proof.
- Gateway SQL console proof.
- Live E2E env generator.

## Why

Loose string scans were not good enough. Handler proof verifies that protected routes contain:

- `requireCommercialGate`
- expected `routeKey`
- `if (!gate) return`

## Live proof commands

```bash
./cli/citadel handler-guard-proof
./cli/citadel worker-allowlist-proof
./cli/citadel database-lifecycle-proof
./cli/citadel gateway-sql-console-proof
./cli/citadel generate-live-e2e-env
./cli/citadel live-stack-e2e
```

## v2.6 handler proof repair

The first handler-level scan found that `guided_proof_action` and `app_lifecycle_action` were registered in protection docs but not actually guarded in their handler bodies. Both handlers now call `requireCommercialGate(...)` and return early when the gate blocks.
