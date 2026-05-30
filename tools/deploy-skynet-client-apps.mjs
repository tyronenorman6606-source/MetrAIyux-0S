#!/usr/bin/env node
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';

const repoRoot = process.cwd();
const inventoryPath = path.resolve(process.env.SKYENET_CLIENT_APP_INVENTORY || 'test-artifacts/skyenet-client-app-migration-inventory/skyenet-client-app-migration-inventory-latest.json');
const zeroOsBase = String(process.env.ZERO_OS_LIVE_BASE || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const skynetBase = String(process.env.SKYENET_CONTROL_BASE || process.env.SKYENET_LIVE_BASE || 'https://skyenet.graylondonskyes.workers.dev').replace(/\/+$/, '');
const sharedOriginMode = flag('shared-origin');
const musicNexusSourceScope = String(arg('musicnexus-source-scope', process.env.SKYENET_MUSICNEXUS_SOURCE_SCOPE || 'storefront')).trim().toLowerCase();
const artifactRoot = path.resolve('test-artifacts/skyenet-client-app-deploy');
const latestReceipt = path.join(artifactRoot, 'skyenet-client-app-deploy-latest.json');
const templateClientIds = new Set(['skye-app-template']);
const credentialKeys = [
  'ZERO_OS_GATE_CODE',
  'METRAIYUX_OWNER_ADMIN_CODE',
  'FREE99_ADMIN_CODE',
  'FREE99_ADMIN_PASSWORD',
  'OWNER_ADMIN_CODE',
  'OWNER_ADMIN_PASSWORD',
  'SKYGATEFS13_ADMIN_PASSWORD',
  'SKYGATE_ADMIN_PASSWORD',
  'SKYGATEFS27_ADMIN_PASSWORD',
  'FS27_ADMIN_PASSWORD'
];

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

function unquote(value = '') {
  const text = String(value || '').trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) return text.slice(1, -1);
  return text;
}

async function readJson(file, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

async function readEnvFile(file) {
  if (!file || !existsSync(file)) return {};
  const rows = {};
  const text = await fs.readFile(file, 'utf8');
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (match) rows[match[1]] = unquote(match[2]);
  }
  return rows;
}

function expandEnvRefs(values) {
  const out = { ...values };
  for (let pass = 0; pass < 3; pass += 1) {
    for (const [key, value] of Object.entries(out)) {
      out[key] = String(value || '').replace(/\$\{([A-Z0-9_]+)\}/g, (_match, ref) => out[ref] || '');
    }
  }
  return out;
}

async function ownerCredential() {
  const files = [
    process.env.ROOT_ENV_FILE,
    process.env.METRAIYUX_ROOT_ENV,
    '.env',
    'env.txt'
  ].filter(Boolean).map((file) => path.resolve(file));
  let merged = { ...process.env };
  for (const file of files) Object.assign(merged, await readEnvFile(file));
  merged = expandEnvRefs(merged);
  for (const key of credentialKeys) {
    if (merged[key]) return { key, value: merged[key] };
  }
  return { key: '', value: '' };
}

async function fetchText(url, init = {}, timeoutMs = 20_000) {
  const started = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      redirect: 'manual',
      headers: { accept: 'text/html,application/json,text/plain,*/*', ...(init.headers || {}) },
      ...init,
      signal: controller.signal
    });
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
  const response = await fetchText(url, {
    ...init,
    headers: { accept: 'application/json', ...(init.headers || {}) }
  });
  let body = {};
  try { body = response.body ? JSON.parse(response.body) : {}; } catch { body = { text: response.body }; }
  return { ...response, body };
}

