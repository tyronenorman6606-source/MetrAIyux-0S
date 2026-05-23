import { wrap } from "./_lib/wrap.js";
import { badRequest, getBearer, json } from "./_lib/http.js";
import { q } from "./_lib/db.js";
import { resolveAdminAuthority } from "./_lib/admin.js";
import { resolveAuth } from "./_lib/authz.js";

const SERVICE = "skysecure";
const HIERARCHY = {
  root: "fs27",
  vault: "skyevault",
  lane: "skysecure",
  chain: "FS27 -> SkyeVault -> SkySecure"
};
const VAULTOS = {
  service: "skysecure-vaultos",
  title: "SkyeVaultOS / SkySecure Vault Console",
  hierarchy: "FS27 -> SkyeVault -> SkySecure -> SkyeVaultOS",
  commands: [
    "scan",
    "offload",
    "inventory",
    "search",
    "diff",
    "verify",
    "reload",
    "restore-point",
    "grant",
    "revoke",
    "audit"
  ],
  localCli: "npm run vaultos -- <command>",
  proofScript: "npm run vaultos:proof",
  supportCommands: ["ls", "tree", "cat-meta", "manifest", "bundle", "attach", "fs27-sync"],
  publicConsole: "https://metraiyux-0s-full-system.graylondonskyes.workers.dev/skye-vault-os/",
  protectedCandidate: "/workspaces/MetrAIyux-0S/about to delete"
};

function publicVaultosCors(cors = {}) {
  return {
    ...cors,
    "access-control-allow-origin": "*"
  };
}

const MEMORY = {
  packs: new Map(),
  grants: [],
  events: []
};

let schemaReady;

function cleanString(value, fallback = "", max = 500) {
  const raw = value == null || value === "" ? fallback : value;
  return String(raw || fallback).trim().slice(0, max);
}

function cleanId(value, fallback = "", max = 160) {
  return cleanString(value, fallback, max)
    .replace(/[^a-zA-Z0-9._:@/-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max);
}

function cleanInt(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : fallback;
}

function cleanCustomerId(value) {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

function safeObject(value, maxChars = 20000) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const clone = {};
  for (const [key, raw] of Object.entries(value)) {
    if (/password|secret|token|api[_-]?key|authorization|cookie|private/i.test(key)) {
      clone[key] = "[redacted]";
    } else {
      clone[key] = raw;
    }
  }
  const serialized = JSON.stringify(clone);
  if (serialized.length <= maxChars) return clone;
  return {
    truncated: true,
    sha256_hint: cleanString(clone.sha256 || clone.hash || "", "", 140),
    original_keys: Object.keys(clone).slice(0, 80)
  };
}

function safeArray(value, maxItems = 100) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, maxItems).map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return cleanString(item, "", 300);
    return safeObject(item, 5000);
  });
}

function usesMemoryStore() {
  return ["1", "true", "yes"].includes(String(process.env.SKYSECURE_MEMORY_STORE || "").toLowerCase());
}

function skysecureWriteSecret() {
  return cleanString(process.env.SKYESECURE_WRITE_SECRET || process.env.FS27_SKYESECURE_WRITE_SECRET || "", "", 2000);
}

function routePath(req) {
  const url = new URL(req.url);
  let pathname = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname;
  if (pathname === "/.netlify/functions/skysecure-api") {
    const route = cleanId(url.searchParams.get("route") || url.searchParams.get("path") || "proof", "proof", 80)
      .replace(/^\/+/, "");
    pathname = `/skysecure/${route}`;
  }
  return pathname;
}

async function readBody(req) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

async function ensureSkySecureSchema() {
  if (usesMemoryStore()) return { mode: "memory" };
  if (!schemaReady) {
    schemaReady = (async () => {
      await q(`
        create table if not exists skysecure_packs (
          pack_id text primary key,
          workspace_id text,
          repo_id text,
          customer_id bigint,
          object_key text,
          object_sha256 text,
          object_bytes bigint not null default 0,
          file_count integer not null default 0,
          plaintext_bytes bigint not null default 0,
          encrypted_bytes bigint not null default 0,
          public_manifest jsonb not null default '{}'::jsonb,
          recipients jsonb not null default '[]'::jsonb,
          source jsonb not null default '{}'::jsonb,
          status text not null default 'active',
          created_by text,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        )
      `);
      await q(`create index if not exists skysecure_packs_workspace_idx on skysecure_packs(workspace_id)`);
      await q(`create index if not exists skysecure_packs_repo_idx on skysecure_packs(repo_id)`);
      await q(`create index if not exists skysecure_packs_customer_idx on skysecure_packs(customer_id)`);
      await q(`
        create table if not exists skysecure_pack_grants (
          id bigserial primary key,
          pack_id text not null,
          workspace_id text,
          subject_id text not null,
          subject_type text not null default 'user',
          role text not null default 'reader',
          capabilities jsonb not null default '[]'::jsonb,
          status text not null default 'active',
          granted_by text,
          revoked_at timestamptz,
          created_at timestamptz not null default now()
        )
      `);
      await q(`create index if not exists skysecure_pack_grants_pack_idx on skysecure_pack_grants(pack_id)`);
      await q(`create index if not exists skysecure_pack_grants_subject_idx on skysecure_pack_grants(subject_id)`);
      await q(`
        create table if not exists skysecure_pack_events (
          id bigserial primary key,
          pack_id text,
          workspace_id text,
          actor text,
          action text not null,
          meta jsonb not null default '{}'::jsonb,
          created_at timestamptz not null default now()
        )
      `);
      await q(`create index if not exists skysecure_pack_events_pack_idx on skysecure_pack_events(pack_id)`);
      await q(`create index if not exists skysecure_pack_events_workspace_idx on skysecure_pack_events(workspace_id)`);
    })();
  }
  await schemaReady;
  return { mode: "db" };
}

