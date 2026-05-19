#!/usr/bin/env node
import readline from "node:readline";
import { LocalAegisCore, defaultPassphrase, defaultVaultPath } from "@skyeapi/aegis-core";
import { executeLocalWorkflow, findAdapter } from "@skyeapi/providers";
import { createInputFingerprint, evaluatePolicyRules, PROVIDER_PACKS, validateEnvImport, type CapabilityName } from "@skyeapi/core";

interface JsonRpcRequest {
  jsonrpc?: "2.0";
  id?: string | number | null;
  method: string;
  params?: any;
}

function core(): LocalAegisCore {
  return new LocalAegisCore({ vaultPath: defaultVaultPath(), passphrase: defaultPassphrase(), projectId: process.env.SKYEAPI_PROJECT_ID });
}

const tools = [
  { name: "skyeapi.capabilities.list", description: "List enabled SkyeAPI capabilities from the local AegisCore vault. Does not expose raw secrets.", inputSchema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "skyeapi.providers.health", description: "Show configured provider status without returning raw secrets.", inputSchema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "skyeapi.manifest.safe", description: "Return the full safe capability manifest. No raw provider secrets are included.", inputSchema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "skyeapi.email.send_test", description: "Send a real test email through the configured email provider. Requires explicit to/subject/body input.", inputSchema: { type: "object", properties: { to: { type: "string" }, subject: { type: "string" }, body: { type: "string" }, html: { type: "string" } }, required: ["to", "subject"], additionalProperties: false } },
  { name: "skyeapi.sms.send_test", description: "Send a real test SMS through the configured SMS provider. Requires explicit to/body input.", inputSchema: { type: "object", properties: { to: { type: "string" }, body: { type: "string" } }, required: ["to", "body"], additionalProperties: false } },
  { name: "skyeapi.db.inspect_schema", description: "Inspect database schema through the configured DB provider using a safe readonly query.", inputSchema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "skyeapi.db.run_safe_query", description: "Run a readonly SELECT/WITH/SHOW/EXPLAIN query through the configured DB provider.", inputSchema: { type: "object", properties: { sql: { type: "string" }, params: { type: "array" } }, required: ["sql"], additionalProperties: false } },
  { name: "skyeapi.ai.generate_text_test", description: "Generate text through the configured OpenAI-compatible provider.", inputSchema: { type: "object", properties: { prompt: { type: "string" }, system: { type: "string" }, model: { type: "string" } }, required: ["prompt"], additionalProperties: false } },
  { name: "skyeapi.storage.upload_test", description: "Upload a small string object through the configured storage provider.", inputSchema: { type: "object", properties: { key: { type: "string" }, body: { type: "string" }, contentType: { type: "string" } }, required: ["key", "body"], additionalProperties: false } },
  { name: "skyeapi.billing.create_checkout_test", description: "Create a Stripe checkout session through the configured billing provider.", inputSchema: { type: "object", properties: { successUrl: { type: "string" }, cancelUrl: { type: "string" }, priceId: { type: "string" }, amountCents: { type: "number" }, currency: { type: "string" }, productName: { type: "string" } }, required: ["successUrl", "cancelUrl"], additionalProperties: false } },
  { name: "skyeapi.workflow.run", description: "Run a multi-step SkyeAPI workflow using local AegisCore provider credentials. Supports dryRun=true to validate and interpolate without calling providers.", inputSchema: { type: "object", properties: { workflowId: { type: "string" }, input: { type: "object" }, steps: { type: "array" }, dryRun: { type: "boolean" } }, required: ["steps"], additionalProperties: true } },
  { name: "skyeapi.provider_packs.list", description: "List built-in provider packs and capabilities available to SkyeAPI projects.", inputSchema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "skyeapi.env.validate", description: "Validate parsed env text and report detected providers without exposing secret values.", inputSchema: { type: "object", properties: { envText: { type: "string" } }, required: ["envText"], additionalProperties: false } },
  { name: "skyeapi.policy.evaluate", description: "Evaluate policy rules against one proposed capability input without calling providers.", inputSchema: { type: "object", properties: { capability: { type: "string" }, input: { type: "object" }, policies: { type: "array" } }, required: ["capability", "input", "policies"], additionalProperties: false } },
  { name: "skyeapi.approval.input_fingerprint", description: "Create a deterministic approval fingerprint for a proposed capability input. Does not call providers or expose secrets.", inputSchema: { type: "object", properties: { capability: { type: "string" }, input: { type: "object" } }, required: ["capability", "input"], additionalProperties: false } }
];

