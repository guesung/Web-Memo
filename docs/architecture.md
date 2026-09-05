# 아키텍처

> `/gs` 파이프라인의 `gs:frontend-dev`·`gs:backend-dev`가 첫 코드를 쓰기 전에 읽는 문서입니다.
> 각 에이전트는 **`## 공통` + 자기 섹션만** 읽습니다. `## QA 실행`은 `gs:qa-verifier`만 읽습니다.
> 사람이 읽는 전체 규칙은 [`AGENTS.md`](../AGENTS.md)에 있습니다 — 이 문서는 그중 구현 결정에 필요한 것만 추린 판입니다.
> **여기에 비밀번호·토큰 값을 적지 않습니다.** 이 파일은 커밋됩니다.

## 공통

| 항목 | 내용 |
| --- | --- |
| 런타임·언어 | Node.js 24 (`.nvmrc`, 루트 `engines`) / TypeScript 5.5.3. `apps/app`(Expo)만 TS `~5.9.3` — Expo SDK 요구사항이라 맞추지 않습니다 |
| 패키지 매니저 | pnpm 10.23.0 (workspace: `apps/*`, `pages/*`, `packages/*`, `e2e`) |
| 빌드 오케스트레이션 | Turborepo 2.x (`turbo.jsonc`) |
| 폴더 구조 | `apps/web`(Next.js) · `apps/chrome-extension`(MV3 코어) · `apps/app`(Expo)<br>`pages/side-panel` · `pages/options` · `pages/content-ui` — 확장 UI 진입점<br>`packages/shared`(훅·유틸·타입·상수) · `packages/ui`(shadcn/Radix) · `packages/env` · `packages/tailwind-config` · `packages/tsconfig` · `packages/vite-config` · `packages/hmr` · `packages/zipper` · `packages/dev-utils` · `packages/supabase-edge-functions`<br>`e2e`(Playwright) · `scripts/ai-reviewer`(워크스페이스 밖) |
| 네이밍 | 디렉토리는 `lowercase-with-dashes`, 파일명은 `camelCase`, 컴포넌트 파일만 `PascalCase`. Next.js 라우트의 비라우팅 폴더는 `_` 접두사(`_components`/`_constants`/`_utils`/`_types`, 각각 `index.ts` 배럴) |
| 실행 | `pnpm dev`(앱 제외 전체) · `pnpm dev:web` · `pnpm dev:extension` · `pnpm dev:app`<br>`pnpm build` / `build:web` / `build:extension` · `pnpm zip`(확장 패키징) |
| 검증 | **`pnpm check`(biome)가 CI 게이트입니다.** 타입체크·빌드가 다 통과해도 포맷 한 줄로 깨지므로 PR 전에 반드시 돌립니다.<br>`pnpm type-check` · `pnpm type-check:scripts`(워크스페이스 밖이라 별도) · `pnpm lint:syncpack`(패키지 간 버전 정합) · `pnpm test:jest`(Vitest) · `pnpm test:e2e`(Playwright) |
| 포맷 | Biome 2.0.0, **탭 들여쓰기**. `biome.json`의 `includes`에 걸리지 않는 경로(예: Edge Functions)는 어떤 검사에도 안 걸리므로 손으로 확인합니다 |
| 배포 | 웹 → Vercel(`www.webmemo.xyz`) · 확장 → 크롬 웹스토어 · 앱 → App Store. 모두 `.github/workflows/`의 `cd-*.yml`이 담당하며 릴리스는 `release.yml`·`versions.yml` |
| 브랜치 | **`master`가 유일한 베이스입니다.** `develop`은 테스트 서버 배포 전용 일회성 브랜치이고 작업 브랜치의 베이스가 아닙니다. 머지는 **머지 커밋 생성**(Squash/Rebase 금지). 자세한 내용은 [`branch-strategy.md`](branch-strategy.md) |
| 환경 변수 | 이름과 용도만 적습니다 — 값은 각 `.env`가 갖습니다.<br>· `packages/env/.env.{development,staging,production}` → `WEB_URL`(커밋됨, 확장·웹 공유)<br>· `apps/web/.env` → `OPENAI_API_KEY`, `UPSTASH_*` 등 **서버 시크릿**(커밋 안 함)<br>· `packages/shared/src/constants/` → 환경 무관 고정값(Supabase URL·anon key, Sentry DSN, GA/GTM, OAuth)<br>· 빌드 대상은 셸 `BUILD_ENV`로 고릅니다. 코드에서 환경 분기는 **`CONFIG.buildEnv`**를 쓰고 `NODE_ENV`로 판단하지 않습니다(staging을 표현할 수 없음).<br>· **`packages/env`에 서버 시크릿을 넣지 않습니다** — `tsup`이 번들에 인라인해 클라이언트로 실립니다. 전체 규칙은 [`environment-variables.md`](environment-variables.md) |
| 모니터링 | Sentry (웹·확장·앱) |
| i18n | ko/en. 웹은 `apps/web/src/modules/i18n/`(`util.client` / `util.server`), 확장은 `_locales/`. **`lng === "ko"` 분기를 쓰지 않고 항상 번역 키를 씁니다** |

