import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const siteDir = path.join(root, "metraiyux_0s_site");
const failures = [];

function fail(message) {
  failures.push(message);
}

async function read(filePath) {
  return fs.readFile(filePath, "utf8");
}

async function readJson(filePath) {
  return JSON.parse(await read(filePath));
}

function requireTokens(label, source, tokens) {
  for (const token of tokens) {
    if (!source.includes(token)) fail(`${label} missing token: ${token}`);
  }
}

const vision = await read(path.join(root, "SOVEREIGN_STACK_VISION.md"));
requireTokens("SOVEREIGN_STACK_VISION.md", vision, [
  "MetrAIyux 0S",
  "FS27",
  "CitadelDB",
  "SkyeVault",
  "SkyeMail",
  "VPS",
  "AI caps are FS27 billable spend ceilings"
]);

const aiPricing = await readJson(path.join(siteDir, "data", "ai-provider-pricing.json"));
if (!Array.isArray(aiPricing.fs27_billable_rate_card) || aiPricing.fs27_billable_rate_card.length < 6) {
  fail("ai-provider-pricing.json must expose at least six FS27 billable model rows");
}
for (const model of ["gpt-4o-mini", "gpt-4o", "gemini-2.5-flash", "gemini-embedding-001", "claude-3-5-sonnet-20241022", "claude-opus-4-6"]) {
  if (!aiPricing.fs27_billable_rate_card?.some((row) => row.model === model)) {
    fail(`ai-provider-pricing.json missing model ${model}`);
  }
}
for (const sourceKey of ["openai", "google_gemini", "anthropic"]) {
  if (!aiPricing.sources?.[sourceKey]) fail(`ai-provider-pricing.json missing source ${sourceKey}`);
}

const sovereignStack = await readJson(path.join(siteDir, "data", "sovereign-stack.json"));
for (const lane of ["citadeldb", "skyevault", "skyemail", "fs27-parent-gate", "skyepay"]) {
  if (!sovereignStack.lanes?.some((row) => row.id === lane)) fail(`sovereign-stack.json missing lane ${lane}`);
}

const pricingPage = await read(path.join(siteDir, "pricing", "index.html"));
requireTokens("pricing/index.html", pricingPage, [
  "How MetrAIyux makes money",
  "AI model rate card",
  "Sovereign stack choices",
  "CitadelDB",
  "SkyeVault",
  "SkyeMail",
  "AI caps are FS27 billable spend ceilings"
]);

const saasPricing = await read(path.join(siteDir, "saas", "pricing.html"));
requireTokens("saas/pricing.html", saasPricing, [
  "AI usage is priced through FS27",
  "Sovereign stack options",
  "CitadelDB",
  "SkyeVault",
  "SkyeMail"
]);

const worker = await read(path.join(siteDir, "cloudflare-saas-provisioning-worker", "src", "index.js"));
requireTokens("worker index.js", worker, [
  "FS27_EVENT_MIRROR_URL",
  "mirrorToFs27",
  "/api/saas/action-event",
  "/api/saas/sovereign-stack",
  "/api/saas/workspace-stack",
  "citadeldb_or_neon_owner_choice",
  "AI_RATE_CARD",
  "SOVEREIGN_STACK"
]);

const stackMigration = await read(path.join(siteDir, "cloudflare-saas-provisioning-worker", "migrations", "0005_sovereign_stack_lanes.sql"));
requireTokens("0005_sovereign_stack_lanes.sql", stackMigration, [
  "workspace_stack_lanes",
  "database_lane",
  "vault_lane",
  "mail_lane"
]);

const mirrorEndpoint = await read(path.join(root, "SkyeGateFS27", "netlify", "functions", "platform-event-mirror.js"));
requireTokens("platform-event-mirror.js", mirrorEndpoint, [
  "PLATFORM_EVENT_MIRROR",
  "platform.audit",
  "FS27_EVENT_MIRROR_SECRET",
  "x-fs27-event-secret"
]);

const fs27Pricing = await readJson(path.join(root, "SkyeGateFS27", "pricing", "pricing.json"));
if (Number(fs27Pricing.gemini?.["gemini-embedding-001"]?.input_per_1m_usd || 0) < Number(fs27Pricing.gemini?.["gemini-embedding-001"]?.upstream_input_per_1m_usd || 0)) {
  fail("FS27 gemini-embedding-001 billable input rate is below upstream input cost");
}

const fs27App = await read(path.join(root, "SkyeGateFS27", "assets", "app.js"));
requireTokens("SkyeGateFS27/assets/app.js", fs27App, [
  "pricingGrossMargin",
  "pcMirroredActions",
  "pcBillableActions",
  "pcAiMetered"
]);

if (failures.length) {
  console.error("Sovereign stack audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Sovereign stack audit passed: pricing, margin, FS27 mirror, and sovereign lanes are disclosed.");
