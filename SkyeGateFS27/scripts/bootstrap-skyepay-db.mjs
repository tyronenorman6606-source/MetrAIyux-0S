import path from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@netlify/neon";
import { loadLocalEnv } from "./_local-env.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const repoRoot = path.resolve(root, "..");
loadLocalEnv({ root, repoRoot });

const connectionString = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error(JSON.stringify({ ok: false, error: "missing DATABASE_URL or NETLIFY_DATABASE_URL" }, null, 2));
  process.exit(1);
}

const sql = neon(connectionString);

const statements = [
  `create table if not exists customers (
    id bigserial primary key,
    email text not null unique,
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
  `create table if not exists audit_events (
    id bigserial primary key,
    actor text not null,
    action text not null,
    target text,
    meta jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
  );`,
  `create index if not exists audit_events_created_idx on audit_events(created_at desc);`,
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
  `alter table customers add column if not exists default_rpm_limit integer;`,
  `alter table customers add column if not exists default_rpd_limit integer;`,
  `alter table customers add column if not exists vault_storage_mb integer;`,
  `alter table customers add column if not exists vault_file_limit integer;`,
  `alter table customers add column if not exists vault_workspace_limit integer;`,
  `alter table customers add column if not exists skypay_policy jsonb not null default '{}'::jsonb;`,
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
  `create index if not exists skyepay_orders_client_idx on skyepay_orders(client_slug, created_at desc);`,
  `alter table skyepay_orders alter column owner_status set default 'waiting_for_checkout';`,
  `alter table skyepay_orders alter column provisioning_status set default 'waiting_for_payment';`,
  `create index if not exists skyepay_orders_customer_idx on skyepay_orders(customer_id, created_at desc);`,
  `create index if not exists skyepay_orders_status_idx on skyepay_orders(approval_status, owner_status, provisioning_status, created_at desc);`,
  `create index if not exists skyepay_orders_stripe_customer_idx on skyepay_orders(stripe_customer_id);`
];

for (const statement of statements) {
  await sql.query(statement);
}

const tables = await sql.query(
  `select table_name
   from information_schema.tables
   where table_schema='public'
     and table_name in ('customers','audit_events','gateway_events','skyepay_orders')
   order by table_name`
);

console.log(JSON.stringify({
  ok: tables.length === 4,
  tables: tables.map((row) => row.table_name)
}, null, 2));
