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
import {
	ACTIVE_USERS_BACKFILL_SINCE,
	EVENT_BACKFILL_SINCE,
	FUNNEL_EVENTS,
	fetchWeeklyActiveUsers,
	fetchWeeklyGa4Report,
	listWeeks,
	resolveRunPlan,
	resolveTargetWeek,
	shouldFetchEvents,
} from "./ga4-weekly.mjs";
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

describe("fetchWeeklyActiveUsers", () => {
	it("주간 리포트와 같은 호스트 필터·activeUsers 로 그 주만 조회해 숫자를 돌려준다", async () => {
		mockGa({ funnel: {} });

		const users = await fetchWeeklyActiveUsers({
			serviceAccountJson: "{}",
			propertyId: "471860782",
			week,
		});

		expect(users).toBe(430);
		expect(runReport).toHaveBeenCalledTimes(1);
		expect(runFunnelReport).not.toHaveBeenCalled();

		const { body, propertyId } = runReport.mock.calls[0][0];

		expect(propertyId).toBe("471860782");
		expect(body).toEqual({
			dateRanges: [{ startDate: week.start, endDate: week.end }],
			metrics: [{ name: "activeUsers" }],
			dimensionFilter: HOST_NAME_FILTER,
		});
	});

	it("이벤트 백필 시작 전 주는 지금 호스트에 옛 운영 웹 도메인을 더해 센다", async () => {
		mockGa({ funnel: {} });

		await fetchWeeklyActiveUsers({
			serviceAccountJson: "{}",
			propertyId: "471860782",
			week: { start: "2026-08-31", end: "2026-09-06" },
		});

		const hostNames =
			runReport.mock.calls[0][0].body.dimensionFilter.orGroup.expressions.map(
				({ filter }) => filter.stringFilter.value,
			);

		expect(hostNames).toEqual([
			"www.webmemo.xyz",
			"web-memos.vercel.app",
			"(not set)",
			"",
			"www.webmemo.site",
		]);
	});

	it("행이 없으면 0명이다", async () => {
		runReport.mockResolvedValue({});

		expect(
			await fetchWeeklyActiveUsers({
				serviceAccountJson: "{}",
				propertyId: "471860782",
				week,
			}),
		).toBe(0);
	});
});

describe("listWeeks", () => {
	// 서울 기준 2026-09-22(화) 오전. 지난주 월요일은 2026-09-14 다.
	const now = new Date("2026-09-22T00:30:00Z");

	it("백필 시작 주는 월요일이다", () => {
		expect(new Date(`${EVENT_BACKFILL_SINCE}T00:00:00Z`).getUTCDay()).toBe(1);
		expect(
			new Date(`${ACTIVE_USERS_BACKFILL_SINCE}T00:00:00Z`).getUTCDay(),
		).toBe(1);
	});

	it("from 이 활성 사용자 백필 시작 주보다 이르면 던진다", () => {
		expect(() =>
			listWeeks({ from: "2025-10-06", to: "2026-09-14", now }),
		).toThrow("2025-10-13 이후여야 합니다");
		expect(
			listWeeks({ from: "2025-10-13", to: "2025-10-13", now }),
		).toHaveLength(1);
	});

	it("from 부터 to 까지 resolveTargetWeek 와 같은 모양의 주를 오름차순으로 돌려준다", () => {
		const weeks = listWeeks({ from: "2026-08-24", to: "2026-09-14", now });

		expect(weeks.map(({ start }) => start)).toEqual([
			"2026-08-24",
			"2026-08-31",
			"2026-09-07",
			"2026-09-14",
		]);
		expect(weeks[3]).toEqual(resolveTargetWeek(now));
		expect(weeks[0]).toEqual({
			start: "2026-08-24",
			end: "2026-08-30",
			previousStart: "2026-08-17",
			previousEnd: "2026-08-23",
		});
	});

	it("연말을 넘는 범위도 7일 간격으로 이어진다", () => {
		const weeks = listWeeks({ from: "2025-12-22", to: "2026-01-05", now });

		expect(weeks.map(({ start }) => start)).toEqual([
			"2025-12-22",
			"2025-12-29",
			"2026-01-05",
		]);
	});

	it("from 과 to 가 같으면 한 주다", () => {
		expect(listWeeks({ from: "2026-09-07", to: "2026-09-07", now })).toEqual([
			{
				start: "2026-09-07",
				end: "2026-09-13",
				previousStart: "2026-08-31",
				previousEnd: "2026-09-06",
			},
		]);
	});

	it("월요일이 아니면 던진다", () => {
		expect(() => listWeeks({ from: "2026-09-08", to: "2026-09-14", now })).toThrow(
			"from 은(는) 월요일이어야 합니다: 2026-09-08",
		);
		expect(() => listWeeks({ from: "2026-09-07", to: "2026-09-13", now })).toThrow(
			"to 은(는) 월요일이어야 합니다: 2026-09-13",
		);
	});

	it("from 이 to 보다 늦으면 던진다", () => {
		expect(() => listWeeks({ from: "2026-09-14", to: "2026-09-07", now })).toThrow(
			"from(2026-09-14) 이 to(2026-09-07) 보다 늦습니다",
		);
	});

	it("to 가 끝나지 않은 주(이번 주 이후)면 던진다", () => {
		expect(() => listWeeks({ from: "2026-09-14", to: "2026-09-21", now })).toThrow(
			"2026-09-14",
		);
	});

	it("서울 기준으로 지난주를 판단한다 — UTC 로는 일요일이어도 서울이 월요일이면 한 주가 더 끝났다", () => {
		// UTC 2026-09-20(일) 23:00 = 서울 2026-09-21(월) 08:00
		const mondayMorning = new Date("2026-09-20T23:00:00Z");

		expect(
			listWeeks({ from: "2026-09-14", to: "2026-09-14", now: mondayMorning }),
		).toHaveLength(1);
	});

	it("형식이 틀리거나 없는 날짜면 던진다", () => {
		for (const from of ["2026-9-7", "20260907", "", undefined, "2026-02-30"]) {
			expect(() => listWeeks({ from, to: "2026-09-14", now })).toThrow(
				"YYYY-MM-DD",
			);
		}
	});
});

