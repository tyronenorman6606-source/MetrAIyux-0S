ALTER TABLE "audit_logs"
  ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;

CREATE TABLE IF NOT EXISTS "competitor_monitors" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "competitor_name" text NOT NULL,
  "url" text,
  "type" text NOT NULL,
  "last_value" text,
  "status" text DEFAULT 'active' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "lead_exchange" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "lead_id" uuid NOT NULL REFERENCES "leads"("id"),
  "status" text DEFAULT 'available' NOT NULL,
  "price" numeric(10, 2) NOT NULL,
  "reserve_price" numeric(10, 2),
  "close_probability" numeric(3, 2),
  "dynamic_score" integer,
  "buyer_confidence" numeric(3, 2),
  "anonymized_data" jsonb NOT NULL,
  "metadata" jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "lead_trade_transactions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "exchange_id" uuid NOT NULL REFERENCES "lead_exchange"("id"),
  "buyer_tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "amount" numeric(10, 2) NOT NULL,
  "success_fee" numeric(10, 2) NOT NULL,
  "status" text DEFAULT 'escrow' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "escrow_ledger" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "transaction_id" uuid REFERENCES "lead_trade_transactions"("id"),
  "type" text NOT NULL,
  "amount" numeric(10, 2) NOT NULL,
  "description" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);
