# v0.11.0 Leases, Signed Packs, Billing Exports, and No-Theater Gate

This pass is code-only platform depth. It does not claim deployed Cloudflare concurrency proof, live provider delivery, browser click proof, or Stripe subscription collection.

Implemented in code:

- Job lease claims for queued jobs so one executor receives a lease token and lock expiry before running work.
- Lease completion that requires the matching project, job id, and lease token.
- Provider-pack dependency validation against certified registry records.
- Signed provider-pack manifests with checksum and HMAC signature verification.
- Tamper detection for signed provider-pack manifests.
- Billing usage export helpers for CSV and JSONL.
- Hosted Worker admin routes for job leases, pack dependency checks, pack signing, pack verification, and billing exports.
- Console contract controls for job leases, provider-pack signing/verification, and billing exports.
- SDK admin methods for the new hosted APIs.
- No-theater gate helpers that reject unfinished copy and unsafe production/live-provider claims.

New proof:

```bash
pnpm smoke:v11-product
pnpm no-theater-gate
pnpm proof
```

Proof files:

```txt
.proof/v11-product-smoke-result.json
.proof/no-theater-gate-result.json
```

Still not claimed:

- Distributed KV compare-and-swap under simultaneous deployed Workers.
- Live outbound webhook delivery to real customer endpoints.
- Live Stripe subscription collection.
- Browser/Chromium click E2E against the console.
- Live provider certification against Resend, Twilio, Neon, OpenAI-compatible APIs, Stripe, or R2.
