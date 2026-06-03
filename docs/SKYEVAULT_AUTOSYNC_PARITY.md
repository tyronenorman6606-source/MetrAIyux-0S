# SkyeVault Autosync Parity

SkyeVault autosync is the repo continuity loop for developer machines, Codespaces, and local VS Code workspaces. It scans the workspace, records a local parity receipt, and only pushes when the repo/vault digest changes.

## Default Loop

```bash
npm run vault:autosync:status
npm run vault:autosync:dry-run
npm run vault:autosync
npm run vault:autosync:proof
```

For a new dev or AI operator, use the managed local agent wrapper:

```bash
npm run vault:source:status
npm run vault:source:start -- --env-file=env.txt --interval-seconds=600
npm run vault:agent:status
npm run vault:autosync:dry-run -- --env-file=env.txt --mode=full
npm run vault:autosync:notify:on
npm run vault:agent:start -- --env-file=env.txt --mode=git+full --interval-seconds=600
npm run vault:agent:status
npm run vault:agent:stop
```

`vault:source:*` is the owner-source-of-truth wrapper. It treats SkyeVault/SkyeDrive as custody and Codespaces/local IDEs as disposable compute. The owner default is now the living current mirror: `--mode=mirror --full-current-index --skip-delta`. The wrapper reports the daemon, living mirror receipt, owner Git origin, storage limits, recovery links, and writes a private restore guide at `.skyevault-out/sovereign-source/RESTORE_FROM_SKYEVAULT.md`.

Autosync also runs the configured SkyeVault Bin companion exports after the main repo custody lane:

```bash
npm run vault:bins:export:dry-run
npm run vault:bins:export
npm run vault:agents:export
```

The default export order protects agent instructions first, then the DevodeRator site/blog bin, with file-level dedupe so shared agent files are not packed twice. Companion bin upload is off unless `--upload-bins` or `SKYEVAULT_AUTOSYNC_BIN_UPLOAD=1` is set.

The public AI handoff page is:

```text
https://skyevault-drop.graylondonskyes.workers.dev/agent-install.html
```

Tell a new developer or coding AI to open that page and copy the agent instruction block. It is written to preserve the shared FS27/SkyGate/Free99 auth lane, avoid printing secrets, start the ten-minute local agent, publish proof, and report receipt paths instead of secret values.

As of 2026-05-29, `--mode=full` means literal full-repo custody by default. The agent passes `--literal-full`, forces `SKYEVAULT_FULL_REPO_LITERAL=1` and `SKYEVAULT_FULL_REPO_ALL_BYTES=1`, and treats old source-custody settings as opt-in only. A 1GB-2GB source-custody receipt is useful proof, but it is not a disaster-recovery copy of this repo when the workspace is larger than that.

The watch command runs every 600 seconds by default. The deploy timer in `deploy/skyevault-autosync/systemd/` runs the same one-shot command every ten minutes:

```bash
sudo install -m 0644 deploy/skyevault-autosync/systemd/skyevault-autosync.service /etc/systemd/system/skyevault-autosync.service
sudo install -m 0644 deploy/skyevault-autosync/systemd/skyevault-autosync.timer /etc/systemd/system/skyevault-autosync.timer
sudo systemctl daemon-reload
sudo systemctl enable --now skyevault-autosync.timer
```

Put live credentials in `/etc/skyevault/autosync.env`, not in Git.

## Daemon and Recovery Window

In this lane, "daemon" means a background process that keeps running without an open terminal or browser tab. It wakes on the interval, scans the repo, updates the living current mirror, writes receipts, syncs the owner Git origin when enabled, then sleeps.

If VS Code closes but the machine/Codespace/VM stays alive, the daemon keeps working. If the underlying workspace is stopped or destroyed, the daemon cannot keep reading files from that filesystem; the safe recovery point is the latest completed living mirror receipt. The first full-current seed can be large, but after that scan the mirror compares file metadata and hashes so normal wakes upload only changed files, new files, and deletion tombstones into the same current source of truth.

The live web role is the coordinator and recovery surface: Worker, R2, dashboard, proof log, and notifications. The file scanner itself must run wherever the files live, because a remote Worker cannot read untracked local files or root env files from a closed workstation by itself. Codespaces should be treated as compute, not custody. The custody sequence is a full current mirror for the whole workspace, with normal files stored as current objects and ignored/secret/private files stored as encrypted owner-unlock objects, plus owner-private Git refs for terminal clone/fetch/push convenience.

