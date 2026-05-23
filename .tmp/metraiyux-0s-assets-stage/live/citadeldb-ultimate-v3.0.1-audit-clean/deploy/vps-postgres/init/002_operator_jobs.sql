CREATE TABLE IF NOT EXISTS citadel.operator_jobs (
  id BIGSERIAL PRIMARY KEY,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  requested_by TEXT NOT NULL DEFAULT 'operator',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  claimed_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 1,
  receipt_path TEXT,
  output_tail TEXT,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_operator_jobs_status_requested
  ON citadel.operator_jobs (status, requested_at ASC);

CREATE INDEX IF NOT EXISTS idx_operator_jobs_type_requested
  ON citadel.operator_jobs (job_type, requested_at DESC);

CREATE TABLE IF NOT EXISTS citadel.command_receipts (
  id BIGSERIAL PRIMARY KEY,
  job_id BIGINT REFERENCES citadel.operator_jobs(id) ON DELETE SET NULL,
  command_name TEXT NOT NULL,
  receipt_path TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  checksum TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_command_receipts_created_at
  ON citadel.command_receipts (created_at DESC);
