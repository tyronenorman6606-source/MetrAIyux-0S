#!/usr/bin/env node
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), "..");

const requiredFiles = [
  "index.html",
  "package.json",
  "server.mjs",
  "assets/styles.css",
  "assets/app.js",
  "manifest.webmanifest",
  "service-worker.js",
  "offline.html",
  "APP_PATH_MANIFEST.json",
  "CLIENT_APP_FACTORY_PROOF.md",
  "MCP_TOOLING_RECEIPT.json",
  "data/factory-schema.json",
  "data/empire-pallets-record.json",
  "data/factory-scan-report.json",
  "tests/ai-response-lanes-stress.mjs",
  "scripts/factory-core.mjs",
  "scripts/factory-engine.mjs",
  "scripts/factory-enhance.mjs",
  "scripts/factory-pipeline.mjs",
  "scripts/factory-scan.mjs",
  "scripts/factory-verify.mjs",
  "storage/uploads/.gitkeep",
  "storage/generated-apps/.gitkeep",
  "storage/records/.gitkeep",
  "storage/scans/.gitkeep",
  "storage/ledger/.gitkeep"
];

async function exists(relativePath) {
  try {
    await access(path.join(root, relativePath), constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

const missing = [];
for (const file of requiredFiles) {
  if (!(await exists(file))) missing.push(file);
}

const html = await readFile(path.join(root, "index.html"), "utf8");
const appJs = await readFile(path.join(root, "assets/app.js"), "utf8");
const uiText = `${html}\n${appJs}`;
const requiredRooms = [
  "Choose Client",
  "Client Profile",
  "Source Check",
  "Brand Pack",
  "Media Pack",
  "Experience",
  "Build",
  "Preview App",
  "QA Check",
  "Workspace",
  "SkyePay",
  "Go Live",
  "Auren"
];

const missingRooms = requiredRooms.filter((room) => !uiText.includes(room));
const publicDebug = ["lorem ipsum", "todo:", "client-preview", "enter preview", "enter shop"].filter((phrase) =>
  html.toLowerCase().includes(phrase)
);
const uiChecks = [
  appJs.includes("Choose the business you want to turn into an app.") ? null : "Factory UI is missing Valley client picker entry point",
  appJs.includes("Import + Build") ? null : "Factory UI is missing one-click Valley import and run action",
  appJs.includes("Still2Vid handoff") && appJs.includes("data-open-still2vid") ? null : "Factory UI is missing Still2Vid media handoff",
  appJs.includes("/factory/identity-image") ? null : "Factory UI is missing AI identity image request route"
].filter(Boolean);

const manifest = JSON.parse(await readFile(path.join(root, "manifest.webmanifest"), "utf8"));
const record = JSON.parse(await readFile(path.join(root, "data/empire-pallets-record.json"), "utf8"));
const scan = JSON.parse(await readFile(path.join(root, "data/factory-scan-report.json"), "utf8"));
const server = await readFile(path.join(root, "server.mjs"), "utf8");
const engine = await readFile(path.join(root, "scripts/factory-engine.mjs"), "utf8");
const aiLanes = await readFile(path.join(root, "../metraiyux_0s_site/cloudflare/relay13-ai-lanes.mjs"), "utf8");

const failures = [
  ...missing.map((item) => `Missing file: ${item}`),
  ...missingRooms.map((item) => `Missing room: ${item}`),
  ...publicDebug.map((item) => `Public debug phrase found: ${item}`),
  ...uiChecks,
  manifest.display !== "standalone" ? "Manifest display is not standalone" : null,
  record.clientId !== "empire-pallets" ? "Empire seed record missing expected clientId" : null,
  scan.ok !== true ? "Latest scan report is not green" : null,
  !server.includes("/api/factory/run") ? "Factory server is missing run endpoint" : null,
  !server.includes("/api/factory/ai-response/plans") ? "Factory server is missing AI response plan endpoint" : null,
  !server.includes("/api/factory/ai-response/stress") ? "Factory server is missing AI response stress endpoint" : null,
  !server.includes("/api/factory/valley/businesses") ? "Factory server is missing Valley list endpoint" : null,
  !server.includes("/api/factory/valley/import") ? "Factory server is missing Valley import endpoint" : null,
  !server.includes("/api/factory/identity-image") ? "Factory server is missing AI identity image endpoint" : null,
  !engine.includes("catalogAsset") ? "Factory engine is missing asset catalog operation" : null,
  !engine.includes("generateApp") ? "Factory engine is missing app generation operation" : null,
  !aiLanes.includes("relay13-ai-response-plus") ? "AI response Plus lane is missing" : null,
  !aiLanes.includes("relay13-managed-ai-inbox") ? "Managed AI Inbox lane is missing" : null,
  !aiLanes.includes("backupBucketMessages") ? "AI response backup bucket policy is missing" : null
].filter(Boolean);

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Client App Factory smoke test passed.");
