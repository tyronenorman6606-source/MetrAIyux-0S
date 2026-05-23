CREATE SCHEMA IF NOT EXISTS citadel;

CREATE TABLE IF NOT EXISTS citadel.apps (
  id BIGSERIAL PRIMARY KEY,
  app_slug TEXT NOT NULL UNIQUE,
  database_name TEXT NOT NULL UNIQUE,
  role_name TEXT NOT NULL UNIQUE,
  engine TEXT NOT NULL DEFAULT 'vps-postgres',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT
);

CREATE TABLE IF NOT EXISTS citadel.app_credentials (
  id BIGSERIAL PRIMARY KEY,
  app_slug TEXT NOT NULL REFERENCES citadel.apps(app_slug) ON DELETE CASCADE,
  role_name TEXT NOT NULL,
  secret_hint TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rotated_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS citadel.migration_receipts (
  id BIGSERIAL PRIMARY KEY,
  app_slug TEXT NOT NULL,
  database_name TEXT NOT NULL,
  migration_file TEXT NOT NULL,
  checksum TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  success BOOLEAN NOT NULL,
  error TEXT
);

CREATE TABLE IF NOT EXISTS citadel.backup_receipts (
  id BIGSERIAL PRIMARY KEY,
  backup_kind TEXT NOT NULL,
  backup_path TEXT NOT NULL,
  database_name TEXT NOT NULL,
  size_bytes BIGINT,
  checksum TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  restore_tested_at TIMESTAMPTZ,
  restore_test_status TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS citadel.restore_receipts (
  id BIGSERIAL PRIMARY KEY,
  backup_checksum TEXT,
  source_backup_path TEXT NOT NULL,
  target_database TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  success BOOLEAN NOT NULL DEFAULT false,
  error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS citadel.audit_events (
  id BIGSERIAL PRIMARY KEY,
  actor TEXT NOT NULL DEFAULT 'system',
  action TEXT NOT NULL,
  target TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_citadel_audit_events_created_at
  ON citadel.audit_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_citadel_migration_receipts_app
  ON citadel.migration_receipts (app_slug, applied_at DESC);

CREATE INDEX IF NOT EXISTS idx_citadel_backup_receipts_created_at
  ON citadel.backup_receipts (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_citadel_restore_receipts_started_at
  ON citadel.restore_receipts (started_at DESC);
