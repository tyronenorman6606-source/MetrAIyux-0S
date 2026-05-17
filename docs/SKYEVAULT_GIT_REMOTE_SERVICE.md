# SkyeVault Git Remote Service

This is the Git-hosting lane. It is separate from the Git vault pack lane.

- Git vault pack lane: clone-capable backup/export/restore zip.
- Git remote service lane: real Git smart HTTP push/fetch against bare repositories.

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

## Proof

Run an end-to-end proof:

```bash
npm run vault:git:remote:proof
```

The proof starts a temporary remote service, creates a client repo, commits, pushes to `vault`, clones from `vault`, pushes a second commit, verifies protected-branch force-push rejection, fetches it, then checks the remote ledger and neural map output.

## Current Boundary

This is now Git-level for push/fetch/clone over smart HTTP. It is not yet a full GitHub replacement product surface.

Still needed for commercial hosting:

- Durable deployment target for the remote service.
- Tenant/workspace key management UI.
- Rich branch protection UI and per-tenant policy editing.
- Object/quota enforcement per workspace.
- Download/export bridge from bare repo to Git vault pack.
- Webhooks and CI status APIs.
- LFS support.
- Review/PR layer.
