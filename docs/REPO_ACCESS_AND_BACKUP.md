# Repo Access and Backup Plan

This repository should have three layers of protection:

1. GitHub remote: the source of truth for code and history.
2. SkyeVault snapshot: a sanitized offsite archive of the workspace.
3. Reproducible access path: clear clone, restore, SDK, and API choices.

The current Git remote is:

```bash
git remote -v
```

Expected origin:

```text
https://github.com/tyronenorman6606-source/MetrAIyux-0S
```

## Daily Save Ritual

Run this before and after important work:

```bash
npm run repo:health
git status --short --branch
```

Run the deeper tracked-file secret scan when preparing a major push or release:

```bash
npm run repo:health:full
```

When the current work is ready to preserve:

```bash
git add <files-you-mean-to-save>
git commit -m "Describe the saved work"
git push origin main
```

This protects the real repo history. A GitHub repository is the main way you keep access from any machine.

## Offsite Vault Snapshot

Use SkyeVault when you want a second copy outside the normal Git flow:

```bash
npm run vault:dry-run
npm run vault:push
```

The vault command creates a sanitized zip under `.skyevault-out/`, excludes secrets, dependencies, database dumps, old archives, generated test artifacts, and large media formats, then uploads it through SkyeVault-Drop.

Required local environment values are documented in [SKYEVAULT_REPO_PUSH.md](../SKYEVAULT_REPO_PUSH.md).

For contributors or outside workspaces, use scoped developer workspace keys instead of the operator upload key. See [DEVELOPER_WORKSPACE_VAULT.md](./DEVELOPER_WORKSPACE_VAULT.md) for the shared-vault infrastructure model, required environment values, and workspace isolation rules.

## Recovery From GitHub

From any new machine:

```bash
git clone https://github.com/tyronenorman6606-source/MetrAIyux-0S.git
cd MetrAIyux-0S
npm install
npm run repo:health
```

Then follow the README for the specific subproject you need.

## Recovery From SkyeVault

If GitHub or the working machine is unavailable:

1. Download the latest repo-safe archive from SkyeVault.
2. Verify the SHA-256 hash against the saved receipt JSON.
3. Unzip it into a new folder.
4. Reconnect it to GitHub:

```bash
git init
git remote add origin https://github.com/tyronenorman6606-source/MetrAIyux-0S.git
git status --short
```

If you need to restore full Git history, prefer cloning from GitHub first and then copy the recovered files over that clone.

## SDK vs API vs Repo Access

These are different access models:

- Repo access means you can clone, edit, restore, and deploy the project.
- SDK access means another app can install a package and call your reusable functions.
- API access means another app can call hosted HTTP endpoints without needing the source code.

For this repo, the strongest path is:

1. Keep GitHub as the canonical source.
2. Keep SkyeVault snapshots for disaster recovery.
3. Turn stable reusable pieces into an SDK only after their boundaries are clear.
4. Expose hosted features through an API when other people or apps need access without touching the repo.

## Large Files and Secrets

Do not commit `.env` files, private keys, service account JSON, database dumps, or local backups.

Large videos, screenshots, and proof assets can make Git hard to clone. If they are essential, use one of these patterns:

- Keep final lightweight proof assets in Git.
- Store heavy raw assets in SkyeVault, R2, releases, or another artifact store.
- Commit a manifest that points to the durable asset location.

## Minimum Safety Standard

This repo is considered protected when:

- `git remote -v` shows the GitHub origin.
- `git status --short --branch` shows the branch tracking `origin/main`.
- Important work has been committed and pushed.
- `npm run vault:dry-run` succeeds.
- `npm run vault:push` has a recent receipt when offsite backup is needed.
