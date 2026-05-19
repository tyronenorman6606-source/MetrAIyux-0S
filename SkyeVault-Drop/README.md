# SkyeVault-Drop

SkyeVault-Drop is the live Netlify-deployed intake platform for receiving client documents, website assets, images, zip packages, source files, large video files, workspace snapshots, and Git-level repo handoff material directly into the private Cloudflare R2 vault.

This is not a SaaS product. It is an operator-owned upload portal for project intake.

## Storage reality check

Current production storage is Cloudflare R2. Some compatibility modules and older docs still use Drive-shaped names such as `google-drive.js`, `driveFileId`, and `admin-drive-test`, but those names now wrap R2 S3-compatible behavior:

- upload sessions create R2 multipart uploads,
- the browser uploads directly to short-lived R2 presigned part URLs,
- destinations are R2 prefixes such as `client-uploads/primary`,
- receipts, manifests, audit events, config, and backups are JSON objects in R2.

Google Drive folder links are not upload credentials. A folder URL can identify a Drive folder ID, but a Worker still needs an authenticated Google principal with write access before it can upload through the Drive API. Do not treat an "anyone with the link" folder as a secret or as a bearer token. If Drive is added back, use it as a mirror/export lane with OAuth or service-account credentials, not as an anonymous public writable folder.

## What is stronger in v2.3

- v2.3 adds the Git-level SkyeVault remote lane beside the archive upload lane: smart HTTP push/fetch/clone against persistent bare repos, Gate-scoped workspace auth, role boundaries, branch policy, protected tag handling, quota APIs, verified snapshots, bundle exports, restore verification, CLI commands, Git credential helper, SSH forced-command wrapper, and per-workspace 0S neural maps.
- A developer downloading from the Git remote gets a normal full clone of the pushed repository refs, not a loose folder dump.
- SkyeVault can now represent each workspace as its own account graph: repos, ref changes, upload receipts, graph nodes, tracked bytes, and change timeline stay attached to that workspace instead of being merged into a single global customer blob.

## What is stronger in v2.2

- v2.2 adds a documented repository snapshot lane: source repos can include a `vault:dry-run` / `vault:push` helper that builds a sanitized zip, excludes secrets/generated junk, uploads through this vault, and stores a receipt JSON.
- Protected operator entry at `/operator.html`; `/admin.html` and `/setup.html` are now served through Netlify Functions instead of shipped as public static HTML.
- Full public client-facing website at `/`, not just a bare upload form.
- No public links to `/admin.html` or `/setup.html` on the client page.
- Rich intake fields: client name, email, phone, project, URL, reference/job number, asset type, deadline, notes, destination, and access code.
- Required client confirmations for asset permission and storage/project-use acknowledgement.
- Server-side required-field enforcement for client name, client email, project name, valid URL shape, valid date shape, file size, blocked extensions, destination file-size policy, and destination accept policy.
- Upload receipt panel with receipt IDs and receipt-signature prefix after completion.
- Immutable signed receipt JSON files: every completed upload creates `skye-upload-vault-receipt-<receipt-id>.json` in the config folder before the summary ledger update.
- Idempotent completion: receipt IDs are derived from session ID + stored object key, so retrying completion does not create duplicate receipt proof.
- Ledger hardening: admin ledger reads receipt-backed entries and summary ledger entries.
- Receipt recovery: if R2 accepts a giant file but `/api/upload-complete` fails, the browser stores a pending finalization and shows a recovery panel so you can retry the receipt without re-uploading the file bytes.
- Editable public copy through `/admin.html`: headline, subheadline, instructions, retention notice, brand name, support email, required fields, blocked extensions, destinations, and limits.
- Internal Deployment Command Center at `/setup.html` for env vars, tokens, R2 setup, notification config, diagnostics, and proof commands.
- R2-backed upload session manifests: `/api/upload-session` writes `skye-upload-vault-session-<session-id>.json` before returning the signed upload URLs.
- Manifest-gated completion: `/api/upload-complete` refuses to finalize uploads that do not have a matching session manifest.
- Browser-side SHA-256 file fingerprints: small files get full-file SHA-256; large files get a head/middle/tail sampled fingerprint that is stored in the manifest, R2 object metadata, receipt entry, and admin view.
- Admin session-manifest view shows pending and completed sessions, including abandoned sessions that never became receipts.
- Static hardening: `_headers` adds CSP, frame blocking, nosniff, permissions policy, and no-store/noindex rules for operator pages; `robots.txt` blocks admin/setup/operator/API routes; `404.html` is branded and noindexed.
- Optional upload-complete notifications through `NOTIFY_WEBHOOK_URL` and/or Resend email env vars.
- Admin notification test endpoint/button verifies alert delivery without a real client upload.
- `npm run closure:audit` is now a real package script alias.
- Batch/submission IDs now group multi-file client packages across manifests, receipts, notifications, and admin audit events.
- Pause/resume support: the public portal can pause the active upload request and later resume from the saved R2 multipart session.
- Receipt JSON copy/download tools give clients/operator a portable proof bundle after upload completion.
- `/api/upload-status` gives a portal-key-protected way to check a known session ID or receipt ID.
- R2-backed audit event files record session creation, upload completion, admin config saves, storage tests, and notification tests.
- Configurable package limits now include max files per submission and max total submission GB.

