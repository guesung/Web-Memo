#!/usr/bin/env node
/**
 * 어제 하루의 GA4 지표를 집계해 Slack에 게시합니다.
 * .github/workflows/daily-ga-report.yml 이 매일 아침(서울 07:00) 호출합니다.
 *
 * 이 리포트의 목적은 사용량 보고가 아니라 로깅 감시입니다. 로깅은 틀려도 화면이
 * 깨지지 않아 아무도 모르게 죽습니다. 7일 평균과 매일 대조하는 것이 유일한 알람입니다.
 *
 * 로컬 실행 (SLACK_REPORT_WEBHOOK_URL 없이 돌리면 보낼 페이로드를 stdout에 찍습니다):
 *   GA4_PROPERTY_ID=471860782 \
 *   GA4_SERVICE_ACCOUNT_JSON="$(cat ~/ga4-service-account.json)" \
 *   node .github/scripts/ga/report-daily-ga.mjs
 */

import { buildDailyReportPayload } from "./daily-report-blocks.mjs";
import { fetchDailyGa4Report } from "./ga4-data.mjs";
import { requireEnv } from "../shared/run-context.mjs";
import { postToSlack } from "../shared/slack-blocks.mjs";

const main = async () => {
	const serviceAccountJson = requireEnv("GA4_SERVICE_ACCOUNT_JSON");
	const propertyId = requireEnv("GA4_PROPERTY_ID");
	const repository = process.env.GITHUB_REPOSITORY;
	const runId = process.env.GITHUB_RUN_ID;
	const serverUrl = process.env.GITHUB_SERVER_URL ?? "https://github.com";

	const report = await fetchDailyGa4Report({ serviceAccountJson, propertyId });
	const payload = buildDailyReportPayload({
		report,
		// 로컬 실행에는 런이 없습니다. 링크 없이 나머지만 싣습니다.
		runUrl:
			repository && runId
				? `${serverUrl}/${repository}/actions/runs/${runId}`
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

await main();
