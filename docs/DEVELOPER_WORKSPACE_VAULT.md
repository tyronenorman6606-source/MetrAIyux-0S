# Developer Workspace Vault

SkyeVault-Drop can run as shared vault infrastructure for multiple developers. The operator owns the deployed vault, R2 bucket, Git remote service, admin dashboard, receipts, snapshots, and recovery policy. Each developer gets a scoped upload code for archive uploads and/or a Gate-scoped Git remote identity for clone/push/fetch.

At scale this should be subscription-provisioned, not manually edited. SkyePay/SkyeGateFS27 calls SkyeVault-Drop after a paid SkyeVault subscription and the vault writes `skye-upload-vault-workspaces.json` into its R2 metadata prefix.

There are now two repo lanes:

- Archive lane: SkyeVault stores sanitized workspace snapshots, proof bundles, handoff archives, and recovery zips.
- Git remote lane: SkyeVault stores persistent bare repos so developers can clone, fetch, and push through the vault.
- Developer workspace keys and Gate-scoped identities let contributors use the same vault backend without sharing the operator key or mixing archives in one folder.

## Operator Setup

Configure the deployed SkyeVault-Drop environment with normal R2/admin values, then add a provisioning secret:

```bash
SKYEVAULT_PROVISIONING_SECRET=long-shared-secret-used-by-skyepay
```

`SKYEVAULT_DEVELOPER_WORKSPACES` is now only a bootstrap/emergency fallback. The durable registry lives in R2 and is updated by:

```text
POST /.netlify/functions/provision-workspace
```

Bootstrap fallback example:

```bash
SKYEVAULT_DEVELOPER_WORKSPACES='[
  {
    "workspaceId": "acme-dev",
    "developerId": "jordan",
    "developerName": "Jordan Dev",
    "clientName": "Acme Dev Workspace",
    "clientEmail": "jordan@example.com",
    "projectName": "Acme Workspace Snapshots",
    "destinationId": "primary",
    "maxFilesPerSubmission": 5,
    "maxTotalSubmissionGb": 50,
    "maxFileSizeGb": 50,
    "key": "long-random-dev-upload-code"
  }
]'
```

Each object uploaded with that key is stored under:

```text
<destination-prefix>/workspaces/<workspaceId>/<sessionId>/<archive-name>.zip
```

Receipts, session manifests, audit events, R2 metadata, and status responses include `workspaceId` and `developerId`.

## Skyepay Automation

SkyeGateFS27 needs these environment values:

```bash
SKYEVAULT_DROP_URL=https://skyevault-drop.netlify.app
SKYEVAULT_PROVISIONING_SECRET=the-same-long-shared-secret
SKYEVAULT_DEFAULT_DESTINATION_ID=primary
```

When a SkyeVault subscription offer is paid, the Stripe webhook provisions or updates the workspace automatically. If Stripe later sends a cancellation/unpaid terminal event, the gate suspends that workspace in SkyeVault.

## Developer Repo Setup

In a developer workspace, use the repo helper with these local environment values:

```bash
SKYEVAULT_DROP_URL=https://skyevault-drop.netlify.app
SKYEVAULT_PORTAL_KEY=long-random-dev-upload-code
SKYEVAULT_WORKSPACE_ID=acme-dev
SKYEVAULT_DEVELOPER_ID=jordan
SKYEVAULT_DEVELOPER_NAME="Jordan Dev"
SKYEVAULT_DESTINATION_ID=primary
SKYEVAULT_CLIENT_NAME="Acme Dev Workspace"
SKYEVAULT_CLIENT_EMAIL=jordan@example.com
SKYEVAULT_PROJECT_NAME="Acme Workspace Snapshots"
```

Then run:

```bash
npm run vault:dry-run
npm run vault:push
```

The helper packages a sanitized zip, excludes secret-looking files, streams the archive through the multipart API, and writes `.skyevault-out/skyevault-receipt-*.json`.

For tight IDE/CDE disks, the large staging tree and zip now default to `/tmp/skyevault-repo-push`, successful uploads delete those temp files, and only the small receipt stays in `.skyevault-out/`. Set `SKYEVAULT_ARCHIVE_DIR` or `SKYEVAULT_STAGE_PARENT` only when a workspace needs a different scratch volume.

## Developer Git Remote Setup

For active source control, use the Git remote lane instead of the archive lane:

```bash
node tools/skyevault-cli.mjs login --remote-url=https://vault.example.com --token="$GATE_TOKEN" --workspace=acme
node tools/skyevault-cli.mjs clone app ./app
cd app
node ../tools/skyevault-cli.mjs remote-add --repo=app --name=vault
git push vault main
git fetch vault
```

When a developer later downloads from the vault, the Git remote returns a normal Git clone with the refs and object graph that were pushed into that workspace repo. This is the lane to use when the dev expects their repository to come back as a working Git repository.

Archive upload is still useful for release handoff, sanitized client packages, generated static exports, or one-off workspace capture. Git remote is the active repo lane.

## Rate Limits

Each provisioned workspace can carry limits from its SkyePay plan:

- `maxFilesPerSubmission`
- `maxTotalSubmissionGb`
- `maxFileSizeGb`
- `rateLimitUploadSessionsPerWindow`
- `rateLimitStatusPerWindow`
- `rateLimitWindowMs`

The vault enforces both global request limits and workspace-specific upload/status windows, so one dev cannot burn down the shared vault lane for everybody else.

## Boundaries

Developer workspace keys can:

- Create upload sessions.
- Complete uploads.
- Check status for their own workspace sessions/receipts.
- List/download client-vault items only for matching email and workspace.
- Push/fetch/clone through the Git remote only when the Gate identity has the matching workspace and role.

Developer workspace keys cannot:

- Read the admin dashboard.
- Change vault routing config.
- Use another workspace key prefix.
- Bypass destination or per-workspace size limits.
- Rewrite protected refs/tags, delete refs, or exceed workspace quota when the Git remote policy denies it.

The operator admin token still owns global export, download, config, and audit access.
