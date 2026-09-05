-- =========================================================
-- Observe candidate state
--
-- candidate_statesへの観測結果を原子的に反映する。
--
-- first_seen:
--   初回観測
--
-- unchanged:
--   前回とfingerprintが同じ
--
-- changed:
--   fingerprintが変化
-- =========================================================

create or replace function public.observe_candidate_state(
  p_sheet_source_id uuid,
  p_candidate_hmac text,
  p_fingerprint text,
  p_observed_at timestamptz default now()
)
returns table (
  observation_status text,
  result_first_seen_at timestamptz,
  result_last_seen_at timestamptz,
  result_last_changed_at timestamptz
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_inserted_count integer;

  v_current_fingerprint text;

  v_first_seen_at timestamptz;
  v_last_seen_at timestamptz;
  v_last_changed_at timestamptz;
begin

  -- -------------------------------------------------------
  -- Input validation
  -- -------------------------------------------------------

  if p_candidate_hmac !~ '^[0-9a-f]{64}$' then
    raise exception
      using
        errcode = '22023',
        message = 'candidate_hmac must be a 64-character lowercase hex SHA-256 value';
  end if;


  if p_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception
      using
        errcode = '22023',
        message = 'fingerprint must be a 64-character lowercase hex SHA-256 value';
  end if;


  -- -------------------------------------------------------
  -- Try first insert.
  --
  -- ON CONFLICT DO NOTHINGを使うことで、
  -- 同じCandidateが並行して初回観測されても
  -- PK違反で失敗しない。
  -- -------------------------------------------------------

  insert into public.candidate_states (
    sheet_source_id,
    candidate_hmac,
    fingerprint,
    first_seen_at,
    last_seen_at,
    last_changed_at
  )
  values (
    p_sheet_source_id,
    p_candidate_hmac::char(64),
    p_fingerprint::char(64),
    p_observed_at,
    p_observed_at,
    p_observed_at
  )
  on conflict (
    sheet_source_id,
    candidate_hmac
  )
  do nothing;


  get diagnostics
    v_inserted_count = row_count;


  -- -------------------------------------------------------
  -- First observation
  -- -------------------------------------------------------

  if v_inserted_count = 1 then

    return query
    select
      'first_seen'::text,
      p_observed_at,
      p_observed_at,
      p_observed_at;

    return;

  end if;


  -- -------------------------------------------------------
  -- Existing state
  --
  -- FOR UPDATEで、このCandidateの更新を直列化する。
  -- -------------------------------------------------------

  select
    cs.fingerprint::text,
    cs.first_seen_at,
    cs.last_seen_at,
    cs.last_changed_at
  into
    v_current_fingerprint,
    v_first_seen_at,
    v_last_seen_at,
    v_last_changed_at
  from public.candidate_states cs
  where
    cs.sheet_source_id = p_sheet_source_id
    and
    cs.candidate_hmac =
      p_candidate_hmac::char(64)
  for update;


  if not found then
    raise exception
      'candidate state disappeared during observation';
  end if;


  -- -------------------------------------------------------
  -- 古いScanが後から到着した場合に
  -- 状態を巻き戻さない。
  -- -------------------------------------------------------

  if p_observed_at < v_last_seen_at then
    raise exception
      using
        errcode = '22023',
        message = 'observed_at must not be earlier than last_seen_at';
  end if;


  -- -------------------------------------------------------
  -- Fingerprint unchanged
  -- -------------------------------------------------------

  if v_current_fingerprint = p_fingerprint then

    update public.candidate_states
    set
      last_seen_at = p_observed_at
    where
      sheet_source_id = p_sheet_source_id
      and
      candidate_hmac =
        p_candidate_hmac::char(64);


    return query
    select
      'unchanged'::text,
      v_first_seen_at,
      p_observed_at,
      v_last_changed_at;

    return;

  end if;


  -- -------------------------------------------------------
  -- Fingerprint changed
  -- -------------------------------------------------------

  update public.candidate_states
  set
    fingerprint =
      p_fingerprint::char(64),

    last_seen_at =
      p_observed_at,

    last_changed_at =
      p_observed_at

  where
    sheet_source_id =
      p_sheet_source_id

    and candidate_hmac =
      p_candidate_hmac::char(64);


  return query
  select
    'changed'::text,
    v_first_seen_at,
    p_observed_at,
    p_observed_at;

end;
$$;


revoke all
on function public.observe_candidate_state(
  uuid,
  text,
  text,
  timestamptz
)
from public;


revoke all
on function public.observe_candidate_state(
  uuid,
  text,
  text,
  timestamptz
)
from anon;


revoke all
on function public.observe_candidate_state(
  uuid,
  text,
  text,
  timestamptz
)
from authenticated;


grant execute
on function public.observe_candidate_state(
  uuid,
  text,
  text,
  timestamptz
)
to service_role;