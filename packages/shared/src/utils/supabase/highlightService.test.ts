import { describe, expect, it, vi } from "vitest";
import type { MemoSupabaseClient } from "../../types";
import { HighlightService } from "./highlightService";

const createService = () => {
	const query = {
		update: vi.fn(),
		delete: vi.fn(),
		eq: vi.fn(),
		select: vi.fn(),
	};
	query.update.mockReturnValue(query);
	query.delete.mockReturnValue(query);
	query.eq.mockReturnValue(query);
	query.select.mockResolvedValue({ data: [{ id: 1 }], error: null });
	const client = {
		schema: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(query) }),
	};

	return {
		service: new HighlightService(client as unknown as MemoSupabaseClient),
		query,
	};
};

describe("하이라이트 변경 범위", () => {
	it("확장 색 변경은 ID·URL·사용자 조건을 모두 적용한다", async () => {
		const { service, query } = createService();
		await service.updateHighlight({
			id: 1,
			request: { color: "pink" },
			scope: { url: "https://example.com/", userId: "owner" },
		});
		expect(query.eq.mock.calls).toEqual([
			["id", 1],
			["url", "https://example.com/"],
			["user_id", "owner"],
		]);
		expect(query.select).toHaveBeenCalledOnce();
	});
	it("확장 삭제도 동일한 범위를 적용하고 삭제한 행을 반환한다", async () => {
		const { service, query } = createService();
		expect(
			await service.deleteHighlight(1, {
				url: "https://example.com/",
				userId: "owner",
			}),
		).toEqual({ data: [{ id: 1 }], error: null });
		expect(query.eq.mock.calls).toEqual([
			["id", 1],
			["url", "https://example.com/"],
			["user_id", "owner"],
		]);
	});
	it("기존 호출에는 ID 필터만 적용한다", async () => {
		const { service, query } = createService();
		await service.updateHighlight({ id: 1, request: { color: "pink" } });
		expect(query.eq.mock.calls).toEqual([["id", 1]]);
		query.eq.mockClear();
		await service.deleteHighlight(1);
		expect(query.eq.mock.calls).toEqual([["id", 1]]);
	});
});

describe("메모 URL별 하이라이트 일괄 조회", () => {
	it("기존 빈 키 행은 원본 URL로 걸러 다른 페이지 결과를 섞지 않는다", async () => {
		const query = {
			select: vi.fn().mockReturnThis(),
			in: vi.fn().mockReturnThis(),
			gt: vi.fn().mockReturnThis(),
			order: vi.fn().mockReturnThis(),
			limit: vi.fn().mockResolvedValue({
				data: [
					{
						id: 1,
						url: "https://example.com/?utm_source=mail&id=1",
						page_key: "",
					},
					{ id: 2, url: "https://example.com/?id=2", page_key: "" },
					{ id: 3, url: "invalid URL", page_key: "" },
				],
				error: null,
			}),
		};
		const client = {
			schema: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(query) }),
		};
		const service = new HighlightService(
			client as unknown as MemoSupabaseClient,
		);
		const result = await service.getHighlightsByUrls([
			"https://example.com/?id=1",
		]);
		expect(result.data?.map((highlight) => highlight.id)).toEqual([1]);
	});
	it("빈 URL 목록은 데이터베이스에 요청하지 않는다", async () => {
		const { service, query } = createService();
		expect(await service.getHighlightsByUrls([""])).toEqual({
			data: [],
			error: null,
		});
		expect(query.select).not.toHaveBeenCalled();
	});
	it("중복 페이지 키를 제거하고 page_key 조건으로 한 번 조회한다", async () => {
		const query = {
			select: vi.fn().mockReturnThis(),
			in: vi.fn().mockReturnThis(),
			order: vi.fn().mockReturnThis(),
			gt: vi.fn().mockReturnThis(),
			limit: vi.fn().mockResolvedValue({ data: [], error: null }),
		};
		const client = {
			schema: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(query) }),
		};
		const service = new HighlightService(
			client as unknown as MemoSupabaseClient,
		);
		await service.getHighlightsByUrls([
			"https://example.com/?utm_source=mail&id=1",
			"https://example.com/?utm_source=ads&id=1",
			"https://example.com/?id=2",
			"",
		]);
		expect(query.in).toHaveBeenCalledOnce();
		expect(query.in).toHaveBeenCalledWith("page_key", [
			"https://example.com/?id=1",
			"https://example.com/?id=2",
			"",
		]);
		expect(query.order).toHaveBeenCalledWith("id", { ascending: true });
	});
});

