#!/usr/bin/env node
/** 공지 노출 후 행동과, 관찰이 끝난 공지의 재방문을 읽기 전용으로 조회한다. */
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import {
	GA4_SCOPE,
	HOST_NAME_FUNNEL_FILTER,
	PRODUCTION_EVENT_FILTER,
	readRows,
	runFunnelReport,
	runReport,
} from "./ga4-client.mjs";
import { formatSeoulDate, shiftDate } from "./ga4-data.mjs";
import { exchangeServiceAccountToken } from "../shared/google-auth.mjs";
import { requireEnv } from "../shared/run-context.mjs";

const DAY_MS = 86400000;
const MEMO_EVENTS = ["memo_first_write", "memo_write"];
const USAGE = `사용법: node .github/scripts/ga/measure-notice-return.mjs --mode historical|prospective --from YYYY-MM-DD --to YYYY-MM-DD [--notice-id ID --dimension-registered-on YYYY-MM-DD]

historical: 공지 노출 후 168시간 이내 후속 행동 (D0 포함, 재방문율 아님)
prospective: 공지별 [S,E] 노출과 [S+1,E+7] 재방문. --notice-id, --dimension-registered-on 필수.
환경 변수: GA4_PROPERTY_ID, GA4_SERVICE_ACCOUNT_JSON`;

