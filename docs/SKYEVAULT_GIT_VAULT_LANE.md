# SkyeVault Git Vault Lane

This lane is the GitHub-replacement path for developer workspaces.

It is different from the plain safe archive lane:

- `npm run vault:push` sends a sanitized source archive for review, handoff, or recovery.
- `npm run vault:git:push` sends a clone-capable restore pack with Git history plus a sanitized workspace overlay.

## What A Dev Uploads

```bash
npm run vault:git:dry-run
npm run vault:git:push
```

For unattended repo continuity, use the source-of-truth/autosync wrapper:

```bash
npm run vault:source:status
npm run vault:source:start -- --env-file=env.txt --interval-seconds=600
npm run vault:autosync:dry-run
npm run vault:autosync
```

Autosync defaults to `git+full`, so Git parity and encrypted full-repo continuity advance together whenever the workspace digest changes. Coverage is tracked per lane: if a digest already has the full encrypted snapshot but is missing the Git pack, the next `git+full` pass runs only the missing Git lane and merges the old full receipt into the current primary success pointer. Set `SKYEVAULT_AUTOSYNC_MODE=git` when a workspace only needs the clone-capable Git pack. Set `SKYEVAULT_AUTOSYNC_MODE=full` only for a one-off owner checkpoint when Git-level custody is already current.

## Sovereign Source-Of-Truth Model

This lane is meant to make Codespaces disposable. The repo should be recoverable from SkyeVault first, then opened in any Codespace/local IDE after restore.

The owner continuity stack is:

1. Git-level custody: `vault:git:push` produces a clone-capable Git bundle plus sanitized dirty overlay.
2. Fast dirty custody: the delta journal seals changed/untracked/local-critical files quickly.
3. Full workspace custody: the literal encrypted `tar.zst` stream preserves the all-bytes disaster-recovery snapshot.
4. Restore guide/status: `vault:source:status` writes `.skyevault-out/sovereign-source/latest-status.json` and `.skyevault-out/sovereign-source/RESTORE_FROM_SKYEVAULT.md`.

The result is not one mutable zip. It is a stable workspace custody record with additive Git history/refs, encrypted deltas, and immutable full checkpoints.

The Git vault pack contains:

- `git/repository.bundle`: the full Git bundle created with `git bundle create --all`.
- `source/`: sanitized dirty overlay with safe uncommitted and untracked files. The Git bundle supplies committed tracked files. Use `--full-overlay` only when an operator explicitly wants the older full sanitized worktree overlay.
- `manifest.json`: branch, head commit, refs, remotes with credentials redacted, status, hashes, source file manifest, and secret exclusions.
- `integrity.json`: hashes for the manifest, bundle, source manifest, neural map, restore instructions, status, and refs.
- `neural-map.json`: workspace/developer/repo/commit/file graph seed for the account brain map.
- `SECRET_BOUNDARY.md`: local-only restore checklist for secrets, databases, private keys, generated state, and anything intentionally left out.
- `RESTORE.md`: manual restore and push-back commands.

The pack excludes `.env*`, private keys, credentials JSON, dependency folders, generated artifacts, dumps, local database files, previous archives, and any text file that matches the vault credential scanner.

For a standalone local-only report before a handoff, run:

```bash
npm run vault:secrets:manifest
```

That writes JSON, Markdown, and `.paths.txt` reports under `.skyevault-out/secret-boundary/`. The reports list paths and reasons only; they do not print secret values.

Set `SKYEVAULT_PACK_SIGNING_KEY` to attach an HMAC-SHA256 signature to `integrity.json`. Set `SKYEVAULT_PACK_SIGNING_KEY_ID` to label the active signing key without exposing the secret.

## Verify Before Restore

Downloaded packs can be verified without cloning:

```bash
npm run vault:git:verify -- --verify=/path/to/MetrAIyux-0S-git-vault.zip
```

Use `--require-signature` when a client policy requires `integrity.json` to carry a valid HMAC signature. The verifier checks the manifest hash, bundle hash, source manifest hash, neural map hash, restore instructions hash, refs/status hashes, and `git bundle verify`.

## What A Dev Downloads

A downloaded Git vault pack can restore as a real repo clone:

```bash
npm run vault:git:restore -- --restore=/path/to/MetrAIyux-0S-git-vault.zip --to=/path/to/restored-repo
```

The restore command:

1. Extracts the pack.
2. Verifies `manifest.json` and file hashes.
3. Verifies `integrity.json` and `git/repository.bundle`.
4. Runs `git clone git/repository.bundle <target>`.
5. Overlays the sanitized `source/` tree onto the clone without deleting tracked bundle files by default.
6. Writes `<target>/.skyevault-restore-report.json`.

Use `--no-overlay` when a dev wants only the clean Git clone with committed history.

Use `--delete-missing` when the restored workspace should mirror the sanitized overlay exactly. This can mark tracked secret-example files as deleted when those files were intentionally excluded from `source/`, so it is not the default clone path.

Use `--restore-symlinks` when the workspace intentionally relies on symlink state. Symlinks from the source overlay are skipped by default so a restore cannot replace real cloned directories with links.

Use `--force` only when replacing an existing restore target.

## Push Back To A Repo

After restore:

```bash
cd /path/to/restored-repo
git remote set-url origin <repo-url>
git push --all origin
git push --tags origin
```

That makes the vault pack portable: it can restore into a local IDE/CDE, then push back to GitHub, Forgejo, Gitea, GitLab, or a client-owned remote.

## Product Boundary

The vault is not pretending Google Drive can do Git diffs by itself. Drive-like storage is the object layer. SkyeVault adds the repo layer:

- Git bundle for history and branches.
- Source overlay for safe dirty workspace recovery.
- Manifest hashes for integrity.
- Receipts for audit and billing.
- Local `vault-ledger.jsonl` for operator audit trails.
- Neural map graph for account/workspace change tracking.

That is the client-facing promise: devs can push to the vault, recover a clone-capable repo, inspect what changed, and send it back to their normal Git remote when needed.
