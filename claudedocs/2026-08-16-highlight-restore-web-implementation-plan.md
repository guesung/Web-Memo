# PC 브라우저 하이라이트 복원 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 앱에서 그은 하이라이트를 PC 크롬에서 원문 위에 다시 보여준다 (읽기 전용).

**Architecture:** 크롬 확장의 기존 content script(`pages/content-ui`)에 복원 모듈을 추가한다.
content script는 Supabase 세션에 접근할 수 없으므로 조회는 extension-bridge를 통해 background가
대신한다. 밑줄 렌더와 앵커 복원은 `@web-memo/shared/modules/highlight`를 그대로 쓴다.

**Tech Stack:** Chrome Extension MV3, vite(iife), React 19, TypeScript, vitest + jsdom,
CSS Custom Highlight API

**Spec:** `claudedocs/2026-08-16-highlight-restore-web-design.md`

## Global Constraints

- 탭 들여쓰기. `export` 대상에 JSDoc 필수
- 타입/인터페이스명에 `IF`/`T` 접두사를 붙이지 않는다 (이 저장소의 관례)
- non-null assertion(`!`) 금지 — `biome.json`에 `noNonNullAssertion: "warn"`
- 커밋 메시지는 한글
- 테스트 실행은 `pnpm test:jest run <경로>` (`-- --run`을 붙이면 watch 모드에 빠진다)
- 테스트 파일 확장자는 **`.test.ts`** — 루트 `vitest.config.ts`의 `include`가 `["**/*.test.ts"]`라
  `.test.tsx`는 수집되지 않는다
- DOM이 필요한 테스트는 첫 줄에 `// @vitest-environment jsdom`을 넣는다 (기본 환경이 node다)
- 브리지 호출은 **`bridge.request.<MESSAGE>(payload)`** 다 (`bridge.send`가 아니다).
  선례: `pages/content-ui/src/ui/textSelection/components/SelectionMemoButton.tsx`
- **manifest와 vite 설정은 고치지 않는다.** `host_permissions: ["<all_urls>"]`와 content_scripts가
  이미 등록되어 있고 엔트리가 하나뿐이라 필요 없다
- **복원 실패는 조용히 넘긴다.** 남의 페이지 위에 에러 UI나 `console.error`를 남기지 않는다
- 하이라이트가 0개인 페이지에서는 옵저버도 마우스 리스너도 만들지 않는다
- `git stash` 금지 — `stash@{0}`에 사용자의 작업물이 있다

---

### Task 1: 앵커 배치 복원 API

**Files:**
- Modify: `packages/shared/src/modules/highlight/resolveAnchor.ts`
- Test: `packages/shared/src/modules/highlight/resolveAnchor.test.ts` (기존 파일에 추가)

**Interfaces:**
- Consumes: `buildDocumentTextIndex`, `DocumentTextIndex`, `offsetToPoint`(`./documentText`), `matchQuote`(`./matchQuote`), `HighlightAnchor`(`./types`)
- Produces: `resolveAnchors(anchors: HighlightAnchor[], root?: Node): (Range | null)[]`

`resolveAnchor`는 호출마다 `buildDocumentTextIndex(root)`로 문서 전체를 훑는다. 앵커 10개면
DOM 순회가 10번이고, Task 4의 MutationObserver가 재시도할 때마다 반복된다. **문서를 한 번만
훑고 여러 앵커를 푸는 함수를 만들고, 기존 `resolveAnchor`가 거기 위임하도록 해서 구현을 하나로
유지한다.** 호출부에서 로직을 베끼면 `preferEnd` 처리가 갈라진다.

- [ ] **Step 1: 실패하는 테스트 작성**

`packages/shared/src/modules/highlight/resolveAnchor.test.ts` 파일 **맨 아래에** 다음 describe를 추가한다.
기존 테스트는 건드리지 않는다. 파일 첫 줄에 `// @vitest-environment jsdom`이 이미 있으니 그대로 둔다.
import 문에 `resolveAnchors`를 추가한다.

```typescript
describe("resolveAnchors", () => {
	it("여러 앵커를 입력 순서대로 복원한다", () => {
		document.body.innerHTML = "<p>알파 브라보 찰리 델타 에코</p>";

		const ranges = resolveAnchors([
			{ exact: "브라보", prefix: "알파 ", suffix: " 찰리", textPositionStart: 3 },
			{ exact: "델타", prefix: "찰리 ", suffix: " 에코", textPositionStart: 11 },
		]);

		expect(ranges).toHaveLength(2);
		expect(ranges[0]?.toString()).toBe("브라보");
		expect(ranges[1]?.toString()).toBe("델타");
	});

	it("찾지 못한 앵커 자리에는 null을 넣고 나머지는 그대로 복원한다", () => {
		document.body.innerHTML = "<p>알파 브라보 찰리</p>";

		const ranges = resolveAnchors([
			{ exact: "없는문장", prefix: "", suffix: "", textPositionStart: 0 },
			{ exact: "브라보", prefix: "알파 ", suffix: " 찰리", textPositionStart: 3 },
		]);

		expect(ranges[0]).toBeNull();
		expect(ranges[1]?.toString()).toBe("브라보");
	});

	it("빈 배열에는 빈 배열을 돌려준다", () => {
		document.body.innerHTML = "<p>알파</p>";

		expect(resolveAnchors([])).toEqual([]);
	});

	it("resolveAnchor와 같은 Range를 만든다", () => {
		document.body.innerHTML = "<p>알파 <strong>브라보</strong> 찰리</p>";
		const anchor = {
			exact: "브라보",
			prefix: "알파 ",
			suffix: " 찰리",
			textPositionStart: 3,
		};

		const single = resolveAnchor(anchor);
		const batched = resolveAnchors([anchor])[0];

		expect(batched?.toString()).toBe(single?.toString());
		expect(batched?.startContainer).toBe(single?.startContainer);
		expect(batched?.startOffset).toBe(single?.startOffset);
		expect(batched?.endContainer).toBe(single?.endContainer);
		expect(batched?.endOffset).toBe(single?.endOffset);
	});
});
```

