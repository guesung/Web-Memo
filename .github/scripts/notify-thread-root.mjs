#!/usr/bin/env node
/**
 * master, develop 머지마다 Slack 스레드의 루트 메시지를 만들고 그 ts를 잡 output으로 냅니다.
 * .github/workflows/ci.yml 의 slack-thread 잡에서 호출합니다.
 *
 * 이후 타깃별 댓글(notify-thread-reply.mjs), master 요약(notify-build-ready.mjs),
 * develop 테섭 결과(notify-staging-deploy.mjs)가 이 ts를 thread_ts로 받아 댓글을 답니다.
 *
 * 루트는 chat.postMessage로만 만들 수 있습니다(Incoming Webhook은 ts를 돌려주지 않습니다).
 * 봇 토큰·채널이 없거나 전송이 실패하면 thread_ts를 빈 값으로 기록하고 경고만 남깁니다.
 * 알림이 빌드·배포 잡의 결론을 바꾸면 안 되므로 어떤 경우에도 exit 0입니다.
 * 빈 ts를 받은 쪽은 스레드 대신 웹훅 최상위 메시지로 내려갑니다.
 *
 * 로컬에서 그대로 돌려볼 수 있습니다.
 * 봇 토큰·채널 없이 돌리면 보낼 페이로드를 stdout에 찍습니다.
 *
 *   GITHUB_REPOSITORY=guesung/Web-Memo GITHUB_SHA=$(git rev-parse HEAD) \
 *   GITHUB_REF_NAME=master GITHUB_ACTOR=guesung \
 *   node .github/scripts/notify-thread-root.mjs
 */

import { appendFileSync } from "node:fs";

import { readCommitSubject, readMergeSource, requireEnv } from "./lib/run-context.mjs";
import { postSlackMessage, readSlackEnv, toSingleLine } from "./lib/slack-api.mjs";
import { buildRootPayload } from "./lib/thread-messages.mjs";

/**
 * 잡 output에 thread_ts를 기록합니다. 로컬 실행(GITHUB_OUTPUT 없음)에서는 건너뜁니다.
 * 빈 값도 기록합니다 — 뒤 잡이 "없음"을 output 부재가 아닌 빈 문자열로 받게 하기 위해서입니다.
 */
const writeThreadTs = (threadTs) => {
	if (!process.env.GITHUB_OUTPUT) {
		return;
	}

	appendFileSync(process.env.GITHUB_OUTPUT, `thread_ts=${threadTs}\n`);
};

const main = async () => {
	const repository = requireEnv("GITHUB_REPOSITORY");
	const commitSha = requireEnv("GITHUB_SHA");
	const targetBranch = requireEnv("GITHUB_REF_NAME");
	const serverUrl = process.env.GITHUB_SERVER_URL ?? "https://github.com";

	const payload = buildRootPayload({
		targetBranch,
		subject: readCommitSubject(commitSha),
		mergeSource: readMergeSource(commitSha),
		actor: process.env.GITHUB_ACTOR ?? "",
		commitSha,
		repositoryUrl: `${serverUrl}/${repository}`,
	});

	const { botToken, channelId } = readSlackEnv();

	if (!botToken || !channelId) {
		console.warn(
			"::warning::SLACK_BOT_TOKEN 또는 SLACK_CHANNEL_ID 가 없어 스레드 루트를 만들지 않습니다",
		);
		console.log(JSON.stringify(payload, null, 2));
		writeThreadTs("");

		return;
	}

	const result = await postSlackMessage({
		token: botToken,
		channel: channelId,
		payload,
	});

	if (!result.ok) {
		console.warn(
			`::warning::Slack 스레드 루트 전송에 실패했습니다: ${toSingleLine(result.error)}`,
		);
		writeThreadTs("");

		return;
	}

	writeThreadTs(result.ts);
};

try {
	await main();
} catch (error) {
	console.warn(
		`::warning::Slack 스레드 루트를 만들지 못했습니다: ${toSingleLine(error instanceof Error ? error.message : error)}`,
	);

	// output 기록마저 실패해도 exit 0을 지킵니다. 빈 output은 뒤 잡이 폴백으로 처리합니다.
	try {
		writeThreadTs("");
	} catch (writeError) {
		console.warn(
			`::warning::thread_ts output 기록에 실패했습니다: ${toSingleLine(writeError instanceof Error ? writeError.message : writeError)}`,
		);
	}
}
