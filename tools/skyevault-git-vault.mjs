import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const rawArgs = process.argv.slice(2);
const args = new Set(rawArgs);
const dryRun = args.has('--dry-run');
const keepStage = args.has('--keep-stage');
const keepArchive = args.has('--keep-archive');
const force = args.has('--force');
const noOverlay = args.has('--no-overlay');
const deleteMissing = args.has('--delete-missing');
const restoreSymlinks = args.has('--restore-symlinks');
const skipHashCheck = args.has('--skip-hash-check');
const requireSignature = args.has('--require-signature');
const fullOverlay = args.has('--full-overlay') || process.env.SKYEVAULT_GIT_FULL_OVERLAY === '1';
const verifyArchive = argValue('--verify');
const repoName = path.basename(root).replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'repository';
const schema = 'skyevault.git-vault-pack.v1';

const SKIP_DIRS = new Set(['.git', 'node_modules', '.netlify', '.wrangler', '.wrangler-dry-run', '.claude', '.tmp', '.1', 'download-handoffs', 'test-artifacts', 'test-results', 'backups', 'wal_archive', '.staffing-db', '.skyevault-out']);
const SKIP_EXTS = new Set(['.zip', '.tar', '.gz', '.tgz', '.7z', '.rar', '.dump', '.backup', '.bak', '.sqlite', '.sqlite3', '.db', '.pem', '.key', '.p12', '.pfx']);
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

function argValue(name) {
  const prefix = `${name}=`;
  return rawArgs.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || '';
}

function firstCsv(value = '') {
  return String(value || '').split(',').map((item) => item.trim()).filter(Boolean)[0] || '';
}

function firstValidEmail(...values) {
  for (const value of values) {
    for (const candidate of String(value || '').split(',')) {
      const email = candidate.trim().replace(/^['"]|['"]$/g, '').toLowerCase();
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return email;
    }
  }
  return '';
}

function ownerCustodyFields() {
  const ownerEmail = firstValidEmail(
    process.env.SKYEVAULT_OWNER_EMAIL,
    process.env.OWNER_EMAIL,
    process.env.ADMIN_EMAILS,
    process.env.METRAIYUX_0S_SKYGATE_ADMIN_EMAILS,
    process.env.LEGAL_REVIEW_ADMIN_EMAIL,
    process.env.RESEND_FROM_EMAIL,
    process.env.ZOHO_DEFAULT_FROM,
    process.env.SKYEVAULT_CLIENT_EMAIL
  ) || 'owner@metraiyux.local';
  const ownerName = String(process.env.SKYEVAULT_OWNER_NAME || process.env.OWNER_NAME || process.env.GIT_AUTHOR_NAME || '0S Founder Account').trim();
  return {
    ownerEmail,
    ownerName,
    ownerWorkspaceId: String(process.env.SKYEVAULT_OWNER_WORKSPACE_ID || 'metraiyux-0s-owner').trim(),
    ownerWorkspaceSlug: String(process.env.SKYEVAULT_OWNER_WORKSPACE_SLUG || 'metraiyux-0s').trim(),
    ownerSubject: String(process.env.SKYEVAULT_OWNER_SUBJECT || 'metraiyux-owner-admin').trim(),
    ownerAccountId: String(process.env.SKYEVAULT_OWNER_ACCOUNT_ID || 'founder-metraiyux-0s-owner').trim(),
    custodyScope: 'owner-private',
    vaultVisibility: 'owner-only',
    accessPolicy: 'shared-gate-owner-admin-only',
    clientVaultVisible: false,
    clientVaultDownloadAllowed: false
  };
}

function resolveWorkspacePath(value, fallback) {
  const clean = String(value || '').trim();
  if (!clean) return fallback;
  return path.isAbsolute(clean) ? clean : path.resolve(root, clean);
}

function stamp() {
  return new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function gitMaxBufferBytes() {
  const mb = Number(process.env.SKYEVAULT_GIT_MAX_BUFFER_MB || argValue('--git-max-buffer-mb') || 128);
  return (Number.isFinite(mb) && mb > 0 ? mb : 128) * 1024 * 1024;
}

function run(file, commandArgs, options = {}) {
  return execFileSync(file, commandArgs, {
    cwd: options.cwd || root,
    encoding: options.encoding || 'utf8',
    stdio: options.stdio || 'pipe',
    maxBuffer: options.maxBuffer || gitMaxBufferBytes()
  });
}

function git(commandArgs, fallback = '') {
  try {
    return run('git', commandArgs).trim();
  } catch {
    return fallback;
  }
}

function rel(file, base = root) {
  return path.relative(base, file).split(path.sep).join('/');
}

function shouldAlwaysExclude(file) {
  const relativeParts = rel(file).split('/');
  if (relativeParts.some((part) => SKIP_DIRS.has(part))) return true;
  const base = path.basename(file);
  if (/^\.env($|\.)/.test(base)) return true;
  if (/^id_rsa/.test(base)) return true;
  if (/credentials.*\.json$/i.test(base) || /service-account.*\.json$/i.test(base)) return true;
  return SKIP_EXTS.has(path.extname(file).toLowerCase());
}

function walkRepo(dir, visitor) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (shouldAlwaysExclude(file)) continue;
    if (entry.isDirectory()) walkRepo(file, visitor);
    else if (entry.isFile()) visitor(file);
  }
}

function walkTree(dir, visitor) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walkTree(file, visitor);
    else visitor(file, entry);
  }
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

