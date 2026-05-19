#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { LocalAegisCore, defaultPassphrase, defaultVaultPath } from "@skyeapi/aegis-core";
import { assertNoKnownSecretLeak, buildSafeManifest, evaluatePolicyRules, parseDotEnv, validateEnvImport, type CapabilityName } from "@skyeapi/core";
import { DEFAULT_ADAPTERS, executeLocalWorkflow, findAdapter } from "@skyeapi/providers";
import { createProviderPackScaffold, runAdapterConformance, runDeveloperDoctor, certifyProviderPackDefinition, createProviderPackSourceInstallReceipt, createBillingInvoiceDraft, buildBillingUsageRecords, runConsoleE2EContract, loadProviderPackFromSource, runProviderPackSandbox } from "@skyeapi/ops";

function usage(): void {
  console.log(`SkyeAPI CLI

Local AegisCore commands:
  skyeapi init
  skyeapi import-env <path>
  skyeapi scan [path]
  skyeapi providers
  skyeapi capabilities
  skyeapi export safe-manifest
  skyeapi test <all|provider|capability>
  skyeapi call <capability> --json '{...}'
  skyeapi workflow sample
  skyeapi workflow run --file <workflow.json> [--dry-run]
  skyeapi mcp start
  skyeapi console
  skyeapi generate integration-prompt --for <codex|claude-code|cursor|windsurf|generic-agent>
  skyeapi doctor
  skyeapi adapters conformance
  skyeapi provider-pack scaffold --provider <id> --label <label> --capabilities email.send --required RESEND_API_KEY
  skyeapi provider-pack certify --file provider-packs/custom/pack.json
  skyeapi provider-pack load-source --source <inline|directory|zip|git> [--file pack.json] [--source-uri path-or-url]
  skyeapi provider-pack sandbox --file provider-packs/custom/pack.json [--adapter adapter.ts]

Hosted platform commands:
  skyeapi hosted health
  skyeapi hosted import-env <path> --project <projectId> --scopes '*'
  skyeapi hosted create-key --project <projectId> --scopes 'manifest:read,email:send' [--expires-at ISO]
  skyeapi hosted revoke-key --key-hash <hash>
  skyeapi hosted keys --project <projectId>
  skyeapi hosted project --project <projectId>
  skyeapi hosted plans
  skyeapi hosted set-plan --project <projectId> --plan <free|builder|operator|enterprise>
  skyeapi hosted capabilities
  skyeapi hosted call <capability> --json '{...}' [--dry-run]
  skyeapi hosted workflow run --file <workflow.json> [--dry-run]
  skyeapi hosted usage --project <projectId>
  skyeapi hosted events --project <projectId>
  skyeapi hosted provider-packs
  skyeapi hosted providers --project <projectId>
  skyeapi hosted set-provider --project <projectId> --provider resend --enabled true
  skyeapi hosted policies --project <projectId>
  skyeapi hosted set-policies --project <projectId> --file policies.json
  skyeapi hosted roles --project <projectId>
  skyeapi hosted set-roles --project <projectId> --file roles.json
  skyeapi hosted rotate-secret --project <projectId> --key RESEND_API_KEY --value <newValue>
  skyeapi hosted rotations --project <projectId>
  skyeapi hosted webhook-events --project <projectId>
  skyeapi hosted replay-webhook --project <projectId> --event <eventId>
  skyeapi hosted approvals --project <projectId>
  skyeapi hosted approve --project <projectId> --request <requestId>
  skyeapi hosted deny --project <projectId> --request <requestId>
  skyeapi hosted snapshots --project <projectId>
  skyeapi hosted snapshot --project <projectId> [--reason note]
  skyeapi hosted restore-snapshot --project <projectId> --snapshot <snapshotId>
  skyeapi hosted workflow-runs --project <projectId> [--details]
  skyeapi hosted jobs --project <projectId>
  skyeapi hosted enqueue-job --project <projectId> --capability <capability> --json '{...}' [--dry-run]
  skyeapi hosted process-job --project <projectId>
  skyeapi hosted cancel-job --project <projectId> --job <jobId>
  skyeapi hosted dead-letter-jobs --project <projectId>
  skyeapi hosted retry-dead-letter-job --project <projectId> --job <jobId>
  skyeapi hosted outbound-subscriptions --project <projectId>
  skyeapi hosted outbound-subscribe --project <projectId> --url <https://...> --events 'workflow.completed,capability.called'
  skyeapi hosted outbound-update --project <projectId> --subscription <id> [--enabled true|false]
  skyeapi hosted outbound-delete --project <projectId> --subscription <id>
  skyeapi hosted outbound-emit --project <projectId> --event <eventType> --json '{...}'
  skyeapi hosted outbound-deliveries --project <projectId>
  skyeapi hosted outbound-dead-letters --project <projectId>
  skyeapi hosted outbound-process --project <projectId>
  skyeapi hosted anomalies --project <projectId>
  skyeapi hosted doctor --project <projectId>
  skyeapi hosted ops-readiness
  skyeapi hosted billing-usage --project <projectId>
  skyeapi hosted pack-registry
  skyeapi hosted publish-pack --file provider-packs/custom/pack.json [--version-tag 0.1.0]
  skyeapi hosted install-pack --project <projectId> --registry <registryId>
  skyeapi hosted pack-installations --project <projectId>
  skyeapi hosted certify-pack --file provider-packs/custom/pack.json
  skyeapi hosted scaffold-pack --provider <id> --label <label> --capabilities email.send --required API_KEY
  skyeapi hosted claim-job-lease --project <projectId> [--lease-ms 300000]
  skyeapi hosted complete-job-lease --project <projectId> --job <jobId> --lease-token <token> --result result.json
  skyeapi hosted pack-dependencies --file provider-packs/custom/pack.json
  skyeapi hosted sign-pack --file provider-packs/custom/pack.json --signer <name>
  skyeapi hosted verify-pack --file provider-packs/custom/pack.json --manifest signed-manifest.json
  skyeapi hosted certification-receipt --file provider-packs/custom/pack.json [--signer <name>]
  skyeapi hosted install-pack-source --project <projectId> --file provider-packs/custom/pack.json --source <inline|directory|zip|git> [--source-uri <uri>]
  skyeapi hosted billing-usage-export --project <projectId> --format <csv|jsonl>
  skyeapi hosted billing-invoice --project <projectId>
  skyeapi hosted billing-invoice-export --project <projectId> --format <json|csv>
  skyeapi hosted provider-pack-sandbox --file provider-packs/custom/pack.json [--adapter adapter.ts]
  skyeapi hosted provider-fixture-certification --provider resend --capability email.send --endpoint http://127.0.0.1:8789/fixture/resend
  skyeapi hosted billing-invoice-create --project <projectId> [--customer-email email]
  skyeapi hosted billing-invoices --project <projectId>
  skyeapi hosted billing-invoice-status --project <projectId> --invoice <id> --status <draft|issued|paid|void>
  skyeapi hosted billing-invoice-reconcile --project <projectId> --invoice <id> [--date YYYY-MM-DD]
  skyeapi hosted subscription-create --project <projectId> --plan <plan> [--billing-cycle monthly|annual]
  skyeapi hosted subscription-lifecycle --project <projectId> --subscription <id> --action <pause|resume|cancel|renew|payment_failed|update>
  skyeapi hosted subscriptions --project <projectId>
  skyeapi hosted workspace-bind --workspace <workspaceId> --project <projectId> --roles owner,developer
  skyeapi hosted workspace-bindings [--workspace <workspaceId>]
  skyeapi hosted workspace-access-check --workspace <workspaceId> --project <projectId> --role <role> --capability <capability>
  skyeapi hosted audit-export --project <projectId>

Hosted env:
  SKYEAPI_BASE_URL, SKYE_ADMIN_KEY, SKYEAPI_KEY, SKYEAPI_PROJECT_ID
`);
}

