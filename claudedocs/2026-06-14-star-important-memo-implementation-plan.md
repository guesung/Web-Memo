# 별표(★) 중요 메모 기능 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 각 메모에 별표(★)를 눌러 "중요 메모"로 표시·필터링하는 기능을 웹·크롬 익스텐션·모바일 앱 세 표면에 추가한다.

**Architecture:** 기존 위시리스트(`isWish`)와 독립된 새 boolean 컬럼 `isStar`를 추가한다. 위시리스트는 "전체"에서 빠지는 배타적 버킷이지만, 별표는 **오버레이 플래그**다 — 별표해도 "전체"에 남고 ★ 배지가 붙으며, "중요" 전용 필터 뷰(`isStar=true`, 위시 여부 무관)로 모아 본다. 공유 데이터 레이어(`@web-memo/shared`)를 먼저 확장한 뒤 표면별 UI를 위시리스트 패턴 그대로 복제한다.

**Tech Stack:** TypeScript, Supabase(Postgres `memo` 스키마), TanStack Query v5, Next.js(웹), Vite MV3(익스텐션), Expo/React Native(앱), Vitest(유닛), Biome(lint/format).

**원본 스펙:** `claudedocs/2026-06-14-star-important-memo-design.md`

---

## 사전 규칙 (모든 태스크 공통)

- 팀 프론트엔드 컨벤션 준수: 화살표 함수, 핸들러 `handle*`/props `on*`, `if`는 항상 블록, **`useCallback`/`useMemo`는 신규 코드에서 사용 금지**(단, 기존 파일의 기존 패턴을 수정할 때는 그 파일의 기존 스타일을 따른다 — 예: `useMemoForm.ts`는 이미 `useCallback`을 광범위하게 쓰므로 그 파일 안에서는 일관성을 위해 유지).
- 커밋 메시지는 **한글**, 브랜치명은 영문. co-authors 추가 금지.
- 컬럼/필드/식별자 이름은 전 구간에서 **`isStar`** 로 통일.
- 작업 시작 전 develop에서 브랜치 생성: `git switch -c feat/star-important-memo`.

```bash
git switch develop && git pull && git switch -c feat/star-important-memo
```

---

# Phase 1 — 공유 데이터 레이어 + DB

### Task 1: `isStar` 컬럼 추가 (DB + 타입)

**Files:**
- Create: `packages/supabase-edge-functions/supabase/migrations/20260614_add_isStar_to_memo.sql`
- Modify: `packages/shared/src/types/supabase.ts:82,94,106` (memo Row/Insert/Update)

- [ ] **Step 1: 마이그레이션 SQL 파일 작성 (기록용)**

Create `packages/supabase-edge-functions/supabase/migrations/20260614_add_isStar_to_memo.sql`:

```sql
-- 메모에 "중요(별표)" 플래그 추가. 위시리스트(isWish)와 독립된 축.
ALTER TABLE memo.memo
  ADD COLUMN IF NOT EXISTS "isStar" boolean DEFAULT false;
```

- [ ] **Step 2: 실제 Supabase DB에 컬럼 반영**

다음 중 하나로 컬럼을 실제 DB에 추가한다(코드 머지 전 선반영 필수):
- Supabase 대시보드 SQL Editor에서 위 SQL 실행, 또는
- Supabase CLI 사용 시 마이그레이션 적용.

> DB 접근 권한이 없으면 이 단계를 담당자에게 위임하고, Step 3의 수기 편집으로 타입만 먼저 맞춘다.

- [ ] **Step 3: 타입 반영 — 자동 생성 (권장)**

DB에 컬럼이 반영된 상태에서:

```bash
pnpm generate-supabase-type
```

이 스크립트가 `packages/shared/src/types/supabase.ts`를 재생성하여 `isStar`가 memo Row/Insert/Update에 자동 포함된다.

**자동 생성이 불가능할 때 — 수기 편집 (fallback):** `packages/shared/src/types/supabase.ts`의 memo 테이블에서 각 `isWish` 줄 바로 위에 `isStar`를 추가한다(알파벳 순서 유지).

Row(라인 82 부근):
```ts
				id: number;
				isStar: boolean | null;
				isWish: boolean | null;
```
Insert(라인 93 부근):
```ts
				id?: number;
				isStar?: boolean | null;
				isWish?: boolean | null;
```
Update(라인 105 부근):
```ts
				id?: number;
				isStar?: boolean | null;
				isWish?: boolean | null;
```

- [ ] **Step 4: 타입 체크**

Run: `pnpm -F @web-memo/shared type-check`
Expected: PASS (에러 없음)

- [ ] **Step 5: 커밋**

```bash
git add packages/supabase-edge-functions/supabase/migrations/20260614_add_isStar_to_memo.sql packages/shared/src/types/supabase.ts
git commit -m "feat: 메모 isStar(중요) 컬럼 및 타입 추가"
```

---

### Task 2: `MemoService.getMemosPaginated`에 `isStar` 필터 추가

**Files:**
- Modify: `packages/shared/src/utils/Supabase.ts:87-138`

- [ ] **Step 1: 파라미터와 조건부 필터 추가**

`getMemosPaginated`의 인자 구조분해와 타입에 `isStar`를 추가하고(`isWish` 다음), `isWish` 필터 블록 바로 아래에 `isStar` 필터를 추가한다.

인자 부분(라인 87-101):
```ts
	getMemosPaginated = async ({
		cursor,
		limit = 20,
		category,
		isWish,
		isStar,
		searchQuery,
		sortBy = "updated_at",
	}: {
		cursor?: string;
		limit?: number;
		category?: string;
		isWish?: boolean;
		isStar?: boolean;
		searchQuery?: string;
		sortBy?: "updated_at" | "created_at" | "title";
	}) => {
```

`isWish` 필터 블록(라인 124-126) 바로 아래에 추가:
```ts
		if (isWish !== undefined) {
			query = query.eq("isWish", isWish);
		}

		if (isStar !== undefined) {
			query = query.eq("isStar", isStar);
		}
```

- [ ] **Step 2: 타입 체크**

Run: `pnpm -F @web-memo/shared type-check`
Expected: PASS

- [ ] **Step 3: 커밋**

```bash
git add packages/shared/src/utils/Supabase.ts
git commit -m "feat: getMemosPaginated에 isStar 필터 추가"
```

---

### Task 3: `QUERY_KEY.memosPaginated`에 `isStar` 차원 추가 (TDD)

**Files:**
- Create: `packages/shared/src/constants/QueryKey.test.ts`
- Modify: `packages/shared/src/constants/QueryKey.ts:7-12`

- [ ] **Step 1: 실패하는 테스트 작성**

