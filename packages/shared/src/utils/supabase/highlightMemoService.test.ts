import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MemoSupabaseClient } from "../../types";
import { HighlightMemoService } from "./highlightMemoService";

const mocks = vi.hoisted(() => ({ trackEvent: vi.fn() }));
vi.mock("../../modules/analytics", () => ({
	analytics: { trackEvent: mocks.trackEvent },
}));

const makeClient = () => {
	const query = {
		select: vi.fn().mockReturnThis(),
		in: vi.fn().mockResolvedValue({ data: [], error: null }),
	};
	const rpc = vi.fn();
	const from = vi.fn().mockReturnValue(query);
	const schema = vi.fn().mockReturnValue({ rpc, from });
	return {
		service: new HighlightMemoService({
			schema,
		} as unknown as MemoSupabaseClient),
		schema,
		rpc,
		from,
		query,
	};
};

beforeEach(() => {
	mocks.trackEvent.mockReset();
});

describe("하이라이트 연결 메모 서비스", () => {
	it("처음 저장한 메모의 ID를 반환하고 최초 작성 이벤트를 한 번만 기록한다", async () => {
		const { service, rpc, schema } = makeClient();
		rpc.mockResolvedValue({
			data: { memo_id: 20, highlight_id: 7, created: true, deleted_at: null },
			error: null,
		});
		expect(await service.create(7, "생각")).toEqual({
			memo_id: 20,
			highlight_id: 7,
			created: true,
			deleted_at: null,
		});
		expect(schema).toHaveBeenCalledWith("memo");
		expect(rpc).toHaveBeenCalledWith("create_memo_from_highlight", {
			p_highlight_id: 7,
			p_memo: "생각",
		});
		expect(mocks.trackEvent).toHaveBeenCalledOnce();
		expect(mocks.trackEvent).toHaveBeenCalledWith({
			name: "memo_first_write",
			params: { source: "highlight" },
		});
	});

	it("저장 재시도에서 기존 메모가 반환되면 작성 이벤트를 중복 기록하지 않는다", async () => {
		const { service, rpc } = makeClient();
		rpc.mockResolvedValue({
			data: {
				memo_id: 20,
				highlight_id: 7,
				created: false,
				deleted_at: "2026-10-11T00:00:00Z",
			},
			error: null,
		});
		expect((await service.create(7, "다시 저장")).created).toBe(false);
		expect(mocks.trackEvent).not.toHaveBeenCalled();
	});

	it("RPC 오류와 잘못된 반환 값은 성공이나 작성 이벤트로 취급하지 않는다", async () => {
		const { service, rpc } = makeClient();
		const databaseError = new Error("write failed");
		rpc.mockResolvedValueOnce({ data: null, error: databaseError });
		await expect(service.create(7, "생각")).rejects.toBe(databaseError);
		rpc.mockResolvedValueOnce({
			data: { memo_id: "20", highlight_id: 7, created: true, deleted_at: null },
			error: null,
		});
		await expect(service.create(7, "생각")).rejects.toThrow(
			"Invalid highlight memo response",
		);
		expect(mocks.trackEvent).not.toHaveBeenCalled();
	});

	it("중복 ID를 제거하고 100개씩 조회한 뒤 모든 연결을 합친다", async () => {
		const { service, query, from } = makeClient();
		const ids = Array.from({ length: 101 }, (_, index) => index + 1);
		query.in
			.mockResolvedValueOnce({ data: [{ memo_id: 11 }], error: null })
			.mockResolvedValueOnce({ data: [{ memo_id: 12 }], error: null });
		expect(await service.getByHighlightIds([1, ...ids])).toEqual([
			{ memo_id: 11 },
			{ memo_id: 12 },
		]);
		expect(from).toHaveBeenCalledWith("highlight_memo_source");
		expect(query.select).toHaveBeenCalledWith(
			"*, memo:memo_id(id,memo,deleted_at)",
		);
		expect(query.in.mock.calls).toEqual([
			["highlight_id", ids.slice(0, 100)],
			["highlight_id", ids.slice(100)],
		]);
	});

	it("메모 ID 조회는 같은 연결 테이블을 사용하고, 부분 조회 실패를 숨기지 않는다", async () => {
		const { service, query } = makeClient();
		const databaseError = new Error("load failed");
		query.in.mockResolvedValueOnce({ data: null, error: databaseError });
		await expect(service.getByMemoIds([20])).rejects.toBe(databaseError);
		expect(query.in).toHaveBeenCalledWith("memo_id", [20]);
	});

	it("빈 ID 목록은 데이터베이스에 접근하지 않는다", async () => {
		const { service, query } = makeClient();
		expect(await service.getByHighlightIds([])).toEqual([]);
		expect(query.in).not.toHaveBeenCalled();
	});
});
