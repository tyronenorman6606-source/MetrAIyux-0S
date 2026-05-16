import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const keepStage = args.has('--keep-stage');
const argValue = (name) => {
  const prefix = `${name}=`;
  return process.argv.slice(2).find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || '';
};
const existingArchive = argValue('--upload-archive');
const existingFileCount = Number(argValue('--file-count') || 0);
const existingSecretExcludeCount = Number(argValue('--secret-excludes') || 0);
const repoName = path.basename(root).replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'repository';

const SKIP_DIRS = new Set(['.git', 'node_modules', '.netlify', '.wrangler', '.wrangler-dry-run', '.claude', 'test-artifacts', 'test-results', 'backups', 'wal_archive', '.staffing-db', '.skyevault-out']);
const SKIP_EXTS = new Set(['.zip', '.tar', '.gz', '.tgz', '.7z', '.rar', '.dump', '.backup', '.bak', '.sqlite', '.sqlite3', '.db', '.pem', '.key', '.p12', '.pfx']);
const SECRET_PATTERNS = [
  ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH |)?PRIVATE KEY-----/],
  ['openai-key', /\bsk-[A-Za-z0-9_-]{20,}\b/],
  ['github-token', /\b(?:github_pat_|ghp_|gho_|ghs_)[A-Za-z0-9_]{20,}\b/],
  ['slack-token', /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/],
  ['aws-access-key', /\bAKIA[0-9A-Z]{16}\b/],
  ['google-api-key', /\bAIza[0-9A-Za-z_-]{25,}\b/],
  ['neon-password-token', /\bnpg_[A-Za-z0-9]{12,}\b/],
  ['db-url-with-password', /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^\s:@]+:[^\s@]+@/i],
  ['jwt', /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b/]
];

function parseEnv(file) {
  const values = {};
  if (!fs.existsSync(file)) return values;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[match[1]] = value;
  }
  return values;
}

function rel(file) {
  return path.relative(root, file).split(path.sep).join('/');
}

function shouldAlwaysExclude(file) {
  const relativeParts = rel(file).split('/');
  if (relativeParts.some((part) => SKIP_DIRS.has(part))) return true;
  const base = path.basename(file);
  if (/^\.env($|\.)/.test(base)) return true;
  if (/^id_rsa/.test(base)) return true;
  if (/credentials.*\.json$/i.test(base) || /service-account.*\.json$/i.test(base)) return true;
  return SKIP_EXTS.has(path.extname(file).toLowerCase());
}

function walk(dir, visitor) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (shouldAlwaysExclude(file)) continue;
    if (entry.isDirectory()) walk(file, visitor);
    else if (entry.isFile()) visitor(file);
  }
}

function secretHits(file) {
  const stat = fs.statSync(file);
  if (stat.size > 2 * 1024 * 1024) return [];
  let text = '';
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return [];
  }
  if (text.includes('\u0000')) return [];
  return SECRET_PATTERNS.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
}

function secretExcludes() {
  const excludes = [];
  let checked = 0;
  let lastProgress = Date.now();
  walk(root, (file) => {
    checked += 1;
    const now = Date.now();
    if (now - lastProgress > 10000) {
      console.log(`Scanned ${checked} candidate files...`);
      lastProgress = now;
    }
    const hits = secretHits(file);
    if (hits.length) excludes.push({ file: rel(file), hits });
  });
  return excludes;
}

function copyToStage(stage, excludes) {
  const excludeFile = path.join(os.tmpdir(), `skyevault-excludes-${Date.now()}.txt`);
  fs.writeFileSync(excludeFile, excludes.map((item) => item.file).join('\n'));
  fs.mkdirSync(stage, { recursive: true });
  execFileSync('rsync', [
    '-a',
    '--no-group',
    '--delete',
    '--exclude=.git/',
    '--exclude=node_modules/',
    '--exclude=.netlify/',
    '--exclude=.wrangler/',
    '--exclude=.wrangler-dry-run/',
    '--exclude=.claude/',
    '--exclude=test-artifacts/',
    '--exclude=test-results/',
    '--exclude=backups/',
    '--exclude=wal_archive/',
    '--exclude=.staffing-db/',
    '--exclude=.skyevault-out/',
    '--exclude=.env',
    '--exclude=.env.*',
    '--exclude=.env*',
    '--exclude=*.zip',
    '--exclude=*.tar',
    '--exclude=*.gz',
    '--exclude=*.tgz',
    '--exclude=*.7z',
    '--exclude=*.rar',
    '--exclude=*.dump',
    '--exclude=*.backup',
    '--exclude=*.bak',
    '--exclude=*.sqlite',
    '--exclude=*.sqlite3',
    '--exclude=*.db',
    '--exclude=*.pem',
    '--exclude=*.key',
    '--exclude=*.p12',
    '--exclude=*.pfx',
    '--exclude=id_rsa*',
    '--exclude=*credentials*.json',
    '--exclude=*service-account*.json',
    `--exclude-from=${excludeFile}`,
    './',
    `${stage}/`
  ], { cwd: root, stdio: 'inherit' });
}

