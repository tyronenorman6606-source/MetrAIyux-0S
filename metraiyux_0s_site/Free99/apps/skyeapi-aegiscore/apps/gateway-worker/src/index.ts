import { neon } from "@neondatabase/serverless";
import { AwsClient } from "aws4fetch";
import { buildSafeManifest, createInputFingerprint, createProofId, defaultProviderConfig, evaluatePolicyRules, filterManifestByProviderConfig, parseDotEnv, providerForCapabilityName, PROVIDER_PACKS, redact, requiredScopeForCapability, roleAllowsCapability, summarizeManifest, validateEnvImport, validateWorkflowRunInput, workflowRunSummary, type ApprovalRequestRecord, type CapabilityCallEnvelope, type CapabilityName, type PolicyRule, type ProjectConfigSnapshot, type ProjectProviderConfig, type ProjectRoleConfig, type SafeManifest, type SecretRotationReceipt, type UpstreamActor, type WebhookEventRecord, type WebhookSignatureVerification, type WorkflowRunData, type WorkflowRunRecord, type WorkflowStepReceipt } from "@skyeapi/core";
import { AsyncJobQueue, OutboundWebhookHub, DurableAsyncJobQueue, DurableOutboundWebhookHub, ProviderPackRegistry, buildBillingUsageRecords, summarizeBillingUsage, exportBillingUsageCsv, exportBillingUsageJsonl, createProviderPackScaffold, certifyProviderPackDefinition, validateProviderPackDependencies, createSignedProviderPackManifest, verifySignedProviderPackManifest, claimDurableJobLease, completeDurableJobLease, detectUsageAnomalies, runDeveloperDoctor, runOpsReadiness, createProviderPackSourceInstallReceipt, createProviderPackCertificationReceipt, createBillingInvoiceDraft, exportBillingInvoiceCsv, exportBillingInvoiceJson, loadProviderPackFromSource, runProviderPackSandbox, persistBillingInvoice, listBillingInvoices, updateBillingInvoiceStatus, createPlanSubscriptionDraft, persistPlanSubscription, updatePlanSubscriptionLifecycle, reconcileInvoiceWithUsage, runProviderFixtureCertification, evaluateWorkspaceProjectAccess, createAuditExportBundle, type AsyncJobRecord, type DurableAsyncJobRecord, type WorkspaceProjectBinding } from "@skyeapi/ops";
import { GATEWAY_CODE_DEPTH, GATEWAY_PAID_CONTROLS, GATEWAY_VERSION } from "./modules/version.js";
import { json, securityHeaders } from "./modules/http.js";
import { findOpsJob, opsStore, usageSamplesForAnomalies } from "./modules/ops-store.js";

export interface Env {
  AEGIS_KV: KVNamespace;
  AEGIS_MASTER_KEY: string;
  SKYE_ADMIN_KEY: string;
  SKYE_ALLOWED_ORIGINS?: string;
  SKYE_RATE_LIMIT_PER_MINUTE?: string;
  SKYE_DEFAULT_PLAN?: string;
  SKYE_PLAN_CONFIG_JSON?: string;
  SKYE_WEBHOOK_SIGNATURE_MODE?: "off" | "report" | "strict";
  SKYE_FIXTURE_MODE?: string;
}

interface KeyRecord {
  projectId: string;
  scopes: string[];
  createdAt: string;
  revoked?: boolean;
  label?: string;
  lastUsedAt?: string;
  expiresAt?: string;
}

interface AuthRecord extends KeyRecord {
  keyHash: string;
}

interface EncryptedBundle {
  version: "aegiscore.hosted.v1";
  iv: string;
  ciphertext: string;
}

interface GatewayEvent {
  at: string;
  type: string;
  projectId?: string;
  data: Record<string, unknown>;
}

interface ProviderPayload {
  provider: string;
  provider_status?: number;
  [key: string]: unknown;
}


async function runJobExecutor(request: Request, env: Env, job: DurableAsyncJobRecord): Promise<any> {
  const encrypted = await env.AEGIS_KV.get<EncryptedBundle>(`project:${job.projectId}:bundle`, "json");
  if (!encrypted) return { ok: false, capability: job.envelope.capability, proofId: createProofId("proof_job_failed"), error: { code: "missing_bundle", message: "No AegisCore bundle found for job project." }, secrets_exposed: false };
  const secrets = await decryptBundle(env, encrypted);
  if (job.envelope.dryRun) return { ok: true, capability: job.envelope.capability, proofId: createProofId("proof_job_dryrun"), dryRun: true, data: { jobId: job.id, queuedAt: job.queuedAt }, secrets_exposed: false };
  if (job.envelope.capability === "workflow.run") {
    const response = await runWorkflow(request, env, { projectId: job.projectId, scopes: ["*"], createdAt: job.queuedAt, keyHash: "admin-job" }, job.envelope.input, secrets, job.envelope.dryRun);
    return await response.json();
  }
  try {
    const providerData = await callProvider(request, env, job.envelope.capability, job.envelope.input, secrets);
    if (providerData instanceof Response) return await providerData.json();
    return { ok: true, capability: job.envelope.capability, proofId: createProofId("proof_job"), data: providerData, secrets_exposed: false };
  } catch (error) {
    return { ok: false, capability: job.envelope.capability, proofId: createProofId("proof_job_failed"), error: { code: "job_provider_error", message: error instanceof Error ? error.message : String(error) }, secrets_exposed: false };
  }
}


type PlanName = "free" | "builder" | "operator" | "enterprise";

interface PlanDefinition {
  name: PlanName | string;
  dailyCallLimit: number;
  rateLimitPerMinute: number;
  allowedCapabilities: Array<CapabilityName | "*">;
}

interface ProjectPlanRecord extends PlanDefinition {
  projectId: string;
  status: "active" | "paused";
  updatedAt: string;
  notes?: string;
}

const BUILTIN_PLANS: Record<PlanName, PlanDefinition> = {
  free: {
    name: "free",
    dailyCallLimit: 100,
    rateLimitPerMinute: 30,
    allowedCapabilities: ["manifest.read", "providers.health", "email.send", "ai.generate_text", "db.inspect_schema"]
  },
  builder: {
    name: "builder",
    dailyCallLimit: 2_500,
    rateLimitPerMinute: 120,
    allowedCapabilities: ["manifest.read", "providers.health", "email.send", "sms.send", "ai.generate_text", "db.inspect_schema", "storage.upload", "workflow.run"]
  },
  operator: {
    name: "operator",
    dailyCallLimit: 25_000,
    rateLimitPerMinute: 600,
    allowedCapabilities: ["*"]
  },
  enterprise: {
    name: "enterprise",
    dailyCallLimit: 250_000,
    rateLimitPerMinute: 3_000,
    allowedCapabilities: ["*"]
  }
};


async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}


async function hmacHex(secret: string, payload: string, algorithm: "SHA-256" | "SHA-1" = "SHA-256"): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: algorithm }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacBase64(secret: string, payload: string, algorithm: "SHA-256" | "SHA-1" = "SHA-256"): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: algorithm }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return b64(new Uint8Array(signature));
}

function timingSafeEqualText(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left[i] ^ right[i];
  return diff === 0;
}

function webhookMode(env: Env): "off" | "report" | "strict" {
  return env.SKYE_WEBHOOK_SIGNATURE_MODE === "strict" ? "strict" : env.SKYE_WEBHOOK_SIGNATURE_MODE === "off" ? "off" : "report";
}

async function verifyWebhookSignature(provider: string, request: Request, env: Env, secrets: Record<string, string>, bodyText: string): Promise<WebhookSignatureVerification> {
  const mode = webhookMode(env);
  if (mode === "off") return { provider, mode, verified: false, status: "skipped", message: "Webhook signature verification is disabled by configuration.", secrets_exposed: false };
  const normalized = provider.toLowerCase();
  if (normalized === "stripe") {
    const secret = secrets.STRIPE_WEBHOOK_SECRET;
    if (!secret) return { provider, mode, verified: false, status: "not_configured", message: "STRIPE_WEBHOOK_SECRET is not configured for this project.", secrets_exposed: false };
    const header = request.headers.get("stripe-signature") ?? "";
    if (!header) return { provider, mode, verified: false, status: "missing_signature", message: "Missing stripe-signature header.", secrets_exposed: false };
    const pieces = Object.fromEntries(header.split(",").map((item) => item.split("=")).filter((pair) => pair.length === 2).map(([k, v]) => [k.trim(), v.trim()]));
    const timestamp = pieces.t;
    const signature = pieces.v1;
    if (!timestamp || !signature) return { provider, mode, verified: false, status: "invalid", message: "Stripe signature header missing t or v1 fields.", secrets_exposed: false };
    const expected = await hmacHex(secret, `${timestamp}.${bodyText}`, "SHA-256");
    const verified = timingSafeEqualText(expected, signature);
    return { provider, mode, verified, status: verified ? "verified" : "invalid", message: verified ? "Stripe webhook signature verified." : "Stripe webhook signature did not match.", secrets_exposed: false };
  }
  if (normalized === "twilio") {
    const secret = secrets.TWILIO_AUTH_TOKEN;
    if (!secret) return { provider, mode, verified: false, status: "not_configured", message: "TWILIO_AUTH_TOKEN is not configured for this project.", secrets_exposed: false };
    const signature = request.headers.get("x-twilio-signature") ?? "";
    if (!signature) return { provider, mode, verified: false, status: "missing_signature", message: "Missing x-twilio-signature header.", secrets_exposed: false };
    const expected = await hmacBase64(secret, request.url + bodyText, "SHA-1");
    const verified = timingSafeEqualText(expected, signature);
    return { provider, mode, verified, status: verified ? "verified" : "invalid", message: verified ? "Twilio-style signature verified against request URL + body." : "Twilio signature did not match the request URL + body check.", secrets_exposed: false };
  }
  if (normalized === "resend") {
    return { provider, mode, verified: false, status: "unsupported_provider", message: "Resend/Svix verification requires an explicit Svix secret adapter; event is recorded but not marked verified.", secrets_exposed: false };
  }
  return { provider, mode, verified: false, status: "unsupported_provider", message: `No built-in webhook signature verifier for ${provider}.`, secrets_exposed: false };
}

async function masterKey(env: Env): Promise<CryptoKey> {
  if (!env.AEGIS_MASTER_KEY || env.AEGIS_MASTER_KEY.length < 32) throw new Error("AEGIS_MASTER_KEY must be at least 32 characters.");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(env.AEGIS_MASTER_KEY));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

function b64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromB64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

function asArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function encryptBundle(env: Env, payload: Record<string, string>): Promise<EncryptedBundle> {
  const key = await masterKey(env);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  return {
    version: "aegiscore.hosted.v1",
    iv: b64(iv),
    ciphertext: b64(new Uint8Array(ciphertext))
  };
}

async function decryptBundle(env: Env, bundle: EncryptedBundle): Promise<Record<string, string>> {
  const key = await masterKey(env);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: asArrayBuffer(fromB64(bundle.iv)) }, key, asArrayBuffer(fromB64(bundle.ciphertext)));
  return JSON.parse(new TextDecoder().decode(plaintext)) as Record<string, string>;
}

async function authenticate(request: Request, env: Env): Promise<AuthRecord | Response> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return json(request, env, { ok: false, error: "Missing bearer token." }, 401);
  const tokenHash = await sha256(token);
  const record = await env.AEGIS_KV.get<KeyRecord>(`key:${tokenHash}`, "json");
  if (!record || record.revoked) return json(request, env, { ok: false, error: "Invalid or revoked SkyeAPI key." }, 401);
  if (record.expiresAt && Date.parse(record.expiresAt) <= Date.now()) {
    return json(request, env, { ok: false, error: "Expired SkyeAPI key." }, 401);
  }
  return { ...record, keyHash: tokenHash };
}

function requireAdmin(request: Request, env: Env): Response | null {
  if (request.headers.get("x-skye-admin-key") !== env.SKYE_ADMIN_KEY) return json(request, env, { ok: false, error: "Unauthorized admin request." }, 401);
  return null;
}

function hasScope(record: KeyRecord, capability: CapabilityName): boolean {
  const scope = requiredScopeForCapability(capability);
  return record.scopes.includes(scope) || record.scopes.includes("*");
}

function createApiKey(prefix = "skye_live"): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return `${prefix}_${b64(bytes).replace(/[+/=]/g, "").slice(0, 42)}`;
}

async function storeKey(env: Env, apiKey: string, record: KeyRecord): Promise<string> {
  const hash = await sha256(apiKey);
  await env.AEGIS_KV.put(`key:${hash}`, JSON.stringify(record));
  await env.AEGIS_KV.put(`project:${record.projectId}:key:${hash}`, JSON.stringify({ hash, label: record.label ?? null, scopes: record.scopes, createdAt: record.createdAt, revoked: Boolean(record.revoked) }));
  await env.AEGIS_KV.put(`project-index:${record.projectId}`, JSON.stringify({ projectId: record.projectId, updatedAt: new Date().toISOString() }));
  return hash;
}

async function updateKeyLastUsed(env: Env, record: AuthRecord): Promise<void> {
  const next: KeyRecord = { ...record, lastUsedAt: new Date().toISOString() };
  delete (next as Partial<AuthRecord>).keyHash;
  await env.AEGIS_KV.put(`key:${record.keyHash}`, JSON.stringify(next));
}

