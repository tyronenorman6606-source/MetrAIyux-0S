#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';

const repoRoot = '/workspaces/MetrAIyux-0S';
const baseUrl = (process.env.PROOF_BASE_URL || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const deploymentVersion = process.env.PROOF_DEPLOYMENT_VERSION || 'unknown';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const artifactDir = path.join(repoRoot, 'test-artifacts', 'live-browser-verifier', `${stamp}-skyemusicnexus-production-command-dashboard`);
const reportPath = path.join(artifactDir, 'live-browser-verification-report.json');

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

const localSecrets = allSecrets(secretKeys);

function redact(value) {
  let text = typeof value === 'string' ? value : JSON.stringify(value || {});
  for (const secret of localSecrets) {
    if (secret) text = text.split(secret).join('[redacted]');
  }
  return text
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/g, '$1[redacted]')
    .replace(/(code=)[^&\s)]+/gi, '$1[redacted]');
}

function cleanToken(value) {
  return String(value || '').replace(/^Bearer(?:\s+|$)/i, '').trim();
}

function urlFor(route) {
  return new URL(route, baseUrl).toString();
}

function gateHeaders(token) {
  const clean = cleanToken(token);
  return clean ? {
    authorization: `Bearer ${clean}`,
    'x-free99-gate-session': clean,
    'x-skye-gate-session': clean,
    'x-skygate-session': clean
  } : {};
}

function sharedSession(token, source = 'owner-admin-login') {
  return {
    token: cleanToken(token),
    source,
    platform_id: 'metraiyux-0s',
    usage_lane: 'fs27-owner-gate',
    client: 'MetrAIyux 0S',
    issued_at: new Date().toISOString()
  };
}

function addCheck(entry, name, ok, state = {}) {
  entry.checks.push({ name, ok: Boolean(ok), state });
  if (!ok) entry.failures.push(`${entry.viewportLabel || 'api'}: ${name}`);
}

function summarizePayload(payload) {
  if (!payload || typeof payload !== 'object') return { type: typeof payload };
  const summary = {};
  for (const key of ['ok', 'schema_version', 'error', 'base', 'storage_mode', 'gateSessionRequired']) {
    if (payload[key] != null) summary[key] = payload[key];
  }
  for (const key of ['artist', 'asset', 'release', 'drop', 'request', 'thread', 'post', 'project', 'export', 'visuals']) {
    if (!payload[key]) continue;
    summary[key] = payload[key]?.id || payload[key]?.artistId || payload[key]?.releaseId || payload[key]?.dropId || payload[key]?.schema_version || true;
  }
  return summary;
}

async function checkUnauth(route, accept = 'text/html') {
  const response = await fetch(urlFor(route), { redirect: 'manual', headers: { accept } });
  const location = response.headers.get('location') || '';
  const locationPath = location ? new URL(location, baseUrl).pathname : '';
  return {
    route,
    status: response.status,
    gateHeader: response.headers.get('x-0s-gate') || '',
    locationPath,
    hasReturn: location.includes('return='),
    ok: route.startsWith('/api/')
      ? response.status === 401 && response.headers.get('x-0s-gate') === 'fs27-required'
      : response.status === 302 && location.includes('/admin/login.html') && location.includes('return=')
  };
}

async function resolveOwnerGate() {
  for (const code of localSecrets) {
    try {
      const response = await fetch(urlFor('/api/owner/admin-login'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code })
      });
      const data = await response.json().catch(() => ({}));
      const token = cleanToken(data.gateToken || data.gateBearerToken || data.token);
      if (response.ok && token) return { code, token, source: data.gateToken || data.gateBearerToken ? 'fs27-admin-login' : 'owner-admin-login' };
    } catch {
      // Try the next local owner/admin candidate without printing it.
    }
  }
  throw new Error('No local owner/admin candidate unlocked the shared 0S gate.');
}

function observe(page, entry, allowedHttpErrors = []) {
  page.on('console', message => {
    if (message.type() === 'error') entry.consoleErrors.push(redact(message.text()).slice(0, 1000));
  });
  page.on('requestfailed', request => {
    const failure = request.failure()?.errorText || 'request failed';
    if (failure.includes('ERR_ABORTED')) return;
    entry.failedRequests.push({ url: request.url(), method: request.method(), resourceType: request.resourceType(), failure });
  });
  page.on('response', response => {
    if (response.status() < 400) return;
    const url = response.url();
    if (allowedHttpErrors.some(item => url.includes(item.urlIncludes) && response.status() === item.status)) return;
    if (['favicon.ico', 'fonts.googleapis.com', 'fonts.gstatic.com'].some(fragment => url.includes(fragment))) return;
    entry.httpErrors.push({ url, status: response.status(), method: response.request().method(), resourceType: response.request().resourceType() });
  });
}

async function screenshot(page, entry, label) {
  const file = path.join(artifactDir, `${entry.viewportLabel}-${label}.png`);
  await page.screenshot({ path: file, fullPage: false });
  const stat = fs.statSync(file);
  entry.screenshots.push({ label, path: file, bytes: stat.size });
  return file;
}

