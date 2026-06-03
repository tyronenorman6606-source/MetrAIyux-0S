#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const receiptDir = path.join(repoRoot, 'test-artifacts', 'skyevault-agent-platform');
const receiptPath = path.join(receiptDir, 'latest.json');

function rel(file) {
  return path.relative(repoRoot, file).split(path.sep).join('/');
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function readJson(file) {
  return JSON.parse(read(file));
}

function writeJson(file, value, mode = 0o644) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, { mode });
}

async function sha256File(file) {
  return await new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(file);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

function run(name, commandArgs, options = {}) {
  const started = Date.now();
  const result = spawnSync(commandArgs[0], commandArgs.slice(1), {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 20,
    ...options
  });
  return {
    name,
    ok: result.status === 0,
    status: result.status,
    durationMs: Date.now() - started,
    stdout: String(result.stdout || '').slice(-4000),
    stderr: String(result.stderr || '').slice(-4000)
  };
}

function runAgentRoundTripProof(packageCli) {
  const started = Date.now();
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'skyevault-agent-roundtrip-'));
  const repo = path.join(tempRoot, 'repo');
  const home = path.join(tempRoot, 'home');
  const env = { ...process.env, HOME: home, SKYEVAULT_AGENT_TEST_PASSPHRASE: 'local-proof-passphrase-not-for-production' };
  const steps = [];
  function step(name, commandArgs, options = {}) {
    const result = spawnSync(commandArgs[0], commandArgs.slice(1), {
      cwd: options.cwd || repoRoot,
      encoding: 'utf8',
      env,
      maxBuffer: 1024 * 1024 * 20
    });
    steps.push({ name, status: result.status, stdout: String(result.stdout || '').slice(-1200), stderr: String(result.stderr || '').slice(-1200) });
    if (result.status !== 0) throw new Error(`${name} failed: ${result.stderr || result.stdout || result.status}`);
    return result;
  }
  try {
    fs.mkdirSync(repo, { recursive: true });
    fs.mkdirSync(home, { recursive: true });
    step('git init', ['git', 'init', '-q'], { cwd: repo });
    step('git config email', ['git', 'config', 'user.email', 'proof@example.com'], { cwd: repo });
    step('git config name', ['git', 'config', 'user.name', 'SkyeVault Proof'], { cwd: repo });
    fs.writeFileSync(path.join(repo, 'a.txt'), 'alpha\n');
    fs.mkdirSync(path.join(repo, 'nested'), { recursive: true });
    fs.writeFileSync(path.join(repo, 'nested', 'b.txt'), 'beta\n');
    step('git add', ['git', 'add', '.'], { cwd: repo });
    step('git commit', ['git', 'commit', '-q', '-m', 'init'], { cwd: repo });
    fs.writeFileSync(path.join(repo, 'untracked.md'), 'untracked current file\n');
    step('agent init', [process.execPath, packageCli, 'init', '--workspace=proof-client', `--repo=${repo}`, '--passphrase-env=SKYEVAULT_AGENT_TEST_PASSPHRASE', '--json']);
    const first = step('agent seed mutable current mirror', [process.execPath, packageCli, 'sync', '--workspace=proof-client', `--repo=${repo}`, '--passphrase-env=SKYEVAULT_AGENT_TEST_PASSPHRASE', '--json']);
    fs.writeFileSync(path.join(repo, 'a.txt'), 'alpha changed\n');
    fs.rmSync(path.join(repo, 'nested', 'b.txt'), { force: true });
    fs.writeFileSync(path.join(repo, 'c.txt'), 'gamma\n');
    const second = step('agent update same mutable current mirror', [process.execPath, packageCli, 'sync', '--workspace=proof-client', `--repo=${repo}`, '--passphrase-env=SKYEVAULT_AGENT_TEST_PASSPHRASE', '--json']);
    const firstReceipt = JSON.parse(first.stdout);
    const secondReceipt = JSON.parse(second.stdout);
    const verifyFirst = step('agent verify current mirror after seed', [process.execPath, packageCli, 'verify', `--receipt=${firstReceipt.receiptPath}`, '--passphrase-env=SKYEVAULT_AGENT_TEST_PASSPHRASE', '--json']);
    const verifySecond = step('agent verify current mirror after update', [process.execPath, packageCli, 'verify', `--receipt=${secondReceipt.receiptPath}`, '--passphrase-env=SKYEVAULT_AGENT_TEST_PASSPHRASE', '--json']);
    const restoreRoot = path.join(tempRoot, 'restore');
    const restore = step('agent restore current mirror', [process.execPath, packageCli, 'restore', `--receipt=${secondReceipt.receiptPath}`, `--out=${restoreRoot}`, '--passphrase-env=SKYEVAULT_AGENT_TEST_PASSPHRASE', '--json']);
    const restoredA = fs.readFileSync(path.join(restoreRoot, 'a.txt'), 'utf8');
    const restoredC = fs.readFileSync(path.join(restoreRoot, 'c.txt'), 'utf8');
    const restoredUntracked = fs.readFileSync(path.join(restoreRoot, 'untracked.md'), 'utf8');
    const tombstoneGone = !fs.existsSync(path.join(restoreRoot, 'nested', 'b.txt'));
    const gitHeadRestored = fs.existsSync(path.join(restoreRoot, '.git', 'HEAD'));
    if (restoredA !== 'alpha changed\n' || restoredC !== 'gamma\n' || restoredUntracked !== 'untracked current file\n' || !tombstoneGone || !gitHeadRestored) throw new Error('restored repo content did not match expected current mirror state');
    const summary = {
      ok: true,
      first: { kind: firstReceipt.kind, action: firstReceipt.action, receiptPath: firstReceipt.receiptPath, manifestDigest: firstReceipt.manifestDigest },
      second: { kind: secondReceipt.kind, action: secondReceipt.action, changedFileCount: secondReceipt.changedFileCount, tombstoneCount: secondReceipt.tombstoneCount, receiptPath: secondReceipt.receiptPath, manifestDigest: secondReceipt.manifestDigest },
      sameCurrentReceipt: firstReceipt.receiptPath === secondReceipt.receiptPath,
      verifyFirst: JSON.parse(verifyFirst.stdout),
      verifySecond: JSON.parse(verifySecond.stdout),
      restore: JSON.parse(restore.stdout),
      untrackedCurrentRestored: true,
      gitHeadRestored
    };
    return {
      name: 'agent mutable current mirror restore round trip',
      ok: true,
      status: 0,
      durationMs: Date.now() - started,
      stdout: JSON.stringify(summary, null, 2).slice(-4000),
      stderr: ''
    };
  } catch (error) {
    return {
      name: 'agent mutable current mirror restore round trip',
      ok: false,
      status: 1,
      durationMs: Date.now() - started,
      stdout: JSON.stringify({ steps }, null, 2).slice(-4000),
      stderr: error.message
    };
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function runChildAsync(name, commandArgs, options = {}) {
  const started = Date.now();
  return new Promise((resolve) => {
    const child = spawn(commandArgs[0], commandArgs.slice(1), {
      cwd: options.cwd || repoRoot,
      env: options.env || process.env,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', (error) => {
      resolve({
        name,
        ok: false,
        status: 1,
        durationMs: Date.now() - started,
        stdout: stdout.slice(-4000),
        stderr: error.message
      });
    });
    child.on('close', (status) => {
      resolve({
        name,
        ok: status === 0,
        status,
        durationMs: Date.now() - started,
        stdout: stdout.slice(-4000),
        stderr: stderr.slice(-4000)
      });
    });
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('error', reject);
    req.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

async function runAgentPortalKeyUploadProof(packageCli) {
  const started = Date.now();
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'skyevault-agent-upload-'));
  const repo = path.join(tempRoot, 'repo');
  const home = path.join(tempRoot, 'home');
  const seen = { uploadSession: null, uploadComplete: null, putBytes: 0 };
  let server;
  try {
    fs.mkdirSync(repo, { recursive: true });
    fs.mkdirSync(home, { recursive: true });
    fs.writeFileSync(path.join(repo, 'app.js'), 'console.log("portal upload proof");\n');
    server = http.createServer(async (req, res) => {
      try {
        if (req.method === 'POST' && req.url === '/api/upload-session') {
          const body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
          seen.uploadSession = {
            portalKey: req.headers['x-portal-key'] === 'portal-key-proof',
            authorization: req.headers.authorization || '',
            fileSize: Number(body.fileSize || 0),
            workspaceId: body.workspaceId || ''
          };
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(JSON.stringify({
            ok: true,
            sessionId: 'mock_session',
            parts: [{
              partNumber: 1,
              start: 0,
              end: Math.max(0, Number(body.fileSize || 1) - 1),
              uploadUrl: `http://127.0.0.1:${server.address().port}/upload/mock-part`
            }],
            destination: { id: 'primary', name: 'Mock Primary' },
            objectKey: 'mock/skyevault-agent.enc',
            bucket: 'mock-bucket',
            uploadId: 'mock-upload',
            r2Object: { id: 'mock/skyevault-agent.enc', key: 'mock/skyevault-agent.enc' }
          }));
          return;
        }
        if (req.method === 'PUT' && req.url === '/upload/mock-part') {
          const body = await readBody(req);
          seen.putBytes += body.length;
          res.writeHead(200, { etag: '"mock-etag"' });
          res.end('');
          return;
        }
        if (req.method === 'POST' && req.url === '/api/upload-complete') {
          const body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
          seen.uploadComplete = { sessionId: body.sessionId || '', driveFileId: body.driveFileId || '' };
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ ok: true, receipt: { id: 'mock_receipt' }, entry: { id: 'mock_receipt' } }));
          return;
        }
        res.writeHead(404, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'not found' }));
      } catch (error) {
        res.writeHead(500, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: error.message }));
      }
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    const env = {
      ...process.env,
      HOME: home,
      SKYEVAULT_PORTAL_KEY: 'portal-key-proof',
      SKYEVAULT_AGENT_TEST_PASSPHRASE: 'local-proof-passphrase-not-for-production'
    };
    delete env.SKYEVAULT_GATE_BEARER;
    const init = await runChildAsync('agent init portal upload proof', [
      process.execPath,
      packageCli,
      'init',
      '--workspace=portal-proof',
      `--repo=${repo}`,
      `--vault-url=http://127.0.0.1:${port}`,
      '--passphrase-env=SKYEVAULT_AGENT_TEST_PASSPHRASE',
      '--json'
    ], { env });
    if (!init.ok) throw new Error(init.stderr || init.stdout || 'agent init failed');
    const sync = await runChildAsync('agent portal-key upload proof', [
      process.execPath,
      packageCli,
      'sync',
      '--workspace=portal-proof',
      `--repo=${repo}`,
      '--passphrase-env=SKYEVAULT_AGENT_TEST_PASSPHRASE',
      '--upload',
      '--json'
    ], { env });
    if (!sync.ok) throw new Error(sync.stderr || sync.stdout || 'agent sync upload failed');
    const receipt = JSON.parse(sync.stdout || '{}');
    const ok = Boolean(
      receipt.ok
        && receipt.upload?.ok
        && receipt.upload?.authMode === 'portal-key'
        && seen.uploadSession?.portalKey
        && !seen.uploadSession?.authorization
        && seen.putBytes > 0
        && seen.uploadComplete?.sessionId === 'mock_session'
    );
    return {
      name: 'agent portal-key upload proof',
      ok,
      status: ok ? 0 : 1,
      durationMs: Date.now() - started,
      stdout: JSON.stringify({ receipt, seen }, null, 2).slice(-4000),
      stderr: ok ? '' : 'portal-key-only upload did not complete as expected'
    };
  } catch (error) {
    return {
      name: 'agent portal-key upload proof',
      ok: false,
      status: 1,
      durationMs: Date.now() - started,
      stdout: JSON.stringify({ seen }, null, 2).slice(-4000),
      stderr: error.message
    };
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function check(condition, name, details = {}) {
  return { name, ok: Boolean(condition), ...details };
}

const checks = [];
const commands = [];

commands.push(run('package release', ['npm', 'run', 'vault:agent:package']));
commands.push(run('package release deterministic rerun', ['npm', 'run', 'vault:agent:package']));

const packageCli = path.join(repoRoot, 'packages', 'skyevault-agent', 'bin', 'skyevault-agent.mjs');
commands.push(run('agent cli syntax', [process.execPath, '--check', packageCli]));
commands.push(run('agent help', [process.execPath, packageCli, '--help']));
commands.push(run('agent version', [process.execPath, packageCli, '--version']));
commands.push(run('agent doctor', [process.execPath, packageCli, 'doctor', '--json']));
commands.push(run('release archive listing', ['tar', '-tzf', path.join(repoRoot, 'metraiyux_0s_site', 'downloads', 'skyevault-agent', 'releases', 'latest', 'skyevault-agent-latest.tar.gz')]));
commands.push(run('SkyePay paid vault webhook provisioning proof', [
  process.execPath,
  '--test',
  path.join(repoRoot, 'metraiyux_0s_site', 'skyegate', 'source', 'SkyeGateFS27', 'tests', 'skyepay-paid-vault-webhook.test.mjs')
]));

const snapshotOut = path.join(os.tmpdir(), `skyevault-agent-proof-${Date.now()}`);
commands.push(run('agent snapshot proof', [
  process.execPath,
  packageCli,
  'snapshot',
  '--repo=packages/skyevault-agent',
  `--out=${snapshotOut}`,
  '--passphrase-env=SKYEVAULT_AGENT_TEST_PASSPHRASE',
  '--json'
], {
  env: {
    ...process.env,
    SKYEVAULT_AGENT_TEST_PASSPHRASE: 'local-proof-passphrase-not-for-production'
  }
}));
commands.push(runAgentRoundTripProof(packageCli));
commands.push(await runAgentPortalKeyUploadProof(packageCli));

const latestManifestPath = path.join(repoRoot, 'metraiyux_0s_site', 'downloads', 'skyevault-agent', 'latest.json');
const latestArchivePath = path.join(repoRoot, 'metraiyux_0s_site', 'downloads', 'skyevault-agent', 'releases', 'latest', 'skyevault-agent-latest.tar.gz');
const installPagePath = path.join(repoRoot, 'metraiyux_0s_site', 'skye-vault-os', 'agent', 'index.html');
const publicAgentPagePath = path.join(repoRoot, 'metraiyux_0s_site', 'skyegate', 'source', 'SkyeGateFS27', 'skyevault-agent.html');
const publicAgentAssetPath = path.join(repoRoot, 'metraiyux_0s_site', 'skyegate', 'source', 'SkyeGateFS27', 'public', 'skyevault-agent.html');
const packageJsonPath = path.join(repoRoot, 'packages', 'skyevault-agent', 'package.json');
const skyepayCatalogPath = path.join(repoRoot, 'metraiyux_0s_site', 'skyegate', 'source', 'SkyeGateFS27', 'netlify', 'functions', '_lib', 'skyepayCatalog.js');
const skyepaySecurityPath = path.join(repoRoot, 'metraiyux_0s_site', 'skyegate', 'source', 'SkyeGateFS27', 'netlify', 'functions', '_lib', 'skyepaySecurity.js');
const skyepayProvisioningPath = path.join(repoRoot, 'metraiyux_0s_site', 'skyegate', 'source', 'SkyeGateFS27', 'netlify', 'functions', '_lib', 'skyepayVaultProvisioning.js');
const workerPath = path.join(repoRoot, 'metraiyux_0s_site', 'cloudflare', 'worker.js');
const deployScriptPath = path.join(repoRoot, 'scripts', 'deploy-0s-worker.mjs');
const packageReceiptPath = path.join(repoRoot, 'test-artifacts', 'skyevault-agent-package', 'latest.json');

const manifest = fs.existsSync(latestManifestPath) ? readJson(latestManifestPath) : null;
const agentPackageJson = fs.existsSync(packageJsonPath) ? readJson(packageJsonPath) : null;
const archiveSha = fs.existsSync(latestArchivePath) ? await sha256File(latestArchivePath) : '';
const page = fs.existsSync(installPagePath) ? read(installPagePath) : '';
const publicAgentPage = fs.existsSync(publicAgentPagePath) ? read(publicAgentPagePath) : '';
const publicAgentAsset = fs.existsSync(publicAgentAssetPath) ? read(publicAgentAssetPath) : '';
const catalog = read(skyepayCatalogPath);
const skyepaySecurity = read(skyepaySecurityPath);
const skyepayProvisioning = read(skyepayProvisioningPath);
const agentCli = read(packageCli);
const worker = read(workerPath);
const deployScript = read(deployScriptPath);
const packageReceipt = fs.existsSync(packageReceiptPath) ? readJson(packageReceiptPath) : null;

checks.push(check(fs.existsSync(latestArchivePath), 'download archive exists', { file: rel(latestArchivePath) }));
checks.push(check(manifest?.ok === true, 'release manifest exists and is ok', { file: rel(latestManifestPath) }));
checks.push(check(archiveSha && archiveSha === manifest?.release?.latestSha256, 'latest archive sha matches manifest', { archiveSha }));
const versionStdout = String(commands.find((item) => item.name === 'agent version')?.stdout || '').trim();
checks.push(check(
  agentPackageJson?.version
    && manifest?.package?.version === agentPackageJson.version
    && manifest?.release?.id === `v${agentPackageJson.version}`
    && versionStdout === agentPackageJson.version,
  'agent package, release manifest, archive id, and CLI version are aligned',
  {
    packageVersion: agentPackageJson?.version || '',
    manifestVersion: manifest?.package?.version || '',
    releaseId: manifest?.release?.id || '',
    cliVersion: versionStdout
  }
));
let firstPackageSha = '';
let secondPackageSha = '';
try {
  firstPackageSha = JSON.parse(commands.find((item) => item.name === 'package release')?.stdout?.match(/\{[\s\S]*\}\s*$/)?.[0] || '{}')?.archive?.latestSha256 || '';
  secondPackageSha = JSON.parse(commands.find((item) => item.name === 'package release deterministic rerun')?.stdout?.match(/\{[\s\S]*\}\s*$/)?.[0] || '{}')?.archive?.latestSha256 || '';
} catch {}
checks.push(check(firstPackageSha && firstPackageSha === secondPackageSha && secondPackageSha === archiveSha, 'agent release archive is reproducible across repeated packaging', {
  firstPackageSha,
  secondPackageSha
}));
checks.push(check(page.includes('Reape0r: the Autonomous Cloud Repo Mirror'), 'install center page exists'));
checks.push(check(publicAgentPage.includes('Reape0r') && publicAgentPage.includes('agentCheckoutForm') && publicAgentPage.includes('/skyepay/checkout'), 'public buyer page exists and opens SkyePay checkout'));
checks.push(check(publicAgentAsset.includes('Reape0r') && publicAgentAsset.includes('skyevault-pro-access'), 'public buyer page is staged in FS27 public assets'));
checks.push(check(page.includes('skyepay-store.html?client=metraiyux-0s') && page.includes('skyevault-pro-access'), 'install center links to SkyePay offer'));
checks.push(check(page.includes('/skyepay/status') && page.includes('provisioning_status'), 'install center checks SkyePay return status'));
checks.push(check(page.includes('entitlementQuery') && page.includes('session_id') && page.includes('withEntitlement'), 'install center carries SkyePay session into package downloads'));
checks.push(check(page.includes('SKYEVAULT_PORTAL_KEY') && page.includes('SKYEVAULT_GATE_BEARER is optional'), 'install center makes portal key the buyer upload credential and marks gate bearer optional'));
checks.push(check(page.includes('node bin/skyevault-agent.mjs sync --upload') && page.includes('verify --receipt') && page.includes('restore --receipt'), 'install center documents sync, verify, and restore commands'));
checks.push(check(page.includes('Unlocked Workspace Env') && page.includes('agent_delivery') && page.includes('repo_env'), 'install center renders the provisioned workspace env after SkyePay unlock'));
checks.push(check(skyepayProvisioning.includes('repoEnv: safeRepoEnv(result?.repoEnv || {})') && skyepayProvisioning.includes('portalKeyReturned: Boolean(result?.portalKey)'), 'SkyePay provisioning stores agent repo env handoff after vault workspace unlock'));
checks.push(check(skyepayProvisioning.includes('export function skyePayVaultPlanLimits') && !skyepayProvisioning.includes('Math.min(200'), 'SkyePay provisioning passes paid SkyeVault plan file limits without the old 200-file choke point'));
checks.push(check(skyepayProvisioning.includes('authorization: `Bearer ${gateBearer}`') && skyepayProvisioning.includes('x-skyepay-lane') && !skyepayProvisioning.includes('x-skyevault-provisioning-secret'), 'SkyePay vault provisioning calls Drop with shared FS27/SkyGate bearer, not the old provisioning-secret lane'));
checks.push(check(skyepaySecurity.includes('includeVaultAgentSecrets') && skyepaySecurity.includes('SKYEVAULT_PORTAL_KEY') && skyepaySecurity.includes('repo_env'), 'SkyePay status can return agent repo env only through session-scoped unlocked delivery'));
checks.push(check(agentCli.includes("reason: 'missing_portal_key_env'") && agentCli.includes("authMode: bearer ? 'portal-key-plus-shared-gate' : 'portal-key'"), 'agent upload works with portal key only and treats shared gate bearer as optional'));
checks.push(check(agentCli.includes('function helpCommand()') && agentCli.includes('function versionCommand()'), 'agent has real help and version commands for buyer install support'));
checks.push(check(worker.includes("'/skye-vault-os'") && worker.includes("'/downloads'"), '0S gate covers install center and downloads prefixes'));
checks.push(check(worker.includes('checkSkyeVaultAgentSkyPaySession') && worker.includes('isSkyeVaultAgentInstallPath'), 'Worker allows real SkyePay sessions into the agent install page before owner-login redirect'));
checks.push(check(worker.includes('requireSkyeVaultAgentPackageAccess') && worker.includes('skyevault_agent_entitlement_not_unlocked') && worker.includes('presentedGateCredentials'), 'Worker enforces owner/admin or SkyePay entitlement for agent package downloads'));
checks.push(check(worker.includes("const offerId = String(order.offer_id || url.searchParams.get('offer') || '')"), 'Worker returns clean locked package response for pending SkyePay sessions'));
checks.push(check(page.includes('setLockedReleaseLinks') && page.includes('Download unlocks after provisioning') && page.includes('loadManifest(order?.unlocked'), 'install center shows pending buyer status without exposing package downloads'));
checks.push(check(deployScript.includes("'downloads/skyevault-agent'"), '0S Worker deploy stages the agent download package assets'));
const fs27WorkerPath = path.join(repoRoot, 'metraiyux_0s_site', 'skyegate', 'source', 'SkyeGateFS27', 'cloudflare', 'worker.mjs');
const fs27Worker = read(fs27WorkerPath);
checks.push(check(fs27Worker.includes("import stripeWebhook from '../netlify/functions/stripe-webhook.js'"), 'FS27 Worker imports the SkyePay payment-provider webhook handler for live payment completion'));
checks.push(check(fs27Worker.includes("['POST', '/.netlify/functions/stripe-webhook', stripeWebhook]") && fs27Worker.includes("['POST', '/skyepay/stripe-webhook', stripeWebhook]"), 'FS27 Worker mounts SkyePay payment-provider webhook routes used by provisioning'));
checks.push(check(fs27Worker.includes("['/vault-agent', '/skyevault-agent.html']") && publicAgentAsset.includes('skyevault-agent.html') && publicAgentAsset.includes('agentCheckoutForm'), 'FS27 Worker exposes the public Reape0r buyer surface and vault-agent alias'));
for (const offer of ['skyevault-starter-access', 'skyevault-pro-access', 'skyevault-command-access']) {
  const offerBlock = catalog.slice(catalog.indexOf(`id: "${offer}"`), catalog.indexOf('gate_policy', catalog.indexOf(`id: "${offer}"`)) + 1200);
  checks.push(check(offerBlock.includes('delivery') && offerBlock.includes('/skye-vault-os/agent/') && offerBlock.includes('/downloads/skyevault-agent/latest.json'), `${offer} has agent delivery metadata`));
  checks.push(check(offerBlock.includes('skyevault-portal-key-plus-optional-shared-gate'), `${offer} delivery metadata names the portal-key buyer auth lane`));
}
checks.push(check(packageReceipt?.ok === true, 'package receipt exists', { file: rel(packageReceiptPath) }));
const listing = commands.find((item) => item.name === 'release archive listing')?.stdout || '';
checks.push(check(listing.includes('skyevault-agent/package.json') && listing.includes('skyevault-agent/bin/skyevault-agent.mjs'), 'release archive extracts into skyevault-agent folder'));
checks.push(check(
  listing.includes('skyevault-agent/install.sh')
    && listing.includes('skyevault-agent/RUNBOOK.md')
    && listing.includes('skyevault-agent/templates/skyevault-agent.env.example')
    && listing.includes('skyevault-agent/templates/skyevault-agent.service')
    && listing.includes('skyevault-agent/templates/com.skyevault.reape0r.plist'),
  'release archive includes installer, runbook, and service templates'
));
checks.push(check(commands.find((item) => item.name === 'SkyePay paid vault webhook provisioning proof')?.ok === true, 'paid SkyePay checkout webhook provisions buyer vault workspace and stores unlock handoff'));

let snapshotReceipt = null;
try {
  const snapshotCommand = commands.find((item) => item.name === 'agent snapshot proof');
  const parsed = JSON.parse(snapshotCommand.stdout || '{}');
  snapshotReceipt = parsed?.receiptPath ? readJson(parsed.receiptPath) : parsed;
} catch {}
checks.push(check(snapshotReceipt?.ok === true, 'agent can create encrypted local snapshot'));
checks.push(check(snapshotReceipt?.artifact?.sha256 && fs.existsSync(snapshotReceipt.artifact.path || ''), 'snapshot artifact exists with sha256'));
checks.push(check(snapshotReceipt?.literalRepo === true, 'snapshot default is literal repo custody'));
let roundTrip = null;
try {
  roundTrip = JSON.parse(commands.find((item) => item.name === 'agent mutable current mirror restore round trip')?.stdout || '{}');
} catch {}
checks.push(check(roundTrip?.ok === true, 'agent proves mutable current mirror restore round trip'));
checks.push(check(roundTrip?.first?.kind === 'current' && roundTrip?.second?.kind === 'current' && roundTrip?.sameCurrentReceipt === true, 'agent sync writes to the same current mirror receipt'));
checks.push(check(roundTrip?.second?.changedFileCount === 2 && roundTrip?.second?.tombstoneCount === 1, 'agent current mirror tracks changed files and deletions'));
checks.push(check(roundTrip?.restore?.ok === true && roundTrip?.restore?.baseKind === 'current', 'agent restore rebuilds directly from current mirror receipt'));
checks.push(check(roundTrip?.untrackedCurrentRestored === true && roundTrip?.gitHeadRestored === true, 'agent current mirror restores untracked files and .git metadata'));
let portalUpload = null;
try {
  portalUpload = JSON.parse(commands.find((item) => item.name === 'agent portal-key upload proof')?.stdout || '{}');
} catch {}
checks.push(check(portalUpload?.receipt?.upload?.ok === true && portalUpload?.receipt?.upload?.authMode === 'portal-key', 'agent uploads through SkyeVault Drop with buyer portal key and no bearer'));
checks.push(check(portalUpload?.seen?.putBytes > 0 && portalUpload?.seen?.uploadComplete?.sessionId === 'mock_session', 'agent completes upload-session, object PUT, and upload-complete lifecycle'));

const blockers = [
  ...commands.filter((item) => !item.ok).map((item) => ({ type: 'command', name: item.name, status: item.status, stderr: item.stderr })),
  ...checks.filter((item) => !item.ok).map((item) => ({ type: 'check', name: item.name }))
];

const receipt = {
  ok: blockers.length === 0,
  schema: 'skyevault.agent-platform-proof.v1',
  generatedAt: new Date().toISOString(),
  summary: {
    commands: commands.length,
    checks: checks.length,
    blockers: blockers.length
  },
  surfaces: {
    installCenter: '/skye-vault-os/agent/',
    releaseManifest: '/downloads/skyevault-agent/latest.json',
    latestArchive: '/downloads/skyevault-agent/releases/latest/skyevault-agent-latest.tar.gz',
    skyepayStore: 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skyepay-store.html?client=metraiyux-0s&offer=skyevault-pro-access'
  },
  commands,
  checks,
  blockers
};

writeJson(receiptPath, receipt);
console.log(JSON.stringify(receipt, null, 2));
if (!receipt.ok) process.exit(1);
