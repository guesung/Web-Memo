# packages/web 성능 분석 보고서

## 분석 개요

- **분석 일자**: 2025-12-02
- **분석 대상**: packages/web (Next.js 14.2.10 웹 애플리케이션)
- **분석 범위**: React 컴포넌트, Next.js 설정, 번들 최적화, 렌더링 패턴

---

## 🔴 Critical (높은 우선순위)

### 1. 랜딩 페이지(Introduce) 과도한 Client Components 사용

**위치**: `src/app/[lng]/(no-auth)/introduce/_components/`

**현재 상황**:
- 11개의 랜딩 페이지 컴포넌트 모두 `"use client"` 선언
- 해당 파일 목록:
  - `Hero/index.tsx`
  - `InteractiveDemo/index.tsx`
  - `Features/index.tsx`
  - `StatsSection/index.tsx`
  - `HowItWorks/index.tsx`
  - `UseCases/index.tsx`
  - `Testimonials/index.tsx`
  - `QuestionAndAnswer/index.tsx`
  - `FinalCTA/index.tsx`
  - `Footer/index.tsx`
  - `SocialProofBar/index.tsx`

**문제점**:
- 전체 컴포넌트가 클라이언트 번들에 포함되어 초기 JavaScript 로드 크기 증가
- SEO 관점에서 서버 렌더링 이점 상실
- First Contentful Paint (FCP) 및 Largest Contentful Paint (LCP) 지연

**개선 방향**:
- 정적 콘텐츠는 Server Component로 분리
- 애니메이션이 필요한 부분만 Client Component로 래핑
- `framer-motion` 사용 부분만 별도 컴포넌트로 추출

---

### 2. framer-motion 과도한 사용

**위치**: 20개 파일에서 `framer-motion` import

**현재 상황**:
```
packages/web/src/app/_components/NotFoundSection/index.tsx
packages/web/src/app/[lng]/(no-auth)/introduce/_components/* (11개 파일)
packages/web/src/app/[lng]/(auth)/memos/_components/MemoView/* (5개 파일)
packages/web/src/app/[lng]/(auth)/memos/_components/MemoDialog/index.tsx
...
```

**문제점**:
- `framer-motion`은 ~40KB(minified+gzip) 크기의 큰 라이브러리
- 단순 fade-in 애니메이션에도 전체 라이브러리 로드
- 랜딩 페이지에서 대부분의 컴포넌트가 `motion.div`로 래핑됨

**개선 방향**:
- CSS 애니메이션으로 대체 가능한 경우 CSS 사용 (예: `@keyframes`, `transition`)
- `framer-motion/m`의 가벼운 버전 검토
- 복잡한 애니메이션만 framer-motion 유지
- `next/dynamic`으로 lazy loading 적용

---

### 3. react-big-calendar 동적 로딩 미적용

**위치**: `src/app/[lng]/(auth)/memos/_components/MemoView/MemoCalendar.tsx`

**현재 상황**:
```typescript
import { Calendar, dayjsLocalizer, ... } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
```

**문제점**:
- `react-big-calendar`은 큰 크기의 라이브러리 (~50KB gzip)
- CSS 파일도 함께 로드됨
- 캘린더 뷰는 특정 사용자만 사용하는 기능
- 메인 번들에 포함되어 초기 로드 시간 증가

**개선 방향**:
- `next/dynamic`으로 lazy loading 적용
- 캘린더 뷰 선택 시에만 로드

---

## 🟡 Important (중간 우선순위)

### 4. MasonryInfiniteGrid useRecycle={false} 설정

**위치**: `src/app/[lng]/(auth)/memos/_components/MemoView/MemoGrid.tsx:99`

**현재 상황**:
```tsx
<MasonryInfiniteGrid
  ...
  useRecycle={false}
  ...
>
```

**문제점**:
- `useRecycle={false}`는 DOM 재활용을 비활성화
- 많은 메모가 있을 경우 DOM 노드가 계속 증가
- 메모리 사용량 증가 및 스크롤 성능 저하 가능

