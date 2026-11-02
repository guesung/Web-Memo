// @ts-nocheck — .mjs 스크립트를 직접 import 하는 테스트라 타입 선언이 없습니다.
import { describe, expect, it } from "vitest";

import { buildDailyReportPayload } from "./daily-report-blocks.mjs";
import { summarizeGoogleSearchVisitors } from "./ga4-data.mjs";

const baseReport = {
	targetDate: "2026-10-31",
	events: {},
	outliers: [],
	unreleasedEvents: [],
	observationStart: "2026-01-01",
	observationTruncated: false,
	trafficTotals: {},
};

const blockTexts = (payload) =>
	payload.blocks.map((block) => block.text?.text ?? "");

describe("summarizeGoogleSearchVisitors", () => {
	it("어제 값과 직전 7일 평균을 분모 7로 계산한다", () => {
		const rows = [
			{ dimensions: ["20261031"], metrics: [12] },
			{ dimensions: ["20261030"], metrics: [7] },
			{ dimensions: ["20261029"], metrics: [14] },
			// 범위 밖 날짜는 평균에 들어가지 않는다
			{ dimensions: ["20261020"], metrics: [100] },
		];

		expect(summarizeGoogleSearchVisitors(rows, "2026-10-31")).toEqual({
			yesterday: 12,
			average7: 3,
		});
	});

	it("행이 없으면 0명이다", () => {
		expect(summarizeGoogleSearchVisitors([], "2026-10-31")).toEqual({
			yesterday: 0,
			average7: 0,
		});
	});
});

describe("buildDailyReportPayload 구글 검색 블록", () => {
	it("핵심 이벤트 블록 바로 뒤에 방문자 줄을 싣는다", () => {
		const payload = buildDailyReportPayload({
			report: {
				...baseReport,
				googleSearch: { status: "ok", yesterday: 12, average7: 8.4 },
			},
			runUrl: null,
		});
		const texts = blockTexts(payload);
		const coreIndex = texts.findIndex((text) => text.startsWith("*핵심 이벤트*"));

		expect(texts[coreIndex + 1]).toBe(
			"*구글 검색 유입*  (어제 / 7일 평균)\n방문자  *12명*  (7일 평균 8.4 · +43%)",
		);
	});

	it("조회 실패는 0명과 구분해 적는다", () => {
		const payload = buildDailyReportPayload({
			report: { ...baseReport, googleSearch: { status: "failed" } },
			runUrl: null,
		});

		expect(blockTexts(payload).join("\n")).toContain("방문자  조회 실패");
	});
});
