import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	buildFirstMemoFunnel,
	measureFirstMemo,
	readFirstMemoFunnel,
	readSaveResults,
	validateFirstMemoOptions,
} from "./measure-first-memo.mjs";
import { runFunnelReport, runReport } from "./ga4-client.mjs";
import { exchangeServiceAccountToken } from "../shared/google-auth.mjs";

vi.mock("./ga4-client.mjs", async (original) => ({
	...await original<typeof import("./ga4-client.mjs")>(),
	runFunnelReport: vi.fn(), runReport: vi.fn(),
}));
vi.mock("../shared/google-auth.mjs", () => ({ exchangeServiceAccountToken: vi.fn() }));

const options = { from: "2026-10-05", to: "2026-10-18", instrumentedOn: "2026-10-04", versions: ["1.11.4"] };
const now = new Date("2026-10-27T15:00:00Z");
const funnel = (installed = "70", completed = "3", target = "memo_content_saved") => ({
	funnelTable: {
		dimensionHeaders: [{ name: "funnelStepName" }],
		metricHeaders: [{ name: "not_a_user_metric" }, { name: "activeUsers" }],
		rows: [
			{ dimensionValues: [{ value: "1. extension_installed" }], metricValues: [{ value: "999" }, { value: installed }] },
			{ dimensionValues: [{ value: `2. ${target}` }], metricValues: [{ value: "999" }, { value: completed }] },
		], metadata: {},
	},
});
const results = () => ({
	dimensionHeaders: [{ name: "customEvent:source" }, { name: "customEvent:is_success" }],
	metricHeaders: [{ name: "eventCount" }], metadata: { timeZone: "Asia/Seoul" },
	rows: [
		{ dimensionValues: [{ value: "side_panel" }, { value: "true" }], metricValues: [{ value: "8" }] },
		{ dimensionValues: [{ value: "side_panel" }, { value: "false" }], metricValues: [{ value: "2" }] },
		{ dimensionValues: [{ value: "offline_sync" }, { value: "true" }], metricValues: [{ value: "3" }] },
	], rowCount: 3,
});

