import { json, method, handleOptions, noStoreCors, readJson } from './_lib/http.js';
import { constantTimeEqual, getHeader, cleanText, safeId } from './_lib/security.js';
import { applyRateLimit } from './_lib/rate-limit.js';
import { setProvisionedWorkspaceStatus, upsertProvisionedWorkspace } from './_lib/workspace-registry.js';
import { writeAuditEventSafe } from './_lib/config.js';

function fail(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}

function requireProvisioningSecret(event, body = {}) {
  const expected = process.env.SKYEVAULT_PROVISIONING_SECRET || process.env.PROVISIONING_SHARED_SECRET || '';
  if (!expected) fail('SKYEVAULT_PROVISIONING_SECRET is not configured.', 500);
  const auth = getHeader(event, 'authorization');
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const provided = getHeader(event, 'x-skyevault-provisioning-secret') || bearer || body.provisioningSecret || '';
  if (!constantTimeEqual(provided, expected)) fail('Provisioning secret is invalid or missing.', 401);
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
  if (!configuredPlans) return defaults;
  try {
    const parsed = JSON.parse(configuredPlans);
    return { ...defaults, ...(parsed[planName] || parsed.default || {}) };
  } catch {
    fail('SKYEVAULT_PLAN_LIMITS_JSON contains invalid JSON.', 500);
  }
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
    requireProvisioningSecret(event, body);

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
        skyepayOrderId: body.skyepayOrderId || body.skyepay_order_id || body.orderId || body.order_id || null
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

