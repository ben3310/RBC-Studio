-- 03 · inventory and campaigns

create table app_pieces (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references app_organizations(id) on delete cascade,
  archive_no text not null,
  internal_name text,
  public_name text,
  status text not null default 'draft'
    check (status in ('draft','listed','reserved','acquired','archived')),
  price_amount_minor bigint,             -- integer minor units; null when price_mode='on_request'
  price_currency text check (price_currency ~ '^[A-Z]{3}$' or price_currency is null),
  price_mode text not null default 'fixed' check (price_mode in ('fixed','on_request')),
  material text,
  condition text,
  authentication text,
  provenance text,
  detail text,
  acquisition_route text,
  product_url text,
  facts_version integer not null default 1,
  facts_confirmed_at timestamptz,
  facts_confirmed_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  unique (organization_id, archive_no),
  -- literal-scarcity + POA doctrine enforced at the data layer
  check (price_mode = 'on_request' or price_amount_minor is not null),
  check (price_mode = 'fixed' or price_amount_minor is null)
);

create table app_campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references app_organizations(id) on delete cascade,
  piece_id uuid not null references app_pieces(id) on delete cascade,
  title text,
  objective text check (objective in ('acquire','drop','educate','profile')),
  story_angle text check (story_angle in ('provenance','detail','styling','rarity')),
  campaign_date date,
  target_region text check (target_region in ('americas','europe','au_nz','follow_the_sun')),
  spelling_mode text not null default 'american' check (spelling_mode in ('american','british')),
  local_snapshot jsonb not null default '{}'::jsonb,  -- last studio state for reproducible render
  status text not null default 'draft'
    check (status in ('draft','generating','review','scheduled','active','complete','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1
);

create trigger trg_pieces_touch before update on app_pieces
  for each row execute function app.touch_updated_at();
create trigger trg_pieces_version before update on app_pieces
  for each row execute function app.bump_version();
create trigger trg_campaigns_touch before update on app_campaigns
  for each row execute function app.touch_updated_at();
create trigger trg_campaigns_version before update on app_campaigns
  for each row execute function app.bump_version();
