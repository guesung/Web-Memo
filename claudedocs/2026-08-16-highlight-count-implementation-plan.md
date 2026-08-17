# 하이라이트 개수 표시 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사용자가 하이라이트를 몇 개 그었는지 모바일 브라우저(현재 페이지), 웹 대시보드(출처별), 앱 메모 목록(메모별) 세 곳에서 보여준다.

**Architecture:** URL별 개수를 세는 RPC 함수 하나(`memo.get_highlight_counts`)를 만들어 웹 대시보드와 앱 메모 목록이 공유한다. 모바일 브라우저의 현재 페이지 개수는 이미 그 URL의 하이라이트를 전부 가져오고 있으므로 `rows.length`로 계산하며 RPC를 쓰지 않는다. 함수는 `security invoker`(기본값)로 두어 기존 RLS 정책이 그대로 적용되게 한다.

**Tech Stack:** PostgreSQL RPC, Supabase, TanStack Query v5, React Native/Expo(`apps/app`), Next.js App Router(`apps/web`), Vitest

**설계 문서:** `claudedocs/2026-08-16-highlight-count-design.md` — 판단 근거는 여기 있다. 구현 중 애매하면 먼저 읽는다.

**선행 작업:** 하이라이트 기능 (PR #404, 브랜치 `feat/highlight`). 이 브랜치(`feat/highlight-count`)는 그 위에서 분기했다.

## Global Constraints

- 커밋 메시지는 **한글**, 브랜치명은 영문. 현재 브랜치는 `feat/highlight-count`이며 바꾸지 않는다.
- 파일 300줄 이하 유지.
- 파일명은 **camelCase**, 컴포넌트 파일만 PascalCase. 디렉토리는 lowercase-with-dashes.
- 타입에 `IF`/`T` 접두사를 붙이지 않는다 (기존 `MemoSortBy`, `HighlightGroup`을 따른다).
- **non-null assertion(`!`) 금지.** `biome.json`에 `noNonNullAssertion: "warn"`이 있고 `pnpm lint` 출력은 깨끗해야 한다.
- 인라인 `<svg>` 금지 — 아이콘은 `lucide-react`(웹) / `lucide-react-native`(앱).
- 조건부 텍스트에 `lng === "ko"` 패턴 금지. 항상 `useTranslation` + 번역 키. 번역 키는 **ko/en 양쪽에** 넣는다.
- 테스트 파일은 소스 옆에 `*.test.ts`로 둔다.
- 테스트 실행: **`pnpm test:jest run <path>`**. `pnpm test:jest -- --run` 형태는 pnpm이 `--run`을 경로 필터로 넘겨 전체가 돌고 watch 모드에 빠진다.
- 루트 `vitest.config.ts`의 기본 environment는 **node**다. DOM이 필요한 테스트만 첫 줄에 `// @vitest-environment jsdom`을 넣는다.
- 전체 검증: `pnpm type-check && pnpm lint`.
- 이 레포는 **탭 들여쓰기**를 쓴다.
- 각 Task 끝의 커밋은 해당 Task가 만든 파일만 담는다. `git add .` 금지.
- **`git stash` 계열 명령 금지.** `stash@{0}`에 사용자의 작업물이 보관되어 있다.
- **개수 조회 실패는 본 기능을 막지 않는다.** 배지만 안 보이고 목록은 그대로 동작해야 한다. 개수 쿼리 에러를 토스트로 알리지 않는다.

---

### Task 1: RPC 마이그레이션과 서비스 계층

**Files:**
- Create: `packages/supabase-edge-functions/supabase/migrations/20260816_add_highlight_counts_function.sql`
- Modify: `packages/shared/src/utils/supabase/highlightService.ts`
- Modify: `packages/shared/src/constants/QueryKey.ts`
- Test: `packages/shared/src/utils/highlightService.test.ts`
- Test: `packages/shared/src/constants/QueryKey.test.ts`

**Interfaces:**
- Consumes: `SUPABASE` 상수, `MemoSupabaseClient` 타입, 기존 `HighlightService` 클래스
- Produces:
  - `HighlightService.getHighlightCounts(urls: string[])` — RPC 호출, `{ data: HighlightCountRow[] | null, error }` 반환
  - `interface HighlightCountRow { url: string; count: number }`
  - `QUERY_KEY.highlightCounts(urls: string[])` → `["highlights", "counts", <정렬된 URL 배열>]`

- [ ] **Step 1: 마이그레이션 SQL 작성**

`packages/supabase-edge-functions/supabase/migrations/20260816_add_highlight_counts_function.sql`:

```sql
-- URL별 하이라이트 개수를 세어 반환한다.
-- security invoker(기본값)이므로 memo.highlight의 RLS 정책(auth.uid() = user_id)이
-- 그대로 적용되어 호출자 본인의 하이라이트만 집계된다.
create function memo.get_highlight_counts(target_urls text[])
returns table (url text, count int)
language sql
stable
as $$
  select h.url, count(*)::int
  from memo.highlight h
  where h.url = any(target_urls)
  group by h.url;
$$;

grant execute on function memo.get_highlight_counts(text[]) to authenticated;

comment on function memo.get_highlight_counts(text[]) is
  'Returns highlight counts per URL for the calling user. RLS on memo.highlight restricts rows to the caller.';
```

`count(*)`는 `bigint`를 반환하는데 PostgREST가 이를 JSON 문자열로 직렬화할 수 있어 클라이언트에서 `"12"`를 받게 된다. `::int` 캐스팅으로 숫자를 보장한다. 하이라이트 개수가 `int` 범위를 넘을 일은 없다.

기존 RPC(`20241208_add_active_users_stats.sql:44`)가 `GRANT EXECUTE ... TO authenticated`와 `COMMENT ON FUNCTION`을 쓰는 관례를 따랐다. 다만 그 함수는 `SECURITY DEFINER`인데(관리자 통계라 전체 집계 필요), 우리는 호출자 본인 데이터만 세야 하므로 `security invoker`가 맞다.

- [ ] **Step 2: 마이그레이션 적용**

이 저장소는 원격에만 있는 마이그레이션이 9개라 `supabase db push`가 거부된다(`Remote migration versions not found in local migrations directory`). 하이라이트 테이블도 대시보드로 직접 적용했다.

**Supabase 대시보드(프로젝트 `czwtqukymcqoberdoltq`) → SQL Editor에 위 SQL을 붙여넣고 실행한다.**

적용 후 확인:

```bash
cd apps/app
URL=$(grep '^EXPO_PUBLIC_SUPABASE_URL=' .env | cut -d= -f2- | tr -d '"')
KEY=$(grep '^EXPO_PUBLIC_SUPABASE_ANON_KEY=' .env | cut -d= -f2- | tr -d '"')
curl -s -X POST "$URL/rest/v1/rpc/get_highlight_counts" \
  -H "apikey: $KEY" -H "Content-Type: application/json" \
  -H "Content-Profile: memo" \
  -d '{"target_urls":["https://example.com"]}' -w "\n[HTTP %{http_code}]"
```

기대: `[]`와 HTTP 200. 함수가 없으면 `PGRST202`가 나온다.

**빈 배열이 나오는 것이 정상이다** — anon 키로는 로그인 사용자가 아니라 RLS가 모든 행을 막는다. 함수가 존재하고 호출 가능하다는 것만 확인하는 단계다.

- [ ] **Step 3: 쿼리 키 테스트를 먼저 작성**

`packages/shared/src/constants/QueryKey.test.ts`에 케이스를 추가한다(파일이 이미 있다):

```typescript
describe("QUERY_KEY.highlightCounts", () => {
	it("URL 배열을 키에 포함한다", () => {
		expect(QUERY_KEY.highlightCounts(["https://a.com"])).toEqual([
			"highlights",
			"counts",
			["https://a.com"],
		]);
	});

	it("URL 순서가 달라도 같은 키를 만든다", () => {
		const first = QUERY_KEY.highlightCounts(["https://b.com", "https://a.com"]);
		const second = QUERY_KEY.highlightCounts(["https://a.com", "https://b.com"]);

		expect(first).toEqual(second);
	});

	it("원본 배열을 변형하지 않는다", () => {
		const urls = ["https://b.com", "https://a.com"];
		QUERY_KEY.highlightCounts(urls);

		expect(urls).toEqual(["https://b.com", "https://a.com"]);
	});
});
```

세 번째 테스트가 중요하다. `Array.prototype.sort`는 **제자리 정렬**이라 인자로 받은 배열을 그대로 정렬하면 호출한 쪽의 배열이 바뀐다. React 상태나 쿼리 결과 배열을 넘기면 예측 못 한 리렌더나 버그가 생긴다.

- [ ] **Step 4: 테스트 실패 확인**

```bash
pnpm test:jest run packages/shared/src/constants/QueryKey.test.ts
```

기대: FAIL — `QUERY_KEY.highlightCounts is not a function`

- [ ] **Step 5: 쿼리 키 구현**

`packages/shared/src/constants/QueryKey.ts`의 `QUERY_KEY` 객체에 추가한다:

```typescript
	highlightCounts: (urls: string[]) => [
		"highlights",
		"counts",
		[...urls].sort(),
	],
```

`[...urls]`로 복사한 뒤 정렬한다. 순서가 달라도 같은 캐시를 쓰게 하면서 원본은 건드리지 않는다.

- [ ] **Step 6: 테스트 통과 확인**

```bash
pnpm test:jest run packages/shared/src/constants/QueryKey.test.ts
```

기대: PASS

- [ ] **Step 7: 서비스 테스트를 먼저 작성**

`packages/shared/src/utils/highlightService.test.ts`에 추가한다. 기존 목(mock)은 쿼리 빌더용이라 RPC를 처리하지 못하므로 **`rpc` 메서드를 목에 추가해야 한다.**

먼저 기존 `createMockClient`에 `rpc`를 추가한다:

```typescript
interface RecordedCalls {
	schema: string[];
	from: string[];
	select: string[];
	eq: [string, unknown][];
	or: string[];
	order: [string, unknown][];
	limit: number[];
	rpc: [string, unknown][];
}
```

`createMockClient` 안의 `calls` 초기값에 `rpc: []`를 넣고, `client` 객체에 `rpc`를 추가한다:

```typescript
	const client = {
		schema: (name: string) => {
			calls.schema.push(name);
			return {
				from: (table: string) => {
					calls.from.push(table);
					return builder;
				},
				rpc: (fn: string, params: unknown) => {
					calls.rpc.push([fn, params]);
					return builder;
				},
			};
		},
	} as unknown as MemoSupabaseClient;
```

그리고 테스트를 추가한다:

```typescript
describe("HighlightService.getHighlightCounts", () => {
	it("URL 배열을 target_urls 파라미터로 넘긴다", async () => {
		const { client, calls } = createMockClient();
		await new HighlightService(client).getHighlightCounts([
			"https://a.com",
			"https://b.com",
		]);

		expect(calls.rpc).toContainEqual([
			"get_highlight_counts",
			{ target_urls: ["https://a.com", "https://b.com"] },
		]);
	});

	it("memo 스키마에서 호출한다", async () => {
		const { client, calls } = createMockClient();
		await new HighlightService(client).getHighlightCounts(["https://a.com"]);

		expect(calls.schema).toContain("memo");
	});
});
```

- [ ] **Step 8: 테스트 실패 확인**

```bash
pnpm test:jest run packages/shared/src/utils/highlightService.test.ts
```

기대: FAIL — `getHighlightCounts is not a function`

- [ ] **Step 9: 서비스 메서드 구현**

`packages/shared/src/utils/supabase/highlightService.ts`에 타입과 메서드를 추가한다.

파일 상단(다른 인터페이스 옆)에:

```typescript
/** URL별 하이라이트 개수. `get_highlight_counts` RPC의 반환 행 */
export interface HighlightCountRow {
	url: string;
	count: number;
}
```

클래스 안에:

```typescript
	/**
	 * URL별 하이라이트 개수를 조회한다.
	 * @description RLS가 적용되므로 호출자 본인의 하이라이트만 집계된다.
	 * 개수가 0인 URL은 결과에 포함되지 않으므로, 호출 측이 없으면 0으로 취급해야 한다.
	 */
	getHighlightCounts = async (urls: string[]) =>
		this.supabaseClient
			.schema(SUPABASE.schema.memo)
			.rpc("get_highlight_counts", { target_urls: urls });
```

**`SUPABASE.table.highlight`가 아니라 `SUPABASE.schema.memo`를 쓴다.** 이건 테이블 조회가 아니라 스키마 수준의 함수 호출이다.

- [ ] **Step 10: 테스트 통과 확인**

```bash
pnpm test:jest run packages/shared/src/utils/highlightService.test.ts
pnpm test:jest run packages/shared/src/constants/QueryKey.test.ts
```

기대: 둘 다 PASS

- [ ] **Step 11: 타입 체크 후 커밋**

```bash
pnpm -F @web-memo/shared type-check && pnpm lint
git add packages/supabase-edge-functions/supabase/migrations/20260816_add_highlight_counts_function.sql \
        packages/shared/src/utils/supabase/highlightService.ts \
        packages/shared/src/utils/highlightService.test.ts \
        packages/shared/src/constants/QueryKey.ts \
        packages/shared/src/constants/QueryKey.test.ts
git commit -m "feat: URL별 하이라이트 개수 조회 RPC와 서비스 계층 추가"
```

---

### Task 2: 개수 배열을 Map으로 바꾸는 공용 유틸

**Files:**
- Create: `packages/shared/src/modules/highlight/countMap.ts`
- Modify: `packages/shared/src/modules/highlight/index.ts`
- Test: `packages/shared/src/modules/highlight/countMap.test.ts`

**Interfaces:**
- Consumes: `HighlightCountRow` (Task 1)
- Produces: `toHighlightCountMap(rows: HighlightCountRow[]): Map<string, number>`

RPC는 개수가 0인 URL을 반환하지 않는다. 앱과 웹 양쪽이 "없으면 0"이라는 같은 규칙을 써야 하므로 변환을 한 곳에 둔다.

- [ ] **Step 1: 실패하는 테스트 작성**

`packages/shared/src/modules/highlight/countMap.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { toHighlightCountMap } from "./countMap";

describe("toHighlightCountMap", () => {
	it("행을 url → count 맵으로 바꾼다", () => {
		const map = toHighlightCountMap([
			{ url: "https://a.com", count: 3 },
			{ url: "https://b.com", count: 1 },
		]);

		expect(map.get("https://a.com")).toBe(3);
		expect(map.get("https://b.com")).toBe(1);
	});

	it("없는 url은 undefined를 반환한다", () => {
		const map = toHighlightCountMap([{ url: "https://a.com", count: 3 }]);

		expect(map.get("https://none.com")).toBeUndefined();
	});

	it("빈 배열은 빈 맵을 만든다", () => {
		expect(toHighlightCountMap([]).size).toBe(0);
	});

	it("같은 url이 중복되면 마지막 값을 쓴다", () => {
		const map = toHighlightCountMap([
			{ url: "https://a.com", count: 1 },
			{ url: "https://a.com", count: 5 },
		]);

		expect(map.get("https://a.com")).toBe(5);
	});
});
```

마지막 케이스는 방어적이다. `group by url`이라 중복이 나올 수 없지만, 동작이 정의되어 있으면 나중에 RPC가 바뀌어도 예측 가능하다.

- [ ] **Step 2: 테스트 실패 확인**

```bash
pnpm test:jest run packages/shared/src/modules/highlight/countMap.test.ts
```

기대: FAIL — 모듈을 찾을 수 없음

- [ ] **Step 3: 구현**

`packages/shared/src/modules/highlight/countMap.ts`:

```typescript
import type { HighlightCountRow } from "../../utils/supabase/highlightService";

/**
 * RPC가 돌려준 개수 행을 url → count 맵으로 바꾼다.
 * @description RPC는 개수가 0인 url을 반환하지 않으므로, 조회 결과에 없는 url은
 * 맵에도 없다. 호출 측은 `map.get(url) ?? 0` 형태로 0을 채워야 한다.
 */
export function toHighlightCountMap(
	rows: HighlightCountRow[],
): Map<string, number> {
	return new Map(rows.map((row) => [row.url, row.count]));
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
pnpm test:jest run packages/shared/src/modules/highlight/countMap.test.ts
```

기대: PASS (4 케이스)

- [ ] **Step 5: 배럴에 export 추가**

`packages/shared/src/modules/highlight/index.ts`에 한 줄 추가한다. **`./injected/highlightScript` export보다 앞에** 둔다(생성 파일은 마지막에 유지):

```typescript
export * from "./countMap";
```

- [ ] **Step 6: 타입 체크 후 커밋**

```bash
pnpm -F @web-memo/shared type-check && pnpm lint
git add packages/shared/src/modules/highlight/countMap.ts \
        packages/shared/src/modules/highlight/countMap.test.ts \
        packages/shared/src/modules/highlight/index.ts
git commit -m "feat: 하이라이트 개수 행을 맵으로 변환하는 유틸 추가"
```

---

### Task 3: 모바일 브라우저 — 현재 페이지 개수 배지

**Files:**
- Modify: `apps/app/app/(main)/browser/_components/BrowserHeader.tsx`
- Modify: `apps/app/app/(main)/browser/index.tsx`

**Interfaces:**
- Consumes: `useWebViewHighlights`의 `rows` (하이라이트 기능에서 이미 반환 중)
- Produces: `BrowserHeader`의 새 prop `highlightCount: number`

**RPC를 쓰지 않는다.** `useHighlightsByUrl`이 이미 그 URL의 하이라이트를 전부 가져오므로 `rows.length`가 정확하다.

- [ ] **Step 1: 기존 헤더 구조 확인**

`apps/app/app/(main)/browser/_components/BrowserHeader.tsx`를 읽는다. `interface BrowserHeaderProps`(17행 부근)에 props가 나열되어 있고, 아이콘 버튼들(공유·새로고침·홈·블로그·북마크·위시)이 한 줄에 배치되어 있다. 배지를 어디에 붙일지는 그 구조를 보고 정한다.

`lucide-react-native`의 `Highlighter` 아이콘을 쓴다(웹 사이드바와 같은 아이콘이라 일관된다).

- [ ] **Step 2: props에 개수 추가**

`interface BrowserHeaderProps`에 한 줄 추가한다:

```typescript
	/** 현재 페이지에 저장된 하이라이트 개수. 0이면 표시하지 않는다 */
	highlightCount: number;
```

함수 시그니처의 구조분해에도 `highlightCount`를 추가한다.

- [ ] **Step 3: 배지 렌더**

아이콘 열에 추가한다. **개수가 0이면 아무것도 렌더하지 않는다** — 하이라이트를 안 그은 페이지가 대부분이라 "0"이 항상 떠 있으면 시끄럽다.

```tsx
{highlightCount > 0 ? (
	<View className="flex-row items-center gap-1 px-1">
		<Highlighter size={16} color="#facc15" />
		<Text className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
			{highlightCount}
		</Text>
	</View>
) : null}
```

색상 `#facc15`는 기본 하이라이트 색(yellow)의 `bar` 값이다. `HIGHLIGHT_COLOR_STYLE.yellow.bar`에서 가져와 쓰면 상수와 연결되지만, `lucide-react-native`는 `color` prop에 문자열을 받으므로 import가 하나 늘어난다. **상수에서 가져오는 쪽을 택한다** — 나중에 기본색이 바뀌면 같이 따라간다.

```typescript
import { HIGHLIGHT_COLOR_STYLE } from "@web-memo/shared/constants";
// ...
<Highlighter size={16} color={HIGHLIGHT_COLOR_STYLE.yellow.bar} />
```

정확한 배치와 클래스는 기존 아이콘 버튼들의 것을 보고 맞춘다.

- [ ] **Step 4: index.tsx에서 개수 전달**

`apps/app/app/(main)/browser/index.tsx`에서 `<BrowserHeader ...>`에 prop을 넘긴다. `useWebViewHighlights`의 반환값은 이미 `highlights` 변수에 담겨 있다:

```tsx
highlightCount={highlights.rows.length}
```

- [ ] **Step 5: 검증**

```bash
pnpm type-check
pnpm lint
```

기대: 통과. **이 태스크는 자동 테스트가 없다** — RN 컴포넌트 테스트 선례가 이 레포에 없고, 실제 확인은 실기기에서 한다.

- [ ] **Step 6: 커밋**

```bash
git add "apps/app/app/(main)/browser/_components/BrowserHeader.tsx" \
        "apps/app/app/(main)/browser/index.tsx"
git commit -m "feat: 브라우저 헤더에 현재 페이지 하이라이트 개수 표시"
```

---

### Task 4: 웹 대시보드 — 출처별 개수

**Files:**
- Create: `apps/web/src/app/[lng]/(auth)/highlights/_hooks/useHighlightCounts.ts`
- Modify: `apps/web/src/app/[lng]/(auth)/highlights/_hooks/index.ts`
- Modify: `apps/web/src/app/[lng]/(auth)/highlights/_components/HighlightView.tsx`
- Modify: `apps/web/src/app/[lng]/(auth)/highlights/_components/HighlightGroupCard.tsx`
- Modify: `apps/web/src/modules/i18n/locales/ko/translation.json`
- Modify: `apps/web/src/modules/i18n/locales/en/translation.json`

**Interfaces:**
- Consumes: `HighlightService.getHighlightCounts` (Task 1), `toHighlightCountMap` (Task 2), `QUERY_KEY.highlightCounts` (Task 1), `useSupabaseClientQuery`
- Produces:
  - `useHighlightCounts(urls: string[]): Map<string, number>`
  - `HighlightGroupCard`의 새 prop `count: number`

- [ ] **Step 1: 개수 조회 훅 작성**

`apps/web/src/app/[lng]/(auth)/highlights/_hooks/useHighlightCounts.ts`:

```typescript
import { useQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "@web-memo/shared/constants";
import { useSupabaseClientQuery } from "@web-memo/shared/hooks";
import { toHighlightCountMap } from "@web-memo/shared/modules/highlight";
import { HighlightService } from "@web-memo/shared/utils";
import { useMemo } from "react";

/**
 * URL별 하이라이트 개수를 조회한다.
 * @description 조회 실패는 조용히 넘긴다. 개수는 부가 정보이고, 목록 자체는 그대로 보여야 한다.
 */
export function useHighlightCounts(urls: string[]): Map<string, number> {
	const { data: supabaseClient } = useSupabaseClientQuery();
	const highlightService = useMemo(
		() => new HighlightService(supabaseClient),
		[supabaseClient],
	);

	const { data } = useQuery({
		queryKey: QUERY_KEY.highlightCounts(urls),
		queryFn: async () => {
			const { data: rows, error } = await highlightService.getHighlightCounts(urls);

			if (error) {
				throw new Error(error.message);
			}

			return rows ?? [];
		},
		enabled: urls.length > 0,
	});

	return useMemo(() => toHighlightCountMap(data ?? []), [data]);
}
```

`useSuspenseQuery`가 아니라 `useQuery`를 쓴다. **개수 조회가 실패하거나 느려도 목록이 멈추면 안 되기 때문이다.** Suspense를 쓰면 개수를 기다리느라 목록 전체가 지연된다.

`_hooks/index.ts`에 export를 추가한다:

```typescript
export * from "./useHighlightCounts";
```

- [ ] **Step 2: 카드에 개수 prop 추가**

`_components/HighlightGroupCard.tsx`의 props에 추가한다:

```typescript
interface HighlightGroupCardProps {
	group: HighlightGroup;
	lng: Language;
	/** 이 URL에 저장된 하이라이트 총 개수. 카드에 보이는 문장 수와 다를 수 있다 */
	count: number;
}
```

제목 링크 옆에 개수를 표시한다. 기존 마크업의 `<a>` 안, `ExternalLink` 아이콘 뒤에 넣는다:

```tsx
<span className="shrink-0 text-xs text-muted-foreground">
	{t("highlight.count", { count })}
</span>
```

`useTranslation(lng)`을 컴포넌트에 추가해야 한다. 기존 `HighlightQuote`가 어떻게 쓰는지 보고 같은 방식으로 한다.

- [ ] **Step 3: 번역 키 추가**

`apps/web/src/modules/i18n/locales/ko/translation.json`의 기존 `highlight` 객체 안에:

```json
		"count": "{{count}}개"
```

`apps/web/src/modules/i18n/locales/en/translation.json`의 같은 위치에:

```json
		"count": "{{count}}"
```

영어는 숫자만 둔다. `"12 highlights"`처럼 쓰면 카드 제목 옆이 길어지고, 옆에 하이라이트 아이콘이 없어도 문맥상 무엇의 개수인지 분명하다. **ko/en 양쪽에 반드시 넣는다** — 한쪽만 있으면 다른 언어에서 키 문자열이 노출된다.

- [ ] **Step 4: HighlightView에서 개수 조회하고 전달**

`_components/HighlightView.tsx`를 수정한다. 그룹을 만든 뒤 URL을 모아 훅에 넘기고, 각 카드에 개수를 전달한다:

```tsx
const groups = groupHighlightsByUrl(rows);
const counts = useHighlightCounts(groups.map((group) => group.url));

// ...

{groups.map((group) => (
	<HighlightGroupCard
		key={group.url}
		group={group}
		lng={lng}
		count={counts.get(group.url) ?? 0}
	/>
))}
```

**`?? 0`이 필요하다.** RPC는 개수가 0인 URL을 반환하지 않고, 조회가 아직 안 끝났거나 실패했을 때도 맵이 비어 있다.

기존 코드가 `groupHighlightsByUrl(rows)`를 `.map()` 안에서 바로 호출하고 있다면 위처럼 변수로 빼야 한다. 훅은 조건부로 호출할 수 없으므로 컴포넌트 최상위에서 불러야 한다.

- [ ] **Step 5: 검증**

```bash
pnpm test:jest run "apps/web/src/app/[lng]/(auth)/highlights/_utils/groupByUrl.test.ts"
pnpm type-check
pnpm lint
```

기대: 기존 테스트 4개 통과, 타입·lint 통과

- [ ] **Step 6: 커밋**

```bash
git add "apps/web/src/app/[lng]/(auth)/highlights/_hooks/useHighlightCounts.ts" \
        "apps/web/src/app/[lng]/(auth)/highlights/_hooks/index.ts" \
        "apps/web/src/app/[lng]/(auth)/highlights/_components/HighlightView.tsx" \
        "apps/web/src/app/[lng]/(auth)/highlights/_components/HighlightGroupCard.tsx" \
        apps/web/src/modules/i18n/locales/ko/translation.json \
        apps/web/src/modules/i18n/locales/en/translation.json
git commit -m "feat: 웹 대시보드 하이라이트 카드에 출처별 개수 표시"
```

---

### Task 5: 앱 메모 목록 — 메모별 개수

**Files:**
- Create: `apps/app/lib/hooks/useHighlightCounts.ts`
- Modify: `apps/app/app/(main)/_hooks/useMemoList.ts`
- Modify: `apps/app/app/(main)/_components/MemoCard.tsx`
- Modify: `apps/app/app/(main)/index.tsx`

**Interfaces:**
- Consumes: `highlightService` (`apps/app/lib/supabase/client.ts`), `toHighlightCountMap` (Task 2), `QUERY_KEY.highlightCounts` (Task 1), `useAuth`
- Produces:
  - `useHighlightCounts(urls: string[]): Map<string, number>`
  - `MemoCard`의 새 prop `highlightCount: number`

- [ ] **Step 1: 개수 조회 훅 작성**

`apps/app/lib/hooks/useHighlightCounts.ts`:

```typescript
import { useQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "@web-memo/shared/constants";
import { toHighlightCountMap } from "@web-memo/shared/modules/highlight";
import { useMemo } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { highlightService } from "@/lib/supabase/client";

/**
 * URL별 하이라이트 개수를 조회한다.
 * @description 하이라이트는 로그인 필수이므로 비로그인 상태에서는 조회하지 않는다.
 * 조회 실패는 조용히 넘긴다 — 개수는 부가 정보이고 메모 목록 자체는 그대로 보여야 한다.
 */
export function useHighlightCounts(urls: string[]): Map<string, number> {
	const { isLoggedIn } = useAuth();

	const { data } = useQuery({
		queryKey: QUERY_KEY.highlightCounts(urls),
		queryFn: async () => {
			const { data: rows, error } = await highlightService.getHighlightCounts(urls);

			if (error) {
				throw new Error(error.message);
			}

			return rows ?? [];
		},
		enabled: isLoggedIn && urls.length > 0,
	});

	return useMemo(() => toHighlightCountMap(data ?? []), [data]);
}
```

기존 `useHighlightsByUrl`(`apps/app/lib/hooks/useHighlights.ts`)과 같은 구조다. `@/lib/...` alias를 쓰는 것도 기존 훅들의 관례다.

- [ ] **Step 2: 메모 목록 훅에서 개수 조회**

`apps/app/app/(main)/_hooks/useMemoList.ts`를 수정한다. 이 훅은 `memos` 배열(48행 부근)을 만들고 `:95-107`에서 객체로 반환한다(`isLoggedIn`, `filter`, `setFilter`, `memos`, `isLoading`, `refetch`, `isFetchingNextPage`, `handleEndReached`, `handleWishRemove`, `handleStarToggle`). 개수 조회를 추가하고 반환 객체에 `highlightCounts`를 넣는다:

```typescript
import { useHighlightCounts } from "@/lib/hooks/useHighlightCounts";
// ...

	const highlightCounts = useHighlightCounts(memos.map((memo) => memo.url));
```

반환 객체에 `highlightCounts`를 추가한다.

**`memos`가 만들어진 뒤에 호출해야 한다.** 훅은 조건부 호출이 안 되므로 `memos`가 빈 배열이어도 호출되는데, `enabled: urls.length > 0`이 막아준다.

- [ ] **Step 3: 카드에 개수 prop 추가**

`apps/app/app/(main)/_components/MemoCard.tsx`의 `interface MemoCardProps`(31행 부근)에 추가한다:

```typescript
	/** 이 메모 URL에 저장된 하이라이트 개수. 0이면 표시하지 않는다 */
	highlightCount: number;
```

함수 시그니처 구조분해에도 추가하고, 기존 위시/중요 아이콘이 있는 줄(86-88행 부근)에 배지를 넣는다:

```tsx
{highlightCount > 0 ? (
	<View className="flex-row items-center gap-0.5">
		<Highlighter size={12} color={HIGHLIGHT_COLOR_STYLE.yellow.bar} />
		<Text className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400">
			{highlightCount}
		</Text>
	</View>
) : null}
```

`Highlighter`는 `lucide-react-native`에서, `HIGHLIGHT_COLOR_STYLE`은 `@web-memo/shared/constants`에서 import한다. 크기와 색은 옆의 `Heart`(12px)와 맞췄다.

**개수가 0이면 렌더하지 않는다** — 하이라이트를 안 그은 메모가 대부분이라 "0"이 줄줄이 붙으면 시끄럽다.

- [ ] **Step 4: 목록 화면에서 개수 전달**

`apps/app/app/(main)/index.tsx:36`에서 `useMemoList()`를 구조분해하고 있다. `highlightCounts`를 추가로 꺼낸 뒤, `:163` 부근의 `renderItem`에서 `MemoCard`에 넘긴다:

```tsx
const { memos, highlightCounts, ... } = useMemoList();

// FlatList의 renderItem에서
<MemoCard
	memo={item}
	highlightCount={highlightCounts.get(item.url) ?? 0}
	onPress={...}
	onDelete={...}
/>
```

**`?? 0`이 필요하다.** RPC는 개수가 0인 URL을 반환하지 않고, 비로그인이거나 조회 전이면 맵이 비어 있다.

- [ ] **Step 5: 검증**

```bash
pnpm type-check
pnpm lint
```

기대: 통과. 이 태스크도 자동 테스트가 없다 — RN 컴포넌트 테스트 선례가 없고 실제 확인은 실기기에서 한다.

- [ ] **Step 6: 커밋**

```bash
git add apps/app/lib/hooks/useHighlightCounts.ts \
        "apps/app/app/(main)/_hooks/useMemoList.ts" \
        "apps/app/app/(main)/_components/MemoCard.tsx" \
        "apps/app/app/(main)/index.tsx"
git commit -m "feat: 앱 메모 목록에 메모별 하이라이트 개수 표시"
```

---

### Task 6: 실기기·브라우저 확인

이 기능의 상당 부분이 자동 테스트로 덮이지 않는다. RPC는 실제 호출로만 검증되고, 배지 렌더는 화면으로만 확인된다.

**이 태스크는 코드를 만들지 않는다.** 확인하고 결과를 기록한다.

**Files:**
- Modify: `claudedocs/2026-08-16-highlight-count-design.md` (확인 결과 기록)

- [ ] **Step 1: RPC가 RLS를 실제로 지키는지 확인**

이게 가장 중요하다. `security invoker`가 의도대로 동작해야 남의 하이라이트 개수가 새지 않는다.

앱에 로그인한 상태에서 브라우저 탭으로 아무 페이지나 열고 하이라이트를 2~3개 그은 뒤, 그 URL로 RPC를 직접 호출해 본다. 로그인 사용자의 JWT가 필요하므로 **앱에서 실제로 배지가 맞게 뜨는지로 확인하는 편이 간단하다.**

추가로, **로그아웃 상태에서 메모 목록을 열었을 때 배지가 뜨지 않는지** 확인한다(`enabled: isLoggedIn`).

- [ ] **Step 2: 세 화면 확인**

`pnpm dev:app`으로 앱을 띄우고(개발 서버 필요 — debug 빌드는 Metro에서 JS를 받아온다):

1. 브라우저에서 하이라이트를 3개 긋는다 → **헤더 배지가 3**
2. 하나 지운다 → **배지가 2로 줄어든다**
3. 하이라이트가 없는 페이지로 이동 → **배지가 사라진다**
4. 메모 탭으로 간다 → 하이라이트를 그은 URL의 메모 카드에 **같은 개수**가 보인다
5. 하이라이트 없는 메모에는 **배지가 없다**

`pnpm dev:web`으로 웹을 띄우고:

6. `/highlights`에서 카드 제목 옆에 개수가 보인다
7. **카드 안 문장 수와 배지가 다를 수 있다** — 무한스크롤로 20개만 로드됐는데 총 30개면 배지는 30이다. 이건 의도된 동작이다(설계 §3-2).
8. 언어를 영어로 바꾸면 숫자만 보인다

- [ ] **Step 3: 결과를 설계 문서에 기록**

`claudedocs/2026-08-16-highlight-count-design.md`의 §6 테스트 전략 절 뒤에 "확인 결과" 절을 추가하고 각 항목의 통과 여부를 남긴다. 실패한 것이 있으면 무엇이 어떻게 달랐는지 적는다.

- [ ] **Step 4: 커밋**

```bash
git add claudedocs/2026-08-16-highlight-count-design.md
git commit -m "docs: 하이라이트 개수 기능 실기기 확인 결과 기록"
```

- [ ] **Step 5: PR 생성**

```bash
/pr
```

PR 제목·본문은 한글로 작성한다. 본문에 **하이라이트 PR #404에 의존한다**는 점과, **마이그레이션(`20260816_add_highlight_counts_function.sql`)을 배포 전에 적용해야 한다**는 점을 명시한다.

---

## 남은 작업 (이 계획 범위 밖)

- 전체 통계("지금까지 총 N개") — 필요해지면 별도 RPC로 추가한다.
- 저장된 개수와 실제로 화면에 그려진 개수를 구분해 보여주기 — 주입 스크립트가 `highlight:restored`로 `resolved`/`unresolved`를 이미 보내고 있으나 소비되지 않는다. 두 숫자를 함께 보여주는 것이 사용자에게 혼란스러울 수 있어 v1에서는 하지 않았다.
