-- Run only against an empty local PostgreSQL database.
-- psql -v ON_ERROR_STOP=1 -d <db> -f tests/highlightMemo/harness.sql
-- psql -v ON_ERROR_STOP=1 -d <db> -f supabase/migrations/20261011_add_highlight_memo_source.sql
-- psql -v ON_ERROR_STOP=1 -d <db> -f tests/highlightMemo/highlightMemo.test.sql
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end $$;

create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create schema memo;
grant usage on schema auth, memo to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;

create table memo.memo (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id),
  memo text not null,
  title text not null,
  url text not null,
  "favIconUrl" text,
  page_key text not null default '',
  deleted_at timestamptz
);
alter table memo.memo enable row level security;
create policy memo_own on memo.memo for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on memo.memo to authenticated;
grant usage on sequence memo.memo_id_seq to authenticated;

create table memo.highlight (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id),
  url text not null,
  title text,
  "favIconUrl" text,
  exact_text text not null,
  prefix_text text,
  suffix_text text,
  text_position_start integer,
  color text not null default 'yellow',
  note text,
  page_key text not null default ''
);
alter table memo.highlight enable row level security;
create policy highlight_own on memo.highlight for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on memo.highlight to authenticated;
grant usage on sequence memo.highlight_id_seq to authenticated;

create schema test;
grant usage on schema test to authenticated, anon;
create function test.ok(p_condition boolean, p_message text) returns void
language plpgsql as $$
begin
  if p_condition is not true then
    raise exception 'FAIL: %', p_message;
  end if;
  raise notice 'ok - %', p_message;
end;
$$;
create function test.fails(p_sql text, p_state text, p_message text) returns void
language plpgsql as $$
declare
  v_state text;
begin
  begin
    execute p_sql;
  exception when others then
    get stacked diagnostics v_state = returned_sqlstate;
    perform test.ok(v_state = p_state, p_message || ' [' || v_state || ']');
    return;
  end;
  raise exception 'FAIL: expected error - %', p_message;
end;
$$;
grant execute on function test.ok(boolean, text), test.fails(text, text, text) to authenticated, anon;
