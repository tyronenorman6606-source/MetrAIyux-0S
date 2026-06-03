#!/usr/bin/env node
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { resolveZeroOsGateAuth } from './lib/zero-os-gate-auth.mjs';

const repoRoot = process.cwd();
const zeroOsBase = String(process.env.ZERO_OS_LIVE_BASE || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const skynetBase = String(process.env.SKYENET_LIVE_BASE || 'https://skyenet.graylondonskyes.workers.dev').replace(/\/+$/, '');
const apiBase = `${skynetBase}/api/skyenet`;
const artifactRoot = path.join(repoRoot, 'test-artifacts', 'skyenet-source-custody-165k');
const manifestPath = path.resolve(process.env.SKYENET_SOURCE_MATERIALIZE_MANIFEST || path.join(repoRoot, 'tmp', 'netlify-quantumskyes-full-source', 'deploy-files-complete.json'));
const sourceRoot = path.resolve(process.env.SKYENET_SOURCE_MATERIALIZE_ROOT || path.join(repoRoot, 'tmp', 'netlify-quantumskyes-full-source', 'files'));
const workspaceId = process.env.SKYENET_165K_WORKSPACE || 'quantumskyes';
const projectId = process.env.SKYENET_165K_PROJECT || 'quantumskyes-source-custody';
const deploymentId = process.env.SKYENET_165K_DEPLOYMENT || 'dep_quantumskyes_6a01d319';
const r2Bucket = process.env.SKYENET_SOURCE_R2_BUCKET || 'zero-os-deploy-artifacts';

function arg(name, fallback = '') {
  const prefix = `--${name}=`;
  const direct = process.argv.find((item) => item.startsWith(prefix));
  if (direct) return direct.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0 && process.argv[index + 1] && !process.argv[index + 1].startsWith('--')) return process.argv[index + 1];
  return fallback;
}

function flag(name) {
  return process.argv.includes(`--${name}`);
}

const concurrency = Math.max(1, Math.min(64, Number(arg('concurrency', process.env.SKYENET_SOURCE_MATERIALIZE_CONCURRENCY || 8)) || 8));
const limit = Math.max(0, Number(arg('limit', process.env.SKYENET_SOURCE_MATERIALIZE_LIMIT || 0)) || 0);
const offset = Math.max(0, Number(arg('offset', process.env.SKYENET_SOURCE_MATERIALIZE_OFFSET || 0)) || 0);
const skipExisting = !flag('overwrite') && !/^(0|false|no)$/i.test(String(process.env.SKYENET_SOURCE_MATERIALIZE_SKIP_EXISTING || '1'));
const dryRun = flag('dry-run') || /^(1|true|yes)$/i.test(String(process.env.SKYENET_SOURCE_MATERIALIZE_DRY_RUN || '0'));
const noProof = flag('no-proof') || /^(1|true|yes)$/i.test(String(process.env.SKYENET_SOURCE_MATERIALIZE_NO_PROOF || '0'));
const receiptId = normalizeReceiptId(arg('receipt-id', process.env.SKYENET_SOURCE_MATERIALIZE_RECEIPT_ID || ''));
const latestReceipt = path.join(
  artifactRoot,
  receiptId
    ? `skyenet-source-materialization-live-${receiptId}-latest.json`
    : 'skyenet-source-materialization-live-latest.json'
);

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

function normalizeReceiptId(value) {
  return String(value || '')
    .trim()
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
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

function contentTypeForPath(file) {
  const clean = String(file || '').toLowerCase();
  if (clean.endsWith('.html')) return 'text/html; charset=utf-8';
  if (clean.endsWith('.css')) return 'text/css; charset=utf-8';
  if (clean.endsWith('.js') || clean.endsWith('.mjs')) return 'text/javascript; charset=utf-8';
  if (clean.endsWith('.json')) return 'application/json; charset=utf-8';
  if (clean.endsWith('.png')) return 'image/png';
  if (clean.endsWith('.jpg') || clean.endsWith('.jpeg')) return 'image/jpeg';
  if (clean.endsWith('.svg')) return 'image/svg+xml';
  if (clean.endsWith('.webmanifest')) return 'application/manifest+json; charset=utf-8';
  if (clean.endsWith('.txt') || clean.endsWith('.md')) return 'text/plain; charset=utf-8';
  if (clean.endsWith('.pdf')) return 'application/pdf';
  if (clean.endsWith('.zip')) return 'application/zip';
  if (clean.endsWith('.gz')) return 'application/gzip';
  return 'application/octet-stream';
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
    headers: Object.fromEntries([...response.headers.entries()]),
    body
  };
}

