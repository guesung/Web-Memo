#!/usr/bin/env node
/**
 * AI 인사이트 단계가 리포트 수치를 더 잘게 나눠 보려고 부르는 읽기 전용 GA 조회 도구입니다.
 * report-ga-daily.yml·report-ga-weekly.yml 의 Claude 단계가 Bash 로 이 명령 하나만 쓸 수 있습니다.
 *
 * 모델이 요청 본문을 직접 쓰게 두지 않고 인자만 받는 이유는 두 가지입니다.
 * - 리포트와 같은 모수를 세게 합니다. 호스트 허용 목록과 production 조건을 여기서 강제해,
 *   모델이 필터를 빼먹어 로컬·스테이징 트래픽이 섞인 숫자를 인사이트로 내지 못하게 합니다.
 * - 조회 범위를 좁힙니다. 차원·지표는 허용 목록에 있는 것만, 기간은 최대 120일입니다.
 *
 * 사용법:
 *   GA4_PROPERTY_ID=471860782 \
 *   GA4_SERVICE_ACCOUNT_JSON="$(cat ~/ga4-service-account.json)" \
 *   node .github/scripts/ga/query-ga-insight.mjs --from 2026-11-15 --to 2026-11-15 \
 *     --dimensions hour,screenResolution --events memo_write [--metrics activeUsers,eventCount] [--limit 50]
 *
 * --events 를 주면 그 커스텀 이벤트만 셉니다(호스트 허용 목록 + build_env=production).
 * 생략하면 전체 트래픽을 호스트 허용 목록으로만 거릅니다. 단 차원에 eventName 이나
 * customEvent:* 가 있으면 커스텀 이벤트를 세는 것이므로 production 조건을 함께 겁니다.
 */

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import {
	GA4_SCOPE,
	HOST_NAME_FILTER,
	PRODUCTION_EVENT_FILTER,
	readRows,
	runReport,
} from "./ga4-client.mjs";
import { formatSeoulDate } from "./ga4-data.mjs";
import { exchangeServiceAccountToken } from "../shared/google-auth.mjs";
import { requireEnv } from "../shared/run-context.mjs";

/** 조회를 허용하는 차원. 사용자가 입력한 글이 실릴 수 있는 차원(pagePath·pageTitle 등)은 뺍니다. */
export const ALLOWED_DIMENSIONS = [
	"date",
	"hour",
	"dayOfWeek",
	"isoYearIsoWeek",
	"eventName",
	"deviceCategory",
	"screenResolution",
	"browser",
	"operatingSystem",
	"country",
	"language",
	"newVsReturning",
	"hostName",
	"sessionDefaultChannelGroup",
	"sessionSource",
	"sessionMedium",
];

/** 등록된 커스텀 차원(customEvent:extension_version 등). 등록되지 않은 이름은 GA 가 거절합니다. */
const CUSTOM_DIMENSION_PATTERN = /^customEvent:[a-z][a-z0-9_]*$/;

export const ALLOWED_METRICS = [
	"activeUsers",
	"totalUsers",
	"newUsers",
	"eventCount",
	"sessions",
];

const DEFAULT_METRICS = ["activeUsers", "eventCount"];
const EVENT_NAME_PATTERN = /^[a-z][a-z0-9_]*$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DIMENSIONS = 3;
const MAX_RANGE_DAYS = 120;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

const splitList = (value) =>
	String(value ?? "")
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);

const countDays = (from, to) =>
	Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000) + 1;

const isAllowedDimension = (name) =>
	ALLOWED_DIMENSIONS.includes(name) || CUSTOM_DIMENSION_PATTERN.test(name);

/**
 * 인자를 검증해 조회 옵션으로 바꿉니다. 틀린 인자는 무엇이 왜 틀렸는지 담아 던집니다.
 * 모델이 오류 문구를 읽고 인자를 고쳐 다시 부르므로 문구가 곧 사용 설명입니다.
 */