async function logEvent(env: Env, projectId: string | undefined, type: string, data: Record<string, unknown>): Promise<void> {
  const event: GatewayEvent = { at: new Date().toISOString(), type, projectId, data };
  const id = createProofId("evt");
  if (projectId) await env.AEGIS_KV.put(`event:${projectId}:${Date.now()}:${id}`, JSON.stringify(event), { expirationTtl: 60 * 60 * 24 * 30 });
  await env.AEGIS_KV.put(`event:global:${Date.now()}:${id}`, JSON.stringify(event), { expirationTtl: 60 * 60 * 24 * 7 });
}

function minuteWindow(date = new Date()): string {
  return date.toISOString().slice(0, 16);
}

function dayWindow(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

async function rateLimit(request: Request, env: Env, keyHash: string, limitOverride?: number): Promise<Response | null> {
  const limit = Number(limitOverride ?? env.SKYE_RATE_LIMIT_PER_MINUTE ?? 120);
  if (!Number.isFinite(limit) || limit <= 0) return null;
  const key = `rl:${keyHash}:${minuteWindow()}`;
  const current = Number(await env.AEGIS_KV.get(key) || "0") + 1;
  await env.AEGIS_KV.put(key, String(current), { expirationTtl: 90 });
  if (current > limit) return json(request, env, { ok: false, error: "Rate limit exceeded.", limit, window: "minute" }, 429);
  return null;
}

async function recordUsage(env: Env, projectId: string, capability: CapabilityName, ok: boolean): Promise<void> {
  const base = `usage:${projectId}:${dayWindow()}:${capability}:${ok ? "ok" : "failed"}`;
  const current = Number(await env.AEGIS_KV.get(base) || "0") + 1;
  await env.AEGIS_KV.put(base, String(current), { expirationTtl: 60 * 60 * 24 * 90 });
}

function providerFailure(request: Request, env: Env, capability: CapabilityName, provider: string, response: Response): Response {
  return json(request, env, {
    ok: false,
    capability,
    proofId: createProofId("proof_failed"),
    error: { code: "provider_error", message: `${provider} returned HTTP ${response.status}. Provider body suppressed to prevent sensitive data leakage.` },
    secrets_exposed: false
  }, 502);
}

function requireSecret(secrets: Record<string, string>, keys: string[]): void {
  const missing = keys.filter((key) => !secrets[key]);
  if (missing.length) throw new Error(`Missing provider secrets: ${missing.join(", ")}`);
}

async function callProvider(request: Request, env: Env, capability: CapabilityName, input: any, secrets: Record<string, string>): Promise<ProviderPayload | Response> {
  if (capability === "email.send") {
    requireSecret(secrets, ["RESEND_API_KEY"]);
    if (!input?.to || !input?.subject || (!input?.body && !input?.html)) throw new Error("email.send requires to, subject, and body or html.");
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${secrets.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ from: input.from ?? secrets.RESEND_FROM ?? "SkyeAPI <onboarding@resend.dev>", to: input.to, subject: input.subject, text: input.body, html: input.html })
    });
    if (!response.ok) return providerFailure(request, env, capability, "resend", response);
    const body = await response.json().catch(() => ({})) as { id?: string };
    return { provider: "resend", provider_status: response.status, id: body.id ?? null };
  }

  if (capability === "sms.send") {
    requireSecret(secrets, ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER"]);
    if (!input?.to || !input?.body) throw new Error("sms.send requires to and body.");
    const sid = secrets.TWILIO_ACCOUNT_SID;
    const form = new URLSearchParams({ To: input.to, From: input.from ?? secrets.TWILIO_FROM_NUMBER, Body: input.body });
    const auth = btoa(`${sid}:${secrets.TWILIO_AUTH_TOKEN}`);
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, { method: "POST", headers: { authorization: `Basic ${auth}`, "content-type": "application/x-www-form-urlencoded" }, body: form });
    if (!response.ok) return providerFailure(request, env, capability, "twilio", response);
    const body = await response.json().catch(() => ({})) as { sid?: string };
    return { provider: "twilio", provider_status: response.status, sid: body.sid ?? null };
  }

  if (capability === "ai.generate_text") {
    requireSecret(secrets, ["OPENAI_API_KEY"]);
    if (!input?.prompt) throw new Error("ai.generate_text requires prompt.");
    const base = secrets.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
    const response = await fetch(`${base.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { authorization: `Bearer ${secrets.OPENAI_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ model: input.model ?? secrets.OPENAI_MODEL ?? "gpt-4.1-mini", messages: [...(input.system ? [{ role: "system", content: input.system }] : []), { role: "user", content: input.prompt }] })
    });
    if (!response.ok) return providerFailure(request, env, capability, "openai-compatible", response);
    const body = await response.json().catch(() => ({})) as { choices?: Array<{ message?: { content?: string } }> };
    return { provider: "openai-compatible", provider_status: response.status, text: body.choices?.[0]?.message?.content ?? "" };
  }

  if (capability === "billing.create_checkout") {
    requireSecret(secrets, ["STRIPE_SECRET_KEY"]);
    if (!input?.successUrl || !input?.cancelUrl) throw new Error("billing.create_checkout requires successUrl and cancelUrl.");
    const form = new URLSearchParams({ mode: "payment", success_url: input.successUrl, cancel_url: input.cancelUrl });
    if (input.priceId) {
      form.set("line_items[0][price]", input.priceId);
      form.set("line_items[0][quantity]", "1");
    } else {
      form.set("line_items[0][price_data][currency]", input.currency ?? "usd");
      form.set("line_items[0][price_data][product_data][name]", input.productName ?? "SkyeAPI Item");
      form.set("line_items[0][price_data][unit_amount]", String(input.amountCents ?? 1000));
      form.set("line_items[0][quantity]", "1");
    }
    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", { method: "POST", headers: { authorization: `Bearer ${secrets.STRIPE_SECRET_KEY}`, "content-type": "application/x-www-form-urlencoded" }, body: form });
    if (!response.ok) return providerFailure(request, env, capability, "stripe", response);
    const body = await response.json().catch(() => ({})) as { id?: string; url?: string };
    return { provider: "stripe", provider_status: response.status, id: body.id, url: body.url };
  }

  if (capability === "db.query") {
    requireSecret(secrets, ["NEON_DATABASE_URL"]);
    if (!input?.sql) throw new Error("db.query requires sql.");
    if (input.readonly && !/^\s*(select|with|show|explain)\b/i.test(input.sql)) throw new Error("Readonly mode allows SELECT/WITH/SHOW/EXPLAIN only.");
    const sql = neon(secrets.NEON_DATABASE_URL);
    const rows = await sql(input.sql, input.params ?? []);
    return { provider: "neon", rows, rowCount: Array.isArray(rows) ? rows.length : 0 };
  }

  if (capability === "db.inspect_schema") {
    requireSecret(secrets, ["NEON_DATABASE_URL"]);
    const sql = neon(secrets.NEON_DATABASE_URL);
    const rows = await sql("select table_schema, table_name from information_schema.tables where table_schema not in ('pg_catalog', 'information_schema') order by table_schema, table_name limit 200");
    return { provider: "neon", rows, rowCount: Array.isArray(rows) ? rows.length : 0 };
  }

  if (capability === "storage.upload") {
    requireSecret(secrets, ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_R2_ACCESS_KEY_ID", "CLOUDFLARE_R2_SECRET_ACCESS_KEY", "CLOUDFLARE_R2_BUCKET"]);
    if (!input?.key || typeof input?.body !== "string") throw new Error("storage.upload requires key and string body.");
    if (input.key.includes("..")) throw new Error("Storage key cannot contain path traversal segments.");
    const encodedKey = String(input.key).split("/").map(encodeURIComponent).join("/");
    const aws = new AwsClient({ accessKeyId: secrets.CLOUDFLARE_R2_ACCESS_KEY_ID, secretAccessKey: secrets.CLOUDFLARE_R2_SECRET_ACCESS_KEY, service: "s3", region: "auto" });
    const response = await aws.fetch(`https://${secrets.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com/${secrets.CLOUDFLARE_R2_BUCKET}/${encodedKey}`, { method: "PUT", headers: { "content-type": input.contentType ?? "text/plain; charset=utf-8" }, body: input.body });
    if (!response.ok) return providerFailure(request, env, capability, "cloudflare-r2", response);
    return { provider: "cloudflare-r2", provider_status: response.status, bucket: secrets.CLOUDFLARE_R2_BUCKET, key: input.key };
  }

  throw new Error(`Capability ${capability} is not implemented in hosted worker yet.`);
}

function customPlans(env: Env): Record<string, PlanDefinition> {
  if (!env.SKYE_PLAN_CONFIG_JSON) return {};
  try {
    const parsed = JSON.parse(env.SKYE_PLAN_CONFIG_JSON) as Record<string, Partial<PlanDefinition>>;
    return Object.fromEntries(Object.entries(parsed).map(([name, plan]) => [name, {
      name: plan.name ?? name,
      dailyCallLimit: Number(plan.dailyCallLimit ?? BUILTIN_PLANS.builder.dailyCallLimit),
      rateLimitPerMinute: Number(plan.rateLimitPerMinute ?? BUILTIN_PLANS.builder.rateLimitPerMinute),
      allowedCapabilities: (plan.allowedCapabilities ?? BUILTIN_PLANS.builder.allowedCapabilities) as Array<CapabilityName | "*">
    }]));
  } catch {
    return {};
  }
}

function allPlans(env: Env): Record<string, PlanDefinition> {
  return { ...BUILTIN_PLANS, ...customPlans(env) };
}

function defaultPlanName(env: Env): string {
  return env.SKYE_DEFAULT_PLAN || "builder";
}

function planByName(env: Env, name?: string): PlanDefinition {
  const plans = allPlans(env);
  return plans[name || defaultPlanName(env)] ?? plans.builder ?? BUILTIN_PLANS.builder;
}

async function getProjectPlan(env: Env, projectId: string): Promise<ProjectPlanRecord> {
  const stored = await env.AEGIS_KV.get<ProjectPlanRecord>(`project:${projectId}:plan`, "json");
  if (stored) return stored;
  const plan = planByName(env);
  return {
    projectId,
    name: plan.name,
    status: "active",
    dailyCallLimit: plan.dailyCallLimit,
    rateLimitPerMinute: plan.rateLimitPerMinute,
    allowedCapabilities: plan.allowedCapabilities,
    updatedAt: new Date().toISOString(),
    notes: "Default plan derived from SKYE_DEFAULT_PLAN or built-in builder plan."
  };
}

async function setProjectPlan(env: Env, input: { projectId: string; plan?: string; dailyCallLimit?: number; rateLimitPerMinute?: number; allowedCapabilities?: Array<CapabilityName | "*">; status?: "active" | "paused"; notes?: string }): Promise<ProjectPlanRecord> {
  const base = planByName(env, input.plan);
  const record: ProjectPlanRecord = {
    projectId: input.projectId,
    name: input.plan ?? base.name,
    status: input.status ?? "active",
    dailyCallLimit: Number(input.dailyCallLimit ?? base.dailyCallLimit),
    rateLimitPerMinute: Number(input.rateLimitPerMinute ?? base.rateLimitPerMinute),
    allowedCapabilities: input.allowedCapabilities ?? base.allowedCapabilities,
    updatedAt: new Date().toISOString(),
    notes: input.notes
  };
  await env.AEGIS_KV.put(`project:${input.projectId}:plan`, JSON.stringify(record));
  await env.AEGIS_KV.put(`project-index:${input.projectId}`, JSON.stringify({ projectId: input.projectId, updatedAt: record.updatedAt }));
  return record;
}

async function projectDailyUsageTotal(env: Env, projectId: string, date = dayWindow()): Promise<number> {
  const listed = await env.AEGIS_KV.list({ prefix: `usage:${projectId}:${date}:`, limit: 1000 });
  let total = 0;
  for (const key of listed.keys) total += Number(await env.AEGIS_KV.get(key.name) || "0");
  return total;
}

async function enforcePlan(request: Request, env: Env, projectId: string, capability: CapabilityName): Promise<{ plan: ProjectPlanRecord; usedToday: number; remainingToday: number } | Response> {
  const plan = await getProjectPlan(env, projectId);
  if (plan.status !== "active") {
    return json(request, env, { ok: false, error: "Project plan is paused.", plan: plan.name, status: plan.status, secrets_exposed: false }, 402);
  }
  if (!plan.allowedCapabilities.includes("*") && !plan.allowedCapabilities.includes(capability)) {
    return json(request, env, { ok: false, error: `Capability ${capability} is not enabled on the ${plan.name} plan.`, code: "plan_capability_blocked", plan: plan.name, secrets_exposed: false }, 402);
  }
  const usedToday = await projectDailyUsageTotal(env, projectId);
  if (usedToday >= plan.dailyCallLimit) {
    return json(request, env, { ok: false, error: "Daily plan usage limit reached.", code: "plan_limit_reached", plan: plan.name, dailyCallLimit: plan.dailyCallLimit, usedToday, secrets_exposed: false }, 402);
  }
  return { plan, usedToday, remainingToday: Math.max(plan.dailyCallLimit - usedToday, 0) };
}

