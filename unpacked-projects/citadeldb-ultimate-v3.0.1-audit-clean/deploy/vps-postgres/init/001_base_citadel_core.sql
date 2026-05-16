CREATE SCHEMA IF NOT EXISTS citadel;

CREATE TABLE IF NOT EXISTS citadel.apps (
  id bigserial PRIMARY KEY,
  app_slug text NOT NULL UNIQUE,
  database_name text NOT NULL UNIQUE,
  role_name text NOT NULL UNIQUE,
  engine text NOT NULL DEFAULT 'vps-postgres',
  status text NOT NULL DEFAULT 'active',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS citadel.app_credentials (
  id bigserial PRIMARY KEY,
  app_slug text NOT NULL REFERENCES citadel.apps(app_slug) ON DELETE CASCADE,
  role_name text NOT NULL,
  secret_hint text,
  rotated_at timestamptz NOT NULL DEFAULT now(),
  rotated_by text NOT NULL DEFAULT 'gateway',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS citadel.backup_receipts (
  id bigserial PRIMARY KEY,
  backup_kind text NOT NULL,
  backup_path text NOT NULL,
  database_name text NOT NULL,
  size_bytes bigint,
  checksum text,
  notes text,
  restore_tested_at timestamptz,
  restore_test_status text NOT NULL DEFAULT 'not_tested',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS citadel.restore_receipts (
  id bigserial PRIMARY KEY,
  backup_checksum text,
  source_backup_path text NOT NULL,
  target_database text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  success boolean NOT NULL DEFAULT false,
  error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS citadel.migration_receipts (
  id bigserial PRIMARY KEY,
  app_slug text NOT NULL,
  database_name text NOT NULL,
  migration_file text NOT NULL,
  checksum text NOT NULL,
  success boolean NOT NULL DEFAULT false,
  error text,
  applied_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS citadel.audit_events (
  id bigserial PRIMARY KEY,
  actor text NOT NULL DEFAULT 'gateway',
  action text NOT NULL,
  target text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_citadel_audit_events_created_at ON citadel.audit_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_citadel_apps_slug ON citadel.apps(app_slug);
CREATE INDEX IF NOT EXISTS idx_citadel_backup_receipts_database ON citadel.backup_receipts(database_name);
CREATE INDEX IF NOT EXISTS idx_citadel_restore_receipts_target ON citadel.restore_receipts(target_database);