## Living Current Mirror

The owner backup contract is plain:

1. If no mirror exists, create a full current mirror.
2. On each later wake, scan the repo.
3. If a normal file changed, replace that file's current object.
4. If an ignored, secret-looking, or private file changed, replace its encrypted owner-unlock object.
5. If a file was deleted, remove it from the current manifest and remote object set.
6. Owner restore/download reads the current mirror as one source of truth and rebuilds one repaired repo folder.

The owner should not manually combine a baseline plus delta folders. Deltas may exist as older receipts, customer-agent proof, or a legacy fast lane, but they are not the owner-facing restore model for this repo.

Current owner commands:

```bash
npm run vault:source:start -- --env-file=.env --interval-seconds=600
npm run vault:source:status -- --env-file=.env
npm run vault:source:download -- --env-file=.env
npm run vault:mirror:restore -- --env-file=.env --out=/path/to/restore
npm run vault:mirror:export -- --env-file=.env --upload-export
npm run vault:mirror:unlock -- --env-file=.env --unlock-file=/path/to/CURRENT_REPO_UNLOCK.json --from-r2 --out=/path/to/repaired-repo --force
```

The local owner download launcher is:

```text
http://127.0.0.1:17687/CURRENT_REPO_BACKUP.html
```

The old `FULL_17GB_REPO_DOWNLOAD.html` path is a legacy alias only; it redirects to the current mirror launcher and must not serve a stale full artifact. The current launcher mints one encrypted export from the living mirror and stores the private unlock material locally. Do not publish passphrases, bearer tokens, or signed owner URLs.

June 1/2 owner living-current production proof:

- Seeded the full-current mirror to Cloudflare R2 with digest `512ac60b496b6e8e438d169e5e8831dc155b9ecaefede0c6337f2760b2cc3c5a`, `374,298` files, `512,867` entries, `20,690,721,698` total bytes, `374,290` protected files, and `0` upload failures. Receipt: `.skyevault-out/living-mirror/metraiyux-0s-owner/MetrAIyux-0S/receipts/living-mirror-20260601T212619Z.json`.
- Uploaded the first production repaired export as `MetrAIyux-0S-current-20260601T212752Z.tar.gz.enc`, `16,341,078,821` bytes, SHA-256 `66c84506007c5d0744a209f96975fb9e3e8aeec50ba199806a2c937a5e911ab0`. The signed download URL and unlock passphrase stay private in local owner receipts.
- Proved `vault:mirror:unlock` against that production export from R2. The repaired folder restored `374,298` files, `138,514` directories, `55` symlinks, and `20,690,721,698` bytes, and spot checks matched `.env`, `.git/HEAD`, and `package.json` without printing secret contents. Receipt: `.skyevault-out/living-mirror/metraiyux-0s-owner/MetrAIyux-0S/receipts/living-mirror-unlock-20260602T000343Z.json`.
- Ran a current mirror wake after the proof. New digest `327549cd2356644d7ff3b74f83ce01a8e20470a2ee4d60889f5609bc034a6865`, `374,299` files, `512,868` entries, `20,690,727,654` bytes, `101,121` changed files uploaded through `6` encrypted current packs, and `0` failed uploads. Receipt: `.skyevault-out/living-mirror/metraiyux-0s-owner/MetrAIyux-0S/receipts/living-mirror-20260602T005231Z.json`.
- Fixed and proof-backed packed-current no-change stability. Packed current files now retain their logical file role while recording encrypted backend pack storage separately, so the next no-change wake does not re-upload packed plain files. R2 proof receipt `test-artifacts/skyevault-living-mirror/2026-06-02T01-35-49-873Z.json` passes `noChangeWakeStable` with `changedCount:0`, `uploaded:0`, and `packObjects:0` on the third wake.

`.skyevault-out` is intentionally excluded from scans so local run logs, signed-link receipts, and `CURRENT_REPO_UNLOCK.json` are not folded back into the protected repo export.

## Owner Git Origin

The owner-private Git origin is the clone/fetch/push lane that sits beside the encrypted living mirror. It is not a replacement for the mirror, because Git only restores committed refs. Its job is Git parity: a fresh terminal can clone the repo from SkyeVault-owned local infrastructure instead of depending on GitHub or the current Codespace.

