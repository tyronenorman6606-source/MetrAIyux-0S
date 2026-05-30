import { requireGateAuth, gateAuthErrorResponse } from '../netlify/functions/_lib/authz.js';
import { buildCors, json as httpJson } from '../netlify/functions/_lib/http.js';
import { executeZeroOsAutomationAction } from '../../../../cloudflare/zero-os-automation-spine.mjs';

const MAX_PROJECT = 160;
const MAX_DEPLOYMENT = 180;
const MAX_PATH = 700;
const MAX_SOURCE_DOWNLOAD_FILES = 5000;
const MAX_SOURCE_PACKAGE_FILES = 20000;
const MAX_SOURCE_INDEX_FILES = 500000;
const MAX_SOURCE_QUERY_LIMIT = 5000;
const MAX_SOURCE_SEARCH_RESULTS = 250;
const MAX_SOURCE_FILE_JSON_BYTES = 2 * 1024 * 1024;
const MAX_SOURCE_TRANSFER_ARCHIVE_BYTES = 512 * 1024 * 1024;
const DEFAULT_PLAN = 'free99';
const SOURCE_TRANSFER_METHODS = {
  download: {
    id: 'download',
    label: 'Direct gated download',
    status: 'ready',
    description: 'Returns the existing account-scoped tar recovery URL.'
  },
  'instant-download-link': {
    id: 'instant-download-link',
    label: 'Instant gated download link',
    status: 'ready_gated',
    description: 'Returns a gate-session-scoped source link without minting a public URL.'
  },
  skyedrive: {
    id: 'skyedrive',
    label: 'Send to SkyeDrive',
    status: 'storage_ready',
    description: 'Stores the source archive in the owner SkyeDrive transfer lane.'
  },
  skyevault: {
    id: 'skyevault',
    label: 'Send to SkyeVault',
    status: 'storage_ready',
    description: 'Stores the source archive in the owner SkyeVault custody lane.'
  },
  'secure-skye-pack': {
    id: 'secure-skye-pack',
    label: 'Secure .skye pack',
    status: 'storage_ready',
    description: 'Creates and stores an encrypted SkyeSecure v2 source pack using the canonical .skye extension.'
  }
};

