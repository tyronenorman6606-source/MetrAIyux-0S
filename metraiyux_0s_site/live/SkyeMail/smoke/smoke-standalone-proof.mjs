import fs from "node:fs";
import os from "node:os";
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createSkyeMailLocalRuntime } from "../runtime/local-runtime.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const requiredFiles = [
  "index.html",
  "dashboard.html",
  "monitoring.html",
  "compose.html",
  "contacts.html",
  "settings.html",
  "suite/index.html",
  "suite/apps/mailbox/index.html",
  "suite/apps/command/index.html",
  "suite/apps/campaigns/index.html",
  "suite/apps/ops/index.html",
  "suite/apps/templates/index.html",
  "tools/build-suite-dist.mjs",
  "runtime/local-runtime.mjs",
  "runtime/store.json",
  "wrangler.toml",
  "cloudflare/skymail-worker.mjs",
  "cloudflare/README.md",
  "assets/monitoring-page.js",
  "netlify/functions/auth-login.js",
  "netlify/functions/auth-fs27-session.js",
  "netlify/functions/auth-signup.js",
  "netlify/functions/mailbox-domains.js",
  "netlify/functions/mail-status.js",
  "netlify/functions/mailbox-provision.js",
  "netlify/functions/_skygate.js",
  "netlify/functions/_mailbox-provider.js",
  "netlify/functions/messages-list.js",
  "netlify/functions/mail-send.js",
  "netlify/functions/gmail-list.js",
  "netlify/functions/gmail-get.js",
  "netlify/functions/gmail-labels.js",
  "netlify/functions/gmail-thread-get.js",
  "netlify/functions/inbound-resend.js",
  "netlify/functions/resend-events-list.js",
  "netlify/functions/resend-health.js",
  "netlify/functions/google-oauth-start.js",
  "netlify/functions/google-status.js",
  "sql/schema.sql",
];

for (const rel of requiredFiles) {
  const full = path.join(root, rel);
  if (!existsSync(full)) {
    throw new Error(`Missing required standalone file: ${rel}`);
  }
}

const read = (rel) => readFileSync(path.join(root, rel), "utf8");

const rootIndex = read("index.html");
if (!rootIndex.includes("kAIxuGateway13 ready")) {
  throw new Error("Root marketing surface no longer declares the gateway-backed assistant lane.");
}

const dashboard = read("dashboard.html");
for (const needle of [
  "System Handoff Archive",
  "archivePacketBtn",
  "runtimeStatus",
  "runtimeArchiveList",
  "Packet Review Board",
  "saveReviewBtn",
  "advanceReviewBtn",
  "Execution Board",
  "queueExecutionBtn",
  "advanceExecutionBtn",
  "Dispatch Board",
  "queueDispatchBtn",
  "advanceDispatchBtn",
  "workflowTimelineList",
  "SkyeLeadVault",
  "AE-FlowPro"
]) {
  if (!dashboard.includes(needle)) {
    throw new Error(`Dashboard is missing expected mail handoff runtime marker: ${needle}`);
  }
}

const suiteIndex = read("suite/index.html");
for (const needle of [
  'data-app-id="SkyeMail"',
  'href="apps/mailbox/index.html"',
  'href="apps/command/index.html"',
]) {
  if (!suiteIndex.includes(needle)) {
    throw new Error(`Suite shell marker missing from suite/index.html: ${needle}`);
  }
}

const mailUi = read("assets/app.js");
for (const needle of [
  'localStorage.removeItem("SMV_LOCAL_RUNTIME_V2")',
  "SkyeMail requires deployed backend functions",
  "Server functions not found",
]) {
  if (!mailUi.includes(needle)) {
    throw new Error(`Expected provider-required marker missing from assets/app.js: ${needle}`);
  }
}

