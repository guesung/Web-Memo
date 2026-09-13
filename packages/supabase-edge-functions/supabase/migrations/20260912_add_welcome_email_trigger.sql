-- 회원가입 시 안내 메일을 보낸다.
-- auth.users에 INSERT 트리거를 다는 이유: 가입 경로가 웹 OAuth와 iOS 앱 idToken
-- 로그인으로 갈라져 있어 웹 콜백 라우트에 얹으면 앱 가입이 빠진다. auth.users 행은
-- 어느 경로로 가입하든 정확히 한 번 생긴다.
--
-- net.http_post은 요청을 큐에 넣고 즉시 반환한다. Edge Function이 느리거나 실패해도
-- 가입 트랜잭션은 영향받지 않는다.
--
-- 호출 주소와 공유 비밀은 Vault의 project_url · cron_secret에서 읽는다.
-- daily-article-reminder cron이 이미 같은 두 값을 쓰고 있어 새로 넣을 값이 없다.
-- 함수는 auth 스키마가 아니라 memo 스키마에 둔다. auth 스키마에는 postgres 롤에
-- CREATE 권한이 없고, 기존 가입 트리거 함수(memo.create_default_user_data)도 memo에 있다.
create function memo.send_welcome_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
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
        'created_at', new.created_at
      )
    )
  );

  return new;
exception when others then
  -- 트리거는 가입 INSERT와 같은 트랜잭션에서 돈다. 여기서 던지면 가입이 롤백되므로
  -- Vault 값이 비었거나 pg_net이 거부해도 경고만 남기고 가입은 통과시킨다.
  raise warning 'send_welcome_email 실패 (user %): %', new.id, sqlerrm;
  return new;
end;
$$;

create trigger send_welcome_email_trigger
after insert on auth.users
for each row
execute function memo.send_welcome_email();

comment on function memo.send_welcome_email() is
  'Queues a one-time welcome email via the send-welcome-email Edge Function. Asynchronous (pg_net), so signup never blocks on delivery.';
