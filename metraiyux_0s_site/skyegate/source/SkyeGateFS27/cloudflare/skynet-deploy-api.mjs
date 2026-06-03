import { requireGateAuth, gateAuthErrorResponse } from '../netlify/functions/_lib/authz.js';
import { buildCors, json as httpJson } from '../netlify/functions/_lib/http.js';
import { executeZeroOsAutomationAction } from '../../../../cloudflare/zero-os-automation-spine.mjs';
import { inflateSync as inflateRawSync } from 'fflate';
import { Decompress as ZstdDecompress } from 'fzstd';

const MAX_PROJECT = 160;
const MAX_DEPLOYMENT = 180;
const MAX_PATH = 700;
const MAX_SOURCE_DOWNLOAD_FILES = 5000;
const MAX_SOURCE_PACKAGE_FILES = 20000;
const MAX_SOURCE_INDEX_FILES = 500000;
const MAX_SOURCE_QUERY_LIMIT = 5000;
const SOURCE_INDEX_PAGE_SIZE = 5000;
const SOURCE_TREE_MATERIALIZE_FILE_LIMIT = 50000;
const MAX_KV_LIST_PAGE_LIMIT = 999;
const MAX_SOURCE_SEARCH_RESULTS = 250;
const MAX_SOURCE_SEARCH_CONTENT_FILES = 500;
const MAX_SOURCE_SEARCH_CONTENT_BYTES = 256 * 1024;
const MAX_SOURCE_FILE_JSON_BYTES = 2 * 1024 * 1024;
const MAX_SOURCE_ARCHIVE_INLINE_HASH_BYTES = 64 * 1024 * 1024;
const MAX_SOURCE_ARCHIVE_SERVER_VERIFY_BYTES = 64 * 1024 * 1024;
const MAX_SOURCE_TRANSFER_ARCHIVE_BYTES = 512 * 1024 * 1024;
const MAX_SOURCE_ARCHIVE_LAZY_SCAN_BYTES = 2 * 1024 * 1024 * 1024;
const MAX_SOURCE_ARCHIVE_ZIP_CENTRAL_DIRECTORY_BYTES = 64 * 1024 * 1024;
const MAX_SOURCE_ARCHIVE_ZIP_ENTRY_BYTES = 64 * 1024 * 1024;
const MAX_FUNCTION_BUNDLE_FILES = 256;
const MAX_FUNCTION_BUNDLE_FILE_BYTES = 2 * 1024 * 1024;
const MAX_FUNCTION_BUNDLE_TOTAL_BYTES = 64 * 1024 * 1024;
const MAX_FUNCTION_COUNT = 128;
const MAX_FUNCTION_BODY_BYTES = 1024 * 1024;
const MAX_FUNCTION_TIMEOUT_MS = 10000;
const MAX_FUNCTION_CPU_MS = 50;
const MAX_FUNCTION_SUBREQUESTS = 0;
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
    functions_enabled: true,
    managed_functions_enabled: true,
    signed_function_bundles_required: true,
    function_timeout_ms: 10000,
    function_cpu_ms: 50,
    function_memory_mb: 128,
    function_body_bytes: 1024 * 1024,
    function_subrequests: 0,
    function_egress: 'deny',
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
    functions_enabled: true,
    managed_functions_enabled: true,
    signed_function_bundles_required: true,
    function_timeout_ms: 10000,
    function_cpu_ms: 50,
    function_memory_mb: 128,
    function_body_bytes: 1024 * 1024,
    function_subrequests: 0,
    function_egress: 'deny',
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
  functions_enabled: true,
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

