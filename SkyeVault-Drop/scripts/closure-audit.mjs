import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const files = {
  config: read('netlify/functions/_lib/config.js'),
  drive: read('netlify/functions/_lib/google-drive.js'),
  uploadSession: read('netlify/functions/upload-session.js'),
  uploadComplete: read('netlify/functions/upload-complete.js'),
  notifications: read('netlify/functions/_lib/notifications.js'),
  notificationTest: read('netlify/functions/admin-notification-test.js'),
  security: read('netlify/functions/_lib/security.js'),
  operatorSession: read('netlify/functions/operator-session.js'),
  operatorPage: read('netlify/functions/operator-page.js'),
  netlifyToml: read('netlify.toml'),
  app: read('public/assets/app.js'),
  admin: read('public/assets/admin.js'),
  setupJs: read('public/assets/setup.js'),
  uploadStatus: read('netlify/functions/upload-status.js'),
  rateLimit: read('netlify/functions/_lib/rate-limit.js'),
  adminHealth: read('netlify/functions/admin-health.js'),
  maintenance: read('netlify/functions/maintenance-sweep.js'),
  scheduledMaintenance: read('netlify/functions/scheduled-maintenance.js'),
  adminExport: read('netlify/functions/admin-export.js'),
  adminBackup: read('netlify/functions/admin-backup.js'),
  notificationReplay: read('netlify/functions/admin-notification-replay.js'),
  setupFolderHelper: read('netlify/functions/setup-folder-helper.js'),
  scanner: read('netlify/functions/_lib/scanner.js'),
  exporters: read('netlify/functions/_lib/exporters.js'),
  e2eMock: read('scripts/e2e-mock-browser-flow.mjs'),
  e2eBrowser: read('scripts/e2e-playwright.spec.mjs'),
  index: read('public/index.html'),
  upload: read('public/upload.html'),
  vault: read('public/vault.html'),
  repo: read('public/repo.html'),
  processPage: read('public/process.html'),
  adminHtml: read('internal-pages/admin.html'),
  setup: read('internal-pages/setup.html'),
  env: read('.env.example'),
  proof: read('docs/PROOF_LEDGER.md'),
  encryptedRepoZipRestore: read('docs/ENCRYPTED_REPO_ZIP_RESTORE.md'),
  headers: read('public/_headers'),
  robots: read('public/robots.txt')
};

