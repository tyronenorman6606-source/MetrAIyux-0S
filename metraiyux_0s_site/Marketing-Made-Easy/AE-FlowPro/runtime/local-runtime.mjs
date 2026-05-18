#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultDataDir = path.join(root, "runtime", "data");
const defaultJournalPath = path.join(defaultDataDir, "ops-journal.json");
const defaultSnapshotsDir = path.join(defaultDataDir, "snapshots");
const defaultRecoveryPacksDir = path.join(defaultDataDir, "recovery-packs");
const defaultActivationPacksDir = path.join(defaultDataDir, "activation-packs");
const defaultActivationWorkflowsDir = path.join(defaultDataDir, "activation-workflows");
const defaultExecutionBoardsDir = path.join(defaultDataDir, "execution-board");

function normalizeDispatchState(dispatch = {}, executionItem = {}) {
  return {
    owner: String(dispatch.owner || executionItem.owner || "activation-ops"),
    status: String(dispatch.status || "queued"),
    checkpoint: String(dispatch.checkpoint || "dispatch-queued"),
    channel: String(dispatch.channel || "downstream-activation-dispatch"),
    target: String(dispatch.target || (Array.isArray(executionItem.targets) ? executionItem.targets[0] || "" : "")),
    nextAction: String(dispatch.nextAction || executionItem.nextAction || "Confirm downstream owner and launch handoff."),
    notes: String(dispatch.notes || executionItem.notes || ""),
    dueAt: String(dispatch.dueAt || executionItem.dueAt || ""),
    updatedAt: String(dispatch.updatedAt || "") || null,
  };
}

