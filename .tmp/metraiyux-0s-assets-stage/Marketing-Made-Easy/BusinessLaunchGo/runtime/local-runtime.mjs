import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultStorePath = path.join(root, "runtime", "store.json");

const CHECKLIST_ITEMS = [
  { id: "entity_type", title: "Choose entity type", badge: "Core" },
  { id: "name_search", title: "Confirm business name", badge: "Core" },
  { id: "registered_agent", title: "Registered agent plan", badge: "Core" },
  { id: "file_azcc", title: "File formation (AZCC)", badge: "Core" },
  { id: "get_ein", title: "Obtain EIN", badge: "Core" },
  { id: "banking", title: "Open business bank account", badge: "Core" },
  { id: "bookkeeping", title: "Set up bookkeeping categories", badge: "Core" },
  { id: "tpt_review", title: "Review TPT licensing need", badge: "AZ" },
  { id: "city_licenses", title: "Check city licensing requirements", badge: "AZ" },
  { id: "insurance", title: "Insurance baseline", badge: "Ops" },
  { id: "pricing", title: "Define offers + pricing", badge: "Ops" },
  { id: "intake", title: "Client intake + scope template", badge: "Ops" },
  { id: "invoice_flow", title: "Invoice + payment flow", badge: "Ops" },
  { id: "policies", title: "Privacy/terms starter drafted", badge: "Legal" },
  { id: "domain_email", title: "Domain + business email", badge: "Web" },
  { id: "website_core", title: "Website with CTA + contact", badge: "Web" },
  { id: "gbp", title: "Google Business Profile", badge: "Local" },
  { id: "analytics", title: "Analytics installed", badge: "Web" },
  { id: "launch", title: "Launch announcement + outreach", badge: "Go" }
];

function makeId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function defaultStore() {
  return {
    leads: [],
    launchPlans: [],
    handoffPacks: [],
    packActivity: [],
    workflowEvents: [],
    updatedAt: null
  };
}

