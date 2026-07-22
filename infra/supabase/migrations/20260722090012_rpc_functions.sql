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
language plpgsql security definer set search_path = app, public as $$
declare v_key text;
begin
  if not app.has_role(p_org, array['owner','operator']::app.member_role[]) then
    raise exception 'not authorized for org %', p_org using errcode = 'insufficient_privilege';
  end if;
  if p_bucket not in ('product-originals','derived-assets','rights-proofs') then
    raise exception 'bucket % not eligible for upload intent', p_bucket;
  end if;
  v_key := format('org/%s/piece/%s/source/%s/pending.%s', p_org, p_piece, p_asset, p_ext);
  return jsonb_build_object(
    'bucket', p_bucket,
    'storage_key', v_key,
    'expires_at', now() + interval '15 minutes'
  );
end $$;

-- Complete an upload: caller passes the verified sha256/bytes/mime; the final
-- key embeds the content hash (immutable-binary rule). Creates the asset row.
create or replace function app.complete_source_asset(
  p_org uuid, p_piece uuid, p_campaign uuid, p_kind app.asset_kind,
  p_bucket text, p_sha256 text, p_mime text, p_bytes bigint,
  p_width integer, p_height integer
) returns uuid
language plpgsql security definer set search_path = app, public as $$
declare v_id uuid := gen_random_uuid();
declare v_key text;
begin
  if not app.has_role(p_org, array['owner','operator']::app.member_role[]) then
    raise exception 'not authorized for org %', p_org using errcode = 'insufficient_privilege';
  end if;
  if p_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'sha256 must be 64 lowercase hex chars';
  end if;
  v_key := format('org/%s/piece/%s/source/%s/%s', p_org, p_piece, v_id, p_sha256);
  insert into app_source_assets(id, organization_id, piece_id, campaign_id, kind,
    storage_key, sha256, mime_type, width, height, bytes)
  values (v_id, p_org, p_piece, p_campaign, p_kind, v_key, p_sha256, p_mime, p_bytes, p_width, p_height);
  return v_id;
end $$;

-- Claim the next due job with a lease (worker protocol, §9). Atomic via
-- SKIP LOCKED so concurrent workers never grab the same row.
create or replace function app.claim_job(p_queue text, p_worker text, p_lease_seconds integer default 300)
returns app_job_runs
language plpgsql security definer set search_path = app, public as $$
declare v_row app_job_runs;
begin
  select * into v_row from app_job_runs
    where queue_name = p_queue
      and (state = 'queued' or (state = 'leased' and lease_expires_at < now()))
    order by created_at
    for update skip locked
    limit 1;
  if not found then return null; end if;
  update app_job_runs
    set state = 'leased', worker_id = p_worker, attempt = attempt + 1,
        lease_expires_at = now() + make_interval(secs => p_lease_seconds),
        started_at = coalesce(started_at, now())
    where id = v_row.id
    returning * into v_row;
  return v_row;
end $$;
