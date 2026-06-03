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

- [x] Promote vault/drive source receipts into project-aware codebase records.
- [x] Add project mount metadata: workspace, project, deployment, archive key, manifest key, index key, access policy, transfer policy.
- [x] Add account-scoped codebase listing APIs for IDE/MCP clients.
- [x] Add single-file read by path from mounted source packages.
- [x] Add path/content search over mounted source packages.
- [x] Keep all reads behind shared 0S/FS27 gate sessions and transfer receipts.

## Phase 5 - MCP/IDE Adapter

- [x] Add MCP tools: `skyenet_list_codebases`, `skyenet_source_manifest`, `skyenet_source_tree`, `skyenet_source_file`, `skyenet_source_search`.
- [x] Wire MCP tools to the SkyeNet gated APIs through shared gate bearer env only.
- [x] Add MCP stdio smoke proof for the SkyeNet source-codebase tool surface.
- [x] Add live MCP receipt proving Codex/IDE can mount and read/search a current account-owned SkyeNet source codebase without copying it into a repo.
- [x] Add explicit MCP source transfer tool for owner/account-scoped download, instant link, SkyeDrive, SkyeVault, and secure `.skye` transfer receipt creation.
- [x] Add owner/admin-only `customer_id` source-custody scope override so recovered Netlify/SkyeVault source packages can be mounted by IDE/MCP without moving files into the caller's default account.
- [x] Add owner/admin default-session auto-resolution for recovered custody scopes by workspace/project/deployment so the 165k QuantumSkyes source codebase mounts without a manual `customer_id`.
- [x] Add live receipts proving Codex/IDE can mount a SkyeDrive/SkyeVault promoted project record and read/search without copying the full package into a repo.

## Phase 6 - Proof And Stress

- [x] Local SkyeNet deploy/proxy proof passes.
- [x] Standalone SkyeNet Worker route proof passes.
- [x] Local MCP stdio proof exposes read-only SkyeNet source-codebase tools.
- [x] Update live Netlify parity proof to require source manifest/tree/file/search.
- [x] Update local and live parity proof to require Netlify-style `_redirects` and `_headers`.
- [x] Update local and live parity proof to require `netlify.toml` redirects/headers.
- [x] Update local and live parity proof to require basic Netlify Forms capture.
- [x] Update local and live parity proof to require Netlify Forms multipart file uploads, private file custody, and honeypot spam classification.
- [x] Update local and live parity proof to require SkyeNet Forms owner inbox, submission read/update, private file download, receipt-only notification workflow, and policy-driven spam controls.
- [x] Update local and live parity proof to require static asset byte ranges and `If-None-Match`/ETag `304`.
- [x] Refuse route registration before a storage-verified deployment complete.
- [x] Wrangler dry-run packaging passes under Node 22 for FS27 runtime and standalone SkyeNet.
- [x] Deploy FS27 runtime, standalone SkyeNet, and the 0S Worker after loading the owner Cloudflare token from `.env`.
- [x] Run live SkyeNet Netlify parity proof.
- [x] Run live SkyeNet Netlify parity stress proof.
- [x] Run managed-functions local proof for converted/signed Netlify-compatible handlers.
- [x] Add production uploaded-functions API: `/deploy/functions-upload`, `/deploy/functions-complete`, `/deploy/functions-status`.
- [x] Bind FS27 production to `SKYENET_FUNCTION_LOADER` and activate signed uploaded bundles through Cloudflare Dynamic Workers with `globalOutbound: null`.
- [x] Invoke uploaded functions from public SkyeNet routes at `/.netlify/functions/<name>` and `/.skyenet/functions/<name>`.
- [x] Prove production uploaded-function controls: plan gate, unsigned manifest reject, signed hash-mismatch reject, activation, public invocation, receipt header, body cap, egress deny, and no raw secret leak.
- [x] Teach `npm run skyenet:deploy` to detect, bundle, upload, and activate `netlify/functions`, `functions`, or `skyenet/functions` through server-signed customer upload completion.
- [x] Prove live CLI-uploaded functions with bundled local helper imports and production Dynamic Worker invocation.
- [x] Add approved Skyes Over London support profile through FS27 `/deploy/support`, standalone `/support.json`, and 0S `/api/skyenet/support`.
- [x] Add customer export bundle through FS27 `/deploy/export`, standalone `/api/skyenet/export`, and 0S `/api/skyenet/export`.
- [x] Prove export redaction: no raw bearer token and no raw env secret in the customer export JSON.
- [x] Bind FS27 runtime rollups to the existing `metraiyux-citadeldb` D1 database as `RUNTIME_ROLLUP_DB`.
- [x] Enable synchronous FS27 runtime archive writes to R2 logs and CitadelDB D1 rollups with `FS27_RUNTIME_DIRECT_ARCHIVE=sync`.
- [x] Update live Netlify parity proof to require support, customer export, R2 runtime archive header, and CitadelDB D1 rollup rows.
- [x] Prove live runtime archive on production route with `x-0s-runtime-archive: sync-r2:1-d1:1-citadel:0`.
- [x] Add 165k-manifest stress without loading all bytes into Worker memory.
- [x] Add giant archive download/range proof.
- [x] Add unauthenticated-block proof for every mounted-codebase endpoint.
- [x] Prove live 0S-mounted static range, ETag, and `Last-Modified` / `If-Modified-Since` parity after the shared owner-session auth fix.
- [x] Prove live clean 0S aliases for `/api/skyenet/env`, `/api/skyenet/source-upload`, `/api/skyenet/source-complete`, `/api/skyenet/source-file`, and `/api/skyenet/source-transfer`.
- [x] Add plain-tar lazy archive-backed `/source-file` reads for indexed source files that have not been separately materialized.
- [x] Add project-aware `/source-codebases` API and prove it through standalone SkyeNet, 0S alias, and MCP list-codebases paths.