async function loginThroughOwnerPage(page, context, owner, entry, returnPath) {
  const loginUrl = new URL('/admin/login.html', baseUrl);
  loginUrl.searchParams.set('return', returnPath);
  const response = await page.goto(loginUrl.toString(), { waitUntil: 'domcontentloaded', timeout: 60000 });
  addCheck(entry, 'owner_login_page_opened', Boolean(response?.ok()), { status: response?.status() || 0, url: page.url() });
  await page.locator('input[name="code"]').fill(owner.code);
  const browserSession = await page.evaluate(async ({ proofCode }) => {
    const response = await fetch('/api/owner/admin-login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: proofCode })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `owner login failed (${response.status})`);
    const token = String(data.gateToken || data.gateBearerToken || data.token || '').replace(/^Bearer(?:\s+|$)/i, '').trim();
    const shared = {
      token,
      source: data.gateToken || data.gateBearerToken ? 'fs27-admin-login' : 'owner-admin-login',
      platform_id: 'metraiyux-0s',
      usage_lane: 'fs27-owner-gate',
      client: 'MetrAIyux 0S',
      issued_at: new Date().toISOString()
    };
    for (const key of ['FREE99_PLATFORM_GATE_SESSION', 'SKYE_MUSIC_NEXUS_GATE_SESSION', 'METRAIYUX_GATE_SESSION']) {
      sessionStorage.setItem(key, JSON.stringify(shared));
      localStorage.setItem(key, JSON.stringify(shared));
    }
    sessionStorage.setItem('skye_music_nexus_session', token);
    return { hasToken: Boolean(token), source: shared.source };
  }, { proofCode: owner.code });
  addCheck(entry, 'owner_login_issued_browser_session', browserSession.hasToken, { source: browserSession.source });
  entry.actions.push('logged in through the shared owner gate page');
}

async function installSharedSession(context, token, source) {
  const session = sharedSession(token, source);
  await context.addInitScript((shared) => {
    for (const key of ['FREE99_PLATFORM_GATE_SESSION', 'SKYE_MUSIC_NEXUS_GATE_SESSION', 'METRAIYUX_GATE_SESSION']) {
      sessionStorage.setItem(key, JSON.stringify(shared));
      localStorage.setItem(key, JSON.stringify(shared));
    }
    sessionStorage.setItem('skye_music_nexus_session', shared.token);
  }, session);
}

async function api(page, entry, method, route, body, expectOk = true) {
  const result = await page.evaluate(async ({ method, route, body }) => {
    const raw = sessionStorage.getItem('FREE99_PLATFORM_GATE_SESSION') || localStorage.getItem('FREE99_PLATFORM_GATE_SESSION') || '{}';
    let token = '';
    try { token = JSON.parse(raw).token || ''; } catch {}
    const headers = { 'content-type': 'application/json' };
    if (token) {
      headers.authorization = `Bearer ${token}`;
      headers['x-free99-gate-session'] = token;
      headers['x-skye-gate-session'] = token;
      headers['x-skygate-session'] = token;
    }
    const response = await fetch(route, {
      method,
      credentials: 'include',
      headers,
      body: body == null ? undefined : JSON.stringify(body)
    });
    const text = await response.text();
    let payload = text;
    try { payload = text ? JSON.parse(text) : null; } catch {}
    return { ok: response.ok, status: response.status, payload };
  }, { method, route, body });
  entry.actions.push(`${method} ${route} -> ${result.status}`);
  entry.apiCalls.push({ method, route, status: result.status, ok: result.ok, summary: summarizePayload(result.payload) });
  if (expectOk && !result.ok) throw new Error(`${method} ${route} failed ${result.status}: ${redact(result.payload).slice(0, 800)}`);
  return result.payload;
}

async function seedLiveMusicWorkflow(page, entry) {
  const suffix = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
  const artistId = `artist_live_browser_${suffix}`;
  const releaseId = `release_live_browser_${suffix}`;

  const artist = (await api(page, entry, 'POST', '/api/skymusicnexus/music-artists', {
    action: 'register',
    id: artistId,
    name: `Live Browser Artist ${suffix}`,
    email: `live-browser-${suffix}@musicnexus.local`,
    genre: ['browser-proof', 'release-ops'],
    bio: 'Production live-browser workflow seed for SkyeMusicNexus.'
  })).artist;

  const asset = (await api(page, entry, 'POST', '/api/skymusicnexus/music-assets', {
    action: 'upload',
    artistId,
    title: `Live Browser Preview ${suffix}`,
    fileName: `live-browser-preview-${suffix}.mp3`,
    contentType: 'audio/mpeg',
    bytes: 4096,
    dataBase64: Buffer.from(`live-browser-audio-${suffix}`).toString('base64')
  })).asset;

  await api(page, entry, 'POST', '/api/skymusicnexus/music-studio', {
    action: 'saveProject',
    project: {
      id: `studio_live_browser_${suffix}`,
      artistId,
      releaseId,
      title: `Live Browser Session ${suffix}`,
      tempoKey: '96 BPM / F minor',
      sourceEngines: ['SkyeMusicNexus Native DAW']
    }
  });

  await api(page, entry, 'POST', '/api/skymusicnexus/music-studio', {
    action: 'queueExport',
    project: { id: `studio_live_browser_${suffix}`, artistId, releaseId },
    exportTargets: ['mp3-preview', 'release-manifest'],
    releaseForgeLine: { artistId, releaseId, assetId: asset.id }
  });

  const release = (await api(page, entry, 'POST', '/api/skymusicnexus/music-releases', {
    action: 'submit',
    id: releaseId,
    artistId,
    title: `Live Browser Single ${suffix}`,
    type: 'single',
    tracks: [{
      title: `Live Browser Preview ${suffix}`,
      assetId: asset.id,
      previewUrl: `/api/skymusicnexus/music-assets?action=stream&id=${encodeURIComponent(asset.id)}`,
      contentType: 'audio/mpeg',
      bytes: asset.bytes
    }],
    rights: { ownershipAttested: true, previewUseAuthorized: true }
  })).release;

  await api(page, entry, 'POST', '/api/skymusicnexus/music-releases', {
    action: 'playback-stream',
    id: releaseId,
    trackIndex: 0,
    listenSeconds: 21
  });

  await api(page, entry, 'POST', '/api/skymusicnexus/music-releases', {
    action: 'update-rights',
    id: releaseId,
    ownershipAttested: true,
    previewUseAuthorized: true,
    distributionAuthorized: true
  });

  const drop = (await api(page, entry, 'POST', '/api/skymusicnexus/music-drops', {
    action: 'create-drop',
    artistId,
    artistName: artist.name,
    releaseId,
    title: `Live Browser Drop ${suffix}`,
    tierPolicy: 'free99-lite',
    rightsStatus: 'preview-ready',
    tracks: release.tracks
  })).drop;

  await api(page, entry, 'POST', '/api/skymusicnexus/music-drops', {
    action: 'submit-drop',
    dropId: drop.dropId
  });

  const contentRequest = (await api(page, entry, 'POST', '/api/skymusicnexus/music-exchange', {
    action: 'request-content',
    artistId,
    releaseId,
    requestType: 'cover-art',
    title: `Live Browser Visual Packet ${suffix}`,
    brief: 'Production browser wiring check for cover, captions, and rollout state.'
  })).request;

  await api(page, entry, 'POST', '/api/skymusicnexus/music-exchange', {
    action: 'send-message',
    threadId: contentRequest.threadId,
    artistId,
    body: 'Live browser inbox reply stored through the mounted API.'
  });

  await api(page, entry, 'POST', '/api/skymusicnexus/music-exchange', {
    action: 'publish-community',
    artistId,
    linkedReleaseId: releaseId,
    body: `Live browser community signal ${suffix}`
  });

  await api(page, entry, 'POST', '/api/skymusicnexus/music-exchange', {
    action: 'build-release-campaign',
    artistId,
    releaseId,
    releaseTitle: release.title,
    mood: 'browser-verified',
    platforms: 'feed, pixelfed, mastodon'
  });

  const feedPost = (await api(page, entry, 'POST', '/api/skymusicnexus/music-social', {
    action: 'create-feed-post',
    artistId,
    releaseId,
    caption: `Live browser post ${suffix}`,
    hashtags: 'musicnexus,livebrowser,0s',
    visibility: 'local-feed'
  })).post;

  await api(page, entry, 'POST', '/api/skymusicnexus/music-social', {
    action: 'feed-action',
    targetId: feedPost.id,
    feedAction: 'like',
    artistId
  });

  await api(page, entry, 'POST', '/api/skymusicnexus/music-social', {
    action: 'queue-post',
    artistId,
    releaseId,
    caption: `Provider queue live browser ${suffix}`
  });

  entry.seed = { artistId, releaseId, assetId: asset.id, dropId: drop.dropId, contentRequestId: contentRequest.id, feedPostId: feedPost.id };
}

async function runFullProductionMutationMatrix(page, entry) {
  const suffix = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
  const actions = [];
  const families = new Set();
  const mark = (family, action) => {
    families.add(family);
    actions.push(`${family}:${action}`);
  };
  const post = async (family, action, route, body, expectOk = true) => {
    mark(family, action);
    return api(page, entry, 'POST', route, { action, ...body }, expectOk);
  };
  const get = async (family, action, route, expectOk = true) => {
    mark(family, action);
    return api(page, entry, 'GET', route, null, expectOk);
  };

  const artistId = `artist_full_matrix_${suffix}`;
  const releaseId = `release_full_matrix_${suffix}`;

  await get('platform', 'routes-manifest', '/api/skymusicnexus/routes/manifest');
  await get('platform', 'health', '/api/skymusicnexus/health');
  await get('platform', 'hub', '/api/skymusicnexus/hub');
  await get('platform', 'session', '/api/skymusicnexus/skygate-session');

  await post('artists', 'register', '/api/skymusicnexus/music-artists', {
    id: artistId,
    name: `Full Matrix Artist ${suffix}`,
    email: `full-matrix-${suffix}@musicnexus.local`,
    genre: ['full-system', 'browser-stress'],
    bio: 'Production full-matrix artist seed.'
  });
  await post('artists', 'update', '/api/skymusicnexus/music-artists', { id: artistId, bio: 'Updated by production full matrix.' });
  await post('artists', 'approve', '/api/skymusicnexus/music-artists', { id: artistId });
  await get('artists', 'list', '/api/skymusicnexus/music-artists');
  await get('artists', 'get', `/api/skymusicnexus/music-artists?action=get&id=${encodeURIComponent(artistId)}`);

  await get('assets', 'storage-status', '/api/skymusicnexus/music-assets?action=storage-status');
  const uploadSession = await post('assets', 'create-upload-session', '/api/skymusicnexus/music-assets', {
    artistId,
    releaseId,
    title: `Full Matrix Session Asset ${suffix}`,
    fileName: `full-matrix-session-${suffix}.wav`,
    contentType: 'audio/wav',
    bytes: 8192
  });
  const sessionAssetId = uploadSession?.asset?.id;
  if (sessionAssetId) await post('assets', 'complete-upload', `/api/skymusicnexus/music-assets?id=${encodeURIComponent(sessionAssetId)}`, { id: sessionAssetId, bytes: 8192 });
  const asset = (await post('assets', 'upload', '/api/skymusicnexus/music-assets', {
    artistId,
    releaseId,
    title: `Full Matrix Preview ${suffix}`,
    fileName: `full-matrix-preview-${suffix}.mp3`,
    contentType: 'audio/mpeg',
    bytes: 6144,
    dataBase64: Buffer.from(`full-matrix-audio-${suffix}`).toString('base64')
  })).asset;
  await get('assets', 'list', `/api/skymusicnexus/music-assets?action=list&artistId=${encodeURIComponent(artistId)}`);
  await get('assets', 'stream', `/api/skymusicnexus/music-assets?action=stream&id=${encodeURIComponent(asset.id)}`);

  await post('studio', 'registerEngine', '/api/skymusicnexus/music-studio', {
    id: `engine_full_matrix_${suffix}`,
    name: 'Full Matrix Native Engine',
    license: 'first-party',
    repo: 'metraiyux-0s',
    mode: 'browser-production-check'
  });
  const projectId = `studio_full_matrix_${suffix}`;
  await post('studio', 'saveProject', '/api/skymusicnexus/music-studio', {
    project: { id: projectId, artistId, releaseId, title: `Full Matrix Session ${suffix}`, tempoKey: '100 BPM / C minor' }
  });
  await post('studio', 'queueExport', '/api/skymusicnexus/music-studio', {
    project: { id: projectId, artistId, releaseId },
    exportTargets: ['mp3-preview', 'wav-master', 'stem-archive', 'release-manifest'],
    releaseForgeLine: { artistId, releaseId, assetId: asset.id }
  });
  await get('studio', 'get', '/api/skymusicnexus/music-studio');

  await post('releases', 'submit', '/api/skymusicnexus/music-releases', {
    id: releaseId,
    artistId,
    title: `Full Matrix Single ${suffix}`,
    type: 'single',
    distributionTargets: ['nexus-feed', 'drop-page'],
    tracks: [{ title: `Full Matrix Preview ${suffix}`, assetId: asset.id, previewUrl: asset.streamUrl, contentType: asset.contentType, bytes: asset.bytes }],
    rights: { ownershipAttested: true, previewUseAuthorized: true }
  });
  await post('releases', 'playback-stream', '/api/skymusicnexus/music-releases', { id: releaseId, trackIndex: 0, listenSeconds: 31 });
  await post('releases', 'update-rights', '/api/skymusicnexus/music-releases', { id: releaseId, ownershipAttested: true, previewUseAuthorized: true, distributionAuthorized: true });
  await post('releases', 'review', '/api/skymusicnexus/music-releases', { id: releaseId, decision: 'approve', notes: 'Full production matrix approval.' });
  await post('releases', 'publish', '/api/skymusicnexus/music-releases', { id: releaseId });
  await post('releases', 'report-streams', '/api/skymusicnexus/music-releases', { id: releaseId, streams: 7, downloads: 2, saves: 3 });
  await post('releases', 'queue-operations', '/api/skymusicnexus/music-releases', { id: releaseId, status: 'queued', checkpoint: 'release-calendar', notes: 'Full matrix operations queue.' });
  await post('releases', 'update-operations', '/api/skymusicnexus/music-releases', { id: releaseId, status: 'active', checkpoint: 'drop-ready', notes: 'Full matrix moved to drop-ready.' });
  await get('releases', 'list', '/api/skymusicnexus/music-releases?action=list');
  await get('releases', 'get', `/api/skymusicnexus/music-releases?action=get&id=${encodeURIComponent(releaseId)}`);
  await get('releases', 'rights-audit', '/api/skymusicnexus/music-releases?action=rights-audit');
  await get('releases', 'operations-board', '/api/skymusicnexus/music-releases?action=operations-board');
  await get('releases', 'workflow-timeline', '/api/skymusicnexus/music-releases?action=workflow-timeline');

  const drop = (await post('drops', 'create-drop', '/api/skymusicnexus/music-drops', {
    artistId,
    artistName: `Full Matrix Artist ${suffix}`,
    releaseId,
    title: `Full Matrix Drop ${suffix}`,
    tierPolicy: 'free99-lite',
    rightsStatus: 'distribution-ready',
    tracks: [{ title: `Full Matrix Preview ${suffix}`, assetId: asset.id, previewUrl: asset.streamUrl }]
  })).drop;
  await post('drops', 'update-drop', '/api/skymusicnexus/music-drops', { dropId: drop.dropId, story: 'Full matrix drop story.', downloadAllowed: true });
  await post('drops', 'submit-drop', '/api/skymusicnexus/music-drops', { dropId: drop.dropId });
  await post('drops', 'track-public-event', '/api/skymusicnexus/music-drops', { dropId: drop.dropId, eventType: 'page_view' });
  const batch = (await post('drops', 'form-batch', '/api/skymusicnexus/music-drops', { dropIds: [drop.dropId] })).batch;
  await post('drops', 'send-approval', '/api/skymusicnexus/music-drops', { batchId: batch.batchId });
  await post('drops', 'approve-batch', '/api/skymusicnexus/music-drops', { batchId: batch.batchId });
  await post('drops', 'run-approval-brain', '/api/skymusicnexus/music-drops', { batchId: batch.batchId });
  await post('drops', 'build-static-bundle', '/api/skymusicnexus/music-drops', { batchId: batch.batchId });
  await post('drops', 'publish-batch', '/api/skymusicnexus/music-drops', { batchId: batch.batchId });
  const holdDrop = (await post('drops', 'create-drop', '/api/skymusicnexus/music-drops', { artistId, releaseId, title: `Full Matrix Hold Drop ${suffix}` })).drop;
  await post('drops', 'hold-drop', '/api/skymusicnexus/music-drops', { dropId: holdDrop.dropId });
  await post('drops', 'revoke-private-delivery', '/api/skymusicnexus/music-drops', { dropId: holdDrop.dropId });
  const rejectDrop = (await post('drops', 'create-drop', '/api/skymusicnexus/music-drops', { artistId, releaseId, title: `Full Matrix Reject Drop ${suffix}` })).drop;
  await post('drops', 'reject-drop', '/api/skymusicnexus/music-drops', { dropId: rejectDrop.dropId });
  await get('drops', 'hub', '/api/skymusicnexus/music-drops?action=hub');
  await get('drops', 'list', '/api/skymusicnexus/music-drops?action=list');
  await get('drops', 'get', `/api/skymusicnexus/music-drops?action=get&dropId=${encodeURIComponent(drop.dropId)}`);
  await get('drops', 'deploy-pool', '/api/skymusicnexus/music-drops?action=deploy-pool');
  await get('drops', 'batch-preview', '/api/skymusicnexus/music-drops?action=batch-preview');
  await get('drops', 'traffic-estimate', '/api/skymusicnexus/music-drops?action=traffic-estimate');
  await get('drops', 'env-status', '/api/skymusicnexus/music-drops?action=env-status');

  const request = (await post('exchange', 'request-content', '/api/skymusicnexus/music-exchange', {
    artistId,
    releaseId,
    requestType: 'cover-art',
    title: `Full Matrix Content ${suffix}`,
    brief: 'Full matrix content request.'
  })).request;
  await post('exchange', 'send-message', '/api/skymusicnexus/music-exchange', { threadId: request.threadId, artistId, body: 'Full matrix thread message.' });
  await post('exchange', 'publish-community', '/api/skymusicnexus/music-exchange', { artistId, linkedReleaseId: releaseId, body: 'Full matrix community post.' });
  await post('exchange', 'build-release-campaign', '/api/skymusicnexus/music-exchange', { artistId, releaseId, releaseTitle: `Full Matrix Single ${suffix}`, mood: 'verified', platforms: 'feed, pixelfed, mastodon' });
  await get('exchange', 'hub', '/api/skymusicnexus/music-exchange?action=hub');

  await get('social', 'catalog', '/api/skymusicnexus/music-social?action=catalog');
  const connector = (await post('social', 'save-connector', '/api/skymusicnexus/music-social', {
    id: `connector_full_matrix_${suffix}`,
    platform: 'pixelfed',
    name: 'Full Matrix Pixelfed',
    instanceUrl: 'https://pixelfed.example',
    handle: '@fullmatrix@pixelfed.example',
    defaultVisibility: 'unlisted',
    tokenEnvKey: ''
  })).connector;
  const feedPost = (await post('social', 'create-feed-post', '/api/skymusicnexus/music-social', { artistId, releaseId, caption: `Full matrix feed ${suffix}`, hashtags: 'musicnexus,fullmatrix', visibility: 'local-feed' })).post;
  await post('social', 'feed-action', '/api/skymusicnexus/music-social', { targetId: feedPost.id, feedAction: 'like', artistId });
  await post('social', 'feed-action', '/api/skymusicnexus/music-social', { targetId: feedPost.id, feedAction: 'save', artistId });
  await post('social', 'feed-action', '/api/skymusicnexus/music-social', { targetId: feedPost.id, feedAction: 'boost', artistId });
  await post('social', 'feed-action', '/api/skymusicnexus/music-social', { targetId: feedPost.id, feedAction: 'comment', artistId, body: 'Full matrix comment.' });
  const queued = (await post('social', 'queue-post', '/api/skymusicnexus/music-social', { connectorId: connector.id, artistId, releaseId, caption: `Full matrix provider queue ${suffix}`, hashtags: 'musicnexus', visibility: 'unlisted' })).post;
  const publication = await post('social', 'publish-post', '/api/skymusicnexus/music-social', { postId: queued.id });
  await post('social', 'sync-feed', '/api/skymusicnexus/music-social', { connectorId: connector.id, artistId, hashtag: 'musicnexus', limit: 3 });
  await post('social', 'moderate-post', '/api/skymusicnexus/music-social', { targetId: feedPost.id, status: 'reviewed', note: 'Full matrix moderation check.' });
  await get('social', 'hub', '/api/skymusicnexus/music-social?action=hub');
  await get('social', 'feed', `/api/skymusicnexus/music-social?action=feed&artistId=${encodeURIComponent(artistId)}`);

  await post('payments', 'credit', '/api/skymusicnexus/music-payments', { artistId, amount: 13.37, reason: 'Full matrix credit.', referenceId: releaseId });
  const payout = (await post('payments', 'payout', '/api/skymusicnexus/music-payments', { artistId, amount: 5.25 })).payout;
  await post('payments', 'complete-payout', '/api/skymusicnexus/music-payments', { payoutId: payout.id });
  await get('payments', 'ledger', '/api/skymusicnexus/music-payments?action=ledger');
  await get('payments', 'payouts', '/api/skymusicnexus/music-payments?action=payouts');

  await get('provider-hooks', 'boundary', '/api/skymusicnexus/music-provider-hooks');
  await get('analytics', 'counts', '/api/skymusicnexus/music-analytics');
  await get('analytics', 'observability', '/api/skymusicnexus/music-analytics?action=observability');
  const visuals = await get('analytics', 'visuals', '/api/skymusicnexus/music-analytics?action=visuals');
  await get('visuals', 'dashboard', '/api/skymusicnexus/visuals');
  await get('observability', 'state', '/api/skymusicnexus/observability');

  const expectedFamilies = ['platform', 'artists', 'assets', 'studio', 'releases', 'drops', 'exchange', 'social', 'payments', 'provider-hooks', 'analytics', 'visuals', 'observability'];
  const missingFamilies = expectedFamilies.filter(family => !families.has(family));
  entry.productionMatrix = {
    artistId,
    releaseId,
    actionCount: actions.length,
    familyCount: families.size,
    families: Array.from(families),
    missingFamilies,
    providerPublicationBoundary: publication?.publication?.note || '',
    visualsSchema: visuals?.visuals?.schema_version || ''
  };
  addCheck(entry, 'full_music_api_mutation_matrix_covers_all_function_families', missingFamilies.length === 0 && actions.length >= 70, entry.productionMatrix);
  addCheck(entry, 'provider_publish_boundary_remains_visible', /provider token|provider/i.test(entry.productionMatrix.providerPublicationBoundary), {
    note: entry.productionMatrix.providerPublicationBoundary
  });
}

async function readStress(page, entry) {
  const routes = [
    '/api/skymusicnexus/hub',
    '/api/skymusicnexus/visuals',
    '/api/skymusicnexus/observability',
    '/api/skymusicnexus/music-analytics',
    '/api/skymusicnexus/music-analytics?action=observability',
    '/api/skymusicnexus/routes/manifest',
    '/api/skymusicnexus/music-social?action=catalog'
  ];
  const result = await page.evaluate(async ({ routes }) => {
    const raw = sessionStorage.getItem('FREE99_PLATFORM_GATE_SESSION') || localStorage.getItem('FREE99_PLATFORM_GATE_SESSION') || '{}';
    let token = '';
    try { token = JSON.parse(raw).token || ''; } catch {}
    const headers = token ? {
      authorization: `Bearer ${token}`,
      'x-free99-gate-session': token,
      'x-skye-gate-session': token,
      'x-skygate-session': token
    } : {};
    const jobs = Array.from({ length: 6 }, () => routes).flat();
    const results = await Promise.all(jobs.map(async route => {
      const response = await fetch(route, { credentials: 'include', headers });
      return { route, status: response.status, ok: response.ok };
    }));
    return {
      total: results.length,
      ok: results.filter(item => item.ok).length,
      failures: results.filter(item => !item.ok)
    };
  }, { routes });
  entry.readStress = result;
  addCheck(entry, 'authenticated_read_stress_routes_all_200', result.failures.length === 0 && result.ok === result.total, result);
}

async function validateMusicApis(page, entry) {
  const manifest = await api(page, entry, 'GET', '/api/skymusicnexus/routes/manifest');
  addCheck(entry, 'manifest_exposes_music_function_contract', manifest?.base === '/api/skymusicnexus' && Array.isArray(manifest.functions) && manifest.functions.includes('music-assets'), {
    base: manifest?.base,
    functionCount: manifest?.functions?.length || 0
  });

  const hub = await api(page, entry, 'GET', '/api/skymusicnexus/hub');
  addCheck(entry, 'hub_requires_shared_gate_and_returns_state', hub?.gateSessionRequired === true && hub?.storage_mode === 'kv' && Array.isArray(hub?.latestAuditEvents), {
    gateSessionRequired: hub?.gateSessionRequired,
    storageMode: hub?.storage_mode,
    latestAuditEvents: hub?.latestAuditEvents?.length || 0
  });

  const observability = await api(page, entry, 'GET', '/api/skymusicnexus/observability');
  addCheck(entry, 'observability_reports_shared_gate_no_app_password', observability?.auth?.sharedZeroOsGate === true && observability?.auth?.appSpecificAdminPassword === false, {
    storage: observability?.storage?.mode,
    auditEvents: observability?.retained?.auditEvents,
    appSpecificAdminPassword: observability?.auth?.appSpecificAdminPassword
  });

  const visualsPayload = await api(page, entry, 'GET', '/api/skymusicnexus/visuals');
  const visuals = visualsPayload?.visuals;
  addCheck(entry, 'visuals_endpoint_returns_live_schema_and_dashboard_rows', visuals?.schema_version === 'skye.music.nexus.visuals.v1'
    && (visuals.kpis || []).length >= 4
    && (visuals.route_health || []).length >= 8
    && (visuals.flows || []).length >= 8
    && (visuals.audit_events || []).length > 0, {
    schema: visuals?.schema_version,
    kpis: visuals?.kpis?.length || 0,
    routes: visuals?.route_health?.length || 0,
    flows: visuals?.flows?.length || 0,
    auditEvents: visuals?.audit_events?.length || 0
  });

  const analyticsVisuals = await api(page, entry, 'GET', '/api/skymusicnexus/music-analytics?action=visuals');
  addCheck(entry, 'analytics_visuals_alias_matches_schema', analyticsVisuals?.visuals?.schema_version === 'skye.music.nexus.visuals.v1', {
    schema: analyticsVisuals?.visuals?.schema_version || ''
  });
}

async function visibleMetrics(page) {
  return page.evaluate(() => {
    const visible = [...document.body.querySelectorAll('*')].filter(node => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return rect.width > 2 && rect.height > 2 && rect.bottom > 0 && rect.top < innerHeight && style.visibility !== 'hidden' && style.display !== 'none';
    });
    const text = visible.map(node => node.innerText || node.alt || node.getAttribute('aria-label') || '').join(' ').replace(/\s+/g, ' ').trim();
    const media = visible.filter(node => ['IMG', 'CANVAS', 'VIDEO', 'SVG'].includes(node.tagName));
    return {
      scrollY: Math.round(window.scrollY),
      visibleElementCount: visible.length,
      visibleTextLength: text.length,
      visibleMediaCount: media.length,
      sampleText: text.slice(0, 180),
      horizontalOverflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth
    };
  });
}

