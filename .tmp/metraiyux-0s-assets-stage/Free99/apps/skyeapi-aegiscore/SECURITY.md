# Security Model

AegisCore treats provider credentials as sealed material. SkyeAPI keys are handles to scoped capabilities, not containers of raw secrets.

## Non-negotiables

1. Never print raw provider secrets.
2. Never return provider secrets from CLI, MCP, SDK, or hosted API responses.
3. Store local secrets encrypted with AES-256-GCM.
4. Store hosted project secret bundles encrypted before persistence.
5. Scope every SkyeAPI key to explicit capabilities.
6. Treat agent access as untrusted automation.
7. Use proof receipts for tests instead of exposing raw provider responses when possible.

## Local AegisCore Lite

The local vault is encrypted with AES-256-GCM. The encryption key is derived from `SKYEAPI_VAULT_PASSPHRASE` using `scrypt`. The encrypted vault file should live under `.aegiscore/vault.json` and must never be committed.

## Hosted AegisCore

Hosted AegisCore should store encrypted project bundles in a durable backend such as Cloudflare KV, D1, R2, or another hardened store. The gateway worker scaffold uses KV and an `AEGIS_MASTER_KEY` secret for encryption.

For production, prefer a managed KMS or HSM-backed envelope encryption design:

```txt
provider secrets -> project data key -> encrypted bundle
project data key -> KMS master key -> encrypted data key
```

## Agent/MCP restrictions

MCP tools expose capabilities, tests, and safe manifests only. Raw secret export is intentionally absent.

## Key format guidance

Use separate SkyeAPI keys by purpose:

```txt
skye_test_proj_app_dev_xxx
skye_live_proj_app_prod_xxx
skye_agent_proj_readonly_xxx
skye_ci_proj_proof_xxx
```

Do not use one permanent universal master key.
