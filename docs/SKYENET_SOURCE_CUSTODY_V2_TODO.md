# SkyeNet Source Custody v2 To-Do

## Goal

Make SkyeNet the Netlify replacement for full project custody: public build deployment, private full-source custody, SkyeDrive/SkyeVault storage, and IDE/AI-readable mounted codebases without dumping giant source packages into repos.

## Phase 1 - IDE-Readable Source API

- [x] Add gated source manifest endpoint: `GET /deploy/source-manifest`.
- [x] Add gated source tree endpoint: `GET /deploy/source-tree`.
- [x] Add gated source file endpoint: `GET /deploy/source-file`.
- [x] Add gated source search endpoint: `GET /deploy/source-search`.
- [x] Map the same endpoints through the 0S `/api/skyenet/*` proxy.
- [x] Map the same endpoints through the standalone SkyeNet Worker.
- [x] Add status capability flags for IDE-readable source codebases.
- [x] Add dashboard links for manifest/tree/search.
- [x] Keep private source behind the shared FS27/0S gate.
- [x] Prove the new APIs in local SkyeNet and standalone Worker tests.

## Phase 2 - Scalable Source Index

- [x] Write `.skyenet/source-package.json` with source package metadata.
- [x] Write `.skyenet/source-index.jsonl` as the source file index.
- [x] Store source manifest/index object keys on `deployment.source_package`.
- [x] Avoid relying only on inline `deployment.source_package.files`.
- [x] Teach source download/transfer to load from the manifest/index path.
- [x] Add `PUT /deploy/source-index` so 100k+ manifests can be uploaded as JSONL instead of one huge completion JSON body.
- [x] Move large source packages fully off deployment KV records, keeping only summary fields and R2 index pointers.
- [x] Add cursor pagination receipts for 100k+ source manifests.
- [ ] Add prefix/folder indexes for faster tree reads on very large packages.

## Phase 3 - Archive-First Huge Package Custody

- [x] Add a source archive upload/registration lane for huge packages.
- [x] Store the canonical source archive in SkyeVault/R2 with SHA-256, byte count, file count, and owner/workspace/project metadata.
- [x] Return prebuilt archives directly from source download instead of rebuilding multi-GB tar files inside the Worker.
- [x] Add range-read proof for source archives.
- [x] Stream source archive uploads from the CLI instead of reading multi-GB archives into memory.
- [x] Add direct binding from recovered Netlify/SkyeVault receipts to SkyeNet source packages.
- [x] Add CLI support for `--source-archive` and `--source-index-only`.
- [x] Make default CLI source custody upload per-file objects plus JSONL index for IDE-readable packages above 20k files.
- [x] Support `165144` files and the `quantumskyes` recovered archive as a live proof target.

## Phase 4 - SkyeDrive/SkyeVault Codebase Mounts

- [ ] Promote vault/drive source receipts into project-aware codebase records.
- [ ] Add project mount metadata: workspace, project, deployment, archive key, manifest key, index key, access policy, transfer policy.
- [x] Add account-scoped codebase listing APIs for IDE/MCP clients.
- [x] Add single-file read by path from mounted source packages.
- [x] Add path/content search over mounted source packages.
- [x] Keep all reads behind shared 0S/FS27 gate sessions and transfer receipts.

## Phase 5 - MCP/IDE Adapter

- [x] Add MCP tools: `skyenet_list_codebases`, `skyenet_source_manifest`, `skyenet_source_tree`, `skyenet_source_file`, `skyenet_source_search`.
- [x] Wire MCP tools to the SkyeNet gated APIs through shared gate bearer env only.
- [x] Add MCP stdio smoke proof for the SkyeNet source-codebase tool surface.
- [ ] Add explicit mutating MCP tools for archive transfer/download receipts after owner-approved custody UX is settled.
- [ ] Add live receipts proving Codex/IDE can mount a vault project and read/search without copying the full package into a repo.

## Phase 6 - Proof And Stress

