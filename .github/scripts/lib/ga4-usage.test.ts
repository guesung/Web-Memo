// @ts-nocheck — .mjs 스크립트를 직접 import 하는 테스트라 타입 선언이 없습니다.
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./ga4-client.mjs", async (importOriginal) => ({
	...(await importOriginal()),
	runReport: vi.fn(),
}));
vi.mock("./google-auth.mjs", () => ({
	exchangeServiceAccountToken: vi.fn(async () => "token"),
}));

import { HOST_NAME_FILTER, runReport } from "./ga4-client.mjs";
import {
	assertValidPeriod,
	buildUsageReport,
	countDays,
	fetchFeatureUsage,
	formatUsageCsv,
	formatUsageTable,
	resolvePreviousPeriod,
} from "./ga4-usage.mjs";

/** GA 응답(REST)의 행 모양. [이벤트, 사용자, 발생 수] */
const eventReport = (rows: Array<[string, number, number]>) => ({
	rows: rows.map(([eventName, users, events]) => ({
		dimensionValues: [{ value: eventName }],
		metricValues: [{ value: String(users) }, { value: String(events) }],
	})),
});

const activeReport = (users: number) => ({
	rows: [{ metricValues: [{ value: String(users) }] }],
});

const period = { start: "2026-09-11", end: "2026-09-17" };
const previousPeriod = { start: "2026-09-04", end: "2026-09-10" };

/**
 * 2026-09-11~17 을 GA MCP 로 실제 조회한 값(운영 웹 + 확장 허용 목록). 활성 사용자는
 * 이번 430명, 직전 84명입니다. type.ts 에 없는 자동 수집 이벤트(page_view 등)는
 * 함수가 무시해야 하므로 일부러 섞어 둡니다.
 */
const current = eventReport([
	["extension_installed", 390, 742],
	["page_view", 65, 248],
	["side_panel_open", 35, 114],
	["login_start", 7, 10],
	["summary_run", 7, 18],
	["memo_write", 4, 130],
	["memo_status_toggle", 3, 204],
	["sign_up", 2, 2],
]);
const previous = eventReport([
	["page_view", 73, 166],
	["side_panel_open", 40, 71],
	["memo_write", 8, 578],
	["login_start", 3, 4],
	["extension_installed", 2, 2],
]);

const eventNames = [
	"extension_installed",
	"side_panel_open",
	"login_start",
	"summary_run",
	"memo_write",
	"memo_status_toggle",
	"sign_up",
	"export_run", // 조회 기간에 한 번도 안 쓰인 기능
];

const buildReport = (overrides = {}) =>
	buildUsageReport({
		eventNames,
		period,
		previousPeriod,
		current,
		previous,
		currentActive: activeReport(430),
		previousActive: activeReport(84),
		...overrides,
	});

const findRow = (report, eventName) =>
	report.rows.find((row) => row.eventName === eventName);

beforeEach(() => {
	vi.clearAllMocks();
});