async function listKvJson<T>(env: Env, prefix: string, limit: number): Promise<T[]> {
  const listed = await env.AEGIS_KV.list({ prefix, limit });
  const rows: T[] = [];
  for (const key of listed.keys) {
    const row = await env.AEGIS_KV.get<T>(key.name, "json");
    if (row) rows.push(row);
  }
  return rows;
}

function safeProjectSummary(projectId: string, manifest?: SafeManifest, plan?: ProjectPlanRecord): Record<string, unknown> {
  return {
    projectId,
    plan: plan ? { name: plan.name, status: plan.status, dailyCallLimit: plan.dailyCallLimit, rateLimitPerMinute: plan.rateLimitPerMinute, allowedCapabilities: plan.allowedCapabilities } : undefined,
    connectedProviders: manifest?.providers.filter((provider) => provider.connected).map((provider) => provider.name) ?? [],
    enabledCapabilities: manifest?.capabilities.filter((capability) => capability.enabled).map((capability) => capability.name) ?? []
  };
}




async function createProjectSnapshot(request: Request, env: Env, projectId: string, reason?: string): Promise<ProjectConfigSnapshot> {
  const encrypted = await env.AEGIS_KV.get<EncryptedBundle>(`project:${projectId}:bundle`, "json");
  const manifest = encrypted ? filterManifestByProviderConfig(buildSafeManifest(await decryptBundle(env, encrypted), projectId), await getProjectProviderConfig(env, projectId)) : undefined;
  const snapshot: ProjectConfigSnapshot = {
    version: "skyeapi.config-snapshot.v1",
    id: createProofId("snapshot"),
    projectId,
    createdAt: new Date().toISOString(),
    createdBy: actorFromRequest(request),
    reason,
    plan: await getProjectPlan(env, projectId),
    providerConfig: await getProjectProviderConfig(env, projectId),
    policies: await getPolicies(env, projectId),
    roles: await getRoleConfig(env, projectId),
    manifestSummary: manifest ? summarizeManifest(manifest) : undefined,
    secrets_exposed: false
  };
  await env.AEGIS_KV.put(`snapshot:${projectId}:${snapshot.createdAt}:${snapshot.id}`, JSON.stringify(snapshot), { expirationTtl: 60 * 60 * 24 * 365 });
  await logEvent(env, projectId, "config.snapshot_created", { snapshotId: snapshot.id, reason: reason ?? null });
  return snapshot;
}

async function restoreProjectSnapshot(env: Env, snapshot: ProjectConfigSnapshot): Promise<void> {
  if (snapshot.providerConfig) await env.AEGIS_KV.put(`project:${snapshot.projectId}:providers`, JSON.stringify(snapshot.providerConfig));
  if (snapshot.policies) await env.AEGIS_KV.put(`project:${snapshot.projectId}:policies`, JSON.stringify(snapshot.policies));
  if (snapshot.roles) await env.AEGIS_KV.put(`project:${snapshot.projectId}:roles`, JSON.stringify(snapshot.roles));
  if (snapshot.plan) await env.AEGIS_KV.put(`project:${snapshot.projectId}:plan`, JSON.stringify(snapshot.plan));
  await env.AEGIS_KV.put(`project-index:${snapshot.projectId}`, JSON.stringify({ projectId: snapshot.projectId, updatedAt: new Date().toISOString() }));
}

async function getProjectProviderConfig(env: Env, projectId: string): Promise<ProjectProviderConfig> {
  const stored = await env.AEGIS_KV.get<ProjectProviderConfig>(`project:${projectId}:providers`, "json");
  return stored ?? defaultProviderConfig(projectId);
}

async function setProjectProvider(env: Env, input: { projectId: string; provider: string; enabled: boolean; reason?: string }): Promise<ProjectProviderConfig> {
  const config = await getProjectProviderConfig(env, input.projectId);
  config.providers[input.provider] = { enabled: input.enabled, reason: input.reason, updatedAt: new Date().toISOString() };
  config.updatedAt = new Date().toISOString();
  await env.AEGIS_KV.put(`project:${input.projectId}:providers`, JSON.stringify(config));
  await env.AEGIS_KV.put(`project-index:${input.projectId}`, JSON.stringify({ projectId: input.projectId, updatedAt: config.updatedAt }));
  return config;
}

async function providerEnabledForCapability(env: Env, projectId: string, capability: CapabilityName): Promise<boolean> {
  const provider = providerForCapabilityName(capability);
  if (provider === "unknown") return true;
  const config = await getProjectProviderConfig(env, projectId);
  return config.providers[provider]?.enabled !== false;
}

async function getPolicies(env: Env, projectId: string): Promise<PolicyRule[]> {
  return await env.AEGIS_KV.get<PolicyRule[]>(`project:${projectId}:policies`, "json") ?? [];
}

async function setPolicies(env: Env, projectId: string, policies: PolicyRule[]): Promise<PolicyRule[]> {
  const safePolicies = policies.map((rule, index) => ({
    id: rule.id || `policy_${index + 1}`,
    label: rule.label || rule.id || `Policy ${index + 1}`,
    enabled: rule.enabled !== false,
    capability: rule.capability || "*",
    effect: rule.effect || "deny",
    conditions: Array.isArray(rule.conditions) ? rule.conditions : [],
    message: rule.message
  })) as PolicyRule[];
  await env.AEGIS_KV.put(`project:${projectId}:policies`, JSON.stringify(safePolicies));
  await env.AEGIS_KV.put(`project-index:${projectId}`, JSON.stringify({ projectId, updatedAt: new Date().toISOString() }));
  return safePolicies;
}

function actorFromRequest(request: Request): UpstreamActor {
  return {
    id: request.headers.get("x-skye-actor-id") || request.headers.get("x-user-id") || "system",
    email: request.headers.get("x-skye-actor-email") || request.headers.get("x-user-email") || undefined,
    role: request.headers.get("x-skye-role") || request.headers.get("x-skye-project-role") || undefined,
    source: "headers"
  };
}

async function getRoleConfig(env: Env, projectId: string): Promise<ProjectRoleConfig | undefined> {
  return await env.AEGIS_KV.get<ProjectRoleConfig>(`project:${projectId}:roles`, "json") ?? undefined;
}

async function setRoleConfig(env: Env, input: ProjectRoleConfig): Promise<ProjectRoleConfig> {
  const config: ProjectRoleConfig = {
    version: "skyeapi.roles.v1",
    projectId: input.projectId,
    updatedAt: new Date().toISOString(),
    roles: input.roles || {}
  };
  await env.AEGIS_KV.put(`project:${input.projectId}:roles`, JSON.stringify(config));
  await env.AEGIS_KV.put(`project-index:${input.projectId}`, JSON.stringify({ projectId: input.projectId, updatedAt: config.updatedAt }));
  return config;
}


async function createApprovalRequest(env: Env, projectId: string, capability: CapabilityName, input: unknown, actor: UpstreamActor, decision: ReturnType<typeof evaluatePolicyRules>): Promise<ApprovalRequestRecord> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  const record: ApprovalRequestRecord = {
    version: "skyeapi.approval-request.v1",
    id: createProofId("approval"),
    projectId,
    capability,
    inputFingerprint: createInputFingerprint(capability, input),
    requestedAt: now.toISOString(),
    requestedBy: actor,
    status: "pending",
    matchedRules: decision.matchedRules,
    message: decision.matchedRules[0]?.message,
    expiresAt,
    secrets_exposed: false
  };
  await env.AEGIS_KV.put(`approval:${projectId}:${record.id}`, JSON.stringify(record), { expirationTtl: 60 * 60 * 24 * 30 });
  return record;
}

async function verifyApprovalToken(env: Env, projectId: string, capability: CapabilityName, input: unknown): Promise<{ ok: true; request: ApprovalRequestRecord } | { ok: false; message: string }> {
  if (!input || typeof input !== "object") return { ok: false, message: "Approval token requires object input." };
  const token = String((input as Record<string, unknown>).approvalToken ?? "");
  const requestId = String((input as Record<string, unknown>).approvalRequestId ?? "");
  if (!token || !requestId) return { ok: false, message: "approvalToken and approvalRequestId are required." };
  const record = await env.AEGIS_KV.get<ApprovalRequestRecord>(`approval:${projectId}:${requestId}`, "json");
  if (!record) return { ok: false, message: "Approval request not found." };
  if (record.status !== "approved") return { ok: false, message: `Approval request is ${record.status}.` };
  if (record.expiresAt && Date.parse(record.expiresAt) <= Date.now()) return { ok: false, message: "Approval token expired." };
  if (record.capability !== capability) return { ok: false, message: "Approval capability mismatch." };
  const inputWithoutApproval = { ...(input as Record<string, unknown>) };
  delete inputWithoutApproval.approvalToken;
  delete inputWithoutApproval.approvalRequestId;
  const fingerprint = createInputFingerprint(capability, inputWithoutApproval);
  if (fingerprint !== record.inputFingerprint) return { ok: false, message: "Approval input fingerprint mismatch." };
  const hash = await sha256(token);
  if (!record.approvalTokenHash || !timingSafeEqualText(record.approvalTokenHash, hash)) return { ok: false, message: "Approval token invalid." };
  const used: ApprovalRequestRecord = { ...record, status: "used", usedAt: new Date().toISOString() };
  await env.AEGIS_KV.put(`approval:${projectId}:${record.id}`, JSON.stringify(used), { expirationTtl: 60 * 60 * 24 * 30 });
  return { ok: true, request: used };
}

function stripApprovalFields(input: unknown): unknown {
  if (!input || typeof input !== "object" || Array.isArray(input)) return input;
  const copy = { ...(input as Record<string, unknown>) };
  delete copy.approvalToken;
  delete copy.approvalRequestId;
  return copy;
}

async function enforceGovernance(request: Request, env: Env, projectId: string, capability: CapabilityName, input: unknown): Promise<{ actor: UpstreamActor } | Response> {
  const actor = actorFromRequest(request);
  const roles = await getRoleConfig(env, projectId);
  if (!roleAllowsCapability(roles, actor, capability)) {
    await logEvent(env, projectId, "role.blocked", { capability, role: actor.role ?? null, actorId: actor.id });
    return json(request, env, { ok: false, error: `Upstream role ${actor.role ?? "unknown"} is not allowed to call ${capability}.`, code: "role_capability_blocked", secrets_exposed: false }, 403);
  }
  const policies = await getPolicies(env, projectId);
  const decision = evaluatePolicyRules(capability, input, policies);
  if (decision.decision === "denied") {
    await logEvent(env, projectId, "policy.denied", { capability, actorId: actor.id, matchedRules: decision.matchedRules });
    return json(request, env, { ok: false, error: decision.matchedRules[0]?.message ?? `Policy denied ${capability}.`, code: "policy_denied", decision, secrets_exposed: false }, 403);
  }
  if (decision.decision === "approval_required") {
    if (input && typeof input === "object" && "approvalToken" in input) {
      const approval = await verifyApprovalToken(env, projectId, capability, input);
      if (!approval.ok) return json(request, env, { ok: false, error: approval.message, code: "policy_approval_invalid", decision, secrets_exposed: false }, 403);
      await logEvent(env, projectId, "policy.approval_used", { capability, actorId: actor.id, approvalRequestId: approval.request.id });
      return { actor };
    }
    const approvalRequest = await createApprovalRequest(env, projectId, capability, input, actor, decision);
    await logEvent(env, projectId, "policy.approval_required", { capability, actorId: actor.id, approvalRequestId: approvalRequest.id, matchedRules: decision.matchedRules });
    return json(request, env, { ok: false, error: decision.matchedRules[0]?.message ?? `Policy requires approval for ${capability}.`, code: "policy_approval_required", decision, approvalRequest: { id: approvalRequest.id, expiresAt: approvalRequest.expiresAt, capability, inputFingerprint: approvalRequest.inputFingerprint }, secrets_exposed: false }, 409);
  }
  return { actor };
}

async function webhookRecordId(projectId: string, provider: string, bodyText: string): Promise<string> {
  return `wh_${projectId}_${provider}_${(await sha256(`${Date.now()}:${bodyText}`)).slice(0, 20)}`;
}

function getContextPath(source: unknown, path: string): unknown {
  return path.split(".").filter(Boolean).reduce<unknown>((current, key) => {
    if (current && typeof current === "object" && key in current) return (current as Record<string, unknown>)[key];
    return undefined;
  }, source);
}

function interpolateWorkflowString(value: string, context: Record<string, unknown>): string {
  return value.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_match, expression: string) => {
    const resolved = getContextPath(context, expression.trim());
    if (resolved === undefined || resolved === null) return "";
    return typeof resolved === "string" ? resolved : JSON.stringify(resolved);
  });
}

function interpolateWorkflowValue(value: unknown, context: Record<string, unknown>): unknown {
  if (typeof value === "string") return interpolateWorkflowString(value, context);
  if (Array.isArray(value)) return value.map((item) => interpolateWorkflowValue(item, context));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, child]) => [key, interpolateWorkflowValue(child, context)]));
  }
  return value;
}

