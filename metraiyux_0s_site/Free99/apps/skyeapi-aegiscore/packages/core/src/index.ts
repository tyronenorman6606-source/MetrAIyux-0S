export type ProviderName =
  | "resend"
  | "twilio"
  | "neon"
  | "openai-compatible"
  | "stripe"
  | "cloudflare-r2"
  | "unknown";

export type CapabilityName =
  | "email.send"
  | "sms.send"
  | "db.query"
  | "db.inspect_schema"
  | "ai.generate_text"
  | "billing.create_checkout"
  | "storage.upload"
  | "workflow.run"
  | "providers.health"
  | "manifest.read";

export interface WorkflowStep {
  id: string;
  capability: Exclude<CapabilityName, "workflow.run">;
  input: Record<string, unknown>;
  dryRun?: boolean;
  continueOnError?: boolean;
}

export interface WorkflowRunInput {
  workflowId?: string;
  input?: Record<string, unknown>;
  steps: WorkflowStep[];
}

export interface WorkflowStepReceipt {
  id: string;
  capability: CapabilityName;
  ok: boolean;
  provider?: ProviderName;
  proofId: string;
  dryRun?: boolean;
  data?: unknown;
  error?: { code: string; message: string };
}

export interface WorkflowRunData {
  workflowId: string;
  stepCount: number;
  steps: WorkflowStepReceipt[];
  final?: unknown;
}

export interface ProviderDetection {
  provider: ProviderName;
  requiredKeys: string[];
  presentKeys: string[];
  missingKeys: string[];
  connected: boolean;
  capabilities: CapabilityName[];
}

export interface CapabilityManifestEntry {
  name: CapabilityName;
  enabled: boolean;
  provider: ProviderName;
  requiredKeys: string[];
  missingKeys: string[];
}

export interface SafeManifest {
  version: "skyeapi.manifest.v1";
  generatedAt: string;
  projectId?: string;
  providers: Array<{
    name: ProviderName;
    connected: boolean;
    presentKeys: string[];
    missingKeys: string[];
  }>;
  capabilities: CapabilityManifestEntry[];
  secrets_exposed: false;
}

export interface CapabilityCallEnvelope<TInput = unknown> {
  capability: CapabilityName;
  input: TInput;
  idempotencyKey?: string;
  dryRun?: boolean;
}

export interface CapabilityCallResult<TData = unknown> {
  ok: boolean;
  capability: CapabilityName;
  provider?: ProviderName;
  proofId: string;
  data?: TData;
  error?: {
    code: string;
    message: string;
  };
  secrets_exposed: false;
}

export const PROVIDER_DEFINITIONS: Array<{
  provider: ProviderName;
  requiredKeys: string[];
  optionalKeys?: string[];
  capabilities: CapabilityName[];
}> = [
  {
    provider: "resend",
    requiredKeys: ["RESEND_API_KEY"],
    capabilities: ["email.send", "providers.health"]
  },
  {
    provider: "twilio",
    requiredKeys: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER"],
    capabilities: ["sms.send", "providers.health"]
  },
  {
    provider: "neon",
    requiredKeys: ["NEON_DATABASE_URL"],
    optionalKeys: ["NEON_API_KEY", "NEON_PROJECT_ID"],
    capabilities: ["db.query", "db.inspect_schema", "providers.health"]
  },
  {
    provider: "openai-compatible",
    requiredKeys: ["OPENAI_API_KEY"],
    optionalKeys: ["OPENAI_BASE_URL", "OPENAI_MODEL"],
    capabilities: ["ai.generate_text", "providers.health"]
  },
  {
    provider: "stripe",
    requiredKeys: ["STRIPE_SECRET_KEY"],
    optionalKeys: ["STRIPE_WEBHOOK_SECRET"],
    capabilities: ["billing.create_checkout", "providers.health"]
  },
  {
    provider: "cloudflare-r2",
    requiredKeys: [
      "CLOUDFLARE_ACCOUNT_ID",
      "CLOUDFLARE_R2_ACCESS_KEY_ID",
      "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
      "CLOUDFLARE_R2_BUCKET"
    ],
    capabilities: ["storage.upload", "providers.health"]
  }
];

export function parseDotEnv(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    const key = match[1];
    let value = match[2] ?? "";
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

export function redact(value: string | undefined | null): string {
  if (!value) return "";
  if (value.length <= 8) return "••••";
  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}

export function redactRecord(input: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(input).map(([key, value]) => [key, redact(value)]));
}