function core(): LocalAegisCore {
  return new LocalAegisCore({
    vaultPath: defaultVaultPath(),
    passphrase: defaultPassphrase(),
    projectId: process.env.SKYEAPI_PROJECT_ID
  });
}

function getArg(flag: string, argv: string[]): string | undefined {
  const index = argv.indexOf(flag);
  if (index === -1) return undefined;
  return argv[index + 1];
}

function splitScopes(value?: string): string[] {
  return (value ?? "manifest:read").split(",").map((scope) => scope.trim()).filter(Boolean);
}

function boolArg(value?: string): boolean {
  return value === "true" || value === "1" || value === "yes";
}

function hostedBase(): string {
  const base = process.env.SKYEAPI_BASE_URL?.replace(/\/$/, "");
  if (!base) throw new Error("Set SKYEAPI_BASE_URL for hosted commands.");
  return base;
}

async function hostedRequest(path: string, options: { method?: string; admin?: boolean; bearer?: string; json?: unknown } = {}): Promise<unknown> {
  const headers: Record<string, string> = {};
  if (options.admin) {
    if (!process.env.SKYE_ADMIN_KEY) throw new Error("Set SKYE_ADMIN_KEY for hosted admin commands.");
    headers["x-skye-admin-key"] = process.env.SKYE_ADMIN_KEY;
  }
  const bearer = options.bearer ?? process.env.SKYEAPI_KEY;
  if (bearer) headers.authorization = `Bearer ${bearer}`;
  if (options.json !== undefined) headers["content-type"] = "application/json";
  const response = await fetch(`${hostedBase()}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.json === undefined ? undefined : JSON.stringify(options.json)
  });
  const json = await response.json().catch(() => ({ ok: false, error: `Non-JSON response ${response.status}` }));
  if (!response.ok) throw new Error(typeof json?.error === "string" ? json.error : JSON.stringify(json));
  return json;
}

async function hostedRequestText(path: string): Promise<string> {
  if (!process.env.SKYE_ADMIN_KEY) throw new Error("Set SKYE_ADMIN_KEY for hosted admin commands.");
  const response = await fetch(`${hostedBase()}${path}`, { headers: { "x-skye-admin-key": process.env.SKYE_ADMIN_KEY } });
  const text = await response.text();
  if (!response.ok) throw new Error(text || `HTTP ${response.status}`);
  return text;
}

async function handleHosted(args: string[]): Promise<void> {
  const [subcommand, ...rest] = args;
  if (!subcommand || subcommand === "help") {
    usage();
    return;
  }

  if (subcommand === "health") {
    console.log(JSON.stringify(await hostedRequest("/health"), null, 2));
    return;
  }

  if (subcommand === "import-env") {
    const path = rest[0] ?? ".env";
    const projectId = getArg("--project", rest) ?? process.env.SKYEAPI_PROJECT_ID;
    if (!projectId) throw new Error("Pass --project or set SKYEAPI_PROJECT_ID.");
    const envText = await readFile(path, "utf8");
    const result = await hostedRequest("/v1/admin/import-env", {
      method: "POST",
      admin: true,
      json: { projectId, envText, scopes: splitScopes(getArg("--scopes", rest) ?? "*"), label: getArg("--label", rest) ?? "cli-import" }
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (subcommand === "create-key") {
    const projectId = getArg("--project", rest) ?? process.env.SKYEAPI_PROJECT_ID;
    if (!projectId) throw new Error("Pass --project or set SKYEAPI_PROJECT_ID.");
    const result = await hostedRequest("/v1/admin/create-key", {
      method: "POST",
      admin: true,
      json: { projectId, scopes: splitScopes(getArg("--scopes", rest)), label: getArg("--label", rest) ?? "cli-key", expiresAt: getArg("--expires-at", rest) }
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }



  if (subcommand === "revoke-key") {
    const keyHash = getArg("--key-hash", rest);
    const apiKey = getArg("--api-key", rest);
    if (!keyHash && !apiKey) throw new Error("Pass --key-hash or --api-key.");
    console.log(JSON.stringify(await hostedRequest("/v1/admin/revoke-key", { method: "POST", admin: true, json: { keyHash, apiKey } }), null, 2));
    return;
  }

  if (subcommand === "project") {
    const projectId = getArg("--project", rest) ?? process.env.SKYEAPI_PROJECT_ID;
    if (!projectId) throw new Error("Pass --project or set SKYEAPI_PROJECT_ID.");
    console.log(JSON.stringify(await hostedRequest(`/v1/admin/project?projectId=${encodeURIComponent(projectId)}`, { admin: true }), null, 2));
    return;
  }

  if (subcommand === "plans") {
    console.log(JSON.stringify(await hostedRequest("/v1/admin/plans", { admin: true }), null, 2));
    return;
  }

  if (subcommand === "set-plan") {
    const projectId = getArg("--project", rest) ?? process.env.SKYEAPI_PROJECT_ID;
    const plan = getArg("--plan", rest);
    if (!projectId || !plan) throw new Error("Usage: skyeapi hosted set-plan --project <projectId> --plan <planName>");
    const allowed = getArg("--capabilities", rest)?.split(",").map((item) => item.trim()).filter(Boolean);
    console.log(JSON.stringify(await hostedRequest("/v1/admin/set-plan", {
      method: "POST",
      admin: true,
      json: {
        projectId,
        plan,
        dailyCallLimit: getArg("--daily-limit", rest) ? Number(getArg("--daily-limit", rest)) : undefined,
        rateLimitPerMinute: getArg("--rate-limit", rest) ? Number(getArg("--rate-limit", rest)) : undefined,
        allowedCapabilities: allowed,
        status: getArg("--status", rest),
        notes: getArg("--notes", rest)
      }
    }), null, 2));
    return;
  }

  if (subcommand === "keys") {
    const projectId = getArg("--project", rest) ?? process.env.SKYEAPI_PROJECT_ID;
    if (!projectId) throw new Error("Pass --project or set SKYEAPI_PROJECT_ID.");
    console.log(JSON.stringify(await hostedRequest(`/v1/admin/keys?projectId=${encodeURIComponent(projectId)}`, { admin: true }), null, 2));
    return;
  }

  if (subcommand === "capabilities") {
    console.log(JSON.stringify(await hostedRequest("/v1/capabilities", { bearer: process.env.SKYEAPI_KEY }), null, 2));
    return;
  }

  if (subcommand === "call") {
    const capability = rest[0];
    const jsonInput = getArg("--json", rest);
    if (!capability || !jsonInput) throw new Error("Usage: skyeapi hosted call <capability> --json '{...}' [--dry-run]");
    const dryRun = rest.includes("--dry-run");
    console.log(JSON.stringify(await hostedRequest("/v1/call", {
      method: "POST",
      bearer: process.env.SKYEAPI_KEY,
      json: { capability, input: JSON.parse(jsonInput), dryRun }
    }), null, 2));
    return;
  }

  if (subcommand === "workflow" && rest[0] === "run") {
    const file = getArg("--file", rest) ?? rest[1];
    if (!file) throw new Error("Usage: skyeapi hosted workflow run --file <workflow.json> [--dry-run]");
    const input = JSON.parse(await readFile(file, "utf8"));
    console.log(JSON.stringify(await hostedRequest("/v1/call", {
      method: "POST",
      bearer: process.env.SKYEAPI_KEY,
      json: { capability: "workflow.run", input, dryRun: rest.includes("--dry-run") }
    }), null, 2));
    return;
  }

  if (subcommand === "usage") {
    const projectId = getArg("--project", rest) ?? process.env.SKYEAPI_PROJECT_ID;
    if (!projectId) throw new Error("Pass --project or set SKYEAPI_PROJECT_ID.");
    console.log(JSON.stringify(await hostedRequest(`/v1/admin/usage?projectId=${encodeURIComponent(projectId)}`, { admin: true }), null, 2));
    return;
  }

  if (subcommand === "events") {
    const projectId = getArg("--project", rest) ?? process.env.SKYEAPI_PROJECT_ID ?? "global";
    console.log(JSON.stringify(await hostedRequest(`/v1/admin/events?projectId=${encodeURIComponent(projectId)}&limit=50`, { admin: true }), null, 2));
    return;
  }


  if (subcommand === "provider-packs") {
    console.log(JSON.stringify(await hostedRequest("/v1/admin/provider-packs", { admin: true }), null, 2));
    return;
  }

  if (subcommand === "providers") {
    const projectId = getArg("--project", rest) ?? process.env.SKYEAPI_PROJECT_ID;
    if (!projectId) throw new Error("Pass --project or set SKYEAPI_PROJECT_ID.");
    console.log(JSON.stringify(await hostedRequest(`/v1/admin/project-providers?projectId=${encodeURIComponent(projectId)}`, { admin: true }), null, 2));
    return;
  }

  if (subcommand === "set-provider") {
    const projectId = getArg("--project", rest) ?? process.env.SKYEAPI_PROJECT_ID;
    const provider = getArg("--provider", rest);
    const enabled = getArg("--enabled", rest);
    if (!projectId || !provider || enabled === undefined) throw new Error("Usage: skyeapi hosted set-provider --project <projectId> --provider <provider> --enabled <true|false>");
    console.log(JSON.stringify(await hostedRequest("/v1/admin/set-provider", { method: "POST", admin: true, json: { projectId, provider, enabled: boolArg(enabled), reason: getArg("--reason", rest) } }), null, 2));
    return;
  }

  if (subcommand === "policies") {
    const projectId = getArg("--project", rest) ?? process.env.SKYEAPI_PROJECT_ID;
    if (!projectId) throw new Error("Pass --project or set SKYEAPI_PROJECT_ID.");
    console.log(JSON.stringify(await hostedRequest(`/v1/admin/policies?projectId=${encodeURIComponent(projectId)}`, { admin: true }), null, 2));
    return;
  }

  if (subcommand === "set-policies") {
    const projectId = getArg("--project", rest) ?? process.env.SKYEAPI_PROJECT_ID;
    const file = getArg("--file", rest);
    if (!projectId || !file) throw new Error("Usage: skyeapi hosted set-policies --project <projectId> --file policies.json");
    const policies = JSON.parse(await readFile(file, "utf8"));
    console.log(JSON.stringify(await hostedRequest("/v1/admin/policies", { method: "POST", admin: true, json: { projectId, policies } }), null, 2));
    return;
  }

  if (subcommand === "roles") {
    const projectId = getArg("--project", rest) ?? process.env.SKYEAPI_PROJECT_ID;
    if (!projectId) throw new Error("Pass --project or set SKYEAPI_PROJECT_ID.");
    console.log(JSON.stringify(await hostedRequest(`/v1/admin/roles?projectId=${encodeURIComponent(projectId)}`, { admin: true }), null, 2));
    return;
  }

  if (subcommand === "set-roles") {
    const projectId = getArg("--project", rest) ?? process.env.SKYEAPI_PROJECT_ID;
    const file = getArg("--file", rest);
    if (!projectId || !file) throw new Error("Usage: skyeapi hosted set-roles --project <projectId> --file roles.json");
    const roles = JSON.parse(await readFile(file, "utf8"));
    console.log(JSON.stringify(await hostedRequest("/v1/admin/roles", { method: "POST", admin: true, json: { version: "skyeapi.roles.v1", projectId, updatedAt: new Date().toISOString(), roles } }), null, 2));
    return;
  }

  if (subcommand === "rotate-secret") {
    const projectId = getArg("--project", rest) ?? process.env.SKYEAPI_PROJECT_ID;
    const secretKey = getArg("--key", rest);
    const secretValue = getArg("--value", rest);
    if (!projectId || !secretKey || secretValue === undefined) throw new Error("Usage: skyeapi hosted rotate-secret --project <projectId> --key <ENV_KEY> --value <newValue>");
    console.log(JSON.stringify(await hostedRequest("/v1/admin/rotate-secret", { method: "POST", admin: true, json: { projectId, secretKey, secretValue, reason: getArg("--reason", rest) } }), null, 2));
    return;
  }

  if (subcommand === "rotations") {
    const projectId = getArg("--project", rest) ?? process.env.SKYEAPI_PROJECT_ID;
    if (!projectId) throw new Error("Pass --project or set SKYEAPI_PROJECT_ID.");
    console.log(JSON.stringify(await hostedRequest(`/v1/admin/rotations?projectId=${encodeURIComponent(projectId)}&limit=50`, { admin: true }), null, 2));
    return;
  }

  if (subcommand === "webhook-events") {
    const projectId = getArg("--project", rest) ?? process.env.SKYEAPI_PROJECT_ID;
    if (!projectId) throw new Error("Pass --project or set SKYEAPI_PROJECT_ID.");
    console.log(JSON.stringify(await hostedRequest(`/v1/admin/webhook-events?projectId=${encodeURIComponent(projectId)}&limit=50`, { admin: true }), null, 2));
    return;
  }

  if (subcommand === "replay-webhook") {
    const projectId = getArg("--project", rest) ?? process.env.SKYEAPI_PROJECT_ID;
    const eventId = getArg("--event", rest);
    if (!projectId || !eventId) throw new Error("Usage: skyeapi hosted replay-webhook --project <projectId> --event <eventId>");
    console.log(JSON.stringify(await hostedRequest("/v1/admin/replay-webhook", { method: "POST", admin: true, json: { projectId, eventId } }), null, 2));
    return;
  }


  if (subcommand === "approvals") {
    const projectId = getArg("--project", rest) ?? process.env.SKYEAPI_PROJECT_ID;
    if (!projectId) throw new Error("Pass --project or set SKYEAPI_PROJECT_ID.");
    console.log(JSON.stringify(await hostedRequest(`/v1/admin/approval-requests?projectId=${encodeURIComponent(projectId)}&limit=50`, { admin: true }), null, 2));
    return;
  }

  if (subcommand === "approve" || subcommand === "deny") {
    const projectId = getArg("--project", rest) ?? process.env.SKYEAPI_PROJECT_ID;
    const requestId = getArg("--request", rest);
    if (!projectId || !requestId) throw new Error(`Usage: skyeapi hosted ${subcommand} --project <projectId> --request <requestId>`);
    console.log(JSON.stringify(await hostedRequest("/v1/admin/approve-request", { method: "POST", admin: true, json: { projectId, requestId, action: subcommand === "approve" ? "approve" : "deny" } }), null, 2));
    return;
  }

  if (subcommand === "snapshots") {
    const projectId = getArg("--project", rest) ?? process.env.SKYEAPI_PROJECT_ID;
    if (!projectId) throw new Error("Pass --project or set SKYEAPI_PROJECT_ID.");
    console.log(JSON.stringify(await hostedRequest(`/v1/admin/snapshots?projectId=${encodeURIComponent(projectId)}&limit=50`, { admin: true }), null, 2));
    return;
  }

  if (subcommand === "snapshot") {
    const projectId = getArg("--project", rest) ?? process.env.SKYEAPI_PROJECT_ID;
    if (!projectId) throw new Error("Pass --project or set SKYEAPI_PROJECT_ID.");
    console.log(JSON.stringify(await hostedRequest("/v1/admin/create-snapshot", { method: "POST", admin: true, json: { projectId, reason: getArg("--reason", rest) } }), null, 2));
    return;
  }

  if (subcommand === "restore-snapshot") {
    const projectId = getArg("--project", rest) ?? process.env.SKYEAPI_PROJECT_ID;
    const snapshotId = getArg("--snapshot", rest);
    if (!projectId || !snapshotId) throw new Error("Usage: skyeapi hosted restore-snapshot --project <projectId> --snapshot <snapshotId>");
    console.log(JSON.stringify(await hostedRequest("/v1/admin/restore-snapshot", { method: "POST", admin: true, json: { projectId, snapshotId } }), null, 2));
    return;
  }

  if (subcommand === "workflow-runs") {
    const projectId = getArg("--project", rest) ?? process.env.SKYEAPI_PROJECT_ID;
    if (!projectId) throw new Error("Pass --project or set SKYEAPI_PROJECT_ID.");
    console.log(JSON.stringify(await hostedRequest(`/v1/admin/workflow-runs?projectId=${encodeURIComponent(projectId)}&limit=50${rest.includes("--details") ? "&details=true" : ""}`, { admin: true }), null, 2));
    return;
  }


  if (subcommand === "jobs") {
    const projectId = getArg("--project", rest) ?? process.env.SKYEAPI_PROJECT_ID;
    if (!projectId) throw new Error("Pass --project or set SKYEAPI_PROJECT_ID.");
    console.log(JSON.stringify(await hostedRequest(`/v1/admin/jobs?projectId=${encodeURIComponent(projectId)}`, { admin: true }), null, 2));
    return;
  }

  if (subcommand === "enqueue-job") {
    const projectId = getArg("--project", rest) ?? process.env.SKYEAPI_PROJECT_ID;
    const capability = getArg("--capability", rest) as CapabilityName | undefined;
    const jsonInput = getArg("--json", rest) ?? "{}";
    if (!projectId || !capability) throw new Error("Usage: skyeapi hosted enqueue-job --project <projectId> --capability <capability> --json '{...}' [--dry-run]");
    console.log(JSON.stringify(await hostedRequest("/v1/admin/jobs", { method: "POST", admin: true, json: { projectId, envelope: { capability, input: JSON.parse(jsonInput), dryRun: rest.includes("--dry-run") }, maxAttempts: getArg("--max-attempts", rest) ? Number(getArg("--max-attempts", rest)) : undefined } }), null, 2));
    return;
  }

  if (subcommand === "process-job") {
    const projectId = getArg("--project", rest) ?? process.env.SKYEAPI_PROJECT_ID;
    if (!projectId) throw new Error("Pass --project or set SKYEAPI_PROJECT_ID.");
    console.log(JSON.stringify(await hostedRequest("/v1/admin/process-job", { method: "POST", admin: true, json: { projectId } }), null, 2));
    return;
  }

  if (subcommand === "cancel-job") {
    const projectId = getArg("--project", rest) ?? process.env.SKYEAPI_PROJECT_ID;
    const jobId = getArg("--job", rest);
    if (!projectId || !jobId) throw new Error("Usage: skyeapi hosted cancel-job --project <projectId> --job <jobId>");
    console.log(JSON.stringify(await hostedRequest("/v1/admin/cancel-job", { method: "POST", admin: true, json: { projectId, jobId, reason: getArg("--reason", rest) } }), null, 2));
    return;
  }



  if (subcommand === "dead-letter-jobs") {
    const projectId = getArg("--project", rest) ?? process.env.SKYEAPI_PROJECT_ID;
    if (!projectId) throw new Error("Pass --project or set SKYEAPI_PROJECT_ID.");
    console.log(JSON.stringify(await hostedRequest(`/v1/admin/dead-letter-jobs?projectId=${encodeURIComponent(projectId)}`, { admin: true }), null, 2));
    return;
  }

  if (subcommand === "retry-dead-letter-job") {
    const projectId = getArg("--project", rest) ?? process.env.SKYEAPI_PROJECT_ID;
    const jobId = getArg("--job", rest);
    if (!projectId || !jobId) throw new Error("Usage: skyeapi hosted retry-dead-letter-job --project <projectId> --job <jobId>");
    console.log(JSON.stringify(await hostedRequest("/v1/admin/retry-dead-letter-job", { method: "POST", admin: true, json: { projectId, jobId } }), null, 2));
    return;
  }

  if (subcommand === "outbound-subscriptions") {
    const projectId = getArg("--project", rest) ?? process.env.SKYEAPI_PROJECT_ID;
    if (!projectId) throw new Error("Pass --project or set SKYEAPI_PROJECT_ID.");
    console.log(JSON.stringify(await hostedRequest(`/v1/admin/outbound-subscriptions?projectId=${encodeURIComponent(projectId)}`, { admin: true }), null, 2));
    return;
  }

  if (subcommand === "outbound-subscribe") {
    const projectId = getArg("--project", rest) ?? process.env.SKYEAPI_PROJECT_ID;
    const url = getArg("--url", rest);
    const events = (getArg("--events", rest) ?? "*").split(",").map((item) => item.trim()).filter(Boolean);
    if (!projectId || !url) throw new Error("Usage: skyeapi hosted outbound-subscribe --project <projectId> --url <https://...> --events 'workflow.completed,capability.called'");
    console.log(JSON.stringify(await hostedRequest("/v1/admin/outbound-subscriptions", { method: "POST", admin: true, json: { projectId, url, events, secretRef: getArg("--secret-ref", rest), enabled: !rest.includes("--disabled") } }), null, 2));
    return;
  }



  if (subcommand === "outbound-update") {
    const projectId = getArg("--project", rest) ?? process.env.SKYEAPI_PROJECT_ID;
    const subscriptionId = getArg("--subscription", rest);
    if (!projectId || !subscriptionId) throw new Error("Usage: skyeapi hosted outbound-update --project <projectId> --subscription <id> [--enabled true|false]");
    console.log(JSON.stringify(await hostedRequest("/v1/admin/update-outbound-subscription", { method: "POST", admin: true, json: { projectId, subscriptionId, url: getArg("--url", rest), events: getArg("--events", rest)?.split(",").map((item) => item.trim()).filter(Boolean), enabled: getArg("--enabled", rest) ? boolArg(getArg("--enabled", rest)) : undefined, maxAttempts: getArg("--max-attempts", rest) ? Number(getArg("--max-attempts", rest)) : undefined } }), null, 2));
    return;
  }

  if (subcommand === "outbound-delete") {
    const projectId = getArg("--project", rest) ?? process.env.SKYEAPI_PROJECT_ID;
    const subscriptionId = getArg("--subscription", rest);
    if (!projectId || !subscriptionId) throw new Error("Usage: skyeapi hosted outbound-delete --project <projectId> --subscription <id>");
    console.log(JSON.stringify(await hostedRequest("/v1/admin/delete-outbound-subscription", { method: "POST", admin: true, json: { projectId, subscriptionId } }), null, 2));
    return;
  }

  if (subcommand === "outbound-emit") {
    const projectId = getArg("--project", rest) ?? process.env.SKYEAPI_PROJECT_ID;
    const eventType = getArg("--event", rest);
    const jsonInput = getArg("--json", rest) ?? "{}";
    if (!projectId || !eventType) throw new Error("Usage: skyeapi hosted outbound-emit --project <projectId> --event <eventType> --json '{...}'");
    console.log(JSON.stringify(await hostedRequest("/v1/admin/outbound-events", { method: "POST", admin: true, json: { projectId, eventType, payload: JSON.parse(jsonInput) } }), null, 2));
    return;
  }

  if (subcommand === "outbound-deliveries") {
    const projectId = getArg("--project", rest) ?? process.env.SKYEAPI_PROJECT_ID;
    if (!projectId) throw new Error("Pass --project or set SKYEAPI_PROJECT_ID.");
    console.log(JSON.stringify(await hostedRequest(`/v1/admin/outbound-deliveries?projectId=${encodeURIComponent(projectId)}`, { admin: true }), null, 2));
    return;
  }



  if (subcommand === "outbound-dead-letters") {
    const projectId = getArg("--project", rest) ?? process.env.SKYEAPI_PROJECT_ID;
    if (!projectId) throw new Error("Pass --project or set SKYEAPI_PROJECT_ID.");
    console.log(JSON.stringify(await hostedRequest(`/v1/admin/dead-letter-outbound?projectId=${encodeURIComponent(projectId)}`, { admin: true }), null, 2));
    return;
  }

  if (subcommand === "outbound-process") {
    const projectId = getArg("--project", rest) ?? process.env.SKYEAPI_PROJECT_ID;
    if (!projectId) throw new Error("Pass --project or set SKYEAPI_PROJECT_ID.");
    console.log(JSON.stringify(await hostedRequest("/v1/admin/process-outbound", { method: "POST", admin: true, json: { projectId } }), null, 2));
    return;
  }

  if (subcommand === "anomalies") {
    const projectId = getArg("--project", rest) ?? process.env.SKYEAPI_PROJECT_ID;
    if (!projectId) throw new Error("Pass --project or set SKYEAPI_PROJECT_ID.");
    console.log(JSON.stringify(await hostedRequest(`/v1/admin/anomalies?projectId=${encodeURIComponent(projectId)}`, { admin: true }), null, 2));
    return;
  }

  if (subcommand === "doctor") {
    const projectId = getArg("--project", rest) ?? process.env.SKYEAPI_PROJECT_ID;
    if (!projectId) throw new Error("Pass --project or set SKYEAPI_PROJECT_ID.");
    console.log(JSON.stringify(await hostedRequest(`/v1/admin/doctor?projectId=${encodeURIComponent(projectId)}`, { admin: true }), null, 2));
    return;
  }

  if (subcommand === "ops-readiness") {
    console.log(JSON.stringify(await hostedRequest("/v1/admin/ops-readiness", { admin: true }), null, 2));
    return;
  }



  if (subcommand === "billing-usage") {
    const projectId = getArg("--project", rest) ?? process.env.SKYEAPI_PROJECT_ID;
    if (!projectId) throw new Error("Pass --project or set SKYEAPI_PROJECT_ID.");
    const date = getArg("--date", rest);
    console.log(JSON.stringify(await hostedRequest(`/v1/admin/billing-usage?projectId=${encodeURIComponent(projectId)}${date ? `&date=${encodeURIComponent(date)}` : ""}`, { admin: true }), null, 2));
    return;
  }

  if (subcommand === "pack-registry") {
    console.log(JSON.stringify(await hostedRequest("/v1/admin/provider-pack-registry", { admin: true }), null, 2));
    return;
  }

  if (subcommand === "publish-pack") {
    const file = getArg("--file", rest) ?? rest[0];
    if (!file) throw new Error("Usage: skyeapi hosted publish-pack --file provider-packs/custom/pack.json [--version-tag 0.1.0]");
    const pack = JSON.parse(await readFile(file, "utf8"));
    console.log(JSON.stringify(await hostedRequest("/v1/admin/provider-pack-registry", { method: "POST", admin: true, json: { pack, versionTag: getArg("--version-tag", rest), status: getArg("--status", rest) } }), null, 2));
    return;
  }

  if (subcommand === "install-pack") {
    const projectId = getArg("--project", rest) ?? process.env.SKYEAPI_PROJECT_ID;
    const registryId = getArg("--registry", rest);
    if (!projectId || !registryId) throw new Error("Usage: skyeapi hosted install-pack --project <projectId> --registry <registryId>");
    console.log(JSON.stringify(await hostedRequest("/v1/admin/install-provider-pack", { method: "POST", admin: true, json: { projectId, registryId, enabled: !rest.includes("--disabled") } }), null, 2));
    return;
  }

  if (subcommand === "pack-installations") {
    const projectId = getArg("--project", rest) ?? process.env.SKYEAPI_PROJECT_ID;
    if (!projectId) throw new Error("Pass --project or set SKYEAPI_PROJECT_ID.");
    console.log(JSON.stringify(await hostedRequest(`/v1/admin/provider-pack-installations?projectId=${encodeURIComponent(projectId)}`, { admin: true }), null, 2));
    return;
  }

  if (subcommand === "certify-pack") {
    const file = getArg("--file", rest) ?? rest[0];
    if (!file) throw new Error("Usage: skyeapi hosted certify-pack --file provider-packs/custom/pack.json");
    const pack = JSON.parse(await readFile(file, "utf8"));
    console.log(JSON.stringify(await hostedRequest("/v1/admin/provider-pack-certify", { method: "POST", admin: true, json: { pack } }), null, 2));
    return;
  }

  if (subcommand === "scaffold-pack") {
    const provider = getArg("--provider", rest);
    const label = getArg("--label", rest) ?? provider;
    const capabilities = (getArg("--capabilities", rest) ?? "").split(",").map((item) => item.trim()).filter(Boolean);
    const requiredSecrets = (getArg("--required", rest) ?? "").split(",").map((item) => item.trim()).filter(Boolean);
    if (!provider || !label || capabilities.length === 0) throw new Error("Usage: skyeapi hosted scaffold-pack --provider <id> --label <label> --capabilities email.send --required API_KEY");
    console.log(JSON.stringify(await hostedRequest("/v1/admin/provider-pack-scaffold", { method: "POST", admin: true, json: { provider, label, capabilities, requiredSecrets, category: getArg("--category", rest) ?? "system" } }), null, 2));
    return;
  }


  if (subcommand === "claim-job-lease") {
    const projectId = getArg("--project", rest) ?? process.env.SKYEAPI_PROJECT_ID;
    if (!projectId) throw new Error("Pass --project or set SKYEAPI_PROJECT_ID.");
    console.log(JSON.stringify(await hostedRequest("/v1/admin/claim-job-lease", { method: "POST", admin: true, json: { projectId, leaseMs: getArg("--lease-ms", rest) ? Number(getArg("--lease-ms", rest)) : undefined } }), null, 2));
    return;
  }

  if (subcommand === "complete-job-lease") {
    const projectId = getArg("--project", rest) ?? process.env.SKYEAPI_PROJECT_ID;
    const jobId = getArg("--job", rest);
    const leaseToken = getArg("--lease-token", rest);
    const resultFile = getArg("--result", rest);
    if (!projectId || !jobId || !leaseToken || !resultFile) throw new Error("Usage: skyeapi hosted complete-job-lease --project <projectId> --job <jobId> --lease-token <token> --result result.json");
    const result = JSON.parse(await readFile(resultFile, "utf8"));
    console.log(JSON.stringify(await hostedRequest("/v1/admin/complete-job-lease", { method: "POST", admin: true, json: { projectId, jobId, leaseToken, result } }), null, 2));
    return;
  }

  if (subcommand === "pack-dependencies") {
    const file = getArg("--file", rest) ?? rest[0];
    if (!file) throw new Error("Usage: skyeapi hosted pack-dependencies --file provider-packs/custom/pack.json");
    const pack = JSON.parse(await readFile(file, "utf8"));
    console.log(JSON.stringify(await hostedRequest("/v1/admin/provider-pack-dependencies", { method: "POST", admin: true, json: { pack } }), null, 2));
    return;
  }

  if (subcommand === "sign-pack") {
    const file = getArg("--file", rest) ?? rest[0];
    const signer = getArg("--signer", rest) ?? "cli";
    if (!file) throw new Error("Usage: skyeapi hosted sign-pack --file provider-packs/custom/pack.json --signer cli");
    const pack = JSON.parse(await readFile(file, "utf8"));
    console.log(JSON.stringify(await hostedRequest("/v1/admin/provider-pack-sign", { method: "POST", admin: true, json: { pack, versionTag: getArg("--version-tag", rest), signer } }), null, 2));
    return;
  }

  if (subcommand === "verify-pack") {
    const file = getArg("--file", rest) ?? rest[0];
    const manifestFile = getArg("--manifest", rest);
    if (!file || !manifestFile) throw new Error("Usage: skyeapi hosted verify-pack --file provider-packs/custom/pack.json --manifest signed-manifest.json");
    const pack = JSON.parse(await readFile(file, "utf8"));
    const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
    console.log(JSON.stringify(await hostedRequest("/v1/admin/provider-pack-verify", { method: "POST", admin: true, json: { pack, manifest } }), null, 2));
    return;
  }

  if (subcommand === "certification-receipt") {
    const file = getArg("--file", rest) ?? rest[0];
    if (!file) throw new Error("Usage: skyeapi hosted certification-receipt --file provider-packs/custom/pack.json [--signer cli]");
    const pack = JSON.parse(await readFile(file, "utf8"));
    console.log(JSON.stringify(await hostedRequest("/v1/admin/provider-pack-certification-receipt", { method: "POST", admin: true, json: { pack, versionTag: getArg("--version-tag", rest), signer: getArg("--signer", rest) } }), null, 2));
    return;
  }

  if (subcommand === "install-pack-source") {
    const projectId = getArg("--project", rest) ?? process.env.SKYEAPI_PROJECT_ID;
    const file = getArg("--file", rest) ?? rest[0];
    if (!projectId || !file) throw new Error("Usage: skyeapi hosted install-pack-source --project <projectId> --file pack.json --source <inline|directory|zip|git> [--source-uri uri]");
    const pack = JSON.parse(await readFile(file, "utf8"));
    console.log(JSON.stringify(await hostedRequest("/v1/admin/install-provider-pack-source", { method: "POST", admin: true, json: { projectId, pack, sourceType: getArg("--source", rest) ?? "inline", sourceUri: getArg("--source-uri", rest), versionTag: getArg("--version-tag", rest), enabled: !rest.includes("--disabled") } }), null, 2));
    return;
  }

  if (subcommand === "billing-usage-export") {
    const projectId = getArg("--project", rest) ?? process.env.SKYEAPI_PROJECT_ID;
    if (!projectId) throw new Error("Pass --project or set SKYEAPI_PROJECT_ID.");
    const format = getArg("--format", rest) ?? "csv";
    const date = getArg("--date", rest);
    const path = `/v1/admin/billing-usage-export?projectId=${encodeURIComponent(projectId)}&format=${encodeURIComponent(format)}${date ? `&date=${encodeURIComponent(date)}` : ""}`;
    console.log(await hostedRequestText(path));
    return;
  }

  if (subcommand === "billing-invoice") {
    const projectId = getArg("--project", rest) ?? process.env.SKYEAPI_PROJECT_ID;
    if (!projectId) throw new Error("Pass --project or set SKYEAPI_PROJECT_ID.");
    const date = getArg("--date", rest);
    const qs = `/v1/admin/billing-invoice?projectId=${encodeURIComponent(projectId)}${date ? `&date=${encodeURIComponent(date)}` : ""}`;
    console.log(JSON.stringify(await hostedRequest(qs, { admin: true }), null, 2));
    return;
  }

  if (subcommand === "billing-invoice-export") {
    const projectId = getArg("--project", rest) ?? process.env.SKYEAPI_PROJECT_ID;
    if (!projectId) throw new Error("Pass --project or set SKYEAPI_PROJECT_ID.");
    const format = getArg("--format", rest) ?? "json";
    const date = getArg("--date", rest);
    const path = `/v1/admin/billing-invoice-export?projectId=${encodeURIComponent(projectId)}&format=${encodeURIComponent(format)}${date ? `&date=${encodeURIComponent(date)}` : ""}`;
    console.log(await hostedRequestText(path));
    return;
  }


  if (subcommand === "provider-pack-sandbox") {
    const file = getArg("--file", rest) ?? rest[0];
    if (!file) throw new Error("Usage: skyeapi hosted provider-pack-sandbox --file pack.json [--adapter adapter.ts]");
    const adapterFile = getArg("--adapter", rest);
    const pack = JSON.parse(await readFile(file, "utf8"));
    const adapterSource = adapterFile ? await readFile(adapterFile, "utf8") : undefined;
    console.log(JSON.stringify(await hostedRequest("/v1/admin/provider-pack-sandbox", { method: "POST", admin: true, json: { pack, adapterSource } }), null, 2));
    return;
  }

  if (subcommand === "provider-fixture-certification") {
    const provider = getArg("--provider", rest);
    const capability = getArg("--capability", rest);
    const endpoint = getArg("--endpoint", rest);
    if (!provider || !capability || !endpoint) throw new Error("Usage: skyeapi hosted provider-fixture-certification --provider resend --capability email.send --endpoint http://127.0.0.1:8789/fixture/resend");
    console.log(JSON.stringify(await hostedRequest("/v1/admin/provider-fixture-certification", { method: "POST", admin: true, json: { provider, capability, endpoint, mode: getArg("--mode", rest) ?? "fixture", timeoutMs: getArg("--timeout-ms", rest) ? Number(getArg("--timeout-ms", rest)) : undefined } }), null, 2));
    return;
  }

  if (subcommand === "billing-invoice-create") {
    const projectId = getArg("--project", rest) ?? process.env.SKYEAPI_PROJECT_ID;
    if (!projectId) throw new Error("Pass --project or set SKYEAPI_PROJECT_ID.");
    console.log(JSON.stringify(await hostedRequest("/v1/admin/billing-invoice-create", { method: "POST", admin: true, json: { projectId, customerEmail: getArg("--customer-email", rest), customerName: getArg("--customer-name", rest), dueDays: getArg("--due-days", rest) ? Number(getArg("--due-days", rest)) : undefined, note: getArg("--note", rest) } }), null, 2));
    return;
  }

  if (subcommand === "billing-invoice-reconcile") {
    const projectId = getArg("--project", rest) ?? process.env.SKYEAPI_PROJECT_ID;
    const invoiceId = getArg("--invoice", rest);
    if (!projectId || !invoiceId) throw new Error("Usage: skyeapi hosted billing-invoice-reconcile --project <projectId> --invoice <id> [--date YYYY-MM-DD]");
    console.log(JSON.stringify(await hostedRequest("/v1/admin/billing-invoice-reconcile", { method: "POST", admin: true, json: { projectId, invoiceId, date: getArg("--date", rest) } }), null, 2));
    return;
  }

  if (subcommand === "billing-invoices") {
    const projectId = getArg("--project", rest) ?? process.env.SKYEAPI_PROJECT_ID;
    if (!projectId) throw new Error("Pass --project or set SKYEAPI_PROJECT_ID.");
    console.log(JSON.stringify(await hostedRequest(`/v1/admin/billing-invoices?projectId=${encodeURIComponent(projectId)}`, { admin: true }), null, 2));
    return;
  }

  if (subcommand === "billing-invoice-status") {
    const projectId = getArg("--project", rest) ?? process.env.SKYEAPI_PROJECT_ID;
    const invoiceId = getArg("--invoice", rest);
    const status = getArg("--status", rest);
    if (!projectId || !invoiceId || !status) throw new Error("Usage: skyeapi hosted billing-invoice-status --project <projectId> --invoice <id> --status <draft|issued|paid|void>");
    console.log(JSON.stringify(await hostedRequest("/v1/admin/billing-invoice-status", { method: "POST", admin: true, json: { projectId, invoiceId, status, note: getArg("--note", rest) } }), null, 2));
    return;
  }

  if (subcommand === "subscription-create") {
    const projectId = getArg("--project", rest) ?? process.env.SKYEAPI_PROJECT_ID;
    const plan = getArg("--plan", rest);
    if (!projectId || !plan) throw new Error("Usage: skyeapi hosted subscription-create --project <projectId> --plan <plan>");
    console.log(JSON.stringify(await hostedRequest("/v1/admin/subscriptions", { method: "POST", admin: true, json: { projectId, plan, customerEmail: getArg("--customer-email", rest), billingCycle: getArg("--billing-cycle", rest), basePriceCents: getArg("--base-price-cents", rest) ? Number(getArg("--base-price-cents", rest)) : undefined, includedCalls: getArg("--included-calls", rest) ? Number(getArg("--included-calls", rest)) : undefined, overageUnitPriceCents: getArg("--overage-cents", rest) ? Number(getArg("--overage-cents", rest)) : undefined, trialDays: getArg("--trial-days", rest) ? Number(getArg("--trial-days", rest)) : undefined, paymentProvider: getArg("--payment-provider", rest), paymentProviderCustomerId: getArg("--provider-customer", rest), paymentProviderSubscriptionId: getArg("--provider-subscription", rest), paymentProviderPriceId: getArg("--provider-price", rest) } }), null, 2));
    return;
  }

  if (subcommand === "subscription-lifecycle") {
    const projectId = getArg("--project", rest) ?? process.env.SKYEAPI_PROJECT_ID;
    const subscriptionId = getArg("--subscription", rest);
    const action = getArg("--action", rest);
    if (!projectId || !subscriptionId || !action) throw new Error("Usage: skyeapi hosted subscription-lifecycle --project <projectId> --subscription <id> --action <pause|resume|cancel|renew|payment_failed|update>");
    console.log(JSON.stringify(await hostedRequest("/v1/admin/subscription-lifecycle", { method: "POST", admin: true, json: { projectId, subscriptionId, action, plan: getArg("--plan", rest), status: getArg("--status", rest), note: getArg("--note", rest), paymentProvider: getArg("--payment-provider", rest), paymentProviderCustomerId: getArg("--provider-customer", rest), paymentProviderSubscriptionId: getArg("--provider-subscription", rest), paymentProviderPriceId: getArg("--provider-price", rest) } }), null, 2));
    return;
  }

  if (subcommand === "subscriptions") {
    const projectId = getArg("--project", rest) ?? process.env.SKYEAPI_PROJECT_ID;
    if (!projectId) throw new Error("Pass --project or set SKYEAPI_PROJECT_ID.");
    console.log(JSON.stringify(await hostedRequest(`/v1/admin/subscriptions?projectId=${encodeURIComponent(projectId)}`, { admin: true }), null, 2));
    return;
  }

  if (subcommand === "workspace-bind") {
    const workspaceId = getArg("--workspace", rest);
    const projectId = getArg("--project", rest) ?? process.env.SKYEAPI_PROJECT_ID;
    if (!workspaceId || !projectId) throw new Error("Usage: skyeapi hosted workspace-bind --workspace <workspaceId> --project <projectId> --roles owner,developer");
    console.log(JSON.stringify(await hostedRequest("/v1/admin/workspace-bindings", { method: "POST", admin: true, json: { workspaceId, projectId, roles: splitScopes(getArg("--roles", rest) ?? "owner") } }), null, 2));
    return;
  }

  if (subcommand === "workspace-bindings") {
    const workspaceId = getArg("--workspace", rest);
    console.log(JSON.stringify(await hostedRequest(`/v1/admin/workspace-bindings${workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : ""}`, { admin: true }), null, 2));
    return;
  }

  if (subcommand === "workspace-access-check") {
    const workspaceId = getArg("--workspace", rest);
    const projectId = getArg("--project", rest) ?? process.env.SKYEAPI_PROJECT_ID;
    const role = getArg("--role", rest);
    const capability = getArg("--capability", rest);
    if (!workspaceId || !projectId) throw new Error("Usage: skyeapi hosted workspace-access-check --workspace <workspaceId> --project <projectId> --role <role> --capability <capability>");
    console.log(JSON.stringify(await hostedRequest("/v1/admin/workspace-access-check", { method: "POST", admin: true, json: { workspaceId, projectId, role, capability } }), null, 2));
    return;
  }

  if (subcommand === "audit-export") {
    const projectId = getArg("--project", rest) ?? process.env.SKYEAPI_PROJECT_ID;
    if (!projectId) throw new Error("Pass --project or set SKYEAPI_PROJECT_ID.");
    console.log(JSON.stringify(await hostedRequest(`/v1/admin/audit-export?projectId=${encodeURIComponent(projectId)}`, { admin: true }), null, 2));
    return;
  }

  usage();
}

async function main(): Promise<void> {
  const [, , command, ...args] = process.argv;
  if (!command || command === "help" || command === "--help") {
    usage();
    return;
  }

  if (command === "hosted") {
    await handleHosted(args);
    return;
  }

  if (command === "init") {
    const payload = await core().init();
    console.log(JSON.stringify({ ok: true, vault: defaultVaultPath(), projectId: payload.projectId ?? null }, null, 2));
    return;
  }

  if (command === "import-env") {
    const path = args[0] ?? ".env";
    const text = await readFile(path, "utf8");
    const manifest = await core().importEnvText(text);
    console.log(JSON.stringify(manifest, null, 2));
    return;
  }

  if (command === "scan") {
    const path = args[0] ?? ".env";
    const text = await readFile(path, "utf8");
    const env = parseDotEnv(text);
    const manifest = buildSafeManifest(env, process.env.SKYEAPI_PROJECT_ID);
    const validation = validateEnvImport(env);
    assertNoKnownSecretLeak(manifest, env);
    console.log(JSON.stringify({ manifest, validation, secrets_exposed: false }, null, 2));
    return;
  }

  if (command === "providers") {
    const manifest = await core().safeManifest();
    console.log(JSON.stringify(manifest.providers, null, 2));
    return;
  }

  if (command === "capabilities") {
    const manifest = await core().safeManifest();
    console.log(JSON.stringify(manifest.capabilities, null, 2));
    return;
  }

  if (command === "export" && args[0] === "safe-manifest") {
    const manifest = await core().safeManifest();
    console.log(JSON.stringify(manifest, null, 2));
    return;
  }

  if (command === "test") {
    const target = args[0] ?? "all";
    const manifest = await core().safeManifest();
    const enabled = manifest.capabilities.filter((capability) => capability.enabled);
    const selected = target === "all" ? enabled : enabled.filter((capability) => capability.provider === target || capability.name === target);
    const results = selected.map((capability) => ({ capability: capability.name, provider: capability.provider, status: "configured", note: "Live provider call not executed by test command unless using skyeapi call with explicit input." }));
    console.log(JSON.stringify({ ok: true, results, secrets_exposed: false }, null, 2));
    return;
  }

  if (command === "call") {
    const capability = args[0] as CapabilityName | undefined;
    const jsonInput = getArg("--json", args);
    if (!capability || !jsonInput) throw new Error("Usage: skyeapi call <capability> --json '{...}'");
    const adapter = findAdapter(capability);
    if (!adapter) throw new Error(`No local adapter for ${capability}`);
    const secrets = await core().getProviderSecrets(adapter.provider);
    const input = JSON.parse(jsonInput);
    const result = await adapter.execute(input, { provider: adapter.provider, secrets });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "workflow" && args[0] === "sample") {
    console.log(JSON.stringify({
      workflowId: "welcome-flow",
      input: { email: "client@example.com", name: "Client" },
      steps: [
        {
          id: "draft",
          capability: "ai.generate_text",
          input: {
            system: "Write concise transactional product copy.",
            prompt: "Write a short welcome email for {{input.name}}."
          }
        },
        {
          id: "send",
          capability: "email.send",
          input: {
            to: "{{input.email}}",
            subject: "Welcome from SkyeAPI",
            body: "{{steps.draft.data.text}}"
          }
        }
      ]
    }, null, 2));
    return;
  }

  if (command === "workflow" && args[0] === "run") {
    const file = getArg("--file", args) ?? args[1];
    if (!file) throw new Error("Usage: skyeapi workflow run --file <workflow.json> [--dry-run]");
    const workflow = JSON.parse(await readFile(file, "utf8"));
    const result = await executeLocalWorkflow(workflow, await core().getAllProviderSecrets(), { dryRun: args.includes("--dry-run") });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "policy" && args[0] === "eval") {
    const capability = getArg("--capability", args) as CapabilityName | undefined;
    const policyFile = getArg("--policies", args);
    const jsonInput = getArg("--json", args);
    if (!capability || !policyFile || !jsonInput) throw new Error("Usage: skyeapi policy eval --capability <capability> --policies policies.json --json '{...}'");
    const policies = JSON.parse(await readFile(policyFile, "utf8"));
    const result = evaluatePolicyRules(capability, JSON.parse(jsonInput), policies);
    console.log(JSON.stringify({ ok: true, result, secrets_exposed: false }, null, 2));
    return;
  }

  if (command === "mcp" && args[0] === "start") {
    const child = spawn(process.execPath, [new URL("../../mcp-server/dist/index.js", import.meta.url).pathname], { stdio: "inherit", env: process.env });
    child.on("exit", (code) => process.exit(code ?? 0));
    return;
  }

  if (command === "console") {
    const child = spawn(process.execPath, [new URL("../../../apps/console/tools/serve.mjs", import.meta.url).pathname], { stdio: "inherit", env: process.env });
    child.on("exit", (code) => process.exit(code ?? 0));
    return;
  }

  if (command === "generate" && args[0] === "integration-prompt") {
    const target = getArg("--for", args) ?? "generic-agent";
    const path = new URL(`../../../prompts/${target}.md`, import.meta.url).pathname;
    const prompt = await readFile(path, "utf8");
    console.log(prompt);
    return;
  }

  if (command === "doctor") {
    const vault = core();
    let manifest = undefined;
    try {
      { const grouped = await vault.getAllProviderSecrets(); manifest = buildSafeManifest(Object.assign({}, ...Object.values(grouped)), process.env.SKYEAPI_PROJECT_ID); }
    } catch {
      manifest = undefined;
    }
    const pkg = JSON.parse(await readFile(new URL("../../../package.json", import.meta.url), "utf8"));
    const report = runDeveloperDoctor({
      manifest,
      packageScripts: pkg.scripts,
      policies: []
    });
    console.log(JSON.stringify({
      ...report,
      node: process.version,
      vaultPath: defaultVaultPath(),
      hasPassphrase: Boolean(process.env.SKYEAPI_VAULT_PASSPHRASE),
      projectId: process.env.SKYEAPI_PROJECT_ID ?? null,
      hosted: {
        baseUrlConfigured: Boolean(process.env.SKYEAPI_BASE_URL),
        adminKeyConfigured: Boolean(process.env.SKYE_ADMIN_KEY),
        apiKeyConfigured: Boolean(process.env.SKYEAPI_KEY)
      }
    }, null, 2));
    return;
  }

  if (command === "adapters" && args[0] === "conformance") {
    console.log(JSON.stringify(await runAdapterConformance(DEFAULT_ADAPTERS), null, 2));
    return;
  }



  if (command === "provider-pack" && args[0] === "load-source") {
    const source = (getArg("--source", args) ?? "inline") as "inline" | "directory" | "zip" | "git";
    const file = getArg("--file", args);
    const inlinePack = file ? JSON.parse(await readFile(file, "utf8")) : undefined;
    const loaded = await loadProviderPackFromSource({ sourceType: source, sourceUri: getArg("--source-uri", args), inlinePack, versionTag: getArg("--version-tag", args) });
    console.log(JSON.stringify(loaded, null, 2));
    return;
  }

  if (command === "provider-pack" && args[0] === "sandbox") {
    const file = getArg("--file", args) ?? args[1];
    if (!file) throw new Error("Usage: skyeapi provider-pack sandbox --file pack.json [--adapter adapter.ts]");
    const adapterFile = getArg("--adapter", args);
    const pack = JSON.parse(await readFile(file, "utf8"));
    const adapterSource = adapterFile ? await readFile(adapterFile, "utf8") : undefined;
    console.log(JSON.stringify(await runProviderPackSandbox({ pack, adapterSource }), null, 2));
    return;
  }

  if (command === "provider-pack" && args[0] === "certify") {
    const file = getArg("--file", args) ?? args[1];
    if (!file) throw new Error("Usage: skyeapi provider-pack certify --file provider-packs/custom/pack.json");
    const pack = JSON.parse(await readFile(file, "utf8"));
    console.log(JSON.stringify(certifyProviderPackDefinition(pack), null, 2));
    return;
  }

  if (command === "provider-pack" && args[0] === "scaffold") {
    const provider = getArg("--provider", args);
    const label = getArg("--label", args) ?? provider;
    const capabilities = (getArg("--capabilities", args) ?? "").split(",").map((item) => item.trim()).filter(Boolean) as CapabilityName[];
    const requiredSecrets = (getArg("--required", args) ?? "").split(",").map((item) => item.trim()).filter(Boolean);
    if (!provider || !label || capabilities.length === 0) throw new Error("Usage: skyeapi provider-pack scaffold --provider <id> --label <label> --capabilities email.send --required RESEND_API_KEY");
    console.log(JSON.stringify(createProviderPackScaffold({ provider, label, capabilities, requiredSecrets, category: getArg("--category", args) ?? "custom" }), null, 2));
    return;
  }


  usage();
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }, null, 2));
  process.exit(1);
});
