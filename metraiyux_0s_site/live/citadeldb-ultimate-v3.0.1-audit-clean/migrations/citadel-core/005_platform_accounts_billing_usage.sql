CREATE SCHEMA IF NOT EXISTS platform;

CREATE TABLE IF NOT EXISTS platform.accounts (
  id bigserial PRIMARY KEY,
  account_ref text NOT NULL UNIQUE,
  display_name text NOT NULL,
  email text,
  status text NOT NULL DEFAULT 'active',
  upstream_subject text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform.teams (
  id bigserial PRIMARY KEY,
  team_slug text NOT NULL UNIQUE,
  team_name text NOT NULL,
  owner_account_ref text NOT NULL,
  plan_slug text NOT NULL DEFAULT 'starter',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform.team_members (
  id bigserial PRIMARY KEY,
  team_slug text NOT NULL REFERENCES platform.teams(team_slug) ON DELETE CASCADE,
  account_ref text NOT NULL,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(team_slug, account_ref)
);

CREATE TABLE IF NOT EXISTS platform.plans (
  plan_slug text PRIMARY KEY,
  plan_name text NOT NULL,
  monthly_price_cents int NOT NULL DEFAULT 0,
  max_projects int NOT NULL DEFAULT 1,
  max_databases int NOT NULL DEFAULT 3,
  max_query_executions_month int NOT NULL DEFAULT 1000,
  max_storage_mb int NOT NULL DEFAULT 1024,
  max_team_members int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO platform.plans (plan_slug, plan_name, monthly_price_cents, max_projects, max_databases, max_query_executions_month, max_storage_mb, max_team_members)
VALUES
  ('starter', 'Starter', 0, 1, 3, 1000, 1024, 1),
  ('operator', 'Operator', 2900, 5, 20, 25000, 10240, 5),
  ('sovereign', 'Sovereign', 9900, 25, 100, 250000, 102400, 25)
ON CONFLICT (plan_slug) DO UPDATE SET
  plan_name = EXCLUDED.plan_name,
  monthly_price_cents = EXCLUDED.monthly_price_cents,
  max_projects = EXCLUDED.max_projects,
  max_databases = EXCLUDED.max_databases,
  max_query_executions_month = EXCLUDED.max_query_executions_month,
  max_storage_mb = EXCLUDED.max_storage_mb,
  max_team_members = EXCLUDED.max_team_members;

CREATE TABLE IF NOT EXISTS platform.project_ownership (
  id bigserial PRIMARY KEY,
  team_slug text NOT NULL REFERENCES platform.teams(team_slug) ON DELETE CASCADE,
  project_slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(team_slug, project_slug)
);

CREATE TABLE IF NOT EXISTS platform.usage_snapshots (
  id bigserial PRIMARY KEY,
  team_slug text NOT NULL,
  project_slug text,
  metric_month text NOT NULL,
  projects_count int NOT NULL DEFAULT 0,
  databases_count int NOT NULL DEFAULT 0,
  query_executions int NOT NULL DEFAULT 0,
  estimated_storage_mb int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform.quota_events (
  id bigserial PRIMARY KEY,
  team_slug text NOT NULL,
  event_kind text NOT NULL,
  quota_key text NOT NULL,
  current_value int NOT NULL,
  limit_value int NOT NULL,
  allowed boolean NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