describe("성숙 설치 코호트 보고서", () => {
	it("마지막 설치일 전체+7일+48시간이 끝난 경계만 허용한다", () => {
		expect(() => validateFirstMemoOptions(options, new Date(now.getTime() - 1))).toThrow("관찰/처리 미완료");
		expect(validateFirstMemoOptions(options, now)).toEqual({ followupEnd: "2026-10-25", readyAt: now.toISOString() });
	});

	it.each([
		{ from: "2026-02-30" }, { to: "2026-10-01" },
		{ instrumentedOn: "2026-10-05" }, { versions: [] }, { versions: ["latest"] },
	])("날짜·부분 배포일·대상 버전이 불확실하면 거절한다: %j", (patch) => {
		expect(() => validateFirstMemoOptions({ ...options, ...patch }, now)).toThrow();
	});

	it("본문 저장만 후속 필수인 닫힌 2단계이고 첫 단계만 코호트 날짜로 제한한다", () => {
		const body = buildFirstMemoFunnel(options);
		expect(body.dateRanges).toEqual([{ startDate: "2026-10-05", endDate: "2026-10-25" }]);
		expect(body.funnel.isOpenFunnel).toBe(false);
		expect(body.funnel.steps.map((step) => step.name)).toEqual(["extension_installed", "memo_content_saved"]);
		expect(body.funnel.steps[1]).toMatchObject({ withinDurationFromPriorStep: "604800s", isDirectlyFollowedBy: false });
		for (const step of body.funnel.steps) {
			const filter = JSON.stringify(step.filterExpression);
			expect(filter).toContain("hostName");
			expect(filter).toContain("production");
			expect(filter).toContain("customEvent:extension_version");
			expect(filter).toContain("1.11.4");
		}
		expect(JSON.stringify(body.funnel.steps[0])).toContain("betweenFilter");
		expect(JSON.stringify(body.funnel.steps[1])).not.toContain("betweenFilter");
	});

	it("헤더 위치로 사용자 수를 읽고 독립 totalUsers를 섞지 않는다", () => {
		expect(readFirstMemoFunnel(funnel())).toMatchObject({ installed: 70, completed: 3, rate: 3 / 70, status: "observed" });
	});

	it("마지막 단계 행이 없는 유효 응답은 완료0, 분모0은 비율 null이다", () => {
		const report = funnel("70", "0");
		report.funnelTable.rows.pop();
		expect(readFirstMemoFunnel(report)).toMatchObject({ completed: 0, rate: 0 });
		expect(readFirstMemoFunnel(funnel("0", "0"))).toMatchObject({ rate: null });
	});

	it("표본 추출·잘린 행·부정확한 수·헤더 누락은 판정 보류한다", () => {
		const sampled = { ...funnel(), funnelVisualization: { metadata: { samplingMetadatas: [{}] } } };
		const truncated = funnel();
		Object.assign(truncated.funnelTable, { rowCount: 3 });
		const missingHeader = funnel();
		missingHeader.funnelTable.metricHeaders = [];
		for (const report of [sampled, truncated, missingHeader, funnel("2", "3"), funnel("oops", "1"), {}]) {
			expect(readFirstMemoFunnel(report).status).toBe("incomplete");
		}
	});

	it("실패 비율은 출처별로 분리하고 미관측 출처는 null이다", () => {
		expect(readSaveResults(results())).toMatchObject({ status: "observed", sources: [
			{ source: "side_panel", successes: 8, failures: 2, observedFailureRate: 0.2 },
			{ source: "offline_sync", successes: 3, failures: 0, observedFailureRate: 0 },
		] });
		const empty = results(); empty.rows = []; empty.rowCount = 0;
		expect(readSaveResults(empty).sources.every((row) => row.observedFailureRate === null)).toBe(true);
	});

	it("보호지표 임곗값·잘린 행·잘못된 출처·KST아님은 실패비율을 내지 않는다", () => {
		for (const metadata of [{ timeZone: "UTC" }, { timeZone: "Asia/Seoul", subjectToThresholding: true }, { timeZone: "Asia/Seoul", samplingMetadatas: [{}] }]) {
			const report = { ...results(), metadata };
			expect(readSaveResults(report).status).toBe("incomplete");
			expect(readSaveResults(report).sources.every((row) => row.observedFailureRate === null)).toBe(true);
		}
		const report = results(); report.rowCount = 4;
		expect(readSaveResults(report).status).toBe("incomplete");
		report.rowCount = 3; report.rows[0].dimensionValues[0].value = "unexpected";
		expect(readSaveResults(report).status).toBe("incomplete");
	});

	beforeEach(() => vi.clearAllMocks());
	it("조회는 메모·패널·준비 2단계3개와 같은 기간 보호지표이며 결과에 한계를 싣는다", async () => {
		vi.mocked(exchangeServiceAccountToken).mockResolvedValue("token");
		vi.mocked(runFunnelReport).mockImplementation(async ({ body }) => funnel("70", "3", body.funnel.steps[1].name));
		vi.mocked(runReport).mockResolvedValue(results());
		const report = await measureFirstMemo({ ...options, propertyId: "123", serviceAccountJson: "{}" }, now);
		expect(runFunnelReport).toHaveBeenCalledTimes(3);
		expect(runReport).toHaveBeenCalledTimes(1);
		expect(report.funnels.memo_content_saved.completed).toBe(3);
		expect(report.limitations.join(" ")).toContain("threshold");
		expect(report.saveResults.population).toContain("설치 코호트 한정 아님");
	});

	it("API 오류를 설치0명으로 대체하지 않는다", async () => {
		vi.mocked(exchangeServiceAccountToken).mockResolvedValue("token");
		vi.mocked(runFunnelReport).mockRejectedValue(new Error("403 forbidden"));
		await expect(measureFirstMemo({ ...options, propertyId: "123", serviceAccountJson: "{}" }, now)).rejects.toThrow("403 forbidden");
	});
});
