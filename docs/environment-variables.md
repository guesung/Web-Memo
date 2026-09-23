# 환경 변수 관리

이 문서는 값이 어디에 살고, 누가 읽고, 왜 그렇게 나뉘어 있는지를 설명합니다.

## 판단 기준

값의 위치는 **"환경에 따라 달라지는가"**로 정합니다. **노출 여부가 아닙니다.**

환경 변수의 존재 이유는 비밀 유지가 아니라 환경별 분기입니다. 클라이언트 번들에
인라인되는 값은 환경 변수에 넣어도 그대로 공개되므로, 감추는 효과가 없으면서
관리 지점만 늘어납니다.

| 위치 | 담는 것 | 추적 | 읽는 쪽 |
| --- | --- | --- | --- |
| `packages/env/.env.{development,staging,production}` | 확장·웹이 공유하며 환경마다 다른 값 | ✅ 커밋 | `tsup`이 빌드 시 인라인 |
| `packages/env/.env` | 위 값의 로컬 오버라이드 (선택) | ❌ | 동상 |
| Vercel 프로젝트 환경변수 | 웹의 서버 시크릿과 런타임·빌드 값. **웹 값의 원천(SSOT)** | — | 서버리스 함수가 런타임에 `process.env`. 로컬은 `env:pull`로 development 값을 받음 |
| GitHub Secrets | CI/CD가 외부 서비스에 인증하는 데 쓰는 값 | — | 워크플로의 `${{ secrets.* }}` |
| `packages/shared/src/constants/` | 환경과 무관한 고정값 | ✅ | 그냥 `import` |

값을 새로 추가할 때는 이 순서로 판단합니다.

1. 환경이 달라져도 값이 같은가 → `packages/shared/src/constants/`
2. 환경마다 다르고, 확장·웹이 같이 쓰는가 → `packages/env/.env.{환경}`
3. 웹 서버에서만 읽고 절대 노출되면 안 되는가 → Vercel 프로젝트 환경변수(세 환경에 같은 값으로 등록, `BUILD_ENV`만 예외)
4. 배포 파이프라인이 외부 서비스에 인증하는 데만 쓰는가 → GitHub Secrets

---

## 전체 목록

어떤 변수가 어디에 등록돼 있어야 하는지의 원천은 [`.github/env-manifest.yml`](../.github/env-manifest.yml)
입니다. 아래 목록은 그 파일에서 생성한 것이라 **손으로 고치지 않습니다.** 값을 추가·삭제·이동하면
매니페스트를 고치고 `node .github/scripts/check-env-manifest.mjs --write`로 갱신합니다.

두 가지가 자동으로 대조합니다.

- **PR CI** (`env-manifest.yml`): 코드·워크플로가 읽는 이름, `.env` 파일의 키, 이 목록이 매니페스트와
  같은지 봅니다. 어긋나면 PR이 실패합니다. 토큰이 필요 없습니다.
- **등록 현황 감사** (`env-registry-audit.yml`): GitHub·Vercel·Supabase에 **실제로 등록된 이름**을
  매니페스트와 대조합니다. 매일 돌아 다르면 Slack으로 알리고, **PR에서도 돌아** 등록이 빠진 값이
  있으면 체크를 실패시킵니다. 코드보다 시크릿을 먼저 등록하는 것은 정상적인 순서라, 매니페스트에 없는
  등록과 선언하지 않은 환경은 경고 주석으로만 남깁니다. 조회 토큰이 없는 저장소는 비교할 수 없으므로
  실패가 아니라 "미조회" 경고입니다. 이름만 비교하므로 **같은 이름이 두 곳에 있을 때 값이
  같은지는 확인하지 못합니다.**
- **Supabase 운영 감사** (`supabase-audit.yml`): 프로젝트와 서비스의 건강 상태, migration,
  Edge Function 배포·최근 오류, secret 이름, Cron·trigger·Database Webhook·Vault key 이름을
  `.github/supabase-audit-manifest.json`과 대조합니다. 정확한 Edge Runtime/Deno 버전은 공식 API에서
  제공하지 않아 관측 불가 경고로 남깁니다. 값·URL·명령·원문 로그는 조회하거나 출력하지 않습니다.

<!-- env-manifest:start -->

### GitHub Secrets (25개)

