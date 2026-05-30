#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createBusinessLaunchGoLocalRuntime } from "../runtime/local-runtime.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) throw new Error(`Missing required file: ${rel}`);
  return fs.readFileSync(full, "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function checkNode(rel) {
  const sourcePath = path.join(root, rel);
  const source = fs.readFileSync(sourcePath, "utf8");
  const ext = /\bexport\s+async\s+function\b|\bexport\s+function\b/.test(source) ? ".mjs" : ".js";
  const tempPath = path.join(os.tmpdir(), `businesslaunchgo-proof-${path.basename(rel, path.extname(rel))}-${process.pid}${ext}`);
  fs.writeFileSync(tempPath, source);
  const result = spawnSync(process.execPath, ["--check", tempPath], { encoding: "utf8" });
  fs.unlinkSync(tempPath);
  assert(result.status === 0, `${rel} failed syntax check: ${result.stderr || result.stdout}`);
}

const indexHtml = read("index.html");
const html = indexHtml;
const app = read("assets/app.js");
const zipHelper = read("assets/zip.js");
const runtimeModule = read("runtime/local-runtime.mjs");

assert(!exists("app.html"), "app.html should not exist; BusinessLaunchGo must use one canonical root app");
assert(html.includes('id="btnGenerateZip"'), "index.html is missing ZIP generation control");
assert(html.includes('id="btnExportPdf"'), "index.html is missing PDF export control");
assert(html.includes('id="btnCreateLaunchPlan"'), "index.html is missing local launch plan control");
assert(html.includes('id="btnCreateHandoffPack"'), "index.html is missing handoff pack control");
assert(html.includes('id="handoffArchive"'), "index.html is missing handoff archive surface");
assert(html.includes('id="btnSaveHandoffReview"'), "index.html is missing handoff review save control");
assert(html.includes('id="btnAdvanceReview"'), "index.html is missing handoff review advance control");
assert(html.includes('id="handoffReviewBoard"'), "index.html is missing handoff review board surface");
assert(html.includes('id="btnSaveExecution"'), "index.html is missing execution save control");
assert(html.includes('id="btnAdvanceExecution"'), "index.html is missing execution advance control");
assert(html.includes('id="handoffExecutionBoard"'), "index.html is missing execution board surface");
assert(html.includes('id="btnSaveDispatch"'), "index.html is missing dispatch save control");
assert(html.includes('id="btnAdvanceDispatch"'), "index.html is missing dispatch advance control");
assert(html.includes('id="handoffDispatchBoard"'), "index.html is missing dispatch board surface");
assert(html.includes('id="handoffWorkflowTimeline"'), "index.html is missing workflow timeline surface");
assert(html.includes('id="runtimeLaneStatus"'), "index.html is missing local runtime status surface");
assert(html.includes('id="runtimeLaneCounts"'), "index.html is missing local runtime counts surface");
assert(html.includes("SkyeMediaCenter Bridge"), "index.html is missing SkyeMediaCenter integration surface");
assert(html.includes('form id="leadForm"'), "index.html is missing the lead form");
assert(html.includes('id="diagModal"'), "index.html is missing diagnostics modal wiring");

