CREATE TABLE IF NOT EXISTS citadel.tenants (
  id BIGSERIAL PRIMARY KEY,
  tenant_slug TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  owner_contact TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS citadel.app_environments (
  id BIGSERIAL PRIMARY KEY,
  app_slug TEXT NOT NULL REFERENCES citadel.apps(app_slug) ON DELETE CASCADE,
  tenant_slug TEXT REFERENCES citadel.tenants(tenant_slug) ON DELETE SET NULL,
  environment TEXT NOT NULL DEFAULT 'production',
  database_name TEXT NOT NULL,
  role_name TEXT NOT NULL,
  connection_host TEXT,
  connection_port INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active',
  UNIQUE(app_slug, environment)
);

CREATE TABLE IF NOT EXISTS citadel.policy_findings (
  id BIGSERIAL PRIMARY KEY,
  policy_name TEXT NOT NULL,
  severity TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  target TEXT,
  detail TEXT NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_policy_findings_status_severity
  ON citadel.policy_findings (status, severity, detected_at DESC);

CREATE TABLE IF NOT EXISTS citadel.cutover_receipts (
  id BIGSERIAL PRIMARY KEY,
  app_slug TEXT NOT NULL,
  source_provider TEXT NOT NULL,
  target_engine TEXT NOT NULL,
  source_dump_path TEXT,
  verification_path TEXT,
  rollback_receipt_path TEXT,
  status TEXT NOT NULL DEFAULT 'planned',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_cutover_receipts_app_started
  ON citadel.cutover_receipts (app_slug, started_at DESC);
