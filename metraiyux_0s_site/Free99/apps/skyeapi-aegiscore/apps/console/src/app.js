const $ = (id) => document.getElementById(id);
const state = {
  baseUrl: localStorage.getItem("skyeapi.console.baseUrl") || "",
  adminKey: localStorage.getItem("skyeapi.console.adminKey") || "",
  projectId: localStorage.getItem("skyeapi.console.projectId") || "proj_skye_default",
  apiKey: localStorage.getItem("skyeapi.console.apiKey") || "",
  lastResult: null
};

const endpoints = {
  health: () => "/health",
  importEnv: () => "/v1/admin/import-env",
  createKey: () => "/v1/admin/create-key",
  keys: () => `/v1/admin/keys?projectId=${encodeURIComponent(state.projectId)}`,
  project: () => `/v1/admin/project?projectId=${encodeURIComponent(state.projectId)}`,
  plans: () => "/v1/admin/plans",
  setPlan: () => "/v1/admin/set-plan",
  usage: () => `/v1/admin/usage?projectId=${encodeURIComponent(state.projectId)}`,
  events: () => `/v1/admin/events?projectId=${encodeURIComponent(state.projectId)}&limit=50`,
  providerPacks: () => "/v1/admin/provider-packs",
  projectProviders: () => `/v1/admin/project-providers?projectId=${encodeURIComponent(state.projectId)}`,
  setProvider: () => "/v1/admin/set-provider",
  policies: () => `/v1/admin/policies?projectId=${encodeURIComponent(state.projectId)}`,
  setPolicies: () => "/v1/admin/policies",
  roles: () => `/v1/admin/roles?projectId=${encodeURIComponent(state.projectId)}`,
  setRoles: () => "/v1/admin/roles",
  rotateSecret: () => "/v1/admin/rotate-secret",
  rotations: () => `/v1/admin/rotations?projectId=${encodeURIComponent(state.projectId)}&limit=50`,
  webhookEvents: () => `/v1/admin/webhook-events?projectId=${encodeURIComponent(state.projectId)}&limit=50`,
  replayWebhook: () => "/v1/admin/replay-webhook",
  approvals: () => `/v1/admin/approval-requests?projectId=${encodeURIComponent(state.projectId)}&limit=50`,
  approveRequest: () => "/v1/admin/approve-request",
  snapshots: () => `/v1/admin/snapshots?projectId=${encodeURIComponent(state.projectId)}&limit=50`,
  createSnapshot: () => "/v1/admin/create-snapshot",
  restoreSnapshot: () => "/v1/admin/restore-snapshot",
  workflowRuns: (details = false) => `/v1/admin/workflow-runs?projectId=${encodeURIComponent(state.projectId)}&limit=50&details=${details ? "true" : "false"}`,
  jobs: () => `/v1/admin/jobs?projectId=${encodeURIComponent(state.projectId)}`,
  enqueueJob: () => "/v1/admin/jobs",
  processJob: () => "/v1/admin/process-job",
  cancelJob: () => "/v1/admin/cancel-job",
  deadLetterJobs: () => `/v1/admin/dead-letter-jobs?projectId=${encodeURIComponent(state.projectId)}`,
  retryDeadLetterJob: () => "/v1/admin/retry-dead-letter-job",
  outboundSubscriptions: () => `/v1/admin/outbound-subscriptions?projectId=${encodeURIComponent(state.projectId)}`,
  createOutboundSubscription: () => "/v1/admin/outbound-subscriptions",
  updateOutboundSubscription: () => "/v1/admin/update-outbound-subscription",
  deleteOutboundSubscription: () => "/v1/admin/delete-outbound-subscription",
  outboundDeliveries: () => `/v1/admin/outbound-deliveries?projectId=${encodeURIComponent(state.projectId)}`,
  outboundEmit: () => "/v1/admin/outbound-events",
  outboundProcess: () => "/v1/admin/process-outbound",
  deadLetterOutbound: () => `/v1/admin/dead-letter-outbound?projectId=${encodeURIComponent(state.projectId)}`,
  anomalies: () => `/v1/admin/anomalies?projectId=${encodeURIComponent(state.projectId)}`,
  doctor: () => `/v1/admin/doctor?projectId=${encodeURIComponent(state.projectId)}`,
  opsReadiness: () => "/v1/admin/ops-readiness",
  providerPackCertify: () => "/v1/admin/provider-pack-certify",
  providerPackScaffold: () => "/v1/admin/provider-pack-scaffold",
  providerPackRegistry: () => "/v1/admin/provider-pack-registry",
  installProviderPack: () => "/v1/admin/install-provider-pack",
  providerPackInstallations: () => `/v1/admin/provider-pack-installations?projectId=${encodeURIComponent(state.projectId)}`,
  billingUsage: () => `/v1/admin/billing-usage?projectId=${encodeURIComponent(state.projectId)}`,
  claimJobLease: () => "/v1/admin/claim-job-lease",
  completeJobLease: () => "/v1/admin/complete-job-lease",
  providerPackDependencies: () => "/v1/admin/provider-pack-dependencies",
  signProviderPack: () => "/v1/admin/provider-pack-sign",
  verifyProviderPack: () => "/v1/admin/provider-pack-verify",
  billingUsageExport: (format = "csv") => `/v1/admin/billing-usage-export?projectId=${encodeURIComponent(state.projectId)}&format=${format}`,
  installProviderPackSource: () => "/v1/admin/install-provider-pack-source",
  certificationReceipt: () => "/v1/admin/provider-pack-certification-receipt",
  billingInvoice: () => `/v1/admin/billing-invoice?projectId=${encodeURIComponent(state.projectId)}${$("invoice-customer-email")?.value ? `&customerEmail=${encodeURIComponent($("invoice-customer-email").value)}` : ""}`,
  billingInvoiceExport: (format = "json") => `/v1/admin/billing-invoice-export?projectId=${encodeURIComponent(state.projectId)}&format=${format}`,
  providerPackLoadSource: () => "/v1/admin/provider-pack-load-source",
  providerPackSandbox: () => "/v1/admin/provider-pack-sandbox",
  billingInvoiceCreate: () => "/v1/admin/billing-invoice-create",
  billingInvoices: () => `/v1/admin/billing-invoices?projectId=${encodeURIComponent(state.projectId)}`,
  billingInvoiceStatus: () => "/v1/admin/billing-invoice-status",
  subscriptions: () => `/v1/admin/subscriptions?projectId=${encodeURIComponent(state.projectId)}`,
  workspaceBindings: () => "/v1/admin/workspace-bindings",
  workspaceAccessCheck: () => "/v1/admin/workspace-access-check",
  auditExport: () => `/v1/admin/audit-export?projectId=${encodeURIComponent(state.projectId)}`,
  capabilities: () => "/v1/capabilities",
  call: () => "/v1/call"
};

