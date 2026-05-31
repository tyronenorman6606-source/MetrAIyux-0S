#!/usr/bin/env node
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';

const repoRoot = process.cwd();
const artifactRoot = path.join(repoRoot, 'test-artifacts', 'company-skynet-host-routes');
const latestReceipt = path.join(artifactRoot, 'company-skynet-host-routes-latest.json');
const zeroOsBase = String(process.env.ZERO_OS_LIVE_BASE || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const skynetBase = String(process.env.SKYENET_CONTROL_BASE || process.env.SKYENET_LIVE_BASE || 'https://skyenet.graylondonskyes.workers.dev').replace(/\/+$/, '');
const directTimeoutMs = Number(process.env.COMPANY_SKYNET_DIRECT_TIMEOUT_MS || 12000);
const sourceReadLimitBytes = Number(process.env.COMPANY_SKYNET_SOURCE_READ_LIMIT_BYTES || 4 * 1024 * 1024);
const sourceReadTimeoutMs = Number(process.env.COMPANY_SKYNET_SOURCE_READ_TIMEOUT_MS || 20000);

const targets = [
  {
    id: 'skyeroutex-logistics',
    workspace_id: 'skyeroutex-logistics',
    project_id: 'skyeroutex-logistics-public',
    hostname: 'skyenet.skyeroutex-logistics',
    expected_live_url: 'https://skyenet.skyeroutex-logistics/',
    expected_deployment_id: 'dep_20260528223019',
    expected_text: ['SkyeRouteX Logistics', 'skyeroutex-logistics@solenterprises.org']
  },
  {
    id: 'skyesol',
    workspace_id: 'skyesol',
    project_id: 'skyesol-company-public',
    hostname: 'skyenet.skyesol',
    expected_live_url: 'https://skyenet.skyesol/',
    expected_deployment_id: 'dep_20260528223108',
    expected_text: ['Skyes Over London LC']
  },
  {
    id: 'solenterprises',
    workspace_id: 'solenterprises',
    project_id: 'solenterprises-public',
    hostname: 'skyenet.solenterprises',
    expected_live_url: 'https://skyenet.solenterprises/',
    expected_deployment_id: 'dep_20260528225625',
    expected_text: ['SOLEnterprises']
  }
];

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

function unquote(value = '') {
  const text = String(value || '').trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) return text.slice(1, -1);
  return text;
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

function authHeaders(token) {
  return {
    accept: 'application/json',
    authorization: `Bearer ${token}`,
    'x-admin-token': token,
    'x-free99-gate-session': token,
    'x-skye-gate-session': token
  };
}

async function fetchJson(url, init = {}) {
  const started = performance.now();
  const response = await fetch(url, { redirect: 'manual', ...init });
  const text = await response.text().catch(() => '');
  let body = {};
  try { body = text ? JSON.parse(text) : {}; } catch { body = { text }; }
  return {
    status: response.status,
    ok: response.ok,
    elapsed_ms: Number((performance.now() - started).toFixed(2)),
    content_type: response.headers.get('content-type') || '',
    location: response.headers.get('location') || '',
    body
  };
}

async function fetchText(url, init = {}, timeoutMs = directTimeoutMs) {
  const started = performance.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
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
      body
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      elapsed_ms: Number((performance.now() - started).toFixed(2)),
      content_type: '',
      location: '',
      body: '',
      error: error?.name === 'AbortError' ? `request timed out after ${timeoutMs}ms` : error?.message || String(error)
    };
  } finally {
    clearTimeout(timeout);
  }
}

function routeLiveUrl(route) {
  const mount = String(route?.mount_path || '');
  return `https://${route?.hostname || ''}${mount || '/'}`;
}

function includesAll(text, needles) {
  return needles.every((needle) => text.includes(needle));
}

