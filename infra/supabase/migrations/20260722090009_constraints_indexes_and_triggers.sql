-- 09 · indexes and remaining constraints (§7.3)

-- tenant prefix indexes on every organization_id
create index ix_pieces_org on app_pieces(organization_id);
create index ix_campaigns_org on app_campaigns(organization_id);
create index ix_source_assets_org on app_source_assets(organization_id);
create index ix_rights_org on app_rights_records(organization_id);
create index ix_runs_org on app_factory_runs(organization_id);
create index ix_items_org on app_content_items(organization_id);
create index ix_approvals_org on app_approvals(organization_id);
create index ix_destinations_org on app_destinations(organization_id);
create index ix_accounts_org on app_social_accounts(organization_id);
create index ix_jobruns_org on app_job_runs(organization_id);
create index ix_pubjobs_org on app_publish_jobs(organization_id);
create index ix_publications_org on app_publications(organization_id);
create index ix_metrics_org on app_metric_observations(organization_id);
create index ix_audit_org on app_audit_events(organization_id);

-- access-pattern indexes
create index ix_campaigns_piece on app_campaigns(piece_id, created_at desc);
create index ix_source_assets_campaign_kind on app_source_assets(campaign_id, kind);
create unique index uq_source_assets_sha on app_source_assets(sha256, organization_id);
create index ix_factory_runs_fp on app_factory_runs(campaign_id, input_fingerprint);
create index ix_content_items_campaign on app_content_items(campaign_id, status, destination_id);
create index ix_approvals_item on app_approvals(content_item_id, created_at desc);

-- partial due-job index for the scheduler poll (pending/retry only)
create index ix_publish_due on app_publish_jobs(next_attempt_at)
  where state in ('pending','retry_wait');

-- lease index for worker claim scans
create index ix_jobruns_lease on app_job_runs(queue_name, state, lease_expires_at);

create index ix_metrics_pub on app_metric_observations(publication_id, observed_at desc);

-- JSONB GIN only where retrieval will query it (attributes palette search)
create index ix_attrs_palette_gin on app_asset_attributes using gin (palette);

-- tenant-safe relationship keys. A UUID identifies a row, but every relationship
-- must also prove that both rows belong to the same organization.
create unique index uq_pieces_id_org on app_pieces(id, organization_id);
create unique index uq_campaigns_id_org on app_campaigns(id, organization_id);
create unique index uq_assets_id_org on app_source_assets(id, organization_id);
create unique index uq_runs_id_org on app_factory_runs(id, organization_id);
create unique index uq_items_id_org on app_content_items(id, organization_id);
create unique index uq_destinations_id_org on app_destinations(id, organization_id);
create unique index uq_accounts_id_org on app_social_accounts(id, organization_id);
create unique index uq_publish_jobs_id_org on app_publish_jobs(id, organization_id);
create unique index uq_publications_id_org on app_publications(id, organization_id);
create unique index uq_active_model_purpose on app_model_registry(purpose) where active;

alter table app_campaigns
  drop constraint app_campaigns_piece_id_fkey,
  add constraint fk_campaign_piece_org foreign key (piece_id, organization_id)
    references app_pieces(id, organization_id) on delete cascade;

alter table app_source_assets
  drop constraint app_source_assets_piece_id_fkey,
  drop constraint app_source_assets_campaign_id_fkey,
  drop constraint app_source_assets_parent_asset_id_fkey,
  add constraint fk_asset_piece_org foreign key (piece_id, organization_id)
    references app_pieces(id, organization_id) on delete restrict,
  add constraint fk_asset_campaign_org foreign key (campaign_id, organization_id)
    references app_campaigns(id, organization_id) on delete restrict,
  add constraint fk_asset_parent_org foreign key (parent_asset_id, organization_id)
    references app_source_assets(id, organization_id) on delete restrict,
  add constraint uq_asset_storage_key unique (storage_bucket, storage_key);

alter table app_rights_records
  drop constraint app_rights_records_asset_id_fkey,
  add constraint fk_rights_asset_org foreign key (asset_id, organization_id)
    references app_source_assets(id, organization_id) on delete cascade;

alter table app_factory_runs
  drop constraint app_factory_runs_campaign_id_fkey,
  add constraint fk_run_campaign_org foreign key (campaign_id, organization_id)
    references app_campaigns(id, organization_id) on delete cascade;

