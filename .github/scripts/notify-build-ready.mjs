#!/usr/bin/env node
/**
 * master 빌드 결과를 스토어 현황과 함께 Slack으로 알리고, 배포 버튼을 답니다.
 * .github/workflows/ci.yml 의 notify 잡에서 호출합니다.
 *
 * 모든 타깃이 끝난 뒤 나가는 요약이며, 머지 스레드의 마지막 댓글입니다(SLACK_THREAD_TS 가 그 루트).
 * 스레드로 못 보내는 사정(루트 ts 없음, 봇 토큰·채널 없음, 전송 실패)이면 웹훅 최상위
 * 메시지로 내려가 배포 버튼 경로가 살아 있습니다. 전송이 실패해도 ::warning::만 남기고
 * exit 0입니다. 알림이 빌드 잡의 결론을 바꾸면 안 됩니다.
 *
 * 로컬에서 그대로 돌려볼 수 있습니다(실제 스토어를 조회하고 실제 Slack으로 보냅니다):
 * 웹훅과 봇 토큰 없이 돌리면 스토어만 조회하고 보낼 페이로드를 stdout에 찍습니다.
 *
 *   GITHUB_REPOSITORY=guesung/Web-Memo GITHUB_RUN_ID=<run id> \
 *   GITHUB_SHA=$(git rev-parse HEAD) \
 *   BUILD_RESULTS='{"ci":"success","app":"success","web":"skipped","extension":"success"}' \
 *   node .github/scripts/notify-build-ready.mjs
 */

import { readCommitSubject, requireEnv } from "./lib/run-context.mjs";
import {
	deliverSlackMessage,
	postSlackMessage,
	readSlackEnv,
	toSingleLine,
} from "./lib/slack-api.mjs";
import { buildActionBlock, buildVersionSection } from "./lib/slack-blocks.mjs";
import { fetchStoreVersions } from "./lib/store-versions.mjs";
import {
	DEPLOY_TARGETS,
	buildNoTargetPayload,
	isNoTargetChange,
} from "./lib/thread-messages.mjs";

/**
 * 배포 대상이 없는 머지에서 스레드를 한 줄로 닫습니다.
 *
 * 채널에 새 메시지를 만들지는 않습니다. 다만 머지 스레드의 루트는 푸시 직후 이미 만들어져
 * 있어서, 아래에 아무것도 없으면 루트만 덩그러니 남습니다. 스레드가 있고 정말로 변경이 없을 때만
 * "변경 없음"을 답니다. 스레드가 없으면(루트 생성 실패, 시크릿 미설정) 예전처럼 조용히 넘어가며,
 * 웹훅 최상위로 내려보내지 않습니다. ci 실패나 취소가 섞였으면 그렇게 말할 근거가 없어 건너뜁니다.
 */
const closeThreadWithoutTargets = async ({ buildResults, runUrl }) => {
	const { botToken, channelId, threadTs } = readSlackEnv();

	if (!isNoTargetChange(buildResults) || !threadTs) {
		return;
	}

	if (!botToken || !channelId) {
		console.warn(
			"::warning::SLACK_BOT_TOKEN 또는 SLACK_CHANNEL_ID 가 없어 변경 없음 댓글을 보내지 않습니다",
		);

		return;
	}

	const result = await postSlackMessage({
		token: botToken,
		channel: channelId,
		payload: buildNoTargetPayload({ runUrl }),
		threadTs,
	});

	if (!result.ok) {
		console.warn(
			`::warning::변경 없음 댓글 전송에 실패했습니다: ${toSingleLine(result.error)}`,
		);
	}
};

const main = async () => {
	const repository = requireEnv("GITHUB_REPOSITORY");
	const runId = requireEnv("GITHUB_RUN_ID");
	const commitSha = requireEnv("GITHUB_SHA");
	const serverUrl = process.env.GITHUB_SERVER_URL ?? "https://github.com";
	const buildResults = JSON.parse(process.env.BUILD_RESULTS ?? "{}");
	const runUrl = `${serverUrl}/${repository}/actions/runs/${runId}`;

	// 안 도는 잡(skipped)은 실패가 아닙니다. 변경이 없어서 안 돈 것뿐입니다.
	const hasFailure = Object.values(buildResults).some((result) =>
		["failure", "timed_out"].includes(result),
	);
	const succeededTargets = DEPLOY_TARGETS.filter(
		(target) => buildResults[target] === "success",
	);

	// 문서만 고친 커밋까지 알리면 채널이 금세 무의미해집니다.
	// 올릴 것도 없고 깨진 것도 없으면 새 메시지 없이 넘어갑니다. (배포 현황은 /버전으로 언제든 조회)
	// 이미 만들어진 머지 스레드는 한 줄로만 닫습니다.
	if (!hasFailure && succeededTargets.length === 0) {
		console.log("빌드된 배포 대상이 없어 Slack 알림을 건너뜁니다");
		await closeThreadWithoutTargets({ buildResults, runUrl });

		return;
	}

	const shortSha = commitSha.slice(0, 7);
	const commitSubject = readCommitSubject(commitSha);
	const commitUrl = `${serverUrl}/${repository}/commit/${commitSha}`;
	// 해시는 어느 커밋인지 되짚을 때만 필요합니다. 채널에서 읽히는 건 커밋 제목이라
	// 제목 줄은 제목에 내주고, 해시는 아래 context에 링크로 답니다.
	const headline = hasFailure ? "❌ master 빌드 실패" : "✅ master 빌드 성공";

	const storeVersions = await fetchStoreVersions();

	const blocks = [
		{
			type: "section",
			text: {
				type: "mrkdwn",
				text: commitSubject
					? `*${headline}*\n${commitSubject}`
					: `*${headline}*`,
			},
		},
		{
			type: "context",
			elements: [{ type: "mrkdwn", text: `<${commitUrl}|\`${shortSha}\`>` }],
		},
		{ type: "divider" },
		buildVersionSection({ storeVersions, commitSha }),
	];

	if (hasFailure) {
		blocks.push({
			type: "context",
			elements: [
				{
					type: "mrkdwn",
					text: "빌드가 실패한 타깃은 배포 버튼이 나오지 않습니다. 워크플로 로그를 확인하세요.",
				},
			],
		});
	}

	blocks.push(
		buildActionBlock({
			targets: succeededTargets,
			ref: commitSha,
			refSubject: commitSubject,
			linkUrl: runUrl,
			linkLabel: "워크플로 보기",
		}),
	);

	// 푸시 알림 미리보기로 쓰이는 줄입니다. 여기에도 해시가 아니라 제목이 보여야
	// 채널을 열지 않고도 무엇이 올라갔는지 알 수 있습니다.
	const payload = {
		text: [headline, commitSubject].filter(Boolean).join(" — "),
		blocks,
	};

	// 보낼 수단이 없으면(로컬 확인, 시크릿 미설정) 보낼 페이로드만 찍고 끝냅니다.
	await deliverSlackMessage({ payload, slack: readSlackEnv() });
};

try {
	await main();
} catch (error) {
	console.warn(
		`::warning::빌드 요약 알림을 보내지 못했습니다: ${toSingleLine(error instanceof Error ? error.message : error)}`,
	);
}