function secretExcludes() {
  const excludes = [];
  let checked = 0;
  let lastProgress = Date.now();
  walkRepo(root, (file) => {
    checked += 1;
    const now = Date.now();
    if (now - lastProgress > 10000) {
      console.log(`Scanned ${checked} candidate files...`);
      lastProgress = now;
    }
    const hits = secretHits(file);
    if (hits.length) excludes.push({ file: rel(file), hits });
  });
  return excludes;
}

function copySanitizedWorkspace(sourceDir, excludes) {
  const excludeFile = path.join(os.tmpdir(), `skyevault-git-excludes-${Date.now()}.txt`);
  fs.writeFileSync(excludeFile, excludes.map((item) => item.file).join('\n'));
  fs.mkdirSync(sourceDir, { recursive: true });
  const rsyncArgs = [
    '-a',
    '--no-group',
    '--delete',
    '--exclude=.git/',
    '--exclude=node_modules',
    '--exclude=node_modules/',
    '--exclude=.netlify/',
    '--exclude=.wrangler/',
    '--exclude=.wrangler-dry-run/',
    '--exclude=.claude/',
    '--exclude=.tmp/',
    '--exclude=.1/',
    '--exclude=download-handoffs/',
    '--exclude=test-artifacts/',
    '--exclude=test-results/',
    '--exclude=backups/',
    '--exclude=wal_archive/',
    '--exclude=.staffing-db/',
    '--exclude=.skyevault-out/',
    '--exclude=.env',
    '--exclude=.env.*',
    '--exclude=.env*',
    '--exclude=*.zip',
    '--exclude=*.tar',
    '--exclude=*.gz',
    '--exclude=*.tgz',
    '--exclude=*.7z',
    '--exclude=*.rar',
    '--exclude=*.dump',
    '--exclude=*.backup',
    '--exclude=*.bak',
    '--exclude=*.sqlite',
    '--exclude=*.sqlite3',
    '--exclude=*.db',
    '--exclude=*.pem',
    '--exclude=*.key',
    '--exclude=*.p12',
    '--exclude=*.pfx',
    '--exclude=id_rsa*',
    '--exclude=*credentials*.json',
    '--exclude=*service-account*.json',
    `--exclude-from=${excludeFile}`,
    './',
    `${sourceDir}/`
  ];
  const result = spawnSync('rsync', rsyncArgs, { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status && result.status !== 24) {
    const error = new Error(`rsync failed with status ${result.status}.`);
    error.status = result.status;
    throw error;
  }
  if (result.status === 24) {
    console.warn('rsync reported vanished files while copying generated output; continuing with the consistent files that were staged.');
  }
}

function gitZeroLines(commandArgs) {
  try {
    const output = execFileSync('git', commandArgs, {
      cwd: root,
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: gitMaxBufferBytes()
    });
    return output.toString('utf8').split('\0').filter(Boolean);
  } catch {
    return [];
  }
}

function statusOverlayPaths() {
  const paths = new Set();
  for (const line of git(['status', '--porcelain=v1', '--untracked-files=all'], '').split(/\r?\n/).filter(Boolean)) {
    const code = line.slice(0, 2);
    const raw = line.slice(3).trim();
    if (!raw || code === 'D ' || code === ' D' || code === 'DD') continue;
    if (raw.includes(' -> ')) {
      const [, after] = raw.split(' -> ');
      if (after) paths.add(after.replace(/^"|"$/g, ''));
    } else {
      paths.add(raw.replace(/^"|"$/g, ''));
    }
  }
  for (const line of gitZeroLines(['ls-files', '-z', '--others', '--exclude-standard'])) {
    if (line) paths.add(line);
  }
  return [...paths].sort((a, b) => a.localeCompare(b));
}

function copyOverlayEntry(relativePath, sourceDir, excludeSet) {
  const clean = String(relativePath || '').replace(/\\/g, '/').replace(/^\.\/+/, '');
  if (!clean || clean.includes('\0')) return;
  const source = path.resolve(root, clean);
  if (!source.startsWith(root + path.sep) && source !== root) return;
  if (!fs.existsSync(source) || shouldAlwaysExclude(source)) return;

  const relative = rel(source);
  if (excludeSet.has(relative)) return;
  const stat = fs.lstatSync(source);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
      copyOverlayEntry(path.join(relative, entry.name), sourceDir, excludeSet);
    }
    return;
  }

  const target = path.join(sourceDir, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (stat.isSymbolicLink()) {
    try { fs.symlinkSync(fs.readlinkSync(source), target); } catch {}
    return;
  }
  if (!stat.isFile()) return;
  fs.copyFileSync(source, target);
  try { fs.chmodSync(target, stat.mode & 0o777); } catch {}
}

