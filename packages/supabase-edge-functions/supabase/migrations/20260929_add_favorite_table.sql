-- 앱 즐겨찾기(URL 북마크)를 계정에 저장한다. 메모의 isStar(중요 표시)와는 별개다.
create table memo.favorite (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  url          text not null,
  page_key     text not null,
  title        text not null default '',
  "favIconUrl" text,
  created_at   timestamptz not null default now(),
  constraint favorite_user_page_key_unique unique (user_id, page_key)
);

create index favorite_user_created_idx on memo.favorite (user_id, created_at desc);

alter table memo.favorite enable row level security;

create policy "favorite_select_own" on memo.favorite
  for select using (auth.uid() = user_id);
create policy "favorite_insert_own" on memo.favorite
  for insert with check (auth.uid() = user_id);
create policy "favorite_update_own" on memo.favorite
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "favorite_delete_own" on memo.favorite
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete on memo.favorite to authenticated;
