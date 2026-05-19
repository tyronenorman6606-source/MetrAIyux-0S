import type { CapabilityCallEnvelope, CapabilityCallResult, CapabilityName, SafeManifest, WorkflowRunData, WorkflowRunInput } from "@skyeapi/core";

export interface SkyeAPIClientOptions {
  baseUrl: string;
  apiKey: string;
  fetchImpl?: typeof fetch;
}

export interface SkyeAPIAdminClientOptions {
  baseUrl: string;
  adminKey: string;
  fetchImpl?: typeof fetch;
}

async function readJson(response: Response): Promise<any> {
  return response.json().catch(() => ({}));
}

export class SkyeAPIClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: SkyeAPIClientOptions) {
    if (!options.baseUrl) throw new Error("SkyeAPI baseUrl is required.");
    if (!options.apiKey) throw new Error("SkyeAPI apiKey is required.");
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.apiKey = options.apiKey;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async health(): Promise<{ ok: boolean; service: string; version: string; secrets_exposed: false }> {
    const response = await this.fetchImpl(`${this.baseUrl}/health`);
    const json = await readJson(response);
    if (!response.ok) throw new Error(`SkyeAPI health failed: ${response.status}`);
    return json;
  }

  async manifest(): Promise<SafeManifest> {
    const response = await this.fetchImpl(`${this.baseUrl}/v1/capabilities`, { headers: { authorization: `Bearer ${this.apiKey}` } });
    if (!response.ok) throw new Error(`SkyeAPI manifest failed: ${response.status}`);
    return response.json();
  }

  async call<TInput = unknown, TOutput = unknown>(capability: CapabilityName, input: TInput, options?: { dryRun?: boolean; idempotencyKey?: string }): Promise<CapabilityCallResult<TOutput>> {
    const envelope: CapabilityCallEnvelope<TInput> = { capability, input, dryRun: options?.dryRun, idempotencyKey: options?.idempotencyKey };
    const response = await this.fetchImpl(`${this.baseUrl}/v1/call`, {
      method: "POST",
      headers: { authorization: `Bearer ${this.apiKey}`, "content-type": "application/json" },
      body: JSON.stringify(envelope)
    });
    const json = await readJson(response);
    if (!response.ok) {
      return { ok: false, capability, proofId: json.proofId ?? "proof_http_failed", error: { code: "http_error", message: json.error?.message ?? json.error ?? `SkyeAPI returned ${response.status}` }, secrets_exposed: false };
    }
    return json as CapabilityCallResult<TOutput>;
  }

  dryRun<TInput = unknown, TOutput = unknown>(capability: CapabilityName, input: TInput): Promise<CapabilityCallResult<TOutput>> {
    return this.call(capability, input, { dryRun: true });
  }

  email = { send: (input: { to: string; from?: string; subject: string; body?: string; html?: string }, options?: { dryRun?: boolean; idempotencyKey?: string }) => this.call("email.send", input, options) };
  sms = { send: (input: { to: string; body: string; from?: string }, options?: { dryRun?: boolean; idempotencyKey?: string }) => this.call("sms.send", input, options) };
  db = {
    query: (input: { sql: string; params?: unknown[]; readonly?: boolean }, options?: { dryRun?: boolean; idempotencyKey?: string }) => this.call("db.query", input, options),
    inspectSchema: (options?: { dryRun?: boolean; idempotencyKey?: string }) => this.call("db.inspect_schema", { readonly: true }, options)
  };
  ai = { generateText: (input: { prompt: string; system?: string; model?: string }, options?: { dryRun?: boolean; idempotencyKey?: string }) => this.call("ai.generate_text", input, options) };
  billing = { createCheckout: (input: { successUrl: string; cancelUrl: string; priceId?: string; amountCents?: number; currency?: string; productName?: string }, options?: { dryRun?: boolean; idempotencyKey?: string }) => this.call("billing.create_checkout", input, options) };
  storage = { upload: (input: { key: string; contentType?: string; body: string }, options?: { dryRun?: boolean; idempotencyKey?: string }) => this.call("storage.upload", input, options) };
  workflow = { run: (input: WorkflowRunInput, options?: { dryRun?: boolean; idempotencyKey?: string }) => this.call<WorkflowRunInput, WorkflowRunData>("workflow.run", input, options) };
}

