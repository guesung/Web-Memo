/**
 * 주간 코호트(리텐션) 조회가 쓰는 주 시작일 계산.
 * @description 주간 GA 리포트(`.github/scripts/ga/ga4-weekly.mjs`의 `resolveTargetWeek`)와 같은 규칙이다.
 * 한 주는 토요일에 시작해 금요일에 끝나고, 서울 기준으로 계산한다. 리포트가 토요일 아침에 나가므로
 * 받는 날 전날(금요일)까지를 한 주로 본다. `memo.get_admin_weekly_retention`의 `p_week_start`가
 * 이 값이어야 코호트가 리포트의 주와 어긋나지 않는다.
 */

const DAY_MS = 86_400_000;

/** 서울 기준 YYYY-MM-DD. en-CA 로케일이 이 형태를 그대로 낸다. */
const formatSeoulDate = (date: Date) =>
	new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(date);

/** YYYY-MM-DD를 days만큼 옮긴다. UTC 자정으로 고정해 서머타임 영향을 받지 않는다. */
const shiftDate = (dateString: string, days: number) =>
	new Date(Date.parse(`${dateString}T00:00:00Z`) + days * DAY_MS)
		.toISOString()
		.slice(0, 10);

/**
 * 서울 기준으로 마지막으로 끝난 토~금 주의 시작일(토요일, YYYY-MM-DD).
 * @description 오늘이 속한 주의 토요일에서 7일 앞이다. 오늘이 토요일이면 어제까지 끝난 주가 대상이고,
 * 금요일이면 아직 진행 중인 주를 건너뛰어 그 앞 주가 대상이다.
 */
export const getLastCompleteWeekStart = (now = new Date()): string => {
	const today = formatSeoulDate(now);
	// getUTCDay는 일요일이 0, 토요일이 6이라 토요일이 0이 되도록 옮긴다.
	const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
	const daysSinceSaturday = (weekday + 1) % 7;

	return shiftDate(today, -daysSinceSaturday - 7);
};
