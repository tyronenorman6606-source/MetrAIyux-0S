import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createSkyeDexiaLocalWorker } from "../runtime/local-worker.mjs";
import { createSkyeDexiaLocalRuntime } from "../runtime/local-runtime.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    throw new Error(`Missing required file: ${rel}`);
  }
  return fs.readFileSync(full, "utf8");
}

function mustContain(text, needle, label) {
  if (!text.includes(needle)) {
    throw new Error(`Missing ${label}: ${needle}`);
  }
}

const index = read("index.html");
const original = read("neural-space-pro.html");
const manifestText = read("RELEASE_MANIFEST.json");
const manifest = JSON.parse(manifestText);

mustContain(index, "sdx_worker_url", "saved worker URL setting");
mustContain(index, "sdx_worker_secret", "saved worker secret setting");
mustContain(index, "sessionStorage.getItem('sdx_worker_secret')", "session-scoped worker secret storage");
mustContain(index, "Secret is kept for this browser session only.", "session-only secret note");
mustContain(index, "the worker can run on the same origin", "same-origin local runtime note");
mustContain(index, "/runtime/standalone-apps/NeuralSpacePro/health", "worker health route");
mustContain(index, "/runtime/standalone-apps/NeuralSpacePro/status", "worker status route");
mustContain(index, "/runtime/standalone-apps/NeuralSpacePro/v1/runtime-summary", "worker runtime summary route");
mustContain(index, "/runtime/standalone-apps/NeuralSpacePro/v1/sessions", "worker session archive route");
mustContain(index, "/runtime/standalone-apps/NeuralSpacePro/.netlify/functions/gateway-chat", "same-origin research chat route");
mustContain(index, "/runtime/standalone-apps/NeuralSpacePro/build-website", "worker build route");
mustContain(index, "/runtime/standalone-apps/NeuralSpacePro/projects", "worker project list route");
mustContain(index, "/runtime/standalone-apps/NeuralSpacePro/queue", "worker queue route");
mustContain(index, "/runtime/standalone-apps/NeuralSpacePro/project-artifacts/", "project artifact listing route");
mustContain(index, "/runtime/standalone-apps/NeuralSpacePro/artifacts/", "worker artifact route");
mustContain(index, "/runtime/standalone-apps/NeuralSpacePro/handoff-packs", "worker handoff route");
mustContain(index, "/runtime/standalone-apps/NeuralSpacePro/review-board", "worker review board route");
mustContain(index, "/runtime/standalone-apps/NeuralSpacePro/execution-board", "worker execution board route");
mustContain(index, "/runtime/standalone-apps/NeuralSpacePro/dispatch-board", "worker dispatch board route");
mustContain(index, "/runtime/standalone-apps/NeuralSpacePro/workflow-timeline", "worker workflow timeline route");
mustContain(index, "A connected worker can run the 5-step pipeline", "conservative worker build claim");
mustContain(index, "Sites reported by the connected worker", "archive worker-source claim");
mustContain(index, "System Handoff Pack", "handoff panel");
mustContain(index, "Archive Handoff Pack", "handoff action");
mustContain(index, "Review Board", "review board panel");
mustContain(index, "Execution Board", "execution board panel");
mustContain(index, "Dispatch Board", "dispatch board panel");
mustContain(index, "Workflow Timeline", "workflow timeline panel");
mustContain(index, "Same-Origin Session Archive", "research lane section");
mustContain(index, "Run Research Session", "research session action");
mustContain(index, "Work This Handoff", "handoff activation action");
mustContain(index, "SkyeLeadVault", "handoff target");
mustContain(index, "SkyeWebCreatorMax", "handoff target");
mustContain(index, "AE-FlowPro", "handoff target");
mustContain(index, "SkyeProofx", "handoff target");
mustContain(index, "three.min.js", "Three.js dependency");
mustContain(index, "canvas.getContext('2d')", "2D canvas runtime");
mustContain(index, "actorId:'skydexia-neural'", "worker build actor id");
mustContain(index, "tenantId:tenant", "worker build tenant id");
mustContain(index, "60 registered files across 8 categories", "updated knowledge count claim");
mustContain(index, "SkyDexia Knowledge Pack 2026-05-02", "visible latest knowledge pack");
mustContain(index, "SKYDEXIA_AI_BOOT_PROMPT.md", "knowledge pack boot prompt node");
mustContain(index, "skydexia_knowledge_chunks.jsonl", "knowledge pack RAG chunks node");
mustContain(original, "three-overlay", "original 3D overlay");
mustContain(original, "THREE.Scene()", "original Three.js scene");
mustContain(original, "status: 'WIRED'", "conservative wired platform statuses");
mustContain(original, "status: 'PLANNED'", "conservative planned platform statuses");
mustContain(original, "60 knowledge files registered across 8 categories", "original edition updated knowledge bus event");
mustContain(manifestText, "/runtime/standalone-apps/NeuralSpacePro/queue/drain", "queue drain worker route");
mustContain(manifestText, "/runtime/standalone-apps/NeuralSpacePro/handoff-packs", "handoff route in release manifest");
mustContain(manifestText, "/runtime/standalone-apps/NeuralSpacePro/v1/runtime-summary", "runtime summary route in release manifest");
mustContain(manifestText, "/runtime/standalone-apps/NeuralSpacePro/v1/sessions", "session archive route in release manifest");
mustContain(manifestText, "/runtime/standalone-apps/NeuralSpacePro/.netlify/functions/gateway-chat", "research chat route in release manifest");
mustContain(manifestText, "SkyDexia_Knowledge_Pack_2026-05-02", "release manifest latest knowledge pack");
if (index.includes("localStorage.setItem('sdx_worker_secret')") || index.includes("localStorage.getItem('sdx_worker_secret')")) {
  throw new Error("Worker secret is still stored in localStorage");
}
if (original.includes("status: 'LIVE'") || original.includes("status: 'STAGING'") || original.includes("status: 'BUILDING'")) {
  throw new Error("Original edition still overstates platform runtime status");
}

