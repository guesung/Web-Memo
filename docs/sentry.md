# Sentry 설정 현황

코드만 봐서는 알 수 없는, **Sentry 대시보드에만 있는 설정**을 적습니다. SDK 초기화·보고
코드는 레포가 원천이고, 이 문서는 그 코드가 기대는 대시보드 쪽 상태를 기록합니다.
대시보드에서 설정을 바꾸면 이 문서를 같은 날 고칩니다.

## 프로젝트 두 개

조직은 `guesung`이고, 확장과 웹이 **서로 다른 프로젝트**로 보냅니다. DSN은
`packages/shared/src/constants/SentryDsn.ts`의 `SENTRY` 상수가 갖습니다.

| 프로젝트 | ID | DSN 상수 | 보내는 곳 | 소스맵 업로드 |
| --- | --- | --- | --- | --- |
| `web-memo` | 4507931952807936 | `SENTRY.dsnExtension` | 확장: side-panel·options(`initSentry`), content-ui(수동 클라이언트) | `packages/vite-config/lib/withPageConfig.mjs`의 `sentryVitePlugin` |
| `web-memo-web` | 4508674167406592 | `SENTRY.dsnWeb` | 웹: 브라우저(`instrumentation-client.ts`), 서버·Edge(`sentry.{server,edge}.config.js`) | `apps/web/next.config.mjs`의 `withSentryConfig` |

- 이슈가 안 보이면 **프로젝트부터 확인합니다.** 확장 코드가 웹 DSN으로 보내면(또는 반대) 다른
  프로젝트에 쌓입니다. `packages/shared`의 `initSentry`는 `isExtension()`으로 DSN을 고릅니다.
- content-ui는 `Sentry.init()`을 쓸 수 없습니다. SDK가 content script(일반 웹 페이지 +
  `chrome.runtime.id`)를 감지하면 `enabled: false`로 꺼 버리기 때문입니다
  (`@sentry/browser` `utils/detectBrowserExtension.js`). 전역 핸들러 없는 `BrowserClient`를 따로 만들어
  하이라이트 기능의 실패만 보고합니다.
- 소스맵 업로드 토큰(`SENTRY_AUTH_TOKEN`)의 공급 경로는
  [environment-variables.md](environment-variables.md#sentry_auth_token은-확장과-웹이-서로-다른-경로로-받습니다)를 봅니다.

## 인바운드 필터

| 프로젝트 | 필터 | 상태 | 이유 |
| --- | --- | --- | --- |
| `web-memo` | Filter out errors known to be caused by browser extensions | **꺼짐** (2026-09-20) | 스택 프레임이 `chrome-extension://…`인 오류를 버리는 필터라, 우리 확장 코드의 오류가 거의 다 걸러졌습니다(30일 오류 106건 중 86건) |
| `web-memo-web` | — | 미확인 | 기록된 변경이 없습니다 |

- 필터는 **수집 서버가 접수한 뒤** 버립니다. 클라이언트 요청은 200이고 오류도 없어서, 원인은
  Stats의 **Filtered** 칸에서만 드러납니다. 이슈가 안 생기면 Stats에서 Filtered·Client Discard
  사유부터 봅니다.
- 필터 설정은 반영까지 몇 분 걸립니다. 끈 직후 보낸 테스트 이벤트는 여전히 걸러질 수 있습니다.
- 확장 오류 경로를 직접 요청으로 시험할 때 프레임 경로를 `app:///…`로 만들면 이 필터를 우연히
  피해 거짓 양성이 납니다. 실제와 같은 `chrome-extension://<id>/…`를 씁니다.

## 알림: Internal Integration 웹훅 → Slack

Slack 알림은 Sentry 유료 플랜 기능이라, 무료로 쓸 수 있는 **Internal Integration 웹훅**을 받아 기존
Slack 봇으로 릴레이합니다.

| 항목 | 값 |
| --- | --- |
| 위치 | Settings → Developer Settings → Internal Integration |
| Webhook URL | `https://<프로덕션 도메인>/api/sentry-webhook` (`apps/web/src/app/api/sentry-webhook/route.ts`) |
| 구독 리소스 | `issue` — `error` 리소스는 Business 플랜 이상 전용이라 쓸 수 없습니다 |
| 알리는 동작 | 새 이슈 생성, resolve·ignore 뒤 재발. 그 밖의 상태 변경은 무시합니다 |
| 서명 검증 | Client Secret을 `SENTRY_WEBHOOK_SECRET`으로 Vercel **production에만** 둡니다(생성 때 한 번만 보여 다른 환경에 복사할 수 없음) |
| 채널 | `SLACK_SENTRY_ALERT_CHANNEL` (Vercel) |

`issue` 웹훅은 태그를 싣지 않습니다. 그래서 어느 기능이 깨졌는지는 이슈 제목으로만 알 수 있고,
`packages/shared/src/utils/errorReporter.ts`가 제목 앞에 `[feature/operation/stage]`를 붙이는 이유가 이것입니다.

## 보고가 조용히 사라지는 경로

설정은 멀쩡한데 이벤트가 안 오는 경우를 모았습니다. 모두 오류 없이 일어납니다.

- **`@sentry/react` 사본이 둘**: `init`한 사본과 `captureException`을 부른 사본이 다르면 수동 보고가
  버려집니다(PR #528). `.syncpackrc`가 버전을 하나로 묶고 CI(`pnpm lint:syncpack`)가 검사합니다.
- **웹 브라우저 설정 파일 이름**: Turbopack 빌드는 `instrumentation-client.*`만 읽습니다.
  `sentry.client.config.*`는 무시됩니다.
- **개발 빌드**: `CONFIG.buildEnv === "development"`면 웹·확장 모두 보내지 않습니다. CI의 E2E 서버도
  development 빌드입니다.
- **소스맵 토큰**: `turbo.jsonc`의 `build.env`에 `SENTRY_AUTH_TOKEN`이 없으면 빌드는 통과하고 업로드만
  건너뜁니다. 이벤트는 오지만 스택 트레이스가 난독화된 채 보입니다.
