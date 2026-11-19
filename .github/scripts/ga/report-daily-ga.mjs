#!/usr/bin/env node
/**
 * 어제 하루의 GA4 지표를 집계해 Slack에 게시합니다.
 * .github/workflows/report-ga-daily.yml 이 매일 아침(서울 06:23) 호출합니다.
 *
 * 이 리포트의 목적은 사용량 보고가 아니라 로깅 감시입니다. 로깅은 틀려도 화면이
 * 깨지지 않아 아무도 모르게 죽습니다. 7일 평균과 매일 대조하는 것이 유일한 알람입니다.
 *
 * Slack 에는 봇(SLACK_BOT_TOKEN + GA_REPORT_CHANNEL_ID)으로 먼저 올리고, 실패하면 웹훅
 * (SLACK_REPORT_WEBHOOK_URL)으로 내려갑니다. 봇으로 올라갔고 GA_INSIGHT_CONTEXT_PATH 가
 * 있으면 조회한 수치와 메시지 ts 를 그 경로에 JSON 으로 남깁니다. 워크플로의 AI 인사이트
 * 단계가 이 파일을 읽고 같은 스레드에 댓글을 답니다.
 *
 * 로컬 실행 (Slack 값 없이 돌리면 보낼 페이로드를 stdout에 찍습니다):
 *   GA4_PROPERTY_ID=471860782 \
 *   GA4_SERVICE_ACCOUNT_JSON="$(cat ~/ga4-service-account.json)" \
 *   GSC_SERVICE_ACCOUNT_JSON="$(cat ~/gsc-service-account.json)" \
 *   node .github/scripts/ga/report-daily-ga.mjs
 *
 * GSC_SERVICE_ACCOUNT_JSON 은 선택입니다. 없으면 검색어 줄이 '연동 안 됨'으로 나갑니다.
 */

import { buildDailyReportPayload } from "./daily-report-blocks.mjs";
import { resolveDailyRange, snapshotDailyMetrics } from "./ga-daily-snapshot.mjs";
import { fetchDailyGa4Report } from "./ga4-data.mjs";
import { fetchTopSearchQueries } from "./gsc-daily.mjs";
import {
	buildDailyInsightContext,
	writeInsightContext,
	writeInsightOutputs,
} from "./insight-context.mjs";
import { publishGaReport } from "./report-delivery.mjs";
import { requireEnv } from "../shared/run-context.mjs";

const snapshotAfterReport = async ({
	serviceAccountJson,
	propertyId,
	targetDate,
}) => {
	const serviceRoleKey = process.env.SUPABASE_REPORT_SERVICE_ROLE_KEY;

	if (!serviceRoleKey) {
		console.warn(
			"::warning::SUPABASE_REPORT_SERVICE_ROLE_KEY 가 없어 GA 일별 지표 적재를 건너뜁니다",
		);

		return;
	}

	try {
		const count = await snapshotDailyMetrics({
			serviceAccountJson,
			propertyId,
			serviceRoleKey,
			...resolveDailyRange(targetDate),
		});

		console.log(`ga_daily_metrics ${count}행 적재`);
	} catch (error) {
		console.warn(
			`::warning::GA 일별 지표 적재 실패: ${error instanceof Error ? error.message : error}`,
		);
	}
};

const main = async () => {
	const serviceAccountJson = requireEnv("GA4_SERVICE_ACCOUNT_JSON");
	const propertyId = requireEnv("GA4_PROPERTY_ID");
	const repository = process.env.GITHUB_REPOSITORY;
	const runId = process.env.GITHUB_RUN_ID;
	const serverUrl = process.env.GITHUB_SERVER_URL ?? "https://github.com";

	// 선택 env. 없어도 리포트는 가고 검색어 줄만 '연동 안 됨'으로 나갑니다.
	const [report, searchQueries] = await Promise.all([
		fetchDailyGa4Report({ serviceAccountJson, propertyId }),
		fetchTopSearchQueries({
			serviceAccountJson: process.env.GSC_SERVICE_ACCOUNT_JSON,
		}),
	]);
	// 로컬 실행에는 런이 없습니다. 링크 없이 나머지만 싣습니다.
	const runUrl =
		repository && runId
			? `${serverUrl}/${repository}/actions/runs/${runId}`
			: null;
	const payload = buildDailyReportPayload({ report, searchQueries, runUrl });
	const delivery = await publishGaReport({ payload });

	// 관리자 그래프용 일별 스냅샷. 리포트는 이미 나갔으므로 키가 없거나 적재가 실패해도 잡을
	// 실패시키지 않고 경고만 남깁니다. 다음 날 8일치를 다시 덮어써 빈 날이 메워집니다.
	await snapshotAfterReport({
		serviceAccountJson,
		propertyId,
		targetDate: report.targetDate,
	});
	const contextPath = process.env.GA_INSIGHT_CONTEXT_PATH;
	let ready = false;

	// 스레드 댓글은 봇으로 올린 메시지에만 달 수 있습니다. 웹훅으로 내려간 날은 건너뜁니다.
	if (delivery.via === "bot" && contextPath) {
		// 리포트는 이미 나갔습니다. 인사이트 입력을 못 남겼다고 잡을 실패시키지 않습니다.
		try {
			await writeInsightContext({
				path: contextPath,
				context: buildDailyInsightContext({
					report,
					searchQueries,
					slack: { channel: delivery.channel, ts: delivery.ts },
					runUrl,
				}),
			});
			ready = true;
		} catch (error) {
			console.warn(
				`::warning::AI 인사이트 입력을 남기지 못해 인사이트 댓글을 건너뜁니다: ${error instanceof Error ? error.message : error}`,
			);
		}
	}

	await writeInsightOutputs({
		ready,
		via: delivery.via,
		outputPath: process.env.GITHUB_OUTPUT,
	});
};

await main();
