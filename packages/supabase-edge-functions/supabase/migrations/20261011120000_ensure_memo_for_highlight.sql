-- A saved highlight needs an active memo card for its page, even before notes are written.
-- Keep this at the database boundary so extension and app clients behave alike.
-- Older rows have no page_key. This handles client-serialized HTTP(S) URLs with
-- lowercase ASCII authorities. Credentials, IPv6, and escaped YouTube query
-- values return null; those rows can still match an identical raw URL.
create or replace function memo.legacy_page_key_from_normalized_url(p_url text)
returns text
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  v_url text := pg_catalog.split_part(p_url, '#', 1);
  v_base text;
  v_query text;
  v_parts text[];
  v_param text;
  v_meaningful text[] := '{}';
  v_video_id text := 'null';
begin
  v_base := pg_catalog.split_part(v_url, '?', 1);
  v_parts := pg_catalog.regexp_match(
    v_base,
    '^(https?://[a-z0-9.-]+(:[0-9]+)?)(/.*)?$'
  );
  if v_parts is null then
    return null;
  end if;
  v_base := v_parts[1] || coalesce(v_parts[3], '/');
  v_query := case
    when pg_catalog.strpos(v_url, '?') > 0
      then pg_catalog.substr(v_url, pg_catalog.strpos(v_url, '?') + 1)
    else ''
  end;

  if v_parts[1] ~ '^https?://([a-z0-9-]+[.])*youtube[.]com(:[0-9]+)?$' then
    -- URLSearchParams decodes escapes and plus signs; do not guess at those forms.
    if pg_catalog.strpos(v_query, '%') > 0 or pg_catalog.strpos(v_query, '+') > 0 then
      return null;
    end if;
    foreach v_param in array pg_catalog.string_to_array(v_query, '&') loop
      if pg_catalog.split_part(v_param, '=', 1) = 'v' then
        v_video_id := case
          when pg_catalog.strpos(v_param, '=') > 0
            then pg_catalog.substr(v_param, pg_catalog.strpos(v_param, '=') + 1)
          else ''
        end;
        exit;
      end if;
    end loop;
    return v_base || '?v=' || v_video_id;
  end if;

  foreach v_param in array pg_catalog.string_to_array(v_query, '&') loop
    if pg_catalog.split_part(v_param, '=', 1) ~* '^utm_'
      or pg_catalog.split_part(v_param, '=', 1) ~* '^(gclid|fbclid|msclkid)$' then
      continue;
    end if;
    v_meaningful := pg_catalog.array_append(v_meaningful, v_param);
  end loop;

  if pg_catalog.cardinality(v_meaningful) = 0 then
    return v_base;
  end if;
  return v_base || '?' || pg_catalog.array_to_string(v_meaningful, '&');
end;
$$;

revoke all on function memo.legacy_page_key_from_normalized_url(text)
from public, anon, authenticated;

create or replace function memo.ensure_memo_for_highlight()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_page_key text;
begin
  v_page_key := coalesce(
    nullif(new.page_key, ''),
    memo.legacy_page_key_from_normalized_url(new.url)
  );
  -- No matching row can be locked yet. Serialize highlights for the same user and page.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'highlight_memo:' || new.user_id::text || ':' ||
      coalesce(v_page_key, new.url),
      0
    )
  );

  if exists (
    select 1
    from memo.memo existing
    where existing.user_id = new.user_id
      and existing.deleted_at is null
      and (
        (v_page_key is not null and existing.page_key = v_page_key)
        or (existing.page_key = '' and v_page_key is not null and
            memo.legacy_page_key_from_normalized_url(existing.url) = v_page_key)
        or existing.url = new.url
      )
  ) then
    return new;
  end if;

  insert into memo.memo (user_id, memo, title, url, "favIconUrl", page_key)
  values (
    new.user_id,
    '',
    coalesce(nullif(new.title, ''), new.url),
    new.url,
    new."favIconUrl",
    new.page_key
  );

  return new;
end;
$$;

revoke all on function memo.ensure_memo_for_highlight() from public, anon, authenticated;

drop trigger if exists ensure_memo_for_highlight on memo.highlight;
create trigger ensure_memo_for_highlight
after insert on memo.highlight
for each row execute function memo.ensure_memo_for_highlight();
