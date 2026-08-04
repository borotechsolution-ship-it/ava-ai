create extension if not exists pgcrypto;

alter table sales_accounts
  drop constraint if exists sales_accounts_password_hash_check;

alter table sales_accounts
  add constraint sales_accounts_password_hash_check
  check (
    password_hash ~ '^scrypt\$[0-9]+\$[0-9]+\$[0-9]+\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+$'
    or password_hash ~ '^\$2[abxy]\$[0-9]{2}\$[./A-Za-z0-9]{53}$'
  );

create or replace function verify_sales_password(
  p_login_slug text,
  p_password text
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from sales_accounts
    where login_slug = lower(trim(p_login_slug))
      and active = true
      and password_hash = crypt(p_password, password_hash)
  );
$$;

grant execute on function verify_sales_password(text, text) to service_role;