function boot() {
  $("base-url").value = state.baseUrl;
  $("admin-key").value = state.adminKey;
  $("project-id").value = state.projectId;
  $("api-key").value = state.apiKey;
  bind();
}

function bind() {
  $("connection-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    saveConnection();
    await health();
  });
  $("clear-local").addEventListener("click", () => { localStorage.clear(); location.reload(); });
  $("import-env").addEventListener("click", importEnv);
  $("create-key").addEventListener("click", createKey);
  $("load-keys").addEventListener("click", loadKeys);
  $("load-project").addEventListener("click", loadProject);
  $("load-plans").addEventListener("click", loadPlans);
  $("set-plan").addEventListener("click", setPlan);
  $("load-capabilities").addEventListener("click", loadCapabilities);
  $("dry-run").addEventListener("click", () => callCapability(true));
  $("live-call").addEventListener("click", () => callCapability(false));
  $("workflow-dry-run").addEventListener("click", () => runWorkflow(true));
  $("workflow-live").addEventListener("click", () => runWorkflow(false));
  $("load-usage").addEventListener("click", loadUsage);
  $("load-events").addEventListener("click", loadEvents);
  $("load-provider-packs")?.addEventListener("click", loadProviderPacks);
  $("load-project-providers")?.addEventListener("click", loadProjectProviders);
  $("set-provider")?.addEventListener("click", setProvider);
  $("load-policies")?.addEventListener("click", loadPolicies);
  $("save-policies")?.addEventListener("click", savePolicies);
  $("load-roles")?.addEventListener("click", loadRoles);
  $("save-roles")?.addEventListener("click", saveRoles);
  $("rotate-secret")?.addEventListener("click", rotateSecret);
  $("load-rotations")?.addEventListener("click", loadRotations);
  $("load-webhooks")?.addEventListener("click", loadWebhookEvents);
  $("replay-webhook")?.addEventListener("click", replayWebhook);
  $("load-approvals")?.addEventListener("click", loadApprovals);
  $("resolve-approval")?.addEventListener("click", resolveApproval);
  $("create-snapshot")?.addEventListener("click", createSnapshot);
  $("load-snapshots")?.addEventListener("click", loadSnapshots);
  $("restore-snapshot")?.addEventListener("click", restoreSnapshot);
  $("load-workflow-runs")?.addEventListener("click", () => loadWorkflowRuns(false));
  $("load-workflow-runs-detail")?.addEventListener("click", () => loadWorkflowRuns(true));
  $("load-jobs")?.addEventListener("click", loadJobs);
  $("enqueue-job")?.addEventListener("click", enqueueJob);
  $("process-job")?.addEventListener("click", processJob);
  $("cancel-job")?.addEventListener("click", cancelJob);
  $("load-dead-letter-jobs")?.addEventListener("click", loadDeadLetterJobs);
  $("retry-dead-letter-job")?.addEventListener("click", retryDeadLetterJob);
  $("load-outbound-subscriptions")?.addEventListener("click", loadOutboundSubscriptions);
  $("create-outbound-subscription")?.addEventListener("click", createOutboundSubscription);
  $("update-outbound-subscription")?.addEventListener("click", updateOutboundSubscription);
  $("delete-outbound-subscription")?.addEventListener("click", deleteOutboundSubscription);
  $("emit-outbound")?.addEventListener("click", emitOutbound);
  $("load-outbound-deliveries")?.addEventListener("click", loadOutboundDeliveries);
  $("process-outbound")?.addEventListener("click", processOutbound);
  $("load-dead-letter-outbound")?.addEventListener("click", loadDeadLetterOutbound);
  $("load-anomalies")?.addEventListener("click", loadAnomalies);
  $("load-doctor")?.addEventListener("click", loadDoctor);
  $("load-ops-readiness")?.addEventListener("click", loadOpsReadiness);
  $("certify-provider-pack")?.addEventListener("click", certifyProviderPack);
  $("scaffold-provider-pack")?.addEventListener("click", scaffoldProviderPack);
  $("publish-provider-pack")?.addEventListener("click", publishProviderPack);
  $("load-provider-pack-registry")?.addEventListener("click", loadProviderPackRegistry);
  $("install-provider-pack")?.addEventListener("click", installProviderPack);
  $("load-provider-pack-installations")?.addEventListener("click", loadProviderPackInstallations);
  $("load-billing-usage")?.addEventListener("click", loadBillingUsage);
  $("claim-job-lease")?.addEventListener("click", claimJobLease);
  $("complete-job-lease")?.addEventListener("click", completeJobLease);
  $("validate-pack-dependencies")?.addEventListener("click", validatePackDependencies);
  $("sign-provider-pack")?.addEventListener("click", signProviderPack);
  $("verify-provider-pack")?.addEventListener("click", verifyProviderPack);
  $("export-billing-csv")?.addEventListener("click", () => exportBillingUsage("csv"));
  $("export-billing-jsonl")?.addEventListener("click", () => exportBillingUsage("jsonl"));
  $("install-pack-source")?.addEventListener("click", installProviderPackSource);
  $("certification-receipt")?.addEventListener("click", certificationReceipt);
  $("load-billing-invoice")?.addEventListener("click", loadBillingInvoice);
  $("export-invoice-json")?.addEventListener("click", () => exportBillingInvoice("json"));
  $("export-invoice-csv")?.addEventListener("click", () => exportBillingInvoice("csv"));
  $("load-pack-source")?.addEventListener("click", loadProviderPackSource);
  $("sandbox-provider-pack")?.addEventListener("click", sandboxProviderPack);
  $("create-billing-invoice")?.addEventListener("click", createBillingInvoiceRecord);
  $("list-billing-invoices")?.addEventListener("click", listBillingInvoices);
  $("mark-invoice-issued")?.addEventListener("click", () => markBillingInvoiceStatus("issued"));
  $("create-subscription")?.addEventListener("click", createSubscription);
  $("load-subscriptions")?.addEventListener("click", loadSubscriptions);
  $("create-workspace-binding")?.addEventListener("click", createWorkspaceBinding);
  $("load-workspace-bindings")?.addEventListener("click", loadWorkspaceBindings);
  $("check-workspace-access")?.addEventListener("click", checkWorkspaceAccess);
  $("audit-export")?.addEventListener("click", auditExport);
  $("copy-result").addEventListener("click", () => navigator.clipboard?.writeText($("result").textContent || ""));
  $("api-key").addEventListener("input", () => {
    state.apiKey = $("api-key").value.trim();
    localStorage.setItem("skyeapi.console.apiKey", state.apiKey);
  });
}

