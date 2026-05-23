create extension if not exists pgcrypto;

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  external_owner_id text,
  company_name text not null,
  primary_contact_name text,
  primary_contact_email text,
  primary_contact_phone text,
  status text not null default 'onboarding',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists service_plans (
  id uuid primary key default gen_random_uuid(),
  plan_key text not null unique,
  plan_name text not null,
  lane text not null check (lane in ('shared_skyemail','client_domain','bulk_hosted','child_org')),
  setup_fee_cents integer not null default 0,
  min_mailboxes integer not null default 1,
  mailbox_increment integer not null default 1,
  monthly_price_cents integer not null default 0,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into service_plans (plan_key, plan_name, lane, setup_fee_cents, min_mailboxes, mailbox_increment, monthly_price_cents, description)
values
  ('shared_skyemail', 'Shared SkyEmail / Managed Alias', 'shared_skyemail', 0, 1, 1, 0, 'Client uses a branded address under your verified domain or subdomain. Fastest route; no client DNS needed.'),
  ('client_domain_setup', 'Client-Owned Domain Setup', 'client_domain', 1300, 1, 1, 0, 'Client brings their own domain. Your onboarding collects DNS details and provisions verification/MX/SPF/DKIM tasks.'),
  ('bulk_hosted_5', 'Hosted Inbox Pack - 5 Seat Starter', 'bulk_hosted', 2500, 5, 5, 0, 'For companies needing a larger inbox surface. Starts in groups of five and scales upward.')
on conflict (plan_key) do update set
  plan_name = excluded.plan_name,
  lane = excluded.lane,
  setup_fee_cents = excluded.setup_fee_cents,
  min_mailboxes = excluded.min_mailboxes,
  mailbox_increment = excluded.mailbox_increment,
  description = excluded.description,
  active = true;

create table if not exists email_service_orders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  plan_id uuid references service_plans(id),
  lane text not null check (lane in ('shared_skyemail','client_domain','bulk_hosted','child_org')),
  desired_domain text,
  shared_domain_prefix text,
  mailbox_count integer not null default 1,
  setup_fee_cents integer not null default 0,
  monthly_price_cents integer not null default 0,
  zoho_org_id text,
  status text not null default 'intake_received',
  onboarding_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists client_domains (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  order_id uuid references email_service_orders(id) on delete set null,
  domain_name text not null,
  domain_mode text not null check (domain_mode in ('owned_by_platform','owned_by_client','subdomain','child_org')),
  zoho_domain_id text,
  verification_status text not null default 'not_started',
  mx_status text not null default 'not_started',
  spf_status text not null default 'not_started',
  dkim_status text not null default 'not_started',
  verification_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, domain_name)
);

create table if not exists mailbox_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  order_id uuid references email_service_orders(id) on delete cascade,
  local_part text not null,
  domain_name text not null,
  address text generated always as (lower(local_part || '@' || domain_name)) stored,
  display_name text,
  requested_role text,
  status text not null default 'requested',
  temporary_password text,
  zoho_zuid text,
  zoho_account_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (address)
);

create table if not exists aliases (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  mailbox_request_id uuid references mailbox_requests(id) on delete cascade,
  alias_address text not null unique,
  target_address text not null,
  status text not null default 'requested',
  created_at timestamptz not null default now()
);

create table if not exists provisioning_tasks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  order_id uuid references email_service_orders(id) on delete cascade,
  task_type text not null,
  status text not null default 'queued',
  priority integer not null default 100,
  payload jsonb not null default '{}'::jsonb,
  result jsonb,
  error text,
  run_after timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists billing_items (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  order_id uuid references email_service_orders(id) on delete cascade,
  item_type text not null,
  description text not null,
  amount_cents integer not null,
  currency text not null default 'usd',
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists mailbox_inventory (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  total_licenses integer not null default 131,
  monthly_cost_cents integer not null default 20000,
  reserved_licenses integer not null default 0,
  active_licenses integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into mailbox_inventory (label, total_licenses, monthly_cost_cents)
values ('primary_zoho_131_pool', 131, 20000)
on conflict (label) do nothing;

create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_external_id text,
  client_id uuid references clients(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_clients_status on clients(status);
create index if not exists idx_orders_client on email_service_orders(client_id);
create index if not exists idx_orders_lane on email_service_orders(lane);
create index if not exists idx_mailboxes_client on mailbox_requests(client_id);
create index if not exists idx_tasks_status on provisioning_tasks(status, run_after, priority);
