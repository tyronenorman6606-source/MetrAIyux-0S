#!/usr/bin/env node
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultStorePath = path.join(root, "runtime", "store.json");
const defaultTargets = [
  "SkyeLeadVault",
  "AE-FlowPro",
  "skyeroutex-workforce-command-v0.4.0",
  "SkyeProofx",
];

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
    mailHandoffPackets: [],
    workflowEvents: [],
    updatedAt: null,
  };
}

function defaultDispatchState(dispatch = {}, packet = {}) {
  const status = normalizeString(dispatch.status, 40) || "queued";
  return {
    label: normalizeString(dispatch.label, 120) || "mail_handoff_dispatch",
    channel: normalizeString(dispatch.channel, 120),
    status,
    owner: normalizeString(dispatch.owner, 120),
    checkpoint: normalizeString(dispatch.checkpoint, 180),
    nextAction: normalizeString(dispatch.nextAction, 240),
    dueAt: normalizeString(dispatch.dueAt, 80) || null,
    notes: normalizeString(dispatch.notes, 1200),
    updatedAt: normalizeString(dispatch.updatedAt, 80) || null,
  };
}

function defaultExecutionState(execution = {}, packet = {}) {
  const status = normalizeString(execution.status, 40) || "queued";
  return {
    status,
    owner: normalizeString(execution.owner, 120),
    checkpoint: normalizeString(execution.checkpoint, 180),
    nextAction: normalizeString(execution.nextAction, 240),
    dueAt: normalizeString(execution.dueAt, 80) || null,
    notes: normalizeString(execution.notes, 1200),
    targets: Array.isArray(execution.targets) ? normalizeTargets(execution.targets) : [],
    updatedAt: normalizeString(execution.updatedAt, 80) || null,
  };
}

function defaultReviewState(review = {}) {
  const status = normalizeString(review.status, 40) || "draft";
  return {
    status,
    owner: normalizeString(review.owner, 120),
    checkpoint: normalizeString(review.checkpoint, 180),
    notes: normalizeString(review.notes, 1200),
    updatedAt: normalizeString(review.updatedAt, 80) || null,
  };
}

function normalizeString(value, max = 320) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, max);
}

function normalizeArray(values, mapper, max = 12) {
  return (Array.isArray(values) ? values : []).slice(0, max).map(mapper).filter(Boolean);
}

function normalizeMessage(message = {}) {
  const id = normalizeString(message.id, 120);
  if (!id) return null;
  return {
    id,
    threadId: normalizeString(message.threadId || message.thread_id, 120),
    subject: normalizeString(message.subject, 240),
    from: normalizeString(message.from, 240),
    to: normalizeString(message.to, 240),
    snippet: normalizeString(message.snippet, 360),
    internalDate: normalizeString(message.internalDate || message.internal_date, 80),
    labels: normalizeArray(message.labels, (value) => normalizeString(value, 40), 12),
    unread: Boolean(message.unread),
    starred: Boolean(message.starred),
    important: Boolean(message.important),
    hasAttachments: Boolean(message.hasAttachments || message.has_attachments),
  };
}

function normalizeTargets(targets = []) {
  const items = normalizeArray(targets, (target) => {
    if (typeof target === "string") {
      const platform = normalizeString(target, 120);
      return platform ? { platform, lane: "manual-handoff", reason: "" } : null;
    }
    const platform = normalizeString(target?.platform, 120);
    if (!platform) return null;
    return {
      platform,
      lane: normalizeString(target?.lane || "manual-handoff", 120) || "manual-handoff",
      reason: normalizeString(target?.reason || "", 320),
    };
  }, 8);
  if (items.length) return items;
  return defaultTargets.map((platform) => ({ platform, lane: "manual-handoff", reason: "" }));
}

