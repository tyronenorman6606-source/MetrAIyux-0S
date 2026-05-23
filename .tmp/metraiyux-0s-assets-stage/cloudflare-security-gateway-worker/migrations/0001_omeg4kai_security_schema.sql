CREATE TABLE IF NOT EXISTS omega_security_events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT,
  source TEXT,
  decision TEXT NOT NULL,
  risk_score INTEGER NOT NULL DEFAULT 0,
  findings TEXT NOT NULL DEFAULT '[]',
  command_text TEXT,
  payload TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS omega_approval_reviews (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_admin_review',
  primary_brain TEXT,
  secondary_brain TEXT,
  payload TEXT,
  created_at TEXT NOT NULL,
  decided_at TEXT
);
