# 하이라이트(밑줄) 기능 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 모바일 앱의 인앱 WebView에서 웹페이지 문장에 밑줄을 긋고, 재방문 시 복원되며, 웹 대시보드에서 모아 볼 수 있게 한다.

**Architecture:** 하이라이트 위치는 DOM 경로가 아니라 W3C TextQuoteSelector(`exact` + `prefix` + `suffix` + 근사 offset) 방식의 텍스트 앵커로 저장한다. 앵커 계산·탐색·렌더 로직은 `packages/shared/src/modules/highlight/`에 순수 DOM 모듈로 두고, esbuild로 IIFE 번들을 만들어 WebView에 `injectedJavaScript` 문자열로 주입한다. 저장소는 Supabase `memo.highlight` 테이블이며 메모와는 FK 없이 정규화된 URL로 느슨하게 연결한다.

**Tech Stack:** TypeScript, React Native/Expo(`apps/app`), react-native-webview 13.15, Next.js 14 App Router(`apps/web`), Supabase, TanStack Query v5, Vitest + jsdom, esbuild, approx-string-match

**설계 문서:** `claudedocs/2026-08-15-highlight-design.md` — 모든 설계 결정의 근거는 여기 있다. 구현 중 판단이 필요하면 먼저 읽는다.

## Global Constraints

- 커밋 메시지는 **한글**, 브랜치명은 영문. 브랜치는 `develop`에서 `feat/highlight`를 딴다.
- 파일 300줄 이하 유지. 넘으면 분리한다.
- 파일명은 **camelCase**, 컴포넌트 파일만 PascalCase. 디렉토리는 lowercase-with-dashes.
- 타입에 `IF`/`T` 접두사를 붙이지 않는다. 기존 코드(`MemoSortBy`, `MemosPaginatedKeyParams`)를 따른다.
- 인라인 `<svg>` 금지 — 아이콘은 항상 `lucide-react`(웹) / `lucide-react-native`(앱).
- 조건부 텍스트에 `lng === "ko"` 패턴 금지. 항상 `useTranslation` + 번역 키.
- 테스트 파일은 소스 옆에 `*.test.ts`로 둔다(기존 관례: `packages/shared/src/utils/Supabase.test.ts`).
- 루트 `vitest.config.ts`의 기본 environment는 **node**다. DOM이 필요한 테스트 파일은 첫 줄에 `// @vitest-environment jsdom`을 넣는다.
- 테스트 실행: `pnpm test:jest -- --run <path>`. 전체 검증: `pnpm type-check && pnpm lint`.
  **`--run`을 반드시 붙인다.** 루트 `test:jest`는 그냥 `vitest`라서 빼면 watch 모드로 들어가 명령이 끝나지 않는다.
- 색상은 `yellow | green | blue | pink | purple` 5종 고정. DB CHECK 제약과 TS 타입이 일치해야 한다.
- 하이라이트는 **로그인 필수**. 비로그인 로컬 저장은 v1 범위 밖이다.
- 각 Task 끝의 커밋은 해당 Task가 만든 파일만 담는다. `git add .` 금지.

---

### Task 1: 스파이크 — WebView API 실기기 검증

설계 §9의 미확정 항목 4개를 본 구현 전에 확인한다. **이 Task는 코드를 남기지 않는다.** 확인 결과만 설계 문서에 기록하고 스파이크 코드는 되돌린다.

문서만으로 확정하지 못한 이유가 있다. `menuItems`는 공식 문서에 iOS/Android 모두 지원으로 적혀 있지만 원래 iOS 전용으로 구현됐다는 이슈 히스토리가 있어 문서와 실제 사이에 간극이 있다.

**Files:**
- Modify (임시): `apps/app/app/(main)/browser/index.tsx`

**Interfaces:**
- Consumes: 없음
- Produces: 없음 (설계 문서 §9에 검증 결과 기록)

- [ ] **Step 1: 브랜치 생성**

```bash
git checkout develop
git pull
git checkout -b feat/highlight
```

- [ ] **Step 2: 스파이크용 임시 코드 추가**

`apps/app/app/(main)/browser/index.tsx`의 `<WebView ...>`에 아래 두 prop을 임시로 추가한다.

```tsx
menuItems={[{ label: "하이라이트", key: "webmemo-highlight" }]}
onCustomMenuSelection={(event) => {
  console.log("[spike] custom menu", JSON.stringify(event.nativeEvent));
}}
```

- [ ] **Step 3: iOS 실기기/시뮬레이터에서 확인**

```bash
pnpm dev:app
```

브라우저 탭에서 아무 기사 페이지를 열고 텍스트를 길게 눌러 선택한다. 확인 항목:

1. 선택 콜아웃에 "하이라이트" 항목이 보이는가
2. 탭했을 때 콘솔에 `selectedText`가 찍히는가
3. **기존 "복사" 항목이 사라졌는가** — 사라졌다면 `menuItems`에 `{ label: "복사", key: "copy" }`를 직접 넣고 `onCustomMenuSelection`에서 처리해야 한다(회귀 방지)

- [ ] **Step 4: Android 실기기/에뮬레이터에서 같은 항목 확인**

Android에서 "하이라이트" 항목이 아예 뜨지 않으면, Task 12에서 Android만 인젝트 툴바로 분기해야 한다. 이 경우 Task 12의 분량이 늘어나므로 반드시 지금 확인한다.

- [ ] **Step 5: CSS Custom Highlight API 지원 확인**

같은 화면에서 주소창에 아래를 입력해 실행하거나, WebView 콘솔에서 확인한다.

```javascript
typeof CSS !== "undefined" && !!CSS.highlights && typeof Highlight !== "undefined"
```

지원 최소 버전(iOS 17.2 / Chrome 105)에 해당하는 기기가 있으면 그 기기에서도 확인한다. `false`가 나오는 기기 비중이 크면 Task 7의 폴백 경로가 주 경로가 된다.

- [ ] **Step 6: 검증 결과를 설계 문서에 기록하고 스파이크 코드 되돌리기**

`claudedocs/2026-08-15-highlight-design.md`의 §9 각 항목 뒤에 `→ 검증 결과: ...` 한 줄씩 추가한다.

```bash
git checkout -- "apps/app/app/(main)/browser/index.tsx"
git add claudedocs/2026-08-15-highlight-design.md
git commit -m "docs: 하이라이트 WebView API 스파이크 검증 결과 기록"
```

---

### Task 2: DB 마이그레이션 · 타입 · 상수

**Files:**
- Create: `packages/supabase-edge-functions/supabase/migrations/20260815_add_highlight_table.sql`
- Modify: `packages/shared/src/constants/Supabase.ts`
- Create: `packages/shared/src/constants/Highlight.ts`
- Modify: `packages/shared/src/constants/index.ts`
- Modify: `packages/shared/src/constants/QueryKey.ts`
- Modify: `packages/shared/src/types/supabase.ts` (자동 생성)
- Modify: `packages/shared/src/types/supabaseCustom.ts`
- Test: `packages/shared/src/constants/QueryKey.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `SUPABASE.table.highlight: "highlight"`
  - `HIGHLIGHT_COLORS: readonly HighlightColor[]`, `DEFAULT_HIGHLIGHT_COLOR: "yellow"`, `HIGHLIGHT_COLOR_STYLE: Record<HighlightColor, { background: string; bar: string }>`
  - `QUERY_KEY.highlightsByUrl(url: string)`, `QUERY_KEY.highlightsPaginated(params: HighlightsPaginatedKeyParams)`
  - 타입 `HighlightRow`, `HighlightTable`, `HighlightColor`

- [ ] **Step 1: 마이그레이션 SQL 작성**

`packages/supabase-edge-functions/supabase/migrations/20260815_add_highlight_table.sql`:

```sql
create table memo.highlight (
  id                    bigint generated always as identity primary key,
  user_id               uuid not null references auth.users(id) on delete cascade,
  url                   text not null,
  title                 text,
  "favIconUrl"          text,
  exact_text            text not null,
  prefix_text           text,
  suffix_text           text,
  text_position_start   integer,
  color                 text not null default 'yellow',
  note                  text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint highlight_color_check
    check (color in ('yellow', 'green', 'blue', 'pink', 'purple'))
);

create index highlight_user_url_idx     on memo.highlight (user_id, url);
create index highlight_user_created_idx on memo.highlight (user_id, created_at desc);

alter table memo.highlight enable row level security;

create policy "highlight_select_own" on memo.highlight
  for select using (auth.uid() = user_id);
create policy "highlight_insert_own" on memo.highlight
  for insert with check (auth.uid() = user_id);
create policy "highlight_update_own" on memo.highlight
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "highlight_delete_own" on memo.highlight
  for delete using (auth.uid() = user_id);
```

- [ ] **Step 2: 마이그레이션 적용 후 타입 재생성**

Supabase 프로젝트에 마이그레이션을 적용한 뒤:

```bash
pnpm generate-supabase-type
```

`packages/shared/src/types/supabase.ts`의 `memo` 스키마에 `highlight` 테이블이 생겼는지 확인한다. 생기지 않았다면 마이그레이션이 적용되지 않은 것이므로 다음 단계로 넘어가지 않는다.

- [ ] **Step 3: SUPABASE 상수에 테이블명 추가**

`packages/shared/src/constants/Supabase.ts`의 `table` 객체에 한 줄 추가:

```typescript
	table: {
		memo: "memo",
		category: "category",
		highlight: "highlight",
	},
```

- [ ] **Step 4: 색상 상수 파일 작성**

`packages/shared/src/constants/Highlight.ts`:

```typescript
/** 하이라이트 색상. DB의 highlight_color_check 제약과 반드시 일치해야 한다. */
export const HIGHLIGHT_COLORS = [
	"yellow",
	"green",
	"blue",
	"pink",
	"purple",
] as const;

export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number];

export const DEFAULT_HIGHLIGHT_COLOR: HighlightColor = "yellow";

/**
 * 색상별 스타일 값.
 * background는 WebView의 ::highlight() 배경과 웹 대시보드 인용문 배경에 쓰고,
 * bar는 목록에서 문장 왼쪽에 세우는 색 막대에 쓴다.
 * 다크 모드에서도 글자가 읽히도록 배경은 알파를 넣은 값으로 둔다.
 */
export const HIGHLIGHT_COLOR_STYLE: Record<
	HighlightColor,
	{ background: string; bar: string }
> = {
	yellow: { background: "rgba(250, 204, 21, 0.40)", bar: "#facc15" },
	green: { background: "rgba(74, 222, 128, 0.40)", bar: "#4ade80" },
	blue: { background: "rgba(96, 165, 250, 0.40)", bar: "#60a5fa" },
	pink: { background: "rgba(244, 114, 182, 0.40)", bar: "#f472b6" },
	purple: { background: "rgba(192, 132, 252, 0.40)", bar: "#c084fc" },
};
```

- [ ] **Step 5: constants 배럴에 export 추가**

`packages/shared/src/constants/index.ts`에 기존 export들과 같은 형식으로 한 줄 추가:

```typescript
export * from "./Highlight";
```

- [ ] **Step 6: 쿼리 키 테스트를 먼저 작성**

`packages/shared/src/constants/QueryKey.test.ts`에 추가한다(파일이 이미 있으므로 케이스만 덧붙인다):

```typescript
describe("QUERY_KEY.highlightsByUrl", () => {
	it("url을 키에 포함한다", () => {
		expect(QUERY_KEY.highlightsByUrl("https://a.com")).toEqual([
			"highlights",
			"byUrl",
			"https://a.com",
		]);
	});
});

describe("QUERY_KEY.highlightsPaginated", () => {
	it("필터 조합을 키에 포함한다", () => {
		expect(QUERY_KEY.highlightsPaginated({ searchQuery: "리액트" })).toEqual([
			"highlights",
			"paginated",
			{ searchQuery: "리액트" },
		]);
	});
});
```

- [ ] **Step 7: 테스트 실패 확인**

```bash
pnpm test:jest -- --run packages/shared/src/constants/QueryKey.test.ts
```

기대: FAIL — `QUERY_KEY.highlightsByUrl is not a function`

- [ ] **Step 8: 쿼리 키 구현**

`packages/shared/src/constants/QueryKey.ts`:

```typescript
/** 하이라이트 목록(무한 스크롤) 쿼리를 구분하는 필터 조합 */
export interface HighlightsPaginatedKeyParams {
	searchQuery?: string;
	color?: string;
}
```

`QUERY_KEY` 객체 안에 두 줄 추가:

```typescript
	highlightsByUrl: (url: string) => ["highlights", "byUrl", url],
	highlightsPaginated: (params: HighlightsPaginatedKeyParams) => [
		"highlights",
		"paginated",
		params,
	],
```

- [ ] **Step 9: 테스트 통과 확인**

```bash
pnpm test:jest -- --run packages/shared/src/constants/QueryKey.test.ts
```

기대: PASS

- [ ] **Step 10: 파생 타입 추가**

`packages/shared/src/types/supabaseCustom.ts`에 기존 `MemoRow`/`MemoTable` 정의 옆에 같은 형식으로 추가한다. 기존 정의의 형태를 먼저 읽고 그 패턴을 그대로 따른다.

```typescript
export type HighlightTable = Database["memo"]["Tables"]["highlight"];
export type HighlightRow = HighlightTable["Row"];
```

- [ ] **Step 11: 타입 체크 후 커밋**

```bash
pnpm type-check && pnpm lint
git add packages/supabase-edge-functions/supabase/migrations/20260815_add_highlight_table.sql \
        packages/shared/src/constants/Supabase.ts \
        packages/shared/src/constants/Highlight.ts \
        packages/shared/src/constants/index.ts \
        packages/shared/src/constants/QueryKey.ts \
        packages/shared/src/constants/QueryKey.test.ts \
        packages/shared/src/types/supabase.ts \
        packages/shared/src/types/supabaseCustom.ts
git commit -m "feat: 하이라이트 테이블 스키마와 공용 상수/타입 추가"
```

---

### Task 3: 문서 텍스트 인덱스 (`documentText.ts`)

앵커의 기준이 되는 "문서 텍스트"를 정의한다. `innerText`는 CSS 레이아웃 결과에 따라 값이 달라져 기기 간에 이식되지 않으므로 쓰지 않고, `TreeWalker`로 텍스트 노드를 순서대로 이어붙인다. **`createAnchor`와 `resolveAnchor`가 반드시 같은 규칙을 공유해야 하므로 여기 한 곳에만 둔다.**

**Files:**
- Create: `packages/shared/src/modules/highlight/constants.ts`
- Create: `packages/shared/src/modules/highlight/documentText.ts`
- Test: `packages/shared/src/modules/highlight/documentText.test.ts`
- Modify: `packages/shared/package.json` (jsdom devDependency)

**Interfaces:**
- Consumes: 없음
- Produces:
  - `CONTEXT_LENGTH = 32`
  - `interface DocumentTextIndex { text: string; nodes: { node: Text; start: number }[] }`
  - `buildDocumentTextIndex(root: Node): DocumentTextIndex`
  - `offsetToPoint(index: DocumentTextIndex, offset: number): { node: Text; offset: number } | null`
  - `pointToOffset(index: DocumentTextIndex, node: Node, offset: number): number | null`

- [ ] **Step 1: jsdom 설치**

```bash
pnpm -F @web-memo/shared add -D jsdom @types/jsdom
```

- [ ] **Step 1-1: 모듈 공용 상수 파일 작성**

`CONTEXT_LENGTH`는 `createAnchor`(문맥을 잘라 저장)와 `matchQuote`(문맥을 잘라 비교) 양쪽이 쓴다. **두 값이 갈라지면 스코어링이 조용히 틀어지므로** 한 곳에만 둔다.

`packages/shared/src/modules/highlight/constants.ts`:

```typescript
/**
 * 앵커가 앞뒤 문맥으로 보관할 길이.
 * @description createAnchor가 이 길이로 자르고 matchQuote가 같은 길이로 비교하므로
 * 두 곳이 반드시 같은 값을 봐야 한다.
 */