async function scrollStops(page, entry, label, stops = 4) {
  const maxY = await page.evaluate(() => Math.max(0, document.documentElement.scrollHeight - window.innerHeight));
  const targets = maxY < 8
    ? [0]
    : [...new Set(Array.from({ length: stops }, (_, index) => Math.round(maxY * (index / (stops - 1)))))];
  const results = [];
  for (const [index, y] of targets.entries()) {
    const current = await page.evaluate(() => window.scrollY);
    await page.mouse.wheel(0, y - current);
    await page.waitForTimeout(300);
    const metrics = await visibleMetrics(page);
    const shot = await screenshot(page, entry, `${label}-scroll-${String(index + 1).padStart(2, '0')}`);
    const ok = metrics.visibleElementCount >= 3 && (metrics.visibleTextLength >= 20 || metrics.visibleMediaCount >= 1);
    results.push({ ...metrics, ok, screenshot: shot });
    if (!ok) entry.failures.push(`${entry.viewportLabel}: visually blank scroll stop for ${label} at ${metrics.scrollY}`);
  }
  await page.evaluate(() => scrollTo(0, 0));
  entry.scrollStops.push({ label, stops: results });
  return results;
}

async function validateCommandDashboard(page, entry) {
  await page.goto(`${baseUrl}/SkyeMusicNexus/public/command-dashboard.html?workspace_id=skye-music-nexus`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => {
    const status = document.querySelector('[data-visual-status]')?.textContent || '';
    return status.includes('Live visual data loaded') || status.includes('Fallback visual data');
  }, { timeout: 45000 });
  await page.locator('[data-visual-kpis] .visual-kpi').first().waitFor({ timeout: 20000 });
  const state = await page.evaluate(() => ({
    title: document.title,
    status: document.querySelector('[data-visual-status]')?.textContent || '',
    dataSource: document.querySelector('[data-visual-dashboard]')?.dataset.visualDataSource || '',
    kpis: document.querySelectorAll('[data-visual-kpis] .visual-kpi').length,
    routes: document.querySelectorAll('[data-visual-routes] .visual-route-card').length,
    flows: document.querySelectorAll('[data-visual-flows] .visual-flow-card').length,
    auditRows: document.querySelectorAll('[data-visual-audit] .visual-audit-row').length,
    guideCards: document.querySelectorAll('.nexus-guidance article').length,
    bodyText: document.body.innerText.slice(0, 800)
  }));
  entry.dashboard = state;
  addCheck(entry, 'command_dashboard_loads_live_visual_data_first', state.dataSource === 'live' && state.status.includes('Live visual data loaded'), state);
  addCheck(entry, 'command_dashboard_renders_kpis_routes_flows_audit_rows', state.kpis >= 4 && state.routes >= 8 && state.flows >= 8 && state.auditRows > 0, {
    kpis: state.kpis,
    routes: state.routes,
    flows: state.flows,
    auditRows: state.auditRows
  });
  addCheck(entry, 'command_dashboard_has_walkthrough_guidance', state.guideCards >= 3, { guideCards: state.guideCards });
  await scrollStops(page, entry, 'command-dashboard', 5);
}

