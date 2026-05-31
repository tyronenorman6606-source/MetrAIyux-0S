# SkyeVault Agent

SkyeVault Agent is the portable repo custody daemon for customer workspaces.
It is local-first, creates encrypted repo snapshots, and can upload them to
SkyeVault after SkyePay provisions a paid workspace portal key. Owner/admin
flows may also pass the shared 0S/FS27/SkyGate bearer, but a normal buyer
upload does not need a separate SkyeVault password.

## Install

```bash
tar -xzf skyevault-agent-latest.tar.gz
cd skyevault-agent
npm install --omit=dev
node bin/skyevault-agent.mjs doctor --json
```

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
node bin/skyevault-agent.mjs sync --upload --json
```

## Watch

```bash
node bin/skyevault-agent.mjs watch --interval-seconds=600 --upload
```

`sync` creates the first encrypted full baseline, then future runs create encrypted
delta bundles containing changed files plus tombstones for deleted files. Use
`snapshot` or `sync --full` when the customer deliberately wants a fresh full
baseline.

The agent does not store bearer tokens. It reads `SKYEVAULT_PORTAL_KEY`,
`SKYEVAULT_AGENT_PASSPHRASE`, and optional `SKYEVAULT_GATE_BEARER` from the
shell or service environment each run.

## Snapshot Model

By default the agent snapshots the repo literally, including `.git`,
uncommitted files, and untracked files. It only skips its own output folders
to avoid recursive backup loops. Use `--skip-deps` when the buyer explicitly
wants dependency folders excluded.

Each snapshot writes:

- encrypted `.tar.enc` artifact
- local unlock receipt
- file manifest
- custody receipt
- optional SkyeVault upload receipt

Each delta writes:

- encrypted `.delta.tar.enc` artifact
- delta manifest with changed files and tombstones
- current file manifest
- custody receipt
- optional SkyeVault upload receipt

## Verify And Restore

```bash
node bin/skyevault-agent.mjs verify --receipt=/path/to/full-receipt.json --json
node bin/skyevault-agent.mjs restore --receipt=/path/to/full-receipt.json --out=/tmp/restore --json
node bin/skyevault-agent.mjs restore --receipt=/path/to/full-receipt.json --delta-receipts=/path/to/delta-receipt.json --out=/tmp/restore --json
```

Unlock material stays local unless the operator deliberately exports it.