마지막 케이스가 핵심이다. 위임 구조가 깨져 두 경로가 갈라지면 이 테스트가 잡는다.

- [ ] **Step 2: 테스트 실패 확인**

```bash
pnpm test:jest run packages/shared/src/modules/highlight/resolveAnchor.test.ts
```

기대: FAIL — `resolveAnchors` is not a function (또는 import 에러)

- [ ] **Step 3: 구현**

`packages/shared/src/modules/highlight/resolveAnchor.ts` 전체를 다음으로 바꾼다.

```typescript
import {
	buildDocumentTextIndex,
	type DocumentTextIndex,
	offsetToPoint,
} from "./documentText";
import { matchQuote } from "./matchQuote";
import type { HighlightAnchor } from "./types";

/**
 * 이미 만들어둔 문서 인덱스에서 앵커 하나를 Range로 되살린다.
 * @description Range 끝점은 `offsetToPoint`에 `preferEnd`를 줘서 만든다. 매칭이 텍스트 노드
 * 경계에서 끝나는 경우 다음 노드의 시작점(offset 0)이 아니라 이전 노드의 끝점을 골라야, CSS
 * Custom Highlight로 렌더할 때 다음 요소 시작 지점에 빈 하이라이트 조각이 생기지 않는다.
 */
function resolveWithIndex(
	index: DocumentTextIndex,
	anchor: HighlightAnchor,
): Range | null {
	const match = matchQuote(index.text, anchor.exact, {
		prefix: anchor.prefix,
		suffix: anchor.suffix,
		hint: anchor.textPositionStart,
	});

	if (!match) {
		return null;
	}

	const start = offsetToPoint(index, match.start);
	const end = offsetToPoint(index, match.end, { preferEnd: true });

	if (!start || !end) {
		return null;
	}

	const range = document.createRange();
	range.setStart(start.node, start.offset);
	range.setEnd(end.node, end.offset);

	return range;
}

/**
 * 텍스트 앵커를 현재 문서의 Range로 되살린다.
 * @description 저장된 앵커를 DOM 경로가 아니라 텍스트로 다시 찾으므로, 앵커를 만든 문서와
 * DOM 구조가 다르더라도(모바일 WebView ↔ PC 브라우저) 같은 문장이 남아 있으면 복원할 수 있다.
 * @returns 원문에서 문장을 찾지 못하면 null. 호출자는 이 경우 렌더를 건너뛴다.
 */
export function resolveAnchor(
	anchor: HighlightAnchor,
	root: Node = document.body,
): Range | null {
	return resolveWithIndex(buildDocumentTextIndex(root), anchor);
}

/**
 * 여러 앵커를 문서 인덱싱 한 번으로 되살린다.
 * @description `resolveAnchor`를 N번 부르면 문서를 N번 훑는다. DOM 변경마다 재시도하는
 * 호출자(확장의 복원 모듈)에게는 그 비용이 감당되지 않으므로 배치 경로를 따로 둔다.
 * @returns 입력과 같은 길이·순서의 배열. 찾지 못한 앵커 자리는 null이다.
 */
export function resolveAnchors(
	anchors: HighlightAnchor[],
	root: Node = document.body,
): (Range | null)[] {
	const index = buildDocumentTextIndex(root);

	return anchors.map((anchor) => resolveWithIndex(index, anchor));
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
pnpm test:jest run packages/shared/src/modules/highlight/resolveAnchor.test.ts
```

기대: PASS (기존 케이스 + 신규 4개)

- [ ] **Step 5: 전체 하이라이트 테스트가 여전히 통과하는지 확인**

```bash
pnpm test:jest run packages/shared/src/modules/highlight
```

기대: PASS. `resolveAnchor`를 쓰는 기존 테스트가 위임 구조에서도 그대로 동작해야 한다.

- [ ] **Step 6: 타입 체크 후 커밋**

```bash
pnpm -F @web-memo/shared type-check && pnpm lint
git add packages/shared/src/modules/highlight/resolveAnchor.ts \
        packages/shared/src/modules/highlight/resolveAnchor.test.ts
git commit -m "feat: 앵커 여러 개를 문서 인덱싱 한 번으로 복원하는 API 추가"
```

