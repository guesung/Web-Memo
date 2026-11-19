import type { GaDailyMetricRow } from "@web-memo/shared/hooks";
import { GA_AVERAGE_WINDOW_DAYS, GA_CORE_METRICS } from "../_constants";
import type {
	GaMetricUnit,
	GaSeriesPoint,
	GaSeriesSummary,
	GaTrendBadgeKind,
} from "../_types";

const DAY_MS = 86_400_000;

/** 지표 한 날의 값. */
interface GaDayValue {
	users: number;
	events: number | null;
}

/** 응답을 지표·날짜로 찾아보기 좋게 묶은 것. */
export interface GaMetricsIndex {
	/** 적재된 가장 최근 날짜(YYYY-MM-DD). 모든 비교의 기준일이다 */
	baseDate: string;
	/** 행이 하나라도 있는 날짜 */
	loadedDates: ReadonlySet<string>;
	/** metric → date → 값 */
	byMetric: ReadonlyMap<string, ReadonlyMap<string, GaDayValue>>;
}

/** YYYY-MM-DD를 days만큼 옮긴다. UTC 자정으로 고정해 날짜만 센다. */
export const shiftDate = (date: string, days: number) =>
	new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS)
		.toISOString()
		.slice(0, 10);

/** YYYY-MM-DD를 M/D로 줄인다. */
export const formatShortDate = (date: string) =>
	`${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;

/**
 * 어제 값과 직전 7일 평균으로 배지를 정한다.
 *
 * @description 평균이 1 미만이면 하루에 몇 건 안 나는 지표라 2배·0이 잡음이므로 배지를 달지 않는다.
 */
export const getTrendBadge = ({
	yesterday,
	average,
}: {
	yesterday: number;
	average: number | null;
}): GaTrendBadgeKind | null => {
	if (average === null || average < 1) return null;
	if (yesterday >= average * 2) return "surge";
	if (yesterday === 0) return "zero";

	return null;
};

/** 응답 행을 지표·날짜별로 묶는다. 행이 없으면 null이다(적재 전). */
export const indexGaMetrics = (
	rows: readonly GaDailyMetricRow[],
): GaMetricsIndex | null => {
	if (rows.length === 0) return null;

	const loadedDates = new Set<string>();
	const byMetric = new Map<string, Map<string, GaDayValue>>();
	let baseDate = rows[0].date;

	for (const row of rows) {
		loadedDates.add(row.date);
		if (row.date > baseDate) baseDate = row.date;

		const days = byMetric.get(row.metric) ?? new Map<string, GaDayValue>();
		days.set(row.date, { users: row.users, events: row.events });
		byMetric.set(row.metric, days);
	}

	return { baseDate, loadedDates, byMetric };
};

/**
 * 기준일까지 `days`일을 하루도 빠짐없이 깔고, 지표 값을 채운다.
 *
 * @description 행이 하나도 없는 날은 적재가 빠진 날이라 null이다. 적재된 날에 그 지표 행만 없으면
 * GA가 0건인 이벤트의 행을 주지 않은 것이므로 0이다. 건수 단위에서 건수가 없는 지표는 전부 null이다.
 */
export const buildSeries = ({
	index,
	metric,
	unit,
	days,
}: {
	index: GaMetricsIndex;
	metric: string;
	unit: GaMetricUnit;
	days: number;
}): GaSeriesPoint[] => {
	const metricDays = index.byMetric.get(metric);

	return Array.from({ length: days }, (_, position) => {
		const date = shiftDate(index.baseDate, position - (days - 1));

		if (!index.loadedDates.has(date)) return { date, value: null };

		const day = metricDays?.get(date);

		if (!day) return { date, value: 0 };

		return { date, value: unit === "users" ? day.users : day.events };
	});
};

/** 기준일 값과 그 직전 7일(적재된 날만) 평균을 비교한다. */
export const summarizeSeries = (
	series: readonly GaSeriesPoint[],
): GaSeriesSummary => {
	const yesterday = series.at(-1)?.value ?? 0;
	const previous = series
		.slice(-1 - GA_AVERAGE_WINDOW_DAYS, -1)
		.flatMap((point) => (point.value === null ? [] : [point.value]));
	const average =
		previous.length === 0
			? null
			: previous.reduce((sum, value) => sum + value, 0) / previous.length;
	const deltaPercent =
		average === null || average === 0
			? null
			: Math.round(((yesterday - average) / average) * 100);

	return {
		yesterday,
		average,
		deltaPercent,
		badge: getTrendBadge({ yesterday, average }),
	};
};

/** 카드 12종에 없는 지표 이름을 가나다순으로 뽑는다. */
export const listOtherMetrics = (index: GaMetricsIndex): string[] => {
	const coreKeys = new Set<string>(GA_CORE_METRICS.map(({ key }) => key));

	return [...index.byMetric.keys()]
		.filter((metric) => !coreKeys.has(metric))
		.sort();
};
