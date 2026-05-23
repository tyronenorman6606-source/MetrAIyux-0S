-- Valley Verified v18 runtime state schema for Cloudflare D1 / SQLite
CREATE TABLE IF NOT EXISTS phx_actions (
  action_id text PRIMARY KEY,
  action_type text NOT NULL,
  queue text NOT NULL,
  status text NOT NULL DEFAULT 'queued_for_review',
  actor_id text,
  actor_email text,
  payload_json text NOT NULL,
  created_at text NOT NULL,
  updated_at text NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_phx_actions_queue_status ON phx_actions(queue, status);
CREATE INDEX IF NOT EXISTS idx_phx_actions_type_created ON phx_actions(action_type, created_at);
CREATE TABLE IF NOT EXISTS phx_action_events (
  event_id text PRIMARY KEY,
  action_id text NOT NULL,
  event_type text NOT NULL,
  decision text,
  reviewer text,
  event_json text NOT NULL,
  created_at text NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_phx_action_events_action ON phx_action_events(action_id, created_at);
CREATE TABLE IF NOT EXISTS phx_listing_state (
  business_id text PRIMARY KEY,
  claim_status text,
  verification_status text,
  ae_stage text,
  suppression_status text,
  state_json text NOT NULL,
  updated_at text NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_phx_listing_state_claim ON phx_listing_state(claim_status);
CREATE INDEX IF NOT EXISTS idx_phx_listing_state_ae ON phx_listing_state(ae_stage);
CREATE TABLE IF NOT EXISTS phx_leads (
  lead_id text PRIMARY KEY,
  lead_status text NOT NULL,
  city text,
  category text,
  buyer_contact_hash text,
  assigned_to text,
  payload_json text NOT NULL,
  created_at text NOT NULL,
  updated_at text NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_phx_leads_lane_status ON phx_leads(city, category, lead_status);
CREATE TABLE IF NOT EXISTS phx_owner_contacts (
  contact_id text PRIMARY KEY,
  business_id text NOT NULL,
  channel text,
  outcome text,
  next_action text,
  due_date text,
  notes text,
  created_at text NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_phx_owner_contacts_business ON phx_owner_contacts(business_id, created_at);
CREATE TABLE IF NOT EXISTS phx_suppression_drafts (
  business_id text PRIMARY KEY,
  reason text NOT NULL,
  evidence_json text NOT NULL,
  status text NOT NULL,
  reviewer text,
  created_at text NOT NULL,
  updated_at text NOT NULL
);