## 프론트엔드

| 항목 | 내용 |
| --- | --- |
| 프레임워크 | 웹 → **Next.js 14.2.10 App Router** (`apps/web`), React 19.1.0<br>확장 → **Vite 5.3.3 + Manifest V3** (`apps/chrome-extension` + `pages/*`), HMR은 `packages/hmr`<br>앱 → React Native / Expo (`apps/app`) |
| 라우팅 | `apps/web/src/app/[lng]/` 아래 `(no-auth)`(소개·기능·유스케이스·로그인·개인정보)와 `(auth)/(sidebar)`(메모·하이라이트·설정·휴지통) 두 그룹. 경로 문자열은 **`packages/shared/src/constants/Path.ts`의 `PATHS`**를 씁니다 — 하드코딩하지 않습니다 |
| 상태 관리 | 서버 상태 → **TanStack Query v5** (모든 Supabase 작업). 쿼리 키는 `packages/shared/src/constants/QueryKey.ts`<br>폼 상태 → **React Hook Form**<br>확장 상태 → Chrome Storage API(TS 래퍼, `packages/shared`)<br>로컬 상태 → React hooks. 전역 스토어(zustand/redux)는 쓰지 않습니다 |
| 스타일링 | TailwindCSS 3.4 + `packages/tailwind-config`. 디자인 토큰 원천은 `packages/ui/global.css`의 CSS 변수이며, **역할 이름(`bg-background`·`text-muted-foreground`)만 쓰고 색상 코드를 직접 적지 않습니다.** 다크 모드는 `next-themes` + `darkMode: ["class"]`. 상세는 [`design-system.md`](design-system.md) |
| 데이터 패칭 | Supabase 접근은 **`packages/shared/src/hooks/supabase/`의 query/mutation 훅을 통해서만** 합니다. 컴포넌트에서 `supabase.from(...)`을 직접 부르지 않습니다. 새 작업을 추가하면 해당 index에서 export합니다.<br>웹 서버 컴포넌트는 `apps/web/src/modules/supabase`의 SSR 클라이언트(`@supabase/ssr`)를 씁니다 |
| 컴포넌트 규칙 | 공용 프리미티브 → `packages/ui/src/components/` (추가 시 `index.ts`에서 export)<br>웹 공용 → `apps/web/src/components/`<br>페이지 전용 → 해당 라우트의 `_components/`<br>`page.tsx`는 import·`generateMetadata`·조합만. 파일 300줄을 넘으면 분리합니다<br>가능하면 서버 컴포넌트, `'use client'`는 Web API가 필요할 때만. 클라이언트 컴포넌트는 `Suspense` + fallback으로 감쌉니다 |
| 작성 규칙 | 함수 선언(`function`) 사용, 화살표 상수 컴포넌트 금지. 에러·엣지 케이스 먼저(early return), happy path 마지막. `interface`/`type`은 파일 끝. 아이콘은 항상 `lucide-react`(인라인 `<svg>` 금지). 상세 설계 원칙은 [`frontend-guidelines.md`](frontend-guidelines.md) |
| 확장 진입점 | `apps/chrome-extension/manifest.js`가 단일 진실 원천입니다. background service worker · content script(모든 URL) · side panel · options. 팝업·DevTools 패널은 없습니다. 진입점을 추가하려면 `pages/`에 패키지를 만들고 매니페스트에 등록합니다 |
| 앱 import 규칙 | `apps/app`에서는 `@web-memo/shared`의 **배럴 export를 쓰지 않고 좁은 하위 경로**(`@web-memo/shared/utils/url`)를 씁니다. 배럴을 타면 `@web-memo/env`가 딸려와 EAS 빌드에서 iOS만 깨집니다. 앱은 환경 변수를 쓰지 않고 상수만 읽습니다 |

