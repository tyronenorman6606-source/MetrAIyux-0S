import { neon } from "@neondatabase/serverless";
import { AwsClient } from "aws4fetch";
import { assertNoKnownSecretLeak, createProofId, validateWorkflowRunInput, type CapabilityCallResult, type CapabilityName, type ProviderName, type WorkflowRunData, type WorkflowRunInput } from "@skyeapi/core";

export interface ProviderAdapterContext {
  provider: ProviderName;
  secrets: Record<string, string>;
}

export interface ProviderAdapter<TInput = unknown, TOutput = unknown> {
  provider: ProviderName;
  capability: CapabilityName;
  requiredSecrets: string[];
  execute(input: TInput, context: ProviderAdapterContext): Promise<CapabilityCallResult<TOutput>>;
}

function missingSecrets(required: string[], secrets: Record<string, string>): string[] {
  return required.filter((key) => !secrets[key]);
}

function fail<T>(capability: CapabilityName, provider: ProviderName, code: string, message: string): CapabilityCallResult<T> {
  return {
    ok: false,
    capability,
    provider,
    proofId: createProofId("proof_failed"),
    error: { code, message },
    secrets_exposed: false
  };
}

function pass<T>(capability: CapabilityName, provider: ProviderName, data: T, secrets?: Record<string, string>): CapabilityCallResult<T> {
  const result: CapabilityCallResult<T> = {
    ok: true,
    capability,
    provider,
    proofId: createProofId(),
    data,
    secrets_exposed: false
  };
  if (secrets) assertNoKnownSecretLeak(result, secrets);
  return result;
}

function normalizeProviderError(capability: CapabilityName, provider: ProviderName, response: Response): CapabilityCallResult {
  return fail(capability, provider, "provider_error", `${provider} returned HTTP ${response.status}. Provider body suppressed to prevent accidental sensitive data leakage.`);
}

export interface EmailSendInput {
  to: string;
  from?: string;
  subject: string;
  body?: string;
  html?: string;
}

export class ResendEmailAdapter implements ProviderAdapter<EmailSendInput> {
  provider: ProviderName = "resend";
  capability: CapabilityName = "email.send";
  requiredSecrets = ["RESEND_API_KEY"];

  async execute(input: EmailSendInput, context: ProviderAdapterContext): Promise<CapabilityCallResult> {
    const missing = missingSecrets(this.requiredSecrets, context.secrets);
    if (missing.length) return fail(this.capability, this.provider, "missing_secrets", `Missing: ${missing.join(", ")}`);
    if (!input.to || !input.subject || (!input.body && !input.html)) {
      return fail(this.capability, this.provider, "invalid_input", "Email requires to, subject, and body or html.");
    }
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${context.secrets.RESEND_API_KEY}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        from: input.from ?? context.secrets.RESEND_FROM ?? "SkyeAPI <onboarding@resend.dev>",
        to: input.to,
        subject: input.subject,
        text: input.body,
        html: input.html
      })
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) return normalizeProviderError(this.capability, this.provider, response);
    return pass(this.capability, this.provider, { provider_status: response.status, id: json.id ?? null }, context.secrets);
  }
}

export interface SmsSendInput {
  to: string;
  body: string;
  from?: string;
}

export class TwilioSmsAdapter implements ProviderAdapter<SmsSendInput> {
  provider: ProviderName = "twilio";
  capability: CapabilityName = "sms.send";
  requiredSecrets = ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER"];

  async execute(input: SmsSendInput, context: ProviderAdapterContext): Promise<CapabilityCallResult> {
    const missing = missingSecrets(this.requiredSecrets, context.secrets);
    if (missing.length) return fail(this.capability, this.provider, "missing_secrets", `Missing: ${missing.join(", ")}`);
    if (!input.to || !input.body) return fail(this.capability, this.provider, "invalid_input", "SMS requires to and body.");
    const sid = context.secrets.TWILIO_ACCOUNT_SID;
    const token = context.secrets.TWILIO_AUTH_TOKEN;
    const auth = Buffer.from(`${sid}:${token}`).toString("base64");
    const body = new URLSearchParams({
      To: input.to,
      From: input.from ?? context.secrets.TWILIO_FROM_NUMBER,
      Body: input.body
    });
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        authorization: `Basic ${auth}`,
        "content-type": "application/x-www-form-urlencoded"
      },
      body
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) return normalizeProviderError(this.capability, this.provider, response);
    return pass(this.capability, this.provider, { provider_status: response.status, sid: json.sid ?? null }, context.secrets);
  }
}