function inferTargets(packet) {
  const haystack = [
    packet.mailbox?.googleEmail,
    packet.selection?.label,
    packet.selection?.query,
    packet.notes,
    ...packet.messages.flatMap((message) => [message.subject, message.from, message.to, message.snippet]),
  ].join("\n").toLowerCase();

  const targets = [];
  const add = (platform, lane, reason) => {
    if (targets.some((item) => item.platform === platform)) return;
    targets.push({ platform, lane, reason });
  };

  add("SkyeLeadVault", "crm-intake", "Message selections should be promotable into the shared CRM lane.");
  add("AE-FlowPro", "sales-follow-up", "Mail follow-up should stay attached to a downstream activation lane.");

  if (/\b(route|dispatch|driver|delivery|staff|worker|shift|job)\b/.test(haystack)) {
    add("skyeroutex-workforce-command-v0.4.0", "ops-handoff", "Selected mail indicates staffing, dispatch, or workforce follow-up.");
  }
  if (/\b(proof|audit|invoice|contract|policy|attachment|evidence|compliance)\b/.test(haystack)) {
    add("SkyeProofx", "evidence-review", "Selected mail includes evidence or audit-sensitive follow-up.");
  }
  if (/\b(launch|campaign|website|store|landing|product|menu|brand)\b/.test(haystack)) {
    add("SkyeWebCreatorMax", "launch-build", "Message content suggests storefront, website, or launch follow-through.");
  }
  return targets.slice(0, 6);
}

function buildRecommendedActions(packet) {
  const actions = [];
  const targetNames = packet.downstreamTargets.map((item) => item.platform);
  if (packet.messages.some((message) => message.unread)) {
    actions.push("Clear unread follow-up before closing the handoff packet.");
  }
  if (packet.messages.some((message) => message.hasAttachments)) {
    actions.push("Review attachment-bearing mail for proof, contract, or billing evidence before downstream routing.");
  }
  if (targetNames.includes("SkyeLeadVault")) {
    actions.push("Promote selected contacts or prospects into SkyeLeadVault with the mail packet attached.");
  }
  if (targetNames.includes("AE-FlowPro")) {
    actions.push("Turn this mail selection into an AE-FlowPro activation or recovery handoff.");
  }
  if (targetNames.includes("skyeroutex-workforce-command-v0.4.0")) {
    actions.push("Route the ops-heavy thread set into Workforce Command for dispatch or staffing action.");
  }
  if (targetNames.includes("SkyeProofx")) {
    actions.push("Export or package supporting proof artifacts for SkyeProofx review.");
  }
  return actions.slice(0, 6);
}

function deriveExecutionTargets(packet) {
  return normalizeTargets(packet.downstreamTargets).map((target) => ({
    ...target,
    reason: target.reason || "Execution should continue in the downstream SkyeHands lane tied to this mail packet.",
  }));
}

function primaryTarget(packet) {
  return normalizeTargets(packet?.downstreamTargets || [])[0] || null;
}

function deriveExecutionCheckpoint(packet, execution = {}) {
  return normalizeString(
    execution.checkpoint ||
      packet?.review?.checkpoint ||
      `Ready to route ${primaryTarget(packet)?.platform || "SkyeHands"} follow-through.`,
    180,
  );
}

function deriveExecutionNextAction(packet, execution = {}) {
  return normalizeString(
    execution.nextAction ||
      packet?.review?.notes ||
      packet?.recommendedActions?.[0] ||
      `Assign downstream owner and begin ${primaryTarget(packet)?.platform || "SkyeHands"} follow-through.`,
    240,
  );
}

function deriveDispatchChannel(packet, dispatch = {}) {
  const target = primaryTarget(packet);
  const lane = normalizeString(target?.lane || "", 120).replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").toLowerCase();
  if (dispatch.channel) return normalizeString(dispatch.channel, 120);
  if (target?.platform === "SkyeLeadVault") return "crm_launch_handoff";
  if (target?.platform === "AE-FlowPro") return "activation_follow_through";
  if (target?.platform === "skyeroutex-workforce-command-v0.4.0") return "workforce_dispatch_handoff";
  if (target?.platform === "SkyeProofx") return "proof_review_handoff";
  if (target?.platform === "SkyeWebCreatorMax") return "launch_build_handoff";
  return lane ? `${lane}_handoff` : "downstream_mail_handoff";
}

function deriveDispatchCheckpoint(packet, dispatch = {}, execution = {}) {
  return normalizeString(
    dispatch.checkpoint ||
      execution.checkpoint ||
      `Dispatch approved for ${primaryTarget(packet)?.platform || "downstream delivery"}.`,
    180,
  );
}

function deriveDispatchNextAction(packet, dispatch = {}, execution = {}) {
  return normalizeString(
    dispatch.nextAction ||
      execution.nextAction ||
      packet?.review?.notes ||
      packet?.recommendedActions?.[0] ||
      `Deliver the approved packet into ${primaryTarget(packet)?.platform || "the downstream lane"}.`,
    240,
  );
}