- v1.9 adds upload-session and status lookup rate limits, portal-code failed-attempt lockout, honeypot spam trap, and optional Cloudflare Turnstile verification.
- v1.9 adds an admin Health Preflight endpoint/button for config-folder access, destination read/write checks, notification config, abuse controls, and recent audit context.
- v1.9 adds a maintenance sweep endpoint/button that marks stale abandoned sessions and writes R2-backed maintenance reports.
- v1.9 adds optional client receipt emails through Resend after upload completion.
- v1.9 adds `npm run e2e:mock-browser`, a dependency-free local proof harness for public config, session creation, chunk upload, pause/query, resume, completion, receipt, and status lookup.

## Architecture

Large uploads do not pass through Netlify as file bodies. The server creates authenticated R2 multipart upload sessions. The browser then uploads file chunks directly to short-lived R2 presigned URLs.

Flow:

1. Client opens `/`.
2. Client adds project context and selects files.
3. Browser calls `/api/upload-session`.
4. Netlify/Worker validates origin, upload code, storage routing, file limits, blocked extensions, required fields, and consent flags.
5. Netlify/Worker creates an R2 multipart upload session using the configured R2 access key.
6. Netlify/Worker writes a pending upload-session manifest into the private R2 config prefix before returning the signed part URLs.
7. Browser uploads chunks directly to the R2 presigned part URLs.
8. Browser calls `/api/upload-complete`.
9. Netlify/Worker finalizes the R2 multipart upload and verifies object metadata, prefix, session, manifest, destination, request identity, consent flags, fingerprint metadata, and size.
10. Netlify creates an immutable signed receipt file.
11. Netlify marks the session manifest complete.
12. Netlify updates the summary ledger.
13. Netlify/Worker writes an R2-backed audit event for the completed upload.
14. If configured, Netlify sends an upload-complete notification to webhook/email channels.
15. If client receipt email is enabled, Netlify sends the client a receipt email.
16. Admin can run health preflight and maintenance sweeps from the protected dashboard.

## Pages

- `/` — public client intake website and upload portal.
- `/operator.html` — protected operator login page. Creates an HttpOnly operator session cookie from `ADMIN_TOKEN`.
- `/admin.html` — internal routing/config/ledger dashboard. Served through protected function route; accepts operator session or `ADMIN_TOKEN`.
- `/setup.html` — internal Deployment Command Center. Served through protected function route; accepts operator session or `ADMIN_TOKEN` for diagnostics.

Do not link `/admin.html` or `/setup.html` from client-facing websites.

## Repository snapshot and Git remote lanes

SkyeVault-Drop can receive a whole source repository as one sanitized zip package, and the wider SkyeVault stack can also run as a Git smart HTTP remote. Use the archive lane for handoff packages, deploy bundles, client delivery zips, or recovery snapshots. Use the Git remote lane when developers need normal Git behavior: clone, fetch, push, branch policy, snapshots, bundle export, and restore.

In a source repo that has the helper installed:

```bash
npm run vault:dry-run
npm run vault:push
```

The helper:

- stages a sanitized copy of the workspace,
- excludes `.env*`, `.git`, `node_modules`, `.netlify`, `.wrangler`, backups, database dumps, WAL archives, private keys, existing archive bundles, and generated test artifacts,
- scans staged text files for common secret patterns,
- creates `.skyevault-out/MetrAIyux-0S-repo-safe-*.zip`,
- uploads through `/api/upload-session` and `/api/upload-complete`,
- writes `.skyevault-out/skyevault-receipt-*.json`.

Required local values for the source repo:

```bash
SKYEVAULT_DROP_URL=https://skyevault-drop.netlify.app
SKYEVAULT_UPLOAD_ORIGIN=https://client-drop-vault-r2.netlify.app
SKYEVAULT_PORTAL_KEY=replace-with-client-upload-code
SKYEVAULT_CLIENT_NAME="Repository Operator"
SKYEVAULT_CLIENT_EMAIL=operator@example.com
SKYEVAULT_PROJECT_NAME="Repository safe vault snapshot"
```

`CLIENT_PORTAL_KEY` in the vault package `.env` also works for local operator machines. Keep portal keys out of committed files.

