#!/usr/bin/env node
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { resolveZeroOsGateAuth } from './lib/zero-os-gate-auth.mjs';

const repoRoot = process.cwd();
const zeroOsBase = String(process.env.ZERO_OS_LIVE_BASE || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const skynetBase = String(process.env.SKYENET_CONTROL_BASE || process.env.SKYENET_LIVE_BASE || 'https://skyenet.graylondonskyes.workers.dev').replace(/\/+$/, '');
const artifactRoot = path.resolve('test-artifacts/skyenet-static-surface-deploy');
const latestReceipt = path.join(artifactRoot, 'skyenet-static-surface-deploy-latest.json');
const targets = [
  {
    id: '480-realty-property-management',
    name: '480 Realty & Property Management',
    lane: 'skye-clients',
    public_build_dir: 'Skye-Clients/480-realty-property-management-app',
    source_root: 'Skye-Clients/480-realty-property-management-app',
    purpose: 'property management operations app'
  },
  {
    id: 'arclight-pictures',
    name: 'ArcLight Pictures',
    lane: 'skye-clients',
    public_build_dir: 'Skye-Clients/arclight-pictures-app',
    source_root: 'Skye-Clients/arclight-pictures-app',
    purpose: 'video production and creative studio app'
  },
  {
    id: 'dink-and-dine-pickle-park',
    name: 'Dink & Dine Pickle Park',
    lane: 'skye-clients',
    public_build_dir: 'Skye-Clients/dink-and-dine-pickle-park-app',
    source_root: 'Skye-Clients/dink-and-dine-pickle-park-app',
    purpose: 'pickleball, food, events, memberships, and reservations app'
  },
  {
    id: 'techbros-electronic-recycling-itad',
    name: 'Techbros Electronic Recycling & ITAD',
    lane: 'skye-clients',
    public_build_dir: 'Skye-Clients/techbros-electronic-recycling-itad-app',
    source_root: 'Skye-Clients/techbros-electronic-recycling-itad-app',
    purpose: 'electronics recycling, ITAD, logistics, intake, and compliance app'
  },
  {
    id: 'skyeroutex-logistics-public',
    name: 'SkyeRouteX Logistics Public',
    lane: 'company-skynet-drop',
    public_build_dir: 'metraiyux_0s_site/skyenet-drops/skyeroutex-logistics-public',
    source_root: 'metraiyux_0s_site/skyenet-drops/skyeroutex-logistics-public',
    purpose: 'public logistics and route-support company surface'
  },
  {
    id: 'skyesol-company-public',
    name: 'Skyes Over London / SkyesSol Company Public',
    lane: 'company-skynet-drop',
    public_build_dir: 'metraiyux_0s_site/skyenet-drops/skyesol-company-public',
    source_root: 'metraiyux_0s_site/skyenet-drops/skyesol-company-public',
    purpose: 'company public site and ecosystem proof surface'
  },
  {
    id: 'solenterprises-public',
    name: 'SOLEnterprises Public',
    lane: 'company-skynet-drop',
    public_build_dir: 'metraiyux_0s_site/skyenet-drops/solenterprises-public',
    source_root: 'metraiyux_0s_site/skyenet-drops/solenterprises-public',
    purpose: 'public operating systems, AI infrastructure, logistics, and proof surface'
  },
  {
    id: 'valley-verified-custom-build',
    name: 'Valley Verified Custom Build Preview',
    lane: 'platform-skynet-drop',
    public_build_dir: 'metraiyux_0s_site/skyenet-drops/valley-verified-custom-build',
    source_root: 'metraiyux_0s_site/skyenet-drops/valley-verified-custom-build',
    purpose: 'Valley Verified custom build preview surface'
  }
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
    const reader = response.body?.getReader ? response.body.getReader() : null;
    let bytes = 0;
    let truncated = false;
    if (reader) {
      while (bytes < limitBytes) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += Buffer.from(value).byteLength;
      }
      if (bytes >= limitBytes) {
        truncated = true;
        await reader.cancel('proof read limit reached').catch(() => {});
      }
    } else {
      const buffer = Buffer.from(await response.arrayBuffer());
      bytes = Math.min(buffer.byteLength, limitBytes);
      truncated = buffer.byteLength > limitBytes;
    }
    return {
      status: response.status,
      ok: response.ok,
      elapsed_ms: Number((performance.now() - started).toFixed(2)),
      content_type: response.headers.get('content-type') || '',
      content_length: Number(response.headers.get('content-length') || 0) || 0,
      bytes_read: bytes,
      read_truncated: truncated
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      elapsed_ms: Number((performance.now() - started).toFixed(2)),
      content_type: '',
      content_length: 0,
      bytes_read: 0,
      read_truncated: false,
      error: error?.name === 'AbortError' ? `request timed out after ${timeoutMs}ms` : error?.message || String(error)
    };
  } finally {
    clearTimeout(timer);
  }
}

