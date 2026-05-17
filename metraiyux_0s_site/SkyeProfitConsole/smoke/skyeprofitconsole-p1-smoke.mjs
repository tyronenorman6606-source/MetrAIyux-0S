import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

async function exists(rel) {
  try {
    await fs.access(path.join(root, rel));
    return true;
  } catch {
    return false;
  }
}

async function read(rel) {
  return fs.readFile(path.join(root, rel), "utf8");
}

const routes = [
  "index.html",
  "dashboard.html",
  "workflows.html",
  "records.html",
  "proof.html",
  "runtime.html",
  "settings.html",
  "app.html"
];

for (const route of routes) {
  if (!(await exists(route))) failures.push(`${route} missing`);
  const html = await read(route).catch(() => "");
  if (!html.includes('data-platform-hardening="p1-routed"')) failures.push(`${route} missing routed marker`);
  if (!html.includes('./gate-session.js')) failures.push(`${route} missing gate session script`);
  if (!html.includes('id="profitFieldCanvas"')) failures.push(`${route} missing profit field canvas`);
  if (!html.includes('id="packForm"')) failures.push(`${route} missing pack forge form`);
  if (!html.includes('id="moneyMoves"')) failures.push(`${route} missing money moves panel`);
  if (!html.includes('id="generateCloseBrief"')) failures.push(`${route} missing close brief generator`);
  if (!html.includes('id="proofFeed"')) failures.push(`${route} missing proof chain`);
}

for (const required of [
  "platform.css",
  "platform.js",
  "gate-session.js",
  "PLATFORM_TRUTH.json",
  "assets/platform-mark.svg",
  "docs/PLATFORM_STATUS.md",
  "src/runtime-contract.json",
  "runtime/local-runtime.mjs",
  "runtime/store.json"
]) {
  if (!(await exists(required))) failures.push(`${required} missing`);
}

const js = await read("platform.js");
for (const needle of [
  "const STORAGE_KEY",
  "function createPack",
  "function renderConstellation",
  "function drawField",
  "async function syncRuntime",
  "async function pushPackToRuntime",
  "function renderMoney",
  "function generateCloseBrief",
  "async function pushCloseBriefToRuntime",
  "function transitionPack",
  "function exportState"
]) {
  if (!js.includes(needle)) failures.push(`platform.js missing ${needle}`);
}

const gate = await read("gate-session.js");
for (const needle of [
  "Free99",
  "requireSession",
  "x-skye-gate-session",
  "saas_client_session"
]) {
  if (!gate.includes(needle)) failures.push(`gate-session.js missing ${needle}`);
}

const runtime = await read("runtime/local-runtime.mjs");
for (const needle of [
  "/api/runtime/close-briefs",
  "function normalizeCloseBrief",
  "function computeCloseBriefBoard"
]) {
  if (!runtime.includes(needle)) failures.push(`runtime/local-runtime.mjs missing ${needle}`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`SkyeProfitConsole neo-front smoke passed: ${routes.length} routes checked.`);
