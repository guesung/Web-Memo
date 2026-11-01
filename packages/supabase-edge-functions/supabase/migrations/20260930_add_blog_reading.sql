-- 블로그 정주행: 토스·당근 공개 글 카탈로그를 공유하고, 구독과 메모 완료는 사용자별로 계산한다.
--
-- 구성
--   1) 공개 카탈로그  memo.blog_article / memo.blog_article_alias   (로그인 사용자 읽기 전용)
--   2) 수집 상태      memo.blog_sync_state / memo.blog_sync_request (직접 접근 없음. cursor·lease는 밖으로 나가지 않는다)
--   3) 개인 구독      memo.blog_subscription                        (본인 행만 조회, 변경은 RPC로만)
--   4) 사용자 RPC     get_blog_reading_page / get_blog_reading_summary / set_blog_subscription / request_blog_sync
--   5) 수집 RPC       claim / ingest batch / checkpoint / finish / fail  (service_role 전용, blog-catalog-ingest Edge Function이 호출)
--
-- 원칙
--   - 글 개수 보존 상한이 없다. 지우는 일도 없다(이전 세대에서 사라진 글은 available=false로만 표시).
--   - 부분 수집에는 확정 total을 내보내지 않는다. total은 initial_completed_at이 있을 때만 나간다.
--   - 완료 판정은 SQL이 한다. 본인 활성 메모(deleted_at is null) 중 memo/impression/actionItem 하나라도
--     trim 후 내용이 있고, page_key(빈 구형 행은 URL에서 계산) · 별칭 · Medium 글 ID 중 하나가 글과 맞으면 완료.
--   - 정규화 계약(memo.blog_page_key, memo.has_blog_memo_text, memo.blog_medium_post_id)은
--     packages/supabase-edge-functions/tests/blogReading/fixtures.json 의 같은 fixture로 SQL과 JS(getPageKey)를 함께 검증한다.
--
-- 사용자 RPC 오류 코드 (PostgREST가 SQLSTATE를 HTTP 상태로 옮긴다)
--   PT401 unauthenticated · 42501 subscription_required · 22023 invalid_* · PT409 stale_lease(수집 RPC)

-- ---------------------------------------------------------------------------
-- 0) 지원 소스와 URL·본문 정규화 함수
-- ---------------------------------------------------------------------------