function authHeaders(token) {
  return {
    authorization: `Bearer ${token}`,
    'x-free99-gate-session': token,
    'x-skye-gate-session': token
  };
}

async function ownerLogin() {
  const auth = await resolveZeroOsGateAuth({ zeroOsBase });
  return {
    ok: Boolean(auth.token),
    credential_source: auth.credential?.key || 'missing',
    token: auth.token || '',
    login: {
      status: auth.response?.status || 0,
      ok: Boolean(auth.token),
      token_received: Boolean(auth.token),
      elapsed_ms: auth.response?.elapsed_ms || auth.response?.elapsedMs || 0
    },
    error: auth.token ? '' : auth.response?.body?.error || 'Shared gate login did not return a bearer token.'
  };
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

function liveUrlFor(id) {
  return `${skynetOrigin()}/${id}/`;
}

function routeKeyFor(id) {
  return `route:v1:host:${skynetHost()}:path:/${id}`;
}

async function countFiles(root) {
  let count = 0;
  async function walk(current) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (['.git', 'node_modules', '.wrangler', '.skyenet'].includes(entry.name)) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile()) count += 1;
    }
  }
  await walk(root);
  return count;
}

async function targetWithStats(target) {
  const publicRoot = path.resolve(target.public_build_dir);
  const sourceRoot = path.resolve(target.source_root);
  const stats = {
    public_files: existsSync(publicRoot) ? await countFiles(publicRoot) : 0,
    source_files: existsSync(sourceRoot) ? await countFiles(sourceRoot) : 0
  };
  return {
    ...target,
    public_build_dir: rel(publicRoot),
    source_root: rel(sourceRoot),
    live_url: liveUrlFor(target.id),
    route_key: routeKeyFor(target.id),
    host: skynetHost(),
    mount_path: `/${target.id}`,
    stats
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

function planNameFor(target) {
  if (process.env.SKYENET_STATIC_SURFACE_PLAN) return process.env.SKYENET_STATIC_SURFACE_PLAN;
  return Number(target.stats?.public_files || 0) > 900 ? 'skyenet-edge-growth' : 'skyenet-edge-starter';
}

function deployArgs(target, concurrency) {
  return [
    'tools/skyenet-deploy.mjs',
    '--api', `${skynetBase}/api/skyenet`,
    '--dir', target.public_build_dir,
    '--source-root', target.source_root,
    '--project', target.id,
    '--workspace', target.id,
    '--plan', planNameFor(target),
    '--host', skynetHost(),
    '--mount', `/${target.id}`,
    '--public',
    '--concurrency', String(concurrency)
  ];
}

function runDeploy(target, token, concurrency) {
  const result = spawnSync('node', deployArgs(target, concurrency), {
    cwd: repoRoot,
    env: { ...process.env, SKYENET_AUTH: token },
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024
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

async function routeRecordSmoke(target, deploymentId, token) {
  const routeParams = new URLSearchParams({
    workspace_id: target.id,
    project_id: target.id,
    host: skynetHost(),
    limit: '500'
  });
  const routes = await fetchJson(`${skynetBase}/api/skyenet/routes?${routeParams.toString()}`, {
    headers: authHeaders(token)
  });
  const routeItem = Array.isArray(routes.body?.routes)
    ? routes.body.routes.find((item) => item?.key === target.route_key || (item?.route?.hostname === skynetHost() && item?.route?.project_id === target.id))
    : null;
  const route = routeItem?.route || null;
  const routeOk = Boolean(routes.ok
    && route
    && route.url_mode === 'path'
    && route.mount_path === `/${target.id}`
    && route.workspace_id === target.id
    && route.project_id === target.id
    && route.active_deployment_id === deploymentId
    && route.public_access === true);

  const dashboard = await fetchJson(`${skynetBase}/api/skyenet/dashboard?${new URLSearchParams({ workspace_id: target.id }).toString()}`, {
    headers: authHeaders(token)
  });
  const deployments = dashboard.body?.deployments || dashboard.body?.skynet?.deployments || [];
  const deployment = Array.isArray(deployments)
    ? deployments.find((item) => item?.project_id === target.id && item?.deployment_id === deploymentId)
    : null;
  const dashboardOk = Boolean(dashboard.ok && deployment && deployment.route_key === target.route_key);
  const publicHttp = await fetchText(target.live_url, {}, 10_000);
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
      bytes: publicHttp.bytes,
      title: String(publicHttp.body || '').match(/<title[^>]*>([^<]+)/i)?.[1] || '',
      error: publicHttp.error || ''
    }
  };
}

async function sourceDownloadSmoke(target, deploymentId, token) {
  if (!deploymentId) return { ok: false, skipped: true, reason: 'missing deployment id' };
  const params = new URLSearchParams({
    workspace_id: target.id,
    project_id: target.id,
    deployment_id: deploymentId
  });
  const url = `${skynetBase}/api/skyenet/source-download?${params.toString()}`;
  const unauth = await fetchText(url);
  const auth = await fetchBytesLimited(url, { headers: authHeaders(token) }, 25_000, 128 * 1024);
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

async function founderCommandUpsert(target, deployment, token) {
  const deploymentId = deployment?.deployment_id || '';
  const sourceDownloadApi = deploymentId
    ? `${skynetBase}/api/skyenet/source-download?workspace_id=${encodeURIComponent(target.id)}&project_id=${encodeURIComponent(target.id)}&deployment_id=${encodeURIComponent(deploymentId)}`
    : '';
  const headers = { ...authHeaders(token), accept: 'application/json', 'content-type': 'application/json' };
  const account = await fetchJson(`${zeroOsBase}/api/founder-command/accounts/upsert`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      client_account_id: `founder-client:${target.id}`,
      display_name: target.name,
      client_id: target.id,
      workspace_id: target.id,
      status: 'skyenet-shared-origin-hosted',
      source_systems: ['founder-command', 'skyenet', target.lane],
      routes: {
        sovereign_skynet_app: deployment?.live_url || target.live_url,
        skynet_console: `${skynetBase}/console?workspace_id=${encodeURIComponent(target.id)}`,
        skynet_source_download_api: sourceDownloadApi
      },
      skynet: {
        workspace_id: target.id,
        project_id: target.id,
        deployment_id: deploymentId,
        hostname: skynetHost(),
        mount_path: `/${target.id}`,
        source_download: {
          status: deploymentId ? 'gated-account-download-ready' : 'pending-active-deployment-id',
          api: sourceDownloadApi,
          auth: 'Shared FS27/SkyGate/Free99 bearer session required'
        }
      }
    })
  });
  const operation = await fetchJson(`${zeroOsBase}/api/founder-command/accounts/${encodeURIComponent(`founder-client:${target.id}`)}/operations`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      id: `${target.id}-shared-origin-skynet-hosting`,
      lane: 'skyenet',
      source_app: target.lane,
      source_record_id: target.id,
      status: 'sovereign-skynet-live',
      priority: 'high',
      next_action: `${target.name} is live on SkyeNet shared-origin route ${deployment?.live_url || target.live_url}`,
      links: [
        { label: 'SkyeNet app', href: deployment?.live_url || target.live_url, kind: 'skyenet' },
        { label: 'SkyeNet console', href: `${skynetBase}/console?workspace_id=${encodeURIComponent(target.id)}`, kind: 'skyenet-console' }
      ]
    })
  });
  return {
    ok: Boolean(account.ok && account.body?.ok !== false && operation.ok && operation.body?.ok !== false),
    account: { status: account.status, ok: Boolean(account.ok && account.body?.ok !== false) },
    operation: { status: operation.status, ok: Boolean(operation.ok && operation.body?.ok !== false) }
  };
}