## 2026-05-31 QuantumSkyes 165k Closure

- Live proof: `test-artifacts/skyenet-source-custody-165k/skyenet-quantumskyes-165k-source-custody-live-http-latest.json`.
- Latest generated: `2026-05-31T09:50:01.056Z`.
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
- Account-scope truth: the latest 165k custody receipt is under the recovered source custody account scope (`customer-229147072`). Owner/admin default sessions now auto-resolve that recovered scope by workspace/project/deployment without a manual `customer_id`; ordinary non-admin customer sessions remain account-scoped and cannot mount another customer scope implicitly.
- Default owner MCP proof: `test-artifacts/skyenet-mcp-source-codebase/skyenet-mcp-source-codebase-live-latest.json`, generated `2026-05-31T11:42:57.763Z`, ran with no `SKYENET_MCP_CUSTOMER_ID`, resolved manifest/index keys under `customer-229147072`, file count `165144`, transfer receipt `srcxfer_b6d41526bc6f4fc388086b24`, failures `[]`.
- Duplicate custody protection: if multiple recovered deployment records match the same workspace/project/deployment, owner auto-resolution sorts by deployment/source freshness and selects the newest record.

## 2026-05-31 Final Live Parity Re-Proof

- 0S owner login now issues a signed shared `0s-owner.*` session when FS27 `/admin/login` does not accept the 0S owner exchange credential, and `requireGateAuth` / `requireOperatorAuth` accept that session through `introspectAnyGateToken`.
- FS27 runtime Worker `skyegatefs27-citadeldb` deployed with enhanced Forms support plus owner/admin source-custody auto-resolution at version `8bffd8ae-87aa-4872-a148-304b29963494`.
- Main 0S Worker `metraiyux-0s-full-system` redeployed after the clean alias fix at version `1ba1ccad-aa56-4ab8-ace1-bc1b30a660f5`.
- Live owner login plus `/api/skyenet/status` proof passed after deploy: login `200`, SkyeNet status `200`, token prefix `0s-owner`, source `metraiyux-0s-owner-admin-session`.
- Live 0S-mounted static conditional proof: `test-artifacts/skyenet-netlify-parity/0s-mounted-static-conditional-live-proof-latest.json`.
- 0S-mounted asset proof results: full asset `200`, range `206 bytes 2-5/16`, ETag conditional `304`, Last-Modified conditional `304`, failures `[]`.
- Live clean 0S source alias proof: `test-artifacts/skyenet-0s-source-aliases/skyenet-0s-source-aliases-live-http-latest.json`, generated `2026-05-31T10:48:24.721Z`, failures `[]`.
- Alias proof results: unauthenticated `/api/skyenet/env` `401`; authenticated `/env` -> `/deploy/env` `200`; `/source-upload` stored `README.md`; `/source-complete` verified private storage; `/source-manifest` listed the file; raw `/source-file` proxied through `x-0s-skynet-source-file-proxy: passthrough`; `/source-transfer` produced account-scoped download receipt with `client_access_without_transfer: false`.
- Live parity proof: `test-artifacts/skyenet-netlify-parity/skyenet-netlify-parity-live-http-latest.json`, generated `2026-05-31T11:49:10.546Z`, source download `200`, private source bytes `17920`, failures `[]`.
- Forms proof: URL-encoded capture `202`, multipart file upload `202`, `file_count: 1`, private form receipt key present, honeypot spam classification `202`, spam reasons `["honeypot"]`.
- Live parity stress: `test-artifacts/skyenet-netlify-parity-stress/skyenet-netlify-parity-stress-live-http-latest.json`, generated `2026-05-31T11:46:05.557Z`, `3` deploys, `36` read checks, failures `[]`.
- Stress deployment IDs: `dep_20260531114629`, `dep_20260531114800`, `dep_20260531114924`.
- Latest live CitadelDB proof: `test-artifacts/citadeldb-live-d1-sync-latest.json`, generated `2026-05-31T09:32:32.507Z`, record `citadel_live_1780219942958`, event `citadel_evt_4460918c-3518-40d9-9418-98564f050d8b`.
- Live MCP source-codebase proof: `test-artifacts/skyenet-mcp-source-codebase/skyenet-mcp-source-codebase-live-latest.json`, generated `2026-05-31T11:42:57.763Z`, target `quantumskyes / quantumskyes-source-custody / dep_quantumskyes_6a01d319` with no `customer_id` override, recovered source owner `229147072`, requesting owner `944490430`, file count `165144`, source transfer `download` receipt `srcxfer_b6d41526bc6f4fc388086b24`, failures `[]`.

