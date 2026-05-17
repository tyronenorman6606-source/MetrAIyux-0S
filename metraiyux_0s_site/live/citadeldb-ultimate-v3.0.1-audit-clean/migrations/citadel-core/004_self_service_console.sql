CREATE SCHEMA IF NOT EXISTS self_service;

CREATE TABLE IF NOT EXISTS self_service.projects (
  id bigserial PRIMARY KEY,
  project_slug text NOT NULL UNIQUE,
  project_name text NOT NULL,
  owner_ref text NOT NULL DEFAULT 'operator',
  status text NOT NULL DEFAULT 'active',
  max_databases int NOT NULL DEFAULT 5,
  max_query_ms int NOT NULL DEFAULT 8000,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS self_service.project_databases (
  id bigserial PRIMARY KEY,
  project_slug text NOT NULL REFERENCES self_service.projects(project_slug) ON DELETE CASCADE,
  app_slug text NOT NULL,
  database_name text NOT NULL,
  role_name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_slug, app_slug)
);

CREATE TABLE IF NOT EXISTS self_service.query_history (
  id bigserial PRIMARY KEY,
  project_slug text NOT NULL,
  app_slug text NOT NULL,
  database_name text NOT NULL,
  actor_ref text NOT NULL DEFAULT 'operator',
  sql_preview text NOT NULL,
  statement_kind text NOT NULL,
  success boolean NOT NULL,
  row_count int,
  elapsed_ms int,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS self_service.connection_events (
  id bigserial PRIMARY KEY,
  project_slug text NOT NULL,
  app_slug text NOT NULL,
  event_kind text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