async function runWorkflow(request: Request, env: Env, auth: AuthRecord, input: unknown, secrets: Record<string, string>, dryRun?: boolean): Promise<Response> {
  const validation = validateWorkflowRunInput(input);
  if (!validation.ok) return json(request, env, { ok: false, capability: "workflow.run", proofId: createProofId("proof_failed"), error: { code: "invalid_workflow", message: validation.error }, secrets_exposed: false }, 400);
  const workflow = validation.value;
  const startedAt = new Date().toISOString();
  const workflowId = workflow.workflowId ?? createProofId("workflow");
  const context: Record<string, unknown> = { input: workflow.input ?? {}, steps: {} };
  const receipts: WorkflowStepReceipt[] = [];

  for (const step of workflow.steps) {
    const resolvedInput = interpolateWorkflowValue(step.input, context) as Record<string, unknown>;

    if (!hasScope(auth, step.capability)) {
      const receipt: WorkflowStepReceipt = { id: step.id, capability: step.capability, ok: false, proofId: createProofId("proof_failed"), error: { code: "missing_scope", message: `Missing scope for ${step.capability}` } };
      receipts.push(receipt);
      (context.steps as Record<string, unknown>)[step.id] = receipt;
      if (!step.continueOnError) break;
      continue;
    }

    if (!(await providerEnabledForCapability(env, auth.projectId, step.capability))) {
      const receipt: WorkflowStepReceipt = { id: step.id, capability: step.capability, ok: false, proofId: createProofId("proof_failed"), error: { code: "provider_pack_disabled", message: `Provider pack for ${step.capability} is disabled on this project.` } };
      receipts.push(receipt);
      (context.steps as Record<string, unknown>)[step.id] = receipt;
      if (!step.continueOnError) break;
      continue;
    }

    const governance = await enforceGovernance(request, env, auth.projectId, step.capability, resolvedInput);
    if (governance instanceof Response) {
      const body = await governance.clone().json().catch(() => ({ error: "Governance blocked step." })) as { code?: string; error?: string };
      const receipt: WorkflowStepReceipt = { id: step.id, capability: step.capability, ok: false, proofId: createProofId("proof_failed"), error: { code: body.code ?? "governance_blocked", message: body.error ?? `Governance blocked ${step.capability}` } };
      receipts.push(receipt);
      (context.steps as Record<string, unknown>)[step.id] = receipt;
      if (!step.continueOnError) break;
      continue;
    }

    const stepPlan = await enforcePlan(request, env, auth.projectId, step.capability);
    if (stepPlan instanceof Response) {
      const body = await stepPlan.clone().json().catch(() => ({ error: "Plan blocked step." })) as { code?: string; error?: string };
      const receipt: WorkflowStepReceipt = { id: step.id, capability: step.capability, ok: false, proofId: createProofId("proof_failed"), error: { code: body.code ?? "plan_blocked", message: body.error ?? `Plan blocked ${step.capability}` } };
      receipts.push(receipt);
      (context.steps as Record<string, unknown>)[step.id] = receipt;
      if (!step.continueOnError) break;
      continue;
    }

    if (dryRun || step.dryRun) {
      const receipt: WorkflowStepReceipt = { id: step.id, capability: step.capability, ok: true, proofId: createProofId("proof_dryrun"), dryRun: true, data: { inputKeys: Object.keys(resolvedInput) } };
      receipts.push(receipt);
      (context.steps as Record<string, unknown>)[step.id] = receipt;
      await recordUsage(env, auth.projectId, step.capability, true);
      continue;
    }

    const data = await callProvider(request, env, step.capability, resolvedInput, secrets);
    if (data instanceof Response) {
      await recordUsage(env, auth.projectId, step.capability, false);
      const body = await data.clone().json().catch(() => ({ error: { code: "provider_error", message: "Provider call failed." } })) as { proofId?: string; error?: { code: string; message: string } };
      const receipt: WorkflowStepReceipt = { id: step.id, capability: step.capability, ok: false, proofId: body.proofId ?? createProofId("proof_failed"), error: body.error ?? { code: "provider_error", message: "Provider call failed." } };
      receipts.push(receipt);
      (context.steps as Record<string, unknown>)[step.id] = receipt;
      if (!step.continueOnError) break;
      continue;
    }

    const receipt: WorkflowStepReceipt = { id: step.id, capability: step.capability, ok: true, provider: data.provider as any, proofId: createProofId(), data };
    receipts.push(receipt);
    (context.steps as Record<string, unknown>)[step.id] = receipt;
    await recordUsage(env, auth.projectId, step.capability, true);
  }

  const ok = receipts.every((receipt) => receipt.ok || workflow.steps.find((step) => step.id === receipt.id)?.continueOnError);
  const result = {
    ok,
    capability: "workflow.run",
    proofId: createProofId(),
    data: {
      workflowId,
      stepCount: receipts.length,
      steps: receipts,
      final: receipts.at(-1)?.data
    } satisfies WorkflowRunData,
    secrets_exposed: false
  };
  const finishedAt = new Date().toISOString();
  const runRecord: WorkflowRunRecord = {
    version: "skyeapi.workflow-run.v1",
    id: createProofId("run"),
    projectId: auth.projectId,
    workflowId,
    startedAt,
    finishedAt,
    ok,
    dryRun: Boolean(dryRun),
    actor: actorFromRequest(request),
    stepCount: receipts.length,
    steps: receipts,
    final: receipts.at(-1)?.data,
    secrets_exposed: false
  };
  await env.AEGIS_KV.put(`workflow-run:${auth.projectId}:${finishedAt}:${runRecord.id}`, JSON.stringify(runRecord), { expirationTtl: 60 * 60 * 24 * 90 });
  await updateKeyLastUsed(env, auth);
  await recordUsage(env, auth.projectId, "workflow.run", ok);
  await logEvent(env, auth.projectId, ok ? "workflow.completed" : "workflow.failed", { workflowId, runId: runRecord.id, stepCount: receipts.length, dryRun: Boolean(dryRun), keyHash: auth.keyHash.slice(0, 12) });
  return json(request, env, { ...result, runId: runRecord.id }, ok ? 200 : 422);
}


