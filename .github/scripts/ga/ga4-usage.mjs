/**
 * 임의 기간의 기능별(이벤트별) 사용량을 GA4 Data API 로 조회하고 표·CSV·JSON 으로 그립니다.
 *
 * 주간 리포트(ga4-weekly.mjs)는 "지난주를 한 번, Slack 으로" 답합니다. 이쪽은 "이
 * 기간에 이 기능을 몇 명이 몇 번 썼나"를 터미널에서 바로 묻는 용도입니다. 세는 기준은
 * 주간과 같은 조각을 그대로 씁니다 — 호스트 허용 목록과 production 조건, 이벤트 목록의
 * 원본(type.ts), 사람 수(totalUsers). 기준이 갈라지면 같은 기간인데 두 도구가 다른
 * 숫자를 내고, 둘 다 조용히 성공해서 어느 쪽이 틀렸는지 알 수 없습니다.
 *
 * 주간 리포트에 없는 것이 이 파일의 존재 이유입니다: 임의 기간, 이벤트 수, 사용자당
 * 횟수, 활성 사용자 대비 도입률.
 */

import {
	GA4_SCOPE,
	HOST_NAME_FILTER,
	PRODUCTION_EVENT_FILTER,
	REPORT_ROW_LIMIT,
	readRows,
	runReport,
} from "./ga4-client.mjs";
import { shiftDate } from "./ga4-data.mjs";
import { readAnalyticsEventNames } from "./ga4-weekly.mjs";
import { exchangeServiceAccountToken } from "../shared/google-auth.mjs";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** 두 YYYY-MM-DD 사이의 일수. 양 끝을 모두 셉니다. */
export const countDays = (start, end) =>
	Math.round(
		(Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) /
			86400000,
	) + 1;

/**
 * 실제로 존재하는 날짜인지 확인합니다.
 *
 * 형식만 보면 2026-02-30 이 통과합니다. 왕복해서 같은 문자열이 나오는지로 거릅니다.
 */
const isRealDate = (value) =>
	DATE_PATTERN.test(value) &&
	new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

/** 기간이 올바른지 검사하고, 아니면 무엇이 틀렸는지 적어 던집니다. */
export const assertValidPeriod = ({ start, end }) => {
	for (const [name, value] of [
		["--from", start],
		["--to", end],
	]) {
		if (!isRealDate(value)) {
			throw new Error(`${name} 은(는) 실제 날짜(YYYY-MM-DD)여야 합니다: ${value}`);
		}
	}

	if (start > end) {
		throw new Error(`--from(${start}) 이 --to(${end}) 보다 늦습니다`);
	}
};

/**
 * 직전 기간 = 같은 길이로 바로 앞선 기간.
 *
 * 주간 리포트가 "전주"와 비교하는 것을 임의 길이로 넓힌 것입니다. 길이가 다르면
 * 사용자 수가 기간 길이에 비례해 커지므로 증감이 기간 차이를 그대로 반영해 버립니다.
 */
export const resolvePreviousPeriod = ({ start, end }) => {
	const days = countDays(start, end);

	return { start: shiftDate(start, -days), end: shiftDate(start, -1) };
};

/** 이벤트 이름 → { users, events }. 행이 없는 이벤트는 호출부에서 0 으로 봅니다. */
const readEventTotals = (report) =>
	Object.fromEntries(
		readRows(report).map(({ dimensions, metrics }) => [
			dimensions[0],
			{ users: metrics[0], events: metrics[1] },
		]),
	);

/** 지표가 한 칸뿐인 응답에서 그 값만 꺼냅니다. 행이 없으면 0 입니다. */
const readSingleMetric = (report) => readRows(report)[0]?.metrics[0] ?? 0;

/**
 * GA 응답을 기능별 행으로 조립합니다. 네트워크를 쓰지 않는 순수 함수입니다.
 *
 * 분모가 0 인 비율은 null 입니다. 0 으로 적으면 "아무도 안 썼다"로 읽히는데 실제로는
 * 계산할 수 없다는 뜻입니다. 표시 계층이 "-" 로 그립니다.
 *
 * 도입률은 이 기능을 쓴 사람 ÷ 같은 기간의 활성 사용자입니다. 활성 사용자는 gtag 자동
 * 수집 기반이라 이벤트 쪽 사용자 수와 모수가 조금 다를 수 있어, 100%를 넘을 수 있습니다.
 */
export const buildUsageReport = ({
	eventNames,
	period,
	previousPeriod,
	current,
	previous,
	currentActive,
	previousActive,
}) => {
	const currentTotals = readEventTotals(current);
	const previousTotals = readEventTotals(previous);
	const activeUsers = readSingleMetric(currentActive);

	const rows = eventNames
		.map((eventName) => {
			const { users = 0, events = 0 } = currentTotals[eventName] ?? {};
			const previousUsers = previousTotals[eventName]?.users ?? 0;

			return {
				eventName,
				users,
				events,
				eventsPerUser: users > 0 ? events / users : null,
				adoptionRate: activeUsers > 0 ? users / activeUsers : null,
				previousUsers,
				change: previousUsers > 0 ? (users - previousUsers) / previousUsers : null,
			};
		})
		.sort(
			(a, b) =>
				b.users - a.users ||
				b.events - a.events ||
				a.eventName.localeCompare(b.eventName),
		);

	return {
		period,
		previousPeriod,
		activeUsers: {
			current: activeUsers,
			previous: readSingleMetric(previousActive),
		},
		rows,
	};
};

