import { requireGateAuth, gateAuthErrorResponse } from '../netlify/functions/_lib/authz.js';
import { buildCors, json as httpJson } from '../netlify/functions/_lib/http.js';

const MAX_PROJECT = 160;
const MAX_DEPLOYMENT = 180;
const MAX_PATH = 700;
const DEFAULT_PLAN = 'free99';

const PLAN_CAPS = {
  free99: {
    label: 'Free99 capped workspace',
    max_static_bundle_bytes: 25 * 1024 * 1024,
    deployments_per_month: 3,
    public_routes_per_workspace: 1,
    custom_domains: 0,
    serverless_functions: 0,
    functions_enabled: false,
    managed_functions_enabled: false,
    signed_function_bundles_required: true,
    retention_days: 30
  },
  'skyenet-edge-starter': {
    label: 'SkyeNet Edge Starter',
    max_static_bundle_bytes: 25 * 1024 * 1024,
    deployments_per_month: 20,
    public_routes_per_workspace: 1,
    custom_domains: 0,
    serverless_functions: 0,
    functions_enabled: false,
    managed_functions_enabled: false,
    signed_function_bundles_required: true,
    retention_days: 60
  },
  'skyenet-edge-growth': {
    label: 'SkyeNet Edge Growth',
    max_static_bundle_bytes: 150 * 1024 * 1024,
    deployments_per_month: 100,
    public_routes_per_workspace: 5,
    custom_domains: 1,
    serverless_functions: 'managed_review',
    functions_enabled: false,
    managed_functions_enabled: true,
    signed_function_bundles_required: true,
    retention_days: 120
  },
  'skyenet-functions-managed': {
    label: 'SkyeNet Functions Managed',
    max_static_bundle_bytes: 250 * 1024 * 1024,
    deployments_per_month: 150,
    public_routes_per_workspace: 8,
    custom_domains: 2,
    serverless_functions: 'approved_managed',
    functions_enabled: false,
    managed_functions_enabled: true,
    signed_function_bundles_required: true,
    retention_days: 180
  },
  'skyenet-sovereign-runtime-reserve': {
    label: 'SkyeNet Sovereign Runtime Reserve',
    max_static_bundle_bytes: 500 * 1024 * 1024,
    deployments_per_month: 300,
    public_routes_per_workspace: 20,
    custom_domains: 5,
    serverless_functions: 'isolated_runtime_reserved',
    functions_enabled: false,
    managed_functions_enabled: true,
    signed_function_bundles_required: true,
    retention_days: 365
  }
};

const OWNER_ADMIN_CAPS = {
  label: 'Owner/admin unlocked SkyeNet lane',
  max_static_bundle_bytes: 1024 * 1024 * 1024,
  deployments_per_month: 1000000,
  public_routes_per_workspace: 1000000,
  custom_domains: 1000000,
  serverless_functions: 'owner_approved_managed',
  functions_enabled: false,
  managed_functions_enabled: true,
  signed_function_bundles_required: true,
  function_timeout_ms: 10000,
  function_memory_mb: 128,
  function_body_bytes: 1024 * 1024,
  function_subrequests: 32,
  function_egress: 'deny_by_default_allowlist',
  function_secret_mode: 'redacted_runtime_bindings_only',
  invocation_receipts_required: true,
  abuse_kill_switch: true,
  billing_guard_before_scale: true,
  retention_days: 3650,
  admin_override: true
};

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

function workspaceKv(env) {
  return env.SKYENET_WORKSPACES_KV || env.SKYENET_WORKSPACE_KV || routeKv(env);
}

