do $$
begin
  if exists (
    select 1
    from sales_accounts
    where password_hash ~ '^[a-f0-9]{64}$'
  ) then
    raise exception 'legacy sha256 sales passwords still exist; update every sales_accounts.password_hash to scrypt before running this migration';
  end if;
end;
$$;

alter table sales_accounts
  drop constraint if exists sales_accounts_password_hash_key;

alter table sales_accounts
  drop constraint if exists sales_accounts_password_hash_check;

alter table sales_accounts
  add constraint sales_accounts_password_hash_check
  check (
    password_hash ~ '^scrypt\$[0-9]+\$[0-9]+\$[0-9]+\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+$'
  );
