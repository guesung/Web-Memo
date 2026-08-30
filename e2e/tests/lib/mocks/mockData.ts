import type { Database } from "@web-memo/shared/types";

type MockMemo = Database["memo"]["Tables"]["memo"]["Row"];
type MockCategory = Database["memo"]["Tables"]["category"]["Row"];
type MockHighlight = Database["memo"]["Tables"]["highlight"]["Row"];
type MockSetting = Database["memo"]["Tables"]["setting"]["Row"];

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
		isStar: false,
		isReading: false,
		impression: null,
		actionItem: null,
		category_id: null,
		created_at: now,
		updated_at: now,
		...overrides,
	};
}

/**
 * 메모 필드 노출 설정(setting) 행을 만든다.
 *
 * @description 기본값은 제품 기본값과 동일하게 느낀 점·액션 아이템 모두 꺼짐이다.
 * 설정 행 자체가 없는 상황은 이 함수 대신 store.setSetting(null)로 표현한다.
 */
export function createMockSetting(
	overrides: Partial<MockSetting> = {},
): MockSetting {
	return {
		id: 1,
		user_id: "test-user-id",
		show_impression: false,
		show_action_item: false,
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
