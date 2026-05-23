# v0.13.0 Source, Billing, Workspace, and Audit Code

This pass is code-only. It does not claim deployed provider success, payment collection, or distributed runtime proof.

## Added

- Real provider-pack source loader for inline, local directory, local zip extraction through `unzip`, and git clone sources.
- Provider-pack sandbox report that generates dry-run receipts and scans adapter source for unsafe patterns without executing untrusted code.
- Persisted billing invoice records with invoice status history.
- Subscription draft objects that model plan billing without claiming payment capture.
- Workspace/project binding hooks for upstream identity systems.
- Redacted audit export bundle with checksums and section counts.
- Hosted admin routes for sandbox, invoice persistence, subscriptions, workspace bindings/access checks, and audit export.
- Console panels for source loading, sandboxing, invoice history, subscriptions, workspace hooks, and audit bundles.
- Console contract smoke verifies v0.13 panel wiring. A separate `tools/smoke-console-browser.mjs` is included for environments where Chromium exits cleanly, but it is not included in `pnpm proof` because this sandbox Chromium build hangs on headless dump.

## Proof

Run:

```bash
pnpm proof
```

Expected v0.13 proof files:

- `.proof/v13-product-smoke-result.json`

## Truth boundary

Still not claimed:

- Live remote zip/git retrieval under production networking.
- Executing third-party adapter code in an isolated container.
- Stripe or payment-provider collection.
- Deployed distributed job locking proof.
- Live outbound webhook delivery proof.