alter table app_content_items
  drop constraint app_content_items_factory_run_id_fkey,
  drop constraint app_content_items_campaign_id_fkey,
  drop constraint fk_items_destination,
  drop constraint fk_items_account,
  add constraint fk_item_run_org foreign key (factory_run_id, organization_id)
    references app_factory_runs(id, organization_id) on delete restrict,
  add constraint fk_item_campaign_org foreign key (campaign_id, organization_id)
    references app_campaigns(id, organization_id) on delete cascade,
  add constraint fk_item_destination_org foreign key (destination_id, organization_id)
    references app_destinations(id, organization_id) on delete restrict,
  add constraint fk_item_account_org foreign key (account_id, organization_id)
    references app_social_accounts(id, organization_id) on delete restrict;

alter table app_approvals
  drop constraint app_approvals_content_item_id_fkey,
  add constraint fk_approval_item_org foreign key (content_item_id, organization_id)
    references app_content_items(id, organization_id) on delete cascade;

alter table app_social_accounts
  drop constraint app_social_accounts_destination_id_fkey,
  add constraint fk_account_destination_org foreign key (destination_id, organization_id)
    references app_destinations(id, organization_id) on delete cascade,
  add constraint uq_account_handle unique (organization_id, platform, handle);

alter table app_publish_jobs
  drop constraint app_publish_jobs_content_item_id_fkey,
  drop constraint app_publish_jobs_account_id_fkey,
  add constraint fk_publish_item_org foreign key (content_item_id, organization_id)
    references app_content_items(id, organization_id) on delete restrict,
  add constraint fk_publish_account_org foreign key (account_id, organization_id)
    references app_social_accounts(id, organization_id) on delete restrict;

alter table app_publications
  drop constraint app_publications_publish_job_id_fkey,
  drop constraint app_publications_account_id_fkey,
  add constraint fk_publication_job_org foreign key (publish_job_id, organization_id)
    references app_publish_jobs(id, organization_id) on delete restrict,
  add constraint fk_publication_account_org foreign key (account_id, organization_id)
    references app_social_accounts(id, organization_id) on delete restrict;

alter table app_metric_observations
  drop constraint app_metric_observations_publication_id_fkey,
  add constraint fk_metric_publication_org foreign key (publication_id, organization_id)
    references app_publications(id, organization_id) on delete cascade;

-- Source binary identity cannot be edited in place. A changed binary is a new row.
create or replace function app.source_asset_is_immutable()
returns trigger language plpgsql as $$
begin
  raise exception 'source_assets rows are immutable; create a derivative or replacement row'
    using errcode = 'check_violation';
end $$;

create trigger trg_source_asset_no_update before update on app_source_assets
  for each row execute function app.source_asset_is_immutable();

-- Join tables without organization_id must prove both parents share a tenant.
create or replace function app.assert_content_item_asset_org()
returns trigger language plpgsql as $$
declare v_item_org uuid;
declare v_asset_org uuid;
begin
  select organization_id into v_item_org from app_content_items where id = new.content_item_id;
  select organization_id into v_asset_org from app_source_assets where id = new.asset_id;
  if v_item_org is null or v_asset_org is null or v_item_org <> v_asset_org then
    raise exception 'content item and asset must belong to the same organization'
      using errcode = 'foreign_key_violation';
  end if;
  return new;
end $$;

create trigger trg_item_asset_same_org before insert or update on app_content_item_assets
  for each row execute function app.assert_content_item_asset_org();

-- Content routing cannot weaken a destination's manual-only requirement or use
-- an account from another destination.
create or replace function app.validate_content_destination()
returns trigger language plpgsql as $$
declare v_destination app_destinations;
declare v_account app_social_accounts;
begin
  if new.destination_id is null then
    if new.account_id is not null then
      raise exception 'content with an account must have a destination' using errcode = 'check_violation';
    end if;
    return new;
  end if;
  select * into v_destination from app_destinations where id = new.destination_id;
  if not found or v_destination.organization_id <> new.organization_id then
    raise exception 'content destination must belong to the same organization'
      using errcode = 'foreign_key_violation';
  end if;
  if v_destination.manual_only and not new.manual_only then
    raise exception 'manual-only destination cannot be weakened on content item'
      using errcode = 'check_violation';
  end if;
  if new.account_id is not null then
    select * into v_account from app_social_accounts where id = new.account_id;
    if not found or v_account.organization_id <> new.organization_id
      or v_account.destination_id <> new.destination_id then
      raise exception 'content account must match its organization and destination'
        using errcode = 'foreign_key_violation';
    end if;
  end if;
  return new;