async function validateSaasVisuals(page, entry) {
  const apiProbe = await api(page, entry, 'GET', '/api/saas/customer-visuals?workspace_id=bob-smoke-shop-preview-001', null, false);
  await page.goto(`${baseUrl}/saas/customer-data.html?workspace_id=bob-smoke-shop-preview-001`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => {
    const status = document.querySelector('[data-visual-status]')?.textContent || '';
    return status.includes('Live visual data loaded') || status.includes('Fallback visual data');
  }, { timeout: 45000 });
  const state = await page.evaluate(() => ({
    status: document.querySelector('[data-visual-status]')?.textContent || '',
    dataSource: document.querySelector('[data-visual-dashboard]')?.dataset.visualDataSource || '',
    kpis: document.querySelectorAll('[data-visual-kpis] .visual-kpi').length,
    progressRows: document.querySelectorAll('[data-visual-progress] .visual-progress-row').length,
    timelineRows: document.querySelectorAll('[data-visual-timeline] .visual-timeline-item').length
  }));
  entry.saasVisuals = { ...state, apiStatus: apiProbe?.ok === false ? 'not_ok' : 'ok' };
  addCheck(entry, 'saas_visual_dashboard_live_first_or_explicit_fallback', (state.status.includes('Live visual data loaded') || state.status.includes('Fallback visual data is being shown')) && state.kpis >= 4, state);
  addCheck(entry, 'saas_visual_endpoint_attempt_recorded', apiProbe != null, { apiProbeStatus: entry.apiCalls.at(-1)?.status || 0, dataSource: state.dataSource });
  await scrollStops(page, entry, 'saas-customer-data', 4);
}

