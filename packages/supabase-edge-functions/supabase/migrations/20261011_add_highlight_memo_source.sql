create table memo.highlight_memo_source (
  memo_id bigint primary key references memo.memo(id) on delete cascade,
  highlight_id bigint unique references memo.highlight(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  exact_text text not null,
  url text not null,
  prefix_text text,
  suffix_text text,
  text_position_start integer,
  color text not null
);

alter table memo.highlight_memo_source enable row level security;

revoke all on memo.highlight_memo_source from public, anon, authenticated;

create policy "highlight_memo_source_select_own" on memo.highlight_memo_source
  for select to authenticated using (auth.uid() = user_id);

grant select on memo.highlight_memo_source to authenticated;

create function memo.create_memo_from_highlight(p_highlight_id bigint, p_memo text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_highlight memo.highlight%rowtype;
  v_memo_id bigint;
  v_deleted_at timestamptz;
begin
  if v_user_id is null then
    raise sqlstate 'PT401' using message = 'Authentication required';
  end if;

  if p_highlight_id is null or nullif(btrim(p_memo), '') is null then
    raise sqlstate '22023' using message = 'Highlight and memo text are required';
  end if;

  select * into v_highlight
  from memo.highlight
  where id = p_highlight_id and user_id = v_user_id
  for update;

  if not found then
    raise sqlstate 'P0002' using message = 'Highlight not found';
  end if;

  select source.memo_id, existing.deleted_at
    into v_memo_id, v_deleted_at
  from memo.highlight_memo_source source
  join memo.memo existing on existing.id = source.memo_id
  where source.highlight_id = p_highlight_id and source.user_id = v_user_id;

  if found then
    return jsonb_build_object(
      'memo_id', v_memo_id,
      'highlight_id', p_highlight_id,
      'created', false,
      'deleted_at', v_deleted_at
    );
  end if;

  insert into memo.memo (user_id, memo, title, url, "favIconUrl", page_key)
  values (
    v_user_id,
    p_memo,
    coalesce(nullif(v_highlight.title, ''), v_highlight.url),
    v_highlight.url,
    v_highlight."favIconUrl",
    v_highlight.page_key
  )
  returning id into v_memo_id;

  insert into memo.highlight_memo_source (
    memo_id, highlight_id, user_id, exact_text, url, prefix_text,
    suffix_text, text_position_start, color
  ) values (
    v_memo_id, p_highlight_id, v_user_id, v_highlight.exact_text,
    v_highlight.url, v_highlight.prefix_text, v_highlight.suffix_text,
    v_highlight.text_position_start, v_highlight.color
  );

  return jsonb_build_object(
    'memo_id', v_memo_id,
    'highlight_id', p_highlight_id,
    'created', true,
    'deleted_at', null
  );
end;
$$;

revoke all on function memo.create_memo_from_highlight(bigint, text) from public, anon, authenticated;
grant execute on function memo.create_memo_from_highlight(bigint, text) to authenticated;
