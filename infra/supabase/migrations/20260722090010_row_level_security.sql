-- 10 · row-level security (§7.4)
-- All tenant tables enable AND force RLS. Policies key off app.is_member /
-- app.has_role (migration 02). Service roles (worker/publisher) use dedicated
-- Postgres roles configured at apply-time; their narrow grants are added in the
-- gated apply step, not here, because they depend on the live project.
--
-- The negative-case RLS tests (§7.4) run against a live/staging database and are
-- part of the gated Milestone 1 apply, not this offline scaffold.

do $$
declare t text;
begin
  foreach t in array array[
    'app_organizations','app_organization_members','app_pieces','app_campaigns',
    'app_source_assets','app_rights_records','app_asset_attributes',
    'app_factory_runs','app_content_items','app_content_item_assets','app_approvals',
    'app_destinations','app_social_accounts','app_job_runs','app_publish_jobs',
    'app_publications','app_metric_observations','app_audit_events','app_webhook_events',
    'app_model_registry'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
  end loop;
end $$;

-- organizations: members read; owners write
create policy org_read on app_organizations for select
  using (app.is_member(id));
create policy org_write on app_organizations for update
  using (app.has_role(id, array['owner']::app.member_role[]));

create policy member_read on app_organization_members for select
  using (app.is_member(organization_id));
create policy member_manage on app_organization_members for all
  using (app.has_role(organization_id, array['owner']::app.member_role[]))
  with check (app.has_role(organization_id, array['owner']::app.member_role[]));

-- pieces/campaigns: owner+operator CRUD; reviewer+analyst read
create policy pieces_read on app_pieces for select using (app.is_member(organization_id));
create policy pieces_write on app_pieces for all
  using (app.has_role(organization_id, array['owner','operator']::app.member_role[]))
  with check (app.has_role(organization_id, array['owner','operator']::app.member_role[]));
create policy campaigns_read on app_campaigns for select using (app.is_member(organization_id));
create policy campaigns_write on app_campaigns for all
  using (app.has_role(organization_id, array['owner','operator']::app.member_role[]))
  with check (app.has_role(organization_id, array['owner','operator']::app.member_role[]));

-- content items: members read; owner+operator submit; reviewer decides via approvals
create policy items_read on app_content_items for select using (app.is_member(organization_id));
create policy items_write on app_content_items for all
  using (app.has_role(organization_id, array['owner','operator']::app.member_role[]))
  with check (app.has_role(organization_id, array['owner','operator']::app.member_role[]));

-- approvals: reviewers+owners decide; reviewer cannot mutate facts (separate table)
create policy approvals_read on app_approvals for select using (app.is_member(organization_id));
create policy approvals_write on app_approvals for insert
  with check (
    app.has_role(organization_id, array['owner','reviewer']::app.member_role[])
    and reviewer_id = app.uid()
  );

-- Originals and rights proofs are never visible to analysts. Source rows have
-- no interactive write path; server-generated upload completion owns inserts.
create policy source_assets_read on app_source_assets for select
  using (app.has_role(organization_id, array['owner','operator','reviewer']::app.member_role[]));
create policy rights_read on app_rights_records for select
  using (app.has_role(organization_id, array['owner','operator','reviewer']::app.member_role[]));
create policy rights_write on app_rights_records for all
  using (app.has_role(organization_id, array['owner','operator']::app.member_role[]))
  with check (app.has_role(organization_id, array['owner','operator']::app.member_role[]));

create policy runs_read on app_factory_runs for select using (app.is_member(organization_id));
create policy runs_write on app_factory_runs for all
  using (app.has_role(organization_id, array['owner','operator']::app.member_role[]))
  with check (app.has_role(organization_id, array['owner','operator']::app.member_role[]));

create policy destinations_read on app_destinations for select using (app.is_member(organization_id));
create policy destinations_write on app_destinations for all
  using (app.has_role(organization_id, array['owner']::app.member_role[]))
  with check (app.has_role(organization_id, array['owner']::app.member_role[]));

-- The token reference column is intentionally visible only to owners until a
-- restricted account projection is added at the applied-database gate.
create policy accounts_owner_only on app_social_accounts for all
  using (app.has_role(organization_id, array['owner']::app.member_role[]))
  with check (app.has_role(organization_id, array['owner']::app.member_role[]));

-- Operational rows are readable to members but mutations are service/RPC-only.
create policy job_runs_read on app_job_runs for select using (app.is_member(organization_id));
create policy publish_jobs_read on app_publish_jobs for select using (app.is_member(organization_id));
create policy publications_read on app_publications for select using (app.is_member(organization_id));
create policy metrics_read on app_metric_observations for select using (app.is_member(organization_id));
create policy webhooks_owner_read on app_webhook_events for select
  using (app.has_role(organization_id, array['owner']::app.member_role[]));

-- join tables have no organization_id: gate them through their parent row
create policy attrs_read on app_asset_attributes for select
  using (exists (select 1 from app_source_assets a
    where a.id = asset_id and app.is_member(a.organization_id)));
create policy attrs_write on app_asset_attributes for all
  using (exists (select 1 from app_source_assets a
    where a.id = asset_id and app.has_role(a.organization_id, array['owner','operator']::app.member_role[])))
  with check (exists (select 1 from app_source_assets a
    where a.id = asset_id and app.has_role(a.organization_id, array['owner','operator']::app.member_role[])));

create policy item_assets_read on app_content_item_assets for select
  using (exists (select 1 from app_content_items c
    where c.id = content_item_id and app.is_member(c.organization_id)));
create policy item_assets_write on app_content_item_assets for all
  using (exists (select 1 from app_content_items c
    where c.id = content_item_id and app.has_role(c.organization_id, array['owner','operator']::app.member_role[])))
  with check (exists (select 1 from app_content_items c
    where c.id = content_item_id and app.has_role(c.organization_id, array['owner','operator']::app.member_role[])));

-- audit: members read own org; no member write path (service/definer only)
create policy audit_read on app_audit_events for select using (app.is_member(organization_id));

-- model_registry is global operational configuration. RLS is forced and no
-- interactive policy is created; a narrow service/admin grant is added only at apply.

revoke all on function app.is_member(uuid) from public, anon;
revoke all on function app.has_role(uuid, app.member_role[]) from public, anon;
grant execute on function app.is_member(uuid) to authenticated;
grant execute on function app.has_role(uuid, app.member_role[]) to authenticated;
