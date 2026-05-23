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
  sha256Text,
  utcStamp,
  validateSecretPack,
  writeSecretPack
} from '../packages/skye-secure/skye-secure-core.mjs';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const rawArgs = process.argv.slice(2);
const DEFAULT_VAULT_DIR = path.join(repoRoot, '.skyevault-out', 'skye-secure-platform');
const ROLE_CAPABILITIES = {
  owner: ['admin', 'read', 'download', 'unlock', 'restore', 'grant', 'revoke', 'offload', 'reload', 'audit'],
  admin: ['read', 'download', 'unlock', 'restore', 'grant', 'revoke', 'offload', 'reload', 'audit'],
  developer: ['read', 'download', 'unlock', 'restore', 'reload'],
  auditor: ['read', 'audit'],
  recovery: ['read', 'unlock', 'restore', 'reload']
};

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
  const value = args[name];
  if (value === undefined || value === true) return [];
  return Array.isArray(value) ? value.map(String) : [String(value)];
}

function value(name, fallback = '') {
  const found = values(name);
  return found.length ? found[found.length - 1] : fallback;
}

function bool(name) {
  const found = args[name];
  if (found === undefined) return false;
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
    index: path.join(dir, 'vault-index.json'),
    policy: path.join(dir, 'access-policy.json'),
    audit: path.join(dir, 'audit-log.jsonl')
  };
}

function ensureVault(dir = vaultDir()) {
  const paths = pathsForVault(dir);
  fs.mkdirSync(paths.objects, { recursive: true });
  fs.mkdirSync(paths.receipts, { recursive: true });
  if (!fs.existsSync(paths.index)) {
    writeJson(paths.index, {
      schema: 'skye.secure.platform.vault-index.v1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      workspaceId: value('workspace', value('workspace-id', 'default')),
      vaultDir: dir,
      objects: []
    }, 0o600);
  }
  if (!fs.existsSync(paths.policy)) {
    writeJson(paths.policy, {
      schema: 'skye.secure.platform.access-policy.v1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      workspaceId: value('workspace', value('workspace-id', 'default')),
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
    }, 0o600);
  }
  return paths;
}

function readJson(file, fallback = null) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, data, mode = 0o600) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, { mode });
  try { fs.chmodSync(file, mode); } catch {}
}

