# SkyeVault Repo Push

Use this repo-side command to send a sanitized snapshot of this workspace into SkyeVault-Drop.

```bash
npm run vault:dry-run
npm run vault:push
```

The command builds the staging tree and zip archive under `/tmp/skyevault-repo-push` by default, scans the staged files for live-looking secrets, streams the zip through SkyeVault-Drop's existing `/api/upload-session` and `/api/upload-complete` flow, and writes a local receipt JSON under `.skyevault-out/`. Successful pushes also print and save a short-lived download link plus the client-vault recovery URL, so the pusher can immediately pull the archived package back down without operator digging. If the workspace volume is full when writing the receipt, it falls back to `/tmp/skyevault-repo-push/receipts`.

Successful uploads also append `.skyevault-out/vault-ledger.jsonl` so operators can audit local push history even when individual receipt files are moved later.

It excludes `.env*`, `.git`, `node_modules`, `.netlify`, `.wrangler`, backups, WAL archives, database dumps/files, private keys, existing archive bundles, generated test artifacts, and any text file that matches the credential scanner.

Required local env values:

- `SKYEVAULT_DROP_URL` in root `.env`, or it falls back to `https://skyevault-drop.netlify.app`.
- `CLIENT_PORTAL_KEY` in `SkyeVault-Drop/.env`, or `SKYEVAULT_PORTAL_KEY` in root `.env`.
- Optional `SKYEVAULT_UPLOAD_ORIGIN` if the deployed vault allows a different origin than `https://client-drop-vault-r2.netlify.app`.
- Optional `SKYEVAULT_CLIENT_NAME`, `SKYEVAULT_CLIENT_EMAIL`, and `SKYEVAULT_PROJECT_NAME` to control receipt metadata.
- Optional `SKYEVAULT_ARCHIVE_DIR` and `SKYEVAULT_STAGE_PARENT` to override the default temp staging location.
- Optional `SKYEVAULT_UPLOAD_RETRIES` and `SKYEVAULT_UPLOAD_RETRY_BASE_MS` for multipart/API retry behavior.
- Optional `SKYEVAULT_DOWNLOAD_LINK_SECONDS` to tune the returned signed download link lifetime between 300 and 3600 seconds. Set `SKYEVAULT_RETURN_DOWNLOAD_LINK=false` to suppress immediate link creation while keeping normal receipts.
- Optional `--keep-archive` and `--keep-stage` when you need to inspect the generated zip or staging tree after a run. Successful uploads delete the temp archive and stage by default.

Important local capacity note: SkyeVault can store large remote archives, but an IDE/CDE still has its own local scratch disk. This tool keeps bulky transient packaging work off the repo volume by default so a small Codespace disk does not limit vault storage.

For a clone-capable repo restore pack, use the Git vault lane:

```bash
npm run vault:git:dry-run
npm run vault:git:push
npm run vault:git:verify -- --verify=/path/to/MetrAIyux-0S-git-vault.zip
npm run vault:git:restore -- --restore=/path/to/MetrAIyux-0S-git-vault.zip --to=/path/to/restored-repo
```

That pack includes a `git bundle` for history/branches/tags, a sanitized working tree overlay for safe dirty workspace state, `manifest.json`, `integrity.json`, and `neural-map.json`. See `docs/SKYEVAULT_GIT_VAULT_LANE.md`.

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
SKYEVAULT_DROP_URL=https://their-vault.netlify.app
SKYEVAULT_UPLOAD_ORIGIN=https://their-allowed-origin.example
SKYEVAULT_PORTAL_KEY=their-client-upload-code
SKYEVAULT_CLIENT_NAME="Client Company"
SKYEVAULT_CLIENT_EMAIL=operator@client.com
npm run vault:push
```
