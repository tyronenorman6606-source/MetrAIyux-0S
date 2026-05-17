#!/usr/bin/env node
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultStatePath = path.join(root, "runtime/local-state.json");

function json(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(payload, null, 2));
}

function mimeType(filePath) {
  switch (path.extname(filePath)) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
    case ".mjs":
      return "application/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".png":
      return "image/png";
    default:
      return "application/octet-stream";
  }
}

function resolveStaticPath(urlPath) {
  const requestedPath = urlPath === "/" ? "/index.html" : urlPath;
  const normalized = path.normalize(path.join(root, requestedPath));
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
    const stat = await fs.stat(filePath);
    const finalPath = stat.isDirectory() ? path.join(filePath, "index.html") : filePath;
    const data = await fs.readFile(finalPath);
    res.writeHead(200, {
      "content-type": mimeType(finalPath),
      "cache-control": "no-store",
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

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function ensureState(statePath) {
  try {
    const state = JSON.parse(await fs.readFile(statePath, "utf8"));
    return {
      sessions: Array.isArray(state.sessions) ? state.sessions : [],
      handoffPacks: Array.isArray(state.handoffPacks) ? state.handoffPacks : [],
      workflowEvents: Array.isArray(state.workflowEvents) ? state.workflowEvents : [],
      updatedAt: state.updatedAt || null,
    };
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    const emptyState = { sessions: [], handoffPacks: [], workflowEvents: [], updatedAt: null };
    await writeState(statePath, emptyState);
    return emptyState;
  }
}

async function writeState(statePath, state) {
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  await fs.writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function summarizeMessages(messages) {
  return (Array.isArray(messages) ? messages : [])
    .map((message) => String(message?.content || "").trim())
    .filter(Boolean)
    .slice(-3)
    .join("\n\n")
    .slice(0, 1400);
}

function normalizeText(value, max = 480) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, max);
}

function uniqueStrings(values) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => normalizeText(value, 120)).filter(Boolean))];
}

function summarizeAttachments(attachments) {
  return (Array.isArray(attachments) ? attachments : [])
    .map((entry) => {
      const type = normalizeText(entry?.type || "asset", 40);
      const name = normalizeText(entry?.name || "attachment", 120);
      return `${type}:${name}`;
    })
    .filter(Boolean)
    .slice(0, 8);
}

function normalizeReviewStatus(value) {
  const normalized = normalizeText(value, 40).toLowerCase();
  if (["draft", "ready", "approved", "blocked", "dispatched"].includes(normalized)) {
    return normalized;
  }
  return "draft";
}

function normalizeReviewState(review, now = new Date().toISOString()) {
  return {
    status: normalizeReviewStatus(review?.status),
    owner: normalizeText(review?.owner || "", 80),
    checkpoint: normalizeText(review?.checkpoint || "", 160),
    notes: normalizeText(review?.notes || "", 800),
    updatedAt: review?.updatedAt || now,
  };
}

function normalizeExecutionStatus(value) {
  const normalized = normalizeText(value, 40).toLowerCase();
  if (["queued", "active", "blocked", "completed"].includes(normalized)) {
    return normalized;
  }
  return "queued";
}

function normalizeExecutionState(execution, now = new Date().toISOString()) {
  return {
    status: normalizeExecutionStatus(execution?.status),
    owner: normalizeText(execution?.owner || "", 80),
    checkpoint: normalizeText(execution?.checkpoint || "", 160),
    dueAt: normalizeText(execution?.dueAt || "", 80),
    nextAction: normalizeText(execution?.nextAction || "", 240),
    notes: normalizeText(execution?.notes || "", 800),
    updatedAt: execution?.updatedAt || now,
  };
}

function normalizeDispatchStatus(value) {
  const normalized = normalizeText(value, 40).toLowerCase();
  if (["queued", "ready", "active", "blocked", "delivered"].includes(normalized)) {
    return normalized;
  }
  return "queued";
}

