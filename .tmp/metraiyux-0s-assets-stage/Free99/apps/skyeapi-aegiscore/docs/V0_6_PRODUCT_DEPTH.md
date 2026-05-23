# SkyeAPI + AegisCore v0.6.0 Product-Depth Upgrade

This release converts the remaining code-only product gaps into implemented platform systems. It does not claim live provider success or deployment proof.

## Added systems

✅ Provider marketplace controls

- Built-in provider pack catalog in `@skyeapi/core`.
- Project-level provider enable/disable state.
- Hosted admin APIs:
  - `GET /v1/admin/provider-packs`
  - `GET /v1/admin/project-providers?projectId=...`
  - `POST /v1/admin/set-provider`
- Runtime capability calls are blocked when their provider pack is disabled.
- Safe manifests reflect disabled provider packs.

✅ Policy rule builder

- Policy evaluator in `@skyeapi/core`.
- Project-level policy storage.
- Hosted admin APIs:
  - `GET /v1/admin/policies`
  - `POST /v1/admin/policies`
- Runtime policy enforcement before provider calls.
- Workflow steps receive policy block receipts.
- Example policy library: `examples/policies/builder-safe-defaults.json`.

Supported policy conditions include readonly SQL, max number, max length, field matches, allowed email domains, allowed phone country codes, and storage key prefixes.

✅ Secret rotation engine

- Hosted route: `POST /v1/admin/rotate-secret`.
- Updates one credential inside the encrypted AegisCore bundle.
- Emits redacted rotation receipt.
- Stores rotation audit history at `GET /v1/admin/rotations`.
- Never returns raw previous or next secret value.

✅ Webhook ingestion and replay

- Inbound route: `POST /v1/webhooks/:provider?projectId=...`.
- Stores event id, provider, event type, body hash, and body preview.
- Admin list route: `GET /v1/admin/webhook-events`.
- Admin replay route: `POST /v1/admin/replay-webhook`.
- Replay records a downstream processing intent. It does not fake delivery to a provider.

✅ Upstream team/role hooks

- Accepts upstream identity headers:
  - `x-skye-actor-id`
  - `x-skye-actor-email`
  - `x-skye-role`
  - `x-skye-project-role`
- Role map route:
  - `GET /v1/admin/roles`
  - `POST /v1/admin/roles`
- If role config exists, capability calls must match the upstream role allowlist.

✅ Workflow template library

Added workflow templates:

- `examples/workflows/send-invoice.workflow.json`
- `examples/workflows/qualify-lead.workflow.json`
- `examples/workflows/create-checkout-and-email.workflow.json`
- `examples/workflows/db-query-ai-summary.workflow.json`

✅ Deterministic fixture server

- New app: `apps/fixture-server`.
- Provides fake provider endpoints for deterministic CI only.
- Explicitly not evidence of live provider success.

✅ Console upgrades

The console now includes:

- Provider marketplace panel.
- Policy editor.
- Upstream role editor.
- Secret rotation controls.
- Rotation receipt viewer.
- Webhook event viewer and replay control.
- Workflow step receipt cards.

## New proof gate

`pnpm smoke:v06-product`

Writes:

`.proof/v06-product-smoke-result.json`

This proves the new local/core systems and source routes exist, validates policy behavior, confirms provider-pack manifest filtering, checks workflow/policy/role examples, and checks fixture server packaging.

## Still not claimed

☐ Live provider success.
☐ Cloudflare deployment.
☐ Browser automation against a deployed console.
☐ Real Stripe subscription billing.
☐ Real provider webhook signature verification.

