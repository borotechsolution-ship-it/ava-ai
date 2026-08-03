create table if not exists demo_company_context_cache (
  cache_key text primary key,
  company_name text not null,
  industry text not null,
  common_caller_intents jsonb not null default '[]'::jsonb,
  good_questions jsonb not null default '[]'::jsonb,
  boundaries jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists demo_company_context_cache_industry_idx
  on demo_company_context_cache(lower(industry));

grant select, insert, update, delete on table demo_company_context_cache to service_role;
