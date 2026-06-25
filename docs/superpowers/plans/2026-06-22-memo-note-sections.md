# 구조화된 노트(메모/느낀 점/액션 아이템) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 저장한 페이지(메모 레코드) 하나에 `메모` / `느낀 점` / `액션 아이템` 세 가지 고정 자유 텍스트 섹션을 작성·조회할 수 있게 한다. 익스텐션·웹·앱 모두 적용.

**Architecture:** `memo` 테이블에 `impression`, `actionItem` nullable 텍스트 컬럼 2개를 추가(접근법 A). 기존 `memo` 컬럼·데이터는 유지(하위호환). 공유 데이터 계층(`packages/shared`)의 타입과 검색이 새 필드를 통과하도록 하고, 세 플랫폼의 작성/표시 UI에 두 섹션을 추가한다.

**Tech Stack:** Supabase(Postgres), TypeScript, TanStack Query v5, React Hook Form, Next.js(웹), Chrome Extension/React(사이드패널), React Native/Expo(앱), Vitest, i18n(웹 translation.json / 익스텐션 messages.json / 앱 인라인 한글).

## Global Constraints

- 컬럼명은 정확히 `impression`(느낀 점), `actionItem`(액션 아이템). 기존 카멜케이스 컬럼(`isWish`, `isStar`, `favIconUrl`)과 일관.
- 두 컬럼은 nullable 텍스트. 기존 메모는 두 컬럼이 `null` → 작성 화면 빈 칸, 표시 화면 숨김.
- 섹션 유형은 고정 3종. 사용자 정의 없음. 액션 아이템도 자유 텍스트(체크리스트 아님).
- 적용 범위: 익스텐션 + 웹 + 앱 전부.
- 표시 화면(목록/카드)에서는 **값이 있는 섹션만** 라벨과 함께 노출.
- 웹은 한글 하드코딩 금지 — `useTranslation`/`t()` 사용. 앱은 기존 패턴대로 인라인 한글 허용.
- i18n 코드 수정 후 `/i18n-check`로 번역 완전성 검증.
- 커밋 메시지 한글, 브랜치명 영문, 베이스 브랜치 `develop`.

---

### Task 1: DB 마이그레이션 + Supabase 타입 갱신

**Files:**
- Create: `packages/supabase-edge-functions/supabase/migrations/20260622_add_note_sections_to_memo.sql`
- Modify: `packages/shared/src/types/supabase.ts:76-125` (memo 테이블 Row/Insert/Update)

**Interfaces:**
- Produces: `memo` 테이블 타입에 `impression: string | null`(Row), `actionItem: string | null`(Row), 그리고 Insert/Update에서는 `impression?: string | null`, `actionItem?: string | null`. 이후 모든 태스크가 `MemoTable["Insert"]`/`["Update"]`/`MemoRow`/`GetMemoResponse`를 통해 이 필드를 사용한다.

- [ ] **Step 1: 마이그레이션 파일 작성**

`packages/supabase-edge-functions/supabase/migrations/20260622_add_note_sections_to_memo.sql` 생성. 기존 `20260614_add_isStar_to_memo.sql` 포맷을 따른다.

```sql
-- 메모에 "느낀 점(impression)"과 "액션 아이템(actionItem)" 섹션 텍스트 컬럼 추가.
-- 기존 자유 텍스트 memo 컬럼과 독립된 고정 섹션. 둘 다 nullable.
ALTER TABLE memo.memo
  ADD COLUMN IF NOT EXISTS "impression" text;
ALTER TABLE memo.memo
  ADD COLUMN IF NOT EXISTS "actionItem" text;
```

- [ ] **Step 2: 마이그레이션을 Supabase에 적용**

프로젝트의 Supabase 마이그레이션 적용 방식(supabase CLI 또는 대시보드 SQL 실행)으로 위 SQL을 실행한다. 적용 후 `memo.memo` 테이블에 두 컬럼이 생겼는지 확인.

- [ ] **Step 3: 타입 재생성**

Run: `pnpm generate-supabase-type`
Expected: `packages/shared/src/types/supabase.ts`의 memo 테이블 Row/Insert/Update에 `impression`, `actionItem`이 추가됨.

> 만약 환경상 generate를 실행할 수 없으면, 아래 Step 4의 수동 편집으로 동일 결과를 만든다(generate 결과와 일치).

- [ ] **Step 4: (generate 불가 시 수동) supabase.ts에 필드 추가**

`packages/shared/src/types/supabase.ts`의 memo 테이블 정의에서 Row/Insert/Update 각각에 두 필드를 추가한다(생성기는 알파벳 순으로 배치하나, 배치 순서는 동작에 영향 없음).

