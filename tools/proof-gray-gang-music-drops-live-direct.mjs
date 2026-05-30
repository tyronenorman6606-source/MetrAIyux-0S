#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const baseUrl = (process.env.PROOF_BASE_URL || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const outDir = path.join(repoRoot, 'test-artifacts/gray-gang-requested-songs');
const latestReceiptPath = path.join(outDir, 'latest.json');
const generation = fs.existsSync(latestReceiptPath) ? JSON.parse(fs.readFileSync(latestReceiptPath, 'utf8')) : { results: [] };

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

const directPages = [
  { id: 'collective', path: '/SkyeMusicNexus/artist-storefronts/gray-skyes-collective/', expect: 'Gray Skyes' },
  { id: 'artist-apps', path: '/SkyeMusicNexus/artist-storefronts/artist-apps/', expect: 'All listed app cards include storefront' },
  { id: 'pwa-factory', path: '/founder-command/apps/pwa-factory-v213/', expect: 'PWA Drop Factory' },
  { id: 'nova-app', path: '/SkyeMusicNexus/artist-storefronts/artist-full-matrix-20260523053627/app.html', expect: 'Skye Radio' },
  { id: 'dre-storefront', path: '/SkyeMusicNexus/artist-storefronts/artist-live-browser-20260523060751/', expect: 'Open Drop PWA' },
  { id: 'vox-storefront', path: '/SkyeMusicNexus/artist-storefronts/artist-live-browser-20260523062845/', expect: 'Open Drop PWA' },
  { id: 'jessa-storefront', path: '/SkyeMusicNexus/artist-storefronts/jessica-walsh/', expect: 'Open Drop PWA' }
];

const rawDenied = [
  '/SkyeMusicNexus/artist-storefronts/artist-full-matrix-20260523053627/personality-profile.json',
  '/SkyeMusicNexus/artist-storefronts/artist-full-matrix-20260523053627/profile.json',
  '/SkyeMusicNexus/artist-storefronts/artist-full-matrix-20260523053627/products/products.json',
  '/SkyeMusicNexus/artist-storefronts/artist-full-matrix-20260523053627/release-pipeline.json',
  '/SkyeMusicNexus/artist-storefronts/artist-apps/artist-apps.json',
  '/SkyeMusicNexus/artist-storefronts/gray-skyes-collective/collective.json'
];

const dropPaths = [
  '/SkyeMusicNexus/artist-storefronts/artist-full-matrix-20260523053627/drops/nova-saint-storefront-weather-pwa-drop.zip',
  '/SkyeMusicNexus/artist-storefronts/artist-live-browser-20260523060751/drops/closed-door-voltage-pwa-drop.zip',
  '/SkyeMusicNexus/artist-storefronts/artist-full-matrix-20260524113514/drops/screenlight-survival-pwa-drop.zip',
  '/SkyeMusicNexus/artist-storefronts/artist-live-browser-20260523062845/drops/pixel-heartline-pwa-drop.zip',
  '/SkyeMusicNexus/artist-storefronts/artist-live-browser-20260523062845/drops/signal-hearts-pwa-drop.zip',
  '/SkyeMusicNexus/artist-storefronts/artist-full-matrix-20260524085129/drops/three-suns-after-midnight-pwa-drop.zip',
  '/SkyeMusicNexus/artist-storefronts/smoke-artist-mpku77m6/drops/three-suns-after-midnight-pwa-drop.zip',
  '/SkyeMusicNexus/artist-storefronts/dj-ajay/drops/three-suns-after-midnight-pwa-drop.zip',
  '/SkyeMusicNexus/artist-storefronts/radio-vibez/drops/signal-hearts-pwa-drop.zip',
  '/SkyeMusicNexus/artist-storefronts/jessica-walsh/drops/soft-ghosts-pwa-drop.zip',
  '/SkyeMusicNexus/artist-storefronts/tha-stoves/drops/soft-ghosts-pwa-drop.zip'
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
    'x-free99-gate-session': token,
    'x-skye-gate-session': token,
    'x-skygate-session': token
  };
}

