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
 *
 * 다만 이건 PostgREST의 쿼리 의미론을 두 번째로 구현한 것이라 원본과 어긋날 수 있다.
 * 실제로 필터 전체 무시, 커서 무시, `id=eq.N` 무시, 컬럼 누락 네 번이 어긋난 적이
 * 있고 넷 다 테스트가 아니라 사람이 발견했다. 그러므로 여기 붙는 테스트가 지키는 것은
 * "앱이 올바른 쿼리를 보내고 응답을 올바르게 그리는가"까지다. "그 쿼리가 Supabase에서
 * 의도대로 동작하는가"는 실제 인스턴스가 있어야 지킬 수 있다.
 *
 * 앱의 쿼리를 바꾸면(packages/shared의 getMemosPaginated 등) 여기도 같이 맞춰야 한다.
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

/** 라우트 핸들러가 공통으로 받는 것들. */
interface HandlerParams {
	route: Route;
	url: URL;
	store: MockSupabaseStore;
}

/** PostgREST의 `id=eq.3`, `url=eq.https://...` 같은 동등 필터를 읽는다. */
const parseEqualsFilter = (url: URL, column: string): string | undefined => {
	const value = url.searchParams.get(column);
	if (!value?.startsWith("eq.")) {
		return undefined;
	}

	return value.slice(3);
};

/** PostgREST의 `id=eq.3` 같은 파라미터에서 숫자 id를 꺼낸다. */
const parseIdFromUrl = (url: URL): number | null => {
	const id = parseEqualsFilter(url, "id");
	if (!id) {
		return null;
	}

	return Number.parseInt(id, 10);
};

/** PostgREST의 `isWish=eq.true` 같은 불리언 필터를 읽는다. 파라미터가 없으면 undefined. */
const parseBooleanFilter = (url: URL, column: string): boolean | undefined => {
	const value = url.searchParams.get(column);
	if (value !== "eq.true" && value !== "eq.false") {
		return undefined;
	}

	return value === "eq.true";
};

/**
 * `or=(<column>.ilike.%검색어%,...)`에서 검색어를 꺼낸다.
 * @description `or`에는 여러 컬럼의 조건이 함께 실리므로 지정한 컬럼의 ilike만 본다.
 * URLSearchParams가 이미 디코드해서 주므로 여기서 또 풀면 안 된다 — 검색어에 `%`가
 * 들어가면 값이 잘리거나 URIError로 죽는다.
 */
const extractIlikeQuery = (url: URL, column: string): string | undefined => {
	const matchedIlike = url.searchParams
		.getAll("or")
		.map((value) => value.match(new RegExp(`${column}\\.ilike\\.%(.*?)%`)))
		.find(Boolean);

	return matchedIlike?.[1];
};

/** 대소문자를 무시하고 부분 일치를 본다. PostgREST의 ilike에 대응한다. */
const matchesIlike = (value: string | null, query: string): boolean =>
	(value ?? "").toLowerCase().includes(query.toLowerCase());

/**
 * 커서 페이지네이션 필터를 적용한다.
 * @description 앱은 offset이 아니라 정렬 키의 `lt`/`gt`로 다음 장을 요청한다
 * (packages/shared의 getMemosPaginated). 여기서 안 걸러주면 2페이지가 1페이지와
 * 같은 응답이 되어 무한 스크롤 결함이 테스트를 그대로 통과한다.
 */
const matchesCursor = (memo: MemoRow, url: URL): boolean => {
	for (const column of ["updated_at", "created_at", "title"] as const) {
		const condition = url.searchParams.get(column);
		if (!condition) {
			continue;
		}

		// 정렬과 같은 비교자를 써야 한다. 커서는 원시 비교, 정렬은 localeCompare로
		// 갈리면 title 정렬에서 같은 메모가 두 장에 걸쳐 중복된다.
		const compared = String(memo[column] ?? "").localeCompare(
			condition.slice(3),
		);
		if (condition.startsWith("lt.") && compared >= 0) {
			return false;
		}
		if (condition.startsWith("gt.") && compared <= 0) {
			return false;
		}
	}

	return true;
};

/**
 * `order=updated_at.desc,id.desc`를 읽는다.
 * @description 앱은 정렬 키가 같을 때를 대비해 `id`를 2차 키로 함께 보낸다.
 */
const parseOrder = (url: URL) => {
	const [firstOrderClause, secondOrderClause] = (
		url.searchParams.get("order") ?? ""
	).split(",");
	const [column, direction] = firstOrderClause.split(".");
	const ascending = direction === "asc";

	return {
		column:
			column === "created_at" || column === "title" ? column : "updated_at",
		ascending,
		secondColumn: secondOrderClause
			? secondOrderClause.split(".")[0]
			: undefined,
	} as const;
};

/**
 * 메모 목록 조회. 앱이 보낸 PostgREST 필터를 그대로 적용한다.
 * @description count는 Content-Range 헤더로만 전달되고, 다른 오리진이라 노출까지
 * 해줘야 supabase-js가 읽는다.
 */