| 이름 | 없으면 생기는 일 | 읽는 곳 |
| --- | --- | --- |
| `APP_ID` | GitHub App 토큰을 만들지 못해 미사용 파일 정리 PR이 생기지 않고, 등록 현황 감사가 GitHub Secrets를 조회하지 못한다 | `.github/workflows/cleanup-unused.yml`, `.github/workflows/env-registry-audit.yml` |
| `APP_PRIVATE_KEY` | GitHub App 토큰을 만들지 못해 미사용 파일 정리 PR이 생기지 않고, 등록 현황 감사가 GitHub Secrets를 조회하지 못한다 | `.github/workflows/cleanup-unused.yml`, `.github/workflows/env-registry-audit.yml` |
| `CLAUDE_CODE_OAUTH_TOKEN` | 주간 리팩토링 점검과 SEO AI 리포트가 인증에 실패한다. 리팩토링 점검은 노션 카드와 Slack 알림이 오지 않고, SEO는 기존 기계 판정 알림으로 대신한다. 구독 토큰이라 만료·한도 소진으로도 실패한다 | `.github/workflows/refactor-audit.yml`, `.github/workflows/seo-monitor.yml` |
| `CLIENT_ID` | 크롬 웹스토어 API 인증이 실패해 확장 배포와 스토어 현황 조회가 멈춘다 | `.github/workflows/cd-extension.yml`, `.github/workflows/ci.yml`, `.github/workflows/versions.yml` |
| `CLIENT_SECRET` | 크롬 웹스토어 API 인증이 실패해 확장 배포와 스토어 현황 조회가 멈춘다 | `.github/workflows/cd-extension.yml`, `.github/workflows/ci.yml`, `.github/workflows/versions.yml` |
| `EXPO_ANDROID_SERVICE_ACCOUNT_JSON` | Google Play 내부 테스트 제출과 현황 조회가 실패한다 | `.github/workflows/cd-app.yml`, `.github/workflows/ci.yml`, `.github/workflows/versions.yml` |
| `EXPO_ASC_API_KEY_P8` | TestFlight 제출과 App Store 현황 조회가 실패한다 | `.github/workflows/cd-app.yml`, `.github/workflows/ci.yml`, `.github/workflows/versions.yml` |
| `EXPO_TOKEN` | EAS 로그인이 실패해 앱 빌드가 멈춘다 | `.github/workflows/cd-app.yml` |
| `GA_SHEET_ID` (선택) | 주간 GA 수치가 Google Sheets에 쌓이지 않는다(Slack 리포트는 그대로 가고 경고만 남는다) | `.github/workflows/weekly-ga-report.yml` |
| `GA4_SERVICE_ACCOUNT_JSON` | GitHub는 GA 리포트와 SEO Sheets 적재가, Vercel은 관리자 대시보드 활성 사용자 그래프가 동작하지 않는다(연결 없음으로 표시) | `.github/workflows/daily-ga-report.yml`, `.github/workflows/weekly-ga-report.yml`, `.github/workflows/seo-monitor.yml`, `apps/web/src/modules/ga/config.ts` |
| `GSC_SERVICE_ACCOUNT_JSON` (선택) | 없으면 공개 SEO 검사는 계속 실행되지만 Search Console 색인 상태와 주간 검색 성과 조회를 건너뛴다 | `.github/workflows/seo-monitor.yml` |
| `NOTION_TOKEN` | 주간 리팩토링 점검 결과가 노션 작업 카드로 만들어지지 않는다 | `.github/workflows/refactor-audit.yml` |
| `REFRESH_TOKEN` | 크롬 웹스토어 API 인증이 실패해 확장 배포와 스토어 현황 조회가 멈춘다 | `.github/workflows/cd-extension.yml`, `.github/workflows/ci.yml`, `.github/workflows/versions.yml` |
| `SENTRY_AUTH_TOKEN` | Sentry 소스맵 업로드가 조용히 실패한다. 빌드는 통과하므로 스택 트레이스가 난독화된 채 보여야 알게 된다 | `.github/workflows/cd-extension.yml`, `apps/web/next.config.mjs`, `packages/vite-config/lib/withPageConfig.mjs` |
| `SEO_SHEET_ID` (선택) | SEO·GSC 장기 이력이 Google Sheets에 쌓이지 않는다(공개 SEO 검사와 원본 아티팩트는 유지된다) | `.github/workflows/seo-monitor.yml` |
| `SLACK_BOT_TOKEN` | GitHub는 머지 스레드 생성과 댓글이, Vercel은 Slack 배포 모달이 동작하지 않는다 | `.github/workflows/ci.yml`, `apps/web/src/modules/slack/config.ts`, `.github/workflows/seo-monitor.yml` |
| `SLACK_CHANNEL_ID` | 머지 스레드가 생기지 않고 웹훅 알림으로 폴백한다 | `.github/workflows/ci.yml` |
| `SLACK_REPORT_CHANNEL_ID` | SEO AI 리포트를 스레드로 보내지 못하고 기존 기계 판정 알림으로 대신한다. 봇(SLACK_BOT_TOKEN)이 이 채널에 초대돼 있어야 한다 | `.github/workflows/seo-monitor.yml` |
| `SLACK_REPORT_WEBHOOK_URL` | GA 리포트, 주간 리팩토링 점검 결과, 조치가 필요한 SEO 감사 결과가 전용 채널로 게시되지 않는다 | `.github/workflows/daily-ga-report.yml`, `.github/workflows/weekly-ga-report.yml`, `.github/workflows/refactor-audit.yml`, `.github/workflows/seo-monitor.yml` |
| `SLACK_WEBHOOK_URL` | 빌드, 배포, 릴리스 결과와 리포트·Supabase 감사 실패 알림이 오지 않는다 | `.github/workflows/ci.yml`, `.github/workflows/cd-web.yml`, `.github/workflows/daily-ga-report.yml`, `.github/workflows/weekly-ga-report.yml`, `.github/workflows/refactor-audit.yml`, `.github/workflows/notify-release.yml`, `.github/workflows/versions.yml`, `.github/workflows/env-registry-audit.yml`, `.github/workflows/seo-monitor.yml`, `.github/workflows/supabase-audit.yml` |
| `STAGING_WEB_URL_WITHOUT_PROTOCOL` | 스테이징 배포에 alias 도메인이 붙지 않는다 | `.github/workflows/cd-web.yml` |
| `SUPABASE_ACCESS_TOKEN` | 등록 현황 감사가 Supabase secrets를 조회하지 못하고, 운영 감사와 Production 스키마 문서 정합성 검사가 실패한다 | `.github/workflows/env-registry-audit.yml`, `.github/workflows/supabase-audit.yml`, `.github/workflows/supabase-schema.yml` |
| `TURBO_TEAM` | Turborepo 원격 캐시 팀을 못 찾아 CI가 느려진다 | `.github/workflows/ci.yml`, `.github/workflows/cd-extension.yml`, `.github/workflows/cleanup-unused.yml`, `.github/workflows/e2e.yml` |
| `TURBO_TOKEN` | Turborepo 원격 캐시를 못 써 CI가 느려진다 | `.github/workflows/ci.yml`, `.github/workflows/cd-extension.yml`, `.github/workflows/cleanup-unused.yml`, `.github/workflows/e2e.yml` |
| `VERCEL_TOKEN` | vercel pull, build, deploy, alias가 인증에 실패해 웹 배포가 멈추고, e2e가 웹 서버 환경 변수를 받지 못한다 | `.github/workflows/cd-web.yml`, `.github/workflows/e2e.yml`, `.github/workflows/env-registry-audit.yml` |

### Vercel 프로젝트 환경변수 (15개)