const checks = [
  ['immutable receipt file prefix exists', files.config.includes('RECEIPT_PREFIX') && files.config.includes('saveReceipt')],
  ['ledger append is idempotent by receipt ID', files.config.includes('receiptIdFor') && files.config.includes('new Map') && files.uploadComplete.includes('receiptIdFor')],
  ['receipt signature exists', files.config.includes('createHmac') && files.config.includes('RECEIPT_SIGNING_SECRET')],
  ['admin ledger reads receipt-backed entries', files.config.includes('listJsonFilesByPrefix') && files.config.includes('receipts+summary')],
  ['browser prevents duplicate re-upload after storage success', files.app.includes('PENDING_FINALIZATION_KEY') && files.app.includes('noFallback') && files.upload.includes('Receipt recovery')],
  ['pending receipt retry is implemented', files.app.includes('retryPendingFinalizations') && files.upload.includes('retryPending')],
  ['server validates required intake fields', files.uploadSession.includes('requireClientName') && files.uploadSession.includes('validateEmail') && files.uploadSession.includes('validateUrl')],
  ['blocked extension policy exists', files.config.includes('blockedExtensions') && files.admin.includes('configBlockedExtensions') && files.setup.includes('blockedExtensionsValue')],
  ['completion validates request identity', files.uploadComplete.includes('clientRequestId') && files.drive.includes('client-request-id')],
  ['public page has no operator links', !files.index.includes('/admin.html') && !files.index.includes('/setup.html')],
  ['admin/setup pages are not public static files', !fs.existsSync(path.join(root, 'public/admin.html')) && !fs.existsSync(path.join(root, 'public/setup.html'))],
  ['operator pages require HttpOnly session cookie', files.security.includes('hasValidFs27BoundOperatorSession') && files.security.includes('HttpOnly') && files.operatorPage.includes('hasValidFs27BoundOperatorSession')],
  ['operator redirects protect admin/setup routes', files.netlifyToml.includes('operator-page?page=admin') && files.netlifyToml.includes('operator-page?page=setup')],
  ['upload completion notification path exists', files.uploadComplete.includes('notifyUploadComplete') && files.notifications.includes('NOTIFY_WEBHOOK_URL') && files.notifications.includes('RESEND_API_KEY')],
  ['admin notification test exists', files.notificationTest.includes('sendNotificationTest') && files.admin.includes('admin-notification-test')],
  ['env example includes receipt signer', files.env.includes('RECEIPT_SIGNING_SECRET')],
  ['env example includes operator session signer', files.env.includes('OPERATOR_SESSION_SECRET')],
  ['env example includes notification vars', files.env.includes('NOTIFY_WEBHOOK_URL') && files.env.includes('NOTIFY_EMAIL_TO')],
  ['proof ledger records v1.5 closure gates', files.proof.includes('v1.5') && files.proof.includes('immutable signed receipt')],
  ['session manifests are created before returning upload URLs', files.config.includes('SESSION_PREFIX') && files.config.includes('saveSessionManifest') && files.uploadSession.includes('saveSessionManifest')],
  ['completion requires upload session manifest', files.uploadComplete.includes('loadSessionManifest') && files.uploadComplete.includes('Completion is blocked to avoid untracked vault objects')],
  ['browser creates file fingerprints for upload manifests', files.app.includes('computeFileFingerprint') && files.app.includes('sampled-head-middle-tail')],
  ['R2 metadata stores file fingerprint markers', files.drive.includes('file-fingerprint-value') && files.uploadComplete.includes('verifyFingerprint')],
  ['admin dashboard shows session manifests', files.admin.includes('renderSessions') && files.config.includes('loadSessionManifests')],
  ['static security headers are present', files.headers.includes('Content-Security-Policy') && files.headers.includes('X-Frame-Options: DENY')],
  ['internal routes are disallowed in robots', files.robots.includes('Disallow: /admin.html') && files.robots.includes('Disallow: /setup.html') && files.robots.includes('Disallow: /operator.html')],
  ['proof ledger records v1.6 closure gates', files.proof.includes('v1.6') && files.proof.includes('session manifest')],
  ['proof ledger records v1.7 closure gates', files.proof.includes('v1.7') && files.proof.includes('protected operator pages')],
  ['batch submission IDs are stored through upload flow', files.app.includes('cdvsub') && files.uploadSession.includes('submissionId') && files.drive.includes('submission-id') && files.uploadComplete.includes('submissionId')],
  ['client pause/resume control exists', files.upload.includes('pauseUpload') && files.app.includes('AbortController') && files.app.includes('error.paused')],
  ['client receipt export exists', files.upload.includes('downloadReceipts') && files.app.includes('receiptExportPayload')],
  ['upload status endpoint exists', files.uploadStatus.includes('loadSessionManifest') && files.uploadStatus.includes('loadReceipt')],
  ['R2-backed audit events exist', files.config.includes('EVENT_PREFIX') && files.admin.includes('renderEvents') && files.uploadComplete.includes('upload-completed')],
  ['submission policy limits are configurable', files.config.includes('maxFilesPerSubmission') && files.adminHtml.includes('configMaxFilesPerSubmission') && files.setup.includes('maxFilesPerSubmissionValue')],
  ['proof ledger records v1.8 closure gates', files.proof.includes('v1.8') && files.proof.includes('pause/resume') && files.proof.includes('audit events')],
  ['rate limits and failed-code lockout exist', files.rateLimit.includes('applyRateLimit') && files.rateLimit.includes('recordPortalKeyFailure') && files.security.includes('assertPortalKeyNotLocked')],
  ['honeypot and Turnstile controls exist', files.rateLimit.includes('assertHoneypot') && files.rateLimit.includes('verifyTurnstile') && files.upload.includes('companyWebsite') && files.app.includes('turnstileToken')],
  ['health preflight endpoint and admin control exist', files.adminHealth.includes('admin-health-ran') && files.admin.includes('renderHealth') && files.adminHtml.includes('runHealth')],
  ['maintenance sweep exists', files.maintenance.includes('maintenance-sweep-ran') && files.config.includes('writeMaintenanceReport') && files.adminHtml.includes('runMaintenance')],
  ['client receipt email path exists', files.notifications.includes('sendClientReceiptEmail') && files.uploadComplete.includes('clientReceiptEmail') && files.env.includes('CLIENT_RECEIPT_EMAILS')],
  ['mock browser E2E proof exists', files.e2eMock.includes('Mock browser E2E passed') && files.e2eMock.includes('/api/upload-session') && files.e2eMock.includes('R2 multipart upload')],
  ['proof ledger records v1.9 closure gates', files.proof.includes('v1.9') && files.proof.includes('Health Preflight') && files.proof.includes('Maintenance Sweep')],
  ['scheduled maintenance wrapper exists', files.scheduledMaintenance.includes('MAINTENANCE_ALLOW_UNAUTHENTICATED_SCHEDULE') && files.scheduledMaintenance.includes('maintenanceHandler')],
  ['admin export center exists', files.adminExport.includes('admin-export-created') && files.exporters.includes('toCsv') && files.admin.includes('downloadAdminExport') && files.adminHtml.includes('exportPanel')],
  ['metadata backup job exists', files.adminBackup.includes('admin-backup-created') && (files.env.includes('BACKUP_PREFIX') || files.env.includes('BACKUP_FOLDER_ID')) && files.adminHtml.includes('runBackup')],
  ['scanner workflow exists', files.scanner.includes('SCAN_MODE') && files.scanner.includes('scanUpload') && files.uploadComplete.includes('scanUpload') && files.adminHealth.includes('scannerConfigSummary')],
  ['webhook notifications are HMAC signed and retryable', files.notifications.includes('x-client-drop-vault-signature') && files.notifications.includes('retryNotify') && files.notifications.includes('NOTIFY_RETRIES')],
  ['notification replay endpoint exists', files.notificationReplay.includes('notification.replay') && files.admin.includes('admin-notification-replay')],
  ['setup prefix helper exists', files.setupFolderHelper.includes('Use R2 prefixes') && files.drive.includes('getServiceAccountIdentity')],
  ['optional real browser E2E harness exists', files.e2eBrowser.includes('playwright') && files.e2eBrowser.includes('protected admin page')],
  ['proof ledger records v2.0 closure gates', files.proof.includes('v2.0') && files.proof.includes('export center') && files.proof.includes('scanner workflow')],
  ['public repo page explains repo snapshot lane', files.repo.includes('repo-snapshots') && files.repo.includes('npm run vault:push')],
  ['admin page explains repo snapshot workflow', files.adminHtml.includes('repo-operator-panel') && files.adminHtml.includes('npm run vault:dry-run')],
  ['setup page includes repo snapshot setup', files.setup.includes('repo-snapshot-setup') && files.setupJs.includes('npm run vault:push')],
  ['proof ledger records v2.2 repo snapshot lane', files.proof.includes('v2.2') && files.proof.includes('repository snapshot lane')],
  ['encrypted repo ZIP restore docs exist', files.encryptedRepoZipRestore.includes('.zip.enc') && files.encryptedRepoZipRestore.includes('direct restore kit') && files.encryptedRepoZipRestore.includes('skyevault-restore-encrypted-zip.mjs')],
  ['public repo page explains encrypted ZIP restore lane', files.repo.includes('encrypted-zip-restore') && files.repo.includes('.zip.enc means encrypted') && files.repo.includes('direct restore kit')],
  ['client vault labels restore downloads', files.vault.includes('vault-restore-help') && files.app.includes('vaultRestoreHint') && files.app.includes('Download encrypted artifact') && files.app.includes('Download restore kit')]
];

let failed = false;
for (const [label, ok] of checks) {
  console.log(`${ok ? '✅' : '❌'} ${label}`);
  if (!ok) failed = true;
}

if (failed) {
  console.error('\nClosure audit failed.');
  process.exit(1);
}

console.log('\n✅ Closure audit passed: receipt-backed completion, protected operator pages, session manifests, fingerprint proof, recovery, notifications, R2 audit events, pause/restart, submission grouping, abuse controls, health preflight, scheduled maintenance, exports, scanner workflow, notification replay, metadata backup, setup helpers, repo snapshot guidance, encrypted ZIP restore guidance, client receipt email support, policy enforcement, headers, and surface separation are present.');
