-- Marketing Keys campaign gate table.
-- Bind a D1 database as MARKETING_KEYS_DB before applying this if you move
-- campaign analytics from SITE_EVENTS_KV into D1.

CREATE TABLE IF NOT EXISTS marketing_keys (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'marketing_keys.signup',
  status TEXT NOT NULL DEFAULT 'email_gate_session_issued',
  marketing_key TEXT NOT NULL,
  tracking_tag TEXT NOT NULL,
  gate_user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  company TEXT,
  source TEXT,
  return_to TEXT,
  page TEXT,
  session_expires_at TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_marketing_keys_tracking_tag_created_at
  ON marketing_keys (tracking_tag, created_at);

CREATE INDEX IF NOT EXISTS idx_marketing_keys_email
  ON marketing_keys (email);