For active repo remotes, run the Git remote service from the repo root:

```bash
SKYEVAULT_GIT_REMOTE_TOKEN='from-secret-manager' npm run vault:git:remote
node tools/skyevault-cli.mjs login --remote-url=http://127.0.0.1:8787 --token="$SKYEVAULT_GIT_REMOTE_TOKEN" --workspace=acme
node tools/skyevault-cli.mjs clone app ./app
```

The Git remote stores persistent bare repositories, so a developer download is a full clone of the repo refs that were pushed into the vault. The archive lane remains the safer choice for one-off sanitized source packages.

## Required environment variables

```bash
ALLOWED_ORIGINS=https://your-site.netlify.app,https://uploads.yourdomain.com
ADMIN_TOKEN=replace-with-long-random-admin-token
OPERATOR_SESSION_SECRET=replace-with-separate-long-random-operator-session-secret
OPERATOR_SESSION_HOURS=12
CLIENT_PORTAL_KEY=replace-with-client-upload-code
RECEIPT_SIGNING_SECRET=replace-with-separate-long-random-receipt-signing-secret
R2_ACCOUNT_ID=replace-with-cloudflare-account-id
R2_ACCESS_KEY_ID=replace-with-r2-access-key-id
R2_SECRET_ACCESS_KEY=replace-with-r2-secret-access-key
R2_BUCKET=skyevault-drop
R2_ENDPOINT=https://replace-with-account-id.r2.cloudflarestorage.com
R2_CONFIG_PREFIX=vault-system
NOTIFY_WEBHOOK_URL=
NOTIFY_WEBHOOK_SECRET=
RESEND_API_KEY=
NOTIFY_EMAIL_TO=
NOTIFY_EMAIL_FROM="Client Drop Vault <uploads@yourdomain.com>"
CLIENT_RECEIPT_EMAILS=false
CLIENT_RECEIPT_EMAIL_FROM="Client Drop Vault <uploads@yourdomain.com>"
TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
UPLOAD_SESSION_RATE_LIMIT=30
UPLOAD_SESSION_RATE_WINDOW_MS=600000
STATUS_RATE_LIMIT=80
STATUS_RATE_WINDOW_MS=600000
PORTAL_KEY_MAX_FAILURES=8
PORTAL_KEY_LOCKOUT_MS=900000
STALE_SESSION_HOURS=72
R2_CONFIG_JSON='{"brandName":"SkyeVault-Drop","routingMode":"priority","chunkSizeMb":8,"maxFilesPerSubmission":25,"maxTotalSubmissionGb":5000,"requireUsageRights":true,"requireRetentionAck":true,"requireClientName":true,"requireClientEmail":true,"requireProjectName":true,"blockedExtensions":[".exe",".msi",".bat",".cmd",".scr",".ps1",".vbs",".js",".jar",".com",".sh"],"destinations":[{"id":"primary","name":"Primary Client Intake","folderId":"client-uploads/primary","enabled":true,"priority":1,"role":"primary","description":"Main intake prefix.","maxFileSizeGb":5000,"accept":"*"}]}'
R2_PRESIGNED_URL_TTL_SECONDS=21600
```

`R2_CONFIG_JSON` is bootstrap config only. After `/admin.html` saves config, the app reads `skye-upload-vault-config.json` from `R2_CONFIG_PREFIX` first.

## R2 setup

1. Create or select a private Cloudflare R2 bucket.
2. Create an R2 API token/access key scoped to that bucket.
3. Set `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ENDPOINT`, and `R2_CONFIG_PREFIX`.
4. Configure one or more destination prefixes: primary, overflow, client-specific, archive, etc.
5. Use `/setup.html` to generate the env block and bootstrap routing config.

## Optional Google Drive mirror

Drive can be added as a mirror/export lane, but the Worker cannot upload with a public folder link alone. Store Drive folder IDs or folder URLs only as destination metadata. Store actual Google auth separately:

- OAuth client ID, client secret, and refresh token for a human-owned Drive target, or
- service-account credentials plus a Shared Drive or folder where that service account has writer/contributor access.

For production intake, keep R2 as the source of truth and mirror/export to Drive after receipt creation.

## Netlify setup

This package uses Netlify Functions, so use a Git-based Netlify deploy. Static drag-and-drop deploy alone is not enough.

```bash
npm install
npm run smoke
npm run check
npm audit --omit=dev
```

Deploy through Netlify, add env vars, redeploy, then run:

```bash
npm run e2e:mock-browser
npm run live:drive-smoke
```

Then browser-proof:

