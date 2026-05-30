#!/usr/bin/env node
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';

const repoRoot = process.cwd();
const zeroOsBase = String(process.env.ZERO_OS_LIVE_BASE || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const skynetBase = String(process.env.SKYENET_LIVE_BASE || 'https://skyenet.graylondonskyes.workers.dev').replace(/\/+$/, '');
const artifactRoot = path.join(repoRoot, 'test-artifacts', 'skyenet-source-transfer-stress');
const latestReceipt = path.join(artifactRoot, 'skyenet-source-transfer-stress-latest.json');
const rounds = Math.max(1, Math.min(5, Number(process.env.SKYENET_SOURCE_TRANSFER_STRESS_ROUNDS || 2)));
const methods = ['skyedrive', 'skyevault', 'secure-skye-pack'];

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
    url,
    status: response.status,
    ok: response.ok && body?.ok !== false,
    elapsed_ms: Number((performance.now() - started).toFixed(2)),
    content_type: response.headers.get('content-type') || '',
    body
  };
}

async function apiJson(pathname, token, body) {
  return fetchJson(`${skynetBase}${pathname}`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
}

async function apiPut(pathname, token, contentType, body) {
  return fetchJson(`${skynetBase}${pathname}`, {
    method: 'PUT',
    headers: { ...authHeaders(token), 'content-type': contentType },
    body
  });
}

function okTransfer(method, item) {
  if (!item.ok || item.status !== 200 || item.body?.status !== 'completed') return false;
  if (!item.body?.storage?.stored || !item.body?.storage?.key || Number(item.body?.storage?.bytes || 0) <= 0) return false;
  if (method === 'secure-skye-pack') {
    return item.body?.secure_pack?.extension === '.skye'
      && item.body?.secure_pack?.marker === 'SKYESEC2'
      && item.body?.secure_pack?.plaintext_source_exposed_to_storage === false
      && String(item.body?.storage?.key || '').endsWith('.skye');
  }
  return item.body?.storage?.content_type === 'application/x-tar'
    && String(item.body?.storage?.key || '').includes(`${method}/source-transfers/`);
}

async function main() {
  const credential = await ownerCredential();
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  const workspaceId = process.env.SKYENET_SOURCE_TRANSFER_STRESS_WORKSPACE || 'source-transfer-stress';
  const projectId = process.env.SKYENET_SOURCE_TRANSFER_STRESS_PROJECT || `source-transfer-stress-${stamp}`;
  const deploymentId = process.env.SKYENET_SOURCE_TRANSFER_STRESS_DEPLOYMENT || `dep_${stamp}`;
  const host = new URL(skynetBase).hostname;
  const mountPath = `/${projectId}`;
  const receipt = {
    schema: 'skyenet.source-transfer.live-stress.v1',
    ok: false,
    generated_at: new Date().toISOString(),
    no_browser_proof_run: true,
    owner_manual_browser_verification: true,
    zero_os_base: zeroOsBase,
    skynet_base: skynetBase,
    credential_source: credential.key || 'missing',
    target: { workspace_id: workspaceId, project_id: projectId, deployment_id: deploymentId, rounds, methods },
    login: null,
    setup: {},
    unauth_source_transfer: null,
    transfers: [],
    source_download: null,
    live_route: null,
    failures: []
  };

  if (!credential.value) {
    receipt.failures.push('No shared owner gate credential found in process env, .env, or env.txt.');
  } else {
    const login = await fetchJson(`${zeroOsBase}/api/founder-command/login`, {
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
      const unauth = await fetchJson(`${skynetBase}/api/skyenet/source-transfer`, {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspaceId, project_id: projectId, deployment_id: deploymentId, method: 'secure-skye-pack' })
      });
      receipt.unauth_source_transfer = {
        status: unauth.status,
        ok: unauth.status === 401 || unauth.status === 403,
        code: unauth.body?.code || '',
        elapsed_ms: unauth.elapsed_ms
      };
      if (!receipt.unauth_source_transfer.ok) receipt.failures.push('Unauthenticated source-transfer was not rejected.');

      const init = await apiJson('/api/skyenet/deploy/init', token, {
        workspace_id: workspaceId,
        project_id: projectId,
        deployment_id: deploymentId,
        title: 'SkyeNet source transfer stress',
        plan_name: 'free99'
      });
      receipt.setup.init = { status: init.status, ok: init.ok, elapsed_ms: init.elapsed_ms };

      const html = `<!doctype html><html><head><meta charset="utf-8"><title>SkyeNet Source Transfer Stress</title></head><body><main><h1>SkyeNet Source Transfer Stress</h1><p>${deploymentId}</p></main></body></html>`;
      const upload = await apiPut(`/api/skyenet/deploy/upload?${new URLSearchParams({
        workspace_id: workspaceId,
        projectId: projectId,
        deploymentId: deploymentId,
        path: 'index.html'
      })}`, token, 'text/html; charset=utf-8', html);
      receipt.setup.upload = { status: upload.status, ok: upload.ok, elapsed_ms: upload.elapsed_ms };

      const complete = await apiJson('/api/skyenet/deploy/complete', token, {
        workspace_id: workspaceId,
        project_id: projectId,
        deployment_id: deploymentId,
        files: ['index.html']
      });
      receipt.setup.complete = { status: complete.status, ok: complete.ok, elapsed_ms: complete.elapsed_ms };

      const sourceFiles = [
        ['package.json', 'application/json', '{"scripts":{"build":"vite"},"dependencies":{}}'],
        ['src/main.js', 'text/javascript; charset=utf-8', `export const deployment = "${deploymentId}";\nconsole.log("source transfer stress", deployment);\n`],
        ['netlify/functions/ping.mjs', 'text/javascript; charset=utf-8', 'export async function handler(){return {statusCode:200,body:"pong"};}\n']
      ];
      receipt.setup.source_uploads = [];
      for (const [file, contentType, body] of sourceFiles) {
        const result = await apiPut(`/api/skyenet/source-upload?${new URLSearchParams({
          workspace_id: workspaceId,
          projectId: projectId,
          deploymentId: deploymentId,
          path: file
        })}`, token, contentType, body);
        receipt.setup.source_uploads.push({ file, status: result.status, ok: result.ok, elapsed_ms: result.elapsed_ms });
      }
      const sourceComplete = await apiJson('/api/skyenet/source-complete', token, {
        workspace_id: workspaceId,
        project_id: projectId,
        deployment_id: deploymentId,
        files: sourceFiles.map(([file]) => file)
      });
      receipt.setup.source_complete = { status: sourceComplete.status, ok: sourceComplete.ok, elapsed_ms: sourceComplete.elapsed_ms };

      const route = await apiJson('/api/skyenet/deploy/route', token, {
        workspace_id: workspaceId,
        project_id: projectId,
        deployment_id: deploymentId,
        hostname: host,
        mount_path: mountPath,
        public_access: true,
        default_auth: 'public'
      });
      receipt.setup.route = {
        status: route.status,
        ok: route.ok,
        live_url: route.body?.live_url || '',
        elapsed_ms: route.elapsed_ms
      };

      for (let round = 1; round <= rounds; round += 1) {
        for (const method of methods) {
          const result = await apiJson('/api/skyenet/source-transfer', token, {
            workspace_id: workspaceId,
            project_id: projectId,
            deployment_id: deploymentId,
            method
          });
          const transfer = {
            round,
            method,
            status: result.status,
            ok: okTransfer(method, result),
            transfer_id: result.body?.transfer_id || '',
            transfer_status: result.body?.status || '',
            storage_key: result.body?.storage?.key || '',
            manifest_key: result.body?.storage?.manifest_key || '',
            content_type: result.body?.storage?.content_type || '',
            bytes: Number(result.body?.storage?.bytes || 0),
            sha256: result.body?.storage?.sha256 || '',
            secure_pack_extension: result.body?.secure_pack?.extension || '',
            secure_pack_marker: result.body?.secure_pack?.marker || '',
            plaintext_source_exposed_to_storage: result.body?.secure_pack?.plaintext_source_exposed_to_storage,
            receipt_type: result.body?.receipt?.type || '',
            elapsed_ms: result.elapsed_ms
          };
          receipt.transfers.push(transfer);
          if (!transfer.ok) receipt.failures.push(`Round ${round} ${method} did not complete storage.`);
        }
      }

      const sourceUrl = `${skynetBase}/api/skyenet/source-download?${new URLSearchParams({
        workspace_id: workspaceId,
        project_id: projectId,
        deployment_id: deploymentId
      })}`;
      const sourceStarted = performance.now();
      const sourceResponse = await fetch(sourceUrl, { headers: authHeaders(token), redirect: 'manual' });
      const sourceBytes = Buffer.from(await sourceResponse.arrayBuffer());
      const sourceText = sourceBytes.toString('utf8');
      receipt.source_download = {
        status: sourceResponse.status,
        ok: sourceResponse.ok && sourceResponse.headers.get('content-type') === 'application/x-tar' && sourceText.includes('netlify/functions/ping.mjs'),
        content_type: sourceResponse.headers.get('content-type') || '',
        bytes: sourceBytes.byteLength,
        sha256: createHash('sha256').update(sourceBytes).digest('hex'),
        has_manifest: sourceText.includes('.skyenet/source-manifest.json'),
        has_function_source: sourceText.includes('export async function handler'),
        elapsed_ms: Number((performance.now() - sourceStarted).toFixed(2))
      };
      if (!receipt.source_download.ok) receipt.failures.push('Authenticated source download did not include the private source package.');

      const liveUrl = receipt.setup.route.live_url || `${skynetBase}${mountPath}/`;
      const liveStarted = performance.now();
      const liveResponse = await fetch(liveUrl, { redirect: 'manual' });
      const liveText = await liveResponse.text().catch(() => '');
      receipt.live_route = {
        url: liveUrl,
        status: liveResponse.status,
        ok: liveResponse.status === 200 && liveText.includes('SkyeNet Source Transfer Stress'),
        elapsed_ms: Number((performance.now() - liveStarted).toFixed(2))
      };
      if (!receipt.live_route.ok) receipt.failures.push('Stress deployment public route did not serve the uploaded app.');
    }
  }

  receipt.ok = receipt.failures.length === 0;
  await fs.mkdir(artifactRoot, { recursive: true });
  const stamped = path.join(artifactRoot, `skyenet-source-transfer-stress-${receipt.generated_at.replace(/[:.]/g, '-')}.json`);
  await fs.writeFile(stamped, `${JSON.stringify(receipt, null, 2)}\n`);
  await fs.writeFile(latestReceipt, `${JSON.stringify({ ...receipt, stamped_receipt: path.relative(repoRoot, stamped) }, null, 2)}\n`);
  console.log(JSON.stringify({
    ok: receipt.ok,
    receipt: path.relative(repoRoot, latestReceipt),
    transfers: receipt.transfers.length,
    failures: receipt.failures
  }, null, 2));
  if (!receipt.ok) process.exitCode = 1;
}

main().catch(async (error) => {
  await fs.mkdir(artifactRoot, { recursive: true });
  const receipt = {
    schema: 'skyenet.source-transfer.live-stress.v1',
    ok: false,
    generated_at: new Date().toISOString(),
    error: error?.message || String(error),
    no_browser_proof_run: true
  };
  await fs.writeFile(latestReceipt, `${JSON.stringify(receipt, null, 2)}\n`);
  console.error(error);
  process.exit(1);
});
