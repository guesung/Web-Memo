import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@web-memo/env", () => ({ CONFIG: {} }));
vi.mock("@web-memo/shared/modules/analytics", () => ({
	analytics: { trackMemoCreate: vi.fn() },
}));

import { analytics } from "@web-memo/shared/modules/analytics";

import {
	enqueueOfflineMemo,
	flushOfflineMemoQueue,
	getPendingOfflineMemo,
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
	vi.clearAllMocks();
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
	it("같은 URL의 기존 ID와 새 초안을 분리하고 다른 ID 조회를 막는다", async () => {
		await enqueueOfflineMemo(createItem({ memoId: 1 }));
		await enqueueOfflineMemo(
			createItem({
				memoId: undefined,
				data: { ...createItem().data, memo: "new" },
			}),
		);
		expect(await getPendingOfflineMemos()).toHaveLength(2);
		expect(
			(
				await getPendingOfflineMemo({
					userId: "user-1",
					memoId: 1,
					url: createItem().url,
				})
			)?.data.memo,
		).toBe("본문");
		expect(
			(await getPendingOfflineMemo({ userId: "user-1", url: createItem().url }))
				?.data.memo,
		).toBe("new");
		expect(
			await getPendingOfflineMemo({
				userId: "user-1",
				memoId: 2,
				url: createItem().url,
			}),
		).toBeUndefined();
	});

	it("잘못된 신규 입력은 저장하지 않는다", async () => {
		await expect(
			enqueueOfflineMemo({
				...createItem(),
				data: { ...createItem().data, memo: 1 as unknown as string },
			}),
		).rejects.toThrow("Invalid offline memo queue item");
		expect(storage.offlineMemoQueue).toBeUndefined();
	});
	it("같은 URL을 서로 다른 사용자에게 보존하고 사용자 범위로만 찾는다", async () => {
		await enqueueOfflineMemo(createItem({ userId: "a" }));
		await enqueueOfflineMemo(
			createItem({ userId: "b", data: { ...createItem().data, memo: "B" } }),
		);
		expect(
			(await getPendingOfflineMemos()).map(({ userId }) => userId),
		).toEqual(["a", "b"]);
		expect(
			(await getPendingOfflineMemo({ userId: "a", url: createItem().url }))
				?.data.memo,
		).toBe("본문");
	});

	it("동시 enqueue가 서로 다른 대상을 모두 보존한다", async () => {
		let release!: () => void;
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		const originalGet = chrome.storage.local.get;
		let reads = 0;
		chrome.storage.local.get = vi.fn(async () => {
			const snapshot = await originalGet("offlineMemoQueue");
			if (++reads <= 2) await gate;
			return snapshot;
		}) as unknown as typeof chrome.storage.local.get;
		const a = enqueueOfflineMemo(createItem({ url: "https://example.com/a" }));
		const b = enqueueOfflineMemo(createItem({ url: "https://example.com/b" }));
		await Promise.resolve();
		release();
		await Promise.all([a, b]);
		expect(await getPendingOfflineMemos()).toHaveLength(2);
	});

	it("읽기 실패 시 기존 큐를 덮어쓰지 않는다", async () => {
		await enqueueOfflineMemo(createItem());
		chrome.storage.local.get = vi.fn(async () => {
			throw new Error("read failed");
		});
		await expect(
			enqueueOfflineMemo(createItem({ url: "https://example.com/b" })),
		).rejects.toThrow("read failed");
		expect(storage.offlineMemoQueue).toHaveLength(1);
	});
	it("넣은 항목을 그대로 읽는다", async () => {
		const item = createItem();
		await enqueueOfflineMemo(item);

		expect(await getPendingOfflineMemos()).toEqual([
			expect.objectContaining({ ...item, revision: expect.any(String) }),
		]);
	});

	it("같은 memoId의 이전 스냅샷은 지우고 최신 것만 남긴다", async () => {
		await enqueueOfflineMemo(
			createItem({
				memoId: 1,
				data: { ...createItem().data, memo: "옛 내용" },
			}),
		);
		await enqueueOfflineMemo(
			createItem({
				memoId: 1,
				data: { ...createItem().data, memo: "새 내용" },
			}),
		);

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
		await removeOfflineMemo((await getPendingOfflineMemos())[0]);

		expect(await getPendingOfflineMemos()).toEqual([]);
	});

	it("대기 여부를 memoId 또는 url로 확인한다", async () => {
		await enqueueOfflineMemo(createItem({ url: "https://example.com/a" }));

		expect(
			await hasPendingOfflineMemo({
				userId: "user-1",
				url: "https://example.com/a",
			}),
		).toBe(true);
		expect(
			await hasPendingOfflineMemo({
				userId: "user-1",
				url: "https://example.com/other",
			}),
		).toBe(false);
	});
});

