#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createSkyeMailLocalRuntime } from "../runtime/local-runtime.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

for (const rel of [
  "dashboard.html",
  "assets/mailbox-page.js",
  "runtime/local-runtime.mjs",
  "runtime/store.json",
  "smoke/smoke-standalone-proof.mjs"
]) {
  assert(fs.existsSync(path.join(root, rel)), `Missing required SkyeMail file: ${rel}`);
}

const dashboard = fs.readFileSync(path.join(root, "dashboard.html"), "utf8");
for (const needle of [
  "System Handoff Archive",
  "Archive Mail Handoff Packet",
  "runtimeStatus",
  "runtimeArchiveList",
  "Packet Review Board",
  "Save Latest Packet Review",
  "Advance Latest Review",
  "Execution Board",
  "Queue Latest Packet Execution",
  "executionBoardStatus",
  "Dispatch Board",
  "Queue Latest Packet Dispatch",
  "workflowTimelineList",
  "SkyeLeadVault",
  "skyeroutex-workforce-command-v0.4.0"
]) {
  assert(dashboard.includes(needle), `SkyeMail dashboard is missing runtime handoff marker: ${needle}`);
}

const mailboxPage = fs.readFileSync(path.join(root, "assets/mailbox-page.js"), "utf8");
for (const needle of [
  "archiveRuntimePacket",
  "buildPacketPayload",
  "/api/runtime/mail-handoff-packets",
  "/api/runtime/review-board",
  "/api/runtime/execution-board",
  "/api/runtime/dispatch-board",
  "/api/runtime/workflow-timeline",
  "saveLatestPacketReview",
  "queueLatestPacketExecution",
  "queueLatestPacketDispatch",
  "nextDispatchStatus",
  "nextExecutionStatus",
  "nextReviewStatus",
  "SkyeWebCreatorMax",
  "selectedTargetValues"
]) {
  assert(mailboxPage.includes(needle), `SkyeMail mailbox page is missing runtime wiring marker: ${needle}`);
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "skyemail-runtime-"));
const storePath = path.join(tempDir, "skyemail-store.json");
const { server, context, close } = createSkyeMailLocalRuntime({ storePath });

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

