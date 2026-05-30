# SkyeVault Repo Push

SkyeVault has two repo push postures:

- Use the managed autosync agent for owner/developer repo rescue parity: encrypted full source custody, untracked files, ignored local state, and secret-like files protected before they leave the machine.
- Use the classic `vault:push` command for sanitized handoff snapshots that should not include `.env` files, private keys, database dumps, or other local-only recovery material.

Classic sanitized handoff:

```bash
npm run vault:dry-run
npm run vault:push
```

The command builds the staging tree and zip archive under `/tmp/skyevault-repo-push` by default, scans the staged files for live-looking secrets, streams the zip through SkyeVault-Drop's existing `/api/upload-session` and `/api/upload-complete` flow, and writes a local receipt JSON under `.skyevault-out/`. Successful pushes also print and save a short-lived download link plus the client-vault recovery URL, so the pusher can immediately pull the archived package back down without operator digging. If the workspace volume is full when writing the receipt, it falls back to `/tmp/skyevault-repo-push/receipts`.

Successful uploads also append `.skyevault-out/vault-ledger.jsonl` so operators can audit local push history even when individual receipt files are moved later.

That classic handoff excludes `.env*`, `.git`, `node_modules`, `.netlify`, `.wrangler`, backups, WAL archives, database dumps/files, private keys, existing archive bundles, generated test artifacts, and any text file that matches the credential scanner. Use the autosync/full source-custody lane below when the goal is encrypted owner recovery instead of sanitized client handoff.

## SkyeVault Pro local import bridge

SkyeVault-Drop and SkyeVault Pro are separate systems. SkyeVault-Drop is the dev/repo push lane. SkyeVault Pro is the local customer/operator vault mounted inside the 0S.

To move a safe local copy from the dev lane into SkyeVault Pro without backing customer data up to company servers, stage an import folder:

```bash
npm run vault:pro:stage -- --source <folder> --out <local-import-folder>
npm run vault:pro:from-dev -- --out <local-import-folder>
npm run vault:pro:stage:latest -- --out <local-import-folder>
```

Then open SkyeVault Pro in the gated 0S, open Settings, and use **Disk sync -> Import folder**. The staged folder includes `.skye-vault-manifest.json` and excludes secret-looking files with the same scanner family used by repo push.

Required local env values:

- `SKYEVAULT_DROP_WORKER_URL` or `SKYEVAULT_DROP_URL` in root `.env`; it falls back to `https://skyevault-drop.graylondonskyes.workers.dev`.
- `CLIENT_PORTAL_KEY` in `SkyeVault-Drop/.env`, or `SKYEVAULT_PORTAL_KEY` in root `.env`.
- Optional `SKYEVAULT_UPLOAD_ORIGIN` if the deployed vault allows a different origin than the Worker URL.
- Optional `SKYEVAULT_CLIENT_NAME`, `SKYEVAULT_CLIENT_EMAIL`, and `SKYEVAULT_PROJECT_NAME` to control receipt metadata.
- Optional `SKYEVAULT_ARCHIVE_DIR` and `SKYEVAULT_STAGE_PARENT` to override the default temp staging location.
- Optional `SKYEVAULT_UPLOAD_RETRIES` and `SKYEVAULT_UPLOAD_RETRY_BASE_MS` for multipart/API retry behavior.
- Optional `SKYEVAULT_DOWNLOAD_LINK_SECONDS` to tune the returned signed download link lifetime between 300 and 3600 seconds. Set `SKYEVAULT_RETURN_DOWNLOAD_LINK=false` to suppress immediate link creation while keeping normal receipts.
- Optional `--keep-archive` and `--keep-stage` when you need to inspect the generated zip or staging tree after a run. Successful uploads delete the temp archive and stage by default.

Important local capacity note: SkyeVault can store large remote archives, but an IDE/CDE still has its own local scratch disk. This tool keeps bulky transient packaging work off the repo volume by default so a small Codespace disk does not limit vault storage.

## Ten-minute parity autosync

Use autosync when a developer should not have to remember which vault lane catches a given change:

```bash
npm run vault:agent:status
npm run vault:delta:dry-run -- --env-file=env.txt
npm run vault:autosync:dry-run -- --env-file=env.txt --mode=full
npm run vault:autosync:notify:on
npm run vault:agent:start -- --env-file=env.txt --mode=full --interval-seconds=600
npm run vault:agent:status
npm run vault:delta:status
npm run vault:autosync:status
npm run vault:autosync:dry-run
npm run vault:autosync
npm run vault:autosync:proof
```

The public AI handoff page is `https://skyevault-drop.graylondonskyes.workers.dev/agent-install.html`. It gives a new developer or coding AI the exact prompt and commands to start the local agent.

