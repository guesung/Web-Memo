# 매일 아침 아티클 리마인더 푸시 알림

**Date**: 2026-08-11
**Type**: feature
**Status**: completed (코드) / 배포 전 수동 작업 남음

## Summary

위시리스트(`isWish=true`) 메모 중 아직 알림을 보내지 않은 아티클을 매일 아침 사용자 지정 시각에 1건 골라 Expo 푸시로 발송한다. 알림을 탭하면 앱 내 브라우저로 해당 URL이 열린다.

Supabase pg_cron이 30분마다 Edge Function `daily-article-reminder`를 호출하고, 함수는 사용자 타임존 기준 현재 30분 버킷이 설정 시각과 일치하는 유저만 골라 발송한다. 앱은 토큰 등록·설정 UI·알림 탭 딥링크만 담당한다.

## Changes Made

**DB (packages/supabase-edge-functions/supabase/migrations/)**

- `20260811_add_notification_tables.sql` — `memo.notification_setting`(유저별 On/Off·시각·타임존), `memo.push_token`(기기별 Expo 토큰), `memo.notification_log`(발송 이력) 3개 테이블 + RLS 정책 + 인덱스
- `20260812_schedule_article_reminder_cron.sql` — 30분 주기 pg_cron 잡. URL·시크릿은 하드코딩 대신 Supabase Vault에서 읽는다

**Edge Function (packages/supabase-edge-functions/supabase/functions/daily-article-reminder/)**

- `timeBucket.ts` — `shouldNotifyNow`, `getLocalDateString`. Deno/Node 양쪽에서 돌도록 외부 import 없이 Intl API만 사용
- `timeBucket.test.ts` — 30분 버킷 판정·타임존 경계 테스트 8개
- `index.ts` — `x-cron-secret` 헤더 검증 → 알림 켠 유저 조회 → 버킷 일치 확인 → 오늘 발송 여부 확인 → 후보 메모 선정 → Expo Push 발송 → 로그 기록

**앱 (apps/app/)**

- `lib/notifications/registerPushToken.ts` — 권한 요청·Expo 토큰 발급·`push_token` upsert
- `lib/notifications/useNotificationObserver.ts` — 알림 탭 시 `/(main)/browser?url=...&t=...`로 라우팅. 콜드 스타트 포함
- `lib/hooks/useNotificationSetting.ts` — 설정 조회/저장 훅. 저장 시 기기 타임존을 함께 기록
- `app/(main)/settings/_components/NotificationTimePicker.tsx` — 30분 단위 48개 옵션 모달 피커
- `app/(main)/settings/index.tsx` — 로그인 상태에서만 보이는 "알림" 섹션 추가
- `app/_layout.tsx` — 포그라운드 알림 표시 정책(`setNotificationHandler`)과 `NotificationBridge`(옵저버 + 앱 시작 시 토큰 재등록) 추가
- `app.json` — `expo-notifications` 플러그인 등록
- `package.json` — `expo-notifications ~0.32.17`, `expo-device ~8.0.10` 추가

**타입 (packages/shared/src/types/supabase.ts)**

- `notification_log`, `notification_setting`, `push_token` 3개 테이블 타입 수동 추가. 마이그레이션이 원격에 적용되면 `pnpm generate-supabase-type`으로 재생성해 일치를 확인한다

## Technical Details

**중복 발송 방지 2중 장치**

1. `notification_log`의 `UNIQUE(user_id, memo_id)` — 같은 아티클은 두 번 알리지 않는다
2. `hasSentToday()` — 마지막 발송의 로컬 날짜가 오늘이면 건너뛴다. cron이 30분마다 돌아도 하루 1건만 나간다

**시각 판정**: 사용자 설정 시각과 현재 시각을 각각 30분 버킷으로 내림해 비교한다. cron 주기(30분)와 버킷 크기가 같아 각 유저는 하루에 정확히 한 번 버킷에 걸린다. 타임존은 설정 저장 시점의 기기 값을 쓴다.

**발송 로그 시점**: Expo API가 티켓 `status: "ok"`를 하나 이상 반환한 뒤에만 insert 한다. 발송 실패한 아티클이 "이미 보낸 것"으로 소진되지 않게 하기 위함이다.