---

### Task 2: `HighlightRow` → `HighlightItem` 변환을 shared로 옮기기

**Files:**
- Create: `packages/shared/src/modules/highlight/toHighlightItem.ts`
- Create: `packages/shared/src/modules/highlight/toHighlightItem.test.ts`
- Modify: `packages/shared/src/modules/highlight/index.ts`
- Modify: `apps/app/app/(main)/browser/_hooks/useWebViewHighlights.ts:37-53`

**Interfaces:**
- Consumes: `HighlightRow`(`../../types`), `HighlightItem`(`./types`)
- Produces: `toHighlightItem(row: HighlightRow): HighlightItem`

이 변환은 앱에 이미 있다(`useWebViewHighlights.ts:42-53`). 그 JSDoc이 **"한쪽만 고치면 서버에는
있는데 화면엔 다르게 그려지는 식으로 조용히 갈라질 수 있다"**고 경고한다. 확장에 같은 변환을
또 만들면 이번엔 플랫폼 사이에서 갈라진다. 옮겨서 하나로 유지한다.

`HighlightRow`의 필드는 느슨하다 — `prefix_text: string | null`, `suffix_text: string | null`,
`text_position_start: number | null`, `color: string`. 폴백을 한 곳에 모으는 것이 이 태스크의 값어치다.

- [ ] **Step 1: 실패하는 테스트 작성**

`packages/shared/src/modules/highlight/toHighlightItem.test.ts`:

```typescript
import type { HighlightRow } from "../../types";
import { describe, expect, it } from "vitest";
import { toHighlightItem } from "./toHighlightItem";

function createRow(overrides: Partial<HighlightRow> = {}): HighlightRow {
	return {
		id: 1,
		user_id: "user-1",
		url: "https://example.com",
		title: "제목",
		favIconUrl: null,
		exact_text: "브라보",
		prefix_text: "알파 ",
		suffix_text: " 찰리",
		text_position_start: 3,
		color: "yellow",
		note: null,
		created_at: "2026-08-16T00:00:00Z",
		updated_at: "2026-08-16T00:00:00Z",
		...overrides,
	} as HighlightRow;
}

describe("toHighlightItem", () => {
	it("행을 렌더러가 쓰는 형태로 바꾼다", () => {
		expect(toHighlightItem(createRow())).toEqual({
			id: 1,
			anchor: {
				exact: "브라보",
				prefix: "알파 ",
				suffix: " 찰리",
				textPositionStart: 3,
			},
			color: "yellow",
		});
	});

	it("prefix가 null이면 빈 문자열로 채운다", () => {
		const item = toHighlightItem(createRow({ prefix_text: null }));

		expect(item.anchor.prefix).toBe("");
	});

	it("suffix가 null이면 빈 문자열로 채운다", () => {
		const item = toHighlightItem(createRow({ suffix_text: null }));

		expect(item.anchor.suffix).toBe("");
	});

	it("text_position_start가 null이면 0으로 채운다", () => {
		const item = toHighlightItem(createRow({ text_position_start: null }));

		expect(item.anchor.textPositionStart).toBe(0);
	});
});
```

이 테스트는 DOM이 필요 없다. **`// @vitest-environment jsdom`을 넣지 않는다.**

- [ ] **Step 2: 테스트 실패 확인**

```bash
pnpm test:jest run packages/shared/src/modules/highlight/toHighlightItem.test.ts
```

기대: FAIL — 모듈을 찾을 수 없음

- [ ] **Step 3: 구현**

`packages/shared/src/modules/highlight/toHighlightItem.ts`:

```typescript
import type { HighlightRow } from "../../types";
import type { HighlightItem } from "./types";

/**
 * Supabase의 `HighlightRow`를 렌더러가 이해하는 `HighlightItem`으로 변환한다.
 * @description 저장 직후 응답과 조회 결과를 렌더하는 경로들이 완전히 같은 필드·null 폴백을
 * 써야 한다. 앱과 확장이 각자 변환을 두면 한쪽만 고쳤을 때 서버에는 있는데 화면엔 다르게
 * 그려지는 식으로 조용히 갈라진다. `color`는 DB에서 `string`으로 오지만 CHECK 제약이
 * 하이라이트 색으로 제한하므로 단언한다.
 */
export function toHighlightItem(row: HighlightRow): HighlightItem {
	return {
		id: row.id,
		anchor: {
			exact: row.exact_text,
			prefix: row.prefix_text ?? "",
			suffix: row.suffix_text ?? "",
			textPositionStart: row.text_position_start ?? 0,
		},
		color: row.color as HighlightItem["color"],
	};
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
pnpm test:jest run packages/shared/src/modules/highlight/toHighlightItem.test.ts
```

기대: PASS (4 케이스)

- [ ] **Step 5: 배럴에 추가**

`packages/shared/src/modules/highlight/index.ts`에서 `export * from "./resolveAnchor";` **다음 줄에**
추가한다. `./injected/highlightScript`(생성 파일)는 마지막에 그대로 둔다.

```typescript
export * from "./toHighlightItem";
```

- [ ] **Step 6: 앱이 shared 버전을 쓰도록 고치기**

