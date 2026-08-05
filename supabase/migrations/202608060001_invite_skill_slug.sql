alter table demo_invites
  add column if not exists skill_slug text references industry_skills(slug) on delete set null;

create index if not exists demo_invites_skill_slug_idx
  on demo_invites(skill_slug);