## 2026-05-31 Uploaded Functions Production Closure

- FS27 runtime Worker `skyegatefs27-citadeldb` redeployed with the Dynamic Worker loader binding `SKYENET_FUNCTION_LOADER` at version `9f3455d1-97d9-42b3-8d02-9eaeeaf82bce`.
- Function bundle signing secret `SKYENET_FUNCTION_BUNDLE_SIGNING_KEY` is set as a Worker secret. The value is not printed or committed.
- Control APIs are live behind the shared FS27/0S gate: `PUT /deploy/functions-upload`, `POST /deploy/functions-complete`, and `GET /deploy/functions-status`, plus standalone/0S aliases under `/api/skyenet/functions-*`.
- Customer uploads can request `server_sign_manifest` / `customer_upload`; FS27 then sanitizes the manifest, verifies stored object hashes, signs the canonical manifest server-side, and only then activates the bundle. Unsigned completion without that flag is still rejected with `FUNCTION_BUNDLE_UNSIGNED`.
- `npm run skyenet:deploy` now detects `netlify/functions`, `functions`, or `skyenet/functions`, bundles each function with `esbuild`, uploads the bundle files, and activates them through the server-signed completion path for function-capable plans or `--functions`.
- Route runtime is live: public SkyeNet routes dispatch `/.netlify/functions/<name>` and `/.skyenet/functions/<name>` to the active deployment's signed `function_bundle`.
- Runtime isolation is Dynamic Worker based with `globalOutbound: null`, deny-by-default env, per-function body caps, CPU/subrequest limits, required invocation receipts, and a kill-switch field on the bundle record.
- Local proof: `npm run 0s:skyenet:proof` passed with deploy API activation/rejection tests and public route invocation test `SN-05c`.
- Local managed runtime proof: `node --test metraiyux_0s_site/tests/skyenet-functions-runtime.test.mjs` passed for converted functions, bundled helper imports, Netlify event shape, timeout, env grants, default-deny egress, body cap, binary body, and signature tamper rejection.
- Deploy API tests: `node --test metraiyux_0s_site/skyegate/source/SkyeGateFS27/tests/skynet-deploy-api.test.mjs` passed, including unsigned rejection and server-signed customer upload activation.
- Live parity proof: `test-artifacts/skyenet-netlify-parity/skyenet-netlify-parity-live-http-latest.json`, generated `2026-05-31T18:02:34.491Z`, returned `ok: true`, `functions_ok: true`, `function_invocation_status: 201`, source download `200`, private source bytes `21504`, failures `[]`.
- Live CLI function proof: `deploy.stdout_json.functions.uploaded: true`, `function_count: 3`, `server_signed: true`, runtime `cloudflare-dynamic-worker-v1`; `/.netlify/functions/with-helper` returned `202` with `x-skynet-route: skynet-function`, the `with-helper` function name, and a receipt header.
- Live direct API function checks included: uploaded `hello` and `egress` function source files, unsigned manifest rejected with `FUNCTION_BUNDLE_UNSIGNED`, server-signed hash mismatch rejected with `FUNCTION_BUNDLE_STORAGE_MISMATCH`, server-signed bundle activated with `function_count: 2`, public `hello` invocation returned `201` with `x-skynet-route: skynet-function` and `x-skynet-function-receipt`, oversized body rejected with `413`, egress failed under default-deny outbound policy, and `secret_leak` was empty.
- Live stress proof: `test-artifacts/skyenet-netlify-parity-stress/skyenet-netlify-parity-stress-live-http-latest.json`, generated `2026-05-31T17:53:02.436Z`, returned `ok: true`, failures `[]`, `3` live deployments, and `36` public read checks. Stress deployment IDs: `dep_20260531175328`, `dep_20260531175627`, `dep_20260531175929`.

