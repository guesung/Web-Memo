import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@web-memo/env", () => ({ CONFIG: {} }));

import {
	enqueueOfflineMemo,
	flushOfflineMemoQueue,
	getPendingOfflineMemos,
	hasPendingOfflineMemo,
	type IFOfflineMemoQueueItem,
	removeOfflineMemo,
	type TOfflineMemoQueueService,
} from "./offlineMemoQueue";

let storage: Record<string, unknown> = {};

beforeEach(() => {
	storage = {};
	vi.stubGlobal("chrome", {
		storage: {
			local: {
				get: async (key: string) => ({ [key]: storage[key] }),
				set: async (values: Record<string, unknown>) => {
					storage = { ...storage, ...values };
				},
			},
		},
	});
});

afterEach(() => {
	vi.unstubAllGlobals();
});

const createItem = (
	overrides: Partial<IFOfflineMemoQueueItem> = {},
): IFOfflineMemoQueueItem => ({
	userId: "user-1",
	url: "https://example.com/a",
	baseUpdatedAt: "2026-01-01T00:00:00.000Z",
	data: {
		title: "제목",
		memo: "본문",
		impression: "",
		actionItem: "",
		tabInfo: { title: "탭 제목", url: "https://example.com/a" },
	},
	queuedAt: 1,
	...overrides,
});

describe("enqueueOfflineMemo · getPendingOfflineMemos · removeOfflineMemo", () => {
	it("넣은 항목을 그대로 읽는다", async () => {
		const item = createItem();
		await enqueueOfflineMemo(item);

		expect(await getPendingOfflineMemos()).toEqual([item]);
	});

	it("같은 memoId의 이전 스냅샷은 지우고 최신 것만 남긴다", async () => {
		await enqueueOfflineMemo(createItem({ memoId: 1, data: { ...createItem().data, memo: "옛 내용" } }));
		await enqueueOfflineMemo(createItem({ memoId: 1, data: { ...createItem().data, memo: "새 내용" } }));

		const pending = await getPendingOfflineMemos();
		expect(pending).toHaveLength(1);
		expect(pending[0].data.memo).toBe("새 내용");
	});

	it("memoId가 없으면 url로 같은 항목을 구분한다", async () => {
		await enqueueOfflineMemo(createItem({ url: "https://example.com/a" }));
		await enqueueOfflineMemo(createItem({ url: "https://example.com/b" }));

		expect(await getPendingOfflineMemos()).toHaveLength(2);
	});

	it("항목을 지운다", async () => {
		const item = createItem({ memoId: 1 });
		await enqueueOfflineMemo(item);
		await removeOfflineMemo(item);

		expect(await getPendingOfflineMemos()).toEqual([]);
	});

	it("대기 여부를 memoId 또는 url로 확인한다", async () => {
		await enqueueOfflineMemo(createItem({ url: "https://example.com/a" }));

		expect(
			await hasPendingOfflineMemo({ url: "https://example.com/a" }),
		).toBe(true);
		expect(
			await hasPendingOfflineMemo({ url: "https://example.com/other" }),
		).toBe(false);
	});
});

