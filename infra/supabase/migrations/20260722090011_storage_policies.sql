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
  select nullif((string_to_array(objname, '/'))[2], '')::uuid
$$;

-- Members of the owning org may read; only owner/operator may write. The
-- worker/publisher services receive short-lived signed URLs minted by RPC
-- (migration 12) and do not rely on these interactive policies.
do $$
declare b text;
begin
  foreach b in array array['product-originals','derived-assets','rights-proofs','factory-exports'] loop
    execute format($p$
      create policy %1$s_read on storage.objects for select
        using (bucket_id = %2$L and app.is_member(app.storage_org(name)))$p$, replace(b,'-','_'), b);
    execute format($p$
      create policy %1$s_write on storage.objects for insert
        with check (bucket_id = %2$L
          and app.has_role(app.storage_org(name), array['owner','operator']::app.member_role[]))$p$,
      replace(b,'-','_'), b);
  end loop;
end $$;

-- benchmark-private is local/staging evaluation only: no interactive policy is
-- created, so it is unreachable via anon/authenticated roles by default.
