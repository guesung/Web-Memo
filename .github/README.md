# .github

GitHub Actions 워크플로와, 워크플로가 부르는 스크립트가 있는 폴더입니다.
이 문서는 **어느 워크플로가 어느 스크립트를 부르는지**를 한곳에 모은 대응표입니다.
워크플로나 스크립트를 추가·이동·삭제하면 이 표도 같은 PR에서 고칩니다.

## 워크플로

GitHub Actions는 `.github/workflows/` 아래 하위 폴더를 인식하지 않습니다. 그래서 폴더 대신
파일명 앞의 **계열 접두사**로 묶습니다.

| 접두사 | 계열 |
| --- | --- |
| `ci`·`e2e` | PR·push마다 도는 검증 |
| `cd-` | 앱별 빌드·배포 (재사용 워크플로) |
| `release`·`versions` | 릴리스와 스토어 버전 조회. 웹의 Slack 버튼이 파일명으로 dispatch하므로 이름을 바꾸지 않습니다 |
| `audit-` | 상태를 선언과 대조하는 감사 |
| `report-` | 정기 리포트 |
| `chore-` | 레포 유지보수 자동화 |

| 워크플로 | 트리거 | 실행 주기·시각 | 부르는 스크립트 (`.github/scripts/` 기준) |
| --- | --- | --- | --- |
| `ci.yml` | push(develop·master), pull_request | 해당 push·PR 이벤트마다 | `deploy/resolve-affected-base.sh` · `deploy/detect-affected-apps.sh` · `deploy/notify-thread-root.mjs` · `deploy/notify-thread-reply.mjs` · `deploy/notify-build-ready.mjs` · `deploy/notify-staging-deploy.mjs` · `deploy/comment-pr-extension.mjs`, 그리고 `cd-app`·`cd-extension`·`cd-web` 호출 |
| `e2e.yml` | push(develop·master), pull_request | 해당 push·PR 이벤트마다 | 없음 (Playwright) |
| `cd-app.yml` | workflow_call | 검증된 develop 후보를 큐에서 재판정해 Android APK 빌드·Firebase App Distribution 배포, master·PR은 빌드만, release는 새 빌드·Play 내부 테스트 제출 | `deploy/prepareStagingApp.mjs` · `deploy/appDeploymentState.mjs` · `deploy/detect-affected-apps.sh` (EAS CLI·firebase-tools) |
| `cd-extension.yml` | workflow_call, workflow_dispatch | 다른 워크플로에서 호출하거나 수동 실행할 때마다 | `deploy/find-reusable-artifact.sh` · `deploy/upload-extension-to-store.mjs` |
| `cd-web.yml` | workflow_call, workflow_dispatch | 다른 워크플로에서 호출하거나 수동 실행할 때마다 | `deploy/find-staged-deployment.mjs` · `deploy/staged-deployment.mjs` · `deploy/notify-staging-deploy.mjs` |
| `release.yml` | workflow_dispatch | 수동 실행할 때마다 | 없음. `cd-app`·`cd-extension`·`cd-web`·`release-notify` 호출 |
| `release-notify.yml` | workflow_call | `release.yml`에서 호출할 때마다 | `deploy/notify-release-result.mjs` |
| `release-github.yml` | push(tag `v*`) | `v*` 태그 push마다 | 없음 |
| `versions.yml` | workflow_dispatch | 수동 실행할 때마다 | `deploy/report-store-versions.mjs` |
| `notify-extension-published.yml` | schedule, workflow_dispatch | 매시 07·37분 또는 수동 실행마다 | `deploy/notify-extension-published.mjs` |
| `audit-env-manifest.yml` | pull_request, workflow_dispatch | PR 이벤트 또는 수동 실행마다 | `env/check-env-manifest.mjs` |
| `audit-env-registry.yml` | pull_request, schedule, workflow_dispatch | 매일 07:30 KST, PR 이벤트 또는 수동 실행마다 | `env/audit-env-registry.mjs` |
| `audit-ga-cid-adoption.yml` | schedule, workflow_dispatch | 매주 월요일 09:13 KST 또는 수동 실행마다 | 없음 (Playwright, `e2e/probes/`) |
| `audit-refactor.yml` | schedule, workflow_dispatch | 매주 토요일 10:17 KST 또는 수동 실행마다 | `refactor/report-refactor-audit.mjs` |
| `report-ga-daily.yml` | schedule, workflow_dispatch | 매일 07:00 KST 또는 수동 실행마다 | `ga/report-daily-ga.mjs` |
| `report-ga-weekly.yml` | schedule, workflow_dispatch | 매주 월요일 08:00 KST 또는 수동 실행마다 | `ga/report-weekly-ga.mjs` |
| `report-seo.yml` | schedule, workflow_dispatch | 매일 09:17 KST 또는 수동 실행마다 | `pnpm seo:check`·`seo:gsc`·`seo:sheets` · `seo/find-previous-seo-report.mjs` · `seo/build-seo-ai-context.mjs` · `seo/send-seo-ai-report.mjs` · `seo/notify-seo-slack.mjs` |
| `chore-cleanup-unused.yml` | schedule, workflow_dispatch | 매주 토요일 10:00 KST 또는 수동 실행마다 | `cleanup/cleanup-unused-files.mjs` |
| `chore-e2e-coverage.yml` | schedule, workflow_dispatch | 매주 일요일 10:23 KST 또는 수동 실행마다 | `e2e-coverage/maintain.mjs` |
| `chore-ga-events.yml` | schedule, workflow_dispatch | 매주 수요일 09:41 KST 또는 수동 실행마다 | `ga-events/maintain.mjs` |
| `chore-supabase-inventory.yml` | schedule, workflow_dispatch | 매일 08:00 KST 또는 수동 실행마다 | `supabase/generate-supabase-inventory.mjs` · `supabase/sync-supabase-inventory-pr.mjs` |

