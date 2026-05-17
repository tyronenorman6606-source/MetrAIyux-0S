# SkyeVault Repo Push

Use this repo-side command to send a sanitized snapshot of this workspace into SkyeVault-Drop.

```bash
npm run vault:dry-run
npm run vault:push
```

The command builds the staging tree and zip archive under `/tmp/skyevault-repo-push` by default, scans the staged files for live-looking secrets, streams the zip through SkyeVault-Drop's existing `/api/upload-session` and `/api/upload-complete` flow, and writes a local receipt JSON under `.skyevault-out/`. If the workspace volume is full when writing the receipt, it falls back to `/tmp/skyevault-repo-push/receipts`.

It excludes `.env*`, `.git`, `node_modules`, `.netlify`, `.wrangler`, backups, WAL archives, database dumps/files, private keys, existing archive bundles, generated test artifacts, and any text file that matches the credential scanner.

Required local env values:

- `SKYEVAULT_DROP_URL` in root `.env`, or it falls back to `https://skyevault-drop.netlify.app`.
- `CLIENT_PORTAL_KEY` in `SkyeVault-Drop/.env`, or `SKYEVAULT_PORTAL_KEY` in root `.env`.
- Optional `SKYEVAULT_UPLOAD_ORIGIN` if the deployed vault allows a different origin than `https://client-drop-vault-r2.netlify.app`.
- Optional `SKYEVAULT_CLIENT_NAME`, `SKYEVAULT_CLIENT_EMAIL`, and `SKYEVAULT_PROJECT_NAME` to control receipt metadata.
- Optional `SKYEVAULT_ARCHIVE_DIR` and `SKYEVAULT_STAGE_PARENT` to override the default temp staging location.
- Optional `--keep-archive` and `--keep-stage` when you need to inspect the generated zip or staging tree after a run. Successful uploads delete the temp archive and stage by default.

Important local capacity note: SkyeVault can store large remote archives, but an IDE/CDE still has its own local scratch disk. This tool keeps bulky transient packaging work off the repo volume by default so a small Codespace disk does not limit vault storage.

For a client-owned vault, set these in that client's repo or shell:

```bash
SKYEVAULT_DROP_URL=https://their-vault.netlify.app
SKYEVAULT_UPLOAD_ORIGIN=https://their-allowed-origin.example
SKYEVAULT_PORTAL_KEY=their-client-upload-code
SKYEVAULT_CLIENT_NAME="Client Company"
SKYEVAULT_CLIENT_EMAIL=operator@client.com
npm run vault:push
```
