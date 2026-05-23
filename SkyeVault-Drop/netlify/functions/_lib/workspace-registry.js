import crypto from 'node:crypto';
import { findFileInFolder, downloadJsonFile, upsertJsonFile } from './google-drive.js';

export const WORKSPACE_REGISTRY_FILE = 'skye-upload-vault-workspaces.json';

function cleanText(value, max = 1200) {
  return String(value || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
}

function safeId(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function positiveNumber(value, fallback = null) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function repoPlanDefaults(planName) {
  const plan = String(planName || '').toLowerCase();
  if (/(founder|owner|admin|unlimited|fs27|free99-god)/.test(plan)) {
    return {
      repoPushMode: 'unlimited',
      repoPushPlan: 'owner-unlimited',
      maxTotalSubmissionGb: 5000,
      maxFileSizeGb: 5000,
      repoPushesPerWindow: 0,
      repoPushWindowDays: 30
    };
  }
  if (/(100\s*gb|100gb|repo-100|brain-100)/.test(plan)) {
    return {
      repoPushMode: 'metered',
      repoPushPlan: 'repo-100gb',
      maxTotalSubmissionGb: 100,
      maxFileSizeGb: 100,
      repoPushesPerWindow: Number(process.env.SKYEVAULT_REPO_100GB_PUSHES_PER_WINDOW || 10),
      repoPushWindowDays: Number(process.env.SKYEVAULT_REPO_PUSH_WINDOW_DAYS || 30)
    };
  }
  if (/(50\s*gb|50gb|repo-50)/.test(plan)) {
    return {
      repoPushMode: 'metered',
      repoPushPlan: 'repo-50gb',
      maxTotalSubmissionGb: 50,
      maxFileSizeGb: 50,
      repoPushesPerWindow: Number(process.env.SKYEVAULT_REPO_50GB_PUSHES_PER_WINDOW || 5),
      repoPushWindowDays: Number(process.env.SKYEVAULT_REPO_PUSH_WINDOW_DAYS || 30)
    };
  }
  return {
    repoPushMode: 'metered',
    repoPushPlan: 'repo-standard',
    maxTotalSubmissionGb: Number(process.env.SKYEVAULT_DEFAULT_REPO_PUSH_GB || 50),
    maxFileSizeGb: Number(process.env.SKYEVAULT_DEFAULT_REPO_PUSH_GB || 50),
    repoPushesPerWindow: Number(process.env.SKYEVAULT_DEFAULT_REPO_PUSHES_PER_WINDOW || 1),
    repoPushWindowDays: Number(process.env.SKYEVAULT_REPO_PUSH_WINDOW_DAYS || 30)
  };
}

function configFolderId() {
  const id = process.env.R2_CONFIG_PREFIX || process.env.R2_CONFIG_FOLDER_ID || process.env.GOOGLE_CONFIG_FOLDER_ID;
  if (!id) {
    const error = new Error('R2_CONFIG_PREFIX is not configured.');
    error.statusCode = 500;
    throw error;
  }
  return id;
}

export function hashWorkspaceKey(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

export function makeWorkspaceUploadKey() {
  return `svw_${crypto.randomBytes(24).toString('base64url')}`;
}

function normalizeWorkspace(input = {}, source = 'registry') {
  const workspaceId = safeId(input.workspaceId || input.workspace_id || input.workspace || input.id);
  if (!workspaceId) return null;
  const portalKey = cleanText(input.key || input.portalKey || input.uploadCode || '', 240);
  const keyHash = cleanText(input.keyHash || input.portalKeyHash || (portalKey ? hashWorkspaceKey(portalKey) : ''), 128);
  const planName = cleanText(input.planName || input.plan_name || input.plan || '', 80);
  const repoDefaults = repoPlanDefaults(planName);
  return {
    source,
    workspaceId,
    developerId: safeId(input.developerId || input.developer_id || input.developer || input.name || workspaceId),
    developerName: cleanText(input.developerName || input.developer_name || input.name || input.developerId, 120),
    clientName: cleanText(input.clientName || input.client_name || input.name || input.companyName, 180),
    clientEmail: cleanText(input.clientEmail || input.client_email || input.email, 180).toLowerCase(),
    projectName: cleanText(input.projectName || input.project_name || input.workspaceName || input.workspace_name || workspaceId, 180),
    destinationId: safeId(input.destinationId || input.destination_id || input.destination || ''),
    planName,
    repoPushPlan: cleanText(input.repoPushPlan || input.repo_push_plan || repoDefaults.repoPushPlan, 80),
    repoPushMode: cleanText(input.repoPushMode || input.repo_push_mode || repoDefaults.repoPushMode, 40),
    offerId: cleanText(input.offerId || input.offer_id || '', 140),
    subscriptionStatus: cleanText(input.subscriptionStatus || input.subscription_status || input.status || 'active', 80),
    stripeCustomerId: cleanText(input.stripeCustomerId || input.stripe_customer_id || '', 160),
    stripeSubscriptionId: cleanText(input.stripeSubscriptionId || input.stripe_subscription_id || '', 160),
    skyepayOrderId: cleanText(input.skyepayOrderId || input.skyepay_order_id || input.orderId || input.order_id || '', 180),
    active: input.active !== false && !['canceled', 'cancelled', 'deleted', 'inactive', 'suspended', 'unpaid'].includes(String(input.subscriptionStatus || input.status || '').toLowerCase()),
    key: source === 'env' ? portalKey : '',
    keyHash,
    maxFilesPerSubmission: positiveNumber(input.maxFilesPerSubmission || input.max_files_per_submission),
    maxTotalSubmissionGb: positiveNumber(input.maxTotalSubmissionGb || input.max_total_submission_gb, repoDefaults.maxTotalSubmissionGb),
    maxFileSizeGb: positiveNumber(input.maxFileSizeGb || input.max_file_size_gb, repoDefaults.maxFileSizeGb),
    repoPushesPerWindow: positiveNumber(input.repoPushesPerWindow || input.repo_pushes_per_window, repoDefaults.repoPushesPerWindow),
    repoPushWindowDays: positiveNumber(input.repoPushWindowDays || input.repo_push_window_days, repoDefaults.repoPushWindowDays),
    rateLimitUploadSessionsPerWindow: positiveNumber(input.rateLimitUploadSessionsPerWindow || input.rate_limit_upload_sessions_per_window),
    rateLimitStatusPerWindow: positiveNumber(input.rateLimitStatusPerWindow || input.rate_limit_status_per_window),
    rateLimitWindowMs: positiveNumber(input.rateLimitWindowMs || input.rate_limit_window_ms),
    createdAt: cleanText(input.createdAt || input.created_at || new Date().toISOString(), 80),
    updatedAt: cleanText(input.updatedAt || input.updated_at || new Date().toISOString(), 80),
    lastProvisionedAt: cleanText(input.lastProvisionedAt || input.last_provisioned_at || '', 80)
  };
}

export function envDeveloperWorkspaces() {
  const raw = process.env.SKYEVAULT_DEVELOPER_WORKSPACES || process.env.SKYEVAULT_DEV_WORKSPACES || '';
  if (!raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed)
      ? parsed
      : Object.entries(parsed).map(([key, value]) => ({ key, ...(value && typeof value === 'object' ? value : {}) }));
    return items.map((item) => normalizeWorkspace(item, 'env')).filter(Boolean);
  } catch {
    const error = new Error('SKYEVAULT_DEVELOPER_WORKSPACES contains invalid JSON.');
    error.statusCode = 500;
    throw error;
  }
}

export async function loadWorkspaceRegistry() {
  const folderId = configFolderId();
  const file = await findFileInFolder(folderId, WORKSPACE_REGISTRY_FILE).catch((error) => {
    if (error.statusCode === 404) return null;
    throw error;
  });
  if (!file) {
    return {
      app: 'client-drop-vault',
      registryVersion: 1,
      updatedAt: null,
      workspaces: []
    };
  }
  const registry = await downloadJsonFile(file.id, { workspaces: [] });
  return {
    app: 'client-drop-vault',
    registryVersion: Number(registry.registryVersion || 1),
    updatedAt: registry.updatedAt || null,
    workspaces: Array.isArray(registry.workspaces)
      ? registry.workspaces.map((item) => normalizeWorkspace(item, 'registry')).filter(Boolean)
      : []
  };
}

export async function loadDeveloperWorkspaces() {
  const envWorkspaces = envDeveloperWorkspaces();
  const registry = await loadWorkspaceRegistry().catch(() => {
    return { workspaces: [] };
  });
  const merged = new Map();
  for (const workspace of [...registry.workspaces, ...envWorkspaces]) {
    if (workspace.workspaceId) merged.set(workspace.workspaceId, workspace);
  }
  return [...merged.values()];
}

export async function saveWorkspaceRegistry(registry) {
  const folderId = configFolderId();
  const body = {
    app: 'client-drop-vault',
    registryVersion: 1,
    updatedAt: new Date().toISOString(),
    workspaces: (registry.workspaces || []).map((workspace) => {
      const normalized = normalizeWorkspace(workspace, 'registry');
      if (!normalized) return null;
      const { key, ...withoutPlainKey } = normalized;
      return withoutPlainKey;
    }).filter(Boolean)
  };
  const saved = await upsertJsonFile(folderId, WORKSPACE_REGISTRY_FILE, body);
  return { registry: body, saved };
}

export async function upsertProvisionedWorkspace(input = {}) {
  const registry = await loadWorkspaceRegistry();
  const requestedWorkspace = normalizeWorkspace(input, 'registry');
  if (!requestedWorkspace?.workspaceId) {
    const error = new Error('workspaceId is required to provision a vault workspace.');
    error.statusCode = 400;
    throw error;
  }
  const index = registry.workspaces.findIndex((workspace) => workspace.workspaceId === requestedWorkspace.workspaceId);
  const existing = index >= 0 ? registry.workspaces[index] : null;
  const shouldRotate = input.rotateKey === true || input.rotate_key === true || !existing?.keyHash;
  const plainKey = shouldRotate ? makeWorkspaceUploadKey() : '';
  const now = new Date().toISOString();
  const next = {
    ...(existing || {}),
    ...requestedWorkspace,
    keyHash: shouldRotate ? hashWorkspaceKey(plainKey) : existing.keyHash,
    active: requestedWorkspace.active !== false,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    lastProvisionedAt: now
  };
  if (index >= 0) registry.workspaces[index] = next;
  else registry.workspaces.push(next);
  const saved = await saveWorkspaceRegistry(registry);
  const { key, keyHash, ...publicWorkspace } = normalizeWorkspace(next, 'registry');
  return {
    workspace: publicWorkspace,
    portalKey: plainKey,
    keyCreated: Boolean(plainKey),
    saved: saved.saved
  };
}

export async function setProvisionedWorkspaceStatus(workspaceId, patch = {}) {
  const registry = await loadWorkspaceRegistry();
  const safeWorkspaceId = safeId(workspaceId);
  const index = registry.workspaces.findIndex((workspace) => workspace.workspaceId === safeWorkspaceId);
  if (index < 0) {
    const error = new Error('Workspace was not found in the vault registry.');
    error.statusCode = 404;
    throw error;
  }
  const now = new Date().toISOString();
  registry.workspaces[index] = normalizeWorkspace({
    ...registry.workspaces[index],
    ...patch,
    updatedAt: now
  }, 'registry');
  const saved = await saveWorkspaceRegistry(registry);
  const { key, keyHash, ...publicWorkspace } = registry.workspaces[index];
  return { workspace: publicWorkspace, saved: saved.saved };
}
