#!/usr/bin/env node
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultStorePath = path.join(root, "runtime", "store.json");
const defaultJournalPath = path.join(root, "runtime", "ops-journal.json");

function makeId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function ensureStoreDir(storePath) {
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
}

function writeJson(filePath, payload) {
  ensureStoreDir(filePath);
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`);
}

function defaultStore() {
  return {
    brandPackets: [],
    updatedAt: null
  };
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

function normalizeReview(review = {}) {
  const allowed = new Set(["draft", "ready", "approved", "blocked", "dispatched"]);
  const status = normalizeString(review.status || "draft", 40).toLowerCase();
  return {
    status: allowed.has(status) ? status : "draft",
    owner: normalizeString(review.owner || "", 120),
    checkpoint: normalizeString(review.checkpoint || "", 160),
    notes: normalizeString(review.notes || "", 1200),
    updatedAt: normalizeString(review.updatedAt || "", 80) || null
  };
}

function normalizeExecution(execution = {}, fallbackOwner = "", fallbackActions = [], fallbackTargets = []) {
  const allowed = new Set(["queued", "active", "blocked", "completed"]);
  const status = normalizeString(execution.status || "queued", 40).toLowerCase();
  return {
    status: allowed.has(status) ? status : "queued",
    owner: normalizeString(execution.owner || fallbackOwner || "", 120),
    checkpoint: normalizeString(execution.checkpoint || "", 160),
    dueAt: normalizeString(execution.dueAt || "", 80) || null,
    nextAction: normalizeString(execution.nextAction || "", 240),
    notes: normalizeString(execution.notes || "", 1200),
    recommendedActions: normalizeArray(execution.recommendedActions || fallbackActions, 8),
    targets: normalizeArray(execution.targets || fallbackTargets, 8),
    updatedAt: normalizeString(execution.updatedAt || "", 80) || null
  };
}

function normalizeDispatch(dispatch = {}, fallbackOwner = "", fallbackSummary = {}, fallbackActions = [], fallbackTargets = []) {
  const allowed = new Set(["queued", "ready", "active", "blocked", "delivered"]);
  const status = normalizeString(dispatch.status || "queued", 40).toLowerCase();
  return {
    status: allowed.has(status) ? status : "queued",
    owner: normalizeString(dispatch.owner || fallbackOwner || "", 120),
    label: normalizeString(dispatch.label || "brand_delivery_dispatch", 120) || "brand_delivery_dispatch",
    channel: normalizeString(dispatch.channel || "brand_delivery", 120) || "brand_delivery",
    checkpoint: normalizeString(dispatch.checkpoint || "", 160),
    dueAt: normalizeString(dispatch.dueAt || "", 80) || null,
    nextAction: normalizeString(dispatch.nextAction || "", 240),
    notes: normalizeString(dispatch.notes || "", 1200),
    recommendedActions: normalizeArray(dispatch.recommendedActions || fallbackActions, 8),
    targets: normalizeArray(dispatch.targets || fallbackTargets, 8),
    handoffSummary: {
      creativeLane: normalizeString(dispatch.handoffSummary?.creativeLane || fallbackSummary.creativeLane || "", 120),
      crmLane: normalizeString(dispatch.handoffSummary?.crmLane || fallbackSummary.crmLane || "", 120),
      activationLane: normalizeString(dispatch.handoffSummary?.activationLane || fallbackSummary.activationLane || "", 120),
      mediaLane: normalizeString(dispatch.handoffSummary?.mediaLane || fallbackSummary.mediaLane || "", 120),
      opsLane: normalizeString(dispatch.handoffSummary?.opsLane || fallbackSummary.opsLane || "", 120),
    },
    updatedAt: normalizeString(dispatch.updatedAt || "", 80) || null
  };
}

function normalizeString(value, max = 400) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, max);
}

function normalizeArray(values = [], max = 12) {
  return (Array.isArray(values) ? values : [])
    .map((value) => normalizeString(value, 160))
    .filter(Boolean)
    .slice(0, max);
}

function normalizeBrandState(state = {}) {
  return {
    brandName: normalizeString(state.brandName || "", 160),
    brandTagline: normalizeString(state.brandTagline || "", 240),
    accentColor: normalizeString(state.accentColor || "#FBBF24", 24) || "#FBBF24",
    logoHref: normalizeString(state.logoHref || "", 1200),
    isDark: state.isDark !== false,
    aiIntensity: normalizeString(state.aiIntensity || "balanced", 40) || "balanced",
    prompt: normalizeString(state.prompt || "", 1200),
    aiOutputExcerpt: normalizeString(state.aiOutputExcerpt || "", 1200)
  };
}

function normalizeProjectSummary(summary = {}) {
  return {
    localSnapshots: Number.isFinite(Number(summary.localSnapshots)) ? Number(summary.localSnapshots) : 0,
    latestSavedAt: normalizeString(summary.latestSavedAt || "", 80) || null
  };
}

function normalizeExports(exportsState = {}) {
  return {
    primaryLockupReady: exportsState.primaryLockupReady !== false,
    iconMarkReady: exportsState.iconMarkReady !== false,
    exportFormats: normalizeArray(exportsState.exportFormats || ["svg-primary", "svg-mark"], 8)
  };
}

function normalizeTarget(target = {}) {
  return {
    platform: normalizeString(target.platform || "SkyeHands", 120) || "SkyeHands",
    lane: normalizeString(target.lane || "manual-handoff", 120) || "manual-handoff",
    reason: normalizeString(target.reason || "", 320)
  };
}

function inferTargets(packet) {
  const blob = [
    packet.brandState.brandName,
    packet.brandState.brandTagline,
    packet.brandState.prompt,
    packet.brandState.aiOutputExcerpt,
    packet.notes
  ].join("\n").toLowerCase();

  const targets = [];
  const addTarget = (platform, lane, reason) => {
    if (targets.some((item) => item.platform === platform)) return;
    targets.push({ platform, lane, reason });
  };

  addTarget("SkyeWebCreatorMax", "brand-launch", "Brand identity should feed website/storefront build work.");
  addTarget("AE-FlowPro", "sales-activation", "Brand state should stay attached to activation and launch readiness.");
  addTarget("SkyeMediaCenter", "media-assets", "Brand source files and campaign assets should be searchable, reviewable, and publishable.");

  if (/\b(contact|lead|consult|book|signup|quote)\b/.test(blob)) {
    addTarget("SkyeLeadVault", "crm-intake", "Prompt and copy suggest lead capture or intake flow.");
  }
  if (/\b(menu|order|product|shop|buy|store|retail)\b/.test(blob)) {
    addTarget("MaggiesStore", "storefront-merch", "Brand output suggests a product/storefront merchandising lane.");
  }
  if (/\b(asset|media|logo|image|photo|video|cover|banner|social|upload|publish|delivery)\b/.test(blob)) {
    addTarget("SkyeMediaCenter", "media-assets", "Brand output includes reusable media or publishing assets.");
  }
  if (/\b(job|dispatch|staff|worker|team|ops|route|delivery)\b/.test(blob)) {
    addTarget("skyeroutex-workforce-command-v0.4.0", "ops-handoff", "Prompt suggests staffing, dispatch, or operating workflow needs.");
  }
  if (!targets.some((item) => item.platform === "SkyeLeadVault")) {
    addTarget("SkyeLeadVault", "crm-intake", "Brand work can be promoted into the shared intake/CRM lane.");
  }
  return targets.slice(0, 6);
}

function buildActionItems(packet) {
  const targets = packet.downstreamTargets.map((item) => item.platform);
  const brandName = packet.brandState.brandName || "brand";
  const actions = [];
  if (targets.includes("SkyeLeadVault")) {
    actions.push(`Create or update the ${brandName} intake lane in SkyeLeadVault.`);
  }
  if (targets.includes("SkyeWebCreatorMax")) {
    actions.push(`Build a branded web/storefront brief for ${brandName} inside SkyeWebCreatorMax.`);
  }
  if (targets.includes("AE-FlowPro")) {
    actions.push(`Attach ${brandName} positioning and launch notes to an AE-FlowPro activation pack.`);
  }
  if (targets.includes("SkyeMediaCenter")) {
    actions.push(`Archive ${brandName} source logos, campaign assets, and export proofs inside SkyeMediaCenter.`);
  }
  if (targets.includes("MaggiesStore")) {
    actions.push(`Map ${brandName} identity into MaggiesStore menus, products, or ordering surfaces.`);
  }
  if (targets.includes("skyeroutex-workforce-command-v0.4.0")) {
    actions.push(`Prepare a workforce or dispatch handoff for ${brandName} inside Workforce Command.`);
  }
  if (!actions.length) {
    actions.push(`Review ${brandName} manually and assign the next SkyeHands lane.`);
  }
  return actions.slice(0, 6);
}

function buildHandoffSummary(packet) {
  const targets = packet.downstreamTargets.map((item) => item.platform);
  return {
    creativeLane: targets.includes("SkyeWebCreatorMax") ? "SkyeWebCreatorMax" : "manual-creative-handoff",
    crmLane: targets.includes("SkyeLeadVault") ? "SkyeLeadVault" : "manual-intake",
    activationLane: targets.includes("AE-FlowPro") ? "AE-FlowPro" : "manual-activation",
    mediaLane: targets.includes("SkyeMediaCenter") ? "SkyeMediaCenter" : "manual-media-handoff",
    opsLane: targets.includes("skyeroutex-workforce-command-v0.4.0")
      ? "skyeroutex-workforce-command-v0.4.0"
      : "manual-ops-handoff"
  };
}

function normalizePacket(packet = {}) {
  const downstreamTargets = (Array.isArray(packet.downstreamTargets) && packet.downstreamTargets.length
    ? packet.downstreamTargets
    : inferTargets({
        brandState: normalizeBrandState(packet.brandState || {}),
        notes: normalizeString(packet.notes || "", 1200)
      })
  ).map(normalizeTarget).slice(0, 8);
  const normalized = {
    packetId: normalizeString(packet.packetId, 80) || makeId("brandpack"),
    createdAt: normalizeString(packet.createdAt, 80) || new Date().toISOString(),
    label: normalizeString(packet.label || packet.brandState?.brandName || "Brand handoff packet", 160) || "Brand handoff packet",
    notes: normalizeString(packet.notes || "", 1200),
    source: normalizeString(packet.source || "kAIxUBrandKit", 80) || "kAIxUBrandKit",
    brandState: normalizeBrandState(packet.brandState || {}),
    projectSummary: normalizeProjectSummary(packet.projectSummary || {}),
    exports: normalizeExports(packet.exports || {}),
    review: normalizeReview(packet.review || {}),
    downstreamTargets
  };
  normalized.handoffSummary = buildHandoffSummary(normalized);
  normalized.actionItems = buildActionItems(normalized);
  normalized.execution = normalizeExecution(
    packet.execution || {},
    normalized.review.owner,
    normalized.actionItems,
    normalized.downstreamTargets.map((item) => item.platform)
  );
  normalized.dispatch = normalizeDispatch(
    packet.dispatch || {},
    normalized.execution.owner || normalized.review.owner,
    normalized.handoffSummary,
    normalized.actionItems,
    normalized.downstreamTargets.map((item) => item.platform)
  );
  return normalized;
}

function buildReviewBoard(store) {
  const counts = {
    draft: 0,
    ready: 0,
    approved: 0,
    blocked: 0,
    dispatched: 0
  };
  for (const item of store.brandPackets) {
    const status = item.review?.status || "draft";
    if (Object.hasOwn(counts, status)) counts[status] += 1;
  }
  return {
    counts,
    open: counts.draft + counts.ready + counts.blocked,
    latestUpdatedAt: store.brandPackets[0]?.review?.updatedAt || store.brandPackets[0]?.createdAt || null
  };
}

function buildExecutionBoard(store) {
  const counts = { queued: 0, active: 0, blocked: 0, completed: 0, unassigned: 0 };
  for (const item of store.brandPackets) {
    const status = item.execution?.status || "queued";
    if (Object.hasOwn(counts, status)) counts[status] += 1;
    if (!item.execution?.owner) counts.unassigned += 1;
  }
  return counts;
}

function buildDispatchBoard(store) {
  const counts = { queued: 0, ready: 0, active: 0, blocked: 0, delivered: 0, unassigned: 0 };
  for (const item of store.brandPackets) {
    const status = item.dispatch?.status || "queued";
    if (Object.hasOwn(counts, status)) counts[status] += 1;
    if (!item.dispatch?.owner) counts.unassigned += 1;
  }
  return counts;
}

function readJournal(context) {
  return readJson(context.journalPath, []);
}

function appendJournal(context, entry) {
  const journal = Array.isArray(readJournal(context)) ? readJournal(context) : [];
  journal.unshift({
    id: normalizeString(entry.id || makeId("journal"), 120),
    type: normalizeString(entry.type || "event", 80),
    detail: normalizeString(entry.detail || "", 400),
    createdAt: entry.createdAt || new Date().toISOString(),
    meta: entry.meta && typeof entry.meta === "object" ? entry.meta : {}
  });
  writeJson(context.journalPath, journal.slice(0, 160));
}

function classifyJournalEntry(entry = {}) {
  const type = String(entry.type || "");
  if (type === "brand_packet_archived") return "archive";
  if (type === "brand_packet_review_updated") return "review";
  if (type === "brand_packet_execution_updated") return "execution";
  if (type === "brand_packet_dispatch_updated") return "dispatch";
  return "other";
}

function buildWorkflowTimeline(context, limit = 20) {
  const journal = Array.isArray(readJournal(context)) ? readJournal(context) : [];
  const summary = { archive: 0, review: 0, execution: 0, dispatch: 0, other: 0 };
  const timeline = [];
  for (const entry of journal) {
    const category = classifyJournalEntry(entry);
    if (Object.hasOwn(summary, category)) summary[category] += 1;
    if (timeline.length >= limit) continue;
    timeline.push({
      id: String(entry.id || ""),
      type: String(entry.type || "event"),
      category,
      detail: String(entry.detail || ""),
      createdAt: entry.createdAt || "",
      packetId: String(entry.meta?.packetId || ""),
      owner: String(entry.meta?.owner || ""),
      status: String(entry.meta?.status || ""),
      checkpoint: String(entry.meta?.checkpoint || ""),
      brandName: String(entry.meta?.brandName || "")
    });
  }
  return { summary, timeline };
}

function loadStore(context) {
  ensureStoreDir(context.storePath);
  if (!fs.existsSync(context.storePath)) {
    const initial = defaultStore();
    writeJson(context.storePath, initial);
    return initial;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(context.storePath, "utf8"));
    return {
      brandPackets: Array.isArray(parsed.brandPackets) ? parsed.brandPackets.map(normalizePacket) : [],
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null
    };
  } catch {
    const reset = defaultStore();
    writeJson(context.storePath, reset);
    return reset;
  }
}

function saveStore(context, store) {
  const next = {
    brandPackets: Array.isArray(store.brandPackets) ? store.brandPackets.map(normalizePacket) : [],
    updatedAt: new Date().toISOString()
  };
  writeJson(context.storePath, next);
  return next;
}

function summarizeStore(store, context) {
  const latest = store.brandPackets[0] || null;
  const workflowTimeline = buildWorkflowTimeline(context, 12);
  return {
    ok: true,
    app: "kAIxUBrandKit",
    mode: "same-folder-local-runtime",
    startedAt: context.startedAt,
    dataFile: path.relative(root, context.storePath).replaceAll(path.sep, "/"),
    brandPackets: {
      total: store.brandPackets.length,
      latestAt: latest?.createdAt || null,
      latestPacketId: latest?.packetId || null,
      latestBrandName: latest?.brandState?.brandName || null,
      latestTargets: latest?.downstreamTargets?.map((item) => item.platform) || []
    },
    reviewBoard: buildReviewBoard(store),
    executionBoard: buildExecutionBoard(store),
    dispatchBoard: buildDispatchBoard(store),
    workflowTimeline: workflowTimeline.summary
  };
}

function json(res, status, payload) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(JSON.stringify(payload, null, 2));
}

function mimeType(filePath) {
  switch (path.extname(filePath).toLowerCase()) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
    case ".mjs":
      return "application/javascript; charset=utf-8";
    case ".json":
    case ".webmanifest":
      return "application/json; charset=utf-8";
    case ".png":
      return "image/png";
    case ".svg":
      return "image/svg+xml; charset=utf-8";
    case ".pdf":
      return "application/pdf";
    default:
      return "application/octet-stream";
  }
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function resolveStaticPath(urlPath) {
  const requested = urlPath === "/" ? "/index.html" : urlPath;
  const normalized = path.normalize(path.join(root, requested));
  if (!normalized.startsWith(root)) return null;
  return normalized;
}

async function serveStatic(res, urlPath) {
  const filePath = resolveStaticPath(urlPath);
  if (!filePath) {
    json(res, 403, { ok: false, error: "forbidden" });
    return;
  }
  try {
    const stat = await fs.promises.stat(filePath);
    const finalPath = stat.isDirectory() ? path.join(filePath, "index.html") : filePath;
    const data = await fs.promises.readFile(finalPath);
    res.writeHead(200, {
      "content-type": mimeType(finalPath),
      "cache-control": "no-store"
    });
    res.end(data);
  } catch (error) {
    if (error.code === "ENOENT") {
      json(res, 404, { ok: false, error: "not-found", path: urlPath });
      return;
    }
    json(res, 500, { ok: false, error: error.message });
  }
}

export function createBrandKitRuntime(options = {}) {
  const context = {
    startedAt: new Date().toISOString(),
    storePath: path.resolve(options.storePath || process.env.KAIXU_BRANDKIT_STORE_PATH || defaultStorePath),
    journalPath: path.resolve(options.journalPath || process.env.KAIXU_BRANDKIT_JOURNAL_PATH || defaultJournalPath)
  };

  const server = http.createServer(async (req, res) => {
    const requestUrl = new URL(req.url || "/", "http://127.0.0.1");
    try {
      if (req.method === "GET" && requestUrl.pathname === "/health") {
        const store = loadStore(context);
        json(res, 200, {
          ok: true,
          app: "kAIxUBrandKit",
          mode: "same-folder-local-runtime",
          startedAt: context.startedAt,
          routes: [
            "/health",
            "/api/runtime/status",
            "/api/runtime/brand-packets",
            "/api/runtime/review-board",
            "/api/runtime/execution-board",
            "/api/runtime/dispatch-board",
            "/api/runtime/workflow-timeline"
          ],
          store: summarizeStore(store, context)
        });
        return;
      }

      if (req.method === "GET" && requestUrl.pathname === "/api/runtime/status") {
        const store = loadStore(context);
        json(res, 200, summarizeStore(store, context));
        return;
      }

      if (req.method === "GET" && requestUrl.pathname === "/api/runtime/brand-packets") {
        const store = loadStore(context);
        json(res, 200, { ok: true, items: store.brandPackets, total: store.brandPackets.length });
        return;
      }

      if (req.method === "GET" && requestUrl.pathname === "/api/runtime/review-board") {
        const store = loadStore(context);
        json(res, 200, {
          ok: true,
          summary: buildReviewBoard(store),
          items: store.brandPackets
        });
        return;
      }

      if (req.method === "GET" && requestUrl.pathname === "/api/runtime/execution-board") {
        const store = loadStore(context);
        json(res, 200, {
          ok: true,
          counts: buildExecutionBoard(store),
          items: store.brandPackets
        });
        return;
      }

      if (req.method === "GET" && requestUrl.pathname === "/api/runtime/dispatch-board") {
        const store = loadStore(context);
        json(res, 200, {
          ok: true,
          counts: buildDispatchBoard(store),
          items: store.brandPackets
        });
        return;
      }

      if (req.method === "GET" && requestUrl.pathname === "/api/runtime/workflow-timeline") {
        const limit = Math.max(1, Math.min(50, Number(requestUrl.searchParams.get("limit") || 20)));
        json(res, 200, { ok: true, workflowTimeline: buildWorkflowTimeline(context, limit) });
        return;
      }

      if (req.method === "POST" && requestUrl.pathname === "/api/runtime/brand-packets") {
        const body = await readBody(req);
        const packet = normalizePacket(body?.brandPacket && typeof body.brandPacket === "object" ? body.brandPacket : body);
        const store = loadStore(context);
        store.brandPackets.unshift(packet);
        while (store.brandPackets.length > 24) store.brandPackets.pop();
        const saved = saveStore(context, store);
        appendJournal(context, {
          type: "brand_packet_archived",
          detail: `Archived brand packet for ${packet.brandState.brandName || packet.label || "brand handoff"}`,
          meta: {
            packetId: packet.packetId,
            brandName: packet.brandState.brandName || "",
            owner: packet.review.owner || "",
            status: "archived",
            checkpoint: "packet_archived"
          }
        });
        json(res, 201, {
          ok: true,
          item: packet,
          summary: summarizeStore(saved, context)
        });
        return;
      }

      if (req.method === "GET" && requestUrl.pathname.startsWith("/api/runtime/brand-packets/")) {
        const packetId = decodeURIComponent(requestUrl.pathname.split("/").pop() || "");
        const store = loadStore(context);
        const packet = store.brandPackets.find((item) => item.packetId === packetId);
        if (!packet) {
          json(res, 404, { ok: false, error: "brand-packet-not-found", packetId });
          return;
        }
        json(res, 200, { ok: true, item: packet });
        return;
      }

      if (req.method === "POST" && requestUrl.pathname.startsWith("/api/runtime/brand-packets/") && requestUrl.pathname.endsWith("/review")) {
        const parts = requestUrl.pathname.split("/").filter(Boolean);
        const packetId = decodeURIComponent(parts[parts.length - 2] || "");
        const body = await readBody(req);
        const store = loadStore(context);
        const packet = store.brandPackets.find((item) => item.packetId === packetId);
        if (!packet) {
          json(res, 404, { ok: false, error: "brand-packet-not-found", packetId });
          return;
        }
        packet.review = normalizeReview({
          ...packet.review,
          ...(body?.review && typeof body.review === "object" ? body.review : body),
          updatedAt: new Date().toISOString()
        });
        const saved = saveStore(context, store);
        appendJournal(context, {
          type: "brand_packet_review_updated",
          detail: `Updated review board for ${packet.brandState?.brandName || packet.label || "brand handoff"}`,
          meta: {
            packetId: packet.packetId,
            brandName: packet.brandState?.brandName || "",
            owner: packet.review.owner || "",
            status: packet.review.status || "draft",
            checkpoint: packet.review.checkpoint || "review_updated"
          }
        });
        json(res, 200, {
          ok: true,
          item: packet,
          summary: summarizeStore(saved, context)
        });
        return;
      }

      if (req.method === "POST" && requestUrl.pathname.startsWith("/api/runtime/brand-packets/") && requestUrl.pathname.endsWith("/execution")) {
        const parts = requestUrl.pathname.split("/").filter(Boolean);
        const packetId = decodeURIComponent(parts[parts.length - 2] || "");
        const body = await readBody(req);
        const store = loadStore(context);
        const packet = store.brandPackets.find((item) => item.packetId === packetId);
        if (!packet) {
          json(res, 404, { ok: false, error: "brand-packet-not-found", packetId });
          return;
        }
        packet.execution = normalizeExecution(
          {
            ...packet.execution,
            ...(body?.execution && typeof body.execution === "object" ? body.execution : body),
            updatedAt: new Date().toISOString()
          },
          packet.review.owner,
          packet.actionItems,
          packet.downstreamTargets.map((item) => item.platform)
        );
        const saved = saveStore(context, store);
        appendJournal(context, {
          type: "brand_packet_execution_updated",
          detail: `Updated execution board for ${packet.brandState?.brandName || packet.label || "brand handoff"}`,
          meta: {
            packetId: packet.packetId,
            brandName: packet.brandState?.brandName || "",
            owner: packet.execution.owner || "",
            status: packet.execution.status || "queued",
            checkpoint: packet.execution.checkpoint || "execution_updated"
          }
        });
        json(res, 200, {
          ok: true,
          item: packet,
          summary: summarizeStore(saved, context)
        });
        return;
      }

      if (req.method === "POST" && requestUrl.pathname.startsWith("/api/runtime/brand-packets/") && requestUrl.pathname.endsWith("/dispatch")) {
        const parts = requestUrl.pathname.split("/").filter(Boolean);
        const packetId = decodeURIComponent(parts[parts.length - 2] || "");
        const body = await readBody(req);
        const store = loadStore(context);
        const packet = store.brandPackets.find((item) => item.packetId === packetId);
        if (!packet) {
          json(res, 404, { ok: false, error: "brand-packet-not-found", packetId });
          return;
        }
        packet.dispatch = normalizeDispatch(
          {
            ...packet.dispatch,
            ...(body?.dispatch && typeof body.dispatch === "object" ? body.dispatch : body),
            updatedAt: new Date().toISOString()
          },
          packet.execution.owner || packet.review.owner,
          packet.handoffSummary,
          packet.actionItems,
          packet.downstreamTargets.map((item) => item.platform)
        );
        const saved = saveStore(context, store);
        appendJournal(context, {
          type: "brand_packet_dispatch_updated",
          detail: `Updated dispatch board for ${packet.brandState?.brandName || packet.label || "brand handoff"}`,
          meta: {
            packetId: packet.packetId,
            brandName: packet.brandState?.brandName || "",
            owner: packet.dispatch.owner || "",
            status: packet.dispatch.status || "queued",
            checkpoint: packet.dispatch.checkpoint || "dispatch_updated"
          }
        });
        json(res, 200, {
          ok: true,
          item: packet,
          summary: summarizeStore(saved, context)
        });
        return;
      }

      if (req.method !== "GET" && requestUrl.pathname === "/") {
        json(res, 405, { ok: false, error: "method-not-allowed" });
        return;
      }

      await serveStatic(res, requestUrl.pathname);
    } catch (error) {
      json(res, 500, { ok: false, error: error.message || String(error) });
    }
  });

  return { server, context };
}

async function start() {
  const port = Number.parseInt(process.env.PORT || "4298", 10);
  const host = process.env.HOST || "127.0.0.1";
  const { server, context } = createBrandKitRuntime();
  await new Promise((resolve) => server.listen(port, host, resolve));
  console.log(JSON.stringify({
    ok: true,
    app: "kAIxUBrandKit",
    mode: "same-folder-local-runtime",
    url: `http://${host}:${port}`,
    storePath: context.storePath
  }, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  start().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
