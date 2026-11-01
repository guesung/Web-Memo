#!/usr/bin/env node
/** 설치 코호트의 7일 내 유효 본문 저장을 운영 데이터에서 읽기 전용으로 관측한다. */
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import {
	GA4_SCOPE,
	HOST_NAME_FUNNEL_FILTER,
	PRODUCTION_EVENT_FILTER,
	runFunnelReport,
	runReport,
} from "./ga4-client.mjs";
import { shiftDate } from "./ga4-data.mjs";
import { exchangeServiceAccountToken } from "../shared/google-auth.mjs";
import { requireEnv } from "../shared/run-context.mjs";

const DAY_MS = 86_400_000;
const SOURCES = ["side_panel", "offline_sync"];
const LIMITATIONS = [
	"설치 식별자 기준이며 생애 최초 기록·실제 사람의 활성화율이 아닙니다.",
	"퍼널 API는 threshold 정보를 제공하지 않아 임계값 미적용을 확인할 수 없습니다.",
	"수집 누락·재설치·계정/기기 분리·응답 유실·재시도 중복이 있을 수 있습니다.",
	"source별 실패 비율은 수집된 write 결과 기준이며 실제 전체 저장 실패율이 아닙니다.",
	"버전 목록에는 관찰 중 업그레이드한 계측 버전도 포함해야 합니다.",
	"관찰값은 UI 개선의 인과 효과를 증명하지 않습니다. 과거 insert 비율을 기준선으로 쓰지 않습니다.",
];

