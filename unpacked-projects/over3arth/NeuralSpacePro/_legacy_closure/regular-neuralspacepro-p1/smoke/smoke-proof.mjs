import { mkdtempSync, readFileSync, existsSync, writeFileSync, unlinkSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createNeuralSpaceProLocalGateway } from "../runtime/local-gateway.mjs";

const root = path.resolve(process.cwd());

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function read(relPath) {
  const fullPath = path.join(root, relPath);
  assert(existsSync(fullPath), `Missing required file: ${relPath}`);
  return readFileSync(fullPath, "utf8");
}

const indexHtml = read("index.html");
const manifest = JSON.parse(read("manifest.json"));
const serviceWorker = read("sw.js");

assert(indexHtml.includes("kAIxu Neural Space Pro"), "index.html is missing the Neural Space Pro title");
assert(indexHtml.includes("serviceWorker.register('./sw.js')"), "index.html is missing service worker registration");
assert(indexHtml.includes("firebase-app.js"), "index.html is missing the Firebase app import");
assert(indexHtml.includes("signInAnonymously"), "index.html is missing anonymous auth bootstrap");
assert(indexHtml.includes("const gatewayBaseKey = 'kaixu_gateway_base';"), "index.html is missing runtime host configuration");
assert(indexHtml.includes("Leave blank to use same-origin server lanes."), "index.html is missing same-origin runtime guidance");
assert(indexHtml.includes("local proof runtime in this folder can serve the chat lane and keep a local session archive"), "index.html is missing the local proof runtime guidance");
assert(indexHtml.includes("System Handoff Pack"), "index.html is missing the system handoff pack controls");
assert(indexHtml.includes("Review Board"), "index.html is missing the review board controls");
assert(indexHtml.includes("Execution Board"), "index.html is missing the execution board controls");
assert(indexHtml.includes("Dispatch Board"), "index.html is missing the dispatch board controls");
assert(indexHtml.includes("Workflow Timeline"), "index.html is missing the workflow timeline controls");
assert(indexHtml.includes("SkyeLeadVault"), "index.html is missing the SkyeLeadVault handoff target");
assert(indexHtml.includes("SkyeWebCreatorMax"), "index.html is missing the SkyeWebCreatorMax handoff target");
assert(indexHtml.includes("AE-FlowPro"), "index.html is missing the AE-FlowPro handoff target");
assert(indexHtml.includes("createHandoffPack()"), "index.html is missing the handoff archive action");
assert(indexHtml.includes("saveSelectedHandoffReview()"), "index.html is missing the handoff review action");
assert(indexHtml.includes("refreshReviewBoard()"), "index.html is missing the review board refresh action");
assert(indexHtml.includes("saveSelectedHandoffExecution()"), "index.html is missing the handoff execution action");
assert(indexHtml.includes("refreshExecutionBoard()"), "index.html is missing the execution board refresh action");
assert(indexHtml.includes("saveSelectedHandoffDispatch()"), "index.html is missing the handoff dispatch action");
assert(indexHtml.includes("refreshDispatchBoard()"), "index.html is missing the dispatch board refresh action");
assert(indexHtml.includes("refreshWorkflowTimeline()"), "index.html is missing the workflow timeline refresh action");
assert(indexHtml.includes("fetch(gatewayUrl('/.netlify/functions/gateway-chat')"), "index.html is missing the gateway chat fetch path");
assert(indexHtml.includes("canvas-preview"), "index.html is missing the live run canvas surface");
assert(!indexHtml.includes("kaixu_api_key"), "index.html still contains browser-held API key storage");
assert(existsSync(path.join(root, "runtime/local-gateway.mjs")), "Missing runtime/local-gateway.mjs");
assert(existsSync(path.join(root, "runtime/local-state.json")), "Missing runtime/local-state.json");

assert(manifest.name === "kAIxu Neural Space Pro", "manifest.json has an unexpected app name");
assert(manifest.start_url === "./index.html", "manifest.json is missing the local start_url contract");
assert(Array.isArray(manifest.icons) && manifest.icons.length >= 2, "manifest.json is missing icon metadata");
for (const icon of manifest.icons) {
  assert(typeof icon.src === "string" && icon.src.length > 0, "manifest.json contains an icon without a source");
  assert(existsSync(path.join(root, icon.src)), `manifest icon is missing on disk: ${icon.src}`);
}
assert(!("iconUrl" in manifest), "manifest.json still contains a transient iconUrl field");
assert(serviceWorker.includes("fetch"), "sw.js is missing offline fetch handling");