const nexusRoutes = [
  { path: '/SkyeMusicNexus/public/index.html', label: 'artist-dashboard', expects: ['Platform Dashboard', 'Upload Studio', 'Music Player'], guidance: true },
  { path: '/SkyeMusicNexus/public/create.html', label: 'create', expects: ['Creation Hub', 'Native DAW', 'Upload Studio'], guidance: true },
  { path: '/SkyeMusicNexus/public/daw.html', label: 'daw', expects: ['SkyeMusicNexus DAW', 'Audio', 'Export'], daw: true },
  { path: '/SkyeMusicNexus/public/discover.html', label: 'discover', expects: ['SkyeMusicNexus // Discover', 'Spotify-style listening lanes'], guidance: true, staticFalse: true },
  { path: '/SkyeMusicNexus/public/feed.html', label: 'feed', expects: ['Open Social Feed', 'Provider publishing bay'], guidance: true },
  { path: '/SkyeMusicNexus/public/upload.html', label: 'upload', expects: ['Upload Studio', 'Import audio'], guidance: true },
  { path: '/SkyeMusicNexus/public/player.html', label: 'player', expects: ['Music Player', 'Stream Deck'], guidance: true },
  { path: '/SkyeMusicNexus/public/releases.html', label: 'releases', expects: ['Releases', 'Release Forge'], guidance: true },
  { path: '/SkyeMusicNexus/public/rights.html', label: 'rights', expects: ['Rights Vault', 'Save Rights Gate'], guidance: true },
  { path: '/SkyeMusicNexus/public/exchange.html', label: 'exchange', expects: ['Artist Exchange', 'Content requests'], guidance: true },
  { path: '/SkyeMusicNexus/public/drops.html', label: 'drops', expects: ['Drops', 'Create Drop'], guidance: true },
  { path: '/SkyeMusicNexus/public/admin.html', label: 'operator', expects: ['Operator Stage', 'Analytics'], guidance: true },
  { path: '/SkyeMusicNexus/public/exports.html', label: 'exports', expects: ['Export Forge', 'Release Forge handoff'], guidance: true },
  { path: '/SkyeMusicNexus/public/stems.html', label: 'stems', expects: ['Stem Vault', 'Stage stems'], guidance: true },
  { path: '/SkyeMusicNexus/proof.html', label: 'readiness', expects: ['SkyeMusicNexus Readiness', 'Backend Route Matrix'], guidance: false }
];

