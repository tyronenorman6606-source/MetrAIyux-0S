# Key Gate 13th Architecture

Updated: 2026-05-21

Key Gate 13th is the provider-key custody platform for the 0S ecosystem. It does not replace FS27, SkyGate, Free99, or the owner-admin session helpers. FS27 authenticates the user; Key Gate 13th encrypts and brokers the user/client provider keys after that gate has already passed.

## Mounted Surface

- Operator surface: `/key-gate-13th/`
- API base: `/api/key-gate-13th`
- Auth: `requireGateAuth` through the main 0S Worker only
- Gate path: `enforceZeroOsGate` before static assets or API handlers
- Storage: `KEY_GATE_13_KV`, `KEYGATE13_KV`, or `SITE_EVENTS_KV`
- Encryption secret: `KEY_GATE_13_MASTER_KEY`
- Fingerprint pepper: `KEY_GATE_13_FINGERPRINT_PEPPER`

No app-local founder, owner, admin, client-admin, or provider password is accepted.

## Custody Model

Raw provider keys are accepted only on create or rotate. The response never returns the raw key or encrypted blob.

Stored record shape:

- `encrypted`: AES-GCM ciphertext, IV, AAD hash, key version
- `fingerprint`: HMAC-SHA256 over workspace, vendor, and normalized secret
- `salted_hash`: per-record salted SHA-256 proof hash
- `last4`: masked operator hint
- `grants`: apps allowed to use the credential, usually `agentic-growth-layer`
- `scopes`: product-level purpose labels
- `audit`: create, rotate, revoke, test, and resolve events

Hashing is not used to call providers. The encrypted secret is required for later provider calls; the hash/fingerprint is only for proof, dedupe, and tamper checks.

## API Routes

- `GET /api/key-gate-13th/health`
- `GET /api/key-gate-13th/v1/schema`
- `GET /api/key-gate-13th/v1/vendors`
- `GET /api/key-gate-13th/v1/secrets`
- `POST /api/key-gate-13th/v1/secrets`
- `POST /api/key-gate-13th/v1/secrets/:id/test`
- `POST /api/key-gate-13th/v1/secrets/:id/rotate`
- `POST /api/key-gate-13th/v1/secrets/:id/revoke`
- `POST /api/key-gate-13th/v1/secrets/:id/grants`
- `GET /api/key-gate-13th/v1/audit`

Supported vendors in the first platform build:

- Google Search Console
- SEMrush
- DataForSEO
- Stripe
- Cloudflare
- OpenAI

## Agentic Growth Integration

Agentic Growth no longer accepts raw provider keys on the 0S connected-source endpoint. Browser payloads must pass credential refs:

```json
{
  "sourceConfig": {
    "gsc": {
      "credentialRef": {"id": "kg13_sec_...", "workspace_id": "workspace-id", "vendor_key": "google-search-console"},
      "siteUrl": "sc-domain:example.com"
    },
    "semrush": {
      "credentialRef": {"id": "kg13_sec_...", "workspace_id": "workspace-id", "vendor_key": "semrush"},
      "domain": "example.com"
    },
    "dataForSeo": {
      "credentialRef": {"id": "kg13_sec_...", "workspace_id": "workspace-id", "vendor_key": "dataforseo"},
      "keywords": ["service city"]
    }
  }
}
```

The Worker resolves those refs server-side through `resolveKeyGate13Credential`, checks workspace/vendor/grant, decrypts only in memory for the provider call, writes an audit event, and returns only source receipts.

## Monitoring Projects

Agentic Growth projects can bind credential refs and schedule recurring monitor cycles:

- `GET /api/agentic-growth/v1/projects`
- `POST /api/agentic-growth/v1/projects`
- `POST /api/agentic-growth/v1/projects/:id/schedule`

The scheduled Worker tick queues due `agentic_growth.scheduled_cycle` messages into `SITE_TASK_QUEUE` when configured and records receipts under `SITE_EVENTS_KV`. Publishing remains owner-reviewed by default.

## Commercial Lane

The existing SkyePay/Stripe Agentic Growth products remain the sellable lane:

- `agentic-growth-starter`
- `agentic-growth-connected`
- `agentic-growth-operator`

Connected and Operator now explicitly include Key Gate 13th encrypted provider-key refs, rotation, test, revoke, and audit custody.

## Proof Requirements

Before this is called production-ready after deployment:

- unauthenticated `/key-gate-13th/` redirects to `/admin/login.html?return=...`
- unauthenticated `/api/key-gate-13th/*` returns `401` with `x-0s-gate: fs27-required`
- authenticated create/list/test/rotate/revoke flows pass
- no response, audit, receipt, or KV event contains raw provider key material
- Agentic Growth connected pull works from a Key Gate ref and rejects raw payload keys
- desktop and mobile headed-browser proof passes under the repo live-browser policy