function receiptKv(env) {
  return env.SKYENET_RECEIPTS_KV || env.SKYENET_DEPLOY_RECEIPTS_KV || routeKv(env);
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

function monthKey(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

function planName(value) {
  const requested = normalizeSlug(value || DEFAULT_PLAN, DEFAULT_PLAN, 120);
  return PLAN_CAPS[requested] ? requested : DEFAULT_PLAN;
}

function capsForPlan(value) {
  const name = planName(value);
  return { plan_name: name, ...PLAN_CAPS[name] };
}

function truthy(value) {
  return /^(1|true|yes|y|on)$/i.test(String(value || '').trim());
}

function isAdminPrincipal(auth = {}, request = null) {
  const role = cleanText(auth.role || auth.key_metadata?.role || '', 80).toLowerCase();
  const meta = auth.key_metadata && typeof auth.key_metadata === 'object' ? auth.key_metadata : {};
  const source = cleanText(meta.source || auth.gate_auth_source || requestGateHeader(request, 'x-metraiyux-session-source') || '', 200).toLowerCase();
  const cards = [
    requestGateHeader(request, 'x-0s-gate-cards'),
    requestGateHeader(request, 'x-skye-gate-cards'),
    cleanText(meta.gate_cards || meta.cards || '', 300)
  ].join(',').toLowerCase();
  return truthy(requestGateHeader(request, 'x-0s-admin-override'))
    || truthy(requestGateHeader(request, 'x-skye-admin-override'))
    || truthy(meta.admin_override)
    || truthy(auth.admin_override)
    || ['owner', 'founder', 'admin', 'operator', 'security'].includes(role)
    || (role === 'deployer' && /owner|admin|metraiyux-0s-skynet-console|skymusicnexus-worker/.test(source))
    || /(^|[-_:])(owner|founder|admin|operator)([-_:]|$)/.test(cards);
}

function capsForWorkspace(workspace = {}, auth = {}, request = null) {
  const base = capsForPlan(workspace?.plan_name || DEFAULT_PLAN);
  if (!workspace?.admin_override && !workspace?.caps?.admin_override && !isAdminPrincipal(auth, request)) return base;
  return {
    ...base,
    ...OWNER_ADMIN_CAPS,
    base_plan_name: base.plan_name,
    plan_name: workspace?.plan_name || base.plan_name || DEFAULT_PLAN
  };
}

function workspaceForResponse(workspace = {}, auth = {}, request = null) {
  const adminOverride = isAdminPrincipal(auth, request);
  const caps = capsForWorkspace(workspace, auth, request);
  return {
    ...workspace,
    caps,
    quota_override: adminOverride ? 'owner-admin-unlocked' : 'workspace-plan',
    admin_override: adminOverride,
    free99_credits_limited: !adminOverride && planName(workspace?.plan_name || DEFAULT_PLAN) === DEFAULT_PLAN
  };
}

function bytesLabel(bytes = 0) {
  const n = Number(bytes || 0);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function authPrincipal(auth = {}) {
  const rawCustomer = auth.customer_id || auth.customerId || auth.fs27_customer_id || auth.key_metadata?.customer_id || '';
  const customerId = cleanText(rawCustomer || '0', 160) || '0';
  const email = cleanText(auth.customer_email || auth.email || auth.key_metadata?.email || '', 220);
  const workspaceSeed = auth.workspace_id || auth.workspaceId || auth.key_metadata?.workspace_id || auth.key_metadata?.workspaceId || '';
  return {
    customer_id: customerId,
    email,
    role: cleanText(auth.role || '', 80),
    plan_name: planName(auth.customer_plan_name || auth.plan_name || auth.key_metadata?.plan_name || DEFAULT_PLAN),
    workspace_id: normalizeSlug(workspaceSeed || (customerId !== '0' ? `customer-${customerId}` : email || 'default-workspace'), 'default-workspace', 120)
  };
}

function workspaceIdFromInput(input = {}, principal = {}) {
  return normalizeSlug(
    input.workspace_id || input.workspaceId || input.workspace || principal.workspace_id,
    principal.workspace_id || 'default-workspace',
    120
  );
}

function workspaceKey(customerId, workspaceId) {
  return `skynet:workspace:v1:customer:${customerId}:workspace:${workspaceId}`;
}

function deploymentKey(customerId, workspaceId, projectId, deploymentId) {
  return `skynet:deployment:v1:customer:${customerId}:workspace:${workspaceId}:project:${projectId}:deployment:${deploymentId}`;
}

function deploymentPrefix(customerId, workspaceId) {
  return `skynet:deployment:v1:customer:${customerId}:workspace:${workspaceId}:`;
}

function receiptKey(customerId, workspaceId, type = 'event') {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `skynet:receipt:v1:customer:${customerId}:workspace:${workspaceId}:${stamp}:${type}:${randomId('rcpt')}`;
}

function receiptPrefix(customerId, workspaceId) {
  return `skynet:receipt:v1:customer:${customerId}:workspace:${workspaceId}:`;
}

function normalizeMountPath(value) {
  const raw = cleanText(value || '', 240)
    .replace(/^https?:\/\/[^/]+/i, '')
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/');
  if (!raw || raw === '/') return '';
  const parts = raw.replace(/^\/+/, '').replace(/\/+$/, '').split('/').filter(Boolean);
  if (!parts.length) return '';
  return `/${parts.map((part) => {
    let decoded = part;
    try { decoded = decodeURIComponent(part); } catch {}
    return encodeURIComponent(decoded);
  }).join('/')}`;
}

function normalizeHostname(value) {
  const raw = cleanText(value || '', 260).toLowerCase();
  if (!raw) return '';
  try {
    if (/^https?:\/\//i.test(raw)) return new URL(raw).hostname.toLowerCase();
  } catch {}
  return raw
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/^\*\./, '')
    .replace(/:\d+$/, '')
    .toLowerCase();
}

function skynetRootDomain(env) {
  return cleanText(env.SKYENET_ROOT_DOMAIN || env.SKYENET_APEX_DOMAIN || env.SKYENET_PUBLIC_DOMAIN || '', 260)
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/^\*\./, '');
}

function defaultSkynetHost(env, request, projectId = '') {
  const explicit = normalizeHostname(env.SKYENET_DEFAULT_HOST || env.SKYENET_EDGE_HOST || env.SKYENET_PUBLIC_HOST || '');
  if (explicit) return explicit;
  const root = skynetRootDomain(env);
  if (root && projectId) return `${projectId}.${root}`;
  const requestHost = normalizeHostname(new URL(request.url).hostname);
  if (requestHost === 'skyegatefs27.internal') {
    const forwarded = normalizeHostname(
      request.headers.get('x-forwarded-host') ||
      request.headers.get('x-0s-original-host') ||
      request.headers.get('x-skynet-public-host') ||
      ''
    );
    if (forwarded) return forwarded;
  }
  return requestHost;
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
  const path = mount || '/';
  return `https://${host}${path.endsWith('/') ? path : `${path}/`}`;
}

function skynetUrlModel(env, request, projectId = 'my-project') {
  const root = skynetRootDomain(env);
  const defaultHost = defaultSkynetHost(env, request, projectId);
  return {
    schema: 'fs27.skynet.url_model.v1',
    public_product_name: 'SkyeNet',
    current_release_default: 'host_path_route',
    path_route_pattern: `https://${defaultHost}/skyenet/${projectId}/`,
    branded_subdomain_pattern: root ? `https://${projectId}.${root}` : 'https://<project>.<your-skynet-domain>',
    url_modes: [
      {
        id: 'path',
        label: 'SkyeNet path route',
        status: 'live_now',
        example: `https://${defaultHost}/skyenet/${projectId}/`,
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

async function kvGetJson(kv, key, fallback = null) {
  if (!kv?.get || !key) return fallback;
  try {
    const value = await kv.get(key, { type: 'json' });
    return value == null ? fallback : value;
  } catch {
    try {
      const raw = await kv.get(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }
}

async function kvPutJson(kv, key, value, metadata = null) {
  if (!kv?.put || !key) return false;
  await kv.put(key, JSON.stringify(value, null, 2), metadata ? { metadata } : undefined);
  return true;
}

async function kvListJson(kv, prefix, limit = 100) {
  if (!kv?.list) return [];
  const listed = await kv.list({ prefix, limit });
  const rows = [];
  for (const key of listed.keys || []) {
    const value = await kvGetJson(kv, key.name, null);
    if (value && typeof value === 'object') rows.push({ key: key.name, value, metadata: key.metadata || null });
  }
  return rows;
}

function requestGateHeader(request, name) {
  if (!request?.headers) return '';
  return (request.headers.get(name) || request.headers.get(name.toLowerCase()) || request.headers.get(name.toUpperCase()) || '').toString().trim();
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

function workspaceFromBody(body = {}, auth = {}, request = null) {
  const principal = authPrincipal(auth);
  const workspaceId = workspaceIdFromInput(body, principal);
  const requestedPlan = planName(body.plan_name || body.planName || body.offer_id || body.offerId || principal.plan_name);
  const now = new Date().toISOString();
  return {
    schema: 'fs27.skynet.workspace.v1',
    customer_id: principal.customer_id,
    workspace_id: workspaceId,
    owner_email: cleanText(body.owner_email || body.email || principal.email || '', 220),
    display_name: cleanText(body.display_name || body.displayName || body.name || workspaceId, 180),
    plan_name: requestedPlan,
    caps: capsForPlan(requestedPlan),
    status: cleanText(body.status || 'active', 80).toLowerCase(),
    source: cleanText(body.source || requestGateHeader(request, 'x-metraiyux-session-source') || 'skyenet-console', 160),
    created_at: now,
    updated_at: now
  };
}

async function ensureWorkspace(env, auth, request, body = {}) {
  const principal = authPrincipal(auth);
  const workspaceId = workspaceIdFromInput(body, principal);
  const kv = workspaceKv(env);
  const key = workspaceKey(principal.customer_id, workspaceId);
  const existing = await kvGetJson(kv, key, null);
  if (existing) {
    const merged = {
      ...existing,
      owner_email: existing.owner_email || principal.email || '',
      plan_name: planName(body.plan_name || body.planName || existing.plan_name || principal.plan_name),
      caps: capsForPlan(body.plan_name || body.planName || existing.plan_name || principal.plan_name),
      status: existing.status || 'active',
      updated_at: new Date().toISOString()
    };
    if (body.display_name || body.displayName || body.name) {
      merged.display_name = cleanText(body.display_name || body.displayName || body.name, 180);
    }
    await kvPutJson(kv, key, merged, { schema: merged.schema, customer_id: principal.customer_id, workspace_id: workspaceId });
    return { key, workspace: workspaceForResponse(merged, auth, request), created: false };
  }
  const workspace = workspaceFromBody({ ...body, workspace_id: workspaceId }, auth, request);
  await kvPutJson(kv, key, workspace, { schema: workspace.schema, customer_id: workspace.customer_id, workspace_id: workspace.workspace_id });
  return { key, workspace: workspaceForResponse(workspace, auth, request), created: true };
}

async function deploymentUsage(env, customerId, workspaceId) {
  const rows = await kvListJson(receiptKv(env), receiptPrefix(customerId, workspaceId), 500);
  const month = monthKey();
  const deployReceipts = rows
    .map((item) => item.value)
    .filter((item) => item?.type === 'skynet.deploy.complete' || item?.type === 'skynet.deploy.init');
  const monthlyDeployments = new Set(
    deployReceipts
      .filter((item) => String(item.created_at || '').startsWith(month))
      .map((item) => item.deployment_id || item.meta?.deployment_id || item.id)
      .filter(Boolean)
  );
  const routeRows = await listRouteRecords(routeKv(env), 'route:v1:', 500);
  const routes = (routeRows.routes || []).filter((item) => String(item.route?.customer_id || '') === String(customerId));
  return {
    monthly_deployments: monthlyDeployments.size,
    total_receipts: rows.length,
    public_routes: routes.filter((item) => item.route?.public_access !== false).length,
    routes: routes.length
  };
}

async function saveReceipt(env, auth, workspaceId, type, meta = {}) {
  const principal = authPrincipal(auth);
  const kv = receiptKv(env);
  const receipt = {
    schema: 'fs27.skynet.receipt.v1',
    id: randomId('receipt'),
    type,
    customer_id: principal.customer_id,
    workspace_id: workspaceId || principal.workspace_id,
    project_id: cleanText(meta.project_id || meta.projectId || '', MAX_PROJECT),
    deployment_id: cleanText(meta.deployment_id || meta.deploymentId || '', MAX_DEPLOYMENT),
    live_url: cleanText(meta.live_url || '', 700),
    created_at: new Date().toISOString(),
    actor_email: principal.email || '',
    meta
  };
  await kvPutJson(kv, receiptKey(principal.customer_id, receipt.workspace_id, type), receipt, {
    schema: receipt.schema,
    type,
    customer_id: principal.customer_id,
    workspace_id: receipt.workspace_id,
    project_id: receipt.project_id
  });
  return receipt;
}

async function upsertDeploymentRecord(env, auth, request, patch = {}) {
  const principal = authPrincipal(auth);
  const workspaceId = workspaceIdFromInput(patch, principal);
  await ensureWorkspace(env, auth, request, { workspace_id: workspaceId, plan_name: patch.plan_name || patch.planName });
  const projectId = normalizeSlug(patch.project_id || patch.projectId, 'project', MAX_PROJECT);
  const deploymentId = normalizeSlug(patch.deployment_id || patch.deploymentId, randomId('dep'), MAX_DEPLOYMENT);
  const kv = receiptKv(env);
  const key = deploymentKey(principal.customer_id, workspaceId, projectId, deploymentId);
  const existing = await kvGetJson(kv, key, {});
  const now = new Date().toISOString();
  const record = {
    schema: 'fs27.skynet.deployment.v1',
    customer_id: principal.customer_id,
    workspace_id: workspaceId,
    project_id: projectId,
    deployment_id: deploymentId,
    status: patch.status || existing.status || 'initialized',
    files: Array.isArray(patch.files) ? patch.files : (existing.files || []),
    file_count: Number(patch.file_count ?? patch.fileCount ?? existing.file_count ?? 0),
    total_bytes: Number(patch.total_bytes ?? patch.totalBytes ?? existing.total_bytes ?? 0),
    asset_prefix: cleanText(patch.asset_prefix || patch.assetPrefix || existing.asset_prefix || assetPrefix(projectId, deploymentId), MAX_PATH),
    live_url: cleanText(patch.live_url || existing.live_url || '', 700),
    route_key: cleanText(patch.route_key || existing.route_key || '', 700),
    created_at: existing.created_at || now,
    updated_at: now,
    completed_at: patch.completed_at || existing.completed_at || null
  };
  await kvPutJson(kv, key, record, {
    schema: record.schema,
    customer_id: principal.customer_id,
    workspace_id: workspaceId,
    project_id: projectId,
    deployment_id: deploymentId,
    status: record.status
  });
  return { key, deployment: record };
}

async function enforceDeploymentQuota(env, workspace, usage, nextBytes = 0, auth = {}, request = null) {
  const caps = capsForWorkspace(workspace, auth, request);
  if (caps.admin_override) return;
  if (Number.isFinite(Number(caps.deployments_per_month)) && usage.monthly_deployments >= Number(caps.deployments_per_month)) {
    const error = new Error(`SkyeNet ${workspace.plan_name || DEFAULT_PLAN} deployment cap reached for this month.`);
    error.status = 429;
    error.code = 'SKYENET_DEPLOYMENT_QUOTA';
    throw error;
  }
  if (Number.isFinite(Number(caps.max_static_bundle_bytes)) && nextBytes > Number(caps.max_static_bundle_bytes)) {
    const error = new Error(`SkyeNet bundle exceeds ${bytesLabel(caps.max_static_bundle_bytes)} cap for ${workspace.plan_name || DEFAULT_PLAN}.`);
    error.status = 413;
    error.code = 'SKYENET_BUNDLE_CAP';
    throw error;
  }
}

async function enforceRouteQuota(env, workspace, auth, record, existingKey = '') {
  const principal = authPrincipal(auth);
  const caps = capsForWorkspace(workspace, auth);
  const usage = await deploymentUsage(env, principal.customer_id, workspace.workspace_id || principal.workspace_id);
  if (caps.admin_override) return usage;
  const isPublic = record.public_access !== false;
  const routeRows = await listRouteRecords(routeKv(env), 'route:v1:', 500);
  const publicRoutes = (routeRows.routes || []).filter((item) => {
    if (String(item.route?.customer_id || '') !== String(principal.customer_id)) return false;
    if (item.key === existingKey) return false;
    return item.route?.public_access !== false;
  });
  if (isPublic && Number.isFinite(Number(caps.public_routes_per_workspace)) && publicRoutes.length >= Number(caps.public_routes_per_workspace)) {
    const error = new Error(`SkyeNet ${workspace.plan_name || DEFAULT_PLAN} public route cap reached.`);
    error.status = 429;
    error.code = 'SKYENET_PUBLIC_ROUTE_QUOTA';
    throw error;
  }
  const defaultHost = defaultSkynetHost(env, new Request('https://skynet.local/'), record.project_id);
  const customHost = record.url_mode === 'subdomain' || (record.hostname && record.hostname !== defaultHost && !record.mount_path);
  if (customHost && Number(caps.custom_domains || 0) <= 0) {
    const error = new Error(`Custom or subdomain routes require an owner-approved paid SkyeNet plan.`);
    error.status = 402;
    error.code = 'SKYENET_CUSTOM_DOMAIN_PLAN_REQUIRED';
    throw error;
  }
  return usage;
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
  const hostname = normalizeHostname(body.hostname || body.host || defaultSkynetHost(env, request, projectId));
  const record = {
    schema: 'fs27.route.v1',
    hostname,
    mount_path: mountPath,
    url_mode: urlMode,
    strip_mount_path: body.strip_mount_path !== false && body.stripMountPath !== false,
    customer_id: cleanText(body.customer_id || body.customerId || auth?.customer_id || '', 160),
    workspace_id: workspaceIdFromInput(body, authPrincipal(auth || {})),
    plan_name: planName(body.plan_name || body.planName || auth?.customer_plan_name || DEFAULT_PLAN),
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
  const workspaceResult = await ensureWorkspace(env, auth, request, body);
  const usage = await deploymentUsage(env, workspaceResult.workspace.customer_id, workspaceResult.workspace.workspace_id);
  await enforceDeploymentQuota(env, workspaceResult.workspace, usage, 0, auth, request);
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
      workspace_id: workspaceResult.workspace.workspace_id,
      created_at: new Date().toISOString(),
      title: cleanText(body.title || body.name || '', 200)
    }, null, 2), {
      httpMetadata: { contentType: 'application/json; charset=utf-8' }
    });
  }
  const deployment = await upsertDeploymentRecord(env, auth, request, {
    ...body,
    workspace_id: workspaceResult.workspace.workspace_id,
    project_id: projectId,
    deployment_id: deploymentId,
    asset_prefix: prefix,
    status: 'initialized'
  });
  const receipt = await saveReceipt(env, auth, workspaceResult.workspace.workspace_id, 'skynet.deploy.init', {
    project_id: projectId,
    deployment_id: deploymentId,
    asset_prefix: prefix,
    deployment_key: deployment.key
  });
  return httpJson(200, {
    ok: true,
    project_id: projectId,
    deployment_id: deploymentId,
    workspace: workspaceResult.workspace,
    asset_prefix: prefix,
    quota: {
      usage,
      caps: workspaceResult.workspace.caps
    },
    receipt,
    upload: {
      method: 'PUT',
      path: '/deploy/upload',
      query: 'projectId=<project_id>&deploymentId=<deployment_id>&path=<asset_path>'
    }
  }, cors);
}

async function handleUpload(request, env, cors) {
  const auth = await requireDeployAuth(request, cors);
  const bucket = deploymentBucket(env);
  if (!bucket?.put) return httpJson(500, { error: 'DEPLOYMENT_ASSET_BUCKET is not configured', code: 'NO_DEPLOYMENT_BUCKET' }, cors);
  const url = new URL(request.url);
  const projectId = normalizeSlug(url.searchParams.get('projectId') || url.searchParams.get('project_id'), 'project', MAX_PROJECT);
  const deploymentId = normalizeSlug(url.searchParams.get('deploymentId') || url.searchParams.get('deployment_id'), 'dep_missing', MAX_DEPLOYMENT);
  const workspaceId = workspaceIdFromInput(Object.fromEntries(url.searchParams.entries()), authPrincipal(auth));
  const workspaceResult = await ensureWorkspace(env, auth, request, { workspace_id: workspaceId });
  const deployPath = normalizeAssetPath(url.searchParams.get('path') || url.searchParams.get('assetPath') || '');
  const prefix = assetPrefix(projectId, deploymentId, url.searchParams.get('assetPrefix') || '');
  const body = await request.arrayBuffer();
  const priorRecord = (await upsertDeploymentRecord(env, auth, request, {
    workspace_id: workspaceId,
    project_id: projectId,
    deployment_id: deploymentId,
    asset_prefix: prefix
  })).deployment;
  const nextBytes = Number(priorRecord.total_bytes || 0) + body.byteLength;
  await enforceDeploymentQuota(env, workspaceResult.workspace, await deploymentUsage(env, workspaceResult.workspace.customer_id, workspaceId), nextBytes, auth, request);
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
  const fileList = Array.from(new Set([...(priorRecord.files || []), deployPath]));
  const deployment = await upsertDeploymentRecord(env, auth, request, {
    workspace_id: workspaceId,
    project_id: projectId,
    deployment_id: deploymentId,
    asset_prefix: prefix,
    status: 'uploading',
    files: fileList,
    file_count: fileList.length,
    total_bytes: nextBytes
  });
  const receipt = await saveReceipt(env, auth, workspaceId, 'skynet.deploy.upload', {
    project_id: projectId,
    deployment_id: deploymentId,
    path: deployPath,
    key,
    bytes: body.byteLength,
    total_bytes: nextBytes,
    sha256
  });
  return httpJson(200, {
    ok: true,
    project_id: projectId,
    deployment_id: deploymentId,
    workspace_id: workspaceId,
    path: deployPath,
    key,
    bytes: body.byteLength,
    total_bytes: nextBytes,
    sha256,
    content_type: contentType,
    deployment: deployment.deployment,
    receipt
  }, cors);
}

async function handleComplete(request, env, cors) {
  const auth = await requireDeployAuth(request, cors);
  const body = await readJson(request);
  const workspaceResult = await ensureWorkspace(env, auth, request, body);
  const bucket = deploymentBucket(env);
  if (!bucket?.put) return httpJson(500, { error: 'DEPLOYMENT_ASSET_BUCKET is not configured', code: 'NO_DEPLOYMENT_BUCKET' }, cors);
  const projectId = normalizeSlug(body.project_id || body.projectId, 'project', MAX_PROJECT);
  const deploymentId = normalizeSlug(body.deployment_id || body.deploymentId, 'dep_missing', MAX_DEPLOYMENT);
  const prefix = assetPrefix(projectId, deploymentId, body.asset_prefix || body.assetPrefix || '');
  const files = Array.isArray(body.files)
    ? body.files.map((item) => normalizeAssetPath(item)).slice(0, 20000)
    : [];
  const hasRootIndex = files.some((file) => file.toLowerCase() === 'index.html');
  if (!hasRootIndex && body.require_root_index !== false && body.requireRootIndex !== false) {
    return httpJson(400, {
      ok: false,
      error: 'Root index.html is required for SkyeNet static deployment routes. Upload the contents of dist/build/out/public or promote that folder before completing.',
      code: 'ROOT_INDEX_REQUIRED',
      files
    }, cors);
  }
  const manifest = {
    schema: 'fs27.deployment_complete.v1',
    project_id: projectId,
    deployment_id: deploymentId,
    customer_id: cleanText(auth.customer_id || '', 160),
    workspace_id: workspaceResult.workspace.workspace_id,
    completed_at: new Date().toISOString(),
    files,
    meta: {
      ...(body.meta && typeof body.meta === 'object' ? body.meta : {}),
      has_root_index: hasRootIndex
    }
  };
  await bucket.put(`${prefix}/.fs27/deployment-complete.json`, JSON.stringify(manifest, null, 2), {
    httpMetadata: { contentType: 'application/json; charset=utf-8' }
  });
  const existing = (await upsertDeploymentRecord(env, auth, request, {
    ...body,
    workspace_id: workspaceResult.workspace.workspace_id,
    project_id: projectId,
    deployment_id: deploymentId,
    asset_prefix: prefix
  })).deployment;
  const deployment = await upsertDeploymentRecord(env, auth, request, {
    workspace_id: workspaceResult.workspace.workspace_id,
    project_id: projectId,
    deployment_id: deploymentId,
    asset_prefix: prefix,
    files,
    file_count: files.length,
    total_bytes: existing.total_bytes || 0,
    status: 'complete',
    completed_at: manifest.completed_at
  });
  const receipt = await saveReceipt(env, auth, workspaceResult.workspace.workspace_id, 'skynet.deploy.complete', {
    project_id: projectId,
    deployment_id: deploymentId,
    asset_prefix: prefix,
    files: files.length,
    total_bytes: existing.total_bytes || 0
  });
  return httpJson(200, { ok: true, project_id: projectId, deployment_id: deploymentId, workspace_id: workspaceResult.workspace.workspace_id, asset_prefix: prefix, files: files.length, deployment: deployment.deployment, receipt }, cors);
}

async function handleRoute(request, env, cors) {
  const auth = await requireDeployAuth(request, cors);
  const kv = routeKv(env);
  if (!kv?.put) return httpJson(500, { error: 'ROUTING_KV is not configured', code: 'NO_ROUTING_KV' }, cors);
  const body = await readJson(request);
  const workspaceResult = await ensureWorkspace(env, auth, request, body);
  const record = routeRecordFromBody(body, auth, env, request);
  const key = routeKeyForRecord(record);
  await enforceRouteQuota(env, workspaceResult.workspace, auth, record, key);
  await kv.put(key, JSON.stringify(record, null, 2), {
    metadata: {
      schema: record.schema,
      project_id: record.project_id,
      deployment_id: record.active_deployment_id,
      mount_path: record.mount_path
    }
  });
  const liveUrl = liveUrlForRoute(record);
  const deployment = await upsertDeploymentRecord(env, auth, request, {
    ...body,
    workspace_id: workspaceResult.workspace.workspace_id,
    project_id: record.project_id,
    deployment_id: record.active_deployment_id,
    asset_prefix: record.asset_prefix,
    route_key: key,
    live_url: liveUrl,
    status: 'routed'
  });
  const receipt = await saveReceipt(env, auth, workspaceResult.workspace.workspace_id, 'skynet.deploy.route', {
    project_id: record.project_id,
    deployment_id: record.active_deployment_id,
    route_key: key,
    live_url: liveUrl,
    mount_path: record.mount_path,
    hostname: record.hostname,
    public_access: record.public_access
  });
  return httpJson(200, {
    ok: true,
    key,
    route: record,
    live_url: liveUrl,
    workspace: workspaceResult.workspace,
    deployment: deployment.deployment,
    receipt,
    url_model: skynetUrlModel(env, request, record.project_id)
  }, cors);
}

async function handleWorkspace(request, env, cors) {
  const auth = await requireDeployAuth(request, cors);
  const body = request.method === 'POST' ? await readJson(request) : Object.fromEntries(new URL(request.url).searchParams.entries());
  const result = await ensureWorkspace(env, auth, request, body);
  const usage = await deploymentUsage(env, result.workspace.customer_id, result.workspace.workspace_id);
  if (request.method === 'POST') {
    await saveReceipt(env, auth, result.workspace.workspace_id, result.created ? 'skynet.workspace.created' : 'skynet.workspace.updated', {
      workspace_id: result.workspace.workspace_id,
      plan_name: result.workspace.plan_name,
      created: result.created
    });
  }
  return httpJson(200, {
    ok: true,
    key: result.key,
    created: result.created,
    workspace: result.workspace,
    usage,
    url_model: skynetUrlModel(env, request, 'my-project')
  }, cors);
}

async function handleDashboard(request, env, cors) {
  const auth = await requireDeployAuth(request, cors);
  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const result = await ensureWorkspace(env, auth, request, params);
  const workspace = result.workspace;
  const principal = authPrincipal(auth);
  const usage = await deploymentUsage(env, workspace.customer_id, workspace.workspace_id);
  const deploymentRows = await kvListJson(receiptKv(env), deploymentPrefix(workspace.customer_id, workspace.workspace_id), 500);
  const deployments = deploymentRows
    .map((item) => item.value)
    .filter((item) => item?.schema === 'fs27.skynet.deployment.v1')
    .sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')))
    .slice(0, 100);
  const receiptRows = await kvListJson(receiptKv(env), receiptPrefix(workspace.customer_id, workspace.workspace_id), 100);
  const receipts = receiptRows
    .map((item) => item.value)
    .filter((item) => item?.schema === 'fs27.skynet.receipt.v1')
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
    .slice(0, 50);
  const listed = await listRouteRecords(routeKv(env), 'route:v1:', 500);
  const routes = (listed.routes || []).filter((item) => {
    const route = item.route || {};
    return String(route.customer_id || '') === String(workspace.customer_id)
      && (!route.workspace_id || String(route.workspace_id) === String(workspace.workspace_id));
  });
  return httpJson(200, {
    ok: true,
    service: 'fs27-skynet-dashboard',
    auth: {
      customer_id: principal.customer_id,
      role: principal.role,
      email: principal.email
    },
    workspace,
    usage,
    deployments,
    routes,
    receipts,
    links: {
      console: '/skyenet/index.html',
      api: '/api/skyenet',
      skyepay: 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skyepay.html?client=metraiyux-0s&offer=skyenet-edge-starter'
    }
  }, cors);
}

async function handleReceipts(request, env, cors) {
  const auth = await requireDeployAuth(request, cors);
  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const result = await ensureWorkspace(env, auth, request, params);
  const limit = Math.max(1, Math.min(200, Number(params.limit || 100)));
  const rows = await kvListJson(receiptKv(env), receiptPrefix(result.workspace.customer_id, result.workspace.workspace_id), limit);
  const receipts = rows
    .map((item) => item.value)
    .filter((item) => item?.schema === 'fs27.skynet.receipt.v1')
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  return httpJson(200, { ok: true, workspace: result.workspace, count: receipts.length, receipts }, cors);
}

async function handleRollback(request, env, cors) {
  const auth = await requireDeployAuth(request, cors);
  const body = await readJson(request);
  const workspaceResult = await ensureWorkspace(env, auth, request, body);
  const projectId = normalizeSlug(body.project_id || body.projectId, 'project', MAX_PROJECT);
  const deploymentId = normalizeSlug(body.deployment_id || body.deploymentId, '', MAX_DEPLOYMENT);
  if (!deploymentId) return httpJson(400, { error: 'deployment_id is required', code: 'MISSING_DEPLOYMENT_ID' }, cors);
  const record = routeRecordFromBody({ ...body, project_id: projectId, deployment_id: deploymentId }, auth, env, request);
  const key = body.route_key || body.routeKey || routeKeyForRecord(record);
  const kv = routeKv(env);
  const existing = await kvGetJson(kv, key, null);
  if (!existing) return httpJson(404, { error: 'Route record not found', code: 'ROUTE_NOT_FOUND' }, cors);
  if (String(existing.customer_id || '') !== String(workspaceResult.workspace.customer_id)) {
    return httpJson(403, { error: 'Route belongs to a different customer', code: 'ROUTE_CUSTOMER_MISMATCH' }, cors);
  }
  const next = {
    ...existing,
    active_deployment_id: deploymentId,
    asset_prefix: assetPrefix(projectId, deploymentId, body.asset_prefix || body.assetPrefix || ''),
    updated_at: new Date().toISOString()
  };
  await kvPutJson(kv, key, next, {
    schema: next.schema,
    project_id: next.project_id,
    deployment_id: next.active_deployment_id,
    mount_path: next.mount_path
  });
  const liveUrl = liveUrlForRoute(next);
  await upsertDeploymentRecord(env, auth, request, {
    workspace_id: workspaceResult.workspace.workspace_id,
    project_id: projectId,
    deployment_id: deploymentId,
    asset_prefix: next.asset_prefix,
    route_key: key,
    live_url: liveUrl,
    status: 'rollback-active'
  });
  const receipt = await saveReceipt(env, auth, workspaceResult.workspace.workspace_id, 'skynet.deploy.rollback', {
    project_id: projectId,
    deployment_id: deploymentId,
    route_key: key,
    live_url: liveUrl
  });
  return httpJson(200, { ok: true, key, route: next, live_url: liveUrl, receipt }, cors);
}

async function handleStatus(request, env, cors) {
  const auth = await requireDeployAuth(request, cors);
  const url = new URL(request.url);
  const bucket = deploymentBucket(env);
  const kv = routeKv(env);
  const workspaceResult = await ensureWorkspace(env, auth, request, Object.fromEntries(url.searchParams.entries()));
  const usage = await deploymentUsage(env, workspaceResult.workspace.customer_id, workspaceResult.workspace.workspace_id);
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
      runtime_rollup_db: Boolean(env.RUNTIME_ROLLUP_DB?.prepare || env.FS27_RUNTIME_ROLLUP_DB?.prepare),
      workspace_registry: Boolean(workspaceKv(env)?.put),
      deploy_receipts: Boolean(receiptKv(env)?.put)
    },
    endpoints: [
      'POST /deploy/init',
      'PUT /deploy/upload',
      'POST /deploy/complete',
      'POST /deploy/route',
      'GET /deploy/status',
      'GET /deploy/routes',
      'GET/POST /deploy/workspace',
      'GET /deploy/dashboard',
      'GET /deploy/receipts',
      'POST /deploy/rollback',
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
      self_service_workspace: true,
      browser_drag_folder_drop: true,
      drop_root_folder_stripping: true,
      drop_build_root_auto_promotion: true,
      static_deploy_root_index_required: true,
      asset_missing_route_diagnostic: true,
      direct_live_link_after_publish: true,
      in_console_publish_tutorial: true,
      drop_private_source_path_filter: true,
      skrucible_forge_static_surface_pass: true,
      deploy_receipts: true,
      customer_dashboard: true,
      quota_enforcement: true,
      rollback_route_switch: true,
      owned_skyenet_functions_runtime_v1: true,
      functions_enabled_default: false,
      managed_functions_paid_or_owner_approved_only: true,
      managed_functions_enabled_for_workspace: Boolean(workspaceResult.workspace?.caps?.managed_functions_enabled),
      function_bundle_manifest_required: true,
      function_bundle_signature_required: true,
      raw_customer_secrets_exposed_to_runtime: false,
      function_runtime_env_isolation: true,
      function_runtime_timeout_caps: true,
      function_runtime_memory_caps: true,
      function_runtime_body_caps: true,
      function_runtime_egress_default_deny: true,
      function_invocation_receipts_required: true,
      workspace_abuse_kill_switch: true,
      billing_guard_before_scale: true,
      netlify_handler_event_parity: true,
      arbitrary_uploaded_serverless_functions: false,
      function_boundary: 'SkyeNet Edge is live for static deployments, route registration, fallback-origin proxying, managed SkyeNet function lanes, Netlify-compatible bundle intake, and signed controlled runtime v1 execution for trusted or owner-approved bundles. Unlimited hostile customer-uploaded function execution requires the SkyeNet isolated runtime lane before it should be sold as unrestricted Netlify Functions parity.'
    },
    workspace: workspaceResult.workspace,
    usage,
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
  const auth = await requireDeployAuth(request, cors);
  const kv = routeKv(env);
  if (!kv?.list) return httpJson(501, { ok: false, error: 'ROUTING_KV list is not configured', code: 'NO_ROUTE_LIST' }, cors);
  const url = new URL(request.url);
  const principal = authPrincipal(auth);
  const workspaceId = workspaceIdFromInput(Object.fromEntries(url.searchParams.entries()), principal);
  const host = cleanText(url.searchParams.get('host') || '', 260).toLowerCase();
  const projectId = normalizeSlug(url.searchParams.get('projectId') || url.searchParams.get('project_id'), '', MAX_PROJECT);
  const limit = Math.max(1, Math.min(500, Number(url.searchParams.get('limit') || 100)));
  const prefix = host
    ? `route:v1:host:${host}`
    : projectId
      ? 'route:v1:'
      : cleanText(url.searchParams.get('prefix') || 'route:v1:', 500);
  const listed = await listRouteRecords(kv, prefix, limit);
  const scoped = (listed.routes || []).filter((item) => {
    const route = item.route || {};
    if (String(route.customer_id || '') !== String(principal.customer_id)) return false;
    if (route.workspace_id && String(route.workspace_id) !== String(workspaceId)) return false;
    return true;
  });
  const routes = projectId
    ? scoped.filter((item) => normalizeSlug(item.route?.project_id || item.route?.projectId || '', '', MAX_PROJECT) === projectId)
    : scoped;
  return httpJson(200, { ok: true, prefix, workspace_id: workspaceId, count: routes.length, routes, cursor: listed.cursor || null, list_complete: listed.list_complete !== false }, cors);
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
    if (url.pathname === '/deploy/workspace' && ['GET', 'POST'].includes(request.method)) return await handleWorkspace(request, env, cors);
    if (url.pathname === '/deploy/dashboard' && request.method === 'GET') return await handleDashboard(request, env, cors);
    if (url.pathname === '/deploy/receipts' && request.method === 'GET') return await handleReceipts(request, env, cors);
    if (url.pathname === '/deploy/rollback' && request.method === 'POST') return await handleRollback(request, env, cors);
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
