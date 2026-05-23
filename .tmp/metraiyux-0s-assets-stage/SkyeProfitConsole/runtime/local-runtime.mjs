import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const indexPath = path.join(root, "index.html");
const storePath = path.join(root, "runtime", "store.json");
const gateTokenEnv = process.env.SKYE_PROFIT_GATE_TOKEN || process.env.SKYGATE_SESSION_TOKEN || process.env.METRAIYUX_GATE_SESSION || "";

function createId(prefix = "spca") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function numberOr(value, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function defaultStore() {
  return {
    reviewPacks: [],
    closeBriefs: [],
    executionItems: [],
    dispatchItems: [],
    workflowEvents: [],
    updatedAt: null
  };
}

function normalizeReview(review = {}) {
  return {
    status: typeof review.status === "string" && review.status ? review.status : "draft",
    owner: typeof review.owner === "string" ? review.owner : "",
    checkpoint: typeof review.checkpoint === "string" ? review.checkpoint : "",
    notes: typeof review.notes === "string" ? review.notes : "",
    updatedAt: typeof review.updatedAt === "string" && review.updatedAt ? review.updatedAt : new Date().toISOString()
  };
}

function normalizeSnapshot(snapshot = {}) {
  return {
    runtime: typeof snapshot.runtime === "string" ? snapshot.runtime : "Unknown",
    auditScore: typeof snapshot.auditScore === "string" ? snapshot.auditScore : "Unknown",
    closePackCount: typeof snapshot.closePackCount === "string" ? snapshot.closePackCount : "0",
    capturedAt: typeof snapshot.capturedAt === "string" && snapshot.capturedAt ? snapshot.capturedAt : new Date().toISOString()
  };
}

function normalizeReviewPack(pack = {}) {
  return {
    id: typeof pack.id === "string" && pack.id ? pack.id : createId("review"),
    label: typeof pack.label === "string" && pack.label.trim() ? pack.label.trim() : "Alias close review",
    target: typeof pack.target === "string" && pack.target.trim() ? pack.target.trim() : "AE-FlowPro",
    notes: typeof pack.notes === "string" ? pack.notes : "",
    snapshot: normalizeSnapshot(pack.snapshot || {}),
    recommended_actions: Array.isArray(pack.recommended_actions)
      ? pack.recommended_actions.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim())
      : [],
    review: normalizeReview(pack.review || {}),
    createdAt: typeof pack.createdAt === "string" && pack.createdAt ? pack.createdAt : new Date().toISOString()
  };
}

function normalizeExecutionItem(item = {}) {
  return {
    id: typeof item.id === "string" && item.id ? item.id : createId("exec"),
    reviewPackId: typeof item.reviewPackId === "string" ? item.reviewPackId : "",
    label: typeof item.label === "string" && item.label.trim() ? item.label.trim() : "Alias execution item",
    target: typeof item.target === "string" && item.target.trim() ? item.target.trim() : "AE-FlowPro",
    owner: typeof item.owner === "string" ? item.owner : "",
    status: typeof item.status === "string" && item.status ? item.status : "queued",
    notes: typeof item.notes === "string" ? item.notes : "",
    recommended_actions: Array.isArray(item.recommended_actions)
      ? item.recommended_actions.filter((action) => typeof action === "string" && action.trim()).map((action) => action.trim())
      : [],
    snapshot: normalizeSnapshot(item.snapshot || {}),
    createdAt: typeof item.createdAt === "string" && item.createdAt ? item.createdAt : new Date().toISOString(),
    updatedAt: typeof item.updatedAt === "string" && item.updatedAt ? item.updatedAt : new Date().toISOString()
  };
}

