import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const args = new Set(process.argv.slice(2));
const fullSecretScan = args.has('--full-secret-scan');
const GIT_MAX_BUFFER = 64 * 1024 * 1024;

const secretPatterns = [
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

function git(args, fallback = '') {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: GIT_MAX_BUFFER }).trim();
  } catch {
    return fallback;
  }
}

function gitLines(args) {
  const output = git(args);
  return output ? output.split(/\r?\n/).filter(Boolean) : [];
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
  } catch {
    return null;
  }
}

function scanTrackedFiles() {
  const output = execFileSync('git', ['ls-files', '-z'], { cwd: root, maxBuffer: GIT_MAX_BUFFER });
  const files = output.toString('utf8').split('\0').filter(Boolean);
  const findings = [];

  for (const relative of files) {
    const file = path.join(root, relative);
    let stat;
    try {
      stat = fs.statSync(file);
    } catch {
      continue;
    }
    if (!stat.isFile() || stat.size > 2 * 1024 * 1024) continue;

    let text = '';
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    if (text.includes('\u0000')) continue;

    const hits = secretPatterns.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
    if (hits.length) findings.push({ file: relative, hits });
  }

  return findings;
}

function scanRiskyTrackedFiles() {
  const output = execFileSync('git', ['ls-files', '-z'], { cwd: root, maxBuffer: GIT_MAX_BUFFER });
  const files = output.toString('utf8').split('\0').filter(Boolean);
  const riskyName = /(^|\/)(\.env($|\.)|id_rsa|.*credentials.*\.json$|.*service-account.*\.json$|.*\.pem$|.*\.key$|.*\.p12$|.*\.pfx$)/i;
  const allowedTemplate = /(^|\/)\.env(?:\.[^/]*)?\.example$/i;
  const riskyFiles = files.filter((file) => riskyName.test(file) && !allowedTemplate.test(file));
  const findings = [];

  for (const relative of riskyFiles) {
    const file = path.join(root, relative);
    let text = '';
    try {
      const stat = fs.statSync(file);
      if (!stat.isFile() || stat.size > 2 * 1024 * 1024) continue;
      text = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const hits = secretPatterns.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
    findings.push({ file: relative, hits: hits.length ? hits : ['risky-filename'] });
  }

  return findings;
}

function countStatus(statusLines) {
  let modified = 0;
  let untracked = 0;
  let deleted = 0;

  for (const line of statusLines) {
    if (line.startsWith('??')) {
      untracked += 1;
      continue;
    }
    if (line.slice(0, 2).includes('D')) deleted += 1;
    else modified += 1;
  }

  return { modified, untracked, deleted };
}

function receiptCount() {
  const outDir = path.join(root, '.skyevault-out');
  if (!fs.existsSync(outDir)) return 0;
  return fs.readdirSync(outDir).filter((name) => /^skyevault-receipt-.*\.json$/.test(name)).length;
}

const checks = [];
const warnings = [];
let failed = false;

const inside = git(['rev-parse', '--is-inside-work-tree']);
if (inside === 'true') checks.push('Git repository detected');
else {
  failed = true;
  checks.push('Missing Git repository');
}

const branch = git(['branch', '--show-current'], 'unknown');
const origin = git(['remote', 'get-url', 'origin']);
if (origin) checks.push(`Origin remote: ${origin}`);
else {
  failed = true;
  checks.push('Missing origin remote');
}

const upstream = git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);
if (upstream) checks.push(`Branch ${branch} tracks ${upstream}`);
else warnings.push(`Branch ${branch} has no upstream tracking branch`);

if (upstream) {
  const [behind = '0', ahead = '0'] = git(['rev-list', '--left-right', '--count', `${upstream}...HEAD`]).split(/\s+/);
  if (behind !== '0') warnings.push(`Local branch is ${behind} commit(s) behind ${upstream}`);
  if (ahead !== '0') warnings.push(`Local branch is ${ahead} commit(s) ahead of ${upstream}; push when ready`);
}

const statusLines = gitLines(['status', '--porcelain=v1']);
const status = countStatus(statusLines);
if (statusLines.length) {
  warnings.push(`${statusLines.length} working tree change(s): ${status.modified} modified, ${status.deleted} deleted, ${status.untracked} untracked`);
} else {
  checks.push('Working tree is clean');
}

const pkg = readJson('package.json');
if (pkg?.scripts?.['vault:dry-run'] && pkg?.scripts?.['vault:push']) checks.push('SkyeVault scripts are installed');
else warnings.push('SkyeVault scripts are missing from package.json');

if (fs.existsSync(path.join(root, '.gitignore'))) checks.push('.gitignore exists');
else warnings.push('Missing .gitignore');

const findings = fullSecretScan ? scanTrackedFiles() : scanRiskyTrackedFiles();
if (findings.length) {
  failed = true;
  warnings.push(`${findings.length} tracked file(s) matched secret risk checks`);
} else if (fullSecretScan) {
  checks.push('Full tracked-file secret scan passed');
} else {
  checks.push('Fast tracked secret-risk check passed');
}

const receipts = receiptCount();
if (receipts) checks.push(`${receipts} local SkyeVault receipt(s) found`);
else warnings.push('No local SkyeVault receipt JSON found in .skyevault-out');

console.log('Repo health check');
console.log('');
console.log(`Root: ${root}`);
console.log(`Branch: ${branch}`);
console.log('');

for (const check of checks) console.log(`OK  ${check}`);
for (const warning of warnings) console.log(`WARN ${warning}`);

if (findings.length) {
  console.log('');
  console.log('Secret-like tracked files:');
  for (const item of findings.slice(0, 25)) {
    console.log(`FAIL ${item.file} (${item.hits.join(', ')})`);
  }
  if (findings.length > 25) console.log(`FAIL ...and ${findings.length - 25} more`);
}

console.log('');
console.log('Next safe commands:');
console.log('  npm run vault:dry-run');
console.log('  npm run repo:health:full');
console.log('  git status --short --branch');
console.log('  git push origin main');

process.exit(failed ? 1 : 0);