async function fetchBytes(url, init = {}) {
  const started = performance.now();
  const response = await fetch(url, { redirect: 'manual', ...init });
  const bytes = new Uint8Array(await response.arrayBuffer());
  return {
    status: response.status,
    ok: response.ok,
    elapsed_ms: Number((performance.now() - started).toFixed(2)),
    headers: Object.fromEntries([...response.headers.entries()]),
    bytes
  };
}

async function apiJson(token, pathName, init = {}) {
  return withRetries(`SkyeNet API ${pathName}`, () => fetchJson(`${apiBase}${pathName}`, {
    ...init,
    headers: { ...authHeaders(token), ...(init.headers || {}) }
  }), 5);
}

async function apiBytes(token, pathName, init = {}) {
  return withRetries(`SkyeNet API bytes ${pathName}`, () => fetchBytes(`${apiBase}${pathName}`, {
    ...init,
    headers: { ...authHeaders(token), ...(init.headers || {}) }
  }), 5);
}

function normalizeSourcePath(value) {
  return String(value || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/')
    .split('/')
    .filter((part) => part && part !== '.' && part !== '..')
    .join('/');
}

async function loadManifestRecords() {
  const records = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  if (!Array.isArray(records)) throw new Error(`Expected ${manifestPath} to contain a JSON array.`);
  return records.map((record) => {
    const rawPath = String(record.path || record.id || '').replace(/^\/+/, '');
    return {
      path: normalizeSourcePath(rawPath),
      local_path: rawPath,
      size: Number(record.size || 0),
      content_type: record.mime_type || record.content_type || contentTypeForPath(rawPath)
    };
  }).filter((record) => record.path);
}

function sha256Bytes(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

async function withRetries(label, fn, attempts = 4) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** (attempt - 1)));
    }
  }
  const error = new Error(`${label} failed after ${attempts} attempts: ${lastError?.message || lastError || 'unknown error'}`);
  error.cause = lastError;
  throw error;
}

function chooseProofRecords(records, statsByPath) {
  const chosen = [];
  const add = (record) => {
    if (!record?.path || chosen.some((item) => item.path === record.path)) return;
    const stat = statsByPath.get(record.path);
    if (!stat || stat.isDirectory || stat.size <= 0 || stat.size > 2 * 1024 * 1024) return;
    chosen.push({ ...record, size: stat.size });
  };
  const selectors = [
    (record) => record.path === '_shared/auth-unlock.js',
    (record) => record.path === 'vendor/three/three.min.js',
    (record) => record.path === 'assets/vendor/three.min.js',
    (record) => record.path.endsWith('/package.json') && record.path.includes('runtime/standalone-apps/'),
    (record) => record.path.endsWith('.html') && record.path.includes('runtime/standalone-apps/'),
    (record) => record.path.endsWith('.md')
  ];
  for (const selector of selectors) add(records.find(selector));
  for (const record of records) {
    if (chosen.length >= 5) break;
    if (/\.(?:js|json|html|css|md|txt)$/i.test(record.path)) add(record);
  }
  return chosen.slice(0, 5);
}

async function runPool(items, worker) {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, Math.max(1, items.length)) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await worker(items[index], index);
    }
  });
  await Promise.all(workers);
}

async function writeReceipt(receipt) {
  await fs.mkdir(artifactRoot, { recursive: true });
  await fs.writeFile(latestReceipt, JSON.stringify(receipt, null, 2));
}