Create `packages/shared/src/constants/QueryKey.test.ts`:

```ts
import { QUERY_KEY } from "./QueryKey";

describe("QUERY_KEY.memosPaginated", () => {
	test("isStar를 키 객체에 포함한다.", () => {
		expect(
			QUERY_KEY.memosPaginated("book", false, "q", "updated_at", true),
		).toStrictEqual([
			"memos",
			"paginated",
			{
				category: "book",
				isWish: false,
				searchQuery: "q",
				sortBy: "updated_at",
				isStar: true,
			},
		]);
	});

	test("isStar를 생략하면 undefined로 둔다.", () => {
		expect(
			QUERY_KEY.memosPaginated("book", false, "q", "updated_at"),
		).toStrictEqual([
			"memos",
			"paginated",
			{
				category: "book",
				isWish: false,
				searchQuery: "q",
				sortBy: "updated_at",
				isStar: undefined,
			},
		]);
	});
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `pnpm exec vitest run packages/shared/src/constants/QueryKey.test.ts`
Expected: FAIL (`isStar`가 키에 없어 객체 불일치)

- [ ] **Step 3: 구현 — `memosPaginated` 시그니처 확장**

`packages/shared/src/constants/QueryKey.ts`의 `memosPaginated`를 수정(라인 7-12). `isStar`를 **맨 끝 positional 인자**로 추가하여 기존 호출부 순서를 보존한다:

```ts
	memosPaginated: (
		category?: string,
		isWish?: boolean,
		searchQuery?: string,
		sortBy?: MemoSortBy,
		isStar?: boolean,
	) => [
		"memos",
		"paginated",
		{ category, isWish, searchQuery, sortBy, isStar },
	],
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

Run: `pnpm exec vitest run packages/shared/src/constants/QueryKey.test.ts`
Expected: PASS (2 passed)

- [ ] **Step 5: 커밋**

```bash
git add packages/shared/src/constants/QueryKey.ts packages/shared/src/constants/QueryKey.test.ts
git commit -m "feat: memosPaginated 쿼리 키에 isStar 차원 추가"
```

---

### Task 4: `useMemosInfiniteQuery`에 `isStar` 지원 + `isWish` 기본값 제거

**Files:**
- Modify: `packages/shared/src/hooks/supabase/queries/useMemosInfiniteQuery.ts:11-40`

> **배경:** 이 공유 훅의 유일한 호출처는 웹 `MemoView`뿐이며 항상 `isWish`를 명시적으로 넘긴다(grep 확인 완료). "중요" 뷰는 `isWish: undefined`(위시 무관)를 넘겨야 하는데, 현재의 `isWish = false` 기본값이 `undefined`를 `false`로 강제하므로 **기본값을 제거**한다. `getMemosPaginated`는 이미 `isWish !== undefined`일 때만 필터하므로 동작이 정확히 보존된다.

- [ ] **Step 1: props 인터페이스에 `isStar` 추가, `isWish` 기본값 제거**

라인 11-23을 수정:
```ts
interface UseMemosInfiniteQueryProps {
	category?: string;
	isWish?: boolean;
	isStar?: boolean;
	searchQuery?: string;
	sortBy?: MemoSortBy;
}

export default function useMemosInfiniteQuery({
	category,
	isWish,
	isStar,
	searchQuery,
	sortBy = "updated_at",
}: UseMemosInfiniteQueryProps = {}) {
```

- [ ] **Step 2: 쿼리 키와 queryFn에 `isStar` 전달**

queryKey(라인 31)를 수정:
```ts
		queryKey: QUERY_KEY.memosPaginated(
			category,
			isWish,
			searchQuery,
			sortBy,
			isStar,
		),
```

`memoService.getMemosPaginated` 호출(라인 33-40)에 `isStar` 추가:
```ts
				const result = await memoService.getMemosPaginated({
					cursor: pageParam,
					limit: PAGE_SIZE,
					category,
					isWish,
					isStar,
					searchQuery,
					sortBy,
				});
```

- [ ] **Step 3: 타입 체크**

Run: `pnpm -F @web-memo/shared type-check`
Expected: PASS

- [ ] **Step 4: 커밋**

```bash
git add packages/shared/src/hooks/supabase/queries/useMemosInfiniteQuery.ts
git commit -m "feat: useMemosInfiniteQuery에 isStar 지원 추가"
```

---

### Task 5: `useMemoUpsertMutation` 낙관적 업데이트에 `isStar` 보존

**Files:**
- Modify: `packages/shared/src/hooks/supabase/mutations/useMemoUpsertMutation.ts:76-87`

- [ ] **Step 1: 신규 메모 낙관적 객체에 `isStar` 기본값 추가**

`onMutate`의 신규 메모 분기(라인 76-87)에서 `isWish: data.isWish ?? false,` 다음 줄에 추가:
```ts
					: {
							id: -Date.now(),
							user_id: "",
							url: data.url ?? "",
							title: data.title ?? "",
							memo: data.memo ?? "",
							favIconUrl: data.favIconUrl ?? null,
							isWish: data.isWish ?? false,
							isStar: data.isStar ?? false,
							category_id: data.category_id ?? null,
							created_at: new Date().toISOString(),
							updated_at: new Date().toISOString(),
						};
```

> 업데이트 분기는 `...data` 스프레드로 `isStar`가 자동 반영되므로 수정 불필요.

- [ ] **Step 2: 타입 체크**

Run: `pnpm -F @web-memo/shared type-check`
Expected: PASS

- [ ] **Step 3: 커밋**

```bash
git add packages/shared/src/hooks/supabase/mutations/useMemoUpsertMutation.ts
git commit -m "feat: upsert 낙관적 업데이트에 isStar 기본값 추가"
```

---

### Task 6: `SEARCH_PARAMS_KEYS`에 `isStar` 추가 (TDD)

**Files:**
- Create: `packages/shared/src/modules/search-params/constant.test.ts`
- Modify: `packages/shared/src/modules/search-params/constant.ts:1-8`

- [ ] **Step 1: 실패하는 테스트 작성**

Create `packages/shared/src/modules/search-params/constant.test.ts`:

```ts
import { SEARCH_PARAMS_KEYS } from "./constant";

describe("SEARCH_PARAMS_KEYS", () => {
	test("isStar 파라미터를 허용한다.", () => {
		expect(SEARCH_PARAMS_KEYS).toContain("isStar");
	});
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `pnpm exec vitest run packages/shared/src/modules/search-params/constant.test.ts`
Expected: FAIL (`isStar` 미포함)

- [ ] **Step 3: 구현 — 키 추가**

`packages/shared/src/modules/search-params/constant.ts` 수정:
```ts
export const SEARCH_PARAMS_KEYS = [
	"id",
	"isWish",
	"isStar",
	"category",
	"view",
	"query",
	"searchTarget",
] as const;
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