-- 지원 블로그는 여기 한 곳이다. 블로그를 더하려면 이 함수와 memo.blog_url_allowed를 함께 고친다.
create function memo.is_supported_blog(p_blog_id text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_blog_id in ('toss', 'daangn');
$$;

-- 수집으로 들어올 수 있는 글 URL 접두. 임의 URL을 저장하지 못하게 막는다.
create function memo.blog_url_allowed(p_blog_id text, p_url text, p_is_alias boolean default false)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case p_blog_id
    when 'toss' then p_url like 'https://toss.tech/article/%'
    when 'daangn' then
      case when p_is_alias then p_url like 'https://medium.com/%'
      else p_url like 'https://medium.com/daangn/%' end
    else false
  end;
$$;

-- 클라이언트 getPageKey(normalizeUrl + 추적 파라미터 제거)와 같은 결과를 내는 SQL 판.
-- http(s) URL만 다룬다. fragment 제거, scheme·host 소문자, 기본 포트 제거, 빈 경로는 '/',
-- utm_* · gclid · fbclid · msclkid 제거, 나머지 query는 순서 그대로 보존한다.
-- 빈 page_key를 가진 구형 메모의 URL에서 키를 계산하는 데 쓴다. 점 세그먼트 해석 같은 URL 파서의
-- 나머지 규칙은 따라 하지 않는다(블로그 글 URL에는 나오지 않는다).
create function memo.blog_page_key(p_url text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_match text[];
  v_scheme text;
  v_authority text;
  v_host text;
  v_port text;
  v_path text;
  v_query text;
  v_origin text;
  v_kept text[] := '{}';
  v_param text;
  v_name text;
begin
  if p_url is null then
    return null;
  end if;

  v_match := regexp_match(
    split_part(p_url, '#', 1),
    '^([A-Za-z][A-Za-z0-9+.-]*)://([^/?]*)([^?]*)(?:\?(.*))?$'
  );

  if v_match is null then
    return null;
  end if;

  v_scheme := lower(v_match[1]);

  if v_scheme not in ('http', 'https') then
    return null;
  end if;

  v_authority := regexp_replace(v_match[2], '^.*@', '');
  v_host := lower(regexp_replace(v_authority, ':[0-9]*$', ''));
  v_port := substring(v_authority from ':([0-9]+)$');
  v_path := coalesce(nullif(v_match[3], ''), '/');
  v_query := v_match[4];

  if v_host = '' then
    return null;
  end if;

  v_origin := v_scheme || '://' || v_host;

  if v_port is not null
    and not (v_scheme = 'http' and v_port = '80')
    and not (v_scheme = 'https' and v_port = '443') then
    v_origin := v_origin || ':' || v_port;
  end if;

  if v_query is null or v_query = '' then
    return v_origin || v_path;
  end if;

  foreach v_param in array string_to_array(v_query, '&') loop
    v_name := split_part(v_param, '=', 1);

    if v_name ~* '^utm_' or v_name ~* '^(gclid|fbclid|msclkid)$' then
      continue;
    end if;

    v_kept := v_kept || v_param;
  end loop;

  if cardinality(v_kept) = 0 then
    return v_origin || v_path;
  end if;

  return v_origin || v_path || '?' || array_to_string(v_kept, '&');
end;
$$;

-- Medium 글 ID를 URL에서 뽑는다. slug 뒤 '-<hex>' 또는 '/p/<hex>'. 글 ID는 10~12자리 hex다(옛 글은 11자리).
-- 추출은 느슨해도 안전하다. 비교는 항상 수집된 provider_id와의 완전 일치로만 한다.
create function memo.blog_medium_post_id(p_url text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_match text[];
  v_host text;
  v_path text;
  v_id text[];
begin
  if p_url is null then
    return null;
  end if;

  v_match := regexp_match(split_part(split_part(p_url, '#', 1), '?', 1), '^https?://([^/]+)(/.*)?$', 'i');

  if v_match is null then
    return null;
  end if;

  v_host := lower(regexp_replace(regexp_replace(v_match[1], '^.*@', ''), ':[0-9]*$', ''));

  if v_host <> 'medium.com' and v_host not like '%.medium.com' then
    return null;
  end if;

  v_path := coalesce(v_match[2], '');

  v_id := regexp_match(v_path, '^/p/([0-9a-f]{10,12})/?$');

  if v_id is not null then
    return v_id[1];
  end if;

  v_id := regexp_match(v_path, '/(?:[^/]*-)?([0-9a-f]{10,12})/?$');

  return v_id[1];
end;
$$;

-- JS의 String.prototype.trim()이 지우는 공백(ASCII 공백·NBSP·BOM·Zs·줄 구분자)만 남았는지 본다.
-- 정규식 [[:space:]]는 로케일에 기대므로 쓰지 않고 목록을 그대로 적는다.
create function memo.has_blog_memo_text(p_text text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(p_text, '') ~ '[^\t\n\v\f\r    -     　﻿]';
$$;

-- ---------------------------------------------------------------------------
-- 1) 테이블
-- ---------------------------------------------------------------------------

create table memo.blog_subscription (
  user_id         uuid not null references auth.users(id) on delete cascade,
  blog_id         text not null,
  active          boolean not null default true,
  subscribed_at   timestamptz not null default now(),
  unsubscribed_at timestamptz,
  primary key (user_id, blog_id),
  constraint blog_subscription_blog_supported check (memo.is_supported_blog(blog_id))
);

create table memo.blog_article (
  blog_id              text not null,
  provider_id          text not null,
  title                text not null,
  url                  text not null,
  page_key             text not null,
  published_at         timestamptz,
  first_seen_at        timestamptz not null default now(),
  -- 공급자가 알려준 수정 시각. 우리 행이 바뀐 시각이 아니다.
  updated_at           timestamptz,
  available            boolean not null default true,
  last_seen_generation bigint not null,
  primary key (blog_id, provider_id),
  constraint blog_article_blog_supported check (memo.is_supported_blog(blog_id)),
  constraint blog_article_url_allowed check (memo.blog_url_allowed(blog_id, url))
);

create index blog_article_page_idx on memo.blog_article (blog_id, published_at, provider_id);

-- 과거 slug와 canonical URL을 잇는다. 공개 메타만 담는다.
create table memo.blog_article_alias (
  blog_id     text not null,
  provider_id text not null,
  page_key    text not null,
  primary key (blog_id, provider_id, page_key),
  foreign key (blog_id, provider_id) references memo.blog_article (blog_id, provider_id) on delete cascade
);

create table memo.blog_sync_state (
  blog_id              text primary key,
  status               text not null default 'pending',
  generation           bigint not null default 0,
  checkpoint           jsonb,
  collected_count      integer not null default 0,
  reported_total       integer,
  initial_completed_at timestamptz,
  last_success_at      timestamptz,
  last_error           text,
  last_started_at      timestamptz,
  lease_token          uuid,
  lease_expires_at     timestamptz,
  lease_seconds        integer not null default 1200,
  constraint blog_sync_state_blog_supported check (memo.is_supported_blog(blog_id)),
  constraint blog_sync_state_status_valid check (status in ('pending', 'running', 'partial', 'complete')),
  constraint blog_sync_state_lease_seconds_valid check (lease_seconds between 60 and 3600)
);

create table memo.blog_sync_request (
  id           bigint generated always as identity primary key,
  blog_id      text not null,
  requested_by uuid references auth.users(id) on delete set null,
  requested_at timestamptz not null default now(),
  status       text not null default 'queued',
  handled_at   timestamptz,
  constraint blog_sync_request_blog_supported check (memo.is_supported_blog(blog_id)),
  constraint blog_sync_request_status_valid check (status in ('queued', 'running', 'done'))
);

-- 소스별로 대기 중인 요청은 하나만 둔다. 동시에 눌러도 여기서 합쳐진다.
create unique index blog_sync_request_one_queued_idx on memo.blog_sync_request (blog_id) where status = 'queued';

insert into memo.blog_sync_state (blog_id) values ('toss'), ('daangn')
on conflict (blog_id) do nothing;

-- ---------------------------------------------------------------------------
-- 2) RLS와 권한
-- ---------------------------------------------------------------------------

alter table memo.blog_subscription enable row level security;
alter table memo.blog_article enable row level security;
alter table memo.blog_article_alias enable row level security;
alter table memo.blog_sync_state enable row level security;
alter table memo.blog_sync_request enable row level security;

revoke all on memo.blog_subscription, memo.blog_article, memo.blog_article_alias,
  memo.blog_sync_state, memo.blog_sync_request from public, anon, authenticated;

create policy "blog_subscription_select_own" on memo.blog_subscription
  for select to authenticated using (auth.uid() = user_id);

create policy "blog_article_select_authenticated" on memo.blog_article
  for select to authenticated using (true);

create policy "blog_article_alias_select_authenticated" on memo.blog_article_alias
  for select to authenticated using (true);

-- blog_sync_state / blog_sync_request는 정책도 권한도 주지 않는다. cursor·lease·요청자가 든 테이블이라
-- 클라이언트는 아래 SECURITY DEFINER 함수가 골라 내보내는 열로만 본다.
grant select on memo.blog_subscription, memo.blog_article, memo.blog_article_alias to authenticated;
grant usage on schema memo to service_role;

-- ---------------------------------------------------------------------------
-- 3) 완료 판정과 상태 조회 (내부용)
-- ---------------------------------------------------------------------------

-- 본인의 유효 메모가 글에 붙을 수 있는 열쇠들. RLS를 그대로 받는다(SECURITY INVOKER).
create function memo.blog_valid_memo_keys()
returns table (memo_id bigint, match_key text, medium_id text)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    m.id,
    coalesce(nullif(m.page_key, ''), memo.blog_page_key(m.url)),
    memo.blog_medium_post_id(m.url)
  from memo.memo m
  where m.user_id = auth.uid()
    and m.deleted_at is null
    and (
      memo.has_blog_memo_text(m.memo)
      or memo.has_blog_memo_text(m.impression)
      or memo.has_blog_memo_text(m."actionItem")
    );
$$;

-- 지정한 소스에서 본인이 메모로 완료한 글. 글마다 유효 메모 중 가장 최신 id를 함께 준다.
create function memo.blog_completed_articles(p_blog_ids text[])
returns table (blog_id text, provider_id text, memo_id bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  with vm as materialized (
    select * from memo.blog_valid_memo_keys()
  ),
  matched as (
    select a.blog_id, a.provider_id, vm.memo_id
    from memo.blog_article a
    join vm on vm.match_key = a.page_key
    where a.blog_id = any (p_blog_ids) and a.available
    union all
    select al.blog_id, al.provider_id, vm.memo_id
    from memo.blog_article_alias al
    join memo.blog_article a on a.blog_id = al.blog_id and a.provider_id = al.provider_id
    join vm on vm.match_key = al.page_key
    where a.blog_id = any (p_blog_ids) and a.available
    union all
    select a.blog_id, a.provider_id, vm.memo_id
    from memo.blog_article a
    join vm on a.blog_id = 'daangn' and vm.medium_id = a.provider_id
    where a.blog_id = any (p_blog_ids) and a.available
  )
  select matched.blog_id, matched.provider_id, max(matched.memo_id)
  from matched
  group by matched.blog_id, matched.provider_id;
$$;

-- 다음 재개 요청 확인 시각(수집기는 15분마다 요청 큐를 본다). 예정 시각이며 GitHub 지연이 있을 수 있다.
create function memo.blog_next_check_at()
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select date_trunc('hour', now()) + (floor(extract(minute from now()) / 15) + 1) * interval '15 minutes';
$$;

-- 공개해도 되는 수집 상태만 골라 준다. checkpoint·lease·요청자는 나가지 않는다.
--   status: pending | running | partial | complete   (lease가 만료된 running은 partial로 본다)
--   phase : pending | collecting | partial | complete | refreshing | refresh_failed
--   total : initial_completed_at이 있을 때만 값이 있다. 부분 수집에는 확정 총량이 없다.
create function memo.blog_sync_public_status(p_blog_ids text[])
returns table (
  blog_id text,
  status text,
  phase text,
  collected_count integer,
  total integer,
  initial_completed_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  resume_queued boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with s as (
    select
      st.*,
      (st.status = 'running' and st.lease_expires_at > now()) as is_running,
      (st.status = 'running' and coalesce(st.lease_expires_at, now()) <= now()) as is_stalled
    from memo.blog_sync_state st
    where st.blog_id = any (p_blog_ids)
  )
  select
    s.blog_id,
    case when s.is_stalled then 'partial' else s.status end,
    case
      when s.is_running and s.initial_completed_at is null then 'collecting'
      when s.is_running then 'refreshing'
      when s.status = 'pending' then 'pending'
      when s.status = 'complete' then 'complete'
      when s.initial_completed_at is null then 'partial'
      else 'refresh_failed'
    end,
    (select count(*)::integer from memo.blog_article a where a.blog_id = s.blog_id and a.available),
    case when s.initial_completed_at is not null then s.reported_total end,
    s.initial_completed_at,
    s.last_success_at,
    case when s.is_stalled then coalesce(s.last_error, 'interrupted') else s.last_error end,
    exists (select 1 from memo.blog_sync_request r where r.blog_id = s.blog_id and r.status = 'queued')
  from s;
$$;

create function memo.blog_sources_json(p_blog_ids text[])
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'blogId', ps.blog_id,
    'status', ps.status,
    'phase', ps.phase,
    'collectedCount', ps.collected_count,
    'total', ps.total,
    'initialCompletedAt', ps.initial_completed_at,
    'lastSuccessAt', ps.last_success_at,
    'lastError', ps.last_error,
    'resumeQueued', ps.resume_queued
  ) order by ps.blog_id), '[]'::jsonb)
  from memo.blog_sync_public_status(p_blog_ids) ps;
