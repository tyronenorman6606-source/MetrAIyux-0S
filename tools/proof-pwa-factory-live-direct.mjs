#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';

const repoRoot = process.cwd();
const baseUrl = (process.env.PROOF_BASE_URL || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const outDir = path.join(repoRoot, 'test-artifacts/founder-command-pwa-drop-factory');
fs.mkdirSync(outDir, { recursive: true });

const nova = {
  artistId: 'artist_full_matrix_20260523053627',
  artistSlug: 'artist-full-matrix-20260523053627',
  artistName: 'Nova Saint',
  assetId: 'aud_01b93295-0441-4386-bb16-ece7a4148c24',
  productId: 'prod_4dc19dd3-0d70-4129-889f-6cebda85bf44',
  titleNeedle: 'Signal in the Static'
};

const secretKeys = [
  'MCP_GATE_SESSION',
  'QUANTUMSKYES_MCP_TOKEN',
  'FREE99_ADMIN_CODE',
  'FREE99_GATE_CODE',
  'OWNER_ADMIN_CODE',
  'ADMIN_CODE',
  'ZERO_OS_ADMIN_CODE',
  'METRAIYUX_OWNER_ADMIN_CODE',
  'FS27_ADMIN_CODE',
  'SKYGATEFS27_ADMIN_CODE',
  'SKYGATE_ADMIN_CODE',
  'SKYGATE_OWNER_CODE',
  'SKYE_GATE_ADMIN_CODE',
  'SKYE_GATE_OWNER_CODE'
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

function parseEnvText(text) {
  const rows = {};
  for (const raw of String(text || '').split(/\r?\n/)) {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const normalized = trimmed.startsWith('export ') ? trimmed.slice(7).trim() : trimmed;
    const match = normalized.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*(?:=|:)\s*(.*)$/);
    if (match) rows[match[1]] = unquote(match[2]);
  }
  return rows;
}

function expandCandidate(value) {
  const out = [];
  const clean = unquote(value).replace(/^Bearer\s+/i, '').trim();
  if (!clean) return out;
  out.push(clean);
  try {
    const parsed = JSON.parse(clean);
    for (const key of ['token', 'gateToken', 'gateBearerToken', 'bearer', 'session', 'ownerToken']) {
      if (typeof parsed?.[key] === 'string') out.push(parsed[key].replace(/^Bearer\s+/i, '').trim());
    }
  } catch {
    // Plain secret candidate.
  }
  return out.filter(Boolean);
}

function localCandidates() {
  const merged = {
    ...parseEnvText(readText(path.join(repoRoot, '.env'))),
    ...parseEnvText(readText(path.join(repoRoot, 'env.txt'))),
    ...parseEnvText(readText(path.join(repoRoot, 'ADMIN_REFERENCE.md'))),
    ...process.env
  };
  const candidates = [];
  const seen = new Set();
  for (const key of secretKeys) {
    for (const value of expandCandidate(merged[key])) {
      if (seen.has(value)) continue;
      seen.add(value);
      candidates.push({ key, value });
    }
  }
  return candidates;
}

function gateHeaders(token, extra = {}) {
  return {
    authorization: `Bearer ${token}`,
    'x-free99-gate-session': token,
    'x-skye-gate-session': token,
    'x-skygate-session': token,
    ...extra
  };
}

async function resolveOwnerGate(receipt) {
  for (const candidate of localCandidates()) {
    try {
      const response = await fetch(`${baseUrl}/api/owner/admin-login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: candidate.value }),
        signal: AbortSignal.timeout(20000)
      });
      const data = await response.json().catch(() => ({}));
      const token = String(data.gateToken || data.gateBearerToken || data.token || '').replace(/^Bearer\s+/i, '').trim();
      receipt.auth.attempts.push({ sourceKey: candidate.key, status: response.status, ok: response.ok && Boolean(token) });
      if (response.ok && token) return { token, sourceKey: candidate.key };
    } catch (error) {
      receipt.auth.attempts.push({ sourceKey: candidate.key, ok: false, error: String(error?.message || error).slice(0, 120) });
    }
  }
  throw new Error('No shared 0S owner/admin credential unlocked /api/owner/admin-login.');
}

async function fetchSurface(route, token, options = {}) {
  const started = performance.now();
  const response = await fetch(`${baseUrl}${route}`, {
    method: options.method || 'GET',
    headers: gateHeaders(token, options.headers || {}),
    body: options.body,
    redirect: options.redirect || 'follow',
    signal: AbortSignal.timeout(options.timeoutMs || 30000)
  });
  const contentType = response.headers.get('content-type') || '';
  const raw = options.arrayBuffer
    ? Buffer.from(await response.arrayBuffer())
    : await response.text();
  const elapsedMs = Math.round(performance.now() - started);
  return {
    route,
    url: `${baseUrl}${route}`,
    status: response.status,
    ok: response.ok,
    elapsedMs,
    contentType,
    bytes: Buffer.isBuffer(raw) ? raw.length : Buffer.byteLength(raw),
    body: raw
  };
}

function assertContains(label, text, needles) {
  const missing = needles.filter((needle) => !String(text).includes(needle));
  return { label, ok: missing.length === 0, missing };
}

function assertForbidden(label, text, patterns) {
  const matches = patterns
    .map((pattern) => ({ pattern: String(pattern), matched: pattern.test(String(text)) }))
    .filter((item) => item.matched);
  return { label, ok: matches.length === 0, matches };
}

function runLiveFactoryZip(jsSource, audioBytes) {
  const context = {
    console,
    Blob,
    TextEncoder,
    Uint8Array,
    URL,
    Date,
    Math,
    JSON,
    setTimeout,
    clearTimeout,
    requestAnimationFrame() {},
    devicePixelRatio: 1,
    Image: function Image() {},
    document: {
      querySelector() { return null; },
      querySelectorAll() { return []; },
      addEventListener() {}
    },
    window: {
      addEventListener() {},
      SkyePwaFactoryInternals: null
    }
  };
  vm.createContext(context);
  vm.runInContext(jsSource, context, { filename: 'live-pwa-factory.js' });
  if (!context.window.SkyePwaFactoryInternals?.createZip) {
    throw new Error('Live PWA Factory JS did not expose createZip internals.');
  }
  return context.window.SkyePwaFactoryInternals.createZip([
    { name: 'index.html', bytes: new TextEncoder().encode('<!doctype html><title>Nova Saint Proof Drop</title><audio controls src="audio/nova-saint.mp3"></audio>') },
    { name: 'manifest.json', bytes: new TextEncoder().encode(JSON.stringify({ name: 'Nova Saint Proof Drop', start_url: './index.html', display: 'standalone' })) },
    { name: 'sw.js', bytes: new TextEncoder().encode("self.addEventListener('fetch',()=>{});") },
    { name: 'audio/nova-saint.mp3', bytes: new Uint8Array(audioBytes) },
    { name: 'drop-receipt.json', bytes: new TextEncoder().encode(JSON.stringify({ ok: true, artist: nova.artistName, assetId: nova.assetId })) }
  ]);
}

async function runStress(token) {
  const targets = [
    '/founder-command/apps/pwa-factory-v213/',
    '/founder-command/apps/pwa-factory-v213/assets/pwa-factory.css',
    '/founder-command/apps/pwa-factory-v213/assets/pwa-factory.js',
    '/founder-command/apps/pwa-factory-v213/manifest.json',
    '/founder-command/apps/pwa-factory-v213/drop-factory-manifest.json',
    `/api/skymusicnexus/music-store?artistId=${encodeURIComponent(nova.artistId)}`,
    `/api/skymusicnexus/music-assets?artistId=${encodeURIComponent(nova.artistId)}`
  ];
  const total = Number(process.env.PWA_FACTORY_STRESS_TOTAL || 100);
  const concurrency = Number(process.env.PWA_FACTORY_STRESS_CONCURRENCY || 10);
  const timings = [];
  const failures = [];
  let index = 0;
  async function worker() {
    while (index < total) {
      const current = index++;
      const route = targets[current % targets.length];
      try {
        const result = await fetchSurface(route, token, { timeoutMs: 30000 });
        timings.push(result.elapsedMs);
        if (!result.ok) failures.push({ route, status: result.status, bytes: result.bytes });
      } catch (error) {
        failures.push({ route, error: String(error?.message || error).slice(0, 160) });
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  const sorted = [...timings].sort((a, b) => a - b);
  const p95 = sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] : 0;
  return {
    total,
    concurrency,
    ok: failures.length === 0,
    failures,
    p95Ms: p95,
    maxMs: sorted[sorted.length - 1] || 0
  };
}

async function main() {
  const receipt = {
    schema: 'founder-command.pwa-drop-factory.live-direct-proof.v2',
    checkedAt: new Date().toISOString(),
    baseUrl,
    auth: { ok: false, attempts: [] },
    nova,
    gate: {},
    surfaces: [],
    assertions: [],
    stress: null,
    links: {
      pwaDropFactory: `${baseUrl}/founder-command/apps/pwa-factory-v213/`,
      manifest: `${baseUrl}/founder-command/apps/pwa-factory-v213/drop-factory-manifest.json`,
      novaStorefront: `${baseUrl}/SkyeMusicNexus/artist-storefronts/${nova.artistSlug}/`,
      novaArtistApp: `${baseUrl}/SkyeMusicNexus/artist-storefronts/${nova.artistSlug}/app/`,
      novaSongStream: `${baseUrl}/api/skymusicnexus/music-assets?action=stream&id=${encodeURIComponent(nova.assetId)}`
    }
  };

  const owner = await resolveOwnerGate(receipt);
  receipt.auth.ok = true;
  receipt.auth.sourceKey = owner.sourceKey;

  const unauth = await fetch(`${baseUrl}/founder-command/apps/pwa-factory-v213/`, {
    redirect: 'manual',
    signal: AbortSignal.timeout(20000)
  });
  receipt.gate.unauthStatus = unauth.status;
  receipt.gate.unauthLocation = unauth.headers.get('location') || '';

  const surfaceRoutes = [
    '/founder-command/apps/pwa-factory-v213/',
    '/founder-command/apps/pwa-factory-v213/assets/pwa-factory.css',
    '/founder-command/apps/pwa-factory-v213/assets/pwa-factory.js',
    '/founder-command/apps/pwa-factory-v213/manifest.json',
    '/founder-command/apps/pwa-factory-v213/sw.js',
    '/founder-command/apps/pwa-factory-v213/drop-factory-manifest.json',
    '/founder-command/apps/pwa-factory-v213/founder-drop-bridge.js'
  ];
  const surfaceResults = {};
  for (const route of surfaceRoutes) {
    const result = await fetchSurface(route, owner.token);
    surfaceResults[route] = result;
    receipt.surfaces.push({
      route,
      status: result.status,
      ok: route.endsWith('founder-drop-bridge.js') ? result.status === 404 : result.ok,
      elapsedMs: result.elapsedMs,
      bytes: result.bytes,
      contentType: result.contentType
    });
  }

  const html = surfaceResults['/founder-command/apps/pwa-factory-v213/'].body;
  const js = surfaceResults['/founder-command/apps/pwa-factory-v213/assets/pwa-factory.js'].body;
  const manifest = JSON.parse(surfaceResults['/founder-command/apps/pwa-factory-v213/drop-factory-manifest.json'].body);
  receipt.assertions.push(assertContains('live-html-new-runtime-copy', html, [
    'PWA Drop Factory',
    'No donor dependency / no browser provider keys',
    '/api/founder-command/pwa-factory/analyze'
  ]));
  receipt.assertions.push(assertContains('live-js-zip-audio-bundler', js, [
    'SkyePwaFactoryInternals',
    'fetchMaybeBundleAudio',
    'createZip',
    '/api/skymusicnexus/music-assets'
  ]));
  receipt.assertions.push(assertForbidden('no-browser-provider-or-cdn-runtime', `${html}\n${js}`, [
    /cdn\.tailwindcss/i,
    /cdnjs/i,
    /unpkg/i,
    /fonts\.google/i,
    /sharemyimage/i,
    /generativelanguage/i,
    /gemini/i,
    /api-key-input/i,
    /JSZip/i,
    /FileSaver/i,
    /xi-api-key/i,
    /ELEVENLABS_API_KEY/i,
    /STABILITY_API_KEY/i,
    /OPENAI_API_KEY/i
  ]));
  receipt.assertions.push({
    label: 'manifest-0s-owned-auth-policy',
    ok: manifest.runtimeIndependentOfDonorZip === true
      && manifest.authPolicy?.browserProviderKeys === false
      && manifest.authPolicy?.appLocalPasswords === false
      && manifest.authPolicy?.directBrowserProviderCalls === false,
    manifestStatus: manifest.status
  });

  const store = await fetchSurface(`/api/skymusicnexus/music-store?artistId=${encodeURIComponent(nova.artistId)}`, owner.token);
  const storeJson = JSON.parse(store.body);
  const product = (storeJson.products || []).find((item) => item.productId === nova.productId || item.id === nova.productId || String(item.title || '').includes(nova.titleNeedle));
  receipt.nova.store = {
    status: store.status,
    ok: store.ok && Boolean(product),
    products: storeJson.products?.length || 0,
    matchedProductId: product?.productId || product?.id || '',
    matchedTitle: product?.title || '',
    priceCents: product?.priceCents || null
  };

  const assets = await fetchSurface(`/api/skymusicnexus/music-assets?artistId=${encodeURIComponent(nova.artistId)}`, owner.token);
  const assetsJson = JSON.parse(assets.body);
  const asset = (assetsJson.assets || []).find((item) => item.id === nova.assetId);
  receipt.nova.assets = {
    status: assets.status,
    ok: assets.ok && Boolean(asset),
    total: assetsJson.assets?.length || 0,
    matchedAssetId: asset?.id || '',
    bytes: asset?.bytes || null,
    contentType: asset?.contentType || ''
  };

  const stream = await fetchSurface(`/api/skymusicnexus/music-assets?action=stream&id=${encodeURIComponent(nova.assetId)}`, owner.token, { arrayBuffer: true, timeoutMs: 60000 });
  receipt.nova.stream = {
    status: stream.status,
    ok: stream.ok && stream.bytes > 1_000_000 && /^audio\//i.test(stream.contentType),
    bytes: stream.bytes,
    contentType: stream.contentType
  };

  const zipBlob = await runLiveFactoryZip(js, stream.body);
  const zipPath = path.join(outDir, 'live-nova-saint-song-drop.zip');
  fs.writeFileSync(zipPath, Buffer.from(await zipBlob.arrayBuffer()));
  const unzipList = execFileSync('unzip', ['-l', zipPath], { encoding: 'utf8' });
  const unzipTest = execFileSync('unzip', ['-t', zipPath], { encoding: 'utf8' });
  receipt.nova.packagedDrop = {
    ok: /audio\/nova-saint\.mp3/.test(unzipList) && /No errors detected/.test(unzipTest),
    path: path.relative(repoRoot, zipPath),
    bytes: fs.statSync(zipPath).size,
    containsAudio: /audio\/nova-saint\.mp3/.test(unzipList),
    unzipOk: /No errors detected/.test(unzipTest)
  };

  const aiResponse = await fetch(`${baseUrl}/api/founder-command/pwa-factory/analyze`, {
    method: 'POST',
    headers: gateHeaders(owner.token, { 'content-type': 'application/json' }),
    body: JSON.stringify({
      title: 'Nova Saint Proof Drop',
      artistName: nova.artistName,
      mode: 'nexus_single',
      tracks: [{ title: nova.titleNeedle, artistName: nova.artistName, assetId: nova.assetId }],
      request: 'Return a compact PWA manifest plan for this gated Nexus single.'
    }),
    signal: AbortSignal.timeout(60000)
  });
  const aiJson = await aiResponse.json().catch(() => ({}));
  receipt.gateAi = {
    status: aiResponse.status,
    ok: aiResponse.ok && aiJson.ok !== false && aiJson.gate_owned !== false,
    providerPath: aiJson.provider_path || '',
    gateOwned: aiJson.gate_owned !== false,
    hasManifest: Boolean(aiJson.manifest)
  };

  receipt.stress = await runStress(owner.token);
  receipt.ok = receipt.gate.unauthStatus >= 300
    && receipt.gate.unauthStatus < 400
    && receipt.surfaces.every((item) => item.ok)
    && receipt.assertions.every((item) => item.ok)
    && receipt.nova.store.ok
    && receipt.nova.assets.ok
    && receipt.nova.stream.ok
    && receipt.nova.packagedDrop.ok
    && receipt.gateAi.ok
    && receipt.stress.ok;
  receipt.finishedAt = new Date().toISOString();

  const receiptPath = path.join(outDir, 'live-direct-smoke.json');
  fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify({
    ok: receipt.ok,
    receipt: path.relative(repoRoot, receiptPath),
    packagedDrop: receipt.nova.packagedDrop.path,
    novaStreamBytes: receipt.nova.stream.bytes,
    stress: receipt.stress,
    links: receipt.links
  }, null, 2));
  if (!receipt.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
