-- 회원가입 시 안내 메일을 보낸다.
-- auth.users에 INSERT 트리거를 다는 이유: 가입 경로가 웹 OAuth와 iOS 앱 idToken
-- 로그인으로 갈라져 있어 웹 콜백 라우트에 얹으면 앱 가입이 빠진다. auth.users 행은
-- 어느 경로로 가입하든 정확히 한 번 생긴다.
--
-- pg_net.http_post은 fire-and-forget이라 요청을 큐에 넣고 즉시 반환한다. Edge Function이
-- 느리거나 실패해도 가입 트랜잭션은 영향받지 않는다.
--
-- 호출 주소와 service role 키는 DB 설정에서 읽는다. 키를 레포에 커밋하지 않기
-- 위해서다. 이 마이그레이션을 적용하기 전에 아래를 먼저 실행해야 한다.
--
--   alter database postgres
--     set app.settings.edge_function_url = 'https://<ref>.supabase.co/functions/v1';
--   alter database postgres
--     set app.settings.service_role_key = '<service role key>';
--
-- 그리고 supabase secrets set RESEND_API_KEY=... 로 함수 쪽 키를 등록한다.
-- 설정이 비어 있으면 http_post 호출이 실패하지만 pg_net이 비동기라 가입은 그대로
-- 성공한다 — 메일만 조용히 안 나간다.
create extension if not exists pg_net with schema extensions;

create function auth.send_welcome_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform extensions.http_post(
    url := current_setting('app.settings.edge_function_url', true)
      || '/send-welcome-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer '
        || current_setting('app.settings.service_role_key', true)
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
end;
$$;

create trigger on_auth_user_created_send_welcome_email
after insert on auth.users
for each row
execute function auth.send_welcome_email();

comment on function auth.send_welcome_email() is
  'Queues a one-time welcome email via the send-welcome-email Edge Function. Asynchronous (pg_net), so signup never blocks on delivery.';
