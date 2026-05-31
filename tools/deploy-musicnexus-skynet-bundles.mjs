#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { resolveZeroOsGateAuth } from './lib/zero-os-gate-auth.mjs';

const repoRoot = process.cwd();
const zeroOsBase = String(process.env.ZERO_OS_LIVE_BASE || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const skynetBase = String(process.env.SKYENET_CONTROL_BASE || process.env.SKYENET_LIVE_BASE || 'https://skyenet.graylondonskyes.workers.dev').replace(/\/+$/, '');
const bundleReceiptPath = path.resolve(process.env.MUSICNEXUS_SKYNET_BUNDLE_RECEIPT || 'test-artifacts/musicnexus-skynet-bundles/musicnexus-skynet-bundles-latest.json');
const deployArtifactRoot = path.resolve('test-artifacts/musicnexus-skynet-deploy');
const latestReceipt = path.join(deployArtifactRoot, 'musicnexus-skynet-deploy-latest.json');
function arg(name, fallback = '') {
  const prefix = `--${name}=`;
  const hit = process.argv.find((item) => item.startsWith(prefix));
  if (hit) return hit.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function flag(name) {
  return process.argv.includes(`--${name}`);
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

async function fetchJson(url, init = {}, timeoutMs = 20_000) {
  const started = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { redirect: 'manual', ...init, signal: controller.signal });
    const text = await response.text().catch(() => '');
    let body = {};
    try { body = text ? JSON.parse(text) : {}; } catch { body = { text }; }
    return {
      status: response.status,
      ok: response.ok,
      elapsed_ms: Number((performance.now() - started).toFixed(2)),
      content_type: response.headers.get('content-type') || '',
      body
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      elapsed_ms: Number((performance.now() - started).toFixed(2)),
      content_type: '',
      body: { error: error?.name === 'AbortError' ? `request timed out after ${timeoutMs}ms` : error?.message || String(error) }
    };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchHead(url, timeoutMs = 20_000) {
  const started = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { method: 'HEAD', redirect: 'manual', signal: controller.signal });
    return {
      status: response.status,
      ok: response.ok,
      elapsed_ms: Number((performance.now() - started).toFixed(2)),
      content_type: response.headers.get('content-type') || '',
      location: response.headers.get('location') || ''
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      elapsed_ms: Number((performance.now() - started).toFixed(2)),
      content_type: '',
      location: '',
      error: error?.name === 'AbortError' ? `request timed out after ${timeoutMs}ms` : error?.message || String(error)
    };
  } finally {
    clearTimeout(timer);
  }
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

function parseDeployOutput(stdout = '') {
  const text = String(stdout || '').trim();
  const start = text.lastIndexOf('\n{');
  const jsonText = start >= 0 ? text.slice(start + 1) : text;
  try {
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
}

function planFor(bundle) {
  const bytes = Number(bundle.bytes || 0);
  if (bytes > 150 * 1024 * 1024) return 'skyenet-sovereign-runtime-reserve';
  if (bytes > 24 * 1024 * 1024) return 'skyenet-edge-growth';
  return 'skyenet-edge-starter';
}

function deployArgs(bundle, concurrency) {
  return [
    'tools/skyenet-deploy.mjs',
    '--api', `${skynetBase}/api/skyenet`,
    '--dir', bundle.bundleDir,
    '--source-root', bundle.sourceRoot || bundle.bundleDir,
    '--project', bundle.projectId,
    '--workspace', bundle.workspaceId,
    '--plan', planFor(bundle),
    '--host', new URL(skynetBase).hostname,
    '--mount', `/${bundle.projectId}`,
    '--public',
    '--include-public-originals',
    '--concurrency', String(concurrency)
  ];
}

function authHeaders(token) {
  return {
    authorization: `Bearer ${token}`,
    'x-free99-gate-session': token,
    'x-skye-gate-session': token
  };
}

async function smoke(bundle, deploymentId, token) {
  const live = `${skynetBase}/${bundle.projectId}/`;
  const checks = [
    ['root', live],
    ['css', `${live}artist-storefronts.css`],
    ['mcp_js', `${live}assets/mcp-implementation/mcp-effects.js`],
    ['bridge_js', `${live}assets/js/0s-command-bridge.js`],
    ['logo', `${live}shared/SkyeMusicNexus/assets/skye-music-nexus-logo.png`]
  ];
  const assets = [];
  for (const [id, url] of checks) assets.push({ id, url, ...(await fetchHead(url)) });
  const route = await fetchJson(`${skynetBase}/api/skyenet/routes?workspace_id=${encodeURIComponent(bundle.workspaceId)}&project_id=${encodeURIComponent(bundle.projectId)}&include_routes=1`, {
    headers: { accept: 'application/json', ...authHeaders(token) }
  });
  const source = deploymentId
    ? await fetchHead(`${skynetBase}/api/skyenet/source-download?workspace_id=${encodeURIComponent(bundle.workspaceId)}&project_id=${encodeURIComponent(bundle.projectId)}&deployment_id=${encodeURIComponent(deploymentId)}`)
    : { ok: false, status: 0, error: 'missing deployment id' };
  return {
    ok: assets.every((item) => item.ok) && route.ok,
    assets,
    route: { status: route.status, ok: route.ok, count: route.body?.count ?? null },
    source_download_head: source
  };
}

async function writeDeployTarget(bundle, deploy, itemSmoke) {
  const target = {
    schema: 'skyenet.client-app.deploy-target.v1',
    updatedAt: new Date().toISOString(),
    deployHost: 'SkyeNet shared origin path route',
    projectId: bundle.projectId,
    workspaceId: bundle.workspaceId,
    planName: planFor(bundle),
    deploymentId: deploy.deployment_id || '',
    publicUrl: deploy.live_url || `${skynetBase}/${bundle.projectId}/`,
    host: new URL(skynetBase).hostname,
    mountPath: `/${bundle.projectId}`,
    urlMode: 'path',
    publicAccess: true,
    sourceRoot: bundle.sourceRoot || bundle.bundleDir,
    publicBuildDir: bundle.bundleDir,
    sourceCustody: {
      privateSourcePackage: true,
      sourceDownloadApi: deploy.deployment_id
        ? `${skynetBase}/api/skyenet/source-download?workspace_id=${encodeURIComponent(bundle.workspaceId)}&project_id=${encodeURIComponent(bundle.projectId)}&deployment_id=${encodeURIComponent(deploy.deployment_id)}`
        : '',
      auth: 'Shared FS27/SkyGate/Free99 bearer session required'
    },
    proofRequired: 'Non-browser HTTP/API smoke plus owner manual browser check',
    lastSmoke: itemSmoke
  };
  const originalSourcePath = path.resolve('metraiyux_0s_site/SkyeMusicNexus/artist-storefronts', bundle.slug, 'deploy-target.json');
  const bundlePath = path.resolve(bundle.bundleDir, 'deploy-target.json');
  for (const file of [originalSourcePath, bundlePath]) {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, `${JSON.stringify(target, null, 2)}\n`);
  }
  return [rel(originalSourcePath), rel(bundlePath)];
}

const dryRun = flag('dry-run');
const concurrency = Number(arg('concurrency', process.env.MUSICNEXUS_SKYNET_DEPLOY_CONCURRENCY || '4')) || 4;
const bundleReceipt = await readJson(bundleReceiptPath);
if (!bundleReceipt?.bundles?.length) throw new Error(`Missing bundle receipt: ${rel(bundleReceiptPath)}`);
const ids = arg('ids', '').split(',').map((item) => item.trim()).filter(Boolean);
const selected = ids.length ? bundleReceipt.bundles.filter((bundle) => ids.includes(bundle.projectId)) : bundleReceipt.bundles;
const auth = dryRun ? { ok: true, token: '', credential_source: 'dry-run', login: null } : await ownerLogin();
const generatedAt = new Date().toISOString();
const receipt = {
  schema: 'musicnexus.skynet.deploy.repair.v1',
  generated_at: generatedAt,
  no_browser_proof_run: true,
  owner_manual_live_check: true,
  skynet_base: skynetBase,
  selected_count: selected.length,
  bundle_receipt: rel(bundleReceiptPath),
  credential_source: auth.credential_source,
  login: auth.login,
  deployments: [],
  failures: []
};

if (!auth.ok) {
  receipt.failures.push(auth.error || 'Owner login failed.');
} else {
  for (const bundle of selected) {
    const args = deployArgs(bundle, concurrency);
    const item = {
      projectId: bundle.projectId,
      slug: bundle.slug,
      workspaceId: bundle.workspaceId,
      bundleDir: bundle.bundleDir,
      liveUrl: `${skynetBase}/${bundle.projectId}/`,
      planName: planFor(bundle),
      bytes: bundle.bytes,
      deploy: null,
      smoke: null,
      deployTargetsWritten: [],
      ok: false,
      failures: []
    };
    console.error(`[musicnexus] deploying ${bundle.projectId} (${bundle.mb} MB)`);
    if (dryRun) {
      item.ok = true;
      item.deploy = { dry_run: true, command: `node ${args.join(' ')}` };
      receipt.deployments.push(item);
      continue;
    }
    const result = spawnSync('node', args, {
      cwd: repoRoot,
      env: { ...process.env, SKYENET_AUTH: auth.token },
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024
    });
    const deploy = parseDeployOutput(result.stdout);
    item.deploy = {
      ok: result.status === 0 && deploy?.ok === true,
      status: result.status ?? 1,
      project_id: deploy?.project_id || '',
      deployment_id: deploy?.deployment_id || '',
      workspace_id: deploy?.workspace_id || '',
      live_url: deploy?.live_url || '',
      route_key: deploy?.route_key || '',
      file_count: deploy?.file_count || 0,
      private_source_package: deploy?.private_source_package || null,
      stdout_tail: String(result.stdout || '').slice(-2000),
      stderr_tail: String(result.stderr || '').slice(-2000)
    };
    if (!item.deploy.ok) {
      item.failures.push('SkyeNet deploy failed.');
    } else {
      item.smoke = await smoke(bundle, deploy.deployment_id || '', auth.token);
      if (!item.smoke.ok) item.failures.push('HTTP/API smoke failed.');
      item.deployTargetsWritten = await writeDeployTarget(bundle, deploy, item.smoke);
    }
    item.ok = item.failures.length === 0;
    if (!item.ok) receipt.failures.push(`${bundle.projectId}: ${item.failures.join('; ')}`);
    receipt.deployments.push(item);
  }
}

receipt.ok = receipt.failures.length === 0;
await fs.mkdir(deployArtifactRoot, { recursive: true });
const stamped = path.join(deployArtifactRoot, `musicnexus-skynet-deploy-${generatedAt.replace(/[:.]/g, '-')}.json`);
await fs.writeFile(stamped, `${JSON.stringify(receipt, null, 2)}\n`);
await fs.writeFile(latestReceipt, `${JSON.stringify({ ...receipt, stamped_receipt: rel(stamped) }, null, 2)}\n`);
console.log(JSON.stringify({
  ok: receipt.ok,
  selected_count: selected.length,
  receipt: rel(latestReceipt),
  stamped_receipt: rel(stamped),
  deployed: receipt.deployments.map((item) => ({
    projectId: item.projectId,
    ok: item.ok,
    liveUrl: item.liveUrl,
    deploymentId: item.deploy?.deployment_id || '',
    failures: item.failures
  })),
  failures: receipt.failures
}, null, 2));
if (!receipt.ok) process.exitCode = 1;