The default mode is `git+full`, and the owner rescue mode used for this repo is `full` with source custody. On each changed scan autosync first runs the encrypted delta journal, then it can send a Git vault restore pack for clone/history parity and/or an encrypted full-repo SkyDrive artifact for ignored/untracked/local-only continuity. If nothing changed, it records a skip receipt instead of uploading again.

Fast delta journal commands:

```bash
npm run vault:delta:dry-run -- --env-file=env.txt
npm run vault:delta:upload -- --env-file=env.txt
npm run vault:delta:status
```

The delta journal is the quick encrypted first seal for changed files, untracked source, local-critical secret/config files, and tombstones. It does not replace the complete encrypted full-repo artifact.

Modes stay explicit:

- `SKYEVAULT_AUTOSYNC_MODE=git` for Git bundle plus sanitized dirty overlay only.
- `SKYEVAULT_AUTOSYNC_MODE=safe` for the classic sanitized archive.
- `SKYEVAULT_AUTOSYNC_MODE=full` for encrypted full-repo SkyDrive only.
- `SKYEVAULT_AUTOSYNC_MODE=auto` for Git parity every changed scan, plus full encrypted upload when local-only secret/state files are detected.

Systemd timer templates live at `deploy/skyevault-autosync/systemd/` and run every ten minutes.

See `docs/SKYEVAULT_AUTOSYNC_PARITY.md`.

The autosync proof publisher keeps the 0S public proof surface current without exposing secrets:

```bash
npm run 0s:build:proof
```

That command writes `metraiyux_0s_site/proof/skyevault-autosync-proof.html`, the matching JSON proof, the rolling proof log, and the generated Worker changelog module. The 0S Worker deploy script runs the same proof step before deploy.

Resend update emails are opt-in and deduped:

```bash
npm run vault:autosync:notify:on -- --to=owner@example.com
npm run vault:autosync:proof:notify
npm run vault:autosync:notify:off
```

The SkyeVault Command Center also exposes an owner-gated notification toggle through `/api/skyevault/autosync-notify-settings`; use the local npm commands for the daemon currently running on a developer machine.

For a clone-capable repo restore pack, use the Git vault lane:

```bash
npm run vault:git:dry-run
npm run vault:git:push
npm run vault:git:verify -- --verify=/path/to/MetrAIyux-0S-git-vault.zip
npm run vault:git:restore -- --restore=/path/to/MetrAIyux-0S-git-vault.zip --to=/path/to/restored-repo
```

That pack includes a `git bundle` for history/branches/tags, a sanitized dirty overlay for safe uncommitted/untracked workspace state, `manifest.json`, `integrity.json`, and `neural-map.json`. Use `--full-overlay` only when an operator explicitly wants the older full sanitized overlay. See `docs/SKYEVAULT_GIT_VAULT_LANE.md`.

For owner-only disaster continuity that must include ignored files, `.env` files, local state, and untracked material, use the encrypted full-repo lane:

```bash
npm run vault:repo:full -- --archive-format=zip --zip-level=0 --zip-upload-concurrency=8
```

The full-repo artifact is encrypted before upload. The direct restore kit contains artifact key material and is local-only by default; upload it only with `--upload-direct-restore-kit` after an explicit private recovery decision.

Audit local vault activity:

```bash
npm run vault:ledger
```

For true Git remote push/fetch behavior, run the smart HTTP remote service:

```bash
SKYEVAULT_GIT_REMOTE_TOKEN='from-secret-manager' npm run vault:git:remote
npm run vault:git:remote:proof
```

The remote service gives developers normal `git push`, `git fetch`, and `git clone` behavior against a vault URL, plus an authenticated operator console at `/__skyevault/ui`. Operators can inspect refs/events/neural maps and export a cloneable Git bundle from the API when a portable download is needed.

To attach SkyeVault activity to the existing MetrAIyux 0S brain map:

```bash
npm run vault:0s:map
```

Open `metraiyux_0s_site/admin/skyevault-neural-map.html` to inspect the generated repo/upload graph. The command writes one aggregate operator map plus per-workspace maps under `metraiyux_0s_site/brain/skyevault-workspaces/` so account/workspace views do not need to read every tenant's graph.

See `docs/SKYEVAULT_GIT_REMOTE_SERVICE.md`.

For a client-owned vault, set these in that client's repo or shell:

```bash
SKYEVAULT_DROP_URL=https://skyevault-drop.graylondonskyes.workers.dev
SKYEVAULT_UPLOAD_ORIGIN=https://their-allowed-origin.example
SKYEVAULT_PORTAL_KEY=their-client-upload-code
SKYEVAULT_CLIENT_NAME="Client Company"
SKYEVAULT_CLIENT_EMAIL=operator@client.com
npm run vault:push
```
