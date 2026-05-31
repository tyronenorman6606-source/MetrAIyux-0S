import { json, method, handleOptions, noStoreCors, readJson } from './_lib/http.js';
import { introspectSkygateBearer, cleanText, safeId } from './_lib/security.js';
import { applyRateLimit } from './_lib/rate-limit.js';
import { setProvisionedWorkspaceStatus, upsertProvisionedWorkspace } from './_lib/workspace-registry.js';
import { writeAuditEventSafe } from './_lib/config.js';

function fail(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}

function scopeList(scope) {
  if (Array.isArray(scope)) return scope.map(String).filter(Boolean);
  return String(scope || '').split(/\s+/).filter(Boolean);
}

function allowsProvisioning(claims = {}) {
  if (!claims.active && !claims.ok) return false;
  const role = String(claims.role || claims.user?.role || '').toLowerCase();
  const scopes = new Set(scopeList(claims.scope || claims.scopes || claims.user?.scope).map((scope) => scope.toLowerCase()));
  return ['founder', 'owner', 'admin', 'deployer', 'operator'].includes(role)
    || scopes.has('admin.write')
    || scopes.has('keys.write')
    || scopes.has('gateway.invoke')
    || scopes.has('skyevault.admin')
    || scopes.has('vault.admin')
    || scopes.has('vault.provision');
}

async function requireProvisioningGate(event) {
  const gate = await introspectSkygateBearer(event);
  if (!gate.ok) fail(gate.error || 'FS27/SkyGate owner-admin bearer is required for SkyeVault workspace provisioning.', gate.statusCode || 401);
  if (!allowsProvisioning(gate.claims)) fail('FS27/SkyGate bearer is active, but it is not scoped for SkyeVault workspace provisioning.', 403);
  return gate.claims;
}

function positiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function planLimits(body = {}) {
  const planName = cleanText(body.planName || body.plan_name || body.plan || '', 80);
  const defaults = {
    maxFilesPerSubmission: Number(process.env.SKYEVAULT_DEFAULT_MAX_FILES_PER_SUBMISSION || 5),
    maxTotalSubmissionGb: Number(process.env.SKYEVAULT_DEFAULT_MAX_TOTAL_SUBMISSION_GB || 50),
    maxFileSizeGb: Number(process.env.SKYEVAULT_DEFAULT_MAX_FILE_SIZE_GB || 50),
    rateLimitUploadSessionsPerWindow: Number(process.env.SKYEVAULT_DEFAULT_UPLOAD_SESSION_RATE_LIMIT || 20),
    rateLimitStatusPerWindow: Number(process.env.SKYEVAULT_DEFAULT_STATUS_RATE_LIMIT || 120),
    rateLimitWindowMs: Number(process.env.SKYEVAULT_DEFAULT_RATE_WINDOW_MS || 60 * 60 * 1000)
  };
  const configuredPlans = String(process.env.SKYEVAULT_PLAN_LIMITS_JSON || '').trim();
  let configured = {};
  try {
    if (configuredPlans) {
      const parsed = JSON.parse(configuredPlans);
      configured = parsed[planName] || parsed.default || {};
    }
  } catch {
    fail('SKYEVAULT_PLAN_LIMITS_JSON contains invalid JSON.', 500);
  }
  const incoming = {
    maxFilesPerSubmission: positiveNumber(body.maxFilesPerSubmission ?? body.max_files_per_submission),
    maxTotalSubmissionGb: positiveNumber(body.maxTotalSubmissionGb ?? body.max_total_submission_gb),
    maxFileSizeGb: positiveNumber(body.maxFileSizeGb ?? body.max_file_size_gb),
    rateLimitUploadSessionsPerWindow: positiveNumber(body.rateLimitUploadSessionsPerWindow ?? body.rate_limit_upload_sessions_per_window),
    rateLimitStatusPerWindow: positiveNumber(body.rateLimitStatusPerWindow ?? body.rate_limit_status_per_window),
    rateLimitWindowMs: positiveNumber(body.rateLimitWindowMs ?? body.rate_limit_window_ms)
  };
  return Object.fromEntries(
    Object.entries({ ...defaults, ...configured, ...incoming }).filter(([, value]) => value != null)
  );
}