function scanStage(stage) {
  const findings = [];
  const scan = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) scan(file);
      else if (entry.isFile()) {
        const hits = secretHits(file);
        if (hits.length) findings.push({ file: path.relative(stage, file).split(path.sep).join('/'), hits });
      }
    }
  };
  scan(stage);
  return findings;
}

function zipStage(stage, archive) {
  execFileSync('zip', ['-qr', archive, '.'], { cwd: stage, stdio: 'inherit' });
}

function hashFile(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function gitValue(args, fallback = 'unknown') {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim() || fallback;
  } catch {
    return fallback;
  }
}

function outputSummary(stage, archive, excludes) {
  let fileCount = 0;
  walk(stage, () => { fileCount += 1; });
  const bytes = fs.statSync(archive).size;
  return { fileCount, bytes, excludedSecretLikeFiles: excludes.length };
}

async function uploadArchive(archive, archiveHash, summary) {
  const rootEnv = parseEnv(path.join(root, '.env'));
  const vaultEnv = parseEnv(path.join(root, 'SkyeVault-Drop/.env'));
  const env = { ...vaultEnv, ...rootEnv, ...process.env };
  const baseUrl = String(env.SKYEVAULT_DROP_URL || env.URL || 'https://skyevault-drop.netlify.app').replace(/\/$/, '');
  const origin = String(env.SKYEVAULT_UPLOAD_ORIGIN || 'https://client-drop-vault-r2.netlify.app').replace(/\/$/, '');
  const portalKey = env.SKYEVAULT_PORTAL_KEY || env.CLIENT_PORTAL_KEY || '';
  if (!portalKey) throw new Error('Missing CLIENT_PORTAL_KEY or SKYEVAULT_PORTAL_KEY.');

  const fileBuffer = fs.readFileSync(archive);
  const fileName = path.basename(archive);
  const now = Date.now();
  const branch = gitValue(['branch', '--show-current']);
  const commit = gitValue(['rev-parse', '--short', 'HEAD']);
  const dirtyCount = gitValue(['status', '--short'], '').split(/\r?\n/).filter(Boolean).length;
  const body = {
    clientName: env.SKYEVAULT_CLIENT_NAME || 'Repository Operator',
    clientEmail: env.SKYEVAULT_CLIENT_EMAIL || 'operator@example.com',
    projectName: env.SKYEVAULT_PROJECT_NAME || `${repoName} repository safe vault snapshot`,
    clientReference: `repo:${branch}@${commit}`,
    assetType: 'Repository safe archive',
    notes: `Sanitized repo archive generated by tools/skyevault-repo-push.mjs. Excluded ${summary.excludedSecretLikeFiles} secret-looking files plus envs, dependencies, backups, dumps, WAL archives, private keys, and old archive bundles. Worktree status at packaging: ${dirtyCount} dirty entries.`,
    clientRequestId: `metraiyux-repo-safe-${now}`,
    submissionId: `metraiyux-repo-vault-${now}`,
    usageRightsAccepted: true,
    retentionAcknowledged: true,
    portalKey,
    fileName,
    fileSize: fileBuffer.length,
    mimeType: 'application/zip',
    fileFingerprint: {
      algorithm: 'SHA-256',
      mode: 'full',
      value: archiveHash,
      bytesHashed: fileBuffer.length,
      generatedAt: new Date().toISOString(),
      note: 'Full SHA-256 of sanitized repository zip before vault upload.'
    },
    submissionFileCount: 1,
    submissionTotalBytes: fileBuffer.length,
    failedDestinationIds: []
  };

  const api = async (apiPath, payload) => {
    const response = await fetch(`${baseUrl}${apiPath}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-portal-key': portalKey, origin },
      body: JSON.stringify(payload)
    });
    const text = await response.text();
    const data = JSON.parse(text || '{}');
    if (!response.ok || data.ok === false) throw new Error(`${apiPath} failed ${response.status}: ${data.error || text.slice(0, 300)}`);
    return data;
  };

  console.log(`Vault API: ${baseUrl}`);
  console.log(`Upload origin: ${origin}`);
  const session = await api('/api/upload-session', body);
  console.log(`Upload session: ${session.sessionId} (${session.parts?.length || 0} parts)`);

  const completedParts = [];
  for (const part of session.parts || []) {
    const chunk = fileBuffer.subarray(part.start, part.end + 1);
    const response = await fetch(part.uploadUrl, { method: 'PUT', body: chunk });
    const text = await response.text();
    if (!response.ok) throw new Error(`R2 part ${part.partNumber} failed ${response.status}: ${text.slice(0, 300)}`);
    completedParts.push({
      partNumber: part.partNumber,
      eTag: (response.headers.get('etag') || response.headers.get('ETag') || '').replace(/^"|"$/g, '')
    });
    console.log(`Uploaded part ${part.partNumber}/${session.parts.length}`);
  }

  const driveFile = {
    ...(session.r2Object || {}),
    id: session.objectKey,
    key: session.objectKey,
    bucket: session.bucket,
    uploadId: session.uploadId,
    parts: completedParts,
    name: fileName,
    size: String(fileBuffer.length),
    mimeType: 'application/zip'
  };
  const completion = await api('/api/upload-complete', {
    ...body,
    sessionId: session.sessionId,
    destinationId: session.destination.id,
    destinationName: session.destination.name,
    driveFileId: driveFile.id,
    driveFile
  });
  return {
    ok: true,
    vaultApi: baseUrl,
    origin,
    receiptId: completion.receipt?.id || completion.entry?.id,
    sessionId: session.sessionId,
    destination: session.destination?.name,
    fileName,
    fileSize: fileBuffer.length,
    sha256: archiveHash,
    manifestUpdated: completion.manifest?.updated,
    notificationOk: completion.notification?.ok ?? null
  };
}

if (existingArchive) {
  const archive = path.resolve(root, existingArchive);
  if (!fs.existsSync(archive)) throw new Error(`Archive not found: ${archive}`);
  const archiveHash = hashFile(archive);
  const summary = {
    fileCount: existingFileCount,
    bytes: fs.statSync(archive).size,
    excludedSecretLikeFiles: existingSecretExcludeCount
  };
  console.log(`Using existing sanitized archive: ${archive}`);
  console.log(`Files: ${summary.fileCount || 'not provided'}`);
  console.log(`Bytes: ${summary.bytes}`);
  console.log(`SHA-256: ${archiveHash}`);
  console.log(`Secret-looking files excluded: ${summary.excludedSecretLikeFiles || 'not provided'}`);
  if (dryRun) {
    console.log('Dry run complete. Upload skipped.');
    process.exit(0);
  }
  const receipt = await uploadArchive(archive, archiveHash, summary);
  const stamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const outDir = path.join(root, '.skyevault-out');
  fs.mkdirSync(outDir, { recursive: true });
  const receiptPath = path.join(outDir, `skyevault-receipt-${receipt.receiptId || stamp}.json`);
  fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify(receipt, null, 2));
  console.log(`Receipt written: ${receiptPath}`);
  process.exit(0);
}

const stamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
const outDir = path.join(root, '.skyevault-out');
const stage = path.join(os.tmpdir(), `skyevault-repo-stage-${stamp}`);
const archive = path.join(outDir, `${repoName}-repo-safe-${stamp}.zip`);
fs.mkdirSync(outDir, { recursive: true });

console.log('Scanning repo for secret-looking files...');
const excludes = secretExcludes();
for (const item of excludes.slice(0, 80)) console.log(`Excluding ${item.file} (${item.hits.join(', ')})`);
if (excludes.length > 80) console.log(`...and ${excludes.length - 80} more excluded files`);

console.log('Building sanitized staging tree...');
copyToStage(stage, excludes);
const stageFindings = scanStage(stage);
if (stageFindings.length) {
  console.error('Staged secret scan failed:');
  for (const item of stageFindings.slice(0, 80)) console.error(`${item.file}: ${item.hits.join(', ')}`);
  process.exit(3);
}

console.log('Creating zip archive...');
zipStage(stage, archive);
const archiveHash = hashFile(archive);
const summary = outputSummary(stage, archive, excludes);
console.log(`Archive: ${archive}`);
console.log(`Files: ${summary.fileCount}`);
console.log(`Bytes: ${summary.bytes}`);
console.log(`SHA-256: ${archiveHash}`);
console.log(`Secret-looking files excluded: ${summary.excludedSecretLikeFiles}`);

if (dryRun) {
  console.log('Dry run complete. Upload skipped.');
  process.exit(0);
}

const receipt = await uploadArchive(archive, archiveHash, summary);
const receiptPath = path.join(outDir, `skyevault-receipt-${receipt.receiptId || stamp}.json`);
fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
console.log(`Receipt written: ${receiptPath}`);

if (!keepStage) fs.rmSync(stage, { recursive: true, force: true });
