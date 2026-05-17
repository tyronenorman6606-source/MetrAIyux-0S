import fs from "node:fs";
import path from "node:path";

import { wrap } from "./_lib/wrap.js";
import { buildCors, json } from "./_lib/http.js";
import { requireAdmin } from "./_lib/admin.js";
import { q } from "./_lib/db.js";

const PLATFORM_CATALOG = [
  {
    app_id: "skyegatefs27",
    title: "SkyeGateFS27",
    description: "Parent auth, billing, vendor, push, and monitoring control plane.",
    visibility: "admin",
    storage_mode: "server-state",
    launch_url: "/index.html"
  },
  {
    app_id: "skyepay",
    title: "SkyePay",
    description: "Stripe-backed closeout lane with payment ledger, confirmed-payment policy write, and automatic workspace unlock status.",
    visibility: "client-admin",
    storage_mode: "stripe-checkout-plus-gate-ledger",
    launch_url: "/skyepay.html"
  },
  {
    app_id: "metraiyux-0s",
    title: "MetrAIyux 0S VPS",
    description: "Customer/operator business OS that can run on its own VPS while mirroring action, billing, workspace, and command telemetry into FS27.",
    visibility: "client-admin",
    storage_mode: "vps-plus-fs27-event-mirror",
    launch_url: null
  },
  {
    app_id: "metraiyux-houseoperations",
    title: "HouseOperations",
    description: "0S house-command app surface for task intake, vendors, schedule pressure, owner alerts, assignments, proof snapshots, FS27 mirror packets, and PIN Gate handoff.",
    visibility: "client-admin",
    storage_mode: "local-app-plus-fs27-event-mirror",
    launch_url: "https://metraiyux-0s-full-system.graylondonskyes.workers.dev/HouseOperations/index.html"
  },
  {
    app_id: "skyebox-authenticator",
    title: "SkyeBox Authenticator",
    description: "Local encrypted TOTP vault mounted under HouseOperations with WebCrypto vault encryption, PWA assets, backup export, and FS27 PIN Gate handoff boundaries.",
    visibility: "client-admin",
    storage_mode: "local-encrypted-vault-plus-gate-recovery",
    launch_url: "https://metraiyux-0s-full-system.graylondonskyes.workers.dev/HouseOperations/skye-box-authenticator-vault/index.html"
  },
  {
    app_id: "superidev3-8",
    title: "SuperIDEv3.8",
    description: "Primary app surface currently bridged into SkyeGateFS27 auth and parent audit.",
    visibility: "operator",
    storage_mode: "hybrid-bridge",
    launch_url: "/Platforms-Apps-Infrastructure/"
  },
  {
    app_id: "skyehands-runtime-control",
    title: "SkyeHands Runtime Control",
    description: "Modified Theia/OpenHands shell runtime with gate env wiring and parent event mirror hooks.",
    visibility: "operator",
    storage_mode: "runtime-control",
    launch_url: null
  },
  {
    app_id: "0s-auth-sdk",
    title: "0s Auth SDK",
    description: "Compatibility client reduced toward a SkyeGateFS27 login bridge.",
    visibility: "bridge",
    storage_mode: "client-bridge",
    launch_url: null
  },
  {
    app_id: "skymail-standalone",
    title: "SkyeMail Standalone",
    description: "Sovereign business email lane for workspace inboxes, mailbox keys, and approval-sensitive sends.",
    visibility: "operator",
    storage_mode: "app-local-plus-gate",
    launch_url: null
  },
  {
    app_id: "citadeldb-sovereign",
    title: "CitadelDB",
    description: "Sovereign database lane that can replace Neon for owners who want the database under their stack.",
    visibility: "operator",
    storage_mode: "sovereign-postgres-lane",
    launch_url: null
  },
  {
    app_id: "skyevault-sovereign",
    title: "SkyeVault",
    description: "Sovereign file, proof, document, and repo/package vault that can replace Google Drive and GitHub-only storage.",
    visibility: "operator",
    storage_mode: "sovereign-vault-lane",
    launch_url: null
  }
];

function integrationDocsRoot() {
  return path.join(process.cwd(), "docs", "integration-dossiers");
}

function countIntegrationDocs() {
  try {
    const dir = integrationDocsRoot();
    if (!fs.existsSync(dir)) return 0;
    return fs.readdirSync(dir).filter((name) => name.endsWith(".md")).length;
  } catch {
    return 0;
  }
}

function getBackupBrainState() {
  const openai = String(process.env.OPENAI_API_KEY || "").trim();
  const anthropic = String(process.env.ANTHROPIC_API_KEY || "").trim();
  const gemini = String(process.env.GEMINI_API_KEY || "").trim();
  const model = String(process.env.SKYGATEFS27_GATE_MODEL || process.env.SKYGATE_GATE_MODEL || "kaixu/deep").trim();
  if (openai) return { configured: true, provider: "openai", model, locked: true };
  if (anthropic) return { configured: true, provider: "anthropic", model, locked: true };
  if (gemini) return { configured: true, provider: "gemini", model, locked: true };
  return { configured: false, provider: null, model: null, locked: false };
}

