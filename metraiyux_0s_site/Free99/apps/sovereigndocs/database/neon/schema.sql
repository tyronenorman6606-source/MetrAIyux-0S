-- SovereignDocs v9 Neon/Postgres production schema
-- Cutover-ready schema. This does not mean the zip is already connected to a live DATABASE_URL.

create extension if not exists pgcrypto;

create table if not exists sd_upstream_subjects (
  id text primary key,
  email text,
  display_name text,
  org_id text,
  roles text[] not null default '{}'::text[],
  upstream_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sd_publish_lanes (
  id text primary key,
  label text not null,
  public_export_allowed boolean not null default false,
  prep_export_allowed boolean not null default false,
  description text not null default ''
);

insert into sd_publish_lanes (id,label,public_export_allowed,prep_export_allowed,description) values
  ('public_draft','Public draft',true,false,'Low-risk draft automation with boundary acceptance.'),
  ('public_gated_draft','Public gated draft',true,false,'Medium-risk draft automation with warning gate.'),
  ('admin_review_only','Admin review only',false,false,'High-risk or unreviewed templates blocked from public export.'),
  ('prep_worksheet_only','Prep worksheet only',false,true,'High-risk intake/preparation worksheet, not completed document.'),
  ('official_source_route','Official source route',false,true,'Prep packet plus external official source workflow.'),
  ('manual_triage','Manual triage',false,false,'Unknown or conflicted records require operator review.')
on conflict (id) do nothing;

create table if not exists sd_templates (
  id text primary key,
  base_id text,
  category_slug text not null,
  category_name text,
  title text not null,
  jurisdiction_id text,
  state_code text,
  state_name text,
  risk_level text not null default 'unknown',
  publish_lane text references sd_publish_lanes(id) default 'manual_triage',
  status text not null default 'draft',
  source_path text not null,
  checksum text,
  source_record jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sd_template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id text not null references sd_templates(id) on delete cascade,
  version text not null,
  source_path text not null,
  checksum text,
  source_record jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(template_id, version, checksum)
);

create table if not exists sd_review_decisions (
  id uuid primary key default gen_random_uuid(),
  template_id text not null references sd_templates(id) on delete cascade,
  status text not null check (status in ('draft','needs_review','prep_only_approved','public_draft_approved','rejected','official_source_route','needs_attorney_review','legal_partner_review_required','legal_partner_review_completed','deprecated','replaced')),
  reason text not null default '',
  scope text not null default 'template_record',
  reviewer_subject_id text references sd_upstream_subjects(id),
  public_export_allowed boolean not null default false,
  prep_worksheet_allowed boolean not null default false,
  attorney_reviewed boolean not null default false,
  decision_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists sd_official_workflows (
  id text primary key,
  title text not null,
  category text,
  source_id text,
  official_url text not null,
  risk_level text not null default 'unknown',
  completion_model text not null default 'prep_packet_plus_official_source_route',
  document_generation_policy text not null,
  last_verified date,
  next_review date,
  freshness_status text not null default 'unknown',
  workflow_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sd_documents (
  id uuid primary key default gen_random_uuid(),
  upstream_subject_id text references sd_upstream_subjects(id),
  upstream_org_id text,
  template_id text references sd_templates(id),
  template_version text,
  title text not null,
  risk_level text not null default 'unknown',
  export_class text not null default 'draft',
  answers jsonb not null default '{}'::jsonb,
  content_markdown text not null,
  boundary_accepted boolean not null default false,
  high_risk_gate_accepted boolean not null default false,
  signature_text text,
  status text not null default 'draft',
  review_decision_id uuid references sd_review_decisions(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sd_vault_records (
  id uuid primary key default gen_random_uuid(),
  upstream_subject_id text references sd_upstream_subjects(id),
  upstream_org_id text,
  document_id uuid references sd_documents(id) on delete set null,
  title text not null,
  vault_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sd_export_events (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references sd_documents(id) on delete set null,
  template_id text references sd_templates(id) on delete set null,
  upstream_subject_id text references sd_upstream_subjects(id),
  format text not null,
  export_class text not null,
  storage_key text,
  content_sha256 text,
  audit_event_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists sd_audit_events (
  id uuid primary key default gen_random_uuid(),
  upstream_subject_id text references sd_upstream_subjects(id),
  upstream_org_id text,
  type text not null,
  detail jsonb not null default '{}'::jsonb,
  previous_hash text,
  event_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists sd_templates_category_state_idx on sd_templates(category_slug, state_code);
create index if not exists sd_templates_risk_lane_idx on sd_templates(risk_level, publish_lane);
create index if not exists sd_review_decisions_template_created_idx on sd_review_decisions(template_id, created_at desc);
create index if not exists sd_documents_upstream_subject_idx on sd_documents(upstream_subject_id);
create index if not exists sd_documents_template_idx on sd_documents(template_id);
create index if not exists sd_vault_upstream_subject_idx on sd_vault_records(upstream_subject_id, created_at desc);
create index if not exists sd_exports_template_idx on sd_export_events(template_id, created_at desc);
create index if not exists sd_audit_type_created_idx on sd_audit_events(type, created_at desc);
create index if not exists sd_official_freshness_idx on sd_official_workflows(freshness_status, next_review);


-- v9 legal partner review lane
create table if not exists sd_legal_partners (
  id text primary key,
  display_name text not null,
  partner_type text not null default 'external_legal_review_pool',
  status text not null default 'operator_configured',
  jurisdictions jsonb not null default '[]'::jsonb,
  review_scopes jsonb not null default '[]'::jsonb,
  partner_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sd_legal_review_submissions (
  id uuid primary key default gen_random_uuid(),
  upstream_subject_id text references sd_upstream_subjects(id),
  upstream_org_id text,
  template_id text references sd_templates(id) on delete set null,
  template_version text,
  template_title text not null,
  risk_level text not null default 'unknown',
  service_plan_id text,
  review_scope text not null default 'general_partner_review_request',
  status text not null default 'submitted_pending_triage',
  partner_id text references sd_legal_partners(id) on delete set null,
  partner_status text,
  gate_payload jsonb not null default '{}'::jsonb,
  contact_payload jsonb not null default '{}'::jsonb,
  answers jsonb not null default '{}'::jsonb,
  packet_markdown text not null default '',
  boundary_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sd_legal_review_events (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references sd_legal_review_submissions(id) on delete cascade,
  actor_subject_id text references sd_upstream_subjects(id),
  event_type text not null,
  note text not null default '',
  partner_id text references sd_legal_partners(id) on delete set null,
  event_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists sd_legal_review_template_idx on sd_legal_review_submissions(template_id, created_at desc);
create index if not exists sd_legal_review_subject_idx on sd_legal_review_submissions(upstream_subject_id, created_at desc);
create index if not exists sd_legal_review_status_idx on sd_legal_review_submissions(status, created_at desc);
create index if not exists sd_legal_review_partner_idx on sd_legal_review_submissions(partner_id, created_at desc);


-- v10 commercial core tables
CREATE TABLE IF NOT EXISTS sd_commercial_orders (
  id TEXT PRIMARY KEY,
  order_type TEXT NOT NULL,
  service_id TEXT NOT NULL,
  status TEXT NOT NULL,
  risk TEXT,
  jurisdiction TEXT,
  upstream_user_id TEXT,
  upstream_org_id TEXT,
  payload_json TEXT NOT NULL,
  boundary_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sd_commercial_order_events (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  actor TEXT,
  note TEXT,
  payload_json TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sd_compliance_monitors (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  state_code TEXT,
  entity_type TEXT,
  monitor_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sd_esign_envelopes (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  status TEXT NOT NULL,
  title TEXT,
  signers_json TEXT NOT NULL,
  document_ref TEXT,
  boundary_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- v11 addendum: provider/event readiness
create table if not exists sd_payment_intents (
  id text primary key,
  provider text not null,
  provider_session_id text,
  order_id text,
  plan_id text not null,
  status text not null default 'created',
  checkout_url text,
  subject_id text,
  org_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sd_outbound_notifications (
  id text primary key,
  provider text not null,
  notification_type text not null,
  recipient text not null,
  subject text,
  status text not null default 'queued',
  provider_message_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists sd_object_artifacts (
  id text primary key,
  provider text not null,
  object_key text not null,
  content_type text,
  byte_size bigint,
  checksum text,
  subject_id text,
  org_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists sd_signature_envelopes (
  id text primary key,
  provider text not null,
  provider_envelope_id text,
  status text not null,
  order_id text,
  document_id text,
  signers jsonb not null default '[]'::jsonb,
  audit_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- v15 addendum: end-to-end case workflow orchestration
create table if not exists sd_cases (
  id text primary key,
  title text not null,
  case_type text not null,
  status text not null,
  template_ids jsonb not null default '[]'::jsonb,
  document_ids jsonb not null default '[]'::jsonb,
  packet_id text,
  handoff_id text,
  return_ids jsonb not null default '[]'::jsonb,
  review_submission_ids jsonb not null default '[]'::jsonb,
  order_ids jsonb not null default '[]'::jsonb,
  reminder_ids jsonb not null default '[]'::jsonb,
  signature_envelope_ids jsonb not null default '[]'::jsonb,
  risk_summary jsonb not null default '{}'::jsonb,
  owner_json jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  boundaries jsonb not null default '{}'::jsonb,
  events jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sd_cases_status_idx on sd_cases(status);
create index if not exists sd_cases_owner_idx on sd_cases((owner_json->>'id'));
create index if not exists sd_cases_updated_idx on sd_cases(updated_at desc);
