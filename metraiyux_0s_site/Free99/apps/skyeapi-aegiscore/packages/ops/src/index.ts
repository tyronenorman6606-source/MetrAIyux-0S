import { createInputFingerprint, createProofId, providerForCapabilityName, type CapabilityCallEnvelope, type CapabilityCallResult, type CapabilityName, type ProviderName, type SafeManifest } from "@skyeapi/core";

export interface OpsStore {
  get<T = unknown>(key: string): Promise<T | null>;
  put<T = unknown>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  list<T = unknown>(prefix: string): Promise<Array<{ key: string; value: T }>>;
}

export class MemoryOpsStore implements OpsStore {
  private readonly map = new Map<string, unknown>();

  async get<T = unknown>(key: string): Promise<T | null> {
    return this.map.has(key) ? (this.map.get(key) as T) : null;
  }

  async put<T = unknown>(key: string, value: T): Promise<void> {
    this.map.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.map.delete(key);
  }

  async list<T = unknown>(prefix: string): Promise<Array<{ key: string; value: T }>> {
    return [...this.map.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, value]) => ({ key, value: value as T }));
  }
}

export interface AdapterLike {
  provider: ProviderName;
  capability: CapabilityName;
  requiredSecrets: string[];
  execute(input: unknown, context: { provider: ProviderName; secrets: Record<string, string> }): Promise<CapabilityCallResult>;
}

export interface AdapterConformanceFinding {
  adapter: string;
  provider?: ProviderName;
  capability?: CapabilityName;
  ok: boolean;
  severity: "error" | "warning";
  code: string;
  message: string;
}

export interface AdapterConformanceReport {
  version: "skyeapi.adapter-conformance.v1";
  generatedAt: string;
  ok: boolean;
  adapterCount: number;
  findings: AdapterConformanceFinding[];
  secrets_exposed: false;
}

export async function runAdapterConformance(adapters: AdapterLike[]): Promise<AdapterConformanceReport> {
  const findings: AdapterConformanceFinding[] = [];
  const seenCapabilities = new Set<CapabilityName>();

  for (const adapter of adapters) {
    const name = `${adapter.provider}:${adapter.capability}`;
    if (!adapter.provider) findings.push({ adapter: name, ok: false, severity: "error", code: "missing_provider", message: "Adapter must declare a provider." });
    if (!adapter.capability) findings.push({ adapter: name, provider: adapter.provider, ok: false, severity: "error", code: "missing_capability", message: "Adapter must declare a capability." });
    if (adapter.capability && seenCapabilities.has(adapter.capability)) findings.push({ adapter: name, provider: adapter.provider, capability: adapter.capability, ok: false, severity: "error", code: "duplicate_capability", message: `Capability ${adapter.capability} is handled by more than one default adapter.` });
    if (adapter.capability) seenCapabilities.add(adapter.capability);
    if (!Array.isArray(adapter.requiredSecrets)) findings.push({ adapter: name, provider: adapter.provider, capability: adapter.capability, ok: false, severity: "error", code: "missing_required_secrets", message: "Adapter must expose requiredSecrets[]." });
    if (typeof adapter.execute !== "function") findings.push({ adapter: name, provider: adapter.provider, capability: adapter.capability, ok: false, severity: "error", code: "missing_execute", message: "Adapter must expose execute()." });

    if (typeof adapter.execute === "function" && Array.isArray(adapter.requiredSecrets) && adapter.requiredSecrets.length > 0) {
      try {
        const result = await adapter.execute({}, { provider: adapter.provider, secrets: {} });
        if (result.ok) findings.push({ adapter: name, provider: adapter.provider, capability: adapter.capability, ok: false, severity: "error", code: "missing_secret_not_blocked", message: "Adapter returned ok=true with no required secrets supplied." });
        if (JSON.stringify(result).match(/sk_(live|test|proj)_[A-Za-z0-9]{12,}|Bearer\s+[A-Za-z0-9._-]{16,}|token_[A-Za-z0-9]{12,}/i)) findings.push({ adapter: name, provider: adapter.provider, capability: adapter.capability, ok: false, severity: "error", code: "possible_secret_leak", message: "Adapter result appears to contain a raw provider token-like value." });
      } catch (error) {
        findings.push({ adapter: name, provider: adapter.provider, capability: adapter.capability, ok: false, severity: "error", code: "throws_on_missing_secrets", message: error instanceof Error ? error.message : String(error) });
      }
    }
  }

  return {
    version: "skyeapi.adapter-conformance.v1",
    generatedAt: new Date().toISOString(),
    ok: !findings.some((finding) => finding.severity === "error"),
    adapterCount: adapters.length,
    findings,
    secrets_exposed: false
  };
}

export interface ProviderPackAuthoringSpec {
  provider: ProviderName | string;
  label: string;
  capabilities: CapabilityName[];
  requiredSecrets: string[];
  optionalSecrets?: string[];
  category: string;
}

export interface ProviderPackAuthoringResult {
  ok: boolean;
  provider: string;
  files: Record<string, string>;
  errors: string[];
  warnings: string[];
  secrets_exposed: false;
}

export function createProviderPackScaffold(spec: ProviderPackAuthoringSpec): ProviderPackAuthoringResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!/^[a-z0-9][a-z0-9_.-]{1,60}$/.test(String(spec.provider))) errors.push("provider must be a lowercase id using letters, numbers, dots, dashes, or underscores.");
  if (!spec.label) errors.push("label is required.");
  if (!Array.isArray(spec.capabilities) || spec.capabilities.length === 0) errors.push("capabilities[] is required.");
  if (!Array.isArray(spec.requiredSecrets)) errors.push("requiredSecrets[] is required.");
  if (spec.requiredSecrets.some((key) => !/^[A-Z][A-Z0-9_]{1,120}$/.test(key))) errors.push("requiredSecrets must use env-style uppercase names.");
  if (spec.requiredSecrets.length === 0) warnings.push("Provider pack has no required secrets; only use this for system or fixture providers.");

  const provider = String(spec.provider);
  const adapterClass = `${provider.replace(/(^|[_.-])([a-z0-9])/g, (_m, _sep, char) => String(char).toUpperCase())}Adapter`.replace(/[^A-Za-z0-9]/g, "");
  const capabilities = spec.capabilities.map((capability) => `\"${capability}\"`).join(", ");
  const required = spec.requiredSecrets.map((key) => `\"${key}\"`).join(", ");
  const optional = (spec.optionalSecrets ?? []).map((key) => `\"${key}\"`).join(", ");

  const files = {
    [`provider-packs/${provider}/pack.json`]: JSON.stringify({
      version: "skyeapi.provider-pack.v1",
      provider,
      label: spec.label,
      category: spec.category,
      capabilities: spec.capabilities,
      requiredSecrets: spec.requiredSecrets,
      optionalSecrets: spec.optionalSecrets ?? [],
      secrets_exposed: false
    }, null, 2),
    [`provider-packs/${provider}/adapter.ts`]: `import type { CapabilityCallResult, CapabilityName, ProviderName } from \"@skyeapi/core\";\n\nexport class ${adapterClass} {\n  provider: ProviderName | string = \"${provider}\";\n  capabilities: CapabilityName[] = [${capabilities}];\n  requiredSecrets = [${required}];\n  optionalSecrets = [${optional}];\n\n  async execute(capability: CapabilityName, input: unknown, context: { secrets: Record<string, string> }): Promise<CapabilityCallResult> {\n    const missing = this.requiredSecrets.filter((key) => !context.secrets[key]);\n    if (missing.length) {\n      return { ok: false, capability, provider: this.provider as ProviderName, proofId: \"proof_missing_secrets\", error: { code: \"missing_secrets\", message: \`Missing: \${missing.join(\", \`)}\` }, secrets_exposed: false };\n    }\n    return { ok: false, capability, provider: this.provider as ProviderName, proofId: \"proof_not_implemented\", error: { code: \"adapter_not_implemented\", message: \"Provider adapter scaffold generated; implement provider-specific execution before enabling live calls.\" }, secrets_exposed: false };\n  }\n}\n`
  };

  return { ok: errors.length === 0, provider, files, errors, warnings, secrets_exposed: false };
}

export interface AsyncJobRecord {
  version: "skyeapi.async-job.v1";
  id: string;
  projectId: string;
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  envelope: CapabilityCallEnvelope;
  actor?: { id?: string; role?: string };
  attempts: number;
  maxAttempts: number;
  queuedAt: string;
  updatedAt: string;
  notBefore?: string;
  lastError?: { code: string; message: string };
  result?: CapabilityCallResult;
  secrets_exposed: false;
}

export class AsyncJobQueue {
  constructor(private readonly store: OpsStore) {}

  async enqueue(input: { projectId: string; envelope: CapabilityCallEnvelope; actor?: { id?: string; role?: string }; notBefore?: string; maxAttempts?: number }): Promise<AsyncJobRecord> {
    const now = new Date().toISOString();
    const id = createProofId("job");
    const record: AsyncJobRecord = {
      version: "skyeapi.async-job.v1",
      id,
      projectId: input.projectId,
      status: "queued",
      envelope: input.envelope,
      actor: input.actor,
      attempts: 0,
      maxAttempts: input.maxAttempts ?? 3,
      queuedAt: now,
      updatedAt: now,
      notBefore: input.notBefore,
      secrets_exposed: false
    };
    await this.store.put(`job:${input.projectId}:${now}:${id}`, record);
    return record;
  }

  async list(projectId: string): Promise<AsyncJobRecord[]> {
    const rows = await this.store.list<AsyncJobRecord>(`job:${projectId}:`);
    return rows.map((row) => row.value).sort((a, b) => b.queuedAt.localeCompare(a.queuedAt));
  }

  async claimNext(projectId: string, now = new Date()): Promise<AsyncJobRecord | null> {
    const queued = (await this.list(projectId))
      .filter((job) => job.status === "queued" && (!job.notBefore || new Date(job.notBefore) <= now))
      .sort((a, b) => a.queuedAt.localeCompare(b.queuedAt));
    const job = queued[0];
    if (!job) return null;
    const running = { ...job, status: "running" as const, attempts: job.attempts + 1, updatedAt: now.toISOString() };
    await this.replace(job, running);
    return running;
  }

  async executeNext(projectId: string, executor: (job: AsyncJobRecord) => Promise<CapabilityCallResult>): Promise<AsyncJobRecord | null> {
    const job = await this.claimNext(projectId);
    if (!job) return null;
    try {
      const result = await executor(job);
      const done = { ...job, status: result.ok ? "succeeded" as const : "failed" as const, result, updatedAt: new Date().toISOString(), lastError: result.error };
      await this.replace(job, done);
      return done;
    } catch (error) {
      const failed = { ...job, status: job.attempts < job.maxAttempts ? "queued" as const : "failed" as const, updatedAt: new Date().toISOString(), lastError: { code: "executor_error", message: error instanceof Error ? error.message : String(error) } };
      await this.replace(job, failed);
      return failed;
    }
  }

  private async replace(previous: AsyncJobRecord, next: AsyncJobRecord): Promise<void> {
    const rows = await this.store.list<AsyncJobRecord>(`job:${previous.projectId}:`);
    const found = rows.find((row) => row.value.id === previous.id);
    if (found) await this.store.put(found.key, next);
  }
}

export interface OutboundWebhookSubscription {
  version: "skyeapi.outbound-webhook.v1";
  id: string;
  projectId: string;
  url: string;
  events: string[];
  secretRef?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  headers?: Record<string, string>;
  secrets_exposed: false;
}