## 백엔드

이 프로젝트에 전용 백엔드 서버는 없습니다. 서버 로직은 **Next.js Route Handler + Supabase(+ Edge Functions)** 두 곳에 있습니다.

| 항목 | 내용 |
| --- | --- |
| 서버 형태 | **Next.js Route Handler** (`apps/web/src/app/api/`) — Vercel Functions로 배포<br>· `api/openai/`(요약) · `api/openai/category`(카테고리 추천) · `api/openai/chat` · `api/openai/webpage-qa`<br>· `api/slack/commands` · `api/slack/interactivity`<br>· `api/uninstall-feedback` · `api/uninstall-log` · `api/version`<br>· `vercel.json`에 `/api/transcript` → `/api/transcript.py` rewrite가 남아 있으나 **대상 파일이 레포에 없습니다**(죽은 rewrite). 자막 추출은 현재 확장 content script(`pages/content-ui/src/ui/youtubeTranscript/`)가 합니다<br>**Supabase Edge Functions** (`packages/supabase-edge-functions/supabase/functions/`) — `kakao-auth`, `send-feedback` |
| DB | **Supabase PostgreSQL.** 스키마는 `memo`와 `feedback` 두 개.<br>테이블: `memo.memo` · `memo.category` · `memo.setting` · `memo.highlight` · `feedback.feedbacks`<br>마이그레이션 SQL → `packages/supabase-edge-functions/supabase/migrations/`<br>타입 → `packages/shared/src/types/supabase.ts` (**손으로 고치지 않고 `pnpm generate-supabase-type`으로 재생성**)<br>ORM은 쓰지 않습니다 — `supabase-js` 쿼리 빌더 직접 사용 |
| 스키마 변경 절차 | ① `migrations/`에 SQL 추가 → ② 원격 DB에 적용 → ③ `pnpm generate-supabase-type` → ④ 관련 query/mutation 훅 갱신.<br>**통합 E2E가 실제 프로덕션 Supabase를 치므로 스키마는 머지 전이 아니라 push 전에 적용돼 있어야 합니다.** `supabase db push`는 히스토리 불일치로 막혀 있어 Management API로 단일 SQL을 실행합니다 |
| API 규약 | 경로는 `/api/<도메인>/<행위>`, 소문자 kebab-case.<br>응답은 Route Handler에서 `NextResponse.json()`으로 반환하고, 에러는 상태 코드 + `{ message }` 형태로 통일합니다.<br>Server Action에서는 try/catch 대신 **에러를 값으로 반환**합니다. 반대로 서비스 계층(훅에서 부르는 쪽)은 TanStack Query가 잡을 수 있도록 사용자 친화적 에러를 throw합니다 |
| 인증 | **Supabase Auth.** Google·Kakao OAuth + 이메일. 콜백은 `/auth/callback`(OAuth)과 `/auth/callback-email`.<br>세션은 `@supabase/ssr` 쿠키. 확장은 웹이 심은 `access_token`/`refresh_token` 쿠키를 `chrome.cookies`로 읽어갑니다 — **쿠키 이름이 양쪽에서 정확히 일치해야 로그인 연동이 동작합니다**(`packages/shared/src/constants/SupabaseConfig.ts`).<br>보호 라우트는 `(auth)` 그룹으로 구분합니다 |
| 외부 연동 | OpenAI(요약·카테고리·QA) · Upstash Redis(레이트리밋) · Slack(피드백/알림) · youtube-transcript(자막) · Sentry.<br>**키가 필요한 호출은 전부 서버(Route Handler)에서만 합니다.** 클라이언트에서 직접 부르지 않습니다.<br>OpenAI 호출은 실비로 과금되므로 새 기능을 붙일 때 호출 빈도와 레이트리밋을 함께 정합니다 |