- [x] Local SkyeNet deploy/proxy proof passes.
- [x] Standalone SkyeNet Worker route proof passes.
- [x] Local MCP stdio proof exposes read-only SkyeNet source-codebase tools.
- [x] Update live Netlify parity proof to require source manifest/tree/file/search.
- [x] Update local and live parity proof to require Netlify-style `_redirects` and `_headers`.
- [x] Update local and live parity proof to require `netlify.toml` redirects/headers.
- [x] Update local and live parity proof to require basic Netlify Forms capture.
- [x] Update local and live parity proof to require static asset byte ranges and `If-None-Match`/ETag `304`.
- [x] Refuse route registration before a storage-verified deployment complete.
- [x] Wrangler dry-run packaging passes under Node 22 for FS27 runtime and standalone SkyeNet.
- [x] Deploy FS27 runtime, standalone SkyeNet, and the 0S Worker after loading the owner Cloudflare token from `.env`.
- [x] Run live SkyeNet Netlify parity proof.
- [x] Run live SkyeNet Netlify parity stress proof.
- [x] Run managed-functions local proof for converted/signed Netlify-compatible handlers.
- [x] Add approved Skyes Over London support profile through FS27 `/deploy/support`, standalone `/support.json`, and 0S `/api/skyenet/support`.
- [x] Add customer export bundle through FS27 `/deploy/export`, standalone `/api/skyenet/export`, and 0S `/api/skyenet/export`.
- [x] Prove export redaction: no raw bearer token and no raw env secret in the customer export JSON.
- [x] Bind FS27 runtime rollups to the existing `metraiyux-citadeldb` D1 database as `RUNTIME_ROLLUP_DB`.
- [x] Enable synchronous FS27 runtime archive writes to R2 logs and CitadelDB D1 rollups with `FS27_RUNTIME_DIRECT_ARCHIVE=sync`.
- [x] Update live Netlify parity proof to require support, customer export, R2 runtime archive header, and CitadelDB D1 rollup rows.
- [x] Prove live runtime archive on production route with `x-0s-runtime-archive: sync-r2:1-d1:1-citadel:0`.
- [ ] Add 165k-manifest stress without loading all bytes into Worker memory.
- [x] Add giant archive download/range proof.
- [x] Add unauthenticated-block proof for every mounted-codebase endpoint.

## 2026-05-31 QuantumSkyes 165k Closure

- Live proof: `test-artifacts/skyenet-source-custody-165k/skyenet-quantumskyes-165k-source-custody-live-http-latest.json`.
- Netlify site ID: `fc26ebb7-a31c-4639-8997-0e4ce60d83ca`.
- Netlify deploy ID: `6a01d319da9d411f2bf94009`.
- Verified source files: `165144`.
- Archive bytes: `1134492879`.
- Archive SHA-256: `84f81d49f65775e9a765a383a333c81d68ae7bdc7c35a72f29616401d4009c8b`.
- SkyeNet project: `quantumskyes-source-custody`.
- SkyeNet deployment: `dep_quantumskyes_6a01d319`.
- Live app proof URL: `https://skyenet.graylondonskyes.workers.dev/quantumskyes-source-custody/`.
- Source index proof: `165144` files, `34` paged index objects, root/vendor tree reads, path search, single-file read.
- Archive custody proof: direct R2 multipart upload to private SkyeNet custody, archive link, `206` range response `bytes 0-0/1134492879`, invalid range `416`, and SkyeVault transfer with `stored_archive_reused: true`.
- Gate proof: unauthenticated manifest/tree/search/file/download requests reject with shared gate auth errors; authenticated account reads pass.

## Known Non-Closed Netlify Parity Boundaries

- [ ] Arbitrary uploaded serverless functions are not full production parity yet. Current closure is managed/signed function bundle conversion and local runtime proof only; unrestricted arbitrary execution still needs an isolated production runtime.
- [ ] Netlify Forms parity is basic capture only. Spam filtering, honeypot semantics, file-upload parity, and owner-facing form dashboard workflows remain future hardening.
- [ ] Static conditional requests currently prove `If-None-Match`/ETag. `If-Modified-Since` and `Last-Modified` parity remain open.