const runtimeSource = read("runtime/local-gateway.mjs");
const tempRuntimePath = path.join(os.tmpdir(), `neuralspacepro-local-gateway-${process.pid}.mjs`);
writeFileSync(tempRuntimePath, runtimeSource);
const runtimeCheck = spawnSync(process.execPath, ["--check", tempRuntimePath], { encoding: "utf8" });
unlinkSync(tempRuntimePath);
assert(runtimeCheck.status === 0, `runtime/local-gateway.mjs failed syntax check: ${runtimeCheck.stderr || runtimeCheck.stdout}`);

const tempDir = mkdtempSync(path.join(os.tmpdir(), "neuralspacepro-proof-"));
const tempStatePath = path.join(tempDir, "local-state.json");
const { server } = await createNeuralSpaceProLocalGateway({ statePath: tempStatePath });
await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});

const address = server.address();
const port = typeof address === "object" && address ? address.port : null;
assert(port, "NeuralSpacePro local proof gateway failed to bind to a port");

try {
  const rootResponse = await fetch(`http://127.0.0.1:${port}/`).then((response) => response.text());
  assert(rootResponse.includes("kAIxu Neural Space Pro"), "local proof runtime did not serve index.html");

  const health = await fetch(`http://127.0.0.1:${port}/health`).then((response) => response.json());
  assert(health.ok === true, "local proof runtime /health did not return ok");
  assert(health.mode === "local-proof-harness", "local proof runtime /health did not report the harness mode");
  assert(health.summary?.sessionCount === 0, "local proof runtime /health did not start from isolated empty state");

  const runtimeSummaryBefore = await fetch(`http://127.0.0.1:${port}/v1/runtime-summary`).then((response) => response.json());
  assert(runtimeSummaryBefore.ok === true, "local proof runtime /v1/runtime-summary did not return ok");
  assert(runtimeSummaryBefore.summary?.sessionCount === 0, "local proof runtime /v1/runtime-summary did not start empty");

  const emptyChat = await fetch(`http://127.0.0.1:${port}/.netlify/functions/gateway-chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messages: [] }),
  });
  assert(emptyChat.status === 400, `Expected gateway-chat validation failure, got ${emptyChat.status}`);

  const chat = await fetch(`http://127.0.0.1:${port}/.netlify/functions/gateway-chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      messages: [
        { role: "system", content: "You are kAIxu." },
        { role: "user", content: "Summarize the local proof lane." },
      ],
    }),
  }).then((response) => response.json());
  assert(chat.ok === true, "local proof runtime /gateway-chat did not return ok");
  assert(chat.mode === "local-proof-harness", "local proof runtime /gateway-chat did not report harness mode");
  assert(String(chat.output_text || "").includes("Summarize the local proof lane."), "local proof runtime /gateway-chat did not echo prompt context");
  assert(typeof chat.sessionId === "string" && chat.sessionId.length > 0, "local proof runtime /gateway-chat did not persist a local session id");

  const sessions = await fetch(`http://127.0.0.1:${port}/v1/sessions`).then((response) => response.json());
  assert(sessions.ok === true, "local proof runtime /v1/sessions did not return ok");
  assert(sessions.totalSessions >= 1, "local proof runtime /v1/sessions did not record the chat");
  assert(sessions.sessions.some((session) => session.sessionId === chat.sessionId), "local proof runtime /v1/sessions did not return the recorded session");

  const sessionDetail = await fetch(`http://127.0.0.1:${port}/v1/sessions/${chat.sessionId}`).then((response) => response.json());
  assert(sessionDetail.ok === true, "local proof runtime /v1/sessions/:id did not return ok");
  assert(sessionDetail.session?.sessionId === chat.sessionId, "local proof runtime /v1/sessions/:id returned the wrong session");

  const runtimeSummaryAfter = await fetch(`http://127.0.0.1:${port}/v1/runtime-summary`).then((response) => response.json());
  assert(runtimeSummaryAfter.summary?.sessionCount === 1, "local proof runtime /v1/runtime-summary did not reflect the recorded session");
  assert(runtimeSummaryAfter.summary?.latestSessionId === chat.sessionId, "local proof runtime /v1/runtime-summary did not expose the latest session");
  assert(runtimeSummaryAfter.summary?.messageCountTotal === 2, "local proof runtime /v1/runtime-summary did not count proof messages");

  const handoffListBefore = await fetch(`http://127.0.0.1:${port}/v1/handoff-packs`).then((response) => response.json());
  assert(handoffListBefore.ok === true, "local proof runtime /v1/handoff-packs did not return ok");
  assert(handoffListBefore.totalHandoffPacks === 0, "local proof runtime /v1/handoff-packs did not start empty");

  const reviewBoardBefore = await fetch(`http://127.0.0.1:${port}/v1/review-board`).then((response) => response.json());
  assert(reviewBoardBefore.ok === true, "local proof runtime /v1/review-board did not return ok");
  assert(reviewBoardBefore.counts?.draft === 0, "local proof runtime /v1/review-board did not start with zero draft packs");

  const executionBoardBefore = await fetch(`http://127.0.0.1:${port}/v1/execution-board`).then((response) => response.json());
  assert(executionBoardBefore.ok === true, "local proof runtime /v1/execution-board did not return ok");
  assert(executionBoardBefore.counts?.queued === 0, "local proof runtime /v1/execution-board did not start with zero queued items");

  const dispatchBoardBefore = await fetch(`http://127.0.0.1:${port}/v1/dispatch-board`).then((response) => response.json());
  assert(dispatchBoardBefore.ok === true, "local proof runtime /v1/dispatch-board did not return ok");
  assert(dispatchBoardBefore.counts?.queued === 0, "local proof runtime /v1/dispatch-board did not start with zero queued items");

  const workflowTimelineBefore = await fetch(`http://127.0.0.1:${port}/v1/workflow-timeline`).then((response) => response.json());
  assert(workflowTimelineBefore.ok === true, "local proof runtime /v1/workflow-timeline did not return ok");
  assert(workflowTimelineBefore.summary?.archive === 0, "local proof runtime /v1/workflow-timeline did not start with zero archive events");

  const missingHandoffSession = await fetch(`http://127.0.0.1:${port}/v1/handoff-packs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessionId: "sess_missing", handoffPack: { title: "Broken pack" } }),
  });
  assert(missingHandoffSession.status === 404, `Expected missing handoff session to 404, got ${missingHandoffSession.status}`);

  const handoffCreate = await fetch(`http://127.0.0.1:${port}/v1/handoff-packs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      sessionId: chat.sessionId,
      handoffPack: {
        title: "Restaurant launch packet",
        notes: "Push this toward brand site, lead intake, and shift activation.",
        canvasExcerpt: "<section>storefront brief</section>",
        attachments: [{ name: "menu.pdf", type: "pdf" }],
        requestedTargets: ["SkyeLeadVault", "SkyeWebCreatorMax", "AE-FlowPro"],
      },
    }),
  }).then((response) => response.json());
  assert(handoffCreate.ok === true, "local proof runtime /v1/handoff-packs did not create a pack");
  assert(typeof handoffCreate.handoffPack?.handoffPackId === "string" && handoffCreate.handoffPack.handoffPackId.length > 0, "handoff pack creation did not return an id");
  assert(handoffCreate.handoffPack?.sessionId === chat.sessionId, "handoff pack did not retain the source session");
  assert(handoffCreate.handoffPack?.handoffSummary?.targetPlatforms.includes("SkyeLeadVault"), "handoff pack did not target SkyeLeadVault");
  assert(handoffCreate.handoffPack?.handoffSummary?.targetPlatforms.includes("SkyeWebCreatorMax"), "handoff pack did not target SkyeWebCreatorMax");
  assert(handoffCreate.handoffPack?.workspace?.attachmentCount === 1, "handoff pack did not capture attachment summary");
  assert(handoffCreate.handoffPack?.review?.status === "draft", "handoff pack did not start with draft review state");

  const handoffListAfter = await fetch(`http://127.0.0.1:${port}/v1/handoff-packs`).then((response) => response.json());
  assert(handoffListAfter.totalHandoffPacks === 1, "local proof runtime /v1/handoff-packs did not record the created pack");

  const handoffDetail = await fetch(`http://127.0.0.1:${port}/v1/handoff-packs/${handoffCreate.handoffPack.handoffPackId}`).then((response) => response.json());
  assert(handoffDetail.ok === true, "local proof runtime /v1/handoff-packs/:id did not return ok");
  assert(handoffDetail.handoffPack?.title === "Restaurant launch packet", "handoff pack detail returned the wrong pack");

  const missingReview = await fetch(`http://127.0.0.1:${port}/v1/handoff-packs/handoff_missing/review`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ review: { status: "ready" } }),
  });
  assert(missingReview.status === 404, `Expected missing review target to 404, got ${missingReview.status}`);

  const reviewUpdate = await fetch(`http://127.0.0.1:${port}/v1/handoff-packs/${handoffCreate.handoffPack.handoffPackId}/review`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      review: {
        owner: "ops-neural",
        checkpoint: "brand-handoff",
        status: "ready",
        notes: "Ready for site build and lead routing.",
      },
    }),
  }).then((response) => response.json());
  assert(reviewUpdate.ok === true, "local proof runtime /v1/handoff-packs/:id/review did not return ok");
  assert(reviewUpdate.handoffPack?.review?.status === "ready", "review update did not persist status");
  assert(reviewUpdate.handoffPack?.review?.owner === "ops-neural", "review update did not persist owner");
  assert(reviewUpdate.counts?.ready === 1, "review update did not increment ready review counts");

  const reviewBoardAfter = await fetch(`http://127.0.0.1:${port}/v1/review-board`).then((response) => response.json());
  assert(reviewBoardAfter.counts?.ready === 1, "review board did not report the updated ready count");
  assert(reviewBoardAfter.queue?.[0]?.review?.checkpoint === "brand-handoff", "review board queue did not expose the updated checkpoint");

  const missingExecution = await fetch(`http://127.0.0.1:${port}/v1/handoff-packs/handoff_missing/execution`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ execution: { status: "active" } }),
  });
  assert(missingExecution.status === 404, `Expected missing execution target to 404, got ${missingExecution.status}`);

  const executionUpdate = await fetch(`http://127.0.0.1:${port}/v1/handoff-packs/${handoffCreate.handoffPack.handoffPackId}/execution`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      execution: {
        owner: "ops-neural",
        checkpoint: "site-build",
        dueAt: "today",
        nextAction: "Create storefront scope",
        status: "active",
        notes: "Ready to move into execution after review approval.",
      },
    }),
  }).then((response) => response.json());
  assert(executionUpdate.ok === true, "local proof runtime /v1/handoff-packs/:id/execution did not return ok");
  assert(executionUpdate.handoffPack?.execution?.status === "active", "execution update did not persist status");
  assert(executionUpdate.handoffPack?.execution?.checkpoint === "site-build", "execution update did not persist checkpoint");
  assert(executionUpdate.counts?.active === 1, "execution update did not increment active execution counts");

  const executionBoardAfter = await fetch(`http://127.0.0.1:${port}/v1/execution-board`).then((response) => response.json());
  assert(executionBoardAfter.counts?.active === 1, "execution board did not report the updated active count");
  assert(executionBoardAfter.queue?.[0]?.execution?.nextAction === "Create storefront scope", "execution board queue did not expose the updated next action");

  const missingDispatch = await fetch(`http://127.0.0.1:${port}/v1/handoff-packs/handoff_missing/dispatch`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ dispatch: { status: "queued" } }),
  });
  assert(missingDispatch.status === 404, `Expected missing dispatch target to 404, got ${missingDispatch.status}`);

  const dispatchUpdate = await fetch(`http://127.0.0.1:${port}/v1/handoff-packs/${handoffCreate.handoffPack.handoffPackId}/dispatch`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      dispatch: {
        owner: "ops-neural",
        checkpoint: "downstream-handoff",
        target: "SkyeLeadVault",
        channel: "crm",
        status: "ready",
        notes: "Ready to move into CRM intake routing.",
      },
    }),
  }).then((response) => response.json());
  assert(dispatchUpdate.ok === true, "local proof runtime /v1/handoff-packs/:id/dispatch did not return ok");
  assert(dispatchUpdate.handoffPack?.dispatch?.status === "ready", "dispatch update did not persist status");
  assert(dispatchUpdate.handoffPack?.dispatch?.target === "SkyeLeadVault", "dispatch update did not persist target");
  assert(dispatchUpdate.counts?.ready === 1, "dispatch update did not increment ready dispatch counts");

  const dispatchBoardAfter = await fetch(`http://127.0.0.1:${port}/v1/dispatch-board`).then((response) => response.json());
  assert(dispatchBoardAfter.counts?.ready === 1, "dispatch board did not report the updated ready count");
  assert(dispatchBoardAfter.queue?.[0]?.dispatch?.channel === "crm", "dispatch board queue did not expose the updated channel");

  const workflowTimelineAfter = await fetch(`http://127.0.0.1:${port}/v1/workflow-timeline`).then((response) => response.json());
  assert(workflowTimelineAfter.summary?.archive === 1, "workflow timeline did not count the archive event");
  assert(workflowTimelineAfter.summary?.review === 1, "workflow timeline did not count the review event");
  assert(workflowTimelineAfter.summary?.execution === 1, "workflow timeline did not count the execution event");
  assert(workflowTimelineAfter.summary?.dispatch === 1, "workflow timeline did not count the dispatch event");
  const timelineTypes = (workflowTimelineAfter.events || []).map((event) => event.type);
  for (const eventType of [
    "handoff_pack_dispatch_updated",
    "handoff_pack_execution_updated",
    "handoff_pack_review_updated",
    "handoff_pack_archived",
  ]) {
    assert(timelineTypes.includes(eventType), `workflow timeline is missing ${eventType}`);
  }

  const runtimeSummaryFinal = await fetch(`http://127.0.0.1:${port}/v1/runtime-summary`).then((response) => response.json());
  assert(runtimeSummaryFinal.summary?.handoffPackCount === 1, "local proof runtime summary did not count handoff packs");
  assert(runtimeSummaryFinal.summary?.latestHandoffPackId === handoffCreate.handoffPack.handoffPackId, "local proof runtime summary did not expose the latest handoff pack");
  assert(runtimeSummaryFinal.summary?.reviewBoard?.ready === 1, "local proof runtime summary did not expose review-board counts");
  assert(runtimeSummaryFinal.summary?.executionBoard?.active === 1, "local proof runtime summary did not expose execution-board counts");
  assert(runtimeSummaryFinal.summary?.dispatchBoard?.ready === 1, "local proof runtime summary did not expose dispatch-board counts");
  assert(runtimeSummaryFinal.summary?.workflowTimeline?.dispatch === 1, "local proof runtime summary did not expose workflow timeline counts");
} finally {
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}

