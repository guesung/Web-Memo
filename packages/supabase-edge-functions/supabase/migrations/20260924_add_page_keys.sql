-- An empty page_key means an older client wrote the original URL without a key.
-- New clients compute page_key with the shared WHATWG URL implementation.
-- Readers include empty-key rows and compare their raw URL in JavaScript, so
-- existing rows remain visible before the optional batch backfill finishes.
alter table memo.memo add column page_key text not null default '';
alter table memo.highlight add column page_key text not null default '';

create index memo_user_page_key_idx on memo.memo (user_id, page_key, id);
create index highlight_user_page_key_idx on memo.highlight (user_id, page_key, id);
create index memo_empty_page_key_idx on memo.memo (id) where page_key = '';
create index highlight_empty_page_key_idx on memo.highlight (id) where page_key = '';

-- If an old client changes a URL without providing a new key, discard the
-- previous key. A client that supplies the new key keeps it.
create function memo.invalidate_page_key_after_url_change()
returns trigger
language plpgsql
as $$
begin
  if new.url is distinct from old.url
    and new.page_key is not distinct from old.page_key then
    new.page_key := '';
  end if;
  return new;
end;
$$;

create trigger memo_invalidate_page_key
before update of url on memo.memo
for each row execute function memo.invalidate_page_key_after_url_change();

create trigger highlight_invalidate_page_key
before update of url on memo.highlight
for each row execute function memo.invalidate_page_key_after_url_change();

-- Keep get_highlight_counts(target_urls) unchanged for older clients.
-- This keyed aggregate is available after backfill. During migration, clients
-- count keyed and empty-key rows in one keyset query to avoid a race.
create function memo.get_highlight_counts_by_page_keys(target_page_keys text[])
returns table (page_key text, count int)
language sql
stable
security invoker
as $$
  select h.page_key, count(*)::int
  from memo.highlight h
  where h.page_key = any(target_page_keys)
    and h.page_key <> ''
  group by h.page_key;
$$;

grant execute on function memo.get_highlight_counts_by_page_keys(text[]) to authenticated;

comment on function memo.get_highlight_counts_by_page_keys(text[]) is
  'Counts keyed highlights under caller RLS after legacy page keys are backfilled.';