async function resolvePrincipal(req) {
  const systemSecret = skysecureWriteSecret();
  const providedSystemSecret = cleanString(
    req.headers.get("x-skysecure-write-secret") || getBearer(req) || "",
    "",
    2000
  );
  if (systemSecret && providedSystemSecret && providedSystemSecret === systemSecret) {
    return {
      ok: true,
      actor: "skysecure-system",
      role: "admin",
      via: "skysecure_write_secret"
    };
  }

  const admin = await resolveAdminAuthority(req).catch(() => null);
  if (admin) {
    return {
      ok: true,
      actor: cleanString(admin.user_id || admin.sub || "fs27-admin", "fs27-admin", 160),
      role: "admin",
      via: admin.via || "admin"
    };
  }

  const token = getBearer(req);
  if (!token) return null;
  const keyRow = await resolveAuth(token).catch(() => null);
  if (!keyRow || keyRow.is_active === false) return null;
  return {
    ok: true,
    actor: `api-key:${keyRow.api_key_id || keyRow.key_last4 || "unknown"}`,
    role: keyRow.role || "api_key",
    via: "api_key",
    customer_id: keyRow.customer_id || null
  };
}

function requirePrincipal(principal, cors) {
  if (principal?.ok) return null;
  return json(401, { ok: false, error: "SkySecure requires an FS27 admin, session, OAuth token, or active API key." }, cors);
}

function requireAdminish(principal, cors) {
  if (["admin", "owner", "founder"].includes(String(principal?.role || "").toLowerCase())) return null;
  return json(403, { ok: false, error: "SkySecure grants require FS27 admin authority." }, cors);
}

async function audit(action, target, meta, actor) {
  if (usesMemoryStore()) return null;
  try {
    const result = await q(
      `insert into audit_events(actor, action, target, meta)
       values ($1,$2,$3,$4::jsonb)
       returning id, created_at`,
      [actor || "skysecure", action, target || null, JSON.stringify(safeObject(meta, 20000))]
    );
    return result.rows?.[0] || null;
  } catch {
    return null;
  }
}

async function addEvent({ packId, workspaceId, actor, action, meta }) {
  const normalized = {
    pack_id: packId || null,
    workspace_id: workspaceId || null,
    actor: actor || "skysecure",
    action: cleanString(action, "skysecure.event", 120),
    meta: safeObject(meta, 20000),
    created_at: new Date().toISOString()
  };
  if (usesMemoryStore()) {
    const id = MEMORY.events.length + 1;
    MEMORY.events.push({ id, ...normalized });
    return { id, created_at: normalized.created_at };
  }
  const result = await q(
    `insert into skysecure_pack_events(pack_id, workspace_id, actor, action, meta)
     values ($1,$2,$3,$4,$5::jsonb)
     returning id, created_at`,
    [normalized.pack_id, normalized.workspace_id, normalized.actor, normalized.action, JSON.stringify(normalized.meta)]
  );
  await audit(`SKYESECURE_${normalized.action.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`, normalized.pack_id || normalized.workspace_id, normalized.meta, normalized.actor);
  return result.rows?.[0] || null;
}

