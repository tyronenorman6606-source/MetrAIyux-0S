CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','archived')),
  plan text NOT NULL DEFAULT 'provided-infrastructure',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workspace_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'operator' CHECK (role IN ('owner','admin','operator','viewer')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz,
  UNIQUE(workspace_id, email)
);

CREATE INDEX IF NOT EXISTS workspace_users_workspace_role_idx ON workspace_users(workspace_id, role);
CREATE INDEX IF NOT EXISTS workspace_users_email_idx ON workspace_users(lower(email));

CREATE TABLE IF NOT EXISTS workspace_settings (
  workspace_id uuid PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  branding jsonb NOT NULL DEFAULT '{}'::jsonb,
  app_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  security_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES workspace_users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workspace_states (
  workspace_id uuid PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  state_hash text,
  revision bigint NOT NULL DEFAULT 1,
  updated_by uuid REFERENCES workspace_users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attendees (
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  attendee_id text NOT NULL,
  event_id text,
  email text,
  name text,
  checked_in_at timestamptz,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(workspace_id, attendee_id)
);

CREATE INDEX IF NOT EXISTS attendees_workspace_email_idx ON attendees(workspace_id, email);
CREATE INDEX IF NOT EXISTS attendees_workspace_checked_idx ON attendees(workspace_id, checked_in_at DESC);

CREATE TABLE IF NOT EXISTS workspace_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid REFERENCES workspace_users(id) ON DELETE SET NULL,
  action text NOT NULL,
  detail text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_hash text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workspace_audit_workspace_created_idx ON workspace_audit_events(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS workspace_audit_action_idx ON workspace_audit_events(workspace_id, action, created_at DESC);

CREATE TABLE IF NOT EXISTS workspace_login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_slug text NOT NULL,
  email text NOT NULL,
  ip_hash text,
  ok boolean NOT NULL DEFAULT false,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workspace_login_attempts_guard_idx ON workspace_login_attempts(workspace_slug, email, ip_hash, created_at DESC);

CREATE TABLE IF NOT EXISTS workspace_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'operator' CHECK (role IN ('owner','admin','operator','viewer')),
  token_hash text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked','expired')),
  invited_by uuid REFERENCES workspace_users(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days',
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz
);

CREATE INDEX IF NOT EXISTS workspace_invites_workspace_idx ON workspace_invites(workspace_id, status, expires_at DESC);

CREATE TABLE IF NOT EXISTS workspace_backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  backup_type text NOT NULL DEFAULT 'sync' CHECK (backup_type IN ('sync','manual','operator','import')),
  state_hash text NOT NULL,
  state jsonb NOT NULL,
  created_by uuid REFERENCES workspace_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workspace_backups_workspace_created_idx ON workspace_backups(workspace_id, created_at DESC);

-- Runtime tenant isolation is enforced in Netlify Functions by binding all workspace reads/writes to session.workspace.id.
-- These RLS policies provide a second database-side guard when app.current_workspace_id is set by any future direct SQL path.
ALTER TABLE attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_backups ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'attendees' AND policyname = 'attendees_workspace_scope') THEN
    CREATE POLICY attendees_workspace_scope ON attendees
      USING (workspace_id::text = current_setting('app.current_workspace_id', true))
      WITH CHECK (workspace_id::text = current_setting('app.current_workspace_id', true));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workspace_states' AND policyname = 'workspace_states_scope') THEN
    CREATE POLICY workspace_states_scope ON workspace_states
      USING (workspace_id::text = current_setting('app.current_workspace_id', true))
      WITH CHECK (workspace_id::text = current_setting('app.current_workspace_id', true));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workspace_settings' AND policyname = 'workspace_settings_scope') THEN
    CREATE POLICY workspace_settings_scope ON workspace_settings
      USING (workspace_id::text = current_setting('app.current_workspace_id', true))
      WITH CHECK (workspace_id::text = current_setting('app.current_workspace_id', true));
  END IF;
END $$;


CREATE OR REPLACE VIEW workspace_operational_summary AS
SELECT
  w.id AS workspace_id,
  w.slug,
  w.name,
  w.status,
  w.plan,
  count(DISTINCT u.id) AS user_count,
  count(DISTINCT a.attendee_id) AS attendee_count,
  max(ws.updated_at) AS state_updated_at,
  max(w.updated_at) AS workspace_updated_at
FROM workspaces w
LEFT JOIN workspace_users u ON u.workspace_id = w.id
LEFT JOIN attendees a ON a.workspace_id = w.id
LEFT JOIN workspace_states ws ON ws.workspace_id = w.id
GROUP BY w.id;
