import type { Page, Route } from "@playwright/test";
import { SUPABASE } from "@web-memo/shared/constants";
import type { Database } from "@web-memo/shared/types";
import { createMockMemo } from "./mockData";

type MemoRow = Database["memo"]["Tables"]["memo"]["Row"];
type HighlightRow = Database["memo"]["Tables"]["highlight"]["Row"];

/**
 * 목 Supabase의 저장소. 테스트가 시드를 넣고, 라우트 핸들러가 여기서 읽는다.
 * @description 서버가 하는 일(검색·필터·정렬·페이지네이션)은 흉내내지 않는다.
 * 흉내내려면 PostgREST의 쿼리 의미론을 여기에 두 번째로 구현하게 되고, 두 구현은
 * 반드시 어긋나 결함을 통과시킨다. 목은 UI 상태를 재현하는 데까지만 쓴다.
 */
export class MockSupabaseStore {
	private memos: Map<number, MemoRow> = new Map();
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
		if (!memo) {
			return null;
		}

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
		if (!highlight) {
			return null;
		}

		const updated = {
			...highlight,
			...updates,
			updated_at: new Date().toISOString(),
		};
		this.highlights.set(id, updated);

		return updated;
	}

	/** 저장소를 비운다. */
	clear() {
		this.memos.clear();
		this.highlights.clear();
	}
}

/** 라우트 핸들러가 공통으로 받는 것들. */
interface HandlerParams {
	route: Route;
	url: URL;
	store: MockSupabaseStore;
}

/** PostgREST의 `id=eq.3`, `color=eq.yellow` 같은 동등 필터를 읽는다. */
const parseEqualsFilter = (url: URL, column: string): string | undefined => {
	const value = url.searchParams.get(column);
	if (!value?.startsWith("eq.")) {
		return undefined;
	}

	return value.slice(3);
};

/** PostgREST의 `id=eq.3` 파라미터에서 숫자 id를 꺼낸다. */
const parseIdFromUrl = (url: URL): number | null => {
	const id = parseEqualsFilter(url, "id");
	if (!id) {
		return null;
	}

	return Number.parseInt(id, 10);
};

/**
 * `or=(<column>.ilike.%검색어%,...)`에서 검색어를 꺼낸다.
 * @description URLSearchParams가 이미 디코드해서 주므로 여기서 또 풀면 안 된다 —
 * 검색어에 `%`가 들어가면 값이 잘리거나 URIError로 죽는다.
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
 * 메모 목록 조회. 저장소에 있는 것을 그대로 돌려준다.
 * @description 검색·필터·정렬·페이지네이션은 서버가 하는 일이라 여기서 흉내내지
 * 않는다. 그 동작을 검증하려면 실제 Supabase가 필요하다.
 */
const handleMemoGet = async ({ route, store }: HandlerParams) => {
	await route.fulfill({
		status: 200,
		contentType: "application/json",
		body: JSON.stringify(store.getAllMemos()),
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
		body: JSON.stringify(updated ? [updated] : []),
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
		const params = { route, url: new URL(route.request().url()), store };

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
		`${SUPABASE.url}/rest/v1/highlight**`,
		async (route: Route) => {
			const params = { route, url: new URL(route.request().url()), store };

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
