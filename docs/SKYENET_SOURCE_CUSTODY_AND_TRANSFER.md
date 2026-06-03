# SkyeNet Source Custody And Transfer

Last updated: 2026-05-31

SkyeNet separates live hosting from source ownership.

## Current Rule

- The live app can be hosted for a client on SkyeNet without giving that client source-code access.
- Source download is account-scoped. The deployment lookup is keyed by `customer_id`, `workspace_id`, `project_id`, and `deployment_id`.
- A different customer account cannot download a deployment bundle unless the source is intentionally transferred or redeployed under that account.
- Cross-account source handoff must be an explicit owner/admin action with a transfer receipt.
- Storage-backed source transfers now also create project-aware codebase mount records for IDE/MCP reads.
- Recipient source reads are grant-based. A recipient account can list/read/search a mounted source package only after an explicit SkyeDrive, SkyeVault, or secure `.skye` transfer creates the recipient-scoped mount.

## Bob's Smoke Shop Custody

Bob's app is hosted live on SkyeNet, but the upload was performed from the founder/admin lane.

- Live app: `https://skyenet.graylondonskyes.workers.dev/bobs-smoke-shop/`
- Founder console: `https://skyenet.graylondonskyes.workers.dev/console?workspace_id=bobs-smoke-shop`
- Deployment receipt: `test-artifacts/bobs-skynet-deploy/bobs-skynet-deploy-latest.json`
- Credential source on receipt: `FREE99_ADMIN_CODE`
- Route receipt actor: `fs27-admin`
- Route receipt customer ID: `1201161732`
- Bob source policy: client-visible app access only; source handoff requires a founder-approved source transfer.

Do not place Bob's source-download URL on public flyers, public pitch pages, or client-facing handoff pages. Keep it in Founder Command only.

## Transfer Methods

The SkyeNet transfer API is:

```text
POST https://skyenet.graylondonskyes.workers.dev/api/skyenet/source-transfer
```

Body:

```json
{
  "workspace_id": "bobs-smoke-shop",
  "project_id": "bobs-smoke-shop",
  "deployment_id": "dep_20260528063233",
  "method": "secure-skye-pack"
}
```

Supported methods:

- `download`: returns the existing gated account download path.
- `instant-download-link`: returns the same gated source path as an instant handoff link without making it public.
- `skyedrive`: writes a real source archive into the private SkyeDrive transfer lane.
- `skyevault`: writes a real source archive into the private SkyeVault custody lane.
- `secure-skye-pack`: encrypts the source archive and writes a real `.skye` pack plus owner-admin key custody record.

The live API returns `status: "completed"` for storage-backed transfer methods only after the artifact is written. It returns the private object key, manifest key, byte count, and hash, but it does not return the `.skye` encryption key.

## Codebase Mount Records

Storage-backed transfers promote source custody into `fs27.skynet.codebase_mount.v1` records. These records are the SkyeNet replacement for dumping giant source archives into every repo just so an IDE or AI operator can read them.

Each mount records:

- Workspace, project, deployment, source owner, mounted customer, and relation.
- Source archive key, transfer object key, transfer manifest key, source manifest key, source index key, and tree index prefix.
- Access policy, transfer policy, read endpoints, and MCP tool metadata.

The account-scoped listing API is:

```text
GET https://skyenet.graylondonskyes.workers.dev/api/skyenet/source-codebases
GET /api/skyenet/source-codebases
GET /deploy/source-codebases
```

IDE/MCP clients use the same gated source endpoints for mounted codebases:

```text
GET /api/skyenet/source-manifest
GET /api/skyenet/source-tree
GET /api/skyenet/source-file
GET /api/skyenet/source-search
```

The main Worker and standalone SkyeNet Worker proxy these through the shared FS27 gate. Do not create a SkyeNet-specific password or client admin password for this flow.

## Archive Reads

