create table if not exists connector_events (
  id text primary key,
  item_id text,
  connector_type text not null,
  action text not null,
  status text not null,
  approval_required integer not null default 0,
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  payload text not null default '{}',
  last_error text,
  created_at text not null,
  updated_at text not null,
  dispatched_at text
);
create index if not exists idx_connector_events_item on connector_events(item_id);
create index if not exists idx_connector_events_status on connector_events(status);
create index if not exists idx_connector_events_type on connector_events(connector_type);

create table if not exists secret_rotation_runs (
  id text primary key,
  secret_name text not null,
  target_script text not null,
  status text not null,
  mode text not null,
  actor text,
  approval_id text,
  cloudflare_status text,
  error text,
  created_at text not null,
  completed_at text,
  payload text not null default '{}'
);
create index if not exists idx_secret_rotation_runs_secret on secret_rotation_runs(secret_name);
create index if not exists idx_secret_rotation_runs_created on secret_rotation_runs(created_at);

create table if not exists admin_mfa_devices (
  id text primary key,
  label text,
  account_name text,
  issuer text not null default 'MetrAIyux 0S',
  status text not null default 'pending_verification',
  digits integer not null default 6,
  period integer not null default 30,
  algorithm text not null default 'SHA-1',
  encrypted_secret text not null,
  created_at text not null,
  verified_at text,
  last_used_at text
);
create index if not exists idx_admin_mfa_devices_status on admin_mfa_devices(status);

create table if not exists admin_backup_codes (
  id text primary key,
  code_hash text not null unique,
  batch_id text not null,
  status text not null default 'active',
  created_at text not null,
  used_at text,
  expires_at text,
  delivery text not null default 'email_once'
);
create index if not exists idx_admin_backup_codes_batch on admin_backup_codes(batch_id);
create index if not exists idx_admin_backup_codes_status on admin_backup_codes(status);

create table if not exists admin_security_sessions (
  id text primary key,
  token_hash text not null unique,
  actor text,
  kind text not null,
  status text not null default 'active',
  created_at text not null,
  expires_at text not null
);
create index if not exists idx_admin_security_sessions_hash on admin_security_sessions(token_hash);
create index if not exists idx_admin_security_sessions_expires on admin_security_sessions(expires_at);
