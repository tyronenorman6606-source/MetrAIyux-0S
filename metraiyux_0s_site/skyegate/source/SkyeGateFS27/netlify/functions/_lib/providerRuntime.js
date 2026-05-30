import { executeZeroOsAutomationAction } from "../../../../../../cloudflare/zero-os-automation-spine.mjs";

export function providerRuntimeSandboxEnabled() {
  return ["SKYEPAY_PROVIDER_RUNTIME_SANDBOX", "FS27_PROVIDER_RUNTIME_SANDBOX", "ZERO_OS_PROVIDER_SANDBOX"]
    .some((name) => String(process.env[name] || "").toLowerCase() === "true" || String(process.env[name] || "") === "1");
}

export async function runZeroOsProviderAction({
  provider_id,
  action,
  app_id = "skygatefs27",
  workspace_id = "",
  customer_id = "",
  client_id = "",
  usage_lane = "",
  payload = {},
  consent = {},
  sandbox = providerRuntimeSandboxEnabled(),
  live = !sandbox,
  env_overrides = {},
  envOverrides = {}
} = {}) {
  const overrides = {
    ...(env_overrides && typeof env_overrides === "object" ? env_overrides : {}),
    ...(envOverrides && typeof envOverrides === "object" ? envOverrides : {})
  };
  const runtimeEnv = Object.keys(overrides).length ? { ...process.env, ...overrides } : process.env;
  const result = await executeZeroOsAutomationAction(runtimeEnv, {}, {
    live,
    sandbox,
    owner_approved: true,
    provider_id,
    action,
    app_id,
    workspace_id,
    customer_id,
    client_id,
    usage_lane: usage_lane || action,
    payload,
    consent
  }, {
    actor: "skygatefs27-provider-runtime",
    identity: { email: "skygatefs27@metraiyux.local", role: "system" }
  }, {
    operator_ok: true
  });
  return {
    ok: result?.response?.ok === true,
    status: result?.status || 500,
    receipt: result?.response?.receipt || null,
    response: result?.response || null
  };
}

export function publicProviderRuntime(receipt) {
  if (!receipt) return null;
  return {
    receipt_id: receipt.id || null,
    status: receipt.status || null,
    provider_id: receipt.provider_id || null,
    action: receipt.action || null,
    executed: receipt.executed === true,
    provider_call_made: receipt.provider_call_made === true,
    stored: receipt.stored === true,
    error: receipt.error || ""
  };
}