if (manifest.product !== "NeuralSpacePro") {
  throw new Error(`Unexpected manifest product: ${manifest.product}`);
}
if (manifest.workerConnection?.defaultUrl !== "http://<runtime-host>:4120") {
  throw new Error("Unexpected worker default URL contract");
}
if (manifest.workerConnection?.sameOriginLocalRuntime !== true) {
  throw new Error("Missing same-origin local runtime contract");
}
if (manifest.status !== "partial") {
  throw new Error(`Unexpected manifest status: ${manifest.status}`);
}
if (manifest.proofStatus?.status !== "partial") {
  throw new Error("Missing conservative proof status metadata");
}
if (manifest.knowledgeSources?.totalRegistered !== 60) {
  throw new Error(`Unexpected knowledge source count: ${manifest.knowledgeSources?.totalRegistered}`);
}
if (!manifest.knowledgeSources?.categories?.includes("pack")) {
  throw new Error("Release manifest does not include the knowledge pack category");
}
if (!fs.existsSync(path.join(root, "runtime/local-worker.mjs"))) {
  throw new Error("Missing runtime/local-worker.mjs");
}
if (!fs.existsSync(path.join(root, "runtime/local-runtime.mjs"))) {
  throw new Error("Missing runtime/local-runtime.mjs");
}

