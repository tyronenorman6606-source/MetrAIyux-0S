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

function waitForJsonReady(child, prefix, label) {
  return new Promise((resolve, reject) => {
    let output = '';
    const timeout = setTimeout(() => reject(new Error(`Timed out waiting for ${label}. Output:\n${output}`)), 15000);
    child.stdout.on('data', (chunk) => {
      output += chunk.toString('utf8');
      for (const line of output.split(/\r?\n/)) {
        if (!line.startsWith(prefix)) continue;
        clearTimeout(timeout);
        resolve(JSON.parse(line.slice(prefix.length)));
      }
    });
    child.stderr.on('data', (chunk) => {
      output += chunk.toString('utf8');
    });
    child.on('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error(`${label} exited early with ${code}. Output:\n${output}`));
    });
  });
}

function waitForReady(child) {
  return waitForJsonReady(child, 'SKYEVAULT_GIT_REMOTE_READY ', 'remote server');
}

function curlJson(url, token, args = []) {
  return JSON.parse(run('curl', ['-fsS', '-H', `Authorization: Bearer ${token}`, ...args, url]));
}

function curlText(url, token, args = []) {
  return run('curl', ['-fsS', '-H', `Authorization: Bearer ${token}`, ...args, url]);
}

const stamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
const proofRoot = path.join(os.tmpdir(), `skyevault-git-remote-proof-${stamp}`);
const storageRoot = path.join(proofRoot, 'remote-storage');
const token = `proof-owner-${stamp}`;
const viewerToken = `proof-viewer-${stamp}`;
const otherWorkspaceToken = `proof-other-${stamp}`;
fs.rmSync(proofRoot, { recursive: true, force: true });
fs.mkdirSync(proofRoot, { recursive: true });

const gateScript = `
import http from 'node:http';

async function readJsonRequest(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { return {}; }
}

const users = {
  [process.env.PROOF_OWNER_TOKEN]: { role: 'owner', customer_id: 'acme', username: 'owner@acme.example', api_key_id: 'proof-owner-key' },
  [process.env.PROOF_VIEWER_TOKEN]: { role: 'viewer', customer_id: 'acme', username: 'viewer@acme.example', api_key_id: 'proof-viewer-key' },
  [process.env.PROOF_OTHER_TOKEN]: { role: 'owner', customer_id: 'other', username: 'owner@other.example', api_key_id: 'proof-other-key' }
};

const server = http.createServer(async (req, res) => {
  if (req.method !== 'POST' || req.url !== '/auth-introspect') {
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ active: false }));
    return;
  }
  const body = await readJsonRequest(req);
  const supplied = String(body.token || '').replace(/^Bearer\\s+/i, '');
  const user = users[supplied];
  res.writeHead(200, { 'content-type': 'application/json' });
  if (!user) {
    res.end(JSON.stringify({ active: false }));
    return;
  }
  res.end(JSON.stringify({
    active: true,
    scope: 'gateway.read gateway.invoke',
    sub: 'api_key:' + user.api_key_id,
    gate_card_id: 'gate_proof_' + user.api_key_id,
    gate_card: {
      id: 'gate_proof_' + user.api_key_id,
      principal: 'api_key',
      customer_id: user.customer_id,
      role: user.role,
      metadata: { workspace_id: user.customer_id }
    },
    vault_storage_mb: 128,
    vault_file_limit: 5000,
    vault_workspace_limit: 8,
    ...user
  }));
});

server.listen(0, '127.0.0.1', () => {
  const address = server.address();
  console.log('SKYEVAULT_GATE_MOCK_READY ' + JSON.stringify({ url: 'http://127.0.0.1:' + address.port + '/auth-introspect' }));
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));
`;

const gate = spawn(process.execPath, ['--input-type=module', '-e', gateScript], {
  cwd: root,
  env: {
    ...process.env,
    PROOF_OWNER_TOKEN: token,
    PROOF_VIEWER_TOKEN: viewerToken,
    PROOF_OTHER_TOKEN: otherWorkspaceToken
  },
  stdio: ['ignore', 'pipe', 'pipe']
});
gate.stderr.on('data', (chunk) => process.stderr.write(chunk));
const gateReady = await waitForJsonReady(gate, 'SKYEVAULT_GATE_MOCK_READY ', 'mock Gate server');
const gateIntrospectUrl = gateReady.url;
const gateSelfCheck = JSON.parse(run('curl', ['-fsS', '-H', 'content-type: application/json', '--data', JSON.stringify({ token: `Bearer ${token}` }), gateIntrospectUrl]));
if (!gateSelfCheck.active || gateSelfCheck.customer_id !== 'acme') throw new Error('Mock Gate introspection self-check failed.');

