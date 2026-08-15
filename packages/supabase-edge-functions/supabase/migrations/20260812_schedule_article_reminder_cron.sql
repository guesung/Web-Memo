-- 30분마다 daily-article-reminder Edge Function을 호출한다.
-- URL과 시크릿은 하드코딩하지 않고 Vault에서 읽는다.
-- 선행 조건(사람 작업): Vault에 project_url, cron_secret 등록.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 재실행 안전: 같은 이름의 잡이 있으면 먼저 제거
DO $$
BEGIN
  PERFORM cron.unschedule('daily-article-reminder');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'daily-article-reminder',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
           || '/functions/v1/daily-article-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
