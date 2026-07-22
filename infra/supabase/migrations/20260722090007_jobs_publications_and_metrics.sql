-- 07 · jobs, publish jobs, publications, metrics

create table app_job_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references app_organizations(id) on delete cascade,
  queue_name text not null,
  job_type text not null,
  entity_id uuid,
  worker_id text,
  state text not null default 'queued'
    check (state in ('queued','leased','running','succeeded','failed','dead','cancelled')),
  attempt integer not null default 0,
  lease_expires_at timestamptz,
  model_name text,
  model_revision text,
  prompt_version text,
  started_at timestamptz,
  finished_at timestamptz,
  duration_ms integer,
  gpu_seconds numeric(10,3),
  estimated_cost_minor bigint,
  input_hash text,
  output_hash text,
  error_class text,
  error_redacted text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table app_publish_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references app_organizations(id) on delete cascade,
  content_item_id uuid not null references app_content_items(id) on delete cascade,
  account_id uuid not null references app_social_accounts(id) on delete cascade,
  scheduled_for timestamptz not null,
  state text not null default 'pending'
    check (state in ('pending','claimed','publishing','published','failed','cancelled','retry')),
  idempotency_key text not null,
  attempt_count integer not null default 0,
  next_attempt_at timestamptz,
  last_error_code text,
  last_error_redacted text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, idempotency_key)
);

create table app_publications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references app_organizations(id) on delete cascade,
  publish_job_id uuid not null references app_publish_jobs(id) on delete cascade,
  account_id uuid not null references app_social_accounts(id) on delete cascade,
  platform_post_id text,
  platform_url text,
  published_at timestamptz,
  remote_payload_redacted jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (account_id, platform_post_id)
);

create table app_metric_observations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references app_organizations(id) on delete cascade,
  publication_id uuid not null references app_publications(id) on delete cascade,
  observed_at timestamptz not null,
  views integer, impressions integer, reach integer,
  saves integer, likes integer, comments integer, shares integer,
  clicks integer, profile_visits integer, dms_attributed integer,
  raw_restricted jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (publication_id, observed_at)
);

create trigger trg_jobruns_touch before update on app_job_runs
  for each row execute function app.touch_updated_at();
create trigger trg_pubjobs_touch before update on app_publish_jobs
  for each row execute function app.touch_updated_at();
