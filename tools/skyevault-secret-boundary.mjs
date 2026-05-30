import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const rawArgs = process.argv.slice(2);

function argValue(name) {
  const prefix = `${name}=`;
  return rawArgs.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || '';
}

function resolvePath(value, fallback) {
  const clean = String(value || '').trim();
  if (!clean) return fallback;
  return path.isAbsolute(clean) ? clean : path.resolve(repoRoot, clean);
}

function stamp() {
  return new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
}

const root = resolvePath(argValue('--root'), repoRoot);
const outDir = resolvePath(argValue('--out-dir'), path.join(repoRoot, '.skyevault-out', 'secret-boundary'));
const limit = Math.max(1, Number(argValue('--limit') || 2500));

const SKIP_DIRS = new Map([
  ['.git', 'git object store; recover from Git bundle or remote'],
  ['node_modules', 'dependency install output; regenerate from package manager lockfiles'],
  ['.netlify', 'local deployment cache'],
  ['.wrangler', 'local Cloudflare worker cache/state'],
  ['.wrangler-dry-run', 'local Cloudflare worker dry-run state'],
  ['.claude', 'local assistant/tool state'],
  ['.tmp', 'generated staging tree; captured only by encrypted full-repo owner lane when needed'],
  ['.1', 'local imported handoff tree; captured only by encrypted full-repo owner lane when needed'],
  ['download-handoffs', 'generated/downloadable handoff bundles; captured only by encrypted full-repo owner lane when needed'],
  ['test-artifacts', 'generated proof/test artifacts'],
  ['test-results', 'generated test results'],
  ['backups', 'local backup data; review before deleting original workspace'],
  ['wal_archive', 'database WAL/archive state; private recovery material'],
  ['.staffing-db', 'local database state; private recovery material'],
  ['.skyevault-out', 'local vault receipts/proofs; copy separately if operator audit state matters']
]);

const SKIP_EXTS = new Map([
  ['.zip', 'archive bundle'],
  ['.tar', 'archive bundle'],
  ['.gz', 'archive bundle'],
  ['.tgz', 'archive bundle'],
  ['.7z', 'archive bundle'],
  ['.rar', 'archive bundle'],
  ['.dump', 'database dump'],
  ['.backup', 'backup file'],
  ['.bak', 'backup file'],
  ['.sqlite', 'local database'],
  ['.sqlite3', 'local database'],
  ['.db', 'local database'],
  ['.pem', 'private key/certificate material'],
  ['.key', 'private key/certificate material'],
  ['.p12', 'private key/certificate material'],
  ['.pfx', 'private key/certificate material']
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

function rel(file) {
  return path.relative(root, file).split(path.sep).join('/');
}

function bytesHuman(value) {
  const size = Number(value || 0);
  if (!size) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  return `${(size / 1024 ** index).toFixed(index ? 2 : 0)} ${units[index]}`;
}

function statSummary(file) {
  try {
    const stat = fs.lstatSync(file);
    return {
      bytes: stat.size,
      human: bytesHuman(stat.size),
      mtime: stat.mtime.toISOString(),
      type: stat.isDirectory() ? 'directory' : stat.isFile() ? 'file' : stat.isSymbolicLink() ? 'symlink' : 'other'
    };
  } catch {
    return { bytes: 0, human: '0 B', mtime: '', type: 'missing' };
  }
}

function policyReason(file) {
  const parts = rel(file).split('/');
  const dir = parts.find((part) => SKIP_DIRS.has(part));
  if (dir) return { reason: SKIP_DIRS.get(dir), rule: `directory:${dir}`, critical: ['backups', 'wal_archive', '.staffing-db', '.skyevault-out'].includes(dir) };
  const base = path.basename(file);
  if (/^\.env($|\.)/.test(base) || /^\.env/.test(base)) return { reason: 'environment file', rule: 'env-file', critical: true };
  if (/^id_rsa/.test(base)) return { reason: 'private SSH key', rule: 'private-key-name', critical: true };
  if (/credentials.*\.json$/i.test(base) || /service-account.*\.json$/i.test(base)) return { reason: 'credential/service-account JSON', rule: 'credentials-json', critical: true };
  const ext = path.extname(file).toLowerCase();
  if (SKIP_EXTS.has(ext)) return { reason: SKIP_EXTS.get(ext), rule: `extension:${ext}`, critical: !['.zip', '.tar', '.gz', '.tgz', '.7z', '.rar'].includes(ext) };
  return null;
}

function secretHits(file) {
  let stat;
  try {
    stat = fs.statSync(file);
  } catch {
    return [];
  }
  if (!stat.isFile() || stat.size > 2 * 1024 * 1024) return [];
  let text = '';
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return [];
  }
  if (text.includes('\u0000')) return [];
  return SECRET_PATTERNS.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
}

function walk(dir, visitor) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    visitor(file, entry);
    if (entry.isDirectory() && !SKIP_DIRS.has(entry.name)) walk(file, visitor);
  }
}