function copyDirtyWorkspaceOverlay(sourceDir, excludes) {
  fs.mkdirSync(sourceDir, { recursive: true });
  const excludeSet = new Set(excludes.map((item) => item.file));
  for (const item of statusOverlayPaths()) copyOverlayEntry(item, sourceDir, excludeSet);
}

function copyWorkspaceOverlay(sourceDir, excludes) {
  if (fullOverlay) {
    copySanitizedWorkspace(sourceDir, excludes);
    return 'full-sanitized-worktree';
  }
  copyDirtyWorkspaceOverlay(sourceDir, excludes);
  return 'dirty-sanitized-overlay';
}

function scanStage(sourceDir) {
  const findings = [];
  walkTree(sourceDir, (file, entry) => {
    if (!entry.isFile()) return;
    const hits = secretHits(file);
    if (hits.length) findings.push({ file: rel(file, sourceDir), hits });
  });
  return findings;
}

async function hashFile(file) {
  return await new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(file);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map((item) => stableValue(item));
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
}

function stableJson(value) {
  return JSON.stringify(stableValue(value));
}

function sha256Text(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function hmacText(key, text) {
  return crypto.createHmac('sha256', key).update(text).digest('hex');
}

function safeRemoteUrl(value) {
  return String(value || '')
    .replace(/\/\/([^/@]+)@/g, '//***@')
    .replace(/(x-access-token:|oauth2:|ghp_|github_pat_)[A-Za-z0-9_:-]+/g, '$1***');
}

function gitRemotes() {
  return git(['remote', '-v'])
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\S+)\s+(\S+)\s+\((fetch|push)\)$/);
      return match ? { name: match[1], url: safeRemoteUrl(match[2]), direction: match[3] } : { raw: safeRemoteUrl(line) };
    });
}

function gitRefs() {
  return git(['for-each-ref', '--format=%(refname)%09%(objectname)%09%(committerdate:iso8601)'])
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [name, object, date] = line.split('\t');
      return { name, object, date };
    });
}

function gitLog(limit = 80) {
  return git(['log', `--max-count=${limit}`, '--date=iso-strict', '--format=%H%x09%P%x09%an%x09%ae%x09%aI%x09%s'])
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [hash, parents, authorName, authorEmail, date, ...subjectParts] = line.split('\t');
      return { hash, parents: parents ? parents.split(' ') : [], authorName, authorEmail, date, subject: subjectParts.join('\t') };
    });
}

