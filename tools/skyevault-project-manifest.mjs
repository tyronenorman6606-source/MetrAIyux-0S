#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const rawArgs = process.argv.slice(2);
const outputPath = resolvePath(argValue('--out'), path.join(repoRoot, 'metraiyux_0s_site', 'proof', 'repo-vault-project-manifest.json'));
const outputRelPath = path.relative(repoRoot, outputPath).split(path.sep).join('/');
const outputChunkRelDir = path.join(path.dirname(outputRelPath), 'repo-vault-project-manifest').split(path.sep).join('/');
const maxEntries = Math.max(100, Number(argValue('--max-entries') || process.env.SKYEVAULT_PROJECT_MANIFEST_MAX_ENTRIES || 250000));
const maxPrivate = Math.max(25, Number(argValue('--max-private') || process.env.SKYEVAULT_PROJECT_MANIFEST_MAX_PRIVATE || 250000));
const maxSkipped = Math.max(25, Number(argValue('--max-skipped') || process.env.SKYEVAULT_PROJECT_MANIFEST_MAX_SKIPPED || 250000));
const chunkSize = Math.max(500, Number(argValue('--chunk-size') || process.env.SKYEVAULT_PROJECT_MANIFEST_CHUNK_SIZE || 1000));
const sampleSize = Math.max(100, Number(argValue('--sample-size') || process.env.SKYEVAULT_PROJECT_MANIFEST_SAMPLE_SIZE || 700));
const directorySampleSize = Math.max(100, Number(argValue('--directory-sample-size') || process.env.SKYEVAULT_PROJECT_MANIFEST_DIRECTORY_SAMPLE_SIZE || 2500));

const SKIP_DIRS = new Map([
  ['.git', 'git object store; represented by branch/head and encrypted full artifact'],
  ['node_modules', 'dependency install output; regenerate from lockfiles'],
  ['.netlify', 'local Netlify cache'],
  ['.wrangler', 'local Cloudflare cache/state'],
  ['.wrangler-dry-run', 'local Cloudflare dry-run state'],
  ['.claude', 'local assistant/tool state'],
  ['.pw-browsers', 'local Playwright browser cache'],
  ['.tmp', 'generated staging tree'],
  ['.1', 'local imported handoff tree'],
  ['download-handoffs', 'generated downloadable handoff bundles'],
  ['test-artifacts', 'generated proof/test artifacts'],
  ['test-results', 'generated test results'],
  ['.skyevault-out', 'local vault receipts and private source-custody working files']
]);

const PRIVATE_EXTS = new Map([
  ['.pem', 'private key/certificate material'],
  ['.key', 'private key/certificate material'],
  ['.p12', 'private key/certificate material'],
  ['.pfx', 'private key/certificate material'],
  ['.sqlite', 'local database'],
  ['.sqlite3', 'local database'],
  ['.db', 'local database'],
  ['.dump', 'database dump'],
  ['.backup', 'backup file'],
  ['.bak', 'backup file']
]);

function argValue(name, fallback = '') {
  const prefix = `${name}=`;
  return rawArgs.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || fallback;
}

function resolvePath(value, fallback) {
  const clean = String(value || '').trim();
  if (!clean) return fallback;
  return path.isAbsolute(clean) ? clean : path.resolve(repoRoot, clean);
}

function git(args, fallback = '') {
  try {
    return execFileSync('git', args, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 1024 * 1024 * 64
    }).trim();
  } catch {
    return fallback;
  }
}

function gitBuffer(args) {
  try {
    return execFileSync('git', args, {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 1024 * 1024 * 128
    });
  } catch {
    return Buffer.alloc(0);
  }
}

function gitZeroLines(args) {
  const output = gitBuffer(args).toString('utf8');
  return output ? output.split('\0').filter(Boolean) : [];
}

function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o644 });
}

function rel(file) {
  return path.relative(repoRoot, file).split(path.sep).join('/');
}

function sha12(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex').slice(0, 12);
}

