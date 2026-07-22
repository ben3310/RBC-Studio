-- 08 · audit trail, webhook idempotency, model registry

create table app_audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references app_organizations(id) on delete set null,
  actor_type app.actor_type not null,
  actor_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  request_id text,
  before_hash text,
  after_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
  -- append-only for application roles; enforced in migration 10 + trigger below
);

-- audit rows may never be updated or deleted by application roles
create or replace function app.audit_is_append_only()
returns trigger language plpgsql as $$
begin
  raise exception 'audit_events is append-only' using errcode = 'insufficient_privilege';
end $$;

create trigger trg_audit_no_update before update on app_audit_events
  for each row execute function app.audit_is_append_only();
create trigger trg_audit_no_delete before delete on app_audit_events
  for each row execute function app.audit_is_append_only();

create table app_webhook_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references app_organizations(id) on delete set null,
  provider text not null,
  provider_event_id text not null,
  received_at timestamptz not null default now(),
  signature_valid boolean not null default false,
  payload_redacted jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  error text,
  unique (provider, provider_event_id)     -- replay protection
);

create table app_model_registry (
  id uuid primary key default gen_random_uuid(),
  purpose text not null,                   -- 'background_removal' | 'matting' | 'mood_gen' | ...
  model_id text not null,
  revision text not null,
  license text,
  license_url text,
  commercial_use_allowed boolean not null default false,
  artifact_sha256 text,
  evaluation_report jsonb not null default '{}'::jsonb,
  approved_at timestamptz,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (purpose, model_id, revision)
);

create trigger trg_model_touch before update on app_model_registry
  for each row execute function app.touch_updated_at();
