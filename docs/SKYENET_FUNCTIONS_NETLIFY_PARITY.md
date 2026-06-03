# SkyeNet Functions Netlify-Parity Runtime

Last updated: 2026-06-01

## Product Decision

SkyeNet Functions is our serverless functions lane. The customer-facing product is SkyeNet; provider primitive names stay in internal proof and ops. The current production execution primitive is Cloudflare Dynamic Workers behind the SkyeNet deploy protocol, route registry, source custody, runtime policy, observability, quotas, and receipts.

Customer-facing copy must not split the product into Cloudflare and SkyeNet. The public product is SkyeNet. Internally, the release lane is SkyeNet Edge and the isolated uploaded-code lane is SkyeNet Functions / Sovereign Runtime.

## Target Parity

Netlify-style compatibility target:

- Accept converted bundles generated from `netlify/functions/*.{js,mjs,cjs}`, `functions/*.{js,mjs,cjs}`, or `skyenet/functions/*.{js,mjs,cjs}`.
- Serve compatible routes at `/.netlify/functions/<name>`.
- Also serve native routes at `/.skyenet/functions/<name>`.
- Support `handler(event, context)` return objects with `statusCode`, `headers`, `body`, and `isBase64Encoded`.
- Convert uploaded project folders into signed SkyeNet function bundles.
- Bundle local helper imports with the deploy CLI before upload.
- Upload bundle files through `/deploy/functions-upload`.
- Activate bundles through `/deploy/functions-complete`, including server-signed customer upload completion after storage hash verification.
- Inspect active bundles through `/deploy/functions-status`.
- Preserve static build drop hosting through the existing SkyeNet Edge deploy lane.
- Attach route records, env policy, CPU/memory/request caps, logs, and cost receipts.

Closed function-family targets:

- Scheduled functions.
- Background/async functions.
- Function-level environment variable grant inspection.
- Rollbacks and per-deployment immutable function route switching.
- OS-jailed deploy-time dependency install/build for function bundles, with scrubbed environment and build receipts.
- `netlify.toml` redirects/headers in the hosted static route lane.

## Runtime Architecture

Control plane:

- Standalone SkyeNet console: `https://skyenet.graylondonskyes.workers.dev/console`.
- Standalone SkyeNet API shape: `https://skyenet.graylondonskyes.workers.dev/api/skyenet/*`.
- 0S gated console: `/skyenet/index.html` for legacy/internal operator access.
- 0S API proxy: `/api/skyenet/*` remains active for shared-gate control and compatibility.
- FS27 deploy API: `/deploy/*`.
- Deploy CLI: `tools/skyenet-deploy.mjs`.
- Function bundle conversion: `tools/skyenet-functions-convert.mjs`.
- Function runtime proof server: `tools/skyenet-functions-runtime.mjs`.

Signed production runtime:

- Bundle manifests carry `bundle_id`, `tenant_id`, route records, per-function limits, runtime contract, and an HMAC-SHA256 signature when `SKYENET_FUNCTION_BUNDLE_SIGNING_KEY` is present.
- Production activation requires signatures before serving a bundle on managed/owner-approved workspaces.
- Customer uploads may request server-side signing through `server_sign_manifest` / `customer_upload`; FS27 sanitizes the manifest and verifies stored object hashes before adding the signature.
- Request events now carry Netlify-compatible single and multi-value query params, headers, cookies, raw URL, text bodies, binary base64 bodies, and `isBase64Encoded`.
- Public route invocation runs through `SKYENET_FUNCTION_LOADER` Dynamic Worker code objects, not by evaluating customer code in the FS27 auth/gate isolate.
- Dynamic Worker modules are generated from the stored bundle source, with `.mjs`/`.cjs` bundle paths remapped to Dynamic Worker-safe `.js` module keys at invocation time.
- The Dynamic Worker code object uses `globalOutbound: null`, so outbound `fetch` is denied unless an explicit platform grant is added later.
- The adapter enforces request body caps and Netlify-compatible event/context shape before calling `handler(event, context)`.
- Raw platform secrets are not passed into uploaded function env by default.
- Each invocation writes a required receipt and returns `x-skynet-function-receipt`.

Release lane:

- SkyeNet Edge ships static drops, route registry, source custody, observability, and cost guardrails.
- Uploaded Netlify-style functions can be converted, uploaded, signed, activated, and invoked in production for `skyenet-functions-managed`, `skyenet-sovereign-runtime-reserve`, or owner-approved workspaces.
- Free99 and starter workspaces remain static-first; uploaded functions require paid/owner-approved caps.
- Signed SkyeNet function bundles remain immutable at activation time; a later upload returns the bundle to `uploading` until a new signed completion passes.

Production runtime:

- FS27 owns the control plane and route lookup.
- `SKYENET_FUNCTION_LOADER` owns the uploaded-code execution isolate.
- Each active deployment record stores `function_bundle.status: active`, the signed manifest summary, bundle prefix, runtime policy, and kill-switch field.
- Egress policy defaults to denied outbound fetches through Dynamic Worker `globalOutbound: null`.
- Secrets are not copied into bundles; future function env grants must stay explicit and redacted.
- Receipts and runtime telemetry flow back through the existing SkyeNet observability lanes.

