#!/usr/bin/env node
/**
 * 릴리스(스토어 제출) 결과를 타깃 하나 단위로 Slack에 알립니다.
 * .github/workflows/notify-release.yml 이 타깃별로 한 번씩 호출합니다.
 *
 * 이 알림은 Slack 버튼을 누른 사람이 "정말 올라갔는지"를 확인하는 유일한 신호입니다.
 * 그래서 성공·실패를 가리지 않고 항상(always) 보냅니다.
 *
 * 셋을 한 메시지로 묶던 것을 타깃별로 쪼갠 이유는, 묶으면 알림이 가장 느린 타깃
 * (앱 빌드 약 30분)을 기다려야 해서 이미 끝난 웹·확장 결과까지 그만큼 늦게 나가기
 * 때문입니다. 배포마다 따로 나가면 각자 끝나는 대로 알립니다.
 *
 * 로컬 실행 (SLACK_WEBHOOK_URL 없이 돌리면 페이로드만 stdout에 찍습니다):
 *   GH_TOKEN=$(gh auth token) GITHUB_REPOSITORY=guesung/Web-Memo GITHUB_RUN_ID=<run id> \
 *   TARGET=app RESULT=success node .github/scripts/notify-release-result.mjs
 */

import { readAppConfig, readExtensionVersion } from "./lib/repo-versions.mjs";
import { readCommitSubject, requireEnv } from "./lib/run-context.mjs";
import { postToSlack } from "./lib/slack-blocks.mjs";

const TARGET_LABELS = {
	app: "앱",
	extension: "확장",
	web: "웹",
};

const DESCRIPTIONS = {
	success: "✅ 완료",
	failure: "❌ 실패",
	cancelled: "⚪️ 취소됨",
};

const describe = (conclusion) =>
	DESCRIPTIONS[conclusion] ?? `❔ 결과 확인 불가 (${conclusion})`;

/**
 * matrix 잡의 결과는 needs.<job>.result 하나로 합쳐져 어느 플랫폼이 깨졌는지 알 수 없습니다.
 * 실행 중인 run의 잡 목록을 조회해 플랫폼별 conclusion을 그대로 가져옵니다.
 */
const fetchJobConclusions = async ({ repository, runId, token }) => {
	const response = await fetch(
		`https://api.github.com/repos/${repository}/actions/runs/${runId}/jobs?per_page=100`,
		{
			headers: {
				accept: "application/vnd.github+json",
				authorization: `Bearer ${token}`,
				"x-github-api-version": "2022-11-28",
			},
		},
	);

	if (!response.ok) {
		console.error(`잡 목록 조회 실패: ${response.status}`);

		return [];
	}

	return (await response.json()).jobs ?? [];
};

/**
 * 재사용 워크플로로 호출되면 잡 이름 앞에 호출한 쪽 이름이 붙으므로("앱 릴리스 / ios 빌드")
 * 정확히 일치시키지 않고 끝부분으로 찾습니다.
 * cd-app.yml의 잡 표시 이름을 바꾸면 여기도 같이 고쳐야 합니다.
 */
const findConclusionBySuffix = (jobs, suffix) =>
	jobs.find((job) => job.name.endsWith(suffix))?.conclusion ?? "unknown";

/** 타깃별 본문 줄과 버전 표기를 만듭니다. */
const buildDetail = async ({ target, result, repository, runId }) => {
	if (target === "app") {
		// 앱만 플랫폼별로 갈라져 있어 잡 목록을 따로 조회합니다.
		const jobs = process.env.GH_TOKEN
			? await fetchJobConclusions({
					repository,
					runId,
					token: process.env.GH_TOKEN,
				})
			: [];

		return {
			version: `앱 v${readAppConfig().version}`,
			lines: [
				`📱 iOS (TestFlight)  ${describe(findConclusionBySuffix(jobs, "ios 빌드"))}`,
				`🤖 Android (Play 내부 테스트)  ${describe(findConclusionBySuffix(jobs, "android 빌드"))}`,
			],
		};
	}

	if (target === "extension") {
		// 업로드까지만 자동이고 게시는 사람이 눌러야 합니다. 매번 같이 적어 둡니다.
		const note =
			result === "success"
				? " — 업로드 완료, 게시는 크롬 웹 스토어 대시보드에서 수동"
				: "";

		return {
			version: `확장 v${readExtensionVersion()}`,
			lines: [`🧩 확장  ${describe(result)}${note}`],
		};
	}

	return {
		version: "",
		lines: [`🌐 웹 (Vercel 프로덕션)  ${describe(result)}`],
	};
};

const main = async () => {
	const repository = requireEnv("GITHUB_REPOSITORY");
	const runId = requireEnv("GITHUB_RUN_ID");
	const target = requireEnv("TARGET");
	const result = requireEnv("RESULT");
	const serverUrl = process.env.GITHUB_SERVER_URL ?? "https://github.com";
	const ref = process.env.RELEASE_REF || "master 최신";

	const label = TARGET_LABELS[target];
	if (!label) {
		throw new Error(`알 수 없는 릴리스 타깃입니다: ${target}`);
	}

	const { version, lines } = await buildDetail({
		target,
		result,
		repository,
		runId,
	});

	const HEADLINES = {
		success: `✅ ${label} 릴리스 완료`,
		cancelled: `⚪️ ${label} 릴리스 취소됨`,
	};
	const headline = HEADLINES[result] ?? `❌ ${label} 릴리스 실패`;
	// 워크플로가 ref를 체크아웃한 뒤 이 스크립트를 돌리므로 HEAD가 곧 배포한 커밋입니다.
	// 무엇이 올라갔는지는 ref 문자열보다 커밋 제목이 알려줍니다.
	const commitSubject = readCommitSubject("HEAD");
	const subtitle = [version, commitSubject].filter(Boolean).join(" · ");

	const payload = {
		text: [headline, commitSubject].filter(Boolean).join(" — "),
		blocks: [
			{
				type: "section",
				text: {
					type: "mrkdwn",
					text: subtitle ? `*${headline}*\n${subtitle}` : `*${headline}*`,
				},
			},
			{ type: "section", text: { type: "mrkdwn", text: lines.join("\n") } },
			{
				type: "context",
				elements: [{ type: "mrkdwn", text: `배포 ref \`${ref}\`` }],
			},
			{
				type: "actions",
				elements: [
					{
						type: "button",
						action_id: "open_run",
						text: { type: "plain_text", text: "워크플로 실행 보기" },
						url: `${serverUrl}/${repository}/actions/runs/${runId}`,
					},
				],
			},
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
