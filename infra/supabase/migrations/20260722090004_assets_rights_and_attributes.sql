-- 04 · assets, rights ledger, extracted attributes
-- Binary rows are immutable: changed bytes create a new source_assets row.

create table app_source_assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references app_organizations(id) on delete cascade,
  piece_id uuid references app_pieces(id) on delete set null,
  campaign_id uuid references app_campaigns(id) on delete set null,
  kind app.asset_kind not null,
  storage_key text not null,             -- server-generated; see migration 11 storage design
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  mime_type text not null,
  width integer,
  height integer,
  bytes bigint,
  color_profile text,
  exif_removed_at timestamptz,
  parent_asset_id uuid references app_source_assets(id) on delete set null,
  derivation jsonb not null default '{}'::jsonb,  -- {op, params} that produced a derivative
  created_at timestamptz not null default now()
  -- intentionally no updated_at/version: binary rows are immutable
);

-- Rights ledger. Every published pixel must resolve to a rights_record.
create table app_rights_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references app_organizations(id) on delete cascade,
  asset_id uuid not null references app_source_assets(id) on delete cascade,
  rights_class app.rights_class not null,
  source_reference text,
  licensor text,
  license_name text,
  license_url text,
  valid_from date,
  valid_until date,
  territories text[] not null default '{}',
  allowed_uses text[] not null default '{}',
  proof_storage_key text,
  confirmed_by uuid,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1
);

create table app_asset_attributes (
  asset_id uuid primary key references app_source_assets(id) on delete cascade,
  extractor text not null,
  extractor_version text not null,
  palette jsonb not null default '[]'::jsonb,
  dominant_color text,
  material_suggestions jsonb not null default '[]'::jsonb,
  hardware_suggestions jsonb not null default '[]'::jsonb,
  style_suggestions jsonb not null default '[]'::jsonb,
  season_suggestions jsonb not null default '[]'::jsonb,
  vibe_suggestions jsonb not null default '[]'::jsonb,
  confidence numeric(4,3) check (confidence between 0 and 1),
  raw_output jsonb not null default '{}'::jsonb,
  operator_confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_rights_touch before update on app_rights_records
  for each row execute function app.touch_updated_at();
create trigger trg_rights_version before update on app_rights_records
  for each row execute function app.bump_version();
create trigger trg_attrs_touch before update on app_asset_attributes
  for each row execute function app.touch_updated_at();
