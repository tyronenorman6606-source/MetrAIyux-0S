-- SkyeMail backed by Citadel Database and SkyeNet schema (sovereign Postgres) — Full Gmail command center
-- Includes Gmail mailbox linkage, push-watch state, contacts sync, local prefs, and secure sovereign key tables.
-- Keep SkyeMail isolated from existing platform tables in shared Citadel databases.

create schema if not exists skymail;
set search_path to skymail, public;

create extension if not exists pgcrypto;

create table if not exists skymail.users (
  id uuid primary key default gen_random_uuid(),
  handle text unique not null,
  email text unique not null,
  password_hash text not null,
  skymail_id text,
  workspace_id text,
  fs27_sub text,
  fs27_customer_id text,
  fs27_gate_card_id text,
  fs27_card_json jsonb,

  recovery_enabled boolean not null default false,
  recovery_blob_json text,

  created_at timestamptz not null default now()
);

alter table if exists skymail.users add column if not exists skymail_id text;
alter table if exists skymail.users add column if not exists workspace_id text;
alter table if exists skymail.users add column if not exists fs27_sub text;
alter table if exists skymail.users add column if not exists fs27_customer_id text;
alter table if exists skymail.users add column if not exists fs27_gate_card_id text;
alter table if exists skymail.users add column if not exists fs27_card_json jsonb;

create unique index if not exists idx_users_handle_lower on skymail.users(lower(handle));
create unique index if not exists idx_users_email_lower on skymail.users(lower(email));
create unique index if not exists idx_users_skymail_id_lower on skymail.users(lower(skymail_id)) where skymail_id is not null;
create unique index if not exists idx_users_fs27_sub_lower on skymail.users(lower(fs27_sub)) where fs27_sub is not null;
create index if not exists idx_users_workspace_id on skymail.users(workspace_id);
create index if not exists idx_users_fs27_customer_id on skymail.users(fs27_customer_id);

create table if not exists skymail.user_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references skymail.users(id) on delete cascade,
  version integer not null,
  is_active boolean not null default false,

  rsa_public_key_pem text not null,
  vault_wrap_json text not null,

  created_at timestamptz not null default now(),
  unique(user_id, version)
);

create index if not exists idx_user_keys_user_active on skymail.user_keys(user_id, is_active);
create index if not exists idx_user_keys_user_version on skymail.user_keys(user_id, version);

create table if not exists skymail.threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references skymail.users(id) on delete cascade,
  token text unique not null,
  from_name text,
  from_email text,
  created_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now()
);

create index if not exists idx_threads_user_created on skymail.threads(user_id, created_at desc);

create table if not exists skymail.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references skymail.users(id) on delete cascade,
  thread_id uuid references skymail.threads(id) on delete set null,

  from_name text,
  from_email text,

  key_version integer not null,

  encrypted_key_b64 text not null,
  iv_b64 text not null,
  ciphertext_b64 text not null,

  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists idx_messages_user_created on skymail.messages(user_id, created_at desc);
create index if not exists idx_messages_thread_created on skymail.messages(thread_id, created_at desc);

alter table if exists skymail.messages add column if not exists direction text not null default 'inbound';
alter table if exists skymail.messages add column if not exists delivery_provider text;
alter table if exists skymail.messages add column if not exists provider_message_id text;
alter table if exists skymail.messages add column if not exists delivery_status text;
alter table if exists skymail.messages add column if not exists last_delivery_event_at timestamptz;
alter table if exists skymail.messages add column if not exists recipient_alias text;
alter table if exists skymail.messages add column if not exists delivered_to text;
alter table if exists skymail.messages add column if not exists starred_at timestamptz;

create index if not exists idx_messages_provider_message on skymail.messages(delivery_provider, provider_message_id);
create index if not exists idx_messages_user_delivery on skymail.messages(user_id, delivery_status, last_delivery_event_at desc);

create table if not exists skymail.message_label_states (
  user_id uuid not null references skymail.users(id) on delete cascade,
  provider text not null default 'local',
  provider_message_id text not null,
  message_id uuid references skymail.messages(id) on delete cascade,
  starred_at timestamptz,
  read_at timestamptz,
  archived_at timestamptz,
  trashed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key(user_id, provider, provider_message_id)
);

create index if not exists idx_message_label_states_user_updated on skymail.message_label_states(user_id, updated_at desc);
create index if not exists idx_message_label_states_message on skymail.message_label_states(message_id);

