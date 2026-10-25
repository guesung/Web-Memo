-- 긱뉴스(geeknews) 피드 소스 추가. 아카이브(토스·당근)와 달리 Atom 피드의 최근 글을 3시간마다 모으는 누적형 소스다.
--
--   - 지원 소스·URL 허용에 geeknews를 더한다. 글 URL은 https://news.hada.io/topic?id=<숫자> 만 허용(별칭 없음).
--   - memo.is_feed_blog: 피드 소스 목록. packages/shared의 isFeedBlog()와 같은 집합이다.
--   - blog_sync_state에 geeknews 행을 더한다.
--   - claim_blog_sync: trigger 'feed' 추가. 마지막 성공이 2시간 30분 안이면 건너뛴다.
--   - finish_blog_sync: 피드 분기. 이번에 안 보인 글을 available=false로 바꾸지 않고(누적),
--     reported_total·initial_completed_at을 기록하지 않는다(blog_sync_public_status의 total은 계속 null).
--   - 기존 함수는 create or replace라 시그니처와 실행 권한(grant)이 그대로 유지된다. 새 함수 하나만 권한을 건다.
--   - 되돌리려면 이 파일의 함수 정의를 20260930_add_blog_reading.sql 본문으로 되돌리고 geeknews 행·글을 지운다.

create or replace function memo.is_supported_blog(p_blog_id text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_blog_id in ('toss', 'daangn', 'geeknews');
$$;

-- 전체 순회가 아니라 최근 글을 누적하는 피드 소스.
create or replace function memo.is_feed_blog(p_blog_id text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_blog_id in ('geeknews');
$$;

create or replace function memo.blog_url_allowed(p_blog_id text, p_url text, p_is_alias boolean default false)
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
    -- 긱뉴스는 topic?id=<숫자> 형태의 원문 페이지만. 별칭은 허용하지 않는다.
    when 'geeknews' then
      not coalesce(p_is_alias, false) and p_url ~ '^https://news\.hada\.io/topic\?id=[0-9]{1,18}$'
    else false
  end;
$$;

insert into memo.blog_sync_state (blog_id) values ('geeknews')
on conflict (blog_id) do nothing;

-- 수집 작업 하나를 시작(또는 이어서 시작)한다. 20260930 정의에 trigger 'feed'를 더했다.
--   p_trigger 'feed'    피드 소스 3시간 주기. 최근 2시간 30분 안에 성공했으면 건너뛴다(p_force로 무시)
create or replace function memo.claim_blog_sync(
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

  if p_trigger is null or p_trigger not in ('daily', 'request', 'manual', 'feed') then
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

  -- 피드 소스(긱뉴스)의 3시간 주기 실행. 최근 2시간 30분 안에 성공했으면 건너뛴다(p_force로 무시).
  if p_trigger = 'feed'
    and not coalesce(p_force, false)
    and v_state.status = 'complete'
    and v_state.last_success_at > now() - interval '2 hours 30 minutes' then
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

-- 전체 순회 완료 또는 피드 수집 완료. 20260930 정의에 피드 분기를 더했다.
--   geeknews {kind:'geeknews', entryCount, uniqueCount}  uniqueCount >= 1, entryCount >= uniqueCount, 이번 세대 저장 수 >= uniqueCount
create or replace function memo.finish_blog_sync(
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
  elsif memo.is_feed_blog(p_blog_id) then
    -- 피드는 최근 N개만 보여 주는 창이라 전체 순회가 아니다. 증거는 이번 실행이 읽은 엔트리 수와 고유 글 수다.
    -- 이번 세대에 저장된 글이 이번 실행의 고유 글 수보다 적으면 일부가 저장되지 않은 것이다.
    -- (이전 시도가 같은 세대에 남긴 글이 있으면 더 많을 수 있어 같음이 아니라 이상을 본다)
    if p_evidence ->> 'kind' is distinct from p_blog_id
      or jsonb_typeof(p_evidence -> 'entryCount') is distinct from 'number'
      or jsonb_typeof(p_evidence -> 'uniqueCount') is distinct from 'number' then
      raise exception 'invalid_finish_evidence' using errcode = '22023';
    end if;

    if (p_evidence ->> 'uniqueCount')::integer < 1
      or (p_evidence ->> 'entryCount')::integer < (p_evidence ->> 'uniqueCount')::integer then
      raise exception 'invalid_finish_evidence' using errcode = '22023';
    end if;

    if v_stored < (p_evidence ->> 'uniqueCount')::integer then
      raise exception 'count_mismatch' using errcode = '22023';
    end if;

    select count(*)::integer into v_available
    from memo.blog_article where blog_id = p_blog_id and available;

    -- 누적형: 이번에 안 보인 글을 숨기지 않고, 확정 total과 initial_completed_at도 기록하지 않는다.
    update memo.blog_sync_state
    set status = 'complete',
        checkpoint = null,
        collected_count = v_available,
        last_success_at = now(),
        last_error = null,
        lease_token = null,
        lease_expires_at = null
    where blog_id = p_blog_id;

    update memo.blog_sync_request set status = 'done', handled_at = now()
    where blog_id = p_blog_id and status = 'running';

    return jsonb_build_object('status', 'complete', 'total', null, 'unavailableMarked', 0);
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

revoke all on function memo.is_feed_blog(text) from public, anon, authenticated;
grant execute on function memo.is_feed_blog(text) to service_role;
