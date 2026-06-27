# AGENTS.md

이 파일은 이 저장소에서 작업하는 **모든 AI 코딩 도구(Claude Code, Cursor, Copilot, Gemini 등)의 단일 진실 원천(Single Source of Truth)** 입니다.

도구별 진입점은 이 파일을 가리키는 얇은 포인터로만 유지합니다.

- `CLAUDE.md` → 이 파일 + Claude Code 고유 항목(서브에이전트/Task tool, `/pr` 워크플로)
- `.cursor/rules/main.mdc` → 이 파일

> **규칙을 수정할 때는 항상 이 `AGENTS.md`만 고칩니다.** 도구별 파일에 규칙을 중복 작성하지 마세요.

세부 문서는 `docs/`에 있으며, 해당 절에서 링크합니다.

---

## 🎯 서비스 개요

Web Memo는 웹 브라우징 중 메모 작성의 불편함을 해결하는 Chrome 확장 프로그램입니다.

- 웹 서핑 중 수동으로 메모를 만드는 번거로움 제거
- 별도 노트 앱이 필요 없음
- 브라우징 중 사이드 패널을 통한 즉시 기록

### 핵심 기능

- **즉시 메모**: 브라우징 중 아이디어/정보를 빠르게 기록
- **페이지 요약**: ChatGPT 기반 웹사이트 요약(일부 사이트 한정)
- **메모 관리**: 저장한 메모 조회 및 정리
- **데이터 영속성**: 영구 저장 + Excel 내보내기
- **단축키**: 빠른 접근 (Alt+S, Cmd+S 등)

### 지원 콘텐츠

- 기사, 블로그, 뉴스 사이트
- YouTube 영상 및 자막(transcript)
- 일반 웹 콘텐츠
- **참고**: 요약 기능은 Chrome 웹스토어, 설정, 새 탭, PDF에서는 동작하지 않음

### 기능 작업 시 원칙

- 기술적 복잡성보다 사용자 경험을 우선
- 메모 기능은 **모든 웹사이트**에서 동작해야 함
- 미지원 요약 기능은 graceful degradation 적용
- 성능과 안정성에 집중

```typescript
// 요약은 지원하지 않지만 메모는 허용되는 페이지
const UNSUPPORTED_SUMMARY_PAGES = [
  'chrome://*',
  'chrome-extension://*',
  'chrome-search://*',
  'file://*',
  'about:*',
];
```

---

## 🛠 기술 스택

- **프론트엔드**: TypeScript 5.5.3, React 18.3.1, Next.js 14.2.10(웹 앱), Vite 5.3.3(확장), TailwindCSS 3.4.x
- **상태/데이터**: TanStack Query (React Query) v5.59.0, React Hook Form 7.53.2
- **UI/스타일링**: TailwindCSS, Framer Motion 11.11.8, Lucide React 0.456.0, Next Themes, Driver.js(튜토리얼/가이드)
- **백엔드/DB**: Supabase (인증, 데이터베이스, 타입 생성, 실시간)
- **빌드**: Turbo 2.1.1, Vite 5.3.3, Cross-env, Rimraf
- **테스트**: Vitest, Playwright 1.47.0
- **코드 품질**: Biome 2.0.0
- **모니터링**: Sentry
- **유틸리티**: dayjs(날짜), es-hangul(한글 처리), youtube-transcript(자막), OpenAI API
- **패키지 매니저/런타임**: pnpm 10.23.0, Node.js >=22.17.0

### 크로스 브라우저

- 기본: Chrome Extension Manifest V3
- 보조: Firefox 호환 — `__FIREFOX__` 환경 변수로 조건 분기
- HMR(Hot Module Replacement) 지원

---

## 🏗 아키텍처 & 모노레포 구조

Turborepo 기반 모노레포입니다.

**Apps**
- `apps/chrome-extension/` — Chrome Extension Manifest V3 코어
- `apps/web/` — Next.js 14.2.10 웹 애플리케이션
- `apps/app/` — React Native/Expo 모바일 애플리케이션

**Pages (확장 UI)**
- `pages/` — 확장 UI 페이지 (popup, side-panel, options, content-ui, devtools, devtools-panel)

**Shared Packages**
- `packages/shared/` — 공용 유틸/훅/타입/비즈니스 로직 (hooks, utils, types, modules, constants)
- `packages/ui/` — 공용 UI 컴포넌트(shadcn/ui 기반)
- `packages/env/` — 환경 변수 관리
- `packages/tailwind-config/` — 공용 TailwindCSS 설정
- `packages/tsconfig/` — 공용 TypeScript 설정
- `packages/vite-config/` — 공용 Vite 빌드 설정
- `packages/hmr/` — 확장용 HMR 유틸
- `packages/zipper/` — 확장 패키징 유틸
- `packages/dev-utils/` — 개발 유틸
- `packages/supabase-edge-functions/` — Supabase Edge Functions

