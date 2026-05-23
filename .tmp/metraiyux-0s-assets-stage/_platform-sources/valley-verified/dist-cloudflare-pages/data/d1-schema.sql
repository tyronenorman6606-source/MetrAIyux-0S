-- Valley Verified v18 runtime state schema for Cloudflare D1 / SQLite
CREATE TABLE IF NOT EXISTS phx_actions (
  action_id TEXT PRIMARY KEY,
  action_type TEXT NOT NULL,
  queue TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued_for_review',
  actor_id TEXT,
  actor_email TEXT,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_phx_actions_queue_status ON phx_actions(queue, status);
CREATE INDEX IF NOT EXISTS idx_phx_actions_type_created ON phx_actions(action_type, created_at);
CREATE TABLE IF NOT EXISTS phx_action_events (
  event_id TEXT PRIMARY KEY,
  action_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  decision TEXT,
  reviewer TEXT,
  event_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_phx_action_events_action ON phx_action_events(action_id, created_at);
CREATE TABLE IF NOT EXISTS phx_listing_state (
  business_id TEXT PRIMARY KEY,
  claim_status TEXT,
  verification_status TEXT,
  ae_stage TEXT,
  suppression_status TEXT,
  state_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_phx_listing_state_claim ON phx_listing_state(claim_status);
CREATE INDEX IF NOT EXISTS idx_phx_listing_state_ae ON phx_listing_state(ae_stage);
CREATE TABLE IF NOT EXISTS phx_leads (
  lead_id TEXT PRIMARY KEY,
  lead_status TEXT NOT NULL,
  city TEXT,
  category TEXT,
  buyer_contact_hash TEXT,
  assigned_to TEXT,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_phx_leads_lane_status ON phx_leads(city, category, lead_status);
CREATE TABLE IF NOT EXISTS phx_owner_contacts (
  contact_id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  channel TEXT,
  outcome TEXT,
  next_action TEXT,
  due_date TEXT,
  notes TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_phx_owner_contacts_business ON phx_owner_contacts(business_id, created_at);
CREATE TABLE IF NOT EXISTS phx_suppression_drafts (
  business_id TEXT PRIMARY KEY,
  reason TEXT NOT NULL,
  evidence_json TEXT NOT NULL,
  status TEXT NOT NULL,
  reviewer TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
