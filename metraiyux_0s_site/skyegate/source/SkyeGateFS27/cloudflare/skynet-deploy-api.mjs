import { requireGateAuth, gateAuthErrorResponse } from '../netlify/functions/_lib/authz.js';
import { buildCors, json as httpJson } from '../netlify/functions/_lib/http.js';

const MAX_PROJECT = 160;
const MAX_DEPLOYMENT = 180;
const MAX_PATH = 700;

function cleanText(value, max = 500) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max);
}

function randomId(prefix) {
  const runtimeCrypto = globalThis.crypto || {};
  const id = runtimeCrypto.randomUUID ? runtimeCrypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${id.replace(/-/g, '').slice(0, 24)}`;
}

function deploymentBucket(env) {
  return env.DEPLOYMENT_ASSET_BUCKET || env.DEPLOYMENT_ASSETS_BUCKET || env.ZERO_OS_DEPLOYMENT_BUCKET || null;
}

function routeKv(env) {
  return env.ROUTING_KV || env.FS27_ROUTING_KV || null;
}

function requestLogBucket(env) {
  return env.REQUEST_LOG_BUCKET || env.FS27_REQUEST_LOG_BUCKET || null;
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

function skynetRootDomain(env) {
  return cleanText(env.SKYENET_ROOT_DOMAIN || env.SKYENET_APEX_DOMAIN || env.SKYENET_PUBLIC_DOMAIN || '', 260)
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/^\*\./, '');
}

function defaultSkynetHost(env, request, projectId = '') {
  const explicit = cleanText(env.SKYENET_DEFAULT_HOST || env.SKYENET_EDGE_HOST || env.SKYENET_PUBLIC_HOST || '', 260)
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '');
  if (explicit) return explicit;
  const root = skynetRootDomain(env);
  if (root && projectId) return `${projectId}.${root}`;
  return new URL(request.url).hostname.toLowerCase();
}

function urlModeFromBody(body = {}) {
  const value = cleanText(body.url_mode || body.urlMode || body.route_mode || body.routeMode || '', 80).toLowerCase();
  if (value === 'subdomain' || value === 'host' || body.subdomain === true) return 'subdomain';
  return 'path';
}

function liveUrlForRoute(record) {
  const host = cleanText(record?.hostname || '', 260);
  if (!host) return '';
  const mount = normalizeMountPath(record?.mount_path || '');
  return `https://${host}${mount || '/'}`;
}

