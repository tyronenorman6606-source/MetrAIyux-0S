#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import zlib from 'node:zlib';

const defaultRepoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const rawArgs = process.argv.slice(2);
const command = rawArgs.find((arg) => !arg.startsWith('--')) || 'sync';
const repoRoot = resolvePath(argValue('--repo-root', defaultRepoRoot), process.cwd());
const repoName = cleanId(argValue('--repo-id', path.basename(repoRoot)), 'repo');
const workspaceId = cleanId(argValue('--workspace-id', process.env.SKYEVAULT_OWNER_WORKSPACE_ID || 'metraiyux-0s-owner'), 'owner');
const mirrorRoot = resolvePath(argValue('--mirror-root', path.join(defaultRepoRoot, '.skyevault-out', 'living-mirror', workspaceId, repoName)), defaultRepoRoot);
const currentDir = path.join(mirrorRoot, 'current');
const currentManifestPath = path.join(currentDir, 'manifest.json');
const currentEntriesDir = path.join(currentDir, 'entries');
const privateDir = path.join(mirrorRoot, 'private');
const tempDir = path.join(mirrorRoot, 'tmp');
const receiptsDir = path.join(mirrorRoot, 'receipts');
const ledgerPath = path.join(mirrorRoot, 'ledger.jsonl');
applyEnvFiles();
const uploadRequested = flag('--upload') || envFlag('SKYEVAULT_LIVING_MIRROR_UPLOAD', false);
const exportUploadRequested = flag('--upload-export') || (command === 'export' && flag('--upload')) || envFlag('SKYEVAULT_LIVING_MIRROR_EXPORT_UPLOAD', false);
const directExportUpload = exportUploadRequested && !flag('--spool-export') && envFlag('SKYEVAULT_LIVING_MIRROR_DIRECT_EXPORT_UPLOAD', true);
const keepLocalObjects = flag('--keep-local-objects') || !uploadRequested || envFlag('SKYEVAULT_LIVING_MIRROR_KEEP_LOCAL_OBJECTS', false);
const localFallbackOnUploadFailure = flag('--local-fallback') || envFlag('SKYEVAULT_LIVING_MIRROR_LOCAL_FALLBACK', false);
const remoteRequired = uploadRequested && !localFallbackOnUploadFailure;
const directCloudUpload = uploadRequested && !keepLocalObjects && !flag('--spool-upload') && envFlag('SKYEVAULT_LIVING_MIRROR_DIRECT_CLOUD_UPLOAD', true);
const packSmallFiles = directCloudUpload
  && !flag('--no-pack-small-files')
  && (flag('--pack-small-files') || envFlag('SKYEVAULT_LIVING_MIRROR_PACK_SMALL_FILES', false));
const packCurrentFiles = packSmallFiles
  && (flag('--pack-current-files') || envFlag('SKYEVAULT_LIVING_MIRROR_PACK_CURRENT_FILES', false));
const dryRun = flag('--dry-run');
const force = flag('--force');
const includeGenerated = !flag('--skip-generated');
const uploadPrefix = normalizePrefix(argValue('--remote-prefix', process.env.SKYEVAULT_LIVING_MIRROR_PREFIX || `vault-system/living-repo/${workspaceId}/${repoName}`));

function argValue(name, fallback = '') {
  const prefix = `${name}=`;
  const inline = rawArgs.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = rawArgs.indexOf(name);
  if (index >= 0 && rawArgs[index + 1] && !rawArgs[index + 1].startsWith('--')) return rawArgs[index + 1];
  return fallback;
}

function flag(name) {
  return rawArgs.includes(name);
}

function envFlag(name, fallback = false) {
  const value = process.env[name];
  if (value === undefined || value === '') return fallback;
  return !['0', 'false', 'no', 'off'].includes(String(value).trim().toLowerCase());
}

function parseEnvFile(file) {
  const values = {};
  if (!file || !fs.existsSync(file)) return values;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    values[match[1]] = value;
  }
  return values;
}

function expandEnvValue(value, values, depth = 0) {
  if (depth > 8) return value;
  return String(value || '').replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_match, name) => {
    const replacement = process.env[name] ?? values[name] ?? '';
    return expandEnvValue(replacement, values, depth + 1);
  });
}

function applyEnvFiles() {
  const files = [
    argValue('--env-file', ''),
    process.env.SKYEVAULT_LIVING_MIRROR_ENV_FILE || '',
    process.env.SKYEVAULT_AUTOSYNC_ENV_FILE || ''
  ].filter(Boolean);
  for (const file of files) {
    const resolved = resolvePath(file, defaultRepoRoot);
    const parsed = parseEnvFile(resolved);
    for (const [key, value] of Object.entries(parsed)) {
      if (process.env[key] === undefined || process.env[key] === '') process.env[key] = expandEnvValue(value, parsed);
    }
  }
  if (!process.env.R2_BUCKET && !process.env.S3_BUCKET) process.env.R2_BUCKET = 'client-drop-vault';
}

function resolvePath(value, base) {
  const clean = String(value || '').trim();
  if (!clean) return base;
  return path.isAbsolute(clean) ? clean : path.resolve(base, clean);
}

function cleanId(value, fallback) {
  return String(value || fallback)
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || fallback;
}

function normalizePrefix(value) {
  return String(value || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').replace(/\/{2,}/g, '/');
}

function rel(file, base = repoRoot) {
  return path.relative(base, file).split(path.sep).join('/');
}

function safeJson(value) {
  return JSON.stringify(stableValue(value));
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map((item) => stableValue(item));
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
}

function sha256Text(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

async function sha256File(file) {
  return await new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(file);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, value, mode = 0o600) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, { mode });
  try { fs.chmodSync(file, mode); } catch {}
}

function writeCompactJson(file, value, mode = 0o600) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value)}\n`, { mode });
  try { fs.chmodSync(file, mode); } catch {}
}

function appendJsonl(file, value, mode = 0o600) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(value)}\n`, { mode });
  try { fs.chmodSync(file, mode); } catch {}
}

function cleanupTempFiles() {
  if (!fs.existsSync(tempDir)) return { removed: 0, bytes: 0 };
  let removed = 0;
  let bytes = 0;
  for (const name of fs.readdirSync(tempDir)) {
    if (!name.endsWith('.tmp')) continue;
    const file = path.join(tempDir, name);
    let stat = null;
    try {
      stat = fs.statSync(file);
      fs.unlinkSync(file);
      removed += 1;
      bytes += stat.size;
    } catch {}
  }
  return { removed, bytes };
}

function stamp() {
  return new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function pathHash(itemPath) {
  return crypto.createHash('sha256').update(itemPath).digest('hex');
}

function currentObjectRel(itemPath, storageMode = 'encrypted') {
  const hash = pathHash(itemPath);
  const encrypted = storageMode !== 'plain';
  return `current/${encrypted ? 'protected' : 'files'}/${hash.slice(0, 2)}/${hash}${encrypted ? '.enc' : '.raw'}`;
}

function currentObjectPath(itemPath, storageMode = 'encrypted') {
  return path.join(mirrorRoot, currentObjectRel(itemPath, storageMode));
}

function currentRemoteKey(itemPath, storageMode = 'encrypted') {
  return `${uploadPrefix}/${currentObjectRel(itemPath, storageMode)}`;
}

function currentPackRemoteKey(packId) {
  return `${uploadPrefix}/current/packs/${packId}.pack.enc`;
}

function currentEntryShardRemoteKey(shardName) {
  return `${uploadPrefix}/current/entries/${shardName}.enc`;
}

function currentManifestRemoteKey() {
  return `${uploadPrefix}/current/manifest.json`;
}

function currentPrivateManifestRemoteKey() {
  return `${uploadPrefix}/current/manifest.private.enc`;
}

function currentReceiptRemoteKey() {
  return `${uploadPrefix}/current/latest-receipt.json`;
}

function privateReceiptRemoteKey(fileName) {
  return `${uploadPrefix}/receipts/${fileName}.private.enc`;
}

function decodeMasterKey(value, source) {
  const raw = String(value || '').trim();
  const decoded = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');
  if (decoded.length !== 32) throw new Error(`${source} must decode to 32 bytes.`);
  return decoded;
}

function loadMasterKey() {
  const fromEnv = String(process.env.SKYEVAULT_LIVING_MIRROR_MASTER_KEY || '').trim();
  if (fromEnv) {
    return { key: decodeMasterKey(fromEnv, 'SKYEVAULT_LIVING_MIRROR_MASTER_KEY'), source: 'env' };
  }
  const keyFile = path.join(privateDir, 'owner-master-key.json');
  const existing = readJson(keyFile, null);
  if (existing?.keyBase64) {
    const decoded = decodeMasterKey(existing.keyBase64, keyFile);
    return { key: decoded, source: keyFile };
  }
  fs.mkdirSync(privateDir, { recursive: true, mode: 0o700 });
  const key = crypto.randomBytes(32);
  writeJson(keyFile, {
    schema: 'skyevault.living-repo-mirror.master-key.v1',
    createdAt: new Date().toISOString(),
    algorithm: 'aes-256-gcm',
    keyBase64: key.toString('base64'),
    warning: 'Private owner restore key. Do not commit, print, or share this file.'
  }, 0o600);
  return { key, source: keyFile };
}

function loadRestoreKit() {
  const rawKit = argValue('--kit-file', argValue('--restore-kit', ''));
  if (!rawKit) return null;
  const kitPath = resolvePath(rawKit, process.cwd());
  const kit = readJson(kitPath, null);
  if (!kit?.ok) throw new Error(`Restore kit is missing or not ok: ${kitPath}`);
  return { ...kit, kitPath };
}

function masterKeyFromRestoreKit(kit) {
  const raw = kit?.ownerUnlock?.masterKeyBase64 || kit?.masterKeyBase64 || '';
  if (!raw) return loadMasterKey();
  return { key: decodeMasterKey(raw, kit.kitPath || 'restore kit masterKeyBase64'), source: kit.kitPath || 'restore-kit' };
}

async function manifestFromRestoreKit(kit, masterKey) {
  if (!kit) return readJson(currentManifestPath, null);
  if (kit.manifest && typeof kit.manifest === 'object') return kit.manifest;
  const privateManifestKey = kit.privateManifestKey || kit.remote?.privateManifestKey || kit.mirror?.remote?.privateManifestKey || '';
  if (privateManifestKey) {
    const encrypted = await r2GetBuffer(privateManifestKey);
    return JSON.parse(decryptBytesEnvelopeBuffer(encrypted, masterKey).toString('utf8'));
  }
  const manifestPath = kit.manifestPath ? resolvePath(kit.manifestPath, path.dirname(kit.kitPath || process.cwd())) : currentManifestPath;
  return readJson(manifestPath, null);
}

function encryptJsonBuffer(value, key) {
  return encryptBytesEnvelopeBuffer(Buffer.from(JSON.stringify(value)), key, 'skyevault.living-repo-mirror.encrypted-json.v1');
}

function encryptBytesEnvelopeBuffer(plain, key, schema = 'skyevault.living-repo-mirror.encrypted-bytes.v1') {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const body = Buffer.concat([cipher.update(plain), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.from(JSON.stringify({
    schema,
    algorithm: 'aes-256-gcm',
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    body: body.toString('base64')
  }, null, 2));
}

function decryptBytesEnvelopeBuffer(envelopeBuffer, key) {
  const envelope = JSON.parse(Buffer.isBuffer(envelopeBuffer) ? envelopeBuffer.toString('utf8') : String(envelopeBuffer || ''));
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(envelope.iv || '', 'base64'));
  decipher.setAuthTag(Buffer.from(envelope.authTag || '', 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(envelope.body || '', 'base64')), decipher.final()]);
}

async function encryptFileToTemp(source, key, itemPath) {
  fs.mkdirSync(tempDir, { recursive: true, mode: 0o700 });
  const iv = crypto.randomBytes(12);
  const out = path.join(tempDir, `${pathHash(itemPath)}-${process.pid}-${Date.now()}.enc.tmp`);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  await pipeline(fs.createReadStream(source), cipher, fs.createWriteStream(out, { mode: 0o600 }));
  const authTag = cipher.getAuthTag();
  const encryptedSha256 = await sha256File(out);
  const stat = fs.statSync(out);
  return {
    tempPath: out,
    algorithm: 'aes-256-gcm',
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    encryptedBytes: stat.size,
    encryptedSha256
  };
}

async function encryptFileToR2Cloud(source, key, itemPath, remoteKey, sha256) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const uploaded = await r2UploadStreamSmart(remoteKey, fs.createReadStream(source).pipe(cipher), {
    contentType: 'application/vnd.skyevault.living-file+encrypted',
    metadata: {
      schema: 'skyevault.living_repo_file.v1',
      workspace_id: workspaceId,
      repo_id: repoName,
      path_hash: pathHash(itemPath),
      plain_sha256: sha256,
      owner_scope: 'owner-private',
      upload_mode: 'direct-encrypted-cloud-multipart'
    }
  });
  return {
    algorithm: 'aes-256-gcm',
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
    encryptedBytes: uploaded.size,
    encryptedSha256: uploaded.sha256,
    uploadMode: uploaded.mode,
    etag: uploaded.etag || ''
  };
}

async function uploadPlainFileToR2Cloud(source, itemPath, remoteKey, sha256) {
  const uploaded = await r2UploadStreamSmart(remoteKey, fs.createReadStream(source), {
    contentType: 'application/vnd.skyevault.living-file+plain',
    metadata: {
      schema: 'skyevault.living_repo_file.v1',
      workspace_id: workspaceId,
      repo_id: repoName,
      path_hash: pathHash(itemPath),
      plain_sha256: sha256,
      owner_scope: 'owner-private',
      storage_mode: 'plain-current-object',
      upload_mode: 'direct-plain-cloud-multipart'
    }
  });
  return {
    size: uploaded.size,
    bytes: uploaded.size,
    sha256: uploaded.sha256,
    uploadMode: uploaded.mode,
    etag: uploaded.etag || ''
  };
}

async function copyFileToCurrentObject(source, itemPath, storageMode, mode = 0o600) {
  const target = currentObjectPath(itemPath, storageMode);
  fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
  await pipeline(fs.createReadStream(source), fs.createWriteStream(target, { mode }));
  try { fs.chmodSync(target, mode); } catch {}
  return {
    localObjectRel: currentObjectRel(itemPath, storageMode),
    bytes: fs.statSync(target).size,
    sha256: await sha256File(target)
  };
}

async function storedObjectStream(entry) {
  if (entry.pack?.objectKey) {
    return r2GetRangeStream(entry.pack.objectKey, Number(entry.pack.offset || 0), Number(entry.pack.encryptedBytes || entry.encryption?.encryptedBytes || 0));
  }
  const source = path.join(mirrorRoot, entry.localObjectRel || currentObjectRel(entry.path, entryStorageMode(entry)));
  if (fs.existsSync(source)) return fs.createReadStream(source);
  if (entry.remoteObjectKey) {
    const remoteBytes = Number(entry.encryption?.encryptedBytes || entry.bytes || 0);
    if (remoteBytes > 0) return r2GetRangeStream(entry.remoteObjectKey, 0, remoteBytes);
    return await r2GetStream(entry.remoteObjectKey);
  }
  return null;
}

async function decryptFileToPath(entry, target, key) {
  const iv = Buffer.from(entry.encryption?.iv || '', 'base64');
  const authTag = Buffer.from(entry.encryption?.authTag || '', 'base64');
  const input = await storedObjectStream(entry);
  if (!input) throw new Error(`Mirror object missing for ${entry.path}`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  await pipeline(input, decipher, fs.createWriteStream(target, { mode: entry.mode || 0o600 }));
  try { fs.chmodSync(target, entry.mode || 0o600); } catch {}
}

async function restoreFileToPath(entry, target, key) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  try {
    if (entryIsEncrypted(entry)) {
      await decryptFileToPath(entry, target, key);
    } else {
      const input = await storedObjectStream(entry);
      if (!input) throw new Error(`Mirror object missing for ${entry.path}`);
      await pipeline(input, fs.createWriteStream(target, { mode: entry.mode || 0o600 }));
      try { fs.chmodSync(target, entry.mode || 0o600); } catch {}
    }
    const restoredSha256 = await sha256File(target);
    if (entry.sha256 && restoredSha256 !== entry.sha256) {
      throw new Error(`Restored checksum mismatch for ${entry.path}: ${restoredSha256} !== ${entry.sha256}`);
    }
  } catch (error) {
    try { fs.unlinkSync(target); } catch {}
    throw error;
  }
}

function shouldSkipDir(relativePath) {
  const clean = relativePath.replace(/\\/g, '/');
  if (!clean) return false;
  if (clean === '.skyevault-out' || clean.startsWith('.skyevault-out/')) return true;
  if (!includeGenerated && ['node_modules', '.tmp', '.1', 'download-handoffs', 'test-artifacts', 'test-results'].some((part) => clean === part || clean.startsWith(`${part}/`) || clean.includes(`/${part}/`))) return true;
  const mirrorRelative = path.relative(repoRoot, mirrorRoot).replace(/\\/g, '/');
  return mirrorRelative && !mirrorRelative.startsWith('..') && (clean === mirrorRelative || clean.startsWith(`${mirrorRelative}/`));
}