create table if not exists skymail.workflow_packets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references skymail.users(id) on delete cascade,
  packet_id text not null,
  label text,
  notes text,
  mailbox_json jsonb not null default '{}'::jsonb,
  selection_json jsonb not null default '{}'::jsonb,
  messages_json jsonb not null default '[]'::jsonb,
  drafts_summary_json jsonb not null default '{}'::jsonb,
  contacts_summary_json jsonb not null default '{}'::jsonb,
  downstream_targets_json jsonb not null default '[]'::jsonb,
  recommended_actions_json jsonb not null default '[]'::jsonb,
  summary_json jsonb not null default '{}'::jsonb,
  review_json jsonb not null default '{}'::jsonb,
  execution_json jsonb not null default '{}'::jsonb,
  dispatch_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, packet_id)
);

create index if not exists idx_workflow_packets_user_updated on skymail.workflow_packets(user_id, updated_at desc);

create table if not exists skymail.workflow_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references skymail.users(id) on delete cascade,
  packet_id text,
  category text not null,
  type text not null,
  status text,
  owner text,
  checkpoint text,
  channel text,
  detail text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_workflow_events_user_created on skymail.workflow_events(user_id, created_at desc);
create index if not exists idx_workflow_events_packet on skymail.workflow_events(user_id, packet_id, created_at desc);

create table if not exists skymail.skyemail_telemetry_events (
  id text primary key,
  user_id uuid references skymail.users(id) on delete set null,
  mailbox_email text,
  actor_hash text,
  route text not null,
  method text not null,
  status integer not null default 0,
  ok boolean not null default false,
  elapsed_ms integer not null default 0,
  source text not null default 'worker-api',
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists skyemail_telemetry_user_created_idx on skymail.skyemail_telemetry_events(user_id, created_at desc);
create index if not exists skyemail_telemetry_route_created_idx on skymail.skyemail_telemetry_events(route, created_at desc);

create table if not exists skymail.attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references skymail.messages(id) on delete cascade,

  filename text not null,
  mime_type text not null,
  size_bytes integer not null,

  encrypted_key_b64 text not null,
  iv_b64 text not null,
  ciphertext bytea not null,

  created_at timestamptz not null default now()
);

create index if not exists idx_attachments_message on skymail.attachments(message_id);

create table if not exists skymail.google_mailboxes (
  user_id uuid primary key references skymail.users(id) on delete cascade,
  google_email text not null,
  from_name text,
  access_token_enc text not null,
  refresh_token_enc text not null,
  token_type text,
  scope text,
  expires_at timestamptz,
  history_id text,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_google_mailboxes_email on skymail.google_mailboxes(lower(google_email));

alter table if exists skymail.google_mailboxes add column if not exists watch_topic text;
alter table if exists skymail.google_mailboxes add column if not exists watch_expiration timestamptz;
alter table if exists skymail.google_mailboxes add column if not exists watch_status text not null default 'inactive';
alter table if exists skymail.google_mailboxes add column if not exists watch_last_error text;
alter table if exists skymail.google_mailboxes add column if not exists push_enabled boolean not null default false;
alter table if exists skymail.google_mailboxes add column if not exists sync_version bigint not null default 0;
alter table if exists skymail.google_mailboxes add column if not exists last_notification_history_id text;
alter table if exists skymail.google_mailboxes add column if not exists last_notification_at timestamptz;
alter table if exists skymail.google_mailboxes add column if not exists last_sync_at timestamptz;
alter table if exists skymail.google_mailboxes add column if not exists full_sync_required boolean not null default false;
alter table if exists skymail.google_mailboxes add column if not exists contacts_last_sync_at timestamptz;
alter table if exists skymail.google_mailboxes add column if not exists contacts_last_sync_count integer not null default 0;
alter table if exists skymail.google_mailboxes add column if not exists contacts_sync_error text;

create index if not exists idx_google_mailboxes_watch_expiration on skymail.google_mailboxes(watch_expiration);
create index if not exists idx_google_mailboxes_push_enabled on skymail.google_mailboxes(push_enabled);

create table if not exists skymail.user_preferences (
  user_id uuid primary key references skymail.users(id) on delete cascade,
  display_name text,
  profile_title text,
  profile_phone text,
  profile_company text,
  profile_website text,
  signature_text text,
  signature_html text,
  preferred_from_alias text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists skymail.user_preferences add column if not exists preferred_from_alias text;

create table if not exists skymail.mail_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references skymail.users(id) on delete cascade,
  email text not null,
  full_name text,
  company text,
  phone text,
  notes text,
  favorite boolean not null default false,
  source text not null default 'local',
  source_resource_name text,
  source_etag text,
  source_metadata_json text,
  photo_url text,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, email)
);

