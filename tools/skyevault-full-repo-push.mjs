#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { cleanBearer, resolveZeroOsGateAuth } from './lib/zero-os-gate-auth.mjs';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

function argValue(name, fallback = '') {
  const prefix = `${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || fallback;
}

function parseEnv(file) {
  const values = {};
  if (!fs.existsSync(file)) return values;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    values[match[1]] = value;
  }
  return values;
}

const env = {
  ...parseEnv(path.join(repoRoot, 'SkyeVault-Drop/.env')),
  ...parseEnv(path.join(repoRoot, '.env')),
  ...process.env
};
for (const [key, value] of Object.entries(env)) {
  if (value !== undefined && value !== null) process.env[key] = String(value);
}
if (!process.env.R2_CONFIG_PREFIX && !process.env.R2_CONFIG_FOLDER_ID) process.env.R2_CONFIG_PREFIX = 'vault-system';
if (!process.env.R2_BUCKET && !process.env.S3_BUCKET) process.env.R2_BUCKET = 'client-drop-vault';

const SOURCE_CUSTODY_DIR_EXCLUDES = [
  'node_modules',
  '.next',
  'dist',
  'build',
  '.netlify',
  '.wrangler',
  '.wrangler-dry-run',
  '.cache',
  '.tmp',
  '.1',
  'test-artifacts',
  'test-results',
  'download-handoffs',
  'backups',
  'wal_archive',
  '.staffing-db',
  '.skyevault-out'
];

const SOURCE_CUSTODY_MEDIA_EXTS = [
  '.3gp',
  '.aac',
  '.aiff',
  '.ape',
  '.avif',
  '.flac',
  '.gif',
  '.heic',
  '.heif',
  '.jpeg',
  '.jpg',
  '.m4a',
  '.m4v',
  '.mkv',
  '.mov',
  '.mp3',
  '.mp4',
  '.ogg',
  '.opus',
  '.png',
  '.psd',
  '.raw',
  '.tif',
  '.tiff',
  '.wav',
  '.webm',
  '.webp'
];

function cleanName(value, fallback = 'MetrAIyux-0S') {
  return String(value || fallback).replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || fallback;
}

function randBase64(bytes = 48) {
  return crypto.randomBytes(bytes).toString('base64');
}

function stamp() {
  return new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function numberValue(name, fallback) {
  const value = Number(argValue(`--${name}`, env[`SKYEVAULT_FULL_REPO_${name.toUpperCase().replace(/-/g, '_')}`] || fallback));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function integerValue(name, fallback) {
  const value = Number.parseInt(argValue(`--${name}`, env[`SKYEVAULT_FULL_REPO_${name.toUpperCase().replace(/-/g, '_')}`] || fallback), 10);
  return Number.isFinite(value) ? value : fallback;
}

function archiveFormatValue() {
  const raw = String(argValue('--archive-format', argValue('--format', env.SKYEVAULT_FULL_REPO_ARCHIVE_FORMAT || 'zip'))).trim().toLowerCase();
  if (['zip', 'repo.zip', 'full-zip'].includes(raw)) return 'zip';
  if (['tar.zst', 'tar-zst', 'tarzst', 'tar'].includes(raw)) return 'tar.zst';
  throw new Error(`Unsupported --archive-format=${raw}. Use "zip" or "tar.zst".`);
}

function envBool(name, fallback = false) {
  const value = env[name];
  if (value === undefined || value === '') return fallback;
  return !['0', 'false', 'no', 'off'].includes(String(value).trim().toLowerCase());
}

function firstCsv(value = '') {
  return String(value || '').split(',').map((item) => item.trim()).filter(Boolean)[0] || '';
}

function firstValidEmail(...values) {
  for (const value of values) {
    for (const candidate of String(value || '').split(',')) {
      const email = candidate.trim().replace(/^['"]|['"]$/g, '').toLowerCase();
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return email;
    }
  }
  return '';
}

function ownerCustodyFields() {
  const ownerEmail = firstValidEmail(
    argValue('--owner-email'),
    env.SKYEVAULT_OWNER_EMAIL,
    env.OWNER_EMAIL,
    env.ADMIN_EMAILS,
    env.METRAIYUX_0S_SKYGATE_ADMIN_EMAILS,
    env.LEGAL_REVIEW_ADMIN_EMAIL,
    env.RESEND_FROM_EMAIL,
    env.ZOHO_DEFAULT_FROM,
    env.SKYEVAULT_CLIENT_EMAIL
  ) || 'owner@metraiyux.local';
  const ownerName = String(
    argValue('--owner-name')
    || env.SKYEVAULT_OWNER_NAME
    || env.OWNER_NAME
    || env.GIT_AUTHOR_NAME
    || '0S Founder Account'
  ).trim();
  return {
    ownerEmail,
    ownerName,
    ownerWorkspaceId: String(env.SKYEVAULT_OWNER_WORKSPACE_ID || 'metraiyux-0s-owner').trim(),
    ownerWorkspaceSlug: String(env.SKYEVAULT_OWNER_WORKSPACE_SLUG || 'metraiyux-0s').trim(),
    ownerSubject: String(env.SKYEVAULT_OWNER_SUBJECT || 'metraiyux-owner-admin').trim(),
    ownerAccountId: String(env.SKYEVAULT_OWNER_ACCOUNT_ID || 'founder-metraiyux-0s-owner').trim(),
    custodyScope: 'owner-private',
    vaultVisibility: 'owner-only',
    accessPolicy: 'shared-gate-owner-admin-only',
    clientVaultVisible: false,
    clientVaultDownloadAllowed: false
  };
}

function sourceCustodyMode() {
  if (
    args.includes('--literal-full')
    || args.includes('--all-bytes')
    || args.includes('--no-source-custody')
    || envBool('SKYEVAULT_FULL_REPO_LITERAL', false)
    || envBool('SKYEVAULT_FULL_REPO_ALL_BYTES', false)
  ) {
    return false;
  }
  return args.includes('--source-custody') || envBool('SKYEVAULT_FULL_REPO_SOURCE_CUSTODY', false);
}

function sourceCustodyZipExcludes(repoBase) {
  const patterns = [];
  for (const dir of SOURCE_CUSTODY_DIR_EXCLUDES) {
    patterns.push(`${repoBase}/${dir}/*`, `${repoBase}/*/${dir}/*`, `${repoBase}/*/*/${dir}/*`, `${repoBase}/*/*/*/${dir}/*`);
  }
  for (const ext of SOURCE_CUSTODY_MEDIA_EXTS) {
    patterns.push(`*${ext}`, `*${ext.toUpperCase()}`);
  }
  return patterns;
}

function sourceCustodyTarExcludes(repoBase) {
  const patterns = [];
  for (const dir of SOURCE_CUSTODY_DIR_EXCLUDES) {
    patterns.push(`${repoBase}/${dir}`, `${repoBase}/*/${dir}`, `${repoBase}/*/*/${dir}`, `${repoBase}/*/*/*/${dir}`);
  }
  for (const ext of SOURCE_CUSTODY_MEDIA_EXTS) {
    patterns.push(`*${ext}`, `*${ext.toUpperCase()}`);
  }
  return patterns;
}

function vaultBaseUrl() {
  const explicit = argValue('--base-url', '');
  const workerUrl = env.SKYEVAULT_DROP_WORKER_URL || env.SKYEVAULT_DROP_CLOUDFLARE_URL || '';
  const configured = explicit || workerUrl || env.SKYEVAULT_DROP_URL || env.URL || '';
  const fallback = 'https://skyevault-drop.graylondonskyes.workers.dev';
  if (!explicit && /netlify\.app/i.test(configured) && env.SKYEVAULT_ALLOW_NETLIFY_VAULT_URL !== '1') {
    return (workerUrl || fallback).replace(/\/$/, '');
  }
  return String(configured || fallback).replace(/\/$/, '');
}

function directR2Mode() {
  return args.includes('--direct-r2') || envBool('SKYEVAULT_FULL_REPO_DIRECT_R2', false);
}

function directR2Destination(sessionBody) {
  const prefix = argValue(
    '--direct-r2-prefix',
    env.SKYEVAULT_FULL_REPO_DIRECT_R2_PREFIX
      || env.SKYEVAULT_DIRECT_R2_PREFIX
      || env.SKYEVAULT_DESTINATION_PREFIX
      || 'client-uploads/primary'
  );
  return {
    id: argValue('--destination-id', env.SKYEVAULT_DESTINATION_ID || 'primary') || 'primary',
    name: env.SKYEVAULT_DESTINATION_NAME || 'Primary Production Intake',
    role: 'primary',
    priority: 1,
    folderId: prefix,
    maxFileSizeGb: numberValue('max-gb', 100),
    accept: '*',
    enabled: true,
    directR2: true,
    workspaceId: sessionBody.workspaceId
  };
}

let directR2ModulePromise = null;

function directR2Modules() {
  if (!directR2ModulePromise) {
    directR2ModulePromise = Promise.all([
      import('../SkyeVault-Drop/netlify/functions/_lib/google-drive.js'),
      import('../SkyeVault-Drop/netlify/functions/_lib/config.js')
    ]).then(([drive, config]) => ({ drive, config }));
  }
  return directR2ModulePromise;
}

function portalHeaders(portalKey, gateBearer = '') {
  const headers = { 'content-type': 'application/json' };
  if (portalKey) headers['x-portal-key'] = portalKey;
  const bearer = cleanBearer(gateBearer);
  if (bearer) {
    headers.authorization = `Bearer ${bearer}`;
    headers['x-skye-gate-session'] = bearer;
    headers['x-free99-gate-session'] = bearer;
  }
  return headers;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, payload, headers, label) {
  const retries = Number(env.SKYEVAULT_UPLOAD_RETRIES || 3);
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    }).catch((error) => ({ ok: false, status: 0, text: async () => error.message }));
    const text = await response.text();
    let data = {};
    try {
      data = JSON.parse(text || '{}');
    } catch {
      data = { ok: false, error: text.slice(0, 500) };
    }
    if (response.ok && data.ok !== false) return data;
    if (attempt === retries || ![0, 408, 429, 500, 502, 503, 504].includes(response.status)) {
      throw new Error(`${label} failed ${response.status}: ${data.error || text.slice(0, 500)}`);
    }
    await sleep(750 * 2 ** attempt);
  }
  throw new Error(`${label} failed.`);
}

async function putPart(uploadUrl, body, label) {
  const retries = Number(env.SKYEVAULT_UPLOAD_RETRIES || 3);
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const response = await fetch(uploadUrl, { method: 'PUT', body }).catch((error) => ({ ok: false, status: 0, headers: new Headers(), text: async () => error.message }));
    const text = response.ok ? '' : await response.text().catch(() => '');
    if (response.ok) {
      return (response.headers.get('etag') || response.headers.get('ETag') || '').replace(/^"|"$/g, '');
    }
    if (attempt === retries || ![0, 408, 429, 500, 502, 503, 504].includes(response.status)) {
      throw new Error(`${label} failed ${response.status}: ${text.slice(0, 500)}`);
    }
    await sleep(750 * 2 ** attempt);
  }
  throw new Error(`${label} failed.`);
}

function appendLog(file, line) {
  fs.appendFileSync(file, `${line}\n`);
}

function exitPromise(child, name, allowed = [0]) {
  return new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', (code) => {
      if (allowed.includes(code)) resolve(code);
      else reject(new Error(`${name} exited with status ${code}.`));
    });
  });
}

function sha256File(file) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(file);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

function readJsonIfExists(file) {
  if (!file || !fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

async function main() {
  const repo = path.resolve(argValue('--repo', repoRoot));
  const repoName = cleanName(argValue('--repo-name', path.basename(repo)));
  const parent = path.dirname(repo);
  const repoBase = path.basename(repo);
  const runStamp = stamp();
  const outDir = path.resolve(argValue('--out-dir', path.join(os.tmpdir(), `skyevault-full-repo-${repoName}-${runStamp}`)));
  const maxGb = numberValue('max-gb', 100);
  const archiveFormat = archiveFormatValue();
  const sourceCustody = sourceCustodyMode();
  const ownerCustody = ownerCustodyFields();
  const zipLevel = Math.max(0, Math.min(9, integerValue('zip-level', archiveFormat === 'zip' ? 0 : 1)));
  const zipUploadConcurrency = archiveFormat === 'zip' ? Math.max(1, Math.min(32, integerValue('zip-upload-concurrency', 8))) : 1;
  const keepZipStage = args.includes('--keep-zip-stage') || env.SKYEVAULT_FULL_REPO_KEEP_ZIP_STAGE === '1';
  const uploadDirectRestoreKit = (
    args.includes('--upload-direct-restore-kit')
    || env.SKYEVAULT_FULL_REPO_UPLOAD_DIRECT_RESTORE_KIT === '1'
  ) && !args.includes('--skip-direct-restore-kit-upload') && env.SKYEVAULT_FULL_REPO_SKIP_DIRECT_RESTORE_KIT_UPLOAD !== '1';
  const skipDirectRestoreKitUpload = !uploadDirectRestoreKit;
  const declaredMaxBytes = Math.floor(maxGb * 1024 * 1024 * 1024);
  const baseUrl = vaultBaseUrl();
  const useDirectR2 = directR2Mode();
  const portalKey = env.SKYEVAULT_PORTAL_KEY || env.CLIENT_PORTAL_KEY || '';
  const gateAuth = await resolveZeroOsGateAuth({ env });
  const headers = portalHeaders(portalKey, gateAuth.token);
  const artifactPassphrase = randBase64(48);
  const artifactPepper = crypto.randomBytes(32).toString('hex');
  const controlPassphrase = randBase64(48);
  const controlPepper = crypto.randomBytes(32).toString('hex');
  const encryptedExtension = archiveFormat === 'zip' ? 'zip.enc' : 'tar.zst.enc';
  const fileName = `${repoName}-full-repo-${runStamp}.${encryptedExtension}`;
  const restoreArchiveName = archiveFormat === 'zip' ? fileName.replace(/\.enc$/, '') : '';
  const zipStagingDir = archiveFormat === 'zip'
    ? path.resolve(argValue('--staging-dir', path.join(os.tmpdir(), `skyevault-full-repo-zip-stage-${repoName}-${runStamp}`)))
    : '';
  const zipArchivePath = archiveFormat === 'zip' ? path.join(zipStagingDir, restoreArchiveName) : '';
  const zipEncryptedStagePath = archiveFormat === 'zip' ? path.join(zipStagingDir, fileName) : '';
  let precomputedEncryptedZip = null;
  const logFile = path.join(outDir, 'full-repo-stream-upload.log');

  fs.mkdirSync(outDir, { recursive: true, mode: 0o700 });
  fs.writeFileSync(path.join(outDir, `${repoName}-artifact-key-material.txt`), `${artifactPassphrase}:${artifactPepper}`, { mode: 0o600 });
  fs.writeFileSync(path.join(outDir, 'UNLOCK_CODES.txt'), [
    `${repoName} full repo SkyDrive secret pack codes`,
    `Generated UTC: ${runStamp}`,
    `Artifact: ${fileName}`,
    '',
    `ARTIFACT_PASSPHRASE=${artifactPassphrase}`,
    `ARTIFACT_PEPPER=${artifactPepper}`,
    `ARTIFACT_KEY_MATERIAL=passphrase:pepper, exactly as written in ${repoName}-artifact-key-material.txt`,
    '',
    `CONTROL_PACK_PASSPHRASE=${controlPassphrase}`,
    `CONTROL_PACK_PEPPER=${controlPepper}`,
    '',
    'Do not paste these codes into chat, tickets, screenshots, commits, or public docs.',
    ''
  ].join('\n'), { mode: 0o600 });

  const sessionBody = {
    uploadModeRequested: 's3-multipart-streaming',
    streamingMultipart: true,
    clientName: argValue('--client-name', env.SKYEVAULT_CLIENT_NAME || ownerCustody.ownerName),
    clientEmail: argValue('--client-email', env.SKYEVAULT_CLIENT_EMAIL || ownerCustody.ownerEmail),
    projectName: argValue('--project-name', `${repoName} Full Repo SkyDrive Push`),
    clientReference: argValue('--client-reference', `full-repo:${runStamp}`),
    assetType: argValue('--asset-type', `Encrypted full-repo ${archiveFormat} SkyDrive artifact`),
    notes: argValue('--notes', 'Streaming encrypted full repository artifact. Unlock/control metadata is stored in a separate SkyeSecure secret pack.'),
    workspaceId: argValue('--workspace-id', env.SKYEVAULT_WORKSPACE_ID || env.SKYEVAULT_DEV_WORKSPACE_ID || ownerCustody.ownerWorkspaceId),
    developerId: argValue('--developer-id', env.SKYEVAULT_DEVELOPER_ID || ownerCustody.ownerSubject),
    developerName: argValue('--developer-name', env.SKYEVAULT_DEVELOPER_NAME || ownerCustody.ownerName),
    custodyScope: ownerCustody.custodyScope,
    vaultVisibility: ownerCustody.vaultVisibility,
    ownerAccountId: ownerCustody.ownerAccountId,
    ownerSubject: ownerCustody.ownerSubject,
    ownerEmail: ownerCustody.ownerEmail,
    ownerWorkspaceId: ownerCustody.ownerWorkspaceId,
    ownerWorkspaceSlug: ownerCustody.ownerWorkspaceSlug,
    accessPolicy: ownerCustody.accessPolicy,
    clientVaultVisible: ownerCustody.clientVaultVisible,
    clientVaultDownloadAllowed: ownerCustody.clientVaultDownloadAllowed,
    destinationId: argValue('--destination-id', env.SKYEVAULT_DESTINATION_ID || ''),
    usageRightsAccepted: true,
    retentionAcknowledged: true,
    portalKey,
    fileName,
    fileSize: declaredMaxBytes,
    submissionFileCount: 1,
    submissionTotalBytes: declaredMaxBytes,
    mimeType: 'application/octet-stream'
  };

  const localPlan = {
    schema: 'skyevault.full-repo-stream.plan.v1',
    createdAt: new Date().toISOString(),
    repo,
    outDir,
    maxGb,
    baseUrl,
    directR2: useDirectR2 ? {
      enabled: true,
      target: 'cloudflare-r2',
      note: 'Bypasses the SkyeVault HTTP Worker only for the data plane; artifact and receipt ledger still land in the SkyeVault R2 bucket.'
    } : { enabled: false },
    fileName,
    ownerCustody: {
      custodyScope: ownerCustody.custodyScope,
      vaultVisibility: ownerCustody.vaultVisibility,
      ownerAccountId: ownerCustody.ownerAccountId,
      ownerSubject: ownerCustody.ownerSubject,
      ownerWorkspaceId: ownerCustody.ownerWorkspaceId,
      accessPolicy: ownerCustody.accessPolicy
    },
    archiveFormat,
    zipLevel: archiveFormat === 'zip' ? zipLevel : undefined,
    zipUploadConcurrency: archiveFormat === 'zip' ? zipUploadConcurrency : undefined,
    zipStagingDir: archiveFormat === 'zip' ? zipStagingDir : undefined,
    zipUploadMode: archiveFormat === 'zip' ? 'staged-encrypted-concurrent-multipart' : undefined,
    sourceCustody: sourceCustody ? {
      enabled: true,
      includes: ['.git history', 'tracked source files', 'untracked source files', 'env/config/secrets inside repo tree'],
      excludes: {
        directories: SOURCE_CUSTODY_DIR_EXCLUDES,
        mediaExtensions: SOURCE_CUSTODY_MEDIA_EXTS
      },
      note: 'Source custody excludes dependency/cache/build output and production media, while keeping source code, local config, secrets, and Git history encrypted inside the artifact.'
    } : { enabled: false },
    directRestoreKitUpload: uploadDirectRestoreKit
      ? 'explicitly-enabled'
      : 'disabled-by-default; use --upload-direct-restore-kit only for private controlled recovery lanes',
    control: 'SkyDrive artifact + SkyeSecure unlock/control pack'
  };
  fs.writeFileSync(path.join(outDir, 'PLAN.json'), `${JSON.stringify(localPlan, null, 2)}\n`);
  console.log(`Full repo SkyDrive stream plan: ${path.join(outDir, 'PLAN.json')}`);
  console.log(`Unlock codes: ${path.join(outDir, 'UNLOCK_CODES.txt')}`);
  if (dryRun) return;

  const keyFile = path.join(outDir, `${repoName}-artifact-key-material.txt`);

  if (archiveFormat === 'zip') {
    fs.mkdirSync(zipStagingDir, { recursive: true, mode: 0o700 });
    const zipArgs = ['-q', '-r', '-y', `-${zipLevel}`, zipArchivePath, repoBase];
    const excludePatterns = [];
    for (const candidate of [outDir, zipStagingDir]) {
      const relative = path.relative(repo, candidate).replace(/\\/g, '/');
      if (relative && !relative.startsWith('..') && !path.isAbsolute(relative)) {
        excludePatterns.push(`${repoBase}/${relative}/*`);
      }
    }
    if (excludePatterns.length) zipArgs.push('-x', ...excludePatterns);
    if (sourceCustody) zipArgs.push('-x', ...sourceCustodyZipExcludes(repoBase));
    appendLog(logFile, `Creating ZIP stage ${zipArchivePath}`);
    const zip = spawn('zip', zipArgs, { cwd: parent, stdio: ['ignore', 'ignore', 'pipe'] });
    zip.stderr.on('data', (chunk) => appendLog(logFile, `[zip] ${chunk.toString().trim()}`));
    await exitPromise(zip, 'zip', [0]);
    const zipBytes = fs.statSync(zipArchivePath).size;
    appendLog(logFile, `ZIP stage ready ${zipArchivePath} (${zipBytes} bytes)`);

    appendLog(logFile, `Encrypting ZIP stage to ${zipEncryptedStagePath}`);
    const encrypt = spawn('openssl', ['enc', '-aes-256-cbc', '-salt', '-pbkdf2', '-iter', '700000', '-md', 'sha256', '-pass', `file:${keyFile}`, '-in', zipArchivePath, '-out', zipEncryptedStagePath], { stdio: ['ignore', 'ignore', 'pipe'] });
    encrypt.stderr.on('data', (chunk) => appendLog(logFile, `[openssl] ${chunk.toString().trim()}`));
    await exitPromise(encrypt, 'openssl', [0]);
    const encryptedZipBytes = fs.statSync(zipEncryptedStagePath).size;
    appendLog(logFile, `Encrypted ZIP stage ready ${zipEncryptedStagePath} (${encryptedZipBytes} bytes)`);
    if (!keepZipStage) {
      fs.rmSync(zipArchivePath, { force: true });
      appendLog(logFile, `Removed plaintext ZIP stage ${zipArchivePath}`);
    }
    const encryptedZipSha256 = await sha256File(zipEncryptedStagePath);
    precomputedEncryptedZip = { file: zipEncryptedStagePath, bytes: encryptedZipBytes, sha256: encryptedZipSha256 };
    sessionBody.fileSize = encryptedZipBytes;
    sessionBody.submissionTotalBytes = encryptedZipBytes;
    sessionBody.fileFingerprint = {
      algorithm: 'SHA-256',
      mode: 'encrypted-full-repo-artifact',
      value: encryptedZipSha256,
      bytesHashed: encryptedZipBytes,
      generatedAt: new Date().toISOString(),
      note: `SHA-256 of encrypted ${archiveFormat} artifact before vault upload.`
    };
  }

  let directR2 = null;
  let session = null;
  if (useDirectR2) {
    const modules = await directR2Modules();
    const destination = directR2Destination(sessionBody);
    const sessionId = modules.config.newSessionId();
    const directUploadInput = {
      ...sessionBody,
      sessionId,
      chunkSizeMb: Number(env.SKYEVAULT_FULL_REPO_DIRECT_R2_CHUNK_MB || env.SKYEVAULT_CHUNK_SIZE_MB || 64)
    };
    session = await modules.drive.createStreamingMultipartSession(destination, directUploadInput);
    await modules.config.saveSessionManifest({
      sessionId,
      status: 'pending',
      createdAt: new Date().toISOString(),
      destination,
      file: {
        name: fileName,
        size: sessionBody.fileSize,
        mimeType: sessionBody.mimeType,
        fingerprint: sessionBody.fileFingerprint || null
      },
      intake: {
        clientName: sessionBody.clientName,
        clientEmail: sessionBody.clientEmail,
        projectName: sessionBody.projectName,
        clientReference: sessionBody.clientReference,
        assetType: sessionBody.assetType,
        notes: sessionBody.notes,
        workspaceId: sessionBody.workspaceId,
        developerId: sessionBody.developerId,
        developerName: sessionBody.developerName,
        accessType: 'owner-direct-r2'
      },
      access: {
        type: 'owner-direct-r2',
        workspaceId: sessionBody.workspaceId,
        developerId: sessionBody.developerId,
        developerName: sessionBody.developerName
      },
      policy: {
        directR2: true,
        streamingMultipart: true,
        repoPushPolicy: {
          kind: 'full-repo-push',
          mode: 'owner-direct-r2',
          plan: 'owner-direct-r2-unlimited',
          maxGb
        }
      },
      attempts: [],
      uploadUrlHash: null
    });
    session = {
      ...session,
      ok: true,
      sessionId,
      destination: {
        id: destination.id,
        name: destination.name,
        role: destination.role,
        priority: destination.priority
      },
      directR2: true
    };
    directR2 = { ...modules, destination };
  } else {
    session = await fetchJson(`${baseUrl}/api/upload-session`, sessionBody, headers, 'upload-session');
  }
  appendLog(logFile, `Upload session ${session.sessionId} object ${session.objectKey}`);
  const chunkSize = Number(session.chunkSize || 64 * 1024 * 1024);
  const partBatch = Math.max(1, Math.min(250, Number(env.SKYEVAULT_STREAM_PART_URL_BATCH || 64)));
  const streamUploadConcurrency = Math.max(
    1,
    Math.min(
      16,
      Number(
        env.SKYEVAULT_FULL_REPO_STREAM_UPLOAD_CONCURRENCY
        || env.SKYEVAULT_FULL_REPO_TAR_UPLOAD_CONCURRENCY
        || Math.min(4, zipUploadConcurrency)
      )
    )
  );
  const completedParts = [];
  let encryptedBytes = 0;
  let sha256 = '';
  let partNumber = 1;
  let pending = Buffer.alloc(0);
  let partUrls = [];

  async function nextPartUrl() {
    if (directR2) {
      return directR2.drive.createMultipartPartUrl(session.objectKey, session.uploadId, partNumber);
    }
    if (!partUrls.length) {
      const partNumbers = Array.from({ length: partBatch }, (_, index) => partNumber + index);
      const batch = await fetchJson(`${baseUrl}/api/upload-part-url`, {
        ...sessionBody,
        sessionId: session.sessionId,
        destinationId: session.destination.id,
        objectKey: session.objectKey,
        uploadId: session.uploadId,
        partNumbers
      }, headers, 'upload-part-url');
      partUrls = batch.parts || [];
    }
    return partUrls.shift()?.uploadUrl;
  }

  async function uploadChunk(chunk) {
    encryptedBytes += chunk.length;
    if (encryptedBytes > declaredMaxBytes) throw new Error(`Encrypted stream exceeded declared ${maxGb} GB ceiling.`);
    const uploadUrl = await nextPartUrl();
    if (!uploadUrl) throw new Error(`No upload URL was returned for part ${partNumber}.`);
    const eTag = await putPart(uploadUrl, chunk, `R2 part ${partNumber}`);
    completedParts.push({ partNumber, eTag });
    appendLog(logFile, `Uploaded part ${partNumber} (${chunk.length} bytes)`);
    partNumber += 1;
  }

  async function uploadChunkAt(currentPartNumber, chunk) {
    encryptedBytes += chunk.length;
    if (encryptedBytes > declaredMaxBytes) throw new Error(`Encrypted stream exceeded declared ${maxGb} GB ceiling.`);
    const uploadUrl = directR2
      ? directR2.drive.createMultipartPartUrl(session.objectKey, session.uploadId, currentPartNumber)
      : (await fetchPartUrls([currentPartNumber])).find((part) => Number(part.partNumber) === currentPartNumber)?.uploadUrl;
    if (!uploadUrl) throw new Error(`No upload URL was returned for part ${currentPartNumber}.`);
    const eTag = await putPart(uploadUrl, chunk, `R2 part ${currentPartNumber}`);
    completedParts[currentPartNumber - 1] = { partNumber: currentPartNumber, eTag };
    appendLog(logFile, `Uploaded part ${currentPartNumber} (${chunk.length} bytes)`);
  }

  async function fetchPartUrls(partNumbers) {
    if (directR2) {
      return partNumbers.map((partNumber) => ({
        partNumber,
        uploadUrl: directR2.drive.createMultipartPartUrl(session.objectKey, session.uploadId, partNumber)
      }));
    }
    const batch = await fetchJson(`${baseUrl}/api/upload-part-url`, {
      ...sessionBody,
      sessionId: session.sessionId,
      destinationId: session.destination.id,
      objectKey: session.objectKey,
      uploadId: session.uploadId,
      partNumbers
    }, headers, 'upload-part-url');
    return batch.parts || [];
  }

  async function uploadFileConcurrently(file) {
    const size = fs.statSync(file).size;
    if (size > declaredMaxBytes) throw new Error(`Encrypted file exceeded declared ${maxGb} GB ceiling.`);
    const totalParts = Math.ceil(size / chunkSize);
    const urls = new Map();
    for (const part of session.parts || []) {
      if (part?.partNumber && part.uploadUrl) urls.set(Number(part.partNumber), part.uploadUrl);
    }
    appendLog(logFile, `Preparing ${totalParts} multipart URLs for concurrent upload (${zipUploadConcurrency} workers; ${urls.size} returned by session)`);
    for (let start = 1; start <= totalParts; start += partBatch) {
      const end = Math.min(totalParts, start + partBatch - 1);
      const partNumbers = Array.from({ length: end - start + 1 }, (_, index) => start + index);
      const missingPartNumbers = partNumbers.filter((partNumber) => !urls.has(partNumber));
      if (missingPartNumbers.length) {
        for (const part of await fetchPartUrls(missingPartNumbers)) urls.set(part.partNumber, part.uploadUrl);
      }
    }
    const fd = await fs.promises.open(file, 'r');
    let nextFilePart = 1;
    const hashPromise = precomputedEncryptedZip?.file === file
      ? Promise.resolve(precomputedEncryptedZip.sha256)
      : sha256File(file);
    async function worker() {
      while (true) {
        const currentPart = nextFilePart;
        nextFilePart += 1;
        if (currentPart > totalParts) break;
        const offset = (currentPart - 1) * chunkSize;
        const length = Math.min(chunkSize, size - offset);
        const buffer = Buffer.allocUnsafe(length);
        const { bytesRead } = await fd.read(buffer, 0, length, offset);
        const uploadUrl = urls.get(currentPart);
        if (!uploadUrl) throw new Error(`No upload URL was returned for part ${currentPart}.`);
        const body = bytesRead === length ? buffer : buffer.subarray(0, bytesRead);
        const eTag = await putPart(uploadUrl, body, `R2 part ${currentPart}`);
        completedParts[currentPart - 1] = { partNumber: currentPart, eTag };
        appendLog(logFile, `Uploaded part ${currentPart} (${body.length} bytes)`);
      }
    }
    try {
      await Promise.all(Array.from({ length: Math.min(zipUploadConcurrency, totalParts) }, () => worker()));
    } finally {
      await fd.close();
    }
    return { bytes: size, sha256: await hashPromise };
  }

  if (archiveFormat === 'zip') {
    const result = await uploadFileConcurrently(zipEncryptedStagePath);
    encryptedBytes = result.bytes;
    sha256 = result.sha256;
  } else {
    const hash = crypto.createHash('sha256');
    const inFlightUploads = new Set();
    const uploadAndHashChunk = async (chunk) => {
      hash.update(chunk);
      const currentPartNumber = partNumber;
      partNumber += 1;
      const uploadPromise = uploadChunkAt(currentPartNumber, chunk)
        .finally(() => inFlightUploads.delete(uploadPromise));
      inFlightUploads.add(uploadPromise);
      if (inFlightUploads.size >= streamUploadConcurrency) await Promise.race(inFlightUploads);
    };
    appendLog(logFile, `Streaming tar.zst upload concurrency: ${streamUploadConcurrency}`);
    const openssl = spawn('openssl', ['enc', '-aes-256-cbc', '-salt', '-pbkdf2', '-iter', '700000', '-md', 'sha256', '-pass', `file:${keyFile}`], { stdio: ['pipe', 'pipe', 'pipe'] });
    const opensslDone = exitPromise(openssl, 'openssl', [0]);
    const archiveDone = [];
    const tarArgs = ['--warning=no-file-changed', '--ignore-failed-read'];
    if (sourceCustody) {
      for (const pattern of sourceCustodyTarExcludes(repoBase)) tarArgs.push(`--exclude=${pattern}`);
    }
    tarArgs.push('-C', parent, '-cf', '-', repoBase);
    const tar = spawn('tar', tarArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
    const zstd = spawn('zstd', ['-T0', '-3'], { stdio: ['pipe', 'pipe', 'pipe'] });
    archiveDone.push(exitPromise(tar, 'tar', [0, 1]), exitPromise(zstd, 'zstd', [0]));
    tar.stderr.on('data', (chunk) => appendLog(logFile, `[tar] ${chunk.toString().trim()}`));
    zstd.stderr.on('data', (chunk) => appendLog(logFile, `[zstd] ${chunk.toString().trim()}`));
    tar.stdout.pipe(zstd.stdin);
    zstd.stdout.pipe(openssl.stdin);
    openssl.stderr.on('data', (chunk) => appendLog(logFile, `[openssl] ${chunk.toString().trim()}`));

    for await (const chunk of openssl.stdout) {
      pending = pending.length ? Buffer.concat([pending, chunk]) : Buffer.from(chunk);
      while (pending.length >= chunkSize) {
        const next = pending.subarray(0, chunkSize);
        pending = pending.subarray(chunkSize);
        await uploadAndHashChunk(Buffer.from(next));
      }
    }
    if (pending.length) await uploadAndHashChunk(pending);
    await Promise.all(inFlightUploads);
    await Promise.all([...archiveDone, opensslDone]);
    sha256 = hash.digest('hex');
  }

  const completedFingerprint = {
    algorithm: 'SHA-256',
    mode: 'streamed-encrypted-artifact',
    value: sha256,
    bytesHashed: encryptedBytes,
    generatedAt: new Date().toISOString(),
    note: `SHA-256 of encrypted ${archiveFormat} stream uploaded to Cloudflare R2.`
  };
  let completion = null;
  if (directR2) {
    const completedObject = await directR2.drive.completeMultipartUpload(session.objectKey, session.uploadId, completedParts);
    const completedAt = new Date().toISOString();
    const driveFile = {
      ...(session.r2Object || {}),
      ...completedObject,
      id: session.objectKey,
      key: session.objectKey,
      bucket: session.bucket,
      uploadId: session.uploadId,
      parts: completedParts,
      name: fileName,
      size: String(encryptedBytes),
      mimeType: 'application/octet-stream',
      appProperties: {
        source: 'client-drop-vault',
        sessionId: session.sessionId,
        destinationId: session.destination.id,
        workspaceId: sessionBody.workspaceId,
        developerId: sessionBody.developerId,
        custodyScope: sessionBody.custodyScope,
        vaultVisibility: sessionBody.vaultVisibility,
        ownerAccountId: sessionBody.ownerAccountId,
        ownerSubject: sessionBody.ownerSubject,
        ownerWorkspaceId: sessionBody.ownerWorkspaceId,
        fileFingerprintAlgorithm: completedFingerprint.algorithm,
        fileFingerprintMode: completedFingerprint.mode,
        fileFingerprintValue: completedFingerprint.value,
        fileFingerprintBytes: String(completedFingerprint.bytesHashed),
        usageRightsAccepted: 'true',
        retentionAcknowledged: 'true'
      }
    };
    const receiptId = directR2.config.receiptIdFor(session.sessionId, session.objectKey);
    const entry = {
      id: receiptId,
      completedAt,
      sessionId: session.sessionId,
      workspaceId: sessionBody.workspaceId,
      developerId: sessionBody.developerId,
      developerName: sessionBody.developerName,
      accessType: 'owner-direct-r2',
      custodyScope: sessionBody.custodyScope,
      vaultVisibility: sessionBody.vaultVisibility,
      ownerAccountId: sessionBody.ownerAccountId,
      ownerSubject: sessionBody.ownerSubject,
      ownerEmail: sessionBody.ownerEmail,
      ownerWorkspaceId: sessionBody.ownerWorkspaceId,
      ownerWorkspaceSlug: sessionBody.ownerWorkspaceSlug,
      accessPolicy: sessionBody.accessPolicy,
      clientVaultVisible: sessionBody.clientVaultVisible,
      clientVaultDownloadAllowed: sessionBody.clientVaultDownloadAllowed,
      destinationId: session.destination.id,
      destinationName: session.destination.name,
      clientName: sessionBody.clientName,
      clientEmail: sessionBody.clientEmail,
      projectName: sessionBody.projectName,
      clientReference: sessionBody.clientReference,
      assetType: sessionBody.assetType,
      notes: sessionBody.notes,
      usageRightsAccepted: true,
      retentionAcknowledged: true,
      fileName,
      fileSize: encryptedBytes,
      mimeType: 'application/octet-stream',
      driveFile,
      fileFingerprint: completedFingerprint,
      scan: {
        status: 'skipped',
        verdict: 'owner-direct-r2-source-custody',
        reason: 'Direct R2 owner custody lane stores encrypted artifact only; source scan already ran locally before autosync.'
      }
    };
    const ledger = await directR2.config.appendLedger(entry);
    let manifestWarning = '';
    try {
      await directR2.config.markSessionManifestComplete(session.sessionId, {
        receiptId,
        driveFileId: session.objectKey,
        completedAt,
        destination: directR2.destination,
        file: { name: fileName, size: encryptedBytes, mimeType: 'application/octet-stream', fingerprint: completedFingerprint },
        intake: {
          clientName: sessionBody.clientName,
          clientEmail: sessionBody.clientEmail,
          projectName: sessionBody.projectName,
          clientReference: sessionBody.clientReference,
          assetType: sessionBody.assetType,
          workspaceId: sessionBody.workspaceId,
          developerId: sessionBody.developerId,
          developerName: sessionBody.developerName,
          accessType: 'owner-direct-r2',
          custodyScope: sessionBody.custodyScope,
          vaultVisibility: sessionBody.vaultVisibility,
          ownerAccountId: sessionBody.ownerAccountId,
          ownerSubject: sessionBody.ownerSubject,
          ownerEmail: sessionBody.ownerEmail,
          ownerWorkspaceId: sessionBody.ownerWorkspaceId,
          ownerWorkspaceSlug: sessionBody.ownerWorkspaceSlug,
          accessPolicy: sessionBody.accessPolicy,
          clientVaultVisible: sessionBody.clientVaultVisible,
          clientVaultDownloadAllowed: sessionBody.clientVaultDownloadAllowed
        },
        policy: { directR2: true }
      });
    } catch (error) {
      manifestWarning = error.message;
    }
    completion = {
      ok: true,
      directR2: true,
      entry,
      receipt: {
        id: receiptId,
        created: ledger.receiptCreated,
        fileId: ledger.receiptSaved?.id || null,
        warning: ledger.ledgerWarning || manifestWarning || null
      },
      ledger: {
        entryCount: ledger.entryCount,
        warning: ledger.ledgerWarning || ''
      },
      download: {
        ok: false,
        recoveryUrl: `${baseUrl}/#client-vault`,
        warning: 'Direct R2 owner custody mode does not mint a public signed download URL from the Worker.'
      }
    };
  } else {
    completion = await fetchJson(`${baseUrl}/api/upload-complete`, {
      ...sessionBody,
      sessionId: session.sessionId,
      destinationId: session.destination.id,
      destinationName: session.destination.name,
      driveFileId: session.objectKey,
      fileSize: encryptedBytes,
      submissionTotalBytes: encryptedBytes,
      fileFingerprint: completedFingerprint,
      driveFile: {
        ...(session.r2Object || {}),
        id: session.objectKey,
        key: session.objectKey,
        bucket: session.bucket,
        uploadId: session.uploadId,
        parts: completedParts,
        name: fileName,
        size: String(encryptedBytes),
        mimeType: 'application/octet-stream'
      }
    }, headers, 'upload-complete');
  }

  if (archiveFormat === 'zip' && !keepZipStage) {
    fs.rmSync(zipEncryptedStagePath, { force: true });
    appendLog(logFile, `Removed encrypted ZIP stage ${zipEncryptedStagePath}`);
  }

  const receipt = {
    schema: 'skyevault.full-repo-stream.receipt.v1',
    completedAt: new Date().toISOString(),
    repo,
    artifact: {
      fileName,
      archiveFormat,
      encryption: 'openssl-aes-256-cbc-pbkdf2',
      bytes: encryptedBytes,
      sha256,
      objectKey: session.objectKey,
      uploadId: session.uploadId,
      parts: completedParts.length,
      uploadMode: archiveFormat === 'zip' ? 'staged-encrypted-concurrent-multipart' : 'streamed-multipart',
      zipLevel: archiveFormat === 'zip' ? zipLevel : undefined,
      zipUploadConcurrency: archiveFormat === 'zip' ? zipUploadConcurrency : undefined
    },
    vault: completion,
    unlockMaterialPath: path.join(outDir, 'UNLOCK_CODES.txt')
  };
  fs.writeFileSync(path.join(outDir, 'SKYDRIVE_UPLOAD_RECEIPT.json'), `${JSON.stringify(receipt, null, 2)}\n`);
  const restoreLines = archiveFormat === 'zip'
    ? [
      `# ${repoName} Full Repo ZIP Restore`,
      '',
      'Download both files from the SkyeVault receipt/recovery portal:',
      '',
      `1. Encrypted artifact: ${fileName}`,
      `2. Direct restore kit: ${repoName}-full-repo-direct-restore-kit-${runStamp}.zip`,
      '',
      'The `.zip.enc` file is not directly unzip-able. It decrypts into the real ZIP first.',
      '',
      '```bash',
      `unzip ${repoName}-full-repo-direct-restore-kit-${runStamp}.zip -d restore-kit`,
      `cp restore-kit/${repoName}-artifact-key-material.txt .`,
      `openssl enc -d -aes-256-cbc -pbkdf2 -iter 700000 -md sha256 -pass file:./${repoName}-artifact-key-material.txt -in ./${fileName} -out ./${restoreArchiveName}`,
      'mkdir -p ./restore-metraiyux-0s',
      `unzip -q ./${restoreArchiveName} -d ./restore-metraiyux-0s`,
      '```',
      '',
      `ZIP file after decrypt: ${restoreArchiveName}`,
      `Artifact SHA-256: ${sha256}`,
      `Encrypted bytes: ${encryptedBytes}`,
      `R2 object key: ${session.objectKey}`,
      ''
    ]
    : [
    `# ${repoName} Full Repo Restore`,
    '',
    'Download the encrypted artifact from the SkyeVault receipt/recovery portal, place it next to the key-material file, then run:',
    '',
    '```bash',
    'mkdir -p ./restore-metraiyux-0s',
    `openssl enc -d -aes-256-cbc -pbkdf2 -iter 700000 -md sha256 -pass file:./${repoName}-artifact-key-material.txt -in ./${fileName} | tar -I zstd -xpf - -C ./restore-metraiyux-0s`,
    '```',
    '',
    `Artifact SHA-256: ${sha256}`,
    `Encrypted bytes: ${encryptedBytes}`,
    `R2 object key: ${session.objectKey}`,
    ''
    ];
  fs.writeFileSync(path.join(outDir, 'RESTORE.md'), restoreLines.join('\n'));

  let directRestoreKit = null;
  if (archiveFormat === 'zip') {
    const helperSource = path.join(repoRoot, 'tools', 'skyevault-restore-encrypted-zip.mjs');
    const kitDir = path.join(outDir, 'direct-restore-kit');
    const kitName = `${repoName}-full-repo-direct-restore-kit-${runStamp}.zip`;
    const kitPath = path.join(outDir, kitName);
    fs.mkdirSync(kitDir, { recursive: true, mode: 0o700 });
    fs.copyFileSync(keyFile, path.join(kitDir, `${repoName}-artifact-key-material.txt`));
    fs.copyFileSync(path.join(outDir, 'RESTORE.md'), path.join(kitDir, 'RESTORE.md'));
    if (fs.existsSync(helperSource)) fs.copyFileSync(helperSource, path.join(kitDir, 'skyevault-restore-encrypted-zip.mjs'));
    fs.writeFileSync(path.join(kitDir, 'README.txt'), [
      `${repoName} direct restore kit`,
      '',
      `Use this kit with ${fileName}.`,
      'The artifact is encrypted and must be decrypted before it becomes a normal ZIP.',
      '',
      'Fast restore:',
      '',
      `node skyevault-restore-encrypted-zip.mjs --artifact=./${fileName} --key-file=./${repoName}-artifact-key-material.txt --out-dir=./restore-metraiyux-0s --force`,
      '',
      'Manual restore commands are also in RESTORE.md.',
      '',
      'Keep this kit private. It contains the key material needed to unlock the encrypted artifact.',
      ''
    ].join('\n'), { mode: 0o600 });

    const zipKit = spawnSync('zip', ['-q', '-9', '-r', kitPath, '.'], { cwd: kitDir, stdio: ['ignore', 'ignore', 'pipe'] });
    if (zipKit.error) throw zipKit.error;
    if (zipKit.status) throw new Error(`direct restore kit zip failed with status ${zipKit.status}: ${zipKit.stderr?.toString() || ''}`);
    directRestoreKit = {
      fileName: kitName,
      localPath: kitPath,
      bytes: fs.statSync(kitPath).size,
      sha256: await sha256File(kitPath),
      contains: [
        'README.txt',
        'RESTORE.md',
        `${repoName}-artifact-key-material.txt`,
        fs.existsSync(helperSource) ? 'skyevault-restore-encrypted-zip.mjs' : ''
      ].filter(Boolean),
      upload: {
        status: skipDirectRestoreKitUpload ? 'local-only' : 'not-attempted',
        reason: skipDirectRestoreKitUpload
          ? 'Direct restore kit contains artifact key material. Upload is disabled by default; the encrypted SkyeSecure control pack is the vault-owned recovery lane.'
          : ''
      }
    };

    if (!skipDirectRestoreKitUpload) {
      const restoreKitLog = path.join(outDir, 'direct-restore-kit-upload.log');
      const uploadResult = spawnSync(process.execPath, [
        path.join(repoRoot, 'tools', 'skyevault-repo-push.mjs'),
        `--upload-archive=${kitPath}`,
        `--file-count=${directRestoreKit.contains.length}`,
        '--secret-excludes=0',
        '--asset-type=Full repo direct restore key kit',
        `--project-name=${repoName} Full Repo Direct Restore Kit`,
        `--client-reference=full-repo-direct-restore-kit:${runStamp}`,
        `--client-name=${sessionBody.clientName}`,
        `--client-email=${sessionBody.clientEmail}`,
        `--workspace-id=${sessionBody.workspaceId}`,
        `--developer-id=${sessionBody.developerId}`,
        `--developer-name=${sessionBody.developerName}`,
        '--mime-type=application/zip'
      ], {
        cwd: repoRoot,
        env: {
          ...process.env,
          SKYEVAULT_DROP_URL: baseUrl,
          SKYEVAULT_SKIP_GIT_STATUS: '1',
          SKYEVAULT_RETURN_DOWNLOAD_LINK: '1'
        },
        encoding: 'utf8'
      });
      fs.writeFileSync(restoreKitLog, `${uploadResult.stdout || ''}${uploadResult.stderr || ''}`, { mode: 0o600 });
      const receiptMatch = String(uploadResult.stdout || '').match(/Receipt written: (.+)/);
      const restoreKitReceipt = readJsonIfExists(receiptMatch?.[1]?.trim() || '');
      directRestoreKit.upload = {
        status: uploadResult.status === 0 ? 'uploaded' : `failed:${uploadResult.status}`,
        receiptId: restoreKitReceipt?.receiptId || '',
        sessionId: restoreKitReceipt?.sessionId || '',
        expiresAt: restoreKitReceipt?.download?.expiresAt || '',
        receiptPath: receiptMatch?.[1]?.trim() || '',
        logFile: restoreKitLog
      };
    }
  }

  async function uploadDirectR2File(file, fields = {}) {
    if (!directR2) throw new Error('Direct R2 upload is not active.');
    const bytes = fs.statSync(file).size;
    const fileSha256 = await sha256File(file);
    const uploadSessionId = directR2.config.newSessionId();
    const name = path.basename(file);
    const controlDestination = {
      ...directR2.destination,
      folderId: fields.folderId || env.SKYEVAULT_CONTROL_PACK_R2_PREFIX || `${directR2.destination.folderId}/control-packs`
    };
    const fingerprint = {
      algorithm: 'SHA-256',
      mode: fields.fingerprintMode || 'direct-r2-control-pack',
      value: fileSha256,
      bytesHashed: bytes,
      generatedAt: new Date().toISOString(),
      note: fields.fingerprintNote || 'SHA-256 of encrypted SkyeSecure control pack uploaded directly to Cloudflare R2.'
    };
    const uploadInput = {
      sessionId: uploadSessionId,
      fileName: name,
      fileSize: bytes,
      mimeType: fields.mimeType || 'application/octet-stream',
      chunkSizeMb: Number(env.SKYEVAULT_CONTROL_PACK_DIRECT_R2_CHUNK_MB || 8),
      submissionFileCount: 1,
      submissionTotalBytes: bytes,
      fileFingerprint: fingerprint,
      clientName: fields.clientName || sessionBody.clientName,
      clientEmail: fields.clientEmail || sessionBody.clientEmail,
      projectName: fields.projectName || `${repoName} Full Repo SkyDrive Control Pack`,
      clientReference: fields.clientReference || `full-repo-control-pack:${runStamp}`,
      assetType: fields.assetType || 'Encrypted SkyeSecure full-repo control pack',
      notes: fields.notes || 'Encrypted owner control pack for the matching full-repo source-custody artifact.',
      workspaceId: fields.workspaceId || sessionBody.workspaceId,
      developerId: fields.developerId || sessionBody.developerId,
      developerName: fields.developerName || sessionBody.developerName,
      custodyScope: fields.custodyScope || sessionBody.custodyScope,
      vaultVisibility: fields.vaultVisibility || sessionBody.vaultVisibility,
      ownerAccountId: fields.ownerAccountId || sessionBody.ownerAccountId,
      ownerSubject: fields.ownerSubject || sessionBody.ownerSubject,
      ownerEmail: fields.ownerEmail || sessionBody.ownerEmail,
      ownerWorkspaceId: fields.ownerWorkspaceId || sessionBody.ownerWorkspaceId,
      ownerWorkspaceSlug: fields.ownerWorkspaceSlug || sessionBody.ownerWorkspaceSlug,
      accessPolicy: fields.accessPolicy || sessionBody.accessPolicy,
      clientVaultVisible: sessionBody.clientVaultVisible,
      clientVaultDownloadAllowed: sessionBody.clientVaultDownloadAllowed,
      usageRightsAccepted: true,
      retentionAcknowledged: true
    };
    const directSession = await directR2.drive.createStreamingMultipartSession(controlDestination, uploadInput);
    await directR2.config.saveSessionManifest({
      sessionId: uploadSessionId,
      status: 'pending',
      createdAt: new Date().toISOString(),
      destination: controlDestination,
      file: { name, size: bytes, mimeType: uploadInput.mimeType, fingerprint },
      intake: {
        clientName: uploadInput.clientName,
        clientEmail: uploadInput.clientEmail,
        projectName: uploadInput.projectName,
        clientReference: uploadInput.clientReference,
        assetType: uploadInput.assetType,
        notes: uploadInput.notes,
        workspaceId: uploadInput.workspaceId,
        developerId: uploadInput.developerId,
        developerName: uploadInput.developerName,
        accessType: 'owner-direct-r2',
        custodyScope: uploadInput.custodyScope,
        vaultVisibility: uploadInput.vaultVisibility,
        ownerAccountId: uploadInput.ownerAccountId,
        ownerSubject: uploadInput.ownerSubject,
        ownerEmail: uploadInput.ownerEmail,
        ownerWorkspaceId: uploadInput.ownerWorkspaceId,
        ownerWorkspaceSlug: uploadInput.ownerWorkspaceSlug,
        accessPolicy: uploadInput.accessPolicy,
        clientVaultVisible: uploadInput.clientVaultVisible,
        clientVaultDownloadAllowed: uploadInput.clientVaultDownloadAllowed
      },
      access: {
        type: 'owner-direct-r2',
        workspaceId: uploadInput.workspaceId,
        developerId: uploadInput.developerId,
        developerName: uploadInput.developerName
      },
      policy: { directR2: true, controlPack: true },
      attempts: [],
      uploadUrlHash: null
    });

    const directChunkSize = Number(directSession.chunkSize || 8 * 1024 * 1024);
    const directParts = [];
    const fd = await fs.promises.open(file, 'r');
    try {
      let offset = 0;
      let directPartNumber = 1;
      while (offset < bytes || (bytes === 0 && directPartNumber === 1)) {
        const length = Math.min(directChunkSize, Math.max(0, bytes - offset));
        const buffer = Buffer.allocUnsafe(length);
        const { bytesRead } = length ? await fd.read(buffer, 0, length, offset) : { bytesRead: 0 };
        const body = bytesRead === length ? buffer : buffer.subarray(0, bytesRead);
        const uploadUrl = directR2.drive.createMultipartPartUrl(directSession.objectKey, directSession.uploadId, directPartNumber);
        const eTag = await putPart(uploadUrl, body, `R2 control-pack part ${directPartNumber}`);
        directParts.push({ partNumber: directPartNumber, eTag });
        appendLog(logFile, `Uploaded control pack part ${directPartNumber} (${body.length} bytes)`);
        offset += body.length;
        directPartNumber += 1;
        if (!body.length) break;
      }
    } finally {
      await fd.close();
    }
    const completedObject = await directR2.drive.completeMultipartUpload(directSession.objectKey, directSession.uploadId, directParts);
    const completedAt = new Date().toISOString();
    const driveFile = {
      ...(directSession.r2Object || {}),
      ...completedObject,
      id: directSession.objectKey,
      key: directSession.objectKey,
      bucket: directSession.bucket,
      uploadId: directSession.uploadId,
      parts: directParts,
      name,
      size: String(bytes),
      mimeType: uploadInput.mimeType
    };
    const receiptId = directR2.config.receiptIdFor(uploadSessionId, directSession.objectKey);
    const entry = {
      id: receiptId,
      completedAt,
      sessionId: uploadSessionId,
      workspaceId: uploadInput.workspaceId,
      developerId: uploadInput.developerId,
      developerName: uploadInput.developerName,
      accessType: 'owner-direct-r2',
      custodyScope: uploadInput.custodyScope,
      vaultVisibility: uploadInput.vaultVisibility,
      ownerAccountId: uploadInput.ownerAccountId,
      ownerSubject: uploadInput.ownerSubject,
      ownerEmail: uploadInput.ownerEmail,
      ownerWorkspaceId: uploadInput.ownerWorkspaceId,
      ownerWorkspaceSlug: uploadInput.ownerWorkspaceSlug,
      accessPolicy: uploadInput.accessPolicy,
      clientVaultVisible: uploadInput.clientVaultVisible,
      clientVaultDownloadAllowed: uploadInput.clientVaultDownloadAllowed,
      destinationId: controlDestination.id,
      destinationName: controlDestination.name,
      clientName: uploadInput.clientName,
      clientEmail: uploadInput.clientEmail,
      projectName: uploadInput.projectName,
      clientReference: uploadInput.clientReference,
      assetType: uploadInput.assetType,
      notes: uploadInput.notes,
      usageRightsAccepted: true,
      retentionAcknowledged: true,
      fileName: name,
      fileSize: bytes,
      mimeType: uploadInput.mimeType,
      driveFile,
      fileFingerprint: fingerprint,
      scan: {
        status: 'skipped',
        verdict: 'owner-direct-r2-control-pack',
        reason: 'Control pack is already encrypted as a SkyeSecure secret pack before upload.'
      }
    };
    const ledger = await directR2.config.appendLedger(entry);
    await directR2.config.markSessionManifestComplete(uploadSessionId, {
      receiptId,
      driveFileId: directSession.objectKey,
      completedAt,
      destination: controlDestination,
      file: { name, size: bytes, mimeType: uploadInput.mimeType, fingerprint },
      intake: {
        clientName: uploadInput.clientName,
        clientEmail: uploadInput.clientEmail,
        projectName: uploadInput.projectName,
        clientReference: uploadInput.clientReference,
        assetType: uploadInput.assetType,
        workspaceId: uploadInput.workspaceId,
        developerId: uploadInput.developerId,
        developerName: uploadInput.developerName,
        accessType: 'owner-direct-r2',
        custodyScope: uploadInput.custodyScope,
        vaultVisibility: uploadInput.vaultVisibility,
        ownerAccountId: uploadInput.ownerAccountId,
        ownerSubject: uploadInput.ownerSubject,
        ownerEmail: uploadInput.ownerEmail,
        ownerWorkspaceId: uploadInput.ownerWorkspaceId,
        ownerWorkspaceSlug: uploadInput.ownerWorkspaceSlug,
        accessPolicy: uploadInput.accessPolicy,
        clientVaultVisible: uploadInput.clientVaultVisible,
        clientVaultDownloadAllowed: uploadInput.clientVaultDownloadAllowed
      },
      policy: { directR2: true, controlPack: true }
    }).catch((error) => appendLog(logFile, `Control pack manifest completion warning: ${error.message}`));
    return {
      status: 'uploaded',
      receiptId,
      sessionId: uploadSessionId,
      objectKey: directSession.objectKey,
      bytes,
      sha256: fileSha256,
      parts: directParts.length,
      ledgerEntryCount: ledger.entryCount
    };
  }

  const controlPack = path.join(outDir, `${repoName}-skydrive-control-${runStamp}.skyesecrets`);
  const packEnv = { ...process.env, SKYE_SECURE_PASSPHRASE: controlPassphrase, SKYE_SECURE_PEPPER: controlPepper };
  const packResult = spawnSync(process.execPath, [
    path.join(repoRoot, 'tools', 'skye-secure-packs.mjs'),
    'pack',
    `--root=${outDir}`,
    '--path=UNLOCK_CODES.txt',
    `--path=${repoName}-artifact-key-material.txt`,
    '--path=RESTORE.md',
    '--path=SKYDRIVE_UPLOAD_RECEIPT.json',
    `--out=${controlPack}`,
    '--recipient=owner',
    '--passphrase-env=SKYE_SECURE_PASSPHRASE',
    '--pepper-env=SKYE_SECURE_PEPPER',
    '--workspace=owner-admin',
    `--repo=${repoName}`,
    '--project=Full Repo SkyDrive Control Pack'
  ], { cwd: repoRoot, env: packEnv, stdio: 'inherit' });
  if (packResult.error) throw packResult.error;
  if (packResult.status) throw new Error(`SkyeSecure control pack failed with status ${packResult.status}.`);

  let controlUploadStatus = 'not-attempted';
  let controlUpload = null;
  if (!args.includes('--skip-control-upload')) {
    if (directR2) {
      controlUpload = await uploadDirectR2File(controlPack);
      controlUploadStatus = 'uploaded';
    } else {
      const uploadResult = spawnSync(process.execPath, [
        path.join(repoRoot, 'tools', 'skye-secure-packs.mjs'),
        'upload',
        `--pack=${controlPack}`
      ], { cwd: repoRoot, env: process.env, stdio: 'inherit' });
      controlUploadStatus = uploadResult.status === 0 ? 'uploaded' : `failed:${uploadResult.status}`;
    }
  }

  const handoff = {
    ...receipt,
    directRestoreKit,
    controlPack,
    controlUploadStatus,
    controlUpload,
    controlPackCodes: path.join(outDir, 'UNLOCK_CODES.txt'),
    logFile
  };
  fs.writeFileSync(path.join(outDir, 'FULL_REPO_SKYDRIVE_HANDOFF.json'), `${JSON.stringify(handoff, null, 2)}\n`);
  console.log(JSON.stringify({
    ok: true,
    outDir,
    artifactBytes: encryptedBytes,
    artifactSha256: sha256,
    receiptId: completion.receipt?.id || completion.entry?.id || completion.receiptId || '',
    recoveryUrl: completion.download?.recoveryUrl || '',
    downloadUrl: completion.download?.downloadUrl || '',
    directRestoreKit: directRestoreKit ? {
      fileName: directRestoreKit.fileName,
      localPath: directRestoreKit.localPath,
      bytes: directRestoreKit.bytes,
      sha256: directRestoreKit.sha256,
      upload: directRestoreKit.upload
    } : null,
    controlPack,
    controlUploadStatus,
    controlUpload
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
