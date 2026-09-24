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

| 워크플로 | 트리거 | 부르는 스크립트 (`.github/scripts/` 기준) |
| --- | --- | --- |
| `ci.yml` | push(develop·master), pull_request | `deploy/detect-affected-apps.sh` · `deploy/notify-thread-root.mjs` · `deploy/notify-thread-reply.mjs` · `deploy/notify-build-ready.mjs` · `deploy/notify-staging-deploy.mjs` · `deploy/comment-pr-extension.mjs`, 그리고 `cd-app`·`cd-extension`·`cd-web` 호출 |
| `e2e.yml` | push(develop·master), pull_request | 없음 (Playwright) |
| `cd-app.yml` | workflow_call | `deploy/find-reusable-artifact.sh` |
| `cd-extension.yml` | workflow_call, workflow_dispatch | `deploy/find-reusable-artifact.sh` |
| `cd-web.yml` | workflow_call, workflow_dispatch | `deploy/find-staged-deployment.mjs` · `deploy/staged-deployment.mjs` · `deploy/notify-staging-deploy.mjs` |
| `release.yml` | workflow_dispatch | 없음. `cd-app`·`cd-extension`·`cd-web`·`release-notify` 호출 |
| `release-notify.yml` | workflow_call | `deploy/notify-release-result.mjs` |
| `release-github.yml` | push(tag `v*`) | 없음 |
| `versions.yml` | workflow_dispatch | `deploy/report-store-versions.mjs` |
| `audit-env-manifest.yml` | pull_request, workflow_dispatch | `env/check-env-manifest.mjs` |
| `audit-env-registry.yml` | pull_request, schedule, workflow_dispatch | `env/audit-env-registry.mjs` |
| `audit-supabase.yml` | pull_request, schedule, workflow_dispatch | `supabase/audit-supabase.mjs` · `supabase/notify-supabase-audit.mjs` |
| `audit-refactor.yml` | schedule, workflow_dispatch | `refactor/report-refactor-audit.mjs` |
| `report-ga-daily.yml` | schedule, workflow_dispatch | `ga/report-daily-ga.mjs` |
| `report-ga-weekly.yml` | schedule, workflow_dispatch | `ga/report-weekly-ga.mjs` |
| `report-seo.yml` | schedule, workflow_dispatch | `pnpm seo:check`·`seo:gsc`·`seo:sheets` · `seo/find-previous-seo-report.mjs` · `seo/build-seo-ai-context.mjs` · `seo/send-seo-ai-report.mjs` · `seo/notify-seo-slack.mjs` |
| `chore-cleanup-unused.yml` | schedule, workflow_dispatch | `cleanup/cleanup-unused-files.mjs` |

`chore-cleanup-unused.yml`과 `audit-refactor.yml`은 `ref: master`로 체크아웃합니다. 작업 브랜치에서
dispatch해도 스크립트는 master의 것이 돕니다.

릴리스·배포 흐름 전체는 [`docs/release-flow.md`](../docs/release-flow.md)를 봅니다.

## 스크립트

`.github/scripts/`는 도메인 폴더로 나뉩니다. 폴더 안에는 실행 스크립트(위 표에 나오는 파일)와
그 스크립트가 쓰는 모듈, 테스트(`*.test.ts`)가 함께 있습니다.

| 폴더 | 담당 |
| --- | --- |
| `shared/` | 두 도메인 이상이 쓰는 모듈 (`run-context`·`slack-api`·`slack-blocks`·`http`·`jwt`·`google-auth`·`repo-versions`) |
| `deploy/` | CI 빌드 판정, Slack 빌드·배포·릴리스 알림, PR 확장 다운로드 댓글, 스토어 버전 |
| `seo/` | SEO 점검·GSC·Sheets 적재·AI 리포트 |
| `ga/` | GA4 일간·주간 리포트, 기능 사용량 측정 |
| `env/` | 환경 변수 매니페스트 검사와 등록 현황 감사 |
| `supabase/` | Supabase 운영 상태 감사 |
| `refactor/` | 주간 리팩토링 점검 |
| `cleanup/` | 미사용 파일 정리 |

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