function trueFlag(value) {
  return value === true || String(value || '').toLowerCase() === 'true';
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

function formsBucket(env) {
  return env.SKYENET_FORMS_BUCKET || env.REQUEST_LOG_BUCKET || env.FS27_REQUEST_LOG_BUCKET || deploymentBucket(env);
}

function formsBucketBinding(env) {
  if (env.SKYENET_FORMS_BUCKET) return 'SKYENET_FORMS_BUCKET';
  if (env.REQUEST_LOG_BUCKET) return 'REQUEST_LOG_BUCKET';
  if (env.FS27_REQUEST_LOG_BUCKET) return 'FS27_REQUEST_LOG_BUCKET';
  return deploymentBucket(env) ? 'DEPLOYMENT_ASSET_BUCKET' : '';
}

function skynetSupportProfile(env = {}) {
  const email = (key, fallback) => cleanText(env[key] || fallback, 220);
  const phone = (key, fallback) => cleanText(env[key] || fallback, 80);
  const sourceUrl = cleanText(
    env.SKYENET_SUPPORT_SOURCE_URL || 'https://skyenet.skyesol/leadership/SkyesOverLondon.html',
    300
  );
  const profile = {
    schema: 'fs27.skynet.support_profile.v1',
    source: sourceUrl,
    source_label: 'Skyes Over London public leadership page',
    contact_policy: 'approved-public-page-values-with-env-overrides',
    public_site: cleanText(env.SKYENET_SUPPORT_PUBLIC_SITE || 'https://skyenet.solenterprises/', 300),
    operations: {
      label: 'Skyes Over London operations',
      email: email('SKYENET_SUPPORT_OPERATIONS_EMAIL', 'SkyesOverLondonLC@solenterprises.org'),
      phone: phone('SKYENET_SUPPORT_OPERATIONS_PHONE', '480-469-5416')
    },
    founder: {
      label: 'Gray London Skyes',
      email: email('SKYENET_SUPPORT_FOUNDER_EMAIL', 'GrayLondonSkyes@solenterprises.org'),
      phone: phone('SKYENET_SUPPORT_FOUNDER_PHONE', '623-260-7073')
    },
    general: {
      label: 'SOL Enterprises contact',
      email: email('SKYENET_SUPPORT_GENERAL_EMAIL', 'Contact@solenterprises.org')
    },
    b2b: {
      label: 'SOL Enterprises B2B',
      email: email('SKYENET_SUPPORT_B2B_EMAIL', 'B2B@solenterprises.org')
    }
  };
  return {
    ...profile,
    contacts: [
      { id: 'operations', type: 'email', label: profile.operations.label, value: profile.operations.email, href: `mailto:${profile.operations.email}` },
      { id: 'founder', type: 'email', label: profile.founder.label, value: profile.founder.email, href: `mailto:${profile.founder.email}` },
      { id: 'general', type: 'email', label: profile.general.label, value: profile.general.email, href: `mailto:${profile.general.email}` },
      { id: 'b2b', type: 'email', label: profile.b2b.label, value: profile.b2b.email, href: `mailto:${profile.b2b.email}` },
      { id: 'operations-phone', type: 'phone', label: profile.operations.label, value: profile.operations.phone, href: `tel:${profile.operations.phone.replace(/[^0-9+]/g, '')}` },
      { id: 'founder-phone', type: 'phone', label: profile.founder.label, value: profile.founder.phone, href: `tel:${profile.founder.phone.replace(/[^0-9+]/g, '')}` }
    ],
    hardcoded_wrong_contact_fallbacks: false
  };
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

function directRuntimeArchiveConfigured(env) {
  const value = String(env.RUNTIME_DIRECT_ARCHIVE || env.FS27_RUNTIME_DIRECT_ARCHIVE || '').trim().toLowerCase();
  return value === 'sync' || truthy(value);
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

function customerScopeFromInput(input = {}, auth = {}, request = null) {
  const principal = authPrincipal(auth);
  const requested = cleanText(
    input.source_customer_id
    || input.sourceCustomerId
    || input.customer_id
    || input.customerId
    || '',
    160
  );
  if (!requested || requested === principal.customer_id) {
    return {
      customer_id: principal.customer_id,
      principal,
      source_principal: principal,
      owner_override: false
    };
  }
  if (!isAdminPrincipal(auth, request)) {
    const error = new Error('Reading or transferring another customer source custody scope requires owner/admin authority.');
    error.status = 403;
    error.code = 'SOURCE_CUSTOMER_SCOPE_REQUIRES_OWNER';
    throw error;
  }
  return {
    customer_id: requested,
    principal,
    source_principal: { ...principal, customer_id: requested },
    owner_override: true,
    requested_by_customer_id: principal.customer_id
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

function deploymentFreshnessStamp(deployment) {
  return String(
    deployment?.updated_at
    || deployment?.source_package?.updated_at
    || deployment?.source_package?.archive?.uploaded_at
    || deployment?.completed_at
    || deployment?.created_at
    || ''
  );
}

async function findOwnerScopedDeployment(env, auth, request, input, workspaceId, projectId, deploymentId) {
  const primary = customerScopeFromInput(input, auth, request);
  const kv = receiptKv(env);
  const key = deploymentKey(primary.customer_id, workspaceId, projectId, deploymentId);
  const deployment = await kvGetJson(kv, key, null);
  if (deployment?.schema === 'fs27.skynet.deployment.v1') {
    return { key, deployment, customerScope: primary };
  }
  const explicitCustomer = cleanText(input.source_customer_id || input.sourceCustomerId || input.customer_id || input.customerId || '', 160);
  if (!explicitCustomer && !primary.owner_override) {
    const grant = await findSourceCodebaseGrant(env, primary.customer_id, workspaceId, projectId, deploymentId);
    if (grant?.source_owner_customer_id) {
      const sourceOwnerCustomerId = cleanText(grant.source_owner_customer_id, 160);
      const grantKey = deploymentKey(sourceOwnerCustomerId, workspaceId, projectId, deploymentId);
      const grantedDeployment = await kvGetJson(kv, grantKey, null);
      if (grantedDeployment?.schema === 'fs27.skynet.deployment.v1') {
        return {
          key: grantKey,
          deployment: grantedDeployment,
          customerScope: {
            ...primary,
            customer_id: sourceOwnerCustomerId,
            source_principal: { ...primary.principal, customer_id: sourceOwnerCustomerId },
            source_codebase_grant: true,
            source_codebase_mount_id: grant.mount_id || '',
            requested_by_customer_id: primary.principal.customer_id
          }
        };
      }
    }
  }
  if (explicitCustomer || primary.owner_override || !isAdminPrincipal(auth, request)) {
    return { key, deployment: null, customerScope: primary };
  }
  const rows = await kvListJson(kv, 'skynet:deployment:v1:customer:', 5000);
  const matches = rows.filter((row) => {
    const item = row.value || {};
    return item?.schema === 'fs27.skynet.deployment.v1'
      && String(item.workspace_id || '') === String(workspaceId)
      && String(item.project_id || '') === String(projectId)
      && String(item.deployment_id || '') === String(deploymentId);
  });
  const match = matches.sort((a, b) => deploymentFreshnessStamp(b.value).localeCompare(deploymentFreshnessStamp(a.value)))[0];
  if (!match) return { key, deployment: null, customerScope: primary };
  const recoveredCustomerId = cleanText(match.value.customer_id || '', 160) || primary.customer_id;
  return {
    key: match.key,
    deployment: match.value,
    customerScope: {
      ...primary,
      customer_id: recoveredCustomerId,
      source_principal: { ...primary.principal, customer_id: recoveredCustomerId },
      owner_override: true,
      auto_resolved: true,
      requested_by_customer_id: primary.principal.customer_id
    }
  };
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

function sourceCodebasesPath() {
  return '/api/skyenet/source-codebases';
}

function functionStatusPath(workspaceId, projectId, deploymentId) {
  const params = new URLSearchParams({
    workspace_id: workspaceId,
    project_id: projectId,
    deployment_id: deploymentId
  });
  return `/api/skyenet/functions-status?${params.toString()}`;
}

function formsInboxPath(workspaceId, projectId, deploymentId) {
  const params = new URLSearchParams({
    workspace_id: workspaceId,
    project_id: projectId,
    deployment_id: deploymentId
  });
  return `/api/skyenet/forms-inbox?${params.toString()}`;
}

function sourcePackagePrefix(principal, workspaceId, projectId, deploymentId, explicit = '') {
  const canonical = [
    'source-packages',
    `customer-${cleanText(principal?.customer_id || '0', 160)}`,
    `workspace-${workspaceId}`,
    `project-${projectId}`,
    `deployment-${deploymentId}`
  ].join('/');
  const cleanExplicit = cleanText(explicit || '', MAX_PATH).replace(/^\/+|\/+$/g, '');
  if (cleanExplicit && (cleanExplicit === canonical || cleanExplicit.startsWith(`${canonical}/`))) return cleanExplicit;
  return canonical;
}

function functionBundlePrefix(principal, workspaceId, projectId, deploymentId, explicit = '') {
  const canonical = [
    'function-bundles',
    `customer-${cleanText(principal?.customer_id || '0', 160)}`,
    `workspace-${workspaceId}`,
    `project-${projectId}`,
    `deployment-${deploymentId}`
  ].join('/');
  const cleanExplicit = cleanText(explicit || '', MAX_PATH).replace(/^\/+|\/+$/g, '');
  if (cleanExplicit && (cleanExplicit === canonical || cleanExplicit.startsWith(`${canonical}/`))) return cleanExplicit;
  return canonical;
}

function functionManifestKeyForBundle(bundle = {}) {
  const explicit = cleanText(bundle.manifest_key || bundle.manifestKey || '', MAX_PATH * 2).replace(/^\/+/, '');
  if (explicit) return explicit;
  const prefix = cleanText(bundle.prefix || '', MAX_PATH).replace(/^\/+|\/+$/g, '');
  return prefix ? `${prefix}/manifest.json` : '';
}

function functionScheduleIndexPrefix() {
  return 'skynet:function-schedule:v1:';
}

function functionScheduleIndexKey(customerId, workspaceId, projectId, deploymentId, functionName) {
  return [
    functionScheduleIndexPrefix(),
    'customer:',
    cleanText(customerId || '0', 160),
    ':workspace:',
    normalizeSlug(workspaceId || 'default-workspace', 'default-workspace', 180),
    ':project:',
    normalizeSlug(projectId || 'project', 'project', MAX_PROJECT),
    ':deployment:',
    normalizeSlug(deploymentId || 'deployment', 'deployment', MAX_DEPLOYMENT),
    ':function:',
    functionName
  ].join('');
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

function base64UrlEncodeText(value = '') {
  const bytes = encodeUtf8(String(value || ''));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const encoded = typeof globalThis.btoa === 'function'
    ? globalThis.btoa(binary)
    : Buffer.from(bytes).toString('base64');
  return encoded.replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_') || '_root';
}

function sourceIndexPagePrefixForPackage(sourcePackage = {}) {
  const explicit = cleanText(
    sourcePackage.index_page_prefix
    || sourcePackage.indexPagePrefix
    || sourcePackage.index_pages?.prefix
    || sourcePackage.indexPages?.prefix
    || '',
    MAX_PATH * 2
  ).replace(/^\/+/, '');
  if (explicit) return explicit;
  const prefix = cleanText(sourcePackage.prefix || '', MAX_PATH).replace(/^\/+|\/+$/g, '');
  return prefix ? `${prefix}/.skyenet/source-index-pages` : '';
}

function sourceIndexPageKey(sourcePackage = {}, page = 0) {
  const prefix = sourceIndexPagePrefixForPackage(sourcePackage);
  return prefix ? `${prefix}/page-${String(Math.max(0, Number(page) || 0)).padStart(6, '0')}.json` : '';
}

function sourceTreeIndexPrefixForPackage(sourcePackage = {}) {
  const explicit = cleanText(
    sourcePackage.tree_index_prefix
    || sourcePackage.treeIndexPrefix
    || sourcePackage.tree_index?.prefix
    || sourcePackage.treeIndex?.prefix
    || '',
    MAX_PATH * 2
  ).replace(/^\/+/, '');
  if (explicit) return explicit;
  const prefix = cleanText(sourcePackage.prefix || '', MAX_PATH).replace(/^\/+|\/+$/g, '');
  return prefix ? `${prefix}/.skyenet/source-tree-index` : '';
}

function sourceTreeIndexSegment(rawPrefix = '') {
  return base64UrlEncodeText(cleanText(rawPrefix || '', MAX_PATH).replace(/^\/+|\/+$/g, ''));
}

function sourceTreeMetaKey(sourcePackage = {}, rawPrefix = '') {
  const prefix = sourceTreeIndexPrefixForPackage(sourcePackage);
  return prefix ? `${prefix}/${sourceTreeIndexSegment(rawPrefix)}/meta.json` : '';
}

function sourceTreePageKey(sourcePackage = {}, rawPrefix = '', page = 0) {
  const prefix = sourceTreeIndexPrefixForPackage(sourcePackage);
  return prefix ? `${prefix}/${sourceTreeIndexSegment(rawPrefix)}/page-${String(Math.max(0, Number(page) || 0)).padStart(6, '0')}.json` : '';
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

function sourceIndexTextForRecords(records = []) {
  const lines = [];
  for (const record of records) {
    const item = sourceFileRecord(record);
    if (item) lines.push(JSON.stringify(item));
  }
  return lines.length ? `${lines.join('\n')}\n` : '';
}

function formKeySegment(value = '', fallback = 'unknown') {
  return cleanText(value || fallback, 180).replace(/[^A-Za-z0-9._=-]+/g, '-').replace(/^-+|-+$/g, '') || fallback;
}

function formsStoragePrefix(projectId, deploymentId, formName = '') {
  const parts = [
    'skynet',
    'forms',
    `project=${formKeySegment(projectId, 'project')}`,
    `deployment=${formKeySegment(deploymentId, 'deployment')}`
  ];
  const cleanForm = formKeySegment(formName, '');
  if (cleanForm) parts.push(`form=${cleanForm}`);
  return parts.join('/');
}

function formNotificationsPrefix(projectId, deploymentId, formName = '') {
  const parts = [
    'skynet',
    'forms-notifications',
    `project=${formKeySegment(projectId, 'project')}`,
    `deployment=${formKeySegment(deploymentId, 'deployment')}`
  ];
  const cleanForm = formKeySegment(formName, '');
  if (cleanForm) parts.push(`form=${cleanForm}`);
  return parts.join('/');
}

function formPolicyList(value, max = 50) {
  const raw = Array.isArray(value) ? value : cleanText(value || '', 4000).split(/[\n,]/g);
  return raw.map((item) => cleanText(item, 180)).filter(Boolean).slice(0, max);
}

function normalizeFormsNotificationMode(value = 'receipt-only') {
  const mode = normalizeSlug(value || 'receipt-only', 'receipt-only', 80);
  const aliases = {
    email: 'owner-email',
    'owner-email-delivery': 'owner-email',
    owner: 'owner-email',
    queue: 'owner-queue',
    'owner-delivery': 'owner-queue',
    delivery: 'owner-queue'
  };
  return aliases[mode] || mode;
}

function formsNotificationModeWantsDelivery(mode = '') {
  return ['owner-email', 'owner-queue', 'webhook'].includes(normalizeFormsNotificationMode(mode));
}

function formsNotificationDeliveryQueue(env) {
  return env.SKYENET_FORMS_NOTIFICATION_QUEUE
    || env.FORMS_NOTIFICATION_QUEUE
    || env.REQUEST_EVENT_QUEUE
    || env.FS27_REQUEST_EVENT_QUEUE
    || null;
}

function formsNotificationWebhookUrl(env) {
  return cleanText(env.SKYENET_FORMS_NOTIFICATION_WEBHOOK_URL || env.FORMS_NOTIFICATION_WEBHOOK_URL || '', 1000);
}

function sanitizeFormsPolicy(input = {}) {
  const raw = input.forms_policy || input.formsPolicy || input.policy || input;
  const spam = raw.spam_controls || raw.spamControls || {};
  const notifications = raw.notifications || raw.notification || {};
  const linkLimit = Number(spam.link_limit ?? spam.linkLimit ?? spam.max_links ?? spam.maxLinks ?? 8);
  const minElapsedMs = Number(spam.min_elapsed_ms ?? spam.minElapsedMs ?? 0);
  const mode = normalizeFormsNotificationMode(notifications.mode || raw.notification_mode || raw.notificationMode || 'receipt-only');
  const ownerRecipients = formPolicyList(notifications.owner_recipients || notifications.ownerRecipients || notifications.recipients, 20).map((item) => item.toLowerCase());
  const externalDelivery = formsNotificationModeWantsDelivery(mode);
  return {
    schema: 'fs27.skynet.forms_policy.v1',
    updated_at: new Date().toISOString(),
    spam_controls: {
      honeypot_fields: formPolicyList(spam.honeypot_fields || spam.honeypotFields, 20),
      blocked_terms: formPolicyList(spam.blocked_terms || spam.blockedTerms, 80),
      blocked_emails: formPolicyList(spam.blocked_emails || spam.blockedEmails, 80).map((item) => item.toLowerCase()),
      blocked_domains: formPolicyList(spam.blocked_domains || spam.blockedDomains, 80).map((item) => item.toLowerCase().replace(/^@+/, '')),
      link_limit: Number.isFinite(linkLimit) && linkLimit > 0 ? Math.min(100, Math.floor(linkLimit)) : 8,
      min_elapsed_ms: Number.isFinite(minElapsedMs) && minElapsedMs > 0 ? Math.min(10 * 60 * 1000, Math.floor(minElapsedMs)) : 0,
      require_elapsed: truthy(spam.require_elapsed || spam.requireElapsed)
    },
    notifications: {
      mode,
      owner_recipients: ownerRecipients,
      suppress_spam: notifications.suppress_spam === false || notifications.suppressSpam === false ? false : true,
      external_delivery_enabled: externalDelivery,
      receipt_only: !externalDelivery
    }
  };
}

async function attemptFormsOwnerNotificationDelivery(env, context, record, submissionKey, notificationKey, notificationId, notificationPolicy, mode, spamDetected) {
  const recipients = Array.isArray(notificationPolicy.owner_recipients) ? notificationPolicy.owner_recipients.filter(Boolean) : [];
  if (mode === 'disabled') {
    return { status: 'disabled', enabled: false, attempted: false, configured: false, channel: 'disabled', recipient_count: recipients.length, attempts: [] };
  }
  if (spamDetected && notificationPolicy.suppress_spam !== false) {
    return { status: 'suppressed_spam', enabled: formsNotificationModeWantsDelivery(mode), attempted: false, configured: false, channel: mode, recipient_count: recipients.length, attempts: [] };
  }
  if (!formsNotificationModeWantsDelivery(mode)) {
    return { status: 'queued_receipt_only', enabled: false, attempted: false, configured: false, channel: 'receipt-only', recipient_count: recipients.length, attempts: [] };
  }
  if (!recipients.length) {
    return { status: 'delivery_recipient_missing', enabled: true, attempted: false, configured: false, channel: mode, recipient_count: 0, attempts: [] };
  }
  const payload = {
    schema: 'fs27.skynet.forms_notification.delivery.v1',
    notification_id: notificationId,
    notification_key: notificationKey,
    submission_key: submissionKey,
    project_id: context.projectId,
    deployment_id: context.deploymentId,
    workspace_id: context.workspaceId,
    customer_id: context.customerScope?.customer_id || '',
    form_name: cleanText(record.form_name || '', 160),
    submission_id: cleanText(record.submission_id || '', 160),
    recipients,
    delivery_mode: mode,
    provider_hint: mode === 'webhook' ? 'webhook' : 'owner-notification-queue',
    spam_detected: spamDetected,
    fields: Object.keys(record.fields || {}).slice(0, 100),
    queued_at: new Date().toISOString()
  };
  const attempts = [];
  const queue = formsNotificationDeliveryQueue(env);
  if (queue?.send && mode !== 'webhook') {
    try {
      await queue.send(payload);
      attempts.push({ channel: 'queue', provider: 'cloudflare-queue', status: 'accepted', attempted_at: payload.queued_at });
      return { status: 'queued_owner_delivery', enabled: true, attempted: true, configured: true, channel: 'queue', recipient_count: recipients.length, attempts };
    } catch (error) {
      attempts.push({ channel: 'queue', provider: 'cloudflare-queue', status: 'failed', error: cleanText(error?.message || 'queue send failed', 240), attempted_at: new Date().toISOString() });
    }
  }
  const webhookUrl = formsNotificationWebhookUrl(env);
  if (mode === 'webhook' && webhookUrl) {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json; charset=utf-8' },
        body: JSON.stringify(payload)
      });
      attempts.push({ channel: 'webhook', provider: 'configured-webhook', status: response.ok ? 'accepted' : 'failed', http_status: response.status, attempted_at: new Date().toISOString() });
      return { status: response.ok ? 'delivered_owner_webhook' : 'delivery_failed', enabled: true, attempted: true, configured: true, channel: 'webhook', recipient_count: recipients.length, attempts };
    } catch (error) {
      attempts.push({ channel: 'webhook', provider: 'configured-webhook', status: 'failed', error: cleanText(error?.message || 'webhook delivery failed', 240), attempted_at: new Date().toISOString() });
    }
  }
  return { status: attempts.length ? 'delivery_failed' : 'delivery_not_configured', enabled: true, attempted: attempts.length > 0, configured: false, channel: mode, recipient_count: recipients.length, attempts };
}

function formRecordAllowedKey(key, projectId, deploymentId) {
  const cleanKey = cleanText(key || '', MAX_PATH * 2).replace(/^\/+/, '');
  const prefix = formsStoragePrefix(projectId, deploymentId);
  return cleanKey && cleanKey.startsWith(`${prefix}/`) && cleanKey.endsWith('.json') && !cleanKey.includes('/files/');
}

function formFileAllowedKey(key, projectId, deploymentId) {
  const cleanKey = cleanText(key || '', MAX_PATH * 2).replace(/^\/+/, '');
  const prefix = formsStoragePrefix(projectId, deploymentId);
  return cleanKey && cleanKey.startsWith(`${prefix}/`) && cleanKey.includes('/files/');
}

function formSubmissionSummary(record = {}, key = '') {
  const workflow = record.workflow || {};
  const moderation = record.moderation || {};
  return {
    key,
    submission_id: cleanText(record.submission_id || '', 160),
    received_at: cleanText(record.received_at || '', 80),
    form_name: cleanText(record.form_name || '', 160),
    project_id: cleanText(record.project_id || '', 180),
    deployment_id: cleanText(record.deployment_id || '', 180),
    hostname: cleanText(record.hostname || '', 260),
    path: cleanText(record.path || '', 500),
    status: cleanText(workflow.status || 'new', 80),
    spam_detected: record.spam?.detected === true,
    spam_reasons: Array.isArray(record.spam?.reasons) ? record.spam.reasons : [],
    file_count: Number(record.file_count || 0),
    total_file_bytes: Number(record.total_file_bytes || 0),
    field_keys: Object.keys(record.fields || {}).slice(0, 100),
    notification_status: cleanText(record.notification?.status || '', 80),
    notification_receipt_key: cleanText(record.notification?.key || record.notification_receipt_key || '', MAX_PATH * 2),
    moderated_at: cleanText(moderation.updated_at || '', 80),
    updated_at: cleanText(record.updated_at || record.received_at || '', 80)
  };
}

async function r2ListObjects(bucket, prefix, limit = 100) {
  if (!bucket?.list) return { objects: [], list_supported: false };
  const objects = [];
  const max = Math.max(1, Math.min(1000, Math.floor(Number(limit) || 100)));
  let cursor = null;
  let pages = 0;
  do {
    const listed = await bucket.list({ prefix, limit: Math.min(1000, max - objects.length), ...(cursor ? { cursor } : {}) });
    for (const item of listed.objects || []) objects.push(item);
    cursor = listed.cursor || null;
    pages += 1;
    if (!cursor || listed.list_complete !== false || objects.length >= max) {
      return { objects: objects.slice(0, max), cursor, list_supported: true, list_complete: listed.list_complete !== false };
    }
  } while (pages < 10);
  return { objects: objects.slice(0, max), cursor, list_supported: true, list_complete: false };
}

async function resolveFormsDeploymentContext(request, env, input, cors) {
  const auth = await requireDeployAuth(request, cors);
  const principal = authPrincipal(auth);
  const workspaceId = workspaceIdFromInput(input, principal);
  const projectId = normalizeSlug(input.project_id || input.projectId, '', MAX_PROJECT);
  const deploymentId = normalizeSlug(input.deployment_id || input.deploymentId, '', MAX_DEPLOYMENT);
  if (!projectId || !deploymentId) {
    const error = new Error('project_id and deployment_id are required for the SkyeNet Forms inbox.');
    error.status = 400;
    error.code = 'FORMS_DEPLOYMENT_REQUIRED';
    throw error;
  }
  const resolved = await findOwnerScopedDeployment(env, auth, request, input, workspaceId, projectId, deploymentId);
  if (!resolved.deployment) {
    const error = new Error('Deployment not found for SkyeNet Forms inbox.');
    error.status = 404;
    error.code = 'DEPLOYMENT_NOT_FOUND';
    throw error;
  }
  return { auth, principal, workspaceId, projectId, deploymentId, deployment: resolved.deployment, deploymentKey: resolved.key, customerScope: resolved.customerScope };
}

function functionName(value) {
  return normalizeSlug(value || '', '', 120);
}

function functionFileRecord(value) {
  if (typeof value === 'string') return { path: normalizeFunctionBundlePath(value) };
  if (value && typeof value === 'object') {
    const path = normalizeFunctionBundlePath(value.path || value.name || value.bundle_path || value.bundlePath || '');
    return {
      path,
      size: Number(value.size ?? value.bytes ?? 0) || 0,
      sha256: cleanText(value.sha256 || value.hash || '', 160),
      content_type: cleanText(value.content_type || value.contentType || '', 160)
    };
  }
  return null;
}

function functionPathFromRecord(value) {
  if (typeof value === 'string') return normalizeFunctionBundlePath(value);
  if (value && typeof value === 'object') return normalizeFunctionBundlePath(value.path || value.name || value.bundle_path || value.bundlePath || '');
  return '';
}

function dedupeFunctionFiles(files = []) {
  const seen = new Set();
  const out = [];
  for (const item of files) {
    const record = functionFileRecord(item);
    if (!record || seen.has(record.path)) continue;
    seen.add(record.path);
    out.push(record);
  }
  return out;
}

function functionEnvGrantList(value = []) {
  const raw = Array.isArray(value) ? value : cleanText(value || '', 4000).split(/[\n,\s]+/g);
  const seen = new Set();
  const out = [];
  for (const item of raw) {
    const key = cleanText(item, 160).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
    if (out.length >= 64) break;
  }
  return out;
}

function clampFunctionLimits(input = {}, caps = {}) {
  const maxBodyBytes = Math.min(
    MAX_FUNCTION_BODY_BYTES,
    Number(caps.function_body_bytes || MAX_FUNCTION_BODY_BYTES),
    Math.max(1024, Number(input.max_body_bytes || input.maxBodyBytes || MAX_FUNCTION_BODY_BYTES) || MAX_FUNCTION_BODY_BYTES)
  );
  const timeoutMs = Math.min(
    MAX_FUNCTION_TIMEOUT_MS,
    Number(caps.function_timeout_ms || MAX_FUNCTION_TIMEOUT_MS),
    Math.max(100, Number(input.timeout_ms || input.timeoutMs || MAX_FUNCTION_TIMEOUT_MS) || MAX_FUNCTION_TIMEOUT_MS)
  );
  const cpuMs = Math.min(
    MAX_FUNCTION_CPU_MS,
    Number(caps.function_cpu_ms || MAX_FUNCTION_CPU_MS),
    Math.max(1, Number(input.cpu_ms || input.cpuMs || MAX_FUNCTION_CPU_MS) || MAX_FUNCTION_CPU_MS)
  );
  const subRequests = Math.min(
    MAX_FUNCTION_SUBREQUESTS,
    Number(caps.function_subrequests ?? MAX_FUNCTION_SUBREQUESTS),
    Math.max(0, Number(input.subrequests || input.subRequests || input.sub_requests || input.subRequests || MAX_FUNCTION_SUBREQUESTS) || 0)
  );
  return {
    timeout_ms: timeoutMs,
    cpu_ms: cpuMs,
    memory_mb: Math.min(128, Math.max(32, Number(input.memory_mb || input.memoryMb || caps.function_memory_mb || 128) || 128)),
    max_body_bytes: maxBodyBytes,
    subrequests: subRequests,
    egress: 'deny',
    env_grants: functionEnvGrantList(input.env_grants || input.envGrants || input.env || input.env_keys || input.envKeys || [])
  };
}

function sanitizeFunctionRecord(record = {}, caps = {}) {
  const name = functionName(record.name || record.function || record.id);
  const bundlePath = normalizeFunctionBundlePath(record.bundle_path || record.bundlePath || record.path || `functions/${name}.mjs`);
  if (!name) {
    const error = new Error('Function record is missing a valid name.');
    error.status = 400;
    error.code = 'BAD_FUNCTION_NAME';
    throw error;
  }
  if (!bundlePath.startsWith('functions/')) {
    const error = new Error('Function entry bundle_path must live under functions/.');
    error.status = 400;
    error.code = 'BAD_FUNCTION_ENTRY_PATH';
    throw error;
  }
  const scheduleInput = record.schedule && typeof record.schedule === 'object' ? record.schedule : null;
  const cron = cleanText(scheduleInput?.cron || record.cron || '', 120);
  const invocationMode = cron
    ? 'scheduled'
    : (record.invocation_mode === 'background' || record.invocationMode === 'background' || record.background === true ? 'background' : 'request');
  const routes = [
    `/.netlify/functions/${name}`,
    `/.skyenet/functions/${name}`
  ];
  if (invocationMode === 'scheduled') routes.push(`/.skyenet/scheduled/${name}`);
  return {
    name,
    source_path: cleanText(record.source_path || record.sourcePath || '', MAX_PATH),
    bundle_path: bundlePath,
    runtime: 'dynamic-worker',
    adapter: cleanText(record.adapter || 'netlify.handler.v1', 120),
    sha256: cleanText(record.sha256 || record.hash || '', 160).toLowerCase(),
    invocation_mode: invocationMode,
    background: invocationMode === 'background',
    schedule: invocationMode === 'scheduled' ? {
      cron,
      timezone: cleanText(scheduleInput?.timezone || 'UTC', 80) || 'UTC',
      source: cleanText(scheduleInput?.source || 'netlify-function-config', 120)
    } : null,
    routes,
    compatibility: {
      event_context_signature: true,
      statusCode_headers_body_response: true,
      multiValueHeaders: true,
      base64_body: true
    },
    limits: clampFunctionLimits(record.limits || {}, caps)
  };
}

function sanitizeFunctionManifest(manifest = {}, caps = {}) {
  if (!manifest || typeof manifest !== 'object' || manifest.schema !== 'skyenet.functions.bundle.v1') {
    const error = new Error('SkyeNet function bundle manifest must use schema skyenet.functions.bundle.v1.');
    error.status = 400;
    error.code = 'BAD_FUNCTION_MANIFEST_SCHEMA';
    throw error;
  }
  const functions = (Array.isArray(manifest.functions) ? manifest.functions : [])
    .map((item) => sanitizeFunctionRecord(item, caps));
  const modules = dedupeFunctionFiles(manifest.modules || manifest.files || [])
    .filter((item) => item.path !== 'manifest.json');
  if (!functions.length) {
    const error = new Error('SkyeNet function bundle manifest has no functions.');
    error.status = 400;
    error.code = 'FUNCTION_BUNDLE_EMPTY';
    throw error;
  }
  if (functions.length > MAX_FUNCTION_COUNT) {
    const error = new Error(`SkyeNet function bundle declares too many functions; max is ${MAX_FUNCTION_COUNT}.`);
    error.status = 413;
    error.code = 'FUNCTION_COUNT_LIMIT';
    throw error;
  }
  const seen = new Set();
  for (const fn of functions) {
    if (seen.has(fn.name)) {
      const error = new Error(`Duplicate SkyeNet function name: ${fn.name}`);
      error.status = 400;
      error.code = 'DUPLICATE_FUNCTION_NAME';
      throw error;
    }
    seen.add(fn.name);
  }
  return {
    schema: 'skyenet.functions.bundle.v1',
    bundle_id: cleanText(manifest.bundle_id || manifest.bundleId || randomId('skybun'), 160),
    generated_at: cleanText(manifest.generated_at || manifest.generatedAt || new Date().toISOString(), 80),
    tenant_id: cleanText(manifest.tenant_id || manifest.tenantId || '', 160),
    function_count: functions.length,
    background_function_count: functions.filter((fn) => fn.invocation_mode === 'background').length,
    scheduled_function_count: functions.filter((fn) => fn.invocation_mode === 'scheduled').length,
    schedules: functions
      .filter((fn) => fn.schedule?.cron)
      .map((fn) => ({
        function_name: fn.name,
        cron: fn.schedule.cron,
        timezone: fn.schedule.timezone || 'UTC',
        route: `/.skyenet/scheduled/${fn.name}`
      })),
    functions,
    modules,
    runtime_contract: {
      ...(manifest.runtime_contract && typeof manifest.runtime_contract === 'object' ? manifest.runtime_contract : {}),
      isolation: 'cloudflare-dynamic-worker-v1',
      egress_policy: 'globalOutbound:null',
      env_policy: 'deny-by-default'
    },
    signature: manifest.signature && typeof manifest.signature === 'object' ? {
      alg: cleanText(manifest.signature.alg || '', 40),
      key_hint: cleanText(manifest.signature.key_hint || manifest.signature.keyHint || '', 80),
      value: cleanText(manifest.signature.value || '', 220)
    } : null
  };
}

async function verifyFunctionManifestSignature(rawManifest, signingKey, required = true) {
  if (!required) return { ok: true, required: false };
  if (!signingKey) {
    const error = new Error('SKYENET_FUNCTION_BUNDLE_SIGNING_KEY is required before activating signed uploaded functions.');
    error.status = 503;
    error.code = 'SKYENET_FUNCTION_SIGNING_KEY_MISSING';
    throw error;
  }
  if (rawManifest?.signature?.alg !== 'HS256' || !rawManifest?.signature?.value) {
    const error = new Error('SkyeNet function bundle manifest is unsigned.');
    error.status = 403;
    error.code = 'FUNCTION_BUNDLE_UNSIGNED';
    throw error;
  }
  const clone = { ...rawManifest };
  delete clone.signature;
  const expected = await hmacSha256Hex(signingKey, JSON.stringify(clone));
  if (!constantTimeEqualHex(expected, rawManifest.signature.value)) {
    const error = new Error('SkyeNet function bundle signature mismatch.');
    error.status = 403;
    error.code = 'FUNCTION_BUNDLE_SIGNATURE_MISMATCH';
    throw error;
  }
  return { ok: true, alg: 'HS256', key_hint: cleanText(rawManifest.signature.key_hint || '', 80) };
}

async function signFunctionManifestServerSide(manifest, signingKey, auth = {}, request = null) {
  if (!signingKey) {
    const error = new Error('SKYENET_FUNCTION_BUNDLE_SIGNING_KEY is required before SkyeNet can server-sign uploaded functions.');
    error.status = 503;
    error.code = 'SKYENET_FUNCTION_SIGNING_KEY_MISSING';
    throw error;
  }
  const clone = { ...manifest };
  delete clone.signature;
  const value = await hmacSha256Hex(signingKey, JSON.stringify(clone));
  const keyHint = await sha256Hex(encodeUtf8(signingKey));
  return {
    record: {
      alg: 'HS256',
      key_hint: keyHint.slice(0, 12),
      value
    },
    proof: {
      ok: true,
      alg: 'HS256',
      key_hint: keyHint.slice(0, 12),
      server_signed: true,
      requested_by: isAdminPrincipal(auth, request) ? 'owner-admin' : 'skyenet-control-plane'
    }
  };
}

async function auditFunctionBundleFiles(bucket, prefix, manifest = {}) {
  const required = new Map();
  for (const fn of manifest.functions || []) required.set(fn.bundle_path, {
    path: fn.bundle_path,
    sha256: fn.sha256,
    role: 'entry'
  });
  for (const mod of manifest.modules || []) {
    required.set(mod.path, {
      path: mod.path,
      sha256: mod.sha256,
      role: 'module'
    });
  }
  required.set('manifest.json', { path: 'manifest.json', sha256: '', role: 'manifest' });
  const missing = [];
  const hashMismatches = [];
  const unsigned = [];
  const checked = [];
  let totalBytes = 0;
  for (const record of required.values()) {
    const key = `${prefix}/${record.path}`.replace(/\/+/g, '/');
    const object = await deploymentObjectMetadata(bucket, key);
    if (!object) {
      missing.push(record.path);
      continue;
    }
    const size = Number(object.size || 0);
    totalBytes += Number.isFinite(size) ? size : 0;
    if (record.role !== 'manifest') {
      if (!record.sha256) {
        unsigned.push(record.path);
      } else {
        const fullObject = await bucket.get(key).catch(() => null);
        const bytes = fullObject ? await readObjectBytes(fullObject) : new Uint8Array();
        const actual = await sha256Hex(bytes);
        if (actual !== record.sha256) hashMismatches.push({ path: record.path, expected: record.sha256, actual });
      }
    }
    checked.push(record.path);
  }
  return {
    ok: missing.length === 0 && hashMismatches.length === 0 && unsigned.length === 0,
    checked_count: checked.length,
    missing_count: missing.length,
    missing_files: missing,
    unsigned_files: unsigned,
    hash_mismatches: hashMismatches,
    total_bytes: totalBytes
  };
}

function sourceIndexSummaryFromText(text = '') {
  const seen = new Set();
  const inlineFiles = [];
  const sampleFiles = [];
  let fileCount = 0;
  let duplicateCount = 0;
  let totalBytes = 0;
  let lineNumber = 0;
  for (const raw of String(text || '').split(/\r?\n/)) {
    lineNumber += 1;
    const line = raw.trim();
    if (!line) continue;
    let value = line;
    if (line.startsWith('{') || line.startsWith('"')) {
      try {
        value = JSON.parse(line);
      } catch {
        const error = new Error(`Invalid source index JSONL at line ${lineNumber}`);
        error.status = 400;
        error.code = 'BAD_SOURCE_INDEX_LINE';
        throw error;
      }
    }
    const record = sourceFileRecord(value);
    if (!record?.path) continue;
    if (seen.has(record.path)) {
      duplicateCount += 1;
      continue;
    }
    seen.add(record.path);
    fileCount += 1;
    if (fileCount > MAX_SOURCE_INDEX_FILES) {
      const error = new Error(`SkyeNet private source index has more than ${MAX_SOURCE_INDEX_FILES} files.`);
      error.status = 413;
      error.code = 'SOURCE_INDEX_FILE_LIMIT';
      throw error;
    }
    totalBytes += Number(record.size || 0);
    if (inlineFiles.length < MAX_SOURCE_PACKAGE_FILES) inlineFiles.push(record);
    if (sampleFiles.length < 1000) sampleFiles.push(record);
  }
  return {
    file_count: fileCount,
    duplicate_count: duplicateCount,
    total_bytes: totalBytes,
    files: inlineFiles,
    sample_files: sampleFiles,
    files_truncated: fileCount > inlineFiles.length
  };
}

async function putJsonObject(bucket, key, value) {
  await bucket.put(key, JSON.stringify(value, null, 2), {
    httpMetadata: { contentType: 'application/json; charset=utf-8' }
  });
}

function ensureTreeBucket(tree, prefix = '') {
  const key = cleanText(prefix || '', MAX_PATH).replace(/^\/+|\/+$/g, '');
  let bucket = tree.get(key);
  if (!bucket) {
    bucket = { directories: new Map(), files: new Map() };
    tree.set(key, bucket);
  }
  return bucket;
}

function addSourceRecordToTreeIndex(tree, record) {
  const sourcePath = sourcePathFromRecord(record);
  const file = sourceFileRecord(record);
  const parts = sourcePath.split('/').filter(Boolean);
  for (let index = 0; index < parts.length; index += 1) {
    const parent = parts.slice(0, index).join('/');
    const name = parts[index];
    const fullPath = parts.slice(0, index + 1).join('/');
    const bucket = ensureTreeBucket(tree, parent);
    if (index < parts.length - 1) {
      bucket.directories.set(fullPath, { type: 'directory', name, path: fullPath });
    } else {
      bucket.files.set(fullPath, {
        type: 'file',
        name,
        path: fullPath,
        size: file?.size || 0,
        sha256: file?.sha256 || '',
        content_type: file?.content_type || contentTypeForPath(fullPath)
      });
    }
  }
}

async function materializeSourceIndexArtifacts(bucket, sourcePackage, text = '', context = {}) {
  const now = new Date().toISOString();
  const seen = new Set();
  const inlineFiles = [];
  const sampleFiles = [];
  const tree = new Map();
  let treeMaterialized = true;
  let pageFiles = [];
  let pageIndex = 0;
  let fileCount = 0;
  let duplicateCount = 0;
  let totalBytes = 0;
  let lineNumber = 0;

  const indexPagePrefix = sourceIndexPagePrefixForPackage(sourcePackage);
  const treeIndexPrefix = sourceTreeIndexPrefixForPackage(sourcePackage);
  const flushIndexPage = async () => {
    if (!pageFiles.length) return;
    await putJsonObject(bucket, sourceIndexPageKey(sourcePackage, pageIndex), {
      schema: 'fs27.skynet.source_index_page.v1',
      page: pageIndex,
      page_size: SOURCE_INDEX_PAGE_SIZE,
      count: pageFiles.length,
      files: sourceRecordListForResponse(pageFiles)
    });
    pageIndex += 1;
    pageFiles = [];
  };

  for (const raw of String(text || '').split(/\r?\n/)) {
    lineNumber += 1;
    const line = raw.trim();
    if (!line) continue;
    let value = line;
    if (line.startsWith('{') || line.startsWith('"')) {
      try {
        value = JSON.parse(line);
      } catch {
        const error = new Error(`Invalid source index JSONL at line ${lineNumber}`);
        error.status = 400;
        error.code = 'BAD_SOURCE_INDEX_LINE';
        throw error;
      }
    }
    const record = sourceFileRecord(value);
    if (!record?.path) continue;
    if (seen.has(record.path)) {
      duplicateCount += 1;
      continue;
    }
    seen.add(record.path);
    fileCount += 1;
    if (fileCount > MAX_SOURCE_INDEX_FILES) {
      const error = new Error(`SkyeNet private source index has more than ${MAX_SOURCE_INDEX_FILES} files.`);
      error.status = 413;
      error.code = 'SOURCE_INDEX_FILE_LIMIT';
      throw error;
    }
    totalBytes += Number(record.size || 0);
    if (inlineFiles.length < MAX_SOURCE_PACKAGE_FILES) inlineFiles.push(record);
    if (sampleFiles.length < 1000) sampleFiles.push(record);
    pageFiles.push(record);
    if (treeMaterialized && fileCount <= SOURCE_TREE_MATERIALIZE_FILE_LIMIT) {
      addSourceRecordToTreeIndex(tree, record);
    } else if (treeMaterialized) {
      treeMaterialized = false;
      tree.clear();
    }
    if (pageFiles.length >= SOURCE_INDEX_PAGE_SIZE) await flushIndexPage();
  }
  await flushIndexPage();

  const indexPages = {
    schema: 'fs27.skynet.source_index_pages.v1',
    prefix: indexPagePrefix,
    page_size: SOURCE_INDEX_PAGE_SIZE,
    page_count: pageIndex,
    file_count: fileCount,
    duplicate_count: duplicateCount,
    total_bytes: totalBytes,
    generated_at: now
  };
  if (indexPagePrefix) await putJsonObject(bucket, `${indexPagePrefix}/meta.json`, indexPages);

  let treePrefixCount = 0;
  let treePageCount = 0;
  if (treeMaterialized) {
    for (const [rawPrefix, groups] of tree.entries()) {
      const entries = [
        ...[...groups.directories.values()].sort((a, b) => a.path.localeCompare(b.path)),
        ...[...groups.files.values()].sort((a, b) => a.path.localeCompare(b.path))
      ];
      const pageCount = Math.max(1, Math.ceil(entries.length / SOURCE_INDEX_PAGE_SIZE));
      const meta = {
        schema: 'fs27.skynet.source_tree_meta.v1',
        prefix: rawPrefix,
        entry_count: entries.length,
        page_size: SOURCE_INDEX_PAGE_SIZE,
        page_count: pageCount,
        generated_at: now
      };
      await putJsonObject(bucket, sourceTreeMetaKey(sourcePackage, rawPrefix), meta);
      for (let page = 0; page < pageCount; page += 1) {
        const pageEntries = entries.slice(page * SOURCE_INDEX_PAGE_SIZE, (page + 1) * SOURCE_INDEX_PAGE_SIZE);
        await putJsonObject(bucket, sourceTreePageKey(sourcePackage, rawPrefix, page), {
          schema: 'fs27.skynet.source_tree_page.v1',
          prefix: rawPrefix,
          page,
          page_size: SOURCE_INDEX_PAGE_SIZE,
          count: pageEntries.length,
          entries: pageEntries
        });
        treePageCount += 1;
      }
      treePrefixCount += 1;
    }
  }
  const treeIndex = {
    schema: 'fs27.skynet.source_tree_index.v1',
    prefix: treeIndexPrefix,
    mode: treeMaterialized ? 'materialized-prefix-pages' : 'on-demand-from-paged-source-index',
    page_size: SOURCE_INDEX_PAGE_SIZE,
    prefix_count: treePrefixCount,
    page_count: treePageCount,
    materialized_file_limit: SOURCE_TREE_MATERIALIZE_FILE_LIMIT,
    generated_at: now
  };
  if (treeIndexPrefix) await putJsonObject(bucket, `${treeIndexPrefix}/meta.json`, treeIndex);

  return {
    file_count: fileCount,
    duplicate_count: duplicateCount,
    total_bytes: totalBytes,
    files: inlineFiles,
    sample_files: sampleFiles,
    files_truncated: fileCount > inlineFiles.length,
    index_pages: indexPages,
    tree_index: treeIndex,
    materialized: {
      index_page_count: pageIndex,
      tree_prefix_count: treePrefixCount,
      tree_page_count: treePageCount,
      generated_at: now,
      ...context
    }
  };
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
  const indexPages = sourcePackage.index_pages || sourcePackage.indexPages || null;
  const treeIndex = sourcePackage.tree_index || sourcePackage.treeIndex || null;
  return {
    mode: sourcePackage.mode || 'private-full-project',
    prefix: sourcePackage.prefix || '',
    file_count: Number(sourcePackage.file_count || 0),
    total_bytes: Number(sourcePackage.total_bytes || 0),
    downloadable: sourcePackage.downloadable !== false,
    manifest_key: sourcePackage.manifest_key || sourceManifestKeyForPackage(sourcePackage),
    index_key: sourcePackage.index_key || sourceIndexKeyForPackage(sourcePackage),
    index_file_count: Number(sourcePackage.index_file_count || sourcePackage.file_count || 0),
    index_pages: indexPages ? {
      prefix: indexPages.prefix || sourceIndexPagePrefixForPackage(sourcePackage),
      page_size: Number(indexPages.page_size || SOURCE_INDEX_PAGE_SIZE),
      page_count: Number(indexPages.page_count || 0),
      file_count: Number(indexPages.file_count || sourcePackage.file_count || 0)
    } : null,
    tree_index: treeIndex ? {
      prefix: treeIndex.prefix || sourceTreeIndexPrefixForPackage(sourcePackage),
      page_size: Number(treeIndex.page_size || SOURCE_INDEX_PAGE_SIZE),
      prefix_count: Number(treeIndex.prefix_count || 0),
      page_count: Number(treeIndex.page_count || 0)
    } : null,
    files_inline: Array.isArray(sourcePackage.files) ? sourcePackage.files.length : 0,
    files_truncated: Boolean(sourcePackage.files_truncated),
    archive: sourcePackage.archive ? {
      key: sourcePackage.archive.key || '',
      filename: sourcePackage.archive.filename || '',
      bytes: Number(sourcePackage.archive.bytes || 0),
      sha256: sourcePackage.archive.sha256 || '',
      hash_verified: trueFlag(sourcePackage.archive.hash_verified),
      hash_verification_status: sourcePackage.archive.hash_verification_status || '',
      content_type: sourcePackage.archive.content_type || 'application/octet-stream',
      downloadable: sourcePackage.archive.downloadable !== false
    } : null,
    public_asset_exposure: sourcePackage.public_asset_exposure === false ? false : 'public_assets_only',
    completed_at: sourcePackage.completed_at || '',
    updated_at: sourcePackage.updated_at || ''
  };
}

function normalizeArchiveFilename(value, projectId = 'project', deploymentId = 'deployment') {
  const raw = cleanText(value || '', 240).split('/').pop().replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return raw || `${safeDownloadName(projectId, deploymentId, 'source-archive')}.tar`;
}

function sourceArchiveForPackage(sourcePackage = {}) {
  const archive = sourcePackage?.archive && typeof sourcePackage.archive === 'object' ? sourcePackage.archive : null;
  if (!archive?.key) return null;
  return {
    key: cleanText(archive.key, MAX_PATH * 2).replace(/^\/+/, ''),
    filename: normalizeArchiveFilename(archive.filename || archive.name || archive.key.split('/').pop()),
    bytes: Number(archive.bytes || archive.size || 0),
    sha256: cleanText(archive.sha256 || '', 160),
    supplied_sha256: cleanText(archive.supplied_sha256 || archive.suppliedSha256 || '', 160),
    hash_verified: trueFlag(archive.hash_verified ?? archive.hashVerified),
    hash_verification_status: cleanText(archive.hash_verification_status || archive.hashVerificationStatus || '', 160),
    hash_verification_method: cleanText(archive.hash_verification_method || archive.hashVerificationMethod || '', 180),
    hash_verification_skipped_reason: cleanText(archive.hash_verification_skipped_reason || archive.hashVerificationSkippedReason || '', 240),
    content_type: cleanText(archive.content_type || archive.contentType || 'application/octet-stream', 160) || 'application/octet-stream',
    bucket_binding: cleanText(archive.bucket_binding || archive.bucketBinding || '', 120),
    downloadable: archive.downloadable !== false,
    uploaded_at: archive.uploaded_at || archive.created_at || ''
  };
}

function parseByteRangeHeader(value = '', size = 0) {
  const raw = cleanText(value || '', 120);
  if (!raw) return null;
  const match = raw.match(/^bytes=(\d*)-(\d*)$/i);
  if (!match) return { invalid: true };
  const total = Number(size || 0);
  if (!Number.isFinite(total) || total <= 0) return { invalid: true };
  const startText = match[1];
  const endText = match[2];
  if (!startText && !endText) return { invalid: true };
  let start;
  let end;
  if (!startText) {
    const suffixLength = Number(endText);
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) return { invalid: true };
    start = Math.max(0, total - suffixLength);
    end = total - 1;
  } else {
    start = Number(startText);
    end = endText ? Number(endText) : total - 1;
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || start >= total) return { invalid: true };
  return {
    start,
    end: Math.min(end, total - 1),
    size: total,
    length: Math.min(end, total - 1) - start + 1
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

function sourceCodebaseRecordPrefix(customerId, workspaceId) {
  return `skynet:codebase:v1:customer:${customerId}:workspace:${workspaceId}:`;
}

function sourceCodebaseProjectPrefix(customerId, workspaceId, projectId) {
  return `${sourceCodebaseRecordPrefix(customerId, workspaceId)}project:${projectId}:`;
}

function sourceCodebaseRecordKey(customerId, workspaceId, projectId, deploymentId, mountId) {
  return `${sourceCodebaseProjectPrefix(customerId, workspaceId, projectId)}deployment:${deploymentId}:mount:${mountId}`;
}

function sourceCodebaseMountId(method, transferId, suffix = '') {
  return normalizeSlug([method, transferId, suffix].filter(Boolean).join('-'), 'codebase-mount', 180);
}

function sourceCodebaseRecordForResponse(record = {}) {
  if (!record || typeof record !== 'object') return null;
  return {
    schema: record.schema || 'fs27.skynet.codebase_mount.v1',
    mount_id: record.mount_id || '',
    status: record.status || 'active',
    codebase_kind: record.codebase_kind || 'skyenet-source-custody',
    relation: record.relation || '',
    customer_id: record.customer_id || '',
    source_owner_customer_id: record.source_owner_customer_id || record.customer_id || '',
    requested_by_customer_id: record.requested_by_customer_id || '',
    workspace_id: record.workspace_id || '',
    project_id: record.project_id || '',
    deployment_id: record.deployment_id || '',
    live_url: record.live_url || '',
    source_mode: record.source_mode || 'private-full-project',
    source_package: record.source_package || null,
    storage: record.storage || null,
    archive: record.archive || null,
    mount: record.mount || null,
    access_policy: record.access_policy || null,
    transfer_policy: record.transfer_policy || null,
    read_endpoints: record.read_endpoints || null,
    mcp: record.mcp || null,
    created_at: record.created_at || '',
    updated_at: record.updated_at || ''
  };
}

async function findSourceCodebaseGrant(env, customerId, workspaceId, projectId, deploymentId) {
  const kv = receiptKv(env);
  const rows = await kvListJson(kv, sourceCodebaseProjectPrefix(customerId, workspaceId, projectId), 500);
  return rows
    .map((row) => row.value)
    .filter((record) => record?.schema === 'fs27.skynet.codebase_mount.v1'
      && record.status !== 'revoked'
      && String(record.deployment_id || '') === String(deploymentId)
      && record.access_policy?.read_source_granted === true
      && record.source_owner_customer_id)
    .sort((a, b) => String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || '')))[0] || null;
}

async function listSourceCodebaseRecords(env, customerId, workspaceId, options = {}) {
  const projectId = normalizeSlug(options.project_id || options.projectId || '', '', MAX_PROJECT);
  const deploymentId = normalizeSlug(options.deployment_id || options.deploymentId || '', '', MAX_DEPLOYMENT);
  const prefix = projectId
    ? sourceCodebaseProjectPrefix(customerId, workspaceId, projectId)
    : sourceCodebaseRecordPrefix(customerId, workspaceId);
  const rows = await kvListJson(receiptKv(env), prefix, Number(options.limit || 500));
  return rows
    .map((row) => sourceCodebaseRecordForResponse(row.value))
    .filter((record) => record?.schema === 'fs27.skynet.codebase_mount.v1')
    .filter((record) => !projectId || record.project_id === projectId)
    .filter((record) => !deploymentId || record.deployment_id === deploymentId)
    .sort((a, b) => String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || '')));
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

function normalizeSha256Digest(value = '') {
  const digest = cleanText(value || '', 160).trim().toLowerCase();
  return /^[a-f0-9]{64}$/.test(digest) ? digest : '';
}

function sourceArchiveHashVerifyLimit(env = {}) {
  const configured = Number(env?.SKYENET_SOURCE_ARCHIVE_SERVER_VERIFY_BYTES || env?.SOURCE_ARCHIVE_SERVER_VERIFY_BYTES || 0);
  if (Number.isFinite(configured) && configured > 0) return Math.max(1, configured);
  return MAX_SOURCE_ARCHIVE_SERVER_VERIFY_BYTES;
}

function sourceArchiveObjectMetadata(object = {}) {
  return object?.customMetadata && typeof object.customMetadata === 'object' ? object.customMetadata : {};
}

function sourceArchiveMetadataVerified(metadata = {}, expectedSha256 = '') {
  const metadataSha256 = normalizeSha256Digest(metadata.sha256 || metadata.source_archive_sha256 || '');
  const expected = normalizeSha256Digest(expectedSha256);
  if (!metadataSha256) return false;
  if (expected && metadataSha256 !== expected) return false;
  return String(metadata.hash_verified || metadata.sha256_verified || '').toLowerCase() === 'true'
    || String(metadata.hash_verification_status || '').toLowerCase() === 'verified';
}

function sourceArchiveIntegrityMetadata(integrity = {}, suppliedSha256 = '') {
  return {
    sha256: integrity.sha256 || suppliedSha256 || '',
    supplied_sha256: suppliedSha256 || '',
    hash_verified: String(Boolean(integrity.hash_verified)),
    hash_verification_status: integrity.hash_verification_status || (integrity.hash_verified ? 'verified' : 'unverified'),
    hash_verification_method: integrity.hash_verification_method || '',
    hash_verification_skipped_reason: integrity.hash_verification_skipped_reason || ''
  };
}

async function verifyStoredSourceArchiveIntegrity(bucket, key, options = {}) {
  const expectedSha256 = normalizeSha256Digest(options.expectedSha256 || options.sha256 || '');
  const expectedBytes = Number(options.expectedBytes || options.bytes || 0);
  const verifyLimit = sourceArchiveHashVerifyLimit(options.env || {});
  const head = bucket?.head ? await bucket.head(key).catch(() => null) : null;
  const storedBytes = Number(head?.size || expectedBytes || 0);
  if (expectedBytes > 0 && storedBytes > 0 && expectedBytes !== storedBytes) {
    return {
      ok: false,
      status: 409,
      code: 'SOURCE_ARCHIVE_SIZE_MISMATCH',
      error: 'Source archive byte count does not match the object stored in SkyeNet private storage.',
      declared_bytes: expectedBytes,
      stored_bytes: storedBytes
    };
  }
  const metadata = sourceArchiveObjectMetadata(head);
  const metadataSha256 = normalizeSha256Digest(metadata.sha256 || metadata.source_archive_sha256 || '');
  if (sourceArchiveMetadataVerified(metadata, expectedSha256)) {
    return {
      ok: true,
      sha256: metadataSha256,
      bytes: storedBytes,
      hash_verified: true,
      hash_verification_status: 'verified',
      hash_verification_method: 'r2-platform-verified-metadata',
      hash_verification_skipped_reason: ''
    };
  }
  if (!bucket?.get) {
    return {
      ok: true,
      sha256: expectedSha256 || metadataSha256,
      bytes: storedBytes,
      hash_verified: false,
      hash_verification_status: 'unverified',
      hash_verification_method: '',
      hash_verification_skipped_reason: 'source-archive-bucket-read-unavailable'
    };
  }
  if (storedBytes > verifyLimit) {
    return {
      ok: true,
      sha256: expectedSha256 || metadataSha256,
      bytes: storedBytes,
      hash_verified: false,
      hash_verification_status: 'unverified-too-large-for-sync-hash',
      hash_verification_method: '',
      hash_verification_skipped_reason: `source-archive-exceeds-server-side-sync-hash-limit-${verifyLimit}`
    };
  }
  const object = await bucket.get(key).catch(() => null);
  if (!object) {
    return {
      ok: false,
      status: 404,
      code: 'SOURCE_ARCHIVE_OBJECT_NOT_FOUND',
      error: 'Source archive object was not found in SkyeNet private storage.'
    };
  }
  const bytes = await readObjectBytes(object);
  if (expectedBytes > 0 && bytes.byteLength !== expectedBytes) {
    return {
      ok: false,
      status: 409,
      code: 'SOURCE_ARCHIVE_SIZE_MISMATCH',
      error: 'Source archive byte count does not match the object stored in SkyeNet private storage.',
      declared_bytes: expectedBytes,
      stored_bytes: bytes.byteLength
    };
  }
  const actualSha256 = await sha256Hex(bytes);
  if (expectedSha256 && actualSha256 !== expectedSha256) {
    return {
      ok: false,
      status: 409,
      code: 'SOURCE_ARCHIVE_SHA_MISMATCH',
      error: 'Source archive SHA-256 does not match the object stored in SkyeNet private storage.',
      expected_sha256: expectedSha256,
      actual_sha256: actualSha256,
      bytes: bytes.byteLength
    };
  }
  return {
    ok: true,
    sha256: actualSha256,
    bytes: bytes.byteLength,
    hash_verified: true,
    hash_verification_status: 'verified',
    hash_verification_method: 'server-side-sha256',
    hash_verification_skipped_reason: ''
  };
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

async function deploymentObjectMetadata(bucket, key) {
  if (bucket?.head) return bucket.head(key).catch(() => null);
  if (bucket?.get) return bucket.get(key).catch(() => null);
  return null;
}

async function auditDeploymentFiles(bucket, prefix, files, options = {}) {
  const concurrency = Math.max(1, Math.min(32, Number(options.concurrency || 16)));
  const maxMissing = Math.max(1, Math.min(250, Number(options.max_missing || options.maxMissing || 50)));
  let index = 0;
  let totalBytes = 0;
  const missing = [];
  const checked = [];
  async function worker() {
    while (index < files.length && missing.length < maxMissing) {
      const file = files[index];
      index += 1;
      const key = `${prefix}/${file}`.replace(/\/+/g, '/');
      const object = await deploymentObjectMetadata(bucket, key);
      if (!object) {
        missing.push(file);
        continue;
      }
      checked.push(file);
      const size = Number(object.size || 0);
      if (Number.isFinite(size) && size > 0) totalBytes += size;
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, Math.max(files.length, 1)) }, () => worker()));
  return {
    ok: missing.length === 0,
    checked_count: checked.length,
    missing_count: missing.length,
    missing_files: missing,
    total_bytes: totalBytes
  };
}

async function auditSourcePackageFiles(bucket, prefix, records, options = {}) {
  const files = dedupeSourceFiles(records);
  const paths = files.map((file) => file.path);
  const audit = await auditDeploymentFiles(bucket, prefix, paths, options);
  return {
    ...audit,
    file_count: files.length,
    storage_verified: audit.ok && audit.checked_count === files.length
  };
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
  // Private source custody is owner-gated and must preserve the original package path list.
  // Public deployment assets still use normalizeAssetPath, which keeps public uploads strict.
  return parts.join('/');
}

function normalizeFunctionBundlePath(value) {
  const bundlePath = normalizeSourcePath(value).replace(/^\.skyenet\/functions-bundle\//i, '');
  const lower = bundlePath.toLowerCase();
  if (lower === 'manifest.json') return 'manifest.json';
  if (lower === 'build-receipt.json') return 'build-receipt.json';
  if (/^(functions|modules|lib|shared|src)\/.+\.(mjs|js|cjs|json)$/i.test(bundlePath)) return bundlePath;
  const error = new Error('SkyeNet function bundles only accept manifest.json, build-receipt.json, plus JS/JSON modules under functions/, modules/, lib/, shared/, or src/.');
  error.status = 400;
  error.code = 'BAD_FUNCTION_BUNDLE_PATH';
  throw error;
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

async function hmacSha256Hex(secret, value) {
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    encodeUtf8(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await globalThis.crypto.subtle.sign('HMAC', key, encodeUtf8(value));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqualHex(left, right) {
  const a = String(left || '').toLowerCase();
  const b = String(right || '').toLowerCase();
  if (!/^[0-9a-f]+$/.test(a) || !/^[0-9a-f]+$/.test(b) || a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return diff === 0;
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

function tarHeaderString(header, offset, length) {
  let out = '';
  const end = Math.min(header.byteLength, offset + length);
  for (let index = offset; index < end; index += 1) {
    const byte = header[index];
    if (!byte) break;
    out += String.fromCharCode(byte);
  }
  return out.trim();
}

function tarHeaderOctal(header, offset, length) {
  const raw = tarHeaderString(header, offset, length).replace(/\0/g, '').trim();
  if (!raw) return 0;
  return Number.parseInt(raw.replace(/[^0-7]/g, '') || '0', 8) || 0;
}

function tarHeaderIsZero(header) {
  if (!header || header.byteLength < 512) return true;
  for (let index = 0; index < 512; index += 1) {
    if (header[index] !== 0) return false;
  }
  return true;
}

function tarPaddedSize(size) {
  const bytes = Math.max(0, Number(size || 0));
  const remainder = bytes % 512;
  return bytes + (remainder ? 512 - remainder : 0);
}

function tarPathFromHeader(header, overridePath = '') {
  if (overridePath) return normalizeSourcePath(overridePath);
  const name = tarHeaderString(header, 0, 100);
  const prefix = tarHeaderString(header, 345, 155);
  return normalizeSourcePath(prefix ? `${prefix}/${name}` : name);
}

function parseTarPaxRecords(text = '') {
  const records = {};
  let offset = 0;
  while (offset < text.length) {
    const space = text.indexOf(' ', offset);
    if (space < 0) break;
    const length = Number(text.slice(offset, space));
    if (!Number.isFinite(length) || length <= 0) break;
    const record = text.slice(space + 1, offset + length).replace(/\n$/, '');
    const equal = record.indexOf('=');
    if (equal > 0) records[record.slice(0, equal)] = record.slice(equal + 1);
    offset += length;
  }
  return records;
}

function sourceArchiveSupportsLazyTar(archive = {}) {
  const filename = String(archive.filename || archive.name || archive.key || '').toLowerCase();
  const contentType = String(archive.content_type || archive.contentType || '').toLowerCase();
  if (/\.(?:zst|gz|tgz|zip|br|bz2|xz)$/.test(filename)) return false;
  if (/zstd|gzip|zip|brotli|bzip|xz/.test(contentType)) return false;
  return filename.endsWith('.tar') || contentType.includes('tar') || contentType === 'application/octet-stream';
}

function sourceArchiveTarCompression(archive = {}) {
  const filename = String(archive.filename || archive.name || archive.key || '').toLowerCase();
  const contentType = String(archive.content_type || archive.contentType || '').toLowerCase();
  if (filename.endsWith('.tar.gz') || filename.endsWith('.tgz') || contentType.includes('gzip')) return 'gzip';
  if (filename.endsWith('.tar.zst') || filename.endsWith('.tzst') || contentType.includes('zstd')) return 'zstd';
  if (filename.endsWith('.tar.br') || contentType.includes('brotli')) return 'brotli';
  if (filename.endsWith('.tar.bz2') || contentType.includes('bzip')) return 'bzip2';
  if (filename.endsWith('.tar.xz') || contentType.includes('xz')) return 'xz';
  if (filename.endsWith('.zip') || contentType.includes('zip')) return 'zip';
  return '';
}

function objectReadableStream(object) {
  if (!object) return null;
  if (object.body && typeof object.body.getReader === 'function') return object.body;
  return new ReadableStream({
    async start(controller) {
      controller.enqueue(await readObjectBytes(object));
      controller.close();
    }
  });
}

function readU16LE(bytes, offset) {
  return (bytes[offset] || 0) | ((bytes[offset + 1] || 0) << 8);
}

function readU32LE(bytes, offset) {
  return ((bytes[offset] || 0)
    | ((bytes[offset + 1] || 0) << 8)
    | ((bytes[offset + 2] || 0) << 16)
    | ((bytes[offset + 3] || 0) << 24)) >>> 0;
}

function readU64LE(bytes, offset) {
  let value = 0n;
  for (let index = 7; index >= 0; index -= 1) {
    value = (value << 8n) + BigInt(bytes[offset + index] || 0);
  }
  return value > BigInt(Number.MAX_SAFE_INTEGER) ? null : Number(value);
}

function zipExtraField(bytes, offset, length, headerId) {
  const end = Math.min(bytes.byteLength, offset + Math.max(0, Number(length || 0)));
  let cursor = offset;
  while (cursor + 4 <= end) {
    const id = readU16LE(bytes, cursor);
    const size = readU16LE(bytes, cursor + 2);
    const dataOffset = cursor + 4;
    if (dataOffset + size > end) break;
    if (id === headerId) return bytes.subarray(dataOffset, dataOffset + size);
    cursor = dataOffset + size;
  }
  return new Uint8Array();
}

function zip64CentralValues(extra, flags = {}) {
  const out = {};
  let cursor = 0;
  const read = () => {
    if (cursor + 8 > extra.byteLength) return null;
    const value = readU64LE(extra, cursor);
    cursor += 8;
    return value;
  };
  if (flags.uncompressed) out.uncompressed_size = read();
  if (flags.compressed) out.compressed_size = read();
  if (flags.localOffset) out.local_header_offset = read();
  return out;
}

function findZipEndOfCentralDirectory(tail) {
  for (let offset = tail.byteLength - 22; offset >= 0; offset -= 1) {
    if (readU32LE(tail, offset) === 0x06054b50) return offset;
  }
  return -1;
}

async function readZipDirectoryInfo(bucket, archive) {
  const archiveSize = Number(archive.bytes || 0);
  if (!Number.isFinite(archiveSize) || archiveSize <= 0) {
    return { ok: false, code: 'SOURCE_ZIP_ARCHIVE_SIZE_REQUIRED' };
  }
  const tailLength = Math.min(archiveSize, 22 + 65535 + 20);
  const tailOffset = Math.max(0, archiveSize - tailLength);
  const tail = await readBucketRangeBytes(bucket, archive.key, tailOffset, tailLength);
  const eocdOffset = findZipEndOfCentralDirectory(tail);
  if (eocdOffset < 0) return { ok: false, code: 'SOURCE_ZIP_EOCD_NOT_FOUND' };
  const eocdAbsOffset = tailOffset + eocdOffset;
  let entryCount = readU16LE(tail, eocdOffset + 10);
  let cdSize = readU32LE(tail, eocdOffset + 12);
  let cdOffset = readU32LE(tail, eocdOffset + 16);
  if (entryCount === 0xffff || cdSize === 0xffffffff || cdOffset === 0xffffffff) {
    const locatorOffset = eocdAbsOffset - 20;
    if (locatorOffset < 0) return { ok: false, code: 'SOURCE_ZIP64_LOCATOR_NOT_FOUND' };
    const locator = await readBucketRangeBytes(bucket, archive.key, locatorOffset, 20);
    if (locator.byteLength < 20 || readU32LE(locator, 0) !== 0x07064b50) {
      return { ok: false, code: 'SOURCE_ZIP64_LOCATOR_NOT_FOUND' };
    }
    const zip64EocdOffset = readU64LE(locator, 8);
    if (zip64EocdOffset === null) return { ok: false, code: 'SOURCE_ZIP64_OFFSET_TOO_LARGE' };
    const zip64 = await readBucketRangeBytes(bucket, archive.key, zip64EocdOffset, 76);
    if (zip64.byteLength < 76 || readU32LE(zip64, 0) !== 0x06064b50) {
      return { ok: false, code: 'SOURCE_ZIP64_EOCD_NOT_FOUND' };
    }
    const zip64Entries = readU64LE(zip64, 32);
    const zip64CdSize = readU64LE(zip64, 40);
    const zip64CdOffset = readU64LE(zip64, 48);
    if ([zip64Entries, zip64CdSize, zip64CdOffset].some((value) => value === null)) {
      return { ok: false, code: 'SOURCE_ZIP64_VALUES_TOO_LARGE' };
    }
    entryCount = zip64Entries;
    cdSize = zip64CdSize;
    cdOffset = zip64CdOffset;
  }
  if (cdSize > MAX_SOURCE_ARCHIVE_ZIP_CENTRAL_DIRECTORY_BYTES) {
    return {
      ok: false,
      code: 'SOURCE_ZIP_CENTRAL_DIRECTORY_TOO_LARGE',
      central_directory_bytes: cdSize,
      limit: MAX_SOURCE_ARCHIVE_ZIP_CENTRAL_DIRECTORY_BYTES
    };
  }
  return { ok: true, entry_count: entryCount, central_directory_offset: cdOffset, central_directory_size: cdSize };
}

function zipFileName(bytes, offset, length, flags = 0) {
  const data = bytes.subarray(offset, offset + length);
  try {
    return new TextDecoder((flags & 0x0800) ? 'utf-8' : 'utf-8').decode(data);
  } catch {
    return '';
  }
}

function zipMethodLabel(method) {
  if (method === 0) return 'store';
  if (method === 8) return 'deflate';
  return `method-${method}`;
}

async function readSourceFileFromZipArchive(env, sourcePackage, sourcePath, options = {}) {
  const archive = sourceArchiveForPackage(sourcePackage || {});
  if (!archive?.key) return null;
  const compression = sourceArchiveTarCompression(archive);
  if (compression !== 'zip') return null;
  const bucket = sourceTransferBucket(env) || deploymentBucket(env);
  if (!bucket?.get) return null;
  const directory = await readZipDirectoryInfo(bucket, archive);
  if (!directory.ok) {
    return {
      found: false,
      unsupported: true,
      code: directory.code || 'SOURCE_ZIP_DIRECTORY_UNREADABLE',
      archive,
      compression,
      zip: directory
    };
  }
  const central = await readBucketRangeBytes(bucket, archive.key, directory.central_directory_offset, directory.central_directory_size);
  const target = normalizeSourcePath(sourcePath);
  let cursor = 0;
  let scannedEntries = 0;
  while (cursor + 46 <= central.byteLength) {
    if (readU32LE(central, cursor) !== 0x02014b50) break;
    const flags = readU16LE(central, cursor + 8);
    const method = readU16LE(central, cursor + 10);
    let compressedSize = readU32LE(central, cursor + 20);
    let uncompressedSize = readU32LE(central, cursor + 24);
    const fileNameLength = readU16LE(central, cursor + 28);
    const extraLength = readU16LE(central, cursor + 30);
    const commentLength = readU16LE(central, cursor + 32);
    let localHeaderOffset = readU32LE(central, cursor + 42);
    const nameOffset = cursor + 46;
    const extraOffset = nameOffset + fileNameLength;
    const next = extraOffset + extraLength + commentLength;
    if (next > central.byteLength) break;
    scannedEntries += 1;
    const entryPath = normalizeSourcePath(zipFileName(central, nameOffset, fileNameLength, flags));
    const zip64 = zipExtraField(central, extraOffset, extraLength, 0x0001);
    if (zip64.byteLength) {
      const values = zip64CentralValues(zip64, {
        uncompressed: uncompressedSize === 0xffffffff,
        compressed: compressedSize === 0xffffffff,
        localOffset: localHeaderOffset === 0xffffffff
      });
      if (values.uncompressed_size !== undefined) uncompressedSize = values.uncompressed_size;
      if (values.compressed_size !== undefined) compressedSize = values.compressed_size;
      if (values.local_header_offset !== undefined) localHeaderOffset = values.local_header_offset;
    }
    if (entryPath === target && !entryPath.endsWith('/')) {
      if (![0, 8].includes(method)) {
        return {
          found: false,
          unsupported: true,
          code: 'SOURCE_ZIP_COMPRESSION_METHOD_UNSUPPORTED',
          archive,
          compression,
          zip_method: method,
          zip_method_label: zipMethodLabel(method)
        };
      }
      if (compressedSize > MAX_SOURCE_ARCHIVE_ZIP_ENTRY_BYTES || uncompressedSize > MAX_SOURCE_ARCHIVE_ZIP_ENTRY_BYTES) {
        return {
          found: false,
          unsupported: true,
          code: 'SOURCE_ZIP_ENTRY_TOO_LARGE_FOR_LAZY_READ',
          archive,
          compression,
          compressed_size: compressedSize,
          uncompressed_size: uncompressedSize,
          limit: MAX_SOURCE_ARCHIVE_ZIP_ENTRY_BYTES
        };
      }
      const localHeader = await readBucketRangeBytes(bucket, archive.key, localHeaderOffset, 30);
      if (localHeader.byteLength < 30 || readU32LE(localHeader, 0) !== 0x04034b50) {
        return { found: false, archive, compression, scanned_entries: scannedEntries, code: 'SOURCE_ZIP_LOCAL_HEADER_NOT_FOUND' };
      }
      const localNameLength = readU16LE(localHeader, 26);
      const localExtraLength = readU16LE(localHeader, 28);
      const dataOffset = localHeaderOffset + 30 + localNameLength + localExtraLength;
      const compressedBytes = await readBucketRangeBytes(bucket, archive.key, dataOffset, compressedSize);
      const bytes = method === 0 ? compressedBytes : inflateRawSync(compressedBytes);
      const contentType = contentTypeForPath(entryPath);
      const virtualObject = {
        size: bytes.byteLength,
        async arrayBuffer() {
          return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
        },
        async text() {
          return new TextDecoder().decode(bytes);
        },
        writeHttpMetadata(headers) {
          headers.set('content-type', contentType);
        }
      };
      return {
        found: true,
        archive,
        path: entryPath,
        offset: dataOffset,
        size: bytes.byteLength,
        compressed_size: compressedSize,
        content_type: contentType,
        scanned_entries: scannedEntries,
        scanned_bytes: directory.central_directory_size + compressedSize,
        decompressed_stream: false,
        compression,
        zip_method: method,
        zip_method_label: zipMethodLabel(method),
        central_directory_bytes: directory.central_directory_size,
        central_directory_offset: directory.central_directory_offset,
        object: virtualObject,
        bytes
      };
    }
    cursor = next;
  }
  return {
    found: false,
    archive,
    compression,
    scanned_entries: scannedEntries,
    scanned_bytes: directory.central_directory_size,
    central_directory_bytes: directory.central_directory_size
  };
}

async function streamNextDataChunk(state) {
  while (true) {
    let chunk = null;
    if (typeof state.nextChunk === 'function') {
      chunk = await state.nextChunk();
      if (!chunk) return null;
    } else {
      const next = await state.reader.read();
      if (next.done) return null;
      chunk = next.value instanceof Uint8Array ? next.value : new Uint8Array(next.value || []);
    }
    if (chunk.byteLength) return chunk;
  }
}

async function streamReadBytes(state, length) {
  const requested = Math.max(0, Number(length || 0));
  if (!requested) return new Uint8Array();
  const out = new Uint8Array(requested);
  let written = 0;
  while (written < requested) {
    if (!state.buffer?.byteLength) {
      const nextChunk = await streamNextDataChunk(state);
      if (!nextChunk) break;
      state.buffer = nextChunk;
      state.buffer_offset = 0;
      if (!state.buffer.byteLength) continue;
    }
    const remaining = state.buffer.byteLength - state.buffer_offset;
    const take = Math.min(requested - written, remaining);
    out.set(state.buffer.subarray(state.buffer_offset, state.buffer_offset + take), written);
    state.buffer_offset += take;
    written += take;
    state.bytes_read += take;
    if (state.buffer_offset >= state.buffer.byteLength) {
      state.buffer = new Uint8Array();
      state.buffer_offset = 0;
    }
  }
  return written === requested ? out : null;
}

async function streamSkipBytes(state, length) {
  let remaining = Math.max(0, Number(length || 0));
  while (remaining > 0) {
    if (!state.buffer?.byteLength) {
      const nextChunk = await streamNextDataChunk(state);
      if (!nextChunk) return false;
      state.buffer = nextChunk;
      state.buffer_offset = 0;
      if (!state.buffer.byteLength) continue;
    }
    const available = state.buffer.byteLength - state.buffer_offset;
    const take = Math.min(remaining, available);
    state.buffer_offset += take;
    state.bytes_read += take;
    remaining -= take;
    if (state.buffer_offset >= state.buffer.byteLength) {
      state.buffer = new Uint8Array();
      state.buffer_offset = 0;
    }
  }
  return true;
}

function zstdTarStreamState(object) {
  const stream = objectReadableStream(object);
  if (!stream) return null;
  const compressedReader = stream.getReader();
  const pending = [];
  let outputEnded = false;
  const decompressor = new ZstdDecompress((chunk, final) => {
    const out = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk || []);
    if (out.byteLength) pending.push(out);
    if (final) outputEnded = true;
  });
  return {
    buffer: new Uint8Array(),
    buffer_offset: 0,
    bytes_read: 0,
    async nextChunk() {
      while (!pending.length && !outputEnded) {
        const next = await compressedReader.read();
        if (next.done) {
          decompressor.push(new Uint8Array(), true);
          if (!pending.length) outputEnded = true;
          break;
        }
        const chunk = next.value instanceof Uint8Array ? next.value : new Uint8Array(next.value || []);
        if (chunk.byteLength) decompressor.push(chunk, false);
      }
      return pending.shift() || null;
    },
    async cancel() {
      await compressedReader.cancel().catch(() => null);
    }
  };
}

async function readSourceFileFromCompressedTarArchive(env, sourcePackage, sourcePath, options = {}) {
  const archive = sourceArchiveForPackage(sourcePackage || {});
  if (!archive?.key) return null;
  const compression = sourceArchiveTarCompression(archive);
  if (!['gzip', 'zstd'].includes(compression)) {
    return compression ? {
      found: false,
      unsupported: true,
      code: 'SOURCE_ARCHIVE_COMPRESSION_UNSUPPORTED',
      archive,
      compression
    } : null;
  }
  if (compression === 'gzip' && typeof DecompressionStream !== 'function') {
    return {
      found: false,
      unsupported: true,
      code: 'SOURCE_ARCHIVE_DECOMPRESSION_UNAVAILABLE',
      archive,
      compression
    };
  }
  const bucket = sourceTransferBucket(env) || deploymentBucket(env);
  if (!bucket?.get) return null;
  const object = await bucket.get(archive.key).catch(() => null);
  let state = null;
  if (compression === 'gzip') {
    const stream = objectReadableStream(object);
    if (!stream) return null;
    state = { reader: stream.pipeThrough(new DecompressionStream('gzip')).getReader(), buffer: new Uint8Array(), buffer_offset: 0, bytes_read: 0 };
  } else {
    state = zstdTarStreamState(object);
    if (!state) return null;
  }
  const target = normalizeSourcePath(sourcePath);
  let scannedEntries = 0;
  let paxPath = '';
  let gnuLongName = '';
  try {
    while (state.bytes_read + 512 <= MAX_SOURCE_ARCHIVE_LAZY_SCAN_BYTES) {
      const header = await streamReadBytes(state, 512);
      if (!header || header.byteLength < 512 || tarHeaderIsZero(header)) break;
      const typeflag = String.fromCharCode(header[156] || 48);
      const size = tarHeaderOctal(header, 124, 12);
      const dataOffset = state.bytes_read;
      const padded = tarPaddedSize(size);
      scannedEntries += 1;

      if (typeflag === 'x' || typeflag === 'g') {
        const body = await streamReadBytes(state, Math.min(size, 1024 * 1024));
        if (size > 1024 * 1024) await streamSkipBytes(state, size - 1024 * 1024);
        await streamSkipBytes(state, padded - size);
        const pax = parseTarPaxRecords(new TextDecoder().decode(body || new Uint8Array()));
        if (pax.path) paxPath = pax.path;
        continue;
      }

      if (typeflag === 'L') {
        const body = await streamReadBytes(state, Math.min(size, MAX_PATH * 2));
        if (size > MAX_PATH * 2) await streamSkipBytes(state, size - MAX_PATH * 2);
        await streamSkipBytes(state, padded - size);
        gnuLongName = new TextDecoder().decode(body || new Uint8Array()).replace(/\0.*$/s, '').trim();
        continue;
      }

      const entryPath = tarPathFromHeader(header, paxPath || gnuLongName);
      paxPath = '';
      gnuLongName = '';
      const isFile = typeflag === '0' || typeflag === '\0' || typeflag === '' || typeflag === '7';
      if (isFile && entryPath === target) {
        const bytes = await streamReadBytes(state, size);
        await streamSkipBytes(state, padded - size);
        const contentType = contentTypeForPath(entryPath);
        const virtualObject = {
          size,
          async arrayBuffer() {
            return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
          },
          async text() {
            return new TextDecoder().decode(bytes);
          },
          writeHttpMetadata(headers) {
            headers.set('content-type', contentType);
          }
        };
        return {
          found: true,
          archive,
          path: entryPath,
          offset: dataOffset,
          size,
          padded_size: padded,
          content_type: contentType,
          scanned_entries: scannedEntries,
          scanned_bytes: state.bytes_read,
          decompressed_stream: true,
          compression,
          object: virtualObject,
          bytes
        };
      }

      const skipped = await streamSkipBytes(state, padded);
      if (!skipped) break;
    }
  } finally {
    if (typeof state.cancel === 'function') await state.cancel();
    else await state.reader.cancel().catch(() => null);
  }
  return {
    found: false,
    archive,
    compression,
    decompressed_stream: true,
    scanned_entries: scannedEntries,
    scanned_bytes: state.bytes_read,
    scan_limit: MAX_SOURCE_ARCHIVE_LAZY_SCAN_BYTES
  };
}

async function readBucketRangeBytes(bucket, key, offset, length) {
  if (!bucket?.get || !key || length <= 0) return new Uint8Array();
  const object = await bucket.get(key, { range: { offset, length } }).catch(() => null);
  return object ? await readObjectBytes(object) : new Uint8Array();
}

async function readSourceFileFromTarArchive(env, sourcePackage, sourcePath, options = {}) {
  const archive = sourceArchiveForPackage(sourcePackage || {});
  if (!archive?.key) return null;
  if (!sourceArchiveSupportsLazyTar(archive)) {
    const zipRead = await readSourceFileFromZipArchive(env, sourcePackage, sourcePath, options);
    if (zipRead) return zipRead;
    return await readSourceFileFromCompressedTarArchive(env, sourcePackage, sourcePath, options) || {
      found: false,
      unsupported: true,
      code: 'SOURCE_ARCHIVE_RANDOM_ACCESS_UNSUPPORTED',
      archive
    };
  }
  const bucket = sourceTransferBucket(env) || deploymentBucket(env);
  if (!bucket?.get) return null;
  const target = normalizeSourcePath(sourcePath);
  const knownSize = Number(archive.bytes || 0);
  const scanLimit = Math.min(
    knownSize > 0 ? knownSize : MAX_SOURCE_ARCHIVE_LAZY_SCAN_BYTES,
    MAX_SOURCE_ARCHIVE_LAZY_SCAN_BYTES
  );
  let offset = 0;
  let scannedEntries = 0;
  let paxPath = '';
  let gnuLongName = '';
  while (offset + 512 <= scanLimit) {
    const header = await readBucketRangeBytes(bucket, archive.key, offset, 512);
    if (header.byteLength < 512 || tarHeaderIsZero(header)) break;
    const typeflag = String.fromCharCode(header[156] || 48);
    const size = tarHeaderOctal(header, 124, 12);
    const dataOffset = offset + 512;
    const nextOffset = dataOffset + tarPaddedSize(size);
    scannedEntries += 1;

    if (typeflag === 'x' || typeflag === 'g') {
      const body = await readBucketRangeBytes(bucket, archive.key, dataOffset, Math.min(size, 1024 * 1024));
      const pax = parseTarPaxRecords(new TextDecoder().decode(body));
      if (pax.path) paxPath = pax.path;
      offset = nextOffset;
      continue;
    }

    if (typeflag === 'L') {
      const body = await readBucketRangeBytes(bucket, archive.key, dataOffset, Math.min(size, MAX_PATH * 2));
      gnuLongName = new TextDecoder().decode(body).replace(/\0.*$/s, '').trim();
      offset = nextOffset;
      continue;
    }

    const entryPath = tarPathFromHeader(header, paxPath || gnuLongName);
    paxPath = '';
    gnuLongName = '';
    const isFile = typeflag === '0' || typeflag === '\0' || typeflag === '' || typeflag === '7';
    if (isFile && entryPath === target) {
      const rangeObject = await bucket.get(archive.key, { range: { offset: dataOffset, length: size } }).catch(() => null);
      if (!rangeObject) return null;
      const bytes = options.readBytes === false ? null : await readObjectBytes(rangeObject);
      return {
        found: true,
        archive,
        path: entryPath,
        offset: dataOffset,
        size,
        padded_size: tarPaddedSize(size),
        content_type: contentTypeForPath(entryPath),
        scanned_entries: scannedEntries,
        scanned_bytes: nextOffset,
        object: rangeObject,
        bytes
      };
    }
    offset = nextOffset;
  }
  return {
    found: false,
    archive,
    scanned_entries: scannedEntries,
    scanned_bytes: offset,
    scan_limit: scanLimit
  };
}

function sourceArchiveError(status, code, message, extra = {}) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  error.extra = extra;
  return error;
}

function sourceArchiveByteLength(archive = {}) {
  return Number(archive.byte_length ?? archive.bytes?.byteLength ?? archive.bytes ?? archive.size ?? 0) || 0;
}

function sourceArchivePayloadForStorage(archive = {}) {
  return archive.body || archive.stream || archive.bytes || new Uint8Array();
}

async function buildSourceArchiveBytes(env, principal, workspaceId, projectId, deploymentId, deployment) {
  const bucket = deploymentBucket(env);
  if (!bucket?.get) throw sourceArchiveError(500, 'NO_DEPLOYMENT_BUCKET_READ', 'DEPLOYMENT_ASSET_BUCKET read is not configured');
  const source = await sourceFilesForDeployment(env, deployment);
  const privatePackage = source.source_package;
  const totalRecordedFiles = source.file_count || source.files.length;
  const storedArchive = sourceArchiveForPackage(privatePackage || {});
  if (storedArchive?.downloadable && totalRecordedFiles > MAX_SOURCE_DOWNLOAD_FILES) {
    const archiveBucket = sourceTransferBucket(env) || deploymentBucket(env);
    if (!archiveBucket?.get) throw sourceArchiveError(500, 'NO_SOURCE_ARCHIVE_BUCKET_READ', 'SkyeNet source archive bucket read is not configured');
    const object = await archiveBucket.get(storedArchive.key).catch(() => null);
    if (!object) {
      throw sourceArchiveError(409, 'SOURCE_ARCHIVE_MISSING', 'Stored source archive was not found in SkyeNet private storage.', {
        key: storedArchive.key
      });
    }
    const byteLength = Number(storedArchive.bytes || object.size || 0);
    const canStream = object.body && typeof object.body.getReader === 'function';
    const bytes = byteLength <= MAX_SOURCE_TRANSFER_ARCHIVE_BYTES || !canStream
      ? await readObjectBytes(object)
      : null;
    if (!bytes && !canStream) {
      throw sourceArchiveError(
        413,
        'SOURCE_TRANSFER_ARCHIVE_LIMIT',
        `Deployment source archive is larger than the synchronous SkyeNet transfer limit of ${bytesLabel(MAX_SOURCE_TRANSFER_ARCHIVE_BYTES)} and cannot be streamed from storage.`,
        { bytes: byteLength, limit: MAX_SOURCE_TRANSFER_ARCHIVE_BYTES }
      );
    }
    return {
      bytes,
      body: bytes || object.body,
      byte_length: byteLength || bytes?.byteLength || 0,
      sha256: storedArchive.sha256 || (bytes ? await sha256Hex(bytes) : ''),
      manifest: {
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
          asset_prefix: source.prefix || '',
          source_mode: 'private-full-project',
          source_package: {
            mode: privatePackage?.mode || 'private-full-project',
            file_count: totalRecordedFiles,
            total_bytes: privatePackage?.total_bytes || 0,
            public_asset_exposure: false,
            completed_at: privatePackage?.completed_at || ''
          },
          file_count: totalRecordedFiles,
          total_bytes: privatePackage?.total_bytes || 0
        },
        files: [],
        stored_archive: {
          key: storedArchive.key,
          filename: storedArchive.filename,
          bytes: byteLength,
          sha256: storedArchive.sha256,
          content_type: storedArchive.content_type
        }
      },
      files: [],
      file_count: totalRecordedFiles,
      total_bytes: privatePackage?.total_bytes || 0,
      download_name: storedArchive.filename || `${safeDownloadName(projectId, deploymentId, 'source-archive')}.tar`,
      content_type: storedArchive.content_type || 'application/octet-stream',
      source_mode: 'private-full-project',
      stored_archive_reused: true
    };
  }
  const files = source.files.map((file) => sourcePathFromRecord(file)).slice(0, MAX_SOURCE_DOWNLOAD_FILES);
  if (!files.length) throw sourceArchiveError(409, 'DEPLOYMENT_SOURCE_EMPTY', 'Deployment has no recorded files to transfer');
  if (totalRecordedFiles > MAX_SOURCE_DOWNLOAD_FILES) {
    throw sourceArchiveError(
      413,
      'SOURCE_DOWNLOAD_FILE_LIMIT',
      `Deployment source bundle has ${totalRecordedFiles} files; max transferable files per request is ${MAX_SOURCE_DOWNLOAD_FILES}.`,
      { file_count: totalRecordedFiles, limit: MAX_SOURCE_DOWNLOAD_FILES }
    );
  }
  const prefix = cleanText(
    source.prefix || privatePackage?.prefix || deployment.asset_prefix || assetPrefix(projectId, deploymentId),
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
  if (!archive?.bytes?.byteLength) {
    throw sourceArchiveError(
      413,
      'SECURE_SKYE_PACK_STREAMING_LIMIT',
      'Secure .skye pack encryption currently requires an in-memory source archive; use skyedrive/skyevault stored archive transfer for oversized packages.',
      { bytes: sourceArchiveByteLength(archive), limit: MAX_SOURCE_TRANSFER_ARCHIVE_BYTES }
    );
  }
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
  const archiveBytes = sourceArchiveByteLength(archive);
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
      source_archive_bytes: archiveBytes,
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
      source_archive_bytes: archiveBytes,
      source_archive_sha256: archive.sha256,
      plaintext_source_exposed_to_storage: false
    };
  }

  const filename = normalizeArchiveFilename(
    archive.download_name || `${safeDownloadName(context.project_id, context.deployment_id, method, 'source')}.tar`,
    context.project_id,
    context.deployment_id
  );
  const objectKey = `${prefix}/${filename}`;
  const manifestKey = `${prefix}/manifest.json`;
  await bucket.put(objectKey, sourceArchivePayloadForStorage(archive), {
    httpMetadata: { contentType: archive.content_type || 'application/x-tar' },
    customMetadata: {
      ...baseMetadata,
      content_kind: 'source-archive',
      sha256: archive.sha256,
      stored_archive_reused: archive.stored_archive_reused ? 'true' : 'false'
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
    content_type: archive.content_type || 'application/x-tar',
    bytes: archiveBytes,
    sha256: archive.sha256,
    source_archive_bytes: archiveBytes,
    source_archive_sha256: archive.sha256,
    source_mode: archive.source_mode,
    stored_archive_reused: Boolean(archive.stored_archive_reused),
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
    content_type: archive.content_type || 'application/x-tar',
    bytes: archiveBytes,
    sha256: archive.sha256,
    source_archive_bytes: archiveBytes,
    source_archive_sha256: archive.sha256,
    stored_archive_reused: Boolean(archive.stored_archive_reused),
    plaintext_source_exposed_to_storage: true,
    storage_privacy: 'private-gated-transfer-bucket'
  };
}

async function promoteSourceTransferCodebases(env, context = {}) {
  const {
    method,
    status,
    transfer_id: transferId,
    source_scope: sourceScope,
    requesting_principal: requestingPrincipal,
    workspace_id: workspaceId,
    project_id: projectId,
    deployment_id: deploymentId,
    deployment,
    storage,
    archive,
    destination = {},
    custody_policy: custodyPolicy = {}
  } = context;
  if (!['skyedrive', 'skyevault', 'secure-skye-pack'].includes(method) || status !== 'completed' || !storage?.stored) {
    return [];
  }
  const kv = receiptKv(env);
  if (!kv?.put) return [];
  const now = new Date().toISOString();
  const sourceOwnerCustomerId = cleanText(sourceScope?.customer_id || deployment?.customer_id || requestingPrincipal?.customer_id || '', 160);
  const requestedByCustomerId = cleanText(requestingPrincipal?.customer_id || sourceOwnerCustomerId, 160);
  const recipientCustomerId = cleanText(destination.recipient_customer_id || '', 160);
  const sourcePackage = deployment?.source_package || {};
  const sourceSummary = sourcePackageSummary(sourcePackage);
  const archiveInfo = {
    source_archive_key: sourcePackage.archive?.key || '',
    source_archive_filename: sourcePackage.archive?.filename || archive?.filename || '',
    source_archive_bytes: Number(sourcePackage.archive?.bytes || sourceArchiveByteLength(archive) || 0),
    source_archive_sha256: sourcePackage.archive?.sha256 || archive?.sha256 || '',
    transfer_object_key: storage.key || '',
    transfer_manifest_key: storage.manifest_key || '',
    transfer_object_bytes: Number(storage.bytes || 0),
    transfer_object_sha256: storage.sha256 || ''
  };
  const readEndpoints = {
    manifest_url: sourceManifestPath(workspaceId, projectId, deploymentId),
    tree_url: sourceTreePath(workspaceId, projectId, deploymentId),
    file_url: `/api/skyenet/source-file?${new URLSearchParams({ workspace_id: workspaceId, project_id: projectId, deployment_id: deploymentId, path: 'PATH' }).toString()}`,
    search_url: sourceSearchPath(workspaceId, projectId, deploymentId),
    download_url: sourceDownloadPath(workspaceId, projectId, deploymentId),
    transfer_url: sourceTransferPath()
  };
  const mount = {
    workspace_id: workspaceId,
    project_id: projectId,
    deployment_id: deploymentId,
    live_url: deployment?.live_url || '',
    archive_key: archiveInfo.source_archive_key,
    transfer_object_key: archiveInfo.transfer_object_key,
    transfer_manifest_key: archiveInfo.transfer_manifest_key,
    source_manifest_key: sourcePackage.manifest_key || sourceManifestKeyForPackage(sourcePackage),
    source_index_key: sourcePackage.index_key || sourceIndexKeyForPackage(sourcePackage),
    source_index_page_prefix: sourceIndexPagePrefixForPackage(sourcePackage),
    source_tree_index_prefix: sourceTreeIndexPrefixForPackage(sourcePackage),
    file_count: Number(sourcePackage.file_count || archive?.file_count || archive?.files?.length || 0),
    total_bytes: Number(sourcePackage.total_bytes || archiveInfo.source_archive_bytes || 0),
    public_asset_exposure: false
  };
  const makeRecord = (customerId, relation) => {
    const mountId = sourceCodebaseMountId(method, transferId, relation);
    return {
      schema: 'fs27.skynet.codebase_mount.v1',
      mount_id: mountId,
      status: 'active',
      codebase_kind: 'skyenet-source-custody',
      relation,
      customer_id: customerId,
      source_owner_customer_id: sourceOwnerCustomerId,
      requested_by_customer_id: requestedByCustomerId,
      workspace_id: workspaceId,
      project_id: projectId,
      deployment_id: deploymentId,
      live_url: deployment?.live_url || '',
      source_mode: sourceSummary?.mode || 'private-full-project',
      source_package: sourceSummary,
      storage: {
        method,
        bucket_binding: storage.bucket_binding || '',
        key: storage.key || '',
        manifest_key: storage.manifest_key || '',
        filename: storage.filename || '',
        content_type: storage.content_type || '',
        bytes: Number(storage.bytes || 0),
        sha256: storage.sha256 || '',
        plaintext_source_exposed_to_storage: storage.plaintext_source_exposed_to_storage === false ? false : storage.plaintext_source_exposed_to_storage === true
      },
      archive: archiveInfo,
      mount,
      access_policy: {
        gate_required: true,
        shared_auth_lane: 'SkyeGate FS27/Free99',
        account_scoped: true,
        read_source_granted: true,
        source_owner_customer_id: sourceOwnerCustomerId,
        mounted_customer_id: customerId,
        owner_admin_scope_override_allowed: true,
        client_access_without_transfer: false,
        transfer_required_for_client_source_handoff: true,
        public_asset_exposure: false
      },
      transfer_policy: {
        transfer_id: transferId,
        method,
        status,
        recipient_customer_id: recipientCustomerId,
        recipient_email: destination.recipient_email || '',
        drive_id: destination.drive_id || '',
        vault_id: destination.vault_id || '',
        cross_account_transfer: Boolean(custodyPolicy.cross_account_transfer),
        recipient_status: custodyPolicy.recipient_status || '',
        secure_pack_extension: '.skye'
      },
      read_endpoints: readEndpoints,
      mcp: {
        mountable: true,
        list_tool: 'skyenet_list_codebases',
        manifest_tool: 'skyenet_source_manifest',
        tree_tool: 'skyenet_source_tree',
        file_tool: 'skyenet_source_file',
        search_tool: 'skyenet_source_search',
        transfer_tool: 'skyenet_source_transfer'
      },
      created_at: now,
      updated_at: now
    };
  };
  const records = [];
  const recordTargets = new Map();
  recordTargets.set(sourceOwnerCustomerId, 'source-owner');
  if (requestedByCustomerId && requestedByCustomerId !== sourceOwnerCustomerId) recordTargets.set(requestedByCustomerId, 'requesting-admin');
  if (recipientCustomerId) recordTargets.set(recipientCustomerId, recipientCustomerId === sourceOwnerCustomerId ? 'source-owner' : 'recipient');
  for (const [customerId, relation] of recordTargets.entries()) {
    const record = makeRecord(customerId, relation);
    const key = sourceCodebaseRecordKey(customerId, workspaceId, projectId, deploymentId, record.mount_id);
    await kvPutJson(kv, key, record, {
      schema: record.schema,
      project_id: projectId,
      deployment_id: deploymentId,
      transfer_id: transferId,
      relation
    });
    records.push({ key, record: sourceCodebaseRecordForResponse(record) });
  }
  return records;
}

function assetPrefix(projectId, deploymentId, explicit = '') {
  const canonical = `deployments/${projectId}/${deploymentId}`;
  const cleanExplicit = cleanText(explicit, MAX_PATH).replace(/^\/+/, '').replace(/\/+$/, '');
  if (cleanExplicit && (cleanExplicit === canonical || cleanExplicit.startsWith(`${canonical}/`))) return cleanExplicit;
  return canonical;
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

async function sourcePackageIndexPagesMeta(env, sourcePackage = {}) {
  const explicit = sourcePackage.index_pages || sourcePackage.indexPages || null;
  if (explicit?.page_count) {
    return {
      prefix: explicit.prefix || sourceIndexPagePrefixForPackage(sourcePackage),
      page_size: Number(explicit.page_size || SOURCE_INDEX_PAGE_SIZE),
      page_count: Number(explicit.page_count || 0),
      file_count: Number(explicit.file_count || sourcePackage.file_count || 0),
      generated_at: explicit.generated_at || ''
    };
  }
  const bucket = deploymentBucket(env);
  const prefix = sourceIndexPagePrefixForPackage(sourcePackage);
  if (!bucket?.get || !prefix) return null;
  const meta = await objectJson(await bucket.get(`${prefix}/meta.json`).catch(() => null), null);
  if (!meta?.page_count) return null;
  return {
    prefix,
    page_size: Number(meta.page_size || SOURCE_INDEX_PAGE_SIZE),
    page_count: Number(meta.page_count || 0),
    file_count: Number(meta.file_count || sourcePackage.file_count || 0),
    generated_at: meta.generated_at || ''
  };
}

async function sourcePackageIndexPageFiles(env, sourcePackage = {}, page = 0) {
  const bucket = deploymentBucket(env);
  const key = sourceIndexPageKey(sourcePackage, page);
  if (!bucket?.get || !key) return [];
  const body = await objectJson(await bucket.get(key).catch(() => null), null);
  return Array.isArray(body?.files) ? dedupeSourceFiles(body.files) : [];
}

async function sourcePackageIndexSlice(env, sourcePackage = {}, options = {}) {
  const meta = await sourcePackageIndexPagesMeta(env, sourcePackage);
  if (!meta?.page_count) return null;
  const pageSize = Math.max(1, Number(meta.page_size || SOURCE_INDEX_PAGE_SIZE));
  const offset = Math.max(0, Number(options.offset || 0));
  const limit = Math.max(1, Math.min(MAX_SOURCE_QUERY_LIMIT, Number(options.limit || 1000)));
  const prefixFilter = cleanText(options.prefix || options.prefixFilter || '', MAX_PATH).replace(/^\/+|\/+$/g, '');
  const files = [];
  let scannedPages = 0;
  if (!prefixFilter) {
    let page = Math.floor(offset / pageSize);
    let pageOffset = offset % pageSize;
    while (page < meta.page_count && files.length < limit) {
      const pageFiles = await sourcePackageIndexPageFiles(env, sourcePackage, page);
      scannedPages += 1;
      for (const record of pageFiles.slice(pageOffset)) {
        files.push(record);
        if (files.length >= limit) break;
      }
      page += 1;
      pageOffset = 0;
    }
    const nextOffset = offset + files.length;
    return {
      ok: true,
      index_paged: true,
      files,
      file_count: Number(sourcePackage.file_count || meta.file_count || 0),
      listed_count: Number(meta.file_count || sourcePackage.file_count || 0),
      next_cursor: nextOffset < Number(meta.file_count || 0) ? String(nextOffset) : null,
      scanned_pages: scannedPages,
      page_size: pageSize,
      page_count: Number(meta.page_count || 0)
    };
  }

  let matched = 0;
  for (let page = 0; page < meta.page_count; page += 1) {
    const pageFiles = await sourcePackageIndexPageFiles(env, sourcePackage, page);
    scannedPages += 1;
    for (const record of pageFiles) {
      const sourcePath = sourcePathFromRecord(record);
      if (!sourcePath.startsWith(prefixFilter)) continue;
      if (matched >= offset && files.length < limit) files.push(record);
      matched += 1;
    }
  }
  const nextOffset = offset + files.length;
  return {
    ok: true,
    index_paged: true,
    files,
    file_count: Number(sourcePackage.file_count || meta.file_count || 0),
    listed_count: matched,
    next_cursor: nextOffset < matched ? String(nextOffset) : null,
    scanned_pages: scannedPages,
    page_size: pageSize,
    page_count: Number(meta.page_count || 0)
  };
}

async function sourcePackageTreeSlice(env, sourcePackage = {}, rawPrefix = '', options = {}) {
  const bucket = deploymentBucket(env);
  const prefix = cleanText(rawPrefix || '', MAX_PATH).replace(/^\/+|\/+$/g, '');
  const metaKey = sourceTreeMetaKey(sourcePackage, prefix);
  if (!bucket?.get || !metaKey) return null;
  const meta = await objectJson(await bucket.get(metaKey).catch(() => null), null);
  if (!meta || !Number.isFinite(Number(meta.entry_count))) return null;
  const pageSize = Math.max(1, Number(meta.page_size || SOURCE_INDEX_PAGE_SIZE));
  const pageCount = Math.max(0, Number(meta.page_count || 0));
  const offset = Math.max(0, Number(options.offset || 0));
  const limit = Math.max(1, Math.min(MAX_SOURCE_QUERY_LIMIT, Number(options.limit || 1000)));
  const entries = [];
  let page = Math.floor(offset / pageSize);
  let pageOffset = offset % pageSize;
  let scannedPages = 0;
  while (page < pageCount && entries.length < limit) {
    const body = await objectJson(await bucket.get(sourceTreePageKey(sourcePackage, prefix, page)).catch(() => null), null);
    const pageEntries = Array.isArray(body?.entries) ? body.entries : [];
    scannedPages += 1;
    for (const entry of pageEntries.slice(pageOffset)) {
      entries.push(entry);
      if (entries.length >= limit) break;
    }
    page += 1;
    pageOffset = 0;
  }
  const nextOffset = offset + entries.length;
  return {
    ok: true,
    tree_paged: true,
    entries,
    entry_count: Number(meta.entry_count || 0),
    next_cursor: nextOffset < Number(meta.entry_count || 0) ? String(nextOffset) : null,
    scanned_pages: scannedPages,
    page_size: pageSize,
    page_count: pageCount
  };
}

async function sourcePackageTreeSliceFromIndex(env, sourcePackage = {}, rawPrefix = '', options = {}) {
  const meta = await sourcePackageIndexPagesMeta(env, sourcePackage);
  if (!meta?.page_count) return null;
  const prefix = cleanText(rawPrefix || '', MAX_PATH).replace(/^\/+|\/+$/g, '');
  const offset = Math.max(0, Number(options.offset || 0));
  const limit = Math.max(1, Math.min(MAX_SOURCE_QUERY_LIMIT, Number(options.limit || 1000)));
  const directories = new Map();
  const files = new Map();
  let scannedPages = 0;
  for (let page = 0; page < meta.page_count; page += 1) {
    const pageFiles = await sourcePackageIndexPageFiles(env, sourcePackage, page);
    scannedPages += 1;
    for (const record of pageFiles) {
      const sourcePath = sourcePathFromRecord(record);
      if (prefix && sourcePath !== prefix && !sourcePath.startsWith(`${prefix}/`)) continue;
      const relative = prefix ? sourcePath.slice(prefix.length).replace(/^\/+/, '') : sourcePath;
      if (!relative) continue;
      const [head, ...rest] = relative.split('/');
      const fullPath = prefix ? `${prefix}/${head}` : head;
      if (rest.length) {
        directories.set(fullPath, { type: 'directory', name: head, path: fullPath });
      } else {
        const file = sourceFileRecord(record);
        files.set(fullPath, {
          type: 'file',
          name: head,
          path: fullPath,
          size: file?.size || 0,
          sha256: file?.sha256 || '',
          content_type: file?.content_type || contentTypeForPath(fullPath)
        });
      }
    }
  }
  const entries = [
    ...[...directories.values()].sort((a, b) => a.path.localeCompare(b.path)),
    ...[...files.values()].sort((a, b) => a.path.localeCompare(b.path))
  ];
  const page = entries.slice(offset, offset + limit);
  const nextOffset = offset + page.length;
  return {
    ok: true,
    tree_paged: true,
    tree_on_demand: true,
    entries: page,
    entry_count: entries.length,
    next_cursor: nextOffset < entries.length ? String(nextOffset) : null,
    scanned_pages: 0,
    scanned_index_pages: scannedPages,
    page_size: Number(meta.page_size || SOURCE_INDEX_PAGE_SIZE),
    page_count: Number(meta.page_count || 0)
  };
}

async function sourcePathRecordedInPagedIndex(env, sourcePackage = {}, sourcePath = '') {
  const target = normalizeSourcePath(sourcePath);
  const meta = await sourcePackageIndexPagesMeta(env, sourcePackage);
  if (!meta?.page_count) return null;
  for (let page = 0; page < meta.page_count; page += 1) {
    const pageFiles = await sourcePackageIndexPageFiles(env, sourcePackage, page);
    if (pageFiles.some((file) => sourcePathFromRecord(file) === target)) return true;
  }
  return false;
}

async function searchPagedSourceIndex(env, context, options = {}) {
  const sourcePackage = context.source.source_package;
  const meta = await sourcePackageIndexPagesMeta(env, sourcePackage);
  if (!meta?.page_count) return null;
  const query = cleanText(options.query || '', 240).toLowerCase();
  const prefixFilter = cleanText(options.prefix || '', MAX_PATH).replace(/^\/+|\/+$/g, '');
  const limit = Math.max(1, Math.min(MAX_SOURCE_SEARCH_RESULTS, Number(options.limit || 50)));
  const contentSearch = Boolean(options.contentSearch);
  const bucket = deploymentBucket(env);
  const results = [];
  let contentScanned = 0;
  let scannedPages = 0;

  for (let page = 0; page < meta.page_count && results.length < limit; page += 1) {
    const pageFiles = await sourcePackageIndexPageFiles(env, sourcePackage, page);
    scannedPages += 1;
    for (const record of pageFiles) {
      const sourcePath = sourcePathFromRecord(record);
      if (prefixFilter && !sourcePath.startsWith(prefixFilter)) continue;
      const file = sourceFileRecord(record);
      const contentType = file?.content_type || contentTypeForPath(sourcePath);
      if (sourcePath.toLowerCase().includes(query)) {
        results.push({
          path: sourcePath,
          match: 'path',
          size: file?.size || 0,
          sha256: file?.sha256 || '',
          content_type: contentType
        });
        if (results.length >= limit) break;
        continue;
      }
      if (!contentSearch || !bucket?.get || contentScanned >= MAX_SOURCE_SEARCH_CONTENT_FILES) continue;
      if (file?.size && Number(file.size) > MAX_SOURCE_SEARCH_CONTENT_BYTES) continue;
      if (!sourceTextFileLikely(sourcePath, contentType)) continue;
      contentScanned += 1;
      const objectKey = `${context.prefix}/${sourcePath}`.replace(/\/+/g, '/');
      const object = await bucket.get(objectKey).catch(() => null);
      if (!object) continue;
      const bytes = await readObjectBytes(object);
      if (bytes.byteLength > MAX_SOURCE_SEARCH_CONTENT_BYTES) continue;
      const text = new TextDecoder().decode(bytes);
      const index = text.toLowerCase().indexOf(query);
      if (index < 0) continue;
      const start = Math.max(0, index - 80);
      const end = Math.min(text.length, index + query.length + 120);
      results.push({
        path: sourcePath,
        match: 'content',
        size: bytes.byteLength,
        sha256: file?.sha256 || '',
        content_type: contentType,
        snippet: text.slice(start, end).replace(/\s+/g, ' ').trim()
      });
      if (results.length >= limit) break;
    }
  }
  return {
    ok: true,
    index_paged: true,
    results,
    content_scanned: contentScanned,
    scanned_pages: scannedPages,
    searched_file_count: Number(sourcePackage.file_count || meta.file_count || 0),
    page_count: Number(meta.page_count || 0)
  };
}

async function sourceFilesForDeployment(env, deployment = {}) {
  const privatePackage = sourcePackageHasFiles(deployment.source_package) ? deployment.source_package : null;
  if (privatePackage) {
    const manifest = await sourcePackageManifest(env, privatePackage);
    const manifestFiles = Array.isArray(manifest?.files) ? dedupeSourceFiles(manifest.files) : [];
    const pagedMeta = await sourcePackageIndexPagesMeta(env, privatePackage);
    const hasPagedIndex = Boolean(pagedMeta?.page_count);
    const indexFiles = manifestFiles.length || hasPagedIndex ? [] : await sourcePackageIndexFiles(env, privatePackage);
    const packageFiles = manifestFiles.length
      ? manifestFiles
      : indexFiles.length
        ? dedupeSourceFiles(indexFiles)
        : dedupeSourceFiles(privatePackage.files || privatePackage.sample_files || manifest?.sample_files || []);
    return {
      source_mode: 'private-full-project',
      source_package: {
        ...privatePackage,
        index_pages: privatePackage.index_pages || privatePackage.indexPages || manifest?.index_pages || manifest?.indexPages || pagedMeta || null,
        tree_index: privatePackage.tree_index || privatePackage.treeIndex || manifest?.tree_index || manifest?.treeIndex || null
      },
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
  const customerScope = customerScopeFromInput(params, auth, request);
  const workspaceId = workspaceIdFromInput(params, customerScope.source_principal);
  const projectId = normalizeSlug(url.searchParams.get('projectId') || url.searchParams.get('project_id'), '', MAX_PROJECT);
  const deploymentId = normalizeSlug(url.searchParams.get('deploymentId') || url.searchParams.get('deployment_id'), '', MAX_DEPLOYMENT);
  if (!projectId || !deploymentId) {
    const error = new Error('project_id and deployment_id are required');
    error.status = 400;
    error.code = 'MISSING_SOURCE_QUERY_TARGET';
    throw error;
  }
  const resolved = await findOwnerScopedDeployment(env, auth, request, params, workspaceId, projectId, deploymentId);
  const deployment = resolved.deployment;
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
  return { request, env, auth, principal, customerScope: resolved.customerScope, sourceCustomerId: resolved.customerScope.customer_id, params, workspaceId, projectId, deploymentId, deployment, source, prefix, url };
}

async function sourceArchiveResponse(env, archive, context, cors) {
  const bucket = sourceTransferBucket(env) || deploymentBucket(env);
  if (!bucket?.get) return null;
  const rangeHeader = context.request?.headers?.get('range') || '';
  const knownSize = Number(archive.bytes || 0);
  const requestedRange = rangeHeader ? parseByteRangeHeader(rangeHeader, knownSize) : null;
  if (requestedRange?.invalid) {
    const headers = new Headers(cors);
    headers.set('content-range', `bytes */${knownSize || '*'}`);
    headers.set('accept-ranges', 'bytes');
    return new Response('', { status: 416, headers });
  }
  const object = requestedRange
    ? await bucket.get(archive.key, { range: { offset: requestedRange.start, length: requestedRange.length } }).catch(() => null)
    : await bucket.get(archive.key).catch(() => null);
  if (!object) return null;
  const headers = new Headers(cors);
  const objectHeaders = new Headers();
  if (typeof object.writeHttpMetadata === 'function') object.writeHttpMetadata(objectHeaders);
  headers.set('content-type', archive.content_type || objectHeaders.get('content-type') || 'application/octet-stream');
  headers.set('content-disposition', `attachment; filename="${normalizeArchiveFilename(archive.filename, context.projectId, context.deploymentId)}"`);
  headers.set('cache-control', 'no-store');
  headers.set('accept-ranges', 'bytes');
  headers.set('x-skynet-source-download', 'stored-archive');
  headers.set('x-skynet-project-id', context.projectId);
  headers.set('x-skynet-deployment-id', context.deploymentId);
  headers.set('x-skynet-workspace-id', context.workspaceId);
  if (archive.sha256) headers.set('x-skynet-source-archive-sha256', archive.sha256);
  headers.set('x-skynet-source-archive-hash-verified', archive.hash_verified ? 'true' : 'false');
  if (archive.hash_verification_status) headers.set('x-skynet-source-archive-hash-status', archive.hash_verification_status);
  if (requestedRange) {
    const bytes = await readObjectBytes(object);
    const body = bytes.byteLength === requestedRange.length
      ? bytes
      : bytes.slice(requestedRange.start, requestedRange.end + 1);
    headers.set('content-range', `bytes ${requestedRange.start}-${requestedRange.end}/${requestedRange.size}`);
    headers.set('content-length', String(body.byteLength));
    return new Response(body, { status: 206, headers });
  }
  if (knownSize > 0) headers.set('content-length', String(knownSize));
  const body = object.body && typeof object.body.getReader === 'function' ? object.body : await readObjectBytes(object);
  return new Response(body, { status: 200, headers });
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
  const rows = [];
  const maxKeys = Math.max(1, Math.floor(Number(limit) || 100));
  let scanned = 0;
  let cursor = null;
  let pages = 0;
  do {
    const pageLimit = Math.min(MAX_KV_LIST_PAGE_LIMIT, maxKeys - scanned);
    const options = { prefix, limit: pageLimit };
    if (cursor) options.cursor = cursor;
    const listed = await kv.list(options);
    const keys = listed.keys || [];
    scanned += keys.length;
    pages += 1;
    for (const key of keys) {
      const value = await kvGetJson(kv, key.name, null);
      if (value && typeof value === 'object') rows.push({ key: key.name, value, metadata: key.metadata || null });
    }
    cursor = listed.cursor || null;
    if (!keys.length || listed.list_complete !== false || !cursor || scanned >= maxKeys) break;
  } while (pages < Math.ceil(maxKeys / MAX_KV_LIST_PAGE_LIMIT) + 2);
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
    try {
      const runtime = await Promise.race([
        executeZeroOsAutomationAction({
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
        }, { actor: principal.email || 'skynet' }, { operator_ok: true }),
        new Promise((resolve) => setTimeout(() => resolve({ timed_out: true }), 2500))
      ]);
      const runtimeReceipt = runtime.response?.receipt || null;
      providerRuntime = runtime.timed_out
        ? { receipt_id: '', status: 'timeout_best_effort', executed: false, provider_call_made: false }
        : {
            receipt_id: runtimeReceipt?.id || '',
            status: runtimeReceipt?.status || '',
            executed: Boolean(runtimeReceipt?.executed),
            provider_call_made: Boolean(runtimeReceipt?.provider_call_made)
          };
    } catch (error) {
      providerRuntime = {
        receipt_id: '',
        status: 'error_best_effort',
        executed: false,
        provider_call_made: false,
        error: cleanText(error?.message || String(error), 240)
      };
    }
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
    function_bundle: patch.function_bundle || patch.functionBundle || existing.function_bundle || null,
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

async function enforceFunctionBundleQuota(workspace, nextBytes = 0, auth = {}, request = null) {
  const caps = capsForWorkspace(workspace, auth, request);
  if (!caps.functions_enabled) {
    const error = new Error('Uploaded serverless functions require SkyeNet Functions Managed, Sovereign Runtime Reserve, or owner/admin approval.');
    error.status = 402;
    error.code = 'SKYENET_FUNCTIONS_PLAN_REQUIRED';
    throw error;
  }
  const limit = Number(caps.max_function_bundle_bytes || MAX_FUNCTION_BUNDLE_TOTAL_BYTES);
  if (Number.isFinite(limit) && limit > 0 && nextBytes > limit) {
    const error = new Error(`SkyeNet function bundle exceeds ${bytesLabel(limit)} cap for ${workspace.plan_name || DEFAULT_PLAN}.`);
    error.status = 413;
    error.code = 'SKYENET_FUNCTION_BUNDLE_CAP';
    throw error;
  }
}

async function enforceRouteQuota(env, workspace, auth, record, existingKey = '') {
  const principal = authPrincipal(auth);
  const caps = capsForWorkspace(workspace, auth);
  if (caps.admin_override) {
    return {
      monthly_deployments: null,
      total_receipts: null,
      public_routes: null,
      routes: null,
      route_scan_skipped: true,
      admin_override: true
    };
  }
  const usage = await deploymentUsage(env, principal.customer_id, workspace.workspace_id || principal.workspace_id, { include_routes: false });
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
  const priorFiles = Array.isArray(priorPackage.files) ? priorPackage.files : [];
  const priorPaths = new Set(priorFiles.map((file) => {
    try { return sourcePathFromRecord(file); } catch { return ''; }
  }).filter(Boolean));
  const priorSamplePaths = new Set((Array.isArray(priorPackage.sample_files) ? priorPackage.sample_files : []).map((file) => {
    try { return sourcePathFromRecord(file); } catch { return ''; }
  }).filter(Boolean));
  const sourceAlreadyIndexed = priorPaths.has(sourcePath) || priorSamplePaths.has(sourcePath);
  const nextBytes = sourceAlreadyIndexed
    ? Math.max(Number(priorPackage.total_bytes || 0), body.byteLength)
    : Number(priorPackage.total_bytes || 0) + body.byteLength;
  await enforceSourcePackageQuota(workspaceResult.workspace, nextBytes, auth, request);
  const sourceFiles = priorPaths.has(sourcePath)
    ? priorFiles.slice(0, MAX_SOURCE_PACKAGE_FILES)
    : [...priorFiles, sourceFileRecord({ path: sourcePath, size: body.byteLength, sha256, content_type: contentType })].slice(0, MAX_SOURCE_PACKAGE_FILES);
  const nextSampleFiles = sourceAlreadyIndexed && Array.isArray(priorPackage.sample_files) && priorPackage.sample_files.length
    ? priorPackage.sample_files
    : sourceFiles.slice(0, Math.min(1000, sourceFiles.length));
  const knownCount = Number(priorPackage.file_count || priorFiles.length || 0);
  const nextFileCount = sourceAlreadyIndexed ? Math.max(knownCount, sourceFiles.length) : Math.max(knownCount + 1, sourceFiles.length);
  if (nextFileCount > MAX_SOURCE_INDEX_FILES) {
    const error = new Error(`SkyeNet private source index has too many files; max is ${MAX_SOURCE_INDEX_FILES}.`);
    error.status = 413;
    error.code = 'SOURCE_INDEX_FILE_LIMIT';
    throw error;
  }
  const sourcePackage = {
    schema: 'fs27.skynet.source_package.v1',
    mode: 'private-full-project',
    prefix,
    files: sourceFiles,
    sample_files: nextSampleFiles,
    files_truncated: nextFileCount > sourceFiles.length || Boolean(priorPackage.files_truncated),
    file_count: nextFileCount,
    total_bytes: nextBytes,
    downloadable: true,
    manifest_key: priorPackage.manifest_key || sourceManifestKeyForPackage({ prefix }),
    index_key: priorPackage.index_key || sourceIndexKeyForPackage({ prefix }),
    index_file_count: Number(priorPackage.index_file_count || 0),
    index_pages: priorPackage.index_pages || priorPackage.indexPages || null,
    tree_index: priorPackage.tree_index || priorPackage.treeIndex || null,
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
  const prefix = sourcePackagePrefix(principal, workspaceId, projectId, deploymentId, body.source_prefix || body.sourcePrefix || priorPackage.prefix || '');
  const defaultManifestKey = `${prefix}/.skyenet/source-package.json`;
  const defaultIndexKey = `${prefix}/.skyenet/source-index.jsonl`;
  const requestedIndexKey = cleanText(body.index_key || body.indexKey || priorPackage.index_key || '', MAX_PATH * 2).replace(/^\/+/, '');
  const indexKey = requestedIndexKey || defaultIndexKey;
  if (indexKey && !indexKey.startsWith(`${prefix}/`)) {
    return httpJson(400, {
      ok: false,
      error: 'Source index key must stay inside this deployment source package prefix.',
      code: 'SOURCE_INDEX_PREFIX_MISMATCH',
      expected_prefix: prefix,
      index_key: indexKey
    }, cors);
  }
  const filesFromBody = Array.isArray(body.files);
  const files = filesFromBody
    ? dedupeSourceFiles(body.files)
    : [];
  let indexSummary = null;
  if (!filesFromBody && indexKey && bucket?.get) {
    const indexObject = await bucket.get(indexKey).catch(() => null);
    if (indexObject) {
      const indexText = typeof indexObject.text === 'function'
        ? await indexObject.text()
        : new TextDecoder().decode(await readObjectBytes(indexObject));
      indexSummary = sourceIndexSummaryFromText(indexText);
    }
  }
  const bodySampleFiles = Array.isArray(body.sample_files || body.sampleFiles)
    ? dedupeSourceFiles(body.sample_files || body.sampleFiles)
    : [];
  const sampleFiles = filesFromBody
    ? files.slice(0, 1000)
    : (indexSummary?.sample_files?.length
        ? dedupeSourceFiles(indexSummary.sample_files)
        : (bodySampleFiles.length ? bodySampleFiles : dedupeSourceFiles(priorPackage.sample_files || priorPackage.files || [])));
  const fileCount = filesFromBody
    ? files.length
    : Number(body.file_count || body.fileCount || indexSummary?.file_count || priorPackage.file_count || sampleFiles.length || 0);
  if (!fileCount) return httpJson(400, { ok: false, error: 'Private source package requires at least one source file or an uploaded source index.', code: 'SOURCE_PACKAGE_EMPTY' }, cors);
  if (fileCount > MAX_SOURCE_INDEX_FILES) {
    return httpJson(413, {
      ok: false,
      error: `SkyeNet private source index has ${fileCount} files; max indexed files per source package is ${MAX_SOURCE_INDEX_FILES}.`,
      code: 'SOURCE_INDEX_FILE_LIMIT',
      file_count: fileCount,
      limit: MAX_SOURCE_INDEX_FILES
    }, cors);
  }
  const archiveInput = body.archive && typeof body.archive === 'object' ? body.archive : null;
  const archive = archiveInput
    ? sourceArchiveForPackage({ archive: archiveInput })
    : sourceArchiveForPackage(priorPackage);
  const manifestKey = defaultManifestKey;
  const canKeepInlineFiles = fileCount <= MAX_SOURCE_PACKAGE_FILES;
  const inlineRecords = filesFromBody
    ? (canKeepInlineFiles ? files : [])
    : (canKeepInlineFiles && indexSummary?.files?.length === fileCount ? indexSummary.files : dedupeSourceFiles(priorPackage.files || []));
  const candidateResponseFiles = sourceRecordListForResponse(inlineRecords);
  const responseFiles = candidateResponseFiles.length === fileCount ? candidateResponseFiles : [];
  const responseSamples = sourceRecordListForResponse(sampleFiles);
  const filesTruncated = fileCount > responseFiles.length;
  const verificationCandidates = filesFromBody
    ? files
    : (inlineRecords.length === fileCount ? inlineRecords : []);
  const canVerifySourceObjects = verificationCandidates.length > 0
    && verificationCandidates.length === fileCount
    && fileCount <= MAX_SOURCE_PACKAGE_FILES;
  const sourceAudit = canVerifySourceObjects
    ? await auditSourcePackageFiles(bucket, prefix, verificationCandidates)
    : {
        ok: true,
        storage_verified: false,
        checked_count: 0,
        missing_count: 0,
        missing_files: [],
        total_bytes: Number(body.total_bytes ?? body.totalBytes ?? indexSummary?.total_bytes ?? priorPackage.total_bytes ?? 0),
        skipped_reason: fileCount > MAX_SOURCE_PACKAGE_FILES ? 'source-index-too-large-for-request-time-object-verification' : 'no-complete-inline-file-list'
      };
  if (!sourceAudit.ok) {
    return httpJson(409, {
      ok: false,
      error: 'SkyeNet source package complete refused because one or more declared private source files are missing from source custody storage.',
      code: 'SOURCE_OBJECT_MISSING',
      project_id: projectId,
      deployment_id: deploymentId,
      source_prefix: prefix,
      checked_count: sourceAudit.checked_count,
      missing_count: sourceAudit.missing_count,
      missing_files: sourceAudit.missing_files
    }, cors);
  }
  const manifest = {
    schema: 'fs27.skynet.source_package_manifest.v1',
    mode: 'private-full-project',
    project_id: projectId,
    deployment_id: deploymentId,
    customer_id: principal.customer_id,
    workspace_id: workspaceId,
    completed_at: new Date().toISOString(),
    public_asset_exposure: false,
    file_count: fileCount,
    files: responseFiles,
    sample_files: responseSamples,
    files_truncated: filesTruncated,
    index_key: indexKey,
    index_file_count: Number(indexSummary?.file_count || fileCount),
    index_pages: priorPackage.index_pages || priorPackage.indexPages || null,
    tree_index: priorPackage.tree_index || priorPackage.treeIndex || null,
    archive,
    storage_verified: sourceAudit.storage_verified,
    storage_checked_count: sourceAudit.checked_count,
    storage_total_bytes: sourceAudit.total_bytes,
    meta: {
      ...(body.meta && typeof body.meta === 'object' ? body.meta : {}),
      storage_verified: sourceAudit.storage_verified,
      storage_verification_skipped_reason: sourceAudit.skipped_reason || ''
    }
  };
  await bucket.put(manifestKey, JSON.stringify(manifest, null, 2), {
    httpMetadata: { contentType: 'application/json; charset=utf-8' }
  });
  if (filesFromBody) {
    await bucket.put(indexKey, sourceIndexTextForRecords(files), {
      httpMetadata: { contentType: 'application/x-ndjson; charset=utf-8' }
    });
  }
  const sourcePackage = {
    schema: 'fs27.skynet.source_package.v1',
    mode: 'private-full-project',
    prefix,
    files: responseFiles,
    sample_files: responseSamples,
    files_truncated: filesTruncated,
    file_count: fileCount,
    total_bytes: Number(sourceAudit.total_bytes || (body.total_bytes ?? body.totalBytes ?? indexSummary?.total_bytes ?? priorPackage.total_bytes ?? 0)),
    downloadable: true,
    manifest_key: manifestKey,
    index_key: indexKey,
    index_file_count: Number(indexSummary?.file_count || fileCount),
    index_pages: priorPackage.index_pages || priorPackage.indexPages || null,
    tree_index: priorPackage.tree_index || priorPackage.treeIndex || null,
    archive,
    storage_verified: sourceAudit.storage_verified,
    storage_checked_count: sourceAudit.checked_count,
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
    files: fileCount,
    total_bytes: sourcePackage.total_bytes,
    manifest_key: manifestKey,
    index_key: indexKey,
    files_truncated: sourcePackage.files_truncated,
    storage_verified: sourcePackage.storage_verified,
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

async function handleFunctionsUpload(request, env, cors) {
  const auth = await requireDeployAuth(request, cors);
  const bucket = deploymentBucket(env);
  if (!bucket?.put) return httpJson(500, { error: 'DEPLOYMENT_ASSET_BUCKET is not configured', code: 'NO_DEPLOYMENT_BUCKET' }, cors);
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const projectId = normalizeSlug(url.searchParams.get('projectId') || url.searchParams.get('project_id'), 'project', MAX_PROJECT);
  const deploymentId = normalizeSlug(url.searchParams.get('deploymentId') || url.searchParams.get('deployment_id'), 'dep_missing', MAX_DEPLOYMENT);
  const principal = authPrincipal(auth);
  const workspaceId = workspaceIdFromInput(params, principal);
  const workspaceResult = await ensureWorkspace(env, auth, request, {
    workspace_id: workspaceId,
    plan_name: params.plan_name || params.planName
  });
  const caps = workspaceResult.workspace.caps || capsForWorkspace(workspaceResult.workspace, auth, request);
  await enforceFunctionBundleQuota(workspaceResult.workspace, 0, auth, request);
  const bundlePath = normalizeFunctionBundlePath(url.searchParams.get('path') || url.searchParams.get('bundlePath') || '');
  const prefix = functionBundlePrefix(principal, workspaceId, projectId, deploymentId, url.searchParams.get('functionPrefix') || url.searchParams.get('function_prefix') || '');
  const body = await request.arrayBuffer();
  if (body.byteLength > MAX_FUNCTION_BUNDLE_FILE_BYTES) {
    return httpJson(413, {
      ok: false,
      error: `SkyeNet function bundle file exceeds ${bytesLabel(MAX_FUNCTION_BUNDLE_FILE_BYTES)}.`,
      code: 'SKYENET_FUNCTION_FILE_CAP',
      path: bundlePath,
      bytes: body.byteLength
    }, cors);
  }
  const priorRecord = (await upsertDeploymentRecord(env, auth, request, {
    workspace_id: workspaceId,
    project_id: projectId,
    deployment_id: deploymentId
  })).deployment;
  const priorBundle = priorRecord.function_bundle || {};
  const priorFiles = Array.isArray(priorBundle.files) ? priorBundle.files.map(functionFileRecord).filter(Boolean) : [];
  const priorSame = priorFiles.find((file) => file.path === bundlePath);
  const nextBytes = Number(priorBundle.total_bytes || 0) - Number(priorSame?.size || 0) + body.byteLength;
  await enforceFunctionBundleQuota(workspaceResult.workspace, nextBytes, auth, request);
  const sha256 = await sha256Hex(body);
  const key = `${prefix}/${bundlePath}`.replace(/\/+/g, '/');
  const contentType = contentTypeForPath(bundlePath, request.headers.get('content-type') || '');
  await bucket.put(key, body, {
    httpMetadata: { contentType },
    customMetadata: {
      schema: 'fs27.skynet.function_bundle_file.v1',
      project_id: projectId,
      deployment_id: deploymentId,
      workspace_id: workspaceId,
      sha256
    }
  });
  const nextFile = { path: bundlePath, size: body.byteLength, sha256, content_type: contentType };
  const files = [
    ...priorFiles.filter((file) => file.path !== bundlePath),
    nextFile
  ].slice(0, MAX_FUNCTION_BUNDLE_FILES);
  if (files.length > MAX_FUNCTION_BUNDLE_FILES) {
    return httpJson(413, {
      ok: false,
      error: `SkyeNet function bundles can include at most ${MAX_FUNCTION_BUNDLE_FILES} files.`,
      code: 'SKYENET_FUNCTION_FILE_COUNT_CAP'
    }, cors);
  }
  const buildReceiptFile = files.find((file) => file.path === 'build-receipt.json');
  const functionBundle = {
    schema: 'fs27.skynet.function_bundle.v1',
    mode: 'dynamic-workers',
    status: 'uploading',
    prefix,
    files,
    file_count: files.length,
    total_bytes: nextBytes,
    function_count: Number(priorBundle.function_count || 0),
    background_function_count: Number(priorBundle.background_function_count || 0),
    scheduled_function_count: Number(priorBundle.scheduled_function_count || 0),
    functions: priorBundle.functions || [],
    schedules: priorBundle.schedules || [],
    modules: priorBundle.modules || [],
    build_receipt_key: buildReceiptFile ? `${prefix}/${buildReceiptFile.path}` : priorBundle.build_receipt_key || '',
    build_receipt_sha256: buildReceiptFile?.sha256 || priorBundle.build_receipt_sha256 || '',
    manifest_key: functionManifestKeyForBundle({ prefix }),
    public_asset_exposure: false,
    runtime_policy: {
      loader_binding: 'SKYENET_FUNCTION_LOADER',
      egress: 'deny',
      env: 'deny-by-default',
      signature_required: caps.signed_function_bundles_required !== false
    },
    updated_at: new Date().toISOString()
  };
  const deployment = await upsertDeploymentRecord(env, auth, request, {
    workspace_id: workspaceId,
    project_id: projectId,
    deployment_id: deploymentId,
    function_bundle: functionBundle
  });
  const receipt = await saveReceipt(env, auth, workspaceId, 'skynet.functions.upload', {
    project_id: projectId,
    deployment_id: deploymentId,
    path: bundlePath,
    key,
    bytes: body.byteLength,
    total_bytes: nextBytes,
    sha256,
    runtime: 'dynamic-workers'
  });
  return httpJson(200, {
    ok: true,
    project_id: projectId,
    deployment_id: deploymentId,
    workspace_id: workspaceId,
    path: bundlePath,
    key,
    bytes: body.byteLength,
    total_bytes: nextBytes,
    sha256,
    content_type: contentType,
    function_bundle: functionBundle,
    deployment: deployment.deployment,
    receipt
  }, cors);
}

async function handleFunctionsComplete(request, env, cors) {
  const auth = await requireDeployAuth(request, cors);
  const body = await readJson(request);
  const bucket = deploymentBucket(env);
  if (!bucket?.put || !bucket?.get) return httpJson(500, { error: 'DEPLOYMENT_ASSET_BUCKET is not configured for function activation', code: 'NO_DEPLOYMENT_BUCKET' }, cors);
  const runtimeConfigured = Boolean(env.SKYENET_FUNCTION_LOADER?.get || env.SKYENET_FUNCTION_LOADER?.load || truthy(env.SKYENET_FUNCTION_LOADER_CONFIGURED));
  if (!runtimeConfigured) {
    return httpJson(503, {
      ok: false,
      error: 'SKYENET_FUNCTION_LOADER binding is required before activating uploaded serverless functions.',
      code: 'SKYENET_FUNCTION_LOADER_MISSING'
    }, cors);
  }
  const principal = authPrincipal(auth);
  const workspaceResult = await ensureWorkspace(env, auth, request, body);
  const workspaceId = workspaceResult.workspace.workspace_id;
  const caps = workspaceResult.workspace.caps || capsForWorkspace(workspaceResult.workspace, auth, request);
  await enforceFunctionBundleQuota(workspaceResult.workspace, 0, auth, request);
  const projectId = normalizeSlug(body.project_id || body.projectId, 'project', MAX_PROJECT);
  const deploymentId = normalizeSlug(body.deployment_id || body.deploymentId, 'dep_missing', MAX_DEPLOYMENT);
  const existing = (await upsertDeploymentRecord(env, auth, request, {
    workspace_id: workspaceId,
    project_id: projectId,
    deployment_id: deploymentId
  })).deployment;
  const priorBundle = existing.function_bundle || {};
  const prefix = functionBundlePrefix(principal, workspaceId, projectId, deploymentId, body.function_prefix || body.functionPrefix || priorBundle.prefix || '');
  const manifestKey = functionManifestKeyForBundle({ prefix });
  let rawManifest = body.manifest && typeof body.manifest === 'object' ? body.manifest : null;
  if (!rawManifest) {
    rawManifest = await objectJson(await bucket.get(manifestKey).catch(() => null), null);
  }
  if (!rawManifest) return httpJson(400, { ok: false, error: 'SkyeNet function activation requires a manifest object or uploaded manifest.json.', code: 'FUNCTION_MANIFEST_MISSING' }, cors);
  const manifest = sanitizeFunctionManifest(rawManifest, caps);
  const signatureRequired = caps.signed_function_bundles_required !== false;
  const clientSigned = rawManifest?.signature?.alg === 'HS256' && rawManifest?.signature?.value;
  const serverSignRequested = truthy(body.server_sign_manifest || body.serverSignManifest || body.customer_upload || body.customerUpload);
  let signature = null;
  if (clientSigned || !serverSignRequested) {
    signature = await verifyFunctionManifestSignature(
      rawManifest,
      env.SKYENET_FUNCTION_BUNDLE_SIGNING_KEY || '',
      signatureRequired
    );
  } else {
    if (!signatureRequired) {
      signature = { ok: true, required: false, server_signed: false };
    } else if (!caps.functions_enabled || (!caps.managed_functions_enabled && !caps.admin_override && !isAdminPrincipal(auth, request))) {
      const error = new Error('Server-signed customer function activation requires a SkyeNet managed functions workspace or owner/admin approval.');
      error.status = 402;
      error.code = 'SKYENET_FUNCTION_SERVER_SIGN_PLAN_REQUIRED';
      throw error;
    } else {
      const signed = await signFunctionManifestServerSide(manifest, env.SKYENET_FUNCTION_BUNDLE_SIGNING_KEY || '', auth, request);
      manifest.signature = signed.record;
      signature = signed.proof;
    }
  }
  const audit = await auditFunctionBundleFiles(bucket, prefix, manifest);
  if (!audit.ok) {
    return httpJson(409, {
      ok: false,
      error: 'SkyeNet function activation refused because the signed manifest does not match uploaded function bundle storage.',
      code: 'FUNCTION_BUNDLE_STORAGE_MISMATCH',
      project_id: projectId,
      deployment_id: deploymentId,
      function_prefix: prefix,
      checked_count: audit.checked_count,
      missing_count: audit.missing_count,
      missing_files: audit.missing_files,
      unsigned_files: audit.unsigned_files,
      hash_mismatches: audit.hash_mismatches
    }, cors);
  }
  const activatedAt = new Date().toISOString();
  const canonicalManifest = {
    ...manifest,
    activation: {
      schema: 'fs27.skynet.function_activation.v1',
      project_id: projectId,
      deployment_id: deploymentId,
      customer_id: principal.customer_id,
      workspace_id: workspaceId,
      activated_at: activatedAt,
      storage_verified: true,
      signature
    }
  };
  await bucket.put(`${prefix}/.skyenet/functions-manifest.json`, JSON.stringify(canonicalManifest, null, 2), {
    httpMetadata: { contentType: 'application/json; charset=utf-8' }
  });
  const priorFiles = Array.isArray(priorBundle.files) ? dedupeFunctionFiles(priorBundle.files) : [];
  const buildReceiptFile = priorFiles.find((file) => file.path === 'build-receipt.json');
  const functionBundle = {
    schema: 'fs27.skynet.function_bundle.v1',
    mode: 'dynamic-workers',
    status: 'active',
    prefix,
    files: priorFiles,
    file_count: priorFiles.length,
    total_bytes: Number(audit.total_bytes || priorBundle.total_bytes || 0),
    manifest_key: `${prefix}/.skyenet/functions-manifest.json`,
    upload_manifest_key: manifestKey,
    bundle_id: manifest.bundle_id,
    tenant_id: manifest.tenant_id,
    function_count: manifest.function_count,
    background_function_count: manifest.background_function_count || 0,
    scheduled_function_count: manifest.scheduled_function_count || 0,
    functions: manifest.functions,
    schedules: manifest.schedules || [],
    modules: manifest.modules,
    build_receipt_key: buildReceiptFile ? `${prefix}/${buildReceiptFile.path}` : priorBundle.build_receipt_key || '',
    build_receipt_sha256: buildReceiptFile?.sha256 || priorBundle.build_receipt_sha256 || '',
    storage_verified: true,
    storage_checked_count: audit.checked_count,
    signed: signature.ok,
    signature,
    public_asset_exposure: false,
    runtime_policy: {
      loader_binding: 'SKYENET_FUNCTION_LOADER',
      isolation: 'cloudflare-dynamic-worker-v1',
      egress: 'deny',
      global_outbound: null,
      env: 'deny-by-default',
      custom_limits: {
        cpu_ms: Math.min(MAX_FUNCTION_CPU_MS, Number(caps.function_cpu_ms || MAX_FUNCTION_CPU_MS)),
        subrequests: Math.min(MAX_FUNCTION_SUBREQUESTS, Number(caps.function_subrequests ?? MAX_FUNCTION_SUBREQUESTS))
      },
      body_cap_bytes: Math.min(MAX_FUNCTION_BODY_BYTES, Number(caps.function_body_bytes || MAX_FUNCTION_BODY_BYTES)),
      invocation_receipts_required: true,
      abuse_kill_switch: true
    },
    kill_switch: false,
    completed_at: activatedAt,
    updated_at: activatedAt
  };
  const scheduleIndexRecords = [];
  const scheduleIndexKeys = [];
  for (const fn of functionBundle.functions || []) {
    if (fn.invocation_mode !== 'scheduled' || !fn.schedule?.cron) continue;
    const key = functionScheduleIndexKey(principal.customer_id, workspaceId, projectId, deploymentId, fn.name);
    const record = {
      schema: 'fs27.skynet.function_schedule.v1',
      active: true,
      customer_id: principal.customer_id,
      workspace_id: workspaceId,
      project_id: projectId,
      deployment_id: deploymentId,
      function_name: fn.name,
      cron: fn.schedule.cron,
      timezone: fn.schedule.timezone || 'UTC',
      route: `/.skyenet/scheduled/${fn.name}`,
      bundle_id: functionBundle.bundle_id,
      function_sha256: fn.sha256 || '',
      updated_at: activatedAt
    };
    await kvPutJson(receiptKv(env), key, record, {
      schema: record.schema,
      customer_id: record.customer_id,
      workspace_id: record.workspace_id,
      project_id: record.project_id,
      deployment_id: record.deployment_id,
      function_name: record.function_name,
      active: 'true'
    });
    scheduleIndexRecords.push(record);
    scheduleIndexKeys.push(key);
  }
  functionBundle.schedule_index = {
    schema: 'fs27.skynet.function_schedule_index.v1',
    indexed_count: scheduleIndexRecords.length,
    keys: scheduleIndexKeys,
    records: scheduleIndexRecords.map((record) => ({
      function_name: record.function_name,
      cron: record.cron,
      timezone: record.timezone,
      route: record.route,
      active: record.active
    }))
  };
  const deployment = await upsertDeploymentRecord(env, auth, request, {
    workspace_id: workspaceId,
    project_id: projectId,
    deployment_id: deploymentId,
    function_bundle: functionBundle
  });
  const receipt = await saveReceipt(env, auth, workspaceId, 'skynet.functions.complete', {
    project_id: projectId,
    deployment_id: deploymentId,
    function_prefix: prefix,
    function_count: functionBundle.function_count,
    background_function_count: functionBundle.background_function_count,
    scheduled_function_count: functionBundle.scheduled_function_count,
    schedule_indexed_count: scheduleIndexRecords.length,
    manifest_key: functionBundle.manifest_key,
    upload_manifest_key: functionBundle.upload_manifest_key,
    storage_verified: true,
    signed: true,
    runtime: 'cloudflare-dynamic-worker-v1'
  });
  return httpJson(200, {
    ok: true,
    project_id: projectId,
    deployment_id: deploymentId,
    workspace_id: workspaceId,
    function_bundle: functionBundle,
    deployment: deployment.deployment,
    receipt
  }, cors);
}

async function handleFunctionsStatus(request, env, cors) {
  const auth = await requireDeployAuth(request, cors);
  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const principal = authPrincipal(auth);
  const workspaceId = workspaceIdFromInput(params, principal);
  const projectId = normalizeSlug(params.project_id || params.projectId, 'project', MAX_PROJECT);
  const deploymentId = normalizeSlug(params.deployment_id || params.deploymentId, '', MAX_DEPLOYMENT);
  if (!deploymentId) return httpJson(400, { ok: false, error: 'deployment_id is required', code: 'MISSING_DEPLOYMENT_ID' }, cors);
  const deployment = await kvGetJson(receiptKv(env), deploymentKey(principal.customer_id, workspaceId, projectId, deploymentId), null);
  if (!deployment) return httpJson(404, { ok: false, error: 'Deployment not found', code: 'DEPLOYMENT_NOT_FOUND', project_id: projectId, deployment_id: deploymentId }, cors);
  const bundle = deployment.function_bundle || null;
  return httpJson(200, {
    ok: true,
    project_id: projectId,
    deployment_id: deploymentId,
    workspace_id: workspaceId,
    runtime_configured: Boolean(env.SKYENET_FUNCTION_LOADER?.get || env.SKYENET_FUNCTION_LOADER?.load || truthy(env.SKYENET_FUNCTION_LOADER_CONFIGURED)),
    function_bundle: bundle ? {
      schema: bundle.schema,
      mode: bundle.mode,
      status: bundle.status,
      prefix: bundle.prefix,
      manifest_key: bundle.manifest_key,
      bundle_id: bundle.bundle_id,
      function_count: bundle.function_count,
      functions: (bundle.functions || []).map((fn) => ({
        name: fn.name,
        bundle_path: fn.bundle_path,
        routes: fn.routes,
        invocation_mode: fn.invocation_mode || 'request',
        background: fn.background === true,
        schedule: fn.schedule || null,
        limits: fn.limits
      })),
      background_function_count: bundle.background_function_count || 0,
      scheduled_function_count: bundle.scheduled_function_count || 0,
      schedules: bundle.schedules || [],
      schedule_index: bundle.schedule_index || null,
      modules: (bundle.modules || []).map((mod) => ({ path: mod.path, size: mod.size || 0, sha256: mod.sha256 || '' })),
      storage_verified: bundle.storage_verified,
      signed: bundle.signed,
      signature: bundle.signature ? {
        ok: bundle.signature.ok === true,
        alg: cleanText(bundle.signature.alg || '', 40),
        key_hint: cleanText(bundle.signature.key_hint || '', 80),
        server_signed: bundle.signature.server_signed === true,
        required: bundle.signature.required !== false
      } : null,
      public_asset_exposure: false,
      runtime_policy: bundle.runtime_policy,
      completed_at: bundle.completed_at,
      updated_at: bundle.updated_at
    } : null
  }, cors);
}

async function handleFormsPolicy(request, env, cors) {
  const input = request.method === 'GET'
    ? Object.fromEntries(new URL(request.url).searchParams.entries())
    : await readJson(request);
  const context = await resolveFormsDeploymentContext(request, env, input, cors);
  if (request.method === 'GET') {
    return httpJson(200, {
      ok: true,
      project_id: context.projectId,
      deployment_id: context.deploymentId,
      workspace_id: context.workspaceId,
      forms_policy: context.deployment.forms_policy || sanitizeFormsPolicy({})
    }, cors);
  }
  const formsPolicy = sanitizeFormsPolicy(input);
  const now = new Date().toISOString();
  const deployment = {
    ...context.deployment,
    forms_policy: formsPolicy,
    updated_at: now
  };
  await kvPutJson(receiptKv(env), context.deploymentKey, deployment, {
    project_id: context.projectId,
    deployment_id: context.deploymentId,
    workspace_id: context.workspaceId,
    customer_id: context.customerScope.customer_id
  });
  const receipt = await saveReceipt(env, context.auth, context.workspaceId, 'skynet.forms.policy.updated', {
    project_id: context.projectId,
    deployment_id: context.deploymentId,
    spam_controls: formsPolicy.spam_controls,
    notifications: {
      mode: formsPolicy.notifications.mode,
      recipient_count: formsPolicy.notifications.owner_recipients.length,
      external_delivery_enabled: false
    }
  });
  return httpJson(200, {
    ok: true,
    project_id: context.projectId,
    deployment_id: context.deploymentId,
    workspace_id: context.workspaceId,
    forms_policy: formsPolicy,
    receipt
  }, cors);
}

async function handleFormsInbox(request, env, cors) {
  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const context = await resolveFormsDeploymentContext(request, env, params, cors);
  const bucket = formsBucket(env);
  if (!bucket?.get || !bucket?.list) {
    return httpJson(503, { ok: false, error: 'SkyeNet Forms inbox storage is not configured.', code: 'SKYENET_FORMS_BUCKET_MISSING' }, cors);
  }
  const formName = cleanText(params.form_name || params.formName || '', 160);
  const prefix = formsStoragePrefix(context.projectId, context.deploymentId, formName);
  const requestedLimit = Math.max(1, Math.min(250, Number(params.limit || 50) || 50));
  const listed = await r2ListObjects(bucket, prefix, requestedLimit * 4);
  const spamFilter = cleanText(params.spam || params.spam_status || params.spamStatus || '', 40).toLowerCase();
  const statusFilter = cleanText(params.status || '', 80).toLowerCase();
  const submissions = [];
  for (const object of listed.objects || []) {
    const key = object.key || object.name || '';
    if (!formRecordAllowedKey(key, context.projectId, context.deploymentId)) continue;
    const record = await objectJson(await bucket.get(key).catch(() => null), null);
    if (!record || record.schema !== 'skyenet.netlify-form-submission.v1') continue;
    const summary = formSubmissionSummary(record, key);
    if (spamFilter === 'spam' && !summary.spam_detected) continue;
    if (spamFilter === 'clean' && summary.spam_detected) continue;
    if (statusFilter && summary.status.toLowerCase() !== statusFilter) continue;
    submissions.push(summary);
    if (submissions.length >= requestedLimit) break;
  }
  submissions.sort((a, b) => String(b.received_at || '').localeCompare(String(a.received_at || '')));
  const counts = submissions.reduce((acc, item) => {
    acc.total += 1;
    if (item.spam_detected) acc.spam += 1;
    else acc.clean += 1;
    acc.by_status[item.status] = (acc.by_status[item.status] || 0) + 1;
    acc.by_form[item.form_name] = (acc.by_form[item.form_name] || 0) + 1;
    return acc;
  }, { total: 0, clean: 0, spam: 0, by_status: {}, by_form: {} });
  return httpJson(200, {
    ok: true,
    project_id: context.projectId,
    deployment_id: context.deploymentId,
    workspace_id: context.workspaceId,
    prefix,
    bucket_binding: formsBucketBinding(env),
    forms_policy: context.deployment.forms_policy || sanitizeFormsPolicy({}),
    counts,
    submissions,
    list_supported: listed.list_supported !== false,
    list_complete: listed.list_complete !== false,
    cursor: listed.cursor || null
  }, cors);
}

async function findFormSubmissionRecord(bucket, context, input) {
  const explicitKey = cleanText(input.receipt_key || input.receiptKey || input.key || '', MAX_PATH * 2).replace(/^\/+/, '');
  if (explicitKey) {
    if (!formRecordAllowedKey(explicitKey, context.projectId, context.deploymentId)) {
      const error = new Error('Form submission key is outside the requested deployment scope.');
      error.status = 403;
      error.code = 'FORM_SUBMISSION_SCOPE_DENIED';
      throw error;
    }
    const record = await objectJson(await bucket.get(explicitKey).catch(() => null), null);
    if (record) return { key: explicitKey, record };
  }
  const submissionId = cleanText(input.submission_id || input.submissionId || '', 160);
  if (submissionId) {
    const formName = cleanText(input.form_name || input.formName || '', 160);
    const listed = await r2ListObjects(bucket, formsStoragePrefix(context.projectId, context.deploymentId, formName), 1000);
    for (const object of listed.objects || []) {
      const key = object.key || object.name || '';
      if (!formRecordAllowedKey(key, context.projectId, context.deploymentId)) continue;
      const record = await objectJson(await bucket.get(key).catch(() => null), null);
      if (record?.submission_id === submissionId) return { key, record };
    }
  }
  const error = new Error('Form submission not found.');
  error.status = 404;
  error.code = 'FORM_SUBMISSION_NOT_FOUND';
  throw error;
}

async function handleFormsSubmission(request, env, cors) {
  const input = request.method === 'GET'
    ? Object.fromEntries(new URL(request.url).searchParams.entries())
    : await readJson(request);
  const context = await resolveFormsDeploymentContext(request, env, input, cors);
  const bucket = formsBucket(env);
  if (!bucket?.get || !bucket?.put) {
    return httpJson(503, { ok: false, error: 'SkyeNet Forms inbox storage is not configured.', code: 'SKYENET_FORMS_BUCKET_MISSING' }, cors);
  }
  const found = await findFormSubmissionRecord(bucket, context, input);
  if (request.method === 'GET') {
    return httpJson(200, {
      ok: true,
      project_id: context.projectId,
      deployment_id: context.deploymentId,
      workspace_id: context.workspaceId,
      key: found.key,
      submission: found.record,
      summary: formSubmissionSummary(found.record, found.key)
    }, cors);
  }
  const allowedStatuses = new Set(['new', 'unread', 'read', 'archived', 'resolved']);
  const status = normalizeSlug(input.status || input.workflow_status || input.workflowStatus || found.record.workflow?.status || 'read', 'read', 80);
  const spamStatus = cleanText(input.spam_status || input.spamStatus || '', 80).toLowerCase();
  const now = new Date().toISOString();
  const record = {
    ...found.record,
    workflow: {
      ...(found.record.workflow || {}),
      status: allowedStatuses.has(status) ? status : 'read',
      updated_at: now,
      updated_by_customer_id: context.principal.customer_id
    },
    moderation: {
      ...(found.record.moderation || {}),
      note: cleanText(input.note || input.moderation_note || input.moderationNote || found.record.moderation?.note || '', 2000),
      updated_at: now,
      updated_by_customer_id: context.principal.customer_id,
      updated_by_role: context.principal.role || ''
    },
    updated_at: now
  };
  if (spamStatus === 'spam' || spamStatus === 'not_spam' || spamStatus === 'clean') {
    const markedSpam = spamStatus === 'spam';
    record.spam = {
      ...(record.spam || {}),
      detected: markedSpam,
      reasons: markedSpam ? [...new Set([...(record.spam?.reasons || []), 'owner_marked_spam'])] : ['owner_marked_not_spam'],
      owner_reviewed: true,
      owner_reviewed_at: now
    };
  }
  await bucket.put(found.key, JSON.stringify(record, null, 2), {
    httpMetadata: { contentType: 'application/json; charset=utf-8' },
    customMetadata: {
      project_id: context.projectId,
      deployment_id: context.deploymentId,
      form_name: record.form_name || '',
      spam_detected: record.spam?.detected ? 'true' : 'false',
      workflow_status: record.workflow.status
    }
  });
  const receipt = await saveReceipt(env, context.auth, context.workspaceId, 'skynet.forms.submission.updated', {
    project_id: context.projectId,
    deployment_id: context.deploymentId,
    form_name: record.form_name || '',
    submission_id: record.submission_id || '',
    submission_key: found.key,
    status: record.workflow.status,
    spam_detected: record.spam?.detected === true
  });
  return httpJson(200, {
    ok: true,
    project_id: context.projectId,
    deployment_id: context.deploymentId,
    workspace_id: context.workspaceId,
    key: found.key,
    submission: record,
    summary: formSubmissionSummary(record, found.key),
    receipt
  }, cors);
}

async function handleFormsFile(request, env, cors) {
  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const context = await resolveFormsDeploymentContext(request, env, params, cors);
  const bucket = formsBucket(env);
  if (!bucket?.get) {
    return httpJson(503, { ok: false, error: 'SkyeNet Forms file storage is not configured.', code: 'SKYENET_FORMS_BUCKET_MISSING' }, cors);
  }
  const fileKey = cleanText(params.file_key || params.fileKey || params.key || '', MAX_PATH * 2).replace(/^\/+/, '');
  if (!formFileAllowedKey(fileKey, context.projectId, context.deploymentId)) {
    return httpJson(403, { ok: false, error: 'Form file key is outside the requested deployment scope.', code: 'FORM_FILE_SCOPE_DENIED' }, cors);
  }
  const object = await bucket.get(fileKey).catch(() => null);
  if (!object) return httpJson(404, { ok: false, error: 'Form file not found.', code: 'FORM_FILE_NOT_FOUND' }, cors);
  const headers = new Headers(cors);
  headers.set('cache-control', 'private, no-store');
  headers.set('x-skynet-form-file', 'private');
  headers.set('x-skynet-project-id', context.projectId);
  headers.set('x-skynet-deployment-id', context.deploymentId);
  if (typeof object.writeHttpMetadata === 'function') object.writeHttpMetadata(headers);
  if (!headers.has('content-type')) headers.set('content-type', contentTypeForPath(fileKey));
  headers.set('content-disposition', `attachment; filename="${safeDownloadName(fileKey.split('/').pop() || 'form-upload')}"`);
  const body = object.body && typeof object.body.getReader === 'function' ? object.body : await readObjectBytes(object);
  return new Response(body, { status: 200, headers });
}

async function writeFormsNotificationReceipt(env, context, record, submissionKey, input = {}) {
  const bucket = formsBucket(env);
  if (!bucket?.put) {
    const error = new Error('SkyeNet Forms notification storage is not configured.');
    error.status = 503;
    error.code = 'SKYENET_FORMS_BUCKET_MISSING';
    throw error;
  }
  const policy = context.deployment.forms_policy || sanitizeFormsPolicy({});
  const notificationPolicy = policy.notifications || {};
  const now = new Date().toISOString();
  const notificationId = randomId('formntf');
  const formName = cleanText(record.form_name || input.form_name || input.formName || 'form', 160);
  const spamDetected = record.spam?.detected === true;
  const mode = normalizeFormsNotificationMode(input.mode || notificationPolicy.mode || 'receipt-only');
  const key = [
    formNotificationsPrefix(context.projectId, context.deploymentId, formName),
    now.slice(0, 10),
    `${notificationId}.json`
  ].join('/');
  const delivery = await attemptFormsOwnerNotificationDelivery(env, context, record, submissionKey, key, notificationId, notificationPolicy, mode, spamDetected);
  const notification = {
    schema: 'fs27.skynet.forms_notification.v1',
    notification_id: notificationId,
    created_at: now,
    project_id: context.projectId,
    deployment_id: context.deploymentId,
    workspace_id: context.workspaceId,
    customer_id: context.customerScope.customer_id,
    form_name: formName,
    submission_id: cleanText(record.submission_id || '', 160),
    submission_key: submissionKey,
    status: delivery.status,
    mode,
    external_delivery_enabled: delivery.enabled === true,
    external_delivery_attempted: delivery.attempted === true,
    external_delivery_configured: delivery.configured === true,
    delivery_channel: delivery.channel || '',
    delivery_attempts: delivery.attempts || [],
    recipient_count: delivery.recipient_count,
    field_keys: Object.keys(record.fields || {}).slice(0, 100),
    spam_detected: spamDetected,
    spam_reasons: Array.isArray(record.spam?.reasons) ? record.spam.reasons : []
  };
  await bucket.put(key, JSON.stringify(notification, null, 2), {
    httpMetadata: { contentType: 'application/json; charset=utf-8' },
    customMetadata: {
      project_id: context.projectId,
      deployment_id: context.deploymentId,
      form_name: formName,
      submission_id: notification.submission_id,
      status: notification.status
    }
  });
  return { key, notification };
}

async function handleFormsNotify(request, env, cors) {
  const input = await readJson(request);
  const context = await resolveFormsDeploymentContext(request, env, input, cors);
  const bucket = formsBucket(env);
  if (!bucket?.get || !bucket?.put) {
    return httpJson(503, { ok: false, error: 'SkyeNet Forms notification storage is not configured.', code: 'SKYENET_FORMS_BUCKET_MISSING' }, cors);
  }
  const found = await findFormSubmissionRecord(bucket, context, input);
  const notification = await writeFormsNotificationReceipt(env, context, found.record, found.key, input);
  const now = new Date().toISOString();
  const record = {
    ...found.record,
    notification: {
      key: notification.key,
      status: notification.notification.status,
      mode: notification.notification.mode,
      updated_at: now,
      external_delivery_enabled: notification.notification.external_delivery_enabled,
      external_delivery_attempted: notification.notification.external_delivery_attempted,
      delivery_channel: notification.notification.delivery_channel || ''
    },
    notifications: [
      ...(Array.isArray(found.record.notifications) ? found.record.notifications : []),
      { key: notification.key, status: notification.notification.status, created_at: now }
    ].slice(-25),
    updated_at: now
  };
  await bucket.put(found.key, JSON.stringify(record, null, 2), {
    httpMetadata: { contentType: 'application/json; charset=utf-8' },
    customMetadata: {
      project_id: context.projectId,
      deployment_id: context.deploymentId,
      form_name: record.form_name || '',
      spam_detected: record.spam?.detected ? 'true' : 'false',
      notification_status: notification.notification.status
    }
  });
  const receipt = await saveReceipt(env, context.auth, context.workspaceId, 'skynet.forms.notification.queued', {
    project_id: context.projectId,
    deployment_id: context.deploymentId,
    form_name: record.form_name || '',
    submission_id: record.submission_id || '',
    submission_key: found.key,
    notification_key: notification.key,
    status: notification.notification.status,
    external_delivery_enabled: notification.notification.external_delivery_enabled,
    external_delivery_attempted: notification.notification.external_delivery_attempted,
    delivery_channel: notification.notification.delivery_channel || ''
  });
  return httpJson(200, {
    ok: true,
    project_id: context.projectId,
    deployment_id: context.deploymentId,
    workspace_id: context.workspaceId,
    key: found.key,
    notification_key: notification.key,
    notification: notification.notification,
    summary: formSubmissionSummary(record, found.key),
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
    ? Array.from(new Set(body.files.map((item) => normalizeAssetPath(item)))).slice(0, 20000)
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
  const assetAudit = await auditDeploymentFiles(bucket, prefix, files);
  if (!assetAudit.ok) {
    return httpJson(409, {
      ok: false,
      error: 'SkyeNet deployment complete refused because one or more declared public files are missing from deployment storage.',
      code: 'DEPLOYMENT_ASSET_MISSING',
      project_id: projectId,
      deployment_id: deploymentId,
      asset_prefix: prefix,
      checked_count: assetAudit.checked_count,
      missing_count: assetAudit.missing_count,
      missing_files: assetAudit.missing_files
    }, cors);
  }
  await enforceDeploymentQuota(
    env,
    workspaceResult.workspace,
    await deploymentUsage(env, workspaceResult.workspace.customer_id, workspaceResult.workspace.workspace_id, { include_routes: false }),
    assetAudit.total_bytes,
    auth,
    request
  );
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
      has_root_index: hasRootIndex,
      storage_verified: true,
      storage_checked_count: assetAudit.checked_count,
      storage_total_bytes: assetAudit.total_bytes
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
    total_bytes: assetAudit.total_bytes || existing.total_bytes || 0,
    status: 'complete',
    completed_at: manifest.completed_at
  });
  const receipt = await saveReceipt(env, auth, workspaceResult.workspace.workspace_id, 'skynet.deploy.complete', {
    project_id: projectId,
    deployment_id: deploymentId,
    asset_prefix: prefix,
    files: files.length,
    total_bytes: assetAudit.total_bytes || existing.total_bytes || 0,
    storage_verified: true
  });
  return httpJson(200, { ok: true, project_id: projectId, deployment_id: deploymentId, workspace_id: workspaceResult.workspace.workspace_id, asset_prefix: prefix, files: files.length, asset_audit: assetAudit, deployment: deployment.deployment, receipt }, cors);
}

async function handleRoute(request, env, cors, context = {}) {
  const auth = await requireDeployAuth(request, cors);
  const kv = routeKv(env);
  if (!kv?.put) return httpJson(500, { error: 'ROUTING_KV is not configured', code: 'NO_ROUTING_KV' }, cors);
  const body = await readJson(request);
  const workspaceResult = await ensureWorkspace(env, auth, request, body);
  const record = routeRecordFromBody(body, auth, env, request);
  const principal = authPrincipal(auth);
  const completedDeployment = await kvGetJson(
    receiptKv(env),
    deploymentKey(principal.customer_id, workspaceResult.workspace.workspace_id, record.project_id, record.active_deployment_id),
    null
  );
  if (!completedDeployment || completedDeployment.status !== 'complete') {
    return httpJson(409, {
      ok: false,
      error: 'SkyeNet route registration requires a completed, storage-verified deployment.',
      code: 'DEPLOYMENT_NOT_COMPLETE',
      project_id: record.project_id,
      deployment_id: record.active_deployment_id,
      status: completedDeployment?.status || 'missing'
    }, cors);
  }
  if (completedDeployment.asset_prefix && cleanText(completedDeployment.asset_prefix, MAX_PATH) !== record.asset_prefix) {
    return httpJson(409, {
      ok: false,
      error: 'SkyeNet route registration refused because the requested asset prefix does not match the completed deployment.',
      code: 'DEPLOYMENT_PREFIX_MISMATCH',
      project_id: record.project_id,
      deployment_id: record.active_deployment_id
    }, cors);
  }
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
  const deploymentPatch = {
    ...body,
    workspace_id: workspaceResult.workspace.workspace_id,
    project_id: record.project_id,
    deployment_id: record.active_deployment_id,
    asset_prefix: record.asset_prefix,
    route_key: key,
    live_url: liveUrl,
    status: 'routed'
  };
  const receiptMeta = {
    project_id: record.project_id,
    deployment_id: record.active_deployment_id,
    route_key: key,
    live_url: liveUrl,
    mount_path: record.mount_path,
    hostname: record.hostname,
    public_access: record.public_access
  };
  let deployment = null;
  let receipt = null;
  const finishRouteBookkeeping = async () => {
    const savedDeployment = await upsertDeploymentRecord(env, auth, request, deploymentPatch);
    const savedReceipt = await saveReceipt(env, auth, workspaceResult.workspace.workspace_id, 'skynet.deploy.route', receiptMeta);
    return { savedDeployment, savedReceipt };
  };
  if (typeof context?.waitUntil === 'function') {
    context.waitUntil(finishRouteBookkeeping().catch(() => null));
    deployment = {
      deployment: {
        ...completedDeployment,
        ...deploymentPatch,
        route_key: key,
        live_url: liveUrl,
        status: 'routed'
      }
    };
    receipt = {
      schema: 'fs27.skynet.receipt.v1',
      type: 'skynet.deploy.route',
      status: 'queued_best_effort',
      project_id: record.project_id,
      deployment_id: record.active_deployment_id,
      live_url: liveUrl,
      route_key: key
    };
  } else {
    const finished = await finishRouteBookkeeping();
    deployment = finished.savedDeployment;
    receipt = finished.savedReceipt;
  }
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
  const principal = authPrincipal(auth);
  const customerScope = customerScopeFromInput(params, auth, request);
  const explicitCustomer = cleanText(params.source_customer_id || params.sourceCustomerId || params.customer_id || params.customerId || '', 160);
  const projectFilter = normalizeSlug(params.project_id || params.projectId || '', '', MAX_PROJECT);
  let workspace = null;
  let ownerResolvedDeploymentRows = null;
  if (customerScope.owner_override) {
    const workspaceId = workspaceIdFromInput(params, customerScope.source_principal);
    workspace = await kvGetJson(receiptKv(env), workspaceKey(customerScope.customer_id, workspaceId), null);
    workspace ||= {
      schema: 'fs27.skynet.workspace.v1',
      customer_id: customerScope.customer_id,
      workspace_id: workspaceId,
      plan_name: 'owner-admin-recovered-custody',
      created_at: '',
      updated_at: ''
    };
  } else if (!explicitCustomer && isAdminPrincipal(auth, request) && (params.workspace_id || params.workspaceId) && projectFilter) {
    const workspaceId = workspaceIdFromInput(params, principal);
    const rows = await kvListJson(receiptKv(env), 'skynet:deployment:v1:customer:', 5000);
    ownerResolvedDeploymentRows = rows.filter((row) => {
      const item = row.value || {};
      return item?.schema === 'fs27.skynet.deployment.v1'
        && String(item.workspace_id || '') === String(workspaceId)
        && String(item.project_id || '') === String(projectFilter);
    }).sort((a, b) => deploymentFreshnessStamp(b.value).localeCompare(deploymentFreshnessStamp(a.value)));
    if (ownerResolvedDeploymentRows.length) {
      const customerId = cleanText(ownerResolvedDeploymentRows[0].value.customer_id || '', 160) || principal.customer_id;
      workspace = await kvGetJson(receiptKv(env), workspaceKey(customerId, workspaceId), null);
      workspace ||= {
        schema: 'fs27.skynet.workspace.v1',
        customer_id: customerId,
        workspace_id: workspaceId,
        plan_name: 'owner-admin-recovered-custody',
        created_at: '',
        updated_at: ''
      };
    } else {
      const result = await ensureWorkspace(env, auth, request, params);
      workspace = result.workspace;
    }
  } else {
    const result = await ensureWorkspace(env, auth, request, params);
    workspace = result.workspace;
  }
  const usage = await deploymentUsage(env, workspace.customer_id, workspace.workspace_id, { include_routes: false, receipt_limit: 100 });
  const deploymentRows = ownerResolvedDeploymentRows || await kvListJson(receiptKv(env), deploymentPrefix(workspace.customer_id, workspace.workspace_id), 500);
  const deployments = deploymentRows
    .map((item) => item.value)
    .filter((item) => item?.schema === 'fs27.skynet.deployment.v1')
    .sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')))
    .slice(0, 100)
    .map((deployment) => ({
      ...deployment,
      source_download_url: sourceDownloadPath(workspace.workspace_id, deployment.project_id || '', deployment.deployment_id || ''),
      source_manifest_url: sourceManifestPath(workspace.workspace_id, deployment.project_id || '', deployment.deployment_id || ''),
      source_tree_url: sourceTreePath(workspace.workspace_id, deployment.project_id || '', deployment.deployment_id || ''),
      source_search_url: sourceSearchPath(workspace.workspace_id, deployment.project_id || '', deployment.deployment_id || ''),
      source_transfer_url: sourceTransferPath(),
      source_codebases_url: sourceCodebasesPath(),
      source_custody: {
        account_scoped: true,
        visible_to_authenticated_account: true,
        client_handoff_requires_transfer: true,
        package_mode: deployment.source_package?.mode || 'public-deployment-files',
        private_full_project_package: sourcePackageHasFiles(deployment.source_package),
        private_source_file_count: deployment.source_package?.file_count || 0,
        private_source_total_bytes: deployment.source_package?.total_bytes || 0,
        manifest_key: deployment.source_package?.manifest_key || sourceManifestKeyForPackage(deployment.source_package || {}),
        index_key: deployment.source_package?.index_key || sourceIndexKeyForPackage(deployment.source_package || {}),
        ide_readable_codebase: true,
        public_asset_exposure: deployment.source_package?.public_asset_exposure === false ? false : 'public_assets_only',
        direct_download_format: 'tar',
        secure_pack_extension: '.skye',
        secure_pack_lineage: 'SkyeDocxMax .skye envelope plus SkyeSecure v2 source-pack custody',
        methods: sourceTransferMethodsForResponse()
      },
      functions_url: functionStatusPath(workspace.workspace_id, deployment.project_id || '', deployment.deployment_id || ''),
      functions: {
        active: deployment.function_bundle?.status === 'active',
        mode: deployment.function_bundle?.mode || '',
        runtime: deployment.function_bundle?.runtime_policy?.isolation || '',
        function_count: deployment.function_bundle?.function_count || 0,
        background_function_count: deployment.function_bundle?.background_function_count || 0,
        scheduled_function_count: deployment.function_bundle?.scheduled_function_count || 0,
        schedules: deployment.function_bundle?.schedules || [],
        signed: Boolean(deployment.function_bundle?.signed),
        storage_verified: Boolean(deployment.function_bundle?.storage_verified),
        public_asset_exposure: false,
        invocation_receipts_required: deployment.function_bundle?.runtime_policy?.invocation_receipts_required === true
      }
    }));
  const codebaseMounts = await listSourceCodebaseRecords(env, workspace.customer_id, workspace.workspace_id, {
    project_id: projectFilter,
    limit: 500
  });
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
    custody_scope: {
      customer_id: workspace.customer_id,
      owner_override: customerScope.owner_override || Boolean(ownerResolvedDeploymentRows?.length),
      auto_resolved: Boolean(ownerResolvedDeploymentRows?.length),
      requested_by_customer_id: customerScope.requested_by_customer_id || ''
    },
    workspace,
    usage,
    codebase_mounts: codebaseMounts,
    codebase_mount_count: codebaseMounts.length,
    deployments,
    routes,
    route_source: includeFullRouteScan ? 'route-registry-scan' : 'deployment-records',
    route_scan_skipped: !includeFullRouteScan,
    receipts,
    support: skynetSupportProfile(env),
    links: {
      console: '/skyenet/index.html',
      api: '/api/skyenet',
      support: '/api/skyenet/support',
      export: '/api/skyenet/export',
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

async function validateRollbackTargetDeployment(env, customerId, workspaceId, projectId, deploymentId) {
  const kv = receiptKv(env);
  const bucket = deploymentBucket(env);
  const deployment = await kvGetJson(kv, deploymentKey(customerId, workspaceId, projectId, deploymentId), null);
  if (deployment?.schema !== 'fs27.skynet.deployment.v1') {
    return {
      ok: false,
      status: 404,
      code: 'ROLLBACK_DEPLOYMENT_NOT_FOUND',
      error: 'Rollback target deployment record was not found.'
    };
  }
  if (deployment.customer_id !== customerId || deployment.workspace_id !== workspaceId || deployment.project_id !== projectId || deployment.deployment_id !== deploymentId) {
    return {
      ok: false,
      status: 409,
      code: 'ROLLBACK_DEPLOYMENT_SCOPE_MISMATCH',
      error: 'Rollback target deployment does not match the requested workspace/project scope.'
    };
  }
  if (!['complete', 'rollback-active'].includes(String(deployment.status || ''))) {
    return {
      ok: false,
      status: 409,
      code: 'ROLLBACK_DEPLOYMENT_NOT_COMPLETE',
      error: 'Rollback target deployment is not a completed deployment.'
    };
  }
  if (!bucket?.get) {
    return {
      ok: false,
      status: 503,
      code: 'ROLLBACK_STORAGE_UNAVAILABLE',
      error: 'Deployment storage is required to verify rollback target assets.'
    };
  }
  const prefix = cleanText(deployment.asset_prefix || assetPrefix(projectId, deploymentId), MAX_PATH);
  const complete = await objectJson(await bucket.get(`${prefix}/.fs27/deployment-complete.json`).catch(() => null), null);
  if (complete?.schema !== 'fs27.deployment_complete.v1' || complete?.meta?.storage_verified !== true) {
    return {
      ok: false,
      status: 409,
      code: 'ROLLBACK_DEPLOYMENT_NOT_VERIFIED',
      error: 'Rollback target deployment is missing a verified deployment-complete receipt.'
    };
  }
  const files = Array.isArray(complete.files) ? complete.files : (Array.isArray(deployment.files) ? deployment.files : []);
  const assetAudit = await auditDeploymentFiles(bucket, prefix, files);
  if (!assetAudit.ok || assetAudit.checked_count !== files.length) {
    return {
      ok: false,
      status: 409,
      code: 'ROLLBACK_DEPLOYMENT_ASSET_MISSING',
      error: 'Rollback target deployment no longer has all verified public assets in storage.',
      asset_audit: assetAudit
    };
  }
  const bundle = deployment.function_bundle || null;
  if (bundle && bundle.status === 'active' && bundle.storage_verified !== true) {
    return {
      ok: false,
      status: 409,
      code: 'ROLLBACK_FUNCTION_BUNDLE_NOT_VERIFIED',
      error: 'Rollback target deployment has an active function bundle that is not storage verified.'
    };
  }
  return { ok: true, deployment, prefix, complete, asset_audit: assetAudit };
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
  const target = await validateRollbackTargetDeployment(
    env,
    workspaceResult.workspace.customer_id,
    workspaceResult.workspace.workspace_id,
    projectId,
    deploymentId
  );
  if (!target.ok) {
    return httpJson(target.status || 409, {
      ok: false,
      error: target.error || 'Rollback target deployment is not ready.',
      code: target.code || 'ROLLBACK_TARGET_NOT_READY',
      project_id: projectId,
      deployment_id: deploymentId,
      asset_audit: target.asset_audit || null
    }, cors);
  }
  const next = {
    ...existing,
    active_deployment_id: deploymentId,
    asset_prefix: target.prefix,
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
    live_url: liveUrl,
    asset_prefix: target.prefix,
    storage_verified: true,
    storage_checked_count: target.asset_audit?.checked_count || 0,
    function_bundle_verified: target.deployment?.function_bundle?.status === 'active'
      ? target.deployment.function_bundle.storage_verified === true
      : null
  });
  return httpJson(200, {
    ok: true,
    key,
    route: next,
    live_url: liveUrl,
    target_deployment: {
      project_id: projectId,
      deployment_id: deploymentId,
      asset_prefix: target.prefix,
      storage_verified: true,
      storage_checked_count: target.asset_audit?.checked_count || 0,
      function_bundle_verified: target.deployment?.function_bundle?.status === 'active'
        ? target.deployment.function_bundle.storage_verified === true
        : null
    },
    receipt
  }, cors);
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
      skynet_function_loader: Boolean(env.SKYENET_FUNCTION_LOADER?.get || env.SKYENET_FUNCTION_LOADER?.load || truthy(env.SKYENET_FUNCTION_LOADER_CONFIGURED)),
      routing_kv: Boolean(kv?.put),
	      routing_kv_reads: Boolean(kv?.get),
	      routing_kv_list: Boolean(kv?.list),
	      request_log_bucket: Boolean(requestLogBucket(env)?.put),
	      forms_bucket: Boolean(formsBucket(env)?.put),
	      forms_bucket_list: Boolean(formsBucket(env)?.list),
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
	      'PUT /deploy/source-index',
	      'PUT /deploy/source-archive',
	      'POST /deploy/source-archive-link',
	      'POST /deploy/source-complete',
	      'GET /deploy/source-manifest',
	      'GET /deploy/source-tree',
	      'GET /deploy/source-file',
	      'GET /deploy/source-search',
	      'GET /deploy/source-download',
	      'GET /deploy/source-codebases',
	      'POST /deploy/source-transfer',
	      'PUT /deploy/functions-upload',
	      'POST /deploy/functions-complete',
	      'GET /deploy/functions-status',
	      'GET/POST/PATCH /deploy/forms-policy',
	      'GET /deploy/forms-inbox',
	      'GET/PATCH /deploy/forms-submission',
	      'GET /deploy/forms-file',
	      'POST /deploy/forms-notify',
      'GET /deploy/receipts',
      'POST /deploy/rollback',
      'GET /deploy/observability',
      'GET /deploy/cost-model',
      'GET /deploy/support',
      'GET /deploy/export'
    ],
    capabilities: {
      static_drop_hosting: true,
      r2_asset_deployments: true,
      host_path_routing: true,
      gated_routes: true,
      public_routes: true,
	      fallback_origin_proxy: true,
	      netlify_redirects_file: true,
	      netlify_headers_file: true,
	      netlify_toml_redirects_headers: true,
	      netlify_spa_rewrite_fallbacks: true,
	      netlify_forms_basic_capture: true,
		      netlify_forms_honeypot_spam_filter: true,
		      netlify_forms_multipart_file_uploads: true,
		      netlify_forms_private_upload_custody: true,
		      netlify_forms_owner_inbox: true,
		      netlify_forms_submission_status_controls: true,
		      netlify_forms_notification_receipts: true,
		      netlify_forms_spam_policy_controls: true,
		      netlify_forms_private_file_downloads: true,
	      static_asset_range_requests: true,
	      static_asset_conditional_etag: true,
	      static_asset_conditional_last_modified: true,
	      first_party_worker_functions: true,
      skynet_edge_primary_release_lane: true,
      skynet_sovereign_runtime_compatible: true,
      netlify_function_bundle_converter: true,
      uploaded_function_bundle_intake: true,
      signed_function_bundle_manifest: true,
      uploaded_function_bundle_activation_api: true,
      uploaded_function_bundle_status_api: true,
      uploaded_background_functions: true,
      uploaded_scheduled_functions: true,
      uploaded_function_dynamic_worker_invocation: Boolean(env.SKYENET_FUNCTION_LOADER?.get || env.SKYENET_FUNCTION_LOADER?.load || truthy(env.SKYENET_FUNCTION_LOADER_CONFIGURED)),
      self_service_workspace: true,
      browser_drag_folder_drop: true,
      drop_root_folder_stripping: true,
      drop_build_root_auto_promotion: true,
      static_deploy_root_index_required: true,
      asset_missing_route_diagnostic: true,
      direct_live_link_after_publish: true,
	      source_downloads: true,
	      source_index_uploads: true,
	      source_archive_uploads: true,
	      source_archive_existing_object_links: true,
	      source_archive_range_downloads: true,
	      source_archive_direct_downloads: true,
	      netlify_style_deploy_file_downloads: true,
	      private_full_project_source_packages: true,
	      private_source_manifest_api: true,
	      private_source_tree_api: true,
	      private_source_file_api: true,
	      private_source_search_api: true,
	      ide_readable_source_codebases: true,
	      project_aware_codebase_mount_records: true,
	      source_codebase_grants: true,
	      source_index_format: 'jsonl',
	      source_index_max_files: MAX_SOURCE_INDEX_FILES,
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
      customer_support_profile: true,
      customer_export_bundle: true,
      customer_export_private_source_embedded: false,
      runtime_observability: true,
      runtime_log_exports: true,
      runtime_request_log_bucket_configured: Boolean(requestLogBucket(env)?.put),
      runtime_analytics_engine_configured: Boolean(env.REQUEST_ANALYTICS?.writeDataPoint || env.FS27_REQUEST_ANALYTICS?.writeDataPoint),
      runtime_queue_configured: Boolean(env.REQUEST_EVENT_QUEUE?.send || env.FS27_REQUEST_EVENT_QUEUE?.send),
      runtime_direct_archive_enabled: directRuntimeArchiveConfigured(env),
      citadeldb_rollups_configured: Boolean(env.RUNTIME_ROLLUP_DB?.prepare || env.FS27_RUNTIME_ROLLUP_DB?.prepare),
      citadel_runtime_ingest_configured: Boolean(env.CITADEL_RUNTIME_INGEST_URL || env.CITADELDB_RUNTIME_INGEST_URL),
      quota_enforcement: true,
      rollback_route_switch: true,
      owned_skyenet_functions_runtime_v1: true,
      functions_enabled_default: false,
      functions_enabled_for_workspace: Boolean(workspaceResult.workspace?.caps?.functions_enabled),
      managed_functions_paid_or_owner_approved_only: true,
      managed_functions_enabled_for_workspace: Boolean(workspaceResult.workspace?.caps?.managed_functions_enabled),
      function_bundle_manifest_required: true,
      function_bundle_signature_required: true,
      raw_customer_secrets_exposed_to_runtime: false,
      function_runtime_env_isolation: true,
      function_runtime_timeout_caps: true,
      function_runtime_memory_caps: true,
      function_runtime_body_caps: true,
      function_runtime_background_jobs: true,
      function_runtime_scheduled_triggers: true,
      function_runtime_egress_default_deny: true,
      function_invocation_receipts_required: true,
      workspace_abuse_kill_switch: true,
      billing_guard_before_scale: true,
      netlify_handler_event_parity: true,
      arbitrary_uploaded_serverless_functions: Boolean(
        (env.SKYENET_FUNCTION_LOADER?.get || env.SKYENET_FUNCTION_LOADER?.load || truthy(env.SKYENET_FUNCTION_LOADER_CONFIGURED))
        && workspaceResult.workspace?.caps?.functions_enabled
      ),
      function_boundary: 'Signed uploaded Netlify-compatible bundles can be activated for SkyeNet Functions Managed, Sovereign Runtime Reserve, or owner-approved workspaces and invoked through the isolated Dynamic Worker loader with no raw secret env and outbound fetch disabled by default. Free99 and starter workspaces remain static-first.'
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
      cloudflare_dynamic_workers_core_dependency: true,
      private_runtime_required_for_untrusted_customer_code: false,
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

async function handleSourceIndexUpload(request, env, cors) {
  const auth = await requireDeployAuth(request, cors);
  const bucket = deploymentBucket(env);
  if (!bucket?.put) return httpJson(500, { error: 'DEPLOYMENT_ASSET_BUCKET is not configured', code: 'NO_DEPLOYMENT_BUCKET' }, cors);
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const principal = authPrincipal(auth);
  const workspaceResult = await ensureWorkspace(env, auth, request, params);
  const workspaceId = workspaceResult.workspace.workspace_id;
  const projectId = normalizeSlug(params.projectId || params.project_id, 'project', MAX_PROJECT);
  const deploymentId = normalizeSlug(params.deploymentId || params.deployment_id, 'dep_missing', MAX_DEPLOYMENT);
  const prefix = sourcePackagePrefix(principal, workspaceId, projectId, deploymentId, params.sourcePrefix || params.source_prefix || '');
  const indexKey = `${prefix}/.skyenet/source-index.jsonl`;
  const manifestKey = `${prefix}/.skyenet/source-package.json`;
  const text = await request.text();
  const summary = await materializeSourceIndexArtifacts(bucket, { prefix }, text, {
    project_id: projectId,
    deployment_id: deploymentId,
    workspace_id: workspaceId
  });
  if (!summary.file_count) {
    return httpJson(400, {
      ok: false,
      error: 'Source index upload requires at least one JSONL source record.',
      code: 'SOURCE_INDEX_EMPTY'
    }, cors);
  }
  await bucket.put(indexKey, text.endsWith('\n') ? text : `${text}\n`, {
    httpMetadata: { contentType: 'application/x-ndjson; charset=utf-8' }
  });
  const existing = (await upsertDeploymentRecord(env, auth, request, {
    workspace_id: workspaceId,
    project_id: projectId,
    deployment_id: deploymentId
  })).deployment;
  const priorPackage = existing.source_package || {};
  const now = new Date().toISOString();
  const archive = sourceArchiveForPackage(priorPackage);
  const inlineFiles = summary.file_count <= MAX_SOURCE_PACKAGE_FILES ? sourceRecordListForResponse(summary.files) : [];
  const sampleFiles = sourceRecordListForResponse(summary.sample_files);
  const manifest = {
    schema: 'fs27.skynet.source_package_manifest.v1',
    mode: 'private-full-project',
    project_id: projectId,
    deployment_id: deploymentId,
    customer_id: principal.customer_id,
    workspace_id: workspaceId,
    completed_at: priorPackage.completed_at || null,
    indexed_at: now,
    public_asset_exposure: false,
    file_count: summary.file_count,
    files: inlineFiles,
    sample_files: sampleFiles,
    files_truncated: summary.file_count > inlineFiles.length,
    duplicate_count: summary.duplicate_count,
    total_bytes: Number(summary.total_bytes || priorPackage.total_bytes || 0),
    index_key: indexKey,
    index_file_count: summary.file_count,
    index_pages: summary.index_pages,
    tree_index: summary.tree_index,
    archive,
    meta: {
      index_upload: true,
      source_index_format: 'jsonl',
      materialized_index_pages: summary.materialized.index_page_count,
      materialized_tree_prefixes: summary.materialized.tree_prefix_count,
      materialized_tree_pages: summary.materialized.tree_page_count
    }
  };
  await bucket.put(manifestKey, JSON.stringify(manifest, null, 2), {
    httpMetadata: { contentType: 'application/json; charset=utf-8' }
  });
  const sourcePackage = {
    schema: 'fs27.skynet.source_package.v1',
    mode: 'private-full-project',
    prefix,
    files: inlineFiles,
    sample_files: sampleFiles,
    files_truncated: summary.file_count > inlineFiles.length,
    file_count: summary.file_count,
    total_bytes: Number(summary.total_bytes || priorPackage.total_bytes || 0),
    downloadable: true,
    manifest_key: manifestKey,
    index_key: indexKey,
    index_file_count: summary.file_count,
    index_pages: summary.index_pages,
    tree_index: summary.tree_index,
    archive,
    public_asset_exposure: false,
    completed_at: priorPackage.completed_at || null,
    updated_at: now
  };
  const deployment = await upsertDeploymentRecord(env, auth, request, {
    workspace_id: workspaceId,
    project_id: projectId,
    deployment_id: deploymentId,
    source_package: sourcePackage
  });
  const receipt = await saveReceipt(env, auth, workspaceId, 'skynet.source.index.uploaded', {
    project_id: projectId,
    deployment_id: deploymentId,
    source_prefix: prefix,
    index_key: indexKey,
    manifest_key: manifestKey,
    files: summary.file_count,
    duplicate_count: summary.duplicate_count,
    total_bytes: sourcePackage.total_bytes,
    public_asset_exposure: false
  });
  return httpJson(200, {
    ok: true,
    project_id: projectId,
    deployment_id: deploymentId,
    workspace_id: workspaceId,
    source_index: {
      key: indexKey,
      manifest_key: manifestKey,
      file_count: summary.file_count,
      duplicate_count: summary.duplicate_count,
      total_bytes: sourcePackage.total_bytes,
      index_page_count: summary.materialized.index_page_count,
      tree_prefix_count: summary.materialized.tree_prefix_count,
      tree_page_count: summary.materialized.tree_page_count,
      sample_files: sampleFiles,
      files_truncated: sourcePackage.files_truncated
    },
    source_package: sourcePackage,
    deployment: deployment.deployment,
    receipt
  }, cors);
}

async function handleSourceArchiveUpload(request, env, cors) {
  const auth = await requireDeployAuth(request, cors);
  const bucket = sourceTransferBucket(env) || deploymentBucket(env);
  if (!bucket?.put) return httpJson(500, { error: 'SkyeNet source archive bucket is not configured', code: 'NO_SOURCE_ARCHIVE_BUCKET' }, cors);
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const principal = authPrincipal(auth);
  const workspaceResult = await ensureWorkspace(env, auth, request, params);
  const workspaceId = workspaceResult.workspace.workspace_id;
  const projectId = normalizeSlug(params.projectId || params.project_id, 'project', MAX_PROJECT);
  const deploymentId = normalizeSlug(params.deploymentId || params.deployment_id, 'dep_missing', MAX_DEPLOYMENT);
  const filename = normalizeArchiveFilename(params.filename || params.name || params.path, projectId, deploymentId);
  const prefix = sourcePackagePrefix(principal, workspaceId, projectId, deploymentId, params.sourcePrefix || params.source_prefix || '');
  const declaredBytes = Number(request.headers.get('content-length') || request.headers.get('x-skynet-source-archive-bytes') || 0);
  const suppliedSha256Input = cleanText(
    request.headers.get('x-skynet-source-archive-sha256')
    || request.headers.get('x-content-sha256')
    || '',
    160
  ).toLowerCase();
  const suppliedSha256 = normalizeSha256Digest(suppliedSha256Input);
  if (suppliedSha256Input && !suppliedSha256) {
    return httpJson(400, {
      ok: false,
      error: 'Source archive SHA-256 must be a 64-character lowercase hex digest.',
      code: 'SOURCE_ARCHIVE_BAD_SHA256'
    }, cors);
  }
  let body = null;
  let bodyForStorage = null;
  let bytes = Number.isFinite(declaredBytes) && declaredBytes > 0 ? declaredBytes : 0;
  let sha256 = suppliedSha256;
  let integrity = {
    ok: true,
    sha256,
    bytes,
    hash_verified: false,
    hash_verification_status: 'unverified',
    hash_verification_method: '',
    hash_verification_skipped_reason: ''
  };
  if (request.body && suppliedSha256 && bytes > MAX_SOURCE_ARCHIVE_INLINE_HASH_BYTES) {
    bodyForStorage = request.body;
  } else {
    body = await request.arrayBuffer();
    bytes = body.byteLength;
    sha256 = await sha256Hex(body);
    if (suppliedSha256 && suppliedSha256 !== sha256) {
      return httpJson(409, {
        ok: false,
        error: 'Source archive SHA-256 does not match the uploaded archive bytes.',
        code: 'SOURCE_ARCHIVE_SHA_MISMATCH',
        expected_sha256: suppliedSha256,
        actual_sha256: sha256,
        bytes
      }, cors);
    }
    integrity = {
      ok: true,
      sha256,
      bytes,
      hash_verified: true,
      hash_verification_status: 'verified',
      hash_verification_method: 'server-side-upload-sha256',
      hash_verification_skipped_reason: ''
    };
    bodyForStorage = body;
  }
  if (!integrity.hash_verified) {
    integrity.hash_verification_status = 'unverified-streamed-upload';
    integrity.hash_verification_skipped_reason = `source-archive-stream-exceeds-inline-hash-limit-${MAX_SOURCE_ARCHIVE_INLINE_HASH_BYTES}`;
  }
  const contentType = cleanText(request.headers.get('content-type') || contentTypeForPath(filename), 160) || 'application/octet-stream';
  const key = `${prefix}/.skyenet/archive/${filename}`.replace(/\/+/g, '/');
  await bucket.put(key, bodyForStorage, {
    httpMetadata: { contentType },
    customMetadata: {
      schema: 'fs27.skynet.source_archive.v1',
      project_id: projectId,
      deployment_id: deploymentId,
      workspace_id: workspaceId,
      ...sourceArchiveIntegrityMetadata(integrity, suppliedSha256)
    }
  });
  const existing = (await upsertDeploymentRecord(env, auth, request, {
    workspace_id: workspaceId,
    project_id: projectId,
    deployment_id: deploymentId
  })).deployment;
  const priorPackage = existing.source_package || {};
  const now = new Date().toISOString();
  const archive = {
    key,
    filename,
    bytes,
    sha256,
    supplied_sha256: suppliedSha256,
    hash_verified: Boolean(integrity.hash_verified),
    hash_verification_status: integrity.hash_verification_status,
    hash_verification_method: integrity.hash_verification_method,
    hash_verification_skipped_reason: integrity.hash_verification_skipped_reason,
    content_type: contentType,
    bucket_binding: sourceTransferBucketBinding(env),
    downloadable: true,
    uploaded_at: now
  };
  const sourcePackage = {
    schema: 'fs27.skynet.source_package.v1',
    mode: priorPackage.mode || 'private-full-project',
    prefix: priorPackage.prefix || prefix,
    files: Array.isArray(priorPackage.files) ? priorPackage.files : [],
    sample_files: Array.isArray(priorPackage.sample_files) ? priorPackage.sample_files : [],
    files_truncated: Boolean(priorPackage.files_truncated),
    file_count: Number(priorPackage.file_count || 0),
    total_bytes: Number(priorPackage.total_bytes || 0),
    downloadable: true,
    manifest_key: priorPackage.manifest_key || sourceManifestKeyForPackage({ prefix }),
    index_key: priorPackage.index_key || sourceIndexKeyForPackage({ prefix }),
    index_file_count: Number(priorPackage.index_file_count || priorPackage.file_count || 0),
    index_pages: priorPackage.index_pages || priorPackage.indexPages || null,
    tree_index: priorPackage.tree_index || priorPackage.treeIndex || null,
    archive,
    public_asset_exposure: false,
    completed_at: priorPackage.completed_at || null,
    updated_at: now
  };
  const deployment = await upsertDeploymentRecord(env, auth, request, {
    workspace_id: workspaceId,
    project_id: projectId,
    deployment_id: deploymentId,
    source_package: sourcePackage
  });
  const receipt = await saveReceipt(env, auth, workspaceId, 'skynet.source.archive.uploaded', {
    project_id: projectId,
    deployment_id: deploymentId,
    key,
    filename,
    bytes,
    sha256,
    supplied_sha256: suppliedSha256,
    hash_verified: Boolean(integrity.hash_verified),
    hash_verification_status: integrity.hash_verification_status,
    hash_verification_method: integrity.hash_verification_method,
    hash_verification_skipped_reason: integrity.hash_verification_skipped_reason,
    content_type: contentType
  });
  return httpJson(200, {
    ok: true,
    project_id: projectId,
    deployment_id: deploymentId,
    workspace_id: workspaceId,
    source_archive: archive,
    source_package: sourcePackage,
    deployment: deployment.deployment,
    receipt
  }, cors);
}

async function handleSourceArchiveLink(request, env, cors) {
  const auth = await requireDeployAuth(request, cors);
  const bucket = sourceTransferBucket(env) || deploymentBucket(env);
  if (!bucket?.get && !bucket?.head) return httpJson(500, { error: 'SkyeNet source archive bucket is not configured', code: 'NO_SOURCE_ARCHIVE_BUCKET' }, cors);
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const body = request.method === 'POST' ? await readJson(request) : {};
  const input = { ...params, ...body };
  const principal = authPrincipal(auth);
  const workspaceResult = await ensureWorkspace(env, auth, request, input);
  const workspaceId = workspaceResult.workspace.workspace_id;
  const projectId = normalizeSlug(input.projectId || input.project_id, 'project', MAX_PROJECT);
  const deploymentId = normalizeSlug(input.deploymentId || input.deployment_id, 'dep_missing', MAX_DEPLOYMENT);
  const filename = normalizeArchiveFilename(input.filename || input.name || input.path, projectId, deploymentId);
  const prefix = sourcePackagePrefix(principal, workspaceId, projectId, deploymentId, input.sourcePrefix || input.source_prefix || '');
  const key = cleanText(input.key || input.object_key || input.objectKey || `${prefix}/.skyenet/archive/${filename}`, MAX_PATH * 2).replace(/^\/+/, '');
  if (!key.startsWith(`${prefix}/`)) {
    return httpJson(400, {
      ok: false,
      error: 'Source archive link key must stay inside this deployment source package prefix.',
      code: 'SOURCE_ARCHIVE_PREFIX_MISMATCH',
      expected_prefix: prefix,
      key
    }, cors);
  }
  const metadata = bucket.head ? await bucket.head(key).catch(() => null) : null;
  const object = metadata || (bucket.get ? await bucket.get(key).catch(() => null) : null);
  if (!object) {
    return httpJson(404, {
      ok: false,
      error: 'Source archive object was not found in SkyeNet private storage.',
      code: 'SOURCE_ARCHIVE_OBJECT_NOT_FOUND',
      key
    }, cors);
  }
  const declaredBytes = Number(input.bytes || input.size || 0);
  const bytes = Number(object.size || declaredBytes || 0);
  if (declaredBytes > 0 && bytes > 0 && declaredBytes !== bytes) {
    return httpJson(409, {
      ok: false,
      error: 'Source archive link byte count does not match the object stored in SkyeNet private storage.',
      code: 'SOURCE_ARCHIVE_SIZE_MISMATCH',
      key,
      declared_bytes: declaredBytes,
      stored_bytes: bytes
    }, cors);
  }
  const suppliedSha256Input = cleanText(input.sha256 || input.hash || '', 160).toLowerCase();
  const suppliedSha256 = normalizeSha256Digest(suppliedSha256Input);
  if (suppliedSha256Input && !suppliedSha256) {
    return httpJson(400, {
      ok: false,
      error: 'Source archive SHA-256 must be a 64-character lowercase hex digest.',
      code: 'SOURCE_ARCHIVE_BAD_SHA256',
      key
    }, cors);
  }
  const integrity = await verifyStoredSourceArchiveIntegrity(bucket, key, {
    expectedSha256: suppliedSha256,
    expectedBytes: bytes,
    env
  });
  if (!integrity.ok) {
    return httpJson(integrity.status || 409, {
      ok: false,
      error: integrity.error || 'Source archive integrity verification failed.',
      code: integrity.code || 'SOURCE_ARCHIVE_INTEGRITY_FAILED',
      key,
      ...integrity
    }, cors);
  }
  const sha256 = integrity.sha256 || suppliedSha256;
  if (!sha256) {
    return httpJson(400, {
      ok: false,
      error: 'Source archive link requires a SHA-256 digest or a server-readable object that can be hashed before custody is claimed.',
      code: 'SOURCE_ARCHIVE_SHA_REQUIRED',
      key
    }, cors);
  }
  const contentType = cleanText(input.content_type || input.contentType || contentTypeForPath(filename), 160) || 'application/octet-stream';
  const existing = (await upsertDeploymentRecord(env, auth, request, {
    workspace_id: workspaceId,
    project_id: projectId,
    deployment_id: deploymentId
  })).deployment;
  const priorPackage = existing.source_package || {};
  const now = new Date().toISOString();
  const archive = {
    key,
    filename,
    bytes: Number(integrity.bytes || bytes || 0),
    sha256,
    supplied_sha256: suppliedSha256,
    hash_verified: Boolean(integrity.hash_verified),
    hash_verification_status: integrity.hash_verification_status || (integrity.hash_verified ? 'verified' : 'unverified'),
    hash_verification_method: integrity.hash_verification_method || '',
    hash_verification_skipped_reason: integrity.hash_verification_skipped_reason || '',
    content_type: contentType,
    bucket_binding: sourceTransferBucketBinding(env),
    downloadable: true,
    linked_at: now,
    link_receipt: cleanText(input.link_receipt || input.linkReceipt || input.recovery_receipt || input.recoveryReceipt || '', MAX_PATH * 2),
    source: cleanText(input.source || input.source_label || input.sourceLabel || 'linked-existing-private-archive', 180)
  };
  const sourcePackage = {
    schema: 'fs27.skynet.source_package.v1',
    mode: priorPackage.mode || 'private-full-project',
    prefix: priorPackage.prefix || prefix,
    files: Array.isArray(priorPackage.files) ? priorPackage.files : [],
    sample_files: Array.isArray(priorPackage.sample_files) ? priorPackage.sample_files : [],
    files_truncated: Boolean(priorPackage.files_truncated),
    file_count: Number(priorPackage.file_count || 0),
    total_bytes: Number(priorPackage.total_bytes || 0),
    downloadable: true,
    manifest_key: priorPackage.manifest_key || sourceManifestKeyForPackage({ prefix }),
    index_key: priorPackage.index_key || sourceIndexKeyForPackage({ prefix }),
    index_file_count: Number(priorPackage.index_file_count || priorPackage.file_count || 0),
    index_pages: priorPackage.index_pages || priorPackage.indexPages || null,
    tree_index: priorPackage.tree_index || priorPackage.treeIndex || null,
    archive,
    public_asset_exposure: false,
    completed_at: priorPackage.completed_at || null,
    updated_at: now
  };
  const deployment = await upsertDeploymentRecord(env, auth, request, {
    workspace_id: workspaceId,
    project_id: projectId,
    deployment_id: deploymentId,
    source_package: sourcePackage
  });
  const receipt = await saveReceipt(env, auth, workspaceId, 'skynet.source.archive.linked', {
    project_id: projectId,
    deployment_id: deploymentId,
    key,
    filename,
    bytes: archive.bytes,
    sha256,
    supplied_sha256: suppliedSha256,
    hash_verified: archive.hash_verified,
    hash_verification_status: archive.hash_verification_status,
    hash_verification_method: archive.hash_verification_method,
    hash_verification_skipped_reason: archive.hash_verification_skipped_reason,
    content_type: contentType,
    link_receipt: archive.link_receipt,
    source: archive.source
  });
  return httpJson(200, {
    ok: true,
    project_id: projectId,
    deployment_id: deploymentId,
    workspace_id: workspaceId,
    source_archive: archive,
    source_package: sourcePackage,
    deployment: deployment.deployment,
    receipt
  }, cors);
}

async function handleSourceManifest(request, env, cors) {
  const context = await sourceQueryContext(request, env, cors);
  const prefixFilter = cleanText(context.params.prefix || context.params.path_prefix || context.params.pathPrefix || '', MAX_PATH).replace(/^\/+|\/+$/g, '');
  const limit = Math.max(1, Math.min(MAX_SOURCE_QUERY_LIMIT, Number(context.params.limit || 1000)));
  const offset = Math.max(0, Number(context.params.cursor || context.params.offset || 0));
  const paged = context.source.source_package
    ? await sourcePackageIndexSlice(env, context.source.source_package, { offset, limit, prefix: prefixFilter })
    : null;
  if (paged) {
    return httpJson(200, {
      ok: true,
      schema: 'fs27.skynet.source_manifest_response.v1',
      source_mode: context.source.source_mode,
      workspace_id: context.workspaceId,
      project_id: context.projectId,
      deployment_id: context.deploymentId,
      prefix: context.prefix,
      path_prefix: prefixFilter,
      file_count: context.source.file_count || paged.file_count,
      indexed_file_count: paged.file_count,
      listed_count: paged.listed_count,
      limit,
      cursor: String(offset),
      next_cursor: paged.next_cursor,
      list_complete: paged.next_cursor === null,
      files: sourceRecordListForResponse(paged.files),
      index_paged: true,
      index_page_size: paged.page_size,
      index_page_count: paged.page_count,
      scanned_index_pages: paged.scanned_pages,
      source_package: sourcePackageSummary(context.source.source_package),
      manifest_key: context.source.manifest?.manifest_key || sourceManifestKeyForPackage(context.source.source_package || {})
    }, cors);
  }
  const filtered = prefixFilter
    ? context.source.files.filter((file) => sourcePathFromRecord(file).startsWith(prefixFilter))
    : context.source.files;
  const page = filtered.slice(offset, offset + limit);
  const nextCursor = offset + page.length < filtered.length ? String(offset + page.length) : null;
  return httpJson(200, {
    ok: true,
    schema: 'fs27.skynet.source_manifest_response.v1',
    source_mode: context.source.source_mode,
    workspace_id: context.workspaceId,
    project_id: context.projectId,
    deployment_id: context.deploymentId,
    prefix: context.prefix,
    path_prefix: prefixFilter,
    file_count: context.source.file_count || context.source.files.length,
    indexed_file_count: context.source.files.length,
    listed_count: filtered.length,
    limit,
    cursor: String(offset),
    next_cursor: nextCursor,
    list_complete: nextCursor === null,
    files: sourceRecordListForResponse(page),
    source_package: sourcePackageSummary(context.source.source_package),
    manifest_key: context.source.manifest?.manifest_key || sourceManifestKeyForPackage(context.source.source_package || {})
  }, cors);
}

async function handleSourceTree(request, env, cors) {
  const context = await sourceQueryContext(request, env, cors);
  const rawPrefix = cleanText(context.params.prefix || context.params.path || '', MAX_PATH).replace(/^\/+|\/+$/g, '');
  if (rawPrefix && rawPrefix.split('/').some((part) => part === '.' || part === '..')) {
    return httpJson(400, { ok: false, error: 'Invalid source tree prefix', code: 'BAD_SOURCE_TREE_PREFIX' }, cors);
  }
  const limit = Math.max(1, Math.min(MAX_SOURCE_QUERY_LIMIT, Number(context.params.limit || 1000)));
  const offset = Math.max(0, Number(context.params.cursor || context.params.offset || 0));
  let paged = context.source.source_package
    ? await sourcePackageTreeSlice(env, context.source.source_package, rawPrefix, { offset, limit })
    : null;
  if (!paged && context.source.source_package) {
    paged = await sourcePackageTreeSliceFromIndex(env, context.source.source_package, rawPrefix, { offset, limit });
  }
  if (paged) {
    return httpJson(200, {
      ok: true,
      schema: 'fs27.skynet.source_tree_response.v1',
      source_mode: context.source.source_mode,
      workspace_id: context.workspaceId,
      project_id: context.projectId,
      deployment_id: context.deploymentId,
      prefix: rawPrefix,
      file_count: context.source.file_count || 0,
      entry_count: paged.entry_count,
      limit,
      cursor: String(offset),
      next_cursor: paged.next_cursor,
      list_complete: paged.next_cursor === null,
      entries: paged.entries,
      tree_paged: true,
      tree_page_size: paged.page_size,
      tree_page_count: paged.page_count,
      scanned_tree_pages: paged.scanned_pages,
      scanned_index_pages: paged.scanned_index_pages || 0,
      tree_on_demand: Boolean(paged.tree_on_demand),
      source_package: sourcePackageSummary(context.source.source_package)
    }, cors);
  }
  const directories = new Map();
  const files = new Map();
  for (const record of context.source.files) {
    const sourcePath = sourcePathFromRecord(record);
    if (rawPrefix && sourcePath !== rawPrefix && !sourcePath.startsWith(`${rawPrefix}/`)) continue;
    const relative = rawPrefix ? sourcePath.slice(rawPrefix.length).replace(/^\/+/, '') : sourcePath;
    if (!relative) continue;
    const [head, ...rest] = relative.split('/');
    const fullPath = rawPrefix ? `${rawPrefix}/${head}` : head;
    if (rest.length) {
      directories.set(fullPath, { type: 'directory', name: head, path: fullPath });
    } else {
      const file = sourceFileRecord(record);
      files.set(fullPath, {
        type: 'file',
        name: head,
        path: fullPath,
        size: file?.size || 0,
        sha256: file?.sha256 || '',
        content_type: file?.content_type || contentTypeForPath(fullPath)
      });
    }
  }
  const entries = [
    ...[...directories.values()].sort((a, b) => a.path.localeCompare(b.path)),
    ...[...files.values()].sort((a, b) => a.path.localeCompare(b.path))
  ];
  const page = entries.slice(offset, offset + limit);
  const nextCursor = offset + page.length < entries.length ? String(offset + page.length) : null;
  return httpJson(200, {
    ok: true,
    schema: 'fs27.skynet.source_tree_response.v1',
    source_mode: context.source.source_mode,
    workspace_id: context.workspaceId,
    project_id: context.projectId,
    deployment_id: context.deploymentId,
    prefix: rawPrefix,
    file_count: context.source.file_count || context.source.files.length,
    entry_count: entries.length,
    limit,
    cursor: String(offset),
    next_cursor: nextCursor,
    list_complete: nextCursor === null,
    entries: page,
    source_package: sourcePackageSummary(context.source.source_package)
  }, cors);
}

async function handleSourceSearch(request, env, cors) {
  const context = await sourceQueryContext(request, env, cors);
  const query = cleanText(context.params.q || context.params.query || context.params.term || '', 240).toLowerCase();
  const prefixFilter = cleanText(context.params.prefix || context.params.path_prefix || context.params.pathPrefix || '', MAX_PATH).replace(/^\/+|\/+$/g, '');
  if (!query) return httpJson(400, { ok: false, error: 'source-search requires q=', code: 'MISSING_SOURCE_SEARCH_QUERY' }, cors);
  const limit = Math.max(1, Math.min(MAX_SOURCE_SEARCH_RESULTS, Number(context.params.limit || 50)));
  const contentSearch = context.params.content === '0' || context.params.content === 'false' ? false : true;
  const paged = context.source.source_package
    ? await searchPagedSourceIndex(env, context, { query, prefix: prefixFilter, limit, contentSearch })
    : null;
  if (paged) {
    return httpJson(200, {
      ok: true,
      schema: 'fs27.skynet.source_search_response.v1',
      source_mode: context.source.source_mode,
      workspace_id: context.workspaceId,
      project_id: context.projectId,
      deployment_id: context.deploymentId,
      query,
      mode: contentSearch ? 'path-and-small-text-content' : 'path',
      prefix: prefixFilter,
      limit,
      result_count: paged.results.length,
      searched_file_count: paged.searched_file_count,
      content_scanned: paged.content_scanned,
      content_scan_limit: MAX_SOURCE_SEARCH_CONTENT_FILES,
      content_scan_byte_limit: MAX_SOURCE_SEARCH_CONTENT_BYTES,
      index_paged: true,
      index_page_count: paged.page_count,
      scanned_index_pages: paged.scanned_pages,
      source_package: sourcePackageSummary(context.source.source_package),
      results: paged.results
    }, cors);
  }
  const bucket = deploymentBucket(env);
  const results = [];
  let content_scanned = 0;
  for (const record of context.source.files) {
    const sourcePath = sourcePathFromRecord(record);
    if (prefixFilter && !sourcePath.startsWith(prefixFilter)) continue;
    const file = sourceFileRecord(record);
    const contentType = file?.content_type || contentTypeForPath(sourcePath);
    if (sourcePath.toLowerCase().includes(query)) {
      results.push({
        path: sourcePath,
        match: 'path',
        size: file?.size || 0,
        sha256: file?.sha256 || '',
        content_type: contentType
      });
      if (results.length >= limit) break;
      continue;
    }
    if (!contentSearch || !bucket?.get || content_scanned >= MAX_SOURCE_SEARCH_CONTENT_FILES) continue;
    if (file?.size && Number(file.size) > MAX_SOURCE_SEARCH_CONTENT_BYTES) continue;
    if (!sourceTextFileLikely(sourcePath, contentType)) continue;
    content_scanned += 1;
    const objectKey = `${context.prefix}/${sourcePath}`.replace(/\/+/g, '/');
    const object = await bucket.get(objectKey).catch(() => null);
    if (!object) continue;
    const bytes = await readObjectBytes(object);
    if (bytes.byteLength > MAX_SOURCE_SEARCH_CONTENT_BYTES) continue;
    const text = new TextDecoder().decode(bytes);
    const index = text.toLowerCase().indexOf(query);
    if (index < 0) continue;
    const start = Math.max(0, index - 80);
    const end = Math.min(text.length, index + query.length + 120);
    results.push({
      path: sourcePath,
      match: 'content',
      size: bytes.byteLength,
      sha256: file?.sha256 || '',
      content_type: contentType,
      snippet: text.slice(start, end).replace(/\s+/g, ' ').trim()
    });
    if (results.length >= limit) break;
  }
  return httpJson(200, {
    ok: true,
    schema: 'fs27.skynet.source_search_response.v1',
    source_mode: context.source.source_mode,
    workspace_id: context.workspaceId,
    project_id: context.projectId,
    deployment_id: context.deploymentId,
    query,
    mode: contentSearch ? 'path-and-small-text-content' : 'path',
    prefix: prefixFilter,
    limit,
    result_count: results.length,
    searched_file_count: context.source.files.length,
    content_scanned,
    content_scan_limit: MAX_SOURCE_SEARCH_CONTENT_FILES,
    content_scan_byte_limit: MAX_SOURCE_SEARCH_CONTENT_BYTES,
    source_package: sourcePackageSummary(context.source.source_package),
    results
  }, cors);
}

async function handleSourceFile(request, env, cors) {
  const context = await sourceQueryContext(request, env, cors);
  const bucket = deploymentBucket(env);
  if (!bucket?.get) return httpJson(500, { error: 'DEPLOYMENT_ASSET_BUCKET read is not configured', code: 'NO_DEPLOYMENT_BUCKET_READ' }, cors);
  const sourcePath = normalizeSourcePath(context.params.path || context.params.source_path || context.params.sourcePath || '');
  let recorded = context.source.files.some((file) => sourcePathFromRecord(file) === sourcePath);
  if (!recorded && context.source.source_package) {
    const pagedRecorded = await sourcePathRecordedInPagedIndex(env, context.source.source_package, sourcePath);
    if (pagedRecorded !== null) recorded = pagedRecorded;
  }
  if ((context.source.files.length || context.source.source_package) && !recorded) {
    return httpJson(404, {
      ok: false,
      error: 'Source file is not recorded in this deployment source index',
      code: 'SOURCE_FILE_NOT_INDEXED',
      path: sourcePath
    }, cors);
  }
  const objectKey = `${context.prefix}/${sourcePath}`.replace(/\/+/g, '/');
  const raw = truthy(context.params.raw || context.params.download) || cleanText(context.params.format || '', 40).toLowerCase() === 'raw';
  let object = await bucket.get(objectKey).catch(() => null);
  let archiveRead = null;
  if (!object && context.source.source_package) {
    archiveRead = await readSourceFileFromTarArchive(env, context.source.source_package, sourcePath, { readBytes: !raw });
    if (archiveRead?.found) object = archiveRead.object;
  }
  if (!object) {
    if (archiveRead?.unsupported) {
      return httpJson(409, {
        ok: false,
        error: 'This source file is indexed, but the stored source archive format is not readable by the lazy source-file lane. Upload a plain tar, tar.gz, tar.zst, or zip archive, or run the source materialization lane.',
        code: archiveRead.code || 'SOURCE_ARCHIVE_RANDOM_ACCESS_UNSUPPORTED',
        path: sourcePath,
        archive: {
          key: archiveRead.archive?.key || '',
          filename: archiveRead.archive?.filename || '',
          content_type: archiveRead.archive?.content_type || '',
          bytes: archiveRead.archive?.bytes || 0
        },
        compression: archiveRead.compression || '',
        materialization_required: true
      }, cors);
    }
    return httpJson(404, {
      ok: false,
      error: 'Source file object was not found in SkyeNet private storage',
      code: 'SOURCE_FILE_NOT_FOUND',
      path: sourcePath,
      key: objectKey,
      archive_scanned: Boolean(archiveRead),
      archive_scanned_entries: archiveRead?.scanned_entries || 0,
      archive_scanned_bytes: archiveRead?.scanned_bytes || 0
    }, cors);
  }
  const headers = new Headers();
  if (typeof object.writeHttpMetadata === 'function') object.writeHttpMetadata(headers);
  const contentType = archiveRead?.content_type || headers.get('content-type') || contentTypeForPath(sourcePath);
  const bytes = archiveRead?.bytes || (raw && archiveRead?.object?.body ? null : await readObjectBytes(object));
  if (raw) {
    const responseHeaders = new Headers(cors);
    responseHeaders.set('content-type', contentType);
    responseHeaders.set('cache-control', 'no-store');
    responseHeaders.set('x-skynet-source-file', sourcePath);
    responseHeaders.set('x-skynet-project-id', context.projectId);
    responseHeaders.set('x-skynet-deployment-id', context.deploymentId);
    if (archiveRead?.found) {
      responseHeaders.set('x-skynet-source-file-mode', archiveRead.compression === 'zip' ? 'archive-lazy-zip' : (archiveRead.compression === 'zstd' ? 'archive-lazy-zstd' : (archiveRead.decompressed_stream ? 'archive-lazy-decompress' : 'archive-lazy-range')));
      responseHeaders.set('x-skynet-source-archive-key', archiveRead.archive.key);
      responseHeaders.set('x-skynet-source-archive-offset', String(archiveRead.offset));
      if (archiveRead.compression) responseHeaders.set('x-skynet-source-archive-compression', archiveRead.compression);
      if (archiveRead.zip_method_label) responseHeaders.set('x-skynet-source-zip-method', archiveRead.zip_method_label);
      responseHeaders.set('content-length', String(archiveRead.size));
      const body = !archiveRead.decompressed_stream && archiveRead.object?.body && typeof archiveRead.object.body.getReader === 'function'
        ? archiveRead.object.body
        : (bytes || await readObjectBytes(archiveRead.object));
      return new Response(body, { status: 200, headers: responseHeaders });
    }
    return new Response(bytes, { status: 200, headers: responseHeaders });
  }
  const byteLength = archiveRead?.found ? Number(archiveRead.size || 0) : bytes.byteLength;
  if (byteLength > MAX_SOURCE_FILE_JSON_BYTES) {
    return httpJson(413, {
      ok: false,
      error: `Source file is ${byteLength} bytes; max JSON read is ${MAX_SOURCE_FILE_JSON_BYTES}. Use format=raw for direct download.`,
      code: 'SOURCE_FILE_JSON_LIMIT',
      path: sourcePath,
      bytes: byteLength,
      raw_supported: true
    }, cors);
  }
  const isText = sourceTextFileLikely(sourcePath, contentType);
  const finalBytes = bytes || await readObjectBytes(object);
  return httpJson(200, {
    ok: true,
    schema: 'fs27.skynet.source_file_response.v1',
    source_mode: context.source.source_mode,
    workspace_id: context.workspaceId,
    project_id: context.projectId,
    deployment_id: context.deploymentId,
    path: sourcePath,
    key: objectKey,
    bytes: finalBytes.byteLength,
    content_type: contentType,
    encoding: isText ? 'utf-8' : 'base64',
    text: isText ? new TextDecoder().decode(finalBytes) : undefined,
    base64: isText ? undefined : bytesToBase64(finalBytes),
    archive_lazy_read: archiveRead?.found ? {
      archive_key: archiveRead.archive.key,
      archive_filename: archiveRead.archive.filename,
      offset: archiveRead.offset,
      size: archiveRead.size,
      scanned_entries: archiveRead.scanned_entries,
      scanned_bytes: archiveRead.scanned_bytes,
      decompressed_stream: Boolean(archiveRead.decompressed_stream),
      compression: archiveRead.compression || '',
      zip_method: archiveRead.zip_method_label || '',
      compressed_size: archiveRead.compressed_size || undefined,
      central_directory_bytes: archiveRead.central_directory_bytes || undefined,
      materialized_file_object: false
    } : null,
    source_package: sourcePackageSummary(context.source.source_package)
  }, cors);
}

async function handleSourceCodebases(request, env, cors) {
  const auth = await requireDeployAuth(request, cors);
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const principal = authPrincipal(auth);
  const customerScope = customerScopeFromInput(params, auth, request);
  const workspaceId = workspaceIdFromInput(params, customerScope.source_principal);
  const projectId = normalizeSlug(params.projectId || params.project_id || '', '', MAX_PROJECT);
  const deploymentId = normalizeSlug(params.deploymentId || params.deployment_id || '', '', MAX_DEPLOYMENT);
  const limit = Math.max(1, Math.min(500, Number(params.limit || 200)));
  const records = await listSourceCodebaseRecords(env, customerScope.customer_id, workspaceId, {
    project_id: projectId,
    deployment_id: deploymentId,
    limit
  });
  return httpJson(200, {
    ok: true,
    schema: 'fs27.skynet.source_codebases_response.v1',
    workspace_id: workspaceId,
    project_id: projectId || null,
    deployment_id: deploymentId || null,
    custody_scope: {
      customer_id: customerScope.customer_id,
      owner_override: Boolean(customerScope.owner_override),
      requested_by_customer_id: customerScope.requested_by_customer_id || principal.customer_id
    },
    count: records.length,
    codebases: records
  }, cors);
}

async function handleSourceTransfer(request, env, cors) {
  const auth = await requireDeployAuth(request, cors);
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const body = request.method === 'POST' ? await readJson(request) : {};
  const input = { ...params, ...body };
  const principal = authPrincipal(auth);
  const customerScope = customerScopeFromInput(input, auth, request);
  const sourcePrincipal = customerScope.source_principal;
  const workspaceId = workspaceIdFromInput(input, sourcePrincipal);
  const projectId = normalizeSlug(input.projectId || input.project_id, '', MAX_PROJECT);
  const deploymentId = normalizeSlug(input.deploymentId || input.deployment_id, '', MAX_DEPLOYMENT);
  if (!projectId || !deploymentId) return httpJson(400, { error: 'project_id and deployment_id are required', code: 'MISSING_SOURCE_TRANSFER_TARGET' }, cors);

  const resolved = await findOwnerScopedDeployment(env, auth, request, input, workspaceId, projectId, deploymentId);
  const deployment = resolved.deployment;
  const sourceScope = resolved.customerScope;
  const resolvedSourcePrincipal = sourceScope.source_principal;
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
  const crossAccountTransfer = Boolean(recipientCustomerId && String(recipientCustomerId) !== String(sourceScope.customer_id));
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
    archive = await buildSourceArchiveBytes(env, resolvedSourcePrincipal, workspaceId, projectId, deploymentId, deployment);
    storage = await storeSourceTransferArtifact(env, method, archive, {
      transfer_id: transferId,
      principal: resolvedSourcePrincipal,
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
    customer_id: sourceScope.customer_id,
    requested_by_customer_id: principal.customer_id,
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
    source_owner_customer_id: sourceScope.customer_id,
    requested_by_customer_id: principal.customer_id,
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
  const promotedCodebases = await promoteSourceTransferCodebases(env, {
    method,
    status,
    transfer_id: transferId,
    source_scope: sourceScope,
    requesting_principal: principal,
    workspace_id: workspaceId,
    project_id: projectId,
    deployment_id: deploymentId,
    deployment,
    storage,
    archive,
    destination,
    custody_policy: custodyPolicy
  });
  const receiptType = storage?.stored ? 'skynet.source.transfer.completed' : 'skynet.source.transfer.requested';
  const receiptAuth = sourceScope.owner_override
    ? { ...auth, customer_id: sourceScope.customer_id, fs27_customer_id: sourceScope.customer_id, admin_override: true }
    : auth;
  const receipt = await saveReceipt(env, receiptAuth, workspaceId, receiptType, {
    transfer_id: transferId,
    project_id: projectId,
    deployment_id: deploymentId,
    method,
    status,
    queue_accepted: queueAccepted,
    queue_error: queueError,
    requested_by_customer_id: principal.customer_id,
    source_download_url: sourceDownloadUrl,
    storage,
    promoted_codebases: promotedCodebases.map((item) => ({
      key: item.key,
      mount_id: item.record?.mount_id || '',
      customer_id: item.record?.customer_id || '',
      relation: item.record?.relation || ''
    })),
    archive: archive ? {
      filename: archive.download_name,
      source_mode: archive.source_mode,
      files: archive.file_count || archive.files?.length || 0,
      bytes: sourceArchiveByteLength(archive),
      sha256: archive.sha256,
      stored_archive_reused: Boolean(archive.stored_archive_reused)
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
    promoted_codebases: promotedCodebases.map((item) => item.record),
    archive: archive ? {
      filename: archive.download_name,
      source_mode: archive.source_mode,
      file_count: archive.file_count || archive.files?.length || 0,
      bytes: sourceArchiveByteLength(archive),
      sha256: archive.sha256,
      stored_archive_reused: Boolean(archive.stored_archive_reused)
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
  const bucket = deploymentBucket(env);
  if (!bucket?.get) return httpJson(500, { error: 'DEPLOYMENT_ASSET_BUCKET read is not configured', code: 'NO_DEPLOYMENT_BUCKET_READ' }, cors);
  const context = await sourceQueryContext(request, env, cors);
  const privatePackage = context.source.source_package;
  const archive = sourceArchiveForPackage(privatePackage || {});
  if (archive?.downloadable && (!context.source.files.length || (context.source.file_count || context.source.files.length) > MAX_SOURCE_DOWNLOAD_FILES)) {
    const archiveResponse = await sourceArchiveResponse(env, archive, context, cors);
    if (archiveResponse) return archiveResponse;
  }
  const files = context.source.files.map((file) => sourcePathFromRecord(file)).slice(0, MAX_SOURCE_DOWNLOAD_FILES);
  if (!files.length) return httpJson(409, { error: 'Deployment has no recorded files to download', code: 'DEPLOYMENT_SOURCE_EMPTY', deployment: context.deployment }, cors);
  const totalRecordedFiles = context.source.file_count || context.source.files.length;
  if (totalRecordedFiles > MAX_SOURCE_DOWNLOAD_FILES) {
    return httpJson(413, {
      error: `Deployment source bundle has ${totalRecordedFiles} files; max downloadable files per request is ${MAX_SOURCE_DOWNLOAD_FILES}.`,
      code: 'SOURCE_DOWNLOAD_FILE_LIMIT',
      file_count: totalRecordedFiles,
      limit: MAX_SOURCE_DOWNLOAD_FILES
    }, cors);
  }
  const prefix = cleanText(
    context.prefix || privatePackage?.prefix || context.deployment.asset_prefix || assetPrefix(context.projectId, context.deploymentId),
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
      deployment: { project_id: context.projectId, deployment_id: context.deploymentId, workspace_id: context.workspaceId }
    }, cors);
  }
  const manifest = {
    schema: 'fs27.skynet.source_download_manifest.v1',
    generated_at: new Date().toISOString(),
    account: {
      customer_id: context.principal.customer_id,
      workspace_id: context.workspaceId,
      email: context.principal.email || '',
      role: context.principal.role || ''
    },
    deployment: {
      project_id: context.projectId,
      deployment_id: context.deploymentId,
      status: context.deployment.status || '',
      live_url: context.deployment.live_url || '',
      route_key: context.deployment.route_key || '',
      asset_prefix: prefix,
      source_mode: privatePackage ? 'private-full-project' : 'public-deployment-files',
      source_package: privatePackage ? {
        mode: privatePackage.mode || 'private-full-project',
        file_count: privatePackage.file_count || context.source.file_count || files.length,
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
  const downloadName = `${safeDownloadName(context.projectId, context.deploymentId, 'source')}.tar`;
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
  headers.set('x-skynet-project-id', context.projectId);
  headers.set('x-skynet-deployment-id', context.deploymentId);
  headers.set('x-skynet-workspace-id', context.workspaceId);
  return new Response(stream, { status: 200, headers });
}

async function handleObservability(request, env, cors) {
  await requireDeployAuth(request, cors);
  const url = new URL(request.url);
  const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit') || 25)));
  const projectFilter = cleanText(url.searchParams.get('project_id') || url.searchParams.get('projectId') || '', MAX_PROJECT);
  const customerFilter = cleanText(url.searchParams.get('customer_id') || url.searchParams.get('customerId') || '', 160);
  const now = new Date();
  const yyyy = cleanText(url.searchParams.get('yyyy') || String(now.getUTCFullYear()), 4).replace(/[^0-9]/g, '') || String(now.getUTCFullYear());
  const mm = cleanText(url.searchParams.get('mm') || String(now.getUTCMonth() + 1).padStart(2, '0'), 2).replace(/[^0-9]/g, '').padStart(2, '0').slice(-2);
  const dd = cleanText(url.searchParams.get('dd') || String(now.getUTCDate()).padStart(2, '0'), 2).replace(/[^0-9]/g, '').padStart(2, '0').slice(-2);
  const dayPrefix = `runtime-logs/yyyy=${yyyy}/mm=${mm}/dd=${dd}/`;
  const cleanCustomer = customerFilter.replace(/[^a-zA-Z0-9._-]+/g, '-');
  const cleanProject = projectFilter.replace(/[^a-zA-Z0-9._-]+/g, '-');
  const logBucket = requestLogBucket(env);
  let logs = [];
  if (logBucket?.list) {
    const prefix = cleanCustomer
      ? `${dayPrefix}customer=${cleanCustomer}/${cleanProject ? `project=${cleanProject}/` : ''}`
      : projectFilter
        ? dayPrefix
        : 'runtime-logs/';
    const objects = [];
    let cursor = undefined;
    const maxPages = projectFilter || customerFilter ? 10 : 1;
    for (let page = 0; page < maxPages && objects.length < limit; page += 1) {
      const listed = await logBucket.list({ prefix, limit: projectFilter || customerFilter ? 1000 : limit, cursor }).catch(() => null);
      const pageObjects = (listed?.objects || [])
        .map((object) => ({
          key: object.key,
          size: object.size || 0,
          uploaded: object.uploaded ? new Date(object.uploaded).toISOString() : ''
        }))
        .filter((object) => !cleanProject || object.key.includes(`/project=${cleanProject}/`));
      objects.push(...pageObjects);
      cursor = listed?.cursor;
      if (!cursor || listed?.list_complete !== false) break;
    }
    logs = objects.slice(0, limit);
  }
  const db = env.RUNTIME_ROLLUP_DB || env.FS27_RUNTIME_ROLLUP_DB || null;
  let rollups = {
    configured: Boolean(db?.prepare),
    query_ok: false,
    rows: [],
    error: ''
  };
  if (db?.prepare) {
    try {
      const where = [];
      const values = [];
      if (projectFilter) {
        where.push('project_id = ?');
        values.push(projectFilter);
      }
      if (customerFilter) {
        where.push("hour_utc >= strftime('%Y-%m-%dT%H', 'now', '-48 hours')");
      }
      const result = await db.prepare(`
        select hour_utc, project_id, deployment_id, runtime_type, status_family, request_count, error_count, updated_at
        from runtime_rollups_hourly
        ${where.length ? `where ${where.join(' and ')}` : ''}
        order by updated_at desc
        limit ?
      `).bind(...values, limit).all();
      rollups = {
        configured: true,
        query_ok: true,
        rows: Array.isArray(result?.results) ? result.results : [],
        error: ''
      };
    } catch (error) {
      rollups = {
        configured: true,
        query_ok: false,
        rows: [],
        error: cleanText(error?.message || 'runtime rollup query failed', 220)
      };
    }
  }
  return httpJson(200, {
    ok: true,
    service: 'fs27-skynet-observability',
    sinks: {
      request_header: 'x-0s-request-id',
      analytics_engine: Boolean(env.REQUEST_ANALYTICS?.writeDataPoint || env.FS27_REQUEST_ANALYTICS?.writeDataPoint),
      queue: Boolean(env.REQUEST_EVENT_QUEUE?.send || env.FS27_REQUEST_EVENT_QUEUE?.send),
      direct_archive: directRuntimeArchiveConfigured(env),
      r2_runtime_logs: Boolean(logBucket?.put),
      r2_runtime_log_list: Boolean(logBucket?.list),
      d1_rollups: Boolean(env.RUNTIME_ROLLUP_DB?.prepare || env.FS27_RUNTIME_ROLLUP_DB?.prepare),
      citadel_ingest: Boolean(env.CITADEL_RUNTIME_INGEST_URL || env.CITADELDB_RUNTIME_INGEST_URL)
    },
    runtime_event_schema: 'fs27.runtime_request.v1',
    latest_log_objects: logs,
    d1_rollups: rollups,
    dashboard_boundaries: [
      'Owner/admin dashboards may show route, request, error, byte, and deployment counts.',
      'Customer dashboards should be scoped by customer_id/project_id and must not expose bearer tokens, cookies, IP addresses, or raw private request bodies.',
      'Function/runtime logs are redacted before R2 archive and D1 rollups.'
    ]
  }, cors);
}

async function responseJson(response) {
  return await response.clone().json().catch(() => ({}));
}

async function handleCostModel(request, env, cors) {
  await requireDeployAuth(request, cors);
  return httpJson(200, { ok: true, cost_model: skynetCostModel() }, cors);
}

async function handleSupport(request, env, cors) {
  await requireDeployAuth(request, cors);
  return httpJson(200, {
    ok: true,
    service: 'fs27-skynet-support',
    support: skynetSupportProfile(env)
  }, cors);
}

async function handleExport(request, env, cors) {
  const dashboardResponse = await handleDashboard(request, env, cors);
  if (!dashboardResponse.ok) return dashboardResponse;
  const dashboard = await responseJson(dashboardResponse);
  const observabilityResponse = await handleObservability(request, env, cors);
  const observability = await responseJson(observabilityResponse);
  const costResponse = await handleCostModel(request, env, cors);
  const cost = await responseJson(costResponse);
  const support = skynetSupportProfile(env);
  const bundle = {
    ok: true,
    schema: 'fs27.skynet.customer_export.v1',
    generated_at: new Date().toISOString(),
    service: 'fs27-skynet-export',
    redaction_policy: {
      raw_bearer_tokens_included: false,
      raw_cookies_included: false,
      raw_env_secret_values_included: false,
      private_source_files_included: false,
      use_source_download_api_for_private_project_archive: true
    },
    account: dashboard.auth || {},
    workspace: dashboard.workspace || {},
    usage: dashboard.usage || {},
    deployments: Array.isArray(dashboard.deployments) ? dashboard.deployments : [],
    routes: Array.isArray(dashboard.routes) ? dashboard.routes : [],
    receipts: Array.isArray(dashboard.receipts) ? dashboard.receipts : [],
    observability: {
      ok: observability.ok === true,
      sinks: observability.sinks || {},
      runtime_event_schema: observability.runtime_event_schema || 'fs27.runtime_request.v1',
      latest_log_objects: Array.isArray(observability.latest_log_objects) ? observability.latest_log_objects : [],
      d1_rollups: observability.d1_rollups || { configured: false, query_ok: false, rows: [] },
      dashboard_boundaries: Array.isArray(observability.dashboard_boundaries) ? observability.dashboard_boundaries : []
    },
    cost_model: cost.cost_model || skynetCostModel(),
    support,
    links: {
      dashboard: '/api/skyenet/dashboard',
      support: '/api/skyenet/support',
      observability: '/api/skyenet/observability',
      receipts: '/api/skyenet/receipts',
      source_download_policy: 'Source code is not embedded in this JSON export; use gated source-download/source-transfer endpoints.'
    }
  };
  const headers = new Headers(cors);
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', 'no-store');
  if (truthy(new URL(request.url).searchParams.get('download'))) {
    const workspaceId = normalizeSlug(bundle.workspace?.workspace_id || 'skyenet-workspace', 'skyenet-workspace', 120);
    headers.set('content-disposition', `attachment; filename="${workspaceId}-skyenet-export.json"`);
  }
  return new Response(JSON.stringify(bundle, null, 2), { status: 200, headers });
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
    if (url.pathname === '/deploy/source-index' && ['PUT', 'POST'].includes(request.method)) return await handleSourceIndexUpload(request, env, cors);
    if (url.pathname === '/deploy/source-archive' && ['PUT', 'POST'].includes(request.method)) return await handleSourceArchiveUpload(request, env, cors);
    if (url.pathname === '/deploy/source-archive-link' && request.method === 'POST') return await handleSourceArchiveLink(request, env, cors);
    if (url.pathname === '/deploy/source-complete' && request.method === 'POST') return await handleSourceComplete(request, env, cors);
    if (url.pathname === '/deploy/source-manifest' && request.method === 'GET') return await handleSourceManifest(request, env, cors);
    if (url.pathname === '/deploy/source-tree' && request.method === 'GET') return await handleSourceTree(request, env, cors);
    if (url.pathname === '/deploy/source-file' && request.method === 'GET') return await handleSourceFile(request, env, cors);
    if (url.pathname === '/deploy/source-search' && request.method === 'GET') return await handleSourceSearch(request, env, cors);
    if (url.pathname === '/deploy/source-download' && request.method === 'GET') return await handleSourceDownload(request, env, cors);
    if (url.pathname === '/deploy/source-codebases' && request.method === 'GET') return await handleSourceCodebases(request, env, cors);
    if (url.pathname === '/deploy/source-transfer' && request.method === 'POST') return await handleSourceTransfer(request, env, cors);
    if (url.pathname === '/deploy/functions-upload' && ['PUT', 'POST'].includes(request.method)) return await handleFunctionsUpload(request, env, cors);
    if (url.pathname === '/deploy/functions-complete' && request.method === 'POST') return await handleFunctionsComplete(request, env, cors);
    if (url.pathname === '/deploy/functions-status' && request.method === 'GET') return await handleFunctionsStatus(request, env, cors);
    if (url.pathname === '/deploy/forms-policy' && ['GET', 'POST', 'PATCH'].includes(request.method)) return await handleFormsPolicy(request, env, cors);
    if (url.pathname === '/deploy/forms-inbox' && request.method === 'GET') return await handleFormsInbox(request, env, cors);
    if (url.pathname === '/deploy/forms-submission' && ['GET', 'PATCH'].includes(request.method)) return await handleFormsSubmission(request, env, cors);
    if (url.pathname === '/deploy/forms-file' && request.method === 'GET') return await handleFormsFile(request, env, cors);
    if (url.pathname === '/deploy/forms-notify' && request.method === 'POST') return await handleFormsNotify(request, env, cors);
    if (url.pathname === '/deploy/receipts' && request.method === 'GET') return await handleReceipts(request, env, cors);
    if (url.pathname === '/deploy/rollback' && request.method === 'POST') return await handleRollback(request, env, cors);
    if (url.pathname === '/deploy/observability' && request.method === 'GET') return await handleObservability(request, env, cors);
    if (url.pathname === '/deploy/cost-model' && request.method === 'GET') return await handleCostModel(request, env, cors);
    if (url.pathname === '/deploy/support' && request.method === 'GET') return await handleSupport(request, env, cors);
    if (url.pathname === '/deploy/export' && request.method === 'GET') return await handleExport(request, env, cors);
    if (url.pathname === '/deploy/init' && request.method === 'POST') return await handleInit(request, env, cors);
    if (url.pathname === '/deploy/upload' && ['PUT', 'POST'].includes(request.method)) return await handleUpload(request, env, cors);
    if (url.pathname === '/deploy/complete' && request.method === 'POST') return await handleComplete(request, env, cors);
    if (url.pathname === '/deploy/route' && request.method === 'POST') return await handleRoute(request, env, cors, context);
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