Run: `pnpm exec vitest run packages/shared/src/modules/search-params/constant.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add packages/shared/src/modules/search-params/constant.ts packages/shared/src/modules/search-params/constant.test.ts
git commit -m "feat: 검색 파라미터에 isStar 추가"
```

---

# Phase 2 — 웹 (`apps/web`)

### Task 7: 웹 i18n 키 추가 (ko/en)

**Files:**
- Modify: `apps/web/src/modules/i18n/locales/ko/translation.json:30,337`
- Modify: `apps/web/src/modules/i18n/locales/en/translation.json:30,342`

- [ ] **Step 1: 한국어 키 추가**

`ko/translation.json` `sideBar`에서 `"wishList"` 다음(라인 30)에 추가:
```json
		"wishList": "내 위시리스트",
		"importantMemo": "중요 메모",
```

`toastTitle`에서 `"memoWishListAdded"` 다음(라인 338)에 추가:
```json
		"memoWishListAdded": "위시리스트에 추가했어요",
		"memoStarAdded": "중요 메모에 추가했어요",
		"memoStarDeleted": "중요 메모에서 삭제했어요",
```

- [ ] **Step 2: 영어 키 추가**

`en/translation.json` `sideBar` `"wishList"` 다음:
```json
		"wishList": "My wishlist",
		"importantMemo": "Important",
```

`toastTitle` `"memoWishListAdded"` 다음:
```json
		"memoWishListAdded": "Added to wishlist",
		"memoStarAdded": "Added to important",
		"memoStarDeleted": "Removed from important",
```

- [ ] **Step 3: 검증 + 커밋**

Run: `pnpm -F @web-memo/web type-check`
Expected: PASS

```bash
git add apps/web/src/modules/i18n/locales/ko/translation.json apps/web/src/modules/i18n/locales/en/translation.json
git commit -m "feat: 웹 중요 메모 i18n 키 추가"
```

---

### Task 8: 웹 `MemoCardFooter` 별표 토글 버튼

**Files:**
- Modify: `apps/web/src/app/[lng]/(auth)/memos/_components/MemoCardFooter/index.tsx`

- [ ] **Step 1: `StarIcon` import 추가**

라인 11을 수정:
```ts
import { Clock, FolderIcon, HeartIcon, StarIcon } from "lucide-react";
```

- [ ] **Step 2: `handleIsStarClick` 핸들러 추가**

`handleIsWishClick`(라인 46-78) 바로 아래에 추가:
```ts
	const handleIsStarClick = (event: MouseEvent<HTMLButtonElement>) => {
		event.stopPropagation();

		mutateMemoPatch({
			id: memo.id,
			request: {
				isStar: !memo.isStar,
			},
		});

		const toastTitle = memo.isStar
			? t("toastTitle.memoStarDeleted")
			: t("toastTitle.memoStarAdded");

		toast({
			title: toastTitle,
			action: (
				<ToastAction
					altText={t("toastActionMessage.undo")}
					onClick={() => {
						mutateMemoPatch({
							id: memo.id,
							request: {
								isStar: memo.isStar,
							},
						});
					}}
				>
					{t("toastActionMessage.undo")}
				</ToastAction>
			),
		});
	};
```

- [ ] **Step 3: 별표 버튼 렌더 추가**

하트 버튼(라인 128-143)과 `<MemoOption ... />` 사이에 별표 버튼 추가:
```tsx
				<Button
					variant="ghost"
					size="sm"
					className="w-8 h-8 p-0 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-full"
					onClick={handleIsStarClick}
				>
					<StarIcon
						size={16}
						fill={memo.isStar ? "#f59e0b" : "none"}
						className={cn(
							"transition-all",
							memo.isStar ? "text-amber-500 scale-110" : "text-gray-400",
							"hover:scale-125",
						)}
					/>
				</Button>
				<MemoOption memos={[memo]} lng={lng} onOpenChange={setIsDropdownOpen} />
```

- [ ] **Step 4: 검증 + 커밋**

Run: `pnpm -F @web-memo/web type-check`
Expected: PASS

```bash
git add "apps/web/src/app/[lng]/(auth)/memos/_components/MemoCardFooter/index.tsx"
git commit -m "feat: 웹 메모 카드에 별표 토글 버튼 추가"
```

---

### Task 9: 웹 `MemoSidebar` "중요 메모" 링크

**Files:**
- Modify: `apps/web/src/app/[lng]/(auth)/memos/_components/MemoSidebar/index.tsx:20,63`

- [ ] **Step 1: `Star` import 추가**

라인 20을 수정:
```ts
import { Heart, Home, SettingsIcon, Star } from "lucide-react";
```

- [ ] **Step 2: 위시리스트 링크 다음에 "중요 메모" 링크 추가**

위시리스트 `</Link>`(라인 63) 바로 다음, `</SidebarMenu>`(라인 64) 앞에 추가:
```tsx
						<Link href={`${PATHS.memos}?isStar=true`} replace>
							<SidebarMenuButton className="group relative overflow-hidden transition-all duration-200 hover:bg-gradient-to-r hover:from-amber-50 hover:to-amber-100/50 dark:hover:from-amber-950/30 dark:hover:to-amber-900/20 hover:shadow-sm hover:scale-[1.02] active:scale-[0.98]">
								<div className="flex items-center gap-3 w-full">
									<div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 group-hover:bg-amber-200 dark:group-hover:bg-amber-800/40 transition-colors">
										<Star
											size={16}
											className="text-amber-600 dark:text-amber-400"
										/>
									</div>
									<span className="font-medium text-gray-700 dark:text-gray-200 group-hover:text-amber-700 dark:group-hover:text-amber-300">
										{t("sideBar.importantMemo")}
									</span>
								</div>
							</SidebarMenuButton>
						</Link>
```

- [ ] **Step 3: 검증 + 커밋**

Run: `pnpm -F @web-memo/web type-check`
Expected: PASS

```bash
git add "apps/web/src/app/[lng]/(auth)/memos/_components/MemoSidebar/index.tsx"
git commit -m "feat: 웹 사이드바에 중요 메모 필터 링크 추가"
```

---

### Task 10: 웹 `MemoView` — `isStar` 검색 파라미터 처리

**Files:**
- Modify: `apps/web/src/app/[lng]/(auth)/memos/_components/MemoView/index.tsx:25-34`