function humanBytes(value) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = Number(value || 0);
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(size >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
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

function statusMap() {
  const map = new Map();
  const lines = git(['status', '--porcelain=v1', '--untracked-files=all'], '').split(/\r?\n/).filter(Boolean);
  for (const line of lines) {
    const code = line.slice(0, 2).trim() || 'changed';
    for (const itemPath of statusLinePaths(line)) {
      const flags = map.get(itemPath) || [];
      flags.push(code === '??' ? 'untracked' : code.includes('D') ? 'deleted' : 'changed');
      map.set(itemPath, [...new Set(flags)]);
    }
  }
  return map;
}

function skipDirForPath(itemPath) {
  return itemPath.split('/').find((part) => SKIP_DIRS.has(part)) || '';
}

function isGeneratedManifestPath(itemPath) {
  const clean = String(itemPath || '').replace(/\\/g, '/');
  return clean === outputRelPath || clean.startsWith(`${outputChunkRelDir}/`);
}

function privatePolicy(itemPath) {
  const base = path.basename(itemPath);
  if (/^\.env($|\.)/.test(base) || /^\.env/.test(base)) return { reason: 'environment file', rule: 'env-file', critical: true };
  if (/^id_rsa/.test(base)) return { reason: 'private SSH key', rule: 'private-key-name', critical: true };
  if (/credentials.*\.json$/i.test(base) || /service-account.*\.json$/i.test(base)) return { reason: 'credential/service-account JSON', rule: 'credentials-json', critical: true };
  const ext = path.extname(itemPath).toLowerCase();
  if (PRIVATE_EXTS.has(ext)) return { reason: PRIVATE_EXTS.get(ext), rule: `extension:${ext}`, critical: true };
  return null;
}

function statEntry(itemPath, source, statuses = [], deltaEntry = null) {
  const full = path.join(repoRoot, itemPath);
  const skipDir = skipDirForPath(itemPath);
  if (skipDir) {
    return {
      path: itemPath,
      type: 'skipped',
      source,
      status: statuses,
      bytes: deltaEntry?.bytes ?? null,
      human: deltaEntry?.bytes ? humanBytes(deltaEntry.bytes) : '',
      policy: { reason: SKIP_DIRS.get(skipDir), rule: `directory:${skipDir}`, critical: skipDir === '.skyevault-out' },
      browser_stream: false,
      encrypted_full_artifact: true
    };
  }
  const policy = privatePolicy(itemPath) || deltaEntry?.policy || null;
  let stat = null;
  try {
    stat = fs.lstatSync(full);
  } catch {}
  const type = stat?.isDirectory() ? 'directory' : stat?.isSymbolicLink() ? 'symlink' : stat?.isFile() ? 'file' : deltaEntry?.exists === false ? 'deleted' : 'missing';
  const bytes = stat?.isFile() ? stat.size : Number(deltaEntry?.bytes || 0);
  const privateOnly = Boolean(policy?.critical || deltaEntry?.secretHitCount);
  return {
    path: itemPath,
    type,
    source,
    status: statuses,
    bytes,
    human: bytes ? humanBytes(bytes) : '',
    ext: type === 'file' ? path.extname(itemPath).toLowerCase() : '',
    mtime: stat?.mtime ? stat.mtime.toISOString() : '',
    sha256_prefix: privateOnly ? '' : String(deltaEntry?.sha256 || '').slice(0, 16),
    policy: policy ? { reason: policy.reason || 'private boundary', rule: policy.rule || 'policy', critical: Boolean(policy.critical) } : null,
    secret_hit_count: Number(deltaEntry?.secretHitCount || 0),
    browser_stream: !privateOnly && type !== 'skipped',
    encrypted_full_artifact: true
  };
}

function addDirectoryRollup(rollups, item) {
  const parts = item.path.split('/').filter(Boolean);
  for (let index = 0; index < parts.length - (item.type === 'directory' ? 0 : 1); index += 1) {
    const dirPath = parts.slice(0, index + 1).join('/');
    const current = rollups.get(dirPath) || { path: dirPath, type: 'directory', file_count: 0, dir_count: 0, private_count: 0, skipped_count: 0, bytes: 0 };
    if (item.type === 'directory') current.dir_count += 1;
    else if (item.type === 'skipped') current.skipped_count += 1;
    else current.file_count += 1;
    if (!item.browser_stream) current.private_count += 1;
    current.bytes += Number(item.bytes || 0);
    rollups.set(dirPath, current);
  }
}

function topLevelFromRollups(rollups) {
  return [...rollups.values()]
    .filter((item) => item.path && !item.path.includes('/'))
    .sort((a, b) => {
      const aHidden = a.path.startsWith('.') ? 1 : 0;
      const bHidden = b.path.startsWith('.') ? 1 : 0;
      if (aHidden !== bHidden) return aHidden - bHidden;
      return a.path.localeCompare(b.path);
    })
    .map((item) => ({ ...item, human: humanBytes(item.bytes) }));
}

function sampleSort(a, b) {
  const priority = (item) => {
    const p = item.path || '';
    if (p.startsWith('metraiyux_0s_site/')) return 0;
    if (p.startsWith('marketing/')) return 1;
    if (p.startsWith('tools/') || p.startsWith('scripts/')) return 2;
    if (p.startsWith('MCP/')) return 3;
    if (p.startsWith('.')) return 9;
    return 4;
  };
  const delta = priority(a) - priority(b);
  return delta || String(a.path || '').localeCompare(String(b.path || ''));
}

function latestProof() {
  return readJson(path.join(repoRoot, 'metraiyux_0s_site', 'proof', 'skyevault-autosync-proof.json'), null) || {};
}

function latestDeltaState() {
  return readJson(path.join(repoRoot, '.skyevault-out', 'delta-journal', 'latest-state.json'), null) || {};
}

function buildManifest() {
  const proof = latestProof();
  const delta = latestDeltaState();
  const deltaEntries = new Map((Array.isArray(delta.entries) ? delta.entries : []).map((entry) => [entry.path, entry]));
  const statuses = statusMap();
  const tracked = gitZeroLines(['ls-files', '-z']);
  const untracked = gitZeroLines(['ls-files', '-z', '--others', '--exclude-standard']);
  const paths = new Map();
  for (const itemPath of tracked) paths.set(itemPath, { source: 'git-tracked' });
  for (const itemPath of untracked) paths.set(itemPath, { source: paths.has(itemPath) ? 'git-tracked+untracked' : 'git-untracked' });
  for (const entry of deltaEntries.values()) {
    if (!paths.has(entry.path)) paths.set(entry.path, { source: 'delta-journal' });
  }
  for (const itemPath of [...paths.keys()]) {
    if (isGeneratedManifestPath(itemPath)) paths.delete(itemPath);
  }

  const entries = [];
  const privateEntries = [];
  const skipped = [];
  for (const [itemPath, meta] of [...paths.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (entries.length >= maxEntries && !deltaEntries.has(itemPath)) continue;
    const item = statEntry(itemPath, meta.source, statuses.get(itemPath) || [], deltaEntries.get(itemPath));
    if (item.type === 'skipped') {
      if (skipped.length < maxSkipped) skipped.push(item);
      continue;
    }
    if (!item.browser_stream || item.policy?.critical || item.secret_hit_count) {
      if (privateEntries.length < maxPrivate) privateEntries.push(item);
      continue;
    }
    entries.push(item);
  }

  const rollups = new Map();
  for (const item of [...entries, ...privateEntries, ...skipped]) addDirectoryRollup(rollups, item);
  const directoryRollups = [...rollups.values()]
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((item) => ({ ...item, human: humanBytes(item.bytes) }));
  const upload = proof.latestUpload || {};
  const projectBytes = entries.reduce((sum, item) => sum + Number(item.bytes || 0), 0);
  return {
    schema: 'skyevault.project-manifest.v1',
    generatedAt: new Date().toISOString(),
    host: os.hostname(),
    repo: {
      name: proof.repo?.name || 'MetrAIyux-0S',
      root: 'local-dev-workspace',
      rootHash: sha12(repoRoot),
      branch: proof.repo?.branch || delta.branch || git(['branch', '--show-current'], 'main'),
      head: delta.head || git(['rev-parse', 'HEAD'], ''),
      shortHead: proof.repo?.shortHead || delta.shortHead || git(['rev-parse', '--short', 'HEAD'], ''),
      upstream: proof.repo?.upstream || delta.upstream || git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], '')
    },
    safety: {
      path_metadata_only: true,
      raw_file_bodies_exposed: false,
      secret_values_exposed: false,
      private_paths_are_path_metadata_only: true,
      full_source_custody: 'encrypted full-repo artifact plus encrypted delta journals'
    },
    coverage: {
      tracked_count: tracked.length,
      untracked_count: untracked.length,
      delta_entry_count: Number(delta.entryCount || deltaEntries.size || 0),
      safe_browser_entry_count: entries.length,
      private_entry_count: privateEntries.length,
      skipped_entry_count: skipped.length,
      directory_count: directoryRollups.length,
      safe_browser_bytes: projectBytes,
      safe_browser_human: humanBytes(projectBytes),
      status_counts: delta.statusCounts || {},
      changed_file_count: Number(delta.changedFileCount || 0),
      tombstone_count: Number(delta.tombstoneCount || 0),
      skipped_count: Number(delta.skippedCount || skipped.length || 0),
      local_only_critical_count: Number(proof.currentStatus?.localOnlyCriticalCount || privateEntries.filter((item) => item.policy?.critical).length),
      secret_like_total: Number(proof.currentStatus?.secretLikeTotal || privateEntries.reduce((sum, item) => sum + Number(item.secret_hit_count || 0), 0))
    },
    encrypted_full_artifact: {
      receipt_id: upload.receiptId || '',
      artifact_bytes: upload.artifactBytes || null,
      artifact_human: upload.artifactBytes ? humanBytes(upload.artifactBytes) : '',
      artifact_sha256_prefix: String(upload.artifactSha256 || '').slice(0, 20),
      recovery_url: upload.recoveryUrl || '',
      control_receipt_id: upload.controlReceiptId || '',
      ledger_entry_count: upload.ledgerEntryCount || null,
      note: 'This is the full-project custody lane. Browser manifest lists paths/metadata only; the actual full source archive is encrypted before upload.'
    },
    delta_journal: {
      action: proof.latestDeltaJournal?.action || '',
      completed_at: proof.latestDeltaJournal?.completedAt || '',
      changed_file_count: proof.latestDeltaJournal?.changedFileCount || delta.changedFileCount || 0,
      pack_bytes: proof.latestDeltaJournal?.packBytes || null,
      upload_receipt_id: proof.latestDeltaJournal?.uploadReceiptId || ''
    },
    top_level: topLevelFromRollups(rollups),
    directory_rollups: directoryRollups,
    entries,
    private_entries: privateEntries,
    skipped_entries: skipped
  };
}

