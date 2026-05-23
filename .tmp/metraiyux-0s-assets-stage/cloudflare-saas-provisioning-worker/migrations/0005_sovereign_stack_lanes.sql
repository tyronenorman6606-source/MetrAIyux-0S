ALTER TABLE workspaces ADD COLUMN database_lane TEXT DEFAULT 'citadeldb_or_neon_owner_choice';
ALTER TABLE workspaces ADD COLUMN vault_lane TEXT DEFAULT 'skyevault';
ALTER TABLE workspaces ADD COLUMN mail_lane TEXT DEFAULT 'skyemail';

CREATE TABLE IF NOT EXISTS workspace_stack_lanes (
  workspace_id TEXT PRIMARY KEY,
  customer_id TEXT,
  plan_id TEXT,
  database_lane TEXT NOT NULL DEFAULT 'citadeldb_or_neon_owner_choice',
  vault_lane TEXT NOT NULL DEFAULT 'skyevault',
  mail_lane TEXT NOT NULL DEFAULT 'skyemail',
  fs27_event_mirror INTEGER NOT NULL DEFAULT 0,
  payload TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(workspace_id) REFERENCES workspaces(id)
);

CREATE INDEX IF NOT EXISTS workspace_stack_lanes_database_idx ON workspace_stack_lanes(database_lane);
CREATE INDEX IF NOT EXISTS workspace_stack_lanes_vault_idx ON workspace_stack_lanes(vault_lane);
CREATE INDEX IF NOT EXISTS workspace_stack_lanes_mail_idx ON workspace_stack_lanes(mail_lane);
