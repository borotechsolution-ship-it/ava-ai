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

First generate a password hash on your computer:

```powershell
node scripts/hash-sales-password.mjs "Bret@0011"
```

Copy the full output. It starts with `scrypt$`.

Then go to Supabase SQL Editor and run:

```sql
insert into sales_accounts(login_slug, display_name, password_hash, gemini_key_slot)
values (
  'sales-a',
  'Bret',
  'paste-the-scrypt-hash-here',
  'a'
);
```

Then Bret logs in with:

```text
Sales account: sales-a
Password: Bret@0011
```

## Create Sales A, B, And C

Generate one hash per password with `node scripts/hash-sales-password.mjs "<password>"`, then insert the hashes:

```sql
insert into sales_accounts(login_slug, display_name, password_hash, gemini_key_slot)
values
  ('sales-a', 'Bret', 'paste-sales-a-scrypt-hash', 'a'),
  ('sales-b', 'Sales B', 'paste-sales-b-scrypt-hash', 'b'),
  ('sales-c', 'Sales C', 'paste-sales-c-scrypt-hash', 'c');
```

The database limit is 10 total rows in `sales_accounts`, but our intended setup is only `sales-a`, `sales-b`, and `sales-c`.

## Update A Password

If Bret needs a new password:

```sql
update sales_accounts
set
  password_hash = 'paste-new-scrypt-hash-here',
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
- `password_hash` is not the real password. It is a one-way `scrypt` hash.
- Old 64-character SHA-256 hashes still verify for migration, but update every real sales account to `scrypt` before handoff.
- `SALES_AUTH_SECRET` must stay private in `.env` and in deployment environment variables. It must be separate from `SUPABASE_SERVICE_ROLE_KEY` and `INVITE_TOKEN_ENCRYPTION_SECRET`.
- After 5 failed login attempts from the same IP against the same sales ID within 15 minutes, the account/IP pair is temporarily locked out.
- Salespeople do not need their Supabase `id`.
- Old invites created before sales account isolation may have no `sales_account_id`, so they will not appear in any salesperson's CRM unless manually assigned.
