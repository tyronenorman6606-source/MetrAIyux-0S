# SkyeNet Functions Netlify-Parity Runtime

Last updated: 2026-05-24

## Product Decision

SkyeNet Functions is intended to be our own serverless functions lane, not a wrapper around Cloudflare Workers for Platforms. Cloudflare may still be used as a front door, cache, DNS layer, R2 storage lane, or FS27/0S service-binding partner, but the deploy protocol, Netlify compatibility adapter, runtime policy, observability, quotas, and customer-facing product should be SkyeNet IP.

Customer-facing copy must not split the product into Cloudflare and SkyeNet. The public product is SkyeNet. Internally, the release lane is SkyeNet Edge and the owned untrusted-code lane is SkyeNet Sovereign Runtime.

## Target Parity

Netlify-style compatibility target:

- Accept `netlify/functions/*.{js,mjs,cjs}`.
- Serve compatible routes at `/.netlify/functions/<name>`.
- Also serve native routes at `/.skyenet/functions/<name>`.
- Support `handler(event, context)` return objects with `statusCode`, `headers`, `body`, and `isBase64Encoded`.
- Convert uploaded project folders into signed SkyeNet function bundles.
- Preserve static build drop hosting through the existing SkyeNet Edge deploy lane.
- Attach route records, env policy, CPU/memory/request caps, logs, and cost receipts.

Later parity targets:

- Scheduled functions.
- Background/async functions.
- Build command capture.
- Function-level environment variables and secret grants.
- Redirects/rewrites from `netlify.toml`.
- Dependency install/build in a jailed builder.
- Rollbacks and per-deployment immutable function versions.

## Runtime Architecture

Control plane:

- 0S gated console: `/skyenet/index.html`.
- 0S API proxy: `/api/skyenet/*`.
- FS27 deploy API: `/deploy/*`.
- Function bundle conversion: `tools/skyenet-functions-convert.mjs`.
- Function runtime proof server: `tools/skyenet-functions-runtime.mjs`.

Signed runtime v1:

- Bundle manifests carry `bundle_id`, `tenant_id`, route records, per-function limits, runtime contract, and an HMAC-SHA256 signature when `SKYENET_FUNCTION_BUNDLE_SIGNING_KEY` is present.
- The runtime can require signatures before serving a bundle.
- Request events now carry Netlify-compatible single and multi-value query params, headers, cookies, raw URL, text bodies, binary base64 bodies, and `isBase64Encoded`.
- Function child processes run with timeout caps, `node --max-old-space-size` memory caps, request body caps, and deny-by-default environment grants.
- Outbound `fetch` is denied by default in the v1 policy shim, so approved egress has to become an explicit platform grant instead of leaking open internet access by accident.
- This is a controlled signed-runtime preview for trusted or owner-approved bundles. It is not the final hostile-code sandbox.

Release lane:

- SkyeNet Edge can ship now for static drops, route registry, managed SkyeNet functions, staged function bundles, observability, and cost guardrails.
- If the private runtime is offline, static drops and managed functions still serve through SkyeNet Edge.
- Uploaded Netlify-style functions can be converted and staged, but untrusted live execution remains controlled until the isolated runtime has production proof.
- Signed SkyeNet function bundles can now be served by the owned local runtime proof with env, body, timeout, memory, and default-deny egress guardrails.

Production runtime:

- `skynetd` runs on SkyeNet-owned VPS, dedicated server, or 0S Kubernetes.
- Each function invocation runs outside the FS27 gate Worker.
- v1 trusted runtime can use signed manifests, child-process isolation, timeouts, memory caps, body caps, locked env, and default-deny egress.
- v2 customer runtime should use rootless containers plus cgroups/seccomp/AppArmor, or gVisor/Kata/Firecracker where KVM is available.
- Egress policy should default-deny unknown outbound fetches.
- Secrets are mounted per function from FS27 grants, never copied into bundles.
- Logs and metrics flow back to the existing runtime observer.

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
- Never execute uploaded code in FS27 auth/gate Worker.
- Do not grant customer functions raw Cloudflare, Stripe, Resend, GitHub, or database owner secrets.
- Treat CommonJS/ESM conversion as compatibility work, not security.
- A signed child-process runtime proves product flow and controlled approved execution; production hostile customer code requires container or microVM isolation.

## Proof Commands

```bash
npm run 0s:skyenet:functions-proof
```

This proves the signed converter and SkyeNet-owned Netlify-compatible invocation route, including repeated query params, cookies, request body caps, binary body shape, timeout enforcement, env grants, default-deny egress, and manifest tamper rejection.

Related internal architecture:

- `docs/SKYENET_PLATFORM_LANE.md`
- `docs/SKYENET_HYBRID_RELEASE_ARCHITECTURE.md`
