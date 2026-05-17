#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultStatePath = path.join(root, "runtime/local-worker-state.json");
const defaultOutputDir = path.join(root, "runtime/output");

function makeId(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

function nowIso() {
  return new Date().toISOString();
}

function json(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(payload, null, 2));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function ensureState(statePath) {
  try {
    return JSON.parse(await fs.readFile(statePath, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    const emptyState = { sessions: [], projects: [], queue: [], handoffPacks: [], events: [], updatedAt: null };
    await writeState(statePath, emptyState);
    return emptyState;
  }
}

async function writeState(statePath, state) {
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  await fs.writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function computeQualityScore(brief) {
  const words = brief.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(72, Math.min(96, 68 + Math.min(words, 28)));
}

function unauthorized(res) {
  json(res, 401, { ok: false, error: "unauthorized" });
}

function requireSecret(req, res, workerSecret) {
  if (!workerSecret) return true;
  if (req.headers["x-worker-secret"] === workerSecret) return true;
  unauthorized(res);
  return false;
}

async function createProjectArtifacts(outputDir, project, event) {
  const artifactDir = path.join(outputDir, project.id);
  const relArtifactDir = path.relative(root, artifactDir).replaceAll(path.sep, "/runtime/standalone-apps/NeuralSpacePro/");
  const files = ["project.json", "brief.md", "build-summary.json"];

  await fs.mkdir(artifactDir, { recursive: true });
  await fs.writeFile(path.join(artifactDir, "project.json"), `${JSON.stringify(project, null, 2)}\n`, "utf8");
  await fs.writeFile(path.join(artifactDir, "brief.md"), `# ${project.siteName}\n\n${project.brief}\n`, "utf8");
  await fs.writeFile(path.join(artifactDir, "build-summary.json"), `${JSON.stringify({
    workerMode: "local-proof-harness",
    generatedAt: project.generatedAt,
    projectId: project.id,
    queueEventId: event.eventId,
    note: "This local worker proves the build contract and writes local artifacts only.",
  }, null, 2)}\n`, "utf8");

  return { artifactDir, relArtifactDir, files };
}

async function listProjectArtifacts(outputDir, projectId) {
  const artifactDir = path.join(outputDir, projectId);
  try {
    const entries = await fs.readdir(artifactDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .sort();
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function resolveArtifactPath(baseDir, projectId, fileName) {
  const projectDir = path.normalize(path.join(baseDir, projectId));
  const artifactPath = path.normalize(path.join(projectDir, fileName));
  if (!artifactPath.startsWith(projectDir)) return null;
  return artifactPath;
}

function normalizeState(state) {
  return {
    sessions: Array.isArray(state.sessions) ? state.sessions : [],
    projects: Array.isArray(state.projects) ? state.projects : [],
    queue: Array.isArray(state.queue) ? state.queue : [],
    handoffPacks: Array.isArray(state.handoffPacks) ? state.handoffPacks : [],
    events: Array.isArray(state.events) ? state.events : [],
    updatedAt: state.updatedAt || null,
  };
}

function summarizeMessages(messages) {
  return (Array.isArray(messages) ? messages : [])
    .map((message) => String(message?.content || "").trim())
    .filter(Boolean)
    .slice(-3)
    .join("\n\n")
    .slice(0, 1400);
}

function summarizeRuntime(state = {}) {
  const sessions = Array.isArray(state.sessions) ? state.sessions : [];
  const handoffPacks = Array.isArray(state.handoffPacks) ? state.handoffPacks : [];
  const projects = Array.isArray(state.projects) ? state.projects : [];
  const queue = Array.isArray(state.queue) ? state.queue : [];
  const latestSession = sessions.length ? sessions[sessions.length - 1] : null;
  return {
    sessionCount: sessions.length,
    projectCount: projects.length,
    queueDepth: queue.length,
    handoffPackCount: handoffPacks.length,
    latestSessionId: latestSession?.sessionId || null,
    latestRecordedAt: latestSession?.recordedAt || null,
    messageCountTotal: sessions.reduce((total, session) => total + Number(session.messageCount || 0), 0),
  };
}

function summarizeBoard(handoffPacks = [], field, statuses = []) {
  const items = handoffPacks.filter((item) => item && item[field]);
  const summary = {
    total: items.length,
    unassigned: items.filter((item) => !item[field]?.owner).length,
  };
  for (const status of statuses) {
    summary[status] = items.filter((item) => item[field]?.status === status).length;
  }
  return summary;
}

function summarizeTimeline(events = []) {
  const relevant = events.filter((event) => typeof event?.type === "string" && event.type.startsWith("skydexia."));
  const summary = {
    total: relevant.length,
    handoff: 0,
    review: 0,
    execution: 0,
    dispatch: 0,
  };
  const timeline = relevant.slice(0, 40).map((event) => {
    const payload = event.payload && typeof event.payload === "object" ? event.payload : {};
    const category = event.type.split(".").slice(-1)[0] || "activity";
    if (Object.hasOwn(summary, category)) summary[category] += 1;
    return {
      id: event.id,
      type: event.type,
      category,
      at: event.createdAt,
      handoffPackId: payload.handoffPackId || "",
      projectId: payload.projectId || "",
      owner: payload.owner || "",
      status: payload.status || "",
      checkpoint: payload.checkpoint || "",
      channel: payload.channel || "",
      routeTo: Array.isArray(payload.routeTo) ? payload.routeTo : [],
      note: payload.note || "",
      label: payload.label || "",
    };
  });
  return { summary, timeline };
}

function emitEvent(state, type, payload = {}) {
  state.events.unshift({
    id: makeId("evt"),
    type,
    createdAt: nowIso(),
    payload,
  });
  state.events = state.events.slice(0, 200);
}

function normalizeReviewUpdate(body = {}, existing = {}) {
  return {
    id: existing.id || makeId("review"),
    owner: String(body.owner || existing.owner || "").trim(),
    status: String(body.status || existing.status || "queued").trim() || "queued",
    checkpoint: String(body.checkpoint || existing.checkpoint || "artifact_review").trim() || "artifact_review",
    notes: String(body.notes || existing.notes || "").trim(),
    updatedAt: nowIso(),
    createdAt: existing.createdAt || nowIso(),
  };
}

function normalizeExecutionUpdate(body = {}, existing = {}, handoffPack = {}) {
  return {
    id: existing.id || makeId("execution"),
    owner: String(body.owner || existing.owner || "").trim(),
    status: String(body.status || existing.status || "queued").trim() || "queued",
    checkpoint: String(body.checkpoint || existing.checkpoint || "activation_ready").trim() || "activation_ready",
    nextAction: String(body.nextAction || existing.nextAction || "").trim(),
    notes: String(body.notes || existing.notes || "").trim(),
    targets: Array.isArray(body.targets)
      ? body.targets.map((item) => String(item || "").trim()).filter(Boolean)
      : (existing.targets || handoffPack.downstreamTargets || []),
    updatedAt: nowIso(),
    createdAt: existing.createdAt || nowIso(),
  };
}

function normalizeDispatchUpdate(body = {}, existing = {}, handoffPack = {}) {
  return {
    id: existing.id || makeId("dispatch"),
    owner: String(body.owner || existing.owner || "").trim(),
    status: String(body.status || existing.status || "queued").trim() || "queued",
    checkpoint: String(body.checkpoint || existing.checkpoint || "operator_routing").trim() || "operator_routing",
    channel: String(body.channel || existing.channel || "operator-queue").trim() || "operator-queue",
    routeTo: Array.isArray(body.routeTo)
      ? body.routeTo.map((item) => String(item || "").trim()).filter(Boolean)
      : (existing.routeTo || handoffPack.downstreamTargets || []),
    nextAction: String(body.nextAction || existing.nextAction || "").trim(),
    notes: String(body.notes || existing.notes || "").trim(),
    updatedAt: nowIso(),
    createdAt: existing.createdAt || nowIso(),
  };
}

function inferTargets(project = {}, files = []) {
  const text = `${project.siteName || ""} ${project.name || ""} ${project.brief || ""}`.toLowerCase();
  const targets = new Set(["SkyeWebCreatorMax", "AE-FlowPro"]);
  if (files.includes("build-summary.json")) targets.add("SkyeProofx");
  if (/(lead|crm|prospect|client|pipeline|onboard)/.test(text)) {
    targets.add("SkyeLeadVault");
  }
  if (/(team|operator|workflow|dispatch|workforce|crm|lead)/.test(text)) {
    targets.add("skyeroutex-workforce-command-v0.4.0");
  }
  if (/(store|shop|product|menu|restaurant|order|commerce)/.test(text)) {
    targets.add("MaggiesStore");
  }
  return [...targets];
}

function deriveFollowUpActions(project = {}, targets = []) {
  const actions = [
    `Review generated artifacts for ${project.siteName || project.name || project.id}.`,
    "Confirm tenant routing and actor ownership before downstream delivery.",
  ];
  if (targets.includes("SkyeWebCreatorMax")) {
    actions.push("Promote approved layout and content patterns into SkyeWebCreatorMax.");
  }
  if (targets.includes("AE-FlowPro")) {
    actions.push("Create an activation or revenue follow-up lane in AE-FlowPro.");
  }
  if (targets.includes("SkyeLeadVault")) {
    actions.push("Push approved lead or CRM context into SkyeLeadVault for intake and follow-up.");
  }
  if (targets.includes("skyeroutex-workforce-command-v0.4.0")) {
    actions.push("Queue workforce/operator execution steps for fulfillment and dispatch.");
  }
  if (targets.includes("MaggiesStore")) {
    actions.push("Align storefront or ordering requirements with the commerce lane.");
  }
  if (targets.includes("SkyeProofx")) {
    actions.push("Archive proof artifacts for downstream audit and evidence export.");
  }
  return actions;
}

function buildHandoffPack({ project, files, body }) {
  const selectedTargets = Array.isArray(body.targets)
    ? body.targets.map((value) => String(value || "").trim()).filter(Boolean)
    : [];
  const targets = selectedTargets.length ? [...new Set(selectedTargets)] : inferTargets(project, files);
  const qualityScore = project.qualityResult?.score || project.quality || null;
  return {
    id: makeId("handoff"),
    createdAt: new Date().toISOString(),
    sourceProjectId: project.id,
    label: String(body.label || `${project.siteName || project.name || project.id} Handoff`).trim(),
    notes: String(body.notes || "").trim(),
    project: {
      id: project.id,
      siteName: project.siteName || project.name || "Untitled Site",
      tenantId: project.tenantId || "ae-commandhub",
      actorId: project.actorId || "neural-space-pro",
      status: project.status || "local-proof-generated",
      generatedAt: project.generatedAt || null,
      qualityScore,
      artifactsDir: project.artifactsDir || "",
      fileCount: files.length,
    },
    artifactFiles: files,
    downstreamTargets: targets,
    followUpActions: deriveFollowUpActions(project, targets),
    summary: {
      qualityScore,
      hasBuildSummary: files.includes("build-summary.json"),
      hasProjectSnapshot: files.includes("project.json"),
      hasBrief: files.includes("brief.md"),
    },
  };
}

export async function createSkyeDexiaLocalWorker(options = {}) {
  const context = {
    statePath: path.resolve(options.statePath || defaultStatePath),
    outputDir: path.resolve(options.outputDir || defaultOutputDir),
    workerSecret: options.workerSecret ?? process.env.SKYDEXIA_WORKER_SECRET ?? "",
    startedAt: new Date().toISOString(),
  };

  const server = http.createServer(async (req, res) => {
    const requestUrl = new URL(req.url || "/runtime/standalone-apps/NeuralSpacePro/", "http://127.0.0.1");
    const routePath = requestUrl.pathname.startsWith("/runtime/standalone-apps/NeuralSpacePro")
      ? requestUrl.pathname
      : `/runtime/standalone-apps/NeuralSpacePro${requestUrl.pathname === "/" ? "" : requestUrl.pathname}`;

    try {
      if (!requireSecret(req, res, context.workerSecret)) return;

      if (req.method === "GET" && routePath === "/runtime/standalone-apps/NeuralSpacePro/health") {
        const state = normalizeState(await ensureState(context.statePath));
        const uptime = Math.floor((Date.now() - Date.parse(context.startedAt)) / 1000);
        json(res, 200, {
          ok: true,
          mode: "local-proof-harness",
          uptime,
          runtimeSummary: summarizeRuntime(state),
          projectCount: state.projects.length,
          queueDepth: state.queue.length,
          handoffPackCount: state.handoffPacks.length,
          reviewBoard: summarizeBoard(state.handoffPacks, "review", ["queued", "approved", "blocked"]),
          executionBoard: summarizeBoard(state.handoffPacks, "execution", ["queued", "active", "blocked", "completed"]),
          dispatchBoard: summarizeBoard(state.handoffPacks, "dispatch", ["queued", "routing", "dispatched", "blocked"]),
          workflowTimeline: summarizeTimeline(state.events).summary,
        });
        return;
      }

      if (req.method === "GET" && routePath === "/runtime/standalone-apps/NeuralSpacePro/status") {
        const state = normalizeState(await ensureState(context.statePath));
        json(res, 200, {
          ok: true,
          workerMode: "local-proof-harness",
          runtimeSummary: summarizeRuntime(state),
          totalProjects: state.projects.length,
          projects: state.projects,
          handoffPackCount: state.handoffPacks.length,
          reviewBoard: summarizeBoard(state.handoffPacks, "review", ["queued", "approved", "blocked"]),
          executionBoard: summarizeBoard(state.handoffPacks, "execution", ["queued", "active", "blocked", "completed"]),
          dispatchBoard: summarizeBoard(state.handoffPacks, "dispatch", ["queued", "routing", "dispatched", "blocked"]),
          workflowTimeline: summarizeTimeline(state.events).summary,
        });
        return;
      }

      if (req.method === "GET" && routePath === "/runtime/standalone-apps/NeuralSpacePro/v1/runtime-summary") {
        const state = normalizeState(await ensureState(context.statePath));
        json(res, 200, {
          ok: true,
          workerMode: "local-proof-harness",
          statePath: context.statePath,
          summary: summarizeRuntime(state),
        });
        return;
      }

      if (req.method === "GET" && routePath === "/runtime/standalone-apps/NeuralSpacePro/v1/sessions") {
        const state = normalizeState(await ensureState(context.statePath));
        json(res, 200, {
          ok: true,
          workerMode: "local-proof-harness",
          totalSessions: state.sessions.length,
          sessions: state.sessions,
        });
        return;
      }

      if (req.method === "GET" && routePath.startsWith("/runtime/standalone-apps/NeuralSpacePro/v1/sessions/")) {
        const state = normalizeState(await ensureState(context.statePath));
        const sessionId = decodeURIComponent(routePath.slice("/runtime/standalone-apps/NeuralSpacePro/v1/sessions/".length));
        const session = state.sessions.find((entry) => entry.sessionId === sessionId);
        if (!session) {
          json(res, 404, { ok: false, error: "session-not-found", sessionId });
          return;
        }
        json(res, 200, {
          ok: true,
          workerMode: "local-proof-harness",
          session,
        });
        return;
      }

      if (req.method === "POST" && routePath === "/runtime/standalone-apps/NeuralSpacePro/.netlify/functions/gateway-chat") {
        const state = normalizeState(await ensureState(context.statePath));
        const body = await readBody(req);
        const summary = summarizeMessages(body.messages);
        if (!summary) {
          json(res, 400, { ok: false, error: "messages-required" });
          return;
        }
        const session = {
          sessionId: makeId("sess"),
          recordedAt: nowIso(),
          model: "skydexia-local-proof-harness",
          tenantId: String(body.tenantId || "ae-commandhub").trim() || "ae-commandhub",
          promptExcerpt: summary.slice(0, 280),
          outputExcerpt: [
            "SkyeDexia local proof harness response.",
            "This same-origin lane proves research-session wiring without claiming live provider execution.",
            "",
            "Recent prompt context:",
            summary,
          ].join("\n").slice(0, 280),
          messageCount: Array.isArray(body.messages) ? body.messages.length : 0,
        };
        const nextState = {
          ...state,
          sessions: [...state.sessions, session].slice(-25),
          updatedAt: session.recordedAt,
        };
        await writeState(context.statePath, nextState);
        json(res, 200, {
          ok: true,
          workerMode: "local-proof-harness",
          provider: "local-proof-harness",
          model: session.model,
          sessionId: session.sessionId,
          sessionCount: nextState.sessions.length,
          output_text: [
            "SkyeDexia local proof harness response.",
            "This same-origin lane proves research-session wiring without claiming live provider execution.",
            "",
            "Recent prompt context:",
            summary,
          ].join("\n"),
        });
        return;
      }

      if (req.method === "GET" && routePath === "/runtime/standalone-apps/NeuralSpacePro/projects") {
        const state = normalizeState(await ensureState(context.statePath));
        json(res, 200, {
          ok: true,
          workerMode: "local-proof-harness",
          totalProjects: state.projects.length,
          projects: state.projects,
        });
        return;
      }

      if (req.method === "GET" && routePath === "/runtime/standalone-apps/NeuralSpacePro/queue") {
        const state = normalizeState(await ensureState(context.statePath));
        json(res, 200, {
          ok: true,
          workerMode: "local-proof-harness",
          queueDepth: state.queue.length,
          events: state.queue,
        });
        return;
      }

      if (req.method === "POST" && routePath === "/runtime/standalone-apps/NeuralSpacePro/build-website") {
        const state = normalizeState(await ensureState(context.statePath));
        const body = await readBody(req);
        const brief = String(body.brief || "").trim();
        if (!brief) {
          json(res, 400, { ok: false, error: "brief-required" });
          return;
        }

        const generatedAt = new Date().toISOString();
        const projectId = makeId("prj");
        const siteName = String(body.name || brief.slice(0, 60)).trim() || "Untitled Site";
        const qualityScore = computeQualityScore(brief);
        const event = {
          eventId: makeId("evt"),
          type: "app.generated",
          at: generatedAt,
          projectId,
          tenantId: body.tenantId || "ae-commandhub",
          actorId: body.actorId || "skydexia-neural",
        };
        const project = {
          id: projectId,
          siteName,
          name: siteName,
          tenantId: body.tenantId || "ae-commandhub",
          actorId: body.actorId || "skydexia-neural",
          brief,
          status: "local-proof-generated",
          generatedAt,
          quality: qualityScore,
          qualityResult: { score: qualityScore },
        };
        const artifacts = await createProjectArtifacts(context.outputDir, project, event);
        const persistedProject = {
          ...project,
          artifactsDir: artifacts.relArtifactDir,
          files: artifacts.files,
          workerMode: "local-proof-harness",
        };

        const nextState = {
          sessions: state.sessions,
          projects: [...state.projects, persistedProject],
          queue: [...state.queue, { ...event, artifactsDir: artifacts.relArtifactDir }],
          handoffPacks: state.handoffPacks,
          events: state.events,
          updatedAt: generatedAt,
        };
        await writeState(context.statePath, nextState);

        json(res, 200, {
          ok: true,
          projectId,
          orchestratorProjectId: projectId,
          qualityScore,
          artifactsDir: artifacts.relArtifactDir,
          files: artifacts.files,
          appGeneratedEventId: event.eventId,
          status: "local-proof-generated",
          workerMode: "local-proof-harness",
        });
        return;
      }

      if (req.method === "GET" && routePath.startsWith("/runtime/standalone-apps/NeuralSpacePro/projects/")) {
        const state = normalizeState(await ensureState(context.statePath));
        const projectId = decodeURIComponent(routePath.slice("/runtime/standalone-apps/NeuralSpacePro/projects/".length));
        const project = state.projects.find((entry) => entry.id === projectId);
        if (!project) {
          json(res, 404, { ok: false, error: "project-not-found", projectId });
          return;
        }
        json(res, 200, {
          ok: true,
          workerMode: "local-proof-harness",
          project,
        });
        return;
      }

      if (req.method === "GET" && routePath.startsWith("/runtime/standalone-apps/NeuralSpacePro/project-artifacts/")) {
        const projectId = decodeURIComponent(routePath.slice("/runtime/standalone-apps/NeuralSpacePro/project-artifacts/".length));
        const files = await listProjectArtifacts(context.outputDir, projectId);
        if (!files) {
          json(res, 404, { ok: false, error: "project-not-found", projectId });
          return;
        }
        json(res, 200, {
          ok: true,
          workerMode: "local-proof-harness",
          projectId,
          files,
        });
        return;
      }

      if (req.method === "GET" && routePath.startsWith("/runtime/standalone-apps/NeuralSpacePro/artifacts/")) {
        const [projectId, ...rest] = routePath.slice("/runtime/standalone-apps/NeuralSpacePro/artifacts/".length).split("/");
        const fileName = rest.join("/runtime/standalone-apps/NeuralSpacePro/");
        if (!projectId || !fileName) {
          json(res, 400, { ok: false, error: "artifact-path-required" });
          return;
        }
        const artifactPath = resolveArtifactPath(context.outputDir, decodeURIComponent(projectId), decodeURIComponent(fileName));
        if (!artifactPath) {
          json(res, 403, { ok: false, error: "forbidden" });
          return;
        }
        try {
          const contents = await fs.readFile(artifactPath, "utf8");
          json(res, 200, {
            ok: true,
            workerMode: "local-proof-harness",
            projectId: decodeURIComponent(projectId),
            fileName: decodeURIComponent(fileName),
            contents,
          });
        } catch (error) {
          if (error.code === "ENOENT") {
            json(res, 404, { ok: false, error: "artifact-not-found", projectId, fileName });
            return;
          }
          throw error;
        }
        return;
      }

      if (req.method === "POST" && routePath === "/runtime/standalone-apps/NeuralSpacePro/queue/drain") {
        const state = normalizeState(await ensureState(context.statePath));
        const drained = state.queue;
        await writeState(context.statePath, {
          ...state,
          queue: [],
          updatedAt: new Date().toISOString(),
        });
        json(res, 200, {
          ok: true,
          workerMode: "local-proof-harness",
          drainedCount: drained.length,
          events: drained,
        });
        return;
      }

      if (req.method === "GET" && (routePath === "/runtime/standalone-apps/NeuralSpacePro/handoff-packs" || routePath === "/runtime/standalone-apps/NeuralSpacePro/v1/handoff-packs")) {
        const state = normalizeState(await ensureState(context.statePath));
        json(res, 200, {
          ok: true,
          workerMode: "local-proof-harness",
          totalHandoffPacks: state.handoffPacks.length,
          handoffPacks: state.handoffPacks,
        });
        return;
      }

      if (req.method === "GET" && (routePath === "/runtime/standalone-apps/NeuralSpacePro/review-board" || routePath === "/runtime/standalone-apps/NeuralSpacePro/v1/review-board")) {
        const state = normalizeState(await ensureState(context.statePath));
        const board = state.handoffPacks.filter((item) => item.review);
        json(res, 200, {
          ok: true,
          workerMode: "local-proof-harness",
          board: summarizeBoard(state.handoffPacks, "review", ["queued", "approved", "blocked"]),
          handoffPacks: board,
        });
        return;
      }

      if (req.method === "GET" && (routePath === "/runtime/standalone-apps/NeuralSpacePro/execution-board" || routePath === "/runtime/standalone-apps/NeuralSpacePro/v1/execution-board")) {
        const state = normalizeState(await ensureState(context.statePath));
        const board = state.handoffPacks.filter((item) => item.execution);
        json(res, 200, {
          ok: true,
          workerMode: "local-proof-harness",
          board: summarizeBoard(state.handoffPacks, "execution", ["queued", "active", "blocked", "completed"]),
          handoffPacks: board,
        });
        return;
      }

      if (req.method === "GET" && (routePath === "/runtime/standalone-apps/NeuralSpacePro/dispatch-board" || routePath === "/runtime/standalone-apps/NeuralSpacePro/v1/dispatch-board")) {
        const state = normalizeState(await ensureState(context.statePath));
        const board = state.handoffPacks.filter((item) => item.dispatch);
        json(res, 200, {
          ok: true,
          workerMode: "local-proof-harness",
          board: summarizeBoard(state.handoffPacks, "dispatch", ["queued", "routing", "dispatched", "blocked"]),
          handoffPacks: board,
        });
        return;
      }

      if (req.method === "GET" && (routePath === "/runtime/standalone-apps/NeuralSpacePro/workflow-timeline" || routePath === "/runtime/standalone-apps/NeuralSpacePro/v1/workflow-timeline")) {
        const state = normalizeState(await ensureState(context.statePath));
        const workflowTimeline = summarizeTimeline(state.events);
        json(res, 200, {
          ok: true,
          workerMode: "local-proof-harness",
          ...workflowTimeline,
        });
        return;
      }

      if (req.method === "POST" && (routePath === "/runtime/standalone-apps/NeuralSpacePro/handoff-packs" || routePath === "/runtime/standalone-apps/NeuralSpacePro/v1/handoff-packs")) {
        const state = normalizeState(await ensureState(context.statePath));
        const body = await readBody(req);
        const projectId = String(body.projectId || "").trim();
        if (!projectId) {
          json(res, 400, { ok: false, error: "project-id-required" });
          return;
        }
        const project = state.projects.find((entry) => entry.id === projectId);
        if (!project) {
          json(res, 404, { ok: false, error: "project-not-found", projectId });
          return;
        }
        const files = (await listProjectArtifacts(context.outputDir, projectId)) || [];
        const handoffPack = buildHandoffPack({ project, files, body });
        const nextState = {
          ...state,
          handoffPacks: [...state.handoffPacks, handoffPack],
          updatedAt: handoffPack.createdAt,
        };
        emitEvent(nextState, "skydexia.handoff", {
          handoffPackId: handoffPack.id,
          projectId,
          label: handoffPack.label,
          routeTo: handoffPack.downstreamTargets,
          note: handoffPack.notes,
        });
        await writeState(context.statePath, nextState);
        json(res, 200, {
          ok: true,
          workerMode: "local-proof-harness",
          handoffPack,
        });
        return;
      }

      if (
        req.method === "GET" &&
        (routePath.startsWith("/runtime/standalone-apps/NeuralSpacePro/handoff-packs/") || routePath.startsWith("/runtime/standalone-apps/NeuralSpacePro/v1/handoff-packs/"))
      ) {
        const state = normalizeState(await ensureState(context.statePath));
        const prefix = routePath.startsWith("/runtime/standalone-apps/NeuralSpacePro/v1/handoff-packs/") ? "/runtime/standalone-apps/NeuralSpacePro/v1/handoff-packs/" : "/runtime/standalone-apps/NeuralSpacePro/handoff-packs/";
        const handoffPackId = decodeURIComponent(routePath.slice(prefix.length));
        const handoffPack = state.handoffPacks.find((entry) => entry.id === handoffPackId);
        if (!handoffPack) {
          json(res, 404, { ok: false, error: "handoff-pack-not-found", handoffPackId });
          return;
        }
        json(res, 200, {
          ok: true,
          workerMode: "local-proof-harness",
          handoffPack,
        });
        return;
      }

      if (
        req.method === "POST" &&
        (/^\/runtime\/standalone-apps\/NeuralSpacePro\/handoff-packs\/[^/]+\/(review|execution|dispatch)$/.test(routePath)
          || /^\/runtime\/standalone-apps\/NeuralSpacePro\/v1\/handoff-packs\/[^/]+\/(review|execution|dispatch)$/.test(routePath))
      ) {
        const state = normalizeState(await ensureState(context.statePath));
        const match = routePath.match(/^\/runtime\/standalone-apps\/NeuralSpacePro\/(?:v1\/)?handoff-packs\/([^/]+)\/(review|execution|dispatch)$/);
        const handoffPackId = decodeURIComponent(match[1]);
        const action = match[2];
        const handoffPack = state.handoffPacks.find((entry) => entry.id === handoffPackId);
        if (!handoffPack) {
          json(res, 404, { ok: false, error: "handoff-pack-not-found", handoffPackId });
          return;
        }
        const body = await readBody(req);
        if (action === "review") {
          handoffPack.review = normalizeReviewUpdate(body, handoffPack.review);
          handoffPack.updatedAt = handoffPack.review.updatedAt;
          emitEvent(state, "skydexia.review", {
            handoffPackId,
            projectId: handoffPack.sourceProjectId,
            owner: handoffPack.review.owner,
            status: handoffPack.review.status,
            checkpoint: handoffPack.review.checkpoint,
            note: handoffPack.review.notes,
            label: handoffPack.label,
          });
        }
        if (action === "execution") {
          handoffPack.execution = normalizeExecutionUpdate(body, handoffPack.execution, handoffPack);
          handoffPack.updatedAt = handoffPack.execution.updatedAt;
          emitEvent(state, "skydexia.execution", {
            handoffPackId,
            projectId: handoffPack.sourceProjectId,
            owner: handoffPack.execution.owner,
            status: handoffPack.execution.status,
            checkpoint: handoffPack.execution.checkpoint,
            routeTo: handoffPack.execution.targets,
            note: handoffPack.execution.notes || handoffPack.execution.nextAction,
            label: handoffPack.label,
          });
        }
        if (action === "dispatch") {
          handoffPack.dispatch = normalizeDispatchUpdate(body, handoffPack.dispatch, handoffPack);
          handoffPack.updatedAt = handoffPack.dispatch.updatedAt;
          emitEvent(state, "skydexia.dispatch", {
            handoffPackId,
            projectId: handoffPack.sourceProjectId,
            owner: handoffPack.dispatch.owner,
            status: handoffPack.dispatch.status,
            checkpoint: handoffPack.dispatch.checkpoint,
            channel: handoffPack.dispatch.channel,
            routeTo: handoffPack.dispatch.routeTo,
            note: handoffPack.dispatch.notes || handoffPack.dispatch.nextAction,
            label: handoffPack.label,
          });
        }
        state.updatedAt = nowIso();
        await writeState(context.statePath, state);
        json(res, 200, {
          ok: true,
          workerMode: "local-proof-harness",
          handoffPack,
          reviewBoard: summarizeBoard(state.handoffPacks, "review", ["queued", "approved", "blocked"]),
          executionBoard: summarizeBoard(state.handoffPacks, "execution", ["queued", "active", "blocked", "completed"]),
          dispatchBoard: summarizeBoard(state.handoffPacks, "dispatch", ["queued", "routing", "dispatched", "blocked"]),
          workflowTimeline: summarizeTimeline(state.events).summary,
        });
        return;
      }

      json(res, 404, { ok: false, error: "not-found", path: routePath });
    } catch (error) {
      if (error instanceof SyntaxError) {
        json(res, 400, { ok: false, error: "invalid-json-body" });
        return;
      }
      json(res, 500, { ok: false, error: error.message });
    }
  });

  return { server, context };
}

const isEntrypoint = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isEntrypoint) {
  const host = process.env.SKYDEXIA_WORKER_HOST || "127.0.0.1";
  const port = Number(process.env.SKYDEXIA_WORKER_PORT || "4120");
  const { server, context } = await createSkyeDexiaLocalWorker({
    statePath: process.env.SKYDEXIA_LOCAL_WORKER_STATE_PATH,
    outputDir: process.env.SKYDEXIA_LOCAL_WORKER_OUTPUT_DIR,
    workerSecret: process.env.SKYDEXIA_WORKER_SECRET,
  });

  server.listen(port, host, () => {
    const address = server.address();
    const resolvedPort = typeof address === "object" && address ? address.port : port;
    console.log(JSON.stringify({
      ok: true,
      workerMode: "local-proof-harness",
      url: `http://${host}:${resolvedPort}`,
      statePath: context.statePath,
      outputDir: context.outputDir,
      secretRequired: Boolean(context.workerSecret),
    }));
  });
}
