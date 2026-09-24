#!/usr/bin/env node
/**
 * master 머지 스레드에 타깃 하나(웹, 확장, 앱)의 빌드 결과를 댓글로 답니다.
 * .github/workflows/ci.yml 의 notify-web, notify-extension, notify-app 잡이 호출합니다.
 *
 * 타깃별 잡이 자기 cd-* 잡만 기다리므로, 웹·확장은 앱 빌드(약 30분)와 무관하게
 * 각자 끝나는 대로 알립니다. 모든 타깃이 끝난 뒤의 요약은 notify-build-ready.mjs가 맡습니다.
 *
 * 빌드가 성공한 댓글에는 그 타깃의 배포 버튼, 다른 버전 버튼, 워크플로 링크가 붙습니다.
 * 다른 버전 버튼은 그 타깃으로 고정된 모달을 엽니다. 확장 댓글에는 이 빌드의 결과물을 바로 받는
 * 다운로드 버튼도 붙습니다(GH_TOKEN 필요, 조회에 실패하면 이 버튼만 빠집니다).
 * 앱 빌드를 기다리지 않고 웹·확장을 바로 배포할 수 있게 하기 위해서입니다. 실패한 댓글에는
 * 빌드도 안 된 커밋을 올리는 길을 열어두지 않으려고 로그 링크만 답니다.
 * 버튼은 SLACK_BOT_TOKEN으로 보낸 메시지에서 동작하며 클릭은 apps/web의
 * /api/slack/interactivity 가 받습니다.
 *
 * 댓글은 스레드가 있어야 의미가 있습니다. SLACK_THREAD_TS 가 비면(루트 생성 실패, 시크릿 미설정)
 * 경고만 남기고 아무것도 보내지 않습니다. 웹훅으로 최상위에 내려보내면 스레드 없는 낱개
 * 메시지가 채널을 어지럽히기 때문입니다. 요약은 그때도 웹훅으로 나가 배포 버튼이 살아 있습니다.
 *
 * 전송이 실패해도 ::warning::만 남기고 exit 0입니다. 알림이 빌드 잡의 결론을 바꾸면 안 됩니다.
 *
 * 로컬에서 그대로 돌려볼 수 있습니다. 봇 토큰·채널 없이 돌리면 페이로드를 stdout에 찍습니다.
 *
 *   GITHUB_REPOSITORY=guesung/Web-Memo GITHUB_RUN_ID=<run id> \
 *   TARGET=web CHANGED=true RESULT=success SLACK_THREAD_TS=1.1 \
 *   node .github/scripts/deploy/notify-thread-reply.mjs
 */

import { readCommitSubject, requireEnv } from "../shared/run-context.mjs";
import {
	postSlackMessage,
	readSlackEnv,
	toSingleLine,
} from "../shared/slack-api.mjs";
import {
	buildArtifactDownloadUrl,
	fetchRunArtifacts,
	pickExtensionArtifact,
} from "./run-artifacts.mjs";
import { buildActionBlock } from "../shared/slack-blocks.mjs";
import {
	buildTargetReplyPayload,
	decideTargetReply,
} from "./thread-messages.mjs";

/**
 * 확장 빌드 결과물을 내려받는 링크를 찾습니다.
 *
 * 알림의 본 목적은 빌드 결과를 알리는 것이라 여기서 실패해도 던지지 않습니다. 토큰이 없거나 조회가 실패하거나
 * 아티팩트가 없으면(보관 기간 만료 등) 경고만 남기고 버튼 없이 보냅니다.
 */
const resolveExtensionDownloadUrl = async ({ repository, runId, serverUrl }) => {
	const token = process.env.GH_TOKEN;

	if (!token) {
		console.warn("::warning::GH_TOKEN 이 없어 확장 다운로드 버튼을 달지 않습니다");

		return undefined;
	}

	try {
		const artifact = pickExtensionArtifact(
			await fetchRunArtifacts({ repository, runId, token }),
		);

		if (!artifact) {
			console.warn("::warning::확장 아티팩트를 찾지 못해 다운로드 버튼을 달지 않습니다");

			return undefined;
		}

		return buildArtifactDownloadUrl({
			serverUrl,
			repository,
			runId,
			artifactId: artifact.id,
		});
	} catch (error) {
		console.warn(
			`::warning::확장 다운로드 링크를 만들지 못했습니다: ${toSingleLine(error instanceof Error ? error.message : error)}`,
		);

		return undefined;
	}
};

const main = async () => {
	const target = requireEnv("TARGET");
	const outcome = decideTargetReply({
		changed: process.env.CHANGED ?? "",
		result: process.env.RESULT ?? "",
	});

	if (!outcome) {
		console.log(
			`${target} 댓글을 건너뜁니다 (changed=${process.env.CHANGED}, result=${process.env.RESULT})`,
		);

		return;
	}

	const { botToken, channelId, threadTs } = readSlackEnv();

	if (!threadTs) {
		console.warn(
			`::warning::스레드 루트 ts 가 비어 있어 ${target} 댓글을 보내지 않습니다`,
		);

		return;
	}

	const repository = requireEnv("GITHUB_REPOSITORY");
	const runId = requireEnv("GITHUB_RUN_ID");
	const serverUrl = process.env.GITHUB_SERVER_URL ?? "https://github.com";

	const runUrl = `${serverUrl}/${repository}/actions/runs/${runId}`;
	const commitSha = process.env.GITHUB_SHA ?? "";

	const downloadUrl =
		outcome === "success" && target === "extension"
			? await resolveExtensionDownloadUrl({ repository, runId, serverUrl })
			: undefined;

	// 커밋을 모르면 무엇을 배포하는 버튼인지 정할 수 없으므로 버튼 없이 로그 링크만 보냅니다.
	const actionBlock =
		outcome === "success" && commitSha
			? buildActionBlock({
					targets: [target],
					ref: commitSha,
					refSubject: readCommitSubject(commitSha),
					customTarget: target,
					downloadUrl,
					linkUrl: runUrl,
					linkLabel: "워크플로 보기",
				})
			: undefined;

	const payload = buildTargetReplyPayload({
		target,
		outcome,
		runUrl,
		actionBlock,
	});

	if (!botToken || !channelId) {
		console.warn(
			"::warning::SLACK_BOT_TOKEN 또는 SLACK_CHANNEL_ID 가 없어 스레드 댓글을 보내지 않습니다",
		);
		console.log(JSON.stringify(payload, null, 2));

		return;
	}

	const result = await postSlackMessage({
		token: botToken,
		channel: channelId,
		payload,
		threadTs,
	});

	if (!result.ok) {
		console.warn(
			`::warning::${target} 스레드 댓글 전송에 실패했습니다: ${toSingleLine(result.error)}`,
		);
	}
};

try {
	await main();
} catch (error) {
	console.warn(
		`::warning::스레드 댓글을 보내지 못했습니다: ${toSingleLine(error instanceof Error ? error.message : error)}`,
	);
}
