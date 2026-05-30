CREATE TABLE IF NOT EXISTS merchant_payout_profiles (
  id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL UNIQUE,
  legal_name TEXT NOT NULL DEFAULT '',
  business_name TEXT NOT NULL DEFAULT '',
  agreement_status TEXT NOT NULL DEFAULT 'not_started',
  agreement_reference TEXT NOT NULL DEFAULT '',
  tax_profile_status TEXT NOT NULL DEFAULT 'not_started',
  payout_status TEXT NOT NULL DEFAULT 'not_ready',
  primary_method_id TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS merchant_payout_methods (
  id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL,
  profile_id TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'paypal',
  label TEXT NOT NULL DEFAULT '',
  handle TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone_last4 TEXT NOT NULL DEFAULT '',
  account_last4 TEXT NOT NULL DEFAULT '',
  routing_last4 TEXT NOT NULL DEFAULT '',
  instructions_json TEXT NOT NULL DEFAULT '{}',
  verified INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_merchant_payout_methods_merchant_active ON merchant_payout_methods (merchant_id, active, created_at DESC);

CREATE TABLE IF NOT EXISTS merchant_payout_disbursements (
  id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL,
  ledger_id TEXT NOT NULL,
  method_id TEXT NOT NULL DEFAULT '',
  provider TEXT NOT NULL DEFAULT 'internal_skyepay',
  amount_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'queued',
  external_reference TEXT NOT NULL DEFAULT '',
  operator_note TEXT NOT NULL DEFAULT '',
  provider_payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at TEXT,
  FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE,
  FOREIGN KEY (ledger_id) REFERENCES merchant_payout_ledger(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_merchant_payout_disbursements_merchant_status ON merchant_payout_disbursements (merchant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_merchant_payout_disbursements_ledger ON merchant_payout_disbursements (ledger_id);
