#!/usr/bin/env node
import fs from 'node:fs/promises';
import { createReadStream, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { resolveZeroOsGateAuth } from './lib/zero-os-gate-auth.mjs';

const SOURCE_INDEX_UPLOAD_THRESHOLD = 20000;

function arg(name, fallback = '') {
  const prefix = `--${name}=`;
  const hit = process.argv.find((item) => item.startsWith(prefix));
  if (hit) return hit.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  return fallback;
}

function flag(name) {
  return process.argv.includes(`--${name}`);
}

function intArg(name, fallback, min = 1, max = 32) {
  const value = Number(arg(name, process.env[`SKYENET_${name.replace(/-/g, '_').toUpperCase()}`] || fallback));
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function usage() {
  return `SkyeNet deploy CLI

Required:
  --dir <folder> or --zip <bundle.zip>
  --project <project-id>
  --token <0S gate bearer> or shared FS27/SkyGate/Free99 root-env credential

Common:
  --api https://skyenet.graylondonskyes.workers.dev/api/skyenet
  --workspace default-workspace
  --plan free99
  --host skyenet.my-project
  --mount /
	  --url-mode subdomain
	  --source-root <full-project-folder>
	  --source-archive <archive.tar|archive.tar.zst>
	  --source-index-only
	  --no-source
	  --include-public-originals
  --concurrency 6
  --resume
  --public
`;
}

function cleanToken(value) {
  return String(value || '').replace(/^Bearer\s+/i, '').trim();
}

function isSafePublicPath(rel, options = {}) {
  const normalized = String(rel || '').replace(/\\/g, '/');
  if (!normalized || normalized.includes('../')) return false;
  if (/(^|\/)(\.git|node_modules|\.wrangler|\.skyenet|__pycache__|\.cache)(\/|$)/i.test(normalized)) return false;
  const excludedPublicDirs = options.includeOriginals
    ? /(^|\/)(tests?|smoke|proof|scripts|server|src|template-library|templates|coverage)(\/|$)/i
    : /(^|\/)(tests?|smoke|proof|scripts|server|src|template-library|templates|originals?|coverage)(\/|$)/i;
  if (excludedPublicDirs.test(normalized)) return false;
  if (/(^|\/)netlify\/functions(\/|$)/i.test(normalized)) return false;
  if (/(^|\/)(MCP_TOOLING_RECEIPT\.json|README(?:\.[a-z0-9]+)?|README_DEPLOY\.txt|deploy-target\.json|package(?:-lock)?\.json)$/i.test(normalized)) return false;
  if (/(^|\/)\.env(\.|$|\/)/i.test(normalized)) return false;
  if (/(^|\/)(id_rsa|id_dsa|id_ecdsa|id_ed25519|\.npmrc|\.pypirc|\.netrc)(\/|$)/i.test(normalized)) return false;
  if (/\.(pem|key|p12|pfx|crt|sqlite|sqlite3|db)$/i.test(normalized)) return false;
  return true;
}

async function collectFiles(root, options = {}) {
  const out = [];
  const skipDirs = new Set(options.skipDirs || ['node_modules', '.git', '.skyenet']);
  async function walk(current) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (skipDirs.has(entry.name)) continue;
        await walk(full);
      } else if (entry.isFile()) {
        const rel = path.relative(root, full).replace(/\\/g, '/');
        if (options.publicBundle && !isSafePublicPath(rel, options)) continue;
        const stat = await fs.stat(full);
        out.push({ full, rel, size: stat.size });
      }
    }
  }
  await walk(root);
  return out;
}

function isSafeSourcePath(rel) {
  const normalized = String(rel || '').replace(/\\/g, '/');
  if (!normalized || normalized.includes('../')) return false;
  if (/(^|\/)(\.git|\.wrangler)(\/|$)/i.test(normalized)) return false;
  if (/(^|\/)\.env(\.|$|\/)/i.test(normalized)) return false;
  if (/(^|\/)(id_rsa|id_dsa|id_ecdsa|id_ed25519|\.npmrc|\.pypirc|\.netrc)(\/|$)/i.test(normalized)) return false;
  if (/\.(pem|key|p12|pfx|crt|sqlite|sqlite3|db)$/i.test(normalized)) return false;
  return true;
}