function normalizeDispatchItem(item = {}) {
  return {
    id: typeof item.id === "string" && item.id ? item.id : createId("dispatch"),
    executionItemId: typeof item.executionItemId === "string" ? item.executionItemId : "",
    reviewPackId: typeof item.reviewPackId === "string" ? item.reviewPackId : "",
    label: typeof item.label === "string" && item.label.trim() ? item.label.trim() : "Alias dispatch item",
    target: typeof item.target === "string" && item.target.trim() ? item.target.trim() : "AE-FlowPro",
    owner: typeof item.owner === "string" ? item.owner : "",
    channel: typeof item.channel === "string" && item.channel.trim() ? item.channel.trim() : "activation",
    status: typeof item.status === "string" && item.status ? item.status : "queued",
    checkpoint: typeof item.checkpoint === "string" ? item.checkpoint : "",
    notes: typeof item.notes === "string" ? item.notes : "",
    recommended_actions: Array.isArray(item.recommended_actions)
      ? item.recommended_actions.filter((action) => typeof action === "string" && action.trim()).map((action) => action.trim())
      : [],
    snapshot: normalizeSnapshot(item.snapshot || {}),
    createdAt: typeof item.createdAt === "string" && item.createdAt ? item.createdAt : new Date().toISOString(),
    updatedAt: typeof item.updatedAt === "string" && item.updatedAt ? item.updatedAt : new Date().toISOString()
  };
}

function normalizeCloseBrief(brief = {}) {
  const splitAllocation = Array.isArray(brief.splitAllocation)
    ? brief.splitAllocation.map((item) => ({
      name: typeof item.name === "string" && item.name.trim() ? item.name.trim() : "lane",
      percent: numberOr(item.percent),
      amount: numberOr(item.amount)
    }))
    : [];
  return {
    id: typeof brief.id === "string" && brief.id ? brief.id : createId("brief"),
    packId: typeof brief.packId === "string" ? brief.packId : "",
    label: typeof brief.label === "string" && brief.label.trim() ? brief.label.trim() : "Alias close brief",
    target: typeof brief.target === "string" && brief.target.trim() ? brief.target.trim() : "AE-FlowPro",
    owner: typeof brief.owner === "string" && brief.owner.trim() ? brief.owner.trim() : "profit-ops",
    ask: numberOr(brief.ask),
    directCost: numberOr(brief.directCost),
    grossProfit: numberOr(brief.grossProfit),
    expectedProfit: numberOr(brief.expectedProfit),
    margin: numberOr(brief.margin),
    paybackMultiple: numberOr(brief.paybackMultiple),
    confidence: numberOr(brief.confidence),
    action: typeof brief.action === "string" && brief.action.trim() ? brief.action.trim() : "advance to execution",
    deadline: typeof brief.deadline === "string" && brief.deadline.trim() ? brief.deadline.trim() : new Date().toISOString().slice(0, 10),
    splitAllocation,
    risks: Array.isArray(brief.risks)
      ? brief.risks.filter((risk) => typeof risk === "string" && risk.trim()).map((risk) => risk.trim()).slice(0, 8)
      : [],
    notes: typeof brief.notes === "string" ? brief.notes : "",
    status: typeof brief.status === "string" && brief.status ? brief.status : "archived",
    createdAt: typeof brief.createdAt === "string" && brief.createdAt ? brief.createdAt : new Date().toISOString()
  };
}

function normalizeWorkflowEvent(event = {}) {
  return {
    id: typeof event.id === "string" && event.id ? event.id : createId("event"),
    type: typeof event.type === "string" && event.type ? event.type : "review_pack_archived",
    category: typeof event.category === "string" && event.category ? event.category : "other",
    detail: typeof event.detail === "string" ? event.detail : "",
    owner: typeof event.owner === "string" ? event.owner : "",
    target: typeof event.target === "string" ? event.target : "",
    reviewPackId: typeof event.reviewPackId === "string" ? event.reviewPackId : "",
    closeBriefId: typeof event.closeBriefId === "string" ? event.closeBriefId : "",
    executionItemId: typeof event.executionItemId === "string" ? event.executionItemId : "",
    dispatchItemId: typeof event.dispatchItemId === "string" ? event.dispatchItemId : "",
    status: typeof event.status === "string" ? event.status : "",
    checkpoint: typeof event.checkpoint === "string" ? event.checkpoint : "",
    createdAt: typeof event.createdAt === "string" && event.createdAt ? event.createdAt : new Date().toISOString()
  };
}

