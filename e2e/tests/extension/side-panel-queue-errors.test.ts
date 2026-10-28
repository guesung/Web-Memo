import type { Page } from "@playwright/test";
import { SUPABASE } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures/extension";
import { findSidePanelPage, login, openSidePanel, skipGuide } from "../lib";
import {
	createMockMemo,
	MockSupabaseStore,
	setupSupabaseMocks,
} from "../lib/mocks";

type QueueItem = {
	userId: string;
	memoId?: number;
	revision?: string;
	data: { memo: string };
};
const readQueue = (panel: Page): Promise<QueueItem[]> =>
	panel.evaluate(
		async () =>
			(await chrome.storage.local.get("offlineMemoQueue")).offlineMemoQueue ??
			[],
	);
const preparePanel = async (
	page: Page,
	url: string,
	store: MockSupabaseStore,
	initialMemo = "server draft",
) => {
	await setupSupabaseMocks(page, store);
	await login(page);
	await skipGuide(page);
	await openSidePanel(page);
	const panel = await findSidePanelPage(page);
	await page.goto(url);
	await expect(panel.locator("#memo-textarea")).toHaveValue(initialMemo);
	return panel;
};
const enqueueOffline = async (panel: Page, memoId: number, text: string) => {
	await panel.locator("#memo-textarea").fill(text);
	await expect
		.poll(
			async () =>
				(await readQueue(panel)).find((item) => item.memoId === memoId)?.data
					.memo,
		)
		.toBe(text);
};

test("큐 조회 중 편집은 유지되고 조회 전 온라인 저장하지 않는다", async ({
	page,
	context,
}) => {
	const url = "https://example.com/queue-lookup-delay";
	const store = new MockSupabaseStore();
	store.addMemo(createMockMemo({ url, memo: "server draft" }));
	const panel = await preparePanel(page, url, store);
	let writes = 0;
	await context.route(`${SUPABASE.url}/rest/v1/memo**`, async (route) => {
		if (route.request().method() !== "GET") writes++;
		await route.fallback();
	});
	await panel.evaluate(() => {
		const originalGet = chrome.storage.local.get.bind(chrome.storage.local);
		let release: (() => void) | undefined;
		let blocked = true;
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		(
			window as Window & { releaseQueueLookup?: () => void }
		).releaseQueueLookup = () => {
			blocked = false;
			release?.();
		};
		Object.defineProperty(chrome.storage.local, "get", {
			configurable: true,
			value: async (...args: Parameters<typeof chrome.storage.local.get>) => {
				if (args[0] === "offlineMemoQueue" && blocked) await gate;
				return originalGet(...args);
			},
		});
		void chrome.storage.local.set({ offlineMemoQueue: [] });
	});
	try {
		await expect(panel.locator('[data-save-status="slow"]')).toBeVisible();
		await panel.clock.install();
		await panel.locator("#memo-textarea").fill("edited while lookup waits");
		await panel.clock.runFor(350);
		await expect(panel.locator("#memo-textarea")).toHaveValue(
			"edited while lookup waits",
		);
		expect(writes).toBe(0);
		await panel.evaluate(() =>
			(
				window as Window & { releaseQueueLookup?: () => void }
			).releaseQueueLookup?.(),
		);
		await expect
			.poll(() => store.getMemoByUrl(url)?.memo)
			.toBe("edited while lookup waits");
		expect(writes).toBe(1);
	} finally {
		await panel.evaluate(() =>
			(
				window as Window & { releaseQueueLookup?: () => void }
			).releaseQueueLookup?.(),
		);
	}
});

test("손상된 큐 원본은 덮어쓰지 않고 실패를 표시하며 복구 후 재시도한다", async ({
	page,
}) => {
	const url = "https://example.com/queue-corrupt-raw";
	const store = new MockSupabaseStore();
	const memo = store.addMemo(createMockMemo({ url, memo: "server draft" }));
	const panel = await preparePanel(page, url, store);
	const corrupt = { unexpected: "keep original raw" };
	await panel.evaluate(async (raw) => {
		await chrome.storage.local.set({ offlineMemoQueue: raw });
	}, corrupt);
	await expect(panel.locator('[data-save-status="failed"]')).toBeVisible();
	await panel.locator("#memo-textarea").fill("draft while queue is corrupt");
	await expect(panel.locator('[data-save-status="failed"]')).toBeVisible();
	expect(store.getMemo(memo.id)?.memo).toBe("server draft");
	expect(
		await panel.evaluate(
			async () =>
				(await chrome.storage.local.get("offlineMemoQueue")).offlineMemoQueue,
		),
	).toEqual(corrupt);
	await panel.evaluate(async () => {
		const originalGet = chrome.storage.local.get.bind(chrome.storage.local);
		Object.defineProperty(chrome.storage.local, "get", {
			configurable: true,
			value: async (...args: Parameters<typeof chrome.storage.local.get>) => {
				if (
					args[0] === "offlineMemoQueue" &&
					sessionStorage.getItem("hold-queue-read")
				)
					throw new Error("hold queue lookup until retry");
				return originalGet(...args);
			},
		});
		sessionStorage.setItem("hold-queue-read", "true");
		await chrome.storage.local.set({ offlineMemoQueue: [] });
	});
	await panel.evaluate(() => sessionStorage.removeItem("hold-queue-read"));
	await panel
		.locator('[data-save-status="failed"]')
		.getByRole("button", { name: /retry|다시 시도/i })
		.click();
	await expect
		.poll(() => store.getMemo(memo.id)?.memo)
		.toBe("draft while queue is corrupt");
});