Row 블록(현재 `category_id ... user_id`)에 추가:
```ts
    actionItem: string | null;
    impression: string | null;
```
Insert 블록에 추가:
```ts
    actionItem?: string | null;
    impression?: string | null;
```
Update 블록에 추가:
```ts
    actionItem?: string | null;
    impression?: string | null;
```

- [ ] **Step 5: 타입 체크**

Run: `pnpm type-check`
Expected: 통과.

- [ ] **Step 6: 커밋**

```bash
git add packages/supabase-edge-functions/supabase/migrations/20260622_add_note_sections_to_memo.sql packages/shared/src/types/supabase.ts
git commit -m "feat: 메모에 느낀 점·액션 아이템 섹션 컬럼 추가 및 타입 갱신"
```

---

### Task 2: 공유 계층 — 메모 검색을 새 섹션까지 확장 (TDD)

**Files:**
- Create: `packages/shared/src/utils/memoSearchFilter.ts`
- Create: `packages/shared/src/utils/memoSearchFilter.test.ts`
- Modify: `packages/shared/src/utils/Supabase.ts:136-141` (getMemosPaginated의 searchQuery `.or()`)

**Interfaces:**
- Produces: `getMemoSearchFilter(searchQuery: string): string` — Supabase `.or()`에 넣을 ilike 필터 문자열을 반환. `title`, `memo`, `impression`, `actionItem` 4개 컬럼 대상.
- Consumes: 없음.

- [ ] **Step 1: 실패하는 테스트 작성**

`packages/shared/src/utils/memoSearchFilter.test.ts`:
```ts
import { describe, expect, it } from "vitest";

import { getMemoSearchFilter } from "./memoSearchFilter";

describe("getMemoSearchFilter", () => {
	it("title/memo/impression/actionItem 네 컬럼에 대한 ilike OR 필터 문자열을 만든다", () => {
		expect(getMemoSearchFilter("hello")).toBe(
			"title.ilike.%hello%,memo.ilike.%hello%,impression.ilike.%hello%,actionItem.ilike.%hello%",
		);
	});
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test:jest -- packages/shared/src/utils/memoSearchFilter.test.ts`
Expected: FAIL — `getMemoSearchFilter` 모듈/함수 없음.

- [ ] **Step 3: 최소 구현**

`packages/shared/src/utils/memoSearchFilter.ts`:
```ts
/**
 * 메모 검색(searchQuery)을 Supabase `.or()` 필터 문자열로 변환한다.
 * title, memo, impression, actionItem 네 컬럼을 부분 일치(ilike)로 검색한다.
 */
export function getMemoSearchFilter(searchQuery: string): string {
	const pattern = `%${searchQuery}%`;

	return [
		`title.ilike.${pattern}`,
		`memo.ilike.${pattern}`,
		`impression.ilike.${pattern}`,
		`actionItem.ilike.${pattern}`,
	].join(",");
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm test:jest -- packages/shared/src/utils/memoSearchFilter.test.ts`
Expected: PASS.

- [ ] **Step 5: getMemosPaginated에 적용**

`packages/shared/src/utils/Supabase.ts`의 searchQuery 처리부(현재):
```ts
	if (searchQuery) {
		const pattern = `%${searchQuery}%`;
		query = query.or(`title.ilike.${pattern},memo.ilike.${pattern}`);
	}
```
다음으로 교체:
```ts
	if (searchQuery) {
		query = query.or(getMemoSearchFilter(searchQuery));
	}
```
그리고 파일 상단 import에 추가:
```ts
import { getMemoSearchFilter } from "./memoSearchFilter";
```

- [ ] **Step 6: 타입 체크 & 린트**

Run: `pnpm type-check`
Expected: 통과.
Run: `pnpm lint`
Expected: 통과.

- [ ] **Step 7: 커밋**

```bash
git add packages/shared/src/utils/memoSearchFilter.ts packages/shared/src/utils/memoSearchFilter.test.ts packages/shared/src/utils/Supabase.ts
git commit -m "feat: 메모 검색에 느낀 점·액션 아이템 컬럼 포함"
```

---

### Task 3: 익스텐션 사이드패널 작성 UI

**Files:**
- Modify: `pages/side-panel/src/types/Input.ts:1-6`
- Modify: `pages/side-panel/src/components/MemoSection/components/MemoForm/hooks/useMemoForm.ts`
- Modify: `pages/side-panel/src/components/MemoSection/components/MemoForm/index.tsx`
- Modify: `apps/chrome-extension/public/_locales/ko/messages.json`
- Modify: `apps/chrome-extension/public/_locales/en/messages.json`