export class SkyeAPIAdminClient {
  private readonly baseUrl: string;
  private readonly adminKey: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: SkyeAPIAdminClientOptions) {
    if (!options.baseUrl) throw new Error("SkyeAPI baseUrl is required.");
    if (!options.adminKey) throw new Error("SkyeAPI adminKey is required.");
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.adminKey = options.adminKey;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  private async request(path: string, options: { method?: string; body?: unknown } = {}): Promise<any> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: options.method ?? "GET",
      headers: { "x-skye-admin-key": this.adminKey, ...(options.body ? { "content-type": "application/json" } : {}) },
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    const json = await readJson(response);
    if (!response.ok) throw new Error(typeof json.error === "string" ? json.error : JSON.stringify(json));
    return json;
  }

  health(): Promise<any> {
    return this.fetchImpl(`${this.baseUrl}/health`).then(readJson);
  }

  importEnv(input: { projectId: string; envText: string; scopes?: string[]; label?: string; apiKey?: string }): Promise<{ ok: boolean; projectId: string; apiKey: string; manifest: SafeManifest; secrets_exposed: false }> {
    return this.request("/v1/admin/import-env", { method: "POST", body: input });
  }

  createKey(input: { projectId: string; scopes?: string[]; label?: string; prefix?: string; expiresAt?: string }): Promise<{ ok: boolean; projectId: string; apiKey: string; keyHash: string; scopes: string[]; expiresAt?: string | null; secrets_exposed: false }> {
    return this.request("/v1/admin/create-key", { method: "POST", body: input });
  }

  revokeKey(input: { apiKey?: string; keyHash?: string }): Promise<{ ok: boolean; keyHash: string; revoked: boolean; secrets_exposed: false }> {
    return this.request("/v1/admin/revoke-key", { method: "POST", body: input });
  }


  plans(): Promise<any> {
    return this.request("/v1/admin/plans");
  }

  setPlan(input: { projectId: string; plan?: string; dailyCallLimit?: number; rateLimitPerMinute?: number; allowedCapabilities?: Array<string>; status?: "active" | "paused"; notes?: string }): Promise<any> {
    return this.request("/v1/admin/set-plan", { method: "POST", body: input });
  }

  projects(): Promise<any> {
    return this.request("/v1/admin/projects");
  }

  project(projectId: string): Promise<any> {
    return this.request(`/v1/admin/project?projectId=${encodeURIComponent(projectId)}`);
  }

  keys(projectId: string): Promise<any> {
    return this.request(`/v1/admin/keys?projectId=${encodeURIComponent(projectId)}`);
  }

  usage(projectId: string, date?: string): Promise<any> {
    return this.request(`/v1/admin/usage?projectId=${encodeURIComponent(projectId)}${date ? `&date=${encodeURIComponent(date)}` : ""}`);
  }

  events(projectId: string, limit = 50): Promise<any> {
    return this.request(`/v1/admin/events?projectId=${encodeURIComponent(projectId)}&limit=${limit}`);
  }

  providerPacks(): Promise<any> {
    return this.request("/v1/admin/provider-packs");
  }

  projectProviders(projectId: string): Promise<any> {
    return this.request(`/v1/admin/project-providers?projectId=${encodeURIComponent(projectId)}`);
  }

  setProvider(input: { projectId: string; provider: string; enabled: boolean; reason?: string }): Promise<any> {
    return this.request("/v1/admin/set-provider", { method: "POST", body: input });
  }

  policies(projectId: string): Promise<any> {
    return this.request(`/v1/admin/policies?projectId=${encodeURIComponent(projectId)}`);
  }

  setPolicies(input: { projectId: string; policies: any[] }): Promise<any> {
    return this.request("/v1/admin/policies", { method: "POST", body: input });
  }

  roles(projectId: string): Promise<any> {
    return this.request(`/v1/admin/roles?projectId=${encodeURIComponent(projectId)}`);
  }

  setRoles(input: { projectId: string; roles: Record<string, { allowedCapabilities: string[]; label?: string }> }): Promise<any> {
    return this.request("/v1/admin/roles", { method: "POST", body: { version: "skyeapi.roles.v1", projectId: input.projectId, updatedAt: new Date().toISOString(), roles: input.roles } });
  }

  rotateSecret(input: { projectId: string; secretKey: string; secretValue: string; reason?: string }): Promise<any> {
    return this.request("/v1/admin/rotate-secret", { method: "POST", body: input });
  }

  rotations(projectId: string, limit = 50): Promise<any> {
    return this.request(`/v1/admin/rotations?projectId=${encodeURIComponent(projectId)}&limit=${limit}`);
  }

  webhookEvents(projectId: string, limit = 50): Promise<any> {
    return this.request(`/v1/admin/webhook-events?projectId=${encodeURIComponent(projectId)}&limit=${limit}`);
  }

  replayWebhook(input: { projectId: string; eventId: string }): Promise<any> {
    return this.request("/v1/admin/replay-webhook", { method: "POST", body: input });
  }

  approvalRequests(projectId: string, limit = 50): Promise<any> {
    return this.request(`/v1/admin/approval-requests?projectId=${encodeURIComponent(projectId)}&limit=${limit}`);
  }

  approveRequest(input: { projectId: string; requestId: string; action: "approve" | "deny" }): Promise<any> {
    return this.request("/v1/admin/approve-request", { method: "POST", body: input });
  }

  snapshots(projectId: string, limit = 50): Promise<any> {
    return this.request(`/v1/admin/snapshots?projectId=${encodeURIComponent(projectId)}&limit=${limit}`);
  }

  createSnapshot(input: { projectId: string; reason?: string }): Promise<any> {
    return this.request("/v1/admin/create-snapshot", { method: "POST", body: input });
  }

  restoreSnapshot(input: { projectId: string; snapshotId: string }): Promise<any> {
    return this.request("/v1/admin/restore-snapshot", { method: "POST", body: input });
  }

  workflowRuns(projectId: string, options: { limit?: number; details?: boolean } = {}): Promise<any> {
    return this.request(`/v1/admin/workflow-runs?projectId=${encodeURIComponent(projectId)}&limit=${options.limit ?? 50}${options.details ? "&details=true" : ""}`);
  }

  opsReadiness(): Promise<any> {
    return this.request("/v1/admin/ops-readiness");
  }

  doctor(projectId: string): Promise<any> {
    return this.request(`/v1/admin/doctor?projectId=${encodeURIComponent(projectId)}`);
  }

  anomalies(projectId: string, date?: string): Promise<any> {
    return this.request(`/v1/admin/anomalies?projectId=${encodeURIComponent(projectId)}${date ? `&date=${encodeURIComponent(date)}` : ""}`);
  }

  jobs(projectId: string): Promise<any> {
    return this.request(`/v1/admin/jobs?projectId=${encodeURIComponent(projectId)}`);
  }

  enqueueJob(input: { projectId: string; envelope: CapabilityCallEnvelope; notBefore?: string; maxAttempts?: number }): Promise<any> {
    return this.request("/v1/admin/enqueue-job", { method: "POST", body: input });
  }

  processJob(projectId: string): Promise<any> {
    return this.request("/v1/admin/process-job", { method: "POST", body: { projectId } });
  }

  cancelJob(input: { projectId: string; jobId: string; reason?: string }): Promise<any> {
    return this.request("/v1/admin/cancel-job", { method: "POST", body: input });
  }

  outboundSubscriptions(projectId: string): Promise<any> {
    return this.request(`/v1/admin/outbound-subscriptions?projectId=${encodeURIComponent(projectId)}`);
  }

  createOutboundSubscription(input: { projectId: string; url: string; events: string[]; headers?: Record<string, string>; secretRef?: string; enabled?: boolean }): Promise<any> {
    return this.request("/v1/admin/outbound-subscriptions", { method: "POST", body: input });
  }

  emitOutboundEvent(input: { projectId: string; eventType: string; payload?: unknown }): Promise<any> {
    return this.request("/v1/admin/outbound-events", { method: "POST", body: input });
  }

  outboundDeliveries(projectId: string): Promise<any> {
    return this.request(`/v1/admin/outbound-deliveries?projectId=${encodeURIComponent(projectId)}`);
  }

  processOutbound(projectId: string): Promise<any> {
    return this.request("/v1/admin/process-outbound", { method: "POST", body: { projectId } });
  }

  providerPackScaffold(input: { provider: string; label: string; capabilities: string[]; requiredSecrets: string[]; optionalSecrets?: string[]; category?: string }): Promise<any> {
    return this.request("/v1/admin/provider-pack-scaffold", { method: "POST", body: input });
  }

  providerPackCertify(pack: unknown): Promise<any> {
    return this.request("/v1/admin/provider-pack-certify", { method: "POST", body: { pack } });
  }

  deadLetterJobs(projectId: string): Promise<any> {
    return this.request(`/v1/admin/dead-letter-jobs?projectId=${encodeURIComponent(projectId)}`);
  }

  retryDeadLetterJob(input: { projectId: string; jobId: string }): Promise<any> {
    return this.request("/v1/admin/retry-dead-letter-job", { method: "POST", body: input });
  }

  updateOutboundSubscription(input: { projectId: string; subscriptionId: string; url?: string; events?: string[]; headers?: Record<string, string>; enabled?: boolean; secretRef?: string | null; maxAttempts?: number; description?: string | null }): Promise<any> {
    return this.request("/v1/admin/update-outbound-subscription", { method: "POST", body: input });
  }

  deleteOutboundSubscription(input: { projectId: string; subscriptionId: string }): Promise<any> {
    return this.request("/v1/admin/delete-outbound-subscription", { method: "POST", body: input });
  }

  deadLetterOutbound(projectId: string): Promise<any> {
    return this.request(`/v1/admin/dead-letter-outbound?projectId=${encodeURIComponent(projectId)}`);
  }

  providerPackRegistry(): Promise<any> {
    return this.request("/v1/admin/provider-pack-registry");
  }

  publishProviderPack(input: { pack: unknown; versionTag?: string; status?: "review" | "certified" | "rejected" }): Promise<any> {
    return this.request("/v1/admin/provider-pack-registry", { method: "POST", body: input });
  }

  installProviderPack(input: { projectId: string; registryId: string; enabled?: boolean }): Promise<any> {
    return this.request("/v1/admin/install-provider-pack", { method: "POST", body: input });
  }

  providerPackInstallations(projectId: string): Promise<any> {
    return this.request(`/v1/admin/provider-pack-installations?projectId=${encodeURIComponent(projectId)}`);
  }

  billingUsage(projectId: string, date?: string): Promise<any> {
    return this.request(`/v1/admin/billing-usage?projectId=${encodeURIComponent(projectId)}${date ? `&date=${encodeURIComponent(date)}` : ""}`);
  }


  claimJobLease(input: { projectId: string; leaseMs?: number }): Promise<any> {
    return this.request("/v1/admin/claim-job-lease", { method: "POST", body: input });
  }

  completeJobLease(input: { projectId: string; jobId: string; leaseToken: string; result: CapabilityCallResult }): Promise<any> {
    return this.request("/v1/admin/complete-job-lease", { method: "POST", body: input });
  }

  providerPackDependencies(pack: unknown): Promise<any> {
    return this.request("/v1/admin/provider-pack-dependencies", { method: "POST", body: { pack } });
  }

  signProviderPack(input: { pack: unknown; versionTag?: string; signer: string }): Promise<any> {
    return this.request("/v1/admin/provider-pack-sign", { method: "POST", body: input });
  }

  verifyProviderPack(input: { pack: unknown; manifest: unknown }): Promise<any> {
    return this.request("/v1/admin/provider-pack-verify", { method: "POST", body: input });
  }

  async billingUsageExport(projectId: string, format: "csv" | "jsonl" = "csv", date?: string): Promise<string> {
    const url = `${this.baseUrl}/v1/admin/billing-usage-export?projectId=${encodeURIComponent(projectId)}&format=${encodeURIComponent(format)}${date ? `&date=${encodeURIComponent(date)}` : ""}`;
    const response = await this.fetchImpl(url, { headers: { "x-skye-admin-key": this.adminKey } });
    const text = await response.text();
    if (!response.ok) throw new Error(text || `HTTP ${response.status}`);
    return text;
  }


  installProviderPackSource(input: { projectId: string; pack: unknown; sourceType?: "inline" | "directory" | "zip" | "git"; sourceUri?: string; versionTag?: string; enabled?: boolean }): Promise<any> {
    return this.request("/v1/admin/install-provider-pack-source", { method: "POST", body: input });
  }

  providerPackCertificationReceipt(input: { pack: unknown; versionTag?: string; signer?: string }): Promise<any> {
    return this.request("/v1/admin/provider-pack-certification-receipt", { method: "POST", body: input });
  }

  billingInvoice(projectId: string, date?: string, customerName?: string, customerEmail?: string): Promise<any> {
    const query = new URLSearchParams({ projectId });
    if (date) query.set("date", date);
    if (customerName) query.set("customerName", customerName);
    if (customerEmail) query.set("customerEmail", customerEmail);
    return this.request(`/v1/admin/billing-invoice?${query.toString()}`);
  }

  async billingInvoiceExport(projectId: string, format: "csv" | "json" = "json", date?: string): Promise<string> {
    const url = `${this.baseUrl}/v1/admin/billing-invoice-export?projectId=${encodeURIComponent(projectId)}&format=${encodeURIComponent(format)}${date ? `&date=${encodeURIComponent(date)}` : ""}`;
    const response = await this.fetchImpl(url, { headers: { "x-skye-admin-key": this.adminKey } });
    const text = await response.text();
    if (!response.ok) throw new Error(text || `HTTP ${response.status}`);
    return text;
  }


  providerPackLoadSource(input: { sourceType: "inline" | "directory" | "zip" | "git"; pack?: unknown; versionTag?: string }): Promise<any> {
    return this.request("/v1/admin/provider-pack-load-source", { method: "POST", body: input });
  }

  providerPackSandbox(input: { pack: unknown; adapterSource?: string; sampleInputs?: Record<string, unknown> }): Promise<any> {
    return this.request("/v1/admin/provider-pack-sandbox", { method: "POST", body: input });
  }

  providerFixtureCertification(input: { provider: string; capability: string; endpoint: string; mode?: "fixture" | "live_optional"; timeoutMs?: number }): Promise<any> {
    return this.request("/v1/admin/provider-fixture-certification", { method: "POST", body: input });
  }

  createBillingInvoice(input: { projectId: string; date?: string; customerName?: string; customerEmail?: string; dueDays?: number; note?: string }): Promise<any> {
    return this.request("/v1/admin/billing-invoice-create", { method: "POST", body: input });
  }

  billingInvoices(projectId: string): Promise<any> {
    return this.request(`/v1/admin/billing-invoices?projectId=${encodeURIComponent(projectId)}`);
  }

  updateBillingInvoiceStatus(input: { projectId: string; invoiceId: string; status: "draft" | "issued" | "void" | "paid"; note?: string }): Promise<any> {
    return this.request("/v1/admin/billing-invoice-status", { method: "POST", body: input });
  }

  reconcileBillingInvoice(input: { projectId: string; invoiceId: string; date?: string }): Promise<any> {
    return this.request("/v1/admin/billing-invoice-reconcile", { method: "POST", body: input });
  }

  createSubscription(input: { projectId: string; plan: string; customerEmail?: string; billingCycle?: "monthly" | "annual"; basePriceCents?: number; includedCalls?: number; overageUnitPriceCents?: number; trialDays?: number; paymentProvider?: "stripe" | "manual" | "external"; paymentProviderCustomerId?: string; paymentProviderSubscriptionId?: string; paymentProviderPriceId?: string }): Promise<any> {
    return this.request("/v1/admin/subscriptions", { method: "POST", body: input });
  }

  updateSubscriptionLifecycle(input: { projectId: string; subscriptionId: string; action: "update" | "pause" | "resume" | "cancel" | "renew" | "payment_failed"; plan?: string; status?: string; note?: string; paymentProvider?: "stripe" | "manual" | "external"; paymentProviderCustomerId?: string; paymentProviderSubscriptionId?: string; paymentProviderPriceId?: string }): Promise<any> {
    return this.request("/v1/admin/subscription-lifecycle", { method: "POST", body: input });
  }

  subscriptions(projectId: string): Promise<any> {
    return this.request(`/v1/admin/subscriptions?projectId=${encodeURIComponent(projectId)}`);
  }

  createWorkspaceBinding(input: { workspaceId: string; projectId: string; roles?: string[] }): Promise<any> {
    return this.request("/v1/admin/workspace-bindings", { method: "POST", body: input });
  }

  workspaceBindings(workspaceId?: string): Promise<any> {
    return this.request(`/v1/admin/workspace-bindings${workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : ""}`);
  }

  workspaceAccessCheck(input: { workspaceId: string; projectId: string; role?: string; capability?: CapabilityName; roleCapabilities?: Record<string, CapabilityName[]> }): Promise<any> {
    return this.request("/v1/admin/workspace-access-check", { method: "POST", body: input });
  }

  auditExport(projectId: string): Promise<any> {
    return this.request(`/v1/admin/audit-export?projectId=${encodeURIComponent(projectId)}`);
  }

}