function normalizePackBody(body, principal) {
  if (body.payload || body.encryptedPayload || body.encrypted_payload || body.files || body.entries) {
    return {
      error: "Register SkySecure pack metadata only. Store ciphertext objects in SkyeVault and pass object_key/object_sha256 here."
    };
  }

  const packId = cleanId(body.pack_id || body.packId || body.id, "", 160);
  if (!packId) return { error: "Missing pack_id." };

  const objectSha256 = cleanString(body.object_sha256 || body.objectSha256 || body.sha256 || "", "", 140);
  if (objectSha256 && !/^[a-fA-F0-9]{64}$/.test(objectSha256)) return { error: "object_sha256 must be a 64-character hex digest." };

  return {
    pack_id: packId,
    workspace_id: cleanId(body.workspace_id || body.workspaceId || body.ws_id || "fs27-skyevault", "fs27-skyevault", 160),
    repo_id: cleanId(body.repo_id || body.repoId || "", "", 180) || null,
    customer_id: cleanCustomerId(body.customer_id || body.customerId || principal?.customer_id),
    object_key: cleanString(body.object_key || body.objectKey || "", "", 800) || null,
    object_sha256: objectSha256 || null,
    object_bytes: cleanInt(body.object_bytes || body.objectBytes, 0),
    file_count: cleanInt(body.file_count || body.fileCount, 0),
    plaintext_bytes: cleanInt(body.plaintext_bytes || body.plaintextBytes, 0),
    encrypted_bytes: cleanInt(body.encrypted_bytes || body.encryptedBytes, 0),
    public_manifest: safeObject(body.public_manifest || body.publicManifest || body.manifest || {}, 40000),
    recipients: safeArray(body.recipients || [], 200),
    source: safeObject(body.source || {}, 20000),
    status: cleanId(body.status || "active", "active", 40),
    created_by: principal?.actor || cleanString(body.created_by || body.createdBy || "skysecure", "skysecure", 160)
  };
}

async function registerPack(req, cors, principal) {
  const unauth = requirePrincipal(principal, cors);
  if (unauth) return unauth;

  const body = await readBody(req);
  const pack = normalizePackBody(body, principal);
  if (pack.error) return badRequest(pack.error, cors);

  await ensureSkySecureSchema();
  if (usesMemoryStore()) {
    const now = new Date().toISOString();
    const existing = MEMORY.packs.get(pack.pack_id);
    MEMORY.packs.set(pack.pack_id, {
      ...(existing || { created_at: now }),
      ...pack,
      updated_at: now
    });
  } else {
    await q(
      `insert into skysecure_packs(
        pack_id, workspace_id, repo_id, customer_id, object_key, object_sha256,
        object_bytes, file_count, plaintext_bytes, encrypted_bytes,
        public_manifest, recipients, source, status, created_by
      )
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb,$13::jsonb,$14,$15)
      on conflict (pack_id)
      do update set
        workspace_id=excluded.workspace_id,
        repo_id=excluded.repo_id,
        customer_id=excluded.customer_id,
        object_key=excluded.object_key,
        object_sha256=excluded.object_sha256,
        object_bytes=excluded.object_bytes,
        file_count=excluded.file_count,
        plaintext_bytes=excluded.plaintext_bytes,
        encrypted_bytes=excluded.encrypted_bytes,
        public_manifest=excluded.public_manifest,
        recipients=excluded.recipients,
        source=excluded.source,
        status=excluded.status,
        updated_at=now()`,
      [
        pack.pack_id,
        pack.workspace_id,
        pack.repo_id,
        pack.customer_id,
        pack.object_key,
        pack.object_sha256,
        pack.object_bytes,
        pack.file_count,
        pack.plaintext_bytes,
        pack.encrypted_bytes,
        JSON.stringify(pack.public_manifest),
        JSON.stringify(pack.recipients),
        JSON.stringify(pack.source),
        pack.status,
        pack.created_by
      ]
    );
  }

  const event = await addEvent({
    packId: pack.pack_id,
    workspaceId: pack.workspace_id,
    actor: principal.actor,
    action: "pack.registered",
    meta: {
      hierarchy: HIERARCHY.chain,
      object_key: pack.object_key,
      object_sha256: pack.object_sha256,
      file_count: pack.file_count,
      encrypted_bytes: pack.encrypted_bytes,
      source: pack.source
    }
  });

  return json(201, { ok: true, service: SERVICE, hierarchy: HIERARCHY, pack, event }, cors);
}