async function collectSourceFiles(root) {
  const files = await collectFiles(root, { skipDirs: ['.git', '.skyenet', '.wrangler'] });
  return files.filter((file) => isSafeSourcePath(file.rel));
}

async function extractZip(zipPath) {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'skyenet-zip-'));
  const result = spawnSync('unzip', ['-qq', zipPath, '-d', temp], { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`Unable to extract zip. Install unzip or pass --dir. ${result.stderr || result.stdout || ''}`.trim());
  }
  return temp;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function contentTypeForPath(pathname) {
  const clean = String(pathname || '').toLowerCase();
  if (clean.endsWith('.html')) return 'text/html; charset=utf-8';
  if (clean.endsWith('.css')) return 'text/css; charset=utf-8';
  if (clean.endsWith('.js') || clean.endsWith('.mjs')) return 'text/javascript; charset=utf-8';
  if (clean.endsWith('.json') || clean.endsWith('.webmanifest')) return 'application/json; charset=utf-8';
  if (clean.endsWith('.svg')) return 'image/svg+xml';
  if (clean.endsWith('.png')) return 'image/png';
  if (clean.endsWith('.jpg') || clean.endsWith('.jpeg')) return 'image/jpeg';
  if (clean.endsWith('.webp')) return 'image/webp';
  if (clean.endsWith('.ico')) return 'image/x-icon';
  if (clean.endsWith('.webm')) return 'video/webm';
  if (clean.endsWith('.mp4')) return 'video/mp4';
  if (clean.endsWith('.txt') || clean.endsWith('.md')) return 'text/plain; charset=utf-8';
  if (clean.endsWith('.xml')) return 'application/xml; charset=utf-8';
  if (clean.endsWith('.zip')) return 'application/zip';
  if (clean.endsWith('.tar')) return 'application/x-tar';
  if (clean.endsWith('.tar.gz') || clean.endsWith('.tgz')) return 'application/gzip';
  if (clean.endsWith('.tar.zst') || clean.endsWith('.zst')) return 'application/zstd';
  return 'application/octet-stream';
}

async function sha256File(filePath) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest('hex');
}

function sourceFileRecord(file) {
  return {
    path: file.rel,
    size: file.size || 0,
    content_type: contentTypeForPath(file.rel)
  };
}

function sourceIndexBody(files) {
  return `${files.map((file) => JSON.stringify(sourceFileRecord(file))).join('\n')}\n`;
}

async function apiFetch(api, token, pathname, options = {}) {
  const retries = Number(options.retries || 0);
  const retryDelayMs = Number(options.retryDelayMs || 600);
  const timeoutMs = Number(options.timeoutMs || process.env.SKYENET_FETCH_TIMEOUT_MS || 60_000);
  const requestOptions = { ...options };
  delete requestOptions.retries;
  delete requestOptions.retryDelayMs;
  delete requestOptions.timeoutMs;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    timer.unref?.();
    let response;
    let text = '';
    try {
      response = await fetch(`${api}${pathname}`, {
        ...requestOptions,
        signal: controller.signal,
        headers: {
          authorization: `Bearer ${token}`,
          'x-skye-gate-session': token,
          ...(requestOptions.headers || {})
        }
      });
      text = await response.text();
    } catch (error) {
      clearTimeout(timer);
      const detail = error?.name === 'AbortError'
        ? `SkyeNet API request timed out after ${timeoutMs}ms`
        : error?.message || String(error);
      if (attempt < retries) {
        await sleep(retryDelayMs * (attempt + 1));
        continue;
      }
      throw new Error(`${detail} at ${pathname}`);
    }
    clearTimeout(timer);
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { text }; }
    const detail = data.error || data.skynet?.error || data.code || data.skynet?.code || data.text || data.skynet?.text || text.slice(0, 300);
    if (response.ok && data.ok !== false) return data.skynet || data;
    const retryable = attempt < retries
      && (response.status === 408
        || response.status === 409
        || response.status === 425
        || response.status === 429
        || response.status >= 500
        || /error code:\s*1042|temporar|timeout|rate/i.test(String(detail || '')));
    if (!retryable) {
      throw new Error(`${detail || 'SkyeNet API failed'} (${response.status}) at ${pathname}`);
    }
    await sleep(retryDelayMs * (attempt + 1));
  }
  throw new Error(`SkyeNet API failed after ${retries} retries at ${pathname}`);
}