export function detectProviders(env: Record<string, string>): ProviderDetection[] {
  return PROVIDER_DEFINITIONS.map((definition) => {
    const presentKeys = definition.requiredKeys.filter((key) => Boolean(env[key]));
    const missingKeys = definition.requiredKeys.filter((key) => !env[key]);
    const connected = missingKeys.length === 0;
    return {
      provider: definition.provider,
      requiredKeys: definition.requiredKeys,
      presentKeys,
      missingKeys,
      connected,
      capabilities: connected ? definition.capabilities : []
    };
  });
}

export function buildSafeManifest(env: Record<string, string>, projectId?: string): SafeManifest {
  const providers = detectProviders(env);
  const capabilities: CapabilityManifestEntry[] = [];

  for (const provider of providers) {
    const definition = PROVIDER_DEFINITIONS.find((item) => item.provider === provider.provider);
    if (!definition) continue;
    for (const capability of definition.capabilities) {
      capabilities.push({
        name: capability,
        enabled: provider.connected,
        provider: provider.provider,
        requiredKeys: definition.requiredKeys,
        missingKeys: provider.missingKeys
      });
    }
  }

  capabilities.push({
    name: "manifest.read",
    enabled: true,
    provider: "unknown",
    requiredKeys: [],
    missingKeys: []
  });

  capabilities.push({
    name: "workflow.run",
    enabled: true,
    provider: "unknown",
    requiredKeys: [],
    missingKeys: []
  });

  return {
    version: "skyeapi.manifest.v1",
    generatedAt: new Date().toISOString(),
    projectId,
    providers: providers.map((provider) => ({
      name: provider.provider,
      connected: provider.connected,
      presentKeys: provider.presentKeys,
      missingKeys: provider.missingKeys
    })),
    capabilities,
    secrets_exposed: false
  };
}

export function createProofId(prefix = "proof"): string {
  const random = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  return `${prefix}_${random.replace(/-/g, "").slice(0, 20)}`;
}

export function assertNoKnownSecretLeak(payload: unknown, env: Record<string, string>): void {
  const serialized = JSON.stringify(payload);
  for (const [key, value] of Object.entries(env)) {
    if (!value || value.length < 8) continue;
    if (serialized.includes(value)) {
      throw new Error(`Secret leak detected for ${key}`);
    }
  }
}

export function requiredScopeForCapability(capability: CapabilityName): string {
  switch (capability) {
    case "email.send": return "email:send";
    case "sms.send": return "sms:send";
    case "db.query": return "db:write";
    case "db.inspect_schema": return "db:read";
    case "ai.generate_text": return "ai:generate";
    case "billing.create_checkout": return "billing:create_checkout";
    case "storage.upload": return "storage:upload";
    case "workflow.run": return "workflow:run";
    case "providers.health": return "providers:test";
    case "manifest.read": return "manifest:read";
  }
}


export function validateWorkflowRunInput(input: unknown): { ok: true; value: WorkflowRunInput } | { ok: false; error: string } {
  if (!input || typeof input !== "object") return { ok: false, error: "workflow.run input must be an object." };
  const candidate = input as Partial<WorkflowRunInput>;
  if (!Array.isArray(candidate.steps)) return { ok: false, error: "workflow.run requires a steps array." };
  if (candidate.steps.length === 0) return { ok: false, error: "workflow.run requires at least one step." };
  if (candidate.steps.length > 25) return { ok: false, error: "workflow.run supports a maximum of 25 steps per run." };
  const seen = new Set<string>();
  for (const [index, step] of candidate.steps.entries()) {
    if (!step || typeof step !== "object") return { ok: false, error: `Step ${index + 1} must be an object.` };
    if (!step.id || typeof step.id !== "string" || !/^[a-zA-Z0-9_-]{2,64}$/.test(step.id)) return { ok: false, error: `Step ${index + 1} requires an id using letters, numbers, dash, or underscore.` };
    if (seen.has(step.id)) return { ok: false, error: `Duplicate workflow step id: ${step.id}` };
    seen.add(step.id);
    if (!step.capability) return { ok: false, error: `Step ${step.id} requires a capability.` };
    if (!step.input || typeof step.input !== "object" || Array.isArray(step.input)) return { ok: false, error: `Step ${step.id} requires an input object.` };
  }
  return { ok: true, value: candidate as WorkflowRunInput };
}

