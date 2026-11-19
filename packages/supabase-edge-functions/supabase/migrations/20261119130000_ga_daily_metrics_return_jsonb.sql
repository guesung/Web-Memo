-- get_admin_ga_daily_metrics 가 행 목록 대신 jsonb 배열 하나를 돌려주게 바꾼다.
--
-- PostgREST는 집합을 돌려주는 RPC에도 max_rows(1000)를 적용한다. 지표가 하루 15~40개라 90일치가
-- 1,500행을 넘고, 날짜 오름차순으로 앞의 1,000행만 내려가 그래프가 10월 말에서 끊겼다. 값 하나를
-- 돌려주면 이 상한에 걸리지 않고 한 번 호출로 끝난다. 배열 원소의 모양(date·metric·users·events)은
-- 이전 행과 같다.
--
-- 반환 타입이 바뀌어 create or replace 로는 안 되므로 지우고 다시 만든다. 권한도 다시 준다.

drop function if exists memo.get_admin_ga_daily_metrics(integer);

create function memo.get_admin_ga_daily_metrics(p_days integer default 90)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_days integer := greatest(1, least(365, coalesce(p_days, 90)));
  v_result jsonb;
begin
  if not exists (
    select 1 from memo.profiles p
    where p.user_id = auth.uid() and p.role = 'admin'
  ) then
    raise exception 'Unauthorized: Admin access required';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'date', g.date,
        'metric', g.metric,
        'users', g.users,
        'events', g.events
      )
      order by g.date, g.metric
    ),
    '[]'::jsonb
  )
  into v_result
  from memo.ga_daily_metrics g
  where g.date > (select max(x.date) from memo.ga_daily_metrics x) - v_days;

  return v_result;
end;
$$;

revoke all on function memo.get_admin_ga_daily_metrics(integer) from public, anon;
grant execute on function memo.get_admin_ga_daily_metrics(integer) to authenticated, service_role;
