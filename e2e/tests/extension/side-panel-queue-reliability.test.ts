import type { Page } from "@playwright/test";
import { SUPABASE } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures/extension";
import { findSidePanelPage, login, openSidePanel, skipGuide } from "../lib";
import {
	createMockMemo,
	MockSupabaseStore,
	setupSupabaseMocks,
} from "../lib/mocks";

interface QueuedMemo {
	userId: string;
	memoId?: number;
	url: string;
	revision?: string;
	data: { memo: string };
}

const readQueue = (panel: Page): Promise<QueuedMemo[]> =>
	panel.evaluate(async () => {
		const stored = await chrome.storage.local.get("offlineMemoQueue");
		return stored.offlineMemoQueue ?? [];
	});

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

test("두 확장 컨텍스트의 동기화 중 새 입력을 보존하고 같은 revision을 중복 전송하지 않는다", async ({
	page,
	context,
}) => {
	const url = "https://example.com/queue-inflight-edit";
	const store = new MockSupabaseStore();
	const memo = store.addMemo(createMockMemo({ url, memo: "server draft" }));
	const panel = await preparePanel(page, url, store);
	const secondPanel = await context.newPage();
	await secondPanel.goto(panel.url());
	await page.bringToFront();
	await expect(secondPanel.locator("#memo-textarea")).toBeVisible();
	await expect(panel.locator("#memo-textarea")).toHaveValue("server draft");

	let releaseFirstWrite: () => void = () => {};
	const firstWriteGate = new Promise<void>((resolve) => {
		releaseFirstWrite = resolve;
	});
	const writes: string[] = [];
	await context.route(`${SUPABASE.url}/rest/v1/memo**`, async (route) => {
		if (route.request().method() === "PATCH") {
			const body = route.request().postDataJSON();
			writes.push(body.memo);
			if (writes.length === 1) {
				await firstWriteGate;
			}
		}
		await route.fallback();
	});

	try {
		await context.setOffline(true);
		await panel.locator("#memo-textarea").fill("revision A");
		await expect
			.poll(
				async () =>
					(await readQueue(panel)).find((item) => item.memoId === memo.id)?.data
						.memo,
			)
			.toBe("revision A");
		await context.setOffline(false);
		await expect.poll(() => writes).toEqual(["revision A"]);
		await expect
			.poll(() =>
				secondPanel.evaluate(async () => {
					const locks = await navigator.locks.query();
					const isFlushLock = (lock: LockInfo) =>
						lock.name?.startsWith("web-memo:offline-memo-queue:flush:");
					return {
						held: locks.held?.some(isFlushLock),
						waiting: locks.pending?.some(isFlushLock),
					};
				}),
			)
			.toEqual({ held: true, waiting: true });

		await panel.locator("#memo-textarea").fill("revision B");
		await expect
			.poll(
				async () =>
					(await readQueue(panel)).find((item) => item.memoId === memo.id)?.data
						.memo,
			)
			.toBe("revision B");
		releaseFirstWrite();

		await expect.poll(() => store.getMemo(memo.id)?.memo).toBe("revision B");
		await expect.poll(() => readQueue(panel)).toEqual([]);
		await expect.poll(() => readQueue(secondPanel)).toEqual([]);
		await expect
			.poll(() =>
				secondPanel.evaluate(async () => {
					const locks = await navigator.locks.query();
					return [...(locks.held ?? []), ...(locks.pending ?? [])].some(
						(lock) =>
							lock.name?.startsWith("web-memo:offline-memo-queue:flush:"),
					);
				}),
			)
			.toBe(false);
		await expect(panel.locator("#memo-textarea")).toHaveValue("revision B");
		await expect(panel.locator('[data-save-status="saved"]')).toBeVisible();
		expect(writes).toEqual(["revision A", "revision B"]);
		expect(store.getAllMemos()).toHaveLength(1);
	} finally {
		releaseFirstWrite();
		await secondPanel.close();
	}
});

