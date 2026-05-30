# SkyeVault-Drop Changelog

## 2026-05-29

- Corrected the repo rescue daemon contract: autosync `full` mode now defaults to encrypted literal all-bytes repo custody, not the smaller filtered source-custody package. Source-custody remains available only as an explicit opt-in for smaller packages.
- Updated the public Agent Install page to tell new operators and coding AIs to run the literal full lane, keep signed links private, and use the owner-gated SkyeVault Drive, SkyeVault Command Center, and SkyeSecure unlocker for recovery.
- Added the owner signed-link finalizer helper `tools/skyevault-mint-receipt-downloads.mjs`. It logs in through the shared FS27/SkyGate/Free99 lane, mints artifact/control-pack download links from a handoff receipt, and writes them to private local receipts without printing bearer tokens.
- Completed the literal owner export after replacing the slower first stream with the concurrent encrypted stream uploader. Final artifact `MetrAIyux-0S-full-repo-20260529T130848Z.tar.zst.enc` uploaded through direct Cloudflare R2 multipart as `15,660,995,840` bytes (`14.59` GiB), artifact receipt `cdv_f4973647019072d97eb62f11`, SHA-256 `a02e131bef14a87d965a6e8cfb201dfab0130a37e7f0613f4373ce08658c85ca`, and SkyeSecure control-pack receipt `cdv_654dcc3550c042e62d041617`. The fast delta journal completed first as receipt `cdv_336a7a9682ddb7e1bb79e22a`, and owner-only signed links were written to `.skyevault-out/autosync/latest-full-repo-download-links.json`.
- Deployed SkyeVault-Drop to Cloudflare Workers as version `b1c2881b-b3db-4a2f-a640-71520ab0be11` after `npm --prefix SkyeVault-Drop run cloudflare:check` passed.

## 2026-05-24

- Added the encrypted SkyeVault delta journal fast lane. Autosync now packs changed/untracked/local-critical files and deletion tombstones into a `.skyesecrets` delta journal before the heavier full snapshot lane, with `npm run vault:delta:dry-run`, `npm run vault:delta:upload`, and `npm run vault:delta:status` as standalone operator commands.
- Updated autosync proof and Resend notifications to expose public-safe delta journal counts, digest, pack size/hash, and receipt IDs while keeping file bodies, passphrases, peppers, signed URLs, and private handoff material out of public surfaces.
- Shipped the SkyeVault autosync parity closeout for the owner repo continuity lane: the local daemon remains the ten-minute scanner, normal repo custody still runs first, and companion SkyeVault Bin exports now run afterward for agent/site lanes without double-writing shared files.
- Added the DevodeRator Field Scribe agent lane. The agent can collect the day's changed paths, recent receipts, MCP proof, deploy evidence, and vault state, then draft a founder/dev blog from that proof bundle with `npm run devooderator:agent:brief` and `npm run devooderator:agent:draft`.
- Added SkyeVault Bin export commands for scoped custody: `npm run vault:bins:export:dry-run`, `npm run vault:bins:export`, and `npm run vault:agents:export`. Uploading companion bin packs remains explicit through `--upload`, `--upload-bins`, `SKYEVAULT_BIN_UPLOAD=1`, or `SKYEVAULT_AUTOSYNC_BIN_UPLOAD=1`.
- Updated the public AI/dev install walkthrough at `https://skyevault-drop.graylondonskyes.workers.dev/agent-install.html` so a new developer or coding AI can start the local agent, understand the no-perfect-tech recovery boundary, run the proof commands, and keep agent exports separate from the main encrypted repo custody lane.
- Deployed SkyeVault-Drop to Cloudflare Workers as version `71bb1cf4-3802-4b54-bc7c-abc3425cff34`.
- Deployed DevodeRator to Cloudflare Pages at `https://devooderator.pages.dev/`; the latest direct-upload ID is recorded in `test-artifacts/cloudflare-pages/devooderator-direct-upload-receipt.json`, the cards route now uses the floating Gray cutout logo, and the bins route documents the agent/bin export workflow.
- Deployed the 0S marketing Pages surface at `https://metraiyux-0s-marketing.pages.dev/` with closeout direct upload `8e008ed4-d8cf-488c-955a-ce02418597c1`, and deployed the Legal Skyes Pages surface at `https://skyes-over-london-legal.pages.dev/` with closeout direct upload `95e0cd7b-d5e4-4482-bf17-2765dbf8b1e5`.
- Redeployed the main 0S Worker at `https://metraiyux-0s-full-system.graylondonskyes.workers.dev` after regenerating the public proof/changelog module; the exact final Worker version is recorded by Wrangler in the closeout output.
- Verified with `npm --prefix SkyeVault-Drop run check`, `npm run devooderator:agent:brief`, `npm run devooderator:agent:draft`, `npm run vault:bins:export:dry-run`, `npm run vault:bins:export`, `npm run vault:autosync:dry-run -- --force --mode=full --skip-map --upload-bins`, and live HTTP smokes for the DevodeRator cards/bins routes plus the SkyeVault-Drop agent install page.
- No vault wipe was performed. The existing vault remains intact as requested.
- Headed browser proof was intentionally stopped and waived by the owner for this closeout; owner live verification is the production signoff path for this entry.

## 2026-05-23

- Added a customer-safe encrypted full-repo restore flow: full workspace artifacts remain protected as `.zip.enc`, and each run can produce a direct restore kit ZIP that unlocks the artifact into the real repo ZIP.
- Added `tools/skyevault-restore-encrypted-zip.mjs`, a standalone helper that extracts the restore kit, decrypts the encrypted repo artifact, verifies the resulting ZIP, and extracts the workspace.
- Updated `tools/skyevault-full-repo-push.mjs` so ZIP full-repo pushes generate a direct restore kit containing `README.txt`, `RESTORE.md`, the artifact key material, and the restore helper. The script also attempts to upload the restore kit unless `--skip-direct-restore-kit-upload` is passed.
- Updated the customer-facing Repo Vault and My Vault pages to explain that `.zip.enc` is encrypted and that the matching direct restore kit is required before unzipping.
- Added `docs/ENCRYPTED_REPO_ZIP_RESTORE.md` with customer/operator restore commands and wording rules.