function normalizeDispatchState(dispatch, now = new Date().toISOString()) {
  return {
    status: normalizeDispatchStatus(dispatch?.status),
    owner: normalizeText(dispatch?.owner || "", 80),
    checkpoint: normalizeText(dispatch?.checkpoint || "", 160),
    channel: normalizeText(dispatch?.channel || "", 80),
    target: normalizeText(dispatch?.target || "", 120),
    notes: normalizeText(dispatch?.notes || "", 800),
    updatedAt: dispatch?.updatedAt || now,
  };
}

function summarizeWorkflowTimeline(events) {
  return (Array.isArray(events) ? events : []).reduce((counts, entry) => {
    const type = normalizeText(entry?.type || "", 80).toLowerCase();
    if (type === "handoff_pack_archived") counts.archive += 1;
    else if (type === "handoff_pack_review_updated") counts.review += 1;
    else if (type === "handoff_pack_execution_updated") counts.execution += 1;
    else if (type === "handoff_pack_dispatch_updated") counts.dispatch += 1;
    else counts.other += 1;
    return counts;
  }, { archive: 0, review: 0, execution: 0, dispatch: 0, other: 0 });
}

function createWorkflowEvent(type, pack, detail, extra = {}) {
  return {
    eventId: `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    detail: normalizeText(detail, 240),
    createdAt: new Date().toISOString(),
    handoffPackId: pack?.handoffPackId || null,
    title: normalizeText(pack?.title || "", 120),
    owner: normalizeText(extra.owner || "", 80),
    status: normalizeText(extra.status || "", 80),
    checkpoint: normalizeText(extra.checkpoint || "", 160),
    channel: normalizeText(extra.channel || "", 80),
    target: normalizeText(extra.target || "", 120),
  };
}

function deriveTargets(requestedTargets, session, pack) {
  const requested = uniqueStrings(requestedTargets).map((target) => target.toLowerCase());
  const haystack = [
    session?.promptExcerpt,
    session?.outputExcerpt,
    pack?.title,
    pack?.notes,
    pack?.canvasExcerpt,
  ]
    .map((value) => String(value || "").toLowerCase())
    .join("\n");

  const wantsLead = requested.includes("skyeleadvault")
    || /lead|crm|prospect|client|pipeline|onboard/.test(haystack);
  const wantsWeb = requested.includes("skyewebcreatormax")
    || /website|landing|storefront|brand|site|page/.test(haystack);
  const wantsOps = requested.includes("skyeroutex-workforce-command-v0.4.0")
    || requested.includes("workforce")
    || /dispatch|job|staff|shift|route|operator|workforce/.test(haystack);
  const wantsFlow = requested.includes("ae-flowpro")
    || /follow.?up|handoff|recovery|activation|sequence|campaign/.test(haystack);

  const targets = [];
  if (wantsLead) {
    targets.push({
      platform: "SkyeLeadVault",
      lane: "crm-intake",
      reason: "Research pack contains lead or client-oriented intake signals.",
    });
  }
  if (wantsWeb) {
    targets.push({
      platform: "SkyeWebCreatorMax",
      lane: "site-brief",
      reason: "Research pack contains site, storefront, or brand build direction.",
    });
  }
  if (wantsOps) {
    targets.push({
      platform: "skyeroutex-workforce-command-v0.4.0",
      lane: "ops-handoff",
      reason: "Research pack contains workforce, route, dispatch, or operator signals.",
    });
  }
  if (wantsFlow) {
    targets.push({
      platform: "AE-FlowPro",
      lane: "activation-pack",
      reason: "Research pack contains follow-up, recovery, or activation workflow cues.",
    });
  }
  if (!targets.length) {
    targets.push({
      platform: "SkyeHands",
      lane: "manual-triage",
      reason: "No specialized downstream lane was confidently inferred from the workspace snapshot.",
    });
  }
  return targets;
}

function buildHandoffPack(body, session) {
  const requestedPack = body && typeof body.handoffPack === "object" ? body.handoffPack : body;
  const title = normalizeText(requestedPack?.title || session?.promptExcerpt || "Neural handoff pack", 120);
  const notes = normalizeText(requestedPack?.notes || "", 800);
  const canvasExcerpt = normalizeText(requestedPack?.canvasExcerpt || "", 600);
  const attachmentSummary = summarizeAttachments(requestedPack?.attachments);
  const pack = {
    handoffPackId: `handoff_${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    source: "NeuralSpacePro",
    status: "archived-local",
    title,
    notes,
    sessionId: session?.sessionId || null,
    workspace: {
      promptExcerpt: normalizeText(session?.promptExcerpt || requestedPack?.promptExcerpt || "", 280),
      outputExcerpt: normalizeText(session?.outputExcerpt || requestedPack?.outputExcerpt || "", 280),
      canvasExcerpt,
      attachmentSummary,
      attachmentCount: attachmentSummary.length,
    },
  };
  pack.recommendedTargets = deriveTargets(requestedPack?.requestedTargets, session, {
    title: pack.title,
    notes: pack.notes,
    canvasExcerpt: pack.workspace.canvasExcerpt,
  });
  pack.handoffSummary = {
    sessionArchiveLane: pack.sessionId ? `/v1/sessions/${encodeURIComponent(pack.sessionId)}` : null,
    targetCount: pack.recommendedTargets.length,
    targetPlatforms: pack.recommendedTargets.map((target) => target.platform),
    canvasCaptured: Boolean(pack.workspace.canvasExcerpt),
    notesCaptured: Boolean(pack.notes),
  };
  pack.review = normalizeReviewState({ status: "draft" }, pack.createdAt);
  return pack;
}

function summarizeState(state) {
  const sessions = Array.isArray(state.sessions) ? state.sessions : [];
  const latestSession = sessions.length ? sessions[sessions.length - 1] : null;
  const handoffPacks = Array.isArray(state.handoffPacks) ? state.handoffPacks : [];
  const latestHandoffPack = handoffPacks.length ? handoffPacks[handoffPacks.length - 1] : null;
  const messageCountTotal = sessions.reduce((total, session) => total + Number(session.messageCount || 0), 0);
  const reviewCounts = handoffPacks.reduce((counts, pack) => {
    const status = normalizeReviewStatus(pack?.review?.status);
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, { draft: 0, ready: 0, approved: 0, blocked: 0, dispatched: 0 });
  const executionBoard = handoffPacks.reduce((counts, pack) => {
    if (!pack?.execution) return counts;
    const status = normalizeExecutionStatus(pack.execution.status);
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, { queued: 0, active: 0, blocked: 0, completed: 0 });
  const dispatchBoard = handoffPacks.reduce((counts, pack) => {
    if (!pack?.dispatch) return counts;
    const status = normalizeDispatchStatus(pack.dispatch.status);
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, { queued: 0, ready: 0, active: 0, blocked: 0, delivered: 0 });
  const workflowTimeline = summarizeWorkflowTimeline(state.workflowEvents);
  return {
    sessionCount: sessions.length,
    messageCountTotal,
    latestSessionId: latestSession?.sessionId || null,
    latestRecordedAt: latestSession?.recordedAt || null,
    distinctModels: [...new Set(sessions.map((session) => session.model).filter(Boolean))],
    handoffPackCount: handoffPacks.length,
    latestHandoffPackId: latestHandoffPack?.handoffPackId || null,
    reviewBoard: reviewCounts,
    executionBoard,
    dispatchBoard,
    workflowTimeline,
  };
}

export async function createNeuralSpaceProLocalGateway(options = {}) {
  const startedAt = new Date().toISOString();
  const statePath = path.resolve(options.statePath || process.env.NEURAL_SPACE_PRO_STATE_PATH || defaultStatePath);
  const server = http.createServer(async (req, res) => {
    const requestUrl = new URL(req.url || "/", "http://127.0.0.1");
    try {
      if (req.method === "GET" && requestUrl.pathname === "/health") {
        const state = await ensureState(statePath);
        const summary = summarizeState(state);
        json(res, 200, {
          ok: true,
          app: "NeuralSpacePro",
          mode: "local-proof-harness",
          startedAt,
          sessionCount: state.sessions.length,
          summary,
          routes: ["/health", "/.netlify/functions/gateway-chat", "/v1/runtime-summary", "/v1/sessions", "/v1/handoff-packs", "/v1/review-board", "/v1/execution-board", "/v1/dispatch-board", "/v1/workflow-timeline"],
        });
        return;
      }

      if (req.method === "GET" && requestUrl.pathname === "/v1/runtime-summary") {
        const state = await ensureState(statePath);
        json(res, 200, {
          ok: true,
          mode: "local-proof-harness",
          statePath,
          summary: summarizeState(state),
        });
        return;
      }

      if (req.method === "GET" && requestUrl.pathname === "/v1/sessions") {
        const state = await ensureState(statePath);
        json(res, 200, {
          ok: true,
          mode: "local-proof-harness",
          totalSessions: state.sessions.length,
          sessions: state.sessions,
        });
        return;
      }

      if (req.method === "GET" && requestUrl.pathname === "/v1/handoff-packs") {
        const state = await ensureState(statePath);
        json(res, 200, {
          ok: true,
          mode: "local-proof-harness",
          totalHandoffPacks: state.handoffPacks.length,
          handoffPacks: state.handoffPacks,
        });
        return;
      }

      if (req.method === "GET" && requestUrl.pathname === "/v1/review-board") {
        const state = await ensureState(statePath);
        const summary = summarizeState(state);
        json(res, 200, {
          ok: true,
          mode: "local-proof-harness",
          counts: summary.reviewBoard,
          totalHandoffPacks: state.handoffPacks.length,
          latestHandoffPackId: summary.latestHandoffPackId,
          queue: state.handoffPacks.slice(-10).reverse().map((pack) => ({
            handoffPackId: pack.handoffPackId,
            title: pack.title,
            sessionId: pack.sessionId,
            targetPlatforms: pack.handoffSummary?.targetPlatforms || [],
            review: normalizeReviewState(pack.review, pack.createdAt),
            createdAt: pack.createdAt,
          })),
        });
        return;
      }

      if (req.method === "GET" && requestUrl.pathname === "/v1/execution-board") {
        const state = await ensureState(statePath);
        const summary = summarizeState(state);
        const queue = state.handoffPacks
          .filter((pack) => pack?.execution)
          .slice(-10)
          .reverse()
          .map((pack) => ({
            handoffPackId: pack.handoffPackId,
            title: pack.title,
            sessionId: pack.sessionId,
            targetPlatforms: pack.handoffSummary?.targetPlatforms || [],
            review: normalizeReviewState(pack.review, pack.createdAt),
            execution: normalizeExecutionState(pack.execution, pack.createdAt),
            createdAt: pack.createdAt,
          }));
        json(res, 200, {
          ok: true,
          mode: "local-proof-harness",
          counts: summary.executionBoard,
          totalExecutionItems: queue.length,
          latestHandoffPackId: summary.latestHandoffPackId,
          queue,
        });
        return;
      }

      if (req.method === "GET" && requestUrl.pathname === "/v1/dispatch-board") {
        const state = await ensureState(statePath);
        const summary = summarizeState(state);
        const queue = state.handoffPacks
          .filter((pack) => pack?.dispatch)
          .slice(-10)
          .reverse()
          .map((pack) => ({
            handoffPackId: pack.handoffPackId,
            title: pack.title,
            sessionId: pack.sessionId,
            targetPlatforms: pack.handoffSummary?.targetPlatforms || [],
            review: normalizeReviewState(pack.review, pack.createdAt),
            execution: normalizeExecutionState(pack.execution, pack.createdAt),
            dispatch: normalizeDispatchState(pack.dispatch, pack.createdAt),
            createdAt: pack.createdAt,
          }));
        json(res, 200, {
          ok: true,
          mode: "local-proof-harness",
          counts: summary.dispatchBoard,
          totalDispatchItems: queue.length,
          latestHandoffPackId: summary.latestHandoffPackId,
          queue,
        });
        return;
      }

      if (req.method === "GET" && requestUrl.pathname === "/v1/workflow-timeline") {
        const state = await ensureState(statePath);
        const limit = Math.max(1, Math.min(50, Number(requestUrl.searchParams.get("limit") || 20)));
        const events = Array.isArray(state.workflowEvents) ? state.workflowEvents.slice(0, limit) : [];
        json(res, 200, {
          ok: true,
          mode: "local-proof-harness",
          summary: summarizeWorkflowTimeline(state.workflowEvents),
          totalEvents: Array.isArray(state.workflowEvents) ? state.workflowEvents.length : 0,
          events,
        });
        return;
      }

      if (req.method === "GET" && requestUrl.pathname.startsWith("/v1/sessions/")) {
        const state = await ensureState(statePath);
        const sessionId = decodeURIComponent(requestUrl.pathname.slice("/v1/sessions/".length));
        const session = state.sessions.find((entry) => entry.sessionId === sessionId);
        if (!session) {
          json(res, 404, { ok: false, error: "session-not-found", sessionId });
          return;
        }
        json(res, 200, {
          ok: true,
          mode: "local-proof-harness",
          session,
        });
        return;
      }

      if (req.method === "GET" && requestUrl.pathname.startsWith("/v1/handoff-packs/")) {
        const state = await ensureState(statePath);
        const handoffPackId = decodeURIComponent(requestUrl.pathname.slice("/v1/handoff-packs/".length));
        const handoffPack = state.handoffPacks.find((entry) => entry.handoffPackId === handoffPackId);
        if (!handoffPack) {
          json(res, 404, { ok: false, error: "handoff-pack-not-found", handoffPackId });
          return;
        }
        json(res, 200, {
          ok: true,
          mode: "local-proof-harness",
          handoffPack,
        });
        return;
      }

      if (req.method === "POST" && requestUrl.pathname === "/.netlify/functions/gateway-chat") {
        const body = await readBody(req);
        const summary = summarizeMessages(body.messages);
        if (!summary) {
          json(res, 400, { ok: false, error: "messages-required" });
          return;
        }
        const outputText = [
          "Local proof harness response.",
          "This folder proves same-origin chat route wiring without claiming live provider execution.",
          "",
          "Recent prompt context:",
          summary,
        ].join("\n");
        const state = await ensureState(statePath);
        const session = {
          sessionId: `sess_${Date.now().toString(36)}`,
          recordedAt: new Date().toISOString(),
          model: "deterministic-workspace-echo",
          promptExcerpt: summary.slice(0, 240),
          outputExcerpt: outputText.slice(0, 240),
          messageCount: Array.isArray(body.messages) ? body.messages.length : 0,
        };
        await writeState(statePath, {
          sessions: [...state.sessions, session].slice(-25),
          handoffPacks: state.handoffPacks,
          workflowEvents: state.workflowEvents,
          updatedAt: session.recordedAt,
        });
        json(res, 200, {
          ok: true,
          mode: "local-proof-harness",
          provider: "local-proof-harness",
          model: "deterministic-workspace-echo",
          sessionId: session.sessionId,
          sessionCount: state.sessions.length + 1,
          output_text: outputText,
        });
        return;
      }

      if (req.method === "POST" && requestUrl.pathname === "/v1/handoff-packs") {
        const body = await readBody(req);
        const state = await ensureState(statePath);
        const sessionId = normalizeText(body?.sessionId || body?.handoffPack?.sessionId, 120);
        const session = sessionId ? state.sessions.find((entry) => entry.sessionId === sessionId) : null;
        if (sessionId && !session) {
          json(res, 404, { ok: false, error: "session-not-found", sessionId });
          return;
        }
        const handoffPack = buildHandoffPack(body, session);
        const workflowEvent = createWorkflowEvent(
          "handoff_pack_archived",
          handoffPack,
          `Archived ${handoffPack.title || "handoff pack"} from NeuralSpacePro research session.`,
          {
            status: handoffPack.status,
            checkpoint: "archive_created",
          },
        );
        await writeState(statePath, {
          sessions: state.sessions,
          handoffPacks: [...state.handoffPacks, handoffPack].slice(-40),
          workflowEvents: [workflowEvent, ...state.workflowEvents].slice(0, 120),
          updatedAt: handoffPack.createdAt,
        });
        json(res, 201, {
          ok: true,
          mode: "local-proof-harness",
          handoffPack,
        });
        return;
      }

      if (req.method === "POST" && /^\/v1\/handoff-packs\/[^/]+\/review$/.test(requestUrl.pathname)) {
        const state = await ensureState(statePath);
        const handoffPackId = decodeURIComponent(requestUrl.pathname.slice("/v1/handoff-packs/".length, -"/review".length));
        const body = await readBody(req);
        const reviewPatch = body && typeof body.review === "object" ? body.review : body;
        const index = state.handoffPacks.findIndex((entry) => entry.handoffPackId === handoffPackId);
        if (index === -1) {
          json(res, 404, { ok: false, error: "handoff-pack-not-found", handoffPackId });
          return;
        }
        const current = state.handoffPacks[index];
        const updatedReview = normalizeReviewState({
          ...current.review,
          ...reviewPatch,
          updatedAt: new Date().toISOString(),
        });
        const updatedPack = {
          ...current,
          review: updatedReview,
        };
        const nextPacks = [...state.handoffPacks];
        nextPacks[index] = updatedPack;
        const workflowEvent = createWorkflowEvent(
          "handoff_pack_review_updated",
          updatedPack,
          `Review set to ${updatedReview.status} for ${updatedPack.title || handoffPackId}.`,
          {
            owner: updatedReview.owner,
            status: updatedReview.status,
            checkpoint: updatedReview.checkpoint,
          },
        );
        await writeState(statePath, {
          sessions: state.sessions,
          handoffPacks: nextPacks,
          workflowEvents: [workflowEvent, ...state.workflowEvents].slice(0, 120),
          updatedAt: updatedReview.updatedAt,
        });
        json(res, 200, {
          ok: true,
          mode: "local-proof-harness",
          handoffPack: updatedPack,
          counts: summarizeState({ ...state, handoffPacks: nextPacks }).reviewBoard,
        });
        return;
      }

      if (req.method === "POST" && /^\/v1\/handoff-packs\/[^/]+\/execution$/.test(requestUrl.pathname)) {
        const state = await ensureState(statePath);
        const handoffPackId = decodeURIComponent(requestUrl.pathname.slice("/v1/handoff-packs/".length, -"/execution".length));
        const body = await readBody(req);
        const executionPatch = body && typeof body.execution === "object" ? body.execution : body;
        const index = state.handoffPacks.findIndex((entry) => entry.handoffPackId === handoffPackId);
        if (index === -1) {
          json(res, 404, { ok: false, error: "handoff-pack-not-found", handoffPackId });
          return;
        }
        const current = state.handoffPacks[index];
        const updatedExecution = normalizeExecutionState({
          ...current.execution,
          ...executionPatch,
          updatedAt: new Date().toISOString(),
        });
        const updatedPack = {
          ...current,
          execution: updatedExecution,
        };
        const nextPacks = [...state.handoffPacks];
        nextPacks[index] = updatedPack;
        const workflowEvent = createWorkflowEvent(
          "handoff_pack_execution_updated",
          updatedPack,
          `Execution set to ${updatedExecution.status} for ${updatedPack.title || handoffPackId}.`,
          {
            owner: updatedExecution.owner,
            status: updatedExecution.status,
            checkpoint: updatedExecution.checkpoint,
          },
        );
        await writeState(statePath, {
          sessions: state.sessions,
          handoffPacks: nextPacks,
          workflowEvents: [workflowEvent, ...state.workflowEvents].slice(0, 120),
          updatedAt: updatedExecution.updatedAt,
        });
        json(res, 200, {
          ok: true,
          mode: "local-proof-harness",
          handoffPack: updatedPack,
          counts: summarizeState({ ...state, handoffPacks: nextPacks }).executionBoard,
        });
        return;
      }

      if (req.method === "POST" && /^\/v1\/handoff-packs\/[^/]+\/dispatch$/.test(requestUrl.pathname)) {
        const state = await ensureState(statePath);
        const handoffPackId = decodeURIComponent(requestUrl.pathname.slice("/v1/handoff-packs/".length, -"/dispatch".length));
        const body = await readBody(req);
        const dispatchPatch = body && typeof body.dispatch === "object" ? body.dispatch : body;
        const index = state.handoffPacks.findIndex((entry) => entry.handoffPackId === handoffPackId);
        if (index === -1) {
          json(res, 404, { ok: false, error: "handoff-pack-not-found", handoffPackId });
          return;
        }
        const current = state.handoffPacks[index];
        const fallbackTarget = Array.isArray(current?.handoffSummary?.targetPlatforms) ? current.handoffSummary.targetPlatforms[0] : "";
        const updatedDispatch = normalizeDispatchState({
          ...current.dispatch,
          ...dispatchPatch,
          target: dispatchPatch?.target || current?.dispatch?.target || fallbackTarget || "SkyeHands",
          channel: dispatchPatch?.channel || current?.dispatch?.channel || "handoff",
          updatedAt: new Date().toISOString(),
        });
        const updatedPack = {
          ...current,
          dispatch: updatedDispatch,
        };
        const nextPacks = [...state.handoffPacks];
        nextPacks[index] = updatedPack;
        const workflowEvent = createWorkflowEvent(
          "handoff_pack_dispatch_updated",
          updatedPack,
          `Dispatch set to ${updatedDispatch.status} for ${updatedPack.title || handoffPackId}.`,
          {
            owner: updatedDispatch.owner,
            status: updatedDispatch.status,
            checkpoint: updatedDispatch.checkpoint,
            channel: updatedDispatch.channel,
            target: updatedDispatch.target,
          },
        );
        await writeState(statePath, {
          sessions: state.sessions,
          handoffPacks: nextPacks,
          workflowEvents: [workflowEvent, ...state.workflowEvents].slice(0, 120),
          updatedAt: updatedDispatch.updatedAt,
        });
        json(res, 200, {
          ok: true,
          mode: "local-proof-harness",
          handoffPack: updatedPack,
          counts: summarizeState({ ...state, handoffPacks: nextPacks, workflowEvents: [workflowEvent, ...state.workflowEvents] }).dispatchBoard,
        });
        return;
      }

      await serveStatic(res, requestUrl.pathname);
    } catch (error) {
      if (error instanceof SyntaxError) {
        json(res, 400, { ok: false, error: "invalid-json-body" });
        return;
      }
      json(res, 500, { ok: false, error: error.message });
    }
  });

  return { server, startedAt, statePath };
}

const isEntrypoint = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isEntrypoint) {
  const host = process.env.NEURAL_SPACE_PRO_HOST || "127.0.0.1";
  const port = Number(process.env.NEURAL_SPACE_PRO_PORT || "8787");
  const { server, startedAt, statePath } = await createNeuralSpaceProLocalGateway();
  server.listen(port, host, () => {
    const address = server.address();
    const resolvedPort = typeof address === "object" && address ? address.port : port;
    console.log(JSON.stringify({
      ok: true,
      app: "NeuralSpacePro",
      mode: "local-proof-harness",
      url: `http://${host}:${resolvedPort}`,
      startedAt,
      statePath,
    }));
  });
}
