-- 05 · factory runs, content items, approvals

create table app_factory_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references app_organizations(id) on delete cascade,
  campaign_id uuid not null references app_campaigns(id) on delete cascade,
  plan_version text not null,
  seed bigint not null,
  input_fingerprint text not null,
  status text not null default 'queued'
    check (status in ('queued','running','complete','failed','superseded')),
  requested_by uuid,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- only one active run per campaign + input fingerprint
create unique index uq_factory_active_run
  on app_factory_runs (campaign_id, input_fingerprint)
  where status in ('queued','running');

create table app_content_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references app_organizations(id) on delete cascade,
  factory_run_id uuid references app_factory_runs(id) on delete set null,
  campaign_id uuid not null references app_campaigns(id) on delete cascade,
  content_type app.content_type not null,
  destination_id uuid,                    -- fk added in migration 06
  platform text,
  account_id uuid,                        -- fk added in migration 06
  template_id text,
  format text check (format in ('feed','reel','pin','story','na')),
  variant_seed bigint,
  copy_text text,
  copy_schema_version text,
  facts_fingerprint text,
  cta_type app.cta_type not null default 'none',
  synthetic_media boolean not null default false,
  disclosure_text text,
  status text not null default 'draft'
    check (status in ('draft','rendered','qa_failed','review','approved','rejected',
                      'scheduled','publishing','published','failed','superseded')),
  manual_only boolean not null default false,
  binary_fingerprint text,
  copy_fingerprint text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  -- AI-persona content must carry a disclosure string
  check (synthetic_media = false or disclosure_text is not null)
);

create table app_content_item_assets (
  content_item_id uuid not null references app_content_items(id) on delete cascade,
  asset_id uuid not null references app_source_assets(id) on delete cascade,
  role text not null,                     -- hero | mood | detail | persona | ...
  position integer not null default 0,
  primary key (content_item_id, asset_id, role)
);

create table app_approvals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references app_organizations(id) on delete cascade,
  content_item_id uuid not null references app_content_items(id) on delete cascade,
  decision text not null check (decision in ('approved','rejected')),
  binary_fingerprint text not null,       -- must match the item at decision time
  copy_fingerprint text not null,
  reviewer_id uuid not null,
  note text,
  created_at timestamptz not null default now()
);

create trigger trg_runs_touch before update on app_factory_runs
  for each row execute function app.touch_updated_at();
create trigger trg_items_touch before update on app_content_items
  for each row execute function app.touch_updated_at();
create trigger trg_items_version before update on app_content_items
  for each row execute function app.bump_version();
