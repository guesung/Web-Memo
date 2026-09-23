#!/usr/bin/env node
/**
 * PR에서 빌드한 확장을 바로 받아 설치할 수 있도록 다운로드 링크를 PR 댓글로 답니다.
 * .github/workflows/ci.yml 의 notify-pr-extension 잡이 호출합니다.
 *
 * PR마다 댓글은 하나이고, 새 커밋을 푸시하면 그 댓글을 최신 빌드로 고쳐 씁니다.
 * 빌드가 실패하면 직전 커밋의 링크가 최신처럼 남지 않도록 실패로 덮어씁니다.
 * 확장 변경이 없어 빌드가 돌지 않았거나(skipped) 취소됐으면 아무것도 하지 않습니다.
 *
 * 댓글을 달지 못해도(포크 PR의 읽기 전용 토큰, API 오류) ::warning::만 남기고 exit 0입니다.
 * 알림이 CI의 결론을 바꾸면 안 됩니다.
 *
 * 로컬에서 그대로 돌려볼 수 있습니다. GH_TOKEN 없이 돌리면 댓글 본문을 stdout에 찍습니다.
 *
 *   GITHUB_REPOSITORY=guesung/Web-Memo GITHUB_RUN_ID=<run id> \
 *   PR_NUMBER=<번호> HEAD_SHA=<sha> CHANGED=true RESULT=success \
 *   node .github/scripts/comment-pr-extension.mjs
 */

import { requireEnv } from "./lib/run-context.mjs";
import {
	buildArtifactDownloadUrl,
	fetchRunArtifacts,
	pickExtensionArtifact,
} from "./lib/run-artifacts.mjs";
import {
	buildExtensionCommentBody,
	upsertExtensionComment,
} from "./lib/pr-comments.mjs";
import { toSingleLine } from "./lib/slack-api.mjs";
import { decideTargetReply } from "./lib/thread-messages.mjs";

/**
 * 이 실행의 확장 아티팩트를 찾아 이름과 다운로드 주소를 돌려줍니다.
 * 찾지 못하면 빈 객체입니다. 댓글은 링크 없이 워크플로로 안내합니다.
 */
const resolveExtensionArtifact = async ({ repository, runId, serverUrl, token }) => {
	try {
		const artifact = pickExtensionArtifact(
			await fetchRunArtifacts({ repository, runId, token }),
		);

		if (!artifact) {
			console.warn("::warning::확장 아티팩트를 찾지 못해 링크 없이 댓글을 답니다");

			return {};
		}

		return {
			artifactName: artifact.name,
			downloadUrl: buildArtifactDownloadUrl({
				serverUrl,
				repository,
				runId,
				artifactId: artifact.id,
			}),
		};
	} catch (error) {
		console.warn(
			`::warning::확장 다운로드 링크를 만들지 못했습니다: ${toSingleLine(error instanceof Error ? error.message : error)}`,
		);

		return {};
	}
};

const main = async () => {
	const outcome = decideTargetReply({
		changed: process.env.CHANGED ?? "",
		result: process.env.RESULT ?? "",
	});

	if (!outcome) {
		console.log(
			`PR 댓글을 건너뜁니다 (changed=${process.env.CHANGED}, result=${process.env.RESULT})`,
		);

		return;
	}

	const repository = requireEnv("GITHUB_REPOSITORY");
	const runId = requireEnv("GITHUB_RUN_ID");
	const prNumber = requireEnv("PR_NUMBER");
	const commitSha = requireEnv("HEAD_SHA");
	const serverUrl = process.env.GITHUB_SERVER_URL ?? "https://github.com";
	const apiUrl = process.env.GITHUB_API_URL ?? "https://api.github.com";
	const token = process.env.GH_TOKEN;
	const runUrl = `${serverUrl}/${repository}/actions/runs/${runId}`;

	const artifact =
		outcome === "success" && token
			? await resolveExtensionArtifact({ repository, runId, serverUrl, token })
			: {};

	const body = buildExtensionCommentBody({
		outcome,
		commitSha,
		runUrl,
		...artifact,
	});

	if (!token) {
		console.warn("::warning::GH_TOKEN 이 없어 댓글을 달지 않고 본문만 출력합니다");
		console.log(body);

		return;
	}

	const action = await upsertExtensionComment({
		apiUrl,
		repository,
		prNumber,
		token,
		body,
	});

	console.log(`PR #${prNumber} 확장 빌드 댓글: ${action}`);
};

try {
	await main();
} catch (error) {
	console.warn(
		`::warning::PR 댓글을 달지 못했습니다: ${toSingleLine(error instanceof Error ? error.message : error)}`,
	);
}
