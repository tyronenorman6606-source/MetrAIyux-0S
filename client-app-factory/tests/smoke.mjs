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
  "data/empire-scan-report.json",
  "scripts/factory-engine.mjs",
  "scripts/factory-scan.mjs",
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
const requiredRooms = [
  "Client Intake",
  "Source Scanner",
  "Asset Vault",
  "Design Lab",
  "App Builder",
  "AI Workspace",
  "SkyePay",
  "Proof Room",
  "Deployment Console",
  "Repo Platform Wiring"
];

const missingRooms = requiredRooms.filter((room) => !html.includes(room));
const publicDebug = ["lorem ipsum", "todo:", "placeholder"].filter((phrase) => html.toLowerCase().includes(phrase));

const manifest = JSON.parse(await readFile(path.join(root, "manifest.webmanifest"), "utf8"));
const record = JSON.parse(await readFile(path.join(root, "data/empire-pallets-record.json"), "utf8"));
const scan = JSON.parse(await readFile(path.join(root, "data/empire-scan-report.json"), "utf8"));
const server = await readFile(path.join(root, "server.mjs"), "utf8");
const engine = await readFile(path.join(root, "scripts/factory-engine.mjs"), "utf8");

const failures = [
  ...missing.map((item) => `Missing file: ${item}`),
  ...missingRooms.map((item) => `Missing room: ${item}`),
  ...publicDebug.map((item) => `Public debug phrase found: ${item}`),
  manifest.display !== "standalone" ? "Manifest display is not standalone" : null,
  record.clientId !== "empire-pallets" ? "Empire seed record missing expected clientId" : null,
  scan.ok !== true ? "Latest scan report is not green" : null,
  !server.includes("/api/factory/run") ? "Factory server is missing run endpoint" : null,
  !engine.includes("catalogAsset") ? "Factory engine is missing asset catalog operation" : null,
  !engine.includes("generateApp") ? "Factory engine is missing app generation operation" : null
].filter(Boolean);

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Client App Factory smoke test passed.");