export interface OutboundDeliveryRecord {
  version: "skyeapi.outbound-delivery.v1";
  id: string;
  projectId: string;
  subscriptionId: string;
  eventType: string;
  payload: unknown;
  status: "queued" | "delivered" | "failed";
  attempts: number;
  queuedAt: string;
  updatedAt: string;
  responseStatus?: number;
  lastError?: string;
  secrets_exposed: false;
}

export class OutboundWebhookHub {
  constructor(private readonly store: OpsStore) {}

  async subscribe(input: { projectId: string; url: string; events: string[]; headers?: Record<string, string>; enabled?: boolean; secretRef?: string }): Promise<OutboundWebhookSubscription> {
    if (!/^https:\/\//i.test(input.url)) throw new Error("Outbound webhook URL must be HTTPS.");
    if (!input.events.length) throw new Error("At least one event type is required.");
    const now = new Date().toISOString();
    const record: OutboundWebhookSubscription = {
      version: "skyeapi.outbound-webhook.v1",
      id: createProofId("owh"),
      projectId: input.projectId,
      url: input.url,
      events: input.events,
      enabled: input.enabled ?? true,
      createdAt: now,
      updatedAt: now,
      headers: input.headers,
      secretRef: input.secretRef,
      secrets_exposed: false
    };
    await this.store.put(`outbound-sub:${input.projectId}:${record.id}`, record);
    return record;
  }

  async listSubscriptions(projectId: string): Promise<OutboundWebhookSubscription[]> {
    return (await this.store.list<OutboundWebhookSubscription>(`outbound-sub:${projectId}:`)).map((row) => row.value);
  }

  async enqueueEvent(projectId: string, eventType: string, payload: unknown): Promise<OutboundDeliveryRecord[]> {
    const subscriptions = await this.listSubscriptions(projectId);
    const matched = subscriptions.filter((subscription) => subscription.enabled && (subscription.events.includes("*") || subscription.events.includes(eventType)));
    const now = new Date().toISOString();
    const deliveries: OutboundDeliveryRecord[] = [];
    for (const subscription of matched) {
      const delivery: OutboundDeliveryRecord = {
        version: "skyeapi.outbound-delivery.v1",
        id: createProofId("delivery"),
        projectId,
        subscriptionId: subscription.id,
        eventType,
        payload,
        status: "queued",
        attempts: 0,
        queuedAt: now,
        updatedAt: now,
        secrets_exposed: false
      };
      await this.store.put(`outbound-delivery:${projectId}:${now}:${delivery.id}`, delivery);
      deliveries.push(delivery);
    }
    return deliveries;
  }

  async listDeliveries(projectId: string): Promise<OutboundDeliveryRecord[]> {
    return (await this.store.list<OutboundDeliveryRecord>(`outbound-delivery:${projectId}:`)).map((row) => row.value).sort((a, b) => b.queuedAt.localeCompare(a.queuedAt));
  }

  async processQueued(projectId: string, fetchImpl: typeof fetch, secrets: Record<string, string> = {}): Promise<OutboundDeliveryRecord[]> {
    const subscriptions = await this.listSubscriptions(projectId);
    const byId = new Map(subscriptions.map((subscription) => [subscription.id, subscription]));
    const rows = await this.store.list<OutboundDeliveryRecord>(`outbound-delivery:${projectId}:`);
    const processed: OutboundDeliveryRecord[] = [];
    for (const row of rows.filter((item) => item.value.status === "queued")) {
      const delivery = row.value;
      const subscription = byId.get(delivery.subscriptionId);
      if (!subscription || !subscription.enabled) continue;
      const body = JSON.stringify({ eventType: delivery.eventType, deliveryId: delivery.id, payload: delivery.payload, secrets_exposed: false });
      const headers: Record<string, string> = { "content-type": "application/json", ...subscription.headers };
      if (subscription.secretRef && secrets[subscription.secretRef]) {
        const signature = await hmacSha256Hex(secrets[subscription.secretRef], body);
        headers["x-skyeapi-signature"] = `sha256=${signature}`;
      }
      try {
        const response = await fetchImpl(subscription.url, { method: "POST", headers, body });
        const next = { ...delivery, status: response.ok ? "delivered" as const : "failed" as const, attempts: delivery.attempts + 1, updatedAt: new Date().toISOString(), responseStatus: response.status, lastError: response.ok ? undefined : `HTTP ${response.status}` };
        await this.store.put(row.key, next);
        processed.push(next);
      } catch (error) {
        const next = { ...delivery, status: "failed" as const, attempts: delivery.attempts + 1, updatedAt: new Date().toISOString(), lastError: error instanceof Error ? error.message : String(error) };
        await this.store.put(row.key, next);
        processed.push(next);
      }
    }
    return processed;
  }
}

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export interface UsageSample {
  projectId: string;
  capability: CapabilityName;
  ok: boolean;
  count: number;
  window: string;
}

export interface AnomalyFinding {
  severity: "info" | "warning" | "critical";
  code: string;
  message: string;
  capability?: CapabilityName;
}

export function detectUsageAnomalies(samples: UsageSample[], options: { maxFailureRate?: number; maxCapabilityCalls?: number } = {}): AnomalyFinding[] {
  const findings: AnomalyFinding[] = [];
  const byCapability = new Map<CapabilityName, { ok: number; failed: number }>();
  for (const sample of samples) {
    const current = byCapability.get(sample.capability) ?? { ok: 0, failed: 0 };
    if (sample.ok) current.ok += sample.count; else current.failed += sample.count;
    byCapability.set(sample.capability, current);
  }
  for (const [capability, counts] of byCapability.entries()) {
    const total = counts.ok + counts.failed;
    const failureRate = total ? counts.failed / total : 0;
    if (failureRate > (options.maxFailureRate ?? 0.2)) findings.push({ severity: failureRate > 0.5 ? "critical" : "warning", code: "high_failure_rate", capability, message: `${capability} failure rate is ${(failureRate * 100).toFixed(1)}%.` });
    if (total > (options.maxCapabilityCalls ?? 1000)) findings.push({ severity: "warning", code: "call_volume_spike", capability, message: `${capability} has ${total} calls in the sampled window.` });
  }
  return findings;
}

export interface DoctorFinding {
  severity: "pass" | "warning" | "error";
  code: string;
  message: string;
}

export interface DoctorReport {
  version: "skyeapi.doctor.v1";
  generatedAt: string;
  ok: boolean;
  findings: DoctorFinding[];
  secrets_exposed: false;
}

export function runDeveloperDoctor(input: { manifest?: SafeManifest; env?: Record<string, string>; packageScripts?: Record<string, string>; policies?: unknown[] }): DoctorReport {
  const findings: DoctorFinding[] = [];
  if (!input.manifest) findings.push({ severity: "error", code: "missing_manifest", message: "No safe manifest supplied. Run skyeapi capabilities or skyeapi export safe-manifest." });
  if (input.manifest) {
    const enabled = input.manifest.capabilities.filter((capability) => capability.enabled);
    if (!enabled.some((capability) => capability.name !== "manifest.read" && capability.name !== "workflow.run")) findings.push({ severity: "warning", code: "no_provider_capabilities", message: "Manifest has no enabled provider-backed capabilities." });
    if (JSON.stringify(input.manifest).match(/sk_(live|test|proj)_[A-Za-z0-9]{12,}|Bearer\s+[A-Za-z0-9._-]{16,}|token_[A-Za-z0-9]{12,}/i)) findings.push({ severity: "error", code: "manifest_secret_leak", message: "Safe manifest appears to contain a token-like value." });
  }
  if (!input.packageScripts?.proof) findings.push({ severity: "warning", code: "missing_proof_script", message: "package.json should expose a proof script for local CI." });
  if (!input.packageScripts?.["truth-gate"]) findings.push({ severity: "warning", code: "missing_truth_gate", message: "package.json should expose a truth-gate script to prevent overclaims." });
  if (input.env && Object.keys(input.env).some((key) => key.endsWith("API_KEY") || key.includes("SECRET"))) findings.push({ severity: "pass", code: "env_detected", message: "Credential-shaped env keys detected; ensure they are imported into AegisCore and not committed." });
  if (!input.policies || input.policies.length === 0) findings.push({ severity: "warning", code: "no_policies", message: "No policy rules supplied. Paid projects should define risk gates for SQL, SMS, AI, billing, and storage." });
  return { version: "skyeapi.doctor.v1", generatedAt: new Date().toISOString(), ok: !findings.some((finding) => finding.severity === "error"), findings, secrets_exposed: false };
}

export function capabilityCostClass(capability: CapabilityName): "low" | "medium" | "high" {
  if (capability === "sms.send" || capability === "billing.create_checkout") return "high";
  if (capability === "ai.generate_text" || capability === "storage.upload" || capability === "db.query") return "medium";
  return "low";
}

export function summarizeCapabilityRisk(capability: CapabilityName): { capability: CapabilityName; provider: ProviderName; costClass: "low" | "medium" | "high"; shouldAudit: boolean } {
  const costClass = capabilityCostClass(capability);
  return { capability, provider: providerForCapabilityName(capability), costClass, shouldAudit: costClass !== "low" || capability === "db.query" };
}

export async function createJobFingerprint(record: Pick<AsyncJobRecord, "projectId" | "envelope">): Promise<string> {
  return createInputFingerprint(record.envelope.capability, { projectId: record.projectId, input: record.envelope.input, dryRun: record.envelope.dryRun });
}


export interface ProviderPackCertificationReport {
  version: "skyeapi.provider-pack-certification.v1";
  generatedAt: string;
  ok: boolean;
  provider: string;
  findings: Array<{ severity: "pass" | "warning" | "error"; code: string; message: string }>;
  secrets_exposed: false;
}

export function certifyProviderPackDefinition(input: unknown): ProviderPackCertificationReport {
  const pack = (input ?? {}) as Record<string, unknown>;
  const findings: ProviderPackCertificationReport["findings"] = [];
  const provider = String(pack.provider ?? pack.id ?? "unknown");
  if (pack.version !== "skyeapi.provider-pack.v1" && pack.version !== undefined) findings.push({ severity: "warning", code: "unknown_pack_version", message: "Provider pack version is not skyeapi.provider-pack.v1." });
  if (!/^[a-z0-9][a-z0-9_.-]{1,60}$/.test(provider)) findings.push({ severity: "error", code: "invalid_provider_id", message: "Provider id must be lowercase and URL-safe." });
  if (!pack.label || typeof pack.label !== "string") findings.push({ severity: "error", code: "missing_label", message: "Provider pack requires a human-readable label." });
  const capabilities = Array.isArray(pack.capabilities) ? pack.capabilities as string[] : [];
  if (!capabilities.length) findings.push({ severity: "error", code: "missing_capabilities", message: "Provider pack requires at least one capability." });
  for (const capability of capabilities) {
    if (!/^[a-z]+(\.[a-z_]+)+$/.test(String(capability))) findings.push({ severity: "error", code: "invalid_capability", message: `Invalid capability name: ${capability}` });
  }
  const requiredSecrets = Array.isArray(pack.requiredSecrets) ? pack.requiredSecrets as string[] : [];
  if (!requiredSecrets.length) findings.push({ severity: "warning", code: "no_required_secrets", message: "Pack has no required secrets; confirm this is intentional." });
  for (const key of requiredSecrets) {
    if (!/^[A-Z][A-Z0-9_]{1,120}$/.test(String(key))) findings.push({ severity: "error", code: "invalid_secret_key", message: `Invalid required secret key: ${key}` });
  }
  if (JSON.stringify(input).match(/sk_(live|test|proj)_[A-Za-z0-9]{12,}|Bearer\s+[A-Za-z0-9._-]{16,}|token_[A-Za-z0-9]{12,}/i)) findings.push({ severity: "error", code: "token_like_value", message: "Provider pack appears to contain a raw token-like value." });
  if (!findings.some((finding) => finding.severity === "error")) findings.push({ severity: "pass", code: "pack_shape_valid", message: "Provider pack shape is acceptable for authoring and review." });
  return { version: "skyeapi.provider-pack-certification.v1", generatedAt: new Date().toISOString(), ok: !findings.some((finding) => finding.severity === "error"), provider, findings, secrets_exposed: false };
}



export interface RetryPolicy {
  strategy: "fixed" | "exponential";
  baseDelayMs: number;
  maxDelayMs: number;
  jitterMs?: number;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  strategy: "exponential",
  baseDelayMs: 30_000,
  maxDelayMs: 15 * 60_000,
  jitterMs: 0
};

export function computeRetryDelayMs(attempts: number, policy: RetryPolicy = DEFAULT_RETRY_POLICY): number {
  const base = Math.max(0, policy.baseDelayMs);
  const max = Math.max(base, policy.maxDelayMs);
  const raw = policy.strategy === "fixed" ? base : base * Math.pow(2, Math.max(0, attempts - 1));
  const jitter = policy.jitterMs ? Math.floor(Math.random() * Math.max(1, policy.jitterMs)) : 0;
  return Math.min(max, raw + jitter);
}

export interface DurableAsyncJobRecord extends Omit<AsyncJobRecord, "status"> {
  status: AsyncJobRecord["status"] | "dead_lettered";
  fingerprint: string;
  retryPolicy: RetryPolicy;
  lockedUntil?: string;
  nextAttemptAt?: string;
  deadLetteredAt?: string;
  deadLetterReason?: string;
}

export interface DeadLetterJobRecord {
  version: "skyeapi.dead-letter-job.v1";
  id: string;
  projectId: string;
  jobId: string;
  capability: CapabilityName;
  deadLetteredAt: string;
  attempts: number;
  maxAttempts: number;
  lastError?: { code: string; message: string };
  fingerprint: string;
  secrets_exposed: false;
}

export class DurableAsyncJobQueue {
  constructor(private readonly store: OpsStore) {}