describe("flushOfflineMemoQueue", () => {
	const buildMemoService = (
		overrides: Partial<TOfflineMemoQueueService> = {},
	): TOfflineMemoQueueService => ({
		getMemoById: vi.fn(async () => ({ data: [], error: null })),
		insertMemo: vi.fn(async () => ({ data: [{ id: 100 }], error: null })),
		updateMemo: vi.fn(async () => ({ data: [{ id: 1 }], error: null })),
		...overrides,
	});

	it("memoId가 없으면 insert하고 대기열에서 지운다", async () => {
		await enqueueOfflineMemo(createItem());
		const memoService = buildMemoService();

		const result = await flushOfflineMemoQueue({
			userId: "user-1",
			memoService,
		});

		expect(memoService.insertMemo).toHaveBeenCalledTimes(1);
		expect(result.conflicts).toEqual([]);
		expect(await getPendingOfflineMemos()).toEqual([]);
	});

	it("서버 updated_at이 baseUpdatedAt과 같으면 update한다", async () => {
		await enqueueOfflineMemo(
			createItem({ memoId: 1, baseUpdatedAt: "2026-01-01T00:00:00.000Z" }),
		);
		const memoService = buildMemoService({
			getMemoById: vi.fn(async () => ({
				data: [{ id: 1, updated_at: "2026-01-01T00:00:00.000Z" }],
				error: null,
			})),
		});

		const result = await flushOfflineMemoQueue({
			userId: "user-1",
			memoService,
		});

		expect(memoService.updateMemo).toHaveBeenCalledTimes(1);
		expect(memoService.insertMemo).not.toHaveBeenCalled();
		expect(result.conflicts).toEqual([]);
		expect(await getPendingOfflineMemos()).toEqual([]);
	});

	it("서버 updated_at이 다르면 insert하고 충돌로 알린다", async () => {
		await enqueueOfflineMemo(
			createItem({ memoId: 1, baseUpdatedAt: "2026-01-01T00:00:00.000Z" }),
		);
		const memoService = buildMemoService({
			getMemoById: vi.fn(async () => ({
				data: [{ id: 1, updated_at: "2026-02-02T00:00:00.000Z" }],
				error: null,
			})),
			insertMemo: vi.fn(async () => ({ data: [{ id: 2 }], error: null })),
		});

		const result = await flushOfflineMemoQueue({
			userId: "user-1",
			memoService,
		});

		expect(memoService.insertMemo).toHaveBeenCalledTimes(1);
		expect(result.conflicts).toEqual([
			{ oldMemoId: 1, newMemoId: 2, url: "https://example.com/a" },
		]);
		expect(await getPendingOfflineMemos()).toEqual([]);
	});

	it("서버에서 메모가 삭제됐으면(조회 결과 없음) insert하고 충돌로 알린다", async () => {
		await enqueueOfflineMemo(createItem({ memoId: 1 }));
		const memoService = buildMemoService({
			getMemoById: vi.fn(async () => ({ data: [], error: null })),
			insertMemo: vi.fn(async () => ({ data: [{ id: 2 }], error: null })),
		});

		const result = await flushOfflineMemoQueue({
			userId: "user-1",
			memoService,
		});

		expect(result.conflicts).toEqual([
			{ oldMemoId: 1, newMemoId: 2, url: "https://example.com/a" },
		]);
	});

	it("다른 사용자의 항목은 건드리지 않고 남긴다", async () => {
		const otherUserItem = createItem({ userId: "user-2" });
		await enqueueOfflineMemo(otherUserItem);
		const memoService = buildMemoService();

		await flushOfflineMemoQueue({ userId: "user-1", memoService });

		expect(memoService.insertMemo).not.toHaveBeenCalled();
		expect(await getPendingOfflineMemos()).toEqual([otherUserItem]);
	});

	it("네트워크 오류를 만나면 중단하고 대기열을 그대로 둔다", async () => {
		await enqueueOfflineMemo(createItem({ url: "https://example.com/a" }));
		await enqueueOfflineMemo(createItem({ url: "https://example.com/b" }));
		const memoService = buildMemoService({
			insertMemo: vi.fn(async () => {
				throw new TypeError("Failed to fetch");
			}),
		});

		const result = await flushOfflineMemoQueue({
			userId: "user-1",
			memoService,
		});

		expect(result.hasNetworkError).toBe(true);
		expect(memoService.insertMemo).toHaveBeenCalledTimes(1);
		expect(await getPendingOfflineMemos()).toHaveLength(2);
	});

	it("네트워크 오류가 아니면 그 항목만 남기고 다음 항목을 계속 반영한다", async () => {
		await enqueueOfflineMemo(createItem({ url: "https://example.com/a" }));
		await enqueueOfflineMemo(createItem({ url: "https://example.com/b" }));
		let callCount = 0;
		const memoService = buildMemoService({
			insertMemo: vi.fn(async () => {
				callCount += 1;
				if (callCount === 1) {
					throw new Error("서버 오류");
				}
				return { data: [{ id: 100 }], error: null };
			}),
		});

		const result = await flushOfflineMemoQueue({
			userId: "user-1",
			memoService,
		});

		expect(result.hasOtherError).toBe(true);
		expect(memoService.insertMemo).toHaveBeenCalledTimes(2);
		const pending = await getPendingOfflineMemos();
		expect(pending).toHaveLength(1);
		expect(pending[0].url).toBe("https://example.com/a");
	});
});
