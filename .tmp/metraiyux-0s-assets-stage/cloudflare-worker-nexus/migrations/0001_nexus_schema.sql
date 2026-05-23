
create table if not exists nexus_events (
  id text primary key,
  created_at text not null,
  lane text not null,
  primary_brain text not null,
  secondary_review text not null,
  status text not null,
  payload text
);
create table if not exists nexus_tasks (
  id text primary key,
  created_at text not null,
  title text not null,
  owner_brain text not null,
  status text not null,
  payload text
);
create table if not exists nexus_approvals (
  id text primary key,
  created_at text not null,
  approval_type text not null,
  requested_by text,
  decision text default 'pending',
  payload text
);
create index if not exists idx_nexus_events_created on nexus_events(created_at);
create index if not exists idx_nexus_events_lane on nexus_events(lane);
