import { describe, expect, test } from "vitest";
import { formatKoreanDate, getWeekRange } from "./weekRange";

describe("getWeekRange", () => {
  test("일요일 20:00 KST 발송 시각은 그 주 월요일 00:00 KST부터다", () => {
    const range = getWeekRange(new Date("2026-10-11T11:00:00Z"));

    expect(range.weekStartUtc.toISOString()).toBe("2026-10-04T15:00:00.000Z");
    expect(range.weekStart).toBe("2026-10-05");
    expect(range.rangeLabel).toBe("10월 5일(월) ~ 10월 11일(일)");
  });

  test("일요일 23:59 KST는 아직 같은 주다", () => {
    const range = getWeekRange(new Date("2026-10-11T14:59:59Z"));

    expect(range.weekStart).toBe("2026-10-05");
  });

  test("월요일 00:00 KST부터 다음 주다", () => {
    const range = getWeekRange(new Date("2026-10-11T15:00:00Z"));

    expect(range.weekStartUtc.toISOString()).toBe("2026-10-11T15:00:00.000Z");
    expect(range.weekStart).toBe("2026-10-12");
    expect(range.rangeLabel).toBe("10월 12일(월) ~ 10월 18일(일)");
  });

  test("월요일 00:00 KST 직전(UTC 일요일 14:59)은 이전 주다", () => {
    const range = getWeekRange(new Date("2026-10-04T14:59:59Z"));

    expect(range.weekStart).toBe("2026-09-28");
  });

  test("월 경계를 넘는 주의 기간 표기", () => {
    const range = getWeekRange(new Date("2026-11-01T11:00:00Z"));

    expect(range.weekStart).toBe("2026-10-26");
    expect(range.rangeLabel).toBe("10월 26일(월) ~ 11월 1일(일)");
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
