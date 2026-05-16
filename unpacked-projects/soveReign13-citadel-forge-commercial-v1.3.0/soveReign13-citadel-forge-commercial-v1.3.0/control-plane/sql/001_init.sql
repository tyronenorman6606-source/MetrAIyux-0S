CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS plans (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  monthly_price_cents INTEGER NOT NULL DEFAULT 0,
  limits_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  plan_code TEXT NOT NULL REFERENCES plans(code),
  billing_status TEXT NOT NULL DEFAULT 'manual',
  stripe_customer_id TEXT,
  forgejo_org TEXT UNIQUE,
  owner_email TEXT NOT NULL,
  owner_username TEXT NOT NULL,
  upstream_subject TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  provision_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS account_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  username TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'owner',
  upstream_subject TEXT,
  forgejo_username TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(account_id, email)
);

CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'developer',
  invited_by_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS usage_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT NOT NULL DEFAULT 'forgejo-api',
  user_count INTEGER NOT NULL DEFAULT 0,
  repo_count INTEGER NOT NULL DEFAULT 0,
  private_repo_count INTEGER NOT NULL DEFAULT 0,
  repo_size_kb BIGINT NOT NULL DEFAULT 0,
  package_count INTEGER NOT NULL DEFAULT 0,
  ci_minutes INTEGER NOT NULL DEFAULT 0,
  raw_json JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS meter_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'count',
  source TEXT NOT NULL DEFAULT 'control-plane',
  idempotency_key TEXT UNIQUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  created_by_email TEXT NOT NULL,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_email TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  ip INET,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  provider_event_id TEXT UNIQUE,
  event_type TEXT NOT NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  raw_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO plans(code, name, monthly_price_cents, limits_json, is_public)
VALUES
  ('free', 'Free Foundry', 0, '{"users":1,"repos":3,"privateRepos":1,"storageMb":512,"ciMinutes":0,"packageMb":128,"support":"community"}', true),
  ('starter', 'Starter Forge', 1900, '{"users":3,"repos":25,"privateRepos":10,"storageMb":10240,"ciMinutes":500,"packageMb":2048,"support":"email"}', true),
  ('studio', 'Studio Forge', 4900, '{"users":10,"repos":100,"privateRepos":50,"storageMb":51200,"ciMinutes":2500,"packageMb":10240,"support":"priority"}', true),
  ('agency', 'Agency Citadel', 14900, '{"users":50,"repos":500,"privateRepos":250,"storageMb":256000,"ciMinutes":10000,"packageMb":51200,"support":"priority"}', true),
  ('enterprise', 'Enterprise Sovereign', 0, '{"users":"custom","repos":"custom","privateRepos":"custom","storageMb":"custom","ciMinutes":"custom","packageMb":"custom","support":"SLA"}', false)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  monthly_price_cents = EXCLUDED.monthly_price_cents,
  limits_json = EXCLUDED.limits_json,
  is_public = EXCLUDED.is_public,
  updated_at = now();
