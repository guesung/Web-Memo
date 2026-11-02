import { describe, expect, test } from "vitest";
import {
  formatKoreanDate,
  getCompletedWeekRange,
  getCurrentWeekRange,
  getWeekRangeFromStartDate,
} from "./weekRange";

describe("getCompletedWeekRange", () => {
  test("토 10:00 KST 정각 발송은 직전 토 10:00부터 이번 토 10:00까지다", () => {
    const range = getCompletedWeekRange(new Date("2026-11-07T01:00:00Z"));

    expect(range.startUtc.toISOString()).toBe("2026-10-31T01:00:00.000Z");
    expect(range.endUtc.toISOString()).toBe("2026-11-07T01:00:00.000Z");
    expect(range.weekStart).toBe("2026-10-31");
    expect(range.rangeLabel).toBe("10월 31일(토) ~ 11월 7일(토)");
  });

  test("토 09:59 KST는 아직 이전 기간이 끝난 상태다", () => {
    const range = getCompletedWeekRange(new Date("2026-11-07T00:59:59Z"));

    expect(range.weekStart).toBe("2026-10-24");
    expect(range.endUtc.toISOString()).toBe("2026-10-31T01:00:00.000Z");
  });

  test("크론이 늦어 토 11:30 KST에 실행돼도 같은 기간이다", () => {
    const range = getCompletedWeekRange(new Date("2026-11-07T02:30:00Z"));

    expect(range.weekStart).toBe("2026-10-31");
    expect(range.endUtc.toISOString()).toBe("2026-11-07T01:00:00.000Z");
  });

  test("다음 경계 직전(금 23:59 KST)까지 같은 기간이다", () => {
    const range = getCompletedWeekRange(new Date("2026-11-13T14:59:59Z"));

    expect(range.weekStart).toBe("2026-10-31");
  });

  test("월 경계를 넘는 기간의 표기", () => {
    const range = getCompletedWeekRange(new Date("2026-11-08T00:00:00Z"));

    expect(range.rangeLabel).toBe("10월 31일(토) ~ 11월 7일(토)");
  });
});

describe("getCurrentWeekRange", () => {
  test("월요일은 직전 토 10:00부터 시작하는 진행 중 기간이다", () => {
    const range = getCurrentWeekRange(new Date("2026-11-09T03:00:00Z"));

    expect(range.startUtc.toISOString()).toBe("2026-11-07T01:00:00.000Z");
    expect(range.weekStart).toBe("2026-11-07");
    expect(range.rangeLabel).toBe("11월 7일(토) ~ 11월 14일(토)");
  });

  test("토 09:59 KST는 이전 기간, 10:00 KST부터 새 기간이다", () => {
    expect(
      getCurrentWeekRange(new Date("2026-11-07T00:59:59Z")).weekStart,
    ).toBe("2026-10-31");
    expect(getCurrentWeekRange(new Date("2026-11-07T01:00:00Z")).weekStart).toBe(
      "2026-11-07",
    );
  });
});

describe("getWeekRangeFromStartDate", () => {
  test("토요일 날짜는 그 날 10:00 KST에 시작하는 기간이다", () => {
    const range = getWeekRangeFromStartDate("2026-10-31");

    expect(range.startUtc.toISOString()).toBe("2026-10-31T01:00:00.000Z");
    expect(range.endUtc.toISOString()).toBe("2026-11-07T01:00:00.000Z");
    expect(range.weekStart).toBe("2026-10-31");
    expect(range.rangeLabel).toBe("10월 31일(토) ~ 11월 7일(토)");
  });

  test("토요일이 아닌 날짜는 그 날이 속한 기간으로 맞춘다", () => {
    expect(getWeekRangeFromStartDate("2026-11-04").weekStart).toBe(
      "2026-10-31",
    );
    expect(getWeekRangeFromStartDate("2026-11-06").weekStart).toBe(
      "2026-10-31",
    );
    expect(getWeekRangeFromStartDate("2026-11-07").weekStart).toBe(
      "2026-11-07",
    );
  });

  test("존재하지 않는 날짜는 에러다", () => {
    expect(() => getWeekRangeFromStartDate("2026-13-45")).toThrow();
  });
});

describe("formatKoreanDate", () => {
  test("KST 기준 날짜와 요일을 표기한다", () => {
    expect(formatKoreanDate(new Date("2026-10-08T03:00:00Z"))).toBe(
      "10월 8일(목)",
    );
  });

  test("UTC로는 전날이어도 KST 날짜를 쓴다", () => {
    expect(formatKoreanDate(new Date("2026-10-07T16:00:00Z"))).toBe(
      "10월 8일(목)",
    );
  });
});
