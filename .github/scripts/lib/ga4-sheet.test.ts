// @ts-nocheck — .mjs 스크립트를 직접 import 하는 테스트라 타입 선언이 없습니다.
import { afterEach, describe, expect, it, vi } from "vitest";

import {
	buildEventRows,
	buildSummaryRow,
	formatSeoulMinute,
	mergeRows,
	upsertTab,
} from "./ga4-sheet.mjs";
import { FUNNEL_EVENTS } from "./ga4-weekly.mjs";

const week = {
	start: "2026-09-14",
	end: "2026-09-20",
	previousStart: "2026-09-07",
	previousEnd: "2026-09-13",
};

const recordedAt = "2026-09-21 08:03";

const SUMMARY_KEY = ["주 시작일"];
const EVENT_KEY = ["주 시작일", "이벤트"];

describe("formatSeoulMinute", () => {
	it("UTC 시각을 서울 기준 YYYY-MM-DD HH:mm 으로 적는다", () => {
		// UTC 일요일 23:03 = 서울 월요일 08:03
		expect(formatSeoulMinute(new Date("2026-09-20T23:03:59Z"))).toBe(
			"2026-09-21 08:03",
		);
	});

	it("자정은 24 가 아니라 00 으로 적는다", () => {
		expect(formatSeoulMinute(new Date("2026-09-20T15:00:00Z"))).toBe(
			"2026-09-21 00:00",
		);
	});
});

describe("buildSummaryRow", () => {
	it("주·활성 사용자·퍼널 단계·기록 정보를 이 순서의 열로 만든다", () => {
		const row = buildSummaryRow({
			week,
			activeUsers: 430,
			funnel: [
				{ eventName: "extension_installed", users: 413, conversionRate: null },
				{ eventName: "side_panel_open", users: 27, conversionRate: 0.07 },
			],
			recordedAt,
			source: "정기",
		});

		expect(row).toEqual({
			"주 시작일": "2026-09-14",
			"주 종료일": "2026-09-20",
			"활성 사용자": 430,
			"퍼널: extension_installed": 413,
			"퍼널: side_panel_open": 27,
			"기록 시각": recordedAt,
			"기록 경위": "정기",
		});
		expect(Object.keys(row)).toEqual([
			"주 시작일",
			"주 종료일",
			"활성 사용자",
			"퍼널: extension_installed",
			"퍼널: side_panel_open",
			"기록 시각",
			"기록 경위",
		]);
	});

	it("퍼널이 null 이면 퍼널 칸을 0 이 아니라 빈 문자열로 둔다", () => {
		const row = buildSummaryRow({
			week,
			activeUsers: 120,
			funnel: null,
			recordedAt,
			source: "백필",
		});

		for (const eventName of FUNNEL_EVENTS) {
			expect(row[`퍼널: ${eventName}`]).toBe("");
		}
		expect(row["활성 사용자"]).toBe(120);
	});
});

describe("buildEventRows", () => {
	it("features 에 없는 이벤트도 0명으로 한 행씩 만든다", () => {
		const rows = buildEventRows({
			week,
			eventNames: ["memo_write", "summary_run", "sign_up"],
			features: [
				{ eventName: "summary_run", users: 7, previousUsers: 3 },
				{ eventName: "memo_write", users: 4, previousUsers: 4 },
			],
			recordedAt,
			source: "재실행",
		});

		expect(rows).toEqual([
			{
				"주 시작일": "2026-09-14",
				이벤트: "memo_write",
				"사용자 수": 4,
				"기록 시각": recordedAt,
				"기록 경위": "재실행",
			},
			{
				"주 시작일": "2026-09-14",
				이벤트: "summary_run",
				"사용자 수": 7,
				"기록 시각": recordedAt,
				"기록 경위": "재실행",
			},
			{
				"주 시작일": "2026-09-14",
				이벤트: "sign_up",
				"사용자 수": 0,
				"기록 시각": recordedAt,
				"기록 경위": "재실행",
			},
		]);
	});
});

