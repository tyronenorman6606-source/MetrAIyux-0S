#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildPayloadFromFiles,
  buildSecretPack,
  collectFiles,
  decryptSecretPayload,
  hashFile,
  packPublicSummary,
  readSecretPack,
  restorePayloadFiles,
  safeJoin,
  sha256Text,
  utcStamp,
  validateSecretPack,
  writeSecretPack
} from '../packages/skye-secure/skye-secure-core.mjs';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const rawArgs = process.argv.slice(2);
const DEFAULT_VAULT_DIR = path.join(repoRoot, '.skyevault-out', 'fs27', 'skyevault', 'skysecure-vaultos');
const ROLE_CAPABILITIES = {
  owner: ['admin', 'read', 'download', 'unlock', 'restore', 'grant', 'revoke', 'offload', 'reload', 'audit', 'diff', 'restore-point'],
  admin: ['read', 'download', 'unlock', 'restore', 'grant', 'revoke', 'offload', 'reload', 'audit', 'diff', 'restore-point'],
  developer: ['read', 'download', 'unlock', 'restore', 'reload', 'diff'],
  auditor: ['read', 'inventory', 'search', 'verify', 'audit', 'diff'],
  recovery: ['read', 'unlock', 'restore', 'reload', 'restore-point']
};

export const VAULTOS_COMMANDS = [
  'scan',
  'offload',
  'inventory',
  'search',
  'diff',
  'verify',
  'reload',
  'restore-point',
  'grant',
  'revoke',
  'audit',
  'ls',
  'tree',
  'cat-meta',
  'manifest',
  'bundle',
  'attach',
  'fs27-sync',
  'init',
  'ingest',
  'index',
  'policy'
];

function parseArgs(argv) {
  const parsed = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) {
      parsed._.push(arg);
      continue;
    }
    const eq = arg.indexOf('=');
    let key;
    let value;
    if (eq >= 0) {
      key = arg.slice(2, eq);
      value = arg.slice(eq + 1);
    } else {
      key = arg.slice(2);
      if (argv[index + 1] && !argv[index + 1].startsWith('--')) {
        value = argv[index + 1];
        index += 1;
      } else {
        value = true;
      }
    }
    if (parsed[key] === undefined) parsed[key] = value;
    else if (Array.isArray(parsed[key])) parsed[key].push(value);
    else parsed[key] = [parsed[key], value];
  }
  return parsed;
}

const args = parseArgs(rawArgs);
const command = args._[0] || 'help';

function values(name) {
  const found = args[name];
  if (found === undefined || found === true) return [];
  return Array.isArray(found) ? found.map(String) : [String(found)];
}

function value(name, fallback = '') {
  const found = values(name);
  return found.length ? found[found.length - 1] : fallback;
}

function bool(name, fallback = false) {
  const found = args[name];
  if (found === undefined) return fallback;
  if (found === true) return true;
  const raw = String(Array.isArray(found) ? found.at(-1) : found).toLowerCase();
  return !['0', 'false', 'no', 'off'].includes(raw);
}

function resolvePath(input, fallback = '') {
  const clean = String(input || fallback || '').trim();
  if (!clean) return '';
  return path.isAbsolute(clean) ? clean : path.resolve(repoRoot, clean);
}

function vaultDir() {
  return resolvePath(value('vault-dir'), DEFAULT_VAULT_DIR);
}

function pathsForVault(dir = vaultDir()) {
  return {
    root: dir,
    objects: path.join(dir, 'objects'),
    receipts: path.join(dir, 'receipts'),
    scans: path.join(dir, 'scans'),
    diffs: path.join(dir, 'diffs'),
    restorePoints: path.join(dir, 'restore-points'),
    index: path.join(dir, 'vault-index.json'),
    policy: path.join(dir, 'access-policy.json'),
    audit: path.join(dir, 'audit-log.jsonl')
  };
}

function writeJson(file, data, mode = 0o600) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, { mode });
  try {
    fs.chmodSync(file, mode);
  } catch {}
}