async function scanNexusRoutes(page, entry, routes) {
  for (const route of routes) {
    await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(900);
    const state = await page.evaluate(() => ({
      title: document.title,
      text: document.body.innerText,
      guidanceCards: document.querySelectorAll('.nexus-guidance article').length,
      dawQuickstart: document.querySelectorAll('.daw-quickstart article').length,
      dawBetaPill: Boolean(document.querySelector('.daw-beta-pill')),
      staticPreview: window.SKYE_MUSIC_NEXUS_STATIC_PREVIEW === true,
      sessionChip: document.querySelector('#sessionChip')?.textContent || '',
      horizontalOverflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth
    }));
    const normalizedText = state.text.toLowerCase();
    const missing = route.expects.filter(text => !normalizedText.includes(String(text).toLowerCase()));
    addCheck(entry, `route_${route.label}_renders_expected_text`, missing.length === 0, { path: route.path, missing });
    if (route.guidance) addCheck(entry, `route_${route.label}_has_walkthrough_cards`, state.guidanceCards >= 3, { cards: state.guidanceCards });
    if (route.daw) addCheck(entry, 'daw_beta_banner_and_quickstart_visible', (state.dawBetaPill || /daw beta/i.test(state.text)) && state.dawQuickstart >= 4, { quickstart: state.dawQuickstart, dawBetaPill: state.dawBetaPill });
    if (route.staticFalse) addCheck(entry, 'discover_does_not_force_static_preview_inside_0s', state.staticPreview === false, { staticPreview: state.staticPreview });
    if (entry.viewport.width < 700 && route.label !== 'daw') {
      addCheck(entry, `route_${route.label}_mobile_no_material_horizontal_overflow`, state.horizontalOverflow <= 6, { overflow: state.horizontalOverflow });
    }
    if (route.label === 'daw') {
      await page.locator('#audioEngineButton').click({ timeout: 5000 }).catch(() => {});
      await page.locator('#playTransportButton').click({ timeout: 5000 }).catch(() => {});
      await page.locator('#stopTransportButton').click({ timeout: 5000 }).catch(() => {});
      entry.actions.push('clicked DAW audio, play, and stop controls');
    }
    await scrollStops(page, entry, route.label, entry.viewport.width < 700 ? 3 : 4);
  }
}

