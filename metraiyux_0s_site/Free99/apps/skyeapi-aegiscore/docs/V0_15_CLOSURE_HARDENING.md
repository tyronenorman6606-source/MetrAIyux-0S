# v0.17.0 Closure Hardening

This release is a closure pass over v0.14.0. It does not claim deployed Cloudflare behavior, live provider delivery, real payment capture, or browser E2E inside this sandbox.

## Implemented

- Gateway helper split started in real code, not just docs.
- HTTP response/CORS helpers moved to `apps/gateway-worker/src/modules/http.ts`.
- Worker ops-store helpers moved to `apps/gateway-worker/src/modules/ops-store.ts`.
- Worker HTTP behavioral smoke expanded beyond the original happy path.
- `pnpm proof` now builds once before running the smoke/truth gates.
- `pnpm proof:full` runs explicit workspace build, workspace typecheck, then proof.
- Version truth updated to `0.17.0` across package metadata and Worker health constants.

## Expanded HTTP behavioral coverage

The Worker HTTP smoke now covers health, import, key minting, safe manifests, dry-run calls, durable job enqueue, lease claim, lease completion, queued job processing, job listing, outbound subscription lifecycle, outbound event enqueue, provider-pack certification/signing/verification/loading/sandboxing/registry/install, billing invoice lifecycle, invoice reconciliation, fixture certification, subscription lifecycle, workspace binding/access, and audit export.

## Still open

☐ Full route-module extraction for every admin group.
☐ Actual browser E2E in a known Chromium environment.
☐ Deployed Cloudflare behavior proof.
☐ Live provider certification proof.
☐ Real payment capture and payment webhook reconciliation.
☐ Globally atomic queue locking under concurrent deployed workers.
