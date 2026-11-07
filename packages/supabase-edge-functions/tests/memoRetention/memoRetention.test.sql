-- Run after harness.sql and 20261103120000_add_memo_retention_stats.sql in an empty local DB.
create schema test;
create function test.ok(condition boolean, message text) returns void language plpgsql as $$
begin
  if condition is not true then raise exception 'FAIL: %', message; end if;
  raise notice 'ok - %', message;
end $$;
grant usage on schema test to anon, authenticated;
grant execute on function test.ok(boolean, text) to anon, authenticated;

insert into memo.profiles values
  ('00000000-0000-0000-0000-000000000001', 'admin'),
  ('00000000-0000-0000-0000-000000000002', 'user');

-- UTC 15:00 is KST midnight. Writers 3 and 4 cross the December/January boundary.
insert into memo.memo (user_id, created_at, deleted_at) values
  ('00000000-0000-0000-0000-000000000003', '2025-12-31 14:59:59+00', null),
  ('00000000-0000-0000-0000-000000000003', '2026-01-07 14:59:59+00', '2026-01-08+00'),
  ('00000000-0000-0000-0000-000000000003', '2026-01-07 14:59:59+00', null),
  ('00000000-0000-0000-0000-000000000004', '2025-12-31 15:00:00+00', null),
  ('00000000-0000-0000-0000-000000000004', '2026-01-07 14:59:59+00', null),
  ('00000000-0000-0000-0000-000000000004', '2026-01-30 15:00:00+00', null),
  ('00000000-0000-0000-0000-000000000005', '2025-12-01+00', null),
  ('00000000-0000-0000-0000-000000000005', '2025-12-07 23:59:59+00', null),
  ('00000000-0000-0000-0000-000000000006', '2025-12-01+00', null),
  ('00000000-0000-0000-0000-000000000006', '2025-12-31 00:00:01+00', null),
  ('ef8c4ab1-4d92-4b0f-9d41-084f51813406', '2025-12-01+00', null),
  ('ef8c4ab1-4d92-4b0f-9d41-084f51813406', '2026-01-01+00', null),
  ('00000000-0000-0000-0000-000000000007', null, null),
  ('00000000-0000-0000-0000-000000000008', '2025-11-01+00', null),
  ('00000000-0000-0000-0000-000000000008', '2025-12-01+00', null);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;
do $$
declare
  r jsonb := memo.get_memo_retention_stats('all', 'month');
  december jsonb;
  january jsonb;
begin
  select x into december from jsonb_array_elements(r -> 'cohorts') x where x ->> 'periodStart' = '2025-12-01';
  select x into january from jsonb_array_elements(r -> 'cohorts') x where x ->> 'periodStart' = '2026-01-01';
  perform test.ok((december ->> 'cohortSize')::int = 3, 'first memo over full history; excluded user and null timestamp omitted');
  perform test.ok((december ->> 'retainedUsers')::int = 1, '7-day boundary inclusive; before 7 days and after 30 days excluded; duplicate writes counted once');
  perform test.ok((january ->> 'cohortSize')::int = 1, 'KST New Year boundary');
  perform test.ok((january ->> 'retainedUsers')::int = 1, '30-day boundary inclusive');
  perform test.ok((r -> 'returningRange' ->> 'start') = '2025-11-01', 'all starts at first valid month');
  perform test.ok((select (x ->> 'users')::int from jsonb_array_elements(r -> 'returning') x where x ->> 'monthStart' = '2025-12-01') = 1, 'previous-month intersection');
  perform test.ok((select (x ->> 'users')::int from jsonb_array_elements(r -> 'returning') x where x ->> 'monthStart' = '2026-01-01') = 1, 'soft-deleted memo and duplicate user count');
  perform test.ok((r -> 'timezone' = '"Asia/Seoul"'::jsonb), 'timezone contract');
  perform test.ok((r -> 'cohortRange' ->> 'end')::date > current_date, 'exclusive end range includes current month');
  perform test.ok((december ->> 'ratePercent')::numeric = round(100.0 / 3, 2), 'rate denominator is entire cohort');
  perform test.ok((select x -> 'ratePercent' from jsonb_array_elements(r -> 'cohorts') x where x ->> 'periodStart' = '2026-02-01') = 'null'::jsonb, 'empty cohort has null rate');
  perform test.ok((select (x ->> 'users')::int from jsonb_array_elements(r -> 'returning') x where x ->> 'monthStart' = '2025-11-01') = 0, 'returning zero is zero users');

