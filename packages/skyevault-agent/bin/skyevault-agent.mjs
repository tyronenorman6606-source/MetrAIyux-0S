#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const VERSION = '0.2.0';
const args = process.argv.slice(2);
const command = args.find((arg) => !arg.startsWith('--')) || 'status';
const jsonMode = args.includes('--json');
const homeDir = os.homedir();
const agentRoot = path.join(homeDir, '.skyevault-agent');
const configPath = path.join(agentRoot, 'config.json');

function argValue(name, fallback = '') {
  const prefix = `${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = args.indexOf(name);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  return fallback;
}

function flag(name) {
  return args.includes(name);
}

function writeJson(file, value, mode = 0o600) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, { mode });
  try { fs.chmodSync(file, mode); } catch {}
}

function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function respond(payload, status = 0) {
  if (jsonMode || typeof payload !== 'string') console.log(JSON.stringify(payload, null, 2));
  else console.log(payload);
  process.exitCode = status;
}

function cleanSlug(value, fallback = 'workspace') {
  return String(value || fallback)
    .trim()
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 120) || fallback;
}

function loadConfig() {
  return readJson(configPath, {});
}

function gitValue(repoPath, gitArgs, fallback = '') {
  const result = spawnSync('git', gitArgs, { cwd: repoPath, encoding: 'utf8' });
  return result.status === 0 ? String(result.stdout || '').trim() : fallback;
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

function sha256FileSync(file) {
  const hash = crypto.createHash('sha256');
  const fd = fs.openSync(file, 'r');
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  try {
    let bytesRead = 0;
    do {
      bytesRead = fs.readSync(fd, buffer, 0, buffer.length, null);
      if (bytesRead > 0) hash.update(buffer.subarray(0, bytesRead));
    } while (bytesRead > 0);
  } finally {
    fs.closeSync(fd);
  }
  return hash.digest('hex');
}

function nowStamp() {
  return new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function isInside(child, parent) {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function safeRelPath(relPath) {
  const clean = String(relPath || '').replace(/\\/g, '/').replace(/^\/+/, '');
  if (!clean || clean === '.' || clean.includes('\0')) throw new Error(`Unsafe relative path: ${relPath}`);
  const normalized = path.posix.normalize(clean);
  if (normalized === '..' || normalized.startsWith('../') || path.isAbsolute(normalized)) throw new Error(`Unsafe relative path: ${relPath}`);
  return normalized;
}

function safeJoin(root, relPath) {
  const target = path.resolve(root, safeRelPath(relPath));
  if (!isInside(target, path.resolve(root))) throw new Error(`Refusing to write outside restore root: ${relPath}`);
  return target;
}

function collectManifest(repoPath, outputRoot, skipDeps, includeHashes = true) {
  const files = [];
  const skipped = [];
  let totalBytes = 0;

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      const rel = path.relative(repoPath, file).split(path.sep).join('/');
      if (isInside(file, outputRoot) || rel === '.skyevault-agent' || rel.startsWith('.skyevault-agent/')) {
        skipped.push({ path: rel, reason: 'agent-output' });
        continue;
      }
      if (rel === '.skyevault-out' || rel.startsWith('.skyevault-out/')) {
        skipped.push({ path: rel, reason: 'local-skyevault-output' });
        continue;
      }
      if (skipDeps && (rel === 'node_modules' || rel.includes('/node_modules/'))) {
        skipped.push({ path: rel, reason: 'skip-deps' });
        continue;
      }
      if (entry.isSymbolicLink()) {
        skipped.push({ path: rel, reason: 'symlink' });
        continue;
      }
      if (entry.isDirectory()) {
        walk(file);
        continue;
      }
      if (!entry.isFile()) continue;
      const stat = fs.statSync(file);
      const row = { path: rel, bytes: stat.size, mtimeMs: Math.floor(stat.mtimeMs) };
      if (includeHashes) row.sha256 = sha256FileSync(file);
      files.push(row);
      totalBytes += stat.size;
    }
  }

  walk(repoPath);
  files.sort((a, b) => a.path.localeCompare(b.path));
  return { files, skipped, totalBytes };
}

function manifestDigest(manifest) {
  const hash = crypto.createHash('sha256');
  for (const file of manifest.files || []) {
    hash.update(`${file.path}\0${file.bytes}\0${file.sha256 || ''}\0${file.mtimeMs || ''}\n`);
  }
  return hash.digest('hex');
}

function workspaceRoot(workspaceId) {
  return path.join(agentRoot, 'workspaces', cleanSlug(workspaceId));
}

function statePath(workspaceId) {
  return path.join(workspaceRoot(workspaceId), 'state.json');
}

function loadState(workspaceId) {
  return readJson(statePath(workspaceId), {});
}

function saveState(workspaceId, state) {
  writeJson(statePath(workspaceId), state);
}

function tarExcludes(repoPath, outputRoot, skipDeps) {
  const excludes = [
    '--exclude=.skyevault-agent',
    '--exclude=.skyevault-out'
  ];
  const relOut = path.relative(repoPath, outputRoot).split(path.sep).join('/');
  if (relOut && !relOut.startsWith('..')) excludes.push(`--exclude=${relOut}`);
  if (skipDeps) excludes.push('--exclude=node_modules');
  return excludes;
}

function makeTar(repoPath, outputRoot, stamp, skipDeps) {
  const tarPath = path.join(outputRoot, `repo-${stamp}.tar`);
  const tarArgs = [
    ...tarExcludes(repoPath, outputRoot, skipDeps),
    '-cf',
    tarPath,
    '-C',
    repoPath,
    '.'
  ];
  const result = spawnSync('tar', tarArgs, { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`tar failed: ${result.stderr || result.stdout || result.status}`);
  }
  return tarPath;
}

function makeTarFromDirectory(sourceDir, outputRoot, stamp, label = 'bundle') {
  const tarPath = path.join(outputRoot, `${label}-${stamp}.tar`);
  const result = spawnSync('tar', ['-cf', tarPath, '-C', sourceDir, '.'], { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`tar failed: ${result.stderr || result.stdout || result.status}`);
  }
  return tarPath;
}

function passphraseForRun() {
  const envName = argValue('--passphrase-env', 'SKYEVAULT_AGENT_PASSPHRASE');
  const fromEnv = String(process.env[envName] || '').trim();
  if (fromEnv) return { value: fromEnv, source: `env:${envName}`, envName, generated: false };
  return { value: crypto.randomBytes(36).toString('base64url'), source: 'generated-local-unlock-file', envName, generated: true };
}

async function encryptFile(input, output, passphrase) {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.scryptSync(passphrase.value, salt, 32);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  await new Promise((resolve, reject) => {
    const read = fs.createReadStream(input);
    const write = fs.createWriteStream(output, { mode: 0o600 });
    read.on('error', reject);
    write.on('error', reject);
    write.on('finish', resolve);
    read.pipe(cipher).pipe(write);
  });
  const tag = cipher.getAuthTag();
  return {
    algorithm: 'aes-256-gcm',
    kdf: 'scrypt',
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    authTag: tag.toString('hex'),
    passphraseSource: passphrase.source
  };
}

function initCommand() {
  const workspaceId = cleanSlug(argValue('--workspace', process.env.SKYEVAULT_WORKSPACE_ID || 'customer-workspace'));
  const repoPath = path.resolve(argValue('--repo', process.cwd()));
  const vaultUrl = String(argValue('--vault-url', process.env.SKYEVAULT_DROP_URL || 'https://skyevault-drop.graylondonskyes.workers.dev')).replace(/\/+$/, '');
  const config = {
    schema: 'skyevault.agent.config.v1',
    version: VERSION,
    workspaceId,
    repoPath,
    vaultUrl,
    intervalSeconds: Number(argValue('--interval-seconds', '600')) || 600,
    portalKeyEnv: argValue('--portal-key-env', 'SKYEVAULT_PORTAL_KEY'),
    bearerEnv: argValue('--bearer-env', 'SKYEVAULT_GATE_BEARER'),
    passphraseEnv: argValue('--passphrase-env', 'SKYEVAULT_AGENT_PASSPHRASE'),
    literalRepoDefault: true,
    createdAt: new Date().toISOString(),
    note: 'Bearer tokens and passphrases are read from environment variables and are not stored here.'
  };
  writeJson(configPath, config);
  respond({ ok: true, action: 'configured', configPath, config: { ...config, repoPath } });
}

function latestReceipt(workspaceId) {
  const latest = path.join(agentRoot, 'workspaces', cleanSlug(workspaceId), 'latest.json');
  return readJson(latest, null);
}

function statusCommand() {
  const config = loadConfig();
  const workspaceId = cleanSlug(argValue('--workspace', config.workspaceId || 'customer-workspace'));
  const latest = latestReceipt(workspaceId);
  respond({
    ok: true,
    schema: 'skyevault.agent.status.v1',
    version: VERSION,
    configured: Boolean(config.workspaceId),
    configPath,
    workspaceId,
    repoPath: argValue('--repo', config.repoPath || process.cwd()),
    vaultUrl: config.vaultUrl || 'https://skyevault-drop.graylondonskyes.workers.dev',
    bearerConfigured: Boolean(process.env[config.bearerEnv || 'SKYEVAULT_GATE_BEARER']),
    portalKeyConfigured: Boolean(process.env[config.portalKeyEnv || 'SKYEVAULT_PORTAL_KEY']),
    latest
  });
}

function readChunk(file, start, end) {
  const length = end - start + 1;
  const fd = fs.openSync(file, 'r');
  try {
    const buffer = Buffer.allocUnsafe(length);
    const bytesRead = fs.readSync(fd, buffer, 0, length, start);
    if (bytesRead !== length) throw new Error(`expected ${length} bytes, got ${bytesRead}`);
    return buffer;
  } finally {
    fs.closeSync(fd);
  }
}

async function postJson(url, body, headers = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text.slice(0, 500) }; }
  if (!response.ok || data.ok === false) throw new Error(data.error || `POST ${url} failed ${response.status}`);
  return data;
}

async function uploadEncryptedArtifact(config, receipt, artifactPath, artifactSha256) {
  const portalKey = process.env[config.portalKeyEnv || 'SKYEVAULT_PORTAL_KEY'] || '';
  const bearer = process.env[config.bearerEnv || 'SKYEVAULT_GATE_BEARER'] || '';
  if (!portalKey) return { ok: false, skipped: true, reason: 'missing_portal_key_env' };

  const baseUrl = String(config.vaultUrl || 'https://skyevault-drop.graylondonskyes.workers.dev').replace(/\/+$/, '');
  const fileName = path.basename(artifactPath);
  const stat = fs.statSync(artifactPath);
  const headers = {
    'x-portal-key': portalKey
  };
  if (bearer) {
    const cleanBearer = bearer.replace(/^Bearer\s+/i, '');
    headers.authorization = /^Bearer\s+/i.test(bearer) ? bearer : `Bearer ${bearer}`;
    headers['x-skye-gate-session'] = cleanBearer;
    headers['x-free99-gate-session'] = cleanBearer;
  }
  const body = {
    clientName: config.clientName || receipt.workspaceId,
    clientEmail: config.clientEmail || '',
    projectName: `${receipt.repoName} SkyeVault Agent ${receipt.kind === 'delta' ? 'Delta' : 'Snapshot'}`,
    clientReference: `skyevault-agent:${receipt.workspaceId}:${receipt.stamp}`,
    assetType: `SkyeVault Agent encrypted repo ${receipt.kind === 'delta' ? 'delta' : 'snapshot'}`,
    notes: 'Encrypted repo custody artifact generated by the paid SkyeVault Agent.',
    clientRequestId: `skyevault-agent-${receipt.stamp}`,
    submissionId: `skyevault-agent-${receipt.workspaceId}-${receipt.stamp}`,
    workspaceId: receipt.workspaceId,
    repoId: receipt.repoName,
    usageRightsAccepted: true,
    retentionAcknowledged: true,
    portalKey,
    fileName,
    fileSize: stat.size,
    mimeType: 'application/octet-stream',
    fileFingerprint: {
      algorithm: 'SHA-256',
      mode: receipt.kind === 'delta' ? 'delta' : 'full',
      value: artifactSha256,
      bytesHashed: stat.size,
      generatedAt: new Date().toISOString()
    },
    submissionFileCount: 1,
    submissionTotalBytes: stat.size,
    archiveFileCount: receipt.fileCount || receipt.changedFileCount || 1
  };
  const session = await postJson(`${baseUrl}/api/upload-session`, body, headers);
  const completedParts = [];
  for (const part of session.parts || []) {
    const chunk = readChunk(artifactPath, part.start, part.end);
    const response = await fetch(part.uploadUrl, { method: 'PUT', body: chunk });
    if (!response.ok) throw new Error(`R2 upload part ${part.partNumber} failed ${response.status}`);
    completedParts.push({
      partNumber: part.partNumber,
      eTag: (response.headers.get('etag') || '').replace(/^"|"$/g, '')
    });
  }
  const completion = await postJson(`${baseUrl}/api/upload-complete`, {
    ...body,
    sessionId: session.sessionId,
    destinationId: session.destination?.id || 'primary',
    destinationName: session.destination?.name || 'primary',
    driveFileId: session.objectKey,
    driveFile: {
      ...(session.r2Object || {}),
      id: session.objectKey,
      key: session.objectKey,
      bucket: session.bucket,
      uploadId: session.uploadId,
      parts: completedParts,
      name: fileName,
      size: String(stat.size),
      mimeType: 'application/octet-stream'
    }
  }, headers);
  return {
    ok: true,
    vaultApi: baseUrl,
    authMode: bearer ? 'portal-key-plus-shared-gate' : 'portal-key',
    sessionId: session.sessionId,
    receiptId: completion.receipt?.id || completion.entry?.id || '',
    completedParts: completedParts.length,
    fileName,
    fileSize: stat.size,
    sha256: artifactSha256
  };
}

function repoMeta(repoPath) {
  return {
    branch: gitValue(repoPath, ['branch', '--show-current'], 'unknown'),
    head: gitValue(repoPath, ['rev-parse', 'HEAD'], 'unknown'),
    dirtyEntries: gitValue(repoPath, ['status', '--short'], '').split(/\r?\n/).filter(Boolean).length,
    repoName: path.basename(repoPath) || 'repo'
  };
}

function writeManifest(outputRoot, receipt, manifest) {
  const manifestPath = path.join(outputRoot, 'manifest.json');
  writeJson(manifestPath, {
    schema: 'skyevault.agent.file-manifest.v1',
    generatedAt: receipt.generatedAt,
    workspaceId: receipt.workspaceId,
    repoPath: receipt.repoPath,
    repoName: receipt.repoName,
    digest: receipt.manifestDigest,
    scanMode: receipt.scanMode,
    files: manifest.files,
    skipped: manifest.skipped
  });
  return manifestPath;
}

function attachUnlockReceipt(outputRoot, receipt, encryptedPath, passphrase) {
  if (passphrase.generated) {
    const unlockPath = path.join(outputRoot, 'unlock.local.json');
    writeJson(unlockPath, {
      schema: 'skyevault.agent.local-unlock.v1',
      generatedAt: receipt.generatedAt,
      artifact: path.basename(encryptedPath),
      passphrase: passphrase.value,
      warning: 'Keep this local. Anyone with this passphrase and the encrypted artifact can decrypt the snapshot.'
    });
    receipt.unlock = { mode: 'generated-local-file', path: unlockPath };
  } else {
    receipt.unlock = { mode: 'environment', env: passphrase.envName };
  }
}

async function writeReceiptAndUpload({ config, workspaceId, outputRoot, receipt, encryptedPath, artifactSha256 }) {
  if (flag('--upload')) {
    try {
      receipt.upload = await uploadEncryptedArtifact(config, receipt, encryptedPath, artifactSha256);
    } catch (error) {
      receipt.upload = { ok: false, error: error.message };
      receipt.ok = false;
    }
  }
  const receiptPath = path.join(outputRoot, `${receipt.kind || 'snapshot'}-receipt.json`);
  writeJson(receiptPath, receipt);
  writeJson(path.join(workspaceRoot(workspaceId), 'latest.json'), { ...receipt, receiptPath });
  return receiptPath;
}

async function snapshotCommand() {
  const config = loadConfig();
  const workspaceId = cleanSlug(argValue('--workspace', config.workspaceId || 'customer-workspace'));
  const repoPath = path.resolve(argValue('--repo', config.repoPath || process.cwd()));
  const skipDeps = flag('--skip-deps');
  const includeHashes = !flag('--fast-scan');
  const stamp = nowStamp();
  const outputRoot = path.resolve(argValue('--out', path.join(agentRoot, 'workspaces', workspaceId, 'snapshots', stamp)));
  fs.mkdirSync(outputRoot, { recursive: true, mode: 0o700 });

  const manifest = collectManifest(repoPath, outputRoot, skipDeps, includeHashes);
  const digest = manifestDigest(manifest);
  const { branch, head, dirtyEntries, repoName } = repoMeta(repoPath);

  if (flag('--dry-run')) {
    respond({
      ok: true,
      dryRun: true,
      schema: 'skyevault.agent.snapshot-preview.v1',
      workspaceId,
      repoPath,
      repoName,
      fileCount: manifest.files.length,
      totalBytes: manifest.totalBytes,
      skippedCount: manifest.skipped.length,
      branch,
      head,
      dirtyEntries,
      literalRepo: !skipDeps,
      scanMode: includeHashes ? 'sha256' : 'metadata',
      manifestDigest: digest
    });
    return;
  }

  const tarPath = makeTar(repoPath, outputRoot, stamp, skipDeps);
  const passphrase = passphraseForRun();
  const encryptedPath = path.join(outputRoot, `${repoName}-${stamp}.tar.enc`);
  const cryptoMeta = await encryptFile(tarPath, encryptedPath, passphrase);
  fs.rmSync(tarPath, { force: true });
  const encryptedSha256 = await sha256File(encryptedPath);
  const receipt = {
    ok: true,
    schema: 'skyevault.agent.snapshot-receipt.v1',
    version: VERSION,
    kind: 'full',
    stamp,
    generatedAt: new Date().toISOString(),
    workspaceId,
    repoPath,
    repoName,
    branch,
    head,
    dirtyEntries,
    literalRepo: !skipDeps,
    scanMode: includeHashes ? 'sha256' : 'metadata',
    manifestDigest: digest,
    fileCount: manifest.files.length,
    totalBytes: manifest.totalBytes,
    skippedCount: manifest.skipped.length,
    artifact: {
      path: encryptedPath,
      bytes: fs.statSync(encryptedPath).size,
      sha256: encryptedSha256,
      crypto: cryptoMeta
    },
    upload: { ok: false, skipped: true, reason: 'upload_not_requested' }
  };

  receipt.manifestPath = writeManifest(outputRoot, receipt, manifest);
  attachUnlockReceipt(outputRoot, receipt, encryptedPath, passphrase);
  const receiptPath = await writeReceiptAndUpload({ config, workspaceId, outputRoot, receipt, encryptedPath, artifactSha256: encryptedSha256 });
  saveState(workspaceId, {
    schema: 'skyevault.agent.workspace-state.v1',
    updatedAt: receipt.generatedAt,
    workspaceId,
    repoPath,
    repoName,
    latestFullReceiptPath: receiptPath,
    latestReceiptPath: receiptPath,
    latestManifestPath: receipt.manifestPath,
    latestManifestDigest: digest,
    latestKind: 'full'
  });
  respond({ ...receipt, receiptPath });
}

function compareManifest(previousManifest, currentManifest) {
  const previous = new Map((previousManifest.files || []).map((file) => [file.path, file]));
  const current = new Map((currentManifest.files || []).map((file) => [file.path, file]));
  const changed = [];
  const deleted = [];
  for (const file of currentManifest.files || []) {
    const old = previous.get(file.path);
    if (!old || old.bytes !== file.bytes || String(old.sha256 || '') !== String(file.sha256 || '') || (!file.sha256 && old.mtimeMs !== file.mtimeMs)) {
      changed.push(file);
    }
  }
  for (const file of previousManifest.files || []) {
    if (!current.has(file.path)) deleted.push({ path: file.path, bytes: file.bytes || 0, sha256: file.sha256 || '' });
  }
  return { changed, deleted };
}

function copyDeltaFiles(repoPath, stageFilesRoot, changed) {
  for (const file of changed) {
    const source = safeJoin(repoPath, file.path);
    const target = safeJoin(stageFilesRoot, file.path);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }
}

async function syncCommand() {
  const config = loadConfig();
  const workspaceId = cleanSlug(argValue('--workspace', config.workspaceId || 'customer-workspace'));
  const repoPath = path.resolve(argValue('--repo', config.repoPath || process.cwd()));
  const skipDeps = flag('--skip-deps');
  const includeHashes = !flag('--fast-scan');
  const priorState = loadState(workspaceId);
  if (flag('--full') || flag('--baseline') || !priorState.latestFullReceiptPath || !fs.existsSync(priorState.latestManifestPath || '')) {
    await snapshotCommand();
    return;
  }

  const stamp = nowStamp();
  const outputRoot = path.resolve(argValue('--out', path.join(agentRoot, 'workspaces', workspaceId, 'deltas', stamp)));
  fs.mkdirSync(outputRoot, { recursive: true, mode: 0o700 });
  const currentManifest = collectManifest(repoPath, outputRoot, skipDeps, includeHashes);
  const currentDigest = manifestDigest(currentManifest);
  const previousManifest = readJson(priorState.latestManifestPath, { files: [] });
  const { changed, deleted } = compareManifest(previousManifest, currentManifest);
  const { branch, head, dirtyEntries, repoName } = repoMeta(repoPath);

  if (flag('--dry-run') || (changed.length === 0 && deleted.length === 0)) {
    const receipt = {
      ok: true,
      schema: 'skyevault.agent.sync-receipt.v1',
      version: VERSION,
      kind: 'noop',
      dryRun: flag('--dry-run'),
      stamp,
      generatedAt: new Date().toISOString(),
      workspaceId,
      repoPath,
      repoName,
      branch,
      head,
      dirtyEntries,
      scanMode: includeHashes ? 'sha256' : 'metadata',
      manifestDigest: currentDigest,
      baseManifestDigest: priorState.latestManifestDigest || null,
      changedFileCount: changed.length,
      tombstoneCount: deleted.length,
      upload: { ok: false, skipped: true, reason: 'no_changes' }
    };
    const receiptPath = path.join(outputRoot, 'sync-receipt.json');
    writeJson(receiptPath, receipt);
    writeJson(path.join(workspaceRoot(workspaceId), 'latest.json'), { ...receipt, receiptPath });
    respond({ ...receipt, receiptPath });
    return;
  }

  const stageRoot = path.join(outputRoot, 'delta-stage');
  const stageFilesRoot = path.join(stageRoot, 'files');
  fs.mkdirSync(stageFilesRoot, { recursive: true, mode: 0o700 });
  copyDeltaFiles(repoPath, stageFilesRoot, changed);
  const deltaManifest = {
    schema: 'skyevault.agent.delta-manifest.v1',
    generatedAt: new Date().toISOString(),
    workspaceId,
    repoPath,
    repoName,
    baseFullReceiptPath: priorState.latestFullReceiptPath,
    baseReceiptPath: priorState.latestReceiptPath,
    baseManifestDigest: priorState.latestManifestDigest || null,
    nextManifestDigest: currentDigest,
    changed,
    deleted
  };
  writeJson(path.join(stageRoot, 'SKYEVAULT_DELTA_MANIFEST.json'), deltaManifest);

  const tarPath = makeTarFromDirectory(stageRoot, outputRoot, stamp, 'delta');
  fs.rmSync(stageRoot, { recursive: true, force: true });
  const passphrase = passphraseForRun();
  const encryptedPath = path.join(outputRoot, `${repoName}-${stamp}.delta.tar.enc`);
  const cryptoMeta = await encryptFile(tarPath, encryptedPath, passphrase);
  fs.rmSync(tarPath, { force: true });
  const encryptedSha256 = await sha256File(encryptedPath);

  const receipt = {
    ok: true,
    schema: 'skyevault.agent.delta-receipt.v1',
    version: VERSION,
    kind: 'delta',
    stamp,
    generatedAt: deltaManifest.generatedAt,
    workspaceId,
    repoPath,
    repoName,
    branch,
    head,
    dirtyEntries,
    literalRepo: !skipDeps,
    scanMode: includeHashes ? 'sha256' : 'metadata',
    manifestDigest: currentDigest,
    baseManifestDigest: priorState.latestManifestDigest || null,
    baseFullReceiptPath: priorState.latestFullReceiptPath,
    baseReceiptPath: priorState.latestReceiptPath,
    changedFileCount: changed.length,
    tombstoneCount: deleted.length,
    fileCount: changed.length,
    totalBytes: changed.reduce((sum, file) => sum + Number(file.bytes || 0), 0),
    artifact: {
      path: encryptedPath,
      bytes: fs.statSync(encryptedPath).size,
      sha256: encryptedSha256,
      crypto: cryptoMeta
    },
    upload: { ok: false, skipped: true, reason: 'upload_not_requested' }
  };
  receipt.manifestPath = writeManifest(outputRoot, receipt, currentManifest);
  attachUnlockReceipt(outputRoot, receipt, encryptedPath, passphrase);
  const receiptPath = await writeReceiptAndUpload({ config, workspaceId, outputRoot, receipt, encryptedPath, artifactSha256: encryptedSha256 });
  saveState(workspaceId, {
    schema: 'skyevault.agent.workspace-state.v1',
    updatedAt: receipt.generatedAt,
    workspaceId,
    repoPath,
    repoName,
    latestFullReceiptPath: priorState.latestFullReceiptPath,
    latestReceiptPath: receiptPath,
    latestManifestPath: receipt.manifestPath,
    latestManifestDigest: currentDigest,
    latestKind: 'delta'
  });
  respond({ ...receipt, receiptPath });
}

async function watchCommand() {
  const config = loadConfig();
  const intervalSeconds = Number(argValue('--interval-seconds', config.intervalSeconds || '600')) || 600;
  const upload = flag('--upload');
  const stopAfter = Number(argValue('--runs', '0')) || 0;
  let count = 0;
  process.stdout.write(JSON.stringify({
    ok: true,
    event: 'watch_started',
    version: VERSION,
    intervalSeconds,
    upload
  }) + '\n');
  while (!stopAfter || count < stopAfter) {
    count += 1;
    const childArgs = [flag('--full-every-run') ? 'snapshot' : 'sync', '--json'];
    if (upload) childArgs.push('--upload');
    for (const name of ['--workspace', '--repo', '--out', '--passphrase-env']) {
      const value = argValue(name);
      if (value) childArgs.push(`${name}=${value}`);
    }
    if (flag('--skip-deps')) childArgs.push('--skip-deps');
    if (flag('--fast-scan')) childArgs.push('--fast-scan');
    const child = spawnSync(process.execPath, [new URL(import.meta.url).pathname, ...childArgs], { encoding: 'utf8' });
    process.stdout.write(child.stdout || '');
    if (child.stderr) process.stderr.write(child.stderr);
    if (child.status !== 0) process.exitCode = child.status;
    if (stopAfter && count >= stopAfter) break;
    await new Promise((resolve) => setTimeout(resolve, intervalSeconds * 1000));
  }
}

function receiptPathFromArgs() {
  const explicit = argValue('--receipt');
  if (explicit) return path.resolve(explicit);
  const config = loadConfig();
  const workspaceId = cleanSlug(argValue('--workspace', config.workspaceId || 'customer-workspace'));
  const latest = latestReceipt(workspaceId);
  if (latest?.receiptPath) return latest.receiptPath;
  throw new Error('Receipt is required. Pass --receipt=/path/to/*-receipt.json or run init/sync first.');
}

function passphraseForReceipt(receipt) {
  const direct = argValue('--passphrase');
  if (direct) return { value: direct, source: 'argv:--passphrase' };
  const envName = argValue('--passphrase-env', receipt.unlock?.env || 'SKYEVAULT_AGENT_PASSPHRASE');
  const fromEnv = String(process.env[envName] || '').trim();
  if (fromEnv) return { value: fromEnv, source: `env:${envName}` };
  if (receipt.unlock?.mode === 'generated-local-file' && receipt.unlock.path && fs.existsSync(receipt.unlock.path)) {
    const unlock = readJson(receipt.unlock.path, {});
    if (unlock.passphrase) return { value: String(unlock.passphrase), source: `local:${receipt.unlock.path}` };
  }
  throw new Error(`Missing unlock passphrase. Set ${envName} or pass --passphrase-env=<env var>.`);
}

async function decryptFile(input, output, cryptoMeta, passphrase) {
  const salt = Buffer.from(cryptoMeta.salt || '', 'hex');
  const iv = Buffer.from(cryptoMeta.iv || '', 'hex');
  const authTag = Buffer.from(cryptoMeta.authTag || '', 'hex');
  if (!salt.length || !iv.length || !authTag.length) throw new Error('Receipt is missing encryption metadata.');
  const key = crypto.scryptSync(passphrase.value, salt, 32);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  await new Promise((resolve, reject) => {
    const read = fs.createReadStream(input);
    const write = fs.createWriteStream(output, { mode: 0o600 });
    read.on('error', reject);
    write.on('error', reject);
    write.on('finish', resolve);
    read.pipe(decipher).pipe(write);
  });
}

async function decryptReceiptToTar(receipt, tempRoot) {
  const artifactPath = path.resolve(argValue('--artifact', receipt.artifact?.path || ''));
  if (!artifactPath || !fs.existsSync(artifactPath)) throw new Error(`Artifact not found: ${artifactPath}`);
  const expectedSha = receipt.artifact?.sha256 || '';
  const actualSha = await sha256File(artifactPath);
  if (expectedSha && actualSha !== expectedSha) throw new Error(`Artifact SHA mismatch: expected ${expectedSha}, got ${actualSha}`);
  const passphrase = passphraseForReceipt(receipt);
  const tarPath = path.join(tempRoot, `${receipt.kind || 'artifact'}.tar`);
  await decryptFile(artifactPath, tarPath, receipt.artifact?.crypto || {}, passphrase);
  return { tarPath, artifactPath, artifactSha256: actualSha, passphraseSource: passphrase.source };
}

async function verifyCommand() {
  const receiptPath = receiptPathFromArgs();
  const receipt = readJson(receiptPath, null);
  if (!receipt?.artifact?.path) throw new Error(`Invalid receipt: ${receiptPath}`);
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'skyevault-agent-verify-'));
  try {
    const decrypted = await decryptReceiptToTar(receipt, tempRoot);
    const listing = spawnSync('tar', ['-tf', decrypted.tarPath], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 10 });
    if (listing.status !== 0) throw new Error(`tar verify failed: ${listing.stderr || listing.stdout || listing.status}`);
    const entries = String(listing.stdout || '').split(/\r?\n/).filter(Boolean);
    respond({
      ok: true,
      schema: 'skyevault.agent.verify-receipt.v1',
      version: VERSION,
      checkedAt: new Date().toISOString(),
      receiptPath,
      kind: receipt.kind || 'unknown',
      artifactPath: decrypted.artifactPath,
      artifactSha256: decrypted.artifactSha256,
      passphraseSource: decrypted.passphraseSource,
      tarEntryCount: entries.length,
      manifestDigest: receipt.manifestDigest || null
    });
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function ensureRestoreRoot(out) {
  const restoreRoot = path.resolve(out);
  if (fs.existsSync(restoreRoot)) {
    const entries = fs.readdirSync(restoreRoot);
    if (entries.length && !flag('--force')) throw new Error(`Restore folder is not empty: ${restoreRoot}. Pass --force to apply anyway.`);
  }
  fs.mkdirSync(restoreRoot, { recursive: true, mode: 0o700 });
  return restoreRoot;
}

function applyDeltaFolder(deltaRoot, restoreRoot) {
  const deltaManifest = readJson(path.join(deltaRoot, 'SKYEVAULT_DELTA_MANIFEST.json'), null);
  if (!deltaManifest) throw new Error('Delta bundle is missing SKYEVAULT_DELTA_MANIFEST.json.');
  const filesRoot = path.join(deltaRoot, 'files');
  for (const tombstone of deltaManifest.deleted || []) {
    const target = safeJoin(restoreRoot, tombstone.path);
    if (fs.existsSync(target)) fs.rmSync(target, { force: true });
  }
  for (const file of deltaManifest.changed || []) {
    const source = safeJoin(filesRoot, file.path);
    const target = safeJoin(restoreRoot, file.path);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }
  return {
    changedFileCount: (deltaManifest.changed || []).length,
    tombstoneCount: (deltaManifest.deleted || []).length,
    nextManifestDigest: deltaManifest.nextManifestDigest || null
  };
}

async function restoreCommand() {
  const receiptPath = receiptPathFromArgs();
  const receipt = readJson(receiptPath, null);
  if (!receipt?.artifact?.path) throw new Error(`Invalid receipt: ${receiptPath}`);
  if (receipt.kind === 'delta') throw new Error('Restore must start from a full/baseline receipt. Pass deltas with --delta-receipts=a.json,b.json.');
  const out = argValue('--out');
  if (!out) throw new Error('Restore output folder is required. Pass --out=/path/to/restore.');
  const restoreRoot = ensureRestoreRoot(out);
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'skyevault-agent-restore-'));
  const appliedDeltas = [];
  try {
    const decrypted = await decryptReceiptToTar(receipt, tempRoot);
    const extract = spawnSync('tar', ['-xf', decrypted.tarPath, '-C', restoreRoot], { encoding: 'utf8' });
    if (extract.status !== 0) throw new Error(`tar restore failed: ${extract.stderr || extract.stdout || extract.status}`);
    const deltaReceipts = String(argValue('--delta-receipts', '') || '').split(',').map((item) => item.trim()).filter(Boolean);
    for (const deltaReceiptPath of deltaReceipts) {
      const deltaReceipt = readJson(path.resolve(deltaReceiptPath), null);
      if (!deltaReceipt?.artifact?.path) throw new Error(`Invalid delta receipt: ${deltaReceiptPath}`);
      const deltaTemp = fs.mkdtempSync(path.join(tempRoot, 'delta-'));
      const deltaTar = await decryptReceiptToTar(deltaReceipt, deltaTemp);
      const deltaExtractRoot = path.join(deltaTemp, 'extract');
      fs.mkdirSync(deltaExtractRoot, { recursive: true });
      const deltaExtract = spawnSync('tar', ['-xf', deltaTar.tarPath, '-C', deltaExtractRoot], { encoding: 'utf8' });
      if (deltaExtract.status !== 0) throw new Error(`delta restore failed: ${deltaExtract.stderr || deltaExtract.stdout || deltaExtract.status}`);
      appliedDeltas.push({ receiptPath: path.resolve(deltaReceiptPath), ...applyDeltaFolder(deltaExtractRoot, restoreRoot) });
    }
    respond({
      ok: true,
      schema: 'skyevault.agent.restore-receipt.v1',
      version: VERSION,
      restoredAt: new Date().toISOString(),
      receiptPath,
      out: restoreRoot,
      baseKind: receipt.kind || 'full',
      appliedDeltas,
      finalManifestDigest: appliedDeltas.at(-1)?.nextManifestDigest || receipt.manifestDigest || null
    });
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function doctorCommand() {
  const tar = spawnSync('tar', ['--version'], { encoding: 'utf8' });
  const git = spawnSync('git', ['--version'], { encoding: 'utf8' });
  const config = loadConfig();
  respond({
    ok: tar.status === 0,
    schema: 'skyevault.agent.doctor.v1',
    version: VERSION,
    node: process.version,
    platform: process.platform,
    configPath,
    configured: Boolean(config.workspaceId),
    tar: { ok: tar.status === 0, version: String(tar.stdout || tar.stderr || '').split(/\r?\n/)[0] || '' },
    git: { ok: git.status === 0, version: String(git.stdout || git.stderr || '').trim() || '' },
    env: {
      gateBearer: Boolean(process.env[config.bearerEnv || 'SKYEVAULT_GATE_BEARER']),
      portalKey: Boolean(process.env[config.portalKeyEnv || 'SKYEVAULT_PORTAL_KEY']),
      passphrase: Boolean(process.env[config.passphraseEnv || 'SKYEVAULT_AGENT_PASSPHRASE'])
    }
  }, tar.status === 0 ? 0 : 1);
}

try {
  if (command === 'init') initCommand();
  else if (command === 'status') statusCommand();
  else if (command === 'snapshot') await snapshotCommand();
  else if (command === 'sync') await syncCommand();
  else if (command === 'watch') await watchCommand();
  else if (command === 'verify') await verifyCommand();
  else if (command === 'restore') await restoreCommand();
  else if (command === 'doctor') doctorCommand();
  else respond({ ok: false, error: `Unknown command: ${command}`, commands: ['init', 'status', 'snapshot', 'sync', 'watch', 'verify', 'restore', 'doctor'] }, 2);
} catch (error) {
  respond({ ok: false, error: error.message, stack: flag('--debug') ? error.stack : undefined }, 1);
}