function normalizePacket(packet = {}) {
  const messages = normalizeArray(packet.messages, normalizeMessage, 24);
  const normalized = {
    packetId: normalizeString(packet.packetId, 120) || makeId("mailpack"),
    createdAt: normalizeString(packet.createdAt, 80) || new Date().toISOString(),
    label: normalizeString(packet.label || packet.mailbox?.googleEmail || "Mail handoff packet", 180) || "Mail handoff packet",
    notes: normalizeString(packet.notes, 1200),
    source: normalizeString(packet.source || "SkyeMail", 80) || "SkyeMail",
    mailbox: {
      googleEmail: normalizeString(packet.mailbox?.googleEmail, 200),
      localDemo: Boolean(packet.mailbox?.localDemo),
      connected: packet.mailbox?.connected !== false,
      watchStatus: normalizeString(packet.mailbox?.watchStatus, 80) || "unknown",
    },
    selection: {
      label: normalizeString(packet.selection?.label, 80),
      query: normalizeString(packet.selection?.query, 240),
      messageCount: Number.isFinite(Number(packet.selection?.messageCount)) ? Number(packet.selection.messageCount) : messages.length,
      selectedCount: Number.isFinite(Number(packet.selection?.selectedCount)) ? Number(packet.selection.selectedCount) : messages.length,
    },
    messages,
    draftsSummary: {
      total: Number.isFinite(Number(packet.draftsSummary?.total)) ? Number(packet.draftsSummary.total) : 0,
      latestSubject: normalizeString(packet.draftsSummary?.latestSubject, 240),
    },
    contactsSummary: {
      saved: Number.isFinite(Number(packet.contactsSummary?.saved)) ? Number(packet.contactsSummary.saved) : 0,
      recent: Number.isFinite(Number(packet.contactsSummary?.recent)) ? Number(packet.contactsSummary.recent) : 0,
    },
    downstreamTargets: [],
    review: defaultReviewState(packet.review),
    execution: null,
    dispatch: null,
  };
  normalized.downstreamTargets = normalizeTargets(packet.downstreamTargets?.length ? packet.downstreamTargets : inferTargets(normalized));
  normalized.recommendedActions = buildRecommendedActions(normalized);
  if (packet.execution) normalized.execution = defaultExecutionState(packet.execution, normalized);
  if (packet.dispatch) normalized.dispatch = defaultDispatchState(packet.dispatch, normalized);
  normalized.summary = {
    unreadSelected: normalized.messages.filter((message) => message.unread).length,
    attachmentSelected: normalized.messages.filter((message) => message.hasAttachments).length,
    starredSelected: normalized.messages.filter((message) => message.starred).length,
    targetPlatforms: normalized.downstreamTargets.map((item) => item.platform),
  };
  return normalized;
}

function normalizeWorkflowEvent(event = {}) {
  return {
    eventId: normalizeString(event.eventId, 120) || makeId("mailflow"),
    type: normalizeString(event.type, 80) || "event",
    category: normalizeString(event.category, 40) || classifyWorkflowType(event.type),
    packetId: normalizeString(event.packetId, 120),
    detail: normalizeString(event.detail, 320),
    owner: normalizeString(event.owner, 120),
    status: normalizeString(event.status, 40),
    checkpoint: normalizeString(event.checkpoint, 180),
    channel: normalizeString(event.channel, 120),
    createdAt: normalizeString(event.createdAt, 80) || new Date().toISOString(),
  };
}

function classifyWorkflowType(type = "") {
  if (type === "mail_handoff_packet_archived") return "archive";
  if (type === "mail_handoff_packet_review_updated") return "review";
  if (type === "mail_handoff_packet_execution_updated") return "execution";
  if (type === "mail_handoff_packet_dispatch_updated") return "dispatch";
  return "other";
}

function appendWorkflowEvent(store, event) {
  const nextEvent = normalizeWorkflowEvent(event);
  const workflowEvents = [nextEvent, ...(Array.isArray(store.workflowEvents) ? store.workflowEvents : []).map(normalizeWorkflowEvent)]
    .slice(0, 160);
  return { ...store, workflowEvents };
}

