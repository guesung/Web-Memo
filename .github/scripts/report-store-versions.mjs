#!/usr/bin/env node
/**
 * 스토어 현황과 레포의 빌드 버전을 대조해 Slack에 게시합니다.
 * .github/workflows/versions.yml 에서 호출하며, Slack의 슬래시 커맨드가 그 워크플로를 킥합니다.
 *
 * 빌드 알림과 달리 여기서는 세 타깃의 배포 버튼을 모두 답니다.
 * 사용자가 직접 물어본 시점이고, 실제 빌드 가능 여부는 release.yml이 다시 판정하기 때문입니다.
 *
 * 로컬 실행 (SLACK_WEBHOOK_URL 없이 돌리면 조회 결과만 stdout에 찍습니다):
 *   GITHUB_SHA=$(git rev-parse HEAD) node .github/scripts/report-store-versions.mjs
 */

import {
	buildActionBlock,
	buildVersionSection,
	postToSlack,
} from "./lib/slack-blocks.mjs";
import { fetchStoreVersions } from "./lib/store-versions.mjs";

const main = async () => {
	const commitSha = process.env.GITHUB_SHA ?? "0".repeat(40);
	const repository = process.env.GITHUB_REPOSITORY ?? "guesung/Web-Memo";
	const serverUrl = process.env.GITHUB_SERVER_URL ?? "https://github.com";
	const requestedBy = process.env.REQUESTED_BY;
	const storeVersions = await fetchStoreVersions();

	// 조회 자체가 목적이라, 웹훅이 없으면 로컬 확인용으로 그냥 찍고 끝냅니다.
	if (!process.env.SLACK_WEBHOOK_URL) {
		console.log(JSON.stringify(storeVersions, null, 2));

		return;
	}

	await postToSlack(process.env.SLACK_WEBHOOK_URL, {
		text: "📦 배포 현황",
		blocks: [
			{ type: "section", text: { type: "mrkdwn", text: "*📦 배포 현황*" } },
			{ type: "divider" },
			buildVersionSection({ storeVersions, commitSha }),
			{
				type: "context",
				elements: [
					{
						type: "mrkdwn",
						text: requestedBy
							? `<@${requestedBy}> 님의 요청 · 기준 커밋 \`${commitSha.slice(0, 7)}\``
							: `기준 커밋 \`${commitSha.slice(0, 7)}\``,
					},
				],
			},
			buildActionBlock({
				targets: ["app", "web", "extension"],
				ref: commitSha,
				linkUrl: `${serverUrl}/${repository}/actions/workflows/release.yml`,
				linkLabel: "Release 워크플로",
			}),
		],
	});
};

await main();
