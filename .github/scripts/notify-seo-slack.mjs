#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
	buildSeoFailureSlackPayload,
	buildSeoSlackPayload,
} from "./lib/seo-slack.mjs";
import { postToSlack } from "./lib/slack-blocks.mjs";

/** GitHub Actions 실행 페이지 주소를 표준 환경변수로 조립합니다. */
export const createActionsRunUrl = (env = process.env) => {
	if (!env.GITHUB_REPOSITORY || !env.GITHUB_RUN_ID) {
		return "";
	}
	const serverUrl = env.GITHUB_SERVER_URL ?? "https://github.com";

	return `${serverUrl}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}`;
};

/** SEO 보고서를 읽어 오류 또는 신규 경고가 있을 때만 Slack으로 전송합니다. */
export const notifySeoSlack = async ({
	reportPath = "artifacts/seo/seo-report.json",
	seoCheckOutcome = process.env.SEO_CHECK_OUTCOME,
	webhookUrl = process.env.SLACK_REPORT_WEBHOOK_URL,
	runUrl = createActionsRunUrl(),
	readReport = readFile,
	postMessage = postToSlack,
} = {}) => {
	let payload;
	try {
		const report = JSON.parse(await readReport(reportPath, "utf8"));
		payload = buildSeoSlackPayload({ report, runUrl });
	} catch (error) {
		if (seoCheckOutcome !== "failure") {
			console.warn(
				`::warning::SEO 보고서를 읽지 못해 Slack 판정을 건너뜁니다: ${error instanceof Error ? error.message : error}`,
			);

			return { status: "skipped", reason: "report_unavailable" };
		}
		payload = buildSeoFailureSlackPayload({ runUrl });
	}
	if (!payload) {
		console.log("SEO 오류와 신규 경고가 없어 Slack 알림을 보내지 않습니다.");

		return { status: "skipped", reason: "no_actionable_issues" };
	}
	if (!webhookUrl) {
		console.warn(
			"::warning::SLACK_REPORT_WEBHOOK_URL이 없어 SEO Slack 알림을 건너뜁니다",
		);
		console.log(JSON.stringify(payload, null, 2));

		return { status: "skipped", reason: "missing_webhook" };
	}
	try {
		await postMessage(webhookUrl, payload);

		return { status: "sent" };
	} catch (error) {
		console.warn(
			`::warning::SEO Slack 알림 전송에 실패했습니다: ${error instanceof Error ? error.message : error}`,
		);

		return { status: "failed" };
	}
};

if (
	process.argv[1] &&
	pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
	await notifySeoSlack();
}
