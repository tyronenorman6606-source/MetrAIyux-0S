-- SovereignDocs v9 Cloudflare D1 production schema
-- D1-compatible SQLite schema for Worker deployment. This does not mean the zip is already connected to live D1.

create table if not exists sd_upstream_subjects (
  id text primary key,
  email text,
  display_name text,
  org_id text,
  roles_json text not null default '[]',
  upstream_payload_json text not null default '{}',
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create table if not exists sd_publish_lanes (
  id text primary key,
  label text not null,
  public_export_allowed integer not null default 0,
  prep_export_allowed integer not null default 0,
  description text not null default ''
);

insert or ignore into sd_publish_lanes (id,label,public_export_allowed,prep_export_allowed,description) values
  ('public_draft','Public draft',1,0,'Low-risk draft automation with boundary acceptance.'),
  ('public_gated_draft','Public gated draft',1,0,'Medium-risk draft automation with warning gate.'),
  ('admin_review_only','Admin review only',0,0,'High-risk or unreviewed templates blocked from public export.'),
  ('prep_worksheet_only','Prep worksheet only',0,1,'High-risk intake/preparation worksheet, not completed document.'),
  ('official_source_route','Official source route',0,1,'Prep packet plus external official source workflow.'),
  ('manual_triage','Manual triage',0,0,'Unknown or conflicted records require operator review.');

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
  publish_lane text default 'manual_triage',
  status text not null default 'draft',
  source_path text not null,
  checksum text,
  source_record_json text not null default '{}',
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create table if not exists sd_template_versions (
  id text primary key,
  template_id text not null,
  version text not null,
  source_path text not null,
  checksum text,
  source_record_json text not null default '{}',
  created_at text not null default (datetime('now')),
  foreign key (template_id) references sd_templates(id)
);

create table if not exists sd_review_decisions (
  id text primary key,
  template_id text not null,
  status text not null,
  reason text not null default '',
  scope text not null default 'template_record',
  reviewer_subject_id text,
  public_export_allowed integer not null default 0,
  prep_worksheet_allowed integer not null default 0,
  attorney_reviewed integer not null default 0,
  decision_payload_json text not null default '{}',
  created_at text not null default (datetime('now')),
  foreign key (template_id) references sd_templates(id)
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
  last_verified text,
  next_review text,
  freshness_status text not null default 'unknown',
  workflow_payload_json text not null default '{}',
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create table if not exists sd_documents (
  id text primary key,
  upstream_subject_id text,
  upstream_org_id text,
  template_id text,
  template_version text,
  title text not null,
  risk_level text not null default 'unknown',
  export_class text not null default 'draft',
  answers_json text not null default '{}',
  content_markdown text not null,
  boundary_accepted integer not null default 0,
  high_risk_gate_accepted integer not null default 0,
  signature_text text,
  status text not null default 'draft',
  review_decision_id text,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now')),
  foreign key (template_id) references sd_templates(id)
);

create table if not exists sd_vault_records (
  id text primary key,
  upstream_subject_id text,
  upstream_org_id text,
  document_id text,
  title text not null,
  vault_payload_json text not null default '{}',
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create table if not exists sd_export_events (
  id text primary key,
  document_id text,
  template_id text,
  upstream_subject_id text,
  format text not null,
  export_class text not null,
  storage_key text,
  content_sha256 text,
  audit_event_id text,
  created_at text not null default (datetime('now'))
);

create table if not exists sd_audit_events (
  id text primary key,
  upstream_subject_id text,
  upstream_org_id text,
  type text not null,
  detail_json text not null default '{}',
  previous_hash text,
  event_hash text not null,
  created_at text not null default (datetime('now'))
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
  jurisdictions_json text not null default '[]',
  review_scopes_json text not null default '[]',
  partner_payload_json text not null default '{}',
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create table if not exists sd_legal_review_submissions (
  id text primary key,
  upstream_subject_id text,
  upstream_org_id text,
  template_id text,
  template_version text,
  template_title text not null,
  risk_level text not null default 'unknown',
  service_plan_id text,
  review_scope text not null default 'general_partner_review_request',
  status text not null default 'submitted_pending_triage',
  partner_id text,
  partner_status text,
  gate_payload_json text not null default '{}',
  contact_payload_json text not null default '{}',
  answers_json text not null default '{}',
  packet_markdown text not null default '',
  boundary_payload_json text not null default '{}',
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create table if not exists sd_legal_review_events (
  id text primary key,
  submission_id text not null,
  actor_subject_id text,
  event_type text not null,
  note text not null default '',
  partner_id text,
  event_payload_json text not null default '{}',
  created_at text not null default (datetime('now'))
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
  payload text not null default '{}',
  created_at text not null default CURRENT_TIMESTAMP,
  updated_at text not null default CURRENT_TIMESTAMP
);
create table if not exists sd_outbound_notifications (
  id text primary key,
  provider text not null,
  notification_type text not null,
  recipient text not null,
  subject text,
  status text not null default 'queued',
  provider_message_id text,
  payload text not null default '{}',
  created_at text not null default CURRENT_TIMESTAMP
);
create table if not exists sd_object_artifacts (
  id text primary key,
  provider text not null,
  object_key text not null,
  content_type text,
  byte_size integer,
  checksum text,
  subject_id text,
  org_id text,
  metadata text not null default '{}',
  created_at text not null default CURRENT_TIMESTAMP
);
create table if not exists sd_signature_envelopes (
  id text primary key,
  provider text not null,
  provider_envelope_id text,
  status text not null,
  order_id text,
  document_id text,
  signers text not null default '[]',
  audit_payload text not null default '{}',
  created_at text not null default CURRENT_TIMESTAMP,
  updated_at text not null default CURRENT_TIMESTAMP
);

-- v15 addendum: end-to-end case workflow orchestration
create table if not exists sd_cases (
  id text primary key,
  title text not null,
  case_type text not null,
  status text not null,
  template_ids text not null default '[]',
  document_ids text not null default '[]',
  packet_id text,
  handoff_id text,
  return_ids text not null default '[]',
  review_submission_ids text not null default '[]',
  order_ids text not null default '[]',
  reminder_ids text not null default '[]',
  signature_envelope_ids text not null default '[]',
  risk_summary text not null default '{}',
  owner_json text not null default '{}',
  metadata text not null default '{}',
  boundaries text not null default '{}',
  events text not null default '[]',
  created_at text not null default CURRENT_TIMESTAMP,
  updated_at text not null default CURRENT_TIMESTAMP
);

create index if not exists sd_cases_status_idx on sd_cases(status);
create index if not exists sd_cases_updated_idx on sd_cases(updated_at);
