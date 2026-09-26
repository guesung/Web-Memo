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
| `ci.yml` | push(develop·master), pull_request | 해당 push·PR 이벤트마다 | `deploy/detect-affected-apps.sh` · `deploy/notify-thread-root.mjs` · `deploy/notify-thread-reply.mjs` · `deploy/notify-build-ready.mjs` · `deploy/notify-staging-deploy.mjs` · `deploy/comment-pr-extension.mjs`, 그리고 `cd-app`·`cd-extension`·`cd-web` 호출 |
| `e2e.yml` | push(develop·master), pull_request | 해당 push·PR 이벤트마다 | 없음 (Playwright) |
| `cd-app.yml` | workflow_call | 다른 워크플로에서 호출할 때마다 | `deploy/find-reusable-artifact.sh` |
| `cd-extension.yml` | workflow_call, workflow_dispatch | 다른 워크플로에서 호출하거나 수동 실행할 때마다 | `deploy/find-reusable-artifact.sh` |
| `cd-web.yml` | workflow_call, workflow_dispatch | 다른 워크플로에서 호출하거나 수동 실행할 때마다 | `deploy/find-staged-deployment.mjs` · `deploy/staged-deployment.mjs` · `deploy/notify-staging-deploy.mjs` |
| `release.yml` | workflow_dispatch | 수동 실행할 때마다 | 없음. `cd-app`·`cd-extension`·`cd-web`·`release-notify` 호출 |
| `release-notify.yml` | workflow_call | `release.yml`에서 호출할 때마다 | `deploy/notify-release-result.mjs` |
| `release-github.yml` | push(tag `v*`) | `v*` 태그 push마다 | 없음 |
| `versions.yml` | workflow_dispatch | 수동 실행할 때마다 | `deploy/report-store-versions.mjs` |
| `audit-env-manifest.yml` | pull_request, workflow_dispatch | PR 이벤트 또는 수동 실행마다 | `env/check-env-manifest.mjs` |
| `audit-env-registry.yml` | pull_request, schedule, workflow_dispatch | 매일 07:30 KST, PR 이벤트 또는 수동 실행마다 | `env/audit-env-registry.mjs` |
| `audit-ga-cid-adoption.yml` | schedule, workflow_dispatch | 매주 월요일 09:13 KST 또는 수동 실행마다 | 없음 (Playwright, `e2e/probes/`) |
| `audit-refactor.yml` | schedule, workflow_dispatch | 매주 토요일 10:17 KST 또는 수동 실행마다 | `refactor/report-refactor-audit.mjs` |
| `report-ga-daily.yml` | schedule, workflow_dispatch | 매일 07:00 KST 또는 수동 실행마다 | `ga/report-daily-ga.mjs` |
| `report-ga-weekly.yml` | schedule, workflow_dispatch | 매주 월요일 08:00 KST 또는 수동 실행마다 | `ga/report-weekly-ga.mjs` |
| `report-seo.yml` | schedule, workflow_dispatch | 매일 09:17 KST 또는 수동 실행마다 | `pnpm seo:check`·`seo:gsc`·`seo:sheets` · `seo/find-previous-seo-report.mjs` · `seo/build-seo-ai-context.mjs` · `seo/send-seo-ai-report.mjs` · `seo/notify-seo-slack.mjs` |
| `chore-cleanup-unused.yml` | schedule, workflow_dispatch | 매주 토요일 10:00 KST 또는 수동 실행마다 | `cleanup/cleanup-unused-files.mjs` |
| `chore-e2e-coverage.yml` | schedule, workflow_dispatch | 매주 일요일 10:23 KST 또는 수동 실행마다 | `e2e-coverage/maintain.mjs` |
| `chore-supabase-inventory.yml` | schedule, workflow_dispatch | 매일 08:00 KST 또는 수동 실행마다 | `supabase/generate-supabase-inventory.mjs` · `supabase/sync-supabase-inventory-pr.mjs` |