async function listPacks(req, cors, principal) {
  const unauth = requirePrincipal(principal, cors);
  if (unauth) return unauth;

  await ensureSkySecureSchema();
  const url = new URL(req.url);
  const workspaceId = cleanId(url.searchParams.get("workspace_id") || url.searchParams.get("workspaceId") || "", "", 160);
  const repoId = cleanId(url.searchParams.get("repo_id") || url.searchParams.get("repoId") || "", "", 180);
  const packId = cleanId(url.searchParams.get("pack_id") || url.searchParams.get("packId") || "", "", 160);
  const search = cleanString(url.searchParams.get("q") || "", "", 120).toLowerCase();

  if (usesMemoryStore()) {
    let packs = [...MEMORY.packs.values()];
    if (workspaceId) packs = packs.filter((pack) => pack.workspace_id === workspaceId);
    if (repoId) packs = packs.filter((pack) => pack.repo_id === repoId);
    if (packId) packs = packs.filter((pack) => pack.pack_id === packId);
    if (search) packs = packs.filter((pack) => JSON.stringify(pack).toLowerCase().includes(search));
    return json(200, { ok: true, service: SERVICE, hierarchy: HIERARCHY, count: packs.length, packs }, cors);
  }

  const clauses = [];
  const params = [];
  if (workspaceId) {
    params.push(workspaceId);
    clauses.push(`workspace_id=$${params.length}`);
  }
  if (repoId) {
    params.push(repoId);
    clauses.push(`repo_id=$${params.length}`);
  }
  if (packId) {
    params.push(packId);
    clauses.push(`pack_id=$${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    clauses.push(`(lower(pack_id) like $${params.length} or lower(coalesce(object_key,'')) like $${params.length} or lower(coalesce(repo_id,'')) like $${params.length})`);
  }
  const where = clauses.length ? `where ${clauses.join(" and ")}` : "";
  const result = await q(
    `select pack_id, workspace_id, repo_id, customer_id, object_key, object_sha256,
            object_bytes, file_count, plaintext_bytes, encrypted_bytes,
            public_manifest, recipients, source, status, created_by, created_at, updated_at
     from skysecure_packs
     ${where}
     order by updated_at desc
     limit 200`,
    params
  );
  return json(200, { ok: true, service: SERVICE, hierarchy: HIERARCHY, count: result.rowCount, packs: result.rows || [] }, cors);
}

async function writeGrant(req, cors, principal) {
  const unauth = requirePrincipal(principal, cors) || requireAdminish(principal, cors);
  if (unauth) return unauth;

  const body = await readBody(req);
  const action = cleanId(body.action || "grant", "grant", 40).toLowerCase();
  const packId = cleanId(body.pack_id || body.packId, "", 160);
  const workspaceId = cleanId(body.workspace_id || body.workspaceId || "fs27-skyevault", "fs27-skyevault", 160);
  const subjectId = cleanString(body.subject_id || body.subjectId || body.user || body.email || "", "", 240);
  if (!packId) return badRequest("Missing pack_id.", cors);
  if (!subjectId) return badRequest("Missing subject_id.", cors);

  await ensureSkySecureSchema();
  if (action === "revoke") {
    if (usesMemoryStore()) {
      for (const grant of MEMORY.grants) {
        if (grant.pack_id === packId && grant.subject_id === subjectId && grant.status === "active") {
          grant.status = "revoked";
          grant.revoked_at = new Date().toISOString();
        }
      }
    } else {
      await q(
        `update skysecure_pack_grants
         set status='revoked', revoked_at=now()
         where pack_id=$1 and subject_id=$2 and status='active'`,
        [packId, subjectId]
      );
    }
    const event = await addEvent({
      packId,
      workspaceId,
      actor: principal.actor,
      action: "grant.revoked",
      meta: { subject_id: subjectId, hierarchy: HIERARCHY.chain }
    });
    return json(200, { ok: true, service: SERVICE, hierarchy: HIERARCHY, action: "revoke", pack_id: packId, subject_id: subjectId, event }, cors);
  }

  const grant = {
    pack_id: packId,
    workspace_id: workspaceId,
    subject_id: subjectId,
    subject_type: cleanId(body.subject_type || body.subjectType || "user", "user", 60),
    role: cleanId(body.role || "reader", "reader", 60),
    capabilities: safeArray(body.capabilities || ["inspect", "download-ciphertext"], 40),
    status: "active",
    granted_by: principal.actor
  };

  if (usesMemoryStore()) {
    const id = MEMORY.grants.length + 1;
    MEMORY.grants.push({ id, ...grant, created_at: new Date().toISOString(), revoked_at: null });
  } else {
    await q(
      `insert into skysecure_pack_grants(pack_id, workspace_id, subject_id, subject_type, role, capabilities, status, granted_by)
       values ($1,$2,$3,$4,$5,$6::jsonb,$7,$8)`,
      [
        grant.pack_id,
        grant.workspace_id,
        grant.subject_id,
        grant.subject_type,
        grant.role,
        JSON.stringify(grant.capabilities),
        grant.status,
        grant.granted_by
      ]
    );
  }

  const event = await addEvent({
    packId,
    workspaceId,
    actor: principal.actor,
    action: "grant.created",
    meta: { subject_id: subjectId, role: grant.role, capabilities: grant.capabilities, hierarchy: HIERARCHY.chain }
  });
  return json(201, { ok: true, service: SERVICE, hierarchy: HIERARCHY, grant, event }, cors);
}

async function listGrants(req, cors, principal) {
  const unauth = requirePrincipal(principal, cors);
  if (unauth) return unauth;

  await ensureSkySecureSchema();
  const url = new URL(req.url);
  const packId = cleanId(url.searchParams.get("pack_id") || url.searchParams.get("packId") || "", "", 160);

  if (usesMemoryStore()) {
    const grants = MEMORY.grants.filter((grant) => !packId || grant.pack_id === packId);
    return json(200, { ok: true, service: SERVICE, hierarchy: HIERARCHY, count: grants.length, grants }, cors);
  }

  const result = await q(
    `select id, pack_id, workspace_id, subject_id, subject_type, role, capabilities, status, granted_by, revoked_at, created_at
     from skysecure_pack_grants
     where ($1::text is null or pack_id=$1)
     order by created_at desc
     limit 300`,
    [packId || null]
  );
  return json(200, { ok: true, service: SERVICE, hierarchy: HIERARCHY, count: result.rowCount, grants: result.rows || [] }, cors);
}

async function writeEvent(req, cors, principal) {
  const unauth = requirePrincipal(principal, cors);
  if (unauth) return unauth;

  const body = await readBody(req);
  await ensureSkySecureSchema();
  const event = await addEvent({
    packId: cleanId(body.pack_id || body.packId || "", "", 160) || null,
    workspaceId: cleanId(body.workspace_id || body.workspaceId || "fs27-skyevault", "fs27-skyevault", 160),
    actor: principal.actor,
    action: cleanString(body.action || "pack.event", "pack.event", 120),
    meta: {
      hierarchy: HIERARCHY.chain,
      ...safeObject(body.meta || body, 20000)
    }
  });
  return json(202, { ok: true, service: SERVICE, hierarchy: HIERARCHY, event }, cors);
}

async function listEvents(req, cors, principal) {
  const unauth = requirePrincipal(principal, cors);
  if (unauth) return unauth;

  await ensureSkySecureSchema();
  const url = new URL(req.url);
  const packId = cleanId(url.searchParams.get("pack_id") || url.searchParams.get("packId") || "", "", 160);
  const workspaceId = cleanId(url.searchParams.get("workspace_id") || url.searchParams.get("workspaceId") || "", "", 160);

  if (usesMemoryStore()) {
    let events = MEMORY.events;
    if (packId) events = events.filter((event) => event.pack_id === packId);
    if (workspaceId) events = events.filter((event) => event.workspace_id === workspaceId);
    return json(200, { ok: true, service: SERVICE, hierarchy: HIERARCHY, count: events.length, events: events.slice(-300).reverse() }, cors);
  }

  const result = await q(
    `select id, pack_id, workspace_id, actor, action, meta, created_at
     from skysecure_pack_events
     where ($1::text is null or pack_id=$1)
       and ($2::text is null or workspace_id=$2)
     order by created_at desc
     limit 300`,
    [packId || null, workspaceId || null]
  );
  return json(200, { ok: true, service: SERVICE, hierarchy: HIERARCHY, count: result.rowCount, events: result.rows || [] }, cors);
}

async function skysecureCounts() {
  await ensureSkySecureSchema();
  if (usesMemoryStore()) {
    return {
      db: { ok: true, mode: "memory" },
      counts: {
        packs: MEMORY.packs.size,
        active_grants: MEMORY.grants.filter((grant) => grant.status === "active").length,
        events: MEMORY.events.length
      }
    };
  }
  const [packs, grants, events] = await Promise.all([
    q(`select count(*)::int as count from skysecure_packs`),
    q(`select count(*)::int as count from skysecure_pack_grants where status='active'`),
    q(`select count(*)::int as count from skysecure_pack_events`)
  ]);
  return {
    db: { ok: true, mode: "neon" },
    counts: {
      packs: packs.rows?.[0]?.count || 0,
      active_grants: grants.rows?.[0]?.count || 0,
      events: events.rows?.[0]?.count || 0
    }
  };
}

function vaultosSafePack(row = {}) {
  const manifest = safeObject(row.public_manifest || row.publicManifest || {}, 40000);
  const source = safeObject(row.source || {}, 20000);
  const types = manifest.types || source.types || {};
  return {
    pack_id: cleanString(row.pack_id || row.packId || "", "", 160),
    workspace_id: cleanString(row.workspace_id || row.workspaceId || "", "", 160),
    repo_id: cleanString(row.repo_id || row.repoId || "", "", 180),
    object_key_hint: cleanString(row.object_key || row.objectKey || "", "", 800).split("/").pop() || "",
    object_sha256: cleanString(row.object_sha256 || row.objectSha256 || "", "", 140),
    object_bytes: cleanInt(row.object_bytes || row.objectBytes, 0),
    file_count: cleanInt(row.file_count || row.fileCount, 0),
    plaintext_bytes: cleanInt(row.plaintext_bytes || row.plaintextBytes, 0),
    encrypted_bytes: cleanInt(row.encrypted_bytes || row.encryptedBytes, 0),
    status: cleanString(row.status || "active", "active", 60),
    created_at: row.created_at || row.createdAt || "",
    updated_at: row.updated_at || row.updatedAt || "",
    pack_set_id: cleanString(manifest.packSetId || source.packSetId || "", "", 180),
    pack_set_part: cleanInt(manifest.packSetPart || source.packSetPart, 0),
    pack_set_total: cleanInt(manifest.packSetTotal || source.packSetTotal, 0),
    project_name: cleanString(manifest.projectName || row.project_name || "", "", 240),
    original_root: cleanString(source.originalRoot || "", "", 800),
    types,
    command_parity: manifest.commandParity || null,
    delete_gate: manifest.deleteGate || null,
    plaintext_boundary: "No plaintext payload, passphrase, pepper, private key, or download URL is exposed by VaultOS FS27 public routes."
  };
}

async function vaultosPackRows() {
  await ensureSkySecureSchema();
  if (usesMemoryStore()) return [...MEMORY.packs.values()];
  const result = await q(
    `select pack_id, workspace_id, repo_id, object_key, object_sha256, object_bytes,
            file_count, plaintext_bytes, encrypted_bytes, public_manifest, source,
            status, created_at, updated_at
     from skysecure_packs
     where coalesce(source->>'kind','') like 'vaultos%'
        or coalesce(public_manifest->>'packSetId','') <> ''
        or coalesce(public_manifest->>'hierarchy','') like '%SkyeVaultOS%'
     order by updated_at desc
     limit 300`
  );
  return result.rows || [];
}

function summarizeVaultosPacks(packs = []) {
  const types = {};
  const packSets = new Map();
  for (const pack of packs) {
    for (const [type, count] of Object.entries(pack.types || {})) types[type] = (types[type] || 0) + cleanInt(count, 0);
    const key = pack.pack_set_id || pack.pack_id;
    if (!packSets.has(key)) {
      packSets.set(key, {
        pack_set_id: key,
        pack_ids: [],
        object_count: 0,
        file_count: 0,
        plaintext_bytes: 0,
        encrypted_bytes: 0,
        object_bytes: 0,
        types: {}
      });
    }
    const set = packSets.get(key);
    set.pack_ids.push(pack.pack_id);
    set.object_count += 1;
    set.file_count += pack.file_count;
    set.plaintext_bytes += pack.plaintext_bytes;
    set.encrypted_bytes += pack.encrypted_bytes;
    set.object_bytes += pack.object_bytes;
    for (const [type, count] of Object.entries(pack.types || {})) set.types[type] = (set.types[type] || 0) + cleanInt(count, 0);
  }
  return {
    pack_count: packs.length,
    pack_set_count: packSets.size,
    file_count: packs.reduce((sum, pack) => sum + pack.file_count, 0),
    plaintext_bytes: packs.reduce((sum, pack) => sum + pack.plaintext_bytes, 0),
    encrypted_bytes: packs.reduce((sum, pack) => sum + pack.encrypted_bytes, 0),
    object_bytes: packs.reduce((sum, pack) => sum + pack.object_bytes, 0),
    types: Object.fromEntries(Object.entries(types).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
    pack_sets: [...packSets.values()].map((set) => ({
      ...set,
      types: Object.fromEntries(Object.entries(set.types).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])))
    }))
  };
}

async function vaultosInventory(req, cors) {
  const url = new URL(req.url);
  const query = cleanString(url.searchParams.get("q") || "", "", 120).toLowerCase();
  const type = cleanString(url.searchParams.get("type") || "", "", 80).toLowerCase();
  let packs = (await vaultosPackRows()).map(vaultosSafePack);
  if (query) packs = packs.filter((pack) => JSON.stringify(pack).toLowerCase().includes(query));
  if (type) packs = packs.filter((pack) => Object.prototype.hasOwnProperty.call(pack.types || {}, type));
  return json(200, {
    ok: true,
    service: VAULTOS.service,
    hierarchy: { ...HIERARCHY, chain: VAULTOS.hierarchy, console: "skyevaultos" },
    proof_scope: "live-system-proof; metadata inventory only",
    summary: summarizeVaultosPacks(packs),
    packs,
    ts: new Date().toISOString()
  }, publicVaultosCors(cors));
}

async function vaultosSearch(req, cors) {
  const url = new URL(req.url);
  const query = cleanString(url.searchParams.get("q") || url.searchParams.get("query") || "", "", 120).toLowerCase();
  const type = cleanString(url.searchParams.get("type") || "", "", 80).toLowerCase();
  let packs = (await vaultosPackRows()).map(vaultosSafePack);
  packs = packs.filter((pack) => {
    const queryOk = !query || JSON.stringify(pack).toLowerCase().includes(query);
    const typeOk = !type || Object.prototype.hasOwnProperty.call(pack.types || {}, type);
    return queryOk && typeOk;
  });
  return json(200, {
    ok: true,
    service: VAULTOS.service,
    query,
    type,
    match_count: packs.length,
    packs,
    plaintext_boundary: "Search runs over safe FS27 metadata only, never decrypted secret contents.",
    ts: new Date().toISOString()
  }, publicVaultosCors(cors));
}

async function vaultosRestorePoints(cors) {
  await ensureSkySecureSchema();
  let events = [];
  if (usesMemoryStore()) {
    events = MEMORY.events.filter((event) => event.action === "vaultos.restore_point.created");
  } else {
    const result = await q(
      `select id, pack_id, workspace_id, actor, action, meta, created_at
       from skysecure_pack_events
       where action='vaultos.restore_point.created'
       order by created_at desc
       limit 100`
    );
    events = result.rows || [];
  }
  return json(200, {
    ok: true,
    service: VAULTOS.service,
    count: events.length,
    restore_points: events.map((event) => ({
      id: event.meta?.id || event.meta?.restorePointId || "",
      name: event.meta?.name || "",
      created_at: event.created_at || event.meta?.createdAt || "",
      file_count: cleanInt(event.meta?.fileCount, 0),
      total_bytes: cleanInt(event.meta?.totalBytes, 0),
      object_count: cleanInt(event.meta?.objectCount, 0),
      audit_event_count: cleanInt(event.meta?.auditEventCount, 0),
      workspace_id: event.workspace_id || "",
      pack_id: event.pack_id || ""
    })),
    ts: new Date().toISOString()
  }, publicVaultosCors(cors));
}

async function vaultosAudit(cors) {
  await ensureSkySecureSchema();
  let events = [];
  if (usesMemoryStore()) {
    events = MEMORY.events.filter((event) => String(event.action || "").startsWith("vaultos.") || String(event.meta?.hierarchy || "").includes("SkyeVaultOS"));
  } else {
    const result = await q(
      `select id, pack_id, workspace_id, actor, action, meta, created_at
       from skysecure_pack_events
       where action like 'vaultos.%'
          or coalesce(meta->>'hierarchy','') like '%SkyeVaultOS%'
          or coalesce(meta->>'packSetId','') <> ''
       order by created_at desc
       limit 200`
    );
    events = result.rows || [];
  }
  return json(200, {
    ok: true,
    service: VAULTOS.service,
    count: events.length,
    events: events.map((event) => ({
      id: event.id,
      pack_id: event.pack_id || "",
      workspace_id: event.workspace_id || "",
      actor: event.actor || "",
      action: event.action,
      meta: safeObject(event.meta || {}, 10000),
      created_at: event.created_at
    })),
    ts: new Date().toISOString()
  }, publicVaultosCors(cors));
}

async function vaultosProof(cors) {
  const out = {
    ok: true,
    service: VAULTOS.service,
    title: VAULTOS.title,
    hierarchy: {
      ...HIERARCHY,
      console: "skyevaultos",
      chain: VAULTOS.hierarchy
    },
    proof_lane: "0s.live-system.skysecure.vaultos.fs27-skyevault",
    proof_scope: "live-system-proof; execution-scope: local-cli-app-plus-live-fs27-route",
    invariant: "FS27 exposes live VaultOS routes for the deployed system. The proof is treated as live system proof because the system is deployed live, and the receipt also records execution scope: filesystem scan, offload, diff, reload, restore-point, grant, revoke, and audit ran in CLI/app proof storage against the real workspace folder while FS27 proves the live metadata and health surface.",
    execution_scope: {
      filesystem_operations: "CLI/app proof storage against the real workspace folder",
      live_routes: "FS27 Worker metadata, command, proof, and health routes",
      public_console: "0S live Worker route",
      boundary: "No public claim that the Cloudflare Worker mounted or read the private /workspaces filesystem."
    },
    commands: VAULTOS.commands.map((command) => ({
      id: command,
      execution_surface: command === "grant" || command === "revoke" || command === "audit" ? "local-cli-and-fs27-metadata" : "local-cli",
      plaintext_boundary: "No plaintext secrets are accepted by this FS27 route.",
      proof_scope: "live system proof; execution-scope: CLI/app command receipt"
    })),
    support_commands: VAULTOS.supportCommands.map((command) => ({
      id: command,
      execution_surface: command === "fs27-sync" ? "local-cli-to-live-fs27-metadata" : "local-cli",
      plaintext_boundary: "Support commands operate on public-safe metadata, encrypted objects, or receipt files."
    })),
    live_routes: [
      "/skysecure/vaultos",
      "/skysecure/vaultos/health",
      "/skysecure/vaultos/proof",
      "/skysecure/vaultos/commands",
      "/skysecure/vaultos/inventory",
      "/skysecure/vaultos/search",
      "/skysecure/vaultos/restore-points",
      "/skysecure/vaultos/audit",
      "/skysecure/proof",
      "/skysecure/packs",
      "/skysecure/grants",
      "/skysecure/events"
    ],
    public_surfaces: {
      console: VAULTOS.publicConsole,
      skysecure_proof: "https://metraiyux-0s-full-system.graylondonskyes.workers.dev/proof-vault/skye-secure-fs27-vault-proof.html",
      platform_console: "https://metraiyux-0s-full-system.graylondonskyes.workers.dev/skye-secure-platform/"
    },
    protected_candidate: VAULTOS.protectedCandidate,
    counts: { packs: 0, active_grants: 0, events: 0 },
    db: { ok: false },
    ts: new Date().toISOString()
  };

  try {
    const state = await skysecureCounts();
    out.db = state.db;
    out.counts = state.counts;
  } catch (_err) {
    out.ok = false;
    out.db = { ok: false, error: "SkySecure VaultOS proof database check unavailable." };
  }

  return json(out.ok ? 200 : 503, out, publicVaultosCors(cors));
}

function vaultosCommands(cors) {
  return json(200, {
    ok: true,
    service: VAULTOS.service,
    hierarchy: {
      ...HIERARCHY,
      console: "skyevaultos",
      chain: VAULTOS.hierarchy
    },
    command_count: VAULTOS.commands.length,
    commands: VAULTOS.commands,
    support_command_count: VAULTOS.supportCommands.length,
    support_commands: VAULTOS.supportCommands,
    local_cli: VAULTOS.localCli,
    proof_script: VAULTOS.proofScript,
    storage_boundary: "Command receipts may reference encrypted objects, hashes, file counts, and audit events. This route never accepts plaintext secret payloads.",
    proof_scope: "live system proof; execution-scope: CLI/app command receipts plus live FS27 metadata route",
    ts: new Date().toISOString()
  }, publicVaultosCors(cors));
}

async function proof(cors) {
  const out = {
    ok: true,
    service: SERVICE,
    hierarchy: HIERARCHY,
    proof_lane: "0s.production.skysecure.fs27-skyevault",
    invariant: "FS27 owns control; SkyeVault owns ciphertext custody; SkySecure owns encrypted-pack lifecycle metadata.",
    live_routes: [
      "/skysecure/health",
      "/skysecure/proof",
      "/skysecure/vaultos",
      "/skysecure/vaultos/proof",
      "/skysecure/vaultos/commands",
      "/skysecure/vaultos/inventory",
      "/skysecure/vaultos/search",
      "/skysecure/vaultos/restore-points",
      "/skysecure/vaultos/audit",
      "/skysecure/packs",
      "/skysecure/grants",
      "/skysecure/events"
    ],
    counts: { packs: 0, active_grants: 0, events: 0 },
    db: { ok: false },
    ts: new Date().toISOString()
  };

  try {
    const state = await skysecureCounts();
    out.db = state.db;
    out.counts = state.counts;
  } catch (err) {
    out.ok = false;
    out.db = { ok: false, error: "SkySecure proof database check unavailable." };
  }

  return json(out.ok ? 200 : 503, out, cors);
}

export default wrap(async (req, cors) => {
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: cors });

  const pathname = routePath(req);
  if (req.method === "GET" && pathname === "/skysecure/health") {
    return json(200, {
      ok: true,
      service: SERVICE,
      hierarchy: HIERARCHY,
      storage_boundary: "SkySecure API stores safe metadata, object hashes, grants, and events only. Ciphertext objects remain in SkyeVault.",
      ts: new Date().toISOString()
    }, publicVaultosCors(cors));
  }
  if (req.method === "GET" && pathname === "/skysecure/proof") return proof(cors);
  if (req.method === "GET" && pathname === "/skysecure/vaultos/health") {
    return json(200, {
      ok: true,
      service: VAULTOS.service,
      hierarchy: {
        ...HIERARCHY,
        console: "skyevaultos",
        chain: VAULTOS.hierarchy
      },
      command_count: VAULTOS.commands.length,
      storage_boundary: "FS27 VaultOS routes publish command and live-system proof metadata only. Plaintext secrets stay in operator custody or encrypted in SkyeVault objects.",
      proof_scope: "live-system-proof; execution-scope: CLI/app filesystem operations plus live FS27 route health",
      ts: new Date().toISOString()
    }, publicVaultosCors(cors));
  }
  if (req.method === "GET" && pathname === "/skysecure/vaultos") return vaultosProof(cors);
  if (req.method === "GET" && pathname === "/skysecure/vaultos/proof") return vaultosProof(cors);
  if (req.method === "GET" && pathname === "/skysecure/vaultos/commands") return vaultosCommands(cors);
  if (req.method === "GET" && pathname === "/skysecure/vaultos/inventory") return vaultosInventory(req, cors);
  if (req.method === "GET" && pathname === "/skysecure/vaultos/search") return vaultosSearch(req, cors);
  if (req.method === "GET" && pathname === "/skysecure/vaultos/restore-points") return vaultosRestorePoints(cors);
  if (req.method === "GET" && pathname === "/skysecure/vaultos/audit") return vaultosAudit(cors);

  const principal = await resolvePrincipal(req);
  if (pathname === "/skysecure/packs" && req.method === "POST") return registerPack(req, cors, principal);
  if (pathname === "/skysecure/packs" && req.method === "GET") return listPacks(req, cors, principal);
  if (pathname === "/skysecure/grants" && req.method === "POST") return writeGrant(req, cors, principal);
  if (pathname === "/skysecure/grants" && req.method === "GET") return listGrants(req, cors, principal);
  if (pathname === "/skysecure/events" && req.method === "POST") return writeEvent(req, cors, principal);
  if (pathname === "/skysecure/events" && req.method === "GET") return listEvents(req, cors, principal);

  return json(404, {
    ok: false,
    error: "Unknown SkySecure FS27 route.",
    service: SERVICE,
    hierarchy: HIERARCHY,
    route: pathname
  }, cors);
});
