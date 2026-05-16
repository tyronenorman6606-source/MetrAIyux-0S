# Proof Ledger — Client Drop Vault v1.9

## v2.1 Cloudflare R2 conversion

✅ Google Drive service-account storage was replaced with Cloudflare R2 S3-compatible storage for personal-account production use.
✅ Browser uploads now use R2 multipart presigned part URLs so large files do not pass through Netlify Functions.
✅ Config, receipts, ledgers, session manifests, audit events, and metadata backups are written as JSON objects in R2 prefixes.
✅ Completion finalizes the R2 multipart upload, verifies object metadata, then writes the signed receipt and manifest completion proof.

## v2.2 repository snapshot lane

✅ Public portal copy now identifies sanitized repository/source packages as supported vault intake.
✅ Admin dashboard explains the repo snapshot workflow and shows the operator commands.
✅ Setup Command Center includes repo snapshot proof in the operator checklist and command output.
✅ Source repos can use `npm run vault:dry-run` to stage, scan, and package a safe archive.
✅ Source repos can use `npm run vault:push` to upload the archive through the same R2 multipart and receipt flow.
✅ The helper excludes env files, Git metadata, dependencies, Netlify/Wrangler folders, backup data, database dumps, WAL archives, private keys, old archives, generated artifacts, and files flagged by the credential scanner.

## Proven locally in this package

✅ Required project files are present.
✅ Netlify API redirect and functions directory are configured.
✅ Google Drive resumable upload session creation code exists.
✅ Multiple destination routing and fallback code exists.
✅ Service-account JWT authentication is implemented without exposing private key material.
✅ Retry hardening exists for Google Drive and notification calls.
✅ Deployment Command Center exists at `/setup.html`.
✅ Setup diagnostics function exists and requires admin auth.
✅ Client page has a complete public-facing intake website surface.
✅ Client page does not link to `/admin.html` or `/setup.html`.
✅ Client intake captures project metadata beyond name/email/file.
✅ Client intake requires asset permission and storage/project-use acknowledgement.
✅ Server enforces consent before creating upload sessions.
✅ Server validates required client name, email, project name, URL shape, date shape, file size, blocked extensions, destination accept policy, and destination file-size policy.
✅ Completion verifies Drive file source, session, destination, expected parent folder, client request ID, consent appProperties, and size before receipt/ledger write.
✅ Completion now creates an immutable signed receipt JSON file per upload before updating the summary ledger.
✅ Summary ledger writes are idempotent by receipt ID, reducing duplicate rows on completion retries.
✅ Admin ledger reads receipt-backed entries and summary entries.
✅ Browser recovery panel prevents duplicate large-file re-upload when Google Drive accepted the file but the receipt/ledger call failed.
✅ Pending receipt finalization can be retried from the public upload page without resending the file bytes.
✅ Admin dashboard can edit public copy, routing, destinations, limits, blocked extensions, required fields, and ledger view.
✅ `npm run closure:audit` verifies the v1.5 receipt/recovery closure gates above.
✅ v1.6 creates a Drive-backed upload session manifest before returning the Google upload URL to the browser.
✅ v1.6 completion is blocked if the session manifest is missing, preventing untracked Drive files from being finalized as valid portal receipts.
✅ v1.6 stores browser-generated SHA-256 file fingerprints in the session manifest, Drive appProperties, completion entry, receipt, and admin view.
✅ v1.6 exposes pending/completed session manifests in the admin dashboard so abandoned uploads are visible.
✅ v1.6 adds Netlify static security headers, noindex/noarchive headers for internal pages, robots disallow rules for internal/API routes, and a branded 404 page.
✅ `npm run closure:audit` verifies the v1.6 session manifest, fingerprint, admin session, and static header gates.
✅ v1.7 removes `/admin.html` and `/setup.html` from public static output and serves them through protected Netlify Function routes.
✅ v1.7 adds `/operator.html` with ADMIN_TOKEN exchange into an HttpOnly operator session cookie.
✅ v1.7 admin APIs accept either an explicit admin token or a valid protected operator session.
✅ v1.7 adds optional upload-complete notification channels via webhook and Resend email.
✅ v1.7 adds an admin notification test endpoint/button.
✅ v1.7 adds `OPERATOR_SESSION_SECRET` and notification env vars to `.env.example` and the Setup Command Center generator.
✅ v1.7 makes `npm run closure:audit` a real package script alias.
✅ `npm run closure:audit` verifies the v1.7 protected operator pages and notification gates.
✅ v1.8 adds batch/submission IDs so multiple files from one client package can be grouped across manifests, receipts, notifications, and admin event trails.
✅ v1.8 adds a Pause current upload control that aborts the active chunk request while preserving the Google Drive resumable session for resume.
✅ v1.8 adds client receipt JSON copy/download tools after completion.
✅ v1.8 adds `/api/upload-status` for portal-key-protected session/receipt status lookup.
✅ v1.8 adds Drive-backed audit events for session creation, upload completion, admin config saves, Drive tests, and notification tests.
✅ v1.8 adds configurable package limits: max files per submission and max total submission GB.
✅ `npm run closure:audit` verifies the v1.8 pause/resume, status lookup, audit events, receipt export, and submission grouping gates.

