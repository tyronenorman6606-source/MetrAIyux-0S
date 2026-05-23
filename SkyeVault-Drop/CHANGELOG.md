# SkyeVault-Drop Changelog

## 2026-05-23

- Added a customer-safe encrypted full-repo restore flow: full workspace artifacts remain protected as `.zip.enc`, and each run can produce a direct restore kit ZIP that unlocks the artifact into the real repo ZIP.
- Added `tools/skyevault-restore-encrypted-zip.mjs`, a standalone helper that extracts the restore kit, decrypts the encrypted repo artifact, verifies the resulting ZIP, and extracts the workspace.
- Updated `tools/skyevault-full-repo-push.mjs` so ZIP full-repo pushes generate a direct restore kit containing `README.txt`, `RESTORE.md`, the artifact key material, and the restore helper. The script also attempts to upload the restore kit unless `--skip-direct-restore-kit-upload` is passed.
- Updated the customer-facing Repo Vault and My Vault pages to explain that `.zip.enc` is encrypted and that the matching direct restore kit is required before unzipping.
- Added `docs/ENCRYPTED_REPO_ZIP_RESTORE.md` with customer/operator restore commands and wording rules.
