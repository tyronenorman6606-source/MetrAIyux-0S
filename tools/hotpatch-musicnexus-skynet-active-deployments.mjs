#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { resolveZeroOsGateAuth } from './lib/zero-os-gate-auth.mjs';

const repoRoot = process.cwd();
const zeroOsBase = String(process.env.ZERO_OS_LIVE_BASE || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const skynetBase = String(process.env.SKYENET_CONTROL_BASE || process.env.SKYENET_LIVE_BASE || 'https://skyenet.graylondonskyes.workers.dev').replace(/\/+$/, '');
const bundleReceiptPath = path.resolve(process.env.MUSICNEXUS_SKYNET_BUNDLE_RECEIPT || 'test-artifacts/musicnexus-skynet-bundles/musicnexus-skynet-bundles-latest.json');
const artifactRoot = path.resolve('test-artifacts/musicnexus-skynet-hotpatch');
const latestReceipt = path.join(artifactRoot, 'musicnexus-skynet-hotpatch-latest.json');
function arg(name, fallback = '') {
  const prefix = `--${name}=`;
  const hit = process.argv.find((item) => item.startsWith(prefix));
  if (hit) return hit.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function rel(file) {
  return path.relative(repoRoot, file).replace(/\\/g, '/');
}

function cleanToken(value) {
  return String(value || '').replace(/^Bearer\s+/i, '').trim();
}


async function readJson(file, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

async function fetchText(url, init = {}, timeoutMs = 20_000) {
  const started = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { redirect: 'manual', ...init, signal: controller.signal });
    const body = await response.text().catch(() => '');
    return {
      status: response.status,
      ok: response.ok,
      elapsed_ms: Number((performance.now() - started).toFixed(2)),
      content_type: response.headers.get('content-type') || '',
      location: response.headers.get('location') || '',
      body,
      bytes: Number(response.headers.get('content-length') || body.length || 0) || 0
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      elapsed_ms: Number((performance.now() - started).toFixed(2)),
      content_type: '',
      location: '',
      body: '',
      bytes: 0,
      error: error?.name === 'AbortError' ? `request timed out after ${timeoutMs}ms` : error?.message || String(error)
    };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url, init = {}) {
  const result = await fetchText(url, { ...init, headers: { accept: 'application/json', ...(init.headers || {}) } });
  let body = {};
  try { body = result.body ? JSON.parse(result.body) : {}; } catch { body = { text: result.body }; }
  return { ...result, body };
}

async function ownerLogin() {
  const auth = await resolveZeroOsGateAuth({ zeroOsBase });
  const token = cleanToken(auth.token);
  return {
    ok: Boolean(token),
    credential_source: auth.credential?.key || 'missing',
    token,
    login: {
      status: auth.response?.status || 0,
      ok: Boolean(token),
      token_received: Boolean(token),
      elapsed_ms: auth.response?.elapsed_ms || auth.response?.elapsedMs || 0
    },
    error: token ? '' : auth.response?.body?.error || 'Shared gate login did not return a bearer token.'
  };
}

function authHeaders(token) {
  return {
    authorization: `Bearer ${token}`,
    'x-free99-gate-session': token,
    'x-skye-gate-session': token
  };
}

function contentTypeForPath(file) {
  const lower = file.toLowerCase();
  if (lower.endsWith('.html')) return 'text/html; charset=utf-8';
  if (lower.endsWith('.css')) return 'text/css; charset=utf-8';
  if (lower.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (lower.endsWith('.json') || lower.endsWith('.webmanifest')) return 'application/json; charset=utf-8';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.mp3')) return 'audio/mpeg';
  if (lower.endsWith('.mp4')) return 'video/mp4';
  return 'application/octet-stream';
}

async function walkFiles(root) {
  const out = [];
  async function walk(current) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile()) out.push(full);
    }
  }
  await walk(root);
  return out;
}

