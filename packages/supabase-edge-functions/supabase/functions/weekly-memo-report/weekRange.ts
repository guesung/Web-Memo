// Deno(Edge Function)와 Node(Vitest) 양쪽에서 실행되므로 외부 import 없이 순수 Date 연산만 쓴다.
// KST는 UTC+9 고정(서머타임 없음)이라 오프셋 연산으로 충분하다.

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;
// 주기 경계: 매주 토요일 10:00 KST (= 토 01:00 UTC). 기간은 [경계, 경계+7일)
const BOUNDARY_HOUR_KST = 10;
const SATURDAY = 6;
const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

export interface IFWeekRange {
  /** 기간 시작(토 10:00 KST)에 해당하는 UTC 시각. 포함 */
  startUtc: Date;
  /** 기간 끝(시작 + 7일). 미포함 */
  endUtc: Date;
  /** 기간 시작 토요일의 KST 날짜 (YYYY-MM-DD). 발송 로그 키 */
  weekStart: string;
  /** 메일 기간 표기. 예: "10월 31일(토) ~ 11월 7일(토)" */
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
 * 기준 시각이 속한 기간의 시작(토 10:00 KST)을 UTC ms로 돌려준다.
 * 경계만큼 시간축을 당겨(KST 토 10:00 -> 토 00:00) 요일 연산으로 푼다.
 */
const getPeriodStartMs = (instant: Date): number => {
  const shifted = instant.getTime() + KST_OFFSET_MS - BOUNDARY_HOUR_KST * HOUR_MS;
  const shiftedDayStart = Math.floor(shifted / DAY_MS) * DAY_MS;
  const daysSinceSaturday =
    (new Date(shiftedDayStart).getUTCDay() - SATURDAY + 7) % 7;

  return (
    shiftedDayStart -
    daysSinceSaturday * DAY_MS +
    BOUNDARY_HOUR_KST * HOUR_MS -
    KST_OFFSET_MS
  );
};

const buildRange = (startMs: number): IFWeekRange => {
  const startUtc = new Date(startMs);
  const endUtc = new Date(startMs + WEEK_MS);

  return {
    startUtc,
    endUtc,
    weekStart: new Date(startMs + KST_OFFSET_MS).toISOString().slice(0, 10),
    rangeLabel: `${formatKoreanDate(startUtc)} ~ ${formatKoreanDate(endUtc)}`,
  };
};

/**
 * 정기 발송용: now 이전의 가장 최근 경계에서 끝난 기간.
 * 크론이 늦게 실행돼도 고정 경계에서 계산하므로 같은 기간이 나온다.
 */
export const getCompletedWeekRange = (now: Date): IFWeekRange =>
  buildRange(getPeriodStartMs(now) - WEEK_MS);

/**
 * 테스트 발송용: now가 속한 진행 중 기간. 호출 쪽에서 끝을 now로 자른다.
 */
export const getCurrentWeekRange = (now: Date): IFWeekRange =>
  buildRange(getPeriodStartMs(now));

/**
 * 수동 재발송용: 시작 날짜(KST, YYYY-MM-DD)의 기간.
 * 토요일이 아닌 날짜는 그 날 10:00 KST가 속한 기간으로 맞춘다.
 */
export const getWeekRangeFromStartDate = (startDate: string): IFWeekRange => {
  const instant = new Date(`${startDate}T10:00:00+09:00`);

  if (Number.isNaN(instant.getTime())) {
    throw new Error(`유효하지 않은 시작 날짜: ${startDate}`);
  }

  return buildRange(getPeriodStartMs(instant));
};
