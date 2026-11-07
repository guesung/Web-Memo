-- 관리자 전용 메모 작성 리텐션. 기간 경계는 KST 달력, 재작성 창은 정확한 경과시간이다.
create function memo.get_memo_retention_stats(
  p_range text,
  p_granularity text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_as_of timestamptz := statement_timestamp();
  v_current_month date := date_trunc('month', v_as_of at time zone 'Asia/Seoul')::date;
  v_first_month date;
  v_cohort_start date;
  v_returning_start date;
  v_cohort_end date;
  v_returning_end date := (v_current_month + interval '1 month')::date;
  v_cohorts jsonb;
  v_returning jsonb;
begin
  if not exists (
    select 1 from memo.profiles p
    where p.user_id = auth.uid() and p.role = 'admin'
  ) then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  if p_range not in ('recent12', 'all') or p_range is null
    or p_granularity not in ('month', 'quarter') or p_granularity is null then
    raise exception 'Invalid retention range or granularity' using errcode = '22023';
  end if;

  select date_trunc('month', min(m.created_at) at time zone 'Asia/Seoul')::date
  into v_first_month
  from memo.memo m
  where m.user_id is not null
    and m.user_id <> 'ef8c4ab1-4d92-4b0f-9d41-084f51813406'::uuid
    and m.created_at <= v_as_of;

  v_returning_start := case when p_range = 'recent12'
    then (v_current_month - interval '11 months')::date else coalesce(v_first_month, v_current_month) end;
  v_cohort_start := case when p_range = 'recent12'
    then (v_current_month - interval '11 months')::date else coalesce(v_first_month, v_current_month) end;
  if p_granularity = 'quarter' and v_cohort_start is not null then
    v_cohort_start := date_trunc('quarter', v_cohort_start::timestamp)::date;
  end if;
  v_cohort_end := case when p_granularity = 'quarter'
    then (date_trunc('quarter', v_current_month::timestamp) + interval '3 months')::date
    else v_returning_end end;

  if v_first_month is null then
    return jsonb_build_object(
      'asOf', v_as_of, 'timezone', 'Asia/Seoul',
      'cohortRange', jsonb_build_object('start', v_cohort_start, 'end', v_cohort_end),
      'returningRange', jsonb_build_object('start', v_returning_start, 'end', v_returning_end),
      'cohorts', '[]'::jsonb, 'returning', '[]'::jsonb
    );
  end if;

  with valid_memos as materialized (
    select m.user_id, m.created_at
    from memo.memo m
    where m.user_id is not null
      and m.user_id <> 'ef8c4ab1-4d92-4b0f-9d41-084f51813406'::uuid
      and m.created_at is not null and m.created_at <= v_as_of
  ), first_memos as (
    select user_id, min(created_at) as first_at
    from valid_memos group by user_id
  ), retained_users as (
    select distinct f.user_id
    from first_memos f
    join valid_memos m on m.user_id = f.user_id
      and m.created_at >= f.first_at + interval '168 hours'
      and m.created_at <= f.first_at + interval '720 hours'
  ), cohort_users as (
    select f.user_id, f.first_at,
      date_trunc(p_granularity, f.first_at at time zone 'Asia/Seoul')::date as period_start,
      r.user_id is not null as retained
    from first_memos f
    left join retained_users r on r.user_id = f.user_id
  ), cohort_counts as (
    select c.period_start,
      count(*)::integer as cohort_size,
      count(*) filter (where c.retained)::integer as retained_users,
      count(*) filter (where c.first_at + interval '720 hours' <= v_as_of)::integer as observed_users
    from cohort_users c
    group by c.period_start
  ), cohort_periods as (
    select s.period_start::date,
      case when p_granularity = 'quarter' then (s.period_start + interval '3 months')::date
        else (s.period_start + interval '1 month')::date end as period_end
    from generate_series(v_cohort_start::timestamp, (v_cohort_end - interval '1 day')::timestamp,
      case when p_granularity = 'quarter' then interval '3 months' else interval '1 month' end
    ) s(period_start)
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'periodStart', cp.period_start, 'periodEnd', cp.period_end,
    'cohortSize', coalesce(cc.cohort_size, 0),
    'retainedUsers', coalesce(cc.retained_users, 0),
    'observedUsers', coalesce(cc.observed_users, 0),
    'pendingUsers', coalesce(cc.cohort_size, 0) - coalesce(cc.observed_users, 0),
    'ratePercent', case when coalesce(cc.cohort_size, 0) = 0 then null
      else round(100.0 * cc.retained_users / cc.cohort_size, 2) end,
    'isProvisional', (cp.period_end::timestamp at time zone 'Asia/Seoul') + interval '720 hours' > v_as_of
  ) order by cp.period_start), '[]'::jsonb)
  into v_cohorts
  from cohort_periods cp
  left join cohort_counts cc on cc.period_start = cp.period_start;

  with monthly_writers as (
    select distinct date_trunc('month', m.created_at at time zone 'Asia/Seoul')::date as month_start,
      m.user_id
    from memo.memo m
    where m.user_id is not null
      and m.user_id <> 'ef8c4ab1-4d92-4b0f-9d41-084f51813406'::uuid
      and m.created_at is not null and m.created_at <= v_as_of
      and m.created_at >= ((v_returning_start - interval '1 month')::timestamp at time zone 'Asia/Seoul')
  ), returning_counts as (
    select curr.month_start, count(*)::integer as users
    from monthly_writers curr
    join monthly_writers prev on prev.user_id = curr.user_id
      and prev.month_start = (curr.month_start - interval '1 month')::date
    group by curr.month_start
  ), months as (
    select s.month_start::date
    from generate_series(v_returning_start::timestamp, (v_returning_end - interval '1 day')::timestamp,
      interval '1 month') s(month_start)
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'monthStart', months.month_start, 'users', coalesce(rc.users, 0),
    'isProvisional', months.month_start = v_current_month
  ) order by months.month_start), '[]'::jsonb)
  into v_returning
  from months
  left join returning_counts rc on rc.month_start = months.month_start;

  return jsonb_build_object(
    'asOf', v_as_of, 'timezone', 'Asia/Seoul',
    'cohortRange', jsonb_build_object('start', v_cohort_start, 'end', v_cohort_end),
    'returningRange', jsonb_build_object('start', v_returning_start, 'end', v_returning_end),
    'cohorts', v_cohorts, 'returning', v_returning
  );
end;
$function$;

revoke all on function memo.get_memo_retention_stats(text, text) from public, anon;
grant execute on function memo.get_memo_retention_stats(text, text) to authenticated;
