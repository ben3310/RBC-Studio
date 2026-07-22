-- RLS negative-case gate (§7.4). Runs against the applied database WITHOUT
-- Run through `supabase test db` only after the local runtime is authorized and
-- the migrations pass a local reset/lint. It seeds synthetic identities, proves
-- each isolation rule, then ROLLS BACK. Do not paste or run this against a linked
-- or shared project during the local gate.

create extension if not exists pgtap with schema extensions;

begin;
set local search_path = public, extensions;
select plan(1);

-- ---- synthetic identities (auth.users) ------------------------------------
insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('11111111-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','owner-a@test.local','{}','{}',now(),now()),
  ('11111111-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','operator-a@test.local','{}','{}',now(),now()),
  ('11111111-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','reviewer-a@test.local','{}','{}',now(),now()),
  ('11111111-0000-4000-8000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','analyst-a@test.local','{}','{}',now(),now()),
  ('22222222-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','owner-b@test.local','{}','{}',now(),now());

-- ---- two tenants -----------------------------------------------------------
insert into app_organizations (id, name, slug, default_timezone) values
  ('aaaaaaaa-0000-4000-8000-00000000000a','Org A','rls-org-a','UTC'),
  ('bbbbbbbb-0000-4000-8000-00000000000b','Org B','rls-org-b','UTC');

insert into app_organization_members (organization_id, user_id, role) values
  ('aaaaaaaa-0000-4000-8000-00000000000a','11111111-0000-4000-8000-000000000001','owner'),
  ('aaaaaaaa-0000-4000-8000-00000000000a','11111111-0000-4000-8000-000000000002','operator'),
  ('aaaaaaaa-0000-4000-8000-00000000000a','11111111-0000-4000-8000-000000000003','reviewer'),
  ('aaaaaaaa-0000-4000-8000-00000000000a','11111111-0000-4000-8000-000000000004','analyst'),
  ('bbbbbbbb-0000-4000-8000-00000000000b','22222222-0000-4000-8000-000000000001','owner');

-- ---- org A fixtures --------------------------------------------------------
insert into app_pieces (id, organization_id, archive_no, price_mode, price_amount_minor, price_currency) values
  ('a1111111-0000-4000-8000-000000000001','aaaaaaaa-0000-4000-8000-00000000000a','A-001','fixed',100000,'USD'),
  ('a1111111-0000-4000-8000-000000000002','aaaaaaaa-0000-4000-8000-00000000000a','A-002','on_request',null,null);
insert into app_pieces (id, organization_id, archive_no, price_mode, price_amount_minor, price_currency) values
  ('b1111111-0000-4000-8000-000000000001','bbbbbbbb-0000-4000-8000-00000000000b','B-001','fixed',200000,'EUR');

insert into app_campaigns (id, organization_id, piece_id, title, objective, story_angle) values
  ('a1212121-0000-4000-8000-000000000001','aaaaaaaa-0000-4000-8000-00000000000a',
   'a1111111-0000-4000-8000-000000000001','RLS synthetic campaign','drop','detail');

insert into app_source_assets (id, organization_id, piece_id, kind, storage_bucket, storage_key, sha256, mime_type) values
  ('a2222222-0000-4000-8000-000000000001','aaaaaaaa-0000-4000-8000-00000000000a','a1111111-0000-4000-8000-000000000001','product_original','product-originals',
   'org/aaaaaaaa-0000-4000-8000-00000000000a/piece/a1111111-0000-4000-8000-000000000001/source/a2222222-0000-4000-8000-000000000001/'||repeat('a',64),
   repeat('a',64),'image/png');

insert into app_destinations (id, organization_id, code, label, platform, kind, manual_only, requires_approval) values
  ('a3333333-0000-4000-8000-0000000000f1','aaaaaaaa-0000-4000-8000-00000000000a','flagship','Flagship','instagram','flagship',true,true),
  ('a3333333-0000-4000-8000-000000000051','aaaaaaaa-0000-4000-8000-00000000000a','education','Edu','instagram','satellite',false,true);

insert into app_social_accounts (id, organization_id, destination_id, platform, handle, token_secret_ref) values
  ('a4444444-0000-4000-8000-000000000001','aaaaaaaa-0000-4000-8000-00000000000a','a3333333-0000-4000-8000-000000000051','instagram','@edu_a','secretref://vault/token-a');