**죽은 토큰 정리**: 티켓이 `DeviceNotRegistered`면 해당 `push_token` 행을 삭제한다.

**보안**: Edge Function은 `x-cron-secret` 헤더가 `CRON_SECRET` 환경 변수와 일치할 때만 동작한다. 불일치 시 401. 새 테이블 3개는 모두 RLS로 `user_id = auth.uid()` 행만 접근 가능하고, Edge Function은 service_role로 우회한다.

**JWT 검증 비활성화**: `config.toml`에 `[functions.daily-article-reminder] verify_jwt = false`를 넣었다. pg_cron의 `net.http_post`는 Authorization 헤더를 보내지 않으므로, Supabase 게이트웨이의 기본 JWT 검증(`verify_jwt = true`)을 켜둔 채로 배포하면 함수 본문에 닿기도 전에 401로 막힌다. 인증은 `x-cron-secret` 헤더가 대신한다.

## Related Issues/PRs

- 설계 스펙: `docs/superpowers/specs/2026-08-11-daily-article-reminder-design.md`
- 구현 계획: `docs/superpowers/plans/2026-08-11-daily-article-reminder.md`

## Notes — 배포 전 수동 작업 체크리스트

코드만으로는 알림이 나가지 않는다. 아래는 사람이 직접 해야 한다.

- [ ] Firebase 프로젝트 생성 → `google-services.json`을 `apps/app/`에 추가
- [ ] `eas credentials`로 FCM V1 서비스 계정 키(Android)·APNs 키(iOS) 등록
- [ ] Supabase 대시보드: Vault에 `project_url`(`https://<ref>.supabase.co`), `cron_secret`(랜덤 문자열) 등록
- [ ] Edge Function 환경 변수 `CRON_SECRET`을 Vault의 `cron_secret`과 같은 값으로 등록
- [ ] `supabase db push`로 마이그레이션 2개 적용 (pg_cron/pg_net 확장 활성화 포함)
  - ⚠️ **develop 계열 브랜치에서는 `db push`가 거부된다.** 원격에 적용된 `20260704`·`20260727`·`20260727120000` 마이그레이션이 master에만 있고 develop에는 없어, CLI가 "Remote migration versions not found in local migrations directory"로 막는다. master 기준 워크트리에서 push 하거나, develop에 master를 먼저 반영해야 한다.
  - ⚠️ 설치된 supabase CLI 2.48.3은 8자리(`20260727`)와 14자리(`20260727120000`) 버전이 섞여 있을 때 정렬을 잘못해 매칭에 실패한다. 최신 CLI(2.114+)를 쓰는 편이 안전하다.
  - 순서 주의: cron 마이그레이션(`20260812`)은 Vault 시크릿 등록과 함수 배포가 끝난 뒤에 적용해야 한다. 먼저 적용하면 30분마다 실패하는 잡이 돈다.
- [ ] `supabase functions deploy daily-article-reminder`
- [ ] `pnpm generate-supabase-type` 재실행해 수동 추가한 타입과 실제 스키마가 일치하는지 확인
- [ ] 개발 빌드 재생성 (`expo prebuild --clean` 포함된 `pnpm android` / `pnpm ios`) — expo-notifications는 네이티브 모듈이라 기존 빌드로는 동작하지 않는다
- [ ] 실기기에서: 설정 토글 On → 권한 허용 → https://expo.dev/notifications 로 테스트 푸시 수신·탭 딥링크 확인
- [ ] cron 검증: 설정 시각을 다음 30분 버킷으로 맞추고 실제 푸시 도착 확인

### 알려진 제약

- `pickCandidateMemo`는 발송 이력 전체를 조회해 `NOT IN`으로 거른다. 유저당 로그가 수천 건 규모가 되면 쿼리 길이가 문제될 수 있어, 그 시점에는 `NOT EXISTS` 조인 방식의 RPC로 바꾸는 편이 낫다.
- 타임존은 설정 저장 시점의 기기 값으로 고정된다. 사용자가 다른 타임존으로 이동해도 설정을 다시 저장하기 전까지는 이전 타임존 기준으로 발송된다.