function ensureStoreDir() {
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
}

function loadStore() {
  ensureStoreDir();
  if (!fs.existsSync(storePath)) {
    const initial = defaultStore();
    fs.writeFileSync(storePath, `${JSON.stringify(initial, null, 2)}\n`);
    return initial;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(storePath, "utf8"));
    return {
      reviewPacks: Array.isArray(parsed.reviewPacks) ? parsed.reviewPacks.map(normalizeReviewPack) : [],
      closeBriefs: Array.isArray(parsed.closeBriefs) ? parsed.closeBriefs.map(normalizeCloseBrief) : [],
      executionItems: Array.isArray(parsed.executionItems) ? parsed.executionItems.map(normalizeExecutionItem) : [],
      dispatchItems: Array.isArray(parsed.dispatchItems) ? parsed.dispatchItems.map(normalizeDispatchItem) : [],
      workflowEvents: Array.isArray(parsed.workflowEvents) ? parsed.workflowEvents.map(normalizeWorkflowEvent) : [],
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null
    };
  } catch {
    const reset = defaultStore();
    fs.writeFileSync(storePath, `${JSON.stringify(reset, null, 2)}\n`);
    return reset;
  }
}

function saveStore(store) {
  ensureStoreDir();
  const next = {
    reviewPacks: Array.isArray(store.reviewPacks) ? store.reviewPacks.map(normalizeReviewPack) : [],
    closeBriefs: Array.isArray(store.closeBriefs) ? store.closeBriefs.map(normalizeCloseBrief) : [],
    executionItems: Array.isArray(store.executionItems) ? store.executionItems.map(normalizeExecutionItem) : [],
    dispatchItems: Array.isArray(store.dispatchItems) ? store.dispatchItems.map(normalizeDispatchItem) : [],
    workflowEvents: Array.isArray(store.workflowEvents) ? store.workflowEvents.map(normalizeWorkflowEvent).slice(0, 160) : [],
    updatedAt: new Date().toISOString()
  };
  fs.writeFileSync(storePath, `${JSON.stringify(next, null, 2)}\n`);
  return next;
}

function computeBoard(reviewPacks) {
  const board = {
    total: reviewPacks.length,
    draft: 0,
    ready: 0,
    approved: 0,
    blocked: 0,
    dispatched: 0
  };
  for (const pack of reviewPacks) {
    const status = pack.review.status;
    if (Object.hasOwn(board, status)) board[status] += 1;
  }
  return board;
}

function computeExecutionBoard(executionItems) {
  const board = {
    total: executionItems.length,
    queued: 0,
    active: 0,
    blocked: 0,
    completed: 0
  };
  for (const item of executionItems) {
    const status = item.status;
    if (Object.hasOwn(board, status)) board[status] += 1;
  }
  return board;
}

function computeDispatchBoard(dispatchItems) {
  const board = {
    total: dispatchItems.length,
    queued: 0,
    ready: 0,
    active: 0,
    blocked: 0,
    delivered: 0
  };
  for (const item of dispatchItems) {
    const status = item.status;
    if (Object.hasOwn(board, status)) board[status] += 1;
  }
  return board;
}

function computeCloseBriefBoard(closeBriefs) {
  const board = {
    total: closeBriefs.length,
    close_now: 0,
    protect_margin: 0,
    tighten_proof: 0,
    reprice: 0,
    other: 0
  };
  for (const brief of closeBriefs) {
    const action = String(brief.action || "").toLowerCase();
    if (action.includes("close")) board.close_now += 1;
    else if (action.includes("margin")) board.protect_margin += 1;
    else if (action.includes("proof")) board.tighten_proof += 1;
    else if (action.includes("reprice")) board.reprice += 1;
    else board.other += 1;
  }
  return board;
}

function computeWorkflowTimeline(workflowEvents) {
  const summary = {
    archive: 0,
    brief: 0,
    review: 0,
    execution: 0,
    dispatch: 0,
    other: 0
  };
  const timeline = [...workflowEvents].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  for (const event of timeline) {
    if (Object.hasOwn(summary, event.category)) {
      summary[event.category] += 1;
    } else {
      summary.other += 1;
    }
  }
  return { summary, timeline: timeline.slice(0, 20) };
}