export const CONTEXT_LENGTH = 32;
```

- [ ] **Step 2: 실패하는 테스트 작성**

`packages/shared/src/modules/highlight/documentText.test.ts`:

```typescript
// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
	buildDocumentTextIndex,
	offsetToPoint,
	pointToOffset,
} from "./documentText";

function render(html: string): HTMLElement {
	const root = document.createElement("div");
	root.innerHTML = html;
	return root;
}

describe("buildDocumentTextIndex", () => {
	it("텍스트 노드를 문서 순서대로 이어붙인다", () => {
		const root = render("<p>앞<strong>강조</strong>뒤</p>");
		expect(buildDocumentTextIndex(root).text).toBe("앞강조뒤");
	});

	it("script와 style의 내용은 제외한다", () => {
		const root = render("<p>본문</p><script>var a=1;</script><style>p{}</style>");
		expect(buildDocumentTextIndex(root).text).toBe("본문");
	});

	it("각 텍스트 노드의 시작 offset을 기록한다", () => {
		const root = render("<p>앞<strong>강조</strong></p>");
		const index = buildDocumentTextIndex(root);
		expect(index.nodes.map((entry) => entry.start)).toEqual([0, 1]);
	});
});

describe("offsetToPoint / pointToOffset", () => {
	it("offset을 텍스트 노드 위치로 변환한다", () => {
		const root = render("<p>앞<strong>강조</strong>뒤</p>");
		const index = buildDocumentTextIndex(root);
		const point = offsetToPoint(index, 2);

		expect(point?.node.textContent).toBe("강조");
		expect(point?.offset).toBe(1);
	});

	it("변환이 왕복으로 일치한다", () => {
		const root = render("<p>앞<strong>강조</strong>뒤</p>");
		const index = buildDocumentTextIndex(root);
		const point = offsetToPoint(index, 3);

		expect(pointToOffset(index, point!.node, point!.offset)).toBe(3);
	});

	it("범위를 벗어난 offset은 null을 반환한다", () => {
		const root = render("<p>짧음</p>");
		const index = buildDocumentTextIndex(root);

		expect(offsetToPoint(index, 999)).toBeNull();
	});
});
```

- [ ] **Step 3: 테스트 실패 확인**

```bash
pnpm test:jest -- --run packages/shared/src/modules/highlight/documentText.test.ts
```

기대: FAIL — 모듈을 찾을 수 없음

- [ ] **Step 4: 구현**

`packages/shared/src/modules/highlight/documentText.ts`:

```typescript
/** 텍스트를 수집하지 않는 요소. 화면에 보이지 않거나 본문이 아닌 것들이다. */
const EXCLUDED_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"]);

/** 문서의 텍스트 노드를 순서대로 이어붙인 결과와 각 노드의 시작 offset */
export interface DocumentTextIndex {
	text: string;
	nodes: { node: Text; start: number }[];
}

/**
 * 문서 텍스트 인덱스를 만든다.
 * @description innerText는 CSS 레이아웃에 따라 값이 달라져 기기 간 이식되지 않으므로,
 * TreeWalker로 텍스트 노드만 순서대로 이어붙인다. createAnchor와 resolveAnchor가
 * 반드시 이 함수를 공유해야 offset 기준이 갈리지 않는다.
 */
export function buildDocumentTextIndex(root: Node): DocumentTextIndex {
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
		acceptNode(node) {
			const parentTag = node.parentElement?.tagName;

			if (parentTag && EXCLUDED_TAGS.has(parentTag)) {
				return NodeFilter.FILTER_REJECT;
			}

			return NodeFilter.FILTER_ACCEPT;
		},
	});

	const nodes: { node: Text; start: number }[] = [];
	let text = "";

	let current = walker.nextNode();
	while (current) {
		const textNode = current as Text;
		const content = textNode.data;

		if (content.length > 0) {
			nodes.push({ node: textNode, start: text.length });
			text += content;
		}

		current = walker.nextNode();
	}

	return { text, nodes };
}

/** 문서 텍스트 offset을 텍스트 노드 위치로 변환한다. 범위를 벗어나면 null. */
export function offsetToPoint(
	index: DocumentTextIndex,
	offset: number,
): { node: Text; offset: number } | null {
	if (offset < 0 || offset > index.text.length) {
		return null;
	}

	for (let i = index.nodes.length - 1; i >= 0; i -= 1) {
		const entry = index.nodes[i];

		if (offset >= entry.start) {
			return { node: entry.node, offset: offset - entry.start };
		}
	}

	return null;
}

/** 텍스트 노드 위치를 문서 텍스트 offset으로 변환한다. 인덱스에 없는 노드면 null. */
export function pointToOffset(
	index: DocumentTextIndex,
	node: Node,
	offset: number,
): number | null {
	const entry = index.nodes.find((candidate) => candidate.node === node);

	if (!entry) {
		return null;
	}

	return entry.start + offset;
}
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
pnpm test:jest -- --run packages/shared/src/modules/highlight/documentText.test.ts
```

기대: PASS (7 케이스)

- [ ] **Step 6: 커밋**

```bash
pnpm type-check && pnpm lint
git add packages/shared/src/modules/highlight/constants.ts \
        packages/shared/src/modules/highlight/documentText.ts \
        packages/shared/src/modules/highlight/documentText.test.ts \
        packages/shared/package.json pnpm-lock.yaml
git commit -m "feat: 하이라이트 앵커용 문서 텍스트 인덱스 구현"
```

---

### Task 4: 인용문 매칭 (`matchQuote.ts`)

문서 텍스트에서 저장된 문장을 다시 찾는다. 정확 매칭을 먼저 시도하고, 실패했을 때만 근사 매칭으로 넘어간다. 이 순서가 성능상 중요하다 — 근사 매칭은 큰 문서에서 눈에 띄게 느리고, 대부분의 하이라이트는 원문이 그대로라 1단계에서 끝난다.

hypothesis 클라이언트의 매칭 전략(정확 매칭 우선, `maxErrors = min(256, quote.length / 2)`, 인용문 50 / prefix 20 / suffix 20 / 위치 2 가중 스코어링)을 따른다.

**Files:**
- Create: `packages/shared/src/modules/highlight/matchQuote.ts`
- Test: `packages/shared/src/modules/highlight/matchQuote.test.ts`
- Modify: `packages/shared/package.json`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `interface QuoteMatch { start: number; end: number; score: number }`
  - `matchQuote(text: string, quote: string, options?: { prefix?: string; suffix?: string; hint?: number }): QuoteMatch | null`

- [ ] **Step 1: approx-string-match 설치 후 export 형태 확인**

```bash
pnpm -F @web-memo/shared add approx-string-match
cat node_modules/approx-string-match/dist/index.d.ts
```

기대하는 시그니처는 default export인 `search(text: string, pattern: string, maxErrors: number): Match[]`이고 `Match`는 `{ start: number; end: number; errors: number }`다. **실제 타입 정의가 다르면 Step 4의 import와 호출부를 실제에 맞게 고친다.**

- [ ] **Step 2: 실패하는 테스트 작성**

`packages/shared/src/modules/highlight/matchQuote.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { matchQuote } from "./matchQuote";

describe("matchQuote", () => {
	it("정확히 일치하는 문장을 찾는다", () => {
		const match = matchQuote("가나다라마바사", "다라마");

		expect(match).not.toBeNull();
		expect(match?.start).toBe(2);
		expect(match?.end).toBe(5);
	});

	it("같은 문장이 여러 번 나오면 prefix로 구분한다", () => {
		const text = "하나 사과 둘 사과 셋";
		const match = matchQuote(text, "사과", { prefix: "둘 " });

		expect(match?.start).toBe(text.indexOf("사과", 5));
	});

	it("같은 문장이 여러 번 나오면 suffix로 구분한다", () => {
		const text = "사과 알파 사과 베타";
		const match = matchQuote(text, "사과", { suffix: " 베타" });

		expect(match?.start).toBe(text.indexOf("사과", 5));
	});

	it("prefix와 suffix가 같으면 위치 힌트로 더 가까운 쪽을 고른다", () => {
		const text = "x 사과 y x 사과 y";
		const match = matchQuote(text, "사과", { hint: 11 });

		expect(match?.start).toBe(text.indexOf("사과", 5));
	});

	it("원문이 조금 바뀌어도 근사 매칭으로 찾는다", () => {
		const match = matchQuote(
			"리액트는 사용자 인터페이스를 만들기 위한 라이브러리입니다",
			"리액트는 사용자 인터페이스를 만드는 라이브러리입니다",
		);

		expect(match).not.toBeNull();
	});

	it("원문에서 사라진 문장은 null을 반환한다", () => {
		const match = matchQuote("완전히 다른 내용만 들어 있는 문서", "존재하지 않는 문장입니다");

		expect(match).toBeNull();
	});

	it("빈 인용문은 null을 반환한다", () => {
		expect(matchQuote("아무 문서", "")).toBeNull();
	});
});
```

- [ ] **Step 3: 테스트 실패 확인**

```bash
pnpm test:jest -- --run packages/shared/src/modules/highlight/matchQuote.test.ts
```

기대: FAIL — 모듈을 찾을 수 없음

- [ ] **Step 4: 구현**

`packages/shared/src/modules/highlight/matchQuote.ts`:

```typescript
import search from "approx-string-match";
import { CONTEXT_LENGTH } from "./constants";

/**
 * 문서 텍스트에서 인용문의 위치를 찾는다.
 * @description 매칭 전략은 hypothesis 클라이언트(src/annotator/anchoring/match-quote.ts)를 참고했다.
 * 정확 매칭을 먼저 시도하고 실패했을 때만 근사 매칭으로 넘어간다.
 */

/** 근사 매칭 시 허용할 최대 오류 수의 상한 */
const MAX_ERRORS_CAP = 256;

const SCORE_WEIGHT = {
	quote: 50,
	prefix: 20,
	suffix: 20,
	position: 2,
} as const;

export interface QuoteMatch {
	start: number;
	end: number;
	score: number;
}

export function matchQuote(
	text: string,
	quote: string,
	options: { prefix?: string; suffix?: string; hint?: number } = {},
): QuoteMatch | null {
	if (quote.length === 0) {
		return null;
	}

	const candidates = findCandidates(text, quote);

	if (candidates.length === 0) {
		return null;
	}

	const scored = candidates.map((candidate) => ({
		...candidate,
		score: scoreCandidate({ text, quote, candidate, options }),
	}));

	return scored.reduce((best, current) =>
		current.score > best.score ? current : best,
	);
}

interface Candidate {
	start: number;
	end: number;
	errors: number;
}

/** 정확 매칭을 모두 모으고, 하나도 없을 때만 근사 매칭으로 넘어간다. */
function findCandidates(text: string, quote: string): Candidate[] {
	const exact: Candidate[] = [];

	let from = text.indexOf(quote);
	while (from !== -1) {
		exact.push({ start: from, end: from + quote.length, errors: 0 });
		from = text.indexOf(quote, from + 1);
	}

	if (exact.length > 0) {
		return exact;
	}

	const maxErrors = Math.min(MAX_ERRORS_CAP, Math.floor(quote.length / 2));

	return search(text, quote, maxErrors);
}

function scoreCandidate({
	text,
	quote,
	candidate,
	options,
}: {
	text: string;
	quote: string;
	candidate: Candidate;
	options: { prefix?: string; suffix?: string; hint?: number };
}): number {
	const quoteScore = 1 - candidate.errors / Math.max(quote.length, 1);

	const prefixScore = options.prefix
		? similarityFromEnd(
				text.slice(Math.max(0, candidate.start - CONTEXT_LENGTH), candidate.start),
				options.prefix,
			)
		: 0;

	const suffixScore = options.suffix
		? similarityFromStart(
				text.slice(candidate.end, candidate.end + CONTEXT_LENGTH),
				options.suffix,
			)
		: 0;

	const positionScore =
		options.hint === undefined
			? 0
			: 1 - Math.abs(candidate.start - options.hint) / Math.max(text.length, 1);

	return (
		quoteScore * SCORE_WEIGHT.quote +
		prefixScore * SCORE_WEIGHT.prefix +
		suffixScore * SCORE_WEIGHT.suffix +
		positionScore * SCORE_WEIGHT.position
	);
}

/** 두 문자열이 끝에서부터 몇 글자나 같은지를 0~1로 환산한다 (prefix 비교용) */
function similarityFromEnd(actual: string, expected: string): number {
	const limit = Math.min(actual.length, expected.length);
	let matched = 0;

	while (
		matched < limit &&
		actual[actual.length - 1 - matched] === expected[expected.length - 1 - matched]
	) {
		matched += 1;
	}

	return limit === 0 ? 0 : matched / limit;
}

/** 두 문자열이 앞에서부터 몇 글자나 같은지를 0~1로 환산한다 (suffix 비교용) */
function similarityFromStart(actual: string, expected: string): number {
	const limit = Math.min(actual.length, expected.length);
	let matched = 0;

	while (matched < limit && actual[matched] === expected[matched]) {
		matched += 1;
	}

	return limit === 0 ? 0 : matched / limit;
}
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
pnpm test:jest -- --run packages/shared/src/modules/highlight/matchQuote.test.ts
```

기대: PASS (7 케이스)

"원문에서 사라진 문장은 null" 케이스가 실패하면(근사 매칭이 엉뚱한 위치를 반환하면) `matchQuote` 끝에 최소 점수 컷을 추가한다. 인용문 가중치가 50이므로 `SCORE_WEIGHT.quote * 0.5`(= 25) 미만이면 `null`을 반환하도록 한다.

- [ ] **Step 6: 커밋**

```bash
pnpm type-check && pnpm lint
git add packages/shared/src/modules/highlight/matchQuote.ts \
        packages/shared/src/modules/highlight/matchQuote.test.ts \
        packages/shared/package.json pnpm-lock.yaml