| 이름 | 환경 | 없으면 생기는 일 | 읽는 곳 |
| --- | --- | --- | --- |
| `BUILD_ENV` | production, preview | Git 연동 빌드가 development로 구워져 운영에 localhost:3000이 실린다. tsup.config.ts의 가드가 빌드를 실패시켜 막는다 | `packages/env/src/config.ts`, `packages/env/tsup.config.ts`, `apps/web/next.config.mjs`, `packages/zipper/index.ts` |
| `ENABLE_EXPERIMENTAL_COREPACK` | 전체 | corepack이 꺼져 packageManager의 pnpm 버전이 무시된다 | 코드 밖 |
| `GA4_PROPERTY_ID` (선택) | 전체 | 없으면 코드에 적힌 기본 속성 ID로 동작한다 | `apps/web/src/modules/ga/config.ts` |
| `GA4_SERVICE_ACCOUNT_JSON` | 전체 | GitHub는 GA 리포트와 SEO Sheets 적재가, Vercel은 관리자 대시보드 활성 사용자 그래프가 동작하지 않는다(연결 없음으로 표시) | `.github/workflows/daily-ga-report.yml`, `.github/workflows/weekly-ga-report.yml`, `.github/workflows/seo-monitor.yml`, `apps/web/src/modules/ga/config.ts` |
| `GITHUB_DISPATCH_REPOSITORY` (선택) | 전체 | 없으면 guesung/Web-Memo로 동작한다 | `apps/web/src/modules/slack/config.ts` |
| `GITHUB_DISPATCH_TOKEN` | 전체 | Slack에서 release.yml과 versions.yml을 실행하지 못한다 | `apps/web/src/modules/slack/config.ts` |
| `NEXT_PUBLIC_CHANNEL_TALK_PLUGIN_KEY` | 전체 | 채널톡 위젯이 뜨지 않는다 | `apps/web/src/components/ChannelTalk/index.tsx` |
| `OPENAI_API_KEY` | 전체 | AI 기능 전체가 실패한다 | `apps/web/src/app/api/openai/util.ts`, `apps/web/src/app/api/openai/category/route.ts`, `apps/web/src/app/api/openai/webpage-qa/route.ts` |
| `SENTRY_AUTH_TOKEN` | 전체 | Sentry 소스맵 업로드가 조용히 실패한다. 빌드는 통과하므로 스택 트레이스가 난독화된 채 보여야 알게 된다 | `.github/workflows/cd-extension.yml`, `apps/web/next.config.mjs`, `packages/vite-config/lib/withPageConfig.mjs` |
| `SENTRY_WEBHOOK_SECRET` | production | Sentry 웹훅의 서명을 검증하지 못해 에러 알림이 Slack으로 릴레이되지 않는다 | `apps/web/src/modules/sentry/config.ts` |
| `SLACK_BOT_TOKEN` | 전체 | GitHub는 머지 스레드 생성과 댓글이, Vercel은 Slack 배포 모달이 동작하지 않는다 | `.github/workflows/ci.yml`, `apps/web/src/modules/slack/config.ts`, `.github/workflows/seo-monitor.yml` |
| `SLACK_SENTRY_ALERT_CHANNEL` | 전체 | Sentry 알림을 보낼 채널을 몰라 릴레이가 실패한다 | `apps/web/src/modules/sentry/config.ts` |
| `SLACK_SIGNING_SECRET` | 전체 | Slack 요청 서명을 검증하지 못해 배포 버튼과 슬래시 커맨드가 실패한다 | `apps/web/src/modules/slack/config.ts` |
| `UPSTASH_REDIS_REST_TOKEN` | 전체 | OpenAI API 레이트 리밋이 조용히 꺼진다 | `apps/web/src/app/api/openai/ratelimit.ts` |
| `UPSTASH_REDIS_REST_URL` | 전체 | OpenAI API 레이트 리밋이 조용히 꺼진다 | `apps/web/src/app/api/openai/ratelimit.ts` |

### Supabase Edge Function secrets (5개)

| 이름 | 없으면 생기는 일 | 읽는 곳 |
| --- | --- | --- |
| `CRON_SECRET` | DB 트리거가 부르는 함수의 호출자 확인이 실패해 가입 메일과 가입 알림이 401로 끝난다 | `packages/supabase-edge-functions/supabase/functions/send-welcome-email/index.ts`, `packages/supabase-edge-functions/supabase/functions/send-signup-slack-notification/index.ts` |
| `RESEND_API_KEY` | 가입 안내 메일이 발송되지 않는다 | `packages/supabase-edge-functions/supabase/functions/send-welcome-email/index.ts` |
| `SLACK_FEEDBACK_WEBHOOK_URL` | 피드백 Slack 알림이 오지 않는다 | `packages/supabase-edge-functions/supabase/functions/send-feedback/index.ts` |
| `SLACK_SIGNUP_WEBHOOK_URL` | 신규 가입 Slack 알림이 오지 않는다. 함수가 예외를 던지고 로그에만 남는다 | `packages/supabase-edge-functions/supabase/functions/send-signup-slack-notification/index.ts` |
| `WEB_URL` | envpkg는 없으면 모듈 로드 즉시 실패하고, Supabase는 피드백 알림에서 관리자 링크 줄만 빠진다 | `packages/env/src/config.ts`, `packages/supabase-edge-functions/supabase/functions/send-feedback/index.ts` |

### `packages/env/.env.{환경}` (1개)

| 이름 | 없으면 생기는 일 | 읽는 곳 |
| --- | --- | --- |
| `WEB_URL` | envpkg는 없으면 모듈 로드 즉시 실패하고, Supabase는 피드백 알림에서 관리자 링크 줄만 빠진다 | `packages/env/src/config.ts`, `packages/supabase-edge-functions/supabase/functions/send-feedback/index.ts` |

### 플랫폼이 주입하는 값 (등록하지 않음)

