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
- [ ] Move large source packages fully off deployment KV records, keeping only summary fields and R2 index pointers.
- [ ] Add cursor pagination receipts for 100k+ source manifests.
- [ ] Add prefix/folder indexes for faster tree reads on very large packages.

## Phase 3 - Archive-First Huge Package Custody

- [x] Add a source archive upload/registration lane for huge packages.
- [x] Store the canonical source archive in SkyeVault/R2 with SHA-256, byte count, file count, and owner/workspace/project metadata.
- [x] Return prebuilt archives directly from source download instead of rebuilding multi-GB tar files inside the Worker.
- [ ] Add range-read proof for giant source archives.
- [ ] Add direct binding from recovered Netlify/SkyeVault receipts to SkyeNet source packages.
- [x] Add CLI support for `--source-archive` and `--source-index-only`.
- [ ] Support `165144` files and the `quantumskyes` recovered archive as a live proof target.

## Phase 4 - SkyeDrive/SkyeVault Codebase Mounts

- [ ] Promote vault/drive source receipts into project-aware codebase records.
- [ ] Add project mount metadata: workspace, project, deployment, archive key, manifest key, index key, access policy, transfer policy.
- [ ] Add account-scoped codebase listing APIs for IDE/MCP clients.
- [ ] Add single-file read by path/range from mounted source packages.
- [ ] Add path/content search over mounted source packages.
- [ ] Keep all reads behind shared 0S/FS27 gate sessions and transfer receipts.

## Phase 5 - MCP/IDE Adapter

- [ ] Add MCP tools: `list_codebases`, `source_tree`, `source_file`, `source_search`, `download_archive`, `source_receipt`, `source_transfer`.
- [ ] Wire MCP tools to the SkyeNet/SkyeVault gated APIs.
- [ ] Add receipts proving Codex/IDE can mount a vault project and read/search without copying the full package into a repo.

## Phase 6 - Proof And Stress

- [x] Local SkyeNet deploy/proxy proof passes.
- [x] Standalone SkyeNet Worker route proof passes.
- [ ] Update live Netlify parity proof to require source manifest/tree/file/search.
- [ ] Run live SkyeNet Netlify parity proof.
- [ ] Add 165k-manifest stress without loading all bytes into Worker memory.
- [ ] Add giant archive download/range proof.
- [ ] Add unauthenticated-block proof for every mounted-codebase endpoint.
