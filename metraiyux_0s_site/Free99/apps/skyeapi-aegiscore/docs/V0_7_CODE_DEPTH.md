# SkyeAPI + AegisCore v0.7.0 Code-Depth Upgrade

v0.7.0 is a code-only platform-depth pass. It does not claim Cloudflare deployment, live provider delivery, or live webhook signature proof. It adds runtime control-plane systems that make the platform more sellable before deployment work.

## Added systems

### Approval queue
Policy rules with `effect: "require_approval"` now create pending approval request records instead of only blocking. Each request stores the project, capability, matched rules, actor headers, expiration, and deterministic input fingerprint. Admins can approve or deny the request. Approval returns a one-time token bound to the original request and exact input fingerprint.

Runtime behavior:

- First risky call returns `409 approval_required` with an approval request ID.
- Admin approves through `/v1/admin/approve-request`.
- Caller retries with `approvalRequestId` and `approvalToken` in the input.
- The approval token is marked used and cannot be replayed.

### Webhook signature modes
Webhook ingestion now supports signature-verification modes through `SKYE_WEBHOOK_SIGNATURE_MODE`:

- `off`: ingest without verification and mark signature as skipped.
- `report`: ingest but attach verification result.
- `strict`: reject invalid or unsupported signatures.

Implemented adapters:

- Stripe-style HMAC verification using `STRIPE_WEBHOOK_SECRET` and `stripe-signature`.
- Twilio-style HMAC verification using `TWILIO_AUTH_TOKEN` and `x-twilio-signature`.
- Resend/Svix is explicitly marked unsupported until a full Svix signature adapter is added. No fake verification claim is made.

### Config snapshots and rollback
Projects can now create redacted configuration snapshots for:

- Project plan
- Provider pack state
- Policy rules
- Upstream role rules
- Safe manifest summary

Snapshots do not include raw provider secrets. Restore applies the captured plan, provider state, policies, and roles.

### Workflow run ledger
Hosted workflow runs now write redacted `WorkflowRunRecord` entries into KV-compatible storage. Records include workflow ID, run ID, dry-run flag, actor headers, step receipts, proof IDs, failure summaries, and final output. Admins can list summaries or detailed records.

### Console code-depth panels
The console now has real panels for:

- Approval queue
- Config snapshots
- Workflow run ledger

These panels call gateway admin APIs. They are not static marketing blocks.

### SDK / CLI / MCP additions
The Admin SDK, CLI, and MCP server were extended for v0.7.0 control-plane workflows.

New CLI command families include:

```bash
skyeapi hosted approvals
skyeapi hosted approve --request <id>
skyeapi hosted deny --request <id>
skyeapi hosted snapshots
skyeapi hosted snapshot --reason "before policy edit"
skyeapi hosted restore-snapshot --snapshot <id>
skyeapi hosted workflow-runs --details
```

The MCP server now exposes a deterministic approval fingerprint tool so agents can reason about approval-bound retries without seeing secrets.

## Proof scope

`pnpm smoke:v07-product` checks that the v0.7.0 control-plane systems exist in source, that approval fingerprints are deterministic, that policy evaluation can request approval, that workflow run summaries are redacted, and that SDK/CLI/console surfaces are wired.

This proof is not a live provider proof and does not make a deployment claim.