function* scanRepoEntries(skipped = []) {
  const stack = [''];
  let scanned = 0;
  let lastLog = Date.now();
  while (stack.length) {
    const relativeDir = stack.pop();
    const dir = path.join(repoRoot, relativeDir);
    let children = [];
    try {
      children = fs.readdirSync(dir, { withFileTypes: true });
    } catch (error) {
      skipped.push({ path: relativeDir || '.', reason: error.message });
      continue;
    }
    children.sort((a, b) => a.name.localeCompare(b.name));
    for (const child of children) {
      const itemPath = [relativeDir, child.name].filter(Boolean).join('/').replace(/\\/g, '/');
      if (shouldSkipDir(itemPath)) {
        skipped.push({ path: itemPath, reason: 'mirror/self/generated skip policy' });
        continue;
      }
      const abs = path.join(repoRoot, itemPath);
      let stat = null;
      try {
        stat = fs.lstatSync(abs);
      } catch (error) {
        skipped.push({ path: itemPath, reason: error.message });
        continue;
      }
      scanned += 1;
      if (Date.now() - lastLog > 15000) {
        process.stderr.write(`[living-mirror] scanned ${scanned} paths...\n`);
        lastLog = Date.now();
      }
      if (stat.isDirectory()) {
        yield {
          path: itemPath,
          type: 'directory',
          mode: stat.mode & 0o777,
          mtimeMs: Math.floor(stat.mtimeMs)
        };
        stack.push(itemPath);
      } else if (stat.isSymbolicLink()) {
        yield {
          path: itemPath,
          type: 'symlink',
          mode: stat.mode & 0o777,
          mtimeMs: Math.floor(stat.mtimeMs),
          linkTarget: fs.readlinkSync(abs)
        };
      } else if (stat.isFile()) {
        yield {
          path: itemPath,
          type: 'file',
          abs,
          mode: stat.mode & 0o777,
          mtimeMs: Math.floor(stat.mtimeMs),
          bytes: stat.size
        };
      } else {
        skipped.push({ path: itemPath, reason: 'not file, directory, or symlink' });
      }
    }
  }
}

function scanRepo() {
  const skipped = [];
  const entries = [...scanRepoEntries(skipped)];
  return { entries: entries.sort((a, b) => a.path.localeCompare(b.path)), skipped: skipped.sort((a, b) => a.path.localeCompare(b.path)) };
}

function normalizeStatusPath(raw) {
  return String(raw || '').trim().replace(/^"|"$/g, '').replace(/\\/g, '/');
}

function statusLinePaths(line) {
  if (!line || line.startsWith('##')) return [];
  const raw = line.slice(3).trim();
  if (!raw) return [];
  if (raw.includes(' -> ')) return raw.split(' -> ').map(normalizeStatusPath).filter(Boolean);
  return [normalizeStatusPath(raw)];
}

function gitLines(args) {
  const result = spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8', maxBuffer: 1024 * 1024 * 128 });
  if (result.status !== 0) return [];
  return String(result.stdout || '').split(/\r?\n/).filter(Boolean);
}

function gitIgnoredPathSet() {
  const result = spawnSync('git', ['ls-files', '--others', '-i', '--exclude-standard', '-z'], {
    cwd: repoRoot,
    encoding: 'buffer',
    maxBuffer: 1024 * 1024 * 256
  });
  if (result.status !== 0) return new Set();
  return new Set(String(result.stdout || '').split('\0').map((item) => item.replace(/\\/g, '/')).filter(Boolean));
}

const protectedPathPatterns = [
  { reason: 'git-private-metadata', pattern: /(^|\/)\.git($|\/)/ },
  { reason: 'dotenv-or-local-env', pattern: /(^|\/)\.env($|\.|\/)/i },
  { reason: 'package-manager-credential-file', pattern: /(^|\/)(\.npmrc|\.pypirc|\.gem\/credentials|\.netrc)$/i },
  { reason: 'ssh-or-private-key-file', pattern: /(^|\/)(id_rsa|id_dsa|id_ecdsa|id_ed25519|known_hosts|authorized_keys)$/i },
  { reason: 'credential-folder', pattern: /(^|\/)(secrets?|credentials?|tokens?|certs?|ssl|keys?|private)(\/|$)/i },
  { reason: 'credential-name', pattern: /(^|\/)[^/]*(secret|credential|token|private[-_]?key|api[-_]?key|password)[^/]*$/i },
  { reason: 'key-or-certificate-extension', pattern: /\.(pem|key|p12|pfx|jks|keystore|kdbx|crt|cer|csr)$/i },
  { reason: 'local-data-store', pattern: /\.(sqlite|sqlite3|db|db3|dump|bak)$/i }
];

const protectedContentPatterns = [
  { reason: 'private-key-material', pattern: /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/ },
  { reason: 'openai-api-key-shape', pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/ },
  { reason: 'github-token-shape', pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{20,}\b/ },
  { reason: 'slack-token-shape', pattern: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/ },
  { reason: 'aws-access-key-shape', pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/ },
  { reason: 'google-api-key-shape', pattern: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { reason: 'database-url-with-credential', pattern: /\b(?:postgres|postgresql|mysql|mongodb(?:\+srv)?|redis):\/\/[^:\s/]+:[^@\s]+@/i },
  { reason: 'jwt-shape', pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/ }
];

function looksTextual(buffer) {
  if (!buffer.length) return true;
  let suspicious = 0;
  const sample = buffer.subarray(0, Math.min(buffer.length, 8192));
  for (const byte of sample) {
    if (byte === 0) return false;
    if (byte < 7 || (byte > 13 && byte < 32)) suspicious += 1;
  }
  return suspicious / sample.length < 0.05;
}

function protectedContentReasons(file, bytes) {
  const maxBytes = intValue('--secret-scan-max-kb', 1024, 1) * 1024;
  if (Number(bytes || 0) > maxBytes) return [];
  let body = null;
  try {
    const buffer = fs.readFileSync(file);
    if (!looksTextual(buffer)) return [];
    body = buffer.toString('utf8');
  } catch {
    return [];
  }
  return protectedContentPatterns.filter(({ pattern }) => pattern.test(body)).map(({ reason }) => reason);
}

function pathProtectionReasons(itemPath, ignoredPaths = new Set()) {
  const cleanPath = String(itemPath || '').replace(/\\/g, '/');
  const reasons = [];
  if (ignoredPaths.has(cleanPath)) reasons.push('gitignored-local-file');
  for (const { reason, pattern } of protectedPathPatterns) {
    if (pattern.test(cleanPath)) reasons.push(reason);
  }
  return [...new Set(reasons)];
}

function protectionFromReasons(reasons = []) {
  const uniqueReasons = [...new Set(reasons)];
  return {
    encrypted: uniqueReasons.length > 0,
    mode: uniqueReasons.length > 0 ? 'encrypted' : 'plain',
    protection: uniqueReasons.length > 0 ? 'protected-owner-unlock' : 'plain-current-object',
    reasons: uniqueReasons
  };
}

function classifyFileProtection(item, ignoredPaths = new Set()) {
  const reasons = pathProtectionReasons(item?.path || '', ignoredPaths);
  if (item?.abs) reasons.push(...protectedContentReasons(item.abs, item.bytes));
  return protectionFromReasons(reasons);
}

function priorFileProtection(prior) {
  if (!prior?.storage || !Array.isArray(prior.storage.reasons)) return null;
  const reasons = [...new Set(prior.storage.reasons)];
  const encrypted = Boolean(prior.storage.encrypted || reasons.length > 0);
  return {
    encrypted,
    mode: prior.storage.logicalMode || prior.storage.mode || (encrypted ? 'encrypted' : 'plain'),
    protection: prior.storage.protection || (encrypted ? 'protected-owner-unlock' : 'plain-current-object'),
    reasons
  };
}

function canReusePriorProtection(priorProtection, currentPathReasons = []) {
  if (!priorProtection) return false;
  const priorReasons = new Set(priorProtection.reasons || []);
  return currentPathReasons.every((reason) => priorReasons.has(reason));
}

function entryStorageMode(entry) {
  if (entry?.pack?.objectKey || entry?.encryption) return 'encrypted';
  if (entry?.storage?.encrypted === false) return 'plain';
  if (entry?.storage?.mode) return entry.storage.mode;
  return 'plain';
}

function entryLogicalStorageMode(entry) {
  if (entry?.storage?.logicalMode) return entry.storage.logicalMode;
  if (entry?.storage?.protection === 'plain-current-object') return 'plain';
  if (entry?.storage?.protection === 'protected-owner-unlock') return 'encrypted';
  if (entry?.storage?.mode === 'plain' || entry?.storage?.mode === 'encrypted') return entry.storage.mode;
  return entry?.encryption || entry?.pack?.objectKey ? 'encrypted' : 'plain';
}

function entryIsEncrypted(entry) {
  return entryStorageMode(entry) !== 'plain';
}

function latestFullBaseArtifact() {
  const latest = readJson(path.join(defaultRepoRoot, '.skyevault-out', 'autosync', 'latest-full-repo-success.json'), null);
  const summaries = latest?.fullRun?.childSummaries || [];
  const artifact = summaries.find((item) => item.receiptId && Number(item.artifactBytes || 0) > 0)
    || summaries.find((item) => item.receiptId);
  if (!artifact?.receiptId) return null;
  return {
    schema: 'skyevault.living-repo-mirror.base-artifact.v1',
    adoptedAt: new Date().toISOString(),
    recordedAt: latest.recordedAt || latest.autosyncCompletedAt || '',
    digest: latest.state?.digest || '',
    receiptId: artifact.receiptId || '',
    fileName: artifact.fileName || '',
    bytes: artifact.artifactBytes || null,
    sha256: artifact.artifactSha256 || '',
    controlReceiptId: summaries.find((item) => item.controlReceiptId)?.controlReceiptId || ''
  };
}

function fullCurrentIndexMode() {
  return flag('--force-full-index') || flag('--full-current-index') || !flag('--adopt-existing-base');
}

function canAdoptExistingBase() {
  return flag('--adopt-existing-base')
    && !flag('--force-full-index')
    && !flag('--full-current-index')
    && path.resolve(repoRoot) === path.resolve(defaultRepoRoot);
}

function scanOverlayCandidates(cutoffMs = 0) {
  const paths = new Map();
  const skipped = [];
  for (const line of gitLines(['status', '--porcelain=v1', '--branch', '--untracked-files=all'])) {
    if (line.startsWith('##')) continue;
    const deleted = line.slice(0, 2).includes('D');
    for (const itemPath of statusLinePaths(line)) paths.set(itemPath, { path: itemPath, deleted, reason: 'git-status' });
  }
  const stack = [''];
  while (stack.length) {
    const relativeDir = stack.pop();
    const dir = path.join(repoRoot, relativeDir);
    let children = [];
    try {
      children = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const child of children) {
      const itemPath = [relativeDir, child.name].filter(Boolean).join('/').replace(/\\/g, '/');
      if (shouldSkipDir(itemPath)) continue;
      const abs = path.join(repoRoot, itemPath);
      let stat = null;
      try {
        stat = fs.lstatSync(abs);
      } catch {
        continue;
      }
      if (stat.isDirectory()) {
        stack.push(itemPath);
        continue;
      }
      if (Number(stat.mtimeMs || 0) > cutoffMs + 5000) paths.set(itemPath, { path: itemPath, deleted: false, reason: 'mtime-after-base' });
    }
  }
  const entries = [];
  for (const item of [...paths.values()].sort((a, b) => a.path.localeCompare(b.path))) {
    if (shouldSkipDir(item.path)) continue;
    const abs = path.join(repoRoot, item.path);
    let stat = null;
    try {
      stat = fs.lstatSync(abs);
    } catch {
      entries.push({ path: item.path, type: 'tombstone', deleted: true, reason: item.reason });
      continue;
    }
    if (item.deleted || !fs.existsSync(abs)) {
      entries.push({ path: item.path, type: 'tombstone', deleted: true, reason: item.reason });
    } else if (stat.isSymbolicLink()) {
      entries.push({ path: item.path, type: 'symlink', mode: stat.mode & 0o777, mtimeMs: Math.floor(stat.mtimeMs), linkTarget: fs.readlinkSync(abs), reason: item.reason });
    } else if (stat.isFile()) {
      entries.push({ path: item.path, type: 'file', abs, mode: stat.mode & 0o777, mtimeMs: Math.floor(stat.mtimeMs), bytes: stat.size, reason: item.reason });
    } else {
      skipped.push({ path: item.path, reason: 'not file or symlink' });
    }
  }
  return { entries, skipped };
}

function manifestDigest(entries, baseArtifact = null) {
  const hash = createManifestDigest(baseArtifact);
  for (const entry of entries) {
    updateManifestDigest(hash, entry);
  }
  return hash.digest('hex');
}

function createManifestDigest(baseArtifact = null) {
  const hash = crypto.createHash('sha256');
  hash.update(JSON.stringify({
    base: baseArtifact ? {
      digest: baseArtifact.digest || '',
      receiptId: baseArtifact.receiptId || '',
      sha256: baseArtifact.sha256 || '',
      bytes: baseArtifact.bytes || 0
    } : null
  }));
  hash.update('\n');
  return hash;
}

function updateManifestDigest(hash, entry) {
  hash.update(JSON.stringify({
    path: entry.path,
    type: entry.type,
    bytes: entry.bytes || 0,
    sha256: entry.sha256 || '',
    mode: entry.mode || 0,
    linkTarget: entry.linkTarget || '',
    deleted: Boolean(entry.deleted)
  }));
  hash.update('\n');
}

function safePublicManifest(manifest) {
  return {
    schema: 'skyevault.living-repo-mirror.public-manifest.v1',
    generatedAt: manifest.generatedAt,
    repo: manifest.repo,
    workspaceId: manifest.workspaceId,
    repoId: manifest.repoId,
    digest: manifest.digest,
    mode: manifest.mode || '',
    baseArtifact: manifest.baseArtifact ? {
      receiptId: manifest.baseArtifact.receiptId || '',
      recordedAt: manifest.baseArtifact.recordedAt || '',
      bytes: manifest.baseArtifact.bytes || null,
      sha256: manifest.baseArtifact.sha256 || ''
    } : null,
    entryCount: manifest.entryCount,
    fileCount: manifest.fileCount,
    plainFileCount: manifest.plainFileCount || 0,
    protectedFileCount: manifest.protectedFileCount || 0,
    plainBytes: manifest.plainBytes || 0,
    protectedBytes: manifest.protectedBytes || 0,
    directoryCount: manifest.directoryCount,
    symlinkCount: manifest.symlinkCount,
    totalBytes: manifest.totalBytes,
    storageModel: manifest.storageModel || '',
    unlockRequired: Boolean(manifest.unlockRequired),
    entryStorage: manifest.entryStorage ? {
      kind: manifest.entryStorage.kind || '',
      shardCount: manifest.entryStorage.shardCount || 0,
      encrypted: Boolean(manifest.entryStorage.encrypted)
    } : null,
    remotePrefix: manifest.remote?.prefix || '',
    encrypted: manifest.encrypted || 'selective-protected-files',
    ownerScope: manifest.ownerScope
  };
}

function safePublicReceipt(receipt) {
  return {
    schema: 'skyevault.living-repo-mirror.public-receipt.v1',
    completedAt: receipt.completedAt,
    action: receipt.action,
    ok: receipt.ok,
    repo: path.basename(receipt.repoRoot || repoRoot),
    workspaceId: receipt.workspaceId,
    repoId: receipt.repoId,
    digest: receipt.digest,
    previousDigest: receipt.previousDigest,
    changedCount: receipt.changedCount,
    removedCount: receipt.removedCount,
    unchangedCount: receipt.unchangedCount,
    entryCount: receipt.entryCount,
    fileCount: receipt.fileCount,
    plainFileCount: receipt.plainFileCount || 0,
    protectedFileCount: receipt.protectedFileCount || 0,
    plainBytes: receipt.plainBytes || 0,
    protectedBytes: receipt.protectedBytes || 0,
    totalBytes: receipt.totalBytes,
    upload: {
      requested: Boolean(receipt.upload?.requested),
      uploaded: Number(receipt.upload?.uploaded || 0),
      deleted: Number(receipt.upload?.deleted || 0),
      failed: Number(receipt.upload?.failed || 0),
      packObjects: Number(receipt.upload?.packObjects || 0),
      entryShardObjects: Number(receipt.upload?.entryShardObjects || 0),
      bytesUploaded: Number(receipt.upload?.bytesUploaded || 0),
      requestedConcurrency: Number(receipt.upload?.requestedConcurrency || 0),
      effectiveConcurrency: Number(receipt.upload?.effectiveConcurrency || 0)
    },
    uploadMode: receipt.uploadMode,
    remoteRequired: receipt.remoteRequired,
    remotePrefix: receipt.remotePrefix,
    model: receipt.model,
    localDiskRole: receipt.localDiskRole,
    cloudCommit: receipt.cloudCommit || null
  };
}

function r2Env(name, fallback = '') {
  return String(process.env[name] || fallback).trim();
}

function r2AccountId() {
  const value = r2Env('R2_ACCOUNT_ID') || r2Env('CLOUDFLARE_R2_ACCOUNT_ID') || r2Env('CLOUDFLARE_ACCOUNT_ID') || r2Env('cloudflare_account_ID');
  if (!value) throw new Error('R2_ACCOUNT_ID is not configured.');
  return value;
}

function r2AccessKeyId() {
  const value = r2Env('R2_ACCESS_KEY_ID') || r2Env('CLOUDFLARE_R2_ACCESS_KEY') || r2Env('S3_ACCESS_KEY');
  if (!value) throw new Error('R2_ACCESS_KEY_ID is not configured.');
  return value;
}

function r2SecretAccessKey() {
  const value = r2Env('R2_SECRET_ACCESS_KEY') || r2Env('CLOUDFLARE_R2_SECRET_KEY') || r2Env('S3_SECRET_KEY');
  if (!value) throw new Error('R2_SECRET_ACCESS_KEY is not configured.');
  return value;
}

function r2Bucket() {
  return r2Env('R2_BUCKET') || r2Env('S3_BUCKET') || 'client-drop-vault';
}

function r2Endpoint() {
  return r2Env('R2_ENDPOINT') || `https://${r2AccountId()}.r2.cloudflarestorage.com`;
}

function isoBasic(date = new Date()) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function dateStamp(amzDate) {
  return amzDate.slice(0, 8);
}

function hmac(key, value, encoding) {
  return crypto.createHmac('sha256', key).update(value).digest(encoding);
}

function signingKey(amzDate) {
  const kDate = hmac(`AWS4${r2SecretAccessKey()}`, dateStamp(amzDate));
  const kRegion = hmac(kDate, 'auto');
  const kService = hmac(kRegion, 's3');
  return hmac(kService, 'aws4_request');
}

function encodePathSegment(segment) {
  return encodeURIComponent(segment).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function canonicalKeyPath(key) {
  return String(key || '').split('/').map(encodePathSegment).join('/');
}

function canonicalQuery(params) {
  return [...params.entries()]
    .sort(([aKey, aValue], [bKey, bValue]) => {
      const left = encodePathSegment(aKey);
      const right = encodePathSegment(bKey);
      if (left !== right) return left < right ? -1 : 1;
      const leftValue = encodePathSegment(aValue);
      const rightValue = encodePathSegment(bValue);
      return leftValue === rightValue ? 0 : leftValue < rightValue ? -1 : 1;
    })
    .map(([key, value]) => `${encodePathSegment(key)}=${encodePathSegment(value)}`)
    .join('&');
}

function signedHeaders(headers) {
  const clean = Object.entries(headers)
    .map(([key, value]) => [key.toLowerCase().trim(), String(value).trim()])
    .sort(([a], [b]) => a.localeCompare(b));
  return {
    canonical: clean.map(([key, value]) => `${key}:${value}\n`).join(''),
    names: clean.map(([key]) => key).join(';')
  };
}

function r2Url(key = '', query = new URLSearchParams()) {
  const base = r2Endpoint().replace(/\/+$/g, '');
  const qs = canonicalQuery(query);
  return `${base}/${r2Bucket()}${key ? `/${canonicalKeyPath(key)}` : ''}${qs ? `?${qs}` : ''}`;
}

function authHeaders(method, key, payloadHash, extraHeaders = {}, query = new URLSearchParams()) {
  const amzDate = isoBasic();
  const scope = `${dateStamp(amzDate)}/auto/s3/aws4_request`;
  const host = new URL(r2Endpoint()).host;
  const headers = {
    host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
    ...extraHeaders
  };
  const signed = signedHeaders(headers);
  const canonicalRequest = [
    method,
    `/${r2Bucket()}${key ? `/${canonicalKeyPath(key)}` : ''}`,
    canonicalQuery(query),
    signed.canonical,
    signed.names,
    payloadHash
  ].join('\n');
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256Text(canonicalRequest)].join('\n');
  const signature = hmac(signingKey(amzDate), stringToSign, 'hex');
  return {
    ...headers,
    authorization: `AWS4-HMAC-SHA256 Credential=${r2AccessKeyId()}/${scope}, SignedHeaders=${signed.names}, Signature=${signature}`
  };
}

function metadataHeaders(metadata = {}) {
  const headers = {};
  for (const [rawKey, rawValue] of Object.entries(metadata)) {
    const key = String(rawKey).toLowerCase().replace(/[^a-z0-9_.-]+/g, '-').replace(/^-+|-+$/g, '');
    if (key) headers[`x-amz-meta-${key}`] = String(rawValue || '').slice(0, 900);
  }
  return headers;
}

function xmlEscape(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function parseXmlValue(xml, tag) {
  const match = String(xml || '').match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return match
    ? match[1]
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&gt;/g, '>')
      .replace(/&lt;/g, '<')
      .replace(/&amp;/g, '&')
    : '';
}

function parseXmlValues(xml, tag) {
  const values = [];
  const pattern = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g');
  let match = null;
  while ((match = pattern.exec(String(xml || '')))) {
    values.push(match[1]
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&gt;/g, '>')
      .replace(/&lt;/g, '<')
      .replace(/&amp;/g, '&'));
  }
  return values;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchRetryOnThrow(label, url, options = {}) {
  const retries = uploadRetries();
  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fetch(url, options);
    } catch (error) {
      lastError = error;
      if (attempt === retries) break;
      await sleep(750 * 2 ** attempt);
    }
  }
  throw new Error(`${label} failed before HTTP response: ${lastError?.message || 'fetch failed'}`);
}