**Interfaces:**
- Consumes: Task 1의 `MemoTable["Insert"]`(impression/actionItem 포함).
- Produces: `MemoInput`에 `impression: string`, `actionItem: string` 추가. `useMemoForm`에서 `handleImpressionChange(text: string)`, `handleActionItemChange(text: string)` 반환.

- [ ] **Step 1: MemoInput 타입에 필드 추가**

`pages/side-panel/src/types/Input.ts`:
```ts
export interface MemoInput {
	memo: string;
	impression: string;
	actionItem: string;
	isWish: boolean;
	isStar: boolean;
	categoryId: number | null;
}
```

- [ ] **Step 2: useMemoForm — 저장 페이로드/핸들러 확장**

`useMemoForm.ts`의 `SaveMemoOptions`(saveMemo overrides 타입)에 옵션 필드 추가:
```ts
	impression?: string;
	actionItem?: string;
```

`saveMemo` 내부 `memoInput` 구성을 다음으로 교체:
```ts
		const memoInput: MemoInput = {
			memo: overrides?.memo ?? currentValues.memo,
			impression: overrides?.impression ?? currentValues.impression,
			actionItem: overrides?.actionItem ?? currentValues.actionItem,
			isWish: overrides?.isWish ?? currentValues.isWish,
			isStar: overrides?.isStar ?? currentValues.isStar,
			categoryId: overrides?.categoryId ?? currentValues.categoryId,
		};
```

`upsertMemo` 호출의 `data` 블록을 다음으로 교체:
```ts
				data: {
					...tabInfo,
					memo: memoInput.memo,
					impression: memoInput.impression,
					actionItem: memoInput.actionItem,
					isWish: memoInput.isWish,
					isStar: memoInput.isStar,
					category_id: memoInput.categoryId,
				},
```

`handleMemoChange` 아래에 두 핸들러 추가(동일 debounce 저장 패턴):
```ts
	const handleImpressionChange = useCallback(
		(text: string) => {
			setValue("impression", text);
			debounce(() => saveMemo({ impression: text }));
		},
		[setValue, debounce, saveMemo],
	);

	const handleActionItemChange = useCallback(
		(text: string) => {
			setValue("actionItem", text);
			debounce(() => saveMemo({ actionItem: text }));
		},
		[setValue, debounce, saveMemo],
	);
```

훅의 return 객체에 `handleImpressionChange`, `handleActionItemChange`를 추가한다.

- [ ] **Step 3: 폼 기본값에 새 필드 추가**

`useMemoForm`에서 react-hook-form을 초기화(useForm defaultValues)하거나 `memoData`로 폼을 채우는(reset) 부분에, `memo`와 동일하게 두 필드를 추가한다:
```ts
	impression: memoData?.impression ?? "",
	actionItem: memoData?.actionItem ?? "",
```
(기존에 `memo: memoData?.memo ?? ""`를 설정하는 지점과 같은 곳에 추가.)

- [ ] **Step 4: MemoForm UI — 두 섹션 Textarea 추가**

`MemoForm/index.tsx`에서 `useMemoForm`의 반환에 `handleImpressionChange`, `handleActionItemChange`를 구조분해로 받고, 기존 메모 `Textarea` 아래에 라벨 + Textarea 두 쌍을 추가한다:
```tsx
<label htmlFor="impression-textarea" className="mt-3 text-xs font-semibold text-gray-500">
	{I18n.get("impression")}
</label>
<Textarea
	id="impression-textarea"
	className="resize-none text-sm outline-none"
	placeholder={I18n.get("impressionPlaceholder")}
	{...register("impression", {
		onChange: (event) => handleImpressionChange(event.target.value),
	})}
/>

<label htmlFor="action-item-textarea" className="mt-3 text-xs font-semibold text-gray-500">
	{I18n.get("actionItem")}
</label>
<Textarea
	id="action-item-textarea"
	className="resize-none text-sm outline-none"
	placeholder={I18n.get("actionItemPlaceholder")}
	{...register("actionItem", {
		onChange: (event) => handleActionItemChange(event.target.value),
	})}
/>
```
(`register`는 이미 MemoForm에서 사용 중인 react-hook-form의 것. `I18n`은 이 파일에서 이미 `I18n.get("memo")`로 사용 중인 동일 객체.)

- [ ] **Step 5: 익스텐션 i18n 메시지 추가**