function makeId(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

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
    case ".txt":
    case ".md":
      return "text/plain; charset=utf-8";
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

function sanitizeJournalEntry(entry) {
  return {
    id: String(entry.id || makeId("journal")),
    type: String(entry.type || "event"),
    detail: String(entry.detail || ""),
    createdAt: entry.createdAt || new Date().toISOString(),
    meta: entry.meta && typeof entry.meta === "object" ? entry.meta : {},
  };
}

async function readJournal(context) {
  return readJson(context.journalPath, []);
}

async function writeJournal(context, entries) {
  await writeJson(context.journalPath, entries.slice(0, 160));
}

async function appendJournal(context, entry) {
  const next = sanitizeJournalEntry(entry);
  const current = await readJournal(context);
  current.unshift(next);
  await writeJournal(context, current);
  return next;
}

function sanitizeSnapshotBody(body) {
  return {
    snapshotId: String(body.snapshotId || makeId("snapshot")),
    reason: String(body.reason || "manual"),
    createdAt: body.createdAt || new Date().toISOString(),
    meta: body.meta && typeof body.meta === "object" ? body.meta : {},
    payload: body.payload && typeof body.payload === "object" ? body.payload : {},
  };
}

async function listSnapshots(context) {
  await ensureDir(context.snapshotsDir);
  const dirents = await fs.readdir(context.snapshotsDir, { withFileTypes: true });
  const rows = [];
  for (const dirent of dirents) {
    if (!dirent.isFile() || !dirent.name.endsWith(".json")) continue;
    const snapshotPath = path.join(context.snapshotsDir, dirent.name);
    const snapshot = await readJson(snapshotPath, null);
    if (!snapshot) continue;
    rows.push({
      snapshotId: snapshot.snapshotId,
      reason: snapshot.reason,
      createdAt: snapshot.createdAt,
      meta: snapshot.meta || {},
      file: path.relative(root, snapshotPath).replaceAll(path.sep, "/"),
      counts: {
        visits: Array.isArray(snapshot.payload?.visits) ? snapshot.payload.visits.length : 0,
        accounts: Array.isArray(snapshot.payload?.accounts) ? snapshot.payload.accounts.length : 0,
        deals: Array.isArray(snapshot.payload?.deals) ? snapshot.payload.deals.length : 0,
        handoffs: Array.isArray(snapshot.payload?.handoff_log) ? snapshot.payload.handoff_log.length : 0,
      },
    });
  }
  rows.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  return rows;
}

async function saveSnapshot(context, body) {
  const snapshot = sanitizeSnapshotBody(body);
  const fileName = `${snapshot.createdAt.replaceAll(/[:.]/g, "-")}-${snapshot.snapshotId}.json`;
  const filePath = path.join(context.snapshotsDir, fileName);
  await ensureDir(context.snapshotsDir);
  await fs.writeFile(filePath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  return {
    snapshotId: snapshot.snapshotId,
    createdAt: snapshot.createdAt,
    reason: snapshot.reason,
    meta: snapshot.meta,
    file: path.relative(root, filePath).replaceAll(path.sep, "/"),
  };
}

async function readSnapshot(context, snapshotId) {
  const snapshots = await listSnapshots(context);
  const match = snapshots.find((item) => item.snapshotId === snapshotId);
  if (!match) return null;
  return readJson(path.join(root, match.file), null);
}

function toRecoveryActions(snapshot, requested = {}) {
  const payload = snapshot?.payload && typeof snapshot.payload === "object" ? snapshot.payload : {};
  const visits = Array.isArray(payload.visits) ? payload.visits : [];
  const deals = Array.isArray(payload.deals) ? payload.deals : [];
  const handoffs = Array.isArray(payload.handoff_log) ? payload.handoff_log : [];
  const assignee = String(requested.assignee || "local-operator");
  const actions = [];

  for (const visit of visits.slice(0, 3)) {
    actions.push({
      lane: "visits",
      owner: assignee,
      title: `Follow up ${String(visit.business_name || visit.account_name || visit.name || "visit")}`,
      priority: String(visit.status || "").toLowerCase().includes("hot") ? "high" : "medium",
    });
  }
  for (const deal of deals.slice(0, 3)) {
    actions.push({
      lane: "deals",
      owner: assignee,
      title: `Review deal ${String(deal.business_name || deal.name || deal.id || "lane")}`,
      priority: String(deal.stage || "").toLowerCase().includes("close") ? "high" : "medium",
    });
  }
  for (const handoff of handoffs.slice(0, 2)) {
    actions.push({
      lane: "handoff_log",
      owner: assignee,
      title: `Confirm handoff ${String(handoff.business_name || handoff.account_name || handoff.id || "bundle")}`,
      priority: "medium",
    });
  }
  if (!actions.length) {
    actions.push({
      lane: "recovery",
      owner: assignee,
      title: "No snapshot workload found; confirm fresh intake before shift handoff.",
      priority: "low",
    });
  }
  return actions.slice(0, Number(requested.maxActions || 8));
}

async function saveRecoveryPack(context, snapshot, body) {
  const requested = body && typeof body.recoveryPack === "object" ? body.recoveryPack : body;
  const payload = snapshot?.payload && typeof snapshot.payload === "object" ? snapshot.payload : {};
  const recoveryPack = {
    recoveryPackId: String(requested.recoveryPackId || makeId("recovery")),
    generatedAt: requested.generatedAt || new Date().toISOString(),
    snapshotId: String(snapshot?.snapshotId || requested.snapshotId || ""),
    assignee: String(requested.assignee || "local-operator"),
    shiftLabel: String(requested.shiftLabel || "same-day-recovery"),
    metrics: {
      visits: Array.isArray(payload.visits) ? payload.visits.length : 0,
      accounts: Array.isArray(payload.accounts) ? payload.accounts.length : 0,
      deals: Array.isArray(payload.deals) ? payload.deals.length : 0,
      handoffs: Array.isArray(payload.handoff_log) ? payload.handoff_log.length : 0,
    },
    actions: toRecoveryActions(snapshot, requested),
  };
  const fileName = `${recoveryPack.generatedAt.replaceAll(/[:.]/g, "-")}-${recoveryPack.recoveryPackId}.json`;
  const filePath = path.join(context.recoveryPacksDir, fileName);
  await ensureDir(context.recoveryPacksDir);
  await fs.writeFile(filePath, `${JSON.stringify(recoveryPack, null, 2)}\n`, "utf8");
  return {
    recoveryPackId: recoveryPack.recoveryPackId,
    generatedAt: recoveryPack.generatedAt,
    snapshotId: recoveryPack.snapshotId,
    assignee: recoveryPack.assignee,
    shiftLabel: recoveryPack.shiftLabel,
    metrics: recoveryPack.metrics,
    actions: recoveryPack.actions,
    file: path.relative(root, filePath).replaceAll(path.sep, "/"),
  };
}

async function listRecoveryPacks(context) {
  await ensureDir(context.recoveryPacksDir);
  const dirents = await fs.readdir(context.recoveryPacksDir, { withFileTypes: true });
  const packs = [];
  for (const dirent of dirents) {
    if (!dirent.isFile() || !dirent.name.endsWith(".json")) continue;
    const fullPath = path.join(context.recoveryPacksDir, dirent.name);
    const pack = await readJson(fullPath, null);
    if (!pack) continue;
    packs.push({
      recoveryPackId: pack.recoveryPackId,
      generatedAt: pack.generatedAt,
      snapshotId: pack.snapshotId,
      assignee: pack.assignee,
      shiftLabel: pack.shiftLabel,
      metrics: pack.metrics || {},
      actions: Array.isArray(pack.actions) ? pack.actions : [],
      file: path.relative(root, fullPath).replaceAll(path.sep, "/"),
    });
  }
  packs.sort((a, b) => String(b.generatedAt || "").localeCompare(String(a.generatedAt || "")));
  return packs;
}

async function readRecoveryPack(context, recoveryPackId) {
  const packs = await listRecoveryPacks(context);
  const match = packs.find((item) => item.recoveryPackId === recoveryPackId);
  if (!match) return null;
  return readJson(path.join(root, match.file), null);
}

function prioritizeActivationAccounts(snapshot) {
  const payload = snapshot?.payload && typeof snapshot.payload === "object" ? snapshot.payload : {};
  const accounts = Array.isArray(payload.accounts) ? payload.accounts : [];
  const deals = Array.isArray(payload.deals) ? payload.deals : [];
  const handoffs = Array.isArray(payload.handoff_log) ? payload.handoff_log : [];
  const visits = Array.isArray(payload.visits) ? payload.visits : [];
  return accounts
    .map((account) => {
      const accountId = String(account.id || "");
      const email = String(account.business_email || "").trim().toLowerCase();
      const accountDeals = deals.filter((deal) => String(deal.account_id || "") === accountId);
      const accountHandoffs = handoffs.filter((handoff) => String(handoff.account_id || "") === accountId);
      const accountVisits = email ? visits.filter((visit) => String(visit.business_email || "").trim().toLowerCase() === email) : [];
      const setupTotal = accountDeals.reduce((sum, deal) => sum + Number(deal.setup_total || 0), 0);
      const monthlyTotal = accountDeals.reduce((sum, deal) => sum + Number(deal.monthly_total || 0), 0);
      const score =
        (account.permission === "yes" ? 50 : 0) +
        Math.min(accountVisits.length * 5, 20) +
        Math.min(accountDeals.length * 8, 24) +
        Math.min(accountHandoffs.length * 10, 20) +
        Math.min(Math.round(monthlyTotal / 250), 30);
      return {
        id: accountId || makeId("account"),
        businessName: String(account.business_name || "Untitled account"),
        businessEmail: String(account.business_email || ""),
        aeName: String(account.ae_name || ""),
        service: String(account.service_1 || ""),
        serviceArea: String(account.service_area || ""),
        bookingLink: String(account.website_or_booking || ""),
        permission: String(account.permission || ""),
        accountStatus: String(account.account_status || ""),
        notes: String(account.notes || ""),
        visitCount: accountVisits.length,
        openDealCount: accountDeals.filter((deal) => !["Closed Won", "Closed Lost"].includes(String(deal.stage || ""))).length,
        handoffCount: accountHandoffs.length,
        setupTotal,
        monthlyTotal,
        score,
        routeHints: [
          "crm",
          account.website_or_booking ? "web-launch" : "booking-link-needed",
          monthlyTotal > 0 ? "billing-lane" : "offer-definition",
          accountHandoffs.length ? "operator-handoff" : "handoff-needed",
        ],
      };
    })
    .sort((a, b) => b.score - a.score || b.monthlyTotal - a.monthlyTotal || a.businessName.localeCompare(b.businessName));
}

function buildActivationActions(snapshot, prioritizedAccounts, requested = {}) {
  const payload = snapshot?.payload && typeof snapshot.payload === "object" ? snapshot.payload : {};
  const deals = Array.isArray(payload.deals) ? payload.deals : [];
  const visits = Array.isArray(payload.visits) ? payload.visits : [];
  const actions = [];
  const owner = String(requested.owner || requested.assignee || "activation-ops");

  prioritizedAccounts.slice(0, 4).forEach((account) => {
    actions.push({
      lane: "crm",
      owner,
      priority: account.permission === "yes" ? "high" : "medium",
      title: `Open activation record for ${account.businessName}`,
      detail: account.businessEmail || "Missing business email on account record",
    });
    if (!account.bookingLink) {
      actions.push({
        lane: "web-launch",
        owner,
        priority: "high",
        title: `Collect booking or website link for ${account.businessName}`,
        detail: "Activation pack is missing a booking or website destination.",
      });
    }
    if (account.openDealCount > 0) {
      actions.push({
        lane: "billing-lane",
        owner,
        priority: "high",
        title: `Review open deal and deposit path for ${account.businessName}`,
        detail: `${account.openDealCount} open deal(s), ${account.handoffCount} handoff pack(s).`,
      });
    }
  });

  deals
    .filter((deal) => !["Closed Won", "Closed Lost"].includes(String(deal.stage || "")))
    .slice(0, 3)
    .forEach((deal) => {
      actions.push({
        lane: "deal-desk",
        owner,
        priority: String(deal.stage || "").toLowerCase().includes("proposal") ? "high" : "medium",
        title: `Advance ${String(deal.name || "deal")} for ${String(deal.account_name || "account")}`,
        detail: `Deposit due ${Number(deal.deposit_due || 0)} with stage ${String(deal.stage || "Discovery")}.`,
      });
    });

  if (!actions.length && visits.length) {
    actions.push({
      lane: "field-followup",
      owner,
      priority: "medium",
      title: "No owned accounts found; review fresh field visits for conversion",
      detail: `${visits.length} visit record(s) available in the current snapshot.`,
    });
  }

  if (!actions.length) {
    actions.push({
      lane: "activation",
      owner,
      priority: "low",
      title: "No workload found in snapshot; confirm intake before building downstream lanes",
      detail: "Snapshot did not contain visits, accounts, deals, or handoffs.",
    });
  }

  return actions.slice(0, Number(requested.maxActions || 10));
}

async function saveActivationPack(context, snapshot, body) {
  const requested = body && typeof body.activationPack === "object" ? body.activationPack : body;
  const payload = snapshot?.payload && typeof snapshot.payload === "object" ? snapshot.payload : {};
  const prioritizedAccounts = prioritizeActivationAccounts(snapshot);
  const activationPack = {
    activationPackId: String(requested.activationPackId || makeId("activation")),
    generatedAt: requested.generatedAt || new Date().toISOString(),
    snapshotId: String(snapshot?.snapshotId || requested.snapshotId || ""),
    scope: String(requested.scope || "system-handoff"),
    sourceApp: String(requested.sourceApp || "AE-FlowPro"),
    owner: String(requested.owner || requested.assignee || "activation-ops"),
    summaryText: String(requested.summaryText || ""),
    brand: payload.settings?.brand && typeof payload.settings.brand === "object" ? payload.settings.brand : {},
    metrics: {
      visits: Array.isArray(payload.visits) ? payload.visits.length : 0,
      accounts: Array.isArray(payload.accounts) ? payload.accounts.length : 0,
      deals: Array.isArray(payload.deals) ? payload.deals.length : 0,
      handoffs: Array.isArray(payload.handoff_log) ? payload.handoff_log.length : 0,
      prioritizedAccounts: prioritizedAccounts.length,
    },
    accounts: prioritizedAccounts.slice(0, Number(requested.maxAccounts || 8)),
    actions: buildActivationActions(snapshot, prioritizedAccounts, requested),
    downstreamLanes: [
      { lane: "crm", ready: prioritizedAccounts.some((account) => !!account.businessEmail) },
      { lane: "web-launch", ready: prioritizedAccounts.some((account) => !!account.bookingLink) },
      { lane: "billing-lane", ready: prioritizedAccounts.some((account) => account.monthlyTotal > 0 || account.setupTotal > 0) },
      { lane: "operator-handoff", ready: Array.isArray(payload.handoff_log) && payload.handoff_log.length > 0 },
    ],
  };
  const fileName = `${activationPack.generatedAt.replaceAll(/[:.]/g, "-")}-${activationPack.activationPackId}.json`;
  const filePath = path.join(context.activationPacksDir, fileName);
  await ensureDir(context.activationPacksDir);
  await fs.writeFile(filePath, `${JSON.stringify(activationPack, null, 2)}\n`, "utf8");
  return {
    activationPackId: activationPack.activationPackId,
    generatedAt: activationPack.generatedAt,
    snapshotId: activationPack.snapshotId,
    scope: activationPack.scope,
    sourceApp: activationPack.sourceApp,
    owner: activationPack.owner,
    metrics: activationPack.metrics,
    actions: activationPack.actions,
    downstreamLanes: activationPack.downstreamLanes,
    file: path.relative(root, filePath).replaceAll(path.sep, "/"),
  };
}

async function listActivationPacks(context) {
  await ensureDir(context.activationPacksDir);
  const dirents = await fs.readdir(context.activationPacksDir, { withFileTypes: true });
  const packs = [];
  for (const dirent of dirents) {
    if (!dirent.isFile() || !dirent.name.endsWith(".json")) continue;
    const fullPath = path.join(context.activationPacksDir, dirent.name);
    const pack = await readJson(fullPath, null);
    if (!pack) continue;
    packs.push({
      activationPackId: pack.activationPackId,
      generatedAt: pack.generatedAt,
      snapshotId: pack.snapshotId,
      scope: pack.scope,
      sourceApp: pack.sourceApp,
      owner: pack.owner,
      metrics: pack.metrics || {},
      actions: Array.isArray(pack.actions) ? pack.actions : [],
      downstreamLanes: Array.isArray(pack.downstreamLanes) ? pack.downstreamLanes : [],
      file: path.relative(root, fullPath).replaceAll(path.sep, "/"),
    });
  }
  packs.sort((a, b) => String(b.generatedAt || "").localeCompare(String(a.generatedAt || "")));
  return packs;
}

async function readActivationPack(context, activationPackId) {
  const packs = await listActivationPacks(context);
  const match = packs.find((item) => item.activationPackId === activationPackId);
  if (!match) return null;
  return readJson(path.join(root, match.file), null);
}

function summarizeWorkflowSteps(activationPack, requested = {}) {
  const actions = Array.isArray(activationPack?.actions) ? activationPack.actions : [];
  const owner = String(requested.owner || activationPack?.owner || "activation-ops");
  return actions.slice(0, Number(requested.maxSteps || 8)).map((action, index) => ({
    stepId: String(action.stepId || makeId("step")),
    lane: String(action.lane || "activation"),
    title: String(action.title || `Workflow step ${index + 1}`),
    detail: String(action.detail || ""),
    priority: String(action.priority || "medium"),
    owner: String(action.owner || owner),
    status: "queued",
  }));
}

function buildWorkflowSummary(activationPack, workflow) {
  const queued = workflow.steps.filter((step) => step.status === "queued").length;
  const active = workflow.steps.filter((step) => step.status === "active").length;
  const blocked = workflow.steps.filter((step) => step.status === "blocked").length;
  const completed = workflow.steps.filter((step) => step.status === "completed").length;
  const readyLanes = Array.isArray(activationPack?.downstreamLanes)
    ? activationPack.downstreamLanes.filter((lane) => lane.ready).map((lane) => lane.lane)
    : [];
  return {
    queued,
    active,
    blocked,
    completed,
    readyLanes,
    prioritizedAccounts: Number(activationPack?.metrics?.prioritizedAccounts || 0),
  };
}

async function saveActivationWorkflow(context, activationPack, body) {
  const requested = body && typeof body.activationWorkflow === "object" ? body.activationWorkflow : body;
  const workflow = {
    workflowId: String(requested.workflowId || makeId("workflow")),
    createdAt: requested.createdAt || new Date().toISOString(),
    updatedAt: requested.updatedAt || requested.createdAt || new Date().toISOString(),
    activationPackId: String(activationPack?.activationPackId || requested.activationPackId || ""),
    snapshotId: String(activationPack?.snapshotId || requested.snapshotId || ""),
    owner: String(requested.owner || activationPack?.owner || "activation-ops"),
    status: String(requested.status || "queued"),
    stage: String(requested.stage || "handoff-review"),
    label: String(requested.label || activationPack?.summaryText || "Activation workflow"),
    notes: String(requested.notes || ""),
    targets: Array.isArray(requested.targets) && requested.targets.length
      ? requested.targets.map((target) => String(target))
      : Array.isArray(activationPack?.downstreamLanes)
        ? activationPack.downstreamLanes.filter((lane) => lane.ready).map((lane) => String(lane.lane))
        : [],
    steps: summarizeWorkflowSteps(activationPack, requested),
  };
  workflow.summary = buildWorkflowSummary(activationPack, workflow);
  const fileName = `${workflow.createdAt.replaceAll(/[:.]/g, "-")}-${workflow.workflowId}.json`;
  const filePath = path.join(context.activationWorkflowsDir, fileName);
  await ensureDir(context.activationWorkflowsDir);
  await fs.writeFile(filePath, `${JSON.stringify(workflow, null, 2)}\n`, "utf8");
  return {
    workflowId: workflow.workflowId,
    createdAt: workflow.createdAt,
    updatedAt: workflow.updatedAt,
    activationPackId: workflow.activationPackId,
    snapshotId: workflow.snapshotId,
    owner: workflow.owner,
    status: workflow.status,
    stage: workflow.stage,
    label: workflow.label,
    notes: workflow.notes,
    targets: workflow.targets,
    steps: workflow.steps,
    summary: workflow.summary,
    file: path.relative(root, filePath).replaceAll(path.sep, "/"),
  };
}

async function listActivationWorkflows(context) {
  await ensureDir(context.activationWorkflowsDir);
  const dirents = await fs.readdir(context.activationWorkflowsDir, { withFileTypes: true });
  const workflows = [];
  for (const dirent of dirents) {
    if (!dirent.isFile() || !dirent.name.endsWith(".json")) continue;
    const fullPath = path.join(context.activationWorkflowsDir, dirent.name);
    const workflow = await readJson(fullPath, null);
    if (!workflow) continue;
    workflows.push({
      workflowId: workflow.workflowId,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt || workflow.createdAt,
      activationPackId: workflow.activationPackId,
      snapshotId: workflow.snapshotId,
      owner: workflow.owner,
      status: workflow.status,
      stage: workflow.stage,
      label: workflow.label,
      notes: workflow.notes || "",
      targets: Array.isArray(workflow.targets) ? workflow.targets : [],
      steps: Array.isArray(workflow.steps) ? workflow.steps : [],
      summary: workflow.summary || {},
      file: path.relative(root, fullPath).replaceAll(path.sep, "/"),
    });
  }
  workflows.sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")));
  return workflows;
}

async function readActivationWorkflow(context, workflowId) {
  const workflows = await listActivationWorkflows(context);
  const match = workflows.find((item) => item.workflowId === workflowId);
  if (!match) return null;
  const payload = await readJson(path.join(root, match.file), null);
  return payload ? Object.assign({}, payload, { file: match.file }) : null;
}

function buildExecutionSummary(item) {
  const steps = Array.isArray(item?.steps) ? item.steps : [];
  const targets = Array.isArray(item?.targets) ? item.targets : [];
  return {
    targetCount: targets.length,
    queuedSteps: steps.filter((step) => step.status === "queued").length,
    activeSteps: steps.filter((step) => step.status === "active").length,
    blockedSteps: steps.filter((step) => step.status === "blocked").length,
    completedSteps: steps.filter((step) => step.status === "completed").length,
  };
}

function summarizeDispatchBoard(items) {
  const boardItems = items.filter((item) => item.dispatch && typeof item.dispatch === "object");
  const counts = {
    queued: 0,
    ready: 0,
    active: 0,
    blocked: 0,
    delivered: 0,
    unassigned: 0,
  };
  for (const item of boardItems) {
    const status = String(item.dispatch?.status || "queued").toLowerCase();
    if (Object.prototype.hasOwnProperty.call(counts, status)) counts[status] += 1;
    if (!String(item.dispatch?.owner || "").trim()) counts.unassigned += 1;
  }
  return {
    total: boardItems.length,
    latestAt: boardItems[0]?.dispatch?.updatedAt || boardItems[0]?.updatedAt || boardItems[0]?.createdAt || null,
    counts,
    items: boardItems.map((item) => ({
      executionItemId: item.executionItemId,
      workflowId: item.workflowId,
      activationPackId: item.activationPackId,
      label: item.label,
      owner: item.owner,
      targets: item.targets,
      dispatch: item.dispatch,
      summary: item.summary || {},
      file: item.file,
    })),
  };
}

function categorizeWorkflowEvent(entry = {}) {
  const type = String(entry.type || "");
  if (type === "activation-pack") return "activation_pack";
  if (type === "activation-workflow" || type === "activation-workflow-update") return "workflow";
  if (type === "execution-board" || type === "execution-board-update") return "execution";
  if (type === "dispatch-board" || type === "dispatch-board-update") return "dispatch";
  return "other";
}

async function buildWorkflowTimeline(context, limit = 16) {
  const journal = await readJournal(context);
  const events = journal
    .map((entry) => ({
      id: String(entry.id || makeId("timeline")),
      type: String(entry.type || "event"),
      detail: String(entry.detail || ""),
      createdAt: entry.createdAt || null,
      category: categorizeWorkflowEvent(entry),
      meta: entry.meta && typeof entry.meta === "object" ? entry.meta : {},
    }))
    .filter((entry) => entry.category !== "other");
  return {
    summary: {
      activation_pack: events.filter((entry) => entry.category === "activation_pack").length,
      workflow: events.filter((entry) => entry.category === "workflow").length,
      execution: events.filter((entry) => entry.category === "execution").length,
      dispatch: events.filter((entry) => entry.category === "dispatch").length,
      total: events.length,
    },
    timeline: events.slice(0, Math.max(1, Number(limit || 16))),
  };
}

async function saveExecutionItem(context, activationWorkflow, body) {
  const requested = body && typeof body.executionItem === "object" ? body.executionItem : body;
  const item = {
    executionItemId: String(requested.executionItemId || makeId("execution")),
    createdAt: requested.createdAt || new Date().toISOString(),
    updatedAt: requested.updatedAt || requested.createdAt || new Date().toISOString(),
    workflowId: String(activationWorkflow?.workflowId || requested.workflowId || ""),
    activationPackId: String(activationWorkflow?.activationPackId || requested.activationPackId || ""),
    snapshotId: String(activationWorkflow?.snapshotId || requested.snapshotId || ""),
    label: String(requested.label || activationWorkflow?.label || "Activation execution board item"),
    owner: String(requested.owner || activationWorkflow?.owner || "activation-ops"),
    status: String(requested.status || "queued"),
    checkpoint: String(requested.checkpoint || "activation-queue"),
    dueAt: String(requested.dueAt || ""),
    notes: String(requested.notes || activationWorkflow?.notes || ""),
    nextAction: String(requested.nextAction || "Assign downstream owner and begin the first ready lane."),
    targets: Array.isArray(requested.targets) && requested.targets.length
      ? requested.targets.map((target) => String(target))
      : Array.isArray(activationWorkflow?.targets)
        ? activationWorkflow.targets.map((target) => String(target))
      : [],
    dispatch: null,
    steps: Array.isArray(activationWorkflow?.steps)
      ? activationWorkflow.steps.map((step) => ({
        stepId: String(step.stepId || makeId("step")),
        lane: String(step.lane || "activation"),
        title: String(step.title || "Execution step"),
        detail: String(step.detail || ""),
        priority: String(step.priority || "medium"),
        owner: String(step.owner || requested.owner || activationWorkflow?.owner || "activation-ops"),
        status: String(step.status || "queued"),
      }))
      : [],
  };
  item.summary = buildExecutionSummary(item);
  const fileName = `${item.createdAt.replaceAll(/[:.]/g, "-")}-${item.executionItemId}.json`;
  const filePath = path.join(context.executionBoardsDir, fileName);
  await ensureDir(context.executionBoardsDir);
  await fs.writeFile(filePath, `${JSON.stringify(item, null, 2)}\n`, "utf8");
  return {
    executionItemId: item.executionItemId,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    workflowId: item.workflowId,
    activationPackId: item.activationPackId,
    snapshotId: item.snapshotId,
    label: item.label,
    owner: item.owner,
    status: item.status,
    checkpoint: item.checkpoint,
    dueAt: item.dueAt,
    notes: item.notes,
    nextAction: item.nextAction,
    targets: item.targets,
    dispatch: item.dispatch,
    summary: item.summary,
    file: path.relative(root, filePath).replaceAll(path.sep, "/"),
  };
}

async function listExecutionBoard(context) {
  await ensureDir(context.executionBoardsDir);
  const dirents = await fs.readdir(context.executionBoardsDir, { withFileTypes: true });
  const items = [];
  for (const dirent of dirents) {
    if (!dirent.isFile() || !dirent.name.endsWith(".json")) continue;
    const fullPath = path.join(context.executionBoardsDir, dirent.name);
    const item = await readJson(fullPath, null);
    if (!item) continue;
    items.push({
      executionItemId: item.executionItemId,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt || item.createdAt,
      workflowId: item.workflowId,
      activationPackId: item.activationPackId,
      snapshotId: item.snapshotId,
      label: item.label,
      owner: item.owner,
      status: item.status,
      checkpoint: item.checkpoint || "",
      dueAt: item.dueAt || "",
      notes: item.notes || "",
      nextAction: item.nextAction || "",
      targets: Array.isArray(item.targets) ? item.targets : [],
      dispatch: item.dispatch && typeof item.dispatch === "object" ? item.dispatch : null,
      summary: item.summary || {},
      file: path.relative(root, fullPath).replaceAll(path.sep, "/"),
    });
  }
  items.sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")));
  return items;
}

async function readExecutionItem(context, executionItemId) {
  const items = await listExecutionBoard(context);
  const match = items.find((item) => item.executionItemId === executionItemId);
  if (!match) return null;
  const payload = await readJson(path.join(root, match.file), null);
  return payload ? Object.assign({}, payload, { file: match.file }) : null;
}

async function updateExecutionItem(context, executionItemId, body) {
  const item = await readExecutionItem(context, executionItemId);
  if (!item) return null;
  const patch = body && typeof body.executionItem === "object" ? body.executionItem : body;
  if (patch.owner != null) item.owner = String(patch.owner || item.owner);
  if (patch.status != null) item.status = String(patch.status || item.status);
  if (patch.checkpoint != null) item.checkpoint = String(patch.checkpoint || "");
  if (patch.dueAt != null) item.dueAt = String(patch.dueAt || "");
  if (patch.notes != null) item.notes = String(patch.notes || "");
  if (patch.nextAction != null) item.nextAction = String(patch.nextAction || "");
  if (Array.isArray(patch.targets)) item.targets = patch.targets.map((target) => String(target));
  item.updatedAt = patch.updatedAt || new Date().toISOString();
  item.summary = buildExecutionSummary(item);
  const filePath = path.join(root, item.file);
  await fs.writeFile(filePath, `${JSON.stringify(item, null, 2)}\n`, "utf8");
  return item;
}

async function updateActivationWorkflow(context, workflowId, body) {
  const workflow = await readActivationWorkflow(context, workflowId);
  if (!workflow) return null;
  const patch = body && typeof body.activationWorkflow === "object" ? body.activationWorkflow : body;
  if (patch.owner != null) workflow.owner = String(patch.owner || workflow.owner);
  if (patch.status != null) workflow.status = String(patch.status || workflow.status);
  if (patch.stage != null) workflow.stage = String(patch.stage || workflow.stage);
  if (patch.label != null) workflow.label = String(patch.label || workflow.label);
  if (patch.notes != null) workflow.notes = String(patch.notes || "");
  if (Array.isArray(patch.targets)) workflow.targets = patch.targets.map((target) => String(target));
  if (Array.isArray(patch.steps)) {
    workflow.steps = patch.steps.map((step, index) => ({
      stepId: String(step.stepId || makeId("step")),
      lane: String(step.lane || "activation"),
      title: String(step.title || `Workflow step ${index + 1}`),
      detail: String(step.detail || ""),
      priority: String(step.priority || "medium"),
      owner: String(step.owner || workflow.owner || "activation-ops"),
      status: String(step.status || "queued"),
    }));
  }
  workflow.updatedAt = patch.updatedAt || new Date().toISOString();
  workflow.summary = {
    queued: workflow.steps.filter((step) => step.status === "queued").length,
    active: workflow.steps.filter((step) => step.status === "active").length,
    blocked: workflow.steps.filter((step) => step.status === "blocked").length,
    completed: workflow.steps.filter((step) => step.status === "completed").length,
    readyLanes: Array.isArray(workflow.targets) ? workflow.targets : [],
    prioritizedAccounts: Number(workflow.summary?.prioritizedAccounts || 0),
  };
  const filePath = path.join(root, workflow.file);
  await fs.writeFile(filePath, `${JSON.stringify(workflow, null, 2)}\n`, "utf8");
  return workflow;
}

async function summarize(context) {
  const journal = await readJournal(context);
  const snapshots = await listSnapshots(context);
  const recoveryPacks = await listRecoveryPacks(context);
  const activationPacks = await listActivationPacks(context);
  const activationWorkflows = await listActivationWorkflows(context);
  const executionBoard = await listExecutionBoard(context);
  const dispatchBoard = summarizeDispatchBoard(executionBoard);
  const workflowTimeline = await buildWorkflowTimeline(context, 12);
  return {
    ok: true,
    app: "AE-FlowPro",
    mode: "same-folder-local-runtime",
    startedAt: context.startedAt,
    dataDir: path.relative(root, context.dataDir).replaceAll(path.sep, "/"),
    journal: {
      total: journal.length,
      latestAt: journal[0]?.createdAt || null,
      latestEntry: journal[0] || null,
    },
    snapshots: {
      total: snapshots.length,
      latestAt: snapshots[0]?.createdAt || null,
      latest: snapshots[0] || null,
    },
    recoveryPacks: {
      total: recoveryPacks.length,
      latestAt: recoveryPacks[0]?.generatedAt || null,
      latest: recoveryPacks[0] || null,
    },
    activationPacks: {
      total: activationPacks.length,
      latestAt: activationPacks[0]?.generatedAt || null,
      latest: activationPacks[0] || null,
    },
    activationWorkflows: {
      total: activationWorkflows.length,
      latestAt: activationWorkflows[0]?.updatedAt || activationWorkflows[0]?.createdAt || null,
      latest: activationWorkflows[0] || null,
    },
    executionBoard: {
      total: executionBoard.length,
      latestAt: executionBoard[0]?.updatedAt || executionBoard[0]?.createdAt || null,
      latest: executionBoard[0] || null,
    },
    dispatchBoard: {
      total: dispatchBoard.total,
      latestAt: dispatchBoard.latestAt,
      counts: dispatchBoard.counts,
      latest: dispatchBoard.items[0] || null,
    },
    workflowTimeline: workflowTimeline.summary,
  };
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

export async function createAEFlowLocalRuntime(options = {}) {
  const context = {
    dataDir: path.resolve(options.dataDir || defaultDataDir),
    journalPath: path.resolve(options.journalPath || defaultJournalPath),
    snapshotsDir: path.resolve(options.snapshotsDir || defaultSnapshotsDir),
    recoveryPacksDir: path.resolve(options.recoveryPacksDir || defaultRecoveryPacksDir),
    activationPacksDir: path.resolve(options.activationPacksDir || defaultActivationPacksDir),
    activationWorkflowsDir: path.resolve(options.activationWorkflowsDir || defaultActivationWorkflowsDir),
    executionBoardsDir: path.resolve(options.executionBoardsDir || defaultExecutionBoardsDir),
    startedAt: new Date().toISOString(),
  };

  await ensureDir(context.dataDir);
  await ensureDir(context.snapshotsDir);
  await ensureDir(context.recoveryPacksDir);
  await ensureDir(context.activationPacksDir);
  await ensureDir(context.activationWorkflowsDir);
  await ensureDir(context.executionBoardsDir);

  const server = http.createServer(async (req, res) => {
    const requestUrl = new URL(req.url || "/", "http://127.0.0.1");

    try {
      if (req.method === "GET" && requestUrl.pathname === "/health") {
        json(res, 200, await summarize(context));
        return;
      }

      if (req.method === "GET" && requestUrl.pathname === "/api/runtime/status") {
        json(res, 200, await summarize(context));
        return;
      }

      if (req.method === "GET" && requestUrl.pathname === "/api/runtime/journal") {
        const entries = await readJournal(context);
        json(res, 200, {
          ok: true,
          total: entries.length,
          entries,
        });
        return;
      }

      if (req.method === "POST" && requestUrl.pathname === "/api/runtime/journal") {
        const body = await readBody(req);
        const entry = await appendJournal(context, body);
        json(res, 200, {
          ok: true,
          entry,
          status: await summarize(context),
        });
        return;
      }

      if (req.method === "DELETE" && requestUrl.pathname === "/api/runtime/journal") {
        await writeJournal(context, []);
        json(res, 200, {
          ok: true,
          cleared: true,
          status: await summarize(context),
        });
        return;
      }

      if (req.method === "GET" && requestUrl.pathname === "/api/runtime/snapshots") {
        const snapshots = await listSnapshots(context);
        json(res, 200, {
          ok: true,
          total: snapshots.length,
          snapshots,
        });
        return;
      }

      if (req.method === "POST" && requestUrl.pathname === "/api/runtime/snapshots") {
        const body = await readBody(req);
        const snapshot = await saveSnapshot(context, body);
        await appendJournal(context, {
          type: "runtime-snapshot",
          detail: `Snapshot saved: ${snapshot.reason}`,
          createdAt: snapshot.createdAt,
          meta: {
            snapshotId: snapshot.snapshotId,
            file: snapshot.file,
          },
        });
        json(res, 200, {
          ok: true,
          snapshot,
          status: await summarize(context),
        });
        return;
      }

      if (req.method === "GET" && requestUrl.pathname.startsWith("/api/runtime/snapshots/")) {
        const snapshotId = decodeURIComponent(requestUrl.pathname.split("/").pop() || "");
        const snapshot = await readSnapshot(context, snapshotId);
        if (!snapshot) {
          json(res, 404, { ok: false, error: "snapshot-not-found", snapshotId });
          return;
        }
        json(res, 200, { ok: true, snapshot });
        return;
      }

      if (req.method === "GET" && requestUrl.pathname === "/api/runtime/recovery-packs") {
        const recoveryPacks = await listRecoveryPacks(context);
        json(res, 200, { ok: true, total: recoveryPacks.length, recoveryPacks });
        return;
      }

      if (req.method === "POST" && requestUrl.pathname === "/api/runtime/recovery-packs") {
        const body = await readBody(req);
        const snapshotId = String(body?.snapshotId || body?.recoveryPack?.snapshotId || "");
        const snapshot = snapshotId ? await readSnapshot(context, snapshotId) : sanitizeSnapshotBody(body);
        if (!snapshot) {
          json(res, 404, { ok: false, error: "snapshot-not-found", snapshotId });
          return;
        }
        const recoveryPack = await saveRecoveryPack(context, snapshot, body);
        await appendJournal(context, {
          type: "recovery-pack",
          detail: `Recovery pack prepared for ${recoveryPack.assignee}`,
          createdAt: recoveryPack.generatedAt,
          meta: {
            recoveryPackId: recoveryPack.recoveryPackId,
            snapshotId: recoveryPack.snapshotId,
            file: recoveryPack.file,
            metrics: recoveryPack.metrics,
          },
        });
        json(res, 200, { ok: true, recoveryPack, status: await summarize(context) });
        return;
      }

      if (req.method === "GET" && requestUrl.pathname.startsWith("/api/runtime/recovery-packs/")) {
        const recoveryPackId = decodeURIComponent(requestUrl.pathname.split("/").pop() || "");
        const recoveryPack = await readRecoveryPack(context, recoveryPackId);
        if (!recoveryPack) {
          json(res, 404, { ok: false, error: "recovery-pack-not-found", recoveryPackId });
          return;
        }
        json(res, 200, { ok: true, recoveryPack });
        return;
      }

      if (req.method === "GET" && requestUrl.pathname === "/api/runtime/activation-packs") {
        const activationPacks = await listActivationPacks(context);
        json(res, 200, { ok: true, total: activationPacks.length, activationPacks });
        return;
      }

      if (req.method === "POST" && requestUrl.pathname === "/api/runtime/activation-packs") {
        const body = await readBody(req);
        const snapshotId = String(body?.snapshotId || body?.activationPack?.snapshotId || "");
        const snapshot = snapshotId ? await readSnapshot(context, snapshotId) : sanitizeSnapshotBody(body);
        if (!snapshot) {
          json(res, 404, { ok: false, error: "snapshot-not-found", snapshotId });
          return;
        }
        const activationPack = await saveActivationPack(context, snapshot, body);
        await appendJournal(context, {
          type: "activation-pack",
          detail: `Activation pack prepared for ${activationPack.owner}`,
          createdAt: activationPack.generatedAt,
          meta: {
            activationPackId: activationPack.activationPackId,
            snapshotId: activationPack.snapshotId,
            file: activationPack.file,
            metrics: activationPack.metrics,
          },
        });
        json(res, 200, { ok: true, activationPack, status: await summarize(context) });
        return;
      }

      if (req.method === "GET" && requestUrl.pathname.startsWith("/api/runtime/activation-packs/")) {
        const activationPackId = decodeURIComponent(requestUrl.pathname.split("/").pop() || "");
        const activationPack = await readActivationPack(context, activationPackId);
        if (!activationPack) {
          json(res, 404, { ok: false, error: "activation-pack-not-found", activationPackId });
          return;
        }
        json(res, 200, { ok: true, activationPack });
        return;
      }

      if (req.method === "GET" && requestUrl.pathname === "/api/runtime/activation-workflows") {
        const activationWorkflows = await listActivationWorkflows(context);
        json(res, 200, { ok: true, total: activationWorkflows.length, activationWorkflows });
        return;
      }

      if (req.method === "POST" && requestUrl.pathname === "/api/runtime/activation-workflows") {
        const body = await readBody(req);
        const activationPackId = String(body?.activationPackId || body?.activationWorkflow?.activationPackId || "");
        const activationPack = activationPackId ? await readActivationPack(context, activationPackId) : null;
        if (!activationPack) {
          json(res, 404, { ok: false, error: "activation-pack-not-found", activationPackId });
          return;
        }
        const activationWorkflow = await saveActivationWorkflow(context, activationPack, body);
        await appendJournal(context, {
          type: "activation-workflow",
          detail: `Activation workflow queued for ${activationWorkflow.owner}`,
          createdAt: activationWorkflow.createdAt,
          meta: {
            workflowId: activationWorkflow.workflowId,
            activationPackId: activationWorkflow.activationPackId,
            file: activationWorkflow.file,
            summary: activationWorkflow.summary,
          },
        });
        json(res, 200, { ok: true, activationWorkflow, status: await summarize(context) });
        return;
      }

      if (req.method === "GET" && requestUrl.pathname.startsWith("/api/runtime/activation-workflows/")) {
        const workflowId = decodeURIComponent(requestUrl.pathname.split("/").pop() || "");
        const activationWorkflow = await readActivationWorkflow(context, workflowId);
        if (!activationWorkflow) {
          json(res, 404, { ok: false, error: "activation-workflow-not-found", workflowId });
          return;
        }
        json(res, 200, { ok: true, activationWorkflow });
        return;
      }

      if ((req.method === "PATCH" || req.method === "PUT") && requestUrl.pathname.startsWith("/api/runtime/activation-workflows/")) {
        const workflowId = decodeURIComponent(requestUrl.pathname.split("/").pop() || "");
        const body = await readBody(req);
        const activationWorkflow = await updateActivationWorkflow(context, workflowId, body);
        if (!activationWorkflow) {
          json(res, 404, { ok: false, error: "activation-workflow-not-found", workflowId });
          return;
        }
        await appendJournal(context, {
          type: "activation-workflow-update",
          detail: `Activation workflow updated for ${activationWorkflow.owner}`,
          createdAt: activationWorkflow.updatedAt,
          meta: {
            workflowId: activationWorkflow.workflowId,
            status: activationWorkflow.status,
            stage: activationWorkflow.stage,
            summary: activationWorkflow.summary,
          },
        });
        json(res, 200, { ok: true, activationWorkflow, status: await summarize(context) });
        return;
      }

      if (req.method === "GET" && requestUrl.pathname === "/api/runtime/execution-board") {
        const executionBoard = await listExecutionBoard(context);
        json(res, 200, { ok: true, total: executionBoard.length, executionBoard });
        return;
      }

      if (req.method === "GET" && requestUrl.pathname === "/api/runtime/dispatch-board") {
        const dispatchBoard = summarizeDispatchBoard(await listExecutionBoard(context));
        json(res, 200, { ok: true, dispatchBoard });
        return;
      }

      if (req.method === "GET" && requestUrl.pathname === "/api/runtime/workflow-timeline") {
        const limit = Number(requestUrl.searchParams.get("limit") || "16");
        json(res, 200, { ok: true, workflowTimeline: await buildWorkflowTimeline(context, limit) });
        return;
      }

      if (req.method === "POST" && requestUrl.pathname.startsWith("/api/runtime/activation-workflows/") && requestUrl.pathname.endsWith("/execution")) {
        const parts = requestUrl.pathname.split("/");
        const workflowId = decodeURIComponent(parts[parts.length - 2] || "");
        const body = await readBody(req);
        const activationWorkflow = await readActivationWorkflow(context, workflowId);
        if (!activationWorkflow) {
          json(res, 404, { ok: false, error: "activation-workflow-not-found", workflowId });
          return;
        }
        const executionItem = await saveExecutionItem(context, activationWorkflow, body);
        await appendJournal(context, {
          type: "execution-board",
          detail: `Execution board item queued for ${executionItem.owner}`,
          createdAt: executionItem.createdAt,
          meta: {
            executionItemId: executionItem.executionItemId,
            workflowId: executionItem.workflowId,
            status: executionItem.status,
            checkpoint: executionItem.checkpoint,
          },
        });
        json(res, 200, { ok: true, executionItem, status: await summarize(context) });
        return;
      }

      if (req.method === "GET" && requestUrl.pathname.startsWith("/api/runtime/execution-board/")) {
        const executionItemId = decodeURIComponent(requestUrl.pathname.split("/").pop() || "");
        const executionItem = await readExecutionItem(context, executionItemId);
        if (!executionItem) {
          json(res, 404, { ok: false, error: "execution-item-not-found", executionItemId });
          return;
        }
        json(res, 200, { ok: true, executionItem });
        return;
      }

      if ((req.method === "PATCH" || req.method === "PUT") && requestUrl.pathname.startsWith("/api/runtime/execution-board/")) {
        const executionItemId = decodeURIComponent(requestUrl.pathname.split("/").pop() || "");
        const body = await readBody(req);
        const executionItem = await updateExecutionItem(context, executionItemId, body);
        if (!executionItem) {
          json(res, 404, { ok: false, error: "execution-item-not-found", executionItemId });
          return;
        }
        await appendJournal(context, {
          type: "execution-board-update",
          detail: `Execution board item updated for ${executionItem.owner}`,
          createdAt: executionItem.updatedAt,
          meta: {
            executionItemId: executionItem.executionItemId,
            status: executionItem.status,
            checkpoint: executionItem.checkpoint,
          },
        });
        json(res, 200, { ok: true, executionItem, status: await summarize(context) });
        return;
      }

      if (req.method === "POST" && requestUrl.pathname.startsWith("/api/runtime/execution-board/") && requestUrl.pathname.endsWith("/dispatch")) {
        const parts = requestUrl.pathname.split("/");
        const executionItemId = decodeURIComponent(parts[parts.length - 2] || "");
        const body = await readBody(req);
        const executionItem = await readExecutionItem(context, executionItemId);
        if (!executionItem) {
          json(res, 404, { ok: false, error: "execution-item-not-found", executionItemId });
          return;
        }
        executionItem.dispatch = normalizeDispatchState(body?.dispatch || body, executionItem);
        executionItem.dispatch.updatedAt = executionItem.dispatch.updatedAt || new Date().toISOString();
        executionItem.updatedAt = executionItem.dispatch.updatedAt;
        const filePath = path.join(root, executionItem.file);
        await fs.writeFile(filePath, `${JSON.stringify(executionItem, null, 2)}\n`, "utf8");
        await appendJournal(context, {
          type: executionItem.dispatch.status === "delivered" ? "dispatch-board-update" : "dispatch-board",
          detail: `Dispatch board updated for ${executionItem.dispatch.owner}`,
          createdAt: executionItem.dispatch.updatedAt,
          meta: {
            executionItemId: executionItem.executionItemId,
            workflowId: executionItem.workflowId,
            status: executionItem.dispatch.status,
            checkpoint: executionItem.dispatch.checkpoint,
            target: executionItem.dispatch.target,
            channel: executionItem.dispatch.channel,
          },
        });
        const dispatchBoard = summarizeDispatchBoard(await listExecutionBoard(context));
        json(res, 200, { ok: true, executionItem, dispatchBoard, status: await summarize(context) });
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
    close: async () =>
      new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
  };
}

const isEntrypoint = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isEntrypoint) {
  const host = process.env.AE_FLOW_RUNTIME_HOST || "127.0.0.1";
  const port = Number(process.env.AE_FLOW_RUNTIME_PORT || "4187");
  const runtime = await createAEFlowLocalRuntime({
    dataDir: process.env.AE_FLOW_RUNTIME_DATA_DIR,
    journalPath: process.env.AE_FLOW_RUNTIME_JOURNAL_PATH,
    snapshotsDir: process.env.AE_FLOW_RUNTIME_SNAPSHOTS_DIR,
    recoveryPacksDir: process.env.AE_FLOW_RUNTIME_RECOVERY_PACKS_DIR,
    activationPacksDir: process.env.AE_FLOW_RUNTIME_ACTIVATION_PACKS_DIR,
    activationWorkflowsDir: process.env.AE_FLOW_RUNTIME_ACTIVATION_WORKFLOWS_DIR,
    executionBoardsDir: process.env.AE_FLOW_RUNTIME_EXECUTION_BOARDS_DIR,
  });
  runtime.server.listen(port, host, () => {
    const address = runtime.server.address();
    const resolvedPort = typeof address === "object" && address ? address.port : port;
    console.log(
      JSON.stringify({
        ok: true,
        app: "AE-FlowPro",
        mode: "same-folder-local-runtime",
        url: `http://${host}:${resolvedPort}`,
        dataDir: path.relative(root, runtime.context.dataDir).replaceAll(path.sep, "/"),
      }),
    );
  });
}