async function uploadedFilesForDeployment(api, token, workspaceId, projectId, deploymentId) {
  const params = new URLSearchParams({ workspace_id: workspaceId });
  const dashboard = await apiFetch(api, token, `/dashboard?${params.toString()}`).catch(() => null);
  const deployments = Array.isArray(dashboard?.deployments) ? dashboard.deployments : [];
  const deployment = deployments.find((item) =>
    item?.project_id === projectId && item?.deployment_id === deploymentId
  );
  return new Set(Array.isArray(deployment?.files) ? deployment.files : []);
}

async function uploadWithConcurrency(items, concurrency, uploadOne) {
  let cursor = 0;
  let completed = 0;
  const total = items.length;
  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, total || 1)) }, async () => {
    while (cursor < total) {
      const index = cursor++;
      await uploadOne(items[index], index);
      completed += 1;
      if (completed === total || completed % 25 === 0) {
        process.stderr.write(`skyenet-deploy: uploaded ${completed}/${total} pending files\n`);
      }
    }
  });
  await Promise.all(workers);
}

const api = String(arg('api', process.env.SKYENET_API || 'https://skyenet.graylondonskyes.workers.dev/api/skyenet')).replace(/\/+$/, '');
const tokenArg = cleanToken(arg('token', ''));
const resolvedGateAuth = tokenArg
  ? { ok: true, token: tokenArg, credential: { key: '--token', source: 'cli-shared-gate-bearer' } }
  : await resolveZeroOsGateAuth().catch((error) => ({ ok: false, token: '', error: error?.message || String(error) }));
const token = cleanToken(resolvedGateAuth.token || '');
const dirArg = arg('dir');
const zipArg = arg('zip');
const sourceRootArg = arg('source-root', process.env.SKYENET_SOURCE_ROOT || '');
const sourceArchiveArg = arg('source-archive', process.env.SKYENET_SOURCE_ARCHIVE || '');
const sourceIndexOnly = flag('source-index-only') || /^(1|true|yes)$/i.test(process.env.SKYENET_SOURCE_INDEX_ONLY || '');
const projectId = arg('project', process.env.SKYENET_PROJECT || '');
const deploymentId = arg('deployment', `dep_${new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)}`);
const workspaceId = arg('workspace', process.env.SKYENET_WORKSPACE || 'default-workspace');
const planName = arg('plan', process.env.SKYENET_PLAN || 'free99');
const host = arg('host', process.env.SKYENET_HOST || process.env.SKYENET_PUBLIC_HOST || 'skyenet.graylondonskyes.workers.dev');
const urlMode = String(arg('url-mode', process.env.SKYENET_URL_MODE || '')).trim().toLowerCase();
const hostNativeRoute = ['subdomain', 'host', 'native'].includes(urlMode);
const defaultMount = /(^|\.)metraiyux-0s-full-system\./i.test(host)
  ? `/skyenet/${projectId || 'site'}`
  : (hostNativeRoute ? '/' : `/${projectId || 'site'}`);
const mount = arg('mount', process.env.SKYENET_MOUNT || defaultMount);
const publicAccess = flag('public') || String(arg('auth', '')).toLowerCase() === 'public';
const concurrency = intArg('concurrency', 1, 1, 12);
const resumeUploads = flag('resume') || String(process.env.SKYENET_RESUME || '').toLowerCase() === 'true';
const uploadSourcePackage = !flag('no-source') && String(process.env.SKYENET_NO_SOURCE || '').toLowerCase() !== 'true';
const includePublicOriginals = flag('include-public-originals') || /^(1|true|yes)$/i.test(process.env.SKYENET_INCLUDE_PUBLIC_ORIGINALS || '');

if (!token || !projectId || (!dirArg && !zipArg)) {
  if (!token && resolvedGateAuth?.error) process.stderr.write(`skyenet-deploy: ${resolvedGateAuth.error}\n`);
  console.error(usage());
  process.exit(1);
}

