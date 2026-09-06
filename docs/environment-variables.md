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
| `apps/web/.env` | 웹에서만 쓰는 서버 시크릿 | ❌ | Next.js가 자동 로드 (로컬·e2e 전용) |
| Vercel 프로젝트 환경변수 | 배포된 웹의 런타임·빌드 값 | — | 서버리스 함수가 런타임에 `process.env` |
| GitHub Secrets | CI/CD가 외부 서비스에 인증하는 데 쓰는 값 | — | 워크플로의 `${{ secrets.* }}` |
| `packages/shared/src/constants/` | 환경과 무관한 고정값 | ✅ | 그냥 `import` |

값을 새로 추가할 때는 이 순서로 판단합니다.

1. 환경이 달라져도 값이 같은가 → `packages/shared/src/constants/`
2. 환경마다 다르고, 확장·웹이 같이 쓰는가 → `packages/env/.env.{환경}`
3. 웹 서버에서만 읽고 절대 노출되면 안 되는가 → `apps/web/.env` + Vercel 프로젝트 환경변수
4. 배포 파이프라인이 외부 서비스에 인증하는 데만 쓰는가 → GitHub Secrets

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
`apps/web/.env`에 두고 서버에서만 읽습니다.

---

## 2. `apps/web/.env` — 웹 전용 서버 시크릿

`apps/web/.env.example`에 필요한 키가 적혀 있습니다.

| 키 | 용도 | 읽는 곳 |
| --- | --- | --- |
| `OPENAI_API_KEY` | 요약·카테고리 분류·웹페이지 QA | `src/app/api/openai/**` |
| `UPSTASH_REDIS_REST_URL` | OpenAI API 레이트 리밋 | `src/app/api/openai/ratelimit.ts` |
| `UPSTASH_REDIS_REST_TOKEN` | 동상 | 동상 |

웹은 공유 `.env`(`packages/env`)를 읽지 않습니다. `process.env`로 직접 읽는 값이
전부 웹 전용이고, 공유 값 `WEB_URL`은 `packages/env`가 인라인한 `CONFIG.webUrl`로
받기 때문입니다. 그래서 웹 전용 값만 `apps/web/.env`에 두면 Next.js 기본 동작으로
충분하고, `dotenv-cli`나 `vercel build` 수정 같은 장치가 필요 없습니다.

**이 파일은 로컬 개발과 e2e에서만 쓰입니다.** 배포된 서버리스 함수가 읽는 값은
Vercel 프로젝트 설정에서 옵니다.

---

## 3. Vercel 프로젝트 환경변수 — 배포된 웹의 런타임 값

배포된 서버리스 함수는 런타임에 `process.env`를 읽습니다. 그 값을 실제로 공급하는
것은 Vercel 프로젝트 설정 하나뿐이고, 워크플로는 `vercel pull`로 그것을 받아옵니다.

등록해야 하는 값은 `apps/web/.env.example`의 세 개(`OPENAI_API_KEY`,
`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`)와, 소스맵 업로드에 쓰는
`SENTRY_AUTH_TOKEN`, 그리고 빌드 시스템 플래그 `ENABLE_EXPERIMENTAL_COREPACK`입니다.
변경은 Vercel 대시보드나 `vercel env` CLI로 합니다.

| 키 | 환경 | 없으면 생기는 일 |
| --- | --- | --- |
| `OPENAI_API_KEY` | Production·Preview·Development | AI 기능 전체가 실패 |
| `UPSTASH_REDIS_REST_URL` | 동상 | 레이트 리밋이 **조용히 꺼짐** |
| `UPSTASH_REDIS_REST_TOKEN` | 동상 | 동상 |
| `SENTRY_AUTH_TOKEN` | Production·Preview | 소스맵 업로드가 **조용히 실패** |
| `ENABLE_EXPERIMENTAL_COREPACK` | 전 환경 | corepack이 꺼져 `packageManager`의 pnpm 버전이 무시됨 |

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
`apps/web/.env`에 `echo`, `vercel build` 스텝의 셸 `env`. 뒤의 둘은 빌드 시점에만
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