const loginPage = read("login.html");
for (const needle of [
  "Continue with 0S Gate",
  "/auth-fs27-session",
  "Open the 0S Gate first."
]) {
  if (!loginPage.includes(needle)) {
    throw new Error(`Expected FS27 login marker missing from login.html: ${needle}`);
  }
}

const schema = read("sql/schema.sql");
for (const needle of [
  "create table if not exists skymail.hosted_mailboxes",
  "create table if not exists skymail.mailbox_offboarding_events",
  "idx_hosted_mailboxes_user_created"
]) {
  if (!schema.includes(needle)) {
    throw new Error(`Expected hosted mailbox schema marker missing: ${needle}`);
  }
}

const cloudflareWorker = read("cloudflare/skymail-worker.mjs");
for (const needle of [
  "NEON_DATABASE_URL",
  "CITADEL_BACKUP_URL",
  "auth-fs27-session",
  "mailbox-provision",
  "mailbox-offboarding",
  "workspace-mailbox-summary",
  "handleMailboxOffboarding",
  "handleWorkspaceMailboxSummary",
  "mail-send",
  "inbound-resend",
  "ZOHO_REFRESH_TOKEN",
  "provisionZohoMailbox",
  "zohoSendMail",
  "zohoListMessages",
  "gmail-thread-get",
  "skymail.mail.received"
]) {
  if (!cloudflareWorker.includes(needle)) {
    throw new Error(`Expected Cloudflare Worker marker missing: ${needle}`);
  }
}

const mailboxProvider = read("netlify/functions/_mailbox-provider.js");
for (const needle of [
  'provider === "zoho"',
  "ZOHO_ORG_ID",
  "provisionZohoMailbox",
  "zohoSendMail",
  "zohoListMessages",
  "zohoGetMessage",
]) {
  if (!mailboxProvider.includes(needle)) {
    throw new Error(`Expected Citadel/SkyeNet adapter marker missing from _mailbox-provider.js: ${needle}`);
  }
}

const mailSend = read("netlify/functions/mail-send.js");
for (const needle of [
  'hosted?.provider === "zoho"',
  "zohoSendMail",
  "zoho_id",
]) {
  if (!mailSend.includes(needle)) {
    throw new Error(`Expected Zoho send marker missing from mail-send.js: ${needle}`);
  }
}

const gmailList = read("netlify/functions/gmail-list.js");
const gmailGet = read("netlify/functions/gmail-get.js");
const gmailThreadGet = read("netlify/functions/gmail-thread-get.js");
for (const [rel, source, markers] of [
  ["netlify/functions/gmail-list.js", gmailList, ["zohoListMessages", "hosted?.provider === 'zoho'"]],
  ["netlify/functions/gmail-get.js", gmailGet, ["zohoGetMessage", "hosted?.provider === 'zoho'"]],
  ["netlify/functions/gmail-thread-get.js", gmailThreadGet, ["zohoGetMessage", "hosted?.provider === 'zoho'"]],
]) {
  for (const marker of markers) {
    if (!source.includes(marker)) {
      throw new Error(`Expected Zoho inbox marker missing from ${rel}: ${marker}`);
    }
  }
}

const monitoringPage = read("monitoring.html");
for (const needle of [
  "Delivery Summary",
  "Delivery Events",
  "Webhook Processing",
  "assets/monitoring-page.js",
]) {
  if (!monitoringPage.includes(needle)) {
    throw new Error(`Expected monitoring marker missing from monitoring.html: ${needle}`);
  }
}

const monitoringJs = read("assets/monitoring-page.js");
for (const needle of [
  "/resend-health",
  "/resend-events-list?limit=100",
  "Provider setup ready",
]) {
  if (!monitoringJs.includes(needle)) {
    throw new Error(`Expected monitoring API marker missing from assets/monitoring-page.js: ${needle}`);
  }
}

