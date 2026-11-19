/** 그래프·카드가 읽는 단위. 사람 수 또는 이벤트 건수. */
export type GaMetricUnit = "users" | "events";

/** 날짜별 값. 적재되지 않은 날은 `value`가 null이다. */
export interface GaSeriesPoint {
	/** YYYY-MM-DD */
	date: string;
	value: number | null;
}

/** 값이 눈에 띄게 바뀐 지표에 붙는 배지 종류. */
export type GaTrendBadgeKind = "surge" | "zero";

/** 기준일 값과 직전 7일 평균 비교. */
export interface GaSeriesSummary {
	/** 기준일(어제) 값 */
	yesterday: number;
	/** 직전 7일 평균. 비교할 날이 하나도 없으면 null */
	average: number | null;
	/** 평균 대비 증감률(%). 평균이 없거나 0이면 null */
	deltaPercent: number | null;
	badge: GaTrendBadgeKind | null;
}
