import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const rawArgs = process.argv.slice(2);
const command = rawArgs[0] && !rawArgs[0].startsWith('--') ? rawArgs[0] : 'stage';
const args = command === rawArgs[0] ? rawArgs.slice(1) : rawArgs;
const dryRun = args.includes('--dry-run');

const SKIP_DIRS = new Set([
  '.git',
  'node_modules',
  '.netlify',
  '.wrangler',
  '.wrangler-dry-run',
  '.claude',
  'test-artifacts',
  'test-results',
  'backups',
  'wal_archive',
  '.staffing-db',
  '.skyevault-out'
]);
const SKIP_EXTS = new Set([
  '.zip',
  '.tar',
  '.gz',
  '.tgz',
  '.7z',
  '.rar',
  '.dump',
  '.backup',
  '.bak',
  '.sqlite',
  '.sqlite3',
  '.db',
  '.pem',
  '.key',
  '.p12',
  '.pfx'
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

function argValue(name, fallback = '') {
  const prefix = `${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = args.indexOf(name);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  return fallback;
}

function stamp() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function slug(value, fallback = 'skyevaultpro-import') {
  return String(value || fallback)
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96) || fallback;
}

function resolvePath(value, fallback) {
  const clean = String(value || '').trim();
  if (!clean) return fallback;
  return path.isAbsolute(clean) ? clean : path.resolve(repoRoot, clean);
}

function relFrom(base, file) {
  return path.relative(base, file).split(path.sep).join('/');
}

function shouldAlwaysExclude(sourceRoot, file) {
  const relative = relFrom(sourceRoot, file);
  const parts = relative.split('/');
  if (parts.some((part) => SKIP_DIRS.has(part))) return true;
  const base = path.basename(file);
  if (/^\.env($|\.)/.test(base)) return true;
  if (/^id_rsa/.test(base)) return true;
  if (/credentials.*\.json$/i.test(base) || /service-account.*\.json$/i.test(base)) return true;
  return SKIP_EXTS.has(path.extname(file).toLowerCase());
}

function secretHits(file) {
  const stat = fs.statSync(file);
  if (stat.size > 2 * 1024 * 1024) return [];
  let text = '';
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return [];
  }
  if (text.includes('\u0000')) return [];
  return SECRET_PATTERNS.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
}

function walk(sourceRoot, dir, visitor) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (shouldAlwaysExclude(sourceRoot, file)) continue;
    if (entry.isDirectory()) {
      walk(sourceRoot, file, visitor);
    } else if (entry.isFile()) {
      visitor(file);
    }
  }
}

function latestDevReceipt() {
  const ledger = path.join(repoRoot, '.skyevault-out', 'vault-ledger.jsonl');
  if (!fs.existsSync(ledger)) return null;
  const lines = fs.readFileSync(ledger, 'utf8').split(/\r?\n/).filter(Boolean).reverse();
  for (const line of lines) {
    try {
      const record = JSON.parse(line);
      if (record?.receiptPath && fs.existsSync(record.receiptPath)) {
        return JSON.parse(fs.readFileSync(record.receiptPath, 'utf8'));
      }
      if (record?.receiptId) return record;
    } catch {}
  }
  return null;
}

async function sha256(file) {
  const hash = crypto.createHash('sha256');
  const stream = fs.createReadStream(file);
  for await (const chunk of stream) hash.update(chunk);
  return hash.digest('hex');
}

async function collectFiles(sourceRoot) {
  const files = [];
  const excluded = [];
  walk(sourceRoot, sourceRoot, (file) => {
    const rel = relFrom(sourceRoot, file);
    const hits = secretHits(file);
    if (hits.length) {
      excluded.push({ file: rel, hits });
      return;
    }
    files.push(file);
  });
  return { files, excluded };
}

async function stageImport() {
  const receipt = command === 'latest' || command === 'from-dev'
    ? latestDevReceipt()
    : (argValue('--receipt') ? JSON.parse(fs.readFileSync(resolvePath(argValue('--receipt'), ''), 'utf8')) : null);
  const sourceRoot = resolvePath(argValue('--source'), repoRoot);
  if (!fs.existsSync(sourceRoot) || !fs.statSync(sourceRoot).isDirectory()) {
    throw new Error(`Source folder not found: ${sourceRoot}`);
  }

  const name = slug(argValue('--name') || receipt?.projectName || receipt?.repoId || path.basename(sourceRoot));
  const out = resolvePath(
    argValue('--out'),
    path.join(repoRoot, '.skyevault-out', 'skyevaultpro-imports', `${name}-${stamp()}`)
  );
  const { files, excluded } = await collectFiles(sourceRoot);
  let bytes = 0;
  for (const file of files) bytes += fs.statSync(file).size;

  const manifest = {
    schema: 'skyevaultpro.local-import.v1',
    createdAt: new Date().toISOString(),
    bridge: 'SkyeVault-Drop to SkyeVault Pro local import',
    source: sourceRoot,
    destination: out,
    fileCount: files.length,
    bytes,
    excludedSecretLikeFiles: excluded.length,
    excluded,
    devVaultReceipt: receipt ? {
      receiptId: receipt.receiptId || '',
      projectName: receipt.projectName || '',
      clientReference: receipt.clientReference || '',
      fileName: receipt.fileName || '',
      sha256: receipt.sha256 || receipt.archive?.sha256 || '',
      recordedAt: receipt.recordedAt || receipt.createdAt || ''
    } : null,
    importSteps: [
      'Open the gated 0S SkyeVault Pro drive.',
      'Open Settings.',
      'Use Disk sync -> Import folder.',
      'Choose this staged folder.',
      'Keep local folder sync as the default recovery path unless the paid hosted backup add-on is active.'
    ]
  };

  if (dryRun) {
    console.log(JSON.stringify({ ok: true, dryRun: true, manifest }, null, 2));
    return manifest;
  }

  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });

  const hashes = [];
  for (const file of files) {
    const rel = relFrom(sourceRoot, file);
    const target = path.join(out, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(file, target);
    hashes.push({ path: rel, bytes: fs.statSync(file).size, sha256: await sha256(file) });
  }

  const finalManifest = { ...manifest, files: hashes };
  fs.writeFileSync(path.join(out, '.skye-vault-manifest.json'), JSON.stringify(finalManifest, null, 2));
  fs.mkdirSync(path.join(repoRoot, '.skyevault-out'), { recursive: true });
  fs.writeFileSync(
    path.join(repoRoot, '.skyevault-out', 'skyevaultpro-local-bridge-latest.json'),
    JSON.stringify(finalManifest, null, 2)
  );
  console.log(JSON.stringify({ ok: true, out, fileCount: files.length, bytes, excludedSecretLikeFiles: excluded.length }, null, 2));
  return finalManifest;
}

if (['stage', 'latest', 'from-dev'].includes(command)) {
  stageImport().catch((error) => {
    console.error(error?.message || String(error));
    process.exit(1);
  });
} else {
  console.error(`Unknown command: ${command}`);
  console.error('Use: node tools/skyevaultpro-local-bridge.mjs stage --source <folder> --out <folder>');
  process.exit(1);
}
