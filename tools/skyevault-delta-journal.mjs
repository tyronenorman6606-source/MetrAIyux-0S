#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const rawArgs = process.argv.slice(2);
const command = rawArgs.find((arg) => !arg.startsWith('--')) || 'run';

applyEnvFiles();

const dryRun = flag('--dry-run') || envFlag('SKYEVAULT_DELTA_DRY_RUN', false);
const force = flag('--force') || envFlag('SKYEVAULT_DELTA_FORCE', false);
const upload = flag('--upload') || envFlag('SKYEVAULT_DELTA_UPLOAD', false);
const scanGenerated = flag('--scan-generated') || envFlag('SKYEVAULT_DELTA_SCAN_GENERATED', false);
const maxFileMb = numberValue('max-file-mb', Number(process.env.SKYEVAULT_DELTA_MAX_FILE_MB || 5000), 1);
const maxFileBytes = maxFileMb * 1024 * 1024;

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
    ...String(process.env.SKYEVAULT_DELTA_ENV_FILE || process.env.SKYEVAULT_AUTOSYNC_ENV_FILE || '').split(path.delimiter).filter(Boolean),
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

function envFlag(name, fallback = false) {
  const value = process.env[name];
  if (value === undefined || value === '') return fallback;
  return !['0', 'false', 'no', 'off'].includes(String(value).trim().toLowerCase());
}

function numberValue(name, fallback, minimum = 1) {
  const envName = `SKYEVAULT_DELTA_${name.toUpperCase().replace(/-/g, '_')}`;
  const value = Number.parseInt(argValue(`--${name}`, process.env[envName] || String(fallback)), 10);
  return Number.isFinite(value) && value >= minimum ? value : fallback;
}

function rel(file) {
  return path.relative(repoRoot, file).split(path.sep).join('/');
}

