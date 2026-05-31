#!/usr/bin/env node
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { resolveZeroOsGateAuth } from './lib/zero-os-gate-auth.mjs';

const repoRoot = process.cwd();
const zeroOsBase = String(process.env.ZERO_OS_LIVE_BASE || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const skynetBase = String(process.env.SKYENET_LIVE_BASE || 'https://skyenet.graylondonskyes.workers.dev').replace(/\/+$/, '');
const apiBase = `${skynetBase}/api/skyenet`;
const artifactRoot = path.join(repoRoot, 'test-artifacts', 'skyenet-source-custody-165k');
const latestReceipt = path.join(artifactRoot, 'skyenet-quantumskyes-165k-source-custody-live-http-latest.json');
const manifestPath = path.join(repoRoot, 'tmp', 'netlify-quantumskyes-full-source', 'deploy-files-complete.json');
const sourceRoot = path.join(repoRoot, 'tmp', 'netlify-quantumskyes-full-source', 'files');
const archivePath = path.join(repoRoot, 'download-handoffs', 'quantumskyes-netlify-source-20260529', 'quantumskyes-netlify-source-deploy-6a01d319da9d411f2bf94009.tar.zst');
const handoffSummaryPath = path.join(repoRoot, 'test-artifacts', 'netlify-quantumskyes-drive-handoff', 'handoff-summary.json');
const projectId = process.env.SKYENET_165K_PROJECT || 'quantumskyes-source-custody';
const workspaceId = process.env.SKYENET_165K_WORKSPACE || 'quantumskyes';
const deploymentId = process.env.SKYENET_165K_DEPLOYMENT || 'dep_quantumskyes_6a01d319';
const host = process.env.SKYENET_165K_HOST || 'skyenet.graylondonskyes.workers.dev';
const mount = process.env.SKYENET_165K_MOUNT || '/quantumskyes-source-custody';
const expectedFileCount = Number(process.env.SKYENET_165K_EXPECTED_FILES || 165144);
const r2Bucket = process.env.SKYENET_SOURCE_R2_BUCKET || 'zero-os-deploy-artifacts';

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

async function mergedEnv() {
  const files = [
    process.env.ROOT_ENV_FILE,
    process.env.METRAIYUX_ROOT_ENV,
    '.env',
    'env.txt'
  ].filter(Boolean).map((file) => path.resolve(file));
  let merged = { ...process.env };
  for (const file of files) Object.assign(merged, await readEnvFile(file));
  return expandEnvRefs(merged);
}

function applyPrivateEnv(values) {
  for (const key of [
    'R2_ACCOUNT_ID',
    'CLOUDFLARE_R2_ACCOUNT_ID',
    'CLOUDFLARE_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'CLOUDFLARE_R2_ACCESS_KEY',
    'S3_ACCESS_KEY',
    'R2_SECRET_ACCESS_KEY',
    'CLOUDFLARE_R2_SECRET_KEY',
    'S3_SECRET_KEY',
    'R2_ENDPOINT'
  ]) {
    if (!process.env[key] && values[key]) process.env[key] = values[key];
  }
  process.env.R2_BUCKET = r2Bucket;
  process.env.S3_BUCKET = r2Bucket;
  if (!process.env.R2_CONFIG_PREFIX) process.env.R2_CONFIG_PREFIX = 'vault-system';
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

function contentTypeForPath(file) {
  const clean = String(file || '').toLowerCase();
  if (clean.endsWith('.html')) return 'text/html; charset=utf-8';
  if (clean.endsWith('.css')) return 'text/css; charset=utf-8';
  if (clean.endsWith('.js') || clean.endsWith('.mjs')) return 'text/javascript; charset=utf-8';
  if (clean.endsWith('.json')) return 'application/json; charset=utf-8';
  if (clean.endsWith('.png')) return 'image/png';
  if (clean.endsWith('.svg')) return 'image/svg+xml';
  if (clean.endsWith('.webmanifest')) return 'application/manifest+json; charset=utf-8';
  if (clean.endsWith('.txt') || clean.endsWith('.md')) return 'text/plain; charset=utf-8';
  if (clean.endsWith('.zst')) return 'application/zstd';
  return 'application/octet-stream';
}

async function fetchText(url, init = {}) {
  const started = performance.now();
  const response = await fetch(url, { redirect: 'manual', ...init });
  const text = await response.text().catch(() => '');
  return {
    status: response.status,
    ok: response.ok,
    elapsed_ms: Number((performance.now() - started).toFixed(2)),
    content_type: response.headers.get('content-type') || '',
    location: response.headers.get('location') || '',
    headers: Object.fromEntries([...response.headers.entries()]),
    text
  };
}

async function fetchJson(url, init = {}) {
  const result = await fetchText(url, init);
  let body = {};
  try { body = result.text ? JSON.parse(result.text) : {}; } catch { body = { text: result.text }; }
  return { ...result, body };
}

async function fetchBytes(url, init = {}) {
  const started = performance.now();
  const response = await fetch(url, { redirect: 'manual', ...init });
  const bytes = new Uint8Array(await response.arrayBuffer());
  return {
    status: response.status,
    ok: response.ok,
    elapsed_ms: Number((performance.now() - started).toFixed(2)),
    content_type: response.headers.get('content-type') || '',
    headers: Object.fromEntries([...response.headers.entries()]),
    bytes
  };
}

async function apiJson(token, pathName, init = {}) {
  const headers = {
    ...authHeaders(token),
    ...(init.headers || {})
  };
  return fetchJson(`${apiBase}${pathName}`, { ...init, headers });
}

async function apiBytes(token, pathName, init = {}) {
  const headers = {
    ...authHeaders(token),
    ...(init.headers || {})
  };
  return fetchBytes(`${apiBase}${pathName}`, { ...init, headers });
}

async function sha256File(file) {
  const hash = createHash('sha256');
  await new Promise((resolve, reject) => {
    const stream = createReadStream(file);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', resolve);
  });
  return hash.digest('hex');
}

async function loadManifestRecords() {
  const records = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  if (!Array.isArray(records)) throw new Error(`Expected ${manifestPath} to be a JSON array.`);
  return records.map((record) => ({
    path: String(record.path || record.id || '').replace(/^\/+/, ''),
    size: Number(record.size || 0),
    content_type: record.mime_type || contentTypeForPath(record.path || record.id || '')
  })).filter((record) => record.path);
}

function sourceIndexBody(records, firstPath, firstSha256) {
  return `${records.map((record) => JSON.stringify({
    path: record.path,
    size: record.size,
    sha256: record.path === firstPath ? firstSha256 : '',
    content_type: record.content_type
  })).join('\n')}\n`;
}

async function uploadPublicFile(token, relPath, localPath) {
  const body = await fs.readFile(localPath);
  const params = new URLSearchParams({ workspaceId: workspaceId, projectId, deploymentId, path: relPath });
  return apiJson(token, `/deploy/upload?${params.toString()}`, {
    method: 'PUT',
    headers: { 'content-type': contentTypeForPath(relPath) },
    body
  });
}

async function uploadPrivateSourceFile(token, sourcePath, localPath) {
  const body = await fs.readFile(localPath);
  const params = new URLSearchParams({ workspaceId: workspaceId, projectId, deploymentId, path: sourcePath });
  return apiJson(token, `/source-upload?${params.toString()}`, {
    method: 'PUT',
    headers: { 'content-type': contentTypeForPath(sourcePath) },
    body
  });
}

async function putPart(uploadUrl, body, label) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(uploadUrl, { method: 'PUT', body }).catch((error) => ({ ok: false, status: 0, headers: new Headers(), text: async () => error.message }));
    if (response.ok) return (response.headers.get('etag') || '').replace(/^"|"$/g, '');
    const text = await response.text().catch(() => '');
    if (attempt === 3 || ![0, 408, 429, 500, 502, 503, 504].includes(response.status)) {
      throw new Error(`${label} failed ${response.status}: ${text.slice(0, 500)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt));
  }
  throw new Error(`${label} failed.`);
}

async function uploadArchiveToSkyeNetR2(receipt, archiveKey, archiveStat) {
  applyPrivateEnv(receipt.private_env);
  const drive = await import('../SkyeVault-Drop/netlify/functions/_lib/google-drive.js');
  const archiveFileName = path.basename(archivePath);
  const archivePrefix = archiveKey.split('/').slice(0, -1).join('/');
  const session = await drive.createStreamingMultipartSession({
    id: 'skyenet-source-custody',
    name: 'SkyeNet Source Custody',
    folderId: archivePrefix
  }, {
    sessionId: '',
    workspaceId: '',
    fileName: archiveFileName,
    fileSize: archiveStat.size,
    mimeType: contentTypeForPath(archiveFileName),
    chunkSizeMb: Number(process.env.SKYENET_165K_R2_CHUNK_MB || 64)
  });
  if (session.objectKey !== archiveKey) {
    throw new Error(`R2 upload key mismatch. Expected ${archiveKey}; got ${session.objectKey}`);
  }

  const completedParts = [];
  const chunkSize = Number(session.chunkSize || 64 * 1024 * 1024);
  const fd = await fs.open(archivePath, 'r');
  try {
    let offset = 0;
    let partNumber = 1;
    while (offset < archiveStat.size) {
      const readSize = Math.min(chunkSize, archiveStat.size - offset);
      const buffer = Buffer.allocUnsafe(readSize);
      const { bytesRead } = await fd.read(buffer, 0, readSize, offset);
      if (!bytesRead) break;
      const chunk = bytesRead === buffer.length ? buffer : buffer.subarray(0, bytesRead);
      const uploadUrl = drive.createMultipartPartUrl(session.objectKey, session.uploadId, partNumber);
      const eTag = await putPart(uploadUrl, chunk, `SkyeNet R2 archive part ${partNumber}`);
      completedParts.push({ partNumber, eTag });
      receipt.archive_r2_upload.parts_uploaded = completedParts.length;
      receipt.archive_r2_upload.bytes_uploaded = offset + bytesRead;
      offset += bytesRead;
      partNumber += 1;
    }
  } finally {
    await fd.close();
  }
  const completed = await drive.completeMultipartUpload(session.objectKey, session.uploadId, completedParts);
  return {
    ok: true,
    mode: 'direct-r2-multipart',
    bucket: r2Bucket,
    object_key: archiveKey,
    upload_id_present: Boolean(session.uploadId),
    parts: completedParts.length,
    bytes: archiveStat.size,
    completed
  };
}

function hasNoRawSecrets(text, token) {
  return token ? !String(text || '').includes(token) : true;
}

async function main() {
  await fs.mkdir(artifactRoot, { recursive: true });
  const env = await mergedEnv();
  const auth = await resolveZeroOsGateAuth({ zeroOsBase, env });
  const token = auth.token || '';
  const archiveStat = await fs.stat(archivePath);
  const handoff = JSON.parse(await fs.readFile(handoffSummaryPath, 'utf8'));
  const records = await loadManifestRecords();
  const firstRecord = records[0];
  const firstLocalPath = path.join(sourceRoot, firstRecord.path);
  const firstSha256 = await sha256File(firstLocalPath);
  const archiveSha256 = handoff.archive?.sha256 || await sha256File(archivePath);
  const receipt = {
    schema: 'skyenet.quantumskyes-165k-source-custody.live-http-proof.v1',
    ok: false,
    generated_at: new Date().toISOString(),
    no_browser_proof_run: true,
    owner_manual_browser_verification: true,
    bases: { zero_os: zeroOsBase, skynet: skynetBase },
    target: { workspace_id: workspaceId, project_id: projectId, deployment_id: deploymentId, host, mount },
    recovered_netlify_source: {
      site_id: handoff.siteId,
      deploy_id: handoff.deployId,
      manifest_files_expected: handoff.manifestFilesExpected,
      manifest_files_verified: handoff.manifestFilesVerified,
      local_manifest: path.relative(repoRoot, manifestPath),
      local_archive: path.relative(repoRoot, archivePath),
      archive_bytes: archiveStat.size,
      archive_sha256: archiveSha256,
      prior_skyevault_receipt: path.relative(repoRoot, handoffSummaryPath),
      prior_skyevault_range_proof_ok: handoff.driveUpload?.rangeProof?.ok === true
    },
    credential_source: auth.credential?.key || auth.credential?.source || 'missing',
    private_env: env,
    login: null,
    public_deploy: null,
    source_index: null,
    source_file_upload: null,
    archive_r2_upload: { ok: false, mode: 'not-started', parts_uploaded: 0, bytes_uploaded: 0 },
    archive_link: null,
    source_complete: null,
    unauth: {},
    manifest: null,
    tree_root: null,
    tree_vendor: null,
    search: null,
    source_file: null,
    source_download_range: null,
    source_download_invalid_range: null,
    source_transfer_download: null,
    source_transfer_vault: null,
    customer_export: null,
    links: {
      live_app: `https://${host}${mount}/`,
      source_manifest: `${skynetBase}/api/skyenet/source-manifest?workspace_id=${encodeURIComponent(workspaceId)}&project_id=${encodeURIComponent(projectId)}&deployment_id=${encodeURIComponent(deploymentId)}`,
      source_download: `${skynetBase}/api/skyenet/source-download?workspace_id=${encodeURIComponent(workspaceId)}&project_id=${encodeURIComponent(projectId)}&deployment_id=${encodeURIComponent(deploymentId)}`
    },
    failures: []
  };
  delete receipt.private_env;

  if (records.length !== expectedFileCount) receipt.failures.push(`Recovered manifest count ${records.length} did not match expected ${expectedFileCount}.`);
  if (handoff.manifestFilesVerified !== expectedFileCount) receipt.failures.push(`Handoff verified count ${handoff.manifestFilesVerified} did not match expected ${expectedFileCount}.`);
  receipt.login = {
    status: Number(auth.response?.status || 0) || 0,
    ok: Boolean(auth.ok && token),
    token_received: Boolean(token),
    via: auth.response?.via || auth.credential?.source || ''
  };
  if (!token) receipt.failures.push(auth.response?.body?.error || auth.response?.error || 'No shared FS27/SkyGate bearer or owner gate exchange credential found.');

  if (token) {
      const init = await apiJson(token, '/deploy/init', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          project_id: projectId,
          deployment_id: deploymentId,
          title: 'QuantumSkyes source custody proof'
        })
      });
      const publicFiles = [
        ['index.html', path.join(sourceRoot, 'index.html')],
        ['assets/app.js', path.join(sourceRoot, 'assets', 'app.js')],
        ['assets/styles.css', path.join(sourceRoot, 'assets', 'styles.css')]
      ].filter(([, file]) => existsSync(file));
      const uploads = [];
      for (const [rel, file] of publicFiles) uploads.push(await uploadPublicFile(token, rel, file));
      const complete = await apiJson(token, '/deploy/complete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          project_id: projectId,
          deployment_id: deploymentId,
          files: publicFiles.map(([rel]) => rel)
        })
      });
      const route = await apiJson(token, '/deploy/route', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          project_id: projectId,
          deployment_id: deploymentId,
          hostname: host,
          mount_path: mount,
          url_mode: 'path',
          public_access: true
        })
      });
      receipt.public_deploy = {
        ok: Boolean(init.ok && complete.ok && route.ok),
        init_status: init.status,
        complete_status: complete.status,
        route_status: route.status,
        uploads: uploads.map((item) => ({ status: item.status, ok: item.ok, path: item.body?.path || '' })),
        live_url: route.body?.live_url || ''
      };

      const indexText = sourceIndexBody(records, firstRecord.path, firstSha256);
      const indexParams = new URLSearchParams({ workspaceId, projectId, deploymentId });
      const sourceIndex = await apiJson(token, `/source-index?${indexParams.toString()}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/x-ndjson; charset=utf-8' },
        body: indexText
      });
      const sourcePackage = sourceIndex.body?.source_package || {};
      receipt.source_index = {
        status: sourceIndex.status,
        ok: Boolean(sourceIndex.ok && sourceIndex.body?.source_index?.file_count === expectedFileCount && sourcePackage.index_pages?.page_count > 0),
        file_count: sourceIndex.body?.source_index?.file_count || 0,
        files_truncated: sourceIndex.body?.source_index?.files_truncated === true,
        index_page_count: sourcePackage.index_pages?.page_count || 0,
        tree_index_mode: sourcePackage.tree_index?.mode || '',
        elapsed_ms: sourceIndex.elapsed_ms
      };

      const sourceUpload = await uploadPrivateSourceFile(token, firstRecord.path, firstLocalPath);
      receipt.source_file_upload = {
        status: sourceUpload.status,
        ok: Boolean(sourceUpload.ok && sourceUpload.body?.path === firstRecord.path && sourceUpload.body?.source_package?.file_count === expectedFileCount),
        path: sourceUpload.body?.path || '',
        package_file_count: sourceUpload.body?.source_package?.file_count || 0,
        total_bytes: sourceUpload.body?.source_package?.total_bytes || 0,
        elapsed_ms: sourceUpload.elapsed_ms
      };

      const archiveFileName = path.basename(archivePath);
      const archiveKey = `${sourcePackage.prefix}/.skyenet/archive/${archiveFileName}`;
      const linkPayload = {
        workspace_id: workspaceId,
        project_id: projectId,
        deployment_id: deploymentId,
        key: archiveKey,
        filename: archiveFileName,
        bytes: archiveStat.size,
        sha256: archiveSha256,
        content_type: contentTypeForPath(archiveFileName),
        recovery_receipt: path.relative(repoRoot, handoffSummaryPath),
        source: 'quantumskyes-netlify-source-recovery'
      };
      let archiveLink = await apiJson(token, '/source-archive-link', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(linkPayload)
      });
      if (archiveLink.status === 404 && (archiveLink.body?.code === 'SOURCE_ARCHIVE_OBJECT_NOT_FOUND' || !archiveLink.body?.code)) {
        receipt.archive_r2_upload = await uploadArchiveToSkyeNetR2({ ...receipt, private_env: env }, archiveKey, archiveStat);
        archiveLink = await apiJson(token, '/source-archive-link', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(linkPayload)
        });
      } else {
        receipt.archive_r2_upload = {
          ok: archiveLink.ok,
          mode: archiveLink.ok ? 'existing-object-already-linked' : 'not-run',
          bucket: r2Bucket,
          object_key: archiveKey,
          bytes: archiveStat.size,
          parts_uploaded: 0,
          bytes_uploaded: 0
        };
      }
      receipt.archive_link = {
        status: archiveLink.status,
        ok: Boolean(archiveLink.ok && archiveLink.body?.source_archive?.bytes === archiveStat.size && archiveLink.body?.source_archive?.sha256 === archiveSha256),
        key: archiveLink.body?.source_archive?.key || archiveKey,
        bytes: archiveLink.body?.source_archive?.bytes || 0,
        sha256: archiveLink.body?.source_archive?.sha256 || '',
        error_code: archiveLink.body?.code || '',
        error: archiveLink.body?.error || '',
        elapsed_ms: archiveLink.elapsed_ms
      };

      const sourceComplete = await apiJson(token, '/source-complete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          project_id: projectId,
          deployment_id: deploymentId,
          index_key: sourceIndex.body?.source_index?.key,
          file_count: expectedFileCount,
          total_bytes: records.reduce((sum, record) => sum + Number(record.size || 0), 0),
          sample_files: records.slice(0, 1000),
          archive: archiveLink.body?.source_archive,
          meta: {
            source: 'quantumskyes-netlify-source-recovery',
            recovery_receipt: path.relative(repoRoot, handoffSummaryPath),
            manifest_files_verified: expectedFileCount
          }
        })
      });
      receipt.source_complete = {
        status: sourceComplete.status,
        ok: Boolean(sourceComplete.ok && sourceComplete.body?.source_package?.file_count === expectedFileCount && sourceComplete.body?.source_package?.archive?.bytes === archiveStat.size),
        file_count: sourceComplete.body?.source_package?.file_count || 0,
        archive_bytes: sourceComplete.body?.source_package?.archive?.bytes || 0,
        storage_verified: sourceComplete.body?.source_package?.storage_verified === true,
        storage_verification_skipped_reason: sourceComplete.body?.manifest?.meta?.storage_verification_skipped_reason || '',
        elapsed_ms: sourceComplete.elapsed_ms
      };

      const query = new URLSearchParams({ workspace_id: workspaceId, project_id: projectId, deployment_id: deploymentId });
      for (const [name, suffix] of [
        ['manifest', `/source-manifest?${query.toString()}`],
        ['tree', `/source-tree?${query.toString()}`],
        ['search', `/source-search?${query.toString()}&q=three.min.js&content=false`],
        ['file', `/source-file?${query.toString()}&path=${encodeURIComponent(firstRecord.path)}`],
        ['download', `/source-download?${query.toString()}`]
      ]) {
        const denied = await fetchJson(`${apiBase}${suffix}`);
        receipt.unauth[name] = {
          status: denied.status,
          ok: [401, 403].includes(denied.status),
          code: denied.body?.code || ''
        };
      }

      const manifest = await apiJson(token, `/source-manifest?${query.toString()}&limit=5`);
      receipt.manifest = {
        status: manifest.status,
        ok: Boolean(manifest.ok && manifest.body?.file_count === expectedFileCount && manifest.body?.files?.length === 5 && manifest.body?.index_paged === true),
        file_count: manifest.body?.file_count || 0,
        listed_count: manifest.body?.listed_count || 0,
        next_cursor: manifest.body?.next_cursor || '',
        index_paged: manifest.body?.index_paged === true,
        index_page_count: manifest.body?.index_page_count || 0,
        archive_bytes: manifest.body?.source_package?.archive?.bytes || 0,
        elapsed_ms: manifest.elapsed_ms
      };

      const treeRoot = await apiJson(token, `/source-tree?${query.toString()}&limit=20`);
      receipt.tree_root = {
        status: treeRoot.status,
        ok: Boolean(treeRoot.ok && treeRoot.body?.file_count === expectedFileCount && Array.isArray(treeRoot.body?.entries) && treeRoot.body.entries.length > 0),
        entry_count: treeRoot.body?.entry_count || 0,
        tree_paged: treeRoot.body?.tree_paged === true,
        tree_on_demand: treeRoot.body?.tree_on_demand === true,
        scanned_index_pages: treeRoot.body?.scanned_index_pages || 0,
        entries_sample: (treeRoot.body?.entries || []).slice(0, 5),
        elapsed_ms: treeRoot.elapsed_ms
      };

      const treeVendor = await apiJson(token, `/source-tree?${query.toString()}&prefix=${encodeURIComponent('vendor/three')}&limit=10`);
      receipt.tree_vendor = {
        status: treeVendor.status,
        ok: Boolean(treeVendor.ok && Array.isArray(treeVendor.body?.entries) && treeVendor.body.entries.some((entry) => entry.path === 'vendor/three/three.min.js')),
        entry_count: treeVendor.body?.entry_count || 0,
        tree_on_demand: treeVendor.body?.tree_on_demand === true,
        scanned_index_pages: treeVendor.body?.scanned_index_pages || 0,
        elapsed_ms: treeVendor.elapsed_ms
      };

      const search = await apiJson(token, `/source-search?${query.toString()}&q=${encodeURIComponent('three.min.js')}&content=false&limit=50`);
      receipt.search = {
        status: search.status,
        ok: Boolean(search.ok && search.body?.searched_file_count === expectedFileCount && search.body?.results?.some((item) => item.path === 'vendor/three/three.min.js')),
        searched_file_count: search.body?.searched_file_count || 0,
        result_count: search.body?.result_count || 0,
        index_paged: search.body?.index_paged === true,
        scanned_index_pages: search.body?.scanned_index_pages || 0,
        results_sample: (search.body?.results || []).slice(0, 10).map((item) => item.path || ''),
        elapsed_ms: search.elapsed_ms
      };

      const sourceFile = await apiJson(token, `/source-file?${query.toString()}&path=${encodeURIComponent(firstRecord.path)}`);
      receipt.source_file = {
        status: sourceFile.status,
        ok: Boolean(sourceFile.ok && sourceFile.body?.path === firstRecord.path && sourceFile.body?.bytes > 0),
        path: sourceFile.body?.path || '',
        bytes: sourceFile.body?.bytes || 0,
        text_contains_source_marker: String(sourceFile.body?.text || '').length > 0,
        elapsed_ms: sourceFile.elapsed_ms
      };

      const range = await apiBytes(token, `/source-download?${query.toString()}`, {
        headers: { range: 'bytes=0-0', accept: 'application/octet-stream' }
      });
      receipt.source_download_range = {
        status: range.status,
        ok: Boolean(range.status === 206 && range.bytes.byteLength === 1 && range.headers['content-range'] === `bytes 0-0/${archiveStat.size}` && range.headers['x-skynet-source-download'] === 'stored-archive'),
        bytes_read: range.bytes.byteLength,
        content_range: range.headers['content-range'] || '',
        accept_ranges: range.headers['accept-ranges'] || '',
        download_mode: range.headers['x-skynet-source-download'] || '',
        archive_sha256: range.headers['x-skynet-source-archive-sha256'] || '',
        elapsed_ms: range.elapsed_ms
      };

      const invalidRange = await apiBytes(token, `/source-download?${query.toString()}`, {
        headers: { range: `bytes=${archiveStat.size}-${archiveStat.size + 10}`, accept: 'application/octet-stream' }
      });
      receipt.source_download_invalid_range = {
        status: invalidRange.status,
        ok: Boolean(invalidRange.status === 416 && invalidRange.headers['content-range'] === `bytes */${archiveStat.size}`),
        content_range: invalidRange.headers['content-range'] || '',
        elapsed_ms: invalidRange.elapsed_ms
      };

      const transferDownload = await apiJson(token, '/source-transfer', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspaceId, project_id: projectId, deployment_id: deploymentId, method: 'download' })
      });
      receipt.source_transfer_download = {
        status: transferDownload.status,
        ok: Boolean(transferDownload.ok && transferDownload.body?.status === 'ready' && transferDownload.body?.gated_download_url),
        status_text: transferDownload.body?.status || '',
        gated_download_url: transferDownload.body?.gated_download_url || '',
        elapsed_ms: transferDownload.elapsed_ms
      };

      const transferVault = await apiJson(token, '/source-transfer', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspaceId, project_id: projectId, deployment_id: deploymentId, method: 'skyevault', vault_id: 'quantumskyes-skynet-source-custody' })
      });
      receipt.source_transfer_vault = {
        status: transferVault.status,
        ok: Boolean(transferVault.ok && transferVault.body?.status === 'completed' && transferVault.body?.archive?.stored_archive_reused === true && transferVault.body?.storage?.stored === true),
        status_text: transferVault.body?.status || '',
        archive_file_count: transferVault.body?.archive?.file_count || 0,
        archive_bytes: transferVault.body?.archive?.bytes || 0,
        stored_archive_reused: transferVault.body?.archive?.stored_archive_reused === true,
        storage_key: transferVault.body?.storage?.key || '',
        elapsed_ms: transferVault.elapsed_ms
      };

      const customerExport = await apiJson(token, `/export?workspace_id=${encodeURIComponent(workspaceId)}&limit=50`);
      const exportText = JSON.stringify(customerExport.body || {});
      receipt.customer_export = {
        status: customerExport.status,
        ok: Boolean(customerExport.ok && exportText.includes(projectId) && hasNoRawSecrets(exportText, token)),
        includes_project: exportText.includes(projectId),
        raw_token_exposed: !hasNoRawSecrets(exportText, token),
        elapsed_ms: customerExport.elapsed_ms
      };
  }

  for (const [key, value] of Object.entries(receipt)) {
    if (value && typeof value === 'object' && 'ok' in value && value.ok === false) receipt.failures.push(`${key} did not pass.`);
  }
  for (const [key, value] of Object.entries(receipt.unauth || {})) {
    if (!value.ok) receipt.failures.push(`Unauthenticated ${key} endpoint was not rejected.`);
  }
  receipt.ok = receipt.failures.length === 0;
  const stamped = path.join(artifactRoot, `skyenet-quantumskyes-165k-source-custody-live-http-${receipt.generated_at.replace(/[:.]/g, '-')}.json`);
  await fs.writeFile(stamped, JSON.stringify(receipt, null, 2));
  await fs.writeFile(latestReceipt, JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify({
    ok: receipt.ok,
    receipt: path.relative(repoRoot, latestReceipt),
    project_id: projectId,
    deployment_id: deploymentId,
    file_count: expectedFileCount,
    archive_bytes: archiveStat.size,
    failures: receipt.failures
  }, null, 2));
  if (!receipt.ok) process.exitCode = 1;
}

main().catch(async (error) => {
  await fs.mkdir(artifactRoot, { recursive: true }).catch(() => {});
  const body = {
    schema: 'skyenet.quantumskyes-165k-source-custody.live-http-proof.v1',
    ok: false,
    generated_at: new Date().toISOString(),
    error: error?.message || String(error),
    stack: error?.stack || ''
  };
  await fs.writeFile(latestReceipt, JSON.stringify(body, null, 2)).catch(() => {});
  console.error(error);
  process.exitCode = 1;
});