const mailboxPage = read("assets/mailbox-page.js");
for (const needle of [
  "/api/runtime/status",
  "/api/runtime/mail-handoff-packets",
  "/api/runtime/review-board",
  "/api/runtime/execution-board",
  "/api/runtime/dispatch-board",
  "/api/runtime/workflow-timeline",
  "archiveRuntimePacket",
  "saveLatestPacketReview",
  "queueLatestPacketExecution",
  "queueLatestPacketDispatch",
  "exportLatestPacket",
  "SkyeProofx",
  "SkyeWebCreatorMax"
]) {
  if (!mailboxPage.includes(needle)) {
    throw new Error(`Expected handoff runtime marker missing from assets/mailbox-page.js: ${needle}`);
  }
}

const build = spawnSync(process.execPath, ["tools/build-suite-dist.mjs"], {
  cwd: root,
  encoding: "utf8",
});

if (build.status !== 0) {
  throw new Error(`build:suite failed\n${build.stdout}\n${build.stderr}`);
}

const builtSuiteIndex = path.join(root, "dist", "SkyeMail", "index.html");
if (!existsSync(builtSuiteIndex)) {
  throw new Error("build:suite did not produce dist/SkyeMail/index.html");
}

const metadataPath = path.join(root, "dist", "suite-build.json");
if (!existsSync(metadataPath)) {
  throw new Error("build:suite did not emit dist/suite-build.json");
}

const metadata = JSON.parse(readFileSync(metadataPath, "utf8"));
if (metadata.source !== "suite/" || metadata.output !== "dist/SkyeMail/") {
  throw new Error("Unexpected suite-build metadata contract.");
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "skyemail-standalone-"));
const storePath = path.join(tempDir, "skyemail-store.json");
const { server, close } = createSkyeMailLocalRuntime({ storePath });

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