async function fetchBytesLimited(url, init = {}, timeoutMs = 25_000, limitBytes = 128 * 1024) {
  const started = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      redirect: 'manual',
      headers: { accept: 'application/x-tar,application/octet-stream,*/*', ...(init.headers || {}) },
      ...init,
      signal: controller.signal
    });
    const chunks = [];
    let bytes = 0;
    let truncated = false;
    const reader = response.body?.getReader ? response.body.getReader() : null;
    if (reader) {
      while (bytes < limitBytes) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = Buffer.from(value);
        chunks.push(chunk);
        bytes += chunk.byteLength;
      }
      if (bytes >= limitBytes) {
        truncated = true;
        await reader.cancel('proof read limit reached').catch(() => {});
      }
    } else {
      const buffer = Buffer.from(await response.arrayBuffer());
      bytes = Math.min(buffer.byteLength, limitBytes);
      truncated = buffer.byteLength > limitBytes;
      chunks.push(buffer.subarray(0, limitBytes));
    }
    return {
      status: response.status,
      ok: response.ok,
      elapsed_ms: Number((performance.now() - started).toFixed(2)),
      content_type: response.headers.get('content-type') || '',
      content_length: Number(response.headers.get('content-length') || 0) || 0,
      bytes_read: bytes,
      read_limit_bytes: limitBytes,
      read_truncated: truncated,
      sample_text: Buffer.concat(chunks, Math.min(bytes, limitBytes)).toString('utf8').slice(0, 500)
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      elapsed_ms: Number((performance.now() - started).toFixed(2)),
      content_type: '',
      content_length: 0,
      bytes_read: 0,
      read_limit_bytes: limitBytes,
      read_truncated: false,
      sample_text: '',
      error: error?.name === 'AbortError' ? `request timed out after ${timeoutMs}ms` : error?.message || String(error)
    };
  } finally {
    clearTimeout(timer);
  }
}

function authHeaders(token) {
  return {
    authorization: `Bearer ${token}`,
    'x-admin-token': token,
    'x-free99-gate-session': token,
    'x-skye-gate-session': token
  };
}

