import "./defaults.js";  // pre-populate process.env with non-secret defaults
import { neon } from "@netlify/neon";

/**
 * Netlify DB (Neon Postgres) helper.
 *
 * IMPORTANT (Neon serverless driver, 2025+):
 * - `neon()` returns a tagged-template query function.
 * - For dynamic SQL strings + $1 placeholders, use `sql.query(text, params)`.
 *   (Calling the template function like sql("SELECT ...") can break on newer driver versions.)
 *
 * Netlify DB automatically injects `NETLIFY_DATABASE_URL` when the Neon extension is attached.
 */

let _sql = null;
let _schemaPromise = null;
let _d1SchemaPromise = null;
const DB_SEARCH_PATH = "public,jobping,skymail,neon_auth";
const SCHEMA_BATCH_SIZE = 24;

function dbTimeoutMs() {
  const ms = Number(process.env.SKYGATE_DB_QUERY_TIMEOUT_MS || process.env.ZERO_OS_DB_QUERY_TIMEOUT_MS || 8000);
  if (!Number.isFinite(ms) || ms <= 0) return 8000;
  return Math.max(1000, Math.min(55000, Math.round(ms)));
}

function timeoutError(label, timeoutMs) {
  const err = new Error(`${label} timed out after ${timeoutMs}ms`);
  err.code = "DB_QUERY_TIMEOUT";
  err.status = 503;
  return err;
}

async function withDbTimeout(promise, label = "Database query") {
  const timeoutMs = dbTimeoutMs();
  let timer = null;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(timeoutError(label, timeoutMs)), timeoutMs);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
    promise.catch(() => {});
  }
}

function d1Binding() {
  const env = globalThis.__SKYGATE_FS27_ENV || {};
  return env.RUNTIME_ROLLUP_DB || env.CITADEL_DB || env.CITADEL_DATABASE || null;
}

function useD1ForQuery(text = "") {
  const driver = String(process.env.SKYPAY_ORDER_LEDGER_DRIVER || "").toLowerCase();
  if (driver !== "d1") return false;
  if (!d1Binding()?.prepare) return false;
  return /\b(skyepay_orders|skyepay_refunds|audit_events)\b/i.test(text) || /^\s*select\s+1\s+as\s+ok\s*;?\s*$/i.test(text);
}

async function ensureD1Schema() {
  const db = d1Binding();
  if (!db?.prepare) throw Object.assign(new Error("Citadel D1 binding is unavailable"), { code: "D1_NOT_CONFIGURED", status: 503 });
  if (_d1SchemaPromise) return _d1SchemaPromise;
  _d1SchemaPromise = (async () => {
    const statements = [
      `create table if not exists audit_events (
        id integer primary key autoincrement,
        actor text not null,
        action text not null,
        target text,
        meta text not null default '{}',
        created_at text not null default (datetime('now'))
      )`,
      `create index if not exists audit_events_created_idx on audit_events(created_at desc)`,
      `create table if not exists skyepay_orders (
        id text primary key,
        client_slug text not null,
        workspace_slug text,
        customer_id integer,
        customer_email text,
        customer_name text,
        company_name text,
        offer_id text not null,
        offer_snapshot text not null default '{}',
        amount_setup_cents integer not null default 0,
        amount_recurring_cents integer not null default 0,
        currency text not null default 'usd',
        checkout_mode text not null default 'payment',
        stripe_session_id text unique,
        stripe_customer_id text,
        stripe_subscription_id text,
        payment_intent_id text,
        payment_status text not null default 'created',
        approval_status text not null default 'checkout_created',
        owner_status text not null default 'waiting_for_checkout',
        provisioning_status text not null default 'waiting_for_payment',
        source text not null default 'skypay',
        success_url text,
        cancel_url text,
        metadata text not null default '{}',
        paid_at text,
        approved_at text,
        provisioned_at text,
        created_at text not null default (datetime('now')),
        updated_at text not null default (datetime('now'))
      )`,
      `create index if not exists skyepay_orders_client_idx on skyepay_orders(client_slug, created_at desc)`,
      `create index if not exists skyepay_orders_customer_idx on skyepay_orders(customer_id, created_at desc)`,
      `create index if not exists skyepay_orders_status_idx on skyepay_orders(approval_status, owner_status, provisioning_status, created_at desc)`,
      `create index if not exists skyepay_orders_stripe_customer_idx on skyepay_orders(stripe_customer_id)`,
      `create table if not exists skyepay_refunds (
        id text primary key,
        skyepay_order_id text not null,
        stripe_refund_id text not null unique,
        stripe_payment_intent_id text,
        amount_cents integer not null default 0,
        currency text not null default 'usd',
        status text not null default 'succeeded',
        reason text not null default 'requested_by_customer',
        metadata text not null default '{}',
        created_at text not null default (datetime('now')),
        updated_at text not null default (datetime('now'))
      )`,
      `create index if not exists skyepay_refunds_order_idx on skyepay_refunds(skyepay_order_id, created_at desc)`
    ];
    for (const statement of statements) await db.prepare(statement).run();
  })();
  return _d1SchemaPromise;
}

function normalizeD1Sql(text = "") {
  return String(text || "")
    .replace(/metadata\s*=\s*metadata\s*\|\|\s*(\$\d+::jsonb)/gi, "metadata=json_patch(coalesce(metadata, '{}'), $1)")
    .replace(/metadata\s*=\s*skyepay_orders\.metadata\s*\|\|\s*excluded\.metadata/gi, "metadata=json_patch(coalesce(skyepay_orders.metadata, '{}'), coalesce(excluded.metadata, '{}'))")
    .replace(/'{}'::jsonb/gi, "'{}'")
    .replace(/::jsonb/gi, "")
    .replace(/::text/gi, "")
    .replace(/::int/gi, "")
    .replace(/\bnow\(\)/gi, "datetime('now')")
    .replace(/\btimestamptz\b/gi, "text")
    .replace(/\bbigserial\b/gi, "integer")
    .replace(/\bserial\b/gi, "integer");
}

function bindD1Sql(text = "", params = []) {
  const bound = [];
  const sql = normalizeD1Sql(text).replace(/\$(\d+)/g, (_match, rawIndex) => {
    bound.push(params[Number(rawIndex) - 1]);
    return "?";
  });
  return { sql, params: bound };
}