end $$;

-- Caller authentication and input validation are independent of table RLS.
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', false);
set role authenticated;
do $$
begin
  begin perform memo.get_memo_retention_stats('all', 'month');
    raise exception 'ordinary user unexpectedly allowed';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
set role anon;
do $$
begin
  begin perform memo.get_memo_retention_stats('all', 'month');
    raise exception 'anon unexpectedly allowed';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;
do $$
begin
  begin perform memo.get_memo_retention_stats('bad', 'month');
    raise exception 'invalid range unexpectedly allowed';
  exception when invalid_parameter_value then null;
  end;
  begin perform memo.get_memo_retention_stats('all', null);
    raise exception 'null granularity unexpectedly allowed';
  exception when invalid_parameter_value then null;
  end;
end $$;

reset role;
-- A newly started cohort has every member pending, including a first writer with no rewrite.
insert into memo.memo (user_id, created_at) values
  ('00000000-0000-0000-0000-000000000009', statement_timestamp() - interval '1 hour');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;
do $$
declare
  r jsonb := memo.get_memo_retention_stats('recent12', 'month');
  q jsonb := memo.get_memo_retention_stats('recent12', 'quarter');
  current_month date := date_trunc('month', statement_timestamp() at time zone 'Asia/Seoul')::date;
  current_cohort jsonb;
begin
  select x into current_cohort from jsonb_array_elements(r -> 'cohorts') x
    where x ->> 'periodStart' = current_month::text;
  perform test.ok(jsonb_array_length(r -> 'cohorts') = 12, 'recent12 monthly periods');
  perform test.ok((current_cohort ->> 'cohortSize')::int = 1, 'current first writer in cohort');
  perform test.ok((current_cohort ->> 'observedUsers')::int = 0 and
    (current_cohort ->> 'pendingUsers')::int = 1 and
    (current_cohort ->> 'ratePercent')::numeric = 0, 'pending member remains in denominator with 0%');
  perform test.ok((current_cohort ->> 'isProvisional')::boolean, 'current cohort provisional');
  perform test.ok((select (x ->> 'isProvisional')::boolean from jsonb_array_elements(r -> 'returning') x
    where x ->> 'monthStart' = current_month::text), 'current returning month provisional');
  perform test.ok((q -> 'cohortRange' ->> 'start')::date =
    date_trunc('quarter', (current_month - interval '11 months')::timestamp)::date,
    'quarter range includes entire boundary quarter');
  perform test.ok(q -> 'returning' = r -> 'returning', 'granularity does not affect returning series');
end $$;
reset role;

-- Hard deletion removes the only historical record; empty responses preserve string date ranges.
truncate memo.memo;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;
do $$
declare
  r jsonb;
begin
  foreach r in array array[
    memo.get_memo_retention_stats('all', 'month'),
    memo.get_memo_retention_stats('recent12', 'quarter')
  ] loop
    perform test.ok(r -> 'cohorts' = '[]'::jsonb and r -> 'returning' = '[]'::jsonb,
      'hard-deleted history yields empty arrays');
    perform test.ok(r -> 'cohortRange' ->> 'start' is not null and
      r -> 'returningRange' ->> 'start' is not null, 'empty ranges use date strings');
  end loop;
end $$;
reset role;
