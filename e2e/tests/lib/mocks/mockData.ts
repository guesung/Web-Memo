import type { Database } from "@web-memo/shared/types";

type MockMemo = Database["memo"]["Tables"]["memo"]["Row"];
type MockCategory = Database["memo"]["Tables"]["category"]["Row"];
type MockHighlight = Database["memo"]["Tables"]["highlight"]["Row"];

let memoIdCounter = 1;
let categoryIdCounter = 1;
let highlightIdCounter = 1;

/** 메모 한 건을 만든다. 실제 테이블 컬럼을 모두 채워 앱이 받는 모양과 어긋나지 않게 한다. */
export function createMockMemo(overrides: Partial<MockMemo> = {}): MockMemo {
	const id = memoIdCounter++;
	const now = new Date().toISOString();

	return {
		id,
		user_id: "test-user-id",
		url: `https://example.com/page-${id}`,
		title: `Test Memo ${id}`,
		memo: `Test memo content ${id}`,
		impression: null,
		actionItem: null,
		favIconUrl: null,
		isWish: false,
		isStar: false,
		isReading: false,
		category_id: null,
		created_at: now,
		updated_at: now,
		...overrides,
	};
}

/** 카테고리 한 건을 만든다. */
export function createMockCategory(
	overrides: Partial<MockCategory> = {},
): MockCategory {
	const id = categoryIdCounter++;
	return {
		id,
		user_id: "test-user-id",
		name: `Test Category ${id}`,
		color: "#3B82F6",
		memo_count: 0,
		created_at: new Date().toISOString(),
		...overrides,
	};
}

/** 하이라이트 한 건을 만든다. */
export function createMockHighlight(
	overrides: Partial<MockHighlight> = {},
): MockHighlight {
	const id = highlightIdCounter++;
	const now = new Date().toISOString();
	return {
		id,
		user_id: "test-user-id",
		url: `https://example.com/page-${id}`,
		title: `Test Page ${id}`,
		favIconUrl: null,
		exact_text: `Test highlight ${id}`,
		note: null,
		color: "yellow",
		prefix_text: null,
		suffix_text: null,
		text_position_start: null,
		created_at: now,
		updated_at: now,
		...overrides,
	};
}

/** 테스트마다 id를 1부터 다시 매긴다. */
export function resetMockIds() {
	memoIdCounter = 1;
	categoryIdCounter = 1;
	highlightIdCounter = 1;
}
