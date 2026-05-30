import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createAEFlowLocalRuntime } from "../runtime/local-runtime.mjs";

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
  const appJs = read("app.js");
  const manifest = read("manifest.webmanifest");
  const serviceWorker = read("sw.js");
  const runtimeModule = read("runtime/local-runtime.mjs");

  assert(indexHtml.includes("AE FlowPro Platform"), "index.html is missing the AE FlowPro platform title");
  assert(indexHtml.includes("data-platform-hardening=\"single-canonical-real-platform\""), "index.html is missing the single canonical platform marker");
  assert(indexHtml.includes("platformCommand"), "index.html is missing the integrated platform command strip");
  assert(indexHtml.includes("AE FLOW"), "index.html is missing the AE FLOW brand surface");
  assert(indexHtml.includes("intakeForm"), "index.html is missing the lead intake form");
  assert(indexHtml.includes("runtimeLaneStatus"), "index.html is missing the local runtime lane status surface");
  assert(indexHtml.includes("exportOpsJournalBtn"), "index.html is missing the recovery journal controls");
  assert(indexHtml.includes("saveActivationPackBtn"), "index.html is missing the activation pack control");
  assert(indexHtml.includes("queueActivationWorkflowBtn"), "index.html is missing the activation workflow control");
  assert(indexHtml.includes("queueExecutionBoardBtn"), "index.html is missing the execution board control");
  assert(indexHtml.includes("queueDispatchBoardBtn"), "index.html is missing the dispatch board control");
  assert(indexHtml.includes("workflowTimelineStatus"), "index.html is missing the workflow timeline status surface");
  assert(!indexHtml.includes("Open Imported App"), "index.html still contains imported app copy");
  assert(!indexHtml.includes("href=\"./app.html\""), "index.html still links to app.html");

  assert(appJs.includes("probeRuntimeLane"), "app.js is missing runtime lane probing");
  assert(appJs.includes("saveRuntimeSnapshot"), "app.js is missing runtime snapshot writes");
  assert(appJs.includes("recordRecoveryEvent"), "app.js is missing recovery journal writes");
  assert(appJs.includes("saveRuntimeActivationPack"), "app.js is missing activation pack writes");
  assert(appJs.includes("saveRuntimeActivationWorkflow"), "app.js is missing activation workflow writes");
  assert(appJs.includes("saveRuntimeExecutionBoardItem"), "app.js is missing execution board writes");
  assert(appJs.includes("saveRuntimeDispatchBoardItem"), "app.js is missing dispatch board writes");

  assert(runtimeModule.includes("/api/runtime/status"), "local runtime module is missing the runtime status endpoint");
  assert(runtimeModule.includes("/api/runtime/snapshots"), "local runtime module is missing the snapshot endpoint");
  assert(runtimeModule.includes("/api/runtime/recovery-packs"), "local runtime module is missing the recovery pack endpoint");
  assert(runtimeModule.includes("/api/runtime/activation-packs"), "local runtime module is missing the activation pack endpoint");
  assert(runtimeModule.includes("/api/runtime/activation-workflows"), "local runtime module is missing the activation workflow endpoint");
  assert(runtimeModule.includes("/api/runtime/execution-board"), "local runtime module is missing the execution board endpoint");
  assert(runtimeModule.includes("/api/runtime/dispatch-board"), "local runtime module is missing the dispatch board endpoint");
  assert(runtimeModule.includes("/api/runtime/workflow-timeline"), "local runtime module is missing the workflow timeline endpoint");
  assert(manifest.includes("\"name\""), "manifest.webmanifest is missing app metadata");
  assert(serviceWorker.includes("fetch"), "sw.js is missing offline fetch handling");

  const tempDir = fs.mkdtempSync(path.join(root, "runtime", ".smoke-"));
  const journalPath = path.join(tempDir, "data", "ops-journal.json");
  const snapshotsDir = path.join(tempDir, "data", "snapshots");
  const recoveryPacksDir = path.join(tempDir, "data", "recovery-packs");
  const activationPacksDir = path.join(tempDir, "data", "activation-packs");
  const activationWorkflowsDir = path.join(tempDir, "data", "activation-workflows");
  const executionBoardsDir = path.join(tempDir, "data", "execution-board");

  let runtime = null;
  try {
    runtime = await createAEFlowLocalRuntime({
      dataDir: path.join(tempDir, "data"),
      journalPath,
      snapshotsDir,
      recoveryPacksDir,
      activationPacksDir,
      activationWorkflowsDir,
      executionBoardsDir,
    });
    await new Promise((resolve, reject) => {
      runtime.server.once("error", reject);
      runtime.server.listen(0, "127.0.0.1", resolve);
    });

    const address = runtime.server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    const baseUrl = `http://127.0.0.1:${port}`;

    const servedIndex = await fetch(`${baseUrl}/`).then((res) => res.text());
    assert(servedIndex.includes("AE FlowPro Platform"), "Runtime root did not serve the canonical platform");
    assert(servedIndex.includes("runtimeLaneStatus"), "Runtime root did not serve the runtime lane shell");
    assert(!servedIndex.includes("href=\"./app.html\""), "Runtime root still links to app.html");

    const removedAppResponse = await fetch(`${baseUrl}/app.html`);
    assert(removedAppResponse.status === 404, "Runtime should not serve a second app.html entrypoint");

    const servedAppJs = await fetch(`${baseUrl}/app.js`).then((res) => res.text());
    assert(servedAppJs.includes("probeRuntimeLane"), "Runtime did not serve updated browser script");

    const servedManifest = await fetch(`${baseUrl}/manifest.webmanifest`).then((res) => res.text());
    assert(servedManifest.includes("\"name\""), "Runtime did not serve manifest metadata");

    const health = await fetch(`${baseUrl}/health`).then((res) => res.json());
    assert(health.ok, "Health endpoint did not report ok");
    assert(health.mode === "same-folder-local-runtime", "Health endpoint reported the wrong runtime mode");

    const entryResponse = await fetch(`${baseUrl}/api/runtime/journal`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "smoke-proof",
        detail: "Smoke proof journal write",
        createdAt: "2026-05-01T12:00:00.000Z",
        meta: { lane: "journal" },
      }),
    }).then((res) => res.json());
    assert(entryResponse.ok, "Journal POST failed");
    assert(entryResponse.entry.type === "smoke-proof", "Journal entry type mismatch");

    const snapshotResponse = await fetch(`${baseUrl}/api/runtime/snapshots`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        reason: "smoke-browser-backup",
        createdAt: "2026-05-01T12:01:00.000Z",
        meta: { lane: "snapshot" },
        payload: {
          visits: [{ id: "visit_1" }],
          accounts: [{
            id: "acct_1",
            business_name: "Smoke HVAC",
            business_email: "ops@smokehvac.test",
            ae_name: "Smoke AE",
            service_1: "HVAC tune-ups",
            permission: "yes",
            account_status: "Pending Approval",
            website_or_booking: "https://smokehvac.test/book",
          }],
          deals: [{
            id: "deal_1",
            account_id: "acct_1",
            account_name: "Smoke HVAC",
            name: "Lead Sprint",
            stage: "Proposal Sent",
            deposit_due: 500,
            setup_total: 1500,
            monthly_total: 400,
          }],
          handoff_log: [{ id: "handoff_1" }],
          settings: { depositPct: 0.4 },
        },
      }),
    }).then((res) => res.json());
    assert(snapshotResponse.ok, "Snapshot POST failed");
    assert(snapshotResponse.snapshot.reason === "smoke-browser-backup", "Snapshot reason mismatch");

    const status = await fetch(`${baseUrl}/api/runtime/status`).then((res) => res.json());
    assert(status.journal.total >= 2, "Runtime status did not include expected journal rows");
    assert(status.snapshots.total >= 1, "Runtime status did not include expected snapshot rows");
    assert(status.activationPacks.total === 0, "Runtime status should start with zero activation packs");
    assert(status.activationWorkflows.total === 0, "Runtime status should start with zero activation workflows");
    assert(status.executionBoard.total === 0, "Runtime status should start with zero execution board items");

    const journal = await fetch(`${baseUrl}/api/runtime/journal`).then((res) => res.json());
    assert(journal.total >= 2, "Runtime journal listing did not include written rows");

    const snapshots = await fetch(`${baseUrl}/api/runtime/snapshots`).then((res) => res.json());
    assert(snapshots.total >= 1, "Runtime snapshot listing did not include saved snapshot");

    const snapshotId = snapshotResponse.snapshot.snapshotId;
    const fetchedSnapshot = await fetch(`${baseUrl}/api/runtime/snapshots/${encodeURIComponent(snapshotId)}`).then((res) => res.json());
    assert(fetchedSnapshot.ok, "Snapshot fetch by id failed");
    assert(fetchedSnapshot.snapshot.payload.accounts.length === 1, "Fetched snapshot payload mismatch");

    const recoveryPackResponse = await fetch(`${baseUrl}/api/runtime/recovery-packs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        snapshotId,
        assignee: "recovery-ops",
        shiftLabel: "same-day-recovery",
      }),
    }).then((res) => res.json());
    assert(recoveryPackResponse.ok, "Recovery pack POST failed");
    assert(recoveryPackResponse.recoveryPack.assignee === "recovery-ops", "Recovery pack assignee mismatch");
    assert(recoveryPackResponse.recoveryPack.actions.length >= 1, "Recovery pack did not contain actions");

    const recoveryPacks = await fetch(`${baseUrl}/api/runtime/recovery-packs`).then((res) => res.json());
    assert(recoveryPacks.total >= 1, "Recovery pack listing did not include saved recovery pack");

    const fetchedRecoveryPack = await fetch(`${baseUrl}/api/runtime/recovery-packs/${encodeURIComponent(recoveryPackResponse.recoveryPack.recoveryPackId)}`).then((res) => res.json());
    assert(fetchedRecoveryPack.ok, "Recovery pack fetch by id failed");
    assert(fetchedRecoveryPack.recoveryPack.snapshotId === snapshotId, "Fetched recovery pack snapshot mismatch");

    const activationPackResponse = await fetch(`${baseUrl}/api/runtime/activation-packs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        snapshotId,
        activationPack: {
          scope: "system-handoff",
          owner: "activation-ops",
          sourceApp: "AE-FlowPro",
          summaryText: "Smoke activation handoff",
        },
      }),
    }).then((res) => res.json());
    assert(activationPackResponse.ok, "Activation pack POST failed");
    assert(activationPackResponse.activationPack.owner === "activation-ops", "Activation pack owner mismatch");
    assert(activationPackResponse.activationPack.metrics.accounts === 1, "Activation pack account metrics mismatch");
    assert(activationPackResponse.activationPack.actions.length >= 1, "Activation pack did not contain actions");
    assert(activationPackResponse.activationPack.downstreamLanes.some((lane) => lane.lane === "crm" && lane.ready), "Activation pack downstream lanes missing CRM readiness");

    const activationPacks = await fetch(`${baseUrl}/api/runtime/activation-packs`).then((res) => res.json());
    assert(activationPacks.total >= 1, "Activation pack listing did not include saved activation pack");

    const fetchedActivationPack = await fetch(`${baseUrl}/api/runtime/activation-packs/${encodeURIComponent(activationPackResponse.activationPack.activationPackId)}`).then((res) => res.json());
    assert(fetchedActivationPack.ok, "Activation pack fetch by id failed");
    assert(fetchedActivationPack.activationPack.snapshotId === snapshotId, "Fetched activation pack snapshot mismatch");

    const activationWorkflowResponse = await fetch(`${baseUrl}/api/runtime/activation-workflows`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        activationPackId: activationPackResponse.activationPack.activationPackId,
        activationWorkflow: {
          owner: "workflow-ops",
          stage: "handoff-review",
          status: "queued",
          label: "Smoke workflow lane",
          notes: "Create downstream execution board from activation pack.",
        },
      }),
    }).then((res) => res.json());
    assert(activationWorkflowResponse.ok, "Activation workflow POST failed");
    assert(activationWorkflowResponse.activationWorkflow.owner === "workflow-ops", "Activation workflow owner mismatch");
    assert(Array.isArray(activationWorkflowResponse.activationWorkflow.steps), "Activation workflow steps were not created");
    assert(activationWorkflowResponse.activationWorkflow.steps.length >= 1, "Activation workflow did not contain steps");

    const activationWorkflows = await fetch(`${baseUrl}/api/runtime/activation-workflows`).then((res) => res.json());
    assert(activationWorkflows.total >= 1, "Activation workflow listing did not include saved workflow");

    const workflowId = activationWorkflowResponse.activationWorkflow.workflowId;
    const fetchedWorkflow = await fetch(`${baseUrl}/api/runtime/activation-workflows/${encodeURIComponent(workflowId)}`).then((res) => res.json());
    assert(fetchedWorkflow.ok, "Activation workflow fetch by id failed");
    assert(fetchedWorkflow.activationWorkflow.activationPackId === activationPackResponse.activationPack.activationPackId, "Fetched activation workflow pack mismatch");

    const updatedStep = Object.assign({}, fetchedWorkflow.activationWorkflow.steps[0], { status: "active" });
    const updatedWorkflow = await fetch(`${baseUrl}/api/runtime/activation-workflows/${encodeURIComponent(workflowId)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        activationWorkflow: {
          status: "active",
          stage: "operator-review",
          notes: "Workflow promoted for active operator review.",
          steps: [updatedStep].concat(fetchedWorkflow.activationWorkflow.steps.slice(1)),
        },
      }),
    }).then((res) => res.json());
    assert(updatedWorkflow.ok, "Activation workflow PATCH failed");
    assert(updatedWorkflow.activationWorkflow.status === "active", "Activation workflow status update failed");
    assert(updatedWorkflow.activationWorkflow.stage === "operator-review", "Activation workflow stage update failed");
    assert(updatedWorkflow.activationWorkflow.summary.active >= 1, "Activation workflow summary did not reflect the active step");

    const refreshedStatus = await fetch(`${baseUrl}/api/runtime/status`).then((res) => res.json());
    assert(refreshedStatus.activationPacks.total >= 1, "Runtime status did not include activation pack history");
    assert(refreshedStatus.activationWorkflows.total >= 1, "Runtime status did not include activation workflow history");

    const executionItemResponse = await fetch(`${baseUrl}/api/runtime/activation-workflows/${encodeURIComponent(workflowId)}/execution`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        executionItem: {
          owner: "execution-ops",
          status: "queued",
          checkpoint: "activation-queue",
          dueAt: "2026-05-02T18:00:00.000Z",
          notes: "Promote workflow into downstream execution board.",
          nextAction: "Assign the CRM lane and start outreach."
        },
      }),
    }).then((res) => res.json());
    assert(executionItemResponse.ok, "Execution board POST failed");
    assert(executionItemResponse.executionItem.owner === "execution-ops", "Execution board owner mismatch");
    assert(executionItemResponse.executionItem.checkpoint === "activation-queue", "Execution board checkpoint mismatch");

    const executionBoard = await fetch(`${baseUrl}/api/runtime/execution-board`).then((res) => res.json());
    assert(executionBoard.total >= 1, "Execution board listing did not include saved execution item");

    const executionItemId = executionItemResponse.executionItem.executionItemId;
    const fetchedExecutionItem = await fetch(`${baseUrl}/api/runtime/execution-board/${encodeURIComponent(executionItemId)}`).then((res) => res.json());
    assert(fetchedExecutionItem.ok, "Execution board fetch by id failed");
    assert(fetchedExecutionItem.executionItem.workflowId === workflowId, "Fetched execution board workflow mismatch");

    const updatedExecutionItem = await fetch(`${baseUrl}/api/runtime/execution-board/${encodeURIComponent(executionItemId)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        executionItem: {
          status: "active",
          checkpoint: "crm-owner-assigned",
          notes: "Execution board promoted into active launch ownership.",
          nextAction: "Begin first downstream outreach lane."
        },
      }),
    }).then((res) => res.json());
    assert(updatedExecutionItem.ok, "Execution board PATCH failed");
    assert(updatedExecutionItem.executionItem.status === "active", "Execution board status update failed");
    assert(updatedExecutionItem.executionItem.checkpoint === "crm-owner-assigned", "Execution board checkpoint update failed");

    const dispatchItemResponse = await fetch(`${baseUrl}/api/runtime/execution-board/${encodeURIComponent(executionItemId)}/dispatch`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        dispatch: {
          owner: "dispatch-ops",
          status: "ready",
          checkpoint: "crm-handoff-prep",
          channel: "downstream-activation-dispatch",
          target: "crm",
          notes: "Dispatch handoff prepared for downstream activation delivery.",
          nextAction: "Send activation packet to the CRM owner."
        },
      }),
    }).then((res) => res.json());
    assert(dispatchItemResponse.ok, "Dispatch board POST failed");
    assert(dispatchItemResponse.executionItem.dispatch.owner === "dispatch-ops", "Dispatch board owner mismatch");
    assert(dispatchItemResponse.executionItem.dispatch.target === "crm", "Dispatch board target mismatch");

    const dispatchBoard = await fetch(`${baseUrl}/api/runtime/dispatch-board`).then((res) => res.json());
    assert(dispatchBoard.ok, "Dispatch board GET failed");
    assert(dispatchBoard.dispatchBoard.total >= 1, "Dispatch board listing did not include saved dispatch item");

    const workflowTimeline = await fetch(`${baseUrl}/api/runtime/workflow-timeline`).then((res) => res.json());
    assert(workflowTimeline.ok, "Workflow timeline GET failed");
    assert(workflowTimeline.workflowTimeline.summary.activation_pack >= 1, "Workflow timeline did not count activation pack events");
    assert(workflowTimeline.workflowTimeline.summary.workflow >= 1, "Workflow timeline did not count workflow events");
    assert(workflowTimeline.workflowTimeline.summary.execution >= 1, "Workflow timeline did not count execution events");
    assert(workflowTimeline.workflowTimeline.summary.dispatch >= 1, "Workflow timeline did not count dispatch events");

    const finalStatus = await fetch(`${baseUrl}/api/runtime/status`).then((res) => res.json());
    assert(finalStatus.executionBoard.total >= 1, "Runtime status did not include execution board history");
    assert(finalStatus.dispatchBoard.total >= 1, "Runtime status did not include dispatch board history");
    assert(finalStatus.workflowTimeline.total >= 4, "Runtime status did not include workflow timeline history");

    assert(fs.existsSync(journalPath), "Runtime journal file was not written");
    assert(fs.existsSync(path.join(root, snapshotResponse.snapshot.file)), "Snapshot file path was not rooted in AE-FlowPro");
    assert(fs.existsSync(path.join(root, recoveryPackResponse.recoveryPack.file)), "Recovery pack file path was not rooted in AE-FlowPro");
    assert(fs.existsSync(path.join(root, activationPackResponse.activationPack.file)), "Activation pack file path was not rooted in AE-FlowPro");
    assert(fs.existsSync(path.join(root, activationWorkflowResponse.activationWorkflow.file)), "Activation workflow file path was not rooted in AE-FlowPro");
    assert(fs.existsSync(path.join(root, executionItemResponse.executionItem.file)), "Execution board file path was not rooted in AE-FlowPro");

    console.log(JSON.stringify({
      ok: true,
      platform: "AE-FlowPro",
      status: "pass",
      proof: [
        "same-folder local runtime served health and static shell",
        "same-folder local runtime served browser shell assets",
        "browser runtime journal contract accepted writes",
        "backup snapshot endpoint wrote a same-folder JSON artifact",
        "recovery pack endpoint generated same-folder shift actions from a saved snapshot",
        "activation pack endpoint generated a same-folder downstream handoff artifact from the saved snapshot",
        "activation workflow endpoint generated and updated a same-folder operator execution board from the saved activation pack",
        "execution board endpoint queued, fetched, and updated a same-folder downstream launch item from the workflow",
        "dispatch board endpoint carried the execution item into downstream dispatch ownership",
        "workflow timeline endpoint surfaced activation-pack, workflow, execution, and dispatch evidence in order",
        "runtime status surfaced journal, snapshot, activation pack, execution board, dispatch board, and workflow timeline history",
      ],
      runtimeFiles: {
        journalPath,
        snapshotFile: snapshotResponse.snapshot.file,
        activationPackFile: activationPackResponse.activationPack.file,
        activationWorkflowFile: activationWorkflowResponse.activationWorkflow.file,
        executionBoardFile: executionItemResponse.executionItem.file,
      },
      guardrails: [
        "proof covers local runtime and same-origin browser contract only",
        "no remote sync, team collaboration, or live deployment claimed",
      ],
    }, null, 2));
  } finally {
    if (runtime && runtime.server.listening) await runtime.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

await main();
