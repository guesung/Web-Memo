-- Run against an empty local DB after harness.sql and
-- supabase/migrations/20261011120000_ensure_memo_for_highlight.sql.
insert into auth.users (id) values
  ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002');

select test.ok(
  not has_function_privilege('authenticated', 'memo.ensure_memo_for_highlight()', 'EXECUTE'),
  'authenticated cannot invoke the trigger function directly'
);
-- Expected values mirror the supported normalized-URL cases in shared Url.test.ts.
select test.ok(
  (select bool_and(memo.legacy_page_key_from_normalized_url(url) = page_key)
   from (values
     ('https://example.com/article?utm_source=newsletter&id=42&gclid=abc',
      'https://example.com/article?id=42'),
     ('https://example.com/article?ID=42&fbclid=abc&ID=43',
      'https://example.com/article?ID=42&ID=43'),
     ('https://example.com/article?UTM_Campaign=fall&msclkid=abc',
      'https://example.com/article'),
     ('https://example.com/article?utm%5Fsource=feed&id=42',
      'https://example.com/article?utm%5Fsource=feed&id=42'),
     ('https://example.com/article?utm_source=&id=42#section',
      'https://example.com/article?id=42'),
     ('https://www.youtube.com/watch?v=abc&utm_source=newsletter&t=30',
      'https://www.youtube.com/watch?v=abc'),
     ('https://www.youtube.com/shorts/abc',
      'https://www.youtube.com/shorts/abc?v=null'),
     ('https://www.youtube.com/watch?v',
      'https://www.youtube.com/watch?v='),
     ('https://example.com', 'https://example.com/')
   ) as fixtures(url, page_key)),
  'legacy normalized URL key matches shared getPageKey fixtures'
);
select test.ok(
  memo.legacy_page_key_from_normalized_url('https://www.youtube.com/watch?v=a%62c') is null
  and memo.legacy_page_key_from_normalized_url('https://EXAMPLE.com:443/a') is null,
  'unsupported URL parser forms use only the exact-URL fallback'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;

insert into memo.highlight (user_id, url, title, "favIconUrl", exact_text, page_key)
values (auth.uid(), 'https://example.com/a', 'Article A', 'https://example.com/favicon.ico',
        'First quote', 'https://example.com/a');
select test.ok(
  (select count(*) = 1 from memo.memo where user_id = auth.uid()
    and page_key = 'https://example.com/a' and deleted_at is null),
  'first highlight creates one active memo'
);
select test.ok(
  (select memo = '' and title = 'Article A' and url = 'https://example.com/a'
    and "favIconUrl" = 'https://example.com/favicon.ico'
    from memo.memo where user_id = auth.uid() and page_key = 'https://example.com/a'),
  'new memo has blank body and highlight page metadata'
);

insert into memo.highlight (user_id, url, title, exact_text, page_key)
values (auth.uid(), 'https://example.com/a?utm_source=share', 'Later title',
        'Second quote', 'https://example.com/a');
select test.ok(
  (select count(*) = 1 from memo.memo where user_id = auth.uid()
    and page_key = 'https://example.com/a'),
  'another highlight for the same page reuses its memo'
);
select test.ok(
  (select title = 'Article A' from memo.memo where user_id = auth.uid()
    and page_key = 'https://example.com/a'),
  'later highlight does not overwrite existing metadata'
);

insert into memo.memo (user_id, memo, title, url, page_key)
values (auth.uid(), 'Authored text', 'My title', 'https://example.com/b',
        'https://example.com/b');
insert into memo.highlight (user_id, url, title, exact_text, page_key)
values (auth.uid(), 'https://example.com/b', 'Incoming title', 'Quote B',
        'https://example.com/b');
select test.ok(
  (select count(*) = 1 from memo.memo where user_id = auth.uid()
    and page_key = 'https://example.com/b'),
  'existing authored memo is reused'
);
select test.ok(
  (select memo = 'Authored text' and title = 'My title' from memo.memo
    where user_id = auth.uid() and page_key = 'https://example.com/b'),
  'existing authored content is unchanged'
);

insert into memo.highlight (user_id, url, title, exact_text, page_key)
values (auth.uid(), 'https://example.com/c', null, 'Quote C', 'https://example.com/c');
select test.ok(
  (select count(*) = 1 from memo.memo where user_id = auth.uid()
    and page_key = 'https://example.com/c' and title = 'https://example.com/c'),
  'different page gets a memo and URL fallback title'
);

update memo.memo set deleted_at = now()
where user_id = auth.uid() and page_key = 'https://example.com/c';
insert into memo.highlight (user_id, url, exact_text, page_key)
values (auth.uid(), 'https://example.com/c', 'Quote after trash',
        'https://example.com/c');
select test.ok(
  (select count(*) = 2 from memo.memo where user_id = auth.uid()
    and page_key = 'https://example.com/c'),
  'trashed memo is preserved and a new memo is created'
);
select test.ok(
  (select count(*) = 1 from memo.memo where user_id = auth.uid()
    and page_key = 'https://example.com/c' and deleted_at is null),
  'new page memo is active while old memo stays in trash'
);

insert into memo.memo (user_id, memo, title, url, page_key)
values (auth.uid(), 'Legacy note', 'Legacy title', 'https://example.com/legacy', '');
insert into memo.highlight (user_id, url, exact_text, page_key)
values (auth.uid(), 'https://example.com/legacy', 'New quote',
        'https://example.com/legacy');
select test.ok(
  (select count(*) = 1 from memo.memo where user_id = auth.uid()
    and url = 'https://example.com/legacy'),
  'legacy empty-key memo is reused by exact URL'
);

insert into memo.memo (user_id, memo, title, url, page_key)
values (auth.uid(), 'Tracked legacy note', 'Tracked legacy title',
        'https://example.com/tracked?id=42&utm_source=old', '');
insert into memo.highlight (user_id, url, exact_text, page_key)
values (auth.uid(), 'https://example.com/tracked?utm_source=new&id=42&fbclid=recent',
        'Same tracked page', 'https://example.com/tracked?id=42');
select test.ok(
  (select count(*) = 1 from memo.memo where user_id = auth.uid()
    and url like 'https://example.com/tracked%'),
  'tracking variants reuse a legacy empty-key memo'
);
select test.ok(
  (select memo = 'Tracked legacy note' and url =
    'https://example.com/tracked?id=42&utm_source=old'
   from memo.memo where user_id = auth.uid()
     and url like 'https://example.com/tracked%'),
  'legacy reuse leaves stored URL and body unchanged'
);
insert into memo.highlight (user_id, url, exact_text, page_key)
values (auth.uid(), 'https://example.com/tracked?id=43&utm_source=new',
        'Different content page', 'https://example.com/tracked?id=43');
select test.ok(
  (select count(*) = 2 from memo.memo where user_id = auth.uid()
    and url like 'https://example.com/tracked%'),
  'meaningful query changes create a distinct memo'
);

insert into memo.memo (user_id, memo, title, url, page_key)
values (auth.uid(), 'Video note', 'Video',
        'https://www.youtube.com/watch?v=abc&t=30', '');
insert into memo.highlight (user_id, url, exact_text, page_key)
values (auth.uid(), 'https://www.youtube.com/watch?v=abc&utm_source=new',
        'Same video', 'https://www.youtube.com/watch?v=abc');
select test.ok(
  (select count(*) = 1 from memo.memo where user_id = auth.uid()
    and url like 'https://www.youtube.com/watch%'),
  'YouTube normalized video key reuses a legacy memo'
);
insert into memo.highlight (user_id, url, exact_text, page_key)
values (auth.uid(), 'https://www.youtube.com/watch?v=def',
        'Different video', 'https://www.youtube.com/watch?v=def');
select test.ok(
  (select count(*) = 2 from memo.memo where user_id = auth.uid()
    and url like 'https://www.youtube.com/watch%'),
  'different YouTube video stays distinct'
);

insert into memo.highlight (user_id, url, exact_text, page_key)
values (auth.uid(), 'https://example.com/a', 'Legacy client quote', '');
select test.ok(
  (select count(*) = 1 from memo.memo where user_id = auth.uid()
    and url = 'https://example.com/a'),
  'empty-key highlight reuses an exact-URL keyed memo'
);
insert into memo.highlight (user_id, url, exact_text, page_key)
values (auth.uid(), 'https://example.com/legacy-other', 'Another legacy quote', '');
select test.ok(
  (select count(*) = 1 from memo.memo where user_id = auth.uid()
    and url = 'https://example.com/legacy-other' and page_key = ''),
  'empty-key highlight does not reuse a different legacy page'
);

select test.fails(
  $q$insert into memo.highlight (user_id, url, exact_text, page_key)
     values ('00000000-0000-0000-0000-000000000002',
             'https://example.com/forbidden', 'Unauthorized quote',
             'https://example.com/forbidden')$q$,
  '42501', 'highlight RLS rejects another user before memo creation'
);
select test.ok(
  (select count(*) = 0 from memo.memo where url = 'https://example.com/forbidden'),
  'unauthorized highlight leaves no memo'
);
reset role;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', false);
set role authenticated;
insert into memo.highlight (user_id, url, exact_text, page_key)
values (auth.uid(), 'https://example.com/a', 'Other user quote',
        'https://example.com/a');
select test.ok(
  (select count(*) = 1 from memo.memo where user_id = auth.uid()
    and page_key = 'https://example.com/a'),
  'another user gets their own memo for the same page'
);
reset role;

create function test.reject_memo_insert() returns trigger language plpgsql as $$
begin
  if new.url = 'https://example.com/fail' then
    raise exception 'forced memo failure';
  end if;
  return new;
end;
$$;
create trigger reject_memo_insert before insert on memo.memo
for each row execute function test.reject_memo_insert();

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;
select test.fails(
  $q$insert into memo.highlight (user_id, url, exact_text, page_key)
     values (auth.uid(), 'https://example.com/fail', 'Must roll back',
             'https://example.com/fail')$q$,
  'P0001', 'memo insertion failure propagates from highlight insert'
);
select test.ok(
  (select count(*) = 0 from memo.highlight where url = 'https://example.com/fail'),
  'memo failure rolls back the highlight'
);
select test.ok(
  (select count(*) = 0 from memo.memo where url = 'https://example.com/fail'),
  'memo failure leaves no partial memo'
);
reset role;
