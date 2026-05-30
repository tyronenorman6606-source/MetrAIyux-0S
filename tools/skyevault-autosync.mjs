#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const rawArgs = process.argv.slice(2);
const command = rawArgs.find((arg) => !arg.startsWith('--')) || 'once';
applyEnvFiles();
const dryRun = flag('--dry-run') || envFlag('SKYEVAULT_AUTOSYNC_DRY_RUN', false);
const force = flag('--force') || envFlag('SKYEVAULT_AUTOSYNC_FORCE', false);
const skipMap = flag('--skip-map') || envFlag('SKYEVAULT_AUTOSYNC_SKIP_MAP', false);
const skipBins = flag('--skip-bins') || envFlag('SKYEVAULT_AUTOSYNC_SKIP_BINS', false);
const skipDelta = flag('--skip-delta') || envFlag('SKYEVAULT_AUTOSYNC_SKIP_DELTA', false);
const skipGitOrigin = flag('--skip-git-origin') || envFlag('SKYEVAULT_AUTOSYNC_SKIP_GIT_ORIGIN', false);
const gitOriginSync = !skipGitOrigin && envFlag('SKYEVAULT_AUTOSYNC_GIT_ORIGIN_SYNC', false);
const deltaRequired = flag('--require-delta') || envFlag('SKYEVAULT_AUTOSYNC_DELTA_REQUIRED', false);
const deltaUpload = !flag('--no-delta-upload') && envFlag('SKYEVAULT_AUTOSYNC_DELTA_UPLOAD', true);

const SKIP_DIRS = new Set([
  '.git',
  'node_modules',
  '.netlify',
  '.wrangler',
  '.wrangler-dry-run',
  '.claude',
  '.pw-browsers',
  'test-artifacts',
  'test-results',
  '.skyevault-out'
]);

const GENERATED_SKIP_DIRS = new Set([
  '.tmp',
  '.1',
  'download-handoffs',
  'backups',
  'wal_archive',
  '.staffing-db'
]);

const SELF_GENERATED_OUTPUTS = new Set([
  'metraiyux_0s_site/brain/skyevault-vault-map.json',
  'metraiyux_0s_site/brain/skyevault-workspaces/index.json',
  'metraiyux_0s_site/cloudflare/generated-changelog-page.mjs',
  'metraiyux_0s_site/proof/skyevault-autosync-proof.html',
  'metraiyux_0s_site/proof/skyevault-autosync-proof.json',
  'metraiyux_0s_site/proof/skyevault-autosync-proof-log.json'
]);

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

const LOCAL_ONLY_EXTS = new Map([
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

function argValues(name) {
  const prefix = `${name}=`;
  return rawArgs.filter((arg) => arg.startsWith(prefix)).map((arg) => arg.slice(prefix.length)).filter(Boolean);
}

function flag(name) {
  return rawArgs.includes(name);
}

function parseEnvFile(file) {
  const values = {};
  if (!file || !fs.existsSync(file)) return values;
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

function expandEnvValue(value, values, depth = 0) {
  if (depth > 8) return value;
  return String(value || '').replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, name) => {
    const replacement = process.env[name] ?? values[name] ?? '';
    return expandEnvValue(replacement, values, depth + 1);
  });
}

function applyEnvFiles() {
  const files = [
    ...String(process.env.SKYEVAULT_AUTOSYNC_ENV_FILE || '').split(path.delimiter).filter(Boolean),
    ...argValues('--env-file')
  ];
  for (const file of files) {
    const resolved = path.isAbsolute(file) ? file : path.resolve(repoRoot, file);
    const parsed = parseEnvFile(resolved);
    for (const [key, value] of Object.entries(parsed)) {
      if (process.env[key] === undefined || process.env[key] === '') {
        process.env[key] = expandEnvValue(value, parsed);
      }
    }
  }
}

function envFlag(name, fallback) {
  const value = process.env[name];
  if (value === undefined || value === '') return fallback;
  return !['0', 'false', 'no', 'off'].includes(String(value).trim().toLowerCase());
}

function intValue(name, fallback, minimum = 1) {
  const envName = `SKYEVAULT_AUTOSYNC_${name.toUpperCase().replace(/-/g, '_')}`;
  const value = Number.parseInt(argValue(`--${name}`, process.env[envName] || String(fallback)), 10);
  return Number.isFinite(value) && value >= minimum ? value : fallback;
}

function modeValue() {
  return String(argValue('--mode', process.env.SKYEVAULT_AUTOSYNC_MODE || 'git+full')).trim().toLowerCase();
}

function additiveBaselineEnabled() {
  return !flag('--no-additive-baseline')
    && !flag('--full-checkpoint')
    && !envFlag('SKYEVAULT_AUTOSYNC_FULL_CHECKPOINT', false)
    && envFlag('SKYEVAULT_AUTOSYNC_ADDITIVE_BASELINE', true);
}

function rel(file) {
  return path.relative(repoRoot, file).split(path.sep).join('/');
}

function stamp() {
  return new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
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

function writeJson(file, value, mode = 0o600) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
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

function pidIsAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function lockFilePath() {
  return path.join(receiptBase(), 'process.lock');
}

function readLockFile(file) {
  const lock = readJson(file, null);
  if (lock && typeof lock === 'object') return lock;
  try {
    const pid = Number.parseInt(fs.readFileSync(file, 'utf8').trim(), 10);
    return Number.isFinite(pid) ? { pid } : null;
  } catch {
    return null;
  }
}

function lockAgeMs(file, lock) {
  const started = Date.parse(lock?.startedAt || '');
  if (Number.isFinite(started)) return Date.now() - started;
  try {
    return Date.now() - fs.statSync(file).mtimeMs;
  } catch {
    return 0;
  }
}

function acquireAutosyncLock() {
  const file = lockFilePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const staleMs = intValue('lock-stale-minutes', 360, 1) * 60 * 1000;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const fd = fs.openSync(file, 'wx', 0o600);
      const lock = {
        schema: 'skyevault.autosync-process-lock.v1',
        pid: process.pid,
        host: os.hostname(),
        command,
        startedAt: new Date().toISOString()
      };
      fs.writeFileSync(fd, `${JSON.stringify(lock, null, 2)}\n`);
      fs.closeSync(fd);
      return { acquired: true, file, lock };
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;
      const existing = readLockFile(file);
      const ageMs = lockAgeMs(file, existing);
      if (!pidIsAlive(Number(existing?.pid)) || ageMs > staleMs) {
        try { fs.unlinkSync(file); } catch {}
        continue;
      }
      return { acquired: false, file, lock: existing, ageMs };
    }
  }
  return { acquired: false, file, lock: readLockFile(file), ageMs: 0 };
}

async function withAutosyncLock(fn) {
  const guard = acquireAutosyncLock();
  if (!guard.acquired) {
    console.log(JSON.stringify({
      ok: true,
      action: 'skip',
      reason: 'autosync already running',
      lock: {
        pid: guard.lock?.pid || null,
        host: guard.lock?.host || '',
        command: guard.lock?.command || '',
        startedAt: guard.lock?.startedAt || '',
        ageSeconds: Math.floor((guard.ageMs || 0) / 1000)
      }
    }, null, 2));
    return null;
  }
  try {
    return await fn();
  } finally {
    try {
      const current = readLockFile(guard.file);
      if (Number(current?.pid) === process.pid) fs.unlinkSync(guard.file);
    } catch {}
  }
}

