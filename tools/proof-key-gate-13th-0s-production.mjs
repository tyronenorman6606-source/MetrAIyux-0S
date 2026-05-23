#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';

const repoRoot = '/workspaces/MetrAIyux-0S';
const baseUrl = (process.env.PROOF_BASE_URL || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const appPath = '/key-gate-13th/';
const artifactDir = path.join(repoRoot, 'test-artifacts', 'key-gate-13th', '0s-live-proof');
const deploymentVersion = process.env.PROOF_DEPLOYMENT_VERSION || '7926263e-9a3e-456b-b76e-d7f87bd6753b';
const adminEmail = process.env.PROOF_OWNER_EMAIL || 'owner-proof@metraiyux.local';
const runId = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
const navTimeoutMs = Number(process.env.PROOF_NAV_TIMEOUT_MS || 90000);

const secretKeys = [
  'FREE99_ADMIN_CODE',
  'FREE99_GATE_CODE',
  'OWNER_ADMIN_CODE',
  'ADMIN_CODE',
  'FS27_ADMIN_CODE',
  'FS27_ADMIN_PASSWORD',
  'SKYGATEFS27_ADMIN_CODE',
  'SKYGATEFS27_ADMIN_PASSWORD',
  'SKYGATEFS13_ADMIN_PASSWORD',
  'QA_ADMIN_PASSWORD',
  'PHC_BOOTSTRAP_ADMIN_CODE',
  'FREE99_ADMIN_PASSWORD',
  'FREE99_GATE_PASSWORD',
  'OWNER_ADMIN_PASSWORD',
  'ADMIN_PASSWORD',
  'SITE_OPERATOR_ADMIN_TOKEN',
  'METRAIYUX_ADMIN_TOKEN',
  'ADMIN_TOKEN'
];

function readText(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return '';
  }
}

function unquote(value) {
  let clean = String(value || '').trim().replace(/^export\s+/, '').trim();
  while ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
    clean = clean.slice(1, -1).trim();
  }
  return clean;
}

function envFromText(text, key) {
  let found = '';
  for (const line of String(text || '').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const normalized = trimmed.startsWith('export ') ? trimmed.slice(7).trim() : trimmed;
    if (normalized.startsWith(`${key}=`)) found = unquote(normalized.slice(key.length + 1));
    if (normalized.startsWith(`${key}:`)) found = unquote(normalized.slice(key.length + 1));
  }
  return found;
}

function allSecrets(keys) {
  const texts = [
    readText(path.join(repoRoot, '.env')),
    readText(path.join(repoRoot, 'ADMIN_REFERENCE.md')),
    readText(path.join(repoRoot, 'metraiyux_0s_site', 'skyegate', 'source', 'SkyeGateFS27', '.env'))
  ];
  const values = [];
  for (const key of keys) {
    const direct = unquote(process.env[key] || '');
    if (direct) values.push(direct);
    for (const text of texts) {
      const value = envFromText(text, key);
      if (value) values.push(value);
    }
  }
  return [...new Set(values.filter(Boolean))];
}

function relaunchWithXvfbWhenNeeded() {
  if (process.platform !== 'linux') return;
  if (process.env.DISPLAY || process.env.LIVE_BROWSER_XVFB_ACTIVE === '1') return;
  const probe = spawnSync('which', ['xvfb-run'], { encoding: 'utf8' });
  if (probe.status !== 0) return;
  const child = spawnSync('xvfb-run', ['-a', process.execPath, ...process.argv.slice(1)], {
    stdio: 'inherit',
    env: { ...process.env, LIVE_BROWSER_XVFB_ACTIVE: '1' }
  });
  process.exit(child.status ?? 1);
}

function urlFor(route) {
  return new URL(route, baseUrl).toString();
}

function cleanFailure(error) {
  return String(error?.stack || error?.message || error)
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/g, '$1[redacted]')
    .replace(/(code=)[^&\s)]+/gi, '$1[redacted]')
    .replace(/kg13-[a-z0-9-]{10,}/gi, '[redacted-proof-secret]')
    .split('\n')
    .slice(0, 12)
    .join('\n');
}

function assertCondition(condition, message) {
  if (!condition) throw new Error(message);
}

function assertNoRaw(label, value, secrets) {
  const text = typeof value === 'string' ? value : JSON.stringify(value || {});
  for (const secret of secrets.filter(Boolean)) {
    if (text.includes(secret)) throw new Error(`raw_secret_leaked_in_${label}`);
  }
}

