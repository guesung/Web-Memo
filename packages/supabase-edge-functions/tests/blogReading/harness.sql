-- 로컬 검증용 최소 Supabase 흉내. Docker 없이 일반 PostgreSQL 14+에서 마이그레이션을 실행해 볼 때만 쓴다.
-- Supabase 로컬 스택(supabase start)에서는 필요 없다. 운영/로컬 Supabase에 적용하지 않는다.
--
-- 사용:
--   psql -v ON_ERROR_STOP=1 -d <빈 DB> -f tests/blogReading/harness.sql
--   psql -v ON_ERROR_STOP=1 -d <같은 DB> -f supabase/migrations/20260930_add_blog_reading.sql
--   psql -v ON_ERROR_STOP=1 -d <같은 DB> -f tests/blogReading/blogReading.test.sql

-- 역할은 클러스터 전체에 하나라 이미 있으면 건너뛴다.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end $$;

create schema auth;
create table auth.users (id uuid primary key);

-- Supabase의 auth.uid()처럼 요청 클레임에서 사용자 ID를 읽는다.
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create schema memo;
grant usage on schema memo, auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;

-- 마이그레이션이 읽는 memo.memo 열만 옮겼다.
create table memo.memo (
  id bigint generated always as identity primary key,
  memo text,
  user_id uuid not null references auth.users(id),
  url text not null,
  title text,
  impression text,
  "actionItem" text,
  "isWish" boolean default false,
  deleted_at timestamptz,
  page_key text not null default ''
);
alter table memo.memo enable row level security;
create policy memo_own on memo.memo for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on memo.memo to authenticated;
