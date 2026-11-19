import type { GaSeriesPoint } from "../_types";

/** 값이 없을 때 자리에 쓰는 표시. */
const EMPTY_VALUE = "–";

/** 평균을 소수 한 자리로 적는다. */
export const formatAverage = (average: number | null) =>
	average === null ? EMPTY_VALUE : average.toFixed(1);

/** 증감률에 부호를 붙여 적는다. */
export const formatDelta = (deltaPercent: number | null) => {
	if (deltaPercent === null) return EMPTY_VALUE;

	return `${deltaPercent > 0 ? "+" : ""}${deltaPercent}%`;
};

/** 증감 방향에 맞는 글자색 클래스. 늘면 초록, 줄면 빨강이다. */
export const getDeltaToneClass = (deltaPercent: number | null) => {
	if (deltaPercent === null || deltaPercent === 0) {
		return "text-muted-foreground";
	}

	return deltaPercent > 0 ? "text-chart-2" : "text-destructive";
};

/** 값이 null로 이어진 구간(적재가 빠진 날들)을 위치 범위로 묶는다. */
export const findMissingRanges = (series: readonly GaSeriesPoint[]) => {
	const ranges: { start: number; end: number }[] = [];

	series.forEach((point, position) => {
		if (point.value !== null) return;

		const last = ranges.at(-1);

		if (last && last.end === position - 1) {
			last.end = position;
		} else {
			ranges.push({ start: position, end: position });
		}
	});

	return ranges;
};