alter table if exists skymail.mail_contacts add column if not exists phone text;
alter table if exists skymail.mail_contacts add column if not exists source text not null default 'local';
alter table if exists skymail.mail_contacts add column if not exists source_resource_name text;
alter table if exists skymail.mail_contacts add column if not exists source_etag text;
alter table if exists skymail.mail_contacts add column if not exists source_metadata_json text;
alter table if exists skymail.mail_contacts add column if not exists photo_url text;

create index if not exists idx_mail_contacts_user_order on skymail.mail_contacts(user_id, favorite desc, updated_at desc);
create unique index if not exists idx_mail_contacts_user_email_lower on skymail.mail_contacts(user_id, lower(email));
create index if not exists idx_mail_contacts_source on skymail.mail_contacts(user_id, source, source_resource_name);

create table if not exists skymail.resend_webhook_events (
  id uuid primary key default gen_random_uuid(),
  svix_id text unique,
  event_type text not null,
  resend_email_id text,
  payload_json jsonb not null,
  processing_status text not null default 'received',
  error text,
  related_user_id uuid references skymail.users(id) on delete set null,
  related_message_id uuid references skymail.messages(id) on delete set null,
  received_at timestamptz not null default now(),
  event_created_at timestamptz,
  processed_at timestamptz
);

create index if not exists idx_resend_webhook_events_type_received on skymail.resend_webhook_events(event_type, received_at desc);
create index if not exists idx_resend_webhook_events_email on skymail.resend_webhook_events(resend_email_id, received_at desc);
create index if not exists idx_resend_webhook_events_related_user on skymail.resend_webhook_events(related_user_id, received_at desc);

create table if not exists skymail.message_delivery_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references skymail.users(id) on delete set null,
  message_id uuid references skymail.messages(id) on delete set null,
  provider text not null default 'resend',
  provider_message_id text not null,
  event_type text not null,
  delivery_status text not null,
  recipient_email text,
  from_email text,
  subject text,
  svix_id text unique,
  payload_json jsonb not null,
  event_created_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_message_delivery_events_user_created on skymail.message_delivery_events(user_id, created_at desc);
create index if not exists idx_message_delivery_events_provider_message on skymail.message_delivery_events(provider, provider_message_id, created_at desc);
create index if not exists idx_message_delivery_events_status_created on skymail.message_delivery_events(delivery_status, created_at desc);

create table if not exists skymail.hosted_mailboxes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references skymail.users(id) on delete cascade,
  mailbox_email text unique not null,
  local_part text not null,
  domain text not null,
  workspace_id text,
  skymail_id text,
  fs27_gate_card_id text,
  provider text not null default 'stalwart',
  provider_account_id text,
  status text not null default 'pending',
  provisioning_status text not null default 'pending',
  provider_payload_json jsonb,
  imap_host text,
  smtp_host text,
  jmap_url text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  provisioned_at timestamptz
);

alter table if exists skymail.hosted_mailboxes add column if not exists workspace_id text;
alter table if exists skymail.hosted_mailboxes add column if not exists skymail_id text;
alter table if exists skymail.hosted_mailboxes add column if not exists fs27_gate_card_id text;

create index if not exists idx_hosted_mailboxes_user_created on skymail.hosted_mailboxes(user_id, created_at desc);
create index if not exists idx_hosted_mailboxes_domain on skymail.hosted_mailboxes(domain, local_part);
create index if not exists idx_hosted_mailboxes_provider_account on skymail.hosted_mailboxes(provider, provider_account_id);
create unique index if not exists idx_hosted_mailboxes_email_lower on skymail.hosted_mailboxes(lower(mailbox_email));
create index if not exists idx_hosted_mailboxes_workspace on skymail.hosted_mailboxes(workspace_id, created_at desc);

create table if not exists skymail.brain_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references skymail.users(id) on delete cascade,
  mailbox_id uuid references skymail.hosted_mailboxes(id) on delete set null,
  action text not null,
  message_ids_json jsonb not null default '[]'::jsonb,
  input_json jsonb not null default '{}'::jsonb,
  output_json jsonb not null default '{}'::jsonb,
  model_mode text not null default 'local_deterministic_v1',
  kaixu_usage_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_brain_events_user_created on skymail.brain_events(user_id, created_at desc);
create index if not exists idx_brain_events_mailbox_created on skymail.brain_events(mailbox_id, created_at desc);

