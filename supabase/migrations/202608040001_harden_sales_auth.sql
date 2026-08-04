alter table sales_accounts
  drop constraint if exists sales_accounts_password_hash_check;

alter table sales_accounts
  add constraint sales_accounts_password_hash_check
  check (
    password_hash ~ '^[a-f0-9]{64}$'
    or password_hash ~ '^scrypt\$[0-9]+\$[0-9]+\$[0-9]+\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+$'
  );

create table if not exists sales_login_attempts (
  id bigserial primary key,
  login_slug text not null,
  ip_address text not null,
  success boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists sales_login_attempts_lookup_idx
  on sales_login_attempts(login_slug, ip_address, created_at desc)
  where success = false;

grant select, insert, delete on table sales_login_attempts to service_role;
grant usage, select on sequence sales_login_attempts_id_seq to service_role;
