import { describe, expect, it, vi } from "vitest";
import { QUERY_KEY } from "../../constants/QueryKey";
import { AdminService } from "./adminService";

const createService = (response: { data: unknown; error: unknown }) => {
	const rpc = vi.fn().mockResolvedValue(response);
	const client = { schema: vi.fn(() => ({ rpc })) };
	return { service: new AdminService(client as never), rpc };
};

describe("AdminService.getMemoRetentionStats", () => {
	it("분모가 없는 null과 실제 0%를 그대로 보존한다", async () => {
		const data = {
			cohorts: [
				{ cohortSize: 0, ratePercent: null },
				{ cohortSize: 2, ratePercent: 0 },
			],
		};
		const { service, rpc } = createService({ data, error: null });
		expect(await service.getMemoRetentionStats()).toEqual(data);
		expect(rpc).toHaveBeenCalledWith("get_memo_retention_stats", {
			p_range: "recent12",
			p_granularity: "month",
		});
	});

	it("전체 기간·분기를 전달하며 관리자 포함 인자를 보내지 않는다", async () => {
		const { service, rpc } = createService({ data: {}, error: null });
		await service.getMemoRetentionStats({
			range: "all",
			granularity: "quarter",
		});
		expect(rpc).toHaveBeenCalledWith("get_memo_retention_stats", {
			p_range: "all",
			p_granularity: "quarter",
		});
	});

	it("조회 실패와 빈 응답을 0으로 바꾸지 않고 throw한다", async () => {
		const failed = createService({ data: null, error: { message: "denied" } });
		await expect(failed.service.getMemoRetentionStats()).rejects.toThrow(
			"denied",
		);
		const empty = createService({ data: null, error: null });
		await expect(empty.service.getMemoRetentionStats()).rejects.toThrow(
			"empty",
		);
	});

	it("캐시 키는 조회 조건을 분리하고 기존 통계와 겹치지 않는다", () => {
		expect(QUERY_KEY.memoRetention("recent12", "month")).not.toEqual(
			QUERY_KEY.memoRetention("recent12", "quarter"),
		);
		expect(QUERY_KEY.memoRetention("recent12", "month")).not.toEqual(
			QUERY_KEY.memoRetention("all", "month"),
		);
		expect(QUERY_KEY.memoRetention()).not.toEqual(QUERY_KEY.adminStats());
	});
});
