/**
 * AI 인사이트 단계가 읽을 입력(리포트가 조회한 수치 + 게시된 메시지의 위치)을 만듭니다.
 *
 * 리포트 스크립트가 Slack 에 본문을 올린 뒤 이 파일을 남기고, 워크플로의 다음 단계가
 * Claude 에게 읽힌 다음 send-ga-insight.mjs 가 같은 파일의 slack.ts 로 스레드 댓글을 답니다.
 * 모델이 본 숫자와 사람이 채널에서 본 숫자가 같아야 하므로, 다시 조회하지 않고
 * 리포트가 이미 가진 집계를 그대로 싣습니다.
 */

import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

/**
 * 자동저장 때문에 건수가 사용량보다 훨씬 크게 찍히는 이벤트.
 *
 * 이 이벤트들은 저장·변경 해석 호출마다 발생해 한 사람이 메모 하나를 쓰는 동안에도
 * 수십 건이 쌓입니다(docs/events.md). 건수를 "많이 썼다"로 읽으면 틀리므로, 모델이
 * 사람 수를 기준으로 보도록 입력에 함께 싣습니다.
 */
export const INFLATED_EVENTS = [
	"memo_write",
	"memo_content_saved",
	"memo_save_result",
	"memo_editor_ready",
];

/** 추이로 넘길 주 수. 그 주를 포함해 최근 8주입니다. */
export const TREND_WEEKS = 8;

/**
 * 일일 리포트의 이벤트 표에서 어제와 7일 평균이 모두 0 인 줄을 뺍니다.
 * 추적 이벤트 대부분이 조용한 날이 많아, 그대로 두면 입력의 절반이 0 으로 채워집니다.
 */
const pickActiveEvents = (events) =>
	Object.fromEntries(
		Object.entries(events).filter(
			([, { users, count }]) =>
				users.yesterday > 0 ||
				users.average7 > 0 ||
				count.yesterday > 0 ||
				count.average7 > 0,
		),
	);

/**
 * 일일 인사이트 입력.
 *
 * @param {object} params
 * @param {object} params.report fetchDailyGa4Report 의 결과
 * @param {object} [params.searchQueries] fetchTopSearchQueries 의 결과
 * @param {{ channel: string, ts: string }} params.slack 게시된 리포트 메시지의 위치
 * @param {string | null} params.runUrl
 */
export const buildDailyInsightContext = ({
	report,
	searchQueries,
	slack,
	runUrl,
}) => ({
	kind: "daily",
	targetDate: report.targetDate,
	slack,
	runUrl,
	inflatedEvents: INFLATED_EVENTS,
	// users·count 의 yesterday 는 어제 하루, average7 은 그 직전 7일의 일평균입니다.
	events: pickActiveEvents(report.events),
	outliers: report.outliers,
	unreleasedEvents: report.unreleasedEvents,
	observation: {
		start: report.observationStart,
		truncated: report.observationTruncated,
	},
	trafficTotals: report.trafficTotals,
	googleSearch: report.googleSearch ?? null,
	searchQueries: searchQueries ?? null,
});

const readWeekday = (date) => new Date(`${date}T00:00:00Z`).getUTCDay();

/**
 * 시트 요약 탭의 행에서 그 주까지의 최근 주들을 오래된 순으로 고릅니다.
 *
 * 이번 주와 시작 요일이 같은 행만 씁니다. 2026-11 에 주 경계가 월~일에서 토~금으로
 * 바뀌어 시트에 두 기준의 행이 섞여 있고 기간이 서로 겹칩니다. 섞어 넘기면 같은 날들이
 * 두 번 세어진 추이가 됩니다.
 *
 * 주 시작일이 문자열(YYYY-MM-DD)이 아닌 행도 뺍니다. 사람이 칸을 날짜 형식으로 바꾸면
 * 일련번호로 읽혀 정렬이 깨지는데, 그런 행을 추이에 섞느니 빠진 것이 낫습니다.
 */
export const pickRecentWeeks = ({ rows, weekStart, count = TREND_WEEKS }) =>
	rows
		.filter((row) => /^\d{4}-\d{2}-\d{2}$/.test(String(row["주 시작일"] ?? "")))
		.filter((row) => row["주 시작일"] <= weekStart)
		.filter((row) => readWeekday(row["주 시작일"]) === readWeekday(weekStart))
		.sort((a, b) => a["주 시작일"].localeCompare(b["주 시작일"]))
		.slice(-count);

/**
 * 주간 인사이트 입력.
 *
 * @param {object} params
 * @param {object} params.report fetchWeeklyGa4Report 의 결과
 * @param {object | null} params.retention fetchMemoRetention 의 결과
 * @param {object[] | null} params.trendRows 시트 요약 탭의 최근 주 행(헤더 → 값). 못 읽었으면 null
 * @param {{ channel: string, ts: string }} params.slack 게시된 리포트 메시지의 위치
 * @param {string | null} params.runUrl
 */
export const buildWeeklyInsightContext = ({
	report,
	retention,
	trendRows,
	slack,
	runUrl,
}) => ({
	kind: "weekly",
	week: {
		start: report.start,
		end: report.end,
		previousStart: report.previousStart,
		previousEnd: report.previousEnd,
	},
	slack,
	runUrl,
	inflatedEvents: INFLATED_EVENTS,
	activeUsers: report.activeUsers,
	// 그 주에 1명 이상 쓴 이벤트. users 는 사람 수, count 는 건수, previous* 는 전주입니다.
	features: report.features,
	funnel: report.funnel,
	channels: report.channels,
	unused: report.unused,
	thresholds: report.thresholds,
	retention,
	// 시트가 없거나 읽지 못한 실행에서는 rows 가 null 입니다. 그때는 추이를 직접 조회해야 합니다.
	trend: {
		source: "sheet",
		note: "한 행이 한 주이고 오래된 순입니다. 이번 주와 시작 요일이 같은 행만 골랐습니다. 빈 칸은 그 주에 조회하지 않은 값입니다.",
		rows: trendRows,
	},
});

/** 입력 JSON 을 파일로 남깁니다. 폴더가 없으면 만듭니다. */
export const writeInsightContext = async ({ path, context }) => {
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, `${JSON.stringify(context, null, 2)}\n`);
};

/**
 * 워크플로가 AI 단계를 돌릴지 가르는 step output 을 남깁니다.
 * 로컬 실행에는 GITHUB_OUTPUT 이 없어 아무것도 쓰지 않습니다.
 */
export const writeInsightOutputs = async ({ ready, via, outputPath }) => {
	if (!outputPath) {
		return;
	}

	await appendFile(
		outputPath,
		`insight_ready=${ready ? "true" : "false"}\nposted_via=${via}\n`,
	);
};