function finalizeEntry(entry) {
  const hardConsole = entry.consoleErrors.filter(message => !/Failed to load resource/i.test(message));
  entry.materialConsoleErrors = hardConsole;
  if (hardConsole.length) entry.failures.push(`${entry.viewportLabel}: console errors ${hardConsole.slice(0, 3).join(' | ')}`);
  if (entry.failedRequests.length) entry.failures.push(`${entry.viewportLabel}: failed requests ${entry.failedRequests.slice(0, 5).map(item => item.url).join(', ')}`);
  if (entry.httpErrors.length) entry.failures.push(`${entry.viewportLabel}: HTTP errors ${entry.httpErrors.slice(0, 5).map(item => `${item.status} ${item.url}`).join(', ')}`);
  entry.ok = entry.failures.length === 0 && entry.checks.every(check => check.ok);
}

async function runViewport(browser, owner, viewport, viewportLabel, { seed = false, fullRouteScan = true } = {}) {
  const entry = {
    viewport,
    viewportLabel,
    ok: false,
    actions: [],
    checks: [],
    apiCalls: [],
    screenshots: [],
    scrollStops: [],
    consoleErrors: [],
    failedRequests: [],
    httpErrors: [],
    failures: []
  };
  const context = await browser.newContext({ viewport, isMobile: viewport.width < 700, deviceScaleFactor: 1, ignoreHTTPSErrors: true });
  await installSharedSession(context, owner.token, owner.source);
  const page = await context.newPage();
  observe(page, entry, [
    { urlIncludes: '/api/saas/customer-visuals', status: 401 }
  ]);
  try {
    await loginThroughOwnerPage(page, context, owner, entry, '/SkyeMusicNexus/public/command-dashboard.html');
    if (seed) {
      await seedLiveMusicWorkflow(page, entry);
      await runFullProductionMutationMatrix(page, entry);
    }
    await validateMusicApis(page, entry);
    await readStress(page, entry);
    await validateCommandDashboard(page, entry);
    if (fullRouteScan) await scanNexusRoutes(page, entry, nexusRoutes);
    else await scanNexusRoutes(page, entry, nexusRoutes.filter(route => ['artist-dashboard', 'daw', 'upload', 'rights', 'operator', 'readiness'].includes(route.label)));
    await validateSaasVisuals(page, entry);
  } catch (error) {
    entry.failures.push(redact(error?.stack || error?.message || error).split('\n').slice(0, 10).join('\n'));
  } finally {
    finalizeEntry(entry);
    await context.close();
  }
  return entry;
}

