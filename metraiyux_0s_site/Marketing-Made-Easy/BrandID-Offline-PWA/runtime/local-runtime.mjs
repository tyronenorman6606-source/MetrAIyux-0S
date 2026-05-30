#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultDataDir = path.join(root, "runtime", "data");
const defaultArchiveDir = path.join(defaultDataDir, "intake-packets");
const defaultBriefDir = path.join(defaultDataDir, "handoff-briefs");
const defaultJournalPath = path.join(defaultDataDir, "ops-journal.json");

function json(res, statusCode, payload) {
  res.writeHead(statusCode, {
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
    case ".webmanifest":
      return "application/json; charset=utf-8";
    case ".png":
      return "image/png";
    case ".svg":
      return "image/svg+xml; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

async function writeJson(filePath, payload) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
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

function makeId(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

async function readJournal(context) {
  return readJson(context.journalPath, []);
}

async function appendJournal(context, entry) {
  const current = await readJournal(context);
  current.unshift({
    id: String(entry.id || makeId("journal")),
    type: String(entry.type || "event"),
    detail: String(entry.detail || ""),
    createdAt: entry.createdAt || new Date().toISOString(),
    meta: entry.meta && typeof entry.meta === "object" ? entry.meta : {},
  });
  await writeJson(context.journalPath, current.slice(0, 160));
}

function classifyJournalEntry(entry = {}) {
  const type = String(entry.type || "");
  if (type === "intake_packet_archived") return "archive";
  if (type === "handoff_brief_created") return "brief";
  if (type === "handoff_brief_review_updated") return "review";
  if (type === "handoff_brief_execution_updated") return "execution";
  if (type === "handoff_brief_dispatch_updated") return "dispatch";
  return "other";
}

function buildTimelineSummary() {
  return {
    archive: 0,
    brief: 0,
    review: 0,
    execution: 0,
    dispatch: 0,
    other: 0,
    latestAt: null,
  };
}

function createWorkflowActivity(type, detail, meta = {}) {
  return {
    type,
    detail,
    meta: {
      packetId: String(meta.packetId || "").trim(),
      briefId: String(meta.briefId || "").trim(),
      brandName: String(meta.brandName || "").trim(),
      owner: String(meta.owner || "").trim(),
      status: String(meta.status || "").trim(),
      checkpoint: String(meta.checkpoint || "").trim(),
      target: String(meta.target || "").trim(),
      channel: String(meta.channel || "").trim(),
      nextAction: String(meta.nextAction || "").trim(),
      source: String(meta.source || "").trim(),
      file: String(meta.file || "").trim(),
    },
  };
}

async function buildWorkflowTimeline(context, limit = 20) {
  const journal = await readJournal(context);
  const summary = buildTimelineSummary();
  const timeline = [];
  let latestEvent = null;
  for (const entry of Array.isArray(journal) ? journal : []) {
    const category = classifyJournalEntry(entry);
    if (Object.hasOwn(summary, category)) summary[category] += 1;
    if (!summary.latestAt && entry.createdAt) summary.latestAt = entry.createdAt;
    if (timeline.length >= limit) continue;
    const item = {
      id: String(entry.id || ""),
      type: String(entry.type || "event"),
      category,
      detail: String(entry.detail || ""),
      createdAt: entry.createdAt || "",
      packetId: String(entry.meta?.packetId || ""),
      briefId: String(entry.meta?.briefId || ""),
      owner: String(entry.meta?.owner || ""),
      status: String(entry.meta?.status || ""),
      checkpoint: String(entry.meta?.checkpoint || ""),
      brandName: String(entry.meta?.brandName || ""),
      target: String(entry.meta?.target || ""),
      channel: String(entry.meta?.channel || ""),
      nextAction: String(entry.meta?.nextAction || ""),
      source: String(entry.meta?.source || ""),
    };
    if (!latestEvent) latestEvent = item;
    timeline.push(item);
  }
  return { summary, latestAt: summary.latestAt, latestEvent, timeline };
}

function normalizePacket(input = {}) {
  const intake = input.intake && typeof input.intake === "object" ? input.intake : {};
  const brief = input.brief && typeof input.brief === "object" ? input.brief : {};
  const assetPlan = input.assetPlan && typeof input.assetPlan === "object" ? input.assetPlan : {};
  const recommendedDestinations = Array.isArray(input.recommendedDestinations)
    ? input.recommendedDestinations.map((item) => String(item || "").trim()).filter(Boolean)
    : [];

  return {
    packetId: String(input.packetId || makeId("brandpkt")),
    createdAt: input.createdAt || new Date().toISOString(),
    archivedAt: new Date().toISOString(),
    source: String(input.source || "BrandID-Offline-PWA"),
    syncState: "archived",
    intake: {
      name: String(intake.name || "").trim(),
      email: String(intake.email || "").trim(),
      subject: String(intake.subject || "").trim(),
      message: String(intake.message || "").trim(),
    },
    brief: {
      brandName: String(brief.brandName || "").trim(),
      brandTagline: String(brief.brandTagline || "").trim(),
      previewIsDark: brief.previewIsDark !== false,
      savedAt: typeof brief.savedAt === "string" ? brief.savedAt : null,
      logoEmbedded: Boolean(brief.logoDataUrl),
      logoFallbackUrl: String(brief.logoFallbackUrl || "assets/logo.svg"),
    },
    assetPlan: {
      lockupExport: String(assetPlan.lockupExport || ""),
      iconExport: String(assetPlan.iconExport || ""),
      logoEmbedded: Boolean(assetPlan.logoEmbedded),
      previewTheme: String(assetPlan.previewTheme || (brief.previewIsDark === false ? "light" : "dark")),
    },
    recommendedDestinations,
    handoffSummary: {
      crmLane: recommendedDestinations.includes("SkyeLeadVault") ? "SkyeLeadVault" : "manual-intake",
      mediaLane: recommendedDestinations.includes("SkyeMediaCenter") ? "SkyeMediaCenter" : "manual-media-handoff",
      storefrontLane: recommendedDestinations.includes("SkyeWebCreatorMax") ? "SkyeWebCreatorMax" : "manual-site-build",
      opsLane: recommendedDestinations.includes("skyeroutex-workforce-command-v0.4.0")
        ? "skyeroutex-workforce-command-v0.4.0"
        : "manual-ops-handoff",
    },
  };
}

async function listPackets(context) {
  await ensureDir(context.archiveDir);
  const dirents = await fs.readdir(context.archiveDir, { withFileTypes: true });
  const rows = [];
  for (const dirent of dirents) {
    if (!dirent.isFile() || !dirent.name.endsWith(".json")) continue;
    const fullPath = path.join(context.archiveDir, dirent.name);
    const packet = await readJson(fullPath, null);
    if (!packet) continue;
    rows.push({
      packetId: packet.packetId,
      createdAt: packet.createdAt,
      archivedAt: packet.archivedAt,
      source: packet.source,
      intake: {
        name: packet.intake?.name || "",
        email: packet.intake?.email || "",
        subject: packet.intake?.subject || "",
      },
      brand: {
        brandName: packet.brief?.brandName || "",
        brandTagline: packet.brief?.brandTagline || "",
      },
      handoffSummary: packet.handoffSummary || {},
      file: path.relative(root, fullPath).replaceAll(path.sep, "/"),
    });
  }
  rows.sort((a, b) => String(b.archivedAt || "").localeCompare(String(a.archivedAt || "")));
  return rows;
}

async function savePacket(context, body) {
  const packetInput = body?.intakePacket && typeof body.intakePacket === "object" ? body.intakePacket : body;
  const packet = normalizePacket(packetInput);
  const fileName = `${packet.archivedAt.replaceAll(/[:.]/g, "-")}-${packet.packetId}.json`;
  const filePath = path.join(context.archiveDir, fileName);
  await ensureDir(context.archiveDir);
  await fs.writeFile(filePath, `${JSON.stringify(packet, null, 2)}\n`, "utf8");
  await appendJournal(
    context,
    createWorkflowActivity(
      "intake_packet_archived",
      `Archived intake packet for ${packet.brief.brandName || packet.intake.name || "brand intake"}`,
      {
        packetId: packet.packetId,
        brandName: packet.brief.brandName || "",
        owner: packet.intake.email || "",
        status: packet.syncState,
        checkpoint: "intake_archived",
        target: packet.recommendedDestinations?.[0] || "",
        nextAction: `Build the ${packet.brief.brandName || "brand"} handoff brief for downstream workflow lanes.`,
        source: "brand-intake-outbox",
        file: path.relative(root, filePath).replaceAll(path.sep, "/"),
      },
    ),
  );
  return {
    packetId: packet.packetId,
    archivedAt: packet.archivedAt,
    source: packet.source,
    intake: packet.intake,
    brand: {
      brandName: packet.brief.brandName,
      brandTagline: packet.brief.brandTagline,
    },
    handoffSummary: packet.handoffSummary,
    file: path.relative(root, filePath).replaceAll(path.sep, "/"),
  };
}

async function readPacket(context, packetId) {
  const rows = await listPackets(context);
  const match = rows.find((item) => item.packetId === packetId);
  if (!match) return null;
  return readJson(path.join(root, match.file), null);
}

function deriveBriefActions(packet) {
  const actions = [];
  const brandName = packet?.brief?.brandName || "Brand";
  const destinations = Array.isArray(packet?.recommendedDestinations) ? packet.recommendedDestinations : [];
  if (destinations.includes("SkyeLeadVault")) {
    actions.push(`Create or update the ${brandName} intake lane in SkyeLeadVault.`);
  }
  if (destinations.includes("SkyeWebCreatorMax")) {
    actions.push(`Prepare a web/storefront brief for ${brandName} inside SkyeWebCreatorMax.`);
  }
  if (destinations.includes("MaggiesStore")) {
    actions.push(`Map ${brandName} menu or product flow into MaggiesStore ordering surfaces.`);
  }
  if (destinations.includes("skyeroutex-workforce-command-v0.4.0")) {
    actions.push(`Prepare ops staffing or fulfillment touchpoints in Workforce Command for ${brandName}.`);
  }
  if (!actions.length) {
    actions.push(`Review the ${brandName} intake packet manually and assign the next system lane.`);
  }
  return actions.slice(0, 5);
}

function buildHandoffBrief(packet) {
  return {
    briefId: makeId("brandbrief"),
    createdAt: new Date().toISOString(),
    sourcePacketId: packet.packetId,
    source: "BrandID-Offline-PWA",
    brand: {
      brandName: packet.brief?.brandName || "",
      brandTagline: packet.brief?.brandTagline || "",
    },
    intake: {
      name: packet.intake?.name || "",
      email: packet.intake?.email || "",
      subject: packet.intake?.subject || "",
    },
    recommendedDestinations: Array.isArray(packet.recommendedDestinations) ? packet.recommendedDestinations : [],
    handoffSummary: packet.handoffSummary || {},
    actionItems: deriveBriefActions(packet),
    assetChecklist: {
      lockupExport: packet.assetPlan?.lockupExport || "",
      iconExport: packet.assetPlan?.iconExport || "",
      logoEmbedded: Boolean(packet.assetPlan?.logoEmbedded),
      previewTheme: packet.assetPlan?.previewTheme || "",
    },
    review: {
      status: "draft",
      owner: "",
      checkpoint: "brief_created",
      notes: "",
      updatedAt: new Date().toISOString(),
    },
  };
}

async function listBriefs(context) {
  await ensureDir(context.briefDir);
  const dirents = await fs.readdir(context.briefDir, { withFileTypes: true });
  const rows = [];
  for (const dirent of dirents) {
    if (!dirent.isFile() || !dirent.name.endsWith(".json")) continue;
    const fullPath = path.join(context.briefDir, dirent.name);
    const brief = await readJson(fullPath, null);
    if (!brief) continue;
    rows.push({
      briefId: brief.briefId,
      createdAt: brief.createdAt,
      sourcePacketId: brief.sourcePacketId,
      brand: brief.brand,
      handoffSummary: brief.handoffSummary,
      actionItems: brief.actionItems,
      file: path.relative(root, fullPath).replaceAll(path.sep, "/"),
    });
  }
  rows.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  return rows;
}

async function saveBrief(context, body) {
  const packetId = String(body?.packetId || body?.sourcePacketId || "").trim();
  const packet = packetId ? await readPacket(context, packetId) : null;
  if (!packet) {
    throw new Error(`source packet not found: ${packetId || "missing packetId"}`);
  }
  const brief = buildHandoffBrief(packet);
  const fileName = `${brief.createdAt.replaceAll(/[:.]/g, "-")}-${brief.briefId}.json`;
  const filePath = path.join(context.briefDir, fileName);
  await ensureDir(context.briefDir);
  await fs.writeFile(filePath, `${JSON.stringify(brief, null, 2)}\n`, "utf8");
  await appendJournal(
    context,
    createWorkflowActivity(
      "handoff_brief_created",
      `Built handoff brief for ${brief.brand.brandName || "brand handoff"}`,
      {
        packetId: brief.sourcePacketId,
        briefId: brief.briefId,
        brandName: brief.brand.brandName || "",
        status: brief.review?.status || "draft",
        checkpoint: brief.review?.checkpoint || "brief_created",
        target: brief.recommendedDestinations?.[0] || "",
        nextAction: brief.actionItems?.[0] || "",
        source: "brand-handoff-brief",
        file: path.relative(root, filePath).replaceAll(path.sep, "/"),
      },
    ),
  );
  return {
    briefId: brief.briefId,
    createdAt: brief.createdAt,
    sourcePacketId: brief.sourcePacketId,
    brand: brief.brand,
    handoffSummary: brief.handoffSummary,
    actionItems: brief.actionItems,
    file: path.relative(root, filePath).replaceAll(path.sep, "/"),
  };
}

async function readBrief(context, briefId) {
  const rows = await listBriefs(context);
  const match = rows.find((item) => item.briefId === briefId);
  if (!match) return null;
  return readJson(path.join(root, match.file), null);
}

function normalizeReviewUpdate(input = {}) {
  const allowedStatuses = new Set(["draft", "ready", "approved", "blocked", "dispatched"]);
  const status = String(input.status || "").trim().toLowerCase();
  return {
    status: allowedStatuses.has(status) ? status : "draft",
    owner: String(input.owner || "").trim(),
    checkpoint: String(input.checkpoint || "").trim() || "brief_reviewed",
    notes: String(input.notes || "").trim(),
    updatedAt: new Date().toISOString(),
  };
}

function normalizeExecutionUpdate(input = {}) {
  const allowedStatuses = new Set(["queued", "active", "blocked", "completed"]);
  const status = String(input.status || "").trim().toLowerCase();
  return {
    owner: String(input.owner || "").trim(),
    status: allowedStatuses.has(status) ? status : "queued",
    checkpoint: String(input.checkpoint || "").trim() || "execution_queued",
    dueAt: String(input.dueAt || "").trim(),
    nextAction: String(input.nextAction || "").trim(),
    notes: String(input.notes || "").trim(),
    updatedAt: new Date().toISOString(),
  };
}

function normalizeDispatchUpdate(input = {}) {
  const allowedStatuses = new Set(["queued", "ready", "active", "blocked", "delivered"]);
  const channel = String(input.channel || "").trim() || "brand_delivery";
  return {
    owner: String(input.owner || "").trim(),
    label: String(input.label || "").trim() || "brand_delivery_dispatch",
    status: allowedStatuses.has(String(input.status || "").trim().toLowerCase())
      ? String(input.status || "").trim().toLowerCase()
      : "queued",
    checkpoint: String(input.checkpoint || "").trim() || "dispatch_queued",
    dueAt: String(input.dueAt || "").trim(),
    nextAction: String(input.nextAction || "").trim(),
    notes: String(input.notes || "").trim(),
    channel,
    updatedAt: new Date().toISOString(),
  };
}

async function updateBriefReview(context, briefId, input) {
  await ensureDir(context.briefDir);
  const dirents = await fs.readdir(context.briefDir, { withFileTypes: true });
  for (const dirent of dirents) {
    if (!dirent.isFile() || !dirent.name.endsWith(".json")) continue;
    const fullPath = path.join(context.briefDir, dirent.name);
    const brief = await readJson(fullPath, null);
    if (!brief || brief.briefId !== briefId) continue;
    brief.review = {
      ...(brief.review && typeof brief.review === "object" ? brief.review : {}),
      ...normalizeReviewUpdate(input),
    };
    await fs.writeFile(fullPath, `${JSON.stringify(brief, null, 2)}\n`, "utf8");
    await appendJournal(
      context,
      createWorkflowActivity(
        "handoff_brief_review_updated",
        `Updated review board for ${brief.brand?.brandName || "brand handoff"}`,
        {
          packetId: brief.sourcePacketId,
          briefId: brief.briefId,
          brandName: brief.brand?.brandName || "",
          owner: brief.review.owner || "",
          status: brief.review.status || "draft",
          checkpoint: brief.review.checkpoint || "brief_reviewed",
          target: brief.recommendedDestinations?.[0] || "",
          nextAction: brief.actionItems?.[0] || "",
          source: "brand-review-board",
          file: path.relative(root, fullPath).replaceAll(path.sep, "/"),
        },
      ),
    );
    return {
      briefId: brief.briefId,
      review: brief.review,
      file: path.relative(root, fullPath).replaceAll(path.sep, "/"),
    };
  }
  return null;
}

function summarizeReviewBoard(briefs) {
  const counts = { draft: 0, ready: 0, approved: 0, blocked: 0, dispatched: 0, unassigned: 0 };
  for (const brief of briefs) {
    const review = brief.review && typeof brief.review === "object" ? brief.review : {};
    const status = String(review.status || "draft").toLowerCase();
    if (Object.hasOwn(counts, status)) counts[status] += 1;
    if (!String(review.owner || "").trim()) counts.unassigned += 1;
  }
  return counts;
}

async function updateBriefExecution(context, briefId, input) {
  await ensureDir(context.briefDir);
  const dirents = await fs.readdir(context.briefDir, { withFileTypes: true });
  for (const dirent of dirents) {
    if (!dirent.isFile() || !dirent.name.endsWith(".json")) continue;
    const fullPath = path.join(context.briefDir, dirent.name);
    const brief = await readJson(fullPath, null);
    if (!brief || brief.briefId !== briefId) continue;
    const review = brief.review && typeof brief.review === "object" ? brief.review : {};
    brief.execution = {
      ...(brief.execution && typeof brief.execution === "object" ? brief.execution : {}),
      owner: String(input.owner || "").trim() || String(review.owner || "").trim(),
      ...normalizeExecutionUpdate(input),
      targets: Array.isArray(brief.recommendedDestinations) ? brief.recommendedDestinations : [],
      recommendedActions: Array.isArray(brief.actionItems) ? brief.actionItems.slice(0, 5) : [],
    };
    await fs.writeFile(fullPath, `${JSON.stringify(brief, null, 2)}\n`, "utf8");
    await appendJournal(
      context,
      createWorkflowActivity(
        "handoff_brief_execution_updated",
        `Updated execution board for ${brief.brand?.brandName || "brand handoff"}`,
        {
          packetId: brief.sourcePacketId,
          briefId: brief.briefId,
          brandName: brief.brand?.brandName || "",
          owner: brief.execution.owner || "",
          status: brief.execution.status || "queued",
          checkpoint: brief.execution.checkpoint || "execution_queued",
          target: Array.isArray(brief.execution.targets) ? brief.execution.targets[0] || "" : "",
          nextAction: brief.execution.nextAction || brief.actionItems?.[0] || "",
          source: "brand-execution-board",
          file: path.relative(root, fullPath).replaceAll(path.sep, "/"),
        },
      ),
    );
    return {
      briefId: brief.briefId,
      execution: brief.execution,
      file: path.relative(root, fullPath).replaceAll(path.sep, "/"),
    };
  }
  return null;
}

function summarizeExecutionBoard(briefs) {
  const counts = { queued: 0, active: 0, blocked: 0, completed: 0, unassigned: 0 };
  for (const brief of briefs) {
    const execution = brief.execution && typeof brief.execution === "object" ? brief.execution : null;
    if (!execution) continue;
    const status = String(execution.status || "queued").toLowerCase();
    if (Object.hasOwn(counts, status)) counts[status] += 1;
    if (!String(execution.owner || "").trim()) counts.unassigned += 1;
  }
  return counts;
}

async function updateBriefDispatch(context, briefId, input) {
  await ensureDir(context.briefDir);
  const dirents = await fs.readdir(context.briefDir, { withFileTypes: true });
  for (const dirent of dirents) {
    if (!dirent.isFile() || !dirent.name.endsWith(".json")) continue;
    const fullPath = path.join(context.briefDir, dirent.name);
    const brief = await readJson(fullPath, null);
    if (!brief || brief.briefId !== briefId) continue;
    const review = brief.review && typeof brief.review === "object" ? brief.review : {};
    const execution = brief.execution && typeof brief.execution === "object" ? brief.execution : {};
    brief.dispatch = {
      ...(brief.dispatch && typeof brief.dispatch === "object" ? brief.dispatch : {}),
      owner: String(input.owner || "").trim() || String(execution.owner || "").trim() || String(review.owner || "").trim(),
      ...normalizeDispatchUpdate(input),
      targets: Array.isArray(brief.recommendedDestinations) ? brief.recommendedDestinations : [],
      recommendedActions: Array.isArray(brief.actionItems) ? brief.actionItems.slice(0, 5) : [],
      handoffSummary: brief.handoffSummary || {},
    };
    await fs.writeFile(fullPath, `${JSON.stringify(brief, null, 2)}\n`, "utf8");
    await appendJournal(
      context,
      createWorkflowActivity(
        "handoff_brief_dispatch_updated",
        `Updated dispatch board for ${brief.brand?.brandName || "brand handoff"}`,
        {
          packetId: brief.sourcePacketId,
          briefId: brief.briefId,
          brandName: brief.brand?.brandName || "",
          owner: brief.dispatch.owner || "",
          status: brief.dispatch.status || "queued",
          checkpoint: brief.dispatch.checkpoint || "dispatch_queued",
          target: Array.isArray(brief.dispatch.targets) ? brief.dispatch.targets[0] || "" : "",
          channel: brief.dispatch.channel || "",
          nextAction: brief.dispatch.nextAction || brief.actionItems?.[0] || "",
          source: "brand-dispatch-board",
          file: path.relative(root, fullPath).replaceAll(path.sep, "/"),
        },
      ),
    );
    return {
      briefId: brief.briefId,
      dispatch: brief.dispatch,
      file: path.relative(root, fullPath).replaceAll(path.sep, "/"),
    };
  }
  return null;
}

function summarizeDispatchBoard(briefs) {
  const counts = { queued: 0, ready: 0, active: 0, blocked: 0, delivered: 0, unassigned: 0 };
  for (const brief of briefs) {
    const dispatch = brief.dispatch && typeof brief.dispatch === "object" ? brief.dispatch : null;
    if (!dispatch) continue;
    const status = String(dispatch.status || "queued").toLowerCase();
    if (Object.hasOwn(counts, status)) counts[status] += 1;
    if (!String(dispatch.owner || "").trim()) counts.unassigned += 1;
  }
  return counts;
}

async function summarize(context) {
  const packets = await listPackets(context);
  const briefs = await listBriefs(context);
  const detailedBriefs = await Promise.all(briefs.map(async (brief) => readJson(path.join(root, brief.file), brief)));
  const reviewBoard = summarizeReviewBoard(detailedBriefs);
  const executionBoard = summarizeExecutionBoard(detailedBriefs);
  const dispatchBoard = summarizeDispatchBoard(detailedBriefs);
  const workflowTimeline = await buildWorkflowTimeline(context, 12);
  return {
    archive: {
      total: packets.length,
      latestArchivedAt: packets[0]?.archivedAt || null,
    },
    briefs: {
      total: briefs.length,
      latestCreatedAt: briefs[0]?.createdAt || null,
    },
    handoffLanes: {
      crm: packets.filter((packet) => packet.handoffSummary?.crmLane === "SkyeLeadVault").length,
      media: packets.filter((packet) => packet.handoffSummary?.mediaLane === "SkyeMediaCenter").length,
      storefront: packets.filter((packet) => packet.handoffSummary?.storefrontLane === "SkyeWebCreatorMax").length,
      ops: packets.filter((packet) => packet.handoffSummary?.opsLane === "skyeroutex-workforce-command-v0.4.0").length,
    },
    reviewBoard,
    executionBoard,
    dispatchBoard,
    workflowTimeline: workflowTimeline.summary,
    latestWorkflowEvent: workflowTimeline.latestEvent,
  };
}

async function serveStatic(req, res) {
  const requestPath = new URL(req.url, "http://127.0.0.1").pathname;
  let relativePath = decodeURIComponent(requestPath);
  if (relativePath === "/") relativePath = "/index.html";
  const filePath = path.join(root, relativePath);
  if (!filePath.startsWith(root)) {
    json(res, 403, { ok: false, error: "forbidden_path" });
    return;
  }
  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) {
      json(res, 404, { ok: false, error: "not_found" });
      return;
    }
    res.writeHead(200, {
      "content-type": mimeType(filePath),
      "cache-control": "no-store",
    });
    res.end(await fs.readFile(filePath));
  } catch (error) {
    if (error.code === "ENOENT") {
      json(res, 404, { ok: false, error: "not_found" });
      return;
    }
    throw error;
  }
}

export async function createBrandIdLocalRuntime(options = {}) {
  const context = {
    archiveDir: options.archiveDir || defaultArchiveDir,
    briefDir: options.briefDir || defaultBriefDir,
    journalPath: options.journalPath || defaultJournalPath,
  };

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://127.0.0.1");
      const route = url.pathname;

      if (route === "/health") {
        json(res, 200, {
          ok: true,
          mode: "same-folder-local-runtime",
          platform: "BrandID-Offline-PWA",
        });
        return;
      }

      if (route === "/api/runtime/status" && req.method === "GET") {
        json(res, 200, { ok: true, ...(await summarize(context)) });
        return;
      }

      if (route === "/api/runtime/intake-packets" && req.method === "GET") {
        const packets = await listPackets(context);
        json(res, 200, { ok: true, total: packets.length, packets });
        return;
      }

      if (route === "/api/runtime/intake-packets" && req.method === "POST") {
        const body = await readBody(req);
        const packet = await savePacket(context, body);
        json(res, 201, { ok: true, intakePacket: packet });
        return;
      }

      if (route === "/api/runtime/handoff-briefs" && req.method === "GET") {
        const briefs = await listBriefs(context);
        json(res, 200, { ok: true, total: briefs.length, briefs });
        return;
      }

      if (route === "/api/runtime/review-board" && req.method === "GET") {
        const briefs = await listBriefs(context);
        const detailedBriefs = await Promise.all(briefs.map(async (brief) => readJson(path.join(root, brief.file), brief)));
        json(res, 200, {
          ok: true,
          total: detailedBriefs.length,
          counts: summarizeReviewBoard(detailedBriefs),
          briefs: detailedBriefs.map((brief) => ({
            briefId: brief.briefId,
            brand: brief.brand,
            sourcePacketId: brief.sourcePacketId,
            review: brief.review || null,
            handoffSummary: brief.handoffSummary || {},
          })),
        });
        return;
      }

      if (route === "/api/runtime/execution-board" && req.method === "GET") {
        const briefs = await listBriefs(context);
        const detailedBriefs = await Promise.all(briefs.map(async (brief) => readJson(path.join(root, brief.file), brief)));
        const executableBriefs = detailedBriefs.filter((brief) => brief.execution && typeof brief.execution === "object");
        json(res, 200, {
          ok: true,
          total: executableBriefs.length,
          counts: summarizeExecutionBoard(detailedBriefs),
          items: executableBriefs.map((brief) => ({
            briefId: brief.briefId,
            brand: brief.brand,
            sourcePacketId: brief.sourcePacketId,
            execution: brief.execution,
            recommendedDestinations: brief.recommendedDestinations || [],
          })),
        });
        return;
      }

      if (route === "/api/runtime/dispatch-board" && req.method === "GET") {
        const briefs = await listBriefs(context);
        const detailedBriefs = await Promise.all(briefs.map(async (brief) => readJson(path.join(root, brief.file), brief)));
        const dispatchableBriefs = detailedBriefs.filter((brief) => brief.dispatch && typeof brief.dispatch === "object");
        json(res, 200, {
          ok: true,
          total: dispatchableBriefs.length,
          counts: summarizeDispatchBoard(detailedBriefs),
          items: dispatchableBriefs.map((brief) => ({
            briefId: brief.briefId,
            brand: brief.brand,
            sourcePacketId: brief.sourcePacketId,
            dispatch: brief.dispatch,
            recommendedDestinations: brief.recommendedDestinations || [],
          })),
        });
        return;
      }

      if (route === "/api/runtime/workflow-timeline" && req.method === "GET") {
        const limit = Math.max(1, Math.min(50, Number(url.searchParams.get("limit") || 20)));
        json(res, 200, { ok: true, workflowTimeline: await buildWorkflowTimeline(context, limit) });
        return;
      }

      if (route === "/api/runtime/handoff-briefs" && req.method === "POST") {
        const body = await readBody(req);
        const brief = await saveBrief(context, body);
        json(res, 201, { ok: true, handoffBrief: brief });
        return;
      }

      if (route.startsWith("/api/runtime/handoff-briefs/") && req.method === "GET") {
        const briefId = decodeURIComponent(route.slice("/api/runtime/handoff-briefs/".length));
        const brief = await readBrief(context, briefId);
        if (!brief) {
          json(res, 404, { ok: false, error: "brief_not_found", briefId });
          return;
        }
        json(res, 200, { ok: true, handoffBrief: brief });
        return;
      }

      if (route.startsWith("/api/runtime/handoff-briefs/") && route.endsWith("/review") && req.method === "POST") {
        const briefId = decodeURIComponent(route.slice("/api/runtime/handoff-briefs/".length, -"/review".length));
        const body = await readBody(req);
        const result = await updateBriefReview(context, briefId, body?.review || body);
        if (!result) {
          json(res, 404, { ok: false, error: "brief_not_found", briefId });
          return;
        }
        json(res, 200, { ok: true, updated: result });
        return;
      }

      if (route.startsWith("/api/runtime/handoff-briefs/") && route.endsWith("/execution") && req.method === "POST") {
        const briefId = decodeURIComponent(route.slice("/api/runtime/handoff-briefs/".length, -"/execution".length));
        const body = await readBody(req);
        const result = await updateBriefExecution(context, briefId, body?.execution || body);
        if (!result) {
          json(res, 404, { ok: false, error: "brief_not_found", briefId });
          return;
        }
        json(res, 200, { ok: true, updated: result });
        return;
      }

      if (route.startsWith("/api/runtime/handoff-briefs/") && route.endsWith("/dispatch") && req.method === "POST") {
        const briefId = decodeURIComponent(route.slice("/api/runtime/handoff-briefs/".length, -"/dispatch".length));
        const body = await readBody(req);
        const result = await updateBriefDispatch(context, briefId, body?.dispatch || body);
        if (!result) {
          json(res, 404, { ok: false, error: "brief_not_found", briefId });
          return;
        }
        json(res, 200, { ok: true, updated: result });
        return;
      }

      if (route.startsWith("/api/runtime/intake-packets/") && req.method === "GET") {
        const packetId = decodeURIComponent(route.slice("/api/runtime/intake-packets/".length));
        const packet = await readPacket(context, packetId);
        if (!packet) {
          json(res, 404, { ok: false, error: "packet_not_found", packetId });
          return;
        }
        json(res, 200, { ok: true, intakePacket: packet });
        return;
      }

      if (route.startsWith("/api/runtime/")) {
        json(res, 404, { ok: false, error: "runtime_route_not_found", route });
        return;
      }

      await serveStatic(req, res);
    } catch (error) {
      json(res, 500, {
        ok: false,
        error: "runtime_failure",
        detail: String(error?.message || error),
      });
    }
  });

  return {
    server,
    context,
    close: () => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
  };
}

async function main() {
  const port = Number(process.env.PORT || 4296);
  const host = process.env.HOST || "127.0.0.1";
  const runtime = await createBrandIdLocalRuntime();
  await ensureDir(defaultArchiveDir);
  await ensureDir(defaultBriefDir);
  await new Promise((resolve, reject) => {
    runtime.server.once("error", reject);
    runtime.server.listen(port, host, resolve);
  });
  console.log(JSON.stringify({
    ok: true,
    platform: "BrandID-Offline-PWA",
    mode: "same-folder-local-runtime",
    baseUrl: `http://${host}:${port}`,
    archiveDir: path.relative(root, defaultArchiveDir).replaceAll(path.sep, "/"),
  }, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