function chunkItems(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function writeChunkGroup(name, items) {
  const outDir = path.join(path.dirname(outputPath), 'repo-vault-project-manifest');
  fs.mkdirSync(outDir, { recursive: true });
  return chunkItems(items, chunkSize).map((chunk, index) => {
    const id = `${name}-${String(index).padStart(3, '0')}`;
    const file = path.join(outDir, `${id}.json`);
    const payload = {
      schema: 'skyevault.project-manifest-chunk.v1',
      generatedAt: new Date().toISOString(),
      group: name,
      id,
      index,
      count: chunk.length,
      entries: chunk
    };
    writeJson(file, payload);
    const bytes = fs.statSync(file).size;
    return {
      id,
      group: name,
      index,
      count: chunk.length,
      bytes,
      human: humanBytes(bytes),
      href: `/proof/repo-vault-project-manifest/${id}.json`,
      api: `/api/founder-command/repo-vault?chunk=${encodeURIComponent(id)}`
    };
  });
}

const manifest = buildManifest();
const fullEntries = manifest.entries;
const fullPrivateEntries = manifest.private_entries;
const fullSkippedEntries = manifest.skipped_entries;
const fullDirectoryRollups = manifest.directory_rollups;
fs.rmSync(path.join(path.dirname(outputPath), 'repo-vault-project-manifest'), { recursive: true, force: true });
const chunks = [
  ...writeChunkGroup('entries', fullEntries),
  ...writeChunkGroup('private', fullPrivateEntries),
  ...writeChunkGroup('skipped', fullSkippedEntries)
];
manifest.entries_sample = fullEntries.slice().sort(sampleSort).slice(0, sampleSize);
manifest.private_entries_sample = fullPrivateEntries.slice(0, Math.min(sampleSize, 500));
manifest.skipped_entries_sample = fullSkippedEntries.slice(0, Math.min(sampleSize, 500));
manifest.directory_rollups_sample = fullDirectoryRollups.slice(0, directorySampleSize);
manifest.chunks = chunks;
manifest.coverage.chunk_count = chunks.length;
manifest.coverage.full_entry_count = fullEntries.length;
manifest.coverage.full_private_entry_count = fullPrivateEntries.length;
manifest.coverage.full_skipped_entry_count = fullSkippedEntries.length;
manifest.coverage.full_directory_count = fullDirectoryRollups.length;
delete manifest.entries;
delete manifest.private_entries;
delete manifest.skipped_entries;
delete manifest.directory_rollups;
writeJson(outputPath, manifest);
console.log(JSON.stringify({
  ok: true,
  outputPath: rel(outputPath),
  generatedAt: manifest.generatedAt,
  safe_browser_entry_count: manifest.coverage.safe_browser_entry_count,
  private_entry_count: manifest.coverage.private_entry_count,
  skipped_entry_count: manifest.coverage.skipped_entry_count,
  directory_count: manifest.coverage.directory_count,
  chunk_count: manifest.coverage.chunk_count,
  encrypted_full_artifact: manifest.encrypted_full_artifact.receipt_id || ''
}, null, 2));