$$;

-- ---------------------------------------------------------------------------
-- 4) 사용자 RPC
-- ---------------------------------------------------------------------------

-- 구독 저장/해제. 해제는 행을 지우지 않고 active=false만 한다(메모·카탈로그는 그대로).
-- 이미 같은 상태면 시각을 건드리지 않는다(멱등).
create function memo.set_blog_subscription(p_blog_id text, p_active boolean)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_row memo.blog_subscription;
begin
  if v_uid is null then
    raise exception 'unauthenticated' using errcode = 'PT401';
  end if;

  if p_blog_id is null or not memo.is_supported_blog(p_blog_id) then
    raise exception 'invalid_blog_id' using errcode = '22023';
  end if;

  if p_active is null then
    raise exception 'invalid_active' using errcode = '22023';
  end if;

  if p_active then
    insert into memo.blog_subscription as s (user_id, blog_id, active, subscribed_at, unsubscribed_at)
    values (v_uid, p_blog_id, true, now(), null)
    on conflict (user_id, blog_id) do update
      set active = true,
          subscribed_at = case when s.active then s.subscribed_at else now() end,
          unsubscribed_at = null
    returning * into v_row;
  else
    update memo.blog_subscription s
    set active = false,
        unsubscribed_at = case when s.active then now() else s.unsubscribed_at end
    where s.user_id = v_uid and s.blog_id = p_blog_id
    returning * into v_row;
  end if;

  return jsonb_build_object(
    'blogId', p_blog_id,
    'active', coalesce(v_row.active, false),
    'subscribedAt', v_row.subscribed_at,
    'unsubscribedAt', v_row.unsubscribed_at
  );
end;
$$;

