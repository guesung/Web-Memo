import type { Page, Route } from "@playwright/test";
import { SUPABASE } from "@web-memo/shared/constants";
import type { Database } from "@web-memo/shared/types";
import { createMockMemo } from "./mockData";

type MemoRow = Database["memo"]["Tables"]["memo"]["Row"];
type CategoryRow = Database["memo"]["Tables"]["category"]["Row"];
type HighlightRow = Database["memo"]["Tables"]["highlight"]["Row"];

/** 앱이 받는 메모 한 건. `select("*, category(...)")`의 응답 모양이다. */
type MemoWithCategory = MemoRow & {
	category: Pick<CategoryRow, "id" | "name" | "color"> | null;
};

/**
 * 목 Supabase의 저장소. 테스트가 시드를 넣고, 라우트 핸들러가 여기서 읽는다.
 * @description 실제 PostgREST처럼 필터를 적용해 응답한다. 저장소가 필터를 흉내내지
 * 않으면 "검색해도 전부 보인다" 같은 결함을 테스트가 통과시켜 버린다.
 */
export class MockSupabaseStore {
	private memos: Map<number, MemoRow> = new Map();
	private categories: Map<number, CategoryRow> = new Map();
	private highlights: Map<number, HighlightRow> = new Map();

	/** 메모 한 건을 저장소에 넣는다. */
	addMemo(memo: MemoRow) {
		this.memos.set(memo.id, memo);
		return memo;
	}

	/** id로 메모를 찾는다. */
	getMemo(id: number) {
		return this.memos.get(id);
	}

	/** url로 메모를 찾는다. */
	getMemoByUrl(url: string) {
		return Array.from(this.memos.values()).find((memo) => memo.url === url);
	}

	/** 저장된 메모 전체를 넣은 순서대로 돌려준다. */
	getAllMemos() {
		return Array.from(this.memos.values());
	}

	/** 메모를 부분 갱신한다. 없으면 null. */
	updateMemo(id: number, updates: Partial<MemoRow>) {
		const memo = this.memos.get(id);
		if (!memo) return null;

		const updated = {
			...memo,
			...updates,
			updated_at: new Date().toISOString(),
		};
		this.memos.set(id, updated);

		return updated;
	}

	/** 메모를 지우고 지운 메모를 돌려준다. */
	deleteMemo(id: number) {
		const memo = this.memos.get(id);
		this.memos.delete(id);
		return memo;
	}

	/** 카테고리 한 건을 저장소에 넣는다. */
	addCategory(category: CategoryRow) {
		this.categories.set(category.id, category);
		return category;
	}

	/** 저장된 카테고리 전체를 돌려준다. */
	getAllCategories() {
		return Array.from(this.categories.values());
	}

	/** 하이라이트 한 건을 저장소에 넣는다. */
	addHighlight(highlight: HighlightRow) {
		this.highlights.set(highlight.id, highlight);
		return highlight;
	}

	/** 저장된 하이라이트 전체를 돌려준다. */
	getAllHighlights() {
		return Array.from(this.highlights.values());
	}

	/** 하이라이트를 부분 갱신한다. 없으면 null. */
	updateHighlight(id: number, updates: Partial<HighlightRow>) {
		const highlight = this.highlights.get(id);
		if (!highlight) return null;

		const updated = {
			...highlight,
			...updates,
			updated_at: new Date().toISOString(),
		};
		this.highlights.set(id, updated);

		return updated;
	}

	/** 메모에 category_id로 연결된 카테고리를 붙여 앱이 받는 모양으로 만든다. */
	toMemoWithCategory(memo: MemoRow): MemoWithCategory {
		const category =
			memo.category_id === null ? null : this.categories.get(memo.category_id);

		return {
			...memo,
			category: category
				? { id: category.id, name: category.name, color: category.color }
				: null,
		};
	}

	/** 저장소를 비운다. */
	clear() {
		this.memos.clear();
		this.categories.clear();
		this.highlights.clear();
	}
}

/** PostgREST의 `id=eq.3` 같은 파라미터에서 숫자 id를 꺼낸다. */
function parseIdFromUrl(url: URL): number | null {
	const idParam = url.searchParams.get("id");
	if (!idParam) return null;

	return Number.parseInt(idParam.replace("eq.", ""), 10);
}

