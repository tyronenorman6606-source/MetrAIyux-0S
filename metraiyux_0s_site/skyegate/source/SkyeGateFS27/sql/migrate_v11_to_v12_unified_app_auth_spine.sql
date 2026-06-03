-- v12: Unified app auth spine.
--
-- FS27/SkyGate owns auth. Mounted apps may keep branded login screens and
-- app-local data IDs, but users/workspaces/entitlements/recovery/service
-- credentials are linked here instead of becoming separate auth systems.
-- Runtime bootstrap in netlify/functions/_lib/db.js applies these tables.

create extension if not exists pgcrypto;

create table if not exists gate_app_surfaces (
  app_id text primary key,
  display_name text not null,
  category text not null default 'mounted-app',
  auth_mode text not null default 'fs27-gate-owned',
  default_plan text not null default 'free99',
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists gate_login_surfaces (
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
);

create table if not exists gate_app_workspaces (
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
);

create index if not exists gate_app_workspaces_customer_idx on gate_app_workspaces(fs27_customer_id, app_id, last_seen_at desc);
create index if not exists gate_app_workspaces_fs27_workspace_idx on gate_app_workspaces(fs27_workspace_id, app_id);
create index if not exists gate_app_workspaces_owner_idx on gate_app_workspaces(owner_user_id, app_id);

create table if not exists gate_app_users (
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
);

create index if not exists gate_app_users_email_idx on gate_app_users(app_id, lower(email));
create index if not exists gate_app_users_fs27_user_idx on gate_app_users(fs27_user_id, app_id, last_seen_at desc);
create index if not exists gate_app_users_customer_idx on gate_app_users(fs27_customer_id, app_id, last_seen_at desc);
create index if not exists gate_app_users_workspace_idx on gate_app_users(gate_app_workspace_id, app_id);

create table if not exists gate_app_entitlements (
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
);

create index if not exists gate_app_entitlements_customer_idx on gate_app_entitlements(fs27_customer_id, app_id, status);
create index if not exists gate_app_entitlements_user_idx on gate_app_entitlements(fs27_user_id, app_id, status);
create index if not exists gate_app_entitlements_workspace_idx on gate_app_entitlements(gate_app_workspace_id, app_id, status);

create table if not exists gate_auth_migration_records (
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
);

create index if not exists gate_auth_migration_records_app_created_idx on gate_auth_migration_records(app_id, created_at desc);
create index if not exists gate_auth_migration_records_email_idx on gate_auth_migration_records(app_id, lower(email));

create table if not exists gate_owner_recovery_paths (
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
);

create index if not exists gate_owner_recovery_paths_owner_idx on gate_owner_recovery_paths(owner_user_id, status, updated_at desc);

create table if not exists gate_service_credentials (
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
);

create index if not exists gate_service_credentials_app_idx on gate_service_credentials(app_id, service_name, status);

create table if not exists gate_app_data_mirrors (
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
);

create index if not exists gate_app_data_mirrors_workspace_idx on gate_app_data_mirrors(gate_app_workspace_id, entity_type, last_seen_at desc);
create index if not exists gate_app_data_mirrors_user_idx on gate_app_data_mirrors(fs27_user_id, app_id, entity_type, last_seen_at desc);

create schema if not exists skymail;

create table if not exists skymail.gate_user_links (
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
);

create index if not exists skymail_gate_user_links_fs27_user_idx on skymail.gate_user_links(fs27_user_id, last_seen_at desc);
create index if not exists skymail_gate_user_links_workspace_idx on skymail.gate_user_links(workspace_id, last_seen_at desc);

create table if not exists skymail.gate_mailbox_links (
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
);
