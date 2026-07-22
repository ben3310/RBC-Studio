-- 02 · identity and tenancy
-- Every tenant table carries organization_id and is RLS-forced in migration 10.

create table app_organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug citext not null unique,
  default_timezone text not null default 'UTC',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1
);

create table app_organization_members (
  organization_id uuid not null references app_organizations(id) on delete cascade,
  user_id uuid not null,                 -- references auth.users(id) in Supabase
  role app.member_role not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create trigger trg_org_touch before update on app_organizations
  for each row execute function app.touch_updated_at();
create trigger trg_org_version before update on app_organizations
  for each row execute function app.bump_version();
create trigger trg_member_touch before update on app_organization_members
  for each row execute function app.touch_updated_at();

-- ---- RLS predicates (used by every tenant table in migration 10) ----------
-- current authenticated user (Supabase auth.uid()); NULL outside a user session
create or replace function app.uid()
returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create or replace function app.is_member(org uuid)
returns boolean language sql stable security definer set search_path = app, public as $$
  select exists (
    select 1 from app_organization_members m
    where m.organization_id = org and m.user_id = app.uid()
  )
$$;

create or replace function app.has_role(org uuid, roles app.member_role[])
returns boolean language sql stable security definer set search_path = app, public as $$
  select exists (
    select 1 from app_organization_members m
    where m.organization_id = org and m.user_id = app.uid() and m.role = any(roles)
  )
$$;
