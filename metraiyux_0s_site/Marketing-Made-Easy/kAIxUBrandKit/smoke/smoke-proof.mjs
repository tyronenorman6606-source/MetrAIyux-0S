import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createBrandKitRuntime } from "../runtime/local-runtime.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

for (const rel of [
  "index.html",
  "runtime/local-runtime.mjs",
  "netlify/functions/kaixu-generate.js",
  "netlify/functions/client-error-report.js",
  "smoke/smoke-contract-proof.mjs"
]) {
  if (!fs.existsSync(path.join(root, rel))) {
    throw new Error(`Missing required BrandKit file: ${rel}`);
  }
}

const indexHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
const html = indexHtml;
if (fs.existsSync(path.join(root, "app.html"))) {
  throw new Error("app.html should not exist; kAIxU BrandKit must use one canonical root app");
}

for (const needle of [
  "System Handoff Archive",
  "btnArchivePacket",
  "runtimeStatus",
  "runtimeArchiveList",
  "reviewBoardStatus",
  "executionBoardStatus",
  "dispatchBoardStatus",
  "workflowTimelineStatusCard",
  "workflowTimelineList",
  "data-review-save",
  "/api/runtime/status",
  "/api/runtime/brand-packets",
  "/api/runtime/review-board",
  "/api/runtime/execution-board",
  "/api/runtime/dispatch-board",
  "/api/runtime/workflow-timeline",
  "SkyeMediaCenter Bridge",
  "SkyeMediaCenter",
  "SkyeLeadVault",
  "SkyeWebCreatorMax",
  "AE-FlowPro"
]) {
  if (!html.includes(needle)) {
    throw new Error(`BrandKit UI is missing expected runtime surface marker: ${needle}`);
  }
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "kaixu-brandkit-smoke-"));
const storePath = path.join(tempDir, "brandkit-store.json");
const journalPath = path.join(tempDir, "ops-journal.json");
const { server, context } = createBrandKitRuntime({ storePath, journalPath });

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