function isDate(value) {
	return /^\d{4}-\d{2}-\d{2}$/.test(value ?? "") &&
		!Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
		new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

function exact(fieldName, value) {
	return { filter: { fieldName, stringFilter: { matchType: "EXACT", value: String(value) } } };
}

function funnelExact(fieldName, value) {
	return { funnelFieldFilter: { fieldName, stringFilter: { matchType: "EXACT", value: String(value) } } };
}

function eventFilter(eventNames, { noticeId, firstPeriod } = {}) {
	const expressions = [
		{ orGroup: { expressions: eventNames.map((name) => funnelExact("eventName", name)) } },
		HOST_NAME_FUNNEL_FILTER,
		funnelExact("customEvent:build_env", "production"),
	];
	if (noticeId !== undefined) expressions.push(funnelExact("customEvent:notice_id", noticeId));
	if (firstPeriod) {
		expressions.push({
			funnelFieldFilter: {
				fieldName: "date",
				betweenFilter: {
					fromValue: { int64Value: firstPeriod.start.replaceAll("-", "") },
					toValue: { int64Value: firstPeriod.end.replaceAll("-", "") },
				},
			},
		});
	}
	return { andGroup: { expressions } };
}

function readFunnel(report, firstName, secondName) {
	const table = report.funnelTable;
	if (!table || !Array.isArray(table.rows)) return { status: "incomplete", reason: "퍼널 표가 없습니다" };
	if (table.metadata?.samplingMetadatas?.length) return { status: "incomplete", reason: "GA4 퍼널에 표본 추출이 적용됐습니다" };
	const usersIndex = table.metricHeaders?.findIndex(({ name }) => name === "activeUsers") ?? -1;
	if (table.rows.length && usersIndex < 0) return { status: "incomplete", reason: "퍼널 사용자 지표가 없습니다" };
	const counts = Object.fromEntries(table.rows.map((row) => [
		row.dimensionValues?.[0]?.value?.replace(/^\d+\.\s*/, ""),
		Number(row.metricValues?.[usersIndex]?.value),
	]));
	const first = counts[firstName] ?? 0;
	const second = counts[secondName] ?? 0;
	if (![first, second].every((value) => Number.isFinite(value) && value >= 0) || second > first) {
		return { status: "incomplete", reason: "퍼널 사용자 수가 올바르지 않습니다" };
	}
	return { status: "observed", firstUsers: first, followupUsers: second };
}

async function fetchFunnel({ accessToken, propertyId, firstName, firstEvents, secondName, secondEvents, firstPeriod, seconds, noticeId }) {
	const response = await runFunnelReport({
		accessToken,
		propertyId,
		body: {
			dateRanges: [{ startDate: firstPeriod.start, endDate: shiftDate(firstPeriod.end, Math.ceil(seconds / 86400)) }],
			funnel: {
				steps: [
					{ name: firstName, filterExpression: eventFilter(firstEvents, { noticeId, firstPeriod }) },
					{ name: secondName, filterExpression: eventFilter(secondEvents), withinDurationFromPriorStep: `${seconds}s` },
				],
			},
		},
	});
	return readFunnel(response, firstName, secondName);
}

function readEventUsers(report, noticeId) {
	if (report.metadata?.timeZone && report.metadata.timeZone !== "Asia/Seoul") {
		return { status: "incomplete", reason: `GA4 속성 시간대가 KST가 아닙니다: ${report.metadata.timeZone}` };
	}
	if (report.metadata?.subjectToThresholding || report.metadata?.dataLossFromOtherRow) {
		return { status: "incomplete", reason: "GA4 임곗값 또는 (other) 행으로 일부 데이터가 숨겨졌습니다" };
	}
	if (report.metadata?.samplingMetadatas?.length) {
		return { status: "incomplete", reason: "GA4 보고서에 표본 추출이 적용됐습니다" };
	}
	if (Number(report.rowCount ?? 0) > (report.rows?.length ?? 0)) {
		return { status: "incomplete", reason: "GA4 응답 행이 잘렸습니다" };
	}
	const rows = readRows(report);
	if (rows.length === 0) return { status: "observed", users: 0 };
	if (rows.length !== 1 || rows[0].dimensions[0] !== String(noticeId)) {
		return { status: "incomplete", reason: "공지 ID가 예상과 다른 응답입니다" };
	}
	const users = Number(report.rows[0].metricValues?.[0]?.value);
	if (!Number.isFinite(users) || users < 0) return { status: "incomplete", reason: "사용자 수가 올바르지 않습니다" };
	return { status: "observed", users };
}

async function fetchEventUsers({ accessToken, propertyId, noticeId, eventName, start, end }) {
	const response = await runReport({
		accessToken,
		propertyId,
		body: {
			dateRanges: [{ startDate: start, endDate: end }],
			dimensions: [{ name: "customEvent:notice_id" }],
			metrics: [{ name: "totalUsers" }],
			dimensionFilter: {
				andGroup: {
					expressions: [PRODUCTION_EVENT_FILTER, exact("eventName", eventName), exact("customEvent:notice_id", noticeId)],
				},
			},
		},
	});
	return readEventUsers(response, noticeId);
}

export function validateOptions({ mode, from, to, noticeId, dimensionRegisteredOn }, now = new Date()) {
	if (!["historical", "prospective"].includes(mode)) throw new Error("--mode 는 historical 또는 prospective 여야 합니다");
	if (!isDate(from) || !isDate(to) || from > to) throw new Error("--from/--to 는 순서대로 된 실제 날짜여야 합니다");
	if (mode === "historical") return;
	if (!/^[1-9]\d*$/.test(noticeId ?? "")) throw new Error("--notice-id 는 양의 정수여야 합니다");
	if (!isDate(dimensionRegisteredOn) || from < dimensionRegisteredOn) throw new Error("--dimension-registered-on 이후 시작한 공지만 조회할 수 있습니다");
	// E+7일 전체를 관찰한 뒤 48시간 동안 GA4 처리를 기다린다 (KST 자정 기준).
	const readyAt = new Date(`${shiftDate(to, 8)}T00:00:00+09:00`).getTime() + 2 * DAY_MS;
	if (now.getTime() < readyAt) throw new Error(`관찰/처리 미완료: ${new Date(readyAt).toISOString()} 이후 조회하세요`);
}

export async function measureNoticeReturn({ mode, from, to, noticeId, dimensionRegisteredOn, serviceAccountJson, propertyId }, now = new Date()) {
	validateOptions({ mode, from, to, noticeId, dimensionRegisteredOn }, now);
	const accessToken = await exchangeServiceAccountToken({ serviceAccount: JSON.parse(serviceAccountJson), scope: GA4_SCOPE });
	const firstPeriod = { start: from, end: to };
	if (mode === "historical") {
		const readyAt = new Date(`${shiftDate(to, 8)}T00:00:00+09:00`).getTime() + 2 * DAY_MS;
		const [panel, memo] = await Promise.all([
			fetchFunnel({ accessToken, propertyId, firstPeriod, firstName: "notice_view", firstEvents: ["notice_view"], secondName: "side_panel_open", secondEvents: ["side_panel_open"], seconds: 604800 }),
			fetchFunnel({ accessToken, propertyId, firstPeriod, firstName: "notice_view", firstEvents: ["notice_view"], secondName: "memo_action", secondEvents: MEMO_EVENTS, seconds: 604800 }),
		]);
		return {
			mode, status: "효과 미확인",
			label: "공지 노출 후 168시간 이내 후속 행동 (D0 포함, 재방문율·인과 효과 아님)",
			period: firstPeriod,
			observationWindowComplete: now.getTime() >= readyAt,
			limitations: now.getTime() < readyAt ? ["168시간 관찰과 GA 처리 48시간이 끝나지 않아 잠정값입니다"] : [],
			panel, memo,
		};
	}
	const returnPeriod = { start: shiftDate(from, 1), end: shiftDate(to, 7) };
	const [views, returns, memo] = await Promise.all([
		fetchEventUsers({ accessToken, propertyId, noticeId, eventName: "notice_view", start: from, end: to }),
		fetchEventUsers({ accessToken, propertyId, noticeId, eventName: "notice_return", start: returnPeriod.start, end: returnPeriod.end }),
		fetchFunnel({ accessToken, propertyId, firstPeriod: returnPeriod, firstName: "notice_return", firstEvents: ["notice_return"], secondName: "memo_action", secondEvents: MEMO_EVENTS, seconds: 86400, noticeId }),
	]);
	const incomplete = views.status !== "observed" || returns.status !== "observed" || views.users === 0 || returns.users > views.users;
	const incompleteReasons = [
		views.reason,
		returns.reason,
		views.users === 0 ? "공지 노출 사용자가 없어 비율을 계산할 수 없습니다" : null,
		returns.users > views.users ? "재방문 사용자가 노출 사용자보다 많아 데이터 확인이 필요합니다" : null,
	].filter(Boolean);
	return {
		mode,
		label: "공지별 D1–D7 패널 재열기 관찰값 (인과 효과 아님)",
		noticeId,
		viewPeriod: firstPeriod,
		returnPeriod,
		views,
		returns,
		rate: incomplete ? null : returns.users / views.users,
		status: incomplete ? "효과 미확인" : "관찰 완료",
		incompleteReasons,
		memo: { ...memo, label: "재방문 뒤 24시간 내 메모 행동 (탐색 지표)" },
		limitations: ["저장소 실패·네트워크 누락·다중 기기 식별·동시 기능 출시가 관찰값에 영향을 줄 수 있습니다"],
	};
}

async function main() {
	const { values } = parseArgs({ options: {
		mode: { type: "string" }, from: { type: "string" }, to: { type: "string" },
		"notice-id": { type: "string" }, "dimension-registered-on": { type: "string" },
		help: { type: "boolean", short: "h" },
	} });
	if (values.help) return console.log(USAGE);
	const options = { mode: values.mode, from: values.from, to: values.to, noticeId: values["notice-id"], dimensionRegisteredOn: values["dimension-registered-on"] };
	validateOptions(options);
	const report = await measureNoticeReturn({ ...options, propertyId: requireEnv("GA4_PROPERTY_ID"), serviceAccountJson: requireEnv("GA4_SERVICE_ACCOUNT_JSON") });
	console.log(JSON.stringify(report, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	try { await main(); } catch (error) { console.error(`오류: ${error.message}`); process.exitCode = 1; }
}