정기 실행 시각은 워크플로의 UTC cron을 한국 시간(KST)으로 환산한 예정 시각입니다. GitHub Actions 사정에 따라 실제 시작은 늦어질 수 있습니다.

`chore-cleanup-unused.yml`·`chore-supabase-inventory.yml`·`audit-refactor.yml`은 `ref: master`로 체크아웃합니다. 작업 브랜치에서
dispatch해도 스크립트는 master의 것이 돕니다.
`chore-e2e-coverage.yml`은 주간 실행에서 master를, 수동 실행에서 선택한 ref를 체크아웃합니다. `master` 외 ref의 수동 실행은 검증 결과만 남기고 PR을 게시하지 않습니다.

릴리스·배포 흐름 전체는 [`docs/release-flow.md`](../docs/release-flow.md)를 봅니다.

## 스크립트

`.github/scripts/`는 도메인 폴더로 나뉩니다. 폴더 안에는 실행 스크립트(위 표에 나오는 파일)와
그 스크립트가 쓰는 모듈, 테스트(`*.test.ts`)가 함께 있습니다.

| 폴더 | 담당 |
| --- | --- |
| `shared/` | 두 도메인 이상이 쓰는 모듈 (`run-context`·`slack-api`·`slack-blocks`·`http`·`jwt`·`google-auth`·`google-sheets`·`repo-versions`) |
| `deploy/` | CI 빌드 판정, Slack 빌드·배포·릴리스 알림, PR 확장 다운로드 댓글, 스토어 버전 |
| `seo/` | SEO 점검·GSC·Sheets 적재·AI 리포트 |
| `ga/` | GA4 일간·주간 리포트, 기능 사용량 측정 |
| `env/` | 환경 변수 매니페스트 검사와 등록 현황 감사 |
| `supabase/` | 운영 Supabase 인벤토리 문서(`docs/supabase-inventory.md`) 생성과 갱신 PR |
| `refactor/` | 주간 리팩토링 점검 |
| `cleanup/` | 미사용 파일 정리 |
| `e2e-coverage/` | 핵심 사용자 흐름의 E2E 누락 점검, 새 테스트 검증, 자동 보완 PR 게시 |
| `copy/` | 번역 문구 구글 시트 동기화(push·pull)와 문구 키 검사 |

**`shared/` 규칙**: 두 도메인 이상이 쓰는 모듈만 `shared/`에 둡니다. 한 도메인만 쓰면 이름이
범용이어도 그 도메인 폴더에 둡니다(예: `ga/ga4-sheet.mjs`). `shared/`는 다른 도메인 폴더를
import하지 않습니다.

### 워크플로 밖에서 부르는 것

| 진입점 | 경로 | 용도 |
| --- | --- | --- |
| `pnpm seo:check` | `seo/check-seo.mjs` | SEO 점검 (`report-seo.yml`도 사용) |
| `pnpm seo:gsc` | `seo/check-gsc.mjs` | Search Console 색인·성과 조회 |
| `pnpm seo:sheets` | `seo/persist-seo-sheets.mjs` | SEO 결과를 Google Sheets에 적재 |
| `pnpm copy:push` | `copy/push-copy.mjs` | 새 번역 키를 문구 시트에 추가하고 사용 위치 열 갱신 |
| `pnpm copy:pull` | `copy/pull-copy.mjs` | 문구 시트의 ko·en 값을 번역 JSON에 반영 (`--check`는 쓰지 않고 차이만 검사) |
| `pnpm copy:check` | `copy/check-copy-keys.mjs` | ko/en 키 일치·코드의 번역 키 존재 검사 (`ci.yml`도 사용) |
| 수동 CLI | `ga/measure-feature-usage.mjs` | 기간별 기능 사용량 측정 ([`docs/analytics.md`](../docs/analytics.md)) |

테스트는 `pnpm exec vitest run .github/scripts`로 돌립니다.