test("큐 읽기 실패는 원본을 보존하고 재시도로 현재 입력을 저장한다", async ({
	page,
}) => {
	const url = "https://example.com/queue-read-failure";
	const store = new MockSupabaseStore();
	const memo = store.addMemo(createMockMemo({ url, memo: "server draft" }));
	const panel = await preparePanel(page, url, store);
	await panel.evaluate(() => {
		const originalGet = chrome.storage.local.get.bind(chrome.storage.local);
		Object.defineProperty(chrome.storage.local, "get", {
			configurable: true,
			value: async (...args: Parameters<typeof chrome.storage.local.get>) => {
				if (
					args[0] === "offlineMemoQueue" &&
					sessionStorage.getItem("fail-queue-read")
				)
					throw new Error("injected queue read failure");
				return originalGet(...args);
			},
		});
		sessionStorage.setItem("fail-queue-read", "true");
		void chrome.storage.local.set({ offlineMemoQueue: [] });
	});
	await panel.locator("#memo-textarea").fill("draft after read failure");
	await expect(panel.locator('[data-save-status="failed"]')).toBeVisible();
	expect(store.getMemo(memo.id)?.memo).toBe("server draft");
	await panel.evaluate(() => sessionStorage.removeItem("fail-queue-read"));
	expect(await readQueue(panel)).toEqual([]);
	await panel
		.locator('[data-save-status="failed"]')
		.getByRole("button", { name: /retry|다시 시도/i })
		.click();
	await expect
		.poll(() => store.getMemo(memo.id)?.memo)
		.toBe("draft after read failure");
	await expect(panel.locator('[data-save-status="saved"]')).toBeVisible();
});

test("네트워크 실패 후 revision과 결과 수치가 남고 재연결 때 복구한다", async ({
	page,
	context,
}) => {
	const url = "https://example.com/queue-network-failure";
	const store = new MockSupabaseStore();
	const memo = store.addMemo(createMockMemo({ url, memo: "server draft" }));
	const panel = await preparePanel(page, url, store);
	const results: Record<string, unknown>[] = [];
	panel.on("console", async (message) => {
		if (message.text().startsWith("[analytics] memo_offline_sync_result"))
			results.push(await message.args()[1].jsonValue());
	});
	await context.setOffline(true);
	await enqueueOffline(panel, memo.id, "offline network draft");
	let writes = 0;
	let abortWrites = true;
	await context.route(`${SUPABASE.url}/rest/v1/memo**`, async (route) => {
		if (route.request().method() === "PATCH") {
			writes++;
			if (abortWrites) return route.abort("internetdisconnected");
		}
		await route.fallback();
	});
	await context.setOffline(false);
	await expect
		.poll(() => results.find((result) => result.network_error_count === 1))
		.toMatchObject({
			attempted_count: 1,
			network_error_count: 1,
			remaining_count: 1,
		});
	await panel.clock.install();
	await panel.clock.runFor(1000);
	expect(writes).toBe(1);
	const failedQueue = await readQueue(panel);
	expect(failedQueue).toHaveLength(1);
	expect(failedQueue[0].data.memo).toBe("offline network draft");
	abortWrites = false;
	await context.setOffline(true);
	await context.setOffline(false);
	await expect
		.poll(() => store.getMemo(memo.id)?.memo)
		.toBe("offline network draft");
	await expect.poll(() => readQueue(panel)).toEqual([]);
	expect(writes).toBe(2);
});

test("서버 반환 행이 없으면 revision을 ACK하지 않고 실패로 표시한다", async ({
	page,
	context,
}) => {
	const url = "https://example.com/queue-missing-row";
	const store = new MockSupabaseStore();
	const memo = store.addMemo(createMockMemo({ url, memo: "server draft" }));
	const panel = await preparePanel(page, url, store);
	const results: Record<string, unknown>[] = [];
	panel.on("console", async (message) => {
		if (message.text().startsWith("[analytics] memo_offline_sync_result")) {
			results.push(await message.args()[1].jsonValue());
		}
	});
	await context.setOffline(true);
	await enqueueOffline(panel, memo.id, "unacknowledged draft");
	const before = await readQueue(panel);
	await context.route(`${SUPABASE.url}/rest/v1/memo**`, async (route) => {
		if (route.request().method() === "PATCH")
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: "[]",
			});
		await route.fallback();
	});
	await context.setOffline(false);
	await expect(panel.locator('[data-save-status="syncFailed"]')).toBeVisible();
	await expect
		.poll(() => results.find((result) => result.other_error_count === 1))
		.toMatchObject({
			attempted_count: 1,
			other_error_count: 1,
			synced_count: 0,
		});
	const after = await readQueue(panel);
	expect(after).toHaveLength(1);
	expect(after[0].revision).toBe(before[0].revision);
	expect(after[0].data.memo).toBe("unacknowledged draft");
	expect(store.getMemo(memo.id)?.memo).toBe("server draft");
});

