alter table demo_invites
  drop constraint if exists demo_invites_max_sessions_check;

alter table demo_invites
  add constraint demo_invites_max_sessions_check
  check (max_sessions > 0 and max_sessions <= 3);