async function checkUnauth(route, accept = 'text/html') {
  const response = await fetch(urlFor(route), { redirect: 'manual', headers: { accept } });
  const location = response.headers.get('location') || '';
  return {
    route,
    status: response.status,
    gateHeader: response.headers.get('x-0s-gate') || '',
    locationPath: location ? new URL(location, baseUrl).pathname : '',
    hasReturn: location.includes('return='),
    ok: route.startsWith('/api/')
      ? response.status === 401 && response.headers.get('x-0s-gate') === 'fs27-required'
      : response.status === 302 && location.includes('/admin/login.html') && location.includes('return=')
  };
}

async function resolveOwnerGate() {
  for (const code of allSecrets(secretKeys)) {
    try {
      const response = await fetch(urlFor('/api/owner/admin-login'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code })
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.token) return { code, token: data.token };
    } catch {
      // Try the next candidate without printing local gate material.
    }
  }
  throw new Error('No local owner/admin candidate unlocked the shared 0S gate.');
}

async function apiFetch(pathname, token, options = {}) {
  const response = await fetch(urlFor(pathname), {
    ...options,
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(async () => ({ raw: await response.text().catch(() => '') }));
  return { response, data };
}

function cyclePayload(workspaceId, credentialRef) {
  return {
    workspace_id: workspaceId,
    business: {
      name: 'Key Gate Proof Studio',
      domain: 'example.com',
      locations: ['Phoenix, AZ'],
      services: ['agentic website engine', 'autonomous SEO monitoring']
    },
    keywords: ['agentic website platform', 'phoenix seo automation'],
    pages: [
      { url: '/', title: 'Agentic Website Engine', type: 'home' },
      { url: '/services/agentic-websites', title: 'Agentic Websites', type: 'service' }
    ],
    competitors: [{ domain: 'example.org', notes: 'proof competitor fixture' }],
    sourceConfig: {
      semrush: {
        credentialRef,
        domain: 'example.com',
        database: 'us',
        limit: 1
      }
    }
  };
}

async function runApiProof(token) {
  const workspaceId = `kg13-live-proof-${runId}`;
  const rawA = `kg13-api-secret-${crypto.randomUUID()}`;
  const rawB = `kg13-api-rotated-${crypto.randomUUID()}`;
  const leaked = [rawA, rawB];
  const checks = [];

  const health = await apiFetch('/api/key-gate-13th/health', token);
  assertCondition(health.response.ok && health.data.ok, 'authenticated_key_gate_health_failed');
  assertCondition(health.data.auth_mode === 'fs27_shared_gate_only', 'key_gate_health_auth_mode_not_fs27');
  assertCondition(health.data.encryption_configured === true, 'key_gate_encryption_not_configured');
  assertCondition(health.data.storage_configured === true, 'key_gate_storage_not_configured');
  checks.push({
    name: 'authenticated dedicated health',
    ok: true,
    encryptionConfigured: health.data.encryption_configured,
    storageConfigured: health.data.storage_configured,
    routeCount: health.data.route_families?.length || 0
  });

  const create = await apiFetch('/api/key-gate-13th/v1/secrets', token, {
    method: 'POST',
    body: JSON.stringify({
      workspace_id: workspaceId,
      vendorKey: 'semrush',
      label: `Live API proof ${runId}`,
      secret: rawA,
      allowedApps: ['agentic-growth-layer', 'key-gate-13th'],
      scopes: ['agentic-growth:semrush']
    })
  });
  assertCondition(create.response.status === 201 && create.data.secret?.id, 'key_create_failed');
  assertNoRaw('create_response', create.data, leaked);
  const secret = create.data.secret;
  checks.push({ name: 'create encrypted credential', ok: true, id: secret.id, last4: secret.last4, status: secret.status });

  const list = await apiFetch(`/api/key-gate-13th/v1/secrets?workspace_id=${encodeURIComponent(workspaceId)}`, token);
  assertCondition(list.response.ok && list.data.items?.some(item => item.id === secret.id), 'key_list_missing_created_secret');
  assertNoRaw('list_response', list.data, leaked);
  checks.push({ name: 'list returns masked metadata only', ok: true, count: list.data.count, rawSecretReturned: false });

  const test = await apiFetch(`/api/key-gate-13th/v1/secrets/${encodeURIComponent(secret.id)}/test`, token, {
    method: 'POST',
    body: JSON.stringify({ workspace_id: workspaceId, live: false })
  });
  assertCondition(test.response.ok && test.data.test?.status === 'offline-validated', 'offline_provider_test_failed');
  assertNoRaw('test_response', test.data, leaked);
  checks.push({ name: 'offline decrypt/provider-shape test', ok: true, testStatus: test.data.test.status });

  const credentialRef = { id: secret.id, workspace_id: workspaceId, vendor_key: 'semrush' };
  const agentic = await apiFetch('/api/agentic-growth/v1/cycles/pull', token, {
    method: 'POST',
    body: JSON.stringify(cyclePayload(workspaceId, credentialRef))
  });
  assertCondition(agentic.response.ok && agentic.data.ok, 'agentic_cycle_with_credential_ref_failed');
  assertNoRaw('agentic_resolution_response', agentic.data, leaked);
  const resolved = agentic.data.sourcePullReceipt?.receipts?.find(item => item.source === 'semrush' && item.broker === 'key-gate-13th');
  assertCondition(resolved?.ok === true, 'agentic_did_not_resolve_key_gate_ref');
  checks.push({ name: 'Agentic Growth resolves credentialRef through Key Gate', ok: true, broker: resolved.broker });

  const rawProbe = `kg13-raw-payload-${crypto.randomUUID()}`;
  const rejected = await apiFetch('/api/agentic-growth/v1/cycles/pull', token, {
    method: 'POST',
    body: JSON.stringify({
      workspace_id: workspaceId,
      business: { name: 'Raw Rejection Proof', domain: 'example.com' },
      sourceConfig: { semrush: { apiKey: rawProbe, domain: 'example.com' } }
    })
  });
  assertCondition(rejected.response.status === 400 && rejected.data.error === 'raw_provider_credentials_rejected', 'raw_provider_payload_was_not_rejected');
  assertNoRaw('raw_rejection_response', rejected.data, [rawProbe]);
  checks.push({ name: 'Agentic Growth rejects raw provider keys', ok: true, rejectedPaths: rejected.data.rejected_paths || [] });

  const rotate = await apiFetch(`/api/key-gate-13th/v1/secrets/${encodeURIComponent(secret.id)}/rotate`, token, {
    method: 'POST',
    body: JSON.stringify({
      workspace_id: workspaceId,
      vendorKey: 'semrush',
      label: `Live API proof rotated ${runId}`,
      secret: rawB,
      allowedApps: ['agentic-growth-layer', 'key-gate-13th'],
      scopes: ['agentic-growth:semrush']
    })
  });
  assertCondition(rotate.response.ok && rotate.data.secret?.version >= 2, 'key_rotate_failed');
  assertNoRaw('rotate_response', rotate.data, leaked);
  checks.push({ name: 'rotate encrypted credential', ok: true, version: rotate.data.secret.version, last4: rotate.data.secret.last4 });

  const revoke = await apiFetch(`/api/key-gate-13th/v1/secrets/${encodeURIComponent(secret.id)}/revoke`, token, {
    method: 'POST',
    body: JSON.stringify({ workspace_id: workspaceId, reason: 'production_proof_complete' })
  });
  assertCondition(revoke.response.ok && revoke.data.secret?.status === 'revoked', 'key_revoke_failed');
  assertNoRaw('revoke_response', revoke.data, leaked);
  checks.push({ name: 'revoke credential', ok: true, status: revoke.data.secret.status });

  const revokedTest = await apiFetch(`/api/key-gate-13th/v1/secrets/${encodeURIComponent(secret.id)}/test`, token, {
    method: 'POST',
    body: JSON.stringify({ workspace_id: workspaceId, live: false })
  });
  assertCondition(!revokedTest.response.ok && /revoked/i.test(revokedTest.data.error || ''), 'revoked_key_was_not_blocked');
  assertNoRaw('revoked_test_response', revokedTest.data, leaked);
  checks.push({ name: 'revoked credential blocks server resolution', ok: true, status: revokedTest.response.status });

  const revokedAgentic = await apiFetch('/api/agentic-growth/v1/cycles/pull', token, {
    method: 'POST',
    body: JSON.stringify(cyclePayload(workspaceId, credentialRef))
  });
  assertCondition(revokedAgentic.response.ok && revokedAgentic.data.ok, 'revoked_agentic_cycle_response_failed');
  const revokedReceipt = revokedAgentic.data.sourcePullReceipt?.receipts?.find(item => item.source === 'semrush' && item.broker === 'key-gate-13th');
  assertCondition(revokedReceipt?.ok === false && /revoked/i.test(revokedReceipt.error || ''), 'agentic_did_not_block_revoked_key_gate_ref');
  assertNoRaw('revoked_agentic_response', revokedAgentic.data, leaked);
  checks.push({ name: 'Agentic Growth blocks revoked credentialRef', ok: true, broker: revokedReceipt.broker });

  const project = await apiFetch('/api/agentic-growth/v1/projects', token, {
    method: 'POST',
    body: JSON.stringify({
      workspace_id: workspaceId,
      name: `Key Gate monitor ${runId}`,
      domain: 'example.com',
      credentials: { semrush: { credentialRef } },
      schedule: { enabled: true, cadence: 'weekly' }
    })
  });
  assertCondition(project.response.ok && project.data.project?.id, 'agentic_project_binding_failed');
  checks.push({ name: 'Agentic project saved with credentialRef binding', ok: true, id: project.data.project.id });

  const audit = await apiFetch(`/api/key-gate-13th/v1/audit?workspace_id=${encodeURIComponent(workspaceId)}`, token);
  const auditTypes = new Set((audit.data.items || []).map(item => item.type));
  for (const type of ['key_gate_13th.secret.created', 'key_gate_13th.secret.tested', 'key_gate_13th.secret.rotated', 'key_gate_13th.secret.revoked']) {
    assertCondition(auditTypes.has(type), `missing_audit_${type}`);
  }
  assertNoRaw('audit_response', audit.data, leaked);
  checks.push({ name: 'audit records custody lifecycle without raw secrets', ok: true, auditCount: audit.data.items?.length || 0 });

  const stressCount = Number(process.env.PROOF_KEY_GATE_STRESS_COUNT || 16);
  const stressWorkspace = `${workspaceId}-stress`;
  const stressStarted = Date.now();
  const stressSecrets = Array.from({ length: stressCount }, (_, index) => ({
    index,
    secret: `kg13-stress-${runId}-${index}-${crypto.randomUUID()}`
  }));
  const created = await Promise.all(stressSecrets.map(item => apiFetch('/api/key-gate-13th/v1/secrets', token, {
    method: 'POST',
    body: JSON.stringify({
      workspace_id: stressWorkspace,
      vendorKey: 'semrush',
      label: `Stress key ${item.index}`,
      secret: item.secret,
      allowedApps: ['agentic-growth-layer', 'key-gate-13th'],
      scopes: ['agentic-growth:semrush']
    })
  })));
  assertCondition(created.every(item => item.response.status === 201 && item.data.secret?.id), 'stress_create_failed');
  for (const item of created) assertNoRaw('stress_create_response', item.data, stressSecrets.map(row => row.secret));
  const stressIds = created.map(item => item.data.secret.id);
  const tested = await Promise.all(stressIds.slice(0, Math.min(8, stressIds.length)).map(id => apiFetch(`/api/key-gate-13th/v1/secrets/${encodeURIComponent(id)}/test`, token, {
    method: 'POST',
    body: JSON.stringify({ workspace_id: stressWorkspace, live: false })
  })));
  assertCondition(tested.every(item => item.response.ok && item.data.test?.status === 'offline-validated'), 'stress_test_failed');
  const stressList = await apiFetch(`/api/key-gate-13th/v1/secrets?workspace_id=${encodeURIComponent(stressWorkspace)}`, token);
  assertCondition(stressList.response.ok && stressList.data.count >= stressCount, 'stress_list_count_failed');
  assertNoRaw('stress_list_response', stressList.data, stressSecrets.map(row => row.secret));
  const revoked = await Promise.all(stressIds.map(id => apiFetch(`/api/key-gate-13th/v1/secrets/${encodeURIComponent(id)}/revoke`, token, {
    method: 'POST',
    body: JSON.stringify({ workspace_id: stressWorkspace, reason: 'controlled_stress_cleanup' })
  })));
  assertCondition(revoked.every(item => item.response.ok && item.data.secret?.status === 'revoked'), 'stress_revoke_failed');
  checks.push({
    name: 'controlled live concurrency check',
    ok: true,
    creates: stressCount,
    tests: tested.length,
    revokes: revoked.length,
    elapsedMs: Date.now() - stressStarted
  });

  return { workspaceId, checks };
}

async function loginOwner(page, code, entry) {
  const loginUrl = new URL('/admin/login.html', baseUrl);
  loginUrl.searchParams.set('return', appPath);
  const response = await page.goto(loginUrl.toString(), { waitUntil: 'domcontentloaded', timeout: navTimeoutMs });
  entry.actions.push('opened shared 0S owner login');
  entry.statuses.push({ name: 'owner_login_loaded', ok: Boolean(response?.ok()), status: response?.status() || 0 });
  await page.waitForSelector('input[name="code"]', { timeout: 20000 });
  await page.fill('input[name="code"]', code);
  const emailInput = page.locator('input[name="email"]');
  if (await emailInput.count()) await emailInput.fill(adminEmail);
  const gate = await page.evaluate(async (ownerCode) => {
    const response = await fetch('/api/owner/admin-login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: ownerCode })
    });
    const data = await response.json().catch(() => ({}));
    return {
      ok: response.ok && Boolean(data.token),
      status: response.status,
      hasOwnerToken: Boolean(data.token),
      hasGateToken: Boolean(data.gateToken || data.gateBearerToken),
      error: data.error || ''
    };
  }, code);
  entry.statuses.push({ name: 'browser_context_owner_login', ok: gate.ok, state: gate });
  if (!gate.ok) throw new Error(`Owner login failed in browser context: ${gate.error || gate.status}`);
  const appResponse = await page.goto(urlFor(appPath), { waitUntil: 'domcontentloaded', timeout: navTimeoutMs });
  entry.statuses.push({ name: 'returned_to_key_gate_surface', ok: Boolean(appResponse?.ok()), status: appResponse?.status() || 0 });
  entry.actions.push('entered Key Gate 13th through shared FS27 owner session');
}

async function visibleMetrics(page) {
  return page.evaluate(() => {
    const text = document.body?.innerText || '';
    const elements = [...document.querySelectorAll('body *')];
    const visibleElements = elements.filter((el) => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 1 && rect.height > 1 && style.display !== 'none' && style.visibility !== 'hidden' && rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth;
    }).length;
    const images = [...document.images].map(img => ({
      src: img.currentSrc || img.src || '',
      complete: img.complete,
      width: img.naturalWidth || 0,
      height: img.naturalHeight || 0
    }));
    const brokenImages = images.filter(img => img.src && (!img.complete || img.width < 1 || img.height < 1)).length;
    const maxRight = Math.max(document.documentElement.scrollWidth || 0, document.body?.scrollWidth || 0);
    return {
      viewport: { width: innerWidth, height: innerHeight },
      textLength: text.trim().length,
      visibleElements,
      imageCount: images.length,
      brokenImages,
      horizontalOverflowPx: Math.max(0, maxRight - document.documentElement.clientWidth),
      path: location.pathname
    };
  });
}

