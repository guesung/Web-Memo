-- 리마인더 알림 시각을 사용자당 여러 개(최대 5개) 저장한다.
-- notification_setting은 timezone 저장용으로 계속 쓰며 컬럼은 건드리지 않는다.
-- 운영 DB에 재실행해도 오류가 없도록 IF NOT EXISTS / DROP ... IF EXISTS / OR REPLACE를 쓴다.
create table if not exists memo.notification_schedule (
  id           bigserial primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  "notifyTime" time not null,
  "isEnabled"  boolean not null default true,
  created_at   timestamptz not null default now(),
  unique (user_id, "notifyTime")
);

create index if not exists notification_schedule_user_idx
  on memo.notification_schedule (user_id);

alter table memo.notification_schedule enable row level security;

drop policy if exists "notification_schedule_own_rows" on memo.notification_schedule;
create policy "notification_schedule_own_rows" on memo.notification_schedule
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on memo.notification_schedule to authenticated;
grant usage, select on sequence memo.notification_schedule_id_seq to authenticated;

-- 사용자당 5개 제한. 동시 insert가 둘 다 통과하지 못하도록 사용자 단위로 직렬화한다.
create or replace function memo.enforce_notification_schedule_limit()
returns trigger
language plpgsql
as $$
begin
  perform pg_advisory_xact_lock(hashtext('notification_schedule:' || new.user_id::text));

  if (select count(*) from memo.notification_schedule where user_id = new.user_id) >= 5 then
    raise exception '알림 시각은 최대 5개까지 등록할 수 있습니다.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists notification_schedule_limit on memo.notification_schedule;
create trigger notification_schedule_limit
  before insert on memo.notification_schedule
  for each row execute function memo.enforce_notification_schedule_limit();

-- 발송 이력에 어떤 알림 시각으로 보냈는지 남긴다. 기존 행은 NULL로 호환된다.
alter table memo.notification_log add column if not exists "notifyTime" time null;