-- 본인 활성 구독 범위의 글 목록(기본 30개). 과거순/최신순, published_at null은 항상 뒤로.
--   p_sort            'oldest'(기본) | 'newest'
--   p_cursor          이전 응답의 nextCursor 그대로 ({blogId, providerId, publishedAt})
--   p_catalog_version 이전 응답의 catalogVersion 그대로. 넘기면 그 시점 이후 새로 들어온 글은 목록에 섞지 않고
--                     newArticleCount로만 알린다. 생략하면 현재 카탈로그로 시작한다.
-- 반환: {items, nextCursor, catalogVersion, newArticleCount, sources}
create function memo.get_blog_reading_page(
  p_blog_id text default null,
  p_sort text default 'oldest',
  p_page_size integer default 30,
  p_cursor jsonb default null,
  p_catalog_version timestamptz default null
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_asc boolean;
  v_scope text[];
  v_version timestamptz;
  v_has_cursor boolean := p_cursor is not null;
  v_c_ts timestamptz;
  v_c_blog text;
  v_c_prov text;
  v_keys jsonb;
  v_items jsonb;
  v_next jsonb := null;
  v_new_count integer;
  v_last jsonb;
begin
  if v_uid is null then
    raise exception 'unauthenticated' using errcode = 'PT401';
  end if;

  if p_blog_id is not null and not memo.is_supported_blog(p_blog_id) then
    raise exception 'invalid_blog_id' using errcode = '22023';
  end if;

  if p_sort is null or p_sort not in ('oldest', 'newest') then
    raise exception 'invalid_sort' using errcode = '22023';
  end if;

  if p_page_size is null or p_page_size < 1 or p_page_size > 100 then
    raise exception 'invalid_page_size' using errcode = '22023';
  end if;

  v_asc := p_sort = 'oldest';

  if v_has_cursor then
    begin
      if jsonb_typeof(p_cursor) <> 'object'
        or jsonb_typeof(p_cursor -> 'blogId') <> 'string'
        or jsonb_typeof(p_cursor -> 'providerId') <> 'string'
        or coalesce(jsonb_typeof(p_cursor -> 'publishedAt'), 'null') not in ('string', 'null')
        or not memo.is_supported_blog(p_cursor ->> 'blogId') then
        raise exception 'invalid_cursor' using errcode = '22023';
      end if;

      v_c_blog := p_cursor ->> 'blogId';
      v_c_prov := p_cursor ->> 'providerId';
      v_c_ts := (p_cursor ->> 'publishedAt')::timestamptz;
    exception
      when invalid_datetime_format or datetime_field_overflow or invalid_text_representation then
        raise exception 'invalid_cursor' using errcode = '22023';
    end;
  end if;

  select coalesce(array_agg(s.blog_id order by s.blog_id), '{}')
  into v_scope
  from memo.blog_subscription s
  where s.user_id = v_uid
    and s.active
    and (p_blog_id is null or s.blog_id = p_blog_id);

  select coalesce(p_catalog_version, max(a.first_seen_at), 'epoch'::timestamptz)
  into v_version
  from memo.blog_article a
  where a.blog_id = any (v_scope);

  select count(*)::integer
  into v_new_count
  from memo.blog_article a
  where a.blog_id = any (v_scope) and a.available and a.first_seen_at > v_version;

  if v_asc then
    select jsonb_agg(jsonb_build_object('b', x.blog_id, 'p', x.provider_id))
    into v_keys
    from (
      select a.blog_id, a.provider_id
      from memo.blog_article a
      where a.blog_id = any (v_scope)
        and a.available
        and a.first_seen_at <= v_version
        and (
          not v_has_cursor
          or case
            when v_c_ts is not null then
              (a.published_at is null
                or (a.published_at, a.blog_id, a.provider_id) > (v_c_ts, v_c_blog, v_c_prov))
            else
              (a.published_at is null and (a.blog_id, a.provider_id) > (v_c_blog, v_c_prov))
          end
        )
      order by a.published_at asc nulls last, a.blog_id asc, a.provider_id asc
      limit p_page_size + 1
    ) x;
  else
    select jsonb_agg(jsonb_build_object('b', x.blog_id, 'p', x.provider_id))
    into v_keys
    from (
      select a.blog_id, a.provider_id
      from memo.blog_article a
      where a.blog_id = any (v_scope)
        and a.available
        and a.first_seen_at <= v_version
        and (
          not v_has_cursor
          or case
            when v_c_ts is not null then
              (a.published_at is null
                or (a.published_at, a.blog_id, a.provider_id) < (v_c_ts, v_c_blog, v_c_prov))
            else
              (a.published_at is null and (a.blog_id, a.provider_id) < (v_c_blog, v_c_prov))
          end
        )
      order by a.published_at desc nulls last, a.blog_id desc, a.provider_id desc
      limit p_page_size + 1
    ) x;
  end if;

  v_keys := coalesce(v_keys, '[]'::jsonb);

  -- 한 개 더 가져온 것은 다음 페이지가 있다는 신호일 뿐 목록에는 싣지 않는다.
  if jsonb_array_length(v_keys) > p_page_size then
    select jsonb_agg(k.value order by k.ord)
    into v_keys
    from jsonb_array_elements(v_keys) with ordinality k(value, ord)
    where k.ord <= p_page_size;

    v_last := v_keys -> (p_page_size - 1);
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
      'blogId', a.blog_id,
      'providerId', a.provider_id,
      'title', a.title,
      'url', a.url,
      'pageKey', a.page_key,
      'publishedAt', a.published_at,
      'completed', c.memo_id is not null,
      'memoId', c.memo_id
    ) order by k.ord), '[]'::jsonb)
  into v_items
  from jsonb_array_elements(v_keys) with ordinality k(value, ord)
  join memo.blog_article a on a.blog_id = k.value ->> 'b' and a.provider_id = k.value ->> 'p'
  left join memo.blog_completed_articles(v_scope) c on c.blog_id = a.blog_id and c.provider_id = a.provider_id;

  if v_last is not null then
    select jsonb_build_object('blogId', a.blog_id, 'providerId', a.provider_id, 'publishedAt', a.published_at)
    into v_next
    from memo.blog_article a
    where a.blog_id = v_last ->> 'b' and a.provider_id = v_last ->> 'p';
  end if;

  return jsonb_build_object(
    'items', v_items,
    'nextCursor', v_next,
    'catalogVersion', v_version,
    'newArticleCount', v_new_count,
    'sources', memo.blog_sources_json(v_scope)
  );
end;
$$;

