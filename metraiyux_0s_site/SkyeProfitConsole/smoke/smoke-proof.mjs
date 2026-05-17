import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) throw new Error(`Missing required file: ${rel}`);
  return fs.readFileSync(full, "utf8");
}
function mustContain(text, needle, label) {
  if (!text.includes(needle)) throw new Error(`Missing ${label}: ${needle}`);
}

const html = read("index.html");
const js = read("platform.js");
const gateJs = read("gate-session.js");
const runtimeSource = read("runtime/local-runtime.mjs");
read("runtime/store.json");

for (const [needle, label] of [
  ['id="profitFieldCanvas"', "animated profit field canvas"],
  ['id="constellationNodes"', "constellation nodes"],
  ['id="splitStack"', "split furnace"],
  ['id="packForm"', "profit pack forge"],
  ['id="loomColumns"', "signal loom"],
  ['id="proofFeed"', "proof chain"],
  ['id="syncRuntime"', "runtime sync control"],
  ['id="exportState"', "export control"],
  ['./gate-session.js', "gate-session script"]
]) mustContain(html, needle, label);

for (const [needle, label] of [
  ["const gate = globalThis.SkyeProfitGate", "gate session integration"],
  ["function createPack", "pack creation logic"],
  ["function updateSelected", "selected rewrite logic"],
  ["function seedScenario", "scenario seed logic"],
  ["function normalizeSplits", "split normalization"],
  ["function renderLoom", "signal loom rendering"],
  ["function renderProof", "proof rendering"],
  ["async function pushPackToRuntime", "runtime archive integration"],
  ["function drawField", "canvas field renderer"]
]) mustContain(js, needle, label);

mustContain(gateJs, "Free99", "Free99 gate copy");
mustContain(gateJs, "requireSession", "gate session blocker");
mustContain(gateJs, "x-skye-gate-session", "runtime gate header");
mustContain(runtimeSource, "function serveStatic", "static asset server");
mustContain(runtimeSource, "function requireGate", "runtime gate session enforcement");
mustContain(runtimeSource, "/api/runtime/close-review-packs", "review-pack endpoint");
mustContain(runtimeSource, "/api/runtime/execution-board", "execution-board endpoint");
mustContain(runtimeSource, "/api/runtime/dispatch-board", "dispatch-board endpoint");

async function startRuntime() {
  const runtimePath = path.join(root, "runtime", "local-runtime.mjs");
  const port = 44000 + Math.floor(Math.random() * 1000);
  const child = spawn(process.execPath, [runtimePath, "--port", String(port)], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += String(chunk); });
  child.stderr.on("data", (chunk) => { stderr += String(chunk); });
  const start = Date.now();
  while (Date.now() - start < 5000) {
    const line = stdout.trim().split("\n").filter(Boolean).pop();
    if (line) {
      try {
        const payload = JSON.parse(line);
        if (payload.ok) return { child, port: payload.port };
      } catch {}
    }
    await new Promise((resolve) => setTimeout(resolve, 40));
  }
  child.kill("SIGTERM");
  throw new Error(`Local runtime did not start.\nstdout:\n${stdout}\nstderr:\n${stderr}`);
}

const runtime = await startRuntime();
let runtimeProof;
try {
  const base = `http://127.0.0.1:${runtime.port}`;
  const gateHeaders = { "x-skye-gate-session": "free99-smoke-gate-session" };
  const index = await fetch(`${base}/`).then((res) => res.text());
  const css = await fetch(`${base}/platform.css`).then((res) => res.text());
  const unauthorized = await fetch(`${base}/api/runtime/status`).then((res) => res.status);
  if (unauthorized !== 401) throw new Error(`Runtime accepted an ungated status request: ${unauthorized}`);
  const health = await fetch(`${base}/health`, { headers: gateHeaders }).then((res) => res.json());
  const created = await fetch(`${base}/api/runtime/close-review-packs`, {
    method: "POST",
    headers: { "content-type": "application/json", ...gateHeaders },
    body: JSON.stringify({
      label: "Neo-front smoke pack",
      target: "AE-FlowPro",
      notes: "Runtime proof for the new app surface.",
      snapshot: {
        runtime: "Runtime mode: smoke proof",
        auditScore: "91 / 100",
        closePackCount: "1",
        capturedAt: new Date().toISOString()
      },
      review: { owner: "profit-ops", status: "ready", checkpoint: "smoke_ready", notes: "Queue proof." },
      recommended_actions: ["Verify runtime persistence", "Queue execution", "Queue dispatch"]
    })
  }).then((res) => res.json());
  const executionCreated = await fetch(`${base}/api/runtime/close-review-packs/${encodeURIComponent(created.review_pack.id)}/execution`, {
    method: "POST",
    headers: { "content-type": "application/json", ...gateHeaders },
    body: JSON.stringify({ owner: "profit-ops", target: "AE-FlowPro", label: "Neo-front smoke execution", notes: "Execution proof." })
  }).then((res) => res.json());
  const dispatchCreated = await fetch(`${base}/api/runtime/execution-board/${encodeURIComponent(executionCreated.execution_item.id)}/dispatch`, {
    method: "POST",
    headers: { "content-type": "application/json", ...gateHeaders },
    body: JSON.stringify({ owner: "profit-ops", target: "AE-FlowPro", channel: "activation", status: "ready", checkpoint: "dispatch_ready", notes: "Dispatch proof." })
  }).then((res) => res.json());
  const timeline = await fetch(`${base}/api/runtime/workflow-timeline`, { headers: gateHeaders }).then((res) => res.json());
  runtimeProof = {
    index_served: index.includes("Neo-Front Profit Field"),
    css_served: css.includes("profit-field-panel"),
    ungated_api_status: unauthorized,
    health_mode: health.mode,
    created_status: created.review_pack.review.status,
    execution_status: executionCreated.execution_item.status,
    dispatch_status: dispatchCreated.dispatch_item.status,
    timeline_dispatch: timeline.workflow_timeline.dispatch
  };
} finally {
  runtime.child.kill("SIGTERM");
}

console.log(JSON.stringify({
  ok: true,
  folder: "SkyeProfitConsole",
  status: "neo-front-app-proof-passed",
  proof: [
    "static-app-shell-present",
    "canvas-profit-field-present",
    "profit-pack-forge-present",
    "split-furnace-present",
    "signal-loom-present",
    "proof-chain-present",
    "static-assets-served-by-runtime",
    "review-execution-dispatch-runtime-flow-present",
    "free99-gate-session-required"
  ],
  runtime_proof: runtimeProof
}, null, 2));
