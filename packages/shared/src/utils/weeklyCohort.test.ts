import { describe, expect, it } from "vitest";

import { getLastCompleteWeekStart } from "./weeklyCohort";

/** 서울 시각으로 날짜를 만든다. KST는 UTC+9라 offset을 붙여 고정한다. */
const seoul = (dateTime: string) => new Date(`${dateTime}+09:00`);

describe("getLastCompleteWeekStart", () => {
	it("토요일이면 어제(금)까지 끝난 주의 시작일(7일 전 토요일)을 돌려준다", () => {
		expect(getLastCompleteWeekStart(seoul("2026-11-14T08:00:00"))).toBe(
			"2026-11-07",
		);
	});

	it("금요일이면 아직 끝나지 않은 주를 건너뛴다", () => {
		expect(getLastCompleteWeekStart(seoul("2026-11-13T23:59:00"))).toBe(
			"2026-10-31",
		);
	});

	it("주중이면 직전 토요일에서 7일 앞이다", () => {
		expect(getLastCompleteWeekStart(seoul("2026-11-19T12:00:00"))).toBe(
			"2026-11-07",
		);
		expect(getLastCompleteWeekStart(seoul("2026-11-15T12:00:00"))).toBe(
			"2026-11-07",
		);
	});

	it("서울 자정을 기준으로 한다(UTC로는 전날인 시각)", () => {
		// 서울 토요일 00:30 = UTC 금요일 15:30
		expect(getLastCompleteWeekStart(seoul("2026-11-14T00:30:00"))).toBe(
			"2026-11-07",
		);
	});

	it("월 경계를 넘어도 정확하다", () => {
		expect(getLastCompleteWeekStart(seoul("2026-12-02T10:00:00"))).toBe(
			"2026-11-21",
		);
	});

	it("항상 토요일을 돌려준다", () => {
		for (let day = 1; day <= 28; day++) {
			const start = getLastCompleteWeekStart(
				seoul(`2026-11-${String(day).padStart(2, "0")}T09:00:00`),
			);

			expect(new Date(`${start}T00:00:00Z`).getUTCDay()).toBe(6);
		}
	});
});