function summarizeWorkflowTimeline(store) {
  const summary = {
    archive: 0,
    review: 0,
    execution: 0,
    dispatch: 0,
    other: 0,
  };
  const items = (Array.isArray(store.workflowEvents) ? store.workflowEvents : []).map(normalizeWorkflowEvent);
  for (const item of items) {
    const category = classifyWorkflowType(item.type);
    if (Object.hasOwn(summary, category)) summary[category] += 1;
    else summary.other += 1;
  }
  return { summary, items, latestEvent: items[0] || null };
}

function summarizeWorkflowBoard(store) {
  const reviewBoard = summarizeReviewBoard(store);
  const executionBoard = summarizeExecutionBoard(store);
  const dispatchBoard = summarizeDispatchBoard(store);
  const workflowTimeline = summarizeWorkflowTimeline(store);
  return {
    archived: store.mailHandoffPackets.length,
    reviewReady: reviewBoard.counts.ready,
    reviewBlocked: reviewBoard.counts.blocked,
    executionActive: executionBoard.counts.active,
    executionQueued: executionBoard.counts.queued,
    dispatchReady: dispatchBoard.counts.ready,
    dispatchQueued: dispatchBoard.counts.queued,
    dispatchSent: dispatchBoard.counts.dispatched,
    latestPacketId: store.mailHandoffPackets[0]?.packetId || null,
    latestEventCategory: workflowTimeline.latestEvent?.category || null,
    latestEventStatus: workflowTimeline.latestEvent?.status || null,
    latestEventAt: workflowTimeline.latestEvent?.createdAt || null,
  };
}

function summarizeReviewBoard(store) {
  const items = store.mailHandoffPackets.map((packet) => ({
    packetId: packet.packetId,
    label: packet.label,
    createdAt: packet.createdAt,
    targetPlatforms: packet.summary?.targetPlatforms || [],
    selectedCount: packet.selection?.selectedCount || 0,
    review: defaultReviewState(packet.review),
  }));
  const counts = {
    total: items.length,
    draft: 0,
    ready: 0,
    approved: 0,
    blocked: 0,
    dispatched: 0,
    unassigned: 0,
  };
  for (const item of items) {
    const status = item.review.status || "draft";
    if (Object.hasOwn(counts, status)) counts[status] += 1;
    if (!item.review.owner) counts.unassigned += 1;
  }
  return { items, counts };
}

function summarizeExecutionBoard(store) {
  const items = store.mailHandoffPackets
    .filter((packet) => packet.execution)
    .map((packet) => ({
      packetId: packet.packetId,
      label: packet.label,
      createdAt: packet.createdAt,
      targetPlatforms: packet.summary?.targetPlatforms || [],
      selectedCount: packet.selection?.selectedCount || 0,
      execution: defaultExecutionState(packet.execution),
    }));
  const counts = {
    total: items.length,
    queued: 0,
    active: 0,
    blocked: 0,
    completed: 0,
    unassigned: 0,
  };
  for (const item of items) {
    const status = item.execution.status || "queued";
    if (Object.hasOwn(counts, status)) counts[status] += 1;
    if (!item.execution.owner) counts.unassigned += 1;
  }
  return { items, counts };
}

function summarizeDispatchBoard(store) {
  const items = store.mailHandoffPackets
    .filter((packet) => packet.dispatch)
    .map((packet) => ({
      packetId: packet.packetId,
      label: packet.label,
      createdAt: packet.createdAt,
      targetPlatforms: packet.summary?.targetPlatforms || [],
      selectedCount: packet.selection?.selectedCount || 0,
      dispatch: defaultDispatchState(packet.dispatch),
    }));
  const counts = {
    total: items.length,
    queued: 0,
    ready: 0,
    dispatched: 0,
    blocked: 0,
    unassigned: 0,
  };
  for (const item of items) {
    const status = item.dispatch.status || "queued";
    if (Object.hasOwn(counts, status)) counts[status] += 1;
    if (!item.dispatch.owner) counts.unassigned += 1;
  }
  return { items, counts };
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
      mailHandoffPackets: Array.isArray(parsed.mailHandoffPackets) ? parsed.mailHandoffPackets.map(normalizePacket) : [],
      workflowEvents: Array.isArray(parsed.workflowEvents) ? parsed.workflowEvents.map(normalizeWorkflowEvent) : [],
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null,
    };
  } catch {
    const reset = defaultStore();
    writeJson(context.storePath, reset);
    return reset;
  }
}

