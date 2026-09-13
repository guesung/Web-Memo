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