describe("flushOfflineMemoQueue", () => {
	it("A 뒤 재기준화된 B 전송 중 오래된 기준의 C가 와도 같은 ID를 업데이트한다", async () => {
		const base = "2026-01-01";
		await enqueueOfflineMemo(
			createItem({
				memoId: 1,
				baseUpdatedAt: base,
				data: { ...createItem().data, memo: "A" },
			}),
		);
		let releaseA!: () => void;
		const gateA = new Promise<void>((resolve) => {
			releaseA = resolve;
		});
		let startedA!: () => void;
		const startA = new Promise<void>((resolve) => {
			startedA = resolve;
		});
		let releaseB!: () => void;
		const gateB = new Promise<void>((resolve) => {
			releaseB = resolve;
		});
		let startedB!: () => void;
		const startB = new Promise<void>((resolve) => {
			startedB = resolve;
		});
		let serverUpdatedAt = base;
		const updateMemo = vi.fn(
			async ({ request }: { id: number; request: { memo?: string } }) => {
				if (request.memo === "A") {
					startedA();
					await gateA;
					serverUpdatedAt = "2026-01-02";
				}
				if (request.memo === "B") {
					startedB();
					await gateB;
					serverUpdatedAt = "2026-01-03";
				}
				if (request.memo === "C") serverUpdatedAt = "2026-01-04";
				return { data: [{ id: 1, updated_at: serverUpdatedAt }], error: null };
			},
		);
		const insertMemo = vi.fn(async () => ({
			data: [{ id: 2, updated_at: "2026-01-04" }],
			error: null,
		}));
		const service: TOfflineMemoQueueService = {
			getMemoById: vi.fn(async () => ({
				data: [
					{
						id: 1,
						updated_at: serverUpdatedAt,
						title: "old",
						memo: "old",
						impression: "",
						actionItem: "",
					},
				],
				error: null,
			})),
			insertMemo,
			updateMemo,
		};
		const flushing = flushOfflineMemoQueue({
			userId: "user-1",
			memoService: service,
		});
		await startA;
		await enqueueOfflineMemo(
			createItem({
				memoId: 1,
				baseUpdatedAt: base,
				data: { ...createItem().data, memo: "B" },
			}),
		);
		releaseA();
		await startB;
		await enqueueOfflineMemo(
			createItem({
				memoId: 1,
				baseUpdatedAt: base,
				data: { ...createItem().data, memo: "C" },
			}),
		);
		releaseB();
		const result = await flushing;
		expect(
			updateMemo.mock.calls.map(([params]) => params.request.memo),
		).toEqual(["A", "B", "C"]);
		expect(insertMemo).not.toHaveBeenCalled();
		expect(result.conflicts).toEqual([]);
		expect(await getPendingOfflineMemos()).toEqual([]);
	});

	it("충돌 복사 중 B와 뒤이은 원본 ID 편집을 새 ID에 연결한다", async () => {
		await enqueueOfflineMemo(createItem({ memoId: 1 }));
		let releaseInsert!: () => void;
		const gate = new Promise<void>((resolve) => {
			releaseInsert = resolve;
		});
		let insertStarted!: () => void;
		const started = new Promise<void>((resolve) => {
			insertStarted = resolve;
		});
		const firstService: TOfflineMemoQueueService = {
			getMemoById: vi.fn(async (id) =>
				id === 1
					? {
							data: [
								{
									id: 1,
									updated_at: "2026-02-01",
									title: "remote",
									memo: "remote",
									impression: "",
									actionItem: "",
								},
							],
							error: null,
						}
					: { data: null, error: new Error("temporary") },
			),
			insertMemo: vi.fn(async () => {
				insertStarted();
				await gate;
				return { data: [{ id: 2, updated_at: "2026-02-02" }], error: null };
			}),
			updateMemo: vi.fn(async () => ({
				data: [{ id: 2, updated_at: "2026-02-03" }],
				error: null,
			})),
		};
		const flushing = flushOfflineMemoQueue({
			userId: "user-1",
			memoService: firstService,
		});
		await started;
		await enqueueOfflineMemo(
			createItem({ memoId: 1, data: { ...createItem().data, memo: "B" } }),
		);
		releaseInsert();
		const result = await flushing;
		expect(result.conflicts).toEqual([
			{ oldMemoId: 1, newMemoId: 2, url: createItem().url },
		]);
		expect(result.syncedCount).toBe(0);
		expect(result.acknowledgedConflictCount).toBe(0);
		await enqueueOfflineMemo(
			createItem({ memoId: 1, data: { ...createItem().data, memo: "C" } }),
		);
		const pending = await getPendingOfflineMemos();
		expect(pending).toHaveLength(1);
		expect(pending[0]).toMatchObject({
			memoId: 2,
			originMemoId: 1,
			data: { memo: "C" },
		});
		const updateMemo = vi.fn(
			async (_params: { id: number; request: { memo?: string } }) => ({
				data: [{ id: 2, updated_at: "2026-02-03" }],
				error: null,
			}),
		);
		const retryResult = await flushOfflineMemoQueue({
			userId: "user-1",
			memoService: {
				getMemoById: vi.fn(async () => ({
					data: [
						{
							id: 2,
							updated_at: "2026-02-02",
							title: "old",
							memo: "B",
							impression: "",
							actionItem: "",
						},
					],
					error: null,
				})),
				insertMemo: vi.fn(async () => ({
					data: [{ id: 3, updated_at: "2026-02-03" }],
					error: null,
				})),
				updateMemo,
			},
		});
		expect(updateMemo.mock.calls[0]?.[0]).toMatchObject({
			id: 2,
			request: { memo: "C" },
		});
		expect(retryResult.syncedCount).toBe(1);
		expect(retryResult.acknowledgedConflictCount).toBe(1);
		expect(await getPendingOfflineMemos()).toEqual([]);
	});

	it("서버 성공 후 ACK 저장 실패는 pending을 보존하고 실패로 집계한다", async () => {
		await enqueueOfflineMemo(createItem());
		chrome.storage.local.set = vi.fn(async () => {
			throw new Error("set failed");
		});
		const memoService: TOfflineMemoQueueService = {
			getMemoById: vi.fn(async () => ({ data: [], error: null })),
			insertMemo: vi.fn(async () => ({
				data: [{ id: 100, updated_at: "2026-01-02" }],
				error: null,
			})),
			updateMemo: vi.fn(async () => ({
				data: [{ id: 100, updated_at: "2026-01-02" }],
				error: null,
			})),
		};
		const result = await flushOfflineMemoQueue({
			userId: "user-1",
			memoService,
		});
		expect(result).toMatchObject({
			attemptedCount: 1,
			syncedCount: 0,
			otherErrorCount: 1,
			hasOtherError: true,
			remainingCount: 1,
		});
		expect((await getPendingOfflineMemos())[0].data.memo).toBe("본문");
	});

	it("GET 중 인증 범위가 바뀌면 다음 write를 보내지 않는다", async () => {
		await enqueueOfflineMemo(createItem({ memoId: 1 }));
		let active = true;
		const updateMemo = vi.fn(async () => ({
			data: [{ id: 1, updated_at: "2026-01-02" }],
			error: null,
		}));
		const service: TOfflineMemoQueueService = {
			getMemoById: vi.fn(async () => {
				active = false;
				return {
					data: [
						{
							id: 1,
							updated_at: "2026-01-01T00:00:00.000Z",
							title: "old",
							memo: "old",
							impression: "",
							actionItem: "",
						},
					],
					error: null,
				};
			}),
			insertMemo: vi.fn(async () => ({
				data: [{ id: 2, updated_at: "2026-01-02" }],
				error: null,
			})),
			updateMemo,
		};
		const result = await flushOfflineMemoQueue({
			userId: "user-1",
			memoService: service,
			shouldContinue: () => active,
		});
		expect(updateMemo).not.toHaveBeenCalled();
		expect(result.attemptedCount).toBe(1);
		expect(result.syncedCount).toBe(0);
		expect(await getPendingOfflineMemos()).toHaveLength(1);
	});

	it("신규 insert 중 추가된 B를 반환 ID로 연결하고 URL 조회를 유지한다", async () => {
		await enqueueOfflineMemo(createItem());
		let releaseInsert!: () => void;
		const insertGate = new Promise<void>((resolve) => {
			releaseInsert = resolve;
		});
		let insertStarted!: () => void;
		const insertStartedPromise = new Promise<void>((resolve) => {
			insertStarted = resolve;
		});
		let releaseGet!: () => void;
		const getGate = new Promise<void>((resolve) => {
			releaseGet = resolve;
		});
		let getStarted!: () => void;
		const getStartedPromise = new Promise<void>((resolve) => {
			getStarted = resolve;
		});
		const updateMemo = vi.fn(
			async (_params: { id: number; request: { memo?: string } }) => ({
				data: [{ id: 100, updated_at: "2026-01-03" }],
				error: null,
			}),
		);
		const memoService: TOfflineMemoQueueService = {
			insertMemo: vi.fn(async () => {
				insertStarted();
				await insertGate;
				return { data: [{ id: 100, updated_at: "2026-01-02" }], error: null };
			}),
			getMemoById: vi.fn(async () => {
				getStarted();
				await getGate;
				return {
					data: [
						{
							id: 100,
							updated_at: "2026-01-02",
							title: "old",
							memo: "A",
							impression: "",
							actionItem: "",
						},
					],
					error: null,
				};
			}),
			updateMemo,
		};
		const flushing = flushOfflineMemoQueue({ userId: "user-1", memoService });
		await insertStartedPromise;
		await enqueueOfflineMemo(
			createItem({ data: { ...createItem().data, memo: "B" } }),
		);
		releaseInsert();
		await getStartedPromise;
		const pending = await getPendingOfflineMemo({
			userId: "user-1",
			url: createItem().url,
		});
		expect(pending).toMatchObject({ memoId: 100, data: { memo: "B" } });
		releaseGet();
		await flushing;
		expect(updateMemo.mock.calls[0]?.[0]).toMatchObject({
			id: 100,
			request: { memo: "B" },
		});
		expect(await getPendingOfflineMemos()).toEqual([]);
	});

	it("A 전송 중 B를 저장하면 A ACK 뒤 B 본문을 보존한다", async () => {
		const original = createItem({ memoId: 1 });
		await enqueueOfflineMemo(original);
		let release!: () => void;
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		let started!: () => void;
		const startedPromise = new Promise<void>((resolve) => {
			started = resolve;
		});
		let serverUpdatedAt = original.baseUpdatedAt ?? "2026-01-01T00:00:00.000Z";
		const updateMemo = vi.fn(
			async (_params: { id: number; request: { memo?: string } }) => {
				started();
				await gate;
				serverUpdatedAt = "2026-01-02";
				return { data: [{ id: 1, updated_at: serverUpdatedAt }], error: null };
			},
		);
		const memoService: TOfflineMemoQueueService = {
			getMemoById: vi.fn(async () => ({
				data: [
					{
						id: 1,
						updated_at: serverUpdatedAt,
						title: "old",
						memo: "old",
						impression: "",
						actionItem: "",
					},
				],
				error: null,
			})),
			insertMemo: vi.fn(async () => ({
				data: [{ id: 2, updated_at: "2026-01-02" }],
				error: null,
			})),
			updateMemo,
		};
		const flushing = flushOfflineMemoQueue({ userId: "user-1", memoService });
		await startedPromise;
		await enqueueOfflineMemo(
			createItem({ memoId: 1, data: { ...original.data, memo: "B" } }),
		);
		release();
		await flushing;
		expect(updateMemo).toHaveBeenCalledTimes(2);
		expect(updateMemo.mock.calls[1]?.[0].request.memo).toBe("B");
		expect(await getPendingOfflineMemos()).toEqual([]);
	});
	const buildMemoService = (
		overrides: Partial<TOfflineMemoQueueService> = {},
	): TOfflineMemoQueueService => ({
		getMemoById: vi.fn(async () => ({ data: [], error: null })),
		insertMemo: vi.fn(async () => ({
			data: [{ id: 100, updated_at: "2026-01-02" }],
			error: null,
		})),
		updateMemo: vi.fn(async () => ({
			data: [{ id: 1, updated_at: "2026-01-02" }],
			error: null,
		})),
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
		expect(analytics.trackMemoCreate).toHaveBeenCalledTimes(1);
		expect(result.conflicts).toEqual([]);
		expect(await getPendingOfflineMemos()).toEqual([]);
	});

	it("서버 updated_at이 baseUpdatedAt과 같으면 update한다", async () => {
		await enqueueOfflineMemo(
			createItem({ memoId: 1, baseUpdatedAt: "2026-01-01T00:00:00.000Z" }),
		);
		const memoService = buildMemoService({
			getMemoById: vi.fn(async () => ({
				data: [
					{
						id: 1,
						updated_at: "2026-01-01T00:00:00.000Z",
						title: "옛 제목",
						memo: "옛 본문",
						impression: "",
						actionItem: "",
					},
				],
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
				data: [
					{
						id: 1,
						updated_at: "2026-02-02T00:00:00.000Z",
						title: "다른 곳에서 바뀐 제목",
						memo: "다른 곳에서 바뀐 본문",
						impression: "",
						actionItem: "",
					},
				],
				error: null,
			})),
			insertMemo: vi.fn(async () => ({
				data: [{ id: 2, updated_at: "2026-01-02" }],
				error: null,
			})),
		});

		const result = await flushOfflineMemoQueue({
			userId: "user-1",
			memoService,
		});

		expect(memoService.insertMemo).toHaveBeenCalledTimes(1);
		expect(analytics.trackMemoCreate).toHaveBeenCalledTimes(1);
		expect(result.conflicts).toEqual([
			{ oldMemoId: 1, newMemoId: 2, url: "https://example.com/a" },
		]);
		expect(await getPendingOfflineMemos()).toEqual([]);
	});

	it("updated_at은 다르지만 서버 내용이 이미 대기 항목과 같으면 다시 쓰지 않고 성공 처리한다", async () => {
		await enqueueOfflineMemo(
			createItem({ memoId: 1, baseUpdatedAt: "2026-01-01T00:00:00.000Z" }),
		);
		const memoService = buildMemoService({
			getMemoById: vi.fn(async () => ({
				data: [
					{
						id: 1,
						updated_at: "2026-02-02T00:00:00.000Z",
						title: "제목",
						memo: "본문",
						impression: "",
						actionItem: "",
					},
				],
				error: null,
			})),
		});

		const result = await flushOfflineMemoQueue({
			userId: "user-1",
			memoService,
		});

		expect(memoService.updateMemo).not.toHaveBeenCalled();
		expect(memoService.insertMemo).not.toHaveBeenCalled();
		expect(result.conflicts).toEqual([]);
		expect(result.syncedCount).toBe(1);
		expect(await getPendingOfflineMemos()).toEqual([]);
	});

	it("서버에서 메모가 삭제됐으면(조회 결과 없음) insert하고 충돌로 알린다", async () => {
		await enqueueOfflineMemo(createItem({ memoId: 1 }));
		const memoService = buildMemoService({
			getMemoById: vi.fn(async () => ({ data: [], error: null })),
			insertMemo: vi.fn(async () => ({
				data: [{ id: 2, updated_at: "2026-01-02" }],
				error: null,
			})),
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
		expect(await getPendingOfflineMemos()).toEqual([
			expect.objectContaining({
				...otherUserItem,
				revision: expect.any(String),
			}),
		]);
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
				return { data: [{ id: 100, updated_at: "2026-01-02" }], error: null };
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
