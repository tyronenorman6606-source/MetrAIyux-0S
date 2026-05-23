-- v10: Admin-provisioned client login accounts.
-- Runtime bootstrap in netlify/functions/_lib/db.js applies these automatically.

alter table users add column if not exists default_api_key_id bigint references api_keys(id) on delete set null;
alter table users add column if not exists password_reset_required boolean not null default false;
alter table users add column if not exists provisioned_at timestamptz;
alter table users add column if not exists provisioned_by text;

create index if not exists users_default_api_key_idx on users(default_api_key_id);
create index if not exists users_customer_role_idx on users(primary_customer_id, role);