export interface ProviderPackDefinition {
  id: string;
  label: string;
  provider: ProviderName;
  requiredKeys: string[];
  optionalKeys: string[];
  capabilities: CapabilityName[];
  category: "email" | "messaging" | "database" | "ai" | "billing" | "storage" | "system";
  enabledByDefault: boolean;
}

export const PROVIDER_PACKS: ProviderPackDefinition[] = PROVIDER_DEFINITIONS.filter((definition) => definition.provider !== "unknown").map((definition) => {
  const category = definition.provider === "resend" ? "email"
    : definition.provider === "twilio" ? "messaging"
    : definition.provider === "neon" ? "database"
    : definition.provider === "openai-compatible" ? "ai"
    : definition.provider === "stripe" ? "billing"
    : definition.provider === "cloudflare-r2" ? "storage"
    : "system";
  return {
    id: `${definition.provider}.pack`,
    label: `${definition.provider} provider pack`,
    provider: definition.provider,
    requiredKeys: definition.requiredKeys,
    optionalKeys: definition.optionalKeys ?? [],
    capabilities: definition.capabilities.filter((capability) => capability !== "providers.health"),
    category,
    enabledByDefault: true
  };
});

export interface ProjectProviderConfig {
  version: "skyeapi.provider-config.v1";
  projectId: string;
  updatedAt: string;
  providers: Record<string, { enabled: boolean; reason?: string; updatedAt: string }>;
}

export function defaultProviderConfig(projectId: string): ProjectProviderConfig {
  return {
    version: "skyeapi.provider-config.v1",
    projectId,
    updatedAt: new Date().toISOString(),
    providers: Object.fromEntries(PROVIDER_PACKS.map((pack) => [pack.provider, { enabled: pack.enabledByDefault, updatedAt: new Date().toISOString() }]))
  };
}

export function providerForCapabilityName(capability: CapabilityName): ProviderName {
  if (capability === "email.send") return "resend";
  if (capability === "sms.send") return "twilio";
  if (capability === "db.query" || capability === "db.inspect_schema") return "neon";
  if (capability === "ai.generate_text") return "openai-compatible";
  if (capability === "billing.create_checkout") return "stripe";
  if (capability === "storage.upload") return "cloudflare-r2";
  return "unknown";
}

export function filterManifestByProviderConfig(manifest: SafeManifest, config?: ProjectProviderConfig): SafeManifest {
  if (!config) return manifest;
  const providerEnabled = (provider: ProviderName) => provider === "unknown" || config.providers[provider]?.enabled !== false;
  return {
    ...manifest,
    providers: manifest.providers.map((provider) => ({ ...provider, connected: provider.connected && providerEnabled(provider.name) })),
    capabilities: manifest.capabilities.map((capability) => ({
      ...capability,
      enabled: capability.enabled && providerEnabled(capability.provider)
    }))
  };
}

export interface EnvImportValidationIssue {
  severity: "error" | "warning";
  code: string;
  message: string;
  key?: string;
}

export function validateEnvImport(env: Record<string, string>): { ok: boolean; issues: EnvImportValidationIssue[]; detectedProviders: ProviderDetection[] } {
  const issues: EnvImportValidationIssue[] = [];
  const allowed = new Set<string>();
  for (const definition of PROVIDER_DEFINITIONS) {
    for (const key of definition.requiredKeys) allowed.add(key);
    for (const key of definition.optionalKeys ?? []) allowed.add(key);
  }
  for (const [key, value] of Object.entries(env)) {
    if (!/^[A-Z][A-Z0-9_]{1,120}$/.test(key)) issues.push({ severity: "error", code: "invalid_key_name", key, message: `Invalid env key name: ${key}` });
    if (!value) issues.push({ severity: "warning", code: "empty_value", key, message: `${key} is empty.` });
    if (/(PASSWORD|SECRET|TOKEN|KEY|DATABASE_URL)$/i.test(key) && value.length < 8) issues.push({ severity: "warning", code: "short_secret", key, message: `${key} looks too short to be a real credential.` });
    if (!allowed.has(key)) issues.push({ severity: "warning", code: "unknown_key", key, message: `${key} is not used by a built-in provider pack.` });
  }
  const detectedProviders = detectProviders(env);
  if (!detectedProviders.some((provider) => provider.connected)) issues.push({ severity: "warning", code: "no_complete_provider", message: "No built-in provider pack has all required keys present." });
  return { ok: !issues.some((issue) => issue.severity === "error"), issues, detectedProviders };
}

