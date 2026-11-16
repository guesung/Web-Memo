// @ts-nocheck — .mjs 스크립트를 직접 import 하는 테스트라 타입 선언이 없습니다.
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
	buildDailyInsightContext,
	buildWeeklyInsightContext,
	INFLATED_EVENTS,
	pickRecentWeeks,
	writeInsightContext,
	writeInsightOutputs,
} from "./insight-context.mjs";

const SLACK = { channel: "C1", ts: "1794792439.053239" };

const stat = (users, count) => ({
	users: { yesterday: users[0], average7: users[1] },
	count: { yesterday: count[0], average7: count[1] },
});

const dailyReport = {
	targetDate: "2026-11-15",
	events: {
		memo_write: stat([4, 3.1], [220, 40.5]),
		memo_search: stat([0, 0], [0, 0]),
		login: stat([0, 0.4], [0, 0.6]),
	},
	outliers: [{ eventName: "memo_write", yesterday: 220, average7: 40.5, kind: "spiked" }],
	unreleasedEvents: ["guide_finish"],
	observationStart: "2026-01-01",
	observationTruncated: false,
	trafficTotals: { page_view: 310 },
	googleSearch: { status: "ok", users: 12 },
};

let directory;

afterEach(async () => {
	if (directory) {
		await rm(directory, { recursive: true, force: true });
		directory = undefined;
	}
});

describe("buildDailyInsightContext", () => {
	it("리포트 수치와 게시된 메시지 위치를 함께 싣는다", () => {
		const context = buildDailyInsightContext({
			report: dailyReport,
			searchQueries: { status: "skipped" },
			slack: SLACK,
			runUrl: "https://github.com/o/r/actions/runs/1",
		});

		expect(context).toMatchObject({
			kind: "daily",
			targetDate: "2026-11-15",
			slack: SLACK,
			runUrl: "https://github.com/o/r/actions/runs/1",
			inflatedEvents: INFLATED_EVENTS,
			outliers: dailyReport.outliers,
			unreleasedEvents: ["guide_finish"],
			observation: { start: "2026-01-01", truncated: false },
			trafficTotals: { page_view: 310 },
			googleSearch: { status: "ok", users: 12 },
			searchQueries: { status: "skipped" },
		});
	});

	it("어제와 7일 평균이 모두 0 인 이벤트는 빼고, 평균만 있는 이벤트는 남긴다", () => {
		const { events } = buildDailyInsightContext({
			report: dailyReport,
			slack: SLACK,
			runUrl: null,
		});

		expect(Object.keys(events)).toEqual(["memo_write", "login"]);
	});

	it("자동저장으로 부풀려지는 이벤트 네 종을 알려 준다", () => {
		expect(INFLATED_EVENTS).toEqual([
			"memo_write",
			"memo_content_saved",
			"memo_save_result",
			"memo_editor_ready",
		]);
	});
});

describe("pickRecentWeeks", () => {
	const rows = [
		{ "주 시작일": "2026-11-14", "활성 사용자": 61 },
		{ "주 시작일": "2026-10-26", "활성 사용자": 50 },
		{ "주 시작일": "2026-11-07", "활성 사용자": 57 },
		{ "주 시작일": "2026-11-21", "활성 사용자": 70 },
		{ "주 시작일": 46340, "활성 사용자": 1 },
		{ "주 시작일": "", "활성 사용자": 2 },
	];

	it("그 주까지의 행만 오래된 순으로 고른다", () => {
		expect(
			pickRecentWeeks({ rows, weekStart: "2026-11-14" }).map(
				(row) => row["주 시작일"],
			),
		).toEqual(["2026-10-26", "2026-11-07", "2026-11-14"]);
	});

	it("count 를 넘으면 최근 것만 남긴다", () => {
		expect(
			pickRecentWeeks({ rows, weekStart: "2026-11-14", count: 2 }).map(
				(row) => row["주 시작일"],
			),
		).toEqual(["2026-11-07", "2026-11-14"]);
	});
});

describe("buildWeeklyInsightContext", () => {
	const report = {
		start: "2026-11-07",
		end: "2026-11-13",
		previousStart: "2026-10-31",
		previousEnd: "2026-11-06",
		eventNames: ["memo_write"],
		activeUsers: { current: 61, previous: 57 },
		features: [{ eventName: "memo_write", users: 20, previousUsers: 18, count: 400, previousCount: 380 }],
		funnel: [{ eventName: "extension_installed", users: 30 }],
		channels: { status: "ok", rows: [] },
		unused: { never: [], rare: [], fresh: [] },
		thresholds: { RARE_RATIO: 0.02 },
	};

	it("주 범위·수치·리텐션·추이를 싣고 이벤트 이름 전체 목록은 싣지 않는다", () => {
		const trendRows = [{ "주 시작일": "2026-11-07", "활성 사용자": 61 }];
		const context = buildWeeklyInsightContext({
			report,
			retention: { newCreators: 9, offsets: [] },
			trendRows,
			slack: SLACK,
			runUrl: null,
		});

		expect(context).toMatchObject({
			kind: "weekly",
			week: {
				start: "2026-11-07",
				end: "2026-11-13",
				previousStart: "2026-10-31",
				previousEnd: "2026-11-06",
			},
			slack: SLACK,
			activeUsers: { current: 61, previous: 57 },
			features: report.features,
			funnel: report.funnel,
			retention: { newCreators: 9, offsets: [] },
		});
		expect(context.trend.rows).toEqual(trendRows);
		expect(context).not.toHaveProperty("eventNames");
	});

	it("시트를 읽지 못한 실행은 추이 행이 null 이다", () => {
		const context = buildWeeklyInsightContext({
			report,
			retention: null,
			trendRows: null,
			slack: SLACK,
			runUrl: null,
		});

		expect(context.trend.rows).toBeNull();
		expect(context.retention).toBeNull();
	});
});

describe("writeInsightContext · writeInsightOutputs", () => {
	it("없는 폴더를 만들어 JSON 으로 남긴다", async () => {
		directory = await mkdtemp(join(tmpdir(), "ga-insight-"));
		const path = join(directory, "nested", "insight-context.json");

		await writeInsightContext({ path, context: { kind: "daily" } });

		expect(JSON.parse(await readFile(path, "utf8"))).toEqual({ kind: "daily" });
	});

	it("AI 단계를 가르는 output 을 덧붙인다", async () => {
		directory = await mkdtemp(join(tmpdir(), "ga-insight-"));
		const outputPath = join(directory, "output");

		await writeInsightOutputs({ ready: true, via: "bot", outputPath });
		await writeInsightOutputs({ ready: false, via: "webhook", outputPath });

		expect(await readFile(outputPath, "utf8")).toBe(
			"insight_ready=true\nposted_via=bot\ninsight_ready=false\nposted_via=webhook\n",
		);
	});

	it("GITHUB_OUTPUT 이 없는 로컬 실행에서는 아무것도 쓰지 않는다", async () => {
		await expect(
			writeInsightOutputs({ ready: true, via: "bot", outputPath: undefined }),
		).resolves.toBeUndefined();
	});
});