function shouldPatchFile(relativePath, bundle) {
  const rel = relativePath.replace(/\\/g, '/');
  if (rel === 'deploy-target.json') return false;
  if (rel === 'artist-storefronts.css') return true;
  if (rel.startsWith('assets/mcp-implementation/')) return true;
  if (rel === 'assets/js/0s-command-bridge.js') return true;
  if (rel.startsWith('shared/SkyeMusicNexus/assets/')) return true;
  if (rel.startsWith('shared/SkyeMusicNexus/public/')) {
    if (/MCP_TOOLING_RECEIPT\.json$/i.test(rel)) return false;
    if (bundle?.projectId === 'musicnexus-supaboy') return true;
    return /^shared\/SkyeMusicNexus\/public\/nexus-player\.(css|js)$/i.test(rel);
  }
  return /\.(html?|css|js|json|webmanifest|svg|txt|md)$/i.test(rel)
    && !/(^|\/)(media|audio|video|originals?|welcome-pack\/media)(\/|$)/i.test(rel);
}

async function uploadPatchFile(bundle, deploymentId, token, file) {
  const relPath = relToBundle(bundle.bundleDir, file);
  const params = new URLSearchParams({
    workspaceId: bundle.workspaceId,
    projectId: bundle.projectId,
    deploymentId,
    path: relPath
  });
  const body = await fs.readFile(file);
  let response = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (attempt) await new Promise((resolve) => setTimeout(resolve, 900 * attempt));
    response = await fetchText(`${skynetBase}/api/skyenet/deploy/upload?${params.toString()}`, {
      method: 'PUT',
      headers: {
        ...authHeaders(token),
        'content-type': contentTypeForPath(relPath)
      },
      body
    }, 60_000);
    if (response.ok || ![429, 500, 502, 503, 504].includes(response.status)) break;
  }
  return {
    path: relPath,
    bytes: body.byteLength,
    status: response.status,
    ok: response.ok,
    error: response.ok ? '' : response.body.slice(0, 300) || response.error || ''
  };
}

function relToBundle(bundleDir, file) {
  return path.relative(path.resolve(bundleDir), file).replace(/\\/g, '/');
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const out = new Array(items.length);
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = index;
      index += 1;
      out[current] = await mapper(items[current], current);
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, items.length || 1)) }, () => worker()));
  return out;
}

