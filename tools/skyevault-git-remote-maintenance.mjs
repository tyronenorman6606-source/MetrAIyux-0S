import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const rawArgs = process.argv.slice(2);
const command = rawArgs.find((arg) => !arg.startsWith('--')) || 'inventory';

function argValue(name) {
  const prefix = `${name}=`;
  return rawArgs.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || '';
}

function resolvePath(value, fallback) {
  const clean = String(value || '').trim();
  if (!clean) return fallback;
  return path.isAbsolute(clean) ? clean : path.resolve(root, clean);
}

function git(args, options = {}) {
  return execFileSync('git', args, { cwd: options.cwd || root, encoding: 'utf8', stdio: options.stdio || 'pipe' }).trim();
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

function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function sanitizePart(value) {
  return String(value || '')
    .trim()
    .replace(/\.git$/, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function bytesHuman(value) {
  const size = Number(value || 0);
  if (!size) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  return `${(size / 1024 ** index).toFixed(index ? 2 : 0)} ${units[index]}`;
}

function repoDiskBytes(repoPath) {
  if (!fs.existsSync(repoPath)) return 0;
  let total = 0;
  const visit = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      const stat = fs.lstatSync(file);
      if (entry.isDirectory()) visit(file);
      else total += stat.size;
    }
  };
  visit(repoPath);
  return total;
}

function repoObjectCount(repoPath) {
  const output = git(['count-objects', '-v'], { cwd: repoPath });
  const values = Object.fromEntries(output.split(/\r?\n/).map((line) => line.split(/:\s+/)).filter((parts) => parts.length === 2));
  return Number(values.count || 0) + Number(values['in-pack'] || 0);
}

function refsForRepo(repoPath) {
  const output = git(['for-each-ref', '--format=%(refname)%09%(objectname)%09%(committerdate:iso8601)%09%(subject)'], { cwd: repoPath });
  return output.split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [ref, object, date, ...subject] = line.split('\t');
      return { ref, object, date, subject: subject.join('\t') };
    });
}

function listRepos(repoRoot) {
  if (!fs.existsSync(repoRoot)) return [];
  const repos = [];
  const visit = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name.endsWith('.git')) {
        const relative = path.relative(repoRoot, file).split(path.sep).join('/');
        const workspaceId = sanitizePart(relative.split('/').slice(0, -1).join('-') || 'default');
        const repoId = sanitizePart(entry.name.replace(/\.git$/, ''));
        repos.push({ id: `${workspaceId}/${repoId}`, workspaceId, repoId, path: file });
      } else if (entry.isDirectory()) {
        visit(file);
      }
    }
  };
  visit(repoRoot);
  return repos.sort((a, b) => a.id.localeCompare(b.id));
}

function manifestPath(snapshotRoot, snapshotId) {
  return path.join(snapshotRoot, 'manifests', `${sanitizePart(snapshotId)}.json`);
}

function readSnapshotManifest(snapshotRoot, snapshotId) {
  const id = String(snapshotId || 'latest');
  if (id === 'latest') return readJson(path.join(snapshotRoot, 'latest.json'), null);
  return readJson(manifestPath(snapshotRoot, id), null) || readJson(path.resolve(id), null);
}