assert(app.includes("probeRuntimeLane"), "assets/app.js is missing runtime probing");
assert(app.includes("/api/runtime/status"), "assets/app.js is missing runtime status endpoint wiring");
assert(app.includes("saveRuntimeLead"), "assets/app.js is missing local runtime lead persistence wiring");
assert(app.includes("saveRuntimeLaunchPlan"), "assets/app.js is missing local runtime launch plan wiring");
assert(app.includes("saveRuntimeHandoffPack"), "assets/app.js is missing handoff pack runtime wiring");
assert(app.includes("saveRuntimeHandoffReview"), "assets/app.js is missing handoff review runtime wiring");
assert(app.includes("saveRuntimeHandoffExecution"), "assets/app.js is missing handoff execution runtime wiring");
assert(app.includes("saveRuntimeHandoffDispatch"), "assets/app.js is missing handoff dispatch runtime wiring");
assert(app.includes("buildHandoffPackPayload"), "assets/app.js is missing handoff payload builder");
assert(app.includes("buildHandoffReviewPayload"), "assets/app.js is missing handoff review payload builder");
assert(app.includes("buildHandoffExecutionPayload"), "assets/app.js is missing handoff execution payload builder");
assert(app.includes("buildHandoffDispatchPayload"), "assets/app.js is missing handoff dispatch payload builder");
assert(app.includes("refreshRuntimeHandoffArchive"), "assets/app.js is missing handoff archive refresh");
assert(app.includes("/api/runtime/dispatch-board"), "assets/app.js is missing dispatch board endpoint wiring");
assert(app.includes("/api/runtime/workflow-timeline"), "assets/app.js is missing workflow timeline endpoint wiring");
assert(app.includes("saveRuntimePackActivity"), "assets/app.js is missing local runtime pack activity wiring");
assert(app.includes("buildLaunchPlanPayload"), "assets/app.js is missing launch plan payload builder");
assert(app.includes("SkyeMediaCenter"), "assets/app.js is missing SkyeMediaCenter target inference");
assert(app.includes("neon-lead-upsert"), "assets/app.js is missing Neon lead upsert endpoint wiring");
assert(app.includes("neon-health"), "assets/app.js is missing Neon health wiring");
assert(app.includes("blob-store-pack"), "assets/app.js is missing blob storage wiring");
assert(app.includes("client-error-report"), "assets/app.js is missing client error reporting wiring");
assert(app.includes("buildPortableSummary"), "assets/app.js is missing the local PDF/text fallback");
assert(zipHelper.includes("buildPortableArchive"), "assets/zip.js is missing the local archive fallback");
assert(zipHelper.includes("buildDocsMap"), "assets/zip.js is missing the reusable docs map builder");

assert(runtimeModule.includes("/api/runtime/leads"), "runtime/local-runtime.mjs is missing leads endpoint");
assert(runtimeModule.includes("/api/runtime/launch-plans"), "runtime/local-runtime.mjs is missing launch plan endpoint");
assert(runtimeModule.includes("/api/runtime/handoff-packs"), "runtime/local-runtime.mjs is missing handoff pack endpoint");
assert(runtimeModule.includes("/api/runtime/review-board"), "runtime/local-runtime.mjs is missing review board endpoint");
assert(runtimeModule.includes("/api/runtime/execution-board"), "runtime/local-runtime.mjs is missing execution board endpoint");
assert(runtimeModule.includes("/api/runtime/dispatch-board"), "runtime/local-runtime.mjs is missing dispatch board endpoint");
assert(runtimeModule.includes("SkyeMediaCenter"), "runtime/local-runtime.mjs is missing SkyeMediaCenter handoff support");
assert(runtimeModule.includes("/api/runtime/workflow-timeline"), "runtime/local-runtime.mjs is missing workflow timeline endpoint");
assert(runtimeModule.includes("/api/runtime/pack-activity"), "runtime/local-runtime.mjs is missing pack activity endpoint");
assert(runtimeModule.includes("same-folder-local-runtime"), "runtime/local-runtime.mjs is missing runtime mode identity");

for (const rel of [
  "assets/zip.js",
  "schema.sql",
  "runtime/store.json",
  "netlify/functions/client-error-report.js",
  "netlify/functions/neon-lead-upsert.js",
  "netlify/functions/neon-health.js",
  "netlify/functions/blob-store-pack.js",
  "runtime/local-runtime.mjs"
]) {
  assert(exists(rel), `Missing required surface: ${rel}`);
}

for (const rel of [
  "netlify/functions/client-error-report.js",
  "netlify/functions/neon-lead-upsert.js",
  "netlify/functions/neon-health.js",
  "netlify/functions/blob-store-pack.js",
  "runtime/local-runtime.mjs"
]) {
  checkNode(rel);
}

assert(zipHelper.includes("README.md"), "assets/zip.js no longer defines pack documents");
assert(zipHelper.includes("policy-starters.md"), "assets/zip.js no longer includes policy starters");

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "businesslaunchgo-runtime-"));
const runtimeStorePath = path.join(tempDir, "store.json");

