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

The Git vault pack contains:

- `git/repository.bundle`: the full Git bundle created with `git bundle create --all`.
- `source/`: sanitized working tree overlay with safe uncommitted and untracked files.
- `manifest.json`: branch, head commit, refs, remotes with credentials redacted, status, hashes, source file manifest, and secret exclusions.
- `neural-map.json`: workspace/developer/repo/commit/file graph seed for the account brain map.
- `RESTORE.md`: manual restore and push-back commands.

The pack excludes `.env*`, private keys, credentials JSON, dependency folders, generated artifacts, dumps, local database files, previous archives, and any text file that matches the vault credential scanner.

## What A Dev Downloads

A downloaded Git vault pack can restore as a real repo clone:

```bash
npm run vault:git:restore -- --restore=/path/to/MetrAIyux-0S-git-vault.zip --to=/path/to/restored-repo
```

The restore command:

1. Extracts the pack.
2. Verifies `manifest.json` and file hashes.
3. Verifies `git/repository.bundle`.
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
- Neural map graph for account/workspace change tracking.

That is the client-facing promise: devs can push to the vault, recover a clone-capable repo, inspect what changed, and send it back to their normal Git remote when needed.
