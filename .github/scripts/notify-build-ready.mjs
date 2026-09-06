#!/usr/bin/env node
/**
 * master 빌드 결과를 스토어 현황과 함께 Slack으로 알리고, 배포 버튼을 답니다.
 * .github/workflows/ci.yml 의 notify 잡에서 호출합니다.
 *
 * 로컬에서 그대로 돌려볼 수 있습니다(실제 스토어를 조회하고 실제 Slack으로 보냅니다):
 * 웹훅 없이 돌리면 스토어만 조회하고 보낼 페이로드를 stdout에 찍습니다.
 *
 *   GITHUB_REPOSITORY=guesung/Web-Memo GITHUB_RUN_ID=<run id> \
 *   GITHUB_SHA=$(git rev-parse HEAD) \
 *   BUILD_RESULTS='{"ci":"success","app":"success","web":"skipped","extension":"success"}' \
 *   node .github/scripts/notify-build-ready.mjs
 */

import { readCommitSubject, requireEnv } from "./lib/run-context.mjs";
import {
	buildActionBlock,
	buildVersionSection,
	postToSlack,
} from "./lib/slack-blocks.mjs";
import { fetchStoreVersions } from "./lib/store-versions.mjs";

const DEPLOY_TARGETS = ["app", "web", "extension"];

const main = async () => {
	const repository = requireEnv("GITHUB_REPOSITORY");
	const runId = requireEnv("GITHUB_RUN_ID");
	const commitSha = requireEnv("GITHUB_SHA");
	const serverUrl = process.env.GITHUB_SERVER_URL ?? "https://github.com";
	const buildResults = JSON.parse(process.env.BUILD_RESULTS ?? "{}");

	// 안 도는 잡(skipped)은 실패가 아닙니다. 변경이 없어서 안 돈 것뿐입니다.
	const hasFailure = Object.values(buildResults).some((result) =>
		["failure", "timed_out"].includes(result),
	);
	const succeededTargets = DEPLOY_TARGETS.filter(
		(target) => buildResults[target] === "success",
	);

	// 문서만 고친 커밋까지 알리면 채널이 금세 무의미해집니다.
	// 올릴 것도 없고 깨진 것도 없으면 조용히 넘어갑니다. (배포 현황은 /버전으로 언제든 조회)
	if (!hasFailure && succeededTargets.length === 0) {
		console.log("빌드된 배포 대상이 없어 Slack 알림을 건너뜁니다");

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
			linkUrl: `${serverUrl}/${repository}/actions/runs/${runId}`,
			linkLabel: "워크플로 보기",
		}),
	);

	// 푸시 알림 미리보기로 쓰이는 줄입니다. 여기에도 해시가 아니라 제목이 보여야
	// 채널을 열지 않고도 무엇이 올라갔는지 알 수 있습니다.
	const payload = {
		text: [headline, commitSubject].filter(Boolean).join(" — "),
		blocks,
	};

	// 웹훅이 없으면(로컬 확인, 시크릿 미설정) 보낼 페이로드만 찍고 끝냅니다.
	if (!process.env.SLACK_WEBHOOK_URL) {
		console.warn("::warning::SLACK_WEBHOOK_URL 이 없어 Slack 전송을 건너뜁니다");
		console.log(JSON.stringify(payload, null, 2));

		return;
	}

	await postToSlack(process.env.SLACK_WEBHOOK_URL, payload);
};

await main();