async function sourceFiles(sourceDir) {
  const files = [];
  let totalBytes = 0;
  const entries = [];
  walkTree(sourceDir, (file, entry) => entries.push({ file, entry }));
  for (const { file, entry } of entries.sort((a, b) => rel(a.file, sourceDir).localeCompare(rel(b.file, sourceDir)))) {
    const stat = fs.lstatSync(file);
    const item = {
      path: rel(file, sourceDir),
      mode: (stat.mode & 0o777).toString(8),
      size: stat.size
    };
    if (entry.isFile()) {
      item.type = 'file';
      item.sha256 = await hashFile(file);
      totalBytes += stat.size;
    } else if (entry.isSymbolicLink()) {
      item.type = 'symlink';
      item.target = fs.readlinkSync(file);
    } else {
      item.type = 'other';
    }
    files.push(item);
  }
  return { files, totalBytes };
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(file, value) {
  fs.writeFileSync(file, value.endsWith('\n') ? value : `${value}\n`);
}

function createBundle(bundlePath) {
  fs.mkdirSync(path.dirname(bundlePath), { recursive: true });
  run('git', ['bundle', 'create', bundlePath, '--all'], { stdio: 'inherit' });
}

function verifyBundle(bundlePath) {
  const result = spawnSync('git', ['bundle', 'verify', bundlePath], { cwd: root, encoding: 'utf8' });
  const output = `${result.stdout || ''}${result.stderr || ''}`;
  if (result.status !== 0) throw new Error(`git bundle verify failed:\n${output}`);
  return output;
}

function buildNeuralMap(manifest) {
  const nodes = [];
  const edges = [];
  const addNode = (id, type, label, data = {}) => nodes.push({ id, type, label, data });
  const addEdge = (from, to, type, data = {}) => edges.push({ from, to, type, data });
  const workspaceId = manifest.account.workspaceId || 'workspace:local';
  const developerId = manifest.account.developerId || 'developer:local';
  addNode(workspaceId, 'workspace', workspaceId);
  addNode(developerId, 'developer', developerId);
  addNode('repo', 'repo', manifest.repo.name, { branch: manifest.git.branch, head: manifest.git.head });
  addEdge(workspaceId, 'repo', 'owns');
  addEdge(developerId, 'repo', 'pushed');
  for (const commit of manifest.git.recentCommits.slice(0, 40)) {
    const commitId = `commit:${commit.hash}`;
    addNode(commitId, 'commit', commit.subject || commit.hash.slice(0, 12), { hash: commit.hash, date: commit.date, authorName: commit.authorName });
    addEdge('repo', commitId, 'contains');
    for (const parent of commit.parents || []) addEdge(commitId, `commit:${parent}`, 'parent');
  }
  for (const line of manifest.git.statusShort.slice(0, 80)) {
    const file = line.slice(3).trim();
    if (!file) continue;
    const fileId = `file:${file}`;
    addNode(fileId, 'file', file, { status: line.slice(0, 2) });
    addEdge('repo', fileId, 'dirty-file');
  }
  return {
    schema: 'skyevault.neural-map.v1',
    generatedAt: manifest.generatedAt,
    scope: { workspaceId, developerId, repo: manifest.repo.name },
    nodes,
    edges
  };
}

function restoreReadme(manifest) {
  return `# SkyeVault Git Vault Pack

This pack is meant to restore a developer repo as a clone-capable workspace.

Contents:

- \`git/repository.bundle\`: Git history, branches, tags, and remote-tracking refs captured by \`git bundle create --all\`.
- \`source/\`: Sanitized overlay. By default this includes safe dirty and untracked files; the Git bundle supplies committed tracked files. Packs created with \`--full-overlay\` include a full sanitized worktree overlay.
- \`manifest.json\`: Hashes, refs, status, source file manifest, bundle fingerprint, and excluded secret-looking files.
- \`neural-map.json\`: Workspace/developer/repo/commit/file graph seed for the account brain map.
- \`SECRET_BOUNDARY.md\`: Local-only file/folder contract for secrets, databases, generated state, and anything intentionally left out.

Fast restore with the repo tool:

\`\`\`bash
npm run vault:git:restore -- --restore=/path/to/${manifest.pack.archiveName} --to=/path/to/restored-repo
\`\`\`

Manual full-clone restore:

\`\`\`bash
git clone git/repository.bundle restored-repo
rsync -a --exclude=.git/ source/ restored-repo/
cd restored-repo
git status --short
\`\`\`

Use \`--delete-missing\` with the restore command only when the restored workspace should mirror the sanitized source overlay exactly. Without it, the clone keeps tracked files from the Git bundle even when those files were intentionally excluded from \`source/\`.

Symlinks from \`source/\` are skipped by default during restore so an overlay cannot replace a real cloned directory with a link. Use \`--restore-symlinks\` only when the workspace intentionally relies on symlink state.

Push back to a normal Git remote:

\`\`\`bash
cd restored-repo
git remote set-url origin <repo-url>
git push --all origin
git push --tags origin
\`\`\`

Safety boundary: files excluded as envs, private keys, dumps, archives, dependencies, generated artifacts, or secret-looking text are listed in \`manifest.json\` and are not restored from \`source/\`.
Read \`SECRET_BOUNDARY.md\` before deleting the original workspace. It tells the dev what must come from a secret manager or a separate private local-only package.
`;
}

function secretBoundaryReadme(manifest) {
  const excluded = manifest.security.excludedSecretLikeFiles || [];
  const ruleDirs = manifest.security.excludedRules?.directories || [];
  const ruleExts = manifest.security.excludedRules?.extensions || [];
  const lines = [
    '# SkyeVault Secret Boundary',
    '',
    'This file documents what SkyeVault intentionally did not place in `source/`.',
    '',
    'It is a recovery checklist, not a secret dump. It never includes secret values.',
    '',
    '## Restore Rule',
    '',
    '1. Restore the Git bundle and sanitized `source/` overlay first.',
    '2. Rehydrate local-only files from a secret manager, password vault, private client package, or local backup.',
    '3. Do not commit the local-only package back into Git or the public vault archive.',
    '',
    '## Secret-Looking Files Excluded By Scanner',
    ''
  ];
  if (excluded.length) {
    for (const item of excluded) {
      lines.push(`- \`${item.file}\` (${(item.hits || []).join(', ') || 'secret-like'})`);
    }
  } else {
    lines.push('- None detected by the text scanner.');
  }
  lines.push(
    '',
    '## Always-Excluded Local State',
    '',
    'These names/patterns are kept out of the sanitized overlay by policy. Some are regeneratable, some are local recovery material.',
    '',
    `- Directories: ${ruleDirs.map((item) => `\`${item}\``).join(', ') || 'none'}`,
    `- Extensions: ${ruleExts.map((item) => `\`${item}\``).join(', ') || 'none'}`,
    '- `.env`, `.env.*`, `.env*`',
    '- private keys, service-account JSON, credential JSON, archives, database files, dumps, and backup files',
    '',
    '## Private Local-Only Package Guidance',
    '',
    'If a team needs a separate private package, build it from the original workspace using the paths above plus any client-specific secret manager exports. Keep that package encrypted and access-controlled.',
    '',
    'Suggested handoff naming:',
    '',
    '```text',
    `${manifest.repo.name}-local-only-secrets-and-state-YYYYMMDDTHHMMSSZ.encrypted.zip`,
    '```',
    '',
    'Before deleting the original workspace, confirm every path in the scanner list is either intentionally disposable or recoverable from a private secret source.'
  );
  return `${lines.join('\n')}\n`;
}

