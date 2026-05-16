create table if not exists events (
  id text primary key,
  type text not null,
  payload text not null,
  created_at text not null
);

create table if not exists tasks (
  id text primary key,
  title text not null,
  cabinet text,
  owner_brain text,
  status text,
  human_gate integer default 0,
  payload text,
  created_at text not null,
  updated_at text
);

create table if not exists approvals (
  id text primary key,
  task_id text,
  decision text,
  decided_by text,
  notes text,
  created_at text not null
);

create table if not exists proof_receipts (
  id text primary key,
  claim text,
  evidence text,
  owner_brain text,
  status text,
  created_at text not null
);

create index if not exists idx_site_operator_events_created on events(created_at);
create index if not exists idx_site_operator_tasks_status on tasks(status);
