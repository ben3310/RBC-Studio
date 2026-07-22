-- 13 · explicit local-to-remote campaign sync bridge (M1.10)
-- Forward-only because migrations 01-12 are reported applied to staging.

alter table public.app_pieces
  add column external_ref text,
  add constraint ck_piece_external_ref
    check (external_ref is null or length(trim(external_ref)) between 1 and 200),
  add constraint uq_piece_org_external_ref unique (organization_id, external_ref);

alter table public.app_campaigns
  add column external_ref text,
  add column local_schema_version text,
  add column piece_fingerprint text,
  add column last_sync_idempotency_key text,
  add constraint ck_campaign_external_ref
    check (external_ref is null or length(trim(external_ref)) between 1 and 200),
  add constraint ck_campaign_piece_fingerprint
    check (piece_fingerprint is null or piece_fingerprint ~ '^[0-9a-f]{8,64}$'),
  add constraint uq_campaign_org_external_ref unique (organization_id, external_ref),
  add constraint uq_campaign_org_sync_key unique (organization_id, last_sync_idempotency_key);

create or replace function public.sync_local_campaign(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_org uuid;
  v_org_count integer;
  v_local_id text := nullif(trim(payload->>'local_campaign_id'), '');
  v_schema_version text := nullif(trim(payload->>'local_schema_version'), '');
  v_fingerprint text := lower(nullif(trim(payload->>'piece_fingerprint'), ''));
  v_idempotency_key text := nullif(trim(payload->>'idempotency_key'), '');
  v_snapshot jsonb := payload->'local_snapshot';
  v_fields jsonb;
  v_archive_no text;
  v_piece_ref text;
  v_currency text;
  v_price_text text;
  v_price_mode text;
  v_price_minor bigint;
  v_piece_id uuid;
  v_campaign_id uuid;
  v_existing_key text;
  v_existing_fingerprint text;
  v_existing_snapshot jsonb;
  v_target_region text;
begin
  if v_user is null then
    raise exception 'authentication required' using errcode = 'insufficient_privilege';
  end if;
  if payload is null or jsonb_typeof(payload) <> 'object'
    or v_snapshot is null or jsonb_typeof(v_snapshot) <> 'object' then
    raise exception 'payload and local_snapshot must be JSON objects' using errcode = 'check_violation';
  end if;
  if v_local_id is null or length(v_local_id) > 160
    or v_schema_version is null or length(v_schema_version) > 40
    or v_fingerprint is null or v_fingerprint !~ '^[0-9a-f]{8,64}$'
    or v_idempotency_key is null or length(v_idempotency_key) > 240 then
    raise exception 'invalid local sync identity' using errcode = 'check_violation';
  end if;

  if nullif(payload->>'organization_id', '') is not null then
    begin
      v_org := (payload->>'organization_id')::uuid;
    exception when invalid_text_representation then
      raise exception 'organization_id must be a UUID' using errcode = 'check_violation';
    end;
  else
    select count(*)
      into v_org_count
      from public.app_organization_members m
      where m.user_id = v_user and m.role in ('owner','operator');
    if v_org_count <> 1 then
      raise exception 'organization_id is required when the user has % writable organizations', v_org_count
        using errcode = 'check_violation';
    end if;
    select m.organization_id into v_org
      from public.app_organization_members m
      where m.user_id = v_user and m.role in ('owner','operator');
  end if;
  if not app.has_role(v_org, array['owner','operator']::app.member_role[]) then
    raise exception 'not authorized for organization' using errcode = 'insufficient_privilege';
  end if;

  v_fields := coalesce(v_snapshot->'fields', '{}'::jsonb);
  if jsonb_typeof(v_fields) <> 'object' then
    raise exception 'local_snapshot.fields must be an object' using errcode = 'check_violation';
  end if;
  v_archive_no := nullif(trim(v_fields->>'fNo'), '');
  if v_archive_no is null or length(v_archive_no) > 120 then
    raise exception 'archive number is required' using errcode = 'check_violation';
  end if;
  v_piece_ref := 'local-campaign:' || v_local_id;

  v_currency := upper(coalesce(nullif(trim(v_fields->>'priceCurrency'), ''), ''));
  v_price_text := regexp_replace(coalesce(v_fields->>'fPrice', ''), '[^0-9.]', '', 'g');
  if v_currency = 'POA' or v_price_text = '' then
    v_price_mode := 'on_request';
    v_currency := null;
    v_price_minor := null;
  else
    if v_currency !~ '^[A-Z]{3}$' then
      raise exception 'fixed pricing requires a three-letter currency' using errcode = 'check_violation';
    end if;
    begin
      v_price_minor := round(v_price_text::numeric * 100)::bigint;
    exception when invalid_text_representation or numeric_value_out_of_range then
      raise exception 'price is invalid' using errcode = 'check_violation';
    end;
    if v_price_minor <= 0 then
      raise exception 'fixed price must be positive' using errcode = 'check_violation';
    end if;
    v_price_mode := 'fixed';
  end if;

  select c.id, c.piece_id, c.last_sync_idempotency_key,
         c.piece_fingerprint, c.local_snapshot
    into v_campaign_id, v_piece_id, v_existing_key,
         v_existing_fingerprint, v_existing_snapshot
    from public.app_campaigns c
    where c.organization_id = v_org and c.external_ref = v_local_id
    for update;

  if found and v_existing_key = v_idempotency_key then
    if v_existing_fingerprint is distinct from v_fingerprint
      or v_existing_snapshot is distinct from v_snapshot then
      raise exception 'idempotency key was already used with different input'
        using errcode = 'unique_violation';
    end if;
    return jsonb_build_object(
      'campaign_id', v_campaign_id,
      'piece_id', v_piece_id,
      'upload_intents', '[]'::jsonb,
      'unchanged', true
    );
  end if;

  if v_piece_id is null then
    select p.id into v_piece_id
      from public.app_pieces p
      where p.organization_id = v_org
        and (p.external_ref = v_piece_ref
          or (p.archive_no = v_archive_no and p.external_ref is null))
      order by (p.external_ref = v_piece_ref) desc
      limit 1
      for update;
  end if;
  if v_piece_id is null then
    insert into public.app_pieces(
      organization_id, archive_no, external_ref, internal_name, public_name,
      price_amount_minor, price_currency, price_mode, material, condition,
      authentication, provenance, detail, acquisition_route, product_url
    ) values (
      v_org, v_archive_no, v_piece_ref,
      nullif(trim(v_fields->>'fName'), ''), nullif(trim(v_fields->>'fName'), ''),
      v_price_minor, v_currency, v_price_mode,
      nullif(trim(v_fields->>'fMaterial'), ''), nullif(trim(v_fields->>'fCondition'), ''),
      nullif(trim(v_fields->>'fAuth'), ''), nullif(trim(v_fields->>'fProv'), ''),
      nullif(trim(v_fields->>'fDetail'), ''), nullif(trim(v_fields->>'acquisitionRoute'), ''),
      nullif(trim(v_fields->>'productUrl'), '')
    ) returning id into v_piece_id;
  else
    update public.app_pieces set
      archive_no = v_archive_no,
      external_ref = v_piece_ref,
      internal_name = nullif(trim(v_fields->>'fName'), ''),
      public_name = nullif(trim(v_fields->>'fName'), ''),
      price_amount_minor = v_price_minor,
      price_currency = v_currency,
      price_mode = v_price_mode,
      material = nullif(trim(v_fields->>'fMaterial'), ''),
      condition = nullif(trim(v_fields->>'fCondition'), ''),
      authentication = nullif(trim(v_fields->>'fAuth'), ''),
      provenance = nullif(trim(v_fields->>'fProv'), ''),
      detail = nullif(trim(v_fields->>'fDetail'), ''),
      acquisition_route = nullif(trim(v_fields->>'acquisitionRoute'), ''),
      product_url = nullif(trim(v_fields->>'productUrl'), '')
    where id = v_piece_id and organization_id = v_org;
  end if;

  v_target_region := case v_fields->>'targetRegion'
    when 'auNz' then 'au_nz'
    when 'sun' then 'follow_the_sun'
    else nullif(v_fields->>'targetRegion', '')
  end;
  if v_campaign_id is null then
    insert into public.app_campaigns(
      organization_id, piece_id, external_ref, title, objective, story_angle,
      campaign_date, target_region, spelling_mode, local_snapshot,
      local_schema_version, piece_fingerprint, last_sync_idempotency_key
    ) values (
      v_org, v_piece_id, v_local_id,
      coalesce(nullif(trim(v_snapshot->>'title'), ''), nullif(trim(v_fields->>'fName'), '')),
      coalesce(nullif(v_fields->>'campaignObjective', ''), 'acquire'),
      coalesce(nullif(v_fields->>'storyAngle', ''), 'provenance'),
      nullif(v_fields->>'campaignDate', '')::date,
      v_target_region,
      coalesce(nullif(v_fields->>'copySpelling', ''), 'american'),
      v_snapshot, v_schema_version, v_fingerprint, v_idempotency_key
    ) returning id into v_campaign_id;
  else
    update public.app_campaigns set
      piece_id = v_piece_id,
      title = coalesce(nullif(trim(v_snapshot->>'title'), ''), nullif(trim(v_fields->>'fName'), '')),
      objective = coalesce(nullif(v_fields->>'campaignObjective', ''), 'acquire'),
      story_angle = coalesce(nullif(v_fields->>'storyAngle', ''), 'provenance'),
      campaign_date = nullif(v_fields->>'campaignDate', '')::date,
      target_region = v_target_region,
      spelling_mode = coalesce(nullif(v_fields->>'copySpelling', ''), 'american'),
      local_snapshot = v_snapshot,
      local_schema_version = v_schema_version,
      piece_fingerprint = v_fingerprint,
      last_sync_idempotency_key = v_idempotency_key
    where id = v_campaign_id and organization_id = v_org;
  end if;

  insert into public.app_audit_events(
    organization_id, actor_type, actor_id, action, entity_type, entity_id,
    request_id, after_hash, metadata
  ) values (
    v_org, 'user', v_user, 'campaign.sync_local', 'campaign', v_campaign_id,
    v_idempotency_key, v_fingerprint,
    jsonb_build_object('local_campaign_id', v_local_id, 'schema_version', v_schema_version)
  );

  return jsonb_build_object(
    'campaign_id', v_campaign_id,
    'piece_id', v_piece_id,
    'upload_intents', '[]'::jsonb,
    'unchanged', false
  );
end $$;

revoke all on function public.sync_local_campaign(jsonb) from public, anon;
grant execute on function public.sync_local_campaign(jsonb) to authenticated;