/** PostgREST의 `isWish=eq.true` 같은 불리언 필터를 읽는다. 파라미터가 없으면 undefined. */
function parseBooleanFilter(url: URL, column: string): boolean | undefined {
	const value = url.searchParams.get(column);
	if (value !== "eq.true" && value !== "eq.false") return undefined;

	return value === "eq.true";
}

/**
 * `or=(<column>.ilike.%검색어%,...)`에서 검색어를 꺼낸다.
 * @description 커서 조건도 `or=`로 실릴 수 있으므로 지정한 컬럼의 ilike만 본다.
 */
function extractIlikeQuery(url: URL, column: string): string | undefined {
	const matched = url.searchParams
		.getAll("or")
		.map((value) => value.match(new RegExp(`${column}\\.ilike\\.%(.*?)%`)))
		.find(Boolean);

	return matched?.[1] ? decodeURIComponent(matched[1]) : undefined;
}

/** 대소문자를 무시하고 부분 일치를 본다. PostgREST의 ilike에 대응한다. */
function matchesIlike(value: string | null, query: string): boolean {
	return (value ?? "").toLowerCase().includes(query.toLowerCase());
}

/**
 * `order=updated_at.desc,id.desc`의 첫 정렬 기준을 읽는다.
 * @description 앱은 updated_at·created_at·title 중 하나로만 정렬한다.
 */
function parseOrder(url: URL): { column: keyof MemoRow; ascending: boolean } {
	const [first] = (url.searchParams.get("order") ?? "").split(",");
	const [column, direction] = first.split(".");

	if (column !== "created_at" && column !== "title") {
		return { column: "updated_at", ascending: direction === "asc" };
	}

	return { column, ascending: direction === "asc" };
}

/**
 * 메모 목록 조회. 앱이 보낸 PostgREST 필터를 그대로 적용한다.
 * @description count는 Content-Range 헤더로만 전달된다. 본문에 넣으면 supabase-js가 못 읽는다.
 */
async function handleMemoGet(route: Route, url: URL, store: MockSupabaseStore) {
	const isWish = parseBooleanFilter(url, "isWish");
	const isStar = parseBooleanFilter(url, "isStar");
	const isReading = parseBooleanFilter(url, "isReading");
	const categoryName = url.searchParams
		.get("category.name")
		?.replace("eq.", "");
	const searchQuery = extractIlikeQuery(url, "title");

	const filtered = store
		.getAllMemos()
		.map((memo) => store.toMemoWithCategory(memo))
		.filter((memo) => {
			if (isWish !== undefined && (memo.isWish ?? false) !== isWish)
				return false;
			if (isStar !== undefined && (memo.isStar ?? false) !== isStar)
				return false;
			if (isReading !== undefined && (memo.isReading ?? false) !== isReading) {
				return false;
			}
			if (categoryName && memo.category?.name !== categoryName) return false;
			if (
				searchQuery &&
				!matchesIlike(memo.title, searchQuery) &&
				!matchesIlike(memo.memo, searchQuery) &&
				!matchesIlike(memo.impression, searchQuery) &&
				!matchesIlike(memo.actionItem, searchQuery)
			) {
				return false;
			}

			return true;
		});

	const { column, ascending } = parseOrder(url);
	const sorted = filtered.sort((a, b) => {
		const order = String(a[column] ?? "").localeCompare(
			String(b[column] ?? ""),
		);
		return ascending ? order : -order;
	});

	const limit = Number(url.searchParams.get("limit") ?? sorted.length);
	const page = sorted.slice(0, limit);

	await route.fulfill({
		status: 200,
		contentType: "application/json",
		headers: {
			"content-range": `0-${Math.max(page.length - 1, 0)}/${sorted.length}`,
			// 다른 오리진이라 이 헤더를 노출해 주지 않으면 supabase-js가 count를 못 읽는다.
			"access-control-expose-headers": "content-range",
		},
		body: JSON.stringify(page),
	});
}