function send(id: JsonRpcRequest["id"], result: unknown): void {
  process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, result })}\n`);
}

function sendError(id: JsonRpcRequest["id"], code: number, message: string): void {
  process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } })}\n`);
}

async function handleToolCall(name: string, args: any): Promise<unknown> {
  const aegis = core();
  if (name === "skyeapi.capabilities.list") {
    const manifest = await aegis.safeManifest();
    return { content: [{ type: "text", text: JSON.stringify(manifest.capabilities, null, 2) }], secrets_exposed: false };
  }
  if (name === "skyeapi.providers.health") {
    const manifest = await aegis.safeManifest();
    return { content: [{ type: "text", text: JSON.stringify(manifest.providers, null, 2) }], secrets_exposed: false };
  }
  if (name === "skyeapi.manifest.safe") {
    const manifest = await aegis.safeManifest();
    return { content: [{ type: "text", text: JSON.stringify(manifest, null, 2) }], secrets_exposed: false };
  }
  if (name === "skyeapi.email.send_test") return executeAdapter("email.send", args);
  if (name === "skyeapi.sms.send_test") return executeAdapter("sms.send", args);
  if (name === "skyeapi.db.inspect_schema") return executeAdapter("db.inspect_schema", {});
  if (name === "skyeapi.db.run_safe_query") return executeAdapter("db.query", { ...args, readonly: true });
  if (name === "skyeapi.ai.generate_text_test") return executeAdapter("ai.generate_text", args);
  if (name === "skyeapi.storage.upload_test") return executeAdapter("storage.upload", args);
  if (name === "skyeapi.billing.create_checkout_test") return executeAdapter("billing.create_checkout", args);
  if (name === "skyeapi.provider_packs.list") return { content: [{ type: "text", text: JSON.stringify(PROVIDER_PACKS, null, 2) }], secrets_exposed: false };
  if (name === "skyeapi.env.validate") {
    const parsed = Object.fromEntries(String(args?.envText ?? "").split(/\r?\n/).map((line: string) => line.trim()).filter(Boolean).map((line: string) => { const index = line.indexOf("="); return index === -1 ? [line, ""] : [line.slice(0, index), line.slice(index + 1)]; }));
    const result = validateEnvImport(parsed as Record<string, string>);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], secrets_exposed: false };
  }
  if (name === "skyeapi.policy.evaluate") {
    const result = evaluatePolicyRules(args.capability, args.input, args.policies);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], secrets_exposed: false };
  }
  if (name === "skyeapi.approval.input_fingerprint") {
    const result = { capability: args.capability, fingerprint: createInputFingerprint(args.capability, args.input), secrets_exposed: false };
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], secrets_exposed: false };
  }
  if (name === "skyeapi.workflow.run") {
    const aegis = core();
    const result = await executeLocalWorkflow(args, await aegis.getAllProviderSecrets(), { dryRun: Boolean(args?.dryRun) });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], secrets_exposed: false };
  }
  throw new Error(`Unknown tool: ${name}`);
}

async function executeAdapter(capability: CapabilityName, input: unknown): Promise<unknown> {
  const adapter = findAdapter(capability);
  if (!adapter) throw new Error(`No adapter for ${capability}`);
  const aegis = core();
  const secrets = await aegis.getProviderSecrets(adapter.provider);
  const result = await adapter.execute(input, { provider: adapter.provider, secrets });
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], secrets_exposed: false };
}

async function handle(request: JsonRpcRequest): Promise<void> {
  if (request.method === "initialize") {
    send(request.id, { protocolVersion: "2025-03-26", serverInfo: { name: "skyeapi-mcp", version: "0.7.0" }, capabilities: { tools: {} } });
    return;
  }
  if (request.method === "tools/list") {
    send(request.id, { tools });
    return;
  }
  if (request.method === "tools/call") {
    const name = request.params?.name;
    const args = request.params?.arguments ?? {};
    const result = await handleToolCall(name, args);
    send(request.id, result);
    return;
  }
  if (request.method === "notifications/initialized") return;
  sendError(request.id, -32601, `Method not found: ${request.method}`);
}

const rl = readline.createInterface({ input: process.stdin, terminal: false });
rl.on("line", async (line) => {
  if (!line.trim()) return;
  try {
    const request = JSON.parse(line) as JsonRpcRequest;
    await handle(request);
  } catch (error) {
    sendError(null, -32000, error instanceof Error ? error.message : String(error));
  }
});
