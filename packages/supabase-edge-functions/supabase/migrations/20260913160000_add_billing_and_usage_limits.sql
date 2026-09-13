create schema if not exists billing;

create type billing.subscription_status as enum ('inactive', 'active', 'past_due', 'cancelled');
create type billing.charge_status as enum ('pending', 'succeeded', 'failed', 'unknown');

create table billing.customer_secrets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  toss_customer_key text not null unique,
  billing_key_ciphertext text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table billing.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status billing.subscription_status not null default 'inactive',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  price_krw integer not null default 500 check (price_krw > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table billing.charges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id text not null unique,
  idempotency_key text not null unique,
  amount_krw integer not null check (amount_krw > 0),
  status billing.charge_status not null default 'pending',
  toss_payment_key text,
  failure_code text,
  failure_message text,
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  dispatched_at timestamptz,
  raw_response jsonb
);

create table billing.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period_start timestamptz not null,
  period_end timestamptz not null,
  feature text not null,
  estimated_cost_micros integer not null check (estimated_cost_micros >= 0),
  actual_cost_micros integer check (actual_cost_micros >= 0),
  status text not null check (status in ('reserved', 'settled', 'released')),
  created_at timestamptz not null default now()
);

create unique index charges_one_unresolved_per_user_idx on billing.charges (user_id) where status in ('pending', 'unknown');

create index charges_user_requested_idx on billing.charges (user_id, requested_at desc);
create index charges_unknown_idx on billing.charges (requested_at) where status = 'unknown';
create index ai_usage_period_idx on billing.ai_usage (user_id, period_start, period_end) where status <> 'released';

alter table billing.customer_secrets enable row level security;
alter table billing.subscriptions enable row level security;
alter table billing.charges enable row level security;
alter table billing.ai_usage enable row level security;

create policy subscription_select_own on billing.subscriptions for select using (auth.uid() = user_id);
create policy charge_select_own on billing.charges for select using (auth.uid() = user_id);
create policy ai_usage_select_own on billing.ai_usage for select using (auth.uid() = user_id);

revoke all on schema billing from anon, authenticated;
grant usage on schema billing to authenticated, service_role;
grant select on billing.subscriptions, billing.charges, billing.ai_usage to authenticated;
grant all on all tables in schema billing to service_role;

create or replace function billing.is_paid_user(target_user_id uuid)
returns boolean language sql stable security definer set search_path = billing, public as $$
  select exists (
    select 1 from billing.subscriptions
    where user_id = target_user_id and status = 'active' and current_period_end > now()
  );
$$;

create or replace function billing.enforce_charge_start()
returns trigger language plpgsql security definer set search_path = billing, public as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('billing-charge:' || new.user_id::text, 0));
  if billing.is_paid_user(new.user_id) then
    raise exception using errcode = 'P0001', message = 'ACTIVE_SUBSCRIPTION_EXISTS';
  end if;
  if new.idempotency_key like 'renew:%' and exists (
    select 1 from billing.subscriptions where user_id = new.user_id and cancel_at_period_end
  ) then
    raise exception using errcode = 'P0001', message = 'SUBSCRIPTION_RENEWAL_CANCELLED';
  end if;
  return new;
end;
$$;
create trigger enforce_charge_start before insert on billing.charges
for each row execute function billing.enforce_charge_start();

-- 해지·원장 생성·발송·완료는 모두 같은 사용자 lock으로 순서를 결정합니다.
create or replace function billing.cancel_subscription(target_user_id uuid)
returns void language plpgsql security definer set search_path = billing, public as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('billing-charge:' || target_user_id::text, 0));
  update billing.subscriptions set cancel_at_period_end = true, updated_at = now()
    where user_id = target_user_id;
end;
$$;
revoke all on function billing.cancel_subscription(uuid) from public, anon, authenticated;
grant execute on function billing.cancel_subscription(uuid) to service_role;

create or replace function billing.prepare_charge_dispatch(
  target_user_id uuid, target_order_id text, target_recovery boolean default false
) returns text language plpgsql security definer set search_path = billing, public as $$
declare
  charge billing.charges%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended('billing-charge:' || target_user_id::text, 0));
  select * into charge from billing.charges
    where user_id = target_user_id and order_id = target_order_id for update;
  if not found then
    raise exception 'CHARGE_NOT_FOUND';
  end if;
  if charge.status not in ('pending', 'unknown') then
    return charge.status::text;
  end if;
  if charge.dispatched_at is not null then
    -- 토스 멱등성 보존 기간(15일) 안에서만 같은 주문을 재전송합니다.
    if target_recovery and charge.dispatched_at > now() - interval '14 days' then
      return 'dispatch';
    end if;
    return 'unknown';
  end if;
  if target_recovery or (charge.idempotency_key like 'renew:%' and exists (
    select 1 from billing.subscriptions where user_id = target_user_id and cancel_at_period_end
  )) then
    update billing.charges set status = 'failed', resolved_at = now(),
      failure_code = 'CHARGE_NOT_DISPATCHED', failure_message = 'Charge was not sent to the payment provider'
      where id = charge.id;
    return 'failed';
  end if;
  update billing.charges set dispatched_at = now() where id = charge.id;
  return 'dispatch';
end;
$$;
revoke all on function billing.prepare_charge_dispatch(uuid, text, boolean) from public, anon, authenticated;
grant execute on function billing.prepare_charge_dispatch(uuid, text, boolean) to service_role;