git commit -m "feat: 하이라이트 인용문 매칭 로직 구현"
```

---

### Task 5: 앵커 생성 (`createAnchor.ts`)

**Files:**
- Create: `packages/shared/src/modules/highlight/types.ts`
- Create: `packages/shared/src/modules/highlight/createAnchor.ts`
- Test: `packages/shared/src/modules/highlight/createAnchor.test.ts`

**Interfaces:**
- Consumes: `CONTEXT_LENGTH`, `buildDocumentTextIndex`, `pointToOffset` (Task 3)
- Produces:
  - `interface HighlightAnchor { exact: string; prefix: string; suffix: string; textPositionStart: number }`
  - `interface HighlightItem { id: number; anchor: HighlightAnchor; color: HighlightColor }`
  - `type HighlightOutboundMessage` — WebView가 앱으로 올려보내는 메시지 유니온
  - `createAnchor(range: Range, root?: Node): HighlightAnchor | null`

- [ ] **Step 1: 타입 파일 작성**

`packages/shared/src/modules/highlight/types.ts`:

```typescript
import type { HighlightColor } from "../../constants/Highlight";

/** 하이라이트의 위치를 텍스트로 기억하는 앵커 (W3C TextQuoteSelector 기반) */
export interface HighlightAnchor {
	/** 실제로 선택된 문장 */
	exact: string;
	/** 앞 문맥 */
	prefix: string;
	/** 뒤 문맥 */
	suffix: string;
	/** 문서 텍스트 기준 근사 시작 offset. 동일 문장이 여러 번 나올 때 후보 선택 힌트 */
	textPositionStart: number;
}

/** WebView에 렌더할 하이라이트 한 건 */
export interface HighlightItem {
	id: number;
	anchor: HighlightAnchor;
	color: HighlightColor;
}

/** WebView가 앱으로 올려보내는 메시지 */
export type HighlightOutboundMessage =
	| {
			type: "highlight:create";
			anchor: HighlightAnchor;
			url: string;
			title: string;
			favIconUrl: string;
	  }
	| { type: "highlight:tap"; id: number }
	| { type: "highlight:restored"; resolved: number; unresolved: number }
	/** 저장하지 않고 거절한 경우. 앱이 사용자에게 이유를 알린다(설계 §6-4, §6-6). */
	| { type: "highlight:rejected"; reason: "tooLong" | "duplicate" };
```

- [ ] **Step 2: 실패하는 테스트 작성**

`packages/shared/src/modules/highlight/createAnchor.test.ts`:

```typescript
// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { createAnchor } from "./createAnchor";

function render(html: string): HTMLElement {
	const root = document.createElement("div");
	root.innerHTML = html;
	document.body.appendChild(root);
	return root;
}

/** 문서 텍스트 기준 [start, end) 구간을 감싸는 Range를 만든다 */
function rangeOf(root: HTMLElement, target: string): Range {
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
	let node = walker.nextNode() as Text | null;

	while (node) {
		const index = node.data.indexOf(target);

		if (index !== -1) {
			const range = document.createRange();
			range.setStart(node, index);
			range.setEnd(node, index + target.length);
			return range;
		}

		node = walker.nextNode() as Text | null;
	}

	throw new Error(`대상 텍스트를 찾지 못했다: ${target}`);
}

describe("createAnchor", () => {
	it("선택한 문장을 exact에 담는다", () => {
		const root = render("<p>가나다라마바사아자차</p>");
		const anchor = createAnchor(rangeOf(root, "라마바"), root);

		expect(anchor?.exact).toBe("라마바");
	});

	it("앞뒤 문맥을 prefix와 suffix에 담는다", () => {
		const root = render("<p>가나다라마바사아자차</p>");
		const anchor = createAnchor(rangeOf(root, "라마바"), root);

		expect(anchor?.prefix).toBe("가나다");
		expect(anchor?.suffix).toBe("사아자차");
	});

	it("문서 텍스트 기준 시작 offset을 기록한다", () => {
		const root = render("<p>가나다라마바사</p>");
		const anchor = createAnchor(rangeOf(root, "라마바"), root);

		expect(anchor?.textPositionStart).toBe(3);
	});

	it("문맥은 32자로 자른다", () => {
		const filler = "가".repeat(50);
		const root = render(`<p>${filler}핵심${filler}</p>`);
		const anchor = createAnchor(rangeOf(root, "핵심"), root);

		expect(anchor?.prefix).toHaveLength(32);
		expect(anchor?.suffix).toHaveLength(32);
	});

	it("collapsed range는 null을 반환한다", () => {
		const root = render("<p>가나다</p>");
		const range = document.createRange();
		range.setStart(root.firstChild!.firstChild!, 1);
		range.collapse(true);

		expect(createAnchor(range, root)).toBeNull();
	});
});
```

- [ ] **Step 3: 테스트 실패 확인**

```bash
pnpm test:jest -- --run packages/shared/src/modules/highlight/createAnchor.test.ts
```

기대: FAIL — 모듈을 찾을 수 없음

- [ ] **Step 4: 구현**

`packages/shared/src/modules/highlight/createAnchor.ts`:

```typescript
import { CONTEXT_LENGTH } from "./constants";
import { buildDocumentTextIndex, pointToOffset } from "./documentText";
import type { HighlightAnchor } from "./types";

/**
 * 선택 영역을 텍스트 앵커로 변환한다.
 * @description 위치를 DOM 경로가 아니라 텍스트로 기억하므로, 모바일 WebView에서 만든 앵커를
 * DOM 구조가 다른 PC 브라우저에서도 해석할 수 있다.
 * @returns 유효하지 않은 선택이면 null
 */
export function createAnchor(
	range: Range,
	root: Node = document.body,
): HighlightAnchor | null {
	if (range.collapsed) {
		return null;
	}

	const index = buildDocumentTextIndex(root);
	const start = pointToOffset(index, range.startContainer, range.startOffset);
	const end = pointToOffset(index, range.endContainer, range.endOffset);

	if (start === null || end === null || end <= start) {
		return null;
	}

	return {
		exact: index.text.slice(start, end),
		prefix: index.text.slice(Math.max(0, start - CONTEXT_LENGTH), start),
		suffix: index.text.slice(end, end + CONTEXT_LENGTH),
		textPositionStart: start,
	};
}
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
pnpm test:jest -- --run packages/shared/src/modules/highlight/createAnchor.test.ts
```

기대: PASS (5 케이스)

`range.startContainer`가 텍스트 노드가 아닌 경우(요소 경계 선택) `pointToOffset`이 `null`을 반환해 앵커가 만들어지지 않는다. Step 5에서 이 문제가 드러나면, `createAnchor` 안에서 `range.cloneContents()` 대신 시작/끝 컨테이너가 요소일 때 해당 요소 안의 첫/마지막 텍스트 노드로 보정하는 코드를 추가한다.

- [ ] **Step 6: 커밋**

```bash
pnpm type-check && pnpm lint
git add packages/shared/src/modules/highlight/types.ts \
        packages/shared/src/modules/highlight/createAnchor.ts \
        packages/shared/src/modules/highlight/createAnchor.test.ts
git commit -m "feat: 선택 영역을 텍스트 앵커로 변환하는 로직 구현"
```

---

### Task 6: 앵커 탐색 (`resolveAnchor.ts`)

**Files:**
- Create: `packages/shared/src/modules/highlight/resolveAnchor.ts`
- Test: `packages/shared/src/modules/highlight/resolveAnchor.test.ts`

**Interfaces:**
- Consumes: `buildDocumentTextIndex`, `offsetToPoint` (Task 3), `matchQuote` (Task 4), `HighlightAnchor` (Task 5)
- Produces: `resolveAnchor(anchor: HighlightAnchor, root?: Node): Range | null`

- [ ] **Step 1: 실패하는 테스트 작성**

`packages/shared/src/modules/highlight/resolveAnchor.test.ts`:

```typescript
// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { createAnchor } from "./createAnchor";
import { resolveAnchor } from "./resolveAnchor";

function render(html: string): HTMLElement {
	const root = document.createElement("div");
	root.innerHTML = html;
	document.body.appendChild(root);
	return root;
}

function rangeOf(root: HTMLElement, target: string): Range {
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
	let node = walker.nextNode() as Text | null;

	while (node) {
		const index = node.data.indexOf(target);

		if (index !== -1) {
			const range = document.createRange();
			range.setStart(node, index);
			range.setEnd(node, index + target.length);
			return range;
		}

		node = walker.nextNode() as Text | null;
	}

	throw new Error(`대상 텍스트를 찾지 못했다: ${target}`);
}

