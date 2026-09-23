#!/usr/bin/env node
/**
 * AI가 쓴 SEO 리포트를 검증해 Slack 본문 + 스레드로 보내고 아티팩트에 보관합니다.
 * .github/workflows/seo-monitor.yml 이 claude-code-action 다음 단계로 호출합니다.
 *
 * 모델 출력(AI_REPORT_RESULT)은 여기서 검증한 뒤에만 나갑니다. 모델에게는 쓰기 권한이 없습니다.
 * 이 단계가 리포트를 보내지 못하면 step output sent=false 를 남기고, 워크플로는 기존 기계
 * 판정 알림(notify-seo-slack.mjs)으로 대신 알립니다. 그래서 이 스크립트는 실패로 끝나지 않습니다.
 *
 * 로컬 실행 (Slack 값 없이 돌리면 보낼 내용을 stdout에 찍고 아무것도 보내지 않습니다):
 *   AI_REPORT_RESULT="$(cat result.json)" node .github/scripts/send-seo-ai-report.mjs
 */

import { existsSync } from "node:fs";
import { appendFile, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
	buildSeoAiRootPayload,
	buildSeoAiThreadPayloads,
	countFindingsByPriority,
	createSeoAiMarkdown,
	normalizeSeoAiReport,
} from "./lib/seo-ai-report.mjs";
import { postSlackMessage, toSingleLine } from "./lib/slack-api.mjs";

const warn = (message) => console.warn(`::warning::${toSingleLine(message)}`);

const writeOutput = async (sent, outputPath = process.env.GITHUB_OUTPUT) => {
	if (outputPath) {
		await appendFile(outputPath, `sent=${sent}\n`);
	}
};

const createRunUrl = (env) =>
	env.GITHUB_REPOSITORY && env.GITHUB_RUN_ID
		? `${env.GITHUB_SERVER_URL ?? "https://github.com"}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}`
		: "";

/** 본문을 보내고 그 ts로 스레드 댓글을 답니다. 본문이 실패하면 보내지 않은 것으로 봅니다. 댓글 실패는 경고만 남깁니다. */
export const postSeoAiReport = async ({ rootPayload, threadPayloads, token, channel, post = postSlackMessage }) => {
	const root = await post({ token, channel, payload: rootPayload });
	if (!root.ok) {
		warn(`SEO AI 리포트 본문 전송에 실패했습니다(${root.error})`);

		return false;
	}
	for (const payload of threadPayloads) {
		const reply = await post({ token, channel, payload, threadTs: root.ts });
		if (!reply.ok) {
			warn(`SEO AI 리포트 스레드 댓글 전송에 실패했습니다(${reply.error})`);
		}
	}

	return true;
};

/** AI 리포트를 검증·보관·발송하고 발송 여부를 돌려줍니다. */
export const sendSeoAiReport = async ({ env = process.env, post, fileExists = existsSync } = {}) => {
	if (!env.AI_REPORT_RESULT) {
		warn("AI 리포트 결과가 없어 기존 SEO 알림으로 대신합니다");
		await writeOutput(false, env.GITHUB_OUTPUT);

		return false;
	}
	let report;
	let context;
	try {
		context = JSON.parse(await readFile("artifacts/seo/ai-context.json", "utf8"));
		report = normalizeSeoAiReport({ raw: env.AI_REPORT_RESULT, context, fileExists });
	} catch (error) {
		warn(`AI 리포트를 해석하지 못해 기존 SEO 알림으로 대신합니다: ${error instanceof Error ? error.message : error}`);
		await writeOutput(false, env.GITHUB_OUTPUT);

		return false;
	}
	const rootPayload = buildSeoAiRootPayload({ report, context, runUrl: createRunUrl(env) });
	const threadPayloads = buildSeoAiThreadPayloads({ report });
	await writeFile("artifacts/seo/ai-report.md", createSeoAiMarkdown({ report, context }));

	let sent = false;
	if (!env.SLACK_BOT_TOKEN || !env.SLACK_CHANNEL_ID) {
		warn("SLACK_BOT_TOKEN 또는 SLACK_CHANNEL_ID 가 없어 AI 리포트를 보내지 않고 내용만 출력합니다");
		console.log(JSON.stringify({ rootPayload, threadPayloads }, null, 2));
	} else {
		sent = await postSeoAiReport({
			rootPayload,
			threadPayloads,
			token: env.SLACK_BOT_TOKEN,
			channel: env.SLACK_CHANNEL_ID,
			post,
		});
	}
	await writeFile(
		"artifacts/seo/ai-report.json",
		`${JSON.stringify(
			{
				generatedAt: context.generatedAt,
				mode: report.mode,
				status: report.status,
				headline: report.headline,
				counts: countFindingsByPriority(report),
				findingCount: report.findings.length,
				droppedFindingCount: report.droppedFindingCount,
				delivered: sent,
				report,
			},
			null,
			2,
		)}\n`,
	);
	console.log(
		`SEO AI 리포트: ${report.status} · 발견 ${report.findings.length}건 · 근거 없어 제외 ${report.droppedFindingCount}건 · 발송 ${sent ? "완료" : "안 함"}`,
	);
	await writeOutput(sent, env.GITHUB_OUTPUT);

	return sent;
};

if (
	process.argv[1] &&
	pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
	await sendSeoAiReport();
}
