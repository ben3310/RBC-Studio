-- 14 · durable outbound GPU worker lease protocol (M2.2-M2.4)

alter table public.app_job_runs
  add column payload jsonb not null default '{}'::jsonb,
  add column output_uploads jsonb not null default '[]'::jsonb,
  add column model_policy jsonb not null default '{}'::jsonb,
  add column lease_token uuid,
  add column heartbeat_at timestamptz,
  add column cancel_requested_at timestamptz,
  add column max_attempts integer not null default 5 check (max_attempts between 1 and 20),
  add column result jsonb,
  add constraint ck_job_output_uploads_array check (jsonb_typeof(output_uploads) = 'array'),
  add constraint ck_job_payload_object check (jsonb_typeof(payload) = 'object'),
  add constraint ck_job_model_policy_object check (jsonb_typeof(model_policy) = 'object');

create or replace function public.worker_claim_job(
  p_queues text[], p_worker text, p_lease_seconds integer default 300
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_job public.app_job_runs;
begin
  if coalesce(array_length(p_queues, 1), 0) = 0
    or exists (select 1 from unnest(p_queues) q where q !~ '^[a-z][a-z0-9_]{1,63}$')
    or p_worker is null or length(trim(p_worker)) = 0
    or p_lease_seconds not between 30 and 900 then
    raise exception 'invalid worker claim parameters' using errcode = 'check_violation';
  end if;

  update public.app_job_runs
    set state = 'cancelled', finished_at = coalesce(finished_at, now()),
        lease_token = null, lease_expires_at = null
    where state in ('queued','leased') and cancel_requested_at is not null;

  update public.app_job_runs
    set state = 'dead', finished_at = coalesce(finished_at, now()),
        error_class = coalesce(error_class, 'lease_exhausted'),
        error_redacted = coalesce(error_redacted, 'Worker lease expired at the maximum attempt count.'),
        lease_token = null, lease_expires_at = null
    where state in ('leased','running') and lease_expires_at < now() and attempt >= max_attempts;

  select * into v_job from public.app_job_runs
    where queue_name = any(p_queues)
      and cancel_requested_at is null
      and attempt < max_attempts
      and (state = 'queued' or (state in ('leased','running') and lease_expires_at < now()))
    order by created_at, id
    for update skip locked
    limit 1;
  if not found then return null; end if;

  update public.app_job_runs set
      state = 'leased', worker_id = p_worker, attempt = attempt + 1,
      lease_token = gen_random_uuid(), heartbeat_at = now(),
      lease_expires_at = now() + make_interval(secs => p_lease_seconds),
      started_at = coalesce(started_at, now()), finished_at = null,
      error_class = null, error_redacted = null
    where id = v_job.id
    returning * into v_job;

  return jsonb_build_object(
    'schema_version', 1,
    'job_id', v_job.id,
    'queue_name', v_job.queue_name,
    'job_type', v_job.job_type,
    'attempt', v_job.attempt,
    'lease_token', v_job.lease_token,
    'lease_expires_at', v_job.lease_expires_at,
    'input', v_job.payload,
    'output_uploads', v_job.output_uploads,
    'model_policy', v_job.model_policy
  );
end $$;

create or replace function public.worker_heartbeat_job(
  p_job uuid, p_worker text, p_lease_token uuid, p_lease_seconds integer default 300
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_job public.app_job_runs;
begin
  if p_lease_seconds not between 30 and 900 then
    raise exception 'invalid lease duration' using errcode = 'check_violation';
  end if;
  select * into v_job from public.app_job_runs where id = p_job for update;
  if not found or v_job.worker_id is distinct from p_worker
    or v_job.lease_token is distinct from p_lease_token
    or v_job.state not in ('leased','running') then
    return jsonb_build_object('ok', false, 'cancelled', false, 'reason', 'lease_lost');
  end if;
  if v_job.cancel_requested_at is not null then
    update public.app_job_runs set state = 'cancelled', finished_at = now(),
      lease_token = null, lease_expires_at = null where id = p_job;
    return jsonb_build_object('ok', false, 'cancelled', true, 'reason', 'cancel_requested');
  end if;
  if v_job.lease_expires_at < now() then
    return jsonb_build_object('ok', false, 'cancelled', false, 'reason', 'lease_expired');
  end if;
  update public.app_job_runs set state = 'running', heartbeat_at = now(),
    lease_expires_at = now() + make_interval(secs => p_lease_seconds)
    where id = p_job;
  return jsonb_build_object('ok', true, 'cancelled', false);
end $$;

create or replace function public.worker_complete_job(
  p_job uuid, p_worker text, p_lease_token uuid, p_result jsonb, p_output_hash text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_job public.app_job_runs;
begin
  if p_result is null or jsonb_typeof(p_result) <> 'object'
    or p_output_hash is null or p_output_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid completion payload' using errcode = 'check_violation';
  end if;
  select * into v_job from public.app_job_runs where id = p_job for update;
  if not found then raise exception 'job not found' using errcode = 'no_data_found'; end if;
  if v_job.state = 'succeeded' then
    if v_job.output_hash = p_output_hash and v_job.result = p_result then
      return jsonb_build_object('ok', true, 'idempotent', true);
    end if;
    raise exception 'conflicting duplicate completion' using errcode = 'unique_violation';
  end if;
  if v_job.cancel_requested_at is not null then
    update public.app_job_runs set state = 'cancelled', finished_at = now(),
      lease_token = null, lease_expires_at = null where id = p_job;
    return jsonb_build_object('ok', false, 'cancelled', true);
  end if;
  if v_job.worker_id is distinct from p_worker or v_job.lease_token is distinct from p_lease_token
    or v_job.state not in ('leased','running') or v_job.lease_expires_at < now() then
    raise exception 'worker lease lost' using errcode = 'insufficient_privilege';
  end if;
  update public.app_job_runs set state = 'succeeded', result = p_result,
    output_hash = p_output_hash,
    duration_ms = case when p_result->>'duration_ms' ~ '^[0-9]+$'
      then nullif((p_result->>'duration_ms')::integer, 0) else null end,
    finished_at = now(), heartbeat_at = now(), lease_token = null, lease_expires_at = null
    where id = p_job;
  return jsonb_build_object('ok', true, 'idempotent', false);
end $$;

create or replace function public.worker_fail_job(
  p_job uuid, p_worker text, p_lease_token uuid, p_error_class text,
  p_error_redacted text, p_retryable boolean default false
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_job public.app_job_runs; v_state text;
begin
  select * into v_job from public.app_job_runs where id = p_job for update;
  if not found or v_job.worker_id is distinct from p_worker
    or v_job.lease_token is distinct from p_lease_token
    or v_job.state not in ('leased','running') then
    raise exception 'worker lease lost' using errcode = 'insufficient_privilege';
  end if;
  v_state := case
    when v_job.cancel_requested_at is not null then 'cancelled'
    when p_retryable and v_job.attempt < v_job.max_attempts then 'queued'
    when v_job.attempt >= v_job.max_attempts then 'dead'
    else 'failed'
  end;
  update public.app_job_runs set state = v_state,
    error_class = left(coalesce(p_error_class, 'worker_error'), 120),
    error_redacted = left(coalesce(p_error_redacted, 'Worker processing failed.'), 500),
    finished_at = case when v_state = 'queued' then null else now() end,
    worker_id = case when v_state = 'queued' then null else worker_id end,
    lease_token = null, lease_expires_at = null
    where id = p_job;
  return jsonb_build_object('ok', true, 'state', v_state);
end $$;

create or replace function public.request_job_cancel(p_job uuid)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_org uuid;
begin
  select organization_id into v_org from public.app_job_runs where id = p_job;
  if v_org is null or not app.has_role(v_org, array['owner','operator']::app.member_role[]) then
    raise exception 'not authorized to cancel job' using errcode = 'insufficient_privilege';
  end if;
  update public.app_job_runs set cancel_requested_at = coalesce(cancel_requested_at, now()),
    state = case when state = 'queued' then 'cancelled' else state end,
    finished_at = case when state = 'queued' then now() else finished_at end
    where id = p_job and state in ('queued','leased','running');
  return found;
end $$;

revoke all on function public.worker_claim_job(text[],text,integer) from public, anon, authenticated;
revoke all on function public.worker_heartbeat_job(uuid,text,uuid,integer) from public, anon, authenticated;
revoke all on function public.worker_complete_job(uuid,text,uuid,jsonb,text) from public, anon, authenticated;
revoke all on function public.worker_fail_job(uuid,text,uuid,text,text,boolean) from public, anon, authenticated;
grant execute on function public.worker_claim_job(text[],text,integer) to service_role;
grant execute on function public.worker_heartbeat_job(uuid,text,uuid,integer) to service_role;
grant execute on function public.worker_complete_job(uuid,text,uuid,jsonb,text) to service_role;
grant execute on function public.worker_fail_job(uuid,text,uuid,text,text,boolean) to service_role;

revoke all on function public.request_job_cancel(uuid) from public, anon;
grant execute on function public.request_job_cancel(uuid) to authenticated;