function saveStore(context, store) {
  const next = {
    mailHandoffPackets: Array.isArray(store.mailHandoffPackets) ? store.mailHandoffPackets.map(normalizePacket) : [],
    workflowEvents: Array.isArray(store.workflowEvents) ? store.workflowEvents.map(normalizeWorkflowEvent) : [],
    updatedAt: new Date().toISOString(),
  };
  writeJson(context.storePath, next);
  return next;
}

function summarizeStore(store, context) {
  const latest = store.mailHandoffPackets[0] || null;
  const reviewBoard = summarizeReviewBoard(store);
  const executionBoard = summarizeExecutionBoard(store);
  const dispatchBoard = summarizeDispatchBoard(store);
  const workflowTimeline = summarizeWorkflowTimeline(store);
  return {
    ok: true,
    app: "SkyeMail",
    mode: "same-folder-local-runtime",
    startedAt: context.startedAt,
    dataFile: path.relative(root, context.storePath).replaceAll(path.sep, "/"),
    mailHandoffPackets: {
      total: store.mailHandoffPackets.length,
      latestAt: latest?.createdAt || null,
      latestPacketId: latest?.packetId || null,
      latestTargets: latest?.summary?.targetPlatforms || [],
    },
    reviewBoard: reviewBoard.counts,
    executionBoard: executionBoard.counts,
    dispatchBoard: dispatchBoard.counts,
    workflowTimeline: workflowTimeline.summary,
    workflowBoard: summarizeWorkflowBoard(store),
    latestWorkflowEvent: workflowTimeline.latestEvent,
  };
}

function json(res, status, payload) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
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
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml; charset=utf-8";
    case ".png":
      return "image/png";
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
      "cache-control": "no-store",
    });
    res.end(data);
  } catch (error) {
    if (error.code === "ENOENT") {
      json(res, 404, { ok: false, error: "not-found", path: urlPath, local_demo: true });
      return;
    }
    json(res, 500, { ok: false, error: error.message });
  }
}

