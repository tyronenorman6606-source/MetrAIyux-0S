# SkyeVault Owner-Private Custody Receipt

Generated: 2026-05-30

## What Changed

The repo vault lane now treats MetrAIyux-0S repo exports as founder-account custody, not client workspace intake.

The active owner scope is:

- account: `founder-metraiyux-0s-owner`
- subject: `metraiyux-owner-admin`
- workspace: `metraiyux-0s-owner`
- custody scope: `owner-private`
- visibility: `owner-only`
- access policy: `shared-gate-owner-admin-only`
- client vault listing: disabled
- client vault download: disabled

## Bound Receipts

These existing vault receipts were rebound without re-uploading the 17GB artifact:

- `cdv_1cf38e5689280e988baf684e` — `MetrAIyux-0S-full-repo-20260529T213111Z.tar.zst.enc`, `17,323,174,736` bytes
- `cdv_509b88a877b464c28b63d596` — `MetrAIyux-0S-skydrive-control-20260529T213111Z.skyesecrets`, `66,673` bytes
- `cdv_2c907c11748533e1b99da4f4` — `MetrAIyux-0S-git-vault-20260530T035338Z.zip`, `5,390,734,691` bytes

Binding receipt:

```text
test-artifacts/skyevault-owner-custody-binding/owner-custody-binding-latest.json
```

## Download Path

Use the shared owner/admin gate to mint short-lived links. The default owner handoff is now the local HTTP launcher:

```text
npm run vault:source:download -- --env-file=.env
```

Current launcher URL:

```text
http://127.0.0.1:17687/FULL_17GB_REPO_DOWNLOAD.html
```

The private fallback opener is:

```text
.skyevault-out/autosync/FULL_17GB_REPO_DOWNLOAD.html
```

The private HTML/JSON files contain expiring signed object URLs and must stay private. The signed URLs are download tickets, not account logins. Do not use local workspace file links as the owner handoff; the clickable handoff is the HTTP launcher URL.

## Clone Path

The owner-private Git-style origin is now active alongside the encrypted baseline and delta journal. It is the terminal restore path for committed refs:

```text
npm run vault:origin:start
npm run vault:origin:seed
npm run vault:origin:proof
npm run vault:origin:status
```

Current clone URL:

```text
http://127.0.0.1:8787/metraiyux-0s-owner/MetrAIyux-0S.git
```

The runtime metadata is stored privately at:

```text
.skyevault-out/git-remote/owner-git-origin.env
```

Normal Git origin auth is not a separate founder/admin password. The owner origin uses shared 0S/FS27/SkyGate/Free99 gate introspection, and terminal clone/fetch/push commands send `Authorization: Bearer <shared gate bearer>`. Static-token mode is emergency-local only and must be explicitly requested.

Proof receipts:

```text
.skyevault-out/git-remote/owner-git-origin-sync.json
.skyevault-out/git-remote/owner-git-origin-proof.json
```

The May 30 proof cloned the owner origin into a fresh `/tmp` directory, matched local `HEAD` `6336a975e8702e50e06ed26da1cb026ba06290d6`, and passed `git fsck --connectivity-only`.

## Forward Rule

Future daemon uploads now default to owner-private custody metadata for repo pushes. Client and developer workspaces must not be able to list or mint downloads for owner repo artifacts. The managed daemon also sets `SKYEVAULT_AUTOSYNC_GIT_ORIGIN_SYNC=1`, so changed scans advance the encrypted delta lane and the owner Git origin without repeating the full baseline unless the owner explicitly asks for a new checkpoint.
