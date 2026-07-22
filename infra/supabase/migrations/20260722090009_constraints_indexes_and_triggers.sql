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
  where state in ('pending','retry');

-- lease index for worker claim scans
create index ix_jobruns_lease on app_job_runs(queue_name, state, lease_expires_at);

create index ix_metrics_pub on app_metric_observations(publication_id, observed_at desc);

-- JSONB GIN only where retrieval will query it (attributes palette search)
create index ix_attrs_palette_gin on app_asset_attributes using gin (palette);
