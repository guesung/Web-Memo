-- 주간 메모 리포트 발송 시각을 토요일 10:00 KST로 변경한다.
-- 기간은 [직전 토 10:00, 이번 토 10:00) KST. weekly_report_log.week_start는 기간 시작 토요일이다.
-- 재실행 안전: unschedule 후 재등록, comment는 덮어쓰기.

-- 매주 토요일 01:00 UTC(= 10:00 KST)에 weekly-memo-report 호출
do $$
begin
  perform cron.unschedule('weekly-memo-report');
exception when others then
  null;
end $$;

select cron.schedule(
  'weekly-memo-report',
  '0 1 * * 6',
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

comment on column memo.weekly_report_log.week_start is '기간 시작 토요일(KST)';
