PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS connectlog_activation_runs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK(status IN ('passed','failed')),
  conversation_id TEXT REFERENCES conversations(id) ON DELETE SET NULL,
  summary TEXT,
  report_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_connectlog_activation_runs_workspace_created ON connectlog_activation_runs(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_connectlog_activation_runs_workspace_status ON connectlog_activation_runs(workspace_id, status, created_at DESC);
