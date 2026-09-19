#!/usr/bin/env node
/**
 * 지난주 한 주의 GA4 사용 현황을 집계해 Slack에 게시합니다.
 * .github/workflows/weekly-ga-report.yml 이 매주 월요일 아침(서울 08:00) 호출합니다.
 *
 * 데일리 리포트와 목적이 다릅니다. 그쪽은 "로깅이 살아 있는가"를 감시하고,
 * 이쪽은 "사람들이 무엇을 쓰고 있고 다음에 무엇을 만들어야 하는가"에 답합니다.
 * 두 질문을 한 메시지에 섞지 않으려고 리포트를 따로 뺐습니다.
 *
 * 로컬 실행 (SLACK_REPORT_WEBHOOK_URL 없이 돌리면 보낼 페이로드를 stdout에 찍습니다):
 *   GA4_PROPERTY_ID=471860782 \
 *   GA4_SERVICE_ACCOUNT_JSON="$(cat ~/ga4-service-account.json)" \
 *   node .github/scripts/report-weekly-ga.mjs
 */

import { fetchWeeklyGa4Report } from "./lib/ga4-weekly.mjs";
import { requireEnv } from "./lib/run-context.mjs";
import { postToSlack } from "./lib/slack-blocks.mjs";
import { buildWeeklyReportPayload } from "./lib/weekly-report-blocks.mjs";

const main = async () => {
	const serviceAccountJson = requireEnv("GA4_SERVICE_ACCOUNT_JSON");
	const propertyId = requireEnv("GA4_PROPERTY_ID");
	const repository = process.env.GITHUB_REPOSITORY;
	const runId = process.env.GITHUB_RUN_ID;
	const serverUrl = process.env.GITHUB_SERVER_URL ?? "https://github.com";

	const report = await fetchWeeklyGa4Report({ serviceAccountJson, propertyId });
	const payload = buildWeeklyReportPayload({
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