/** 메모 생성. */
async function handleMemoPost(route: Route, store: MockSupabaseStore) {
	const newMemo = createMockMemo(route.request().postDataJSON());
	store.addMemo(newMemo);

	await route.fulfill({
		status: 201,
		contentType: "application/json",
		body: JSON.stringify([newMemo]),
	});
}

/** 메모 수정. */
async function handleMemoPatch(
	route: Route,
	url: URL,
	store: MockSupabaseStore,
) {
	const id = parseIdFromUrl(url);
	if (!id) {
		await route.continue();
		return;
	}

	const updated = store.updateMemo(id, route.request().postDataJSON());
	await route.fulfill({
		status: 200,
		contentType: "application/json",
		body: JSON.stringify(updated ? [store.toMemoWithCategory(updated)] : []),
	});
}

/** 메모 삭제. */
async function handleMemoDelete(
	route: Route,
	url: URL,
	store: MockSupabaseStore,
) {
	const id = parseIdFromUrl(url);
	if (!id) {
		await route.continue();
		return;
	}

	const deleted = store.deleteMemo(id);
	await route.fulfill({
		status: 200,
		contentType: "application/json",
		body: JSON.stringify(deleted ? [deleted] : []),
	});
}

/** 카테고리 목록 조회. 사이드바와 메모의 카테고리 뱃지가 여기서 온다. */
async function handleCategoryGet(route: Route, store: MockSupabaseStore) {
	await route.fulfill({
		status: 200,
		contentType: "application/json",
		body: JSON.stringify(store.getAllCategories()),
	});
}

/** 하이라이트 목록 조회. 색상과 검색어 필터를 적용한다. */
async function handleHighlightGet(
	route: Route,
	url: URL,
	store: MockSupabaseStore,
) {
	const color = url.searchParams.get("color")?.replace("eq.", "");
	const searchQuery = extractIlikeQuery(url, "exact_text");

	const highlights = store.getAllHighlights().filter((highlight) => {
		if (color && highlight.color !== color) return false;
		if (
			searchQuery &&
			!matchesIlike(highlight.exact_text, searchQuery) &&
			!matchesIlike(highlight.note, searchQuery)
		) {
			return false;
		}

		return true;
	});

	await route.fulfill({
		status: 200,
		contentType: "application/json",
		body: JSON.stringify(highlights),
	});
}

/** 하이라이트 수정. 코멘트 저장이 여기로 온다. */
async function handleHighlightPatch(
	route: Route,
	url: URL,
	store: MockSupabaseStore,
) {
	const id = parseIdFromUrl(url);
	if (!id) {
		await route.continue();
		return;
	}

	const updated = store.updateHighlight(id, route.request().postDataJSON());
	await route.fulfill({
		status: 200,
		contentType: "application/json",
		body: JSON.stringify(updated ? [updated] : []),
	});
}

/**
 * Supabase REST 호출을 저장소로 가로챈다.
 * @description 브라우저가 보내는 요청만 가로챈다. 서버 컴포넌트의 프리페치는 여기 걸리지 않는다.
 */
export async function setupSupabaseMocks(page: Page, store: MockSupabaseStore) {
	await page.route(`${SUPABASE.url}/rest/v1/memo**`, async (route: Route) => {
		const url = new URL(route.request().url());

		switch (route.request().method()) {
			case "GET":
				await handleMemoGet(route, url, store);
				break;
			case "POST":
				await handleMemoPost(route, store);
				break;
			case "PATCH":
				await handleMemoPatch(route, url, store);
				break;
			case "DELETE":
				await handleMemoDelete(route, url, store);
				break;
			default:
				await route.continue();
		}
	});

	await page.route(
		`${SUPABASE.url}/rest/v1/category**`,
		async (route: Route) => {
			if (route.request().method() !== "GET") {
				await route.continue();
				return;
			}

			await handleCategoryGet(route, store);
		},
	);

	await page.route(
		`${SUPABASE.url}/rest/v1/highlight**`,
		async (route: Route) => {
			const url = new URL(route.request().url());

			switch (route.request().method()) {
				case "GET":
					await handleHighlightGet(route, url, store);
					break;
				case "PATCH":
					await handleHighlightPatch(route, url, store);
					break;
				default:
					await route.continue();
			}
		},
	);
}