`apps/chrome-extension/public/_locales/ko/messages.json`에 추가:
```json
	"impression": { "message": "느낀 점" },
	"impressionPlaceholder": { "message": "이 페이지에서 느낀 점을 적어보세요" },
	"actionItem": { "message": "액션 아이템" },
	"actionItemPlaceholder": { "message": "이 페이지를 보고 할 일을 적어보세요" }
```
`apps/chrome-extension/public/_locales/en/messages.json`에 추가:
```json
	"impression": { "message": "Impression" },
	"impressionPlaceholder": { "message": "Write what you felt about this page" },
	"actionItem": { "message": "Action items" },
	"actionItemPlaceholder": { "message": "Write what to do after reading this page" }
```

- [ ] **Step 6: 타입 체크 & 린트**

Run: `pnpm type-check`
Expected: 통과.
Run: `pnpm lint`
Expected: 통과.

- [ ] **Step 7: 커밋**

```bash
git add pages/side-panel/src/types/Input.ts pages/side-panel/src/components/MemoSection/components/MemoForm apps/chrome-extension/public/_locales/ko/messages.json apps/chrome-extension/public/_locales/en/messages.json
git commit -m "feat: 익스텐션 메모 작성에 느낀 점·액션 아이템 섹션 추가"
```

---

### Task 4: 웹 메모 작성 UI (MemoDialog)

**Files:**
- Modify: `apps/web/src/app/[lng]/(auth)/memos/_types/Input.ts:5-7`
- Modify: `apps/web/src/app/[lng]/(auth)/memos/_components/MemoDialog/index.tsx`
- Modify: `apps/web/src/modules/i18n/locales/ko/translation.json`
- Modify: `apps/web/src/modules/i18n/locales/en/translation.json`

**Interfaces:**
- Consumes: Task 1의 `MemoTable["Update"]`(impression/actionItem 포함), `useMemoPatchMutation`.
- Produces: 웹 `MemoInput`에 `impression: string`, `actionItem: string` 추가.

- [ ] **Step 1: MemoInput 타입에 필드 추가**

`apps/web/src/app/[lng]/(auth)/memos/_types/Input.ts`:
```ts
export type MemoInput = {
	memo: string;
	impression: string;
	actionItem: string;
};
```

- [ ] **Step 2: MemoDialog — 폼 기본값에 새 필드 추가**

`MemoDialog/index.tsx`에서 useForm defaultValues(또는 memoData로 폼을 채우는 지점)에 `memo`와 동일하게 추가:
```ts
	impression: memoData?.impression ?? "",
	actionItem: memoData?.actionItem ?? "",
```

- [ ] **Step 3: MemoDialog — saveMemo가 세 필드를 patch하도록 교체**

기존 `saveMemo`:
```ts
	const saveMemo = useCallback(() => {
		const currentMemo = watch("memo");
		const isEdited = currentMemo !== memoData?.memo;

		if (isEdited && currentMemo.trim() !== "") {
			mutateMemoPatch({
				id: memoId,
				request: {
					memo: currentMemo,
				},
			});
		}
	}, [watch, memoData?.memo, mutateMemoPatch, memoId]);
```
다음으로 교체:
```ts
	const saveMemo = useCallback(() => {
		const currentMemo = watch("memo");
		const currentImpression = watch("impression");
		const currentActionItem = watch("actionItem");

		const isEdited =
			currentMemo !== memoData?.memo ||
			currentImpression !== (memoData?.impression ?? "") ||
			currentActionItem !== (memoData?.actionItem ?? "");

		if (isEdited) {
			mutateMemoPatch({
				id: memoId,
				request: {
					memo: currentMemo,
					impression: currentImpression,
					actionItem: currentActionItem,
				},
			});
		}
	}, [
		watch,
		memoData?.memo,
		memoData?.impression,
		memoData?.actionItem,
		mutateMemoPatch,
		memoId,
	]);
```

- [ ] **Step 4: MemoDialog — 자동저장 watch 가드 교체**

기존 watch 구독:
```ts
		const subscription = watch((value) => {
			debounce(() => {
				if (!value.memo) return;

				saveMemo();
			}, 1_000);
		});
```
세 필드 중 하나라도 값이 있으면 저장하도록 교체:
```ts
		const subscription = watch((value) => {
			debounce(() => {
				if (!value.memo && !value.impression && !value.actionItem) return;

				saveMemo();
			}, 1_000);
		});
```

- [ ] **Step 5: MemoDialog — 두 섹션 Textarea 추가**