```bash
npm run vault:origin:start
npm run vault:origin:seed
npm run vault:origin:proof
npm run vault:origin:status
```

Current owner clone URL:

```text
http://127.0.0.1:8787/metraiyux-0s-owner/MetrAIyux-0S.git
```

The owner Git origin now starts in shared-gate mode by default. It uses `SKYEVAULT_GATE_INTROSPECT_URL` plus the same 0S/FS27/SkyGate/Free99 owner bearer used by the rest of the 0S. `.skyevault-out/git-remote/owner-git-origin.env` stores ignored runtime metadata, not a normal founder/admin password.

May 30 owner proof:

- seed receipt: `.skyevault-out/git-remote/owner-git-origin-sync.json`
- clone proof receipt: `.skyevault-out/git-remote/owner-git-origin-proof.json`
- remote storage: `.skyevault-out/git-remote/storage/repos/metraiyux-0s-owner/MetrAIyux-0S.git`
- remote `main` head: `6336a975e8702e50e06ed26da1cb026ba06290d6`
- fresh clone proof: cloned `HEAD` matched local `HEAD`, and `git fsck --connectivity-only` passed

The managed daemon exports `SKYEVAULT_AUTOSYNC_GIT_ORIGIN_SYNC=1`. Future changed daemon ticks run the encrypted delta journal, then sync the owner Git origin, while the 17GB encrypted artifact remains the all-bytes baseline.

## Legacy Fast Delta Journal

The delta journal is a legacy quick parity lane layered above older literal full-repo custody. It does not replace the living current mirror, and it is not the owner-facing restore contract for this repo. Keep it only for older receipts, customer-agent proof, or explicit experiments where the owner asks for a delta journal.

```bash
npm run vault:delta:status
npm run vault:delta:dry-run -- --env-file=env.txt --force
npm run vault:delta:upload -- --env-file=env.txt --force
npm run vault:autosync:dry-run -- --env-file=env.txt --mode=full --force --no-delta-upload
```

Autosync runs the delta journal by default before `git`, `safe`, or `full` modes when the repo digest changed. Use `--skip-delta` or `SKYEVAULT_AUTOSYNC_SKIP_DELTA=1` to disable it, `--no-delta-upload` or `SKYEVAULT_AUTOSYNC_DELTA_UPLOAD=0` to pack locally without uploading, and `--require-delta` or `SKYEVAULT_AUTOSYNC_DELTA_REQUIRED=1` to fail the whole autosync when the fast lane fails.

Private receipts live under:

```text
.skyevault-out/delta-journal/
.skyevault-out/delta-journal/latest-receipt.json
.skyevault-out/delta-journal/latest-state.json
.skyevault-out/delta-journal/delta-journal-ledger.jsonl
```

The public proof publisher includes only delta counts, digest, pack size/hash, and upload receipt ID. It does not publish file paths, file bodies, signed download URLs, passphrases, peppers, or private handoff material.

## Published Proof Lane

The build proof script turns the private autosync receipts into a public-safe heartbeat for the 0S proof surface:

```bash
npm run vault:autosync:proof
npm run 0s:build:proof
```

It writes:

```text
metraiyux_0s_site/proof/skyevault-autosync-proof.json
metraiyux_0s_site/proof/skyevault-autosync-proof-log.json
metraiyux_0s_site/proof/skyevault-autosync-proof.html
```

The proof page publishes only counts, digests, timestamps, receipt IDs, artifact sizes, delta journal summary, daemon state, and parity status. It does not publish bearer tokens, passphrases, peppers, file bodies, signed download URLs, or local secret values. `scripts/deploy-0s-worker.mjs` runs this proof publisher before the Worker deploy and regenerates `metraiyux_0s_site/cloudflare/generated-changelog-page.mjs`, so the deployed changelog/proof surface is current at build time.

The autosync digest ignores the autosync proof files it generates itself, plus the generated Worker changelog module. That prevents the proof script from creating an endless "changed because proof wrote proof" loop. The source changelog, scripts, docs, env/config files, untracked source, `.git`, and local-only critical files still participate in custody scans.

## Owner Auth Model

