PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS workspace_guardrails (
  workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused')),
  ai_mode TEXT NOT NULL DEFAULT 'draft_only' CHECK(ai_mode IN ('off','draft_only','auto_reply')),
  allow_ai_auto_reply INTEGER NOT NULL DEFAULT 0 CHECK(allow_ai_auto_reply IN (0,1)),
  allow_web_search INTEGER NOT NULL DEFAULT 0 CHECK(allow_web_search IN (0,1)),
  allow_file_search INTEGER NOT NULL DEFAULT 0 CHECK(allow_file_search IN (0,1)),
  max_ai_input_tokens INTEGER NOT NULL DEFAULT 8000,
  max_ai_output_tokens INTEGER NOT NULL DEFAULT 700,
  monthly_ai_reply_limit INTEGER NOT NULL DEFAULT 1000,
  per_ip_message_window_minutes INTEGER NOT NULL DEFAULT 10,
  per_ip_message_limit INTEGER NOT NULL DEFAULT 24,
  per_ip_conversation_limit INTEGER NOT NULL DEFAULT 8,
  max_links_per_message INTEGER NOT NULL DEFAULT 2,
  blocked_terms_json TEXT NOT NULL DEFAULT '[]',
  app_knowledge_json TEXT NOT NULL DEFAULT '{}',
  escalation_rules_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_workspace_guardrails_status ON workspace_guardrails(status, ai_mode);

CREATE TABLE IF NOT EXISTS guardrail_events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL,
  conversation_id TEXT REFERENCES conversations(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK(severity IN ('info','low','medium','high')),
  decision TEXT NOT NULL DEFAULT 'allow' CHECK(decision IN ('allow','review','block')),
  reason TEXT NOT NULL,
  origin TEXT,
  ip_hash TEXT,
  message_hash TEXT,
  route TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_guardrail_events_workspace_created ON guardrail_events(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guardrail_events_workspace_decision_created ON guardrail_events(workspace_id, decision, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guardrail_events_workspace_ip_created ON guardrail_events(workspace_id, ip_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guardrail_events_workspace_type_created ON guardrail_events(workspace_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guardrail_events_conversation_created ON guardrail_events(conversation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ai_usage_ledger (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL,
  conversation_id TEXT REFERENCES conversations(id) ON DELETE SET NULL,
  message_id TEXT REFERENCES messages(id) ON DELETE SET NULL,
  account_code TEXT,
  model TEXT NOT NULL,
  ai_mode TEXT NOT NULL DEFAULT 'draft_only',
  status TEXT NOT NULL DEFAULT 'recorded' CHECK(status IN ('recorded','blocked','drafted','sent','failed')),
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_cost_usd REAL NOT NULL DEFAULT 0,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_ai_usage_workspace_created ON ai_usage_ledger(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_workspace_status_created ON ai_usage_ledger(workspace_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_conversation_created ON ai_usage_ledger(conversation_id, created_at DESC);
