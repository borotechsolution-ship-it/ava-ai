alter table sales_accounts
  add column if not exists gemini_key_slot text;

create table if not exists demo_provider_events (
  id bigint generated always as identity primary key,
  provider text not null check (provider in ('gemini', 'cartesia', 'deepgram', 'livekit', 'agent')),
  key_slot text,
  sales_account_id uuid references sales_accounts(id) on delete set null,
  invite_id uuid references demo_invites(id) on delete set null,
  session_id uuid references demo_sessions(id) on delete set null,
  room_name text,
  event_type text not null,
  error_type text,
  retry_after_seconds integer,
  message text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists demo_provider_events_created_idx
  on demo_provider_events(created_at desc);

create index if not exists demo_provider_events_provider_slot_idx
  on demo_provider_events(provider, key_slot, created_at desc);

grant select, insert, update, delete on table demo_provider_events to service_role;

-- Example:
-- update sales_accounts set gemini_key_slot = 'bret' where login_slug = 'bret';