async function ownerLogin() {
  const existing = String(process.env.SKYENET_AUTH || process.env.ZERO_OS_GATE_SESSION || '').replace(/^Bearer\s+/i, '').trim();
  if (existing) return { ok: true, credential_source: 'process-env:SKYENET_AUTH/ZERO_OS_GATE_SESSION', token: existing, login: null };
  const credential = await ownerCredential();
  if (!credential.value) return { ok: false, credential_source: 'missing', token: '', login: null, error: 'No shared owner gate credential found.' };
  const login = await fetchJson(`${zeroOsBase}/api/founder-command/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ code: credential.value })
  });
  const token = login.body?.gateBearerToken || login.body?.gateToken || login.body?.token || '';
  return {
    ok: Boolean(login.ok && token),
    credential_source: credential.key,
    token,
    login: {
      status: login.status,
      ok: Boolean(login.ok && token),
      token_received: Boolean(token),
      elapsed_ms: login.elapsed_ms
    },
    error: token ? '' : login.body?.error || 'Shared gate login did not return a bearer token.'
  };
}

function parseDeployOutput(stdout = '') {
  const match = String(stdout || '').match(/\{\s*"ok"[\s\S]*\}\s*$/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function candidateSelection(inventory) {
  const ids = arg('ids', '').split(',').map((item) => item.trim()).filter(Boolean);
  const lane = arg('lane', 'client-app-factory-generated-app');
  const priority = arg('priority', '');
  const limit = Number(arg('limit', ids.length ? String(ids.length) : '0'));
  const includeTemplates = flag('include-templates');
  let candidates = inventory.candidates || [];
  if (ids.length) candidates = candidates.filter((item) => ids.includes(item.id));
  else {
    if (lane) candidates = candidates.filter((item) => item.lane === lane);
    if (priority) candidates = candidates.filter((item) => item.priority === priority);
    if (!includeTemplates) candidates = candidates.filter((item) => !templateClientIds.has(item.id));
  }
  candidates = candidates.filter((item) => item.build_exists && item.source_exists);
  if (limit > 0) candidates = candidates.slice(0, limit);
  return candidates;
}

function planNameFor(candidate) {
  if (process.env.SKYENET_CLIENT_APP_PLAN) return process.env.SKYENET_CLIENT_APP_PLAN;
  const bytes = Number(candidate.stats?.bytes || 0);
  if (bytes > 150 * 1024 * 1024) return 'skyenet-sovereign-runtime-reserve';
  return bytes > 24 * 1024 * 1024 ? 'skyenet-edge-growth' : 'skyenet-edge-starter';
}

function workspaceIdFor(candidate) {
  return candidate.target?.workspace_id || candidate.workspace_id || candidate.id.replace(/^musicnexus-/, '');
}

function skynetOrigin() {
  try {
    return new URL(skynetBase).origin;
  } catch {
    return 'https://skyenet.graylondonskyes.workers.dev';
  }
}

function skynetHost() {
  try {
    return new URL(skynetBase).hostname;
  } catch {
    return 'skyenet.graylondonskyes.workers.dev';
  }
}

function cleanMountPath(value = '') {
  const raw = String(value || '').trim();
  if (!raw || raw === '/') return '/';
  const withSlash = raw.startsWith('/') ? raw : `/${raw}`;
  return withSlash.replace(/\/+$/, '') || '/';
}

function liveUrlForTarget(target) {
  const mount = cleanMountPath(target.mount_path || '/');
  const suffix = mount.endsWith('/') ? mount : `${mount}/`;
  if (target.hostname === skynetHost()) return `${skynetOrigin()}${suffix}`;
  return `https://${target.hostname}${suffix}`;
}

function targetFor(candidate) {
  const base = candidate.target || {};
  if (!sharedOriginMode) return base;
  const target = {
    ...base,
    hostname: skynetHost(),
    mount_path: cleanMountPath(`/${candidate.id}`),
    url_mode: 'path',
    public_access: true
  };
  target.live_url = liveUrlForTarget(target);
  return target;
}

function routeKeyForTarget(target = {}) {
  const host = String(target.hostname || '').toLowerCase();
  const mount = cleanMountPath(target.mount_path || '/');
  return mount === '/'
    ? `route:v1:host:${host}`
    : `route:v1:host:${host}:path:${mount}`;
}

function deployArgs(candidate, concurrency) {
  const target = targetFor(candidate);
  const args = [
    'tools/skyenet-deploy.mjs',
    '--api', `${skynetBase}/api/skyenet`,
    '--dir', candidate.public_build_dir,
    '--source-root', sourceRootFor(candidate),
    '--project', candidate.id,
    '--workspace', workspaceIdFor(candidate),
    '--plan', planNameFor(candidate),
    '--host', target.hostname,
    '--mount', target.mount_path || '/',
    '--public',
    '--concurrency', String(concurrency)
  ];
  if (target.url_mode && target.url_mode !== 'path') args.push('--url-mode', target.url_mode);
  return args;
}

function sourceRootFor(candidate) {
  if (candidate.lane === 'musicnexus-artist-storefront' && musicNexusSourceScope !== 'platform') {
    return candidate.public_build_dir;
  }
  return candidate.source_root;
}

function runDeploy(candidate, token, concurrency) {
  const result = spawnSync('node', deployArgs(candidate, concurrency), {
    cwd: repoRoot,
    env: { ...process.env, SKYENET_AUTH: token },
    encoding: 'utf8',
    maxBuffer: 24 * 1024 * 1024
  });
  const deploy = parseDeployOutput(result.stdout);
  return {
    ok: result.status === 0 && deploy?.ok === true,
    status: result.status ?? 1,
    deploy,
    stdout_tail: String(result.stdout || '').slice(-5000),
    stderr_tail: String(result.stderr || '').slice(-5000)
  };
}

async function hostHeaderSmoke(candidate) {
  const target = targetFor(candidate);
  const route = await fetchText(`${skynetBase}/`, {
    headers: { host: target.hostname }
  });
  const title = String(route.body || '').match(/<title[^>]*>([^<]+)/i)?.[1] || '';
  return {
    status: route.status,
    ok: route.ok && /html/i.test(route.content_type) && /<!doctype|<html/i.test(route.body),
    content_type: route.content_type,
    elapsed_ms: route.elapsed_ms,
    bytes: route.bytes,
    title,
    missing_route_header_probe_error: route.error || ''
  };
}

async function routeRecordSmoke(candidate, deploymentId, token) {
  const workspaceId = workspaceIdFor(candidate);
  const target = targetFor(candidate);
  const routeParams = new URLSearchParams({
    workspace_id: workspaceId,
    project_id: candidate.id,
    host: target.hostname,
    limit: '500'
  });
  const routes = await fetchJson(`${skynetBase}/api/skyenet/routes?${routeParams.toString()}`, {
    headers: authHeaders(token)
  });
  const routeItem = Array.isArray(routes.body?.routes)
    ? routes.body.routes.find((item) => item?.route?.hostname === target.hostname && item?.route?.project_id === candidate.id)
    : null;
  const route = routeItem?.route || null;
  const expectedMount = cleanMountPath(target.mount_path || '/') === '/' ? '' : cleanMountPath(target.mount_path || '/');
  const expectedMode = target.url_mode === 'subdomain' ? 'subdomain' : 'path';
  const routeOk = Boolean(routes.ok
    && route
    && route.url_mode === expectedMode
    && route.mount_path === expectedMount
    && route.workspace_id === workspaceId
    && route.project_id === candidate.id
    && route.active_deployment_id === deploymentId
    && route.public_access === true);

  const dashboard = await fetchJson(`${skynetBase}/api/skyenet/dashboard?${new URLSearchParams({ workspace_id: workspaceId }).toString()}`, {
    headers: authHeaders(token)
  });
  const deployments = dashboard.body?.deployments || dashboard.body?.skynet?.deployments || [];
  const deployment = Array.isArray(deployments)
    ? deployments.find((item) => item?.project_id === candidate.id && item?.deployment_id === deploymentId)
    : null;
  const dashboardOk = Boolean(dashboard.ok && deployment && (!deployment.route_key || deployment.route_key === routeKeyForTarget(target)));
  const publicHttp = await fetchText(target.live_url, {}, 8000);
  return {
    ok: routeOk && dashboardOk && publicHttp.ok,
    route_record: {
      status: routes.status,
      ok: routeOk,
      count: routes.body?.count ?? 0,
      key: routeItem?.key || '',
      route: route ? {
        hostname: route.hostname,
        mount_path: route.mount_path,
        url_mode: route.url_mode,
        workspace_id: route.workspace_id,
        project_id: route.project_id,
        active_deployment_id: route.active_deployment_id,
        public_access: route.public_access,
        default_auth: route.default_auth,
        asset_prefix: route.asset_prefix,
        updated_at: route.updated_at
      } : null,
      elapsed_ms: routes.elapsed_ms
    },
    dashboard: {
      status: dashboard.status,
      ok: dashboardOk,
      deployment_found: Boolean(deployment),
      live_url: deployment?.live_url || '',
      route_key: deployment?.route_key || '',
      elapsed_ms: dashboard.elapsed_ms
    },
    public_http: {
      status: publicHttp.status,
      ok: publicHttp.ok,
      content_type: publicHttp.content_type,
      location: publicHttp.location,
      elapsed_ms: publicHttp.elapsed_ms,
      error: publicHttp.error || '',
      blocker: publicHttp.ok ? '' : (sharedOriginMode
        ? 'Shared SkyeNet origin path route is not publicly resolving.'
        : 'Public DNS/custom-host edge binding may still be pending for this host-native SkyeNet URL.')
    },
    host_header_probe: await hostHeaderSmoke(candidate)
  };
}

async function sourceDownloadSmoke(candidate, deploymentId, token) {
  if (!deploymentId) {
    return { ok: false, skipped: true, reason: 'missing deployment id' };
  }
  const params = new URLSearchParams({
    workspace_id: workspaceIdFor(candidate),
    project_id: candidate.id,
    deployment_id: deploymentId
  });
  const url = `${skynetBase}/api/skyenet/source-download?${params.toString()}`;
  const unauth = await fetchText(url);
  const timeoutMs = Number(process.env.SKYENET_SOURCE_DOWNLOAD_SMOKE_TIMEOUT_MS || 120_000);
  const auth = await fetchBytesLimited(url, { headers: authHeaders(token) }, timeoutMs, 128 * 1024);
  return {
    ok: (unauth.status === 401 || unauth.status === 403) && auth.status === 200 && auth.content_type === 'application/x-tar' && auth.bytes_read > 0,
    url,
    unauth: { status: unauth.status, ok: unauth.status === 401 || unauth.status === 403, content_type: unauth.content_type, elapsed_ms: unauth.elapsed_ms },
    auth: {
      status: auth.status,
      ok: auth.status === 200,
      content_type: auth.content_type,
      content_length: auth.content_length,
      bytes_read: auth.bytes_read,
      read_truncated: auth.read_truncated,
      elapsed_ms: auth.elapsed_ms,
      error: auth.error || ''
    }
  };
}

async function founderCommandUpsert(candidate, deployment, token) {
  const target = targetFor(candidate);
  const liveUrl = deployment?.live_url || target.live_url;
  const deploymentId = deployment?.deployment_id || '';
  const workspaceId = workspaceIdFor(candidate);
  const sourceDownloadApi = deploymentId
    ? `${skynetBase}/api/skyenet/source-download?workspace_id=${encodeURIComponent(workspaceId)}&project_id=${encodeURIComponent(candidate.id)}&deployment_id=${encodeURIComponent(deploymentId)}`
    : '';
  const headers = { ...authHeaders(token), accept: 'application/json', 'content-type': 'application/json' };
  const account = await fetchJson(`${zeroOsBase}/api/founder-command/accounts/upsert`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      client_account_id: `founder-client:${candidate.id}`,
      display_name: candidate.name,
      client_id: candidate.id,
      workspace_id: workspaceId,
      status: 'skyenet-standalone-hosted',
      source_systems: ['founder-command', 'skyenet', 'client-app-factory'],
      routes: {
        sovereign_skynet_app: liveUrl,
        skynet_console: `${skynetBase}/console?workspace_id=${encodeURIComponent(workspaceId)}`,
        skynet_source_download_api: sourceDownloadApi,
        legacy_zero_os_routes: candidate.current_routes || []
      },
      skynet: {
        workspace_id: workspaceId,
        project_id: candidate.id,
        deployment_id: deploymentId,
        hostname: target.hostname,
        mount_path: target.mount_path || '/',
        source_download: {
          status: deploymentId ? 'gated-account-download-ready' : 'pending-active-deployment-id',
          api: sourceDownloadApi,
          auth: 'Shared FS27/SkyGate/Free99 bearer session required'
        }
      }
    })
  });
  const operation = await fetchJson(`${zeroOsBase}/api/founder-command/accounts/${encodeURIComponent(`founder-client:${candidate.id}`)}/operations`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      id: `${candidate.id}-standalone-skynet-hosting`,
      lane: 'skyenet',
      source_app: 'client-app-factory',
      source_record_id: candidate.id,
      status: 'sovereign-skynet-live',
      priority: 'high',
      next_action: `${candidate.name} is hosted through standalone SkyeNet route ${liveUrl}`,
      links: [
        { label: 'Standalone SkyeNet app', href: liveUrl, kind: 'skyenet' },
        { label: 'SkyeNet console', href: `${skynetBase}/console?workspace_id=${encodeURIComponent(workspaceId)}`, kind: 'skyenet-console' }
      ]
    })
  });
  return {
    ok: Boolean(account.ok && account.body?.ok !== false && operation.ok && operation.body?.ok !== false),
    account: { status: account.status, ok: Boolean(account.ok && account.body?.ok !== false) },
    operation: { status: operation.status, ok: Boolean(operation.ok && operation.body?.ok !== false) }
  };
}