현재 등록된 13개입니다 (`gh secret list -R guesung/Web-Memo`).

| 이름 | 용도 | 쓰는 워크플로 |
| --- | --- | --- |
| `TURBO_TOKEN` | Turborepo 원격 캐시 인증 | `ci.yml`, `e2e.yml`, `cd-extension.yml` |
| `TURBO_TEAM` | 원격 캐시 팀 식별자 | 동상 |
| `VERCEL_TOKEN` | `vercel pull`·`build`·`deploy`·`alias` 인증 | `cd-web.yml` |
| `STAGING_WEB_URL_WITHOUT_PROTOCOL` | 스테이징 배포에 붙일 alias 도메인 (프로토콜 없는 형태) | `cd-web.yml` |
| `CLIENT_ID` | 크롬 웹스토어 API OAuth | `cd-extension.yml` |
| `CLIENT_SECRET` | 동상 | `cd-extension.yml` |
| `REFRESH_TOKEN` | 동상 | `cd-extension.yml` |
| `EXPO_TOKEN` | EAS 로그인 | `cd-app.yml` |
| `EXPO_ASC_API_KEY_P8` | App Store Connect API 키 (TestFlight 제출) | `cd-app.yml` |
| `EXPO_ANDROID_SERVICE_ACCOUNT_JSON` | Google Play 서비스 계정 키 (내부 테스트 제출) | `cd-app.yml` |
| `SLACK_WEBHOOK_URL` | 빌드·배포 결과 Slack 알림 | `ci.yml`, `release.yml`, `versions.yml` |
| `WEB_ENV_FILE` | e2e에서 `apps/web/.env`를 통째로 복원 | `e2e.yml` |
| `SENTRY_AUTH_TOKEN` | 확장 빌드의 Sentry 소스맵 업로드 인증 | `cd-extension.yml` |

`GITHUB_TOKEN`은 GitHub Actions가 자동으로 제공하므로 등록하지 않습니다.

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

- **`WEB_ENV_FILE`은 파일 내용 전체**입니다. 키 하나가 아니라 `apps/web/.env`를
  그대로 붙여넣은 값이고, e2e 잡이 `printf`로 파일을 복원합니다.
  `apps/web/.env.example`에 키가 추가되면 이 시크릿도 함께 갱신해야 합니다.
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

### 빌드 플래그

값이라기보다 분기 스위치입니다.

| 이름 | 의미 | 설정하는 곳 |
| --- | --- | --- |
| `BUILD_ENV` | `.env.{환경}` 선택 + `CONFIG.buildEnv`로 번들에 인라인 | 셸 / 워크플로 `env` |
| `__FIREFOX__` | Firefox 전용 빌드 (manifest 분기) | 빌드 스크립트 |
| `__DEV__` | 확장 개발 모드 (HMR·소스맵) | `packages/vite-config` |
| `ANALYZE` | Next.js 번들 분석 활성화 | 로컬에서 수동 |
| `CI` | Playwright의 재시도·서버 재사용 정책 분기 | GitHub Actions 자동 주입 |

---

## 7. 로컬 셋업

```bash
# 1. 웹 서버 시크릿 (웹의 AI 기능을 로컬에서 쓸 때만 필요)
cp apps/web/.env.example apps/web/.env
# → OPENAI_API_KEY, UPSTASH_* 를 채웁니다

# 2. 공유 환경별 값은 이미 커밋되어 있으므로 아무것도 하지 않아도 됩니다
#    로컬에서만 다른 값을 쓰고 싶을 때 오버라이드 파일을 만듭니다
echo 'WEB_URL=http://localhost:4000' > packages/env/.env

# 3. 개발 서버
pnpm dev
```

확장만 개발한다면 1번은 건너뛰어도 됩니다. 확장이 읽는 값은 전부 커밋된 파일과
상수에 있습니다.