function jsonOut(data) {
  process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
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

function appendAudit(event, dir = vaultDir()) {
  const paths = ensureVault(dir);
  const full = {
    schema: 'skye.secure.platform.audit-event.v1',
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

function readIndex(dir = vaultDir()) {
  const paths = ensureVault(dir);
  return readJson(paths.index);
}

function writeIndex(index, dir = vaultDir()) {
  const paths = ensureVault(dir);
  index.updatedAt = new Date().toISOString();
  writeJson(paths.index, index);
}

function readPolicy(dir = vaultDir()) {
  const paths = ensureVault(dir);
  return readJson(paths.policy);
}

function writePolicy(policy, dir = vaultDir()) {
  const paths = ensureVault(dir);
  policy.updatedAt = new Date().toISOString();
  writeJson(paths.policy, policy);
}

function objectPathForPack(pack, dir = vaultDir()) {
  const paths = ensureVault(dir);
  const packId = pack.publicManifest.packId;
  return path.join(paths.objects, `${sanitize(packId)}.skyesecrets`);
}

function classifyFile(pathName) {
  const ext = path.extname(pathName).toLowerCase();
  const base = path.basename(pathName).toLowerCase();
  if (base.startsWith('.env')) return 'environment';
  if (/(credential|service-account|secret|token|key)/i.test(pathName)) return 'credential';
  if (['.pem', '.key', '.p12', '.pfx'].includes(ext)) return 'private-key';
  if (['.db', '.sqlite', '.sqlite3', '.dump', '.backup'].includes(ext)) return 'database';
  if (['.json'].includes(ext)) return 'json';
  if (['.md', '.txt', '.log'].includes(ext)) return 'text';
  return ext ? ext.slice(1) : 'file';
}

function typeBreakdown(files = []) {
  const out = {};
  for (const file of files) out[classifyFile(file.path)] = (out[classifyFile(file.path)] || 0) + 1;
  return out;
}

function listRelativeFiles(root) {
  const resolvedRoot = path.resolve(root);
  const files = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      const relative = path.relative(resolvedRoot, file).split(path.sep).join('/');
      if (['.git', 'node_modules', '.skyevault-out'].includes(entry.name)) continue;
      if (entry.isDirectory()) walk(file);
      else if (entry.isFile()) files.push(relative);
    }
  }
  walk(resolvedRoot);
  return files.sort((a, b) => a.localeCompare(b));
}

async function receipt(kind, data, dir = vaultDir()) {
  const paths = ensureVault(dir);
  const file = path.join(paths.receipts, `${kind}-${utcStamp()}.json`);
  writeJson(file, {
    schema: 'skye.secure.platform.receipt.v1',
    kind,
    recordedAt: new Date().toISOString(),
    ...data
  });
  return file;
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
    workspaceId: summary.workspaceId || index.workspaceId || '',
    repoId: summary.repoId || '',
    clientName: summary.clientName || '',
    projectName: summary.projectName || '',
    fileCount: summary.fileCount,
    plaintextBytes: summary.plaintextBytes,
    encryptedBytes: summary.encryptedBytes,
    recipients: summary.recipients,
    integrity: summary.integrity,
    source,
    types: source.types || {},
    tags: values('tag')
  };
  index.objects = index.objects.filter((object) => object.packId !== item.packId);
  index.objects.push(item);
  index.objects.sort((a, b) => String(a.packId).localeCompare(String(b.packId)));
  writeIndex(index, dir);
  appendAudit({ action: 'pack.indexed', packId: item.packId, objectPath: packFile, copied, source }, dir);
  return item;
}

function findObject(packId, dir = vaultDir()) {
  const index = readIndex(dir);
  const wanted = String(packId || value('pack-id') || '').trim();
  if (!wanted) throw new Error('--pack-id is required.');
  const match = index.objects.find((item) => item.packId === wanted || item.id === wanted || item.packId.includes(wanted));
  if (!match) throw new Error(`Pack not found in vault index: ${wanted}`);
  return match;
}

async function commandInit() {
  const dir = vaultDir();
  const paths = ensureVault(dir);
  appendAudit({ action: 'vault.initialized', vaultDir: dir }, dir);
  jsonOut({ ok: true, vaultDir: dir, paths });
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

async function commandIndex() {
  const dir = vaultDir();
  ensureVault(dir);
  const paths = pathsForVault(dir);
  const indexed = [];
  for (const file of fs.readdirSync(paths.objects).filter((name) => name.endsWith('.skyesecrets'))) {
    const full = path.join(paths.objects, file);
    try {
      indexed.push(await addPackToIndex({ packFile: full, copied: true, source: { kind: 'scan' } }, dir));
    } catch (error) {
      appendAudit({ action: 'pack.index_failed', objectPath: full, error: error.message }, dir);
    }
  }
  jsonOut({ ok: true, vaultDir: dir, indexedCount: indexed.length, index: readIndex(dir) });
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
    vaultDir: dir,
    workspaceId: index.workspaceId,
    objectCount: index.objects.length,
    totalBytes,
    types,
    auditEventCount: audit.length,
    objects: index.objects
  });
}

async function commandSearch() {
  const query = value('query', value('q', '')).toLowerCase();
  const type = value('type', '').toLowerCase();
  const index = readIndex();
  const matches = index.objects.filter((item) => {
    const haystack = JSON.stringify({
      packId: item.packId,
      workspaceId: item.workspaceId,
      repoId: item.repoId,
      clientName: item.clientName,
      projectName: item.projectName,
      source: item.source,
      tags: item.tags
    }).toLowerCase();
    const queryOk = !query || haystack.includes(query);
    const typeOk = !type || Object.prototype.hasOwnProperty.call(item.types || {}, type);
    return queryOk && typeOk;
  });
  appendAudit({ action: 'vault.search', query, type, matchCount: matches.length });
  jsonOut({ ok: true, query, type, matchCount: matches.length, matches });
}