describe("하이라이트 일괄 조회 분할", () => {
	const createPagedService = () => {
		const query = {
			select: vi.fn().mockReturnThis(),
			in: vi.fn().mockReturnThis(),
			order: vi.fn().mockReturnThis(),
			gt: vi.fn().mockReturnThis(),
			limit: vi.fn(),
		};
		const client = {
			schema: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(query) }),
		};

		return {
			query,
			service: new HighlightService(client as unknown as MemoSupabaseClient),
		};
	};
	it("1000개를 초과하는 결과도 500개 단위로 끝까지 조회한다", async () => {
		const { query, service } = createPagedService();
		const rows = Array.from({ length: 1201 }, (_, index) => ({
			id: index + 1,
			url: "https://a.com",
			page_key: "https://a.com/",
		}));
		query.limit.mockImplementation(async () => ({
			data: rows
				.filter((row) => row.id > (query.gt.mock.lastCall?.[1] ?? 0))
				.slice(0, 500),
			error: null,
		}));
		expect((await service.getHighlightsByUrls(["https://a.com"])).data).toEqual(
			rows,
		);
		expect(query.gt.mock.calls).toEqual([
			["id", 0],
			["id", 500],
			["id", 1000],
		]);
	});
	it("URL 개수와 인코딩 길이에 따라 요청을 나눈다", async () => {
		const { query, service } = createPagedService();
		query.limit.mockResolvedValue({ data: [], error: null });
		const urls = Array.from(
			{ length: 41 },
			(_, index) => `https://a.com/${index}`,
		);
		await service.getHighlightsByUrls(urls);
		expect(query.in.mock.calls.map((call) => call[1].length)).toEqual([
			21, 21, 2,
		]);
		query.in.mockClear();
		await service.getHighlightsByUrls([
			`https://a.com/${"a".repeat(3100)}`,
			`https://b.com/${"b".repeat(3100)}`,
		]);
		expect(query.in.mock.calls.map((call) => call[1].length)).toEqual([2, 2]);
	});
	it("중간 페이지 실패는 부분 성공으로 숨기지 않는다", async () => {
		const { query, service } = createPagedService();
		const error = { message: "요청 실패" };
		query.limit
			.mockResolvedValueOnce({
				data: Array.from({ length: 500 }, (_, index) => ({
					id: index + 1,
					url: "https://a.com",
					page_key: "https://a.com/",
				})),
				error: null,
			})
			.mockResolvedValueOnce({ data: null, error });
		expect(await service.getHighlightsByUrls(["https://a.com"])).toEqual({
			data: null,
			error,
		});
	});
});

describe("페이지별 하이라이트 개수", () => {
	it("채워진 키와 기존 빈 키를 같은 페이지에서 한 번씩 센다", async () => {
		const query = {
			select: vi.fn().mockReturnThis(),
			in: vi.fn().mockReturnThis(),
			gt: vi.fn().mockReturnThis(),
			order: vi.fn().mockReturnThis(),
			limit: vi.fn().mockResolvedValue({
				data: [
					{
						id: 1,
						url: "https://example.com/?id=1",
						page_key: "https://example.com/?id=1",
					},
					{
						id: 2,
						url: "https://example.com/?id=1&utm_source=mail",
						page_key: "",
					},
					{ id: 3, url: "https://example.com/?id=2", page_key: "" },
				],
				error: null,
			}),
		};
		const client = {
			schema: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(query) }),
		};
		const service = new HighlightService(
			client as unknown as MemoSupabaseClient,
		);
		const result = await service.getHighlightCountsByPageKeys([
			"https://example.com/?id=1",
		]);
		expect(result.data).toEqual([
			{ page_key: "https://example.com/?id=1", count: 2 },
		]);
		expect(query.in).toHaveBeenCalledWith("page_key", [
			"https://example.com/?id=1",
			"",
		]);
	});
});