async function sourceDownloadProof(target, token) {
  const params = new URLSearchParams({
    workspace_id: target.workspace_id,
    project_id: target.project_id,
    deployment_id: target.expected_deployment_id
  });
  const url = `${skynetBase}/api/skyenet/source-download?${params.toString()}`;
  const unauth = await fetchText(url, {}, 15000);
  const started = performance.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), sourceReadTimeoutMs);
  let response;
  try {
    response = await fetch(url, { headers: authHeaders(token), redirect: 'manual', signal: controller.signal });
  } catch (error) {
    clearTimeout(timeout);
    return {
      unauth: {
        status: unauth.status,
        ok: unauth.status === 401 || unauth.status === 403,
        content_type: unauth.content_type,
        elapsed_ms: unauth.elapsed_ms
      },
      auth: {
        status: 0,
        ok: false,
        content_type: '',
        content_disposition: '',
        source_header: '',
        project_header: '',
        deployment_header: '',
        workspace_header: '',
        bytes: 0,
        read_limit_bytes: sourceReadLimitBytes,
        read_truncated: false,
        sha256: '',
        has_source_manifest: false,
        has_index_html: false,
        has_expected_text: false,
        error: error?.name === 'AbortError' ? `source request timed out after ${sourceReadTimeoutMs}ms` : error?.message || String(error),
        elapsed_ms: Number((performance.now() - started).toFixed(2))
      }
    };
  }
  const chunks = [];
  let bytesRead = 0;
  let readTruncated = false;
  try {
    const reader = response.body?.getReader ? response.body.getReader() : null;
    if (reader) {
      while (bytesRead < sourceReadLimitBytes) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = Buffer.from(value);
        chunks.push(chunk);
        bytesRead += chunk.byteLength;
      }
      if (bytesRead >= sourceReadLimitBytes) {
        readTruncated = true;
        await reader.cancel('proof read limit reached').catch(() => {});
      }
    } else {
      const full = Buffer.from(await response.arrayBuffer());
      chunks.push(full.subarray(0, sourceReadLimitBytes));
      bytesRead = Math.min(full.byteLength, sourceReadLimitBytes);
      readTruncated = full.byteLength > sourceReadLimitBytes;
    }
  } catch (error) {
    return {
      unauth: {
        status: unauth.status,
        ok: unauth.status === 401 || unauth.status === 403,
        content_type: unauth.content_type,
        elapsed_ms: unauth.elapsed_ms
      },
      auth: {
        status: response.status,
        ok: false,
        content_type: response.headers.get('content-type') || '',
        content_disposition: response.headers.get('content-disposition') || '',
        source_header: response.headers.get('x-skynet-source-download') || '',
        project_header: response.headers.get('x-skynet-project-id') || '',
        deployment_header: response.headers.get('x-skynet-deployment-id') || '',
        workspace_header: response.headers.get('x-skynet-workspace-id') || '',
        bytes: bytesRead,
        read_limit_bytes: sourceReadLimitBytes,
        read_truncated: false,
        sha256: chunks.length ? createHash('sha256').update(Buffer.concat(chunks, bytesRead)).digest('hex') : '',
        has_source_manifest: chunks.length ? Buffer.concat(chunks, bytesRead).toString('utf8').includes('.skyenet/source-manifest.json') : false,
        has_index_html: chunks.length ? Buffer.concat(chunks, bytesRead).toString('utf8').includes('index.html') : false,
        has_expected_text: chunks.length ? includesAll(Buffer.concat(chunks, bytesRead).toString('utf8'), target.expected_text) : false,
        error: error?.name === 'AbortError' ? `source stream timed out after ${sourceReadTimeoutMs}ms` : error?.message || String(error),
        elapsed_ms: Number((performance.now() - started).toFixed(2))
      }
    };
  } finally {
    clearTimeout(timeout);
  }
  const bytes = Buffer.concat(chunks, bytesRead);
  const bodyText = bytes.toString('utf8');
  return {
    unauth: {
      status: unauth.status,
      ok: unauth.status === 401 || unauth.status === 403,
      content_type: unauth.content_type,
      elapsed_ms: unauth.elapsed_ms
    },
    auth: {
      status: response.status,
      ok: response.ok
        && response.headers.get('content-type') === 'application/x-tar'
        && bodyText.includes('.skyenet/source-manifest.json')
        && bytes.byteLength > 0,
      content_type: response.headers.get('content-type') || '',
      content_disposition: response.headers.get('content-disposition') || '',
      source_header: response.headers.get('x-skynet-source-download') || '',
      project_header: response.headers.get('x-skynet-project-id') || '',
      deployment_header: response.headers.get('x-skynet-deployment-id') || '',
      workspace_header: response.headers.get('x-skynet-workspace-id') || '',
      bytes: bytes.byteLength,
      read_limit_bytes: sourceReadLimitBytes,
      read_truncated: readTruncated,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      has_source_manifest: bodyText.includes('.skyenet/source-manifest.json'),
      has_index_html: bodyText.includes('index.html'),
      has_expected_text: includesAll(bodyText, target.expected_text),
      elapsed_ms: Number((performance.now() - started).toFixed(2))
    }
  };
}