function pushWorkflowEvent(store, event) {
  return [
    normalizeWorkflowEvent({
      ...event,
      createdAt: new Date().toISOString()
    }),
    ...(Array.isArray(store.workflowEvents) ? store.workflowEvents : [])
  ].slice(0, 160);
}

function json(res, status, payload) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(JSON.stringify(payload, null, 2));
}

function gateSessionFrom(req) {
  const direct = req.headers["x-skye-gate-session"];
  const token = Array.isArray(direct) ? direct[0] : direct;
  const auth = Array.isArray(req.headers.authorization) ? req.headers.authorization[0] : req.headers.authorization;
  if (typeof token === "string" && token.trim()) return token.trim();
  if (typeof auth === "string" && /^Bearer\s+/i.test(auth)) return auth.replace(/^Bearer\s+/i, "").trim();
  return "";
}

function validGateSession(req) {
  const token = gateSessionFrom(req).replace(/[^a-zA-Z0-9:_.-]/g, "").slice(0, 220);
  if (!/^[a-zA-Z0-9:_.-]{8,220}$/.test(token)) return false;
  if (gateTokenEnv) return token === gateTokenEnv;
  return true;
}

function requireGate(req, res) {
  if (validGateSession(req)) return true;
  json(res, 401, {
    ok: false,
    error: "gate_session_required",
    message: "SkyeProfitConsole is Free99, but runtime actions require a 0S or FS27 gate session."
  });
  return false;
}

function text(res, status, payload, type = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "content-type": type,
    "cache-control": "no-store"
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}


function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml; charset=utf-8",
    ".md": "text/markdown; charset=utf-8",
    ".txt": "text/plain; charset=utf-8"
  };
  return map[ext] || "application/octet-stream";
}

function serveStatic(urlPath, res) {
  const cleaned = urlPath === "/" ? "index.html" : decodeURIComponent(urlPath.replace(/^\/+/, ""));
  const full = path.resolve(root, cleaned);
  if (!full.startsWith(root) || !fs.existsSync(full) || !fs.statSync(full).isFile()) {
    return false;
  }
  text(res, 200, fs.readFileSync(full), contentTypeFor(full));
  return true;
}

function notFound(res) {
  json(res, 404, { ok: false, error: "not_found" });
}

const args = process.argv.slice(2);
let port = 0;
let host = process.env.SKYE_PROFIT_HOST || process.env.HOST || "127.0.0.1";
for (let index = 0; index < args.length; index += 1) {
  if (args[index] === "--port") {
    port = Number.parseInt(args[index + 1] || "", 10);
  }
  if (args[index] === "--host") {
    host = args[index + 1] || host;
  }
}