function skynetUrlModel(env, request, projectId = 'my-project') {
  const root = skynetRootDomain(env);
  const defaultHost = defaultSkynetHost(env, request, projectId);
  return {
    schema: 'fs27.skynet.url_model.v1',
    public_product_name: 'SkyeNet',
    current_release_default: 'host_path_route',
    path_route_pattern: `https://${defaultHost}/skyenet/${projectId}`,
    branded_subdomain_pattern: root ? `https://${projectId}.${root}` : 'https://<project>.<your-skynet-domain>',
    url_modes: [
      {
        id: 'path',
        label: 'SkyeNet path route',
        status: 'live_now',
        example: `https://${defaultHost}/skyenet/${projectId}`,
        required_fields: ['project_id', 'deployment_id'],
        optional_fields: ['hostname', 'mount_path']
      },
      {
        id: 'subdomain',
        label: 'SkyeNet branded subdomain',
        status: root ? 'ready_when_dns_routes_to_skynet' : 'requires_wildcard_domain',
        example: root ? `https://${projectId}.${root}` : 'https://my-site.skynet.example',
        required_fields: ['project_id', 'deployment_id', 'hostname or SKYENET_ROOT_DOMAIN'],
        optional_fields: ['custom_domain']
      }
    ],
    copy_rule: 'Customer-facing copy says SkyeNet. Runtime provider details stay internal.'
  };
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

async function objectJson(object, fallback = null) {
  if (!object) return fallback;
  try {
    if (typeof object.json === 'function') return await object.json();
    if (typeof object.text === 'function') return JSON.parse(await object.text());
  } catch {
    return fallback;
  }
  return fallback;
}

async function listRouteRecords(kv, prefix, limit) {
  if (!kv?.list) return { routes: [], list_supported: false };
  const listed = await kv.list({ prefix, limit });
  const routes = [];
  for (const key of listed.keys || []) {
    const value = await kv.get(key.name, { type: 'json' }).catch(async () => {
      const raw = await kv.get(key.name).catch(() => null);
      if (!raw) return null;
      try { return JSON.parse(raw); } catch { return null; }
    });
    if (value && typeof value === 'object') routes.push({ key: key.name, route: value, metadata: key.metadata || null });
  }
  return { routes, list_supported: true, cursor: listed.cursor || null, list_complete: listed.list_complete !== false };
}

function skynetCostModel() {
  return {
    schema: 'fs27.skynet.cost_model.v1',
    generated_at: new Date().toISOString(),
    currency: 'usd',
    pricing_review_required: true,
    purpose: 'Internal planning model for SkyeNet. Do not publish as final customer pricing without a fresh provider billing review.',
    public_naming_rule: 'Public/customer copy should describe the product as SkyeNet Edge, SkyeNet Deploy, SkyeNet Functions, and SkyeNet Sovereign Runtime. Provider primitive names stay in internal proof, ops, and cost ledgers.',
    free99_policy: {
      default: 'Free99 can allow gated builder access and tiny public demos, but it must be quota-capped and owner-observable.',
      recommended_caps: {
        public_routes_per_workspace: 1,
        storage_mb_per_workspace: 25,
        monthly_requests_per_workspace: 10000,
        deployments_per_month: 3,
        retention_days: 30,
        custom_domains: 0,
        serverless_functions: 0
      }
    },
    assumptions: {
      worker_requests: 'SkyeNet Edge requests should be cached and quota-capped per workspace.',
      r2_storage: 'SkyeNet asset vault storage stays low when Free99 bundles are small and old deployments expire.',
      kv_routing_reads: 'Route registry reads should be cached at the edge where safe.',
      function_execution: 'Untrusted uploaded functions need SkyeNet isolated runtime caps before unlimited sales copy.',
      private_runtime: 'A VPS is optional for static/managed SkyeNet Edge release and required for owned arbitrary-code execution.'
    },
    cost_inputs: [
      { id: 'workers_paid_floor', label: 'Workers paid plan floor', unit: 'month', assumed_usd: 5.00, notes: 'Shared across the account when already paid.' },
      { id: 'worker_requests', label: 'Worker request overage', unit: 'million_requests', assumed_usd: 0.30, notes: 'Applies after included request pool on the paid plan.' },
      { id: 'r2_storage', label: 'R2 standard storage', unit: 'gb_month', assumed_usd: 0.015, notes: 'Deployment assets and archived runtime logs.' },
      { id: 'r2_class_a', label: 'R2 Class A operations', unit: 'million_writes_lists', assumed_usd: 4.50, notes: 'Uploads, list operations, route/admin inspections.' },
      { id: 'r2_class_b', label: 'R2 Class B operations', unit: 'million_reads', assumed_usd: 0.36, notes: 'Public asset reads from deployed bundles.' },
      { id: 'kv_reads', label: 'KV route reads', unit: 'million_reads', assumed_usd: 0.50, notes: 'Route lookup for mapped host/path requests.' },
      { id: 'kv_writes', label: 'KV route writes', unit: 'million_writes', assumed_usd: 5.00, notes: 'Deployment route registration and metadata updates.' },
      { id: 'analytics_events', label: 'Analytics Engine/runtime ledger', unit: 'million_events', assumed_usd: 0.25, notes: 'Telemetry pricing must be verified before customer billing.' }
    ],
    example_months: [
      {
        id: 'free99_tiny',
        label: 'Free99 tiny workspace',
        storage_gb: 0.025,
        requests: 10000,
        deploy_writes: 100,
        estimated_variable_usd: 0.02,
        pricing_posture: 'absorbed only while owner-approved and quota-capped'
      },
      {
        id: 'starter_surface',
        label: 'Starter hosted surface',
        storage_gb: 1,
        requests: 250000,
        deploy_writes: 1000,
        estimated_variable_usd: 0.25,
        pricing_posture: 'bundle with maintenance margin; do not sell at raw infra cost'
      },
      {
        id: 'growth_workspace',
        label: 'Growth workspace',
        storage_gb: 10,
        requests: 2500000,
        deploy_writes: 10000,
        estimated_variable_usd: 2.15,
        pricing_posture: 'charge for support, proof, domains, and managed ops, not just bytes'
      }
    ],
    guardrails: [
      'Keep Free99 static-first: no arbitrary uploaded functions, no custom domains, no large media hosting by default.',
      'Cache immutable JS/CSS/image/font assets long-term so R2 Class B reads do not become the hidden bill.',
      'Require owner/admin approval before increasing route count, retention, storage, function proxying, or paid provider calls.',
      'Use per-workspace caps and runtime ledger receipts before offering usage-based customer dashboards.',
      'Separate raw infrastructure cost from customer pricing; support, QA, security, and proof work are the real margin line.'
    ]
  };
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

function routeRecordFromBody(body, auth, env, request) {
  const projectId = normalizeSlug(body.project_id || body.projectId, 'project', MAX_PROJECT);
  const deploymentId = normalizeSlug(body.deployment_id || body.deploymentId, randomId('dep'), MAX_DEPLOYMENT);
  const urlMode = urlModeFromBody(body);
  const mountPath = urlMode === 'subdomain'
    ? normalizeMountPath(body.mount_path || body.mountPath || '')
    : normalizeMountPath(body.mount_path || body.mountPath || `/skyenet/${projectId}`);
  const hostname = cleanText(body.hostname || body.host || defaultSkynetHost(env, request, projectId), 260).toLowerCase();
  const record = {
    schema: 'fs27.route.v1',
    hostname,
    mount_path: mountPath,
    url_mode: urlMode,
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
  const deploymentId = normalizeSlug(body.deployment_id || body.deploymentId || randomId('dep'), 'deployment', MAX_DEPLOYMENT);
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
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', body);
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
  const record = routeRecordFromBody(body, auth, env, request);
  const key = routeKeyForRecord(record);
  await kv.put(key, JSON.stringify(record, null, 2), {
    metadata: {
      schema: record.schema,
      project_id: record.project_id,
      deployment_id: record.active_deployment_id,
      mount_path: record.mount_path
    }
  });
  return httpJson(200, {
    ok: true,
    key,
    route: record,
    live_url: liveUrlForRoute(record),
    url_model: skynetUrlModel(env, request, record.project_id)
  }, cors);
}

async function handleStatus(request, env, cors) {
  const auth = await requireDeployAuth(request, cors);
  const url = new URL(request.url);
  const bucket = deploymentBucket(env);
  const kv = routeKv(env);
  const projectId = normalizeSlug(url.searchParams.get('projectId') || url.searchParams.get('project_id'), '', MAX_PROJECT);
  const deploymentId = normalizeSlug(url.searchParams.get('deploymentId') || url.searchParams.get('deployment_id'), '', MAX_DEPLOYMENT);
  const prefix = projectId && deploymentId ? assetPrefix(projectId, deploymentId, url.searchParams.get('assetPrefix') || '') : '';
  const manifest = prefix && bucket?.get
    ? {
      init: await objectJson(await bucket.get(`${prefix}/.fs27/deployment-init.json`).catch(() => null)),
      complete: await objectJson(await bucket.get(`${prefix}/.fs27/deployment-complete.json`).catch(() => null))
    }
    : null;
  return httpJson(200, {
    ok: true,
    service: 'fs27-skynet',
    status: bucket?.put && kv?.put ? 'ready' : 'needs_configuration',
    auth: {
      customer_id: cleanText(auth.customer_id || '', 160),
      role: cleanText(auth.role || '', 80),
      source: cleanText(auth.gate_auth_source || '', 120)
    },
    configured: {
      deployment_asset_bucket: Boolean(bucket?.put),
      deployment_asset_reads: Boolean(bucket?.get),
      routing_kv: Boolean(kv?.put),
      routing_kv_reads: Boolean(kv?.get),
      routing_kv_list: Boolean(kv?.list),
      request_log_bucket: Boolean(requestLogBucket(env)?.put),
      analytics_engine: Boolean(env.REQUEST_ANALYTICS?.writeDataPoint || env.FS27_REQUEST_ANALYTICS?.writeDataPoint),
      request_event_queue: Boolean(env.REQUEST_EVENT_QUEUE?.send || env.FS27_REQUEST_EVENT_QUEUE?.send),
      runtime_rollup_db: Boolean(env.RUNTIME_ROLLUP_DB?.prepare || env.FS27_RUNTIME_ROLLUP_DB?.prepare)
    },
    endpoints: [
      'POST /deploy/init',
      'PUT /deploy/upload',
      'POST /deploy/complete',
      'POST /deploy/route',
      'GET /deploy/status',
      'GET /deploy/routes',
      'GET /deploy/observability',
      'GET /deploy/cost-model'
    ],
    capabilities: {
      static_drop_hosting: true,
      r2_asset_deployments: true,
      host_path_routing: true,
      gated_routes: true,
      public_routes: true,
      fallback_origin_proxy: true,
      first_party_worker_functions: true,
      skynet_edge_primary_release_lane: true,
      skynet_sovereign_runtime_compatible: true,
      netlify_function_bundle_converter: true,
      uploaded_function_bundle_intake: true,
      signed_function_bundle_manifest: true,
      owned_skyenet_functions_runtime_v1: true,
      function_runtime_env_isolation: true,
      function_runtime_timeout_caps: true,
      function_runtime_memory_caps: true,
      function_runtime_body_caps: true,
      function_runtime_egress_default_deny: true,
      netlify_handler_event_parity: true,
      arbitrary_uploaded_serverless_functions: false,
      function_boundary: 'SkyeNet Edge is live for static deployments, route registration, fallback-origin proxying, managed SkyeNet function lanes, Netlify-compatible bundle intake, and signed controlled runtime v1 execution for trusted or owner-approved bundles. Unlimited hostile customer-uploaded function execution requires the SkyeNet isolated runtime lane before it should be sold as unrestricted Netlify Functions parity.'
    },
    runtime_targets: {
      public_product_name: 'SkyeNet',
      always_on_lane: 'SkyeNet Edge',
      uploaded_functions_lane: 'SkyeNet Functions',
      owned_execution_lane: 'SkyeNet Sovereign Runtime',
      provider_split_customer_facing: false,
      provider_details_internal_only: true,
      cloudflare_workers_for_platforms_core_dependency: false,
      private_runtime_required_for_untrusted_customer_code: true,
      private_runtime_optional_for_static_and_managed_functions: true
    },
    url_model: skynetUrlModel(env, request, projectId || 'my-project'),
    requested_deployment: prefix ? { project_id: projectId, deployment_id: deploymentId, asset_prefix: prefix, manifest } : null
  }, cors);
}

async function handleRoutes(request, env, cors) {
  await requireDeployAuth(request, cors);
  const kv = routeKv(env);
  if (!kv?.list) return httpJson(501, { ok: false, error: 'ROUTING_KV list is not configured', code: 'NO_ROUTE_LIST' }, cors);
  const url = new URL(request.url);
  const host = cleanText(url.searchParams.get('host') || '', 260).toLowerCase();
  const projectId = normalizeSlug(url.searchParams.get('projectId') || url.searchParams.get('project_id'), '', MAX_PROJECT);
  const limit = Math.max(1, Math.min(500, Number(url.searchParams.get('limit') || 100)));
  const prefix = host
    ? `route:v1:host:${host}`
    : projectId
      ? 'route:v1:'
      : cleanText(url.searchParams.get('prefix') || 'route:v1:', 500);
  const listed = await listRouteRecords(kv, prefix, limit);
  const routes = projectId
    ? listed.routes.filter((item) => normalizeSlug(item.route?.project_id || item.route?.projectId || '', '', MAX_PROJECT) === projectId)
    : listed.routes;
  return httpJson(200, { ok: true, prefix, count: routes.length, routes, cursor: listed.cursor || null, list_complete: listed.list_complete !== false }, cors);
}

async function handleObservability(request, env, cors) {
  await requireDeployAuth(request, cors);
  const url = new URL(request.url);
  const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit') || 25)));
  const logBucket = requestLogBucket(env);
  let logs = [];
  if (logBucket?.list) {
    const listed = await logBucket.list({ prefix: 'runtime-logs/', limit }).catch(() => null);
    logs = (listed?.objects || []).map((object) => ({
      key: object.key,
      size: object.size || 0,
      uploaded: object.uploaded ? new Date(object.uploaded).toISOString() : ''
    }));
  }
  return httpJson(200, {
    ok: true,
    service: 'fs27-skynet-observability',
    sinks: {
      request_header: 'x-0s-request-id',
      analytics_engine: Boolean(env.REQUEST_ANALYTICS?.writeDataPoint || env.FS27_REQUEST_ANALYTICS?.writeDataPoint),
      queue: Boolean(env.REQUEST_EVENT_QUEUE?.send || env.FS27_REQUEST_EVENT_QUEUE?.send),
      r2_runtime_logs: Boolean(logBucket?.put),
      r2_runtime_log_list: Boolean(logBucket?.list),
      d1_rollups: Boolean(env.RUNTIME_ROLLUP_DB?.prepare || env.FS27_RUNTIME_ROLLUP_DB?.prepare),
      citadel_ingest: Boolean(env.CITADEL_RUNTIME_INGEST_URL || env.CITADELDB_RUNTIME_INGEST_URL)
    },
    runtime_event_schema: 'fs27.runtime_request.v1',
    latest_log_objects: logs,
    dashboard_boundaries: [
      'Owner/admin dashboards may show route, request, error, byte, and deployment counts.',
      'Customer dashboards should be scoped by customer_id/project_id and must not expose bearer tokens, cookies, IP addresses, or raw private request bodies.',
      'Function/runtime logs are redacted before R2 archive and D1 rollups.'
    ]
  }, cors);
}

async function handleCostModel(request, env, cors) {
  await requireDeployAuth(request, cors);
  return httpJson(200, { ok: true, cost_model: skynetCostModel() }, cors);
}

export async function handleSkyeNetDeployRequest(request, context = {}) {
  const cors = buildCors(request);
  if (request.method === 'OPTIONS') return new Response('', { status: 204, headers: cors });
  const env = context.env || {};
  const url = new URL(request.url);
  try {
    if (url.pathname === '/deploy/status' && request.method === 'GET') return await handleStatus(request, env, cors);
    if (url.pathname === '/deploy/routes' && request.method === 'GET') return await handleRoutes(request, env, cors);
    if (url.pathname === '/deploy/observability' && request.method === 'GET') return await handleObservability(request, env, cors);
    if (url.pathname === '/deploy/cost-model' && request.method === 'GET') return await handleCostModel(request, env, cors);
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