function unlockOptions() {
  return {
    recipientId: value('recipient', ''),
    passphrase: value('passphrase-env') ? envSecret(value('passphrase-env'), '--passphrase-env') : '',
    pepper: value('pepper-env') ? envSecret(value('pepper-env'), '--pepper-env') : '',
    privateKeyPem: value('private-key') ? JSON.parse(fs.readFileSync(resolvePath(value('private-key')), 'utf8')).privateKeyPem : ''
  };
}

async function commandVerify() {
  const object = findObject(value('pack-id'));
  const pack = readSecretPack(object.objectPath);
  const envelope = validateSecretPack(pack);
  let payloadVerified = false;
  let fileCount = object.fileCount;
  if (value('passphrase-env') || value('private-key')) {
    const { payload } = decryptSecretPayload(pack, unlockOptions());
    payloadVerified = true;
    fileCount = payload.files.length;
  }
  const event = appendAudit({ action: 'pack.verified', packId: object.packId, envelopeVerified: true, payloadVerified });
  const receiptPath = await receipt('verify', { ok: true, object, envelope, payloadVerified, fileCount, event });
  jsonOut({ ok: true, object, envelope, payloadVerified, fileCount, receipt: receiptPath });
}

async function commandReload() {
  const object = findObject(value('pack-id'));
  const target = resolvePath(value('to', value('root')));
  if (!target) throw new Error('--to is required.');
  const pack = readSecretPack(object.objectPath);
  const { payload } = decryptSecretPayload(pack, unlockOptions());
  const result = restorePayloadFiles({ payload, root: target, force: bool('force'), dryRun: bool('dry-run') });
  const event = appendAudit({
    action: 'pack.reloaded',
    packId: object.packId,
    target,
    restoredCount: result.restored.length,
    conflictCount: result.conflicts.length,
    dryRun: result.dryRun
  });
  const receiptPath = await receipt('reload', { ok: result.conflicts.length === 0, object, result, event });
  jsonOut({ ok: result.conflicts.length === 0, object, result, receipt: receiptPath });
  if (result.conflicts.length) process.exitCode = 2;
}

async function commandOffload() {
  const dir = vaultDir();
  const sourceRoot = resolvePath(value('root', value('dir')));
  if (!sourceRoot) throw new Error('--root is required.');
  if (!fs.existsSync(sourceRoot) || !fs.statSync(sourceRoot).isDirectory()) throw new Error(`Offload root is not a directory: ${sourceRoot}`);
  const relativeFiles = values('path').length ? values('path') : listRelativeFiles(sourceRoot);
  if (!relativeFiles.length) throw new Error(`No files found to offload: ${sourceRoot}`);
  const collection = collectFiles({
    root: sourceRoot,
    paths: relativeFiles,
    allowMissing: false,
    includeSymlinks: bool('include-symlinks'),
    maxFileBytes: Number(value('max-file-mb', '50')) * 1024 * 1024
  });
  const payload = buildPayloadFromFiles({
    collection,
    restorePolicy: {
      product: 'SkyeSecure Platform Offload',
      originalRoot: sourceRoot,
      defaultOverwrite: false
    }
  });
  const passphraseEnv = value('passphrase-env');
  if (!passphraseEnv) throw new Error('--passphrase-env is required for offload.');
  const sourceHash = sha256Text(collection.files.map((item) => `${item.path}:${item.sha256}`).join('\n'));
  const recipients = [{
    type: 'passphrase',
    recipientId: sanitize(value('recipient', 'owner')),
    passphrase: envSecret(passphraseEnv, '--passphrase-env'),
    pepper: value('pepper-env') ? envSecret(value('pepper-env'), '--pepper-env') : '',
    hint: value('hint', 'platform offload')
  }];
  const { pack } = buildSecretPack({
    payload,
    recipients,
    metadata: {
      workspaceId: value('workspace', value('workspace-id', path.basename(sourceRoot))),
      repoId: value('repo', value('repo-id', path.basename(repoRoot))),
      clientName: value('client', ''),
      projectName: value('project', `Offload ${path.basename(sourceRoot)}`),
      notes: value('notes', 'Created by SkyeSecure Platform offload. Plaintext remains local until reload.'),
      fileCount: collection.files.length,
      plaintextBytes: collection.plaintextBytes,
      sourceBoundarySha256: sourceHash,
      sourceBoundaryRef: sourceRoot,
      restoreRootHint: path.basename(sourceRoot)
    }
  });
  const destination = objectPathForPack(pack, dir);
  writeSecretPack(destination, pack);
  const source = {
    kind: 'offload',
    originalRoot: sourceRoot,
    fileCount: collection.files.length,
    plaintextBytes: collection.plaintextBytes,
    sourceHash,
    types: typeBreakdown(collection.files),
    deleteReady: false
  };
  const item = await addPackToIndex({ packFile: destination, copied: true, source }, dir);
  const event = appendAudit({ action: 'folder.offloaded', packId: item.packId, sourceRoot, fileCount: collection.files.length }, dir);
  const receiptPath = await receipt('offload', { ok: true, item, source, event }, dir);
  jsonOut({ ok: true, item, source, receipt: receiptPath });
}