export interface GenerateTextInput {
  prompt: string;
  model?: string;
  system?: string;
}

export class OpenAICompatibleTextAdapter implements ProviderAdapter<GenerateTextInput> {
  provider: ProviderName = "openai-compatible";
  capability: CapabilityName = "ai.generate_text";
  requiredSecrets = ["OPENAI_API_KEY"];

  async execute(input: GenerateTextInput, context: ProviderAdapterContext): Promise<CapabilityCallResult> {
    const missing = missingSecrets(this.requiredSecrets, context.secrets);
    if (missing.length) return fail(this.capability, this.provider, "missing_secrets", `Missing: ${missing.join(", ")}`);
    if (!input.prompt) return fail(this.capability, this.provider, "invalid_input", "Prompt is required.");
    const baseUrl = context.secrets.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
    const model = input.model ?? context.secrets.OPENAI_MODEL ?? "gpt-4.1-mini";
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${context.secrets.OPENAI_API_KEY}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [
          ...(input.system ? [{ role: "system", content: input.system }] : []),
          { role: "user", content: input.prompt }
        ]
      })
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) return normalizeProviderError(this.capability, this.provider, response);
    return pass(this.capability, this.provider, { text: json.choices?.[0]?.message?.content ?? "", model }, context.secrets);
  }
}

export interface StripeCheckoutInput {
  successUrl: string;
  cancelUrl: string;
  priceId?: string;
  amountCents?: number;
  currency?: string;
  productName?: string;
}

export class StripeCheckoutAdapter implements ProviderAdapter<StripeCheckoutInput> {
  provider: ProviderName = "stripe";
  capability: CapabilityName = "billing.create_checkout";
  requiredSecrets = ["STRIPE_SECRET_KEY"];