  async enqueue(input: { projectId: string; envelope: CapabilityCallEnvelope; actor?: { id?: string; role?: string }; notBefore?: string; maxAttempts?: number; retryPolicy?: Partial<RetryPolicy> }): Promise<DurableAsyncJobRecord> {
    const now = new Date().toISOString();
    const retryPolicy: RetryPolicy = { ...DEFAULT_RETRY_POLICY, ...(input.retryPolicy ?? {}) };
    const record: DurableAsyncJobRecord = {
      version: "skyeapi.async-job.v1",
      id: createProofId("job"),
      projectId: input.projectId,
      status: "queued",
      envelope: input.envelope,
      actor: input.actor,
      attempts: 0,
      maxAttempts: input.maxAttempts ?? 3,
      queuedAt: now,
      updatedAt: now,
      notBefore: input.notBefore,
      nextAttemptAt: input.notBefore,
      retryPolicy,
      fingerprint: await createInputFingerprint(input.envelope.capability, { projectId: input.projectId, input: input.envelope.input, dryRun: input.envelope.dryRun }),
      secrets_exposed: false
    };
    await this.store.put(`job:${input.projectId}:${now}:${record.id}`, record);
    return record;
  }

  async list(projectId: string): Promise<DurableAsyncJobRecord[]> {
    const rows = await this.store.list<DurableAsyncJobRecord>(`job:${projectId}:`);
    return rows.map((row) => this.normalize(row.value)).sort((a, b) => b.queuedAt.localeCompare(a.queuedAt));
  }

  async listDeadLetters(projectId: string): Promise<DeadLetterJobRecord[]> {
    return (await this.store.list<DeadLetterJobRecord>(`dead-letter-job:${projectId}:`)).map((row) => row.value).sort((a, b) => b.deadLetteredAt.localeCompare(a.deadLetteredAt));
  }

  async claimNext(projectId: string, now = new Date()): Promise<DurableAsyncJobRecord | null> {
    const rows = await this.store.list<DurableAsyncJobRecord>(`job:${projectId}:`);
    const ready = rows
      .map((row) => ({ key: row.key, value: this.normalize(row.value) }))
      .filter((row) => row.value.status === "queued")
      .filter((row) => !row.value.notBefore || new Date(row.value.notBefore) <= now)
      .filter((row) => !row.value.lockedUntil || new Date(row.value.lockedUntil) <= now)
      .sort((a, b) => a.value.queuedAt.localeCompare(b.value.queuedAt));
    const row = ready[0];
    if (!row) return null;
    const running: DurableAsyncJobRecord = { ...row.value, status: "running", attempts: row.value.attempts + 1, updatedAt: now.toISOString(), lockedUntil: new Date(now.getTime() + 5 * 60_000).toISOString() };
    await this.store.put(row.key, running);
    return running;
  }

  async executeNext(projectId: string, executor: (job: DurableAsyncJobRecord) => Promise<CapabilityCallResult>): Promise<DurableAsyncJobRecord | null> {
    const job = await this.claimNext(projectId);
    if (!job) return null;
    try {
      const result = await executor(job);
      const next = result.ok ? await this.markSucceeded(job, result) : await this.rescheduleOrDeadLetter(job, result.error ?? { code: "capability_failed", message: "Capability returned ok=false." }, result);
      return next;
    } catch (error) {
      return this.rescheduleOrDeadLetter(job, { code: "executor_error", message: error instanceof Error ? error.message : String(error) });
    }
  }

  async retryDeadLetter(projectId: string, jobId: string): Promise<DurableAsyncJobRecord | null> {
    const found = await this.findJob(projectId, jobId);
    if (!found) return null;
    const now = new Date().toISOString();
    const retried: DurableAsyncJobRecord = { ...this.normalize(found.value), status: "queued", attempts: 0, updatedAt: now, lockedUntil: undefined, nextAttemptAt: now, notBefore: now, deadLetteredAt: undefined, deadLetterReason: undefined, lastError: undefined };
    await this.store.put(found.key, retried);
    return retried;
  }

  private async markSucceeded(job: DurableAsyncJobRecord, result: CapabilityCallResult): Promise<DurableAsyncJobRecord> {
    const found = await this.findJob(job.projectId, job.id);
    const done: DurableAsyncJobRecord = { ...job, status: "succeeded", result, updatedAt: new Date().toISOString(), lockedUntil: undefined, nextAttemptAt: undefined, lastError: undefined };
    if (found) await this.store.put(found.key, done);
    return done;
  }

  private async rescheduleOrDeadLetter(job: DurableAsyncJobRecord, error: { code: string; message: string }, result?: CapabilityCallResult): Promise<DurableAsyncJobRecord> {
    const found = await this.findJob(job.projectId, job.id);
    const now = new Date();
    if (job.attempts < job.maxAttempts) {
      const delay = computeRetryDelayMs(job.attempts, job.retryPolicy);
      const nextAttemptAt = new Date(now.getTime() + delay).toISOString();
      const queued: DurableAsyncJobRecord = { ...job, status: "queued", updatedAt: now.toISOString(), lockedUntil: undefined, nextAttemptAt, notBefore: nextAttemptAt, lastError: error, result };
      if (found) await this.store.put(found.key, queued);
      return queued;
    }
    const dead: DurableAsyncJobRecord = { ...job, status: "dead_lettered", updatedAt: now.toISOString(), lockedUntil: undefined, deadLetteredAt: now.toISOString(), deadLetterReason: error.message, lastError: error, result };
    if (found) await this.store.put(found.key, dead);
    const deadLetter: DeadLetterJobRecord = { version: "skyeapi.dead-letter-job.v1", id: createProofId("dlj"), projectId: job.projectId, jobId: job.id, capability: job.envelope.capability, deadLetteredAt: now.toISOString(), attempts: job.attempts, maxAttempts: job.maxAttempts, lastError: error, fingerprint: job.fingerprint, secrets_exposed: false };
    await this.store.put(`dead-letter-job:${job.projectId}:${deadLetter.deadLetteredAt}:${deadLetter.id}`, deadLetter);
    return dead;
  }

  private async findJob(projectId: string, jobId: string): Promise<{ key: string; value: DurableAsyncJobRecord } | undefined> {
    const rows = await this.store.list<DurableAsyncJobRecord>(`job:${projectId}:`);
    return rows.find((row) => row.value.id === jobId);
  }

  private normalize(record: DurableAsyncJobRecord): DurableAsyncJobRecord {
    return {
      ...record,
      retryPolicy: record.retryPolicy ?? DEFAULT_RETRY_POLICY,
      fingerprint: record.fingerprint ?? "legacy-job-without-fingerprint"
    };
  }
}

export interface DurableOutboundWebhookSubscription extends OutboundWebhookSubscription {
  maxAttempts?: number;
  description?: string;
}

export interface DurableOutboundDeliveryRecord extends Omit<OutboundDeliveryRecord, "status"> {
  status: OutboundDeliveryRecord["status"] | "dead_lettered";
  maxAttempts: number;
  retryPolicy: RetryPolicy;
  notBefore?: string;
  nextAttemptAt?: string;
  deadLetteredAt?: string;
}

export interface DeadLetterOutboundRecord {
  version: "skyeapi.dead-letter-outbound.v1";
  id: string;
  projectId: string;
  deliveryId: string;
  subscriptionId: string;
  eventType: string;
  deadLetteredAt: string;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  secrets_exposed: false;
}

export class DurableOutboundWebhookHub {
  constructor(private readonly store: OpsStore) {}

