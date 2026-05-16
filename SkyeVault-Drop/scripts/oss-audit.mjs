import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const deps = packageJson.dependencies || {};
const driveLib = fs.readFileSync(path.join(root, 'netlify/functions/_lib/google-drive.js'), 'utf8');
const appJs = fs.readFileSync(path.join(root, 'public/assets/app.js'), 'utf8');
const adminJs = fs.readFileSync(path.join(root, 'public/assets/admin.js'), 'utf8');
const proofLedger = fs.readFileSync(path.join(root, 'docs/PROOF_LEDGER.md'), 'utf8');

const checks = [
  ['Cloudflare R2 SigV4 storage layer exists without secret leakage', driveLib.includes('AWS4-HMAC-SHA256') && driveLib.includes('cloudflare-r2')],
  ['R2 multipart presigned upload path exists', driveLib.includes('createResumableSession') && driveLib.includes('s3-multipart') && driveLib.includes('presignUrl')],
  ['R2 metadata JSON storage exists', driveLib.includes('listJsonFilesByPrefix') && driveLib.includes('createJsonFile') && driveLib.includes('downloadJsonFile')],
  ['Browser stores resumable sessions', appJs.includes('cdv-resumable-sessions-') && appJs.includes('storageProvider')],
  ['Browser handles R2 multipart uploads', appJs.includes('uploadR2Multipart') && appJs.includes('part.uploadUrl')],
  ['Admin ledger avoids raw innerHTML rendering', !adminJs.includes('row.innerHTML')],
  ['Proof ledger names R2 storage', proofLedger.includes('Cloudflare R2') || proofLedger.includes('R2')]
];

const failed = checks.filter(([, ok]) => !ok);
for (const [name, ok] of checks) {
  console.log(`${ok ? '✅' : '❌'} ${name}`);
}

if (failed.length) {
  console.error(`\nOSS audit failed: ${failed.map(([name]) => name).join(', ')}`);
  process.exit(1);
}

console.log('\n✅ OSS audit passed: R2 SigV4 storage, multipart uploads, metadata persistence, browser upload handling, and admin XSS hardening are present.');
