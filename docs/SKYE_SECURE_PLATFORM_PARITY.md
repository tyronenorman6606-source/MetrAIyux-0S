# SkyeSecure Platform Parity Layer

SkyeSecure now has a vault-aware platform layer above the encrypted `.skyesecrets` format. This layer is the GitHub-style operating surface for encrypted offload/reload custody: inventory, access policy, audit log, search, restore rooms, and proof receipts.

## Implemented

- CLI: `tools/skye-secure-platform.mjs`
- Browser console: `metraiyux_0s_site/skye-secure-platform/index.html`
- Browser logic: `metraiyux_0s_site/assets/skye-secure-platform.js`
- End-to-end proof: `tests/skye-secure-platform-proof.mjs`
- Proof report: `test-artifacts/skye-secure-platform-proof/platform-proof-report.json`

## CLI Commands

```bash
npm run skye-secure:platform -- init --workspace=acme
npm run skye-secure:platform -- offload --root='about to delete' --passphrase-env=SKYE_SECURE_PASSPHRASE
npm run skye-secure:platform -- inventory
npm run skye-secure:platform -- search --type=environment
npm run skye-secure:platform -- grant --subject=dev-a --role=developer --pack-id=<pack>
npm run skye-secure:platform -- verify --pack-id=<pack> --passphrase-env=SKYE_SECURE_PASSPHRASE
npm run skye-secure:platform -- reload --pack-id=<pack> --to=/restore/path --passphrase-env=SKYE_SECURE_PASSPHRASE
npm run skye-secure:platform -- revoke --subject=dev-a --role=developer --pack-id=<pack>
npm run skye-secure:platform -- audit
```

## What The Platform Stores

The default platform vault is:

```text
.skyevault-out/skye-secure-platform/
```

It contains:

- `objects/*.skyesecrets`: encrypted pack objects only.
- `vault-index.json`: safe object metadata, file counts, type counts, recipients, source references, hashes.
- `access-policy.json`: local subject/role/grant policy.
- `audit-log.jsonl`: local lifecycle event log.
- `receipts/*.json`: command receipts.

## Proof Coverage

Run:

```bash
npm run skye-secure:platform-proof
```

The proof creates a fake `about-to-delete-fixture`, then verifies:

- encrypted offload object is created
- inventory tracks the object and file types
- search finds `environment` files
- access grant and revoke persist
- verify decrypts payload
- dry reload does not write files
- reload restores matching bytes
- audit log records lifecycle events
- platform console loads index/policy/audit files
- platform console searches and renders on desktop/mobile with no console errors

## Parity Status

This closes the local platform parity lane for encrypted project offload/reload and secret-pack custody. It is not a hosted GitHub replacement until server-backed identity, live team management, hosted object inventory, downloadable recovery links, signed releases, and external audit signoff are connected.
