-- SKYESOVERLONDON DocuMorph (Neon/Postgres)
-- Run this once in Neon SQL Editor (optional). The function will also auto-create it.

CREATE TABLE IF NOT EXISTS documorph_documents (
  id uuid PRIMARY KEY,
  client_id text NOT NULL,
  file_name text NOT NULL,
  upload_date timestamptz NOT NULL DEFAULT now(),
  stats jsonb NOT NULL,
  summary text,
  sections jsonb NOT NULL,
  flashcards jsonb NOT NULL,
  questions jsonb NOT NULL,
  raw_text text NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_documorph_client_date
  ON documorph_documents (client_id, upload_date DESC);