describe("resolveAnchor", () => {
	it("같은 문서에서 원래 선택을 그대로 복원한다", () => {
		const root = render("<p>가나다라마바사아자차</p>");
		const anchor = createAnchor(rangeOf(root, "라마바"), root)!;

		expect(resolveAnchor(anchor, root)?.toString()).toBe("라마바");
	});

	it("요소 경계를 가로지르는 선택도 복원한다", () => {
		const root = render("<p>앞부분<strong>강조된곳</strong>뒷부분</p>");
		const range = document.createRange();
		const [first, strong, last] = [
			root.querySelector("p")!.childNodes[0] as Text,
			root.querySelector("strong")!.firstChild as Text,
			root.querySelector("p")!.childNodes[2] as Text,
		];
		range.setStart(first, 1);
		range.setEnd(last, 2);
		const anchor = createAnchor(range, root)!;

		expect(anchor.exact).toBe("부분강조된곳뒷부");
		expect(resolveAnchor(anchor, root)?.toString()).toBe("부분강조된곳뒷부");
		expect(strong.data).toBe("강조된곳");
	});

	it("문단이 옮겨져도 문장이 남아 있으면 찾는다", () => {
		const source = render("<p>가나다라마바사</p>");
		const anchor = createAnchor(rangeOf(source, "라마바"), source)!;
		const moved = render("<div>새로운 머리말</div><p>가나다라마바사</p>");

		expect(resolveAnchor(anchor, moved)?.toString()).toBe("라마바");
	});

	it("같은 문장이 여러 번 나오면 문맥으로 올바른 쪽을 고른다", () => {
		const source = render("<p>하나 사과 둘 사과 셋</p>");
		const anchor = createAnchor(rangeOf(source, "사과 둘"), source)!;
		const resolved = resolveAnchor(anchor, source)!;

		expect(resolved.toString()).toBe("사과 둘");
		expect(resolved.startOffset).toBe(3);
	});

	it("원문에서 사라진 문장은 null을 반환한다", () => {
		const source = render("<p>가나다라마바사</p>");
		const anchor = createAnchor(rangeOf(source, "라마바"), source)!;
		const changed = render("<p>완전히 다른 내용으로 바뀐 문서입니다</p>");

		expect(resolveAnchor(anchor, changed)).toBeNull();
	});
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
pnpm test:jest -- --run packages/shared/src/modules/highlight/resolveAnchor.test.ts
```

기대: FAIL — 모듈을 찾을 수 없음

- [ ] **Step 3: 구현**

`packages/shared/src/modules/highlight/resolveAnchor.ts`:

```typescript
import { buildDocumentTextIndex, offsetToPoint } from "./documentText";
import { matchQuote } from "./matchQuote";
import type { HighlightAnchor } from "./types";

/**
 * 텍스트 앵커를 현재 문서의 Range로 되살린다.
 * @returns 원문에서 문장을 찾지 못하면 null. 호출자는 이 경우 렌더를 건너뛴다.
 */
export function resolveAnchor(
	anchor: HighlightAnchor,
	root: Node = document.body,
): Range | null {
	const index = buildDocumentTextIndex(root);
	const match = matchQuote(index.text, anchor.exact, {
		prefix: anchor.prefix,
		suffix: anchor.suffix,
		hint: anchor.textPositionStart,
	});

	if (!match) {
		return null;
	}

	const start = offsetToPoint(index, match.start);
	const end = offsetToPoint(index, match.end);

	if (!start || !end) {
		return null;
	}

	const range = document.createRange();
	range.setStart(start.node, start.offset);
	range.setEnd(end.node, end.offset);

	return range;
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
pnpm test:jest -- --run packages/shared/src/modules/highlight/resolveAnchor.test.ts
```

기대: PASS (5 케이스)

`offsetToPoint(index, match.end)`가 텍스트 노드의 끝 경계에서 다음 노드의 offset 0이 아니라 이전 노드의 끝을 가리켜야 Range가 올바르게 만들어진다. "요소 경계를 가로지르는 선택" 케이스가 실패하면 `offsetToPoint`에 `preferEnd` 옵션을 추가해 끝 지점 변환 시 이전 노드를 우선하도록 고친다.

- [ ] **Step 5: 커밋**

```bash
pnpm type-check && pnpm lint
git add packages/shared/src/modules/highlight/resolveAnchor.ts \
        packages/shared/src/modules/highlight/resolveAnchor.test.ts
git commit -m "feat: 텍스트 앵커를 현재 문서 Range로 복원하는 로직 구현"
```

---

### Task 7: 하이라이트 렌더러 (`renderHighlights.ts`)

CSS Custom Highlight API로 색을 입힌다. DOM을 건드리지 않으므로 React 기반 사이트를 망가뜨리지 않는다. 미지원 환경에서는 `<span>` 래핑으로 폴백한다.

**Files:**
- Create: `packages/shared/src/modules/highlight/renderHighlights.ts`
- Test: `packages/shared/src/modules/highlight/renderHighlights.test.ts`

**Interfaces:**
- Consumes: `HIGHLIGHT_COLORS` / `HIGHLIGHT_COLOR_STYLE` / `HighlightColor` (Task 2)
- Produces:
  - `createHighlightRenderer(): HighlightRenderer`
  - `interface HighlightRenderer { add(id: number, range: Range, color: HighlightColor): void; remove(id: number): void; setColor(id: number, color: HighlightColor): void; hitTest(x: number, y: number): number | null; clear(): void }`

- [ ] **Step 1: 실패하는 테스트 작성**

jsdom은 CSS Custom Highlight API를 구현하지 않으므로, 테스트는 **폴백 경로(`<span>` 래핑)와 상태 관리**를 검증한다. Custom Highlight 경로는 Task 12의 실기기 확인으로 검증한다.

`packages/shared/src/modules/highlight/renderHighlights.test.ts`:

```typescript
// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { createHighlightRenderer } from "./renderHighlights";

function setup(): { root: HTMLElement; range: Range } {
	const root = document.createElement("div");
	root.innerHTML = "<p>가나다라마바사</p>";
	document.body.appendChild(root);

	const textNode = root.querySelector("p")!.firstChild as Text;
	const range = document.createRange();
	range.setStart(textNode, 3);
	range.setEnd(textNode, 6);

	return { root, range };
}

describe("createHighlightRenderer (폴백 경로)", () => {
	it("추가하면 선택 구간을 span으로 감싼다", () => {
		const { root, range } = setup();
		createHighlightRenderer().add(1, range, "yellow");

		const marked = root.querySelector("[data-webmemo-hl]");
		expect(marked?.textContent).toBe("라마바");
	});

	it("span에 하이라이트 id를 남긴다", () => {
		const { root, range } = setup();
		createHighlightRenderer().add(7, range, "yellow");

		expect(root.querySelector("[data-webmemo-hl]")?.getAttribute("data-webmemo-hl")).toBe("7");
	});

	it("색을 바꾸면 배경색이 갱신된다", () => {
		const { root, range } = setup();
		const renderer = createHighlightRenderer();
		renderer.add(1, range, "yellow");
		renderer.setColor(1, "blue");

		const marked = root.querySelector("[data-webmemo-hl]") as HTMLElement;
		expect(marked.style.backgroundColor).not.toBe("");
	});

	it("제거하면 span이 사라진다", () => {
		const { root, range } = setup();
		const renderer = createHighlightRenderer();
		renderer.add(1, range, "yellow");
		renderer.remove(1);

		expect(root.querySelector("[data-webmemo-hl]")).toBeNull();
	});

	it("clear는 모든 하이라이트를 지운다", () => {
		const { root, range } = setup();
		const renderer = createHighlightRenderer();
		renderer.add(1, range, "yellow");
		renderer.clear();

		expect(root.querySelectorAll("[data-webmemo-hl]")).toHaveLength(0);
	});
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
pnpm test:jest -- --run packages/shared/src/modules/highlight/renderHighlights.test.ts
```

기대: FAIL — 모듈을 찾을 수 없음

- [ ] **Step 3: 구현**

`packages/shared/src/modules/highlight/renderHighlights.ts`:

```typescript
import {
	HIGHLIGHT_COLORS,
	HIGHLIGHT_COLOR_STYLE,
	type HighlightColor,
} from "../../constants/Highlight";

/** ::highlight() 이름 접두사. 페이지의 다른 하이라이트와 충돌하지 않도록 붙인다. */
const HIGHLIGHT_NAME_PREFIX = "webmemo-";
const STYLE_ELEMENT_ID = "webmemo-highlight-style";
const DATA_ATTRIBUTE = "data-webmemo-hl";

export interface HighlightRenderer {
	add(id: number, range: Range, color: HighlightColor): void;
	remove(id: number): void;
	setColor(id: number, color: HighlightColor): void;
	/** 좌표에 있는 하이라이트 id. 없으면 null */
	hitTest(x: number, y: number): number | null;
	clear(): void;
}

/** 이 환경이 CSS Custom Highlight API를 쓸 수 있는지 */
function supportsCustomHighlight(): boolean {
	return (
		typeof CSS !== "undefined" &&
		"highlights" in CSS &&
		typeof (globalThis as { Highlight?: unknown }).Highlight === "function"
	);
}

export function createHighlightRenderer(): HighlightRenderer {
	const ranges = new Map<number, { range: Range; color: HighlightColor }>();

	if (supportsCustomHighlight()) {
		ensureHighlightStyles();
	}

	function repaintCustomHighlights(): void {
		for (const color of HIGHLIGHT_COLORS) {
			const name = `${HIGHLIGHT_NAME_PREFIX}${color}`;
			const forColor = [...ranges.values()]
				.filter((entry) => entry.color === color)
				.map((entry) => entry.range);

			if (forColor.length === 0) {
				CSS.highlights.delete(name);
				continue;
			}

			CSS.highlights.set(
				name,
				new (globalThis as unknown as { Highlight: new (...r: Range[]) => Highlight }).Highlight(
					...forColor,
				),
			);
		}
	}

	function addFallbackSpan(id: number, range: Range, color: HighlightColor): void {
		const span = document.createElement("span");
		span.setAttribute(DATA_ATTRIBUTE, String(id));
		span.style.backgroundColor = HIGHLIGHT_COLOR_STYLE[color].background;
		span.appendChild(range.extractContents());
		range.insertNode(span);
	}

	function removeFallbackSpan(id: number): void {
		const span = document.querySelector(`[${DATA_ATTRIBUTE}="${id}"]`);

		if (!span?.parentNode) {
			return;
		}

		const parent = span.parentNode;
		while (span.firstChild) {
			parent.insertBefore(span.firstChild, span);
		}
		parent.removeChild(span);
		parent.normalize();
	}

	return {
		add(id, range, color) {
			ranges.set(id, { range, color });

			if (supportsCustomHighlight()) {
				repaintCustomHighlights();
				return;
			}

			addFallbackSpan(id, range, color);
		},

		remove(id) {
			ranges.delete(id);

			if (supportsCustomHighlight()) {
				repaintCustomHighlights();
				return;
			}

			removeFallbackSpan(id);
		},

		setColor(id, color) {
			const entry = ranges.get(id);

			if (!entry) {
				return;
			}

			ranges.set(id, { ...entry, color });

			if (supportsCustomHighlight()) {
				repaintCustomHighlights();
				return;
			}

			const span = document.querySelector(
				`[${DATA_ATTRIBUTE}="${id}"]`,
			) as HTMLElement | null;

			if (span) {
				span.style.backgroundColor = HIGHLIGHT_COLOR_STYLE[color].background;
			}
		},

		hitTest(x, y) {
			if (!supportsCustomHighlight()) {
				const element = document.elementFromPoint(x, y);
				const span = element?.closest(`[${DATA_ATTRIBUTE}]`);
				const id = span?.getAttribute(DATA_ATTRIBUTE);

				return id ? Number(id) : null;
			}

			const point = caretPointAt(x, y);

			if (!point) {
				return null;
			}

			for (const [id, entry] of ranges) {
				if (isPointInRange(entry.range, point.node, point.offset)) {
					return id;
				}
			}

			return null;
		},

		clear() {
			if (supportsCustomHighlight()) {
				ranges.clear();
				repaintCustomHighlights();
				return;
			}

			for (const id of [...ranges.keys()]) {
				removeFallbackSpan(id);
			}
			ranges.clear();
		},
	};
}

/**
 * 좌표의 캐럿 위치를 구한다.
 * @description CSS Custom Highlight API에는 "이 좌표가 어떤 하이라이트인가"를 알려주는
 * 표준 API가 없어서 캐럿 위치로 역산한다. caretRangeFromPoint는 비표준이라 폴백으로만 쓴다.
 */
function caretPointAt(x: number, y: number): { node: Node; offset: number } | null {
	if (typeof document.caretPositionFromPoint === "function") {
		const position = document.caretPositionFromPoint(x, y);

		return position
			? { node: position.offsetNode, offset: position.offset }
			: null;
	}

	const legacy = (
		document as unknown as {
			caretRangeFromPoint?: (x: number, y: number) => Range | null;
		}
	).caretRangeFromPoint?.(x, y);

	return legacy
		? { node: legacy.startContainer, offset: legacy.startOffset }
		: null;
}

function isPointInRange(range: Range, node: Node, offset: number): boolean {
	return (
		range.comparePoint(node, offset) === 0 &&
		!range.collapsed
	);
}

/** ::highlight() 규칙을 문서에 한 번만 삽입한다 */
function ensureHighlightStyles(): void {
	if (document.getElementById(STYLE_ELEMENT_ID)) {
		return;
	}

	const style = document.createElement("style");
	style.id = STYLE_ELEMENT_ID;
	style.textContent = HIGHLIGHT_COLORS.map(
		(color) =>
			`::highlight(${HIGHLIGHT_NAME_PREFIX}${color}) { background-color: ${HIGHLIGHT_COLOR_STYLE[color].background}; }`,
	).join("\n");

	document.head.appendChild(style);
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
pnpm test:jest -- --run packages/shared/src/modules/highlight/renderHighlights.test.ts
```

기대: PASS (5 케이스)

- [ ] **Step 5: 커밋**

```bash
pnpm type-check && pnpm lint
git add packages/shared/src/modules/highlight/renderHighlights.ts \
        packages/shared/src/modules/highlight/renderHighlights.test.ts
git commit -m "feat: 하이라이트 렌더러 구현 (CSS Custom Highlight + span 폴백)"
```

---

### Task 8: 선택 추적기와 주입 엔트리

선택이 바뀔 때마다 앵커를 미리 계산해 캐싱한다. `onCustomMenuSelection` 콜백은 `selectedText`만 주고 Range를 주지 않으며, 콜백을 받은 뒤에 선택을 읽으려 하면 이미 해제되어 있을 수 있기 때문이다.

**Files:**
- Create: `packages/shared/src/modules/highlight/selectionTracker.ts`
- Create: `packages/shared/src/modules/highlight/index.ts`
- Create: `packages/shared/src/modules/highlight/injected/entry.ts`
- Test: `packages/shared/src/modules/highlight/selectionTracker.test.ts`

**Interfaces:**
- Consumes: `createAnchor` (Task 5), `resolveAnchor` (Task 6), `createHighlightRenderer` (Task 7), `HighlightAnchor` / `HighlightItem` (Task 5)
- Produces:
  - `createSelectionTracker(): { start(): void; stop(): void; getPendingAnchor(): HighlightAnchor | null; getRejection(): "tooLong" | null }`
  - `isSelectableTarget(node: Node | null): boolean`
  - `MIN_SELECTION_LENGTH = 3`, `MAX_SELECTION_LENGTH = 5000`
  - WebView 전역: `window.__webmemoCommitHighlight()`, `window.__webmemoRestore(items)`, `window.__webmemoAdd(item)`, `window.__webmemoRemove(id)`, `window.__webmemoSetColor(id, color)`

- [ ] **Step 1: 실패하는 테스트 작성**

`packages/shared/src/modules/highlight/selectionTracker.test.ts`:

```typescript
// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { isSelectableTarget } from "./selectionTracker";

describe("isSelectableTarget", () => {
	it("일반 문단은 선택할 수 있다", () => {
		const p = document.createElement("p");
		p.textContent = "본문";

		expect(isSelectableTarget(p.firstChild)).toBe(true);
	});

	it("input 안은 선택 대상이 아니다", () => {
		const input = document.createElement("input");

		expect(isSelectableTarget(input)).toBe(false);
	});

	it("textarea 안은 선택 대상이 아니다", () => {
		const textarea = document.createElement("textarea");
		textarea.textContent = "내용";

		expect(isSelectableTarget(textarea.firstChild)).toBe(false);
	});

	it("contenteditable 안은 선택 대상이 아니다", () => {
		const editable = document.createElement("div");
		editable.setAttribute("contenteditable", "true");
		const child = document.createElement("span");
		editable.appendChild(child);

		expect(isSelectableTarget(child)).toBe(false);
	});

	it("null은 선택 대상이 아니다", () => {
		expect(isSelectableTarget(null)).toBe(false);
	});
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
pnpm test:jest -- --run packages/shared/src/modules/highlight/selectionTracker.test.ts
```

기대: FAIL — 모듈을 찾을 수 없음

- [ ] **Step 3: 선택 추적기 구현**

`packages/shared/src/modules/highlight/selectionTracker.ts`:

```typescript
import { createAnchor } from "./createAnchor";
import type { HighlightAnchor } from "./types";

/** 이보다 짧은 선택은 오터치로 본다. 기존 확장의 텍스트 선택 핸들러와 같은 기준이다. */
export const MIN_SELECTION_LENGTH = 3;

/** 이보다 긴 선택은 근사 매칭 성능이 나빠져 거절한다. */
export const MAX_SELECTION_LENGTH = 5000;

/**
 * 선택 대상으로 허용할 노드인지 판정한다.
 * @description contenteditable 배제는 필수다. 해당 요소에서는 react-native-webview의
 * menuItems가 동작하지 않고 AutoFill만 뜨는 알려진 이슈가 있다.
 */
export function isSelectableTarget(node: Node | null): boolean {
	if (!node) {
		return false;
	}

	const element =
		node.nodeType === Node.ELEMENT_NODE
			? (node as Element)
			: node.parentElement;

	if (!element) {
		return false;
	}

	if (element.closest("input, textarea, [contenteditable='true']")) {
		return false;
	}

	return true;
}

export function createSelectionTracker() {
	let pendingAnchor: HighlightAnchor | null = null;
	let rejection: "tooLong" | null = null;

	function handleSelectionChange(): void {
		pendingAnchor = null;
		rejection = null;

		const selection = document.getSelection();

		if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
			return;
		}

		const range = selection.getRangeAt(0);
		const text = range.toString().trim();

		if (text.length < MIN_SELECTION_LENGTH) {
			return;
		}

		/** 너무 긴 선택은 거절 사유를 남긴다. 앱이 이유를 알려줘야 사용자가 다시 시도할 수 있다. */
		if (text.length > MAX_SELECTION_LENGTH) {
			rejection = "tooLong";
			return;
		}

		if (!isSelectableTarget(range.startContainer)) {
			return;
		}

		pendingAnchor = createAnchor(range);
	}

	return {
		start() {
			document.addEventListener("selectionchange", handleSelectionChange);
		},
		stop() {
			document.removeEventListener("selectionchange", handleSelectionChange);
		},
		getPendingAnchor: () => pendingAnchor,
		getRejection: () => rejection,
	};
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
pnpm test:jest -- --run packages/shared/src/modules/highlight/selectionTracker.test.ts
```

기대: PASS (5 케이스)

- [ ] **Step 5: 모듈 배럴 작성**

`packages/shared/src/modules/highlight/index.ts`:

```typescript
export * from "./types";
export * from "./constants";
export * from "./documentText";
export * from "./matchQuote";
export * from "./createAnchor";
export * from "./resolveAnchor";
export * from "./renderHighlights";
export * from "./selectionTracker";
```

- [ ] **Step 6: 주입 엔트리 작성**

`packages/shared/src/modules/highlight/injected/entry.ts`:

```typescript
import type { HighlightColor } from "../../../constants/Highlight";
import { createHighlightRenderer } from "../renderHighlights";
import { resolveAnchor } from "../resolveAnchor";
import { createSelectionTracker } from "../selectionTracker";
import type { HighlightItem, HighlightOutboundMessage } from "../types";

/**
 * WebView에 주입되는 엔트리.
 * @description esbuild가 이 파일을 IIFE로 번들해 문자열로 만든다.
 * 앱은 window.__webmemo* 전역을 injectJavaScript로 호출해 이 스크립트를 조작한다.
 */

declare global {
	interface Window {
		__webmemoHighlightReady?: boolean;
		__webmemoCommitHighlight: () => void;
		__webmemoRestore: (items: HighlightItem[]) => void;
		__webmemoAdd: (item: HighlightItem) => void;
		__webmemoRemove: (id: number) => void;
		__webmemoSetColor: (id: number, color: HighlightColor) => void;
		ReactNativeWebView: { postMessage: (message: string) => void };
	}
}

function post(message: HighlightOutboundMessage): void {
	window.ReactNativeWebView.postMessage(JSON.stringify(message));
}

function getFavIconUrl(): string {
	const link =
		document.querySelector('link[rel="icon"]') ??
		document.querySelector('link[rel="shortcut icon"]') ??
		document.querySelector('link[rel="apple-touch-icon"]');

	return (link as HTMLLinkElement | null)?.href ?? `${window.location.origin}/favicon.ico`;
}

if (!window.__webmemoHighlightReady) {
	window.__webmemoHighlightReady = true;

	const renderer = createHighlightRenderer();
	const tracker = createSelectionTracker();
	tracker.start();

	/** 현재 페이지에 이미 저장된 앵커들. 중복 저장을 거르는 데 쓴다(설계 §6-4). */
	let savedAnchors: { exact: string; textPositionStart: number }[] = [];

	window.__webmemoCommitHighlight = () => {
		const rejection = tracker.getRejection();

		if (rejection) {
			post({ type: "highlight:rejected", reason: rejection });
			return;
		}

		const anchor = tracker.getPendingAnchor();

		if (!anchor) {
			return;
		}

		const isDuplicate = savedAnchors.some(
			(saved) =>
				saved.exact === anchor.exact &&
				saved.textPositionStart === anchor.textPositionStart,
		);

		if (isDuplicate) {
			post({ type: "highlight:rejected", reason: "duplicate" });
			return;
		}

		post({
			type: "highlight:create",
			anchor,
			url: window.location.href,
			title: document.title,
			favIconUrl: getFavIconUrl(),
		});
	};

	window.__webmemoRestore = (items) => {
		renderer.clear();
		savedAnchors = items.map((item) => ({
			exact: item.anchor.exact,
			textPositionStart: item.anchor.textPositionStart,
		}));

		let resolved = 0;
		let unresolved = 0;

		for (const item of items) {
			const range = resolveAnchor(item.anchor);

			if (!range) {
				unresolved += 1;
				continue;
			}

			renderer.add(item.id, range, item.color);
			resolved += 1;
		}

		post({ type: "highlight:restored", resolved, unresolved });
	};

	window.__webmemoAdd = (item) => {
		const range = resolveAnchor(item.anchor);

		if (range) {
			renderer.add(item.id, range, item.color);
			savedAnchors.push({
				exact: item.anchor.exact,
				textPositionStart: item.anchor.textPositionStart,
			});
		}
	};

	window.__webmemoRemove = (id) => renderer.remove(id);

	window.__webmemoSetColor = (id, color) => renderer.setColor(id, color);

	document.addEventListener("click", (event) => {
		const id = renderer.hitTest(event.clientX, event.clientY);

		if (id !== null) {
			post({ type: "highlight:tap", id });
		}
	});
}
```

- [ ] **Step 7: 타입 체크 후 커밋**

```bash
pnpm type-check && pnpm lint
git add packages/shared/src/modules/highlight/selectionTracker.ts \
        packages/shared/src/modules/highlight/selectionTracker.test.ts \
        packages/shared/src/modules/highlight/index.ts \
        packages/shared/src/modules/highlight/injected/entry.ts
git commit -m "feat: 하이라이트 선택 추적기와 WebView 주입 엔트리 구현"
```

---

### Task 9: 주입 스크립트 번들 빌드

`injectedJavaScript`는 문자열이어야 한다. TS 모듈을 esbuild로 IIFE 번들한 뒤 문자열로 export하는 파일을 생성한다.

**Files:**
- Create: `packages/shared/scripts/buildInjectedScript.mjs`
- Create: `packages/shared/src/modules/highlight/injected/.gitignore`
- Modify: `packages/shared/package.json`
- Modify: `packages/shared/src/modules/highlight/index.ts`

**Interfaces:**
- Consumes: `injected/entry.ts` (Task 8)
- Produces: `packages/shared/src/modules/highlight/injected/highlightScript.ts` — `export const HIGHLIGHT_SCRIPT: string`

- [ ] **Step 1: esbuild 설치**

```bash
pnpm -F @web-memo/shared add -D esbuild
```

- [ ] **Step 2: 빌드 스크립트 작성**

`packages/shared/scripts/buildInjectedScript.mjs`:

```javascript
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const here = dirname(fileURLToPath(import.meta.url));
const injectedDir = resolve(here, "../src/modules/highlight/injected");

const result = await build({
	entryPoints: [resolve(injectedDir, "entry.ts")],
	bundle: true,
	format: "iife",
	minify: true,
	// WebView 최소 지원 환경. 설계 §5-1 참고.
	target: ["safari17", "chrome105"],
	write: false,
});

const code = result.outputFiles[0].text;

writeFileSync(
	resolve(injectedDir, "highlightScript.ts"),
	`// 이 파일은 scripts/buildInjectedScript.mjs가 생성한다. 직접 수정하지 않는다.\n` +
		`/** WebView에 주입할 하이라이트 스크립트 (IIFE 번들) */\n` +
		`export const HIGHLIGHT_SCRIPT = ${JSON.stringify(code)};\n`,
	"utf8",
);

console.log(`highlightScript.ts 생성 완료 (${code.length} bytes)`);
```

- [ ] **Step 3: 생성 파일을 git에서 제외**

`packages/shared/src/modules/highlight/injected/.gitignore`:

```
highlightScript.ts
```

- [ ] **Step 4: package.json에 스크립트 등록**

`packages/shared/package.json`의 `scripts`에 추가하고, `type-check`가 생성 파일에 의존하므로 그 앞에 붙인다.

```json
	"scripts": {
		"build:injected": "node scripts/buildInjectedScript.mjs",
		"type-check": "pnpm build:injected && tsc --noEmit",
		"tsc-watch": "tsc-watch"
	},
```

`exports`와 `typesVersions`에도 항목을 추가한다.

```json
		"./modules/highlight": {
			"types": "./src/modules/highlight/index.ts",
			"default": "./src/modules/highlight/index.ts"
		},
```

```json
				"modules/highlight": [
					"./src/modules/highlight/index.ts"
				],
```

- [ ] **Step 5: 배럴에 생성 파일 export 추가**

`packages/shared/src/modules/highlight/index.ts` 마지막 줄에 추가:

```typescript
export * from "./injected/highlightScript";
```

- [ ] **Step 6: 빌드 실행 후 결과 확인**

```bash
pnpm -F @web-memo/shared build:injected
head -c 300 packages/shared/src/modules/highlight/injected/highlightScript.ts
```

기대: `export const HIGHLIGHT_SCRIPT = "(()=>{..."` 형태의 파일이 생성된다.

- [ ] **Step 7: 타입 체크 후 커밋**

```bash
pnpm type-check && pnpm lint
git add packages/shared/scripts/buildInjectedScript.mjs \
        packages/shared/src/modules/highlight/injected/.gitignore \
        packages/shared/package.json \
        packages/shared/src/modules/highlight/index.ts \
        pnpm-lock.yaml
git commit -m "feat: 하이라이트 주입 스크립트 esbuild 번들 빌드 스텝 추가"
```

---

### Task 10: HighlightService

**Files:**
- Modify: `packages/shared/src/utils/Supabase.ts`
- Test: `packages/shared/src/utils/Supabase.test.ts`

**Interfaces:**
- Consumes: `SUPABASE` (Task 2), `HighlightRow` / `HighlightTable` (Task 2), `MemoSupabaseClient`
- Produces: `class HighlightService`
  - `getHighlightsByUrl(url: string)`
  - `getHighlightsPaginated({ cursor?, limit?, searchQuery?, color? })`
  - `insertHighlight(request: HighlightTable["Insert"])`
  - `updateHighlight({ id, request }: { id: number; request: HighlightTable["Update"] })`
  - `deleteHighlight(id: number)`
  - `interface HighlightPageCursor { value: string; id: number }`

- [ ] **Step 1: 기존 파일 구조 확인**

`packages/shared/src/utils/Supabase.ts`에서 `MemoService.getMemosPaginated`의 커서 필터 구현을 읽는다. `HighlightService`도 같은 (정렬값, id) 복합 커서 방식을 써야 한다.

- [ ] **Step 2: 실패하는 테스트 작성**

`packages/shared/src/utils/Supabase.test.ts`에 추가한다. 기존 파일의 Supabase 클라이언트 모킹 방식을 먼저 읽고 같은 방식을 쓴다.

```typescript
describe("HighlightService.getHighlightsPaginated", () => {
	it("검색어가 있으면 exact_text와 note를 대상으로 필터를 건다", async () => {
		const { client, calls } = createMockClient();
		await new HighlightService(client).getHighlightsPaginated({
			searchQuery: "리액트",
		});

		expect(calls.or).toContainEqual(
			expect.stringContaining("exact_text.ilike.%리액트%"),
		);
		expect(calls.or).toContainEqual(expect.stringContaining("note.ilike.%리액트%"));
	});

	it("커서가 있으면 (created_at, id) 복합 조건으로 다음 페이지를 요청한다", async () => {
		const { client, calls } = createMockClient();
		await new HighlightService(client).getHighlightsPaginated({
			cursor: { value: "2026-08-15T00:00:00Z", id: 42 },
		});

		expect(calls.or).toContainEqual(
			"created_at.lt.2026-08-15T00:00:00Z,and(created_at.eq.2026-08-15T00:00:00Z,id.lt.42)",
		);
	});
});
```

- [ ] **Step 3: 테스트 실패 확인**

```bash
pnpm test:jest -- --run packages/shared/src/utils/Supabase.test.ts
```

기대: FAIL — `HighlightService is not defined`

- [ ] **Step 4: 구현**

`packages/shared/src/utils/Supabase.ts`의 `MemoService` 아래에 추가한다.

```typescript
/** 하이라이트 목록 페이지네이션 커서. (정렬값, id) 복합 커서로 중복·누락을 막는다. */
export interface HighlightPageCursor {
	value: string;
	id: number;
}

export class HighlightService {
	supabaseClient: MemoSupabaseClient;

	constructor(supabaseClient: MemoSupabaseClient) {
		this.supabaseClient = supabaseClient;
	}

	private get table() {
		return this.supabaseClient
			.schema(SUPABASE.schema.memo)
			.from(SUPABASE.table.highlight);
	}

	/** 모바일 WebView 복원용. 페이지 하나의 하이라이트를 모두 가져온다. */
	getHighlightsByUrl = async (url: string) =>
		this.table.select("*").eq("url", url).order("id", { ascending: true });

	getHighlightsPaginated = async ({
		cursor,
		limit = 20,
		searchQuery,
		color,
	}: {
		cursor?: HighlightPageCursor;
		limit?: number;
		searchQuery?: string;
		color?: string;
	}) => {
		let query = this.table.select("*");

		if (color) {
			query = query.eq("color", color);
		}

		if (searchQuery) {
			query = query.or(
				`exact_text.ilike.%${searchQuery}%,note.ilike.%${searchQuery}%`,
			);
		}

		if (cursor) {
			query = query.or(
				`created_at.lt.${cursor.value},and(created_at.eq.${cursor.value},id.lt.${cursor.id})`,
			);
		}

		return query
			.order("created_at", { ascending: false })
			.order("id", { ascending: false })
			.limit(limit);
	};

	insertHighlight = async (request: HighlightTable["Insert"]) =>
		this.table.insert(request).select();

	updateHighlight = async ({
		id,
		request,
	}: {
		id: number;
		request: HighlightTable["Update"];
	}) =>
		this.table
			.update({ ...request, updated_at: new Date().toISOString() })
			.eq("id", id)
			.select();

	deleteHighlight = async (id: number) => this.table.delete().eq("id", id);
}
```

파일 상단 import에 `HighlightTable`을 추가한다.

- [ ] **Step 5: 테스트 통과 확인**

```bash
pnpm test:jest -- --run packages/shared/src/utils/Supabase.test.ts
```

기대: PASS

- [ ] **Step 6: 파일 길이 확인**

```bash
wc -l packages/shared/src/utils/Supabase.ts
```

300줄을 크게 넘으면 `HighlightService`를 `packages/shared/src/utils/supabase/highlightService.ts`로 분리하고 `Supabase.ts`에서 re-export한다. 기존 서비스들은 건드리지 않는다.

- [ ] **Step 7: 커밋**

```bash
pnpm type-check && pnpm lint
git add packages/shared/src/utils/Supabase.ts packages/shared/src/utils/Supabase.test.ts
git commit -m "feat: 하이라이트 조회/저장 서비스 계층 추가"
```

---

### Task 11: 모바일 쿼리·뮤테이션 훅

`apps/app`은 `packages/shared`의 훅을 쓰지 않고 자체 훅을 둔다(기존 `useMemos.ts` / `useMemoMutation.ts` 패턴). 같은 관례를 따른다.

**Files:**
- Create: `apps/app/lib/hooks/useHighlights.ts`
- Create: `apps/app/lib/hooks/useHighlightMutation.ts`

**Interfaces:**
- Consumes: `HighlightService` (Task 10), `QUERY_KEY.highlightsByUrl` (Task 2), `supabase` / `memoService` 클라이언트(`apps/app/lib/supabase/client.ts`), `useAuth` (`apps/app/lib/auth/AuthProvider`)
- Produces:
  - `useHighlightsByUrl(url: string): UseQueryResult<HighlightRow[]>`
  - `useHighlightCreateMutation(): UseMutationResult<HighlightRow, Error, CreateHighlightInput>`
  - `useHighlightUpdateMutation()`, `useHighlightDeleteMutation()`
  - `interface CreateHighlightInput { anchor: HighlightAnchor; url: string; title: string; favIconUrl: string }`

- [ ] **Step 1: 기존 훅 패턴 확인**

`apps/app/lib/hooks/useMemoByUrl.ts`와 `useMemoMutation.ts`를 읽는다. `highlightService` 인스턴스를 어디에 두는지(`apps/app/lib/supabase/client.ts`가 `memoService`를 export하는 방식)를 확인하고 같은 자리에 `highlightService`를 추가한다.

```typescript
// apps/app/lib/supabase/client.ts 끝에 추가
export const highlightService = new HighlightService(supabase);
```

- [ ] **Step 2: 조회 훅 작성**

`apps/app/lib/hooks/useHighlights.ts`:

```typescript
import { QUERY_KEY } from "@web-memo/shared/constants";
import type { HighlightRow } from "@web-memo/shared/types";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthProvider";
import { highlightService } from "../supabase/client";

/**
 * 페이지 하나의 하이라이트를 조회한다. WebView 복원에 쓴다.
 * @description 하이라이트는 로그인 필수이므로 비로그인 상태에서는 조회하지 않는다.
 */
export function useHighlightsByUrl(url: string) {
	const { isLoggedIn } = useAuth();

	return useQuery<HighlightRow[]>({
		queryKey: QUERY_KEY.highlightsByUrl(url),
		queryFn: async () => {
			const { data, error } = await highlightService.getHighlightsByUrl(url);

			if (error) {
				throw new Error(error.message);
			}

			return data ?? [];
		},
		enabled: isLoggedIn && url.length > 0,
	});
}
```

- [ ] **Step 3: 뮤테이션 훅 작성**

`apps/app/lib/hooks/useHighlightMutation.ts`:

```typescript
import { DEFAULT_HIGHLIGHT_COLOR, QUERY_KEY } from "@web-memo/shared/constants";
import type { HighlightColor } from "@web-memo/shared/constants";
import type { HighlightAnchor } from "@web-memo/shared/modules/highlight";
import type { HighlightRow } from "@web-memo/shared/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { normalizeUrl } from "@web-memo/shared/utils";
import { useAuth } from "../auth/AuthProvider";
import { highlightService } from "../supabase/client";

export interface CreateHighlightInput {
	anchor: HighlightAnchor;
	url: string;
	title: string;
	favIconUrl: string;
}

/**
 * 하이라이트를 저장한다.
 * @description 낙관적 업데이트를 하지 않는다. 밑줄은 보이는데 서버에 없는 상태가
 * 사용자에게 가장 나쁘므로, 저장이 성공한 뒤에 그린다(설계 §6-2).
 */
export function useHighlightCreateMutation() {
	const queryClient = useQueryClient();
	const { session } = useAuth();

	return useMutation<HighlightRow, Error, CreateHighlightInput>({
		mutationFn: async (input) => {
			const userId = session?.user.id;

			if (!userId) {
				throw new Error("로그인이 필요합니다.");
			}

			const url = normalizeUrl(input.url);
			const { data, error } = await highlightService.insertHighlight({
				user_id: userId,
				url,
				title: input.title,
				favIconUrl: input.favIconUrl,
				exact_text: input.anchor.exact,
				prefix_text: input.anchor.prefix,
				suffix_text: input.anchor.suffix,
				text_position_start: input.anchor.textPositionStart,
				color: DEFAULT_HIGHLIGHT_COLOR,
			});

			if (error || !data?.[0]) {
				throw new Error(error?.message ?? "하이라이트를 저장하지 못했습니다.");
			}

			return data[0];
		},
		onSuccess: (highlight) => {
			queryClient.invalidateQueries({
				queryKey: QUERY_KEY.highlightsByUrl(highlight.url),
			});
		},
	});
}

export function useHighlightUpdateMutation() {
	const queryClient = useQueryClient();

	return useMutation<
		HighlightRow,
		Error,
		{ id: number; url: string; color?: HighlightColor; note?: string }
	>({
		mutationFn: async ({ id, color, note }) => {
			const { data, error } = await highlightService.updateHighlight({
				id,
				request: { ...(color ? { color } : {}), ...(note !== undefined ? { note } : {}) },
			});

			if (error || !data?.[0]) {
				throw new Error(error?.message ?? "하이라이트를 수정하지 못했습니다.");
			}

			return data[0];
		},
		onSuccess: (_result, variables) => {
			queryClient.invalidateQueries({
				queryKey: QUERY_KEY.highlightsByUrl(variables.url),
			});
		},
	});
}

export function useHighlightDeleteMutation() {
	const queryClient = useQueryClient();

	return useMutation<void, Error, { id: number; url: string }>({
		mutationFn: async ({ id }) => {
			const { error } = await highlightService.deleteHighlight(id);

			if (error) {
				throw new Error(error.message);
			}
		},
		onSuccess: (_result, variables) => {
			queryClient.invalidateQueries({
				queryKey: QUERY_KEY.highlightsByUrl(variables.url),
			});
		},
	});
}
```

- [ ] **Step 4: 타입 체크**

```bash
pnpm type-check
```

`normalizeUrl`의 실제 export 경로가 `@web-memo/shared/utils`가 아니면 실제 경로로 고친다.

- [ ] **Step 5: 커밋**

```bash
pnpm lint
git add apps/app/lib/hooks/useHighlights.ts \
        apps/app/lib/hooks/useHighlightMutation.ts \
        apps/app/lib/supabase/client.ts
git commit -m "feat: 모바일 하이라이트 조회/저장 훅 추가"
```

---

### Task 12: 모바일 WebView 통합

**Files:**
- Modify: `apps/app/app/(main)/browser/_utils/webViewScripts.ts`
- Modify: `apps/app/app/(main)/browser/_hooks/useBrowserState.ts`
- Modify: `apps/app/app/(main)/browser/index.tsx`
- Create: `apps/app/app/(main)/browser/_hooks/useWebViewHighlights.ts`

**Interfaces:**
- Consumes: `HIGHLIGHT_SCRIPT` (Task 9), `useHighlightsByUrl` / `useHighlightCreateMutation` (Task 11), `HighlightOutboundMessage` / `HighlightItem` (Task 5)
- Produces:
  - `useWebViewHighlights({ webViewRef, currentUrl }): { menuItems, handleCustomMenuSelection, handleHighlightMessage, restoreHighlights, rows, tappedHighlightId, clearTappedHighlight, highlightToast }`
  - `rows: HighlightRow[]` — Task 13이 탭된 하이라이트를 찾는 데 쓴다
  - `highlightToast: string | null` — 기존 `wishToast`와 같은 방식으로 화면에 띄운다

- [ ] **Step 1: 주입 스크립트에 하이라이트 번들 합치기**

`apps/app/app/(main)/browser/_utils/webViewScripts.ts` 끝을 수정한다.

```typescript
import { HIGHLIGHT_SCRIPT } from "@web-memo/shared/modules/highlight";

/** 네비게이션 완료 시 injectJavaScript로 주입할 전체 스크립트 */
export const INJECTED_JS_ON_NAVIGATION = `${FAVICON_EXTRACT_JS}\n${SCROLL_DETECT_JS}\n${HIGHLIGHT_SCRIPT}\ntrue;`;

/** WebView 최초 로드 시 주입할 스크립트 */
export const INJECTED_JS_ON_LOAD = `${SCROLL_DETECT_JS}\n${HIGHLIGHT_SCRIPT}\ntrue;`;
```

- [ ] **Step 2: 하이라이트 전용 훅 작성**

`useBrowserState.ts`가 이미 395줄이라 여기에 더 넣으면 300줄 규칙에서 더 멀어진다. 별도 훅으로 분리한다.

`apps/app/app/(main)/browser/_hooks/useWebViewHighlights.ts`:

```typescript
import type { HighlightItem } from "@web-memo/shared/modules/highlight";
import { normalizeUrl } from "@web-memo/shared/utils";
import { useCallback, useEffect, useState } from "react";
import type WebView from "react-native-webview";
import { useHighlightCreateMutation } from "../../../../lib/hooks/useHighlightMutation";
import { useHighlightsByUrl } from "../../../../lib/hooks/useHighlights";
import { useAuth } from "../../../../lib/auth/AuthProvider";

const HIGHLIGHT_MENU_KEY = "webmemo-highlight";

export function useWebViewHighlights({
	webViewRef,
	currentUrl,
}: {
	webViewRef: React.RefObject<WebView | null>;
	currentUrl: string;
}) {
	const { isLoggedIn } = useAuth();
	const [tappedHighlightId, setTappedHighlightId] = useState<number | null>(null);
	const [highlightToast, setHighlightToast] = useState<string | null>(null);

	/** 앱에 토스트 라이브러리가 없어 기존 wishToast와 같은 방식으로 3초 후 스스로 사라지게 한다 */
	const showToast = useCallback((message: string) => {
		setHighlightToast(message);
		setTimeout(() => setHighlightToast(null), 3000);
	}, []);

	const normalizedUrl = currentUrl ? normalizeUrl(currentUrl) : "";
	const { data: highlights } = useHighlightsByUrl(normalizedUrl);
	const { mutate: createHighlight } = useHighlightCreateMutation();

	/** 비로그인 상태에서는 메뉴 항목을 노출하지 않는다 (설계 §6-5) */
	const menuItems = isLoggedIn
		? [{ label: "하이라이트", key: HIGHLIGHT_MENU_KEY }]
		: [];

	const handleCustomMenuSelection = useCallback(
		(event: { nativeEvent: { key: string } }) => {
			if (event.nativeEvent.key !== HIGHLIGHT_MENU_KEY) {
				return;
			}

			webViewRef.current?.injectJavaScript("window.__webmemoCommitHighlight(); true;");
		},
		[webViewRef],
	);

	const handleHighlightMessage = useCallback(
		(message: { type: string; [key: string]: unknown }) => {
			if (message.type === "highlight:create") {
				createHighlight(
					{
						anchor: message.anchor as HighlightItem["anchor"],
						url: message.url as string,
						title: message.title as string,
						favIconUrl: message.favIconUrl as string,
					},
					{
						onSuccess: (saved) => {
							const item: HighlightItem = {
								id: saved.id,
								anchor: {
									exact: saved.exact_text,
									prefix: saved.prefix_text ?? "",
									suffix: saved.suffix_text ?? "",
									textPositionStart: saved.text_position_start ?? 0,
								},
								color: saved.color as HighlightItem["color"],
							};

							webViewRef.current?.injectJavaScript(
								`window.__webmemoAdd(${JSON.stringify(item)}); true;`,
							);
						},
						onError: () => showToast("하이라이트를 저장하지 못했습니다"),
					},
				);
				return;
			}

			if (message.type === "highlight:tap") {
				setTappedHighlightId(message.id as number);
				return;
			}

			if (message.type === "highlight:rejected") {
				showToast(
					message.reason === "tooLong"
						? "선택한 문장이 너무 깁니다"
						: "이미 하이라이트한 문장입니다",
				);
			}
		},
		[createHighlight, showToast, webViewRef],
	);

	/** 페이지 로드 완료 시 저장된 하이라이트를 내려보낸다 */
	const restoreHighlights = useCallback(() => {
		if (!highlights?.length) {
			return;
		}

		const items: HighlightItem[] = highlights.map((row) => ({
			id: row.id,
			anchor: {
				exact: row.exact_text,
				prefix: row.prefix_text ?? "",
				suffix: row.suffix_text ?? "",
				textPositionStart: row.text_position_start ?? 0,
			},
			color: row.color as HighlightItem["color"],
		}));

		webViewRef.current?.injectJavaScript(
			`window.__webmemoRestore(${JSON.stringify(items)}); true;`,
		);
	}, [highlights, webViewRef]);

	/** 조회가 늦게 끝나 복원 시점을 놓친 경우를 위해 데이터가 바뀌면 다시 그린다 */
	useEffect(() => {
		restoreHighlights();
	}, [restoreHighlights]);

	return {
		menuItems,
		handleCustomMenuSelection,
		handleHighlightMessage,
		restoreHighlights,
		rows: highlights ?? [],
		tappedHighlightId,
		clearTappedHighlight: () => setTappedHighlightId(null),
		highlightToast,
	};
}
```

- [ ] **Step 3: 메시지 핸들러에 분기 추가**

`apps/app/app/(main)/browser/_hooks/useBrowserState.ts`의 `handleWebViewMessage`(293행 부근)를 수정한다. 하이라이트 메시지는 상위에서 주입받은 콜백으로 넘긴다.

```typescript
	const handleWebViewMessage = useCallback(
		(event: { nativeEvent: { data: string } }) => {
			try {
				const message = JSON.parse(event.nativeEvent.data);
				if (message.type === "favicon" && message.url) {
					setPageFavIconUrl(message.url);
				} else if (message.type === "scroll") {
					handleScrollMessage(message.direction, message.scrollY);
				} else if (typeof message.type === "string" && message.type.startsWith("highlight:")) {
					onHighlightMessage?.(message);
				}
			} catch {}
		},
		[handleScrollMessage, onHighlightMessage],
	);
```

`useBrowserState`의 파라미터에 `onHighlightMessage?: (message: { type: string; [key: string]: unknown }) => void`를 추가한다. 기존 호출부가 인자 없이 호출하고 있다면 선택적 파라미터이므로 그대로 동작한다.

- [ ] **Step 4: 화면에 연결**

`apps/app/app/(main)/browser/index.tsx`에서 훅을 연결하고 `<WebView>`에 prop을 추가한다.

```tsx
const highlights = useWebViewHighlights({ webViewRef, currentUrl });
```

`useBrowserState` 호출에 `onHighlightMessage: highlights.handleHighlightMessage`를 넘기고, `<WebView>`에 아래를 추가한다.

```tsx
menuItems={highlights.menuItems}
onCustomMenuSelection={highlights.handleCustomMenuSelection}
onLoadEnd={highlights.restoreHighlights}
injectedJavaScript={INJECTED_JS_ON_LOAD}
```

기존 `injectedJavaScript={SCROLL_DETECT_JS}`를 `INJECTED_JS_ON_LOAD`로 바꾸는 것이다. `import`도 함께 고친다.

토스트도 렌더한다. `browser/index.tsx` 132행 부근의 `wishToast` 블록을 찾아 바로 아래에 같은 형식으로 추가한다.

```tsx
{highlights.highlightToast ? (
	<View className="absolute bottom-24 self-center rounded-full bg-neutral-900/90 px-4 py-2">
		<Text className="text-white text-sm font-semibold">{highlights.highlightToast}</Text>
	</View>
) : null}
```

정확한 래퍼 클래스는 기존 `wishToast` 블록의 것을 그대로 복사해 쓴다.

**Task 1의 Android 검증이 실패했다면** 여기서 `Platform.OS === "android"`일 때 `menuItems`를 비우고, 대신 `HIGHLIGHT_SCRIPT`가 페이지 안에 띄우는 플로팅 버튼을 쓰도록 분기한다. 이 경우 `injected/entry.ts`에 버튼 렌더 코드를 추가하는 별도 작업이 필요하다.

- [ ] **Step 5: 실기기에서 저장·복원 확인**

```bash
pnpm dev:app
```

1. 로그인한 상태로 브라우저 탭에서 기사 페이지를 연다
2. 문장을 선택하고 "하이라이트"를 누른다 → 노란 밑줄이 즉시 나타난다
3. 다른 페이지로 갔다가 돌아온다 → 밑줄이 그대로 있다
4. 로그아웃한다 → 선택 메뉴에 "하이라이트"가 보이지 않는다
5. Supabase 대시보드에서 `memo.highlight` 행을 확인한다

- [ ] **Step 6: 커밋**

```bash
pnpm type-check && pnpm lint
git add "apps/app/app/(main)/browser/_utils/webViewScripts.ts" \
        "apps/app/app/(main)/browser/_hooks/useBrowserState.ts" \
        "apps/app/app/(main)/browser/_hooks/useWebViewHighlights.ts" \
        "apps/app/app/(main)/browser/index.tsx"
git commit -m "feat: 모바일 WebView에서 하이라이트 저장/복원 연결"
```

---

### Task 13: 모바일 하이라이트 편집 바텀시트

밑줄을 탭하면 색을 바꾸거나 코멘트를 달거나 지운다. 기존 `MemoDetailModal`과 같은 Modal 바텀시트 패턴을 따른다.

**Files:**
- Create: `apps/app/app/(main)/browser/_components/HighlightEditSheet.tsx`
- Modify: `apps/app/app/(main)/browser/index.tsx`

**Interfaces:**
- Consumes: `useHighlightUpdateMutation` / `useHighlightDeleteMutation` (Task 11), `HIGHLIGHT_COLORS` / `HIGHLIGHT_COLOR_STYLE` (Task 2), `tappedHighlightId` / `clearTappedHighlight` (Task 12)
- Produces: `HighlightEditSheet` 컴포넌트

- [ ] **Step 1: 기존 바텀시트 패턴 확인**

`apps/app/app/(main)/_components/MemoDetailModal.tsx`를 읽고 Modal 구조, 배경 터치 닫기, 높이 지정, nativewind 클래스 사용 방식을 파악한다. 같은 패턴을 따른다.

- [ ] **Step 2: 컴포넌트 작성**

`apps/app/app/(main)/browser/_components/HighlightEditSheet.tsx`:

```tsx
import {
	HIGHLIGHT_COLORS,
	HIGHLIGHT_COLOR_STYLE,
	type HighlightColor,
} from "@web-memo/shared/constants";
import type { HighlightRow } from "@web-memo/shared/types";
import { Trash2 } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Modal, Pressable, Text, TextInput, View } from "react-native";
import {
	useHighlightDeleteMutation,
	useHighlightUpdateMutation,
} from "../../../../lib/hooks/useHighlightMutation";

interface HighlightEditSheetProps {
	highlight: HighlightRow | null;
	onClose: () => void;
}

export function HighlightEditSheet({ highlight, onClose }: HighlightEditSheetProps) {
	const [note, setNote] = useState("");
	const { mutate: updateHighlight } = useHighlightUpdateMutation();
	const { mutate: deleteHighlight } = useHighlightDeleteMutation();

	useEffect(() => {
		setNote(highlight?.note ?? "");
	}, [highlight]);

	if (!highlight) {
		return null;
	}

	const handleColorPress = (color: HighlightColor) => {
		updateHighlight({ id: highlight.id, url: highlight.url, color });
	};

	const handleNoteBlur = () => {
		if (note === (highlight.note ?? "")) {
			return;
		}

		updateHighlight({ id: highlight.id, url: highlight.url, note });
	};

	const handleDeletePress = () => {
		deleteHighlight({ id: highlight.id, url: highlight.url });
		onClose();
	};

	return (
		<Modal visible transparent animationType="slide" onRequestClose={onClose}>
			<Pressable className="flex-1 bg-black/40" onPress={onClose} />
			<View className="rounded-t-2xl bg-white p-5 dark:bg-neutral-900">
				<Text className="mb-4 text-base leading-6 text-neutral-800 dark:text-neutral-100">
					{highlight.exact_text}
				</Text>

				<View className="mb-4 flex-row gap-3">
					{HIGHLIGHT_COLORS.map((color) => (
						<Pressable
							key={color}
							accessibilityLabel={`${color} 색상`}
							onPress={() => handleColorPress(color)}
							style={{ backgroundColor: HIGHLIGHT_COLOR_STYLE[color].bar }}
							className={`h-9 w-9 rounded-full ${
								highlight.color === color ? "border-2 border-neutral-900" : ""
							}`}
						/>
					))}
				</View>

				<TextInput
					value={note}
					onChangeText={setNote}
					onBlur={handleNoteBlur}
					placeholder="메모 남기기"
					multiline
					className="mb-4 min-h-20 rounded-lg bg-neutral-100 p-3 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
				/>

				<Pressable
					onPress={handleDeletePress}
					className="flex-row items-center justify-center gap-2 py-3"
				>
					<Trash2 size={18} color="#ef4444" />
					<Text className="text-red-500">하이라이트 삭제</Text>
				</Pressable>
			</View>
		</Modal>
	);
}
```

- [ ] **Step 3: 화면에 연결**

`apps/app/app/(main)/browser/index.tsx`에서 탭된 하이라이트를 찾아 시트에 넘긴다.

```tsx
const tappedHighlight =
	highlights.tappedHighlightId === null
		? null
		: (highlights.rows.find((row) => row.id === highlights.tappedHighlightId) ?? null);
```

`rows`는 Task 12에서 `useWebViewHighlights`가 이미 반환하고 있다.

JSX 최하단에 렌더한다.

```tsx
<HighlightEditSheet highlight={tappedHighlight} onClose={highlights.clearTappedHighlight} />
```

- [ ] **Step 4: 실기기에서 확인**

```bash
pnpm dev:app
```

1. 저장된 밑줄을 탭한다 → 바텀시트가 열리고 그은 문장이 보인다
2. 다른 색을 누른다 → 시트를 닫으면 페이지의 밑줄 색이 바뀌어 있다
3. 코멘트를 입력하고 시트 밖을 누른다 → 다시 열면 코멘트가 남아 있다
4. 삭제를 누른다 → 밑줄이 사라지고 다시 방문해도 없다

색 변경이 페이지에 즉시 반영되지 않으면, `useWebViewHighlights`의 `updateHighlight` `onSuccess`에서 `window.__webmemoSetColor(id, color)`를 호출하도록 추가한다.

- [ ] **Step 5: 커밋**

```bash
pnpm type-check && pnpm lint
git add "apps/app/app/(main)/browser/_components/HighlightEditSheet.tsx" \
        "apps/app/app/(main)/browser/index.tsx" \
        "apps/app/app/(main)/browser/_hooks/useWebViewHighlights.ts"
git commit -m "feat: 모바일 하이라이트 편집 바텀시트 추가"
```

---

### Task 14: 웹 대시보드 하이라이트 페이지

**Files:**
- Create: `apps/web/src/app/[lng]/(auth)/highlights/page.tsx`
- Create: `apps/web/src/app/[lng]/(auth)/highlights/_hooks/useHighlightList.ts`
- Create: `apps/web/src/app/[lng]/(auth)/highlights/_hooks/index.ts`
- Create: `apps/web/src/app/[lng]/(auth)/highlights/_components/HighlightView.tsx`
- Create: `apps/web/src/app/[lng]/(auth)/highlights/_components/HighlightGroupCard.tsx`
- Create: `apps/web/src/app/[lng]/(auth)/highlights/_components/HighlightQuote.tsx`
- Create: `apps/web/src/app/[lng]/(auth)/highlights/_components/HighlightEmptyState.tsx`
- Create: `apps/web/src/app/[lng]/(auth)/highlights/_components/index.ts`
- Create: `apps/web/src/app/[lng]/(auth)/highlights/_utils/groupByUrl.ts`
- Create: `apps/web/src/app/[lng]/(auth)/highlights/_utils/index.ts`
- Test: `apps/web/src/app/[lng]/(auth)/highlights/_utils/groupByUrl.test.ts`

**Interfaces:**
- Consumes: `HighlightService` (Task 10), `QUERY_KEY.highlightsPaginated` (Task 2), `HIGHLIGHT_COLOR_STYLE` (Task 2), `getSupabaseClient` (`@src/modules/supabase/util.server`), `HydrationBoundaryWrapper`
- Produces: `/highlights` 라우트, `groupHighlightsByUrl(rows: HighlightRow[]): HighlightGroup[]`

- [ ] **Step 1: 기존 memos 페이지 구조 확인**

`apps/web/src/app/[lng]/(auth)/memos/page.tsx`와 `_components/MemoView/index.tsx`를 읽는다. 서버 프리페치 → `HydrationBoundaryWrapper` → 클라이언트 무한스크롤 흐름과 배럴 export 관례를 그대로 따른다.

- [ ] **Step 2: 그룹핑 유틸 테스트 작성**

`apps/web/src/app/[lng]/(auth)/highlights/_utils/groupByUrl.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { groupHighlightsByUrl } from "./groupByUrl";

const row = (overrides: Record<string, unknown>) =>
	({
		id: 1,
		url: "https://a.com",
		title: "제목",
		favIconUrl: null,
		exact_text: "문장",
		prefix_text: null,
		suffix_text: null,
		text_position_start: 0,
		color: "yellow",
		note: null,
		user_id: "u",
		created_at: "2026-08-15T00:00:00Z",
		updated_at: "2026-08-15T00:00:00Z",
		...overrides,
	}) as never;

describe("groupHighlightsByUrl", () => {
	it("같은 URL의 하이라이트를 하나로 묶는다", () => {
		const groups = groupHighlightsByUrl([
			row({ id: 1, url: "https://a.com" }),
			row({ id: 2, url: "https://a.com" }),
			row({ id: 3, url: "https://b.com" }),
		]);

		expect(groups).toHaveLength(2);
		expect(groups[0].highlights).toHaveLength(2);
	});

	it("입력 순서를 그룹 순서로 유지한다", () => {
		const groups = groupHighlightsByUrl([
			row({ id: 1, url: "https://b.com" }),
			row({ id: 2, url: "https://a.com" }),
		]);

		expect(groups.map((group) => group.url)).toEqual([
			"https://b.com",
			"https://a.com",
		]);
	});

	it("그룹의 제목과 파비콘은 첫 하이라이트 것을 쓴다", () => {
		const groups = groupHighlightsByUrl([
			row({ id: 1, title: "첫 제목", favIconUrl: "https://a.com/f.ico" }),
			row({ id: 2, title: "나중 제목" }),
		]);

		expect(groups[0].title).toBe("첫 제목");
		expect(groups[0].favIconUrl).toBe("https://a.com/f.ico");
	});

	it("빈 배열은 빈 그룹을 반환한다", () => {
		expect(groupHighlightsByUrl([])).toEqual([]);
	});
});
```

- [ ] **Step 3: 테스트 실패 확인**

```bash
pnpm test:jest -- --run "apps/web/src/app/[lng]/(auth)/highlights/_utils/groupByUrl.test.ts"
```

기대: FAIL — 모듈을 찾을 수 없음

- [ ] **Step 4: 그룹핑 유틸 구현**

`apps/web/src/app/[lng]/(auth)/highlights/_utils/groupByUrl.ts`:

```typescript
import type { HighlightRow } from "@web-memo/shared/types";

/** 한 페이지에서 그은 하이라이트 묶음 */
export interface HighlightGroup {
	url: string;
	title: string | null;
	favIconUrl: string | null;
	highlights: HighlightRow[];
}

/** 하이라이트를 URL별로 묶는다. 입력 순서가 그룹 순서가 된다. */
export function groupHighlightsByUrl(rows: HighlightRow[]): HighlightGroup[] {
	const groups = new Map<string, HighlightGroup>();

	for (const row of rows) {
		const existing = groups.get(row.url);

		if (existing) {
			existing.highlights.push(row);
			continue;
		}

		groups.set(row.url, {
			url: row.url,
			title: row.title,
			favIconUrl: row.favIconUrl,
			highlights: [row],
		});
	}

	return [...groups.values()];
}
```

`_utils/index.ts`:

```typescript
export * from "./groupByUrl";
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
pnpm test:jest -- --run "apps/web/src/app/[lng]/(auth)/highlights/_utils/groupByUrl.test.ts"
```

기대: PASS (4 케이스)

- [ ] **Step 6: 목록 훅 작성**

`apps/web/src/app/[lng]/(auth)/highlights/_hooks/useHighlightList.ts`:

```typescript
import { QUERY_KEY } from "@web-memo/shared/constants";
import type { HighlightRow } from "@web-memo/shared/types";
import { HighlightService } from "@web-memo/shared/utils/services";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { useSupabaseClientQuery } from "@web-memo/shared/hooks";

const PAGE_SIZE = 20;

/** 하이라이트 무한스크롤 목록. memos의 useMemosInfiniteQuery와 같은 복합 커서 방식을 쓴다. */
export function useHighlightList({ searchQuery }: { searchQuery?: string }) {
	const { data: supabaseClient } = useSupabaseClientQuery();
	const highlightService = new HighlightService(supabaseClient);

	return useSuspenseInfiniteQuery({
		queryKey: QUERY_KEY.highlightsPaginated({ searchQuery }),
		initialPageParam: undefined as { value: string; id: number } | undefined,
		queryFn: async ({ pageParam }) => {
			const { data, error } = await highlightService.getHighlightsPaginated({
				cursor: pageParam,
				limit: PAGE_SIZE,
				searchQuery,
			});

			if (error) {
				throw new Error(error.message);
			}

			return (data ?? []) as HighlightRow[];
		},
		getNextPageParam: (lastPage) => {
			if (lastPage.length < PAGE_SIZE) {
				return undefined;
			}

			const last = lastPage[lastPage.length - 1];

			return { value: last.created_at, id: last.id };
		},
	});
}
```

`_hooks/index.ts`:

```typescript
export * from "./useHighlightList";
```

`useSupabaseClientQuery`의 실제 export 경로는 `packages/shared/src/hooks/supabase/queries/useSupabaseClientQuery.ts`를 확인해 맞춘다.

- [ ] **Step 7: 컴포넌트 작성**

`_components/HighlightQuote.tsx`:

컴포넌트 이름을 `HighlightQuote`로 둔다. `HighlightItem`은 이미 `packages/shared`의 WebView 렌더용 타입 이름이라, 같은 이름을 쓰면 두 개를 함께 import하는 곳에서 충돌한다.

```tsx
"use client";

import { HIGHLIGHT_COLOR_STYLE, type HighlightColor } from "@web-memo/shared/constants";
import type { HighlightRow } from "@web-memo/shared/types";

interface HighlightQuoteProps {
	highlight: HighlightRow;
}

export function HighlightQuote({ highlight }: HighlightQuoteProps) {
	const style = HIGHLIGHT_COLOR_STYLE[highlight.color as HighlightColor];

	return (
		<li className="flex gap-3 py-2">
			<span
				aria-hidden
				className="w-1 shrink-0 rounded-full"
				style={{ backgroundColor: style.bar }}
			/>
			<div className="min-w-0">
				<p className="text-sm leading-6 text-foreground">{highlight.exact_text}</p>
				{highlight.note ? (
					<p className="mt-1 text-xs text-muted-foreground">{highlight.note}</p>
				) : null}
			</div>
		</li>
	);
}
```

`_components/HighlightGroupCard.tsx`:

```tsx
"use client";

import { ExternalLink } from "lucide-react";
import type { HighlightGroup } from "../_utils";
import { HighlightQuote } from "./HighlightQuote";

interface HighlightGroupCardProps {
	group: HighlightGroup;
}

export function HighlightGroupCard({ group }: HighlightGroupCardProps) {
	return (
		<article className="rounded-xl border border-border bg-card p-4">
			<a
				href={group.url}
				target="_blank"
				rel="noreferrer"
				className="mb-3 flex items-center gap-2 text-sm font-medium hover:underline"
			>
				{group.favIconUrl ? (
					<img src={group.favIconUrl} alt="" className="size-4 rounded" />
				) : null}
				<span className="truncate">{group.title ?? group.url}</span>
				<ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
			</a>

			<ul className="divide-y divide-border">
				{group.highlights.map((highlight) => (
					<HighlightQuote key={highlight.id} highlight={highlight} />
				))}
			</ul>
		</article>
	);
}
```

`_components/HighlightEmptyState.tsx`:

```tsx
"use client";

import useTranslation from "@src/modules/i18n/util.client";
import type { Language } from "@web-memo/shared/constants";
import { Highlighter } from "lucide-react";

export function HighlightEmptyState({ lng }: { lng: Language }) {
	const { t } = useTranslation(lng);

	return (
		<div className="flex flex-col items-center gap-3 py-20 text-center">
			<Highlighter className="size-8 text-muted-foreground" />
			<p className="text-sm text-muted-foreground">{t("highlight.empty.title")}</p>
			<p className="text-xs text-muted-foreground">{t("highlight.empty.description")}</p>
		</div>
	);
}
```

`_components/HighlightView.tsx`:

```tsx
"use client";

import useTranslation from "@src/modules/i18n/util.client";
import type { Language } from "@web-memo/shared/constants";
import { useHighlightList } from "../_hooks";
import { groupHighlightsByUrl } from "../_utils";
import { HighlightEmptyState } from "./HighlightEmptyState";
import { HighlightGroupCard } from "./HighlightGroupCard";

export function HighlightView({ lng }: { lng: Language }) {
	const { t } = useTranslation(lng);
	const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useHighlightList({});
	const rows = data.pages.flat();

	if (rows.length === 0) {
		return <HighlightEmptyState lng={lng} />;
	}

	return (
		<div className="flex flex-col gap-4">
			{groupHighlightsByUrl(rows).map((group) => (
				<HighlightGroupCard key={group.url} group={group} />
			))}

			{hasNextPage ? (
				<button
					type="button"
					onClick={() => fetchNextPage()}
					disabled={isFetchingNextPage}
					className="mx-auto rounded-lg border border-border px-4 py-2 text-sm"
				>
					{t("highlight.loadMore")}
				</button>
			) : null}
		</div>
	);
}
```

번역 키는 Task 15에서 추가한다. 그전까지는 화면에 키 문자열이 그대로 보이는데, 정상이다.

`_components/index.ts`:

```typescript
export * from "./HighlightView";
export * from "./HighlightGroupCard";
export * from "./HighlightQuote";
export * from "./HighlightEmptyState";
```

- [ ] **Step 8: 페이지 작성**

`apps/web/src/app/[lng]/(auth)/highlights/page.tsx`. `memos/page.tsx`의 서버 프리페치 형식을 그대로 따른다.

```tsx
"use server";

import HydrationBoundaryWrapper from "@src/components/HydrationBoundaryWrapper";
import { getSupabaseClient } from "@src/modules/supabase/util.server";
import { QUERY_KEY } from "@web-memo/shared/constants";
import type { Language } from "@web-memo/shared/constants";
import { HighlightService } from "@web-memo/shared/utils/services";
import { Suspense } from "react";
import { HighlightView } from "./_components";

export default async function HighlightsPage({
	params: { lng },
}: {
	params: { lng: Language };
}) {
	const supabaseClient = await getSupabaseClient();
	const highlightService = new HighlightService(supabaseClient);

	return (
		<div className="mx-auto w-full max-w-3xl px-4 py-6">
			<HydrationBoundaryWrapper
				queryKey={QUERY_KEY.highlightsPaginated({})}
				queryFn={() => highlightService.getHighlightsPaginated({ limit: 20 })}
			>
				<Suspense fallback={null}>
					<HighlightView lng={lng} />
				</Suspense>
			</HydrationBoundaryWrapper>
		</div>
	);
}
```

`HydrationBoundaryWrapper`의 실제 props 형태를 `memos/page.tsx`에서 확인해 맞춘다. 다르면 그쪽 형식을 따른다.

- [ ] **Step 9: 타입 체크 후 커밋**

```bash
pnpm type-check && pnpm lint
git add "apps/web/src/app/[lng]/(auth)/highlights"
git commit -m "feat: 웹 대시보드 하이라이트 목록 페이지 추가"
```

---

### Task 15: 사이드바 · 인증 경로 · i18n

**Files:**
- Modify: `packages/shared/src/constants/Path.ts`
- Modify: `apps/web/src/app/[lng]/(auth)/memos/_components/MemoSidebar/index.tsx`
- Modify: `apps/web/src/modules/i18n/locales/ko/translation.json`
- Modify: `apps/web/src/modules/i18n/locales/en/translation.json`

**Interfaces:**
- Consumes: `/highlights` 라우트 (Task 14)
- Produces: `PATHS.highlights`, `NEED_AUTH_PAGES`에 `/highlights` 추가, `highlight.*` 번역 키

- [ ] **Step 1: 경로 상수 추가**

`packages/shared/src/constants/Path.ts`:

```typescript
	highlights: "/highlights",
```

를 `PATHS`에 추가하고, `NEED_AUTH_PAGES` 배열에 `PATHS.highlights`를 추가한다.

- [ ] **Step 2: 번역 키 추가**

사이드바 라벨은 기존 `sideBar.memo` / `sideBar.wishList`와 같은 자리에 두고, 페이지 문구는 새 `highlight` 네임스페이스에 둔다.

`apps/web/src/modules/i18n/locales/ko/translation.json` — 기존 `sideBar` 객체 안에 한 줄 추가:

```json
		"highlight": "하이라이트"
```

같은 파일 최상위에 새 객체 추가:

```json
	"highlight": {
		"loadMore": "더 보기",
		"empty": {
			"title": "아직 하이라이트가 없어요",
			"description": "모바일 앱 브라우저에서 문장을 선택해 밑줄을 그어보세요."
		}
	}
```

`apps/web/src/modules/i18n/locales/en/translation.json`에 같은 구조로 추가한다.

```json
		"highlight": "Highlights"
```

```json
	"highlight": {
		"loadMore": "Load more",
		"empty": {
			"title": "No highlights yet",
			"description": "Select text in the mobile app browser to highlight it."
		}
	}
```

- [ ] **Step 3: 사이드바 항목 추가**

`apps/web/src/app/[lng]/(auth)/memos/_components/MemoSidebar/index.tsx`를 수정한다. 이 파일은 서버 컴포넌트(`"use server"`)이고 `useTranslation`을 `util.server`에서 가져온다.

import에 아이콘을 추가한다.

```tsx
import { Heart, Highlighter, Home, SettingsIcon, Star } from "lucide-react";
```

위시리스트 `<Link>` 블록 다음에 같은 형식으로 항목을 추가한다. 색상만 amber 계열로 바꾼 것 외에는 기존 블록과 구조가 같다.

```tsx
<Link href={PATHS.highlights} replace>
	<SidebarMenuButton className="group relative overflow-hidden transition-all duration-200 hover:bg-gradient-to-r hover:from-amber-50 hover:to-amber-100/50 dark:hover:from-amber-950/30 dark:hover:to-amber-900/20 hover:shadow-sm hover:scale-[1.02] active:scale-[0.98]">
		<div className="flex items-center gap-3 w-full">
			<div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 group-hover:bg-amber-200 dark:group-hover:bg-amber-800/40 transition-colors">
				<Highlighter size={16} className="text-amber-600 dark:text-amber-400" />
			</div>
			<span className="font-medium text-gray-700 dark:text-gray-200 group-hover:text-amber-700 dark:group-hover:text-amber-300">
				{t("sideBar.highlight")}
			</span>
		</div>
	</SidebarMenuButton>
</Link>
```

- [ ] **Step 4: 번역 완전성 검증**

```bash
/i18n-check
```

ko/en 양쪽에 `highlight.*` 키가 모두 있는지 확인한다.

- [ ] **Step 5: 웹에서 동작 확인**

```bash
pnpm dev:web
```

1. 로그인 후 사이드바에 "하이라이트"가 보인다
2. 클릭하면 `/highlights`로 이동하고 Task 12에서 모바일로 저장한 하이라이트가 URL별로 묶여 보인다
3. 로그아웃 상태에서 `/highlights`에 직접 접근하면 `/login`으로 리다이렉트된다
4. 언어를 영어로 바꾸면 라벨과 빈 상태 문구가 영어로 나온다

- [ ] **Step 6: 전체 검증 후 커밋**

```bash
pnpm type-check && pnpm lint && pnpm test:jest -- --run
git add packages/shared/src/constants/Path.ts \
        apps/web/src/modules/i18n/locales/ko/translation.json \
        apps/web/src/modules/i18n/locales/en/translation.json \
        apps/web/src/app
git commit -m "feat: 하이라이트 페이지 사이드바 진입점과 번역 추가"
```

---

### Task 16: 웹에서 코멘트 편집 · E2E 테스트 · PR

설계 §7-2는 웹에서 문장을 눌러 코멘트를 편집할 수 있어야 한다고 정한다. Task 14는 읽기까지만 만들었으므로 여기서 편집을 붙이고, §8의 E2E를 추가한 뒤 PR을 올린다.

**Files:**
- Create: `apps/web/src/app/[lng]/(auth)/highlights/_hooks/useHighlightNoteMutation.ts`
- Modify: `apps/web/src/app/[lng]/(auth)/highlights/_hooks/index.ts`
- Modify: `apps/web/src/app/[lng]/(auth)/highlights/_components/HighlightQuote.tsx`
- Modify: `apps/web/src/modules/i18n/locales/{ko,en}/translation.json`
- Test: `e2e/tests/highlight.spec.ts`

**Interfaces:**
- Consumes: `HighlightService.updateHighlight` (Task 10), `QUERY_KEY.highlightsPaginated` (Task 2), `useSupabaseClientQuery`
- Produces: `useHighlightNoteMutation(): UseMutationResult<void, Error, { id: number; note: string }>`

- [ ] **Step 1: 코멘트 저장 훅 작성**

`apps/web/src/app/[lng]/(auth)/highlights/_hooks/useHighlightNoteMutation.ts`:

```typescript
import { QUERY_KEY } from "@web-memo/shared/constants";
import { HighlightService } from "@web-memo/shared/utils/services";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSupabaseClientQuery } from "@web-memo/shared/hooks";

/** 하이라이트 코멘트를 저장한다. 목록 전체를 무효화해 최신 값으로 맞춘다. */
export function useHighlightNoteMutation() {
	const queryClient = useQueryClient();
	const { data: supabaseClient } = useSupabaseClientQuery();

	return useMutation<void, Error, { id: number; note: string }>({
		mutationFn: async ({ id, note }) => {
			const { error } = await new HighlightService(supabaseClient).updateHighlight({
				id,
				request: { note },
			});

			if (error) {
				throw new Error(error.message);
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["highlights", "paginated"] });
		},
	});
}
```

`_hooks/index.ts`에 export 한 줄 추가:

```typescript
export * from "./useHighlightNoteMutation";
```

- [ ] **Step 2: 인용문 컴포넌트에 코멘트 편집 붙이기**

`_components/HighlightQuote.tsx`를 수정한다. 코멘트 영역을 누르면 textarea로 바뀌고, 포커스를 잃으면 저장한다.

```tsx
"use client";

import useTranslation from "@src/modules/i18n/util.client";
import {
	HIGHLIGHT_COLOR_STYLE,
	type HighlightColor,
	type Language,
} from "@web-memo/shared/constants";
import type { HighlightRow } from "@web-memo/shared/types";
import { useState } from "react";
import { useHighlightNoteMutation } from "../_hooks";

interface HighlightQuoteProps {
	highlight: HighlightRow;
	lng: Language;
}

export function HighlightQuote({ highlight, lng }: HighlightQuoteProps) {
	const { t } = useTranslation(lng);
	const [isEditing, setIsEditing] = useState(false);
	const [note, setNote] = useState(highlight.note ?? "");
	const { mutate: saveNote } = useHighlightNoteMutation();

	const style = HIGHLIGHT_COLOR_STYLE[highlight.color as HighlightColor];

	const handleNoteBlur = () => {
		setIsEditing(false);

		if (note === (highlight.note ?? "")) {
			return;
		}

		saveNote({ id: highlight.id, note });
	};

	return (
		<li className="flex gap-3 py-2">
			<span
				aria-hidden
				className="w-1 shrink-0 rounded-full"
				style={{ backgroundColor: style.bar }}
			/>
			<div className="min-w-0 flex-1">
				<p className="text-sm leading-6 text-foreground">{highlight.exact_text}</p>

				{isEditing ? (
					<textarea
						autoFocus
						value={note}
						onChange={(event) => setNote(event.target.value)}
						onBlur={handleNoteBlur}
						aria-label={t("highlight.note.label")}
						className="mt-1 w-full resize-none rounded-md border border-border bg-background p-2 text-xs"
						rows={2}
					/>
				) : (
					<button
						type="button"
						onClick={() => setIsEditing(true)}
						className="mt-1 block text-left text-xs text-muted-foreground hover:underline"
					>
						{note || t("highlight.note.placeholder")}
					</button>
				)}
			</div>
		</li>
	);
}
```

`HighlightGroupCard`가 `lng`를 받아 `HighlightQuote`에 넘기도록 props를 추가하고, `HighlightView`에서 `lng`를 내려보낸다.

- [ ] **Step 3: 번역 키 추가**

ko:

```json
		"note": {
			"label": "하이라이트 메모",
			"placeholder": "메모 추가"
		}
```

en:

```json
		"note": {
			"label": "Highlight note",
			"placeholder": "Add a note"
		}
```

둘 다 `highlight` 객체 안에 넣는다.

- [ ] **Step 4: E2E 테스트 작성**

`e2e/tests/` 아래 기존 테스트 파일 하나를 열어 로그인 픽스처와 `baseURL` 설정 방식을 확인한 뒤, 같은 방식으로 작성한다.

`e2e/tests/highlight.spec.ts`:

```typescript
import { expect, test } from "@playwright/test";

test.describe("하이라이트 페이지", () => {
	test("사이드바에서 하이라이트 페이지로 이동한다", async ({ page }) => {
		await page.goto("/ko/memos");
		await page.getByRole("link", { name: "하이라이트" }).click();

		await expect(page).toHaveURL(/\/highlights/);
	});

	test("하이라이트가 없으면 빈 상태 문구를 보여준다", async ({ page }) => {
		await page.goto("/ko/highlights");

		await expect(page.getByText("아직 하이라이트가 없어요")).toBeVisible();
	});

	test("비로그인 상태로 접근하면 로그인으로 보낸다", async ({ browser }) => {
		const context = await browser.newContext({ storageState: undefined });
		const page = await context.newPage();
		await page.goto("/ko/highlights");

		await expect(page).toHaveURL(/\/login/);
		await context.close();
	});
});
```

빈 상태 문구 테스트는 계정에 하이라이트가 없을 때만 통과한다. 기존 스위트가 시드 데이터를 쓰고 있으면 그 방식에 맞춰 조정한다.

- [ ] **Step 5: E2E 실행**

```bash
pnpm test:e2e -- --grep "하이라이트"
```

기대: 3개 통과

- [ ] **Step 6: 전체 검증**

```bash
pnpm type-check && pnpm lint && pnpm test:jest -- --run
```

기대: 전부 통과

- [ ] **Step 7: 커밋**

```bash
git add "apps/web/src/app/[lng]/(auth)/highlights" \
        apps/web/src/modules/i18n/locales/ko/translation.json \
        apps/web/src/modules/i18n/locales/en/translation.json \
        e2e/tests/highlight.spec.ts
git commit -m "feat: 웹에서 하이라이트 코멘트 편집과 E2E 테스트 추가"
```

- [ ] **Step 8: PR 생성**

```bash
/pr
```

PR 제목·본문은 한글로 작성하고 레포의 `PULL_REQUEST_TEMPLATE.md`를 따른다. 본문에 설계 문서(`claudedocs/2026-08-15-highlight-design.md`) 링크와 Task 1 스파이크 검증 결과를 포함한다.

---

## 남은 작업 (이 계획 범위 밖)

설계 §10의 후속 단계다. 이 계획을 완료해도 아래는 남는다.

- PC 크롬 확장에서의 밑줄 복원 — `packages/shared/src/modules/highlight/`를 content script에서 재사용한다
- 크롬 확장에서의 하이라이팅 — 기존 `SelectionMemoButton` 옆에 버튼 추가
- 비로그인 로컬 저장 및 로그인 시 동기화
- 하이라이트 내보내기 / 공유
