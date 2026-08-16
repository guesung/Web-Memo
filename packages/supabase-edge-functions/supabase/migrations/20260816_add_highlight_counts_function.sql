-- URL별 하이라이트 개수를 세어 반환한다.
-- security invoker(기본값)이므로 memo.highlight의 RLS 정책(auth.uid() = user_id)이
-- 그대로 적용되어 호출자 본인의 하이라이트만 집계된다.
create function memo.get_highlight_counts(target_urls text[])
returns table (url text, count int)
language sql
stable
as $$
  select h.url, count(*)::int
  from memo.highlight h
  where h.url = any(target_urls)
  group by h.url;
$$;

grant execute on function memo.get_highlight_counts(text[]) to authenticated;

comment on function memo.get_highlight_counts(text[]) is
  'Returns highlight counts per URL for the calling user. RLS on memo.highlight restricts rows to the caller.';
