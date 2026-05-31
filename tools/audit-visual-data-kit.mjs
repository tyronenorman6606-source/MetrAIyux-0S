import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const siteDir = path.join(root, "metraiyux_0s_site");
const failures = [];

async function read(filePath) {
  return fs.readFile(filePath, "utf8");
}

async function readJson(filePath) {
  return JSON.parse(await read(filePath));
}

function fail(message) {
  failures.push(message);
}

function requireTokens(label, source, tokens) {
  for (const token of tokens) {
    if (!source.includes(token)) fail(`${label} missing token: ${token}`);
  }
}

const visualKit = await read(path.join(siteDir, "assets", "js", "visual-data-kit.js"));
requireTokens("visual-data-kit.js", visualKit, [
  "ZeroSVisualData",
  "data-visual-dashboard",
  "data-visual-kpis",
  "data-visual-progress",
  "data-visual-bars",
  "data-visual-donut",
  "data-visual-timeline",
  "data-visual-stack",
  "data-visual-event-mix",
  "workspace_id_required_for_live_visuals",
  "customer_visuals.loaded",
  "/api/saas/action-event"
]);

const customerData = await read(path.join(siteDir, "saas", "customer-data.html"));
requireTokens("saas/customer-data.html", customerData, [
  "visual-data-kit.js",
  "data-visual-dashboard",
  "/api/saas/customer-visuals?workspace_id={workspace_id}",
  "data-require-live=\"true\"",
  "Sovereign stack state",
  "Worker audit trace"
]);
if (/customer-visuals-demo\.json/.test(customerData)) {
  fail("saas/customer-data.html must not reference customer-visuals-demo.json");
}

const customerDashboard = await read(path.join(siteDir, "saas", "customer-dashboard.html"));
requireTokens("saas/customer-dashboard.html", customerDashboard, [
  "customer-data.html",
  "visual-data-kit.js",
  "Workspace visual snapshot",
  "data-visual-dashboard",
  "data-visual-audit",
  "Worker-backed command boundary"
]);
if (/customer-visuals-demo\.json/.test(customerDashboard)) {
  fail("saas/customer-dashboard.html must not reference customer-visuals-demo.json");
}

const saasHub = await read(path.join(siteDir, "saas", "index.html"));
requireTokens("saas/index.html", saasHub, [
  "customer-data.html",
  "Visual customer data",
  "Data Visuals"
]);

const stack = await readJson(path.join(siteDir, "data", "visualization-stack.json"));
if (stack.selected_runtime?.id !== "0s-native-visual-data-kit") {
  fail("visualization-stack.json must select 0s-native-visual-data-kit as the shipped runtime");
}
for (const field of ["workspace", "kpis", "progress", "bars", "donut", "timeline", "sovereign_stack", "event_mix"]) {
  if (!stack.data_contract?.[field]) fail(`visualization-stack.json data contract missing ${field}`);
}
for (const [label, source] of [
  ["visual-data-kit.js", visualKit],
  ["saas/customer-data.html", customerData],
  ["saas/customer-dashboard.html", customerDashboard],
  ["visualization-stack.json", JSON.stringify(stack)]
]) {
  if (/Chart\.js|chartjs|open_source|Open-source visualization path/i.test(source)) {
    fail(`${label} should not expose an open-source charting path on customer visual surfaces`);
  }
}

const worker = await read(path.join(siteDir, "cloudflare-saas-provisioning-worker", "src", "index.js"));
requireTokens("worker index.js", worker, [
  "/api/saas/customer-visuals",
  "buildCustomerVisuals",
  "buildVisualRows",
  "0s.customer_visuals.v1",
  "visual_data_kit",
  "customer_visuals_view"
]);

const fs27Root = path.join(siteDir, "skyegate", "source", "SkyeGateFS27");
const fs27Index = await read(path.join(fs27Root, "index.html"));
requireTokens("SkyeGateFS27/index.html", fs27Index, [
  "0S Visual Mirror",
  "pcVisualBars",
  "platformEventLaneVisual",
  "FS27 turns mirrored 0S events into visible operating state"
]);

const fs27App = await read(path.join(fs27Root, "assets", "app.js"));
requireTokens("SkyeGateFS27/assets/app.js", fs27App, [
  "renderFs27VisualBars",
  "pcVisualBars",
  "platformEventLaneVisual",
  "metraiyux_0s_events",
  "os_action_events"
]);

if (failures.length) {
  console.error("Visual data kit audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Visual data kit audit passed: customer visuals, native renderer, and Worker endpoint are wired without public charting-stack copy.");
