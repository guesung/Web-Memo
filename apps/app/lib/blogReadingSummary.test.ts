import { describe, expect, it } from "vitest";
import { getBlogSummaryTotals } from "./blogReadingSummary";

describe("getBlogSummaryTotals", () => {
	it("모든 소스의 총 글 수가 확정되면 합계를 돌려준다", () => {
		expect(
			getBlogSummaryTotals([
				{ collectedCount: 393, completedCount: 32, total: 393 },
				{ collectedCount: 220, completedCount: 18, total: 220 },
			]),
		).toEqual({
			collectedCount: 613,
			completedCount: 50,
			confirmedTotal: 613,
		});
	});

	it("수집 중인 소스가 있으면 총 글 수를 추정하지 않는다", () => {
		expect(
			getBlogSummaryTotals([
				{ collectedCount: 393, completedCount: 32, total: 393 },
				{ collectedCount: 124, completedCount: 18, total: null },
			]).confirmedTotal,
		).toBeNull();
	});

	it("구독이 없으면 총 글 수가 없다", () => {
		expect(getBlogSummaryTotals([]).confirmedTotal).toBeNull();
	});
});
