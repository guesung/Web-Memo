/**
 * 메모의 "읽을 계획" 날짜(`memo.plannedDate`)를 다루는 순수 함수.
 * @description DB 컬럼은 시간대 없는 `date`라 `YYYY-MM-DD` 문자열(날짜 키)로만 주고받는다.
 * `new Date("2026-10-12")`는 UTC 자정으로 해석돼 시간대에 따라 하루 밀리므로, 날짜 키를 만들고 읽을 때는 항상 로컬 날짜를 쓴다.
 */

export type TPlanDateKey = string;

export type TPlanSection = "past" | "today" | "upcoming";

export type TPlanDateLabelKind = "today" | "tomorrow" | "date";

export interface IPlanQuickPicks {
	today: TPlanDateKey;
	tomorrow: TPlanDateKey;
	weekend: TPlanDateKey;
	nextMonday: TPlanDateKey;
}

const SATURDAY = 6;
const SUNDAY = 0;
const MONDAY = 1;
const DAYS_IN_WEEK = 7;

const padTwo = (value: number) => String(value).padStart(2, "0");

/** 로컬 날짜 기준으로 `YYYY-MM-DD` 날짜 키를 만든다. */
export const toPlanDateKey = (date: Date): TPlanDateKey =>
	`${date.getFullYear()}-${padTwo(date.getMonth() + 1)}-${padTwo(date.getDate())}`;

/** 날짜 키를 로컬 자정의 `Date`로 읽는다. */
export const parsePlanDateKey = (key: TPlanDateKey): Date => {
	const [year, month, day] = key.split("-").map(Number);
	return new Date(year, month - 1, day);
};

export const addDaysToPlanDateKey = (
	key: TPlanDateKey,
	days: number,
): TPlanDateKey => {
	const date = parsePlanDateKey(key);
	date.setDate(date.getDate() + days);
	return toPlanDateKey(date);
};

/**
 * 날짜 선택 팝오버의 빠른 선택 네 개를 계산한다.
 * - 이번 주말: 다가오는 토요일. 오늘이 토·일이면 이미 주말이므로 다음 토요일
 * - 다음 월요일: 1~7일 뒤의 첫 월요일. 일요일에는 내일과 같은 날이 된다
 */
export const getPlanQuickPicks = (now: Date): IPlanQuickPicks => {
	const today = toPlanDateKey(now);
	const dayOfWeek = now.getDay();
	const isWeekend = dayOfWeek === SATURDAY || dayOfWeek === SUNDAY;
	const daysUntilSaturday = isWeekend
		? (SATURDAY - dayOfWeek + DAYS_IN_WEEK) % DAYS_IN_WEEK || DAYS_IN_WEEK
		: SATURDAY - dayOfWeek;
	const daysUntilMonday =
		(MONDAY - dayOfWeek + DAYS_IN_WEEK) % DAYS_IN_WEEK || DAYS_IN_WEEK;

	return {
		today,
		tomorrow: addDaysToPlanDateKey(today, 1),
		weekend: addDaysToPlanDateKey(today, daysUntilSaturday),
		nextMonday: addDaysToPlanDateKey(today, daysUntilMonday),
	};
};

/** 날짜 키는 사전순이 곧 날짜순이라 문자열 비교로 구역을 나눈다. */
export const getPlanSection = (
	key: TPlanDateKey,
	todayKey: TPlanDateKey,
): TPlanSection => {
	if (key < todayKey) return "past";
	if (key === todayKey) return "today";
	return "upcoming";
};

/** 짧은 라벨에서 "오늘"·"내일"을 번역 키로 쓸지, 날짜를 그대로 쓸지 고른다. */
export const getPlanDateLabelKind = (
	key: TPlanDateKey,
	todayKey: TPlanDateKey,
): TPlanDateLabelKind => {
	if (key === todayKey) return "today";
	if (key === addDaysToPlanDateKey(todayKey, 1)) return "tomorrow";
	return "date";
};

/** `10/13 (화)`처럼 월/일과 요일 약칭을 붙인다. 요일은 로캘을 따른다. */
export const formatPlanDateShort = (
	key: TPlanDateKey,
	locale: string,
): string => {
	const date = parsePlanDateKey(key);
	const weekday = new Intl.DateTimeFormat(locale, { weekday: "short" }).format(
		date,
	);
	return `${date.getMonth() + 1}/${date.getDate()} (${weekday})`;
};
