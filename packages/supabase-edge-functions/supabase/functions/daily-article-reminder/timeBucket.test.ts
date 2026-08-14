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

describe("getLocalDateString", () => {
	test("UTC 23:00은 서울 기준 다음날이다", () => {
		const date = new Date("2026-08-10T23:00:00Z");
		expect(getLocalDateString(date, "Asia/Seoul")).toBe("2026-08-11");
	});

	test("UTC 12:00은 서울 기준 같은 날이다", () => {
		const date = new Date("2026-08-10T12:00:00Z");
		expect(getLocalDateString(date, "Asia/Seoul")).toBe("2026-08-10");
	});
});