test("다른 계정의 같은 URL 초안은 복원하거나 덮어쓰지 않는다", async ({
	page,
}) => {
	const url = "https://example.com/queue-user-isolation";
	const store = new MockSupabaseStore();
	const memo = store.addMemo(createMockMemo({ url, memo: "server draft" }));
	const panel = await preparePanel(page, url, store);
	await panel.evaluate(
		async ({ memoId, targetUrl }) => {
			await chrome.storage.local.set({
				offlineMemoQueue: [
					{
						userId: "another-queue-user",
						memoId,
						url: targetUrl,
						queuedAt: Date.now(),
						revision: "foreign-revision",
						data: {
							title: "foreign title",
							memo: "foreign draft",
							impression: "",
							actionItem: "",
							tabInfo: { title: "foreign title", url: targetUrl },
						},
					},
				],
			});
		},
		{ memoId: memo.id, targetUrl: url },
	);
	await panel.reload();
	await expect(panel.locator("#memo-textarea")).toHaveValue("server draft");
	await panel.locator("#memo-textarea").fill("current user draft");
	await expect
		.poll(() => store.getMemo(memo.id)?.memo)
		.toBe("current user draft");
	await expect(panel.locator('[data-save-status="saved"]')).toBeVisible();
	const queue = await readQueue(panel);
	expect(queue).toHaveLength(1);
	expect(queue[0].userId).toBe("another-queue-user");
	expect(queue[0].data.memo).toBe("foreign draft");
});

test("로컬 큐 쓰기 실패는 기존 실패 표시로 끝나고 재시도하면 입력을 보관한다", async ({
	page,
	context,
}) => {
	const url = "https://example.com/queue-storage-failure";
	const store = new MockSupabaseStore();
	store.addMemo(createMockMemo({ url, memo: "server draft" }));
	const panel = await preparePanel(page, url, store);
	await panel.evaluate(() => {
		const originalSet = chrome.storage.local.set.bind(chrome.storage.local);
		sessionStorage.setItem("queue-write-failure", "true");
		Object.defineProperty(chrome.storage.local, "set", {
			configurable: true,
			value: async (values: Record<string, unknown>) => {
				if (
					"offlineMemoQueue" in values &&
					sessionStorage.getItem("queue-write-failure")
				) {
					throw new Error("injected queue write failure");
				}
				return originalSet(values);
			},
		});
	});
	await context.setOffline(true);
	await panel.locator("#memo-textarea").fill("recover this draft");
	const failure = panel.locator('[data-save-status="failed"]');
	await expect(failure).toBeVisible();
	await expect(panel.locator("#memo-textarea")).toHaveValue(
		"recover this draft",
	);
	expect(await readQueue(panel)).toEqual([]);
	await panel.evaluate(() => sessionStorage.removeItem("queue-write-failure"));
	await failure.getByRole("button", { name: /retry|다시 시도/i }).click();
	await expect
		.poll(async () => (await readQueue(panel))[0]?.data.memo)
		.toBe("recover this draft");
	await expect(panel.locator('[data-save-status="offline"]')).toBeVisible();
});

test("신규 초안 전송 중 재입력하면 반환 ID로 한 번 수정하고 복구 수치를 기록한다", async ({
	page,
	context,
}) => {
	const url = "https://example.com/queue-new-inflight-edit";
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
	const writes: string[] = [];
	await context.route(`${SUPABASE.url}/rest/v1/memo**`, async (route) => {
		const method = route.request().method();
		if (method === "POST" || method === "PATCH") {
			writes.push(`${method}:${route.request().postDataJSON().memo}`);
			if (method === "POST") await insertGate;
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
		await expect.poll(() => writes).toEqual(["POST:new revision A"]);
		await panel.locator("#memo-textarea").fill("new revision B");
		await expect
			.poll(async () => (await readQueue(panel))[0]?.data.memo)
			.toBe("new revision B");
		releaseInsert();
		await expect
			.poll(() => store.getMemoByUrl(url)?.memo)
			.toBe("new revision B");
		await expect.poll(() => readQueue(panel)).toEqual([]);
		expect(writes).toEqual(["POST:new revision A", "PATCH:new revision B"]);
		expect(store.getAllMemos()).toHaveLength(1);
		await expect
			.poll(() => results.find((result) => result.attempted_count === 2))
			.toMatchObject({
				queue_contract_version: 2,
				synced_count: 1,
				conflict_count: 0,
				network_error_count: 0,
				other_error_count: 0,
				remaining_count: 0,
				ack_latency_count: 1,
			});
	} finally {
		releaseInsert();
	}
});
