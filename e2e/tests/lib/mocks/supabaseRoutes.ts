import type { Page, Route } from "@playwright/test";
import { SUPABASE } from "@web-memo/shared/constants";
import { createMockMemo } from "./mockData";

interface MockMemo {
	id: number;
	user_id: string;
	url: string;
	title: string;
	memo: string;
	favIconUrl: string | null;
	isWish: boolean | null;
	isStar: boolean | null;
	isReading: boolean | null;
	impression: string | null;
	actionItem: string | null;
	category_id: number | null;
	created_at: string | null;
	updated_at: string | null;
}

interface MockCategory {
	id: number;
	user_id: string | null;
	name: string;
	color: string | null;
	memo_count: number | null;
	created_at: string;
}

interface MockSetting {
	id: number;
	user_id: string | null;
	show_impression: boolean;
	show_action_item: boolean;
}

interface MockHighlight {
	id: number;
	user_id: string;
	url: string;
	title: string | null;
	favIconUrl: string | null;
	exact_text: string;
	note: string | null;
	color: string;
	prefix_text: string | null;
	suffix_text: string | null;
	text_position_start: number | null;
	created_at: string;
	updated_at: string;
}

export class MockSupabaseStore {
	private memos: Map<number, MockMemo> = new Map();
	private highlights: Map<number, MockHighlight> = new Map();
	private categories: Map<number, MockCategory> = new Map();
	private setting: MockSetting | null = null;

	addCategory(category: MockCategory) {
		this.categories.set(category.id, category);
		return category;
	}

	getAllCategories() {
		return Array.from(this.categories.values());
	}

	/** null이면 설정 행이 아직 없는 신규 사용자를 뜻한다. */
	setSetting(setting: MockSetting | null) {
		this.setting = setting;
		return setting;
	}

	getSetting() {
		return this.setting;
	}

	addMemo(memo: MockMemo) {
		this.memos.set(memo.id, memo);
		return memo;
	}

	getMemo(id: number) {
		return this.memos.get(id);
	}

	getMemoByUrl(url: string) {
		return Array.from(this.memos.values()).find((m) => m.url === url);
	}

	getAllMemos() {
		return Array.from(this.memos.values());
	}

	updateMemo(id: number, updates: Partial<MockMemo>) {
		const memo = this.memos.get(id);
		if (memo) {
			const updated = {
				...memo,
				...updates,
				updated_at: new Date().toISOString(),
			};
			this.memos.set(id, updated);
			return updated;
		}
		return null;
	}

	deleteMemo(id: number) {
		const memo = this.memos.get(id);
		this.memos.delete(id);
		return memo;
	}

	addHighlight(highlight: MockHighlight) {
		this.highlights.set(highlight.id, highlight);
		return highlight;
	}

	getAllHighlights() {
		return Array.from(this.highlights.values());
	}

	updateHighlight(id: number, updates: Partial<MockHighlight>) {
		const highlight = this.highlights.get(id);
		if (highlight) {
			const updated = {
				...highlight,
				...updates,
				updated_at: new Date().toISOString(),
			};
			this.highlights.set(id, updated);
			return updated;
		}
		return null;
	}

	clear() {
		this.memos.clear();
		this.highlights.clear();
		this.categories.clear();
		this.setting = null;
	}
}

function parseIdFromUrl(url: URL): number | null {
	const idParam = url.searchParams.get("id");
	if (!idParam) return null;
	return Number.parseInt(idParam.replace("eq.", ""), 10);
}

async function handleGet(route: Route, store: MockSupabaseStore) {
	const memos = store.getAllMemos();
	await route.fulfill({
		status: 200,
		contentType: "application/json",
		body: JSON.stringify(memos),
	});
}

async function handlePost(route: Route, store: MockSupabaseStore) {
	const request = route.request();
	const body = request.postDataJSON();
	const newMemo = createMockMemo(body);
	store.addMemo(newMemo);

	await route.fulfill({
		status: 201,
		contentType: "application/json",
		body: JSON.stringify([newMemo]),
	});
}

async function handlePatch(route: Route, url: URL, store: MockSupabaseStore) {
	const request = route.request();
	const body = request.postDataJSON();
	const id = parseIdFromUrl(url);

	if (id) {
		const updated = store.updateMemo(id, body);
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify(updated ? [updated] : []),
		});
	} else {
		await route.continue();
	}
}