function ensureStoreDir(storePath) {
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

function writeJson(filePath, payload) {
  ensureStoreDir(filePath);
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`);
}

function loadStore(context) {
  ensureStoreDir(context.storePath);
  if (!fs.existsSync(context.storePath)) {
    const initial = defaultStore();
    writeJson(context.storePath, initial);
    return initial;
  }
  try {
    const parsed = readJson(context.storePath, defaultStore());
    return {
      leads: Array.isArray(parsed.leads) ? parsed.leads.map(normalizeLeadRecord) : [],
      launchPlans: Array.isArray(parsed.launchPlans) ? parsed.launchPlans.map(normalizeLaunchPlan) : [],
      handoffPacks: Array.isArray(parsed.handoffPacks) ? parsed.handoffPacks.map(normalizeHandoffPack) : [],
      packActivity: Array.isArray(parsed.packActivity) ? parsed.packActivity.map(normalizePackActivity) : [],
      workflowEvents: Array.isArray(parsed.workflowEvents) ? parsed.workflowEvents.map(normalizeWorkflowEvent) : [],
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
    leads: Array.isArray(store.leads) ? store.leads.map(normalizeLeadRecord) : [],
    launchPlans: Array.isArray(store.launchPlans) ? store.launchPlans.map(normalizeLaunchPlan) : [],
    handoffPacks: Array.isArray(store.handoffPacks) ? store.handoffPacks.map(normalizeHandoffPack) : [],
    packActivity: Array.isArray(store.packActivity) ? store.packActivity.map(normalizePackActivity) : [],
    workflowEvents: Array.isArray(store.workflowEvents) ? store.workflowEvents.map(normalizeWorkflowEvent) : [],
    updatedAt: new Date().toISOString()
  };
  writeJson(context.storePath, next);
  return next;
}

function normalizeInputs(inputs = {}) {
  return {
    businessName: typeof inputs.businessName === "string" ? inputs.businessName.trim() : "",
    city: typeof inputs.city === "string" ? inputs.city.trim() : "",
    industry: typeof inputs.industry === "string" ? inputs.industry.trim() : "",
    ownersCount: Number.isFinite(Number(inputs.ownersCount)) ? Number(inputs.ownersCount) : 1,
    hireEmployees: Boolean(inputs.hireEmployees)
  };
}

function normalizeLead(lead = {}) {
  return {
    name: typeof lead.name === "string" ? lead.name.trim() : "",
    email: typeof lead.email === "string" ? lead.email.trim() : "",
    phone: typeof lead.phone === "string" ? lead.phone.trim() : "",
    company: typeof lead.company === "string" ? lead.company.trim() : "",
    message: typeof lead.message === "string" ? lead.message.trim() : ""
  };
}

function normalizeChecklist(checklist = {}) {
  const next = {};
  for (const item of CHECKLIST_ITEMS) {
    next[item.id] = Boolean(checklist[item.id]);
  }
  return next;
}

function computeProgress(checklist = {}) {
  const total = CHECKLIST_ITEMS.length;
  const done = CHECKLIST_ITEMS.reduce((count, item) => count + (checklist[item.id] ? 1 : 0), 0);
  return {
    total,
    done,
    pct: total ? Math.round((done / total) * 100) : 0
  };
}

function buildRecommendedActions(checklist, inputs) {
  const missingCore = CHECKLIST_ITEMS.filter((item) => item.badge === "Core" && !checklist[item.id]).map((item) => item.title);
  const actions = [];
  if (missingCore.length) {
    actions.push(`Finish core setup: ${missingCore.slice(0, 3).join(", ")}`);
  }
  if (!checklist.website_core) {
    actions.push(`Stand up the website and CTA for ${inputs.businessName || "the business"}.`);
  }
  if (!checklist.gbp) {
    actions.push(`Create and verify the Google Business Profile for ${inputs.city || "the target city"}, AZ.`);
  }
  if (inputs.hireEmployees && !checklist.insurance) {
    actions.push("Lock workers comp / payroll readiness before hiring starts.");
  }
  if (!actions.length) {
    actions.push("Core launch checklist is complete; review sales, fulfillment, and bookkeeping cadence.");
  }
  return actions.slice(0, 6);
}

function normalizeLeadRecord(record = {}) {
  const inputs = normalizeInputs(record.inputs || {});
  const checklist = normalizeChecklist(record.checklist || {});
  const progress = computeProgress(checklist);
  return {
    leadId: typeof record.leadId === "string" && record.leadId ? record.leadId : makeId("lead"),
    submittedAt: typeof record.submittedAt === "string" && record.submittedAt ? record.submittedAt : new Date().toISOString(),
    lead: normalizeLead(record.lead || {}),
    inputs,
    checklist,
    progress,
    reportSummary: typeof record.reportSummary === "string" ? record.reportSummary : "",
    source: typeof record.source === "string" && record.source ? record.source : "local-browser-runtime"
  };
}

function normalizePackActivity(activity = {}) {
  return {
    activityId: typeof activity.activityId === "string" && activity.activityId ? activity.activityId : makeId("pack"),
    type: typeof activity.type === "string" && activity.type ? activity.type : "event",
    createdAt: typeof activity.createdAt === "string" && activity.createdAt ? activity.createdAt : new Date().toISOString(),
    file: typeof activity.file === "string" ? activity.file : "",
    archiveFormat: typeof activity.archiveFormat === "string" ? activity.archiveFormat : "",
    inputs: normalizeInputs(activity.inputs || {}),
    progress: activity.progress && typeof activity.progress === "object" ? activity.progress : null
  };
}

function normalizeLaunchPlan(plan = {}) {
  const inputs = normalizeInputs(plan.inputs || {});
  const checklist = normalizeChecklist(plan.checklist || {});
  const progress = computeProgress(checklist);
  const missingCore = CHECKLIST_ITEMS.filter((item) => item.badge === "Core" && !checklist[item.id]).map((item) => item.title);
  return {
    planId: typeof plan.planId === "string" && plan.planId ? plan.planId : makeId("plan"),
    createdAt: typeof plan.createdAt === "string" && plan.createdAt ? plan.createdAt : new Date().toISOString(),
    leadId: typeof plan.leadId === "string" ? plan.leadId : "",
    inputs,
    checklist,
    progress,
    readiness: progress.pct >= 80 ? "launch-ready" : progress.pct >= 45 ? "foundation-in-progress" : "intake-only",
    missingCore,
    recommendedActions: Array.isArray(plan.recommendedActions) && plan.recommendedActions.length
      ? plan.recommendedActions.map((item) => String(item))
      : buildRecommendedActions(checklist, inputs),
    reportSummary: typeof plan.reportSummary === "string" ? plan.reportSummary : "",
    source: typeof plan.source === "string" && plan.source ? plan.source : "local-browser-runtime"
  };
}

function inferHandoffTargets(inputs, checklist, progress) {
  const targets = [];
  if (!checklist.website_core) targets.push("SkyeWebCreatorMax");
  if (!checklist.intake) targets.push("SkyeLeadVault");
  if (!checklist.invoice_flow || !checklist.bookkeeping) targets.push("Skye Profit Console");
  if (!checklist.launch || progress.pct < 100) targets.push("AE-FlowPro");
  if (inputs.hireEmployees) targets.push("skyeroutex-workforce-command-v0.4.0");
  if (!targets.length) targets.push("SkyeProofx");
  return [...new Set(targets)].slice(0, 6);
}

function buildHandoffActions(inputs, checklist, progress, targets) {
  const actions = [];
  if (!checklist.website_core) {
    actions.push(`Stand up a contact-ready web presence for ${inputs.businessName || "the business"}.`);
  }
  if (!checklist.invoice_flow) {
    actions.push("Lock invoicing, payment collection, and reconciliation flow.");
  }
  if (inputs.hireEmployees) {
    actions.push("Open workforce onboarding and dispatch prep before staffing begins.");
  }
  if (!checklist.launch) {
    actions.push("Prepare launch messaging and first outreach sequence.");
  }
  if (!actions.length) {
    actions.push("Review the launch pack, approve owners, and dispatch downstream work.");
  }
  return [...actions, `Primary downstream targets: ${targets.join(", ")}`].slice(0, 6);
}

function normalizeReviewState(review = {}) {
  return {
    status: typeof review.status === "string" && review.status.trim() ? review.status.trim() : "draft",
    owner: typeof review.owner === "string" ? review.owner.trim() : "",
    checkpoint: typeof review.checkpoint === "string" ? review.checkpoint.trim() : "",
    notes: typeof review.notes === "string" ? review.notes.trim() : "",
    updatedAt: typeof review.updatedAt === "string" && review.updatedAt ? review.updatedAt : null
  };
}

function normalizeExecutionState(execution = {}) {
  const allowed = new Set(["queued", "active", "blocked", "completed"]);
  const status = typeof execution.status === "string" ? execution.status.trim() : "";
  return {
    status: allowed.has(status) ? status : "queued",
    owner: typeof execution.owner === "string" ? execution.owner.trim() : "",
    checkpoint: typeof execution.checkpoint === "string" ? execution.checkpoint.trim() : "",
    nextAction: typeof execution.nextAction === "string" ? execution.nextAction.trim() : "",
    dueAt: typeof execution.dueAt === "string" ? execution.dueAt.trim() : "",
    notes: typeof execution.notes === "string" ? execution.notes.trim() : "",
    targets: Array.isArray(execution.targets) ? execution.targets.map((item) => String(item).trim()).filter(Boolean).slice(0, 8) : [],
    updatedAt: typeof execution.updatedAt === "string" && execution.updatedAt ? execution.updatedAt : null
  };
}

function normalizeDispatchState(dispatch = {}, fallback = {}) {
  const allowed = new Set(["queued", "active", "blocked", "completed"]);
  const status = typeof dispatch.status === "string" ? dispatch.status.trim() : "";
  return {
    status: allowed.has(status) ? status : "queued",
    owner: typeof dispatch.owner === "string" ? dispatch.owner.trim() : "",
    checkpoint: typeof dispatch.checkpoint === "string" ? dispatch.checkpoint.trim() : "",
    target: typeof dispatch.target === "string" ? dispatch.target.trim() : (fallback.target || ""),
    channel: typeof dispatch.channel === "string" ? dispatch.channel.trim() : (fallback.channel || "downstream-launch-dispatch"),
    nextAction: typeof dispatch.nextAction === "string" ? dispatch.nextAction.trim() : "",
    dueAt: typeof dispatch.dueAt === "string" ? dispatch.dueAt.trim() : "",
    notes: typeof dispatch.notes === "string" ? dispatch.notes.trim() : "",
    updatedAt: typeof dispatch.updatedAt === "string" && dispatch.updatedAt ? dispatch.updatedAt : null
  };
}

function normalizeWorkflowEvent(event = {}) {
  return {
    eventId: typeof event.eventId === "string" && event.eventId ? event.eventId : makeId("workflow"),
    packId: typeof event.packId === "string" ? event.packId : "",
    type: typeof event.type === "string" && event.type ? event.type : "event",
    status: typeof event.status === "string" ? event.status : "",
    owner: typeof event.owner === "string" ? event.owner : "",
    checkpoint: typeof event.checkpoint === "string" ? event.checkpoint : "",
    detail: typeof event.detail === "string" ? event.detail : "",
    target: typeof event.target === "string" ? event.target : "",
    createdAt: typeof event.createdAt === "string" && event.createdAt ? event.createdAt : new Date().toISOString()
  };
}

function normalizeHandoffPack(pack = {}) {
  const sourcePlan = normalizeLaunchPlan(pack.sourcePlan || {});
  const inputs = normalizeInputs(pack.inputs || sourcePlan.inputs || {});
  const checklist = normalizeChecklist(pack.checklist || sourcePlan.checklist || {});
  const progress = computeProgress(checklist);
  const downstreamTargets = Array.isArray(pack.downstreamTargets) && pack.downstreamTargets.length
    ? pack.downstreamTargets.map((item) => String(item).trim()).filter(Boolean)
    : inferHandoffTargets(inputs, checklist, progress);
  return {
    packId: typeof pack.packId === "string" && pack.packId ? pack.packId : makeId("handoff"),
    createdAt: typeof pack.createdAt === "string" && pack.createdAt ? pack.createdAt : new Date().toISOString(),
    leadId: typeof pack.leadId === "string" ? pack.leadId : sourcePlan.leadId || "",
    planId: typeof pack.planId === "string" ? pack.planId : sourcePlan.planId || "",
    label: typeof pack.label === "string" && pack.label.trim() ? pack.label.trim() : `${inputs.businessName || "Launch"} Handoff`,
    operatorNotes: typeof pack.operatorNotes === "string" ? pack.operatorNotes.trim() : "",
    inputs,
    checklist,
    progress,
    downstreamTargets,
    readiness: progress.pct >= 80 ? "ready-to-dispatch" : progress.pct >= 45 ? "needs-foundation-work" : "intake-review",
    recommendedActions: Array.isArray(pack.recommendedActions) && pack.recommendedActions.length
      ? pack.recommendedActions.map((item) => String(item))
      : buildHandoffActions(inputs, checklist, progress, downstreamTargets),
    review: normalizeReviewState(pack.review || {}),
    execution: pack.execution ? normalizeExecutionState({
      ...pack.execution,
      targets: Array.isArray(pack.execution?.targets) && pack.execution.targets.length ? pack.execution.targets : downstreamTargets
    }) : null,
    dispatch: pack.dispatch ? normalizeDispatchState(pack.dispatch, {
      target: downstreamTargets[0] || "",
      channel: "downstream-launch-dispatch"
    }) : null,
    sourcePlan,
    source: typeof pack.source === "string" && pack.source ? pack.source : "same-folder-runtime"
  };
}

function createWorkflowEvent(pack, type, detail, extra = {}) {
  return normalizeWorkflowEvent({
    packId: pack.packId,
    type,
    detail,
    status: extra.status || "",
    owner: extra.owner || "",
    checkpoint: extra.checkpoint || "",
    target: extra.target || "",
    createdAt: new Date().toISOString()
  });
}

function summarizeReviewBoard(store) {
  const packs = Array.isArray(store.handoffPacks) ? store.handoffPacks.map(normalizeHandoffPack) : [];
  const summary = {
    total: packs.length,
    draft: 0,
    ready: 0,
    approved: 0,
    blocked: 0,
    dispatched: 0,
    unassigned: 0
  };
  for (const pack of packs) {
    const status = pack.review?.status || "draft";
    if (Object.prototype.hasOwnProperty.call(summary, status)) summary[status] += 1;
    if (!pack.review?.owner) summary.unassigned += 1;
  }
  return { summary, handoffPacks: packs };
}

function summarizeExecutionBoard(store) {
  const packs = Array.isArray(store.handoffPacks)
    ? store.handoffPacks.map(normalizeHandoffPack).filter((pack) => pack.execution)
    : [];
  const summary = {
    total: packs.length,
    queued: 0,
    active: 0,
    blocked: 0,
    completed: 0,
    unassigned: 0
  };
  for (const pack of packs) {
    const status = pack.execution?.status || "queued";
    if (Object.prototype.hasOwnProperty.call(summary, status)) summary[status] += 1;
    if (!pack.execution?.owner) summary.unassigned += 1;
  }
  return { summary, handoffPacks: packs };
}

function summarizeDispatchBoard(store) {
  const packs = Array.isArray(store.handoffPacks)
    ? store.handoffPacks.map(normalizeHandoffPack).filter((pack) => pack.dispatch)
    : [];
  const summary = {
    total: packs.length,
    queued: 0,
    active: 0,
    blocked: 0,
    completed: 0,
    unassigned: 0
  };
  for (const pack of packs) {
    const status = pack.dispatch?.status || "queued";
    if (Object.prototype.hasOwnProperty.call(summary, status)) summary[status] += 1;
    if (!pack.dispatch?.owner) summary.unassigned += 1;
  }
  return { summary, handoffPacks: packs };
}

function summarizeWorkflowTimeline(store) {
  const timeline = Array.isArray(store.workflowEvents)
    ? store.workflowEvents.map(normalizeWorkflowEvent).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    : [];
  const summary = timeline.reduce((acc, event) => {
    acc.total += 1;
    if (event.type === "handoff_created") acc.created += 1;
    if (event.type === "handoff_review_updated") acc.review += 1;
    if (event.type === "handoff_execution_updated") acc.execution += 1;
    if (event.type === "handoff_dispatch_updated") acc.dispatch += 1;
    if (event.status === "completed") acc.completed += 1;
    return acc;
  }, { total: 0, created: 0, review: 0, execution: 0, dispatch: 0, completed: 0 });
  return { summary, events: timeline.slice(0, 80) };
}

function summarizeStore(store, context) {
  const latestLead = store.leads[0] || null;
  const latestPlan = store.launchPlans[0] || null;
  const latestHandoffPack = store.handoffPacks[0] || null;
  const latestPackActivity = store.packActivity[0] || null;
  const reviewBoard = summarizeReviewBoard(store);
  const executionBoard = summarizeExecutionBoard(store);
  const dispatchBoard = summarizeDispatchBoard(store);
  const workflowTimeline = summarizeWorkflowTimeline(store);
  return {
    ok: true,
    app: "BusinessLaunchGo",
    mode: "same-folder-local-runtime",
    startedAt: context.startedAt,
    dataFile: path.relative(root, context.storePath).replaceAll(path.sep, "/"),
    leads: {
      total: store.leads.length,
      latestAt: latestLead?.submittedAt || null,
      latestLead
    },
    launchPlans: {
      total: store.launchPlans.length,
      latestAt: latestPlan?.createdAt || null,
      latestPlan
    },
    handoffPacks: {
      total: store.handoffPacks.length,
      latestAt: latestHandoffPack?.createdAt || null,
      latestPack: latestHandoffPack
    },
    reviewBoard: reviewBoard.summary,
    executionBoard: executionBoard.summary,
    dispatchBoard: dispatchBoard.summary,
    packActivity: {
      total: store.packActivity.length,
      latestAt: latestPackActivity?.createdAt || null,
      latestActivity: latestPackActivity
    },
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
    default:
      return "application/octet-stream";
  }
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

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export async function createBusinessLaunchGoLocalRuntime(options = {}) {
  const context = {
    storePath: path.resolve(options.storePath || defaultStorePath),
    startedAt: new Date().toISOString()
  };

  const server = http.createServer(async (req, res) => {
    const requestUrl = new URL(req.url || "/", "http://127.0.0.1");

    try {
      if (req.method === "GET" && requestUrl.pathname === "/health") {
        json(res, 200, summarizeStore(loadStore(context), context));
        return;
      }

      if (req.method === "GET" && requestUrl.pathname === "/api/runtime/status") {
        json(res, 200, summarizeStore(loadStore(context), context));
        return;
      }

      if (req.method === "GET" && requestUrl.pathname === "/api/runtime/leads") {
        const store = loadStore(context);
        json(res, 200, { ok: true, total: store.leads.length, leads: store.leads });
        return;
      }

      if (req.method === "POST" && requestUrl.pathname === "/api/runtime/leads") {
        const body = await readBody(req);
        const store = loadStore(context);
        const leadRecord = normalizeLeadRecord(body);
        store.leads.unshift(leadRecord);
        saveStore(context, store);
        json(res, 200, {
          ok: true,
          lead: leadRecord,
          status: summarizeStore(loadStore(context), context)
        });
        return;
      }

      if (req.method === "GET" && requestUrl.pathname === "/api/runtime/launch-plans") {
        const store = loadStore(context);
        json(res, 200, { ok: true, total: store.launchPlans.length, launchPlans: store.launchPlans });
        return;
      }

      if (req.method === "POST" && requestUrl.pathname === "/api/runtime/launch-plans") {
        const body = await readBody(req);
        const store = loadStore(context);
        const launchPlan = normalizeLaunchPlan(body);
        store.launchPlans.unshift(launchPlan);
        saveStore(context, store);
        json(res, 200, {
          ok: true,
          launchPlan,
          status: summarizeStore(loadStore(context), context)
        });
        return;
      }

      if (req.method === "GET" && requestUrl.pathname.startsWith("/api/runtime/launch-plans/")) {
        const planId = decodeURIComponent(requestUrl.pathname.split("/").pop() || "");
        const store = loadStore(context);
        const launchPlan = store.launchPlans.find((entry) => entry.planId === planId);
        if (!launchPlan) {
          json(res, 404, { ok: false, error: "launch-plan-not-found", planId });
          return;
        }
        json(res, 200, { ok: true, launchPlan });
        return;
      }

      if (req.method === "GET" && requestUrl.pathname === "/api/runtime/handoff-packs") {
        const store = loadStore(context);
        json(res, 200, { ok: true, total: store.handoffPacks.length, handoffPacks: store.handoffPacks });
        return;
      }

      if (req.method === "POST" && requestUrl.pathname === "/api/runtime/handoff-packs") {
        const body = await readBody(req);
        const store = loadStore(context);
        const handoffPack = normalizeHandoffPack(body);
        store.handoffPacks.unshift(handoffPack);
        store.workflowEvents.unshift(createWorkflowEvent(
          handoffPack,
          "handoff_created",
          `Created handoff pack ${handoffPack.label}.`,
          {
            status: handoffPack.readiness,
            target: handoffPack.downstreamTargets[0] || ""
          }
        ));
        saveStore(context, store);
        json(res, 200, {
          ok: true,
          handoffPack,
          status: summarizeStore(loadStore(context), context)
        });
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
        const board = summarizeWorkflowTimeline(store);
        json(res, 200, { ok: true, ...board });
        return;
      }

      if (req.method === "POST" && /\/api\/runtime\/handoff-packs\/[^/]+\/review$/.test(requestUrl.pathname)) {
        const body = await readBody(req);
        const packId = decodeURIComponent(requestUrl.pathname.split("/").slice(-2, -1)[0] || "");
        const store = loadStore(context);
        const index = store.handoffPacks.findIndex((entry) => entry.packId === packId);
        if (index === -1) {
          json(res, 404, { ok: false, error: "handoff-pack-not-found", packId });
          return;
        }
        const current = normalizeHandoffPack(store.handoffPacks[index]);
        const review = normalizeReviewState({
          ...current.review,
          ...body,
          updatedAt: new Date().toISOString()
        });
        const updated = normalizeHandoffPack({
          ...current,
          review
        });
        store.handoffPacks[index] = updated;
        store.workflowEvents.unshift(createWorkflowEvent(
          updated,
          "handoff_review_updated",
          `Review marked ${updated.review.status} for ${updated.label}.`,
          {
            status: updated.review.status,
            owner: updated.review.owner,
            checkpoint: updated.review.checkpoint,
            target: updated.downstreamTargets[0] || ""
          }
        ));
        saveStore(context, store);
        json(res, 200, {
          ok: true,
          handoffPack: updated,
          reviewBoard: summarizeReviewBoard(loadStore(context)).summary,
          status: summarizeStore(loadStore(context), context)
        });
        return;
      }

      if (req.method === "POST" && /\/api\/runtime\/handoff-packs\/[^/]+\/execution$/.test(requestUrl.pathname)) {
        const body = await readBody(req);
        const packId = decodeURIComponent(requestUrl.pathname.split("/").slice(-2, -1)[0] || "");
        const store = loadStore(context);
        const index = store.handoffPacks.findIndex((entry) => entry.packId === packId);
        if (index === -1) {
          json(res, 404, { ok: false, error: "handoff-pack-not-found", packId });
          return;
        }
        const current = normalizeHandoffPack(store.handoffPacks[index]);
        const execution = normalizeExecutionState({
          ...current.execution,
          ...body,
          targets: Array.isArray(body.targets) && body.targets.length ? body.targets : current.downstreamTargets,
          updatedAt: new Date().toISOString()
        });
        const updated = normalizeHandoffPack({
          ...current,
          execution
        });
        store.handoffPacks[index] = updated;
        store.workflowEvents.unshift(createWorkflowEvent(
          updated,
          "handoff_execution_updated",
          `Execution marked ${updated.execution.status} for ${updated.label}.`,
          {
            status: updated.execution.status,
            owner: updated.execution.owner,
            checkpoint: updated.execution.checkpoint,
            target: updated.execution.targets?.[0] || updated.downstreamTargets[0] || ""
          }
        ));
        saveStore(context, store);
        json(res, 200, {
          ok: true,
          handoffPack: updated,
          executionBoard: summarizeExecutionBoard(loadStore(context)).summary,
          status: summarizeStore(loadStore(context), context)
        });
        return;
      }

      if (req.method === "POST" && /\/api\/runtime\/handoff-packs\/[^/]+\/dispatch$/.test(requestUrl.pathname)) {
        const body = await readBody(req);
        const packId = decodeURIComponent(requestUrl.pathname.split("/").slice(-2, -1)[0] || "");
        const store = loadStore(context);
        const index = store.handoffPacks.findIndex((entry) => entry.packId === packId);
        if (index === -1) {
          json(res, 404, { ok: false, error: "handoff-pack-not-found", packId });
          return;
        }
        const current = normalizeHandoffPack(store.handoffPacks[index]);
        const dispatch = normalizeDispatchState({
          ...current.dispatch,
          ...body,
          updatedAt: new Date().toISOString()
        }, {
          target: current.execution?.targets?.[0] || current.downstreamTargets[0] || "",
          channel: "downstream-launch-dispatch"
        });
        const updated = normalizeHandoffPack({
          ...current,
          dispatch
        });
        store.handoffPacks[index] = updated;
        store.workflowEvents.unshift(createWorkflowEvent(
          updated,
          "handoff_dispatch_updated",
          `Dispatch marked ${updated.dispatch.status} for ${updated.label}.`,
          {
            status: updated.dispatch.status,
            owner: updated.dispatch.owner,
            checkpoint: updated.dispatch.checkpoint,
            target: updated.dispatch.target
          }
        ));
        saveStore(context, store);
        json(res, 200, {
          ok: true,
          handoffPack: updated,
          dispatchBoard: summarizeDispatchBoard(loadStore(context)).summary,
          status: summarizeStore(loadStore(context), context)
        });
        return;
      }

      if (req.method === "GET" && requestUrl.pathname.startsWith("/api/runtime/handoff-packs/")) {
        const packId = decodeURIComponent(requestUrl.pathname.split("/").pop() || "");
        const store = loadStore(context);
        const handoffPack = store.handoffPacks.find((entry) => entry.packId === packId);
        if (!handoffPack) {
          json(res, 404, { ok: false, error: "handoff-pack-not-found", packId });
          return;
        }
        json(res, 200, { ok: true, handoffPack });
        return;
      }

      if (req.method === "GET" && requestUrl.pathname === "/api/runtime/pack-activity") {
        const store = loadStore(context);
        json(res, 200, { ok: true, total: store.packActivity.length, packActivity: store.packActivity });
        return;
      }

      if (req.method === "POST" && requestUrl.pathname === "/api/runtime/pack-activity") {
        const body = await readBody(req);
        const store = loadStore(context);
        const activity = normalizePackActivity(body);
        store.packActivity.unshift(activity);
        saveStore(context, store);
        json(res, 200, {
          ok: true,
          activity,
          status: summarizeStore(loadStore(context), context)
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

  return {
    server,
    context,
    close: async () => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
  };
}

const isEntrypoint = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isEntrypoint) {
  const host = process.env.BUSINESS_LAUNCH_GO_RUNTIME_HOST || "127.0.0.1";
  const port = Number(process.env.BUSINESS_LAUNCH_GO_RUNTIME_PORT || "4191");
  const runtime = await createBusinessLaunchGoLocalRuntime({
    storePath: process.env.BUSINESS_LAUNCH_GO_STORE_PATH
  });
  runtime.server.listen(port, host, () => {
    const address = runtime.server.address();
    const resolvedPort = typeof address === "object" && address ? address.port : port;
    console.log(JSON.stringify({
      ok: true,
      app: "BusinessLaunchGo",
      mode: "same-folder-local-runtime",
      url: `http://${host}:${resolvedPort}`,
      dataFile: path.relative(root, runtime.context.storePath).replaceAll(path.sep, "/")
    }));
  });
}
