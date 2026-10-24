// Deno(Edge Function)와 Node(Vitest) 양쪽에서 실행되므로 외부 import 없이 순수 Date 연산만 쓴다.
// KST는 UTC+9 고정(서머타임 없음)이라 오프셋 연산으로 충분하다.

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

export interface IFWeekRange {
  /** 그 주 KST 월요일 00:00에 해당하는 UTC 시각 */
  weekStartUtc: Date;
  /** KST 기준 월요일 날짜 (YYYY-MM-DD) */
  weekStart: string;
  /** 메일 기간 표기. 예: "10월 5일(월) ~ 10월 11일(일)" */
  rangeLabel: string;
}

/**
 * "10월 8일(수)" 형식으로 KST 기준 날짜를 표기한다.
 */
export const formatKoreanDate = (date: Date): string => {
  const kst = new Date(date.getTime() + KST_OFFSET_MS);

  return `${kst.getUTCMonth() + 1}월 ${kst.getUTCDate()}일(${WEEKDAY_LABELS[kst.getUTCDay()]})`;
};

/**
 * 기준 시각이 속한 KST 주(월~일)의 범위를 계산한다.
 */
export const getWeekRange = (now: Date): IFWeekRange => {
  const kstNow = new Date(now.getTime() + KST_OFFSET_MS);
  const daysSinceMonday = (kstNow.getUTCDay() + 6) % 7;
  const kstMondayStart = Date.UTC(
    kstNow.getUTCFullYear(),
    kstNow.getUTCMonth(),
    kstNow.getUTCDate() - daysSinceMonday,
  );
  const weekStartUtc = new Date(kstMondayStart - KST_OFFSET_MS);
  const weekEndUtc = new Date(weekStartUtc.getTime() + 6 * DAY_MS);

  return {
    weekStartUtc,
    weekStart: new Date(kstMondayStart).toISOString().slice(0, 10),
    rangeLabel: `${formatKoreanDate(weekStartUtc)} ~ ${formatKoreanDate(weekEndUtc)}`,
  };
};
