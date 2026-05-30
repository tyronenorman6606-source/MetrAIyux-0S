CREATE TABLE IF NOT EXISTS merchant_payout_ledger (
  id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  payment_transaction_id TEXT NOT NULL DEFAULT '',
  provider TEXT NOT NULL DEFAULT 'skyepay',
  provider_reference TEXT NOT NULL DEFAULT '',
  gross_cents INTEGER NOT NULL DEFAULT 0,
  platform_fee_bps INTEGER NOT NULL DEFAULT 0,
  platform_fee_cents INTEGER NOT NULL DEFAULT 0,
  merchant_receivable_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending_payment',
  payout_reference TEXT NOT NULL DEFAULT '',
  meta_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at TEXT,
  FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  UNIQUE (merchant_id, order_id)
);

CREATE INDEX IF NOT EXISTS idx_merchant_payout_ledger_merchant_created ON merchant_payout_ledger (merchant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_merchant_payout_ledger_status ON merchant_payout_ledger (merchant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_merchant_payout_ledger_payment_ref ON merchant_payout_ledger (provider, provider_reference);
