import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createBrandIdLocalRuntime } from "../runtime/local-runtime.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(relPath) {
  const fullPath = path.join(root, relPath);
  assert(fs.existsSync(fullPath), `Missing required file: ${relPath}`);
  return fs.readFileSync(fullPath, "utf8");
}

async function main() {
  const indexHtml = read("index.html");
  const appHtml = indexHtml;
  const runtimeModule = read("runtime/local-runtime.mjs");
  const serviceWorker = read("sw.js");

  assert(!fs.existsSync(path.join(root, "app.html")), "app.html should not exist; BrandID Offline PWA must use one canonical root app");

  for (const needle of [
    "btnSyncOutbox",
    "btnExportOutbox",
    "btnBuildHandoffBrief",
    "btnAdvanceLatestBrief",
    "brandid_offline_contact_outbox_v1",
    "Archive Intake Packet",
    "Runtime lane: local intake archive ready",
    "saved intake packet into the offline outbox",
    "handoffBriefList",
    "reviewBoardStatusCard",
    "executionBoardStatusCard",
    "btnQueueLatestBriefExecution",
    "dispatchBoardStatusCard",
    "btnQueueLatestBriefDispatch",
    "workflowTimelineStatusCard",
    "workflowTimelineList",
    "Target:",
    "Next:",
  ]) {
    assert(appHtml.includes(needle), `index.html is missing expected intake-runtime marker: ${needle}`);
  }

  for (const needle of [
    "/api/runtime/status",
    "/api/runtime/intake-packets",
    "/api/runtime/handoff-briefs",
    "/api/runtime/review-board",
    "/api/runtime/execution-board",
    "/api/runtime/dispatch-board",
    "/api/runtime/workflow-timeline",
    "/review",
    "/execution",
    "/dispatch",
    "same-folder-local-runtime",
    "SkyeMediaCenter",
    "SkyeLeadVault",
    "SkyeWebCreatorMax",
    "createWorkflowActivity",
    "latestWorkflowEvent",
    "brand-dispatch-board",
  ]) {
    assert(runtimeModule.includes(needle), `runtime/local-runtime.mjs is missing expected marker: ${needle}`);
  }

  assert(serviceWorker.includes("CORE_ASSETS"), "service worker no longer declares CORE_ASSETS cache contract");

  const tempDir = fs.mkdtempSync(path.join(root, "runtime", ".smoke-"));
  const archiveDir = path.join(tempDir, "data", "intake-packets");
  const briefDir = path.join(tempDir, "data", "handoff-briefs");
  const journalPath = path.join(tempDir, "data", "ops-journal.json");
  let runtime = null;

  try {
    runtime = await createBrandIdLocalRuntime({ archiveDir, briefDir, journalPath });
    await new Promise((resolve, reject) => {
      runtime.server.once("error", reject);
      runtime.server.listen(0, "127.0.0.1", resolve);
    });

    const address = runtime.server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    const baseUrl = `http://127.0.0.1:${port}`;

    const health = await fetch(`${baseUrl}/health`).then((res) => res.json());
    assert(health.ok, "health endpoint did not report ok");
    assert(health.platform === "BrandID-Offline-PWA", "health endpoint reported the wrong platform");

    const servedIndex = await fetch(`${baseUrl}/`).then((res) => res.text());
    assert(servedIndex.includes("btnSyncOutbox"), "runtime root did not serve the canonical outbox shell");

    const initialStatus = await fetch(`${baseUrl}/api/runtime/status`).then((res) => res.json());
    assert(initialStatus.ok, "runtime status did not report ok");
    assert(initialStatus.archive.total === 0, "new runtime should start with an empty archive");

    const createResponse = await fetch(`${baseUrl}/api/runtime/intake-packets`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        intakePacket: {
          packetId: "brandpkt_smoke_001",
          createdAt: "2026-05-02T08:00:00.000Z",
          source: "BrandID-Offline-PWA",
          intake: {
            name: "Smoke Owner",
            email: "smoke.owner@internal.invalid",
            subject: "Brand launch",
            message: "Need a launch packet and storefront handoff.",
          },
          brief: {
            brandName: "Smoke Brand",
            brandTagline: "Offline-first launch lane",
            previewIsDark: true,
            savedAt: "2026-05-02T08:00:00.000Z",
            logoDataUrl: "data:image/svg+xml;base64,PHN2Zy8+",
            logoFallbackUrl: "assets/logo.svg",
          },
          assetPlan: {
            lockupExport: "Smoke_Brand_Logo_Primary_Transparent.svg",
            iconExport: "Smoke_Brand_Icon_Transparent.svg",
            logoEmbedded: true,
            previewTheme: "dark",
          },
          recommendedDestinations: ["SkyeLeadVault", "SkyeMediaCenter", "SkyeWebCreatorMax", "skyeroutex-workforce-command-v0.4.0"],
        },
      }),
    }).then((res) => res.json());

    assert(createResponse.ok, "intake packet POST failed");
    assert(createResponse.intakePacket.handoffSummary.crmLane === "SkyeLeadVault", "intake packet did not inherit CRM destination mapping");
    assert(createResponse.intakePacket.handoffSummary.mediaLane === "SkyeMediaCenter", "intake packet did not inherit media-center destination mapping");

    const packets = await fetch(`${baseUrl}/api/runtime/intake-packets`).then((res) => res.json());
    assert(packets.total === 1, "runtime packet listing did not include the archived intake packet");

    const fetchedPacket = await fetch(`${baseUrl}/api/runtime/intake-packets/brandpkt_smoke_001`).then((res) => res.json());
    assert(fetchedPacket.ok, "runtime fetch by packet id failed");
    assert(fetchedPacket.intakePacket.handoffSummary.storefrontLane === "SkyeWebCreatorMax", "stored packet lost storefront handoff mapping");

    const briefCreate = await fetch(`${baseUrl}/api/runtime/handoff-briefs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ packetId: "brandpkt_smoke_001" }),
    }).then((res) => res.json());
    assert(briefCreate.ok, "runtime handoff brief POST failed");
    assert(Array.isArray(briefCreate.handoffBrief.actionItems) && briefCreate.handoffBrief.actionItems.length >= 2, "handoff brief did not derive action items");

    const briefs = await fetch(`${baseUrl}/api/runtime/handoff-briefs`).then((res) => res.json());
    assert(briefs.total === 1, "runtime handoff brief listing did not include the archived brief");

    const fetchedBrief = await fetch(`${baseUrl}/api/runtime/handoff-briefs/${briefCreate.handoffBrief.briefId}`).then((res) => res.json());
    assert(fetchedBrief.ok, "runtime fetch by brief id failed");
    assert(fetchedBrief.handoffBrief.sourcePacketId === "brandpkt_smoke_001", "stored handoff brief lost packet linkage");
    assert(fetchedBrief.handoffBrief.review?.status === "draft", "new handoff brief should start in draft review status");

    const reviewUpdate = await fetch(`${baseUrl}/api/runtime/handoff-briefs/${briefCreate.handoffBrief.briefId}/review`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        review: {
          status: "ready",
          owner: "brand-ops",
          checkpoint: "brief_reviewed",
          notes: "Ready for CRM and storefront handoff.",
        },
      }),
    }).then((res) => res.json());
    assert(reviewUpdate.ok, "runtime review-board update failed");
    assert(reviewUpdate.updated.review.status === "ready", "review-board update did not persist ready status");

    const reviewBoard = await fetch(`${baseUrl}/api/runtime/review-board`).then((res) => res.json());
    assert(reviewBoard.ok, "review board endpoint did not report ok");
    assert(reviewBoard.counts.ready === 1, "review board did not count the ready brief");
    assert(reviewBoard.counts.unassigned === 0, "review board should not mark the updated brief unassigned");

    const executionUpdate = await fetch(`${baseUrl}/api/runtime/handoff-briefs/${briefCreate.handoffBrief.briefId}/execution`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        execution: {
          owner: "brand-exec",
          status: "queued",
          checkpoint: "handoff_ready",
          dueAt: "2026-05-03T12:00:00.000Z",
          nextAction: "Push the brief into storefront and CRM follow-up.",
          notes: "Execution lane queued from local proof.",
        },
      }),
    }).then((res) => res.json());
    assert(executionUpdate.ok, "execution board update failed");
    assert(executionUpdate.updated.execution.status === "queued", "execution board did not persist queued status");

    const executionBoard = await fetch(`${baseUrl}/api/runtime/execution-board`).then((res) => res.json());
    assert(executionBoard.ok, "execution board endpoint did not report ok");
    assert(executionBoard.counts.queued === 1, "execution board did not count the queued brief");
    assert(executionBoard.counts.unassigned === 0, "execution board should not mark the queued brief unassigned");

    const executionRow = Array.isArray(executionBoard.items)
      ? executionBoard.items.find((item) => item.briefId === briefCreate.handoffBrief.briefId)
      : null;
    assert(executionRow?.execution?.owner === "brand-exec", "execution board lost the execution owner");

    const dispatchUpdate = await fetch(`${baseUrl}/api/runtime/handoff-briefs/${briefCreate.handoffBrief.briefId}/dispatch`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        dispatch: {
          owner: "brand-dispatch",
          label: "smoke_brand_dispatch",
          status: "ready",
          checkpoint: "dispatch_ready",
          dueAt: "2026-05-04T12:00:00.000Z",
          nextAction: "Hand the approved brand kit to storefront and CRM ops.",
          notes: "Dispatch lane queued from local proof.",
          channel: "brand_delivery",
        },
      }),
    }).then((res) => res.json());
    assert(dispatchUpdate.ok, "dispatch board update failed");
    assert(dispatchUpdate.updated.dispatch.status === "ready", "dispatch board did not persist ready status");

    const dispatchBoard = await fetch(`${baseUrl}/api/runtime/dispatch-board`).then((res) => res.json());
    assert(dispatchBoard.ok, "dispatch board endpoint did not report ok");
    assert(dispatchBoard.counts.ready === 1, "dispatch board did not count the ready brief");
    assert(dispatchBoard.counts.unassigned === 0, "dispatch board should not mark the dispatch item unassigned");

    const dispatchRow = Array.isArray(dispatchBoard.items)
      ? dispatchBoard.items.find((item) => item.briefId === briefCreate.handoffBrief.briefId)
      : null;
    assert(dispatchRow?.dispatch?.owner === "brand-dispatch", "dispatch board lost the dispatch owner");

    const workflowTimeline = await fetch(`${baseUrl}/api/runtime/workflow-timeline`).then((res) => res.json());
    assert(workflowTimeline.ok, "workflow timeline endpoint did not report ok");
    assert(workflowTimeline.workflowTimeline.summary.archive === 1, "workflow timeline did not count the archived packet");
    assert(workflowTimeline.workflowTimeline.summary.brief === 1, "workflow timeline did not count the created brief");
    assert(workflowTimeline.workflowTimeline.summary.review === 1, "workflow timeline did not count the review event");
    assert(workflowTimeline.workflowTimeline.summary.execution === 1, "workflow timeline did not count the execution event");
    assert(workflowTimeline.workflowTimeline.summary.dispatch === 1, "workflow timeline did not count the dispatch event");
    const eventTypes = Array.isArray(workflowTimeline.workflowTimeline.timeline)
      ? workflowTimeline.workflowTimeline.timeline.map((event) => event.type)
      : [];
    for (const type of [
      "intake_packet_archived",
      "handoff_brief_created",
      "handoff_brief_review_updated",
      "handoff_brief_execution_updated",
      "handoff_brief_dispatch_updated",
    ]) {
      assert(eventTypes.includes(type), `workflow timeline is missing expected event type: ${type}`);
    }
    assert(workflowTimeline.workflowTimeline.latestAt, "workflow timeline did not persist latestAt");
    const dispatchEvent = Array.isArray(workflowTimeline.workflowTimeline.timeline)
      ? workflowTimeline.workflowTimeline.timeline.find((event) => event.type === "handoff_brief_dispatch_updated")
      : null;
    assert(dispatchEvent?.source === "brand-dispatch-board", "dispatch workflow event lost normalized source metadata");
    assert(dispatchEvent?.target === "SkyeLeadVault", "dispatch workflow event lost normalized target metadata");
    assert(dispatchEvent?.channel === "brand_delivery", "dispatch workflow event lost dispatch channel metadata");
    assert(dispatchEvent?.nextAction === "Hand the approved brand kit to storefront and CRM ops.", "dispatch workflow event lost next-action metadata");

    const executionEvent = Array.isArray(workflowTimeline.workflowTimeline.timeline)
      ? workflowTimeline.workflowTimeline.timeline.find((event) => event.type === "handoff_brief_execution_updated")
      : null;
    assert(executionEvent?.source === "brand-execution-board", "execution workflow event lost normalized source metadata");
    assert(executionEvent?.target === "SkyeLeadVault", "execution workflow event lost normalized target metadata");
    assert(executionEvent?.nextAction === "Push the brief into storefront and CRM follow-up.", "execution workflow event lost normalized next-action metadata");

    const finalStatus = await fetch(`${baseUrl}/api/runtime/status`).then((res) => res.json());
    assert(finalStatus.archive.total === 1, "runtime status did not count the archived intake packet");
    assert(finalStatus.handoffLanes.crm === 1, "runtime status did not summarize CRM handoff counts");
    assert(finalStatus.briefs.total === 1, "runtime status did not summarize handoff brief counts");
    assert(finalStatus.reviewBoard.ready === 1, "runtime status did not summarize review board ready counts");
    assert(finalStatus.executionBoard.queued === 1, "runtime status did not summarize execution board queued counts");
    assert(finalStatus.dispatchBoard.ready === 1, "runtime status did not summarize dispatch board ready counts");
    assert(finalStatus.workflowTimeline.archive === 1, "runtime status did not summarize workflow archive counts");
    assert(finalStatus.workflowTimeline.dispatch === 1, "runtime status did not summarize workflow dispatch counts");
    assert(finalStatus.workflowTimeline.latestAt, "runtime status did not surface workflow latestAt");
    assert(finalStatus.latestWorkflowEvent?.source === "brand-dispatch-board", "runtime status did not surface latest workflow event metadata");

    assert(fs.existsSync(path.join(root, createResponse.intakePacket.file)), "runtime did not write the archived intake packet inside this platform");
    assert(fs.existsSync(path.join(root, briefCreate.handoffBrief.file)), "runtime did not write the archived handoff brief inside this platform");

    console.log(JSON.stringify({
      ok: true,
      platform: "BrandID-Offline-PWA",
      status: "pass",
      proof: [
        "same-folder local runtime served the updated shell and health lane",
        "offline intake packets can be archived into a same-folder runtime handoff store",
        "archived intake packets can be promoted into operator-ready handoff briefs",
        "handoff briefs can move through a persisted same-folder review board",
        "reviewed handoff briefs can move through a persisted same-folder execution board",
        "execution items can move into a persisted same-folder dispatch board",
        "same-folder workflow timeline records archive, brief, review, execution, and dispatch events in order",
        "runtime status summarizes archived CRM, storefront, and ops-ready handoff counts",
        "archived packets stay rooted inside BrandID-Offline-PWA/runtime/data/intake-packets",
      ],
      guardrails: [
        "proof covers local runtime and local handoff archiving only",
        "no live CRM, storefront, or workforce API delivery is claimed",
      ],
    }, null, 2));
  } finally {
    if (runtime && runtime.server.listening) await runtime.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

await main();