`apps/app/app/(main)/browser/_hooks/useWebViewHighlights.ts`에서 로컬 `toHighlightItem` 함수
정의(37-53행의 JSDoc + 함수 전체)를 **삭제**하고, 기존 import를 다음처럼 바꾼다.

```typescript
import {
	type HighlightItem,
	toHighlightItem,
} from "@web-memo/shared/modules/highlight";
```

`HighlightColor`·`HighlightRow` import가 이 파일의 다른 곳에서 더 쓰이지 않으면 함께 지운다.
`pnpm lint`가 미사용 import를 잡아준다.

- [ ] **Step 7: 검증 후 커밋**

```bash
pnpm test:jest run packages/shared/src/modules/highlight
pnpm type-check
pnpm lint
git add packages/shared/src/modules/highlight/toHighlightItem.ts \
        packages/shared/src/modules/highlight/toHighlightItem.test.ts \
        packages/shared/src/modules/highlight/index.ts \
        "apps/app/app/(main)/browser/_hooks/useWebViewHighlights.ts"
git commit -m "refactor: 하이라이트 행 변환을 shared로 옮겨 앱과 확장이 공유"
```

---

### Task 3: 하이라이트 조회 브리지 메시지와 background 핸들러

**Files:**
- Modify: `packages/shared/src/modules/extension-bridge/types.ts`
- Modify: `packages/shared/src/modules/extension-bridge/bridge.ts`
- Modify: `apps/chrome-extension/lib/background/index.ts`

**Interfaces:**
- Consumes: `HighlightService`, `getSupabaseClient`, `normalizeUrl`, `HighlightRow`
- Produces:
  - `GetHighlightsByUrlPayload { url: string }`
  - `GetHighlightsByUrlResponse { highlights: HighlightRow[] }`
  - 브리지 메시지 `GET_HIGHLIGHTS_BY_URL` (direction: `"internal"`)

content script는 MV3에서 `chrome.cookies`를 쓸 수 없어 Supabase 세션을 얻지 못한다. 조회는
background가 대신하고 결과만 돌려준다. 기존 `CREATE_MEMO`(`lib/background/index.ts:95`)와 같은 구조다.

- [ ] **Step 1: 페이로드 타입 추가**

`packages/shared/src/modules/extension-bridge/types.ts` 맨 아래에 추가한다. 파일 맨 위 import에
`import type { HighlightRow } from "../../types";`를 더한다.

```typescript
/** content script가 background에 넘기는 조회 대상 URL. 정규화는 background가 한다 */
export interface GetHighlightsByUrlPayload {
	url: string;
}

/** 조회 결과. 실패해도 빈 배열을 돌려준다 — 복원은 조용히 실패해야 한다 */
export interface GetHighlightsByUrlResponse {
	highlights: HighlightRow[];
}
```

- [ ] **Step 2: 브리지에 메시지 등록**

`packages/shared/src/modules/extension-bridge/bridge.ts`의 import에 두 타입을 추가하고,
`CREATE_MEMO` 줄 **다음에** 넣는다.

```typescript
	GET_HIGHLIGHTS_BY_URL: defineMessage<
		GetHighlightsByUrlPayload,
		GetHighlightsByUrlResponse
	>("internal"),
```

- [ ] **Step 3: background 핸들러 추가**

`apps/chrome-extension/lib/background/index.ts`에서 `bridge.handle.CREATE_MEMO(...)` 블록이
끝난 **바로 뒤에** 추가한다. 파일 상단 import의 `MemoService` 옆에 `HighlightService`를 더한다.

```typescript
// content-ui가 현재 페이지의 하이라이트를 조회한다.
// 실패해도 빈 배열을 돌려준다 — 남의 페이지 위에서 조용히 실패해야 한다(설계 §8).
bridge.handle.GET_HIGHLIGHTS_BY_URL(async (payload, _sender, sendResponse) => {
	try {
		const supabaseClient = await getSupabaseClient();
		const highlightService = new HighlightService(supabaseClient);

		// 앱·웹과 같은 기준으로 찾도록 URL을 정규화한다.
		const normalizedUrl = normalizeUrl(payload.url);
		const { data, error } =
			await highlightService.getHighlightsByUrl(normalizedUrl);

		if (error) {
			sendResponse({ highlights: [] });
			return;
		}

		sendResponse({ highlights: data ?? [] });
	} catch {
		sendResponse({ highlights: [] });
	}
});
```

`catch`가 필요한 이유: 비로그인이면 `getSupabaseClient()`가 던질 수 있는데, 그 경우에도
content script는 빈 배열을 받고 아무 일도 하지 않아야 한다. `normalizeUrl`도 잘못된 URL에
throw하므로(`packages/shared/src/utils/Url.ts:21`) 여기서 함께 막힌다.

- [ ] **Step 4: 검증**

```bash
pnpm type-check
pnpm lint
```

기대: 통과. **이 태스크는 자동 테스트가 없다** — background 핸들러는 chrome API에 묶여 있어
단위 테스트 선례가 이 레포에 없다. 실제 동작은 Task 6에서 확인한다.

- [ ] **Step 5: 커밋**

