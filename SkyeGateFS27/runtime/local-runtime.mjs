#!/usr/bin/env node
import fs from "node:fs";
import fsp from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const STORE_PATH = path.join(ROOT, "runtime", "store.json");
const PORT = Number(process.env.PORT || 4413);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".md": "text/markdown; charset=utf-8",
};

const PLATFORM_SURFACES = [
  {
    app_id: "skygatefs27",
    title: "SkyeGateFS27",
    visibility: "admin",
    storage_mode: "server-state",
    launch_url: "/index.html",
    downstream_targets: ["SuperIDEv3.8", "SkyeProofx"],
  },
  {
    app_id: "superidev3-8",
    title: "SuperIDEv3.8",
    visibility: "operator",
    storage_mode: "hybrid-bridge",
    launch_url: "/Platforms-Apps-Infrastructure/",
    downstream_targets: ["SkyeMail", "SkyeDocxMax"],
  },
  {
    app_id: "skyehands-runtime-control",
    title: "SkyeHands Runtime Control",
    visibility: "operator",
    storage_mode: "runtime-control",
    launch_url: null,
    downstream_targets: ["AE-Central-CommandHub"],
  },
  {
    app_id: "0s-auth-sdk",
    title: "0s Auth SDK",
    visibility: "bridge",
    storage_mode: "client-bridge",
    launch_url: null,
    downstream_targets: ["Skye Identity Standard: Global Command Center"],
  },
  {
    app_id: "skymail-standalone",
    title: "SkyeMail Standalone",
    visibility: "operator",
    storage_mode: "app-local-plus-gate",
    launch_url: null,
    downstream_targets: ["SkyeLeadVault", "AE-FlowPro"],
  },
];

function defaultReview(index) {
  const status = index === 0 ? "ready" : "queued";
  return {
    status,
    owner: "",
    checkpoint: status === "ready" ? "needs operator review" : "awaiting triage",
    notes: "",
    updatedAt: null,
  };
}

function defaultExecution() {
  return {
    status: "queued",
    owner: "",
    checkpoint: "awaiting execution queue",
    notes: "",
    updatedAt: null,
  };
}

function defaultDispatch() {
  return {
    status: "queued",
    owner: "",
    checkpoint: "awaiting downstream release",
    notes: "",
    updatedAt: null,
  };
}

function createDefaultStore() {
  return {
    surfaces: PLATFORM_SURFACES.map((surface, index) => ({
      ...surface,
      review: defaultReview(index),
      execution: null,
      dispatch: null,
    })),
    audit: [],
  };
}

async function ensureStore() {
  await fsp.mkdir(path.dirname(STORE_PATH), { recursive: true });
  if (!fs.existsSync(STORE_PATH)) {
    await fsp.writeFile(STORE_PATH, JSON.stringify(createDefaultStore(), null, 2));
  }
}

async function readStore() {
  await ensureStore();
  try {
    const parsed = JSON.parse(await fsp.readFile(STORE_PATH, "utf8"));
    if (!Array.isArray(parsed?.surfaces)) throw new Error("invalid store");
    return parsed;
  } catch {
    const fresh = createDefaultStore();
    await fsp.writeFile(STORE_PATH, JSON.stringify(fresh, null, 2));
    return fresh;
  }
}

async function writeStore(store) {
  await ensureStore();
  await fsp.writeFile(STORE_PATH, JSON.stringify(store, null, 2));
}

function json(res, code, payload) {
  res.writeHead(code, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
  });
  res.end(JSON.stringify(payload, null, 2));
}

function summarizeBoard(surfaces) {
  const summary = { queued: 0, ready: 0, blocked: 0, approved: 0, dispatched: 0 };
  for (const surface of surfaces) {
    const key = surface.review?.status || "queued";
    summary[key] = (summary[key] || 0) + 1;
  }
  return summary;
}

function summarizeExecutionBoard(surfaces) {
  const summary = { queued: 0, active: 0, completed: 0, blocked: 0, unassigned: 0 };
  for (const surface of surfaces) {
    if (!surface.execution || typeof surface.execution !== "object") continue;
    const key = surface.execution.status || "queued";
    summary[key] = (summary[key] || 0) + 1;
    if (!String(surface.execution.owner || "").trim()) summary.unassigned += 1;
  }
  return summary;
}

function summarizeDispatchBoard(surfaces) {
  const summary = { queued: 0, released: 0, delivered: 0, blocked: 0, unassigned: 0 };
  for (const surface of surfaces) {
    if (!surface.dispatch || typeof surface.dispatch !== "object") continue;
    const key = surface.dispatch.status || "queued";
    summary[key] = (summary[key] || 0) + 1;
    if (!String(surface.dispatch.owner || "").trim()) summary.unassigned += 1;
  }
  return summary;
}

