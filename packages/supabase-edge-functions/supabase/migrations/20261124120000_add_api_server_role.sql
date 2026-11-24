-- API 서버(apps/api)가 DB에 붙을 때 쓰는 전용 역할을 만든다. 노션 DB-1337 Phase 2.
--
-- postgres·service_role로 붙으면 RLS를 건너뛰고 모든 테이블을 읽고 쓸 수 있다. API 서버가 뚫려도 피해가
-- 이 서버가 실제로 쓰는 테이블·동작에 그치도록, 필요한 권한만 가진 역할을 따로 둔다(최소 권한).
--
-- 비밀번호는 이 파일에 적지 않는다. 적용한 뒤 따로 넣는다.
--   alter role api_server with password '<무작위 값>';
-- 접속 주소(GitHub Secret DATABASE_URL)는 Supabase 풀러의 세션 모드를 쓴다.
--   postgresql://api_server.<project-ref>:<비밀번호>@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres?sslmode=verify-full
--
-- 되돌리기
--   drop policy api_server_insert_click on memo.weekly_report_click;
--   drop policy api_server_select_click on memo.weekly_report_click;
--   drop policy api_server_select_setting on memo.setting;
--   drop policy api_server_insert_setting on memo.setting;
--   drop policy api_server_update_setting on memo.setting;
--   revoke all on memo.weekly_report_click, memo.setting from api_server;
--   revoke usage on schema memo from api_server;
--   drop role api_server;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'api_server') then
    -- bypassrls를 주지 않는다. 아래 정책이 허용한 것만 할 수 있다.
    create role api_server with login noinherit nocreatedb nocreaterole;
  end if;
end
$$;

grant usage on schema memo to api_server;

-- 클릭 기록: 쌓기만 한다. Prisma의 create는 INSERT ... RETURNING으로 방금 넣은 행을 돌려받으므로 SELECT도 필요하다.
grant select, insert on memo.weekly_report_click to api_server;

drop policy if exists api_server_insert_click on memo.weekly_report_click;
create policy api_server_insert_click on memo.weekly_report_click
  for insert to api_server with check (true);

drop policy if exists api_server_select_click on memo.weekly_report_click;
create policy api_server_select_click on memo.weekly_report_click
  for select to api_server using (true);

-- 설정: 수신 거부(upsert)만 한다. 바꿀 수 있는 컬럼을 user_id(새 행을 만들 때)와 weekly_report_enabled로 좁힌다.
-- ON CONFLICT DO UPDATE는 기존 행을 읽어야 하므로 SELECT가 필요하다.
grant select on memo.setting to api_server;
grant insert (user_id, weekly_report_enabled) on memo.setting to api_server;
grant update (weekly_report_enabled) on memo.setting to api_server;

-- 기존 정책 setting_owner_access는 대상이 public이라 이 역할에도 걸리지만, auth.uid()가 없어 통과하지 못한다.
-- 아래 정책이 따로 허용한다(허용 정책은 OR로 합쳐진다).
drop policy if exists api_server_select_setting on memo.setting;
create policy api_server_select_setting on memo.setting
  for select to api_server using (true);

drop policy if exists api_server_insert_setting on memo.setting;
create policy api_server_insert_setting on memo.setting
  for insert to api_server with check (true);

drop policy if exists api_server_update_setting on memo.setting;
create policy api_server_update_setting on memo.setting
  for update to api_server using (true) with check (true);