async function writeDeployTarget(candidate, deployment, smokes) {
  const routeTarget = targetFor(candidate);
  const deploymentId = deployment?.deployment_id || '';
  const workspaceId = workspaceIdFor(candidate);
  const sourceDownloadApi = deploymentId
    ? `${skynetBase}/api/skyenet/source-download?workspace_id=${encodeURIComponent(workspaceId)}&project_id=${encodeURIComponent(candidate.id)}&deployment_id=${encodeURIComponent(deploymentId)}`
    : '';
  const target = {
    schema: 'skyenet.client-app.deploy-target.v1',
    updatedAt: new Date().toISOString(),
    deployHost: sharedOriginMode ? 'SkyeNet shared origin path route' : 'SkyeNet standalone',
    projectId: candidate.id,
    workspaceId,
    planName: planNameFor(candidate),
    deploymentId,
    publicUrl: deployment?.live_url || routeTarget.live_url,
    host: routeTarget.hostname,
    mountPath: routeTarget.mount_path || '/',
    urlMode: routeTarget.url_mode || 'path',
    publicAccess: true,
    sourceRoot: sourceRootFor(candidate),
    publicBuildDir: candidate.public_build_dir,
    sourceCustody: {
      privateSourcePackage: true,
      sourceDownloadApi,
      auth: 'Shared FS27/SkyGate/Free99 bearer session required'
    },
    legacyRoutes: candidate.current_routes || [],
    proofRequired: 'Non-browser HTTP/API smoke plus owner manual browser check',
    lastSmoke: smokes
  };
  const paths = [...new Set([
    path.resolve(candidate.public_build_dir, 'deploy-target.json'),
    path.resolve(sourceRootFor(candidate), 'deploy-target.json')
  ])];
  const written = [];
  for (const file of paths) {
    if (!file.startsWith(repoRoot)) continue;
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, `${JSON.stringify(target, null, 2)}\n`);
    written.push(rel(file));
  }
  return written;
}

