#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const STORE_PATH = path.join(ROOT, "runtime", "store.json");
const PORT = 4413;
const BASE = `http://127.0.0.1:${PORT}`;

const originalStore = await fs.readFile(STORE_PATH, "utf8");

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForReady(child) {
  let buffer = "";
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("runtime_start_timeout")), 10000);
    child.stdout.on("data", (chunk) => {
      buffer += chunk.toString();
      if (buffer.includes('"ok":true') || buffer.includes('"ok": true')) {
        clearTimeout(timeout);
        resolve();
      }
    });
    child.stderr.on("data", (chunk) => {
      buffer += chunk.toString();
    });
    child.on("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`runtime_exited_${code}`));
    });
  });
}

const child = spawn("node", ["runtime/local-runtime.mjs"], {
  cwd: ROOT,
  env: { ...process.env, PORT: String(PORT) },
  stdio: ["ignore", "pipe", "pipe"],
});

try {
  await waitForReady(child);
  await wait(100);

  const health = await fetch(`${BASE}/health`).then((res) => res.json());
  assert.equal(health.ok, true);

  const status = await fetch(`${BASE}/api/runtime/status`).then((res) => res.json());
  assert.equal(status.ok, true);
  assert.equal(status.product, "SkyeGateFS27");

  const surfaces = await fetch(`${BASE}/api/runtime/platform-surfaces`).then((res) => res.json());
  assert.equal(surfaces.ok, true);
  assert.ok(Array.isArray(surfaces.items));
  assert.ok(surfaces.items.length >= 5);

  const reviewUpdate = await fetch(`${BASE}/api/runtime/platform-review-board/superidev3-8`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      status: "approved",
      owner: "Ops Lead",
      checkpoint: "bridge pack queued",
      notes: "Ready for downstream app handoff",
    }),
  }).then((res) => res.json());
  assert.equal(reviewUpdate.ok, true);
  assert.equal(reviewUpdate.item.review.status, "approved");

  const executionUpdate = await fetch(`${BASE}/api/runtime/platform-surfaces/superidev3-8/execution`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      status: "completed",
      owner: "Ops Lead",
      checkpoint: "bridge execution complete",
      notes: "Ready for downstream release",
    }),
  }).then((res) => res.json());
  assert.equal(executionUpdate.ok, true);
  assert.equal(executionUpdate.item.execution.status, "completed");

  const dispatchUpdate = await fetch(`${BASE}/api/runtime/platform-surfaces/superidev3-8/dispatch`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      status: "delivered",
      owner: "Ops Lead",
      checkpoint: "downstream handoff delivered",
      notes: "SkyeMail and SkyeDocxMax lanes released",
    }),
  }).then((res) => res.json());
  assert.equal(dispatchUpdate.ok, true);
  assert.equal(dispatchUpdate.item.dispatch.status, "delivered");

  const board = await fetch(`${BASE}/api/runtime/platform-review-board`).then((res) => res.json());
  assert.equal(board.ok, true);
  assert.ok((board.summary.approved || 0) >= 1);
  assert.ok(board.items.some((item) => item.app_id === "superidev3-8" && item.review.owner === "Ops Lead"));

  const executionBoard = await fetch(`${BASE}/api/runtime/platform-execution-board`).then((res) => res.json());
  assert.equal(executionBoard.ok, true);
  assert.ok((executionBoard.summary.completed || 0) >= 1);
  assert.ok(executionBoard.items.some((item) => item.app_id === "superidev3-8" && item.execution.checkpoint === "bridge execution complete"));

  const dispatchBoard = await fetch(`${BASE}/api/runtime/platform-dispatch-board`).then((res) => res.json());
  assert.equal(dispatchBoard.ok, true);
  assert.ok((dispatchBoard.summary.delivered || 0) >= 1);
  assert.ok(dispatchBoard.items.some((item) => item.app_id === "superidev3-8" && item.dispatch.checkpoint === "downstream handoff delivered"));

  const timeline = await fetch(`${BASE}/api/runtime/workflow-timeline?limit=10`).then((res) => res.json());
  assert.equal(timeline.ok, true);
  assert.ok((timeline.workflowTimeline.summary.review || 0) >= 1);
  assert.ok((timeline.workflowTimeline.summary.execution || 0) >= 1);
  assert.ok((timeline.workflowTimeline.summary.dispatch || 0) >= 1);
  assert.deepEqual(
    timeline.workflowTimeline.timeline.slice(0, 3).map((item) => item.type),
    ["platform_dispatch_updated", "platform_execution_updated", "platform_review_updated"],
  );

  const detail = await fetch(`${BASE}/api/runtime/platform-surfaces/superidev3-8`).then((res) => res.json());
  assert.equal(detail.ok, true);
  assert.equal(detail.item.review.checkpoint, "bridge pack queued");
  assert.equal(detail.item.execution.checkpoint, "bridge execution complete");
  assert.equal(detail.item.dispatch.checkpoint, "downstream handoff delivered");

  const indexHtml = await fetch(`${BASE}/index.html`).then((res) => res.text());
  assert.match(indexHtml, /Local Platform Review Board/);
  assert.match(indexHtml, /Advance latest local review/i);
  assert.match(indexHtml, /Local Platform Execution Board/);
  assert.match(indexHtml, /Local Platform Dispatch Board/);
  assert.match(indexHtml, /Local Workflow Timeline/);

  const store = JSON.parse(await fs.readFile(STORE_PATH, "utf8"));
  const persisted = store.surfaces.find((item) => item.app_id === "superidev3-8");
  assert.equal(persisted.review.status, "approved");
  assert.equal(persisted.review.owner, "Ops Lead");
  assert.equal(persisted.execution.status, "completed");
  assert.equal(persisted.dispatch.status, "delivered");
  assert.ok(Array.isArray(store.audit) && store.audit.some((item) => item.type === "platform_review_updated"));
  assert.ok(store.audit.some((item) => item.type === "platform_execution_updated"));
  assert.ok(store.audit.some((item) => item.type === "platform_dispatch_updated"));

  console.log(JSON.stringify({
    ok: true,
    product: "SkyeGateFS27",
    runtime: "local-platform-closure-board",
    approved: board.summary.approved || 0,
    completed: executionBoard.summary.completed || 0,
    delivered: dispatchBoard.summary.delivered || 0,
    surfaces: surfaces.items.length,
  }));
} finally {
  child.kill("SIGTERM");
  await wait(200);
  await fs.writeFile(STORE_PATH, originalStore);
}