function appendJsonl(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(value)}\n`, { mode: 0o600 });
}

function git(args, fallback = '') {
  try {
    return execFileSync('git', args, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: intValue('git-max-buffer-mb', 128, 1) * 1024 * 1024
    }).trim();
  } catch {
    return fallback;
  }
}

function gitLines(args) {
  const output = git(args, '');
  return output ? output.split(/\r?\n/).filter(Boolean) : [];
}

function statusCounts(lines) {
  let modified = 0;
  let deleted = 0;
  let untracked = 0;
  for (const line of lines) {
    if (line.startsWith('??')) {
      untracked += 1;
    } else if (line.slice(0, 2).includes('D')) {
      deleted += 1;
    } else if (!line.startsWith('##')) {
      modified += 1;
    }
  }
  return { modified, deleted, untracked };
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

function isSelfGeneratedOutput(relativePath) {
  return SELF_GENERATED_OUTPUTS.has(normalizeStatusPath(relativePath));
}

function statusLineIsOnlySelfGenerated(line) {
  const paths = statusLinePaths(line);
  return paths.length > 0 && paths.every(isSelfGeneratedOutput);
}

function filterStatusShort(statusShort) {
  return statusShort.filter((line) => line.startsWith('##') || !statusLineIsOnlySelfGenerated(line));
}

function policyReason(file) {
  const base = path.basename(file);
  if (/^\.env($|\.)/.test(base) || /^\.env/.test(base)) return { reason: 'environment file', rule: 'env-file', critical: true };
  if (/^(?:env|secret|secrets|credential|credentials)(?:[._-].*)?\.txt$/i.test(base)) {
    return { reason: 'local credential note', rule: 'credential-note-name', critical: true };
  }
  if (/^id_rsa/.test(base)) return { reason: 'private SSH key', rule: 'private-key-name', critical: true };
  if (/credentials.*\.json$/i.test(base) || /service-account.*\.json$/i.test(base)) {
    return { reason: 'credential/service-account JSON', rule: 'credentials-json', critical: true };
  }
  const ext = path.extname(file).toLowerCase();
  if (LOCAL_ONLY_EXTS.has(ext)) return { reason: LOCAL_ONLY_EXTS.get(ext), rule: `extension:${ext}`, critical: true };
  return null;
}

function secretHits(file, maxBytes) {
  let stat;
  try {
    stat = fs.statSync(file);
  } catch {
    return [];
  }
  if (!stat.isFile() || stat.size > maxBytes) return [];
  let text = '';
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return [];
  }
  if (text.includes('\u0000')) return [];
  return SECRET_PATTERNS.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
}

function walk(dir, visitor, options) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    const parts = rel(file).split('/');
    if (parts.some((part) => SKIP_DIRS.has(part))) continue;
    if (!options.scanGenerated && parts.some((part) => GENERATED_SKIP_DIRS.has(part))) continue;
    visitor(file, entry);
    if (entry.isDirectory()) walk(file, visitor, options);
  }
}

function skippedByPolicy(file, options) {
  const parts = rel(file).split('/');
  if (parts.some((part) => SKIP_DIRS.has(part))) return true;
  if (!options.scanGenerated && parts.some((part) => GENERATED_SKIP_DIRS.has(part))) return true;
  return false;
}

function statusPathCandidates(statusShort) {
  const paths = [];
  for (const line of statusShort) {
    paths.push(...statusLinePaths(line));
  }
  return paths;
}

function gitZeroLines(args) {
  try {
    const output = execFileSync('git', args, {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: intValue('git-max-buffer-mb', 128, 1) * 1024 * 1024
    });
    return output.toString('utf8').split('\0').filter(Boolean);
  } catch {
    return [];
  }
}

function addCandidate(candidates, relativePath, options) {
  const clean = String(relativePath || '').replace(/\\/g, '/').replace(/^\.\/+/, '');
  if (!clean || clean.includes('\0')) return;
  const file = path.resolve(repoRoot, clean);
  if (!file.startsWith(repoRoot + path.sep) && file !== repoRoot) return;
  if (skippedByPolicy(file, options)) return;
  try {
    if (fs.statSync(file).isFile()) candidates.add(file);
  } catch {}
}

function walkRiskyNames(dir, candidates, options) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (skippedByPolicy(file, options)) continue;
    if (entry.isDirectory()) {
      walkRiskyNames(file, candidates, options);
      continue;
    }
    if (!entry.isFile()) continue;
    if (policyReason(file)) candidates.add(file);
  }
}

function scanLocalBoundary(statusShort) {
  const scanGenerated = flag('--scan-generated') || envFlag('SKYEVAULT_AUTOSYNC_SCAN_GENERATED', false);
  const deepScan = flag('--deep-scan') || envFlag('SKYEVAULT_AUTOSYNC_DEEP_SCAN', false);
  const maxScanBytes = intValue('max-scan-mb', 2, 1) * 1024 * 1024;
  const limit = intValue('local-only-limit', 500, 1);
  const localOnly = [];
  const secretLike = [];
  let scannedFiles = 0;
  let skippedGenerated = scanGenerated ? 0 : GENERATED_SKIP_DIRS.size;
  const options = { scanGenerated };

  const inspectFile = (file) => {
    if (skippedByPolicy(file, options)) return;
    let stat;
    try {
      stat = fs.statSync(file);
    } catch {
      return;
    }
    if (!stat.isFile()) return;
    scannedFiles += 1;
    const policy = policyReason(file);
    const hits = secretHits(file, maxScanBytes);
    const item = {
      path: rel(file),
      bytes: stat.size,
      mtimeMs: Math.floor(stat.mtimeMs),
      reason: policy?.reason || (hits.length ? 'secret-like text scanner hit' : ''),
      rule: policy?.rule || (hits.length ? 'secret-scanner' : ''),
      hits
    };
    if (policy?.critical) localOnly.push(item);
    if (hits.length) secretLike.push(item);
  };

  if (deepScan) {
    walk(repoRoot, (file, entry) => {
      if (entry.isFile()) inspectFile(file);
    }, options);
  } else {
    const candidates = new Set();
    for (const item of statusPathCandidates(statusShort)) addCandidate(candidates, item, options);
    for (const item of gitZeroLines(['ls-files', '-z', '--others', '--exclude-standard'])) addCandidate(candidates, item, options);
    walkRiskyNames(repoRoot, candidates, options);
    for (const file of [...candidates].sort((a, b) => rel(a).localeCompare(rel(b)))) inspectFile(file);
  }

  const byPath = new Map();
  for (const item of [...localOnly, ...secretLike]) {
    const existing = byPath.get(item.path);
    if (!existing) {
      byPath.set(item.path, item);
      continue;
    }
    byPath.set(item.path, {
      ...existing,
      reason: existing.reason || item.reason,
      rule: existing.rule || item.rule,
      hits: [...new Set([...(existing.hits || []), ...(item.hits || [])])]
    });
  }

  return {
    scannedFiles,
    skippedGenerated,
    scanGenerated,
    scanMode: deepScan ? 'deep' : 'fast',
    localOnly: [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path)).slice(0, limit),
    localOnlyTotal: byPath.size,
    secretLikeTotal: secretLike.length,
    rules: {
      scannerRules: SECRET_PATTERNS.map(([name]) => name),
      localOnlyExtensions: [...LOCAL_ONLY_EXTS.keys()].sort()
    }
  };
}

function addChangedFingerprint(fingerprints, relativePath, options) {
  const clean = String(relativePath || '').replace(/\\/g, '/').replace(/^\.\/+/, '');
  if (!clean || clean.includes('\0')) return;
  const file = path.resolve(repoRoot, clean);
  if (!file.startsWith(repoRoot + path.sep) && file !== repoRoot) return;
  if (skippedByPolicy(file, options)) return;
  let stat;
  try {
    stat = fs.lstatSync(file);
  } catch {
    fingerprints.set(clean, { path: clean, missing: true });
    return;
  }
  if (stat.isDirectory()) {
    walk(file, (child, entry) => {
      if (!entry.isFile() && !entry.isSymbolicLink()) return;
      if (skippedByPolicy(child, options)) return;
      try {
        const childStat = fs.lstatSync(child);
        fingerprints.set(rel(child), {
          path: rel(child),
          type: childStat.isSymbolicLink() ? 'symlink' : 'file',
          bytes: childStat.size,
          mtimeMs: Math.floor(childStat.mtimeMs)
        });
      } catch {}
    }, options);
    return;
  }
  fingerprints.set(clean, {
    path: clean,
    type: stat.isSymbolicLink() ? 'symlink' : 'file',
    bytes: stat.size,
    mtimeMs: Math.floor(stat.mtimeMs)
  });
}

function changedWorkspaceFingerprints(statusShort) {
  const scanGenerated = flag('--scan-generated') || envFlag('SKYEVAULT_AUTOSYNC_SCAN_GENERATED', false);
  const options = { scanGenerated };
  const fingerprints = new Map();
  for (const item of statusPathCandidates(statusShort)) addChangedFingerprint(fingerprints, item, options);
  for (const item of gitZeroLines(['ls-files', '-z', '--others', '--exclude-standard'])) {
    addChangedFingerprint(fingerprints, item, options);
  }
  return [...fingerprints.values()].sort((a, b) => a.path.localeCompare(b.path));
}

function readLastSuccess() {
  return readJson(path.join(repoRoot, '.skyevault-out', 'autosync', 'latest-success.json'), null);
}

function readLatestPrimarySuccess() {
  return readJson(path.join(repoRoot, '.skyevault-out', 'autosync', 'latest-primary-success.json'), null);
}

function readLatestFullRepoSuccess() {
  return readJson(path.join(repoRoot, '.skyevault-out', 'autosync', 'latest-full-repo-success.json'), null);
}

function modeForRun(run) {
  const explicit = String(run?.mode || '').trim();
  if (['git', 'safe', 'full'].includes(explicit)) return explicit;
  const label = String(run?.label || '').trim();
  if (label === 'git-vault-pack') return 'git';
  if (label === 'safe-repo-archive') return 'safe';
  if (label === 'encrypted-full-repo') return 'full';
  return '';
}

function primaryRunSummaries(receipt) {
  return (Array.isArray(receipt?.runs) ? receipt.runs : [])
    .map((run) => ({
      mode: modeForRun(run),
      label: run.label || '',
      ok: Boolean(run.ok),
      status: run.status ?? null,
      signal: run.signal || null,
      durationMs: run.durationMs ?? null,
      childSummaries: Array.isArray(run.childSummaries) ? run.childSummaries : []
    }))
    .filter((run) => run.mode);
}

function primaryRunsCoverModes(runs, modes) {
  if (!Array.isArray(modes) || !modes.length) return false;
  return modes.every((mode) => runs.some((run) => run.mode === mode && run.ok));
}

function normalizedRunSummaries(runs) {
  return (Array.isArray(runs) ? runs : [])
    .map((run) => ({
      mode: modeForRun(run),
      label: run.label || '',
      ok: Boolean(run.ok),
      status: run.status ?? null,
      signal: run.signal || null,
      durationMs: run.durationMs ?? null,
      childSummaries: Array.isArray(run.childSummaries) ? run.childSummaries : []
    }))
    .filter((run) => run.mode);
}

function mergeRunSummaries(preferredRuns, fallbackRuns = []) {
  const byMode = new Map();
  for (const run of [...normalizedRunSummaries(preferredRuns), ...normalizedRunSummaries(fallbackRuns)]) {
    if (!run.ok || byMode.has(run.mode)) continue;
    byMode.set(run.mode, run);
  }
  return [...byMode.values()].sort((a, b) => ['git', 'safe', 'full'].indexOf(a.mode) - ['git', 'safe', 'full'].indexOf(b.mode));
}

function primarySuccessRecord(receipt) {
  if (!receipt || receipt.action === 'skip' || receipt.dryRun) return null;
  const runs = mergeRunSummaries(receipt.runs, receipt.coveredRuns);
  if (!primaryRunsCoverModes(runs, receipt.plannedModes)) return null;
  return {
    schema: 'skyevault.autosync-primary-success.v1',
    recordedAt: receipt.completedAt || new Date().toISOString(),
    autosyncStartedAt: receipt.startedAt || '',
    autosyncCompletedAt: receipt.completedAt || '',
    mode: receipt.mode || '',
    plannedModes: receipt.plannedModes || [],
    state: receipt.state || null,
    deltaJournal: receipt.deltaJournal?.summary || null,
    runs,
    sourceReceiptPath: receipt.receiptPath || ''
  };
}

function writePrimarySuccessPointers(primarySuccess, options = {}) {
  if (!primarySuccess) return;
  const updateLatestFull = options.updateLatestFull !== false;
  const outDir = receiptBase();
  writeJson(path.join(outDir, 'latest-primary-success.json'), primarySuccess);
  const fullRun = primarySuccess.runs?.find((run) => run.mode === 'full' && run.ok);
  if (fullRun && updateLatestFull) {
    writeJson(path.join(outDir, 'latest-full-repo-success.json'), {
      ...primarySuccess,
      schema: 'skyevault.autosync-full-repo-success.v1',
      fullRun
    });
  }
}

function recordTimestampMs(record) {
  const value = Date.parse(record?.recordedAt || record?.autosyncCompletedAt || record?.completedAt || '');
  return Number.isFinite(value) ? value : 0;
}

function recordMatchesStateDigest(record, state) {
  const digest = record?.state?.digest || '';
  if (!digest || !state) return false;
  if (digest === state.digest) return true;
  const recordDigestVersion = record?.state?.digestVersion || '';
  const maxChangedMtime = Number(state.changedFileFingerprintMaxMtimeMs || 0);
  const recordedAt = recordTimestampMs(record);
  return !recordDigestVersion
    && state.legacyDigest
    && digest === state.legacyDigest
    && recordedAt > 0
    && (!maxChangedMtime || maxChangedMtime <= recordedAt + 5000);
}

function primaryCoverageFromRecord(record, state, modes) {
  if (!record || !state || !recordMatchesStateDigest(record, state)) return null;
  const runs = primaryRunSummaries(record);
  if (!primaryRunsCoverModes(runs, modes)) return null;
  return {
    covered: true,
    source: record.source || 'primary-success',
    recordedAt: record.recordedAt || record.autosyncCompletedAt || record.completedAt || '',
    digest: record.state?.digest || '',
    plannedModes: record.plannedModes || [],
    sourceReceiptPath: record.sourceReceiptPath || '',
    record
  };
}

function primaryCoverageFromReceipt(receipt, state, modes, source) {
  const record = primarySuccessRecord(receipt);
  if (!record) return null;
  record.source = source;
  return primaryCoverageFromRecord(record, state, modes);
}

function latestBaselineRunCoverage(state, modes) {
  if (!additiveBaselineEnabled() || !state || !Array.isArray(modes) || !modes.length) return null;
  const byMode = new Map();
  const sourcesByMode = {};
  const latestPrimary = readLatestPrimarySuccess();
  const latestFull = readLatestFullRepoSuccess();

  for (const run of primaryRunSummaries(latestPrimary)) {
    if (!run.ok || !modes.includes(run.mode) || byMode.has(run.mode)) continue;
    byMode.set(run.mode, run);
    sourcesByMode[run.mode] = 'latest-primary-baseline';
  }

  if (modes.includes('full') && !byMode.has('full')) {
    const fullRun = latestFull?.fullRun || (Array.isArray(latestFull?.runs) ? latestFull.runs.find((run) => modeForRun(run) === 'full' && run.ok) : null);
    if (fullRun?.ok) {
      byMode.set('full', normalizedRunSummaries([fullRun])[0]);
      sourcesByMode.full = 'latest-full-repo-baseline';
    }
  }

  const coveredRuns = modes.map((mode) => byMode.get(mode)).filter(Boolean);
  const coveredModes = coveredRuns.map((run) => run.mode);
  const missingModes = modes.filter((mode) => !byMode.has(mode));
  const baselineDigest = latestPrimary?.state?.digest || latestFull?.state?.digest || '';
  const baselineRecordedAt = latestPrimary?.recordedAt || latestPrimary?.autosyncCompletedAt || latestFull?.recordedAt || latestFull?.autosyncCompletedAt || '';
  return {
    enabled: true,
    covered: modes.length > 0 && missingModes.length === 0,
    digest: state.digest || '',
    baselineDigest,
    recordedAt: baselineRecordedAt,
    plannedModes: modes,
    coveredModes,
    missingModes,
    coveredRuns,
    sourcesByMode,
    source: Object.values(sourcesByMode).filter(Boolean).join(', ') || '',
    needsDelta: missingModes.length === 0 && Boolean(baselineDigest) && baselineDigest !== state.digest
  };
}

function coverageCandidateRecords() {
  const candidates = [];
  const primary = readLatestPrimarySuccess();
  if (primary) candidates.push({ source: 'latest-primary-success', record: { ...primary, source: 'latest-primary-success' } });

  const latest = readLastSuccess();
  const latestRecord = primarySuccessRecord(latest);
  if (latestRecord) candidates.push({ source: 'latest-success', record: { ...latestRecord, source: 'latest-success' } });

  for (const file of latestAutosyncReceipts()) {
    const receipt = readJson(file, null);
    const record = primarySuccessRecord(receipt);
    if (record) candidates.push({ source: rel(file), record: { ...record, source: rel(file) } });
  }

  return candidates;
}

function primaryModeCoverage(state, modes) {
  const byMode = new Map();
  const sourcesByMode = {};
  let newestRecordedAt = '';
  for (const candidate of coverageCandidateRecords()) {
    const record = candidate.record;
    if (!record || !state || !recordMatchesStateDigest(record, state)) continue;
    const recordedAt = record.recordedAt || record.autosyncCompletedAt || record.completedAt || '';
    if (recordedAt && (!newestRecordedAt || recordedAt > newestRecordedAt)) newestRecordedAt = recordedAt;
    for (const run of primaryRunSummaries(record)) {
      if (!run.ok || !modes.includes(run.mode) || byMode.has(run.mode)) continue;
      byMode.set(run.mode, run);
      sourcesByMode[run.mode] = candidate.source;
    }
  }
  if (modes.includes('full') && !byMode.has('full')) {
    const latestFull = readLatestFullRepoSuccess();
    const fullRun = latestFull?.fullRun || (Array.isArray(latestFull?.runs) ? latestFull.runs.find((run) => modeForRun(run) === 'full' && run.ok) : null);
    const recordedAtMs = recordTimestampMs(latestFull);
    const localOnlyMax = Number(state?.localOnlyCriticalMaxMtimeMs || 0);
    const additiveBaseline = additiveBaselineEnabled();
    if (fullRun?.ok && recordedAtMs > 0 && (additiveBaseline || !localOnlyMax || localOnlyMax <= recordedAtMs + 5000)) {
      byMode.set('full', normalizedRunSummaries([fullRun])[0]);
      sourcesByMode.full = 'latest-full-repo-baseline';
      const recordedAt = latestFull.recordedAt || latestFull.autosyncCompletedAt || latestFull.completedAt || '';
      if (recordedAt && (!newestRecordedAt || recordedAt > newestRecordedAt)) newestRecordedAt = recordedAt;
    }
  }
  const baselineCoverage = latestBaselineRunCoverage(state, modes);
  if (baselineCoverage?.enabled) {
    for (const run of baselineCoverage.coveredRuns || []) {
      if (!run.ok || byMode.has(run.mode)) continue;
      byMode.set(run.mode, run);
      sourcesByMode[run.mode] = baselineCoverage.sourcesByMode?.[run.mode] || 'latest-additive-baseline';
    }
    if (baselineCoverage.recordedAt && (!newestRecordedAt || baselineCoverage.recordedAt > newestRecordedAt)) {
      newestRecordedAt = baselineCoverage.recordedAt;
    }
  }
  const coveredRuns = modes.map((mode) => byMode.get(mode)).filter(Boolean);
  const coveredModes = coveredRuns.map((run) => run.mode);
  const missingModes = modes.filter((mode) => !byMode.has(mode));
  const needsDelta = Boolean(baselineCoverage?.needsDelta && missingModes.length === 0);
  return {
    covered: modes.length > 0 && missingModes.length === 0,
    digest: state?.digest || '',
    baselineDigest: baselineCoverage?.baselineDigest || '',
    recordedAt: newestRecordedAt,
    plannedModes: modes,
    coveredModes,
    missingModes,
    coveredRuns,
    sourcesByMode,
    source: Object.values(sourcesByMode).filter(Boolean).join(', ') || '',
    additiveBaseline: Boolean(baselineCoverage?.enabled),
    needsDelta
  };
}

function primaryCoverageFromModeCoverage(modeCoverage, state, modes) {
  if (!modeCoverage?.covered) return null;
  return {
    covered: true,
    source: modeCoverage.source || 'primary-success',
    recordedAt: modeCoverage.recordedAt || '',
    digest: state?.digest || '',
    plannedModes: modes,
    sourceReceiptPath: '',
    coveredModes: modeCoverage.coveredModes || [],
    sourcesByMode: modeCoverage.sourcesByMode || {},
    additiveBaseline: Boolean(modeCoverage.additiveBaseline),
    needsDelta: Boolean(modeCoverage.needsDelta),
    baselineDigest: modeCoverage.baselineDigest || '',
    record: {
      schema: 'skyevault.autosync-primary-success.v1',
      recordedAt: modeCoverage.recordedAt || new Date().toISOString(),
      autosyncStartedAt: '',
      autosyncCompletedAt: modeCoverage.recordedAt || '',
      mode: modeValue(),
      plannedModes: modes,
      state,
      deltaJournal: null,
      runs: modeCoverage.coveredRuns || [],
      sourceReceiptPath: ''
    }
  };
}

function latestAutosyncReceipts() {
  const dir = receiptBase();
  try {
    return fs.readdirSync(dir)
      .filter((name) => /^autosync-\d{8}T\d{6}Z\.json$/.test(name))
      .sort()
      .reverse()
      .map((name) => path.join(dir, name));
  } catch {
    return [];
  }
}

function findPrimaryCoverage(state, modes) {
  if (!modes.length) return null;

  return primaryCoverageFromModeCoverage(primaryModeCoverage(state, modes), state, modes);
}

function collectState() {
  const branch = git(['branch', '--show-current'], 'HEAD') || 'HEAD';
  const head = git(['rev-parse', 'HEAD'], '');
  const shortHead = git(['rev-parse', '--short', 'HEAD'], '');
  const upstream = git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], '');
  const aheadBehind = upstream ? git(['rev-list', '--left-right', '--count', `${upstream}...HEAD`], '0 0').split(/\s+/) : ['0', '0'];
  const rawStatusShort = gitLines(['status', '--porcelain=v1', '--branch']);
  const statusShort = filterStatusShort(rawStatusShort);
  const counts = statusCounts(statusShort);
  const boundary = scanLocalBoundary(statusShort);
  const changedFingerprints = changedWorkspaceFingerprints(statusShort);
  const legacyDigestInput = {
    branch,
    head,
    upstream,
    aheadBehind,
    statusShort,
    scanMode: boundary.scanMode,
    localOnly: boundary.localOnly.map((item) => ({
      path: item.path,
      bytes: item.bytes,
      mtimeMs: item.mtimeMs,
      rule: item.rule,
      hits: item.hits
    }))
  };
  const digestInput = {
    ...legacyDigestInput,
    changedFingerprints
  };
  const changedFingerprintMaxMtimeMs = changedFingerprints.reduce((max, item) => Math.max(max, Number(item.mtimeMs || 0)), 0);
  const localOnlyCriticalMaxMtimeMs = boundary.localOnly.reduce((max, item) => Math.max(max, Number(item.mtimeMs || 0)), 0);
  return {
    schema: 'skyevault.autosync-state.v1',
    digestVersion: 'v2-changed-file-metadata',
    collectedAt: new Date().toISOString(),
    host: os.hostname(),
    repoRoot,
    branch,
    head,
    shortHead,
    upstream,
    behind: Number(aheadBehind[0] || 0),
    ahead: Number(aheadBehind[1] || 0),
    statusShort,
    rawStatusCount: rawStatusShort.filter((line) => !line.startsWith('##')).length,
    selfGeneratedOutputCount: rawStatusShort.filter(statusLineIsOnlySelfGenerated).length,
    statusCounts: counts,
    boundary,
    dirty: statusShort.some((line) => !line.startsWith('##')),
    localOnlyCriticalCount: boundary.localOnlyTotal,
    localOnlyCriticalMaxMtimeMs,
    changedFileFingerprintCount: changedFingerprints.length,
    changedFileFingerprintMaxMtimeMs: changedFingerprintMaxMtimeMs,
    legacyDigest: sha256Text(safeJson(legacyDigestInput)),
    digest: sha256Text(safeJson(digestInput))
  };
}

function plannedModes(state) {
  const mode = modeValue();
  if (mode === 'off' || mode === 'none') return [];
  if (mode === 'auto') {
    const modes = ['git'];
    if (state.localOnlyCriticalCount > 0) modes.push('full');
    return modes;
  }
  if (mode === 'all') return ['git', 'safe', 'full'];
  return mode
    .split(/[,+]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .flatMap((item) => item === 'repo' ? ['safe'] : item)
    .filter((item, index, list) => ['git', 'safe', 'full'].includes(item) && list.indexOf(item) === index);
}

function commandForMode(mode) {
  if (mode === 'git') {
    return {
      mode,
      label: 'git-vault-pack',
      command: process.execPath,
      args: [path.join(repoRoot, 'tools', 'skyevault-git-vault.mjs')]
    };
  }
  if (mode === 'safe') {
    return {
      mode,
      label: 'safe-repo-archive',
      command: process.execPath,
      args: [path.join(repoRoot, 'tools', 'skyevault-repo-push.mjs')]
    };
  }
  if (mode === 'full') {
    const archiveFormat = argValue('--archive-format', process.env.SKYEVAULT_AUTOSYNC_FULL_ARCHIVE_FORMAT || 'tar.zst');
    const maxGb = argValue('--max-gb', process.env.SKYEVAULT_AUTOSYNC_FULL_MAX_GB || '50');
    const zipLevel = argValue('--zip-level', process.env.SKYEVAULT_AUTOSYNC_FULL_ZIP_LEVEL || '0');
    const zipConcurrency = argValue('--zip-upload-concurrency', process.env.SKYEVAULT_AUTOSYNC_FULL_ZIP_UPLOAD_CONCURRENCY || '8');
    const sourceCustody = envFlag('SKYEVAULT_AUTOSYNC_FULL_SOURCE_CUSTODY', false) || flag('--source-custody');
    const args = [
      path.join(repoRoot, 'tools', 'skyevault-full-repo-push.mjs'),
      `--archive-format=${archiveFormat}`,
      `--max-gb=${maxGb}`,
      `--zip-level=${zipLevel}`,
      `--zip-upload-concurrency=${zipConcurrency}`,
      sourceCustody ? '--source-custody' : '--literal-full',
      '--skip-direct-restore-kit-upload'
    ];
    if (envFlag('SKYEVAULT_AUTOSYNC_FULL_DIRECT_R2', true) || flag('--direct-r2')) args.push('--direct-r2');
    if (flag('--skip-control-upload')) args.push('--skip-control-upload');
    return {
      mode,
      label: 'encrypted-full-repo',
      command: process.execPath,
      args
    };
  }
  throw new Error(`Unsupported autosync mode: ${mode}`);
}

function sanitizeArgs(args) {
  return args.map((arg) => String(arg)
    .replace(/(token|passphrase|pepper|key)=([^ ]+)/ig, '$1=***')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, 'Bearer ***'));
}

function parseJsonObjects(text) {
  const objects = [];
  let start = -1;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{') {
      if (depth === 0) start = i;
      depth += 1;
      continue;
    }
    if (ch === '}') {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        try {
          objects.push(JSON.parse(text.slice(start, i + 1)));
        } catch {}
        start = -1;
      }
    }
  }
  return objects;
}

function summarizeChildJson(stdout) {
  return parseJsonObjects(stdout)
    .filter((item) => item && typeof item === 'object')
    .filter((item) => item.receiptId || item.receiptPath || item.action || item.outDir || item.controlUpload)
    .map((item) => ({
      ok: item.ok,
      action: item.action || '',
      receiptId: item.receiptId || '',
      receiptPath: item.receiptPath || '',
      outDir: item.outDir || '',
      artifactBytes: item.artifactBytes || null,
      artifactSha256: item.artifactSha256 || '',
      controlUploadStatus: item.controlUploadStatus || '',
      controlReceiptId: item.controlUpload?.receiptId || '',
      controlBytes: item.controlUpload?.bytes || null,
      digest: item.digest || ''
    }));
}

function runPlannedCommand(plan) {
  const args = dryRun ? [...plan.args, '--dry-run'] : plan.args;
  const started = Date.now();
  console.log(`[autosync] ${dryRun ? 'would run' : 'running'} ${plan.label}`);
  if (dryRun) {
    return {
      label: plan.label,
      skipped: true,
      dryRun: true,
      command: path.basename(plan.command),
      args: sanitizeArgs(args),
      durationMs: Date.now() - started
    };
  }
  const result = spawnSync(plan.command, args, { cwd: repoRoot, encoding: 'utf8' });
  const stdout = String(result.stdout || '');
  const stderr = String(result.stderr || '');
  if (stdout.trim()) process.stdout.write(stdout);
  if (stderr.trim()) process.stderr.write(stderr);
  return {
    mode: plan.mode || '',
    label: plan.label,
    status: result.status,
    signal: result.signal || null,
    ok: result.status === 0,
    command: path.basename(plan.command),
    args: sanitizeArgs(args),
    durationMs: Date.now() - started,
    receiptPaths: stdout
      .split(/\r?\n/)
      .map((line) => line.match(/Receipt written:\s*(.+)$/)?.[1]?.trim())
      .filter(Boolean),
    childSummaries: summarizeChildJson(stdout)
  };
}

function latestDeltaJournalSummary() {
  const latest = readJson(path.join(repoRoot, '.skyevault-out', 'delta-journal', 'latest-receipt.json'), null);
  if (!latest) return null;
  return {
    ok: Boolean(latest.ok),
    action: latest.action || '',
    completedAt: latest.completedAt || '',
    digest: latest.state?.digest || '',
    changedFileCount: Number(latest.state?.changedFileCount || 0),
    tombstoneCount: Number(latest.state?.tombstoneCount || 0),
    skippedCount: Number(latest.state?.skippedCount || 0),
    packBytes: latest.pack?.packBytes || null,
    packSha256: latest.pack?.packSha256 || '',
    uploadReceiptId: latest.upload?.receiptId || '',
    uploadReceiptPath: latest.upload?.receiptPath || '',
    downloadUrlAvailable: Boolean(latest.upload?.downloadUrlAvailable)
  };
}

function maybeRunDeltaJournal(receipt) {
  if (skipDelta) return { skipped: true, reason: 'skip-delta' };
  if (receipt.action !== 'sync') return { skipped: true, reason: 'no repo/vault parity change' };
  const script = path.join(repoRoot, 'tools', 'skyevault-delta-journal.mjs');
  if (!fs.existsSync(script)) return { skipped: true, reason: 'delta journal script missing' };

  const args = [
    script,
    'run',
    ...argValues('--env-file').map((file) => `--env-file=${file}`)
  ];
  if (dryRun) args.push('--dry-run');
  if (force) args.push('--force');
  if (deltaUpload) args.push('--upload');
  if (flag('--scan-generated')) args.push('--scan-generated');
  const deltaMaxFileMb = argValue('--delta-max-file-mb', process.env.SKYEVAULT_AUTOSYNC_DELTA_MAX_FILE_MB || '');
  if (deltaMaxFileMb) args.push(`--max-file-mb=${deltaMaxFileMb}`);

  const started = Date.now();
  console.log(`[autosync] ${dryRun ? 'would run' : 'running'} encrypted delta journal${deltaUpload ? ' upload' : ''}`);
  const result = spawnSync(process.execPath, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 12
  });
  const stdout = String(result.stdout || '');
  const stderr = String(result.stderr || '');
  if (stdout.trim()) process.stdout.write(stdout);
  if (stderr.trim()) process.stderr.write(stderr);
  const parsed = parseJsonObjects(stdout).at(-1) || null;
  return {
    label: 'skyevault-delta-journal',
    status: result.status,
    ok: result.status === 0 && parsed?.ok !== false,
    dryRun,
    upload: deltaUpload,
    durationMs: Date.now() - started,
    summary: parsed ? {
      ok: parsed.ok,
      action: parsed.action,
      digest: parsed.digest,
      changedFileCount: parsed.changedFileCount,
      tombstoneCount: parsed.tombstoneCount,
      skippedCount: parsed.skippedCount,
      packBytes: parsed.pack?.packBytes || null,
      packSha256: parsed.pack?.packSha256 || '',
      uploadReceiptId: parsed.upload?.receiptId || '',
      uploadReceiptPath: parsed.upload?.receiptPath || '',
      downloadUrlAvailable: Boolean(parsed.upload?.downloadUrlAvailable),
      receiptPath: parsed.receiptPath || ''
    } : null,
    stderr: stderr.slice(-2000)
  };
}

function latestGitOriginSummary() {
  const status = readJson(path.join(repoRoot, '.skyevault-out', 'git-remote', 'owner-git-origin-status.json'), null);
  const sync = readJson(path.join(repoRoot, '.skyevault-out', 'git-remote', 'owner-git-origin-sync.json'), null);
  const proof = readJson(path.join(repoRoot, '.skyevault-out', 'git-remote', 'owner-git-origin-proof.json'), null);
  return {
    enabled: gitOriginSync,
    skipped: skipGitOrigin,
    status: status ? {
      checkedAt: status.checkedAt || '',
      running: Boolean(status.running),
      baseUrl: status.baseUrl || '',
      cloneUrl: status.cloneUrl || '',
      remoteMatchesLocalHead: Boolean(status.remoteMatchesLocalHead),
      localHead: status.local?.head || '',
      remoteHead: status.remote?.branchHead || status.remote?.head || null,
      storageRoot: status.storageRoot || '',
      tokenStoredAt: status.tokenStoredAt || ''
    } : null,
    latestSync: sync ? {
      completedAt: sync.completedAt || '',
      ok: Boolean(sync.ok),
      localHead: sync.localHead || '',
      remoteMatchesLocalHead: Boolean(sync.remoteMatchesLocalHead),
      cloneUrl: sync.cloneUrl || '',
      seeded: sync.seeded ? {
        action: sync.seeded.action || '',
        refs: sync.seeded.refs || 0,
        diskBytes: sync.seeded.diskBytes || null
      } : null
    } : null,
    latestProof: proof ? {
      provedAt: proof.provedAt || '',
      ok: Boolean(proof.ok),
      headMatches: Boolean(proof.headMatches),
      cloneDir: proof.cloneDir || ''
    } : null
  };
}

function maybeSyncGitOrigin(receipt) {
  if (!gitOriginSync) return { skipped: true, reason: skipGitOrigin ? 'skip-git-origin' : 'disabled' };
  if (dryRun) return { skipped: true, dryRun: true, reason: 'dry-run' };
  if (receipt.action !== 'sync') return { skipped: true, reason: 'no repo/vault parity change' };
  if (!receipt.ok) return { skipped: true, reason: 'primary autosync did not pass' };
  const script = path.join(repoRoot, 'tools', 'skyevault-owner-git-origin.mjs');
  if (!fs.existsSync(script)) return { skipped: true, reason: 'owner git origin script missing' };

  const started = Date.now();
  console.log('[autosync] syncing owner Git origin');
  const result = spawnSync(process.execPath, [script, 'sync'], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 12
  });
  const stdout = String(result.stdout || '');
  const stderr = String(result.stderr || '');
  if (stdout.trim()) process.stdout.write(stdout);
  if (stderr.trim()) process.stderr.write(stderr);
  const parsed = parseJsonObjects(stdout).at(-1) || null;
  return {
    label: 'skyevault-owner-git-origin',
    status: result.status,
    ok: result.status === 0 && parsed?.ok !== false,
    durationMs: Date.now() - started,
    summary: parsed ? {
      ok: parsed.ok,
      cloneUrl: parsed.cloneUrl || '',
      baseUrl: parsed.baseUrl || '',
      localHead: parsed.localHead || '',
      localBranch: parsed.localBranch || '',
      remoteHead: parsed.remoteHead || null,
      remoteMatchesLocalHead: Boolean(parsed.remoteMatchesLocalHead),
      seeded: parsed.seeded ? {
        action: parsed.seeded.action || '',
        refs: parsed.seeded.refs || 0,
        diskBytes: parsed.seeded.diskBytes || null
      } : null,
      syncReceipt: '.skyevault-out/git-remote/owner-git-origin-sync.json'
    } : null,
    stderr: stderr.slice(-2000)
  };
}

function maybeRefreshMap(results) {
  if (dryRun || skipMap || !results.some((item) => item.ok)) return null;
  const started = Date.now();
  const result = spawnSync(process.execPath, [path.join(repoRoot, 'tools', 'skyevault-0s-neural-bridge.mjs')], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  return {
    label: 'skyevault-0s-map',
    status: result.status,
    ok: result.status === 0,
    durationMs: Date.now() - started
  };
}

function binExportIds() {
  const explicit = [
    ...argValues('--bin'),
    ...String(process.env.SKYEVAULT_AUTOSYNC_BINS || process.env.SKYEVAULT_AUTOSYNC_BIN_EXPORTS || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  ];
  return [...new Set(explicit)];
}

function maybeExportBins(receipt) {
  const ids = binExportIds();
  if (skipBins) return { skipped: true, reason: 'skip-bins' };
  if (!ids.length) return { skipped: true, reason: 'no companion bins configured' };
  if (receipt.action !== 'sync') return { skipped: true, reason: 'no repo/vault parity change' };
  if (!receipt.ok) return { skipped: true, reason: 'primary autosync did not pass' };
  const script = path.join(repoRoot, 'tools', 'skyevault-bin-pack.mjs');
  if (!fs.existsSync(script)) return { skipped: true, reason: 'bin pack script missing' };

  const args = [
    script,
    'export',
    ...ids.map((id) => `--bin=${id}`)
  ];
  if (dryRun) args.push('--dry-run');
  if (flag('--no-bin-dedupe')) args.push('--no-dedupe');
  if (flag('--upload-bins') || envFlag('SKYEVAULT_AUTOSYNC_BIN_UPLOAD', false)) args.push('--upload');

  const started = Date.now();
  console.log(`[autosync] ${dryRun ? 'would export' : 'exporting'} SkyeVault bins${ids.length ? `: ${ids.join(', ')}` : ''}`);
  const result = spawnSync(process.execPath, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 16
  });
  const stdout = String(result.stdout || '');
  const stderr = String(result.stderr || '');
  if (stdout.trim()) process.stdout.write(stdout);
  if (stderr.trim()) process.stderr.write(stderr);
  const parsed = parseJsonObjects(stdout).at(-1) || null;
  return {
    label: 'skyevault-bin-companion-export',
    status: result.status,
    ok: result.status === 0,
    dryRun,
    dedupe: !flag('--no-bin-dedupe'),
    binIds: ids,
    durationMs: Date.now() - started,
    summary: parsed ? {
      ok: parsed.ok,
      dryRun: parsed.dryRun,
      dedupe: parsed.dedupe,
      binCount: parsed.binCount,
      totalFiles: parsed.totalFiles,
      skippedByDedupeCount: parsed.skippedByDedupeCount,
      receiptPath: parsed.receiptPath || ''
    } : null,
    stderr: stderr.slice(-2000)
  };
}

function receiptBase() {
  return path.join(repoRoot, '.skyevault-out', 'autosync');
}

function writeAutosyncReceipt(receipt) {
  const outDir = receiptBase();
  const receiptPath = path.join(outDir, `autosync-${stamp()}.json`);
  receipt.receiptPath = receiptPath;
  writeJson(receiptPath, receipt);
  writeJson(path.join(outDir, 'latest-state.json'), receipt.state);
  const primarySuccess = primarySuccessRecord(receipt);
  if (primarySuccess) {
    writePrimarySuccessPointers(primarySuccess, {
      updateLatestFull: receipt.runs.some((run) => modeForRun(run) === 'full' && run.ok)
    });
  }
  if (receipt.ok && receipt.action !== 'skip' && !receipt.dryRun) {
    writeJson(path.join(outDir, 'latest-success.json'), receipt);
  }
  appendJsonl(path.join(repoRoot, '.skyevault-out', 'autosync-ledger.jsonl'), {
    schema: 'skyevault.autosync-ledger.v1',
    event: receipt.dryRun ? 'autosync.dry-run' : receipt.action === 'skip' ? 'autosync.skip' : receipt.ok ? 'autosync.complete' : 'autosync.failed',
    recordedAt: receipt.completedAt,
    mode: receipt.mode,
    dryRun: receipt.dryRun,
    digest: receipt.state.digest,
    digestVersion: receipt.state.digestVersion,
    branch: receipt.state.branch,
    shortHead: receipt.state.shortHead,
    dirty: receipt.state.dirty,
    localOnlyCriticalCount: receipt.state.localOnlyCriticalCount,
    changedFileFingerprintCount: receipt.state.changedFileFingerprintCount || 0,
    deltaJournal: receipt.deltaJournal ? {
      ok: receipt.deltaJournal.ok,
      action: receipt.deltaJournal.summary?.action || '',
      changedFileCount: receipt.deltaJournal.summary?.changedFileCount || 0,
      tombstoneCount: receipt.deltaJournal.summary?.tombstoneCount || 0,
      uploadReceiptId: receipt.deltaJournal.summary?.uploadReceiptId || ''
    } : null,
    gitOrigin: receipt.gitOrigin ? {
      ok: receipt.gitOrigin.ok,
      skipped: Boolean(receipt.gitOrigin.skipped),
      cloneUrl: receipt.gitOrigin.summary?.cloneUrl || '',
      remoteMatchesLocalHead: Boolean(receipt.gitOrigin.summary?.remoteMatchesLocalHead)
    } : null,
    receiptPath: rel(receiptPath)
  });
  return receiptPath;
}

function maybeNotifyAutosyncSuccess(receipt) {
  if (!receipt.ok || receipt.action === 'skip' || receipt.dryRun) return null;
  const script = path.join(repoRoot, 'tools', 'skyevault-autosync-proof-publish.mjs');
  if (!fs.existsSync(script)) return null;
  const args = [
    script,
    '--notify-only',
    ...argValues('--env-file').map((file) => `--env-file=${file}`)
  ];
  const result = spawnSync(process.execPath, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 4
  });
  const stdout = String(result.stdout || '').trim();
  const stderr = String(result.stderr || '').trim();
  if (stdout) process.stdout.write(`${stdout}\n`);
  if (stderr) process.stderr.write(`${stderr}\n`);
  return {
    label: 'skyevault-autosync-notify',
    status: result.status,
    ok: result.status === 0,
    stdout: stdout.slice(-2000),
    stderr: stderr.slice(-2000)
  };
}

async function runOnce() {
  const state = collectState();
  const modes = plannedModes(state);
  const modeCoverage = force
    ? { covered: false, coveredModes: [], missingModes: modes, coveredRuns: [], sourcesByMode: {} }
    : primaryModeCoverage(state, modes);
  const primaryCoverage = force ? null : primaryCoverageFromModeCoverage(modeCoverage, state, modes);
  if (primaryCoverage?.record && primaryCoverage.source !== 'latest-primary-success' && !modeCoverage.needsDelta && !dryRun) {
    writePrimarySuccessPointers(primaryCoverage.record);
  }
  const receiptPrimaryCoverage = primaryCoverage
    ? Object.fromEntries(Object.entries(primaryCoverage).filter(([key]) => key !== 'record'))
    : null;
  const runModes = force ? modes : (modeCoverage.missingModes || modes);
  const additiveDeltaNeeded = Boolean(!force && modeCoverage.needsDelta);
  const changed = force || runModes.length > 0 || additiveDeltaNeeded;
  const receipt = {
    schema: 'skyevault.autosync-receipt.v1',
    startedAt: state.collectedAt,
    completedAt: new Date().toISOString(),
    mode: modeValue(),
    dryRun,
    force,
    changed,
    action: changed ? 'sync' : 'skip',
    primaryCoverage: receiptPrimaryCoverage,
    state,
    plannedModes: modes,
    coveredModes: force ? [] : (modeCoverage.coveredModes || []),
    runModes,
    coveredRuns: force ? [] : (modeCoverage.coveredRuns || []),
    sourcesByMode: force ? {} : (modeCoverage.sourcesByMode || {}),
    additiveBaseline: force ? null : {
      enabled: Boolean(modeCoverage.additiveBaseline),
      deltaOnly: Boolean(additiveDeltaNeeded && runModes.length === 0),
      baselineDigest: modeCoverage.baselineDigest || '',
      needsDelta: additiveDeltaNeeded
    },
    deltaJournal: null,
    runs: [],
    mapRefresh: null,
    gitOrigin: null,
    binExports: null,
    notification: null,
    ok: true
  };

  if (!modes.length) {
    receipt.ok = false;
    receipt.error = `No valid autosync modes from mode "${modeValue()}".`;
  } else if (!changed) {
    console.log(`[autosync] primary custody already covers digest ${state.digest.slice(0, 16)} via ${primaryCoverage?.source || 'latest receipt'}`);
  } else {
    receipt.deltaJournal = maybeRunDeltaJournal(receipt);
    if (receipt.deltaJournal && receipt.deltaJournal.ok === false) {
      const warning = 'SkyeVault delta journal failed before the full custody lane.';
      if (deltaRequired) {
        receipt.ok = false;
        receipt.error = warning;
      } else {
        receipt.deltaJournal.warning = `${warning} Continuing with the planned full/safe lanes.`;
      }
    }
    for (const mode of runModes) {
      const run = runPlannedCommand(commandForMode(mode));
      receipt.runs.push(run);
      if (!run.ok) {
        receipt.ok = false;
        receipt.error = `${run.label} failed with ${run.signal ? `signal ${run.signal}` : `status ${run.status}`}`;
        break;
      }
    }
    receipt.gitOrigin = maybeSyncGitOrigin(receipt);
    if (receipt.gitOrigin && receipt.gitOrigin.ok === false) {
      receipt.ok = false;
      receipt.error = 'Owner Git origin sync failed.';
    }
    receipt.mapRefresh = maybeRefreshMap(receipt.runs);
    if (receipt.mapRefresh && !receipt.mapRefresh.ok) receipt.ok = false;
    receipt.binExports = maybeExportBins(receipt);
    if (receipt.binExports && receipt.binExports.ok === false) {
      receipt.ok = false;
      receipt.error = 'SkyeVault companion bin export failed.';
    }
  }

  receipt.completedAt = new Date().toISOString();
  const receiptPath = writeAutosyncReceipt(receipt);
  receipt.notification = maybeNotifyAutosyncSuccess(receipt);
  if (receipt.notification && receipt.ok && !receipt.notification.ok) {
    receipt.notification.warning = 'Autosync upload succeeded, but the optional notification hook failed.';
  }
  console.log(JSON.stringify({
    ok: receipt.ok,
    action: receipt.action,
    mode: receipt.mode,
    dryRun: receipt.dryRun,
    changed: receipt.changed,
    digest: receipt.state.digest,
    branch: receipt.state.branch,
    shortHead: receipt.state.shortHead,
    dirty: receipt.state.dirty,
    statusCounts: receipt.state.statusCounts,
    localOnlyCriticalCount: receipt.state.localOnlyCriticalCount,
    secretLikeTotal: receipt.state.boundary.secretLikeTotal,
    changedFileFingerprintCount: receipt.state.changedFileFingerprintCount || 0,
    plannedModes: receipt.plannedModes,
    coveredModes: receipt.coveredModes,
    runModes: receipt.runModes,
    additiveBaseline: receipt.additiveBaseline,
    deltaJournal: receipt.deltaJournal ? receipt.deltaJournal.summary || { skipped: receipt.deltaJournal.skipped, reason: receipt.deltaJournal.reason } : null,
    gitOrigin: receipt.gitOrigin ? receipt.gitOrigin.summary || { skipped: receipt.gitOrigin.skipped, reason: receipt.gitOrigin.reason } : null,
    binExports: receipt.binExports ? receipt.binExports.summary || { skipped: receipt.binExports.skipped, reason: receipt.binExports.reason } : null,
    receiptPath
  }, null, 2));
  if (!receipt.ok) process.exitCode = 1;
  return receipt;
}

function status() {
  const state = collectState();
  const latest = readJson(path.join(receiptBase(), 'latest-success.json'), null);
  const latestPrimary = readLatestPrimarySuccess();
  const latestFullRepo = readJson(path.join(receiptBase(), 'latest-full-repo-success.json'), null);
  console.log(JSON.stringify({
    ok: true,
    schema: 'skyevault.autosync-status.v1',
    checkedAt: new Date().toISOString(),
    mode: modeValue(),
    intervalSeconds: intValue('interval-seconds', 600, 10),
    deltaJournal: {
      enabled: !skipDelta,
      upload: deltaUpload,
      required: deltaRequired,
      latest: latestDeltaJournalSummary()
    },
    gitOrigin: latestGitOriginSummary(),
    binExports: {
      enabled: !skipBins,
      defaultOrEnvBinIds: binExportIds()
    },
    state: {
      branch: state.branch,
      shortHead: state.shortHead,
      upstream: state.upstream,
      ahead: state.ahead,
      behind: state.behind,
      dirty: state.dirty,
      statusCounts: state.statusCounts,
      digest: state.digest,
      digestVersion: state.digestVersion,
      legacyDigest: state.legacyDigest,
      scanMode: state.boundary.scanMode,
      scannedFiles: state.boundary.scannedFiles,
      changedFileFingerprintCount: state.changedFileFingerprintCount,
      localOnlyCriticalCount: state.localOnlyCriticalCount,
      localOnlyCriticalMaxMtimeMs: state.localOnlyCriticalMaxMtimeMs,
      secretLikeTotal: state.boundary.secretLikeTotal
    },
    latestSuccess: latest ? {
      completedAt: latest.completedAt,
      mode: latest.mode,
      digest: latest.state?.digest,
      plannedModes: latest.plannedModes,
      ok: latest.ok
    } : null,
    latestPrimarySuccess: latestPrimary ? {
      recordedAt: latestPrimary.recordedAt,
      mode: latestPrimary.mode,
      digest: latestPrimary.state?.digest,
      plannedModes: latestPrimary.plannedModes,
      runModes: primaryRunSummaries(latestPrimary).map((run) => run.mode)
    } : null,
    latestFullRepoSuccess: latestFullRepo ? {
      recordedAt: latestFullRepo.recordedAt,
      digest: latestFullRepo.state?.digest,
      artifactBytes: latestFullRepo.fullRun?.childSummaries?.find((item) => item.artifactBytes)?.artifactBytes || null,
      artifactSha256: latestFullRepo.fullRun?.childSummaries?.find((item) => item.artifactSha256)?.artifactSha256 || '',
      receiptId: latestFullRepo.fullRun?.childSummaries?.find((item) => item.receiptId)?.receiptId || '',
      controlReceiptId: latestFullRepo.fullRun?.childSummaries?.find((item) => item.controlReceiptId)?.controlReceiptId || ''
    } : null
  }, null, 2));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function watch() {
  const intervalSeconds = intValue('interval-seconds', 600, 10);
  const maxRuns = intValue('max-runs', Number.MAX_SAFE_INTEGER, 1);
  console.log(`[autosync] watching ${repoRoot}`);
  console.log(`[autosync] interval ${intervalSeconds}s, mode ${modeValue()}, dryRun=${dryRun}`);
  for (let run = 1; run <= maxRuns; run += 1) {
    console.log(`[autosync] scan ${run}/${maxRuns === Number.MAX_SAFE_INTEGER ? 'unbounded' : maxRuns}`);
    await withAutosyncLock(runOnce);
    if (run >= maxRuns) break;
    await sleep(intervalSeconds * 1000);
  }
}

if (command === 'once') {
  await withAutosyncLock(runOnce);
} else if (command === 'watch') {
  await watch();
} else if (command === 'status') {
  status();
} else {
  console.error(`Unknown SkyeVault autosync command: ${command}`);
  process.exit(1);
}