| 이름 | 주입하는 곳 | 읽는 곳 |
| --- | --- | --- |
| `__DEV__` | 확장 개발 모드 스위치. packages/vite-config가 넣는다 | `packages/vite-config/lib/env.mjs` |
| `__FIREFOX__` | Firefox 빌드 스크립트가 넣는 분기 스위치 | `apps/chrome-extension/utils/plugins/make-manifest-plugin.ts` |
| `CI` | GitHub Actions가 자동으로 넣는다. Playwright의 재시도와 서버 재사용 정책을 가른다 | `e2e/playwright.config.ts` |
| `GITHUB_REF_NAME` | GitHub Actions가 넣는다. Vercel 값이 없을 때의 폴백으로 읽는다 | `apps/web/src/app/api/version/route.ts` |
| `GITHUB_SHA` | GitHub Actions가 넣는다. Vercel 값이 없을 때의 폴백으로 읽는다 | `apps/web/src/app/api/version/route.ts` |
| `NEXT_RUNTIME` | Next.js가 실행 런타임(nodejs, edge)을 넣는다 | `apps/web/src/instrumentation.ts` |
| `NODE_ENV` | Next와 Vite 같은 툴체인이 자기 값으로 채운다. 환경 구분에는 쓰지 않고 BUILD_ENV를 쓴다 | `apps/chrome-extension/vite.config.mts` |
| `PW_CHROMIUM_ATTACH_TO_OTHER` | Playwright가 넣는 내부 플래그 | `e2e/tests/fixtures.ts` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase가 Edge Function에 주입한다. Vercel에는 등록하지 않는다 | `packages/supabase-edge-functions/supabase/functions/kakao-auth/index.ts` |
| `SUPABASE_URL` | Supabase가 Edge Function에 주입한다 | `packages/supabase-edge-functions/supabase/functions/kakao-auth/index.ts` |
| `VERCEL` | Vercel 빌드와 런타임이 넣는다 | `apps/web/src/modules/slack/afterResponse.ts`, `packages/env/tsup.config.ts` |
| `VERCEL_ENV` | Vercel이 배포 환경(production, preview, development)을 넣는다 | `apps/web/src/app/api/version/route.ts` |
| `VERCEL_GIT_COMMIT_REF` | Vercel이 넣는다 | `apps/web/src/app/api/version/route.ts` |
| `VERCEL_GIT_COMMIT_SHA` | Vercel이 넣는다 | `apps/web/src/app/api/version/route.ts` |

<!-- env-manifest:end -->

---

## 1. `packages/env` — 확장·웹이 공유하는 환경별 값

현재 파일에 담긴 값은 `WEB_URL` 하나뿐입니다.

| 키 | development | staging | production |
| --- | --- | --- | --- |
| `WEB_URL` | `http://localhost:3000` | `https://staging.webmemo.xyz` | `https://www.webmemo.xyz` |

여기에 더해 `tsup`이 셸 `BUILD_ENV`를 번들에 함께 인라인하므로, 코드에서는
`CONFIG.buildEnv`로 `"development" | "staging" | "production"`을 읽을 수 있습니다.

`CONFIG.webDisplayHost`는 `webUrl`에서 프로토콜과 `www.`를 뗀 값(`webmemo.xyz`)입니다.
주소창 목업이나 안내 문구처럼 **사용자에게 도메인만 보여주는 자리**에서 씁니다.
파생값이라 원천은 여전히 `WEB_URL` 하나입니다.

**origin이 일치해야 하는 값에는 `webUrl`을 그대로 쓰세요.** 확장 매니페스트의
`externally_connectable`처럼 `www`가 빠지면 조용히 죽는 자리가 있습니다(아래 참고).

`packages/env/src/config.ts`가 이 값을 읽어 `CONFIG` 객체로 내보내고, 소비하는 쪽은
`import { CONFIG } from "@web-memo/env"`로 씁니다. `getSafeConfig`가 `undefined`를
막으므로, 값이 빠지면 모듈이 로드되는 즉시 `WEB_URL이 설정되지 않았습니다` 형태로
터집니다. 빈 문자열이 조용히 흘러다니지 않습니다.

### 도메인을 바꿀 때 레포 밖에서 함께 해야 하는 것

`WEB_URL`은 레포 안의 여러 값을 끌고 다닙니다. 확장 매니페스트의
`externally_connectable`, 웹의 `metadataBase`·canonical·`alternates`,
`robots.txt`·`sitemap.xml`, 그리고 `translation.json`의 `{{webDisplayHost}}` 보간이 모두
이 값에서 나옵니다.

**레포에서 도메인이 하드코딩된 곳은 `apps/app/.../_constants/webApi.ts` 하나뿐입니다.**
Expo는 `EXPO_PUBLIC_` 접두사가 없는 환경변수를 번들에 인라인하지 않아 이 앱만
`@web-memo/env`를 읽지 못합니다. 도메인을 바꾸면 여기도 함께 고쳐야 합니다.

레포 쪽은 그 둘이 전부고, 아래는 콘솔에서 직접 해야 하며 빠뜨리면 **에러 없이
로그인·연동만 조용히 죽습니다.**

| 대상 | 해야 하는 것 |
| --- | --- |
| Vercel | 프로젝트에 도메인 연결 + DNS. 프로덕션은 `www.webmemo.xyz`, 스테이징 alias는 `staging.webmemo.xyz` |
| GitHub Secrets | `STAGING_WEB_URL_WITHOUT_PROTOCOL`을 새 스테이징 도메인으로 (`cd-web.yml`의 alias) |
| Supabase Auth | URL Configuration → Site URL을 `https://www.webmemo.xyz`로, Redirect URLs에 `https://www.webmemo.xyz/**`와 `https://staging.webmemo.xyz/**` 추가 |
| Slack 앱 | Interactivity·슬래시 커맨드 Request URL (`docs/release-flow.md` 참고) |

**Google·Kakao·Apple 개발자 콘솔은 건드릴 것이 없습니다.** 로그인은
`signInWithOAuth`로 Supabase를 거치므로, 각 제공자에 등록된 리디렉션 URI는
Supabase의 `/auth/v1/callback`이지 우리 도메인이 아닙니다. 우리 도메인이 들어가는
곳은 `redirectTo`로 넘기는 `${CONFIG.webUrl}/auth/callback` 하나뿐이고, 그것은
Supabase의 **Redirect URLs 허용 목록**에서 검사합니다. 거기에 새 도메인이 없으면
로그인이 콜백에서 튕깁니다.

세션 쿠키는 `domain` 없이 심겨 서빙 호스트에만 붙고, 확장은
`chrome.cookies.get({ url: CONFIG.webUrl })`로 같은 호스트에서 읽습니다. `WEB_URL`이
실제 서빙 호스트여야 하는 이유가 여기에도 걸립니다.