## Cheap Sovereign Hosting Shape

Current official low-cost options checked on 2026-05-23:

- OVHcloud US VPS-1 starts at `$6.46/mo` with 4 vCores, 8 GB RAM, 75 GB SSD, daily backup, unlimited traffic, and 400 Mbps public bandwidth.
- OVHcloud US VPS-2 starts at `$9.99/mo` with 6 vCores, 12 GB RAM, 100 GB NVMe, daily backup, unlimited traffic, and 1 Gbps public bandwidth.
- DigitalOcean Basic Droplets range from `$4/mo` to `$48/mo`; the `$24/mo` Droplet has 4 GB RAM, 2 vCPUs, 80 GB SSD, and 4 TB transfer, while `$48/mo` has 8 GB RAM, 4 vCPUs, 160 GB SSD, and 5 TB transfer.
- Fly.io can run Machines cheaply, but public egress is billed and persistent volumes are billed separately, so it is useful for burst nodes but less sovereign than a VPS we control.

Recommended sub-`$50/mo` SkyeNet Functions starter:

- 1 OVH VPS-2 or 1 DigitalOcean 4 GB Droplet as `skynetd-1`.
- SkyeNet Edge remains front-door/gate/cache.
- The SkyeNet asset vault remains static artifact storage.
- FS27 remains auth, route registry, usage ledger, and billing guardrail.
- Free99 receives static hosting plus tiny owner-approved functions only.
- Paid tiers unlock function quotas.

## Guardrails

- Never execute uploaded code in the main 0S Worker.
- Never `eval` or directly import uploaded code in the FS27 auth/gate Worker isolate; uploaded code must go through `SKYENET_FUNCTION_LOADER`.
- Do not grant customer functions raw Cloudflare, Stripe, Resend, GitHub, or database owner secrets.
- Treat CommonJS/ESM conversion as compatibility work, not security.
- A signed child-process runtime proves product flow and controlled approved execution; production hostile customer code requires container or microVM isolation.

## Proof Commands

```bash
npm run 0s:skyenet:functions-proof
```

This proves the signed converter and local SkyeNet-owned Netlify-compatible runtime, including repeated query params, cookies, request body caps, binary body shape, timeout enforcement, env grants, scheduled/background metadata, default-deny egress, and manifest tamper rejection.

Production live proof:

```bash
npm run skyenet:netlify-parity:proof
npm run skyenet:netlify-parity:stress
```

The live parity proof now includes uploaded functions, scheduled/background metadata, OS-jailed CLI function dependency install/build, source custody, Forms, console function-grant/rollback UI, archive-backed tar.gz and zip source-file reads, and route stress. Latest production evidence on 2026-06-01:

- FS27 Worker version: `405a5bc5-9b01-466c-a81b-a562f88518c5`.
- Standalone SkyeNet Worker console version: `661343b2-dc07-4804-8b43-f3e2ba84d3ca`.
- Receipt: `test-artifacts/skyenet-netlify-parity/skyenet-netlify-parity-live-http-latest.json`.
- Generated: `2026-06-01T05:31:57.858Z`.
- Result: `ok: true`, `functions_ok: true`, `function_invocation_status: 201`, source download `200`, private source bytes `26112`, failures `[]`.
- Direct uploaded function proof: `function_count: 4`, `background_function_count: 1`, `scheduled_function_count: 1`, `schedule_indexed_count: 1`, schedule route `/.skyenet/scheduled/tick`.
- CLI function proof: `deploy.stdout_json.functions.uploaded: true`, `function_count: 5`, `server_signed: true`, runtime `cloudflare-dynamic-worker-v1`; `build-receipt.json` is accepted as private bundle metadata; bundled local helper function `with-helper` invoked at `/.netlify/functions/with-helper` with status `202`, a receipt header, and an installed local file dependency.
- Console function ops proof: `/console` and `/assets/skyenet.js` returned `200` and exposed function env grants plus rollback UI/API wiring.
- Direct API function checks: source upload, unsigned reject, server-signed hash mismatch reject, activation, status, public invocation, background accept/receipt, schedule index, required receipt header, oversized body reject, default-deny egress, and no raw secret leak.
- Archive-backed source-file proof: tar.gz source archive upload `200`, source-file read `200`, `compression: gzip`, `scanned_entries: 3`, `materialized_file_object: false`; zip source archive upload `200`, source-file read `200`, `compression: zip`, `zip_method: deflate`, `scanned_entries: 3`, `materialized_file_object: false`.
- Stress receipt: `test-artifacts/skyenet-netlify-parity-stress/skyenet-netlify-parity-stress-live-http-latest.json`, generated `2026-06-01T05:21:11.637Z`, `ok: true`, `3` fresh deployments, `36` read checks, failures `[]`. Stress deployment IDs: `dep_20260601052144`, `dep_20260601052707`, `dep_20260601053234`.

Related internal architecture:

- `docs/SKYENET_PLATFORM_LANE.md`
- `docs/SKYENET_HYBRID_RELEASE_ARCHITECTURE.md`
