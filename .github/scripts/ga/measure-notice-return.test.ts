// @ts-nocheck — .mjs 스크립트의 GA API 호출을 모의합니다.
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./ga4-client.mjs", async (importOriginal) => ({
	...(await importOriginal()),
	runReport: vi.fn(),
	runFunnelReport: vi.fn(),
}));
vi.mock("../shared/google-auth.mjs", () => ({
	exchangeServiceAccountToken: vi.fn(async () => "token"),
}));

import { runFunnelReport, runReport } from "./ga4-client.mjs";
import { measureNoticeReturn, validateOptions } from "./measure-notice-return.mjs";

const auth = { serviceAccountJson: "{}", propertyId: "471860782" };
const prospective = {
	...auth,
	mode: "prospective",
	from: "2026-10-10",
	to: "2026-10-12",
	noticeId: "42",
	dimensionRegisteredOn: "2026-10-09",
};
const now = new Date("2026-10-23T00:00:00Z");

function usersReport(users: number, id = "42") {
	return { rows: users ? [{ dimensionValues: [{ value: id }], metricValues: [{ value: String(users) }] }] : [] };
}

function funnelReport(first: number, second: number, secondName = "memo_action", firstName = "notice_return") {
	return { funnelTable: {
		metricHeaders: [{ name: "activeUsers" }],
		rows: [
			{ dimensionValues: [{ value: `1. ${firstName}` }], metricValues: [{ value: String(first) }] },
			{ dimensionValues: [{ value: `2. ${secondName}` }], metricValues: [{ value: String(second) }] },
		],
	} };
}

beforeEach(() => vi.clearAllMocks());

