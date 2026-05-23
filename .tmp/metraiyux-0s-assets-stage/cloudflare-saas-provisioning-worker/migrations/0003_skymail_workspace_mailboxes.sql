CREATE TABLE IF NOT EXISTS workspace_mailboxes (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'skymail',
  mailbox_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  provisioning_status TEXT NOT NULL DEFAULT 'unknown',
  skymail_user_id TEXT,
  skymail_mailbox_id TEXT,
  inbox_ready INTEGER NOT NULL DEFAULT 0,
  provider_ready INTEGER NOT NULL DEFAULT 0,
  key_state TEXT DEFAULT '{}',
  payload TEXT DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(workspace_id) REFERENCES workspaces(id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_mailboxes_workspace_created
  ON workspace_mailboxes(workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workspace_mailboxes_email
  ON workspace_mailboxes(mailbox_email);
