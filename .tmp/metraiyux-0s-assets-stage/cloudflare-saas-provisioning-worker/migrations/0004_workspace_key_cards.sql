CREATE TABLE IF NOT EXISTS workspace_key_cards (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  customer_id TEXT,
  card_type TEXT NOT NULL DEFAULT 'skymail_vault_key_card',
  recipient_email TEXT,
  display_name TEXT,
  mailbox_email TEXT,
  setup_url TEXT,
  recovery_policy TEXT NOT NULL DEFAULT 'client_managed_optional_admin_recovery',
  status TEXT NOT NULL DEFAULT 'issued',
  mdp_status TEXT NOT NULL DEFAULT 'not_configured',
  mdp_response TEXT DEFAULT '{}',
  payload TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(workspace_id) REFERENCES workspaces(id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_key_cards_workspace_created
  ON workspace_key_cards(workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workspace_key_cards_email
  ON workspace_key_cards(recipient_email);
