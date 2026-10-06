#!/usr/bin/env node
/**
 * 지난주 한 주의 GA4 사용 현황을 집계해 Slack에 게시하고 구글 시트에 쌓습니다.
 * .github/workflows/report-ga-weekly.yml 이 매주 월요일 아침(서울 08:00) 호출합니다.
 *
 * 데일리 리포트와 목적이 다릅니다. 그쪽은 "로깅이 살아 있는가"를 감시하고,
 * 이쪽은 "사람들이 무엇을 쓰고 있고 다음에 무엇을 만들어야 하는가"에 답합니다.
 * 두 질문을 한 메시지에 섞지 않으려고 리포트를 따로 뺐습니다.
 *
 * 두 가지로 돕니다.
 * - 정기 모드(WEEK_FROM·WEEK_TO 없음): 지난주를 Slack 에 게시하고 시트에 씁니다.
 * - 백필 모드(WEEK_FROM·WEEK_TO 모두 있음): 지난 주들을 시트에만 씁니다. Slack 에
 *   옛 주 리포트가 수십 개 쏟아지면 채널이 읽히지 않으므로 게시하지 않습니다.
 *
 * 로컬 실행 (SLACK_REPORT_WEBHOOK_URL 없이 돌리면 보낼 페이로드를 stdout에 찍고,
 * GA_SHEET_ID 없이 돌리면 시트 쓰기를 건너뜁니다):
 *   GA4_PROPERTY_ID=471860782 \
 *   GA4_SERVICE_ACCOUNT_JSON="$(cat ~/ga4-service-account.json)" \
 *   node .github/scripts/ga/report-weekly-ga.mjs
 *
 * 시트까지 쓰기 (서비스 계정 이메일을 시트에 편집자로 공유해 두어야 합니다):
 *   GA4_PROPERTY_ID=471860782 \
 *   GA4_SERVICE_ACCOUNT_JSON="$(cat ~/ga4-service-account.json)" \
 *   GA_SHEET_ID=<스프레드시트 URL 의 /d/ 와 /edit 사이> \
 *   node .github/scripts/ga/report-weekly-ga.mjs
 *
 * 백필 (월요일 YYYY-MM-DD, to 는 지난주 월요일 이하. GA_SHEET_ID 필수):
 *   GA4_PROPERTY_ID=471860782 \
 *   GA4_SERVICE_ACCOUNT_JSON="$(cat ~/ga4-service-account.json)" \
 *   GA_SHEET_ID=<스프레드시트 ID> \
 *   WEEK_FROM=2025-01-06 WEEK_TO=2026-09-14 \
 *   node .github/scripts/ga/report-weekly-ga.mjs
 */

import {
	buildEventRows,
	buildSummaryRow,
	EVENT_TAB,
	formatSeoulMinute,
	SHEETS_SCOPE,
	SUMMARY_TAB,
	upsertTab,
} from "./ga4-sheet.mjs";
import {
	fetchWeeklyActiveUsers,
	fetchWeeklyGa4Report,
	resolveRunPlan,
	shouldFetchEvents,
} from "./ga4-weekly.mjs";
import { exchangeServiceAccountToken } from "../shared/google-auth.mjs";
import { requireEnv } from "../shared/run-context.mjs";
import { postToSlack } from "../shared/slack-blocks.mjs";
import { buildWeeklyReportPayload } from "./weekly-report-blocks.mjs";

const SUMMARY_KEY_COLUMNS = ["주 시작일"];
const EVENT_KEY_COLUMNS = ["주 시작일", "이벤트"];

