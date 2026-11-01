// @ts-nocheck — .mjs 스크립트를 직접 import 하는 테스트라 타입 선언이 없습니다.
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildSummaryRow } from "./ga4-sheet.mjs";
import {
	fetchMemoRetention,
	readSupabaseUrl,
	summarizeRetention,
} from "./memo-retention.mjs";
import { buildWeeklyReportPayload } from "./weekly-report-blocks.mjs";

const week = {
	start: "2026-10-19",
	end: "2026-10-25",
	previousStart: "2026-10-12",
	previousEnd: "2026-10-18",
};

/** 코호트 세 개: 4주 전(10명), 2주 전(5명), 대상 주(3명). */
const rows = [
	{ cohort_week: "2026-09-21", cohort_size: 10, week_offset: 0, active_users: 10 },
	{ cohort_week: "2026-09-21", cohort_size: 10, week_offset: 1, active_users: 4 },
	{ cohort_week: "2026-09-21", cohort_size: 10, week_offset: 4, active_users: 2 },
	{ cohort_week: "2026-10-05", cohort_size: 5, week_offset: 0, active_users: 5 },
	{ cohort_week: "2026-10-05", cohort_size: 5, week_offset: 1, active_users: 1 },
	{ cohort_week: "2026-10-05", cohort_size: 5, week_offset: 2, active_users: 2 },
	{ cohort_week: "2026-10-19", cohort_size: 3, week_offset: 0, active_users: 3 },
];

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe("summarizeRetention", () => {
	it("경과 주마다 관측할 수 있는 코호트만 모수로 합친다", () => {
		expect(summarizeRetention({ rows, weekStart: week.start })).toEqual({
			newCreators: 3,
			offsets: [
				// 대상 주 코호트(3명)는 아직 1주가 지나지 않아 빠진다.
				{ offset: 1, cohortUsers: 15, retainedUsers: 5, rate: 5 / 15 },
				// 9/21 코호트는 2주 차 행이 없으므로 0명으로 읽는다.
				{ offset: 2, cohortUsers: 15, retainedUsers: 2, rate: 2 / 15 },
				// 4주가 지난 코호트는 9/21 하나뿐이다.
				{ offset: 4, cohortUsers: 10, retainedUsers: 2, rate: 2 / 10 },
			],
		});
	});

	it("관측할 코호트가 없으면 잔존율을 null 로 둔다", () => {
		const summary = summarizeRetention({ rows: [], weekStart: week.start });

		expect(summary.newCreators).toBe(0);
		expect(summary.offsets.every(({ rate }) => rate === null)).toBe(true);
	});
});

describe("fetchMemoRetention", () => {
	it("키가 없으면 조회하지 않고 null 을 돌려준다", async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);
		vi.spyOn(console, "warn").mockImplementation(() => {});

		expect(await fetchMemoRetention({ serviceRoleKey: undefined, week })).toBe(
			null,
		);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("memo 스키마의 집계 RPC 를 service_role 키로 부른다", async () => {
		const fetchMock = vi.fn(async () => ({
			ok: true,
			json: async () => rows,
		}));
		vi.stubGlobal("fetch", fetchMock);

		const summary = await fetchMemoRetention({ serviceRoleKey: "key", week });

		expect(summary.newCreators).toBe(3);
		const [url, options] = fetchMock.mock.calls[0];
		expect(url).toBe(
			`${readSupabaseUrl()}/rest/v1/rpc/weekly_creation_retention`,
		);
		expect(options.headers).toMatchObject({
			apikey: "key",
			authorization: "Bearer key",
			"content-profile": "memo",
		});
		expect(JSON.parse(options.body)).toEqual({
			p_week_start: "2026-10-19",
			p_weeks: 8,
		});
	});
});

describe("리텐션 출력", () => {
	const summary = summarizeRetention({ rows, weekStart: week.start });

	it("요약 행에 처음 쓴 사람과 경과 주별 잔존율 칸을 붙인다", () => {
		const row = buildSummaryRow({
			week,
			activeUsers: 74,
			funnel: null,
			retention: summary,
			recordedAt: "2026-10-26 08:00",
			source: "정기",
		});

		expect(row).toMatchObject({
			"리텐션: 처음 쓴 사람": 3,
			"리텐션: 1주 잔존율": 5 / 15,
			"리텐션: 2주 잔존율": 2 / 15,
			"리텐션: 4주 잔존율": 2 / 10,
		});
	});

	it("리텐션을 조회하지 않았으면 기존 값을 지우지 않도록 칸을 넣지 않는다", () => {
		const row = buildSummaryRow({
			week,
			activeUsers: 74,
			funnel: null,
			recordedAt: "2026-10-26 08:00",
			source: "정기",
		});

		expect(Object.keys(row).some((key) => key.startsWith("리텐션"))).toBe(
			false,
		);
	});

	const report = {
		start: week.start,
		end: week.end,
		previousStart: week.previousStart,
		previousEnd: week.previousEnd,
		eventNames: [],
		activeUsers: { current: 74, previous: 89 },
		features: [],
		funnel: [],
		unused: { never: [], rare: [], fresh: [] },
		thresholds: { RARE_RATIO: 0.01, RARE_MAX_USERS: 5, NEW_EVENT_WINDOW_DAYS: 14 },
	};

	it("Slack 리포트에 잔존율과 인원을 함께 싣는다", () => {
		const payload = buildWeeklyReportPayload({
			report,
			retention: summary,
			runUrl: null,
			sheetUrl: null,
		});
		const text = payload.blocks
			.map((block) => block.text?.text ?? "")
			.find((value) => value.startsWith("*메모 리텐션*"));

		expect(text).toContain("이번 주 처음 쓴 사람  *3명*");
		expect(text).toContain("1주 뒤  *33.3%*  (5/15명)");
		expect(text).toContain("4주 뒤  *20.0%*  (2/10명)");
	});

	it("리텐션이 없으면 Slack 리포트에서 섹션째로 뺀다", () => {
		const payload = buildWeeklyReportPayload({
			report,
			runUrl: null,
			sheetUrl: null,
		});

		expect(
			payload.blocks.some((block) =>
				block.text?.text?.startsWith("*메모 리텐션*"),
			),
		).toBe(false);
	});
});
