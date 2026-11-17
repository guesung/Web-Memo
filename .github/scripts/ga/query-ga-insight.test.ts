// @ts-nocheck — .mjs 스크립트를 직접 import 하는 테스트라 타입 선언이 없습니다.
import { describe, expect, it } from "vitest";

import { HOST_NAME_FILTER, PRODUCTION_EVENT_FILTER } from "./ga4-client.mjs";
import {
	buildQueryBody,
	formatQueryResult,
	parseQueryOptions,
} from "./query-ga-insight.mjs";

// 서울 기준 2026-11-16
const NOW = new Date("2026-11-16T03:00:00Z");

const parse = (values) =>
	parseQueryOptions(
		{ from: "2026-11-15", to: "2026-11-15", dimensions: "hour", ...values },
		NOW,
	);

describe("parseQueryOptions", () => {
	it("기본값은 지표 activeUsers·eventCount, 50행이다", () => {
		expect(parse({})).toEqual({
			from: "2026-11-15",
			to: "2026-11-15",
			dimensions: ["hour"],
			metrics: ["activeUsers", "eventCount"],
			events: [],
			limit: 50,
		});
	});

	it("쉼표 목록을 공백을 걷어 내고 읽는다", () => {
		const options = parse({
			dimensions: "hour, screenResolution ,customEvent:extension_version",
			events: "memo_write, memo_content_saved",
			metrics: "totalUsers",
			limit: "200",
		});

		expect(options.dimensions).toEqual([
			"hour",
			"screenResolution",
			"customEvent:extension_version",
		]);
		expect(options.events).toEqual(["memo_write", "memo_content_saved"]);
		expect(options.metrics).toEqual(["totalUsers"]);
		expect(options.limit).toBe(200);
	});

	it.each([
		[{ from: undefined }, "YYYY-MM-DD"],
		[{ to: "11/15" }, "YYYY-MM-DD"],
		[{ from: "2026-11-16", to: "2026-11-15" }, "늦을 수 없습니다"],
		[{ to: "2026-11-17" }, "오늘"],
		[{ from: "2026-07-01" }, "최대 120일"],
		[{ dimensions: "" }, "--dimensions"],
		[{ dimensions: "date,hour,browser,country" }, "--dimensions"],
		[{ dimensions: "pagePath" }, "허용하지 않는 차원"],
		[{ dimensions: "customEvent:Bad-Name" }, "허용하지 않는 차원"],
		[{ metrics: "totalRevenue" }, "허용하지 않는 지표"],
		[{ events: "memo_write;rm" }, "snake_case"],
		[{ limit: "0" }, "--limit"],
		[{ limit: "201" }, "--limit"],
		[{ limit: "abc" }, "--limit"],
	])("틀린 인자 %j 는 이유를 담아 거절한다", (values, message) => {
		expect(() => parse(values)).toThrow(message);
	});
});

describe("buildQueryBody", () => {
	it("이벤트를 주면 production 필터에 이벤트 이름 조건을 더한다", () => {
		const body = buildQueryBody(parse({ events: "memo_write" }));

		expect(body.dimensionFilter).toEqual({
			andGroup: {
				expressions: [
					PRODUCTION_EVENT_FILTER,
					{
						filter: {
							fieldName: "eventName",
							inListFilter: { values: ["memo_write"] },
						},
					},
				],
			},
		});
		expect(body.dateRanges).toEqual([
			{ startDate: "2026-11-15", endDate: "2026-11-15" },
		]);
		expect(body.orderBys).toEqual([
			{ metric: { metricName: "activeUsers" }, desc: true },
		]);
		expect(body.limit).toBe(50);
	});

	it("이벤트 없이 일반 차원만 보면 호스트 허용 목록만 건다", () => {
		expect(buildQueryBody(parse({ dimensions: "date" })).dimensionFilter).toBe(
			HOST_NAME_FILTER,
		);
	});

	it.each(["eventName", "customEvent:extension_version"])(
		"이벤트를 안 줘도 차원이 %s 면 커스텀 이벤트를 세는 것이라 production 필터를 건다",
		(dimension) => {
			expect(
				buildQueryBody(parse({ dimensions: dimension })).dimensionFilter,
			).toBe(PRODUCTION_EVENT_FILTER);
		},
	);
});

describe("formatQueryResult", () => {
	it("행에 차원·지표 이름을 달고 어떤 필터로 셌는지 밝힌다", () => {
		const options = parse({
			dimensions: "hour,screenResolution",
			events: "memo_write",
		});
		const result = formatQueryResult({
			options,
			report: {
				rowCount: 12,
				rows: [
					{
						dimensionValues: [{ value: "23" }, { value: "1728x1117" }],
						metricValues: [{ value: "1" }, { value: "180" }],
					},
				],
			},
		});

		expect(result).toEqual({
			query: {
				from: "2026-11-15",
				to: "2026-11-15",
				events: ["memo_write"],
				filter: "호스트 허용 목록 + build_env=production",
			},
			rowCount: 12,
			rows: [
				{
					hour: "23",
					screenResolution: "1728x1117",
					activeUsers: 1,
					eventCount: 180,
				},
			],
		});
	});

	it("결과가 없으면 빈 행과 0 을 돌려준다", () => {
		const result = formatQueryResult({
			options: parse({ dimensions: "date" }),
			report: {},
		});

		expect(result.rows).toEqual([]);
		expect(result.rowCount).toBe(0);
		expect(result.query.filter).toBe("호스트 허용 목록");
	});
});
