import { describe, expect, it, vi } from "vitest";
import { loadMemoCandidates, sortMemoCandidates } from "./memoCandidates";

describe("sortMemoCandidates", () => {
	it("원격 후보와 미동기화 로컬 후보를 함께 최근 수정 순으로 정렬한다", () => {
		const olderRemote = {
			id: 1,
			updated_at: "2026-09-20T00:00:00.000Z",
		};
		const latestLocal = {
			id: "local-1",
			updatedAt: "2026-09-24T00:00:00.000Z",
		};
		const middleRemote = {
			id: 2,
			updated_at: "2026-09-22T00:00:00.000Z",
		};
		const candidates = [olderRemote, latestLocal, middleRemote];

		const sorted = sortMemoCandidates(
			candidates as Parameters<typeof sortMemoCandidates>[0],
		);

		expect(sorted.map((candidate) => candidate.id)).toEqual(["local-1", 2, 1]);
		expect(candidates[0]).toBe(olderRemote);
	});
});

describe("loadMemoCandidates", () => {
	it("로그인 시 원격 후보와 미동기화 로컬 후보를 함께 보여준다", async () => {
		const loadLocal = vi.fn().mockResolvedValue([
			{ id: "pending", updatedAt: "2026-09-24T00:00:00.000Z", synced: false },
			{ id: "synced", updatedAt: "2026-09-23T00:00:00.000Z", synced: true },
		]);
		const loadRemote = vi.fn().mockResolvedValue({
			data: [{ id: 1, updated_at: "2026-09-22T00:00:00.000Z" }],
			error: null,
		});

		const candidates = await loadMemoCandidates({
			url: "https://example.com/",
			isLoggedIn: true,
			loadLocal,
			loadRemote,
		});

		expect(candidates.map((candidate) => candidate.id)).toEqual(["pending", 1]);
	});

	it("원격 조회가 실패하면 후보가 없다고 판단하지 않는다", async () => {
		await expect(
			loadMemoCandidates({
				url: "https://example.com/",
				isLoggedIn: true,
				loadLocal: vi.fn().mockResolvedValue([]),
				loadRemote: vi.fn().mockResolvedValue({
					data: null,
					error: new Error("조회 실패"),
				}),
			}),
		).rejects.toThrow("조회 실패");
	});
});