```bash
git add packages/shared/src/modules/extension-bridge/types.ts \
        packages/shared/src/modules/extension-bridge/bridge.ts \
        apps/chrome-extension/lib/background/index.ts
git commit -m "feat: URL별 하이라이트 조회 브리지 메시지와 background 핸들러 추가"
```

---

### Task 4: 복원 모듈 — 못 찾은 앵커만 재시도하는 MutationObserver

**Files:**
- Create: `pages/content-ui/src/ui/highlight/restoreHighlights.ts`
- Test: `pages/content-ui/src/ui/highlight/restoreHighlights.test.ts`

**Interfaces:**
- Consumes: `resolveAnchors`(Task 1), `HighlightItem`·`HighlightRenderer`(`@web-memo/shared/modules/highlight`)
- Produces:
  - `startHighlightRestore(params: StartHighlightRestoreParams): () => void`
  - `RESTORE_TIMEOUT_MS = 10_000`, `RETRY_DEBOUNCE_MS = 300`

요즘 페이지는 본문을 나중에 그린다. 로드 직후 한 번만 찾으면 React·Next 사이트에서 많이 놓친다.
DOM 변경을 관찰해 **아직 못 찾은 앵커만** 다시 시도하되, 남의 페이지에 무한히 도는 코드를
남기지 않도록 종료 조건을 건다.

- [ ] **Step 1: 실패하는 테스트 작성**

`pages/content-ui/src/ui/highlight/restoreHighlights.test.ts`:

```typescript
// @vitest-environment jsdom
import type {
	HighlightItem,
	HighlightRenderer,
} from "@web-memo/shared/modules/highlight";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startHighlightRestore } from "./restoreHighlights";

function createFakeRenderer(): HighlightRenderer & { added: number[] } {
	const added: number[] = [];

	return {
		added,
		add(id) {
			added.push(id);
		},
		remove() {},
		setColor() {},
		hitTest() {
			return null;
		},
		clear() {},
	};
}

function createItem(id: number, exact: string): HighlightItem {
	return {
		id,
		anchor: { exact, prefix: "", suffix: "", textPositionStart: 0 },
		color: "yellow",
	};
}

/** MutationObserver 콜백과 debounce 타이머가 흐르도록 기다린다 */
async function flush(ms: number): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, ms));
}

describe("startHighlightRestore", () => {
	beforeEach(() => {
		document.body.innerHTML = "";
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("이미 있는 문장은 즉시 렌더한다", () => {
		document.body.innerHTML = "<p>알파 브라보 찰리</p>";
		const renderer = createFakeRenderer();

		startHighlightRestore({ items: [createItem(1, "브라보")], renderer });

		expect(renderer.added).toEqual([1]);
	});

	it("나중에 들어온 문장도 렌더한다", async () => {
		document.body.innerHTML = "<p>알파</p>";
		const renderer = createFakeRenderer();

		startHighlightRestore({
			items: [createItem(1, "브라보")],
			renderer,
			debounceMs: 10,
		});
		expect(renderer.added).toEqual([]);

		document.body.innerHTML = "<p>알파 브라보 찰리</p>";
		await flush(60);

		expect(renderer.added).toEqual([1]);
	});

	it("이미 렌더한 앵커를 다시 렌더하지 않는다", async () => {
		document.body.innerHTML = "<p>알파 브라보 찰리</p>";
		const renderer = createFakeRenderer();

		startHighlightRestore({
			items: [createItem(1, "브라보"), createItem(2, "없는문장")],
			renderer,
			debounceMs: 10,
		});
		expect(renderer.added).toEqual([1]);

		document.body.appendChild(document.createElement("div"));
		await flush(60);

		expect(renderer.added).toEqual([1]);
	});

	it("모두 찾으면 이후 DOM 변경에 반응하지 않는다", async () => {
		document.body.innerHTML = "<p>알파 브라보 찰리</p>";
		const renderer = createFakeRenderer();

		startHighlightRestore({
			items: [createItem(1, "브라보")],
			renderer,
			debounceMs: 10,
		});

		document.body.innerHTML = "<p>알파 브라보 찰리 브라보</p>";
		await flush(60);

		expect(renderer.added).toEqual([1]);
	});

	it("타임아웃 뒤에는 늦게 들어온 문장을 렌더하지 않는다", async () => {
		document.body.innerHTML = "<p>알파</p>";
		const renderer = createFakeRenderer();

		startHighlightRestore({
			items: [createItem(1, "브라보")],
			renderer,
			debounceMs: 10,
			timeoutMs: 30,
		});

		await flush(60);
		document.body.innerHTML = "<p>알파 브라보</p>";
		await flush(60);

		expect(renderer.added).toEqual([]);
	});

	it("정리 함수를 부르면 이후 DOM 변경을 무시한다", async () => {
		document.body.innerHTML = "<p>알파</p>";
		const renderer = createFakeRenderer();

		const stop = startHighlightRestore({
			items: [createItem(1, "브라보")],
			renderer,
			debounceMs: 10,
		});
		stop();

		document.body.innerHTML = "<p>알파 브라보</p>";
		await flush(60);

		expect(renderer.added).toEqual([]);
	});

	it("항목이 없으면 옵저버를 만들지 않는다", () => {
		document.body.innerHTML = "<p>알파</p>";
		const renderer = createFakeRenderer();
		const observeSpy = vi.spyOn(MutationObserver.prototype, "observe");

		startHighlightRestore({ items: [], renderer });

		expect(observeSpy).not.toHaveBeenCalled();
	});
});
```