## 2026-05-31 Forms Owner Workflow Production Closure

- FS27 runtime Worker `skyegatefs27-citadeldb` redeployed with Forms policy-aware capture and owner workflow APIs at version `20a6f05c-e87b-49ed-a1e3-f11febd22649`.
- Main 0S Worker `metraiyux-0s-full-system` redeployed with `/api/skyenet/forms-*` proxy aliases and raw private form-file passthrough at version `afda066e-5237-4c7d-89fc-e9ce1f637bb1`.
- Standalone SkyeNet Worker `skyenet` redeployed with platform-native `/api/skyenet/forms-*` aliases and a console Forms inbox panel at version `00f44b60-65cb-4789-8932-8e354e74464e`.
- Control APIs are live behind the shared gate: `GET/POST/PATCH /deploy/forms-policy`, `GET /deploy/forms-inbox`, `GET/PATCH /deploy/forms-submission`, `GET /deploy/forms-file`, and `POST /deploy/forms-notify`, plus standalone/0S aliases under `/api/skyenet/forms-*`.
- Runtime form capture now loads the deployment `forms_policy`, applies custom honeypot fields, blocked terms, blocked emails/domains, link limit, and elapsed-time checks, stores workflow/moderation metadata, keeps file uploads private, and writes receipt-only notification records without exposing raw secrets or enabling unapproved external delivery.
- Local proof: `node --test metraiyux_0s_site/tests/skyenet-platform-adapter.test.mjs` passed `14/14`, including policy write, policy spam, inbox list, submission read, private file download, owner moderation, and notification receipt checks.
- Repo proof: `npm run 0s:skyenet:proof` passed deploy API `7/7` and platform adapter `14/14`.
- Live parity proof: `test-artifacts/skyenet-netlify-parity/skyenet-netlify-parity-live-http-latest.json`, generated `2026-05-31T19:01:36.014Z`, returned `ok: true`, source download `200`, private source bytes `21504`, functions ok, and failures `[]`.
- Live Forms owner workflow proof in that receipt returned `ok: true`: policy write `200`, policy spam submit `202` with `["link_density","blocked_term","blocked_domain","too_fast"]`, inbox `200` with `3` submissions, submission read `200`, private file download `200` with `12` bytes and `x-skynet-form-file: private`, moderation `200` with status `read`, and notification receipt `200` with `queued_receipt_only`.
- Live console proof: `https://skyenet.graylondonskyes.workers.dev/console?forms-proof=1` returned `200` with `Forms inbox` and `formsFilterForm`; `https://skyenet.graylondonskyes.workers.dev/assets/skyenet.js` returned `200` with `refreshFormsInbox`, `forms-notify`, and `forms-file`.
- Live stress proof: `test-artifacts/skyenet-netlify-parity-stress/skyenet-netlify-parity-stress-live-http-latest.json`, generated `2026-05-31T18:52:40.817Z`, returned `ok: true`, failures `[]`, `3` live deployments, and `36` public read checks. Stress deployment IDs: `dep_20260531185345`, `dep_20260531185806`, `dep_20260531190220`.