async function resolveOwnerGate() {
  for (const candidate of localSecretCandidates()) {
    const response = await fetch(`${baseUrl}/api/owner/admin-login`, {
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

async function fetchText(pathname, token, options = {}) {
  const started = Date.now();
  const response = await fetch(`${baseUrl}${pathname}`, {
    headers: { ...gateHeaders(token), ...(options.headers || {}) },
    redirect: options.redirect || 'follow'
  });
  const text = await response.text();
  return {
    path: pathname,
    url: `${baseUrl}${pathname}`,
    status: response.status,
    ok: response.ok,
    bytes: Buffer.byteLength(text),
    ms: Date.now() - started,
    contains: options.expect ? text.includes(options.expect) : undefined,
    expect: options.expect || ''
  };
}

async function fetchBytes(pathname, token, minBytes = 1) {
  const started = Date.now();
  const response = await fetch(`${baseUrl}${pathname}`, { headers: gateHeaders(token) });
  const buffer = await response.arrayBuffer();
  return {
    path: pathname,
    url: `${baseUrl}${pathname}`,
    status: response.status,
    ok: response.ok,
    contentType: response.headers.get('content-type') || '',
    bytes: buffer.byteLength,
    minBytes,
    ms: Date.now() - started,
    sizeOk: response.ok && buffer.byteLength >= minBytes
  };
}

async function stress(token) {
  const paths = [
    '/SkyeMusicNexus/artist-storefronts/gray-skyes-collective/',
    '/SkyeMusicNexus/artist-storefronts/artist-live-browser-20260523060751/',
    '/SkyeMusicNexus/artist-storefronts/artist-full-matrix-20260524113514/app.html',
    '/founder-command/apps/pwa-factory-v213/',
    '/api/founder-command/pwa-factory/artists?view=registry',
    '/api/founder-command/pwa-factory/artists?view=collective',
    '/SkyeMusicNexus/artist-storefronts/artist-full-matrix-20260523053627/personality-profile.json'
  ];
  const total = Number(process.env.STRESS_TOTAL || 140);
  const concurrency = Number(process.env.STRESS_CONCURRENCY || 14);
  let index = 0;
  const results = [];
  async function worker() {
    while (index < total) {
      const current = index++;
      const pathname = paths[current % paths.length];
      const started = Date.now();
      const response = await fetch(`${baseUrl}${pathname}`, { headers: gateHeaders(token), redirect: 'manual' }).catch(error => ({ error }));
      if (response?.error) {
        results.push({ pathname, ok: false, status: 0, ms: Date.now() - started, error: response.error.message });
      } else {
        await response.arrayBuffer().catch(() => new ArrayBuffer(0));
        const rawDeniedOk = pathname.endsWith('.json') ? response.status === 404 : response.status >= 200 && response.status < 400;
        results.push({ pathname, ok: rawDeniedOk, status: response.status, ms: Date.now() - started });
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  const failures = results.filter(item => !item.ok);
  const durations = results.map(item => item.ms).sort((a, b) => a - b);
  return {
    ok: failures.length === 0,
    total,
    concurrency,
    failures,
    p50Ms: durations[Math.floor(durations.length * 0.5)] || 0,
    p95Ms: durations[Math.floor(durations.length * 0.95)] || 0,
    maxMs: durations.at(-1) || 0,
    statuses: results.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {})
  };
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const owner = await resolveOwnerGate();
  const unauth = await fetch(`${baseUrl}/SkyeMusicNexus/artist-storefronts/gray-skyes-collective/`, { redirect: 'manual' });
  const pages = [];
  for (const page of directPages) pages.push(await fetchText(page.path, owner.token, { expect: page.expect }));
  const curatedRegistry = await fetchText('/api/founder-command/pwa-factory/artists?view=registry', owner.token, { expect: 'rawDossiersExposed' });
  const curatedCollective = await fetchText('/api/founder-command/pwa-factory/artists?view=collective', owner.token, { expect: 'Gray Gang' });
  const denied = [];
  for (const pathname of rawDenied) denied.push(await fetchText(pathname, owner.token));
  const streams = [];
  for (const result of generation.results || []) {
    if (result.assetId) streams.push(await fetchBytes(`/api/skymusicnexus/music-assets?action=stream&id=${encodeURIComponent(result.assetId)}`, owner.token, 1000000));
  }
  const zips = [];
  for (const pathname of dropPaths) zips.push(await fetchBytes(pathname, owner.token, 1000000));
  const stressResult = await stress(owner.token);
  const receipt = {
    schema: 'skyemusicnexus.gray-gang-live-direct-proof.v1',
    ok: true,
    baseUrl,
    generatedAt: new Date().toISOString(),
    auth: { ok: true, sourceKey: owner.sourceKey },
    deployVersion: process.env.ZERO_OS_WORKER_VERSION || process.env.WORKER_VERSION || 'live-production-current',
    unauthGate: {
      path: '/SkyeMusicNexus/artist-storefronts/gray-skyes-collective/',
      status: unauth.status,
      location: unauth.headers.get('location') || '',
      ok: [301, 302, 303, 307, 308].includes(unauth.status) && String(unauth.headers.get('location') || '').includes('/admin/login')
    },
    pages,
    curatedApis: [curatedRegistry, curatedCollective],
    rawDossierDenied: denied.map(item => ({ ...item, ok: item.status === 404 && item.bytes > 20 })),
    audioStreams: streams,
    pwaDropZips: zips,
    stress: stressResult,
    links: {
      collective: `${baseUrl}/SkyeMusicNexus/artist-storefronts/gray-skyes-collective/`,
      artistApps: `${baseUrl}/SkyeMusicNexus/artist-storefronts/artist-apps/`,
      pwaFactory: `${baseUrl}/founder-command/apps/pwa-factory-v213/`,
      novaApp: `${baseUrl}/SkyeMusicNexus/artist-storefronts/artist-full-matrix-20260523053627/app.html`,
      dreStorefront: `${baseUrl}/SkyeMusicNexus/artist-storefronts/artist-live-browser-20260523060751/`,
      solStorefront: `${baseUrl}/SkyeMusicNexus/artist-storefronts/artist-full-matrix-20260524113514/`,
      voxStorefront: `${baseUrl}/SkyeMusicNexus/artist-storefronts/artist-live-browser-20260523062845/`,
      pwaFactoryCuratedRegistry: `${baseUrl}/api/founder-command/pwa-factory/artists?view=registry`
    }
  };
  receipt.ok = receipt.unauthGate.ok
    && receipt.pages.every(item => item.ok && item.contains)
    && receipt.curatedApis.every(item => item.ok && item.contains)
    && receipt.rawDossierDenied.every(item => item.ok)
    && receipt.audioStreams.every(item => item.sizeOk && /^audio\//i.test(item.contentType))
    && receipt.pwaDropZips.every(item => item.sizeOk)
    && receipt.stress.ok;
  const out = path.join(outDir, `live-direct-proof-${Date.now()}.json`);
  fs.writeFileSync(out, JSON.stringify(receipt, null, 2) + '\n');
  fs.writeFileSync(path.join(outDir, 'live-direct-proof-latest.json'), JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify({
    ok: receipt.ok,
    receipt: out,
    pages: receipt.pages.length,
    denied: receipt.rawDossierDenied.length,
    streams: receipt.audioStreams.length,
    zips: receipt.pwaDropZips.length,
    stress: receipt.stress
  }, null, 2));
  if (!receipt.ok) process.exit(1);
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exit(1);
});
