CREATE TABLE IF NOT EXISTS connectlog_live_proof_runs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'failed',
  summary TEXT NOT NULL DEFAULT '',
  report_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_connectlog_live_proof_runs_workspace_created ON connectlog_live_proof_runs(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_connectlog_live_proof_runs_workspace_status ON connectlog_live_proof_runs(workspace_id, status, created_at DESC);
