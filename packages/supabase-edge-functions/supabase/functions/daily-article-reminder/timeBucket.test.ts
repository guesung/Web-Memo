import { describe, expect, test } from "vitest";
import { getLocalDateString, shouldNotifyNow } from "./timeBucket";

describe("shouldNotifyNow", () => {
  test("서울 08:00 설정, UTC 23:00(= KST 08:00)이면 true", () => {
    const nowUtc = new Date("2026-08-10T23:00:00Z");
    expect(shouldNotifyNow("08:00", "Asia/Seoul", nowUtc)).toBe(true);
  });

  test("서울 08:00 설정, UTC 23:29(= KST 08:29, 같은 30분 버킷)이면 true", () => {
    const nowUtc = new Date("2026-08-10T23:29:59Z");
    expect(shouldNotifyNow("08:00", "Asia/Seoul", nowUtc)).toBe(true);
  });

  test("서울 08:00 설정, UTC 23:30(= KST 08:30, 다음 버킷)이면 false", () => {
    const nowUtc = new Date("2026-08-10T23:30:00Z");
    expect(shouldNotifyNow("08:00", "Asia/Seoul", nowUtc)).toBe(false);
  });

  test("notifyTime이 HH:MM:SS 형식이어도 동작한다", () => {
    const nowUtc = new Date("2026-08-10T23:00:00Z");
    expect(shouldNotifyNow("08:00:00", "Asia/Seoul", nowUtc)).toBe(true);
  });

  test("08:30 설정은 08:30~08:59 버킷에서만 true", () => {
    expect(
      shouldNotifyNow("08:30", "Asia/Seoul", new Date("2026-08-10T23:40:00Z")),
    ).toBe(true);
    expect(
      shouldNotifyNow("08:30", "Asia/Seoul", new Date("2026-08-10T23:10:00Z")),
    ).toBe(false);
  });

  test("다른 타임존(America/New_York, UTC-4 서머타임)도 지원한다", () => {
    // 2026-08-10 12:00 UTC = 뉴욕 08:00 (EDT)
    const nowUtc = new Date("2026-08-10T12:00:00Z");
    expect(shouldNotifyNow("08:00", "America/New_York", nowUtc)).toBe(true);
    expect(shouldNotifyNow("08:00", "Asia/Seoul", nowUtc)).toBe(false);
  });
});

describe("shouldNotifyNow 경계 케이스", () => {
  test("00:00 설정은 로컬 자정 버킷(00:00~00:29)에서만 true", () => {
    // 2026-08-10 15:00 UTC = 서울 2026-08-11 00:00
    expect(
      shouldNotifyNow("00:00", "Asia/Seoul", new Date("2026-08-10T15:00:00Z")),
    ).toBe(true);
    expect(
      shouldNotifyNow("00:00", "Asia/Seoul", new Date("2026-08-10T14:59:59Z")),
    ).toBe(false);
  });

  test("23:30 설정은 자정을 넘기지 않고 23:30~23:59 버킷에서만 true", () => {
    // 서울 23:45 = 14:45 UTC, 서울 00:00 = 15:00 UTC
    expect(
      shouldNotifyNow("23:30", "Asia/Seoul", new Date("2026-08-10T14:45:00Z")),
    ).toBe(true);
    expect(
      shouldNotifyNow("23:30", "Asia/Seoul", new Date("2026-08-10T15:00:00Z")),
    ).toBe(false);
  });

  test("같은 UTC 시각이라도 타임존마다 판정이 다르다", () => {
    const nowUtc = new Date("2026-08-10T23:00:00Z");
    // 서울 08:00, 뉴욕(EDT) 19:00, UTC 23:00
    expect(shouldNotifyNow("08:00", "Asia/Seoul", nowUtc)).toBe(true);
    expect(shouldNotifyNow("19:00", "America/New_York", nowUtc)).toBe(true);
    expect(shouldNotifyNow("23:00", "UTC", nowUtc)).toBe(true);
    expect(shouldNotifyNow("08:00", "UTC", nowUtc)).toBe(false);
  });

  test("서머타임이 끝난 뒤(EST, UTC-5)에는 오프셋이 달라진다", () => {
    // 2026-12-10 13:00 UTC = 뉴욕 08:00 (EST)
    const nowUtc = new Date("2026-12-10T13:00:00Z");
    expect(shouldNotifyNow("08:00", "America/New_York", nowUtc)).toBe(true);
  });
});

describe("getLocalDateString", () => {
  test("UTC 23:00은 서울 기준 다음날이다", () => {
    const date = new Date("2026-08-10T23:00:00Z");
    expect(getLocalDateString(date, "Asia/Seoul")).toBe("2026-08-11");
  });

  test("서울 자정 직전(14:59:59Z)은 아직 같은 날, 자정(15:00Z)부터 다음 날이다", () => {
    expect(
      getLocalDateString(new Date("2026-08-10T14:59:59Z"), "Asia/Seoul"),
    ).toBe("2026-08-10");
    expect(
      getLocalDateString(new Date("2026-08-10T15:00:00Z"), "Asia/Seoul"),
    ).toBe("2026-08-11");
  });

  test("같은 UTC 시각도 타임존에 따라 날짜가 다르다", () => {
    const date = new Date("2026-08-10T02:00:00Z");
    expect(getLocalDateString(date, "Asia/Seoul")).toBe("2026-08-10");
    expect(getLocalDateString(date, "America/Los_Angeles")).toBe("2026-08-09");
  });

  test("UTC 12:00은 서울 기준 같은 날이다", () => {
    const date = new Date("2026-08-10T12:00:00Z");
    expect(getLocalDateString(date, "Asia/Seoul")).toBe("2026-08-10");
  });
});