function readJson(file, fallback = null) {
  if (!file || !fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function jsonOut(data) {
  process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
}

function relativeToRepoOrSelf(file) {
  if (!file) return '';
  const resolved = path.resolve(file);
  const relative = path.relative(repoRoot, resolved).split(path.sep).join('/');
  return relative.startsWith('..') ? resolved : relative;
}

function sanitize(input, fallback = 'item') {
  return String(input || fallback).replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || fallback;
}

function envSecret(name, label = name) {
  const clean = String(name || '').trim();
  if (!clean) throw new Error(`${label} is required.`);
  const secret = process.env[clean];
  if (!secret) throw new Error(`Missing environment secret: ${clean}`);
  return secret;
}

function ensureVault(dir = vaultDir()) {
  const paths = pathsForVault(dir);
  fs.mkdirSync(paths.objects, { recursive: true });
  fs.mkdirSync(paths.receipts, { recursive: true });
  fs.mkdirSync(paths.scans, { recursive: true });
  fs.mkdirSync(paths.diffs, { recursive: true });
  fs.mkdirSync(paths.restorePoints, { recursive: true });
  if (!fs.existsSync(paths.index)) {
    writeJson(paths.index, {
      schema: 'skye.vaultos.index.v1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      hierarchy: 'FS27 -> SkyeVault -> SkySecure -> SkyeVaultOS',
      workspaceId: value('workspace', value('workspace-id', 'fs27-skyevault-skysecure')),
      vaultDir: dir,
      objects: []
    });
  }
  if (!fs.existsSync(paths.policy)) {
    writeJson(paths.policy, {
      schema: 'skye.vaultos.access-policy.v1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      hierarchy: 'FS27 -> SkyeVault -> SkySecure -> SkyeVaultOS',
      workspaceId: value('workspace', value('workspace-id', 'fs27-skyevault-skysecure')),
      subjects: {
        owner: {
          id: 'owner',
          type: 'user',
          displayName: 'Owner',
          roles: ['owner'],
          grants: [{ scope: 'workspace', resource: '*', role: 'owner', grantedAt: new Date().toISOString() }]
        }
      },
      roles: ROLE_CAPABILITIES
    });
  }
  return paths;
}

function readIndex(dir = vaultDir()) {
  return readJson(ensureVault(dir).index);
}

function writeIndex(index, dir = vaultDir()) {
  index.updatedAt = new Date().toISOString();
  writeJson(ensureVault(dir).index, index);
}

function readPolicy(dir = vaultDir()) {
  return readJson(ensureVault(dir).policy);
}

function writePolicy(policy, dir = vaultDir()) {
  policy.updatedAt = new Date().toISOString();
  writeJson(ensureVault(dir).policy, policy);
}

function appendAudit(event, dir = vaultDir()) {
  const paths = ensureVault(dir);
  const full = {
    schema: 'skye.vaultos.audit-event.v1',
    id: `evt_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    recordedAt: new Date().toISOString(),
    actor: value('actor', process.env.USER || 'operator'),
    host: os.hostname(),
    ...event
  };
  fs.appendFileSync(paths.audit, `${JSON.stringify(full)}\n`, { mode: 0o600 });
  return full;
}

function readAudit(dir = vaultDir()) {
  const paths = ensureVault(dir);
  if (!fs.existsSync(paths.audit)) return [];
  return fs.readFileSync(paths.audit, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

async function receipt(kind, data, dir = vaultDir()) {
  const file = path.join(ensureVault(dir).receipts, `${kind}-${utcStamp()}.json`);
  writeJson(file, {
    schema: 'skye.vaultos.receipt.v1',
    kind,
    recordedAt: new Date().toISOString(),
    hierarchy: 'FS27 -> SkyeVault -> SkySecure -> SkyeVaultOS',
    ...data
  });
  return file;
}

function classifyFile(pathName) {
  const ext = path.extname(pathName).toLowerCase();
  const base = path.basename(pathName).toLowerCase();
  const normalized = String(pathName || '').toLowerCase();
  const segments = normalized.split('/').filter(Boolean);
  const sensitiveName = /(^|[._-])(credential|credentials|service-account|secret|secrets|token|tokens|api-key|apikey|password|passwords|private-key|key|keys)([._-]|$)/i;
  if (base.startsWith('.env')) return 'environment';
  if (sensitiveName.test(base) || segments.some((segment) => sensitiveName.test(segment))) return 'credential';
  if (['.pem', '.key', '.p12', '.pfx', '.asc', '.gpg'].includes(ext)) return 'private-key';
  if (['.db', '.sqlite', '.sqlite3', '.dump', '.backup'].includes(ext)) return 'database';
  if (['.zip', '.tar', '.gz', '.tgz', '.7z', '.rar'].includes(ext)) return 'archive';
  if (['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif', '.svg'].includes(ext)) return 'image';
  if (['.mp3', '.wav', '.mp4', '.mov', '.webm', '.m4a'].includes(ext)) return 'media';
  if (['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.css', '.html', '.htm', '.py', '.sh', '.sql'].includes(ext)) return 'code';
  if (['.json', '.jsonl'].includes(ext)) return 'json';
  if (['.md', '.txt', '.log', '.csv'].includes(ext)) return 'text';
  if (normalized.includes('/node_modules/')) return 'dependency';
  if (['package.json', 'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'wrangler.toml', 'netlify.toml'].includes(base)) return 'config';
  return ext ? ext.slice(1) : 'file';
}

function shouldSkip(relative, entryName, options = {}) {
  const skipNames = new Set(['.git', '.skyevault-out']);
  if (bool('include-wrangler', false) !== true) skipNames.add('.wrangler');
  if (!options.includeNodeModules) skipNames.add('node_modules');
  if (skipNames.has(entryName)) return true;
  return options.exclude.some((pattern) => relative === pattern || relative.startsWith(`${pattern.replace(/\/+$/, '')}/`));
}

function listRelativeFiles(root, options = {}) {
  const resolvedRoot = path.resolve(root);
  const includeNodeModules = options.includeNodeModules ?? bool('include-node-modules', true);
  const exclude = options.exclude || values('exclude').map((item) => item.replace(/^\/+/, '').replace(/\\/g, '/'));
  const includeSymlinks = options.includeSymlinks ?? bool('include-symlinks');
  const files = [];
  const skipped = [];
  const errors = [];

  function walk(dir) {
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (error) {
      errors.push({ path: path.relative(resolvedRoot, dir).split(path.sep).join('/'), error: error.message });
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      const relative = path.relative(resolvedRoot, full).split(path.sep).join('/');
      if (shouldSkip(relative, entry.name, { includeNodeModules, exclude })) {
        skipped.push({ path: relative, reason: 'excluded by VaultOS scan policy' });
        continue;
      }
      if (entry.isSymbolicLink()) {
        if (!includeSymlinks) {
          skipped.push({ path: relative, reason: 'symlink skipped by default' });
          continue;
        }
      }
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) files.push(relative);
    }
  }

  walk(resolvedRoot);
  return {
    root: resolvedRoot,
    files: files.sort((a, b) => a.localeCompare(b)),
    skipped,
    errors
  };
}

function typeBreakdown(files = []) {
  const out = {};
  for (const file of files) {
    const type = file.type || classifyFile(file.path || file);
    out[type] = (out[type] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function mergeTypeBreakdowns(target, source) {
  for (const [type, count] of Object.entries(source || {})) target[type] = (target[type] || 0) + count;
  return target;
}

function extensionBreakdown(files = []) {
  const out = {};
  for (const file of files) {
    const ext = path.extname(file.path || file).toLowerCase() || '(none)';
    out[ext] = (out[ext] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 80));
}

function compactFiles(files = [], limit = 40) {
  return files.slice(0, limit).map((file) => ({
    path: file.path,
    type: file.type,
    bytes: file.bytes,
    sha256: file.sha256
  }));
}

async function scanRoot(root, { writeTo = '', dir = vaultDir(), includeFiles = true, hash = true } = {}) {
  const resolvedRoot = resolvePath(root);
  if (!resolvedRoot) throw new Error('--root is required.');
  if (!fs.existsSync(resolvedRoot) || !fs.statSync(resolvedRoot).isDirectory()) throw new Error(`Scan root is not a directory: ${resolvedRoot}`);
  const listed = listRelativeFiles(resolvedRoot);
  const records = [];
  for (const relativePath of listed.files) {
    const full = safeJoin(resolvedRoot, relativePath);
    const stat = fs.statSync(full);
    records.push({
      path: relativePath,
      type: classifyFile(relativePath),
      extension: path.extname(relativePath).toLowerCase() || '',
      bytes: stat.size,
      mode: (stat.mode & 0o777).toString(8),
      mtime: stat.mtime.toISOString(),
      sha256: hash ? await hashFile(full) : ''
    });
  }
  const totalBytes = records.reduce((sum, file) => sum + file.bytes, 0);
  const largestFiles = [...records].sort((a, b) => b.bytes - a.bytes).slice(0, 25);
  const summary = {
    fileCount: records.length,
    totalBytes,
    types: typeBreakdown(records),
    extensions: extensionBreakdown(records),
    largestFiles: compactFiles(largestFiles, 25),
    skipped: listed.skipped,
    errors: listed.errors
  };
  const scan = {
    schema: 'skye.vaultos.scan.v1',
    ok: listed.errors.length === 0,
    generatedAt: new Date().toISOString(),
    hierarchy: 'FS27 -> SkyeVault -> SkySecure -> SkyeVaultOS',
    root: resolvedRoot,
    rootName: path.basename(resolvedRoot),
    scanPolicy: {
      includesNodeModules: bool('include-node-modules', true),
      includesSymlinks: bool('include-symlinks'),
      hashesFiles: hash,
      excludes: values('exclude')
    },
    summary,
    files: includeFiles ? records : []
  };
  const target = writeTo || path.join(ensureVault(dir).scans, `scan-${sanitize(path.basename(resolvedRoot))}-${utcStamp()}.json`);
  writeJson(target, scan);
  return { scan, scanPath: target };
}

function objectPathForPack(pack, dir = vaultDir()) {
  const packId = pack.publicManifest.packId;
  return path.join(ensureVault(dir).objects, `${sanitize(packId)}.skyesecrets`);
}

async function addPackToIndex({ packFile, source = {}, copied = false }, dir = vaultDir()) {
  const pack = readSecretPack(packFile);
  const summary = packPublicSummary(pack);
  const stat = fs.statSync(packFile);
  const packSha256 = await hashFile(packFile);
  const index = readIndex(dir);
  const item = {
    id: summary.packId,
    packId: summary.packId,
    objectPath: packFile,
    objectSha256: packSha256,
    bytes: stat.size,
    copied,
    indexedAt: new Date().toISOString(),
    hierarchy: 'FS27 -> SkyeVault -> SkySecure -> SkyeVaultOS',
    workspaceId: summary.workspaceId || index.workspaceId || '',
    repoId: summary.repoId || '',
    clientName: summary.clientName || '',
    projectName: summary.projectName || '',
    fileCount: summary.fileCount,
    plaintextBytes: summary.plaintextBytes,
    encryptedBytes: summary.encryptedBytes,
    recipients: summary.recipients,
    integrity: summary.integrity,
    packSetId: source.packSetId || '',
    source,
    types: source.types || {},
    tags: values('tag')
  };
  index.objects = index.objects.filter((object) => object.packId !== item.packId);
  index.objects.push(item);
  index.objects.sort((a, b) => String(a.packId).localeCompare(String(b.packId)));
  writeIndex(index, dir);
  appendAudit({ action: 'pack.indexed', packId: item.packId, objectPath: packFile, copied, source: { ...source, fileSample: undefined } }, dir);
  return item;
}

function findObject(packId, dir = vaultDir()) {
  const wanted = String(packId || value('pack-id') || '').trim();
  if (!wanted) throw new Error('--pack-id is required.');
  const match = readIndex(dir).objects.find((item) => item.packId === wanted || item.id === wanted || item.packId.includes(wanted));
  if (!match) throw new Error(`Pack not found in vault index: ${wanted}`);
  return match;
}

function findObjects(dir = vaultDir()) {
  const packSetId = value('pack-set-id', value('packset-id', ''));
  if (packSetId) {
    const matches = readIndex(dir).objects
      .filter((item) => item.packSetId === packSetId || item.source?.packSetId === packSetId)
      .sort((a, b) => Number(a.source?.packSetPart || 0) - Number(b.source?.packSetPart || 0));
    if (!matches.length) throw new Error(`Pack set not found in vault index: ${packSetId}`);
    return matches;
  }
  return [findObject(value('pack-id'), dir)];
}

function unlockOptions() {
  return {
    recipientId: value('recipient', ''),
    passphrase: value('passphrase-env') ? envSecret(value('passphrase-env'), '--passphrase-env') : '',
    pepper: value('pepper-env') ? envSecret(value('pepper-env'), '--pepper-env') : '',
    privateKeyPem: value('private-key') ? JSON.parse(fs.readFileSync(resolvePath(value('private-key')), 'utf8')).privateKeyPem : ''
  };
}

function latestFile(folder, suffix = '.json') {
  if (!fs.existsSync(folder)) return '';
  return fs.readdirSync(folder)
    .filter((name) => name.endsWith(suffix))
    .sort((a, b) => b.localeCompare(a))
    .map((name) => path.join(folder, name))[0] || '';
}

function listJsonFiles(folder) {
  if (!fs.existsSync(folder)) return [];
  return fs.readdirSync(folder)
    .filter((name) => name.endsWith('.json'))
    .sort((a, b) => b.localeCompare(a))
    .map((name) => path.join(folder, name));
}

function publicObject(item = {}, dir = vaultDir()) {
  const vaultRoot = path.resolve(dir);
  const objectPath = item.objectPath ? path.resolve(item.objectPath) : '';
  const relativeObjectPath = objectPath && objectPath.startsWith(`${vaultRoot}${path.sep}`)
    ? path.relative(vaultRoot, objectPath).split(path.sep).join('/')
    : relativeToRepoOrSelf(objectPath);
  return {
    packId: item.packId || item.id || '',
    packSetId: item.packSetId || item.source?.packSetId || '',
    packSetPart: item.source?.packSetPart || 0,
    packSetTotal: item.source?.packSetTotal || 1,
    workspaceId: item.workspaceId || '',
    repoId: item.repoId || '',
    clientName: item.clientName || '',
    projectName: item.projectName || '',
    objectPath: relativeObjectPath,
    objectSha256: item.objectSha256 || '',
    objectBytes: Number(item.bytes || 0),
    fileCount: Number(item.fileCount || 0),
    plaintextBytes: Number(item.plaintextBytes || 0),
    encryptedBytes: Number(item.encryptedBytes || 0),
    recipients: item.recipients || [],
    types: item.types || item.source?.types || {},
    tags: item.tags || [],
    indexedAt: item.indexedAt || '',
    source: {
      kind: item.source?.kind || '',
      originalRoot: item.source?.originalRoot || '',
      sourceHash: item.source?.sourceHash || '',
      deleteReady: Boolean(item.source?.deleteReady),
      skippedCount: Array.isArray(item.source?.skipped) ? item.source.skipped.length : 0,
      fileSample: item.source?.fileSample || []
    }
  };
}

function packSetSummaries(objects = []) {
  const sets = new Map();
  for (const object of objects) {
    const key = object.packSetId || object.source?.packSetId || object.packId;
    if (!sets.has(key)) {
      sets.set(key, {
        packSetId: key,
        packIds: [],
        objectCount: 0,
        fileCount: 0,
        plaintextBytes: 0,
        encryptedBytes: 0,
        objectBytes: 0,
        types: {},
        originalRoots: new Set(),
        projects: new Set()
      });
    }
    const set = sets.get(key);
    set.packIds.push(object.packId);
    set.objectCount += 1;
    set.fileCount += Number(object.fileCount || 0);
    set.plaintextBytes += Number(object.plaintextBytes || 0);
    set.encryptedBytes += Number(object.encryptedBytes || 0);
    set.objectBytes += Number(object.objectBytes || object.bytes || 0);
    mergeTypeBreakdowns(set.types, object.types || object.source?.types || {});
    if (object.source?.originalRoot) set.originalRoots.add(object.source.originalRoot);
    if (object.projectName) set.projects.add(object.projectName);
  }
  return [...sets.values()].map((set) => ({
    ...set,
    types: Object.fromEntries(Object.entries(set.types).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
    originalRoots: [...set.originalRoots],
    projects: [...set.projects]
  })).sort((a, b) => a.packSetId.localeCompare(b.packSetId));
}

function restorePointSummaries(dir = vaultDir()) {
  const paths = ensureVault(dir);
  return listJsonFiles(paths.restorePoints).map((file) => {
    const restore = readJson(file, {});
    return {
      id: restore.id || path.basename(file, '.json'),
      name: restore.name || '',
      createdAt: restore.createdAt || '',
      path: relativeToRepoOrSelf(file),
      root: restore.root || '',
      fileCount: restore.scanSummary?.fileCount || 0,
      totalBytes: restore.scanSummary?.totalBytes || 0,
      objectCount: restore.indexSummary?.objectCount || 0,
      subjectCount: restore.accessSummary?.subjectCount || 0,
      auditEventCount: restore.auditSummary?.eventCount || 0
    };
  });
}

function buildVaultManifest(dir = vaultDir()) {
  const paths = ensureVault(dir);
  const index = readIndex(dir);
  const policy = readPolicy(dir);
  const auditEvents = readAudit(dir);
  const objects = index.objects.map((item) => publicObject(item, dir));
  const types = {};
  for (const object of objects) mergeTypeBreakdowns(types, object.types || {});
  const latestScanPath = latestFile(paths.scans);
  const latestScan = readJson(latestScanPath, null);
  const restorePoints = restorePointSummaries(dir);
  const deleteGate = {
    ready: objects.length > 0 && restorePoints.length > 0 && auditEvents.some((event) => event.action === 'pack.diffed') && auditEvents.some((event) => event.action === 'pack.reloaded'),
    required: ['scan', 'offload', 'inventory', 'search', 'diff', 'verify', 'reload', 'restore-point', 'grant', 'revoke', 'audit'],
    evidence: {
      scan: Boolean(latestScanPath),
      offload: objects.length > 0,
      diff: auditEvents.some((event) => event.action === 'pack.diffed'),
      reload: auditEvents.some((event) => event.action === 'pack.reloaded'),
      restorePoint: restorePoints.length > 0,
      grant: auditEvents.some((event) => event.action === 'access.granted'),
      revoke: auditEvents.some((event) => event.action === 'access.revoked'),
      audit: auditEvents.length > 0
    }
  };
  return {
    schema: 'skye.vaultos.manifest.v1',
    ok: true,
    generatedAt: new Date().toISOString(),
    hierarchy: 'FS27 -> SkyeVault -> SkySecure -> SkyeVaultOS',
    vaultDir: dir,
    workspaceId: index.workspaceId || '',
    commands: VAULTOS_COMMANDS,
    commandParity: {
      required: ['scan', 'offload', 'inventory', 'search', 'diff', 'verify', 'reload', 'restore-point', 'grant', 'revoke', 'audit'],
      bashNative: ['ls', 'tree', 'cat-meta', 'manifest', 'bundle', 'attach', 'fs27-sync']
    },
    counts: {
      objects: objects.length,
      packSets: packSetSummaries(objects).length,
      restorePoints: restorePoints.length,
      auditEvents: auditEvents.length,
      subjects: Object.keys(policy.subjects || {}).length,
      scannedFiles: latestScan?.summary?.fileCount || objects.reduce((sum, item) => sum + Number(item.fileCount || 0), 0),
      plaintextBytes: latestScan?.summary?.totalBytes || objects.reduce((sum, item) => sum + Number(item.plaintextBytes || 0), 0),
      encryptedBytes: objects.reduce((sum, item) => sum + Number(item.encryptedBytes || 0), 0),
      objectBytes: objects.reduce((sum, item) => sum + Number(item.objectBytes || 0), 0)
    },
    types: Object.fromEntries(Object.entries(types).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
    latestScan: latestScan ? {
      path: relativeToRepoOrSelf(latestScanPath),
      root: latestScan.root,
      rootName: latestScan.rootName,
      summary: latestScan.summary
    } : null,
    packSets: packSetSummaries(objects),
    objects,
    restorePoints,
    access: {
      subjects: Object.values(policy.subjects || {}).map((subject) => ({
        id: subject.id,
        type: subject.type,
        displayName: subject.displayName,
        roles: subject.roles || [],
        grantCount: (subject.grants || []).length
      }))
    },
    audit: {
      count: auditEvents.length,
      latest: auditEvents.slice(-40).map((event) => ({
        id: event.id,
        recordedAt: event.recordedAt,
        actor: event.actor,
        action: event.action,
        packId: event.packId || '',
        packSetId: event.packSetId || ''
      }))
    },
    deleteGate,
    liveRoutes: {
      fs27Proof: 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skysecure/vaultos/proof',
      fs27Inventory: 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skysecure/vaultos/inventory',
      fs27Search: 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skysecure/vaultos/search',
      fs27RestorePoints: 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skysecure/vaultos/restore-points',
      fs27Audit: 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skysecure/vaultos/audit',
      console: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/skye-vault-os/'
    },
    plaintextBoundary: 'No plaintext secrets, passphrases, private keys, or decrypted payload bytes are written into this manifest.'
  };
}

async function commandInit() {
  const dir = vaultDir();
  const paths = ensureVault(dir);
  const event = appendAudit({ action: 'vaultos.initialized', vaultDir: dir }, dir);
  jsonOut({ ok: true, service: 'SkyeVaultOS', hierarchy: 'FS27 -> SkyeVault -> SkySecure -> SkyeVaultOS', vaultDir: dir, paths, event });
}

async function commandScan() {
  const dir = vaultDir();
  const { scan, scanPath } = await scanRoot(value('root', value('dir')), {
    dir,
    writeTo: resolvePath(value('output')),
    includeFiles: true,
    hash: bool('hash', true)
  });
  const event = appendAudit({
    action: 'folder.scanned',
    root: scan.root,
    fileCount: scan.summary.fileCount,
    totalBytes: scan.summary.totalBytes,
    scanPath
  }, dir);
  const receiptPath = await receipt('scan', { ok: scan.ok, scanPath, summary: scan.summary, event }, dir);
  jsonOut({ ok: scan.ok, root: scan.root, scanPath, receipt: receiptPath, summary: scan.summary });
}

async function commandIngest() {
  const dir = vaultDir();
  const sourcePack = resolvePath(value('pack'));
  if (!sourcePack) throw new Error('--pack is required.');
  const pack = readSecretPack(sourcePack);
  validateSecretPack(pack);
  const destination = bool('no-copy') ? sourcePack : objectPathForPack(pack, dir);
  if (!bool('no-copy')) fs.copyFileSync(sourcePack, destination);
  const item = await addPackToIndex({ packFile: destination, copied: !bool('no-copy'), source: { kind: 'ingest', originalPath: sourcePack } }, dir);
  const receiptPath = await receipt('ingest', { ok: true, item }, dir);
  jsonOut({ ok: true, item, receipt: receiptPath });
}

async function rebuildIndexFromObjects(dir = vaultDir()) {
  const paths = ensureVault(dir);
  const indexed = [];
  for (const file of fs.readdirSync(paths.objects).filter((name) => name.endsWith('.skyesecrets'))) {
    const full = path.join(paths.objects, file);
    try {
      indexed.push(await addPackToIndex({ packFile: full, copied: true, source: { kind: 'index-rescan' } }, dir));
    } catch (error) {
      appendAudit({ action: 'pack.index_failed', objectPath: full, error: error.message }, dir);
    }
  }
  return indexed;
}

async function commandIndex() {
  const dir = vaultDir();
  const indexed = await rebuildIndexFromObjects(dir);
  jsonOut({ ok: true, vaultDir: dir, indexedCount: indexed.length, index: readIndex(dir) });
}

async function commandOffload() {
  const dir = vaultDir();
  const sourceRoot = resolvePath(value('root', value('dir')));
  if (!sourceRoot) throw new Error('--root is required.');
  if (!fs.existsSync(sourceRoot) || !fs.statSync(sourceRoot).isDirectory()) throw new Error(`Offload root is not a directory: ${sourceRoot}`);
  const listed = values('path').length
    ? { files: values('path'), skipped: [], errors: [] }
    : listRelativeFiles(sourceRoot);
  if (listed.errors.length) throw new Error(`Cannot offload while scan errors exist: ${listed.errors.map((item) => item.path).join(', ')}`);
  if (!listed.files.length) throw new Error(`No files found to offload: ${sourceRoot}`);
  const maxFileMb = Number(value('max-file-mb', '512'));
  const maxFileBytes = maxFileMb * 1024 * 1024;
  const shardBytes = Math.max(16 * 1024 * 1024, Number(value('shard-mb', '160')) * 1024 * 1024);
  const passphraseEnv = value('passphrase-env');
  if (!passphraseEnv) throw new Error('--passphrase-env is required for offload.');
  const recipients = [{
    type: 'passphrase',
    recipientId: sanitize(value('recipient', 'owner')),
    passphrase: envSecret(passphraseEnv, '--passphrase-env'),
    pepper: value('pepper-env') ? envSecret(value('pepper-env'), '--pepper-env') : '',
    hint: value('hint', 'SkyeVaultOS secure offload')
  }];

  const fileStats = listed.files.map((relativePath) => {
    const stat = fs.statSync(safeJoin(sourceRoot, relativePath));
    if (stat.size > maxFileBytes) {
      throw new Error(`Secret file exceeds max size (${maxFileBytes} bytes): ${relativePath}`);
    }
    return { path: relativePath, bytes: stat.size };
  });
  const shards = [];
  let current = [];
  let currentBytes = 0;
  for (const file of fileStats) {
    if (current.length && currentBytes + file.bytes > shardBytes) {
      shards.push(current);
      current = [];
      currentBytes = 0;
    }
    current.push(file.path);
    currentBytes += file.bytes;
  }
  if (current.length) shards.push(current);

  const packSetId = value('pack-set-id', `vaultos_${sanitize(path.basename(sourceRoot))}_${utcStamp()}`);
  const allRecords = [];
  const items = [];
  const totalTypes = {};
  let plaintextBytes = 0;
  let fileCount = 0;

  for (let index = 0; index < shards.length; index += 1) {
    const shardPaths = shards[index];
    const collection = collectFiles({
      root: sourceRoot,
      paths: shardPaths,
      allowMissing: false,
      includeSymlinks: bool('include-symlinks'),
      maxFileBytes
    });
    const fileRecords = collection.files.map((item) => ({
      path: item.path,
      type: classifyFile(item.path),
      bytes: item.size,
      sha256: item.sha256
    }));
    allRecords.push(...fileRecords);
    plaintextBytes += collection.plaintextBytes;
    fileCount += collection.files.length;
    const shardTypes = typeBreakdown(fileRecords);
    mergeTypeBreakdowns(totalTypes, shardTypes);
    const shardHash = sha256Text(collection.files.map((item) => `${item.path}:${item.sha256}`).join('\n'));
    const payload = buildPayloadFromFiles({
      collection,
      restorePolicy: {
        product: 'SkyeVaultOS Secure Offload',
        originalRoot: sourceRoot,
        packSetId,
        packSetPart: index + 1,
        packSetTotal: shards.length,
        defaultOverwrite: false,
        requireExplicitForceForOverwrite: true
      }
    });
    const { pack } = buildSecretPack({
      payload,
      recipients,
      metadata: {
        workspaceId: value('workspace', value('workspace-id', 'fs27-skyevault-skysecure')),
        repoId: value('repo', value('repo-id', path.basename(repoRoot))),
        clientName: value('client', ''),
        projectName: `${value('project', `VaultOS offload ${path.basename(sourceRoot)}`)}${shards.length > 1 ? ` part ${index + 1}/${shards.length}` : ''}`,
        notes: value('notes', 'Created by SkyeVaultOS. Plaintext stays local; encrypted object remains under SkyeVault/SkySecure custody.'),
        fileCount: collection.files.length,
        plaintextBytes: collection.plaintextBytes,
        sourceBoundarySha256: shardHash,
        sourceBoundaryRef: sourceRoot,
        restoreRootHint: path.basename(sourceRoot),
        packSetId,
        packSetPart: index + 1,
        packSetTotal: shards.length
      }
    });
    const destination = objectPathForPack(pack, dir);
    writeSecretPack(destination, pack);
    const source = {
      kind: 'vaultos-offload',
      originalRoot: sourceRoot,
      packSetId,
      packSetPart: index + 1,
      packSetTotal: shards.length,
      fileCount: collection.files.length,
      plaintextBytes: collection.plaintextBytes,
      sourceHash: shardHash,
      types: shardTypes,
      skipped: index === 0 ? listed.skipped : [],
      fileSample: compactFiles(fileRecords, 80),
      deleteReady: false
    };
    items.push(await addPackToIndex({ packFile: destination, copied: true, source }, dir));
  }

  const sourceHash = sha256Text(allRecords.map((item) => `${item.path}:${item.sha256}`).join('\n'));
  const source = {
    kind: 'vaultos-offload',
    originalRoot: sourceRoot,
    packSetId,
    packSetTotal: shards.length,
    fileCount,
    plaintextBytes,
    sourceHash,
    types: Object.fromEntries(Object.entries(totalTypes).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
    skipped: listed.skipped,
    fileSample: compactFiles(allRecords, 80),
    deleteReady: false
  };
  const event = appendAudit({ action: 'folder.offloaded', packSetId, packIds: items.map((item) => item.packId), sourceRoot, fileCount, plaintextBytes }, dir);
  const receiptPath = await receipt('offload', { ok: true, packSetId, items, source: { ...source, fileSample: undefined }, event }, dir);
  jsonOut({
    ok: true,
    packSetId,
    packSetTotal: shards.length,
    packIds: items.map((item) => item.packId),
    item: items[0],
    items,
    source: { ...source, fileSample: source.fileSample },
    receipt: receiptPath
  });
}

async function commandInventory() {
  const dir = vaultDir();
  const index = readIndex(dir);
  const audit = readAudit(dir);
  const totalBytes = index.objects.reduce((sum, item) => sum + Number(item.bytes || 0), 0);
  const types = {};
  for (const item of index.objects) {
    for (const [type, count] of Object.entries(item.types || {})) types[type] = (types[type] || 0) + count;
  }
  jsonOut({
    ok: true,
    service: 'SkyeVaultOS',
    hierarchy: index.hierarchy || 'FS27 -> SkyeVault -> SkySecure -> SkyeVaultOS',
    vaultDir: dir,
    workspaceId: index.workspaceId,
    objectCount: index.objects.length,
    totalBytes,
    types: Object.fromEntries(Object.entries(types).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
    auditEventCount: audit.length,
    objects: index.objects
  });
}

async function commandSearch() {
  const dir = vaultDir();
  const query = value('query', value('q', '')).toLowerCase();
  const type = value('type', '').toLowerCase();
  const limit = Number(value('limit', '100'));
  const index = readIndex(dir);
  const scanPath = resolvePath(value('scan')) || latestFile(ensureVault(dir).scans);
  const scan = readJson(scanPath, null);
  const packs = index.objects.filter((item) => {
    const haystack = JSON.stringify({
      packId: item.packId,
      workspaceId: item.workspaceId,
      repoId: item.repoId,
      clientName: item.clientName,
      projectName: item.projectName,
      source: { ...item.source, fileSample: undefined },
      tags: item.tags
    }).toLowerCase();
    const queryOk = !query || haystack.includes(query);
    const typeOk = !type || Object.prototype.hasOwnProperty.call(item.types || {}, type);
    return queryOk && typeOk;
  });
  let files = [];
  if (scan?.files?.length) {
    files = scan.files.filter((file) => {
      const queryOk = !query || file.path.toLowerCase().includes(query);
      const typeOk = !type || String(file.type).toLowerCase() === type;
      return queryOk && typeOk;
    }).slice(0, limit);
  }
  const event = appendAudit({ action: 'vault.search', query, type, packMatchCount: packs.length, fileMatchCount: files.length, scanPath }, dir);
  jsonOut({ ok: true, query, type, scanPath, packMatchCount: packs.length, fileMatchCount: files.length, packs, files, event });
}

async function commandVerify() {
  const dir = vaultDir();
  const objects = findObjects(dir);
  const results = [];
  let totalFileCount = 0;
  for (const object of objects) {
    const pack = readSecretPack(object.objectPath);
    const envelope = validateSecretPack(pack);
    let payloadVerified = false;
    let fileCount = object.fileCount;
    if (value('passphrase-env') || value('private-key')) {
      const { payload } = decryptSecretPayload(pack, unlockOptions());
      payloadVerified = true;
      fileCount = payload.files.length;
    }
    totalFileCount += fileCount;
    results.push({ object, envelope, payloadVerified, fileCount });
  }
  const event = appendAudit({
    action: 'pack.verified',
    packId: objects.length === 1 ? objects[0].packId : '',
    packSetId: value('pack-set-id', ''),
    packIds: objects.map((object) => object.packId),
    envelopeVerified: true,
    payloadVerified: results.every((result) => result.payloadVerified) || !(value('passphrase-env') || value('private-key'))
  }, dir);
  const receiptPath = await receipt('verify', { ok: true, results, fileCount: totalFileCount, event }, dir);
  jsonOut({
    ok: true,
    object: results[0]?.object || null,
    objects: results.map((result) => result.object),
    envelope: results[0]?.envelope || null,
    results,
    payloadVerified: results.every((result) => result.payloadVerified),
    fileCount: totalFileCount,
    receipt: receiptPath
  });
}

async function commandReload() {
  const dir = vaultDir();
  const objects = findObjects(dir);
  const target = resolvePath(value('to', value('root')));
  if (!target) throw new Error('--to is required.');
  const restored = [];
  const conflicts = [];
  const resultParts = [];
  for (const object of objects) {
    const pack = readSecretPack(object.objectPath);
    const { payload } = decryptSecretPayload(pack, unlockOptions());
    const part = restorePayloadFiles({ payload, root: target, force: bool('force'), dryRun: bool('dry-run') });
    restored.push(...part.restored);
    conflicts.push(...part.conflicts.map((conflict) => ({ ...conflict, packId: object.packId })));
    resultParts.push({ packId: object.packId, restoredCount: part.restored.length, conflictCount: part.conflicts.length });
  }
  const result = { restored, conflicts, dryRun: bool('dry-run'), root: path.resolve(target), parts: resultParts };
  const event = appendAudit({
    action: 'pack.reloaded',
    packId: objects.length === 1 ? objects[0].packId : '',
    packSetId: value('pack-set-id', ''),
    packIds: objects.map((object) => object.packId),
    target,
    restoredCount: result.restored.length,
    conflictCount: result.conflicts.length,
    dryRun: result.dryRun
  }, dir);
  const receiptPath = await receipt('reload', { ok: result.conflicts.length === 0, objects, result, event }, dir);
  jsonOut({ ok: result.conflicts.length === 0, object: objects[0], objects, result, receipt: receiptPath });
  if (result.conflicts.length) process.exitCode = 2;
}

async function commandDiff() {
  const dir = vaultDir();
  const root = resolvePath(value('root', value('dir')));
  if (!root) throw new Error('--root is required.');
  const objects = findObjects(dir);
  const expected = new Map();
  for (const object of objects) {
    const pack = readSecretPack(object.objectPath);
    const { payload } = decryptSecretPayload(pack, unlockOptions());
    for (const file of payload.files) expected.set(file.path, { ...file, packId: object.packId });
  }
  const actualList = listRelativeFiles(root);
  const missing = [];
  const changed = [];
  const verified = [];
  for (const file of expected.values()) {
    const target = safeJoin(root, file.path);
    if (!fs.existsSync(target)) {
      missing.push({ path: file.path, packId: file.packId, expectedSha256: file.sha256, expectedBytes: file.size });
      continue;
    }
    const stat = fs.statSync(target);
    const actualSha256 = await hashFile(target);
    if (stat.size !== file.size || actualSha256 !== file.sha256) {
      changed.push({
        path: file.path,
        packId: file.packId,
        expectedSha256: file.sha256,
        actualSha256,
        expectedBytes: file.size,
        actualBytes: stat.size
      });
      continue;
    }
    verified.push({ path: file.path, bytes: file.size, sha256: file.sha256 });
  }
  const extra = actualList.files.filter((file) => !expected.has(file));
  const summary = {
    ok: missing.length === 0 && changed.length === 0,
    packId: objects.length === 1 ? objects[0].packId : '',
    packSetId: value('pack-set-id', ''),
    packIds: objects.map((object) => object.packId),
    root,
    expectedCount: expected.size,
    verifiedCount: verified.length,
    missingCount: missing.length,
    changedCount: changed.length,
    extraCount: extra.length,
    scanErrors: actualList.errors.length
  };
  const diff = {
    schema: 'skye.vaultos.diff.v1',
    generatedAt: new Date().toISOString(),
    hierarchy: 'FS27 -> SkyeVault -> SkySecure -> SkyeVaultOS',
    summary,
    missing,
    changed,
    extra: extra.slice(0, Number(value('extra-limit', '500'))),
    skipped: actualList.skipped,
    errors: actualList.errors
  };
  const diffId = value('pack-set-id', '') || objects[0].packId;
  const diffPath = path.join(ensureVault(dir).diffs, `diff-${sanitize(diffId)}-${utcStamp()}.json`);
  writeJson(diffPath, diff);
  const event = appendAudit({ action: 'pack.diffed', packId: objects.length === 1 ? objects[0].packId : '', packSetId: value('pack-set-id', ''), packIds: objects.map((object) => object.packId), root, summary }, dir);
  const receiptPath = await receipt('diff', { ok: summary.ok, diffPath, summary, event }, dir);
  jsonOut({ ok: summary.ok, diffPath, receipt: receiptPath, summary, missing: missing.slice(0, 100), changed: changed.slice(0, 100), extra: diff.extra });
  if (!summary.ok) process.exitCode = 2;
}

async function commandRestorePoint() {
  const dir = vaultDir();
  const paths = ensureVault(dir);
  let scanPath = resolvePath(value('scan')) || latestFile(paths.scans);
  let scanSummary = null;
  if (value('root')) {
    const { scan, scanPath: generatedScanPath } = await scanRoot(value('root'), { dir, includeFiles: true, hash: bool('hash', true) });
    scanPath = generatedScanPath;
    scanSummary = scan.summary;
  } else {
    scanSummary = readJson(scanPath, {})?.summary || null;
  }
  const policy = readPolicy(dir);
  const audit = readAudit(dir);
  const index = readIndex(dir);
  const restorePoint = {
    schema: 'skye.vaultos.restore-point.v1',
    id: `restore_${sanitize(value('name', 'vaultos'))}_${utcStamp()}`,
    name: value('name', 'VaultOS restore point'),
    createdAt: new Date().toISOString(),
    hierarchy: 'FS27 -> SkyeVault -> SkySecure -> SkyeVaultOS',
    vaultDir: dir,
    root: value('root') ? resolvePath(value('root')) : '',
    scanPath,
    scanSummary,
    indexSummary: {
      objectCount: index.objects.length,
      objects: index.objects.map((item) => ({
        packId: item.packId,
        objectSha256: item.objectSha256,
        bytes: item.bytes,
        fileCount: item.fileCount,
        plaintextBytes: item.plaintextBytes,
        encryptedBytes: item.encryptedBytes,
        types: item.types
      }))
    },
    accessSummary: {
      subjectCount: Object.keys(policy.subjects || {}).length,
      subjects: Object.values(policy.subjects || {}).map((subject) => ({
        id: subject.id,
        type: subject.type,
        roles: subject.roles,
        grantCount: (subject.grants || []).length
      }))
    },
    auditSummary: {
      eventCount: audit.length,
      latestEvents: audit.slice(-20).map((event) => ({
        id: event.id,
        recordedAt: event.recordedAt,
        action: event.action,
        packId: event.packId || '',
        actor: event.actor
      }))
    }
  };
  const restorePath = path.join(paths.restorePoints, `${restorePoint.id}.json`);
  writeJson(restorePath, restorePoint);
  const event = appendAudit({ action: 'restore-point.created', restorePointId: restorePoint.id, restorePath, root: restorePoint.root }, dir);
  const receiptPath = await receipt('restore-point', { ok: true, restorePointId: restorePoint.id, restorePath, event }, dir);
  jsonOut({ ok: true, restorePoint, restorePath, receipt: receiptPath });
}

async function commandGrant() {
  const dir = vaultDir();
  const subjectRaw = value('subject');
  if (!subjectRaw) throw new Error('--subject is required.');
  const subjectId = sanitize(subjectRaw);
  const role = sanitize(value('role', 'developer'));
  const scope = value('scope', value('pack-set-id') ? 'pack-set' : value('pack-id') ? 'pack' : 'workspace');
  const resource = value('pack-id', value('pack-set-id', '*'));
  if (!ROLE_CAPABILITIES[role]) throw new Error(`Unknown role: ${role}`);
  const policy = readPolicy(dir);
  policy.subjects[subjectId] ||= { id: subjectId, type: value('type', 'user'), displayName: value('name', subjectId), roles: [], grants: [] };
  if (!policy.subjects[subjectId].roles.includes(role)) policy.subjects[subjectId].roles.push(role);
  policy.subjects[subjectId].grants.push({ scope, resource, role, grantedAt: new Date().toISOString(), grantedBy: value('actor', process.env.USER || 'operator') });
  writePolicy(policy, dir);
  const event = appendAudit({ action: 'access.granted', subjectId, role, scope, resource }, dir);
  const receiptPath = await receipt('grant', { ok: true, subject: policy.subjects[subjectId], event }, dir);
  jsonOut({ ok: true, subject: policy.subjects[subjectId], receipt: receiptPath });
}

async function commandRevoke() {
  const dir = vaultDir();
  const subjectRaw = value('subject');
  if (!subjectRaw) throw new Error('--subject is required.');
  const subjectId = sanitize(subjectRaw);
  const resource = value('pack-id', value('pack-set-id', value('resource', '')));
  const role = value('role', '');
  const policy = readPolicy(dir);
  const subject = policy.subjects[subjectId];
  if (!subject) throw new Error(`Subject not found: ${subjectId}`);
  subject.grants = subject.grants.filter((grant) => {
    if (resource && grant.resource !== resource) return true;
    if (role && grant.role !== role) return true;
    return false;
  });
  if (role) subject.roles = subject.roles.filter((item) => item !== role);
  writePolicy(policy, dir);
  const event = appendAudit({ action: 'access.revoked', subjectId, role, resource }, dir);
  const receiptPath = await receipt('revoke', { ok: true, subject, event }, dir);
  jsonOut({ ok: true, subject, receipt: receiptPath });
}

async function commandPolicy() {
  jsonOut({ ok: true, policy: readPolicy(vaultDir()) });
}

async function commandAudit() {
  const action = value('action', '');
  const packId = value('pack-id', '');
  let events = readAudit(vaultDir());
  if (action) events = events.filter((event) => event.action === action);
  if (packId) events = events.filter((event) => event.packId === packId);
  jsonOut({ ok: true, count: events.length, events });
}

async function commandLs() {
  const dir = vaultDir();
  const manifest = buildVaultManifest(dir);
  const format = value('format', 'json');
  if (format === 'text') {
    for (const set of manifest.packSets) {
      process.stdout.write(`${set.packSetId}\t${set.objectCount} objects\t${set.fileCount} files\t${set.plaintextBytes} bytes\t${Object.entries(set.types).map(([type, count]) => `${type}:${count}`).join(',')}\n`);
    }
    return;
  }
  jsonOut({ ok: true, vaultDir: dir, count: manifest.packSets.length, packSets: manifest.packSets, objects: manifest.objects });
}

async function commandTree() {
  const dir = vaultDir();
  const scanPath = resolvePath(value('scan')) || latestFile(ensureVault(dir).scans);
  const scan = readJson(scanPath, null);
  if (!scan?.files?.length) throw new Error('No scan receipt with file list found. Pass --scan=<scan.json> or run scan first.');
  const limit = Number(value('limit', '400'));
  const format = value('format', 'json');
  const nodes = new Map();
  for (const file of scan.files) {
    const parts = file.path.split('/');
    let cursor = '';
    for (let index = 0; index < parts.length; index += 1) {
      cursor = cursor ? `${cursor}/${parts[index]}` : parts[index];
      const existing = nodes.get(cursor) || {
        path: cursor,
        name: parts[index],
        depth: index,
        type: index === parts.length - 1 ? file.type : 'folder',
        files: 0,
        bytes: 0
      };
      existing.files += index === parts.length - 1 ? 1 : 0;
      existing.bytes += index === parts.length - 1 ? Number(file.bytes || 0) : 0;
      nodes.set(cursor, existing);
    }
  }
  const tree = [...nodes.values()].sort((a, b) => a.path.localeCompare(b.path)).slice(0, limit);
  const event = appendAudit({ action: 'vault.tree', scanPath, count: tree.length }, dir);
  if (format === 'text') {
    for (const item of tree) process.stdout.write(`${'  '.repeat(item.depth)}${item.name}${item.type === 'folder' ? '/' : ` (${item.type}, ${item.bytes} bytes)`}\n`);
    return;
  }
  jsonOut({ ok: true, scanPath, root: scan.root, limit, count: tree.length, tree, event });
}

async function commandCatMeta() {
  const dir = vaultDir();
  const paths = ensureVault(dir);
  const kind = value('kind', value('type', 'auto'));
  if (kind === 'manifest') return jsonOut(buildVaultManifest(dir));
  if (kind === 'policy') return commandPolicy();
  if (kind === 'audit') return commandAudit();
  if (kind === 'scan') {
    const file = resolvePath(value('scan')) || latestFile(paths.scans);
    return jsonOut({ ok: true, kind: 'scan', path: file, scan: readJson(file, {}) });
  }
  if (kind === 'restore-point' || value('restore-point')) {
    const wanted = value('restore-point');
    const file = wanted
      ? listJsonFiles(paths.restorePoints).find((candidate) => path.basename(candidate, '.json') === wanted || candidate.includes(wanted))
      : latestFile(paths.restorePoints);
    return jsonOut({ ok: true, kind: 'restore-point', path: file, restorePoint: readJson(file, {}) });
  }
  if (value('pack-set-id')) {
    const objects = findObjects(dir).map((object) => publicObject(object, dir));
    return jsonOut({ ok: true, kind: 'pack-set', packSetId: value('pack-set-id'), objects, summary: packSetSummaries(objects)[0] || null });
  }
  const object = publicObject(findObject(value('pack-id'), dir), dir);
  jsonOut({ ok: true, kind: 'pack', object });
}

async function commandManifest() {
  const dir = vaultDir();
  const manifest = buildVaultManifest(dir);
  const output = resolvePath(value('output', value('to', '')));
  if (output) writeJson(output, manifest);
  const event = appendAudit({ action: 'vault.manifest', output: output ? relativeToRepoOrSelf(output) : '' }, dir);
  jsonOut({ ...manifest, manifestPath: output || '', event });
}

function copyFileInto(source, destination, { force = false } = {}) {
  if (!fs.existsSync(source)) return false;
  if (fs.existsSync(destination) && !force) return false;
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
  try {
    fs.chmodSync(destination, 0o600);
  } catch {}
  return true;
}

function copyFolderFiles(sourceDir, destinationDir, predicate = () => true, options = {}) {
  if (!fs.existsSync(sourceDir)) return [];
  const copied = [];
  for (const name of fs.readdirSync(sourceDir)) {
    const source = path.join(sourceDir, name);
    const stat = fs.statSync(source);
    if (stat.isDirectory()) {
      for (const nested of copyFolderFiles(source, path.join(destinationDir, name), predicate, options)) copied.push(nested);
      continue;
    }
    if (!stat.isFile() || !predicate(source)) continue;
    const destination = path.join(destinationDir, name);
    if (copyFileInto(source, destination, options)) copied.push(destination);
  }
  return copied;
}

async function commandBundle() {
  const dir = vaultDir();
  const target = resolvePath(value('to', value('output')));
  if (!target) throw new Error('--to is required.');
  if (fs.existsSync(target) && !bool('force')) throw new Error(`Bundle target already exists. Pass --force to replace: ${target}`);
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(target, { recursive: true });
  const paths = ensureVault(dir);
  const manifest = buildVaultManifest(dir);
  writeJson(path.join(target, 'SKYEVAULTOS_BUNDLE.json'), {
    schema: 'skye.vaultos.bundle.v1',
    createdAt: new Date().toISOString(),
    hierarchy: 'FS27 -> SkyeVault -> SkySecure -> SkyeVaultOS',
    sourceVaultDir: dir,
    manifest
  });
  writeJson(path.join(target, 'manifest.json'), manifest);
  const copied = [
    ...copyFolderFiles(paths.objects, path.join(target, 'objects'), (file) => file.endsWith('.skyesecrets'), { force: true }),
    ...copyFolderFiles(paths.receipts, path.join(target, 'receipts'), () => true, { force: true }),
    ...copyFolderFiles(paths.scans, path.join(target, 'scans'), () => true, { force: true }),
    ...copyFolderFiles(paths.diffs, path.join(target, 'diffs'), () => true, { force: true }),
    ...copyFolderFiles(paths.restorePoints, path.join(target, 'restore-points'), () => true, { force: true })
  ];
  copyFileInto(paths.index, path.join(target, 'vault-index.json'), { force: true });
  copyFileInto(paths.policy, path.join(target, 'access-policy.json'), { force: true });
  copyFileInto(paths.audit, path.join(target, 'audit-log.jsonl'), { force: true });
  const event = appendAudit({ action: 'vault.bundle.created', target, copiedCount: copied.length }, dir);
  jsonOut({ ok: true, bundleDir: target, manifestPath: path.join(target, 'manifest.json'), copiedCount: copied.length, event });
}

async function commandAttach() {
  const dir = vaultDir();
  const source = resolvePath(value('from', value('bundle')));
  if (!source) throw new Error('--from is required.');
  const bundleReceipt = readJson(path.join(source, 'SKYEVAULTOS_BUNDLE.json'), null);
  if (!bundleReceipt || bundleReceipt.schema !== 'skye.vaultos.bundle.v1') throw new Error(`Not a VaultOS bundle: ${source}`);
  const paths = ensureVault(dir);
  const copied = [
    ...copyFolderFiles(path.join(source, 'objects'), paths.objects, (file) => file.endsWith('.skyesecrets'), { force: bool('force', true) }),
    ...copyFolderFiles(path.join(source, 'receipts'), paths.receipts, () => true, { force: bool('force', true) }),
    ...copyFolderFiles(path.join(source, 'scans'), paths.scans, () => true, { force: bool('force', true) }),
    ...copyFolderFiles(path.join(source, 'diffs'), paths.diffs, () => true, { force: bool('force', true) }),
    ...copyFolderFiles(path.join(source, 'restore-points'), paths.restorePoints, () => true, { force: bool('force', true) })
  ];
  copyFileInto(path.join(source, 'vault-index.json'), paths.index, { force: bool('force', true) });
  copyFileInto(path.join(source, 'access-policy.json'), paths.policy, { force: bool('force', true) });
  copyFileInto(path.join(source, 'audit-log.jsonl'), paths.audit, { force: bool('force', true) });
  const event = appendAudit({ action: 'vault.bundle.attached', source, copiedCount: copied.length }, dir);
  jsonOut({ ok: true, vaultDir: dir, source, copiedCount: copied.length, event });
}

async function fs27Post(origin, route, body, secret) {
  const response = await fetch(`${origin.replace(/\/+$/, '')}${route}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-skysecure-write-secret': secret
    },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  let data = {};
  try {
    data = JSON.parse(text || '{}');
  } catch {
    data = { ok: false, error: text };
  }
  if (!response.ok || data.ok === false) throw new Error(`${route} failed: ${data.error || response.statusText}`);
  return data;
}

async function commandFs27Sync() {
  const dir = vaultDir();
  const origin = value('origin', process.env.SKYGATEFS27_ORIGIN || 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev');
  const secretName = value('secret-env', process.env.FS27_SKYESECURE_WRITE_SECRET ? 'FS27_SKYESECURE_WRITE_SECRET' : 'SKYESECURE_WRITE_SECRET');
  const secret = envSecret(secretName, '--secret-env');
  const manifest = buildVaultManifest(dir);
  const synced = [];
  for (const object of manifest.objects) {
    const pack = await fs27Post(origin, '/skysecure/packs', {
      pack_id: object.packId,
      workspace_id: object.workspaceId || manifest.workspaceId || 'fs27-skyevault',
      repo_id: object.repoId || 'metraiyux-0s',
      object_key: `vaultos/${object.packId}.skyesecrets`,
      object_sha256: object.objectSha256,
      object_bytes: object.objectBytes,
      file_count: object.fileCount,
      plaintext_bytes: object.plaintextBytes,
      encrypted_bytes: object.encryptedBytes,
      public_manifest: {
        hierarchy: manifest.hierarchy,
        packSetId: object.packSetId,
        packSetPart: object.packSetPart,
        packSetTotal: object.packSetTotal,
        projectName: object.projectName,
        types: object.types,
        restorePointCount: manifest.restorePoints.length,
        deleteGate: manifest.deleteGate,
        commandParity: manifest.commandParity
      },
      recipients: object.recipients,
      source: {
        kind: 'vaultos-fs27-sync',
        originalRoot: object.source.originalRoot,
        packSetId: object.packSetId,
        sourceHash: object.source.sourceHash,
        types: object.types,
        fileSample: object.source.fileSample.slice(0, 20)
      }
    }, secret);
    synced.push({ route: '/skysecure/packs', packId: object.packId, ok: pack.ok });
  }
  for (const restore of manifest.restorePoints.slice(0, 20)) {
    const event = await fs27Post(origin, '/skysecure/events', {
      pack_id: manifest.objects[0]?.packId || '',
      workspace_id: manifest.workspaceId || 'fs27-skyevault',
      action: 'vaultos.restore_point.created',
      meta: restore
    }, secret);
    synced.push({ route: '/skysecure/events', action: 'vaultos.restore_point.created', restorePointId: restore.id, ok: event.ok });
  }
  const summaryEvent = await fs27Post(origin, '/skysecure/events', {
    pack_id: manifest.objects[0]?.packId || '',
    workspace_id: manifest.workspaceId || 'fs27-skyevault',
    action: 'vaultos.manifest.synced',
    meta: {
      counts: manifest.counts,
      types: manifest.types,
      deleteGate: manifest.deleteGate,
      packSets: manifest.packSets.map((set) => ({ packSetId: set.packSetId, objectCount: set.objectCount, fileCount: set.fileCount }))
    }
  }, secret);
  synced.push({ route: '/skysecure/events', action: 'vaultos.manifest.synced', ok: summaryEvent.ok });
  const event = appendAudit({ action: 'fs27.synced', origin, syncedCount: synced.length }, dir);
  const out = { ok: true, origin, syncedCount: synced.length, synced, event };
  const output = resolvePath(value('output', ''));
  if (output) writeJson(output, out);
  jsonOut({ ...out, output });
}

function printHelp() {
  process.stdout.write(`SkyeVaultOS / SkySecure Vault Console

Hierarchy:
  FS27 -> SkyeVault -> SkySecure -> SkyeVaultOS

Commands:
  scan           --root='about to delete' [--include-node-modules=true] [--output=scan.json]
  offload        --root='about to delete' --passphrase-env=VAULTOS_PASSPHRASE [--pepper-env=VAULTOS_PEPPER] [--shard-mb=160]
  inventory      --vault-dir=.skyevault-out/fs27/skyevault/skysecure-vaultos
  search         --query=client [--type=environment] [--scan=scan.json]
  diff           --pack-id=<id>|--pack-set-id=<id> --root=/restore/path --passphrase-env=...
  verify         --pack-id=<id>|--pack-set-id=<id> [--passphrase-env=...] [--private-key=...]
  reload         --pack-id=<id>|--pack-set-id=<id> --to=/restore/path --passphrase-env=... [--dry-run] [--force]
  restore-point  --root='about to delete' --name=before-delete
  grant          --subject=dev --role=developer [--pack-id=<id>]
  revoke         --subject=dev [--role=developer] [--pack-id=<id>]
  audit          [--action=pack.reloaded] [--pack-id=<id>]
  ls             [--format=text] List vault pack sets and encrypted objects
  tree           [--scan=scan.json] [--format=text] Show scanned folder inventory tree
  cat-meta       --pack-id=<id>|--pack-set-id=<id>|--kind=manifest|policy|audit|scan|restore-point
  manifest       [--output=vaultos-manifest.json] Write a public-safe VaultOS manifest
  bundle         --to=/drive/bundle-dir [--force] Copy encrypted objects and receipts into a portable bundle
  attach         --from=/drive/bundle-dir --vault-dir=/target/vault [--force] Attach a bundle back into a vault
  fs27-sync      [--origin=https://...] [--secret-env=FS27_SKYESECURE_WRITE_SECRET] Sync safe VaultOS metadata to FS27
  init           Initialize the FS27/SkyeVault/SkySecure VaultOS folder
  ingest         --pack=client.skyesecrets
  index          Rebuild index from vault objects
  policy         Print access policy
`);
}

async function main() {
  if (command === 'help' || command === '--help' || command === '-h') return printHelp();
  if (command === 'init') return commandInit();
  if (command === 'scan') return commandScan();
  if (command === 'offload') return commandOffload();
  if (command === 'ingest') return commandIngest();
  if (command === 'index') return commandIndex();
  if (command === 'inventory') return commandInventory();
  if (command === 'search') return commandSearch();
  if (command === 'diff') return commandDiff();
  if (command === 'verify') return commandVerify();
  if (command === 'reload') return commandReload();
  if (command === 'restore-point') return commandRestorePoint();
  if (command === 'grant') return commandGrant();
  if (command === 'revoke') return commandRevoke();
  if (command === 'ls') return commandLs();
  if (command === 'tree') return commandTree();
  if (command === 'cat-meta') return commandCatMeta();
  if (command === 'manifest') return commandManifest();
  if (command === 'bundle') return commandBundle();
  if (command === 'attach') return commandAttach();
  if (command === 'fs27-sync') return commandFs27Sync();
  if (command === 'policy') return commandPolicy();
  if (command === 'audit') return commandAudit();
  throw new Error(`Unknown command: ${command}`);
}

try {
  await main();
} catch (error) {
  console.error(`SkyeVaultOS error: ${error.message}`);
  process.exitCode = 1;
}