> **핵심:** "중요" 뷰(`?isStar=true`)에서는 `isWish`를 넘기지 않아(=undefined) 위시 여부와 무관하게 별표 메모 전부를 보여준다. 일반/위시 뷰에서는 `isStar`를 넘기지 않는다.

- [ ] **Step 1: 검색 파라미터 읽기 + 쿼리 호출 수정**

라인 25-34를 다음으로 교체:
```ts
	const category = searchParams.get("category") ?? "";
	const isWishView = searchParams.get("isWish") === "true";
	const isStarView = searchParams.get("isStar") === "true";
	const searchQuery = watch("searchQuery");

	const { memos, totalCount, hasNextPage, isFetchingNextPage, fetchNextPage } =
		useMemosInfiniteQuery({
			category,
			isWish: isStarView ? undefined : isWishView,
			isStar: isStarView ? true : undefined,
			searchQuery: searchQuery || undefined,
		});
```

- [ ] **Step 2: 검증 + 커밋**

Run: `pnpm -F @web-memo/web type-check`
Expected: PASS

```bash
git add "apps/web/src/app/[lng]/(auth)/memos/_components/MemoView/index.tsx"
git commit -m "feat: 웹 메모 뷰에 중요 메모 필터 적용"
```

- [ ] **Step 3: 웹 수동 확인 (dev 서버)**

Run: `pnpm dev:web` 후 브라우저에서:
- 카드의 ★ 클릭 → 토스트 노출, 다시 클릭/되돌리기로 해제.
- 사이드바 "중요 메모" → `?isStar=true`, 별표한 메모만 노출.
- 별표한 메모가 "내 메모"(전체)에도 여전히 보이는지 확인(오버레이).
- 위시이면서 별표인 메모가 위시리스트·중요 두 뷰 모두에 보이는지 확인.

---

# Phase 3 — 크롬 익스텐션 (`pages/side-panel`)

### Task 11: 익스텐션 i18n 키 추가 (ko/en)

**Files:**
- Modify: `apps/chrome-extension/public/_locales/ko/messages.json:76`
- Modify: `apps/chrome-extension/public/_locales/en/messages.json` (동일 위치)

- [ ] **Step 1: 한국어 키 추가**

`ko/messages.json`에서 `"wish_list_added"` 블록(라인 74-76) 다음에 추가:
```json
	"wish_list_added": {
		"message": "위시리스트에 추가했어요"
	},
	"star_added": {
		"message": "중요 메모에 추가했어요"
	},
	"star_deleted": {
		"message": "중요 메모에서 삭제했어요"
	},
```

- [ ] **Step 2: 영어 키 추가**

`en/messages.json`의 동일 위치(`wish_list_added` 다음)에 추가:
```json
	"wish_list_added": {
		"message": "Added to wishlist"
	},
	"star_added": {
		"message": "Added to important"
	},
	"star_deleted": {
		"message": "Removed from important"
	},
```

- [ ] **Step 3: 커밋**

```bash
git add apps/chrome-extension/public/_locales/ko/messages.json apps/chrome-extension/public/_locales/en/messages.json
git commit -m "feat: 익스텐션 중요 메모 i18n 메시지 추가"
```

---

### Task 12: 익스텐션 `MemoInput` 타입 + 폼 기본값에 `isStar`

**Files:**
- Modify: `pages/side-panel/src/types/Input.ts`
- Modify: `pages/side-panel/src/components/MemoSection/components/MemoForm/index.tsx:204-211`

- [ ] **Step 1: `MemoInput`에 `isStar` 추가**

`pages/side-panel/src/types/Input.ts`:
```ts
export interface MemoInput {
	memo: string;
	isWish: boolean;
	isStar: boolean;
	categoryId: number | null;
}
```

- [ ] **Step 2: 폼 `defaultValues`에 `isStar` 추가**

`MemoForm`의 `useForm` defaultValues(라인 206-210):
```ts
		defaultValues: {
			memo: "",
			isWish: false,
			isStar: false,
			categoryId: null,
		},
```

- [ ] **Step 3: 타입 체크 (이 시점엔 useMemoForm 미수정으로 에러 가능 → 다음 태스크와 함께 통과)**

Run: `pnpm -F side-panel type-check`
Expected: `useMemoForm.ts`에서 `isStar` 미반영 에러가 날 수 있음 → Task 13 완료 후 통과. 우선 진행.

- [ ] **Step 4: 커밋**

```bash
git add pages/side-panel/src/types/Input.ts "pages/side-panel/src/components/MemoSection/components/MemoForm/index.tsx"
git commit -m "feat: 익스텐션 MemoInput에 isStar 추가"
```

---

### Task 13: 익스텐션 `useMemoForm` — `toggleStar` + 시드 + 저장

**Files:**
- Modify: `pages/side-panel/src/components/MemoSection/components/MemoForm/hooks/useMemoForm.ts`

> 이 파일은 기존에 `useCallback`을 일관되게 사용하므로 동일 스타일을 유지한다.

- [ ] **Step 1: `initMemoData`에서 `isStar` 시드**

`setValue("isWish", memoData?.isWish ?? false);`(라인 52) 다음에 추가하고, 의존성 배열에 `memoData?.isStar` 추가:
```ts
				setValue("isWish", memoData?.isWish ?? false);
				setValue("isStar", memoData?.isStar ?? false);
				setValue("categoryId", memoData?.category_id ?? null);
			},
			[
				memoData?.id,
				memoData?.memo,
				memoData?.isWish,
				memoData?.isStar,
				memoData?.category_id,
				setValue,
			],
```

- [ ] **Step 2: `saveMemo`의 `memoInput`과 upsert data에 `isStar` 포함**

`memoInput` 구성(라인 72-76):
```ts
				const memoInput: MemoInput = {
					memo: overrides?.memo ?? currentValues.memo,
					isWish: overrides?.isWish ?? currentValues.isWish,
					isStar: overrides?.isStar ?? currentValues.isStar,
					categoryId: overrides?.categoryId ?? currentValues.categoryId,
				};
```

upsert `data`(라인 88-93):
```ts
					data: {
						...tabInfo,
						memo: memoInput.memo,
						isWish: memoInput.isWish,
						isStar: memoInput.isStar,
						category_id: memoInput.categoryId,
					},
```

- [ ] **Step 3: `toggleStar` 추가 + 반환**

`toggleWish`(라인 135-141) 다음에 추가:
```ts
	const toggleStar = useCallback(async () => {
		const currentIsStar = getValues("isStar");
		const newIsStar = !currentIsStar;
		setValue("isStar", newIsStar);
		await saveMemo({ isStar: newIsStar });
		return newIsStar;
	}, [getValues, setValue, saveMemo]);
```