async function writeDeployTarget(target, deployment, smokes) {
  const deploymentId = deployment?.deployment_id || '';
  const sourceDownloadApi = deploymentId
    ? `${skynetBase}/api/skyenet/source-download?workspace_id=${encodeURIComponent(target.id)}&project_id=${encodeURIComponent(target.id)}&deployment_id=${encodeURIComponent(deploymentId)}`
    : '';
  const payload = {
    schema: 'skyenet.static-surface.deploy-target.v1',
    updatedAt: new Date().toISOString(),
    deployHost: 'SkyeNet shared origin path route',
    lane: target.lane,
    purpose: target.purpose,
    projectId: target.id,
    workspaceId: target.id,
    planName: planNameFor(target),
    deploymentId,
    publicUrl: deployment?.live_url || target.live_url,
    host: skynetHost(),
    mountPath: `/${target.id}`,
    urlMode: 'path',
    publicAccess: true,
    sourceRoot: target.source_root,
    publicBuildDir: target.public_build_dir,
    sourceCustody: {
      privateSourcePackage: true,
      sourceDownloadApi,
      auth: 'Shared FS27/SkyGate/Free99 bearer session required'
    },
    proofRequired: 'Non-browser HTTP/API smoke plus owner manual browser check',
    lastSmoke: smokes
  };
  const paths = [...new Set([
    path.resolve(target.public_build_dir, 'deploy-target.json'),
    path.resolve(target.source_root, 'deploy-target.json')
  ])];
  const written = [];
  for (const file of paths) {
    if (!file.startsWith(repoRoot)) continue;
    await fs.writeFile(file, `${JSON.stringify(payload, null, 2)}\n`);
    written.push(rel(file));
  }
  return written;
}