function summarizePlatform(platform, ops) {
  if (ops?.notes) return String(ops.notes).slice(0, 200);
  if (platform.app_id === "superidev3-8") return "Gate login bridge, parent audit mirror, and local app provisioning coexist here.";
  if (platform.app_id === "metraiyux-0s") return "0S mirrors signup, workspace, billing, command, provisioning, and client action events upward when FS27_EVENT_MIRROR_URL is configured.";
  if (platform.app_id === "metraiyux-houseoperations") return "HouseOperations can export review/execution/dispatch packets and should mirror owner-alert and proof-save events into FS27 when the Worker secret is configured.";
  if (platform.app_id === "skyebox-authenticator") return "SkyeBox stays local-first for authenticator secrets; FS27 owns PIN/recovery identity and should not claim managed TOTP custody until a separate custody service exists.";
  if (platform.app_id === "citadeldb-sovereign") return "Database lane selection, migration, verification, and cutover should be visible in FS27 as platform mirror events.";
  if (platform.app_id === "skyevault-sovereign") return "Vault storage, repo/package, proof export, file count, and key-card events should be visible in FS27.";
  if (platform.app_id === "skyehands-runtime-control") return "Runtime shell can target SkyeGateFS27 through aliased env vars and mirror audit events upward.";
  if (platform.app_id === "0s-auth-sdk") return "Client-side compatibility lane points at gate login but still needs fuller runtime/env adoption.";
  if (platform.app_id === "skymail-standalone") return "Mailboxes, key events, approval-sensitive sends, and mailbox provisioning should mirror into FS27.";
  return platform.description;
}

export default wrap(async (req) => {
  const cors = buildCors(req);
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: cors });
  const admin = requireAdmin(req);
  if (!admin) return json(401, { error: "Unauthorized" }, cors);
  if (req.method !== "GET") return json(405, { error: "Method not allowed" }, cors);

  const [opsRes, customerRes, threadRes, remoteDocRes, mirrorRes, aiUsageRes] = await Promise.all([
    q(`select app_id, health_status, onboarding_stage, lifecycle_status, owner, notes, last_checked_at, updated_at
       from platform_operator_state`, []),
    q(`select
          count(*)::int as total,
          count(*) filter (where is_active=true)::int as active,
          coalesce(sum(max_devices_per_key),0)::int as cohort_seats
       from customers`, []),
    q(`select count(*)::int as audit_rows
       from audit_events
       where action='PLATFORM_EVENT_MIRROR'`, []),
    q(`select count(*)::int as doc_count
       from audit_events
       where action='PLATFORM_EVENT_MIRROR'
         and coalesce(meta->>'lane','')='workspace'`, []),
    q(`select
          count(*)::int as total,
          count(*) filter (where coalesce(meta->>'billable','false')='true')::int as billable,
          count(*) filter (where coalesce(meta->>'privileged','false')='true')::int as privileged,
          count(*) filter (where coalesce(meta->>'source_app','')='metraiyux-0s')::int as metraiyux_0s,
          count(*) filter (where coalesce(meta->>'lane','') in ('workspace','provisioning','billing','command','client_action'))::int as os_action_events
       from audit_events
       where action='PLATFORM_EVENT_MIRROR'`, []),
    q(`select
          count(*)::int as ai_usage_events,
          coalesce(sum(cost_cents),0)::int as ai_metered_cents
       from usage_events`, [])
  ]);

  const opsMap = new Map((opsRes.rows || []).map((row) => [row.app_id, row]));
  const customerStats = customerRes.rows?.[0] || {};
  const mirrorStats = mirrorRes.rows?.[0] || {};
  const aiStats = aiUsageRes.rows?.[0] || {};
  const integrationDocCount = countIntegrationDocs();
  const backup_brain = getBackupBrainState();

  const platforms = PLATFORM_CATALOG.map((platform) => {
    const ops = opsMap.get(platform.app_id) || null;
    return {
      ...platform,
      storage_status: ops ? "operator-reviewed" : "linked-only",
      summary_text: summarizePlatform(platform, ops),
      updated_at: ops?.updated_at || null,
      platform_ops: ops || null
    };
  });

  const attentionNeeded = platforms.filter((platform) => {
    const health = platform.platform_ops?.health_status || "unreviewed";
    const onboarding = platform.platform_ops?.onboarding_stage || "untracked";
    return ["warning", "critical", "unreviewed"].includes(health) || ["queued", "in-progress", "blocked", "untracked"].includes(onboarding);
  }).length;

  const onboardingInflight = platforms.filter((platform) => {
    const onboarding = platform.platform_ops?.onboarding_stage || "untracked";
    return ["queued", "in-progress", "blocked"].includes(onboarding);
  }).length;

  return json(200, {
    storage_ready: true,
    backup_brain,
    counts: {
      surfaces: platforms.length,
      connected_remote_docs: Math.max(integrationDocCount, Number(remoteDocRes.rows?.[0]?.doc_count || 0)),
      cohort_seats: Number(customerStats.cohort_seats || 0),
      skymail_threads: Number(threadRes.rows?.[0]?.audit_rows || 0),
      mirrored_platform_events: Number(mirrorStats.total || 0),
      billable_action_events: Number(mirrorStats.billable || 0),
      privileged_action_events: Number(mirrorStats.privileged || 0),
      metraiyux_0s_events: Number(mirrorStats.metraiyux_0s || 0),
      os_action_events: Number(mirrorStats.os_action_events || 0),
      ai_usage_events: Number(aiStats.ai_usage_events || 0),
      ai_metered_cents: Number(aiStats.ai_metered_cents || 0),
      sovereign_stack_surfaces: platforms.filter((platform) => ["metraiyux-0s", "citadeldb-sovereign", "skyevault-sovereign", "skymail-standalone"].includes(platform.app_id)).length,
      attention_needed: attentionNeeded,
      onboarding_inflight: onboardingInflight,
      station_active_customers: Number(customerStats.active || 0),
      reviewed_platforms: opsMap.size
    },
    platforms
  }, cors);
});