try {
  const address = server.address();
  const base = `http://127.0.0.1:${address.port}`;

  const initialStatus = await fetch(`${base}/api/runtime/status`).then((res) => res.json());
  if ((initialStatus.mailHandoffPackets?.total || 0) !== 0) {
    throw new Error("SkyeMail runtime should start with an empty handoff archive.");
  }
  if ((initialStatus.workflowBoard?.archived || 0) !== 0) {
    throw new Error("SkyeMail workflow board should start empty.");
  }

  const created = await fetch(`${base}/api/runtime/mail-handoff-packets`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      mailHandoffPacket: {
        label: "Standalone workflow packet",
        notes: "Promote the lighter standalone proof to the same workflow bar.",
        mailbox: { googleEmail: "ops@skymail.local", connected: true, watchStatus: "watch-active" },
        selection: { label: "INBOX", query: "lead launch proof", messageCount: 2, selectedCount: 1 },
        messages: [
          {
            id: "msg_standalone",
            threadId: "thread_standalone",
            subject: "Lead launch proof follow-up",
            from: "Ops Desk <ops@skymail.local>",
            to: "ops@skymail.local",
            snippet: "Need CRM capture, activation follow-up, and proof retention before launch.",
            internalDate: "2026-05-03T00:00:00.000Z",
            labels: ["INBOX", "UNREAD"],
            unread: true,
            starred: false,
            important: true,
            hasAttachments: true,
          },
        ],
      },
    }),
  }).then((res) => res.json());
  if (!created.ok || !created.mailHandoffPacket?.packetId) {
    throw new Error("SkyeMail standalone proof did not archive a packet.");
  }

  const reviewed = await fetch(`${base}/api/runtime/mail-handoff-packets/${created.mailHandoffPacket.packetId}/review`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ review: { owner: "ops@internal.invalid", status: "ready", checkpoint: "Mail packet approved", notes: "Promote into CRM and activation follow-up." } }),
  }).then((res) => res.json());
  if (!reviewed.ok || reviewed.mailHandoffPacket.review.status !== "ready") {
    throw new Error("SkyeMail standalone proof did not persist review state.");
  }

  const execution = await fetch(`${base}/api/runtime/mail-handoff-packets/${created.mailHandoffPacket.packetId}/execution`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ execution: { owner: "launch-ops@internal.invalid", status: "active", notes: "Downstream execution is active." } }),
  }).then((res) => res.json());
  if (!execution.ok || execution.mailHandoffPacket.execution.status !== "active") {
    throw new Error("SkyeMail standalone proof did not persist execution state.");
  }

  const dispatch = await fetch(`${base}/api/runtime/mail-handoff-packets/${created.mailHandoffPacket.packetId}/dispatch`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ dispatch: { owner: "dispatch@internal.invalid", status: "ready", notes: "Dispatch is ready for downstream handoff." } }),
  }).then((res) => res.json());
  if (!dispatch.ok || dispatch.mailHandoffPacket.dispatch.status !== "ready") {
    throw new Error("SkyeMail standalone proof did not persist dispatch state.");
  }

  const workflowTimeline = await fetch(`${base}/api/runtime/workflow-timeline?limit=4`).then((res) => res.json());
  if (!workflowTimeline.ok) {
    throw new Error("SkyeMail standalone proof workflow timeline endpoint drifted.");
  }
  if ((workflowTimeline.workflowTimeline.summary.review || 0) < 1) {
    throw new Error("SkyeMail standalone proof did not record review activity.");
  }
  if ((workflowTimeline.workflowTimeline.summary.execution || 0) < 1) {
    throw new Error("SkyeMail standalone proof did not record execution activity.");
  }
  if ((workflowTimeline.workflowTimeline.summary.dispatch || 0) < 1) {
    throw new Error("SkyeMail standalone proof did not record dispatch activity.");
  }
  if (workflowTimeline.workflowTimeline.latestEvent?.category !== "dispatch") {
    throw new Error("SkyeMail standalone proof did not expose the latest dispatch event.");
  }

  const finalStatus = await fetch(`${base}/api/runtime/status`).then((res) => res.json());
  if ((finalStatus.mailHandoffPackets?.total || 0) !== 1) {
    throw new Error("SkyeMail runtime status did not reflect the archived packet.");
  }
  if ((finalStatus.reviewBoard?.ready || 0) !== 1) {
    throw new Error("SkyeMail standalone proof did not reflect ready review state.");
  }
  if ((finalStatus.executionBoard?.active || 0) !== 1) {
    throw new Error("SkyeMail standalone proof did not reflect active execution state.");
  }
  if ((finalStatus.dispatchBoard?.ready || 0) !== 1) {
    throw new Error("SkyeMail standalone proof did not reflect ready dispatch state.");
  }
  if ((finalStatus.workflowBoard?.dispatchReady || 0) !== 1) {
    throw new Error("SkyeMail workflow board did not reflect the ready dispatch item.");
  }
  if (finalStatus.latestWorkflowEvent?.category !== "dispatch") {
    throw new Error("SkyeMail runtime status did not expose the latest dispatch event.");
  }
} finally {
  await close();
  fs.rmSync(tempDir, { recursive: true, force: true });
}

console.log(JSON.stringify({
  ok: true,
  platform: "SkyeMail",
  proof: [
    "Root standalone pages exist",
    "Suite shell and app mounts exist",
    "Standalone Functions contract files exist",
    "Citadel/SkyeNet adapter and inbox bridge markers exist without removing Stalwart, Resend, Gmail, or external-webhook lanes",
    "Provider-required frontend mode fails loud when deployed backend functions are missing",
    "Inbox shell exposes same-folder mail handoff archive controls",
    "Mail runtime module and store exist for same-folder packet archiving",
    "Suite build reproduces dist/SkyeMail",
    "Archived packets can move through same-folder review, execution, and dispatch workflow boards",
    "Runtime status and workflow timeline expose current workflow truth, not only archive counts",
  ],
  limits: [
    "Does not prove live provider credentials",
    "Does not prove deployed Netlify Functions execution",
  ],
}, null, 2));