async function main() {
  const privateEnv = await mergedEnv();
  applyPrivateEnv(privateEnv);
  const drive = await import('../SkyeVault-Drop/netlify/functions/_lib/google-drive.js');
  const auth = await resolveZeroOsGateAuth({ zeroOsBase, env: privateEnv });
  const token = auth.token || '';
  const records = await loadManifestRecords();
  const selected = records.slice(offset, limit ? offset + limit : undefined);
  const receipt = {
    schema: 'skyenet.source_package_materialization.live_r2.v1',
    ok: false,
    generated_at: new Date().toISOString(),
    no_browser_proof_run: true,
    owner_manual_browser_verification: true,
    dry_run: dryRun,
    no_proof: noProof,
    receipt_id: receiptId,
    bases: { zero_os: zeroOsBase, skynet: skynetBase },
    target: { workspace_id: workspaceId, project_id: projectId, deployment_id: deploymentId },
    local_source: {
      manifest: path.relative(repoRoot, manifestPath),
      root: path.relative(repoRoot, sourceRoot),
      manifest_records: records.length,
      selected_records: selected.length,
      offset,
      limit
    },
    credential_source: auth.credential?.key || auth.credential?.source || 'missing',
    storage: {
      provider: 'cloudflare-r2',
      bucket: r2Bucket,
      prefix: '',
      skip_existing: skipExisting,
      concurrency
    },
    counts: {
      uploaded: 0,
      skipped_existing: 0,
      skipped_directory: 0,
      missing_local: 0,
      size_mismatch: 0,
      failed: 0,
      checked_existing: 0,
      bytes_uploaded: 0,
      bytes_materialized: 0
    },
    samples: {
      uploaded: [],
      skipped_existing: [],
      skipped_directory: [],
      failures: []
    },
    source_manifest: null,
    source_complete_refresh: null,
    arbitrary_source_file_reads: [],
    failures: []
  };
  if (!token) throw new Error(auth.response?.body?.error || auth.response?.error || 'No shared FS27/SkyGate bearer or owner gate exchange credential found.');

  const query = new URLSearchParams({ workspace_id: workspaceId, project_id: projectId, deployment_id: deploymentId });
  const manifest = await apiJson(token, `/source-manifest?${query.toString()}&limit=1`);
  receipt.source_manifest = {
    status: manifest.status,
    ok: Boolean(manifest.ok && manifest.body?.source_package?.prefix),
    file_count: manifest.body?.file_count || 0,
    source_owner_customer_id: manifest.body?.source_package?.prefix?.match(/customer-([^/]+)/)?.[1] || '',
    prefix: manifest.body?.source_package?.prefix || '',
    index_page_count: manifest.body?.index_page_count || 0,
    archive_bytes: manifest.body?.source_package?.archive?.bytes || 0
  };
  if (!receipt.source_manifest.ok) throw new Error(`Could not resolve SkyeNet source package prefix: ${JSON.stringify(manifest.body).slice(0, 500)}`);
  const sourcePrefix = receipt.source_manifest.prefix.replace(/^\/+|\/+$/g, '');
  receipt.storage.prefix = sourcePrefix;

  const statsByPath = new Map();
  for (const record of selected) {
    const full = path.join(sourceRoot, record.local_path || record.path);
    try {
      const stat = await fs.stat(full);
      statsByPath.set(record.path, { size: stat.size, isDirectory: stat.isDirectory() });
    } catch {
      statsByPath.set(record.path, { missing: true, size: 0, isDirectory: false });
    }
  }

  let lastCheckpoint = Date.now();
  const checkpoint = async (force = false) => {
    if (!force && Date.now() - lastCheckpoint < 15000) return;
    lastCheckpoint = Date.now();
    await writeReceipt(receipt);
    process.stderr.write(`skyenet-source-materialize: uploaded=${receipt.counts.uploaded} skipped=${receipt.counts.skipped_existing} dirs=${receipt.counts.skipped_directory} failed=${receipt.counts.failed} bytes=${receipt.counts.bytes_uploaded}\n`);
  };

  await runPool(selected, async (record) => {
    const stat = statsByPath.get(record.path);
    if (!stat || stat.missing) {
      receipt.counts.missing_local += 1;
      receipt.counts.failed += 1;
      if (receipt.samples.failures.length < 20) receipt.samples.failures.push({ path: record.path, local_path: record.local_path || record.path, error: 'LOCAL_SOURCE_FILE_MISSING' });
      return;
    }
    if (stat.isDirectory) {
      receipt.counts.skipped_directory += 1;
      if (receipt.samples.skipped_directory.length < 20) receipt.samples.skipped_directory.push(record.path);
      return;
    }
    if (record.size && Number(record.size) !== Number(stat.size)) {
      receipt.counts.size_mismatch += 1;
      if (receipt.samples.failures.length < 20) receipt.samples.failures.push({ path: record.path, expected_size: record.size, actual_size: stat.size, error: 'LOCAL_SOURCE_SIZE_MISMATCH' });
    }
    const key = `${sourcePrefix}/${record.path}`.replace(/\/+/g, '/');
    try {
      if (skipExisting) {
        const existing = await withRetries(`R2 HEAD ${record.path}`, () => drive.headObjectByKey(key), 3);
        receipt.counts.checked_existing += 1;
        if (existing && Number(existing.size || 0) === Number(stat.size || 0)) {
          receipt.counts.skipped_existing += 1;
          receipt.counts.bytes_materialized += stat.size;
          if (receipt.samples.skipped_existing.length < 20) receipt.samples.skipped_existing.push(record.path);
          await checkpoint();
          return;
        }
      }
      if (dryRun) {
        receipt.counts.uploaded += 1;
        receipt.counts.bytes_uploaded += stat.size;
        receipt.counts.bytes_materialized += stat.size;
        return;
      }
      const body = await fs.readFile(path.join(sourceRoot, record.local_path || record.path));
      const sha256 = sha256Bytes(body);
      await withRetries(`R2 PUT ${record.path}`, () => drive.putObjectByKey(key, body, {
        contentType: record.content_type || contentTypeForPath(record.path),
        metadata: {
          schema: 'fs27.private_source_file.v1',
          project_id: projectId,
          deployment_id: deploymentId,
          workspace_id: workspaceId,
          sha256,
          source_package_materialized: 'true'
        }
      }), 4);
      receipt.counts.uploaded += 1;
      receipt.counts.bytes_uploaded += body.byteLength;
      receipt.counts.bytes_materialized += body.byteLength;
      if (receipt.samples.uploaded.length < 20) receipt.samples.uploaded.push({ path: record.path, bytes: body.byteLength, sha256 });
    } catch (error) {
      receipt.counts.failed += 1;
      if (receipt.samples.failures.length < 20) receipt.samples.failures.push({ path: record.path, error: error.message || String(error) });
    }
    await checkpoint();
  });

  await checkpoint(true);

  if (!dryRun && !noProof) {
    const manifestRefresh = await apiJson(token, `/source-manifest?${query.toString()}&limit=1`);
    const sourcePackage = manifestRefresh.body?.source_package || {};
    const complete = await apiJson(token, '/source-complete', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        workspace_id: workspaceId,
        project_id: projectId,
        deployment_id: deploymentId,
        index_key: sourcePackage.index_key,
        file_count: manifestRefresh.body?.file_count || records.length,
        total_bytes: Math.max(Number(sourcePackage.total_bytes || 0), receipt.counts.bytes_materialized),
        sample_files: records.slice(0, 1000),
        archive: sourcePackage.archive,
        meta: {
          source_materialized_objects: true,
          source_materialized_at: new Date().toISOString(),
          source_materialized_file_records: records.length,
          source_materialized_selected_records: selected.length,
          source_materialized_directory_entries: receipt.counts.skipped_directory,
          source_materialized_receipt: path.relative(repoRoot, latestReceipt)
        }
      })
    });
    receipt.source_complete_refresh = {
      status: complete.status,
      ok: Boolean(complete.ok && complete.body?.source_package?.file_count >= records.length),
      file_count: complete.body?.source_package?.file_count || 0,
      files_truncated: complete.body?.source_package?.files_truncated === true,
      storage_verified: complete.body?.source_package?.storage_verified === true,
      skipped_reason: complete.body?.source_package?.storage_verified ? '' : 'large package verified through materialization read proof'
    };

    const proofRecords = chooseProofRecords(records, statsByPath.size === selected.length ? statsByPath : new Map(await Promise.all(records.slice(0, 10000).map(async (record) => {
      try {
        const stat = await fs.stat(path.join(sourceRoot, record.local_path || record.path));
        return [record.path, { size: stat.size, isDirectory: stat.isDirectory() }];
      } catch {
        return [record.path, { missing: true, size: 0, isDirectory: false }];
      }
    }))));
    for (const record of proofRecords) {
      const read = await apiJson(token, `/source-file?${query.toString()}&path=${encodeURIComponent(record.path)}`);
      receipt.arbitrary_source_file_reads.push({
        path: record.path,
        status: read.status,
        ok: Boolean(read.ok && read.body?.path === record.path && Number(read.body?.bytes || 0) > 0),
        bytes: read.body?.bytes || 0,
        code: read.body?.code || '',
        elapsed_ms: read.elapsed_ms
      });
    }
    if (proofRecords.length) {
      const rawRecord = proofRecords[proofRecords.length - 1];
      const raw = await apiBytes(token, `/source-file?${query.toString()}&path=${encodeURIComponent(rawRecord.path)}&format=raw`);
      receipt.arbitrary_source_file_reads.push({
        path: rawRecord.path,
        mode: 'raw',
        status: raw.status,
        ok: Boolean(raw.ok && raw.headers['x-skynet-source-file'] === rawRecord.path && raw.bytes.byteLength > 0),
        bytes: raw.bytes.byteLength,
        elapsed_ms: raw.elapsed_ms
      });
    }
  }

  if (receipt.counts.failed > 0) receipt.failures.push(`${receipt.counts.failed} source objects failed materialization.`);
  if (receipt.source_complete_refresh && !receipt.source_complete_refresh.ok) receipt.failures.push('source-complete refresh did not preserve the 165k source package.');
  if (!dryRun && !noProof && !receipt.arbitrary_source_file_reads.length) receipt.failures.push('No arbitrary source-file reads were proven.');
  for (const proof of receipt.arbitrary_source_file_reads) {
    if (!proof.ok) receipt.failures.push(`Arbitrary source-file read failed for ${proof.path}.`);
  }
  receipt.ok = receipt.failures.length === 0;
  const stamped = path.join(artifactRoot, `skyenet-source-materialization-live-${receiptId ? `${receiptId}-` : ''}${receipt.generated_at.replace(/[:.]/g, '-')}.json`);
  await fs.writeFile(stamped, JSON.stringify(receipt, null, 2));
  await writeReceipt({ ...receipt, stamped_receipt: path.relative(repoRoot, stamped) });
  console.log(JSON.stringify({
    ok: receipt.ok,
    receipt: path.relative(repoRoot, latestReceipt),
    uploaded: receipt.counts.uploaded,
    skipped_existing: receipt.counts.skipped_existing,
    skipped_directory: receipt.counts.skipped_directory,
    failed: receipt.counts.failed,
    arbitrary_reads: receipt.arbitrary_source_file_reads.filter((item) => item.ok).length,
    failures: receipt.failures
  }, null, 2));
  if (!receipt.ok) process.exitCode = 1;
}

main().catch(async (error) => {
  await fs.mkdir(artifactRoot, { recursive: true }).catch(() => {});
  const body = {
    schema: 'skyenet.source_package_materialization.live_r2.v1',
    ok: false,
    generated_at: new Date().toISOString(),
    error: error?.message || String(error),
    stack: error?.stack || ''
  };
  await fs.writeFile(latestReceipt, JSON.stringify(body, null, 2)).catch(() => {});
  console.error(error);
  process.exitCode = 1;
});