function categorizeAuditEvent(type = "") {
  if (type === "platform_review_updated") return "review";
  if (type === "platform_execution_updated") return "execution";
  if (type === "platform_dispatch_updated") return "dispatch";
  return "other";
}

function buildWorkflowTimeline(store, limit = 12) {
  const summary = { total: 0, review: 0, execution: 0, dispatch: 0, other: 0 };
  const timeline = [];
  for (const event of Array.isArray(store.audit) ? store.audit : []) {
    const category = categorizeAuditEvent(event.type);
    summary.total += 1;
    summary[category] = (summary[category] || 0) + 1;
    if (timeline.length < limit) {
      timeline.push({
        category,
        type: event.type,
        app_id: event.app_id,
        createdAt: event.createdAt,
        detail: event.detail || "",
        checkpoint:
          event.dispatch?.checkpoint ||
          event.execution?.checkpoint ||
          event.review?.checkpoint ||
          "",
      });
    }
  }
  return { summary, timeline };
}

function normalizeReview(body = {}, existing = {}) {
  return {
    status: String(body.status || existing.status || "queued").trim() || "queued",
    owner: String(body.owner || existing.owner || "").trim(),
    checkpoint: String(body.checkpoint || existing.checkpoint || "").trim(),
    notes: String(body.notes || existing.notes || "").trim(),
    updatedAt: new Date().toISOString(),
  };
}

function normalizeExecution(body = {}, existing = {}) {
  return {
    status: String(body.status || existing.status || "queued").trim() || "queued",
    owner: String(body.owner || existing.owner || "").trim(),
    checkpoint: String(body.checkpoint || existing.checkpoint || "").trim(),
    notes: String(body.notes || existing.notes || "").trim(),
    updatedAt: new Date().toISOString(),
  };
}

function normalizeDispatch(body = {}, existing = {}) {
  return {
    status: String(body.status || existing.status || "queued").trim() || "queued",
    owner: String(body.owner || existing.owner || "").trim(),
    checkpoint: String(body.checkpoint || existing.checkpoint || "").trim(),
    notes: String(body.notes || existing.notes || "").trim(),
    updatedAt: new Date().toISOString(),
  };
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw);
}

