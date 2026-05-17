create table if not exists content_engine_runs (
  id text primary key,
  article_slug text not null,
  article_title text not null,
  status text not null,
  approval_required integer not null default 1,
  channels text not null default '[]',
  destinations text not null default '[]',
  package_json text not null default '{}',
  created_at text not null,
  updated_at text not null,
  approved_at text,
  dispatched_at text
);

create index if not exists idx_content_engine_runs_created_at
  on content_engine_runs(created_at);

create index if not exists idx_content_engine_runs_status
  on content_engine_runs(status);

create index if not exists idx_content_engine_runs_article_slug
  on content_engine_runs(article_slug);

create table if not exists content_engine_assets (
  id text primary key,
  run_id text not null,
  asset_type text not null,
  destination text,
  platform text,
  status text not null,
  content text not null default '',
  payload text not null default '{}',
  created_at text not null,
  updated_at text not null
);

create index if not exists idx_content_engine_assets_run_id
  on content_engine_assets(run_id);

create index if not exists idx_content_engine_assets_type
  on content_engine_assets(asset_type);

create index if not exists idx_content_engine_assets_status
  on content_engine_assets(status);
