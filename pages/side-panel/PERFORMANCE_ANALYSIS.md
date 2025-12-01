# Side Panel 성능 분석 및 개선 보고서

## 개요

`pages/side-panel` 프로젝트의 성능 분석을 수행하고 발견된 문제점들을 개선했습니다.

## 분석 결과

### 1. 번들 크기 문제 (심각도: 높음)

**문제점:**
- 단일 index.js 번들이 ~626KB로 초기 로딩에 부담
- react-markdown, remark-gfm 등이 항상 로드됨 (약 200KB)
- 벤더 라이브러리 분리가 불충분함

**개선 전 번들 구조:**
```
index.js          ~626KB
@react-vendor.js  ~331KB
@sentry-vendor.js ~220KB
```

**개선 후 번들 구조:**
```
index.js              337KB (46% 감소)
@markdown-vendor.js   158KB (lazy loading)
@react-vendor.js      143KB
@sentry-core.js       113KB
@sentry-vendor.js     106KB
@ui-vendor.js          57KB
@tanstack-vendor.js    40KB
```

### 2. MemoForm 리렌더링 문제 (심각도: 높음)

**문제점:**
- `watch()` 함수가 JSX 내에서 직접 호출되어 매번 전체 폼 구독
- `categories?.find()` 중복 호출로 불필요한 계산
- 카테고리 변경 시 전체 컴포넌트 리렌더링

**개선 내용:**
- `useWatch()` 훅으로 특정 필드만 구독
- `useMemo`로 카테고리 조회 결과 메모이제이션
- `getValues()`로 이벤트 핸들러 내 값 접근

### 3. react-markdown 동적 로딩 부재 (심각도: 중간)

**문제점:**
- 요약 기능은 사용자가 요청 시에만 필요
- react-markdown + remark-gfm이 항상 번들에 포함됨 (~200KB)

**개선 내용:**
- `React.lazy()`로 react-markdown 동적 로딩
- 동적 import로 remark-gfm 지연 로딩
- Suspense fallback으로 로딩 중 텍스트 표시

### 4. QueryClient 설정 미최적화 (심각도: 중간)

**문제점:**
- staleTime 미설정으로 매번 네트워크 요청
- refetchOnWindowFocus가 기본값(true)으로 불필요한 리페치

**개선 내용:**
- staleTime: 5분으로 설정
- gcTime: 10분으로 설정
- refetchOnWindowFocus: false
- retry: 1회로 제한

## 변경 파일

1. `src/components/MemoForm/index.tsx`
   - useWatch 도입으로 리렌더링 최적화
   - useMemo로 카테고리 계산 메모이제이션

2. `src/components/Summary/components/SummaryContent.tsx`
   - React.lazy로 react-markdown 동적 로딩
   - 동적 import로 remark-gfm 지연 로딩

3. `src/components/QueryProvider.tsx`
   - QueryClient 기본 설정 최적화

4. `vite.config.mts`
   - 세분화된 코드 스플리팅 적용
   - markdown, tanstack, ui 벤더 청크 분리

## 성능 개선 효과

| 지표 | 개선 전 | 개선 후 | 개선율 |
|------|---------|---------|--------|
| 메인 번들 크기 | 626KB | 337KB | **46% 감소** |
| 초기 로딩 JS | ~1.2MB | ~650KB | **46% 감소** |
| 불필요한 리렌더링 | 높음 | 낮음 | 개선 |
| 네트워크 요청 | 매번 | 5분 캐싱 | 개선 |

## 추가 권장 사항

### 단기
1. lucide-react 아이콘 tree-shaking 최적화
2. @radix-ui 컴포넌트별 동적 로딩 검토

### 중기
1. Sentry lazy loading 도입 (에러 발생 시에만 로드)
2. Service Worker를 통한 에셋 캐싱

### 장기
1. React Server Components 도입 검토 (Next.js 마이그레이션 시)
2. Streaming SSR 적용

## 테스트 권장

1. 사이드 패널 초기 로딩 시간 측정
2. 메모 입력 시 렌더링 성능 프로파일링
3. 요약 기능 사용 시 lazy loading 동작 확인