for (const rel of [
  "runtime/local-worker.mjs",
  "runtime/local-runtime.mjs",
]) {
  const sourcePath = path.join(root, rel);
  const tempPath = path.join(os.tmpdir(), `skydexia-proof-${path.basename(rel)}-${process.pid}.mjs`);
  fs.writeFileSync(tempPath, fs.readFileSync(sourcePath, "utf8"));
  const result = spawnSync(process.execPath, ["--check", tempPath], { encoding: "utf8" });
  fs.unlinkSync(tempPath);
  if (result.status !== 0) {
    throw new Error(`${rel} failed syntax check: ${result.stderr || result.stdout}`);
  }
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "skydexia-local-worker-"));
const tempStatePath = path.join(tempDir, "local-worker-state.json");
const tempOutputDir = path.join(tempDir, "output");
const workerSecret = "proof-secret";

const { server } = await createSkyeDexiaLocalWorker({
  statePath: tempStatePath,
  outputDir: tempOutputDir,
  workerSecret,
});

await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});

const address = server.address();
const port = typeof address === "object" && address ? address.port : null;
if (!port) {
  throw new Error("Local worker failed to bind to a port");
}

const workerBase = `http://127.0.0.1:${port}`;

try {
  const unauthorizedHealth = await fetch(`${workerBase}/health`);
  if (unauthorizedHealth.status !== 401) {
    throw new Error(`Expected unauthorized health check without secret, got ${unauthorizedHealth.status}`);
  }

  const headers = { "x-worker-secret": workerSecret, "content-type": "application/json" };
  const health = await fetch(`${workerBase}/health`, { headers: { "x-worker-secret": workerSecret } }).then((response) => response.json());
  if (health.ok !== true || health.mode !== "local-proof-harness") {
    throw new Error("Local worker /health did not return the expected proof-harness payload");
  }
  if (health.runtimeSummary?.sessionCount !== 0) {
    throw new Error("Local worker /health did not expose an empty session summary");
  }

  const emptyChat = await fetch(`${workerBase}/.netlify/functions/gateway-chat`, {
    method: "POST",
    headers,
    body: JSON.stringify({ messages: [] }),
  });
  if (emptyChat.status !== 400) {
    throw new Error(`Expected session validation failure, got ${emptyChat.status}`);
  }

  const chat = await fetch(`${workerBase}/.netlify/functions/gateway-chat`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      tenantId: "ae-commandhub",
      messages: [
        { role: "system", content: "You are SkyeDexia." },
        { role: "user", content: "Find the best revenue lane for local proof operators." },
      ],
    }),
  }).then((response) => response.json());
  if (chat.ok !== true || !chat.sessionId) {
    throw new Error("Local worker /.netlify/functions/gateway-chat did not archive a session");
  }

  const runtimeSummaryBeforeBuild = await fetch(`${workerBase}/v1/runtime-summary`, {
    headers: { "x-worker-secret": workerSecret },
  }).then((response) => response.json());
  if (runtimeSummaryBeforeBuild.ok !== true || runtimeSummaryBeforeBuild.summary?.sessionCount !== 1) {
    throw new Error("Local worker /v1/runtime-summary did not reflect the archived research session");
  }

  const sessions = await fetch(`${workerBase}/v1/sessions`, {
    headers: { "x-worker-secret": workerSecret },
  }).then((response) => response.json());
  if (sessions.ok !== true || sessions.totalSessions !== 1) {
    throw new Error("Local worker /v1/sessions did not list the archived research session");
  }

  const sessionDetail = await fetch(`${workerBase}/v1/sessions/${chat.sessionId}`, {
    headers: { "x-worker-secret": workerSecret },
  }).then((response) => response.json());
  if (sessionDetail.ok !== true || sessionDetail.session?.sessionId !== chat.sessionId) {
    throw new Error("Local worker /v1/sessions/:id did not return the archived research session");
  }

  const emptyBuild = await fetch(`${workerBase}/build-website`, {
    method: "POST",
    headers,
    body: JSON.stringify({ brief: "" }),
  });
  if (emptyBuild.status !== 400) {
    throw new Error(`Expected brief validation failure, got ${emptyBuild.status}`);
  }

  const build = await fetch(`${workerBase}/build-website`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      brief: "Build a local proof-ready SaaS workspace for sovereign app launch operators.",
      name: "Proof Harness Workspace",
      tenantId: "ae-commandhub",
      actorId: "skydexia-neural",
    }),
  }).then((response) => response.json());

  if (build.ok !== true) {
    throw new Error("Local worker /build-website did not return ok");
  }
  if (build.workerMode !== "local-proof-harness") {
    throw new Error("Local worker /build-website did not report local-proof-harness mode");
  }
  if (build.status !== "local-proof-generated") {
    throw new Error(`Unexpected build status: ${build.status}`);
  }
  if (!Array.isArray(build.files) || build.files.length < 3) {
    throw new Error("Local worker /build-website did not return artifact files");
  }

  const status = await fetch(`${workerBase}/status`, {
    headers: { "x-worker-secret": workerSecret },
  }).then((response) => response.json());
  if (status.ok !== true || status.totalProjects !== 1) {
    throw new Error("Local worker /status did not return the generated project");
  }
  if (status.runtimeSummary?.sessionCount !== 1) {
    throw new Error("Local worker /status did not preserve the archived session summary");
  }
  if (status.projects[0]?.status !== "local-proof-generated") {
    throw new Error("Local worker /status overstated the generated project state");
  }

  const projects = await fetch(`${workerBase}/projects`, {
    headers: { "x-worker-secret": workerSecret },
  }).then((response) => response.json());
  if (projects.ok !== true || projects.totalProjects !== 1) {
    throw new Error("Local worker /projects did not return the generated project list");
  }

  const queue = await fetch(`${workerBase}/queue`, {
    headers: { "x-worker-secret": workerSecret },
  }).then((response) => response.json());
  if (queue.ok !== true || queue.queueDepth !== 1) {
    throw new Error("Local worker /queue did not expose the generated event");
  }

  const emptyHandoffs = await fetch(`${workerBase}/handoff-packs`, {
    headers: { "x-worker-secret": workerSecret },
  }).then((response) => response.json());
  if (emptyHandoffs.ok !== true || emptyHandoffs.totalHandoffPacks !== 0) {
    throw new Error("Local worker /handoff-packs did not start empty");
  }

  const badHandoff = await fetch(`${workerBase}/handoff-packs`, {
    method: "POST",
    headers,
    body: JSON.stringify({ projectId: "missing-project" }),
  });
  if (badHandoff.status !== 404) {
    throw new Error(`Expected project-not-found handoff failure, got ${badHandoff.status}`);
  }

  const handoffCreate = await fetch(`${workerBase}/handoff-packs`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      projectId: build.projectId,
      label: "Proof Workspace Handoff",
      notes: "Route this generated site into the next SkyeHands lane.",
      targets: ["SkyeLeadVault", "SkyeWebCreatorMax", "AE-FlowPro"],
    }),
  }).then((response) => response.json());
  if (handoffCreate.ok !== true || handoffCreate.handoffPack?.sourceProjectId !== build.projectId) {
    throw new Error("Local worker /handoff-packs did not archive a handoff pack");
  }
  if (!handoffCreate.handoffPack.downstreamTargets?.includes("SkyeWebCreatorMax")) {
    throw new Error("Local worker handoff pack did not infer the WebCreator target");
  }
  if (!handoffCreate.handoffPack.downstreamTargets?.includes("SkyeLeadVault")) {
    throw new Error("Local worker handoff pack did not infer the LeadVault target");
  }
  if (!handoffCreate.handoffPack.followUpActions?.length) {
    throw new Error("Local worker handoff pack did not derive follow-up actions");
  }

  const handoffList = await fetch(`${workerBase}/handoff-packs`, {
    headers: { "x-worker-secret": workerSecret },
  }).then((response) => response.json());
  if (handoffList.ok !== true || handoffList.totalHandoffPacks !== 1) {
    throw new Error("Local worker /handoff-packs did not list the archived handoff pack");
  }

  const handoffDetail = await fetch(`${workerBase}/handoff-packs/${handoffCreate.handoffPack.id}`, {
    headers: { "x-worker-secret": workerSecret },
  }).then((response) => response.json());
  if (handoffDetail.ok !== true || handoffDetail.handoffPack?.id !== handoffCreate.handoffPack.id) {
    throw new Error("Local worker /handoff-packs/:id did not return the archived handoff pack");
  }

  const reviewUpdate = await fetch(`${workerBase}/handoff-packs/${handoffCreate.handoffPack.id}/review`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      owner: "proof-reviewer",
      status: "approved",
      checkpoint: "artifact_review",
      notes: "Approved for execution handoff.",
    }),
  }).then((response) => response.json());
  if (reviewUpdate.ok !== true || reviewUpdate.handoffPack?.review?.status !== "approved") {
    throw new Error("Local worker /handoff-packs/:id/review did not persist review state");
  }

  const reviewBoard = await fetch(`${workerBase}/review-board`, {
    headers: { "x-worker-secret": workerSecret },
  }).then((response) => response.json());
  if (reviewBoard.ok !== true || reviewBoard.board?.approved !== 1) {
    throw new Error("Local worker /review-board did not expose the approved review");
  }

  const executionUpdate = await fetch(`${workerBase}/handoff-packs/${handoffCreate.handoffPack.id}/execution`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      owner: "proof-executor",
      status: "active",
      checkpoint: "launch_ready",
      nextAction: "Promote into execution lane",
      notes: "Execution lane activated.",
      targets: ["AE-FlowPro", "SkyeProofx"],
    }),
  }).then((response) => response.json());
  if (executionUpdate.ok !== true || executionUpdate.handoffPack?.execution?.status !== "active") {
    throw new Error("Local worker /handoff-packs/:id/execution did not persist execution state");
  }

  const executionBoard = await fetch(`${workerBase}/execution-board`, {
    headers: { "x-worker-secret": workerSecret },
  }).then((response) => response.json());
  if (executionBoard.ok !== true || executionBoard.board?.active !== 1) {
    throw new Error("Local worker /execution-board did not expose the active execution item");
  }

  const dispatchUpdate = await fetch(`${workerBase}/handoff-packs/${handoffCreate.handoffPack.id}/dispatch`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      owner: "proof-dispatch",
      status: "routing",
      checkpoint: "dispatch_ready",
      channel: "operator-queue",
      routeTo: ["SkyeProofx", "AE-FlowPro"],
      nextAction: "Send to downstream queue",
      notes: "Dispatch routing recorded.",
    }),
  }).then((response) => response.json());
  if (dispatchUpdate.ok !== true || dispatchUpdate.handoffPack?.dispatch?.status !== "routing") {
    throw new Error("Local worker /handoff-packs/:id/dispatch did not persist dispatch state");
  }

  const dispatchBoard = await fetch(`${workerBase}/dispatch-board`, {
    headers: { "x-worker-secret": workerSecret },
  }).then((response) => response.json());
  if (dispatchBoard.ok !== true || dispatchBoard.board?.routing !== 1) {
    throw new Error("Local worker /dispatch-board did not expose the routed dispatch item");
  }

  const workflowTimeline = await fetch(`${workerBase}/workflow-timeline`, {
    headers: { "x-worker-secret": workerSecret },
  }).then((response) => response.json());
  if (
    workflowTimeline.ok !== true ||
    workflowTimeline.summary?.handoff !== 1 ||
    workflowTimeline.summary?.review !== 1 ||
    workflowTimeline.summary?.execution !== 1 ||
    workflowTimeline.summary?.dispatch !== 1
  ) {
    throw new Error("Local worker /workflow-timeline did not preserve the full handoff workflow trail");
  }

  const projectDetail = await fetch(`${workerBase}/projects/${build.projectId}`, {
    headers: { "x-worker-secret": workerSecret },
  }).then((response) => response.json());
  if (projectDetail.ok !== true || projectDetail.project?.id !== build.projectId) {
    throw new Error("Local worker /projects/:id did not return the generated project");
  }

  const artifact = await fetch(`${workerBase}/artifacts/${build.projectId}/project.json`, {
    headers: { "x-worker-secret": workerSecret },
  }).then((response) => response.json());
  if (artifact.ok !== true || !String(artifact.contents || "").includes(build.projectId)) {
    throw new Error("Local worker /artifacts/:projectId/:file did not return the generated artifact");
  }

  const artifactList = await fetch(`${workerBase}/project-artifacts/${build.projectId}`, {
    headers: { "x-worker-secret": workerSecret },
  }).then((response) => response.json());
  if (artifactList.ok !== true || !artifactList.files.includes("project.json")) {
    throw new Error("Local worker /project-artifacts/:projectId did not return generated files");
  }

  const drain = await fetch(`${workerBase}/queue/drain`, {
    method: "POST",
    headers: { "x-worker-secret": workerSecret },
  }).then((response) => response.json());
  if (drain.ok !== true || drain.drainedCount !== 1) {
    throw new Error("Local worker /queue/drain did not return the generated event");
  }
  if (drain.events[0]?.type !== "app.generated") {
    throw new Error("Local worker /queue/drain returned the wrong event type");
  }

  const secondDrain = await fetch(`${workerBase}/queue/drain`, {
    method: "POST",
    headers: { "x-worker-secret": workerSecret },
  }).then((response) => response.json());
  if (secondDrain.drainedCount !== 0) {
    throw new Error("Local worker /queue/drain did not empty the queue");
  }

  const queueAfterDrain = await fetch(`${workerBase}/queue`, {
    headers: { "x-worker-secret": workerSecret },
  }).then((response) => response.json());
  if (queueAfterDrain.queueDepth !== 0) {
    throw new Error("Local worker /queue did not report an empty queue after drain");
  }

  const projectDir = path.join(tempOutputDir, build.projectId);
  for (const file of build.files) {
    if (!fs.existsSync(path.join(projectDir, file))) {
      throw new Error(`Missing generated local worker artifact: ${file}`);
    }
  }
} finally {
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}