function isDate(value) {
	return /^\d{4}-\d{2}-\d{2}$/.test(value ?? "") &&
		!Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
		new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

export function validateFirstMemoOptions({ from, to, instrumentedOn, versions }, now = new Date()) {
	if (![from, to, instrumentedOn].every(isDate) || from > to) {
		throw new Error("--from, --to, --instrumented-on 은 순서에 맞는 실제 날짜여야 합니다");
	}
	if (from <= instrumentedOn) throw new Error("부분 배포일을 제외하고 계측 도입일 다음 날부터 조회하세요");
	if (!Array.isArray(versions) || !versions.length || versions.some((v) => !/^\d+\.\d+\.\d+$/.test(v))) {
		throw new Error("--versions 에 명시적인 계측 버전 목록이 필요합니다 (예: 1.11.4,1.11.5)");
	}
	// 마지막 설치일 E 전체 + 7일을 끝낸 뒤 GA 처리에 48시간을 더 준다.
	const readyAt = new Date(`${shiftDate(to, 8)}T00:00:00+09:00`).getTime() + 2 * DAY_MS;
	if (now.getTime() < readyAt) throw new Error(`관찰/처리 미완료: ${new Date(readyAt).toISOString()} 이후 조회하세요`);
	return { followupEnd: shiftDate(to, 7), readyAt: new Date(readyAt).toISOString() };
}

const exact = (fieldName, value) => ({ filter: { fieldName, stringFilter: { matchType: "EXACT", value } } });
const funnelExact = (fieldName, value) => ({ funnelFieldFilter: { fieldName, stringFilter: { matchType: "EXACT", value } } });

export function buildFirstMemoFunnel({ from, to, versions }, target = "memo_content_saved") {
	return {
		dateRanges: [{ startDate: from, endDate: shiftDate(to, 7) }],
		funnel: {
			isOpenFunnel: false,
			steps: ["extension_installed", target].map((eventName, index) => ({
				name: eventName,
				...(index === 1 ? { withinDurationFromPriorStep: "604800s", isDirectlyFollowedBy: false } : {}),
				filterExpression: {
					andGroup: {
						expressions: [
							funnelExact("eventName", eventName),
							HOST_NAME_FUNNEL_FILTER,
							funnelExact("customEvent:build_env", "production"),
							{ orGroup: { expressions: versions.map((v) => funnelExact("customEvent:extension_version", v)) } },
							...(index === 0 ? [{ funnelFieldFilter: {
								fieldName: "date",
								betweenFilter: {
									fromValue: { int64Value: from.replaceAll("-", "") },
									toValue: { int64Value: to.replaceAll("-", "") },
								},
							} }] : []),
						],
					},
				},
			})),
		},
	};
}

function qualityIssues(report, metadata) {
	const issues = [];
	if (metadata?.samplingMetadatas?.length) issues.push("표본 추출 적용");
	if (metadata?.subjectToThresholding) issues.push("임곗값 적용 대상");
	if (metadata?.dataLossFromOtherRow) issues.push("other 행 데이터 손실");
	if (metadata?.dataTruncationReasons?.length || Number(report?.rowCount ?? 0) > (report?.rows?.length ?? 0)) issues.push("응답 행 잘림");
	return issues;
}

export function readFirstMemoFunnel(report, target = "memo_content_saved") {
	const table = report?.funnelTable;
	const issues = [
		...qualityIssues(table, table?.metadata),
		...qualityIssues(report?.funnelVisualization, report?.funnelVisualization?.metadata),
	];
	if (!table || !Array.isArray(table.rows)) return { status: "incomplete", issues: [...issues, "퍼널 표가 없습니다"] };
	const dimensionIndex = table.dimensionHeaders?.findIndex(({ name }) => name === "funnelStepName") ?? -1;
	const userIndex = table.metricHeaders?.findIndex(({ name }) => name === "activeUsers") ?? -1;
	if (dimensionIndex < 0 || userIndex < 0) return { status: "incomplete", issues: [...issues, "퍼널 단계/사용자 헤더가 없습니다"] };
	const counts = {};
	for (const row of table.rows) {
		const name = row.dimensionValues?.[dimensionIndex]?.value?.replace(/^\d+\.\s*/, "");
		const raw = row.metricValues?.[userIndex]?.value;
		const value = raw === undefined || raw === "" ? NaN : Number(raw);
		if (!["extension_installed", target].includes(name) || name in counts || !Number.isInteger(value) || value < 0) {
			issues.push("단계 또는 사용자 수가 올바르지 않습니다");
			continue;
		}
		counts[name] = value;
	}
	if (table.rows.length && !("extension_installed" in counts)) issues.push("설치 단계가 없습니다");
	const installed = counts.extension_installed ?? 0;
	const completed = counts[target] ?? 0;
	if (completed > installed) issues.push("분자가 분모보다 큽니다");
	return { status: issues.length ? "incomplete" : "observed", installed, completed, rate: !issues.length && installed > 0 ? completed / installed : null, issues };
}

export function readSaveResults(report) {
	const issues = qualityIssues(report, report?.metadata);
	if (report?.metadata?.timeZone !== "Asia/Seoul") issues.push("속성 시간대를 확인할 수 없거나 KST가 아닙니다");
	const sourceIndex = report?.dimensionHeaders?.findIndex(({ name }) => name === "customEvent:source") ?? -1;
	const successIndex = report?.dimensionHeaders?.findIndex(({ name }) => name === "customEvent:is_success") ?? -1;
	const countIndex = report?.metricHeaders?.findIndex(({ name }) => name === "eventCount") ?? -1;
	if (!Array.isArray(report?.rows) || [sourceIndex, successIndex, countIndex].some((i) => i < 0)) {
		return { status: "incomplete", issues: [...issues, "저장 결과 표/헤더가 없습니다"], sources: [] };
	}
	const totals = Object.fromEntries(SOURCES.map((source) => [source, { source, successes: 0, failures: 0 }]));
	for (const row of report.rows) {
		const source = row.dimensionValues?.[sourceIndex]?.value;
		const success = row.dimensionValues?.[successIndex]?.value;
		const raw = row.metricValues?.[countIndex]?.value;
		const count = raw === undefined || raw === "" ? NaN : Number(raw);
		if (!SOURCES.includes(source) || !["true", "false"].includes(success) || !Number.isInteger(count) || count < 0) {
			issues.push("저장 결과의 출처/성공 여부/횟수가 올바르지 않습니다");
			continue;
		}
		totals[source][success === "true" ? "successes" : "failures"] += count;
	}
	return {
		status: issues.length ? "incomplete" : "observed", issues,
		sources: Object.values(totals).map((row) => ({ ...row, observedFailureRate: !issues.length && row.successes + row.failures > 0 ? row.failures / (row.successes + row.failures) : null })),
	};
}

export async function measureFirstMemo(options, now = new Date()) {
	const observation = validateFirstMemoOptions(options, now);
	const accessToken = await exchangeServiceAccountToken({ serviceAccount: JSON.parse(options.serviceAccountJson), scope: GA4_SCOPE });
	const query = (body) => runFunnelReport({ accessToken, propertyId: options.propertyId, body });
	const funnels = {};
	for (const eventName of ["memo_content_saved", "side_panel_open", "memo_editor_ready"]) {
		const body = buildFirstMemoFunnel(options, eventName);
		funnels[eventName] = { ...readFirstMemoFunnel(await query(body), eventName), request: body };
	}
	const resultBody = {
		dateRanges: [{ startDate: options.from, endDate: observation.followupEnd }],
		dimensions: [{ name: "customEvent:source" }, { name: "customEvent:is_success" }],
		metrics: [{ name: "eventCount" }],
		dimensionFilter: { andGroup: { expressions: [PRODUCTION_EVENT_FILTER, exact("eventName", "memo_save_result"), { filter: { fieldName: "customEvent:extension_version", inListFilter: { values: options.versions } } }] } },
		limit: 10000,
	};
	const saveResults = readSaveResults(await runReport({ accessToken, propertyId: options.propertyId, body: resultBody }));
	return {
		metric: "신규 설치 식별자 중 설치 후 7일 이내 유효 메모 본문 저장 관측률",
		queriedAt: now.toISOString(), propertyId: options.propertyId,
		cohort: { from: options.from, to: options.to, instrumentedOn: options.instrumentedOn, versions: options.versions },
		observation, funnels, saveResults: { ...saveResults, period: resultBody.dateRanges[0], population: "대상 버전의 전체 수집 write 결과(설치 코호트 한정 아님)" },
		limitations: LIMITATIONS,
	};
}

async function main() {
	const { values } = parseArgs({ options: {
		from: { type: "string" }, to: { type: "string" },
		"instrumented-on": { type: "string" }, versions: { type: "string" },
		help: { type: "boolean", short: "h" },
	} });
	if (values.help) {
		console.log("사용법: node .github/scripts/ga/measure-first-memo.mjs --from YYYY-MM-DD --to YYYY-MM-DD --instrumented-on YYYY-MM-DD --versions 1.11.4,1.11.5\n환경: GA4_PROPERTY_ID, GA4_SERVICE_ACCOUNT_JSON. 읽기 전용 JSON 출력. 계측 도입일 다음 온전한 날짜부터 코호트를 선택하세요.");
		return;
	}
	const options = { from: values.from, to: values.to, instrumentedOn: values["instrumented-on"], versions: values.versions?.split(",").map((v) => v.trim()) };
	validateFirstMemoOptions(options);
	const report = await measureFirstMemo({ ...options, propertyId: requireEnv("GA4_PROPERTY_ID"), serviceAccountJson: requireEnv("GA4_SERVICE_ACCOUNT_JSON") });
	console.log(JSON.stringify(report, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	main().catch((error) => { console.error(`오류: ${error.message}`); process.exitCode = 1; });
}
