create table if not exists crown_events (
  id text primary key,
  type text not null,
  payload text not null,
  created_at text not null
);
create table if not exists crown_tasks (
  id text primary key,
  title text not null,
  owner text not null,
  status text not null,
  payload text not null,
  created_at text not null
);
create table if not exists crown_approvals (
  id text primary key,
  item_id text,
  decision text not null,
  approver text not null,
  notes text,
  created_at text not null
);
create index if not exists idx_crown_events_created on crown_events(created_at);
create index if not exists idx_crown_tasks_status on crown_tasks(status);