const runtimeDir = fs.mkdtempSync(path.join(os.tmpdir(), "skydexia-local-runtime-"));
const runtimeStatePath = path.join(runtimeDir, "local-worker-state.json");
const runtimeOutputDir = path.join(runtimeDir, "output");
const runtime = await createSkyeDexiaLocalRuntime({
  statePath: runtimeStatePath,
  outputDir: runtimeOutputDir,
  workerSecret,
  workerPort: 0,
});

await new Promise((resolve, reject) => {
  runtime.server.once("error", reject);
  runtime.server.listen(0, "127.0.0.1", resolve);
});

const runtimeAddress = runtime.server.address();
const runtimePort = typeof runtimeAddress === "object" && runtimeAddress ? runtimeAddress.port : null;
if (!runtimePort) {
  throw new Error("Local runtime failed to bind to a port");
}

try {
  const runtimeIndex = await fetch(`http://127.0.0.1:${runtimePort}/`).then((response) => response.text());
  if (!runtimeIndex.includes("NeuralSpacePro")) {
    throw new Error("Local runtime did not serve index.html");
  }

  const runtimeHealth = await fetch(`http://127.0.0.1:${runtimePort}/health`, {
    headers: { "x-worker-secret": workerSecret },
  }).then((response) => response.json());
  if (runtimeHealth.ok !== true || runtimeHealth.mode !== "local-proof-harness") {
    throw new Error("Local runtime /health did not proxy the proof worker correctly");
  }

  const runtimeBuild = await fetch(`http://127.0.0.1:${runtimePort}/build-website`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-worker-secret": workerSecret,
    },
    body: JSON.stringify({
      brief: "Build a local same-origin proof runtime for SkyeDexia.",
      name: "Same Origin Proof",
      tenantId: "ae-commandhub",
      actorId: "skydexia-neural",
    }),
  }).then((response) => response.json());
  if (runtimeBuild.ok !== true || runtimeBuild.workerMode !== "local-proof-harness") {
    throw new Error("Local runtime /build-website did not return the expected proof-harness payload");
  }

  const runtimeChat = await fetch(`http://127.0.0.1:${runtimePort}/.netlify/functions/gateway-chat`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-worker-secret": workerSecret,
    },
    body: JSON.stringify({
      tenantId: "ae-commandhub",
      messages: [
        { role: "system", content: "You are SkyeDexia." },
        { role: "user", content: "Summarize the same-origin local research lane." },
      ],
    }),
  }).then((response) => response.json());
  if (runtimeChat.ok !== true || !runtimeChat.sessionId) {
    throw new Error("Local runtime /.netlify/functions/gateway-chat did not proxy session archiving");
  }

  const runtimeSummary = await fetch(`http://127.0.0.1:${runtimePort}/v1/runtime-summary`, {
    headers: { "x-worker-secret": workerSecret },
  }).then((response) => response.json());
  if (runtimeSummary.ok !== true || runtimeSummary.summary?.sessionCount !== 1) {
    throw new Error("Local runtime /v1/runtime-summary did not proxy the archived session summary");
  }

  const runtimeSessions = await fetch(`http://127.0.0.1:${runtimePort}/v1/sessions`, {
    headers: { "x-worker-secret": workerSecret },
  }).then((response) => response.json());
  if (runtimeSessions.ok !== true || runtimeSessions.totalSessions !== 1) {
    throw new Error("Local runtime /v1/sessions did not proxy the session archive");
  }

  const runtimeProjects = await fetch(`http://127.0.0.1:${runtimePort}/projects`, {
    headers: { "x-worker-secret": workerSecret },
  }).then((response) => response.json());
  if (runtimeProjects.ok !== true || runtimeProjects.totalProjects !== 1) {
    throw new Error("Local runtime /projects did not proxy the proof worker project list");
  }

  const runtimeQueue = await fetch(`http://127.0.0.1:${runtimePort}/queue`, {
    headers: { "x-worker-secret": workerSecret },
  }).then((response) => response.json());
  if (runtimeQueue.ok !== true || runtimeQueue.queueDepth !== 1) {
    throw new Error("Local runtime /queue did not proxy the proof worker queue");
  }

  const runtimeHandoffCreate = await fetch(`http://127.0.0.1:${runtimePort}/handoff-packs`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-worker-secret": workerSecret,
    },
    body: JSON.stringify({
      projectId: runtimeBuild.projectId,
      label: "Same Origin Handoff",
      notes: "Archive from the same-origin proof runtime.",
      targets: ["SkyeProofx", "AE-FlowPro"],
    }),
  }).then((response) => response.json());
  if (runtimeHandoffCreate.ok !== true || runtimeHandoffCreate.handoffPack?.sourceProjectId !== runtimeBuild.projectId) {
    throw new Error("Local runtime /handoff-packs did not archive a handoff pack");
  }

  const runtimeHandoffList = await fetch(`http://127.0.0.1:${runtimePort}/handoff-packs`, {
    headers: { "x-worker-secret": workerSecret },
  }).then((response) => response.json());
  if (runtimeHandoffList.ok !== true || runtimeHandoffList.totalHandoffPacks !== 1) {
    throw new Error("Local runtime /handoff-packs did not list the archived handoff pack");
  }

  const runtimeHandoffDetail = await fetch(`http://127.0.0.1:${runtimePort}/handoff-packs/${runtimeHandoffCreate.handoffPack.id}`, {
    headers: { "x-worker-secret": workerSecret },
  }).then((response) => response.json());
  if (runtimeHandoffDetail.ok !== true || runtimeHandoffDetail.handoffPack?.id !== runtimeHandoffCreate.handoffPack.id) {
    throw new Error("Local runtime /handoff-packs/:id did not proxy the archived handoff pack");
  }

  const runtimeReview = await fetch(`http://127.0.0.1:${runtimePort}/handoff-packs/${runtimeHandoffCreate.handoffPack.id}/review`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-worker-secret": workerSecret,
    },
    body: JSON.stringify({
      owner: "runtime-reviewer",
      status: "approved",
      checkpoint: "same_origin_review",
      notes: "Approved from runtime proof.",
    }),
  }).then((response) => response.json());
  if (runtimeReview.ok !== true || runtimeReview.handoffPack?.review?.status !== "approved") {
    throw new Error("Local runtime /handoff-packs/:id/review did not proxy review state");
  }

  const runtimeExecution = await fetch(`http://127.0.0.1:${runtimePort}/handoff-packs/${runtimeHandoffCreate.handoffPack.id}/execution`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-worker-secret": workerSecret,
    },
    body: JSON.stringify({
      owner: "runtime-executor",
      status: "active",
      checkpoint: "same_origin_execution",
      nextAction: "Route into downstream work.",
      notes: "Execution active from runtime proof.",
    }),
  }).then((response) => response.json());
  if (runtimeExecution.ok !== true || runtimeExecution.handoffPack?.execution?.status !== "active") {
    throw new Error("Local runtime /handoff-packs/:id/execution did not proxy execution state");
  }

  const runtimeDispatch = await fetch(`http://127.0.0.1:${runtimePort}/handoff-packs/${runtimeHandoffCreate.handoffPack.id}/dispatch`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-worker-secret": workerSecret,
    },
    body: JSON.stringify({
      owner: "runtime-dispatch",
      status: "routing",
      checkpoint: "same_origin_dispatch",
      channel: "same-origin-queue",
      routeTo: ["SkyeProofx", "AE-FlowPro"],
      notes: "Dispatch routed from runtime proof.",
    }),
  }).then((response) => response.json());
  if (runtimeDispatch.ok !== true || runtimeDispatch.handoffPack?.dispatch?.status !== "routing") {
    throw new Error("Local runtime /handoff-packs/:id/dispatch did not proxy dispatch state");
  }

  const runtimeTimeline = await fetch(`http://127.0.0.1:${runtimePort}/workflow-timeline`, {
    headers: { "x-worker-secret": workerSecret },
  }).then((response) => response.json());
  if (
    runtimeTimeline.ok !== true ||
    runtimeTimeline.summary?.handoff !== 1 ||
    runtimeTimeline.summary?.review !== 1 ||
    runtimeTimeline.summary?.execution !== 1 ||
    runtimeTimeline.summary?.dispatch !== 1
  ) {
    throw new Error("Local runtime /workflow-timeline did not proxy the full workflow trail");
  }

  const runtimeArtifactList = await fetch(`http://127.0.0.1:${runtimePort}/project-artifacts/${runtimeBuild.projectId}`, {
    headers: { "x-worker-secret": workerSecret },
  }).then((response) => response.json());
  if (runtimeArtifactList.ok !== true || !runtimeArtifactList.files.includes("build-summary.json")) {
    throw new Error("Local runtime /project-artifacts/:projectId did not proxy generated file listings");
  }
} finally {
  await runtime.close();
}

console.log(JSON.stringify({
  ok: true,
  folder: "NeuralSpacePro",
  status: "partial",
  proof: [
    "ui-files-present",
    "worker-contract-present",
    "2d-and-3d-markers-present",
    "local-worker-harness-contract-proven",
    "same-origin research-session archive proven",
    "queue-artifact-and-handoff inspection proven",
    "review-execution-dispatch timeline proven",
    "same-origin local runtime proven"
  ]
}, null, 2));
