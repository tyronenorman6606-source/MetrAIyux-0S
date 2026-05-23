create table if not exists notification_log (
  id text primary key,
  item_id text,
  provider text not null,
  status text not null,
  payload text not null,
  created_at text not null
);
create index if not exists idx_notification_log_item on notification_log(item_id);
create index if not exists idx_notification_log_created on notification_log(created_at);
