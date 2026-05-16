CREATE TABLE IF NOT EXISTS checkout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  plan_code TEXT REFERENCES plans(code),
  provider TEXT NOT NULL DEFAULT 'manual',
  provider_session_id TEXT UNIQUE,
  checkout_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_by_email TEXT,
  raw_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS billing_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_subscription_id TEXT UNIQUE,
  provider_customer_id TEXT,
  plan_code TEXT REFERENCES plans(code),
  status TEXT NOT NULL,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  raw_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sales_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT,
  company TEXT,
  plan_interest TEXT,
  message TEXT,
  source TEXT NOT NULL DEFAULT 'portal',
  status TEXT NOT NULL DEFAULT 'new',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS account_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  lock_type TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_by_email TEXT,
  cleared_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_checkout_sessions_account ON checkout_sessions(account_id);
CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_account ON billing_subscriptions(account_id);
CREATE INDEX IF NOT EXISTS idx_sales_leads_created_at ON sales_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_account_locks_account ON account_locks(account_id);
CREATE INDEX IF NOT EXISTS idx_meter_events_account_type_created ON meter_events(account_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_snapshots_account_measured ON usage_snapshots(account_id, measured_at DESC);

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS external_customer_ref TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS lifecycle_stage TEXT NOT NULL DEFAULT 'customer';
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS suspension_reason TEXT;

UPDATE plans SET monthly_price_cents = 2900, limits_json = '{"users":3,"repos":25,"privateRepos":10,"storageMb":10240,"ciMinutes":500,"packageMb":2048,"support":"email"}'::jsonb WHERE code = 'starter';
UPDATE plans SET monthly_price_cents = 7900, limits_json = '{"users":10,"repos":100,"privateRepos":50,"storageMb":51200,"ciMinutes":2500,"packageMb":10240,"support":"priority"}'::jsonb WHERE code = 'studio';
UPDATE plans SET monthly_price_cents = 19900, limits_json = '{"users":50,"repos":500,"privateRepos":250,"storageMb":256000,"ciMinutes":10000,"packageMb":51200,"support":"priority"}'::jsonb WHERE code = 'agency';
