# Architecture

SkyeAPI has four control layers.

## 1. AegisCore

AegisCore owns provider credential ingestion, encryption, capability detection, and safe manifest generation.

It answers:

- Which providers are connected?
- Which capabilities are enabled?
- Which keys are missing?
- Can an agent safely test this project?

It does not answer by exposing raw secrets.

## 2. SkyeBroker

SkyeBroker receives normalized capability calls and routes them to the correct provider adapter.

Example:

```json
{
  "capability": "email.send",
  "input": {
    "to": "client@example.com",
    "subject": "Welcome",
    "body": "Hello from SkyeAPI"
  }
}
```

Broker flow:

```txt
Request -> authenticate SkyeAPI key -> scope check -> load encrypted project bundle -> decrypt in memory -> choose provider -> execute adapter -> redact response -> return proof/result
```

## 3. SkyeActions SDK

The SDK gives app developers stable methods:

```ts
skye.email.send(...)
skye.sms.send(...)
skye.db.query(...)
skye.ai.generateText(...)
skye.billing.createCheckout(...)
```

Apps do not import Resend, Twilio, Stripe, Neon, or OpenAI directly unless they intentionally bypass SkyeAPI.

## 4. SkyeMCP

The MCP server lets agents use safe tools:

```txt
skyeapi.capabilities.list
skyeapi.providers.health
skyeapi.manifest.safe
skyeapi.email.send_test
skyeapi.sms.send_test
```

The agent sees capabilities and proof receipts, not raw credentials.

## Modes

### Lite local mode

Developer downloads repo package or installs the CLI. Secrets are encrypted locally.

### Hosted mode

Developer uploads secrets to hosted SkyeAPI. Apps and agents use scoped SkyeAPI keys against the hosted broker.

## Production hardening targets

- KMS-backed encryption.
- Key rotation and revocation.
- Per-capability budgets.
- Audit log immutability.
- Tenant/org model via upstream auth.
- Provider failover policies.
- Secret age and rotation reminders.
- Signed proof receipts.
