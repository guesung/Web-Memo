-- 주간 메모 리포트: 설정 컬럼, 발송 기록 테이블, 일요일 20:00 KST 크론.
-- 쓰기는 weekly-memo-report Edge Function(service_role)만 한다.
-- 선행 조건(사람 작업): Vault에 project_url, cron_secret 등록(아티클 리마인더 크론과 같은 값).
-- 재실행 안전: IF NOT EXISTS / DROP ... IF EXISTS / unschedule 후 재등록.

alter table memo.setting
  add column if not exists weekly_report_enabled boolean not null default false,
  add column if not exists weekly_report_email text null;

create table if not exists memo.weekly_report_log (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  -- 리포트가 다룬 주의 KST 월요일 날짜
  week_start date not null,
  email      text not null,
  is_test    boolean not null default false,
  status     text not null check (status in ('sent', 'failed')),
  created_at timestamptz not null default now()
);

-- 주당 정기 발송 성공은 1건만. failed는 재시도할 수 있도록 제외한다.
create unique index if not exists weekly_report_log_regular_sent_unique
  on memo.weekly_report_log (user_id, week_start)
  where not is_test and status = 'sent';

-- 테스트 발송 rate limit(최근 60초 내 기록) 조회용
create index if not exists weekly_report_log_test_recent_idx
  on memo.weekly_report_log (user_id, created_at desc)
  where is_test;

alter table memo.weekly_report_log enable row level security;

drop policy if exists "weekly_report_log_select_own" on memo.weekly_report_log;
create policy "weekly_report_log_select_own" on memo.weekly_report_log
  for select to authenticated
  using (user_id = auth.uid());

grant select on memo.weekly_report_log to authenticated;
grant select, insert on memo.weekly_report_log to service_role;

-- 매주 일요일 11:00 UTC(= 20:00 KST)에 weekly-memo-report 호출
create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  perform cron.unschedule('weekly-memo-report');
exception when others then
  null;
end $$;

select cron.schedule(
  'weekly-memo-report',
  '0 11 * * 0',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/weekly-memo-report',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
