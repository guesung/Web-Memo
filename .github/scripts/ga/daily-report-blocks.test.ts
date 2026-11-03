// @ts-nocheck — .mjs 스크립트를 직접 import 하는 테스트라 타입 선언이 없습니다.
import { describe, expect, it } from "vitest";

import { buildDailyReportPayload } from "./daily-report-blocks.mjs";
import { CORE_EVENTS, summarizeGoogleSearchVisitors } from "./ga4-data.mjs";

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

const eventStat = (users, count) => ({
	users: { yesterday: users[0], average7: users[1] },
	count: { yesterday: count[0], average7: count[1] },
});

const buildReportTexts = (events = {}) =>
	blockTexts(
		buildDailyReportPayload({
			report: { ...baseReport, events },
			runUrl: null,
		}),
	);

describe("buildDailyReportPayload 핵심 이벤트 블록", () => {
	it("기존 8종의 순서와 라벨로 사용자 수·발생 건수·각 7일 평균을 표시한다", () => {
		const labels = [
			"메모 열기",
			"메모 검색",
			"요약 성공",
			"요약 실패",
			"채팅 전송",
			"로그인",
			"가입",
			"확장 설치",
		];
		const events = Object.fromEntries(
			CORE_EVENTS.map((name, index) => [
				name,
				eventStat([index + 1, index + 0.5], [index + 11, index + 10.5]),
			]),
		);
		const core = buildReportTexts(events).find((text) => text.startsWith("*핵심 이벤트*"));

		expect(core.split("\n").slice(1)).toEqual(
			labels.map(
				(label, index) =>
					`${label}  *${index + 1}명 · ${index + 11}건*  (7일 평균 ${(index + 0.5).toFixed(1)}명 · ${(index + 10.5).toFixed(1)}건 · +${Math.round((0.5 / (index + 10.5)) * 100)}%)`,
			),
		);
	});

	it("사용자가 늘고 건수가 줄어도 건수 기준 증감률을 표시한다", () => {
		const events = { memo_open: eventStat([20, 10], [5, 10]) };
		const core = buildReportTexts(events).find((text) => text.startsWith("*핵심 이벤트*"));

		expect(core).toContain("메모 열기  *20명 · 5건*  (7일 평균 10.0명 · 10.0건 · -50%)");
	});

	it("누락 이벤트와 0 평균은 0명·0건으로 표시하고 증감률을 생략한다", () => {
		const core = buildReportTexts({ memo_open: eventStat([0, 0], [0, 0]) }).find(
			(text) => text.startsWith("*핵심 이벤트*"),
		);

		expect(core).toContain("메모 열기  *0명 · 0건*  (7일 평균 0.0명 · 0.0건)");
		expect(core).toContain("메모 검색  *0명 · 0건*  (7일 평균 0.0명 · 0.0건)");
	});

	it("퍼널은 사용자 기준 증감률을 유지한다", () => {
		const funnel = buildReportTexts({
			side_panel_open: eventStat([20, 10], [5, 10]),
		}).find((text) => text.startsWith("*퍼널*"));

		expect(funnel).toContain(
			"사이드 패널 열기  *20명 · 5건*  (7일 평균 10.0명 · 10.0건 · +100%)",
		);
	});
});

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

		expect(texts[coreIndex + 1]).toContain(
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

describe("buildDailyReportPayload 검색어 줄", () => {
	const build = (searchQueries) =>
		blockTexts(
			buildDailyReportPayload({
				report: {
					...baseReport,
					googleSearch: { status: "ok", yesterday: 1, average7: 1 },
				},
				runUrl: null,
				searchQueries,
			}),
		).join("\n");

	it("ok 는 기간 헤더와 검색어별 클릭·노출을 적고 특수문자를 이스케이프한다", () => {
		const text = build({
			status: "ok",
			startDate: "2026-10-24",
			endDate: "2026-10-30",
			queries: [
				{ query: "web memo", clicks: 1200, impressions: 3400 },
				{ query: "a<b>&`c`", clicks: 1, impressions: 2 },
			],
		});

		expect(text).toContain("검색어 상위 2 (Search Console, 10-24~10-30)");
		expect(text).toContain("• `web memo`  클릭 1,200 · 노출 3,400");
		expect(text).toContain("• `a&lt;b&gt;&amp;'c'`  클릭 1 · 노출 2");
	});

	it("ok 인데 0행이면 데이터 없음", () => {
		expect(
			build({ status: "ok", startDate: "2026-10-24", endDate: "2026-10-30", queries: [] }),
		).toContain("검색어  해당 기간 데이터 없음");
	});

	it("failed 는 조회 실패", () => {
		expect(build({ status: "failed" })).toContain("검색어  조회 실패");
	});

	it("skipped 와 인자 없음은 연동 안 됨", () => {
		for (const input of [{ status: "skipped" }, undefined]) {
			expect(build(input)).toContain(
				"검색어  연동 안 됨 (GSC_SERVICE_ACCOUNT_JSON 없음)",
			);
		}
	});
});