✅ v1.9 adds upload-session and status lookup rate limits.
✅ v1.9 adds portal-code failed-attempt lockout.
✅ v1.9 adds a public honeypot spam trap and optional Cloudflare Turnstile verification.
✅ v1.9 adds protected admin Health Preflight for config-folder readiness, destination folder read/write checks, notification config, and abuse-control visibility.
✅ v1.9 adds protected Maintenance Sweep to mark stale abandoned sessions and write Drive-backed maintenance reports.
✅ v1.9 adds optional client receipt emails through Resend.
✅ v1.9 adds `npm run e2e:mock-browser`, a dependency-free local proof harness covering public config, upload-session creation, chunk upload, pause/query, resume, completion, receipt, and status lookup.

## Requires live credentials/deployment to prove

☐ Google service account can authenticate in Netlify.
☐ Service account has access to the config folder.
☐ Service account has write access to every destination folder.
☐ `/operator.html` accepts ADMIN_TOKEN and unlocks protected `/setup.html` and `/admin.html` on the deployed domain.
☐ `/api/setup-diagnostics` passes live checks on the deployed domain.
☐ `/api/admin-drive-test` creates and trashes healthcheck files in destination folders.
☐ Small proof file uploads through `/` and appears in Drive.
☐ Upload session creation writes a pending session manifest in the config folder before the upload URL is returned.
☐ Completion writes a verified immutable signed receipt file.
☐ Completion updates the summary ledger after receipt creation.
☐ Completion marks the upload session manifest complete with Drive file ID and receipt ID.
☐ Browser receipt-recovery flow can finalize a previously uploaded Drive file without re-uploading the file bytes.
☐ Pause/resume browser proof succeeds using the same saved Google resumable session.
☐ `/api/upload-status` returns the expected status for a known session ID and receipt ID.
☐ Audit event files are written into the config folder for session creation, upload completion, and admin tests.
☐ Large-video proof upload completes from the target client browser/network.
☐ Custom domain origin is included in `ALLOWED_ORIGINS` and passes CORS.
☐ Upload-complete notifications arrive through configured webhook/email channels.
☐ Client receipt emails arrive when `CLIENT_RECEIPT_EMAILS=true`.
☐ Health Preflight passes destination read/write checks on the deployed domain.
☐ Maintenance Sweep writes a maintenance report in the config folder.
☐ Turnstile verification works on the final deployed domain if enabled.

## Not claimed

☐ Virus scanning.
☐ Malware detonation/sandboxing.
☐ Per-client accounts.
☐ Encryption before Google Drive.
☐ Legal-grade permanent immutable retention.
☐ Automatic long-term archive/offload to R2/B2/S3.
☐ Guaranteed Drive quota availability.
☐ SaaS billing, tenants, or user management.

## v2.0 closure gates

✅ Export center added: admin can download ledger, sessions, audit events, and all metadata as CSV/JSON through protected `/api/admin-export`.

✅ Metadata backup added: protected `/api/admin-backup` writes a Drive-backed JSON backup of config, ledger receipts, sessions, and audit events to `BACKUP_FOLDER_ID` or the config folder.

✅ Scanner workflow added: `SCAN_MODE=none|manual_review|external_webhook` records scan state on receipts/manifests. External scanner handoff supports HMAC-signed metadata webhook and optional flagged-upload blocking.

✅ Notifications hardened: outbound webhook notifications are HMAC-signed when `NOTIFY_WEBHOOK_SECRET` is configured, retryable, logged through audit events, and replayable from the admin dashboard by receipt ID.

✅ Client receipt emails upgraded: optional Resend client receipts now include HTML + text templates with receipt, project, file, destination, and scan-handling details.

✅ Scheduled maintenance wrapper added: `scheduled-maintenance.js` invokes the maintenance sweep on a Netlify schedule without exposing the normal admin endpoint.

✅ Setup folder helper added: protected `/api/setup-folder-helper` tells the operator the exact service-account email and validates provided Drive folder IDs for read/write readiness.

✅ Optional real browser E2E harness added: `npm run e2e:browser` runs a Playwright/Chromium smoke against the deployed/local UI when Playwright is installed. It verifies public portal rendering, operator flow, protected admin behavior, and key API gates.

✅ Admin UI upgraded with export buttons, backup button, scanner visibility in health preflight, scan status in ledger rows, and notification replay actions.

☐ Live proof still requires real Netlify deployment, Google service-account env vars, Drive folder sharing, and at least one real browser 4K upload.

v2.0 lowercase audit markers: export center, scanner workflow.
