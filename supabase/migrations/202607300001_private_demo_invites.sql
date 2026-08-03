create extension if not exists pgcrypto;

create table if not exists demo_invites (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  prospect_name text not null check (length(trim(prospect_name)) > 0),
  company_name text not null check (length(trim(company_name)) > 0),
  industry text not null check (length(trim(industry)) > 0),
  prospect_email text,
  expires_at timestamptz not null,
  max_sessions integer not null default 1 check (max_sessions > 0 and max_sessions <= 3),
  sessions_used integer not null default 0 check (sessions_used >= 0),
  status text not null default 'active' check (status in ('active', 'redeemed', 'expired', 'revoked')),
  created_by text,
  created_at timestamptz not null default now(),
  redeemed_at timestamptz,
  revoked_at timestamptz,
  infrastructure_retry_count integer not null default 0 check (infrastructure_retry_count between 0 and 1),
  constraint demo_invites_usage_cap check (sessions_used <= max_sessions)
);

create table if not exists demo_sessions (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null references demo_invites(id) on delete cascade,
  status text not null default 'created' check (status in ('created', 'started', 'completed', 'failed', 'timed_out')),
  started_at timestamptz,
  expires_at timestamptz not null,
  ended_at timestamptz,
  ai_speech_seconds integer not null default 0 check (ai_speech_seconds >= 0),
  livekit_room_name text not null unique,
  reconnect_secret_hash text not null,
  failure_reason text,
  infrastructure_retry_count integer not null default 0 check (infrastructure_retry_count between 0 and 1),
  meaningful_interaction_started boolean not null default false,
  active_connection_id uuid,
  active_connection_lease_until timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists demo_session_auth (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references demo_sessions(id) on delete cascade,
  cookie_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists demo_security_events (
  id bigint generated always as identity primary key,
  event_type text not null,
  token_hash text,
  invite_id uuid references demo_invites(id) on delete set null,
  session_id uuid references demo_sessions(id) on delete set null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists demo_invites_token_hash_idx on demo_invites(token_hash);
create index if not exists demo_invites_status_expires_idx on demo_invites(status, expires_at);
create index if not exists demo_sessions_invite_idx on demo_sessions(invite_id, created_at desc);
create index if not exists demo_sessions_status_expires_idx on demo_sessions(status, expires_at);
create index if not exists demo_session_auth_cookie_idx on demo_session_auth(cookie_hash, expires_at);
create index if not exists demo_security_events_created_idx on demo_security_events(created_at desc);

grant usage on schema public to service_role;
grant select, insert, update, delete on table demo_invites to service_role;
grant select, insert, update, delete on table demo_sessions to service_role;
grant select, insert, update, delete on table demo_session_auth to service_role;
grant select, insert, update, delete on table demo_security_events to service_role;
grant usage, select on all sequences in schema public to service_role;

create unique index if not exists demo_sessions_one_active_per_invite_idx
  on demo_sessions(invite_id)
  where status in ('created', 'started');

create or replace function validate_demo_invite(p_token_hash text)
returns table (
  invite_id uuid,
  prospect_name text,
  company_name text,
  industry text,
  expires_at timestamptz,
  max_sessions integer,
  sessions_used integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select i.id, i.prospect_name, i.company_name, i.industry, i.expires_at, i.max_sessions, i.sessions_used
  from demo_invites i
  where i.token_hash = p_token_hash
    and i.status = 'active'
    and i.revoked_at is null
    and i.expires_at > now()
    and i.sessions_used < i.max_sessions
    and not (
      i.max_sessions = 1
      and exists (
        select 1 from demo_sessions s
        where s.invite_id = i.id and s.status = 'completed'
      )
    )
  limit 1;
end;
$$;

grant execute on function validate_demo_invite(text) to service_role;

create or replace function redeem_demo_invite(
  p_token_hash text,
  p_reconnect_secret_hash text,
  p_daily_limit integer,
  p_monthly_limit integer,
  p_session_seconds integer,
  p_max_active_sessions_per_invite integer
)
returns demo_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite demo_invites%rowtype;
  v_session demo_sessions%rowtype;
  v_daily_count integer;
  v_monthly_count integer;
  v_active_count integer;
begin
  select * into v_invite
  from demo_invites
  where token_hash = p_token_hash
  for update;

  if not found then
    insert into demo_security_events(event_type, token_hash)
    values ('unknown_invite_redeem', p_token_hash);
    return null;
  end if;

  if v_invite.status <> 'active'
    or v_invite.revoked_at is not null
    or v_invite.expires_at <= now()
    or v_invite.sessions_used >= v_invite.max_sessions
  then
    insert into demo_security_events(event_type, token_hash, invite_id, detail)
    values ('invalid_invite_redeem', p_token_hash, v_invite.id, jsonb_build_object('status', v_invite.status));
    return null;
  end if;

  if v_invite.max_sessions = 1 and exists (
    select 1 from demo_sessions
    where invite_id = v_invite.id and status = 'completed'
  ) then
    insert into demo_security_events(event_type, token_hash, invite_id)
    values ('completed_invite_replay', p_token_hash, v_invite.id);
    return null;
  end if;

  select count(*) into v_active_count
  from demo_sessions
  where invite_id = v_invite.id
    and status in ('created', 'started')
    and expires_at > now();

  if v_active_count >= p_max_active_sessions_per_invite then
    insert into demo_security_events(event_type, token_hash, invite_id)
    values ('active_session_limit_redeem', p_token_hash, v_invite.id);
    return null;
  end if;

  select count(*) into v_daily_count
  from demo_sessions
  where created_at >= date_trunc('day', now());

  select count(*) into v_monthly_count
  from demo_sessions
  where created_at >= date_trunc('month', now());

  if v_daily_count >= p_daily_limit or v_monthly_count >= p_monthly_limit then
    insert into demo_security_events(event_type, token_hash, invite_id, detail)
    values (
      'global_demo_limit_redeem',
      p_token_hash,
      v_invite.id,
      jsonb_build_object('daily', v_daily_count, 'monthly', v_monthly_count)
    );
    return null;
  end if;

  insert into demo_sessions (
    invite_id,
    status,
    started_at,
    expires_at,
    livekit_room_name,
    reconnect_secret_hash
  )
  values (
    v_invite.id,
    'started',
    now(),
    now() + make_interval(secs => p_session_seconds),
    'demo_' || replace(gen_random_uuid()::text, '-', ''),
    p_reconnect_secret_hash
  )
  returning * into v_session;

  update demo_invites
  set
    sessions_used = sessions_used + 1,
    status = case when sessions_used + 1 >= max_sessions then 'redeemed' else status end,
    redeemed_at = case when sessions_used + 1 >= max_sessions then now() else redeemed_at end
  where id = v_invite.id;

  return v_session;
end;
$$;

grant execute on function redeem_demo_invite(text, text, integer, integer, integer, integer) to service_role;

create or replace function reconnect_demo_session(
  p_cookie_hash text,
  p_grace_seconds integer
)
returns demo_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session demo_sessions%rowtype;
  v_connection_id uuid := gen_random_uuid();
begin
  select s.* into v_session
  from demo_session_auth a
  join demo_sessions s on s.id = a.session_id
  join demo_invites i on i.id = s.invite_id
  where a.cookie_hash = p_cookie_hash
    and a.expires_at > now()
    and s.status in ('created', 'started')
    and s.expires_at > now()
    and i.revoked_at is null
    and i.expires_at > now()
    and (
      s.active_connection_lease_until is null
      or s.active_connection_lease_until <= now()
    )
  for update of s;

  if not found then
    insert into demo_security_events(event_type, detail)
    values ('reconnect_rejected', jsonb_build_object('cookie_hash_prefix', left(p_cookie_hash, 12)));
    return null;
  end if;

  update demo_sessions
  set
    active_connection_id = v_connection_id,
    active_connection_lease_until = least(expires_at, now() + make_interval(secs => least(p_grace_seconds, 30)))
  where id = v_session.id
  returning * into v_session;

  return v_session;
end;
$$;

grant execute on function reconnect_demo_session(text, integer) to service_role;

create or replace function mark_demo_session_failed_before_use(
  p_session_id uuid,
  p_failure_reason text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session demo_sessions%rowtype;
begin
  select * into v_session
  from demo_sessions
  where id = p_session_id
  for update;

  if not found
    or v_session.meaningful_interaction_started
    or v_session.status not in ('created', 'started')
  then
    return false;
  end if;

  if exists (
    select 1
    from demo_invites
    where id = v_session.invite_id
      and infrastructure_retry_count >= 1
  ) then
    return false;
  end if;

  update demo_sessions
  set
    status = 'failed',
    ended_at = now(),
    failure_reason = p_failure_reason,
    infrastructure_retry_count = infrastructure_retry_count + 1
  where id = p_session_id;

  update demo_invites
  set
    sessions_used = greatest(0, sessions_used - 1),
    status = 'active',
    redeemed_at = null,
    infrastructure_retry_count = infrastructure_retry_count + 1
  where id = v_session.invite_id
    and revoked_at is null
    and expires_at > now();

  return true;
end;
$$;

grant execute on function mark_demo_session_failed_before_use(uuid, text) to service_role;
