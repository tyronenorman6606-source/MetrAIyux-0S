import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';

const root = path.resolve(new URL('..', import.meta.url).pathname);

function run(file, args, options = {}) {
  return execFileSync(file, args, {
    cwd: options.cwd || root,
    encoding: options.encoding || 'utf8',
    env: { ...process.env, ...(options.env || {}) },
    stdio: options.stdio || 'pipe'
  }).trim();
}

function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text.endsWith('\n') ? text : `${text}\n`);
}

function waitForReady(child) {
  return new Promise((resolve, reject) => {
    let output = '';
    const timeout = setTimeout(() => reject(new Error(`Timed out waiting for remote server. Output:\n${output}`)), 15000);
    child.stdout.on('data', (chunk) => {
      output += chunk.toString('utf8');
      for (const line of output.split(/\r?\n/)) {
        if (!line.startsWith('SKYEVAULT_GIT_REMOTE_READY ')) continue;
        clearTimeout(timeout);
        resolve(JSON.parse(line.slice('SKYEVAULT_GIT_REMOTE_READY '.length)));
      }
    });
    child.stderr.on('data', (chunk) => {
      output += chunk.toString('utf8');
    });
    child.on('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error(`Remote server exited early with ${code}. Output:\n${output}`));
    });
  });
}

const stamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
const proofRoot = path.join(os.tmpdir(), `skyevault-git-remote-proof-${stamp}`);
const storageRoot = path.join(proofRoot, 'remote-storage');
const token = `proof-${stamp}`;
fs.rmSync(proofRoot, { recursive: true, force: true });
fs.mkdirSync(proofRoot, { recursive: true });

const server = spawn(process.execPath, [
  path.join(root, 'tools/skyevault-git-remote-server.mjs'),
  '--port=0',
  `--storage-root=${storageRoot}`,
  `--token=${token}`
], { cwd: root, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });

let ready;
try {
  ready = await waitForReady(server);
  const client = path.join(proofRoot, 'client');
  const clone = path.join(proofRoot, 'clone');
  const remoteUrl = `${ready.baseUrl}/acme/demo.git`;
  const authedRemoteUrl = remoteUrl.replace('http://', `http://x-token:${token}@`);

  fs.mkdirSync(client, { recursive: true });
  run('git', ['init'], { cwd: client });
  run('git', ['config', 'user.name', 'SkyeVault Proof'], { cwd: client });
  run('git', ['config', 'user.email', 'proof@skyevault.local'], { cwd: client });
  write(path.join(client, 'README.md'), '# SkyeVault Git Remote Proof\n');
  run('git', ['add', 'README.md'], { cwd: client });
  run('git', ['commit', '-m', 'Initial proof commit'], { cwd: client });
  run('git', ['branch', '-M', 'main'], { cwd: client });
  run('git', ['remote', 'add', 'vault', authedRemoteUrl], { cwd: client });
  run('git', ['push', 'vault', 'main'], { cwd: client, stdio: 'pipe' });

  run('git', ['clone', authedRemoteUrl, clone], { cwd: proofRoot, stdio: 'pipe' });
  const firstHead = run('git', ['rev-parse', 'HEAD'], { cwd: clone });

  write(path.join(client, 'docs', 'second.md'), 'Second proof commit\n');
  run('git', ['add', 'docs/second.md'], { cwd: client });
  run('git', ['commit', '-m', 'Second proof commit'], { cwd: client });
  run('git', ['push', 'vault', 'main'], { cwd: client, stdio: 'pipe' });
  run('git', ['reset', '--hard', 'HEAD~1'], { cwd: client, stdio: 'pipe' });
  let forcePushRejected = false;
  try {
    run('git', ['push', '--force', 'vault', 'main'], { cwd: client, stdio: 'pipe' });
  } catch {
    forcePushRejected = true;
  }
  if (!forcePushRejected) throw new Error('Expected protected main force-push to be rejected.');
  run('git', ['fetch', 'origin'], { cwd: clone, stdio: 'pipe' });
  const remoteHead = run('git', ['rev-parse', 'origin/main'], { cwd: clone });

  const repos = JSON.parse(run('curl', ['-fsS', '-H', `Authorization: Bearer ${token}`, `${ready.baseUrl}/__skyevault/repos`]));
  const ledger = fs.existsSync(ready.ledgerPath) ? fs.readFileSync(ready.ledgerPath, 'utf8').split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line)) : [];
  const neuralFiles = fs.existsSync(ready.neuralDir) ? fs.readdirSync(ready.neuralDir).filter((name) => name.endsWith('.json')) : [];
  const report = {
    schema: 'skyevault.git-remote-proof.v1',
    ok: true,
    proofRoot,
    remoteUrl,
    storageRoot,
    firstHead,
    remoteHead,
    forcePushRejected,
    repos: repos.repos,
    refEvents: ledger.filter((event) => event.event === 'git.ref-update').length,
    requestEvents: ledger.filter((event) => event.event === 'git.remote-request').length,
    neuralFiles
  };
  console.log(JSON.stringify(report, null, 2));
} finally {
  server.kill('SIGTERM');
}
