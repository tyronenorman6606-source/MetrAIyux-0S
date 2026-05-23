#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

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

function portalHeaders(portalKey) {
  const headers = { 'content-type': 'application/json' };
  if (portalKey) headers['x-portal-key'] = portalKey;
  const bearer = env.SKYEVAULT_GATE_BEARER || env.SKYEVAULT_GATE_SESSION || env.MCP_GATE_SESSION || env.FREE99_GATE_SESSION || '';
  const free99Code = env.FREE99_ADMIN_CODE || env.SKYEVAULT_FREE99_ADMIN_CODE || '';
  const adminToken = env.SKYEVAULT_ADMIN_TOKEN || env.ADMIN_TOKEN || '';
  if (bearer) {
    headers.authorization = /^Bearer\s+/i.test(bearer) ? bearer : `Bearer ${bearer}`;
    headers['x-skye-gate-session'] = bearer.replace(/^Bearer\s+/i, '');
    headers['x-free99-gate-session'] = bearer.replace(/^Bearer\s+/i, '');
  }
  if (free99Code) headers['x-free99-admin-code'] = free99Code;
  if (adminToken) headers['x-admin-token'] = adminToken;
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
  const runStamp = stamp();
  const outDir = path.resolve(argValue('--out-dir', path.join(os.tmpdir(), `skyevault-full-repo-${repoName}-${runStamp}`)));
  const maxGb = numberValue('max-gb', 100);
  const archiveFormat = archiveFormatValue();
  const zipLevel = Math.max(0, Math.min(9, integerValue('zip-level', archiveFormat === 'zip' ? 0 : 1)));
  const zipUploadConcurrency = archiveFormat === 'zip' ? Math.max(1, Math.min(32, integerValue('zip-upload-concurrency', 8))) : 1;
  const keepZipStage = args.includes('--keep-zip-stage') || env.SKYEVAULT_FULL_REPO_KEEP_ZIP_STAGE === '1';
  const skipDirectRestoreKitUpload = args.includes('--skip-direct-restore-kit-upload') || env.SKYEVAULT_FULL_REPO_SKIP_DIRECT_RESTORE_KIT_UPLOAD === '1';
  const declaredMaxBytes = Math.floor(maxGb * 1024 * 1024 * 1024);
  const baseUrl = String(env.SKYEVAULT_DROP_URL || env.URL || 'https://skyevault-drop.netlify.app').replace(/\/$/, '');
  const portalKey = env.SKYEVAULT_PORTAL_KEY || env.CLIENT_PORTAL_KEY || '';
  const headers = portalHeaders(portalKey);
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
    clientName: argValue('--client-name', env.SKYEVAULT_CLIENT_NAME || 'Owner Admin'),
    clientEmail: argValue('--client-email', env.SKYEVAULT_CLIENT_EMAIL || 'owner-admin@metraiyux.local'),
    projectName: argValue('--project-name', `${repoName} Full Repo SkyDrive Push`),
    clientReference: argValue('--client-reference', `full-repo:${runStamp}`),
    assetType: argValue('--asset-type', `Encrypted full-repo ${archiveFormat} SkyDrive artifact`),
    notes: argValue('--notes', 'Streaming encrypted full repository artifact. Unlock/control metadata is stored in a separate SkyeSecure secret pack.'),
    workspaceId: argValue('--workspace-id', env.SKYEVAULT_WORKSPACE_ID || env.SKYEVAULT_DEV_WORKSPACE_ID || 'owner-admin'),
    developerId: argValue('--developer-id', env.SKYEVAULT_DEVELOPER_ID || env.USER || 'owner-admin'),
    developerName: argValue('--developer-name', env.SKYEVAULT_DEVELOPER_NAME || 'Owner Admin'),
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
    fileName,
    archiveFormat,
    zipLevel: archiveFormat === 'zip' ? zipLevel : undefined,
    zipUploadConcurrency: archiveFormat === 'zip' ? zipUploadConcurrency : undefined,
    zipStagingDir: archiveFormat === 'zip' ? zipStagingDir : undefined,
    zipUploadMode: archiveFormat === 'zip' ? 'staged-encrypted-concurrent-multipart' : undefined,
    control: 'SkyDrive artifact + SkyeSecure unlock/control pack'
  };
  fs.writeFileSync(path.join(outDir, 'PLAN.json'), `${JSON.stringify(localPlan, null, 2)}\n`);
  console.log(`Full repo SkyDrive stream plan: ${path.join(outDir, 'PLAN.json')}`);
  console.log(`Unlock codes: ${path.join(outDir, 'UNLOCK_CODES.txt')}`);
  if (dryRun) return;

  const parent = path.dirname(repo);
  const repoBase = path.basename(repo);
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
  }

  const session = await fetchJson(`${baseUrl}/api/upload-session`, sessionBody, headers, 'upload-session');
  appendLog(logFile, `Upload session ${session.sessionId} object ${session.objectKey}`);
  const chunkSize = Number(session.chunkSize || 64 * 1024 * 1024);
  const partBatch = Math.max(1, Math.min(250, Number(env.SKYEVAULT_STREAM_PART_URL_BATCH || 64)));
  const completedParts = [];
  let encryptedBytes = 0;
  let sha256 = '';
  let partNumber = 1;
  let pending = Buffer.alloc(0);
  let partUrls = [];

  async function nextPartUrl() {
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

  async function fetchPartUrls(partNumbers) {
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
    appendLog(logFile, `Preparing ${totalParts} multipart URLs for concurrent upload (${zipUploadConcurrency} workers)`);
    for (let start = 1; start <= totalParts; start += partBatch) {
      const end = Math.min(totalParts, start + partBatch - 1);
      const partNumbers = Array.from({ length: end - start + 1 }, (_, index) => start + index);
      for (const part of await fetchPartUrls(partNumbers)) urls.set(part.partNumber, part.uploadUrl);
    }
    const fd = await fs.promises.open(file, 'r');
    let nextFilePart = 1;
    const hashPromise = sha256File(file);
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
    const originalUploadChunk = uploadChunk;
    const uploadAndHashChunk = async (chunk) => {
      hash.update(chunk);
      await originalUploadChunk(chunk);
    };
    const openssl = spawn('openssl', ['enc', '-aes-256-cbc', '-salt', '-pbkdf2', '-iter', '700000', '-md', 'sha256', '-pass', `file:${keyFile}`], { stdio: ['pipe', 'pipe', 'pipe'] });
    const opensslDone = exitPromise(openssl, 'openssl', [0]);
    const archiveDone = [];
    const tar = spawn('tar', ['--warning=no-file-changed', '--ignore-failed-read', '-C', parent, '-cf', '-', repoBase], { stdio: ['ignore', 'pipe', 'pipe'] });
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
    await Promise.all([...archiveDone, opensslDone]);
    sha256 = hash.digest('hex');
  }

  const completion = await fetchJson(`${baseUrl}/api/upload-complete`, {
    ...sessionBody,
    sessionId: session.sessionId,
    destinationId: session.destination.id,
    destinationName: session.destination.name,
    driveFileId: session.objectKey,
    fileSize: encryptedBytes,
    submissionTotalBytes: encryptedBytes,
    fileFingerprint: {
      algorithm: 'SHA-256',
      mode: 'streamed-encrypted-artifact',
      value: sha256,
      bytesHashed: encryptedBytes,
      generatedAt: new Date().toISOString(),
      note: `SHA-256 of encrypted ${archiveFormat} stream uploaded to Cloudflare R2.`
    },
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
        status: skipDirectRestoreKitUpload ? 'skipped' : 'not-attempted'
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
  if (!args.includes('--skip-control-upload')) {
    const uploadResult = spawnSync(process.execPath, [
      path.join(repoRoot, 'tools', 'skye-secure-packs.mjs'),
      'upload',
      `--pack=${controlPack}`
    ], { cwd: repoRoot, env: process.env, stdio: 'inherit' });
    controlUploadStatus = uploadResult.status === 0 ? 'uploaded' : `failed:${uploadResult.status}`;
  }

  const handoff = {
    ...receipt,
    directRestoreKit,
    controlPack,
    controlUploadStatus,
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
    controlUploadStatus
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