## QA 실행

| 항목 | 내용 |
| --- | --- |
| 서버 기동 | `pnpm dev:web` → `http://localhost:3000` (수 초).<br>E2E는 `pnpm run -w dev:web:preview`(`next build && next start`)를 띄우며 **빌드가 포함돼 최대 5분** 걸립니다.<br>**이미 `next start`가 떠 있는 상태에서 다시 빌드하면 화면 전체가 에러 바운더리로 떨어집니다.** 기존 서버를 내리고 시작하세요 |
| 진입 URL | `http://localhost:3000/ko` (영어는 `/en`). 메모 목록은 `/ko/memos` |
| 확장 화면 관측 | 사이드 패널·옵션 페이지는 웹 URL로 못 엽니다. `pnpm build:extension`으로 `dist/`를 만든 뒤 Playwright `launchPersistentContext`에 `--load-extension`으로 물려야 합니다 (`e2e/tests/fixtures.ts`가 그대로 합니다). 사이드 패널 셀렉터: `#memo-textarea`, 열기 버튼: `#OPEN_SIDE_PANEL_BUTTON` |
| 테스트 계정 | 값을 여기 적지 않습니다. `packages/shared/src/constants/SupabaseConfig.ts`의 `testEmail` / `testPassword` 키를 읽어 씁니다 |
| 로그인 절차 | `/{lng}/login` 이동 → `data-testid="test-login-button"` 클릭 → `/memos`로 리다이렉트될 때까지 대기. 헬퍼가 `e2e/tests/lib/utils.ts`의 `login()`에 있습니다.<br>실제 소셜 로그인(Google·Kakao)은 자동화하지 않습니다 — **수동 항목**입니다 |
| 첫 진입 가이드 | 로그인 직후 driver.js 가이드 팝오버가 화면을 덮습니다. `localStorage.setItem("guide", "true")`로 건너뜁니다 (`skipGuide()`) |
| 시드 데이터 | 별도 시드 명령이 없습니다. 두 갈래로 나뉩니다.<br>· `e2e/tests/mocked/` — `e2e/tests/lib/mocks/supabaseRoutes.ts`가 네트워크를 가로채 고정 데이터를 줍니다. **기본적으로 여기에 얹으세요**<br>· `e2e/tests/integration/` — **실제 프로덕션 Supabase를 칩니다.** 데이터를 남기므로 만든 것은 반드시 정리합니다 |
| 뷰포트 | **`web`**(Desktop Chrome)이 기본값입니다. 확장 사이드 패널만 폭이 좁은(≈400px) 단일 컬럼이라 별도로 봅니다 |
| 알려진 함정 | 사이드 패널 메모는 **패널이 열릴 때의 URL**에 붙습니다 — 열어둔 채 `goto`해도 따라가지 않습니다.<br>Radix Dialog와 드롭다운이 겹쳐 닫히면 `body`에 `pointer-events: none`이 남아 화면이 먹통이 됩니다. 렌더 문제로 오진하지 마세요 |
