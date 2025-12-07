import type { Page, Route } from "@playwright/test";
import { createMockMemo } from "./mockData";

interface MockMemo {
	id: number;
	user_id: string;
	url: string;
	title: string;
	memo: string;
	favIconUrl: string | null;
	isWish: boolean | null;
	category_id: number | null;
	created_at: string | null;
	updated_at: string | null;
}

export class MockSupabaseStore {
	private memos: Map<number, MockMemo> = new Map();

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

	clear() {
		this.memos.clear();
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

export async function setupSupabaseMocks(page: Page, store: MockSupabaseStore) {
	await page.route("**/rest/v1/memo**", async (route: Route) => {
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
}