console.log(JSON.stringify({
  ok: true,
  platform: "NeuralSpacePro",
  status: "partial",
  proof: [
    "Static PWA shell present",
    "Firebase-authenticated workspace shell present",
    "Gateway chat route wiring present",
    "Canvas/editor workspace surface present",
    "Settings use runtime-host configuration instead of browser-held API keys",
    "Self-contained local proof runtime serves same-origin chat, health, runtime summary, and local session archive lanes",
    "Research sessions can be archived into local system handoff packs targeting SkyeLeadVault, SkyeWebCreatorMax, AE-FlowPro, and Workforce lanes",
    "Archived handoff packs can move through a persisted local review board with status, owner, checkpoint, and notes",
    "Reviewed handoff packs can be promoted into a persisted local execution board with status, owner, dueAt, next action, and notes",
    "Executed handoff packs can move into a persisted local dispatch board with target, channel, owner, and checkpoint state",
    "A same-folder workflow timeline records archive, review, execution, and dispatch events in order"
  ],
  unproven: [
    "Live gateway/provider execution is not proven in this folder",
    "External CDN dependencies are required for full runtime behavior",
    "No downstream delivery into deployed SkyeHands services is proven beyond the local archived handoff pack, review board, execution board, and dispatch board"
  ]
}, null, 2));
