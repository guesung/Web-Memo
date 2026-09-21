// @ts-nocheck — .mjs 스크립트를 직접 import 하는 테스트라 타입 선언이 없습니다.
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./ga4-client.mjs", async (importOriginal) => ({
	...(await importOriginal()),
	runReport: vi.fn(),
	runFunnelReport: vi.fn(),
}));
vi.mock("./google-auth.mjs", () => ({
	exchangeServiceAccountToken: vi.fn(async () => "token"),
}));

import {
	HOST_NAME_FILTER,
	HOST_NAME_FUNNEL_FILTER,
	runFunnelReport,
	runReport,
} from "./ga4-client.mjs";
import { FUNNEL_EVENTS, fetchWeeklyGa4Report } from "./ga4-weekly.mjs";
import { buildWeeklyReportPayload } from "./weekly-report-blocks.mjs";

const week = {
	start: "2026-09-11",
	end: "2026-09-17",
	previousStart: "2026-09-04",
	previousEnd: "2026-09-10",
};

/** 이번 주 이벤트별 사용자 수. 2026-09-11~17 GA 실측 일부. */
const USERS = {
	extension_installed: 390,
	side_panel_open: 35,
	login_start: 7,
	summary_run: 7,
	memo_write: 4,
	sign_up: 2,
};

/**
 * 퍼널 API 응답 모양. GA 는 단계 이름 앞에 "1. " 처럼 순번을 붙여 돌려주고, 지표는
 * activeUsers 가 첫 칸이다. 사용자 수는 실측 퍼널 414 → 27 → 6 → 3 → 1 에 마지막
 * 단계(가상값)를 얹었다.
 */
const funnelResponse = (users: number[], metricHeaders = ["activeUsers"]) => ({
	funnelTable: {
		dimensionHeaders: [{ name: "funnelStepName" }],
		metricHeaders: metricHeaders.map((name) => ({ name })),
		rows: FUNNEL_EVENTS.map((eventName, index) => ({
			dimensionValues: [{ value: `${index + 1}. ${eventName}` }],
			metricValues: [{ value: String(users[index]) }],
		})),
	},
});

const mockGa = ({ funnel }) => {
	runReport.mockImplementation(async ({ body }) => {
		const metric = body.metrics[0].name;

		if (metric === "activeUsers") {
			return { rows: [{ metricValues: [{ value: "430" }] }] };
		}

		return {
			rows: Object.entries(USERS).map(([eventName, users]) => ({
				dimensionValues: [{ value: eventName }],
				metricValues: [{ value: String(users) }],
			})),
		};
	});
	runFunnelReport.mockResolvedValue(funnel);
};

const fetchReport = () =>
	fetchWeeklyGa4Report({
		serviceAccountJson: "{}",
		propertyId: "471860782",
		week,
	});

beforeEach(() => {
	vi.clearAllMocks();
});

describe("주간 퍼널 단계", () => {
	it("가입은 메모 작성보다 앞이고 로그인 두 단계가 사이드 패널 뒤에 온다", () => {
		expect(FUNNEL_EVENTS).toEqual([
			"extension_installed",
			"side_panel_open",
			"side_panel_login_click",
			"login_start",
			"sign_up",
			"memo_write",
		]);
	});
});

describe("fetchWeeklyGa4Report 의 퍼널", () => {
	it("단계 순서·기간·호스트·production 조건으로 순서 강제 퍼널을 요청한다", async () => {
		mockGa({ funnel: funnelResponse([413, 27, 6, 3, 1, 1]) });

		await fetchReport();

		expect(runFunnelReport).toHaveBeenCalledTimes(1);

		const { body, propertyId } = runFunnelReport.mock.calls[0][0];

		expect(propertyId).toBe("471860782");
		expect(body.dateRanges).toEqual([
			{ startDate: "2026-09-11", endDate: "2026-09-17" },
		]);
		expect(body.funnel.steps.map((step) => step.name)).toEqual(FUNNEL_EVENTS);

		for (const [index, step] of body.funnel.steps.entries()) {
			const [eventFilter, hostFilter, environmentFilter] =
				step.filterExpression.andGroup.expressions;

			expect(eventFilter.funnelFieldFilter).toEqual({
				fieldName: "eventName",
				stringFilter: { matchType: "EXACT", value: FUNNEL_EVENTS[index] },
			});
			expect(hostFilter).toEqual(HOST_NAME_FUNNEL_FILTER);
			expect(environmentFilter).toEqual({
				funnelFieldFilter: {
					fieldName: "customEvent:build_env",
					stringFilter: { matchType: "EXACT", value: "production" },
				},
			});
		}
	});

	it("호스트 필터가 확장(빈 문자열·(not set))까지 포함한다", () => {
		const hosts = HOST_NAME_FUNNEL_FILTER.orGroup.expressions.map(
			(expression) => expression.funnelFieldFilter.stringFilter.value,
		);

		expect(hosts).toContain("");
		expect(hosts).toContain("(not set)");
		expect(hosts).toContain("www.webmemo.xyz");
	});

	it("순번 접두사를 떼고 단계별 사용자 수와 전 단계 대비 전환율을 낸다", async () => {
		mockGa({ funnel: funnelResponse([413, 27, 6, 3, 1, 1]) });

		const { funnel } = await fetchReport();

		expect(funnel.map(({ eventName, users }) => [eventName, users])).toEqual([
			["extension_installed", 413],
			["side_panel_open", 27],
			["side_panel_login_click", 6],
			["login_start", 3],
			["sign_up", 1],
			["memo_write", 1],
		]);
		expect(funnel[0].conversionRate).toBeNull();
		expect(funnel[1].conversionRate).toBeCloseTo(27 / 413);
		expect(funnel[2].conversionRate).toBeCloseTo(6 / 27);
		expect(funnel[5].conversionRate).toBe(1);
		// 순서 강제라 어떤 단계도 100%를 넘지 않는다.
		expect(
			funnel.every(({ conversionRate }) => conversionRate === null || conversionRate <= 1),
		).toBe(true);
	});

	it("지표 열 순서가 달라도 activeUsers 를 이름으로 찾는다", async () => {
		const funnel = funnelResponse([413, 27, 6, 3, 1, 1], [
			"funnelStepCompletionRate",
			"activeUsers",
		]);

		for (const [index, row] of funnel.funnelTable.rows.entries()) {
			row.metricValues = [
				{ value: "0.5" },
				{ value: String([413, 27, 6, 3, 1, 1][index]) },
			];
		}
		mockGa({ funnel });

		const report = await fetchReport();

		expect(report.funnel[0].users).toBe(413);
		expect(report.funnel[1].users).toBe(27);
	});

	it("첫 단계 사용자가 없어 응답에 행이 없으면 전부 0명, 전환율은 null 이다", async () => {
		mockGa({ funnel: {} });

		const { funnel } = await fetchReport();

		expect(funnel.every(({ users }) => users === 0)).toBe(true);
		expect(funnel.every(({ conversionRate }) => conversionRate === null)).toBe(true);
	});

	it("행은 있는데 activeUsers 지표가 없으면 조용히 0명으로 두지 않고 던진다", async () => {
		mockGa({ funnel: funnelResponse([413, 27, 6, 3, 1, 1], ["funnelStepCompletionRate"]) });

		await expect(fetchReport()).rejects.toThrow("activeUsers");
	});
});