function selectTargets(all) {
  const ids = arg('ids', '').split(',').map((item) => item.trim()).filter(Boolean);
  const lane = arg('lane', '');
  const limit = Number(arg('limit', ids.length ? String(ids.length) : '0'));
  let selected = all;
  if (ids.length) selected = selected.filter((item) => ids.includes(item.id));
  if (lane) selected = selected.filter((item) => item.lane === lane);
  if (limit > 0) selected = selected.slice(0, limit);
  return selected;
}

async function main() {
  const generatedAt = new Date().toISOString();
  const dryRun = flag('dry-run');
  const verifyExisting = flag('verify-existing');
  const skipFounder = flag('no-founder');
  const concurrency = Number(arg('concurrency', process.env.SKYENET_STATIC_SURFACE_DEPLOY_CONCURRENCY || '4'));
  const prepared = [];
  for (const target of targets) {
    if (!existsSync(path.resolve(target.public_build_dir, 'index.html'))) continue;
    prepared.push(await targetWithStats(target));
  }
  const selected = selectTargets(prepared);
  const receipt = {
    schema: 'skyenet.static-surface.deploy.batch.v1',
    ok: false,
    generated_at: generatedAt,
    no_browser_proof_run: true,
    owner_manual_live_check: true,
    zero_os_base: zeroOsBase,
    skynet_base: skynetBase,
    selected_count: selected.length,
    credential_source: '',
    login: null,
    deployments: [],
    failures: []
  };
  if (!selected.length) receipt.failures.push('No static surface deploy targets selected.');

  const auth = dryRun ? { ok: true, credential_source: 'dry-run', token: '', login: null } : await ownerLogin();
  receipt.credential_source = auth.credential_source;
  receipt.login = auth.login;
  if (!auth.ok) receipt.failures.push(auth.error || 'Owner login failed.');

  for (const target of selected) {
    const item = {
      id: target.id,
      name: target.name,
      lane: target.lane,
      purpose: target.purpose,
      target,
      command: deployArgs(target, concurrency).join(' '),
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
    if (!auth.ok) {
      item.failures.push('Shared FS27/SkyGate/Free99 login failed; deployment was not attempted.');
      receipt.deployments.push(item);
      continue;
    }

    const existingTarget = await readJson(path.resolve(target.public_build_dir, 'deploy-target.json'), {});
    const deploy = verifyExisting
      ? {
          ok: Boolean(existingTarget.deploymentId),
          status: existingTarget.deploymentId ? 0 : 1,
          deploy: {
            ok: Boolean(existingTarget.deploymentId),
            project_id: target.id,
            workspace_id: target.id,
            deployment_id: existingTarget.deploymentId || '',
            live_url: existingTarget.publicUrl || target.live_url,
            route_key: target.route_key,
            file_count: 0,
            private_source_package: existingTarget.sourceCustody ? { uploaded: true, existing: true } : null
          },
          stdout_tail: existingTarget.deploymentId ? 'Verified existing SkyeNet deployment from deploy-target.json.' : '',
          stderr_tail: existingTarget.deploymentId ? '' : 'Missing deploy-target deploymentId.'
        }
      : runDeploy(target, auth.token, concurrency);

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
      item.smoke = await routeRecordSmoke(target, deploy.deploy?.deployment_id || '', auth.token);
      if (!item.smoke.ok) item.failures.push('SkyeNet route/dashboard/public HTTP smoke failed.');
      item.source_download = await sourceDownloadSmoke(target, deploy.deploy?.deployment_id || '', auth.token);
      if (!item.source_download.ok) item.failures.push('SkyeNet source-download custody smoke failed.');
      if (!skipFounder) {
        item.founder_command = await founderCommandUpsert(target, deploy.deploy, auth.token);
        if (!item.founder_command.ok) item.failures.push('Founder Command account/operation upsert failed.');
      }
      item.deploy_targets_written = await writeDeployTarget(target, deploy.deploy, {
        route: item.smoke,
        sourceDownload: item.source_download
      });
    }
    item.ok = item.failures.length === 0;
    if (!item.ok) receipt.failures.push(`${target.id}: ${item.failures.join(' ')}`);
    receipt.deployments.push(item);
  }

  receipt.ok = receipt.failures.length === 0;
  await fs.mkdir(artifactRoot, { recursive: true });
  const stamped = path.join(artifactRoot, `skyenet-static-surface-deploy-${generatedAt.replace(/[:.]/g, '-')}.json`);
  await fs.writeFile(stamped, `${JSON.stringify(receipt, null, 2)}\n`);
  await fs.writeFile(latestReceipt, `${JSON.stringify({ ...receipt, stamped_receipt: rel(stamped) }, null, 2)}\n`);
  console.log(JSON.stringify({
    ok: receipt.ok,
    dry_run: dryRun,
    verify_existing: verifyExisting,
    selected_count: selected.length,
    receipt: rel(latestReceipt),
    stamped_receipt: rel(stamped),
    deployed: receipt.deployments.map((item) => ({
      id: item.id,
      name: item.name,
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
    schema: 'skyenet.static-surface.deploy.batch.v1',
    ok: false,
    generated_at: new Date().toISOString(),
    no_browser_proof_run: true,
    fatal: error?.stack || error?.message || String(error)
  };
  await fs.writeFile(latestReceipt, `${JSON.stringify(receipt, null, 2)}\n`);
  console.error(JSON.stringify({ ok: false, receipt: rel(latestReceipt), fatal: receipt.fatal }, null, 2));
  process.exitCode = 1;
});