async function drainResponse(response) {
  if (!response) return;
  try {
    if (typeof response.arrayBuffer === 'function') await response.arrayBuffer();
    else if (response.body?.cancel) await response.body.cancel();
  } catch {}
}

function uploadRetries() {
  const value = Number.parseInt(process.env.SKYEVAULT_LIVING_MIRROR_UPLOAD_RETRIES || process.env.SKYEVAULT_UPLOAD_RETRIES || '3', 10);
  return Number.isFinite(value) && value >= 0 ? value : 3;
}

function fileUploadAttempts() {
  const value = Number.parseInt(argValue('--file-upload-attempts', process.env.SKYEVAULT_LIVING_MIRROR_FILE_UPLOAD_ATTEMPTS || '5'), 10);
  return Number.isFinite(value) && value >= 1 ? value : 5;
}

function readAttempts() {
  const value = Number.parseInt(argValue('--read-attempts', process.env.SKYEVAULT_LIVING_MIRROR_READ_ATTEMPTS || '8'), 10);
  return Number.isFinite(value) && value >= 1 ? value : 8;
}

function readWindowBytes() {
  const mb = Number(argValue('--read-window-mb', process.env.SKYEVAULT_LIVING_MIRROR_READ_WINDOW_MB || '32'));
  const clamped = Math.min(256, Math.max(5, Number.isFinite(mb) ? mb : 32));
  return Math.floor(clamped * 1024 * 1024);
}

function streamChunkBytes() {
  const mb = Number(argValue('--stream-chunk-mb', process.env.SKYEVAULT_LIVING_MIRROR_STREAM_CHUNK_MB || '16'));
  const clamped = Math.min(512, Math.max(5, Number.isFinite(mb) ? mb : 16));
  return Math.floor(clamped * 1024 * 1024);
}

function singlePutMaxBytes() {
  const mb = Number(argValue('--single-put-mb', process.env.SKYEVAULT_LIVING_MIRROR_SINGLE_PUT_MB || '8'));
  const clamped = Math.min(64, Math.max(1, Number.isFinite(mb) ? mb : 8));
  return Math.floor(clamped * 1024 * 1024);
}

function maxInflightUploadBytes() {
  const mb = Number(argValue('--max-inflight-upload-mb', process.env.SKYEVAULT_LIVING_MIRROR_MAX_INFLIGHT_UPLOAD_MB || '256'));
  const clamped = Math.max(16, Number.isFinite(mb) ? mb : 256);
  return Math.floor(clamped * 1024 * 1024);
}

function effectiveUploadConcurrency(requested) {
  const requestedCount = Math.max(1, Number(requested || 1));
  if (flag('--allow-high-memory-upload')) return requestedCount;
  const largestBuffer = Math.max(streamChunkBytes(), singlePutMaxBytes(), 1);
  const cap = Math.max(1, Math.floor(maxInflightUploadBytes() / largestBuffer));
  const effective = Math.min(requestedCount, cap);
  if (effective < requestedCount) {
    process.stderr.write(`[living-mirror] capped upload concurrency ${requestedCount} -> ${effective} to keep in-flight buffers under ${Math.floor(maxInflightUploadBytes() / 1024 / 1024)} MB; pass --allow-high-memory-upload to override.\n`);
  }
  return effective;
}

function packFileMaxBytes() {
  const mb = Number(argValue('--pack-file-max-mb', process.env.SKYEVAULT_LIVING_MIRROR_PACK_FILE_MAX_MB || '5120'));
  const clamped = Math.min(51200, Math.max(0.125, Number.isFinite(mb) ? mb : 5120));
  return Math.floor(clamped * 1024 * 1024);
}

function packObjectMaxBytes() {
  const mb = Number(argValue('--pack-object-mb', process.env.SKYEVAULT_LIVING_MIRROR_PACK_OBJECT_MB || '51200'));
  const maxMultipartMb = 5 * 1024 * 1024;
  const clamped = Math.min(maxMultipartMb, Math.max(8, Number.isFinite(mb) ? mb : 51200));
  return Math.floor(clamped * 1024 * 1024);
}

function gzipLevel() {
  const value = Number.parseInt(argValue('--gzip-level', process.env.SKYEVAULT_LIVING_MIRROR_GZIP_LEVEL || '6'), 10);
  return Number.isFinite(value) ? Math.min(9, Math.max(0, value)) : 6;
}

async function r2PutBuffer(key, body, { contentType = 'application/octet-stream', metadata = {} } = {}) {
  const payload = Buffer.isBuffer(body) ? body : Buffer.from(String(body || ''));
  const headers = authHeaders('PUT', key, crypto.createHash('sha256').update(payload).digest('hex'), {
    'content-type': contentType,
    'content-length': String(payload.byteLength),
    ...metadataHeaders(metadata)
  });
  const response = await fetchRetryOnThrow(`R2 PUT ${key}`, r2Url(key), { method: 'PUT', headers, body: payload });
  if (!response.ok) throw new Error(`R2 PUT ${key} failed ${response.status}: ${(await response.text()).slice(0, 300)}`);
  const etag = (response.headers.get('etag') || '').replace(/^"|"$/g, '');
  await drainResponse(response);
  return { key, size: payload.byteLength, etag };
}

async function r2CreateMultipartUpload(key, { contentType = 'application/octet-stream', metadata = {} } = {}) {
  const query = new URLSearchParams({ uploads: '' });
  const headers = authHeaders('POST', key, sha256Text(''), {
    'content-type': contentType,
    ...metadataHeaders(metadata)
  }, query);
  const response = await fetchRetryOnThrow(`R2 multipart create ${key}`, r2Url(key, query), { method: 'POST', headers });
  const text = await response.text().catch(() => '');
  if (!response.ok) throw new Error(`R2 multipart create ${key} failed ${response.status}: ${text.slice(0, 300)}`);
  const uploadId = parseXmlValue(text, 'UploadId');
  if (!uploadId) throw new Error(`R2 multipart create ${key} did not return an UploadId.`);
  return { key, uploadId };
}

function r2PresignUrl(method, key, { query = new URLSearchParams(), expires = null } = {}) {
  const amzDate = isoBasic();
  const scope = `${dateStamp(amzDate)}/auto/s3/aws4_request`;
  const host = new URL(r2Endpoint()).host;
  const params = new URLSearchParams(query);
  params.set('X-Amz-Algorithm', 'AWS4-HMAC-SHA256');
  params.set('X-Amz-Credential', `${r2AccessKeyId()}/${scope}`);
  params.set('X-Amz-Date', amzDate);
  params.set('X-Amz-Expires', String(Math.min(604800, Math.max(60, Number(expires || process.env.R2_PRESIGNED_URL_TTL_SECONDS || 6 * 60 * 60)))));
  params.set('X-Amz-SignedHeaders', 'host');
  const canonicalRequest = [
    method,
    `/${r2Bucket()}/${canonicalKeyPath(key)}`,
    canonicalQuery(params),
    `host:${host}\n`,
    'host',
    'UNSIGNED-PAYLOAD'
  ].join('\n');
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256Text(canonicalRequest)].join('\n');
  params.set('X-Amz-Signature', hmac(signingKey(amzDate), stringToSign, 'hex'));
  return r2Url(key, params);
}

async function r2PutPart(uploadUrl, body, label) {
  const retries = uploadRetries();
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const response = await fetch(uploadUrl, { method: 'PUT', body })
      .catch((error) => ({ ok: false, status: 0, headers: new Headers(), text: async () => error.message }));
    const text = response.ok ? '' : await response.text().catch(() => '');
    if (response.ok) {
      const etag = (response.headers.get('etag') || response.headers.get('ETag') || '').replace(/^"|"$/g, '');
      await drainResponse(response);
      return etag;
    }
    if (attempt === retries || ![0, 408, 429, 500, 502, 503, 504].includes(response.status)) {
      throw new Error(`${label} failed ${response.status}: ${text.slice(0, 500)}`);
    }
    await sleep(750 * 2 ** attempt);
  }
  throw new Error(`${label} failed.`);
}

async function r2CompleteMultipartUpload(key, uploadId, parts = []) {
  const cleanParts = parts
    .map((part) => ({
      partNumber: Number(part.partNumber),
      eTag: String(part.eTag || '').trim()
    }))
    .filter((part) => Number.isFinite(part.partNumber) && part.eTag)
    .sort((a, b) => a.partNumber - b.partNumber);
  if (!cleanParts.length) throw new Error(`R2 multipart complete ${key} has no uploaded parts.`);
  const body = [
    '<CompleteMultipartUpload>',
    ...cleanParts.map((part) => `<Part><PartNumber>${part.partNumber}</PartNumber><ETag>${xmlEscape(part.eTag)}</ETag></Part>`),
    '</CompleteMultipartUpload>'
  ].join('');
  const query = new URLSearchParams({ uploadId });
  const payload = Buffer.from(body);
  const headers = authHeaders('POST', key, crypto.createHash('sha256').update(payload).digest('hex'), {
    'content-type': 'application/xml',
    'content-length': String(payload.length)
  }, query);
  const response = await fetchRetryOnThrow(`R2 multipart complete ${key}`, r2Url(key, query), { method: 'POST', headers, body: payload });
  const text = await response.text().catch(() => '');
  if (!response.ok) throw new Error(`R2 multipart complete ${key} failed ${response.status}: ${text.slice(0, 300)}`);
  return {
    key,
    uploadId,
    etag: parseXmlValue(text, 'ETag').replace(/^"|"$/g, ''),
    location: parseXmlValue(text, 'Location')
  };
}

async function r2AbortMultipartUpload(key, uploadId) {
  if (!uploadId) return { key, aborted: false };
  const query = new URLSearchParams({ uploadId });
  const headers = authHeaders('DELETE', key, sha256Text(''), {}, query);
  const response = await fetch(r2Url(key, query), { method: 'DELETE', headers });
  if (response.status === 404) return { key, uploadId, aborted: false, missing: true };
  if (!response.ok) throw new Error(`R2 multipart abort ${key} failed ${response.status}: ${(await response.text()).slice(0, 300)}`);
  await drainResponse(response);
  return { key, uploadId, aborted: true };
}

