-- 블로그 새 글 묶음 알림 마이그레이션 검증. 실패하면 예외로 멈춘다(psql -v ON_ERROR_STOP=1).
--
--   psql -v ON_ERROR_STOP=1 -d <DB> -f tests/blogReading/harness.sql              # 일반 PostgreSQL일 때만
--   psql -v ON_ERROR_STOP=1 -d <DB> -f supabase/migrations/20260930_add_blog_reading.sql
--   psql -v ON_ERROR_STOP=1 -d <DB> -f supabase/migrations/20261025_add_geeknews_blog_source.sql
--   psql -v ON_ERROR_STOP=1 -d <DB> -f supabase/migrations/20261026_add_blog_digest.sql
--   psql -v ON_ERROR_STOP=1 -d <DB> -f tests/blogReading/blogDigest.test.sql
-- blogReading.test.sql과 같은 DB에서 돌리지 않는다(그 테스트가 만든 긱뉴스 글이 count에 섞인다). 빈 DB를 새로 만들어 돌린다.

create schema dtest;
grant usage on schema dtest to public;

create function dtest.ok(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if p_cond is not true then
    raise exception 'FAIL: %', p_msg;
  end if;
  raise notice 'ok - %', p_msg;
end;
$$;
grant execute on function dtest.ok(boolean, text) to public;

create function dtest.fails(p_sql text, p_state text, p_msg text) returns void language plpgsql as $$
declare
  v_state text;
begin
  begin
    execute p_sql;
  exception when others then
    get stacked diagnostics v_state = returned_sqlstate;
    perform dtest.ok(v_state = p_state, p_msg || ' [' || v_state || ']');
    return;
  end;
  raise exception 'FAIL: 실패해야 하는데 성공했다 - %', p_msg;
end;
$$;
grant execute on function dtest.fails(text, text, text) to public;

insert into auth.users (id) values
  ('d0000000-0000-0000-0000-000000000001'),
  ('d0000000-0000-0000-0000-000000000002'),
  ('d0000000-0000-0000-0000-000000000003');

-- 사용자 1: 구독 시작 10:00. 사용자 2: 구독 안 함. 사용자 3: 구독했다가 해지.
insert into memo.blog_subscription (user_id, blog_id, active, subscribed_at, unsubscribed_at) values
  ('d0000000-0000-0000-0000-000000000001', 'geeknews', true, '2026-10-20 10:00+00', null),
  ('d0000000-0000-0000-0000-000000000003', 'geeknews', false, '2026-10-20 10:00+00', '2026-10-21 10:00+00');

-- 글: 구독 이전(1), 이후(2~5), 사용 불가(6), 다른 소스(toss)
insert into memo.blog_article (blog_id, provider_id, title, url, page_key, published_at, first_seen_at, available, last_seen_generation) values
  ('geeknews', '1', '구독 이전 글', 'https://news.hada.io/topic?id=1', 'https://news.hada.io/topic?id=1', '2026-10-19 00:00+00', '2026-10-19 00:00+00', true, 1),
  ('geeknews', '2', '글 2 (메모함)', 'https://news.hada.io/topic?id=2', 'https://news.hada.io/topic?id=2', '2026-10-21 00:00+00', '2026-10-21 00:00+00', true, 1),
  ('geeknews', '3', '글 3', 'https://news.hada.io/topic?id=3', 'https://news.hada.io/topic?id=3', '2026-10-22 00:00+00', '2026-10-22 00:00+00', true, 1),
  ('geeknews', '4', '글 4 (가장 최신 발행)', 'https://news.hada.io/topic?id=4', 'https://news.hada.io/topic?id=4', '2026-10-23 00:00+00', '2026-10-23 00:00+00', true, 1),
  ('geeknews', '5', '글 5 (메모 비어 있음)', 'https://news.hada.io/topic?id=5', 'https://news.hada.io/topic?id=5', '2026-10-22 12:00+00', '2026-10-22 12:00+00', true, 1),
  ('geeknews', '6', '글 6 (사용 불가)', 'https://news.hada.io/topic?id=6', 'https://news.hada.io/topic?id=6', '2026-10-24 00:00+00', '2026-10-24 00:00+00', false, 1),
  ('toss', 't1', '토스 글', 'https://toss.tech/article/t1', 'https://toss.tech/article/t1', '2026-10-24 00:00+00', '2026-10-24 00:00+00', true, 1);

-- 글 2: 본문 있는 메모(제외), 글 5: 공백뿐인 메모(제외 안 됨), 글 3: 휴지통 메모(제외 안 됨)
insert into memo.memo (user_id, url, memo, deleted_at, page_key) values
  ('d0000000-0000-0000-0000-000000000001', 'https://news.hada.io/topic?id=2', '메모 본문', null, 'https://news.hada.io/topic?id=2'),
  ('d0000000-0000-0000-0000-000000000001', 'https://news.hada.io/topic?id=5', '   ', null, 'https://news.hada.io/topic?id=5'),
  ('d0000000-0000-0000-0000-000000000001', 'https://news.hada.io/topic?id=3', '지운 메모', now(), 'https://news.hada.io/topic?id=3');

create table dtest.ctx (k text primary key, v jsonb);
grant all on dtest.ctx to public;
set role service_role;
insert into dtest.ctx select 'first', memo.get_blog_digest_candidates('d0000000-0000-0000-0000-000000000001', 'geeknews');
reset role;

do $$
declare
  r jsonb := (select v from dtest.ctx where k = 'first');
begin
  perform dtest.ok((r ->> 'since')::timestamptz = '2026-10-20 10:00+00', '이력이 없으면 since는 구독 시작 시각');
  perform dtest.ok((r ->> 'count')::int = 3, 'count: 구독 이전 글·메모한 글·사용 불가·다른 소스 제외 (3,4,5 = 3건)');
  perform dtest.ok(r ->> 'latestTitle' = '글 4 (가장 최신 발행)', 'latestTitle은 published_at 최신 글');
end $$;

-- 발행 시각 동률이면 first_seen_at이 최신인 글
update memo.blog_article set published_at = '2026-10-23 00:00+00', first_seen_at = '2026-10-23 06:00+00' where provider_id = '5' and blog_id = 'geeknews';
do $$
begin
  perform dtest.ok((memo.get_blog_digest_candidates('d0000000-0000-0000-0000-000000000001', 'geeknews') ->> 'latestTitle') = '글 5 (메모 비어 있음)', '발행 시각 동률이면 first_seen_at 최신');
end $$;

-- 별칭으로 맞는 메모도 완료로 본다
insert into memo.blog_article_alias (blog_id, provider_id, page_key) values ('geeknews', '5', 'https://news.hada.io/topic?id=5&alias=1');
insert into memo.memo (user_id, url, memo, page_key) values
  ('d0000000-0000-0000-0000-000000000001', 'https://news.hada.io/topic?id=5&alias=1', '별칭으로 메모', 'https://news.hada.io/topic?id=5&alias=1');
do $$
declare
  r jsonb := memo.get_blog_digest_candidates('d0000000-0000-0000-0000-000000000001', 'geeknews');
begin
  perform dtest.ok((r ->> 'count')::int = 2 and r ->> 'latestTitle' = '글 4 (가장 최신 발행)', '별칭이 맞는 메모한 글도 제외 (3,4 = 2건)');
end $$;

-- 이력이 생기면 since는 마지막 sent_at
set role service_role;
insert into memo.blog_digest_log (user_id, blog_id, sent_on, sent_at, article_count)
  values ('d0000000-0000-0000-0000-000000000001', 'geeknews', '2026-10-22', '2026-10-22 06:00+00', 2);
reset role;
do $$
declare
  r jsonb := memo.get_blog_digest_candidates('d0000000-0000-0000-0000-000000000001', 'geeknews');
begin
  perform dtest.ok((r ->> 'since')::timestamptz = '2026-10-22 06:00+00', '이력이 있으면 since는 마지막 sent_at');
  perform dtest.ok((r ->> 'count')::int = 1 and r ->> 'latestTitle' = '글 4 (가장 최신 발행)', 'since 이전 글 제외 (4 = 1건)');
end $$;

-- 최신 sent_at이 기준이다
set role service_role;
insert into memo.blog_digest_log (user_id, blog_id, sent_on, sent_at, article_count)
  values ('d0000000-0000-0000-0000-000000000001', 'geeknews', '2026-10-24', '2026-10-24 06:00+00', 1);
reset role;
do $$
declare
  r jsonb := memo.get_blog_digest_candidates('d0000000-0000-0000-0000-000000000001', 'geeknews');
begin
  perform dtest.ok((r ->> 'since')::timestamptz = '2026-10-24 06:00+00' and (r ->> 'count')::int = 0 and r -> 'latestTitle' = 'null'::jsonb, '더 최근 이력이 기준이고 후보가 없으면 count 0, latestTitle null');
end $$;

-- 미구독·해지는 count 0
do $$
declare
  r jsonb;
begin
  r := memo.get_blog_digest_candidates('d0000000-0000-0000-0000-000000000002', 'geeknews');
  perform dtest.ok((r ->> 'count')::int = 0 and r -> 'since' = 'null'::jsonb, '구독하지 않았으면 count 0');
  r := memo.get_blog_digest_candidates('d0000000-0000-0000-0000-000000000003', 'geeknews');
  perform dtest.ok((r ->> 'count')::int = 0, '해지했으면 count 0');
  perform dtest.fails($q$select memo.get_blog_digest_candidates('d0000000-0000-0000-0000-000000000001', 'unknown')$q$, '22023', '지원하지 않는 블로그는 22023');
end $$;

-- unique(user_id, blog_id, sent_on)
set role service_role;
do $$
begin
  perform dtest.fails($q$insert into memo.blog_digest_log (user_id, blog_id, sent_on, article_count) values ('d0000000-0000-0000-0000-000000000001', 'geeknews', '2026-10-24', 1)$q$, '23505', '같은 날 두 번째 이력은 unique 위반');
  perform dtest.fails($q$insert into memo.blog_digest_log (user_id, blog_id, sent_on, article_count) values ('d0000000-0000-0000-0000-000000000001', 'nope', '2026-10-25', 1)$q$, '23514', '지원하지 않는 블로그 이력은 check 위반');
  perform dtest.fails($q$insert into memo.blog_digest_log (user_id, blog_id, sent_on, article_count) values ('d0000000-0000-0000-0000-000000000001', 'geeknews', '2026-10-25', 0)$q$, '23514', 'article_count 0은 check 위반');
  insert into memo.blog_digest_log (user_id, blog_id, sent_on, article_count) values ('d0000000-0000-0000-0000-000000000001', 'toss', '2026-10-24', 1);
  perform dtest.ok(true, '다른 블로그는 같은 날 이력을 따로 가진다');
end $$;
reset role;

-- 권한: anon·authenticated는 테이블도 함수도 쓰지 못한다
select set_config('request.jwt.claim.sub', 'd0000000-0000-0000-0000-000000000001', false);
set role authenticated;
do $$
begin
  perform dtest.fails($q$select * from memo.blog_digest_log$q$, '42501', 'authenticated는 이력을 읽지 못한다');
  perform dtest.fails($q$insert into memo.blog_digest_log (user_id, blog_id, sent_on, article_count) values (auth.uid(), 'geeknews', '2026-10-26', 1)$q$, '42501', 'authenticated는 이력을 쓰지 못한다');
  perform dtest.fails($q$select memo.get_blog_digest_candidates(auth.uid(), 'geeknews')$q$, '42501', 'authenticated는 후보 함수를 못 부른다');
end $$;
reset role;
set role anon;
do $$
begin
  perform dtest.fails($q$select * from memo.blog_digest_log$q$, '42501', 'anon은 이력을 읽지 못한다');
  perform dtest.fails($q$select memo.get_blog_digest_candidates('d0000000-0000-0000-0000-000000000001', 'geeknews')$q$, '42501', 'anon은 후보 함수를 못 부른다');
end $$;
reset role;

-- 사용자 삭제 시 이력도 지워진다(on delete cascade)
delete from memo.memo where user_id = 'd0000000-0000-0000-0000-000000000001';
delete from memo.blog_subscription where user_id = 'd0000000-0000-0000-0000-000000000001';
delete from auth.users where id = 'd0000000-0000-0000-0000-000000000001';
select dtest.ok(not exists (select 1 from memo.blog_digest_log where user_id = 'd0000000-0000-0000-0000-000000000001'), '사용자 삭제 시 이력 cascade');

select 'ALL BLOG DIGEST SQL TESTS PASSED' as result;
