PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS connectlog_cards (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  connectlog_card_id TEXT NOT NULL,
  card_label TEXT,
  campaign TEXT,
  owner_name TEXT,
  owner_company TEXT,
  owner_role TEXT,
  welcome_message TEXT,
  tags_json TEXT NOT NULL DEFAULT '[]',
  last_conversation_id TEXT REFERENCES conversations(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused','archived')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(workspace_id, connectlog_card_id)
);
CREATE INDEX IF NOT EXISTS idx_connectlog_cards_workspace_updated ON connectlog_cards(workspace_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_connectlog_cards_workspace_campaign ON connectlog_cards(workspace_id, campaign, updated_at DESC);

CREATE TABLE IF NOT EXISTS connectlog_contact_requests (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  connectlog_card_id TEXT,
  card_record_id TEXT REFERENCES connectlog_cards(id) ON DELETE SET NULL,
  request_status TEXT NOT NULL DEFAULT 'open' CHECK(request_status IN ('open','accepted','archived')),
  customer_name TEXT,
  customer_email TEXT,
  source_url TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  welcome_sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(workspace_id, conversation_id)
);
CREATE INDEX IF NOT EXISTS idx_connectlog_requests_workspace_created ON connectlog_contact_requests(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_connectlog_requests_workspace_card ON connectlog_contact_requests(workspace_id, connectlog_card_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_connectlog_requests_workspace_status ON connectlog_contact_requests(workspace_id, request_status, created_at DESC);
