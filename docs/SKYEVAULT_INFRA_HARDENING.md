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

## Git Remote Service

For true Git push/fetch behavior, run the smart HTTP remote service:

```bash
SKYEVAULT_GIT_REMOTE_TOKEN='from-secret-manager' npm run vault:git:remote
```

Then developers can use:

```bash
git remote add vault http://x-token:${SKYEVAULT_GIT_REMOTE_TOKEN}@127.0.0.1:8787/acme/repo.git
git push vault main
git fetch vault
```

The remote service stores bare repos, writes ref-update ledgers, emits neural-map JSON from `post-receive` hooks, enforces branch/tag policy, accounts for workspace quota, and can create verified Git bundle snapshots. See `docs/SKYEVAULT_GIT_REMOTE_SERVICE.md`.

The same service exposes an authenticated operator console and API:

- `GET /__skyevault/ui` for repo/refs/events/neural-map inspection.
- `POST /__skyevault/repos` for explicit repo provisioning.
- `POST /__skyevault/repos/:workspace/:repo/export` for cloneable Git bundle export.
- `GET /__skyevault/quota` and `GET /__skyevault/workspaces/:workspace/quota` for storage accounting.
- `GET /__skyevault/policy` and `PUT /__skyevault/policy` for branch/tag policy.
- `GET /__skyevault/snapshots`, `POST /__skyevault/snapshots`, and `POST /__skyevault/snapshots/:id/verify` for verified snapshot operations.

The end-to-end proof verifies push, clone, fetch, protected-branch force-push rejection, viewer rejection, wrong-workspace rejection, protected tag rejection, policy/quota access, snapshot creation, maintenance snapshot/restore, CLI flow, vault diff, UI rendering, API access, bundle export, and clone-from-bundle restore.

SkyeVault can also feed the existing MetrAIyux 0S neural map:

```bash
npm run vault:0s:map
```

That bridge writes the aggregate operator map at `metraiyux_0s_site/brain/skyevault-vault-map.json` and per-workspace maps under `metraiyux_0s_site/brain/skyevault-workspaces/`. The 0S local brain loads the aggregate as repo/change context; account-specific views should load the workspace file for the active Gate customer/workspace. The direct admin view is `metraiyux_0s_site/admin/skyevault-neural-map.html`.

## Audit

Read local operator state:

```bash
npm run vault:ledger
```

The ledger report includes receipt counts, invalid receipt files, total uploaded bytes, recent receipt IDs, and local upload events by asset type.

## Platform Work Beyond Core Git Parity

The repo-side lane is now clone-capable, policy-gated, quota-aware, snapshot-backed, restorable, CLI-addressable, and neural-map aware. The platform should still add:

- Server-side pack classification and receipt indexing by workspace/company/user.
- Download endpoint that can stream the exact object by receipt ID with scoped auth.
- Server-side integrity verification before marking a pack restorable.
- Production account neural-map ingestion from uploaded archive `neural-map.json` and `manifest.json`.
- Differential pack mode for large repos where full bundle upload is not needed every time.
