ALTER TABLE citadel.apps
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE citadel.app_credentials
  ADD COLUMN IF NOT EXISTS rotated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS rotated_by TEXT NOT NULL DEFAULT 'gateway',
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE citadel.backup_receipts
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE citadel.migration_receipts
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE SCHEMA IF NOT EXISTS self_service;
CREATE SCHEMA IF NOT EXISTS platform;
CREATE SCHEMA IF NOT EXISTS commercial;
CREATE SCHEMA IF NOT EXISTS live_gate;

CREATE TABLE IF NOT EXISTS self_service.projects (
  id BIGSERIAL PRIMARY KEY,
  project_slug TEXT NOT NULL UNIQUE,
  project_name TEXT NOT NULL,
  owner_ref TEXT NOT NULL DEFAULT 'operator',
  status TEXT NOT NULL DEFAULT 'active',
  max_databases INT NOT NULL DEFAULT 5,
  max_query_ms INT NOT NULL DEFAULT 8000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS self_service.project_databases (
  id BIGSERIAL PRIMARY KEY,
  project_slug TEXT NOT NULL REFERENCES self_service.projects(project_slug) ON DELETE CASCADE,
  app_slug TEXT NOT NULL,
  database_name TEXT NOT NULL,
  role_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_slug, app_slug)
);

