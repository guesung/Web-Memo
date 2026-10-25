-- 주간 GA 리포트가 쓰는 메모 리텐션 집계.
--
-- GA 의 주간 활성 사용자만으로는 "메모를 쓴 사람이 다음 주에도 쓰는가"를 알 수 없다. 확장
-- 이벤트는 Measurement Protocol 로 들어와 GA 의 첫 방문일 판정도 믿기 어렵다. 그래서 실제로
-- 저장된 데이터로 센다.
--
-- 활동 = 그 주(KST 월요일 시작)에 메모나 하이라이트를 새로 만든 것. 수정은 세지 않는다 —
-- updated_at 은 마지막 수정 시각 하나만 남아 주차별 이력을 만들 수 없다. 하이라이트를 만들면
-- 트리거(ensure_memo_for_highlight)가 메모도 만들지만, 같은 주는 한 번만 센다.
-- 코호트 = 그 사용자가 처음 활동한 주. deleted_at 은 보지 않는다 — 지워도 만든 사실은 남는다.
--
-- 제외: 관리자(profiles.role = 'admin')와 E2E 계정(test@test.com). 통합 E2E 가 프로덕션에
-- 메모를 쓰므로 빼지 않으면 매주 "잔존"하는 사용자가 하나 생긴다.
--
-- 원본 행 대신 집계값만 돌려준다. 호출자는 GitHub Actions 의 service_role 하나뿐이다.

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
      date_trunc('week', c.created_at at time zone 'Asia/Seoul')::date as week
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