-- 본인 활성 구독별 요약: 수집 글 수, 메모로 완료한 고유 글 수, 수집 상태.
-- total은 전체 수집이 한 번이라도 검증되어 끝난 소스에만 값이 있다.
create function memo.get_blog_reading_summary()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_scope text[];
begin
  if v_uid is null then
    raise exception 'unauthenticated' using errcode = 'PT401';
  end if;

  select coalesce(array_agg(s.blog_id order by s.blog_id), '{}')
  into v_scope
  from memo.blog_subscription s
  where s.user_id = v_uid and s.active;

  return jsonb_build_object(
    'sources', coalesce((
      with done as (
        select c.blog_id, count(*)::integer as completed_count
        from memo.blog_completed_articles(v_scope) c
        group by c.blog_id
      )
      select jsonb_agg(jsonb_build_object(
        'blogId', ps.blog_id,
        'subscribedAt', sub.subscribed_at,
        'status', ps.status,
        'phase', ps.phase,
        'collectedCount', ps.collected_count,
        'completedCount', coalesce(done.completed_count, 0),
        'total', ps.total,
        'initialCompletedAt', ps.initial_completed_at,
        'lastSuccessAt', ps.last_success_at,
        'lastError', ps.last_error,
        'resumeQueued', ps.resume_queued
      ) order by sub.subscribed_at, ps.blog_id)
      from memo.blog_sync_public_status(v_scope) ps
      join memo.blog_subscription sub on sub.user_id = v_uid and sub.blog_id = ps.blog_id
      left join done on done.blog_id = ps.blog_id
    ), '[]'::jsonb),
    'nextCheckAt', memo.blog_next_check_at()
  );
end;
$$;

