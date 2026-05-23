
create table if not exists admin_chats (
  id text primary key,
  role text not null,
  message text not null,
  payload text,
  created_at text not null
);
create table if not exists admin_commands (
  id text primary key,
  command text not null,
  route text,
  status text not null,
  payload text,
  created_at text not null
);
create table if not exists brain_tasks (
  id text primary key,
  title text not null,
  owner text not null,
  status text not null,
  payload text,
  created_at text not null
);
create table if not exists social_drafts (
  id text primary key,
  platform text,
  content text,
  status text not null,
  payload text,
  created_at text not null
);
create table if not exists approvals (
  id text primary key,
  item_id text,
  decision text not null,
  approver text not null,
  notes text,
  created_at text not null
);
create table if not exists audit_log (
  id text primary key,
  type text not null,
  payload text not null,
  created_at text not null
);
create index if not exists idx_audit_log_created on audit_log(created_at);
create index if not exists idx_brain_tasks_status on brain_tasks(status);
create index if not exists idx_social_drafts_status on social_drafts(status);
