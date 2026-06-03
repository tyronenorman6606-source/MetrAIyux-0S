# Reape0r: the Autonomous Cloud Repo Mirror

Reape0r is the portable repo custody daemon for customer workspaces.
It keeps one mutable encrypted current mirror of the repo and can upload changed
current objects to SkyeVault after SkyePay provisions a paid workspace portal
key. Owner/admin flows may also pass the shared 0S/FS27/SkyGate bearer, but a
normal buyer upload does not need a separate SkyeVault password.

## Install

```bash
tar -xzf skyevault-agent-latest.tar.gz
cd skyevault-agent
npm install --omit=dev
node bin/skyevault-agent.mjs doctor
```

## Paid Auto-Install

The paid auto-install lane is non-interactive. It writes the private env file
with `0600` permissions, configures the repo, runs `doctor`, seeds the mutable
current mirror, and installs a user-level watcher service when the machine
supports `systemd --user` or macOS `launchd`.

```bash
SKYEVAULT_AGENT_AUTO_INSTALL=1 \
SKYEVAULT_WORKSPACE_ID="my-company" \
SKYEVAULT_REPO_PATH="/path/to/repo" \
SKYEVAULT_DROP_URL="https://skyevault-drop.graylondonskyes.workers.dev" \
SKYEVAULT_PORTAL_KEY="<workspace portal key>" \
SKYEVAULT_AGENT_PASSPHRASE="<customer-owned unlock passphrase>" \
./install.sh
```

For proof or test installs that should not upload, add
`SKYEVAULT_AGENT_UPLOAD=0`. To skip service creation, add
`SKYEVAULT_AGENT_SERVICE_MODE=none`.

## Configure

```bash
export SKYEVAULT_PORTAL_KEY="<workspace portal key>"
export SKYEVAULT_AGENT_PASSPHRASE="<customer-owned unlock passphrase>"

# Optional for owner/admin or stricter deployments:
export SKYEVAULT_GATE_BEARER="<shared FS27/SkyGate bearer>"

node bin/skyevault-agent.mjs init \
  --workspace=my-company \
  --repo=/path/to/repo \
  --vault-url=https://skyevault-drop.graylondonskyes.workers.dev
```

## Run Once

```bash
node bin/skyevault-agent.mjs sync --upload
```

## Watch

```bash
node bin/skyevault-agent.mjs watch --interval-seconds=600 --upload
```

`sync` updates one encrypted current mirror. Changed files replace their current
encrypted objects, unchanged files are reused, and deleted files leave the current
manifest. Delta packs are not created unless an operator explicitly uses
`sync --legacy-delta`.

Run commands without `--json` when a human is watching the terminal. Reape0r will
print the workspace, changed counts, upload state, receipt path, restore-kit path,
and next commands. Use `--json` when proof automation needs the raw receipt.

The agent does not store bearer tokens. It reads `SKYEVAULT_PORTAL_KEY`,
`SKYEVAULT_AGENT_PASSPHRASE`, and optional `SKYEVAULT_GATE_BEARER` from the
shell or service environment each run.

## Current Mirror Model

By default the agent mirrors the repo literally, including `.git`,
uncommitted files, and untracked files. It only skips its own output folders
to avoid recursive backup loops. Use `--skip-deps` when the buyer explicitly
wants dependency folders excluded.

Each sync writes:

- encrypted current file objects
- one current file manifest
- one current restore kit
- custody receipt
- optional SkyeVault object upload receipts

## Verify And Restore

```bash
node bin/skyevault-agent.mjs verify --receipt=/path/to/current-receipt.json
node bin/skyevault-agent.mjs restore --receipt=/path/to/current-receipt.json --out=/tmp/restore
```

Unlock material stays local unless the operator deliberately exports it.
