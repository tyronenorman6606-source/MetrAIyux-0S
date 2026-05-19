# @metraiyux/0s-sdk

Official SDK for **MetrAIyux 0S** — the autonomous command platform powered by SkyeGateFS27.

**One credential. Everything included.**

Your FS27 gate card token is the only thing you need. No Cloudflare account, no Resend key, no Stripe keys, no config files. The SDK validates your token against FS27, reads your plan limits, and routes every command through the 17-brain classification system.

---

## Install

```bash
npm install @metraiyux/0s-sdk
```

## Quick start

```javascript
import { MetrAIyux0S } from '@metraiyux/0s-sdk';

const client = new MetrAIyux0S({ token: process.env.FS27_TOKEN });

// Route a command through the brain system
const result = await client.command('Review the proposal for Acme Corp');
console.log(result.route.primary);       // e.g. "Celeste Monroe / Revenue Brain"
console.log(result.approval_required);   // false — can proceed
console.log(result.omega_review.decision); // "allow_customer_scoped"
```

## Authentication

Get your `FS27_TOKEN` from your SkyeGateFS27 account:

1. Log in at `skyegatefs27-citadeldb.graylondonskyes.workers.dev`
2. Your session JWT or API key (`kx_live_...`) works directly as the token
3. No other setup required

The SDK calls the FS27 `/auth-card` endpoint on init, which returns your workspace config: allowed AI providers, monthly spend cap, request limits, vault storage, and operations permissions.

---

## API reference

### `new MetrAIyux0S(opts)`

| Option | Type | Description |
|---|---|---|
| `token` | string | **Required.** FS27 session JWT or API key |
| `fs27Url` | string | Override FS27 Worker URL (enterprise deployments) |
| `gatewayUrl` | string | Override gateway Worker URL (enterprise deployments) |

---

### `client.init()` → card

Validates token and caches the gate card. Called automatically on first API call. Returns the gate card (identity, permissions, budget, limits).

```javascript
const card = await client.init();
// card.identity.email, card.budget.remaining_cents, card.limits.rpd
```

---

### `client.command(text, opts?)` → result

Routes a command through the 17-brain classification system with 0meg4kAI security review.

```javascript
const result = await client.command('Review the staffing proposal for Field Tech Solutions');
// result.route.primary       — assigned brain
// result.route.secondary     — backup/review brain
// result.approval_required   — true if admin approval needed
// result.omega_review        — 0meg4kAI security decision
// result.command_id          — ledger ID for proof receipts
```

**opts:**

| Option | Default | Description |
|---|---|---|
| `workspace_id` | from card | Override workspace scope |
| `strict` | false | Throw `ApprovalRequiredError` instead of returning |
| `metadata` | `{}` | Passed through to audit ledger |

---

### `client.workspace.status()` → workspace

Returns workspace status, plan info, budget, and dashboard visuals.

### `client.workspace.visuals(workspaceId?)` → visuals

Returns structured KPI data for building a customer dashboard: usage bars, command donut chart, sovereign stack status, event timeline.

### `client.workspace.commands(limit?)` → `{ rows }`

Recent command history for the workspace.

### `client.workspace.mailbox()` → mailbox

SkyeMail mailbox provisioning status.

---

### `client.billing.checkout(planId, opts?)` → `{ checkout_url, stripe_session_id }`

Creates a live Stripe checkout session. Redirect customers to `checkout_url`.

```javascript
const { checkout_url } = await client.billing.checkout('growth-cabinet', {
  customer_email: 'client@acme.com'
});
```

Available plan IDs: `starter-command`, `growth-cabinet`, `autonomous-office`

### `client.billing.status()` → billing status

Current subscription and workspace activation status.

---

### `client.proof.ledger(limit?)` → `{ rows }`

Audit ledger scoped to the workspace — every command, provisioning event, and billing action.

### `client.proof.receipt(resourceId)` → `{ receipt }`

Single audit event by ID. Use `command_id` from a command result to pull the exact receipt.

---

## Error types

```javascript
import { AuthError, PlanLimitError, ApprovalRequiredError, MetrAIyuxError } from '@metraiyux/0s-sdk';

try {
  await client.command(text, { strict: true });
} catch (err) {
  if (err instanceof ApprovalRequiredError) {
    // err.command_id, err.route.primary
  }
  if (err instanceof PlanLimitError) {
    // err.limit — the limit that was hit
  }
  if (err instanceof AuthError) {
    // token is invalid or expired
  }
}
```

---

## Enterprise deployments

For white-label or self-hosted MetrAIyux 0S instances, point the SDK at your own Workers:

```javascript
const client = new MetrAIyux0S({
  token: process.env.FS27_TOKEN,
  fs27Url: 'https://your-fs27-worker.workers.dev',
  gatewayUrl: 'https://your-provisioning-worker.workers.dev'
});
```

Everything else is identical. The SDK does not call any external services — only your FS27 and gateway URLs.

---

## How it works

```
Your app → SDK.command(text)
              ↓
         SDK sends token to FS27 /auth-card
              ↓
         FS27 returns gate card (workspace_id, plan limits, permissions)
              ↓
         SDK POSTs to /api/sdk/command with Bearer token
              ↓
         Gateway validates token (calls FS27 auth-card server-side)
              ↓
         0meg4kAI scans for security risk (quarantine / approval_required / allow)
              ↓
         Brain classifier routes to primary + secondary brain
              ↓
         Result logged to D1 ledger, mirrored to FS27 telemetry
              ↓
         SDK returns { command_id, route, omega_review, approval_required }
```

The customer never touches Cloudflare, Resend, or Stripe. All of that runs on the operator's infrastructure, behind the FS27 gate.

---

## Sovereign stack

MetrAIyux 0S runs on your infrastructure:

| Layer | Default | Replaces |
|---|---|---|
| Database | CitadelDB or Neon | External managed databases |
| Vault | SkyeVault | Google Drive, GitHub storage |
| Email | SkyeMail | Gmail-only business email |
| Payment | SkyePay | Manual checkout |
| Gate | SkyeGateFS27 | Loose API keys, unmetered AI |

---

Contact: SkyesOverLondonLC@solenterprises.org · (623) 260-7073
