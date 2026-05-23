PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused','archived')),
  monthly_conversation_limit INTEGER NOT NULL DEFAULT 5000,
  monthly_message_limit INTEGER NOT NULL DEFAULT 50000,
  max_message_chars INTEGER NOT NULL DEFAULT 4000,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_workspaces_status_created ON workspaces(status, created_at DESC);

CREATE TABLE IF NOT EXISTS workspace_domains (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','blocked')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(workspace_id, domain)
);
CREATE INDEX IF NOT EXISTS idx_workspace_domains_workspace_status ON workspace_domains(workspace_id, status, domain);
CREATE INDEX IF NOT EXISTS idx_workspace_domains_domain ON workspace_domains(domain);

CREATE TABLE IF NOT EXISTS widget_configs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','retired')),
  brand_name TEXT NOT NULL,
  welcome_text TEXT NOT NULL,
  launcher_text TEXT NOT NULL,
  operator_name TEXT NOT NULL,
  primary_color TEXT NOT NULL,
  accent_color TEXT NOT NULL,
  logo_url TEXT,
  settings_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  published_at TEXT,
  UNIQUE(workspace_id, version)
);
CREATE INDEX IF NOT EXISTS idx_widget_configs_workspace_status ON widget_configs(workspace_id, status, version DESC);

CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  scopes_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','revoked')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  last_used_at TEXT,
  expires_at TEXT,
  revoked_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_api_keys_workspace_status ON api_keys(workspace_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash_status ON api_keys(key_hash, status);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'website',
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','pending','closed')),
  subject TEXT,
  visitor_token_hash TEXT,
  external_user_id TEXT,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  source_url TEXT,
  assigned_to TEXT,
  message_count INTEGER NOT NULL DEFAULT 0,
  operator_unread_count INTEGER NOT NULL DEFAULT 0,
  customer_unread_count INTEGER NOT NULL DEFAULT 0,
  last_message_preview TEXT,
  last_message_at TEXT,
  last_message_sort TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_conversations_workspace_last ON conversations(workspace_id, last_message_sort DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_workspace_status_last ON conversations(workspace_id, status, last_message_sort DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_workspace_assigned_last ON conversations(workspace_id, assigned_to, last_message_sort DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_workspace_external_user ON conversations(workspace_id, external_user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_workspace_unread_last ON conversations(workspace_id, operator_unread_count, last_message_sort DESC);

CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('customer','operator','system')),
  display_name TEXT,
  email TEXT,
  external_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_participants_conversation_role ON participants(conversation_id, role);
CREATE INDEX IF NOT EXISTS idx_participants_workspace_external ON participants(workspace_id, external_user_id);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK(sender_role IN ('customer','operator','system')),
  sender_name TEXT,
  body TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  delivered_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_workspace_created ON messages(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_workspace_sender_created ON messages(workspace_id, sender_role, created_at DESC);

CREATE TABLE IF NOT EXISTS message_reads (
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  reader_key TEXT NOT NULL,
  last_read_at TEXT NOT NULL,
  PRIMARY KEY (conversation_id, reader_key)
);
CREATE INDEX IF NOT EXISTS idx_message_reads_workspace ON message_reads(workspace_id, reader_key);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','running','completed','failed','cancelled')),
  requested_by TEXT NOT NULL DEFAULT 'admin',
  payload_json TEXT NOT NULL DEFAULT '{}',
  result_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  started_at TEXT,
  finished_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_jobs_workspace_created ON jobs(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_status_created ON jobs(status, created_at DESC);

CREATE TABLE IF NOT EXISTS job_logs (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL,
  level TEXT NOT NULL DEFAULT 'info' CHECK(level IN ('info','warn','error')),
  message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_job_logs_job_created ON job_logs(job_id, created_at ASC);

CREATE TABLE IF NOT EXISTS releases (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  release_type TEXT NOT NULL,
  version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('draft','published','rolled_back')),
  artifact_ref TEXT,
  created_by TEXT NOT NULL DEFAULT 'admin',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  published_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_releases_workspace_created ON releases(workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL,
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  event_type TEXT NOT NULL,
  body TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_workspace_created ON audit_events(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_event_created ON audit_events(event_type, created_at DESC);

CREATE TABLE IF NOT EXISTS security_events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  reason TEXT NOT NULL,
  origin TEXT,
  ip_hint TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_security_workspace_created ON security_events(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_event_created ON security_events(event_type, created_at DESC);