export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: securityHeaders(request, env) });
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return json(request, env, { ok: true, service: "skyeapi-gateway", aegis: "AegisCore", version: GATEWAY_VERSION, console: "apps/console", paidPlatformControls: GATEWAY_PAID_CONTROLS, codeDepth: GATEWAY_CODE_DEPTH, secrets_exposed: false });
    }


    if (url.pathname.startsWith("/v1/webhooks/") && request.method === "POST") {
      const provider = decodeURIComponent(url.pathname.replace("/v1/webhooks/", "")).replace(/[^a-zA-Z0-9_.-]/g, "");
      const projectId = url.searchParams.get("projectId") || request.headers.get("x-skye-project-id") || "";
      if (!projectId || !provider) return json(request, env, { ok: false, error: "projectId and provider are required." }, 400);
      const bodyText = await request.text();
      const encrypted = await env.AEGIS_KV.get<EncryptedBundle>(`project:${projectId}:bundle`, "json");
      const secrets = encrypted ? await decryptBundle(env, encrypted) : {};
      const signature = await verifyWebhookSignature(provider, request, env, secrets, bodyText);
      if (signature.mode === "strict" && !signature.verified) {
        await logEvent(env, projectId, "webhook.signature_rejected", { provider, status: signature.status, message: signature.message });
        return json(request, env, { ok: false, error: signature.message, signature, secrets_exposed: false }, 401);
      }
      const eventId = await webhookRecordId(projectId, provider, bodyText);
      const parsed = (() => { try { return JSON.parse(bodyText) as Record<string, unknown>; } catch { return {}; } })();
      const record: WebhookEventRecord = {
        id: eventId,
        projectId,
        provider,
        receivedAt: new Date().toISOString(),
        eventType: String(parsed.type ?? parsed.event ?? request.headers.get("x-event-type") ?? ""),
        bodyHash: await sha256(bodyText),
        bodyPreview: bodyText.slice(0, 1500),
        replayCount: 0,
        signature,
        secrets_exposed: false
      };
      await env.AEGIS_KV.put(`webhook:${projectId}:${eventId}`, JSON.stringify(record), { expirationTtl: 60 * 60 * 24 * 90 });
      await logEvent(env, projectId, "webhook.ingested", { eventId, provider, eventType: record.eventType ?? null });
      return json(request, env, { ok: true, event: record, secrets_exposed: false }, 202);
    }

    if (url.pathname === "/v1/admin/import-env" && request.method === "POST") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const body = await request.json<any>();
      const projectId = body.projectId as string;
      const apiKey = (body.apiKey as string | undefined) ?? createApiKey();
      const scopes = (body.scopes ?? ["manifest:read"]) as string[];
      const envText = body.envText as string;
      if (!projectId || !envText) return json(request, env, { ok: false, error: "projectId and envText are required." }, 400);
      const secrets = parseDotEnv(envText);
      const importValidation = validateEnvImport(secrets);
      if (!importValidation.ok) return json(request, env, { ok: false, error: "Env import failed validation.", validation: importValidation, secrets_exposed: false }, 400);
      const encrypted = await encryptBundle(env, secrets);
      await env.AEGIS_KV.put(`project:${projectId}:bundle`, JSON.stringify(encrypted));
      await storeKey(env, apiKey, { projectId, scopes, createdAt: new Date().toISOString(), label: body.label as string | undefined, expiresAt: body.expiresAt as string | undefined });
      if (body.plan || body.dailyCallLimit || body.rateLimitPerMinute || body.allowedCapabilities) {
        await setProjectPlan(env, { projectId, plan: body.plan as string | undefined, dailyCallLimit: body.dailyCallLimit as number | undefined, rateLimitPerMinute: body.rateLimitPerMinute as number | undefined, allowedCapabilities: body.allowedCapabilities as Array<CapabilityName | "*"> | undefined, notes: "Set during import-env." });
      }
      const manifest = buildSafeManifest(secrets, projectId);
      const providerConfig = await getProjectProviderConfig(env, projectId);
      await logEvent(env, projectId, "project.import_env", { keys_seen: Object.keys(secrets).length, connectedProviders: manifest.providers.filter((p) => p.connected).map((p) => p.name), validationIssues: importValidation.issues.length });
      return json(request, env, { ok: true, projectId, apiKey, manifest: filterManifestByProviderConfig(manifest, providerConfig), providerConfig, validation: importValidation, plan: await getProjectPlan(env, projectId), secrets_exposed: false });
    }

    if (url.pathname === "/v1/admin/create-key" && request.method === "POST") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const body = await request.json<any>();
      const projectId = body.projectId as string;
      const scopes = (body.scopes ?? ["manifest:read"]) as string[];
      if (!projectId) return json(request, env, { ok: false, error: "projectId is required." }, 400);
      const apiKey = createApiKey(body.prefix as string | undefined);
      const hash = await storeKey(env, apiKey, { projectId, scopes, createdAt: new Date().toISOString(), label: body.label as string | undefined, expiresAt: body.expiresAt as string | undefined });
      if (body.plan || body.dailyCallLimit || body.rateLimitPerMinute || body.allowedCapabilities) {
        await setProjectPlan(env, { projectId, plan: body.plan as string | undefined, dailyCallLimit: body.dailyCallLimit as number | undefined, rateLimitPerMinute: body.rateLimitPerMinute as number | undefined, allowedCapabilities: body.allowedCapabilities as Array<CapabilityName | "*"> | undefined, notes: "Set during import-env." });
      }
      await logEvent(env, projectId, "key.created", { keyHash: hash, scopes, label: body.label ?? null });
      return json(request, env, { ok: true, projectId, apiKey, keyHash: hash, scopes, expiresAt: body.expiresAt ?? null, secrets_exposed: false });
    }

    if (url.pathname === "/v1/admin/revoke-key" && request.method === "POST") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const body = await request.json<any>();
      const apiKey = body.apiKey as string | undefined;
      const keyHash = (body.keyHash as string | undefined) ?? (apiKey ? await sha256(apiKey) : undefined);
      if (!keyHash) return json(request, env, { ok: false, error: "apiKey or keyHash is required." }, 400);
      const record = await env.AEGIS_KV.get<KeyRecord>(`key:${keyHash}`, "json");
      if (!record) return json(request, env, { ok: false, error: "Key not found." }, 404);
      record.revoked = true;
      await env.AEGIS_KV.put(`key:${keyHash}`, JSON.stringify(record));
      await env.AEGIS_KV.put(`project:${record.projectId}:key:${keyHash}`, JSON.stringify({ hash: keyHash, label: record.label ?? null, scopes: record.scopes, createdAt: record.createdAt, revoked: true }));
      await logEvent(env, record.projectId, "key.revoked", { keyHash });
      return json(request, env, { ok: true, keyHash, revoked: true, secrets_exposed: false });
    }

    if (url.pathname === "/v1/admin/plans" && request.method === "GET") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      return json(request, env, { ok: true, plans: Object.values(allPlans(env)), defaultPlan: defaultPlanName(env), secrets_exposed: false });
    }

    if (url.pathname === "/v1/admin/set-plan" && request.method === "POST") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const body = await request.json<any>();
      const projectId = body.projectId as string;
      if (!projectId) return json(request, env, { ok: false, error: "projectId is required." }, 400);
      const plan = await setProjectPlan(env, {
        projectId,
        plan: body.plan as string | undefined,
        dailyCallLimit: body.dailyCallLimit as number | undefined,
        rateLimitPerMinute: body.rateLimitPerMinute as number | undefined,
        allowedCapabilities: body.allowedCapabilities as Array<CapabilityName | "*"> | undefined,
        status: body.status as "active" | "paused" | undefined,
        notes: body.notes as string | undefined
      });
      await logEvent(env, projectId, "plan.updated", { plan: plan.name, status: plan.status, dailyCallLimit: plan.dailyCallLimit, rateLimitPerMinute: plan.rateLimitPerMinute });
      return json(request, env, { ok: true, projectId, plan, secrets_exposed: false });
    }

    if (url.pathname === "/v1/admin/projects" && request.method === "GET") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const rows = await listKvJson<{ projectId: string; updatedAt: string }>(env, "project-index:", 1000);
      return json(request, env, { ok: true, projects: rows, secrets_exposed: false });
    }

    if (url.pathname === "/v1/admin/project" && request.method === "GET") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const projectId = url.searchParams.get("projectId") ?? "";
      if (!projectId) return json(request, env, { ok: false, error: "projectId is required." }, 400);
      const encrypted = await env.AEGIS_KV.get<EncryptedBundle>(`project:${projectId}:bundle`, "json");
      if (!encrypted) return json(request, env, { ok: false, error: "No AegisCore bundle found for project." }, 404);
      const secrets = await decryptBundle(env, encrypted);
      const manifest = filterManifestByProviderConfig(buildSafeManifest(secrets, projectId), await getProjectProviderConfig(env, projectId));
      const plan = await getProjectPlan(env, projectId);
      const usedToday = await projectDailyUsageTotal(env, projectId);
      return json(request, env, { ok: true, project: safeProjectSummary(projectId, manifest, plan), manifest, plan, usedToday, remainingToday: Math.max(plan.dailyCallLimit - usedToday, 0), secrets_exposed: false });
    }

    if (url.pathname === "/v1/admin/keys" && request.method === "GET") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const projectId = url.searchParams.get("projectId") ?? "";
      if (!projectId) return json(request, env, { ok: false, error: "projectId is required." }, 400);
      const keys = await listKvJson<Record<string, unknown>>(env, `project:${projectId}:key:`, 1000);
      return json(request, env, { ok: true, projectId, keys, secrets_exposed: false });
    }

    if (url.pathname === "/v1/admin/events" && request.method === "GET") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const projectId = url.searchParams.get("projectId") ?? "global";
      const limit = Math.min(Number(url.searchParams.get("limit") || 50), 200);
      const events = await listKvJson<GatewayEvent>(env, `event:${projectId}:`, limit);
      events.sort((a, b) => b.at.localeCompare(a.at));
      return json(request, env, { ok: true, projectId, events, secrets_exposed: false });
    }

    if (url.pathname === "/v1/admin/usage" && request.method === "GET") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const projectId = url.searchParams.get("projectId") ?? "";
      if (!projectId) return json(request, env, { ok: false, error: "projectId is required." }, 400);
      const date = url.searchParams.get("date") ?? dayWindow();
      const listed = await env.AEGIS_KV.list({ prefix: `usage:${projectId}:${date}:`, limit: 1000 });
      const usage = [];
      for (const key of listed.keys) {
        const parts = key.name.split(":");
        usage.push({ projectId, date, capability: parts[3], status: parts[4], count: Number(await env.AEGIS_KV.get(key.name) || "0") });
      }
      return json(request, env, { ok: true, projectId, date, usage, secrets_exposed: false });
    }


    if (url.pathname === "/v1/admin/provider-packs" && request.method === "GET") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      return json(request, env, { ok: true, packs: PROVIDER_PACKS, secrets_exposed: false });
    }

    if (url.pathname === "/v1/admin/project-providers" && request.method === "GET") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const projectId = url.searchParams.get("projectId") ?? "";
      if (!projectId) return json(request, env, { ok: false, error: "projectId is required." }, 400);
      return json(request, env, { ok: true, projectId, providerConfig: await getProjectProviderConfig(env, projectId), packs: PROVIDER_PACKS, secrets_exposed: false });
    }

    if (url.pathname === "/v1/admin/set-provider" && request.method === "POST") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const body = await request.json<any>();
      if (!body.projectId || !body.provider || typeof body.enabled !== "boolean") return json(request, env, { ok: false, error: "projectId, provider, and enabled boolean are required." }, 400);
      const providerConfig = await setProjectProvider(env, { projectId: body.projectId, provider: body.provider, enabled: body.enabled, reason: body.reason });
      await logEvent(env, body.projectId, body.enabled ? "provider.enabled" : "provider.disabled", { provider: body.provider, reason: body.reason ?? null });
      return json(request, env, { ok: true, projectId: body.projectId, providerConfig, secrets_exposed: false });
    }

    if (url.pathname === "/v1/admin/policies" && request.method === "GET") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const projectId = url.searchParams.get("projectId") ?? "";
      if (!projectId) return json(request, env, { ok: false, error: "projectId is required." }, 400);
      return json(request, env, { ok: true, projectId, policies: await getPolicies(env, projectId), secrets_exposed: false });
    }

    if (url.pathname === "/v1/admin/policies" && request.method === "POST") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const body = await request.json<any>();
      if (!body.projectId || !Array.isArray(body.policies)) return json(request, env, { ok: false, error: "projectId and policies[] are required." }, 400);
      const policies = await setPolicies(env, body.projectId, body.policies);
      await logEvent(env, body.projectId, "policies.updated", { count: policies.length });
      return json(request, env, { ok: true, projectId: body.projectId, policies, secrets_exposed: false });
    }

    if (url.pathname === "/v1/admin/roles" && request.method === "GET") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const projectId = url.searchParams.get("projectId") ?? "";
      if (!projectId) return json(request, env, { ok: false, error: "projectId is required." }, 400);
      return json(request, env, { ok: true, projectId, roles: await getRoleConfig(env, projectId), secrets_exposed: false });
    }

    if (url.pathname === "/v1/admin/roles" && request.method === "POST") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const body = await request.json<ProjectRoleConfig>();
      if (!body.projectId || !body.roles) return json(request, env, { ok: false, error: "projectId and roles are required." }, 400);
      const roles = await setRoleConfig(env, body);
      await logEvent(env, body.projectId, "roles.updated", { roleNames: Object.keys(roles.roles) });
      return json(request, env, { ok: true, projectId: body.projectId, roles, secrets_exposed: false });
    }

    if (url.pathname === "/v1/admin/rotate-secret" && request.method === "POST") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const body = await request.json<any>();
      const projectId = body.projectId as string;
      const secretKey = body.secretKey as string;
      const secretValue = body.secretValue as string;
      if (!projectId || !secretKey || typeof secretValue !== "string") return json(request, env, { ok: false, error: "projectId, secretKey, and secretValue are required." }, 400);
      const encrypted = await env.AEGIS_KV.get<EncryptedBundle>(`project:${projectId}:bundle`, "json");
      if (!encrypted) return json(request, env, { ok: false, error: "No AegisCore bundle found for project." }, 404);
      const secrets = await decryptBundle(env, encrypted);
      const previousValueRedacted = redact(secrets[secretKey]);
      secrets[secretKey] = secretValue;
      await env.AEGIS_KV.put(`project:${projectId}:bundle`, JSON.stringify(await encryptBundle(env, secrets)));
      const receipt: SecretRotationReceipt = { rotationId: createProofId("rotation"), projectId, secretKey, rotatedAt: new Date().toISOString(), actor: actorFromRequest(request), reason: body.reason as string | undefined, previousValueRedacted, nextValueRedacted: redact(secretValue), secrets_exposed: false };
      await env.AEGIS_KV.put(`rotation:${projectId}:${receipt.rotatedAt}:${receipt.rotationId}`, JSON.stringify(receipt), { expirationTtl: 60 * 60 * 24 * 365 });
      await logEvent(env, projectId, "secret.rotated", { rotationId: receipt.rotationId, secretKey, actorId: receipt.actor?.id ?? null });
      return json(request, env, { ok: true, receipt, manifest: filterManifestByProviderConfig(buildSafeManifest(secrets, projectId), await getProjectProviderConfig(env, projectId)), secrets_exposed: false });
    }

    if (url.pathname === "/v1/admin/rotations" && request.method === "GET") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const projectId = url.searchParams.get("projectId") ?? "";
      if (!projectId) return json(request, env, { ok: false, error: "projectId is required." }, 400);
      const rotations = await listKvJson<SecretRotationReceipt>(env, `rotation:${projectId}:`, Math.min(Number(url.searchParams.get("limit") || 50), 200));
      rotations.sort((a, b) => b.rotatedAt.localeCompare(a.rotatedAt));
      return json(request, env, { ok: true, projectId, rotations, secrets_exposed: false });
    }



    if (url.pathname === "/v1/admin/approval-requests" && request.method === "GET") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const projectId = url.searchParams.get("projectId") ?? "";
      if (!projectId) return json(request, env, { ok: false, error: "projectId is required." }, 400);
      const approvals = await listKvJson<ApprovalRequestRecord>(env, `approval:${projectId}:`, Math.min(Number(url.searchParams.get("limit") || 50), 200));
      approvals.sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
      return json(request, env, { ok: true, projectId, approvals, secrets_exposed: false });
    }

    if (url.pathname === "/v1/admin/approve-request" && request.method === "POST") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const body = await request.json<any>();
      if (!body.projectId || !body.requestId || !["approve", "deny"].includes(body.action)) return json(request, env, { ok: false, error: "projectId, requestId, and action approve|deny are required." }, 400);
      const record = await env.AEGIS_KV.get<ApprovalRequestRecord>(`approval:${body.projectId}:${body.requestId}`, "json");
      if (!record) return json(request, env, { ok: false, error: "Approval request not found." }, 404);
      if (record.status !== "pending") return json(request, env, { ok: false, error: `Approval request is already ${record.status}.` }, 409);
      if (record.expiresAt && Date.parse(record.expiresAt) <= Date.now()) {
        const expired: ApprovalRequestRecord = { ...record, status: "expired" };
        await env.AEGIS_KV.put(`approval:${body.projectId}:${body.requestId}`, JSON.stringify(expired), { expirationTtl: 60 * 60 * 24 * 30 });
        return json(request, env, { ok: false, error: "Approval request expired.", approval: expired, secrets_exposed: false }, 409);
      }
      if (body.action === "deny") {
        const denied: ApprovalRequestRecord = { ...record, status: "denied", deniedAt: new Date().toISOString(), deniedBy: actorFromRequest(request) };
        await env.AEGIS_KV.put(`approval:${body.projectId}:${body.requestId}`, JSON.stringify(denied), { expirationTtl: 60 * 60 * 24 * 30 });
        await logEvent(env, body.projectId, "approval.denied", { requestId: body.requestId, capability: record.capability });
        return json(request, env, { ok: true, approval: denied, secrets_exposed: false });
      }
      const approvalToken = createApiKey("skye_approval");
      const approved: ApprovalRequestRecord = { ...record, status: "approved", approvedAt: new Date().toISOString(), approvedBy: actorFromRequest(request), approvalTokenHash: await sha256(approvalToken) };
      await env.AEGIS_KV.put(`approval:${body.projectId}:${body.requestId}`, JSON.stringify(approved), { expirationTtl: 60 * 60 * 24 * 30 });
      await logEvent(env, body.projectId, "approval.approved", { requestId: body.requestId, capability: record.capability });
      return json(request, env, { ok: true, approval: { ...approved, approvalTokenHash: undefined }, approvalToken, usage: "Call the same capability with original input plus approvalRequestId and approvalToken. Token is returned once.", secrets_exposed: false });
    }

    if (url.pathname === "/v1/admin/snapshots" && request.method === "GET") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const projectId = url.searchParams.get("projectId") ?? "";
      if (!projectId) return json(request, env, { ok: false, error: "projectId is required." }, 400);
      const snapshots = await listKvJson<ProjectConfigSnapshot>(env, `snapshot:${projectId}:`, Math.min(Number(url.searchParams.get("limit") || 50), 200));
      snapshots.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return json(request, env, { ok: true, projectId, snapshots, secrets_exposed: false });
    }

    if (url.pathname === "/v1/admin/create-snapshot" && request.method === "POST") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const body = await request.json<any>();
      if (!body.projectId) return json(request, env, { ok: false, error: "projectId is required." }, 400);
      const snapshot = await createProjectSnapshot(request, env, body.projectId, body.reason as string | undefined);
      return json(request, env, { ok: true, snapshot, secrets_exposed: false });
    }

    if (url.pathname === "/v1/admin/restore-snapshot" && request.method === "POST") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const body = await request.json<any>();
      if (!body.projectId || !body.snapshotId) return json(request, env, { ok: false, error: "projectId and snapshotId are required." }, 400);
      const snapshots = await listKvJson<ProjectConfigSnapshot>(env, `snapshot:${body.projectId}:`, 200);
      const snapshot = snapshots.find((item) => item.id === body.snapshotId);
      if (!snapshot) return json(request, env, { ok: false, error: "Snapshot not found." }, 404);
      await createProjectSnapshot(request, env, body.projectId, `pre-restore backup before ${body.snapshotId}`);
      await restoreProjectSnapshot(env, snapshot);
      await logEvent(env, body.projectId, "config.snapshot_restored", { snapshotId: body.snapshotId });
      return json(request, env, { ok: true, restored: snapshot, secrets_exposed: false });
    }

    if (url.pathname === "/v1/admin/workflow-runs" && request.method === "GET") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const projectId = url.searchParams.get("projectId") ?? "";
      if (!projectId) return json(request, env, { ok: false, error: "projectId is required." }, 400);
      const runs = await listKvJson<WorkflowRunRecord>(env, `workflow-run:${projectId}:`, Math.min(Number(url.searchParams.get("limit") || 50), 200));
      runs.sort((a, b) => b.finishedAt.localeCompare(a.finishedAt));
      return json(request, env, { ok: true, projectId, runs: runs.map(workflowRunSummary), details: url.searchParams.get("details") === "true" ? runs : undefined, secrets_exposed: false });
    }

    if (url.pathname === "/v1/admin/webhook-events" && request.method === "GET") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const projectId = url.searchParams.get("projectId") ?? "";
      if (!projectId) return json(request, env, { ok: false, error: "projectId is required." }, 400);
      const events = await listKvJson<WebhookEventRecord>(env, `webhook:${projectId}:`, Math.min(Number(url.searchParams.get("limit") || 50), 200));
      events.sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
      return json(request, env, { ok: true, projectId, events, secrets_exposed: false });
    }

    if (url.pathname === "/v1/admin/replay-webhook" && request.method === "POST") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const body = await request.json<any>();
      if (!body.projectId || !body.eventId) return json(request, env, { ok: false, error: "projectId and eventId are required." }, 400);
      const record = await env.AEGIS_KV.get<WebhookEventRecord>(`webhook:${body.projectId}:${body.eventId}`, "json");
      if (!record) return json(request, env, { ok: false, error: "Webhook event not found." }, 404);
      const next = { ...record, replayCount: record.replayCount + 1, lastReplayedAt: new Date().toISOString() };
      await env.AEGIS_KV.put(`webhook:${body.projectId}:${body.eventId}`, JSON.stringify(next), { expirationTtl: 60 * 60 * 24 * 90 });
      await logEvent(env, body.projectId, "webhook.replayed", { eventId: body.eventId, provider: record.provider, replayCount: next.replayCount });
      return json(request, env, { ok: true, replay: next, note: "Replay records the event for downstream processing; it does not fake delivery to external provider endpoints.", secrets_exposed: false });
    }



    if (url.pathname === "/v1/admin/ops-readiness" && request.method === "GET") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      return json(request, env, { ok: true, readiness: runOpsReadiness({ hasJobRoutes: true, hasOutboundRoutes: true, hasDoctorRoute: true, hasAnomalyRoute: true, hasProviderPackCertification: true }), secrets_exposed: false });
    }

    if (url.pathname === "/v1/admin/doctor" && request.method === "GET") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const projectId = url.searchParams.get("projectId") ?? "";
      if (!projectId) return json(request, env, { ok: false, error: "projectId is required." }, 400);
      const encrypted = await env.AEGIS_KV.get<EncryptedBundle>(`project:${projectId}:bundle`, "json");
      const secrets = encrypted ? await decryptBundle(env, encrypted) : {};
      const manifest = encrypted ? filterManifestByProviderConfig(buildSafeManifest(secrets, projectId), await getProjectProviderConfig(env, projectId)) : undefined;
      const report = runDeveloperDoctor({ manifest, policies: await getPolicies(env, projectId), packageScripts: { proof: "pnpm proof", "truth-gate": "pnpm truth-gate" } });
      return json(request, env, { ok: report.ok, projectId, report, secrets_exposed: false });
    }

    if (url.pathname === "/v1/admin/anomalies" && request.method === "GET") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const projectId = url.searchParams.get("projectId") ?? "";
      if (!projectId) return json(request, env, { ok: false, error: "projectId is required." }, 400);
      const date = url.searchParams.get("date") ?? dayWindow();
      const samples = await usageSamplesForAnomalies(env, projectId, date);
      const findings = detectUsageAnomalies(samples, { maxFailureRate: Number(url.searchParams.get("maxFailureRate") || 0.2), maxCapabilityCalls: Number(url.searchParams.get("maxCapabilityCalls") || 1000) });
      return json(request, env, { ok: !findings.some((finding) => finding.severity === "critical"), projectId, date, samples, findings, secrets_exposed: false });
    }

    if (url.pathname === "/v1/admin/jobs" && request.method === "GET") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const projectId = url.searchParams.get("projectId") ?? "";
      if (!projectId) return json(request, env, { ok: false, error: "projectId is required." }, 400);
      const jobs = await new DurableAsyncJobQueue(opsStore(env)).list(projectId);
      return json(request, env, { ok: true, projectId, jobs, secrets_exposed: false });
    }

    if ((url.pathname === "/v1/admin/jobs" || url.pathname === "/v1/admin/enqueue-job") && request.method === "POST") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const body = await request.json<any>();
      if (!body.projectId || !body.envelope?.capability) return json(request, env, { ok: false, error: "projectId and envelope.capability are required." }, 400);
      const job = await new DurableAsyncJobQueue(opsStore(env)).enqueue({ projectId: body.projectId, envelope: body.envelope, actor: actorFromRequest(request), notBefore: body.notBefore, maxAttempts: body.maxAttempts, retryPolicy: body.retryPolicy });
      await logEvent(env, body.projectId, "job.queued", { jobId: job.id, capability: job.envelope.capability });
      return json(request, env, { ok: true, job, secrets_exposed: false }, 202);
    }

    if (url.pathname === "/v1/admin/process-job" && request.method === "POST") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const body = await request.json<any>();
      if (!body.projectId) return json(request, env, { ok: false, error: "projectId is required." }, 400);
      const queue = new DurableAsyncJobQueue(opsStore(env));
      const job = await queue.executeNext(body.projectId, (record) => runJobExecutor(request, env, record));
      if (!job) return json(request, env, { ok: true, projectId: body.projectId, job: null, message: "No queued job ready.", secrets_exposed: false });
      await logEvent(env, body.projectId, "job.processed", { jobId: job.id, status: job.status, capability: job.envelope.capability });
      return json(request, env, { ok: true, job, secrets_exposed: false });
    }



    if (url.pathname === "/v1/admin/claim-job-lease" && request.method === "POST") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const body = await request.json<any>();
      if (!body.projectId) return json(request, env, { ok: false, error: "projectId is required." }, 400);
      const claim = await claimDurableJobLease(opsStore(env), { projectId: body.projectId, leaseMs: body.leaseMs, actor: actorFromRequest(request) });
      if (claim.lease) await logEvent(env, body.projectId, "job.lease_claimed", { jobId: claim.lease.jobId, leaseId: claim.lease.id, expiresAt: claim.lease.expiresAt });
      return json(request, env, claim, claim.lease ? 200 : 204);
    }

    if (url.pathname === "/v1/admin/complete-job-lease" && request.method === "POST") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const body = await request.json<any>();
      if (!body.projectId || !body.jobId || !body.leaseToken || !body.result) return json(request, env, { ok: false, error: "projectId, jobId, leaseToken, and result are required." }, 400);
      const completed = await completeDurableJobLease(opsStore(env), { projectId: body.projectId, jobId: body.jobId, leaseToken: body.leaseToken, result: body.result });
      if (completed.ok) await logEvent(env, body.projectId, "job.lease_completed", { jobId: body.jobId, status: completed.job?.status });
      return json(request, env, completed, completed.ok ? 200 : 409);
    }

    if (url.pathname === "/v1/admin/cancel-job" && request.method === "POST") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const body = await request.json<any>();
      if (!body.projectId || !body.jobId) return json(request, env, { ok: false, error: "projectId and jobId are required." }, 400);
      const found = await findOpsJob(env, body.projectId, body.jobId);
      if (!found) return json(request, env, { ok: false, error: "Job not found." }, 404);
      const cancelled = { ...found.value, status: "cancelled" as const, updatedAt: new Date().toISOString(), lastError: { code: "cancelled", message: body.reason || "Cancelled by admin." } };
      await opsStore(env).put(found.key, cancelled);
      await logEvent(env, body.projectId, "job.cancelled", { jobId: body.jobId, reason: body.reason ?? null });
      return json(request, env, { ok: true, job: cancelled, secrets_exposed: false });
    }

    if (url.pathname === "/v1/admin/outbound-subscriptions" && request.method === "GET") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const projectId = url.searchParams.get("projectId") ?? "";
      if (!projectId) return json(request, env, { ok: false, error: "projectId is required." }, 400);
      const subscriptions = await new DurableOutboundWebhookHub(opsStore(env)).listSubscriptions(projectId);
      return json(request, env, { ok: true, projectId, subscriptions, secrets_exposed: false });
    }

    if (url.pathname === "/v1/admin/outbound-subscriptions" && request.method === "POST") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const body = await request.json<any>();
      if (!body.projectId || !body.url || !Array.isArray(body.events)) return json(request, env, { ok: false, error: "projectId, url, and events[] are required." }, 400);
      const subscription = await new DurableOutboundWebhookHub(opsStore(env)).subscribe({ projectId: body.projectId, url: body.url, events: body.events, headers: body.headers, enabled: body.enabled, secretRef: body.secretRef, maxAttempts: body.maxAttempts, description: body.description });
      await logEvent(env, body.projectId, "outbound.subscription_created", { subscriptionId: subscription.id, events: subscription.events });
      return json(request, env, { ok: true, subscription, secrets_exposed: false }, 201);
    }

    if (url.pathname === "/v1/admin/outbound-events" && request.method === "POST") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const body = await request.json<any>();
      if (!body.projectId || !body.eventType) return json(request, env, { ok: false, error: "projectId and eventType are required." }, 400);
      const deliveries = await new DurableOutboundWebhookHub(opsStore(env)).enqueueEvent(body.projectId, body.eventType, body.payload ?? {});
      await logEvent(env, body.projectId, "outbound.event_queued", { eventType: body.eventType, deliveryCount: deliveries.length });
      return json(request, env, { ok: true, deliveries, secrets_exposed: false }, 202);
    }

    if (url.pathname === "/v1/admin/outbound-deliveries" && request.method === "GET") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const projectId = url.searchParams.get("projectId") ?? "";
      if (!projectId) return json(request, env, { ok: false, error: "projectId is required." }, 400);
      const deliveries = await new DurableOutboundWebhookHub(opsStore(env)).listDeliveries(projectId);
      return json(request, env, { ok: true, projectId, deliveries, secrets_exposed: false });
    }

    if (url.pathname === "/v1/admin/process-outbound" && request.method === "POST") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const body = await request.json<any>();
      if (!body.projectId) return json(request, env, { ok: false, error: "projectId is required." }, 400);
      const encrypted = await env.AEGIS_KV.get<EncryptedBundle>(`project:${body.projectId}:bundle`, "json");
      const secrets = encrypted ? await decryptBundle(env, encrypted) : {};
      const deliveries = await new DurableOutboundWebhookHub(opsStore(env)).processQueued(body.projectId, fetch, secrets);
      await logEvent(env, body.projectId, "outbound.processed", { processed: deliveries.length });
      return json(request, env, { ok: true, deliveries, note: "This endpoint performs real outbound HTTP delivery to configured HTTPS subscriber URLs.", secrets_exposed: false });
    }

    if (url.pathname === "/v1/admin/provider-pack-scaffold" && request.method === "POST") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const body = await request.json<any>();
      const result = createProviderPackScaffold({ provider: body.provider, label: body.label, capabilities: body.capabilities ?? [], requiredSecrets: body.requiredSecrets ?? [], optionalSecrets: body.optionalSecrets ?? [], category: body.category ?? "system" });
      return json(request, env, { ok: result.ok, result, secrets_exposed: false }, result.ok ? 200 : 400);
    }

    if (url.pathname === "/v1/admin/provider-pack-certify" && request.method === "POST") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const body = await request.json<any>();
      const report = certifyProviderPackDefinition(body.pack ?? body);
      return json(request, env, { ok: report.ok, report, secrets_exposed: false }, report.ok ? 200 : 422);
    }





    if (url.pathname === "/v1/admin/provider-pack-dependencies" && request.method === "POST") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const body = await request.json<any>();
      const registry = await new ProviderPackRegistry(opsStore(env)).list();
      const report = validateProviderPackDependencies(body.pack ?? body, registry);
      return json(request, env, { ok: report.ok, report, secrets_exposed: false }, report.ok ? 200 : 422);
    }

    if (url.pathname === "/v1/admin/provider-pack-sign" && request.method === "POST") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const body = await request.json<any>();
      if (!body.pack || !body.signer) return json(request, env, { ok: false, error: "pack and signer are required." }, 400);
      const manifest = await createSignedProviderPackManifest({ pack: body.pack, versionTag: body.versionTag, signer: body.signer, signingSecret: env.AEGIS_MASTER_KEY });
      return json(request, env, { ok: manifest.certification.ok, manifest, secrets_exposed: false }, manifest.certification.ok ? 200 : 422);
    }

    if (url.pathname === "/v1/admin/provider-pack-verify" && request.method === "POST") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const body = await request.json<any>();
      if (!body.pack || !body.manifest) return json(request, env, { ok: false, error: "pack and manifest are required." }, 400);
      const report = await verifySignedProviderPackManifest({ pack: body.pack, manifest: body.manifest, signingSecret: env.AEGIS_MASTER_KEY });
      return json(request, env, report, report.ok ? 200 : 422);
    }

    if (url.pathname === "/v1/admin/dead-letter-jobs" && request.method === "GET") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const projectId = url.searchParams.get("projectId") ?? "";
      if (!projectId) return json(request, env, { ok: false, error: "projectId is required." }, 400);
      const deadLetters = await new DurableAsyncJobQueue(opsStore(env)).listDeadLetters(projectId);
      return json(request, env, { ok: true, projectId, deadLetters, secrets_exposed: false });
    }

    if (url.pathname === "/v1/admin/retry-dead-letter-job" && request.method === "POST") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const body = await request.json<any>();
      if (!body.projectId || !body.jobId) return json(request, env, { ok: false, error: "projectId and jobId are required." }, 400);
      const job = await new DurableAsyncJobQueue(opsStore(env)).retryDeadLetter(body.projectId, body.jobId);
      if (!job) return json(request, env, { ok: false, error: "Dead-lettered job not found." }, 404);
      await logEvent(env, body.projectId, "job.dead_letter_retried", { jobId: body.jobId });
      return json(request, env, { ok: true, job, secrets_exposed: false });
    }

    if (url.pathname === "/v1/admin/update-outbound-subscription" && request.method === "POST") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const body = await request.json<any>();
      if (!body.projectId || !body.subscriptionId) return json(request, env, { ok: false, error: "projectId and subscriptionId are required." }, 400);
      const subscription = await new DurableOutboundWebhookHub(opsStore(env)).updateSubscription({ projectId: body.projectId, subscriptionId: body.subscriptionId, url: body.url, events: body.events, headers: body.headers, enabled: body.enabled, secretRef: body.secretRef, maxAttempts: body.maxAttempts, description: body.description });
      if (!subscription) return json(request, env, { ok: false, error: "Outbound subscription not found." }, 404);
      await logEvent(env, body.projectId, "outbound.subscription_updated", { subscriptionId: body.subscriptionId });
      return json(request, env, { ok: true, subscription, secrets_exposed: false });
    }

    if (url.pathname === "/v1/admin/delete-outbound-subscription" && request.method === "POST") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const body = await request.json<any>();
      if (!body.projectId || !body.subscriptionId) return json(request, env, { ok: false, error: "projectId and subscriptionId are required." }, 400);
      const deleted = await new DurableOutboundWebhookHub(opsStore(env)).deleteSubscription(body.projectId, body.subscriptionId);
      if (!deleted) return json(request, env, { ok: false, error: "Outbound subscription not found." }, 404);
      await logEvent(env, body.projectId, "outbound.subscription_deleted", { subscriptionId: body.subscriptionId });
      return json(request, env, { ok: true, deleted: true, secrets_exposed: false });
    }

    if (url.pathname === "/v1/admin/dead-letter-outbound" && request.method === "GET") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const projectId = url.searchParams.get("projectId") ?? "";
      if (!projectId) return json(request, env, { ok: false, error: "projectId is required." }, 400);
      const deadLetters = await new DurableOutboundWebhookHub(opsStore(env)).listDeadLetters(projectId);
      return json(request, env, { ok: true, projectId, deadLetters, secrets_exposed: false });
    }

    if (url.pathname === "/v1/admin/provider-pack-registry" && request.method === "GET") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const registry = new ProviderPackRegistry(opsStore(env));
      return json(request, env, { ok: true, registry: await registry.list(), secrets_exposed: false });
    }

    if (url.pathname === "/v1/admin/provider-pack-registry" && request.method === "POST") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const body = await request.json<any>();
      const registry = new ProviderPackRegistry(opsStore(env));
      const record = await registry.publish({ pack: body.pack ?? body, versionTag: body.versionTag, status: body.status });
      await logEvent(env, undefined, "provider_pack.published", { provider: record.provider, versionTag: record.versionTag, status: record.status });
      return json(request, env, { ok: record.status === "certified", record, secrets_exposed: false }, record.status === "rejected" ? 422 : 200);
    }

    if (url.pathname === "/v1/admin/install-provider-pack" && request.method === "POST") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const body = await request.json<any>();
      if (!body.projectId || !body.registryId) return json(request, env, { ok: false, error: "projectId and registryId are required." }, 400);
      const registry = new ProviderPackRegistry(opsStore(env));
      const receipt = await registry.install(body.projectId, body.registryId, body.enabled !== false);
      if (!receipt) return json(request, env, { ok: false, error: "Certified provider pack registry record not found." }, 404);
      await setProjectProvider(env, { projectId: body.projectId, provider: receipt.provider, enabled: receipt.enabled, reason: `installed registry ${receipt.registryId}` });
      await logEvent(env, body.projectId, "provider_pack.installed", { provider: receipt.provider, registryId: receipt.registryId, enabled: receipt.enabled });
      return json(request, env, { ok: true, receipt, providerConfig: await getProjectProviderConfig(env, body.projectId), secrets_exposed: false });
    }

    if (url.pathname === "/v1/admin/provider-pack-installations" && request.method === "GET") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const projectId = url.searchParams.get("projectId") ?? "";
      if (!projectId) return json(request, env, { ok: false, error: "projectId is required." }, 400);
      const registry = new ProviderPackRegistry(opsStore(env));
      return json(request, env, { ok: true, projectId, installations: await registry.installations(projectId), secrets_exposed: false });
    }

    if (url.pathname === "/v1/admin/billing-usage" && request.method === "GET") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const projectId = url.searchParams.get("projectId") ?? "";
      if (!projectId) return json(request, env, { ok: false, error: "projectId is required." }, 400);
      const date = url.searchParams.get("date") ?? dayWindow();
      const samples = await usageSamplesForAnomalies(env, projectId, date);
      const records = buildBillingUsageRecords(samples);
      return json(request, env, { ok: true, projectId, date, records, summary: summarizeBillingUsage(records), note: "Estimated usage ledger for plan/billing reconciliation; this is not Stripe subscription collection.", secrets_exposed: false });
    }





    if (url.pathname === "/v1/admin/install-provider-pack-source" && request.method === "POST") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const body = await request.json<any>();
      if (!body.projectId || !body.pack) return json(request, env, { ok: false, error: "projectId and pack are required." }, 400);
      const sourceReceipt = await createProviderPackSourceInstallReceipt({ projectId: body.projectId, pack: body.pack, sourceType: body.sourceType, sourceUri: body.sourceUri, versionTag: body.versionTag });
      if (!sourceReceipt.installable) return json(request, env, { ok: false, sourceReceipt, error: "Provider pack source failed certification.", secrets_exposed: false }, 422);
      const registry = new ProviderPackRegistry(opsStore(env));
      const record = await registry.publish({ pack: body.pack, versionTag: sourceReceipt.versionTag, status: "certified" });
      const receipt = await registry.install(body.projectId, record.id, body.enabled !== false);
      if (receipt) await setProjectProvider(env, { projectId: body.projectId, provider: receipt.provider, enabled: receipt.enabled, reason: `source install ${sourceReceipt.sourceType}:${sourceReceipt.sourceUri ?? "inline"}` });
      await logEvent(env, body.projectId, "provider_pack.source_installed", { provider: sourceReceipt.provider, sourceType: sourceReceipt.sourceType, registryId: record.id, installId: receipt?.id ?? null });
      return json(request, env, { ok: true, sourceReceipt, record, receipt, providerConfig: await getProjectProviderConfig(env, body.projectId), secrets_exposed: false });
    }

    if (url.pathname === "/v1/admin/provider-pack-certification-receipt" && request.method === "POST") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const body = await request.json<any>();
      if (!body.pack) return json(request, env, { ok: false, error: "pack is required." }, 400);
      const receipt = await createProviderPackCertificationReceipt({ pack: body.pack, versionTag: body.versionTag, signer: body.signer, signingSecret: body.signer ? env.AEGIS_MASTER_KEY : undefined });
      return json(request, env, { ok: receipt.certified, receipt, secrets_exposed: false }, receipt.certified ? 200 : 422);
    }

    if (url.pathname === "/v1/admin/billing-invoice" && request.method === "GET") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const projectId = url.searchParams.get("projectId") ?? "";
      if (!projectId) return json(request, env, { ok: false, error: "projectId is required." }, 400);
      const date = url.searchParams.get("date") ?? dayWindow();
      const samples = await usageSamplesForAnomalies(env, projectId, date);
      const records = buildBillingUsageRecords(samples);
      const invoice = createBillingInvoiceDraft({ projectId, records, window: date, customerName: url.searchParams.get("customerName") ?? undefined, customerEmail: url.searchParams.get("customerEmail") ?? undefined });
      return json(request, env, { ok: true, invoice, records, secrets_exposed: false });
    }

    if (url.pathname === "/v1/admin/billing-invoice-export" && request.method === "GET") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const projectId = url.searchParams.get("projectId") ?? "";
      if (!projectId) return json(request, env, { ok: false, error: "projectId is required." }, 400);
      const date = url.searchParams.get("date") ?? dayWindow();
      const format = url.searchParams.get("format") ?? "json";
      const samples = await usageSamplesForAnomalies(env, projectId, date);
      const invoice = createBillingInvoiceDraft({ projectId, records: buildBillingUsageRecords(samples), window: date });
      const artifact = format === "csv" ? exportBillingInvoiceCsv(invoice) : exportBillingInvoiceJson(invoice);
      const headers = new Headers(securityHeaders(request, env));
      headers.set("content-type", format === "csv" ? "text/csv; charset=utf-8" : "application/json; charset=utf-8");
      return new Response(artifact, { status: 200, headers });
    }

    if (url.pathname === "/v1/admin/billing-usage-export" && request.method === "GET") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const projectId = url.searchParams.get("projectId") ?? "";
      if (!projectId) return json(request, env, { ok: false, error: "projectId is required." }, 400);
      const date = url.searchParams.get("date") ?? dayWindow();
      const format = url.searchParams.get("format") ?? "csv";
      const samples = await usageSamplesForAnomalies(env, projectId, date);
      const records = buildBillingUsageRecords(samples);
      const artifact = format === "jsonl" ? exportBillingUsageJsonl(records) : exportBillingUsageCsv(records);
      const headers = new Headers(securityHeaders(request, env));
      headers.set("content-type", format === "jsonl" ? "application/x-ndjson; charset=utf-8" : "text/csv; charset=utf-8");
      return new Response(artifact, { status: 200, headers });
    }



    if (url.pathname === "/v1/admin/provider-pack-load-source" && request.method === "POST") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const body = await request.json<any>();
      if (!body.sourceType) return json(request, env, { ok: false, error: "sourceType is required." }, 400);
      if (body.sourceType !== "inline") return json(request, env, { ok: false, error: "Hosted Worker source loading only supports inline packs. Use the CLI/local loader for directory, zip, or git source extraction." }, 422);
      const loaded = await loadProviderPackFromSource({ sourceType: "inline", inlinePack: body.pack, versionTag: body.versionTag });
      return json(request, env, { ok: loaded.certification.ok, loaded, secrets_exposed: false }, loaded.certification.ok ? 200 : 422);
    }

    if (url.pathname === "/v1/admin/provider-fixture-certification" && request.method === "POST") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const body = await request.json<any>();
      if (!body.provider || !body.capability || !body.endpoint) return json(request, env, { ok: false, error: "provider, capability, and endpoint are required." }, 400);
      const certification = await runProviderFixtureCertification({ provider: body.provider, capability: body.capability, endpoint: body.endpoint, mode: body.mode, fetchImpl: fetch, timeoutMs: body.timeoutMs });
      return json(request, env, { ok: certification.ok, certification, secrets_exposed: false }, certification.ok ? 200 : 422);
    }

    if (url.pathname === "/v1/admin/provider-pack-sandbox" && request.method === "POST") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const body = await request.json<any>();
      if (!body.pack) return json(request, env, { ok: false, error: "pack is required." }, 400);
      const report = await runProviderPackSandbox({ pack: body.pack, adapterSource: body.adapterSource, sampleInputs: body.sampleInputs });
      return json(request, env, { ok: report.ok, report, secrets_exposed: false }, report.ok ? 200 : 422);
    }

    if (url.pathname === "/v1/admin/billing-invoice-create" && request.method === "POST") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const body = await request.json<any>();
      const projectId = body.projectId ?? "";
      if (!projectId) return json(request, env, { ok: false, error: "projectId is required." }, 400);
      const date = body.date ?? dayWindow();
      const samples = await usageSamplesForAnomalies(env, projectId, date);
      const invoice = createBillingInvoiceDraft({ projectId, records: buildBillingUsageRecords(samples), window: date, customerName: body.customerName, customerEmail: body.customerEmail, dueDays: body.dueDays });
      const record = await persistBillingInvoice(opsStore(env), invoice, { actorId: request.headers.get("x-skye-actor-id") ?? undefined, note: body.note });
      return json(request, env, { ok: true, invoice: record, secrets_exposed: false });
    }

    if (url.pathname === "/v1/admin/billing-invoice-reconcile" && request.method === "POST") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const body = await request.json<any>();
      if (!body.projectId || !body.invoiceId) return json(request, env, { ok: false, error: "projectId and invoiceId are required." }, 400);
      const invoices = await listBillingInvoices(opsStore(env), body.projectId);
      const invoice = invoices.find((item) => item.id === body.invoiceId);
      if (!invoice) return json(request, env, { ok: false, error: "Invoice not found." }, 404);
      const date = body.date ?? invoice.window ?? dayWindow();
      const samples = await usageSamplesForAnomalies(env, body.projectId, date);
      const reconciliation = reconcileInvoiceWithUsage(invoice, buildBillingUsageRecords(samples));
      return json(request, env, { ok: reconciliation.ok, reconciliation, secrets_exposed: false }, reconciliation.ok ? 200 : 409);
    }

    if (url.pathname === "/v1/admin/billing-invoices" && request.method === "GET") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const projectId = url.searchParams.get("projectId") ?? "";
      if (!projectId) return json(request, env, { ok: false, error: "projectId is required." }, 400);
      const invoices = await listBillingInvoices(opsStore(env), projectId);
      return json(request, env, { ok: true, invoices, secrets_exposed: false });
    }

    if (url.pathname === "/v1/admin/billing-invoice-status" && request.method === "POST") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const body = await request.json<any>();
      const result = await updateBillingInvoiceStatus(opsStore(env), { projectId: body.projectId, invoiceId: body.invoiceId, status: body.status, actorId: request.headers.get("x-skye-actor-id") ?? body.actorId, note: body.note });
      return json(request, env, result, result.ok ? 200 : 404);
    }

    if (url.pathname === "/v1/admin/subscriptions" && request.method === "POST") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const body = await request.json<any>();
      if (!body.projectId || !body.plan) return json(request, env, { ok: false, error: "projectId and plan are required." }, 400);
      const draft = createPlanSubscriptionDraft({ projectId: body.projectId, plan: body.plan, customerEmail: body.customerEmail, billingCycle: body.billingCycle, basePriceCents: body.basePriceCents, includedCalls: body.includedCalls, overageUnitPriceCents: body.overageUnitPriceCents, trialDays: body.trialDays });
      const subscription = await persistPlanSubscription(opsStore(env), draft, { actorId: request.headers.get("x-skye-actor-id") ?? body.actorId, note: body.note, paymentProvider: body.paymentProvider, paymentProviderCustomerId: body.paymentProviderCustomerId, paymentProviderSubscriptionId: body.paymentProviderSubscriptionId, paymentProviderPriceId: body.paymentProviderPriceId });
      return json(request, env, { ok: true, subscription, secrets_exposed: false });
    }

    if (url.pathname === "/v1/admin/subscription-lifecycle" && request.method === "POST") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const body = await request.json<any>();
      if (!body.projectId || !body.subscriptionId || !body.action) return json(request, env, { ok: false, error: "projectId, subscriptionId, and action are required." }, 400);
      const result = await updatePlanSubscriptionLifecycle(opsStore(env), { projectId: body.projectId, subscriptionId: body.subscriptionId, action: body.action, plan: body.plan, status: body.status, actorId: request.headers.get("x-skye-actor-id") ?? body.actorId, note: body.note, paymentProvider: body.paymentProvider, paymentProviderCustomerId: body.paymentProviderCustomerId, paymentProviderSubscriptionId: body.paymentProviderSubscriptionId, paymentProviderPriceId: body.paymentProviderPriceId });
      return json(request, env, result, result.ok ? 200 : 404);
    }

    if (url.pathname === "/v1/admin/subscriptions" && request.method === "GET") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const projectId = url.searchParams.get("projectId") ?? "";
      if (!projectId) return json(request, env, { ok: false, error: "projectId is required." }, 400);
      const subscriptions = (await opsStore(env).list<any>(`subscription:${projectId}:`)).map((row) => row.value);
      return json(request, env, { ok: true, subscriptions, secrets_exposed: false });
    }

    if (url.pathname === "/v1/admin/workspace-bindings" && request.method === "POST") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const body = await request.json<any>();
      if (!body.workspaceId || !body.projectId) return json(request, env, { ok: false, error: "workspaceId and projectId are required." }, 400);
      const binding: WorkspaceProjectBinding = { version: "skyeapi.workspace-project-binding.v1", workspaceId: body.workspaceId, projectId: body.projectId, roles: Array.isArray(body.roles) ? body.roles : ["owner"], createdAt: new Date().toISOString(), secrets_exposed: false };
      await opsStore(env).put(`workspace-binding:${body.workspaceId}:${body.projectId}`, binding);
      return json(request, env, { ok: true, binding, secrets_exposed: false });
    }

    if (url.pathname === "/v1/admin/workspace-bindings" && request.method === "GET") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const workspaceId = url.searchParams.get("workspaceId") ?? "";
      const prefix = workspaceId ? `workspace-binding:${workspaceId}:` : "workspace-binding:";
      const bindings = (await opsStore(env).list<WorkspaceProjectBinding>(prefix)).map((row) => row.value);
      return json(request, env, { ok: true, bindings, secrets_exposed: false });
    }

    if (url.pathname === "/v1/admin/workspace-access-check" && request.method === "POST") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const body = await request.json<any>();
      const bindings = (await opsStore(env).list<WorkspaceProjectBinding>("workspace-binding:")).map((row) => row.value);
      const decision = evaluateWorkspaceProjectAccess({ bindings, workspaceId: body.workspaceId, projectId: body.projectId, role: body.role, capability: body.capability, roleCapabilities: body.roleCapabilities });
      return json(request, env, { ok: decision.ok, decision, secrets_exposed: false }, decision.ok ? 200 : 403);
    }

    if (url.pathname === "/v1/admin/audit-export" && request.method === "GET") {
      const blocked = requireAdmin(request, env);
      if (blocked) return blocked;
      const projectId = url.searchParams.get("projectId") ?? "";
      if (!projectId) return json(request, env, { ok: false, error: "projectId is required." }, 400);
      const store = opsStore(env);
      const sections: Record<string, unknown[]> = {
        gatewayEvents: (await env.AEGIS_KV.list({ prefix: `event:${projectId}:`, limit: 1000 })).keys.map((key) => ({ key: key.name })),
        approvals: (await env.AEGIS_KV.list({ prefix: `approval:${projectId}:`, limit: 1000 })).keys.map((key) => ({ key: key.name })),
        jobs: (await store.list<any>(`job:${projectId}:`)).map((row) => row.value),
        workflowRuns: (await env.AEGIS_KV.list({ prefix: `workflow-run:${projectId}:`, limit: 1000 })).keys.map((key) => ({ key: key.name })),
        outboundDeliveries: (await store.list<any>(`outbound-delivery:${projectId}:`)).map((row) => row.value),
        invoices: (await listBillingInvoices(store, projectId)),
        providerInstalls: (await store.list<any>(`pack-install:${projectId}:`)).map((row) => row.value),
        subscriptions: (await store.list<any>(`subscription:${projectId}:`)).map((row) => row.value)
      };
      const bundle = await createAuditExportBundle({ projectId, sections });
      return json(request, env, { ok: true, bundle, secrets_exposed: false });
    }

    if (url.pathname === "/v1/capabilities" && request.method === "GET") {
      const auth = await authenticate(request, env);
      if (auth instanceof Response) return auth;
      if (!auth.scopes.includes("manifest:read") && !auth.scopes.includes("*")) return json(request, env, { ok: false, error: "Missing manifest:read scope." }, 403);
      const plan = await getProjectPlan(env, auth.projectId);
      const limited = await rateLimit(request, env, auth.keyHash, plan.rateLimitPerMinute);
      if (limited) return limited;
      const encrypted = await env.AEGIS_KV.get<EncryptedBundle>(`project:${auth.projectId}:bundle`, "json");
      if (!encrypted) return json(request, env, { ok: false, error: "No AegisCore bundle found for project." }, 404);
      const secrets = await decryptBundle(env, encrypted);
      await updateKeyLastUsed(env, auth);
      await logEvent(env, auth.projectId, "manifest.read", { keyHash: auth.keyHash.slice(0, 12) });
      const providerConfig = await getProjectProviderConfig(env, auth.projectId);
      return json(request, env, { ...filterManifestByProviderConfig(buildSafeManifest(secrets, auth.projectId), providerConfig), providerConfig, plan: { name: plan.name, status: plan.status, dailyCallLimit: plan.dailyCallLimit, rateLimitPerMinute: plan.rateLimitPerMinute, allowedCapabilities: plan.allowedCapabilities }, secrets_exposed: false });
    }

    if (url.pathname === "/v1/call" && request.method === "POST") {
      const auth = await authenticate(request, env);
      if (auth instanceof Response) return auth;
      const envelope = await request.json<CapabilityCallEnvelope>();
      if (!hasScope(auth, envelope.capability)) return json(request, env, { ok: false, error: `Missing scope for ${envelope.capability}` }, 403);
      if (envelope.capability !== "providers.health" && envelope.capability !== "workflow.run" && !(await providerEnabledForCapability(env, auth.projectId, envelope.capability))) {
        return json(request, env, { ok: false, error: `Provider pack for ${envelope.capability} is disabled on this project.`, code: "provider_pack_disabled", secrets_exposed: false }, 403);
      }
      if (envelope.capability !== "providers.health" && envelope.capability !== "workflow.run") {
        const governance = await enforceGovernance(request, env, auth.projectId, envelope.capability, envelope.input);
        if (governance instanceof Response) return governance;
      }
      const planCheck = await enforcePlan(request, env, auth.projectId, envelope.capability);
      if (planCheck instanceof Response) return planCheck;
      const limited = await rateLimit(request, env, auth.keyHash, planCheck.plan.rateLimitPerMinute);
      if (limited) return limited;
      const encrypted = await env.AEGIS_KV.get<EncryptedBundle>(`project:${auth.projectId}:bundle`, "json");
      if (!encrypted) return json(request, env, { ok: false, error: "No AegisCore bundle found for project." }, 404);
      const secrets = await decryptBundle(env, encrypted);
      if (envelope.capability === "providers.health") {
        const providerConfig = await getProjectProviderConfig(env, auth.projectId);
        const manifest = filterManifestByProviderConfig(buildSafeManifest(secrets, auth.projectId), providerConfig);
        const result = { ok: true, capability: envelope.capability, proofId: createProofId(), data: { providers: manifest.providers, capabilities: manifest.capabilities, providerConfig, plan: planCheck.plan, remainingToday: planCheck.remainingToday }, secrets_exposed: false };
        await updateKeyLastUsed(env, auth);
        await recordUsage(env, auth.projectId, envelope.capability, true);
        await logEvent(env, auth.projectId, "providers.health", { keyHash: auth.keyHash.slice(0, 12) });
        return json(request, env, result);
      }
      if (envelope.idempotencyKey) {
        const cached = await env.AEGIS_KV.get(`idem:${auth.projectId}:${envelope.idempotencyKey}`, "json");
        if (cached) return json(request, env, { ...cached as Record<string, unknown>, idempotentReplay: true });
      }
      if (envelope.capability === "workflow.run") {
        return runWorkflow(request, env, auth, envelope.input, secrets, envelope.dryRun);
      }
      if (envelope.dryRun) {
        const result = { ok: true, capability: envelope.capability, proofId: createProofId("proof_dryrun"), dryRun: true, plan: planCheck.plan.name, remainingToday: planCheck.remainingToday, secrets_exposed: false };
        await recordUsage(env, auth.projectId, envelope.capability, true);
        await logEvent(env, auth.projectId, "capability.dry_run", { capability: envelope.capability, keyHash: auth.keyHash.slice(0, 12) });
        return json(request, env, result);
      }
      try {
        const data = await callProvider(request, env, envelope.capability, envelope.input, secrets);
        if (data instanceof Response) {
          await recordUsage(env, auth.projectId, envelope.capability, false);
          await logEvent(env, auth.projectId, "capability.failed", { capability: envelope.capability, keyHash: auth.keyHash.slice(0, 12), reason: "provider_response" });
          return data;
        }
        const result = { ok: true, capability: envelope.capability, proofId: createProofId(), data, plan: planCheck.plan.name, remainingToday: planCheck.remainingToday, secrets_exposed: false };
        if (envelope.idempotencyKey) await env.AEGIS_KV.put(`idem:${auth.projectId}:${envelope.idempotencyKey}`, JSON.stringify(result), { expirationTtl: 60 * 60 * 24 });
        await updateKeyLastUsed(env, auth);
        await recordUsage(env, auth.projectId, envelope.capability, true);
        await logEvent(env, auth.projectId, "capability.called", { capability: envelope.capability, provider: data.provider, keyHash: auth.keyHash.slice(0, 12) });
        return json(request, env, result);
      } catch (error) {
        await recordUsage(env, auth.projectId, envelope.capability, false);
        await logEvent(env, auth.projectId, "capability.failed", { capability: envelope.capability, keyHash: auth.keyHash.slice(0, 12), reason: error instanceof Error ? error.message : String(error) });
        return json(request, env, { ok: false, capability: envelope.capability, proofId: createProofId("proof_failed"), error: { code: "provider_error", message: error instanceof Error ? error.message : String(error) }, secrets_exposed: false }, 500);
      }
    }

    return json(request, env, { ok: false, error: "Not found." }, 404);
  }
};