## 2026-05-31 Project Codebase Mount And Archive Lazy Read Closure

- FS27 runtime Worker `skyegatefs27-citadeldb` redeployed with `/deploy/source-codebases`, project-aware SkyeDrive/SkyeVault/secure `.skye` codebase mount records, recipient read grants, and plain-tar lazy `/deploy/source-file` extraction at version `00f0638b-b002-471f-90d2-e0be6cecbf91`.
- Main 0S Worker `metraiyux-0s-full-system` redeployed with `/api/skyenet/source-codebases` proxy alias at version `18023a42-4f43-46e0-8d40-49fc9057d8e4`.
- Standalone SkyeNet Worker `skyenet` redeployed with platform-native `/api/skyenet/source-codebases` alias at version `f4a6dd15-c592-45a1-8c5f-b9444a27c8e1`.
- Storage-backed `source-transfer` methods now create `fs27.skynet.codebase_mount.v1` records with workspace, project, deployment, source owner, mounted customer, relation, archive key, transfer object key, transfer manifest key, source manifest key, source index key, tree index prefix, access policy, transfer policy, and MCP tool metadata.
- Cross-account source handoff now writes a recipient-scoped codebase mount. `findOwnerScopedDeployment` honors that mount as a source read grant, so the recipient account can list/read/search the mounted codebase only after an explicit owner/admin transfer receipt exists.
- Plain uncompressed tar archives support lazy indexed file reads through `/source-file` when the per-file object is absent. JSON reads return `archive_lazy_read` metadata; raw reads stream the archive byte range with `x-skynet-source-file-mode: archive-lazy-range`.
- Historical boundary at this point: compressed archives such as `.tar.zst`, `.gz`, and `.zip` returned `SOURCE_ARCHIVE_RANDOM_ACCESS_UNSUPPORTED` for non-materialized files. This changed on 2026-06-01 for tar.gz, tar.zst, and zip.
- Local proof: `npm run 0s:skyenet:proof` passed deploy API `8/8` and platform adapter `15/15`, including lazy tar read, 0S `/source-codebases`, SkyeVault promoted mount records, and recipient source-file read grant.
- Live parity proof: `test-artifacts/skyenet-netlify-parity/skyenet-netlify-parity-live-http-latest.json`, generated `2026-05-31T20:11:48.048Z`, returned `ok: true`, failures `[]`, and proved SkyeVault promotion with transfer `srcxfer_be136e5aec5b41f3a18971b7`, promoted count `1`, listed codebase count `1`.
- Live parity stress: `test-artifacts/skyenet-netlify-parity-stress/skyenet-netlify-parity-stress-live-http-latest.json`, generated `2026-05-31T20:04:23.486Z`, returned `ok: true`, failures `[]`, `3` live deployments, `36` public read checks, and promoted-codebase proof on every run. Stress deployment IDs: `dep_20260531200454`, `dep_20260531200837`, `dep_20260531201215`.
- Live 0S source alias proof: `test-artifacts/skyenet-0s-source-aliases/skyenet-0s-source-aliases-live-http-latest.json`, generated `2026-05-31T20:17:47.280Z`, returned `ok: true`; `/api/skyenet/source-codebases` routed to `/deploy/source-codebases`, listed one promoted mount, and `/source-transfer` SkyeVault alias promoted one owner mount.
- Live MCP source-codebase proof: `test-artifacts/skyenet-mcp-source-codebase/skyenet-mcp-source-codebase-live-latest.json`, generated after the deployment, returned `ok: true`, file count `165144`, failures `[]`, proving the MCP list/manifest/tree/file/search/transfer surface still mounts the recovered QuantumSkyes source codebase.

## 2026-06-01 Scheduled/Background Functions And Function Ops UX Closure

