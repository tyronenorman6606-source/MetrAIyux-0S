CREATE SCHEMA IF NOT EXISTS live_gate;

CREATE TABLE IF NOT EXISTS live_gate.route_gate_events (
  id bigserial PRIMARY KEY,
  route_key text NOT NULL,
  team_slug text,
  account_ref text,
  allowed boolean NOT NULL,
  reason text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS live_gate.usage_events (
  id bigserial PRIMARY KEY,
  team_slug text,
  project_slug text,
  app_slug text,
  metric_key text NOT NULL,
  metric_value int NOT NULL DEFAULT 1,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS live_gate.branch_receipts (
  id bigserial PRIMARY KEY,
  project_slug text NOT NULL,
  branch_slug text NOT NULL,
  parent_app_slug text NOT NULL,
  target_database_name text NOT NULL,
  source_kind text NOT NULL,
  source_reference text,
  status text NOT NULL DEFAULT 'requested',
  receipt_kind text NOT NULL DEFAULT 'branch_request',
  proof jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  error text
);

CREATE TABLE IF NOT EXISTS live_gate.live_gate_checks (
  id bigserial PRIMARY KEY,
  gate_key text NOT NULL,
  status text NOT NULL,
  evidence text,
  created_at timestamptz NOT NULL DEFAULT now()
);