async function buildIntegrity(packDir, manifest) {
  const manifestPath = path.join(packDir, 'manifest.json');
  const neuralPath = path.join(packDir, 'neural-map.json');
  const restorePath = path.join(packDir, 'RESTORE.md');
  const statusPath = path.join(packDir, 'status.txt');
  const refsPath = path.join(packDir, 'refs.txt');
  const payload = {
    schema: 'skyevault.pack-integrity.v1',
    generatedAt: new Date().toISOString(),
    packId: manifest.pack.id,
    manifest: {
      path: 'manifest.json',
      sha256: await hashFile(manifestPath)
    },
    gitBundle: {
      path: manifest.git.bundle.path,
      bytes: manifest.git.bundle.bytes,
      sha256: manifest.git.bundle.sha256
    },
    sourceManifest: {
      path: manifest.source.path,
      entryCount: manifest.source.entryCount,
      fileCount: manifest.source.fileCount,
      totalBytes: manifest.source.totalBytes,
      sha256: sha256Text(stableJson(manifest.source.files))
    },
    neuralMap: {
      path: 'neural-map.json',
      sha256: await hashFile(neuralPath)
    },
    restoreReadme: {
      path: 'RESTORE.md',
      sha256: await hashFile(restorePath)
    },
    secretBoundary: {
      path: 'SECRET_BOUNDARY.md',
      sha256: await hashFile(path.join(packDir, 'SECRET_BOUNDARY.md'))
    },
    status: {
      path: 'status.txt',
      sha256: await hashFile(statusPath)
    },
    refs: {
      path: 'refs.txt',
      sha256: await hashFile(refsPath)
    }
  };
  const signingKey = String(process.env.SKYEVAULT_PACK_SIGNING_KEY || '').trim();
  if (signingKey) {
    payload.signature = {
      algorithm: 'HMAC-SHA256',
      keyId: String(process.env.SKYEVAULT_PACK_SIGNING_KEY_ID || 'env:SKYEVAULT_PACK_SIGNING_KEY').trim(),
      value: hmacText(signingKey, stableJson(payload))
    };
  }
  return payload;
}

async function verifyIntegrity(packDir, manifest, integrity) {
  if (!integrity) {
    if (requireSignature) throw new Error('Pack is missing integrity.json and --require-signature was set.');
    console.warn('Pack is missing integrity.json; falling back to manifest file hash verification only.');
    return { ok: true, signature: 'missing' };
  }
  if (integrity.schema !== 'skyevault.pack-integrity.v1') throw new Error(`Unsupported integrity schema: ${integrity.schema}`);
  const manifestHash = await hashFile(path.join(packDir, integrity.manifest.path));
  if (manifestHash !== integrity.manifest.sha256) throw new Error(`Manifest SHA mismatch: ${manifestHash} !== ${integrity.manifest.sha256}`);
  const sourceHash = sha256Text(stableJson(manifest.source.files));
  if (sourceHash !== integrity.sourceManifest.sha256) throw new Error(`Source manifest SHA mismatch: ${sourceHash} !== ${integrity.sourceManifest.sha256}`);
  for (const item of [integrity.gitBundle, integrity.neuralMap, integrity.restoreReadme, integrity.secretBoundary, integrity.status, integrity.refs].filter(Boolean)) {
    const file = path.join(packDir, item.path);
    if (!fs.existsSync(file)) throw new Error(`Integrity file missing: ${item.path}`);
    const hash = await hashFile(file);
    if (hash !== item.sha256) throw new Error(`Integrity SHA mismatch for ${item.path}: ${hash} !== ${item.sha256}`);
  }
  if (!integrity.signature) {
    if (requireSignature) throw new Error('Pack integrity has no signature and --require-signature was set.');
    return { ok: true, signature: 'unsigned' };
  }
  const signingKey = String(process.env.SKYEVAULT_PACK_SIGNING_KEY || '').trim();
  if (!signingKey) {
    if (requireSignature) throw new Error('Pack is signed, but SKYEVAULT_PACK_SIGNING_KEY is missing and --require-signature was set.');
    return { ok: true, signature: 'not-checked' };
  }
  const unsigned = { ...integrity };
  delete unsigned.signature;
  const expected = hmacText(signingKey, stableJson(unsigned));
  if (expected !== integrity.signature.value) throw new Error('Pack signature verification failed.');
  return { ok: true, signature: 'verified', keyId: integrity.signature.keyId };
}

