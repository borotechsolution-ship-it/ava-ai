create table if not exists sales_accounts (
  id uuid primary key default gen_random_uuid(),
  login_slug text not null unique check (login_slug ~ '^[a-z0-9][a-z0-9_-]{1,48}$'),
  display_name text not null check (length(trim(display_name)) > 0),
  password_hash text not null unique check (length(password_hash) = 64),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function enforce_sales_accounts_limit()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (select count(*) from sales_accounts) >= 10 then
    raise exception 'sales account limit reached';
  end if;

  return new;
end;
$$;

drop trigger if exists sales_accounts_limit_trigger on sales_accounts;
create trigger sales_accounts_limit_trigger
  before insert on sales_accounts
  for each row execute function enforce_sales_accounts_limit();

alter table demo_invites
  add column if not exists sales_account_id uuid references sales_accounts(id) on delete set null;

create index if not exists sales_accounts_login_slug_idx on sales_accounts(login_slug) where active = true;
create index if not exists demo_invites_sales_account_created_idx on demo_invites(sales_account_id, created_at desc);

grant select, insert, update, delete on table sales_accounts to service_role;

-- Create sales users directly in Supabase.
-- password_hash must be sha256(password), generated outside SQL.
-- Example:
-- insert into sales_accounts(login_slug, display_name, password_hash)
-- values ('sales-a', 'Sales A', '<64-character-sha256-password-hash>');
