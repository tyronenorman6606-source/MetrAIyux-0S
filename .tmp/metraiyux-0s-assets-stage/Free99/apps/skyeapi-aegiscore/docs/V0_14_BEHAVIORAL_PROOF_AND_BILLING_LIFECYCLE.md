# v0.14.0 Behavioral Proof and Billing Lifecycle

v0.14.0 added Worker HTTP behavioral proof, reliable proof-script wiring, version truth cleanup, billing lifecycle objects, fixture-first provider certification, and browser E2E CI wiring.

## Implemented in v0.14.0

- Worker HTTP behavioral proof through `tools/smoke-worker-http.mjs`.
- Worker `/health` version constants moved into `apps/gateway-worker/src/modules/version.ts`.
- Billing subscription lifecycle actions for pause, resume, cancel, renew, payment failure, and update.
- Invoice usage reconciliation diff objects.
- Provider fixture certification route and helper.
- GitHub Actions workflow for console browser smoke in a known Chromium environment.

## Truth boundary

This release did not prove deployed Cloudflare behavior, live provider delivery, globally atomic queue locking, browser E2E inside this chat sandbox, or real payment capture.