기존 메모 `Textarea` 아래에 라벨 + Textarea 두 쌍 추가(파일 상단에서 `useTranslation`으로 얻은 `t` 사용):
```tsx
<label className="mt-3 text-xs font-semibold text-gray-500">
	{t("memoSection.impression")}
</label>
<Textarea
	className="outline-none focus:border-gray-300 focus:outline-none"
	placeholder={t("memoSection.impressionPlaceholder")}
	{...register("impression")}
	data-testid="impression-textarea"
/>

<label className="mt-3 text-xs font-semibold text-gray-500">
	{t("memoSection.actionItem")}
</label>
<Textarea
	className="outline-none focus:border-gray-300 focus:outline-none"
	placeholder={t("memoSection.actionItemPlaceholder")}
	{...register("actionItem")}
	data-testid="action-item-textarea"
/>
```
(메모 `Textarea`가 `register`/`watch`가 아닌 다른 RHF 연결을 쓰면 동일 패턴을 따른다. 핵심은 `impression`/`actionItem` 필드를 폼에 등록하는 것.)

- [ ] **Step 6: 웹 i18n 키 추가**

`apps/web/src/modules/i18n/locales/ko/translation.json`에 `memoSection` 그룹 추가:
```json
"memoSection": {
	"memo": "메모",
	"impression": "느낀 점",
	"impressionPlaceholder": "이 페이지에서 느낀 점을 적어보세요",
	"actionItem": "액션 아이템",
	"actionItemPlaceholder": "이 페이지를 보고 할 일을 적어보세요"
}
```
`apps/web/src/modules/i18n/locales/en/translation.json`에 동일 키 추가:
```json
"memoSection": {
	"memo": "Memo",
	"impression": "Impression",
	"impressionPlaceholder": "Write what you felt about this page",
	"actionItem": "Action items",
	"actionItemPlaceholder": "Write what to do after reading this page"
}
```

- [ ] **Step 7: 타입 체크 & 린트**

Run: `pnpm type-check`
Expected: 통과.
Run: `pnpm lint`
Expected: 통과.

- [ ] **Step 8: 커밋**

```bash
git add apps/web/src/app/\[lng\]/\(auth\)/memos/_types/Input.ts apps/web/src/app/\[lng\]/\(auth\)/memos/_components/MemoDialog apps/web/src/modules/i18n/locales/ko/translation.json apps/web/src/modules/i18n/locales/en/translation.json
git commit -m "feat: 웹 메모 작성 다이얼로그에 느낀 점·액션 아이템 섹션 추가"
```

---

### Task 5: 웹 메모 표시 UI (MemoItem)

**Files:**
- Modify: `apps/web/src/app/[lng]/(auth)/memos/_components/MemoView/MemoItem.tsx:117-121`

**Interfaces:**
- Consumes: Task 1의 `GetMemoResponse`(impression/actionItem 포함), Task 4의 `memoSection.*` i18n 키.

- [ ] **Step 1: 채워진 섹션만 라벨과 함께 표시**

`MemoItem.tsx`에서 번역 함수 `t`를 확보한다. 이 컴포넌트가 `lng`를 받지 않으면 부모 `MemoView`에서 `lng`를 prop으로 내려주고, 컴포넌트 상단에서 `const { t } = useTranslation(lng);`로 얻는다(웹의 client 컴포넌트 번역 규칙: `@src/modules/i18n/util.client`).

기존 메모 본문 렌더링:
```tsx
{memo.memo && (
	<CardContent className="px-5 py-3 text-gray-700 dark:text-gray-300 leading-relaxed whitespace-break-spaces break-all">
		{memo.memo}
	</CardContent>
)}
```
바로 아래에 두 섹션 추가:
```tsx
{memo.impression && (
	<CardContent className="px-5 pb-3 text-gray-700 dark:text-gray-300 leading-relaxed whitespace-break-spaces break-all">
		<p className="mb-1 text-xs font-semibold text-gray-400">{t("memoSection.impression")}</p>
		{memo.impression}
	</CardContent>
)}
{memo.actionItem && (
	<CardContent className="px-5 pb-3 text-gray-700 dark:text-gray-300 leading-relaxed whitespace-break-spaces break-all">
		<p className="mb-1 text-xs font-semibold text-gray-400">{t("memoSection.actionItem")}</p>
		{memo.actionItem}
	</CardContent>
)}
```

- [ ] **Step 2: 타입 체크 & 린트**

Run: `pnpm type-check`
Expected: 통과.
Run: `pnpm lint`
Expected: 통과.

- [ ] **Step 3: 커밋**

```bash
git add apps/web/src/app/\[lng\]/\(auth\)/memos/_components/MemoView
git commit -m "feat: 웹 메모 목록에 느낀 점·액션 아이템 표시"
```

---