function stamp() {
  return new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function randBase64(bytes = 48) {
  return crypto.randomBytes(bytes).toString('base64url');
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

function sha256File(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
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

function appendJsonl(file, value, mode = 0o600) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(value)}\n`, { mode });
  try { fs.chmodSync(file, mode); } catch {}
}

function git(args, fallback = '') {
  try {
    return execFileSync('git', args, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: numberValue('git-max-buffer-mb', 128, 1) * 1024 * 1024
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
      maxBuffer: numberValue('git-max-buffer-mb', 128, 1) * 1024 * 1024
    });
  } catch {
    return Buffer.alloc(0);
  }
}

function gitLines(args) {
  const output = git(args, '');
  return output ? output.split(/\r?\n/).filter(Boolean) : [];
}

function gitZeroLines(args) {
  const output = gitBuffer(args).toString('utf8');
  return output ? output.split('\0').filter(Boolean) : [];
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

function secretHits(file) {
  let stat;
  try {
    stat = fs.statSync(file);
  } catch {
    return [];
  }
  if (!stat.isFile() || stat.size > Math.min(maxFileBytes, 2 * 1024 * 1024)) return [];
  let text = '';
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return [];
  }
  if (text.includes('\u0000')) return [];
  return SECRET_PATTERNS.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
}

function isSelfGeneratedOutput(relativePath) {
  return SELF_GENERATED_OUTPUTS.has(normalizeStatusPath(relativePath));
}

function skipReasonForPath(relativePath, file = path.resolve(repoRoot, relativePath)) {
  const clean = normalizeStatusPath(relativePath).replace(/^\.\/+/, '');
  const parts = clean.split('/').filter(Boolean);
  if (!clean || clean.includes('\0')) return 'invalid-path';
  if (isSelfGeneratedOutput(clean)) return 'self-generated-proof-output';
  if (parts.some((part) => SKIP_DIRS.has(part))) return 'skipped-infra-or-cache-dir';
  if (!scanGenerated && parts.some((part) => GENERATED_SKIP_DIRS.has(part))) return 'generated-output-dir';
  return '';
}

function fileInRepo(file) {
  return file === repoRoot || file.startsWith(`${repoRoot}${path.sep}`);
}

function addSkipped(skipped, relativePath, reason) {
  const clean = normalizeStatusPath(relativePath).replace(/^\.\/+/, '');
  if (!clean || !reason) return;
  skipped.set(clean, { path: clean, reason });
}

function addCandidate(candidates, skipped, relativePath, origin) {
  const clean = normalizeStatusPath(relativePath).replace(/^\.\/+/, '');
  const file = path.resolve(repoRoot, clean);
  if (!fileInRepo(file)) {
    addSkipped(skipped, clean, 'outside-repo-root');
    return;
  }
  const policyReasonText = skipReasonForPath(clean, file);
  if (policyReasonText) {
    addSkipped(skipped, clean, policyReasonText);
    return;
  }

  let stat = null;
  try {
    stat = fs.statSync(file);
  } catch {
    const prior = candidates.get(clean) || { path: clean, origins: [] };
    prior.exists = false;
    prior.tombstone = true;
    prior.origins = [...new Set([...(prior.origins || []), origin])];
    candidates.set(clean, prior);
    return;
  }

  if (!stat.isFile()) {
    addSkipped(skipped, clean, 'not-a-regular-file');
    return;
  }
  if (stat.size > maxFileBytes) {
    addSkipped(skipped, clean, `over-max-file-mb:${maxFileMb}`);
    return;
  }

  const policy = policyReason(file);
  const hits = command === 'seed-baseline' && (argValue('--covered-before', argValue('--baseline-completed-at', '')))
    ? []
    : secretHits(file);
  const prior = candidates.get(clean) || { path: clean, origins: [] };
  candidates.set(clean, {
    ...prior,
    exists: true,
    tombstone: false,
    file,
    bytes: stat.size,
    mtimeMs: Math.floor(stat.mtimeMs),
    mode: stat.mode & 0o777,
    policy: policy ? { reason: policy.reason, rule: policy.rule, critical: Boolean(policy.critical) } : null,
    secretHits: hits,
    origins: [...new Set([...(prior.origins || []), origin])]
  });
}

function walkRiskyNames(dir, candidates, skipped) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const file = path.join(dir, entry.name);
    const relativePath = rel(file);
    const reason = skipReasonForPath(relativePath, file);
    if (reason) {
      if (policyReason(file)) addSkipped(skipped, relativePath, reason);
      continue;
    }
    if (entry.isDirectory()) {
      walkRiskyNames(file, candidates, skipped);
      continue;
    }
    if (!entry.isFile()) continue;
    if (policyReason(file)) addCandidate(candidates, skipped, relativePath, 'local-critical-name');
  }
}

function collectCandidates() {
  const skipped = new Map();
  const candidates = new Map();
  const statusShort = gitLines(['status', '--porcelain=v1', '--branch', '--untracked-files=all']);
  const statusOnly = statusShort.filter((line) => !line.startsWith('##'));

  for (const line of statusOnly) {
    for (const itemPath of statusLinePaths(line)) addCandidate(candidates, skipped, itemPath, 'git-status');
  }
  for (const itemPath of gitZeroLines(['ls-files', '-z', '--others', '--exclude-standard'])) {
    addCandidate(candidates, skipped, itemPath, 'git-untracked');
  }
  walkRiskyNames(repoRoot, candidates, skipped);

  return {
    branch: git(['branch', '--show-current'], 'HEAD') || 'HEAD',
    head: git(['rev-parse', 'HEAD'], ''),
    shortHead: git(['rev-parse', '--short', 'HEAD'], ''),
    upstream: git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], ''),
    statusShort,
    statusCounts: statusCounts(statusOnly),
    candidates: [...candidates.values()].sort((a, b) => a.path.localeCompare(b.path)),
    skipped: [...skipped.values()].sort((a, b) => a.path.localeCompare(b.path))
  };
}

function latestStateFile() {
  return path.join(repoRoot, '.skyevault-out', 'delta-journal', 'latest-state.json');
}

function previousEntryMap() {
  const latest = readJson(latestStateFile(), null);
  const entries = Array.isArray(latest?.entries) ? latest.entries : [];
  return new Map(entries.map((entry) => [entry.path, entry]));
}

function buildState(collection) {
  const previous = previousEntryMap();
  const entries = [];
  const changedFiles = [];
  const tombstones = [];
  const unchanged = [];

  for (const item of collection.candidates) {
    if (item.exists) {
      const prior = previous.get(item.path);
      const priorBaselineCovered = prior?.baselineCovered
        && Number(item.mtimeMs || 0) <= Number(prior.coveredBeforeMs || 0) + 5000
        && (!Number.isFinite(Number(prior.bytes)) || Number(prior.bytes) === Number(item.bytes || 0));
      if (!force && priorBaselineCovered) {
        const entry = {
          path: item.path,
          exists: true,
          bytes: item.bytes,
          mtimeMs: item.mtimeMs,
          mode: item.mode,
          sha256: prior.sha256 || '',
          baselineCovered: true,
          coveredBeforeMs: prior.coveredBeforeMs,
          origins: item.origins,
          policy: item.policy,
          secretHitCount: item.secretHits.length
        };
        unchanged.push(entry.path);
        entries.push(entry);
        continue;
      }
      const sha256 = sha256File(item.file);
      const entry = {
        path: item.path,
        exists: true,
        bytes: item.bytes,
        mtimeMs: item.mtimeMs,
        mode: item.mode,
        sha256,
        origins: item.origins,
        policy: item.policy,
        secretHitCount: item.secretHits.length
      };
      if (force || !prior || prior.exists !== true || prior.sha256 !== sha256 || prior.bytes !== item.bytes) changedFiles.push(entry);
      else unchanged.push(entry.path);
      entries.push(entry);
      continue;
    }

    const tombstone = {
      path: item.path,
      exists: false,
      deletedAt: new Date().toISOString(),
      origins: item.origins || ['git-status']
    };
    const prior = previous.get(item.path);
    if (force || !prior || prior.exists !== false) tombstones.push(tombstone);
    entries.push(tombstone);
  }

  const state = {
    schema: 'skyevault.delta-journal-state.v1',
    collectedAt: new Date().toISOString(),
    host: os.hostname(),
    repoRoot,
    branch: collection.branch,
    head: collection.head,
    shortHead: collection.shortHead,
    upstream: collection.upstream,
    statusCounts: collection.statusCounts,
    scanGenerated,
    maxFileMb,
    entryCount: entries.length,
    changedFileCount: changedFiles.length,
    tombstoneCount: tombstones.length,
    unchangedCount: unchanged.length,
    skippedCount: collection.skipped.length,
    entries: entries.sort((a, b) => a.path.localeCompare(b.path)),
    skipped: collection.skipped
  };
  state.digest = sha256Text(safeJson({
    branch: state.branch,
    head: state.head,
    entries: state.entries.map((entry) => ({
      path: entry.path,
      exists: entry.exists,
      bytes: entry.bytes || 0,
      sha256: entry.sha256 || '',
      origins: entry.origins || []
    }))
  }));
  return { state, changedFiles, tombstones, unchanged };
}

function buildBaselineSeedState(collection, cutoffMs, cutoffRaw) {
  const entries = [];
  let excludedAfterCutoff = 0;
  for (const item of collection.candidates) {
    if (!item.exists) {
      excludedAfterCutoff += 1;
      continue;
    }
    if (Number(item.mtimeMs || 0) > cutoffMs + 5000) {
      excludedAfterCutoff += 1;
      continue;
    }
    entries.push({
      path: item.path,
      exists: true,
      bytes: item.bytes,
      mtimeMs: item.mtimeMs,
      mode: item.mode,
      sha256: '',
      baselineCovered: true,
      coveredBeforeMs: cutoffMs,
      origins: item.origins,
      policy: item.policy,
      secretHitCount: item.secretHits.length
    });
  }
  const state = {
    schema: 'skyevault.delta-journal-state.v1',
    collectedAt: new Date().toISOString(),
    host: os.hostname(),
    repoRoot,
    branch: collection.branch,
    head: collection.head,
    shortHead: collection.shortHead,
    upstream: collection.upstream,
    statusCounts: collection.statusCounts,
    scanGenerated,
    maxFileMb,
    entryCount: entries.length,
    changedFileCount: 0,
    tombstoneCount: 0,
    unchangedCount: entries.length,
    skippedCount: collection.skipped.length,
    baselineExcludedAfterCutoffCount: excludedAfterCutoff,
    entries: entries.sort((a, b) => a.path.localeCompare(b.path)),
    skipped: collection.skipped,
    baselineCoveredBefore: cutoffRaw
  };
  state.digest = sha256Text(safeJson({
    branch: state.branch,
    head: state.head,
    entries: state.entries.map((entry) => ({
      path: entry.path,
      exists: entry.exists,
      bytes: entry.bytes || 0,
      sha256: entry.sha256 || '',
      origins: entry.origins || []
    }))
  }));
  return state;
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
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === '"') inString = false;
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

function packDelta({ outDir, state, changedFiles, tombstones }) {
  const boundaryFile = path.join(outDir, 'source-boundary.json');
  const pathsFile = path.join(outDir, 'paths.txt');
  const packPath = path.join(outDir, `skyevault-delta-${stamp()}.skyesecrets`);
  const boundary = {
    schema: 'skyevault.delta-source-boundary.v1',
    generatedAt: new Date().toISOString(),
    repo: {
      name: path.basename(repoRoot),
      branch: state.branch,
      shortHead: state.shortHead,
      digest: state.digest
    },
    policy: {
      lane: 'encrypted delta journal',
      role: 'fast encrypted custody between full source-custody snapshots',
      scanGenerated,
      maxFileMb,
      mediaExtensionsIncluded: true,
      skippedDirectories: [...SKIP_DIRS].sort(),
      skippedGeneratedDirectories: [...GENERATED_SKIP_DIRS].sort()
    },
    summary: {
      candidateCount: state.entryCount,
      changedFileCount: changedFiles.length,
      tombstoneCount: tombstones.length,
      skippedCount: state.skippedCount,
      statusCounts: state.statusCounts
    },
    changedFiles,
    tombstones,
    skipped: state.skipped
  };
  writeJson(boundaryFile, boundary);

  const packPaths = [
    rel(boundaryFile),
    ...changedFiles.map((item) => item.path)
  ];
  fs.writeFileSync(pathsFile, `${packPaths.join('\n')}\n`, { mode: 0o600 });
  try { fs.chmodSync(pathsFile, 0o600); } catch {}

  const packEnv = {
    ...process.env,
    SKYEVAULT_DELTA_PASSPHRASE: randBase64(64),
    SKYEVAULT_DELTA_PEPPER: randBase64(48)
  };
  const args = [
    path.join(repoRoot, 'tools', 'skye-secure-packs.mjs'),
    'pack',
    '--root=.',
    `--paths-file=${rel(pathsFile)}`,
    `--source-boundary=${rel(boundaryFile)}`,
    `--out=${rel(packPath)}`,
    '--recipient=owner',
    '--passphrase-env=SKYEVAULT_DELTA_PASSPHRASE',
    '--pepper-env=SKYEVAULT_DELTA_PEPPER',
    '--project=SkyeVault Delta Journal',
    '--client=MetrAIyux-0S',
    '--repo=MetrAIyux-0S',
    '--workspace=owner-dev-workspace',
    `--max-file-mb=${maxFileMb}`,
    '--notes=Encrypted fast delta journal before vault upload. Public proof may expose counts and digests only.'
  ];

  const started = Date.now();
  const result = spawnSync(process.execPath, args, {
    cwd: repoRoot,
    env: packEnv,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 8
  });
  const parsed = parseJsonObjects(String(result.stdout || '')).at(-1) || null;
  if (result.status !== 0 || !parsed?.ok) {
    return {
      ok: false,
      status: result.status,
      durationMs: Date.now() - started,
      stderrTail: String(result.stderr || '').slice(-2000)
    };
  }
  const stat = fs.statSync(packPath);
  return {
    ok: true,
    status: result.status,
    durationMs: Date.now() - started,
    packPath: rel(packPath),
    packBytes: stat.size,
    packSha256: sha256File(packPath),
    packReceiptPath: parsed.receipt ? rel(path.resolve(repoRoot, parsed.receipt)) : '',
    privateHandoffPath: parsed.handoffPath ? rel(path.resolve(repoRoot, parsed.handoffPath)) : '',
    packedFileCount: Number(parsed.summary?.fileCount || changedFiles.length + 1),
    sourceBoundaryPath: rel(boundaryFile),
    pathsFile: rel(pathsFile),
    note: 'Private handoff contains passphrase material and stays local under .skyevault-out.'
  };
}

function readUploadReceipt(uploadReceiptPath) {
  if (!uploadReceiptPath) return null;
  const file = path.isAbsolute(uploadReceiptPath) ? uploadReceiptPath : path.resolve(repoRoot, uploadReceiptPath);
  const receipt = readJson(file, null);
  if (!receipt) return null;
  return {
    receiptId: receipt.receiptId || '',
    sessionId: receipt.sessionId || '',
    fileName: receipt.fileName || '',
    fileSize: receipt.fileSize || receipt.archive?.bytes || null,
    sha256: receipt.sha256 || receipt.archive?.sha256 || '',
    assetType: receipt.assetType || '',
    projectName: receipt.projectName || '',
    clientReference: receipt.clientReference || '',
    downloadUrlAvailable: Boolean(receipt.download?.downloadUrl),
    downloadExpiresAt: receipt.download?.expiresAt || '',
    recoveryUrl: receipt.download?.recoveryUrl || ''
  };
}

function uploadPack({ pack, changedFiles, tombstones }) {
  if (!pack?.packPath) return { ok: false, skipped: true, reason: 'pack missing' };
  const args = [
    path.join(repoRoot, 'tools', 'skyevault-repo-push.mjs'),
    `--upload-archive=${pack.packPath}`,
    `--file-count=${pack.packedFileCount || changedFiles.length + 1}`,
    '--secret-excludes=0',
    '--mime-type=application/vnd.skyesecure.secret-pack',
    '--asset-type=SkyeVault encrypted delta journal',
    '--project-name=SkyeVault Delta Journal: MetrAIyux-0S',
    `--client-reference=delta:${stateSafeStamp()}`,
    `--notes=Encrypted SkyeVault fast delta journal. Changed files: ${changedFiles.length}; tombstones: ${tombstones.length}; source boundary is inside the encrypted pack.`
  ];
  const started = Date.now();
  const result = spawnSync(process.execPath, args, {
    cwd: repoRoot,
    env: {
      ...process.env,
      SKYEVAULT_SKIP_GIT_STATUS: '1'
    },
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 12
  });
  const stdout = String(result.stdout || '');
  const stderr = String(result.stderr || '');
  const receiptPath = stdout
    .split(/\r?\n/)
    .map((line) => line.match(/Receipt written:\s*(.+)$/)?.[1]?.trim())
    .filter(Boolean)
    .pop() || '';
  const raw = readUploadReceipt(receiptPath);
  return {
    ok: result.status === 0,
    status: result.status,
    durationMs: Date.now() - started,
    receiptPath: receiptPath ? rel(path.resolve(repoRoot, receiptPath)) : '',
    receiptId: raw?.receiptId || '',
    fileSize: raw?.fileSize || null,
    sha256: raw?.sha256 || '',
    downloadUrlAvailable: Boolean(raw?.downloadUrlAvailable),
    recoveryUrl: raw?.recoveryUrl || '',
    stderrTail: stderr.slice(-2000)
  };
}

function stateSafeStamp() {
  return new Date().toISOString().replace(/[^0-9A-Za-z]+/g, '').slice(0, 15);
}

function safeReceipt(receipt) {
  return {
    ok: receipt.ok,
    schema: receipt.schema,
    action: receipt.action,
    dryRun: receipt.dryRun,
    uploadRequested: receipt.uploadRequested,
    startedAt: receipt.startedAt,
    completedAt: receipt.completedAt,
    durationMs: receipt.durationMs,
    branch: receipt.state.branch,
    shortHead: receipt.state.shortHead,
    digest: receipt.state.digest,
    statusCounts: receipt.state.statusCounts,
    entryCount: receipt.state.entryCount,
    changedFileCount: receipt.state.changedFileCount,
    tombstoneCount: receipt.state.tombstoneCount,
    skippedCount: receipt.state.skippedCount,
    pack: receipt.pack ? {
      ok: receipt.pack.ok,
      packPath: receipt.pack.packPath,
      packBytes: receipt.pack.packBytes,
      packSha256: receipt.pack.packSha256,
      packedFileCount: receipt.pack.packedFileCount,
      sourceBoundaryPath: receipt.pack.sourceBoundaryPath,
      note: receipt.pack.note
    } : null,
    upload: receipt.upload ? {
      ok: receipt.upload.ok,
      skipped: Boolean(receipt.upload.skipped),
      reason: receipt.upload.reason || '',
      receiptId: receipt.upload.receiptId || '',
      receiptPath: receipt.upload.receiptPath || '',
      fileSize: receipt.upload.fileSize || null,
      sha256: receipt.upload.sha256 || '',
      downloadUrlAvailable: Boolean(receipt.upload.downloadUrlAvailable),
      recoveryUrl: receipt.upload.recoveryUrl || ''
    } : null,
    receiptPath: receipt.receiptPath || ''
  };
}

function writeDeltaReceipt(receipt) {
  const base = path.join(repoRoot, '.skyevault-out', 'delta-journal');
  const receiptPath = path.join(base, `delta-journal-${stamp()}.json`);
  receipt.receiptPath = rel(receiptPath);
  writeJson(receiptPath, receipt);
  if (!receipt.dryRun) writeJson(path.join(base, 'latest-scan.json'), receipt);
  if (!receipt.dryRun && receipt.action !== 'skip') writeJson(path.join(base, 'latest-receipt.json'), receipt);
  if (receipt.ok && !receipt.dryRun && receipt.action !== 'skip') writeJson(latestStateFile(), receipt.state);
  appendJsonl(path.join(base, 'delta-journal-ledger.jsonl'), {
    schema: 'skyevault.delta-journal-ledger.v1',
    event: receipt.dryRun ? 'delta.dry-run' : receipt.ok ? `delta.${receipt.action}` : 'delta.failed',
    recordedAt: receipt.completedAt,
    action: receipt.action,
    dryRun: receipt.dryRun,
    uploadRequested: receipt.uploadRequested,
    digest: receipt.state.digest,
    branch: receipt.state.branch,
    shortHead: receipt.state.shortHead,
    changedFileCount: receipt.state.changedFileCount,
    tombstoneCount: receipt.state.tombstoneCount,
    skippedCount: receipt.state.skippedCount,
    packBytes: receipt.pack?.packBytes || null,
    uploadReceiptId: receipt.upload?.receiptId || '',
    receiptPath: receipt.receiptPath
  });
  return receiptPath;
}

function runDelta() {
  const startedAt = new Date().toISOString();
  const started = Date.now();
  const collection = collectCandidates();
  const { state, changedFiles, tombstones } = buildState(collection);
  const hasDelta = force || changedFiles.length > 0 || tombstones.length > 0;
  const outDir = path.join(repoRoot, '.skyevault-out', 'delta-journal', stamp());
  const receipt = {
    ok: true,
    schema: 'skyevault.delta-journal-receipt.v1',
    startedAt,
    completedAt: new Date().toISOString(),
    durationMs: 0,
    dryRun,
    force,
    uploadRequested: upload,
    action: hasDelta ? 'delta-packed' : 'skip',
    state,
    pack: null,
    upload: null
  };

  if (!hasDelta) {
    receipt.reason = 'no changed delta candidates since latest delta state';
  } else if (dryRun) {
    receipt.pack = {
      ok: true,
      dryRun: true,
      wouldPackFileCount: changedFiles.length + 1,
      wouldUpload: upload,
      changedFileCount: changedFiles.length,
      tombstoneCount: tombstones.length
    };
    receipt.upload = upload ? { ok: true, skipped: true, dryRun: true, reason: 'dry-run' } : { ok: true, skipped: true, reason: 'upload not requested' };
  } else {
    fs.mkdirSync(outDir, { recursive: true, mode: 0o700 });
    receipt.pack = packDelta({ outDir, state, changedFiles, tombstones });
    if (!receipt.pack.ok) {
      receipt.ok = false;
      receipt.error = 'encrypted delta pack failed';
    } else if (upload) {
      receipt.upload = uploadPack({ pack: receipt.pack, changedFiles, tombstones });
      if (!receipt.upload.ok) {
        receipt.ok = false;
        receipt.error = 'encrypted delta upload failed';
      }
    } else {
      receipt.upload = { ok: true, skipped: true, reason: 'upload not requested' };
    }
  }

  receipt.completedAt = new Date().toISOString();
  receipt.durationMs = Date.now() - started;
  const receiptPath = writeDeltaReceipt(receipt);
  console.log(JSON.stringify(safeReceipt({ ...receipt, receiptPath: rel(receiptPath) }), null, 2));
  if (!receipt.ok) process.exitCode = 1;
}

function status() {
  const latest = readJson(path.join(repoRoot, '.skyevault-out', 'delta-journal', 'latest-receipt.json'), null);
  const latestState = readJson(latestStateFile(), null);
  console.log(JSON.stringify({
    ok: true,
    schema: 'skyevault.delta-journal-status.v1',
    checkedAt: new Date().toISOString(),
    enabled: true,
    uploadDefault: upload,
    scanGenerated,
    maxFileMb,
    latest: latest ? safeReceipt(latest) : null,
    latestState: latestState ? {
      collectedAt: latestState.collectedAt,
      branch: latestState.branch,
      shortHead: latestState.shortHead,
      digest: latestState.digest,
      entryCount: latestState.entryCount,
      changedFileCount: latestState.changedFileCount,
      tombstoneCount: latestState.tombstoneCount,
      skippedCount: latestState.skippedCount
    } : null
  }, null, 2));
}

function seedBaseline() {
  const startedAt = new Date().toISOString();
  const started = Date.now();
  const fromReceipt = argValue('--from-receipt', '');
  const cutoffRaw = argValue('--covered-before', argValue('--baseline-completed-at', ''));
  const cutoffMs = cutoffRaw ? Date.parse(cutoffRaw) : 0;
  let source = null;
  let state = null;
  if (fromReceipt) {
    const resolved = path.isAbsolute(fromReceipt) ? fromReceipt : path.resolve(repoRoot, fromReceipt);
    source = { type: 'receipt', path: rel(resolved) };
    const receipt = readJson(resolved, null);
    state = receipt?.state || null;
    if (!state?.entries) {
      console.error(`Seed receipt does not include a delta state: ${fromReceipt}`);
      process.exit(1);
    }
  } else {
    source = { type: 'current-scan', coveredBefore: cutoffRaw || '' };
    const collection = collectCandidates();
    if (Number.isFinite(cutoffMs) && cutoffMs > 0) {
      state = buildBaselineSeedState(collection, cutoffMs, cutoffRaw);
    } else {
      state = buildState(collection).state;
    }
  }
  state = {
    ...state,
    baselineSeed: {
      seededAt: new Date().toISOString(),
      source,
      artifactReceiptId: argValue('--artifact-receipt', ''),
      note: 'Seeded as the additive state matching the latest encrypted full-repo baseline; future runs pack only changes after this state.'
    }
  };
  const receipt = {
    ok: true,
    schema: 'skyevault.delta-journal-receipt.v1',
    startedAt,
    completedAt: new Date().toISOString(),
    durationMs: Date.now() - started,
    dryRun: false,
    force: false,
    uploadRequested: false,
    action: 'seed-baseline',
    state,
    pack: null,
    upload: { ok: true, skipped: true, reason: 'baseline seed writes state only' }
  };
  const receiptPath = writeDeltaReceipt(receipt);
  console.log(JSON.stringify(safeReceipt({ ...receipt, receiptPath: rel(receiptPath) }), null, 2));
}

if (command === 'run' || command === 'once') {
  runDelta();
} else if (command === 'status') {
  status();
} else if (command === 'seed-baseline') {
  seedBaseline();
} else {
  console.error('Usage: node tools/skyevault-delta-journal.mjs run|status|seed-baseline [--upload] [--dry-run] [--force] [--env-file=env.txt]');
  process.exit(2);
}
