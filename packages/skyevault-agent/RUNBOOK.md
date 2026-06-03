# Reape0r Client Runbook

This runbook is the buyer handoff for a paid Reape0r workspace.

## What The Buyer Gets

- A local Node CLI that runs where the repo files live.
- One mutable encrypted current mirror of the repo.
- Current encrypted objects for changed files, with unchanged objects reused.
- Local receipts for verify and restore.
- Uploads through the SkyePay-provisioned `SKYEVAULT_PORTAL_KEY`.
- Optional owner/admin upload hardening through the shared 0S/FS27/SkyGate bearer.

No separate SkyeVault password is created by the agent.

## Install

```bash
tar -xzf skyevault-agent-latest.tar.gz
cd skyevault-agent
./install.sh
```

Then edit:

```bash
$HOME/.config/skyevault-agent/skyevault-agent.env
```

## Auto-Install Add-On

The paid auto-install lane uses the same package. It copies Reape0r, writes
the env file with private permissions, configures the repo, runs `doctor`, runs
the first mutable current mirror sync, and starts the watcher service when the
machine supports a user service manager.

```bash
tar -xzf skyevault-agent-latest.tar.gz
cd skyevault-agent
SKYEVAULT_AGENT_AUTO_INSTALL=1 \
SKYEVAULT_WORKSPACE_ID="$SKYEVAULT_WORKSPACE_ID" \
SKYEVAULT_REPO_PATH="/path/to/repo" \
SKYEVAULT_DROP_URL="$SKYEVAULT_DROP_URL" \
SKYEVAULT_PORTAL_KEY="$SKYEVAULT_PORTAL_KEY" \
SKYEVAULT_AGENT_PASSPHRASE="<customer-owned unlock passphrase>" \
./install.sh
```

Use `SKYEVAULT_AGENT_SERVICE_MODE=none` when the buyer wants to test the first
sync before enabling the background watcher.

## Start The Workspace

```bash
set -a
. "$HOME/.config/skyevault-agent/skyevault-agent.env"
set +a

node "$HOME/.local/share/skyevault-agent/bin/skyevault-agent.mjs" doctor
node "$HOME/.local/share/skyevault-agent/bin/skyevault-agent.mjs" init \
  --workspace="$SKYEVAULT_WORKSPACE_ID" \
  --repo="$SKYEVAULT_REPO_PATH" \
  --vault-url="$SKYEVAULT_DROP_URL"
node "$HOME/.local/share/skyevault-agent/bin/skyevault-agent.mjs" sync --upload
```

## Keep It Running

```bash
node "$HOME/.local/share/skyevault-agent/bin/skyevault-agent.mjs" watch \
  --interval-seconds="${SKYEVAULT_AGENT_INTERVAL_SECONDS:-600}" \
  --upload
```

Linux operators can adapt `templates/skyevault-agent.service`.
macOS operators can adapt `templates/com.skyevault.reape0r.plist`.

## Verify

```bash
node "$HOME/.local/share/skyevault-agent/bin/skyevault-agent.mjs" verify \
  --receipt="$HOME/.skyevault-agent/workspaces/$SKYEVAULT_WORKSPACE_ID/current/current-receipt.json"
```

## Restore

```bash
node "$HOME/.local/share/skyevault-agent/bin/skyevault-agent.mjs" restore \
  --receipt="$HOME/.skyevault-agent/workspaces/$SKYEVAULT_WORKSPACE_ID/current/current-receipt.json" \
  --out=/tmp/restored-repo
```

Restore reads the current mirror receipt and rebuilds the repaired repo directly.

## What The Terminal Shows

Normal commands print a human receipt: status, workspace, repo, changed files,
deleted files, current digest, upload result, local receipt path, restore kit path,
and next commands. Add `--json` when you want the full machine-readable receipt
for automation or support.

## Buyer Security Rules

- Keep `SKYEVAULT_PORTAL_KEY` private.
- Keep `SKYEVAULT_AGENT_PASSPHRASE` private.
- Do not paste bearer tokens into public tickets, screenshots, or chat logs.
- Do not commit the env file.
- The passphrase is customer-owned. Losing it can make encrypted artifacts unrecoverable.