const handleMemoGet = async ({ route, url, store }: HandlerParams) => {
	const isWish = parseBooleanFilter(url, "isWish");
	const isStar = parseBooleanFilter(url, "isStar");
	const isReading = parseBooleanFilter(url, "isReading");
	const categoryName = parseEqualsFilter(url, "category.name");
	const searchQuery = extractIlikeQuery(url, "title");
	// 한 건 조회(getMemoById·getMemoByUrl)도 같은 GET으로 온다. 여기서 안 걸러주면
	// 저장소의 모든 메모가 돌아가고, 호출부의 at(-1)이 엉뚱한 메모를 집는다.
	const targetId = parseEqualsFilter(url, "id");
	const targetUrl = parseEqualsFilter(url, "url");

	const filtered = store
		.getAllMemos()
		.map((memo) => store.toMemoWithCategory(memo))
		.filter((memo) => {
			if (targetId !== undefined && String(memo.id) !== targetId) {
				return false;
			}
			if (targetUrl !== undefined && memo.url !== targetUrl) {
				return false;
			}
			if (isWish !== undefined && (memo.isWish ?? false) !== isWish) {
				return false;
			}
			if (isStar !== undefined && (memo.isStar ?? false) !== isStar) {
				return false;
			}
			if (isReading !== undefined && (memo.isReading ?? false) !== isReading) {
				return false;
			}
			if (categoryName && memo.category?.name !== categoryName) {
				return false;
			}
			if (!matchesCursor(memo, url)) {
				return false;
			}
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

	const { column, ascending, secondColumn } = parseOrder(url);
	const sorted = filtered.sort((a, b) => {
		const compared = String(a[column] ?? "").localeCompare(
			String(b[column] ?? ""),
		);
		if (compared !== 0) {
			return ascending ? compared : -compared;
		}

		if (secondColumn !== "id") {
			return 0;
		}

		return ascending ? a.id - b.id : b.id - a.id;
	});

	const limit = Number(url.searchParams.get("limit") ?? sorted.length);
	const pagedMemos = sorted.slice(0, limit);

	await route.fulfill({
		status: 200,
		contentType: "application/json",
		headers: {
			"content-range": `0-${Math.max(pagedMemos.length - 1, 0)}/${sorted.length}`,
			"access-control-expose-headers": "content-range",
		},
		body: JSON.stringify(pagedMemos),
	});
};

/** 메모 생성. */
const handleMemoPost = async ({ route, store }: HandlerParams) => {
	const newMemo = createMockMemo(route.request().postDataJSON());
	store.addMemo(newMemo);

	await route.fulfill({
		status: 201,
		contentType: "application/json",
		body: JSON.stringify([newMemo]),
	});
};

/** 메모 수정. */
const handleMemoPatch = async ({ route, url, store }: HandlerParams) => {
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
};

/** 메모 삭제. */
const handleMemoDelete = async ({ route, url, store }: HandlerParams) => {
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
};

/** 카테고리 목록 조회. 메모의 카테고리 뱃지가 여기서 온다. */
const handleCategoryGet = async ({ route, store }: HandlerParams) => {
	await route.fulfill({
		status: 200,
		contentType: "application/json",
		body: JSON.stringify(store.getAllCategories()),
	});
};

/** 하이라이트 목록 조회. 색상과 검색어 필터를 적용한다. */
const handleHighlightGet = async ({ route, url, store }: HandlerParams) => {
	const color = parseEqualsFilter(url, "color");
	const searchQuery = extractIlikeQuery(url, "exact_text");

	const highlights = store.getAllHighlights().filter((highlight) => {
		if (color && highlight.color !== color) {
			return false;
		}
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
};

/** 하이라이트 수정. 코멘트 저장이 여기로 온다. */
const handleHighlightPatch = async ({ route, url, store }: HandlerParams) => {
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
};

/**
 * Supabase REST 호출을 저장소로 가로챈다.
 * @description 브라우저가 보내는 요청만 가로챈다. 서버 컴포넌트의 프리페치는 여기 걸리지 않는다.
 */
export async function setupSupabaseMocks(page: Page, store: MockSupabaseStore) {
	await page.route(`${SUPABASE.url}/rest/v1/memo**`, async (route: Route) => {
		const url = new URL(route.request().url());
		const params = { route, url, store };

		switch (route.request().method()) {
			case "GET":
				await handleMemoGet(params);
				break;
			case "POST":
				await handleMemoPost(params);
				break;
			case "PATCH":
				await handleMemoPatch(params);
				break;
			case "DELETE":
				await handleMemoDelete(params);
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

			await handleCategoryGet({
				route,
				url: new URL(route.request().url()),
				store,
			});
		},
	);

	await page.route(
		`${SUPABASE.url}/rest/v1/highlight**`,
		async (route: Route) => {
			const url = new URL(route.request().url());
			const params = { route, url, store };

			switch (route.request().method()) {
				case "GET":
					await handleHighlightGet(params);
					break;
				case "PATCH":
					await handleHighlightPatch(params);
					break;
				default:
					await route.continue();
			}
		},
	);
}