test("레거시 보강 실패는 원본을 유지하고 재시도 때 revision을 부여한다", async ({
	page,
	context,
}) => {
	const url = "https://example.com/queue-legacy-migration";
	const store = new MockSupabaseStore();
	const memo = store.addMemo(createMockMemo({ url, memo: "server draft" }));
	const panel = await preparePanel(page, url, store);
	await context.setOffline(true);
	await enqueueOffline(panel, memo.id, "owner discovery");
	const ownerId = (await readQueue(panel))[0].userId;
	const legacy = await panel.evaluate(
		async ({ id, targetUrl, userId }) => {
			const originalSet = chrome.storage.local.set.bind(chrome.storage.local);
			const item = {
				userId,
				memoId: id,
				url: targetUrl,
				baseUpdatedAt: "2020-01-01T00:00:00.000Z",
				queuedAt: Date.now(),
				data: {
					title: "legacy title",
					memo: "legacy draft",
					impression: "",
					actionItem: "",
					tabInfo: { title: "legacy title", url: targetUrl },
				},
			};
			Object.defineProperty(chrome.storage.local, "set", {
				configurable: true,
				value: async (values: Record<string, unknown>) => {
					if (
						"offlineMemoQueue" in values &&
						sessionStorage.getItem("fail-migration")
					)
						throw new Error("injected legacy migration write failure");
					return originalSet(values);
				},
			});
			sessionStorage.setItem("fail-migration", "true");
			await originalSet({ offlineMemoQueue: [item] });
			return item;
		},
		{ id: memo.id, targetUrl: url, userId: ownerId },
	);
	await expect(panel.locator('[data-save-status="failed"]')).toBeVisible();
	expect(await readQueue(panel)).toEqual([legacy]);
	await panel.evaluate(() => sessionStorage.removeItem("fail-migration"));
	await panel.evaluate(async (item) => {
		await chrome.storage.local.set({
			offlineMemoQueue: [{ ...item, queuedAt: item.queuedAt + 1 }],
		});
	}, legacy);
	await expect
		.poll(async () => (await readQueue(panel))[0]?.revision)
		.toEqual(expect.any(String));
	expect((await readQueue(panel))[0].data.memo).toBe("legacy draft");
	await expect(panel.locator('[data-save-status="offline"]')).toBeVisible();
});

test("신규 A 응답 뒤 로컬 ACK 저장 실패는 최신 B 본문을 보존하고 오류로 집계한다", async ({
	page,
	context,
}) => {
	const url = "https://example.com/queue-ack-storage-failure";
	const store = new MockSupabaseStore();
	const panel = await preparePanel(page, url, store, "");
	const results: Record<string, unknown>[] = [];
	panel.on("console", async (message) => {
		if (message.text().startsWith("[analytics] memo_offline_sync_result")) {
			results.push(await message.args()[1].jsonValue());
		}
	});
	let releaseInsert: () => void = () => {};
	const insertGate = new Promise<void>((resolve) => {
		releaseInsert = resolve;
	});
	let inserts = 0;
	await context.route(`${SUPABASE.url}/rest/v1/memo**`, async (route) => {
		if (route.request().method() === "POST") {
			inserts++;
			await insertGate;
		}
		await route.fallback();
	});
	try {
		await context.setOffline(true);
		await panel.locator("#memo-textarea").fill("new revision A");
		await expect
			.poll(async () => (await readQueue(panel))[0]?.data.memo)
			.toBe("new revision A");
		await context.setOffline(false);
		await expect.poll(() => inserts).toBe(1);
		await panel.locator("#memo-textarea").fill("new revision B");
		await expect
			.poll(async () => (await readQueue(panel))[0]?.data.memo)
			.toBe("new revision B");
		await panel.evaluate(() => {
			const originalSet = chrome.storage.local.set.bind(chrome.storage.local);
			Object.defineProperty(chrome.storage.local, "set", {
				configurable: true,
				value: async (values: Record<string, unknown>) => {
					if ("offlineMemoQueue" in values)
						throw new Error("injected ACK storage failure");
					return originalSet(values);
				},
			});
		});
		releaseInsert();
		await expect(
			panel.locator('[data-save-status="syncFailed"]'),
		).toBeVisible();
		await expect
			.poll(() => results.find((result) => result.other_error_count === 1))
			.toMatchObject({
				attempted_count: 1,
				other_error_count: 1,
				synced_count: 0,
				conflict_count: 0,
			});
		expect((await readQueue(panel))[0].data.memo).toBe("new revision B");
		await expect(panel.locator('[data-save-status="saved"]')).toHaveCount(0);
	} finally {
		releaseInsert();
	}
});
