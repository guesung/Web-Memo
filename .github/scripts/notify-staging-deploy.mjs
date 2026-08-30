#!/usr/bin/env node
/**
 * develop 머지로 나간 테스트 서버(스테이징) 배포 결과를 Slack으로 알립니다.
 * .github/workflows/ci.yml 의 notify-staging 잡에서 호출합니다.
 *
 * master의 notify-build-ready.mjs와 달리 스토어를 조회하지 않고 배포 버튼도 달지
 * 않습니다. develop에서 올라가는 것은 웹 스테이징 하나뿐이고, 그 배포는 이미
 * 끝난 뒤라 누를 것이 없기 때문입니다.
 *
 * 배포된 커밋이 실제로 응답하는지는 여기서 확인하지 않습니다. 스테이징은
 * `--prod` 없이 배포되는 Preview라 Vercel Deployment Protection이 걸려 있어,
 * 자격 증명 없는 요청은 /api/version 대신 vercel.com 로그인 페이지를 받습니다.
 * 확인을 넣으면 항상 실패로 찍혀 경고가 무의미해집니다.
 *
 * 로컬에서 그대로 돌려볼 수 있습니다.
 * 웹훅 없이 돌리면 보낼 페이로드를 stdout에 찍습니다.
 *
 *   GITHUB_REPOSITORY=guesung/Web-Memo GITHUB_RUN_ID=<run id> \
 *   GITHUB_SHA=$(git rev-parse HEAD) \
 *   DEPLOY_RESULTS='{"ci":"success","changes":"success","web":"success"}' \
 *   node .github/scripts/notify-staging-deploy.mjs
 */

import { execFileSync } from "node:child_process";

import { readWebUrl } from "./lib/repo-versions.mjs";
import { postToSlack } from "./lib/slack-blocks.mjs";

/** skipped는 실패가 아니라 "변경이 없어 안 돎"입니다. 나머지만 실패로 봅니다. */
const FAILED_RESULTS = ["failure", "timed_out", "cancelled"];

const HEADLINES = {
	deployed: "🚀 테스트 서버 배포 완료",
	failed: "❌ 테스트 서버 배포 실패",
	blocked: "❌ develop CI 실패",
	unchanged: "⏭️ 테스트 서버 배포 없음",
};

// 배포가 안 나간 두 경우는 헤드라인만으로 사정이 드러나지 않아 한 줄을 덧붙입니다.
const DETAILS = {
	blocked: "CI가 깨져 배포하지 않았습니다.",
	unchanged: "웹 변경이 없어 배포하지 않았습니다.",
};

const requireEnv = (name) => {
	const value = process.env[name];

	if (!value) throw new Error(`${name} 이(가) 설정되지 않았습니다`);

	return value;
};

const readCommitSubject = (commitSha) => {
	try {
		return execFileSync("git", ["log", "-1", "--format=%s", commitSha], {
			encoding: "utf8",
		}).trim();
	} catch {
		return "";
	}
};

/**
 * 잡 결과들을 사람이 읽을 하나의 상태로 접습니다.
 *
 * cd-web의 skipped는 두 가지 서로 다른 사정을 같은 값으로 돌려주므로
 * (웹 변경이 없었거나, 앞 잡이 깨져 아예 못 돌았거나) 앞 잡 결과로 갈라 읽습니다.
 */
const resolveDeployState = (results) => {
	if (results.web === "success") return "deployed";

	if (FAILED_RESULTS.includes(results.web)) return "failed";

	const hasBlockingFailure = [results.ci, results.changes].some((result) =>
		FAILED_RESULTS.includes(result),
	);

	if (hasBlockingFailure) return "blocked";

	return "unchanged";
};

const main = async () => {
	const repository = requireEnv("GITHUB_REPOSITORY");
	const runId = requireEnv("GITHUB_RUN_ID");
	const commitSha = requireEnv("GITHUB_SHA");
	const serverUrl = process.env.GITHUB_SERVER_URL ?? "https://github.com";
	const actor = process.env.GITHUB_ACTOR ?? "";
	const results = JSON.parse(process.env.DEPLOY_RESULTS ?? "{}");

	const shortSha = commitSha.slice(0, 7);
	const state = resolveDeployState(results);
	const stagingUrl = readWebUrl("staging");
	const runUrl = `${serverUrl}/${repository}/actions/runs/${runId}`;
	const commitUrl = `${serverUrl}/${repository}/commit/${commitSha}`;

	const commitSubject = readCommitSubject(commitSha);
	const authoredBy = actor ? ` · ${actor}` : "";
	const contextLines = [];

	if (commitSubject) contextLines.push(`${commitSubject}${authoredBy}`);

	if (DETAILS[state]) contextLines.push(DETAILS[state]);

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
