// Deno(Edge Function)와 Node(Vitest) 양쪽에서 실행되므로 외부 import 없이
// Web 표준 Intl API만 사용한다.

/**
 * 주어진 UTC 시각을 특정 타임존의 "HH:MM"으로 변환한다.
 */
function getLocalTimeString(date: Date, timezone: string): string {
	return new Intl.DateTimeFormat("en-GB", {
		timeZone: timezone,
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23",
	}).format(date);
}

/**
 * "HH:MM" 또는 "HH:MM:SS"를 30분 버킷의 시작 분(minute of day)으로 내림한다.
 */
function toBucketMinutes(time: string): number {
	const [hourPart, minutePart] = time.split(":");
	const totalMinutes = Number(hourPart) * 60 + Number(minutePart);

	return Math.floor(totalMinutes / 30) * 30;
}

/**
 * 사용자 타임존 기준 현재 30분 버킷이 알림 설정 시각의 버킷과 일치하는지 판단한다.
 */
export function shouldNotifyNow(
	notifyTime: string,
	timezone: string,
	nowUtc: Date,
): boolean {
	const localNow = getLocalTimeString(nowUtc, timezone);

	return toBucketMinutes(localNow) === toBucketMinutes(notifyTime);
}

/**
 * 주어진 시각을 특정 타임존의 "YYYY-MM-DD" 날짜 문자열로 변환한다.
 * "오늘 이미 발송했는지" 판단에 사용한다.
 */
export function getLocalDateString(date: Date, timezone: string): string {
	return new Intl.DateTimeFormat("en-CA", {
		timeZone: timezone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(date);
}
