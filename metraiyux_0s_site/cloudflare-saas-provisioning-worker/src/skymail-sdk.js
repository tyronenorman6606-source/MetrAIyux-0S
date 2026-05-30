import { executeZeroOsAutomationAction } from "../../cloudflare/zero-os-automation-spine.mjs";

const DEFAULT_SKYMAIL_URL = "https://skyemail-platform.graylondonskyes.workers.dev";

function clean(value) {
  return String(value || "").trim();
}

function normalizeOrigin(value) {
  return clean(value || DEFAULT_SKYMAIL_URL).replace(/\/+$/, "");
}

function localPart(value) {
  const base = clean(value).toLowerCase();
  return base
    .replace(/@.*$/, "")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function skymailConfigured(env) {
  return Boolean(clean(env.SKYMAIL_SERVICE_TOKEN || env.SKYE_MAIL_SERVICE_TOKEN || env.SKYMAIL_API_TOKEN || env.SKYEMAIL_API_TOKEN || env.SKYMAIL_API_URL || env.SKYMAIL_PUBLIC_URL || env.SKYEMAIL_API_URL) || env.SKYMAIL_WORKER || env.SKYMAIL_PLATFORM_WORKER || env.SKYEMAIL_PLATFORM_WORKER);
}

export function createSkyeMailClient(env) {
  const baseUrl = normalizeOrigin(env.SKYMAIL_API_URL || env.SKYMAIL_PUBLIC_URL);
  const token = clean(env.SKYMAIL_SERVICE_TOKEN || env.SKYE_MAIL_SERVICE_TOKEN || env.SKYMAIL_API_TOKEN || env.SKYEMAIL_API_TOKEN);
  const serviceBinding = env.SKYMAIL_WORKER && typeof env.SKYMAIL_WORKER.fetch === "function"
    ? env.SKYMAIL_WORKER
    : null;

  function boolEnv(value) {
    return ["1", "true", "yes", "on"].includes(clean(value).toLowerCase());
  }

  function runtimeEnv() {
    return {
      ...env,
      SKYMAIL_API_URL: clean(env.SKYMAIL_API_URL || env.SKYMAIL_PUBLIC_URL || env.SKYEMAIL_API_URL || baseUrl),
      SKYMAIL_API_TOKEN: token,
      SKYEMAIL_PLATFORM_WORKER: env.SKYEMAIL_PLATFORM_WORKER || env.SKYMAIL_PLATFORM_WORKER || env.SKYMAIL_WORKER || null,
      SITE_EVENTS_KV: env.SITE_EVENTS_KV || env.ZERO_OS_AUTOMATION_KV || env.AUTOMATION_KV || env.SAAS_KV || null
    };
  }

  function publicRuntime(receipt = null) {
    if (!receipt) return null;
    return {
      id: receipt.id,
      provider_id: receipt.provider_id,
      action: receipt.action,
      status: receipt.status,
      executed: receipt.executed === true,
      provider_call_made: receipt.provider_call_made === true,
      provider_result: receipt.provider_result || null,
      http_status: receipt.http_status || null,
      error: receipt.error || ""
    };
  }

  async function runtimeRequest(action, payload, context = {}) {
    const sandbox = boolEnv(env.SAAS_PROVIDER_RUNTIME_SANDBOX) || boolEnv(env.ZERO_OS_PROVIDER_SANDBOX);
    const result = await executeZeroOsAutomationAction(runtimeEnv(), {}, {
      provider_id: "skymail",
      action,
      app_id: "saas-provisioning",
      workspace_id: context.workspace_id || payload?.workspace_id || "",
      customer_id: context.customer_id || payload?.customer_id || "",
      client_id: context.client_id || payload?.owner_email || payload?.email || "",
      usage_lane: context.usage_lane || "saas:skymail",
      owner_approved: true,
      live: !sandbox,
      sandbox,
      payload
    }, { actor: "saas-provisioning-worker" }, { operator_ok: true });
    const receipt = result.response?.receipt || null;
    const providerResult = receipt?.provider_result || {};
    return { result, receipt, providerResult, runtime: publicRuntime(receipt) };
  }

  async function provisionWorkspaceMailbox(workspace, owner = {}) {
    const ownerEmail = clean(owner.email || workspace.approval_email || workspace.owner_email || workspace.email);
    const domain = clean(env.SKYMAIL_PRIMARY_DOMAIN || env.INBOUND_DOMAIN);
    const mailboxLocal = localPart(workspace.slug || workspace.company_name || ownerEmail);
    const payload = {
      path: "/workspace-provision",
      method: "POST",
      workspace_id: workspace.id,
      customer_id: workspace.customer_id,
      company_name: workspace.company_name,
      workspace_slug: workspace.slug,
      plan_id: workspace.plan_id,
      owner_email: ownerEmail,
      owner_name: owner.full_name || owner.name || "",
      local_part: mailboxLocal,
      domain: domain || undefined,
      source_app: "metraiyux-0s",
    };
    const { result, receipt, providerResult, runtime } = await runtimeRequest("skymail.mailbox.provision", payload, {
      workspace_id: workspace.id,
      customer_id: workspace.customer_id,
      client_id: ownerEmail,
      usage_lane: "saas:skymail_workspace_mailbox"
    });
    const syntheticMailbox = {
      id: providerResult?.mailbox?.id || providerResult?.id || "",
      mailbox_email: providerResult?.mailbox_email || providerResult?.mailbox?.mailbox_email || (domain ? `${mailboxLocal}@${domain}` : ""),
      workspace_id: workspace.id,
      status: providerResult?.mailbox?.status || providerResult?.status || (receipt?.status === "executed_sandbox" ? "sandbox_executed" : ""),
      provisioning_status: providerResult?.mailbox?.provisioning_status || providerResult?.status || receipt?.status || "",
      provider: providerResult?.mailbox?.provider || "skymail"
    };
    const data = {
      ok: result.response?.ok === true,
      workspace_id: providerResult?.workspace_id || workspace.id,
      mailbox: providerResult?.mailbox || syntheticMailbox,
      mailbox_email: providerResult?.mailbox_email || syntheticMailbox.mailbox_email,
      skymail_url: providerResult?.skymail_url || baseUrl,
      provider_runtime: runtime
    };
    return {
      ok: result.response?.ok === true,
      status: result.status,
      data,
      error: result.response?.ok === true ? null : (receipt?.error || "SkyeMail provider runtime request failed."),
      provider_runtime: runtime,
      requested_local_part: mailboxLocal,
      requested_domain: domain || null,
      skymail_url: baseUrl,
      transport: serviceBinding ? "zero_os_provider_runtime:cloudflare_service_binding" : "zero_os_provider_runtime",
    };
  }

  return { baseUrl, configured: Boolean(token), provisionWorkspaceMailbox };
}
