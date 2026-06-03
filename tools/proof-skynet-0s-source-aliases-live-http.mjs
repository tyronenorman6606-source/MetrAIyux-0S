#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { resolveZeroOsGateAuth } from './lib/zero-os-gate-auth.mjs';

const repoRoot = process.cwd();
const zeroOsBase = String(process.env.ZERO_OS_LIVE_BASE || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const artifactRoot = path.join(repoRoot, 'test-artifacts', 'skyenet-0s-source-aliases');
const latestReceipt = path.join(artifactRoot, 'skyenet-0s-source-aliases-live-http-latest.json');
const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
const workspaceId = process.env.SKYENET_0S_ALIAS_WORKSPACE || 'skyenet-alias-proof';
const projectId = process.env.SKYENET_0S_ALIAS_PROJECT || `alias-source-route-${stamp}`;
const deploymentId = process.env.SKYENET_0S_ALIAS_DEPLOYMENT || `dep_alias_${stamp}`;
const sourcePath = process.env.SKYENET_0S_ALIAS_SOURCE_PATH || 'README.md';
const sourceText = `# SkyeNet 0S source alias proof

Generated: ${new Date().toISOString()}
Workspace: ${workspaceId}
Project: ${projectId}
Deployment: ${deploymentId}

This file proves the 0S /api/skyenet source aliases route to FS27 source custody.
`;
const sourceBytes = new TextEncoder().encode(sourceText);

async function fetchPayload(url, init = {}) {
  const started = performance.now();
  const response = await fetch(url, { redirect: 'manual', ...init });
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text().catch(() => '');
  let body = {};
  if (contentType.includes('application/json')) {
    try { body = text ? JSON.parse(text) : {}; } catch { body = { text }; }
  } else {
    body = { text };
  }
  return {
    status: response.status,
    ok: response.ok,
    elapsed_ms: Number((performance.now() - started).toFixed(2)),
    content_type: contentType,
    headers: {
      cache_control: response.headers.get('cache-control') || '',
      source_file_proxy: response.headers.get('x-0s-skynet-source-file-proxy') || '',
      skynet_source_file: response.headers.get('x-skynet-source-file') || ''
    },
    body
  };
}

function authHeaders(token, extra = {}) {
  return {
    accept: 'application/json',
    authorization: `Bearer ${token}`,
    'x-free99-gate-session': token,
    'x-skye-gate-session': token,
    ...extra
  };
}

function skynetBody(result) {
  return result?.body?.skynet || result?.body || {};
}

function endpointSummary(result) {
  const payload = skynetBody(result);
  return {
    status: result.status,
    ok: result.ok && result.body?.ok !== false && payload?.ok !== false,
    target_path: result.body?.target_path || '',
    schema: payload?.schema || '',
    code: payload?.code || '',
    elapsed_ms: result.elapsed_ms
  };
}

function query(params) {
  return new URLSearchParams(params).toString();
}

async function main() {
  const auth = await resolveZeroOsGateAuth({ zeroOsBase });
  const token = auth.token || '';
  const receipt = {
    schema: 'skyenet.0s-source-aliases.live-http-proof.v1',
    ok: false,
    generated_at: new Date().toISOString(),
    no_browser_proof_run: true,
    owner_manual_browser_verification: true,
    zero_os_base: zeroOsBase,
    target: { workspace_id: workspaceId, project_id: projectId, deployment_id: deploymentId, source_path: sourcePath },
    credential_source: auth.credential?.key || auth.credential?.source || 'missing',
    unauth_env: null,
    login: null,
    env_alias: null,
    source_upload_alias: null,
    source_complete_alias: null,
    source_manifest_alias: null,
    source_file_alias: null,
    source_transfer_alias: null,
    source_transfer_vault_alias: null,
    source_codebases_alias: null,
    failures: []
  };

  const envUrl = `${zeroOsBase}/api/skyenet/env?${query({ workspace_id: workspaceId, project_id: projectId })}`;
  const unauthEnv = await fetchPayload(envUrl);
  receipt.unauth_env = {
    status: unauthEnv.status,
    ok: [401, 403].includes(unauthEnv.status),
    code: unauthEnv.body?.code || unauthEnv.body?.error || '',
    elapsed_ms: unauthEnv.elapsed_ms
  };
  if (!receipt.unauth_env.ok) receipt.failures.push('Unauthenticated 0S /api/skyenet/env alias was not rejected.');

  receipt.login = {
    status: Number(auth.response?.status || 0) || 0,
    ok: Boolean(auth.ok && token),
    token_received: Boolean(token),
    via: auth.response?.via || auth.credential?.source || ''
  };
  if (!token) {
    receipt.failures.push(auth.response?.body?.error || auth.response?.error || 'No shared FS27/SkyGate bearer or owner gate exchange credential found.');
  } else {
    const headers = authHeaders(token);
    const envList = await fetchPayload(envUrl, { headers });
    receipt.env_alias = {
      ...endpointSummary(envList),
      target_path_ok: envList.body?.target_path === '/deploy/env',
      env_count: Array.isArray(skynetBody(envList)?.env) ? skynetBody(envList).env.length : Number(skynetBody(envList)?.env_count || 0)
    };
    if (!receipt.env_alias.ok || !receipt.env_alias.target_path_ok) receipt.failures.push('0S /api/skyenet/env did not route to /deploy/env.');

    const upload = await fetchPayload(`${zeroOsBase}/api/skyenet/source-upload?${query({
      workspace_id: workspaceId,
      project_id: projectId,
      deployment_id: deploymentId,
      path: sourcePath
    })}`, {
      method: 'PUT',
      headers: authHeaders(token, { 'content-type': 'text/markdown; charset=utf-8' }),
      body: sourceText
    });
    const uploadBody = skynetBody(upload);
    receipt.source_upload_alias = {
      ...endpointSummary(upload),
      target_path_ok: upload.body?.target_path === '/deploy/source-upload',
      path: uploadBody?.path || '',
      bytes: Number(uploadBody?.bytes || 0),
      sha256_present: Boolean(uploadBody?.sha256),
      public_asset_exposure: uploadBody?.source_package?.public_asset_exposure
    };
    if (!receipt.source_upload_alias.ok || !receipt.source_upload_alias.target_path_ok || receipt.source_upload_alias.path !== sourcePath) {
      receipt.failures.push('0S /api/skyenet/source-upload did not store the proof source file through /deploy/source-upload.');
    }

    const complete = await fetchPayload(`${zeroOsBase}/api/skyenet/source-complete`, {
      method: 'POST',
      headers: authHeaders(token, { 'content-type': 'application/json' }),
      body: JSON.stringify({
        workspace_id: workspaceId,
        project_id: projectId,
        deployment_id: deploymentId,
        files: [{ path: sourcePath, size: sourceBytes.byteLength, content_type: 'text/markdown; charset=utf-8' }],
        total_bytes: sourceBytes.byteLength,
        meta: { proof: '0s-source-alias-live-http' }
      })
    });
    const completeBody = skynetBody(complete);
    receipt.source_complete_alias = {
      ...endpointSummary(complete),
      target_path_ok: complete.body?.target_path === '/deploy/source-complete',
      file_count: Number(completeBody?.source_package?.file_count || 0),
      storage_verified: completeBody?.source_package?.storage_verified,
      public_asset_exposure: completeBody?.source_package?.public_asset_exposure
    };
    if (!receipt.source_complete_alias.ok || !receipt.source_complete_alias.target_path_ok || receipt.source_complete_alias.file_count < 1) {
      receipt.failures.push('0S /api/skyenet/source-complete did not complete a private source package.');
    }

    const manifest = await fetchPayload(`${zeroOsBase}/api/skyenet/source-manifest?${query({
      workspace_id: workspaceId,
      project_id: projectId,
      deployment_id: deploymentId,
      limit: '10'
    })}`, { headers });
    const manifestBody = skynetBody(manifest);
    receipt.source_manifest_alias = {
      ...endpointSummary(manifest),
      target_path_ok: manifest.body?.target_path === '/deploy/source-manifest',
      file_count: Number(manifestBody?.file_count || 0),
      listed_count: Number(manifestBody?.listed_count || 0),
      paths: Array.isArray(manifestBody?.files) ? manifestBody.files.map((file) => file.path).slice(0, 10) : []
    };
    if (!receipt.source_manifest_alias.ok || !receipt.source_manifest_alias.paths.includes(sourcePath)) {
      receipt.failures.push('0S /api/skyenet/source-manifest did not list the proof source file.');
    }

    const sourceFile = await fetchPayload(`${zeroOsBase}/api/skyenet/source-file?${query({
      workspace_id: workspaceId,
      project_id: projectId,
      deployment_id: deploymentId,
      path: sourcePath,
      raw: '1'
    })}`, { headers });
    receipt.source_file_alias = {
      status: sourceFile.status,
      ok: sourceFile.ok && sourceFile.body?.text?.includes('0S /api/skyenet source aliases'),
      content_type: sourceFile.content_type,
      source_file_proxy: sourceFile.headers.source_file_proxy,
      skynet_source_file: sourceFile.headers.skynet_source_file,
      bytes: sourceFile.body?.text ? new TextEncoder().encode(sourceFile.body.text).byteLength : 0,
      elapsed_ms: sourceFile.elapsed_ms
    };
    if (!receipt.source_file_alias.ok || receipt.source_file_alias.source_file_proxy !== 'passthrough') {
      receipt.failures.push('0S /api/skyenet/source-file did not proxy the raw private source file.');
    }

    const transfer = await fetchPayload(`${zeroOsBase}/api/skyenet/source-transfer`, {
      method: 'POST',
      headers: authHeaders(token, { 'content-type': 'application/json' }),
      body: JSON.stringify({
        workspace_id: workspaceId,
        project_id: projectId,
        deployment_id: deploymentId,
        method: 'download'
      })
    });
    const transferBody = skynetBody(transfer);
    receipt.source_transfer_alias = {
      ...endpointSummary(transfer),
      target_path_ok: transfer.body?.target_path === '/deploy/source-transfer',
      transfer_id: transferBody?.transfer_id || '',
      status_label: transferBody?.status || '',
      source_download_url_present: Boolean(transferBody?.source_download_url),
      source_download_url_project_ok: String(transferBody?.source_download_url || '').includes(`project_id=${encodeURIComponent(projectId)}`),
      account_scoped: transferBody?.custody_policy?.account_scoped,
      client_access_without_transfer: transferBody?.custody_policy?.client_access_without_transfer,
      transfer_required_for_client_source_handoff: transferBody?.custody_policy?.transfer_required_for_client_source_handoff
    };
    if (
      !receipt.source_transfer_alias.ok
      || !receipt.source_transfer_alias.target_path_ok
      || receipt.source_transfer_alias.client_access_without_transfer !== false
      || !receipt.source_transfer_alias.source_download_url_project_ok
    ) {
      receipt.failures.push('0S /api/skyenet/source-transfer did not produce the expected account-scoped download transfer receipt.');
    }

    const vaultTransfer = await fetchPayload(`${zeroOsBase}/api/skyenet/source-transfer`, {
      method: 'POST',
      headers: authHeaders(token, { 'content-type': 'application/json' }),
      body: JSON.stringify({
        workspace_id: workspaceId,
        project_id: projectId,
        deployment_id: deploymentId,
        method: 'skyevault',
        vault_id: '0s-source-alias-proof'
      })
    });
    const vaultTransferBody = skynetBody(vaultTransfer);
    receipt.source_transfer_vault_alias = {
      ...endpointSummary(vaultTransfer),
      target_path_ok: vaultTransfer.body?.target_path === '/deploy/source-transfer',
      transfer_id: vaultTransferBody?.transfer_id || '',
      status_label: vaultTransferBody?.status || '',
      storage_stored: vaultTransferBody?.storage?.stored === true,
      promoted_count: Array.isArray(vaultTransferBody?.promoted_codebases) ? vaultTransferBody.promoted_codebases.length : 0,
      promoted_owner_mount: Array.isArray(vaultTransferBody?.promoted_codebases)
        && vaultTransferBody.promoted_codebases.some((item) => item.project_id === projectId && item.deployment_id === deploymentId && item.access_policy?.read_source_granted === true)
    };
    if (
      !receipt.source_transfer_vault_alias.ok
      || !receipt.source_transfer_vault_alias.target_path_ok
      || !receipt.source_transfer_vault_alias.storage_stored
      || !receipt.source_transfer_vault_alias.promoted_owner_mount
    ) {
      receipt.failures.push('0S /api/skyenet/source-transfer skyevault did not promote a project-aware codebase mount.');
    }

    const codebases = await fetchPayload(`${zeroOsBase}/api/skyenet/source-codebases?${query({
      workspace_id: workspaceId,
      project_id: projectId,
      deployment_id: deploymentId
    })}`, { headers });
    const codebasesBody = skynetBody(codebases);
    const codebaseItems = Array.isArray(codebasesBody?.codebases) ? codebasesBody.codebases : [];
    receipt.source_codebases_alias = {
      ...endpointSummary(codebases),
      target_path_ok: codebases.body?.target_path === '/deploy/source-codebases',
      count: Number(codebasesBody?.count || 0),
      has_project_mount: codebaseItems.some((item) => item.project_id === projectId && item.deployment_id === deploymentId && item.access_policy?.read_source_granted === true)
    };
    if (!receipt.source_codebases_alias.ok || !receipt.source_codebases_alias.target_path_ok || !receipt.source_codebases_alias.has_project_mount) {
      receipt.failures.push('0S /api/skyenet/source-codebases did not list the promoted project-aware codebase mount.');
    }
  }

  receipt.ok = receipt.failures.length === 0;
  await fs.mkdir(artifactRoot, { recursive: true });
  const stamped = path.join(artifactRoot, `skyenet-0s-source-aliases-live-http-${receipt.generated_at.replace(/[:.]/g, '-')}.json`);
  await fs.writeFile(stamped, `${JSON.stringify(receipt, null, 2)}\n`);
  await fs.writeFile(latestReceipt, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify({
    ok: receipt.ok,
    latestReceipt,
    stampedReceipt: stamped,
    target: receipt.target,
    failures: receipt.failures
  }, null, 2));
  if (!receipt.ok) process.exitCode = 1;
}

main().catch(async (error) => {
  await fs.mkdir(artifactRoot, { recursive: true });
  const receipt = {
    schema: 'skyenet.0s-source-aliases.live-http-proof.v1',
    ok: false,
    generated_at: new Date().toISOString(),
    no_browser_proof_run: true,
    owner_manual_browser_verification: true,
    zero_os_base: zeroOsBase,
    target: { workspace_id: workspaceId, project_id: projectId, deployment_id: deploymentId, source_path: sourcePath },
    failures: [error?.stack || error?.message || String(error)]
  };
  await fs.writeFile(latestReceipt, `${JSON.stringify(receipt, null, 2)}\n`);
  console.error(error);
  process.exitCode = 1;
});
