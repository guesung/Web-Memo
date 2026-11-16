-- 메모 리텐션의 주 경계를 주간 GA 리포트의 주 시작일(p_week_start)에 맞춘다.
--
-- 주간 GA 리포트가 월~일에서 토~금으로 바뀌었다(토요일 08:00 게시). 기존 함수는 활동 주를
-- date_trunc('week') 로 잘라 항상 월요일 시작이라, 토요일 p_week_start 를 넘기면 코호트가
-- 리포트 주와 어긋나고 "이번 주 처음 쓴 사람"이 0명으로 나온다.
--
-- 이제 활동 주는 p_week_start 와 같은 요일에서 시작하는 7일 단위로 자른다. 월요일을 넘기면
-- 예전과 같은 값이 나오므로, 이 마이그레이션을 코드 배포보다 먼저 적용해도 안전하다.
--
-- 나머지 정의(활동·코호트·제외 대상·권한)는 20261025120000_add_weekly_creation_retention.sql
-- 과 같다.

create or replace function memo.weekly_creation_retention(
  p_week_start date,
  p_weeks integer default 8
)
returns table (
  cohort_week  date,
  cohort_size  integer,
  week_offset  integer,
  active_users integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with excluded as (
    select u.id as user_id from auth.users u where u.email = 'test@test.com'
    union
    select p.user_id from memo.profiles p where p.role = 'admin'
  ),
  created as (
    select m.user_id, m.created_at from memo.memo m
    union all
    select h.user_id, h.created_at from memo.highlight h
  ),
  activity as (
    select distinct
      c.user_id,
      -- p_week_start 와 같은 요일에서 시작하는 주. floor 라 p_week_start 이전 날짜도
      -- 앞쪽 주로 정확히 내려간다(정수 나눗셈은 음수에서 0 쪽으로 잘려 하루 어긋난다).
      p_week_start
        + 7 * floor(
          (((c.created_at at time zone 'Asia/Seoul')::date - p_week_start))::numeric / 7
        )::integer as week
    from created c
    where c.user_id is not null
      -- 대상 주가 끝나기 전까지만 본다. 백필로 옛 주를 돌려도 그 시점의 값이 나온다.
      and c.created_at < ((p_week_start + 7)::timestamp at time zone 'Asia/Seoul')
      and not exists (select 1 from excluded e where e.user_id = c.user_id)
  ),
  cohort as (
    select a.user_id, min(a.week) as cohort_week
    from activity a
    group by a.user_id
  ),
  target as (
    select co.user_id, co.cohort_week
    from cohort co
    where co.cohort_week between p_week_start - 7 * p_weeks and p_week_start
  ),
  sizes as (
    select t.cohort_week, count(*)::integer as cohort_size
    from target t
    group by t.cohort_week
  ),
  retained as (
    select
      t.cohort_week,
      ((a.week - t.cohort_week) / 7)::integer as week_offset,
      count(*)::integer as active_users
    from target t
    join activity a on a.user_id = t.user_id
    group by t.cohort_week, a.week
  )
  select s.cohort_week, s.cohort_size, r.week_offset, r.active_users
  from sizes s
  join retained r on r.cohort_week = s.cohort_week
  order by s.cohort_week, r.week_offset;
$$;

revoke all on function memo.weekly_creation_retention(date, integer)
  from public, anon, authenticated;
grant execute on function memo.weekly_creation_retention(date, integer)
  to service_role;