async function createPack() {
  const now = stamp();
  const scratchRoot = resolveWorkspacePath(argValue('--scratch-dir'), path.join(os.tmpdir(), 'skyevault-git-vault'));
  const stageParent = resolveWorkspacePath(argValue('--stage-parent') || process.env.SKYEVAULT_GIT_STAGE_PARENT, scratchRoot);
  const archiveDir = resolveWorkspacePath(argValue('--archive-dir') || process.env.SKYEVAULT_GIT_ARCHIVE_DIR, path.join(scratchRoot, 'archives'));
  const packDir = path.join(stageParent, `${repoName}-git-vault-${now}`);
  const sourceDir = path.join(packDir, 'source');
  const bundlePath = path.join(packDir, 'git', 'repository.bundle');
  const archivePath = path.join(archiveDir, `${repoName}-git-vault-${now}.zip`);
  fs.rmSync(packDir, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(bundlePath), { recursive: true });
  fs.mkdirSync(archiveDir, { recursive: true });

  console.log('Creating Git bundle...');
  createBundle(bundlePath);
  const bundleVerify = verifyBundle(bundlePath);
  writeText(path.join(packDir, 'git', 'bundle.verify.txt'), bundleVerify);

  console.log('Scanning repo for secret-looking workspace files...');
  const excludes = secretExcludes();
  for (const item of excludes.slice(0, 80)) console.log(`Excluding ${item.file} (${item.hits.join(', ')})`);
  if (excludes.length > 80) console.log(`...and ${excludes.length - 80} more excluded files`);

  console.log(`Building sanitized ${fullOverlay ? 'full worktree' : 'dirty'} overlay...`);
  const overlayMode = copyWorkspaceOverlay(sourceDir, excludes);
  const stageFindings = scanStage(sourceDir);
  if (stageFindings.length) {
    console.error('Sanitized source scan failed:');
    for (const item of stageFindings.slice(0, 80)) console.error(`${item.file}: ${item.hits.join(', ')}`);
    process.exit(3);
  }

  const source = await sourceFiles(sourceDir);
  const branch = git(['branch', '--show-current'], 'HEAD');
  const head = git(['rev-parse', 'HEAD'], 'unknown');
  const shortHead = git(['rev-parse', '--short', 'HEAD'], 'unknown');
  const statusShort = git(['status', '--short'], '').split(/\r?\n/).filter(Boolean);
  const ownerCustody = ownerCustodyFields();
  const account = {
    workspaceId: String(process.env.SKYEVAULT_WORKSPACE_ID || process.env.SKYEVAULT_DEV_WORKSPACE_ID || ownerCustody.ownerWorkspaceId).trim(),
    developerId: String(process.env.SKYEVAULT_DEVELOPER_ID || ownerCustody.ownerSubject).trim(),
    developerName: String(process.env.SKYEVAULT_DEVELOPER_NAME || ownerCustody.ownerName).trim(),
    custodyScope: ownerCustody.custodyScope,
    vaultVisibility: ownerCustody.vaultVisibility,
    ownerAccountId: ownerCustody.ownerAccountId,
    ownerSubject: ownerCustody.ownerSubject,
    ownerEmail: ownerCustody.ownerEmail,
    ownerWorkspaceId: ownerCustody.ownerWorkspaceId,
    ownerWorkspaceSlug: ownerCustody.ownerWorkspaceSlug,
    accessPolicy: ownerCustody.accessPolicy,
    clientVaultVisible: ownerCustody.clientVaultVisible,
    clientVaultDownloadAllowed: ownerCustody.clientVaultDownloadAllowed
  };
  const manifest = {
    schema,
    generatedAt: new Date().toISOString(),
    repo: {
      name: repoName,
      root,
      remotes: gitRemotes()
    },
    account,
    git: {
      branch,
      head,
      shortHead,
      upstream: git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], ''),
      statusShort,
      dirtyCount: statusShort.length,
      refs: gitRefs(),
      recentCommits: gitLog(80),
      bundle: {
        path: 'git/repository.bundle',
        bytes: fs.statSync(bundlePath).size,
        sha256: await hashFile(bundlePath),
        verify: bundleVerify.trim().split(/\r?\n/)
      }
    },
    source: {
      path: 'source/',
      overlayMode,
      fileCount: source.files.filter((item) => item.type === 'file').length,
      entryCount: source.files.length,
      totalBytes: source.totalBytes,
      files: source.files
    },
    security: {
      excludedSecretLikeFiles: excludes,
      excludedRules: {
        directories: [...SKIP_DIRS].sort(),
        extensions: [...SKIP_EXTS].sort(),
        envFiles: true,
        privateKeys: true,
        credentialsJson: true
      }
    },
    restore: {
      defaultMode: 'clone bundle, then overlay sanitized source tree',
      secretsBoundary: 'Secret-looking and explicitly excluded files are not present in source/. Restore them from the client secret manager or a separate private local-only package, not from the vault pack.',
      secretBoundaryDocument: 'SECRET_BOUNDARY.md'
    },
    integrity: {
      path: 'integrity.json',
      signature: 'Optional HMAC-SHA256 when SKYEVAULT_PACK_SIGNING_KEY is set at pack creation time.'
    },
    pack: {
      id: `git-vault:${repoName}:${branch}:${shortHead}:${now}`,
      archiveName: path.basename(archivePath),
      archivePath,
      archiveFingerprintNote: 'Archive SHA-256 is emitted after zip creation and recorded by the vault receipt; it is not embedded in manifest.json because embedding it would change the archive.'
    }
  };
  writeJson(path.join(packDir, 'manifest.json'), manifest);
  writeJson(path.join(packDir, 'neural-map.json'), buildNeuralMap(manifest));
  writeText(path.join(packDir, 'status.txt'), git(['status', '--short', '--branch'], ''));
  writeText(path.join(packDir, 'refs.txt'), manifest.git.refs.map((ref) => `${ref.name}\t${ref.object}\t${ref.date}`).join('\n'));
  writeText(path.join(packDir, 'SECRET_BOUNDARY.md'), secretBoundaryReadme(manifest));
  writeText(path.join(packDir, 'RESTORE.md'), restoreReadme(manifest));
  writeJson(path.join(packDir, 'integrity.json'), await buildIntegrity(packDir, manifest));

  console.log('Creating Git vault pack archive...');
  run('zip', ['-qr', archivePath, '.'], { cwd: packDir, stdio: 'inherit' });
  const archiveInfo = {
    bytes: fs.statSync(archivePath).size,
    sha256: await hashFile(archivePath)
  };

  console.log(`Archive: ${archivePath}`);
  console.log(`Archive bytes: ${archiveInfo.bytes}`);
  console.log(`Archive SHA-256: ${archiveInfo.sha256}`);
  console.log(`Bundle bytes: ${manifest.git.bundle.bytes}`);
  console.log(`Source files: ${manifest.source.fileCount}`);
  console.log(`Secret-looking files excluded: ${excludes.length}`);

  return { packDir, archivePath, manifest, archiveInfo };
}