create or replace function billing.complete_subscription_charge(
  target_user_id uuid,
  target_order_id text,
  target_period_start timestamptz,
  target_period_end timestamptz,
  target_payment_key text,
  target_payment jsonb
) returns void language plpgsql security definer set search_path = billing, public as $$
declare
  charge billing.charges%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended('billing-charge:' || target_user_id::text, 0));
  select * into charge from billing.charges
    where user_id = target_user_id and order_id = target_order_id for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'CHARGE_NOT_FOUND';
  end if;
  if charge.status = 'succeeded' then
    return;
  end if;
  if target_period_end <= target_period_start or target_payment->>'status' is distinct from 'DONE'
    or target_payment->>'orderId' is distinct from target_order_id then
    raise exception using errcode = 'P0001', message = 'PAYMENT_NOT_CONFIRMED';
  end if;
  insert into billing.subscriptions(user_id, status, current_period_start, current_period_end, cancel_at_period_end, price_krw)
    values(target_user_id, 'active', target_period_start, target_period_end, false, charge.amount_krw)
    on conflict (user_id) do update set
      status = 'active', current_period_start = excluded.current_period_start,
      current_period_end = excluded.current_period_end, price_krw = excluded.price_krw,
      cancel_at_period_end = billing.subscriptions.cancel_at_period_end,
      updated_at = now();
  update billing.charges set status = 'succeeded', toss_payment_key = target_payment_key,
    resolved_at = now(), raw_response = target_payment
    where id = charge.id;
end;
$$;
revoke all on function billing.complete_subscription_charge(uuid, text, timestamptz, timestamptz, text, jsonb) from public, anon, authenticated;
grant execute on function billing.complete_subscription_charge(uuid, text, timestamptz, timestamptz, text, jsonb) to service_role;

create or replace function billing.enforce_memo_limit()
returns trigger language plpgsql security definer set search_path = billing, memo, public as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('memo-limit:' || new.user_id::text, 0));
  -- ON CONFLICT DO UPDATE에도 BEFORE INSERT가 실행되므로 기존 소유 행의 편집은 허용합니다.
  if exists (select 1 from memo.memo where id = new.id and user_id = new.user_id) then
    return new;
  end if;
  if billing.is_paid_user(new.user_id) then
    return new;
  end if;
  if (select count(*) from memo.memo where user_id = new.user_id) >= 50 then
    raise exception using errcode = 'P0001', message = 'FREE_MEMO_LIMIT_EXCEEDED';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_free_memo_limit on memo.memo;
create trigger enforce_free_memo_limit before insert on memo.memo
for each row execute function billing.enforce_memo_limit();

create or replace function billing.reserve_ai_usage(
  target_user_id uuid,
  target_feature text,
  target_estimated_cost_micros integer
) returns uuid language plpgsql security definer set search_path = billing, public as $$
declare
  subscription billing.subscriptions%rowtype;
  usage_count integer;
  usage_cost bigint;
  reservation_id uuid;
begin
  select * into subscription from billing.subscriptions
  where user_id = target_user_id and status = 'active' and current_period_end > now()
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'ACTIVE_SUBSCRIPTION_REQUIRED';
  end if;
  select count(*), coalesce(sum(coalesce(actual_cost_micros, estimated_cost_micros)), 0)
    into usage_count, usage_cost from billing.ai_usage
    where user_id = target_user_id
      and period_start = subscription.current_period_start
      and period_end = subscription.current_period_end
      and status <> 'released';
  if usage_count >= 30 then
    raise exception using errcode = 'P0001', message = 'AI_USAGE_LIMIT_EXCEEDED';
  end if;
  if usage_cost + target_estimated_cost_micros > 100000000 then
    raise exception using errcode = 'P0001', message = 'AI_COST_LIMIT_EXCEEDED';
  end if;
  insert into billing.ai_usage(user_id, period_start, period_end, feature, estimated_cost_micros, status)
  values(target_user_id, subscription.current_period_start, subscription.current_period_end, target_feature, target_estimated_cost_micros, 'reserved')
  returning id into reservation_id;
  return reservation_id;
end;
$$;

revoke all on function billing.reserve_ai_usage(uuid, text, integer) from public, anon, authenticated;
grant execute on function billing.reserve_ai_usage(uuid, text, integer) to service_role;

create or replace function billing.settle_ai_usage(
  target_reservation_id uuid,
  target_actual_cost_micros integer
) returns void language sql security definer set search_path = billing, public as $$
  update billing.ai_usage
  set status = 'settled', actual_cost_micros = target_actual_cost_micros
  where id = target_reservation_id and status = 'reserved';
$$;

revoke all on function billing.settle_ai_usage(uuid, integer) from public, anon, authenticated;
grant execute on function billing.settle_ai_usage(uuid, integer) to service_role;

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;
select cron.schedule('billing-reconcile-unknown-charges', '*/10 * * * *', $$
  select net.http_post(
    url := current_setting('app.settings.billing_reconcile_url', true),
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.billing_cron_secret', true)),
    body := '{}'::jsonb
  ) where current_setting('app.settings.billing_reconcile_url', true) <> ''
$$);
select cron.schedule('billing-renew-subscriptions', '0 * * * *', $$
  select net.http_post(
    url := current_setting('app.settings.billing_renew_url', true),
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.billing_cron_secret', true)),
    body := '{}'::jsonb
  ) where current_setting('app.settings.billing_renew_url', true) <> ''
$$);