async function r2UploadStreamSmart(key, stream, { contentType = 'application/octet-stream', metadata = {} } = {}) {
  const hash = crypto.createHash('sha256');
  const partSize = streamChunkBytes();
  const singleMax = singlePutMaxBytes();
  const pendingChunks = [];
  let pendingBytes = 0;
  let totalBytes = 0;
  let uploadId = '';
  let partNumber = 1;
  const parts = [];

  function pushPending(chunk) {
    if (!chunk.length) return;
    pendingChunks.push(chunk);
    pendingBytes += chunk.length;
  }

  function takePending(size) {
    const out = Buffer.allocUnsafe(size);
    let offset = 0;
    while (offset < size) {
      const chunk = pendingChunks[0];
      const need = size - offset;
      if (chunk.length <= need) {
        chunk.copy(out, offset);
        offset += chunk.length;
        pendingChunks.shift();
      } else {
        chunk.copy(out, offset, 0, need);
        pendingChunks[0] = chunk.subarray(need);
        offset += need;
      }
    }
    pendingBytes -= size;
    return out;
  }

  async function ensureMultipart() {
    if (uploadId) return;
    const session = await r2CreateMultipartUpload(key, { contentType, metadata });
    uploadId = session.uploadId;
  }

  async function uploadPendingPart(size) {
    await ensureMultipart();
    if (partNumber > 10000) throw new Error(`R2 multipart upload exceeded 10000 parts for ${key}. Increase --stream-chunk-mb.`);
    const body = takePending(size);
    const uploadUrl = r2PresignUrl('PUT', key, {
      query: new URLSearchParams({ partNumber: String(partNumber), uploadId })
    });
    const eTag = await r2PutPart(uploadUrl, body, `R2 part ${partNumber} for ${key}`);
    parts.push({ partNumber, eTag });
    partNumber += 1;
  }

  try {
    for await (const raw of stream) {
      const chunk = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
      hash.update(chunk);
      totalBytes += chunk.length;
      pushPending(chunk);
      if (!uploadId && pendingBytes > singleMax) await ensureMultipart();
      while (uploadId && pendingBytes >= partSize) await uploadPendingPart(partSize);
    }
    const encryptedSha256 = hash.digest('hex');
    if (!uploadId) {
      const body = takePending(pendingBytes);
      const put = await r2PutBuffer(key, body, {
        contentType,
        metadata: {
          ...metadata,
          encrypted_sha256: encryptedSha256,
          upload_mode: metadata.upload_mode || 'direct-encrypted-cloud-single-put'
        }
      });
      return { key, size: totalBytes, sha256: encryptedSha256, etag: put.etag, mode: 'direct-encrypted-cloud-single-put' };
    }
    if (pendingBytes > 0) await uploadPendingPart(pendingBytes);
    const completed = await r2CompleteMultipartUpload(key, uploadId, parts);
    return {
      key,
      size: totalBytes,
      sha256: encryptedSha256,
      etag: completed.etag,
      mode: 'direct-encrypted-cloud-multipart',
      uploadId,
      parts: parts.length
    };
  } catch (error) {
    if (uploadId) {
      try { await r2AbortMultipartUpload(key, uploadId); } catch {}
    }
    throw error;
  }
}

async function r2PutFile(key, file, { contentType = 'application/octet-stream', metadata = {} } = {}) {
  const stat = fs.statSync(file);
  const payloadHash = await sha256File(file);
  const headers = authHeaders('PUT', key, payloadHash, {
    'content-type': contentType,
    'content-length': String(stat.size),
    ...metadataHeaders(metadata)
  });
  const response = await fetchRetryOnThrow(`R2 PUT ${key}`, r2Url(key), {
    method: 'PUT',
    headers,
    body: fs.createReadStream(file),
    duplex: 'half'
  });
  if (!response.ok) throw new Error(`R2 PUT ${key} failed ${response.status}: ${(await response.text()).slice(0, 300)}`);
  const etag = (response.headers.get('etag') || '').replace(/^"|"$/g, '');
  await drainResponse(response);
  return { key, size: stat.size, sha256: payloadHash, etag };
}

async function r2GetStream(key) {
  const headers = authHeaders('GET', key, sha256Text(''));
  const response = await fetch(r2Url(key), { method: 'GET', headers });
  if (!response.ok) throw new Error(`R2 GET ${key} failed ${response.status}: ${(await response.text()).slice(0, 300)}`);
  return Readable.fromWeb(response.body);
}

async function streamToBuffer(stream) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of stream) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    chunks.push(buffer);
    bytes += buffer.length;
  }
  return Buffer.concat(chunks, bytes);
}

async function r2GetBuffer(key) {
  return await streamToBuffer(await r2GetStream(key));
}

async function r2GetRangeStream(key, offset, length) {
  return Readable.from(r2RangeRetryBytes(key, offset, length));
}

async function r2OpenRangeStream(key, offset, length) {
  const size = Number(length || 0);
  if (size <= 0) return Readable.from([]);
  const start = Math.max(0, Number(offset || 0));
  const end = start + size - 1;
  const headers = authHeaders('GET', key, sha256Text(''), {
    range: `bytes=${start}-${end}`
  });
  const response = await fetchRetryOnThrow(`R2 range GET ${key}`, r2Url(key), { method: 'GET', headers });
  if (![200, 206].includes(response.status)) throw new Error(`R2 range GET ${key} failed ${response.status}: ${(await response.text()).slice(0, 300)}`);
  return Readable.fromWeb(response.body);
}

async function* r2RangeRetryBytes(key, offset, length, options = {}) {
  const allowShort = Boolean(options.allowShort);
  const label = options.label || `R2 range GET ${key}`;
  let position = Math.max(0, Number(offset || 0));
  let remaining = Number(length || 0);
  const maxAttempts = readAttempts();
  while (remaining > 0) {
    const targetBytes = Math.min(remaining, readWindowBytes());
    let windowRemaining = targetBytes;
    let attempt = 1;
    while (windowRemaining > 0) {
      let producedThisAttempt = 0;
      try {
        const stream = await r2OpenRangeStream(key, position, windowRemaining);
        for await (const raw of stream) {
          const chunk = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
          if (!chunk.length) continue;
          producedThisAttempt += chunk.length;
          position += chunk.length;
          remaining -= chunk.length;
          windowRemaining -= chunk.length;
          yield chunk;
        }
        if (windowRemaining <= 0) break;
        if (allowShort && producedThisAttempt > 0) return;
        throw new Error(`${label} ended ${windowRemaining} bytes early`);
      } catch (error) {
        if (allowShort && producedThisAttempt > 0) return;
        if (attempt >= maxAttempts) throw error;
        process.stderr.write(`[living-mirror] R2 read retry ${attempt + 1}/${maxAttempts} for ${key} at byte ${position}: ${error.message}\n`);
        await sleep(Math.min(15000, 750 * 2 ** (attempt - 1)));
        attempt += 1;
      }
    }
  }
}

async function r2GetToFile(key, file) {
  const headers = authHeaders('GET', key, sha256Text(''));
  const response = await fetch(r2Url(key), { method: 'GET', headers });
  if (!response.ok) throw new Error(`R2 GET ${key} failed ${response.status}: ${(await response.text()).slice(0, 300)}`);
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(file, { mode: 0o600 }));
  return { key, file, bytes: fs.statSync(file).size };
}

async function r2Delete(key) {
  const headers = authHeaders('DELETE', key, sha256Text(''));
  const response = await fetch(r2Url(key), { method: 'DELETE', headers });
  if (response.status === 404) return { key, deleted: false, missing: true };
  if (!response.ok) throw new Error(`R2 DELETE ${key} failed ${response.status}: ${(await response.text()).slice(0, 300)}`);
  await drainResponse(response);
  return { key, deleted: true, missing: false };
}

async function r2DeleteBatch(keys) {
  if (!keys.length) return { deleted: 0, errors: [] };
  const body = Buffer.from(`<Delete xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Quiet>true</Quiet>${keys.map((key) => `<Object><Key>${xmlEscape(key)}</Key></Object>`).join('')}</Delete>`);
  const query = new URLSearchParams({ delete: '' });
  const headers = authHeaders('POST', '', crypto.createHash('sha256').update(body).digest('hex'), {
    'content-type': 'application/xml',
    'content-length': String(body.byteLength)
  }, query);
  const response = await fetchRetryOnThrow(`R2 DELETE batch ${keys.length}`, r2Url('', query), {
    method: 'POST',
    headers,
    body
  });
  const text = await response.text().catch(() => '');
  if (!response.ok) throw new Error(`R2 batch delete failed ${response.status}: ${text.slice(0, 500)}`);
  const errors = [...String(text || '').matchAll(/<Error>[\s\S]*?<Key>([\s\S]*?)<\/Key>[\s\S]*?<Message>([\s\S]*?)<\/Message>[\s\S]*?<\/Error>/g)]
    .map((match) => ({
      key: match[1]
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&gt;/g, '>')
        .replace(/&lt;/g, '<')
        .replace(/&amp;/g, '&'),
      error: match[2]
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&gt;/g, '>')
        .replace(/&lt;/g, '<')
        .replace(/&amp;/g, '&')
    }));
  return { deleted: keys.length - errors.length, errors };
}

async function r2ListKeys(prefix, { maxKeys = 1000 } = {}) {
  const keys = [];
  let token = '';
  do {
    const query = new URLSearchParams({
      'list-type': '2',
      prefix,
      'max-keys': String(Math.min(1000, Math.max(1, Number(maxKeys || 1000))))
    });
    if (token) query.set('continuation-token', token);
    const headers = authHeaders('GET', '', sha256Text(''), {}, query);
    const response = await fetchRetryOnThrow(`R2 LIST ${prefix}`, r2Url('', query), { method: 'GET', headers });
    const text = await response.text().catch(() => '');
    if (!response.ok) throw new Error(`R2 LIST ${prefix} failed ${response.status}: ${text.slice(0, 300)}`);
    keys.push(...parseXmlValues(text, 'Key'));
    token = parseXmlValue(text, 'NextContinuationToken');
  } while (token);
  return keys;
}

async function deleteKeys(keys, concurrency = 16) {
  if (!flag('--no-batch-delete')) return await deleteKeysBatch(keys, concurrency);
  let deleted = 0;
  let missing = 0;
  const failures = [];
  let next = 0;
  async function worker() {
    while (next < keys.length) {
      const key = keys[next];
      next += 1;
      try {
        const result = await r2Delete(key);
        if (result.deleted) deleted += 1;
        else if (result.missing) missing += 1;
      } catch (error) {
        if (failures.length < 50) failures.push({ key, error: error.message });
      }
      if ((deleted + missing + failures.length) % 500 === 0) {
        process.stderr.write(`[living-mirror] cleanup progress deleted=${deleted} missing=${missing} failures=${failures.length}/${keys.length}\n`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, keys.length || 1) }, () => worker()));
  return { deleted, missing, failures };
}

async function deleteKeysBatch(keys, concurrency = 8) {
  let deleted = 0;
  let missing = 0;
  const failures = [];
  const chunks = [];
  for (let index = 0; index < keys.length; index += 1000) chunks.push(keys.slice(index, index + 1000));
  let next = 0;
  async function worker() {
    while (next < chunks.length) {
      const chunk = chunks[next];
      next += 1;
      try {
        const result = await r2DeleteBatch(chunk);
        deleted += result.deleted;
        for (const error of result.errors || []) {
          if (failures.length < 50) failures.push({ key: error.key, error: error.error || 'batch delete error' });
        }
      } catch (error) {
        for (const key of chunk.slice(0, Math.max(0, 50 - failures.length))) failures.push({ key, error: error.message });
      }
      if ((deleted + missing + failures.length) % 25000 < 1000 || next === chunks.length) {
        process.stderr.write(`[living-mirror] cleanup batch progress deleted=${deleted} missing=${missing} failures=${failures.length}/${keys.length}\n`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, chunks.length || 1) }, () => worker()));
  return { deleted, missing, failures };
}

