-- SkyeGateFS27 v8: short Gate ID + PIN auth lane with one-time recovery codes.
-- Safe to run multiple times. The live Netlify functions also patch-create these tables.

create table if not exists user_pin_credentials (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  gate_id text not null unique,
  pin_hash text not null,
  label text,
  status text not null default 'active',
  recovery_sent_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_pin_credentials_user_idx on user_pin_credentials(user_id, created_at desc);

create table if not exists user_recovery_codes (
  id uuid primary key,
  credential_id uuid not null references user_pin_credentials(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  code_hash text not null unique,
  code_label text not null,
  sent_at timestamptz,
  expires_at timestamptz,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists user_recovery_codes_user_idx on user_recovery_codes(user_id, created_at desc);
