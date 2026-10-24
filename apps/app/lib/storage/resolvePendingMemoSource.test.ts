import AsyncStorage from "@react-native-async-storage/async-storage";
import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => new Map<string, string>());
vi.mock("@react-native-async-storage/async-storage", () => ({
	default: {
		getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
		setItem: vi.fn(async (key: string, value: string) => {
			storage.set(key, value);
		}),
	},
}));

import { getAllMemos, upsertMemo } from "./localMemo";
import { resolvePendingMemoSource } from "./resolvePendingMemoSource";

beforeEach(() => {
	storage.clear();
	vi.clearAllMocks();
});

describe("원격 성공 뒤 로컬 원본 정리", () => {
	it("대기 목록 저장 실패는 원본을 미동기화 상태로 보존한다", async () => {
		const source = await upsertMemo({
			url: "https://example.com",
			title: "원본",
			memo: "내용",
		});
		storage.set(
			"webmemo:pendingMemoSyncs",
			JSON.stringify([{ localId: source.id, operation: "sync" }]),
		);
		vi.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error("disk"));
		await expect(resolvePendingMemoSource(source.id)).rejects.toThrow("disk");
		expect((await getAllMemos())[0]).toMatchObject({
			id: source.id,
			memo: "내용",
			synced: false,
		});
		await resolvePendingMemoSource(source.id);
		expect(await getAllMemos()).toEqual([]);
	});
	it("마지막 원본 삭제 실패 후 재시도는 같은 원본만 정리한다", async () => {
		const source = await upsertMemo({
			url: "https://example.com/a",
			title: "원본",
			memo: "내용",
		});
		const other = await upsertMemo({
			url: "https://example.com/b",
			title: "다른 메모",
			memo: "유지",
		});
		const originalSet = vi.mocked(AsyncStorage.setItem).getMockImplementation();
		vi.mocked(AsyncStorage.setItem)
			.mockImplementationOnce(async (key, value) => {
				storage.set(key, value);
			})
			.mockRejectedValueOnce(new Error("delete"));
		await expect(resolvePendingMemoSource(source.id)).rejects.toThrow("delete");
		expect(await getAllMemos()).toHaveLength(2);
		if (originalSet)
			vi.mocked(AsyncStorage.setItem).mockImplementation(originalSet);
		await resolvePendingMemoSource(source.id);
		expect((await getAllMemos()).map((memo) => memo.id)).toEqual([other.id]);
	});
});