/** 기존 Slack 게시. 웹훅이 없으면 페이로드를 찍고 건너뜁니다. */
const postReportToSlack = async ({ report, spreadsheetId }) => {
	const repository = process.env.GITHUB_REPOSITORY;
	const runId = process.env.GITHUB_RUN_ID;
	const serverUrl = process.env.GITHUB_SERVER_URL ?? "https://github.com";
	const payload = buildWeeklyReportPayload({
		report,
		// 로컬 실행에는 런이 없습니다. 링크 없이 나머지만 싣습니다.
		runUrl:
			repository && runId
				? `${serverUrl}/${repository}/actions/runs/${runId}`
				: null,
		// 시트 기록을 건너뛰는 실행(GA_SHEET_ID 없음)에는 가리킬 시트가 없습니다.
		sheetUrl: spreadsheetId
			? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
			: null,
	});

	if (!process.env.SLACK_REPORT_WEBHOOK_URL) {
		console.warn(
			"::warning::SLACK_REPORT_WEBHOOK_URL 이 없어 Slack 전송을 건너뜁니다",
		);
		console.log(JSON.stringify(payload, null, 2));

		return;
	}

	await postToSlack(process.env.SLACK_REPORT_WEBHOOK_URL, payload);
};

/**
 * 모은 행을 탭마다 한 번씩 합쳐 씁니다.
 *
 * 시트 토큰은 GA 조회 토큰과 따로 받습니다. GA 쪽은 읽기 전용 scope 만 갖게 두어,
 * 조회 코드가 실수로 시트를 건드릴 수 없게 합니다.
 */
const writeRowsToSheet = async ({
	serviceAccountJson,
	spreadsheetId,
	summaryRows,
	eventRows,
}) => {
	const accessToken = await exchangeServiceAccountToken({
		serviceAccount: JSON.parse(serviceAccountJson),
		scope: SHEETS_SCOPE,
	});

	await upsertTab({
		accessToken,
		spreadsheetId,
		title: SUMMARY_TAB,
		rows: summaryRows,
		keyColumns: SUMMARY_KEY_COLUMNS,
	});

	if (eventRows.length > 0) {
		await upsertTab({
			accessToken,
			spreadsheetId,
			title: EVENT_TAB,
			rows: eventRows,
			keyColumns: EVENT_KEY_COLUMNS,
		});
	}

	console.log(
		`시트 기록: ${SUMMARY_TAB} ${summaryRows.length}행, ${EVENT_TAB} ${eventRows.length}행`,
	);
};

/** 주간 리포트 한 벌을 요약 행과 이벤트 행으로 바꿉니다. */
const buildRowsFromReport = ({ report, week, recordedAt, source }) => ({
	summaryRow: buildSummaryRow({
		week,
		activeUsers: report.activeUsers.current,
		funnel: report.funnel,
		recordedAt,
		source,
	}),
	eventRows: buildEventRows({
		week,
		eventNames: report.eventNames,
		features: report.features,
		recordedAt,
		source,
	}),
});

/**
 * 정기 모드. Slack 게시와 시트 쓰기를 **둘 다 시도한 뒤** 실패를 모아 알립니다.
 *
 * 한쪽이 실패했다고 다른 쪽을 건너뛰면, 시트 권한 하나가 풀린 것으로 그 주 Slack
 * 리포트까지 사라집니다. 둘은 서로 독립된 출력이라 각자 끝까지 가게 하고, 실패는
 * 잡의 실패로 드러내 실패 알림 스텝이 돌게 합니다.
 */
const runRegular = async ({
	serviceAccountJson,
	propertyId,
	spreadsheetId,
	plan,
	recordedAt,
}) => {
	const [week] = plan.weeks;
	const report = await fetchWeeklyGa4Report({
		serviceAccountJson,
		propertyId,
		week,
	});
	const failures = [];

	try {
		await postReportToSlack({ report, spreadsheetId });
	} catch (error) {
		failures.push({ step: "Slack 게시", error });
	}

	if (!spreadsheetId) {
		console.warn("::warning::GA_SHEET_ID 가 없어 시트 기록을 건너뜁니다");
	} else {
		try {
			const { summaryRow, eventRows } = buildRowsFromReport({
				report,
				week,
				recordedAt,
				source: plan.source,
			});

			await writeRowsToSheet({
				serviceAccountJson,
				spreadsheetId,
				summaryRows: [summaryRow],
				eventRows,
			});
		} catch (error) {
			failures.push({ step: "시트 기록", error });
		}
	}

	for (const { step, error } of failures) {
		console.error(`::error::${step} 실패: ${error.message}`);
	}

	if (failures.length > 0) {
		process.exitCode = 1;
	}
};

