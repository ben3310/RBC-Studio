-- 12 · RPC functions (§7.5 upload intents, §9 job claim)
-- SECURITY DEFINER functions are the only path that writes server-generated
-- storage keys and claims jobs. Bodies here are the reference implementation;
-- grants to specific roles are applied in the gated Milestone 1 apply step.

-- Request an upload intent: server generates the key, constrains bucket/mime/
-- bytes/hash/expiry. The caller uploads to the returned key, then calls
-- app.complete_source_asset to verify and register the row.
create or replace function app.request_upload_intent(
  p_org uuid, p_piece uuid, p_asset uuid, p_bucket text, p_ext text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_key text;
begin
  if not app.has_role(p_org, array['owner','operator']::app.member_role[]) then
    raise exception 'not authorized for org %', p_org using errcode = 'insufficient_privilege';
  end if;
  if p_bucket not in ('product-originals','derived-assets','rights-proofs') then
    raise exception 'bucket % not eligible for upload intent', p_bucket;
  end if;
  if p_ext !~ '^[a-z0-9]{2,5}$' then
    raise exception 'file extension is invalid' using errcode = 'check_violation';
  end if;
  if not exists (
    select 1 from public.app_pieces
    where id = p_piece and organization_id = p_org
  ) then
    raise exception 'piece does not belong to organization'
      using errcode = 'foreign_key_violation';
  end if;
  v_key := format('org/%s/piece/%s/source/%s/pending.%s', p_org, p_piece, p_asset, p_ext);
  return jsonb_build_object(
    'bucket', p_bucket,
    'storage_key', v_key,
    'expires_at', now() + interval '15 minutes'
  );
end $$;

-- Complete an upload after the trusted upload service has moved it to the final
-- hash-bearing key. The function confirms object presence and metadata before
-- registering the immutable row; public/authenticated execution stays revoked.
create or replace function app.complete_source_asset(
  p_org uuid, p_piece uuid, p_campaign uuid, p_kind app.asset_kind,
  p_bucket text, p_storage_key text, p_sha256 text, p_mime text, p_bytes bigint,
  p_width integer, p_height integer
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid := gen_random_uuid();
begin
  if not app.has_role(p_org, array['owner','operator']::app.member_role[]) then
    raise exception 'not authorized for org %', p_org using errcode = 'insufficient_privilege';
  end if;
  if p_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'sha256 must be 64 lowercase hex chars';
  end if;
  if p_bucket not in ('product-originals','derived-assets') then
    raise exception 'bucket % cannot contain a source asset', p_bucket;
  end if;
  if app.storage_org(p_storage_key) is distinct from p_org
    or split_part(p_storage_key, '/', 3) <> 'piece'
    or split_part(p_storage_key, '/', 4) <> p_piece::text
    or position('/' || p_sha256 || '.' in p_storage_key) = 0 then
    raise exception 'final storage key does not match organization, piece, and hash'
      using errcode = 'check_violation';
  end if;
  if not exists (
    select 1 from public.app_pieces where id = p_piece and organization_id = p_org
  ) or (p_campaign is not null and not exists (
    select 1 from public.app_campaigns
    where id = p_campaign and piece_id = p_piece and organization_id = p_org
  )) then
    raise exception 'piece/campaign does not belong to organization'
      using errcode = 'foreign_key_violation';
  end if;
  if not exists (
    select 1 from storage.objects
    where bucket_id = p_bucket and name = p_storage_key
      and coalesce((metadata->>'size')::bigint, p_bytes) = p_bytes
      and coalesce(metadata->>'mimetype', p_mime) = p_mime
  ) then
    raise exception 'uploaded object or expected metadata not found'
      using errcode = 'foreign_key_violation';
  end if;
  insert into public.app_source_assets(id, organization_id, piece_id, campaign_id, kind,
    storage_bucket, storage_key, sha256, mime_type, width, height, bytes)
  values (v_id, p_org, p_piece, p_campaign, p_kind,
    p_bucket, p_storage_key, p_sha256, p_mime, p_width, p_height, p_bytes);
  return v_id;
end $$;

-- Claim the next due job with a lease (worker protocol, §9). Atomic via
-- SKIP LOCKED so concurrent workers never grab the same row.
create or replace function app.claim_job(p_queue text, p_worker text, p_lease_seconds integer default 300)
returns public.app_job_runs
language plpgsql security definer set search_path = '' as $$
declare v_row public.app_job_runs;
begin
  if p_queue !~ '^[a-z][a-z0-9_]{1,63}$' or p_worker is null
    or length(trim(p_worker)) = 0 or p_lease_seconds not between 30 and 900 then
    raise exception 'invalid queue claim parameters' using errcode = 'check_violation';
  end if;
  select * into v_row from public.app_job_runs
    where queue_name = p_queue
      and (state = 'queued' or (state = 'leased' and lease_expires_at < now()))
    order by created_at
    for update skip locked
    limit 1;
  if not found then return null; end if;
  update public.app_job_runs
    set state = 'leased', worker_id = p_worker, attempt = attempt + 1,
        lease_expires_at = now() + make_interval(secs => p_lease_seconds),
        started_at = coalesce(started_at, now())
    where id = v_row.id
    returning * into v_row;
  return v_row;
end $$;

-- PostgreSQL grants function execution to PUBLIC by default. These definer RPCs
-- are inert until the gated apply step creates narrow grants for their callers.
revoke all on function app.request_upload_intent(uuid,uuid,uuid,text,text)
  from public, anon, authenticated;
revoke all on function app.complete_source_asset(
  uuid,uuid,uuid,app.asset_kind,text,text,text,text,bigint,integer,integer
) from public, anon, authenticated;
revoke all on function app.claim_job(text,text,integer)
  from public, anon, authenticated;