async function createSnapshot({ storageRoot, snapshotRoot, mirrorRoot }) {
  const repoRoot = path.join(storageRoot, 'repos');
  const snapshotId = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const repos = [];
  for (const repo of listRepos(repoRoot)) {
    const refs = refsForRepo(repo.path);
    if (!refs.length) {
      repos.push({
        ...repo,
        empty: true,
        bundlePath: null,
        bundleFile: null,
        bytes: 0,
        human: '0 B',
        sha256: null,
        refs,
        objectCount: repoObjectCount(repo.path),
        diskBytes: repoDiskBytes(repo.path),
        verify: ['Empty bare repository; no bundle generated.']
      });
      continue;
    }
    const bundleDir = path.join(snapshotRoot, 'bundles', snapshotId, repo.workspaceId, repo.repoId);
    fs.mkdirSync(bundleDir, { recursive: true });
    const bundlePath = path.join(bundleDir, `${repo.repoId}.bundle`);
    git(['bundle', 'create', bundlePath, '--all'], { cwd: repo.path });
    const verify = git(['bundle', 'verify', bundlePath], { cwd: repo.path });
    const stat = fs.statSync(bundlePath);
    repos.push({
      ...repo,
      bundlePath,
      bundleFile: path.relative(snapshotRoot, bundlePath).split(path.sep).join('/'),
      bytes: stat.size,
      human: bytesHuman(stat.size),
      sha256: await hashFile(bundlePath),
      refs,
      objectCount: repoObjectCount(repo.path),
      diskBytes: repoDiskBytes(repo.path),
      verify: verify.split(/\r?\n/).filter(Boolean)
    });
  }
  const manifest = {
    schema: 'skyevault.git-remote-snapshot.v1',
    snapshotId,
    createdAt: new Date().toISOString(),
    storageRoot,
    repoCount: repos.length,
    totalBundleBytes: repos.reduce((sum, repo) => sum + repo.bytes, 0),
    totalBundleHuman: bytesHuman(repos.reduce((sum, repo) => sum + repo.bytes, 0)),
    repos
  };
  writeJson(manifestPath(snapshotRoot, snapshotId), manifest);
  writeJson(path.join(snapshotRoot, 'latest.json'), manifest);
  if (mirrorRoot) {
    const targetRoot = path.join(mirrorRoot, snapshotId);
    for (const repo of repos) {
      if (!repo.bundlePath) continue;
      const target = path.join(targetRoot, repo.bundleFile);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(repo.bundlePath, target);
    }
    writeJson(path.join(targetRoot, 'manifest.json'), manifest);
  }
  return manifest;
}

async function verifySnapshot(snapshotRoot, snapshotId) {
  const manifest = readSnapshotManifest(snapshotRoot, snapshotId);
  if (!manifest) throw new Error(`Snapshot manifest not found: ${snapshotId}`);
  const checks = [];
  for (const repo of manifest.repos || []) {
    if (repo.empty && !repo.bundlePath) {
      checks.push({ workspaceId: repo.workspaceId, repoId: repo.repoId, empty: true, exists: true, sha256Ok: true, bundleOk: true, verify: repo.verify || [] });
      continue;
    }
    const exists = fs.existsSync(repo.bundlePath);
    const sha256 = exists ? await hashFile(repo.bundlePath) : null;
    let bundleOk = false;
    let verify = [];
    if (exists) {
      try {
        verify = git(['bundle', 'verify', repo.bundlePath]).split(/\r?\n/).filter(Boolean);
        bundleOk = true;
      } catch (error) {
        verify = [error.message];
      }
    }
    checks.push({ workspaceId: repo.workspaceId, repoId: repo.repoId, exists, sha256Ok: sha256 === repo.sha256, bundleOk, verify });
  }
  return {
    schema: 'skyevault.git-remote-snapshot-verify.v1',
    snapshotId: manifest.snapshotId,
    verifiedAt: new Date().toISOString(),
    ok: checks.every((check) => check.exists && check.sha256Ok && check.bundleOk),
    checks
  };
}

function restoreSnapshot({ snapshotRoot, snapshotId, storageRoot, repoFilter }) {
  const manifest = readSnapshotManifest(snapshotRoot, snapshotId);
  if (!manifest) throw new Error(`Snapshot manifest not found: ${snapshotId}`);
  const targetRepoRoot = path.join(storageRoot, 'repos');
  const restored = [];
  for (const repo of manifest.repos || []) {
    if (!repo.bundlePath) continue;
    const repoKey = `${repo.workspaceId}/${repo.repoId}`;
    if (repoFilter && repoFilter !== repoKey) continue;
    const target = path.join(targetRepoRoot, repo.workspaceId, `${repo.repoId}.git`);
    if (fs.existsSync(target)) {
      git(['fetch', repo.bundlePath, '+refs/*:refs/*'], { cwd: target });
    } else {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      git(['clone', '--bare', repo.bundlePath, target]);
    }
    git(['config', 'http.receivepack', 'true'], { cwd: target });
    git(['config', 'http.uploadpack', 'true'], { cwd: target });
    git(['config', 'skyevault.workspace', repo.workspaceId], { cwd: target });
    git(['config', 'skyevault.repo', repo.repoId], { cwd: target });
    restored.push({ repo: repoKey, target });
  }
  return { schema: 'skyevault.git-remote-restore.v1', restoredAt: new Date().toISOString(), snapshotId: manifest.snapshotId, restored };
}

