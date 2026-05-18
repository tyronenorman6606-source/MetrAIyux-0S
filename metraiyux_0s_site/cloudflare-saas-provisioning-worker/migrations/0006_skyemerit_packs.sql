CREATE TABLE IF NOT EXISTS skyemerit_packs (
  id TEXT PRIMARY KEY,
  pack_id TEXT NOT NULL,
  customer_id TEXT,
  workspace_id TEXT,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'issued',
  kaixu_credit_cents INTEGER NOT NULL DEFAULT 600,
  coupon_codes TEXT,
  delivery TEXT,
  payload TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_skyemerit_packs_email ON skyemerit_packs(email);
CREATE INDEX IF NOT EXISTS idx_skyemerit_packs_customer ON skyemerit_packs(customer_id);
CREATE INDEX IF NOT EXISTS idx_skyemerit_packs_workspace ON skyemerit_packs(workspace_id);