  async subscribe(input: { projectId: string; url: string; events: string[]; headers?: Record<string, string>; enabled?: boolean; secretRef?: string; maxAttempts?: number; description?: string }): Promise<DurableOutboundWebhookSubscription> {
    if (!/^https:\/\//i.test(input.url)) throw new Error("Outbound webhook URL must be HTTPS.");
    if (!input.events.length) throw new Error("At least one event type is required.");
    const now = new Date().toISOString();
    const record: DurableOutboundWebhookSubscription = { version: "skyeapi.outbound-webhook.v1", id: createProofId("owh"), projectId: input.projectId, url: input.url, events: input.events, enabled: input.enabled ?? true, createdAt: now, updatedAt: now, headers: sanitizeOutboundHeaders(input.headers ?? {}), secretRef: input.secretRef, maxAttempts: input.maxAttempts ?? 3, description: input.description, secrets_exposed: false };
    await this.store.put(`outbound-sub:${input.projectId}:${record.id}`, record);
    return record;
  }

  async updateSubscription(input: { projectId: string; subscriptionId: string; url?: string; events?: string[]; headers?: Record<string, string>; enabled?: boolean; secretRef?: string | null; maxAttempts?: number; description?: string | null }): Promise<DurableOutboundWebhookSubscription | null> {
    const key = `outbound-sub:${input.projectId}:${input.subscriptionId}`;
    const current = await this.store.get<DurableOutboundWebhookSubscription>(key);
    if (!current) return null;
    if (input.url && !/^https:\/\//i.test(input.url)) throw new Error("Outbound webhook URL must be HTTPS.");
    const next: DurableOutboundWebhookSubscription = { ...current, url: input.url ?? current.url, events: input.events ?? current.events, headers: input.headers ? sanitizeOutboundHeaders(input.headers) : current.headers, enabled: typeof input.enabled === "boolean" ? input.enabled : current.enabled, secretRef: input.secretRef === null ? undefined : input.secretRef ?? current.secretRef, maxAttempts: input.maxAttempts ?? current.maxAttempts ?? 3, description: input.description === null ? undefined : input.description ?? current.description, updatedAt: new Date().toISOString(), secrets_exposed: false };
    await this.store.put(key, next);
    return next;
  }

  async deleteSubscription(projectId: string, subscriptionId: string): Promise<boolean> {
    const key = `outbound-sub:${projectId}:${subscriptionId}`;
    const current = await this.store.get<DurableOutboundWebhookSubscription>(key);
    if (!current) return false;
    await this.store.delete(key);
    return true;
  }

  async listSubscriptions(projectId: string): Promise<DurableOutboundWebhookSubscription[]> {
    return (await this.store.list<DurableOutboundWebhookSubscription>(`outbound-sub:${projectId}:`)).map((row) => row.value).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async enqueueEvent(projectId: string, eventType: string, payload: unknown): Promise<DurableOutboundDeliveryRecord[]> {
    const subscriptions = await this.listSubscriptions(projectId);
    const matched = subscriptions.filter((subscription) => subscription.enabled && (subscription.events.includes("*") || subscription.events.includes(eventType)));
    const now = new Date().toISOString();
    const deliveries: DurableOutboundDeliveryRecord[] = [];
    for (const subscription of matched) {
      const delivery: DurableOutboundDeliveryRecord = { version: "skyeapi.outbound-delivery.v1", id: createProofId("delivery"), projectId, subscriptionId: subscription.id, eventType, payload, status: "queued", attempts: 0, maxAttempts: subscription.maxAttempts ?? 3, retryPolicy: DEFAULT_RETRY_POLICY, queuedAt: now, updatedAt: now, secrets_exposed: false };
      await this.store.put(`outbound-delivery:${projectId}:${now}:${delivery.id}`, delivery);
      deliveries.push(delivery);
    }
    return deliveries;
  }

  async listDeliveries(projectId: string): Promise<DurableOutboundDeliveryRecord[]> {
    return (await this.store.list<DurableOutboundDeliveryRecord>(`outbound-delivery:${projectId}:`)).map((row) => this.normalizeDelivery(row.value)).sort((a, b) => b.queuedAt.localeCompare(a.queuedAt));
  }

  async listDeadLetters(projectId: string): Promise<DeadLetterOutboundRecord[]> {
    return (await this.store.list<DeadLetterOutboundRecord>(`dead-letter-outbound:${projectId}:`)).map((row) => row.value).sort((a, b) => b.deadLetteredAt.localeCompare(a.deadLetteredAt));
  }

  async processQueued(projectId: string, fetchImpl: typeof fetch, secrets: Record<string, string> = {}, now = new Date()): Promise<DurableOutboundDeliveryRecord[]> {
    const subscriptions = await this.listSubscriptions(projectId);
    const byId = new Map(subscriptions.map((subscription) => [subscription.id, subscription]));
    const rows = await this.store.list<DurableOutboundDeliveryRecord>(`outbound-delivery:${projectId}:`);
    const processed: DurableOutboundDeliveryRecord[] = [];
    for (const row of rows.map((item) => ({ key: item.key, value: this.normalizeDelivery(item.value) })).filter((item) => item.value.status === "queued" && (!item.value.notBefore || new Date(item.value.notBefore) <= now))) {
      const delivery = row.value;
      const subscription = byId.get(delivery.subscriptionId);
      if (!subscription || !subscription.enabled) continue;
      const body = JSON.stringify({ eventType: delivery.eventType, deliveryId: delivery.id, payload: delivery.payload, secrets_exposed: false });
      const headers: Record<string, string> = { "content-type": "application/json", ...subscription.headers };
      if (subscription.secretRef && secrets[subscription.secretRef]) headers["x-skyeapi-signature"] = `sha256=${await hmacSha256Hex(secrets[subscription.secretRef], body)}`;
      try {
        const response = await fetchImpl(subscription.url, { method: "POST", headers, body });
        const next = response.ok ? { ...delivery, status: "delivered" as const, attempts: delivery.attempts + 1, updatedAt: new Date().toISOString(), responseStatus: response.status, lastError: undefined } : await this.rescheduleOrDeadLetter(row.key, delivery, `HTTP ${response.status}`, response.status);
        if (response.ok) await this.store.put(row.key, next);
        processed.push(next);
      } catch (error) {
        processed.push(await this.rescheduleOrDeadLetter(row.key, delivery, error instanceof Error ? error.message : String(error)));
      }
    }
    return processed;
  }

  private async rescheduleOrDeadLetter(key: string, delivery: DurableOutboundDeliveryRecord, error: string, responseStatus?: number): Promise<DurableOutboundDeliveryRecord> {
    const attempts = delivery.attempts + 1;
    const now = new Date();
    if (attempts < delivery.maxAttempts) {
      const delay = computeRetryDelayMs(attempts, delivery.retryPolicy);
      const nextAttemptAt = new Date(now.getTime() + delay).toISOString();
      const queued: DurableOutboundDeliveryRecord = { ...delivery, status: "queued", attempts, responseStatus, lastError: error, updatedAt: now.toISOString(), notBefore: nextAttemptAt, nextAttemptAt };
      await this.store.put(key, queued);
      return queued;
    }
    const dead: DurableOutboundDeliveryRecord = { ...delivery, status: "dead_lettered", attempts, responseStatus, lastError: error, updatedAt: now.toISOString(), deadLetteredAt: now.toISOString() };
    await this.store.put(key, dead);
    const deadLetter: DeadLetterOutboundRecord = { version: "skyeapi.dead-letter-outbound.v1", id: createProofId("dlo"), projectId: delivery.projectId, deliveryId: delivery.id, subscriptionId: delivery.subscriptionId, eventType: delivery.eventType, deadLetteredAt: now.toISOString(), attempts, maxAttempts: delivery.maxAttempts, lastError: error, secrets_exposed: false };
    await this.store.put(`dead-letter-outbound:${delivery.projectId}:${deadLetter.deadLetteredAt}:${deadLetter.id}`, deadLetter);
    return dead;
  }

  private normalizeDelivery(record: DurableOutboundDeliveryRecord): DurableOutboundDeliveryRecord {
    return { ...record, maxAttempts: record.maxAttempts ?? 3, retryPolicy: record.retryPolicy ?? DEFAULT_RETRY_POLICY };
  }
}

export function sanitizeOutboundHeaders(headers: Record<string, string>): Record<string, string> {
  const cleaned: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase();
    if (["authorization", "cookie", "set-cookie", "x-api-key"].includes(lower)) continue;
    if (!/^[A-Za-z0-9-]{1,80}$/.test(key)) continue;
    cleaned[key] = String(value).slice(0, 500);
  }
  return cleaned;
}

export interface ProviderPackRegistryRecord {
  version: "skyeapi.provider-pack-registry.v1";
  id: string;
  provider: string;
  versionTag: string;
  pack: unknown;
  certification: ProviderPackCertificationReport;
  checksum: string;
  status: "review" | "certified" | "rejected";
  createdAt: string;
  updatedAt: string;
  secrets_exposed: false;
}

export interface ProviderPackInstallReceipt {
  version: "skyeapi.provider-pack-install.v1";
  id: string;
  projectId: string;
  provider: string;
  versionTag: string;
  registryId: string;
  installedAt: string;
  enabled: boolean;
  secrets_exposed: false;
}

export class ProviderPackRegistry {
  constructor(private readonly store: OpsStore) {}

  async publish(input: { pack: unknown; versionTag?: string; status?: "review" | "certified" | "rejected" }): Promise<ProviderPackRegistryRecord> {
    const certification = certifyProviderPackDefinition(input.pack);
    const provider = certification.provider;
    const versionTag = input.versionTag ?? "0.1.0";
    const now = new Date().toISOString();
    const status = input.status ?? (certification.ok ? "certified" : "rejected");
    const checksum = await sha256Text(JSON.stringify(input.pack));
    const record: ProviderPackRegistryRecord = { version: "skyeapi.provider-pack-registry.v1", id: createProofId("pack"), provider, versionTag, pack: input.pack, certification, checksum, status, createdAt: now, updatedAt: now, secrets_exposed: false };
    await this.store.put(`provider-pack-registry:${provider}:${versionTag}:${record.id}`, record);
    return record;
  }

  async list(): Promise<ProviderPackRegistryRecord[]> {
    return (await this.store.list<ProviderPackRegistryRecord>("provider-pack-registry:")).map((row) => row.value).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async install(projectId: string, registryId: string, enabled = true): Promise<ProviderPackInstallReceipt | null> {
    const record = (await this.list()).find((item) => item.id === registryId);
    if (!record || record.status !== "certified") return null;
    const receipt: ProviderPackInstallReceipt = { version: "skyeapi.provider-pack-install.v1", id: createProofId("install"), projectId, provider: record.provider, versionTag: record.versionTag, registryId: record.id, installedAt: new Date().toISOString(), enabled, secrets_exposed: false };
    await this.store.put(`provider-pack-install:${projectId}:${record.provider}:${receipt.id}`, receipt);
    return receipt;
  }

  async installations(projectId: string): Promise<ProviderPackInstallReceipt[]> {
    return (await this.store.list<ProviderPackInstallReceipt>(`provider-pack-install:${projectId}:`)).map((row) => row.value).sort((a, b) => b.installedAt.localeCompare(a.installedAt));
  }
}

export interface BillingUsageRecord {
  version: "skyeapi.billing-usage.v1";
  id: string;
  projectId: string;
  window: string;
  capability: CapabilityName;
  count: number;
  billableUnits: number;
  unitPriceCents: number;
  estimatedCents: number;
  createdAt: string;
  source: "usage-counter" | "manual";
  secrets_exposed: false;
}

export const DEFAULT_CAPABILITY_PRICING_CENTS: Record<string, number> = {
  "email.send": 1,
  "sms.send": 8,
  "db.query": 1,
  "db.inspect_schema": 1,
  "ai.generate_text": 5,
  "billing.create_checkout": 2,
  "storage.upload": 2,
  "workflow.run": 3,
  "providers.health": 0,
  "manifest.read": 0
};

export function buildBillingUsageRecords(samples: UsageSample[], pricing: Record<string, number> = DEFAULT_CAPABILITY_PRICING_CENTS): BillingUsageRecord[] {
  const now = new Date().toISOString();
  return samples.map((sample) => {
    const unitPriceCents = pricing[sample.capability] ?? 0;
    return { version: "skyeapi.billing-usage.v1", id: createProofId("usage"), projectId: sample.projectId, window: sample.window, capability: sample.capability, count: sample.count, billableUnits: sample.count, unitPriceCents, estimatedCents: unitPriceCents * sample.count, createdAt: now, source: "usage-counter", secrets_exposed: false };
  });
}

export function summarizeBillingUsage(records: BillingUsageRecord[]): { totalEstimatedCents: number; byCapability: Array<{ capability: CapabilityName; count: number; estimatedCents: number }> } {
  const by = new Map<CapabilityName, { capability: CapabilityName; count: number; estimatedCents: number }>();
  for (const record of records) {
    const current = by.get(record.capability) ?? { capability: record.capability, count: 0, estimatedCents: 0 };
    current.count += record.count;
    current.estimatedCents += record.estimatedCents;
    by.set(record.capability, current);
  }
  return { totalEstimatedCents: records.reduce((sum, record) => sum + record.estimatedCents, 0), byCapability: [...by.values()].sort((a, b) => b.estimatedCents - a.estimatedCents) };
}

async function sha256Text(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export interface OpsReadinessReport {
  version: "skyeapi.ops-readiness.v1";
  generatedAt: string;
  ok: boolean;
  checks: Array<{ code: string; ok: boolean; message: string }>;
  secrets_exposed: false;
}

export function runOpsReadiness(input: { hasJobRoutes?: boolean; hasOutboundRoutes?: boolean; hasDoctorRoute?: boolean; hasAnomalyRoute?: boolean; hasProviderPackCertification?: boolean }): OpsReadinessReport {
  const checks = [
    { code: "job_routes", ok: Boolean(input.hasJobRoutes), message: "Async job routes are exposed." },
    { code: "outbound_routes", ok: Boolean(input.hasOutboundRoutes), message: "Outbound webhook subscription/delivery routes are exposed." },
    { code: "doctor_route", ok: Boolean(input.hasDoctorRoute), message: "Developer doctor route is exposed." },
    { code: "anomaly_route", ok: Boolean(input.hasAnomalyRoute), message: "Usage anomaly route is exposed." },
    { code: "provider_certification", ok: Boolean(input.hasProviderPackCertification), message: "Provider pack certification is available." }
  ];
  return { version: "skyeapi.ops-readiness.v1", generatedAt: new Date().toISOString(), ok: checks.every((check) => check.ok), checks, secrets_exposed: false };
}


export interface JobLeaseRecord {
  version: "skyeapi.job-lease.v1";
  id: string;
  token: string;
  projectId: string;
  jobId: string;
  claimedAt: string;
  expiresAt: string;
  status: "active" | "completed" | "released" | "expired";
  actor?: { id?: string; role?: string };
  secrets_exposed: false;
}

export interface JobLeaseClaim {
  ok: boolean;
  lease?: JobLeaseRecord;
  job?: DurableAsyncJobRecord;
  message?: string;
  secrets_exposed: false;
}

export async function claimDurableJobLease(store: OpsStore, input: { projectId: string; leaseMs?: number; actor?: { id?: string; role?: string }; now?: Date }): Promise<JobLeaseClaim> {
  const now = input.now ?? new Date();
  const leaseMs = Math.max(5_000, input.leaseMs ?? 5 * 60_000);
  const rows = await store.list<DurableAsyncJobRecord>(`job:${input.projectId}:`);
  const ready = rows
    .map((row) => ({ key: row.key, value: { ...row.value, retryPolicy: row.value.retryPolicy ?? DEFAULT_RETRY_POLICY, fingerprint: row.value.fingerprint ?? "legacy-job-without-fingerprint" } }))
    .filter((row) => row.value.status === "queued")
    .filter((row) => !row.value.notBefore || new Date(row.value.notBefore) <= now)
    .filter((row) => !row.value.lockedUntil || new Date(row.value.lockedUntil) <= now)
    .sort((a, b) => a.value.queuedAt.localeCompare(b.value.queuedAt));
  const row = ready[0];
  if (!row) return { ok: true, message: "No queued job ready for lease.", secrets_exposed: false };
  const token = createProofId("lease_token");
  const lease: JobLeaseRecord = {
    version: "skyeapi.job-lease.v1",
    id: createProofId("lease"),
    token,
    projectId: input.projectId,
    jobId: row.value.id,
    claimedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + leaseMs).toISOString(),
    status: "active",
    actor: input.actor,
    secrets_exposed: false
  };
  const running: DurableAsyncJobRecord = {
    ...row.value,
    status: "running",
    attempts: row.value.attempts + 1,
    updatedAt: now.toISOString(),
    lockedUntil: lease.expiresAt,
    lastError: undefined
  };
  await store.put(row.key, running);
  await store.put(`job-lease:${input.projectId}:${lease.id}`, lease);
  return { ok: true, lease, job: running, secrets_exposed: false };
}

export async function completeDurableJobLease(store: OpsStore, input: { projectId: string; jobId: string; leaseToken: string; result: CapabilityCallResult; now?: Date }): Promise<{ ok: boolean; job?: DurableAsyncJobRecord; error?: string; secrets_exposed: false }> {
  const now = input.now ?? new Date();
  const leaseRows = await store.list<JobLeaseRecord>(`job-lease:${input.projectId}:`);
  const leaseRow = leaseRows.find((row) => row.value.jobId === input.jobId && row.value.token === input.leaseToken && row.value.status === "active");
  if (!leaseRow) return { ok: false, error: "Active lease not found for job/token.", secrets_exposed: false };
  if (new Date(leaseRow.value.expiresAt) < now) {
    await store.put(leaseRow.key, { ...leaseRow.value, status: "expired", secrets_exposed: false });
    return { ok: false, error: "Lease expired before completion.", secrets_exposed: false };
  }
  const jobRows = await store.list<DurableAsyncJobRecord>(`job:${input.projectId}:`);
  const jobRow = jobRows.find((row) => row.value.id === input.jobId);
  if (!jobRow) return { ok: false, error: "Job not found.", secrets_exposed: false };
  const next: DurableAsyncJobRecord = {
    ...jobRow.value,
    status: input.result.ok ? "succeeded" : "failed",
    result: input.result,
    lastError: input.result.error,
    updatedAt: now.toISOString(),
    lockedUntil: undefined,
    nextAttemptAt: undefined,
    secrets_exposed: false
  };
  await store.put(jobRow.key, next);
  await store.put(leaseRow.key, { ...leaseRow.value, status: "completed", secrets_exposed: false });
  return { ok: true, job: next, secrets_exposed: false };
}

export interface ProviderPackDependencySpec {
  provider: string;
  versionTag?: string;
  optional?: boolean;
}

export interface ProviderPackDependencyReport {
  version: "skyeapi.provider-pack-dependency-report.v1";
  generatedAt: string;
  ok: boolean;
  provider: string;
  dependencies: ProviderPackDependencySpec[];
  findings: Array<{ severity: "pass" | "warning" | "error"; code: string; message: string }>;
  secrets_exposed: false;
}

export function validateProviderPackDependencies(pack: unknown, registryRecords: ProviderPackRegistryRecord[] = []): ProviderPackDependencyReport {
  const body = (pack ?? {}) as Record<string, unknown>;
  const provider = String(body.provider ?? body.id ?? "unknown");
  const dependencies = Array.isArray(body.dependencies) ? body.dependencies as ProviderPackDependencySpec[] : [];
  const findings: ProviderPackDependencyReport["findings"] = [];
  for (const dep of dependencies) {
    if (!dep || !/^[a-z0-9][a-z0-9_.-]{1,60}$/.test(String(dep.provider))) {
      findings.push({ severity: "error", code: "bad_dependency_provider", message: "Dependency provider ids must use lowercase provider-pack ids." });
      continue;
    }
    const match = registryRecords.find((record) => record.provider === dep.provider && record.status === "certified" && (!dep.versionTag || record.versionTag === dep.versionTag));
    if (!match && dep.optional) findings.push({ severity: "warning", code: "optional_dependency_missing", message: `Optional dependency ${dep.provider}${dep.versionTag ? `@${dep.versionTag}` : ""} is not installed/certified.` });
    if (!match && !dep.optional) findings.push({ severity: "error", code: "required_dependency_missing", message: `Required dependency ${dep.provider}${dep.versionTag ? `@${dep.versionTag}` : ""} is not installed/certified.` });
    if (match) findings.push({ severity: "pass", code: "dependency_satisfied", message: `Dependency ${dep.provider}@${match.versionTag} is certified.` });
  }
  return { version: "skyeapi.provider-pack-dependency-report.v1", generatedAt: new Date().toISOString(), ok: !findings.some((finding) => finding.severity === "error"), provider, dependencies, findings, secrets_exposed: false };
}

export interface SignedProviderPackManifest {
  version: "skyeapi.provider-pack-signed-manifest.v1";
  provider: string;
  versionTag: string;
  checksum: string;
  signer: string;
  signedAt: string;
  signature: string;
  dependencies: ProviderPackDependencySpec[];
  certification: ProviderPackCertificationReport;
  secrets_exposed: false;
}

export async function createSignedProviderPackManifest(input: { pack: unknown; versionTag?: string; signer: string; signingSecret: string }): Promise<SignedProviderPackManifest> {
  if (!input.signingSecret || input.signingSecret.length < 16) throw new Error("signingSecret must be at least 16 characters for local signing proof.");
  const pack = (input.pack ?? {}) as Record<string, unknown>;
  const provider = String(pack.provider ?? pack.id ?? "unknown");
  const versionTag = input.versionTag ?? String(pack.versionTag ?? "0.1.0");
  const checksum = await sha256Text(JSON.stringify(input.pack));
  const certification = certifyProviderPackDefinition(input.pack);
  const dependencies = Array.isArray(pack.dependencies) ? pack.dependencies as ProviderPackDependencySpec[] : [];
  const signedAt = new Date().toISOString();
  const signaturePayload = JSON.stringify({ provider, versionTag, checksum, signer: input.signer, signedAt, dependencies });
  const signature = `sha256=${await hmacSha256Hex(input.signingSecret, signaturePayload)}`;
  return { version: "skyeapi.provider-pack-signed-manifest.v1", provider, versionTag, checksum, signer: input.signer, signedAt, signature, dependencies, certification, secrets_exposed: false };
}

export async function verifySignedProviderPackManifest(input: { manifest: SignedProviderPackManifest; pack: unknown; signingSecret: string }): Promise<{ ok: boolean; findings: Array<{ severity: "pass" | "error"; code: string; message: string }>; secrets_exposed: false }> {
  const findings: Array<{ severity: "pass" | "error"; code: string; message: string }> = [];
  const checksum = await sha256Text(JSON.stringify(input.pack));
  if (checksum !== input.manifest.checksum) findings.push({ severity: "error", code: "checksum_mismatch", message: "Signed manifest checksum does not match pack body." });
  const payload = JSON.stringify({ provider: input.manifest.provider, versionTag: input.manifest.versionTag, checksum: input.manifest.checksum, signer: input.manifest.signer, signedAt: input.manifest.signedAt, dependencies: input.manifest.dependencies });
  const expected = `sha256=${await hmacSha256Hex(input.signingSecret, payload)}`;
  if (expected !== input.manifest.signature) findings.push({ severity: "error", code: "signature_mismatch", message: "Provider-pack signature verification failed." });
  if (!findings.length) findings.push({ severity: "pass", code: "signature_verified", message: "Provider-pack signed manifest verified against the supplied pack body." });
  return { ok: !findings.some((finding) => finding.severity === "error"), findings, secrets_exposed: false };
}

export function exportBillingUsageCsv(records: BillingUsageRecord[]): string {
  const headers = ["projectId", "window", "capability", "count", "billableUnits", "unitPriceCents", "estimatedCents", "source", "createdAt"];
  const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  return [headers.join(","), ...records.map((record) => headers.map((header) => escape((record as unknown as Record<string, unknown>)[header])).join(","))].join("\n");
}

export function exportBillingUsageJsonl(records: BillingUsageRecord[]): string {
  return records.map((record) => JSON.stringify({ ...record, secrets_exposed: false })).join("\n");
}

export interface NoTheaterGateReport {
  version: "skyeapi.no-theater-gate.v1";
  generatedAt: string;
  ok: boolean;
  findings: Array<{ file: string; code: string; message: string }>;
  secrets_exposed: false;
}

export function runNoTheaterGate(files: Array<{ path: string; content: string }>): NoTheaterGateReport {
  const patterns = [
    { code: "production_claim", re: /production[- ]ready|enterprise[- ]ready|fully production|battle[- ]tested/i, message: "Do not claim production readiness without live deployment and provider proof." },
    { code: "live_provider_claim", re: /live provider proof passed|real provider delivery verified|stripe subscription collection verified/i, message: "Do not claim live provider proof unless a live proof artifact exists." },
    { code: "unfinished_copy", re: /lorem ipsum|coming soon|todo:/i, message: "Unfinished/theater copy is not allowed in public or proof-facing files." }
  ];
  const findings: NoTheaterGateReport["findings"] = [];
  for (const file of files) {
    for (const pattern of patterns) {
      if (pattern.re.test(file.content)) findings.push({ file: file.path, code: pattern.code, message: pattern.message });
    }
  }
  return { version: "skyeapi.no-theater-gate.v1", generatedAt: new Date().toISOString(), ok: findings.length === 0, findings, secrets_exposed: false };
}

export interface ConsoleContractSmokeReport {
  version: "skyeapi.console-contract-smoke.v1";
  generatedAt: string;
  ok: boolean;
  findings: Array<{ severity: "pass" | "error"; code: string; message: string }>;
  secrets_exposed: false;
}

export function runConsoleContractSmoke(input: { html: string; script: string; requiredElementIds: string[]; requiredEndpoints: string[] }): ConsoleContractSmokeReport {
  const findings: ConsoleContractSmokeReport["findings"] = [];
  for (const id of input.requiredElementIds) {
    const re = new RegExp(`id=["']${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`);
    findings.push(re.test(input.html) ? { severity: "pass", code: "element_present", message: `${id} exists in console HTML.` } : { severity: "error", code: "missing_element", message: `${id} is missing from console HTML.` });
  }
  for (const endpoint of input.requiredEndpoints) {
    findings.push(input.script.includes(endpoint) ? { severity: "pass", code: "endpoint_wired", message: `${endpoint} is referenced by console script.` } : { severity: "error", code: "endpoint_missing", message: `${endpoint} is not referenced by console script.` });
  }
  return { version: "skyeapi.console-contract-smoke.v1", generatedAt: new Date().toISOString(), ok: !findings.some((finding) => finding.severity === "error"), findings, secrets_exposed: false };
}


export interface ProviderPackSourceInstallReceipt {
  version: "skyeapi.provider-pack-source-install.v1";
  id: string;
  projectId: string;
  provider: string;
  versionTag: string;
  sourceType: "inline" | "directory" | "zip" | "git";
  sourceUri?: string;
  checksum: string;
  certification: ProviderPackCertificationReport;
  installable: boolean;
  createdAt: string;
  notes: string[];
  secrets_exposed: false;
}

export async function createProviderPackSourceInstallReceipt(input: { projectId: string; pack: unknown; sourceType?: "inline" | "directory" | "zip" | "git"; sourceUri?: string; versionTag?: string }): Promise<ProviderPackSourceInstallReceipt> {
  const certification = certifyProviderPackDefinition(input.pack);
  const pack = (input.pack ?? {}) as Record<string, unknown>;
  const sourceType = input.sourceType ?? "inline";
  const versionTag = input.versionTag ?? String(pack.versionTag ?? "0.1.0");
  const checksum = await sha256Text(JSON.stringify(input.pack));
  const notes: string[] = [];
  if ((sourceType === "zip" || sourceType === "git") && !input.sourceUri) notes.push(`${sourceType} source installs should include sourceUri for audit receipts.`);
  if (sourceType === "git" && input.sourceUri && !/^https:\/\/[^\s]+\.git$|^git@[^\s]+:[^\s]+\.git$/i.test(input.sourceUri)) notes.push("Git sourceUri should be an https .git URL or git@ SSH URL.");
  if (sourceType === "zip" && input.sourceUri && !/\.zip($|[?#])/i.test(input.sourceUri)) notes.push("Zip sourceUri should point to a .zip artifact.");
  return {
    version: "skyeapi.provider-pack-source-install.v1",
    id: createProofId("packsrc"),
    projectId: input.projectId,
    provider: certification.provider,
    versionTag,
    sourceType,
    sourceUri: input.sourceUri,
    checksum,
    certification,
    installable: certification.ok,
    createdAt: new Date().toISOString(),
    notes,
    secrets_exposed: false
  };
}

export interface ProviderPackCertificationReceipt {
  version: "skyeapi.provider-pack-certification-receipt.v1";
  id: string;
  provider: string;
  versionTag: string;
  checksum: string;
  certified: boolean;
  report: ProviderPackCertificationReport;
  signedManifest?: SignedProviderPackManifest;
  createdAt: string;
  secrets_exposed: false;
}

export async function createProviderPackCertificationReceipt(input: { pack: unknown; versionTag?: string; signer?: string; signingSecret?: string }): Promise<ProviderPackCertificationReceipt> {
  const report = certifyProviderPackDefinition(input.pack);
  const pack = (input.pack ?? {}) as Record<string, unknown>;
  const versionTag = input.versionTag ?? String(pack.versionTag ?? "0.1.0");
  const checksum = await sha256Text(JSON.stringify(input.pack));
  const signedManifest = input.signer && input.signingSecret ? await createSignedProviderPackManifest({ pack: input.pack, versionTag, signer: input.signer, signingSecret: input.signingSecret }) : undefined;
  return { version: "skyeapi.provider-pack-certification-receipt.v1", id: createProofId("cert"), provider: report.provider, versionTag, checksum, certified: report.ok, report, signedManifest, createdAt: new Date().toISOString(), secrets_exposed: false };
}

export interface BillingInvoiceLineItem {
  capability: CapabilityName;
  count: number;
  billableUnits: number;
  unitPriceCents: number;
  estimatedCents: number;
}

export interface BillingInvoiceDraft {
  version: "skyeapi.billing-invoice-draft.v1";
  id: string;
  projectId: string;
  customerName?: string;
  customerEmail?: string;
  window: string;
  status: "draft";
  currency: "usd";
  lineItems: BillingInvoiceLineItem[];
  subtotalCents: number;
  totalCents: number;
  generatedAt: string;
  dueAt: string;
  note: string;
  secrets_exposed: false;
}

export function createBillingInvoiceDraft(input: { projectId: string; records: BillingUsageRecord[]; customerName?: string; customerEmail?: string; dueDays?: number; window?: string }): BillingInvoiceDraft {
  const generated = new Date();
  const due = new Date(generated.getTime() + Math.max(1, input.dueDays ?? 14) * 24 * 60 * 60 * 1000);
  const by = new Map<CapabilityName, BillingInvoiceLineItem>();
  for (const record of input.records) {
    const current = by.get(record.capability) ?? { capability: record.capability, count: 0, billableUnits: 0, unitPriceCents: record.unitPriceCents, estimatedCents: 0 };
    current.count += record.count;
    current.billableUnits += record.billableUnits;
    current.estimatedCents += record.estimatedCents;
    by.set(record.capability, current);
  }
  const lineItems = [...by.values()].sort((a, b) => b.estimatedCents - a.estimatedCents);
  const subtotalCents = lineItems.reduce((sum, item) => sum + item.estimatedCents, 0);
  return {
    version: "skyeapi.billing-invoice-draft.v1",
    id: createProofId("invoice"),
    projectId: input.projectId,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    window: input.window ?? input.records[0]?.window ?? "unscoped",
    status: "draft",
    currency: "usd",
    lineItems,
    subtotalCents,
    totalCents: subtotalCents,
    generatedAt: generated.toISOString(),
    dueAt: due.toISOString(),
    note: "Draft invoice object from SkyeAPI metered usage. This is not Stripe subscription collection or payment capture.",
    secrets_exposed: false
  };
}

export function exportBillingInvoiceCsv(invoice: BillingInvoiceDraft): string {
  const headers = ["invoiceId", "projectId", "window", "capability", "count", "billableUnits", "unitPriceCents", "estimatedCents"];
  const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const rows = invoice.lineItems.map((item) => [invoice.id, invoice.projectId, invoice.window, item.capability, item.count, item.billableUnits, item.unitPriceCents, item.estimatedCents].map(escape).join(","));
  return [headers.join(","), ...rows].join("\n");
}

export function exportBillingInvoiceJson(invoice: BillingInvoiceDraft): string {
  return JSON.stringify(invoice, null, 2);
}

export interface ConsoleE2EContractReport {
  version: "skyeapi.console-e2e-contract.v1";
  generatedAt: string;
  ok: boolean;
  findings: Array<{ severity: "pass" | "warning" | "error"; code: string; message: string }>;
  secrets_exposed: false;
}

export function runConsoleE2EContract(input: { spec: string; html: string; script: string; requiredSelectors: string[]; requiredFlows: string[] }): ConsoleE2EContractReport {
  const findings: ConsoleE2EContractReport["findings"] = [];
  if (!/@playwright\/test/.test(input.spec)) findings.push({ severity: "error", code: "missing_playwright_import", message: "Console E2E spec must import @playwright/test." });
  for (const selector of input.requiredSelectors) {
    const id = selector.replace(/^#/, "");
    findings.push(input.html.includes(`id="${id}"`) || input.html.includes(`id='${id}'`) ? { severity: "pass", code: "selector_present", message: `${selector} exists in console HTML.` } : { severity: "error", code: "selector_missing", message: `${selector} is missing from console HTML.` });
    findings.push(input.spec.includes(selector) ? { severity: "pass", code: "selector_tested", message: `${selector} is referenced by Playwright spec.` } : { severity: "warning", code: "selector_not_tested", message: `${selector} is not referenced by Playwright spec.` });
  }
  for (const flow of input.requiredFlows) {
    findings.push(input.spec.includes(flow) || input.script.includes(flow) ? { severity: "pass", code: "flow_wired", message: `${flow} is wired for console contract testing.` } : { severity: "error", code: "flow_missing", message: `${flow} is missing from console code/spec.` });
  }
  return { version: "skyeapi.console-e2e-contract.v1", generatedAt: new Date().toISOString(), ok: !findings.some((finding) => finding.severity === "error"), findings, secrets_exposed: false };
}


// v0.13.0 product-depth primitives: real source loading, sandbox checks, invoice persistence, subscriptions, workspace hooks, and audit bundles.
export type ProviderPackLoadSourceType = "inline" | "directory" | "zip" | "git";

export interface ProviderPackLoadedSource {
  version: "skyeapi.provider-pack-loaded-source.v1";
  id: string;
  sourceType: ProviderPackLoadSourceType;
  sourceUri?: string;
  provider: string;
  versionTag: string;
  checksum: string;
  pack: unknown;
  certification: ProviderPackCertificationReport;
  loadedAt: string;
  loader: "inline" | "filesystem" | "zip-unzip" | "git-clone";
  notes: string[];
  secrets_exposed: false;
}

const dynamicImportAny = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<any>;

function normalizeLocalSourceUri(sourceUri: string): string {
  return sourceUri.startsWith("file://") ? new URL(sourceUri).pathname : sourceUri;
}

async function execFileText(command: string, args: string[], options: Record<string, unknown> = {}): Promise<string> {
  const childProcess = await dynamicImportAny("node:child_process");
  return await new Promise<string>((resolve, reject) => {
    const child = childProcess.execFile(command, args, { ...options, maxBuffer: 1024 * 1024 * 10 }, (error: unknown, stdout: string, stderr: string) => {
      if (error) reject(new Error(`${command} failed: ${String((error as { message?: string })?.message ?? error)} ${stderr || ""}`.trim()));
      else resolve(stdout);
    });
    child?.stdin?.end?.();
  });
}

export async function loadProviderPackFromSource(input: { sourceType: ProviderPackLoadSourceType; sourceUri?: string; inlinePack?: unknown; versionTag?: string; workingDir?: string }): Promise<ProviderPackLoadedSource> {
  const notes: string[] = [];
  let pack: unknown;
  let loader: ProviderPackLoadedSource["loader"] = "inline";

  if (input.sourceType === "inline") {
    pack = input.inlinePack;
    loader = "inline";
    if (!pack) throw new Error("inlinePack is required for inline provider-pack source loading.");
  }

  if (input.sourceType === "directory") {
    if (!input.sourceUri) throw new Error("sourceUri directory path is required.");
    const fs = await dynamicImportAny("node:fs/promises");
    const path = await dynamicImportAny("node:path");
    const dir = normalizeLocalSourceUri(input.sourceUri);
    const packPath = path.join(dir, "pack.json");
    pack = JSON.parse(await fs.readFile(packPath, "utf8"));
    loader = "filesystem";
    notes.push(`Loaded pack.json from ${packPath}.`);
  }

  if (input.sourceType === "zip") {
    if (!input.sourceUri) throw new Error("sourceUri .zip path is required.");
    const zipPath = normalizeLocalSourceUri(input.sourceUri);
    const stdout = await execFileText("unzip", ["-p", zipPath, "pack.json"], input.workingDir ? { cwd: input.workingDir } : {});
    pack = JSON.parse(stdout);
    loader = "zip-unzip";
    notes.push("Read pack.json from zip using system unzip. This is real extraction, not a receipt-only placeholder.");
  }

  if (input.sourceType === "git") {
    if (!input.sourceUri) throw new Error("sourceUri git URL/path is required.");
    const fs = await dynamicImportAny("node:fs/promises");
    const os = await dynamicImportAny("node:os");
    const path = await dynamicImportAny("node:path");
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "skyeapi-pack-git-"));
    await execFileText("git", ["clone", "--depth", "1", input.sourceUri, tempRoot]);
    pack = JSON.parse(await fs.readFile(path.join(tempRoot, "pack.json"), "utf8"));
    loader = "git-clone";
    notes.push(`Cloned source into ${tempRoot} and read pack.json.`);
  }

  const certification = certifyProviderPackDefinition(pack);
  const body = (pack ?? {}) as Record<string, unknown>;
  const versionTag = input.versionTag ?? String(body.versionTag ?? "0.1.0");
  const checksum = await sha256Text(JSON.stringify(pack));
  return {
    version: "skyeapi.provider-pack-loaded-source.v1",
    id: createProofId("packload"),
    sourceType: input.sourceType,
    sourceUri: input.sourceUri,
    provider: certification.provider,
    versionTag,
    checksum,
    pack,
    certification,
    loadedAt: new Date().toISOString(),
    loader,
    notes,
    secrets_exposed: false
  };
}

export interface ProviderPackSandboxReport {
  version: "skyeapi.provider-pack-sandbox.v1";
  id: string;
  provider: string;
  ok: boolean;
  executedUntrustedCode: false;
  findings: Array<{ severity: "pass" | "warning" | "error"; code: string; message: string }>;
  dryRunReceipts: Array<{ capability: string; ok: boolean; proofId: string; dryRun: true; secrets_exposed: false }>;
  createdAt: string;
  secrets_exposed: false;
}

export async function runProviderPackSandbox(input: { pack: unknown; adapterSource?: string; sampleInputs?: Record<string, unknown> }): Promise<ProviderPackSandboxReport> {
  const certification = certifyProviderPackDefinition(input.pack);
  const body = (input.pack ?? {}) as Record<string, unknown>;
  const capabilities = Array.isArray(body.capabilities) ? body.capabilities.map(String) : [];
  const findings: ProviderPackSandboxReport["findings"] = [];
  const source = input.adapterSource ?? "";
  const blockedPatterns = [/process\.env/, /child_process/, /\beval\s*\(/, /new Function\s*\(/, /fetch\s*\(/, /XMLHttpRequest/, /WebSocket/];
  if (certification.ok) findings.push({ severity: "pass", code: "certification_passed", message: "Provider-pack metadata certification passed before sandbox dry run." });
  else findings.push({ severity: "error", code: "certification_failed", message: "Provider-pack metadata certification failed before sandbox dry run." });
  if (source) {
    for (const pattern of blockedPatterns) {
      if (pattern.test(source)) findings.push({ severity: "error", code: "unsafe_adapter_source", message: `Adapter source contains blocked pattern ${pattern}.` });
    }
    if (!/execute\s*[:=]|async\s+function\s+execute|export\s+.*execute/.test(source)) findings.push({ severity: "warning", code: "execute_not_detected", message: "Adapter source does not visibly expose an execute handler." });
  }
  const dryRunReceipts = capabilities.map((capability) => ({ capability, ok: true, proofId: createProofId("sandbox"), dryRun: true as const, secrets_exposed: false as const }));
  if (!dryRunReceipts.length) findings.push({ severity: "error", code: "no_capabilities", message: "Provider pack exposes no capabilities to sandbox." });
  if (dryRunReceipts.length) findings.push({ severity: "pass", code: "dry_run_receipts_created", message: `${dryRunReceipts.length} sandbox dry-run receipt(s) generated without executing untrusted code.` });
  return { version: "skyeapi.provider-pack-sandbox.v1", id: createProofId("packsandbox"), provider: certification.provider, ok: !findings.some((f) => f.severity === "error"), executedUntrustedCode: false, findings, dryRunReceipts, createdAt: new Date().toISOString(), secrets_exposed: false };
}

export interface BillingInvoiceRecord extends Omit<BillingInvoiceDraft, "status"> {
  status: "draft" | "issued" | "void" | "paid";
  createdAt: string;
  updatedAt: string;
  history: Array<{ at: string; status: BillingInvoiceRecord["status"]; note?: string; actorId?: string }>;
}

export async function persistBillingInvoice(store: OpsStore, invoice: BillingInvoiceDraft, input: { actorId?: string; note?: string } = {}): Promise<BillingInvoiceRecord> {
  const now = new Date().toISOString();
  const record: BillingInvoiceRecord = { ...invoice, status: "draft", createdAt: now, updatedAt: now, history: [{ at: now, status: "draft", note: input.note ?? "Invoice draft persisted from metered usage.", actorId: input.actorId }] };
  await store.put(`invoice:${invoice.projectId}:${record.id}`, record);
  return record;
}

export async function listBillingInvoices(store: OpsStore, projectId: string): Promise<BillingInvoiceRecord[]> {
  return (await store.list<BillingInvoiceRecord>(`invoice:${projectId}:`)).map((row) => row.value).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function updateBillingInvoiceStatus(store: OpsStore, input: { projectId: string; invoiceId: string; status: BillingInvoiceRecord["status"]; actorId?: string; note?: string }): Promise<{ ok: boolean; invoice?: BillingInvoiceRecord; error?: string; secrets_exposed: false }> {
  const key = `invoice:${input.projectId}:${input.invoiceId}`;
  const existing = await store.get<BillingInvoiceRecord>(key);
  if (!existing) return { ok: false, error: "Invoice not found.", secrets_exposed: false };
  const now = new Date().toISOString();
  const invoice: BillingInvoiceRecord = { ...existing, status: input.status, updatedAt: now, history: [...existing.history, { at: now, status: input.status, actorId: input.actorId, note: input.note }] };
  await store.put(key, invoice);
  return { ok: true, invoice, secrets_exposed: false };
}

export interface PlanSubscriptionDraft {
  version: "skyeapi.plan-subscription-draft.v1";
  id: string;
  projectId: string;
  plan: string;
  status: "trialing" | "active" | "paused" | "cancelled";
  billingCycle: "monthly" | "annual";
  currency: "usd";
  basePriceCents: number;
  includedCalls: number;
  overageUnitPriceCents: number;
  customerEmail?: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  note: string;
  createdAt: string;
  secrets_exposed: false;
}

export function createPlanSubscriptionDraft(input: { projectId: string; plan: string; customerEmail?: string; billingCycle?: "monthly" | "annual"; basePriceCents?: number; includedCalls?: number; overageUnitPriceCents?: number; trialDays?: number }): PlanSubscriptionDraft {
  const start = new Date();
  const cycle = input.billingCycle ?? "monthly";
  const end = new Date(start.getTime());
  if (cycle === "annual") end.setUTCFullYear(end.getUTCFullYear() + 1);
  else end.setUTCMonth(end.getUTCMonth() + 1);
  const trialDays = input.trialDays ?? 0;
  return {
    version: "skyeapi.plan-subscription-draft.v1",
    id: createProofId("sub"),
    projectId: input.projectId,
    plan: input.plan,
    status: trialDays > 0 ? "trialing" : "active",
    billingCycle: cycle,
    currency: "usd",
    basePriceCents: input.basePriceCents ?? 0,
    includedCalls: input.includedCalls ?? 0,
    overageUnitPriceCents: input.overageUnitPriceCents ?? 1,
    customerEmail: input.customerEmail,
    currentPeriodStart: start.toISOString(),
    currentPeriodEnd: end.toISOString(),
    note: "Subscription draft object only. This is not payment capture or Stripe collection proof.",
    createdAt: start.toISOString(),
    secrets_exposed: false
  };
}


// v0.14.0 billing lifecycle, usage reconciliation, and fixture certification primitives.
export interface PlanSubscriptionLifecycleRecord extends Omit<PlanSubscriptionDraft, "version" | "status"> {
  version: "skyeapi.plan-subscription-lifecycle.v1";
  status: "trialing" | "active" | "paused" | "cancelled" | "past_due" | "resumed";
  paymentProvider?: "stripe" | "manual" | "external";
  paymentProviderCustomerId?: string;
  paymentProviderSubscriptionId?: string;
  paymentProviderPriceId?: string;
  cancelledAt?: string;
  pausedAt?: string;
  resumedAt?: string;
  failedPaymentAt?: string;
  updatedAt: string;
  history: Array<{ at: string; action: "created" | "updated" | "paused" | "resumed" | "cancelled" | "renewed" | "payment_failed"; status: string; actorId?: string; note?: string }>;
}

function nextPeriodEnd(start: Date, cycle: "monthly" | "annual"): string {
  const end = new Date(start.getTime());
  if (cycle === "annual") end.setUTCFullYear(end.getUTCFullYear() + 1);
  else end.setUTCMonth(end.getUTCMonth() + 1);
  return end.toISOString();
}

export async function persistPlanSubscription(store: OpsStore, draft: PlanSubscriptionDraft, input: { actorId?: string; note?: string; paymentProvider?: "stripe" | "manual" | "external"; paymentProviderCustomerId?: string; paymentProviderSubscriptionId?: string; paymentProviderPriceId?: string } = {}): Promise<PlanSubscriptionLifecycleRecord> {
  const now = new Date().toISOString();
  const record: PlanSubscriptionLifecycleRecord = {
    ...draft,
    version: "skyeapi.plan-subscription-lifecycle.v1",
    updatedAt: now,
    paymentProvider: input.paymentProvider,
    paymentProviderCustomerId: input.paymentProviderCustomerId,
    paymentProviderSubscriptionId: input.paymentProviderSubscriptionId,
    paymentProviderPriceId: input.paymentProviderPriceId,
    history: [{ at: now, action: "created", status: draft.status, actorId: input.actorId, note: input.note ?? "Subscription lifecycle record created. This is not payment capture proof." }]
  };
  await store.put(`subscription:${record.projectId}:${record.id}`, record);
  return record;
}

export async function updatePlanSubscriptionLifecycle(store: OpsStore, input: { projectId: string; subscriptionId: string; action: "update" | "pause" | "resume" | "cancel" | "renew" | "payment_failed"; plan?: string; status?: PlanSubscriptionLifecycleRecord["status"]; actorId?: string; note?: string; paymentProvider?: "stripe" | "manual" | "external"; paymentProviderCustomerId?: string; paymentProviderSubscriptionId?: string; paymentProviderPriceId?: string }): Promise<{ ok: boolean; subscription?: PlanSubscriptionLifecycleRecord; error?: string; secrets_exposed: false }> {
  const key = `subscription:${input.projectId}:${input.subscriptionId}`;
  const current = await store.get<PlanSubscriptionLifecycleRecord>(key);
  if (!current) return { ok: false, error: "Subscription not found.", secrets_exposed: false };
  const now = new Date();
  const patch: Partial<PlanSubscriptionLifecycleRecord> = { updatedAt: now.toISOString() };
  let action: PlanSubscriptionLifecycleRecord["history"][number]["action"] = "updated";
  if (input.action === "pause") { patch.status = "paused"; patch.pausedAt = now.toISOString(); action = "paused"; }
  if (input.action === "resume") { patch.status = "active"; patch.resumedAt = now.toISOString(); action = "resumed"; }
  if (input.action === "cancel") { patch.status = "cancelled"; patch.cancelledAt = now.toISOString(); action = "cancelled"; }
  if (input.action === "renew") { patch.status = "active"; patch.currentPeriodStart = now.toISOString(); patch.currentPeriodEnd = nextPeriodEnd(now, current.billingCycle); action = "renewed"; }
  if (input.action === "payment_failed") { patch.status = "past_due"; patch.failedPaymentAt = now.toISOString(); action = "payment_failed"; }
  if (input.action === "update") { patch.status = input.status ?? current.status; action = "updated"; }
  if (input.plan) patch.plan = input.plan;
  if (input.paymentProvider) patch.paymentProvider = input.paymentProvider;
  if (input.paymentProviderCustomerId) patch.paymentProviderCustomerId = input.paymentProviderCustomerId;
  if (input.paymentProviderSubscriptionId) patch.paymentProviderSubscriptionId = input.paymentProviderSubscriptionId;
  if (input.paymentProviderPriceId) patch.paymentProviderPriceId = input.paymentProviderPriceId;
  const subscription: PlanSubscriptionLifecycleRecord = { ...current, ...patch, history: [...current.history, { at: now.toISOString(), action, status: String(patch.status ?? current.status), actorId: input.actorId, note: input.note }] };
  await store.put(key, subscription);
  return { ok: true, subscription, secrets_exposed: false };
}

export interface InvoiceUsageReconciliation {
  version: "skyeapi.invoice-usage-reconciliation.v1";
  invoiceId: string;
  projectId: string;
  window: string;
  ok: boolean;
  expectedTotalCents: number;
  invoiceTotalCents: number;
  deltaCents: number;
  lineDiffs: Array<{ capability: CapabilityName; invoiceCount: number; expectedCount: number; invoiceCents: number; expectedCents: number; deltaCents: number }>;
  generatedAt: string;
  secrets_exposed: false;
}

export function reconcileInvoiceWithUsage(invoice: BillingInvoiceRecord | BillingInvoiceDraft, records: BillingUsageRecord[]): InvoiceUsageReconciliation {
  const expected = createBillingInvoiceDraft({ projectId: invoice.projectId, records, window: invoice.window, customerEmail: invoice.customerEmail, customerName: invoice.customerName });
  const capabilities = new Set<CapabilityName>([...invoice.lineItems.map((item) => item.capability), ...expected.lineItems.map((item) => item.capability)]);
  const lineDiffs = [...capabilities].sort().map((capability) => {
    const left = invoice.lineItems.find((item) => item.capability === capability);
    const right = expected.lineItems.find((item) => item.capability === capability);
    return { capability, invoiceCount: left?.count ?? 0, expectedCount: right?.count ?? 0, invoiceCents: left?.estimatedCents ?? 0, expectedCents: right?.estimatedCents ?? 0, deltaCents: (left?.estimatedCents ?? 0) - (right?.estimatedCents ?? 0) };
  });
  const deltaCents = invoice.totalCents - expected.totalCents;
  return { version: "skyeapi.invoice-usage-reconciliation.v1", invoiceId: invoice.id, projectId: invoice.projectId, window: invoice.window, ok: deltaCents === 0 && lineDiffs.every((line) => line.invoiceCount === line.expectedCount && line.deltaCents === 0), expectedTotalCents: expected.totalCents, invoiceTotalCents: invoice.totalCents, deltaCents, lineDiffs, generatedAt: new Date().toISOString(), secrets_exposed: false };
}

export interface ProviderFixtureCertificationResult {
  version: "skyeapi.provider-fixture-certification.v1";
  provider: string;
  capability: string;
  ok: boolean;
  mode: "fixture" | "live_optional";
  endpoint?: string;
  requestSent: boolean;
  responseStatus?: number;
  responseOk?: boolean;
  proofId: string;
  findings: Array<{ severity: "pass" | "warning" | "error"; code: string; message: string }>;
  secrets_exposed: false;
}

export async function runProviderFixtureCertification(input: { provider: string; capability: string; endpoint?: string; mode?: "fixture" | "live_optional"; fetchImpl?: typeof fetch; timeoutMs?: number }): Promise<ProviderFixtureCertificationResult> {
  const findings: ProviderFixtureCertificationResult["findings"] = [];
  const mode = input.mode ?? "fixture";
  const endpoint = input.endpoint;
  if (!endpoint) {
    findings.push({ severity: "error", code: "missing_endpoint", message: "Fixture/live certification endpoint is required." });
    return { version: "skyeapi.provider-fixture-certification.v1", provider: input.provider, capability: input.capability, ok: false, mode, endpoint, requestSent: false, proofId: createProofId("providercert"), findings, secrets_exposed: false };
  }
  if (mode === "fixture" && !/localhost|127\.0\.0\.1|fixture/i.test(endpoint)) findings.push({ severity: "warning", code: "fixture_endpoint_not_local", message: "Fixture mode should use a local/fixture endpoint." });
  if (mode === "live_optional") findings.push({ severity: "warning", code: "live_optional_not_required", message: "Live optional certification requires explicit provider credentials and is not part of default proof." });
  try {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : undefined;
    const timeout = controller ? setTimeout(() => controller.abort(), input.timeoutMs ?? 5000) : undefined;
    const response = await (input.fetchImpl ?? fetch)(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ provider: input.provider, capability: input.capability, dryRun: true, secrets_exposed: false }), signal: controller?.signal });
    if (timeout) clearTimeout(timeout);
    const responseOk = response.ok;
    findings.push(responseOk ? { severity: "pass", code: "fixture_response_ok", message: "Provider fixture endpoint returned a successful response." } : { severity: "error", code: "fixture_response_failed", message: `Provider fixture endpoint returned HTTP ${response.status}.` });
    return { version: "skyeapi.provider-fixture-certification.v1", provider: input.provider, capability: input.capability, ok: responseOk, mode, endpoint, requestSent: true, responseStatus: response.status, responseOk, proofId: createProofId("providercert"), findings, secrets_exposed: false };
  } catch (error) {
    findings.push({ severity: "error", code: "fixture_request_error", message: error instanceof Error ? error.message : String(error) });
    return { version: "skyeapi.provider-fixture-certification.v1", provider: input.provider, capability: input.capability, ok: false, mode, endpoint, requestSent: true, proofId: createProofId("providercert"), findings, secrets_exposed: false };
  }
}

export interface WorkspaceProjectBinding {
  version: "skyeapi.workspace-project-binding.v1";
  workspaceId: string;
  projectId: string;
  roles: string[];
  createdAt: string;
  secrets_exposed: false;
}

export interface WorkspaceAccessDecision {
  version: "skyeapi.workspace-access-decision.v1";
  ok: boolean;
  workspaceId: string;
  projectId: string;
  role?: string;
  capability?: CapabilityName;
  reason: string;
  secrets_exposed: false;
}

export function evaluateWorkspaceProjectAccess(input: { bindings: WorkspaceProjectBinding[]; workspaceId: string; projectId: string; role?: string; capability?: CapabilityName; roleCapabilities?: Record<string, CapabilityName[]> }): WorkspaceAccessDecision {
  const binding = input.bindings.find((item) => item.workspaceId === input.workspaceId && item.projectId === input.projectId);
  if (!binding) return { version: "skyeapi.workspace-access-decision.v1", ok: false, workspaceId: input.workspaceId, projectId: input.projectId, role: input.role, capability: input.capability, reason: "Workspace is not bound to the requested project.", secrets_exposed: false };
  if (input.role && !binding.roles.includes(input.role)) return { version: "skyeapi.workspace-access-decision.v1", ok: false, workspaceId: input.workspaceId, projectId: input.projectId, role: input.role, capability: input.capability, reason: "Role is not granted on this workspace/project binding.", secrets_exposed: false };
  if (input.capability && input.role) {
    const allowed = input.roleCapabilities?.[input.role] ?? [];
    if (!allowed.includes(input.capability) && !allowed.includes("workflow.run" as CapabilityName)) return { version: "skyeapi.workspace-access-decision.v1", ok: false, workspaceId: input.workspaceId, projectId: input.projectId, role: input.role, capability: input.capability, reason: "Role does not allow requested capability.", secrets_exposed: false };
  }
  return { version: "skyeapi.workspace-access-decision.v1", ok: true, workspaceId: input.workspaceId, projectId: input.projectId, role: input.role, capability: input.capability, reason: "Workspace binding allows this request.", secrets_exposed: false };
}

export interface AuditExportBundle {
  version: "skyeapi.audit-export-bundle.v1";
  id: string;
  projectId: string;
  generatedAt: string;
  checksum: string;
  counts: Record<string, number>;
  sections: Record<string, unknown[]>;
  redacted: true;
  secrets_exposed: false;
}

function scrubForAudit(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(scrubForAudit);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
      if (/secret|token|apiKey|authorization|password|credential|signature/i.test(key)) out[key] = "[redacted]";
      else out[key] = scrubForAudit(raw);
    }
    return out;
  }
  if (typeof value === "string" && /(sk_(live|test|proj)_[A-Za-z0-9]{12,}|Bearer\s+[A-Za-z0-9._-]{16,}|[A-Z0-9_]*SECRET[A-Z0-9_]*=)/i.test(value)) return "[redacted]";
  return value;
}

export async function createAuditExportBundle(input: { projectId: string; sections: Record<string, unknown[]> }): Promise<AuditExportBundle> {
  const safeSections: Record<string, unknown[]> = {};
  const counts: Record<string, number> = {};
  for (const [name, rows] of Object.entries(input.sections)) {
    safeSections[name] = rows.map((row) => scrubForAudit(row));
    counts[name] = rows.length;
  }
  const generatedAt = new Date().toISOString();
  const checksum = await sha256Text(JSON.stringify({ projectId: input.projectId, sections: safeSections, counts }));
  return { version: "skyeapi.audit-export-bundle.v1", id: createProofId("auditbundle"), projectId: input.projectId, generatedAt, checksum, counts, sections: safeSections, redacted: true, secrets_exposed: false };
}
