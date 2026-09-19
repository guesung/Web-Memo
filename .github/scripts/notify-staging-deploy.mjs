#!/usr/bin/env node
/**
 * develop 머지로 나간 테스트 서버(스테이징) 배포 결과를 Slack으로 알립니다.
 * 호출하는 곳은 두 군데입니다.
 *  - .github/workflows/ci.yml 의 notify-staging 잡: cd-web 종료 직후, 머지 스레드의 댓글로 보냅니다.
 *    SLACK_THREAD_TS 가 그 스레드 루트입니다.
 *  - .github/workflows/cd-web.yml 의 workflow_dispatch 실행: ci.yml 잡을 거치지 않으므로
 *    스레드 없이 웹훅 최상위 메시지로 보냅니다.
 *
 * 웹 변경이 없어 cd-web이 아예 안 돌면 알림도 없습니다. 올라간 것이 없으면 알릴 것도
 * 없다는 뜻입니다. 취소된 run도 마찬가지로 알리지 않습니다 — develop은
 * cancel-in-progress라 뒤이은 run이 곧 배포하고 다시 알립니다.
 *
 * 전송이 실패해도 ::warning::만 남기고 exit 0입니다. 알림이 배포 잡의 결론을 바꾸면 안 됩니다.
 *
 * 배포된 커밋이 실제로 응답하는지는 확인하지 않습니다. 스테이징은 `--prod` 없이
 * 배포되는 Preview라 Vercel Deployment Protection이 걸려 있어, 자격 증명 없는
 * 요청은 /api/version 대신 vercel.com 로그인 페이지를 받습니다. 확인을 넣으면
 * 항상 실패로 찍혀 경고가 무의미해집니다.
 *
 * 로컬에서 그대로 돌려볼 수 있습니다.
 * 웹훅과 봇 토큰 없이 돌리면 보낼 페이로드를 stdout에 찍습니다.
 *
 *   GITHUB_REPOSITORY=guesung/Web-Memo GITHUB_RUN_ID=<run id> \
 *   GITHUB_SHA=$(git rev-parse HEAD) \
 *   DEPLOY_OUTCOME=success \
 *   node .github/scripts/notify-staging-deploy.mjs
 */

import { readWebUrl } from "./lib/repo-versions.mjs";
import { readCommitSubject, requireEnv } from "./lib/run-context.mjs";
import { deliverSlackMessage, readSlackEnv, toSingleLine } from "./lib/slack-api.mjs";

const HEADLINES = {
	deployed: "🚀 테스트 서버 배포 완료",
	deployFailed: "❌ 테스트 서버 배포 실패",
	buildFailed: "❌ 테스트 서버 빌드 실패",
};

// 배포가 안 나간 경우는 헤드라인만으로 사정이 드러나지 않아 한 줄을 덧붙입니다.
const DETAILS = {
	deployFailed: "Vercel 배포 또는 별칭 이동에서 실패했습니다.",
	buildFailed: "배포 단계까지 가지 못했습니다.",
};

/**
 * 배포 스텝의 결과를 사람이 읽을 상태로 옮깁니다.
 *
 * 배포 스텝이 skipped라는 것은 그 앞(설치·Vercel 빌드)에서 멈췄다는 뜻입니다.
 * outcome 하나만 보면 그것과 "배포하다 실패"가 같은 실패로 뭉개집니다.
 * 취소된 잡에서는 이 스텝 자체가 돌지 않으므로 여기서 다루지 않습니다.
 */
const resolveDeployState = (outcome) => {
	if (outcome === "success") {
		return "deployed";
	}

	if (outcome === "failure") {
		return "deployFailed";
	}

	return "buildFailed";
};

const main = async () => {
	const repository = requireEnv("GITHUB_REPOSITORY");
	const runId = requireEnv("GITHUB_RUN_ID");
	const commitSha = requireEnv("GITHUB_SHA");
	const serverUrl = process.env.GITHUB_SERVER_URL ?? "https://github.com";
	const actor = process.env.GITHUB_ACTOR ?? "";

	const state = resolveDeployState(process.env.DEPLOY_OUTCOME);
	const shortSha = commitSha.slice(0, 7);
	const stagingUrl = readWebUrl("staging");
	const runUrl = `${serverUrl}/${repository}/actions/runs/${runId}`;
	const commitUrl = `${serverUrl}/${repository}/commit/${commitSha}`;

	const commitSubject = readCommitSubject(commitSha);
	const authoredBy = actor ? ` · ${actor}` : "";
	// 해시는 커밋을 되짚을 때만 쓰이므로 context로 내리고, 제목 줄에는 커밋 제목을 둡니다.
	const contextLines = [`<${commitUrl}|\`${shortSha}\`>${authoredBy}`];

	if (DETAILS[state]) {
		contextLines.push(DETAILS[state]);
	}

	// 실패한 배포에는 링크를 달지 않습니다. 그 주소는 아직 이전 커밋을 서빙합니다.
	const linkButtons = [
		...(state === "deployed"
			? [
					{
						type: "button",
						action_id: "open_staging",
						text: {
							type: "plain_text",
							text: "🌐 테스트 서버 열기",
							emoji: true,
						},
						url: stagingUrl,
					},
				]
			: []),
		{
			type: "button",
			action_id: "open_link",
			text: { type: "plain_text", text: "실행 로그 보기", emoji: true },
			url: runUrl,
		},
	];

	const payload = {
		// 알림 미리보기와 접근성 대체 텍스트로 쓰입니다. 링크 문법 없이 둡니다.
		text: [HEADLINES[state], commitSubject].filter(Boolean).join(" — "),
		blocks: [
			{
				type: "section",
				text: {
					type: "mrkdwn",
					text: commitSubject
						? `*${HEADLINES[state]}*\n${commitSubject}`
						: `*${HEADLINES[state]}*`,
				},
			},
			{
				type: "context",
				elements: [{ type: "mrkdwn", text: contextLines.join("\n") }],
			},
			{ type: "actions", elements: linkButtons },
		],
	};

	await deliverSlackMessage({ payload, slack: readSlackEnv() });
};

try {
	await main();
} catch (error) {
	console.warn(
		`::warning::테스트 서버 배포 알림을 보내지 못했습니다: ${toSingleLine(error instanceof Error ? error.message : error)}`,
	);
}