반환 객체(라인 143-150)에 `toggleStar` 추가:
```ts
	return {
		memoData,
		isSaving,
		saveMemo,
		handleMemoChange,
		updateCategory,
		toggleWish,
		toggleStar,
	};
```

- [ ] **Step 4: 타입 체크**

Run: `pnpm -F side-panel type-check`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add "pages/side-panel/src/components/MemoSection/components/MemoForm/hooks/useMemoForm.ts"
git commit -m "feat: 익스텐션 useMemoForm에 toggleStar 추가"
```

---

### Task 14: 익스텐션 `Url.ts` — `isStar` 딥링크 지원

**Files:**
- Modify: `pages/side-panel/src/utils/Url.ts:5-16`

- [ ] **Step 1: `getMemoUrl`에 `isStar` 파라미터 추가**

```ts
interface GetMemoUrlParams {
	id?: number;
	isWish?: boolean;
	isStar?: boolean;
}

export const getMemoUrl = ({ id, isWish, isStar }: GetMemoUrlParams) => {
	const searchParams = new SearchParams();
	if (id) searchParams.set("id", String(id));
	if (isWish) searchParams.set("isWish", "true");
	if (isStar) searchParams.set("isStar", "true");

	return `${CONFIG.webUrl}${PATHS.memos}${searchParams.getSearchParams()}`;
};
```

- [ ] **Step 2: 커밋**

```bash
git add pages/side-panel/src/utils/Url.ts
git commit -m "feat: 익스텐션 메모 URL에 isStar 딥링크 추가"
```

---

### Task 15: 익스텐션 `MemoForm` UI — 별표 아이콘 + 핸들러

**Files:**
- Modify: `pages/side-panel/src/components/MemoSection/components/MemoForm/index.tsx:18,31,54-75,116-128`

- [ ] **Step 1: `StarIcon` import 추가**

라인 18 수정:
```ts
import { HeartIcon, Loader2Icon, StarIcon, XIcon } from "lucide-react";
```

- [ ] **Step 2: `toggleStar` 구조분해**

라인 31-32 수정:
```ts
	const { memoData, isSaving, handleMemoChange, updateCategory, toggleWish, toggleStar } =
		useMemoForm();
```

- [ ] **Step 3: `handleStarClick` 핸들러 추가**

`handleWishClick`(라인 54-75) 다음에 추가:
```ts
	const handleStarClick = async () => {
		const newIsStar = await toggleStar();

		const navigateStar = () => {
			const url = getMemoUrl({
				id: memoData?.id,
				isStar: newIsStar,
			});
			Tab.create({ url });
		};

		toast({
			title: newIsStar
				? I18n.get("star_added")
				: I18n.get("star_deleted"),
			action: (
				<ToastAction altText={I18n.get("go_to")} onClick={navigateStar}>
					{I18n.get("go_to")}
				</ToastAction>
			),
		});
	};
```

- [ ] **Step 4: 별표 아이콘 렌더**

하트 아이콘(라인 116-128) 다음, `<SaveStatus ... />`(라인 129) 앞에 추가:
```tsx
							<StarIcon
								size={16}
								fill={memoData?.isStar ? "#f59e0b" : ""}
								fillOpacity={memoData?.isStar ? 100 : 0}
								onClick={handleStarClick}
								role="button"
								className={cn(
									"cursor-pointer transition-transform hover:scale-110 active:scale-95",
									{
										"text-amber-500": memoData?.isStar,
									},
								)}
							/>
```

- [ ] **Step 5: 타입 체크 + 빌드**

Run: `pnpm -F side-panel type-check`
Expected: PASS

- [ ] **Step 6: 커밋**

```bash
git add "pages/side-panel/src/components/MemoSection/components/MemoForm/index.tsx"
git commit -m "feat: 익스텐션 메모 폼에 별표 토글 추가"
```

- [ ] **Step 7: 익스텐션 수동 확인**

Run: `pnpm build:extension` 후 확장 로드 → 사이드패널에서 별표 토글, 토스트 "이동"이 웹 `?isStar=true`로 이동하는지 확인.

---

# Phase 4 — 모바일 앱 (`apps/app`)

### Task 16: 앱 로컬 저장소 — `isStar` 필드 + `toggleStarByUrl`

**Files:**
- Modify: `apps/app/lib/storage/localMemo.ts`

- [ ] **Step 1: `LocalMemo`에 `isStar` 추가**

라인 5-15:
```ts
export interface LocalMemo {
	id: string;
	url: string;
	title: string;
	memo: string;
	favIconUrl?: string;
	createdAt: string;
	updatedAt: string;
	synced: boolean;
	isWish?: boolean;
	isStar?: boolean;
}
```

- [ ] **Step 2: `upsertMemo`가 `isStar`를 처리하도록 확장**

`upsertMemo` 파라미터 타입(라인 39-45)에 `isStar?: boolean` 추가:
```ts
export async function upsertMemo(params: {
	url: string;
	title: string;
	memo: string;
	favIconUrl?: string;
	isWish?: boolean;
	isStar?: boolean;
}): Promise<LocalMemo> {
```

기존 메모 갱신 분기(라인 50-59)에 추가:
```ts
		if (params.isWish !== undefined) existing.isWish = params.isWish;
		if (params.isStar !== undefined) existing.isStar = params.isStar;
```

신규 메모 분기(라인 61-71)에 추가:
```ts
		isWish: params.isWish,
		isStar: params.isStar,
```

- [ ] **Step 3: `toggleStarByUrl` 추가**

`toggleWishByUrl`(라인 77-108) 다음에 추가:
```ts
export async function toggleStarByUrl(
	url: string,
	title?: string,
	favIconUrl?: string,
): Promise<LocalMemo> {
	const memos = await getAll();
	const existing = memos.find((m) => m.url === url);
	const now = new Date().toISOString();

	if (existing) {
		existing.isStar = !existing.isStar;
		existing.updatedAt = now;
		existing.synced = false;
		await save(memos);
		return existing;
	}

	const newMemo: LocalMemo = {
		id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
		url,
		title: title || "",
		memo: "",
		favIconUrl,
		isStar: true,
		createdAt: now,
		updatedAt: now,
		synced: false,
	};
	memos.push(newMemo);
	await save(memos);
	return newMemo;
}
```

- [ ] **Step 4: 타입 체크 + 커밋**

Run: `pnpm -F @web-memo/app type-check`
Expected: PASS

```bash
git add apps/app/lib/storage/localMemo.ts
git commit -m "feat: 앱 로컬 메모에 isStar 토글 추가"
```

---

### Task 17: 앱 로컬 훅 — `useLocalMemoStarToggle`

**Files:**
- Modify: `apps/app/lib/hooks/useLocalMemos.ts:1-9,45-65`

- [ ] **Step 1: `toggleStarByUrl` import**

라인 2-9의 import에 `toggleStarByUrl` 추가:
```ts
import {
	deleteMemo,
	getAllMemos,
	getMemoByUrl,
	toggleStarByUrl,
	toggleWishByUrl,
	upsertMemo,
} from "@/lib/storage/localMemo";
```

- [ ] **Step 2: `useLocalMemoStarToggle` 추가**

`useLocalMemoWishToggle`(라인 45-65) 다음에 추가:
```ts
export function useLocalMemoStarToggle() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			url,
			title,
			favIconUrl,
		}: {
			url: string;
			title?: string;
			favIconUrl?: string;
		}) => toggleStarByUrl(url, title, favIconUrl),
		onSuccess: (_data, { url }) => {
			queryClient.invalidateQueries({ queryKey: QUERY_KEY.localMemos() });
			queryClient.invalidateQueries({
				queryKey: QUERY_KEY.localMemoByUrl(url),
			});
		},
	});
}
```

- [ ] **Step 3: 타입 체크 + 커밋**

Run: `pnpm -F @web-memo/app type-check`
Expected: PASS

```bash
git add apps/app/lib/hooks/useLocalMemos.ts
git commit -m "feat: 앱 로컬 별표 토글 훅 추가"
```

---

### Task 18: 앱 Supabase 훅 — `useMemoStarToggleMutation` + upsert 보존

**Files:**
- Modify: `apps/app/lib/hooks/useMemoMutation.ts:14-21,49-81`

- [ ] **Step 1: `useMemoUpsertMutation`에서 `isStar` 보존**

업데이트 분기(라인 14-20)에 `isStar` 보존 추가:
```ts
					return memoService.updateMemo({
						id: existing.data[0].id,
						request: {
							...data,
							isWish: data.isWish ?? existing.data[0].isWish,
							isStar: data.isStar ?? existing.data[0].isStar,
						},
					});
