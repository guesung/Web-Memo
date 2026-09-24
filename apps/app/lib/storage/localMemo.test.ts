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

import { getMemoByUrl, upsertMemo } from "./localMemo";

beforeEach(() => storage.clear());

describe("로컬 메모 페이지 후보", () => {
	it("추적 파라미터가 다른 두 메모를 모두 찾고 임의 저장을 거부한다", async () => {
		storage.set(
			"webmemo:memos",
			JSON.stringify([
				{
					id: "first",
					url: "https://example.com/article?utm_source=mail&id=1",
					title: "첫 메모",
					memo: "첫 내용",
					createdAt: "2026-01-01",
					updatedAt: "2026-01-01",
					synced: false,
				},
				{
					id: "second",
					url: "https://example.com/article?id=1",
					title: "두 번째 메모",
					memo: "둘째 내용",
					createdAt: "2026-01-02",
					updatedAt: "2026-01-02",
					synced: false,
				},
			]),
		);
		const candidates = await getMemoByUrl(
			"https://example.com/article?id=1&utm_campaign=test",
		);
		expect(candidates.map((memo) => memo.id)).toEqual(["second", "first"]);
		await expect(
			upsertMemo({
				url: "https://example.com/article?id=1",
				title: "수정",
				memo: "덮어쓰기",
			}),
		).rejects.toThrow("선택");
		expect(
			(await getMemoByUrl("https://example.com/article?id=1")).map(
				(memo) => memo.memo,
			),
		).toEqual(["둘째 내용", "첫 내용"]);
	});

	it("선택한 ID만 수정하고 원래 URL을 유지한다", async () => {
		storage.set(
			"webmemo:memos",
			JSON.stringify([
				{
					id: "first",
					url: "https://example.com/article?utm_source=mail&id=1",
					title: "첫 메모",
					memo: "첫 내용",
					createdAt: "2026-01-01",
					updatedAt: "2026-01-01",
					synced: false,
				},
				{
					id: "second",
					url: "https://example.com/article?id=1",
					title: "두 번째 메모",
					memo: "둘째 내용",
					createdAt: "2026-01-02",
					updatedAt: "2026-01-02",
					synced: false,
				},
			]),
		);
		await upsertMemo({
			selectedId: "first",
			url: "https://example.com/article?id=1",
			title: "수정",
			memo: "새 내용",
		});
		const candidates = await getMemoByUrl("https://example.com/article?id=1");
		expect(candidates.find((memo) => memo.id === "first")).toMatchObject({
			url: "https://example.com/article?utm_source=mail&id=1",
			memo: "새 내용",
		});
		expect(candidates.find((memo) => memo.id === "second")?.memo).toBe(
			"둘째 내용",
		);
	});
});