export type PolicyEffect = "allow" | "deny" | "require_approval";
export type PolicyConditionKind =
  | "field_exists"
  | "field_equals"
  | "field_matches"
  | "field_contains"
  | "max_length"
  | "max_number"
  | "sql_readonly"
  | "allowed_email_domains"
  | "allowed_phone_country_codes"
  | "storage_key_prefix";

export interface PolicyCondition {
  kind: PolicyConditionKind;
  path?: string;
  value?: unknown;
  pattern?: string;
  max?: number;
  domains?: string[];
  countryCodes?: string[];
  prefixes?: string[];
}

export interface PolicyRule {
  id: string;
  label: string;
  enabled: boolean;
  capability: CapabilityName | "*";
  effect: PolicyEffect;
  conditions: PolicyCondition[];
  message?: string;
}

export interface PolicyEvaluationResult {
  ok: boolean;
  decision: "allowed" | "denied" | "approval_required";
  matchedRules: Array<{ id: string; label: string; effect: PolicyEffect; message?: string }>;
}

function valueAtPath(source: unknown, path = ""): unknown {
  if (!path) return source;
  return path.split(".").filter(Boolean).reduce<unknown>((current, key) => {
    if (current && typeof current === "object" && key in current) return (current as Record<string, unknown>)[key];
    return undefined;
  }, source);
}

function conditionMatches(condition: PolicyCondition, input: unknown): boolean {
  const value = valueAtPath(input, condition.path);
  if (condition.kind === "field_exists") return value !== undefined && value !== null && value !== "";
  if (condition.kind === "field_equals") return value === condition.value;
  if (condition.kind === "field_matches") return typeof value === "string" && new RegExp(condition.pattern ?? "").test(value);
  if (condition.kind === "field_contains") return typeof value === "string" && String(condition.value ?? "") !== "" && value.includes(String(condition.value));
  if (condition.kind === "max_length") return typeof value === "string" && value.length > Number(condition.max ?? 0);
  if (condition.kind === "max_number") return typeof value === "number" && value > Number(condition.max ?? 0);
  if (condition.kind === "sql_readonly") {
    const sql = String(valueAtPath(input, condition.path ?? "sql") ?? "");
    return !/^\s*(select|with|show|explain)\b/i.test(sql);
  }
  if (condition.kind === "allowed_email_domains") {
    const email = String(value ?? "").toLowerCase();
    const domain = email.split("@").pop() ?? "";
    return !new Set((condition.domains ?? []).map((item) => item.toLowerCase())).has(domain);
  }
  if (condition.kind === "allowed_phone_country_codes") {
    const phone = String(value ?? "");
    return !(condition.countryCodes ?? []).some((prefix) => phone.startsWith(prefix));
  }
  if (condition.kind === "storage_key_prefix") {
    const key = String(value ?? "");
    return !(condition.prefixes ?? []).some((prefix) => key.startsWith(prefix));
  }
  return false;
}

export function evaluatePolicyRules(capability: CapabilityName, input: unknown, rules: PolicyRule[] = []): PolicyEvaluationResult {
  const relevant = rules.filter((rule) => rule.enabled && (rule.capability === "*" || rule.capability === capability));
  const matched = relevant.filter((rule) => rule.conditions.every((condition) => conditionMatches(condition, input)));
  const deny = matched.find((rule) => rule.effect === "deny");
  if (deny) return { ok: false, decision: "denied", matchedRules: matched.map(({ id, label, effect, message }) => ({ id, label, effect, message })) };
  const approval = matched.find((rule) => rule.effect === "require_approval");
  if (approval) return { ok: false, decision: "approval_required", matchedRules: matched.map(({ id, label, effect, message }) => ({ id, label, effect, message })) };
  return { ok: true, decision: "allowed", matchedRules: matched.map(({ id, label, effect, message }) => ({ id, label, effect, message })) };
}

export interface UpstreamActor {
  id: string;
  email?: string;
  role?: string;
  source: "headers" | "system";
}

