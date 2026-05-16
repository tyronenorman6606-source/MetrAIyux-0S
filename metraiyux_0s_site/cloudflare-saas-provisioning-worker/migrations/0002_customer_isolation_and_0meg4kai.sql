ALTER TABLE customer_commands ADD COLUMN omega_review TEXT DEFAULT '{}';

CREATE TABLE IF NOT EXISTS customer_security_reviews (
  id TEXT PRIMARY KEY,
  workspace_id TEXT,
  command_id TEXT,
  reviewer TEXT NOT NULL DEFAULT '0meg4kAI',
  decision TEXT NOT NULL,
  findings TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tenant_isolation_receipts (
  id TEXT PRIMARY KEY,
  workspace_id TEXT,
  boundary TEXT NOT NULL,
  result TEXT NOT NULL,
  evidence TEXT,
  created_at TEXT NOT NULL
);