async function commandGrant() {
  const dir = vaultDir();
  const subjectRaw = value('subject');
  if (!subjectRaw) throw new Error('--subject is required.');
  const subjectId = sanitize(subjectRaw);
  const role = sanitize(value('role', 'developer'));
  const scope = value('scope', value('pack-id') ? 'pack' : 'workspace');
  const resource = value('pack-id', '*');
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
  const resource = value('pack-id', value('resource', ''));
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
  jsonOut({ ok: true, policy: readPolicy() });
}

async function commandAudit() {
  const action = value('action', '');
  const packId = value('pack-id', '');
  let events = readAudit();
  if (action) events = events.filter((event) => event.action === action);
  if (packId) events = events.filter((event) => event.packId === packId);
  jsonOut({ ok: true, count: events.length, events });
}

function printHelp() {
  process.stdout.write(`SkyeSecure Platform

Commands:
  init       --vault-dir=.skyevault-out/skye-secure-platform --workspace=acme
  offload    --root='about to delete' --passphrase-env=SKYE_SECURE_PASSPHRASE [--pepper-env=SKYE_SECURE_PEPPER]
  ingest     --pack=client.skyesecrets
  index      Rebuild index from vault objects
  inventory  Print object/type/audit summary
  search     --query=client [--type=environment]
  verify     --pack-id=<id> [--passphrase-env=...] [--private-key=...]
  reload     --pack-id=<id> --to=/restore/path --passphrase-env=... [--dry-run] [--force]
  grant      --subject=dev --role=developer [--pack-id=<id>]
  revoke     --subject=dev [--role=developer] [--pack-id=<id>]
  policy     Print access policy
  audit      [--action=pack.reloaded] [--pack-id=<id>]
`);
}

async function main() {
  if (command === 'help' || command === '--help' || command === '-h') return printHelp();
  if (command === 'init') return commandInit();
  if (command === 'offload') return commandOffload();
  if (command === 'ingest') return commandIngest();
  if (command === 'index') return commandIndex();
  if (command === 'inventory') return commandInventory();
  if (command === 'search') return commandSearch();
  if (command === 'verify') return commandVerify();
  if (command === 'reload') return commandReload();
  if (command === 'grant') return commandGrant();
  if (command === 'revoke') return commandRevoke();
  if (command === 'policy') return commandPolicy();
  if (command === 'audit') return commandAudit();
  throw new Error(`Unknown command: ${command}`);
}

try {
  await main();
} catch (error) {
  console.error(`SkyeSecure Platform error: ${error.message}`);
  process.exitCode = 1;
}