정기 실행 시각은 워크플로의 UTC cron을 한국 시간(KST)으로 환산한 예정 시각입니다. GitHub Actions 사정에 따라 실제 시작은 늦어질 수 있습니다.

`chore-cleanup-unused.yml`·`chore-supabase-inventory.yml`·`audit-refactor.yml`은 `ref: master`로 체크아웃합니다. 작업 브랜치에서
dispatch해도 스크립트는 master의 것이 돕니다.
`chore-e2e-coverage.yml`과 `chore-ga-events.yml`은 주간 실행에서 master를, 수동 실행에서 선택한 ref를 체크아웃합니다. `master` 외 ref의 수동 실행은 검증 결과만 남기고 PR을 게시하지 않습니다.

`detect-affected-apps.sh`는 Turbo 패키지 영향 판정에 더해 CI·앱·릴리스 워크플로와 앱 판정 스크립트 변경을 앱 변경으로 처리합니다. push 실행 전체는 취소하지 않고 develop의 검증·웹·확장 잡만 각각 이전 잡을 취소합니다. 앱의 실제 빌드 잡이 `release-app` 그룹(`cancel-in-progress: false`, `queue: max`)을 단독으로 소유해 운영 요청을 최대 100개까지 대기시킵니다. develop 후보는 실행권을 얻은 뒤 최신 검증 성공 후보와 플랫폼별 마지막 배포 성공 SHA를 확인하고, 오래되었거나 앱 변경이 없는 후보를 EAS 전에 생략합니다. 성공 SHA는 Firebase 배포가 끝난 뒤 `staging-app-success-<platform>-<sha>-<run>-<attempt>` 아티팩트로 90일간 보관합니다. 기준이 없거나 만료됐으면 전체 앱 빌드하며, 조회 실패는 실패로 처리합니다. Android 운영 릴리스의 master CI 산출물 재사용은 유지합니다.

`ci.yml`의 `notify-staging-app`은 `deploy/notify-thread-reply.mjs`를 `REPLY_PHASE=store-submit`으로 호출해 develop 앱 App Tester 배포 결과를 머지 스레드에 알립니다. 웹 결과 알림과 독립적으로 실행하며, 앱 댓글에는 배포 버튼 없이 Actions 로그 링크만 붙입니다. 큐에서 생략한 후보는 `attempted=false`로 결과 댓글을 억제합니다.

릴리스·배포 흐름 전체는 [`docs/release-flow.md`](../docs/release-flow.md)를 봅니다.

## 스크립트

`.github/scripts/`는 도메인 폴더로 나뉩니다. 폴더 안에는 실행 스크립트(위 표에 나오는 파일)와
그 스크립트가 쓰는 모듈, 테스트(`*.test.ts`)가 함께 있습니다.

| 폴더 | 담당 |
| --- | --- |
| `shared/` | 두 도메인 이상이 쓰는 모듈 (`run-context`·`slack-api`·`slack-blocks`·`http`·`jwt`·`google-auth`·`repo-versions`) |
| `deploy/` | CI 빌드 판정, Slack 빌드·배포·릴리스 알림, PR 확장 다운로드 댓글, 확장 웹스토어 업로드, 스토어 버전 |
| `seo/` | SEO 점검·GSC·Sheets 적재·AI 리포트 |
| `ga/` | GA4 일간·주간 리포트, 기능 사용량 측정 |
| `env/` | 환경 변수 매니페스트 검사와 등록 현황 감사 |
| `supabase/` | 운영 Supabase 인벤토리 문서(`docs/supabase-inventory.md`) 생성과 갱신 PR |
| `refactor/` | 주간 리팩토링 점검 |
| `cleanup/` | 미사용 파일 정리 |
| `e2e-coverage/` | 핵심 사용자 흐름의 E2E 누락 점검, 새 테스트 검증, 자동 보완 PR 게시 |
| `ga-events/` | GA 이벤트 누락 점검, 이벤트 추가 패치 검증, 자동 보완 PR 게시 |

**`shared/` 규칙**: 두 도메인 이상이 쓰는 모듈만 `shared/`에 둡니다. 한 도메인만 쓰면 이름이
범용이어도 그 도메인 폴더에 둡니다(예: `seo/google-sheets.mjs`). `shared/`는 다른 도메인 폴더를
import하지 않습니다.

### 워크플로 밖에서 부르는 것

| 진입점 | 경로 | 용도 |
| --- | --- | --- |
| `pnpm seo:check` | `seo/check-seo.mjs` | SEO 점검 (`report-seo.yml`도 사용) |
| `pnpm seo:gsc` | `seo/check-gsc.mjs` | Search Console 색인·성과 조회 |
| `pnpm seo:sheets` | `seo/persist-seo-sheets.mjs` | SEO 결과를 Google Sheets에 적재 |
| 수동 CLI | `ga/measure-feature-usage.mjs` | 기간별 기능 사용량 측정 ([`docs/analytics.md`](../docs/analytics.md)) |

테스트는 `pnpm exec vitest run .github/scripts`로 돌립니다.