function workspacePayload(body = {}) {
  const workspaceId = safeId(body.workspaceId || body.workspace_id || body.workspaceSlug || body.workspace_slug);
  if (!workspaceId) fail('workspaceId is required.', 400);
  const limits = planLimits(body);
  return {
    workspaceId,
    developerId: body.developerId || body.developer_id || body.customerEmail || body.customer_email || workspaceId,
    developerName: body.developerName || body.developer_name || body.customerName || body.customer_name || '',
    clientName: body.clientName || body.client_name || body.companyName || body.company_name || workspaceId,
    clientEmail: body.clientEmail || body.client_email || body.customerEmail || body.customer_email || '',
    projectName: body.projectName || body.project_name || body.companyName || body.company_name || workspaceId,
    destinationId: body.destinationId || body.destination_id || process.env.SKYEVAULT_DEFAULT_DESTINATION_ID || '',
    planName: body.planName || body.plan_name || body.plan || '',
    offerId: body.offerId || body.offer_id || '',
    subscriptionStatus: body.subscriptionStatus || body.subscription_status || 'active',
    stripeCustomerId: body.stripeCustomerId || body.stripe_customer_id || '',
    stripeSubscriptionId: body.stripeSubscriptionId || body.stripe_subscription_id || '',
    skyepayOrderId: body.skyepayOrderId || body.skyepay_order_id || body.orderId || body.order_id || '',
    active: body.active !== false,
    rotateKey: body.rotateKey === true || body.rotate_key === true,
    ...limits
  };
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return handleOptions(event);
  const wrongMethod = method(event, ['POST']);
  if (wrongMethod) return wrongMethod;

  try {
    const body = await readJson(event);
    applyRateLimit(event, {
      bucket: 'provision-workspace',
      limit: Number(process.env.PROVISION_WORKSPACE_RATE_LIMIT || 60),
      windowMs: Number(process.env.PROVISION_WORKSPACE_RATE_WINDOW_MS || 10 * 60 * 1000),
      message: 'Too many vault provisioning requests from this requester. Wait and try again.'
    });
    const gateClaims = await requireProvisioningGate(event);

    const action = cleanText(body.action || 'provision', 40).toLowerCase();
    if (['suspend', 'cancel', 'cancelled', 'deactivate'].includes(action)) {
      const workspaceId = safeId(body.workspaceId || body.workspace_id || body.workspaceSlug || body.workspace_slug);
      const result = await setProvisionedWorkspaceStatus(workspaceId, {
        active: false,
        subscriptionStatus: action === 'suspend' ? 'suspended' : 'canceled',
        stripeSubscriptionId: body.stripeSubscriptionId || body.stripe_subscription_id || '',
        skyepayOrderId: body.skyepayOrderId || body.skyepay_order_id || body.orderId || body.order_id || ''
      });
      const audit = await writeAuditEventSafe('workspace-provisioning-suspended', {
        workspaceId,
        action,
        stripeSubscriptionId: body.stripeSubscriptionId || body.stripe_subscription_id || null,
        skyepayOrderId: body.skyepayOrderId || body.skyepay_order_id || body.orderId || body.order_id || null,
        gateSubject: gateClaims.sub || gateClaims.user_id || gateClaims.user?.id || null,
        gateEmail: gateClaims.email || gateClaims.user?.email || null
      });
      return json(200, { ok: true, action, workspace: result.workspace, audit }, noStoreCors(event));
    }

    if (!['provision', 'upsert', 'activate', 'rotate_key'].includes(action)) fail('Unsupported provisioning action.', 400);
    const result = await upsertProvisionedWorkspace({
      ...workspacePayload(body),
      active: true,
      rotateKey: action === 'rotate_key' || body.rotateKey === true || body.rotate_key === true
    });
    const audit = await writeAuditEventSafe('workspace-provisioned', {
      workspaceId: result.workspace.workspaceId,
      developerId: result.workspace.developerId || null,
      clientEmail: result.workspace.clientEmail || null,
      planName: result.workspace.planName || null,
      offerId: result.workspace.offerId || null,
      stripeSubscriptionId: result.workspace.stripeSubscriptionId || null,
      skyepayOrderId: result.workspace.skyepayOrderId || null,
      gateSubject: gateClaims.sub || gateClaims.user_id || gateClaims.user?.id || null,
      gateEmail: gateClaims.email || gateClaims.user?.email || null,
      keyCreated: result.keyCreated
    });
    return json(200, {
      ok: true,
      action,
      workspace: result.workspace,
      portalKey: result.portalKey || null,
      keyCreated: result.keyCreated,
      repoEnv: result.portalKey ? {
        SKYEVAULT_DROP_URL: process.env.URL || process.env.DEPLOY_URL || '',
        SKYEVAULT_PORTAL_KEY: result.portalKey,
        SKYEVAULT_WORKSPACE_ID: result.workspace.workspaceId,
        SKYEVAULT_DEVELOPER_ID: result.workspace.developerId,
        SKYEVAULT_DEVELOPER_NAME: result.workspace.developerName,
        SKYEVAULT_DESTINATION_ID: result.workspace.destinationId
      } : null,
      audit
    }, noStoreCors(event));
  } catch (error) {
    return json(error.statusCode || 500, { ok: false, error: error.message }, noStoreCors(event));
  }
}