### Task 6: 앱 작성 UI (MemoPanel) + 로컬 메모 타입/저장

**Files:**
- Modify: `apps/app/lib/storage/localMemo.ts:5-16` (LocalMemo 인터페이스 + upsert 페이로드 처리)
- Modify: `apps/app/lib/hooks/useLocalMemos.ts` (로컬 upsert 호출 페이로드)
- Modify: `apps/app/lib/hooks/useMemoMutation.ts` (supabase upsert 호출 페이로드 타입)
- Modify: `apps/app/app/(main)/browser/_components/MemoPanel.tsx`

**Interfaces:**
- Consumes: Task 1의 `MemoTable["Insert"]`.
- Produces: `LocalMemo`에 `impression?: string`, `actionItem?: string` 추가. MemoPanel이 세 섹션을 저장.

- [ ] **Step 1: LocalMemo 인터페이스에 필드 추가**

`apps/app/lib/storage/localMemo.ts`:
```ts
export interface LocalMemo {
	id: string;
	url: string;
	title: string;
	memo: string;
	impression?: string;
	actionItem?: string;
	favIconUrl?: string;
	createdAt: string;
	updatedAt: string;
	synced: boolean;
	isWish?: boolean;
	isStar?: boolean;
}
```
같은 파일의 `upsertMemo`(로컬 저장 함수)가 입력 페이로드를 객체에 펼쳐 저장한다면 자동 반영된다. 명시 필드만 골라 저장하는 구조라면 `impression`, `actionItem`도 저장 객체에 포함하도록 추가한다.

- [ ] **Step 2: 로컬/Supabase upsert 페이로드 타입 확장**

`apps/app/lib/hooks/useLocalMemos.ts`의 `useLocalMemoUpsert` 입력 페이로드 타입(또는 upsertMemo 호출부)에 `impression?: string`, `actionItem?: string`를 포함시킨다.

`apps/app/lib/hooks/useMemoMutation.ts`의 supabase upsert가 받는 페이로드는 `MemoTable["Insert"]`에 기반하므로 Task 1 이후 자동으로 두 필드를 허용한다. 별도 좁은 타입을 쓰고 있으면 `impression?`, `actionItem?`를 추가한다.

- [ ] **Step 3: MemoPanel — 기존 메모 로드에 두 필드 포함**

`MemoPanel.tsx`의 existingMemo 구성(현재):
```tsx
	const existingMemo = isLoggedIn
		? supabaseMemo
			? { memo: supabaseMemo.memo }
			: null
		: localMemo;
```
다음으로 교체:
```tsx
	const existingMemo = isLoggedIn
		? supabaseMemo
			? {
					memo: supabaseMemo.memo,
					impression: supabaseMemo.impression ?? "",
					actionItem: supabaseMemo.actionItem ?? "",
				}
			: null
		: localMemo;
```

- [ ] **Step 4: MemoPanel — 두 섹션 상태 + 초기화**

`memoText` state 옆에 두 state를 추가:
```tsx
	const [impressionText, setImpressionText] = useState("");
	const [actionItemText, setActionItemText] = useState("");
```
`existingMemo`로 `memoText`를 초기화하는 `useEffect`에서 두 state도 함께 초기화:
```tsx
		setImpressionText(existingMemo?.impression ?? "");
		setActionItemText(existingMemo?.actionItem ?? "");
```
(기존에 `setMemoText(existingMemo?.memo ?? "")`를 하는 동일 effect에 추가.)

- [ ] **Step 5: MemoPanel — 저장 페이로드/가드 교체**

기존 `handleSave`:
```tsx
	const handleSave = () => {
		if (!memoText.trim()) return;

		if (isLoggedIn) {
			const payload = {
				url,
				title: pageTitle || url,
				memo: memoText.trim(),
				favIconUrl: favIconUrl ?? null,
			};
			supabaseUpsert.mutate(payload, { onSuccess: onSaveSuccess });
		} else {
			const payload = {
				url,
				title: pageTitle || url,
				memo: memoText.trim(),
				favIconUrl,
			};
			localUpsert.mutate(payload, { onSuccess: onSaveSuccess });
		}
	};
```
다음으로 교체(세 섹션 중 하나라도 있으면 저장):
```tsx
	const handleSave = () => {
		if (!memoText.trim() && !impressionText.trim() && !actionItemText.trim()) return;

		if (isLoggedIn) {
			const payload = {
				url,
				title: pageTitle || url,
				memo: memoText.trim(),
				impression: impressionText.trim(),
				actionItem: actionItemText.trim(),
				favIconUrl: favIconUrl ?? null,
			};
			supabaseUpsert.mutate(payload, { onSuccess: onSaveSuccess });
		} else {
			const payload = {
				url,
				title: pageTitle || url,
				memo: memoText.trim(),
				impression: impressionText.trim(),
				actionItem: actionItemText.trim(),
				favIconUrl,
			};
			localUpsert.mutate(payload, { onSuccess: onSaveSuccess });
		}
	};
```

