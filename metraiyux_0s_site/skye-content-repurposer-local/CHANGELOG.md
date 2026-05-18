# Skye Content Forge Changelog

## 2026-05-17 - SkyeVault/R2 replaces Google Drive as the primary storage lane

Skye Content Forge now treats the owned SkyeVault Cloudflare R2 bucket as its primary cloud export path. Google Drive remains available only as an optional legacy target for Shared Drive or delegated OAuth setups.

- Added authenticated route `POST /api/export/skyevault-r2`.
- Added publisher target `skyevault-r2`.
- Loaded repo-root `.env` before app-local `.env` and normalized 0S aliases for OpenAI, Google, GitHub, Netlify, Cloudflare, and R2/S3-compatible storage.
- Reused the existing SkyeVault-Drop R2 adapter so generated Markdown writes into bucket `client-drop-vault` under prefix `content-forge-exports`.
- Verified a live R2 export returns `200`, writes a Markdown object, and returns a signed download URL.
- Verified scheduled publisher item `439246bc-6c0a-4cb1-b4eb-e71d02c0085d` publishes to target `skyevault-r2`.
- Verified unauthenticated API access still returns `401`. Free99 means no charge, not anonymous access.
- Updated the browser app copy from Drive-primary language to `SkyeVault/R2`, including `Vault/R2 configured`, `Upload to SkyeVault/R2`, and `SkyeVault / Cloudflare R2`.

Google Drive note: the root Google credentials load and authenticate, but the current service-account path is blocked by normal My Drive storage ownership rules. Use a writable Shared Drive folder or delegated OAuth if the legacy Google Drive route is needed.

## 2026-05-17 - Free99 gated 0S import

- Imported Skye Content Forge into MetrAIyux 0S as a Free99 feature.
- Added `public/gate-session.js` so dashboard boot requires a 0S, FS27, SkyGate, or local admin gate session.
- Required auth on `/api/*` routes before source scanning, generation, exports, scheduler ticks, backup, deployment hooks, or publishing controls can run.
- Updated pricing, SaaS, homepage, hub, proof receipt, and manifest surfaces to state Free99 means no charge.
- Verified OpenAI generation from the repo-root env and saved generated drafts through the local app runtime.
