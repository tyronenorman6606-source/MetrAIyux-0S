CREATE SCHEMA IF NOT EXISTS commercial;

CREATE TABLE IF NOT EXISTS commercial.billing_customers (
  id bigserial PRIMARY KEY,
  account_ref text NOT NULL,
  team_slug text NOT NULL,
  provider text NOT NULL DEFAULT 'stripe',
  provider_customer_id text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider, provider_customer_id),
  UNIQUE(team_slug, provider)
);

CREATE TABLE IF NOT EXISTS commercial.subscriptions (
  id bigserial PRIMARY KEY,
  team_slug text NOT NULL,
  provider text NOT NULL DEFAULT 'stripe',
  provider_subscription_id text,
  plan_slug text NOT NULL,
  status text NOT NULL DEFAULT 'incomplete',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  raw_event jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider, provider_subscription_id)
);

CREATE TABLE IF NOT EXISTS commercial.payment_events (
  id bigserial PRIMARY KEY,
  provider text NOT NULL DEFAULT 'stripe',
  provider_event_id text NOT NULL,
  event_type text NOT NULL,
  team_slug text,
  account_ref text,
  processed boolean NOT NULL DEFAULT false,
  raw_event jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider, provider_event_id)
);

CREATE TABLE IF NOT EXISTS commercial.entitlement_checks (
  id bigserial PRIMARY KEY,
  team_slug text NOT NULL,
  allowed boolean NOT NULL,
  reason text NOT NULL,
  plan_slug text,
  subscription_status text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform.database_branches (
  id bigserial PRIMARY KEY,
  project_slug text NOT NULL,
  parent_app_slug text NOT NULL,
  branch_slug text NOT NULL,
  target_database_name text NOT NULL,
  source_kind text NOT NULL DEFAULT 'snapshot',
  source_reference text,
  status text NOT NULL DEFAULT 'requested',
  requested_by text NOT NULL DEFAULT 'operator',
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  error text,
  UNIQUE(project_slug, branch_slug)
);

CREATE TABLE IF NOT EXISTS platform.branch_events (
  id bigserial PRIMARY KEY,
  project_slug text NOT NULL,
  branch_slug text NOT NULL,
  event_kind text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
