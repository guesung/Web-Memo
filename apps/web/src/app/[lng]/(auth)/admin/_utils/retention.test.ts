import type {
	MonthlyRewriteRateRow,
	WeeklyRetentionRow,
} from "@web-memo/shared/hooks";
import { describe, expect, it } from "vitest";
import {
	averageRetention,
	buildMonthlyBars,
	buildQuarterSummaries,
	buildWeeklyCohorts,
	getMonthlyRateCeiling,
	getRetentionLevel,
} from "./retention";

const weekly = (
	cohort_week: string,
	cohort_size: number,
	week_offset: number,
	active_users: number,
): WeeklyRetentionRow => ({
	cohort_week,
	cohort_size,
	week_offset,
	active_users,
});

describe("buildWeeklyCohorts", () => {
	const cohorts = buildWeeklyCohorts({
		rows: [
			weekly("2026-11-07", 4, 0, 4),
			weekly("2026-10-31", 10, 0, 10),
			weekly("2026-10-31", 10, 1, 3),
		],
		weekStart: "2026-11-07",
		weeks: 3,
	});

	it("오래된 주가 위에 온다", () => {
		expect(cohorts.map((cohort) => cohort.week)).toEqual([
			"2026-10-31",
			"2026-11-07",
		]);
	});

	it("끝나지 않은 주는 null, 끝났는데 행이 없는 주는 0%다", () => {
		expect(cohorts[0].cells).toEqual([
			{ offset: 0, activeUsers: 10, percent: 100 },
			{ offset: 1, activeUsers: 3, percent: 30 },
			null,
		]);
		expect(cohorts[1].cells).toEqual([
			{ offset: 0, activeUsers: 4, percent: 100 },
			null,
			null,
		]);
	});

	it("1주 뒤 평균은 끝난 칸만 센다", () => {
		expect(averageRetention(cohorts, 1)).toBe(30);
		expect(averageRetention(cohorts, 2)).toBeNull();
	});
});

describe("getRetentionLevel", () => {
	it("경계값에서 단계가 바뀐다", () => {
		expect([0, 9, 10, 24, 25, 39, 40, 100].map(getRetentionLevel)).toEqual([
			1, 1, 2, 2, 3, 3, 4, 4,
		]);
	});
});

const monthly = (
	cohort_month: string,
	new_writers: number,
	rewriters: number,
	incomplete = false,
): MonthlyRewriteRateRow => ({
	cohort_month,
	new_writers,
	rewriters,
	incomplete,
});

describe("buildMonthlyBars", () => {
	it("10명 미만은 small, 비율은 소수 한 자리다", () => {
		const bars = buildMonthlyBars([
			monthly("2026-09-01", 9, 1),
			monthly("2026-10-01", 26, 10, true),
		]);

		expect(bars).toEqual([
			{
				label: "26-09",
				newWriters: 9,
				rewriters: 1,
				percent: 11.1,
				incomplete: false,
				small: true,
			},
			{
				label: "26-10",
				newWriters: 26,
				rewriters: 10,
				percent: 38.5,
				incomplete: true,
				small: false,
			},
		]);
	});

	it("Y축 상한은 최소 40이고 넘으면 10 단위로 오른다", () => {
		expect(
			getMonthlyRateCeiling(buildMonthlyBars([monthly("2026-09-01", 10, 1)])),
		).toBe(40);
		expect(
			getMonthlyRateCeiling(buildMonthlyBars([monthly("2026-09-01", 10, 5)])),
		).toBe(50);
	});
});

describe("buildQuarterSummaries", () => {
	const rows = [
		monthly("2024-11-01", 30, 3),
		monthly("2024-12-01", 10, 1),
		monthly("2025-09-01", 40, 4),
		monthly("2025-12-01", 20, 4),
		monthly("2026-03-01", 10, 2),
		monthly("2026-09-01", 10, 2),
		monthly("2026-10-01", 50, 40, true),
	];

	it("끝난 최근 4분기와 그 앞 4분기를 합산한다", () => {
		const { recent, prior } = buildQuarterSummaries(rows);

		expect(recent).toMatchObject({
			from: { year: 2025, quarter: 4 },
			to: { year: 2026, quarter: 3 },
			newWriters: 40,
			rewriters: 8,
			percent: 20,
		});
		expect(prior).toMatchObject({
			from: { year: 2024, quarter: 4 },
			to: { year: 2025, quarter: 3 },
			newWriters: 80,
			rewriters: 8,
			percent: 10,
		});
	});

	it("끝난 분기가 없으면 둘 다 null이다", () => {
		expect(buildQuarterSummaries([monthly("2026-10-01", 5, 1, true)])).toEqual({
			recent: null,
			prior: null,
		});
	});
});