describe("fetchWeeklyGa4Report 의 집계 조건", () => {
	it("현재·전주·과거 관측 이벤트는 production 으로 거르고 활성 사용자는 호스트만 거른다", async () => {
		mockGa({ funnel: {} });

		await fetchReport();

		const requestBodies = runReport.mock.calls.map(([request]) => request.body);
		const eventRequests = requestBodies.filter(
			(body) => body.dimensions?.[0].name === "eventName",
		);
		const activeRequests = requestBodies.filter(
			(body) => body.metrics[0].name === "activeUsers",
		);

		expect(eventRequests.map((body) => body.dateRanges)).toEqual([
			[{ startDate: week.start, endDate: week.end }],
			[{ startDate: week.previousStart, endDate: week.previousEnd }],
			[{ startDate: "2026-01-01", endDate: "2026-09-03" }],
		]);
		for (const body of eventRequests) {
			expect(body.dimensionFilter).toEqual({
				andGroup: {
					expressions: [
						HOST_NAME_FILTER,
						{
							filter: {
								fieldName: "customEvent:build_env",
								stringFilter: { matchType: "EXACT", value: "production" },
							},
						},
					],
				},
			});
		}
		expect(activeRequests).toHaveLength(2);
		for (const body of activeRequests) {
			expect(body.dimensionFilter).toEqual(HOST_NAME_FILTER);
		}
	});
});

describe("주간 리포트 표시", () => {
	const buildBlocks = async () => {
		mockGa({ funnel: funnelResponse([413, 27, 6, 3, 1, 1]) });

		const report = await fetchReport();

		return buildWeeklyReportPayload({ report, runUrl: null }).blocks;
	};

	const textOf = (blocks, title) =>
		blocks
			.map((block) => block.text?.text ?? block.elements?.[0]?.text ?? "")
			.find((text) => text.startsWith(title));

	it("퍼널 블록이 여섯 단계를 순서대로 라벨과 함께 그린다", async () => {
		const funnel = textOf(await buildBlocks(), "*퍼널*");
		const labels = [
			"확장 설치",
			"사이드 패널 열기",
			"로그인하러가기 클릭",
			"로그인 버튼 클릭",
			"가입",
			"메모 작성",
		];
		const positions = labels.map((label) => funnel.indexOf(label));

		expect(positions.every((position) => position >= 0)).toBe(true);
		expect([...positions].sort((a, b) => a - b)).toEqual(positions);
		expect(funnel).toContain("*413명*");
		expect(funnel).toContain("전 단계 대비");
	});

	it("기능별 섹션이 퍼널 단계 수만큼 제외했다고 밝히고 그 이벤트를 싣지 않는다", async () => {
		const features = textOf(await buildBlocks(), "*기능별 사용자 수*");

		expect(features).toContain("퍼널 6종 제외");
		expect(features).not.toContain("`login_start`");
		expect(features).not.toContain("`sign_up`");
		expect(features).toContain("`summary_run`");
	});

	it("context 에 순서 강제 퍼널이라는 설명이 있고 100% 초과 안내는 없다", async () => {
		const context = textOf(await buildBlocks(), "전주 비교 기간");

		expect(context).toContain("순서 강제");
		expect(context).not.toContain("100%를 넘을 수");
	});
});