There is one owner/admin login lane for SkyeVault custody: the shared 0S/FS27/SkyGate/Free99 gate session. The command center and minting CLI send that same bearer through `Authorization`, `x-free99-gate-session`, and `x-skye-gate-session`. A signed SkyeVault download URL is only a temporary object ticket created after the gate accepts the owner session. SkyeSecure passphrase/pepper material unlocks encrypted `.skyesecrets` control packs; it is not another app login. Legacy admin/operator tokens are emergency fallback only when the shared gate is unavailable, and gate bearer headers take precedence when both are present.

## Resend Update Notifications

Autosync can send a deduped Resend email after a successful changed sync. The daemon hook respects the local enable/disable file and throttle.

```bash
npm run vault:autosync:notify:status
npm run vault:autosync:notify:on -- --to=owner@example.com --throttle-minutes=10
npm run vault:autosync:notify:off
npm run vault:autosync:proof:notify
```

Required email env:

```bash
RESEND_API_KEY=from-secret-manager
RESEND_FROM_EMAIL="SkyeVault <vault@your-domain.example>"
SKYEVAULT_AUTOSYNC_NOTIFY_TO=owner@example.com
SKYEVAULT_AUTOSYNC_LOGO_URL=https://metraiyux-0s-full-system.graylondonskyes.workers.dev/assets/metraiyux-0s-emblem-transparent.png
SKYEVAULT_AUTOSYNC_PROOF_URL=https://metraiyux-0s-full-system.graylondonskyes.workers.dev/proof/skyevault-autosync-proof.html
SKYEVAULT_AUTOSYNC_UNLOCK_URL=https://metraiyux-0s-full-system.graylondonskyes.workers.dev/skye-secure-secret-packs/app.html
SKYEVAULT_AUTOSYNC_COMMAND_CENTER_URL=https://metraiyux-0s-full-system.graylondonskyes.workers.dev/admin/skyevault-command-center.html
SKYEVAULT_AUTOSYNC_VAULT_DRIVE_URL=https://skyevault-drop.graylondonskyes.workers.dev/#client-vault
```

Dashboard control lives in the SkyeVault Command Center and uses the owner-gated Worker endpoint:

```text
metraiyux_0s_site/admin/skyevault-command-center.html
/api/skyevault/autosync-notify-settings
```

Local developer machines still keep the active daemon switch in `.skyevault-out/autosync-notify-settings.json`, because browsers cannot safely write that private file directly. Use the dashboard for deployed operator settings and the npm commands above for the running local daemon.

The Resend message includes the 0S logo, proof link, SkyeVault drive link, SkyeSecure unlock surface, command center link, artifact receipt link, control-pack receipt link, and delta journal receipt/download links when available. Signed links are minted only into private local receipts such as `.skyevault-out/autosync/latest-full-repo-download-links.json`; do not publish them on public proof pages.

May 29 owner proof: the slower first literal stream was stopped at 53 parts and replaced with the concurrent encrypted stream uploader. The completed full-repo artifact is `MetrAIyux-0S-full-repo-20260529T130848Z.tar.zst.enc`, `15,660,995,840` bytes (`14.59` GiB), SHA-256 `a02e131bef14a87d965a6e8cfb201dfab0130a37e7f0613f4373ce08658c85ca`, artifact receipt `cdv_f4973647019072d97eb62f11`, control-pack receipt `cdv_654dcc3550c042e62d041617`, and private signed-link output `.skyevault-out/autosync/latest-full-repo-download-links.json`.

May 29 daemon hardening: autosync now records the main custody lanes separately from optional companion work. A successful full-repo stream writes `.skyevault-out/autosync/latest-primary-success.json` and `.skyevault-out/autosync/latest-full-repo-success.json` even if a later bin/export step fails. The watcher uses those receipts to skip duplicate 16GB-17GB uploads for an already-covered digest, while still producing a new encrypted full snapshot when the repo/vault digest actually changes. The duplicate `20260529T211300Z` stream was stopped after the prior `20260529T191515Z` full custody artifact was proven complete for the same digest.

Autosync now dedupes by lane, not only by whole command. If a digest already has the full encrypted snapshot but is missing the Git custody pack, the next `git+full` pass runs only the missing Git lane, merges the prior full receipt into the new primary success pointer, and does not repeat the same 16GB-17GB full upload.

After a full encrypted baseline exists, `git+full` treats that full artifact as the all-bytes baseline and lets the Git/delta lanes advance normal code/content changes. A new full checkpoint is required when local-only critical material changes after the baseline, when no full baseline exists, or when the owner runs with `--force`/explicit full checkpoint intent.