const server = http.createServer(async (req, res) => {
  const method = req.method || "GET";
  const url = new URL(req.url || "/", "http://127.0.0.1");
  const store = loadStore();

  if (method === "GET" && !url.pathname.startsWith("/api/") && url.pathname !== "/health") {
    if (serveStatic(url.pathname, res)) return;
  }

  if (method === "GET" && url.pathname === "/health") {
    if (!requireGate(req, res)) return;
    json(res, 200, {
      ok: true,
      surface: "SkyeProfitConsole",
      mode: "same-folder-local-runtime",
      review_pack_count: store.reviewPacks.length,
      close_brief_count: store.closeBriefs.length,
      execution_item_count: store.executionItems.length,
      dispatch_item_count: store.dispatchItems.length
    });
    return;
  }

  if (method === "GET" && url.pathname === "/api/runtime/status") {
    if (!requireGate(req, res)) return;
    json(res, 200, {
      ok: true,
      mode: "same-folder-local-runtime",
      review_pack_count: store.reviewPacks.length,
      review_board: computeBoard(store.reviewPacks),
      close_brief_count: store.closeBriefs.length,
      close_brief_board: computeCloseBriefBoard(store.closeBriefs),
      execution_item_count: store.executionItems.length,
      execution_board: computeExecutionBoard(store.executionItems),
      dispatch_item_count: store.dispatchItems.length,
      dispatch_board: computeDispatchBoard(store.dispatchItems),
      workflow_timeline: computeWorkflowTimeline(store.workflowEvents).summary,
      updated_at: store.updatedAt
    });
    return;
  }

  if (method === "GET" && url.pathname === "/api/runtime/review-board") {
    if (!requireGate(req, res)) return;
    json(res, 200, {
      ok: true,
      review_board: computeBoard(store.reviewPacks)
    });
    return;
  }

  if (method === "GET" && url.pathname === "/api/runtime/close-briefs") {
    if (!requireGate(req, res)) return;
    json(res, 200, {
      ok: true,
      close_brief_board: computeCloseBriefBoard(store.closeBriefs),
      close_briefs: [...store.closeBriefs].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    });
    return;
  }

  if (method === "GET" && url.pathname === "/api/runtime/close-review-packs") {
    if (!requireGate(req, res)) return;
    json(res, 200, {
      ok: true,
      review_packs: [...store.reviewPacks].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    });
    return;
  }

  if (method === "GET" && url.pathname === "/api/runtime/execution-board") {
    if (!requireGate(req, res)) return;
    json(res, 200, {
      ok: true,
      execution_board: computeExecutionBoard(store.executionItems),
      execution_items: [...store.executionItems].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    });
    return;
  }

  if (method === "GET" && url.pathname === "/api/runtime/dispatch-board") {
    if (!requireGate(req, res)) return;
    json(res, 200, {
      ok: true,
      dispatch_board: computeDispatchBoard(store.dispatchItems),
      dispatch_items: [...store.dispatchItems].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    });
    return;
  }

  if (method === "GET" && url.pathname === "/api/runtime/workflow-timeline") {
    if (!requireGate(req, res)) return;
    const timeline = computeWorkflowTimeline(store.workflowEvents);
    json(res, 200, {
      ok: true,
      workflow_timeline: timeline.summary,
      workflow_events: timeline.timeline
    });
    return;
  }

  if (method === "POST" && url.pathname === "/api/runtime/close-briefs") {
    if (!requireGate(req, res)) return;
    try {
      const body = await readBody(req);
      const nextBrief = normalizeCloseBrief(body);
      const nextStore = saveStore({
        ...store,
        closeBriefs: [nextBrief, ...store.closeBriefs],
        workflowEvents: pushWorkflowEvent(store, {
          type: "close_brief_archived",
          category: "brief",
          detail: `Archived close brief ${nextBrief.label}`,
          owner: nextBrief.owner,
          target: nextBrief.target,
          closeBriefId: nextBrief.id,
          status: nextBrief.status,
          checkpoint: nextBrief.action
        })
      });
      json(res, 200, {
        ok: true,
        close_brief: nextBrief,
        close_brief_board: computeCloseBriefBoard(nextStore.closeBriefs),
        workflow_timeline: computeWorkflowTimeline(nextStore.workflowEvents).summary
      });
    } catch (error) {
      json(res, 400, { ok: false, error: "invalid_json", detail: error.message });
    }
    return;
  }

  if (method === "POST" && url.pathname === "/api/runtime/close-review-packs") {
    if (!requireGate(req, res)) return;
    try {
      const body = await readBody(req);
      const nextPack = normalizeReviewPack(body);
      const nextStore = saveStore({
        ...store,
        reviewPacks: [nextPack, ...store.reviewPacks],
        workflowEvents: pushWorkflowEvent(store, {
          type: "review_pack_archived",
          category: "archive",
          detail: `Archived review pack ${nextPack.label}`,
          owner: nextPack.review.owner,
          target: nextPack.target,
          reviewPackId: nextPack.id,
          status: nextPack.review.status,
          checkpoint: nextPack.review.checkpoint
        })
      });
      json(res, 200, {
        ok: true,
        review_pack: nextPack,
        review_board: computeBoard(nextStore.reviewPacks)
      });
    } catch (error) {
      json(res, 400, { ok: false, error: "invalid_json", detail: error.message });
    }
    return;
  }

  if (method === "GET" && url.pathname.startsWith("/api/runtime/close-briefs/")) {
    if (!requireGate(req, res)) return;
    const closeBriefId = decodeURIComponent(url.pathname.split("/").pop() || "");
    const closeBrief = store.closeBriefs.find((item) => item.id === closeBriefId);
    if (!closeBrief) {
      notFound(res);
      return;
    }
    json(res, 200, { ok: true, close_brief: closeBrief });
    return;
  }

  if (method === "GET" && url.pathname.startsWith("/api/runtime/close-review-packs/")) {
    if (!requireGate(req, res)) return;
    const reviewPackId = decodeURIComponent(url.pathname.split("/").pop() || "");
    const reviewPack = store.reviewPacks.find((item) => item.id === reviewPackId);
    if (!reviewPack) {
      notFound(res);
      return;
    }
    json(res, 200, { ok: true, review_pack: reviewPack });
    return;
  }

  if (method === "POST" && /^\/api\/runtime\/close-review-packs\/[^/]+\/review$/.test(url.pathname)) {
    if (!requireGate(req, res)) return;
    try {
      const parts = url.pathname.split("/");
      const reviewPackId = decodeURIComponent(parts[parts.length - 2] || "");
      const body = await readBody(req);
      const nextReview = normalizeReview(body.review || body);
      let found = false;
      const nextStore = saveStore({
        ...store,
        reviewPacks: store.reviewPacks.map((pack) => {
          if (pack.id !== reviewPackId) return pack;
          found = true;
          return normalizeReviewPack({
            ...pack,
            review: {
              ...pack.review,
              ...nextReview,
              updatedAt: new Date().toISOString()
            }
          });
        }),
        workflowEvents: pushWorkflowEvent(store, {
          type: "review_pack_review_updated",
          category: "review",
          detail: `Updated review state for ${reviewPackId}`,
          owner: nextReview.owner,
          target: "",
          reviewPackId,
          status: nextReview.status,
          checkpoint: nextReview.checkpoint
        })
      });
      if (!found) {
        notFound(res);
        return;
      }
      const updated = nextStore.reviewPacks.find((pack) => pack.id === reviewPackId);
      json(res, 200, {
        ok: true,
        review_pack: updated,
        review_board: computeBoard(nextStore.reviewPacks)
      });
    } catch (error) {
      json(res, 400, { ok: false, error: "invalid_json", detail: error.message });
    }
    return;
  }

  if (method === "POST" && /^\/api\/runtime\/close-review-packs\/[^/]+\/execution$/.test(url.pathname)) {
    if (!requireGate(req, res)) return;
    try {
      const parts = url.pathname.split("/");
      const reviewPackId = decodeURIComponent(parts[parts.length - 2] || "");
      const reviewPack = store.reviewPacks.find((item) => item.id === reviewPackId);
      if (!reviewPack) {
        notFound(res);
        return;
      }
      const body = await readBody(req);
      const executionItem = normalizeExecutionItem({
        reviewPackId,
        label: body.label || `${reviewPack.label} execution`,
        target: body.target || reviewPack.target,
        owner: body.owner || reviewPack.review.owner,
        status: body.status || "queued",
        notes: body.notes || reviewPack.notes,
        recommended_actions: Array.isArray(body.recommended_actions) ? body.recommended_actions : reviewPack.recommended_actions,
        snapshot: reviewPack.snapshot,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      const nextStore = saveStore({
        ...store,
        reviewPacks: store.reviewPacks.map((pack) => {
          if (pack.id !== reviewPackId) return pack;
          return normalizeReviewPack({
            ...pack,
            review: {
              ...pack.review,
              status: "dispatched",
              checkpoint: body.checkpoint || pack.review.checkpoint || "execution_queued",
              owner: executionItem.owner || pack.review.owner,
              notes: body.reviewNotes || pack.review.notes,
              updatedAt: new Date().toISOString()
            }
          });
        }),
        executionItems: [executionItem, ...store.executionItems],
        workflowEvents: pushWorkflowEvent(store, {
          type: "review_pack_execution_updated",
          category: "execution",
          detail: `Queued execution for ${reviewPack.label}`,
          owner: executionItem.owner,
          target: executionItem.target,
          reviewPackId,
          executionItemId: executionItem.id,
          status: executionItem.status,
          checkpoint: body.checkpoint || "execution_queued"
        })
      });
      json(res, 200, {
        ok: true,
        execution_item: executionItem,
        review_pack: nextStore.reviewPacks.find((pack) => pack.id === reviewPackId),
        review_board: computeBoard(nextStore.reviewPacks),
        execution_board: computeExecutionBoard(nextStore.executionItems)
      });
    } catch (error) {
      json(res, 400, { ok: false, error: "invalid_json", detail: error.message });
    }
    return;
  }

  if (method === "GET" && url.pathname.startsWith("/api/runtime/execution-board/")) {
    if (!requireGate(req, res)) return;
    const executionItemId = decodeURIComponent(url.pathname.split("/").pop() || "");
    const executionItem = store.executionItems.find((item) => item.id === executionItemId);
    if (!executionItem) {
      notFound(res);
      return;
    }
    json(res, 200, { ok: true, execution_item: executionItem });
    return;
  }

  if (method === "POST" && /^\/api\/runtime\/execution-board\/[^/]+\/dispatch$/.test(url.pathname)) {
    if (!requireGate(req, res)) return;
    try {
      const parts = url.pathname.split("/");
      const executionItemId = decodeURIComponent(parts[parts.length - 2] || "");
      const executionItem = store.executionItems.find((item) => item.id === executionItemId);
      if (!executionItem) {
        notFound(res);
        return;
      }
      const body = await readBody(req);
      const dispatchItem = normalizeDispatchItem({
        executionItemId,
        reviewPackId: executionItem.reviewPackId,
        label: body.label || `${executionItem.label} dispatch`,
        target: body.target || executionItem.target,
        owner: body.owner || executionItem.owner,
        channel: body.channel || "activation",
        status: body.status || "queued",
        checkpoint: body.checkpoint || "dispatch_queued",
        notes: body.notes || executionItem.notes,
        recommended_actions: Array.isArray(body.recommended_actions) ? body.recommended_actions : executionItem.recommended_actions,
        snapshot: executionItem.snapshot,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      const nextStore = saveStore({
        ...store,
        executionItems: store.executionItems.map((item) => {
          if (item.id !== executionItemId) return item;
          return normalizeExecutionItem({
            ...item,
            status: body.executionStatus || "completed",
            owner: dispatchItem.owner || item.owner,
            notes: body.executionNotes || item.notes,
            updatedAt: new Date().toISOString()
          });
        }),
        dispatchItems: [dispatchItem, ...store.dispatchItems],
        workflowEvents: pushWorkflowEvent(store, {
          type: "review_pack_dispatch_updated",
          category: "dispatch",
          detail: `Queued dispatch for ${executionItem.label}`,
          owner: dispatchItem.owner,
          target: dispatchItem.target,
          reviewPackId: executionItem.reviewPackId,
          executionItemId,
          dispatchItemId: dispatchItem.id,
          status: dispatchItem.status,
          checkpoint: dispatchItem.checkpoint
        })
      });
      json(res, 200, {
        ok: true,
        dispatch_item: dispatchItem,
        execution_item: nextStore.executionItems.find((item) => item.id === executionItemId),
        dispatch_board: computeDispatchBoard(nextStore.dispatchItems),
        workflow_timeline: computeWorkflowTimeline(nextStore.workflowEvents).summary
      });
    } catch (error) {
      json(res, 400, { ok: false, error: "invalid_json", detail: error.message });
    }
    return;
  }

  notFound(res);
});

server.listen(port, host, () => {
  const address = server.address();
  const actualPort = typeof address === "object" && address ? address.port : port;
  process.stdout.write(`${JSON.stringify({ ok: true, host, port: actualPort })}\n`);
});