- FS27 runtime Worker `skyegatefs27-citadeldb` redeployed with Worker Loader, minute cron trigger, scheduled-function index records, background job acceptance, route hot-path latency fixes, build-receipt function bundle metadata intake, tar.gz lazy source-file reads, and best-effort route receipt bookkeeping at version `efebc66b-0d8a-464a-8ca0-8477cbf5b8ca`.
- Standalone SkyeNet Worker `skyenet` redeployed with console function env-grant inspection and rollback-route controls at version `661343b2-dc07-4804-8b43-f3e2ba84d3ca`.
- Function upload activation now preserves `invocation_mode`, `background`, `schedule`, `limits.env_grants`, `background_function_count`, `scheduled_function_count`, and `schedule_index` metadata.
- Scheduled functions write `fs27.skynet.function_schedule.v1` index records under `skynet:function-schedule:v1:*`; the FS27 `scheduled()` handler runs every minute, evaluates cron expressions, dispatches due functions through `/.skyenet/functions/<name>`, and writes invocation receipts.
- Background functions return `202` with `x-skynet-background-job`, run through the Dynamic Worker adapter with `ctx.waitUntil`, and still emit required function receipts.
- Standalone console proof is part of live parity now: `/console` and `/assets/skyenet.js` must expose `Functions and env grants`, `Function grants`, `env_grants`, `rollbackDeployment`, and `/api/skyenet/rollback`.
- Route registration no longer blocks owner-approved deploys on route-table quota scans or generic 0S automation receipt latency after the storage-verified route record is written.
- Local proof: `node --test metraiyux_0s_site/skyegate/source/SkyeGateFS27/tests/skynet-deploy-api.test.mjs` passed `9/9`; `node --test metraiyux_0s_site/tests/skyenet-platform-adapter.test.mjs` passed `16/16`, including scheduled cron dispatch proof.
- Live parity proof: `test-artifacts/skyenet-netlify-parity/skyenet-netlify-parity-live-http-latest.json`, generated `2026-06-01T04:57:27.838Z`, returned `ok: true`, failures `[]`, direct uploaded function count `4`, background count `1`, scheduled count `1`, `schedule_indexed_count: 1`, CLI function count `5`, console function ops `ok: true`, source download `200`, private source bytes `26112`, OS-jailed function build receipt accepted, installed local file dependency invoked, and archive-backed tar.gz source-file read `ok: true`.
- Live stress proof: `test-artifacts/skyenet-netlify-parity-stress/skyenet-netlify-parity-stress-live-http-latest.json`, generated `2026-06-01T04:45:25.464Z`, returned `ok: true`, failures `[]`, `3` fresh deployments, and `36` read checks. Stress deployment IDs: `dep_20260601044603`, `dep_20260601045200`, `dep_20260601045759`.
- Fresh source custody regression proof after the same FS27 deploy: `test-artifacts/skyenet-0s-source-aliases/skyenet-0s-source-aliases-live-http-latest.json`, generated `2026-06-01T05:02:34.052Z`, returned `ok: true`; `test-artifacts/skyenet-mcp-source-codebase/skyenet-mcp-source-codebase-live-latest.json` generated `2026-06-01T05:02:34.439Z`, returned `ok: true`, file count `165144`, failures `[]`.

## 2026-06-01 Zip Archive Lazy Read Closure

- FS27 runtime Worker `skyegatefs27-citadeldb` redeployed with zip archive-backed `/deploy/source-file` lazy reads at version `405a5bc5-9b01-466c-a81b-a562f88518c5`.
- Local proof: `node --test metraiyux_0s_site/tests/skyenet-source-archive-lazy-read.test.mjs` passed tar.gz and deflated zip lazy reads without per-file materialization.
- Local regression proof: deploy API `9/9`, platform adapter `16/16`, and SkyeNet Functions runtime proof `10/10` passed after the archive-read change.
- Live parity proof: `test-artifacts/skyenet-netlify-parity/skyenet-netlify-parity-live-http-latest.json`, generated `2026-06-01T05:31:57.858Z`, returned `ok: true`, failures `[]`, tar.gz archive read `ok: true`, zip archive read `ok: true`, zip `compression: zip`, `zip_method: deflate`, `scanned_entries: 3`, `materialized_file_object: false`.
- Live stress proof: `test-artifacts/skyenet-netlify-parity-stress/skyenet-netlify-parity-stress-live-http-latest.json`, generated `2026-06-01T05:21:11.637Z`, returned `ok: true`, failures `[]`, `3` fresh deployments, and `36` read checks.
- Fresh source custody regression proof after the same FS27 deploy: `test-artifacts/skyenet-0s-source-aliases/skyenet-0s-source-aliases-live-http-latest.json`, generated `2026-06-01T05:37:42.592Z`, returned `ok: true`; `test-artifacts/skyenet-mcp-source-codebase/skyenet-mcp-source-codebase-live-latest.json` returned `ok: true`, file count `165144`, failures `[]`.

