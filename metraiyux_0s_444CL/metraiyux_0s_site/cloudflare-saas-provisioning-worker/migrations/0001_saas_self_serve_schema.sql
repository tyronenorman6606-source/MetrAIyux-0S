CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  company_name TEXT NOT NULL,
  phone TEXT,
  plan_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'signup_received',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  company_name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  plan_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_provisioning',
  approval_email TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(customer_id) REFERENCES customers(id)
);
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  workspace_id TEXT,
  plan_id TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'manual_or_stripe',
  provider_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'intent_created',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS workspace_services (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  service_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'selected',
  created_at TEXT NOT NULL,
  FOREIGN KEY(workspace_id) REFERENCES workspaces(id)
);
CREATE TABLE IF NOT EXISTS provisioning_events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload TEXT,
  status TEXT NOT NULL DEFAULT 'recorded',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS customer_commands (
  id TEXT PRIMARY KEY,
  workspace_id TEXT,
  command_text TEXT NOT NULL,
  primary_brain TEXT,
  secondary_brain TEXT,
  approval_required INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'queued',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS connector_configs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  connector_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_connected',
  config_label TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  payload TEXT,
  created_at TEXT NOT NULL
);
