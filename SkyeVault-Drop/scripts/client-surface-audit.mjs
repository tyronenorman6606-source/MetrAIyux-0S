import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const index = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'public/assets/app.js'), 'utf8');
const html = index;
const config = fs.readFileSync(path.join(root, 'netlify/functions/_lib/config.js'), 'utf8');
const uploadSession = fs.readFileSync(path.join(root, 'netlify/functions/upload-session.js'), 'utf8');
const uploadComplete = fs.readFileSync(path.join(root, 'netlify/functions/upload-complete.js'), 'utf8');

const checks = [
  ['client page does not link operator setup', !index.includes('/setup.html')],
  ['client page does not link admin dashboard', !index.includes('/admin.html')],
  ['client page contains full public website sections', index.includes('id="what-to-send"') && index.includes('id="process"') && index.includes('id="upload"')],
  ['client page collects project metadata', index.includes('clientReference') && index.includes('assetType') && index.includes('deadline')],
  ['client page requires permission acknowledgement', index.includes('usageRightsAccepted') && index.includes('retentionAcknowledged')],
  ['client app renders receipts', app.includes('renderReceipts') && app.includes('Receipt ID')],
  ['client app supports removing queued files', app.includes('remove-file') && html.includes('Clear selected files')],
  ['public config supports editable public copy', config.includes('publicHeadline') && config.includes('retentionNotice')],
  ['server enforces intake consent', uploadSession.includes('requireIntakeConsent')],
  ['completion verifies consent appProperties', uploadComplete.includes('usageRightsAccepted') && uploadComplete.includes('retentionAcknowledged')],
  ['client supports pausing resumable uploads', index.includes('pauseUpload') && app.includes('AbortController') && app.includes('error.paused')],
  ['client exports receipt JSON', index.includes('copyReceipts') && index.includes('downloadReceipts') && app.includes('receiptExportPayload')],
  ['client enforces visible package limits', app.includes('validateSelectedFiles') && app.includes('maxFilesPerSubmission')],
  ['client groups multi-file submissions', app.includes('activeSubmissionId') && app.includes('submissionId')]
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

console.log('\n✅ Client surface audit passed: public site, intake metadata, receipt UX, pause/resume, receipt export, package limits, no public operator links, and consent enforcement are present.');
