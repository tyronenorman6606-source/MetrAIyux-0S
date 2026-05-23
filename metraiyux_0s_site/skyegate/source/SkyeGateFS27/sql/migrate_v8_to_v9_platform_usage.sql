-- Kaixu Gateway: v9 platform-aware usage lanes.
-- Safe to run multiple times; live deployments are also patched by netlify/functions/_lib/db.js.

alter table usage_events
  add column if not exists platform_id text not null default 'metraiyux-0s',
  add column if not exists usage_lane text not null default 'ai';

create index if not exists usage_events_platform_idx
  on usage_events(platform_id, usage_lane, created_at desc);

create table if not exists rate_limit_scoped_windows (
  customer_id bigint not null references customers(id) on delete cascade,
  api_key_id bigint not null references api_keys(id) on delete cascade,
  platform_id text not null default 'metraiyux-0s',
  usage_lane text not null default 'gateway',
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (customer_id, api_key_id, platform_id, usage_lane, window_start)
);

create index if not exists rate_limit_scoped_windows_window_idx
  on rate_limit_scoped_windows(window_start desc);
