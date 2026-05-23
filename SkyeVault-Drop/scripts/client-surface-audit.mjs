import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const index = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const upload = fs.readFileSync(path.join(root, 'public/upload.html'), 'utf8');
const vault = fs.readFileSync(path.join(root, 'public/vault.html'), 'utf8');
const repo = fs.readFileSync(path.join(root, 'public/repo.html'), 'utf8');
const processPage = fs.readFileSync(path.join(root, 'public/process.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'public/assets/app.js'), 'utf8');
const html = [index, upload, vault, repo, processPage].join('\n');
const config = fs.readFileSync(path.join(root, 'netlify/functions/_lib/config.js'), 'utf8');
const uploadSession = fs.readFileSync(path.join(root, 'netlify/functions/upload-session.js'), 'utf8');
const uploadComplete = fs.readFileSync(path.join(root, 'netlify/functions/upload-complete.js'), 'utf8');

const checks = [
  ['client pages do not link operator setup', !html.includes('/setup.html')],
  ['client pages do not link admin dashboard', !html.includes('/admin.html')],
  ['client surfaces are split into route pages', index.includes('/upload.html') && upload.includes('id="upload"') && vault.includes('id="my-vault"') && repo.includes('id="repo-snapshots"') && processPage.includes('id="what-to-send"') && processPage.includes('id="process"')],
  ['client page collects project metadata', upload.includes('clientReference') && upload.includes('assetType') && upload.includes('deadline')],
  ['client page requires permission acknowledgement', upload.includes('usageRightsAccepted') && upload.includes('retentionAcknowledged')],
  ['client app renders receipts', app.includes('renderReceipts') && app.includes('Receipt ID')],
  ['client app supports removing queued files', app.includes('remove-file') && html.includes('Clear selected files')],
  ['public config supports editable public copy', config.includes('publicHeadline') && config.includes('retentionNotice')],
  ['server enforces intake consent', uploadSession.includes('requireIntakeConsent')],
  ['completion verifies consent appProperties', uploadComplete.includes('usageRightsAccepted') && uploadComplete.includes('retentionAcknowledged')],
  ['client supports pausing resumable uploads', upload.includes('pauseUpload') && app.includes('AbortController') && app.includes('error.paused')],
  ['client exports receipt JSON', upload.includes('copyReceipts') && upload.includes('downloadReceipts') && app.includes('receiptExportPayload')],
  ['client enforces visible package limits', app.includes('validateSelectedFiles') && app.includes('maxFilesPerSubmission')],
  ['client groups multi-file submissions', app.includes('activeSubmissionId') && app.includes('submissionId')],
  ['repo restore page explains encrypted ZIP unlock flow', repo.includes('encrypted-zip-restore') && repo.includes('.zip.enc means encrypted') && repo.includes('direct restore kit')],
  ['vault download rows label restore artifacts', vault.includes('vault-restore-help') && app.includes('vaultRestoreHint') && app.includes('Download encrypted artifact') && app.includes('Download restore kit')]
];

let failed = false;
for (const [label, ok] of checks) {
  console.log(`${ok ? '✅' : '❌'} ${label}`);
  if (!ok) failed = true;
}

if (failed) {
  console.error('\nClient surface audit failed.');
  process.exit(1);
}

console.log('\n✅ Client surface audit passed: public site, intake metadata, receipt UX, pause/resume, receipt export, package limits, encrypted ZIP restore guidance, no public operator links, and consent enforcement are present.');