"모두 찾으면 반응하지 않는다"와 "타임아웃 뒤에는 렌더하지 않는다"가 종료 조건을 직접 검증한다.
옵저버의 `disconnect` 호출 여부를 훔쳐보는 대신 **관찰 가능한 동작**으로 확인하므로, 구현을
바꿔도 테스트가 살아남는다.

- [ ] **Step 2: 테스트 실패 확인**

```bash
pnpm test:jest run pages/content-ui/src/ui/highlight/restoreHighlights.test.ts
```

기대: FAIL — 모듈을 찾을 수 없음

- [ ] **Step 3: 구현**

`pages/content-ui/src/ui/highlight/restoreHighlights.ts`:

```typescript
import {
	type HighlightItem,
	type HighlightRenderer,
	resolveAnchors,
} from "@web-memo/shared/modules/highlight";

/** 늦게 그려지는 본문을 기다리는 한계. 이후에는 옵저버를 해제한다 */
export const RESTORE_TIMEOUT_MS = 10_000;

/** DOM 변경이 몰아칠 때 재시도를 모으는 간격 */
export const RETRY_DEBOUNCE_MS = 300;

interface StartHighlightRestoreParams {
	/** 복원할 하이라이트 목록 */
	items: HighlightItem[];
	/** 밑줄을 그릴 렌더러 */
	renderer: HighlightRenderer;
	/** 탐색 기준 노드 */
	root?: Node;
	/** 이 시간이 지나면 못 찾은 앵커를 포기하고 옵저버를 해제한다 */
	timeoutMs?: number;
	/** DOM 변경 후 재시도까지의 대기 시간 */
	debounceMs?: number;
}

/**
 * 저장된 하이라이트를 현재 문서에 복원한다.
 * @description 즉시 한 번 시도하고, 못 찾은 앵커가 남으면 DOM 변경을 관찰해 그것들만 다시
 * 시도한다. 요즘 페이지는 본문을 나중에 그리기 때문이다. 남의 페이지에 도는 코드를 남기지
 * 않도록 전부 찾으면 즉시, 못 찾아도 `timeoutMs` 뒤에는 반드시 옵저버를 해제한다.
 * 재시도는 `resolveAnchors`로 문서를 한 번만 훑는다.
 * @returns 정리 함수. 호출하면 옵저버와 타이머를 즉시 해제한다.
 */
export function startHighlightRestore({
	items,
	renderer,
	root = document.body,
	timeoutMs = RESTORE_TIMEOUT_MS,
	debounceMs = RETRY_DEBOUNCE_MS,
}: StartHighlightRestoreParams): () => void {
	let pending = [...items];
	let observer: MutationObserver | null = null;
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	let timeoutTimer: ReturnType<typeof setTimeout> | null = null;

	function stop(): void {
		observer?.disconnect();
		observer = null;

		if (debounceTimer !== null) {
			clearTimeout(debounceTimer);
			debounceTimer = null;
		}

		if (timeoutTimer !== null) {
			clearTimeout(timeoutTimer);
			timeoutTimer = null;
		}
	}

	/** 아직 못 찾은 앵커만 다시 시도하고, 찾은 것은 pending에서 뺀다 */
	function attempt(): void {
		const ranges = resolveAnchors(
			pending.map((item) => item.anchor),
			root,
		);
		const stillPending: HighlightItem[] = [];

		pending.forEach((item, itemIndex) => {
			const range = ranges[itemIndex];

			if (range) {
				renderer.add(item.id, range, item.color);
				return;
			}

			stillPending.push(item);
		});

		pending = stillPending;
	}

	if (items.length === 0) {
		return stop;
	}

	attempt();

	if (pending.length === 0) {
		return stop;
	}

	observer = new MutationObserver(() => {
		if (debounceTimer !== null) {
			clearTimeout(debounceTimer);
		}

		debounceTimer = setTimeout(() => {
			debounceTimer = null;
			attempt();

			if (pending.length === 0) {
				stop();
			}
		}, debounceMs);
	});

	observer.observe(root, {
		childList: true,
		subtree: true,
		characterData: true,
	});

	timeoutTimer = setTimeout(stop, timeoutMs);

	return stop;
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
pnpm test:jest run pages/content-ui/src/ui/highlight/restoreHighlights.test.ts
```

기대: PASS (7 케이스)

- [ ] **Step 5: 타입 체크 후 커밋**

```bash
pnpm -F @web-memo/content-ui type-check && pnpm lint
git add pages/content-ui/src/ui/highlight/restoreHighlights.ts \
        pages/content-ui/src/ui/highlight/restoreHighlights.test.ts
git commit -m "feat: 못 찾은 앵커만 재시도하는 하이라이트 복원 모듈 추가"
```

---

