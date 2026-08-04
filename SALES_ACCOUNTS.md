# Sales Account Guide

This project supports separate sales logins so each salesperson only sees their own invite list.

## How It Works

Sales accounts live in the Supabase table `sales_accounts`.

Each account has:

- `login_slug`: the ID the salesperson types on the login page, like `sales-a`, `sales-b`, or `sales-c`.
- `display_name`: the friendly name shown inside the CRM, like `Bret`.
- `password_hash`: a one-way `scrypt` password hash.
- `gemini_key_slot`: the Gemini key slot this salesperson should use, like `a`, `b`, or `c`.
- `active`: whether the account can log in.
- `id`: the hidden Supabase UUID. Users do not type this. The app uses it internally to keep each salesperson's invite list private.

When a salesperson creates an invite, the invite stores their hidden `sales_account_id`. The CRM always filters by that ID on the server.

## Create Sales A For Bret

Go to Supabase SQL Editor and run:

```sql
insert into sales_accounts(login_slug, display_name, password_hash, gemini_key_slot)
values (
  'sales-a',
  'Bret',
  extensions.crypt('Bret@0011', extensions.gen_salt('bf', 12)),
  'a'
);
```

Then Bret logs in with:

```text
Sales account: sales-a
Password: Bret@0011
```

## Create Sales A, B, And C

Create each account directly in Supabase SQL Editor:

```sql
insert into sales_accounts(login_slug, display_name, password_hash, gemini_key_slot)
values
  ('sales-a', 'Bret', extensions.crypt('Bret@0011', extensions.gen_salt('bf', 12)), 'a'),
  ('sales-b', 'Sales B', extensions.crypt('SalesBPasswordHere', extensions.gen_salt('bf', 12)), 'b'),
  ('sales-c', 'Sales C', extensions.crypt('SalesCPasswordHere', extensions.gen_salt('bf', 12)), 'c');
```

The database limit is 10 total rows in `sales_accounts`, but our intended setup is only `sales-a`, `sales-b`, and `sales-c`.

## Update A Password

If Bret needs a new password:

```sql
update sales_accounts
set
  password_hash = extensions.crypt('NewPasswordHere', extensions.gen_salt('bf', 12)),
  updated_at = now()
where login_slug = 'sales-a';
```

After this, Bret must use the new password.

## Change The Display Name

```sql
update sales_accounts
set
  display_name = 'Bret',
  updated_at = now()
where login_slug = 'sales-a';
```

## Deactivate A Sales Account

To stop Sales A from logging in:

```sql
update sales_accounts
set
  active = false,
  updated_at = now()
where login_slug = 'sales-a';
```

Existing browser sessions stop working because the server checks that the account is still active.

## Reactivate A Sales Account

```sql
update sales_accounts
set
  active = true,
  updated_at = now()
where login_slug = 'sales-a';
```

## Provider Key Slots

The app routes Gemini by sales account and uses one global backup.

For this setup:

```env
GEMINI_API_KEY_A=
GEMINI_API_KEY_B=
GEMINI_API_KEY_C=
GEMINI_API_KEY_GLOBAL_BACKUP=

CARTESIA_API_KEY_PRIMARY=
CARTESIA_API_KEY_GLOBAL_BACKUP=
```

Mapping:

```text
sales-a -> gemini_key_slot = a -> GEMINI_API_KEY_A
sales-b -> gemini_key_slot = b -> GEMINI_API_KEY_B
sales-c -> gemini_key_slot = c -> GEMINI_API_KEY_C
```

If Sales A's Gemini key is cooling down after a quota error, Ava uses:

```text
GEMINI_API_KEY_GLOBAL_BACKUP
```

Cartesia is global for all salespeople. The app uses `CARTESIA_API_KEY_PRIMARY` first, then `CARTESIA_API_KEY_GLOBAL_BACKUP` if primary is cooling down or missing.

## Important Notes

- Do not store plain passwords in Supabase.
- `password_hash` is not the real password. It is a one-way `scrypt$...` or Supabase `crypt()` hash.
- Old 64-character SHA-256 hashes are no longer accepted by the app. Update every real sales account to `extensions.crypt('password', extensions.gen_salt('bf', 12))` or `scrypt$...` before handoff.
- If you want Supabase-only password updates, run `supabase/migrations/202608040003_support_pgcrypt_sales_passwords.sql` and use the SQL examples above.
- `SALES_AUTH_SECRET` must stay private in `.env` and in deployment environment variables. It must be separate from `SUPABASE_SERVICE_ROLE_KEY` and `INVITE_TOKEN_ENCRYPTION_SECRET`.
- After 5 failed login attempts from the same IP against the same sales ID within 15 minutes, the account/IP pair is temporarily locked out.
- Salespeople do not need their Supabase `id`.
- Old invites created before sales account isolation may have no `sales_account_id`, so they will not appear in any salesperson's CRM unless manually assigned.
