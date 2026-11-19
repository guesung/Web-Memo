import type {
	MonthlyRewriteRateRow,
	WeeklyRetentionRow,
} from "@web-memo/shared/hooks";
import {
	MONTHLY_RATE_MIN_CEILING,
	QUARTER_WINDOW,
	SMALL_MONTH_WRITERS,
} from "../_constants";
import type {
	MonthlyRewriteBar,
	QuarterSummary,
	WeeklyCohortRow,
	YearQuarter,
} from "../_types";
import { shiftDate } from "./gaMetrics";

/** 인원 대비 비율을 소수 한 자리 %로 만든다. 인원이 없으면 0이다. */
const toRatePercent = (part: number, whole: number) =>
	whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0;

/** 코호트 인원 대비 활동 인원을 정수 %로 만든다. 인원이 없으면 0이다. */
const toPercent = (part: number, whole: number) =>
	whole > 0 ? Math.round((part / whole) * 100) : 0;

/**
 * 응답 행을 코호트 주별 표로 만든다. 오래된 주가 위다.
 *
 * @description `weekStart`는 마지막으로 끝난 주의 시작일이다. 코호트 주 + 7×offset이 그보다 늦은 칸은
 * 아직 오지 않은 주라 null이다. 끝난 주인데 응답에 행이 없으면 그 주에 아무도 안 왔다는 뜻이라 0%다.
 */
export const buildWeeklyCohorts = ({
	rows,
	weekStart,
	weeks,
}: {
	rows: readonly WeeklyRetentionRow[];
	weekStart: string;
	weeks: number;
}): WeeklyCohortRow[] => {
	const byWeek = new Map<string, WeeklyRetentionRow[]>();

	for (const row of rows) {
		byWeek.set(row.cohort_week, [...(byWeek.get(row.cohort_week) ?? []), row]);
	}

	return [...byWeek.keys()].sort().map((week) => {
		const weekRows = byWeek.get(week) ?? [];
		const size = Math.max(...weekRows.map((row) => row.cohort_size));

		const cells = Array.from({ length: weeks }, (_, offset) => {
			if (shiftDate(week, 7 * offset) > weekStart) return null;

			const activeUsers =
				weekRows.find((row) => row.week_offset === offset)?.active_users ?? 0;

			return {
				offset,
				activeUsers,
				percent: toPercent(activeUsers, size),
			};
		});

		return { week, size, cells };
	});
};

/** 끝난 칸만 모아 offset주 뒤 비율의 평균(%)을 낸다. 비교할 코호트가 없으면 null이다. */
export const averageRetention = (
	cohorts: readonly WeeklyCohortRow[],
	offset: number,
): number | null => {
	const percents = cohorts.flatMap((cohort) => {
		const cell = cohort.cells[offset];

		return cell && cohort.size > 0 ? [cell.percent] : [];
	});

	if (percents.length === 0) return null;

	return Math.round(
		percents.reduce((sum, percent) => sum + percent, 0) / percents.length,
	);
};

/** 비율을 색 단계로 나눈다. 0은 0주 뒤(=코호트 전체) 칸이라 따로 취급한다. */
export const getRetentionLevel = (percent: number): 1 | 2 | 3 | 4 => {
	if (percent >= 40) return 4;
	if (percent >= 25) return 3;
	if (percent >= 10) return 2;

	return 1;
};

/** 월별 행을 막대 그래프 데이터로 만든다. 오래된 달이 왼쪽이다. */
export const buildMonthlyBars = (
	rows: readonly MonthlyRewriteRateRow[],
): MonthlyRewriteBar[] =>
	[...rows]
		.sort((a, b) => a.cohort_month.localeCompare(b.cohort_month))
		.map((row) => ({
			label: row.cohort_month.slice(2, 7),
			newWriters: row.new_writers,
			rewriters: row.rewriters,
			percent: toRatePercent(row.rewriters, row.new_writers),
			incomplete: row.incomplete,
			small: row.new_writers < SMALL_MONTH_WRITERS,
		}));

/** Y축 상한(%). 기본 40이고 값이 넘으면 10 단위로 올린다. */
export const getMonthlyRateCeiling = (bars: readonly MonthlyRewriteBar[]) =>
	Math.max(
		MONTHLY_RATE_MIN_CEILING,
		Math.ceil(Math.max(...bars.map((bar) => bar.percent), 0) / 10) * 10,
	);

const toQuarterIndex = ({ year, quarter }: YearQuarter) =>
	year * 4 + quarter - 1;

const fromQuarterIndex = (index: number): YearQuarter => ({
	year: Math.floor(index / 4),
	quarter: (index % 4) + 1,
});

const getMonthQuarterIndex = (cohortMonth: string) =>
	toQuarterIndex({
		year: Number(cohortMonth.slice(0, 4)),
		quarter: Math.floor((Number(cohortMonth.slice(5, 7)) - 1) / 3) + 1,
	});

/**
 * 끝난 최근 4분기와 그 앞 4분기의 합산 재작성률을 낸다.
 *
 * @description 분기의 마지막 달이 완성(incomplete가 아님)돼야 끝난 분기로 센다. 합산에는 완성된 달만
 * 넣는다. 데이터가 시작되기 전 분기는 있는 달만으로 합산하며, 비교할 분기에 달이 하나도 없으면 null이다.
 */
export const buildQuarterSummaries = (
	rows: readonly MonthlyRewriteRateRow[],
): { recent: QuarterSummary | null; prior: QuarterSummary | null } => {
	const completeRows = rows.filter((row) => !row.incomplete);
	const lastMonthRows = completeRows.filter(
		(row) => Number(row.cohort_month.slice(5, 7)) % 3 === 0,
	);

	if (lastMonthRows.length === 0) return { recent: null, prior: null };

	const latest = Math.max(
		...lastMonthRows.map((row) => getMonthQuarterIndex(row.cohort_month)),
	);

	const summarize = (lastIndex: number): QuarterSummary | null => {
		const firstIndex = lastIndex - QUARTER_WINDOW + 1;
		const windowRows = completeRows.filter((row) => {
			const index = getMonthQuarterIndex(row.cohort_month);

			return index >= firstIndex && index <= lastIndex;
		});

		if (windowRows.length === 0) return null;

		const indexes = windowRows.map((row) =>
			getMonthQuarterIndex(row.cohort_month),
		);
		const newWriters = windowRows.reduce(
			(sum, row) => sum + row.new_writers,
			0,
		);
		const rewriters = windowRows.reduce((sum, row) => sum + row.rewriters, 0);

		return {
			from: fromQuarterIndex(Math.min(...indexes)),
			to: fromQuarterIndex(Math.max(...indexes)),
			newWriters,
			rewriters,
			percent: toRatePercent(rewriters, newWriters),
		};
	};

	return {
		recent: summarize(latest),
		prior: summarize(latest - QUARTER_WINDOW),
	};
};
