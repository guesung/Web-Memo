import type { Database } from "@web-memo/shared/types";

type MockMemo = Database["memo"]["Tables"]["memo"]["Row"];
type MockCategory = Database["memo"]["Tables"]["category"]["Row"];
type MockHighlight = Database["memo"]["Tables"]["highlight"]["Row"];

let memoIdCounter = 1;
let categoryIdCounter = 1;
let highlightIdCounter = 1;

export function createMockMemo(overrides: Partial<MockMemo> = {}): MockMemo {
	const id = memoIdCounter++;
	const now = new Date().toISOString();
	return {
		id,
		user_id: "test-user-id",
		url: `https://example.com/page-${id}`,
		title: `Test Memo ${id}`,
		memo: `Test memo content ${id}`,
		favIconUrl: null,
		isWish: false,
		category_id: null,
		created_at: now,
		updated_at: now,
		...overrides,
	};
}

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

export function resetMockIds() {
	memoIdCounter = 1;
	categoryIdCounter = 1;
	highlightIdCounter = 1;
}