**Testing & Infra**
- `e2e/` — Playwright E2E 테스트 스위트

### 확장 프로그램 진입점 (Manifest V3)

- **Background Script**: 백그라운드 작업용 service worker
- **Content Scripts**: 메모 수집을 위해 웹 페이지에 주입
- **Side Panel**: 메인 메모 인터페이스(React 앱)
- **Popup**: 빠른 접근 인터페이스
- **Options**: 설정 페이지
- **DevTools**: 개발자 도구 패널

### 상태 관리 패턴

- **서버 상태**: 모든 Supabase 작업에 TanStack Query 사용
- **폼 상태**: React Hook Form
- **확장 상태**: Chrome Storage API(TypeScript 래퍼)
- **로컬 상태**: React hooks(컴포넌트 단위)

---

## ⚙️ 개발 명령어

```bash
# 의존성 설치
pnpm i

# 개발
pnpm dev               # 전체
pnpm dev:extension     # 확장만
pnpm dev:web           # 웹만

# 빌드
pnpm build             # 전체
pnpm build:extension   # 확장만 (Firefox: pnpm build:extension -- --firefox)
pnpm build:web         # 웹만

# 품질 & 테스트
pnpm format            # Biome 포매팅
pnpm lint
pnpm lint:fix
pnpm type-check
pnpm test:jest         # 단위 테스트 (Vitest)
pnpm test:e2e          # E2E (Playwright)
pnpm test-report:e2e

# 확장 배포
pnpm package
pnpm zip
pnpm update-version

# Supabase 타입 생성
pnpm generate-supabase-type
```

**단일 테스트 실행**
```bash
pnpm -F e2e test -- --grep "test name"   # 특정 E2E
pnpm test:jest -- path/to/test.ts        # 단일 테스트 파일
```

---

## ✍️ 코딩 컨벤션

> 상세 프론트엔드 설계 원칙(가독성/예측가능성/응집도/결합도와 권장 패턴)은
> [docs/frontend-guidelines.md](docs/frontend-guidelines.md) 참고.

### 핵심 원칙

- **단순성(Simplicity)**: 복잡함보다 항상 가장 단순한 해법 우선
- **DRY**: 중복을 피하고 기능 재사용
- **파일 길이**: 300줄 이하 유지, 넘으면 리팩토링
- **함수형/선언형 프로그래밍**: class 지양, 상속보다 합성

### 코드 구조

- 파일 구조: exports → subcomponents → helpers → types
- 네이밍:
  - 보조 동사를 포함한 서술형 이름 (`isLoading`, `handleClick`)
  - 디렉토리는 lowercase-with-dashes (`components/auth-wizard`)
  - **파일명은 camelCase** (예: `getMemoCount.ts`, `chromeStoreStats.ts`)
  - 컴포넌트는 named export 선호
- RORO 패턴(Receive Object, Return Object) 적용

### JavaScript / TypeScript

- 순수 함수는 `function` 키워드 사용
- `interface`/`type`로 먼저 타입을 설계한 뒤 구현
- 조건문 단순화: 불필요한 중괄호 지양(단, 가드 절은 명확하게)

### React 컴포넌트

- 화살표 함수 상수가 아닌 함수 선언으로 작성
- 선언형 JSX 사용
- 정적 콘텐츠는 render 함수 밖 변수로 추출
- interface/type은 파일 끝에 배치
- 가능하면 Server Component 우선, `'use client'` 최소화(Web API 접근 시에만)
- 클라이언트 컴포넌트는 Suspense + fallback으로 래핑

### 에러 처리

- 에러/엣지 케이스를 먼저 처리(early returns), happy path는 마지막
- 중첩 if와 불필요한 else 지양, 전제 조건은 guard clause로
- Server Actions에서는 try/catch 대신 에러를 값으로 반환
- `error.tsx` / `global-error.tsx`로 에러 바운더리 구성
- 서비스 계층은 TanStack Query를 위해 사용자 친화적 에러를 throw

### 아이콘

- 인라인 `<svg>` 금지 — **항상 `lucide-react` 사용**
- `import { IconName } from "lucide-react"`
- 자주 쓰는 아이콘: `Check`, `X`, `ChevronDown`, `Globe`, `Star`, `Users`, `Sparkles` 등
- 아이콘 검색: https://lucide.dev/icons

### 파일 조직

