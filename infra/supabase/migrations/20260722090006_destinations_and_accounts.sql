-- 06 · destinations and social accounts
-- The flagship invariant is enforced in the database, not just application code.

create table app_destinations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references app_organizations(id) on delete cascade,
  code text not null,
  label text not null,
  platform text not null,
  kind app.destination_kind not null,
  manual_only boolean not null default false,
  requires_approval boolean not null default true,
  requires_ai_disclosure boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  unique (organization_id, code),
  -- flagship is permanently manual + approval-gated
  check (kind <> 'flagship' or (manual_only = true and requires_approval = true))
);

create table app_social_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references app_organizations(id) on delete cascade,
  destination_id uuid not null references app_destinations(id) on delete cascade,
  platform text not null,
  handle text not null,
  external_account_id text,
  authorization_state text not null default 'unlinked'
    check (authorization_state in ('unlinked','pending','linked','expired','revoked')),
  token_secret_ref text,                  -- opaque reference to a secret store; never the token
  token_expires_at timestamptz,
  capabilities jsonb not null default '{}'::jsonb,
  enabled boolean not null default false,
  last_health_check_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1
);

-- now that destinations/accounts exist, wire the deferred FKs from migration 05
alter table app_content_items
  add constraint fk_items_destination
    foreign key (destination_id) references app_destinations(id) on delete set null,
  add constraint fk_items_account
    foreign key (account_id) references app_social_accounts(id) on delete set null;

-- trigger: never weaken an existing flagship destination
create or replace function app.protect_flagship()
returns trigger language plpgsql as $$
begin
  if old.kind = 'flagship' then
    if new.kind <> 'flagship' or new.manual_only = false or new.requires_approval = false then
      raise exception 'flagship destination % cannot be weakened', old.id
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end $$;

create trigger trg_flagship_guard before update on app_destinations
  for each row execute function app.protect_flagship();
create trigger trg_dest_touch before update on app_destinations
  for each row execute function app.touch_updated_at();
create trigger trg_dest_version before update on app_destinations
  for each row execute function app.bump_version();
create trigger trg_acct_touch before update on app_social_accounts
  for each row execute function app.touch_updated_at();
create trigger trg_acct_version before update on app_social_accounts
  for each row execute function app.bump_version();
