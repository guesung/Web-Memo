import { I18n } from "@web-memo/shared/utils/extension";

/** 큰 단위부터 비교해 처음으로 1 이상이 되는 단위로 표기한다. 웹 메모 목록(dayjs fromNow)처럼 상대 시간이다. */
const RELATIVE_TIME_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
	["year", 60 * 60 * 24 * 365],
	["month", 60 * 60 * 24 * 30],
	["week", 60 * 60 * 24 * 7],
	["day", 60 * 60 * 24],
	["hour", 60 * 60],
	["minute", 60],
];

/** ISO 시각을 "3일 전" 같은 상대 시간으로 바꾼다. 해석할 수 없으면 빈 문자열이다. */
export const formatRelativeDate = (isoDate: string) => {
	const elapsedSeconds = (new Date(isoDate).getTime() - Date.now()) / 1000;

	if (Number.isNaN(elapsedSeconds)) {
		return "";
	}

	const formatter = new Intl.RelativeTimeFormat(I18n.getUILanguage(), {
		numeric: "auto",
	});
	const matchedUnit = RELATIVE_TIME_UNITS.find(
		([, unitSeconds]) => Math.abs(elapsedSeconds) >= unitSeconds,
	);

	if (!matchedUnit) {
		return formatter.format(0, "minute");
	}

	return formatter.format(
		Math.round(elapsedSeconds / matchedUnit[1]),
		matchedUnit[0],
	);
};
