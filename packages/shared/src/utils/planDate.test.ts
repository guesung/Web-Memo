import { describe, expect, it } from "vitest";

import {
	addDaysToPlanDateKey,
	formatPlanDateShort,
	getPlanDateLabelKind,
	getPlanQuickPicks,
	getPlanSection,
	parsePlanDateKey,
	toPlanDateKey,
} from "./planDate";

describe("toPlanDateKey / parsePlanDateKey", () => {
	it("로컬 날짜로 YYYY-MM-DD 키를 만든다", () => {
		expect(toPlanDateKey(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
	});

	it("키를 로컬 자정으로 읽고 다시 같은 키로 돌아온다", () => {
		const date = parsePlanDateKey("2026-10-12");
		expect(date.getHours()).toBe(0);
		expect(toPlanDateKey(date)).toBe("2026-10-12");
	});
});

describe("addDaysToPlanDateKey", () => {
	it("월·연도 경계를 넘긴다", () => {
		expect(addDaysToPlanDateKey("2026-12-31", 1)).toBe("2027-01-01");
		expect(addDaysToPlanDateKey("2026-03-01", -1)).toBe("2026-02-28");
	});
});

describe("getPlanQuickPicks", () => {
	it("일요일: 이번 주말은 다음 토요일, 다음 월요일은 내일", () => {
		expect(getPlanQuickPicks(new Date(2026, 9, 11))).toEqual({
			today: "2026-10-11",
			tomorrow: "2026-10-12",
			weekend: "2026-10-17",
			nextMonday: "2026-10-12",
		});
	});

	it("토요일: 이번 주말은 다음 토요일", () => {
		expect(getPlanQuickPicks(new Date(2026, 9, 17)).weekend).toBe("2026-10-24");
	});

	it("월요일: 이번 주말은 이번 토요일, 다음 월요일은 7일 뒤", () => {
		const picks = getPlanQuickPicks(new Date(2026, 9, 12));
		expect(picks.weekend).toBe("2026-10-17");
		expect(picks.nextMonday).toBe("2026-10-19");
	});

	it("금요일: 이번 주말은 내일", () => {
		expect(getPlanQuickPicks(new Date(2026, 9, 16)).weekend).toBe("2026-10-17");
	});
});

describe("getPlanSection", () => {
	it("오늘 기준으로 지난·오늘·다가오는 구역을 나눈다", () => {
		expect(getPlanSection("2026-10-10", "2026-10-11")).toBe("past");
		expect(getPlanSection("2026-10-11", "2026-10-11")).toBe("today");
		expect(getPlanSection("2026-10-12", "2026-10-11")).toBe("upcoming");
	});
});

describe("getPlanDateLabelKind", () => {
	it("오늘·내일·그 외를 구분한다", () => {
		expect(getPlanDateLabelKind("2026-10-11", "2026-10-11")).toBe("today");
		expect(getPlanDateLabelKind("2026-10-12", "2026-10-11")).toBe("tomorrow");
		expect(getPlanDateLabelKind("2026-10-13", "2026-10-11")).toBe("date");
		expect(getPlanDateLabelKind("2026-10-10", "2026-10-11")).toBe("date");
	});
});

describe("formatPlanDateShort", () => {
	it("월/일과 로캘 요일 약칭을 붙인다", () => {
		expect(formatPlanDateShort("2026-10-13", "ko")).toBe("10/13 (화)");
		expect(formatPlanDateShort("2026-10-13", "en")).toBe("10/13 (Tue)");
	});
});
