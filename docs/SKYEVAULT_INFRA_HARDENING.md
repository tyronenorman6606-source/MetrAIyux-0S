# SkyeVault Infra Hardening

This is the operator checklist for treating SkyeVault as serious developer infrastructure instead of a loose upload box.

## Reliability

- Multipart uploads use retry/backoff for API requests and R2 part uploads.
- Large staging trees and archives live under `/tmp` by default.
- Receipts fall back to `/tmp/skyevault-repo-push/receipts` if the repo volume is full.
- Successful uploads append `.skyevault-out/vault-ledger.jsonl`.

Runtime knobs:

```bash
SKYEVAULT_UPLOAD_RETRIES=3
SKYEVAULT_UPLOAD_RETRY_BASE_MS=750
SKYEVAULT_GIT_STAGE_PARENT=/tmp/skyevault-git-vault
SKYEVAULT_GIT_ARCHIVE_DIR=/tmp/skyevault-git-vault/archives
```

## Integrity

Every Git vault pack contains:

- `manifest.json` for repo, branch, refs, status, source file hashes, bundle hash, and security exclusions.
- `integrity.json` for hashes over the manifest, bundle, source manifest, neural map, restore instructions, status, and refs.
- `git/bundle.verify.txt` from `git bundle verify`.

Verify a downloaded pack before restore:

```bash
npm run vault:git:verify -- --verify=/path/to/pack.zip
```

## Optional Signing

Set a per-tenant or per-company signing key when creating packs:

```bash
SKYEVAULT_PACK_SIGNING_KEY='from-secret-manager'
SKYEVAULT_PACK_SIGNING_KEY_ID='acme-prod-2026-q2'
npm run vault:git:push
```

Require that signature on verify/restore:

```bash
SKYEVAULT_PACK_SIGNING_KEY='from-secret-manager'
npm run vault:git:verify -- --verify=/path/to/pack.zip --require-signature
npm run vault:git:restore -- --restore=/path/to/pack.zip --to=/workspace/repo --require-signature
```

Do not store `SKYEVAULT_PACK_SIGNING_KEY` in the repo. Put it in the client vault, platform secret manager, or CI/CDE secret scope.

## Restore Contract

Default restore is conservative:

- Clone from `git/repository.bundle`.
- Verify hashes and bundle.
- Overlay sanitized `source/` files without deleting tracked bundle files.
- Skip symlink restoration unless `--restore-symlinks` is set.

Operators can force exact sanitized overlay only when intended:

```bash
npm run vault:git:restore -- --restore=/path/to/pack.zip --to=/workspace/repo --delete-missing
```

## Audit

Read local operator state:

```bash
npm run vault:ledger
```

The ledger report includes receipt counts, invalid receipt files, total uploaded bytes, recent receipt IDs, and local upload events by asset type.

## Remaining Platform Work

The repo-side lane is now clone-capable and verifiable. The platform should still add:

- Server-side pack classification and receipt indexing by workspace/company/user.
- Download endpoint that can stream the exact object by receipt ID with scoped auth.
- Server-side integrity verification before marking a pack restorable.
- Account neural-map ingestion from `neural-map.json` and `manifest.json`.
- Differential pack mode for large repos where full bundle upload is not needed every time.