async function smoke(bundle) {
  const live = `${skynetBase}/${bundle.projectId}/`;
  const checks = [
    ['root', live],
    ['css', `${live}artist-storefronts.css`],
    ['mcp_js', `${live}assets/mcp-implementation/mcp-effects.js`],
    ['bridge_js', `${live}assets/js/0s-command-bridge.js`],
    ['logo', `${live}shared/SkyeMusicNexus/assets/skye-music-nexus-logo.png`]
  ];
  const assets = [];
  for (const [id, url] of checks) {
    const res = await fetchText(url, { method: 'HEAD' }, 25_000);
    assets.push({ id, url, status: res.status, ok: res.ok, content_type: res.content_type, elapsed_ms: res.elapsed_ms });
  }
  const root = await fetchText(live, {}, 25_000);
  const htmlChecks = {
    uses_local_css: /href=["']\.\/artist-storefronts\.css["']|href=["'][^"']*artist-storefronts\.css["']/.test(root.body),
    no_root_command_bridge: !/src=["']\/assets\/js\/0s-command-bridge\.js["']/.test(root.body),
    no_root_skye_asset: !/src=["']\/SkyeMusicNexus\/assets\//.test(root.body)
  };
  return {
    ok: assets.every((item) => item.ok) && root.ok && Object.values(htmlChecks).every(Boolean),
    root: { status: root.status, ok: root.ok, content_type: root.content_type, bytes: root.bytes },
    assets,
    htmlChecks
  };
}

function deploymentIdFor(bundle, target) {
  return target?.deploymentId || target?.deployment_id || target?.lastSmoke?.hostHeader?.route_record?.route?.active_deployment_id || '';
}

const ids = arg('ids', '').split(',').map((item) => item.trim()).filter(Boolean);
const uploadConcurrency = Math.max(1, Math.min(12, Number(arg('concurrency', process.env.MUSICNEXUS_HOTPATCH_CONCURRENCY || '2')) || 2));
const bundleReceipt = await readJson(bundleReceiptPath);
if (!bundleReceipt?.bundles?.length) throw new Error(`Missing bundle receipt: ${rel(bundleReceiptPath)}`);
const selected = ids.length ? bundleReceipt.bundles.filter((bundle) => ids.includes(bundle.projectId)) : bundleReceipt.bundles;
const auth = await ownerLogin();
const generatedAt = new Date().toISOString();
const receipt = {
  schema: 'musicnexus.skynet.active_deployment_hotpatch.v1',
  generated_at: generatedAt,
  no_browser_proof_run: true,
  owner_manual_live_check: true,
  skynet_base: skynetBase,
  bundle_receipt: rel(bundleReceiptPath),
  selected_count: selected.length,
  credential_source: auth.credential_source,
  login: auth.login,
  hotpatches: [],
  failures: []
};

if (!auth.ok) {
  receipt.failures.push(auth.error || 'Owner login failed.');
} else {
  for (const bundle of selected) {
    const targetPath = path.resolve('metraiyux_0s_site/SkyeMusicNexus/artist-storefronts', bundle.slug, 'deploy-target.json');
    const target = await readJson(targetPath, {});
    const deploymentId = deploymentIdFor(bundle, target);
    const item = {
      projectId: bundle.projectId,
      slug: bundle.slug,
      workspaceId: bundle.workspaceId,
      deploymentId,
      liveUrl: `${skynetBase}/${bundle.projectId}/`,
      uploaded: [],
      smoke: null,
      ok: false,
      failures: []
    };
    if (!deploymentId) {
      item.failures.push(`No active deployment id in ${rel(targetPath)}`);
      receipt.failures.push(`${bundle.projectId}: missing active deployment id`);
      receipt.hotpatches.push(item);
      continue;
    }
    console.error(`[musicnexus-hotpatch] patching ${bundle.projectId} -> ${deploymentId}`);
    const files = (await walkFiles(path.resolve(bundle.bundleDir)))
      .filter((file) => shouldPatchFile(relToBundle(bundle.bundleDir, file), bundle));
    item.uploaded = await mapWithConcurrency(files, uploadConcurrency, (file) => uploadPatchFile(bundle, deploymentId, auth.token, file));
    let uploadedBytes = 0;
    for (const uploaded of item.uploaded) {
      uploadedBytes += uploaded.bytes || 0;
      if (!uploaded.ok) item.failures.push(`upload failed: ${uploaded.path}`);
    }
    item.uploaded_count = item.uploaded.length;
    item.uploaded_bytes = uploadedBytes;
    item.smoke = await smoke(bundle);
    if (!item.smoke.ok) item.failures.push('public HTTP smoke failed after hotpatch');
    item.ok = item.failures.length === 0;
    if (!item.ok) receipt.failures.push(`${bundle.projectId}: ${item.failures.join('; ')}`);
    receipt.hotpatches.push(item);
  }
}

receipt.ok = receipt.failures.length === 0;
await fs.mkdir(artifactRoot, { recursive: true });
const stamped = path.join(artifactRoot, `musicnexus-skynet-hotpatch-${generatedAt.replace(/[:.]/g, '-')}.json`);
await fs.writeFile(stamped, `${JSON.stringify(receipt, null, 2)}\n`);
await fs.writeFile(latestReceipt, `${JSON.stringify({ ...receipt, stamped_receipt: rel(stamped) }, null, 2)}\n`);
console.log(JSON.stringify({
  ok: receipt.ok,
  selected_count: selected.length,
  receipt: rel(latestReceipt),
  stamped_receipt: rel(stamped),
  hotpatched: receipt.hotpatches.map((item) => ({
    projectId: item.projectId,
    ok: item.ok,
    liveUrl: item.liveUrl,
    deploymentId: item.deploymentId,
    uploaded_count: item.uploaded_count || 0,
    uploaded_bytes: item.uploaded_bytes || 0,
    failures: item.failures
  })),
  failures: receipt.failures
}, null, 2));
if (!receipt.ok) process.exitCode = 1;