function diffSnapshots(snapshotRoot, leftId, rightId) {
  const left = readSnapshotManifest(snapshotRoot, leftId);
  const right = readSnapshotManifest(snapshotRoot, rightId);
  if (!left || !right) throw new Error('Both snapshot manifests are required for diff.');
  const byRepo = (manifest) => new Map((manifest.repos || []).map((repo) => [`${repo.workspaceId}/${repo.repoId}`, repo]));
  const leftRepos = byRepo(left);
  const rightRepos = byRepo(right);
  const keys = [...new Set([...leftRepos.keys(), ...rightRepos.keys()])].sort();
  const repos = keys.map((key) => {
    const a = leftRepos.get(key);
    const b = rightRepos.get(key);
    if (!a) return { repo: key, change: 'added', rightHead: b.refs.find((ref) => ref.ref === 'refs/heads/main')?.object || null };
    if (!b) return { repo: key, change: 'removed', leftHead: a.refs.find((ref) => ref.ref === 'refs/heads/main')?.object || null };
    const leftRefs = Object.fromEntries(a.refs.map((ref) => [ref.ref, ref.object]));
    const rightRefs = Object.fromEntries(b.refs.map((ref) => [ref.ref, ref.object]));
    const changedRefs = [...new Set([...Object.keys(leftRefs), ...Object.keys(rightRefs)])]
      .filter((ref) => leftRefs[ref] !== rightRefs[ref])
      .map((ref) => ({ ref, before: leftRefs[ref] || null, after: rightRefs[ref] || null }));
    return { repo: key, change: changedRefs.length ? 'changed' : 'same', changedRefs, bytesDelta: Number(b.bytes || 0) - Number(a.bytes || 0), objectDelta: Number(b.objectCount || 0) - Number(a.objectCount || 0) };
  });
  return { schema: 'skyevault.git-remote-snapshot-diff.v1', left: left.snapshotId, right: right.snapshotId, repos };
}

const storageRoot = resolvePath(argValue('--storage-root') || process.env.SKYEVAULT_GIT_REMOTE_ROOT, path.join(os.tmpdir(), 'skyevault-git-remote'));
const snapshotRoot = resolvePath(argValue('--snapshot-root') || process.env.SKYEVAULT_SNAPSHOT_ROOT, path.join(storageRoot, 'snapshots'));
const mirrorRoot = resolvePath(argValue('--mirror-root') || process.env.SKYEVAULT_SNAPSHOT_MIRROR_ROOT, '');

let result;
if (command === 'inventory') {
  const repos = listRepos(path.join(storageRoot, 'repos')).map((repo) => ({ ...repo, refs: refsForRepo(repo.path), objectCount: repoObjectCount(repo.path), diskBytes: repoDiskBytes(repo.path), diskHuman: bytesHuman(repoDiskBytes(repo.path)) }));
  result = { schema: 'skyevault.git-remote-inventory.v1', storageRoot, repoCount: repos.length, repos };
} else if (command === 'snapshot') {
  result = await createSnapshot({ storageRoot, snapshotRoot, mirrorRoot });
} else if (command === 'verify') {
  result = await verifySnapshot(snapshotRoot, argValue('--snapshot') || 'latest');
} else if (command === 'restore') {
  const targetStorageRoot = resolvePath(argValue('--target-storage-root'), storageRoot);
  result = restoreSnapshot({ snapshotRoot, snapshotId: argValue('--snapshot') || 'latest', storageRoot: targetStorageRoot, repoFilter: argValue('--repo') });
} else if (command === 'diff') {
  result = diffSnapshots(snapshotRoot, argValue('--left'), argValue('--right'));
} else {
  throw new Error(`Unknown maintenance command: ${command}`);
}

console.log(JSON.stringify(result, null, 2));