SkyeNet supports lazy per-file reads from plain uncompressed tar, tar.gz, tar.zst, and zip source archives when the requested file is present in the source index but has not been separately materialized. JSON `/source-file` responses include `archive_lazy_read` metadata. Plain tar raw reads stream only the archive byte range with:

```text
x-skynet-source-file-mode: archive-lazy-range
```

Zip raw reads return `x-skynet-source-file-mode: archive-lazy-zip` plus `x-skynet-source-zip-method`. Gzip-compressed tar reads return `x-skynet-source-file-mode: archive-lazy-decompress`. Zstd-compressed tar reads return `x-skynet-source-file-mode: archive-lazy-zstd`. None of those archive-backed reads require full per-file materialization for indexed files.

## Live Proof Receipts

Current production receipts for the source-custody/codebase-mount lane:

- FS27 runtime deploy: `skyegatefs27-citadeldb` version `4ca8ee8c-d90d-44e4-94e1-79bee4ed1061` with `SKYENET_FUNCTION_LOADER` present as a Worker Loader.
- Main 0S Worker deploy: `metraiyux-0s-full-system` version `18023a42-4f43-46e0-8d40-49fc9057d8e4`.
- Standalone SkyeNet deploy: `skyenet` version `f4a6dd15-c592-45a1-8c5f-b9444a27c8e1`.
- Local proof: `node --test metraiyux_0s_site/tests/skyenet-source-archive-lazy-read.test.mjs` passed tar.gz, tar.zst, and zip lazy reads; deploy API `9/9`, platform adapter `16/16`, and function runtime proof `10/10` passed.
- Live parity proof: `test-artifacts/skyenet-netlify-parity/skyenet-netlify-parity-live-http-latest.json`, generated `2026-06-01T07:55:49.106Z`, `ok: true`, failures `[]`, tar.gz source-file read `ok: true`, tar.zst source-file read `ok: true`, zip source-file read `ok: true`, and all three archive reads reported `materialized_file_object: false`.
- Live parity stress: `test-artifacts/skyenet-netlify-parity-stress/skyenet-netlify-parity-stress-live-http-latest.json`, generated `2026-06-01T07:44:39.335Z`, `ok: true`, failures `[]`, deployments `dep_20260601074517`, `dep_20260601075043`, `dep_20260601075624`.
- Live 0S alias proof: `test-artifacts/skyenet-0s-source-aliases/skyenet-0s-source-aliases-live-http-latest.json`, generated `2026-06-01T08:01:40.512Z`, failures `[]`.
- Live MCP source-codebase proof: `test-artifacts/skyenet-mcp-source-codebase/skyenet-mcp-source-codebase-live-latest.json`, generated `2026-06-01T08:01:41.778Z`, mounted `quantumskyes / quantumskyes-source-custody / dep_quantumskyes_6a01d319` with `165144` files and failures `[]`.

## Secure Pack Naming

The canonical customer-facing source pack extension is:

```text
.skye
```

That naming is backed by SkyeDocxMax, which already exports encrypted `.skye` document packages. Source handoff should use the stronger SkyeSecure v2 pack lineage:

- Marker: `SKYESEC2`
- Format: `skye-secure-secret-pack-v2`
- Core package: `packages/skye-secure/skye-secure-core.mjs`
- Current SkyeNet API crypto posture: AES-256-GCM payload encryption with a private owner-admin key custody record. Public API responses never return the raw pack key.
- SkyeSecure/SkyeDocxMax lineage: passphrase and recipient wrapping remain the broader `.skye` package direction for future export/download flows.

The legacy `.skyesecrets` name remains valid for developer-secret packs, but SkyeNet customer source handoff should present the artifact as a secure `.skye` source pack.

## Public Copy Boundary

Safe public copy:

```text
Your app is hosted on SkyeNet, our standalone sovereign deploy network. Source custody stays under the deploying account until you approve a handoff. When handoff is included, we can store the source in SkyeDrive, store it in SkyeVault, create an instant gated link, or generate an encrypted secure .skye source pack.
```

Avoid public copy that implies every free hosted client automatically receives source code.
