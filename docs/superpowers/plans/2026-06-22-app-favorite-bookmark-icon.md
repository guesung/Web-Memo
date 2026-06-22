# 앱 즐겨찾기 아이콘 분리(Star → Bookmark) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 모바일 앱에서 "브라우저 즐겨찾기"에 쓰이는 `Star`(⭐) 아이콘을 `Bookmark`(🔖)로 교체해, "메모 중요(isStar)"의 ⭐와 시각적으로 분리한다.

**Architecture:** 순수 표시(아이콘) 교체. 데이터·동작·저장 구조 변경 없음. `apps/app`의 브라우저 즐겨찾기 컴포넌트 3개에서 `lucide-react-native`의 `Star` import와 JSX를 `Bookmark`로 바꾼다. 메모 중요(isStar) 관련 `Star`/`StarOff`는 건드리지 않는다.

**Tech Stack:** React Native (Expo), TypeScript, lucide-react-native 0.574.0 (Bookmark 아이콘 포함 확인됨), NativeWind.

## Global Constraints

- 변경 대상은 `apps/app`의 **브라우저 즐겨찾기(Favorite)** 용 `Star`만. 메모 중요(`isStar`)용 `Star`/`StarOff`(`MemoCard.tsx`, `MemoDetailModal.tsx`)는 **변경 금지**.
- 아이콘 props 패턴(`size`, `color`, `fill`)과 색상 값(`#f59e0b`, `#ddd`, `#111`)은 기존 그대로 유지 — 아이콘 컴포넌트 이름만 교체.
- 커밋 메시지는 한글. 브랜치명은 영문. 베이스 브랜치는 `develop`.
- 데이터 모델·마이그레이션 변경 없음.

---

### Task 1: 브라우저 즐겨찾기 Star → Bookmark 교체

**Files:**
- Modify: `apps/app/app/(main)/browser/_components/BrowserHeader.tsx:1-10,87-93`
- Modify: `apps/app/app/(main)/browser/_components/FavoriteLinks.tsx:1,28`
- Modify: `apps/app/app/(main)/browser/_components/TechBlogBottomSheet.tsx:2,195`

**Interfaces:**
- Consumes: lucide-react-native `Bookmark` 아이콘 (named export, `size`/`color`/`fill` props 지원).
- Produces: 없음(외부 시그니처 변경 없음). 동일 컴포넌트 prop 인터페이스 유지.

- [ ] **Step 1: BrowserHeader.tsx — import 교체**

`apps/app/app/(main)/browser/_components/BrowserHeader.tsx:1-10`의 import에서 `Star`를 `Bookmark`로 교체한다.

변경 전:
```tsx
import {
	Heart,
	Home,
	LayoutGrid,
	RotateCw,
	Search,
	Share2,
	Star,
	X,
} from "lucide-react-native";
```

변경 후:
```tsx
import {
	Bookmark,
	Heart,
	Home,
	LayoutGrid,
	RotateCw,
	Search,
	Share2,
	X,
} from "lucide-react-native";
```

- [ ] **Step 2: BrowserHeader.tsx — 즐겨찾기 토글 JSX 교체**

`apps/app/app/(main)/browser/_components/BrowserHeader.tsx:87-93`의 `Star`를 `Bookmark`로 교체한다(props 그대로).

변경 전:
```tsx
<TouchableOpacity onPress={onFavoriteToggle} className="p-1.5">
	<Star
		size={16}
		color={isCurrentPageFavorite ? "#f59e0b" : "#111"}
		fill={isCurrentPageFavorite ? "#f59e0b" : "none"}
	/>
</TouchableOpacity>
```

변경 후:
```tsx
<TouchableOpacity onPress={onFavoriteToggle} className="p-1.5">
	<Bookmark
		size={16}
		color={isCurrentPageFavorite ? "#f59e0b" : "#111"}
		fill={isCurrentPageFavorite ? "#f59e0b" : "none"}
	/>
</TouchableOpacity>
```

- [ ] **Step 3: FavoriteLinks.tsx — import + 빈 상태 아이콘 교체**

