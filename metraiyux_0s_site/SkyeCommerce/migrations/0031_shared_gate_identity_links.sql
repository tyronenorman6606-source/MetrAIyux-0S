CREATE TABLE IF NOT EXISTS shared_gate_identity_links (
  id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL,
  gate_email TEXT NOT NULL,
  fs27_sub TEXT NOT NULL DEFAULT '',
  fs27_customer_id TEXT NOT NULL DEFAULT '',
  workspace_id TEXT NOT NULL DEFAULT '',
  local_merchant_email TEXT NOT NULL DEFAULT '',
  actor_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE,
  UNIQUE (merchant_id, gate_email)
);

CREATE INDEX IF NOT EXISTS idx_shared_gate_identity_links_gate_email
  ON shared_gate_identity_links (gate_email);

CREATE INDEX IF NOT EXISTS idx_shared_gate_identity_links_fs27_sub
  ON shared_gate_identity_links (fs27_sub);