function r2DownloadUrl(key, fileName, expires = 3600) {
  const amzDate = isoBasic();
  const scope = `${dateStamp(amzDate)}/auto/s3/aws4_request`;
  const host = new URL(r2Endpoint()).host;
  const params = new URLSearchParams({
    'response-content-disposition': `attachment; filename="${String(fileName || path.basename(key)).replace(/"/g, '')}"`,
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${r2AccessKeyId()}/${scope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(Math.min(604800, Math.max(60, Number(expires || 3600)))),
    'X-Amz-SignedHeaders': 'host'
  });
  const canonicalRequest = ['GET', `/${r2Bucket()}/${canonicalKeyPath(key)}`, canonicalQuery(params), `host:${host}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n');
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256Text(canonicalRequest)].join('\n');
  params.set('X-Amz-Signature', hmac(signingKey(amzDate), stringToSign, 'hex'));
  return r2Url(key, params);
}

function intValue(name, fallback, minimum = 1) {
  const value = Number.parseInt(argValue(name, process.env[`SKYEVAULT_LIVING_MIRROR_${name.replace(/^--/, '').toUpperCase().replace(/-/g, '_')}`] || String(fallback)), 10);
  return Number.isFinite(value) && value >= minimum ? value : fallback;
}

async function runPool(items, worker, concurrency) {
  const results = new Array(items.length);
  let next = 0;
  async function work() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => work()));
  return results;
}

async function runPoolNoResults(items, worker, concurrency) {
  let next = 0;
  async function work() {
    while (next < items.length) {
      const index = next;
      next += 1;
      const item = items[index];
      items[index] = null;
      await worker(item, index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => work()));
}

async function runPoolSource(source, worker, concurrency) {
  if (Array.isArray(source)) return await runPoolNoResults(source, worker, concurrency);
  const inFlight = new Set();
  for (const item of source) {
    const promise = Promise.resolve()
      .then(() => worker(item))
      .finally(() => inFlight.delete(promise));
    inFlight.add(promise);
    if (inFlight.size >= concurrency) await Promise.race(inFlight);
  }
  await Promise.all(inFlight);
}

async function uploadSmallFilePacks(packItems, masterKey, upload, entryWriter = null) {
  if (!packItems.length) return;
  const maxPackBytes = packObjectMaxBytes();
  let pack = [];
  let packPlainBytes = 0;
  let packIndex = 0;

  async function flushPack() {
    if (!pack.length) return;
    const current = pack;
    pack = [];
    packPlainBytes = 0;
    const packId = `${stamp()}-${String(packIndex).padStart(5, '0')}-${crypto.randomBytes(4).toString('hex')}`;
    packIndex += 1;
    const objectKey = currentPackRemoteKey(packId);
    try {
      const put = await r2UploadStreamSmart(objectKey, encryptedPackStream(current, masterKey, objectKey, packId), {
        contentType: 'application/vnd.skyevault.living-pack+encrypted',
        metadata: {
          schema: 'skyevault.living_repo_pack.v1',
          workspace_id: workspaceId,
          repo_id: repoName,
          pack_id: packId,
          file_count: String(current.length),
          owner_scope: 'owner-private',
          upload_mode: 'direct-encrypted-cloud-pack'
        }
      });
      upload.packObjects = Number(upload.packObjects || 0) + 1;
      upload.uploaded += current.length;
      upload.bytesUploaded += put.size;
      if (entryWriter) {
        for (const item of current) await entryWriter.add(item.entry);
      }
      process.stderr.write(`[living-mirror] uploaded pack ${upload.packObjects} (${current.length} files; ${put.size} bytes)\n`);
    } catch (error) {
      upload.failed += current.length;
      for (const item of current.slice(0, Math.max(0, 20 - upload.failures.length))) {
        upload.failures.push({ path: item.entry.path, error: `pack upload failed: ${error.message}` });
      }
      process.stderr.write(`[living-mirror] pack upload failed (${current.length} files): ${error.message}\n`);
    }
  }

  for (const item of packItems) {
    const nextBytes = Number(item.bytes || 0);
    if (pack.length && packPlainBytes + nextBytes > maxPackBytes) await flushPack();
    pack.push(item);
    packPlainBytes += nextBytes;
  }
  await flushPack();
}

async function* encryptedPackStream(items, masterKey, objectKey, packId) {
  let offset = 0;
  for (const item of items) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', masterKey, iv);
    const encryptedHash = crypto.createHash('sha256');
    let encryptedBytes = 0;
    for await (const raw of fs.createReadStream(item.abs)) {
      const chunk = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
      const encrypted = cipher.update(chunk);
      if (!encrypted.length) continue;
      encryptedHash.update(encrypted);
      encryptedBytes += encrypted.length;
      yield encrypted;
    }
    const final = cipher.final();
    if (final.length) {
      encryptedHash.update(final);
      encryptedBytes += final.length;
      yield final;
    }
    const authTag = cipher.getAuthTag();
    item.entry.bytes = Number(item.bytes || item.entry.bytes || 0);
    item.entry.localObjectRel = '';
    item.entry.remoteObjectKey = objectKey;
    item.entry.pack = {
      schema: 'skyevault.living-repo-mirror.pack-member.v1',
      objectKey,
      packId,
      offset,
      encryptedBytes
    };
    const priorStorage = item.entry.storage || {};
    const logicalMode = priorStorage.logicalMode
      || (priorStorage.protection === 'plain-current-object' ? 'plain' : '')
      || (priorStorage.protection === 'protected-owner-unlock' ? 'encrypted' : '')
      || priorStorage.mode
      || 'encrypted';
    item.entry.storage = {
      ...priorStorage,
      mode: logicalMode,
      logicalMode,
      physicalMode: 'encrypted-pack',
      encrypted: true,
      protection: priorStorage.protection || (logicalMode === 'plain' ? 'plain-current-object' : 'protected-owner-unlock'),
      objectRel: '',
      objectKey
    };
    item.entry.encryption = {
      algorithm: 'aes-256-gcm',
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      encryptedBytes,
      encryptedSha256: encryptedHash.digest('hex')
    };
    offset += encryptedBytes;
  }
}

class SmallPackUploader {
  constructor(masterKey, upload, entryWriter = null) {
    this.masterKey = masterKey;
    this.upload = upload;
    this.entryWriter = entryWriter;
    this.maxBytes = packObjectMaxBytes();
    this.items = [];
    this.bytes = 0;
    this.pending = Promise.resolve();
  }

  add(item) {
    this.pending = this.pending.then(async () => {
      const nextBytes = Number(item.bytes || 0);
      if (this.items.length && this.bytes + nextBytes > this.maxBytes) await this.flushNow();
      this.items.push(item);
      this.bytes += nextBytes;
      if (this.bytes >= this.maxBytes) await this.flushNow();
    });
    return this.pending;
  }

  flush() {
    this.pending = this.pending.then(() => this.flushNow());
    return this.pending;
  }

  async flushNow() {
    if (!this.items.length) return;
    const items = this.items;
    this.items = [];
    this.bytes = 0;
    await uploadSmallFilePacks(items, this.masterKey, this.upload, this.entryWriter);
  }
}

class ManifestEntryShardWriter {
  constructor(masterKey, baseArtifact, upload) {
    this.masterKey = masterKey;
    this.upload = upload;
    this.maxEntries = intValue('--manifest-shard-entries', 5000, 100);
    this.runId = `${stamp()}-${process.pid}-${crypto.randomBytes(4).toString('hex')}`;
    this.shardIndex = 0;
    this.lines = [];
    this.lineBytes = 0;
    this.shards = [];
    this.pending = Promise.resolve();
    this.digestHash = createManifestDigest(baseArtifact);
    this.entryCount = 0;
    this.fileCount = 0;
    this.plainFileCount = 0;
    this.protectedFileCount = 0;
    this.directoryCount = 0;
    this.symlinkCount = 0;
    this.totalBytes = 0;
    this.plainBytes = 0;
    this.protectedBytes = 0;
    this.failed = false;
  }

  async add(entry) {
    if (!entry) return;
    updateManifestDigest(this.digestHash, entry);
    this.entryCount += 1;
    if (entry.type === 'file') {
      this.fileCount += 1;
      if (entryIsEncrypted(entry)) {
        this.protectedFileCount += 1;
        this.protectedBytes += Number(entry.bytes || 0);
      } else {
        this.plainFileCount += 1;
        this.plainBytes += Number(entry.bytes || 0);
      }
    }
    else if (entry.type === 'directory') this.directoryCount += 1;
    else if (entry.type === 'symlink') this.symlinkCount += 1;
    this.totalBytes += Number(entry.bytes || 0);
    const line = `${JSON.stringify(entry)}\n`;
    this.lines.push(line);
    this.lineBytes += Buffer.byteLength(line);
    if (this.lines.length >= this.maxEntries) {
      const lines = this.lines;
      const lineBytes = this.lineBytes;
      this.lines = [];
      this.lineBytes = 0;
      await this.queueFlush(lines, lineBytes);
    }
  }

  async finalize() {
    if (this.lines.length) {
      const lines = this.lines;
      const lineBytes = this.lineBytes;
      this.lines = [];
      this.lineBytes = 0;
      await this.queueFlush(lines, lineBytes);
    }
    await this.pending;
    return {
      digest: this.digestHash.digest('hex'),
      entryCount: this.entryCount,
      fileCount: this.fileCount,
      plainFileCount: this.plainFileCount,
      protectedFileCount: this.protectedFileCount,
      directoryCount: this.directoryCount,
      symlinkCount: this.symlinkCount,
      totalBytes: this.totalBytes,
      plainBytes: this.plainBytes,
      protectedBytes: this.protectedBytes,
      shards: this.shards
    };
  }

  queueFlush(lines, lineBytes) {
    this.pending = this.pending.then(() => this.flushLines(lines, lineBytes));
    return this.pending;
  }

  async flushLines(lines, lineBytes) {
    if (!lines.length) return;
    const index = this.shardIndex;
    this.shardIndex += 1;
    const shardName = `entries-${this.runId}-${String(index).padStart(6, '0')}.jsonl`;
    const body = Buffer.from(lines.join(''));
    const plainSha256 = crypto.createHash('sha256').update(body).digest('hex');
    const descriptor = {
      schema: 'skyevault.living-repo-mirror.entry-shard.v1',
      index,
      name: shardName,
      entries: lines.length,
      bytes: lineBytes,
      sha256: plainSha256
    };
    if (uploadRequested) {
      const remoteKey = currentEntryShardRemoteKey(shardName);
      try {
        const encrypted = encryptBytesEnvelopeBuffer(body, this.masterKey, 'skyevault.living-repo-mirror.encrypted-entry-shard.v1');
        const put = await r2PutBuffer(remoteKey, encrypted, {
          contentType: 'application/vnd.skyevault.living-entry-shard+encrypted',
          metadata: {
            schema: 'skyevault.living_repo_entry_shard.v1',
            workspace_id: workspaceId,
            repo_id: repoName,
            shard_index: String(index),
            plain_sha256: plainSha256,
            owner_scope: 'owner-private'
          }
        });
        descriptor.remoteKey = remoteKey;
        descriptor.encrypted = true;
        descriptor.encryptedBytes = put.size;
        descriptor.encryptedSha256 = crypto.createHash('sha256').update(encrypted).digest('hex');
        this.upload.entryShardObjects = Number(this.upload.entryShardObjects || 0) + 1;
        this.upload.bytesUploaded += put.size;
      } catch (error) {
        this.failed = true;
        this.upload.failed += lines.length;
        if (this.upload.failures.length < 20) this.upload.failures.push({ path: shardName, error: `entry shard upload failed: ${error.message}` });
        process.stderr.write(`[living-mirror] entry shard upload failed (${shardName}; ${lines.length} entries): ${error.message}\n`);
      }
    } else {
      fs.mkdirSync(currentEntriesDir, { recursive: true, mode: 0o700 });
      const localPath = path.join(currentEntriesDir, shardName);
      fs.writeFileSync(localPath, body, { mode: 0o600 });
      descriptor.localRel = rel(localPath, mirrorRoot);
    }
    this.shards.push(descriptor);
  }
}

function entryShardLocalPath(shard) {
  if (!shard?.localRel) return '';
  return path.join(mirrorRoot, shard.localRel);
}

function* parseEntryShardLines(text) {
  for (const line of String(text || '').split(/\r?\n/)) {
    if (!line.trim()) continue;
    yield JSON.parse(line);
  }
}

async function* manifestEntries(manifest, masterKey = null) {
  if (Array.isArray(manifest?.entries)) {
    for (const entry of manifest.entries) yield entry;
    return;
  }
  for (const shard of manifest?.entryShards || []) {
    const localPath = entryShardLocalPath(shard);
    if (localPath && fs.existsSync(localPath)) {
      for (const entry of parseEntryShardLines(fs.readFileSync(localPath, 'utf8'))) yield entry;
      continue;
    }
    if (!shard.remoteKey) throw new Error(`Manifest entry shard is missing locally and has no remote key: ${shard.name || shard.index}`);
    const key = masterKey || loadMasterKey().key;
    const encrypted = await r2GetBuffer(shard.remoteKey);
    const plain = decryptBytesEnvelopeBuffer(encrypted, key);
    const plainSha256 = crypto.createHash('sha256').update(plain).digest('hex');
    if (shard.sha256 && plainSha256 !== shard.sha256) throw new Error(`Entry shard checksum mismatch for ${shard.name || shard.remoteKey}`);
    for (const entry of parseEntryShardLines(plain.toString('utf8'))) yield entry;
  }
}

async function loadManifestEntriesByPath(manifest, masterKey) {
  const map = new Map();
  for await (const entry of manifestEntries(manifest, masterKey)) {
    if (entry?.path) map.set(entry.path, entry);
  }
  return map;
}

async function cleanupStaleEntryShards(previous, current, upload) {
  const keepRemote = new Set((current?.entryShards || []).map((shard) => shard.remoteKey).filter(Boolean));
  const keepLocal = new Set((current?.entryShards || []).map((shard) => shard.localRel).filter(Boolean));
  for (const shard of previous?.entryShards || []) {
    if (shard.remoteKey && !keepRemote.has(shard.remoteKey) && uploadRequested) {
      try {
        await r2Delete(shard.remoteKey);
        upload.deleted += 1;
      } catch (error) {
        upload.failed += 1;
        if (upload.failures.length < 20) upload.failures.push({ path: shard.remoteKey, error: `stale entry shard delete failed: ${error.message}` });
      }
    }
    if (shard.localRel && !keepLocal.has(shard.localRel)) {
      try { fs.unlinkSync(path.join(mirrorRoot, shard.localRel)); } catch {}
    }
  }
}

async function syncMirror() {
  fs.mkdirSync(currentDir, { recursive: true, mode: 0o700 });
  fs.mkdirSync(receiptsDir, { recursive: true, mode: 0o700 });
  const tempCleanup = cleanupTempFiles();
  const startedAt = new Date().toISOString();
  const previous = readJson(currentManifestPath, null);
  const useFullCurrentIndex = fullCurrentIndexMode();
  const baseArtifact = canAdoptExistingBase() ? (previous?.baseArtifact || latestFullBaseArtifact()) : null;
  const cutoffMs = Date.parse(previous?.generatedAt || baseArtifact?.recordedAt || '') || 0;
  const previousIsFullCurrent = previous?.mode === 'full-current-index' && !previous?.baseArtifact;
  const master = loadMasterKey();
  const previousByPath = previousIsFullCurrent ? await loadManifestEntriesByPath(previous, master.key) : new Map();
  const streamingSkipped = [];
  const scan = !useFullCurrentIndex && baseArtifact
    ? scanOverlayCandidates(cutoffMs)
    : { entries: scanRepoEntries(streamingSkipped), skipped: streamingSkipped, streaming: true };
  const scanTotal = Array.isArray(scan.entries) ? scan.entries.length : null;
  const changed = [];
  let changedCount = 0;
  const unchanged = [];
  let unchangedCount = 0;
  const removed = [];
  let removedCount = 0;
  const receiptSampleLimit = intValue('--receipt-sample-limit', 1000, 1);
  const noteChanged = (item) => {
    changedCount += 1;
    if (changed.length < receiptSampleLimit) changed.push(item);
  };
  const noteUnchanged = (itemPath) => {
    unchangedCount += 1;
    if (unchanged.length < receiptSampleLimit) unchanged.push(itemPath);
  };
  const noteRemoved = (item) => {
    removedCount += 1;
    if (removed.length < receiptSampleLimit) removed.push(item);
  };
  const requestedConcurrency = intValue('--concurrency', 6, 1);
  const concurrency = effectiveUploadConcurrency(requestedConcurrency);
  const upload = { requested: uploadRequested, uploaded: 0, deleted: 0, skipped: 0, failed: 0, packObjects: 0, entryShardObjects: 0, bytesUploaded: 0, requestedConcurrency, effectiveConcurrency: concurrency, failures: [] };
  const ignoredPaths = gitIgnoredPathSet();
  const trackCurrentPaths = previousIsFullCurrent && previousByPath.size > 0;
  const currentPaths = trackCurrentPaths ? new Set() : null;
  const entryWriter = new ManifestEntryShardWriter(master.key, baseArtifact, upload);
  const packUploader = new SmallPackUploader(master.key, upload, entryWriter);
  let processed = 0;
  let lastProgress = Date.now();

  await runPoolSource(scan.entries, async (item) => {
    if (!item) return;
    if (currentPaths) currentPaths.add(item.path);
    const prior = previousByPath.get(item.path);
    const finish = async (result) => {
      processed += 1;
      if (result?.entry) await entryWriter.add(result.entry);
      if (Date.now() - lastProgress > 15000) {
        process.stderr.write(`[living-mirror] processed ${processed}/${scanTotal || 'streaming'}; changed=${changedCount}; uploaded=${upload.uploaded}; failed=${upload.failed}\n`);
        lastProgress = Date.now();
      }
      return result;
    };
    if (item.type === 'directory') {
      return await finish({ entry: { ...item } });
    }
    if (item.type === 'tombstone') {
      noteChanged({ path: item.path, type: 'tombstone' });
      if (!dryRun && prior?.localObjectRel) {
        try { fs.unlinkSync(path.join(mirrorRoot, prior.localObjectRel)); } catch {}
      }
      if (!dryRun && uploadRequested && prior?.remoteObjectKey && !prior?.pack?.objectKey) {
        try {
          await r2Delete(prior.remoteObjectKey);
          upload.deleted += 1;
        } catch (error) {
          upload.failed += 1;
          if (upload.failures.length < 20) upload.failures.push({ path: item.path, error: error.message });
          process.stderr.write(`[living-mirror] delete failed for ${item.path}: ${error.message}\n`);
        }
      }
      return await finish({ entry: { path: item.path, type: 'tombstone', deleted: true, deletedAt: new Date().toISOString(), reason: item.reason || '' } });
    }
    if (item.type === 'symlink') {
      const entry = { ...item };
      const isChanged = force || !prior || prior.type !== 'symlink' || prior.linkTarget !== item.linkTarget;
      if (isChanged) noteChanged({ path: item.path, type: 'symlink' });
      else noteUnchanged(item.path);
      return await finish({ entry });
    }
    let sha256 = prior?.sha256 || '';
    const canTrustPrior = !force && prior?.type === 'file' && Number(prior.bytes) === Number(item.bytes) && Number(prior.mtimeMs) === Number(item.mtimeMs) && prior.sha256;
    if (!canTrustPrior) sha256 = await sha256File(item.abs);
    const currentPathReasons = pathProtectionReasons(item.path, ignoredPaths);
    const reusedProtection = canTrustPrior ? priorFileProtection(prior) : null;
    const protection = canReusePriorProtection(reusedProtection, currentPathReasons)
      ? reusedProtection
      : classifyFileProtection(item, ignoredPaths);
    const storageMode = protection.mode;
    const objectRel = currentObjectRel(item.path, storageMode);
    const remoteKey = currentRemoteKey(item.path, storageMode);
    const priorStorageMode = prior?.type === 'file' ? entryLogicalStorageMode(prior) : '';
    const storageModeChanged = prior?.type === 'file' && priorStorageMode !== storageMode;
    const isChanged = force || !prior || prior.type !== 'file' || prior.sha256 !== sha256 || Number(prior.bytes) !== Number(item.bytes) || storageModeChanged;
    const entry = {
      path: item.path,
      type: 'file',
      bytes: item.bytes,
      mode: item.mode,
      mtimeMs: item.mtimeMs,
      sha256,
      localObjectRel: prior?.localObjectRel || (keepLocalObjects ? objectRel : ''),
      remoteObjectKey: isChanged ? remoteKey : prior?.remoteObjectKey || remoteKey,
      pack: isChanged ? null : prior?.pack || null,
      encryption: isChanged ? null : prior.encryption || null,
      storage: {
        schema: 'skyevault.living-repo-mirror.file-storage.v1',
        mode: storageMode,
        logicalMode: storageMode,
        encrypted: protection.encrypted,
        protection: protection.protection,
        reasons: protection.reasons,
        objectRel,
        objectKey: isChanged ? remoteKey : prior?.storage?.objectKey || prior?.remoteObjectKey || remoteKey
      }
    };
    if (!isChanged) {
      noteUnchanged(item.path);
      return await finish({ entry });
    }
    noteChanged({ path: item.path, type: 'file', bytes: item.bytes, sha256, storageMode, protection: protection.protection, reasons: protection.reasons });
    if (!dryRun) {
      let uploadFailed = false;
      const shouldPackFile = uploadRequested
        && packSmallFiles
        && Number(item.bytes || 0) <= packFileMaxBytes()
        && (protection.encrypted || packCurrentFiles);
      if (shouldPackFile) {
        entry.localObjectRel = '';
        entry.remoteObjectKey = '';
        await packUploader.add({ entry, abs: item.abs, path: item.path, bytes: item.bytes });
        return await finish({});
      }
      if (uploadRequested) {
        let uploadError = null;
        const attempts = fileUploadAttempts();
        for (let attempt = 1; attempt <= attempts; attempt += 1) {
          uploadError = null;
          entry.encryption = null;
          try {
          let put = { size: 0 };
          if (protection.encrypted) {
            const encrypted = directCloudUpload
              ? await encryptFileToR2Cloud(item.abs, master.key, item.path, remoteKey, sha256)
              : await encryptFileToTemp(item.abs, master.key, item.path);
            entry.encryption = {
              algorithm: encrypted.algorithm,
              iv: encrypted.iv,
              authTag: encrypted.authTag,
              encryptedBytes: encrypted.encryptedBytes,
              encryptedSha256: encrypted.encryptedSha256
            };
            put = { size: encrypted.encryptedBytes };
            if (!directCloudUpload) {
              put = await r2PutFile(remoteKey, encrypted.tempPath, {
                contentType: 'application/vnd.skyevault.living-file+encrypted',
                metadata: {
                  schema: 'skyevault.living_repo_file.v1',
                  workspace_id: workspaceId,
                  repo_id: repoName,
                  path_hash: pathHash(item.path),
                  plain_sha256: sha256,
                  encrypted_sha256: encrypted.encryptedSha256,
                  owner_scope: 'owner-private',
                  storage_mode: 'protected-owner-unlock',
                  upload_mode: 'spooled-encrypted-temp'
                }
              });
              try { fs.unlinkSync(encrypted.tempPath); } catch {}
            }
          } else {
            put = directCloudUpload
              ? await uploadPlainFileToR2Cloud(item.abs, item.path, remoteKey, sha256)
              : await r2PutFile(remoteKey, item.abs, {
                contentType: 'application/vnd.skyevault.living-file+plain',
                metadata: {
                  schema: 'skyevault.living_repo_file.v1',
                  workspace_id: workspaceId,
                  repo_id: repoName,
                  path_hash: pathHash(item.path),
                  plain_sha256: sha256,
                  owner_scope: 'owner-private',
                  storage_mode: 'plain-current-object',
                  upload_mode: 'plain-source-upload'
                }
              });
            entry.encryption = null;
          }
          upload.uploaded += 1;
          upload.bytesUploaded += Number(put.size || put.bytes || 0);
          if (prior?.remoteObjectKey && prior.remoteObjectKey !== remoteKey && !prior?.pack?.objectKey) {
            try {
              await r2Delete(prior.remoteObjectKey);
              upload.deleted += 1;
            } catch (error) {
              upload.failed += 1;
              if (upload.failures.length < 20) upload.failures.push({ path: item.path, error: `old object delete failed: ${error.message}` });
            }
          }
            break;
          } catch (error) {
            uploadError = error;
            if (attempt < attempts) {
              const waitMs = Math.min(15000, 1000 * 2 ** (attempt - 1));
              process.stderr.write(`[living-mirror] upload retry ${attempt + 1}/${attempts} for ${item.path}: ${error.message}\n`);
              await sleep(waitMs);
            }
          }
        }
        if (uploadError) {
          uploadFailed = true;
          upload.failed += 1;
          if (upload.failures.length < 20) upload.failures.push({ path: item.path, error: uploadError.message });
          process.stderr.write(`[living-mirror] upload failed for ${item.path}: ${uploadError.message}\n`);
        }
      }
      if (keepLocalObjects || (uploadFailed && localFallbackOnUploadFailure)) {
        if (protection.encrypted) {
          const encrypted = entry.encryption ? null : await encryptFileToTemp(item.abs, master.key, item.path);
          if (encrypted) {
            entry.encryption = {
              algorithm: encrypted.algorithm,
              iv: encrypted.iv,
              authTag: encrypted.authTag,
              encryptedBytes: encrypted.encryptedBytes,
              encryptedSha256: encrypted.encryptedSha256
            };
          }
          fs.mkdirSync(path.dirname(currentObjectPath(item.path, storageMode)), { recursive: true, mode: 0o700 });
          if (encrypted?.tempPath) fs.renameSync(encrypted.tempPath, currentObjectPath(item.path, storageMode));
        } else {
          await copyFileToCurrentObject(item.abs, item.path, storageMode, item.mode || 0o600);
          entry.encryption = null;
        }
        if (protection.encrypted && !entry.encryption) {
          entry.encryption = {
            ...(prior?.encryption || {})
          };
        }
        entry.localObjectRel = objectRel;
      } else {
        entry.localObjectRel = '';
      }
    }
    return await finish({ entry });
  }, concurrency);

  await packUploader.flush();
  const skipped = (scan.skipped || []).sort((a, b) => a.path.localeCompare(b.path));
  for (const prior of trackCurrentPaths ? previousByPath.values() : []) {
    if (!prior.path || currentPaths.has(prior.path)) continue;
    noteRemoved({ path: prior.path, type: prior.type || 'file', remoteObjectKey: prior.remoteObjectKey || '' });
    if (!dryRun && prior.localObjectRel) {
      try { fs.unlinkSync(path.join(mirrorRoot, prior.localObjectRel)); } catch {}
    }
    if (!dryRun && uploadRequested && prior.remoteObjectKey && !prior.pack?.objectKey) {
      try {
        await r2Delete(prior.remoteObjectKey);
        upload.deleted += 1;
      } catch (error) {
        upload.failed += 1;
        if (upload.failures.length < 20) upload.failures.push({ path: prior.path, error: error.message });
        process.stderr.write(`[living-mirror] delete failed for ${prior.path}: ${error.message}\n`);
      }
    }
  }

  const entryIndex = await entryWriter.finalize();

  const manifest = {
    schema: 'skyevault.living-repo-mirror.manifest.v1',
    generatedAt: new Date().toISOString(),
    repo: path.basename(repoRoot),
    repoRoot,
    workspaceId,
    repoId: repoName,
    ownerScope: 'owner-private',
    baseArtifact,
    mode: baseArtifact ? 'adopted-base-plus-current-overlay' : 'full-current-index',
    encrypted: packCurrentFiles ? 'packed-current-files-and-protected-files' : 'selective-protected-files',
    storageModel: packCurrentFiles
      ? 'living-current-repo: small current files are encrypted pack members, large normal files are current objects, ignored/secret/private files are owner-unlock encrypted'
      : 'living-current-repo: plain current objects for normal files, encrypted owner-unlock objects for ignored/secret/private files',
    unlockRequired: entryIndex.protectedFileCount > 0,
    entryCount: entryIndex.entryCount,
    fileCount: entryIndex.fileCount,
    plainFileCount: entryIndex.plainFileCount,
    protectedFileCount: entryIndex.protectedFileCount,
    directoryCount: entryIndex.directoryCount,
    symlinkCount: entryIndex.symlinkCount,
    totalBytes: entryIndex.totalBytes,
    plainBytes: entryIndex.plainBytes,
    protectedBytes: entryIndex.protectedBytes,
    digest: entryIndex.digest,
    remote: {
      provider: uploadRequested ? 'cloudflare-r2' : 'local-only',
      bucket: uploadRequested ? r2Bucket() : '',
      prefix: uploadRequested ? uploadPrefix : '',
      manifestKey: uploadRequested ? currentManifestRemoteKey() : '',
      privateManifestKey: uploadRequested ? currentPrivateManifestRemoteKey() : ''
    },
    entryStorage: {
      kind: 'jsonl-shards',
      shardCount: entryIndex.shards.length,
      encrypted: uploadRequested,
      ownerFacing: 'one current manifest points to current repo objects; entry shards are internal index storage, not owner-facing deltas'
    },
    entryShards: entryIndex.shards,
    skipped
  };

  const receipt = {
    ok: upload.failed === 0,
    schema: 'skyevault.living-repo-mirror.receipt.v1',
    action: previous?.baseArtifact && !baseArtifact ? 'convert-to-full-current-index' : previous ? 'update-current-base' : baseArtifact ? 'adopt-existing-base' : 'seed-current-base',
    dryRun,
    startedAt,
    completedAt: new Date().toISOString(),
    repoRoot,
    workspaceId,
    repoId: repoName,
    digest: manifest.digest,
    previousDigest: previous?.digest || '',
    changedCount,
    removedCount,
    unchangedCount,
    entryCount: manifest.entryCount,
    fileCount: manifest.fileCount,
    totalBytes: manifest.totalBytes,
    changed,
    changedSampleTruncated: changedCount > changed.length,
    removed,
    removedSampleTruncated: removedCount > removed.length,
    unchangedSample: unchanged,
    unchangedSampleTruncated: unchangedCount > unchanged.length,
    plainFileCount: manifest.plainFileCount,
    protectedFileCount: manifest.protectedFileCount,
    plainBytes: manifest.plainBytes,
    protectedBytes: manifest.protectedBytes,
    unlockRequired: manifest.unlockRequired,
    storageModel: manifest.storageModel,
    upload,
    tempCleanup,
    localDiskRole: uploadRequested
      ? (directCloudUpload
        ? (packSmallFiles
          ? (packCurrentFiles ? 'no backup object cache; current small-file packs and individual large objects stream directly to Cloudflare R2' : 'no backup object cache; optional protected-file packs stream directly to Cloudflare R2')
          : 'no backup object cache; current repo objects stream directly to Cloudflare R2')
        : 'temporary encryption spool only; current backup custody is Cloudflare R2')
      : 'local-only mirror requested',
    uploadMode: directCloudUpload ? (packSmallFiles ? (packCurrentFiles ? 'direct-living-current-with-encrypted-current-packs-to-r2' : 'direct-living-current-with-optional-protected-packs-to-r2') : 'direct-living-current-objects-to-r2') : uploadRequested ? 'temporary-spool-then-r2' : 'local-only',
    remoteRequired,
    manifestPath: currentManifestPath,
    remotePrefix: uploadRequested ? uploadPrefix : '',
    model: baseArtifact
      ? 'legacy-adopted-base: owner-facing restore must materialize one current backup before download'
      : 'living-current-source: normal files are current objects, ignored/secret/private files are encrypted owner-unlock objects, restore/export produces one repaired repo'
  };
  if (remoteRequired && upload.failed > 0) {
    receipt.error = 'Remote upload failed; current manifest was not advanced because local disk is not the owner source of truth.';
  }

  if (!dryRun) {
    const receiptName = `living-mirror-${stamp()}.json`;
    const receiptPath = path.join(receiptsDir, receiptName);
    receipt.receiptPath = receiptPath;
    receipt.cloudCommit = uploadRequested ? {
      attempted: false,
      ok: false,
      publicManifestKey: currentManifestRemoteKey(),
      privateManifestKey: currentPrivateManifestRemoteKey(),
      publicReceiptKey: currentReceiptRemoteKey(),
      privateReceiptKey: privateReceiptRemoteKey(receiptName)
    } : null;
    let shouldCommitManifest = !remoteRequired || upload.failed === 0;
    if (shouldCommitManifest && uploadRequested) {
      receipt.cloudCommit.attempted = true;
      try {
        await r2PutBuffer(currentManifestRemoteKey(), Buffer.from(JSON.stringify(safePublicManifest(manifest), null, 2)), {
          contentType: 'application/json; charset=utf-8',
          metadata: { schema: 'skyevault.living_repo_public_manifest.v1', workspace_id: workspaceId, repo_id: repoName }
        });
        await r2PutBuffer(currentPrivateManifestRemoteKey(), encryptJsonBuffer(manifest, master.key), {
          contentType: 'application/vnd.skyevault.living-manifest+encrypted',
          metadata: { schema: 'skyevault.living_repo_private_manifest.v1', workspace_id: workspaceId, repo_id: repoName }
        });
        receipt.cloudCommit.ok = true;
        await r2PutBuffer(currentReceiptRemoteKey(), Buffer.from(JSON.stringify(safePublicReceipt(receipt), null, 2)), {
          contentType: 'application/json; charset=utf-8',
          metadata: { schema: 'skyevault.living_repo_public_receipt.v1', workspace_id: workspaceId, repo_id: repoName }
        });
        await r2PutBuffer(privateReceiptRemoteKey(receiptName), encryptJsonBuffer(receipt, master.key), {
          contentType: 'application/vnd.skyevault.living-receipt+encrypted',
          metadata: { schema: 'skyevault.living_repo_private_receipt.v1', workspace_id: workspaceId, repo_id: repoName }
        });
      } catch (error) {
        upload.failed += 1;
        receipt.ok = false;
        receipt.cloudCommit.ok = false;
        receipt.cloudCommit.error = error.message;
        receipt.error = `Remote manifest/receipt commit failed; current manifest was not advanced because Cloudflare custody did not acknowledge the new source of truth. ${error.message}`;
        if (remoteRequired) shouldCommitManifest = false;
      }
    }
    if (shouldCommitManifest) {
      writeCompactJson(currentManifestPath, manifest);
      writeJson(path.join(currentDir, 'manifest.public.json'), safePublicManifest(manifest), 0o600);
      await cleanupStaleEntryShards(previous, manifest, upload);
      if (upload.failed > 0) receipt.ok = false;
    }
    writeJson(receiptPath, receipt);
    writeJson(path.join(mirrorRoot, receipt.ok ? 'latest-receipt.json' : 'latest-failed-receipt.json'), receipt);
    appendJsonl(ledgerPath, {
      schema: 'skyevault.living-repo-mirror.ledger.v1',
      recordedAt: receipt.completedAt,
      action: receipt.action,
      digest: receipt.digest,
      changedCount: receipt.changedCount,
      removedCount: receipt.removedCount,
      upload,
      committed: shouldCommitManifest
    });
  }

  console.log(JSON.stringify({
    ok: receipt.ok,
    action: receipt.action,
    dryRun,
    digest: receipt.digest,
    previousDigest: receipt.previousDigest,
    changedCount: receipt.changedCount,
    removedCount: receipt.removedCount,
    unchangedCount: receipt.unchangedCount,
    entryCount: receipt.entryCount,
    fileCount: receipt.fileCount,
    plainFileCount: receipt.plainFileCount,
    protectedFileCount: receipt.protectedFileCount,
    plainBytes: receipt.plainBytes,
    protectedBytes: receipt.protectedBytes,
    unlockRequired: receipt.unlockRequired,
    totalBytes: receipt.totalBytes,
    upload: {
      requested: upload.requested,
      uploaded: upload.uploaded,
      deleted: upload.deleted,
      failed: upload.failed,
      packObjects: upload.packObjects,
      entryShardObjects: upload.entryShardObjects,
      bytesUploaded: upload.bytesUploaded,
      requestedConcurrency: upload.requestedConcurrency,
      effectiveConcurrency: upload.effectiveConcurrency,
      packCurrentFiles
    },
    remoteRequired,
    uploadMode: receipt.uploadMode,
    localDiskRole: receipt.localDiskRole,
    tempCleanup,
    manifestPath: receipt.manifestPath,
    receiptPath: receipt.receiptPath || '',
    remotePrefix: receipt.remotePrefix,
    model: receipt.model
  }, null, 2));
  if (!receipt.ok) process.exitCode = 1;
}

function statusMirror() {
  const manifest = readJson(currentManifestPath, null);
  const receipt = readJson(path.join(mirrorRoot, 'latest-receipt.json'), null);
  const payload = {
    ok: Boolean(manifest),
    schema: 'skyevault.living-repo-mirror.status.v1',
    checkedAt: new Date().toISOString(),
    repoRoot,
    workspaceId,
    repoId: repoName,
    mirrorRoot,
    model: 'one living current repo: normal files current, protected files encrypted, restore/export rebuilds one repaired codebase',
    manifest: manifest ? {
      generatedAt: manifest.generatedAt,
      digest: manifest.digest,
      mode: manifest.mode || '',
      fullCurrentIndexReady: manifest.mode === 'full-current-index' && !manifest.baseArtifact,
      adoptedBasePresent: Boolean(manifest.baseArtifact),
      entryCount: manifest.entryCount,
      fileCount: manifest.fileCount,
      plainFileCount: manifest.plainFileCount || 0,
      protectedFileCount: manifest.protectedFileCount || 0,
      plainBytes: manifest.plainBytes || 0,
      protectedBytes: manifest.protectedBytes || 0,
      unlockRequired: Boolean(manifest.unlockRequired),
      storageModel: manifest.storageModel || '',
      directoryCount: manifest.directoryCount,
      symlinkCount: manifest.symlinkCount,
      totalBytes: manifest.totalBytes,
      entryStorage: manifest.entryStorage || null,
      remote: manifest.remote || null,
      manifestPath: currentManifestPath
    } : null,
    latestReceipt: receipt ? {
      action: receipt.action,
      completedAt: receipt.completedAt,
      digest: receipt.digest,
      changedCount: receipt.changedCount,
      removedCount: receipt.removedCount,
      plainFileCount: receipt.plainFileCount || 0,
      protectedFileCount: receipt.protectedFileCount || 0,
      unlockRequired: Boolean(receipt.unlockRequired),
      upload: receipt.upload,
      uploadMode: receipt.uploadMode || '',
      localDiskRole: receipt.localDiskRole || '',
      cloudCommit: receipt.cloudCommit || null,
      receiptPath: receipt.receiptPath || path.join(mirrorRoot, 'latest-receipt.json')
    } : null
  };
  console.log(JSON.stringify(payload, null, 2));
  if (!payload.ok) process.exitCode = 1;
}

function safeJoin(root, itemPath) {
  const target = path.resolve(root, itemPath);
  const cleanRoot = `${path.resolve(root)}${path.sep}`;
  if (target !== path.resolve(root) && !target.startsWith(cleanRoot)) throw new Error(`Refusing path outside restore root: ${itemPath}`);
  return target;
}

async function restoreMirror() {
  const restoreKit = loadRestoreKit();
  const master = masterKeyFromRestoreKit(restoreKit);
  const manifest = await manifestFromRestoreKit(restoreKit, master.key);
  if (!manifest) throw new Error('No living mirror manifest exists yet. Run sync first.');
  if (manifest.baseArtifact && !flag('--overlay-only')) {
    throw new Error('Current mirror uses an adopted full base artifact plus stable overlay objects. Full restore must materialize the base artifact first; pass --overlay-only only for overlay proof.');
  }
  const rawOut = argValue('--out', '');
  if (!rawOut) throw new Error('Restore output is required: --out=/path/to/restore.');
  const out = resolvePath(rawOut, process.cwd());
  if (fs.existsSync(out) && fs.readdirSync(out).length && !flag('--force')) throw new Error(`Restore output is not empty: ${out}. Pass --force to overwrite.`);
  fs.mkdirSync(out, { recursive: true, mode: 0o700 });
  let restoredFiles = 0;
  let restoredDirs = 0;
  let restoredSymlinks = 0;
  for await (const entry of manifestEntries(manifest, master.key)) {
    const target = safeJoin(out, entry.path);
    if (entry.type === 'directory') {
      fs.mkdirSync(target, { recursive: true, mode: entry.mode || 0o755 });
      restoredDirs += 1;
    } else if (entry.type === 'symlink') {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      try { fs.unlinkSync(target); } catch {}
      fs.symlinkSync(entry.linkTarget || '', target);
      restoredSymlinks += 1;
    } else if (entry.type === 'file') {
      await restoreFileToPath(entry, target, master.key);
      restoredFiles += 1;
    }
  }
  const receipt = {
    ok: true,
    schema: 'skyevault.living-repo-mirror.restore-receipt.v1',
    restoredAt: new Date().toISOString(),
    digest: manifest.digest,
    kitPath: restoreKit?.kitPath || '',
    masterKeySource: master.source || '',
    out,
    restoredFiles,
    restoredDirs,
    restoredSymlinks,
    plainFileCount: manifest.plainFileCount || 0,
    protectedFileCount: manifest.protectedFileCount || 0,
    unlockRequired: Boolean(manifest.unlockRequired)
  };
  const receiptPath = path.join(receiptsDir, `living-mirror-restore-${stamp()}.json`);
  writeJson(receiptPath, receipt);
  console.log(JSON.stringify({ ...receipt, receiptPath }, null, 2));
}

async function exportMirror() {
  const manifest = readJson(currentManifestPath, null);
  if (!manifest) throw new Error('No living mirror manifest exists yet. Run sync first.');
  if (!flag('--legacy-tar-export')) {
    console.log(JSON.stringify({
      ok: true,
      schema: 'skyevault.living-repo-mirror.mutable-export-handoff.v1',
      command: 'export',
      model: 'mutable-current-mirror',
      digest: manifest.digest || '',
      generatedAt: manifest.generatedAt || '',
      fileCount: manifest.fileCount || 0,
      totalBytes: manifest.totalBytes || 0,
      remote: manifest.remote || null,
      disabledArtifactModel: 'immutable tar export',
      ownerContract: 'export no longer mints a separate full artifact; restore/download must use the current mutable mirror source of truth',
      restoreCommand: 'npm run vault:mirror:restore -- --env-file=.env --kit-file=.skyevault-out/autosync/CURRENT_REPO_BACKUP.json --out=/path/to/repaired-repo --force',
      handoffCommand: 'node tools/skyevault-owner-download-launcher.mjs handoff --env-file=.env',
      legacyOverride: '--legacy-tar-export'
    }, null, 2));
    return;
  }
  if (manifest.baseArtifact && !flag('--overlay-only')) {
    throw new Error('Current mirror is based on an adopted full base artifact plus stable overlay objects. Full package export must materialize the base artifact first; use the restore lane or pass --overlay-only only for overlay proof.');
  }
  const outDir = resolvePath(argValue('--out-dir', path.join(mirrorRoot, 'exports', stamp())), defaultRepoRoot);
  fs.mkdirSync(outDir, { recursive: true, mode: 0o700 });
  const exportStamp = stamp();
  const exportFileName = `${repoName}-current-${exportStamp}.tar.gz.enc`;
  const encrypted = path.join(outDir, exportFileName);
  const passphrase = crypto.randomBytes(48).toString('base64url');
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(passphrase, salt, 32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let upload = { requested: exportUploadRequested, ok: true, bucket: '', objectKey: '', bytes: 0, sha256: '', downloadUrl: '', expiresAt: '', mode: 'not-uploaded' };
  let artifact = encrypted;
  let artifactBytes = 0;
  let encryptedSha256 = '';

  if (directExportUpload) {
    const expiresSeconds = intValue('--expires', 3600, 60);
    const objectKey = `${uploadPrefix}/exports/${exportFileName}`;
    const exported = await r2UploadStreamSmart(
      objectKey,
      Readable.from(tarStreamFromManifest(manifest)).pipe(zlib.createGzip({ level: gzipLevel() })).pipe(cipher),
      {
        contentType: 'application/vnd.skyevault.current-repo-export+encrypted',
        metadata: {
          schema: 'skyevault.living_repo_current_export.v1',
          workspace_id: workspaceId,
          repo_id: repoName,
          manifest_digest: manifest.digest,
          owner_scope: 'owner-private',
          upload_mode: 'direct-encrypted-cloud-export'
        }
      }
    );
    artifact = `r2://${r2Bucket()}/${objectKey}`;
    artifactBytes = exported.size;
    encryptedSha256 = exported.sha256;
    upload = {
      requested: true,
      ok: true,
      bucket: r2Bucket(),
      objectKey,
      bytes: exported.size,
      sha256: exported.sha256,
      downloadUrl: r2DownloadUrl(objectKey, exportFileName, expiresSeconds),
      expiresAt: new Date(Date.now() + expiresSeconds * 1000).toISOString(),
      mode: exported.mode,
      parts: exported.parts || 0
    };
  } else {
    await pipeline(Readable.from(tarStreamFromManifest(manifest)), zlib.createGzip({ level: gzipLevel() }), cipher, fs.createWriteStream(encrypted, { mode: 0o600 }));
    encryptedSha256 = await sha256File(encrypted);
    artifactBytes = fs.statSync(encrypted).size;
    if (exportUploadRequested) {
      const expiresSeconds = intValue('--expires', 3600, 60);
      const objectKey = `${uploadPrefix}/exports/${path.basename(encrypted)}`;
      const put = await r2PutFile(objectKey, encrypted, {
        contentType: 'application/vnd.skyevault.current-repo-export+encrypted',
        metadata: {
          schema: 'skyevault.living_repo_current_export.v1',
          workspace_id: workspaceId,
          repo_id: repoName,
          manifest_digest: manifest.digest,
          owner_scope: 'owner-private',
          upload_mode: 'spooled-encrypted-export'
        }
      });
      upload = {
        requested: true,
        ok: true,
        bucket: r2Bucket(),
        objectKey,
        bytes: put.size,
        sha256: put.sha256 || '',
        downloadUrl: r2DownloadUrl(objectKey, path.basename(encrypted), expiresSeconds),
        expiresAt: new Date(Date.now() + expiresSeconds * 1000).toISOString(),
        mode: 'temporary-spool-then-r2'
      };
    }
  }
  const authTag = cipher.getAuthTag();
  const receipt = {
    ok: true,
    schema: 'skyevault.living-repo-mirror.export-receipt.v1',
    exportedAt: new Date().toISOString(),
    digest: manifest.digest,
    artifact,
    artifactBytes,
    artifactSha256: encryptedSha256,
    localDiskRole: directExportUpload
      ? 'no full export artifact is staged locally; export streams from current mirror to Cloudflare R2'
      : 'temporary export artifact stage',
    encryption: {
      algorithm: 'aes-256-gcm',
      kdf: 'scrypt',
      salt: salt.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64')
    },
    upload,
    unlockMaterialPath: path.join(outDir, 'CURRENT_REPO_UNLOCK.json')
  };
  writeJson(receipt.unlockMaterialPath, {
    schema: 'skyevault.living-repo-mirror.export-unlock.v1',
    artifact,
    artifactFileName: exportFileName,
    objectKey: upload.objectKey || '',
    artifactBytes,
    artifactSha256: encryptedSha256,
    passphrase,
    encryption: receipt.encryption,
    restoreContract: {
      model: 'one repaired repo folder from the current living manifest',
      protectedFilesIncluded: manifest.protectedFileCount || 0,
      plainFilesIncluded: manifest.plainFileCount || 0,
      secretsUnlockRequired: Boolean(manifest.unlockRequired)
    },
    warning: 'Private export unlock material. Do not commit, print, or share.'
  });
  const receiptPath = path.join(outDir, 'CURRENT_REPO_EXPORT_RECEIPT.json');
  writeJson(receiptPath, receipt);
  writeJson(path.join(mirrorRoot, 'latest-export.json'), { ...receipt, receiptPath });
  console.log(JSON.stringify({ ...receipt, receiptPath, unlockMaterialPath: receipt.unlockMaterialPath ? rel(receipt.unlockMaterialPath, defaultRepoRoot) : '' }, null, 2));
}

function countTree(root) {
  const counts = { files: 0, dirs: 0, symlinks: 0, bytes: 0 };
  const stack = [''];
  while (stack.length) {
    const relativeDir = stack.pop();
    const dir = path.join(root, relativeDir);
    let children = [];
    try {
      children = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const child of children) {
      const itemPath = [relativeDir, child.name].filter(Boolean).join('/');
      const abs = path.join(root, itemPath);
      let stat = null;
      try { stat = fs.lstatSync(abs); } catch { continue; }
      if (stat.isDirectory()) {
        counts.dirs += 1;
        stack.push(itemPath);
      } else if (stat.isSymbolicLink()) {
        counts.symlinks += 1;
      } else if (stat.isFile()) {
        counts.files += 1;
        counts.bytes += stat.size;
      }
    }
  }
  return counts;
}

function resolveArtifactPath(value, base) {
  const raw = String(value || '').trim();
  if (!raw || raw.startsWith('r2://')) return raw;
  return resolvePath(raw, base);
}

async function unlockExport() {
  const rawUnlock = argValue('--unlock-file', argValue('--unlock', ''));
  if (!rawUnlock) throw new Error('Unlock file is required: --unlock-file=/path/to/CURRENT_REPO_UNLOCK.json');
  const unlockPath = resolvePath(rawUnlock, process.cwd());
  const unlock = readJson(unlockPath, null);
  if (!unlock?.passphrase) throw new Error(`Unlock file is missing passphrase: ${unlockPath}`);
  const receipt = readJson(path.join(path.dirname(unlockPath), 'CURRENT_REPO_EXPORT_RECEIPT.json'), null);
  const encryption = unlock.encryption || receipt?.encryption || null;
  if (!encryption?.salt || !encryption?.iv || !encryption?.authTag) throw new Error('Unlock material is missing encryption salt, iv, or authTag.');
  const rawOut = argValue('--out', '');
  if (!rawOut) throw new Error('Unlock output is required: --out=/path/to/repaired-repo');
  const out = resolvePath(rawOut, process.cwd());
  if (fs.existsSync(out) && fs.readdirSync(out).length && !flag('--force')) throw new Error(`Unlock output is not empty: ${out}. Pass --force to overwrite.`);
  fs.mkdirSync(out, { recursive: true, mode: 0o700 });
  fs.mkdirSync(tempDir, { recursive: true, mode: 0o700 });
  const artifact = resolveArtifactPath(argValue('--artifact', unlock.artifact || receipt?.artifact || ''), path.dirname(unlockPath));
  const objectKey = argValue('--object-key', unlock.objectKey || receipt?.upload?.objectKey || '');
  if (!artifact && !objectKey) throw new Error('Unlock material does not identify an artifact file or R2 object key.');
  const useR2 = objectKey && (!artifact || artifact.startsWith('r2://') || flag('--from-r2'));
  const artifactBytes = Number(argValue('--artifact-bytes', unlock.artifactBytes || receipt?.artifactBytes || receipt?.upload?.bytes || 0));
  const input = useR2
    ? (artifactBytes > 0 ? await r2GetRangeStream(objectKey, 0, artifactBytes) : await r2GetStream(objectKey))
    : fs.createReadStream(artifact);
  const key = crypto.scryptSync(unlock.passphrase, Buffer.from(encryption.salt, 'base64'), 32);
  const decipher = crypto.createDecipheriv(encryption.algorithm || 'aes-256-gcm', key, Buffer.from(encryption.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(encryption.authTag, 'base64'));
  const tar = spawn('tar', ['-xzf', '-', '-C', out], {
    cwd: repoRoot,
    stdio: ['pipe', 'ignore', 'pipe']
  });
  let tarError = '';
  tar.stderr.on('data', (chunk) => {
    tarError = `${tarError}${chunk.toString('utf8')}`.slice(-4000);
  });
  const tarDone = new Promise((resolve, reject) => {
    tar.on('error', reject);
    tar.on('close', (status, signal) => {
      if (status === 0) resolve();
      else reject(new Error(`tar unlock extraction failed: ${signal ? `signal ${signal}` : `status ${status}`}. ${tarError.slice(-1000)}`));
    });
  });
  try {
    await pipeline(input, decipher, tar.stdin);
    await tarDone;
  } catch (error) {
    try { tar.kill('SIGTERM'); } catch {}
    try { await tarDone; } catch {}
    throw error;
  }
  const counts = countTree(out);
  const receiptOut = {
    ok: true,
    schema: 'skyevault.living-repo-mirror.unlock-receipt.v1',
    unlockedAt: new Date().toISOString(),
    unlockPath,
    artifact: artifact || `r2://${r2Bucket()}/${objectKey}`,
    objectKey,
    out,
    files: counts.files,
    directories: counts.dirs,
    symlinks: counts.symlinks,
    bytes: counts.bytes,
    restoreContract: unlock.restoreContract || null
  };
  const receiptPath = path.join(receiptsDir, `living-mirror-unlock-${stamp()}.json`);
  writeJson(receiptPath, receiptOut);
  console.log(JSON.stringify({ ...receiptOut, receiptPath }, null, 2));
}

async function cleanupMirrorCloud() {
  const prefix = normalizePrefix(argValue('--prefix', uploadPrefix));
  if (!prefix || prefix.length < 12) throw new Error(`Refusing cleanup for unsafe prefix: ${prefix}`);
  const expectedPrefix = normalizePrefix(`vault-system/living-repo/${workspaceId}/${repoName}`);
  const allowProof = flag('--include-proof') && prefix.startsWith('vault-system/living-repo-proof/');
  const allowExplicit = flag('--i-understand-delete-cloud-backups');
  if (prefix !== expectedPrefix && !allowProof && !allowExplicit) {
    throw new Error(`Refusing cleanup outside owner repo living mirror prefix. Wanted ${expectedPrefix}, got ${prefix}. Pass --i-understand-delete-cloud-backups only for an intentional wider cleanup.`);
  }
  const startedAt = new Date().toISOString();
  const keys = await r2ListKeys(prefix);
  const dry = dryRun || flag('--dry-run');
  const concurrency = intValue('--delete-concurrency', 24, 1);
  const result = dry ? { deleted: 0, missing: 0, failures: [] } : await deleteKeys(keys, concurrency);
  const receipt = {
    ok: result.failures.length === 0,
    schema: 'skyevault.living-repo-mirror.cleanup-receipt.v1',
    startedAt,
    completedAt: new Date().toISOString(),
    bucket: r2Bucket(),
    prefix,
    dryRun: dry,
    listed: keys.length,
    deleted: result.deleted,
    missing: result.missing,
    failures: result.failures,
    sampleKeys: keys.slice(0, 25)
  };
  fs.mkdirSync(receiptsDir, { recursive: true, mode: 0o700 });
  const receiptPath = path.join(receiptsDir, `living-mirror-cleanup-${stamp()}.json`);
  writeJson(receiptPath, receipt);
  console.log(JSON.stringify({ ...receipt, receiptPath }, null, 2));
  if (!receipt.ok) process.exitCode = 1;
}

function tarNumber(value, size) {
  const text = Math.max(0, Number(value || 0)).toString(8);
  return `${text.padStart(size - 1, '0')}\0`;
}

function splitTarPath(itemPath) {
  const clean = String(itemPath || '').replace(/^\/+|\\/g, '/');
  if (Buffer.byteLength(clean) <= 100) return { name: clean, prefix: '' };
  const parts = clean.split('/');
  let name = parts.pop() || '';
  let prefix = parts.join('/');
  while (Buffer.byteLength(name) > 100 && prefix) {
    name = `${prefix.split('/').pop()}/${name}`;
    prefix = prefix.split('/').slice(0, -1).join('/');
  }
  if (Buffer.byteLength(name) <= 100 && Buffer.byteLength(prefix) <= 155) return { name, prefix };
  return { name: clean.slice(-100), prefix: '' };
}

function writeTarString(buffer, offset, size, value) {
  const bytes = Buffer.from(String(value || ''));
  bytes.copy(buffer, offset, 0, Math.min(size, bytes.length));
}

function tarHeader({ name, size = 0, mode = 0o644, type = '0', linkname = '', mtime = Math.floor(Date.now() / 1000) }) {
  const header = Buffer.alloc(512, 0);
  const split = splitTarPath(name);
  writeTarString(header, 0, 100, split.name);
  writeTarString(header, 100, 8, tarNumber(mode, 8));
  writeTarString(header, 108, 8, tarNumber(0, 8));
  writeTarString(header, 116, 8, tarNumber(0, 8));
  writeTarString(header, 124, 12, tarNumber(size, 12));
  writeTarString(header, 136, 12, tarNumber(mtime, 12));
  header.fill(' ', 148, 156);
  writeTarString(header, 156, 1, type);
  writeTarString(header, 157, 100, linkname);
  writeTarString(header, 257, 6, 'ustar');
  writeTarString(header, 263, 2, '00');
  writeTarString(header, 345, 155, split.prefix);
  let checksum = 0;
  for (const byte of header) checksum += byte;
  writeTarString(header, 148, 8, `${checksum.toString(8).padStart(6, '0')}\0 `);
  return header;
}

function paxBody(fields) {
  const lines = [];
  for (const [key, value] of Object.entries(fields)) {
    if (!value) continue;
    let line = `${key}=${value}\n`;
    let length = Buffer.byteLength(line) + 3;
    while (String(length).length + 1 + Buffer.byteLength(line) !== length) {
      length = String(length).length + 1 + Buffer.byteLength(line);
    }
    lines.push(`${length} ${line}`);
  }
  return Buffer.from(lines.join(''));
}

async function* tarEntryHeader(entry) {
  const needsPax = Buffer.byteLength(entry.path) > 100 || Buffer.byteLength(entry.linkTarget || '') > 100;
  if (needsPax) {
    const body = paxBody({ path: entry.path, linkpath: entry.linkTarget || '' });
    yield tarHeader({ name: `PaxHeaders.X/${pathHash(entry.path)}`, size: body.length, mode: 0o600, type: 'x' });
    yield body;
    const pad = (512 - (body.length % 512)) % 512;
    if (pad) yield Buffer.alloc(pad);
  }
}

class PackObjectCursor {
  constructor(objectKey) {
    this.objectKey = objectKey;
    this.buffer = Buffer.alloc(0);
    this.offset = 0;
    this.ended = false;
  }

  async readNextChunk(minBytes = 1) {
    if (this.ended) return null;
    const length = Math.max(readWindowBytes(), Number(minBytes || 1));
    const chunks = [];
    let bytes = 0;
    for await (const raw of r2RangeRetryBytes(this.objectKey, this.offset, length, {
      allowShort: true,
      label: `R2 pack window ${this.objectKey}`
    })) {
      const chunk = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
      if (!chunk.length) continue;
      chunks.push(chunk);
      bytes += chunk.length;
    }
    if (!bytes) {
      this.ended = true;
      return null;
    }
    return Buffer.concat(chunks, bytes);
  }

  async skip(bytes) {
    let remaining = Number(bytes || 0);
    if (remaining <= 0) return;
    if (!this.buffer.length) {
      this.offset += remaining;
      this.ended = false;
      return;
    }
    while (remaining > 0) {
      const take = Math.min(remaining, this.buffer.length);
      this.buffer = this.buffer.subarray(take);
      this.offset += take;
      remaining -= take;
      if (!this.buffer.length && remaining > 0) {
        this.offset += remaining;
        this.ended = false;
        return;
      }
    }
  }

  async *read(offset, length) {
    const start = Number(offset || 0);
    let remaining = Number(length || 0);
    if (remaining <= 0) return;
    if (start < this.offset) {
      const stream = await r2GetRangeStream(this.objectKey, start, remaining);
      for await (const chunk of stream) yield chunk;
      return;
    }
    await this.skip(start - this.offset);
    while (remaining > 0) {
      if (!this.buffer.length) {
        const chunk = await this.readNextChunk(remaining);
        if (!chunk) throw new Error(`Pack ${this.objectKey} ended while reading member.`);
        this.buffer = chunk;
      }
      const take = Math.min(remaining, this.buffer.length);
      yield this.buffer.subarray(0, take);
      this.buffer = this.buffer.subarray(take);
      this.offset += take;
      remaining -= take;
    }
  }
}

class PackStreamCursorSet {
  constructor() {
    this.cursors = new Map();
  }

  read(entry) {
    const objectKey = entry.pack?.objectKey;
    if (!objectKey) return null;
    if (!this.cursors.has(objectKey)) this.cursors.set(objectKey, new PackObjectCursor(objectKey));
    return this.cursors.get(objectKey).read(Number(entry.pack.offset || 0), Number(entry.pack.encryptedBytes || entry.encryption?.encryptedBytes || 0));
  }
}

async function* storedEntryPlainStream(entry, key, packCursors = null) {
  const input = entry.pack?.objectKey && packCursors ? packCursors.read(entry) : await storedObjectStream(entry);
  if (!input) throw new Error(`Mirror object missing for export: ${entry.path}`);
  let stream = input;
  if (entryIsEncrypted(entry)) {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(entry.encryption?.iv || '', 'base64'));
    stream = Readable.from(input).pipe(decipher);
    stream.setAuthTag(Buffer.from(entry.encryption?.authTag || '', 'base64'));
  }
  let produced = 0;
  const hash = crypto.createHash('sha256');
  for await (const chunk of stream) {
    produced += chunk.length;
    hash.update(chunk);
    yield chunk;
  }
  if (produced !== Number(entry.bytes || 0)) throw new Error(`Decrypted byte count mismatch for ${entry.path}: ${produced} !== ${entry.bytes}`);
  const plainSha256 = hash.digest('hex');
  if (entry.sha256 && plainSha256 !== entry.sha256) throw new Error(`Export checksum mismatch for ${entry.path}: ${plainSha256} !== ${entry.sha256}`);
}

async function* tarStreamFromManifest(manifest) {
  const master = loadMasterKey();
  const packCursors = new PackStreamCursorSet();
  for (const entry of await exportOrderedEntries(manifest, master.key)) {
    for await (const chunk of tarEntryHeader(entry)) yield chunk;
    const mtime = Math.floor(Number(entry.mtimeMs || Date.now()) / 1000);
    if (entry.type === 'directory') {
      yield tarHeader({ name: entry.path.endsWith('/') ? entry.path : `${entry.path}/`, size: 0, mode: entry.mode || 0o755, type: '5', mtime });
    } else if (entry.type === 'symlink') {
      yield tarHeader({ name: entry.path, size: 0, mode: entry.mode || 0o777, type: '2', linkname: entry.linkTarget || '', mtime });
    } else if (entry.type === 'file') {
      yield tarHeader({ name: entry.path, size: Number(entry.bytes || 0), mode: entry.mode || 0o600, type: '0', mtime });
      for await (const chunk of storedEntryPlainStream(entry, master.key, packCursors)) yield chunk;
      const pad = (512 - (Number(entry.bytes || 0) % 512)) % 512;
      if (pad) yield Buffer.alloc(pad);
    }
  }
  yield Buffer.alloc(1024);
}

async function exportOrderedEntries(manifest, key) {
  const dirs = [];
  const packedFiles = [];
  const otherFiles = [];
  const symlinks = [];
  const others = [];
  for await (const entry of manifestEntries(manifest, key)) {
    if (entry.type === 'directory') dirs.push(entry);
    else if (entry.type === 'file' && entry.pack?.objectKey) packedFiles.push(entry);
    else if (entry.type === 'file') otherFiles.push(entry);
    else if (entry.type === 'symlink') symlinks.push(entry);
    else others.push(entry);
  }
  dirs.sort((a, b) => a.path.localeCompare(b.path));
  packedFiles.sort((a, b) => {
    const objectCompare = String(a.pack?.objectKey || '').localeCompare(String(b.pack?.objectKey || ''));
    if (objectCompare) return objectCompare;
    return Number(a.pack?.offset || 0) - Number(b.pack?.offset || 0);
  });
  otherFiles.sort((a, b) => a.path.localeCompare(b.path));
  symlinks.sort((a, b) => a.path.localeCompare(b.path));
  return [...dirs, ...packedFiles, ...otherFiles, ...symlinks, ...others];
}

async function restoreMirrorToDir(out, manifest) {
  const master = loadMasterKey();
  fs.mkdirSync(out, { recursive: true, mode: 0o700 });
  for await (const entry of manifestEntries(manifest, master.key)) {
    const target = safeJoin(out, entry.path);
    if (entry.type === 'directory') fs.mkdirSync(target, { recursive: true, mode: entry.mode || 0o755 });
    else if (entry.type === 'symlink') {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      try { fs.unlinkSync(target); } catch {}
      fs.symlinkSync(entry.linkTarget || '', target);
    } else if (entry.type === 'file') await restoreFileToPath(entry, target, master.key);
  }
}

async function proofMirror() {
  const proofRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'skyevault-living-mirror-proof-'));
  const fixture = path.join(proofRoot, 'repo');
  const mirror = path.join(proofRoot, 'mirror');
  const proofUpload = uploadRequested || flag('--proof-upload');
  const proofRemotePrefix = normalizePrefix(argValue('--proof-remote-prefix', `vault-system/living-repo-proof/${stamp().toLowerCase()}`));
  fs.mkdirSync(path.join(fixture, 'src'), { recursive: true });
  spawnSync('git', ['init'], { cwd: fixture, encoding: 'utf8' });
  fs.writeFileSync(path.join(fixture, '.gitignore'), 'ignored-secret.txt\n');
  fs.writeFileSync(path.join(fixture, 'src', 'alpha.txt'), 'alpha\n');
  fs.writeFileSync(path.join(fixture, 'src', 'delete-me.txt'), 'delete\n');
  fs.writeFileSync(path.join(fixture, '.env'), 'SECRET=kept-encrypted\n');
  fs.writeFileSync(path.join(fixture, 'ignored-secret.txt'), 'IGNORED_SECRET=restored\n');
  const run = (extra, options = {}) => {
    const passThrough = [];
    if (argValue('--env-file', '')) passThrough.push(`--env-file=${argValue('--env-file')}`);
    if (proofUpload && options.passUpload !== false) {
      passThrough.push('--upload', `--remote-prefix=${proofRemotePrefix}`);
      passThrough.push(`--stream-chunk-mb=${argValue('--stream-chunk-mb', '5')}`);
      passThrough.push(`--single-put-mb=${argValue('--single-put-mb', '1')}`);
    }
    if (flag('--pack-small-files')) passThrough.push('--pack-small-files');
    if (flag('--pack-current-files')) passThrough.push('--pack-current-files');
    if (argValue('--pack-file-max-mb', '')) passThrough.push(`--pack-file-max-mb=${argValue('--pack-file-max-mb')}`);
    if (argValue('--pack-object-mb', '')) passThrough.push(`--pack-object-mb=${argValue('--pack-object-mb')}`);
    if (argValue('--file-upload-attempts', '')) passThrough.push(`--file-upload-attempts=${argValue('--file-upload-attempts')}`);
    return spawnSync(process.execPath, [
      new URL('', import.meta.url).pathname,
      ...extra,
      ...passThrough,
    `--repo-root=${fixture}`,
    `--mirror-root=${mirror}`,
    '--workspace-id=proof-owner',
    '--repo-id=proof-repo',
    '--force-full-index'
    ], { cwd: defaultRepoRoot, encoding: 'utf8' });
  };
  const first = run(['sync']);
  fs.writeFileSync(path.join(fixture, 'src', 'alpha.txt'), 'alpha changed\n');
  fs.writeFileSync(path.join(fixture, 'src', 'beta.txt'), 'beta\n');
  fs.unlinkSync(path.join(fixture, 'src', 'delete-me.txt'));
  const second = run(['sync']);
  const third = run(['sync']);
  const restored = path.join(proofRoot, 'restored');
  const restore = run(['restore', `--out=${restored}`]);
  const exportDir = path.join(proofRoot, 'export');
  const exported = run(['export', `--out-dir=${exportDir}`], { passUpload: false });
  const exportJson = parseLastJson(exported.stdout);
  const unlockFile = resolvePath(exportJson?.unlockMaterialPath || path.join(exportDir, 'CURRENT_REPO_UNLOCK.json'), defaultRepoRoot);
  const unlocked = path.join(proofRoot, 'unlocked-export');
  const unlockedRun = run(['unlock-export', `--unlock-file=${unlockFile}`, `--out=${unlocked}`, '--force'], { passUpload: false });
  const firstJson = parseLastJson(first.stdout);
  const secondJson = parseLastJson(second.stdout);
  const thirdJson = parseLastJson(third.stdout);
  const restoreJson = parseLastJson(restore.stdout);
  const unlockedJson = parseLastJson(unlockedRun.stdout);
  const proofPackCurrentFiles = flag('--pack-current-files') || envFlag('SKYEVAULT_LIVING_MIRROR_PACK_CURRENT_FILES', false);
  const plainExpectationMet = proofPackCurrentFiles ? true : Number(secondJson?.plainFileCount || 0) >= 2;
  const noChangeWakeStable = third.status === 0
    && Number(thirdJson?.changedCount || 0) === 0
    && Number(thirdJson?.upload?.uploaded || 0) === 0
    && Number(thirdJson?.upload?.packObjects || 0) === 0;
  const ok = first.status === 0
    && second.status === 0
    && third.status === 0
    && restore.status === 0
    && exported.status === 0
    && unlockedRun.status === 0
    && fs.readFileSync(path.join(restored, 'src', 'alpha.txt'), 'utf8') === 'alpha changed\n'
    && fs.readFileSync(path.join(restored, 'src', 'beta.txt'), 'utf8') === 'beta\n'
    && fs.readFileSync(path.join(restored, '.env'), 'utf8') === 'SECRET=kept-encrypted\n'
    && fs.readFileSync(path.join(restored, 'ignored-secret.txt'), 'utf8') === 'IGNORED_SECRET=restored\n'
    && fs.readFileSync(path.join(unlocked, 'src', 'alpha.txt'), 'utf8') === 'alpha changed\n'
    && fs.readFileSync(path.join(unlocked, '.env'), 'utf8') === 'SECRET=kept-encrypted\n'
    && fs.readFileSync(path.join(unlocked, 'ignored-secret.txt'), 'utf8') === 'IGNORED_SECRET=restored\n'
    && !fs.existsSync(path.join(restored, 'src', 'delete-me.txt'))
    && !fs.existsSync(path.join(unlocked, 'src', 'delete-me.txt'))
    && Number(secondJson?.protectedFileCount || 0) >= 2
    && plainExpectationMet
    && noChangeWakeStable
    && secondJson?.unlockRequired === true;
  const receipt = {
    ok,
    schema: 'skyevault.living-repo-mirror.proof.v1',
    provedAt: new Date().toISOString(),
    proofRoot,
    uploadRequested: proofUpload,
    remotePrefix: proofUpload ? proofRemotePrefix : '',
    checks: {
      seedBase: first.status === 0,
      updateCurrentBase: second.status === 0,
      noChangeWakeStable,
      restoreCurrentState: restore.status === 0,
      exportCurrentBundle: exported.status === 0,
      unlockCurrentBundle: unlockedRun.status === 0,
      changedFileCurrent: fs.existsSync(path.join(restored, 'src', 'alpha.txt')) && fs.readFileSync(path.join(restored, 'src', 'alpha.txt'), 'utf8') === 'alpha changed\n',
      newFileCurrent: fs.existsSync(path.join(restored, 'src', 'beta.txt')),
      deletedFileRemoved: !fs.existsSync(path.join(restored, 'src', 'delete-me.txt')),
      secretFileEncryptedAndRestored: fs.existsSync(path.join(restored, '.env')) && fs.readFileSync(path.join(restored, '.env'), 'utf8') === 'SECRET=kept-encrypted\n',
      ignoredSecretEncryptedAndRestored: fs.existsSync(path.join(restored, 'ignored-secret.txt')) && fs.readFileSync(path.join(restored, 'ignored-secret.txt'), 'utf8') === 'IGNORED_SECRET=restored\n',
      unlockedBundleHasSecret: fs.existsSync(path.join(unlocked, '.env')) && fs.readFileSync(path.join(unlocked, '.env'), 'utf8') === 'SECRET=kept-encrypted\n',
      protectedFilesDetected: Number(secondJson?.protectedFileCount || 0) >= 2,
      plainFilesDetected: plainExpectationMet,
      cloudUploadUsedWhenRequested: !proofUpload || (firstJson?.upload?.requested === true && secondJson?.upload?.requested === true && thirdJson?.upload?.requested === true),
      noLocalTempBackupCache: !fs.existsSync(path.join(mirror, 'tmp')) || fs.readdirSync(path.join(mirror, 'tmp')).length === 0
    },
    first: firstJson,
    second: secondJson,
    third: thirdJson,
    restore: restoreJson,
    export: exportJson,
    unlock: unlockedJson
  };
  const out = path.join(defaultRepoRoot, 'test-artifacts', 'skyevault-living-mirror', `${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  writeJson(out, receipt, 0o644);
  writeJson(path.join(defaultRepoRoot, 'test-artifacts', 'skyevault-living-mirror', 'latest.json'), receipt, 0o644);
  console.log(JSON.stringify({ ...receipt, receiptPath: out }, null, 2));
  if (!ok) process.exitCode = 1;
}

function parseLastJson(text) {
  const matches = String(text || '').match(/\{[\s\S]*\}/g) || [];
  for (const item of matches.reverse()) {
    try { return JSON.parse(item); } catch {}
  }
  return null;
}

try {
  if (command === 'sync') await syncMirror();
  else if (command === 'status') statusMirror();
  else if (command === 'restore') await restoreMirror();
  else if (command === 'export') await exportMirror();
  else if (command === 'unlock-export') await unlockExport();
  else if (command === 'cleanup-cloud') await cleanupMirrorCloud();
  else if (command === 'proof') await proofMirror();
  else {
    console.error('Usage: skyevault-living-repo-mirror.mjs sync|status|restore|export|unlock-export|cleanup-cloud|proof [--upload] [--repo-root=.]');
    process.exit(1);
  }
} catch (error) {
  console.error(error.stack || error.message);
  process.exit(1);
}
