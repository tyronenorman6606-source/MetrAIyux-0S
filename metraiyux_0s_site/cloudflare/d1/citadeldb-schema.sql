CREATE TABLE IF NOT EXISTS citadel_mirror_events (
  id TEXT PRIMARY KEY,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL,
  source TEXT,
  app_id TEXT,
  workspace_id TEXT,
  table_name TEXT,
  record_id TEXT,
  operation TEXT,
  primary_ok INTEGER DEFAULT 0,
  neon_ok INTEGER DEFAULT 0,
  citadel_ok INTEGER DEFAULT 0,
  checksum TEXT,
  created_at TEXT NOT NULL,
  mirrored_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_citadel_mirror_events_created_at ON citadel_mirror_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_citadel_mirror_events_status ON citadel_mirror_events(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_citadel_mirror_events_app_table ON citadel_mirror_events(app_id, table_name, created_at DESC);

CREATE TABLE IF NOT EXISTS citadel_rows (
  id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL,
  workspace_id TEXT,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  source TEXT,
  checksum TEXT,
  payload_ref TEXT,
  payload_json TEXT,
  event_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_citadel_rows_identity ON citadel_rows(app_id, table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_citadel_rows_updated_at ON citadel_rows(updated_at DESC);

CREATE TABLE IF NOT EXISTS citadel_catchup_jobs (
  id TEXT PRIMARY KEY,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL,
  mode TEXT,
  app_id TEXT,
  table_name TEXT,
  dry_run INTEGER DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_citadel_catchup_jobs_created_at ON citadel_catchup_jobs(created_at DESC);