- 파일 300줄 이하 유지
- 구조: exports → subcomponents → helpers → types
- 디렉토리는 lowercase-with-dashes, 파일명은 camelCase

---

## 🧩 Next.js App Router 페이지 분리 (apps/web)

`apps/web/src/app/`의 `page.tsx`를 만들거나 수정할 때 다음 폴더로 코드를 분리합니다.

```
apps/web/src/app/[route]/
├── page.tsx        # 컴포넌트 렌더링/조합만
├── _components/    # 페이지 전용 React 컴포넌트 (index.ts 배럴)
├── _constants/     # 정적 값, 설정 객체, 배열 (index.ts)
├── _utils/         # 헬퍼, 데이터 패칭, 변환, 메타데이터 (index.ts)
└── _types/         # 필요 시 TypeScript 인터페이스 (index.ts)
```

**규칙**
- `_constants/`: 하드코딩 값, 설정 객체, 정적 배열
- `_utils/`: 데이터 패칭 함수, 변환, 검증, 메타데이터
- `_components/`: 페이지 전용 컴포넌트
- `page.tsx`: import, `generateMetadata` export, 컴포넌트 조합만
- 복잡한 비즈니스 로직이 아니면 주석을 달지 않음
- 파일명은 camelCase
- 각 폴더에 `index.ts` 배럴 export 생성, 폴더 index에서 import (`from "./_constants"`)

---

## 🌐 국제화 (i18n)

한국어(ko)/영어(en) 지원. 확장은 `_locales/`, 웹은 Next.js i18n 통합.

**중요**: 조건부 텍스트 렌더링에 `lng === "ko"` 패턴을 절대 사용하지 않습니다. 항상 `useTranslation` 훅 + 번역 키를 사용합니다.

```tsx
// ❌ Wrong
{lng === "ko" ? "한글 텍스트" : "English Text"}

// ✅ Correct
import useTranslation from "@src/modules/i18n/util.client";

function Component({ lng }: { lng: Language }) {
  const { t } = useTranslation(lng);
  return <span>{t("some.translation.key")}</span>;
}
```

**번역 추가 절차**
1. `apps/web/src/modules/i18n/locales/ko/translation.json`에 키 추가
2. `apps/web/src/modules/i18n/locales/en/translation.json`에 같은 키 추가
3. 컴포넌트에서 `t("your.new.key")` 사용

**구조**: 중첩 객체로 조직(`introduce.hero.title`), 관련 번역은 공통 prefix로 그룹화.

**서버/클라이언트 컴포넌트** (apps/web):
- 클라이언트: `import useTranslation from "@src/modules/i18n/util.client"`
- 서버: `import useTranslation from "@src/modules/i18n/util.server"` (async)

**검증**: i18n 관련 코드를 수정한 작업 후에는 항상 `/i18n-check`로 번역 완전성을 검증합니다.

---

## 🔧 환경 설정

환경 변수는 `packages/env/`에서 관리합니다.

- `__FIREFOX__`: Firefox 전용 빌드 수정 활성화
- `OPENAI_API_KEY`: 페이지 요약용 OpenAI 연동
- `SENTRY_DSN`: 에러 추적/모니터링
- `WEB_URL`: 웹 애플리케이션 기본 URL

환경 파일:
- `packages/env/.env` (개발)
- `packages/env/.env.production` (운영)
- `packages/env/.env.example` (템플릿)

---

## ✅ 자주 하는 작업

**새 UI 컴포넌트**
1. `packages/ui/src/components/`에 추가
2. `packages/ui/src/index.ts`에서 export
3. 확장 페이지/웹 앱에서 사용

**Supabase 작업 추가**
1. `packages/shared/src/hooks/supabase/`에 query/mutation 훅 생성
2. 적절한 index 파일에서 export
3. TanStack Query 패턴으로 컴포넌트에서 사용

**DB 스키마 변경**
1. Supabase 스키마 업데이트(`packages/supabase-edge-functions/`의 Edge Functions)
2. `pnpm generate-supabase-type`으로 타입 재생성
3. 관련 query/mutation 업데이트

---

## 🧪 테스트 전략

- **단위 테스트(Vitest)**: 유틸 함수와 훅
- **E2E(Playwright)**: 핵심 사용자 플로우
  - 독립적 기능은 병렬 테스트
  - 데이터 의존 작업은 직렬 테스트
- **테스트 환경**: 로컬 개발 서버 대상으로 실행

---

## 📝 작업 문서화 (claudedocs)

모든 개발 작업은 추적/참조를 위해 `claudedocs/` 폴더에 문서화합니다.