**개선 방향**:
- `useRecycle={true}` 활성화 검토
- 가상 스크롤링 효과로 대량 데이터 처리 최적화

---

### 5. MemoItem 내 framer-motion 애니메이션

**위치**: `src/app/[lng]/(auth)/memos/_components/MemoView/MemoItem.tsx:78-82`

**현재 상황**:
```tsx
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
>
```

**문제점**:
- 각 MemoItem마다 애니메이션 상태 관리
- 대량의 메모 렌더링 시 성능 오버헤드
- `memo()` HOC 사용 중이지만 애니메이션으로 인한 리렌더링 발생 가능

**개선 방향**:
- CSS transition으로 대체
- 또는 부모 컴포넌트에서 일괄 애니메이션 처리

---

### 6. InteractiveDemo 자동 회전 setInterval 최적화

**위치**: `src/app/[lng]/(no-auth)/introduce/_components/InteractiveDemo/index.tsx:77-91`

**현재 상황**:
```tsx
useEffect(() => {
  if (isPaused) return;

  const progressInterval = setInterval(() => {
    setProgress((prev) => {
      if (prev >= 100) {
        nextTab();
        return 0;
      }
      return prev + 100 / (AUTO_ROTATE_INTERVAL / 100);
    });
  }, 100);

  return () => clearInterval(progressInterval);
}, [isPaused, nextTab]);
```

**문제점**:
- 100ms 간격으로 상태 업데이트
- 초당 10회 리렌더링 발생
- 페이지가 보이지 않을 때도 계속 실행

**개선 방향**:
- `requestAnimationFrame` 사용
- Intersection Observer로 가시성 확인
- CSS animation으로 progress bar 구현

---

### 7. Image 컴포넌트 priority 과다 사용

**위치**:
- `src/app/[lng]/(no-auth)/introduce/_components/Hero/index.tsx:166`
- `src/app/[lng]/(no-auth)/introduce/_components/InteractiveDemo/index.tsx:201`
- `src/app/[lng]/(auth)/memos/_components/MemoCardHeader/index.tsx:67`

**현재 상황**:
```tsx
<Image ... priority />
```

**문제점**:
- `priority` 속성은 LCP 이미지에만 사용해야 함
- 모든 이미지에 priority 적용 시 preload 효과 감소
- MemoCardHeader의 favicon에 priority 적용은 불필요

**개선 방향**:
- Hero 섹션의 메인 이미지만 priority 유지
- 나머지 이미지는 priority 제거
- favicon 이미지는 loading="lazy" 적용

---

### 8. NotFoundSection에서 img 태그 사용

**위치**: `src/app/_components/NotFoundSection/index.tsx:46-50`

**현재 상황**:
```tsx
<img
  src="/images/error/lost-astronaut.svg"
  alt="Lost in Space"
  className="h-full w-full"
/>
```

**문제점**:
- Next.js Image 컴포넌트 미사용
- 이미지 최적화 혜택 없음 (WebP 변환, 크기 최적화 등)

**개선 방향**:
- `next/image` 컴포넌트로 교체
- SVG의 경우 인라인 SVG 또는 SVGR 사용 검토

---

## 🟢 Recommended (낮은 우선순위)

### 9. QueryClient 설정 최적화

**위치**: `src/app/[lng]/_components/QueryProvider/index.tsx`

**현재 상황**:
```tsx
const [queryClient] = useState(
  () =>
    new QueryClient({
      defaultOptions: {
        mutations: {
          onSuccess: async () => {
            await ExtensionBridge.requestRefetchTheMemosFromWeb();
          },
        },
      },
    }),
);
```

**개선 방향**:
- `staleTime`, `gcTime` 설정 추가로 불필요한 리페치 방지
- 예시:
```tsx
defaultOptions: {
  queries: {
    staleTime: 1000 * 60 * 5, // 5분
    gcTime: 1000 * 60 * 30, // 30분
  },
  ...
}
```

---

