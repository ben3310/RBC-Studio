-- Runtime smoke tests for the first authorized local Supabase reset.
-- These do not run until the operator installs the CLI/container runtime.
create extension if not exists pgtap with schema extensions;

begin;
set local search_path = public, extensions;
select plan(17);

select has_table('public', 'app_organizations', 'organizations table exists');
select has_table('public', 'app_source_assets', 'source assets table exists');
select has_table('public', 'app_content_items', 'content items table exists');
select has_table('public', 'app_destinations', 'destinations table exists');
select has_table('public', 'app_publish_jobs', 'publish jobs table exists');

select is(
  (
    select count(*)
    from pg_class
    where relnamespace = 'public'::regnamespace
      and relname like 'app_%'
      and relrowsecurity
      and relforcerowsecurity
  ),
  20::bigint,
  'all 20 core tables have forced RLS'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.app_destinations'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%manual_only%'
      and pg_get_constraintdef(oid) like '%requires_approval%'
  ),
  'flagship check constraint exists'
);

select ok(
  exists (select 1 from pg_trigger
    where tgrelid = 'public.app_destinations'::regclass
      and tgname = 'trg_flagship_guard' and tgenabled <> 'D'),
  'flagship update/delete trigger is enabled'
);
select ok(
  exists (select 1 from pg_trigger
    where tgrelid = 'public.app_source_assets'::regclass
      and tgname = 'trg_source_asset_no_update' and tgenabled <> 'D'),
  'source asset immutability trigger is enabled'
);
select ok(
  exists (select 1 from pg_trigger
    where tgrelid = 'public.app_approvals'::regclass
      and tgname = 'trg_approval_validate' and tgenabled <> 'D'),
  'approval validation trigger is enabled'
);
select ok(
  exists (select 1 from pg_trigger
    where tgrelid = 'public.app_publish_jobs'::regclass
      and tgname = 'trg_publish_job_validate' and tgenabled <> 'D'),
  'publish-job validation trigger is enabled'
);

select is(
  (
    select count(*) from pg_constraint
    where conname in (
      'fk_campaign_piece_org','fk_asset_piece_org','fk_asset_campaign_org',
      'fk_asset_parent_org','fk_rights_asset_org','fk_run_campaign_org',
      'fk_item_run_org','fk_item_campaign_org','fk_item_destination_org',
      'fk_item_account_org','fk_approval_item_org','fk_account_destination_org',
      'fk_publish_item_org','fk_publish_account_org','fk_publication_job_org',
      'fk_publication_account_org','fk_metric_publication_org'
    )
  ),
  17::bigint,
  'all tenant-safe relationship constraints exist'
);

select ok(
  not has_function_privilege('anon', 'app.request_upload_intent(uuid,uuid,uuid,text,text)', 'execute'),
  'anon cannot execute upload-intent RPC'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'app.complete_source_asset(uuid,uuid,uuid,app.asset_kind,text,text,text,text,bigint,integer,integer)',
    'execute'
  ),
  'authenticated cannot execute gated source-completion RPC'
);
select ok(
  not has_function_privilege('authenticated', 'app.claim_job(text,text,integer)', 'execute'),
  'authenticated cannot execute worker claim RPC'
);

select is(
  (select count(*) from storage.buckets where public),
  0::bigint,
  'all storage buckets are private'
);
select is(
  (
    select count(*) from app_destinations
    where code = 'flagship' and kind = 'flagship'
      and manual_only and requires_approval
  ),
  1::bigint,
  'synthetic seed contains one locked flagship destination'
);

select * from finish();
rollback;
