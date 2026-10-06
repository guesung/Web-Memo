# 코드 컨벤션 — 미검토 규칙 (참고용)

> **참고 자료입니다. 강제하지 않습니다.** 이 레포의 세부 코딩 규칙은 [`code-conventions.yaml`](code-conventions.yaml) 원장에 있는 것만 적용합니다.
> 여기 있는 것은 원장을 만들기 전 `AGENTS.md`의 `✍️ 코딩 컨벤션`과 `docs/architecture.md`의 `작성 규칙`에 있던 규칙 중 아직 사람이 검토하지 않은 것입니다.
> 규칙을 검토해 원장으로 옮기면 여기서 그 줄을 지웁니다(원장 머리 주석의 추가 절차). 원장으로 옮긴 아이콘 규칙(`icon-lucide-only`)은 이미 지웠습니다.

## 핵심 원칙

- **단순성(Simplicity)**: 복잡함보다 항상 가장 단순한 해법 우선
- **DRY**: 중복을 피하고 기능 재사용
- **파일 길이**: 300줄 이하 유지, 넘으면 리팩토링
- **함수형/선언형 프로그래밍**: class 지양, 상속보다 합성

## 코드 구조

- 파일 구조: exports → subcomponents → helpers → types
- 네이밍:
  - 보조 동사를 포함한 서술형 이름 (`isLoading`, `handleClick`)
  - 디렉토리는 lowercase-with-dashes (`components/auth-wizard`)
  - **파일명은 camelCase** (예: `getMemoCount.ts`, `chromeStoreStats.ts`)
  - 컴포넌트는 named export 선호
- RORO 패턴(Receive Object, Return Object) 적용

## JavaScript / TypeScript

- 순수 함수는 `function` 키워드 사용
- `interface`/`type`로 먼저 타입을 설계한 뒤 구현
- 조건문 단순화: 불필요한 중괄호 지양(단, 가드 절은 명확하게)

## React 컴포넌트

- 화살표 함수 상수가 아닌 함수 선언으로 작성
- 선언형 JSX 사용
- 정적 콘텐츠는 render 함수 밖 변수로 추출
- interface/type은 파일 끝에 배치
- 가능하면 Server Component 우선, `'use client'` 최소화(Web API 접근 시에만)
- 클라이언트 컴포넌트는 Suspense + fallback으로 래핑

## 에러 처리

- 에러/엣지 케이스를 먼저 처리(early returns), happy path는 마지막
- 중첩 if와 불필요한 else 지양, 전제 조건은 guard clause로
- Server Actions에서는 try/catch 대신 에러를 값으로 반환
- `error.tsx` / `global-error.tsx`로 에러 바운더리 구성
- 서비스 계층은 TanStack Query를 위해 사용자 친화적 에러를 throw

## 파일 조직

- 파일 300줄 이하 유지
- 구조: exports → subcomponents → helpers → types
- 디렉토리는 lowercase-with-dashes, 파일명은 camelCase

## architecture.md 작성 규칙에 있던 것

- 함수 선언(`function`) 사용, 화살표 상수 컴포넌트 금지
- 에러·엣지 케이스 먼저(early return), happy path 마지막
- `interface`/`type`은 파일 끝