describe("mergeRows", () => {
	it("빈 시트면 행의 키 순서로 헤더를 만들고 행을 붙인다", () => {
		expect(
			mergeRows({
				values: [],
				rows: [
					{ "주 시작일": "2026-09-07", "활성 사용자": 400 },
					{ "주 시작일": "2026-09-14", "활성 사용자": 430 },
				],
				keyColumns: SUMMARY_KEY,
			}),
		).toEqual([
			["주 시작일", "활성 사용자"],
			["2026-09-07", 400],
			["2026-09-14", 430],
		]);
	});

	it("같은 키는 그 자리를 덮어써 행 수가 늘지 않는다", () => {
		const values = [
			["주 시작일", "활성 사용자", "기록 경위"],
			["2026-09-07", "400", "정기"],
			["2026-09-14", "410", "정기"],
		];

		const merged = mergeRows({
			values,
			rows: [
				{
					"주 시작일": "2026-09-14",
					"활성 사용자": 430,
					"기록 경위": "재실행",
				},
			],
			keyColumns: SUMMARY_KEY,
		});

		expect(merged).toEqual([
			["주 시작일", "활성 사용자", "기록 경위"],
			["2026-09-07", "400", "정기"],
			["2026-09-14", 430, "재실행"],
		]);
	});

	it("같은 행을 두 번 합쳐도 결과가 같다", () => {
		const rows = [{ "주 시작일": "2026-09-14", "활성 사용자": 430 }];
		const once = mergeRows({ values: [], rows, keyColumns: SUMMARY_KEY });
		const twice = mergeRows({ values: once, rows, keyColumns: SUMMARY_KEY });

		expect(twice).toEqual(once);
	});

	it("새 키는 끝에 붙인다", () => {
		const merged = mergeRows({
			values: [
				["주 시작일", "활성 사용자"],
				["2026-09-07", "400"],
			],
			rows: [{ "주 시작일": "2026-09-14", "활성 사용자": 430 }],
			keyColumns: SUMMARY_KEY,
		});

		expect(merged.slice(1)).toEqual([
			["2026-09-07", "400"],
			["2026-09-14", 430],
		]);
	});

	it("새 퍼널 열은 끝에 붙고, 옛 열과 행에 없는 열의 기존 값은 남는다", () => {
		const values = [
			["주 시작일", "활성 사용자", "퍼널: old_step", "기록 경위"],
			// 시트 API 는 행 끝의 빈 칸을 잘라서 돌려준다.
			["2026-09-07", "400", "12"],
			["2026-09-14", "410", "15", "정기"],
		];

		const merged = mergeRows({
			values,
			rows: [
				{
					"주 시작일": "2026-09-14",
					"활성 사용자": 430,
					"퍼널: new_step": 3,
					"기록 경위": "재실행",
				},
			],
			keyColumns: SUMMARY_KEY,
		});

		expect(merged).toEqual([
			[
				"주 시작일",
				"활성 사용자",
				"퍼널: old_step",
				"기록 경위",
				"퍼널: new_step",
			],
			["2026-09-07", "400", "12", "", ""],
			["2026-09-14", 430, "15", "재실행", 3],
		]);
	});

	it("이벤트 탭은 주와 이벤트를 합친 키로 덮어쓴다", () => {
		const values = [
			["주 시작일", "이벤트", "사용자 수"],
			["2026-09-07", "memo_write", "4"],
			["2026-09-07", "sign_up", "1"],
			["2026-09-14", "memo_write", "5"],
		];

		const merged = mergeRows({
			values,
			rows: [
				{ "주 시작일": "2026-09-07", 이벤트: "sign_up", "사용자 수": 2 },
				{ "주 시작일": "2026-09-14", 이벤트: "sign_up", "사용자 수": 0 },
			],
			keyColumns: EVENT_KEY,
		});

		expect(merged).toEqual([
			["주 시작일", "이벤트", "사용자 수"],
			["2026-09-07", "memo_write", "4"],
			["2026-09-07", "sign_up", 2],
			["2026-09-14", "memo_write", "5"],
			["2026-09-14", "sign_up", 0],
		]);
	});

	it("기존 행의 숫자 칸은 숫자 타입 그대로 남긴다", () => {
		const merged = mergeRows({
			values: [
				["주 시작일", "활성 사용자"],
				["2026-09-07", 57],
			],
			rows: [{ "주 시작일": "2026-09-14", "활성 사용자": 430 }],
			keyColumns: SUMMARY_KEY,
		});

		expect(merged[1]).toEqual(["2026-09-07", 57]);
		expect(typeof merged[1][1]).toBe("number");
	});

	it("한 번에 넘긴 행끼리 키가 겹치면 뒤의 행이 이긴다", () => {
		const merged = mergeRows({
			values: [],
			rows: [
				{ "주 시작일": "2026-09-14", "활성 사용자": 1 },
				{ "주 시작일": "2026-09-14", "활성 사용자": 2 },
			],
			keyColumns: SUMMARY_KEY,
		});

		expect(merged).toEqual([
			["주 시작일", "활성 사용자"],
			["2026-09-14", 2],
		]);
	});
});

describe("upsertTab", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("탭이 없으면 만들고, 빈 탭을 읽어 합친 결과를 A1 부터 덮어쓴다", async () => {
		const calls = [];
		const responses = [
			{ sheets: [{ properties: { title: "요약" } }] },
			{ replies: [{}] },
			{ range: "'이벤트'!A1:Z1000" },
			{ updatedRows: 2 },
		];

		vi.stubGlobal(
			"fetch",
			vi.fn(async (url, options = {}) => {
				calls.push({
					url,
					method: options.method ?? "GET",
					body: options.body,
				});

				return { ok: true, json: async () => responses.shift() };
			}),
		);

		await upsertTab({
			accessToken: "token",
			spreadsheetId: "sheet-id",
			title: "이벤트",
			rows: [
				{ "주 시작일": "2026-09-14", 이벤트: "memo_write", "사용자 수": 4 },
			],
			keyColumns: EVENT_KEY,
		});

		const base = "https://sheets.googleapis.com/v4/spreadsheets/sheet-id";
		const range = encodeURIComponent("'이벤트'");

		expect(calls.map(({ url, method }) => [method, url])).toEqual([
			["GET", `${base}?fields=sheets.properties.title`],
			["POST", `${base}:batchUpdate`],
			["GET", `${base}/values/${range}?valueRenderOption=UNFORMATTED_VALUE`],
			[
				"PUT",
				`${base}/values/${encodeURIComponent("'이벤트'!A1")}?valueInputOption=RAW`,
			],
		]);
		expect(JSON.parse(calls[1].body)).toEqual({
			requests: [{ addSheet: { properties: { title: "이벤트" } } }],
		});
		expect(JSON.parse(calls[3].body).values).toEqual([
			["주 시작일", "이벤트", "사용자 수"],
			["2026-09-14", "memo_write", 4],
		]);
	});
});
