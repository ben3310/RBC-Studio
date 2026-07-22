-- 11 · storage buckets and policies (§7.5)
-- Private buckets only. Public delivery uses a separate approved projection,
-- never a public original bucket. Storage keys are server-generated (see RPC in
-- migration 12); clients never choose their own paths.

insert into storage.buckets (id, name, public)
values
  ('product-originals','product-originals', false),
  ('derived-assets','derived-assets', false),
  ('rights-proofs','rights-proofs', false),
  ('factory-exports','factory-exports', false),
  ('benchmark-private','benchmark-private', false)
on conflict (id) do nothing;

-- helper: extract the org id from the first path segment "org/{uuid}/..."
create or replace function app.storage_org(objname text)
returns uuid language sql immutable as $$
  select case
    when split_part(objname, '/', 1) = 'org'
      and split_part(objname, '/', 2) ~
        '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    then split_part(objname, '/', 2)::uuid
    else null
  end
$$;

-- Originals and proofs exclude analysts. Only owner/operator may write. The
-- worker/publisher services receive short-lived signed URLs minted by RPC
-- (migration 12) and do not rely on these interactive policies.
create policy product_originals_read on storage.objects for select
  using (bucket_id = 'product-originals' and
    app.has_role(app.storage_org(name), array['owner','operator','reviewer']::app.member_role[]));
create policy product_originals_write on storage.objects for insert
  with check (bucket_id = 'product-originals' and
    app.has_role(app.storage_org(name), array['owner','operator']::app.member_role[]));

create policy derived_assets_read on storage.objects for select
  using (bucket_id = 'derived-assets' and
    app.has_role(app.storage_org(name), array['owner','operator','reviewer']::app.member_role[]));
create policy derived_assets_write on storage.objects for insert
  with check (bucket_id = 'derived-assets' and
    app.has_role(app.storage_org(name), array['owner','operator']::app.member_role[]));

create policy rights_proofs_read on storage.objects for select
  using (bucket_id = 'rights-proofs' and
    app.has_role(app.storage_org(name), array['owner','operator']::app.member_role[]));
create policy rights_proofs_write on storage.objects for insert
  with check (bucket_id = 'rights-proofs' and
    app.has_role(app.storage_org(name), array['owner','operator']::app.member_role[]));

create policy factory_exports_read on storage.objects for select
  using (bucket_id = 'factory-exports' and
    app.has_role(app.storage_org(name), array['owner','operator']::app.member_role[]));
create policy factory_exports_write on storage.objects for insert
  with check (bucket_id = 'factory-exports' and
    app.has_role(app.storage_org(name), array['owner','operator']::app.member_role[]));

-- benchmark-private is local/staging evaluation only: no interactive policy is
-- created, so it is unreachable via anon/authenticated roles by default.
