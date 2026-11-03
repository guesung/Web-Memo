-- Run only against an empty local PostgreSQL database.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
create schema memo;
grant usage on schema auth, memo to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
create table memo.profiles (user_id uuid primary key, role text not null);
create table memo.memo (
  id bigint generated always as identity primary key,
  user_id uuid,
  created_at timestamptz,
  deleted_at timestamptz
);
revoke all on memo.profiles, memo.memo from public, anon, authenticated;
