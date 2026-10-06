-- 블로그 정주행 마이그레이션 검증. 실패하면 예외로 멈춘다(psql -v ON_ERROR_STOP=1).
--
-- 실행 위치는 packages/supabase-edge-functions 이다(fixtures.json을 상대 경로로 읽는다).
--   psql -v ON_ERROR_STOP=1 -d <DB> -f tests/blogReading/harness.sql              # 일반 PostgreSQL일 때만
--   psql -v ON_ERROR_STOP=1 -d <DB> -f supabase/migrations/20260930_add_blog_reading.sql
--   psql -v ON_ERROR_STOP=1 -d <DB> -f tests/blogReading/blogReading.test.sql
-- 데이터를 만들고 지우지 않는다. 빈 로컬 DB에서만 돌린다.

\set fixtures `cat tests/blogReading/fixtures.json`

create schema test;
grant usage on schema test to public;

create function test.ok(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if p_cond is not true then
    raise exception 'FAIL: %', p_msg;
  end if;
  raise notice 'ok - %', p_msg;
end;
$$;
grant execute on function test.ok(boolean, text) to public;

-- 함수 호출이 특정 SQLSTATE로 실패하는지 본다.
create function test.fails(p_sql text, p_state text, p_msg text) returns void language plpgsql as $$
declare
  v_state text;
begin
  begin
    execute p_sql;
  exception when others then
    get stacked diagnostics v_state = returned_sqlstate;
    perform test.ok(v_state = p_state, p_msg || ' [' || v_state || ']');
    return;
  end;
  raise exception 'FAIL: 실패해야 하는데 성공했다 - %', p_msg;
end;
$$;
grant execute on function test.fails(text, text, text) to public;

-- ---------------------------------------------------------------------------
-- A. 정규화 계약 (JS getPageKey / trim과 같은 fixture)
-- ---------------------------------------------------------------------------
-- psql 변수는 $$ 본문 안에서 치환되지 않으므로 테이블에 한 번 옮겨 담는다.
create table test.fixtures as select :'fixtures'::jsonb as f;

do $$
declare
  f jsonb := (select t.f from test.fixtures t);
  c jsonb;
begin
  for c in select * from jsonb_array_elements(f -> 'pageKey') loop
    perform test.ok(memo.blog_page_key(c ->> 'url') = c ->> 'expected', 'page_key ' || (c ->> 'url'));
  end loop;

  for c in select * from jsonb_array_elements(f -> 'mediumPostId') loop
    perform test.ok(memo.blog_medium_post_id(c ->> 'url') is not distinct from (c ->> 'expected'), 'medium id ' || (c ->> 'url'));
  end loop;

  for c in select * from jsonb_array_elements(f -> 'memoText') loop
    perform test.ok(memo.has_blog_memo_text(c ->> 'text') = (c ->> 'hasContent')::boolean, 'memo text ' || coalesce(c ->> 'text', 'null'));
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- B. 권한: 일반 사용자는 수집 RPC와 내부 테이블에 닿지 못한다
-- ---------------------------------------------------------------------------
insert into auth.users (id) values
  ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;

do $$
begin
  perform test.fails($q$select * from memo.blog_sync_state$q$, '42501', '일반 사용자는 blog_sync_state를 읽지 못한다');
  perform test.fails($q$select * from memo.blog_sync_request$q$, '42501', '일반 사용자는 blog_sync_request를 읽지 못한다');
  perform test.fails($q$select memo.claim_blog_sync('toss', 'manual')$q$, '42501', '일반 사용자는 claim을 못 부른다');
  perform test.fails($q$select memo.finish_blog_sync('toss', 1, gen_random_uuid(), '{}')$q$, '42501', '일반 사용자는 finish를 못 부른다');
  perform test.fails($q$select memo.ingest_blog_batch('toss', 1, gen_random_uuid(), '[]')$q$, '42501', '일반 사용자는 batch를 못 부른다');
  perform test.fails($q$insert into memo.blog_article (blog_id, provider_id, title, url, page_key, last_seen_generation) values ('toss','x','t','https://toss.tech/article/x','k',1)$q$, '42501', '일반 사용자는 카탈로그에 쓰지 못한다');
  perform test.fails($q$insert into memo.blog_subscription (user_id, blog_id) values (auth.uid(), 'toss')$q$, '42501', '구독 테이블 직접 쓰기 금지');
end $$;

reset role;
set role anon;
do $$
begin
  perform test.fails($q$select * from memo.blog_article$q$, '42501', 'anon은 카탈로그를 읽지 못한다');
  perform test.fails($q$select memo.get_blog_reading_page()$q$, '42501', 'anon은 목록 RPC를 못 부른다');
end $$;
reset role;

-- 비로그인(sub 없음) authenticated 호출은 PT401
select set_config('request.jwt.claim.sub', '', false);
set role authenticated;
do $$
begin
  perform test.fails($q$select memo.get_blog_reading_page()$q$, 'PT401', '토큰 없는 목록 요청은 PT401');
  perform test.fails($q$select memo.get_blog_reading_summary()$q$, 'PT401', '토큰 없는 요약 요청은 PT401');
  perform test.fails($q$select memo.request_blog_sync('toss')$q$, 'PT401', '토큰 없는 재개 요청은 PT401');
  perform test.fails($q$select memo.set_blog_subscription('toss', true)$q$, 'PT401', '토큰 없는 구독은 PT401');
end $$;
reset role;

-- ---------------------------------------------------------------------------
-- C. 수집: claim -> batch -> checkpoint -> fail(부분) -> resume -> finish
-- ---------------------------------------------------------------------------
create table test.ctx (k text primary key, v jsonb);
grant all on test.ctx to public;

set role service_role;
insert into test.ctx select 'claim1', memo.claim_blog_sync('toss', 'manual', false, 600);
reset role;

do $$
declare
  c jsonb := (select v from test.ctx where k = 'claim1');
  r jsonb;
  tok uuid := (c ->> 'leaseToken')::uuid;
begin
  perform test.ok((c ->> 'claimed')::boolean and (c ->> 'generation')::int = 1 and not (c ->> 'resume')::boolean, '첫 claim은 세대 1, 새 순회');

  r := memo.claim_blog_sync('toss', 'manual');
  perform test.ok(not (r ->> 'claimed')::boolean and r ->> 'reason' = 'lease_active', 'lease가 살아 있으면 두 번째 claim은 거절');

  r := memo.claim_blog_sync('daangn', 'request');
  perform test.ok(not (r ->> 'claimed')::boolean and r ->> 'reason' = 'no_request', '요청이 없으면 request 트리거는 시작하지 않는다');

  r := memo.ingest_blog_batch('toss', 1, tok, jsonb_build_array(
    jsonb_build_object('providerId', '101', 'title', '토스 A', 'url', 'https://toss.tech/article/a', 'publishedAt', '2021-04-28T08:00:00+09:00', 'updatedAt', '2026-01-01T00:00:00+09:00'),
    jsonb_build_object('providerId', '102', 'title', '토스 B', 'url', 'https://toss.tech/article/b?utm_source=x', 'publishedAt', '2022-01-01T00:00:00Z', 'body', '본문은 버린다'),
    jsonb_build_object('providerId', '103', 'title', '토스 C', 'url', 'https://toss.tech/article/c', 'publishedAt', '2022-01-01T00:00:00Z'),
    jsonb_build_object('providerId', '103', 'title', '토스 C 수정', 'url', 'https://toss.tech/article/c', 'publishedAt', '2022-01-01T00:00:00Z')
  ));
  perform test.ok((r ->> 'accepted')::int = 3 and (r ->> 'storedCount')::int = 3, '배치 안 중복은 합쳐 3건 저장');
  perform test.ok((select title from memo.blog_article where provider_id = '103') = '토스 C 수정', '중복이면 뒤의 값을 쓴다');
  perform test.ok((select page_key from memo.blog_article where provider_id = '102') = 'https://toss.tech/article/b', 'page_key는 추적 파라미터를 뗀다');

  -- 잘못된 배치는 트랜잭션째 되돌아간다
  perform test.fails(format($q$select memo.ingest_blog_batch('toss', 1, %L, %L::jsonb)$q$, tok,
    '[{"providerId":"901","title":"ok","url":"https://toss.tech/article/ok"},{"providerId":"902","title":"bad","url":"https://evil.example/x"}]'),
    '22023', '허용되지 않은 호스트는 배치 전체 거절');
  perform test.ok(not exists (select 1 from memo.blog_article where provider_id in ('901', '902')), '거절된 배치는 아무것도 남기지 않는다');
  perform test.fails(format($q$select memo.ingest_blog_batch('toss', 1, %L, %L::jsonb)$q$, tok,
    (select jsonb_agg(jsonb_build_object('providerId', 'p' || g, 'title', 't', 'url', 'https://toss.tech/article/p' || g))::text from generate_series(1, 101) g)),
    '22023', '배치는 최대 100개');
  perform test.fails(format($q$select memo.ingest_blog_batch('toss', 2, %L, %L::jsonb)$q$, tok, '[{"providerId":"1","title":"t","url":"https://toss.tech/article/1"}]'),
    'PT409', '다른 세대의 쓰기는 stale');
  perform test.fails(format($q$select memo.ingest_blog_batch('toss', 1, gen_random_uuid(), %L::jsonb)$q$, '[{"providerId":"1","title":"t","url":"https://toss.tech/article/1"}]'),
    'PT409', '다른 lease 토큰의 쓰기는 stale');
  perform test.fails(format($q$select memo.ingest_blog_batch('daangn', 1, %L, %L::jsonb)$q$, tok, '[{"providerId":"1","title":"t","url":"https://medium.com/daangn/x-aea44d0b7b7"}]'),
    'PT409', '다른 소스의 lease로는 쓸 수 없다');

  r := memo.save_blog_checkpoint('toss', 1, tok, '{"nextPage":2,"pages":1}');
  perform test.ok((r ->> 'ok')::boolean, 'checkpoint 저장');
  perform test.fails(format($q$select memo.save_blog_checkpoint('toss', 1, %L, %L::jsonb)$q$, tok, '[1]'), '22023', 'checkpoint는 객체만');

  -- 부분 수집: 확정 total 없음
  r := memo.fail_blog_sync('toss', 1, tok, 'time_limit');
  perform test.ok(r ->> 'status' = 'partial', 'fail은 partial로 기록');
  perform test.fails(format($q$select memo.fail_blog_sync('toss', 1, %L, 'x')$q$, tok), 'PT409', 'fail 뒤 같은 lease는 더 못 쓴다');
  perform test.ok((select count(*) from memo.blog_article where blog_id = 'toss' and available) = 3, '실패해도 기존 글은 유지');
end $$;

do $$
declare
  r jsonb;
  c jsonb;
  tok uuid;
begin
  -- 시간 제한으로 멈춘 작업은 요청 없이도 request 트리거가 이어받는다
  c := memo.claim_blog_sync('toss', 'request', false, 600);
  perform test.ok((c ->> 'claimed')::boolean and (c ->> 'resume')::boolean and (c ->> 'generation')::int = 1, 'time_limit 뒤 재개는 같은 세대');
  perform test.ok(c -> 'checkpoint' ->> 'nextPage' = '2', '재개는 checkpoint를 돌려준다');
  tok := (c ->> 'leaseToken')::uuid;

  r := memo.ingest_blog_batch('toss', 1, tok, jsonb_build_array(
    jsonb_build_object('providerId', '104', 'title', '토스 D', 'url', 'https://toss.tech/article/d'),
    jsonb_build_object('providerId', '105', 'title', '토스 E', 'url', 'https://toss.tech/article/e', 'publishedAt', '2023-05-05T00:00:00Z',
      'aliasUrls', jsonb_build_array('https://toss.tech/article/105'))
  ));
  perform test.ok((r ->> 'storedCount')::int = 5, '이어 저장하면 세대 1 고유 수는 5');

  perform test.fails(format($q$select memo.finish_blog_sync('toss', 1, %L, %L::jsonb)$q$, tok,
    '{"kind":"toss","nextIsNull":true,"reportedCount":6,"uniqueCount":5,"pageCount":2}'), '22023', 'count가 저장 수와 다르면 finish 거절');
  perform test.fails(format($q$select memo.finish_blog_sync('toss', 1, %L, %L::jsonb)$q$, tok,
    '{"kind":"toss","nextIsNull":false,"reportedCount":5,"uniqueCount":5,"pageCount":2}'), '22023', 'next가 null이 아니면 finish 거절');
  perform test.fails(format($q$select memo.finish_blog_sync('toss', 1, %L, %L::jsonb)$q$, tok,
    '{"kind":"daangn","hasNextPage":false,"endCursor":"","uniqueCount":5}'), '22023', '다른 소스의 종료 증거는 거절');
  perform test.ok((select status from memo.blog_sync_state where blog_id = 'toss') = 'running' and (select initial_completed_at from memo.blog_sync_state where blog_id = 'toss') is null, '거절된 finish는 상태를 바꾸지 않는다');

  r := memo.finish_blog_sync('toss', 1, tok, '{"kind":"toss","nextIsNull":true,"reportedCount":5,"uniqueCount":5,"pageCount":2}');
  perform test.ok(r ->> 'status' = 'complete' and (r ->> 'total')::int = 5, 'toss finish 성공 total=5');
  perform test.fails(format($q$select memo.finish_blog_sync('toss', 1, %L, '{}')$q$, tok), 'PT409', 'finish 뒤 같은 lease는 무효');
end $$;

-- 당근: 종료 증거 검증
do $$
declare
  c jsonb;
  tok uuid;
  r jsonb;
begin
  c := memo.claim_blog_sync('daangn', 'manual');
  tok := (c ->> 'leaseToken')::uuid;

  r := memo.ingest_blog_batch('daangn', 1, tok, jsonb_build_array(
    jsonb_build_object('providerId', 'aea44d0b7b7', 'title', '당근 A', 'url', 'https://medium.com/daangn/%EA%B3%B5-aea44d0b7b7', 'publishedAt', '2023-04-13T00:00:00Z',
      'aliasUrls', jsonb_build_array('https://medium.com/p/aea44d0b7b7')),
    jsonb_build_object('providerId', '3fa344b4391b', 'title', '당근 B', 'url', 'https://medium.com/daangn/slug-3fa344b4391b', 'publishedAt', '2026-08-03T00:00:00Z')
  ));
  perform test.ok((r ->> 'storedCount')::int = 2, '당근 2건 저장');

  perform test.fails(format($q$select memo.finish_blog_sync('daangn', 1, %L, %L::jsonb)$q$, tok,
    '{"kind":"daangn","hasNextPage":true,"endCursor":"abc","uniqueCount":2}'), '22023', 'hasNextPage=true면 finish 거절');
  perform test.fails(format($q$select memo.finish_blog_sync('daangn', 1, %L, %L::jsonb)$q$, tok,
    '{"kind":"daangn","hasNextPage":false,"endCursor":"abc","uniqueCount":2}'), '22023', 'endCursor가 남아 있으면 finish 거절');
  perform test.fails(format($q$select memo.finish_blog_sync('daangn', 1, %L, %L::jsonb)$q$, tok,
    '{"kind":"daangn","hasNextPage":false,"endCursor":"","uniqueCount":3}'), '22023', '고유 수가 다르면 finish 거절');

  r := memo.fail_blog_sync('daangn', 1, tok, 'blocked', null, false);
  perform test.ok(r ->> 'status' = 'partial', '차단은 fail로 기록');
  perform test.ok((select last_error from memo.blog_sync_state where blog_id = 'daangn') = 'blocked' and (select initial_completed_at from memo.blog_sync_state where blog_id = 'daangn') is null, '차단은 complete로 표시하지 않는다');
end $$;

-- ---------------------------------------------------------------------------
-- D. 사용자 조회: 구독, 목록, 정렬, cursor, 공개 응답에 내부 값 없음
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;

do $$
declare
  r jsonb;
  s jsonb;
  ids text[] := '{}';
  cur jsonb := null;
  ver timestamptz;
  n int := 0;
begin
  r := memo.get_blog_reading_page();
  perform test.ok(jsonb_array_length(r -> 'items') = 0 and r -> 'nextCursor' = 'null'::jsonb, '구독이 없으면 빈 목록');

  perform test.fails($q$select memo.set_blog_subscription('velog', true)$q$, '22023', '지원하지 않는 소스는 구독 불가');
  s := memo.set_blog_subscription('toss', true);
  perform test.ok((s ->> 'active')::boolean, '토스 구독');
  s := memo.set_blog_subscription('daangn', true);

  perform test.fails($q$select memo.get_blog_reading_page('velog')$q$, '22023', '잘못된 소스는 에러');
  perform test.fails($q$select memo.get_blog_reading_page(null, 'random')$q$, '22023', '잘못된 정렬은 에러');
  perform test.fails($q$select memo.get_blog_reading_page(null, 'oldest', 0)$q$, '22023', '잘못된 page_size는 에러');
  perform test.fails($q$select memo.get_blog_reading_page(null, 'oldest', 30, '{"blogId":"x"}')$q$, '22023', '잘못된 cursor는 에러');
  perform test.fails($q$select memo.get_blog_reading_page(null, 'oldest', 30, '{"blogId":"toss","providerId":"1","publishedAt":"nope"}')$q$, '22023', '잘못된 cursor 시각은 에러');

  -- 과거순 전체 순회: 총 7건(토스5 + 당근2), null 게시일은 맨 뒤
  loop
    r := memo.get_blog_reading_page(null, 'oldest', 2, cur);
    ver := (r ->> 'catalogVersion')::timestamptz;
    ids := ids || array(select x ->> 'providerId' from jsonb_array_elements(r -> 'items') x);
    n := n + 1;
    exit when r -> 'nextCursor' = 'null'::jsonb or n > 10;
    cur := r -> 'nextCursor';
  end loop;
  perform test.ok(ids = array['101', '102', '103', 'aea44d0b7b7', '105', '3fa344b4391b', '104'], '과거순 순회 순서 ' || array_to_string(ids, ','));
  perform test.ok(cardinality(ids) = 7 and (select count(distinct i) from unnest(ids) i) = 7, '중복·누락 없이 7건 (' || n || '페이지)');

  -- 최신순: 뒤집힌 순서, null은 여전히 뒤
  ids := '{}'; cur := null; n := 0;
  loop
    r := memo.get_blog_reading_page(null, 'newest', 3, cur);
    ids := ids || array(select x ->> 'providerId' from jsonb_array_elements(r -> 'items') x);
    n := n + 1;
    exit when r -> 'nextCursor' = 'null'::jsonb or n > 10;
    cur := r -> 'nextCursor';
  end loop;
  perform test.ok(ids = array['3fa344b4391b', '105', 'aea44d0b7b7', '103', '102', '101', '104'], '최신순 순회 순서 ' || array_to_string(ids, ','));

  r := memo.get_blog_reading_page('daangn');
  perform test.ok(jsonb_array_length(r -> 'items') = 2, '소스 필터');
  perform test.ok(r -> 'sources' -> 0 ->> 'blogId' = 'daangn', 'sources는 필터 범위만');

  -- 내부 값 비노출
  r := memo.get_blog_reading_page();
  perform test.ok(r::text !~* 'lease|checkpoint|token|requested_by|generation', '목록 응답에 lease/checkpoint/토큰/세대가 없다');
  perform test.ok(memo.get_blog_reading_summary()::text !~* 'lease|checkpoint|token|requested_by', '요약 응답에 내부 값이 없다');

  -- 부분 수집 소스에는 확정 total이 없다 (당근은 차단 실패)
  s := memo.get_blog_reading_summary();
  perform test.ok((select x ->> 'total' from jsonb_array_elements(s -> 'sources') x where x ->> 'blogId' = 'daangn') is null, '부분 수집(당근)은 total null');
  perform test.ok((select x ->> 'phase' from jsonb_array_elements(s -> 'sources') x where x ->> 'blogId' = 'daangn') = 'partial', '당근 phase=partial');
  perform test.ok((select (x ->> 'total')::int from jsonb_array_elements(s -> 'sources') x where x ->> 'blogId' = 'toss') = 5, '완료(토스)는 total=5');
  perform test.ok((select x ->> 'phase' from jsonb_array_elements(s -> 'sources') x where x ->> 'blogId' = 'toss') = 'complete', '토스 phase=complete');
  perform test.ok((select (x ->> 'collectedCount')::int from jsonb_array_elements(s -> 'sources') x where x ->> 'blogId' = 'daangn') = 2, '당근 collectedCount=2 (실패해도 글 유지)');
end $$;
reset role;

-- ---------------------------------------------------------------------------
-- E. 완료 판정
-- ---------------------------------------------------------------------------
-- 사용자 1: a(내용 있는 메모) / b(제목만) / c(공백만) / d 삭제됨 / 105 impression만 / 당근A 다른 slug + Medium ID / 당근B 구형 빈 page_key
-- 사용자 2: 토스 101에 메모(사용자 1에게 영향 없어야 함)
insert into memo.memo (memo, user_id, url, title, impression, "actionItem", deleted_at, page_key) values
  ('읽었다',  '00000000-0000-0000-0000-000000000001', 'https://toss.tech/article/a?utm_source=x', '토스 A', null, null, null, 'https://toss.tech/article/a'),
  ('',        '00000000-0000-0000-0000-000000000001', 'https://toss.tech/article/b', '토스 B', null, null, null, 'https://toss.tech/article/b'),
  (E'  \n\t', '00000000-0000-0000-0000-000000000001', 'https://toss.tech/article/c', '토스 C', E' ', E'　', null, 'https://toss.tech/article/c'),
  ('삭제됨',  '00000000-0000-0000-0000-000000000001', 'https://toss.tech/article/d', '토스 D', null, null, now(), 'https://toss.tech/article/d'),
  (null,      '00000000-0000-0000-0000-000000000001', 'https://toss.tech/article/105', '토스 E', '인상', null, null, 'https://toss.tech/article/105'),
  ('당근 메모', '00000000-0000-0000-0000-000000000001', 'https://medium.com/daangn/%EB%8B%A4%EB%A5%B8-slug-aea44d0b7b7?source=rss-4505f82a2dbd------2', '당근 A', null, null, null, 'https://medium.com/daangn/%EB%8B%A4%EB%A5%B8-slug-aea44d0b7b7?source=rss-4505f82a2dbd------2'),
  ('구형',     '00000000-0000-0000-0000-000000000001', 'https://medium.com/daangn/slug-3fa344b4391b#x', '당근 B', null, null, null, ''),
  ('남의 메모', '00000000-0000-0000-0000-000000000002', 'https://toss.tech/article/c', '토스 C', null, null, null, 'https://toss.tech/article/c');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;

do $$
declare
  r jsonb;
  s jsonb;
  function_completed text[];
begin
  r := memo.get_blog_reading_page(null, 'oldest', 30);
  function_completed := array(select x ->> 'providerId' from jsonb_array_elements(r -> 'items') x where (x ->> 'completed')::boolean order by 1);
  perform test.ok(function_completed = array['101', '105', '3fa344b4391b', 'aea44d0b7b7'], '완료 글: ' || array_to_string(function_completed, ','));

  perform test.ok(not (select (x ->> 'completed')::boolean from jsonb_array_elements(r -> 'items') x where x ->> 'providerId' = '102'), '제목만/빈 메모는 미완료');
  perform test.ok(not (select (x ->> 'completed')::boolean from jsonb_array_elements(r -> 'items') x where x ->> 'providerId' = '103'), '공백뿐(NBSP·전각)은 미완료, 다른 사용자의 메모도 무관');
  perform test.ok(not (select (x ->> 'completed')::boolean from jsonb_array_elements(r -> 'items') x where x ->> 'providerId' = '104'), '삭제된 메모는 미완료');
  perform test.ok((select x ->> 'memoId' from jsonb_array_elements(r -> 'items') x where x ->> 'providerId' = '101') is not null, '완료 글은 memoId를 준다');

  s := memo.get_blog_reading_summary();
  perform test.ok((select (x ->> 'completedCount')::int from jsonb_array_elements(s -> 'sources') x where x ->> 'blogId' = 'toss') = 2, '토스 완료 2 (101, 105)');
  perform test.ok((select (x ->> 'completedCount')::int from jsonb_array_elements(s -> 'sources') x where x ->> 'blogId' = 'daangn') = 2, '당근 완료 2 (Medium ID, 구형 빈 page_key)');
end $$;

-- 같은 글에 유효 메모가 둘이어도 고유 글 수로 센다, 삭제/복원 반영
reset role;
insert into memo.memo (memo, user_id, url, page_key) values ('두 번째', '00000000-0000-0000-0000-000000000001', 'https://toss.tech/article/a', 'https://toss.tech/article/a');
update memo.memo set deleted_at = now() where user_id = '00000000-0000-0000-0000-000000000001' and page_key = 'https://toss.tech/article/a';
set role authenticated;
do $$
declare s jsonb := memo.get_blog_reading_summary();
begin
  perform test.ok((select (x ->> 'completedCount')::int from jsonb_array_elements(s -> 'sources') x where x ->> 'blogId' = 'toss') = 1, '마지막 유효 메모를 삭제하면 미완료 (105만 남음)');
end $$;
reset role;
update memo.memo set deleted_at = null where user_id = '00000000-0000-0000-0000-000000000001' and page_key = 'https://toss.tech/article/a';
set role authenticated;
do $$
declare s jsonb := memo.get_blog_reading_summary();
begin
  perform test.ok((select (x ->> 'completedCount')::int from jsonb_array_elements(s -> 'sources') x where x ->> 'blogId' = 'toss') = 2, '복원하면 다시 완료 (메모 2개여도 글 1개로 계산)');
end $$;
reset role;

-- 옛 주소(세대 1의 /article/c)에 남긴 메모. 세대 2에서 글 URL이 바뀌어도 별칭으로 계속 붙어야 한다.
insert into memo.memo (memo, user_id, url, page_key) values ('옛 주소 메모', '00000000-0000-0000-0000-000000000001', 'https://toss.tech/article/c', 'https://toss.tech/article/c');

-- ---------------------------------------------------------------------------
-- F. 재순회(세대 2): 사라진 글은 unavailable, URL 변경은 별칭, 스냅샷 catalog_version
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;
create temp table snap as select memo.get_blog_reading_page('toss', 'oldest', 2) as page;
grant all on snap to public;
reset role;

do $$
declare
  c jsonb;
  tok uuid;
  r jsonb;
begin
  perform test.ok(memo.claim_blog_sync('toss', 'daily') ->> 'reason' = 'recent_success', '20시간 안에 성공했으면 daily는 건너뛴다');

  c := memo.claim_blog_sync('toss', 'daily', true);
  perform test.ok((c ->> 'generation')::int = 2 and not (c ->> 'resume')::boolean and c -> 'checkpoint' = 'null'::jsonb, 'force daily는 새 세대 2');
  tok := (c ->> 'leaseToken')::uuid;

  -- 진행 중(refreshing)에는 이전 total이 유지되고 phase만 바뀐다
  perform test.ok((select phase from memo.blog_sync_public_status(array['toss'])) = 'refreshing', '재순회 중 phase=refreshing');

  -- 102는 사라졌고, 103은 URL이 바뀌었고, 106이 새로 생겼다. 104/105/101은 그대로.
  r := memo.ingest_blog_batch('toss', 2, tok, jsonb_build_array(
    jsonb_build_object('providerId', '101', 'title', '토스 A', 'url', 'https://toss.tech/article/a', 'publishedAt', '2021-04-28T08:00:00+09:00'),
    jsonb_build_object('providerId', '103', 'title', '토스 C', 'url', 'https://toss.tech/article/c-new', 'publishedAt', '2022-01-01T00:00:00Z'),
    jsonb_build_object('providerId', '104', 'title', '토스 D', 'url', 'https://toss.tech/article/d'),
    jsonb_build_object('providerId', '105', 'title', '토스 E', 'url', 'https://toss.tech/article/e', 'publishedAt', '2023-05-05T00:00:00Z'),
    jsonb_build_object('providerId', '106', 'title', '토스 F', 'url', 'https://toss.tech/article/f', 'publishedAt', '2024-01-01T00:00:00Z')
  ));
  perform test.ok((r ->> 'storedCount')::int = 5, '세대 2 고유 5건');
  perform test.ok(exists (select 1 from memo.blog_article_alias where provider_id = '103' and page_key = 'https://toss.tech/article/c'), 'URL이 바뀌면 이전 page_key가 별칭으로 남는다');

  r := memo.finish_blog_sync('toss', 2, tok, '{"kind":"toss","nextIsNull":true,"reportedCount":5,"uniqueCount":5,"pageCount":1}');
  perform test.ok((r ->> 'unavailableMarked')::int = 1 and (r ->> 'total')::int = 5, '이전 세대에만 있던 102는 unavailable로 표시');
  perform test.ok((select available from memo.blog_article where provider_id = '102') = false, '지우지 않고 available=false');
  perform test.ok((select count(*) from memo.blog_article where blog_id = 'toss') = 6, '행은 하나도 지우지 않는다');
end $$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;
do $$
declare
  old_page jsonb := (select page from snap);
  r jsonb;
  ids text[];
begin
  -- 스냅샷: 이전 catalogVersion을 넘기면 새로 들어온 106은 목록에 섞이지 않고 개수로만 알린다
  r := memo.get_blog_reading_page('toss', 'oldest', 30, null, (old_page ->> 'catalogVersion')::timestamptz);
  ids := array(select x ->> 'providerId' from jsonb_array_elements(r -> 'items') x);
  perform test.ok(not ('106' in (select unnest(ids))), '스냅샷 목록에 새 글이 섞이지 않는다');
  perform test.ok((r ->> 'newArticleCount')::int = 1, '새 글 1개는 newArticleCount로 알린다');

  r := memo.get_blog_reading_page('toss', 'oldest', 30);
  ids := array(select x ->> 'providerId' from jsonb_array_elements(r -> 'items') x);
  perform test.ok('106' = any (ids) and not ('102' = any (ids)), '목록 갱신 후에는 새 글이 보이고 unavailable 글은 빠진다');
  perform test.ok((r ->> 'newArticleCount')::int = 0, '갱신 직후 newArticleCount=0');
  perform test.ok((select (x ->> 'completed')::boolean from jsonb_array_elements(r -> 'items') x where x ->> 'providerId' = '103'), 'URL이 바뀐 글도 옛 주소 메모(별칭)로 완료');
end $$;

-- ---------------------------------------------------------------------------
-- G. 구독 해제/재구독, 재개 요청
-- ---------------------------------------------------------------------------
do $$
declare
  s jsonb;
  r jsonb;
  t1 timestamptz;
begin
  s := memo.set_blog_subscription('daangn', false);
  perform test.ok(not (s ->> 'active')::boolean and s ->> 'unsubscribedAt' is not null, '구독 해제');
  perform test.ok(jsonb_array_length(memo.get_blog_reading_page('daangn') -> 'items') = 0, '해제하면 목록에서 숨는다');
  perform test.ok(exists (select 1 from memo.memo where url like '%3fa344b4391b%'), '메모는 보존');
  s := memo.set_blog_subscription('daangn', true);
  perform test.ok((s ->> 'active')::boolean and jsonb_array_length(memo.get_blog_reading_page('daangn') -> 'items') = 2, '재구독하면 기존 카탈로그와 완료가 복원');
  t1 := (s ->> 'subscribedAt')::timestamptz;
  s := memo.set_blog_subscription('daangn', true);
  perform test.ok((s ->> 'subscribedAt')::timestamptz = t1, '구독 반복은 시각을 바꾸지 않는다(멱등)');

  -- 재개 요청 (당근은 blocked로 partial)
  r := memo.request_blog_sync('daangn');
  perform test.ok(r ->> 'status' = 'queued' and not (r ->> 'coalesced')::boolean and r ->> 'nextCheckAt' is not null, '재개 요청 접수');
  r := memo.request_blog_sync('daangn');
  perform test.ok(r ->> 'status' = 'queued' and (r ->> 'coalesced')::boolean, '같은 소스 요청은 합쳐진다');
  perform test.ok((memo.get_blog_reading_summary() -> 'sources' -> 0 ->> 'resumeQueued') is not null, '요약에 resumeQueued');
end $$;
reset role;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', false);
set role authenticated;
do $$
declare r jsonb;
begin
  perform test.fails($q$select memo.request_blog_sync('daangn')$q$, '42501', '구독하지 않은 사용자는 요청할 수 없다');
  perform memo.set_blog_subscription('daangn', true);
  r := memo.request_blog_sync('daangn');
  perform test.ok(r ->> 'status' = 'queued' and (r ->> 'coalesced')::boolean, '다른 사용자의 요청도 대기 중인 요청에 합쳐진다');
end $$;
reset role;

do $$
declare
  c jsonb;
  tok uuid;
  r jsonb;
begin
  c := memo.claim_blog_sync('daangn', 'request');
  perform test.ok((c ->> 'claimed')::boolean and (c ->> 'resume')::boolean and (c ->> 'generation')::int = 1, '대기 요청이 있으면 request 트리거가 재개(같은 세대)');
  tok := (c ->> 'leaseToken')::uuid;
  perform test.ok((select count(*) from memo.blog_sync_request where status = 'running') = 1 and (select count(*) from memo.blog_sync_request where status = 'queued') = 0, '요청은 running으로 넘어간다');
  perform test.ok((select phase from memo.blog_sync_public_status(array['daangn'])) = 'collecting', '당근 phase=collecting');

  -- 당근 완료: 종료 증거 + 고유 수
  r := memo.finish_blog_sync('daangn', 1, tok, '{"kind":"daangn","hasNextPage":false,"endCursor":"","uniqueCount":2}');
  perform test.ok((r ->> 'total')::int = 2, '당근 finish 성공');
  perform test.ok((select count(*) from memo.blog_sync_request where status <> 'done') = 0, '완료하면 요청이 done');
end $$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;
do $$
declare r jsonb;
begin
  r := memo.request_blog_sync('daangn');
  perform test.ok(r ->> 'status' = 'throttled' and r ->> 'nextRequestAt' is not null, '같은 사용자의 15분 안 재요청은 throttled');
end $$;
reset role;

-- count_mismatch로 멈춘 순회는 이어가지 않고 새 세대로 시작한다
do $$
declare
  c jsonb := memo.claim_blog_sync('toss', 'manual');
  g bigint := (c ->> 'generation')::bigint;
  c2 jsonb;
begin
  perform memo.fail_blog_sync('toss', g, (c ->> 'leaseToken')::uuid, 'count_mismatch', null, false);
  c2 := memo.claim_blog_sync('toss', 'manual');
  perform test.ok((c2 ->> 'generation')::bigint = g + 1 and not (c2 ->> 'resume')::boolean, 'count_mismatch 뒤에는 새 세대로 시작');
  perform memo.fail_blog_sync('toss', g + 1, (c2 ->> 'leaseToken')::uuid, 'network');
  c2 := memo.claim_blog_sync('toss', 'manual');
  perform test.ok((c2 ->> 'generation')::bigint = g + 1 and (c2 ->> 'resume')::boolean, '일시 실패(network) 뒤에는 같은 세대로 이어간다');
  perform memo.fail_blog_sync('toss', g + 1, (c2 ->> 'leaseToken')::uuid, 'network');
end $$;

-- lease 만료된 running은 partial로 보이고, 다음 claim이 이어받는다
update memo.blog_sync_state set status = 'running', lease_expires_at = now() - interval '1 minute', lease_token = gen_random_uuid(), last_error = null where blog_id = 'toss';
do $$
declare c jsonb;
begin
  perform test.ok((select status from memo.blog_sync_public_status(array['toss'])) = 'partial' and (select phase from memo.blog_sync_public_status(array['toss'])) = 'refresh_failed', '죽은 running은 refresh_failed(partial)로 보인다');
  perform test.ok((select last_error from memo.blog_sync_public_status(array['toss'])) = 'interrupted', '사유는 interrupted');
  c := memo.claim_blog_sync('toss', 'manual');
  perform test.ok((c ->> 'claimed')::boolean and (c ->> 'resume')::boolean, '만료된 lease는 다음 claim이 이어받는다');
end $$;

select 'ALL BLOG READING SQL TESTS PASSED' as result;