- [ ] **Step 6: MemoPanel — 두 섹션 TextInput 추가**

기존 메모 `TextInput`(현재):
```tsx
<TextInput
	className="flex-1 text-[15px] text-[#333] leading-[22px]"
	placeholder="이 페이지에 대한 메모를 작성하세요..."
	value={memoText}
	onChangeText={setMemoText}
	multiline
	textAlignVertical="top"
/>
```
아래에 라벨 + TextInput 두 쌍 추가(앱은 인라인 한글):
```tsx
<Text className="mt-3 text-xs font-semibold text-gray-500">느낀 점</Text>
<TextInput
	className="text-[15px] text-[#333] leading-[22px]"
	placeholder="이 페이지에서 느낀 점을 적어보세요"
	value={impressionText}
	onChangeText={setImpressionText}
	multiline
	textAlignVertical="top"
/>

<Text className="mt-3 text-xs font-semibold text-gray-500">액션 아이템</Text>
<TextInput
	className="text-[15px] text-[#333] leading-[22px]"
	placeholder="이 페이지를 보고 할 일을 적어보세요"
	value={actionItemText}
	onChangeText={setActionItemText}
	multiline
	textAlignVertical="top"
/>
```
(레이아웃이 `flex-1` 단일 입력 전제로 짜여 있으면, 세 입력이 세로로 쌓이도록 컨테이너를 `ScrollView` 또는 적절한 높이로 조정. 기존 패널 레이아웃 패턴을 따른다.)

- [ ] **Step 7: 타입 체크 & 린트**

Run: `pnpm type-check`
Expected: 통과.
Run: `pnpm lint`
Expected: 통과.

- [ ] **Step 8: 커밋**

```bash
git add apps/app/lib/storage/localMemo.ts apps/app/lib/hooks/useLocalMemos.ts apps/app/lib/hooks/useMemoMutation.ts apps/app/app/\(main\)/browser/_components/MemoPanel.tsx
git commit -m "feat: 앱 메모 작성 패널에 느낀 점·액션 아이템 섹션 추가"
```

---

### Task 7: 앱 표시 UI + 빈 메모 판정 보강

**Files:**
- Modify: `apps/app/app/(main)/_components/MemoCard.tsx:91-98`
- Modify: `apps/app/app/(main)/_components/MemoDetailModal.tsx:171-173`
- Modify: `apps/app/app/(main)/browser/_hooks/useBrowserState.ts:162-166`

**Interfaces:**
- Consumes: Task 1의 `GetMemoResponse`, Task 6의 `LocalMemo`(둘 다 impression/actionItem 보유). `MemoItem = LocalMemo | GetMemoResponse`.

- [ ] **Step 1: MemoCard — 두 섹션 미리보기 추가**

기존 메모 본문 미리보기:
```tsx
{memo.memo && (
	<Text
		className="text-sm text-secondary-foreground leading-5 mb-1.5"
		numberOfLines={10}
	>
		{memo.memo}
	</Text>
)}
```
아래에 추가:
```tsx
{memo.impression ? (
	<Text
		className="text-sm text-secondary-foreground leading-5 mb-1.5"
		numberOfLines={4}
	>
		느낀 점: {memo.impression}
	</Text>
) : null}
{memo.actionItem ? (
	<Text
		className="text-sm text-secondary-foreground leading-5 mb-1.5"
		numberOfLines={4}
	>
		액션 아이템: {memo.actionItem}
	</Text>
) : null}
```

- [ ] **Step 2: MemoDetailModal — 두 섹션 읽기 표시**

모달이 `memo` 객체(`MemoItem`)에 접근 가능하므로 `memoText` 표시 아래에 채워진 섹션만 추가한다. 기존:
```tsx
<Text className="text-[15px] text-[#333] leading-[22px]">
	{memoText}
</Text>
```
아래에 추가(모달이 받는 `memo` prop에서 값 사용; `memoText`를 만드는 동일 출처에서 `impression`/`actionItem`도 꺼낸다):
```tsx
{memo?.impression ? (
	<View className="mt-3">
		<Text className="text-xs font-semibold text-gray-500 mb-1">느낀 점</Text>
		<Text className="text-[15px] text-[#333] leading-[22px]">{memo.impression}</Text>
	</View>
) : null}
{memo?.actionItem ? (
	<View className="mt-3">
		<Text className="text-xs font-semibold text-gray-500 mb-1">액션 아이템</Text>
		<Text className="text-[15px] text-[#333] leading-[22px]">{memo.actionItem}</Text>
	</View>
) : null}
```
(`View`가 import되어 있지 않으면 `react-native`에서 import 추가.)