async function main() {
  relaunchWithXvfbWhenNeeded();
  fs.mkdirSync(artifactDir, { recursive: true });

  const unauthChecks = [
    await checkUnauth('/SkyeMusicNexus/public/command-dashboard.html'),
    await checkUnauth('/SkyeMusicNexus/public/admin.html'),
    await checkUnauth('/api/skymusicnexus/visuals', 'application/json'),
    await checkUnauth('/api/skymusicnexus/observability', 'application/json'),
    await checkUnauth('/saas/customer-data.html?workspace_id=bob-smoke-shop-preview-001')
  ];

  const owner = await resolveOwnerGate();
  const browser = await chromium.launch({ headless: false });
  const results = [];
  try {
    results.push(await runViewport(browser, owner, { width: 1440, height: 980 }, 'desktop', { seed: true, fullRouteScan: true }));
    results.push(await runViewport(browser, owner, { width: 390, height: 844 }, 'mobile', { seed: false, fullRouteScan: true }));
  } finally {
    await browser.close();
  }

  const report = {
    ok: unauthChecks.every(check => check.ok) && results.every(result => result.ok),
    mode: 'headed-live-browser',
    headless: false,
    generatedAt: new Date().toISOString(),
    baseUrl,
    deploymentVersion,
    artifactDir,
    unauthChecks,
    results,
    failures: [
      ...unauthChecks.filter(check => !check.ok).map(check => `unauth check failed: ${check.route}`),
      ...results.flatMap(result => result.failures)
    ]
  };
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({
    ok: report.ok,
    reportPath,
    deploymentVersion,
    failures: report.failures,
    summary: results.map(result => ({
      viewport: result.viewportLabel,
      checks: result.checks.length,
      actions: result.actions.length,
      screenshots: result.screenshots.length,
      apiCalls: result.apiCalls.length,
      dashboardSource: result.dashboard?.dataSource,
      saasSource: result.saasVisuals?.dataSource
    }))
  }, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch(error => {
  fs.mkdirSync(artifactDir, { recursive: true });
  const report = {
    ok: false,
    mode: 'headed-live-browser',
    headless: false,
    generatedAt: new Date().toISOString(),
    baseUrl,
    deploymentVersion,
    artifactDir,
    failures: [redact(error?.stack || error?.message || error)]
  };
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.error(JSON.stringify({ ok: false, reportPath, error: redact(error?.message || error) }, null, 2));
  process.exit(1);
});