/**
 * 기간의 기능별 사용량을 조회합니다.
 *
 * 네 번의 runReport 로 모읍니다: 이벤트별 사용자·발생 수(이번 기간, 직전 기간)와
 * 활성 사용자(이번 기간, 직전 기간). 이벤트에는 호스트와 production 조건을,
 * 자동 수집에 기대는 활성 사용자에는 호스트 조건만 적용합니다.
 */
export const fetchFeatureUsage = async ({
	serviceAccountJson,
	propertyId,
	period,
}) => {
	assertValidPeriod(period);

	const eventNames = readAnalyticsEventNames();
	const previousPeriod = resolvePreviousPeriod(period);
	const accessToken = await exchangeServiceAccountToken({
		serviceAccount: JSON.parse(serviceAccountJson),
		scope: GA4_SCOPE,
	});

	const readEvents = ({ start, end }) =>
		runReport({
			accessToken,
			propertyId,
			body: {
				dateRanges: [{ startDate: start, endDate: end }],
				dimensions: [{ name: "eventName" }],
				metrics: [{ name: "totalUsers" }, { name: "eventCount" }],
				dimensionFilter: PRODUCTION_EVENT_FILTER,
				limit: REPORT_ROW_LIMIT,
			},
		});

	const readActive = ({ start, end }) =>
		runReport({
			accessToken,
			propertyId,
			body: {
				dateRanges: [{ startDate: start, endDate: end }],
				metrics: [{ name: "activeUsers" }],
				dimensionFilter: HOST_NAME_FILTER,
			},
		});

	const [current, previous, currentActive, previousActive] = await Promise.all([
		readEvents(period),
		readEvents(previousPeriod),
		readActive(period),
		readActive(previousPeriod),
	]);

	return buildUsageReport({
		eventNames,
		period,
		previousPeriod,
		current,
		previous,
		currentActive,
		previousActive,
	});
};

const formatPercent = (rate) =>
	rate === null ? "-" : `${(rate * 100).toFixed(1)}%`;

const formatChange = (rate) =>
	rate === null ? "-" : `${rate >= 0 ? "+" : ""}${Math.round(rate * 100)}%`;

const formatPerUser = (value) => (value === null ? "-" : value.toFixed(1));

/**
 * 터미널 표의 열 정의. 머리글을 영문으로 둔 이유가 있습니다.
 *
 * 한글은 터미널에서 두 칸을 차지해 padEnd 로 맞춘 열이 어긋납니다. 이벤트 이름과
 * 숫자는 모두 ASCII 라서 머리글만 ASCII 로 두면 열이 정확히 맞습니다.
 */
const TABLE_COLUMNS = [
	{ header: "event", align: "left", cell: (row) => row.eventName },
	{ header: "users", align: "right", cell: (row) => String(row.users) },
	{ header: "events", align: "right", cell: (row) => String(row.events) },
	{
		header: "per_user",
		align: "right",
		cell: (row) => formatPerUser(row.eventsPerUser),
	},
	{
		header: "adoption",
		align: "right",
		cell: (row) => formatPercent(row.adoptionRate),
	},
	{
		header: "prev_users",
		align: "right",
		cell: (row) => String(row.previousUsers),
	},
	{ header: "change", align: "right", cell: (row) => formatChange(row.change) },
];

/** 사람이 읽는 표. 기간 두 줄 아래에 열을 맞춰 그립니다. */
export const formatUsageTable = ({ period, previousPeriod, activeUsers, rows }) => {
	const cells = rows.map((row) => TABLE_COLUMNS.map((column) => column.cell(row)));
	const widths = TABLE_COLUMNS.map((column, index) =>
		Math.max(column.header.length, ...cells.map((line) => line[index].length)),
	);
	const drawLine = (values) =>
		values
			.map((value, index) =>
				TABLE_COLUMNS[index].align === "left"
					? value.padEnd(widths[index])
					: value.padStart(widths[index]),
			)
			.join("  ")
			.trimEnd();

	return [
		`기간 ${period.start} ~ ${period.end} (${countDays(period.start, period.end)}일)  활성 사용자 ${activeUsers.current}명`,
		`직전 ${previousPeriod.start} ~ ${previousPeriod.end}  활성 사용자 ${activeUsers.previous}명`,
		"",
		drawLine(TABLE_COLUMNS.map((column) => column.header)),
		drawLine(widths.map((width) => "-".repeat(width))),
		...cells.map(drawLine),
	].join("\n");
};

/** CSV 한 칸. 이벤트 이름과 숫자뿐이라 따옴표 처리가 필요 없습니다. null 은 빈 칸입니다. */
const csvCell = (value) => (value === null ? "" : String(value));

/** 스프레드시트로 옮기는 용도. 표와 달리 비율을 반올림하지 않은 원값으로 냅니다. */
export const formatUsageCsv = ({ rows }) =>
	[
		"event,users,events,events_per_user,adoption_rate,previous_users,change",
		...rows.map((row) =>
			[
				row.eventName,
				row.users,
				row.events,
				row.eventsPerUser,
				row.adoptionRate,
				row.previousUsers,
				row.change,
			]
				.map(csvCell)
				.join(","),
		),
	].join("\n");

/** 다른 도구에 넘기는 용도. */
export const formatUsageJson = (report) => JSON.stringify(report, null, 2);