/**
 * 백필 모드. 주마다 조회해 행을 모은 뒤 탭마다 한 번씩 씁니다.
 *
 * 주마다 시트에 쓰면 90주 백필이 쓰기 요청만 수백 번이라 Sheets API 분당 한도에
 * 걸립니다. 모아서 한 번에 씁니다.
 *
 * 한 주의 조회가 실패해도 멈추지 않고 나머지를 계속합니다. 성공한 주는 쓰고, 실패한
 * 주는 끝에 모아 알린 뒤 잡을 실패시킵니다. 쓰기가 키 기준 덮어쓰기라 같은 범위를
 * 다시 돌리면 실패한 주만 채워지고 성공한 주는 같은 값으로 덮입니다.
 *
 * 조회는 한 주씩 차례로 합니다. 병렬로 90주를 치면 GA Data API 의 동시 요청
 * 한도에 걸려 실패한 주만 늘어납니다.
 */
const runBackfill = async ({
	serviceAccountJson,
	propertyId,
	spreadsheetId,
	plan,
	recordedAt,
}) => {
	const summaryRows = [];
	const eventRows = [];
	const failedWeeks = [];

	console.log(
		`백필: ${plan.weeks[0].start} ~ ${plan.weeks.at(-1).start} (${plan.weeks.length}주)`,
	);

	for (const week of plan.weeks) {
		try {
			if (shouldFetchEvents(week)) {
				const report = await fetchWeeklyGa4Report({
					serviceAccountJson,
					propertyId,
					week,
				});
				const rows = buildRowsFromReport({
					report,
					week,
					recordedAt,
					source: plan.source,
				});

				summaryRows.push(rows.summaryRow);
				eventRows.push(...rows.eventRows);
				console.log(
					`${week.start}: 활성 사용자 ${report.activeUsers.current}명, 이벤트 ${rows.eventRows.length}종`,
				);

				continue;
			}

			const activeUsers = await fetchWeeklyActiveUsers({
				serviceAccountJson,
				propertyId,
				week,
			});

			summaryRows.push(
				buildSummaryRow({
					week,
					activeUsers,
					funnel: null,
					recordedAt,
					source: plan.source,
				}),
			);
			console.log(
				`${week.start}: 활성 사용자 ${activeUsers}명 (이벤트·퍼널 조회 전 주라 요약만)`,
			);
		} catch (error) {
			failedWeeks.push(week.start);
			console.error(`::error::${week.start} 주 조회 실패: ${error.message}`);
		}
	}

	if (summaryRows.length > 0) {
		await writeRowsToSheet({
			serviceAccountJson,
			spreadsheetId,
			summaryRows,
			eventRows,
		});
	}

	if (failedWeeks.length > 0) {
		console.error(
			`::error::${failedWeeks.length}주 조회 실패 — 같은 범위로 다시 돌리면 채워집니다: ${failedWeeks.join(", ")}`,
		);
		process.exitCode = 1;
	}
};

const main = async () => {
	const now = new Date();
	// 입력 검증을 자격 증명보다 먼저 합니다. 범위가 틀렸으면 아무것도 조회·기록하지 않습니다.
	const plan = resolveRunPlan({
		eventName: process.env.GITHUB_EVENT_NAME,
		weekFrom: process.env.WEEK_FROM,
		weekTo: process.env.WEEK_TO,
		now,
	});
	const spreadsheetId = process.env.GA_SHEET_ID;

	// 백필은 시트에만 씁니다. 시트가 없으면 90주를 조회하고 버리게 되니 먼저 멈춥니다.
	if (plan.mode === "backfill" && !spreadsheetId) {
		throw new Error("백필은 시트에만 기록합니다. GA_SHEET_ID 를 설정하세요");
	}

	const context = {
		serviceAccountJson: requireEnv("GA4_SERVICE_ACCOUNT_JSON"),
		propertyId: requireEnv("GA4_PROPERTY_ID"),
		spreadsheetId,
		plan,
		recordedAt: formatSeoulMinute(now),
	};

	if (plan.mode === "backfill") {
		await runBackfill(context);

		return;
	}

	await runRegular(context);
};

await main();