const policyExcluded = [];
const secretLike = [];
let checked = 0;

walk(root, (file, entry) => {
  const policy = policyReason(file);
  if (policy) {
    policyExcluded.push({ path: rel(file), ...statSummary(file), ...policy });
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) return;
  }
  if (entry.isFile()) {
    checked += 1;
    const hits = secretHits(file);
    if (hits.length) {
      secretLike.push({ path: rel(file), ...statSummary(file), reason: 'secret-like text scanner hit', rule: 'secret-scanner', critical: true, hits });
    }
  }
});

const seen = new Set();
const localOnly = [...policyExcluded, ...secretLike]
  .filter((item) => item.critical)
  .filter((item) => {
    if (seen.has(item.path)) return false;
    seen.add(item.path);
    return true;
  })
  .slice(0, limit);

const generatedAt = new Date().toISOString();
fs.mkdirSync(outDir, { recursive: true });
const base = `secret-boundary-${stamp()}`;
const jsonPath = path.join(outDir, `${base}.json`);
const mdPath = path.join(outDir, `${base}.md`);
const pathsPath = path.join(outDir, `${base}.paths.txt`);

const report = {
  schema: 'skyevault.secret-boundary.v1',
  generatedAt,
  host: os.hostname(),
  root,
  scannedFileCount: checked,
  summary: {
    policyExcludedCount: policyExcluded.length,
    secretLikeCount: secretLike.length,
    criticalLocalOnlyCount: localOnly.length
  },
  policy: {
    directories: Object.fromEntries(SKIP_DIRS),
    extensions: Object.fromEntries(SKIP_EXTS),
    scannerRules: SECRET_PATTERNS.map(([name]) => name)
  },
  localOnlyRestoreChecklist: localOnly,
  policyExcluded: policyExcluded.slice(0, limit),
  secretLikeFiles: secretLike.slice(0, limit),
  artifacts: {
    jsonPath,
    markdownPath: mdPath,
    pathsPath
  }
};

const md = [
  '# SkyeVault Local-Only Secret Boundary',
  '',
  `Generated: ${generatedAt}`,
  `Root: \`${root}\``,
  '',
  'This is the list of paths the vault workflow intentionally keeps out of safe repo archives and Git vault overlays. It documents paths only, never secret values.',
  '',
  '## Summary',
  '',
  `- Files scanned: ${checked}`,
  `- Policy exclusions found: ${policyExcluded.length}`,
  `- Secret-like scanner hits: ${secretLike.length}`,
  `- Critical local-only restore paths: ${localOnly.length}`,
  '',
  '## Critical Local-Only Restore Checklist',
  '',
  ...(localOnly.length ? localOnly.map((item) => `- \`${item.path}\` — ${item.reason}${item.hits ? ` (${item.hits.join(', ')})` : ''}`) : ['- None found.']),
  '',
  '## Suggested Private Package Flow',
  '',
  'Use the `.paths.txt` artifact as a review checklist. If a team packages these paths, keep that package encrypted and do not upload it to a public repo or normal vault archive.',
  '',
  '```bash',
  `tar -czf local-only-secrets-and-state-${base}.tgz -T ${pathsPath}`,
  '```',
  '',
  'Review the paths before running the command; some entries may be generated or intentionally disposable.'
].join('\n');

fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(mdPath, `${md}\n`);
fs.writeFileSync(pathsPath, `${localOnly.map((item) => item.path).join('\n')}\n`);

console.log(JSON.stringify({
  ok: true,
  generatedAt,
  root,
  scannedFileCount: checked,
  policyExcludedCount: policyExcluded.length,
  secretLikeCount: secretLike.length,
  criticalLocalOnlyCount: localOnly.length,
  jsonPath,
  markdownPath: mdPath,
  pathsPath
}, null, 2));