- [ ] **Step 3: 빈 메모 판정에 두 섹션 포함**

`useBrowserState.ts`의 위시 취소 시 빈 메모 삭제 판정(현재):
```ts
		const currentMemo = isLoggedIn ? supabaseMemo : localMemo;
		const shouldDeleteEmptyMemo =
			isCurrentPageWish && !currentMemo?.memo?.trim() && !currentMemo?.isStar;
```
다음으로 교체(느낀 점·액션 아이템이 있으면 삭제 금지):
```ts
		const currentMemo = isLoggedIn ? supabaseMemo : localMemo;
		const shouldDeleteEmptyMemo =
			isCurrentPageWish &&
			!currentMemo?.memo?.trim() &&
			!currentMemo?.impression?.trim() &&
			!currentMemo?.actionItem?.trim() &&
			!currentMemo?.isStar;
```

- [ ] **Step 4: 타입 체크 & 린트**

Run: `pnpm type-check`
Expected: 통과.
Run: `pnpm lint`
Expected: 통과.

- [ ] **Step 5: 커밋**

```bash
git add apps/app/app/\(main\)/_components/MemoCard.tsx apps/app/app/\(main\)/_components/MemoDetailModal.tsx apps/app/app/\(main\)/browser/_hooks/useBrowserState.ts
git commit -m "feat: 앱 메모 카드·상세에 느낀 점·액션 아이템 표시 및 빈 메모 판정 보강"
```

---

### Task 8: i18n 검증 + 통합 수동 검증

**Files:** 없음(검증 전용).

- [ ] **Step 1: i18n 완전성 검증**

Run: `/i18n-check`
Expected: 웹 ko/en에 `memoSection.*` 키가 양쪽 모두 존재하고 누락 없음.

- [ ] **Step 2: 전체 타입 체크 & 린트**

Run: `pnpm type-check`
Expected: 통과.
Run: `pnpm lint`
Expected: 통과.

- [ ] **Step 3: 단위 테스트**

Run: `pnpm test:jest -- packages/shared/src/utils/memoSearchFilter.test.ts`
Expected: PASS.

- [ ] **Step 4: 통합 수동 검증**

다음을 수동 확인:
1. 익스텐션 사이드패널에서 한 페이지에 메모/느낀 점/액션 아이템을 각각 입력 → 자동 저장됨.
2. 웹 메모 목록에서 같은 메모를 열면 세 섹션이 모두 보이고 편집 가능 → 저장됨.
3. 앱 브라우저 패널에서 같은 페이지를 열면 세 섹션이 로드되고 저장됨. 메모 카드/상세에 채워진 섹션만 표시.
4. 기존(섹션 미입력) 메모가 정상 표시·편집되는지(하위호환).
5. 앱에서 메모 본문은 비우고 느낀 점만 있는 페이지의 위시를 취소해도 레코드가 삭제되지 않는지.

---

## Self-Review

- **Spec coverage:**
  - §3.2 데이터 모델(컬럼 2개) → Task 1 ✅
  - §3.3 공유 계층(검색 확장, insert/update 통과) → Task 2 + Task 1 타입(insert/update는 `MemoTable` 기반이라 자동 통과) ✅
  - §3.4 작성 UI(익스텐션/웹/앱) → Task 3 / Task 4 / Task 6 ✅
  - §3.5 표시 UI(웹/앱) → Task 5 / Task 7 ✅
  - §3.6 i18n → Task 3·4 키 추가 + Task 8 검증 ✅
  - §3.7 하위호환 & 빈 메모 판정 보강 → Task 7 Step 3 + Task 8 Step 4 ✅
- **Placeholder scan:** 코드 스텝은 실제 코드 포함. 로컬 코드 미인용 지점(폼 defaultValues/reset, 로컬 upsert 페이로드)은 "추가할 정확한 필드와 값"을 명시(TBD/막연한 지시 아님). ✅
- **Type consistency:** 컬럼명 `impression`/`actionItem` 전 태스크 일관. `getMemoSearchFilter` 시그니처 Task 2 정의·사용 일치. `MemoInput`(익스텐션 6필드, 웹 3필드) 각 플랫폼 정의와 사용 일치. ✅