describe("fetchFeatureUsage", () => {
	it("현재·직전 이벤트는 production 조건을 적용하고 활성 사용자에는 호스트만 적용한다", async () => {
		runReport.mockResolvedValue({});

		await fetchFeatureUsage({
			serviceAccountJson: "{}",
			propertyId: "471860782",
			period,
		});

		expect(runReport).toHaveBeenCalledTimes(4);
		const requestBodies = runReport.mock.calls.map(([request]) => request.body);
		const eventRequests = requestBodies.filter(
			(body) => body.dimensions?.[0].name === "eventName",
		);
		const activeRequests = requestBodies.filter(
			(body) => body.metrics[0].name === "activeUsers",
		);

		expect(eventRequests.map((body) => body.dateRanges)).toEqual([
			[{ startDate: period.start, endDate: period.end }],
			[{ startDate: previousPeriod.start, endDate: previousPeriod.end }],
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

describe("buildUsageReport", () => {
	it("사용자 수·발생 수·사용자당 횟수·도입률·증감을 계산한다", () => {
		const row = findRow(buildReport(), "side_panel_open");

		expect(row.users).toBe(35);
		expect(row.events).toBe(114);
		expect(row.eventsPerUser).toBeCloseTo(114 / 35);
		expect(row.adoptionRate).toBeCloseTo(35 / 430);
		expect(row.previousUsers).toBe(40);
		expect(row.change).toBeCloseTo((35 - 40) / 40);
	});

	it("직전 기간에 없던 기능은 증감을 null 로 둔다", () => {
		const row = findRow(buildReport(), "sign_up");

		expect(row.previousUsers).toBe(0);
		expect(row.change).toBeNull();
	});

	it("기간 안에 한 번도 안 쓰인 기능도 0명 행으로 남긴다", () => {
		const row = findRow(buildReport(), "export_run");

		expect(row).toEqual({
			eventName: "export_run",
			users: 0,
			events: 0,
			eventsPerUser: null,
			adoptionRate: 0,
			previousUsers: 0,
			change: null,
		});
	});

	it("type.ts 에 없는 자동 수집 이벤트는 행에 넣지 않는다", () => {
		const names = buildReport().rows.map((row) => row.eventName);

		expect(names).not.toContain("page_view");
		expect(names).toHaveLength(eventNames.length);
	});

	it("사용자 수 내림차순, 같으면 발생 수 내림차순으로 정렬한다", () => {
		const names = buildReport().rows.map((row) => row.eventName);

		expect(names.slice(0, 3)).toEqual([
			"extension_installed",
			"side_panel_open",
			"summary_run", // 7명·18건이 login_start 7명·10건보다 앞
		]);
		expect(names[3]).toBe("login_start");
	});

	it("활성 사용자가 0 이면 도입률을 0 이 아니라 null 로 둔다", () => {
		const report = buildReport({ currentActive: activeReport(0) });

		expect(findRow(report, "side_panel_open").adoptionRate).toBeNull();
	});

	it("응답에 행이 없어도 던지지 않고 전부 0명으로 낸다", () => {
		const report = buildReport({
			current: {},
			previous: {},
			currentActive: {},
			previousActive: {},
		});

		expect(report.activeUsers).toEqual({ current: 0, previous: 0 });
		expect(report.rows.every((row) => row.users === 0)).toBe(true);
	});
});

describe("기간 계산", () => {
	it("직전 기간은 같은 길이로 바로 앞선다", () => {
		expect(resolvePreviousPeriod(period)).toEqual(previousPeriod);
		expect(
			resolvePreviousPeriod({ start: "2026-09-01", end: "2026-09-01" }),
		).toEqual({ start: "2026-08-31", end: "2026-08-31" });
	});

	it("월을 넘겨도 정확하다", () => {
		expect(
			resolvePreviousPeriod({ start: "2026-03-01", end: "2026-03-10" }),
		).toEqual({ start: "2026-02-19", end: "2026-02-28" });
	});

	it("일수는 양 끝을 모두 센다", () => {
		expect(countDays("2026-09-11", "2026-09-17")).toBe(7);
		expect(countDays("2026-09-01", "2026-09-01")).toBe(1);
	});

	it("존재하지 않는 날짜와 뒤집힌 기간을 거절한다", () => {
		expect(() =>
			assertValidPeriod({ start: "2026-02-30", end: "2026-03-05" }),
		).toThrow("실제 날짜");
		expect(() =>
			assertValidPeriod({ start: "2026-09-10", end: "2026-09-01" }),
		).toThrow("늦습니다");
		expect(() =>
			assertValidPeriod({ start: "9/1/2026", end: "2026-09-05" }),
		).toThrow("실제 날짜");
		expect(() => assertValidPeriod(period)).not.toThrow();
	});
});

describe("출력 형식", () => {
	it("표는 모든 줄의 열이 같은 위치에서 시작한다", () => {
		const lines = formatUsageTable(buildReport()).split("\n");
		const header = lines.find((line) => line.startsWith("event"));
		const dataLines = lines.slice(lines.indexOf(header) + 2);

		expect(lines[0]).toContain("기간 2026-09-11 ~ 2026-09-17 (7일)");
		expect(lines[0]).toContain("활성 사용자 430명");
		expect(lines[1]).toContain("직전 2026-09-04 ~ 2026-09-10");
		// 마지막 열 오른쪽 끝이 모든 줄에서 같아야 오른쪽 정렬이 맞은 것이다.
		const ends = new Set([header, ...dataLines].map((line) => line.length));

		expect(ends.size).toBe(1);
	});

	it("표에서 계산할 수 없는 값은 -, 증감은 부호를 붙여 그린다", () => {
		const table = formatUsageTable(buildReport());
		const exportLine = table.split("\n").find((line) => line.startsWith("export_run"));
		const sidePanelLine = table
			.split("\n")
			.find((line) => line.startsWith("side_panel_open"));

		expect(exportLine).toMatch(/-\s+0\.0%\s+0\s+-$/);
		// (35 - 40) / 40 = -12.5%. Math.round 는 -12.5 를 -12 로 올림해 주간 리포트와 같다.
		expect(sidePanelLine).toContain("-12%");
	});

	it("CSV 는 반올림하지 않은 원값을 내고 null 은 빈 칸이다", () => {
		const lines = formatUsageCsv(buildReport()).split("\n");

		expect(lines[0]).toBe(
			"event,users,events,events_per_user,adoption_rate,previous_users,change",
		);
		expect(lines).toHaveLength(1 + eventNames.length);
		expect(lines.find((line) => line.startsWith("export_run"))).toBe(
			"export_run,0,0,,0,0,",
		);
		expect(
			Number(lines.find((line) => line.startsWith("side_panel_open")).split(",")[4]),
		).toBeCloseTo(35 / 430, 10);
	});
});