### Task 5: 코멘트 툴팁과 content script 연결

**Files:**
- Create: `pages/content-ui/src/ui/highlight/HighlightTooltip.tsx`
- Create: `pages/content-ui/src/ui/highlight/index.tsx`
- Modify: `pages/content-ui/src/ui/index.ts`
- Modify: `pages/content-ui/src/index.tsx`

**Interfaces:**
- Consumes: `startHighlightRestore`(Task 4), `toHighlightItem`(Task 2),
  `GET_HIGHLIGHTS_BY_URL`(Task 3), `createHighlightRenderer`, `attachShadowTree`
- Produces: `setupHighlightRestore(): Promise<void>`

주 렌더 경로인 CSS Custom Highlight API는 DOM 요소를 만들지 않아 밑줄에 `mouseover`를 걸 수 없다.
렌더러가 제공하는 `hitTest(x, y)`로 좌표에서 하이라이트 id를 찾는다.

- [ ] **Step 1: 툴팁 컴포넌트 작성**

`pages/content-ui/src/ui/highlight/HighlightTooltip.tsx`:

```tsx
import { useEffect, useState } from "react";

/** 마우스 위치 추적 간격. 남의 페이지에서 매 픽셀마다 도는 핸들러를 만들지 않는다 */
const HOVER_THROTTLE_MS = 100;

/** 커서와 툴팁 사이 간격 */
const CURSOR_OFFSET_PX = 16;

/** 마우스가 올라간 하이라이트의 코멘트와 표시 좌표 */
interface TooltipState {
	note: string;
	x: number;
	y: number;
}

interface HighlightTooltipProps {
	/** 좌표로 하이라이트 id를 찾는다. 없으면 null */
	hitTest: (x: number, y: number) => number | null;
	/** 하이라이트 id → 코멘트. 코멘트가 없는 하이라이트는 담기지 않는다 */
	notesById: Map<number, string>;
}

/**
 * 코멘트가 있는 하이라이트에 마우스를 올리면 코멘트를 띄운다.
 * @description CSS Custom Highlight API는 DOM 요소를 만들지 않아 밑줄에 마우스 이벤트를
 * 걸 수 없다. 그래서 문서 전체의 `mousemove`를 throttle해 받아 `hitTest`로 판별한다.
 * 스타일을 인라인으로 두는 이유는 요소가 하나뿐이라 클래스 체계가 필요 없고, Shadow DOM
 * 스타일시트 주입 타이밍에 의존하지 않는 편이 확실하기 때문이다.
 */
export function HighlightTooltip({
	hitTest,
	notesById,
}: HighlightTooltipProps) {
	const [tooltip, setTooltip] = useState<TooltipState | null>(null);

	useEffect(() => {
		let lastRunAt = 0;

		function handleMouseMove(event: MouseEvent): void {
			const now = Date.now();

			if (now - lastRunAt < HOVER_THROTTLE_MS) {
				return;
			}

			lastRunAt = now;

			const id = hitTest(event.clientX, event.clientY);
			const note = id === null ? undefined : notesById.get(id);

			if (!note) {
				setTooltip(null);
				return;
			}

			setTooltip({ note, x: event.clientX, y: event.clientY });
		}

		document.addEventListener("mousemove", handleMouseMove, { passive: true });

		return () => {
			document.removeEventListener("mousemove", handleMouseMove);
		};
	}, [hitTest, notesById]);

	if (!tooltip) {
		return null;
	}

	return (
		<div
			style={{
				position: "fixed",
				left: tooltip.x + CURSOR_OFFSET_PX,
				top: tooltip.y + CURSOR_OFFSET_PX,
				zIndex: 2147483647,
				maxWidth: "320px",
				padding: "8px 10px",
				borderRadius: "8px",
				background: "rgba(23, 23, 23, 0.95)",
				color: "#fafafa",
				fontSize: "13px",
				lineHeight: 1.5,
				whiteSpace: "pre-wrap",
				pointerEvents: "none",
				boxShadow: "0 4px 12px rgba(0, 0, 0, 0.25)",
			}}
		>
			{tooltip.note}
		</div>
	);
}
```

`pointerEvents: "none"`이 중요하다. 툴팁이 커서를 가로채면 그 아래 링크를 누를 수 없다.

- [ ] **Step 2: 초기화 모듈 작성**

`pages/content-ui/src/ui/highlight/index.tsx`:

```tsx
import { bridge } from "@web-memo/shared/modules/extension-bridge";
import {
	createHighlightRenderer,
	toHighlightItem,
} from "@web-memo/shared/modules/highlight";
import { attachShadowTree } from "../../utils";
import { HighlightTooltip } from "./HighlightTooltip";
import { startHighlightRestore } from "./restoreHighlights";

const TOOLTIP_HOST_ID = "webmemo-highlight-tooltip";

/**
 * 현재 페이지의 하이라이트를 조회해 원문 위에 복원한다.
 * @description 조회는 background가 대신한다 — content script는 MV3에서 Supabase 세션에
 * 접근할 수 없다. 하이라이트가 없으면 옵저버도 마우스 리스너도 만들지 않고 즉시 끝낸다.
 * 사용자가 방문하는 페이지 대부분이 여기 해당하므로, 남의 사이트에 남기는 비용을 조회 한 번으로
 * 제한하는 것이 이 조기 종료의 목적이다.
 */
export async function setupHighlightRestore(): Promise<void> {
	const response = await bridge.request.GET_HIGHLIGHTS_BY_URL({
		url: window.location.href,
	});
	const rows = response?.highlights ?? [];

	if (rows.length === 0) {
		return;
	}

	const renderer = createHighlightRenderer();

	startHighlightRestore({
		items: rows.map(toHighlightItem),
		renderer,
	});

	const notesById = new Map<number, string>();

	for (const row of rows) {
		if (row.note) {
			notesById.set(row.id, row.note);
		}
	}

	if (notesById.size === 0) {
		return;
	}

	attachShadowTree({
		shadowHostId: TOOLTIP_HOST_ID,
		shadowTree: (
			<HighlightTooltip
				hitTest={(x, y) => renderer.hitTest(x, y)}
				notesById={notesById}
			/>
		),
	});
}
```

`attachShadowTree`는 `pages/content-ui/src/utils/index.ts` 배럴로 재수출되어 있고, 기존
`textSelection/index.tsx`·`openSidePanel/index.tsx`가 `from "../../utils"`로 가져온다.
같은 깊이의 디렉토리이므로 같은 경로를 쓴다.

- [ ] **Step 3: 배럴에 추가**

`pages/content-ui/src/ui/index.ts`에 추가한다. 기존 항목들과 알파벳 순서를 맞춘다
(`./highlight`는 `./openSidePanel` 앞이다).

```typescript
export * from "./highlight";
```

- [ ] **Step 4: content script 엔트리에서 호출**

`pages/content-ui/src/index.tsx`를 수정한다. `./ui` import 목록에 `setupHighlightRestore`를
추가하고, `initTextSelectionHandler();` 호출 **다음 줄에** 추가한다.

```typescript
setupHighlightRestore();
```

`await`하지 않는다. 이 함수가 느려도 다른 초기화를 막으면 안 된다.

- [ ] **Step 5: 검증**

```bash
pnpm test:jest run pages/content-ui/src/ui/highlight/restoreHighlights.test.ts
pnpm type-check
pnpm lint
```

기대: 통과. **툴팁 자체는 자동 테스트가 없다** — Shadow DOM + 실제 마우스 좌표 hitTest는
jsdom에서 의미 있게 재현되지 않는다. Task 6에서 실제 사이트로 확인한다.

- [ ] **Step 6: 커밋**

```bash
git add pages/content-ui/src/ui/highlight/HighlightTooltip.tsx \
        pages/content-ui/src/ui/highlight/index.tsx \
        pages/content-ui/src/ui/index.ts \
        pages/content-ui/src/index.tsx
git commit -m "feat: PC 브라우저에서 하이라이트 복원과 코멘트 툴팁 표시"
```

---

### Task 6: 실제 브라우저 확인

**Files:** 없음 (검증만)

이 태스크는 **사용자가 수행한다.** 서브에이전트가 대신할 수 없다 — 확장을 크롬에 로드하고
실제 사이트를 돌아다녀야 한다.

- [ ] **Step 1: 확장 빌드**

```bash
pnpm -F @web-memo/content-ui build
pnpm -F @web-memo/chrome-extension build
```

- [ ] **Step 2: 크롬에 로드**

**빌드 산출물은 저장소 루트의 `dist/`다.** 확장의 `vite.config.mts:10`이
`resolve(rootDir, "..", "..", "dist")`를, content-ui가 `dist/content-ui`를 outDir로 쓴다.
`apps/chrome-extension/dist`가 아니다.

`chrome://extensions` → 개발자 모드 → "압축해제된 확장 프로그램을 로드합니다" →
저장소 루트의 `dist` 선택. 이미 로드되어 있으면 새로고침 버튼을 누른다.

- [ ] **Step 3: 확인 항목**

- 앱에서 하이라이트를 그은 페이지를 PC 크롬으로 열면 밑줄이 복원되는가
- 코멘트를 단 하이라이트에 마우스를 올리면 툴팁이 뜨는가
- 툴팁이 떠 있어도 그 아래 링크를 클릭할 수 있는가 (`pointerEvents: none` 확인)
- 하이라이트가 없는 페이지에서 아무 일도 일어나지 않는가 (콘솔에 에러 없음)
- 비로그인 상태에서 아무 일도 일어나지 않는가
- **본문이 늦게 그려지는 사이트**(뉴스·블로그 SPA)에서도 결국 복원되는가 ← MutationObserver 검증
- 앱 내장 브라우저의 하이라이트 기능이 여전히 동작하는가 ← Task 2가 앱 코드를 건드렸다
- 복원되지 않는 페이지가 있다면 어떤 사이트인지 기록 (앵커 매칭 품질 평가용)

- [ ] **Step 4: PR 생성**

base는 `feat/highlight`로 한다. 선행 PR #404가 아직 develop에 머지되지 않아서, base를 develop으로
잡으면 #404의 커밋이 diff에 섞인다.