async function screenshot(page, entry, name) {
  const file = path.join(artifactDir, `${entry.label}-${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  entry.screenshots.push(file);
  return file;
}

async function scrollProof(page, entry) {
  const scrollHeight = await page.evaluate(() => Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight || 0));
  const viewportHeight = page.viewportSize()?.height || 800;
  const stops = [];
  for (let y = 0; y < scrollHeight; y += Math.max(280, Math.floor(viewportHeight * 0.72))) stops.push(y);
  if (!stops.includes(scrollHeight - viewportHeight)) stops.push(Math.max(0, scrollHeight - viewportHeight));
  for (const y of [...new Set(stops)].slice(0, 18)) {
    await page.evaluate(top => window.scrollTo(0, top), y);
    await page.waitForTimeout(180);
    const metrics = await visibleMetrics(page);
    const shot = await screenshot(page, entry, `scroll-${String(y).padStart(5, '0')}`);
    const ok = metrics.textLength > 80 && metrics.visibleElements > 6 && metrics.brokenImages === 0 && metrics.horizontalOverflowPx <= 2;
    entry.scrollStops.push({ y, ok, metrics, screenshot: shot });
    if (!ok) throw new Error(`Visual scroll proof failed at ${y}: ${JSON.stringify(metrics)}`);
  }
}

async function observe(page, entry) {
  page.on('console', (message) => {
    if (message.type() === 'error') entry.consoleErrors.push(message.text());
  });
  page.on('requestfailed', (request) => {
    entry.failedRequests.push({ url: request.url(), method: request.method(), failure: request.failure()?.errorText || 'request failed' });
  });
  page.on('response', (response) => {
    const status = response.status();
    if (status >= 400) {
      entry.httpErrors.push({ url: response.url(), status, method: response.request().method(), resourceType: response.request().resourceType() });
    }
  });
}

async function exerciseKeyGateUi(page, entry) {
  const workspace = `kg13-ui-proof-${runId}-${entry.label}`;
  const firstSecret = `kg13-ui-secret-${crypto.randomUUID()}`;
  const rotatedSecret = `kg13-ui-rotated-${crypto.randomUUID()}`;
  const label = `UI proof SEMrush ${entry.label}`;
  const rawValues = [firstSecret, rotatedSecret];
  await page.waitForSelector('text=Key Gate 13th', { timeout: 30000 });
  await page.waitForFunction(() => document.querySelector('#cryptoState')?.textContent?.includes('AES-GCM'), null, { timeout: 30000 });
  await page.waitForFunction(() => document.querySelector('#storageState')?.textContent?.includes('KV'), null, { timeout: 30000 });
  await screenshot(page, entry, 'loaded');

  await page.fill('#workspaceId', workspace);
  await page.selectOption('#vendorKey', 'semrush');
  await page.fill('#label', label);
  await page.fill('#allowedApps', 'key-gate-13th, agentic-growth-layer');
  await page.fill('#scopes', 'agentic-growth:semrush');
  await page.fill('#secretValue', firstSecret);
  await page.click('#secretForm button[type="submit"]');
  await page.waitForFunction(label => document.body.innerText.includes(label), label, { timeout: 30000 });
  await page.locator('#secretRows tr[data-id]').filter({ hasText: label }).first().click({ timeout: 30000 });
  entry.actions.push('created encrypted SEMrush key from dashboard');
  assertNoRaw('browser_after_create', await page.textContent('body'), rawValues);

  await page.click('#testSecret');
  await page.waitForFunction(() => document.body.innerText.includes('passed') || document.body.innerText.includes('offline-validated'), null, { timeout: 30000 });
  entry.actions.push('ran dashboard credential test');

  await page.fill('#secretValue', rotatedSecret);
  await page.click('#rotateSecret');
  await page.waitForTimeout(1200);
  entry.actions.push('rotated selected key from dashboard');
  assertNoRaw('browser_after_rotate', await page.textContent('body'), rawValues);

  await page.click('#refreshSecrets');
  await page.waitForTimeout(800);
  await page.selectOption('#semrushRef', { index: 1 });
  await page.fill('#projectName', `UI monitor ${entry.label}`);
  await page.fill('#projectDomain', 'example.com');
  await page.selectOption('#cadence', 'weekly');
  await page.click('#projectForm button[type="submit"]');
  await page.waitForFunction(label => document.body.innerText.includes(label), `UI monitor ${entry.label}`, { timeout: 30000 });
  entry.actions.push('bound selected credentialRef to Agentic Growth monitor');

  await page.click('#refreshAudit');
  await page.waitForFunction(() => document.querySelectorAll('#auditList .list-item').length > 1, null, { timeout: 30000 });
  entry.actions.push('refreshed custody audit ledger');

  await page.click('#revokeSecret');
  await page.waitForFunction(() => document.body.innerText.includes('revoked'), null, { timeout: 30000 });
  entry.actions.push('revoked dashboard key');
  assertNoRaw('browser_after_revoke', await page.textContent('body'), rawValues);

  const browserState = await page.evaluate((secrets) => {
    const storageValues = [
      ...Object.values(localStorage),
      ...Object.values(sessionStorage)
    ].join('\n');
    const body = document.body?.innerText || '';
    return {
      title: document.title,
      hasAuth: document.querySelector('#authState')?.textContent || '',
      hasCrypto: document.querySelector('#cryptoState')?.textContent || '',
      hasStorage: document.querySelector('#storageState')?.textContent || '',
      rows: document.querySelectorAll('#secretRows tr[data-id]').length,
      auditItems: document.querySelectorAll('#auditList .list-item').length,
      projectItems: document.querySelectorAll('#projectList .list-item').length,
      rawSecretInBody: secrets.some(secret => body.includes(secret)),
      rawSecretInStorage: secrets.some(secret => storageValues.includes(secret))
    };
  }, rawValues);
  entry.statuses.push({
    name: 'key_gate_dashboard_state',
    ok: browserState.rows > 0 && browserState.auditItems > 1 && browserState.projectItems > 0 && !browserState.rawSecretInBody && !browserState.rawSecretInStorage,
    state: browserState
  });
}

async function runViewport(browser, ownerCode, viewport, label, storageState = null) {
  const context = await browser.newContext({
    viewport,
    ignoreHTTPSErrors: true,
    ...(storageState ? { storageState } : {})
  });
  const page = await context.newPage();
  const entry = {
    label,
    viewport,
    actions: [],
    statuses: [],
    screenshots: [],
    scrollStops: [],
    consoleErrors: [],
    failedRequests: [],
    httpErrors: []
  };
  await observe(page, entry);
  if (storageState) {
    const response = await page.goto(urlFor(appPath), { waitUntil: 'domcontentloaded', timeout: navTimeoutMs });
    entry.statuses.push({ name: 'reused_shared_gate_session', ok: Boolean(response?.ok()), status: response?.status() || 0 });
    entry.actions.push('reused authenticated shared 0S gate session');
  } else {
    await loginOwner(page, ownerCode, entry);
  }
  await exerciseKeyGateUi(page, entry);
  await scrollProof(page, entry);
  entry.finalMetrics = await visibleMetrics(page);
  const nextStorageState = await context.storageState();
  await context.close();
  return { entry, storageState: nextStorageState };
}

async function main() {
  relaunchWithXvfbWhenNeeded();
  fs.mkdirSync(artifactDir, { recursive: true });
  const receipt = {
    ok: false,
    product: 'Key Gate 13th Platform',
    surface: `${baseUrl}${appPath}`,
    deploymentVersion,
    generatedAt: new Date().toISOString(),
    unauth: [],
    apiProof: null,
    entries: [],
    failures: []
  };

  try {
    receipt.unauth.push(await checkUnauth(appPath, 'text/html'));
    receipt.unauth.push(await checkUnauth('/api/key-gate-13th/health', 'application/json'));
    if (!receipt.unauth.every(item => item.ok)) throw new Error(`Unauth gate checks failed: ${JSON.stringify(receipt.unauth)}`);

    const owner = await resolveOwnerGate();
    receipt.apiProof = await runApiProof(owner.token);

    const browser = await chromium.launch({ headless: false, slowMo: Number(process.env.LIVE_BROWSER_SLOWMO || 70) });
    try {
      const desktop = await runViewport(browser, owner.code, { width: 1440, height: 960 }, 'desktop');
      receipt.entries.push(desktop.entry);
      const mobile = await runViewport(browser, owner.code, { width: 390, height: 844 }, 'mobile', desktop.storageState);
      receipt.entries.push(mobile.entry);
    } finally {
      await browser.close();
    }

    const materialHttpErrors = receipt.entries.flatMap(entry => entry.httpErrors).filter(item => {
      if (item.url.includes('/api/owner/admin-login')) return false;
      return item.status >= 400;
    });
    receipt.materialHttpErrors = materialHttpErrors;
    receipt.ok = receipt.entries.every(entry =>
      entry.statuses.every(status => status.ok !== false)
      && entry.scrollStops.every(stop => stop.ok)
      && entry.consoleErrors.length === 0
      && entry.failedRequests.length === 0
    ) && materialHttpErrors.length === 0 && receipt.apiProof?.checks?.every(check => check.ok);
    if (!receipt.ok) throw new Error('Key Gate 13th live proof found failures.');
  } catch (error) {
    receipt.failures.push(cleanFailure(error));
  }

  receipt.completedAt = new Date().toISOString();
  const receiptPath = path.join(artifactDir, 'receipt.json');
  fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify({
    ok: receipt.ok,
    receipt: receiptPath,
    apiChecks: receipt.apiProof?.checks?.length || 0,
    entries: receipt.entries.map(entry => ({
      label: entry.label,
      actions: entry.actions.length,
      scrollStops: entry.scrollStops.length,
      consoleErrors: entry.consoleErrors.length,
      failedRequests: entry.failedRequests.length,
      httpErrors: entry.httpErrors.length
    })),
    failures: receipt.failures
  }, null, 2));
  process.exit(receipt.ok ? 0 : 1);
}

main();
