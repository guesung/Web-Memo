-- Run after harness.sql and the highlight memo migration in an empty local DB.
insert into auth.users (id) values
  ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002');

insert into memo.highlight (
  user_id, url, title, exact_text, prefix_text, suffix_text,
  text_position_start, color, note, page_key
) values
  ('00000000-0000-0000-0000-000000000001', 'https://example.com/a', null,
   '인용 문장', '앞', '뒤', 7, 'yellow', '기존 코멘트', 'https://example.com/a'),
  ('00000000-0000-0000-0000-000000000002', 'https://example.com/b', '타인',
   '타인 문장', null, null, null, 'green', null, 'https://example.com/b');

set role anon;
select test.fails(
  $q$select memo.create_memo_from_highlight(1, '생각')$q$,
  '42501', '익명 RPC 실행 금지'
);
select test.fails(
  $q$select * from memo.highlight_memo_source$q$,
  '42501', '익명 연결 조회 금지'
);
reset role;

select set_config('request.jwt.claim.sub', '', false);
set role authenticated;
select test.fails(
  $q$select memo.create_memo_from_highlight(1, '생각')$q$,
  'PT401', '인증 클레임 누락 거부'
);
reset role;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;
select test.fails(
  $q$select memo.create_memo_from_highlight(2, '타인 메모')$q$,
  'P0002', '타인 하이라이트 접근 거부'
);
select test.fails(
  $q$select memo.create_memo_from_highlight(999, '없는 문장')$q$,
  'P0002', '없는 하이라이트 거부'
);
select test.fails(
  $q$select memo.create_memo_from_highlight(1, '   ')$q$,
  '22023', '공백 본문 거부'
);
select test.fails(
  $q$select memo.create_memo_from_highlight(1, null)$q$,
  '22023', 'null 본문 거부'
);
select test.ok((select count(*) = 0 from memo.memo), '실패 시 부분 메모 없음');

select test.fails(
  $q$insert into memo.highlight_memo_source (memo_id, highlight_id, user_id, exact_text, url, color)
     values (1, 1, auth.uid(), '변조', 'https://evil.example', 'yellow')$q$,
  '42501', '연결 직접 생성 금지'
);

create temp table created_result as
  select memo.create_memo_from_highlight(1, '내 생각') as value;
select test.ok((select value ->> 'created' = 'true' from created_result), '신규 생성 반환');
select test.ok((select value ->> 'highlight_id' = '1' from created_result), '원본 ID 반환');
select test.ok((select value ->> 'deleted_at' is null from created_result), '신규 메모 삭제 시각 null');
select test.ok(
  (select memo = '내 생각' and title = 'https://example.com/a'
   and page_key = 'https://example.com/a' from memo.memo where id = 1),
  '사용자 본문과 빈 제목 대체 저장'
);
select test.ok(
  (select exact_text = '인용 문장' and prefix_text = '앞' and suffix_text = '뒤'
    and text_position_start = 7 and color = 'yellow' and url = 'https://example.com/a'
    from memo.highlight_memo_source where highlight_id = 1),
  'DB 하이라이트에서 인용 스냅샷 저장'
);
select test.ok(
  (select note = '기존 코멘트' from memo.highlight where id = 1),
  '기존 코멘트 유지'
);

select test.fails(
  $q$update memo.highlight_memo_source set exact_text = '변조' where highlight_id = 1$q$,
  '42501', '인용 스냅샷 직접 수정 금지'
);
select test.fails(
  $q$delete from memo.highlight_memo_source where highlight_id = 1$q$,
  '42501', '인용 스냅샷 직접 삭제 금지'
);

update memo.highlight set exact_text = '바뀐 원문', note = '바뀐 코멘트' where id = 1;
select test.ok(
  (select exact_text = '인용 문장' from memo.highlight_memo_source where highlight_id = 1),
  '하이라이트 수정 후에도 인용 고정'
);

create temp table retry_result as
  select memo.create_memo_from_highlight(1, '덮어쓰기 시도') as value;
select test.ok((select value ->> 'created' = 'false' from retry_result), '재시도는 기존 연결 반환');
select test.ok((select value ->> 'memo_id' = '1' from retry_result), '재시도 메모 ID 고정');
select test.ok((select count(*) = 1 from memo.memo), '재시도는 중복 메모 없음');
select test.ok((select memo = '내 생각' from memo.memo where id = 1), '재시도 본문 덮어쓰기 없음');

update memo.memo set deleted_at = '2026-10-11 00:00:00+00' where id = 1;
select test.ok(
  (memo.create_memo_from_highlight(1, '휴지통 재시도') ->> 'deleted_at')::timestamptz
    = '2026-10-11 00:00:00+00'::timestamptz,
  '휴지통 메모를 재사용하고 삭제 시각 반환'
);
select test.ok((select count(*) = 1 from memo.memo), '휴지통 중복 생성 없음');
reset role;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', false);
set role authenticated;
select test.ok((select count(*) = 0 from memo.highlight_memo_source), '다른 사용자는 연결을 볼 수 없음');
reset role;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;
delete from memo.highlight where id = 1;
select test.ok(
  (select highlight_id is null and exact_text = '인용 문장'
    from memo.highlight_memo_source where memo_id = 1),
  '하이라이트 삭제 후 메모와 인용 보존'
);
select test.ok((select count(*) = 1 from memo.memo), '하이라이트 삭제 후 메모 보존');
delete from memo.memo where id = 1;
select test.ok((select count(*) = 0 from memo.highlight_memo_source), '메모 영구 삭제 시 연결 제거');

insert into memo.highlight (user_id, url, exact_text, page_key)
values (auth.uid(), 'https://example.com/c', '다른 인용', 'https://example.com/c');
select test.ok(
  (memo.create_memo_from_highlight(3, '첫 메모') ->> 'created')::boolean,
  '새 하이라이트에 첫 메모 생성'
);
delete from memo.memo where id = 2;
select test.ok(
  (memo.create_memo_from_highlight(3, '다시 작성') ->> 'created')::boolean,
  '메모 영구 삭제 후 같은 하이라이트에 다시 생성'
);
select test.ok(
  (select memo = '다시 작성' from memo.memo where id = 3),
  '재생성한 메모는 새 본문 사용'
);
reset role;
