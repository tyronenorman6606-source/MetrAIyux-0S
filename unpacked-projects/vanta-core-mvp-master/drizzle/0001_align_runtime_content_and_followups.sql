ALTER TABLE "content_ideas"
  ADD COLUMN IF NOT EXISTS "source_id" uuid,
  ADD COLUMN IF NOT EXISTS "source_type" text,
  ADD COLUMN IF NOT EXISTS "quality_score" integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "approved_at" timestamp,
  ADD COLUMN IF NOT EXISTS "published_at" timestamp,
  ADD COLUMN IF NOT EXISTS "approved_by" uuid;

ALTER TABLE "followup_events"
  ALTER COLUMN "lead_id" DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS "contact_id" uuid;