1. Open `/operator.html`, enter `ADMIN_TOKEN`, and confirm it unlocks `/setup.html` and `/admin.html`.
2. Open `/setup.html` and run diagnostics.
3. Open `/admin.html`, load dashboard, and run Health preflight plus Drive access tests.
4. Run Maintenance once and confirm it writes a maintenance report when stale sessions exist, or returns a clean no-stale summary.
5. If notifications are configured, run Test notification and verify the alert arrives.
6. Open `/` and upload one small proof file.
7. Verify the receipt JSON file appears in the config folder.
8. Verify the summary ledger includes the proof upload.
9. Click Pause current upload during a test upload, then press Start secure upload again and confirm it resumes.
10. If client receipt emails are enabled, verify the client receipt arrives.
11. Upload one real large-video proof before sending the link to clients.

## Current honesty status

Locally proven:

- Required file structure.
- Syntax checks.
- No placeholder audit.
- OSS dependency audit script.
- Setup Command Center audit.
- Protected operator page/session audit.
- Client surface audit.
- Closure audit for signed receipts, protected operator pages, notifications, audit events, status lookup, pause/resume controls, batch submission IDs, session manifests, fingerprint proof, receipt recovery, idempotency, blocked-extension policy, required-field validation, abuse controls, health preflight, maintenance lifecycle, client receipt email support, static security headers, and surface separation.
- Resumable upload code path presence.
- Mock browser E2E harness for session create, chunk upload, pause/query, resume, completion, receipt, and status lookup.
- No public client links to internal setup/admin pages.

Not proven until you deploy with real credentials:

- R2 access key auth against the production bucket.
- Destination prefix read/write permissions.
- Real R2 multipart upload completion.
- Session manifest writes in your R2 config prefix.
- Signed receipt file writes in your R2 config prefix.
- Summary ledger update in your R2 config prefix.
- Session manifest completion after receipt creation.
- Real large-video upload stability on your browser/network.
- CORS behavior on your final Worker/custom domain.
- Upload-complete webhook/email delivery if configured.
- Client receipt email delivery if enabled.
- Browser pause/resume behavior with real R2 multipart sessions.
- R2-backed audit event writes in your config prefix.
- Health preflight write tests against your real R2 prefixes.
- Maintenance report writes against your real config prefix.

## Commands

```bash
npm run smoke
npm run check
npm run client:audit
npm run closure:audit
npm run setup:audit
npm run oss:audit
npm run e2e:mock-browser
npm run live:r2-smoke
```

## v2.0 operator closure additions

This package now includes the remaining controllable closure work beyond the upload engine:

- Protected export center: `/api/admin-export` downloads ledger, sessions, audit events, config, or all metadata as CSV/JSON from the admin dashboard.
- Metadata backup: `/api/admin-backup` writes an R2-backed snapshot to `BACKUP_FOLDER_ID` or the config prefix.
- Scanner workflow: set `SCAN_MODE=manual_review` or `SCAN_MODE=external_webhook` to mark uploads for review or send signed metadata to a scanner/review endpoint. This app does not pretend to inspect private R2 object bytes by itself.
- Hardened notifications: webhooks are HMAC-signed when `NOTIFY_WEBHOOK_SECRET` is set, retryable, audit-logged, and replayable from the ledger.
- Client receipt emails: optional Resend HTML/text receipts include receipt ID, project, file, destination, and scan-handling status.
- Scheduled maintenance: `scheduled-maintenance.js` invokes stale-session maintenance on `MAINTENANCE_CRON`.
- Setup folder helper: `/api/setup-folder-helper` validates configured storage prefix access.
- Optional real browser E2E: install Playwright and run `npm run e2e:browser` against `BASE_URL` after deployment.

### Scanner modes

`SCAN_MODE=none` records `not_scanned`. Use this only for trusted, controlled intake.

`SCAN_MODE=manual_review` marks uploads for operator review without blocking them.

`SCAN_MODE=external_webhook` sends metadata to `SCANNER_WEBHOOK_URL`. If `SCANNER_WEBHOOK_SECRET` is present, the request includes `x-client-drop-vault-scanner-signature: sha256=<hmac>`. The scanner may return `clean`, `flagged`, or `manual_review`. Set `SCAN_BLOCK_FLAGGED=true` to stop flagged uploads from receiving normal success receipts.

### Export and backup

From `/admin.html`, load the dashboard and use Export Center for CSV/JSON downloads. Use Backup metadata to write a timestamped JSON snapshot into Drive. This backs up metadata only, not the large client files.

### Real browser E2E

```bash
npm i -D playwright
npx playwright install chromium
BASE_URL=https://your-site.netlify.app ADMIN_TOKEN=... CLIENT_PORTAL_KEY=... npm run e2e:browser
```

This browser harness complements `npm run live:drive-smoke`; it does not replace a real 4K upload test.