async function targetProof(target, token) {
  const routeParams = new URLSearchParams({
    workspace_id: target.workspace_id,
    project_id: target.project_id,
    host: target.hostname
  });
  const routes = await fetchJson(`${skynetBase}/api/skyenet/routes?${routeParams.toString()}`, {
    headers: authHeaders(token)
  });
  const routeItem = Array.isArray(routes.body?.routes)
    ? routes.body.routes.find((item) => item?.route?.hostname === target.hostname && item?.route?.project_id === target.project_id)
    : null;
  const route = routeItem?.route || null;
  const routeOk = Boolean(routes.ok
    && route
    && route.url_mode === 'subdomain'
    && route.mount_path === ''
    && route.public_access === true
    && route.workspace_id === target.workspace_id
    && route.active_deployment_id === target.expected_deployment_id
    && routeLiveUrl(route) === target.expected_live_url);

  const dashboard = await fetchJson(`${skynetBase}/api/skyenet/dashboard?${new URLSearchParams({ workspace_id: target.workspace_id }).toString()}`, {
    headers: authHeaders(token)
  });
  const deployments = dashboard.body?.deployments || dashboard.body?.skynet?.deployments || [];
  const deployment = Array.isArray(deployments)
    ? deployments.find((item) => item?.project_id === target.project_id && item?.deployment_id === target.expected_deployment_id)
    : null;
  const dashboardOk = Boolean(dashboard.ok
    && deployment
    && deployment.live_url === target.expected_live_url
    && deployment.route_key === `route:v1:host:${target.hostname}`);

  const transfer = await fetchJson(`${skynetBase}/api/skyenet/source-transfer`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'content-type': 'application/json' },
    body: JSON.stringify({
      workspace_id: target.workspace_id,
      project_id: target.project_id,
      deployment_id: target.expected_deployment_id,
      method: 'secure-skye-pack'
    })
  });

  const download = await sourceDownloadProof(target, token);
  const publicHome = await fetchText(target.expected_live_url);
  const hostHeaderViaControl = await fetchText(`${skynetBase}/`, {
    headers: { host: target.hostname }
  });
  const directTextOk = publicHome.ok && includesAll(publicHome.body, target.expected_text);

  return {
    target,
    route_record: {
      status: routes.status,
      ok: routeOk,
      count: routes.body?.count ?? 0,
      key: routeItem?.key || '',
      live_url: route ? routeLiveUrl(route) : '',
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
      source_download_url_present: Boolean(deployment?.source_download_url),
      source_transfer_url_present: Boolean(deployment?.source_transfer_url),
      elapsed_ms: dashboard.elapsed_ms
    },
    source_transfer: {
      status: transfer.status,
      ok: Boolean(transfer.ok && transfer.body?.ok !== false),
      transfer_id: transfer.body?.transfer_id || '',
      transfer_status: transfer.body?.status || '',
      method: transfer.body?.method?.id || transfer.body?.method || '',
      secure_pack_extension: transfer.body?.secure_pack?.extension || '',
      receipt_id: transfer.body?.receipt?.id || '',
      elapsed_ms: transfer.elapsed_ms
    },
    source_download: download,
    public_http: {
      status: publicHome.status,
      ok: directTextOk,
      content_type: publicHome.content_type,
      location: publicHome.location,
      missing_text: target.expected_text.filter((needle) => !publicHome.body.includes(needle)),
      error: publicHome.error || '',
      elapsed_ms: publicHome.elapsed_ms
    },
    control_host_header_probe: {
      status: hostHeaderViaControl.status,
      ok: hostHeaderViaControl.ok,
      content_type: hostHeaderViaControl.content_type,
      location: hostHeaderViaControl.location,
      error: hostHeaderViaControl.error || '',
      elapsed_ms: hostHeaderViaControl.elapsed_ms
    }
  };
}

