create table memo.highlight (
  id                    bigint generated always as identity primary key,
  user_id               uuid not null references auth.users(id) on delete cascade,
  url                   text not null,
  title                 text,
  "favIconUrl"          text,
  exact_text            text not null,
  prefix_text           text,
  suffix_text           text,
  text_position_start   integer,
  color                 text not null default 'yellow',
  note                  text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint highlight_color_check
    check (color in ('yellow', 'green', 'blue', 'pink', 'purple'))
);

create index highlight_user_url_idx     on memo.highlight (user_id, url);
create index highlight_user_created_idx on memo.highlight (user_id, created_at desc);

alter table memo.highlight enable row level security;

create policy "highlight_select_own" on memo.highlight
  for select using (auth.uid() = user_id);
create policy "highlight_insert_own" on memo.highlight
  for insert with check (auth.uid() = user_id);
create policy "highlight_update_own" on memo.highlight
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "highlight_delete_own" on memo.highlight
  for delete using (auth.uid() = user_id);
