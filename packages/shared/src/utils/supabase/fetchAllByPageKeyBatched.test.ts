import { describe, expect, it, vi } from "vitest";
import { fetchAllByPageKeyBatched } from "./fetchAllByPageKeyBatched";

interface IFTestRow {
	id: number;
	key: string;
}

describe("fetchAllByPageKeyBatched", () => {
	it("배치 크기(500)만큼 채워진 응답이 이어지면 lastId를 갱신하며 끝까지 조회한다", async () => {
		const rows: IFTestRow[] = Array.from({ length: 1201 }, (_, index) => ({
			id: index + 1,
			key: "same",
		}));
		const fetchBatch = vi.fn((lastId: number) =>
			Promise.resolve({
				data: rows.filter((row) => row.id > lastId).slice(0, 500),
				error: null,
			}),
		);

		const result = await fetchAllByPageKeyBatched<IFTestRow>({
			fetchBatch,
			matches: () => true,
		});

		expect(result).toEqual({ data: rows, error: null });
		expect(fetchBatch.mock.calls.map((call) => call[0])).toEqual([
			0, 500, 1000,
		]);
	});

	it("matches를 통과하지 못한 행은 결과에서 제외한다", async () => {
		const fetchBatch = vi.fn().mockResolvedValue({
			data: [
				{ id: 1, key: "match" },
				{ id: 2, key: "다른 페이지" },
			],
			error: null,
		});

		const result = await fetchAllByPageKeyBatched<IFTestRow>({
			fetchBatch,
			matches: (row) => row.key === "match",
		});

		expect(result.data).toEqual([{ id: 1, key: "match" }]);
	});

	it("matches 안에서 파싱 실패로 던진 예외는 호출부가 false로 처리해야 그 행이 빠진다", async () => {
		const fetchBatch = vi.fn().mockResolvedValue({
			data: [
				{ id: 1, key: "invalid" },
				{ id: 2, key: "valid" },
			],
			error: null,
		});

		const result = await fetchAllByPageKeyBatched<IFTestRow>({
			fetchBatch,
			matches: (row) => {
				try {
					if (row.key === "invalid") {
						throw new Error("파싱 실패");
					}
					return true;
				} catch {
					return false;
				}
			},
		});

		expect(result.data).toEqual([{ id: 2, key: "valid" }]);
	});

	it("중간 배치가 실패하면 이미 모은 결과를 버리고 에러를 반환한다", async () => {
		const error = { message: "요청 실패" };
		const fetchBatch = vi
			.fn()
			.mockResolvedValueOnce({
				data: Array.from({ length: 500 }, (_, index) => ({
					id: index + 1,
					key: "same",
				})),
				error: null,
			})
			.mockResolvedValueOnce({ data: null, error });

		const result = await fetchAllByPageKeyBatched<IFTestRow>({
			fetchBatch,
			matches: () => true,
		});

		expect(result).toEqual({ data: null, error });
	});
});