describe("measureNoticeReturn", () => {
	it("공지별 전체 기간 totalUsers를 두 번 조회하고 중복 가능한 이벤트 횟수를 더하지 않는다", async () => {
		runReport.mockResolvedValueOnce(usersReport(10)).mockResolvedValueOnce(usersReport(3));
		runFunnelReport.mockResolvedValueOnce(funnelReport(3, 2));
		const report = await measureNoticeReturn(prospective, now);
		expect(report).toMatchObject({ status: "관찰 완료", rate: 0.3, viewPeriod: { start: "2026-10-10", end: "2026-10-12" }, returnPeriod: { start: "2026-10-11", end: "2026-10-19" } });
		expect(report.memo.label).toContain("재방문 뒤 24시간");
		const [views, returns] = runReport.mock.calls.map(([call]) => call.body);
		expect(views.metrics).toEqual([{ name: "totalUsers" }]);
		expect(views.dateRanges).toEqual([{ startDate: "2026-10-10", endDate: "2026-10-12" }]);
		expect(returns.dateRanges).toEqual([{ startDate: "2026-10-11", endDate: "2026-10-19" }]);
		for (const body of [views, returns]) {
			expect(body.dimensions).toEqual([{ name: "customEvent:notice_id" }]);
			expect(JSON.stringify(body.dimensionFilter)).toContain("customEvent:build_env");
			expect(JSON.stringify(body.dimensionFilter)).toContain("hostName");
		}
		const funnel = runFunnelReport.mock.calls[0][0].body;
		expect(funnel.funnel.steps[1].withinDurationFromPriorStep).toBe("86400s");
		expect(funnel.dateRanges).toEqual([{ startDate: "2026-10-11", endDate: "2026-10-20" }]);
		expect(funnel.funnel.steps[0].filterExpression.andGroup.expressions.at(-1)).toEqual({
			funnelFieldFilter: { fieldName: "date", betweenFilter: {
				fromValue: { int64Value: "20261011" }, toValue: { int64Value: "20261019" },
			} },
		});
	});

	it("과거 지표는 D0을 포함한 168시간 후속 행동으로만 명명한다", async () => {
		runFunnelReport.mockResolvedValueOnce(funnelReport(7, 4, "side_panel_open", "notice_view"))
			.mockResolvedValueOnce(funnelReport(7, 2, "memo_action", "notice_view"));
		const report = await measureNoticeReturn({ ...auth, mode: "historical", from: "2026-09-30", to: "2026-10-01" }, now);
		expect(report.label).toContain("D0 포함");
		expect(report.label).toContain("재방문율·인과 효과 아님");
		expect(report.panel.followupUsers).toBe(4);
		expect(report.memo.followupUsers).toBe(2);
		for (const [call] of runFunnelReport.mock.calls) {
			expect(call.body.dateRanges).toEqual([{ startDate: "2026-09-30", endDate: "2026-10-08" }]);
			expect(call.body.funnel.steps[1].withinDurationFromPriorStep).toBe("604800s");
			expect(call.body.funnel.steps[0].filterExpression.andGroup.expressions.at(-1)).toEqual({
				funnelFieldFilter: { fieldName: "date", betweenFilter: {
					fromValue: { int64Value: "20260930" }, toValue: { int64Value: "20261001" },
				} },
			});
		}
	});

	it("GA 임곗값, 분모 0, 다른 ID는 효과 미확인으로 둔다", async () => {
		runReport.mockResolvedValueOnce({ ...usersReport(10), metadata: { subjectToThresholding: true } })
			.mockResolvedValueOnce(usersReport(3));
		runFunnelReport.mockResolvedValueOnce(funnelReport(3, 1));
		const thresholded = await measureNoticeReturn(prospective, now);
		expect(thresholded).toMatchObject({ status: "효과 미확인", rate: null });
		runReport.mockResolvedValueOnce(usersReport(0)).mockResolvedValueOnce(usersReport(0));
		runFunnelReport.mockResolvedValueOnce(funnelReport(0, 0));
		const noViews = await measureNoticeReturn(prospective, now);
		expect(noViews).toMatchObject({ status: "효과 미확인", rate: null });
		runReport.mockResolvedValueOnce(usersReport(10, "43")).mockResolvedValueOnce(usersReport(3));
		runFunnelReport.mockResolvedValueOnce(funnelReport(3, 1));
		const wrongId = await measureNoticeReturn(prospective, now);
		expect(wrongId).toMatchObject({ status: "효과 미확인", rate: null });
		runReport.mockResolvedValueOnce({ ...usersReport(10), metadata: { timeZone: "America/Los_Angeles" } })
			.mockResolvedValueOnce(usersReport(3));
		runFunnelReport.mockResolvedValueOnce(funnelReport(3, 1));
		const wrongTimeZone = await measureNoticeReturn(prospective, now);
		expect(wrongTimeZone.incompleteReasons).toContain("GA4 속성 시간대가 KST가 아닙니다: America/Los_Angeles");
		runReport.mockResolvedValueOnce({ ...usersReport(10), metadata: { samplingMetadatas: [{ samplesReadCount: "10", samplingSpaceSize: "20" }] } })
			.mockResolvedValueOnce(usersReport(3));
		runFunnelReport.mockResolvedValueOnce(funnelReport(3, 1));
		const sampled = await measureNoticeReturn(prospective, now);
		expect(sampled).toMatchObject({ status: "효과 미확인", rate: null });
		expect(sampled.incompleteReasons).toContain("GA4 보고서에 표본 추출이 적용됐습니다");
	});
});

describe("validateOptions", () => {
	it("관찰 종료 뒤 처리 48시간과 차원 등록일을 강제한다", () => {
		expect(() => validateOptions(prospective, new Date("2026-10-21T14:59:59Z"))).toThrow("미완료");
		expect(() => validateOptions(prospective, new Date("2026-10-21T15:00:00Z"))).not.toThrow();
		expect(() => validateOptions({ ...prospective, dimensionRegisteredOn: "2026-10-11" }, now)).toThrow("--dimension-registered-on");
		expect(() => validateOptions({ ...prospective, from: "2026-02-30" }, now)).toThrow("실제 날짜");
	});
});