const PLAN_CAPS = {
  free99: {
    label: 'Free99 capped workspace',
    max_static_bundle_bytes: 25 * 1024 * 1024,
    max_source_package_bytes: 50 * 1024 * 1024,
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
    max_source_package_bytes: 75 * 1024 * 1024,
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
    max_source_package_bytes: 300 * 1024 * 1024,
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
    max_source_package_bytes: 500 * 1024 * 1024,
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
    max_source_package_bytes: 1024 * 1024 * 1024,
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
  max_source_package_bytes: 2 * 1024 * 1024 * 1024,
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

function sourceTransferBucket(env) {
  return env.SKYENET_SOURCE_TRANSFER_BUCKET
    || env.SKYEDRIVE_BUCKET
    || env.SKYEVAULT_BUCKET
    || env.SKYENET_DRIVE_BUCKET
    || env.SKYENET_VAULT_BUCKET
    || deploymentBucket(env);
}

function sourceTransferBucketBinding(env) {
  if (env.SKYENET_SOURCE_TRANSFER_BUCKET) return 'SKYENET_SOURCE_TRANSFER_BUCKET';
  if (env.SKYEDRIVE_BUCKET) return 'SKYEDRIVE_BUCKET';
  if (env.SKYEVAULT_BUCKET) return 'SKYEVAULT_BUCKET';
  if (env.SKYENET_DRIVE_BUCKET) return 'SKYENET_DRIVE_BUCKET';
  if (env.SKYENET_VAULT_BUCKET) return 'SKYENET_VAULT_BUCKET';
  return deploymentBucket(env) ? 'DEPLOYMENT_ASSET_BUCKET' : '';
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

function sourceDownloadPath(workspaceId, projectId, deploymentId) {
  const params = new URLSearchParams({
    workspace_id: workspaceId,
    project_id: projectId,
    deployment_id: deploymentId
  });
  return `/api/skyenet/source-download?${params.toString()}`;
}

function sourceManifestPath(workspaceId, projectId, deploymentId) {
  const params = new URLSearchParams({
    workspace_id: workspaceId,
    project_id: projectId,
    deployment_id: deploymentId
  });
  return `/api/skyenet/source-manifest?${params.toString()}`;
}

function sourceTreePath(workspaceId, projectId, deploymentId) {
  const params = new URLSearchParams({
    workspace_id: workspaceId,
    project_id: projectId,
    deployment_id: deploymentId
  });
  return `/api/skyenet/source-tree?${params.toString()}`;
}

function sourceSearchPath(workspaceId, projectId, deploymentId) {
  const params = new URLSearchParams({
    workspace_id: workspaceId,
    project_id: projectId,
    deployment_id: deploymentId
  });
  return `/api/skyenet/source-search?${params.toString()}`;
}

function sourceTransferPath() {
  return '/api/skyenet/source-transfer';
}

function sourcePackagePrefix(principal, workspaceId, projectId, deploymentId, explicit = '') {
  const cleanExplicit = cleanText(explicit || '', MAX_PATH).replace(/^\/+|\/+$/g, '');
  if (cleanExplicit) return cleanExplicit;
  return [
    'source-packages',
    `customer-${cleanText(principal?.customer_id || '0', 160)}`,
    `workspace-${workspaceId}`,
    `project-${projectId}`,
    `deployment-${deploymentId}`
  ].join('/');
}

function sourceManifestKeyForPackage(sourcePackage = {}) {
  const explicit = cleanText(sourcePackage.manifest_key || sourcePackage.manifestKey || '', MAX_PATH * 2).replace(/^\/+/, '');
  if (explicit) return explicit;
  const prefix = cleanText(sourcePackage.prefix || '', MAX_PATH).replace(/^\/+|\/+$/g, '');
  return prefix ? `${prefix}/.skyenet/source-package.json` : '';
}

function sourceIndexKeyForPackage(sourcePackage = {}) {
  const explicit = cleanText(sourcePackage.index_key || sourcePackage.indexKey || '', MAX_PATH * 2).replace(/^\/+/, '');
  if (explicit) return explicit;
  const prefix = cleanText(sourcePackage.prefix || '', MAX_PATH).replace(/^\/+|\/+$/g, '');
  return prefix ? `${prefix}/.skyenet/source-index.jsonl` : '';
}

function sourcePackageHasFiles(sourcePackage = {}) {
  return Boolean(
    sourcePackage
    && typeof sourcePackage === 'object'
    && (
      Number(sourcePackage.file_count || sourcePackage.fileCount || 0) > 0
      || (Array.isArray(sourcePackage.files) && sourcePackage.files.length > 0)
      || sourceManifestKeyForPackage(sourcePackage)
      || sourceIndexKeyForPackage(sourcePackage)
    )
  );
}

function sourceFileRecord(value) {
  if (typeof value === 'string') return { path: normalizeSourcePath(value) };
  if (value && typeof value === 'object') {
    const sourcePath = normalizeSourcePath(value.path || value.name || value.source_path || value.sourcePath || '');
    return {
      path: sourcePath,
      size: Number(value.size ?? value.bytes ?? 0) || 0,
      sha256: cleanText(value.sha256 || value.hash || '', 160),
      content_type: cleanText(value.content_type || value.contentType || '', 160)
    };
  }
  return null;
}

function sourcePathFromRecord(value) {
  if (typeof value === 'string') return normalizeSourcePath(value);
  if (value && typeof value === 'object') return normalizeSourcePath(value.path || value.name || value.source_path || value.sourcePath || '');
  return '';
}

function dedupeSourceFiles(files = []) {
  const seen = new Set();
  const out = [];
  for (const item of files) {
    const record = sourceFileRecord(item);
    if (!record || seen.has(record.path)) continue;
    seen.add(record.path);
    out.push(record);
  }
  return out;
}

function sourceRecordListForResponse(records = []) {
  return records.map((record) => {
    const item = sourceFileRecord(record);
    return item && (item.size || item.sha256 || item.content_type)
      ? item
      : item?.path || sourcePathFromRecord(record);
  }).filter(Boolean);
}

function sourceTextFileLikely(pathname = '', contentType = '') {
  const type = String(contentType || '').toLowerCase();
  const path = String(pathname || '').toLowerCase();
  return type.startsWith('text/')
    || /json|javascript|typescript|xml|svg|yaml|toml|markdown|x-sh|shellscript/.test(type)
    || /\.(txt|md|markdown|json|js|mjs|cjs|ts|tsx|jsx|css|html|htm|svg|xml|yml|yaml|toml|ini|env|sh|bash|zsh|fish|py|rb|go|rs|java|c|cc|cpp|h|hpp|cs|php|sql|mjs|vue|svelte)$/i.test(path);
}

function sourcePackageSummary(sourcePackage = null) {
  if (!sourcePackage) return null;
  return {
    mode: sourcePackage.mode || 'private-full-project',
    prefix: sourcePackage.prefix || '',
    file_count: Number(sourcePackage.file_count || 0),
    total_bytes: Number(sourcePackage.total_bytes || 0),
    downloadable: sourcePackage.downloadable !== false,
    manifest_key: sourcePackage.manifest_key || sourceManifestKeyForPackage(sourcePackage),
    index_key: sourcePackage.index_key || sourceIndexKeyForPackage(sourcePackage),
    index_file_count: Number(sourcePackage.index_file_count || sourcePackage.file_count || 0),
    files_inline: Array.isArray(sourcePackage.files) ? sourcePackage.files.length : 0,
    files_truncated: Boolean(sourcePackage.files_truncated),
    public_asset_exposure: sourcePackage.public_asset_exposure === false ? false : 'public_assets_only',
    completed_at: sourcePackage.completed_at || '',
    updated_at: sourcePackage.updated_at || ''
  };
}

function storageSegment(value, fallback = 'item') {
  return normalizeSlug(value || fallback, fallback, 180);
}

function sourceTransferStorageLane(method) {
  if (method === 'skyedrive') return 'skyedrive/source-transfers';
  if (method === 'skyevault') return 'skyevault/source-transfers';
  if (method === 'secure-skye-pack') return 'skyevault/secure-skye-packs';
  return 'skyenet/source-transfers';
}

function sourceTransferStoragePrefix(method, principal, workspaceId, projectId, deploymentId, transferId) {
  return [
    sourceTransferStorageLane(method),
    `customer-${storageSegment(principal?.customer_id || '0', '0')}`,
    `workspace-${storageSegment(workspaceId, 'default-workspace')}`,
    `project-${storageSegment(projectId, 'project')}`,
    `deployment-${storageSegment(deploymentId, 'deployment')}`,
    storageSegment(transferId, 'transfer')
  ].join('/');
}

function envVarPrefix(customerId, workspaceId, projectId) {
  return `skynet:env:v1:customer:${customerId}:workspace:${workspaceId}:project:${projectId}:`;
}

function envVarKey(customerId, workspaceId, projectId, key) {
  return `${envVarPrefix(customerId, workspaceId, projectId)}key:${key}`;
}

function normalizeEnvKey(value) {
  const key = cleanText(value || '', 120).trim().replace(/[^A-Za-z0-9_]/g, '_').replace(/^_+|_+$/g, '').toUpperCase();
  if (!key || !/^[A-Z_][A-Z0-9_]{0,119}$/.test(key)) {
    const error = new Error('Environment variable key must use letters, numbers, and underscores, and cannot start with a number.');
    error.status = 400;
    error.code = 'BAD_ENV_KEY';
    throw error;
  }
  return key;
}

async function sha256Hex(bytes) {
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hashBuffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function concatBytes(chunks) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

function bytesToBase64(bytes) {
  if (typeof globalThis.btoa !== 'function' && typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  const chunkSize = 0x8000;
  let binary = '';
  for (let offset = 0; offset < bytes.byteLength; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return globalThis.btoa(binary);
}

function randomBytes(length) {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

function envPreview(value) {
  const text = String(value ?? '');
  if (!text) return '';
  if (text.length <= 4) return '****';
  return `****${text.slice(-4)}`;
}

function normalizeSourceTransferMethod(value) {
  const raw = normalizeSlug(value || 'download', 'download', 80).replace(/_/g, '-');
  const aliases = {
    link: 'instant-download-link',
    instant: 'instant-download-link',
    'instant-link': 'instant-download-link',
    'instant-download': 'instant-download-link',
    drive: 'skyedrive',
    vault: 'skyevault',
    skye: 'secure-skye-pack',
    '.skye': 'secure-skye-pack',
    skyepack: 'secure-skye-pack',
    'skye-pack': 'secure-skye-pack',
    secure: 'secure-skye-pack',
    securepack: 'secure-skye-pack',
    'secure-pack': 'secure-skye-pack'
  };
  return SOURCE_TRANSFER_METHODS[raw] ? raw : (aliases[raw] || 'download');
}

function sourceTransferMethodsForResponse() {
  return Object.values(SOURCE_TRANSFER_METHODS).map((method) => ({ ...method }));
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
    current_release_default: 'platform_native_host',
    platform_native_host_pattern: `https://skyenet.<company-slug>/`,
    shared_origin_path_pattern: `https://${defaultHost}/${projectId}/`,
    legacy_zero_os_path_pattern: `https://<0s-origin>/skyenet/${projectId}/`,
    branded_subdomain_pattern: root ? `https://skyenet.${root}` : 'https://skyenet.<company-slug>',
    url_modes: [
      {
        id: 'path',
        label: 'SkyeNet shared-origin path route',
        status: 'infrastructure_fallback_or_staging',
        example: `https://${defaultHost}/${projectId}/`,
        required_fields: ['project_id', 'deployment_id'],
        optional_fields: ['hostname', 'mount_path']
      },
      {
        id: 'subdomain',
        label: 'SkyeNet platform-native host',
        status: 'canonical_for_public_company_surfaces',
        example: 'https://skyenet.<company-slug>/',
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

function normalizeSourcePath(value) {
  const raw = cleanText(value || '', MAX_PATH).replace(/\\/g, '/').replace(/^\/+/, '');
  const parts = raw.split('/').filter(Boolean);
  if (!parts.length) {
    const error = new Error('Missing source path');
    error.status = 400;
    error.code = 'MISSING_SOURCE_PATH';
    throw error;
  }
  if (parts.some((part) => part === '..' || part === '.')) {
    const error = new Error('Invalid source path');
    error.status = 400;
    error.code = 'BAD_SOURCE_PATH';
    throw error;
  }
  const normalized = parts.join('/');
  if (/(^|\/)(\.git|node_modules|\.wrangler|\.next\/cache|dist\/cache|tmp|temp)(\/|$)/i.test(normalized)
    || /(^|\/)\.env(\.|$|\/)/i.test(normalized)
    || /(^|\/)(id_rsa|id_dsa|id_ecdsa|id_ed25519|\.npmrc|\.pypirc|\.netrc)(\/|$)/i.test(normalized)
    || /\.(pem|key|p12|pfx|crt|sqlite|sqlite3|db)$/i.test(normalized)) {
    const error = new Error('Refusing to upload sensitive or generated source path');
    error.status = 400;
    error.code = 'PRIVATE_SOURCE_PATH_BLOCKED';
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

function safeDownloadName(...parts) {
  const name = parts
    .map((part) => cleanText(part, 180))
    .filter(Boolean)
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return name || 'skyenet-source';
}

function encodeUtf8(value) {
  return new TextEncoder().encode(String(value ?? ''));
}

function tarNumber(value, width) {
  const text = Math.max(0, Number(value || 0)).toString(8);
  return `${text.padStart(width - 1, '0')}\0`;
}

function tarString(target, offset, length, value) {
  const bytes = encodeUtf8(value).slice(0, length);
  target.set(bytes, offset);
}

function splitTarPath(name) {
  const clean = String(name || 'file').replace(/^\/+/, '') || 'file';
  if (encodeUtf8(clean).length <= 100) return { name: clean, prefix: '' };
  const parts = clean.split('/');
  for (let index = 1; index < parts.length; index += 1) {
    const prefix = parts.slice(0, index).join('/');
    const tail = parts.slice(index).join('/');
    if (encodeUtf8(prefix).length <= 155 && encodeUtf8(tail).length <= 100) return { name: tail, prefix };
  }
  return { name: clean.split('/').pop().slice(-100) || 'file', prefix: '' };
}

function paxRecord(key, value) {
  const payload = `${key}=${value}\n`;
  let length = encodeUtf8(`${payload.length} ${payload}`).length;
  while (true) {
    const record = `${length} ${payload}`;
    const actual = encodeUtf8(record).length;
    if (actual === length) return record;
    length = actual;
  }
}

function tarHeader(name, size = 0, options = {}) {
  const header = new Uint8Array(512);
  const pathParts = splitTarPath(name);
  tarString(header, 0, 100, pathParts.name);
  tarString(header, 100, 8, tarNumber(options.mode || 0o644, 8));
  tarString(header, 108, 8, tarNumber(options.uid || 0, 8));
  tarString(header, 116, 8, tarNumber(options.gid || 0, 8));
  tarString(header, 124, 12, tarNumber(size, 12));
  tarString(header, 136, 12, tarNumber(options.mtime || Math.floor(Date.now() / 1000), 12));
  for (let index = 148; index < 156; index += 1) header[index] = 32;
  tarString(header, 156, 1, options.typeflag || '0');
  tarString(header, 257, 6, 'ustar');
  tarString(header, 263, 2, '00');
  tarString(header, 265, 32, 'skyenet');
  tarString(header, 297, 32, 'skyenet');
  if (pathParts.prefix) tarString(header, 345, 155, pathParts.prefix);
  let checksum = 0;
  for (const byte of header) checksum += byte;
  tarString(header, 148, 8, `${checksum.toString(8).padStart(6, '0')}\0 `);
  return header;
}

function tarPadding(size) {
  const remainder = size % 512;
  return remainder ? new Uint8Array(512 - remainder) : null;
}

function tarPaxEntriesIfNeeded(name) {
  const clean = String(name || '').replace(/^\/+/, '');
  const pathParts = splitTarPath(clean);
  const needsPath = encodeUtf8(clean).length > 100 && (!pathParts.prefix || encodeUtf8(clean).length > 255);
  if (!needsPath) return null;
  const body = encodeUtf8(paxRecord('path', clean));
  const base = clean.split('/').pop() || 'file';
  return {
    header: tarHeader(`PaxHeaders.X/${base}`.slice(0, 100), body.length, { typeflag: 'x' }),
    body,
    padding: tarPadding(body.length)
  };
}

function sanitizeEnvRecord(record) {
  return {
    schema: 'fs27.skynet.env_var.v1',
    key: record.key,
    project_id: record.project_id,
    workspace_id: record.workspace_id,
    scope: record.scope || 'production',
    secret: record.secret !== false,
    has_value: Boolean(record.value),
    value_preview: record.value_preview || envPreview(record.value || ''),
    value_sha256: record.value_sha256 || '',
    created_at: record.created_at || '',
    updated_at: record.updated_at || ''
  };
}

async function readObjectBytes(object) {
  if (!object) return new Uint8Array();
  if (typeof object.arrayBuffer === 'function') return new Uint8Array(await object.arrayBuffer());
  if (typeof object.text === 'function') return encodeUtf8(await object.text());
  if (object.body) return new Uint8Array(await new Response(object.body).arrayBuffer());
  return new Uint8Array();
}

function sourceArchiveError(status, code, message, extra = {}) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  error.extra = extra;
  return error;
}

async function buildSourceArchiveBytes(env, principal, workspaceId, projectId, deploymentId, deployment) {
  const bucket = deploymentBucket(env);
  if (!bucket?.get) throw sourceArchiveError(500, 'NO_DEPLOYMENT_BUCKET_READ', 'DEPLOYMENT_ASSET_BUCKET read is not configured');
  const privatePackage = deployment.source_package && Array.isArray(deployment.source_package.files) && deployment.source_package.files.length
    ? deployment.source_package
    : null;
  const files = privatePackage
    ? privatePackage.files.map((file) => normalizeSourcePath(file)).slice(0, MAX_SOURCE_DOWNLOAD_FILES)
    : Array.isArray(deployment.files)
      ? deployment.files.map((file) => normalizeAssetPath(file)).slice(0, MAX_SOURCE_DOWNLOAD_FILES)
      : [];
  if (!files.length) throw sourceArchiveError(409, 'DEPLOYMENT_SOURCE_EMPTY', 'Deployment has no recorded files to transfer');
  const totalRecordedFiles = privatePackage ? privatePackage.files.length : (Array.isArray(deployment.files) ? deployment.files.length : 0);
  if (totalRecordedFiles > MAX_SOURCE_DOWNLOAD_FILES) {
    throw sourceArchiveError(
      413,
      'SOURCE_DOWNLOAD_FILE_LIMIT',
      `Deployment source bundle has ${totalRecordedFiles} files; max transferable files per request is ${MAX_SOURCE_DOWNLOAD_FILES}.`,
      { file_count: totalRecordedFiles, limit: MAX_SOURCE_DOWNLOAD_FILES }
    );
  }
  const prefix = cleanText(
    privatePackage?.prefix || deployment.asset_prefix || assetPrefix(projectId, deploymentId),
    MAX_PATH
  ).replace(/^\/+|\/+$/g, '');
  const objects = [];
  const missing = [];
  let totalBytes = 0;
  for (const file of files) {
    const objectKey = `${prefix}/${file}`.replace(/\/+/g, '/');
    const meta = bucket.head ? await bucket.head(objectKey).catch(() => null) : null;
    let object = null;
    if (!meta) object = await bucket.get(objectKey).catch(() => null);
    const size = Number(meta?.size ?? object?.size ?? 0);
    if (!meta && !object) {
      missing.push(file);
      continue;
    }
    totalBytes += size;
    objects.push({ file, key: objectKey, size, object });
  }
  if (missing.length) {
    throw sourceArchiveError(
      409,
      'SOURCE_DOWNLOAD_INCOMPLETE',
      'Deployment source bundle is incomplete; one or more recorded files are missing from the SkyeNet vault.',
      { missing }
    );
  }
  if (totalBytes > MAX_SOURCE_TRANSFER_ARCHIVE_BYTES) {
    throw sourceArchiveError(
      413,
      'SOURCE_TRANSFER_ARCHIVE_LIMIT',
      `Deployment source archive is larger than the synchronous SkyeNet transfer limit of ${bytesLabel(MAX_SOURCE_TRANSFER_ARCHIVE_BYTES)}.`,
      { bytes: totalBytes, limit: MAX_SOURCE_TRANSFER_ARCHIVE_BYTES }
    );
  }
  const manifest = {
    schema: 'fs27.skynet.source_download_manifest.v1',
    generated_at: new Date().toISOString(),
    account: {
      customer_id: principal.customer_id,
      workspace_id: workspaceId,
      email: principal.email || '',
      role: principal.role || ''
    },
    deployment: {
      project_id: projectId,
      deployment_id: deploymentId,
      status: deployment.status || '',
      live_url: deployment.live_url || '',
      route_key: deployment.route_key || '',
      asset_prefix: prefix,
      source_mode: privatePackage ? 'private-full-project' : 'public-deployment-files',
      source_package: privatePackage ? {
        mode: privatePackage.mode || 'private-full-project',
        file_count: privatePackage.file_count || files.length,
        total_bytes: privatePackage.total_bytes || totalBytes,
        public_asset_exposure: false,
        completed_at: privatePackage.completed_at || ''
      } : null,
      file_count: files.length,
      total_bytes: totalBytes
    },
    files
  };
  const chunks = [];
  const addEntry = (name, bodyBytes, typeflag = '0') => {
    const pax = tarPaxEntriesIfNeeded(name);
    if (pax) {
      chunks.push(pax.header, pax.body);
      if (pax.padding) chunks.push(pax.padding);
    }
    chunks.push(tarHeader(name, bodyBytes.length, { typeflag }), bodyBytes);
    const padding = tarPadding(bodyBytes.length);
    if (padding) chunks.push(padding);
  };
  addEntry('.skyenet/source-manifest.json', encodeUtf8(JSON.stringify(manifest, null, 2)));
  for (const item of objects) {
    const object = item.object || await bucket.get(item.key);
    const bodyBytes = await readObjectBytes(object);
    addEntry(item.file, bodyBytes);
  }
  chunks.push(new Uint8Array(1024));
  const bytes = concatBytes(chunks);
  const sha256 = await sha256Hex(bytes);
  return {
    bytes,
    sha256,
    manifest,
    files,
    total_bytes: totalBytes,
    download_name: `${safeDownloadName(projectId, deploymentId, 'source')}.tar`,
    source_mode: privatePackage ? 'private-full-project' : 'public-deployment-files'
  };
}

async function buildSecureSkyePack(archive, context) {
  const iv = randomBytes(12);
  const rawKey = randomBytes(32);
  const imported = await globalThis.crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM' }, false, ['encrypt']);
  const aadText = `SKYESEC2|skyenet-source-transfer|${context.transfer_id}`;
  const encrypted = new Uint8Array(await globalThis.crypto.subtle.encrypt({
    name: 'AES-GCM',
    iv,
    additionalData: encodeUtf8(aadText)
  }, imported, archive.bytes));
  const encryptedSha256 = await sha256Hex(encrypted);
  const pack = {
    schema: 'skye.secure.source_pack.v2',
    marker: 'SKYESEC2',
    format: 'skye-secure-secret-pack-v2',
    encrypted: true,
    algorithm: 'AES-256-GCM',
    created_at: new Date().toISOString(),
    custody: {
      transfer_id: context.transfer_id,
      customer_id: context.principal.customer_id,
      workspace_id: context.workspace_id,
      project_id: context.project_id,
      deployment_id: context.deployment_id,
      account_scoped: true,
      plaintext_source_exposed_to_storage: false,
      key_custody: 'owner-admin-private-skye-key-record'
    },
    source_archive: {
      filename: archive.download_name,
      bytes: archive.bytes.byteLength,
      sha256: archive.sha256,
      source_mode: archive.source_mode
    },
    encryption: {
      iv: bytesToBase64(iv),
      aad: aadText,
      ciphertext_sha256: encryptedSha256,
      ciphertext_bytes: encrypted.byteLength
    },
    manifest: archive.manifest,
    payload_base64: bytesToBase64(encrypted)
  };
  const packBytes = encodeUtf8(JSON.stringify(pack, null, 2));
  const keyCustody = {
    schema: 'skye.secure.source_pack.key_custody.v1',
    marker: 'SKYESEC2_KEY_CUSTODY',
    transfer_id: context.transfer_id,
    created_at: pack.created_at,
    customer_id: context.principal.customer_id,
    workspace_id: context.workspace_id,
    project_id: context.project_id,
    deployment_id: context.deployment_id,
    algorithm: 'AES-256-GCM',
    key_base64: bytesToBase64(rawKey),
    iv: pack.encryption.iv,
    aad: aadText,
    ciphertext_sha256: encryptedSha256,
    archive_sha256: archive.sha256,
    access_policy: 'shared-gate-owner-admin-only',
    public_response_exposes_key: false
  };
  return {
    bytes: packBytes,
    key_custody: keyCustody,
    pack_sha256: await sha256Hex(packBytes),
    encrypted_sha256: encryptedSha256
  };
}

async function storeSourceTransferArtifact(env, method, archive, context) {
  const bucket = sourceTransferBucket(env);
  if (!bucket?.put) {
    throw sourceArchiveError(500, 'NO_SOURCE_TRANSFER_BUCKET', 'SkyeNet source transfer storage is not configured.');
  }
  const prefix = sourceTransferStoragePrefix(
    method,
    context.principal,
    context.workspace_id,
    context.project_id,
    context.deployment_id,
    context.transfer_id
  );
  const bucketBinding = sourceTransferBucketBinding(env);
  const baseMetadata = {
    schema: 'fs27.skynet.source_transfer.artifact.v1',
    transfer_id: context.transfer_id,
    method,
    customer_id: context.principal.customer_id,
    workspace_id: context.workspace_id,
    project_id: context.project_id,
    deployment_id: context.deployment_id,
    source_archive_sha256: archive.sha256,
    source_mode: archive.source_mode
  };
  if (method === 'secure-skye-pack') {
    const pack = await buildSecureSkyePack(archive, context);
    const filename = `${safeDownloadName(context.project_id, context.deployment_id, 'source')}.skye`;
    const objectKey = `${prefix}/${filename}`;
    const manifestKey = `${prefix}/manifest.json`;
    const keyCustodyKey = `${prefix}/.private/key-custody.json`;
    await bucket.put(objectKey, pack.bytes, {
      httpMetadata: { contentType: 'application/vnd.skye.secure-pack+json; charset=utf-8' },
      customMetadata: {
        ...baseMetadata,
        content_kind: 'secure-skye-pack',
        pack_sha256: pack.pack_sha256,
        encrypted_sha256: pack.encrypted_sha256,
        plaintext_source_exposed_to_storage: 'false'
      }
    });
    const manifest = {
      schema: 'fs27.skynet.source_transfer.storage_manifest.v1',
      transfer_id: context.transfer_id,
      method,
      status: 'completed',
      bucket_binding: bucketBinding,
      object_key: objectKey,
      key_custody_key: keyCustodyKey,
      filename,
      content_type: 'application/vnd.skye.secure-pack+json; charset=utf-8',
      bytes: pack.bytes.byteLength,
      sha256: pack.pack_sha256,
      encrypted_payload_sha256: pack.encrypted_sha256,
      source_archive_sha256: archive.sha256,
      source_archive_bytes: archive.bytes.byteLength,
      created_at: new Date().toISOString(),
      plaintext_source_exposed_to_storage: false
    };
    await bucket.put(manifestKey, JSON.stringify(manifest, null, 2), {
      httpMetadata: { contentType: 'application/json; charset=utf-8' },
      customMetadata: { ...baseMetadata, content_kind: 'transfer-manifest' }
    });
    await bucket.put(keyCustodyKey, JSON.stringify(pack.key_custody, null, 2), {
      httpMetadata: { contentType: 'application/json; charset=utf-8' },
      customMetadata: {
        ...baseMetadata,
        content_kind: 'secure-skye-key-custody',
        public_response_exposes_key: 'false'
      }
    });
    return {
      stored: true,
      method,
      bucket_binding: bucketBinding,
      key: objectKey,
      manifest_key: manifestKey,
      key_custody_key: keyCustodyKey,
      filename,
      content_type: manifest.content_type,
      bytes: pack.bytes.byteLength,
      sha256: pack.pack_sha256,
      source_archive_bytes: archive.bytes.byteLength,
      source_archive_sha256: archive.sha256,
      plaintext_source_exposed_to_storage: false
    };
  }

  const filename = `${safeDownloadName(context.project_id, context.deployment_id, method, 'source')}.tar`;
  const objectKey = `${prefix}/${filename}`;
  const manifestKey = `${prefix}/manifest.json`;
  await bucket.put(objectKey, archive.bytes, {
    httpMetadata: { contentType: 'application/x-tar' },
    customMetadata: {
      ...baseMetadata,
      content_kind: 'source-archive',
      sha256: archive.sha256
    }
  });
  const manifest = {
    schema: 'fs27.skynet.source_transfer.storage_manifest.v1',
    transfer_id: context.transfer_id,
    method,
    status: 'completed',
    bucket_binding: bucketBinding,
    object_key: objectKey,
    filename,
    content_type: 'application/x-tar',
    bytes: archive.bytes.byteLength,
    sha256: archive.sha256,
    source_archive_bytes: archive.bytes.byteLength,
    source_archive_sha256: archive.sha256,
    source_mode: archive.source_mode,
    created_at: new Date().toISOString()
  };
  await bucket.put(manifestKey, JSON.stringify(manifest, null, 2), {
    httpMetadata: { contentType: 'application/json; charset=utf-8' },
    customMetadata: { ...baseMetadata, content_kind: 'transfer-manifest' }
  });
  return {
    stored: true,
    method,
    bucket_binding: bucketBinding,
    key: objectKey,
    manifest_key: manifestKey,
    filename,
    content_type: 'application/x-tar',
    bytes: archive.bytes.byteLength,
    sha256: archive.sha256,
    source_archive_bytes: archive.bytes.byteLength,
    source_archive_sha256: archive.sha256,
    plaintext_source_exposed_to_storage: true,
    storage_privacy: 'private-gated-transfer-bucket'
  };
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

async function sourcePackageManifest(env, sourcePackage = {}) {
  const bucket = deploymentBucket(env);
  const manifestKey = sourceManifestKeyForPackage(sourcePackage);
  if (!bucket?.get || !manifestKey) return null;
  const manifest = await objectJson(await bucket.get(manifestKey).catch(() => null), null);
  return manifest && typeof manifest === 'object' ? { ...manifest, manifest_key: manifestKey } : null;
}

async function sourcePackageIndexFiles(env, sourcePackage = {}) {
  const bucket = deploymentBucket(env);
  const indexKey = sourceIndexKeyForPackage(sourcePackage);
  if (!bucket?.get || !indexKey) return [];
  const object = await bucket.get(indexKey).catch(() => null);
  if (!object) return [];
  const text = typeof object.text === 'function' ? await object.text() : new TextDecoder().decode(await readObjectBytes(object));
  const files = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    try {
      files.push(sourceFileRecord(JSON.parse(line)));
    } catch {
      try { files.push(sourceFileRecord(line)); } catch {}
    }
  }
  return files.filter(Boolean);
}

async function sourceFilesForDeployment(env, deployment = {}) {
  const privatePackage = sourcePackageHasFiles(deployment.source_package) ? deployment.source_package : null;
  if (privatePackage) {
    const manifest = await sourcePackageManifest(env, privatePackage);
    const manifestFiles = Array.isArray(manifest?.files) ? dedupeSourceFiles(manifest.files) : [];
    const indexFiles = manifestFiles.length ? [] : await sourcePackageIndexFiles(env, privatePackage);
    const packageFiles = manifestFiles.length
      ? manifestFiles
      : indexFiles.length
        ? dedupeSourceFiles(indexFiles)
        : dedupeSourceFiles(privatePackage.files || privatePackage.sample_files || []);
    return {
      source_mode: 'private-full-project',
      source_package: privatePackage,
      manifest,
      files: packageFiles,
      file_count: Number(privatePackage.file_count || manifest?.file_count || manifest?.files?.length || packageFiles.length || 0),
      prefix: cleanText(privatePackage.prefix || '', MAX_PATH).replace(/^\/+|\/+$/g, '')
    };
  }
  const publicFiles = Array.isArray(deployment.files) ? dedupeSourceFiles(deployment.files.map((file) => ({ path: normalizeAssetPath(file) }))) : [];
  return {
    source_mode: 'public-deployment-files',
    source_package: null,
    manifest: null,
    files: publicFiles,
    file_count: Number(deployment.file_count || publicFiles.length || 0),
    prefix: cleanText(deployment.asset_prefix || '', MAX_PATH).replace(/^\/+|\/+$/g, '')
  };
}

async function sourceQueryContext(request, env, cors) {
  const auth = await requireDeployAuth(request, cors);
  const url = new URL(request.url);
  const principal = authPrincipal(auth);
  const params = Object.fromEntries(url.searchParams.entries());
  const workspaceId = workspaceIdFromInput(params, principal);
  const projectId = normalizeSlug(url.searchParams.get('projectId') || url.searchParams.get('project_id'), '', MAX_PROJECT);
  const deploymentId = normalizeSlug(url.searchParams.get('deploymentId') || url.searchParams.get('deployment_id'), '', MAX_DEPLOYMENT);
  if (!projectId || !deploymentId) {
    const error = new Error('project_id and deployment_id are required');
    error.status = 400;
    error.code = 'MISSING_SOURCE_QUERY_TARGET';
    throw error;
  }
  const key = deploymentKey(principal.customer_id, workspaceId, projectId, deploymentId);
  const deployment = await kvGetJson(receiptKv(env), key, null);
  if (!deployment || deployment.schema !== 'fs27.skynet.deployment.v1') {
    const error = new Error('Deployment not found for this SkyeNet account/workspace');
    error.status = 404;
    error.code = 'DEPLOYMENT_NOT_FOUND';
    throw error;
  }
  const source = await sourceFilesForDeployment(env, deployment);
  const prefix = source.prefix || (source.source_package
    ? cleanText(source.source_package.prefix || '', MAX_PATH).replace(/^\/+|\/+$/g, '')
    : assetPrefix(projectId, deploymentId));
  return { auth, principal, params, workspaceId, projectId, deploymentId, deployment, source, prefix, url };
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

async function deploymentUsage(env, customerId, workspaceId, options = {}) {
  const includeRoutes = options.include_routes !== false && options.includeRoutes !== false;
  const receiptLimit = Math.max(0, Math.min(500, Number(options.receipt_limit ?? options.receiptLimit ?? 500)));
  const rows = receiptLimit ? await kvListJson(receiptKv(env), receiptPrefix(customerId, workspaceId), receiptLimit) : [];
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
  const routeRows = includeRoutes ? await listRouteRecords(routeKv(env), 'route:v1:', 500) : { routes: [] };
  const routes = includeRoutes
    ? (routeRows.routes || []).filter((item) => String(item.route?.customer_id || '') === String(customerId))
    : [];
  return {
    monthly_deployments: monthlyDeployments.size,
    total_receipts: rows.length,
    public_routes: includeRoutes ? routes.filter((item) => item.route?.public_access !== false).length : null,
    routes: includeRoutes ? routes.length : null,
    route_scan_skipped: !includeRoutes
  };
}

async function saveReceipt(env, auth, workspaceId, type, meta = {}) {
  const principal = authPrincipal(auth);
  const kv = receiptKv(env);
  let providerRuntime = null;
  if (kv?.put) {
    const runtime = await executeZeroOsAutomationAction({
      ...env,
      SITE_EVENTS_KV: env.SITE_EVENTS_KV || env.ZERO_OS_AUTOMATION_KV || env.AUTOMATION_KV || kv
    }, {}, {
      provider_id: 'skynet',
      action: type,
      app_id: 'skynet',
      workspace_id: workspaceId || principal.workspace_id,
      customer_id: principal.customer_id,
      client_id: principal.email || '',
      usage_lane: `skynet:${String(type || 'event').replace(/^skynet\./, '')}`,
      live: false,
      sandbox: true,
      owner_approved: true,
      payload: {
        type,
        project_id: meta.project_id || meta.projectId || '',
        deployment_id: meta.deployment_id || meta.deploymentId || '',
        live_url: meta.live_url || '',
        route_key: meta.route_key || '',
        meta
      }
    }, { actor: principal.email || 'skynet' }, { operator_ok: true });
    const runtimeReceipt = runtime.response?.receipt || null;
    providerRuntime = {
      receipt_id: runtimeReceipt?.id || '',
      status: runtimeReceipt?.status || '',
      executed: Boolean(runtimeReceipt?.executed),
      provider_call_made: Boolean(runtimeReceipt?.provider_call_made)
    };
  }
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
    provider_runtime: providerRuntime,
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
    source_package: patch.source_package || patch.sourcePackage || existing.source_package || null,
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

async function enforceSourcePackageQuota(workspace, nextBytes = 0, auth = {}, request = null) {
  const caps = capsForWorkspace(workspace, auth, request);
  if (caps.admin_override) return;
  const limit = Number(caps.max_source_package_bytes || caps.max_static_bundle_bytes || 0);
  if (Number.isFinite(limit) && limit > 0 && nextBytes > limit) {
    const error = new Error(`SkyeNet private source package exceeds ${bytesLabel(limit)} cap for ${workspace.plan_name || DEFAULT_PLAN}.`);
    error.status = 413;
    error.code = 'SKYENET_SOURCE_PACKAGE_CAP';
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
  const usage = await deploymentUsage(env, workspaceResult.workspace.customer_id, workspaceResult.workspace.workspace_id, { include_routes: false });
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
  await enforceDeploymentQuota(
    env,
    workspaceResult.workspace,
    await deploymentUsage(env, workspaceResult.workspace.customer_id, workspaceId, { include_routes: false }),
    nextBytes,
    auth,
    request
  );
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

async function handleSourceUpload(request, env, cors) {
  const auth = await requireDeployAuth(request, cors);
  const bucket = deploymentBucket(env);
  if (!bucket?.put) return httpJson(500, { error: 'DEPLOYMENT_ASSET_BUCKET is not configured', code: 'NO_DEPLOYMENT_BUCKET' }, cors);
  const url = new URL(request.url);
  const projectId = normalizeSlug(url.searchParams.get('projectId') || url.searchParams.get('project_id'), 'project', MAX_PROJECT);
  const deploymentId = normalizeSlug(url.searchParams.get('deploymentId') || url.searchParams.get('deployment_id'), 'dep_missing', MAX_DEPLOYMENT);
  const principal = authPrincipal(auth);
  const workspaceId = workspaceIdFromInput(Object.fromEntries(url.searchParams.entries()), principal);
  const workspaceResult = await ensureWorkspace(env, auth, request, { workspace_id: workspaceId });
  const sourcePath = normalizeSourcePath(url.searchParams.get('path') || url.searchParams.get('sourcePath') || '');
  const prefix = sourcePackagePrefix(principal, workspaceId, projectId, deploymentId, url.searchParams.get('sourcePrefix') || '');
  const body = await request.arrayBuffer();
  const priorRecord = (await upsertDeploymentRecord(env, auth, request, {
    workspace_id: workspaceId,
    project_id: projectId,
    deployment_id: deploymentId
  })).deployment;
  const priorPackage = priorRecord.source_package || {};
  const nextBytes = Number(priorPackage.total_bytes || 0) + body.byteLength;
  await enforceSourcePackageQuota(workspaceResult.workspace, nextBytes, auth, request);
  const sha256 = await sha256Hex(body);
  const key = `${prefix}/${sourcePath}`.replace(/\/+/g, '/');
  const contentType = contentTypeForPath(sourcePath, request.headers.get('content-type') || '');
  await bucket.put(key, body, {
    httpMetadata: { contentType },
    customMetadata: {
      schema: 'fs27.private_source_file.v1',
      project_id: projectId,
      deployment_id: deploymentId,
      workspace_id: workspaceId,
      sha256
    }
  });
  const sourceFiles = Array.from(new Set([...(priorPackage.files || []), sourcePath]));
  if (sourceFiles.length > MAX_SOURCE_PACKAGE_FILES) {
    const error = new Error(`SkyeNet private source package has too many files; max is ${MAX_SOURCE_PACKAGE_FILES}.`);
    error.status = 413;
    error.code = 'SOURCE_PACKAGE_FILE_LIMIT';
    throw error;
  }
  const sourcePackage = {
    schema: 'fs27.skynet.source_package.v1',
    mode: 'private-full-project',
    prefix,
    files: sourceFiles,
    file_count: sourceFiles.length,
    total_bytes: nextBytes,
    downloadable: true,
    public_asset_exposure: false,
    completed_at: priorPackage.completed_at || null,
    updated_at: new Date().toISOString()
  };
  const deployment = await upsertDeploymentRecord(env, auth, request, {
    workspace_id: workspaceId,
    project_id: projectId,
    deployment_id: deploymentId,
    source_package: sourcePackage
  });
  return httpJson(200, {
    ok: true,
    project_id: projectId,
    deployment_id: deploymentId,
    workspace_id: workspaceId,
    path: sourcePath,
    key,
    bytes: body.byteLength,
    total_bytes: nextBytes,
    sha256,
    content_type: contentType,
    source_package: sourcePackage,
    deployment: deployment.deployment
  }, cors);
}

async function handleSourceComplete(request, env, cors) {
  const auth = await requireDeployAuth(request, cors);
  const body = await readJson(request);
  const bucket = deploymentBucket(env);
  if (!bucket?.put) return httpJson(500, { error: 'DEPLOYMENT_ASSET_BUCKET is not configured', code: 'NO_DEPLOYMENT_BUCKET' }, cors);
  const principal = authPrincipal(auth);
  const workspaceResult = await ensureWorkspace(env, auth, request, body);
  const workspaceId = workspaceResult.workspace.workspace_id;
  const projectId = normalizeSlug(body.project_id || body.projectId, 'project', MAX_PROJECT);
  const deploymentId = normalizeSlug(body.deployment_id || body.deploymentId, 'dep_missing', MAX_DEPLOYMENT);
  const existing = (await upsertDeploymentRecord(env, auth, request, {
    workspace_id: workspaceId,
    project_id: projectId,
    deployment_id: deploymentId
  })).deployment;
  const priorPackage = existing.source_package || {};
  const files = Array.isArray(body.files)
    ? dedupeSourceFiles(body.files)
    : dedupeSourceFiles(priorPackage.files || priorPackage.sample_files || []);
  if (!files.length) return httpJson(400, { ok: false, error: 'Private source package requires at least one source file.', code: 'SOURCE_PACKAGE_EMPTY' }, cors);
  if (files.length > MAX_SOURCE_INDEX_FILES) {
    return httpJson(413, {
      ok: false,
      error: `SkyeNet private source index has ${files.length} files; max indexed files per source package is ${MAX_SOURCE_INDEX_FILES}.`,
      code: 'SOURCE_INDEX_FILE_LIMIT',
      file_count: files.length,
      limit: MAX_SOURCE_INDEX_FILES
    }, cors);
  }
  const prefix = sourcePackagePrefix(principal, workspaceId, projectId, deploymentId, body.source_prefix || body.sourcePrefix || priorPackage.prefix || '');
  const manifestKey = `${prefix}/.skyenet/source-package.json`;
  const indexKey = `${prefix}/.skyenet/source-index.jsonl`;
  const responseFiles = sourceRecordListForResponse(files);
  const manifest = {
    schema: 'fs27.skynet.source_package_manifest.v1',
    mode: 'private-full-project',
    project_id: projectId,
    deployment_id: deploymentId,
    customer_id: principal.customer_id,
    workspace_id: workspaceId,
    completed_at: new Date().toISOString(),
    public_asset_exposure: false,
    file_count: files.length,
    files: responseFiles,
    index_key: indexKey,
    meta: body.meta && typeof body.meta === 'object' ? body.meta : {}
  };
  await bucket.put(manifestKey, JSON.stringify(manifest, null, 2), {
    httpMetadata: { contentType: 'application/json; charset=utf-8' }
  });
  const indexBody = files.map((file) => JSON.stringify(file)).join('\n');
  await bucket.put(indexKey, `${indexBody}\n`, {
    httpMetadata: { contentType: 'application/x-ndjson; charset=utf-8' }
  });
  const keepInlineFiles = files.length <= MAX_SOURCE_PACKAGE_FILES;
  const sourcePackage = {
    schema: 'fs27.skynet.source_package.v1',
    mode: 'private-full-project',
    prefix,
    files: keepInlineFiles ? responseFiles : [],
    sample_files: responseFiles.slice(0, Math.min(1000, responseFiles.length)),
    files_truncated: !keepInlineFiles,
    file_count: files.length,
    total_bytes: Number(body.total_bytes ?? body.totalBytes ?? priorPackage.total_bytes ?? 0),
    downloadable: true,
    manifest_key: manifestKey,
    index_key: indexKey,
    index_file_count: files.length,
    public_asset_exposure: false,
    completed_at: manifest.completed_at,
    updated_at: manifest.completed_at
  };
  const deployment = await upsertDeploymentRecord(env, auth, request, {
    workspace_id: workspaceId,
    project_id: projectId,
    deployment_id: deploymentId,
    source_package: sourcePackage
  });
  const receipt = await saveReceipt(env, auth, workspaceId, 'skynet.source.package.complete', {
    project_id: projectId,
    deployment_id: deploymentId,
    source_prefix: prefix,
    files: files.length,
    total_bytes: sourcePackage.total_bytes,
    manifest_key: manifestKey,
    index_key: indexKey,
    files_truncated: sourcePackage.files_truncated,
    public_asset_exposure: false
  });
  return httpJson(200, {
    ok: true,
    project_id: projectId,
    deployment_id: deploymentId,
    workspace_id: workspaceId,
    source_package: sourcePackage,
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
  const usage = await deploymentUsage(env, workspace.customer_id, workspace.workspace_id, { include_routes: false, receipt_limit: 100 });
  const deploymentRows = await kvListJson(receiptKv(env), deploymentPrefix(workspace.customer_id, workspace.workspace_id), 500);
  const deployments = deploymentRows
    .map((item) => item.value)
    .filter((item) => item?.schema === 'fs27.skynet.deployment.v1')
    .sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')))
    .slice(0, 100)
    .map((deployment) => ({
      ...deployment,
      source_download_url: sourceDownloadPath(workspace.workspace_id, deployment.project_id || '', deployment.deployment_id || ''),
      source_transfer_url: sourceTransferPath(),
      source_custody: {
        account_scoped: true,
        visible_to_authenticated_account: true,
        client_handoff_requires_transfer: true,
        package_mode: deployment.source_package?.mode || 'public-deployment-files',
        private_full_project_package: Boolean(deployment.source_package?.files?.length),
        private_source_file_count: deployment.source_package?.file_count || 0,
        private_source_total_bytes: deployment.source_package?.total_bytes || 0,
        public_asset_exposure: deployment.source_package?.public_asset_exposure === false ? false : 'public_assets_only',
        direct_download_format: 'tar',
        secure_pack_extension: '.skye',
        secure_pack_lineage: 'SkyeDocxMax .skye envelope plus SkyeSecure v2 source-pack custody',
        methods: sourceTransferMethodsForResponse()
      }
    }));
  const receiptRows = await kvListJson(receiptKv(env), receiptPrefix(workspace.customer_id, workspace.workspace_id), 100);
  const receipts = receiptRows
    .map((item) => item.value)
    .filter((item) => item?.schema === 'fs27.skynet.receipt.v1')
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
    .slice(0, 50);
  const includeFullRouteScan = truthy(params.include_routes || params.includeRoutes || params.full_routes || params.fullRoutes);
  const listed = includeFullRouteScan ? await listRouteRecords(routeKv(env), 'route:v1:', 500) : { routes: [] };
  const routes = includeFullRouteScan
    ? (listed.routes || []).filter((item) => {
      const route = item.route || {};
      return String(route.customer_id || '') === String(workspace.customer_id)
        && (!route.workspace_id || String(route.workspace_id) === String(workspace.workspace_id));
    })
    : deployments
      .filter((deployment) => deployment.live_url || deployment.route_key)
      .map((deployment) => ({
        key: deployment.route_key || '',
        route: {
          schema: 'fs27.route.summary.v1',
          project_id: deployment.project_id,
          active_deployment_id: deployment.deployment_id,
          workspace_id: deployment.workspace_id,
          customer_id: deployment.customer_id,
          live_url: deployment.live_url,
          public_access: deployment.status !== 'gated',
          route_key: deployment.route_key
        },
        metadata: { source: 'deployment-record' }
      }));
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
    route_source: includeFullRouteScan ? 'route-registry-scan' : 'deployment-records',
    route_scan_skipped: !includeFullRouteScan,
    receipts,
    links: {
      console: '/skyenet/index.html',
      api: '/api/skyenet',
      skyepay: 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skyepay.html?client=metraiyux-0s&offer=skyenet-edge-starter'
    }
  }, cors);
}

async function handleEnvVars(request, env, cors) {
  const auth = await requireDeployAuth(request, cors);
  const principal = authPrincipal(auth);
  const input = request.method === 'GET' || request.method === 'DELETE'
    ? Object.fromEntries(new URL(request.url).searchParams.entries())
    : await readJson(request);
  const workspaceResult = await ensureWorkspace(env, auth, request, input);
  const workspaceId = workspaceResult.workspace.workspace_id;
  const projectId = normalizeSlug(input.projectId || input.project_id || input.project || 'project', 'project', MAX_PROJECT);
  const kv = receiptKv(env);
  if (!kv?.put && request.method !== 'GET') return httpJson(500, { error: 'SKYENET_RECEIPTS_KV/ROUTING_KV is not configured for env storage', code: 'NO_ENV_KV' }, cors);
  if (request.method === 'GET') {
    if (!kv?.list) return httpJson(501, { ok: false, error: 'Env variable listing requires KV list support', code: 'NO_ENV_LIST' }, cors);
    const rows = await kvListJson(kv, envVarPrefix(principal.customer_id, workspaceId, projectId), 500);
    const vars = rows
      .map((item) => item.value)
      .filter((item) => item?.schema === 'fs27.skynet.env_var.v1')
      .sort((a, b) => String(a.key || '').localeCompare(String(b.key || '')))
      .map(sanitizeEnvRecord);
    return httpJson(200, { ok: true, workspace_id: workspaceId, project_id: projectId, count: vars.length, env: vars }, cors);
  }

  const envKey = normalizeEnvKey(input.key || input.name || input.env_key || input.envKey);
  const key = envVarKey(principal.customer_id, workspaceId, projectId, envKey);
  if (request.method === 'DELETE' || input.delete === true || input.action === 'delete') {
    if (kv?.delete) await kv.delete(key);
    const receipt = await saveReceipt(env, auth, workspaceId, 'skynet.env.deleted', { project_id: projectId, env_key: envKey });
    return httpJson(200, { ok: true, deleted: true, workspace_id: workspaceId, project_id: projectId, key: envKey, receipt }, cors);
  }

  const now = new Date().toISOString();
  const existing = await kvGetJson(kv, key, null);
  const rawValue = String(input.value ?? input.env_value ?? input.envValue ?? '');
  const secret = input.secret !== false && input.is_secret !== false && input.isSecret !== false;
  const valueBytes = encodeUtf8(rawValue);
  const record = {
    schema: 'fs27.skynet.env_var.v1',
    key: envKey,
    customer_id: principal.customer_id,
    workspace_id: workspaceId,
    project_id: projectId,
    scope: cleanText(input.scope || input.context || 'production', 80).toLowerCase() || 'production',
    secret,
    value: rawValue,
    value_preview: envPreview(rawValue),
    value_sha256: await sha256Hex(valueBytes),
    source: cleanText(input.source || 'skyenet-console', 160),
    created_at: existing?.created_at || now,
    updated_at: now
  };
  await kvPutJson(kv, key, record, {
    schema: record.schema,
    customer_id: principal.customer_id,
    workspace_id: workspaceId,
    project_id: projectId,
    env_key: envKey,
    secret
  });
  const receipt = await saveReceipt(env, auth, workspaceId, existing ? 'skynet.env.updated' : 'skynet.env.created', {
    project_id: projectId,
    env_key: envKey,
    scope: record.scope,
    secret,
    value_preview: record.value_preview,
    value_sha256: record.value_sha256
  });
  return httpJson(200, {
    ok: true,
    workspace_id: workspaceId,
    project_id: projectId,
    env: sanitizeEnvRecord(record),
    receipt
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
  const usage = await deploymentUsage(env, workspaceResult.workspace.customer_id, workspaceResult.workspace.workspace_id, { include_routes: false, receipt_limit: 50 });
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
      'GET/POST/DELETE /deploy/env',
      'PUT /deploy/source-upload',
      'POST /deploy/source-complete',
      'GET /deploy/source-download',
      'POST /deploy/source-transfer',
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
      source_downloads: true,
      netlify_style_deploy_file_downloads: true,
      private_full_project_source_packages: true,
      source_package_public_asset_exposure: false,
      source_bundle_format: 'tar',
      env_variable_registry: true,
      env_values_redacted_in_dashboard: true,
      source_transfers: true,
      source_transfer_methods: sourceTransferMethodsForResponse(),
      source_transfer_custody: 'account-scoped downloads; client handoff requires an explicit transfer receipt',
      source_secure_pack_extension: '.skye',
      source_secure_pack_format: 'skye-secure-secret-pack-v2',
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

async function handleSourceTransfer(request, env, cors) {
  const auth = await requireDeployAuth(request, cors);
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const body = request.method === 'POST' ? await readJson(request) : {};
  const input = { ...params, ...body };
  const principal = authPrincipal(auth);
  const workspaceId = workspaceIdFromInput(input, principal);
  const projectId = normalizeSlug(input.projectId || input.project_id, '', MAX_PROJECT);
  const deploymentId = normalizeSlug(input.deploymentId || input.deployment_id, '', MAX_DEPLOYMENT);
  if (!projectId || !deploymentId) return httpJson(400, { error: 'project_id and deployment_id are required', code: 'MISSING_SOURCE_TRANSFER_TARGET' }, cors);

  const key = deploymentKey(principal.customer_id, workspaceId, projectId, deploymentId);
  const deployment = await kvGetJson(receiptKv(env), key, null);
  if (!deployment || deployment.schema !== 'fs27.skynet.deployment.v1') {
    return httpJson(404, { error: 'Deployment not found for this SkyeNet account/workspace', code: 'DEPLOYMENT_NOT_FOUND' }, cors);
  }

  const method = normalizeSourceTransferMethod(input.method || input.transfer_method || input.transferMethod);
  const methodInfo = SOURCE_TRANSFER_METHODS[method] || SOURCE_TRANSFER_METHODS.download;
  const transferId = randomId('srcxfer');
  const sourceDownloadUrl = sourceDownloadPath(workspaceId, projectId, deploymentId);
  const recipientCustomerId = cleanText(
    input.recipient_customer_id || input.recipientCustomerId || input.transfer_to_customer_id || input.transferToCustomerId || input.client_customer_id || input.clientCustomerId || '',
    160
  );
  const recipientEmail = cleanText(input.recipient_email || input.recipientEmail || input.to_email || input.toEmail || '', 220);
  const destination = {
    method,
    label: methodInfo.label,
    drive_id: cleanText(input.drive_id || input.driveId || '', 180),
    vault_id: cleanText(input.vault_id || input.vaultId || '', 180),
    recipient_customer_id: recipientCustomerId,
    recipient_email: recipientEmail
  };
  const crossAccountTransfer = Boolean(recipientCustomerId && String(recipientCustomerId) !== String(principal.customer_id));
  const admin = isAdminPrincipal(auth, request);
  if (crossAccountTransfer && !admin) {
    return httpJson(403, {
      error: 'Cross-account source transfer requires owner/admin authority.',
      code: 'SOURCE_TRANSFER_REQUIRES_OWNER',
      custody_policy: 'Source remains account-scoped until an owner/admin transfer receipt is recorded.'
    }, cors);
  }

  let archive = null;
  let storage = null;
  if (['skyedrive', 'skyevault', 'secure-skye-pack'].includes(method)) {
    archive = await buildSourceArchiveBytes(env, principal, workspaceId, projectId, deploymentId, deployment);
    storage = await storeSourceTransferArtifact(env, method, archive, {
      transfer_id: transferId,
      principal,
      workspace_id: workspaceId,
      project_id: projectId,
      deployment_id: deploymentId
    });
  }

  const queuePayload = {
    schema: 'fs27.skynet.source_transfer.completed.v1',
    transfer_id: transferId,
    method,
    status: storage?.stored ? 'completed' : 'ready',
    customer_id: principal.customer_id,
    workspace_id: workspaceId,
    project_id: projectId,
    deployment_id: deploymentId,
    live_url: deployment.live_url || '',
    destination,
    storage,
    requested_at: new Date().toISOString()
  };
  const queue = env.SKYENET_SOURCE_TRANSFER_QUEUE || env.SOURCE_TRANSFER_QUEUE || null;
  let queueAccepted = false;
  let queueError = '';
  if (queue?.send && ['skyedrive', 'skyevault', 'secure-skye-pack'].includes(method)) {
    try {
      await queue.send(queuePayload);
      queueAccepted = true;
    } catch (error) {
      queueError = error?.message || 'queue send failed';
    }
  }

  const status = method === 'download'
    ? 'ready'
    : method === 'instant-download-link'
      ? 'ready_gated'
      : storage?.stored
        ? 'completed'
        : queueAccepted
          ? 'queued'
          : 'failed';
  const custodyPolicy = {
    source_owner_customer_id: principal.customer_id,
    workspace_id: workspaceId,
    account_scoped: true,
    client_access_without_transfer: false,
    cross_account_transfer: crossAccountTransfer,
    transfer_required_for_client_source_handoff: true,
    recipient_status: crossAccountTransfer ? 'pending_owner_approved_handoff' : 'same_account_destination',
    secure_pack_extension: '.skye',
    secure_pack_format: 'skye-secure-secret-pack-v2',
    secure_pack_crypto_lineage: 'SkyeDocxMax .skye envelope naming with SkyeSecure v2 encrypted source-pack custody'
  };
  const receiptType = storage?.stored ? 'skynet.source.transfer.completed' : 'skynet.source.transfer.requested';
  const receipt = await saveReceipt(env, auth, workspaceId, receiptType, {
    transfer_id: transferId,
    project_id: projectId,
    deployment_id: deploymentId,
    method,
    status,
    queue_accepted: queueAccepted,
    queue_error: queueError,
    source_download_url: sourceDownloadUrl,
    storage,
    archive: archive ? {
      filename: archive.download_name,
      source_mode: archive.source_mode,
      files: archive.files.length,
      bytes: archive.bytes.byteLength,
      sha256: archive.sha256
    } : null,
    destination,
    custody_policy: custodyPolicy
  });

  return httpJson(200, {
    ok: true,
    transfer_id: transferId,
    status,
    method: methodInfo,
    queue_accepted: queueAccepted,
    queue_error: queueError || null,
    source_download_url: ['download', 'instant-download-link'].includes(method) ? sourceDownloadUrl : null,
    gated_download_url: sourceDownloadUrl,
    storage,
    archive: archive ? {
      filename: archive.download_name,
      source_mode: archive.source_mode,
      file_count: archive.files.length,
      bytes: archive.bytes.byteLength,
      sha256: archive.sha256
    } : null,
    destination,
    custody_policy: custodyPolicy,
    secure_pack: method === 'secure-skye-pack'
      ? {
        extension: '.skye',
        format: 'skye-secure-secret-pack-v2',
        marker: 'SKYESEC2',
        object_key: storage?.key || '',
        manifest_key: storage?.manifest_key || '',
        key_custody_key: storage?.key_custody_key || '',
        filename: storage?.filename || '',
        bytes: storage?.bytes || 0,
        sha256: storage?.sha256 || '',
        plaintext_source_exposed_to_storage: false,
        note: 'The encrypted .skye source pack was written to SkyeNet private storage. The raw key stays in an owner-admin key custody record and is not returned by this API.'
      }
      : null,
    receipt
  }, cors);
}

async function handleSourceDownload(request, env, cors) {
  const auth = await requireDeployAuth(request, cors);
  const bucket = deploymentBucket(env);
  if (!bucket?.get) return httpJson(500, { error: 'DEPLOYMENT_ASSET_BUCKET read is not configured', code: 'NO_DEPLOYMENT_BUCKET_READ' }, cors);
  const url = new URL(request.url);
  const principal = authPrincipal(auth);
  const params = Object.fromEntries(url.searchParams.entries());
  const workspaceId = workspaceIdFromInput(params, principal);
  const projectId = normalizeSlug(url.searchParams.get('projectId') || url.searchParams.get('project_id'), '', MAX_PROJECT);
  const deploymentId = normalizeSlug(url.searchParams.get('deploymentId') || url.searchParams.get('deployment_id'), '', MAX_DEPLOYMENT);
  if (!projectId || !deploymentId) return httpJson(400, { error: 'project_id and deployment_id are required', code: 'MISSING_SOURCE_DOWNLOAD_TARGET' }, cors);
  const key = deploymentKey(principal.customer_id, workspaceId, projectId, deploymentId);
  const deployment = await kvGetJson(receiptKv(env), key, null);
  if (!deployment || deployment.schema !== 'fs27.skynet.deployment.v1') {
    return httpJson(404, { error: 'Deployment not found for this SkyeNet account/workspace', code: 'DEPLOYMENT_NOT_FOUND' }, cors);
  }
  const privatePackage = deployment.source_package && Array.isArray(deployment.source_package.files) && deployment.source_package.files.length
    ? deployment.source_package
    : null;
  const files = privatePackage
    ? privatePackage.files.map((file) => normalizeSourcePath(file)).slice(0, MAX_SOURCE_DOWNLOAD_FILES)
    : Array.isArray(deployment.files)
      ? deployment.files.map((file) => normalizeAssetPath(file)).slice(0, MAX_SOURCE_DOWNLOAD_FILES)
      : [];
  if (!files.length) return httpJson(409, { error: 'Deployment has no recorded files to download', code: 'DEPLOYMENT_SOURCE_EMPTY', deployment }, cors);
  const totalRecordedFiles = privatePackage ? privatePackage.files.length : (Array.isArray(deployment.files) ? deployment.files.length : 0);
  if (totalRecordedFiles > MAX_SOURCE_DOWNLOAD_FILES) {
    return httpJson(413, {
      error: `Deployment source bundle has ${totalRecordedFiles} files; max downloadable files per request is ${MAX_SOURCE_DOWNLOAD_FILES}.`,
      code: 'SOURCE_DOWNLOAD_FILE_LIMIT',
      file_count: totalRecordedFiles,
      limit: MAX_SOURCE_DOWNLOAD_FILES
    }, cors);
  }
  const prefix = cleanText(
    privatePackage?.prefix || deployment.asset_prefix || assetPrefix(projectId, deploymentId),
    MAX_PATH
  ).replace(/^\/+|\/+$/g, '');
  const objects = [];
  const missing = [];
  let totalBytes = 0;
  for (const file of files) {
    const objectKey = `${prefix}/${file}`.replace(/\/+/g, '/');
    const meta = bucket.head ? await bucket.head(objectKey).catch(() => null) : null;
    let object = null;
    if (!meta) object = await bucket.get(objectKey).catch(() => null);
    const size = Number(meta?.size ?? object?.size ?? 0);
    if (!meta && !object) {
      missing.push(file);
      continue;
    }
    totalBytes += size;
    objects.push({ file, key: objectKey, size, object });
  }
  if (missing.length) {
    return httpJson(409, {
      error: 'Deployment source bundle is incomplete; one or more recorded files are missing from the SkyeNet vault.',
      code: 'SOURCE_DOWNLOAD_INCOMPLETE',
      missing,
      deployment: { project_id: projectId, deployment_id: deploymentId, workspace_id: workspaceId }
    }, cors);
  }
  const manifest = {
    schema: 'fs27.skynet.source_download_manifest.v1',
    generated_at: new Date().toISOString(),
    account: {
      customer_id: principal.customer_id,
      workspace_id: workspaceId,
      email: principal.email || '',
      role: principal.role || ''
    },
    deployment: {
      project_id: projectId,
      deployment_id: deploymentId,
      status: deployment.status || '',
      live_url: deployment.live_url || '',
      route_key: deployment.route_key || '',
      asset_prefix: prefix,
      source_mode: privatePackage ? 'private-full-project' : 'public-deployment-files',
      source_package: privatePackage ? {
        mode: privatePackage.mode || 'private-full-project',
        file_count: privatePackage.file_count || files.length,
        total_bytes: privatePackage.total_bytes || totalBytes,
        public_asset_exposure: false,
        completed_at: privatePackage.completed_at || ''
      } : null,
      file_count: files.length,
      total_bytes: totalBytes
    },
    files
  };
  const manifestBytes = encodeUtf8(JSON.stringify(manifest, null, 2));
  const downloadName = `${safeDownloadName(projectId, deploymentId, 'source')}.tar`;
  const stream = new ReadableStream({
    async start(controller) {
      const enqueueEntry = async (name, bodyBytes, typeflag = '0') => {
        const pax = tarPaxEntriesIfNeeded(name);
        if (pax) {
          controller.enqueue(pax.header);
          controller.enqueue(pax.body);
          if (pax.padding) controller.enqueue(pax.padding);
        }
        controller.enqueue(tarHeader(name, bodyBytes.length, { typeflag }));
        controller.enqueue(bodyBytes);
        const padding = tarPadding(bodyBytes.length);
        if (padding) controller.enqueue(padding);
      };
      await enqueueEntry('.skyenet/source-manifest.json', manifestBytes);
      for (const item of objects) {
        const object = item.object || await bucket.get(item.key);
        const bodyBytes = await readObjectBytes(object);
        await enqueueEntry(item.file, bodyBytes);
      }
      controller.enqueue(new Uint8Array(1024));
      controller.close();
    }
  });
  const headers = new Headers(cors);
  headers.set('content-type', 'application/x-tar');
  headers.set('content-disposition', `attachment; filename="${downloadName}"`);
  headers.set('cache-control', 'no-store');
  headers.set('x-skynet-source-download', 'tar');
  headers.set('x-skynet-project-id', projectId);
  headers.set('x-skynet-deployment-id', deploymentId);
  headers.set('x-skynet-workspace-id', workspaceId);
  return new Response(stream, { status: 200, headers });
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
    if (url.pathname === '/deploy/env' && ['GET', 'POST', 'DELETE'].includes(request.method)) return await handleEnvVars(request, env, cors);
    if (url.pathname === '/deploy/source-upload' && ['PUT', 'POST'].includes(request.method)) return await handleSourceUpload(request, env, cors);
    if (url.pathname === '/deploy/source-complete' && request.method === 'POST') return await handleSourceComplete(request, env, cors);
    if (url.pathname === '/deploy/source-download' && request.method === 'GET') return await handleSourceDownload(request, env, cors);
    if (url.pathname === '/deploy/source-transfer' && request.method === 'POST') return await handleSourceTransfer(request, env, cors);
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
