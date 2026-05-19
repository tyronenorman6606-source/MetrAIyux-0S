# SkyeAPI + AegisCore v0.8.0 Product Code Depth

This release adds code-only product depth. It does not claim deployment readiness or live provider proof.

## Added

- `@skyeapi/ops` package for paid-platform operations.
- Adapter conformance runner for checking provider adapters before they are treated as platform-supported.
- Provider-pack authoring scaffold generator so new provider packs can be created without editing core runtime first.
- Async job queue engine with queued/running/succeeded/failed states and executor callbacks.
- Outbound webhook hub with HTTPS-only subscriptions, queued delivery records, retry-ready processing, and optional HMAC signing.
- Usage anomaly detector for high failure rates and call-volume spikes.
- Developer doctor report that checks manifest health, proof scripts, truth gate presence, and policy gaps.
- CLI commands for adapter conformance, provider-pack scaffolding, and stronger local doctor output.

## Truth boundary

Implemented and locally proven:

- Adapter conformance execution against default adapters.
- Provider-pack scaffold file generation.
- Async job enqueue and execution through a callback executor.
- Outbound event subscription, delivery queueing, delivery processing, and signed delivery proof using a fixture fetch implementation.
- Usage anomaly detection.
- Developer doctor reporting.

Not claimed:

- Live outbound webhook delivery to customer endpoints.
- Durable production queue semantics.
- Multi-worker concurrency locking.
- Live provider adapter certification.
- Hosted Worker routes for every `@skyeapi/ops` primitive.

## Proof

Run:

```bash
pnpm proof
```

Primary v0.8 proof artifact:

```txt
.proof/v08-product-smoke-result.json
```