insert into app_content_items (id, organization_id, campaign_id, content_type, destination_id, format, cta_type, manual_only, status)
values ('a5555555-0000-4000-8000-0000000000f1','aaaaaaaa-0000-4000-8000-00000000000a',
        'a1212121-0000-4000-8000-000000000001','grid',
        'a3333333-0000-4000-8000-0000000000f1','feed','dm_acquire',true,'approved');

-- ---- role-switched assertions ---------------------------------------------
do $$
declare
  owner_a text := '11111111-0000-4000-8000-000000000001';
  operator_a text := '11111111-0000-4000-8000-000000000002';
  reviewer_a text := '11111111-0000-4000-8000-000000000003';
  analyst_a text := '11111111-0000-4000-8000-000000000004';
  n integer;
  raised boolean;
begin
  -- act as a given authenticated user
  -- (helper is inlined via set_config because SET ROLE cannot be parameterized)

  -- 1. positive control + cross-org isolation: owner A sees exactly 2 org-A pieces
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', owner_a, true);
  select count(*) into n from app_pieces;
  execute 'reset role';
  if n <> 2 then raise exception 'FAIL 1: owner A should see 2 pieces (own org only), saw %', n; end if;

  -- 2. owner A cannot see org B's piece
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', owner_a, true);
  select count(*) into n from app_pieces where organization_id = 'bbbbbbbb-0000-4000-8000-00000000000b';
  execute 'reset role';
  if n <> 0 then raise exception 'FAIL 2: owner A leaked % org-B pieces', n; end if;

  -- 3. owner B cannot see org A's pieces
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', '22222222-0000-4000-8000-000000000001', true);
  select count(*) into n from app_pieces where organization_id = 'aaaaaaaa-0000-4000-8000-00000000000a';
  execute 'reset role';
  if n <> 0 then raise exception 'FAIL 3: owner B leaked % org-A pieces', n; end if;

  -- 4. analyst cannot read originals (source_assets)
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', analyst_a, true);
  select count(*) into n from app_source_assets;
  execute 'reset role';
  if n <> 0 then raise exception 'FAIL 4: analyst read % source assets (originals must be hidden)', n; end if;

  -- 5. analyst cannot read token references (social_accounts)
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', analyst_a, true);
  select count(*) into n from app_social_accounts;
  execute 'reset role';
  if n <> 0 then raise exception 'FAIL 5: analyst read % social accounts (token refs must be hidden)', n; end if;

  -- 6. reviewer cannot mutate facts (update pieces): RLS filters the row, 0 updated
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', reviewer_a, true);
  update app_pieces set internal_name = 'tampered' where organization_id = 'aaaaaaaa-0000-4000-8000-00000000000a';
  get diagnostics n = row_count;
  execute 'reset role';
  if n <> 0 then raise exception 'FAIL 6: reviewer updated % piece rows (must be 0)', n; end if;

  -- 7. operator cannot create a publish job for a flagship / manual-only item
  raised := false;
  begin
    execute 'set local role authenticated';
    perform set_config('request.jwt.claim.sub', operator_a, true);
    insert into app_publish_jobs (organization_id, content_item_id, account_id, scheduled_for, idempotency_key)
    values ('aaaaaaaa-0000-4000-8000-00000000000a','a5555555-0000-4000-8000-0000000000f1',
            'a4444444-0000-4000-8000-000000000001', now() + interval '1 day', 'idem-test-1');
  exception when others then
    raised := true;
  end;
  execute 'reset role';
  if not raised then raise exception 'FAIL 7: operator created a publish job for a flagship/manual item (must be blocked)'; end if;

  -- 8. unauthenticated (anon) sees zero rows or receives permission denied
  raised := false;
  begin
    execute 'set local role anon';
    select count(*) into n from app_pieces;
  exception when insufficient_privilege then
    raised := true;
  end;
  execute 'reset role';
  if not raised and n <> 0 then raise exception 'FAIL 8: anon read % pieces (must be 0)', n; end if;

  -- 9. positive control: operator A can read own-org pieces (test is not trivially empty)
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', operator_a, true);
  select count(*) into n from app_pieces;
  execute 'reset role';
  if n <> 2 then raise exception 'FAIL 9: operator A should read 2 own-org pieces, saw %', n; end if;

  raise notice 'RLS NEGATIVE-CASE GATE PASSED: all 9 checks held.';
end $$;

select pass('all nine RLS role/isolation checks completed');
select * from finish();

-- leave no residue on the (staging) database
rollback;
