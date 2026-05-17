import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const keepStage = args.has('--keep-stage');
const keepArchive = args.has('--keep-archive');
const argValue = (name) => {
  const prefix = `${name}=`;
  return process.argv.slice(2).find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || '';
};
const envValue = (name) => String(process.env[name] || '').trim();
const existingArchive = argValue('--upload-archive');
const existingFileCount = Number(argValue('--file-count') || 0);
const existingSecretExcludeCount = Number(argValue('--secret-excludes') || 0);
const uploadAssetType = argValue('--asset-type');
const uploadProjectName = argValue('--project-name');
const uploadClientReference = argValue('--client-reference');
const uploadNotes = argValue('--notes');
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

function resolveWorkspacePath(value, fallback) {
  const clean = String(value || '').trim();
  if (!clean) return fallback;
  return path.isAbsolute(clean) ? clean : path.resolve(root, clean);
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

async function hashFile(file) {
  return await new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(file);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

function numberEnv(env, name, fallback) {
  const value = Number(env[name]);
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;
}

function quotaFromEnv(env) {
  return {
    storageMb: numberEnv(env, 'SKYEVAULT_VAULT_STORAGE_MB', numberEnv(env, 'SKYEVAULT_GATE_VAULT_STORAGE_MB', 0)),
    fileLimit: numberEnv(env, 'SKYEVAULT_VAULT_FILE_LIMIT', numberEnv(env, 'SKYEVAULT_GATE_VAULT_FILE_LIMIT', 0)),
    workspaceLimit: numberEnv(env, 'SKYEVAULT_VAULT_WORKSPACE_LIMIT', numberEnv(env, 'SKYEVAULT_GATE_VAULT_WORKSPACE_LIMIT', 0))
  };
}

function enforceUploadQuota(quotas, archiveSize, summary) {
  if (quotas.fileLimit && summary.fileCount && summary.fileCount > quotas.fileLimit) {
    throw new Error(`Vault upload file count ${summary.fileCount} exceeds workspace file limit ${quotas.fileLimit}.`);
  }
  if (quotas.storageMb) {
    const limitBytes = quotas.storageMb * 1024 * 1024;
    if (archiveSize > limitBytes) {
      throw new Error(`Vault archive size ${archiveSize} bytes exceeds workspace storage limit ${quotas.storageMb} MB.`);
    }
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status) {
  return status === 408 || status === 429 || status >= 500;
}

async function fetchTextWithRetry(url, options, retryOptions) {
  const retries = retryOptions.retries;
  const baseDelayMs = retryOptions.baseDelayMs;
  const label = retryOptions.label;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, options);
      const text = await response.text();
      if (!isRetryableStatus(response.status) || attempt === retries) return { response, text };
      const waitMs = baseDelayMs * 2 ** attempt;
      console.warn(`${label} returned ${response.status}; retrying in ${waitMs}ms (${attempt + 1}/${retries})`);
      await sleep(waitMs);
    } catch (error) {
      if (attempt === retries) throw error;
      const waitMs = baseDelayMs * 2 ** attempt;
      console.warn(`${label} failed: ${error.message}; retrying in ${waitMs}ms (${attempt + 1}/${retries})`);
      await sleep(waitMs);
    }
  }
  throw new Error(`${label} failed after ${retries} retries.`);
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
  const workspaceId = String(env.SKYEVAULT_WORKSPACE_ID || env.SKYEVAULT_DEV_WORKSPACE_ID || '').trim();
  const customerId = String(env.SKYEVAULT_CUSTOMER_ID || env.SKYEVAULT_GATE_CUSTOMER_ID || env.SKYEVAULT_ACCOUNT_ID || '').trim();
  const repoId = String(env.SKYEVAULT_REPO_ID || repoName).trim();
  const gateCardId = String(env.SKYEVAULT_GATE_CARD_ID || '').trim();
  const apiKeyId = String(env.SKYEVAULT_API_KEY_ID || env.SKYEVAULT_GATE_API_KEY_ID || '').trim();
  const gateRole = String(env.SKYEVAULT_GATE_ROLE || env.SKYEVAULT_ROLE || '').trim();
  const developerId = String(env.SKYEVAULT_DEVELOPER_ID || env.USER || '').trim();
  const developerName = String(env.SKYEVAULT_DEVELOPER_NAME || env.GIT_AUTHOR_NAME || '').trim();
  const destinationId = String(env.SKYEVAULT_DESTINATION_ID || '').trim();
  const quotas = quotaFromEnv(env);
  const retryOptions = {
    retries: numberEnv(env, 'SKYEVAULT_UPLOAD_RETRIES', 3),
    baseDelayMs: numberEnv(env, 'SKYEVAULT_UPLOAD_RETRY_BASE_MS', 750)
  };

  const archiveSize = fs.statSync(archive).size;
  enforceUploadQuota(quotas, archiveSize, summary);
  const fileName = path.basename(archive);
  const now = Date.now();
  const branch = gitValue(['branch', '--show-current']);
  const commit = gitValue(['rev-parse', '--short', 'HEAD']);
  const dirtyCount = gitValue(['status', '--short'], '').split(/\r?\n/).filter(Boolean).length;
  const body = {
    clientName: env.SKYEVAULT_CLIENT_NAME || 'Repository Operator',
    clientEmail: env.SKYEVAULT_CLIENT_EMAIL || 'operator@example.com',
    projectName: uploadProjectName || env.SKYEVAULT_PROJECT_NAME || `${repoName} repository safe vault snapshot`,
    clientReference: uploadClientReference || `repo:${branch}@${commit}`,
    assetType: uploadAssetType || env.SKYEVAULT_ASSET_TYPE || 'Repository safe archive',
    notes: uploadNotes || `Sanitized repo archive generated by tools/skyevault-repo-push.mjs. Excluded ${summary.excludedSecretLikeFiles} secret-looking files plus envs, dependencies, backups, dumps, WAL archives, private keys, and old archive bundles. Worktree status at packaging: ${dirtyCount} dirty entries.`,
    clientRequestId: `metraiyux-repo-safe-${now}`,
    submissionId: `metraiyux-repo-vault-${now}`,
    workspaceId,
    customerId,
    repoId,
    gateCardId,
    apiKeyId,
    gateRole,
    developerId,
    developerName,
    destinationId,
    usageRightsAccepted: true,
    retentionAcknowledged: true,
    portalKey,
    fileName,
    fileSize: archiveSize,
    mimeType: 'application/zip',
    fileFingerprint: {
      algorithm: 'SHA-256',
      mode: 'full',
      value: archiveHash,
      bytesHashed: archiveSize,
      generatedAt: new Date().toISOString(),
      note: 'Full SHA-256 of sanitized repository zip before vault upload.'
    },
    submissionFileCount: 1,
    submissionTotalBytes: archiveSize,
    archiveFileCount: summary.fileCount,
    quota: quotas,
    failedDestinationIds: []
  };

  const api = async (apiPath, payload) => {
    const { response, text } = await fetchTextWithRetry(`${baseUrl}${apiPath}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-portal-key': portalKey, origin },
      body: JSON.stringify(payload)
    }, { ...retryOptions, label: apiPath });
    let data = {};
    try {
      data = JSON.parse(text || '{}');
    } catch {
      throw new Error(`${apiPath} returned non-JSON ${response.status}: ${text.slice(0, 300)}`);
    }
    if (!response.ok || data.ok === false) throw new Error(`${apiPath} failed ${response.status}: ${data.error || text.slice(0, 300)}`);
    return data;
  };

  console.log(`Vault API: ${baseUrl}`);
  console.log(`Upload origin: ${origin}`);
  console.log(`Upload retries: ${retryOptions.retries}`);
  const session = await api('/api/upload-session', body);
  console.log(`Upload session: ${session.sessionId} (${session.parts?.length || 0} parts)`);

  const completedParts = [];
  const archiveHandle = await fs.promises.open(archive, 'r');
  try {
    for (const part of session.parts || []) {
      const length = part.end - part.start + 1;
      const chunk = Buffer.allocUnsafe(length);
      let offset = 0;
      while (offset < length) {
        const { bytesRead } = await archiveHandle.read(chunk, offset, length - offset, part.start + offset);
        if (!bytesRead) break;
        offset += bytesRead;
      }
      if (offset !== length) throw new Error(`Could not read archive part ${part.partNumber}: expected ${length} bytes, got ${offset}.`);
      const { response, text } = await fetchTextWithRetry(part.uploadUrl, { method: 'PUT', body: chunk }, {
        ...retryOptions,
        label: `R2 part ${part.partNumber}`
      });
      if (!response.ok) throw new Error(`R2 part ${part.partNumber} failed ${response.status}: ${text.slice(0, 300)}`);
      completedParts.push({
        partNumber: part.partNumber,
        eTag: (response.headers.get('etag') || response.headers.get('ETag') || '').replace(/^"|"$/g, '')
      });
      console.log(`Uploaded part ${part.partNumber}/${session.parts.length}`);
    }
  } finally {
    await archiveHandle.close();
  }

  const driveFile = {
    ...(session.r2Object || {}),
    id: session.objectKey,
    key: session.objectKey,
    bucket: session.bucket,
    uploadId: session.uploadId,
    parts: completedParts,
    name: fileName,
    size: String(archiveSize),
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
    fileSize: archiveSize,
    sha256: archiveHash,
    manifestUpdated: completion.manifest?.updated,
    notificationOk: completion.notification?.ok ?? null,
    assetType: body.assetType,
    projectName: body.projectName,
    clientReference: body.clientReference,
    workspaceId,
    customerId,
    repoId,
    gateCardId,
    apiKeyId,
    gateRole,
    developerId,
    gitBranch: branch,
    gitCommit: commit,
    dirtyCount,
    completedParts: completedParts.length,
    retryCount: retryOptions.retries,
    quota: quotas,
    archive: {
      fileCount: summary.fileCount,
      bytes: archiveSize,
      sha256: archiveHash,
      secretLookingFilesExcluded: summary.excludedSecretLikeFiles
    }
  };
}

function writeReceipt(receipt, outDir, stamp) {
  const name = `skyevault-receipt-${receipt.receiptId || stamp}.json`;
  const text = `${JSON.stringify(receipt, null, 2)}\n`;
  const fallbackDir = path.join(os.tmpdir(), 'skyevault-repo-push', 'receipts');
  let firstError = null;
  for (const dir of [outDir, fallbackDir]) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      const receiptPath = path.join(dir, name);
      fs.writeFileSync(receiptPath, text);
      return receiptPath;
    } catch (error) {
      firstError ||= error;
      if (!['ENOSPC', 'EROFS'].includes(error.code)) throw error;
    }
  }
  throw firstError;
}

function appendLedger(event) {
  const fallbackDir = path.join(os.tmpdir(), 'skyevault-repo-push', 'receipts');
  const line = `${JSON.stringify(event)}\n`;
  let firstError = null;
  for (const file of [path.join(root, '.skyevault-out', 'vault-ledger.jsonl'), path.join(fallbackDir, 'vault-ledger.jsonl')]) {
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.appendFileSync(file, line);
      return file;
    } catch (error) {
      firstError ||= error;
      if (!['ENOSPC', 'EROFS'].includes(error.code)) throw error;
    }
  }
  throw firstError;
}

function uploadLedgerEvent(receipt, summary, receiptPath) {
  return {
    schema: 'skyevault.local-ledger.v1',
    event: 'upload.complete',
    recordedAt: new Date().toISOString(),
    receiptId: receipt.receiptId,
    sessionId: receipt.sessionId,
    destination: receipt.destination,
    assetType: receipt.assetType,
    projectName: receipt.projectName,
    clientReference: receipt.clientReference,
    workspaceId: receipt.workspaceId,
    customerId: receipt.customerId,
    repoId: receipt.repoId,
    gateCardId: receipt.gateCardId,
    apiKeyId: receipt.apiKeyId,
    gateRole: receipt.gateRole,
    developerId: receipt.developerId,
    gitBranch: receipt.gitBranch,
    gitCommit: receipt.gitCommit,
    dirtyCount: receipt.dirtyCount,
    fileName: receipt.fileName,
    fileSize: receipt.fileSize,
    sha256: receipt.sha256,
    completedParts: receipt.completedParts,
    retryCount: receipt.retryCount,
    quota: receipt.quota,
    archive: receipt.archive,
    excludedSecretLikeFiles: summary.excludedSecretLikeFiles,
    receiptPath
  };
}

if (existingArchive) {
  const archive = path.resolve(root, existingArchive);
  if (!fs.existsSync(archive)) throw new Error(`Archive not found: ${archive}`);
  const archiveHash = await hashFile(archive);
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
  const receiptPath = writeReceipt(receipt, outDir, stamp);
  const ledgerPath = appendLedger(uploadLedgerEvent(receipt, summary, receiptPath));
  console.log(JSON.stringify(receipt, null, 2));
  console.log(`Receipt written: ${receiptPath}`);
  console.log(`Ledger appended: ${ledgerPath}`);
  process.exit(0);
}

const stamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
const outDir = path.join(root, '.skyevault-out');
const scratchRoot = path.join(os.tmpdir(), 'skyevault-repo-push');
const stageParent = resolveWorkspacePath(envValue('SKYEVAULT_STAGE_PARENT'), scratchRoot);
const archiveDir = resolveWorkspacePath(envValue('SKYEVAULT_ARCHIVE_DIR'), path.join(scratchRoot, 'archives'));
const stage = path.join(stageParent, `skyevault-repo-stage-${stamp}`);
const archive = path.join(archiveDir, `${repoName}-repo-safe-${stamp}.zip`);
fs.mkdirSync(archiveDir, { recursive: true });

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
const archiveHash = await hashFile(archive);
const summary = outputSummary(stage, archive, excludes);
console.log(`Archive: ${archive}`);
console.log(`Files: ${summary.fileCount}`);
console.log(`Bytes: ${summary.bytes}`);
console.log(`SHA-256: ${archiveHash}`);
console.log(`Secret-looking files excluded: ${summary.excludedSecretLikeFiles}`);

if (dryRun) {
  console.log('Dry run complete. Upload skipped.');
  if (!keepStage) fs.rmSync(stage, { recursive: true, force: true });
  if (!keepArchive) fs.rmSync(archive, { force: true });
  process.exit(0);
}

const receipt = await uploadArchive(archive, archiveHash, summary);
const receiptPath = writeReceipt(receipt, outDir, stamp);
const ledgerPath = appendLedger(uploadLedgerEvent(receipt, summary, receiptPath));
console.log(JSON.stringify(receipt, null, 2));
console.log(`Receipt written: ${receiptPath}`);
console.log(`Ledger appended: ${ledgerPath}`);

if (!keepStage) fs.rmSync(stage, { recursive: true, force: true });
if (!keepArchive) fs.rmSync(archive, { force: true });