**파일명 규칙**
```
claudedocs/
├── YYYY-MM-DD-feature-name.md       # 기능 구현
├── YYYY-MM-DD-bugfix-description.md  # 버그 수정
├── YYYY-MM-DD-refactor-target.md    # 리팩토링
└── YYYY-MM-DD-analysis-topic.md     # 분석/리서치
```

**템플릿**
```markdown
# [Task Title]

**Date**: YYYY-MM-DD
**Type**: feature | bugfix | refactor | analysis | chore
**Status**: completed | in-progress | blocked

## Summary
## Changes Made
## Technical Details
## Related Issues/PRs
## Notes
```

**작성 시점**: 새 기능, 조사가 필요한 버그 수정, 다중 파일 리팩토링, 아키텍처 결정, 복잡한 디버깅, 리서치/분석 결과.

---

## 🔀 커밋 & PR 워크플로

작업 완료 후 PR을 통해 변경을 추적/리뷰합니다. (Claude Code는 `/pr` 스킬 사용 — 자세한 내용은 `CLAUDE.md`)

### 표준 흐름

1. 작업 완료
2. `pnpm type-check` 및 `pnpm lint`로 검증
3. master 브랜치에서 새 브랜치 생성(이미 feature 브랜치면 생략)
4. 의미 있는 단위로 커밋 → 원격 푸시 → master를 대상(base)으로 PR 생성
5. 머지는 **Squash & Merge가 아니라 머지 커밋 생성** 방식으로 진행

### 언어 규칙 (MANDATORY)

- **커밋 메시지**: 한글 (예: `feat: 메모 검색 기능 추가`)
- **PR 제목**: 한글 (예: `feat: 메모 검색 기능 구현`)
- **PR 본문**: 요약/변경사항/테스트 계획 모두 한글
- **브랜치명**: 영문 유지 (예: `feat/memo-search`, `fix/login-error`)

### 브랜치 규칙 (MANDATORY)

- 모든 브랜치는 **`master`에서 분기**한다.
- 모든 PR의 base(target) 브랜치는 **`master`**다.
- 머지는 **Squash & Merge를 쓰지 않고 머지 커밋을 생성**해 진행한다. (개별 커밋 히스토리 보존)

### 세부 컨벤션 문서

- 커밋 컨벤션: [docs/commit-convention.md](docs/commit-convention.md)
- PR 컨벤션: [docs/pull-request-convention.md](docs/pull-request-convention.md)
- 브랜치 전략: [docs/branch-strategy.md](docs/branch-strategy.md)
- PR 본문은 항상 레포의 `PULL_REQUEST_TEMPLATE.md`를 따름

---

## 🤝 AI 협업 가이드

### 응답 스타일

- TypeScript, Node.js, Next.js, React, 모던 웹 개발 전문가로서 응답
- 간결하고 기술적인 응답 + 정확한 TypeScript 예시
- 이론보다 실용적 해법 중심, 불필요한 설명 없이 직접적인 답
- 코드 예시와 핵심은 마크다운으로

### 문제 해결 접근

1. 맥락과 요구사항 이해
2. 기존 코드 패턴/스타일 분석
3. 프로젝트 표준에 맞는 해법 제안
4. 성능/유지보수성/베스트 프랙티스 고려
5. 도움이 될 때 구체적 코드 예시 제공

### 복잡한 작업 계획

- 복잡한 기능은 구현 전 단계별 계획을 먼저 제시
- 큰 작업은 작고 관리 가능한 단위로 분해
- 핵심 기능을 우선, 엣지 케이스/에러 시나리오를 일찍 고려

### 주석 가이드

- 복잡한 코드에만 간결한 주석
- "무엇"보다 "왜"에 초점
- API 문서: 목적, 파라미터, 반환값, 사용 예시, 에러 처리 포함

---

## 🔄 규칙 자가 개선

이 문서(및 `docs/`)는 코드베이스와 함께 진화합니다.

**규칙 추가 시점**
- 새 기술/패턴이 3개 이상 파일에서 사용될 때
- 규칙으로 예방 가능한 버그가 반복될 때
- 코드 리뷰에서 같은 피드백이 반복될 때
- 새로운 보안/성능 패턴이 등장할 때

**규칙 수정 시점**
- 코드베이스에 더 나은 예시가 생겼을 때
- 추가 엣지 케이스가 발견됐을 때
- 구현 세부가 바뀌었을 때

**품질 기준**: 규칙은 실행 가능하고 구체적이어야 하며, 예시는 실제 코드에서 가져오고, 참조는 최신으로 유지합니다. 오래된 패턴은 deprecated 처리 후 제거하고 마이그레이션 경로를 문서화합니다.
