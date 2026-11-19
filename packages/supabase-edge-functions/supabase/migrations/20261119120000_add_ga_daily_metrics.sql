-- 관리자 대시보드의 GA 일별 지표 그래프·주간 리텐션·월별 재작성률을 위한 스냅샷 테이블과 조회 RPC.
--
-- GA4 Data API는 브라우저에서 부를 수 없고(서비스 계정 키가 필요), Vercel에는 그 키를 두지 않기로
-- 했다. 그래서 데일리 GA 리포트(GitHub Actions)가 일별 지표를 이 테이블에 적재하고, 관리자 화면은
-- RPC로 읽는다. 테이블은 service_role만 쓴다 — 정책이 없는 RLS + 권한 회수로 직접 접근을 막고,
-- 관리자 화면은 아래 SECURITY DEFINER 함수로만 읽는다.
--
-- metric 은 GA 이벤트 이름이거나 'active_users'(events 는 null)다. 같은 (date, metric)을 다시
-- 적재하면 덮어쓰므로 재실행·백필이 안전하다.
--
-- 롤백: 세 함수와 memo.ga_daily_metrics 를 DROP 하면 된다(다른 객체가 의존하지 않는다).

create table if not exists memo.ga_daily_metrics (
  date       date        not null,
  metric     text        not null,
  users      integer     not null,
  events     integer,
  updated_at timestamptz not null default now(),
  primary key (date, metric)
);

alter table memo.ga_daily_metrics enable row level security;

revoke all on table memo.ga_daily_metrics from public, anon, authenticated;
grant select, insert, update, delete on table memo.ga_daily_metrics to service_role;

-- GA 일별 지표: 적재된 최신 날짜를 기준으로 최근 p_days일.
-- "오늘" 기준이 아니라 최신 적재일 기준인 이유: 적재가 며칠 밀려도 그래프가 빈 화면이 되지 않게.
create or replace function memo.get_admin_ga_daily_metrics(p_days integer default 90)
returns table (date date, metric text, users integer, events integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_days integer := greatest(1, least(365, coalesce(p_days, 90)));
begin
  if not exists (
    select 1 from memo.profiles p
    where p.user_id = auth.uid() and p.role = 'admin'
  ) then
    raise exception 'Unauthorized: Admin access required';
  end if;

  return query
  select g.date, g.metric, g.users, g.events
  from memo.ga_daily_metrics g
  where g.date > (select max(x.date) from memo.ga_daily_metrics x) - v_days
  order by g.date, g.metric;
end;
$$;

-- 주간 리텐션: 정의는 memo.weekly_creation_retention 하나만 갖고, 여기서는 관리자 검사 뒤 그대로 돌려준다.
-- 그 함수는 service_role만 실행할 수 있지만, SECURITY DEFINER 함수 안에서는 함수 소유자 권한으로
-- 호출되므로 authenticated 에 권한을 열지 않고도 부를 수 있다.
create or replace function memo.get_admin_weekly_retention(
  p_week_start date,
  p_weeks integer default 8
)
returns table (
  cohort_week  date,
  cohort_size  integer,
  week_offset  integer,
  active_users integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from memo.profiles p
    where p.user_id = auth.uid() and p.role = 'admin'
  ) then
    raise exception 'Unauthorized: Admin access required';
  end if;

  return query
  select r.cohort_week, r.cohort_size, r.week_offset, r.active_users
  from memo.weekly_creation_retention(p_week_start, p_weeks) r;
end;
$$;

-- 월별 재작성률: 첫 메모를 쓴 달(KST)별 신규 작성자 수와, 첫 메모 +7일 이상 +30일 이하에
-- 메모를 하나 이상 더 만든 사람 수. 삭제된 메모도 센다 — 지워도 만든 사실은 남는다(deleted_at 을 보지 않는다).
-- 관리자와 test@test.com 은 weekly_creation_retention 과 같은 기준으로 뺀다.
-- incomplete: 그 달 마지막 첫 작성자의 30일 창이 아직 끝나지 않았으면 true(재작성자 수가 더 늘 수 있다).
create or replace function memo.get_admin_monthly_rewrite_rate()
returns table (
  cohort_month date,
  new_writers  integer,
  rewriters    integer,
  incomplete   boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from memo.profiles p
    where p.user_id = auth.uid() and p.role = 'admin'
  ) then
    raise exception 'Unauthorized: Admin access required';
  end if;

  return query
  with excluded as (
    select u.id as user_id from auth.users u where u.email = 'test@test.com'
    union
    select p.user_id from memo.profiles p where p.role = 'admin'
  ),
  firsts as (
    select m.user_id, min(m.created_at) as first_at
    from memo.memo m
    where m.user_id is not null
      and m.created_at is not null
      and not exists (select 1 from excluded e where e.user_id = m.user_id)
    group by m.user_id
  ),
  flagged as (
    select
      (date_trunc('month', f.first_at at time zone 'Asia/Seoul'))::date as month_start,
      exists (
        select 1 from memo.memo m2
        where m2.user_id = f.user_id
          and m2.created_at >= f.first_at + interval '7 days'
          and m2.created_at <= f.first_at + interval '30 days'
      ) as rewrote
    from firsts f
  )
  select
    fl.month_start,
    count(*)::integer,
    (count(*) filter (where fl.rewrote))::integer,
    -- 그 달 마지막 날이 끝난 뒤 30일이 지나야 모든 작성자의 창이 닫힌다.
    (((fl.month_start + interval '1 month')::date + 30)::timestamp at time zone 'Asia/Seoul') > now()
  from flagged fl
  group by fl.month_start
  order by fl.month_start;
end;
$$;

revoke all on function memo.get_admin_ga_daily_metrics(integer) from public, anon;
revoke all on function memo.get_admin_weekly_retention(date, integer) from public, anon;
revoke all on function memo.get_admin_monthly_rewrite_rate() from public, anon;
grant execute on function memo.get_admin_ga_daily_metrics(integer) to authenticated, service_role;
grant execute on function memo.get_admin_weekly_retention(date, integer) to authenticated, service_role;
grant execute on function memo.get_admin_monthly_rewrite_rate() to authenticated, service_role;