try {
  const address = server.address();
  const base = `http://127.0.0.1:${address.port}`;

  const servedDashboard = await fetch(`${base}/dashboard.html`).then((res) => res.text());
  assert(servedDashboard.includes("System Handoff Archive"), "Runtime server did not serve the updated dashboard shell.");

  const health = await fetch(`${base}/health`).then((res) => res.json());
  assert(health.ok && health.app === "SkyeMail", "SkyeMail runtime health contract drifted.");
  assert(health.mode === "same-folder-local-runtime", "SkyeMail runtime mode drifted.");

  const initialStatus = await fetch(`${base}/api/runtime/status`).then((res) => res.json());
  assert((initialStatus.mailHandoffPackets?.total || 0) === 0, "SkyeMail runtime should start with an empty handoff archive.");
  assert((initialStatus.reviewBoard?.total || 0) === 0, "SkyeMail review board should start empty.");
  assert((initialStatus.executionBoard?.total || 0) === 0, "SkyeMail execution board should start empty.");
  assert((initialStatus.dispatchBoard?.total || 0) === 0, "SkyeMail dispatch board should start empty.");

  const created = await fetch(`${base}/api/runtime/mail-handoff-packets`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      mailHandoffPacket: {
        label: "Phoenix restaurant inbox handoff",
        notes: "Two messages need lead capture, launch follow-up, and proof retention.",
        mailbox: {
          googleEmail: "ops@skymail.local",
          connected: true,
          watchStatus: "watch-active"
        },
        selection: {
          label: "INBOX",
          query: "launch restaurant",
          messageCount: 8,
          selectedCount: 2
        },
        draftsSummary: {
          total: 3,
          latestSubject: "Restaurant launch follow-up"
        },
        contactsSummary: {
          saved: 2,
          recent: 1
        },
        messages: [
          {
            id: "msg_launch",
            threadId: "thread_launch",
            subject: "Website launch and menu QR follow-up",
            from: "Maggie Stone <maggie@internal.invalid>",
            to: "ops@skymail.local",
            snippet: "Need storefront launch, lead capture, and menu update before staff rollout.",
            internalDate: "2026-05-02T01:23:45.000Z",
            labels: ["INBOX", "UNREAD"],
            unread: true,
            starred: true,
            important: true,
            hasAttachments: false
          },
          {
            id: "msg_policy",
            threadId: "thread_policy",
            subject: "Dispatch policy proof packet",
            from: "Ops Desk <ops@skymail.local>",
            to: "dispatch@internal.invalid",
            snippet: "Attach contract evidence and route staffing notes before dispatch handoff.",
            internalDate: "2026-05-02T02:00:00.000Z",
            labels: ["INBOX"],
            unread: false,
            starred: false,
            important: false,
            hasAttachments: true
          }
        ]
      }
    })
  }).then((res) => res.json());

  assert(created.ok && created.mailHandoffPacket?.packetId, "SkyeMail runtime did not return a saved handoff packet.");
  assert(created.mailHandoffPacket.summary.unreadSelected === 1, "SkyeMail runtime unread summary drifted.");
  assert(created.mailHandoffPacket.summary.attachmentSelected === 1, "SkyeMail runtime attachment summary drifted.");
  assert(created.mailHandoffPacket.summary.targetPlatforms.includes("SkyeLeadVault"), "SkyeMail runtime did not infer SkyeLeadVault.");
  assert(created.mailHandoffPacket.summary.targetPlatforms.includes("AE-FlowPro"), "SkyeMail runtime did not infer AE-FlowPro.");
  assert(created.mailHandoffPacket.summary.targetPlatforms.includes("skyeroutex-workforce-command-v0.4.0"), "SkyeMail runtime did not infer Workforce Command.");
  assert(created.mailHandoffPacket.summary.targetPlatforms.includes("SkyeProofx"), "SkyeMail runtime did not infer SkyeProofx.");
  assert(created.mailHandoffPacket.summary.targetPlatforms.includes("SkyeWebCreatorMax"), "SkyeMail runtime did not infer SkyeWebCreatorMax.");

  const stored = JSON.parse(fs.readFileSync(context.storePath, "utf8"));
  assert(Array.isArray(stored.mailHandoffPackets) && stored.mailHandoffPackets.length === 1, "SkyeMail runtime did not persist the packet on disk.");

  const listed = await fetch(`${base}/api/runtime/mail-handoff-packets`).then((res) => res.json());
  assert(listed.total === 1, "SkyeMail runtime list contract drifted.");

  const initialBoard = await fetch(`${base}/api/runtime/review-board`).then((res) => res.json());
  assert(initialBoard.ok && initialBoard.counts.total === 1, "SkyeMail review board should expose the archived packet.");
  assert(initialBoard.counts.unassigned === 1, "SkyeMail review board should start with an unassigned packet.");

  const reviewed = await fetch(`${base}/api/runtime/mail-handoff-packets/${created.mailHandoffPacket.packetId}/review`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      review: {
        owner: "ops@internal.invalid",
        status: "ready",
        checkpoint: "Lead handoff approved",
        notes: "Promote contact into CRM and route launch work into AE-FlowPro."
      }
    })
  }).then((res) => res.json());
  assert(reviewed.ok && reviewed.mailHandoffPacket.review.status === "ready", "SkyeMail review save did not persist the updated status.");
  assert(reviewed.mailHandoffPacket.review.owner === "ops@internal.invalid", "SkyeMail review save did not persist the owner.");
  assert(reviewed.reviewBoard.counts.ready === 1, "SkyeMail review board ready count drifted.");
  assert(reviewed.reviewBoard.counts.unassigned === 0, "SkyeMail review board unassigned count drifted.");

  const fetched = await fetch(`${base}/api/runtime/mail-handoff-packets/${created.mailHandoffPacket.packetId}`).then((res) => res.json());
  assert(fetched.ok && fetched.mailHandoffPacket.packetId === created.mailHandoffPacket.packetId, "SkyeMail runtime fetch-by-id contract drifted.");
  assert(fetched.mailHandoffPacket.review.status === "ready", "SkyeMail fetch-by-id did not include the persisted review state.");

  const execution = await fetch(`${base}/api/runtime/mail-handoff-packets/${created.mailHandoffPacket.packetId}/execution`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      execution: {
        owner: "launch-ops@internal.invalid",
        status: "active",
        checkpoint: "Lead + launch routing active",
        dueAt: "2026-05-03T15:00:00.000Z",
        nextAction: "Send CRM handoff and launch packet downstream",
        notes: "Packet is now in active downstream execution."
      }
    })
  }).then((res) => res.json());
  assert(execution.ok && execution.mailHandoffPacket.execution.status === "active", "SkyeMail execution save did not persist the updated status.");
  assert(execution.mailHandoffPacket.execution.owner === "launch-ops@internal.invalid", "SkyeMail execution save did not persist the owner.");
  assert(Array.isArray(execution.mailHandoffPacket.execution.targets) && execution.mailHandoffPacket.execution.targets.length >= 2, "SkyeMail execution save did not retain downstream targets.");
  assert(execution.executionBoard.counts.active === 1, "SkyeMail execution board active count drifted.");

  const executionBoard = await fetch(`${base}/api/runtime/execution-board`).then((res) => res.json());
  assert(executionBoard.ok && executionBoard.counts.total === 1, "SkyeMail execution board should expose the executed packet.");
  assert(executionBoard.items[0]?.execution?.nextAction === "Send CRM handoff and launch packet downstream", "SkyeMail execution board lost the persisted next action.");

  const defaultsPacket = await fetch(`${base}/api/runtime/mail-handoff-packets`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      mailHandoffPacket: {
        label: "Phoenix donor-default packet",
        notes: "Use donor defaults for execution and dispatch.",
        mailbox: {
          googleEmail: "ops@skymail.local",
          connected: true,
          watchStatus: "watch-active"
        },
        selection: {
          label: "INBOX",
          query: "lead follow-up",
          messageCount: 1,
          selectedCount: 1
        },
        messages: [
          {
            id: "msg_default",
            threadId: "thread_default",
            subject: "Lead follow-up package",
            from: "Founder <founder@internal.invalid>",
            to: "ops@skymail.local",
            snippet: "Need CRM capture and activation handoff before launch routing.",
            internalDate: "2026-05-02T03:00:00.000Z",
            labels: ["INBOX", "UNREAD"],
            unread: true,
            starred: false,
            important: true,
            hasAttachments: false
          }
        ]
      }
    })
  }).then((res) => res.json());
  assert(defaultsPacket.ok && defaultsPacket.mailHandoffPacket?.packetId, "SkyeMail failed to create the donor-default packet.");

  const reviewedDefaultsPacket = await fetch(`${base}/api/runtime/mail-handoff-packets/${defaultsPacket.mailHandoffPacket.packetId}/review`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      review: {
        owner: "ops-defaults@internal.invalid",
        status: "ready",
        checkpoint: "Lead handoff approved",
        notes: "Promote contact into CRM and route launch work into AE-FlowPro."
      }
    })
  }).then((res) => res.json());
  assert(reviewedDefaultsPacket.ok, "SkyeMail donor-default review update failed.");

  const executionDefaults = await fetch(`${base}/api/runtime/mail-handoff-packets/${defaultsPacket.mailHandoffPacket.packetId}/execution`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      execution: {
        owner: "launch-defaults@internal.invalid",
        status: "queued",
        notes: "Use donor-aligned defaults for checkpoint and next action."
      }
    })
  }).then((res) => res.json());
  assert(executionDefaults.ok, "SkyeMail execution defaults update failed.");
  assert(executionDefaults.mailHandoffPacket.execution.checkpoint === "Lead handoff approved", "SkyeMail execution defaults did not inherit the review checkpoint.");
  assert(executionDefaults.mailHandoffPacket.execution.nextAction === "Promote contact into CRM and route launch work into AE-FlowPro.", "SkyeMail execution defaults did not inherit the donor-aligned next action.");
  assert(executionDefaults.mailHandoffPacket.execution.targets[0]?.platform === "SkyeLeadVault", "SkyeMail execution defaults did not keep the lead-vault target first.");

  const dispatch = await fetch(`${base}/api/runtime/mail-handoff-packets/${created.mailHandoffPacket.packetId}/dispatch`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      dispatch: {
        owner: "dispatch@internal.invalid",
        status: "ready",
        checkpoint: "crm_launch_dispatch_ready",
        channel: "crm_launch_handoff",
        nextAction: "Deliver the approved packet into CRM and launch execution lanes",
        notes: "Packet is now ready for downstream dispatch."
      }
    })
  }).then((res) => res.json());
  assert(dispatch.ok && dispatch.mailHandoffPacket.dispatch.status === "ready", "SkyeMail dispatch save did not persist the updated status.");
  assert(dispatch.mailHandoffPacket.dispatch.owner === "dispatch@internal.invalid", "SkyeMail dispatch save did not persist the owner.");
  assert(dispatch.dispatchBoard.counts.ready === 1, "SkyeMail dispatch board ready count drifted.");

  const dispatchBoard = await fetch(`${base}/api/runtime/dispatch-board`).then((res) => res.json());
  assert(dispatchBoard.ok && dispatchBoard.counts.total === 1, "SkyeMail dispatch board should expose the dispatched packet.");
  assert(dispatchBoard.items[0]?.dispatch?.channel === "crm_launch_handoff", "SkyeMail dispatch board lost the persisted channel.");

  const dispatchDefaults = await fetch(`${base}/api/runtime/mail-handoff-packets/${defaultsPacket.mailHandoffPacket.packetId}/dispatch`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      dispatch: {
        owner: "dispatch-defaults@internal.invalid",
        status: "queued",
        notes: "Use donor-aligned defaults for channel, checkpoint, and next action."
      }
    })
  }).then((res) => res.json());
  assert(dispatchDefaults.ok, "SkyeMail dispatch defaults update failed.");
  assert(dispatchDefaults.mailHandoffPacket.dispatch.channel === "crm_launch_handoff", "SkyeMail dispatch defaults did not infer the CRM launch channel.");
  assert(dispatchDefaults.mailHandoffPacket.dispatch.checkpoint === "Lead handoff approved", "SkyeMail dispatch defaults did not retain the execution or review checkpoint.");
  assert(dispatchDefaults.mailHandoffPacket.dispatch.nextAction === "Promote contact into CRM and route launch work into AE-FlowPro.", "SkyeMail dispatch defaults did not inherit the donor-aligned next action.");

  const workflowTimeline = await fetch(`${base}/api/runtime/workflow-timeline?limit=2`).then((res) => res.json());
  assert(workflowTimeline.ok, "SkyeMail workflow timeline endpoint did not report ok.");
  assert(workflowTimeline.workflowTimeline.summary.archive === 2, "SkyeMail workflow timeline did not count both archived packets.");
  assert(workflowTimeline.workflowTimeline.summary.review === 2, "SkyeMail workflow timeline did not count both review events.");
  assert(workflowTimeline.workflowTimeline.summary.execution >= 2, "SkyeMail workflow timeline did not count both execution events.");
  assert(workflowTimeline.workflowTimeline.summary.dispatch >= 2, "SkyeMail workflow timeline did not count both dispatch events.");
  assert(workflowTimeline.workflowTimeline.latestEvent?.category === "dispatch", "SkyeMail workflow timeline did not expose the latest workflow event category.");
  assert(workflowTimeline.workflowTimeline.items.length === 2, "SkyeMail workflow timeline limit query did not trim the returned audit window.");

  const storedReviewed = JSON.parse(fs.readFileSync(context.storePath, "utf8"));
  assert(storedReviewed.mailHandoffPackets[0]?.packetId === defaultsPacket.mailHandoffPacket.packetId, "SkyeMail runtime did not keep the latest donor-default packet at the head of the archive.");
  assert(storedReviewed.mailHandoffPackets[0]?.review?.status === "ready", "SkyeMail runtime did not persist review state on disk.");
  assert(storedReviewed.mailHandoffPackets[0]?.execution?.status === "queued", "SkyeMail runtime did not persist the latest execution state on disk.");
  assert(storedReviewed.mailHandoffPackets[0]?.dispatch?.status === "queued", "SkyeMail runtime did not persist the latest dispatch state on disk.");
  assert(Array.isArray(storedReviewed.workflowEvents) && storedReviewed.workflowEvents.length >= 8, "SkyeMail runtime did not persist workflow events on disk.");

  const finalStatus = await fetch(`${base}/api/runtime/status`).then((res) => res.json());
  assert((finalStatus.mailHandoffPackets?.total || 0) === 2, "SkyeMail runtime status did not reflect both archived packets.");
  assert((finalStatus.reviewBoard?.ready || 0) === 2, "SkyeMail runtime status did not reflect the updated review board counts.");
  assert((finalStatus.executionBoard?.queued || 0) === 1, "SkyeMail runtime status did not reflect the latest execution board counts.");
  assert((finalStatus.dispatchBoard?.queued || 0) === 1, "SkyeMail runtime status did not reflect the latest dispatch board counts.");
  assert((finalStatus.workflowTimeline?.dispatch || 0) >= 2, "SkyeMail runtime status did not reflect the expanded workflow timeline summary.");
  assert((finalStatus.workflowBoard?.reviewReady || 0) === 2, "SkyeMail runtime workflow board did not reflect ready review items.");
  assert((finalStatus.workflowBoard?.dispatchQueued || 0) === 1, "SkyeMail runtime workflow board did not reflect queued dispatch items.");
  assert(finalStatus.latestWorkflowEvent?.category === "dispatch", "SkyeMail runtime status did not expose the latest workflow event.");

  console.log(JSON.stringify({
    ok: true,
    platform: "SkyeMail",
    proof: [
      "Inbox shell exposes a same-folder System Handoff Archive",
      "The workflow runtime starts and serves the updated dashboard shell",
      "A mail handoff packet can be archived, listed, fetched by id, and written on disk",
      "Archived packets derive downstream SkyeHands targets and recommended actions from real message summaries",
      "Archived packets can move through a persisted same-folder review board with owner, status, checkpoint, and notes",
      "Reviewed packets can move into a persisted same-folder execution board with owner, dueAt, donor-aligned defaults, and downstream targets",
      "Executed packets can move into a persisted same-folder dispatch board with owner, inferred channel, and downstream next action",
      "Archive, review, execution, and dispatch events all land in one local workflow timeline with a bounded audit window"
    ],
    limits: [
      "Does not prove live Gmail OAuth or deployed Netlify Functions execution",
      "Does not push archived packets into downstream live SkyeHands services"
    ]
  }, null, 2));
} finally {
  await close();
  fs.rmSync(tempDir, { recursive: true, force: true });
}