end $$;

create trigger trg_content_destination before insert or update of organization_id, destination_id, account_id, manual_only
  on app_content_items for each row execute function app.validate_content_destination();

create or replace function app.protect_scheduled_content_inputs()
returns trigger language plpgsql as $$
begin
  if exists (
    select 1 from app_publish_jobs j
    where j.content_item_id = old.id
      and j.state in ('pending','claimed','uploading','processing','retry_wait')
  ) then
    raise exception 'cancel active publish jobs before changing routed or fingerprinted content'
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

create trigger trg_content_scheduled_inputs before update of
  organization_id, destination_id, account_id, manual_only,
  binary_fingerprint, copy_fingerprint
  on app_content_items for each row execute function app.protect_scheduled_content_inputs();

-- Human approvals are identity-bound and fingerprint-bound at insertion time.
create or replace function app.validate_approval()
returns trigger language plpgsql as $$
declare v_item app_content_items;
begin
  select * into v_item from app_content_items where id = new.content_item_id;
  if not found or v_item.organization_id <> new.organization_id then
    raise exception 'approval content must belong to the same organization'
      using errcode = 'foreign_key_violation';
  end if;
  if new.reviewer_id is distinct from app.uid() then
    raise exception 'reviewer_id must match the authenticated user'
      using errcode = 'insufficient_privilege';
  end if;
  if new.binary_fingerprint is distinct from v_item.binary_fingerprint
    or new.copy_fingerprint is distinct from v_item.copy_fingerprint then
    raise exception 'approval fingerprints are stale' using errcode = 'check_violation';
  end if;
  return new;
end $$;

create trigger trg_approval_validate before insert on app_approvals
  for each row execute function app.validate_approval();

-- Even a direct SQL/API mistake cannot schedule flagship, stale, unapproved, or
-- mismatched content. Later scheduler RPCs inherit this guard.
create or replace function app.validate_publish_job()
returns trigger language plpgsql as $$
declare v_item app_content_items;
declare v_destination app_destinations;
declare v_account app_social_accounts;
begin
  select * into v_item from app_content_items where id = new.content_item_id;
  select * into v_account from app_social_accounts where id = new.account_id;
  if v_item.id is null or v_account.id is null
    or v_item.organization_id <> new.organization_id
    or v_account.organization_id <> new.organization_id then
    raise exception 'publish job relationships must belong to the same organization'
      using errcode = 'foreign_key_violation';
  end if;
  if v_item.destination_id is null or v_account.destination_id <> v_item.destination_id then
    raise exception 'publish account must match the content destination'
      using errcode = 'check_violation';
  end if;
  if not v_account.enabled or v_account.authorization_state <> 'linked' then
    raise exception 'publish account must be enabled and linked'
      using errcode = 'check_violation';
  end if;
  select * into v_destination from app_destinations where id = v_item.destination_id;
  if v_destination.kind = 'flagship' or v_destination.code = 'flagship'
    or v_destination.manual_only or v_item.manual_only then
    raise exception 'flagship/manual-only content cannot create a publish job'
      using errcode = 'check_violation';
  end if;
  if v_item.status <> 'approved' then
    raise exception 'content must be approved before scheduling' using errcode = 'check_violation';
  end if;
  if v_destination.requires_approval and not exists (
    select 1 from app_approvals a
    where a.content_item_id = v_item.id and a.organization_id = new.organization_id
      and a.decision = 'approved'
      and a.binary_fingerprint = v_item.binary_fingerprint
      and a.copy_fingerprint = v_item.copy_fingerprint
  ) then
    raise exception 'current fingerprint-bound approval is required' using errcode = 'check_violation';
  end if;
  return new;
end $$;

create trigger trg_publish_job_validate before insert or update of organization_id, content_item_id, account_id
  on app_publish_jobs for each row execute function app.validate_publish_job();
