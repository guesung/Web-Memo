import type { GaDailyMetricRow } from "@web-memo/shared/hooks";
import { describe, expect, it } from "vitest";
import { findMissingRanges } from "./gaFormat";
import {
	buildSeries,
	type GaMetricsIndex,
	getTrendBadge,
	indexGaMetrics,
	listOtherMetrics,
	summarizeSeries,
} from "./gaMetrics";

describe("getTrendBadge", () => {
	it("평균이 1이고 어제가 평균의 2배면 급등이다", () => {
		expect(getTrendBadge({ yesterday: 2, average: 1 })).toBe("surge");
	});

	it("평균이 1 미만이면 어제가 2배여도 배지가 없다", () => {
		expect(getTrendBadge({ yesterday: 2, average: 0.9 })).toBeNull();
	});

	it("평균이 1이고 어제가 0이면 0건이다", () => {
		expect(getTrendBadge({ yesterday: 0, average: 1 })).toBe("zero");
	});

	it("평균이 0이고 어제도 0이면 배지가 없다", () => {
		expect(getTrendBadge({ yesterday: 0, average: 0 })).toBeNull();
	});

	it("비교할 평균이 없으면 배지가 없다", () => {
		expect(getTrendBadge({ yesterday: 5, average: null })).toBeNull();
	});
});

const row = (
	date: string,
	metric: string,
	users: number,
	events: number | null = null,
): GaDailyMetricRow => ({ date, metric, users, events });

describe("buildSeries", () => {
	const index = indexGaMetrics([
		row("2026-11-16", "login", 3, 4),
		row("2026-11-18", "login", 1, 1),
		row("2026-11-18", "sign_up", 2, 2),
		row("2026-11-17", "sign_up", 1, 1),
	]);

	if (!index) throw new Error("행이 있으면 인덱스가 만들어져야 한다");

	it("행이 하나도 없는 날은 null, 적재된 날에 지표 행만 없으면 0이다", () => {
		expect(
			buildSeries({
				index,
				metric: "login",
				unit: "users",
				days: 4,
			}),
		).toEqual([
			{ date: "2026-11-15", value: null },
			{ date: "2026-11-16", value: 3 },
			{ date: "2026-11-17", value: 0 },
			{ date: "2026-11-18", value: 1 },
		]);
	});

	it("기준일은 응답에서 가장 늦은 날짜다", () => {
		expect(index.baseDate).toBe("2026-11-18");
	});

	it("행이 없으면 인덱스가 없다", () => {
		expect(indexGaMetrics([])).toBeNull();
	});
});

describe("summarizeSeries", () => {
	it("기준일 직전 7일의 적재된 날만 평균 낸다", () => {
		const series = [
			{ date: "d1", value: 100 },
			{ date: "d2", value: null },
			{ date: "d3", value: 2 },
			{ date: "d4", value: 4 },
			{ date: "d5", value: 6 },
		];

		expect(summarizeSeries(series)).toEqual({
			yesterday: 6,
			average: (100 + 2 + 4) / 3,
			deltaPercent: Math.round(((6 - 106 / 3) / (106 / 3)) * 100),
			badge: null,
		});
	});

	it("평균이 0이면 증감률이 없다", () => {
		const summary = summarizeSeries([
			{ date: "d1", value: 0 },
			{ date: "d2", value: 3 },
		]);

		expect(summary.deltaPercent).toBeNull();
	});
});

describe("listOtherMetrics", () => {
	it("카드 12종을 뺀 지표를 이름순으로 돌려준다", () => {
		const index = indexGaMetrics([
			row("2026-11-18", "login", 1),
			row("2026-11-18", "tab_change", 1),
			row("2026-11-18", "memo_delete", 1),
		]);

		expect(listOtherMetrics(index as GaMetricsIndex)).toEqual([
			"memo_delete",
			"tab_change",
		]);
	});
});

describe("findMissingRanges", () => {
	it("null이 이어진 날을 한 구간으로 묶는다", () => {
		const series = [null, 1, null, null, 2, null].map((value, position) => ({
			date: String(position),
			value,
		}));

		expect(findMissingRanges(series)).toEqual([
			{ start: 0, end: 0 },
			{ start: 2, end: 3 },
			{ start: 5, end: 5 },
		]);
	});
});
