-- 신규 가입 시 Slack 알림을 보낸다.
-- 기존 send_welcome_email_trigger가 이미 auth.users INSERT를 정확히 한 번 잡는 지점이므로
-- 같은 트리거 함수 안에 두 번째 net.http_post만 추가한다. 이메일 발송과는 관심사가
-- 다르므로(운영 알림 vs 사용자 커뮤니케이션) 실패를 서로 전파하지 않도록 별도
-- exception 블록으로 감싼다 — welcome 메일이 실패해도 Slack 알림은 시도되고, 그
-- 반대도 마찬가지다.
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
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
        || '/functions/v1/send-signup-slack-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
      ),
      body := jsonb_build_object(
        'record', jsonb_build_object(
          'id', new.id,
          'created_at', new.created_at
        )
      )
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
  'Queues a one-time welcome email via send-welcome-email and a Slack signup notification via send-signup-slack-notification. Both calls are async (pg_net) and independently guarded, so signup never blocks on either delivery.';
