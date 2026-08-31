import type { Database } from "@web-memo/shared/types";

type MockMemo = Database["memo"]["Tables"]["memo"]["Row"];
type MockCategory = Database["memo"]["Tables"]["category"]["Row"];
type MockHighlight = Database["memo"]["Tables"]["highlight"]["Row"];
type MockSetting = Database["memo"]["Tables"]["setting"]["Row"];

let memoIdCounter = 1;
let categoryIdCounter = 1;
let highlightIdCounter = 1;

/**
 * 메모 한 건을 만든다. 실제 테이블 컬럼을 모두 채워 앱이 받는 모양과 어긋나지 않게 한다.
 * @description 시각은 id마다 1초씩 벌린다. 같은 시각으로 만들면 정렬 키가 전부 동률이라
 * 정렬이 뒤집혀도 삽입 순서가 그대로 나와, 정렬 결함을 원리적으로 관측할 수 없다.
 */
export function createMockMemo(overrides: Partial<MockMemo> = {}): MockMemo {
	const id = memoIdCounter++;
	const now = new Date(Date.now() - id * 1000).toISOString();

	return {
		id,
		user_id: "test-user-id",
		url: `https://example.com/page-${id}`,
		title: `Test Memo ${id}`,
		memo: `Test memo content ${id}`,
		impression: null,
		actionItem: null,
		favIconUrl: null,
		deleted_at: null,
		isWish: false,
		isStar: false,
		isReading: false,
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
