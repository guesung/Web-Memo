-- 피드백·가입 Slack 알림을 Edge Function 대신 API 서버(apps/api, https://api.webmemo.xyz)로 보낸다.
-- 노션 DB-1337 Phase 1-C.
--
-- 적용 전에 Vault에 두 값이 있어야 한다(값은 이 파일에 적지 않는다).
--   api_base_url        https://api.webmemo.xyz
--   api_webhook_secret  API의 WEBHOOK_SECRET(GitHub Secret)과 같은 값
-- 둘 중 하나라도 없으면 아래 함수들은 경고만 남기고 넘어간다(피드백 저장·가입은 막지 않는다).
--
-- 되돌리기
--   피드백: alter table feedback.feedbacks disable trigger notify_feedback_to_api;
--           alter table feedback.feedbacks enable trigger feedback;
--   가입:   20260912_add_welcome_email_trigger.sql의 함수 정의를 다시 적용한다(가입 안내 메일만 보내던 상태)
-- Edge Function(send-feedback·send-signup-slack-notification)은 되돌릴 수 있도록 지우지 않고 둔다.
--
-- 주의: 20260918_add_signup_slack_notification.sql은 운영에 적용된 적이 없다(2026-11-23 운영 함수 정의로 확인).
-- 그래서 운영에서는 이 파일이 적용되는 순간 가입 Slack 알림이 처음 켜진다.

-- 피드백 ------------------------------------------------------------------------------------
-- 기존 트리거 feedback은 대시보드에서 만든 DB 웹훅이라 정의에 Supabase 키가 들어 있다.
-- 레포에 롤백 SQL로 옮겨 적을 수 없으므로 지우지 않고 끄기만 한다. 되돌릴 때 다시 켜면 된다.
alter table feedback.feedbacks disable trigger feedback;

create or replace function feedback.notify_feedback_to_api()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  begin
    perform net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'api_base_url')
        || '/webhooks/feedback',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'api_webhook_secret')
      ),
      body := jsonb_build_object('record', to_jsonb(new)),
      timeout_milliseconds := 5000
    );
  exception when others then
    -- 피드백 INSERT와 같은 트랜잭션이다. 여기서 던지면 사용자의 피드백 저장이 실패하므로 경고만 남긴다.
    raise warning 'notify_feedback_to_api 실패 (feedback %): %', new.id, sqlerrm;
  end;

  return new;
end;
$$;

comment on function feedback.notify_feedback_to_api() is
  'Queues a Slack feedback notification via the API server (POST /webhooks/feedback). Async (pg_net) and guarded, so saving feedback never blocks on delivery.';

drop trigger if exists notify_feedback_to_api on feedback.feedbacks;
create trigger notify_feedback_to_api
  after insert on feedback.feedbacks
  for each row execute function feedback.notify_feedback_to_api();

-- 가입 --------------------------------------------------------------------------------------
-- send_welcome_email_trigger가 부르는 함수다. 가입 안내 메일 블록은 그대로 두고, Slack 알림 블록의
-- 주소와 인증 헤더만 API 서버로 바꾼다.
create or replace function memo.send_welcome_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- 가입 안내 메일과 Slack 알림은 서로 다른 관심사다. 각각 자체 sub-block에서
  -- exception을 잡아, 한쪽이 실패해도 다른 쪽 시도와 가입 트랜잭션에 영향을 주지 않는다.
  begin
    perform net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
        || '/functions/v1/send-welcome-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
      ),
      body := jsonb_build_object(
        'record', jsonb_build_object(
          'id', new.id,
          'email', new.email,
          'name', coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
          'created_at', new.created_at
        )
      )
    );
  exception when others then
    -- 트리거는 가입 INSERT와 같은 트랜잭션에서 돈다. 여기서 던지면 가입이 롤백되므로
    -- Vault 값이 비었거나 pg_net이 거부해도 경고만 남기고 가입은 통과시킨다.
    raise warning 'send_welcome_email 실패 (user %): %', new.id, sqlerrm;
  end;

  begin
    perform net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'api_base_url')
        || '/webhooks/signup',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'api_webhook_secret')
      ),
      body := jsonb_build_object(
        'record', jsonb_build_object(
          'id', new.id,
          'created_at', new.created_at
        )
      ),
      timeout_milliseconds := 5000
    );
  exception when others then
    -- 이메일 발송과 별개 관심사다. Slack 알림이 실패해도 가입 안내 메일 발송 결과와
    -- 무관하게 경고만 남기고 가입은 통과시킨다.
    raise warning 'send_signup_slack_notification 실패 (user %): %', new.id, sqlerrm;
  end;

  return new;
end;
$$;

comment on function memo.send_welcome_email() is
  'Queues a one-time welcome email via send-welcome-email (Edge Function) and a Slack signup notification via the API server (POST /webhooks/signup). Both calls are async (pg_net) and independently guarded, so signup never blocks on either delivery.';
