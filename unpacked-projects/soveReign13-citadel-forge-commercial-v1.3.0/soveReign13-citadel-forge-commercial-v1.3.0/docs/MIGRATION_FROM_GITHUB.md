# Migration From GitHub / Recovery Routes

This file covers practical repository recovery into SoveReign13 Citadel Forge.

## Route A — You Still Have Local Clones

This is the fastest route.

Set env:

```bash
export LOCAL_REPO_ROOT="$HOME/projects"
export FORGEJO_URL="https://forge.example.com"
export FORGEJO_TOKEN="your_forgejo_personal_access_token"
export FORGEJO_OWNER="your-user-or-org"
```

Run:

```bash
./scripts/bulk-push-local-repos.sh
```

This script scans for `.git` directories, creates repos through the Forgejo API, then pushes mirrors.

## Route B — You Have Bare Git Backups

For bare repos:

```bash
git clone --mirror /path/to/repo.git /tmp/repo.git
cd /tmp/repo.git
git remote set-url origin https://forge.example.com/OWNER/repo.git
git push --mirror origin
```

## Route C — GitHub Account Still Allows Token/API Access

Use Forgejo's built-in migration UI:

```txt
Forgejo → + → New Migration → GitHub
```

This can import code and, depending on token/access, metadata such as issues, PRs, labels, milestones, and releases.

## Route D — GitHub Account Blocked But Netlify Has Deploy Output

Netlify deploy output is not enough to reconstruct a full monorepo by itself.

Possible recovery targets:

- Static built assets
- Environment variable names
- Build logs
- Published function bundles, sometimes
- Deploy artifacts, if download access exists

Usually missing:

- Original source tree
- Git history
- Multiple apps inside a monorepo
- Private packages
- Unbuilt server code
- Branches and tags
- Issues/PR metadata

## Route E — Local Machine Search

On Chromebook/Linux:

```bash
find "$HOME" -type d -name ".git" -prune 2>/dev/null
```

Search common project paths:

```bash
find "$HOME" /mnt/chromeos -type d -name ".git" -prune 2>/dev/null
```

For each repo found:

```bash
cd /path/to/repo
git remote -v
git branch -a
git status
```

## Route F — Old ZIPs / Uploaded Artifacts

Unzip, then inspect:

```bash
find /path/to/unzipped -maxdepth 3 -type f | head -100
find /path/to/unzipped -type d -name ".git"
```

If it has `.git`, use the bulk script.

If it does not have `.git`, create a new repo:

```bash
git init
git add .
git commit -m "Recovered source import"
git remote add citadel https://forge.example.com/OWNER/repo.git
git push -u citadel main
```

## Route G — Adopt Existing Bare Repos Inside Forgejo

Forgejo can adopt existing bare repositories if placed under its repository root and imported through the admin UI.

Use this only in trusted operator environments and only after backup.

## Minimum Migration Proof

For each recovered repo, prove:

```bash
git clone https://forge.example.com/OWNER/REPO.git /tmp/proof-REPO
cd /tmp/proof-REPO
git log --oneline -5
git branch -a
git tag --list | head
```

If it builds:

```bash
npm install
npm run build
```

or project-specific equivalent.
