import { requireGateAuth, gateAuthErrorResponse } from '../netlify/functions/_lib/authz.js';
import { buildCors, json as httpJson } from '../netlify/functions/_lib/http.js';

const MAX_PROJECT = 160;
const MAX_DEPLOYMENT = 180;
const MAX_PATH = 700;

function cleanText(value, max = 500) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max);
}

function randomId(prefix) {
  const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${id.replace(/-/g, '').slice(0, 24)}`;
}

function deploymentBucket(env) {
  return env.DEPLOYMENT_ASSET_BUCKET || env.DEPLOYMENT_ASSETS_BUCKET || env.ZERO_OS_DEPLOYMENT_BUCKET || null;
}

function routeKv(env) {
  return env.ROUTING_KV || env.FS27_ROUTING_KV || null;
}

function normalizeSlug(value, fallback, max = MAX_PROJECT) {
  const clean = cleanText(value || fallback, max)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return clean || fallback;
}

function normalizeMountPath(value) {
  const raw = cleanText(value || '', 240).replace(/\\/g, '/').replace(/\/+/g, '/');
  if (!raw || raw === '/') return '';
  return `/${raw.replace(/^\/+/, '').replace(/\/+$/, '')}`;
}

function normalizeAssetPath(value) {
  const raw = cleanText(value || '', MAX_PATH).replace(/\\/g, '/').replace(/^\/+/, '');
  const parts = raw.split('/').filter(Boolean);
  if (!parts.length) return 'index.html';
  if (parts.some((part) => part === '..' || part === '.')) {
    const error = new Error('Invalid asset path');
    error.status = 400;
    error.code = 'BAD_ASSET_PATH';
    throw error;
  }
  const normalized = parts.join('/');
  if (/^(cloudflare|netlify|node_modules|runtime|scripts|sql|tests)(\/|$)/i.test(normalized)) {
    const error = new Error('Refusing to upload source/runtime path');
    error.status = 400;
    error.code = 'SOURCE_PATH_BLOCKED';
    throw error;
  }
  return normalized;
}

function contentTypeForPath(pathname, fallback = '') {
  const explicit = cleanText(fallback, 160);
  if (explicit) return explicit;
  const path = pathname.toLowerCase();
  if (path.endsWith('.html')) return 'text/html; charset=utf-8';
  if (path.endsWith('.css')) return 'text/css; charset=utf-8';
  if (path.endsWith('.js') || path.endsWith('.mjs')) return 'text/javascript; charset=utf-8';
  if (path.endsWith('.json')) return 'application/json; charset=utf-8';
  if (path.endsWith('.svg')) return 'image/svg+xml';
  if (path.endsWith('.png')) return 'image/png';
  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg';
  if (path.endsWith('.webp')) return 'image/webp';
  if (path.endsWith('.ico')) return 'image/x-icon';
  if (path.endsWith('.txt')) return 'text/plain; charset=utf-8';
  return 'application/octet-stream';
}

function assetPrefix(projectId, deploymentId, explicit = '') {
  const cleanExplicit = cleanText(explicit, MAX_PATH).replace(/^\/+/, '').replace(/\/+$/, '');
  if (cleanExplicit) return cleanExplicit;
  return `deployments/${projectId}/${deploymentId}`;
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    const error = new Error('Invalid JSON');
    error.status = 400;
    error.code = 'BAD_JSON';
    throw error;
  }
}

async function requireDeployAuth(request, cors) {
  try {
    return await requireGateAuth(request, 'deployer');
  } catch (error) {
    throw gateAuthErrorResponse(error, cors);
  }
}

function routeKeyForRecord(record) {
  const host = cleanText(record.hostname, 260).toLowerCase();
  if (!host) {
    const error = new Error('Missing hostname');
    error.status = 400;
    error.code = 'MISSING_HOSTNAME';
    throw error;
  }
  const mountPath = normalizeMountPath(record.mount_path || record.mountPath || '');
  return mountPath
    ? `route:v1:host:${host}:path:${mountPath}`
    : `route:v1:host:${host}`;
}

function routeRecordFromBody(body, auth) {
  const projectId = normalizeSlug(body.project_id || body.projectId, 'project', MAX_PROJECT);
  const deploymentId = normalizeSlug(body.deployment_id || body.deploymentId, randomId('dep'), MAX_DEPLOYMENT);
  const mountPath = normalizeMountPath(body.mount_path || body.mountPath || '');
  const record = {
    schema: 'fs27.route.v1',
    hostname: cleanText(body.hostname || body.host || '', 260).toLowerCase(),
    mount_path: mountPath,
    strip_mount_path: body.strip_mount_path !== false && body.stripMountPath !== false,
    customer_id: cleanText(body.customer_id || body.customerId || auth?.customer_id || '', 160),
    project_id: projectId,
    active_deployment_id: deploymentId,
    public_access: body.public_access !== false && body.publicAccess !== false,
    default_auth: cleanText(body.default_auth || body.defaultAuth || body.auth || 'public', 80).toLowerCase(),
    asset_mode: cleanText(body.asset_mode || body.assetMode || 'r2', 80).toLowerCase(),
    asset_prefix: assetPrefix(projectId, deploymentId, body.asset_prefix || body.assetPrefix || ''),
    function_mode: cleanText(body.function_mode || body.functionMode || '', 80).toLowerCase(),
    dispatch_name: cleanText(body.dispatch_name || body.dispatchName || '', 220),
    forward_auth: body.forward_auth === true || body.forwardAuth === true,
    fallback_origin: cleanText(body.fallback_origin || body.fallbackOrigin || '', 700),
    updated_at: new Date().toISOString()
  };
  if (!record.hostname) {
    const error = new Error('Missing hostname');
    error.status = 400;
    error.code = 'MISSING_HOSTNAME';
    throw error;
  }
  return record;
}

async function handleInit(request, env, cors) {
  const auth = await requireDeployAuth(request, cors);
  const body = await readJson(request);
  const projectId = normalizeSlug(body.project_id || body.projectId, 'project', MAX_PROJECT);
  const deploymentId = normalizeSlug(body.deployment_id || body.deploymentId, randomId('dep'), MAX_DEPLOYMENT);
  const prefix = assetPrefix(projectId, deploymentId, body.asset_prefix || body.assetPrefix || '');
  const bucket = deploymentBucket(env);
  if (bucket?.put) {
    await bucket.put(`${prefix}/.fs27/deployment-init.json`, JSON.stringify({
      schema: 'fs27.deployment_init.v1',
      project_id: projectId,
      deployment_id: deploymentId,
      customer_id: cleanText(auth.customer_id || '', 160),
      created_at: new Date().toISOString(),
      title: cleanText(body.title || body.name || '', 200)
    }, null, 2), {
      httpMetadata: { contentType: 'application/json; charset=utf-8' }
    });
  }
  return httpJson(200, {
    ok: true,
    project_id: projectId,
    deployment_id: deploymentId,
    asset_prefix: prefix,
    upload: {
      method: 'PUT',
      path: '/deploy/upload',
      query: 'projectId=<project_id>&deploymentId=<deployment_id>&path=<asset_path>'
    }
  }, cors);
}

async function handleUpload(request, env, cors) {
  await requireDeployAuth(request, cors);
  const bucket = deploymentBucket(env);
  if (!bucket?.put) return httpJson(500, { error: 'DEPLOYMENT_ASSET_BUCKET is not configured', code: 'NO_DEPLOYMENT_BUCKET' }, cors);
  const url = new URL(request.url);
  const projectId = normalizeSlug(url.searchParams.get('projectId') || url.searchParams.get('project_id'), 'project', MAX_PROJECT);
  const deploymentId = normalizeSlug(url.searchParams.get('deploymentId') || url.searchParams.get('deployment_id'), 'dep_missing', MAX_DEPLOYMENT);
  const deployPath = normalizeAssetPath(url.searchParams.get('path') || url.searchParams.get('assetPath') || '');
  const prefix = assetPrefix(projectId, deploymentId, url.searchParams.get('assetPrefix') || '');
  const body = await request.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', body);
  const sha256 = [...new Uint8Array(hashBuffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  const key = `${prefix}/${deployPath}`.replace(/\/+/g, '/');
  const contentType = contentTypeForPath(deployPath, request.headers.get('content-type') || '');
  await bucket.put(key, body, {
    httpMetadata: { contentType },
    customMetadata: {
      schema: 'fs27.deployment_asset.v1',
      project_id: projectId,
      deployment_id: deploymentId,
      sha256
    }
  });
  return httpJson(200, {
    ok: true,
    project_id: projectId,
    deployment_id: deploymentId,
    path: deployPath,
    key,
    bytes: body.byteLength,
    sha256,
    content_type: contentType
  }, cors);
}

async function handleComplete(request, env, cors) {
  const auth = await requireDeployAuth(request, cors);
  const body = await readJson(request);
  const bucket = deploymentBucket(env);
  if (!bucket?.put) return httpJson(500, { error: 'DEPLOYMENT_ASSET_BUCKET is not configured', code: 'NO_DEPLOYMENT_BUCKET' }, cors);
  const projectId = normalizeSlug(body.project_id || body.projectId, 'project', MAX_PROJECT);
  const deploymentId = normalizeSlug(body.deployment_id || body.deploymentId, 'dep_missing', MAX_DEPLOYMENT);
  const prefix = assetPrefix(projectId, deploymentId, body.asset_prefix || body.assetPrefix || '');
  const files = Array.isArray(body.files)
    ? body.files.map((item) => normalizeAssetPath(item)).slice(0, 20000)
    : [];
  const manifest = {
    schema: 'fs27.deployment_complete.v1',
    project_id: projectId,
    deployment_id: deploymentId,
    customer_id: cleanText(auth.customer_id || '', 160),
    completed_at: new Date().toISOString(),
    files,
    meta: body.meta && typeof body.meta === 'object' ? body.meta : {}
  };
  await bucket.put(`${prefix}/.fs27/deployment-complete.json`, JSON.stringify(manifest, null, 2), {
    httpMetadata: { contentType: 'application/json; charset=utf-8' }
  });
  return httpJson(200, { ok: true, project_id: projectId, deployment_id: deploymentId, asset_prefix: prefix, files: files.length }, cors);
}

async function handleRoute(request, env, cors) {
  const auth = await requireDeployAuth(request, cors);
  const kv = routeKv(env);
  if (!kv?.put) return httpJson(500, { error: 'ROUTING_KV is not configured', code: 'NO_ROUTING_KV' }, cors);
  const body = await readJson(request);
  const record = routeRecordFromBody(body, auth);
  const key = routeKeyForRecord(record);
  await kv.put(key, JSON.stringify(record, null, 2), {
    metadata: {
      schema: record.schema,
      project_id: record.project_id,
      deployment_id: record.active_deployment_id,
      mount_path: record.mount_path
    }
  });
  return httpJson(200, { ok: true, key, route: record }, cors);
}

export async function handleSkyeNetDeployRequest(request, context = {}) {
  const cors = buildCors(request);
  if (request.method === 'OPTIONS') return new Response('', { status: 204, headers: cors });
  const env = context.env || {};
  const url = new URL(request.url);
  try {
    if (url.pathname === '/deploy/init' && request.method === 'POST') return await handleInit(request, env, cors);
    if (url.pathname === '/deploy/upload' && ['PUT', 'POST'].includes(request.method)) return await handleUpload(request, env, cors);
    if (url.pathname === '/deploy/complete' && request.method === 'POST') return await handleComplete(request, env, cors);
    if (url.pathname === '/deploy/route' && request.method === 'POST') return await handleRoute(request, env, cors);
    return httpJson(404, { error: 'Unknown deploy endpoint' }, cors);
  } catch (error) {
    if (error instanceof Response) return error;
    return httpJson(error?.status || 500, {
      error: error?.message || 'Deploy API error',
      code: error?.code || 'DEPLOY_API_ERROR'
    }, cors);
  }
}

export default handleSkyeNetDeployRequest;
