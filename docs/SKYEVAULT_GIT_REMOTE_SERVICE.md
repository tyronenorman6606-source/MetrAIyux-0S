# SkyeVault Git Remote Service

This is the Git-hosting lane. It is separate from the Git vault pack lane.

- Git vault pack lane: clone-capable backup/export/restore zip.
- Git remote service lane: real Git smart HTTP push/fetch against bare repositories.

## Start A Local Remote

Owner-private 0S source custody should use the managed wrapper. It starts the local smart-HTTP Git service, stores the local service token in ignored private state, seeds the bare repo, syncs refs, and proves a fresh clone:

```bash
npm run vault:origin:start
npm run vault:origin:seed
npm run vault:origin:proof
npm run vault:origin:status
```

Current owner origin shape:

```text
http://127.0.0.1:8787/metraiyux-0s-owner/MetrAIyux-0S.git
```

The token is not printed. It is stored at `.skyevault-out/git-remote/owner-git-origin.env` with private file permissions. That token is a local service credential for Git Basic auth, not a separate founder/admin account; owner account identity stays in the shared 0S/FS27/SkyGate/Free99 gate lane.

Browser prompt credentials for the local Git origin:

- username: `x-token`
- password: the local value of `SKYEVAULT_GIT_REMOTE_TOKEN` in `.skyevault-out/git-remote/owner-git-origin.env`

Use this helper to print the access instructions without printing the password:

```bash
npm run vault:origin:access
```

Use this helper to rotate the local Git password and restart/resync the origin:

```bash
npm run vault:origin:reset-token
```

May 30, 2026 proof for this repo:

- service PID: recorded in `.skyevault-out/git-remote/owner-git-origin.pid.json`
- storage root: `.skyevault-out/git-remote/storage`
- seed receipt: `.skyevault-out/git-remote/owner-git-origin-sync.json`
- clone proof receipt: `.skyevault-out/git-remote/owner-git-origin-proof.json`
- remote `main` head: `6336a975e8702e50e06ed26da1cb026ba06290d6`
- fresh clone proof path: `/tmp/skyevault-owner-git-origin-proof-20260530T074843Z/MetrAIyux-0S`
- proof result: cloned `HEAD` matched local `HEAD`, and `git fsck --connectivity-only` passed

To clone from a fresh terminal without putting the token in the URL:

```bash
set -a
. .skyevault-out/git-remote/owner-git-origin.env
set +a
git -c "http.extraHeader=Authorization: Basic $(printf 'x-token:%s' "$SKYEVAULT_GIT_REMOTE_TOKEN" | base64 -w0)" \
  clone http://127.0.0.1:8787/metraiyux-0s-owner/MetrAIyux-0S.git MetrAIyux-0S
```

Autosync integration: the managed daemon sets `SKYEVAULT_AUTOSYNC_GIT_ORIGIN_SYNC=1`, so future changed scans sync this owner origin after the encrypted delta lane finishes. The full encrypted artifact remains the all-bytes baseline; the Git origin gives clone/fetch/push parity for committed refs.

## Raw Service Start

```bash
SKYEVAULT_GIT_REMOTE_TOKEN='from-secret-manager' \
SKYEVAULT_GIT_REMOTE_ROOT=/srv/skyevault/git-remotes \
npm run vault:git:remote
```

The server prints a ready line with its base URL. The default bind is `127.0.0.1:8787`.

Runtime knobs:

```bash
SKYEVAULT_GIT_REMOTE_HOST=127.0.0.1
SKYEVAULT_GIT_REMOTE_PORT=8787
SKYEVAULT_GIT_REMOTE_ROOT=/srv/skyevault/git-remotes
SKYEVAULT_GIT_REMOTE_TOKEN='from-secret-manager'
```

For local development only, `--dev-no-auth` disables auth.

Open the operator console at:

```text
http://127.0.0.1:8787/__skyevault/ui
```

With auth enabled, the browser uses Basic auth. The username can be any value; the password is `SKYEVAULT_GIT_REMOTE_TOKEN`.

## Push Like A Git Remote

```bash
git remote add vault http://x-token:${SKYEVAULT_GIT_REMOTE_TOKEN}@127.0.0.1:8787/acme/my-repo.git
git push vault main
git fetch vault
```

Or let the workspace helper set up the local folder and keep receipts for the Git-style operations:

```bash
npm run vault:repo -- init --dir=./my-repo --workspace=acme --repo=my-repo
npm run vault:repo -- status --dir=./my-repo
npm run vault:repo -- diff --dir=./my-repo
npm run vault:repo -- commit --dir=./my-repo --message="Update workspace"
SKYEVAULT_GIT_REMOTE_TOKEN='from-secret-manager' npm run vault:repo -- push --dir=./my-repo --branch=main
```

The helper stores a clean remote URL and supplies the token through a runtime HTTP auth header when pushing/fetching.

The server auto-creates a bare repo on first authenticated access unless started with `--no-auto-create`.

Supported Git smart HTTP behavior:

- `git push` through `git-receive-pack`
- `git fetch` and `git clone` through `git-upload-pack`
- Basic auth token in the password slot
- Bearer auth for API endpoints
- Bare repo storage under `${SKYEVAULT_GIT_REMOTE_ROOT}/repos/<workspace>/<repo>.git`
- Pre-receive policy hooks for protected refs

## Operator API

All operator API routes require the same token as the Git remote.

```bash
curl -H "Authorization: Bearer ${SKYEVAULT_GIT_REMOTE_TOKEN}" \
  http://127.0.0.1:8787/__skyevault/repos
```

Routes:

- `GET /__skyevault/repos` lists repo summaries.
- `POST /__skyevault/repos` creates a bare repo with JSON `{ "workspaceId": "acme", "repoId": "demo" }`.
- `GET /__skyevault/repos/:workspace/:repo` returns repo detail.
- `GET /__skyevault/repos/:workspace/:repo/refs` returns refs.
- `GET /__skyevault/repos/:workspace/:repo/events` returns the recent request/ref/export ledger for that repo.
- `GET /__skyevault/repos/:workspace/:repo/neural-map` returns the repo brain map JSON.
- `POST /__skyevault/repos/:workspace/:repo/export` writes a cloneable Git bundle under `${SKYEVAULT_GIT_REMOTE_ROOT}/exports`.
- `GET /__skyevault/ledger` returns the recent remote ledger.

## Download And Restore

The remote service stores a real bare Git repository, so normal `git clone` is the primary download path:

```bash
git clone http://x-token:${SKYEVAULT_GIT_REMOTE_TOKEN}@127.0.0.1:8787/acme/my-repo.git
```

For portable/offline download, export a bundle:

```bash
curl -X POST -H "Authorization: Bearer ${SKYEVAULT_GIT_REMOTE_TOKEN}" \
  http://127.0.0.1:8787/__skyevault/repos/acme/my-repo/export

git clone /srv/skyevault/git-remotes/exports/acme/my-repo/my-repo-YYYYMMDDTHHMMSSZ.bundle restored-repo
```

That bundle contains the full Git object graph for all refs in the bare repo. The proof script validates the exported bundle by cloning it and comparing its `HEAD` to the remote branch head.

Default ref policy:

- `refs/heads/main` and `refs/heads/master` reject non-fast-forward updates.
- Ref deletion is denied.

Policy knobs:

```bash
SKYEVAULT_PROTECTED_REFS=refs/heads/main,refs/heads/master
SKYEVAULT_ALLOW_FORCE_PUSH=0
SKYEVAULT_ALLOW_DELETE_REFS=0
```

## Audit And Neural Map

Each bare repo gets a `post-receive` hook. Ref updates write:

- `${SKYEVAULT_GIT_REMOTE_ROOT}/remote-ledger.jsonl`
- `.skyevault-out/git-remote-ledger.jsonl`
- `${SKYEVAULT_GIT_REMOTE_ROOT}/neural-map/<workspace>__<repo>.json`

The hook records:

- workspace
- repo
- remote user class
- ref
- old revision
- new revision
- create/update/delete action
- commit author/date/subject for the new revision

Inspect local operator state:

```bash
npm run vault:ledger
```

Feed SkyeVault state into the MetrAIyux 0S brain map:

```bash
npm run vault:0s:map
```

That writes `metraiyux_0s_site/brain/skyevault-vault-map.json`. The 0S local brain loads that file alongside the Obsidian sync, live-surface registry, persona registry, and sales registry. The direct admin surface is:

```text
metraiyux_0s_site/admin/skyevault-neural-map.html
```

It also writes per-workspace maps under:

```text
metraiyux_0s_site/brain/skyevault-workspaces/
```

The aggregate map is the operator overview. Each workspace map contains only that workspace's repos, ref/update graph, and repo chunks. Upload receipts attach to a workspace only when the receipt carries workspace metadata from Gate or the caller.

The generated map is public-safe by default: it keeps counts, repo refs, commit heads, event shape, receipt fingerprints, and graph nodes, but does not emit raw tokens, raw session IDs, full receipt IDs, author emails, absolute storage paths, or file bodies.

## Proof

Run an end-to-end proof:

```bash
npm run vault:git:remote:proof
```

The proof starts a temporary remote service, creates a client repo, commits, pushes to `vault`, clones from `vault`, pushes a second commit, verifies protected-branch force-push rejection, fetches it, opens the operator UI, exercises the operator API, exports a Git bundle, clones from that bundle, then checks the remote ledger and neural map output.

## Current Boundary

This is now Git-level for push/fetch/clone over smart HTTP, plus operator UI/API, ref ledger, neural-map output, and cloneable bundle export. It is not a GitHub-style collaboration suite.

Commercial hosting still needs platform services around it:

- Durable deployment target for the remote service.
- Tenant/workspace key management UI.
- Rich branch protection UI and per-tenant policy editing.
- Object/quota enforcement per workspace.
- Webhooks and CI status APIs.
- LFS support.
- Review/PR layer.