**`WEB_URL`에는 리다이렉트 호스트가 아니라 실제로 응답하는 호스트를 적습니다.**
`webmemo.xyz`(apex)는 Vercel에서 `www.webmemo.xyz`로 308 리다이렉트만 하므로
`WEB_URL`은 `https://www.webmemo.xyz`입니다. apex를 적으면 확장 매니페스트의
`externally_connectable`이 `https://webmemo.xyz/*`가 되는데, **크롬 match 패턴은
`webmemo.xyz`와 `www.webmemo.xyz`를 같은 호스트로 보지 않습니다.** 사용자는 항상
www에 도착하므로 `chrome.runtime`이 주입되지 않고, 웹↔확장 연동이 에러 없이
`isExtension()` false 경로로 새 버립니다. 리다이렉트가 걸려 있어 브라우저로 열어
보면 멀쩡해 보이는 것이 이 실패의 고약한 점입니다.

반대로 **사용자에게 보여주는 문구·주소창 목업에는 `www`를 뗀 `webmemo.xyz`를 씁니다.**
apex도 리다이렉트로 살아 있어 눌러도 도달하고, 브랜드로 읽히는 쪽은 짧은 이름입니다.
기능용(origin이 일치해야 하는 값)과 표시용(사람이 읽는 값)이 다르다는 것만 기억하면
됩니다.

**옛 도메인은 한동안 살려 둡니다.** 크롬 웹 스토어에 이미 게시된 확장은 옛
`externally_connectable`을 들고 있어, 사용자가 새 버전으로 갱신되기 전까지는 옛
도메인으로만 웹↔확장 연동이 됩니다.

### 환경별 파일을 커밋하는 이유

담기는 값이 웹 URL뿐이라 감출 것이 없습니다. 커밋해두면 클론 직후
바로 빌드되고, 값이 시크릿 안에 숨지 않아 히스토리로 추적할 수 있습니다.

`.gitignore`는 `.env*`를 무시한 뒤 이 세 파일만 부정 패턴으로 되살립니다. 이때
**패턴에 슬래시를 붙여 `/packages/env/`로 한정**한 것이 중요합니다. 슬래시가 없으면
경로 제한이 사라져 `apps/web/.env.production` 같은 동명 파일까지 추적 대상이 됩니다.

### 빌드 대상은 셸 `BUILD_ENV`로 고릅니다

```bash
BUILD_ENV=production pnpm build      # .env.production
BUILD_ENV=staging    pnpm build      # .env.staging
pnpm dev                             # .env.development (기본값)
```

`packages/env/tsup.config.ts`가 `BUILD_ENV`로 파일을 고른 뒤, 추적되지 않는
`packages/env/.env`를 그 위에 덮어씁니다. 로컬 오버라이드는 일부 키만 적어도
됩니다. 단 `BUILD_ENV`는 셸 값이 항상 이깁니다 — `.env` 안에 적어도 파일 선택은
이미 끝난 뒤라, 파일 내용으로 분기를 뒤집는 착각을 막기 위해 마지막에 덮어씁니다.

`packages/env/turbo.json`의 `ready` 태스크가 `env: ["BUILD_ENV"]`를 선언하므로
환경별로 캐시가 갈립니다. 이게 없으면 staging 빌드가 production 캐시를 재사용합니다.

