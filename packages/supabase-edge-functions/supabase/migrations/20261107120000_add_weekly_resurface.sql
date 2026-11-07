-- 주간 메모 다시 보기(resurface): 발송 기록 확장, 클릭 기록 테이블, 일·월 크론.
-- 쓰기는 weekly-memo-report / weekly-report-click Edge Function(service_role)만 한다.
-- 선행 조건(사람 작업): Vault에 project_url, cron_secret 등록(기존 주간 리포트 크론과 같은 값).
-- 재실행 안전: IF NOT EXISTS / DROP ... IF EXISTS / create or replace / unschedule 후 재등록.
-- 대조군 기록 방식: 대조군은 status='holdout' + variant='holdout' 행으로 남긴다(메일은 안 보냄).
--   status를 'sent'로 두지 않는 이유는 "발송 성공" 집계에 대조군이 섞이지 않게 하기 위해서다.

alter table memo.weekly_report_log
  add column if not exists kind text not null default 'report',
  add column if not exists variant text null,
  add column if not exists memo_ids bigint[] null;

alter table memo.weekly_report_log
  drop constraint if exists weekly_report_log_kind_check,
  add constraint weekly_report_log_kind_check
    check (kind in ('report', 'resurface'));

alter table memo.weekly_report_log
  drop constraint if exists weekly_report_log_variant_check,
  add constraint weekly_report_log_variant_check
    check (variant is null or variant in ('sent', 'holdout'));

alter table memo.weekly_report_log
  drop constraint if exists weekly_report_log_status_check,
  add constraint weekly_report_log_status_check
    check (status in ('sent', 'failed', 'holdout'));

-- holdout 상태와 holdout 변형은 항상 함께 간다
alter table memo.weekly_report_log
  drop constraint if exists weekly_report_log_holdout_pair_check,
  add constraint weekly_report_log_holdout_pair_check
    check ((status = 'holdout') = (coalesce(variant, '') = 'holdout'));

-- 한 사람은 한 주에 한 통: report·resurface, 발송·대조군을 가리지 않고 주당 1행만.
-- failed는 재시도할 수 있도록 제외한다. 새 인덱스를 먼저 만든 뒤 옛 인덱스를 지워 공백이 없게 한다.
create unique index if not exists weekly_report_log_regular_week_unique
  on memo.weekly_report_log (user_id, week_start)
  where not is_test and status in ('sent', 'holdout');

drop index if exists memo.weekly_report_log_regular_sent_unique;

-- 메일 링크 클릭 기록. 쓰기는 weekly-report-click Edge Function(service_role)만 한다.
create table if not exists memo.weekly_report_click (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  -- 클릭한 메일의 기간 시작 토요일(KST)
  week_start date not null,
  kind       text not null check (kind in ('report', 'resurface')),
  -- 링크 위치. 예: memo_1, organize, view_all, footer_web
  position   text not null,
  clicked_at timestamptz not null default now()
);

alter table memo.weekly_report_click enable row level security;

drop policy if exists "weekly_report_click_select_own" on memo.weekly_report_click;
create policy "weekly_report_click_select_own" on memo.weekly_report_click
  for select to authenticated
  using (user_id = auth.uid());

grant select on memo.weekly_report_click to authenticated;
grant select, insert on memo.weekly_report_click to service_role;

-- resurface 대상 후보: 본문 메모가 있고, 해당 기간 report 대상이 아니며,
-- 리포트를 끄지 않았고(설정 행이 없으면 켜짐), 그 주에 이미 sent/holdout 기록이 없는 계정.
-- last_memo_at(마지막 본문 메모 작성 시각)은 단계적 배포의 "최근 작성 순 N명" 선별에 쓴다.
-- 메모 전체를 PostgREST로 훑지 않으려고 DB에서 걸러 user_id만 돌려준다.
create or replace function memo.weekly_resurface_candidates(
  p_week_start  date,
  p_range_start timestamptz,
  p_range_end   timestamptz
)
returns table (user_id uuid, last_memo_at timestamptz)
language sql
stable
as $$
  select m.user_id, max(m.created_at) as last_memo_at
  from memo.memo m
  where m.user_id is not null
    and m.deleted_at is null
    and coalesce(m."isWish", false) = false
    and m.memo ~ '\S'
    and not exists (
      select 1 from memo.memo w
      where w.user_id = m.user_id
        and w.created_at >= p_range_start
        and w.created_at < p_range_end
        and w.deleted_at is null
        and coalesce(w."isWish", false) = false
        and w.memo ~ '\S'
    )
    and not exists (
      select 1 from memo.setting s
      where s.user_id = m.user_id
        and s.weekly_report_enabled = false
    )
    and not exists (
      select 1 from memo.weekly_report_log l
      where l.user_id = m.user_id
        and l.week_start = p_week_start
        and not l.is_test
        and l.status in ('sent', 'holdout')
    )
  group by m.user_id
  order by m.user_id;
$$;

revoke all on function memo.weekly_resurface_candidates(date, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function memo.weekly_resurface_candidates(date, timestamptz, timestamptz) to service_role;

-- 토·일·월 10:30 KST(= 01:30 UTC)에 같은 함수를 resurface 모드로 호출한다.
-- report는 기존 'weekly-memo-report' 크론(토 10:00 KST, 본문 '{}')이 그대로 맡고,
-- 함수는 kind가 없으면 report만 처리한다. 30분 늦추는 건 토요일 report와 Resend 호출이 겹치지 않게 하려는 것이다.
create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  perform cron.unschedule('weekly-memo-resurface');
exception when others then
  null;
end $$;

select cron.schedule(
  'weekly-memo-resurface',
  '30 1 * * 6,0,1',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/weekly-memo-report',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{"kind":"resurface"}'::jsonb
  );
  $$
);

comment on column memo.weekly_report_log.kind is 'report: 이번 주 쓴 사람, resurface: 이번 주 안 쓴 사람에게 예전 메모';
comment on column memo.weekly_report_log.variant is 'resurface 전용. sent: 발송군, holdout: 대조군(메일 안 보냄)';
comment on column memo.weekly_report_log.memo_ids is 'resurface로 고른 메모 id. 이후 같은 메모를 다시 고르지 않는 근거';
