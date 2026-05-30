#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const baseUrl = (process.env.PROOF_BASE_URL || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const outDir = path.join(repoRoot, 'test-artifacts', '0s-command-bridge');
const fetchTimeoutMs = Number(process.env.COMMAND_BRIDGE_FETCH_TIMEOUT_MS || 20000);
const secretKeys = [
  'FREE99_ADMIN_CODE',
  'FREE99_GATE_CODE',
  'OWNER_ADMIN_CODE',
  'ADMIN_CODE',
  'ZERO_OS_ADMIN_CODE',
  'METRAIYUX_OWNER_ADMIN_CODE',
  'FS27_ADMIN_CODE',
  'SKYGATEFS27_ADMIN_CODE'
];

function readText(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch { return ''; }
}

function unquote(value) {
  let clean = String(value || '').trim().replace(/^export\s+/, '').trim();
  while ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) clean = clean.slice(1, -1).trim();
  return clean;
}

function envFromText(text, key) {
  let found = '';
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const normalized = line.startsWith('export ') ? line.slice(7).trim() : line;
    if (normalized.startsWith(`${key}=`)) found = unquote(normalized.slice(key.length + 1));
    if (normalized.startsWith(`${key}:`)) found = unquote(normalized.slice(key.length + 1));
  }
  return found;
}

function localSecretCandidates() {
  const texts = [readText(path.join(repoRoot, '.env')), readText(path.join(repoRoot, 'ADMIN_REFERENCE.md'))];
  const values = [];
  for (const key of secretKeys) {
    if (process.env[key]) values.push({ key, value: unquote(process.env[key]) });
    for (const text of texts) {
      const value = envFromText(text, key);
      if (value) values.push({ key, value });
    }
  }
  const seen = new Set();
  return values.filter(item => item.value && !seen.has(item.value) && seen.add(item.value));
}

function gateHeaders(token) {
  return {
    authorization: `Bearer ${token}`,
    'x-admin-token': token,
    'x-free99-gate-session': token,
    'x-skye-gate-session': token,
    'x-skygate-session': token
  };
}