describe("resolveRunPlan", () => {
	const now = new Date("2026-09-22T00:30:00Z");

	it("크론 실행은 지난주 한 주를 정기로 기록한다", () => {
		expect(
			resolveRunPlan({ eventName: "schedule", weekFrom: "", weekTo: "", now }),
		).toEqual({
			mode: "regular",
			source: "정기",
			weeks: [resolveTargetWeek(now)],
		});
	});

	it("입력 없이 손으로 돌리면 지난주 한 주를 재실행으로 기록한다", () => {
		expect(
			resolveRunPlan({ eventName: "workflow_dispatch", weekFrom: "", weekTo: "", now }),
		).toEqual({
			mode: "regular",
			source: "재실행",
			weeks: [resolveTargetWeek(now)],
		});
		// 로컬 실행처럼 env 가 아예 없어도 같다.
		expect(resolveRunPlan({ now }).source).toBe("재실행");
	});

	it("공백뿐인 입력은 빈 값으로 본다", () => {
		expect(
			resolveRunPlan({ eventName: "workflow_dispatch", weekFrom: " ", weekTo: "", now }).mode,
		).toBe("regular");
	});

	it("from·to 가 둘 다 있으면 그 범위를 백필한다", () => {
		expect(
			resolveRunPlan({
				eventName: "workflow_dispatch",
				weekFrom: "2026-08-31",
				weekTo: "2026-09-14",
				now,
			}),
		).toEqual({
			mode: "backfill",
			source: "백필",
			weeks: listWeeks({ from: "2026-08-31", to: "2026-09-14", now }),
		});
	});

	it("from·to 중 하나만 있으면 던진다", () => {
		expect(() =>
			resolveRunPlan({ eventName: "workflow_dispatch", weekFrom: "2026-08-31", weekTo: "", now }),
		).toThrow("WEEK_FROM 과 WEEK_TO");
		expect(() =>
			resolveRunPlan({ eventName: "workflow_dispatch", weekFrom: "", weekTo: "2026-09-14", now }),
		).toThrow("WEEK_FROM 과 WEEK_TO");
	});

	it("백필 범위 검증은 listWeeks 를 따른다", () => {
		expect(() =>
			resolveRunPlan({
				eventName: "workflow_dispatch",
				weekFrom: "2026-09-14",
				weekTo: "2026-09-21",
				now,
			}),
		).toThrow("끝난 주");
	});
});

describe("shouldFetchEvents", () => {
	it("백필 시작 주부터만 이벤트·퍼널을 조회한다", () => {
		expect(shouldFetchEvents({ start: "2026-08-31" })).toBe(false);
		expect(shouldFetchEvents({ start: "2026-09-07" })).toBe(true);
		expect(shouldFetchEvents({ start: "2026-09-14" })).toBe(true);
	});
});
