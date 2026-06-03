import crypto from "crypto";
import { q } from "./db.js";
import { getBearer } from "./http.js";
import { verifyJwt } from "./crypto.js";
import { verifyAccessToken } from "./oauth.js";
import { verifySessionToken } from "./sessions.js";

const DEFAULT_APP_CATEGORY = "mounted-app";
const DEFAULT_PLAN = "free99-gate-owned";
const DEFAULT_TIER = "free99";

function cleanText(value, max = 500) {
  return String(value || "").trim().slice(0, max);
}

function cleanId(value, fallback = "") {
  return cleanText(value, 160)
    .toLowerCase()
    .replace(/[^a-z0-9._:-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || fallback;
}

function cleanSlug(value, fallback = "workspace") {
  return cleanText(value, 160)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || fallback;
}

function cleanEmail(value) {
  const email = cleanText(value, 320).toLowerCase();
  return email.includes("@") ? email : "";
}

function cleanUuid(value) {
  const text = cleanText(value, 80).toLowerCase();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(text) ? text : null;
}

function cleanBigIntId(value) {
  const text = cleanText(value, 80);
  return /^\d+$/.test(text) ? text : null;
}

function safeJson(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value;
}

function cleanStringArray(value) {
  if (!value) return [];
  const items = Array.isArray(value) ? value : String(value).split(/\s+/);
  return items.map((item) => cleanText(item, 120)).filter(Boolean);
}

function isOwnerish(role) {
  return ["founder", "owner", "admin", "operator", "service"].includes(cleanText(role, 80).toLowerCase());
}

function mirrorSecret() {
  return cleanText(
    process.env.SKYGATE_APP_SPINE_SECRET ||
      process.env.SKYGATE_EVENT_MIRROR_SECRET ||
      process.env.SKYGATEFS27_EVENT_MIRROR_SECRET ||
      "",
    2000
  );
}

function readMirrorSecret(req) {
  return cleanText(
    req.headers.get("x-skygate-app-spine-secret") ||
      req.headers.get("x-skygate-mirror-secret") ||
      req.headers.get("x-skygate-event-mirror-secret") ||
      "",
    2000
  );
}

function readGateToken(req) {
  return cleanText(
    getBearer(req) ||
      req.headers.get("x-0s-gate-session") ||
      req.headers.get("x-skye-gate-session") ||
      req.headers.get("x-skygate-session") ||
      req.headers.get("x-fs27-session") ||
      "",
    4000
  );
}

async function userByIdOrEmail({ userId = null, email = "" }) {
  const normalizedUserId = cleanUuid(userId);
  if (normalizedUserId) {
    const byId = await q(`select id, email, primary_customer_id, role from users where id=$1 limit 1`, [normalizedUserId]);
    if (byId.rowCount) return byId.rows[0];
  }
  const normalized = cleanEmail(email);
  if (normalized) {
    const byEmail = await q(`select id, email, primary_customer_id, role from users where lower(email)=lower($1) limit 1`, [normalized]);
    if (byEmail.rowCount) return byEmail.rows[0];
  }
  return null;
}

export async function resolveAppSpineActor(req) {
  const expected = mirrorSecret();
  const provided = readMirrorSecret(req);
  if (expected && provided && provided === expected) {
    return { mode: "service", service: true, role: "service", user_id: null, email: null, customer_id: null };
  }

  const token = readGateToken(req);
  if (!token) return null;

  const session = await verifySessionToken(token);
  if (session) {
    return {
      mode: "session",
      service: false,
      role: session.user?.role || session.payload?.role || "user",
      user_id: session.user?.id || null,
      email: session.user?.email || session.payload?.email || null,
      customer_id: session.session?.customer_id || session.user?.primary_customer_id || session.payload?.customer_id || null,
      token
    };
  }

  const access = await verifyAccessToken(token);
  if (access) {
    const user = access.payload?.sub_type === "user" ? await userByIdOrEmail({ userId: access.payload.sub, email: access.payload.email }) : null;
    return {
      mode: "oauth",
      service: false,
      role: access.payload?.role || user?.role || "user",
      user_id: user?.id || (access.payload?.sub_type === "user" ? access.payload.sub : null),
      email: user?.email || access.payload?.email || null,
      customer_id: access.payload?.customer_id || user?.primary_customer_id || null,
      token
    };
  }

  const adminJwt = verifyJwt(token);
  if (adminJwt && isOwnerish(adminJwt.role)) {
    return {
      mode: "admin-jwt",
      service: false,
      role: adminJwt.role || "admin",
      user_id: adminJwt.user_id || adminJwt.sub || null,
      email: adminJwt.email || null,
      customer_id: adminJwt.customer_id || null,
      token
    };
  }

  return null;
}

export async function upsertAppSurface({
  appId,
  displayName,
  category = DEFAULT_APP_CATEGORY,
  defaultPlan = DEFAULT_TIER,
  metadata = {}
}) {
  await q(
    `insert into gate_app_surfaces(app_id, display_name, category, auth_mode, default_plan, status, metadata, updated_at)
     values($1,$2,$3,'fs27-gate-owned',$4,'active',$5::jsonb,now())
     on conflict(app_id)
     do update set
       display_name=excluded.display_name,
       category=excluded.category,
       auth_mode='fs27-gate-owned',
       default_plan=excluded.default_plan,
       status='active',
       metadata=gate_app_surfaces.metadata || excluded.metadata,
       updated_at=now()`,
    [appId, displayName, category, defaultPlan, JSON.stringify(safeJson(metadata))]
  );
}

export async function upsertLoginSurface({ appId, surfaceSlug, displayName = "", loginUrl = "", handoffUrl = "", metadata = {} }) {
  if (!surfaceSlug) return null;
  const row = await q(
    `insert into gate_login_surfaces(app_id, surface_slug, display_name, login_url, handoff_url, auth_target, status, metadata, updated_at)
     values($1,$2,$3,$4,$5,'fs27','active',$6::jsonb,now())
     on conflict(app_id, surface_slug)
     do update set
       display_name=coalesce(nullif(excluded.display_name,''), gate_login_surfaces.display_name),
       login_url=coalesce(nullif(excluded.login_url,''), gate_login_surfaces.login_url),
       handoff_url=coalesce(nullif(excluded.handoff_url,''), gate_login_surfaces.handoff_url),
       auth_target='fs27',
       status='active',
       metadata=gate_login_surfaces.metadata || excluded.metadata,
       updated_at=now()
     returning id`,
    [appId, surfaceSlug, displayName, loginUrl, handoffUrl, JSON.stringify(safeJson(metadata))]
  );
  return row.rows?.[0]?.id || null;
}

async function upsertFs27Workspace({ appId, localWorkspaceId, workspaceSlug, workspaceName, customerId, email, metadata }) {
  const slug = cleanSlug(workspaceSlug || `${appId}-${localWorkspaceId}`, `${appId}-workspace`);
  const name = cleanText(workspaceName, 220) || `${appId} workspace`;
  const row = await q(
    `insert into workspaces(slug, name, status, plan, primary_customer_id, communication_email, skyemail, metadata, updated_at)
     values($1,$2,'active',$3,$4,$5,$6,$7::jsonb,now())
     on conflict(slug)
     do update set
       name=coalesce(nullif(excluded.name,''), workspaces.name),
       status='active',
       plan=coalesce(nullif(excluded.plan,''), workspaces.plan),
       primary_customer_id=coalesce(excluded.primary_customer_id, workspaces.primary_customer_id),
       communication_email=coalesce(excluded.communication_email, workspaces.communication_email),
       skyemail=coalesce(excluded.skyemail, workspaces.skyemail),
       metadata=workspaces.metadata || excluded.metadata,
       updated_at=now()
     returning id, slug`,
    [slug, name, DEFAULT_PLAN, customerId || null, email || null, appId === "skymail" ? email || null : null, JSON.stringify(safeJson(metadata))]
  );
  return row.rows?.[0] || null;
}

export async function linkAppIdentity(input = {}, actor = {}) {
  const appId = cleanId(input.app_id || input.appId, "");
  if (!appId) {
    const err = new Error("Missing app_id.");
    err.status = 400;
    throw err;
  }

  const appDisplayName = cleanText(input.display_name || input.app_label || input.app_name || appId, 160) || appId;
  const localUserId = cleanText(input.local_user_id || input.localUserId || input.user_id || actor.user_id || "", 160);
  const localWorkspaceId = cleanText(input.local_workspace_id || input.localWorkspaceId || input.workspace_id || localUserId || actor.customer_id || actor.user_id || "", 160);
  if (!localUserId && !localWorkspaceId) {
    const err = new Error("Missing local_user_id or local_workspace_id.");
    err.status = 400;
    throw err;
  }

  const requestedEmail = cleanEmail(input.email || actor.email || "");
  if (!actor.service && !isOwnerish(actor.role) && requestedEmail && actor.email && requestedEmail !== cleanEmail(actor.email)) {
    const err = new Error("Cannot link another user's app account with this FS27 session.");
    err.status = 403;
    throw err;
  }

  const user = await userByIdOrEmail({
    userId: input.fs27_user_id || actor.user_id || null,
    email: requestedEmail || actor.email || ""
  });
  const fs27UserId = cleanUuid(user?.id) || cleanUuid(actor.service || isOwnerish(actor.role) ? input.fs27_user_id : actor.user_id);
  const email = cleanEmail(user?.email || requestedEmail || actor.email || "");
  const fs27CustomerId = cleanBigIntId(input.fs27_customer_id) || cleanBigIntId(actor.customer_id) || cleanBigIntId(user?.primary_customer_id);

  await upsertAppSurface({
    appId,
    displayName: appDisplayName,
    category: cleanText(input.category || DEFAULT_APP_CATEGORY, 80),
    defaultPlan: cleanText(input.default_plan || DEFAULT_TIER, 80),
    metadata: input.app_metadata || {}
  });

  await upsertLoginSurface({
    appId,
    surfaceSlug: cleanId(input.login_surface_slug || input.surface_slug || "", ""),
    displayName: cleanText(input.login_surface_name || input.login_surface_display || "", 160),
    loginUrl: cleanText(input.login_url || "", 1000),
    handoffUrl: cleanText(input.handoff_url || "", 1000),
    metadata: input.login_surface_metadata || {}
  });

  const workspaceMeta = {
    source: "fs27_app_spine",
    app_id: appId,
    local_workspace_id: localWorkspaceId || null,
    ...(safeJson(input.workspace_metadata || input.metadata))
  };
  const fs27Workspace = await upsertFs27Workspace({
    appId,
    localWorkspaceId: localWorkspaceId || localUserId,
    workspaceSlug: input.workspace_slug,
    workspaceName: input.workspace_name,
    customerId: fs27CustomerId,
    email,
    metadata: workspaceMeta
  });

  const workspace = await q(
    `insert into gate_app_workspaces(
       app_id, fs27_workspace_id, fs27_customer_id, owner_user_id,
       local_workspace_id, local_workspace_kind, workspace_slug, workspace_name,
       tier, plan_name, status, entitlements, metadata, last_seen_at
     )
     values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb,now())
     on conflict(app_id, local_workspace_id)
     do update set
       fs27_workspace_id=coalesce(excluded.fs27_workspace_id, gate_app_workspaces.fs27_workspace_id),
       fs27_customer_id=coalesce(excluded.fs27_customer_id, gate_app_workspaces.fs27_customer_id),
       owner_user_id=coalesce(excluded.owner_user_id, gate_app_workspaces.owner_user_id),
       local_workspace_kind=excluded.local_workspace_kind,
       workspace_slug=coalesce(excluded.workspace_slug, gate_app_workspaces.workspace_slug),
       workspace_name=coalesce(excluded.workspace_name, gate_app_workspaces.workspace_name),
       tier=excluded.tier,
       plan_name=excluded.plan_name,
       status=excluded.status,
       entitlements=gate_app_workspaces.entitlements || excluded.entitlements,
       metadata=gate_app_workspaces.metadata || excluded.metadata,
       last_seen_at=now()
     returning id, fs27_workspace_id`,
    [
      appId,
      fs27Workspace?.id || null,
      fs27CustomerId || null,
      fs27UserId || null,
      localWorkspaceId || localUserId,
      cleanText(input.local_workspace_kind || "workspace", 80),
      fs27Workspace?.slug || cleanSlug(input.workspace_slug || `${appId}-${localWorkspaceId || localUserId}`, `${appId}-workspace`),
      cleanText(input.workspace_name || `${appDisplayName} workspace`, 220),
      cleanText(input.tier || DEFAULT_TIER, 80),
      cleanText(input.plan_name || input.plan || DEFAULT_PLAN, 120),
      cleanText(input.status || "active", 80),
      JSON.stringify(safeJson(input.entitlements)),
      JSON.stringify(workspaceMeta)
    ]
  );

  const workspaceRow = workspace.rows?.[0] || {};
  const appUser = localUserId ? await q(
    `insert into gate_app_users(
       app_id, fs27_user_id, fs27_customer_id, fs27_workspace_id, gate_app_workspace_id,
       local_user_id, local_user_kind, email, app_role, status, local_auth_status, metadata, last_seen_at
     )
     values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,now())
     on conflict(app_id, local_user_id)
     do update set
       fs27_user_id=coalesce(excluded.fs27_user_id, gate_app_users.fs27_user_id),
       fs27_customer_id=coalesce(excluded.fs27_customer_id, gate_app_users.fs27_customer_id),
       fs27_workspace_id=coalesce(excluded.fs27_workspace_id, gate_app_users.fs27_workspace_id),
       gate_app_workspace_id=coalesce(excluded.gate_app_workspace_id, gate_app_users.gate_app_workspace_id),
       email=coalesce(excluded.email, gate_app_users.email),
       app_role=excluded.app_role,
       status=excluded.status,
       local_auth_status=excluded.local_auth_status,
       metadata=gate_app_users.metadata || excluded.metadata,
       last_seen_at=now()
     returning id`,
    [
      appId,
      fs27UserId || null,
      fs27CustomerId || null,
      workspaceRow.fs27_workspace_id || null,
      workspaceRow.id || null,
      localUserId,
      cleanText(input.local_user_kind || "user", 80),
      email || null,
      cleanText(input.app_role || input.role || actor.role || "user", 80),
      cleanText(input.user_status || "active", 80),
      cleanText(input.local_auth_status || "fs27-linked", 120),
      JSON.stringify({
        source: "fs27_app_spine",
        actor_mode: actor.mode || "unknown",
        ...(safeJson(input.user_metadata || input.metadata))
      })
    ]
  ) : { rows: [] };

  const subjectKind = workspaceRow.id ? "app_workspace" : (fs27UserId ? "user" : "customer");
  const subjectId = workspaceRow.id || fs27UserId || fs27CustomerId || `${appId}:${localWorkspaceId || localUserId}`;
  const entitlementKeys = Array.from(new Set([
    `${appId}.access`,
    ...cleanStringArray(input.entitlement_keys || input.entitlements?.keys || [])
  ]));

  for (const entitlementKey of entitlementKeys) {
    await q(
      `insert into gate_app_entitlements(
         app_id, subject_kind, subject_id, fs27_customer_id, fs27_user_id,
         fs27_workspace_id, gate_app_workspace_id, entitlement_key,
         plan_name, tier, status, limits, metadata, updated_at
       )
       values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'active',$11::jsonb,$12::jsonb,now())
       on conflict(app_id, subject_kind, subject_id, entitlement_key)
       do update set
         fs27_customer_id=coalesce(excluded.fs27_customer_id, gate_app_entitlements.fs27_customer_id),
         fs27_user_id=coalesce(excluded.fs27_user_id, gate_app_entitlements.fs27_user_id),
         fs27_workspace_id=coalesce(excluded.fs27_workspace_id, gate_app_entitlements.fs27_workspace_id),
         gate_app_workspace_id=coalesce(excluded.gate_app_workspace_id, gate_app_entitlements.gate_app_workspace_id),
         plan_name=excluded.plan_name,
         tier=excluded.tier,
         status='active',
         limits=gate_app_entitlements.limits || excluded.limits,
         metadata=gate_app_entitlements.metadata || excluded.metadata,
         updated_at=now()`,
      [
        appId,
        subjectKind,
        String(subjectId),
        fs27CustomerId || null,
        fs27UserId || null,
        workspaceRow.fs27_workspace_id || null,
        workspaceRow.id || null,
        entitlementKey,
        cleanText(input.plan_name || input.plan || DEFAULT_PLAN, 120),
        cleanText(input.tier || DEFAULT_TIER, 80),
        JSON.stringify(safeJson(input.limits)),
        JSON.stringify({ source: "fs27_app_spine", ...(safeJson(input.entitlement_metadata)) })
      ]
    );
  }

  await q(
    `insert into gate_auth_migration_records(
       app_id, local_auth_kind, local_user_id, local_workspace_id, email,
       fs27_user_id, fs27_customer_id, action, status, metadata
     )
     values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)`,
    [
      appId,
      cleanText(input.local_auth_kind || "app-local-id-preserved", 120),
      localUserId || null,
      localWorkspaceId || null,
      email || null,
      fs27UserId || null,
      fs27CustomerId || null,
      cleanText(input.migration_action || "linked_to_fs27", 120),
      cleanText(input.migration_status || "preserved", 120),
      JSON.stringify({
        source: "fs27_app_spine",
        actor_mode: actor.mode || "unknown",
        auth_source: "fs27",
        ...(safeJson(input.migration_metadata || input.metadata))
      })
    ]
  );

  if (appId === "skymail" && email) {
    await q(
      `insert into skymail.gate_user_links(
         fs27_user_id, fs27_customer_id, fs27_gate_card_id, skymail_user_id,
         skymail_id, workspace_id, email, handle, local_auth_status, metadata, last_seen_at
       )
       values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,now())
       on conflict(email)
       do update set
         fs27_user_id=coalesce(excluded.fs27_user_id, gate_user_links.fs27_user_id),
         fs27_customer_id=coalesce(excluded.fs27_customer_id, gate_user_links.fs27_customer_id),
         fs27_gate_card_id=coalesce(excluded.fs27_gate_card_id, gate_user_links.fs27_gate_card_id),
         skymail_user_id=coalesce(excluded.skymail_user_id, gate_user_links.skymail_user_id),
         skymail_id=coalesce(excluded.skymail_id, gate_user_links.skymail_id),
         workspace_id=coalesce(excluded.workspace_id, gate_user_links.workspace_id),
         handle=coalesce(excluded.handle, gate_user_links.handle),
         local_auth_status=excluded.local_auth_status,
         metadata=gate_user_links.metadata || excluded.metadata,
         last_seen_at=now()`,
      [
        fs27UserId || null,
        fs27CustomerId || null,
        cleanText(input.fs27_gate_card_id || input.gate_card_id || "", 160) || null,
        cleanUuid(input.skymail_user_id || localUserId) || null,
        cleanText(input.skymail_id || "", 160) || null,
        localWorkspaceId || null,
        email,
        cleanText(input.handle || "", 120) || null,
        cleanText(input.local_auth_status || "fs27-linked", 120),
        JSON.stringify(safeJson(input.metadata))
      ]
    );

    if (cleanText(input.skymail_id || "", 160)) {
      await q(
        `insert into skymail.gate_mailbox_links(
           skymail_id, fs27_user_id, fs27_customer_id, fs27_gate_card_id,
          workspace_id, mailbox_email, mailbox_kind, status, metadata, last_seen_at
         )
         values($1,$2,$3,$4,$5,$6,$7,'active',$8::jsonb,now())
         on conflict(skymail_id)
         do update set
           fs27_user_id=coalesce(excluded.fs27_user_id, gate_mailbox_links.fs27_user_id),
           fs27_customer_id=coalesce(excluded.fs27_customer_id, gate_mailbox_links.fs27_customer_id),
           fs27_gate_card_id=coalesce(excluded.fs27_gate_card_id, gate_mailbox_links.fs27_gate_card_id),
           workspace_id=coalesce(excluded.workspace_id, gate_mailbox_links.workspace_id),
           mailbox_email=coalesce(excluded.mailbox_email, gate_mailbox_links.mailbox_email),
           mailbox_kind=excluded.mailbox_kind,
           status='active',
           metadata=gate_mailbox_links.metadata || excluded.metadata,
           last_seen_at=now()`,
        [
          cleanText(input.skymail_id, 160),
          fs27UserId || null,
          fs27CustomerId || null,
          cleanText(input.fs27_gate_card_id || input.gate_card_id || "", 160) || null,
          localWorkspaceId || null,
          cleanEmail(input.mailbox_email || input.mailboxEmail || "") || email,
          cleanText(input.mailbox_kind || "hosted", 80),
          JSON.stringify(safeJson(input.metadata))
        ]
      );
    }
  }

  await q(
    `insert into audit_events(actor, action, target, meta)
     values($1,'APP_AUTH_SPINE_LINK',$2,$3::jsonb)`,
    [
      email || actor.email || actor.mode || "app-spine",
      `app:${appId}`,
      JSON.stringify({
        app_id: appId,
        local_user_id: localUserId || null,
        local_workspace_id: localWorkspaceId || null,
        fs27_user_id: fs27UserId || null,
        fs27_customer_id: fs27CustomerId || null,
        gate_app_workspace_id: workspaceRow.id || null,
        actor_mode: actor.mode || "unknown"
      })
    ]
  );

  return {
    app_id: appId,
    fs27_user_id: fs27UserId || null,
    fs27_customer_id: fs27CustomerId || null,
    fs27_workspace_id: workspaceRow.fs27_workspace_id || null,
    gate_app_workspace_id: workspaceRow.id || null,
    gate_app_user_id: appUser.rows?.[0]?.id || null,
    entitlement_keys: entitlementKeys
  };
}

export function hashCredential(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}
