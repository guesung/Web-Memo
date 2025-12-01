# Web Memo - 성능 분석 및 개선 보고서

## 개요

이 문서는 `packages/web` Next.js 애플리케이션의 성능 분석 결과와 적용된 개선 사항을 설명합니다.

---

## 발견된 성능 이슈

### 1. QueryClient 캐시 설정 부재 (높은 영향)

**문제점:**
- `QueryProvider`에서 기본 캐시 설정(staleTime, gcTime)이 없어 매번 불필요한 refetch 발생
- 창 포커스 시 자동 refetch로 인한 불필요한 네트워크 요청

**파일:** `src/app/[lng]/_components/QueryProvider/index.tsx`

**개선 전:**
```tsx
new QueryClient({
  defaultOptions: {
    mutations: { ... }
  },
})
```

**개선 후:**
```tsx
new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,    // 5분간 fresh 상태 유지
      gcTime: 1000 * 60 * 30,      // 30분간 캐시 유지
      refetchOnWindowFocus: false, // 창 포커스 시 자동 refetch 비활성화
      retry: 1,                    // 재시도 1회로 제한
    },
    mutations: { ... }
  },
})
```

**예상 효과:** 네트워크 요청 50-70% 감소

---

### 2. MasonryInfiniteGrid 가상화 비활성화 (높은 영향)

**문제점:**
- `useRecycle={false}` 설정으로 모든 아이템이 DOM에 유지
- 메모 수가 많아질수록 메모리 사용량과 렌더링 비용 급증

**파일:** `src/app/[lng]/(auth)/memos/_components/MemoView/MemoGrid.tsx`

**개선:**
```tsx
// 변경 전
useRecycle={false}

// 변경 후
useRecycle={true}
```

**예상 효과:**
- DOM 노드 수 80% 이상 감소
- 스크롤 성능 대폭 향상
- 메모리 사용량 감소

---

### 3. MemoItem 내 불필요한 훅 및 애니메이션 (중간 영향)

**문제점:**
- 각 MemoItem마다 `useSearchParams` 훅 호출로 URL 파싱 반복
- framer-motion의 `<motion.div>` 애니메이션이 모든 아이템에 적용
- 이벤트 핸들러 함수가 매 렌더링마다 새로 생성

**파일:** `src/app/[lng]/(auth)/memos/_components/MemoView/MemoItem.tsx`

**개선 내용:**
1. `useSearchParams` 제거 → `window.location` 직접 사용
2. `<motion.div>` 제거 → CSS transition으로 대체
3. 이벤트 핸들러에 `useCallback` 적용

**예상 효과:**
- 컴포넌트 렌더링 시간 30-40% 감소
- JavaScript 번들 크기 감소 (framer-motion 부분 트리쉐이킹 개선)

---

### 4. MemoCardFooter 불필요한 쿼리 및 최적화 부재 (중간 영향)

**문제점:**
- 매 MemoItem마다 `useCategoryQuery()` 호출 (사용하지 않는 데이터)
- `useSearchParams` 커스텀 훅으로 매번 새로운 객체 생성
- 컴포넌트 메모이제이션 부재

**파일:** `src/app/[lng]/(auth)/memos/_components/MemoCardFooter/index.tsx`

**개선 내용:**
1. 사용하지 않는 `useCategoryQuery` 제거
2. Next.js 내장 `useSearchParams` 사용
3. `React.memo()` 적용
4. 이벤트 핸들러에 `useCallback` 적용

**예상 효과:**
- 불필요한 쿼리 요청 제거
- 리렌더링 횟수 감소

---

### 5. MemoCardHeader TooltipProvider 중복 생성 (낮은 영향)

**문제점:**
- 각 MemoItem마다 `<TooltipProvider>` 새로 생성
- Image 컴포넌트에 `priority` 설정으로 모든 이미지 즉시 로드

**파일:** `src/app/[lng]/(auth)/memos/_components/MemoCardHeader/index.tsx`

**개선 내용:**
1. `TooltipProvider` 제거 (상위에서 제공)
2. Image `loading="lazy"` 적용

**예상 효과:**
- 초기 로드 시 네트워크 요청 감소
- 컴포넌트 트리 단순화

---

### 6. Next.js 번들 최적화 설정 부족 (중간 영향)

**문제점:**
- `optimizePackageImports`에 일부 패키지만 포함
- 소스맵 관련 최적화 미설정

**파일:** `next.config.mjs`

**개선 내용:**
```js
experimental: {
  optimizePackageImports: [
    "@web-memo/ui",
    "@web-memo/shared",
    "lucide-react",
    "framer-motion",
    "dayjs",
    "@tanstack/react-query",
  ],
},
compress: true,
productionBrowserSourceMaps: false,
```

**예상 효과:**
- JavaScript 번들 크기 10-20% 감소
- 빌드 속도 향상

---

## 추가 권장 사항 (미적용)

### 1. 데이터 페칭 최적화

**현재 상태:**
```ts
// Supabase.ts getMemos()
const [firstBatch, secondBatch] = await Promise.all([
  .range(0, 999),
  .range(1000, 1999),
]);
```

**권장 사항:**
- 무한 스크롤과 연동하여 필요한 만큼만 데이터 로드
- 서버 사이드에서 페이지네이션 처리

### 2. React Server Components 활용

**권장 사항:**
- MemoSidebar는 이미 서버 컴포넌트로 잘 구현됨
- 추가로 정적인 UI 요소들을 서버 컴포넌트로 분리 고려

### 3. Suspense 경계 세분화

**권장 사항:**
- 현재 MemoView 전체에 Suspense 적용
- 개별 섹션별 Suspense 경계 설정으로 점진적 로딩 구현

---

## 성능 측정 방법

### 번들 크기 분석
```bash
pnpm build:analyze
```

### Lighthouse 점수 측정
- Chrome DevTools → Lighthouse 탭
- Performance, Accessibility, Best Practices, SEO 항목 확인

### Web Vitals 모니터링
- `src/app/_components/WebVitals/index.tsx`에서 이미 설정됨
- LCP, FID, CLS 지표 모니터링

---

## 변경 파일 목록

1. `src/app/[lng]/_components/QueryProvider/index.tsx`
2. `src/app/[lng]/(auth)/memos/_components/MemoView/MemoGrid.tsx`
3. `src/app/[lng]/(auth)/memos/_components/MemoView/MemoItem.tsx`
4. `src/app/[lng]/(auth)/memos/_components/MemoCardFooter/index.tsx`
5. `src/app/[lng]/(auth)/memos/_components/MemoCardHeader/index.tsx`
6. `next.config.mjs`
7. `src/app/[lng]/layout.tsx`

---

## 결론

주요 개선 사항:
- **캐싱 전략 개선**: 불필요한 네트워크 요청 대폭 감소
- **가상화 활성화**: 대량 데이터 렌더링 성능 향상
- **컴포넌트 최적화**: 메모이제이션 및 불필요한 리렌더링 방지
- **번들 최적화**: 트리쉐이킹 개선으로 번들 크기 감소

이러한 개선을 통해 초기 로드 시간 단축, 스크롤 성능 향상, 메모리 사용량 감소가 예상됩니다.