May 30 source-of-truth closure: the corrected dirty-state full baseline landed as `MetrAIyux-0S-full-repo-20260529T213111Z.tar.zst.enc`, `17,323,174,736` bytes, SHA-256 `9ad319fd784a06ce458a6e04b73f67dd0c4f684ef31a36bef335a30e9da0b0e6`, artifact receipt `cdv_1cf38e5689280e988baf684e`, control-pack receipt `cdv_509b88a877b464c28b63d596`. The additive Git restore pack landed as `MetrAIyux-0S-git-vault-20260529T232230Z.zip`, `5,390,708,355` bytes, SHA-256 `ddc3dbe1b585c3c79c4f0a2bf9b8b17bf193dba3825211c489d01baa398ebd21`, receipt `cdv_2f05efd07da5cb70d60375f9`. Final daemon patch packs were encrypted through SkyeSecure receipts `cdv_f9dec7fd7d147220a5bcac15` and `cdv_2f9793158134de9b6b2f2d38`. The restarted daemon's first scan wrote `.skyevault-out/autosync/autosync-20260530T002429Z.json` with `coveredModes:["git","full"]` and `runModes:[]`.

May 30 owner download handoff correction, superseded by the living-current launcher: the owner-facing default is the HTTP launcher, not a local workspace file link. Run `npm run vault:source:download -- --env-file=.env` to mint the current owner-private signed ticket and serve `http://127.0.0.1:17687/CURRENT_REPO_BACKUP.html`. `http://127.0.0.1:17687/FULL_17GB_REPO_DOWNLOAD.html` remains a legacy redirect only. `vault:source:status` reports the launcher under `ownerDownloadLauncher`; signed R2 URLs remain private inside local `.skyevault-out` receipts.

May 31 owner download and delta correction, now historical: the launcher first learned to refresh expired signed full-repo links from the legacy `FULL_17GB_REPO_DOWNLOAD.html` path. That behavior is superseded by `CURRENT_REPO_BACKUP.html` and the living-current export/unlock flow above. The delta journal media-ceiling fix from that pass remains useful for older receipts and customer-agent proof, but it is not the owner-facing restore model for this repo.

May 30 additive-baseline correction: after the 17GB encrypted full-repo artifact exists, the daemon treats that artifact as the baseline and advances custody through encrypted additive delta journals. A normal `git+full` daemon tick must not launch a new 17GB full stream or 5GB Git pack just because the repo digest moved; it should cover the baseline modes and run only the delta journal unless the owner explicitly asks for `--force`, `--full-checkpoint`, or disables additive baseline mode. The baseline delta head was seeded from the completed full export timestamp and the first additive catch-up uploaded `skyevault-delta-20260530T071247Z.skyesecrets`, `19,904,673` bytes, receipt `cdv_ebe84f35641c71e201ffff51`, covering 166 changed files and 757 tombstones after baseline.

May 30 owner Git origin closure: `tools/skyevault-owner-git-origin.mjs` now manages the local owner-private smart-HTTP Git origin. The owner origin was seeded into `.skyevault-out/git-remote/storage`, pushed through the shared-gate remote, and clone-proved from `http://127.0.0.1:8787/metraiyux-0s-owner/MetrAIyux-0S.git`. Proof receipt `.skyevault-out/git-remote/owner-git-origin-proof.json` shows cloned `HEAD` equals local `HEAD` (`6336a975e8702e50e06ed26da1cb026ba06290d6`) with `git fsck --connectivity-only` green. `vault:source:status` now reports this lane as `ownerGitOrigin`.

The same hardening pass raised the Git command output buffer for autosync and delta-journal scans. This repo can produce far more than Node's default command buffer in `git status`, and overflowing that buffer made the daemon report a false-clean workspace. The corrected scan now sees the large dirty/untracked surface and includes it in the repo/vault digest before deciding whether to delta-pack or full-stream.

The digest now includes metadata fingerprints for changed, deleted, and untracked workspace files. That means edits inside files that were already dirty still move the repo/vault digest and trigger the custody lane; the daemon no longer relies only on the path list changing.

## Push Modes

`SKYEVAULT_AUTOSYNC_MODE=git+full` is the owner-continuity default.

