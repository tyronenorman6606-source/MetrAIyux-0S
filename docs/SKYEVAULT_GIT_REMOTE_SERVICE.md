# SkyeVault Git Remote Service

This is the Git-hosting lane. It is separate from the Git vault pack lane, but both now feed the same SkyeVault operator story.

- Git vault pack lane: clone-capable backup/export/restore zip.
- Git remote service lane: real Git smart HTTP push/fetch/clone against bare repositories, with policy, quota, snapshots, bundle exports, restore verification, and workspace neural-map output.

## Start A Local Remote

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

The server auto-creates a bare repo on first authenticated access unless started with `--no-auto-create`.

Supported Git smart HTTP behavior:

- `git push` through `git-receive-pack`
- `git fetch` and `git clone` through `git-upload-pack`
- Basic auth token in the password slot
- Bearer auth for API endpoints
- Bare repo storage under `${SKYEVAULT_GIT_REMOTE_ROOT}/repos/<workspace>/<repo>.git`
- Pre-receive policy hooks for protected refs
- Branch-policy JSON persisted under the storage root
- Quota checks after pack receive and before ref updates
- Snapshot, verify, and restore maintenance commands

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
- `GET /__skyevault/quota` returns repository/workspace quota totals.
- `GET /__skyevault/workspaces/:workspace/quota` returns quota totals for one workspace.
- `GET /__skyevault/policy` returns the active branch/tag policy.
- `PUT /__skyevault/policy` updates the active branch/tag policy for admins.
- `GET /__skyevault/snapshots` lists verified snapshot manifests.
- `POST /__skyevault/snapshots` creates a verified Git bundle snapshot for repos.
- `GET /__skyevault/snapshots/:id` returns a snapshot manifest.
- `POST /__skyevault/snapshots/:id/verify` verifies snapshot bundles and checksums.

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
- Protected release tags such as `refs/tags/v*` and `refs/tags/release-*` reject rewrites.
- Ref deletion is denied.

Policy knobs:

```bash
SKYEVAULT_PROTECTED_REFS=refs/heads/main,refs/heads/master
SKYEVAULT_ALLOW_FORCE_PUSH=0
SKYEVAULT_ALLOW_DELETE_REFS=0
```

## CLI And Maintenance

Developer CLI:

```bash
node tools/skyevault-cli.mjs login --remote-url=http://127.0.0.1:8787 --token="$SKYEVAULT_GIT_REMOTE_TOKEN" --workspace=acme
node tools/skyevault-cli.mjs clone app ./app
node tools/skyevault-cli.mjs remote-add --repo=app --name=vault
node tools/skyevault-cli.mjs status --repo=app
node tools/skyevault-cli.mjs snapshot
node tools/skyevault-cli.mjs quota
node tools/skyevault-cli.mjs policy
```

Operator maintenance:

```bash
npm run vault:git:remote:inventory -- --storage-root=/var/lib/skyevault-git-remote
npm run vault:git:remote:snapshot -- --storage-root=/var/lib/skyevault-git-remote
npm run vault:git:remote:verify-snapshot -- --storage-root=/var/lib/skyevault-git-remote --snapshot=latest
npm run vault:git:remote:restore-snapshot -- --storage-root=/var/lib/skyevault-git-remote --target-storage-root=/var/lib/skyevault-git-remote-restored --snapshot=latest --repo=acme/app
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

The proof starts a temporary remote service, creates a client repo, commits, pushes to `vault`, clones from `vault`, pushes a second commit, verifies protected-branch force-push rejection, rejects viewer and wrong-workspace writes, rejects protected tag rewrites, checks Gate auth, exercises policy/quota/snapshot APIs, verifies snapshot creation, runs local maintenance snapshot/restore, runs the CLI flow, compares archive diffs, opens the operator UI, clones from an exported bundle, then checks the remote ledger and neural map output.

## Current Boundary

This is now Git-level for push/fetch/clone over smart HTTP, plus operator UI/API, policy, quota, verified snapshots, maintenance restore, CLI, SSH forced-command wrapper, ref ledger, neural-map output, and cloneable bundle export. It is not a GitHub-style collaboration suite, but the repo storage/recovery lane is real Git infrastructure.

Commercial hosting still needs platform services around it:

- Hosted deployment target and observability for the remote service.
- Tenant/workspace key management UI around the existing Gate-scoped runtime.
- Richer branch protection UI around the existing policy endpoint.
- Webhooks and CI status APIs.
- LFS support.
- Review/PR layer.
