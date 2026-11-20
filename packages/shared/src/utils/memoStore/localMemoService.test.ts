import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	LOCAL_MEMO_STORAGE_KEY,
	LOCAL_STORAGE_QUOTA_BYTES,
	LocalMemoService,
	LocalStorageFullError,
} from "./localMemoService";

const stored: Record<string, unknown> = {};
let bytesInUse = 0;

const insertRequest = (url: string, memo = "본문") => ({
	url,
	title: "제목",
	memo,
	isWish: true,
});

describe("LocalMemoService", () => {
	let service: LocalMemoService;

	beforeEach(() => {
		for (const key of Object.keys(stored)) delete stored[key];
		bytesInUse = 0;
		vi.stubGlobal("navigator", { locks: undefined });
		vi.stubGlobal("chrome", {
			storage: {
				local: {
					get: vi.fn(async (key: string) => ({ [key]: stored[key] })),
					set: vi.fn(async (items: Record<string, unknown>) => {
						Object.assign(stored, structuredClone(items));
					}),
					getBytesInUse: vi.fn(async () => bytesInUse),
				},
			},
		});
		service = new LocalMemoService();
	});

	it("insert는 음수 id와 서버 행 모양의 필드를 채워 저장한다", async () => {
		const result = await service.insertMemo(insertRequest("https://a.com/p"));

		const [memo] = result.data ?? [];
		expect(result.error).toBeNull();
		expect(memo.id).toBeLessThan(0);
		expect(memo).toMatchObject({
			url: "https://a.com/p",
			page_key: "https://a.com/p",
			isWish: true,
			isStar: false,
			isReading: false,
			plannedDate: null,
			deleted_at: null,
		});
		expect(memo.created_at).toBeTruthy();
		expect(memo.updated_at).toBe(memo.created_at);
		expect(stored[LOCAL_MEMO_STORAGE_KEY]).toBeDefined();
		expect(stored.offlineMemoQueue).toBeUndefined();
	});

	it("id는 매번 새로 내려가며 지운 id도 다시 쓰지 않는다", async () => {
		const first = (await service.insertMemo(insertRequest("https://a.com/1")))
			.data?.[0];
		await service.deleteMemos([first?.id as number]);
		const second = (await service.insertMemo(insertRequest("https://a.com/2")))
			.data?.[0];

		expect(second?.id).toBeLessThan(first?.id as number);
	});

	it("URL·같은 경로·id로 조회하고 최근 수정 순으로 정렬한다", async () => {
		const older = (
			await service.insertMemo(insertRequest("https://a.com/p?x=1"))
		).data?.[0];
		await service.insertMemo(insertRequest("https://a.com/other"));
		await service.updateMemo({
			id: older?.id as number,
			request: { updated_at: "2000-01-01T00:00:00.000Z" },
		});
		await service.insertMemo(insertRequest("https://a.com/p?x=2"));

		const byUrl = await service.getMemoByUrl("https://a.com/p?x=1");
		const bySamePath = await service.getMemosBySamePath("https://a.com/p?x=9");
		const byId = await service.getMemoById(older?.id as number);

		expect(byUrl.data?.map((memo) => memo.id)).toEqual([older?.id]);
		expect(bySamePath.data).toHaveLength(2);
		expect(bySamePath.data?.[1].id).toBe(older?.id);
		expect(byId.data?.[0].category).toBeNull();
	});

	it("update는 보낸 필드만 바꾸고 updated_at을 갱신한다", async () => {
		const created = (await service.insertMemo(insertRequest("https://a.com/p")))
			.data?.[0];

		const result = await service.updateMemo({
			id: created?.id as number,
			request: { memo: "수정", isStar: true, impression: undefined },
		});

		expect(result.data?.[0]).toMatchObject({
			memo: "수정",
			isStar: true,
			isWish: true,
			id: created?.id,
		});
	});

	it("delete는 조회에서 숨기고 restore는 되살린다", async () => {
		const created = (await service.insertMemo(insertRequest("https://a.com/p")))
			.data?.[0];
		const id = created?.id as number;

		await service.deleteMemos([id]);
		expect((await service.getMemoByUrl("https://a.com/p")).data).toEqual([]);

		await service.restoreMemos([id]);
		expect((await service.getMemoByUrl("https://a.com/p")).data).toHaveLength(
			1,
		);
	});

	it("저장 공간이 95% 이상이면 insert를 거부하고 update는 허용한다", async () => {
		const created = (await service.insertMemo(insertRequest("https://a.com/p")))
			.data?.[0];
		bytesInUse = LOCAL_STORAGE_QUOTA_BYTES * 0.95;

		await expect(
			service.insertMemo(insertRequest("https://a.com/new")),
		).rejects.toBeInstanceOf(LocalStorageFullError);
		const updated = await service.updateMemo({
			id: created?.id as number,
			request: { memo: "고침" },
		});

		expect(updated.data?.[0].memo).toBe("고침");
		expect(
			(await service.getMemosBySamePath("https://a.com/new")).data,
		).toEqual([]);
	});

	it("95% 미만이면 저장한다", async () => {
		bytesInUse = LOCAL_STORAGE_QUOTA_BYTES * 0.949;

		const result = await service.insertMemo(insertRequest("https://a.com/p"));

		expect(result.data).toHaveLength(1);
	});

	it("24시간 지난 휴지통 행은 다음 insert 때 지운다", async () => {
		const created = (await service.insertMemo(insertRequest("https://a.com/p")))
			.data?.[0];
		await service.deleteMemos([created?.id as number]);
		const storage = stored[LOCAL_MEMO_STORAGE_KEY] as {
			memos: { deleted_at: string }[];
		};
		storage.memos[0].deleted_at = "2000-01-01T00:00:00.000Z";

		await service.insertMemo(insertRequest("https://a.com/q"));

		expect(
			(stored[LOCAL_MEMO_STORAGE_KEY] as { memos: unknown[] }).memos,
		).toHaveLength(1);
	});
});
