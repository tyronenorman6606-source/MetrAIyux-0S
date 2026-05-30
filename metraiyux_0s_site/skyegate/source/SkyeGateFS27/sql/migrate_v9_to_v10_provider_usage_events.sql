create table if not exists provider_usage_events (
  id bigserial primary key,
  source_app text not null default 'metraiyux-0s',
  actor_email text,
  gate_user_id bigint,
  gate_customer_id bigint,
  org_id text,
  workspace_id text,
  customer_ref text,
  client_ref text,
  provider_id text not null,
  action text not null,
  usage_lane text not null default 'provider',
  quantity integer not null default 1,
  estimated_cost_cents integer not null default 0,
  billable boolean not null default true,
  chargeback_ready boolean not null default false,
  provider_call_made boolean not null default false,
  receipt_id text,
  event_ts timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists provider_usage_events_chargeback_idx
  on provider_usage_events(customer_ref, workspace_id, usage_lane, created_at desc);

create index if not exists provider_usage_events_provider_idx
  on provider_usage_events(provider_id, action, created_at desc);

create index if not exists provider_usage_events_receipt_idx
  on provider_usage_events(receipt_id);
