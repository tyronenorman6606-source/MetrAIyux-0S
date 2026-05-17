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
  const secondHead = run('git', ['rev-parse', 'HEAD'], { cwd: client });
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
  run('git', ['tag', 'v1.0.0'], { cwd: client, stdio: 'pipe' });
  run('git', ['push', 'vault', 'v1.0.0'], { cwd: client, stdio: 'pipe' });
  run('git', ['tag', '-f', 'v1.0.0', secondHead], { cwd: client, stdio: 'pipe' });
  let protectedTagRejected = false;
  try {
    run('git', ['push', '--force', 'vault', 'v1.0.0'], { cwd: client, stdio: 'pipe' });
  } catch {
    protectedTagRejected = true;
  }
  if (!protectedTagRejected) throw new Error('Expected protected tag update to be rejected.');
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
  const policy = curlJson(`${ready.baseUrl}/__skyevault/policy`, token);
  const quota = curlJson(`${ready.baseUrl}/__skyevault/quota`, token);
  const snapshot = curlJson(`${ready.baseUrl}/__skyevault/snapshots`, token, ['-X', 'POST']);
  const snapshots = curlJson(`${ready.baseUrl}/__skyevault/snapshots`, token);
  const snapshotVerify = curlJson(`${ready.baseUrl}/__skyevault/snapshots/${snapshot.snapshot.snapshotId}/verify`, token, ['-X', 'POST']);
  if (!snapshotVerify.verification.ok) throw new Error('Remote snapshot verification failed.');
  const bundleExport = curlJson(`${ready.baseUrl}/__skyevault/repos/acme/demo/export`, token, ['-X', 'POST']);
  if (!fs.existsSync(bundleExport.export.path)) throw new Error('Exported bundle was not written to disk.');
  run('git', ['clone', bundleExport.export.path, bundleClone], { cwd: proofRoot, stdio: 'pipe' });
  const bundleHead = run('git', ['rev-parse', 'HEAD'], { cwd: bundleClone });
  if (bundleHead !== remoteHead) throw new Error('Exported bundle clone does not match remote HEAD.');

  const maintenanceSnapshot = JSON.parse(run(process.execPath, [path.join(root, 'tools/skyevault-git-remote-maintenance.mjs'), 'snapshot', `--storage-root=${storageRoot}`]));
  const maintenanceVerify = JSON.parse(run(process.execPath, [path.join(root, 'tools/skyevault-git-remote-maintenance.mjs'), 'verify', `--storage-root=${storageRoot}`, `--snapshot=${maintenanceSnapshot.snapshotId}`]));
  if (!maintenanceVerify.ok) throw new Error('Maintenance snapshot verification failed.');
  const restoredStorageRoot = path.join(proofRoot, 'restored-storage');
  const restore = JSON.parse(run(process.execPath, [path.join(root, 'tools/skyevault-git-remote-maintenance.mjs'), 'restore', `--storage-root=${storageRoot}`, `--target-storage-root=${restoredStorageRoot}`, `--snapshot=${maintenanceSnapshot.snapshotId}`, '--repo=acme/demo']));
  if (!restore.restored.length) throw new Error('Maintenance restore did not restore acme/demo.');
  const restoredClone = path.join(proofRoot, 'restored-clone');
  run('git', ['clone', path.join(restoredStorageRoot, 'repos', 'acme', 'demo.git'), restoredClone], { cwd: proofRoot, stdio: 'pipe' });
  const restoredHead = run('git', ['rev-parse', 'HEAD'], { cwd: restoredClone });
  if (restoredHead !== remoteHead) throw new Error('Restored snapshot clone does not match remote HEAD.');

  const cliHome = path.join(proofRoot, 'cli-home');
  const cliClone = path.join(proofRoot, 'cli-clone');
  fs.mkdirSync(cliHome, { recursive: true });
  const cliEnv = { HOME: cliHome, SKYEVAULT_CLI_CONFIG: path.join(cliHome, '.skyevault', 'config.json') };
  const cliLogin = JSON.parse(run(process.execPath, [path.join(root, 'tools/skyevault-cli.mjs'), 'login', `--remote-url=${ready.baseUrl}`, `--token=${token}`, '--workspace=acme'], { env: cliEnv }));
  const cliStatus = JSON.parse(run(process.execPath, [path.join(root, 'tools/skyevault-cli.mjs'), 'status'], { env: cliEnv }));
  run(process.execPath, [path.join(root, 'tools/skyevault-cli.mjs'), 'clone', 'demo', cliClone], { env: cliEnv, stdio: 'pipe' });
  const cliHead = run('git', ['rev-parse', 'HEAD'], { cwd: cliClone });
  if (cliHead !== remoteHead) throw new Error('CLI clone does not match remote HEAD.');

  const zipLeftDir = path.join(proofRoot, 'zip-left');
  const zipRightDir = path.join(proofRoot, 'zip-right');
  fs.mkdirSync(zipLeftDir, { recursive: true });
  fs.mkdirSync(zipRightDir, { recursive: true });
  write(path.join(zipLeftDir, 'same.txt'), 'same\n');
  write(path.join(zipLeftDir, 'removed.txt'), 'removed\n');
  write(path.join(zipRightDir, 'same.txt'), 'same\n');
  write(path.join(zipRightDir, 'added.txt'), 'added\n');
  write(path.join(zipRightDir, 'changed.txt'), 'changed\n');
  write(path.join(zipLeftDir, 'changed.txt'), 'before\n');
  const leftZip = path.join(proofRoot, 'left.zip');
  const rightZip = path.join(proofRoot, 'right.zip');
  run('zip', ['-qr', leftZip, '.'], { cwd: zipLeftDir, stdio: 'pipe' });
  run('zip', ['-qr', rightZip, '.'], { cwd: zipRightDir, stdio: 'pipe' });
  const vaultDiff = JSON.parse(run(process.execPath, [path.join(root, 'tools/skyevault-vault-diff.mjs'), `--left=${leftZip}`, `--right=${rightZip}`]));
  if (vaultDiff.summary.added !== 1 || vaultDiff.summary.removed !== 1 || vaultDiff.summary.changed !== 1) throw new Error('Vault archive diff did not detect expected changes.');

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
    protectedTagRejected,
    viewerCreateRejected,
    gateAuthOk: ready.auth === 'gate-introspection',
    policyOk: Array.isArray(policy.policy.protectedRefs),
    quotaOk: quota.workspaces.length > 0,
    snapshotOk: snapshotVerify.verification.ok,
    maintenanceSnapshotOk: maintenanceVerify.ok,
    restoredHead,
    cliOk: cliLogin.ok && cliStatus.ok && cliHead === remoteHead,
    vaultDiff: vaultDiff.summary,
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
    snapshotEvents: ledger.filter((event) => event.event === 'git.remote-snapshot').length,
    snapshots: snapshots.snapshots.length,
    neuralFiles
  };
  console.log(JSON.stringify(report, null, 2));
} finally {
  server.kill('SIGTERM');
  gate.kill('SIGTERM');
}