const sourceRoot = zipArg ? await extractZip(path.resolve(zipArg)) : path.resolve(dirArg);
if (!existsSync(sourceRoot)) throw new Error(`Source not found: ${sourceRoot}`);
const files = await collectFiles(sourceRoot, { publicBundle: true, includeOriginals: includePublicOriginals });
if (!files.length) throw new Error(`No files found in ${sourceRoot}`);
const privateSourceRoot = sourceRootArg ? path.resolve(sourceRootArg) : sourceRoot;
const sourceFiles = uploadSourcePackage && existsSync(privateSourceRoot)
  ? await collectSourceFiles(privateSourceRoot)
  : [];

await apiFetch(api, token, '/workspace', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ workspace_id: workspaceId, plan_name: planName, display_name: workspaceId }),
  retries: 3,
  retryDelayMs: 900
});

await apiFetch(api, token, '/deploy/init', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ workspace_id: workspaceId, plan_name: planName, project_id: projectId, deployment_id: deploymentId, title: projectId }),
  retries: 3,
  retryDelayMs: 900
});

const uploaded = resumeUploads
  ? await uploadedFilesForDeployment(api, token, workspaceId, projectId, deploymentId)
  : new Set();
const filesToUpload = uploaded.size
  ? files.filter((file) => !uploaded.has(file.rel))
  : files;
if (uploaded.size) {
  process.stderr.write(`skyenet-deploy: resume found ${uploaded.size} uploaded files; ${filesToUpload.length} pending\n`);
}
process.stderr.write(`skyenet-deploy: uploading ${filesToUpload.length} files with concurrency ${concurrency}\n`);

await uploadWithConcurrency(filesToUpload, concurrency, async (file) => {
  const params = new URLSearchParams({ workspaceId, projectId, deploymentId, path: file.rel });
  const body = await fs.readFile(file.full);
  try {
    await apiFetch(api, token, `/deploy/upload?${params.toString()}`, {
      method: 'PUT',
      headers: { 'content-type': contentTypeForPath(file.rel) },
      body,
      retries: 5,
      retryDelayMs: 900
    });
  } catch (error) {
    error.message = `Upload failed for ${file.rel}: ${error.message}`;
    throw error;
  }
});

await apiFetch(api, token, '/deploy/complete', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ workspace_id: workspaceId, plan_name: planName, project_id: projectId, deployment_id: deploymentId, files: files.map((file) => file.rel) }),
  retries: 5,
  retryDelayMs: 900
});

