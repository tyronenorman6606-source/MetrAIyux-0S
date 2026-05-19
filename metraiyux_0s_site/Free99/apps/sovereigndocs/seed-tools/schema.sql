CREATE TABLE IF NOT EXISTS sovereigndocs_categories (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  template_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sovereigndocs_jurisdictions (
  jurisdiction_id TEXT PRIMARY KEY,
  country TEXT NOT NULL,
  state_code TEXT NOT NULL,
  state_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sovereigndocs_templates (
  id TEXT PRIMARY KEY,
  base_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  category_slug TEXT NOT NULL REFERENCES sovereigndocs_categories(slug),
  category_name TEXT NOT NULL,
  jurisdiction_id TEXT NOT NULL REFERENCES sovereigndocs_jurisdictions(jurisdiction_id),
  state_code TEXT NOT NULL,
  state_name TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  status TEXT NOT NULL,
  checksum TEXT NOT NULL,
  path TEXT NOT NULL,
  record JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sovereigndocs_templates_category ON sovereigndocs_templates(category_slug);
CREATE INDEX IF NOT EXISTS idx_sovereigndocs_templates_jurisdiction ON sovereigndocs_templates(jurisdiction_id);
CREATE INDEX IF NOT EXISTS idx_sovereigndocs_templates_risk ON sovereigndocs_templates(risk_level);
CREATE INDEX IF NOT EXISTS idx_sovereigndocs_templates_search ON sovereigndocs_templates USING GIN (
  to_tsvector('english', coalesce(title,'') || ' ' || coalesce(category_name,'') || ' ' || coalesce(state_name,''))
);