let runtime = null;
try {
  runtime = await createBusinessLaunchGoLocalRuntime({ storePath: runtimeStorePath });
  await new Promise((resolve, reject) => {
    runtime.server.once("error", reject);
    runtime.server.listen(0, "127.0.0.1", resolve);
  });

  const address = runtime.server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  const baseUrl = `http://127.0.0.1:${port}`;

  const servedIndex = await fetch(`${baseUrl}/`).then((res) => res.text());
  assert(servedIndex.includes('id="runtimeLaneStatus"'), "Runtime root did not serve the canonical app surface");

  const health = await fetch(`${baseUrl}/health`).then((res) => res.json());
  assert(health.ok, "Health endpoint did not report ok");
  assert(health.mode === "same-folder-local-runtime", "Health endpoint reported the wrong runtime mode");

  const leadResponse = await fetch(`${baseUrl}/api/runtime/leads`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      lead: {
        name: "Maggie Stone",
        email: "maggie@internal.invalid",
        phone: "602-555-0148",
        company: "Maggie's Launch Kitchen",
        message: "Need a local launch plan and intake flow."
      },
      inputs: {
        businessName: "Maggie's Launch Kitchen",
        city: "Phoenix",
        industry: "Restaurant",
        ownersCount: 2,
        hireEmployees: true
      },
      checklist: {
        entity_type: true,
        name_search: true,
        get_ein: true,
        intake: true,
        website_core: false
      },
      reportSummary: "Smoke lead submission"
    })
  }).then((res) => res.json());
  assert(leadResponse.ok, "Lead POST failed");
  assert(leadResponse.lead.progress.done >= 4, "Lead progress was not computed");

  const launchPlanResponse = await fetch(`${baseUrl}/api/runtime/launch-plans`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      leadId: leadResponse.lead.leadId,
      inputs: {
        businessName: "Maggie's Launch Kitchen",
        city: "Phoenix",
        industry: "Restaurant",
        ownersCount: 2,
        hireEmployees: true
      },
      checklist: {
        entity_type: true,
        name_search: true,
        get_ein: true,
        intake: true,
        website_core: false,
        gbp: false
      },
      reportSummary: "Smoke launch plan"
    })
  }).then((res) => res.json());
  assert(launchPlanResponse.ok, "Launch plan POST failed");
  assert(Array.isArray(launchPlanResponse.launchPlan.recommendedActions), "Launch plan actions were not derived");
  assert(launchPlanResponse.launchPlan.recommendedActions.some((item) => item.includes("website")), "Launch plan did not include website follow-up");
  const planId = launchPlanResponse.launchPlan.planId;

  const handoffPackResponse = await fetch(`${baseUrl}/api/runtime/handoff-packs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      label: "Phoenix Launch Handoff",
      leadId: leadResponse.lead.leadId,
      planId,
      operatorNotes: "Push storefront, invoicing, and hiring follow-up into downstream lanes.",
      inputs: launchPlanResponse.launchPlan.inputs,
      checklist: launchPlanResponse.launchPlan.checklist,
      downstreamTargets: ["SkyeMediaCenter", "AE-FlowPro", "SkyeWebCreatorMax", "skyeroutex-workforce-command-v0.4.0"],
      sourcePlan: launchPlanResponse.launchPlan
    })
  }).then((res) => res.json());
  assert(handoffPackResponse.ok, "Handoff pack POST failed");
  assert(Array.isArray(handoffPackResponse.handoffPack.downstreamTargets), "Handoff pack targets were not persisted");
  assert(handoffPackResponse.handoffPack.downstreamTargets.includes("SkyeMediaCenter"), "Handoff pack media-center target failed to persist");
  assert(handoffPackResponse.handoffPack.downstreamTargets.includes("AE-FlowPro"), "Handoff pack target inference/persistence failed");
  assert(handoffPackResponse.handoffPack.review?.status === "draft", "Handoff pack review did not default to draft");

  const reviewResponse = await fetch(`${baseUrl}/api/runtime/handoff-packs/${encodeURIComponent(handoffPackResponse.handoffPack.packId)}/review`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      owner: "launch-ops",
      status: "approved",
      checkpoint: "storefront-ready",
      notes: "Dispatch to storefront and ops lanes."
    })
  }).then((res) => res.json());
  assert(reviewResponse.ok, "Handoff review POST failed");
  assert(reviewResponse.handoffPack.review.status === "approved", "Handoff review status did not persist");
  assert(reviewResponse.handoffPack.review.owner === "launch-ops", "Handoff review owner did not persist");

  const executionResponse = await fetch(`${baseUrl}/api/runtime/handoff-packs/${encodeURIComponent(handoffPackResponse.handoffPack.packId)}/execution`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      owner: "launch-dispatch",
      status: "active",
      checkpoint: "site-and-billing-live",
      nextAction: "Open downstream storefront and finance lanes.",
      dueAt: "2026-05-03T18:00:00Z",
      notes: "Execution has started across storefront and finance targets."
    })
  }).then((res) => res.json());
  assert(executionResponse.ok, "Handoff execution POST failed");
  assert(executionResponse.handoffPack.execution.status === "active", "Handoff execution status did not persist");
  assert(executionResponse.handoffPack.execution.owner === "launch-dispatch", "Handoff execution owner did not persist");

  const dispatchResponse = await fetch(`${baseUrl}/api/runtime/handoff-packs/${encodeURIComponent(handoffPackResponse.handoffPack.packId)}/dispatch`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      owner: "launch-closure",
      status: "active",
      checkpoint: "downstream-owners-notified",
      target: "AE-FlowPro",
      channel: "downstream-launch-dispatch",
      nextAction: "Confirm downstream owner acceptance and activation timing.",
      dueAt: "2026-05-03T20:00:00Z",
      notes: "Dispatch has been opened across launch and storefront lanes."
    })
  }).then((res) => res.json());
  assert(dispatchResponse.ok, "Handoff dispatch POST failed");
  assert(dispatchResponse.handoffPack.dispatch.status === "active", "Handoff dispatch status did not persist");
  assert(dispatchResponse.handoffPack.dispatch.owner === "launch-closure", "Handoff dispatch owner did not persist");

  const packActivityResponse = await fetch(`${baseUrl}/api/runtime/pack-activity`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      type: "zip_generated",
      file: "AZ-Launch-Pack-Maggies-Launch-Kitchen.zip",
      archiveFormat: "zip",
      inputs: {
        businessName: "Maggie's Launch Kitchen",
        city: "Phoenix",
        industry: "Restaurant",
        ownersCount: 2,
        hireEmployees: true
      },
      progress: { total: 19, done: 4, pct: 21 }
    })
  }).then((res) => res.json());
  assert(packActivityResponse.ok, "Pack activity POST failed");

  const status = await fetch(`${baseUrl}/api/runtime/status`).then((res) => res.json());
  assert(status.leads.total === 1, "Runtime status did not include saved lead");
  assert(status.launchPlans.total === 1, "Runtime status did not include saved launch plan");
  assert(status.handoffPacks.total === 1, "Runtime status did not include saved handoff pack");
  assert(status.reviewBoard.approved === 1, "Runtime status did not include saved review-board counts");
  assert(status.executionBoard.active === 1, "Runtime status did not include saved execution-board counts");
  assert(status.dispatchBoard.active === 1, "Runtime status did not include saved dispatch-board counts");
  assert(status.packActivity.total === 1, "Runtime status did not include saved pack activity");
  assert(status.workflowTimeline.dispatch === 1, "Runtime status did not include saved workflow timeline counts");

  const leads = await fetch(`${baseUrl}/api/runtime/leads`).then((res) => res.json());
  assert(leads.total === 1, "Lead listing did not include saved lead");

  const plans = await fetch(`${baseUrl}/api/runtime/launch-plans`).then((res) => res.json());
  assert(plans.total === 1, "Launch plan listing did not include saved plan");
  const fetchedPlan = await fetch(`${baseUrl}/api/runtime/launch-plans/${encodeURIComponent(planId)}`).then((res) => res.json());
  assert(fetchedPlan.ok, "Launch plan fetch by id failed");
  assert(fetchedPlan.launchPlan.leadId === leadResponse.lead.leadId, "Fetched plan lead link mismatch");

  const handoffPacks = await fetch(`${baseUrl}/api/runtime/handoff-packs`).then((res) => res.json());
  assert(handoffPacks.total === 1, "Handoff pack listing did not include saved pack");
  const packId = handoffPackResponse.handoffPack.packId;
  const fetchedPack = await fetch(`${baseUrl}/api/runtime/handoff-packs/${encodeURIComponent(packId)}`).then((res) => res.json());
  assert(fetchedPack.ok, "Handoff pack fetch by id failed");
  assert(fetchedPack.handoffPack.planId === planId, "Fetched handoff pack plan link mismatch");
  assert(fetchedPack.handoffPack.execution?.status === "active", "Fetched handoff pack execution state mismatch");
  assert(fetchedPack.handoffPack.dispatch?.status === "active", "Fetched handoff pack dispatch state mismatch");

  const executionBoard = await fetch(`${baseUrl}/api/runtime/execution-board`).then((res) => res.json());
  assert(executionBoard.ok, "Execution board fetch failed");
  assert(executionBoard.summary.active === 1, "Execution board summary did not include active execution");
  assert(fetchedPack.handoffPack.review.status === "approved", "Fetched handoff pack review state mismatch");

  const reviewBoard = await fetch(`${baseUrl}/api/runtime/review-board`).then((res) => res.json());
  assert(reviewBoard.ok, "Review board fetch failed");
  assert(reviewBoard.summary.total === 1, "Review board total did not include saved pack");
  assert(reviewBoard.summary.approved === 1, "Review board approved count mismatch");
  assert(reviewBoard.summary.unassigned === 0, "Review board unassigned count mismatch");

  const dispatchBoard = await fetch(`${baseUrl}/api/runtime/dispatch-board`).then((res) => res.json());
  assert(dispatchBoard.ok, "Dispatch board fetch failed");
  assert(dispatchBoard.summary.active === 1, "Dispatch board summary did not include active dispatch");

  const workflowTimeline = await fetch(`${baseUrl}/api/runtime/workflow-timeline`).then((res) => res.json());
  assert(workflowTimeline.ok, "Workflow timeline fetch failed");
  assert(workflowTimeline.summary.total >= 4, "Workflow timeline did not include closure events");
  assert(workflowTimeline.summary.dispatch === 1, "Workflow timeline dispatch count mismatch");

  const packActivity = await fetch(`${baseUrl}/api/runtime/pack-activity`).then((res) => res.json());
  assert(packActivity.total === 1, "Pack activity listing did not include saved activity");
  assert(fs.existsSync(runtimeStorePath), "Runtime store file was not written");

  console.log(JSON.stringify({
    ok: true,
    app: "BusinessLaunchGo",
    surface: "browser launch generator with same-folder local runtime for leads, launch plans, handoff packs, review workflow, execution workflow, dispatch workflow, and timeline closure",
    verified: [
      "index.html contains runtime status, handoff archive, handoff review, execution, dispatch, and workflow timeline controls",
      "browser app wiring references same-folder local runtime leads, launch plans, handoff review, execution, dispatch, workflow timeline, and pack activity",
      "schema, runtime store, Netlify functions, and runtime module exist",
      "Netlify functions and runtime module pass node --check",
      "same-folder local runtime served the updated shell and health endpoint",
      "same-folder local runtime accepted lead, launch plan, handoff pack, handoff review, execution, and pack activity writes",
      "launch plan endpoint derived readiness and recommended follow-up actions from checklist state",
      "handoff review state persisted and rolled into a local review-board summary",
      "handoff execution state persisted and rolled into a local execution-board summary",
      "handoff dispatch state persisted and rolled into a local dispatch-board summary",
      "workflow timeline persisted archive, review, execution, and dispatch events"
    ],
    runtime_proof: {
      statusCounts: {
        leads: status.leads.total,
        launchPlans: status.launchPlans.total,
        handoffPacks: status.handoffPacks.total,
        approvedReviews: status.reviewBoard.approved,
        activeExecutions: status.executionBoard.active,
        activeDispatches: status.dispatchBoard.active,
        packActivity: status.packActivity.total
      },
      readiness: launchPlanResponse.launchPlan.readiness,
      recommendedActions: launchPlanResponse.launchPlan.recommendedActions,
      downstreamTargets: handoffPackResponse.handoffPack.downstreamTargets,
      reviewBoard: reviewBoard.summary,
      executionBoard: executionBoard.summary,
      dispatchBoard: dispatchBoard.summary,
      workflowTimeline: workflowTimeline.summary
    },
    not_proven: [
      "live Netlify deploy behavior",
      "actual Neon connectivity",
      "actual blob persistence",
      "multi-operator or deployed collaboration beyond same-folder local runtime"
    ]
  }, null, 2));
} finally {
  if (runtime && runtime.server.listening) await runtime.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
}