**Vercel Git 연동 빌드(프리뷰, 대시보드의 수동 재배포)에는 셸 `BUILD_ENV`가 없습니다.**
GitHub Actions의 `cd-web.yml`은 배포 대상에 맞춰 `BUILD_ENV`를 넣지만, Git 연동 빌드는 그
워크플로를 거치지 않습니다. (`master`·`develop` 푸시의 자동 배포는 `vercel.json`의
`git.deploymentEnabled`로 꺼 두었습니다. 상용 배포는 Slack 버튼 → `release.yml` 한 경로입니다.
[release-flow.md](release-flow.md) 참고.) 그래서 Vercel 프로젝트 환경변수에 `BUILD_ENV`를 직접 등록해 둡니다
(Production = `production`, Preview = `staging`, [3절](#3-vercel-프로젝트-환경변수--배포된-웹의-런타임-값) 참고).
빠지면 `development`로 구워져 운영 사이트의 랜딩 주소창 목업·sitemap·canonical이
전부 `localhost:3000`이 되는데, 에러 없이 배포가 성공하므로 사용자가 먼저 발견합니다.
`tsup.config.ts`는 `VERCEL`이 설정된 빌드에서 `BUILD_ENV`가 없으면 빌드를 실패시켜
이 조용한 실패를 배포 전에 드러냅니다.

> ⚠️ **분기 기준이 셸 변수라는 점이 중요합니다.**
> 예전에는 `NODE_ENV`로 파일을 골랐는데, CI가 그 값을 `.env` 파일 *안에* 써넣었습니다.
> 파일 선택은 파일을 읽기 전에 끝나므로 파일 안의 값으로는 분기를 뒤집을 수 없고,
> 결과적으로 `.env.production`이 한 번도 선택되지 않는 유령 파일이 됐습니다.

### 환경 분기는 `CONFIG.buildEnv` 하나로 합니다

`isProduction()`이 Sentry·Analytics 활성화와 쿠키 `secure` 플래그를 좌우하는데,
스테이징에서도 운영과 같은 동작을 확인해야 하므로 **개발만 제외**하는 정의입니다.

```ts
export const isProduction = () => CONFIG.buildEnv !== "development";
```

> 예전에는 이 판단을 `NODE_ENV`로 했고, 그래서 `.env.staging`에 `NODE_ENV=production`을
> 적어야 했습니다. 그러면 staging과 production이 코드에서 **같은 값**이 되어 구분할
> 수단이 사라집니다. 실제로 `config.ts`의 타입에는 `"staging"`이 있었지만 어떤 `.env`
> 파일에도 그 값이 없어, 런타임에 도달할 수 없는 타입이었습니다.
>
> 이름도 겹쳤습니다. `NODE_ENV`는 Next·Vite가 자기 값으로 치환하는 이름이라, 같은
> 식별자에 공급처가 둘이었습니다. `BUILD_ENV`로 바꾸면서 이 충돌도 사라졌습니다.
> 툴체인이 쓰는 `process.env.NODE_ENV`(`next.config.mjs`의 `removeConsole` 등)는
> 그대로 두면 됩니다 — `packages/env`와 무관하게 각 도구가 알아서 넣습니다.

### ⚠️ 여기 값은 공개됩니다

`config.ts`가 참조하는 키는 `tsup`이 번들에 인라인하므로 확장·웹 클라이언트에
그대로 실립니다. **서버 시크릿을 여기 추가하지 마세요.** 비밀이 필요하면
Vercel 프로젝트 환경변수에 두고 서버에서만 읽습니다.

---

## 2. 웹 전용 서버 시크릿 — Vercel이 원천, 로컬은 pull

웹의 서버 시크릿(`OPENAI_API_KEY`, `UPSTASH_*`, `GA4_SERVICE_ACCOUNT_JSON`, Slack·GitHub 토큰 등)은
**Vercel 프로젝트 환경변수가 유일한 원천**입니다. 로컬 파일을 따로 관리하지 않습니다. 키 목록과 용도는 위
[전체 목록](#전체-목록)의 Vercel 표가 원천입니다. `GA4_PROPERTY_ID`는 비밀이 아니고 기본값이 코드에 있어
**선택**입니다.

로컬에서 실행할 때는 development 환경 값을 받아 씁니다.

```bash
vercel link                          # 최초 1회, 저장소 루트에서 (프로젝트 web-memo, 스코프 gueit214s-projects)
pnpm env:pull                        # 저장소 루트에서 실행. apps/web/.env.local 생성 (gitignore 대상)
```

- **웹 값은 세 환경(production·preview·development)에 같은 값으로 등록합니다.** 예외는 둘입니다.
  - `BUILD_ENV`: 값이 환경마다 달라야 합니다(production은 `production`, preview는 `staging`, development는 등록하지 않음).
  - `SENTRY_WEBHOOK_SECRET`: production에만 둡니다. Sentry Internal Integration의 Client Secret은 생성할 때
    한 번만 표시돼 다른 환경에 같은 값을 복사할 수 없습니다. 통일하려면 시크릿을 회전하고 세 환경에 새 값을
    등록해야 하는데, 운영에 새 값을 등록하고 재배포하기 전까지 웹훅 서명 검증이 실패해 에러 알림이 끊기므로
    지금은 운영 전용으로 둡니다.

  매니페스트에서는 `stores: [vercel]`이 세 환경 모두라는 뜻이고, 예외만 `vercel:<환경>`으로 적습니다.
- **development 값은 프로젝트 접근 권한이 있는 사람이 읽을 수 있습니다.** production·preview 값은 sensitive라
  pull로 받을 수 없지만, Vercel은 development 대상을 sensitive로 만들 수 없기 때문입니다. 세 환경을 같게
  두면 production 값도 development 등록본으로 읽을 수 있다는 뜻이니 접근 권한 범위를 그렇게 다루세요.
- **`GA4_SERVICE_ACCOUNT_JSON`은** 서비스 계정 키 JSON 전문을 한 줄로 넣습니다. 같은 이름의 값이
  GitHub Secrets에도 있지만(§5, `daily-ga-report.yml`이 읽습니다) 서로 다른 곳이라 **양쪽에 각각
  등록해야 합니다.** 값이 없으면 실패하지 않고 `/api/admin/ga/active-users`가 `connected: false`를
  돌려주며, 대시보드는 그래프 대신 "연결 없음"을 그립니다.
- **e2e도 같은 방식입니다.** `e2e.yml`이 `VERCEL_TOKEN`으로 development 값을 받아
  `apps/web/.env.local`에 씁니다(토큰이 없으면 경고만 하고 넘어갑니다).

웹은 공유 `.env`(`packages/env`)를 읽지 않습니다. `process.env`로 직접 읽는 값이 전부 웹 전용이고,
공유 값 `WEB_URL`은 `packages/env`가 인라인한 `CONFIG.webUrl`로 받기 때문입니다.

---

## 3. Vercel 프로젝트 환경변수 — 배포된 웹의 런타임 값

배포된 서버리스 함수는 런타임에 `process.env`를 읽습니다. 그 값을 실제로 공급하는
것은 Vercel 프로젝트 설정 하나뿐이고, 워크플로는 `vercel pull`로 그것을 받아옵니다.

등록해야 하는 값과 환경별 등록 범위, 빠졌을 때의 영향은 위 [전체 목록](#전체-목록)의
Vercel 표가 원천입니다. 변경은 Vercel 대시보드나 `vercel env` CLI로 합니다.

`ENABLE_EXPERIMENTAL_COREPACK`은 코드가 읽는 값이 아니라 Vercel 빌드 시스템이 보는
플래그입니다. 코드에서 grep해도 나오지 않으므로 "안 쓰는 값"으로 오인하기 쉽지만,
루트 `package.json`의 `packageManager` 필드를 따르게 하는 값이라 지우면 빌드가 쓰는
pnpm 버전이 바뀝니다.

### 여기에 등록하지 않는 값

Supabase URL·anon key, Sentry DSN, `WEB_URL`은 **Vercel에 두지 않습니다.** 각각
`packages/shared`의 상수와 `packages/env`의 커밋된 `.env` 파일에서 옵니다. Vercel에
같은 이름으로 등록해도 코드가 읽지 않으므로 값만 두 곳으로 갈라져 혼란을 만듭니다.

> 실제로 이 이름들이 리팩토링 이후에도 Vercel에 남아 있다가 2026-08-23에 정리됐습니다
> (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL`,
> `SUPABASE_ANON_KEY`, `SENTRY_DSN`, `WEB_URL`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`,
> `GOOGLE_PRIVATE_KEY`, `MAKE_WEBHOOK_NOTION_API` 9개).
> **코드에서 `process.env` 참조를 지울 때 Vercel 쪽 값도 같이 지워야 합니다.**
> 남겨둬도 빌드가 깨지지 않아 몇 년이든 방치됩니다.

현황 확인은 아래로 합니다. 값은 암호화돼 있어 이름·환경만 보입니다.

```bash
vercel link                      # 최초 1회
vercel env ls production
```

### 셸 환경 변수로 덧씌우지 않습니다

과거 `cd-web.yml`은 `OPENAI_API_KEY`를 세 경로로 주고 있었습니다 — `vercel pull`,
`apps/web/.env`에 `echo`(지금은 이 방식을 쓰지 않습니다), `vercel build` 스텝의 셸 `env`. 뒤의 둘은 빌드 시점에만
존재해 런타임에 아무 역할도 하지 않습니다.

무해하지도 않았습니다. GitHub Secrets에 **등록되지 않은 이름**을 셸로 넘기면 빈
문자열이 들어가고, 그것이 `vercel pull`로 받아온 실제 값을 덮어씁니다. 소스맵
업로드는 실패해도 빌드가 통과하므로 드러나지 않습니다.

### `vercel pull`과 `vercel build`의 환경은 짝을 맞춰야 합니다

```yaml
vercel pull  --environment=production   # production 배포일 때
vercel build --prod
```

staging은 `--prod` 없이 빌드해 Preview로 나가므로 `--environment=preview`를 씁니다.
`--environment`를 비우면 **기본값인 Development 값을 받아**, Production에만 등록된
값이 빠진 채로 빌드와 배포가 그냥 성공합니다.

---

## 4. `packages/shared/src/constants/` — 환경과 무관한 고정값

Supabase URL·anon key, Sentry DSN, GA/GTM ID, OAuth 클라이언트 ID는 환경이 달라져도
값이 같습니다. 어차피 번들에 인라인되어 공개되므로 상수로 두는 편이 관리 지점을
줄입니다.

| 파일 | 담는 값 |
| --- | --- |
| `Supabase.ts` | 프로젝트 URL, anon key, auth 토큰 키, 스키마·테이블 이름 |
| `Sentry.ts` | 확장용 DSN, 웹용 DSN |
| `Analytics.ts` | GA measurement ID, GTM ID, GA API secret |
| `OAuth.ts` | Google 웹·앱 클라이언트 ID |
| `Url.ts` | 웹 도메인, 가이드·스토어·소셜 링크 |

Supabase anon key는 이름 그대로 익명 키이고, 접근 제어는 RLS 정책이 담당합니다.
서버 권한이 필요한 작업은 Edge Functions에서 service role 키로 처리합니다.

`ANALYTICS.gaApiSecret`은 본래 서버 시크릿의 성격이지만, 확장이 GA4 Measurement
Protocol로 직접 이벤트를 보내는 현재 구조상 이미 번들에 인라인되어 공개돼 있습니다.
환경 변수에 두면 시크릿처럼 보이지만 실제로는 아니어서, 있는 그대로 드러내려고
상수에 뒀습니다. 서버 프록시로 옮기는 것은 후속 과제입니다.

---

## 5. GitHub Secrets

배포 파이프라인이 외부 서비스에 인증할 때만 씁니다. 애플리케이션 코드가 읽는 값은
하나도 없습니다.

등록된 목록과 용도는 위 [전체 목록](#전체-목록)의 GitHub Secrets 표가 원천이고,
실제 등록 상태는 `gh secret list -R guesung/Web-Memo`나 스케줄 감사(`env-registry-audit.yml`)로
확인합니다.

같은 이름이 Vercel에도 있는 `SLACK_BOT_TOKEN`은 Vercel 환경변수와 같은 값(`chat:write` 스코프)이지만
서로 읽지 못하므로 따로 등록합니다. `SLACK_CHANNEL_ID`는 웹훅 URL에서 얻을 수 없어 채널 ID를 직접 넣습니다.

감사 워크플로가 GitHub Secrets 목록을 읽으려면 `GITHUB_TOKEN`으로는 부족합니다. 이미 `cleanup-unused.yml`이
쓰는 GitHub App(`APP_ID`, `APP_PRIVATE_KEY`)에 **Secrets: read** 권한을 주고, Supabase는 대시보드에서 발급한
토큰을 `SUPABASE_ACCESS_TOKEN`으로 등록해야 합니다. 없으면 해당 저장소만 "미조회"로 남습니다.

`GITHUB_TOKEN`은 GitHub Actions가 자동으로 제공하므로 등록하지 않습니다.

`refactor-audit.yml`(주간 리팩토링 점검)은 시크릿을 둘 더 읽습니다.
- `CLAUDE_CODE_OAUTH_TOKEN`은 API 키가 아니라 **Claude Code 구독 토큰**입니다. 로컬에서 `claude setup-token`으로
  발급합니다. 구독 한도를 다른 작업과 나눠 쓰고 토큰에 만료가 있어서, 한도 소진이나 만료로 점검이 실패할 수
  있습니다. 실패는 `SLACK_WEBHOOK_URL` 채널로 옵니다.
- `NOTION_TOKEN`은 노션 내부 통합의 시크릿입니다. 통합을 만든 뒤 **개인 업무 로그 DB를 그 통합에 공유**해야
  카드가 만들어집니다. DB ID(`5f408e05-0015-4532-bcd8-bd36439bec5a`)는 비밀이 아니라 워크플로에 값을 그대로 적었습니다.
- 시크릿과 별개로 **Claude GitHub App(https://github.com/apps/claude)이 이 레포에 설치**돼 있어야 합니다.
  액션이 OIDC 토큰을 App 토큰으로 교환하는데, 설치돼 있지 않으면 매주 실패 알림만 옵니다.
- 두 값을 등록하기 전에 머지하면 등록 현황 감사가 PR 체크를 실패시킵니다. 등록한 뒤 머지합니다.

두 Slack 웹훅은 채널이 다릅니다. `SLACK_WEBHOOK_URL`은 빌드·배포·릴리스 결과가 가는
기존 CI 채널이고, `SLACK_REPORT_WEBHOOK_URL`은 GA 리포트와 주간 리팩토링 점검 결과만 가는 전용 채널입니다.
성격이 달라 나눴습니다 — 리포트가 매일 쌓이면 즉시 봐야 하는 배포 실패 알림을 밀어냅니다.
**다만 `daily-ga-report.yml`의 실패 알림은 일부러 `SLACK_WEBHOOK_URL`로 보냅니다.**
리포트 채널 웹훅 자체가 죽으면 실패 알림도 같이 침묵하기 때문에, 경로를 갈라 둔 것입니다.

`GA4_PROPERTY_ID`는 시크릿이 아니라 `daily-ga-report.yml`에 값을 그대로 적습니다(`471860782`).
비밀이 아니고, 시크릿으로 두면 값이 안 보여 디버깅만 어려워집니다.
GA4 콘솔 → 관리 → 속성 설정 상단의 **숫자** 속성 ID이며,
`packages/shared/src/constants/Analytics.ts`의 `G-6HHNP7KJM5`는 측정 ID라 Data API에 넣으면 403/404가 납니다.

`GA_SHEET_ID`는 GA·SEO 장기 이력을 같이 쌓는 Google Sheets URL의 `/d/`와 `/edit`
사이 ID입니다. 스프레드시트를 `GA4_SERVICE_ACCOUNT_JSON`의 `client_email`에 편집자로
공유하고, 해당 서비스 계정의 GCP 프로젝트에서 Google Sheets API를 켜야 합니다.
탭은 없으면 스크립트가 만듭니다. 동일한 실행 ID와 시도 번호로 적재를 재시도하면
기존 행을 갱신하고, GitHub Actions에서 재실행하여 시도 번호가 바뀌면 새 행을 남깁니다.
값이 없으면 원본 Actions 아티팩트는 남기고 Sheets 적재만 건너뜁니다.

### `SENTRY_AUTH_TOKEN`은 확장과 웹이 서로 다른 경로로 받습니다

같은 이름이지만 공급처가 둘로 갈립니다.

- **확장**: `cd-extension.yml`의 Build 스텝이 `${{ secrets.SENTRY_AUTH_TOKEN }}`을
  셸 환경 변수로 넘깁니다. → GitHub Secrets에 등록
- **웹**: 셸로 받지 않고 `vercel pull`이 가져오는 Vercel 프로젝트 환경변수에
  의존합니다. → Vercel 프로젝트 환경변수(Production·Preview)에 등록

둘 다 2026-08-23에 등록을 마쳤습니다.

그래서 **양쪽 모두에 등록해야** 소스맵이 올라갑니다. 한쪽만 있으면 그쪽만 동작하고
다른 쪽은 조용히 실패합니다. 소스맵 업로드는 실패해도 빌드가 통과하므로 드러나지
않습니다. Sentry에서 스택 트레이스가 난독화된 채로 보이면 이 값부터 확인하세요.

### 그 밖의 주의점

- **`WEB_ENV_FILE`은 없앴습니다.** e2e가 `apps/web/.env`를 이 시크릿으로 복원하던 방식을
  `vercel env pull`(development)로 바꿨고, GitHub 시크릿도 삭제했습니다(2026-09-20). 값을 읽을 수 없어
  삭제하면 되살릴 수 없으니, 비슷한 시크릿을 지울 때는 그 시크릿을 읽는 워크플로가 `master`에서 사라진 뒤에
  지웁니다.
- **앱 서명 키는 시크릿에 없습니다.** EAS 서버에 등록된 것을 받아 쓰므로 러너에
  별도 시크릿이 필요 없습니다.
- 재사용 워크플로는 `secrets: inherit`으로 호출자의 시크릿을 물려받습니다.
- `PROD_WEB_URL`·`STAGING_WEB_URL`은 환경별 `.env` 파일을 커밋하면서 필요 없어져
  제거됐습니다. alias용 `STAGING_WEB_URL_WITHOUT_PROTOCOL`은 그대로 씁니다.

---

## 6. 그 외

### 앱 (`apps/app`)

앱은 환경 변수를 쓰지 않습니다. 필요한 값(웹 URL, Supabase, Google OAuth 클라이언트
ID)이 전부 고정값이라 상수만 읽습니다. 앱에는 스테이징 배포 경로가 없어 웹 URL도
항상 운영 도메인을 바라봅니다.

그래서 앱 빌드에는 `.env`도 `packages/env/dist`도 필요하지 않습니다. `dist`가
gitignore 대상이라 EAS 샌드박스에 복사되지 않아 iOS 빌드가 깨지던 제약 자체가
앱에서는 사라졌습니다.

### Supabase Edge Functions

`packages/supabase-edge-functions`는 Supabase 플랫폼이 주입하는 예약 변수를
`Deno.env.get()`으로 읽습니다. 우리가 등록하는 값이 아닙니다.

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

그 밖에 우리가 `supabase secrets set <이름>=<값>`으로 직접 등록하는 값은 위 [전체 목록](#전체-목록)의
Supabase 표가 원천입니다. 레포에도 `.env`에도 두지 않습니다. `CRON_SECRET`은 DB에서 함수를 부를 때의
호출자 확인에 쓰며 Vault의 `cron_secret`과 같은 값이어야 합니다.

`send-welcome-email`과 `send-signup-slack-notification`은 JWT 검증을 끄고
(`--no-verify-jwt`) 배포하며, 호출자는 `x-cron-secret` 헤더로 확인합니다. 두 함수
모두 같은 `memo.send_welcome_email()` 트리거가 부르므로 이 헤더와 호출 주소를
Vault의 `cron_secret`·`project_url`에서 읽어 `daily-article-reminder`와 같은 두
값을 공유합니다. 새로 넣을 DB 설정은 없습니다.

### 빌드 플래그

값이라기보다 분기 스위치입니다.

| 이름 | 의미 | 설정하는 곳 |
| --- | --- | --- |
| `BUILD_ENV` | `.env.{환경}` 선택 + `CONFIG.buildEnv`로 번들에 인라인 | 셸 / 워크플로 `env` |
| `__FIREFOX__` | Firefox 전용 빌드 (manifest 분기) | 빌드 스크립트 |
| `__DEV__` | 확장 개발 모드 (HMR·소스맵) | `packages/vite-config` |
| `CI` | Playwright의 재시도·서버 재사용 정책 분기 | GitHub Actions 자동 주입 |

---

## 7. 로컬 셋업

```bash
# 1. 웹 서버 시크릿 (웹의 AI 기능 등을 로컬에서 쓸 때만 필요). Vercel이 원천이라 pull로 받습니다
vercel link                          # 최초 1회, 저장소 루트에서
pnpm env:pull                        # 저장소 루트에서 실행. apps/web/.env.local 생성

# 2. 공유 환경별 값은 이미 커밋되어 있으므로 아무것도 하지 않아도 됩니다
#    로컬에서만 다른 값을 쓰고 싶을 때 오버라이드 파일을 만듭니다
echo 'WEB_URL=http://localhost:4000' > packages/env/.env

# 3. 개발 서버
pnpm dev
```

확장만 개발한다면 1번은 건너뛰어도 됩니다. 확장이 읽는 값은 전부 커밋된 파일과
상수에 있습니다.
