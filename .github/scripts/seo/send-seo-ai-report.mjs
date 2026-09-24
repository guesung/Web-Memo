#!/usr/bin/env node
/**
 * AI가 쓴 SEO 리포트를 검증해 Slack 본문 + 스레드로 보내고 아티팩트에 보관합니다.
 * .github/workflows/seo-monitor.yml 이 claude-code-action 다음 단계로 호출합니다.
 *
 * 모델 출력(AI_REPORT_RESULT)은 여기서 검증한 뒤에만 나갑니다. 모델에게는 쓰기 권한이 없습니다.
 * 이 단계가 리포트를 보내지 못하면 step output sent=false 와 failure_reason 을 남깁니다. 워크플로는
 * 기존 기계 판정 알림(notify-seo-slack.mjs, 오류·신규 경고가 있을 때만 나감)을 대신 보내고 CI 채널에
 * 실패를 알립니다.
 *
 * 로컬 실행 (Slack 값 없이 돌리면 보낼 내용을 stdout에 찍고 아무것도 보내지 않습니다):
 *   AI_REPORT_RESULT="$(cat result.json)" node .github/scripts/seo/send-seo-ai-report.mjs
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
} from "./seo-ai-report.mjs";
import { postSlackMessage, toSingleLine } from "../shared/slack-api.mjs";

const warn = (message) => console.warn(`::warning::${toSingleLine(message)}`);

/**
 * 워크플로가 대체 알림과 CI 실패 알림을 가르는 데 쓰는 값입니다.
 * @description 실패 이유에는 네트워크 오류 문구가 섞일 수 있어, 개행으로 output 형식이 깨지지 않게 안전한 문자만 남깁니다.
 */
const writeOutputs = async ({ sent, threadFailures, failureReason }, outputPath) => {
	if (outputPath) {
		const safeReason = String(failureReason).replace(/[^a-z0-9_]+/gi, "_").slice(0, 60);
		await appendFile(
			outputPath,
			`sent=${sent}\nthread_failures=${threadFailures}\nfailure_reason=${safeReason}\n`,
		);
	}
};

const createRunUrl = (env) =>
	env.GITHUB_REPOSITORY && env.GITHUB_RUN_ID
		? `${env.GITHUB_SERVER_URL ?? "https://github.com"}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}`
		: "";

/**
 * 본문을 보내고 그 ts로 스레드 댓글을 답니다.
 * @description 본문이 실패하면 보내지 않은 것으로 봅니다. 본문이 나간 뒤의 댓글 실패는 대체 알림을 부르면 중복이 되므로 실패 수만 돌려줍니다.
 */
export const postSeoAiReport = async ({ rootPayload, threadPayloads, token, channel, post = postSlackMessage }) => {
	const root = await post({ token, channel, payload: rootPayload });
	if (!root.ok) {
		warn(`SEO AI 리포트 본문 전송에 실패했습니다(${root.error})`);

		return { sent: false, threadFailures: 0, error: root.error };
	}
	let threadFailures = 0;
	for (const payload of threadPayloads) {
		const reply = await post({ token, channel, payload, threadTs: root.ts });
		if (!reply.ok) {
			threadFailures += 1;
			warn(`SEO AI 리포트 스레드 댓글 전송에 실패했습니다(${reply.error})`);
		}
	}

	return { sent: true, threadFailures, error: null };
};

/**
 * AI 리포트를 검증·보관·발송하고 발송 여부를 돌려줍니다.
 * @description 어떤 경로로 끝나든 finally에서 output을 남깁니다. 본문을 보낸 뒤 예외가 나 sent가 비면 대체 알림이 한 번 더 나가기 때문입니다.
 */
export const sendSeoAiReport = async ({ env = process.env, post, fileExists = existsSync } = {}) => {
	const result = { sent: false, threadFailures: 0, failureReason: "none" };
	try {
		if (!env.AI_REPORT_RESULT) {
			warn("AI 리포트 결과가 없어 기존 SEO 알림으로 대신합니다");
			result.failureReason = "missing_result";

			return false;
		}
		let report;
		let context;
		try {
			context = JSON.parse(await readFile("artifacts/seo/ai-context.json", "utf8"));
			report = normalizeSeoAiReport({ raw: env.AI_REPORT_RESULT, context, fileExists });
		} catch (error) {
			warn(`AI 리포트를 해석하지 못해 기존 SEO 알림으로 대신합니다: ${error instanceof Error ? error.message : error}`);
			result.failureReason = "invalid_result";

			return false;
		}
		const rootPayload = buildSeoAiRootPayload({ report, context, runUrl: createRunUrl(env) });
		const threadPayloads = buildSeoAiThreadPayloads({ report });
		await writeFile("artifacts/seo/ai-report.md", createSeoAiMarkdown({ report, context }));

		if (!env.SLACK_BOT_TOKEN || !env.SLACK_CHANNEL_ID) {
			warn("SLACK_BOT_TOKEN 또는 SLACK_CHANNEL_ID 가 없어 AI 리포트를 보내지 않고 내용만 출력합니다");
			console.log(JSON.stringify({ rootPayload, threadPayloads }, null, 2));
			result.failureReason = "missing_slack_config";
		} else {
			const delivery = await postSeoAiReport({
				rootPayload,
				threadPayloads,
				token: env.SLACK_BOT_TOKEN,
				channel: env.SLACK_CHANNEL_ID,
				post,
			});
			result.sent = delivery.sent;
			result.threadFailures = delivery.threadFailures;
			if (!delivery.sent) {
				result.failureReason = `slack_${delivery.error}`;
			} else if (delivery.threadFailures > 0) {
				result.failureReason = "thread_failed";
			}
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
					delivered: result.sent,
					report,
				},
				null,
				2,
			)}\n`,
		);
		console.log(
			`SEO AI 리포트: ${report.status} · 발견 ${report.findings.length}건 · 근거 없어 제외 ${report.droppedFindingCount}건 · 발송 ${result.sent ? "완료" : "안 함"}`,
		);

		return result.sent;
	} finally {
		await writeOutputs(result, env.GITHUB_OUTPUT);
	}
};

if (
	process.argv[1] &&
	pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
	await sendSeoAiReport();
}