function saveConnection() {
  state.baseUrl = $("base-url").value.trim().replace(/\/$/, "");
  state.adminKey = $("admin-key").value;
  state.projectId = $("project-id").value.trim() || "proj_skye_default";
  localStorage.setItem("skyeapi.console.baseUrl", state.baseUrl);
  localStorage.setItem("skyeapi.console.adminKey", state.adminKey);
  localStorage.setItem("skyeapi.console.projectId", state.projectId);
}

function setStatus(kind, label, detail) {
  const dot = $("connection-dot");
  dot.className = `dot ${kind}`;
  $("connection-label").textContent = label;
  $("connection-detail").textContent = detail;
}

function renderResult(data) {
  state.lastResult = data;
  $("result").textContent = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  renderWorkflowReceipts(data);
}

function renderWorkflowReceipts(data) {
  const target = $("workflow-receipts");
  if (!target) return;
  const steps = data?.data?.steps || data?.steps || [];
  if (!Array.isArray(steps) || !steps.length) {
    target.innerHTML = `<p class="muted">No workflow step receipts loaded yet.</p>`;
    return;
  }
  target.innerHTML = steps.map((step, index) => `<div class="receipt ${step.ok ? "good-card" : "bad-card"}"><strong>${index + 1}. ${escapeHtml(step.id)} · ${escapeHtml(step.capability)}</strong><p class="muted">${step.ok ? "passed" : "failed"} · ${escapeHtml(step.provider || "unknown")} · ${escapeHtml(step.proofId || "no-proof")}${step.dryRun ? " · dry run" : ""}</p><code>${escapeHtml(JSON.stringify(step.error || step.data || {}, null, 2))}</code></div>`).join("");
}

function requireBase() {
  saveConnection();
  if (!state.baseUrl) throw new Error("Gateway base URL is required.");
}

