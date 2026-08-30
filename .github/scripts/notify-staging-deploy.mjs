#!/usr/bin/env node
/**
 * develop 머지로 나간 테스트 서버(스테이징) 배포 결과를 Slack으로 알립니다.
 * .github/workflows/cd-web.yml 의 배포 잡에서 마지막 스텝으로 호출합니다.
 *
 * 배포한 그 잡 안에서 보내므로 웹 변경이 없어 잡이 아예 안 돌면 알림도 없습니다.
 * 올라간 것이 없으면 알릴 것도 없다는 뜻입니다.
 *
 * 배포된 커밋이 실제로 응답하는지는 확인하지 않습니다. 스테이징은 `--prod` 없이
 * 배포되는 Preview라 Vercel Deployment Protection이 걸려 있어, 자격 증명 없는
 * 요청은 /api/version 대신 vercel.com 로그인 페이지를 받습니다. 확인을 넣으면
 * 항상 실패로 찍혀 경고가 무의미해집니다.
 *
 * 로컬에서 그대로 돌려볼 수 있습니다.
 * 웹훅 없이 돌리면 보낼 페이로드를 stdout에 찍습니다.
 *
 *   GITHUB_REPOSITORY=guesung/Web-Memo GITHUB_RUN_ID=<run id> \
 *   GITHUB_SHA=$(git rev-parse HEAD) \
 *   DEPLOY_OUTCOME=success JOB_STATUS=success \
 *   node .github/scripts/notify-staging-deploy.mjs
 */

import { readWebUrl } from "./lib/repo-versions.mjs";
import { readCommitSubject, requireEnv } from "./lib/run-context.mjs";
import { postToSlack } from "./lib/slack-blocks.mjs";

const HEADLINES = {
	deployed: "🚀 테스트 서버 배포 완료",
	deployFailed: "❌ 테스트 서버 배포 실패",
	buildFailed: "❌ 테스트 서버 빌드 실패",
	cancelled: "⚠️ 테스트 서버 배포 취소됨",
};

// 배포가 안 나간 경우는 헤드라인만으로 사정이 드러나지 않아 한 줄을 덧붙입니다.
const DETAILS = {
	deployFailed: "Vercel 배포 또는 별칭 이동에서 실패했습니다.",
	buildFailed: "배포 단계까지 가지 못했습니다.",
};

/**
 * 배포 스텝의 결과와 잡 상태를 사람이 읽을 하나의 상태로 접습니다.
 *
 * 배포 스텝이 skipped라는 것은 그 앞(설치·Vercel 빌드)에서 멈췄다는 뜻입니다.
 * outcome 하나만 보면 그것과 "배포하다 실패"가 같은 실패로 뭉개집니다.
 */
const resolveDeployState = ({ outcome, jobStatus }) => {
	if (outcome === "success") {
		return "deployed";
	}

	if (outcome === "failure") {
		return "deployFailed";
	}

	if (jobStatus === "cancelled") {
		return "cancelled";
	}

	return "buildFailed";
};

const main = async () => {
	const repository = requireEnv("GITHUB_REPOSITORY");
	const runId = requireEnv("GITHUB_RUN_ID");
	const commitSha = requireEnv("GITHUB_SHA");
	const serverUrl = process.env.GITHUB_SERVER_URL ?? "https://github.com";
	const actor = process.env.GITHUB_ACTOR ?? "";

	const state = resolveDeployState({
		outcome: process.env.DEPLOY_OUTCOME,
		jobStatus: process.env.JOB_STATUS,
	});
	const shortSha = commitSha.slice(0, 7);
	const stagingUrl = readWebUrl("staging");
	const runUrl = `${serverUrl}/${repository}/actions/runs/${runId}`;
	const commitUrl = `${serverUrl}/${repository}/commit/${commitSha}`;

	const commitSubject = readCommitSubject(commitSha);
	const authoredBy = actor ? ` · ${actor}` : "";
	const contextLines = [];

	if (commitSubject) {
		contextLines.push(`${commitSubject}${authoredBy}`);
	}

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
		text: `${HEADLINES[state]} — ${shortSha}`,
		blocks: [
			{
				type: "section",
				text: {
					type: "mrkdwn",
					text: `${HEADLINES[state]} — <${commitUrl}|\`${shortSha}\`>`,
				},
			},
			...(contextLines.length > 0
				? [
						{
							type: "context",
							elements: [{ type: "mrkdwn", text: contextLines.join("\n") }],
						},
					]
				: []),
			{ type: "actions", elements: linkButtons },
		],
	};

	if (!process.env.SLACK_WEBHOOK_URL) {
		console.warn("::warning::SLACK_WEBHOOK_URL 이 없어 Slack 전송을 건너뜁니다");
		console.log(JSON.stringify(payload, null, 2));

		return;
	}

	await postToSlack(process.env.SLACK_WEBHOOK_URL, payload);
};

await main();