  async execute(input: StripeCheckoutInput, context: ProviderAdapterContext): Promise<CapabilityCallResult> {
    const missing = missingSecrets(this.requiredSecrets, context.secrets);
    if (missing.length) return fail(this.capability, this.provider, "missing_secrets", `Missing: ${missing.join(", ")}`);
    if (!input.successUrl || !input.cancelUrl) return fail(this.capability, this.provider, "invalid_input", "successUrl and cancelUrl are required.");
    const form = new URLSearchParams({
      mode: "payment",
      success_url: input.successUrl,
      cancel_url: input.cancelUrl
    });
    if (input.priceId) {
      form.set("line_items[0][price]", input.priceId);
      form.set("line_items[0][quantity]", "1");
    } else {
      form.set("line_items[0][price_data][currency]", input.currency ?? "usd");
      form.set("line_items[0][price_data][product_data][name]", input.productName ?? "SkyeAPI Checkout Item");
      form.set("line_items[0][price_data][unit_amount]", String(input.amountCents ?? 1000));
      form.set("line_items[0][quantity]", "1");
    }
    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${context.secrets.STRIPE_SECRET_KEY}`,
        "content-type": "application/x-www-form-urlencoded"
      },
      body: form
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) return normalizeProviderError(this.capability, this.provider, response);
    return pass(this.capability, this.provider, { id: json.id, url: json.url }, context.secrets);
  }
}

export interface DbQueryInput {
  sql: string;
  params?: unknown[];
  readonly?: boolean;
}

export class NeonQueryAdapter implements ProviderAdapter<DbQueryInput> {
  provider: ProviderName = "neon";
  capability: CapabilityName = "db.query";
  requiredSecrets = ["NEON_DATABASE_URL"];

  async execute(input: DbQueryInput, context: ProviderAdapterContext): Promise<CapabilityCallResult> {
    const missing = missingSecrets(this.requiredSecrets, context.secrets);
    if (missing.length) return fail(this.capability, this.provider, "missing_secrets", `Missing: ${missing.join(", ")}`);
    if (!input.sql) return fail(this.capability, this.provider, "invalid_input", "SQL is required.");
    if (input.readonly && !/^\s*(select|with|show|explain)\b/i.test(input.sql)) {
      return fail(this.capability, this.provider, "readonly_violation", "Readonly mode allows SELECT/WITH/SHOW/EXPLAIN only.");
    }
    const sql = neon(context.secrets.NEON_DATABASE_URL);
    const rows = await sql(input.sql, input.params ?? []);
    return pass(this.capability, this.provider, { rows, rowCount: Array.isArray(rows) ? rows.length : 0 }, context.secrets);
  }
}

export class NeonInspectSchemaAdapter implements ProviderAdapter<Record<string, never>> {
  provider: ProviderName = "neon";
  capability: CapabilityName = "db.inspect_schema";
  requiredSecrets = ["NEON_DATABASE_URL"];

  async execute(_input: Record<string, never>, context: ProviderAdapterContext): Promise<CapabilityCallResult> {
    const query = new NeonQueryAdapter();
    const result = await query.execute({
      readonly: true,
      sql: "select table_schema, table_name from information_schema.tables where table_schema not in ('pg_catalog', 'information_schema') order by table_schema, table_name limit 200"
    }, context);
    return { ...result, capability: this.capability };
  }
}

export interface StorageUploadInput {
  key: string;
  contentType?: string;
  body: string;
}

export class CloudflareR2UploadAdapter implements ProviderAdapter<StorageUploadInput> {
  provider: ProviderName = "cloudflare-r2";
  capability: CapabilityName = "storage.upload";
  requiredSecrets = ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_R2_ACCESS_KEY_ID", "CLOUDFLARE_R2_SECRET_ACCESS_KEY", "CLOUDFLARE_R2_BUCKET"];

  async execute(input: StorageUploadInput, context: ProviderAdapterContext): Promise<CapabilityCallResult> {
    const missing = missingSecrets(this.requiredSecrets, context.secrets);
    if (missing.length) return fail(this.capability, this.provider, "missing_secrets", `Missing: ${missing.join(", ")}`);
    if (!input.key || typeof input.body !== "string") return fail(this.capability, this.provider, "invalid_input", "storage.upload requires key and string body.");
    if (input.key.includes("..")) return fail(this.capability, this.provider, "invalid_key", "Storage key cannot contain path traversal segments.");
    const accountId = context.secrets.CLOUDFLARE_ACCOUNT_ID;
    const bucket = context.secrets.CLOUDFLARE_R2_BUCKET;
    const encodedKey = input.key.split("/").map(encodeURIComponent).join("/");
    const url = `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${encodedKey}`;
    const aws = new AwsClient({
      accessKeyId: context.secrets.CLOUDFLARE_R2_ACCESS_KEY_ID,
      secretAccessKey: context.secrets.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
      service: "s3",
      region: "auto"
    });
    const response = await aws.fetch(url, {
      method: "PUT",
      headers: { "content-type": input.contentType ?? "text/plain; charset=utf-8" },
      body: input.body
    });
    if (!response.ok) return normalizeProviderError(this.capability, this.provider, response);
    return pass(this.capability, this.provider, { provider_status: response.status, key: input.key, bucket }, context.secrets);
  }
}

export const DEFAULT_ADAPTERS: ProviderAdapter[] = [
  new ResendEmailAdapter(),
  new TwilioSmsAdapter(),
  new OpenAICompatibleTextAdapter(),
  new StripeCheckoutAdapter(),
  new NeonQueryAdapter(),
  new NeonInspectSchemaAdapter(),
  new CloudflareR2UploadAdapter()
];

export function findAdapter(capability: CapabilityName): ProviderAdapter | undefined {
  return DEFAULT_ADAPTERS.find((adapter) => adapter.capability === capability);
}


function getPath(source: unknown, path: string): unknown {
  return path.split(".").filter(Boolean).reduce<unknown>((current, key) => {
    if (current && typeof current === "object" && key in current) return (current as Record<string, unknown>)[key];
    return undefined;
  }, source);
}

function interpolateString(value: string, context: Record<string, unknown>): string {
  return value.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_match, expression: string) => {
    const resolved = getPath(context, expression.trim());
    if (resolved === undefined || resolved === null) return "";
    return typeof resolved === "string" ? resolved : JSON.stringify(resolved);
  });
}

function interpolateValue(value: unknown, context: Record<string, unknown>): unknown {
  if (typeof value === "string") return interpolateString(value, context);
  if (Array.isArray(value)) return value.map((item) => interpolateValue(item, context));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, child]) => [key, interpolateValue(child, context)]));
  }
  return value;
}

function providerForCapability(capability: CapabilityName): ProviderName {
  const adapter = findAdapter(capability);
  if (!adapter) return "unknown";
  return adapter.provider;
}

function flattenSecrets(secretsByProvider: Record<string, Record<string, string>>): Record<string, string> {
  return Object.assign({}, ...Object.values(secretsByProvider));
}

export async function executeLocalWorkflow(input: WorkflowRunInput, secretsByProvider: Record<string, Record<string, string>>, options: { dryRun?: boolean } = {}): Promise<CapabilityCallResult<WorkflowRunData>> {
  const validation = validateWorkflowRunInput(input);
  if (!validation.ok) {
    return {
      ok: false,
      capability: "workflow.run",
      provider: "unknown",
      proofId: createProofId("proof_failed"),
      error: { code: "invalid_workflow", message: validation.error },
      secrets_exposed: false
    };
  }

  const workflowId = input.workflowId ?? createProofId("workflow");
  const stepContext: Record<string, unknown> = { input: input.input ?? {}, steps: {} };
  const stepReceipts: WorkflowRunData["steps"] = [];

  for (const step of input.steps) {
    const adapter = findAdapter(step.capability);
    if (!adapter) {
      const receipt = { id: step.id, capability: step.capability, ok: false, provider: providerForCapability(step.capability), proofId: createProofId("proof_failed"), error: { code: "missing_adapter", message: `No adapter for ${step.capability}` } };
      stepReceipts.push(receipt);
      (stepContext.steps as Record<string, unknown>)[step.id] = receipt;
      if (!step.continueOnError) break;
      continue;
    }

    const resolvedInput = interpolateValue(step.input, stepContext) as Record<string, unknown>;
    if (options.dryRun || step.dryRun) {
      const receipt = { id: step.id, capability: step.capability, ok: true, provider: adapter.provider, proofId: createProofId("proof_dryrun"), dryRun: true, data: { inputKeys: Object.keys(resolvedInput) } };
      stepReceipts.push(receipt);
      (stepContext.steps as Record<string, unknown>)[step.id] = receipt;
      continue;
    }

    const secrets = secretsByProvider[adapter.provider] ?? {};
    const result = await adapter.execute(resolvedInput, { provider: adapter.provider, secrets });
    const receipt = { id: step.id, capability: step.capability, ok: result.ok, provider: result.provider, proofId: result.proofId, data: result.data, error: result.error };
    stepReceipts.push(receipt);
    (stepContext.steps as Record<string, unknown>)[step.id] = receipt;
    if (!result.ok && !step.continueOnError) break;
  }

  const ok = stepReceipts.every((step) => step.ok || input.steps.find((candidate) => candidate.id === step.id)?.continueOnError);
  const data: WorkflowRunData = {
    workflowId,
    stepCount: stepReceipts.length,
    steps: stepReceipts,
    final: stepReceipts.at(-1)?.data
  };
  const response: CapabilityCallResult<WorkflowRunData> = {
    ok,
    capability: "workflow.run",
    provider: "unknown",
    proofId: createProofId(),
    data,
    secrets_exposed: false
  };
  assertNoKnownSecretLeak(response, flattenSecrets(secretsByProvider));
  return response;
}