const server = spawn(process.execPath, [
  path.join(root, 'tools/skyevault-git-remote-server.mjs'),
  '--port=0',
  `--storage-root=${storageRoot}`,
  `--gate-introspect-url=${gateIntrospectUrl}`
], { cwd: root, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
server.stderr.on('data', (chunk) => process.stderr.write(chunk));

let ready;
try {
  ready = await waitForReady(server);
  const health = curlJson(`${ready.baseUrl}/health`, token);
  if (health.auth !== 'gate-introspection') throw new Error(`Remote did not start in Gate mode: ${health.auth}`);
  const preflightRepos = curlJson(`${ready.baseUrl}/__skyevault/repos`, token);
  if (!Array.isArray(preflightRepos.repos)) throw new Error('Gate-authenticated admin preflight failed.');
  const client = path.join(proofRoot, 'client');
  const clone = path.join(proofRoot, 'clone');
  const bundleClone = path.join(proofRoot, 'bundle-clone');
  const remoteUrl = `${ready.baseUrl}/acme/demo.git`;
  const authedRemoteUrl = remoteUrl.replace('http://', `http://x-token:${token}@`);
  const viewerRemoteUrl = remoteUrl.replace('http://', `http://x-token:${viewerToken}@`);
  const wrongWorkspaceUrl = `${ready.baseUrl}/other/demo.git`.replace('http://', `http://x-token:${token}@`);

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
  let viewerPushRejected = false;
  try {
    run('git', ['push', viewerRemoteUrl, 'main:refs/heads/viewer-denied'], { cwd: client, stdio: 'pipe' });
  } catch {
    viewerPushRejected = true;
  }
  if (!viewerPushRejected) throw new Error('Expected viewer token push to be rejected.');
  let wrongWorkspaceRejected = false;
  try {
    run('git', ['push', wrongWorkspaceUrl, 'main:refs/heads/wrong-workspace'], { cwd: client, stdio: 'pipe' });
  } catch {
    wrongWorkspaceRejected = true;
  }
  if (!wrongWorkspaceRejected) throw new Error('Expected cross-workspace push to be rejected.');
  run('git', ['fetch', 'origin'], { cwd: clone, stdio: 'pipe' });
  const remoteHead = run('git', ['rev-parse', 'origin/main'], { cwd: clone });

  const ui = curlText(`${ready.baseUrl}/__skyevault/ui`, token);
  if (!ui.includes('SkyeVault Git Remote')) throw new Error('Operator UI did not render the SkyeVault Git Remote console.');
  const viewerRepos = curlJson(`${ready.baseUrl}/__skyevault/repos`, viewerToken);
  let viewerCreateRejected = false;
  try {
    curlJson(`${ready.baseUrl}/__skyevault/repos`, viewerToken, [
      '-X', 'POST',
      '-H', 'content-type: application/json',
      '--data', JSON.stringify({ workspaceId: 'acme', repoId: 'viewer-created' })
    ]);
  } catch {
    viewerCreateRejected = true;
  }
  if (!viewerCreateRejected) throw new Error('Expected viewer repo creation to be rejected.');
  const createdRepo = curlJson(`${ready.baseUrl}/__skyevault/repos`, token, [
    '-X', 'POST',
    '-H', 'content-type: application/json',
    '--data', JSON.stringify({ workspaceId: 'acme', repoId: 'created-from-api' })
  ]);
  const repos = curlJson(`${ready.baseUrl}/__skyevault/repos`, token);
  const detail = curlJson(`${ready.baseUrl}/__skyevault/repos/acme/demo`, token);
  const apiRefs = curlJson(`${ready.baseUrl}/__skyevault/repos/acme/demo/refs`, token);
  const apiEvents = curlJson(`${ready.baseUrl}/__skyevault/repos/acme/demo/events`, token);
  const apiNeuralMap = curlJson(`${ready.baseUrl}/__skyevault/repos/acme/demo/neural-map`, token);
  const bundleExport = curlJson(`${ready.baseUrl}/__skyevault/repos/acme/demo/export`, token, ['-X', 'POST']);
  if (!fs.existsSync(bundleExport.export.path)) throw new Error('Exported bundle was not written to disk.');
  run('git', ['clone', bundleExport.export.path, bundleClone], { cwd: proofRoot, stdio: 'pipe' });
  const bundleHead = run('git', ['rev-parse', 'HEAD'], { cwd: bundleClone });
  if (bundleHead !== remoteHead) throw new Error('Exported bundle clone does not match remote HEAD.');
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
    bundleHead,
    forcePushRejected,
    viewerPushRejected,
    wrongWorkspaceRejected,
    viewerCreateRejected,
    gateAuthOk: ready.auth === 'gate-introspection',
    uiOk: true,
    createdRepo: createdRepo.repo.id,
    viewerVisibleRepos: viewerRepos.repos.length,
    repos: repos.repos,
    repoDetail: detail.repo,
    apiRefs: apiRefs.refs.length,
    apiEvents: apiEvents.events.length,
    apiNeuralNodes: apiNeuralMap.neuralMap?.nodes?.length || 0,
    bundleExport: {
      fileName: bundleExport.export.fileName,
      bytes: bundleExport.export.bytes,
      sha256: bundleExport.export.sha256
    },
    refEvents: ledger.filter((event) => event.event === 'git.ref-update').length,
    requestEvents: ledger.filter((event) => event.event === 'git.remote-request').length,
    exportEvents: ledger.filter((event) => event.event === 'git.remote-export').length,
    neuralFiles
  };
  console.log(JSON.stringify(report, null, 2));
} finally {
  server.kill('SIGTERM');
  gate.kill('SIGTERM');
}