CREATE TABLE IF NOT EXISTS self_service.query_history (
  id BIGSERIAL PRIMARY KEY,
  project_slug TEXT NOT NULL,
  app_slug TEXT NOT NULL,
  database_name TEXT NOT NULL,
  actor_ref TEXT NOT NULL DEFAULT 'operator',
  sql_preview TEXT NOT NULL,
  statement_kind TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  row_count INT,
  elapsed_ms INT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS self_service.connection_events (
  id BIGSERIAL PRIMARY KEY,
  project_slug TEXT NOT NULL,
  app_slug TEXT NOT NULL,
  event_kind TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform.accounts (
  id BIGSERIAL PRIMARY KEY,
  account_ref TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  upstream_subject TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform.teams (
  id BIGSERIAL PRIMARY KEY,
  team_slug TEXT NOT NULL UNIQUE,
  team_name TEXT NOT NULL,
  owner_account_ref TEXT NOT NULL,
  plan_slug TEXT NOT NULL DEFAULT 'starter',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform.team_members (
  id BIGSERIAL PRIMARY KEY,
  team_slug TEXT NOT NULL REFERENCES platform.teams(team_slug) ON DELETE CASCADE,
  account_ref TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_slug, account_ref)
);

CREATE TABLE IF NOT EXISTS platform.plans (
  plan_slug TEXT PRIMARY KEY,
  plan_name TEXT NOT NULL,
  monthly_price_cents INT NOT NULL DEFAULT 0,
  max_projects INT NOT NULL DEFAULT 1,
  max_databases INT NOT NULL DEFAULT 3,
  max_query_executions_month INT NOT NULL DEFAULT 1000,
  max_storage_mb INT NOT NULL DEFAULT 1024,
  max_team_members INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO platform.plans (plan_slug, plan_name, monthly_price_cents, max_projects, max_databases, max_query_executions_month, max_storage_mb, max_team_members)
VALUES
  ('starter', 'Starter', 4900, 1, 3, 1000, 1024, 1),
  ('business', 'Business', 14900, 5, 20, 25000, 10240, 5),
  ('managed', 'Managed', 49900, 25, 100, 250000, 102400, 25)
ON CONFLICT (plan_slug) DO UPDATE SET
  plan_name = EXCLUDED.plan_name,
  monthly_price_cents = EXCLUDED.monthly_price_cents,
  max_projects = EXCLUDED.max_projects,
  max_databases = EXCLUDED.max_databases,
  max_query_executions_month = EXCLUDED.max_query_executions_month,
  max_storage_mb = EXCLUDED.max_storage_mb,
  max_team_members = EXCLUDED.max_team_members;

CREATE TABLE IF NOT EXISTS platform.project_ownership (
  id BIGSERIAL PRIMARY KEY,
  team_slug TEXT NOT NULL REFERENCES platform.teams(team_slug) ON DELETE CASCADE,
  project_slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_slug, project_slug)
);

CREATE TABLE IF NOT EXISTS platform.usage_snapshots (
  id BIGSERIAL PRIMARY KEY,
  team_slug TEXT NOT NULL,
  project_slug TEXT,
  metric_month TEXT NOT NULL,
  projects_count INT NOT NULL DEFAULT 0,
  databases_count INT NOT NULL DEFAULT 0,
  query_executions INT NOT NULL DEFAULT 0,
  estimated_storage_mb INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform.quota_events (
  id BIGSERIAL PRIMARY KEY,
  team_slug TEXT NOT NULL,
  event_kind TEXT NOT NULL,
  quota_key TEXT NOT NULL,
  current_value INT NOT NULL,
  limit_value INT NOT NULL,
  allowed BOOLEAN NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS commercial.billing_customers (
  id BIGSERIAL PRIMARY KEY,
  account_ref TEXT NOT NULL,
  team_slug TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'stripe',
  provider_customer_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, provider_customer_id),
  UNIQUE(team_slug, provider)
);

CREATE TABLE IF NOT EXISTS commercial.subscriptions (
  id BIGSERIAL PRIMARY KEY,
  team_slug TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'stripe',
  provider_subscription_id TEXT,
  plan_slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'incomplete',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  raw_event JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, provider_subscription_id)
);

CREATE TABLE IF NOT EXISTS commercial.payment_events (
  id BIGSERIAL PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'stripe',
  provider_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  team_slug TEXT,
  account_ref TEXT,
  processed BOOLEAN NOT NULL DEFAULT false,
  raw_event JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, provider_event_id)
);

CREATE TABLE IF NOT EXISTS commercial.entitlement_checks (
  id BIGSERIAL PRIMARY KEY,
  team_slug TEXT NOT NULL,
  allowed BOOLEAN NOT NULL,
  reason TEXT NOT NULL,
  plan_slug TEXT,
  subscription_status TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform.database_branches (
  id BIGSERIAL PRIMARY KEY,
  project_slug TEXT NOT NULL,
  parent_app_slug TEXT NOT NULL,
  branch_slug TEXT NOT NULL,
  target_database_name TEXT NOT NULL,
  source_kind TEXT NOT NULL DEFAULT 'snapshot',
  source_reference TEXT,
  status TEXT NOT NULL DEFAULT 'requested',
  requested_by TEXT NOT NULL DEFAULT 'operator',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error TEXT,
  UNIQUE(project_slug, branch_slug)
);

CREATE TABLE IF NOT EXISTS platform.branch_events (
  id BIGSERIAL PRIMARY KEY,
  project_slug TEXT NOT NULL,
  branch_slug TEXT NOT NULL,
  event_kind TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS live_gate.route_gate_events (
  id BIGSERIAL PRIMARY KEY,
  route_key TEXT NOT NULL,
  team_slug TEXT,
  account_ref TEXT,
  allowed BOOLEAN NOT NULL,
  reason TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS live_gate.usage_events (
  id BIGSERIAL PRIMARY KEY,
  team_slug TEXT,
  project_slug TEXT,
  app_slug TEXT,
  metric_key TEXT NOT NULL,
  metric_value INT NOT NULL DEFAULT 1,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS live_gate.branch_receipts (
  id BIGSERIAL PRIMARY KEY,
  project_slug TEXT NOT NULL,
  branch_slug TEXT NOT NULL,
  parent_app_slug TEXT NOT NULL,
  target_database_name TEXT NOT NULL,
  source_kind TEXT NOT NULL,
  source_reference TEXT,
  status TEXT NOT NULL DEFAULT 'requested',
  receipt_kind TEXT NOT NULL DEFAULT 'branch_request',
  proof JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error TEXT
);

CREATE TABLE IF NOT EXISTS live_gate.live_gate_checks (
  id BIGSERIAL PRIMARY KEY,
  gate_key TEXT NOT NULL,
  status TEXT NOT NULL,
  evidence TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