async function main() {
  const generatedAt = new Date().toISOString();
  const receipt = {
    schema: 'company.skynet.host-routes.proof.v1',
    ok: false,
    route_records_ok: false,
    source_custody_ok: false,
    public_http_ready: false,
    generated_at: generatedAt,
    no_browser_proof_run: true,
    owner_manual_browser_verification: true,
    zero_os_base: zeroOsBase,
    skynet_control_base: skynetBase,
    public_company_urls: Object.fromEntries(targets.map((target) => [target.id, target.expected_live_url])),
    credential_source: '',
    login: null,
    skyeroutex_operator_entry_anonymous: null,
    targets: [],
    blockers: [],
    failures: []
  };

  const credential = await ownerCredential();
  receipt.credential_source = credential.key || 'missing';
  if (!credential.value) {
    receipt.failures.push('No shared owner gate credential found in process env, .env, or env.txt.');
  } else {
    const login = await fetchJson(`${zeroOsBase}/api/owner/admin-login`, {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({ code: credential.value })
    });
    const token = login.body?.gateBearerToken || login.body?.gateToken || login.body?.token || '';
    receipt.login = {
      status: login.status,
      ok: Boolean(login.ok && token),
      token_received: Boolean(token),
      elapsed_ms: login.elapsed_ms
    };
    if (!token) {
      receipt.failures.push(login.body?.error || 'Shared gate login did not return a bearer token.');
    } else {
      receipt.targets = [];
      for (const target of targets) {
        receipt.targets.push(await targetProof(target, token));
      }
      const operator = await fetchText(`${zeroOsBase}/api/skyeroutex/operator-entry?return=%2FSkyeRouteX%2Fworkforce-command-v0.4.0%2Findex.html`, {}, 15000);
      receipt.skyeroutex_operator_entry_anonymous = {
        status: operator.status,
        ok: operator.status === 302 && operator.location.includes('/admin/login.html') && operator.location.includes('return=%2FSkyeRouteX%2Fworkforce-command-v0.4.0%2Findex.html'),
        location: operator.location,
        elapsed_ms: operator.elapsed_ms
      };
    }
  }

  receipt.route_records_ok = receipt.targets.every((item) => item.route_record.ok && item.dashboard.ok);
  receipt.source_custody_ok = receipt.targets.every((item) => item.source_transfer.ok && item.source_download.unauth.ok && item.source_download.auth.ok);
  receipt.public_http_ready = receipt.targets.every((item) => item.public_http.ok);
  const operatorGateOk = Boolean(receipt.skyeroutex_operator_entry_anonymous?.ok);
  if (!receipt.route_records_ok) receipt.failures.push('One or more platform-native SkyeNet host route records did not match expected hostname/project/deployment fields.');
  if (!receipt.source_custody_ok) receipt.failures.push('One or more SkyeNet source custody checks failed.');
  if (!operatorGateOk) receipt.failures.push('Anonymous SkyeRouteX operator entry did not redirect to the shared 0S login.');
  if (!receipt.public_http_ready) {
    receipt.blockers.push('Platform-native host route records exist, but direct public HTTP/DNS did not return the company pages from this environment. Wire DNS/custom hostname edge binding for skyenet.skyeroutex-logistics, skyenet.skyesol, and skyenet.solenterprises before calling the public links fully live.');
  }
  receipt.ok = receipt.route_records_ok && receipt.source_custody_ok && operatorGateOk;

  await fs.mkdir(artifactRoot, { recursive: true });
  const stamped = path.join(artifactRoot, `company-skynet-host-routes-${generatedAt.replace(/[:.]/g, '-')}.json`);
  await fs.writeFile(stamped, `${JSON.stringify(receipt, null, 2)}\n`);
  await fs.writeFile(latestReceipt, `${JSON.stringify({ ...receipt, stamped_receipt: path.relative(repoRoot, stamped) }, null, 2)}\n`);
  console.log(JSON.stringify({
    ok: receipt.ok,
    route_records_ok: receipt.route_records_ok,
    source_custody_ok: receipt.source_custody_ok,
    public_http_ready: receipt.public_http_ready,
    receipt: path.relative(repoRoot, latestReceipt),
    blockers: receipt.blockers,
    failures: receipt.failures
  }, null, 2));
  if (!receipt.ok) process.exitCode = 1;
}

main().catch(async (error) => {
  await fs.mkdir(artifactRoot, { recursive: true });
  const receipt = {
    schema: 'company.skynet.host-routes.proof.v1',
    ok: false,
    generated_at: new Date().toISOString(),
    error: error?.message || String(error),
    no_browser_proof_run: true
  };
  await fs.writeFile(latestReceipt, `${JSON.stringify(receipt, null, 2)}\n`);
  console.error(error);
  process.exit(1);
});