### 10. 동적 import 추가 적용 가능한 컴포넌트

**현재 적용 상태**:
```
✅ HeaderRight (dynamic import 적용)
✅ FeedbackDialog (dynamic import 적용)
✅ MemoRefreshButton (dynamic import 적용)
```

**추가 적용 권장**:
- `MemoCalendar` - 캘린더 뷰 선택 시에만 필요
- `MemoDialog` - 메모 클릭 시에만 필요
- 랜딩 페이지의 하단 섹션들 (FinalCTA, Footer 등)

---

### 11. StatsSection AnimatedCounter requestAnimationFrame 누수 방지

**위치**: `src/app/[lng]/(no-auth)/introduce/_components/StatsSection/index.tsx:31-45`

**현재 상황**:
```tsx
useEffect(() => {
  if (!isInView) return;

  let startTime: number;
  const animate = (currentTime: number) => {
    if (!startTime) startTime = currentTime;
    ...
    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  };
  requestAnimationFrame(animate);
}, [isInView, end, duration]);
```

**문제점**:
- `requestAnimationFrame` 취소 로직 없음
- 컴포넌트 언마운트 시 메모리 누수 가능

**개선 방향**:
- cleanup 함수에서 `cancelAnimationFrame` 호출
```tsx
useEffect(() => {
  ...
  let rafId: number;
  const animate = (...) => {
    ...
    rafId = requestAnimationFrame(animate);
  };
  rafId = requestAnimationFrame(animate);

  return () => cancelAnimationFrame(rafId);
}, [...]);
```

---

### 12. next.config.mjs 추가 최적화 옵션

**위치**: `next.config.mjs`

**현재 설정**:
```javascript
const nextConfig = {
  images: {
    remotePatterns: [{ hostname: "**" }],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  experimental: {
    optimizePackageImports: ["@web-memo/ui"],
  },
};
```

**개선 방향**:
- `optimizePackageImports`에 추가 패키지 포함:
```javascript
experimental: {
  optimizePackageImports: [
    "@web-memo/ui",
    "lucide-react",
    "framer-motion",
    "@tanstack/react-query",
  ],
},
```

---

## 📊 예상 개선 효과

| 카테고리 | 현재 예상 | 개선 후 예상 | 개선율 |
|---------|----------|-------------|-------|
| Initial JS Bundle | ~300KB | ~200KB | ~33% 감소 |
| LCP (Largest Contentful Paint) | 2.5s+ | 1.5s | ~40% 개선 |
| TTI (Time to Interactive) | 3.0s+ | 2.0s | ~33% 개선 |

> 실제 수치는 Bundle Analyzer (`pnpm build:analyze`)와 Lighthouse 테스트로 확인 필요

---

## 🎯 권장 개선 순서

1. **1단계** (즉시 적용 가능)
   - `react-big-calendar` dynamic import 적용
   - Image priority 속성 정리
   - `NotFoundSection` img → Image 교체

2. **2단계** (중간 난이도)
   - 랜딩 페이지 컴포넌트 Server/Client 분리
   - `MasonryInfiniteGrid useRecycle` 활성화 테스트
   - QueryClient 캐시 설정 최적화

3. **3단계** (리팩토링 필요)
   - framer-motion을 CSS 애니메이션으로 대체
   - InteractiveDemo 최적화
   - 추가 dynamic import 적용

---

## 📁 분석 파일 목록

### 분석 대상 주요 파일
- `next.config.mjs`
- `package.json`
- `src/app/layout.tsx`
- `src/app/[lng]/layout.tsx`
- `src/app/[lng]/(auth)/memos/layout.tsx`
- `src/app/[lng]/(no-auth)/introduce/page.tsx`
- `src/app/[lng]/(auth)/memos/_components/MemoView/*`
- `src/app/[lng]/(no-auth)/introduce/_components/*`
- `src/components/Header/*`

### 사용된 분석 도구
- 정적 코드 분석 (패턴 검색)
- 의존성 분석 (package.json)
- Next.js 설정 분석