function parseJsonField(value) {
  if (value && typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  return value && typeof value === "object" ? value : {};
}

function normalizeD1Row(row = {}) {
  if (!row || typeof row !== "object") return row;
  return {
    ...row,
    offer_snapshot: parseJsonField(row.offer_snapshot),
    metadata: parseJsonField(row.metadata),
    meta: parseJsonField(row.meta)
  };
}

async function qD1(text, params = []) {
  await ensureD1Schema();
  const db = d1Binding();
  const { sql, params: bound } = bindD1Sql(text, params);
  const result = await withDbTimeout(
    bound.length ? db.prepare(sql).bind(...bound).all() : db.prepare(sql).all(),
    "Citadel D1 query"
  );
  const rows = Array.isArray(result?.results) ? result.results.map(normalizeD1Row) : [];
  return { rows, rowCount: rows.length || Number(result?.meta?.changes || 0) || 0 };
}

function getSql() {
  if (_sql) return _sql;

  const hasDbUrl = !!(process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL);
  if (!hasDbUrl) {
    const err = new Error("Database not configured (missing NETLIFY_DATABASE_URL). Attach Netlify DB (Neon) to this site.");
    err.code = "DB_NOT_CONFIGURED";
    err.status = 500;
    err.hint = "Netlify UI → Extensions → Neon → Add database (or run: npx netlify db init).";
    throw err;
  }

  _sql = neon(); // auto-uses process.env.NETLIFY_DATABASE_URL on Netlify
  return _sql;
}

function chunkQueries(items, size = SCHEMA_BATCH_SIZE) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function runQueriesWithSearchPath(queries) {
  const sql = getSql();
  const txResults = await sql.transaction((txn) => [
    txn.query("select set_config('search_path', $1, false) as applied", [DB_SEARCH_PATH]),
    ...queries.map(({ text, params = [] }) => txn.query(text, params)),
  ]);
  return txResults.slice(1);
}

async function ensureSchema() {
  if (String(process.env.SKYGATE_SKIP_SCHEMA_BOOTSTRAP || "").toLowerCase() === "true") {
    return;
  }
  if (_schemaPromise) return _schemaPromise;

  _schemaPromise = (async () => {
    const statements = [
      `create extension if not exists pgcrypto;`,
      `create schema if not exists skymail;`,
      `create table if not exists customers (
        id bigserial primary key,
        email text not null unique,
        communication_email text,
        skyemail text,
        plan_name text not null default 'starter',
        monthly_cap_cents integer not null default 2000,
        is_active boolean not null default true,
        stripe_customer_id text,
        stripe_subscription_id text,
        stripe_status text,
        stripe_current_period_end timestamptz,
        default_rpm_limit integer,
        default_rpd_limit integer,
        vault_storage_mb integer,
        vault_file_limit integer,
        vault_workspace_limit integer,
        skypay_policy jsonb not null default '{}'::jsonb,
        auto_topup_enabled boolean not null default false,
        auto_topup_amount_cents integer,
        auto_topup_threshold_cents integer,
        created_at timestamptz not null default now()
      );`,
      `create table if not exists api_keys (
        id bigserial primary key,
        customer_id bigint not null references customers(id) on delete cascade,
        key_hash text not null unique,
        key_last4 text not null,
        label text,
        monthly_cap_cents integer,
        rpm_limit integer,
        rpd_limit integer,
        created_at timestamptz not null default now(),
        revoked_at timestamptz
      );`,
      `create index if not exists api_keys_customer_id_idx on api_keys(customer_id);`,
      `create table if not exists monthly_usage (
        customer_id bigint not null references customers(id) on delete cascade,
        month text not null,
        spent_cents integer not null default 0,
        extra_cents integer not null default 0,
        input_tokens integer not null default 0,
        output_tokens integer not null default 0,
        updated_at timestamptz not null default now(),
        primary key (customer_id, month)
      );`,
      `create table if not exists monthly_key_usage (
        api_key_id bigint not null references api_keys(id) on delete cascade,
        customer_id bigint not null references customers(id) on delete cascade,
        month text not null,
        spent_cents integer not null default 0,
        input_tokens integer not null default 0,
        output_tokens integer not null default 0,
        calls integer not null default 0,
        updated_at timestamptz not null default now(),
        primary key (api_key_id, month)
      );`,
      `create index if not exists monthly_key_usage_customer_month_idx on monthly_key_usage(customer_id, month);`,
      `alter table monthly_key_usage add column if not exists calls integer not null default 0;`,
      `create table if not exists usage_events (
        id bigserial primary key,
        customer_id bigint not null references customers(id) on delete cascade,
        api_key_id bigint not null references api_keys(id) on delete cascade,
        provider text not null,
        model text not null,
        input_tokens integer not null default 0,
        output_tokens integer not null default 0,
        cost_cents integer not null default 0,
        platform_id text not null default 'metraiyux-0s',
        usage_lane text not null default 'ai',
        created_at timestamptz not null default now()
      );`,
      `alter table usage_events add column if not exists platform_id text not null default 'metraiyux-0s';`,
      `alter table usage_events add column if not exists usage_lane text not null default 'ai';`,
      `create index if not exists usage_events_customer_month_idx on usage_events(customer_id, created_at desc);`,
      `create index if not exists usage_events_key_idx on usage_events(api_key_id, created_at desc);`,
      `create index if not exists usage_events_platform_idx on usage_events(platform_id, usage_lane, created_at desc);`,
      `create table if not exists provider_usage_events (
        id bigserial primary key,
        source_app text not null default 'metraiyux-0s',
        actor_email text,
        gate_user_id bigint,
        gate_customer_id bigint,
        org_id text,
        workspace_id text,
        customer_ref text,
        client_ref text,
        provider_id text not null,
        action text not null,
        usage_lane text not null default 'provider',
        quantity integer not null default 1,
        estimated_cost_cents integer not null default 0,
        billable boolean not null default true,
        chargeback_ready boolean not null default false,
        provider_call_made boolean not null default false,
        receipt_id text,
        event_ts timestamptz not null default now(),
        meta jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now()
      );`,
      `create index if not exists provider_usage_events_chargeback_idx on provider_usage_events(customer_ref, workspace_id, usage_lane, created_at desc);`,
      `create index if not exists provider_usage_events_provider_idx on provider_usage_events(provider_id, action, created_at desc);`,
      `create index if not exists provider_usage_events_receipt_idx on provider_usage_events(receipt_id);`,
      `create table if not exists audit_events (
        id bigserial primary key,
        actor text not null,
        action text not null,
        target text,
        meta jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now()
      );`,
      `create index if not exists audit_events_created_idx on audit_events(created_at desc);`,
      `create index if not exists audit_events_platform_mirror_source_idx on audit_events((meta->>'source_app'), created_at desc) where action='PLATFORM_EVENT_MIRROR';`,
      `create index if not exists audit_events_platform_mirror_lane_idx on audit_events((meta->>'lane'), created_at desc) where action='PLATFORM_EVENT_MIRROR';`,
      `create table if not exists platform_operator_state (
        app_id text primary key,
        health_status text not null default 'unreviewed',
        onboarding_stage text not null default 'untracked',
        lifecycle_status text not null default 'active',
        owner text,
        notes text,
        last_checked_at timestamptz,
        updated_at timestamptz not null default now()
      );`,
      `create table if not exists users (
        id uuid primary key,
        email text not null unique,
        email_normalized text not null unique,
        display_name text,
        communication_email text,
        skyemail text,
        primary_customer_id bigint references customers(id) on delete set null,
        default_api_key_id bigint references api_keys(id) on delete set null,
        role text not null default 'user',
        email_verified_at timestamptz,
        is_active boolean not null default true,
        password_reset_required boolean not null default false,
        provisioned_at timestamptz,
        provisioned_by text,
        profile jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );`,
      `alter table users add column if not exists communication_email text;`,
      `alter table users add column if not exists skyemail text;`,
      `alter table users add column if not exists default_api_key_id bigint references api_keys(id) on delete set null;`,
      `alter table users add column if not exists password_reset_required boolean not null default false;`,
      `alter table users add column if not exists provisioned_at timestamptz;`,
      `alter table users add column if not exists provisioned_by text;`,
      `create index if not exists users_primary_customer_idx on users(primary_customer_id);`,
      `create index if not exists users_default_api_key_idx on users(default_api_key_id);`,
      `alter table customers add column if not exists communication_email text;`,
      `alter table customers add column if not exists skyemail text;`,
      `create index if not exists users_customer_role_idx on users(primary_customer_id, role);`,
      `create table if not exists user_passwords (
        user_id uuid primary key references users(id) on delete cascade,
        password_hash text not null,
        password_updated_at timestamptz not null default now(),
        created_at timestamptz not null default now()
      );`,
      `create table if not exists user_pin_credentials (
        id uuid primary key,
        user_id uuid not null references users(id) on delete cascade,
        gate_id text not null unique,
        pin_hash text not null,
        label text,
        status text not null default 'active',
        recovery_sent_at timestamptz,
        last_used_at timestamptz,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );`,
      `create index if not exists user_pin_credentials_user_idx on user_pin_credentials(user_id, created_at desc);`,
      `create table if not exists user_recovery_codes (
        id uuid primary key,
        credential_id uuid not null references user_pin_credentials(id) on delete cascade,
        user_id uuid not null references users(id) on delete cascade,
        code_hash text not null unique,
        code_label text not null,
        sent_at timestamptz,
        expires_at timestamptz,
        used_at timestamptz,
        created_at timestamptz not null default now()
      );`,
      `create index if not exists user_recovery_codes_user_idx on user_recovery_codes(user_id, created_at desc);`,
      `create table if not exists user_sessions (
        id uuid primary key,
        user_id uuid references users(id) on delete cascade,
        customer_id bigint references customers(id) on delete set null,
        api_key_id bigint references api_keys(id) on delete set null,
        session_kind text not null default 'human',
        token_family text not null default 'session',
        token_version integer not null default 1,
        title text,
        scope text[] not null default '{}'::text[],
        meta jsonb not null default '{}'::jsonb,
        last_seen_at timestamptz,
        last_seen_ip text,
        last_seen_user_agent text,
        expires_at timestamptz not null,
        revoked_at timestamptz,
        revocation_reason text,
        created_at timestamptz not null default now()
      );`,
      `create index if not exists user_sessions_user_idx on user_sessions(user_id, created_at desc);`,
      `create index if not exists user_sessions_customer_idx on user_sessions(customer_id, created_at desc);`,
      `create index if not exists user_sessions_active_idx on user_sessions(expires_at, revoked_at);`,
      `alter table user_sessions alter column user_id drop not null;`,
      `create table if not exists verification_tokens (
        id uuid primary key,
        user_id uuid not null references users(id) on delete cascade,
        token_hash text not null unique,
        email text not null,
        expires_at timestamptz not null,
        used_at timestamptz,
        created_at timestamptz not null default now()
      );`,
      `create index if not exists verification_tokens_user_idx on verification_tokens(user_id, created_at desc);`,
      `create table if not exists reset_tokens (
        id uuid primary key,
        user_id uuid not null references users(id) on delete cascade,
        token_hash text not null unique,
        email text not null,
        expires_at timestamptz not null,
        used_at timestamptz,
        created_at timestamptz not null default now()
      );`,
      `create index if not exists reset_tokens_user_idx on reset_tokens(user_id, created_at desc);`,
      `create table if not exists workspaces (
        id uuid primary key default gen_random_uuid(),
        slug text not null unique,
        name text not null,
        status text not null default 'active',
        plan text not null default 'free99-gate-owned',
        primary_customer_id bigint references customers(id) on delete set null,
        communication_email text,
        skyemail text,
        metadata jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );`,
      `alter table workspaces add column if not exists primary_customer_id bigint references customers(id) on delete set null;`,
      `alter table workspaces add column if not exists communication_email text;`,
      `alter table workspaces add column if not exists skyemail text;`,
      `create index if not exists workspaces_customer_idx on workspaces(primary_customer_id, updated_at desc);`,
      `create table if not exists workspace_users (
        id uuid primary key default gen_random_uuid(),
        workspace_id uuid not null references workspaces(id) on delete cascade,
        linked_user_id uuid references users(id) on delete set null,
        email text not null,
        communication_email text,
        skyemail text,
        password_hash text not null,
        role text not null default 'operator',
        status text not null default 'active',
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        last_login_at timestamptz,
        unique(workspace_id, email)
      );`,
      `alter table workspace_users add column if not exists linked_user_id uuid references users(id) on delete set null;`,
      `alter table workspace_users add column if not exists communication_email text;`,
      `alter table workspace_users add column if not exists skyemail text;`,
      `create index if not exists workspace_users_workspace_role_idx on workspace_users(workspace_id, role);`,
      `create index if not exists workspace_users_email_idx on workspace_users(lower(email));`,
      `create index if not exists workspace_users_linked_user_idx on workspace_users(linked_user_id, created_at desc);`,
      `create table if not exists workspace_settings (
        workspace_id uuid primary key references workspaces(id) on delete cascade,
        branding jsonb not null default '{}'::jsonb,
        app_settings jsonb not null default '{}'::jsonb,
        security_settings jsonb not null default '{}'::jsonb,
        updated_by uuid references workspace_users(id) on delete set null,
        updated_at timestamptz not null default now()
      );`,
      `create table if not exists workspace_states (
        workspace_id uuid primary key references workspaces(id) on delete cascade,
        state jsonb not null default '{}'::jsonb,
        state_hash text,
        revision bigint not null default 1,
        updated_by uuid references workspace_users(id) on delete set null,
        updated_at timestamptz not null default now()
      );`,
      `create table if not exists attendees (
        workspace_id uuid not null references workspaces(id) on delete cascade,
        attendee_id text not null,
        event_id text,
        email text,
        name text,
        checked_in_at timestamptz,
        data jsonb not null default '{}'::jsonb,
        updated_at timestamptz not null default now(),
        primary key(workspace_id, attendee_id)
      );`,
      `create index if not exists attendees_workspace_email_idx on attendees(workspace_id, email);`,
      `create index if not exists attendees_workspace_checked_idx on attendees(workspace_id, checked_in_at desc);`,
      `create table if not exists workspace_audit_events (
        id uuid primary key default gen_random_uuid(),
        workspace_id uuid not null references workspaces(id) on delete cascade,
        user_id uuid references workspace_users(id) on delete set null,
        action text not null,
        detail text,
        data jsonb not null default '{}'::jsonb,
        ip_hash text,
        user_agent text,
        created_at timestamptz not null default now()
      );`,
      `create index if not exists workspace_audit_workspace_created_idx on workspace_audit_events(workspace_id, created_at desc);`,
      `create index if not exists workspace_audit_action_idx on workspace_audit_events(workspace_id, action, created_at desc);`,
      `create table if not exists workspace_login_attempts (
        id uuid primary key default gen_random_uuid(),
        workspace_slug text not null,
        email text not null,
        ip_hash text,
        ok boolean not null default false,
        reason text,
        created_at timestamptz not null default now()
      );`,
      `create index if not exists workspace_login_attempts_guard_idx on workspace_login_attempts(workspace_slug, email, ip_hash, created_at desc);`,
      `create table if not exists workspace_invites (
        id uuid primary key default gen_random_uuid(),
        workspace_id uuid not null references workspaces(id) on delete cascade,
        email text not null,
        role text not null default 'operator',
        token_hash text not null unique,
        status text not null default 'pending',
        invited_by uuid references workspace_users(id) on delete set null,
        expires_at timestamptz not null default now() + interval '7 days',
        created_at timestamptz not null default now(),
        accepted_at timestamptz
      );`,
      `create index if not exists workspace_invites_workspace_idx on workspace_invites(workspace_id, status, expires_at desc);`,
      `create table if not exists workspace_backups (
        id uuid primary key default gen_random_uuid(),
        workspace_id uuid not null references workspaces(id) on delete cascade,
        backup_type text not null default 'sync',
        state_hash text not null,
        state jsonb not null,
        created_by uuid references workspace_users(id) on delete set null,
        created_at timestamptz not null default now()
      );`,
      `create index if not exists workspace_backups_workspace_created_idx on workspace_backups(workspace_id, created_at desc);`,
      `create table if not exists workspace_request_windows (
        bucket_key text primary key,
        workspace_id uuid references workspaces(id) on delete cascade,
        workspace_slug text,
        route text not null,
        ip_hash text,
        scope text not null default 'public',
        window_start timestamptz not null,
        count integer not null default 0,
        updated_at timestamptz not null default now()
      );`,
      `create index if not exists workspace_request_windows_scope_idx on workspace_request_windows(scope, route, window_start desc);`,
      `create or replace view workspace_operational_summary as
        select
          w.id as workspace_id,
          w.slug,
          w.name,
          w.status,
          w.plan,
          w.primary_customer_id,
          count(distinct u.id) as user_count,
          count(distinct a.attendee_id) as attendee_count,
          max(ws.updated_at) as state_updated_at,
          max(w.updated_at) as workspace_updated_at
        from workspaces w
        left join workspace_users u on u.workspace_id = w.id
        left join attendees a on a.workspace_id = w.id
        left join workspace_states ws on ws.workspace_id = w.id
        group by w.id;`,
      `create table if not exists oauth_clients (
        id uuid primary key,
        client_id text not null unique,
        client_secret_hash text,
        client_name text not null,
        redirect_uris text[] not null default '{}'::text[],
        grant_types text[] not null default '{authorization_code,refresh_token}'::text[],
        response_types text[] not null default '{code}'::text[],
        scope text[] not null default '{openid,profile,email}'::text[],
        token_endpoint_auth_method text not null default 'client_secret_post',
        app_type text not null default 'web',
        owner_user_id uuid references users(id) on delete set null,
        customer_id bigint references customers(id) on delete set null,
        is_first_party boolean not null default false,
        is_active boolean not null default true,
        metadata jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );`,
      `create index if not exists oauth_clients_customer_idx on oauth_clients(customer_id, created_at desc);`,
      `create table if not exists oauth_consents (
        id uuid primary key,
        user_id uuid not null references users(id) on delete cascade,
        client_id text not null references oauth_clients(client_id) on delete cascade,
        scope text[] not null default '{}'::text[],
        granted_at timestamptz not null default now(),
        revoked_at timestamptz,
        metadata jsonb not null default '{}'::jsonb,
        unique (user_id, client_id)
      );`,
      `create index if not exists oauth_consents_client_idx on oauth_consents(client_id, granted_at desc);`,
      `create table if not exists oauth_authorization_codes (
        id uuid primary key,
        code_hash text not null unique,
        user_id uuid not null references users(id) on delete cascade,
        client_id text not null references oauth_clients(client_id) on delete cascade,
        redirect_uri text not null,
        code_challenge text,
        code_challenge_method text,
        scope text[] not null default '{}'::text[],
        nonce text,
        audience text,
        metadata jsonb not null default '{}'::jsonb,
        expires_at timestamptz not null,
        consumed_at timestamptz,
        created_at timestamptz not null default now()
      );`,
      `create index if not exists oauth_codes_client_idx on oauth_authorization_codes(client_id, created_at desc);`,
      `create table if not exists oauth_refresh_tokens (
        id uuid primary key,
        token_hash text not null unique,
        token_family text not null,
        user_id uuid references users(id) on delete cascade,
        client_id text not null references oauth_clients(client_id) on delete cascade,
        session_id uuid references user_sessions(id) on delete set null,
        scope text[] not null default '{}'::text[],
        audience text,
        rotation_counter integer not null default 0,
        parent_token_id uuid references oauth_refresh_tokens(id) on delete set null,
        replaces_token_id uuid references oauth_refresh_tokens(id) on delete set null,
        expires_at timestamptz not null,
        consumed_at timestamptz,
        revoked_at timestamptz,
        metadata jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now()
      );`,
      `create index if not exists oauth_refresh_client_idx on oauth_refresh_tokens(client_id, created_at desc);`,
      `create table if not exists oauth_signing_keys (
        id uuid primary key,
        kid text not null unique,
        alg text not null default 'RS256',
        public_pem text not null,
        private_pem_enc text not null,
        is_active boolean not null default false,
        activated_at timestamptz,
        retired_at timestamptz,
        created_at timestamptz not null default now(),
        metadata jsonb not null default '{}'::jsonb
      );`,
      `create unique index if not exists oauth_signing_keys_active_idx on oauth_signing_keys((is_active)) where is_active = true;`,
      `create table if not exists rate_limit_windows (
        customer_id bigint not null references customers(id) on delete cascade,
        api_key_id bigint not null references api_keys(id) on delete cascade,
        window_start timestamptz not null,
        count integer not null default 0,
        primary key (customer_id, api_key_id, window_start)
      );`,
      `create index if not exists rate_limit_windows_window_idx on rate_limit_windows(window_start desc);`,      `alter table api_keys add column if not exists last_seen_at timestamptz;`,
      `alter table api_keys add column if not exists last_seen_install_id text;`,
      `alter table usage_events add column if not exists install_id text;`,
      `alter table usage_events add column if not exists ip_hash text;`,
      `alter table usage_events add column if not exists ua text;`,
      `alter table usage_events add column if not exists platform_id text not null default 'metraiyux-0s';`,
      `alter table usage_events add column if not exists usage_lane text not null default 'ai';`,
      `create index if not exists usage_events_install_idx on usage_events(install_id);`,
      `create index if not exists usage_events_platform_idx on usage_events(platform_id, usage_lane, created_at desc);`,
      `create table if not exists provider_usage_events (
        id bigserial primary key,
        source_app text not null default 'metraiyux-0s',
        actor_email text,
        gate_user_id bigint,
        gate_customer_id bigint,
        org_id text,
        workspace_id text,
        customer_ref text,
        client_ref text,
        provider_id text not null,
        action text not null,
        usage_lane text not null default 'provider',
        quantity integer not null default 1,
        estimated_cost_cents integer not null default 0,
        billable boolean not null default true,
        chargeback_ready boolean not null default false,
        provider_call_made boolean not null default false,
        receipt_id text,
        event_ts timestamptz not null default now(),
        meta jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now()
      );`,
      `create index if not exists provider_usage_events_chargeback_idx on provider_usage_events(customer_ref, workspace_id, usage_lane, created_at desc);`,
      `create index if not exists provider_usage_events_provider_idx on provider_usage_events(provider_id, action, created_at desc);`,
      `create index if not exists provider_usage_events_receipt_idx on provider_usage_events(receipt_id);`,
      `create table if not exists rate_limit_scoped_windows (
        customer_id bigint not null references customers(id) on delete cascade,
        api_key_id bigint not null references api_keys(id) on delete cascade,
        platform_id text not null default 'metraiyux-0s',
        usage_lane text not null default 'gateway',
        window_start timestamptz not null,
        count integer not null default 0,
        primary key (customer_id, api_key_id, platform_id, usage_lane, window_start)
      );`,
      `create index if not exists rate_limit_scoped_windows_window_idx on rate_limit_scoped_windows(window_start desc);`,
      `create table if not exists alerts_sent (
        customer_id bigint not null,
        api_key_id bigint not null default 0,
        month text not null,
        alert_type text not null,
        created_at timestamptz not null default now(),
        primary key (customer_id, api_key_id, month, alert_type)
      );`,
    
      // --- Device binding / seats ---
      `alter table customers add column if not exists max_devices_per_key integer;`,
      `alter table customers add column if not exists require_install_id boolean not null default false;`,
      `alter table customers add column if not exists allowed_providers text[];`,
      `alter table customers add column if not exists allowed_models jsonb;`,
      `alter table customers add column if not exists stripe_current_period_end timestamptz;`,
      `alter table customers add column if not exists default_rpm_limit integer;`,
      `alter table customers add column if not exists default_rpd_limit integer;`,
      `alter table customers add column if not exists vault_storage_mb integer;`,
      `alter table customers add column if not exists vault_file_limit integer;`,
      `alter table customers add column if not exists vault_workspace_limit integer;`,
      `alter table customers add column if not exists skypay_policy jsonb not null default '{}'::jsonb;`,

      `alter table api_keys add column if not exists max_devices integer;`,
      `alter table api_keys add column if not exists require_install_id boolean;`,
      `alter table api_keys add column if not exists allowed_providers text[];`,
      `alter table api_keys add column if not exists allowed_models jsonb;`,
      `alter table api_keys add column if not exists expires_at timestamptz;`,
      `alter table api_keys add column if not exists metadata jsonb not null default '{}'::jsonb;`,
      `create index if not exists api_keys_expires_idx on api_keys(expires_at) where expires_at is not null;`,

      `create table if not exists key_devices (
        api_key_id bigint not null references api_keys(id) on delete cascade,
        customer_id bigint not null references customers(id) on delete cascade,
        install_id text not null,
        device_label text,
        first_seen_at timestamptz not null default now(),
        last_seen_at timestamptz,
        last_seen_ua text,
        revoked_at timestamptz,
        revoked_by text,
        primary key (api_key_id, install_id)
      );`,
      `create index if not exists key_devices_customer_idx on key_devices(customer_id);`,
      `create index if not exists key_devices_last_seen_idx on key_devices(last_seen_at desc);`,

      // --- Invoice snapshots + topups ---
      `create table if not exists monthly_invoices (
        customer_id bigint not null references customers(id) on delete cascade,
        month text not null,
        snapshot jsonb not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        primary key (customer_id, month)
      );`,
      `create table if not exists topup_events (
        id bigserial primary key,
        customer_id bigint not null references customers(id) on delete cascade,
        month text not null,
        amount_cents integer not null,
        source text not null default 'manual',
        stripe_session_id text,
        status text not null default 'applied',
        created_at timestamptz not null default now()
      );`,
      `create index if not exists topup_events_customer_month_idx on topup_events(customer_id, month);`,

      `create table if not exists skyepay_orders (
        id text primary key,
        client_slug text not null,
        workspace_slug text,
        customer_id bigint references customers(id) on delete set null,
        customer_email text,
        customer_name text,
        company_name text,
        offer_id text not null,
        offer_snapshot jsonb not null default '{}'::jsonb,
        amount_setup_cents integer not null default 0,
        amount_recurring_cents integer not null default 0,
        currency text not null default 'usd',
        checkout_mode text not null default 'payment',
        stripe_session_id text unique,
        stripe_customer_id text,
        stripe_subscription_id text,
        payment_intent_id text,
        payment_status text not null default 'created',
        approval_status text not null default 'checkout_created',
        owner_status text not null default 'waiting_for_checkout',
        provisioning_status text not null default 'waiting_for_payment',
        source text not null default 'skypay',
        success_url text,
        cancel_url text,
        metadata jsonb not null default '{}'::jsonb,
        paid_at timestamptz,
        approved_at timestamptz,
        provisioned_at timestamptz,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );`,
      `create table if not exists skyepay_refunds (
        id text primary key,
        skyepay_order_id text not null references skyepay_orders(id) on delete cascade,
        stripe_refund_id text not null unique,
        stripe_payment_intent_id text,
        amount_cents integer not null default 0,
        currency text not null default 'usd',
        status text not null default 'succeeded',
        reason text not null default 'requested_by_customer',
        metadata jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );`,
      `create index if not exists skyepay_refunds_order_idx on skyepay_refunds(skyepay_order_id, created_at desc);`,
      `alter table skyepay_orders alter column owner_status set default 'waiting_for_checkout';`,
      `alter table skyepay_orders alter column provisioning_status set default 'waiting_for_payment';`,
      `create index if not exists skyepay_orders_client_idx on skyepay_orders(client_slug, created_at desc);`,
      `create index if not exists skyepay_orders_customer_idx on skyepay_orders(customer_id, created_at desc);`,
      `create index if not exists skyepay_orders_status_idx on skyepay_orders(approval_status, owner_status, provisioning_status, created_at desc);`,
      `create index if not exists skyepay_orders_stripe_customer_idx on skyepay_orders(stripe_customer_id);`,

      `create table if not exists async_jobs (
        id uuid primary key,
        customer_id bigint not null references customers(id) on delete cascade,
        api_key_id bigint not null references api_keys(id) on delete cascade,
        provider text not null,
        model text not null,
        request jsonb not null default '{}'::jsonb,
        status text not null default 'queued',
        created_at timestamptz not null default now(),
        started_at timestamptz,
        completed_at timestamptz,
        heartbeat_at timestamptz,
        output_text text,
        error text,
        input_tokens integer not null default 0,
        output_tokens integer not null default 0,
        cost_cents integer not null default 0,
        meta jsonb not null default '{}'::jsonb
      );`,
      `create index if not exists async_jobs_customer_created_idx on async_jobs(customer_id, created_at desc);`,
      `create index if not exists async_jobs_status_idx on async_jobs(status, created_at desc);`,
    
      `create table if not exists gateway_events (
        id bigserial primary key,
        request_id text,
        level text not null default 'info',
        kind text not null,
        function_name text not null,
        method text,
        path text,
        origin text,
        referer text,
        user_agent text,
        ip text,
        app_id text,
        build_id text,
        customer_id bigint,
        api_key_id bigint,
        provider text,
        model text,
        http_status integer,
        duration_ms integer,
        error_code text,
        error_message text,
        error_stack text,
        upstream_status integer,
        upstream_body text,
        extra jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now()
      );`,
      `create index if not exists gateway_events_created_idx on gateway_events(created_at desc);`,
      `create index if not exists gateway_events_request_idx on gateway_events(request_id);`,
      `create index if not exists gateway_events_level_idx on gateway_events(level, created_at desc);`,
      `create index if not exists gateway_events_fn_idx on gateway_events(function_name, created_at desc);`,
      `create index if not exists gateway_events_app_idx on gateway_events(app_id, created_at desc);`,

      // --- KaixuPush (Deploy Push) enterprise tables ---
      `alter table api_keys add column if not exists role text not null default 'deployer';`,
      `alter table api_keys add column if not exists encrypted_key text;`,
      `create index if not exists api_keys_role_idx on api_keys(role);`,
      `create table if not exists pentest_gate_card_requests (
        id text primary key,
        user_id uuid references users(id) on delete set null,
        customer_id bigint references customers(id) on delete set null,
        email text not null,
        display_name text,
        organization text,
        purpose text,
        requested_scope text,
        target_surfaces text,
        status text not null default 'pending',
        source text not null default 'signed-in-request',
        admin_notes text,
        issued_api_key_id bigint references api_keys(id) on delete set null,
        decision_at timestamptz,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );`,
      `create index if not exists pentest_gate_card_requests_status_idx on pentest_gate_card_requests(status, created_at desc);`,
      `create index if not exists pentest_gate_card_requests_user_idx on pentest_gate_card_requests(user_id, created_at desc);`,
      `create table if not exists customer_netlify_tokens (
        customer_id bigint primary key references customers(id) on delete cascade,
        token_enc text not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );`,
      `create table if not exists push_projects (
        id bigserial primary key,
        customer_id bigint not null references customers(id) on delete cascade,
        project_id text not null,
        name text not null,
        netlify_site_id text not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        unique (customer_id, project_id)
      );`,
      `create index if not exists push_projects_customer_idx on push_projects(customer_id, created_at desc);`,
      `create table if not exists push_pushes (
        id bigserial primary key,
        customer_id bigint not null references customers(id) on delete cascade,
        api_key_id bigint not null references api_keys(id) on delete cascade,
        project_row_id bigint not null references push_projects(id) on delete cascade,
        push_id text not null unique,
        branch text not null,
        title text,
        deploy_id text not null,
        state text not null,
        required_digests text[] not null default '{}'::text[],
        uploaded_digests text[] not null default '{}'::text[],
        file_manifest jsonb not null default '{}'::jsonb,
        url text,
        error text,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );`,
      `alter table push_pushes add column if not exists file_manifest jsonb not null default '{}'::jsonb;`,
      `create index if not exists push_pushes_customer_idx on push_pushes(customer_id, created_at desc);`,
      `create table if not exists push_jobs (
        id bigserial primary key,
        push_row_id bigint not null references push_pushes(id) on delete cascade,
        sha1 char(40) not null,
        deploy_path text not null,
        parts integer not null,
        received_parts integer[] not null default '{}'::int[],
        part_bytes jsonb not null default '{}'::jsonb,
        bytes_staged bigint not null default 0,
        status text not null default 'uploading',
        error text,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        unique (push_row_id, sha1)
      );`,
      `create index if not exists push_jobs_push_idx on push_jobs(push_row_id, updated_at desc);`,
      `alter table push_jobs add column if not exists bytes_staged bigint not null default 0;`,
      `alter table push_jobs add column if not exists part_bytes jsonb not null default '{}'::jsonb;`,
      `alter table push_jobs add column if not exists attempts integer not null default 0;`,
      `alter table push_jobs add column if not exists next_attempt_at timestamptz;`,
      `alter table push_jobs add column if not exists last_error text;`,
      `alter table push_jobs add column if not exists last_error_at timestamptz;`,

      `create table if not exists push_rate_windows (
        customer_id bigint not null references customers(id) on delete cascade,
        bucket_type text not null,
        bucket_start timestamptz not null,
        count integer not null default 0,
        primary key(customer_id, bucket_type, bucket_start)
      );`,
      `create index if not exists push_rate_windows_bucket_idx on push_rate_windows(bucket_type, bucket_start desc);`,
      `create table if not exists push_files (
        id bigserial primary key,
        push_row_id bigint not null references push_pushes(id) on delete cascade,
        deploy_path text not null,
        sha1 char(40) not null,
        bytes bigint not null default 0,
        mode text not null default 'direct',
        created_at timestamptz not null default now()
      );`,
      `create index if not exists push_files_push_idx on push_files(push_row_id);`,
      `create table if not exists push_usage_events (
        id bigserial primary key,
        customer_id bigint not null references customers(id) on delete cascade,
        api_key_id bigint not null references api_keys(id) on delete cascade,
        push_row_id bigint references push_pushes(id) on delete set null,
        event_type text not null,
        bytes bigint not null default 0,
        pricing_version integer not null default 1,
        cost_cents integer not null default 0,
        meta jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now()
      );`,
      `create index if not exists push_usage_customer_idx on push_usage_events(customer_id, created_at desc);`,
      `create table if not exists push_pricing_versions (
        version integer primary key,
        effective_from date not null default current_date,
        currency text not null default 'USD',
        base_month_cents integer not null default 0,
        per_deploy_cents integer not null default 0,
        per_gb_cents integer not null default 0,
        created_at timestamptz not null default now()
      );`,
      `insert into push_pricing_versions(version, base_month_cents, per_deploy_cents, per_gb_cents)
       values (1, 0, 10, 25) on conflict (version) do nothing;`,
      `create table if not exists customer_push_billing (
        customer_id bigint primary key references customers(id) on delete cascade,
        pricing_version integer not null references push_pricing_versions(version),
        monthly_cap_cents integer not null default 0,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );`,
      `create table if not exists push_invoices (
        customer_id bigint not null references customers(id) on delete cascade,
        month text not null,
        pricing_version integer not null references push_pricing_versions(version),
        total_cents integer not null,
        breakdown jsonb not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        primary key (customer_id, month)
      );`,
      `create table if not exists vendor_registry (
        vendor_key text primary key,
        display_name text not null,
        category text not null,
        ops_status text not null default 'configured',
        preferred_credential_mode text not null default 'platform-shared',
        notes text,
        metadata jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );`,
      `create table if not exists sovereign_variables (
        id bigserial primary key,
        scope_kind text not null default 'global',
        scope_id text not null default 'global',
        vendor_key text not null,
        variable_name text not null,
        secret_enc text not null,
        last4 text not null default '',
        credential_mode text not null default 'platform-shared',
        usage_mode text not null default 'development-and-production',
        billing_mode text not null default 'metered-through-gate',
        is_active boolean not null default true,
        notes text,
        metadata jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        unique (scope_kind, scope_id, vendor_key, variable_name)
      );`,
      `create index if not exists sovereign_variables_vendor_idx on sovereign_variables(vendor_key, updated_at desc);`,
      `create index if not exists sovereign_variables_scope_idx on sovereign_variables(scope_kind, scope_id, updated_at desc);`,

      // ------------------------------
      // GitHub Push Gateway (optional)
      // ------------------------------
      `create table if not exists customer_github_tokens (
        customer_id bigint primary key references customers(id) on delete cascade,
        token_enc text not null,
        token_type text not null default 'oauth',
        scopes text[] not null default '{}'::text[],
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );`,
      `create table if not exists gh_push_jobs (
        id bigserial primary key,
        customer_id bigint not null references customers(id) on delete cascade,
        api_key_id bigint not null references api_keys(id) on delete cascade,
        job_id text not null unique,
        owner text not null,
        repo text not null,
        branch text not null default 'main',
        commit_message text not null default 'Kaixu GitHub Push',
        parts integer not null default 0,
        received_parts integer[] not null default '{}'::int[],
        part_bytes jsonb not null default '{}'::jsonb,
        bytes_staged bigint not null default 0,
        status text not null default 'uploading',
        attempts integer not null default 0,
        next_attempt_at timestamptz,
        last_error text,
        last_error_at timestamptz,
        result_commit_sha text,
        result_url text,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );`,
      `create index if not exists gh_push_jobs_customer_idx on gh_push_jobs(customer_id, updated_at desc);`,
      `create index if not exists gh_push_jobs_next_attempt_idx on gh_push_jobs(next_attempt_at) where status in ('retry_wait','error_transient');`,
      `create table if not exists gh_push_events (
        id bigserial primary key,
        customer_id bigint not null references customers(id) on delete cascade,
        api_key_id bigint not null references api_keys(id) on delete cascade,
        job_row_id bigint not null references gh_push_jobs(id) on delete cascade,
        event_type text not null,
        bytes bigint not null default 0,
        meta jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now()
      );`,
      `create index if not exists gh_push_events_job_idx on gh_push_events(job_row_id, created_at desc);`,


      `create table if not exists voice_numbers (
        id bigserial primary key,
        customer_id bigint not null references customers(id) on delete cascade,
        phone_number text not null unique,
        provider text not null default 'twilio',
        twilio_sid text,
        is_active boolean not null default true,
        default_llm_provider text not null default 'openai',
        default_llm_model text not null default 'gpt-4.1-mini',
        voice_name text not null default 'alloy',
        locale text not null default 'en-US',
        timezone text not null default 'America/Phoenix',
        playbook jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now()
      );`,
      `create index if not exists voice_numbers_customer_idx on voice_numbers(customer_id);`,

      `create table if not exists voice_calls (
        id bigserial primary key,
        customer_id bigint not null references customers(id) on delete cascade,
        voice_number_id bigint references voice_numbers(id) on delete set null,
        provider text not null default 'twilio',
        provider_call_sid text not null,
        from_number text,
        to_number text,
        status text not null default 'initiated',
        direction text not null default 'inbound',
        started_at timestamptz not null default now(),
        ended_at timestamptz,
        duration_seconds integer,
        est_cost_cents integer not null default 0,
        bill_cost_cents integer not null default 0,
        meta jsonb not null default '{}'::jsonb
      );`,
      `create unique index if not exists voice_calls_provider_sid_uq on voice_calls(provider, provider_call_sid);`,
      `create index if not exists voice_calls_customer_idx on voice_calls(customer_id, started_at desc);`,

      `create table if not exists voice_call_messages (
        id bigserial primary key,
        call_id bigint not null references voice_calls(id) on delete cascade,
        role text not null, -- user|assistant|system|tool
        content text not null,
        created_at timestamptz not null default now()
      );`,
      `create index if not exists voice_call_messages_call_idx on voice_call_messages(call_id, id);`,

      `create table if not exists voice_usage_monthly (
        id bigserial primary key,
        customer_id bigint not null references customers(id) on delete cascade,
        month text not null,
        minutes numeric not null default 0,
        est_cost_cents integer not null default 0,
        bill_cost_cents integer not null default 0,
        calls integer not null default 0,
        created_at timestamptz not null default now(),
        unique(customer_id, month)
      );`,
      `create index if not exists voice_usage_monthly_customer_idx on voice_usage_monthly(customer_id, month);`,

      // --- Unified FS27 app auth spine ---
      `create table if not exists gate_app_surfaces (
        app_id text primary key,
        display_name text not null,
        category text not null default 'mounted-app',
        auth_mode text not null default 'fs27-gate-owned',
        default_plan text not null default 'free99',
        status text not null default 'active',
        metadata jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );`,
      `create table if not exists gate_login_surfaces (
        id uuid primary key default gen_random_uuid(),
        app_id text not null references gate_app_surfaces(app_id) on delete cascade,
        surface_slug text not null,
        display_name text,
        login_url text,
        handoff_url text,
        auth_target text not null default 'fs27',
        status text not null default 'active',
        metadata jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        unique(app_id, surface_slug)
      );`,
      `create table if not exists gate_app_workspaces (
        id uuid primary key default gen_random_uuid(),
        app_id text not null references gate_app_surfaces(app_id) on delete cascade,
        fs27_workspace_id uuid references workspaces(id) on delete set null,
        fs27_customer_id bigint references customers(id) on delete set null,
        owner_user_id uuid references users(id) on delete set null,
        local_workspace_id text not null,
        local_workspace_kind text not null default 'workspace',
        workspace_slug text,
        workspace_name text,
        tier text not null default 'free99',
        plan_name text not null default 'free99-gate-owned',
        status text not null default 'active',
        entitlements jsonb not null default '{}'::jsonb,
        metadata jsonb not null default '{}'::jsonb,
        first_seen_at timestamptz not null default now(),
        last_seen_at timestamptz not null default now(),
        unique(app_id, local_workspace_id)
      );`,
      `create index if not exists gate_app_workspaces_customer_idx on gate_app_workspaces(fs27_customer_id, app_id, last_seen_at desc);`,
      `create index if not exists gate_app_workspaces_fs27_workspace_idx on gate_app_workspaces(fs27_workspace_id, app_id);`,
      `create index if not exists gate_app_workspaces_owner_idx on gate_app_workspaces(owner_user_id, app_id);`,
      `create table if not exists gate_app_users (
        id uuid primary key default gen_random_uuid(),
        app_id text not null references gate_app_surfaces(app_id) on delete cascade,
        fs27_user_id uuid references users(id) on delete set null,
        fs27_customer_id bigint references customers(id) on delete set null,
        fs27_workspace_id uuid references workspaces(id) on delete set null,
        gate_app_workspace_id uuid references gate_app_workspaces(id) on delete set null,
        local_user_id text not null,
        local_user_kind text not null default 'user',
        email text,
        app_role text not null default 'user',
        status text not null default 'active',
        local_auth_status text not null default 'fs27-linked',
        metadata jsonb not null default '{}'::jsonb,
        first_seen_at timestamptz not null default now(),
        last_seen_at timestamptz not null default now(),
        unique(app_id, local_user_id)
      );`,
      `create index if not exists gate_app_users_email_idx on gate_app_users(app_id, lower(email));`,
      `create index if not exists gate_app_users_fs27_user_idx on gate_app_users(fs27_user_id, app_id, last_seen_at desc);`,
      `create index if not exists gate_app_users_customer_idx on gate_app_users(fs27_customer_id, app_id, last_seen_at desc);`,
      `create index if not exists gate_app_users_workspace_idx on gate_app_users(gate_app_workspace_id, app_id);`,
      `create table if not exists gate_app_entitlements (
        id uuid primary key default gen_random_uuid(),
        app_id text not null references gate_app_surfaces(app_id) on delete cascade,
        subject_kind text not null,
        subject_id text not null,
        fs27_customer_id bigint references customers(id) on delete set null,
        fs27_user_id uuid references users(id) on delete set null,
        fs27_workspace_id uuid references workspaces(id) on delete set null,
        gate_app_workspace_id uuid references gate_app_workspaces(id) on delete set null,
        entitlement_key text not null,
        plan_name text not null default 'free99-gate-owned',
        tier text not null default 'free99',
        status text not null default 'active',
        limits jsonb not null default '{}'::jsonb,
        metadata jsonb not null default '{}'::jsonb,
        starts_at timestamptz not null default now(),
        ends_at timestamptz,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        unique(app_id, subject_kind, subject_id, entitlement_key)
      );`,
      `create index if not exists gate_app_entitlements_customer_idx on gate_app_entitlements(fs27_customer_id, app_id, status);`,
      `create index if not exists gate_app_entitlements_user_idx on gate_app_entitlements(fs27_user_id, app_id, status);`,
      `create index if not exists gate_app_entitlements_workspace_idx on gate_app_entitlements(gate_app_workspace_id, app_id, status);`,
      `create table if not exists gate_auth_migration_records (
        id uuid primary key default gen_random_uuid(),
        app_id text not null references gate_app_surfaces(app_id) on delete cascade,
        local_auth_kind text not null default 'legacy-local-auth',
        local_user_id text,
        local_workspace_id text,
        email text,
        fs27_user_id uuid references users(id) on delete set null,
        fs27_customer_id bigint references customers(id) on delete set null,
        action text not null default 'linked_to_fs27',
        status text not null default 'preserved',
        metadata jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now()
      );`,
      `create index if not exists gate_auth_migration_records_app_created_idx on gate_auth_migration_records(app_id, created_at desc);`,
      `create index if not exists gate_auth_migration_records_email_idx on gate_auth_migration_records(app_id, lower(email));`,
      `create table if not exists gate_owner_recovery_paths (
        id uuid primary key default gen_random_uuid(),
        app_id text not null references gate_app_surfaces(app_id) on delete cascade,
        path_key text not null,
        recovery_kind text not null default 'owner-break-glass',
        owner_user_id uuid references users(id) on delete set null,
        status text not null default 'active',
        scope text[] not null default '{}'::text[],
        credential_hash text,
        metadata jsonb not null default '{}'::jsonb,
        expires_at timestamptz,
        used_at timestamptz,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        unique(app_id, path_key)
      );`,
      `create index if not exists gate_owner_recovery_paths_owner_idx on gate_owner_recovery_paths(owner_user_id, status, updated_at desc);`,
      `create table if not exists gate_service_credentials (
        id uuid primary key default gen_random_uuid(),
        app_id text not null references gate_app_surfaces(app_id) on delete cascade,
        service_name text not null,
        credential_hash text not null,
        credential_last4 text,
        scope text[] not null default '{}'::text[],
        status text not null default 'active',
        metadata jsonb not null default '{}'::jsonb,
        rotated_at timestamptz,
        expires_at timestamptz,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        unique(app_id, service_name, credential_hash)
      );`,
      `create index if not exists gate_service_credentials_app_idx on gate_service_credentials(app_id, service_name, status);`,
      `create table if not exists gate_app_data_mirrors (
        id uuid primary key default gen_random_uuid(),
        app_id text not null references gate_app_surfaces(app_id) on delete cascade,
        entity_type text not null,
        local_entity_id text not null,
        fs27_customer_id bigint references customers(id) on delete set null,
        fs27_user_id uuid references users(id) on delete set null,
        gate_app_workspace_id uuid references gate_app_workspaces(id) on delete set null,
        content_hash text,
        status text not null default 'mirrored',
        metadata jsonb not null default '{}'::jsonb,
        first_seen_at timestamptz not null default now(),
        last_seen_at timestamptz not null default now(),
        unique(app_id, entity_type, local_entity_id)
      );`,
      `create index if not exists gate_app_data_mirrors_workspace_idx on gate_app_data_mirrors(gate_app_workspace_id, entity_type, last_seen_at desc);`,
      `create index if not exists gate_app_data_mirrors_user_idx on gate_app_data_mirrors(fs27_user_id, app_id, entity_type, last_seen_at desc);`,
      `create table if not exists skymail.gate_user_links (
        fs27_user_id uuid references public.users(id) on delete set null,
        fs27_customer_id bigint references public.customers(id) on delete set null,
        fs27_gate_card_id text,
        skymail_user_id uuid,
        skymail_id text,
        workspace_id text,
        email text not null,
        handle text,
        local_auth_status text not null default 'fs27-linked',
        metadata jsonb not null default '{}'::jsonb,
        first_seen_at timestamptz not null default now(),
        last_seen_at timestamptz not null default now(),
        primary key(email)
      );`,
      `create index if not exists skymail_gate_user_links_fs27_user_idx on skymail.gate_user_links(fs27_user_id, last_seen_at desc);`,
      `create index if not exists skymail_gate_user_links_workspace_idx on skymail.gate_user_links(workspace_id, last_seen_at desc);`,
      `create table if not exists skymail.gate_mailbox_links (
        skymail_id text primary key,
        fs27_user_id uuid references public.users(id) on delete set null,
        fs27_customer_id bigint references public.customers(id) on delete set null,
        fs27_gate_card_id text,
        workspace_id text,
        mailbox_email text,
        mailbox_kind text not null default 'hosted',
        status text not null default 'active',
        metadata jsonb not null default '{}'::jsonb,
        first_seen_at timestamptz not null default now(),
        last_seen_at timestamptz not null default now()
      );`,

];

    for (const batch of chunkQueries(statements)) {
      await runQueriesWithSearchPath(batch.map((text) => ({ text })));
    }
  })();

  return _schemaPromise;
}

/**
 * Query helper compatible with the previous `pg`-ish interface:
 * - returns { rows, rowCount }
 * - supports $1, $2 placeholders + params array via sql.query(...)
 */
export async function q(text, params = []) {
  if (useD1ForQuery(text)) return qD1(text, params);
  await ensureSchema();
  const [rows] = await withDbTimeout(runQueriesWithSearchPath([{ text, params }]));
  return { rows: rows || [], rowCount: Array.isArray(rows) ? rows.length : 0 };
}
