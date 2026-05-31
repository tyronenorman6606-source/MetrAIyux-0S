# SkyeVault Repo Workspace Upgrade

SkyeVault now has three repo lanes instead of one archive-only lane.

## 1. Live Repo Remote

Use this when the workspace should behave like a normal Git remote:

```bash
SKYEVAULT_GATE_INTROSPECT_URL="https://metraiyux-0s-full-system.graylondonskyes.workers.dev/api/skygate/auth-introspect" npm run vault:git:remote
npm run vault:repo -- init --dir=./client-workspace --workspace=acme --repo=app
cd ./client-workspace
SKYEVAULT_GATE_BEARER="<shared 0S/FS27/SkyGate bearer>" npm run --prefix /workspaces/MetrAIyux-0S vault:repo -- push --dir=. --branch=main
```

The worktree stores a clean `vault` remote URL. The shared gate bearer is supplied at runtime through `SKYEVAULT_GATE_BEARER` or another accepted gate-session env var, so it does not get written into `.git/config`.

Useful commands:

```bash
npm run vault:repo -- status --dir=./client-workspace
npm run vault:repo -- diff --dir=./client-workspace
npm run vault:repo -- commit --dir=./client-workspace --message="Update client workspace"
npm run vault:repo -- sync --dir=./client-workspace --rebase
npm run vault:repo -- push --dir=./client-workspace --branch=main
```

Every command writes an operator receipt under:

```text
.skyevault-out/repo-workspace/
```

## 2. Clone-Capable Vault Pack

Use this when the team needs a portable restore package with Git history plus safe dirty-worktree state:

```bash
npm run vault:git:dry-run
npm run vault:git:push
```

The pack includes:

- `git/repository.bundle`
- `source/`
- `manifest.json`
- `integrity.json`
- `SECRET_BOUNDARY.md`
- `RESTORE.md`
- `neural-map.json`

`SECRET_BOUNDARY.md` is the important upgrade: it tells the developer what SkyeVault intentionally left out of `source/` so they know what must come from a password vault, private backup, local database export, or encrypted handoff package.

## 3. Secret Boundary Manifest

Use this before a major handoff, destructive cleanup, or AI/dev takeover:

```bash
npm run vault:secrets:manifest
```

It writes:

```text
.skyevault-out/secret-boundary/secret-boundary-*.json
.skyevault-out/secret-boundary/secret-boundary-*.md
.skyevault-out/secret-boundary/secret-boundary-*.paths.txt
```

The manifest lists paths and reasons only. It does not print secret values. The `.paths.txt` file is a review checklist for a separate encrypted local-only package when a client or dev team must preserve `.env`, keys, local databases, dumps, WAL archives, or other private state.

## Product Contract

SkyeVault can now support:

- Git-style push/fetch/clone against the vault remote.
- Worktree-level status, diff, commit, sync, and push receipts.
- Portable Git vault packs for recovery.
- Explicit local-only secret/state documentation.
- A clear split between safe vault artifacts and private secret recovery artifacts.

Do not treat secret-boundary paths as safe to upload into public Git or normal vault archives. They are the handoff checklist for private encrypted recovery.
