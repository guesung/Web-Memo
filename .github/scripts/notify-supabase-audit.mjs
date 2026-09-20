#!/usr/bin/env node
/** 정기 Supabase 감사 결과에서 이상 항목만 Slack으로 전송합니다. */
import { readFileSync } from "node:fs";

import { postToSlack } from "./lib/slack-blocks.mjs";

const resultPath = process.env.SUPABASE_AUDIT_RESULT_PATH;
const webhookUrl = process.env.SLACK_WEBHOOK_URL;
const runUrl = process.env.RUN_URL;

if (!webhookUrl) {
	console.warn("::warning::SLACK_WEBHOOK_URL이 없어 Supabase 감사 알림을 건너뜁니다");
	process.exit(0);
}

let message = `Supabase 운영 감사 실행 실패${runUrl ? `\n${runUrl}` : ""}`;

if (resultPath) {
	try {
		const result = JSON.parse(readFileSync(resultPath, "utf8"));

		if (result.errorCount === 0 && result.warningCount === 0) {
			console.log("Supabase 감사 결과에 알릴 이상이 없습니다");
			process.exit(0);
		}

		message = `${result.slackMessage}${runUrl ? `\n실행 로그: ${runUrl}` : ""}`;
	} catch {
		console.warn("::warning::Supabase 감사 결과를 읽지 못해 실행 실패로 알립니다");
	}
}

await postToSlack(webhookUrl, { text: message });
