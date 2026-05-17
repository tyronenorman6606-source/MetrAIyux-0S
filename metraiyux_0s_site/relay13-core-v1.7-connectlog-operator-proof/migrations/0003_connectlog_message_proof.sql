PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS connectlog_request_events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  request_id TEXT NOT NULL REFERENCES connectlog_contact_requests(id) ON DELETE CASCADE,
  conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  actor_type TEXT NOT NULL DEFAULT 'system',
  actor_id TEXT,
  body TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_connectlog_request_events_workspace_created ON connectlog_request_events(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_connectlog_request_events_request_created ON connectlog_request_events(request_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_connectlog_request_events_conversation_created ON connectlog_request_events(conversation_id, created_at DESC);