try {
  const address = server.address();
  const base = `http://127.0.0.1:${address.port}`;

  const health = await fetch(`${base}/health`).then((res) => res.json());
  if (!health.ok || health.app !== "kAIxUBrandKit") {
    throw new Error("BrandKit runtime health contract drifted.");
  }

  const initialStatus = await fetch(`${base}/api/runtime/status`).then((res) => res.json());
  if ((initialStatus.brandPackets?.total || 0) !== 0) {
    throw new Error("BrandKit runtime should start with an empty brand-packet archive.");
  }

  const created = await fetch(`${base}/api/runtime/brand-packets`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      brandPacket: {
        label: "Skyes Over London launch packet",
        notes: "Need web launch and CRM capture before operator handoff.",
        brandState: {
          brandName: "Skyes Over London",
          brandTagline: "SOLEnterprises International Nexus & Holdings",
          accentColor: "#FBBF24",
          logoHref: "https://cdn.example.invalid/logo.svg",
          isDark: true,
          aiIntensity: "balanced",
          prompt: "Create launch copy for web, lead capture, and operator rollout.",
          aiOutputExcerpt: "Launch copy, lead capture hooks, and a premium landing page."
        },
        projectSummary: {
          localSnapshots: 3,
          latestSavedAt: "2026-05-02T01:23:45.000Z"
        },
        exports: {
          primaryLockupReady: true,
          iconMarkReady: true,
          exportFormats: ["svg-primary", "svg-mark", "json-snapshots"]
        },
        downstreamTargets: [
          {
            platform: "SkyeLeadVault",
            lane: "crm-intake",
            reason: "Lead capture is part of the launch brief."
          },
          {
            platform: "SkyeWebCreatorMax",
            lane: "brand-launch",
            reason: "Need storefront and landing page follow-through."
          },
          {
            platform: "SkyeMediaCenter",
            lane: "media-assets",
            reason: "Brand files need shared media intake."
          },
          {
            platform: "AE-FlowPro",
            lane: "sales-activation",
            reason: "Need activation readiness and downstream follow-up."
          }
        ]
      }
    })
  }).then((res) => res.json());

  if (!created.ok || !created.item?.packetId) {
    throw new Error("BrandKit runtime did not return a saved packet.");
  }
  if (!created.item.actionItems?.length) {
    throw new Error("BrandKit runtime did not derive action items.");
  }
  if (created.item.handoffSummary?.mediaLane !== "SkyeMediaCenter") {
    throw new Error("BrandKit runtime did not map SkyeMediaCenter into the handoff summary.");
  }

  const storedRaw = JSON.parse(fs.readFileSync(context.storePath, "utf8"));
  if (!Array.isArray(storedRaw.brandPackets) || storedRaw.brandPackets.length !== 1) {
    throw new Error("BrandKit runtime did not persist the brand packet on disk.");
  }

  const listed = await fetch(`${base}/api/runtime/brand-packets`).then((res) => res.json());
  if (listed.total !== 1 || listed.items[0].packetId !== created.item.packetId) {
    throw new Error("BrandKit runtime list contract drifted.");
  }

  const reviewed = await fetch(`${base}/api/runtime/brand-packets/${created.item.packetId}/review`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      review: {
        status: "approved",
        owner: "brand-ops",
        checkpoint: "Ready for storefront and CRM promotion",
        notes: "Reviewed locally and approved for downstream handoff."
      }
    })
  }).then((res) => res.json());
  if (!reviewed.ok || reviewed.item.review?.status !== "approved" || reviewed.item.review?.owner !== "brand-ops") {
    throw new Error("BrandKit runtime review update contract drifted.");
  }

  const board = await fetch(`${base}/api/runtime/review-board`).then((res) => res.json());
  if (!board.ok || (board.summary?.counts?.approved || 0) !== 1 || board.items[0]?.review?.status !== "approved") {
    throw new Error("BrandKit review-board summary contract drifted.");
  }

  const executed = await fetch(`${base}/api/runtime/brand-packets/${created.item.packetId}/execution`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      execution: {
        status: "active",
        owner: "brand-exec",
        checkpoint: "Storefront and CRM assets in motion"
      }
    })
  }).then((res) => res.json());
  if (!executed.ok || executed.item.execution?.status !== "active" || executed.item.execution?.owner !== "brand-exec") {
    throw new Error("BrandKit runtime execution update contract drifted.");
  }

  const executionBoard = await fetch(`${base}/api/runtime/execution-board`).then((res) => res.json());
  if (!executionBoard.ok || (executionBoard.counts?.active || 0) !== 1 || executionBoard.items[0]?.execution?.status !== "active") {
    throw new Error("BrandKit execution-board summary contract drifted.");
  }

  const dispatched = await fetch(`${base}/api/runtime/brand-packets/${created.item.packetId}/dispatch`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      dispatch: {
        status: "ready",
        owner: "brand-dispatch",
        checkpoint: "Ready for downstream lane delivery"
      }
    })
  }).then((res) => res.json());
  if (!dispatched.ok || dispatched.item.dispatch?.status !== "ready" || dispatched.item.dispatch?.owner !== "brand-dispatch") {
    throw new Error("BrandKit runtime dispatch update contract drifted.");
  }

  const dispatchBoard = await fetch(`${base}/api/runtime/dispatch-board`).then((res) => res.json());
  if (!dispatchBoard.ok || (dispatchBoard.counts?.ready || 0) !== 1 || dispatchBoard.items[0]?.dispatch?.status !== "ready") {
    throw new Error("BrandKit dispatch-board summary contract drifted.");
  }

  const workflowTimeline = await fetch(`${base}/api/runtime/workflow-timeline`).then((res) => res.json());
  if (!workflowTimeline.ok) {
    throw new Error("BrandKit workflow timeline endpoint did not report ok.");
  }
  const timelineSummary = workflowTimeline.workflowTimeline?.summary || {};
  if (timelineSummary.archive !== 1 || timelineSummary.review !== 1 || timelineSummary.execution !== 1 || timelineSummary.dispatch !== 1) {
    throw new Error("BrandKit workflow timeline summary drifted.");
  }
  const timelineTypes = Array.isArray(workflowTimeline.workflowTimeline?.timeline)
    ? workflowTimeline.workflowTimeline.timeline.map((event) => event.type)
    : [];
  for (const type of ["brand_packet_archived", "brand_packet_review_updated", "brand_packet_execution_updated", "brand_packet_dispatch_updated"]) {
    if (!timelineTypes.includes(type)) {
      throw new Error(`BrandKit workflow timeline is missing ${type}.`);
    }
  }

  const fetched = await fetch(`${base}/api/runtime/brand-packets/${created.item.packetId}`).then((res) => res.json());
  if (!fetched.ok || fetched.item.packetId !== created.item.packetId || fetched.item.review?.status !== "approved") {
    throw new Error("BrandKit runtime fetch-by-id contract drifted.");
  }

  const finalStatus = await fetch(`${base}/api/runtime/status`).then((res) => res.json());
  if ((finalStatus.brandPackets?.total || 0) !== 1) {
    throw new Error("BrandKit runtime status did not reflect archived packet totals.");
  }
  if ((finalStatus.executionBoard?.active || 0) !== 1 || (finalStatus.dispatchBoard?.ready || 0) !== 1) {
    throw new Error("BrandKit runtime status did not summarize execution/dispatch totals.");
  }
  if ((finalStatus.workflowTimeline?.dispatch || 0) !== 1) {
    throw new Error("BrandKit runtime status did not summarize workflow timeline totals.");
  }

  console.log(JSON.stringify({
    ok: true,
    platform: "kAIxUBrandKit",
    proof: [
      "BrandKit shell exposes a same-folder system handoff archive surface",
      "The local runtime starts and reports health/status truthfully",
      "A real brand handoff packet can be archived, listed, fetched by id, and written on disk",
      "Archived packets carry downstream SkyeHands targets and derived action items",
      "Archived packets can be reviewed, assigned, and promoted through the same-folder review board",
      "Reviewed packets can move through same-folder execution and dispatch boards",
      "A same-folder workflow timeline records archive, review, execution, and dispatch transitions in order"
    ],
    limits: [
      "Does not prove live gateway inference or deployed Netlify runtime behavior",
      "Does not push archived packets into downstream live SkyeHands services"
    ]
  }, null, 2));
} finally {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