async function main() {
  const generatedAt = new Date().toISOString();
  const inventory = await readJson(inventoryPath);
  if (!inventory?.candidates) throw new Error(`Inventory missing or invalid: ${inventoryPath}`);
  const dryRun = flag('dry-run');
  const verifyExisting = flag('verify-existing');
  const skipFounder = flag('no-founder');
  const concurrency = Number(arg('concurrency', process.env.SKYENET_CLIENT_APP_DEPLOY_CONCURRENCY || '4'));
  const selected = candidateSelection(inventory);
  const receipt = {
    schema: 'skyenet.client-app.deploy.batch.v1',
    ok: false,
    generated_at: generatedAt,
    no_browser_proof_run: true,
    owner_manual_live_check: true,
    shared_origin_mode: sharedOriginMode,
    musicnexus_source_scope: musicNexusSourceScope,
    dry_run: dryRun,
    zero_os_base: zeroOsBase,
    skynet_base: skynetBase,
    inventory: rel(inventoryPath),
    selected_count: selected.length,
    credential_source: '',
    login: null,
    deployments: [],
    failures: []
  };
  if (!selected.length) receipt.failures.push('No deploy candidates selected.');

  const auth = dryRun ? { ok: true, credential_source: 'dry-run', token: '', login: null } : await ownerLogin();
  receipt.credential_source = auth.credential_source;
  receipt.login = auth.login;
  if (!auth.ok) receipt.failures.push(auth.error || 'Owner login failed.');
  if (!dryRun && !auth.ok) {
    for (const candidate of selected) {
      receipt.deployments.push({
        id: candidate.id,
        name: candidate.name,
        lane: candidate.lane,
        target: targetFor(candidate),
        public_build_dir: candidate.public_build_dir,
        source_root: sourceRootFor(candidate),
        command: deployArgs(candidate, concurrency).join(' '),
        deploy: null,
        smoke: null,
        source_download: null,
        founder_command: null,
        deploy_targets_written: [],
        ok: false,
        failures: ['Shared FS27/SkyGate/Free99 login failed; deployment was not attempted.']
      });
    }
    await fs.mkdir(artifactRoot, { recursive: true });
    const stamped = path.join(artifactRoot, `skyenet-client-app-deploy-${generatedAt.replace(/[:.]/g, '-')}.json`);
    await fs.writeFile(stamped, `${JSON.stringify(receipt, null, 2)}\n`);
    await fs.writeFile(latestReceipt, `${JSON.stringify({ ...receipt, stamped_receipt: rel(stamped) }, null, 2)}\n`);
    console.log(JSON.stringify({
      ok: false,
      dry_run: dryRun,
      selected_count: selected.length,
      receipt: rel(latestReceipt),
      stamped_receipt: rel(stamped),
      deployed: receipt.deployments.map((item) => ({
        id: item.id,
        ok: item.ok,
        live_url: item.target.live_url,
        deployment_id: '',
        failures: item.failures
      })),
      failures: receipt.failures
    }, null, 2));
    process.exitCode = 1;
    return;
  }

  for (const candidate of selected) {
    const target = targetFor(candidate);
    const item = {
      id: candidate.id,
      name: candidate.name,
      lane: candidate.lane,
      target,
      public_build_dir: candidate.public_build_dir,
      source_root: sourceRootFor(candidate),
      command: deployArgs(candidate, concurrency).join(' '),
      deploy: null,
      smoke: null,
      source_download: null,
      founder_command: null,
      deploy_targets_written: [],
      ok: false,
      failures: []
    };
    if (dryRun) {
      item.ok = true;
      receipt.deployments.push(item);
      continue;
    }
    const existingTarget = await readJson(path.resolve(candidate.public_build_dir, 'deploy-target.json'), {});
    const deploy = verifyExisting
      ? {
          ok: Boolean(arg('deployment', existingTarget.deploymentId || '')),
          status: 0,
          deploy: {
            ok: true,
            project_id: candidate.id,
            workspace_id: workspaceIdFor(candidate),
            deployment_id: arg('deployment', existingTarget.deploymentId || ''),
            live_url: existingTarget.publicUrl || target.live_url,
            route_key: routeKeyForTarget(target),
            file_count: 0,
            private_source_package: existingTarget.sourceCustody ? { uploaded: true, existing: true } : null
          },
          stdout_tail: 'Verified existing SkyeNet deployment from deploy-target.json.',
          stderr_tail: ''
        }
      : runDeploy(candidate, auth.token, concurrency);
    item.deploy = {
      ok: deploy.ok,
      status: deploy.status,
      project_id: deploy.deploy?.project_id || '',
      workspace_id: deploy.deploy?.workspace_id || '',
      deployment_id: deploy.deploy?.deployment_id || '',
      live_url: deploy.deploy?.live_url || '',
      route_key: deploy.deploy?.route_key || '',
      file_count: deploy.deploy?.file_count || 0,
      private_source_package: deploy.deploy?.private_source_package || null,
      stdout_tail: deploy.stdout_tail,
      stderr_tail: deploy.stderr_tail
    };
    if (!deploy.ok) item.failures.push('SkyeNet deploy failed.');

    if (deploy.ok) {
      item.smoke = await routeRecordSmoke(candidate, deploy.deploy?.deployment_id || '', auth.token);
      if (!item.smoke.ok) item.failures.push('SkyeNet route-record smoke failed.');
      if (item.smoke?.public_http && !item.smoke.public_http.ok) {
        item.failures.push(sharedOriginMode
          ? 'Shared SkyeNet public HTTP smoke failed; route is not publicly reachable.'
          : 'Host-native SkyeNet public HTTP smoke failed; DNS/custom-host edge binding is still pending or unreachable.');
      }
      item.source_download = await sourceDownloadSmoke(candidate, deploy.deploy?.deployment_id || '', auth.token);
      if (!item.source_download.ok) item.failures.push('SkyeNet source-download custody smoke failed.');
      if (!skipFounder) {
        item.founder_command = await founderCommandUpsert(candidate, deploy.deploy, auth.token);
        if (!item.founder_command.ok) item.failures.push('Founder Command account/operation upsert failed.');
      }
      item.deploy_targets_written = await writeDeployTarget(candidate, deploy.deploy, {
        hostHeader: item.smoke,
        sourceDownload: item.source_download
      });
    }
    item.ok = item.failures.length === 0;
    if (!item.ok) receipt.failures.push(`${candidate.id}: ${item.failures.join(' ')}`);
    receipt.deployments.push(item);
  }

  receipt.ok = receipt.failures.length === 0;
  await fs.mkdir(artifactRoot, { recursive: true });
  const stamped = path.join(artifactRoot, `skyenet-client-app-deploy-${generatedAt.replace(/[:.]/g, '-')}.json`);
  await fs.writeFile(stamped, `${JSON.stringify(receipt, null, 2)}\n`);
  await fs.writeFile(latestReceipt, `${JSON.stringify({ ...receipt, stamped_receipt: rel(stamped) }, null, 2)}\n`);
  console.log(JSON.stringify({
    ok: receipt.ok,
    dry_run: dryRun,
    selected_count: selected.length,
    receipt: rel(latestReceipt),
    stamped_receipt: rel(stamped),
    deployed: receipt.deployments.map((item) => ({
      id: item.id,
      ok: item.ok,
      live_url: item.deploy?.live_url || item.target.live_url,
      deployment_id: item.deploy?.deployment_id || '',
      failures: item.failures
    })),
    failures: receipt.failures
  }, null, 2));
  if (!receipt.ok) process.exitCode = 1;
}

main().catch(async (error) => {
  await fs.mkdir(artifactRoot, { recursive: true });
  const receipt = {
    schema: 'skyenet.client-app.deploy.batch.v1',
    ok: false,
    generated_at: new Date().toISOString(),
    no_browser_proof_run: true,
    fatal: error?.stack || error?.message || String(error)
  };
  await fs.writeFile(latestReceipt, `${JSON.stringify(receipt, null, 2)}\n`);
  console.error(JSON.stringify({ ok: false, receipt: rel(latestReceipt), fatal: receipt.fatal }, null, 2));
  process.exitCode = 1;
});