export function createSkyeMailLocalRuntime(options = {}) {
  const context = {
    startedAt: new Date().toISOString(),
    storePath: path.resolve(options.storePath || process.env.SKYEMAIL_STORE_PATH || defaultStorePath),
  };

  const server = http.createServer(async (req, res) => {
    const requestUrl = new URL(req.url || "/", "http://127.0.0.1");
    try {
      if (req.method === "GET" && requestUrl.pathname === "/health") {
        const store = loadStore(context);
        json(res, 200, {
          ok: true,
          app: "SkyeMail",
          mode: "same-folder-local-runtime",
          startedAt: context.startedAt,
          routes: ["/health", "/api/runtime/status", "/api/runtime/mail-handoff-packets", "/api/runtime/review-board", "/api/runtime/execution-board", "/api/runtime/dispatch-board", "/api/runtime/workflow-timeline"],
          store: summarizeStore(store, context),
        });
        return;
      }

      if (req.method === "GET" && requestUrl.pathname === "/api/runtime/status") {
        const store = loadStore(context);
        json(res, 200, summarizeStore(store, context));
        return;
      }

      if (req.method === "GET" && requestUrl.pathname === "/api/runtime/mail-handoff-packets") {
        const store = loadStore(context);
        json(res, 200, { ok: true, items: store.mailHandoffPackets, total: store.mailHandoffPackets.length });
        return;
      }

      if (req.method === "GET" && requestUrl.pathname === "/api/runtime/review-board") {
        const store = loadStore(context);
        const board = summarizeReviewBoard(store);
        json(res, 200, { ok: true, ...board });
        return;
      }

      if (req.method === "GET" && requestUrl.pathname === "/api/runtime/execution-board") {
        const store = loadStore(context);
        const board = summarizeExecutionBoard(store);
        json(res, 200, { ok: true, ...board });
        return;
      }

      if (req.method === "GET" && requestUrl.pathname === "/api/runtime/dispatch-board") {
        const store = loadStore(context);
        const board = summarizeDispatchBoard(store);
        json(res, 200, { ok: true, ...board });
        return;
      }

      if (req.method === "GET" && requestUrl.pathname === "/api/runtime/workflow-timeline") {
        const store = loadStore(context);
        const limit = Math.max(1, Math.min(50, Number(requestUrl.searchParams.get("limit") || "20")));
        const timeline = summarizeWorkflowTimeline(store);
        json(res, 200, { ok: true, workflowTimeline: { ...timeline, items: timeline.items.slice(0, limit) } });
        return;
      }

      if (req.method === "POST" && requestUrl.pathname === "/api/runtime/mail-handoff-packets") {
        const body = await readBody(req);
        const packet = normalizePacket(body?.mailHandoffPacket || body);
        if (!packet.messages.length) {
          json(res, 400, { ok: false, error: "mail_handoff_packet_requires_messages" });
          return;
        }
        const store = loadStore(context);
        const next = [packet, ...store.mailHandoffPackets.filter((entry) => entry.packetId !== packet.packetId)].slice(0, 40);
        const withEvent = appendWorkflowEvent({ ...store, mailHandoffPackets: next }, {
          type: "mail_handoff_packet_archived",
          packetId: packet.packetId,
          detail: `Archived mail packet for ${packet.label || packet.mailbox?.googleEmail || "SkyeMail handoff"}`,
          owner: packet.mailbox?.googleEmail || "",
          status: packet.review?.status || "draft",
          checkpoint: "packet_archived",
          channel: "mail_handoff_archive",
        });
        saveStore(context, withEvent);
        json(res, 200, { ok: true, mailHandoffPacket: packet });
        return;
      }

      if (req.method === "GET" && requestUrl.pathname.startsWith("/api/runtime/mail-handoff-packets/")) {
        const packetId = decodeURIComponent(requestUrl.pathname.split("/").pop() || "");
        const store = loadStore(context);
        const packet = store.mailHandoffPackets.find((entry) => entry.packetId === packetId);
        if (!packet) {
          json(res, 404, { ok: false, error: "mail_handoff_packet_not_found", packetId });
          return;
        }
        json(res, 200, { ok: true, mailHandoffPacket: packet });
        return;
      }

      if (req.method === "POST" && requestUrl.pathname.match(/^\/api\/runtime\/mail-handoff-packets\/[^/]+\/review$/)) {
        const parts = requestUrl.pathname.split("/");
        const packetId = decodeURIComponent(parts[parts.length - 2] || "");
        const body = await readBody(req);
        const patch = defaultReviewState(body?.review || body);
        if (!packetId) {
          json(res, 400, { ok: false, error: "mail_handoff_packet_id_required" });
          return;
        }
        const store = loadStore(context);
        const index = store.mailHandoffPackets.findIndex((entry) => entry.packetId === packetId);
        if (index === -1) {
          json(res, 404, { ok: false, error: "mail_handoff_packet_not_found", packetId });
          return;
        }
        const existing = store.mailHandoffPackets[index];
        const nextPacket = normalizePacket({
          ...existing,
          review: {
            ...existing.review,
            ...patch,
            updatedAt: new Date().toISOString(),
          },
        });
        const nextPackets = store.mailHandoffPackets.slice();
        nextPackets[index] = nextPacket;
        const withEvent = appendWorkflowEvent({ ...store, mailHandoffPackets: nextPackets }, {
          type: "mail_handoff_packet_review_updated",
          packetId,
          detail: `Updated review board for ${nextPacket.label || "mail handoff packet"}`,
          owner: nextPacket.review.owner || "",
          status: nextPacket.review.status || "draft",
          checkpoint: nextPacket.review.checkpoint || "",
          channel: "mail_review_board",
        });
        saveStore(context, withEvent);
        const board = summarizeReviewBoard(withEvent);
        json(res, 200, { ok: true, mailHandoffPacket: nextPacket, reviewBoard: board });
        return;
      }

      if (req.method === "POST" && requestUrl.pathname.match(/^\/api\/runtime\/mail-handoff-packets\/[^/]+\/execution$/)) {
        const parts = requestUrl.pathname.split("/");
        const packetId = decodeURIComponent(parts[parts.length - 2] || "");
        const body = await readBody(req);
        const patch = defaultExecutionState(body?.execution || body);
        if (!packetId) {
          json(res, 400, { ok: false, error: "mail_handoff_packet_id_required" });
          return;
        }
        const store = loadStore(context);
        const index = store.mailHandoffPackets.findIndex((entry) => entry.packetId === packetId);
        if (index === -1) {
          json(res, 404, { ok: false, error: "mail_handoff_packet_not_found", packetId });
          return;
        }
        const existing = store.mailHandoffPackets[index];
        const nextPacket = normalizePacket({
          ...existing,
          execution: {
            ...existing.execution,
            ...patch,
            checkpoint: deriveExecutionCheckpoint(existing, patch),
            nextAction: deriveExecutionNextAction(existing, patch),
            targets: deriveExecutionTargets(existing),
            updatedAt: new Date().toISOString(),
          },
        });
        nextPacket.execution.targets = deriveExecutionTargets(nextPacket);
        const nextPackets = store.mailHandoffPackets.slice();
        nextPackets[index] = nextPacket;
        const withEvent = appendWorkflowEvent({ ...store, mailHandoffPackets: nextPackets }, {
          type: "mail_handoff_packet_execution_updated",
          packetId,
          detail: `Updated execution board for ${nextPacket.label || "mail handoff packet"}`,
          owner: nextPacket.execution.owner || "",
          status: nextPacket.execution.status || "queued",
          checkpoint: nextPacket.execution.checkpoint || "",
          channel: "mail_execution_board",
        });
        saveStore(context, withEvent);
        const board = summarizeExecutionBoard(withEvent);
        json(res, 200, { ok: true, mailHandoffPacket: nextPacket, executionBoard: board });
        return;
      }

      if (req.method === "POST" && requestUrl.pathname.match(/^\/api\/runtime\/mail-handoff-packets\/[^/]+\/dispatch$/)) {
        const parts = requestUrl.pathname.split("/");
        const packetId = decodeURIComponent(parts[parts.length - 2] || "");
        const body = await readBody(req);
        const patch = defaultDispatchState(body?.dispatch || body);
        if (!packetId) {
          json(res, 400, { ok: false, error: "mail_handoff_packet_id_required" });
          return;
        }
        const store = loadStore(context);
        const index = store.mailHandoffPackets.findIndex((entry) => entry.packetId === packetId);
        if (index === -1) {
          json(res, 404, { ok: false, error: "mail_handoff_packet_not_found", packetId });
          return;
        }
        const existing = store.mailHandoffPackets[index];
        const nextPacket = normalizePacket({
          ...existing,
          dispatch: {
            ...existing.dispatch,
            ...patch,
            channel: deriveDispatchChannel(existing, patch),
            checkpoint: deriveDispatchCheckpoint(existing, patch, existing.execution || {}),
            nextAction: deriveDispatchNextAction(existing, patch, existing.execution || {}),
            updatedAt: new Date().toISOString(),
          },
        });
        const nextPackets = store.mailHandoffPackets.slice();
        nextPackets[index] = nextPacket;
        const withEvent = appendWorkflowEvent({ ...store, mailHandoffPackets: nextPackets }, {
          type: "mail_handoff_packet_dispatch_updated",
          packetId,
          detail: `Updated dispatch board for ${nextPacket.label || "mail handoff packet"}`,
          owner: nextPacket.dispatch.owner || "",
          status: nextPacket.dispatch.status || "queued",
          checkpoint: nextPacket.dispatch.checkpoint || "",
          channel: nextPacket.dispatch.channel || "downstream_mail_handoff",
        });
        saveStore(context, withEvent);
        const board = summarizeDispatchBoard(withEvent);
        json(res, 200, { ok: true, mailHandoffPacket: nextPacket, dispatchBoard: board });
        return;
      }

      if (requestUrl.pathname.startsWith("/api/")) {
        json(res, 404, { ok: false, error: "not-found", path: requestUrl.pathname });
        return;
      }

      await serveStatic(res, requestUrl.pathname);
    } catch (error) {
      json(res, 500, { ok: false, error: error.message });
    }
  });

  return {
    server,
    context,
    close: () => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number.parseInt(process.env.PORT || "4297", 10);
  const { server, context } = createSkyeMailLocalRuntime();
  server.listen(port, "127.0.0.1", () => {
    console.log(JSON.stringify({
      ok: true,
      app: "SkyeMail",
      mode: "same-folder-local-runtime",
      port,
      dataFile: context.storePath,
    }, null, 2));
  });
}