create table if not exists skymail.brain_monitors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references skymail.users(id) on delete cascade,
  mailbox_id uuid references skymail.hosted_mailboxes(id) on delete cascade,
  monitor_key text not null,
  subject text,
  correspondent_email text,
  sent_message_id text,
  thread_id text,
  status text not null default 'watching',
  matched_message_id text,
  last_checked_at timestamptz,
  meta_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_brain_monitors_user_status on skymail.brain_monitors(user_id, status, created_at desc);
create index if not exists idx_brain_monitors_mailbox_status on skymail.brain_monitors(mailbox_id, status, created_at desc);

create table if not exists skymail.ai_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references skymail.users(id) on delete cascade,
  mailbox_id uuid references skymail.hosted_mailboxes(id) on delete cascade,
  fs27_customer_id text,
  plan_id text not null default 'skymail_ai_free',
  status text not null default 'active',
  source text not null default 'fs27_snapshot',
  included_messages int not null default 0,
  backup_messages int not null default 0,
  monthly_cents_cap int not null default 0,
  auto_send_enabled boolean not null default false,
  current_period_start timestamptz not null default date_trunc('month', now()),
  current_period_end timestamptz,
  meta_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ai_entitlements_user on skymail.ai_entitlements(user_id, updated_at desc);

create table if not exists skymail.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references skymail.users(id) on delete cascade,
  mailbox_id uuid references skymail.hosted_mailboxes(id) on delete set null,
  plan_id text not null,
  action text not null,
  model_mode text not null,
  provider_path text not null,
  provider text,
  model text,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  total_tokens int not null default 0,
  cost_cents int not null default 0,
  request_json jsonb not null default '{}'::jsonb,
  response_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_usage_events_user_created on skymail.ai_usage_events(user_id, created_at desc);
create index if not exists idx_ai_usage_events_mailbox_created on skymail.ai_usage_events(mailbox_id, created_at desc);

create table if not exists skymail.mailbox_aliases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references skymail.users(id) on delete cascade,
  mailbox_id uuid not null references skymail.hosted_mailboxes(id) on delete cascade,
  alias_email text unique not null,
  local_part text not null,
  domain text not null,
  alias_type text not null default 'custom',
  display_name text,
  status text not null default 'active',
  provider_alias_id text,
  provider_payload_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_mailbox_aliases_email_lower on skymail.mailbox_aliases(lower(alias_email));
create unique index if not exists idx_mailbox_aliases_email_exact on skymail.mailbox_aliases(alias_email);
create index if not exists idx_mailbox_aliases_mailbox on skymail.mailbox_aliases(mailbox_id, created_at desc);
create index if not exists idx_mailbox_aliases_user on skymail.mailbox_aliases(user_id, created_at desc);
create index if not exists idx_mailbox_aliases_domain on skymail.mailbox_aliases(domain, local_part);

create table if not exists skymail.mailbox_offboarding_events (
  id text primary key,
  user_id uuid references skymail.users(id) on delete set null,
  mailbox_id uuid references skymail.hosted_mailboxes(id) on delete set null,
  mailbox_email text,
  action text not null,
  status text not null,
  actor text,
  provider text,
  provider_account_id text,
  checklist_json jsonb not null default '{}'::jsonb,
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_mailbox_offboarding_events_user_created on skymail.mailbox_offboarding_events(user_id, created_at desc);
create index if not exists idx_mailbox_offboarding_events_mailbox_created on skymail.mailbox_offboarding_events(mailbox_id, created_at desc);
create index if not exists idx_mailbox_offboarding_events_email_created on skymail.mailbox_offboarding_events(lower(mailbox_email), created_at desc);

create table if not exists skymail.workspace_key_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references skymail.users(id) on delete cascade,
  mailbox_id uuid references skymail.hosted_mailboxes(id) on delete set null,
  workspace_id text,
  customer_id text,
  card_type text not null default 'skymail_vault_key_card',
  recipient_email text,
  display_name text,
  mailbox_email text,
  setup_url text,
  recovery_policy text not null default 'client_managed_optional_admin_recovery',
  status text not null default 'issued',
  mdp_status text not null default 'not_configured',
  mdp_response_json jsonb,
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_workspace_key_cards_user_created on skymail.workspace_key_cards(user_id, created_at desc);
create index if not exists idx_workspace_key_cards_workspace on skymail.workspace_key_cards(workspace_id, created_at desc);
create index if not exists idx_workspace_key_cards_email on skymail.workspace_key_cards(lower(recipient_email));

create table if not exists skymail.skymail_backup_events (
  id text primary key,
  type text not null,
  payload_json jsonb not null,
  backup_target text not null default 'citadel',
  created_at timestamptz not null default now()
);

create index if not exists idx_skymail_backup_events_type_created on skymail.skymail_backup_events(type, created_at desc);