`apps/app/app/(main)/browser/_components/FavoriteLinks.tsx:1`의 import와 `:28`의 JSX를 교체한다.

변경 전:
```tsx
import { Star } from "lucide-react-native";
```
```tsx
<Star size={24} color="#ddd" />
```

변경 후:
```tsx
import { Bookmark } from "lucide-react-native";
```
```tsx
<Bookmark size={24} color="#ddd" />
```

- [ ] **Step 4: TechBlogBottomSheet.tsx — import + 섹션 라벨 아이콘 교체**

`apps/app/app/(main)/browser/_components/TechBlogBottomSheet.tsx:2`의 import와 `:195`의 JSX를 교체한다(`MessageCircle`, `X`는 유지).

변경 전:
```tsx
import { MessageCircle, Star, X } from "lucide-react-native";
```
```tsx
<Star size={14} color="#f59e0b" fill="#f59e0b" />
```

변경 후:
```tsx
import { Bookmark, MessageCircle, X } from "lucide-react-native";
```
```tsx
<Bookmark size={14} color="#f59e0b" fill="#f59e0b" />
```

- [ ] **Step 5: 메모 중요(isStar) Star가 영향받지 않았는지 확인**

Run: `grep -rn "Star" apps/app/app/\(main\)/_components/MemoCard.tsx apps/app/app/\(main\)/_components/MemoDetailModal.tsx`
Expected: `MemoCard.tsx`와 `MemoDetailModal.tsx`의 `Star`/`StarOff` import·사용이 **그대로** 남아 있어야 함(변경 금지 대상이 안 건드려졌는지 확인).

또한 즐겨찾기 3개 파일에 `Star`가 더 이상 없는지 확인:
Run: `grep -rn "Star" apps/app/app/\(main\)/browser/_components/BrowserHeader.tsx apps/app/app/\(main\)/browser/_components/FavoriteLinks.tsx apps/app/app/\(main\)/browser/_components/TechBlogBottomSheet.tsx`
Expected: 결과 없음(빈 출력).

- [ ] **Step 6: 타입 체크 & 린트**

Run: `pnpm type-check`
Expected: 통과(에러 없음).

Run: `pnpm lint`
Expected: 통과(에러 없음).

- [ ] **Step 7: 시각 확인(수동)**

앱을 실행해 브라우저 화면에서 ① 헤더 즐겨찾기 토글이 🔖(Bookmark)로 보이고 토글 시 채워짐/색이 바뀌는지, ② 즐겨찾기 빈 상태 아이콘과 ③ 기술블로그 시트의 "즐겨찾기" 섹션 라벨 아이콘이 🔖로 바뀌었는지 확인. 메모 목록의 "중요" 배지는 여전히 ⭐인지 확인.

> 참고: 순수 아이콘 교체로 단위 테스트로 검증할 동작 로직이 없다. 검증은 type-check/lint + 시각 확인으로 한다.

- [ ] **Step 8: 커밋**

```bash
git add apps/app/app/\(main\)/browser/_components/BrowserHeader.tsx \
        apps/app/app/\(main\)/browser/_components/FavoriteLinks.tsx \
        apps/app/app/\(main\)/browser/_components/TechBlogBottomSheet.tsx
git commit -m "fix: 앱 브라우저 즐겨찾기 아이콘을 별표에서 북마크로 변경하여 메모 중요(별표)와 구분"
```

---

## Self-Review

- **Spec coverage:** 스펙 §2(요청 1)의 3개 변경 대상 파일(BrowserHeader/FavoriteLinks/TechBlogBottomSheet)과 "메모 중요 Star 미변경" 제약을 Task 1 Step 1–5가 모두 커버. ✅
- **Placeholder scan:** 모든 코드 스텝에 실제 코드 포함. TBD/TODO 없음. ✅
- **Type consistency:** 컴포넌트 prop 시그니처 변경 없음. `Bookmark`는 `Star`와 동일 props(`size`/`color`/`fill`) 지원. ✅