- `delta`: implicit fast lane; packs changed/untracked/local-critical files plus tombstones into an encrypted SkyeSecure delta journal before the selected push modes.
- `git`: uploads the Git vault restore pack, including the Git bundle and sanitized dirty/untracked overlay.
- `safe`: uploads the sanitized repo archive.
- `full`: uploads the encrypted literal full-repo SkyDrive artifact by default.
- `git+full`: does Git parity and encrypted full-repo continuity in one changed scan.
- `auto`: always does Git parity and adds full encrypted upload when local-only secret/state files are detected.

Useful knobs:

```bash
SKYEVAULT_AUTOSYNC_INTERVAL_SECONDS=600
SKYEVAULT_AUTOSYNC_MODE=git+full
SKYEVAULT_AUTOSYNC_FULL_ARCHIVE_FORMAT=tar.zst
SKYEVAULT_AUTOSYNC_FULL_DIRECT_R2=1
SKYEVAULT_AUTOSYNC_GIT_ORIGIN_SYNC=1
SKYEVAULT_AUTOSYNC_FULL_ZIP_LEVEL=0
SKYEVAULT_AUTOSYNC_FULL_ZIP_UPLOAD_CONCURRENCY=8
```

`SKYEVAULT_AUTOSYNC_FULL_DIRECT_R2=1` keeps the owner disaster-recovery lane on Cloudflare R2 even if the SkyeVault HTTP Worker is rate-limiting or waiting on a redeploy. The artifact is still encrypted before upload, and the receipt/ledger objects are written into the same SkyeVault R2 config prefix.

Use source-custody only when the owner explicitly asks for the filtered package:

```bash
SKYEVAULT_AUTOSYNC_FULL_SOURCE_CUSTODY=1 npm run vault:autosync:dry-run -- --env-file=env.txt --mode=full --source-custody
```

Literal mode takes priority when any of these are set: `--literal-full`, `--all-bytes`, `--no-source-custody`, `SKYEVAULT_FULL_REPO_LITERAL=1`, or `SKYEVAULT_FULL_REPO_ALL_BYTES=1`.

## Secret Boundary

Autosync never prints secret values. Its parity digest includes Git state, dirty file status, and local-only file metadata such as path, size, mtime, and scanner rule. Secret-looking file contents are protected by the encrypted full-repo lane or by `.skyesecrets` packs, not by normal safe archives.

The default heartbeat uses a fast scanner: dirty files, untracked files, and risky local-only file names. Use the deep audit path when you want a whole-tree credential scan:

```bash
npm run vault:autosync:status -- --deep-scan
npm run vault:secrets:manifest
```

For a standalone checklist:

```bash
npm run vault:secrets:manifest
```

For encrypted local-only packages:

```bash
npm run skye-secure -- pack --root=. --paths-file=.skyevault-out/secret-boundary/<receipt>.paths.txt --passphrase-env=SKYE_SECURE_PASSPHRASE --pepper-env=SKYE_SECURE_PEPPER --recipient=owner
npm run skye-secure -- upload --pack=.skyevault-out/skye-secure/<pack>.skyesecrets
```

## Receipts

Autosync writes private local receipts under:

```text
.skyevault-out/autosync/
.skyevault-out/autosync-ledger.jsonl
```

Receipts store command outcomes, planned modes, status counts, local-only counts, and child receipt paths. They do not store raw bearer tokens, passphrases, peppers, or file bodies.

`npm run vault:0s:map` ingests the autosync ledger alongside upload receipts and Git remote events, so the 0S SkyeVault map can show scan, skip, dry-run, complete, and failure events as public-safe graph context.

May 30, 2026 end-to-end verification sealed the intended owner flow: the encrypted full-repo baseline stays as the all-bytes recovery artifact, changed scans write encrypted delta journal packs, and the same pass can sync the owner-private Git origin for clone/fetch/push restore.

## Full-Repo Encryption Rule

The encrypted full-repo artifact is the owner disaster-recovery lane for everything a normal Git transfer can miss. The direct restore kit contains artifact key material, so it is local-only by default. Upload it only with explicit approval:

```bash
npm run vault:repo:full -- --upload-direct-restore-kit
```

The default recovery lane is the encrypted SkyeSecure control pack created by `tools/skyevault-full-repo-push.mjs`.

Recovery surfaces:

- Vault drive: `https://skyevault-drop.graylondonskyes.workers.dev/#client-vault`
- Command center: `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/admin/skyevault-command-center.html`
- SkyeSecure unlocker: `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/skye-secure-secret-packs/app.html`