async function handleApi(req, res, url) {
  if (req.method === "OPTIONS") return json(res, 200, { ok: true });
  const store = await readStore();

  if (req.method === "GET" && url.pathname === "/health") {
    return json(res, 200, { ok: true, service: "SkyeGateFS27 local runtime" });
  }
  if (req.method === "GET" && url.pathname === "/api/runtime/status") {
    const workflowTimeline = buildWorkflowTimeline(store, 12);
    return json(res, 200, {
      ok: true,
      product: "SkyeGateFS27",
      surfaces: store.surfaces.length,
      reviewBoard: summarizeBoard(store.surfaces),
      executionBoard: summarizeExecutionBoard(store.surfaces),
      dispatchBoard: summarizeDispatchBoard(store.surfaces),
      workflowTimeline: workflowTimeline.summary,
      storePath: path.relative(ROOT, STORE_PATH),
    });
  }
  if (req.method === "GET" && url.pathname === "/api/runtime/platform-surfaces") {
    return json(res, 200, { ok: true, items: store.surfaces });
  }
  const detailMatch = url.pathname.match(/^\/api\/runtime\/platform-surfaces\/([^/]+)$/);
  if (req.method === "GET" && detailMatch) {
    const item = store.surfaces.find((surface) => surface.app_id === detailMatch[1]);
    return item
      ? json(res, 200, { ok: true, item })
      : json(res, 404, { ok: false, error: "not_found" });
  }
  if (req.method === "GET" && url.pathname === "/api/runtime/platform-review-board") {
    return json(res, 200, {
      ok: true,
      summary: summarizeBoard(store.surfaces),
      items: store.surfaces.map((surface) => ({
        app_id: surface.app_id,
        title: surface.title,
        visibility: surface.visibility,
        downstream_targets: surface.downstream_targets || [],
        review: surface.review,
      })),
    });
  }
  if (req.method === "GET" && url.pathname === "/api/runtime/platform-execution-board") {
    const executable = store.surfaces.filter((surface) => surface.execution && typeof surface.execution === "object");
    return json(res, 200, {
      ok: true,
      summary: summarizeExecutionBoard(store.surfaces),
      items: executable.map((surface) => ({
        app_id: surface.app_id,
        title: surface.title,
        visibility: surface.visibility,
        downstream_targets: surface.downstream_targets || [],
        review: surface.review || null,
        execution: surface.execution,
      })),
    });
  }
  if (req.method === "GET" && url.pathname === "/api/runtime/platform-dispatch-board") {
    const dispatchable = store.surfaces.filter((surface) => surface.dispatch && typeof surface.dispatch === "object");
    return json(res, 200, {
      ok: true,
      summary: summarizeDispatchBoard(store.surfaces),
      items: dispatchable.map((surface) => ({
        app_id: surface.app_id,
        title: surface.title,
        visibility: surface.visibility,
        downstream_targets: surface.downstream_targets || [],
        execution: surface.execution || null,
        dispatch: surface.dispatch,
      })),
    });
  }
  if (req.method === "GET" && url.pathname === "/api/runtime/workflow-timeline") {
    const limit = Math.max(1, Math.min(50, Number(url.searchParams.get("limit") || 12)));
    return json(res, 200, { ok: true, workflowTimeline: buildWorkflowTimeline(store, limit) });
  }
  const reviewMatch = url.pathname.match(/^\/api\/runtime\/platform-review-board\/([^/]+)$/);
  if (req.method === "POST" && reviewMatch) {
    const body = await readBody(req);
    const item = store.surfaces.find((surface) => surface.app_id === reviewMatch[1]);
    if (!item) return json(res, 404, { ok: false, error: "not_found" });
    item.review = normalizeReview(body, item.review);
    store.audit.unshift({
      type: "platform_review_updated",
      app_id: item.app_id,
      detail: `Updated review board for ${item.title}`,
      review: item.review,
      createdAt: item.review.updatedAt,
    });
    await writeStore(store);
    return json(res, 200, { ok: true, item, summary: summarizeBoard(store.surfaces) });
  }
  const executionMatch = url.pathname.match(/^\/api\/runtime\/platform-surfaces\/([^/]+)\/execution$/);
  if (req.method === "POST" && executionMatch) {
    const body = await readBody(req);
    const item = store.surfaces.find((surface) => surface.app_id === executionMatch[1]);
    if (!item) return json(res, 404, { ok: false, error: "not_found" });
    item.execution = normalizeExecution(body, {
      ...defaultExecution(),
      owner: item.review?.owner || "",
      checkpoint: item.review?.status === "approved" ? "execution queued from approved review" : "awaiting execution queue",
      ...(item.execution && typeof item.execution === "object" ? item.execution : {}),
    });
    store.audit.unshift({
      type: "platform_execution_updated",
      app_id: item.app_id,
      detail: `Updated execution board for ${item.title}`,
      execution: item.execution,
      createdAt: item.execution.updatedAt,
    });
    await writeStore(store);
    return json(res, 200, { ok: true, item, summary: summarizeExecutionBoard(store.surfaces) });
  }
  const dispatchMatch = url.pathname.match(/^\/api\/runtime\/platform-surfaces\/([^/]+)\/dispatch$/);
  if (req.method === "POST" && dispatchMatch) {
    const body = await readBody(req);
    const item = store.surfaces.find((surface) => surface.app_id === dispatchMatch[1]);
    if (!item) return json(res, 404, { ok: false, error: "not_found" });
    item.dispatch = normalizeDispatch(body, {
      ...defaultDispatch(),
      owner: item.execution?.owner || item.review?.owner || "",
      checkpoint: item.execution?.status === "completed" ? "ready for downstream release" : "awaiting downstream release",
      ...(item.dispatch && typeof item.dispatch === "object" ? item.dispatch : {}),
    });
    store.audit.unshift({
      type: "platform_dispatch_updated",
      app_id: item.app_id,
      detail: `Updated dispatch board for ${item.title}`,
      dispatch: item.dispatch,
      createdAt: item.dispatch.updatedAt,
    });
    await writeStore(store);
    return json(res, 200, { ok: true, item, summary: summarizeDispatchBoard(store.surfaces) });
  }
  return false;
}

async function serveStatic(res, url) {
  const relative = url.pathname === "/" ? "/index.html" : url.pathname;
  const resolved = path.resolve(ROOT, `.${relative}`);
  if (!resolved.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("forbidden");
    return;
  }
  const filePath = fs.existsSync(resolved) && fs.statSync(resolved).isFile()
    ? resolved
    : path.join(ROOT, "index.html");
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { "content-type": MIME[ext] || "application/octet-stream" });
  fs.createReadStream(filePath).pipe(res);
}

await ensureStore();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || `127.0.0.1:${PORT}`}`);
  try {
    const handled = await handleApi(req, res, url);
    if (handled !== false) return;
    await serveStatic(res, url);
  } catch (error) {
    json(res, 500, { ok: false, error: error.message });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(JSON.stringify({ ok: true, port: PORT, root: ROOT }));
});
