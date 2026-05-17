CREATE TABLE IF NOT EXISTS smoke_records (
  id BIGSERIAL PRIMARY KEY,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO smoke_records (note)
VALUES ('citadeldb smoke migration ran')
ON CONFLICT DO NOTHING;