```

- [ ] **Step 2: `useMemoStarToggleMutation` 추가**

`useMemoWishToggleMutation`(라인 49-81) 다음에 추가:
```ts
export function useMemoStarToggleMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: {
			url: string;
			title: string;
			favIconUrl?: string;
			currentIsStar: boolean;
		}) => {
			const existing = await memoService.getMemoByUrl(data.url);
			if (existing.data && existing.data.length > 0) {
				return memoService.updateMemo({
					id: existing.data[0].id,
					request: { isStar: !data.currentIsStar },
				});
			}
			return memoService.insertMemo({
				url: data.url,
				title: data.title,
				memo: "",
				isStar: true,
				favIconUrl: data.favIconUrl,
			});
		},
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({ queryKey: QUERY_KEY.memos() });
			queryClient.invalidateQueries({
				queryKey: QUERY_KEY.memo({ url: variables.url }),
			});
		},
	});
}
```

- [ ] **Step 3: 타입 체크 + 커밋**

Run: `pnpm -F @web-memo/app type-check`
Expected: PASS

```bash
git add apps/app/lib/hooks/useMemoMutation.ts
git commit -m "feat: 앱 별표 토글 뮤테이션 추가"
```

---

### Task 19: 앱 무한 쿼리 훅 — `isStar` 파라미터

**Files:**
- Modify: `apps/app/lib/hooks/useMemos.ts:8-31`

- [ ] **Step 1: `isStar` 파라미터 추가**

라인 8-31을 수정:
```ts
export function useMemosInfinite(params?: {
	category?: string;
	isWish?: boolean;
	isStar?: boolean;
	searchQuery?: string;
}) {
	return useInfiniteQuery({
		queryKey: QUERY_KEY.memosPaginated(
			params?.category,
			params?.isWish,
			params?.searchQuery,
			undefined,
			params?.isStar,
		),
		queryFn: async ({ pageParam }) => {
			const result = await memoService.getMemosPaginated({
				cursor: pageParam,
				limit: PAGE_SIZE,
				category: params?.category,
				isWish: params?.isWish,
				isStar: params?.isStar,
				searchQuery: params?.searchQuery,
			});
			return {
				data: (result.data ?? []) as GetMemoResponse[],
				count: result.count ?? 0,
			};
		},
```

> `QUERY_KEY.memosPaginated`의 4번째 인자(sortBy)는 앱에서 미사용이므로 `undefined`로 두고 5번째(isStar)를 전달한다.

- [ ] **Step 2: 타입 체크 + 커밋**

Run: `pnpm -F @web-memo/app type-check`
Expected: PASS

```bash
git add apps/app/lib/hooks/useMemos.ts
git commit -m "feat: 앱 무한 쿼리에 isStar 파라미터 추가"
```

---

### Task 20: 앱 `useMemoList` — 별표 필터 + 토글 라우팅

**Files:**
- Modify: `apps/app/app/(main)/_hooks/useMemoList.ts`

- [ ] **Step 1: import 추가**

라인 3-8 수정:
```ts
import {
	useLocalMemos,
	useLocalMemoStarToggle,
	useLocalMemoWishToggle,
} from "@/lib/hooks/useLocalMemos";
import {
	useMemoStarToggleMutation,
	useMemoWishToggleMutation,
} from "@/lib/hooks/useMemoMutation";
```

- [ ] **Step 2: 필터 타입 확장 + 토글 훅 인스턴스화**

라인 11-19를 수정:
```ts
type MemoFilter = "all" | "wish" | "star";

export function useMemoList() {
	const { isLoggedIn } = useAuth();
	const [filter, setFilter] = useState<MemoFilter>("all");

	const wishToggleLocal = useLocalMemoWishToggle();
	const wishToggleSupabase = useMemoWishToggleMutation();
	const starToggleLocal = useLocalMemoStarToggle();
	const starToggleSupabase = useMemoStarToggleMutation();
```

- [ ] **Step 3: 쿼리 파라미터를 필터에 따라 결정**

라인 25-32의 `useMemosInfinite(...)` 호출을 수정:
```ts
	} = useMemosInfinite(
		isLoggedIn
			? filter === "wish"
				? { isWish: true }
				: filter === "star"
					? { isStar: true }
					: { isWish: false }
			: undefined,
	);
```

- [ ] **Step 4: 로컬 메모 필터 분기 확장**

라인 34-38의 `memos` 계산을 수정:
```ts
	const memos: MemoItem[] = isLoggedIn
		? (supabaseMemosData?.pages.flatMap((p) => p.data) ?? [])
		: (localMemosData ?? []).filter((m) => {
				if (filter === "wish") return m.isWish;
				if (filter === "star") return m.isStar;
				return !m.isWish;
			});
```

- [ ] **Step 5: `handleStarToggle` 추가 + 반환**

`handleWishRemove`(라인 48-61) 다음에 추가:
```ts
	const handleStarToggle = (memo: MemoItem) => {
		const currentIsStar =
			"isStar" in memo ? Boolean(memo.isStar) : false;
		if (isLoggedIn) {
			const favIconUrl =
				"favIconUrl" in memo ? (memo.favIconUrl ?? undefined) : undefined;
			starToggleSupabase.mutate({
				url: memo.url,
				title: memo.title,
				favIconUrl,
				currentIsStar,
			});
		} else {
			starToggleLocal.mutate({ url: memo.url });
		}
	};
```

반환 객체(라인 63-73)에 `handleStarToggle` 추가:
```ts
	return {
		isLoggedIn,
		filter,
		setFilter,
		memos,
		isLoading,
		refetch,
		isFetchingNextPage,
		handleEndReached,
		handleWishRemove,
		handleStarToggle,
	};
```

- [ ] **Step 6: 타입 체크 + 커밋**

Run: `pnpm -F @web-memo/app type-check`
Expected: PASS

```bash
git add "apps/app/app/(main)/_hooks/useMemoList.ts"
git commit -m "feat: 앱 메모 목록에 별표 필터/토글 추가"
```

---

### Task 21: 앱 `MemoCard` — 별표 배지

**Files:**
- Modify: `apps/app/app/(main)/_components/MemoCard.tsx:2,86`

- [ ] **Step 1: `Star` import 추가**

라인 2 수정:
```ts
import { FileText, Heart, Star, Trash2 } from "lucide-react-native";
```

- [ ] **Step 2: 별표 배지 렌더**

위시 배지(라인 86) 다음에 추가:
```tsx
						{memo.isWish && <Heart size={12} fill="#ec4899" color="#ec4899" />}
						{"isStar" in memo && memo.isStar && (
							<Star size={12} fill="#f59e0b" color="#f59e0b" />
						)}
```

> `MemoItem`은 `LocalMemo | GetMemoResponse`이며 두 타입 모두 `isStar`를 가지지만(옵셔널), 안전하게 `"isStar" in memo` 가드를 둔다.

- [ ] **Step 3: 타입 체크 + 커밋**

Run: `pnpm -F @web-memo/app type-check`
Expected: PASS

```bash
git add "apps/app/app/(main)/_components/MemoCard.tsx"
git commit -m "feat: 앱 메모 카드에 별표 배지 추가"
```

---

### Task 22: 앱 `MemoDetailModal` — 별표 토글 버튼

**Files:**
- Modify: `apps/app/app/(main)/_components/MemoDetailModal.tsx:1,27-39,74-89,176-188`

- [ ] **Step 1: `Star`, `StarOff` import 추가**

라인 1 수정:
```ts
import { FileText, Globe, HeartOff, Share2, Star, StarOff, X } from "lucide-react-native";
```

- [ ] **Step 2: `onStarToggle` prop 추가**

props 인터페이스(라인 27-32)와 구조분해(라인 34-39)에 추가:
```ts
interface MemoDetailModalProps {
	memo: MemoItem | null;
	onClose: () => void;
	onNavigate: (url: string) => void;
	onWishRemove?: (memo: MemoItem) => void;
	onStarToggle?: (memo: MemoItem) => void;
}

export function MemoDetailModal({
	memo,
	onClose,
	onNavigate,
	onWishRemove,
	onStarToggle,
}: MemoDetailModalProps) {
```

- [ ] **Step 3: `handleStarToggle` + `isStar` 파생값**

`handleWishRemove`(라인 74-78) 다음에 추가:
```ts
	const handleStarToggle = useCallback(() => {
		if (memo && onStarToggle) {
			onStarToggle(memo);
		}
	}, [memo, onStarToggle]);
```

`isWish` 파생값(라인 89) 다음에 추가:
```ts
	const isStar = memo && "isStar" in memo ? memo.isStar : false;
```

- [ ] **Step 4: 별표 토글 버튼 렌더**

위시 제거 버튼 블록(라인 177-188) 다음에 추가:
```tsx
					{onStarToggle && (
						<TouchableOpacity
							className="flex-row items-center justify-center gap-1.5 mx-5 mt-2 py-2.5 border rounded-lg"
							style={{ borderColor: "#f59e0b" }}
							onPress={handleStarToggle}
							activeOpacity={0.7}
						>
							{isStar ? (
								<StarOff size={14} color="#f59e0b" />
							) : (
								<Star size={14} color="#f59e0b" fill="#f59e0b" />
							)}
							<Text
								className="text-sm font-medium"
								style={{ color: "#f59e0b" }}
							>
								{isStar ? "중요 해제" : "중요 표시"}
							</Text>
						</TouchableOpacity>
					)}
```

- [ ] **Step 5: 타입 체크 + 커밋**

Run: `pnpm -F @web-memo/app type-check`
Expected: PASS

```bash
git add "apps/app/app/(main)/_components/MemoDetailModal.tsx"
git commit -m "feat: 앱 상세 모달에 별표 토글 버튼 추가"
```

---

### Task 23: 앱 홈 화면 — 필터 pill + 빈 상태 + 모달 연결

**Files:**
- Modify: `apps/app/app/(main)/index.tsx:2,23-39,89-115,146-174,177-188`

- [ ] **Step 1: `Star` import 추가**

라인 2 수정:
```ts
import { Globe, Heart, LogIn, Star, Undo2 } from "lucide-react-native";
```

- [ ] **Step 2: `handleStarToggle` 구조분해 + `filter=star` 파라미터 처리**

`useMemoList()` 구조분해(라인 23-33)에 `handleStarToggle` 추가:
```ts
	const {
		isLoggedIn,
		filter,
		setFilter,
		memos,
		isLoading,
		refetch,
		isFetchingNextPage,
		handleEndReached,
		handleWishRemove,
		handleStarToggle,
	} = useMemoList();
```

`filterParam` 효과(라인 35-39)를 확장:
```ts
	useEffect(() => {
		if (filterParam === "wish") {
			setFilter("wish");
		} else if (filterParam === "star") {
			setFilter("star");
		}
	}, [filterParam, setFilter]);
```

- [ ] **Step 3: "중요" 필터 pill 추가**

위시리스트 pill `</TouchableOpacity>`(라인 114) 다음, `</View>`(라인 115) 앞에 추가:
```tsx
					<TouchableOpacity
						className={`flex-row items-center gap-1 px-3.5 py-[7px] rounded-[20px] ${filter === "star" ? "bg-foreground" : "bg-muted"}`}
						onPress={() => setFilter("star")}
					>
						<Star
							size={12}
							fill={filter === "star" ? "#fff" : "#666"}
							color={filter === "star" ? "#fff" : "#666"}
						/>
						<Text
							className={`text-[13px] font-semibold ${filter === "star" ? "text-white" : "text-gray-500"}`}
						>
							중요
						</Text>
					</TouchableOpacity>
```

- [ ] **Step 4: 목록 헤더/빈 상태 카피에 `star` 분기 추가**

목록 헤더(라인 121-123)를 수정:
```tsx
						<Text className="text-[17px] font-bold text-foreground mb-3">
							{filter === "wish"
								? "위시리스트"
								: filter === "star"
									? "중요 메모"
									: "최근 메모"}
						</Text>
```

빈 상태 아이콘(라인 148-152):
```tsx
						{filter === "wish" ? (
							<Heart size={48} color="#ddd" />
						) : filter === "star" ? (
							<Star size={48} color="#ddd" />
						) : (
							<Globe size={48} color="#ddd" />
						)}
```

빈 상태 제목(라인 153-157):
```tsx
						<Text className="text-base font-semibold text-muted-foreground">
							{filter === "wish"
								? "위시리스트가 비어있습니다"
								: filter === "star"
									? "중요 메모가 비어있습니다"
									: "저장된 메모가 없습니다"}
						</Text>
```

빈 상태 설명(라인 158-162):
```tsx
						<Text className="text-[13px] text-gray-300">
							{filter === "wish"
								? "브라우저에서 마음에 드는 페이지를 저장해보세요"
								: filter === "star"
									? "메모를 길게 눌러 중요 표시를 해보세요"
									: "브라우저에서 웹서핑하며 메모를 남겨보세요"}
						</Text>
```

빈 상태 버튼 라벨(라인 167-171):
```tsx
							<Text className="text-sm font-semibold text-white">
								{filter === "wish"
									? "브라우저에서 페이지 저장하기"
									: filter === "star"
										? "브라우저에서 페이지 저장하기"
										: "브라우저에서 웹서핑 시작하기"}
							</Text>
```

- [ ] **Step 5: 상세 모달에 `onStarToggle` 연결**

`MemoDetailModal`(라인 177-188)에 `onStarToggle` 추가:
```tsx
			<MemoDetailModal
				memo={selectedMemo}
				onClose={() => setSelectedMemo(null)}
				onNavigate={(url) => {
					setSelectedMemo(null);
					navigateToBrowser(url);
				}}
				onWishRemove={(memo) => {
					handleWishRemove(memo);
					setSelectedMemo(null);
				}}
				onStarToggle={(memo) => {
					handleStarToggle(memo);
					setSelectedMemo(null);
				}}
			/>
```

- [ ] **Step 6: 타입 체크 + 커밋**

Run: `pnpm -F @web-memo/app type-check`
Expected: PASS

```bash
git add "apps/app/app/(main)/index.tsx"
git commit -m "feat: 앱 홈에 중요 필터와 별표 토글 연결"
```

- [ ] **Step 7: 앱 수동 확인**

Run: `pnpm dev:app` (Expo) → 로그인/비로그인 각각:
- 상세 모달에서 "중요 표시/해제" 동작.
- "중요" 필터 pill로 별표 메모만 노출, 카드 ★ 배지 확인.
- 비로그인 오프라인 상태에서도 동작(AsyncStorage).

---

# Phase 5 — 통합 검증

### Task 24: 전체 타입 체크 · lint · i18n 검증

- [ ] **Step 1: 전체 타입 체크**

Run: `pnpm type-check`
Expected: 전 패키지 PASS

- [ ] **Step 2: lint**

Run: `pnpm lint`
Expected: 신규/수정 파일에 lint 에러 없음. 있으면 `pnpm lint:fix` 후 재확인.

- [ ] **Step 3: 유닛 테스트 전체 실행**

Run: `pnpm exec vitest run`
Expected: 신규 테스트 포함 전부 PASS

- [ ] **Step 4: i18n 완전성 검증**

Claude Code에서 `/i18n-check` 실행 → ko/en 누락 키 없음 확인.

- [ ] **Step 5: 최종 동작 체크리스트 (수동)**

- [ ] 웹: 카드 ★ 토글 + 되돌리기, "중요 메모" 필터 뷰, 별표 메모가 "전체"에도 노출(오버레이).
- [ ] 웹: 위시+별표 동시 메모가 위시리스트·중요 두 뷰 모두 노출.
- [ ] 익스텐션: 사이드패널 ★ 토글, 토스트 "이동" → 웹 중요 뷰.
- [ ] 앱(로그인): ★ 토글, "중요" 필터, 카드 배지, 상세 모달.
- [ ] 앱(비로그인): 오프라인 ★ 토글/필터 동작.

### Task 25: PR 생성

- [ ] **Step 1: PR 올리기**

Claude Code에서 `/pr` 실행 → 한글 제목/본문, 레포 `PULL_REQUEST_TEMPLATE.md` 준수, base는 develop.

PR 제목 예: `feat: 메모 별표(중요) 기능 추가`

---

## Self-Review (작성자 점검 결과)

**1. 스펙 커버리지:** 스펙의 모든 항목이 태스크로 매핑됨 — 데이터 모델(T1), 공유 레이어(T2-T6), 웹(T7-T10), 익스텐션(T11-T15), 앱 오프라인 이중 경로(T16-T23), i18n(T7/T11), 검증(T24-T25). 오버레이 필터 의미는 T10(웹)·T19/T20(앱)에서 `isStar`만 필터하고 `isWish`는 중요 뷰에서 미전달하도록 명시. 브라우저 헤더 미변경 결정 반영(앱 태스크에 헤더 토글 없음).

**2. Placeholder 스캔:** TBD/TODO 없음. 모든 코드 단계에 실제 코드 포함. (Task 1 Step 2의 DB 반영은 환경 의존이라 두 경로를 명시.)

**3. 타입 일관성:** `isStar` 식별자 전 구간 통일. `QUERY_KEY.memosPaginated(category, isWish, searchQuery, sortBy, isStar)` 시그니처가 호출부(useMemosInfiniteQuery=5인자, 앱 useMemosInfinite=sortBy 자리 undefined + isStar) 모두와 일치. `getMemosPaginated`의 `isStar?: boolean`가 호출부와 일치. `MemoInput.isStar`/`useMemoForm.toggleStar`/`MemoForm` 사용 일치. 앱 `useMemoStarToggleMutation`/`useLocalMemoStarToggle`/`toggleStarByUrl` 시그니처가 `useMemoList` 호출부와 일치.
