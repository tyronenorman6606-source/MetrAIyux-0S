#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { resolveZeroOsGateAuth } from './lib/zero-os-gate-auth.mjs';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const artifactDir = path.join(repoRoot, 'test-artifacts', 'skyevault-agent-sales-readiness');
const latestPath = path.join(artifactDir, 'latest.json');

const fs27 = process.env.FS27_LIVE_BASE || 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev';
const zeroOs = process.env.ZERO_OS_LIVE_BASE || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev';
const drop = process.env.SKYEVAULT_DROP_LIVE_BASE || 'https://skyevault-drop.graylondonskyes.workers.dev';
const offer = process.env.SKYEVAULT_AGENT_PROOF_OFFER || 'skyevault-pro-access';
const concurrency = Number(process.env.SKYEVAULT_AGENT_STRESS_CONCURRENCY || 12);

function rel(file) {
  return path.relative(repoRoot, file).split(path.sep).join('/');
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function publicSession(value = '') {
  const clean = String(value || '');
  return clean ? `${clean.slice(0, 10)}...${clean.slice(-4)}` : '';
}

function ownerHeaders(token, accept = 'application/json, application/octet-stream') {
  return {
    accept,
    authorization: `Bearer ${token}`,
    'x-skye-gate-session': token,
    'x-free99-gate-session': token
  };
}

function hasAny(text, needles) {
  return needles.some((needle) => String(text || '').includes(needle));
}

function hasAll(text, needles) {
  return needles.every((needle) => String(text || '').includes(needle));
}

function secretLikeLeak(text) {
  const body = String(text || '');
  const patterns = [
    /sk_live_[A-Za-z0-9_]+/,
    /rk_live_[A-Za-z0-9_]+/,
    /Bearer\s+[A-Za-z0-9_.-]{24,}/i,
    /ZERO_OS_GATE_CODE\s*[:=]\s*["'](?!&lt;|<|\$\{|__|REPLACE_|your-|customer-)[A-Za-z0-9_.:/+=-]{16,}["']/i,
    /SKYEVAULT_PORTAL_KEY\s*[:=]\s*["'](?!&lt;|<|\$\{|__|REPLACE_|workspace|customer-)[A-Za-z0-9_.:/+=-]{16,}["']/i,
    /SKYEVAULT_GATE_BEARER\s*[:=]\s*["'](?!&lt;|<|\$\{|__|REPLACE_|shared|customer-)[A-Za-z0-9_.:/+=-]{16,}["']/i,
    /x-admin-token\s*[:=]\s*["'](?!&lt;|<|\$\{|__|REPLACE_)[A-Za-z0-9_.:/+=-]{16,}["']/i
  ];
  const hit = patterns.find((pattern) => pattern.test(body));
  return hit ? String(hit) : '';
}

async function fetchWithTiming(url, init = {}) {
  const started = Date.now();
  const response = await fetch(url, {
    ...init,
    headers: {
      'user-agent': 'skyevault-agent-sales-readiness-proof/1.0',
      ...(init.headers || {})
    }
  });
  const arrayBuffer = await response.arrayBuffer();
  const bytes = Buffer.from(arrayBuffer);
  const text = bytes.toString('utf8');
  return {
    url,
    status: response.status,
    ok: response.ok,
    ms: Date.now() - started,
    contentType: response.headers.get('content-type') || '',
    headers: Object.fromEntries(response.headers.entries()),
    bytes,
    text
  };
}

function parseJson(text) {
  try {
    return JSON.parse(String(text || ''));
  } catch {
    return null;
  }
}

function run(name, commandArgs, options = {}) {
  const started = Date.now();
  const result = spawnSync(commandArgs[0], commandArgs.slice(1), {
    cwd: options.cwd || repoRoot,
    env: options.env || process.env,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 20
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

async function createCheckout() {
  const stamp = Date.now();
  const response = await fetchWithTiming(`${fs27}/skyepay/checkout`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      client_slug: 'metraiyux-0s',
      offer_id: offer,
      customer_email: `skyevault-agent-sales-proof+${stamp}@example.com`,
      customer_name: 'Reape0r Sales Readiness Proof',
      company_name: 'Reape0r Proof Co',
      idempotency_key: `skyevault-agent-sales-proof-${stamp}`,
      legal_acceptance: {
        legal_terms_accepted: true,
        arbitration_accepted: true,
        payments_policy_accepted: true,
        no_outcome_guarantee_accepted: true,
        truthful_review_boundary_acknowledged: true,
        privacy_policy_accepted: true,
        accepted_at: new Date().toISOString(),
        acceptance_surface: 'skyevault-agent-sales-readiness-proof'
      }
    })
  });
  return { ...response, body: parseJson(response.text) || {} };
}

function check(receipt, name, ok, details = {}) {
  const row = { name, ok: Boolean(ok), ...details };
  receipt.checks.push(row);
  if (!row.ok) receipt.blockers.push(row);
  return row;
}

function runDownloadedAgentRoundTrip(packageCli) {
  const started = Date.now();
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'skyevault-agent-sales-roundtrip-'));
  const repo = path.join(tempRoot, 'repo');
  const home = path.join(tempRoot, 'home');
  const env = { ...process.env, HOME: home, SKYEVAULT_AGENT_TEST_PASSPHRASE: 'sales-proof-passphrase-not-for-production' };
  const steps = [];

  function step(name, commandArgs, options = {}) {
    const result = spawnSync(commandArgs[0], commandArgs.slice(1), {
      cwd: options.cwd || repoRoot,
      env,
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 20
    });
    steps.push({ name, status: result.status, stdout: String(result.stdout || '').slice(-1000), stderr: String(result.stderr || '').slice(-1000) });
    if (result.status !== 0) throw new Error(`${name} failed: ${result.stderr || result.stdout || result.status}`);
    return result;
  }

  try {
    fs.mkdirSync(repo, { recursive: true });
    fs.mkdirSync(home, { recursive: true });
    step('git init', ['git', 'init', '-q'], { cwd: repo });
    step('git config email', ['git', 'config', 'user.email', 'proof@example.com'], { cwd: repo });
    step('git config name', ['git', 'config', 'user.name', 'SkyeVault Sales Proof'], { cwd: repo });
    fs.writeFileSync(path.join(repo, 'alpha.txt'), 'alpha\n');
    fs.mkdirSync(path.join(repo, 'nested'), { recursive: true });
    fs.writeFileSync(path.join(repo, 'nested', 'beta.txt'), 'beta\n');
    step('git add', ['git', 'add', '.'], { cwd: repo });
    step('git commit', ['git', 'commit', '-q', '-m', 'seed'], { cwd: repo });
    fs.writeFileSync(path.join(repo, 'untracked.md'), 'untracked current\n');

    step('agent init', [process.execPath, packageCli, 'init', '--workspace=sales-proof', `--repo=${repo}`, '--passphrase-env=SKYEVAULT_AGENT_TEST_PASSPHRASE', '--json']);
    const first = step('agent seed mutable current mirror', [process.execPath, packageCli, 'sync', '--workspace=sales-proof', `--repo=${repo}`, '--passphrase-env=SKYEVAULT_AGENT_TEST_PASSPHRASE', '--json']);
    fs.writeFileSync(path.join(repo, 'alpha.txt'), 'alpha changed\n');
    fs.rmSync(path.join(repo, 'nested', 'beta.txt'), { force: true });
    fs.writeFileSync(path.join(repo, 'gamma.txt'), 'gamma\n');
    const second = step('agent update same mutable current mirror', [process.execPath, packageCli, 'sync', '--workspace=sales-proof', `--repo=${repo}`, '--passphrase-env=SKYEVAULT_AGENT_TEST_PASSPHRASE', '--json']);
    const firstReceipt = JSON.parse(first.stdout);
    const secondReceipt = JSON.parse(second.stdout);
    const verifyFirst = step('agent verify current mirror after seed', [process.execPath, packageCli, 'verify', `--receipt=${firstReceipt.receiptPath}`, '--passphrase-env=SKYEVAULT_AGENT_TEST_PASSPHRASE', '--json']);
    const verifySecond = step('agent verify current mirror after update', [process.execPath, packageCli, 'verify', `--receipt=${secondReceipt.receiptPath}`, '--passphrase-env=SKYEVAULT_AGENT_TEST_PASSPHRASE', '--json']);
    const restoreRoot = path.join(tempRoot, 'restore');
    const restore = step('agent restore current mirror', [process.execPath, packageCli, 'restore', `--receipt=${secondReceipt.receiptPath}`, `--out=${restoreRoot}`, '--passphrase-env=SKYEVAULT_AGENT_TEST_PASSPHRASE', '--json']);

    const ok = fs.readFileSync(path.join(restoreRoot, 'alpha.txt'), 'utf8') === 'alpha changed\n'
      && fs.readFileSync(path.join(restoreRoot, 'gamma.txt'), 'utf8') === 'gamma\n'
      && fs.readFileSync(path.join(restoreRoot, 'untracked.md'), 'utf8') === 'untracked current\n'
      && !fs.existsSync(path.join(restoreRoot, 'nested', 'beta.txt'))
      && fs.existsSync(path.join(restoreRoot, '.git', 'HEAD'));

    return {
      ok,
      durationMs: Date.now() - started,
      first: { kind: firstReceipt.kind, action: firstReceipt.action, receiptPath: firstReceipt.receiptPath, manifestDigest: firstReceipt.manifestDigest },
      second: { kind: secondReceipt.kind, action: secondReceipt.action, changedFileCount: secondReceipt.changedFileCount, tombstoneCount: secondReceipt.tombstoneCount, receiptPath: secondReceipt.receiptPath, manifestDigest: secondReceipt.manifestDigest },
      sameCurrentReceipt: firstReceipt.receiptPath === secondReceipt.receiptPath,
      verifyFirst: JSON.parse(verifyFirst.stdout),
      verifySecond: JSON.parse(verifySecond.stdout),
      restore: JSON.parse(restore.stdout),
      restoredGitMetadata: true,
      restoredUntrackedCurrent: true
    };
  } catch (error) {
    return { ok: false, durationMs: Date.now() - started, error: error.message, steps };
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

async function runStress(receipt, context) {
  const tasks = [];
  const packageUrl = `${context.surfaces.agentPackage}?session_id=${encodeURIComponent(context.sessionId)}&offer=${encodeURIComponent(offer)}`;
  const statusUrl = `${fs27}/skyepay/status?session_id=${encodeURIComponent(context.sessionId)}&offer=${encodeURIComponent(offer)}`;
  const installUrl = `${context.surfaces.installCenter}?session_id=${encodeURIComponent(context.sessionId)}&offer=${encodeURIComponent(offer)}`;

  function pushMany(name, count, fn) {
    for (let index = 0; index < count; index += 1) tasks.push({ name, fn });
  }

  pushMany('buyer-page-content', 20, async () => {
    const r = await fetchWithTiming(context.surfaces.publicAgentPage, { headers: { accept: 'text/html' } });
    const leak = secretLikeLeak(r.text);
    return {
      ok: r.status === 200 && hasAll(r.text, ['Reape0r', 'agentCheckoutForm', '/skyepay/checkout']) && !leak,
      status: r.status,
      ms: r.ms,
      bytes: r.bytes.length,
      leak
    };
  });
  pushMany('buyer-alias-content', 12, async () => {
    const r = await fetchWithTiming(context.surfaces.publicAgentAlias, { headers: { accept: 'text/html' } });
    return { ok: r.status === 200 && hasAll(r.text, ['Reape0r', 'Starter, Pro, Command, and Auto-Install']), status: r.status, ms: r.ms, bytes: r.bytes.length };
  });
  pushMany('skyepay-store-content', 12, async () => {
    const r = await fetchWithTiming(context.surfaces.skyepayStore, { headers: { accept: 'text/html' } });
    return {
      ok: r.status === 200
        && r.contentType.includes('text/html')
        && hasAll(r.text, ['SkyePay Store', 'storeCheckoutForm', 'assets/skyepay-store.js']),
      status: r.status,
      ms: r.ms,
      bytes: r.bytes.length
    };
  });
  pushMany('skyepay-store-js-checkout', 12, async () => {
    const r = await fetchWithTiming(context.surfaces.skyepayStoreJs, { headers: { accept: 'application/javascript,text/javascript,*/*' } });
    return {
      ok: r.status === 200
        && hasAll(r.text, ['/skyepay/offers', '/skyepay/checkout', 'legal_acceptance', 'selectedOfferId']),
      status: r.status,
      ms: r.ms,
      bytes: r.bytes.length
    };
  });
  pushMany('skyepay-offer-api-specific', 12, async () => {
    const r = await fetchWithTiming(`${fs27}/skyepay/offers?client=metraiyux-0s`, { headers: { accept: 'application/json' } });
    const body = parseJson(r.text) || {};
    const found = (body.offers || []).find((item) => item.id === offer);
    return {
      ok: r.status === 200
        && body.ok === true
        && found?.delivery?.type === 'gated-agent-install'
        && found?.delivery?.auth_model === 'skyevault-portal-key-plus-optional-shared-gate'
        && found?.delivery?.agent_package === context.surfaces.agentPackage
        && found?.activation_path === 'vault_workspace_auto_provision'
        && found?.rate_limits?.vault_storage_mb >= 25600
        && found?.rate_limits?.vault_workspace_limit >= 3,
      status: r.status,
      ms: r.ms,
      bytes: r.bytes.length,
      offerFound: Boolean(found)
    };
  });
  pushMany('pending-status-no-secret', 16, async () => {
    const r = await fetchWithTiming(statusUrl, { headers: { accept: 'application/json' } });
    const body = parseJson(r.text) || {};
    const hasPortalKey = Boolean(body?.order?.agent_delivery?.repo_env?.SKYEVAULT_PORTAL_KEY);
    return { ok: r.status === 200 && body?.order?.offer_id === offer && body?.order?.payment_status === 'unpaid' && !hasPortalKey, status: r.status, ms: r.ms, hasPortalKey };
  });
  pushMany('install-page-pending-state', 16, async () => {
    const r = await fetchWithTiming(installUrl, { headers: { accept: 'text/html' } });
    const leak = secretLikeLeak(r.text);
    return { ok: r.status === 200 && hasAll(r.text, ['Reape0r: the Autonomous Cloud Repo Mirror', 'Download unlocks after provisioning']) && !leak, status: r.status, ms: r.ms, bytes: r.bytes.length, leak };
  });
  pushMany('pending-package-locked', 20, async () => {
    const r = await fetchWithTiming(packageUrl, { headers: { accept: 'application/json' } });
    return { ok: r.status === 402 && r.text.includes('skyevault_agent_entitlement_not_unlocked') && !r.headers['content-disposition'], status: r.status, ms: r.ms, bytes: r.bytes.length };
  });
  pushMany('unauth-package-locked', 12, async () => {
    const r = await fetchWithTiming(context.surfaces.agentPackage, { headers: { accept: 'application/json' } });
    return { ok: r.status !== 200 && !r.headers['content-disposition'] && !r.text.includes('skyevault-agent-latest.tar.gz'), status: r.status, ms: r.ms, bytes: r.bytes.length };
  });
  pushMany('owner-manifest-integrity', 8, async () => {
    const r = await fetchWithTiming(`${zeroOs}/downloads/skyevault-agent/latest.json`, { headers: ownerHeaders(context.ownerToken, 'application/json') });
    const body = parseJson(r.text) || {};
    return { ok: r.status === 200 && body?.release?.latestSha256 === context.manifestSha && body?.package?.version === context.version, status: r.status, ms: r.ms, bytes: r.bytes.length };
  });
  pushMany('owner-package-integrity', 8, async () => {
    const r = await fetchWithTiming(context.surfaces.agentPackage, { headers: ownerHeaders(context.ownerToken, 'application/octet-stream') });
    const digest = r.bytes.length ? sha256(r.bytes) : '';
    return { ok: r.status === 200 && digest === context.manifestSha && r.bytes.length === context.packageBytes, status: r.status, ms: r.ms, bytes: r.bytes.length, sha256: digest };
  });
  pushMany('drop-surface-content', 8, async () => {
    const r = await fetchWithTiming(drop, { headers: { accept: 'text/html' } });
    return { ok: r.status === 200 && hasAny(r.text, ['SkyeVault', 'Vault', 'Drop']), status: r.status, ms: r.ms, bytes: r.bytes.length };
  });

  const results = [];
  let cursor = 0;
  async function worker() {
    while (cursor < tasks.length) {
      const task = tasks[cursor];
      cursor += 1;
      try {
        const result = await task.fn();
        results.push({ name: task.name, ...result });
      } catch (error) {
        results.push({ name: task.name, ok: false, status: 0, ms: 0, error: error.message });
      }
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, () => worker()));

  const failures = results.filter((item) => !item.ok);
  const latencies = results.map((item) => item.ms).filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  const percentile = (p) => latencies.length ? latencies[Math.min(latencies.length - 1, Math.floor((latencies.length - 1) * p))] : 0;
  const summary = {
    ok: failures.length === 0,
    total: results.length,
    concurrency,
    failureCount: failures.length,
    failures: failures.slice(0, 20),
    p50_ms: percentile(0.5),
    p95_ms: percentile(0.95),
    max_ms: latencies.at(-1) || 0,
    byScenario: Object.fromEntries([...new Set(results.map((item) => item.name))].sort().map((name) => {
      const rows = results.filter((item) => item.name === name);
      return [name, { total: rows.length, failures: rows.filter((item) => !item.ok).length }];
    }))
  };
  receipt.stress = summary;
  check(receipt, 'Aggressive live stress returned correct content, locks, and package integrity', summary.ok, summary);
}

const receipt = {
  ok: false,
  schema: 'skyevault.agent-sales-readiness-proof.v1',
  generatedAt: new Date().toISOString(),
  surfaces: {
    publicAgentPage: `${fs27}/skyevault-agent.html`,
    publicAgentAlias: `${fs27}/skyevault-agent`,
    skyepayStore: `${fs27}/skyepay-store?client=metraiyux-0s&offer=${offer}`,
    skyepayStoreJs: `${fs27}/assets/skyepay-store.js`,
    installCenter: `${zeroOs}/skye-vault-os/agent/`,
    releaseManifest: `${zeroOs}/downloads/skyevault-agent/latest.json`,
    agentPackage: `${zeroOs}/downloads/skyevault-agent/releases/latest/skyevault-agent-latest.tar.gz`,
    valuationSource: `${zeroOs}/data/valuation-source-of-truth.json`,
    drop: `${drop}/#client-vault`
  },
  checks: [],
  commands: [],
  blockers: []
};

const publicAgentPage = await fetchWithTiming(receipt.surfaces.publicAgentPage, { headers: { accept: 'text/html' } });
const publicLeak = secretLikeLeak(publicAgentPage.text);
check(receipt, 'Buyer page is not a thin 200; it contains the offer form, checkout route, and no obvious secret leak',
  publicAgentPage.status === 200
    && publicAgentPage.contentType.includes('text/html')
    && hasAll(publicAgentPage.text, ['Reape0r', 'agentCheckoutForm', '/skyepay/checkout', 'Starter, Pro, Command, and Auto-Install', 'SKYEVAULT_AGENT_AUTO_INSTALL'])
    && !publicLeak, {
  status: publicAgentPage.status,
  bytes: publicAgentPage.bytes.length,
  contentType: publicAgentPage.contentType,
  publicLeak
});

const alias = await fetchWithTiming(receipt.surfaces.publicAgentAlias, { headers: { accept: 'text/html' } });
check(receipt, 'Buyer alias resolves to the same sellable agent surface',
  alias.status === 200 && hasAll(alias.text, ['Reape0r', 'Starter, Pro, Command, and Auto-Install', '/skyepay/checkout']), {
  status: alias.status,
  bytes: alias.bytes.length
});

const store = await fetchWithTiming(receipt.surfaces.skyepayStore, { headers: { accept: 'text/html' } });
check(receipt, 'SkyePay store shell loads the real checkout form and catalog hydrator',
  store.status === 200
    && store.contentType.includes('text/html')
    && hasAll(store.text, ['SkyePay Store', 'storeCheckoutForm', 'assets/skyepay-store.js']), {
  status: store.status,
  bytes: store.bytes.length
});

const storeJs = await fetchWithTiming(receipt.surfaces.skyepayStoreJs, { headers: { accept: 'application/javascript,text/javascript,*/*' } });
check(receipt, 'SkyePay store hydrator loads catalog, keeps legal acceptance, and posts to checkout',
  storeJs.status === 200
    && hasAll(storeJs.text, ['/skyepay/offers', '/skyepay/checkout', 'legal_acceptance', 'selectedOfferId']), {
  status: storeJs.status,
  bytes: storeJs.bytes.length
});

const offersApi = await fetchWithTiming(`${fs27}/skyepay/offers?client=metraiyux-0s`, { headers: { accept: 'application/json' } });
const offersBody = parseJson(offersApi.text) || {};
const selectedOffer = (offersBody.offers || []).find((item) => item.id === offer);
check(receipt, 'SkyePay offers API proves the selected Reape0r offer, delivery links, auth model, and limits',
  offersApi.status === 200
    && offersBody.ok === true
    && selectedOffer?.id === offer
    && selectedOffer?.title === 'Reape0r Pro Access'
    && selectedOffer?.activation_path === 'vault_workspace_auto_provision'
    && selectedOffer?.delivery?.type === 'gated-agent-install'
    && selectedOffer?.delivery?.install_center === `${zeroOs}/skye-vault-os/agent/?offer=${offer}`
    && selectedOffer?.delivery?.package_manifest === `${zeroOs}/downloads/skyevault-agent/latest.json`
    && selectedOffer?.delivery?.agent_package === receipt.surfaces.agentPackage
    && selectedOffer?.delivery?.auth_model === 'skyevault-portal-key-plus-optional-shared-gate'
    && selectedOffer?.rate_limits?.vault_storage_mb >= 25600
    && selectedOffer?.rate_limits?.vault_file_limit >= 1500
    && selectedOffer?.rate_limits?.vault_workspace_limit >= 3, {
  status: offersApi.status,
  totalOffers: Array.isArray(offersBody.offers) ? offersBody.offers.length : 0,
  offerFound: Boolean(selectedOffer),
  title: selectedOffer?.title || '',
  authModel: selectedOffer?.delivery?.auth_model || '',
  vaultStorageMb: selectedOffer?.rate_limits?.vault_storage_mb || 0,
  vaultFileLimit: selectedOffer?.rate_limits?.vault_file_limit || 0,
  vaultWorkspaceLimit: selectedOffer?.rate_limits?.vault_workspace_limit || 0
});

const checkout = await createCheckout();
const sessionId = String(checkout.body?.id || '');
const checkoutUrl = String(checkout.body?.url || '');
const deliveryUrl = String(checkout.body?.delivery_success_url || '');
check(receipt, 'Live SkyePay checkout creates a real unpaid session with agent delivery metadata',
  checkout.status === 200
    && checkout.body?.ok === true
    && sessionId.startsWith('cs_')
    && checkoutUrl.includes('checkout.stripe.com')
    && deliveryUrl.includes('/skye-vault-os/agent/')
    && checkout.body?.activation_path === 'vault_workspace_auto_provision', {
  status: checkout.status,
  session: publicSession(sessionId),
  checkoutHost: checkoutUrl ? new URL(checkoutUrl).host : '',
  deliveryPath: deliveryUrl ? new URL(deliveryUrl).pathname : '',
  paymentStatus: checkout.body?.payment_status || null,
  activationPath: checkout.body?.activation_path || null
});

const statusUrl = `${fs27}/skyepay/status?session_id=${encodeURIComponent(sessionId)}&offer=${encodeURIComponent(offer)}`;
const status = sessionId ? await fetchWithTiming(statusUrl, { headers: { accept: 'application/json' } }) : null;
const statusBody = status ? parseJson(status.text) || {} : {};
check(receipt, 'Pending SkyePay status exposes delivery state but not buyer workspace secrets',
  status?.status === 200
    && statusBody?.order?.offer_id === offer
    && statusBody?.order?.payment_status === 'unpaid'
    && statusBody?.order?.provisioning_status === 'waiting_for_payment'
    && !statusBody?.order?.agent_delivery?.repo_env?.SKYEVAULT_PORTAL_KEY
    && !secretLikeLeak(status?.text || ''), {
  status: status?.status || 0,
  paymentStatus: statusBody?.order?.payment_status || null,
  provisioningStatus: statusBody?.order?.provisioning_status || null,
  agentDelivery: Boolean(statusBody?.order?.agent_delivery),
  portalKeyReturned: Boolean(statusBody?.order?.agent_delivery?.repo_env?.SKYEVAULT_PORTAL_KEY)
});

const installUrl = `${receipt.surfaces.installCenter}?session_id=${encodeURIComponent(sessionId)}&offer=${encodeURIComponent(offer)}`;
const install = sessionId ? await fetchWithTiming(installUrl, { headers: { accept: 'text/html' } }) : null;
check(receipt, 'Install center renders pending buyer state and concrete CLI commands',
  install?.status === 200
    && hasAll(install.text, ['Reape0r: the Autonomous Cloud Repo Mirror', 'Download unlocks after provisioning', 'skyevault-agent', 'sync', 'verify', 'restore'])
    && !secretLikeLeak(install.text), {
  status: install?.status || 0,
  bytes: install?.bytes.length || 0
});

const pendingPackage = sessionId ? await fetchWithTiming(`${receipt.surfaces.agentPackage}?session_id=${encodeURIComponent(sessionId)}&offer=${encodeURIComponent(offer)}`, {
  headers: { accept: 'application/json' }
}) : null;
check(receipt, 'Pending buyer package route is hard locked and returns no tarball',
  pendingPackage?.status === 402
    && pendingPackage.text.includes('skyevault_agent_entitlement_not_unlocked')
    && !pendingPackage.headers['content-disposition']
    && pendingPackage.bytes.length < 2048, {
  status: pendingPackage?.status || 0,
  bytes: pendingPackage?.bytes.length || 0,
  contentType: pendingPackage?.contentType || ''
});

const unauthPackage = await fetchWithTiming(receipt.surfaces.agentPackage, { headers: { accept: 'application/json' } });
check(receipt, 'Unauthenticated package route is not downloadable',
  unauthPackage.status !== 200 && !unauthPackage.headers['content-disposition'], {
  status: unauthPackage.status,
  bytes: unauthPackage.bytes.length,
  contentType: unauthPackage.contentType
});

const webhook = await fetchWithTiming(`${fs27}/.netlify/functions/stripe-webhook`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', accept: 'application/json' },
  body: JSON.stringify({ type: 'checkout.session.completed' })
});
const webhookBody = parseJson(webhook.text) || {};
check(receipt, 'SkyePay payment-provider webhook is mounted and rejects unsigned completion events',
  webhook.status === 400 && webhookBody?.error === 'Missing stripe-signature', {
  status: webhook.status,
  error: webhookBody?.error || null
});

let ownerAuth = { ok: false, token: '', credential: { key: '', source: '' }, response: {} };
try {
  ownerAuth = await resolveZeroOsGateAuth({ zeroOsBase: zeroOs });
} catch (error) {
  ownerAuth = { ok: false, token: '', credential: { key: '', source: '' }, response: { error: error.message } };
}
check(receipt, 'Shared owner gate credential works for proof without creating an app-specific password',
  ownerAuth.ok && Boolean(ownerAuth.token), {
  credentialKey: ownerAuth.credential?.key || '',
  credentialSource: ownerAuth.credential?.source || '',
  status: ownerAuth.response?.status || 0
});

let ownerManifest = null;
let ownerManifestBody = {};
let ownerPackage = null;
if (ownerAuth.ok && ownerAuth.token) {
  ownerManifest = await fetchWithTiming(receipt.surfaces.releaseManifest, { headers: ownerHeaders(ownerAuth.token, 'application/json') });
  ownerManifestBody = parseJson(ownerManifest.text) || {};
  ownerPackage = await fetchWithTiming(receipt.surfaces.agentPackage, { headers: ownerHeaders(ownerAuth.token, 'application/octet-stream') });
}
const manifestSha = ownerManifestBody?.release?.latestSha256 || ownerManifestBody?.release?.sha256 || '';
const ownerPackageSha = ownerPackage?.bytes.length ? sha256(ownerPackage.bytes) : '';
const releaseFiles = (ownerManifestBody?.files || []).map((file) => file.path);
const manifestVersion = ownerManifestBody?.package?.version || '';
check(receipt, 'Owner manifest is the current release with installer, runbook, templates, and exact package bytes',
  ownerManifest?.status === 200
    && /^0\.2\.\d+$/.test(manifestVersion)
    && ownerManifestBody?.release?.id === `v${manifestVersion}`
    && ownerManifestBody?.release?.bytes > 0
    && /^[a-f0-9]{64}$/.test(manifestSha)
    && ['install.sh', 'RUNBOOK.md', 'README.md', 'templates/skyevault-agent.service', 'templates/com.skyevault.reape0r.plist', 'templates/skyevault-agent.env.example'].every((file) => releaseFiles.includes(file)), {
  status: ownerManifest?.status || 0,
  version: manifestVersion,
  releaseId: ownerManifestBody?.release?.id || '',
  bytes: ownerManifestBody?.release?.bytes || 0,
  manifestSha,
  releaseFileCount: releaseFiles.length
});
check(receipt, 'Owner package download matches manifest SHA and byte count',
  ownerPackage?.status === 200
    && ownerPackageSha === manifestSha
    && ownerPackage.bytes.length === ownerManifestBody?.release?.bytes, {
  status: ownerPackage?.status || 0,
  bytes: ownerPackage?.bytes.length || 0,
  sha256: ownerPackageSha,
  manifestSha
});

let downloadedPackageProof = { ok: false };
if (ownerPackage?.status === 200) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'skyevault-agent-sales-package-'));
  try {
    const archivePath = path.join(tempRoot, 'skyevault-agent-latest.tar.gz');
    const extractRoot = path.join(tempRoot, 'extract');
    fs.mkdirSync(extractRoot, { recursive: true });
    fs.writeFileSync(archivePath, ownerPackage.bytes);
    const list = run('live downloaded package archive listing', ['tar', '-tzf', archivePath]);
    receipt.commands.push(list);
    const extract = run('live downloaded package extraction', ['tar', '-xzf', archivePath, '-C', extractRoot]);
    receipt.commands.push(extract);
    const packageRoot = path.join(extractRoot, 'skyevault-agent');
    const packageCli = path.join(packageRoot, 'bin', 'skyevault-agent.mjs');
    const syntax = run('live downloaded CLI syntax', [process.execPath, '--check', packageCli]);
    const version = run('live downloaded CLI version', [process.execPath, packageCli, '--version']);
    const help = run('live downloaded CLI help', [process.execPath, packageCli, '--help']);
    const doctor = run('live downloaded CLI doctor', [process.execPath, packageCli, 'doctor', '--json'], {
      env: { ...process.env, HOME: path.join(tempRoot, 'home') }
    });
    receipt.commands.push(syntax, version, help, doctor);
    const roundTrip = runDownloadedAgentRoundTrip(packageCli);
    downloadedPackageProof = {
      ok: list.ok
        && extract.ok
        && syntax.ok
        && version.ok
        && version.stdout.trim() === manifestVersion
        && help.ok
        && hasAll(help.stdout, ['auto-install', 'sync', 'verify', 'restore', 'SKYEVAULT_PORTAL_KEY'])
        && doctor.ok
        && roundTrip.ok,
      archiveEntries: list.stdout.split(/\r?\n/).filter(Boolean).length,
      version: version.stdout.trim(),
      roundTrip
    };
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}
check(receipt, 'Live downloaded package extracts and proves mutable current mirror, verify, and restore from the shipped CLI',
  downloadedPackageProof.ok, downloadedPackageProof);

let valuation = null;
let valuationBody = {};
if (ownerAuth.ok && ownerAuth.token) {
  valuation = await fetchWithTiming(receipt.surfaces.valuationSource, { headers: ownerHeaders(ownerAuth.token, 'application/json') });
  valuationBody = parseJson(valuation.text) || {};
}
check(receipt, 'Authenticated valuation source reflects the sellable Reape0r lane',
  valuation?.status === 200
    && /(skyevault|reape0r)/i.test(String(valuationBody?.version || ''))
    && valuation.text.includes(manifestVersion)
    && valuation.text.includes(manifestSha), {
  status: valuation?.status || 0,
  version: valuationBody?.version || null
});

const dropHome = await fetchWithTiming(drop, { headers: { accept: 'text/html' } });
check(receipt, 'SkyeVault Drop public surface renders real vault copy',
  dropHome.status === 200 && hasAny(dropHome.text, ['SkyeVault', 'Vault', 'Drop']), {
  status: dropHome.status,
  bytes: dropHome.bytes.length
});

if (ownerAuth.ok && ownerAuth.token && sessionId && manifestSha && ownerPackage?.bytes.length) {
  await runStress(receipt, {
    surfaces: receipt.surfaces,
    sessionId,
    ownerToken: ownerAuth.token,
    manifestSha,
    packageBytes: ownerPackage.bytes.length,
    version: ownerManifestBody?.package?.version || ''
  });
}

receipt.ok = receipt.blockers.length === 0;
receipt.summary = {
  checks: receipt.checks.length,
  commands: receipt.commands.length,
  blockers: receipt.blockers.length,
  stressTotal: receipt.stress?.total || 0,
  stressFailures: receipt.stress?.failureCount || receipt.stress?.failures?.length || 0
};

const stamped = path.join(artifactDir, `${receipt.generatedAt.replace(/[:.]/g, '-')}.json`);
writeJson(stamped, receipt);
writeJson(latestPath, { ...receipt, receiptPath: rel(stamped) });
console.log(JSON.stringify({ ...receipt, receiptPath: rel(stamped) }, null, 2));
if (!receipt.ok) process.exit(1);
