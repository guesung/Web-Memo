#!/usr/bin/env node
/**
 * AI 가 쓴 GA 인사이트를 검증해 리포트 메시지의 스레드 댓글로 답니다.
 * report-ga-daily.yml·report-ga-weekly.yml 이 claude-code-action 다음 단계로 호출합니다.
 *
 * 이 단계는 잡을 실패시키지 않습니다. 여기까지 왔다면 리포트 본문은 이미 채널에 나갔고,
 * 인사이트는 그 위에 얹는 해석입니다. 구독 한도 소진·모델 출력 오류·댓글 전송 실패는
 * 모두 ::warning:: 으로 남기고 정상 종료합니다. 결과는 step output(sent·failure_reason)에도 남습니다.
 *
 * 로컬 실행 (SLACK_BOT_TOKEN 없이 돌리면 보낼 페이로드를 stdout에 찍고 아무것도 보내지 않습니다):
 *   GA_INSIGHT_CONTEXT_PATH=artifacts/ga/insight-context.json \
 *   AI_INSIGHT_RESULT="$(cat result.json)" node .github/scripts/ga/send-ga-insight.mjs
 */

import { appendFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
	buildGaInsightPayload,
	normalizeGaInsight,
} from "./ga-insight-report.mjs";
import { postSlackMessage, toSingleLine } from "../shared/slack-api.mjs";

const warn = (message) => console.warn(`::warning::${toSingleLine(message)}`);

/** 실패 이유에는 오류 문구가 섞일 수 있어, output 형식이 깨지지 않게 안전한 문자만 남깁니다. */
const writeOutputs = async ({ sent, failureReason }, outputPath) => {
	if (!outputPath) {
		return;
	}

	const safeReason = String(failureReason)
		.replace(/[^a-z0-9_]+/gi, "_")
		.slice(0, 60);

	await appendFile(
		outputPath,
		`sent=${sent}\nfailure_reason=${safeReason}\n`,
	);
};

/**
 * 인사이트를 검증·발송하고 발송 여부를 돌려줍니다. 던지지 않습니다.
 *
 * @param {object} [params]
 * @param {NodeJS.ProcessEnv} [params.env]
 * @param {typeof postSlackMessage} [params.post]
 * @param {(path: string) => Promise<string>} [params.readContext]
 * @returns {Promise<{ sent: boolean, failureReason: string }>}
 */
export const sendGaInsight = async ({
	env = process.env,
	post = postSlackMessage,
	readContext = (path) => readFile(path, "utf8"),
} = {}) => {
	const result = { sent: false, failureReason: "none" };

	try {
		if (!env.AI_INSIGHT_RESULT) {
			warn(
				"AI 인사이트 결과가 없어 스레드 댓글을 건너뜁니다(Claude 단계 실패 또는 한도 소진)",
			);
			result.failureReason = "missing_result";

			return result;
		}

		let context;
		let insight;

		try {
			context = JSON.parse(await readContext(env.GA_INSIGHT_CONTEXT_PATH));
			insight = normalizeGaInsight({
				raw: env.AI_INSIGHT_RESULT,
				kind: context.kind,
			});
		} catch (error) {
			warn(
				`AI 인사이트를 해석하지 못해 스레드 댓글을 건너뜁니다: ${error instanceof Error ? error.message : error}`,
			);
			result.failureReason = "invalid_result";

			return result;
		}

		const payload = buildGaInsightPayload({
			insight,
			context,
			runUrl: context.runUrl ?? null,
		});

		if (!env.SLACK_BOT_TOKEN) {
			warn("SLACK_BOT_TOKEN 이 없어 AI 인사이트를 보내지 않고 내용만 출력합니다");
			console.log(JSON.stringify(payload, null, 2));
			result.failureReason = "missing_slack_config";

			return result;
		}

		const reply = await post({
			token: env.SLACK_BOT_TOKEN,
			channel: context.slack.channel,
			payload,
			threadTs: context.slack.ts,
		});

		if (!reply.ok) {
			warn(`AI 인사이트 스레드 댓글 전송에 실패했습니다(${reply.error})`);
			result.failureReason = `slack_${reply.error}`;

			return result;
		}

		result.sent = true;
		console.log(`AI 인사이트 댓글 전송 완료 (${context.kind})`);

		return result;
	} catch (error) {
		warn(
			`AI 인사이트 전송 중 오류가 나 건너뜁니다: ${error instanceof Error ? error.message : error}`,
		);
		result.failureReason = "unexpected_error";

		return result;
	} finally {
		await writeOutputs(result, env.GITHUB_OUTPUT);
	}
};

if (
	process.argv[1] &&
	pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
	await sendGaInsight();
}
