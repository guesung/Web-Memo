import { describe, expect, it } from "vitest";

import {
	formatSeoulDate,
	resolveLatestCompleteDate,
	shiftDate,
} from "./activeUsers";

describe("formatSeoulDate", () => {
	it("서버가 UTC로 돌아도 서울 기준 날짜를 적는다", () => {
		// UTC로는 아직 18일이지만 서울은 이미 19일로 넘어간 시각입니다.
		expect(formatSeoulDate(new Date("2026-09-18T15:30:00Z"))).toBe(
			"2026-09-19",
		);
		// UTC로는 19일이지만 서울 기준으로도 19일인 시각입니다.
		expect(formatSeoulDate(new Date("2026-09-19T00:30:00Z"))).toBe(
			"2026-09-19",
		);
	});
});

describe("shiftDate", () => {
	it("월과 해를 넘어가도 날짜를 옮긴다", () => {
		expect(shiftDate("2026-09-01", -1)).toBe("2026-08-31");
		expect(shiftDate("2026-01-01", -1)).toBe("2025-12-31");
		expect(shiftDate("2026-09-18", -29)).toBe("2026-08-20");
	});
});

describe("resolveLatestCompleteDate", () => {
	/**
	 * GA4 표준 속성의 보고서는 24~48시간 지연돼 오늘 칸이 항상 미완성입니다.
	 * 오늘을 끝으로 잡으면 그래프의 마지막 점이 매번 푹 꺼진 채로 그려집니다.
	 */
	it("서울 기준 어제를 돌려준다", () => {
		expect(resolveLatestCompleteDate(new Date("2026-09-19T00:30:00Z"))).toBe(
			"2026-09-18",
		);
	});

	it("서울이 자정을 넘긴 직후에는 하루가 함께 넘어간다", () => {
		// 서울은 09-19 00:30, 어제는 09-18입니다. UTC 날짜(09-18)로 역산하면 09-17이 되어 하루 어긋납니다.
		expect(resolveLatestCompleteDate(new Date("2026-09-18T15:30:00Z"))).toBe(
			"2026-09-18",
		);
		// 서울은 아직 09-18 23:30이라 어제는 09-17입니다.
		expect(resolveLatestCompleteDate(new Date("2026-09-18T14:30:00Z"))).toBe(
			"2026-09-17",
		);
	});
});