async function handleDelete(route: Route, url: URL, store: MockSupabaseStore) {
	const id = parseIdFromUrl(url);

	if (id) {
		const deleted = store.deleteMemo(id);
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify(deleted ? [deleted] : []),
		});
	} else {
		await route.continue();
	}
}

/**
 * PostgREST의 `or=(exact_text.ilike.%q%,note.ilike.%q%)` 파라미터에서 검색어를 꺼낸다.
 * 커서용 `or=(created_at.lt...)`는 검색어가 아니므로 undefined를 돌려준다.
 */
function extractSearchQuery(url: URL): string | undefined {
	const matched = url.searchParams
		.getAll("or")
		.map((value) => value.match(/exact_text\.ilike\.%(.*?)%/))
		.find(Boolean);

	return matched?.[1] ? decodeURIComponent(matched[1]) : undefined;
}

async function handleHighlightGet(
	route: Route,
	url: URL,
	store: MockSupabaseStore,
) {
	const colorParam = url.searchParams.get("color");
	const color = colorParam?.startsWith("eq.") ? colorParam.slice(3) : undefined;
	const searchQuery = extractSearchQuery(url)?.toLowerCase();

	const highlights = store.getAllHighlights().filter((highlight) => {
		if (color && highlight.color !== color) {
			return false;
		}
		if (
			searchQuery &&
			!highlight.exact_text.toLowerCase().includes(searchQuery) &&
			!(highlight.note ?? "").toLowerCase().includes(searchQuery)
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

async function handleHighlightPatch(
	route: Route,
	url: URL,
	store: MockSupabaseStore,
) {
	const request = route.request();
	const body = request.postDataJSON();
	const id = parseIdFromUrl(url);

	if (id) {
		const updated = store.updateHighlight(id, body);
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify(updated ? [updated] : []),
		});
	} else {
		await route.continue();
	}
}

async function handleCategoryGet(route: Route, store: MockSupabaseStore) {
	await route.fulfill({
		status: 200,
		contentType: "application/json",
		body: JSON.stringify(store.getAllCategories()),
	});
}

/**
 * SettingService.getSetting은 GET + maybeSingle이라 postgrest-js가 배열 응답을 기대한다.
 * 설정 행이 없으면 빈 배열을 돌려줘야 useSettingQuery의 `?? false` 기본값 경로를 탄다.
 */
async function handleSettingGet(route: Route, store: MockSupabaseStore) {
	const setting = store.getSetting();
	await route.fulfill({
		status: 200,
		contentType: "application/json",
		body: JSON.stringify(setting ? [setting] : []),
	});
}

/** upsertSetting은 POST + single이라 배열이 아닌 객체 하나를 돌려줘야 한다. */
async function handleSettingUpsert(route: Route, store: MockSupabaseStore) {
	const body = route.request().postDataJSON();
	const patch = Array.isArray(body) ? body[0] : body;
	const updated = {
		id: 1,
		user_id: "test-user-id",
		show_impression: false,
		show_action_item: false,
		...store.getSetting(),
		...patch,
	};
	store.setSetting(updated);

	await route.fulfill({
		status: 200,
		contentType: "application/json",
		body: JSON.stringify(updated),
	});
}

export async function setupSupabaseMocks(page: Page, store: MockSupabaseStore) {
	await page.route(
		`${SUPABASE.url}/rest/v1/category**`,
		async (route: Route) => {
			if (route.request().method() === "GET") {
				await handleCategoryGet(route, store);
				return;
			}
			await route.continue();
		},
	);

	await page.route(
		`${SUPABASE.url}/rest/v1/setting**`,
		async (route: Route) => {
			const method = route.request().method();

			switch (method) {
				case "GET":
					await handleSettingGet(route, store);
					break;
				case "POST":
				case "PATCH":
					await handleSettingUpsert(route, store);
					break;
				default:
					await route.continue();
			}
		},
	);

	await page.route(`${SUPABASE.url}/rest/v1/memo**`, async (route: Route) => {
		const request = route.request();
		const method = request.method();
		const url = new URL(request.url());

		switch (method) {
			case "GET":
				await handleGet(route, store);
				break;
			case "POST":
				await handlePost(route, store);
				break;
			case "PATCH":
				await handlePatch(route, url, store);
				break;
			case "DELETE":
				await handleDelete(route, url, store);
				break;
			default:
				await route.continue();
		}
	});

	await page.route(
		`${SUPABASE.url}/rest/v1/highlight**`,
		async (route: Route) => {
			const request = route.request();
			const method = request.method();
			const url = new URL(request.url());

			switch (method) {
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