## 2026-06-01 Tar.zst Archive Read And Deploy-Guard Closure

- FS27 runtime Worker `skyegatefs27-citadeldb` redeployed at version `4ca8ee8c-d90d-44e4-94e1-79bee4ed1061` with `SKYENET_FUNCTION_LOADER` present as a Worker Loader.
- `/deploy/source-file` lazy archive reads now cover tar.gz, tar.zst, and zip indexed source files without per-file materialization. Tar.zst raw reads report `x-skynet-source-file-mode: archive-lazy-zstd`.
- Added the reusable Wrangler guard in `tools/lib/wrangler-version-guard.mjs`; root deploy helpers now default to `wrangler@4.95.0`, run config-scoped Wrangler commands from the config directory, prefer a Node 22+ binary, and refuse loader-bearing configs under older Wrangler versions. Remaining repo-side old `4.14.0` deploy defaults for SkyeVault-Drop, SkyeMail, Relay13, and secret sync were moved to `4.95.0`.
- Local proof: `node --test tests/wrangler-version-guard.test.mjs` passed; `WRANGLER_VERSION=4.14.0 node tools/run-root-wrangler.mjs deploy --config metraiyux_0s_site/skyegate/source/SkyeGateFS27/wrangler.toml` now refuses before touching production; `node --test metraiyux_0s_site/tests/skyenet-source-archive-lazy-read.test.mjs` passed tar.gz, tar.zst, and zip lazy reads.
- Live parity proof: `test-artifacts/skyenet-netlify-parity/skyenet-netlify-parity-live-http-latest.json`, generated `2026-06-01T07:55:49.106Z`, returned `ok: true`, failures `[]`, tar.gz archive read `ok: true`, tar.zst archive read `ok: true`, zip archive read `ok: true`, and every archive-backed read reported `materialized_file_object: false`.
- Live stress proof: `test-artifacts/skyenet-netlify-parity-stress/skyenet-netlify-parity-stress-live-http-latest.json`, generated `2026-06-01T07:44:39.335Z`, returned `ok: true`, failures `[]`, `3` fresh deployments, and `36` read checks. Stress deployment IDs: `dep_20260601074517`, `dep_20260601075043`, `dep_20260601075624`.
- Fresh source custody regression proof after the same FS27 deploy: `test-artifacts/skyenet-0s-source-aliases/skyenet-0s-source-aliases-live-http-latest.json`, generated `2026-06-01T08:01:40.512Z`, returned `ok: true`; `test-artifacts/skyenet-mcp-source-codebase/skyenet-mcp-source-codebase-live-latest.json`, generated `2026-06-01T08:01:41.778Z`, returned `ok: true`, file count `165144`, failures `[]`.

## Known Non-Closed Netlify Parity Boundaries

- [x] Customer-uploaded serverless functions production gap is closed for SkyeNet/Netlify-compatible JS/ESM bundles on managed/owner-approved workspaces: CLI detection, helper-import bundling, upload, server-signed activation, public invocation, scheduled/background metadata and dispatch, body cap, default-deny egress, and receipts are live-proven.
- [x] Function owner/operator UX gap is closed for env-grant inspection and rollback route controls in the standalone SkyeNet console, backed by live proof.
- [x] Netlify Forms runtime capture, multipart private file custody, honeypot spam classification, owner inbox APIs, submission moderation, receipt-only notification workflow, private file download, and policy-driven spam controls are closed and live-proven. External email/SMS provider delivery remains intentionally disabled until a provider lane and owner-approved recipients are attached.
- [x] Project-aware SkyeDrive/SkyeVault promoted codebase records are closed for storage-backed source transfers: records are written, listed, transfer-linked, recipient-grant aware, MCP-visible, 0S-aliased, and live-proven.
- [x] Archive-backed `/source-file` reads are closed for indexed files inside plain tar, tar.gz, tar.zst, and zip archives without full per-file materialization.
- [x] Function-family deploy-time dependency install/build is closed for managed/owner-approved function bundles through the SkyeNet CLI OS-jail lane: copied project jail, scrubbed env, Linux namespace/chroot isolation when available, package install/build, build receipt upload, bundle activation, and live invocation proof.
