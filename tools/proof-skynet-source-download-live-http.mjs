#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { resolveZeroOsGateAuth } from './lib/zero-os-gate-auth.mjs';

const repoRoot = process.cwd();
const zeroOsBase = String(process.env.ZERO_OS_LIVE_BASE || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const skynetBase = String(process.env.SKYENET_LIVE_BASE || 'https://skyenet.graylondonskyes.workers.dev').replace(/\/+$/, '');
const artifactRoot = path.join(repoRoot, 'test-artifacts', 'skyenet-source-download');
const latestReceipt = path.join(artifactRoot, 'skyenet-source-download-live-http-latest.json');
const workspaceId = process.env.SKYENET_PROOF_WORKSPACE || 'bobs-smoke-shop';
const projectId = process.env.SKYENET_PROOF_PROJECT || 'bobs-smoke-shop';
const defaultDeploymentId = process.env.SKYENET_PROOF_DEPLOYMENT || 'dep_20260528063233';

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
    body
  };
}

function authHeaders(token) {
  return {
    accept: 'application/json',
    authorization: `Bearer ${token}`,
    'x-free99-gate-session': token,
    'x-skye-gate-session': token
  };
}

function hasAll(text, needles) {
  return needles.every((needle) => text.includes(needle));
}

async function main() {
  const auth = await resolveZeroOsGateAuth({ zeroOsBase });
  const token = auth.token || '';
  const receipt = {
    schema: 'skyenet.source-download.live-http-proof.v1',
    ok: false,
    generated_at: new Date().toISOString(),
    no_browser_proof_run: true,
    owner_manual_browser_verification: true,
    zero_os_base: zeroOsBase,
    skynet_base: skynetBase,
    target: { workspace_id: workspaceId, project_id: projectId, deployment_id: defaultDeploymentId },
    credential_source: auth.credential?.key || auth.credential?.source || 'missing',
    unauth_source_download: null,
    unauth_source_transfer: null,
    login: null,
    status: null,
    dashboard: null,
    source_transfer: null,
    source_transfers: [],
    download: null,
    zero_os_proxy_download: null,
    failures: []
  };

  const unauthDownload = await fetchJson(`${skynetBase}/api/skyenet/source-download?${new URLSearchParams({
    workspace_id: workspaceId,
    project_id: projectId,
    deployment_id: defaultDeploymentId
  }).toString()}`);
  receipt.unauth_source_download = {
    status: unauthDownload.status,
    ok: unauthDownload.status === 401 || unauthDownload.status === 403,
    code: unauthDownload.body?.code || '',
    elapsed_ms: unauthDownload.elapsed_ms
  };

  const unauthTransfer = await fetchJson(`${skynetBase}/api/skyenet/source-transfer`, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({
      workspace_id: workspaceId,
      project_id: projectId,
      deployment_id: defaultDeploymentId,
      method: 'secure-skye-pack'
    })
  });
  receipt.unauth_source_transfer = {
    status: unauthTransfer.status,
    ok: unauthTransfer.status === 401 || unauthTransfer.status === 403,
    code: unauthTransfer.body?.code || '',
    elapsed_ms: unauthTransfer.elapsed_ms
  };

  if (!receipt.unauth_source_download.ok) receipt.failures.push('Unauthenticated SkyeNet source download was not rejected.');
  if (!receipt.unauth_source_transfer.ok) receipt.failures.push('Unauthenticated SkyeNet source transfer was not rejected.');

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
      const query = new URLSearchParams({ workspace_id: workspaceId });
      const status = await fetchJson(`${skynetBase}/api/skyenet/status?${query.toString()}`, { headers });
      receipt.status = {
        status: status.status,
        ok: Boolean(status.ok && (status.body?.ok !== false)),
        service: status.body?.service || status.body?.skynet?.service || '',
        source_downloads: Boolean(status.body?.capabilities?.source_downloads || status.body?.skynet?.capabilities?.source_downloads),
        source_transfers: Boolean(status.body?.capabilities?.source_transfers || status.body?.skynet?.capabilities?.source_transfers),
        source_secure_pack_extension: status.body?.capabilities?.source_secure_pack_extension || status.body?.skynet?.capabilities?.source_secure_pack_extension || '',
        netlify_style: Boolean(status.body?.capabilities?.netlify_style_deploy_file_downloads || status.body?.skynet?.capabilities?.netlify_style_deploy_file_downloads),
        elapsed_ms: status.elapsed_ms
      };

      const dashboard = await fetchJson(`${skynetBase}/api/skyenet/dashboard?${query.toString()}`, { headers });
      const deployments = dashboard.body?.deployments || dashboard.body?.skynet?.deployments || [];
      const deployment = deployments.find((item) => item?.project_id === projectId)
        || deployments.find((item) => item?.deployment_id === defaultDeploymentId)
        || null;
      const deploymentId = deployment?.deployment_id || defaultDeploymentId;
      receipt.dashboard = {
        status: dashboard.status,
        ok: Boolean(dashboard.ok && (dashboard.body?.ok !== false)),
        deployment_count: Array.isArray(deployments) ? deployments.length : 0,
        matched_deployment_id: deploymentId,
        source_download_url_present: Boolean(deployment?.source_download_url),
        source_transfer_url_present: Boolean(deployment?.source_transfer_url),
        source_custody_transfer_required: Boolean(deployment?.source_custody?.client_handoff_requires_transfer),
        workspace_id: dashboard.body?.workspace?.workspace_id || dashboard.body?.skynet?.workspace?.workspace_id || '',
        elapsed_ms: dashboard.elapsed_ms
      };

      const transferMethods = ['skyedrive', 'skyevault', 'secure-skye-pack'];
      for (const method of transferMethods) {
        const sourceTransfer = await fetchJson(`${skynetBase}/api/skyenet/source-transfer`, {
          method: 'POST',
          headers: { ...authHeaders(token), 'content-type': 'application/json' },
          body: JSON.stringify({
            workspace_id: workspaceId,
            project_id: projectId,
            deployment_id: deploymentId,
            method
          })
        });
        const transferReceipt = {
          status: sourceTransfer.status,
          ok: Boolean(sourceTransfer.ok && sourceTransfer.body?.ok !== false),
          transfer_id: sourceTransfer.body?.transfer_id || '',
          transfer_status: sourceTransfer.body?.status || '',
          method: sourceTransfer.body?.method?.id || '',
          storage_stored: Boolean(sourceTransfer.body?.storage?.stored),
          storage_key: sourceTransfer.body?.storage?.key || '',
          storage_manifest_key: sourceTransfer.body?.storage?.manifest_key || '',
          storage_content_type: sourceTransfer.body?.storage?.content_type || '',
          storage_bytes: Number(sourceTransfer.body?.storage?.bytes || 0),
          storage_sha256: sourceTransfer.body?.storage?.sha256 || '',
          archive_bytes: Number(sourceTransfer.body?.archive?.bytes || 0),
          archive_sha256: sourceTransfer.body?.archive?.sha256 || '',
          secure_pack_extension: sourceTransfer.body?.secure_pack?.extension || '',
          secure_pack_marker: sourceTransfer.body?.secure_pack?.marker || '',
          secure_pack_object_key: sourceTransfer.body?.secure_pack?.object_key || '',
          secure_pack_plaintext_exposed: sourceTransfer.body?.secure_pack?.plaintext_source_exposed_to_storage,
          custody_client_access_without_transfer: sourceTransfer.body?.custody_policy?.client_access_without_transfer,
          receipt_type: sourceTransfer.body?.receipt?.type || '',
          elapsed_ms: sourceTransfer.elapsed_ms
        };
        receipt.source_transfers.push(transferReceipt);
      }
      receipt.source_transfer = receipt.source_transfers.find((item) => item.method === 'secure-skye-pack') || null;

      const sourceUrl = `${skynetBase}/api/skyenet/source-download?${new URLSearchParams({
        workspace_id: workspaceId,
        project_id: projectId,
        deployment_id: deploymentId
      }).toString()}`;
      const started = performance.now();
      const response = await fetch(sourceUrl, { headers: authHeaders(token), redirect: 'manual' });
      const bytes = Buffer.from(await response.arrayBuffer());
      const bodyText = bytes.toString('utf8');
      const sha256 = createHash('sha256').update(bytes).digest('hex');
      const tarChecks = {
        has_manifest: bodyText.includes('.skyenet/source-manifest.json'),
        has_index_html: bodyText.includes('index.html'),
        has_bob_copy: bodyText.includes("Bob's Smoke Shop"),
        has_workspace_preview: bodyText.includes('workspace-preview')
      };
      receipt.download = {
        status: response.status,
        ok: response.ok && response.headers.get('content-type') === 'application/x-tar' && hasAll(bodyText, ['.skyenet/source-manifest.json', 'index.html']),
        url: sourceUrl,
        content_type: response.headers.get('content-type') || '',
        content_disposition: response.headers.get('content-disposition') || '',
        source_header: response.headers.get('x-skynet-source-download') || '',
        project_header: response.headers.get('x-skynet-project-id') || '',
        workspace_header: response.headers.get('x-skynet-workspace-id') || '',
        bytes: bytes.byteLength,
        sha256,
        tar_checks: tarChecks,
        elapsed_ms: Number((performance.now() - started).toFixed(2))
      };

      const zeroOsSourceUrl = `${zeroOsBase}/api/skyenet/source-download?${new URLSearchParams({
        workspace_id: workspaceId,
        project_id: projectId,
        deployment_id: deploymentId
      }).toString()}`;
      const zeroOsStarted = performance.now();
      const zeroOsResponse = await fetch(zeroOsSourceUrl, { headers: authHeaders(token), redirect: 'manual' });
      const zeroOsBytes = Buffer.from(await zeroOsResponse.arrayBuffer());
      const zeroOsText = zeroOsBytes.toString('utf8');
      receipt.zero_os_proxy_download = {
        status: zeroOsResponse.status,
        ok: zeroOsResponse.ok
          && zeroOsResponse.headers.get('content-type') === 'application/x-tar'
          && zeroOsText.includes('.skyenet/source-manifest.json')
          && zeroOsText.includes('index.html'),
        content_type: zeroOsResponse.headers.get('content-type') || '',
        content_disposition: zeroOsResponse.headers.get('content-disposition') || '',
        proxy_header: zeroOsResponse.headers.get('x-0s-skynet-source-download-proxy') || '',
        source_header: zeroOsResponse.headers.get('x-skynet-source-download') || '',
        bytes: zeroOsBytes.byteLength,
        sha256: createHash('sha256').update(zeroOsBytes).digest('hex'),
        elapsed_ms: Number((performance.now() - zeroOsStarted).toFixed(2))
      };

      if (!receipt.status.ok || !receipt.status.source_downloads) receipt.failures.push('SkyeNet status did not confirm source_downloads capability.');
      if (!receipt.status.source_transfers || receipt.status.source_secure_pack_extension !== '.skye') receipt.failures.push('SkyeNet status did not confirm source transfer .skye capability.');
      if (!receipt.dashboard.ok || !receipt.dashboard.deployment_count) receipt.failures.push('SkyeNet dashboard did not return deployments for the target workspace.');
      if (!receipt.dashboard.source_transfer_url_present || !receipt.dashboard.source_custody_transfer_required) receipt.failures.push('SkyeNet dashboard did not expose source custody transfer metadata.');
      const completedTransfers = new Map((receipt.source_transfers || []).map((item) => [item.method, item]));
      for (const method of ['skyedrive', 'skyevault', 'secure-skye-pack']) {
        const item = completedTransfers.get(method);
        if (!item?.ok || item.transfer_status !== 'completed' || !item.storage_stored || !item.storage_key || item.storage_bytes <= 0) {
          receipt.failures.push(`SkyeNet source-transfer did not complete real storage for ${method}.`);
        }
      }
      if (!receipt.source_transfer?.ok || receipt.source_transfer.method !== 'secure-skye-pack' || receipt.source_transfer.secure_pack_extension !== '.skye' || receipt.source_transfer.secure_pack_marker !== 'SKYESEC2' || receipt.source_transfer.secure_pack_plaintext_exposed !== false) receipt.failures.push('SkyeNet source-transfer did not create a stored secure .skye pack artifact.');
      if (!receipt.download.ok) receipt.failures.push('SkyeNet source download did not return a valid gated tar bundle.');
      if (!receipt.zero_os_proxy_download.ok || receipt.zero_os_proxy_download.proxy_header !== 'passthrough') receipt.failures.push('0S SkyeNet source download proxy did not preserve the gated tar bundle.');
      if (!tarChecks.has_bob_copy) receipt.failures.push("Downloaded source bundle did not include Bob's Smoke Shop copy.");
  }

  receipt.ok = receipt.failures.length === 0;
  await fs.mkdir(artifactRoot, { recursive: true });
  const stamped = path.join(artifactRoot, `skyenet-source-download-live-http-${receipt.generated_at.replace(/[:.]/g, '-')}.json`);
  await fs.writeFile(stamped, `${JSON.stringify(receipt, null, 2)}\n`);
  await fs.writeFile(latestReceipt, `${JSON.stringify({ ...receipt, stamped_receipt: path.relative(repoRoot, stamped) }, null, 2)}\n`);
  console.log(JSON.stringify({
    ok: receipt.ok,
    receipt: path.relative(repoRoot, latestReceipt),
    download_status: receipt.download?.status || 0,
    download_bytes: receipt.download?.bytes || 0,
    failures: receipt.failures
  }, null, 2));
  if (!receipt.ok) process.exitCode = 1;
}

main().catch(async (error) => {
  await fs.mkdir(artifactRoot, { recursive: true });
  const receipt = {
    schema: 'skyenet.source-download.live-http-proof.v1',
    ok: false,
    generated_at: new Date().toISOString(),
    error: error?.message || String(error),
    no_browser_proof_run: true
  };
  await fs.writeFile(latestReceipt, `${JSON.stringify(receipt, null, 2)}\n`);
  console.error(error);
  process.exit(1);
});
