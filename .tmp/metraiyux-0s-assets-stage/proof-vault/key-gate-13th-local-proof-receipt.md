# Key Gate 13th Local Proof Receipt

Date: 2026-05-21

## Scope

Built Key Gate 13th as a FS27-gated 0S platform surface and API, then wired Agentic Growth connected source pulls to consume Key Gate credential refs instead of raw browser provider keys.

## Implemented

- `/key-gate-13th/` static operator dashboard.
- `/api/key-gate-13th` Worker adapter.
- AES-GCM encrypted provider-key storage.
- HMAC fingerprint plus per-record salted hash.
- Masked list responses with no ciphertext or plaintext.
- Create, list, test, rotate, revoke, grant, and audit flows.
- Key Gate vendors for GSC, SEMrush, DataForSEO, Stripe, Cloudflare, and OpenAI.
- Agentic Growth `credentialRef`/`secretRef` source pull path.
- Raw provider-key payload rejection on `/api/agentic-growth/v1/cycles/pull`.
- Agentic Growth project binding and scheduled monitor queue dispatch.
- SkyPay catalog language for Key Gate custody in Connected and Operator Agentic Growth plans.

## Local Proof Commands

```bash
node --test metraiyux_0s_site/tests/key-gate-13th-adapter.test.mjs
node --test metraiyux_0s_site/tests/agentic-growth-0s-adapter.test.mjs
npm --prefix packages/agentic-growth-layer test
npm run mcp:mine -- metraiyux_0s_site/key-gate-13th
npm run mcp:mine -- metraiyux_0s_site/agentic-growth-layer
```

## Passing Evidence

- Key Gate focused suite: 8/8 passing.
- Agentic Growth 0S suite: 4/4 passing.
- Agentic Growth package smoke and stress: passing.
- Stress report: `test-artifacts/agentic-growth-layer/stress-report.json`.
- Key Gate MCP receipt: `metraiyux_0s_site/key-gate-13th/MCP_TOOLING_RECEIPT.json`.
- Agentic Growth MCP receipt: `metraiyux_0s_site/agentic-growth-layer/MCP_TOOLING_RECEIPT.json`.

## Stress Snapshot

- Core cycles: 240 iterations, 24 concurrency, 31.01 cycles/sec, p95 51ms.
- Authenticated API: 80 requests, 16 concurrency, 16.16 req/sec, p95 2833ms.

## Known Non-Blocking Test Drift

The broader legacy route/security suites currently expect some public route-manifest, intake, and proxy read behavior that the default-deny 0S gate now blocks with `401`/`302`. Those failures are perimeter expectation drift, not Key Gate route failures.

## Live Gate Still Required

This receipt is local proof only. Production readiness still requires deployment, `KEY_GATE_13_MASTER_KEY`/`KEY_GATE_13_FINGERPRINT_PEPPER` secrets on the live Worker, and the repo live headed-browser proof gate on desktop and mobile.
