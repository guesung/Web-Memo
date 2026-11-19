/** 주간 코호트에서 보는 주 수(0주 뒤부터 이 수 - 1주 뒤까지). */
export const RETENTION_WEEKS = 8;

/** 이 인원 미만인 코호트는 한두 명에 비율이 크게 흔들려 흐리게 그린다. */
export const SMALL_COHORT_SIZE = 5;

/** 이 인원 미만인 달은 막대를 회색으로 그려 해석에 주의하게 한다. */
export const SMALL_MONTH_WRITERS = 10;

/** 월별 막대 그래프 Y축의 최소 상한(%). 값이 더 크면 10 단위로 올린다. */
export const MONTHLY_RATE_MIN_CEILING = 40;

/** 분기 요약 카드가 한 번에 묶는 분기 수. */
export const QUARTER_WINDOW = 4;