let uploadedSourceArchive = null;
let uploadedSourceIndex = null;
if (uploadSourcePackage && sourceFiles.length) {
  process.stderr.write(`skyenet-deploy: uploading private full source package ${sourceFiles.length} files from ${privateSourceRoot}\n`);
  if (sourceIndexOnly) {
    process.stderr.write('skyenet-deploy: source-index-only enabled; skipping per-file private source upload\n');
  } else {
    await uploadWithConcurrency(sourceFiles, concurrency, async (file) => {
      const params = new URLSearchParams({ workspaceId, projectId, deploymentId, path: file.rel });
      const body = await fs.readFile(file.full);
      try {
        await apiFetch(api, token, `/deploy/source-upload?${params.toString()}`, {
          method: 'PUT',
          headers: { 'content-type': contentTypeForPath(file.rel) },
          body,
          retries: 5,
          retryDelayMs: 900
        });
      } catch (error) {
        error.message = `Private source upload failed for ${file.rel}: ${error.message}`;
        throw error;
      }
    });
  }
  if (sourceIndexOnly || sourceFiles.length > SOURCE_INDEX_UPLOAD_THRESHOLD) {
    process.stderr.write(`skyenet-deploy: uploading private source JSONL index for ${sourceFiles.length} files\n`);
    const params = new URLSearchParams({ workspaceId, projectId, deploymentId });
    const indexResponse = await apiFetch(api, token, `/deploy/source-index?${params.toString()}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/x-ndjson; charset=utf-8' },
      body: sourceIndexBody(sourceFiles),
      retries: 5,
      retryDelayMs: 900
    });
    uploadedSourceIndex = indexResponse.source_index || null;
  }
  if (sourceArchiveArg) {
    const archivePath = path.resolve(sourceArchiveArg);
    const archiveStat = await fs.stat(archivePath);
    const archiveSha256 = await sha256File(archivePath);
    const params = new URLSearchParams({
      workspaceId,
      projectId,
      deploymentId,
      filename: path.basename(archivePath)
    });
    const archiveResponse = await apiFetch(api, token, `/deploy/source-archive?${params.toString()}`, {
      method: 'PUT',
      headers: {
        'content-type': contentTypeForPath(archivePath),
        'content-length': String(archiveStat.size),
        'x-skynet-source-archive-bytes': String(archiveStat.size),
        'x-skynet-source-archive-sha256': archiveSha256
      },
      body: createReadStream(archivePath),
      duplex: 'half',
      retries: 5,
      retryDelayMs: 900
    });
    uploadedSourceArchive = archiveResponse.source_archive || null;
  }
  const sourceCompletePayload = {
    workspace_id: workspaceId,
    plan_name: planName,
    project_id: projectId,
    deployment_id: deploymentId,
    archive: uploadedSourceArchive,
    meta: {
      source_root: privateSourceRoot,
      public_build_root: sourceRoot,
      upload_mode: sourceIndexOnly ? 'source-index-with-archive' : (sourceRootArg ? 'explicit-source-root' : 'deploy-dir-source-root'),
      public_asset_exposure: false
    }
  };
  if (uploadedSourceIndex) {
    sourceCompletePayload.index_key = uploadedSourceIndex.key;
    sourceCompletePayload.file_count = uploadedSourceIndex.file_count || sourceFiles.length;
    sourceCompletePayload.total_bytes = uploadedSourceIndex.total_bytes || sourceFiles.reduce((sum, file) => sum + Number(file.size || 0), 0);
    sourceCompletePayload.sample_files = sourceFiles.slice(0, 1000).map(sourceFileRecord);
  } else {
    sourceCompletePayload.files = sourceFiles.map(sourceFileRecord);
  }
  await apiFetch(api, token, '/deploy/source-complete', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
	    body: JSON.stringify(sourceCompletePayload),
    retries: 5,
    retryDelayMs: 900
  });
}

const route = await apiFetch(api, token, '/deploy/route', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    workspace_id: workspaceId,
    plan_name: planName,
    hostname: host,
    mount_path: mount,
    ...(urlMode ? { url_mode: urlMode === 'native' ? 'subdomain' : urlMode } : {}),
    project_id: projectId,
    deployment_id: deploymentId,
    public_access: publicAccess,
    default_auth: publicAccess ? 'public' : 'gate'
  }),
  retries: 5,
  retryDelayMs: 900
});

console.log(JSON.stringify({
	  ok: true,
	  project_id: projectId,
	  deployment_id: deploymentId,
	  workspace_id: workspaceId,
	  file_count: files.length,
	  private_source_package: uploadSourcePackage ? {
	    root: privateSourceRoot,
	    file_count: sourceFiles.length,
	    uploaded: sourceFiles.length > 0,
	    source_index_only: sourceIndexOnly,
	    source_index_uploaded: Boolean(uploadedSourceIndex),
	    source_archive_uploaded: Boolean(uploadedSourceArchive),
	    source_manifest_url: `/api/skyenet/source-manifest?workspace_id=${encodeURIComponent(workspaceId)}&project_id=${encodeURIComponent(projectId)}&deployment_id=${encodeURIComponent(deploymentId)}`,
	    source_tree_url: `/api/skyenet/source-tree?workspace_id=${encodeURIComponent(workspaceId)}&project_id=${encodeURIComponent(projectId)}&deployment_id=${encodeURIComponent(deploymentId)}`,
	    source_search_url: `/api/skyenet/source-search?workspace_id=${encodeURIComponent(workspaceId)}&project_id=${encodeURIComponent(projectId)}&deployment_id=${encodeURIComponent(deploymentId)}`,
	    public_asset_exposure: false
	  } : {
    uploaded: false,
    reason: '--no-source'
  },
  live_url: route.live_url,
  route_key: route.key,
  receipt: route.receipt || null
}, null, 2));