export const parseQueryOptions = (values, now = new Date()) => {
	const { from, to } = values;

	if (!DATE_PATTERN.test(from ?? "") || !DATE_PATTERN.test(to ?? "")) {
		throw new Error("--from 과 --to 는 YYYY-MM-DD 로 둘 다 주어야 합니다");
	}

	if (Number.isNaN(Date.parse(`${from}T00:00:00Z`)) || Number.isNaN(Date.parse(`${to}T00:00:00Z`))) {
		throw new Error("--from 또는 --to 가 존재하지 않는 날짜입니다");
	}

	if (from > to) {
		throw new Error("--from 은 --to 보다 늦을 수 없습니다");
	}

	if (to > formatSeoulDate(now)) {
		throw new Error("--to 는 오늘(서울 기준) 이후일 수 없습니다");
	}

	if (countDays(from, to) > MAX_RANGE_DAYS) {
		throw new Error(`조회 기간은 최대 ${MAX_RANGE_DAYS}일입니다`);
	}

	const dimensions = splitList(values.dimensions);

	if (dimensions.length === 0 || dimensions.length > MAX_DIMENSIONS) {
		throw new Error(`--dimensions 는 1~${MAX_DIMENSIONS}개를 쉼표로 줍니다`);
	}

	const badDimension = dimensions.find((name) => !isAllowedDimension(name));

	if (badDimension) {
		throw new Error(
			`허용하지 않는 차원입니다: ${badDimension}. 쓸 수 있는 차원: ${ALLOWED_DIMENSIONS.join(", ")}, customEvent:<등록된 파라미터>`,
		);
	}

	const metrics = values.metrics ? splitList(values.metrics) : DEFAULT_METRICS;
	const badMetric = metrics.find((name) => !ALLOWED_METRICS.includes(name));

	if (metrics.length === 0 || badMetric) {
		throw new Error(
			`허용하지 않는 지표입니다: ${badMetric ?? "(없음)"}. 쓸 수 있는 지표: ${ALLOWED_METRICS.join(", ")}`,
		);
	}

	const events = splitList(values.events);
	const badEvent = events.find((name) => !EVENT_NAME_PATTERN.test(name));

	if (badEvent) {
		throw new Error(`이벤트 이름은 snake_case 여야 합니다: ${badEvent}`);
	}

	const limit = values.limit === undefined ? DEFAULT_LIMIT : Number(values.limit);

	if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
		throw new Error(`--limit 은 1~${MAX_LIMIT} 사이 정수입니다`);
	}

	return { from, to, dimensions, metrics, events, limit };
};

/** 이 조회가 커스텀 이벤트를 세는가. 그렇다면 production 조건이 필요합니다. */
const countsCustomEvents = ({ dimensions, events }) =>
	events.length > 0 ||
	dimensions.some(
		(name) => name === "eventName" || CUSTOM_DIMENSION_PATTERN.test(name),
	);

/** 검증된 옵션을 runReport 본문으로 바꿉니다. 필터는 리포트와 같은 조각을 씁니다. */
export const buildQueryBody = (options) => {
	const { from, to, dimensions, metrics, events, limit } = options;
	const baseFilter = countsCustomEvents(options)
		? PRODUCTION_EVENT_FILTER
		: HOST_NAME_FILTER;

	return {
		dateRanges: [{ startDate: from, endDate: to }],
		dimensions: dimensions.map((name) => ({ name })),
		metrics: metrics.map((name) => ({ name })),
		dimensionFilter:
			events.length > 0
				? {
						andGroup: {
							expressions: [
								baseFilter,
								{
									filter: {
										fieldName: "eventName",
										inListFilter: { values: events },
									},
								},
							],
						},
					}
				: baseFilter,
		orderBys: [{ metric: { metricName: metrics[0] }, desc: true }],
		limit,
	};
};

/** 응답 행을 차원·지표 이름을 단 객체로 폅니다. 모델이 열 순서를 세지 않아도 됩니다. */
export const formatQueryResult = ({ options, report }) => {
	const rows = readRows(report).map(({ dimensions, metrics }) => ({
		...Object.fromEntries(
			options.dimensions.map((name, index) => [name, dimensions[index]]),
		),
		...Object.fromEntries(
			options.metrics.map((name, index) => [name, metrics[index]]),
		),
	}));

	return {
		query: {
			from: options.from,
			to: options.to,
			events: options.events,
			filter: countsCustomEvents(options)
				? "호스트 허용 목록 + build_env=production"
				: "호스트 허용 목록",
		},
		// rowCount 가 rows 보다 크면 limit 에 잘린 것입니다. 첫 지표가 큰 순으로 남습니다.
		rowCount: Number(report.rowCount ?? rows.length),
		rows,
	};
};

const main = async () => {
	const { values } = parseArgs({
		options: {
			from: { type: "string" },
			to: { type: "string" },
			dimensions: { type: "string" },
			metrics: { type: "string" },
			events: { type: "string" },
			limit: { type: "string" },
		},
	});
	const options = parseQueryOptions(values);
	const accessToken = await exchangeServiceAccountToken({
		serviceAccount: JSON.parse(requireEnv("GA4_SERVICE_ACCOUNT_JSON")),
		scope: GA4_SCOPE,
	});
	const report = await runReport({
		accessToken,
		propertyId: requireEnv("GA4_PROPERTY_ID"),
		body: buildQueryBody(options),
	});

	console.log(JSON.stringify(formatQueryResult({ options, report }), null, 2));
};

if (
	process.argv[1] &&
	pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
	try {
		await main();
	} catch (error) {
		// 스택 대신 한 줄만 냅니다. 이 출력은 모델이 읽고 인자를 고치는 데 씁니다.
		console.error(`조회 실패: ${error instanceof Error ? error.message : error}`);
		process.exitCode = 1;
	}
}
