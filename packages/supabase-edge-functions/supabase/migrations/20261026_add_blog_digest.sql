-- 블로그 새 글 묶음 알림(긱뉴스).
--   1) memo.blog_digest_log               하루 한 번 보낸 묶음 알림 이력(사용자·블로그·사용자 시간대 날짜당 1행)
--   2) memo.get_blog_digest_candidates    마지막 묶음 이후 새로 들어온, 아직 메모하지 않은 글의 개수·최신 제목
--
-- 둘 다 daily-article-reminder Edge Function(service_role)만 쓴다. 앱·웹 클라이언트는 접근하지 못한다.
-- 의존: 20260930_add_blog_reading.sql (blog_subscription, blog_article, is_supported_blog, has_blog_memo_text 등)

create table memo.blog_digest_log (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  blog_id       text not null,
  -- 사용자 시간대 기준 발송 날짜. 같은 날 두 번 보내지 않는 키다.
  sent_on       date not null,
  sent_at       timestamptz not null default now(),
  article_count integer not null,
  constraint blog_digest_log_blog_supported check (memo.is_supported_blog(blog_id)),
  constraint blog_digest_log_count_positive check (article_count >= 1),
  unique (user_id, blog_id, sent_on)
);

alter table memo.blog_digest_log enable row level security;

-- 정책이 없고 anon/authenticated 권한도 없다. service_role(bypassrls)만 읽고 쓴다.
revoke all on memo.blog_digest_log from public, anon, authenticated;
grant select, insert on memo.blog_digest_log to service_role;

-- 후보 집계. service_role에서는 auth.uid()가 없으므로 사용자 ID를 인자로 받고,
-- 완료 판정은 memo.blog_valid_memo_keys / blog_completed_articles와 같은 규칙(본문 있는 활성 메모 + page_key·별칭·Medium ID 일치)이다.
--   since        = 그 사용자·블로그의 마지막 묶음 발송 시각, 없으면 구독 시작 시각
--   count        = since 이후 처음 보인 글(available) 중 사용자가 메모하지 않은 글 수
--   latestTitle  = 그 글들 중 published_at 최신(동률이면 first_seen_at 최신) 제목
-- 활성 구독이 없으면 count 0, since null.
create function memo.get_blog_digest_candidates(p_user_id uuid, p_blog_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_since timestamptz;
  v_count integer;
  v_title text;
begin
  if p_user_id is null or not memo.is_supported_blog(p_blog_id) then
    raise exception 'invalid_argument' using errcode = '22023';
  end if;

  select coalesce(
    (select max(l.sent_at) from memo.blog_digest_log l
      where l.user_id = p_user_id and l.blog_id = p_blog_id),
    s.subscribed_at
  )
  into v_since
  from memo.blog_subscription s
  where s.user_id = p_user_id and s.blog_id = p_blog_id and s.active and s.unsubscribed_at is null;

  if v_since is null then
    return jsonb_build_object('count', 0, 'latestTitle', null, 'since', null);
  end if;

  with vm as materialized (
    select
      coalesce(nullif(m.page_key, ''), memo.blog_page_key(m.url)) as match_key,
      memo.blog_medium_post_id(m.url) as medium_id
    from memo.memo m
    where m.user_id = p_user_id
      and m.deleted_at is null
      and (
        memo.has_blog_memo_text(m.memo)
        or memo.has_blog_memo_text(m.impression)
        or memo.has_blog_memo_text(m."actionItem")
      )
  ),
  fresh as (
    select a.*
    from memo.blog_article a
    where a.blog_id = p_blog_id and a.available and a.first_seen_at > v_since
  ),
  done as (
    select f.provider_id
    from fresh f join vm on vm.match_key = f.page_key
    union
    select al.provider_id
    from memo.blog_article_alias al
    join fresh f on f.blog_id = al.blog_id and f.provider_id = al.provider_id
    join vm on vm.match_key = al.page_key
    union
    select f.provider_id
    from fresh f join vm on p_blog_id = 'daangn' and vm.medium_id = f.provider_id
  ),
  pending as (
    select f.title, f.published_at, f.first_seen_at
    from fresh f
    where f.provider_id not in (select provider_id from done)
  )
  select
    count(*)::integer,
    (array_agg(p.title order by p.published_at desc nulls last, p.first_seen_at desc))[1]
  into v_count, v_title
  from pending p;

  return jsonb_build_object('count', v_count, 'latestTitle', v_title, 'since', v_since);
end;
$$;

revoke all on function memo.get_blog_digest_candidates(uuid, text) from public, anon, authenticated;
grant execute on function memo.get_blog_digest_candidates(uuid, text) to service_role;