async function request(path, options = {}) {
  requireBase();
  const headers = { ...(options.headers || {}) };
  if (options.admin) headers["x-skye-admin-key"] = state.adminKey;
  if (options.bearer) headers.authorization = `Bearer ${options.bearer}`;
  if (options.json) headers["content-type"] = "application/json";
  const response = await fetch(`${state.baseUrl}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.json ? JSON.stringify(options.json) : undefined
  });
  const data = await response.json().catch(() => ({ ok: false, error: `Non-JSON response ${response.status}` }));
  if (!response.ok) throw new Error(data.error || data?.error?.message || `HTTP ${response.status}`);
  return data;
}

async function run(label, fn) {
  try {
    const data = await fn();
    renderResult(data);
    return data;
  } catch (error) {
    const data = { ok: false, action: label, error: error instanceof Error ? error.message : String(error), secrets_exposed: false };
    renderResult(data);
    return data;
  }
}

async function health() {
  return run("health", async () => {
    const data = await request(endpoints.health());
    setStatus("good", "Connected", `${data.service || "gateway"} ${data.version || ""}`);
    return data;
  });
}

function scopesFromInput(id) {
  return $(id).value.split(",").map((scope) => scope.trim()).filter(Boolean);
}

async function importEnv() {
  return run("import-env", async () => {
    const data = await request(endpoints.importEnv(), {
      method: "POST",
      admin: true,
      json: {
        projectId: state.projectId,
        envText: $("env-text").value,
        scopes: scopesFromInput("initial-scopes"),
        label: "console-import"
      }
    });
    if (data.apiKey) {
      state.apiKey = data.apiKey;
      $("api-key").value = data.apiKey;
      localStorage.setItem("skyeapi.console.apiKey", data.apiKey);
    }
    renderCapabilities(data.manifest?.capabilities || []);
    return data;
  });
}

async function createKey() {
  return run("create-key", async () => {
    const data = await request(endpoints.createKey(), { method: "POST", admin: true, json: { projectId: state.projectId, scopes: scopesFromInput("key-scopes"), label: "console-key", expiresAt: $("key-expires-at").value.trim() || undefined } });
    $("key-result").textContent = data.apiKey || "Key created.";
    return data;
  });
}

async function loadKeys() {
  return run("load-keys", async () => {
    const data = await request(endpoints.keys(), { admin: true });
    $("keys-list").innerHTML = (data.keys || []).map((key) => `<div class="item"><strong>${escapeHtml(key.label || "unlabeled key")}</strong><code>${escapeHtml(key.hash || key.keyHash || "hash-hidden")}</code><p class="muted">${escapeHtml((key.scopes || []).join(", "))}</p></div>`).join("") || `<p class="muted">No keys returned.</p>`;
    return data;
  });
}


async function loadProject() {
  return run("project", async () => {
    const data = await request(endpoints.project(), { admin: true });
    renderProjectSummary(data);
    return data;
  });
}

async function loadPlans() {
  return run("plans", async () => {
    const data = await request(endpoints.plans(), { admin: true });
    $("project-summary").innerHTML = (data.plans || []).map((plan) => `<div class="item"><strong>${escapeHtml(plan.name)}</strong><p class="muted">${escapeHtml(String(plan.dailyCallLimit))} calls/day · ${escapeHtml(String(plan.rateLimitPerMinute))}/min</p><code>${escapeHtml((plan.allowedCapabilities || []).join(", "))}</code></div>`).join("");
    return data;
  });
}

function planCapabilitiesFromInput() {
  return $("plan-capabilities").value.split(/[,\n]/).map((capability) => capability.trim()).filter(Boolean);
}

async function setPlan() {
  return run("set-plan", async () => {
    const daily = $("daily-limit").value.trim();
    const rate = $("rate-limit").value.trim();
    const data = await request(endpoints.setPlan(), {
      method: "POST",
      admin: true,
      json: {
        projectId: state.projectId,
        plan: $("plan-name").value.trim() || "builder",
        status: $("plan-status").value,
        dailyCallLimit: daily ? Number(daily) : undefined,
        rateLimitPerMinute: rate ? Number(rate) : undefined,
        allowedCapabilities: planCapabilitiesFromInput(),
        notes: "Configured from SkyeAPI Console."
      }
    });
    renderProjectSummary(data);
    return data;
  });
}

function renderProjectSummary(data) {
  const plan = data.plan || data.project?.plan;
  const project = data.project || {};
  $("project-summary").innerHTML = `<div class="item"><strong>${escapeHtml(data.projectId || project.projectId || state.projectId)}</strong><p class="muted">Plan: ${escapeHtml(plan?.name || "unknown")} · ${escapeHtml(plan?.status || "unknown")} · remaining today ${escapeHtml(String(data.remainingToday ?? "n/a"))}</p><code>${escapeHtml(JSON.stringify({ connectedProviders: project.connectedProviders, enabledCapabilities: project.enabledCapabilities, allowedCapabilities: plan?.allowedCapabilities }, null, 2))}</code></div>`;
}

async function loadCapabilities() {
  return run("capabilities", async () => {
    state.apiKey = $("api-key").value.trim();
    localStorage.setItem("skyeapi.console.apiKey", state.apiKey);
    const data = await request(endpoints.capabilities(), { bearer: state.apiKey });
    renderCapabilities(data.capabilities || []);
    return data;
  });
}

function renderCapabilities(capabilities) {
  $("capability-select").innerHTML = capabilities.filter((cap) => cap.enabled).map((cap) => `<option value="${escapeHtml(cap.name)}">${escapeHtml(cap.name)} · ${escapeHtml(cap.provider)}</option>`).join("");
  $("capabilities-list").innerHTML = capabilities.map((cap) => `<div class="item"><strong>${escapeHtml(cap.name)}</strong><p class="muted">${cap.enabled ? "enabled" : "missing"} · ${escapeHtml(cap.provider)}${cap.missingKeys?.length ? ` · missing ${escapeHtml(cap.missingKeys.join(", "))}` : ""}</p></div>`).join("") || `<p class="muted">No capabilities loaded.</p>`;
}

async function callCapability(dryRun) {
  return run(dryRun ? "dry-run" : "live-call", async () => {
    state.apiKey = $("api-key").value.trim();
    const capability = $("capability-select").value;
    const input = JSON.parse($("call-json").value || "{}");
    return request(endpoints.call(), { method: "POST", bearer: state.apiKey, json: { capability, input, dryRun } });
  });
}


async function runWorkflow(dryRun) {
  return run(dryRun ? "workflow-dry-run" : "workflow-live", async () => {
    state.apiKey = $("api-key").value.trim();
    localStorage.setItem("skyeapi.console.apiKey", state.apiKey);
    const input = JSON.parse($("workflow-json").value || "{}");
    const data = await request(endpoints.call(), { method: "POST", bearer: state.apiKey, json: { capability: "workflow.run", input, dryRun } });
    renderWorkflowReceipts(data);
    return data;
  });
}

async function loadUsage() {
  return run("usage", async () => {
    const data = await request(endpoints.usage(), { admin: true });
    $("usage-list").innerHTML = (data.usage || []).map((row) => `<div class="item"><strong>${escapeHtml(row.capability || row.name || "usage")}</strong><p class="muted">${escapeHtml(String(row.count || 0))} calls · ${escapeHtml(row.window || row.date || "")}</p></div>`).join("") || `<p class="muted">No usage yet.</p>`;
    return data;
  });
}

async function loadEvents() {
  return run("events", async () => {
    const data = await request(endpoints.events(), { admin: true });
    $("events-list").innerHTML = (data.events || []).map((event) => `<div class="item"><strong>${escapeHtml(event.type || "event")}</strong><p class="muted">${escapeHtml(event.at || "")}</p><code>${escapeHtml(JSON.stringify(event.data || event, null, 2))}</code></div>`).join("") || `<p class="muted">No events yet.</p>`;
    return data;
  });
}


async function loadProviderPacks() {
  return run("provider-packs", async () => {
    const data = await request(endpoints.providerPacks(), { admin: true });
    $("provider-marketplace").innerHTML = (data.packs || []).map((pack) => `<div class="item"><strong>${escapeHtml(pack.label)}</strong><p class="muted">${escapeHtml(pack.provider)} · ${escapeHtml(pack.category)} · ${escapeHtml((pack.capabilities || []).join(", "))}</p><code>${escapeHtml((pack.requiredKeys || []).join(", "))}</code></div>`).join("");
    return data;
  });
}

async function loadProjectProviders() {
  return run("project-providers", async () => {
    const data = await request(endpoints.projectProviders(), { admin: true });
    $("project-providers-list").innerHTML = Object.entries(data.providerConfig?.providers || {}).map(([provider, config]) => `<div class="item"><strong>${escapeHtml(provider)}</strong><p class="muted">${config.enabled ? "enabled" : "disabled"} · ${escapeHtml(config.reason || "")}</p></div>`).join("") || `<p class="muted">No provider config returned.</p>`;
    return data;
  });
}

async function setProvider() {
  return run("set-provider", async () => {
    const data = await request(endpoints.setProvider(), { method: "POST", admin: true, json: { projectId: state.projectId, provider: $("provider-name").value.trim(), enabled: $("provider-enabled").value === "true", reason: $("provider-reason").value.trim() || undefined } });
    await loadProjectProviders();
    return data;
  });
}

async function loadPolicies() {
  return run("load-policies", async () => {
    const data = await request(endpoints.policies(), { admin: true });
    $("policies-json").value = JSON.stringify(data.policies || [], null, 2);
    return data;
  });
}

async function savePolicies() {
  return run("save-policies", async () => {
    const policies = JSON.parse($("policies-json").value || "[]");
    return request(endpoints.setPolicies(), { method: "POST", admin: true, json: { projectId: state.projectId, policies } });
  });
}

async function loadRoles() {
  return run("load-roles", async () => {
    const data = await request(endpoints.roles(), { admin: true });
    $("roles-json").value = JSON.stringify(data.roles?.roles || {}, null, 2);
    return data;
  });
}

async function saveRoles() {
  return run("save-roles", async () => {
    const roles = JSON.parse($("roles-json").value || "{}");
    return request(endpoints.setRoles(), { method: "POST", admin: true, json: { version: "skyeapi.roles.v1", projectId: state.projectId, updatedAt: new Date().toISOString(), roles } });
  });
}

async function rotateSecret() {
  return run("rotate-secret", async () => {
    return request(endpoints.rotateSecret(), { method: "POST", admin: true, json: { projectId: state.projectId, secretKey: $("rotate-key").value.trim(), secretValue: $("rotate-value").value, reason: $("rotate-reason").value.trim() || undefined } });
  });
}

async function loadRotations() {
  return run("rotations", async () => {
    const data = await request(endpoints.rotations(), { admin: true });
    $("rotations-list").innerHTML = (data.rotations || []).map((row) => `<div class="item"><strong>${escapeHtml(row.secretKey)}</strong><p class="muted">${escapeHtml(row.rotatedAt)} · ${escapeHtml(row.rotationId)}</p><code>${escapeHtml(JSON.stringify({ previous: row.previousValueRedacted, next: row.nextValueRedacted, reason: row.reason }, null, 2))}</code></div>`).join("") || `<p class="muted">No rotations recorded.</p>`;
    return data;
  });
}

async function loadWebhookEvents() {
  return run("webhook-events", async () => {
    const data = await request(endpoints.webhookEvents(), { admin: true });
    $("webhooks-list").innerHTML = (data.events || []).map((row) => `<div class="item"><strong>${escapeHtml(row.provider)} · ${escapeHtml(row.eventType || "event")}</strong><p class="muted">${escapeHtml(row.receivedAt)} · ${escapeHtml(row.id)} · replays ${escapeHtml(String(row.replayCount || 0))}</p><code>${escapeHtml(row.bodyPreview || "")}</code></div>`).join("") || `<p class="muted">No webhook events ingested.</p>`;
    return data;
  });
}

async function replayWebhook() {
  return run("replay-webhook", async () => {
    return request(endpoints.replayWebhook(), { method: "POST", admin: true, json: { projectId: state.projectId, eventId: $("webhook-event-id").value.trim() } });
  });
}


async function loadApprovals() {
  return run("approval-requests", async () => {
    const data = await request(endpoints.approvals(), { admin: true });
    $("approvals-list").innerHTML = (data.approvals || []).map((row) => `<div class="item"><strong>${escapeHtml(row.status)} · ${escapeHtml(row.capability)}</strong><p class="muted">${escapeHtml(row.requestedAt)} · ${escapeHtml(row.id)}</p><code>${escapeHtml(JSON.stringify({ fingerprint: row.inputFingerprint, expiresAt: row.expiresAt, matchedRules: row.matchedRules, message: row.message }, null, 2))}</code></div>`).join("") || `<p class="muted">No pending approvals.</p>`;
    return data;
  });
}

async function resolveApproval() {
  return run("resolve-approval", async () => {
    const action = $("approval-action").value;
    const data = await request(endpoints.approveRequest(), { method: "POST", admin: true, json: { projectId: state.projectId, requestId: $("approval-request-id").value.trim(), action } });
    await loadApprovals();
    return data;
  });
}

async function createSnapshot() {
  return run("create-snapshot", async () => {
    const data = await request(endpoints.createSnapshot(), { method: "POST", admin: true, json: { projectId: state.projectId, reason: $("snapshot-reason").value.trim() || undefined } });
    await loadSnapshots();
    return data;
  });
}

async function loadSnapshots() {
  return run("snapshots", async () => {
    const data = await request(endpoints.snapshots(), { admin: true });
    $("snapshots-list").innerHTML = (data.snapshots || []).map((row) => `<div class="item"><strong>${escapeHtml(row.id)}</strong><p class="muted">${escapeHtml(row.createdAt)} · ${escapeHtml(row.reason || "no reason")}</p><code>${escapeHtml(JSON.stringify({ plan: row.plan?.name, providers: row.providerConfig?.providers, roles: row.roles?.roles ? Object.keys(row.roles.roles) : [], manifestSummary: row.manifestSummary }, null, 2))}</code></div>`).join("") || `<p class="muted">No snapshots.</p>`;
    return data;
  });
}

async function restoreSnapshot() {
  return run("restore-snapshot", async () => {
    return request(endpoints.restoreSnapshot(), { method: "POST", admin: true, json: { projectId: state.projectId, snapshotId: $("snapshot-id").value.trim() } });
  });
}

async function loadWorkflowRuns(details = false) {
  return run("workflow-runs", async () => {
    const data = await request(endpoints.workflowRuns(details), { admin: true });
    const runs = data.runs || [];
    $("workflow-runs-list").innerHTML = runs.map((row) => `<div class="item"><strong>${escapeHtml(row.workflowId || row.id)} · ${row.ok ? "ok" : "failed"}</strong><p class="muted">${escapeHtml(row.finishedAt || "")} · ${escapeHtml(row.id)} · steps ${escapeHtml(String(row.stepCount ?? row.steps?.length ?? 0))}</p><code>${escapeHtml(JSON.stringify(details ? row : { dryRun: row.dryRun, failedSteps: row.failedSteps }, null, 2))}</code></div>`).join("") || `<p class="muted">No workflow runs recorded.</p>`;
    return data;
  });
}


async function loadJobs() {
  return run("jobs", async () => {
    const data = await request(endpoints.jobs(), { admin: true });
    $("jobs-list").innerHTML = (data.jobs || []).map((job) => `<div class="item"><strong>${escapeHtml(job.status)} · ${escapeHtml(job.envelope?.capability || "capability")}</strong><p class="muted">${escapeHtml(job.id)} · attempts ${escapeHtml(String(job.attempts || 0))}/${escapeHtml(String(job.maxAttempts || 0))}</p><code>${escapeHtml(JSON.stringify({ queuedAt: job.queuedAt, updatedAt: job.updatedAt, error: job.lastError, result: job.result }, null, 2))}</code></div>`).join("") || `<p class="muted">No jobs queued.</p>`;
    return data;
  });
}

async function enqueueJob() {
  return run("enqueue-job", async () => {
    const capability = $("job-capability").value.trim();
    const input = JSON.parse($("job-json").value || "{}");
    return request(endpoints.enqueueJob(), { method: "POST", admin: true, json: { projectId: state.projectId, envelope: { capability, input, dryRun: $("job-dry-run").checked }, maxAttempts: Number($("job-max-attempts").value || 3) } });
  });
}

async function processJob() {
  return run("process-job", async () => request(endpoints.processJob(), { method: "POST", admin: true, json: { projectId: state.projectId } }));
}

async function cancelJob() {
  return run("cancel-job", async () => request(endpoints.cancelJob(), { method: "POST", admin: true, json: { projectId: state.projectId, jobId: $("job-id").value.trim(), reason: $("job-cancel-reason").value.trim() || undefined } }));
}

async function loadDeadLetterJobs() {
  return run("dead-letter-jobs", async () => {
    const data = await request(endpoints.deadLetterJobs(), { admin: true });
    $("dead-letter-jobs-list").innerHTML = (data.deadLetters || []).map((row) => `<div class="item"><strong>${escapeHtml(row.capability)} · ${escapeHtml(row.jobId)}</strong><p class="muted">${escapeHtml(row.deadLetteredAt)} · attempts ${escapeHtml(String(row.attempts))}/${escapeHtml(String(row.maxAttempts))}</p><code>${escapeHtml(JSON.stringify(row.lastError || {}, null, 2))}</code></div>`).join("") || `<p class="muted">No job dead letters.</p>`;
    return data;
  });
}

async function retryDeadLetterJob() {
  return run("retry-dead-letter-job", async () => request(endpoints.retryDeadLetterJob(), { method: "POST", admin: true, json: { projectId: state.projectId, jobId: $("job-id").value.trim() } }));
}

async function loadOutboundSubscriptions() {
  return run("outbound-subscriptions", async () => {
    const data = await request(endpoints.outboundSubscriptions(), { admin: true });
    $("outbound-subscriptions-list").innerHTML = (data.subscriptions || []).map((sub) => `<div class="item"><strong>${escapeHtml(sub.enabled ? "enabled" : "disabled")} · ${escapeHtml(sub.url)}</strong><p class="muted">${escapeHtml(sub.id)} · ${escapeHtml((sub.events || []).join(", "))}</p><code>${escapeHtml(JSON.stringify({ secretRef: sub.secretRef, headers: sub.headers }, null, 2))}</code></div>`).join("") || `<p class="muted">No outbound subscriptions.</p>`;
    return data;
  });
}

async function createOutboundSubscription() {
  return run("create-outbound-subscription", async () => request(endpoints.createOutboundSubscription(), { method: "POST", admin: true, json: { projectId: state.projectId, url: $("outbound-url").value.trim(), events: $("outbound-events").value.split(",").map((item) => item.trim()).filter(Boolean), secretRef: $("outbound-secret-ref").value.trim() || undefined } }));
}

async function updateOutboundSubscription() {
  return run("update-outbound-subscription", async () => request(endpoints.updateOutboundSubscription(), { method: "POST", admin: true, json: { projectId: state.projectId, subscriptionId: $("outbound-subscription-id").value.trim(), enabled: $("outbound-enabled").value === "" ? undefined : $("outbound-enabled").value === "true", url: $("outbound-url").value.trim() || undefined, events: $("outbound-events").value.split(",").map((item) => item.trim()).filter(Boolean), maxAttempts: Number($("outbound-max-attempts").value || 3) } }));
}

async function deleteOutboundSubscription() {
  return run("delete-outbound-subscription", async () => request(endpoints.deleteOutboundSubscription(), { method: "POST", admin: true, json: { projectId: state.projectId, subscriptionId: $("outbound-subscription-id").value.trim() } }));
}

async function loadDeadLetterOutbound() {
  return run("dead-letter-outbound", async () => {
    const data = await request(endpoints.deadLetterOutbound(), { admin: true });
    $("outbound-deadletters-list").innerHTML = (data.deadLetters || []).map((row) => `<div class="item"><strong>${escapeHtml(row.eventType)} · ${escapeHtml(row.deliveryId)}</strong><p class="muted">${escapeHtml(row.deadLetteredAt)} · attempts ${escapeHtml(String(row.attempts))}/${escapeHtml(String(row.maxAttempts))}</p><code>${escapeHtml(row.lastError || "")}</code></div>`).join("") || `<p class="muted">No outbound dead letters.</p>`;
    return data;
  });
}

async function emitOutbound() {
  return run("outbound-emit", async () => request(endpoints.outboundEmit(), { method: "POST", admin: true, json: { projectId: state.projectId, eventType: $("outbound-event-type").value.trim(), payload: JSON.parse($("outbound-payload").value || "{}") } }));
}

async function loadOutboundDeliveries() {
  return run("outbound-deliveries", async () => {
    const data = await request(endpoints.outboundDeliveries(), { admin: true });
    $("outbound-deliveries-list").innerHTML = (data.deliveries || []).map((delivery) => `<div class="item"><strong>${escapeHtml(delivery.status)} · ${escapeHtml(delivery.eventType)}</strong><p class="muted">${escapeHtml(delivery.id)} · attempts ${escapeHtml(String(delivery.attempts || 0))} · HTTP ${escapeHtml(String(delivery.responseStatus || "not-sent"))}</p><code>${escapeHtml(JSON.stringify({ subscriptionId: delivery.subscriptionId, lastError: delivery.lastError }, null, 2))}</code></div>`).join("") || `<p class="muted">No deliveries queued.</p>`;
    return data;
  });
}

async function processOutbound() {
  return run("process-outbound", async () => request(endpoints.outboundProcess(), { method: "POST", admin: true, json: { projectId: state.projectId } }));
}

async function loadAnomalies() {
  return run("anomalies", async () => {
    const data = await request(endpoints.anomalies(), { admin: true });
    $("anomalies-list").innerHTML = (data.findings || []).map((finding) => `<div class="item"><strong>${escapeHtml(finding.severity)} · ${escapeHtml(finding.code)}</strong><p class="muted">${escapeHtml(finding.capability || "project")}</p><code>${escapeHtml(finding.message)}</code></div>`).join("") || `<p class="muted">No anomaly findings for current thresholds.</p>`;
    return data;
  });
}

async function loadDoctor() {
  return run("doctor", async () => {
    const data = await request(endpoints.doctor(), { admin: true });
    $("doctor-list").innerHTML = (data.report?.findings || []).map((finding) => `<div class="item"><strong>${escapeHtml(finding.severity)} · ${escapeHtml(finding.code)}</strong><p class="muted">${escapeHtml(finding.message)}</p></div>`).join("") || `<p class="muted">Doctor did not return findings.</p>`;
    return data;
  });
}

async function loadOpsReadiness() {
  return run("ops-readiness", async () => request(endpoints.opsReadiness(), { admin: true }));
}

async function certifyProviderPack() {
  return run("certify-provider-pack", async () => request(endpoints.providerPackCertify(), { method: "POST", admin: true, json: { pack: JSON.parse($("provider-pack-json").value || "{}") } }));
}

async function scaffoldProviderPack() {
  return run("scaffold-provider-pack", async () => request(endpoints.providerPackScaffold(), { method: "POST", admin: true, json: { provider: $("scaffold-provider").value.trim(), label: $("scaffold-label").value.trim(), capabilities: $("scaffold-capabilities").value.split(",").map((item) => item.trim()).filter(Boolean), requiredSecrets: $("scaffold-required").value.split(",").map((item) => item.trim()).filter(Boolean), category: $("scaffold-category").value.trim() || "system" } }));
}

async function loadProviderPackRegistry() {
  return run("provider-pack-registry", async () => {
    const data = await request(endpoints.providerPackRegistry(), { admin: true });
    $("provider-pack-registry-list").innerHTML = (data.registry || []).map((row) => `<div class="item"><strong>${escapeHtml(row.provider)}@${escapeHtml(row.versionTag)} · ${escapeHtml(row.status)}</strong><p class="muted">${escapeHtml(row.id)} · ${escapeHtml(row.checksum || "")}</p><code>${escapeHtml(JSON.stringify(row.certification?.findings || [], null, 2))}</code></div>`).join("") || `<p class="muted">No registry entries.</p>`;
    return data;
  });
}

async function publishProviderPack() {
  return run("publish-provider-pack", async () => request(endpoints.providerPackRegistry(), { method: "POST", admin: true, json: { pack: JSON.parse($("provider-pack-json").value || "{}"), versionTag: $("provider-pack-version").value.trim() || undefined } }));
}

async function installProviderPack() {
  return run("install-provider-pack", async () => request(endpoints.installProviderPack(), { method: "POST", admin: true, json: { projectId: state.projectId, registryId: $("provider-pack-registry-id").value.trim(), enabled: true } }));
}

async function loadProviderPackInstallations() {
  return run("provider-pack-installations", async () => request(endpoints.providerPackInstallations(), { admin: true }));
}

async function loadBillingUsage() {
  return run("billing-usage", async () => {
    const data = await request(endpoints.billingUsage(), { admin: true });
    $("billing-usage-list").innerHTML = (data.records || []).map((row) => `<div class="item"><strong>${escapeHtml(row.capability)} · ${escapeHtml(String(row.count))} calls</strong><p class="muted">${escapeHtml(row.window)} · est ${escapeHtml(String(row.estimatedCents))} cents</p></div>`).join("") || `<p class="muted">No billing usage records for this window.</p>`;
    return data;
  });
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}


async function claimJobLease() {
  return run("claim-job-lease", async () => request(endpoints.claimJobLease(), { method: "POST", admin: true, json: { projectId: state.projectId, leaseMs: Number($("job-lease-ms")?.value || 300000) } }));
}

async function completeJobLease() {
  return run("complete-job-lease", async () => {
    const lease = state.lastResult?.lease;
    if (!lease?.jobId || !lease?.token) throw new Error("Claim a job lease first; the completion action uses the last lease result.");
    return request(endpoints.completeJobLease(), { method: "POST", admin: true, json: { projectId: state.projectId, jobId: lease.jobId, leaseToken: lease.token, result: { ok: true, capability: state.lastResult?.job?.envelope?.capability || "providers.health", proofId: "proof_console_manual_lease_completion", data: { completedFromConsole: true }, secrets_exposed: false } } });
  });
}

async function validatePackDependencies() {
  return run("provider-pack-dependencies", async () => request(endpoints.providerPackDependencies(), { method: "POST", admin: true, json: { pack: JSON.parse($("signed-pack-json").value) } }));
}

async function signProviderPack() {
  return run("provider-pack-sign", async () => request(endpoints.signProviderPack(), { method: "POST", admin: true, json: { pack: JSON.parse($("signed-pack-json").value), signer: "console" } }));
}

async function verifyProviderPack() {
  return run("provider-pack-verify", async () => {
    const manifest = state.lastResult?.manifest;
    if (!manifest) throw new Error("Sign a provider pack first; verification uses the last signed manifest result.");
    return request(endpoints.verifyProviderPack(), { method: "POST", admin: true, json: { pack: JSON.parse($("signed-pack-json").value), manifest } });
  });
}

async function exportBillingUsage(format) {
  return run(`billing-export-${format}`, async () => {
    requireBase();
    const response = await fetch(`${state.baseUrl}${endpoints.billingUsageExport(format)}`, { headers: { "x-skye-admin-key": state.adminKey } });
    const text = await response.text();
    if (!response.ok) throw new Error(text || `HTTP ${response.status}`);
    return text;
  });
}


async function installProviderPackSource() {
  return run("install-provider-pack-source", async () => request(endpoints.installProviderPackSource(), { method: "POST", admin: true, json: { projectId: state.projectId, pack: JSON.parse($("provider-pack-json").value), sourceType: $("pack-source-type").value.trim() || "inline", sourceUri: $("pack-source-uri").value.trim() || undefined, versionTag: $("provider-pack-version").value.trim() || "0.1.0", enabled: true } }));
}

async function certificationReceipt() {
  return run("provider-pack-certification-receipt", async () => request(endpoints.certificationReceipt(), { method: "POST", admin: true, json: { pack: JSON.parse($("provider-pack-json").value), versionTag: $("provider-pack-version").value.trim() || "0.1.0", signer: "console" } }));
}

async function loadBillingInvoice() {
  return run("billing-invoice", async () => {
    const data = await request(endpoints.billingInvoice(), { admin: true });
    const invoice = data.invoice;
    $("billing-invoice-list").innerHTML = invoice ? `<div class="item"><strong>${escapeHtml(invoice.id)} · ${escapeHtml(String(invoice.totalCents))} cents</strong><p class="muted">${escapeHtml(invoice.window)} · ${escapeHtml(invoice.status)} · ${escapeHtml(invoice.note)}</p></div>` : `<p class="muted">No invoice draft returned.</p>`;
    return data;
  });
}

async function exportBillingInvoice(format) {
  return run(`billing-invoice-export-${format}`, async () => {
    requireBase();
    const response = await fetch(`${state.baseUrl}${endpoints.billingInvoiceExport(format)}`, { headers: { "x-skye-admin-key": state.adminKey } });
    const text = await response.text();
    if (!response.ok) throw new Error(text || `HTTP ${response.status}`);
    return text;
  });
}


async function loadProviderPackSource() {
  return run("provider-pack-load-source", async () => request(endpoints.providerPackLoadSource(), { method: "POST", admin: true, json: { sourceType: "inline", pack: JSON.parse($("provider-pack-json").value), versionTag: $("provider-pack-version").value.trim() || "0.1.0" } }));
}

async function sandboxProviderPack() {
  return run("provider-pack-sandbox", async () => request(endpoints.providerPackSandbox(), { method: "POST", admin: true, json: { pack: JSON.parse($("provider-pack-json").value), adapterSource: $("sandbox-adapter-source")?.value || undefined } }));
}

async function createBillingInvoiceRecord() {
  return run("billing-invoice-create", async () => request(endpoints.billingInvoiceCreate(), { method: "POST", admin: true, json: { projectId: state.projectId, customerEmail: $("invoice-customer-email")?.value || undefined, note: "created-from-console" } }));
}

async function listBillingInvoices() {
  return run("billing-invoices", async () => {
    const data = await request(endpoints.billingInvoices(), { admin: true });
    $("billing-invoice-list").innerHTML = (data.invoices || []).map((invoice) => `<div class="item"><strong>${escapeHtml(invoice.id)} · ${escapeHtml(invoice.status)} · ${escapeHtml(String(invoice.totalCents))} cents</strong><p class="muted">${escapeHtml(invoice.window)} · ${escapeHtml(invoice.updatedAt || invoice.generatedAt)}</p></div>`).join("") || `<p class="muted">No persisted invoices yet.</p>`;
    return data;
  });
}

async function markBillingInvoiceStatus(status) {
  return run(`billing-invoice-${status}`, async () => {
    const invoiceId = state.lastResult?.invoice?.id || state.lastResult?.invoices?.[0]?.id;
    if (!invoiceId) throw new Error("Create or list invoices first; status update uses the last invoice id.");
    return request(endpoints.billingInvoiceStatus(), { method: "POST", admin: true, json: { projectId: state.projectId, invoiceId, status, note: `console-mark-${status}` } });
  });
}

async function createSubscription() {
  return run("subscription-create", async () => request(endpoints.subscriptions(), { method: "POST", admin: true, json: { projectId: state.projectId, plan: $("subscription-plan")?.value || "builder", customerEmail: $("invoice-customer-email")?.value || undefined, billingCycle: $("subscription-cycle")?.value || "monthly", basePriceCents: Number($("subscription-base-cents")?.value || 0), includedCalls: Number($("subscription-included-calls")?.value || 0), overageUnitPriceCents: Number($("subscription-overage-cents")?.value || 1) } }));
}

async function loadSubscriptions() {
  return run("subscriptions", async () => request(endpoints.subscriptions(), { admin: true }));
}

async function createWorkspaceBinding() {
  return run("workspace-bind", async () => request(endpoints.workspaceBindings(), { method: "POST", admin: true, json: { workspaceId: $("workspace-id")?.value || "wksp_default", projectId: state.projectId, roles: ($("workspace-roles")?.value || "owner,developer").split(",").map((item) => item.trim()).filter(Boolean) } }));
}

async function loadWorkspaceBindings() {
  return run("workspace-bindings", async () => request(`/v1/admin/workspace-bindings?workspaceId=${encodeURIComponent($("workspace-id")?.value || "")}`, { admin: true }));
}

async function checkWorkspaceAccess() {
  return run("workspace-access-check", async () => request(endpoints.workspaceAccessCheck(), { method: "POST", admin: true, json: { workspaceId: $("workspace-id")?.value || "wksp_default", projectId: state.projectId, role: $("workspace-role-check")?.value || "developer", capability: $("workspace-capability-check")?.value || "email.send", roleCapabilities: { owner: ["workflow.run"], developer: ["email.send", "ai.generate_text", "workflow.run"], viewer: ["manifest.read"] } } }));
}

async function auditExport() {
  return run("audit-export", async () => request(endpoints.auditExport(), { admin: true }));
}

boot();