-- 수집 재개 요청. 화면이 수집기를 직접 실행하지 않고 큐에 한 줄을 남긴다.
--   status 'running'   이미 실행 중(요청을 쌓지 않는다)
--   status 'queued'    접수됨. coalesced=true면 이미 대기 중인 요청과 합쳐진 것
--   status 'throttled' 같은 사용자가 이 소스에 15분 안에 이미 요청했다. nextRequestAt 이후 다시 요청할 수 있다
-- nextCheckAt은 수집기가 다음에 큐를 볼 예정 시각이다.
create function memo.request_blog_sync(p_blog_id text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_state memo.blog_sync_state;
  v_last timestamptz;
  v_queued_at timestamptz;
begin
  if v_uid is null then
    raise exception 'unauthenticated' using errcode = 'PT401';
  end if;

  if p_blog_id is null or not memo.is_supported_blog(p_blog_id) then
    raise exception 'invalid_blog_id' using errcode = '22023';
  end if;

  if not exists (
    select 1 from memo.blog_subscription s
    where s.user_id = v_uid and s.blog_id = p_blog_id and s.active
  ) then
    raise exception 'subscription_required' using errcode = '42501';
  end if;

  select * into v_state from memo.blog_sync_state where blog_id = p_blog_id for update;

  if v_state.status = 'running' and v_state.lease_expires_at > now() then
    return jsonb_build_object(
      'blogId', p_blog_id, 'status', 'running', 'coalesced', true,
      'requestedAt', null, 'nextCheckAt', memo.blog_next_check_at()
    );
  end if;

  select r.requested_at into v_queued_at
  from memo.blog_sync_request r
  where r.blog_id = p_blog_id and r.status = 'queued';

  if v_queued_at is not null then
    return jsonb_build_object(
      'blogId', p_blog_id, 'status', 'queued', 'coalesced', true,
      'requestedAt', v_queued_at, 'nextCheckAt', memo.blog_next_check_at()
    );
  end if;

  select max(r.requested_at) into v_last
  from memo.blog_sync_request r
  where r.blog_id = p_blog_id and r.requested_by = v_uid;

  if v_last is not null and v_last > now() - interval '15 minutes' then
    return jsonb_build_object(
      'blogId', p_blog_id, 'status', 'throttled', 'coalesced', false,
      'requestedAt', v_last, 'nextRequestAt', v_last + interval '15 minutes',
      'nextCheckAt', memo.blog_next_check_at()
    );
  end if;

  insert into memo.blog_sync_request (blog_id, requested_by)
  values (p_blog_id, v_uid)
  returning requested_at into v_queued_at;

  return jsonb_build_object(
    'blogId', p_blog_id, 'status', 'queued', 'coalesced', false,
    'requestedAt', v_queued_at, 'nextCheckAt', memo.blog_next_check_at()
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 5) 수집 RPC (service_role 전용)
-- ---------------------------------------------------------------------------

-- lease를 확인하고 잠근 뒤 만료 시각을 연장한다. 세대·토큰이 다르거나 만료됐으면 stale이다.
create function memo.blog_assert_lease(p_blog_id text, p_generation bigint, p_lease_token uuid)
returns memo.blog_sync_state
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_state memo.blog_sync_state;
begin
  if p_blog_id is null or not memo.is_supported_blog(p_blog_id) then
    raise exception 'invalid_blog_id' using errcode = '22023';
  end if;

  select * into v_state from memo.blog_sync_state where blog_id = p_blog_id for update;

  if v_state.blog_id is null
    or v_state.status <> 'running'
    or v_state.generation is distinct from p_generation
    or v_state.lease_token is distinct from p_lease_token
    or v_state.lease_expires_at <= now() then
    raise exception 'stale_lease' using errcode = 'PT409';
  end if;

  update memo.blog_sync_state
  set lease_expires_at = now() + make_interval(secs => lease_seconds)
  where blog_id = p_blog_id
  returning * into v_state;

  return v_state;
end;
$$;

-- 수집 작업 하나를 시작(또는 이어서 시작)한다.
--   p_trigger 'daily'   정기 전체 순회. 최근 20시간 안에 성공했으면 건너뛴다(p_force로 무시)
--             'request' 15분 확인. 대기 중인 재개 요청이 있거나 시간 제한으로 멈춘 작업이 있을 때만
--             'manual'  수동 실행. 조건 없이 시작
-- 미완료(partial/lease 만료된 running) 순회는 같은 세대·checkpoint로 이어가고, 아니면(count_mismatch로 멈춘 경우 포함) 새 세대를 연다.
create function memo.claim_blog_sync(
  p_blog_id text,
  p_trigger text,
  p_force boolean default false,
  p_lease_seconds integer default 1200
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_state memo.blog_sync_state;
  v_resume boolean;
  v_has_queued boolean;
  v_generation bigint;
  v_checkpoint jsonb;
  v_token uuid := gen_random_uuid();
  v_expires timestamptz;
begin
  if p_blog_id is null or not memo.is_supported_blog(p_blog_id) then
    raise exception 'invalid_blog_id' using errcode = '22023';
  end if;

  if p_trigger is null or p_trigger not in ('daily', 'request', 'manual') then
    raise exception 'invalid_trigger' using errcode = '22023';
  end if;

  if p_lease_seconds is null or p_lease_seconds < 60 or p_lease_seconds > 3600 then
    raise exception 'invalid_lease_seconds' using errcode = '22023';
  end if;

  insert into memo.blog_sync_state (blog_id) values (p_blog_id) on conflict (blog_id) do nothing;

  select * into v_state from memo.blog_sync_state where blog_id = p_blog_id for update;

  if v_state.status = 'running' and v_state.lease_expires_at > now() then
    return jsonb_build_object('claimed', false, 'reason', 'lease_active');
  end if;

  v_has_queued := exists (
    select 1 from memo.blog_sync_request r where r.blog_id = p_blog_id and r.status = 'queued'
  );

  if p_trigger = 'request'
    and not v_has_queued
    and not (v_state.status = 'partial' and v_state.last_error = 'time_limit') then
    return jsonb_build_object('claimed', false, 'reason', 'no_request');
  end if;

  if p_trigger = 'daily'
    and not coalesce(p_force, false)
    and v_state.status = 'complete'
    and v_state.last_success_at > now() - interval '20 hours' then
    return jsonb_build_object('claimed', false, 'reason', 'recent_success');
  end if;

  -- 개수 불일치로 멈춘 순회는 같은 세대에 이미 쌓인 글이 어긋난 원인일 수 있으므로 이어가지 않고 새 세대로 시작한다.
  v_resume := v_state.status in ('partial', 'running') and coalesce(v_state.last_error, '') <> 'count_mismatch';

  if v_resume then
    v_generation := v_state.generation;
    v_checkpoint := v_state.checkpoint;
  else
    v_generation := v_state.generation + 1;
    v_checkpoint := null;
  end if;

  v_expires := now() + make_interval(secs => p_lease_seconds);

  update memo.blog_sync_state
  set status = 'running',
      generation = v_generation,
      checkpoint = v_checkpoint,
      lease_token = v_token,
      lease_expires_at = v_expires,
      lease_seconds = p_lease_seconds,
      last_started_at = now(),
      last_error = null
  where blog_id = p_blog_id;

  update memo.blog_sync_request set status = 'done', handled_at = now()
  where blog_id = p_blog_id and status = 'running';

  update memo.blog_sync_request set status = 'running', handled_at = now()
  where blog_id = p_blog_id and status = 'queued';

  return jsonb_build_object(
    'claimed', true,
    'blogId', p_blog_id,
    'generation', v_generation,
    'leaseToken', v_token,
    'leaseExpiresAt', v_expires,
    'resume', v_resume,
    'checkpoint', v_checkpoint
  );
end;
$$;

-- 메타데이터 배치 저장(최대 100개). 한 트랜잭션이라 하나라도 잘못되면 전부 되돌아간다.
-- item: {providerId, title, url, publishedAt|null, updatedAt|null, aliasUrls?: text[]}
-- 본문 같은 다른 키는 무시한다(저장하지 않는다).
create function memo.ingest_blog_batch(
  p_blog_id text,
  p_generation bigint,
  p_lease_token uuid,
  p_items jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_norm jsonb;
  v_accepted integer;
  v_stored integer;
  v_collected integer;
begin
  perform memo.blog_assert_lease(p_blog_id, p_generation, p_lease_token);

  if p_items is null or jsonb_typeof(p_items) <> 'array'
    or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 100 then
    raise exception 'invalid_batch' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) e(value)
    where jsonb_typeof(e.value) <> 'object'
      or jsonb_typeof(e.value -> 'providerId') is distinct from 'string'
      or jsonb_typeof(e.value -> 'title') is distinct from 'string'
      or jsonb_typeof(e.value -> 'url') is distinct from 'string'
      or coalesce(jsonb_typeof(e.value -> 'publishedAt'), 'null') not in ('string', 'null')
      or coalesce(jsonb_typeof(e.value -> 'updatedAt'), 'null') not in ('string', 'null')
      or coalesce(jsonb_typeof(e.value -> 'aliasUrls'), 'array') <> 'array'
      or (e.value ->> 'providerId') !~ '^[A-Za-z0-9_-]{1,64}$'
      or length(btrim(e.value ->> 'title')) not between 1 and 500
      or length(e.value ->> 'url') > 2000
      or not memo.blog_url_allowed(p_blog_id, e.value ->> 'url')
      or memo.blog_page_key(e.value ->> 'url') is null
  ) then
    raise exception 'invalid_item' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) e(value)
    cross join lateral jsonb_array_elements(coalesce(e.value -> 'aliasUrls', '[]'::jsonb)) a(value)
    where jsonb_typeof(a.value) <> 'string'
      or length(a.value #>> '{}') > 2000
      or not memo.blog_url_allowed(p_blog_id, a.value #>> '{}', true)
      or memo.blog_page_key(a.value #>> '{}') is null
  ) or exists (
    select 1 from jsonb_array_elements(p_items) e(value)
    where jsonb_array_length(coalesce(e.value -> 'aliasUrls', '[]'::jsonb)) > 5
  ) then
    raise exception 'invalid_alias' using errcode = '22023';
  end if;

  -- 같은 배치에 같은 글이 두 번 있으면 뒤의 것을 쓴다.
  select jsonb_agg(jsonb_build_object(
    'provider_id', n.provider_id,
    'title', n.title,
    'url', n.url,
    'page_key', n.page_key,
    'published_at', n.published_at,
    'updated_at', n.updated_at,
    'alias_urls', n.alias_urls
  ))
  into v_norm
  from (
    select distinct on (e.value ->> 'providerId')
      e.value ->> 'providerId' as provider_id,
      btrim(e.value ->> 'title') as title,
      e.value ->> 'url' as url,
      memo.blog_page_key(e.value ->> 'url') as page_key,
      (e.value ->> 'publishedAt')::timestamptz as published_at,
      (e.value ->> 'updatedAt')::timestamptz as updated_at,
      coalesce(e.value -> 'aliasUrls', '[]'::jsonb) as alias_urls
    from jsonb_array_elements(p_items) with ordinality e(value, ord)
    order by e.value ->> 'providerId', e.ord desc
  ) n;

  v_accepted := jsonb_array_length(v_norm);

  -- URL이 바뀐 글은 이전 키를 별칭으로 남겨 예전 메모가 계속 붙게 한다.
  insert into memo.blog_article_alias (blog_id, provider_id, page_key)
  select a.blog_id, a.provider_id, a.page_key
  from memo.blog_article a
  join jsonb_to_recordset(v_norm) as b(provider_id text, page_key text) on b.provider_id = a.provider_id
  where a.blog_id = p_blog_id and a.page_key <> b.page_key
  on conflict do nothing;

  insert into memo.blog_article as a (
    blog_id, provider_id, title, url, page_key, published_at, updated_at, available, last_seen_generation
  )
  select p_blog_id, b.provider_id, b.title, b.url, b.page_key, b.published_at, b.updated_at, true, p_generation
  from jsonb_to_recordset(v_norm) as b(
    provider_id text, title text, url text, page_key text, published_at timestamptz, updated_at timestamptz
  )
  on conflict (blog_id, provider_id) do update
    set title = excluded.title,
        url = excluded.url,
        page_key = excluded.page_key,
        published_at = excluded.published_at,
        updated_at = excluded.updated_at,
        available = true,
        last_seen_generation = greatest(a.last_seen_generation, excluded.last_seen_generation);

  insert into memo.blog_article_alias (blog_id, provider_id, page_key)
  select distinct p_blog_id, b.provider_id, memo.blog_page_key(u.value #>> '{}')
  from jsonb_to_recordset(v_norm) as b(provider_id text, page_key text, alias_urls jsonb)
  cross join lateral jsonb_array_elements(b.alias_urls) u(value)
  where memo.blog_page_key(u.value #>> '{}') <> b.page_key
  on conflict do nothing;

  select count(*)::integer into v_stored
  from memo.blog_article where blog_id = p_blog_id and last_seen_generation = p_generation;

  select count(*)::integer into v_collected
  from memo.blog_article where blog_id = p_blog_id and available;

  update memo.blog_sync_state set collected_count = v_collected where blog_id = p_blog_id;

  return jsonb_build_object('accepted', v_accepted, 'storedCount', v_stored, 'collectedCount', v_collected);
end;
$$;

-- 재개 지점 저장(내부 전용, 8KB 이하 객체). 공개 조회에는 나가지 않는다.
create function memo.save_blog_checkpoint(
  p_blog_id text,
  p_generation bigint,
  p_lease_token uuid,
  p_checkpoint jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_state memo.blog_sync_state;
begin
  v_state := memo.blog_assert_lease(p_blog_id, p_generation, p_lease_token);

  if p_checkpoint is null or jsonb_typeof(p_checkpoint) <> 'object' or octet_length(p_checkpoint::text) > 8192 then
    raise exception 'invalid_checkpoint' using errcode = '22023';
  end if;

  update memo.blog_sync_state set checkpoint = p_checkpoint where blog_id = p_blog_id;

  return jsonb_build_object('ok', true, 'leaseExpiresAt', v_state.lease_expires_at);
end;
$$;

-- 전체 순회 완료. 소스별 종료 증거와 이번 세대에 저장된 고유 글 수가 모두 맞아야 성공한다.
--   toss   {kind:'toss', nextIsNull:true, reportedCount, uniqueCount, pageCount}
--          reportedCount == uniqueCount == 저장된 수
--   daangn {kind:'daangn', hasNextPage:false, endCursor:''|null, uniqueCount}
--          uniqueCount == 저장된 수 (totalCount가 없어 마지막 cursor까지 합산한 수를 믿는다)
-- 성공하면 이번 세대에 보이지 않은 글만 available=false로 바꾼다(지우지 않는다).
create function memo.finish_blog_sync(
  p_blog_id text,
  p_generation bigint,
  p_lease_token uuid,
  p_evidence jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_stored integer;
  v_unavailable integer;
  v_available integer;
begin
  perform memo.blog_assert_lease(p_blog_id, p_generation, p_lease_token);

  if p_evidence is null or jsonb_typeof(p_evidence) <> 'object' then
    raise exception 'invalid_finish_evidence' using errcode = '22023';
  end if;

  select count(*)::integer into v_stored
  from memo.blog_article where blog_id = p_blog_id and last_seen_generation = p_generation;

  if v_stored < 1 then
    raise exception 'empty_catalog' using errcode = '22023';
  end if;

  if p_blog_id = 'toss' then
    if p_evidence ->> 'kind' is distinct from 'toss'
      or p_evidence -> 'nextIsNull' is distinct from 'true'::jsonb
      or jsonb_typeof(p_evidence -> 'reportedCount') is distinct from 'number'
      or jsonb_typeof(p_evidence -> 'uniqueCount') is distinct from 'number'
      or jsonb_typeof(p_evidence -> 'pageCount') is distinct from 'number' then
      raise exception 'invalid_finish_evidence' using errcode = '22023';
    end if;

    if (p_evidence ->> 'reportedCount')::integer <> v_stored
      or (p_evidence ->> 'uniqueCount')::integer <> v_stored then
      raise exception 'count_mismatch' using errcode = '22023';
    end if;
  elsif p_blog_id = 'daangn' then
    if p_evidence ->> 'kind' is distinct from 'daangn'
      or p_evidence -> 'hasNextPage' is distinct from 'false'::jsonb
      or coalesce(p_evidence ->> 'endCursor', '') <> ''
      or jsonb_typeof(p_evidence -> 'uniqueCount') is distinct from 'number' then
      raise exception 'invalid_finish_evidence' using errcode = '22023';
    end if;

    if (p_evidence ->> 'uniqueCount')::integer <> v_stored then
      raise exception 'count_mismatch' using errcode = '22023';
    end if;
  else
    raise exception 'invalid_blog_id' using errcode = '22023';
  end if;

  update memo.blog_article set available = false
  where blog_id = p_blog_id and available and last_seen_generation < p_generation;

  get diagnostics v_unavailable = row_count;

  select count(*)::integer into v_available
  from memo.blog_article where blog_id = p_blog_id and available;

  update memo.blog_sync_state
  set status = 'complete',
      checkpoint = null,
      collected_count = v_available,
      reported_total = v_stored,
      initial_completed_at = coalesce(initial_completed_at, now()),
      last_success_at = now(),
      last_error = null,
      lease_token = null,
      lease_expires_at = null
  where blog_id = p_blog_id;

  update memo.blog_sync_request set status = 'done', handled_at = now()
  where blog_id = p_blog_id and status = 'running';

  return jsonb_build_object('status', 'complete', 'total', v_stored, 'unavailableMarked', v_unavailable);
end;
$$;

-- 순회 실패/중단 기록. 기존 글은 그대로 두고 status만 partial로 바꾼다. 절대 complete로 표시하지 않는다.
--   p_error_code: time_limit | blocked | http_error | rate_limited | schema_changed | count_mismatch | network | internal
--   p_checkpoint: 넘기면 교체. p_keep_checkpoint=false면 비운다(첫 페이지부터 다시 돌게 한다)
create function memo.fail_blog_sync(
  p_blog_id text,
  p_generation bigint,
  p_lease_token uuid,
  p_error_code text,
  p_checkpoint jsonb default null,
  p_keep_checkpoint boolean default true
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform memo.blog_assert_lease(p_blog_id, p_generation, p_lease_token);

  if p_error_code is null or p_error_code not in (
    'time_limit', 'blocked', 'http_error', 'rate_limited', 'schema_changed', 'count_mismatch', 'network', 'internal'
  ) then
    raise exception 'invalid_error_code' using errcode = '22023';
  end if;

  if p_checkpoint is not null
    and (jsonb_typeof(p_checkpoint) <> 'object' or octet_length(p_checkpoint::text) > 8192) then
    raise exception 'invalid_checkpoint' using errcode = '22023';
  end if;

  update memo.blog_sync_state
  set status = 'partial',
      last_error = p_error_code,
      lease_token = null,
      lease_expires_at = null,
      checkpoint = case
        when not coalesce(p_keep_checkpoint, true) then null
        when p_checkpoint is not null then p_checkpoint
        else checkpoint
      end
  where blog_id = p_blog_id;

  update memo.blog_sync_request set status = 'done', handled_at = now()
  where blog_id = p_blog_id and status = 'running';

  return jsonb_build_object('status', 'partial', 'lastError', p_error_code);
end;
$$;

-- ---------------------------------------------------------------------------
-- 6) 함수 실행 권한
-- ---------------------------------------------------------------------------

-- 함수는 기본으로 PUBLIC에 실행 권한이 붙으므로 모두 거두고 필요한 역할에만 다시 준다.
revoke all on function
  memo.is_supported_blog(text),
  memo.blog_url_allowed(text, text, boolean),
  memo.blog_page_key(text),
  memo.blog_medium_post_id(text),
  memo.has_blog_memo_text(text),
  memo.blog_valid_memo_keys(),
  memo.blog_completed_articles(text[]),
  memo.blog_next_check_at(),
  memo.blog_sync_public_status(text[]),
  memo.blog_sources_json(text[]),
  memo.set_blog_subscription(text, boolean),
  memo.get_blog_reading_page(text, text, integer, jsonb, timestamptz),
  memo.get_blog_reading_summary(),
  memo.request_blog_sync(text),
  memo.blog_assert_lease(text, bigint, uuid),
  memo.claim_blog_sync(text, text, boolean, integer),
  memo.ingest_blog_batch(text, bigint, uuid, jsonb),
  memo.save_blog_checkpoint(text, bigint, uuid, jsonb),
  memo.finish_blog_sync(text, bigint, uuid, jsonb),
  memo.fail_blog_sync(text, bigint, uuid, text, jsonb, boolean)
from public, anon, authenticated;

-- 사용자 RPC와 그 안에서 불리는 보조 함수(SECURITY INVOKER 본문이 호출자 권한으로 실행하므로 authenticated가 필요하다)
grant execute on function
  memo.is_supported_blog(text),
  memo.blog_url_allowed(text, text, boolean),
  memo.blog_page_key(text),
  memo.blog_medium_post_id(text),
  memo.has_blog_memo_text(text),
  memo.blog_valid_memo_keys(),
  memo.blog_completed_articles(text[]),
  memo.blog_next_check_at(),
  memo.blog_sync_public_status(text[]),
  memo.blog_sources_json(text[]),
  memo.set_blog_subscription(text, boolean),
  memo.get_blog_reading_page(text, text, integer, jsonb, timestamptz),
  memo.get_blog_reading_summary(),
  memo.request_blog_sync(text)
to authenticated;

-- 수집 RPC는 service_role만 부른다. blog_assert_lease는 내부 전용이라 아무에게도 열지 않는다(definer 본문이 부른다).
grant execute on function
  memo.claim_blog_sync(text, text, boolean, integer),
  memo.ingest_blog_batch(text, bigint, uuid, jsonb),
  memo.save_blog_checkpoint(text, bigint, uuid, jsonb),
  memo.finish_blog_sync(text, bigint, uuid, jsonb),
  memo.fail_blog_sync(text, bigint, uuid, text, jsonb, boolean),
  memo.is_supported_blog(text),
  memo.blog_url_allowed(text, text, boolean),
  memo.blog_page_key(text)
to service_role;

comment on function memo.get_blog_reading_page(text, text, integer, jsonb, timestamptz) is
  'Own active-subscription blog checklist page. Returns {items,nextCursor,catalogVersion,newArticleCount,sources}. Completion is computed from own live memos.';
comment on function memo.get_blog_reading_summary() is
  'Per-subscription collected/completed counts and public sync status. total is null until a verified full traversal finished.';
comment on function memo.finish_blog_sync(text, bigint, uuid, jsonb) is
  'Service role only. Requires source-specific end evidence and matching stored unique count before marking complete.';