async function verifyPackFiles(packDir, manifest) {
  const bundlePath = path.join(packDir, manifest.git.bundle.path);
  const bundleHash = await hashFile(bundlePath);
  if (bundleHash !== manifest.git.bundle.sha256) throw new Error(`Bundle SHA mismatch: ${bundleHash} !== ${manifest.git.bundle.sha256}`);
  for (const item of manifest.source.files) {
    if (item.type !== 'file') continue;
    const file = path.join(packDir, manifest.source.path, item.path);
    if (!fs.existsSync(file)) throw new Error(`Source file missing from pack: ${item.path}`);
    const hash = await hashFile(file);
    if (hash !== item.sha256) throw new Error(`Source file SHA mismatch: ${item.path}`);
  }
}

function extractArchive(archive, label = 'restore') {
  const packRoot = path.join(os.tmpdir(), `skyevault-git-${label}-${stamp()}`);
  fs.mkdirSync(packRoot, { recursive: true });
  console.log(`Extracting pack to ${packRoot}`);
  run('unzip', ['-q', archive, '-d', packRoot], { cwd: root, stdio: 'inherit' });
  return packRoot;
}

function readPackMetadata(packDir) {
  const manifestPath = path.join(packDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) throw new Error('Pack is missing manifest.json.');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest.schema !== schema) throw new Error(`Unsupported pack schema: ${manifest.schema}`);
  const integrityPath = path.join(packDir, manifest.integrity?.path || 'integrity.json');
  const integrity = fs.existsSync(integrityPath) ? JSON.parse(fs.readFileSync(integrityPath, 'utf8')) : null;
  return { manifest, integrity };
}

async function verifyLoadedPack(packDir, manifest, integrity) {
  const integrityReport = await verifyIntegrity(packDir, manifest, integrity);
  await verifyPackFiles(packDir, manifest);
  const bundlePath = path.join(packDir, manifest.git.bundle.path);
  console.log('Verifying Git bundle...');
  const verifyOutput = verifyBundle(bundlePath);
  writeText(path.join(packDir, 'verify-bundle.verify.txt'), verifyOutput);
  return { integrityReport, bundleVerify: verifyOutput };
}

async function verifyPackArchive() {
  const archive = resolveWorkspacePath(verifyArchive, '');
  if (!archive || !fs.existsSync(archive)) throw new Error(`Use --verify=/path/to/git-vault.zip. Not found: ${archive}`);
  const packDir = extractArchive(archive, 'verify');
  const { manifest, integrity } = readPackMetadata(packDir);
  const verification = skipHashCheck ? null : await verifyLoadedPack(packDir, manifest, integrity);
  const report = {
    schema: 'skyevault.git-vault-verify-report.v1',
    verifiedAt: new Date().toISOString(),
    archive,
    archiveSha256: await hashFile(archive),
    packId: manifest.pack.id,
    repo: manifest.repo.name,
    branch: manifest.git.branch,
    head: manifest.git.head,
    sourceFileCount: manifest.source.fileCount,
    excludedSecretLikeFiles: manifest.security.excludedSecretLikeFiles.length,
    integrity: {
      state: integrity ? 'present' : 'missing',
      signature: verification?.integrityReport?.signature || (skipHashCheck ? 'not-checked' : 'missing'),
      keyId: verification?.integrityReport?.keyId
    }
  };
  console.log(JSON.stringify(report, null, 2));
}