export interface ProjectRoleConfig {
  version: "skyeapi.roles.v1";
  projectId: string;
  updatedAt: string;
  roles: Record<string, { allowedCapabilities: Array<CapabilityName | "*">; label?: string }>;
}

export function roleAllowsCapability(config: ProjectRoleConfig | undefined, actor: UpstreamActor, capability: CapabilityName): boolean {
  if (!config || !actor.role) return true;
  const role = config.roles[actor.role];
  if (!role) return false;
  return role.allowedCapabilities.includes("*") || role.allowedCapabilities.includes(capability);
}

export interface SecretRotationReceipt {
  rotationId: string;
  projectId: string;
  secretKey: string;
  rotatedAt: string;
  actor?: UpstreamActor;
  reason?: string;
  previousValueRedacted: string;
  nextValueRedacted: string;
  secrets_exposed: false;
}

export interface WebhookEventRecord {
  id: string;
  projectId: string;
  provider: string;
  receivedAt: string;
  eventType?: string;
  bodyHash: string;
  bodyPreview?: string;
  replayCount: number;
  lastReplayedAt?: string;
  signature?: WebhookSignatureVerification;
  secrets_exposed: false;
}

export interface ApprovalRequestRecord {
  version: "skyeapi.approval-request.v1";
  id: string;
  projectId: string;
  capability: CapabilityName;
  inputFingerprint: string;
  requestedAt: string;
  requestedBy?: UpstreamActor;
  status: "pending" | "approved" | "denied" | "expired" | "used";
  matchedRules: PolicyEvaluationResult["matchedRules"];
  message?: string;
  approvedAt?: string;
  approvedBy?: UpstreamActor;
  deniedAt?: string;
  deniedBy?: UpstreamActor;
  expiresAt?: string;
  approvalTokenHash?: string;
  usedAt?: string;
  secrets_exposed: false;
}

export interface WorkflowRunRecord {
  version: "skyeapi.workflow-run.v1";
  id: string;
  projectId: string;
  workflowId: string;
  startedAt: string;
  finishedAt: string;
  ok: boolean;
  dryRun: boolean;
  actor?: UpstreamActor;
  stepCount: number;
  steps: WorkflowStepReceipt[];
  final?: unknown;
  secrets_exposed: false;
}

export interface ProjectConfigSnapshot {
  version: "skyeapi.config-snapshot.v1";
  id: string;
  projectId: string;
  createdAt: string;
  createdBy?: UpstreamActor;
  reason?: string;
  plan?: unknown;
  providerConfig?: ProjectProviderConfig;
  policies?: PolicyRule[];
  roles?: ProjectRoleConfig;
  manifestSummary?: { connectedProviders: string[]; enabledCapabilities: CapabilityName[] };
  secrets_exposed: false;
}

export interface WebhookSignatureVerification {
  provider: string;
  mode: "off" | "report" | "strict";
  verified: boolean;
  status: "not_configured" | "verified" | "invalid" | "unsupported_provider" | "missing_signature" | "skipped";
  message: string;
  secrets_exposed: false;
}

export function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stableJson(object[key])}`).join(",")}}`;
}

export function createInputFingerprint(capability: CapabilityName, input: unknown): string {
  const text = `${capability}:${stableJson(input)}`;
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  const unsigned = hash >>> 0;
  return `fp_${capability.replace(/[^a-zA-Z0-9]/g, "")}_${unsigned.toString(36)}_${text.length.toString(36)}`;
}

export function workflowRunSummary(record: WorkflowRunRecord): Record<string, unknown> {
  return {
    id: record.id,
    projectId: record.projectId,
    workflowId: record.workflowId,
    ok: record.ok,
    dryRun: record.dryRun,
    startedAt: record.startedAt,
    finishedAt: record.finishedAt,
    stepCount: record.stepCount,
    failedSteps: record.steps.filter((step) => !step.ok).map((step) => ({ id: step.id, capability: step.capability, error: step.error }))
  };
}

export function validateProjectId(projectId: string): boolean {
  return /^[a-zA-Z0-9_.:-]{2,120}$/.test(projectId);
}

export function summarizeManifest(manifest: SafeManifest): ProjectConfigSnapshot["manifestSummary"] {
  return {
    connectedProviders: manifest.providers.filter((provider) => provider.connected).map((provider) => provider.name),
    enabledCapabilities: manifest.capabilities.filter((capability) => capability.enabled).map((capability) => capability.name)
  };
}