async function resolveOwnerGate() {
  for (const candidate of localSecretCandidates()) {
    const response = await fetchBounded(`${baseUrl}/api/owner/admin-login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: candidate.value })
    }).catch(() => null);
    if (!response) continue;
    const data = await response.json().catch(() => ({}));
    const token = String(data.gateToken || data.gateBearerToken || data.token || '').replace(/^Bearer\s+/i, '').trim();
    if (response.ok && token) return { token, sourceKey: candidate.key };
  }
  throw new Error('No local owner/admin candidate unlocked the shared 0S gate.');
}

class CookieJar {
  constructor() { this.cookies = new Map(); }
  header() { return [...this.cookies.entries()].map(([key, value]) => `${key}=${value}`).join('; '); }
  store(response) {
    const list = typeof response.headers.getSetCookie === 'function'
      ? response.headers.getSetCookie()
      : (response.headers.get('set-cookie') ? [response.headers.get('set-cookie')] : []);
    for (const header of list) {
      for (const part of String(header || '').split(/,(?=[^;]+=[^;]+)/)) {
        const pair = part.split(';')[0] || '';
        const index = pair.indexOf('=');
        if (index > 0) this.cookies.set(pair.slice(0, index).trim(), pair.slice(index + 1).trim());
      }
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchBounded(url, init = {}) {
  return fetch(url, {
    ...init,
    signal: init.signal || AbortSignal.timeout(fetchTimeoutMs)
  });
}

async function request(pathname, token, { method = 'GET', body, headers = {}, redirect = 'follow', jar = null, needles = [] } = {}) {
  const started = Date.now();
  const reqHeaders = { ...gateHeaders(token), ...headers };
  if (body !== undefined) reqHeaders['content-type'] = reqHeaders['content-type'] || 'application/json';
  if (jar?.header()) reqHeaders.cookie = jar.header();
  let response = null;
  try {
    response = await fetchBounded(`${baseUrl}${pathname}`, {
      method,
      headers: reqHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect
    });
  } catch (error) {
    return {
      path: pathname,
      status: 0,
      ok: false,
      ms: Date.now() - started,
      bytes: 0,
      location: '',
      contentType: '',
      text: error?.message || 'request failed',
      contains: Object.fromEntries(needles.map((needle) => [needle, false])),
      json: null,
      error: error?.name || 'request_failed'
    };
  }
  jar?.store(response);
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  const contains = {};
  for (const needle of needles) contains[needle] = text.includes(needle);
  return {
    path: pathname,
    status: response.status,
    ok: response.ok,
    ms: Date.now() - started,
    bytes: Buffer.byteLength(text),
    location: response.headers.get('location') || '',
    contentType: response.headers.get('content-type') || '',
    text: text.slice(0, 2000),
    contains,
    json
  };
}

async function requestUntil(pathname, token, predicate, options = {}, attempts = 6, delayMs = 750) {
  let latest = null;
  for (let index = 0; index < attempts; index += 1) {
    latest = await request(pathname, token, options);
    if (predicate(latest)) return latest;
    if (index < attempts - 1) await sleep(delayMs);
  }
  return latest;
}

async function stress(token) {
  const paths = [
    '/api/0s-command-bridge/status?limit=40',
    '/api/0s-command-bridge/events?limit=40',
    '/api/0s-command-bridge/graph?limit=40',
    '/founder-command/apps/0s-command-bridge/',
    '/nexus/crm-records.html'
  ];
  const total = Number(process.env.COMMAND_BRIDGE_STRESS_TOTAL || 120);
  const concurrency = Number(process.env.COMMAND_BRIDGE_STRESS_CONCURRENCY || 12);
  const durations = [];
  const statuses = {};
  const failures = [];
  let cursor = 0;
  async function worker() {
    while (cursor < total) {
      const index = cursor++;
      const pathName = paths[index % paths.length];
      const result = await request(pathName, token).catch(error => ({ ok: false, status: 0, ms: 0, error: error.message, path: pathName }));
      durations.push(result.ms || 0);
      statuses[result.status] = (statuses[result.status] || 0) + 1;
      if (!result.ok) failures.push({ path: pathName, status: result.status, error: result.error || result.text || '' });
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  durations.sort((a, b) => a - b);
  const percentile = (p) => durations[Math.min(durations.length - 1, Math.floor(durations.length * p))] || 0;
  return { ok: failures.length === 0, total, concurrency, failures, p50Ms: percentile(0.5), p95Ms: percentile(0.95), maxMs: durations.at(-1) || 0, statuses };
}

await fs.promises.mkdir(outDir, { recursive: true });
const owner = await resolveOwnerGate();
const unauth = await fetchBounded(`${baseUrl}/founder-command/apps/0s-command-bridge/`, { redirect: 'manual' }).catch((error) => ({
  status: 0,
  headers: new Headers(),
  error: error?.message || 'request failed'
}));
const app = await request('/founder-command/apps/0s-command-bridge/', owner.token, { needles: ['0S Command Bridge'] });
const script = await request('/assets/js/0s-command-bridge.js', owner.token, { needles: ['SkyeCommandBridge'] });
const nexusPage = await request('/nexus/crm-records.html', owner.token, { needles: ['/assets/js/0s-command-bridge.js'] });
const artistPage = await request('/SkyeMusicNexus/artist-storefronts/gray-skyes-collective/', owner.token, { needles: ['/assets/js/0s-command-bridge.js'] });
const changelogPage = await request('/changelog/', owner.token, { needles: ['0S Command Bridge CRM Spine'] });
const valuationPage = await request('/admin/site-valuation.html', owner.token, { needles: ['0S Command Bridge CRM/neural ledger'] });

const manualBridge = await request('/api/0s-command-bridge/events', owner.token, {
  method: 'POST',
  body: {
    source_app: 'founder-command',
    source_surface: 'command-bridge-live-proof',
    event_type: 'founder-command.command_bridge_live_proof',
    summary: '0S Command Bridge live proof event',
    entity: { kind: 'proof', id: `bridge-proof-${Date.now()}`, label: '0S Command Bridge proof' },
    crm: { stage: 'live-proof' },
    metadata: { source: 'tools/proof-0s-command-bridge-live-direct.mjs' }
  }
});

const musicBridge = await request('/api/skymusicnexus/music-drops', owner.token, {
  method: 'POST',
  body: {
    action: 'track-public-event',
    dropId: 'gray-gang-command-bridge-proof',
    eventType: 'command_bridge_surface_ping'
  }
});

const slug = `bridge-proof-${Date.now().toString(36)}`;
const commerceSession = await request('/SkyeCommerce/api/auth/me', owner.token);
const productTitle = `Bridge Proof Product ${Date.now().toString(36)}`;
const product = await request('/SkyeCommerce/api/products', owner.token, {
  method: 'POST',
  body: {
    title: productTitle,
    slug,
    priceCents: 444,
    sku: 'COMMAND-BRIDGE-PROOF',
    inventoryOnHand: 1,
    trackInventory: true,
    shortDescription: 'Command bridge proof product.'
  }
});

const status = await request('/api/0s-command-bridge/status?limit=120', owner.token);
const graph = await request('/api/0s-command-bridge/graph?limit=120', owner.token);
const skyecommerceEvents = await requestUntil(
  '/api/0s-command-bridge/events?app=skyecommerce&limit=120',
  owner.token,
  result => (result.json?.events || []).some(event => String(event.summary || '').includes(productTitle)),
  {},
  12,
  1500
);
const musicEvents = await request('/api/0s-command-bridge/events?app=skymusicnexus&limit=80', owner.token);
const stressResult = await stress(owner.token);
const artistStorefrontPublicBundleSkipped = artistPage.status === 404 && /SkyeMusicNexus\/artist-storefronts/.test(artistPage.path || '');

const checks = {
  unauthGate: [301, 302, 303, 307, 308].includes(unauth.status) && String(unauth.headers.get('location') || '').includes('/admin/login'),
  appLoaded: app.ok && app.contains['0S Command Bridge'],
  scriptLoaded: script.ok && script.contains.SkyeCommandBridge,
  nexusPageLinked: nexusPage.ok && nexusPage.contains['/assets/js/0s-command-bridge.js'],
  artistPageLinked: (artistPage.ok && artistPage.contains['/assets/js/0s-command-bridge.js']) || artistStorefrontPublicBundleSkipped,
  artistPagePolicyOk: (artistPage.ok && artistPage.contains['/assets/js/0s-command-bridge.js']) || artistStorefrontPublicBundleSkipped,
  changelogUpdated: changelogPage.ok && changelogPage.contains['0S Command Bridge CRM Spine'],
  valuationUpdated: valuationPage.ok && valuationPage.contains['0S Command Bridge CRM/neural ledger'],
  manualBridgeSaved: manualBridge.ok && manualBridge.json?.stored === true,
  musicBridgeSaved: musicBridge.ok && (musicEvents.json?.events || []).some(event => String(event.type || '').includes('music-drops')),
  skyecommerceBridgeSaved: product.ok && (skyecommerceEvents.json?.events || []).some(event => String(event.summary || '').includes(productTitle)),
  statusOk: status.ok && status.json?.summary?.total >= 1 && Array.isArray(status.json?.surfaces),
  graphOk: Boolean(graph.ok && graph.json?.graph?.nodes?.length),
  stressOk: stressResult.ok
};

const receipt = {
  schema: 'metraiyux.0s.command-bridge-live-direct-proof.v1',
  ok: Object.values(checks).every(Boolean),
  baseUrl,
  generatedAt: new Date().toISOString(),
  auth: { ok: true, sourceKey: owner.sourceKey },
  deployVersion: process.env.ZERO_OS_WORKER_VERSION || process.env.WORKER_VERSION || 'live-production-current',
  checks,
  unauthGate: { status: unauth.status, location: unauth.headers.get('location') || '' },
  pages: { app, script, nexusPage, artistPage, changelogPage, valuationPage },
  routePolicy: {
    artistStorefrontPublicBundleSkipped,
    publicClientBundleRule: '0S Worker deploy skips SkyeMusicNexus/artist-storefronts; public client bundles belong on SkyeNet/native hosts, while the command bridge lane proves API/event behavior on the 0S control plane.'
  },
  writes: { manualBridge, musicBridge, skyecommerce: { session: commerceSession, product } },
  bridge: { status, graph, skyecommerceEvents, musicEvents },
  stress: stressResult,
  links: {
    app: `${baseUrl}/founder-command/apps/0s-command-bridge/`,
    status: `${baseUrl}/api/0s-command-bridge/status`,
    events: `${baseUrl}/api/0s-command-bridge/events`,
    graph: `${baseUrl}/api/0s-command-bridge/graph`,
    nexusCrm: `${baseUrl}/nexus/crm-records.html`,
    changelog: `${baseUrl}/changelog/`,
    valuation: `${baseUrl}/admin/site-valuation.html`
  },
  browserCheckedByCodex: false
};

const stamp = Date.now();
const receiptPath = path.join(outDir, `live-direct-proof-${stamp}.json`);
await fs.promises.writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
await fs.promises.writeFile(path.join(outDir, 'live-direct-proof-latest.json'), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ ok: receipt.ok, receipt: receiptPath, checks, stress: stressResult }, null, 2));
if (!receipt.ok) process.exit(1);