async function restorePack() {
  const archive = resolveWorkspacePath(argValue('--restore'), '');
  if (!archive || !fs.existsSync(archive)) throw new Error(`Use --restore=/path/to/git-vault.zip. Not found: ${archive}`);
  const target = resolveWorkspacePath(argValue('--to'), '');
  if (!target) throw new Error('Use --to=/path/to/restored-repo.');
  const restoreRoot = extractArchive(archive, 'restore');
  const { manifest, integrity } = readPackMetadata(restoreRoot);
  const verification = skipHashCheck ? null : await verifyLoadedPack(restoreRoot, manifest, integrity);
  const bundlePath = path.join(restoreRoot, manifest.git.bundle.path);
  if (fs.existsSync(target) && fs.readdirSync(target).length) {
    if (!force) throw new Error(`Restore target is not empty: ${target}. Re-run with --force to replace it.`);
    fs.rmSync(target, { recursive: true, force: true });
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  console.log(`Cloning bundle into ${target}`);
  run('git', ['clone', bundlePath, target], { cwd: root, stdio: 'inherit' });
  if (manifest.git.branch && manifest.git.branch !== 'HEAD') {
    try {
      run('git', ['checkout', manifest.git.branch], { cwd: target, stdio: 'inherit' });
    } catch {
      console.warn(`Could not checkout ${manifest.git.branch}; leaving clone default checkout.`);
    }
  }
  if (!noOverlay) {
    console.log('Overlaying sanitized working tree snapshot...');
    const rsyncArgs = ['-a'];
    if (!restoreSymlinks) rsyncArgs.push('--no-links');
    if (deleteMissing) rsyncArgs.push('--delete');
    rsyncArgs.push('--exclude=.git/', `${path.join(restoreRoot, manifest.source.path)}/`, `${target}/`);
    run('rsync', rsyncArgs, { cwd: root, stdio: 'inherit' });
  }
  const restoreReport = {
    restoredAt: new Date().toISOString(),
    archive,
    target,
    schema: manifest.schema,
    repo: manifest.repo.name,
    branch: manifest.git.branch,
    head: manifest.git.head,
    overlayApplied: !noOverlay,
    deleteMissing,
    restoreSymlinks,
    packId: manifest.pack.id,
    integrity: {
      state: integrity ? 'present' : 'missing',
      signature: verification?.integrityReport?.signature || (skipHashCheck ? 'not-checked' : 'missing'),
      keyId: verification?.integrityReport?.keyId
    },
    sourceFileCount: manifest.source.fileCount,
    excludedSecretLikeFiles: manifest.security.excludedSecretLikeFiles.length,
    statusAfterRestore: git(['-C', target, 'status', '--short'], '').split(/\r?\n/).filter(Boolean)
  };
  writeJson(path.join(target, '.skyevault-restore-report.json'), restoreReport);
  console.log(JSON.stringify(restoreReport, null, 2));
}

if (verifyArchive) {
  await verifyPackArchive();
  process.exit(0);
}

if (argValue('--restore')) {
  await restorePack();
  process.exit(0);
}

const { packDir, archivePath, manifest } = await createPack();
if (dryRun) {
  console.log('Dry run complete. Upload skipped.');
} else {
  console.log('Uploading Git vault pack through SkyeVault...');
  const result = spawnSync(process.execPath, [
    path.join(root, 'tools/skyevault-repo-push.mjs'),
    `--upload-archive=${archivePath}`,
    `--file-count=${manifest.source.fileCount}`,
    `--secret-excludes=${manifest.security.excludedSecretLikeFiles.length}`,
    '--asset-type=Git vault restore pack',
    `--project-name=${repoName} Git vault restore pack`,
    `--client-reference=git-vault:${manifest.git.branch}@${manifest.git.shortHead}`,
    `--client-name=${manifest.account.developerName}`,
    `--client-email=${manifest.account.ownerEmail}`,
    `--workspace-id=${manifest.account.workspaceId}`,
    `--developer-id=${manifest.account.developerId}`,
    `--developer-name=${manifest.account.developerName}`,
    `--notes=Git bundle plus sanitized working tree overlay. Bundle restores clone/history; source overlay restores safe dirty workspace state. Excluded ${manifest.security.excludedSecretLikeFiles.length} secret-looking files.`
  ], { cwd: root, encoding: 'utf8', stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}

if (!keepStage) fs.rmSync(packDir, { recursive: true, force: true });
if (!keepArchive) fs.rmSync(archivePath, { force: true });
